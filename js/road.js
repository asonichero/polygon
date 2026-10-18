// Climbing Toward Consequence — Chapter One, "Market Day" (the market road): a tutorial in leading, carrying and tying off.
//   Jack leads Milky-White along a winding forest road, the trees leaning in overhead. She follows fine at a walk; running costs her trust and she drags on the lead, until at 60% she
//   plants her hooves. Standing close does not win her back in this chapter: E beside her (and not by a tying-off tree) lets Jack talk her round, +15%. Three obstacles block the road
//   to her but not to Jack (a fallen limb, rocks, crates): tie her to the nearby tree with E, pick the obstacle up with E, put it down with Q, untie her and go on.
//   At the end of the road, the Peddler's crooked cart: a short dialogue tree in Jack's voice (cocky, hopeful, sure his luck is about to turn); every branch ends with the trade.
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky, C = root.Cast, F = root.Farm, Mk = root.Market, A = root.GameAudio, V3 = THREE.Vector3;
const { SC, WALK, CREEP, RUN, GRAV, JUMP_V, ZOOMS } = Mk;
const { mat, plain, box, rng } = F;
const v = (x, y, z) => new V3(x, y, z), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, smooth = t => t * t * (3 - 2 * t);
const turn = (from, to, t) => { const d = ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return from + d * t; };
const CELL = 12, PLANT = 60, LEN = 46, HOLD = 22, COW_V = 30, RUNNING = 36, CORRIDOR = 38;
// The road's way-points (x east, z south); it is smoothed into a curve and sampled every few units.
const WAY = [[0, 0], [0, 70], [50, 140], [130, 190], [200, 270], [190, 360], [110, 430], [20, 470], [-70, 540], [-90, 640], [-30, 720], [60, 760], [150, 820], [170, 920], [110, 1000], [20, 1050], [-50, 1130], [-40, 1230], [40, 1290], [130, 1330], [200, 1400]];
const OB = { limb: 520, rocks: 1100, crates: 1560 }, TIES = [{ s: 480, side: 1 }, { s: 1060, side: -1 }, { s: 1520, side: 1 }];
const SOOTHE = ['Easy, Milky-White. Easy, girl.', 'There now. Nothing to be afraid of.', 'That’s it. Nice and slow, the pair of us.', 'I’m sorry, girl. No more rushing. I promise.', 'Good girl. You’re all right.', 'Steady. I’ve got you.'];

