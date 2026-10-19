// Polygon — the world the figures stand in. Tiling textures painted in code (grass, flagstones, a rug, soil and rock, leaves, bark), a round floating island with an earthen underside for the
// sandbox, a wooden deck for the correction scene, and toon trees, bushes and rocks to dress the island. Everything is the house toon material, inked by Look.decorate.
//   const island = World.island({ radius: 270 });  scene.add(island.group);
//   World.scatter(island.group, { seed: 4, inner: 110, outer: 255, trees: 26, bushes: 40, rocks: 18, keep: [{ x: 0, z: 70, r: 40 }] });
//   const deck = World.deck({ radius: 78 });  scene.add(deck);
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly, K = P.Paint, Look = root.Look, V3 = THREE.Vector3;
const World = root.World = {};
const cache = {}, memo = (k, f) => cache[k] || (cache[k] = f());

function canvasTex(S, draw, o) {
  o = o || {}; const c = document.createElement('canvas'); c.width = S; c.height = o.h || S; const x = c.getContext('2d'); draw(x, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = o.clampV ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; return t;
}
// A mark drawn at (x, y) and again wherever it crosses an edge of the tile, so the tile has no seam.
const tiled = (S, x, y, reach, fn) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { const px = x + dx, py = y + dy; if (px + reach < 0 || px - reach > S || py + reach < 0 || py - reach > S) continue; fn(px, py); } };

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Textures
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Meadow: two greens in broad soft patches, tufts of grass, a scatter of small flowers. 32 units to a tile.
World.grassTex = () => memo('grass', () => canvasTex(256, (c, S) => {
  const r = K.rnd(5);
  c.fillStyle = '#85d05a'; c.fillRect(0, 0, S, S);
  for (let i = 0; i < 18; i++) { const x = r() * S, y = r() * S, rad = 24 + r() * 44, ry = rad * (0.55 + r() * 0.3); tiled(S, x, y, rad, (px, py) => K.blob(c, px, py, rad, ry, '#62b448', 0.34, 0.2)); }
  for (let i = 0; i < 12; i++) { const x = r() * S, y = r() * S, rad = 18 + r() * 34, ry = rad * 0.6; tiled(S, x, y, rad, (px, py) => K.blob(c, px, py, rad, ry, '#b4ec78', 0.32, 0.2)); }
  for (let i = 0; i < 110; i++) {
    const x = r() * S, y = r() * S, col = r() < 0.55 ? '#58a642' : '#c2f088', h = 5 + r() * 6;
    tiled(S, x, y, 12, (px, py) => { c.strokeStyle = col; c.lineWidth = 1.7; c.lineCap = 'round'; c.beginPath(); for (const a of [-0.5, 0, 0.55]) { c.moveTo(px, py); c.quadraticCurveTo(px + a * 4, py - h * 0.6, px + a * h * 0.9, py - h); } c.stroke(); });
  }
  const petals = ['#ffffff', '#ffe36a', '#ffb2c8', '#c4b4ff'];
  for (let i = 0; i < 14; i++) { const x = r() * S, y = r() * S, col = petals[i % 4]; tiled(S, x, y, 6, (px, py) => { for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; K.ellipse(c, px + Math.cos(a) * 2.2, py + Math.sin(a) * 2.2, 2, 1.3, col, a); } K.ellipse(c, px, py, 1.4, 1.4, '#f4b83c'); }); }
}));
// Cut stone laid in courses, light mortar, a little moss at the foot of each block. 16 units to a tile when laid on a prop with boxUV.
World.stoneTex = () => memo('stone', () => canvasTex(128, (c, S) => {
  const r = K.rnd(9), rows = 4, h = S / rows, base = '#cfc8b6'; c.fillStyle = '#8d867a'; c.fillRect(0, 0, S, S);
  const tones = []; for (let j = 0; j < rows; j++) tones.push([K.mix(base, r() < 0.5 ? '#e8e3d2' : '#b5ae9c', 0.35 + r() * 0.4), K.mix(base, r() < 0.5 ? '#e8e3d2' : '#b5ae9c', 0.35 + r() * 0.4)]);
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * S / 4;
    for (let i = -1; i < 3; i++) {
      const x = i * S / 2 + off, w = S / 2, t = tones[j][((i % 2) + 2) % 2];
      c.fillStyle = t; K.rrect(c, x + 2.5, j * h + 2.5, w - 5, h - 5, 6); c.fill();
      c.fillStyle = K.rgba('#ffffff', 0.28); K.rrect(c, x + 4, j * h + 4, w - 8, 5, 3); c.fill(); c.fillStyle = K.rgba('#5a5348', 0.22); K.rrect(c, x + 4, j * h + h - 10, w - 8, 6, 3); c.fill();
      K.blob(c, x + w * (0.3 + 0.4 * ((i * 7 + j * 3) % 5) / 4), j * h + h - 3, 14, 6, '#8db46a', 0.3, 0.2);
    }
  }
  for (let i = 0; i < 40; i++) K.ellipse(c, r() * S, r() * S, 0.9, 0.7, K.rgba(r() < 0.5 ? '#6a6458' : '#f4efe0', 0.35));
}));
// The side of the island: grass lip, then soil with pebbles, then grey-violet rock in streaks. v runs down from the lip.
World.soilTex = () => memo('soil', () => canvasTex(256, (c, S) => {
  const r = K.rnd(12);
  c.fillStyle = K.grad(c, 0, 0, 0, S, [[0, '#7b4f31'], [0.3, '#8f5f3b'], [0.55, '#78634f'], [1, '#5d5568']]); c.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) { const x = r() * S, y = S * (0.12 + r() * 0.88), len = 14 + r() * 56, col = r() < 0.5 ? '#3f2a1c' : '#c9a07a'; tiled(S, x, y, len, (px, py) => { c.strokeStyle = K.rgba(y > S * 0.55 ? (r() < 0.5 ? '#3c3646' : '#9b94ab') : col, 0.28); c.lineWidth = 1.4 + (i % 3); c.lineCap = 'round'; c.beginPath(); c.moveTo(px, py); c.lineTo(px + (i % 5 - 2), py + len); c.stroke(); }); }
  for (let i = 0; i < 46; i++) { const x = r() * S, y = S * (0.12 + r() * 0.42), rad = 2 + r() * 4; tiled(S, x, y, rad, (px, py) => { K.ellipse(c, px, py, rad, rad * 0.75, K.rgba('#c9a27a', 0.7)); K.ellipse(c, px - 0.8, py - 0.8, rad * 0.45, rad * 0.35, K.rgba('#f3dcbc', 0.6)); }); }
  for (let i = 0; i < 22; i++) { const x = r() * S, y = S * (0.56 + r() * 0.4), rad = 5 + r() * 9; tiled(S, x, y, rad, (px, py) => K.blob(c, px, py, rad, rad * 0.7, i % 2 ? '#8b84a0' : '#47404f', 0.35, 0.3)); }
  c.fillStyle = '#7ccb55'; c.beginPath(); c.moveTo(0, 0); c.lineTo(S, 0); for (let x = S; x >= 0; x -= S / 16) { c.lineTo(x, S * 0.07 + (x / (S / 16) % 2 ? 7 : 2)); c.quadraticCurveTo(x - S / 32, S * 0.12, x - S / 16, S * 0.075); } c.closePath(); c.fill();
  c.fillStyle = K.rgba('#3f7d33', 0.4); c.fillRect(0, 0, S, 4);
}));
World.barkTex = () => memo('bark', () => canvasTex(64, (c, S) => {
  const r = K.rnd(3); c.fillStyle = K.grad(c, 0, 0, S, 0, [[0, '#8a5b36'], [0.5, '#a8744a'], [1, '#8a5b36']]); c.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) { const x = r() * S, y = r() * S, len = 10 + r() * 30; tiled(S, x, y, len, (px, py) => { c.strokeStyle = K.rgba(r() < 0.5 ? '#4a2f1c' : '#d4a070', 0.35); c.lineWidth = 1 + r() * 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(px, py); c.lineTo(px + (r() - 0.5) * 3, py + len); c.stroke(); }); }
}));
World.leafTex = () => memo('leaf', () => canvasTex(128, (c, S) => {
  const r = K.rnd(8); c.fillStyle = '#62bd4c'; c.fillRect(0, 0, S, S);
  for (let i = 0; i < 22; i++) { const x = r() * S, y = r() * S, rad = 10 + r() * 20, dark = i % 3 === 0; tiled(S, x, y, rad, (px, py) => K.blob(c, px, py, rad, rad * 0.8, dark ? '#46a03e' : '#86d65c', 0.5, 0.35)); }
  for (let i = 0; i < 60; i++) { const x = r() * S, y = r() * S; tiled(S, x, y, 5, (px, py) => { K.ellipse(c, px, py, 3.2, 1.7, K.rgba(r() < 0.5 ? '#b6ef8a' : '#3e9238', 0.55), r() * 3); }); }
}));
World.rockTex = () => memo('rock', () => canvasTex(64, (c, S) => {
  const r = K.rnd(6); c.fillStyle = '#aca79d'; c.fillRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) { const x = r() * S, y = r() * S, rad = 3 + r() * 8; tiled(S, x, y, rad, (px, py) => K.blob(c, px, py, rad, rad * 0.7, r() < 0.5 ? '#6f6a62' : '#e4dfd2', 0.3, 0.3)); }
  for (let i = 0; i < 6; i++) { const x = r() * S, y = r() * S; tiled(S, x, y, 8, (px, py) => K.blob(c, px, py, 7, 4, '#8db46a', 0.35, 0.2)); }
}));
// A woven rug, 3:2 by default: deep red field, a lattice of cream and blue diamonds, bands round the edge, fringe at the ends.
World.rugTex = () => memo('rug', () => canvasTex(512, (c, S, H) => {
  const red = '#a63f48', cream = '#f1e2bb', blue = '#34487f', gold = '#e2b44a', r = K.rnd(2);
  c.fillStyle = cream; c.fillRect(0, 0, S, H);
  const fr = 26; c.strokeStyle = K.rgba('#d8c79c', 1); c.lineWidth = 3; for (let x = 6; x < S; x += 9) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (r() - 0.5) * 3, fr); c.moveTo(x, H - fr); c.lineTo(x + (r() - 0.5) * 3, H); c.stroke(); }
  const x0 = 0, y0 = fr, w = S, h = H - 2 * fr; c.fillStyle = red; c.fillRect(x0, y0, w, h);
  const band = (inset, wd, col) => { c.strokeStyle = col; c.lineWidth = wd; c.strokeRect(x0 + inset + wd / 2, y0 + inset + wd / 2, w - 2 * inset - wd, h - 2 * inset - wd); };
  band(0, 14, blue); band(16, 7, cream); band(26, 5, gold);
  const f0 = 40, fw = w - 2 * f0, fh = h - 2 * f0, cell = 44; c.save(); c.beginPath(); c.rect(x0 + f0, y0 + f0, fw, fh); c.clip();
  for (let j = -1; j * cell < fh + cell; j++) for (let i = -1; i * cell < fw + cell; i++) { const cx = x0 + f0 + i * cell + (j % 2 ? cell / 2 : 0), cy = y0 + f0 + j * cell * 0.5 + cell / 4;
    c.fillStyle = (i + j) % 2 ? blue : cream; c.beginPath(); c.moveTo(cx, cy - cell * 0.32); c.lineTo(cx + cell * 0.28, cy); c.lineTo(cx, cy + cell * 0.32); c.lineTo(cx - cell * 0.28, cy); c.closePath(); c.fill();
    c.fillStyle = gold; c.beginPath(); c.arc(cx, cy, 3.2, 0, 6.283); c.fill(); }
  c.restore(); K.blob(c, S / 2, H / 2, S * 0.34, H * 0.34, '#a63f48', 0.7, 0.35);
  c.strokeStyle = K.rgba('#000000', 0.06); c.lineWidth = 1; for (let y = 0; y < H; y += 3) { c.beginPath(); c.moveTo(0, y); c.lineTo(S, y); c.stroke(); }
}, { h: 340, clampV: true }));

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Shapes
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const noise = (a, b, seed) => { const s = Math.sin(a * 12.9898 + b * 78.233 + seed * 37.719) * 43758.5453; return s - Math.floor(s); };
// A flat disc facing up, built as rings so its vertex colours can carry a slow tint (broad patches of light and dark that no tile repeats), its texture laid by world position (tile units to a repeat).
function disc(radius, mat, tile, rings, tint) {
  rings = rings || 40; const segs = 96, n = 1 + rings * segs, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3), idx = [];
  const put = (i, x, z) => { pos[i * 3] = x; pos[i * 3 + 2] = z; nor[i * 3 + 1] = 1; uv[i * 2] = x / tile; uv[i * 2 + 1] = -z / tile; const k = tint ? 1 + tint * (Math.sin(x * 0.021 + 1.3) * Math.sin(z * 0.017 + 0.4) * 0.6 + Math.sin(x * 0.047 - z * 0.039 + 2.0) * 0.4) : 1; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; };
  put(0, 0, 0);
  for (let i = 1; i <= rings; i++) for (let j = 0; j < segs; j++) { const a = j / segs * Math.PI * 2, r = radius * i / rings; put(1 + (i - 1) * segs + j, Math.cos(a) * r, Math.sin(a) * r); }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
  for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) { const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + (j + 1) % segs, c = a + segs, d = b + segs; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
  const I = g.index.array; if ((pos[I[1] * 3] - pos[I[0] * 3]) * (pos[I[2] * 3 + 2] - pos[I[0] * 3 + 2]) - (pos[I[1] * 3 + 2] - pos[I[0] * 3 + 2]) * (pos[I[2] * 3] - pos[I[0] * 3]) > 0) for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }          // (faces up)
  mat.vertexColors = true; const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.userData.noOutline = true; return m;
}
// A solid of revolution from a profile [[r, y], ...] (given from the top down), its surface pushed about by `lumps` (a fraction of the radius) so it is not a perfect cone. Faces out; v runs
// 1 at the top to 0 at the bottom (so a texture's top row is the top of the solid).
function lathe(profile, segs, lumps, seed) {
  const g = new THREE.LatheGeometry(profile.slice().reverse().map(q => new THREE.Vector2(q[0], q[1])), segs), p = g.attributes.position, sd = seed || 1;
  if (lumps) for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), depth = Math.min(1, -y / 18);
    const k = 1 + lumps * depth * (Math.sin(3 * a + sd) * 0.5 + Math.sin(7 * a + 2 * sd + y / 40) * 0.3 + Math.sin(5 * a - sd + y / 14) * 0.2), dy = depth * (Math.sin(4 * a + sd * 3) * 1.4 + Math.sin(9 * a + y / 7) * 0.8);
    p.setXYZ(i, x * k, y + dy, z * k);
  }
  const I = g.index.array, a0 = new V3(), b0 = new V3(), c0 = new V3(); let out = 0, tot = 0;                    // (turn the faces outward if the profile's order made them face in)
  for (let t = 0; t < I.length; t += 3) { a0.fromBufferAttribute(p, I[t]); b0.fromBufferAttribute(p, I[t + 1]); c0.fromBufferAttribute(p, I[t + 2]); const n = b0.clone().sub(a0).cross(c0.clone().sub(a0)); if (n.lengthSq() < 1e-12) continue; tot++; if (n.x * a0.x + n.z * a0.z > 0) out++; }
  if (tot && out < tot / 2) { for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; } g.index.needsUpdate = true; }
  g.computeVertexNormals(); g.userData.smoothNormals = true; return g;
}

// The island: a round meadow that ends in a lip of grass and falls away in soil, then rock, to a point. { group, top, radius }.
World.island = function (o) {
  o = Object.assign({ radius: 270, depth: 120, seed: 3 }, o || {}); const R = o.radius, d = o.depth, g = new THREE.Group();
  const top = disc(R, Look.toon({ map: World.grassTex() }), 40, 48, 0.07); g.add(top);
  const prof = [[R, 0], [R * 1.0, -1.5], [R * 0.99, -6], [R * 0.93, -22], [R * 0.78, -48], [R * 0.55, -72], [R * 0.3, -d * 0.88], [R * 0.06, -d]];
  const side = new THREE.Mesh(lathe(prof, 72, 0.06, o.seed), Look.toon({ map: World.soilTex(), side: THREE.DoubleSide })); side.receiveShadow = true; g.add(side);
  const uv = side.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8, uv.getY(i));
  Look.decorate(side); g.userData.island = true;
  return { group: g, top, radius: R };
};

// The deck: a round wooden stage with a rounded rim and a tapering underside; its top at y = 0.
World.deck = function (o) {
  o = Object.assign({ radius: 78, y: 0 }, o || {}); const R = o.radius, g = new THREE.Group(), wood = P.woodTexture('#d3a068', { seed: 31, boards: 5 });
  const top = disc(R, Look.toon({ map: wood }), 28, 24, 0.03); g.add(top);
  const prof = [[R, 0], [R + 0.7, -0.5], [R + 1.0, -2.2], [R + 0.8, -5.0], [R * 0.99, -6.2], [R * 0.9, -7.4], [R * 0.62, -13], [R * 0.3, -21], [R * 0.05, -26]];
  const rim = new THREE.Mesh(lathe(prof, 96), Look.toon({ map: P.woodTexture('#a8744a', { seed: 33, knot: false }), side: THREE.DoubleSide })); rim.receiveShadow = true; rim.castShadow = false; g.add(rim);
  const uv = rim.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 14, uv.getY(i) * 3);
  Look.decorate(rim); g.position.y = o.y; return g;
};
// A rug, w x d, lying just above the floor (y), long side along x.
World.rug = function (w, d, y) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, Look.toon({ map: World.rugTex() })); m.position.y = y; m.receiveShadow = true; m.userData.noOutline = true; return m;
};