// ── The road as a curve. ──
function makeRoad() {
  const P = [];
  for (let i = 0; i < WAY.length - 1; i++) {
    const p0 = WAY[Math.max(i - 1, 0)], p1 = WAY[i], p2 = WAY[i + 1], p3 = WAY[Math.min(i + 2, WAY.length - 1)], n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 6));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; P.push([0, 1].map(a => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3))); }
  }
  P.push(WAY[WAY.length - 1].slice());
  const R = { x: P.map(p => p[0]), z: P.map(p => p[1]), s: [0], tx: [], tz: [] }, n = P.length;
  for (let i = 1; i < n; i++) R.s[i] = R.s[i - 1] + Math.hypot(R.x[i] - R.x[i - 1], R.z[i] - R.z[i - 1]);
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = R.x[b] - R.x[a], dz = R.z[b] - R.z[a], m = Math.hypot(dx, dz) || 1; R.tx[i] = dx / m; R.tz[i] = dz / m; }
  R.len = R.s[n - 1];
  R.at = s => {                                                                                       // the point at arc length s (continuing straight beyond the ends)
    const e = s < 0 ? 0 : s > R.len ? n - 1 : -1;
    if (e >= 0) { const d = s - R.s[e]; return { x: R.x[e] + R.tx[e] * d, z: R.z[e] + R.tz[e] * d, tx: R.tx[e], tz: R.tz[e], nx: -R.tz[e], nz: R.tx[e] }; }
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R.s[m] <= s) lo = m; else hi = m; }
    const f = (s - R.s[lo]) / ((R.s[hi] - R.s[lo]) || 1); let tx = lerp(R.tx[lo], R.tx[hi], f), tz = lerp(R.tz[lo], R.tz[hi], f); const m = Math.hypot(tx, tz) || 1; tx /= m; tz /= m;
    return { x: lerp(R.x[lo], R.x[hi], f), z: lerp(R.z[lo], R.z[hi], f), tx, tz, nx: -tz, nz: tx };
  };
  R.near = (x, z) => {                                                                                // the nearest point on the road: its distance, signed sideways offset and arc length
    let bi = 0, bd = 1e18; for (let i = 0; i < n; i++) { const d = (R.x[i] - x) ** 2 + (R.z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
    let best = null;
    for (const a of [bi - 1, bi]) {
      if (a < 0 || a >= n - 1) continue; const ex = R.x[a + 1] - R.x[a], ez = R.z[a + 1] - R.z[a], l2 = ex * ex + ez * ez || 1, t = clamp(((x - R.x[a]) * ex + (z - R.z[a]) * ez) / l2, 0, 1), cx = R.x[a] + ex * t, cz = R.z[a] + ez * t, d = Math.hypot(x - cx, z - cz);
      if (!best || d < best.d) best = { d, off: ((x - cx) * -ez + (z - cz) * ex) / Math.sqrt(l2) * (d ? 1 : 0), s: lerp(R.s[a], R.s[a + 1], t), cx, cz };
    }
    return best || { d: Math.sqrt(bd), off: 0, s: R.s[bi], cx: R.x[bi], cz: R.z[bi] };
  };
  R.w = s => CORRIDOR + 32 * smooth(clamp((s - (R.len - 170)) / 110, 0, 1));                           // half-width of the way: wide in the clearing at the end
  return R;
}

// ── Obstacles as oriented boxes on the ground (x, z, ry; half sizes hx along the item's own x, hz along its z; top = height). ──
const loc = (it, x, z) => { const dx = x - it.x, dz = z - it.z, c = Math.cos(it.ry), s = Math.sin(it.ry); return [dx * c - dz * s, dx * s + dz * c]; };
const gapTo = (it, x, z) => { const [lx, lz] = loc(it, x, z); return Math.hypot(Math.max(0, Math.abs(lx) - it.hx), Math.max(0, Math.abs(lz) - it.hz)); };
function pushOut(it, x, z, r) {
  const [lx, lz] = loc(it, x, z), ox = it.hx + r - Math.abs(lx), oz = it.hz + r - Math.abs(lz); if (ox <= 0 || oz <= 0) return null;
  const c = Math.cos(it.ry), s = Math.sin(it.ry); let nx = lx, nz = lz; if (ox < oz) nx = Math.sign(lx || 1) * (it.hx + r); else nz = Math.sign(lz || 1) * (it.hz + r);
  return { x: it.x + nx * c + nz * s, z: it.z - nx * s + nz * c };
}

// ── Building the world (once). ──
function build(G) {
  const R = makeRoad(), rand = rng(31415), scene = new THREE.Scene(); scene.background = new THREE.Color(0x86a884); scene.fog = new THREE.Fog(0x86a884, 110, 430);
  scene.add(new THREE.HemisphereLight(0xe4f2dc, 0x4a5a38, 0.95)); const sun = new THREE.DirectionalLight(0xfff0c8, 0.8); sun.position.set(180, 300, 120); scene.add(sun);
  const end = R.at(R.len), cartPos = { x: end.x + end.tx * 34, z: end.z + end.tz * 34 }, trailDir = { x: end.nx, z: end.nz }, trailStart = { x: end.x + end.tx * 10, z: end.z + end.tz * 10 };
  const trailD = (x, z) => { const t = clamp(((x - trailStart.x) * trailDir.x + (z - trailStart.z) * trailDir.z) / 120, 0, 1); return Math.hypot(x - (trailStart.x + trailDir.x * 120 * t), z - (trailStart.z + trailDir.z * 120 * t)); };
  const clearing = (x, z) => Math.hypot(x - end.x - end.tx * 14, z - end.z - end.tz * 14) < 46;

  // The ground: 12-unit cells, the road trodden, the forest floor rising a little away from it.
  {
    const T = F.textures(), xs = R.x, zs = R.z, x0 = Math.min(...xs) - 190, x1 = Math.max(...xs) + 190, z0 = Math.min(...zs) - 190, z1 = Math.max(...zs) + 190, cells = [];
    for (let x = Math.floor(x0 / CELL) * CELL; x < x1; x += CELL) for (let z = Math.floor(z0 / CELL) * CELL; z < z1; z += CELL) {
      const nr = R.near(x + 6, z + 6); if (nr.d > 215 && trailD(x, z) > 60) continue; const w = R.w(nr.s);
      let type = 'grass', h = 0; if (nr.d < 15 || clearing(x + 6, z + 6)) type = 'path'; else if (trailD(x + 6, z + 6) < 6) type = 'dirt'; else if (nr.d < 19 && rand() < 0.5) type = 'dirt';
      cells.push({ x: x + 6, z: z + 6, type, h });
    }
    const geo = new THREE.BoxGeometry(CELL, 6, CELL), kinds = { grass: [mat('grass'), mat('grassSide')], path: [mat('path'), mat('dirt')], dirt: [mat('dirt'), mat('dirt')] }, m4 = new THREE.Matrix4(), c = new THREE.Color();
    for (const k of Object.keys(kinds)) {
      const list = cells.filter(q => q.type === k); if (!list.length) continue; const side = kinds[k][1], top = kinds[k][0], im = new THREE.InstancedMesh(geo, [side, side, top, side, side, side], list.length);
      list.forEach((q, i) => { const sy = (q.h + 6) / 6; m4.makeScale(1, sy, 1); m4.setPosition(q.x, (q.h - 6) / 2, q.z); im.setMatrixAt(i, m4); const tone = 0.88 + 0.22 * rand(); c.setRGB(tone, tone, tone); im.setColorAt(i, c); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; scene.add(im);
    }
  }

  // Trees leaning in over the road: a trunk tilted toward it, a canopy of leaf blocks at the top (the canopy is hidden where it would stand between the camera and Jack).
  const canopy = [], trunks = [], forest = [], ties = [];
  function forestTree(x, z, dirx, dirz, lean, H, parent, far) {
    const g = new THREE.Group(); g.position.set(x, 0, z); const ax = v(dirz, 0, -dirx).normalize(); if (lean > 0.001) g.quaternion.setFromAxisAngle(ax, lean);
    const trunk = box(6, H, 6, mat('bark'), 0, H / 2, 0, g), sl = Math.sin(lean); trunks.push({ m: trunk, pts: (far ? [0.3, 0.7] : [0.15, 0.4, 0.65, 0.9]).map(f => v(x + dirx * sl * H * f, H * f * Math.cos(lean), z + dirz * sl * H * f)) }); if (!far) for (const [w, h, ox, oy, oz, rz] of [[2.4, 16, 5, 0.62, 0, -0.8], [2.4, 14, -4, 0.5, 2, 0.7]]) { const br = box(w, h, w, mat('bark'), ox, H * oy, oz, g); br.rotation.z = rz; canopy.push({ m: br, r: 10 }); }
    const leaves = far ? [[36, 10, 36, 0, H - 3, 0], [26, 9, 26, 3, H + 5, -2]] : [[34, 10, 34, 0, H - 3, 0], [26, 9, 26, 3, H + 5, -2], [38, 8, 30, -6, H - 12, 3], [20, 8, 20, 0, H + 11, 1]];
    for (const [w, h, d, ox, oy, oz] of leaves) { const m = box(w, h, d, mat('leaf'), ox, oy, oz, g); canopy.push({ m, r: Math.max(w, d) * 0.5 + 5 }); }
    parent.add(g); forest.push(g); return g;
  }
  const L = R.len;
  // The forest: straight trunks in rows along the way, and row upon row of wood behind them; the canopy closes over the road in a ceiling of leaves.
  for (let s = 6; s < L + 100; s += 10 + rand() * 5) for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
    const c = R.at(s), w = R.w(Math.min(s, L)); let off = side * (w + 8 + k * 26 + rand() * 16);
    if (s > L) { off = (rand() - 0.5) * 2 * (w + 60 + k * 20); if (s < L + 14 || Math.hypot(c.x + c.nx * off - cartPos.x, c.z + c.nz * off - cartPos.z) < 62) continue; }
    const x = c.x + c.nx * off + c.tx * (rand() - 0.5) * 8, z = c.z + c.nz * off + c.tz * (rand() - 0.5) * 8; if (trailD(x, z) < 20 || clearing(x, z)) continue;
    forestTree(x, z, 0, 0, 0, 70 + rand() * 32, scene, k > 0);
  }
  { const leaf = mat('leaf'); for (let s = 0; s < L - 90; s += 13) { if (rand() < 0.1) continue; const c = R.at(s), w = R.w(s), cl = smooth(clamp((s - (L - 260)) / 160, 0, 1)); if (cl > 0.9) continue;
      const wide = 2 * (w + 36), m = box(wide, 7, 15.5, leaf, c.x, 82 + rand() * 12, c.z, scene); m.rotation.y = Math.atan2(-c.tx, -c.tz); canopy.push({ m, r: 52 }); } }
  // Undergrowth along the edges of the way, flowers and stones on the verges.
  for (let s = 0; s < L + 30; s += 7 + rand() * 4) for (const side of [-1, 1]) {
    const c = R.at(s), w = R.w(Math.min(s, L)), off = side * (w + 1 + rand() * 6), x = c.x + c.nx * off, z = c.z + c.nz * off; if (trailD(x, z) < 12) continue;
    if (s > L && (Math.hypot(x - cartPos.x, z - cartPos.z) < 40)) continue;
    const n = 1 + Math.floor(rand() * 3); for (let k = 0; k < n; k++) { const sz = 5 + rand() * 7; box(sz, sz * (0.7 + rand() * 0.5), sz, mat('leaf'), x + (rand() - 0.5) * 8, sz * 0.4, z + (rand() - 0.5) * 8, scene); }
  }
  for (let i = 0; i < 170; i++) {
    const c = R.at(rand() * L), off = (rand() < 0.5 ? -1 : 1) * (12 + rand() * 16), x = c.x + c.nx * off, z = c.z + c.nz * off, k = rand();
    if (k < 0.6) { const col = ['#e8d44a', '#f2f0e6', '#a98ad8', '#e07a6a'][Math.floor(rand() * 4)]; box(1, 3 + rand() * 2, 1, plain('#4f7a34'), x, 1.8, z, scene); box(2.2, 1.6, 2.2, plain(col), x, 4.2, z, scene); }
    else box(3 + rand() * 4, 2 + rand() * 3, 3 + rand() * 4, mat('stone'), x, 1.4, z, scene);
  }
  // Shafts of light through the leaves.
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.1, depthWrite: false });
  for (let i = 0; i < 26; i++) { const c = R.at(60 + rand() * (L - 100)), m = new THREE.Mesh(new THREE.BoxGeometry(5 + rand() * 6, 88, 5 + rand() * 6), shaftMat); m.position.set(c.x + c.nx * (rand() - 0.5) * 30, 40, c.z + c.nz * (rand() - 0.5) * 30); m.rotation.z = 0.22; m.rotation.y = rand() * 3; scene.add(m); }

  // The tying-off trees: close beside the way, each with a worn loop of rope.
  for (const t of TIES) {
    const c = R.at(t.s), x = c.x + c.nx * t.side * (CORRIDOR - 7), z = c.z + c.nz * t.side * (CORRIDOR - 7), g = forestTree(x, z, 0, 0, 0, 96, scene), rope = mat('thatchOld');
    for (const [w, h, d, ox, oz] of [[7.4, 1.2, 1.2, 0, -3.5], [7.4, 1.2, 1.2, 0, 3.5], [1.2, 1.2, 7.4, -3.5, 0], [1.2, 1.2, 7.4, 3.5, 0]]) box(w, h, d, rope, ox, 14, oz, g);
    box(1.6, 5, 1.6, plain('#b64a3a'), 3.6, 11, 3.6, g); ties.push({ x, z, r: 5, ring: v(x, 14, z), s: t.s });
  }

  // The obstacles: each is a list of carryable pieces, laid across the way.
  const items = [], ry0 = s => { const c = R.at(s); return Math.atan2(-c.tx, -c.tz); };
  const mkItem = (kind, x, z, ry, hx, hz, top, mesh) => { mesh.position.set(x, 0, z); mesh.rotation.y = ry; scene.add(mesh); const it = { kind, x, z, ry, hx, hz, top, mesh, carried: false }; items.push(it); return it; };
  { // the fallen limb
    const c = R.at(OB.limb), g = new THREE.Group(); box(68, 6, 6, mat('bark'), 0, 4, 0, g); box(10, 5, 5, mat('bark'), 36, 4, 0.5, g).rotation.y = 0.2;
    for (let i = 0; i < 6; i++) box(9 + rand() * 6, 4 + rand() * 4, 8 + rand() * 5, mat('leaf'), -30 + i * 11, 7 + rand() * 3, (rand() - 0.5) * 8, g);
    box(2, 9, 2, mat('bark'), -10, 8, 3, g).rotation.x = 0.7; box(2, 8, 2, mat('bark'), 12, 8, -3, g).rotation.x = -0.7;
    mkItem('limb', c.x, c.z, ry0(OB.limb), 34, 3.5, 8, g);
  }
  for (const [name, s, n] of [['rock', OB.rocks, 5], ['crate', OB.crates, 5]]) {
    const c = R.at(s), ry = ry0(s);
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * (name === 'rock' ? 16 : 15), g = new THREE.Group(), z = name === 'crate' ? (i % 2 ? 5 : -4) : 0;
      if (name === 'rock') { box(17, 11, 17, mat('stone'), 0, 5.5, 0, g); box(11, 3, 11, mat('stone', 0xc4c2b8), 1, 12, 0.5, g); box(5, 4, 5, plain('#4f7a34'), -5, 12, 4, g); }
      else { box(16, 13, 16, mat('plank'), 0, 6.5, 0, g); for (const sx of [-6.8, 6.8]) box(2, 13.4, 16.4, mat('timber'), sx, 6.5, 0, g); box(16.4, 2, 16.4, mat('timber'), 0, 12.6, 0, g); }
      const x = c.x + c.nx * o + c.tx * z, zz = c.z + c.nz * o + c.tz * z;
      mkItem(name, x, zz, ry + (i % 2 ? 0.12 : -0.1), name === 'rock' ? 8.5 : 8, name === 'rock' ? 8.5 : 8, name === 'rock' ? 11 : 13, g);
    }
  }
  { const c = R.at(OB.crates + 22), g = new THREE.Group(); for (let i = 0; i < 9; i++) box(2.6, 2.6, 2.6, plain(['#c8402e', '#d86a3a', '#a83a26'][i % 3]), (rand() - 0.5) * 30, 1.4, (rand() - 0.5) * 20, g); g.position.set(c.x + c.nx * 8, 0, c.z + c.nz * 8); scene.add(g);   // spilled apples
  }

  // ── The cart at the end of the road. ──
  const cart = new THREE.Group(), ca = Math.atan2(-end.tx, -end.tz); cart.position.set(cartPos.x, 0, cartPos.z); cart.rotation.y = ca; scene.add(cart);
  const feathers = [], cloths = [], glass = c => new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0.72, emissive: new THREE.Color(c).multiplyScalar(0.25) });
  {
    const body = new THREE.Group(); body.rotation.z = 0.15; body.position.y = 1; cart.add(body);
    box(24, 3, 44, mat('plank'), 0, 15, 0, body); for (const sx of [-1, 1]) { box(1.6, 5, 44, mat('plankDark'), sx * 11.6, 18.6, 0, body); }
    box(24, 5, 1.6, mat('plankDark'), 0, 18.6, -21.6, body); box(24, 3, 1.6, mat('plankDark'), 0, 17, 21.6, body);
    for (const [px, pz] of [[-11, -20], [11, -20], [-11, 14], [11, 14]]) box(2, 30, 2, mat('timber'), px, 31, pz, body);        // the canopy poles
    box(2, 2, 40, mat('timber'), -11, 46, -3, body); box(2, 2, 40, mat('timber'), 11, 46, -3, body); box(2, 2.4, 44, mat('timber'), 0, 52, -3, body).rotation.x = 0;
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const q = box(2, 2, 24, mat('timber'), sx * 5.6, 49.6, -3 + (i - 2) * 9, body); q.rotation.z = -sx * 0.4; q.scale.set(1, 1, 0.5); }
    // Cloth draped over everything: the roof, the rails, the back, hanging from the poles.
    const dyes = ['#4a3a8a', '#b8862a', '#a8403a', '#2f7a72', '#6a2f5a', '#c8b078'];
    const drape = (w, h, d, c, x, y, z, rz, par) => { const m = box(w, h, d, plain(c), x, y, z, par || body); m.rotation.z = rz || 0; cloths.push({ m, base: m.rotation.z, ph: Math.random() * 6 }); return m; };
    for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) { const h = 9 + ((i * 5 + (sx > 0 ? 2 : 0)) % 8) * 1.6, z = -22 + i * 6.6; drape(0.8, h, 6, dyes[(i + (sx > 0 ? 1 : 4)) % 6], sx * 12.4, 52 - h / 2, z, sx * 0.12); if (i % 2) drape(0.8, 6, 5.4, dyes[(i + 3) % 6], sx * 14.6, 29, z, sx * 0.2); }
    drape(20, 0.8, 46, dyes[1], 0, 53.6, -3, 0); drape(22, 12, 0.8, dyes[4], 0, 40, -24, 0); drape(5, 16, 0.8, dyes[5], -6, 38, 20, 0.08); drape(5, 11, 0.8, dyes[2], 6, 41, 20, -0.06); drape(4, 14, 0.8, dyes[0], 0, 40, 20.5, 0.02);
    for (let i = 0; i < 4; i++) drape(10 + i * 2, 5, 18, dyes[(i + 2) % 6], -3 + i * 2, 21 + i * 1.5, -2 + i * 5, (i % 2 - 0.5) * 0.4, body);       // folded cloth on the bed
    // Bottles on strings from the ridge pole, and a shelf of them at the back.
    const bottle = (c, par, x, y, z, big) => { const s = big ? 1.4 : 1; box(3 * s, 6 * s, 3 * s, glass(c), x, y, z, par); box(1.4 * s, 2.6 * s, 1.4 * s, glass(c), x, y + 4.2 * s, z, par); box(1.8 * s, 1.2 * s, 1.8 * s, plain('#a8803a'), x, y + 6 * s, z, par); };
    const BC = ['#d89a2a', '#3aa6a0', '#8a5ac8', '#cfe6e0', '#c85a6a', '#6ac86a'];
    for (let i = 0; i < 9; i++) { const x = -9 + (i % 3) * 9, z = -18 + Math.floor(i / 3) * 14 + (i % 2) * 4, len = 8 + (i * 7 % 11); box(0.3, len, 0.3, plain('#3a2a1a'), x, 51 - len / 2, z, body); bottle(BC[i % 6], body, x, 51 - len - 3, z, i % 4 === 0); }
    for (let i = 0; i < 6; i++) bottle(BC[(i + 2) % 6], body, -7 + i * 3, 21.2, -16 + (i % 2) * 3, i % 3 === 0);
    // Strange feathers: a jar of them on the bed and singles tied up along the ridge.
    const FC = ['#2fc8c0', '#d848a8', '#f0c030', '#f4f0e8', '#7a48d8', '#e8683a'];
    box(5, 6, 5, plain('#7a4a2a'), 6, 19.4, 8, body);
    for (let i = 0; i < 9; i++) { const g = new THREE.Group(); g.position.set(6 + (i % 3 - 1) * 1.2, 23, 8 + (Math.floor(i / 3) - 1) * 1.2); g.rotation.set((Math.floor(i / 3) - 1) * 0.3, 0, (i % 3 - 1) * 0.3); body.add(g); box(0.5, 18, 0.4, plain('#e8dcc0'), 0, 9, 0, g); box(3, 13, 0.3, plain(FC[i % 6]), 0.4, 12, 0, g); feathers.push({ g, ph: i }); }
    for (let i = 0; i < 7; i++) { const g = new THREE.Group(); g.position.set(-10 + (i % 2) * 20, 50, -22 + i * 6); g.rotation.z = Math.PI; body.add(g); box(0.5, 14, 0.4, plain('#e8dcc0'), 0, 7, 0, g); box(3, 11, 0.3, plain(FC[(i + 3) % 6]), 0.4, 8, 0, g); feathers.push({ g, ph: i + 3, hang: true }); }
    // Spools of silver thread on a rod at the back of the bed.
    const silver = new THREE.MeshLambertMaterial({ color: 0xdfe5ee, emissive: 0x30363f }), thr = new THREE.MeshLambertMaterial({ color: 0xf2f6ff, emissive: 0x3c424c });
    box(0.8, 0.8, 22, plain('#4a3a2a'), -6, 27, -21, body);
    for (let i = 0; i < 5; i++) { const g = new THREE.Group(); g.position.set(-6, 27, -30 + i * 4.2 + 8); g.rotation.z = Math.PI / 2; body.add(g); box(6, 0.8, 6, silver, 0, -2.2, 0, g); box(6, 0.8, 6, silver, 0, 2.2, 0, g); box(4.2, 3.6, 4.2, thr, 0, 0, 0, g); }
    for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.position.set(2 + i * 3.4, 22, -12); body.add(g); box(5, 0.8, 5, silver, 0, -1.8, 0, g); box(5, 0.8, 5, silver, 0, 1.8, 0, g); box(3.6, 3, 3.6, thr, 0, 0, 0, g); }
    box(10, 8, 8, mat('thatch'), -4, 20, 12, body); box(8, 7, 7, mat('hay'), 5, 19.6, -2, body);                                    // sacks
    const lan = new THREE.Group(); lan.position.set(11, 38, 20); body.add(lan); box(3, 4, 3, new THREE.MeshBasicMaterial({ color: 0xffd27a }), 0, 0, 0, lan); box(4, 0.8, 4, plain('#2a2018'), 0, 2.4, 0, lan); box(4, 0.8, 4, plain('#2a2018'), 0, -2.4, 0, lan);
    // The wheels: one sunk into the ditch, which is why the whole thing leans; and the shafts, down on the ground.
    const wheel = (x, y, rr) => { const w = new THREE.Group(); w.position.set(x, y, 0); cart.add(w); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const q = box(2.6, 0.8 * rr, 2.6, mat('plankDark'), 0, rr * Math.cos(a), rr * Math.sin(a), w); q.rotation.x = a; }
      for (let i = 0; i < 4; i++) box(1.4, 2 * rr, 1.4, mat('timber'), 0, 0, 0, w).rotation.x = i * Math.PI / 4; box(4, 4, 4, plain('#3a2a1a'), 0, 0, 0, w); return w; };
    wheel(-14.5, 8, 11); wheel(14.5, 12, 11);
    for (const sx of [-1, 1]) { const sh = box(2, 2, 40, mat('timber'), sx * 8, 9, 40, cart); sh.rotation.x = 0.16; }
    box(18, 2, 14, mat('plank'), 0, 3, -30, cart).rotation.z = 0.2;                                                            // a plank bridging the ditch
  }

  // ── The cast and the animals. ──
  const jack = B.makeJack(), peddler = C.makePeddler(), cowM = C.makeCow();
  const paintJack = e => { B.paintJackInto(jack.skin, { outfit: 'Outdoor', expr: e, trousers: 'up', drawers: 'up' }); jack.tex.needsUpdate = true; };
  paintJack(0); jack.root.scale.setScalar(SC); scene.add(jack.root); scene.add(peddler.root); scene.add(cowM);
  const ja = { t: 0, phase: 0, speed: 0, lead: true, carry: 0, hand: 0, look: 0, air: false }, pa = { t: 0, offer: 0, lean: 0, shrug: 0, phase: 0, speed: 0, point: 0 };
  jack.after = r => {
    const s = Math.sin(ja.phase) * clamp(ja.speed / 20, 0, 1) * 0.7, idle = 0.015 * Math.sin(ja.t * 1.1);
    r.legL.thigh.rotation.x = s; r.legR.thigh.rotation.x = -s; r.armL.rotation.x = -s * 0.8 + idle; r.armR.rotation.x = ja.lead ? -0.55 - s * 0.2 : s * 0.8 - idle;
    r.armR.rotation.x -= ja.hand * 0.8;
    if (ja.carry > 0) { r.armL.rotation.x = r.armR.rotation.x = -1.15; r.armL.rotation.z = 0.28; r.armR.rotation.z = -0.28; r.torso.rotation.x = -0.1; } else { r.armL.rotation.z = 0; r.armR.rotation.z = 0; r.torso.rotation.x = 0; }
    if (ja.air) { r.armL.rotation.x = r.armR.rotation.x = -2.5; r.legL.thigh.rotation.x = -0.5; r.legR.thigh.rotation.x = 0.25; r.legR.knee.rotation.x = 0.5; } else r.legR.knee.rotation.x = 0;
    r.neck.rotation.y = ja.look; r.hips.position.y = 12 + Math.abs(Math.sin(ja.phase)) * 0.5 * clamp(ja.speed / 20, 0, 1);
  };
  peddler.after = r => {
    const t = pa.t, o = pa.offer, s = Math.sin(pa.phase) * clamp(pa.speed / 12, 0, 1) * 0.6;
    r.legL.thigh.rotation.x = s; r.legR.thigh.rotation.x = -s;
    r.armR.rotation.x = -0.25 - 1.0 * o - 0.9 * pa.point; r.armR.rotation.z = 0.25 - 0.2 * o; if (r.elbow) r.elbow.rotation.x = -0.25 - 0.9 * o;
    r.armL.rotation.x = -0.3 - pa.shrug * 0.5 + 0.04 * Math.sin(t * 1.3); r.armL.rotation.z = -0.2 - pa.shrug * 0.4;
    r.neck.rotation.x = 0.03 + pa.lean * 0.12 + 0.02 * Math.sin(t * 0.8); r.neck.rotation.z = pa.lean * 0.08; r.torso && (r.torso.rotation.x = pa.lean * 0.06);
  };
  B.setPose(jack, 'stand'); B.setPose(peddler, 'stand'); for (let i = 0; i < 30; i++) { B.step(jack, 0.1); B.step(peddler, 0.1); }
  // The five beans, in her palm: gold, silver, ember-red, moss-green and a deep, endless blue.
  const hitch = [];
  const beans = new THREE.Group(), BEAN = [0xe8b830, 0xd0d6e0, 0xd8402a, 0x4f9a3a, 0x2a3ec8];
  BEAN.forEach((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 1.2), new THREE.MeshBasicMaterial({ color: c })); m.position.set((i - 2) * 1.5, 0, (i % 2) * 1.2 - 0.6); m.rotation.y = i; beans.add(m); });
  beans.visible = false; (peddler.wrist || peddler.armR).add(beans); beans.position.set(0, -5, 1.2);
  const cord = [], rope = C.col('#b89a5a'); for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1), rope); m.visible = false; scene.add(m); cord.push(m); }
  const halter = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.4, 11), C.col('#5a3a22')); halter.position.set(0, -1.5, 5); cowM.userData.head.add(halter);
  const heldGroup = new THREE.Group(); scene.add(heldGroup);
  peddler.root.position.set(end.x + end.tx * 12 + end.nx * 16, 0, end.z + end.tz * 12 + end.nz * 16); peddler.root.rotation.y = Math.atan2(-end.tx, -end.tz) + 0.5;

  const sway = feathers.map(f => ({ g: f.g, x: f.g.rotation.x, z: f.g.rotation.z, ph: f.ph }));
  const world = { scene, update(dt, t) {
    cowM.tick(dt); ja.t += dt; pa.t += dt; B.step(jack, dt); B.step(peddler, dt);
    for (const f of sway) { f.g.rotation.x = f.x + 0.06 * Math.sin(t * 1.4 + f.ph); f.g.rotation.z = f.z + 0.06 * Math.cos(t * 1.1 + f.ph); }
    for (const c of cloths) c.m.rotation.z = c.base + 0.012 * Math.sin(t * 1.1 + c.ph);
  } };
  const wp = new V3();
  const cull = (cam, tgt, around) => {                                                                  // hide what would come between the camera and what it looks at
    const ax = cam.x, ay = cam.y, az = cam.z, bx = tgt.x, by = tgt.y, bz = tgt.z, ex = bx - ax, ey = by - ay, ez = bz - az, l2 = ex * ex + ey * ey + ez * ez || 1;
    for (const c of canopy) {
      if (!c.p) { c.p = new V3(); c.m.getWorldPosition(c.p); } wp.copy(c.p); const t = clamp(((wp.x - ax) * ex + (wp.y - ay) * ey + (wp.z - az) * ez) / l2, 0, 1), dx = wp.x - (ax + ex * t), dy = wp.y - (ay + ey * t), dz = wp.z - (az + ez * t);
      c.m.visible = (dx * dx + dy * dy + dz * dz) > (c.r + 14) ** 2 && (wp.x - ax) ** 2 + (wp.y - ay) ** 2 + (wp.z - az) ** 2 > (30 + c.r) ** 2;
    }
    for (const tr of trunks) { let vis = true; for (const q of tr.pts) { const t = clamp(((q.x - ax) * ex + (q.y - ay) * ey + (q.z - az) * ez) / l2, 0, 1), dx = q.x - (ax + ex * t), dy = q.y - (ay + ey * t), dz = q.z - (az + ez * t); if (dx * dx + dy * dy + dz * dz < 16 * 16 || (q.x - ax) ** 2 + (q.y - ay) ** 2 + (q.z - az) ** 2 < 46 * 46) { vis = false; break; } } tr.m.visible = vis; }
    for (const g of forest) g.visible = (g.position.x - around.x) ** 2 + (g.position.z - around.z) ** 2 < 520 * 520;
  };
  return { hitch, cull, cart, R, scene, world, items, ties, canopy, trunks, forest, jack, peddler, cowM, ja, pa, paintJack, cord, halter, heldGroup, beans, end, cartPos, trailDir, trailStart};
}