// A rounded-box stand-in for a block: w x h x d, textured by world position (tile units to a repeat).
World.block = function (w, h, d, mat, o) {
  o = o || {}; const g = P.softBox(w, h, d, o.r === undefined ? Math.min(2.2, Math.min(w, h, d) * 0.2) : o.r, o.steps || 2); P.boxUV(g, o.tile || 16);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Trees, bushes and rocks
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const leafMat = () => memo('leafMat', () => Look.toon({ map: World.leafTex(), vertexColors: true }));
const barkMat = () => memo('barkMat', () => Look.toon({ map: World.barkTex(), vertexColors: true }));
const rockMat = () => memo('rockMat', () => Look.toon({ map: World.rockTex() }));
// shade a ball's vertices darker toward the bottom (a painted ambient occlusion), so a clump reads as round
function shadeBall(geo, ry, lo, hi) { const p = geo.attributes.position, c = geo.attributes.color; for (let i = 0; i < p.count; i++) { const k = lo + (hi - lo) * (p.getY(i) / ry * 0.5 + 0.5); c.setXYZ(i, k, k, k); } return geo; }
function clump(rx, ry, rz, x, y, z, seed) {
  const g = P.ball(rx, ry, rz, 16, 10, (i, k, px, py, pz) => [k / 16 * 2 + seed * 0.37, i / 10 * 1.5 + seed * 0.21]); shadeBall(g, ry, 0.72, 1.12); return P.place(g, x, y, z);
}
World.tree = function (seed, scale) {
  const r = K.rnd(seed * 7919 + 13), s = (scale || 1) * (0.85 + r() * 0.5), g = new THREE.Group();
  const h = 34 + r() * 18, lean = (r() - 0.5) * 3;
  const trunk = P.loft({ sides: 12, smooth: 1, rings: [P.R(0, 3.6, 3.6), P.R(4, 2.7, 2.7), P.R(h * 0.5, 2.0, 2.0, 0, 1, lean * 0.4), P.R(h, 1.5, 1.5, 0, 1, lean)], cap: { top: { h: 0.001, steps: 1 }, bottom: { h: 0.001, steps: 1 } } });
  const tg = trunk.patch(0, 12, (i, k, x, y) => [k / 12 * 2, y / 16]); g.add(new THREE.Mesh(tg, barkMat()));
  const parts = [clump(17, 13, 17, lean, h + 8, 0, seed), clump(12, 10, 12, lean - 11, h + 1, 3, seed + 1), clump(12, 10, 12, lean + 11, h + 2, -3, seed + 2), clump(10, 9, 10, lean + 2, h + 17, 1, seed + 3)];
  g.add(new THREE.Mesh(P.merge(parts), leafMat()));
  g.scale.setScalar(s); g.rotation.y = r() * 6.283; return g;
};
World.bush = function (seed, scale) {
  const r = K.rnd(seed * 104729 + 7), s = (scale || 1) * (0.8 + r() * 0.6), g = new THREE.Group();
  g.add(new THREE.Mesh(P.merge([clump(7, 5.2, 7, 0, 4.4, 0, seed), clump(5.2, 4.2, 5.2, -5.4, 3.2, 2, seed + 1), clump(5, 4, 5, 5.2, 3.0, -1.5, seed + 2)]), leafMat()));
  g.scale.setScalar(s); g.rotation.y = r() * 6.283; return g;
};
World.rock = function (seed, scale) {
  const r = K.rnd(seed * 15485863 + 3), s = (scale || 1) * (0.8 + r() * 1.4), geo = new THREE.IcosahedronGeometry(5, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.78 + noise(Math.round(p.getX(i) * 9), Math.round(p.getZ(i) * 9) + Math.round(p.getY(i) * 5), seed) * 0.5; p.setXYZ(i, p.getX(i) * k * 1.2, p.getY(i) * k * 0.78, p.getZ(i) * k); }
  const flat = geo.index ? geo.toNonIndexed() : geo; flat.computeVertexNormals(); const pp = flat.attributes.position, uv = new Float32Array(pp.count * 2); for (let i = 0; i < pp.count; i++) { uv[i * 2] = (pp.getX(i) + pp.getY(i)) / 14; uv[i * 2 + 1] = (pp.getZ(i) + pp.getY(i)) / 14; } flat.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const m = new THREE.Mesh(flat, rockMat()); m.position.y = 1.5 * s; m.scale.setScalar(s); m.rotation.y = r() * 6.283; const g = new THREE.Group(); g.add(m); return g;
};
// Scatter trees, bushes and rocks over a ring of the island (o.inner..o.outer from its centre), keeping clear of the circles in o.keep ({ x, z, r }) and of each other. Inked and shaded.
// Each thing carries userData.fade = { cy, r }, a sphere a camera should not be inside (see World.clearView). Returns what it placed: [{ kind, x, z, r, object }].
World.scatter = function (parent, o) {
  o = Object.assign({ seed: 4, inner: 100, outer: 250, trees: 20, bushes: 30, rocks: 14, keep: [] }, o || {}); const r = K.rnd(o.seed), placed = [];
  const spot = clearance => { for (let tries = 0; tries < 60; tries++) { const a = r() * Math.PI * 2, d = Math.sqrt(o.inner * o.inner + r() * (o.outer * o.outer - o.inner * o.inner)), x = Math.cos(a) * d, z = Math.sin(a) * d; if (o.keep.some(k => Math.hypot(x - k.x, z - k.z) < k.r + clearance) || placed.some(q => Math.hypot(x - q.x, z - q.z) < q.r + clearance)) continue; return { x, z }; } return null; };
  const add = (kind, n, make, clear) => { for (let i = 0; i < n; i++) { const p = spot(clear); if (!p) continue; const m = make(i), k = m.scale.x || 1; m.position.set(p.x, 0, p.z); m.userData.fade = { cy: (kind === 'tree' ? 48 : kind === 'bush' ? 4 : 3) * k, r: (kind === 'tree' ? 28 : kind === 'bush' ? 11 : 9) * k }; Look.decorate(m); Look.shade(m); parent.add(m); placed.push({ kind, x: p.x, z: p.z, r: clear, object: m }); } };
  add('tree', o.trees, i => World.tree(o.seed * 100 + i), 16); add('bush', o.bushes, i => World.bush(o.seed * 100 + i), 8); add('rock', o.rocks, i => World.rock(o.seed * 100 + i), 6);
  return placed;
};
// Hide whatever of `things` (the objects scatter placed) the camera is inside or right beside, so it is never looking out of the middle of a bush.
World.clearView = function (things, cam) { for (const m of things) { const f = m.userData.fade; m.visible = Math.hypot(cam.x - m.position.x, cam.y - f.cy, cam.z - m.position.z) > f.r; } };
})(typeof window !== 'undefined' ? window : globalThis);