// ── The HUD, cord and helpers shared by the play and the scene. ──
function cordUpdate(W, a, b, slack) {
  const n = W.cord.length;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, p0 = a.clone().lerp(b, t0), p1 = a.clone().lerp(b, t1); p0.y -= slack * 4 * t0 * (1 - t0); p1.y -= slack * 4 * t1 * (1 - t1);
    const m = W.cord[i]; m.visible = true; m.position.copy(p0).add(p1).multiplyScalar(0.5); m.scale.set(1, 1, Math.max(0.1, p0.distanceTo(p1) + 0.3)); m.lookAt(p1);
  }
}
const hideCord = W => W.cord.forEach(m => { m.visible = false; });
const jackHand = (W, out) => { W.jack.root.updateMatrixWorld(true); return W.jack.armR.localToWorld(out.set(0, -11, 1)); };
const cowNeck = (W, out) => { W.cowM.updateMatrixWorld(true); return W.cowM.userData.head.localToWorld(out.set(0, -1.5, 5)); };

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let WORLD = null;
async function run(G, opts) {
  const W = WORLD || (WORLD = build(G));
  G.mode = 'cutscene'; document.body.classList.add('cutscene');
  G.setScene(W.world); G.drone = null; A && A.ambience({ wind: 0.35, birds: 0.9, fire: 0 }); A && A.duckMusic(0.5, 3); A && A.startMusic();
  const res = await playLoop(G, W, opts || {});
  await trade(G, W, res);
  WORLD = null;                                                                                       // (rebuilt fresh if the chapter is played again)
  return res;
}

function playLoop(G, W, opts) {
  const { R, items, ties, canopy, trunks, forest, jack, cowM, ja, cord } = W, ui = Mk.hud(), keys = {}, tu = root.TouchUI.create({ keys, run: true, sneak: true, jump: true, act: true, drop: true, cam: true }), scene = W.scene, el = G.renderer.domElement;
  return new Promise(resolve => {
    const c0 = R.at(14), h0 = Math.atan2(c0.tx, c0.tz);
    const st = { y: 0, vy: 0, grounded: true, pos: v(c0.x, 0, c0.z), heading: h0, speedN: 0, sneak: false, yaw: h0 + Math.PI, pitch: 0.8, zoom: 1, boost: 0, jumpReq: false, stick: tu.stick, toastAt: 0, carry: null, soothes: 0, plants: 0, runSecs: 0, soothedAt: 0, tips: {}, soothN: 0, done: false, dragAt: 0 };
    if (opts.cart) { const c1 = R.at(R.len - 140); st.pos.set(c1.x, 0, c1.z); st.heading = Math.atan2(c1.tx, c1.tz); st.yaw = st.heading + Math.PI; }
    const cow = { pos: v(c0.x - c0.tx * 34, 0, c0.z - c0.tz * 34), heading: h0, trust: 100, mode: 'follow', tree: null, blockedT: 0, planted: false, moved: false };
    if (opts.cart) { cow.pos.set(st.pos.x - Math.sin(st.heading) * 34, 0, st.pos.z - Math.cos(st.heading) * 34); cow.heading = st.heading; }
    jack.root.position.copy(st.pos); jack.root.rotation.y = st.heading; jack.root.visible = true; W.paintJack(0); ja.lead = true; ja.carry = 0; ja.hand = 0; ja.speed = 0; ja.air = false;
    W.peddler.root.visible = true; W.beans.visible = false; W.cowM.visible = true; W.halter.visible = true;
    const camPos = new V3(), look = new V3(), spec = { pos: camPos, look, fov: 48 };
    const camGoal = () => { const d = ZOOMS[st.zoom].d, p = st.pitch; look.set(st.pos.x, st.y + 15 * SC, st.pos.z); return new V3(look.x + Math.sin(st.yaw) * Math.cos(p) * d, Math.max(3, look.y + Math.sin(p) * d), look.z + Math.cos(st.yaw) * Math.cos(p) * d); };
    camPos.copy(camGoal()); G.cut(spec);
    const toast = (t, ms = 3600) => { ui.toast.textContent = root.Tips.clean(t); ui.toast.style.opacity = 1; st.toastAt = performance.now() + ms; };
    const tip = (k, t, ms) => { if (st.tips[k]) return; st.tips[k] = true; toast(t, ms || 6500); };
    // Input.
    const KM = { w: 'up', W: 'up', ArrowUp: 'up', s: 'down', S: 'down', ArrowDown: 'down', a: 'left', A: 'left', ArrowLeft: 'left', d: 'right', D: 'right', ArrowRight: 'right', Shift: 'run' };
    const kd = e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = KM[e.key]; if (k) { keys[k] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); }
      if (e.key === ' ') e.preventDefault(); if (e.repeat) return; if (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X') toggleSneak(); if (e.key === 'e' || e.key === 'E') interact(); if (e.key === 'q' || e.key === 'Q') pickUp(); if (e.key === ' ') st.jumpReq = true; if (e.key === 'v' || e.key === 'V') cycleZoom(); };
    const ku = e => { const k = KM[e.key]; if (k) keys[k] = false; };
    root.addEventListener('keydown', kd); root.addEventListener('keyup', ku);
    const drags = new Map(), pd = e => drags.set(e.pointerId, { x: e.clientX, y: e.clientY }), pu = e => drags.delete(e.pointerId);
    const pm = e => { const d = drags.get(e.pointerId); if (!d) return; st.dragAt = performance.now(); st.yaw -= (e.clientX - d.x) * 0.006; st.pitch = clamp(st.pitch + (e.clientY - d.y) * 0.005, 0.08, 1.35); d.x = e.clientX; d.y = e.clientY; };
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
    const wheel = e => { e.preventDefault(); cycleZoom(e.deltaY > 0 ? 1 : -1); }; el.addEventListener('wheel', wheel, { passive: false });
    const camIcon = () => tu.set('cam', { icon: 'camera', title: 'Camera: ' + ZOOMS[st.zoom].name });
    function cycleZoom(dir) { st.zoom = (st.zoom + (dir || 1) + ZOOMS.length) % ZOOMS.length; camIcon(); }
    function toggleSneak() { st.sneak = !st.sneak; tu.setSneak(st.sneak); if (st.sneak && tu.run) tu.setRun(false); toast(st.sneak ? 'Sneaking: slow and quiet.' : 'Walking.'); }              // (the C key; the on-screen Sneak button sets st.sneak itself and keeps Run off)
    ui.tu = tu; camIcon();
    tu.on.cam = () => cycleZoom(); tu.on.jump = () => { st.jumpReq = true; }; tu.on.act = () => interact(); tu.on.drop = () => pickUp(); tu.on.sneak = on => { st.sneak = on; toast(on ? 'Sneaking: slow and quiet.' : 'Walking.'); };
    const mark = document.createElement('i'); mark.style.cssText = 'position:absolute;left:' + PLANT + '%;top:-2px;bottom:-2px;width:2px;background:#f0b0a0;opacity:.9'; ui.trustBar.parentElement.style.position = 'relative'; ui.trustBar.parentElement.appendChild(mark);

    // The world as Jack and the cow meet it.
    const cowCircles = (x, z, h) => [-13, 1, 15].map(o => [x + Math.sin(h) * o, z + Math.cos(h) * o]);
    const edgeBlocked = (x, z, r) => { const nr = R.near(x, z); return Math.abs(nr.off) > R.w(nr.s) - r; };
    function jackBlocked(x, z, y) {
      if (edgeBlocked(x, z, 4)) return true;
      for (const t of ties) if (Math.hypot(x - t.x, z - t.z) < t.r + 5) return true;
      for (const it of items) if (!it.carried && gapTo(it, x, z) < 5 && y < it.top - 2) return true;
      return false;
    }
    function cowBlocked(x, z, h) {
      for (const [cx, cz] of cowCircles(x, z, h)) {
        if (edgeBlocked(cx, cz, 8)) return true;
        for (const t of ties) if (Math.hypot(cx - t.x, cz - t.z) < t.r + 8) return true;
        for (const it of items) if (!it.carried && gapTo(it, cx, cz) < 8) return true;
      }
      return false;
    }
    const surfaceAt = (x, z) => { let top = 0; for (const it of items) if (!it.carried && gapTo(it, x, z) < 3 && it.top > top) top = it.top; return top; };
    const haltPt = () => v(cow.pos.x + Math.sin(cow.heading) * 24, 0, cow.pos.z + Math.cos(cow.heading) * 24);
    const gapCow = () => Mk.cowGap(st.pos.x, st.pos.z, cow);

    // Actions.
    const nearestItem = r => { let best = null, bd = r; for (const it of items) if (!it.carried) { const d = gapTo(it, st.pos.x, st.pos.z); if (d < bd) { bd = d; best = it; } } return best; };
    const nearTie = r => { for (const t of ties) if (Math.hypot(st.pos.x - t.x, st.pos.z - t.z) < r) return t; return null; };
    function pickUp() {                                                                                           // Q: take up what lies beside him, or put down what he carries
      if (st.done) return; if (st.carry) { putDown(); return; }
      const it = nearestItem(13); if (!it) { toast('Nothing to take here.', 1800); return; }
      if (cow.mode === 'follow') { toast('Your hands are full with the lead. Tie Milky-White to a tree first.'); return; }
      st.carry = it; it.carried = true; ja.carry = 1; ja.lead = false; toast('You pick up the ' + (it.kind === 'limb' ? 'limb' : it.kind) + '.');
    }
    function interact() {                                                                                         // E: the action: tie or untie her, or speak to her
      if (st.done) return;
      if (st.carry) { toast('Put it down first (Q).', 1800); return; }
      const t = nearTie(16);
      if (t) {
        if (cow.mode === 'tied' && cow.tree === t) { cow.mode = 'follow'; cow.tree = null; ja.lead = true; toast('You untie her and take up the lead.'); return; }
        if (cow.mode === 'follow') {
          const hp = haltPt(); if (Math.hypot(hp.x - t.x, hp.z - t.z) > 44) { toast('Bring her closer to the tree first.'); return; }
          cow.mode = 'tied'; cow.tree = t; ja.lead = false; toast('You tie her to the tree. She’ll wait.'); A && A.moo(0.35, 0.9); return;
        }
      }
      if (gapCow() < 18) { soothe(); return; }
      toast('Nothing to do here.', 1800);
    }
    function soothe() {
      const now = performance.now(); if (now < st.soothedAt) return; st.soothedAt = now + 2200; st.soothes++;
      const line = SOOTHE[st.soothN++ % SOOTHE.length]; A && A.speak('jack', line, 3, {}); A && A.moo(0.35, 0.85);
      const before = cow.trust; cow.trust = Math.min(100, cow.trust + 15); toast('Jack: “' + line + '”', 3200);
      if (before <= PLANT && cow.trust > PLANT) setTimeout(() => toast('She shifts her weight and lets out a long breath. She’ll walk again.', 3600), 800);
    }
    function putDown() {
      const it = st.carry; if (!it) return;
      const f = v(Math.sin(st.heading), 0, Math.cos(st.heading)), px = st.pos.x + f.x * 15, pz = st.pos.z + f.z * 15, ry = st.heading, nr = R.near(px, pz);
      if (!fits(it, px, pz, ry) || Math.abs(nr.off) > R.w(nr.s) + 6) { toast('There’s no room to put it down there.'); return; }
      it.x = px; it.z = pz; it.ry = ry; it.mesh.position.set(px, st.y, pz); it.mesh.rotation.y = ry; it.carried = false; st.carry = null; ja.carry = 0; if (cow.mode === 'follow') ja.lead = true;
      A && A.thwack(0.25, true, 0.4); toast('You put it down.', 1800);
    }
    function fits(it, px, pz, ry) {                                                                                // would it lie clear of everything there?
      const c = Math.cos(ry), s = Math.sin(ry);
      for (const k of [-1, -0.5, 0, 0.5, 1]) for (const q of [-1, 0, 1]) {
        const lx = k * it.hx, lz = q * it.hz, x = px + lx * c + lz * s, z = pz - lx * s + lz * c;
        for (const o of items) if (o !== it && !o.carried && gapTo(o, x, z) < 2) return false;
        for (const t of ties) if (Math.hypot(x - t.x, z - t.z) < t.r + 2) return false;
        if (cowHitPoint(x, z, 0)) return false;
      }
      return true;
    }
    function cowHitPoint(x, z, r) { return cowCircles(cow.pos.x, cow.pos.z, cow.heading).some(([cx, cz]) => Math.hypot(cx - x, cz - z) < r + 8); }

    const tick = dt => {
      if (st.done) return;
      // Jack: WASD relative to the camera; he turns into the direction and walks along his heading.
      const f = new V3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw)), r = new V3(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
      const dir = new V3().addScaledVector(f, (keys.up ? 1 : 0) - (keys.down ? 1 : 0)).addScaledVector(r, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
      if (Math.hypot(st.stick.x, st.stick.y) > 0.2) dir.addScaledVector(f, -st.stick.y).addScaledVector(r, st.stick.x);
      const vel = new V3(), carrying = !!st.carry;
      if (dir.lengthSq() > 0) {
        dir.normalize(); const want = Math.atan2(dir.x, dir.z); st.heading = turn(st.heading, want, Math.min(1, dt * 9));
        const off = Math.abs(turn(st.heading, want, 1) - st.heading), ease = clamp(1 - off / Math.PI * 0.8, 0.2, 1), sp = carrying ? WALK * 0.7 : keys.run ? RUN : st.sneak ? CREEP : WALK;
        vel.set(Math.sin(st.heading), 0, Math.cos(st.heading)).multiplyScalar(sp * SC * ease);
      }
      st.boost = Math.max(0, st.boost - dt);
      if (st.jumpReq) { st.jumpReq = false; if (st.grounded && !carrying) { st.vy = JUMP_V; st.grounded = false; st.boost = 0.5; } else if (carrying) tip('heavy', 'It’s too heavy to jump with.', 2400); }
      const nx = st.pos.x + vel.x * dt, nz = st.pos.z + vel.z * dt; if (!jackBlocked(nx, st.pos.z, st.y)) st.pos.x = nx; if (!jackBlocked(st.pos.x, nz, st.y)) st.pos.z = nz;
      st.vy -= GRAV * dt; st.y += st.vy * dt; const gnd = surfaceAt(st.pos.x, st.pos.z); if (st.y <= gnd) { st.y = gnd; st.vy = 0; st.grounded = true; } else st.grounded = false;
      for (const it of items) if (!it.carried && st.y < it.top - 2) { const p = pushOut(it, st.pos.x, st.pos.z, 5); if (p) { st.pos.x = p.x; st.pos.z = p.z; } }
      ja.air = !st.grounded;
      st.speedN = vel.length() / SC; ja.speed = st.speedN * 0.8; ja.phase += dt * st.speedN * 0.42;
      const running = st.speedN > RUNNING && !carrying;
      // The cow.
      const hp = haltPt(), J = v(st.pos.x, 0, st.pos.z), before = cow.pos.clone(); cow.moved = false;
      if (cow.mode === 'follow') {
        if (running) { cow.trust = Math.max(0, cow.trust - 9 * dt); st.runSecs += dt; tip('run', 'Milky-White doesn’t like it when you run. If she stops, stand by her and speak to her (E).'); }
        const hd = Math.hypot(hp.x - J.x, hp.z - J.z), fac = cow.trust <= PLANT ? 0 : clamp((cow.trust - PLANT) / 30, 0, 1);
        if (cow.trust <= PLANT && !cow.planted) { cow.planted = true; st.plants++; A && A.moo(0.6, 0.75); toast('Milky-White has planted her hooves. Stand by her and speak softly (E).', 5500); }
        if (cow.trust > PLANT + 5 && cow.planted) cow.planted = false;
        if (hd > HOLD && fac > 0) {
          let gx = J.x, gz = J.z; { const nc = R.near(hp.x, hp.z), nj = R.near(J.x, J.z);                                  // she follows the road round its bends, not straight across the verge
            if (Math.abs(nj.off) < R.w(nj.s) - 4 && Math.abs(nc.off) < R.w(nc.s) + 6 && nj.s > nc.s + 28) { const ct = R.at(nc.s + 28), o = lerp(nc.off, nj.off, 0.5); gx = ct.x + ct.nx * o; gz = ct.z + ct.nz * o; } }
          const want = Math.atan2(gx - hp.x, gz - hp.z); cow.heading = turn(cow.heading, want, Math.min(1, dt * 2.8));
          const align = clamp(1 - Math.abs(turn(cow.heading, want, 1) - cow.heading) / Math.PI * 1.3, 0.15, 1), sp = COW_V * fac * align * clamp((hd - HOLD) / 10, 0.35, 1.2);
          const dx = Math.sin(cow.heading) * sp * dt, dz = Math.cos(cow.heading) * sp * dt, nx_ = cow.pos.x + dx, nz_ = cow.pos.z + dz; let mv = false;
          if (!cowBlocked(nx_, cow.pos.z, cow.heading)) { cow.pos.x = nx_; mv = true; } if (!cowBlocked(cow.pos.x, nz_, cow.heading)) { cow.pos.z = nz_; mv = true; }
          cow.moved = mv; cow.blockedT = mv ? 0 : cow.blockedT + dt;
          if (cow.blockedT > 0.8) tip('blocked', 'Milky-White can’t get past that. Tie her to the tree by the road (E), then clear the way.', 8000);
        } else cow.blockedT = 0;
        // The lead is only so long: Jack cannot go further than it allows, so a slow cow is pulled along at her own pace.
        const hp2 = haltPt(), d2 = Math.hypot(hp2.x - J.x, hp2.z - J.z);
        if (d2 > LEN) { const k = LEN / d2, px = hp2.x + (J.x - hp2.x) * k, pz = hp2.z + (J.z - hp2.z) * k; if (!jackBlocked(px, pz, st.y)) { st.pos.x = px; st.pos.z = pz; } if (cow.trust <= PLANT) tip('drag', 'The lead goes taut. She won’t be pulled.', 4000); }
      }
      const pushJ = Mk.cowHit(st.pos.x, st.pos.z, { pos: cow.pos, heading: cow.heading }, 5); if (st.y < 24 && pushJ && !jackBlocked(pushJ.x, pushJ.z, st.y)) { st.pos.x = pushJ.x; st.pos.z = pushJ.z; }
      if (Mk.cowHit(st.pos.x, st.pos.z, { pos: cow.pos, heading: cow.heading }, 5) && cow.moved) cow.pos.copy(before);
      jack.root.position.set(st.pos.x, st.y, st.pos.z); jack.root.rotation.y = turn(jack.root.rotation.y, st.heading, Math.min(1, dt * 12));
      cowM.position.set(cow.pos.x, 0, cow.pos.z); cowM.rotation.y = cow.heading;
      const taut = cow.mode === 'follow' && Math.hypot(haltPt().x - J.x, haltPt().z - J.z) > LEN - 4;
      cowM.userData.headBase = cow.planted ? 0.5 : taut ? -0.15 : cow.mode === 'tied' ? 0.45 : 0.1;
      // The cord: from his hand (or the tree) to her halter, slack unless taut.
      const a = cow.mode === 'tied' ? cow.tree.ring.clone() : jackHand(W, v(0, 0, 0)), nk = cowNeck(W, v(0, 0, 0)), dist = a.distanceTo(nk);
      cordUpdate(W, a, nk, clamp((LEN - dist) / LEN, 0, 1) * 7);
      // What he carries is held out in front of him.
      if (st.carry) { const it = st.carry, f2 = v(Math.sin(st.heading), 0, Math.cos(st.heading)); it.mesh.position.set(st.pos.x + f2.x * 10, st.y + 11, st.pos.z + f2.z * 10); it.mesh.rotation.y = st.heading; }
      // The camera drifts round to look along the road, unless the player has just turned it: so W follows the bends.
      if (st.speedN > 2 && !drags.size && performance.now() - st.dragAt > 1800) { const nr = R.near(st.pos.x, st.pos.z), c = R.at(nr.s); if (nr.d < 40) st.yaw = turn(st.yaw, Math.atan2(c.tx, c.tz) + Math.PI, Math.min(1, dt * 0.9)); }
      // The camera: always centred on Jack; the canopy that would come between is hidden.
      const goal = camGoal(); camPos.lerp(goal, Math.min(1, dt * 8)); look.set(st.pos.x, st.y + 15 * SC, st.pos.z); G.cut(spec);
      cullFrame++; if (cullFrame % 2 === 0) W.cull(camPos, look, st.pos);
      // The HUD.
      const t = nearTie(16), it = !st.carry && nearestItem(13), pace = st.speedN < 0.5 ? 'Still' : running ? 'Running' : st.sneak ? 'Sneaking' : 'Walking';
      const blockedNow = cow.blockedT > 0.8;
      ui.obj.textContent = root.Tips.clean(st.carry ? 'Find somewhere to put it down (Q).' : cow.mode === 'tied' ? 'Clear the way, then untie Milky-White (E at the tree) and go on.' : blockedNow ? 'Milky-White can’t follow: tie her to a tree (E), then move what’s in the way.' : cow.planted ? 'Milky-White has stopped. Stand by her and speak softly (E).' : 'Lead Milky-White along the road to market.');
      ui.trustWrap.style.display = 'block'; ui.trustBar.style.width = cow.trust + '%'; ui.trustVal.textContent = Math.round(cow.trust) + '%'; ui.trustBar.classList.toggle('full', cow.trust >= 99.5);
      ui.pace.textContent = pace + (running ? ' — she won’t like that!' : ''); ui.pace.classList.toggle('warn', running);
      const h = st.carry ? 'Q: put it down' : it ? 'Q: pick up the ' + it.kind : t ? (cow.mode === 'tied' && cow.tree === t ? 'E: untie Milky-White' : cow.mode === 'follow' ? 'E: tie Milky-White to the tree' : '') : gapCow() < 18 && cow.trust < 100 ? 'E: speak softly to her' : '';
      ui.hint.textContent = h; ui.hint.style.display = h ? 'block' : 'none';
      if (st.toastAt && performance.now() > st.toastAt) { ui.toast.style.opacity = 0; st.toastAt = 0; }
      // The touch buttons say what a tap will do now, and grey out when it would do nothing (the same conditions as the keys above).
      { const tie = nearTie(16), item = !st.carry && nearestItem(13), facing = (x, z) => { const dx = x - st.pos.x, dz = z - st.pos.z, m = Math.hypot(dx, dz) || 1; return (dx * Math.sin(st.heading) + dz * Math.cos(st.heading)) / m; };
        tu.set('jump', { label: 'Jump', icon: 'jump', enabled: st.grounded && !st.carry });
        let act = null;
        if (st.carry) act = null;
        else if (tie && cow.mode === 'tied' && cow.tree === tie) act = 'Untie';
        else if (tie && cow.mode === 'follow') act = 'Tie up';
        else if (gapCow() < 18) act = 'Speak';
        tu.set('act', act ? { label: act, enabled: true } : { label: 'Do', enabled: false });
        tu.set('drop', { label: st.carry ? 'Put down' : 'Pick up', enabled: !!(st.carry || (item && cow.mode !== 'follow')) }); }
      // The end of the road.
      if (Math.hypot(st.pos.x - W.peddler.root.position.x, st.pos.z - W.peddler.root.position.z) < 64) {
        if (cow.mode === 'follow' && Math.hypot(cow.pos.x - W.peddler.root.position.x, cow.pos.z - W.peddler.root.position.z) < 100 && !st.carry) finish();
        else if (cow.mode === 'tied' && !st.tips.tiedEnd) tip('tiedEnd', 'Milky-White is tied up behind you. Fetch her first.', 4000);
        else if (st.carry && !st.tips.carryEnd) tip('carryEnd', 'Put that down first.', 3000);
      }
    };
    let cullFrame = 0;
    function cleanup() {
      root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); el.removeEventListener('wheel', wheel);
      G.updaters = G.updaters.filter(u => u !== tick); mark.remove(); ui.show(false); tu.destroy(); ui.tu = null; ui.toast.style.opacity = 0;
      for (const c of canopy) c.m.visible = true; for (const tr of trunks) tr.m.visible = true;
    }
    function finish() {
      if (st.done) return; st.done = true; cleanup();
      for (const k in keys) keys[k] = false; ja.speed = 0;
      W.state = { st, cow }; resolve({ soothes: st.soothes, plants: st.plants, runSecs: Math.round(st.runSecs * 10) / 10 });
    }
    W.play = { st, cow, items, ties, interact, pickUp, putDown, soothe, tick, finish, toast, cowBlocked, jackBlocked, haltPt };                                                   // (for the tests)
    G.updaters.push(tick); ui.show(true); G.mode = 'play'; document.body.classList.remove('cutscene'); G.fade(false, 1.8);
  });
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The cart: the Peddler and a short dialogue tree in Jack's voice. Every branch ends with the trade.
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function trade(G, W, res) {
  const { jack, peddler, cowM, ja, pa, end, R } = W, st = W.state.st, cow = W.state.cow, P = peddler.root.position;
  G.mode = 'cutscene'; document.body.classList.add('cutscene'); G.hideLine();
  await G.fade(true, 0.5);
  // Everyone to their marks. Jack and the cow arrive from the road, the Peddler waits by her cart.
  const t = v(end.tx, 0, end.tz), n = v(end.nx, 0, end.nz), J0 = v(P.x - t.x * 36 - n.x * 8, 0, P.z - t.z * 36 - n.z * 8), toP = Math.atan2(P.x - J0.x, P.z - J0.z);
  jack.root.position.copy(J0); jack.root.rotation.y = toP; ja.speed = 0; ja.lead = true; ja.carry = 0; ja.air = false; ja.look = 0;
  cow.heading = toP; cow.pos.set(J0.x - n.x * 4 - t.x * 4 - n.x * 20, 0, J0.z - n.z * 4 - t.z * 4 - n.z * 20); cow.mode = 'follow'; cowM.position.set(cow.pos.x, 0, cow.pos.z); cowM.rotation.y = toP; cowM.userData.headBase = 0.1;
  peddler.root.rotation.y = Math.atan2(J0.x - P.x, J0.z - P.z); pa.offer = 0; pa.lean = 0; pa.shrug = 0; pa.point = 0;
  const hand = v(0, 0, 0), neck = v(0, 0, 0);
  const holder = { who: 'jack' };
  const cordTick = () => { const a = holder.who === 'jack' ? jackHand(W, hand) : (peddler.root.updateMatrixWorld(true), (peddler.wrist || peddler.armL).localToWorld(hand.set(0, -5, 1))), nk = cowNeck(W, neck); cordUpdate(W, a, nk, 4); };
  const cullTick = () => { const sn = G.shotNow(); W.cull(sn.pos, sn.look, P); }; G.updaters.push(cordTick, cullTick);
  const eye = (pos, h) => v(pos.x, h, pos.z);
  const side = n.clone(), shots = {
    wide: { pos: v((P.x + J0.x) / 2 + side.x * 92, 40, (P.z + J0.z) / 2 + side.z * 92), look: v((P.x + J0.x) / 2, 18, (P.z + J0.z) / 2), fov: 46 },
    peddler: { pos: v(J0.x - t.x * 12 - n.x * 22, 30, J0.z - t.z * 12 - n.z * 22), look: v(P.x, 26.5, P.z), fov: 32 },
    jack: { pos: v(P.x + t.x * 16 + n.x * 24, 31, P.z + t.z * 16 + n.z * 24), look: v(J0.x, 24.5, J0.z), fov: 32 },
    cart: { pos: v(P.x - t.x * 44 + n.x * 52, 34, P.z - t.z * 44 + n.z * 52), look: v(P.x + t.x * 22, 26, P.z + t.z * 22), fov: 50 },
  };
  G.cut(shots.wide); await G.wait(0.2); G.skipping = false;
  A && A.ambience({ wind: 0.2, birds: 0.5, fire: 0 }); A && A.duckMusic(0.4, 1);
  await G.fade(false, 1.0); await G.wait(0.6);
  const choices = [];
  const J = (e, text) => { W.paintJack(e); return G.say('jack', text); };
  const say = (text) => G.say('peddler', text);
  const ask = async (opts, e) => { W.paintJack(e == null ? 0 : e); const i = await G.choose('jack', opts); choices.push(i); return i; };

  // 1. She sees him coming.
  G.cut(shots.peddler); pa.lean = 1;
  await say('Well now. A boy, a cow and a long road behind them. You look like someone waiting on his luck.');
  G.cut(shots.jack);
  const a1 = await ask(['Waiting? It’s on its way, ma’am. I can feel it coming.', 'Depends who’s asking, and what they’re selling.', 'I’m on my way to market. I can’t stop long.'], 5);
  G.cut(shots.jack); await J(5, ['Waiting? It’s on its way, ma’am. I can feel it coming.', 'Depends who’s asking, and what they’re selling.', 'I’m on my way to market. I can’t stop long.'][a1]);
  G.cut(shots.peddler);
  await say([ 'It always is, for those who know where to look.', 'Someone who sells what doesn’t jingle. Which is exactly the thing you’re short of, I think.', 'To market. Of course. Coin for the cow, and coin for the roof. Coin goes quickly, though. Roofs go quicker.' ][a1]);
  if (a1 === 2) { G.cut(shots.jack); await J(1, 'How do you know about the roof?'); G.cut(shots.peddler); await say('It is a road, my boy. Everybody on it is carrying a roof of some kind.'); }
  await say('Come closer. Mind the bottles. I have something here that doesn’t jingle, but it roots itself deeper than any coin ever could.');
  // 2. The beans.
  G.cut(shots.cart); pa.offer = 1; W.beans.visible = true; await G.wait(0.5);
  await say('Gold. Silver. Ember red. Moss green. And one deep, endless blue.');
  G.cut(shots.jack);
  const a2 = await ask(['Beans? They don’t look like much.', 'They’re pretty. What do they do?', 'I had a magic compass once. It didn’t do much either.'], 4);
  await J(4, ['Beans? They don’t look like much.', 'They’re pretty. What do they do?', 'I had a magic compass once. It didn’t do much either.'][a2]);
  G.cut(shots.peddler);
  await say([ 'Neither do most seeds, until they grow.', 'They grow what you need. Whether you know it or not.', 'Compasses only point. Seeds do something about where you’re going.' ][a2]);
  G.cut(shots.jack); paintAll(W, 5);
  await G.say('jack', 'And you’d trade me these. For her.');
  G.cut(shots.peddler); pa.shrug = 1;
  await say('Straight across. Beans for a cow. A fair exchange.');
  pa.shrug = 0;
  // 3. Making up his mind.
  G.cut(shots.jack);
  const a3 = await ask(['Done. Beans for a cow, and I’ll be the richest lad in the valley by spring.', 'Fair for who?', 'My mother wanted coin.'], 5);
  let close;
  if (a3 === 0) {
    await J(5, 'Done. Beans for a cow, and I’ll be the richest lad in the valley by spring.');
    G.cut(shots.peddler); await say('Spring is a fine time for it.');
    G.cut(shots.jack); await J(5, 'But if these sprout nothing but weeds, I’m coming back with a shovel.');
    G.cut(shots.peddler); await say('Then bring a big one.'); close = 'Richest lad in the valley. Mother won’t believe it.';
  } else if (a3 === 1) {
    await J(4, 'Fair for who?');
    G.cut(shots.peddler); await say('For whoever is ready.');
    G.cut(shots.jack); await J(5, 'Then it’s fair for me. I’ve been ready all my life.'); close = 'Ready. That’s me. Always has been.';
  } else {
    await J(1, 'My mother wanted coin.');
    G.cut(shots.peddler); await say('Your mother wanted a roof that doesn’t leak and a table that’s never bare. What if I told you that is exactly what these are for?');
    G.cut(shots.jack); await J(5, '...Well. When you put it like that.'); close = 'A roof that doesn’t leak. Mother will thank me for this.';
  }
  // 4. The trade: she takes the lead, and the cow goes between the shafts of her cart.
  G.cut(shots.wide); ja.hand = 1; await G.wait(0.5);
  await G.say('jack', 'Be good, Milky-White.');
  A && A.moo(0.5, 0.9);
  holder.who = 'peddler'; ja.hand = 0; ja.lead = false;
  G.cut(shots.cart); W.beans.visible = false; pa.offer = 0; await G.wait(0.6);
  await say('There. Strong in the shoulder, and a gentle eye. She will take to the shafts as if she were born to them.');
  // The Peddler walks her to the front of the cart and puts her into the harness (a three-quarter view from the road, the whole cart in it).
  const spot = (a, l) => v(end.x + t.x * a + n.x * l, 0, end.z + t.z * a + n.z * l);                     // a point by its distance along the road's end and across it
  const hitchShot = { pos: (q => v(q.x, 52, q.z))(spot(-112, 84)), look: (q => v(q.x, 14, q.z))(spot(-14, 0)), fov: 46 };
  G.cut(hitchShot);
  W.cart.updateMatrixWorld(true);
  const slot = W.cart.localToWorld(v(0, 0, 47)), ca = Math.atan2(-t.x, -t.z), beside = v(slot.x + n.x * 20, 0, slot.z + n.z * 20);
  const PP = spot(-50, 14), JJ = spot(-76, -2), jw = [v(J0.x, 0, J0.z), spot(-30, 34), JJ];                    // Jack backs away, round the cow, while she is led to the shafts
  pa.speed = 12; ja.speed = 22;
  for (let i = 0; i < 110; i++) {
    { const u = (i + 1) / 110, k = u * 2, seg = Math.min(1, Math.floor(k)), f = k - seg, q = jw[seg].clone().lerp(jw[seg + 1], f), ang = Math.atan2(jw[seg + 1].x - jw[seg].x, jw[seg + 1].z - jw[seg].z); jack.root.position.set(q.x, 0, q.z); jack.root.rotation.y = turn(jack.root.rotation.y, ang, 0.3); ja.phase += 0.4; }
    P.x += (beside.x - P.x) * 0.05; P.z += (beside.z - P.z) * 0.05; pa.phase += 0.3; peddler.root.rotation.y = turn(peddler.root.rotation.y, Math.atan2(slot.x - P.x, slot.z - P.z), 0.15);
    cow.pos.x += (slot.x - cow.pos.x) * 0.05; cow.pos.z += (slot.z - cow.pos.z) * 0.05; cow.heading = turn(cow.heading, ca, 0.07); cowM.position.set(cow.pos.x, 0, cow.pos.z); cowM.rotation.y = cow.heading;
    await G.wait(0.04);
  }
  pa.speed = 0; ja.speed = 0; cowM.position.set(slot.x, 0, slot.z); cowM.rotation.y = ca; cow.pos.set(slot.x, 0, slot.z);
  G.updaters = G.updaters.filter(u => u !== cordTick); hideCord(W);
  // The harness: a collar, and traces to the tips of the shafts.
  { const leather = C.col('#4a2e1a'), collar = new THREE.Mesh(new THREE.BoxGeometry(15, 15, 4), leather); collar.position.set(0, 19, 13.5); cowM.children[0].add(collar);
    cowM.updateMatrixWorld(true); W.cart.updateMatrixWorld(true);
    for (const sx of [-1, 1]) { const a = cowM.children[0].localToWorld(v(sx * 7.6, 20, 12)), bb = W.cart.localToWorld(v(sx * 8, 11, 52)), m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1), leather); m.position.copy(a).add(bb).multiplyScalar(0.5); m.scale.set(1, 1, a.distanceTo(bb)); W.scene.add(m); m.lookAt(bb); W.hitch.push(m); }
    W.hitch.push(collar); }
  pa.point = 0.5; pa.lean = 1; A && A.thwack(0.2, true, 0.35); await G.wait(1.6); pa.point = 0; pa.lean = 0;
  // The Peddler takes her place by the cow's head; Jack waits back along the road, facing her.
  { const pstart = v(P.x, 0, P.z); pa.speed = 12;
    for (let i = 0; i < 60; i++) { const u = smooth((i + 1) / 60); P.x = pstart.x + (PP.x - pstart.x) * u; P.z = pstart.z + (PP.z - pstart.z) * u; pa.phase += 0.3; peddler.root.rotation.y = turn(peddler.root.rotation.y, Math.atan2(JJ.x - P.x, JJ.z - P.z), 0.15); jack.root.rotation.y = turn(jack.root.rotation.y, Math.atan2(PP.x - JJ.x, PP.z - JJ.z), 0.15); await G.wait(0.04); } }
  pa.speed = 0; jack.root.rotation.y = Math.atan2(PP.x - JJ.x, PP.z - JJ.z); peddler.root.rotation.y = Math.atan2(JJ.x - P.x, JJ.z - P.z);
  // The last exchange, shot clear of the cow: over Jack's shoulder at the Peddler, over hers at Jack.
  const after = {
    peddler: { pos: (q => v(q.x, 30, q.z))(spot(-90, -20)), look: (q => v(q.x, 26.5, q.z))(PP), fov: 32 },
    jack: { pos: (q => v(q.x, 31, q.z))(spot(-38, 52)), look: (q => v(q.x, 24.5, q.z))(JJ), fov: 30 },
    wide: { pos: (q => v(q.x, 42, q.z))(spot(-60, 108)), look: (q => v(q.x, 16, q.z))(spot(-52, 0)), fov: 50 },
  };
  G.cut(after.peddler); pa.lean = 1;
  await say('Dusk is coming in, boy. Best you were home before the dark settles on this road.');
  G.cut(after.jack); await J(5, 'Dusk! Then I haven’t a moment to lose.');
  await J(5, close);
  await J(5, 'Home, and into the garden. Tonight!');
  // He sets off for home at a run, the beans clutched in his fist.
  G.cut(after.wide); pa.lean = 0;
  { const away = v(-t.x, 0, -t.z), ang = Math.atan2(away.x, away.z); ja.lead = false; ja.hand = 0;
    for (let i = 0; i < 12; i++) { jack.root.rotation.y = turn(jack.root.rotation.y, ang, 0.35); await G.wait(0.04); }
    ja.speed = 40; for (let i = 0; i < 90; i++) { jack.root.position.addScaledVector(away, 1.1); ja.phase += 0.55; await G.wait(0.04); } ja.speed = 0; }
  await G.wait(0.6);
  A && A.stopMusic(2.5); await G.fade(true, 2.2); A && A.ambience({ wind: 0, birds: 0, fire: 0 });
  G.updaters = G.updaters.filter(u => u !== cullTick);
  await G.wait(0.8);
  W.paintJack(0);
  res.choices = choices; G.mode = 'end'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine();
}
function paintAll(W, e) { W.paintJack(e); }

root.Road = { build, run, makeRoad, WAY, world: () => WORLD };
})(typeof window !== 'undefined' ? window : globalThis);
