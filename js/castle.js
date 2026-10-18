// Climbing Toward Consequence — the castle within, at full (100%) model scale. Gerda's home: mostly one storey (the tower's single room above is not built yet), ceilings twice a model's height (86).
//   The entrance hall is the heart of it. Off it, to the west, the quiet grand wing (two corridors, the music hall, the library, the old playroom); to the east, Gerda's warm wing (the kitchen, the parlour,
//   a narrow hallway, the bathing room, the roost), and out of the kitchen the walled garden. Free-standing pieces are placed by CastleLayout (js/castle-layout.js, written by room-editor.html?room=castle).
// Exposes Castle.interior() with the same shape as Farm.interior(): { scene, room, ceiling, items, place, layout, update, bounds, views }.
(function (root) {
'use strict';
const THREE = root.THREE, F = root.Farm, V3 = THREE.Vector3;
const H = 86, HH = 115;                                                                    // twice a full-size Jack (who stands about 43 here: furniture and doorways are as in the cottage, he is 1.4 times the size the cottage's own model has)
const box = F.box, plain = F.plain, unlit = F.unlit;
const rng = F.rng(4141);

// ── Surfaces ──
const canvasTex = (w, h, paint, rx, ry) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry); return t; };
const TEX = {};
const surface = (name, make, color) => { if (!TEX[name]) TEX[name] = make(); return new THREE.MeshLambertMaterial({ map: TEX[name], color: color || 0xffffff }); };
const speck = (g, w, h, cols, n, s) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(rng() * cols.length)]; g.fillRect(Math.floor(rng() * w), Math.floor(rng() * h), s || 2, s || 2); } };
const floorHall = () => surface('hall', () => canvasTex(128, 128, (g, w, h) => {                       // cream stone, veined with silver
  g.fillStyle = '#efe6d0'; g.fillRect(0, 0, w, h); speck(g, w, h, ['#f4ecd8', '#e6dcc2', '#ebe1c8'], 500);
  for (let v = 0; v < 9; v++) { let x = rng() * w, y = rng() * h; g.fillStyle = rng() < 0.5 ? '#c4ccd8' : '#dde2ea'; for (let i = 0; i < 40; i++) { g.fillRect(Math.floor(x) % w, Math.floor(y) % h, 2, 2); x += (rng() - 0.35) * 4; y += (rng() - 0.5) * 3 + 1; } }
  g.fillStyle = '#d6cdb4'; for (let i = 0; i < w; i += 32) { g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } }, 44, 44));
// flagstones, as at 100% scale: each stone 44 across (a full-size Jack, shoulders about 20, stands inside one with room to spare); tiles of four by four, laid in a running bond, no two quite the same colour
const flagBase = (() => { let t; return () => t || (t = canvasTex(256, 256, (g, w, h) => {
  const tones = ['#e0d6bf', '#d6cbb0', '#e6dcc6', '#cfc4a8', '#dbd0b6', '#e3d9c2'], rr = F.rng(2718); g.fillStyle = '#9a8f78'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 64, y = r * 64; g.fillStyle = tones[Math.floor(rr() * tones.length)]; g.fillRect(x + 3, y + 3, 58, 58);
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x + 3, y + 3, 58, 2); g.fillRect(x + 3, y + 3, 2, 58); g.fillStyle = 'rgba(70,60,45,0.22)'; g.fillRect(x + 3, y + 59, 58, 2); g.fillRect(x + 59, y + 3, 2, 58);   // (a worn edge, lit from the top left)
    for (let i = 0; i < 40; i++) { g.fillStyle = rr() < 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(90,80,60,0.14)'; g.fillRect(x + 6 + Math.floor(rr() * 50), y + 6 + Math.floor(rr() * 50), 2, 2); }
    if (rr() < 0.3) { g.fillStyle = 'rgba(110,100,80,0.4)'; let cx = x + 12 + rr() * 38, cy = y + 6; for (let k = 0; k < 15; k++) { g.fillRect(Math.floor(cx), Math.floor(cy), 1, 2); cx += (rr() - 0.5) * 3; cy += 3.4; } } } }, 1, 1)); })();
const flagFloor = (w, d, col) => { const t = flagBase().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16 / 176, 16 / 176); return new THREE.MeshLambertMaterial({ map: t, color: col || 0xffffff }); };
const wallBone = (rx, ry) => { const m = surface('bone', () => canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ddd5bf'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = '#bdb59d'; g.fillRect(0, y, w, 2); for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) g.fillRect(x, y, 2, 16); } speck(g, w, h, ['#e8e1cc', '#d0c8b0'], 140); })); return m; };
const stoneFloor = (c) => surface('flag', () => canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#cfc6b0'; g.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 32) { g.fillStyle = '#a99f88'; g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } speck(g, w, h, ['#d8cfba', '#c2b9a2'], 120); }, 60, 60), c);
const woodFloor = (c) => surface('wood', () => canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#9a7a52'; g.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 8) { g.fillStyle = '#7e603c'; g.fillRect(0, i, w, 1); for (let j = (i / 8) % 2 ? 0 : 20; j < w; j += 40) g.fillRect(j, i, 1, 8); } speck(g, w, h, ['#a98a60', '#8c6c46'], 160); }, 60, 60), c);
const tileFloor = () => surface('tile', () => canvasTex(32, 32, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#c6dde4' : '#9fc2cf'; g.fillRect(x * 8, y * 8, 8, 8); } g.fillStyle = '#7fa4b2'; for (let i = 0; i < w; i += 8) { g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } }, 70, 70));
const strawFloor = () => surface('straw', () => canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#d6b866'; g.fillRect(0, 0, w, h); speck(g, w, h, ['#e8cf80', '#bf9f4e', '#f0dc98'], 600, 2); }, 40, 40));
const soilFloor = () => surface('soil', () => canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#6a4e36'; g.fillRect(0, 0, w, h); speck(g, w, h, ['#5a3f2a', '#7a5c40', '#4f7a3a'], 500); }, 60, 60));
const rugTex = () => surface('rug', () => canvasTex(64, 16, (g, w, h) => { g.fillStyle = '#5a2f78'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9a23c'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2); g.fillRect(0, 4, w, 1); g.fillRect(0, h - 5, w, 1); for (let x = 2; x < w; x += 8) { g.fillStyle = '#c9a23c'; g.fillRect(x + 2, 6, 3, 4); g.fillStyle = '#7e4aa6'; g.fillRect(x + 3, 7, 1, 2); } }, 12, 1));
const tapTex = (a, b, c) => canvasTex(16, 32, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; for (let y = 4; y < h; y += 8) { g.fillRect(2, y, w - 4, 3); } g.fillStyle = c; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h); });
const flat = (tex, w, h, d, x, y, z, parent) => box(w, h, d, new THREE.MeshLambertMaterial({ map: tex }), x, y, z, parent);

function interior() {
  const scene = new THREE.Scene(), room = new THREE.Group(); scene.add(room); scene.background = new THREE.Color(0xa8d2f2);
  const ceil = new THREE.Group(); room.add(ceil);
  let LAY = root.CastleLayout || {};
  try { if (root.location && /[?&]layout=draft/.test(root.location.search)) LAY = JSON.parse(root.localStorage.getItem('castle-consequence:castlelayout:draft')) || LAY; } catch (e) { /* no draft */ }
  const items = {}, anim = [], flames = [];
  const movable = (key, label, g, def) => { items[key] = { g, label, def, y: g.position.y }; g.userData.movable = key; room.add(g); place(key, LAY[key] || def); return g; };
  const place = (key, o) => { const it = items[key], g = it.g; g.position.set(o.x, it.y, o.z); g.rotation.y = o.ry || 0; };
  const at = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
  const B = (w, h, d, color, x, y, z, parent) => box(w, h, d, plain(color), x, y, z, parent || room);
  const boneM = wallBone(), plasterM = surface('plaster', () => canvasTex(32, 32, (g, w, h) => { g.fillStyle = '#e8d3ac'; g.fillRect(0, 0, w, h); speck(g, w, h, ['#efdcb8', '#dcc79e'], 120); }, 1, 1));
  const warmM = plasterM;

  // ── Lighting: a warm daylight inside, and a few lamps. ──
  const hemi = new THREE.HemisphereLight(0xfff3e0, 0x8a7a64, 0.62); scene.add(hemi); const lights = { hemi };
  const lamp = (x, y, z, c, i, d) => { const l = new THREE.PointLight(c, i, d, 1.4); l.position.set(x, y, z); scene.add(l); (lights.all = lights.all || []).push(l); return l; };
  lamp(0, 46, 20, 0xfff0d0, 0.95, 260); lamp(0, 24, -96, 0xffa860, 0.7, 150); lamp(-195, 44, -30, 0xffe6c0, 0.7, 190); lamp(-318, 44, -180, 0xffe6c0, 0.65, 230); lamp(-215, 44, -105, 0xdde8ff, 0.6, 150);
  lamp(-215, 44, -205, 0xfff0c0, 0.9, 150); lamp(-280, 40, -390, 0xe8dcc8, 0.55, 140); lamp(170, 40, -30, 0xffe0b0, 0.9, 190); lamp(290, 44, -350, 0xfff0c0, 0.95, 150); lights.bathLamp = lamp(300, 40, -170, 0xd8f0f8, 0.55, 140); lamp(166, 80, -210, 0xfff6e0, 0.8, 300);

  // ── The shell: a floor, walls with openings, and a ceiling, room by room. ──
  const cloud = box(2600, 4, 2600, plain('#f4f0f4'), -20, -9, -170, scene);
  const rooms = [];       // (every roofed floor: the camera is kept inside the one he is in)
  const slab = (x0, z0, x1, z1, floorM, ceilM, noCeil, ch) => { const Hc = ch || H; if (!noCeil) rooms.push({ x0, z0, x1, z1, h: Hc }); box(x1 - x0, 2, z1 - z0, floorM, (x0 + x1) / 2, -1, (z0 + z1) / 2, room); if (!noCeil) { box(x1 - x0 + 4, 3, z1 - z0 + 4, ceilM || boneM, (x0 + x1) / 2, Hc + 1.5, (z0 + z1) / 2, ceil); const n = Math.max(1, Math.round((z1 - z0) / 36)); for (let i = 0; i < n; i++) { const zz = z0 + (i + 0.5) * (z1 - z0) / n; box(x1 - x0, 7, 6.4, plain('#4a3626'), (x0 + x1) / 2, Hc - 3.5, zz, ceil); box(x1 - x0, 2, 9, plain('#3a2a20'), (x0 + x1) / 2, Hc - 7.5, zz, ceil); } } };
  // ops: [from, to, bottom, top] along the wall; the wall is a run along x (axis 'z', at z = fixed) or along z (axis 'x', at x = fixed).
  const doors = [], hallLeaves = [];
  const R2 = F.rng(909);                                                             // (its own dice, so the detail never shifts the rest)
  const wall = (axis, fixed, a0, a1, m, ops, h, th) => {
    h = h || H; th = th || 4; const seg = (c0, c1, y0, y1) => { if (c1 - c0 < 0.05 || y1 - y0 < 0.05) return; if (axis === 'z') box(c1 - c0, y1 - y0, th, m, (c0 + c1) / 2, (y0 + y1) / 2, fixed, room); else box(th, y1 - y0, c1 - c0, m, fixed, (y0 + y1) / 2, (c0 + c1) / 2, room); };
    const sorted = (ops || []).slice().sort((p, q) => p[0] - q[0]); let cur = a0; for (const o of sorted) { seg(cur, o[0], 0, h); seg(o[0], o[1], 0, o[2]); seg(o[0], o[1], o[3], h); cur = o[1]; } seg(cur, a1, 0, h);
    // ── the dressing of the wall: skirting, wainscot, cornice, frames round the doors and windows, flaked plaster ──
    const stoneW = m === boneM, trim = stoneW ? '#a99f88' : '#6a4a2e', dado = stoneW ? '#6a4e34' : '#b89a68', dadoRail = stoneW ? '#4a3626' : '#8a6a42';
    const strip = (c0, c1, y0, y1, depth, col) => { if (c1 - c0 < 0.3) return; if (axis === 'z') box(c1 - c0, y1 - y0, depth, plain(col), (c0 + c1) / 2, (y0 + y1) / 2, fixed, room); else box(depth, y1 - y0, c1 - c0, plain(col), fixed, (y0 + y1) / 2, (c0 + c1) / 2, room); };
    const floorOps = sorted.filter(o => o[2] <= 0.5); let c = a0; const runs = [];                // the stretches of wall that reach the floor
    for (const o of floorOps) { runs.push([c, o[0]]); c = o[1]; } runs.push([c, a1]);
    for (const [r0, r1] of runs) { if (r1 - r0 < 1) continue; strip(r0, r1, 0, 5, th + 1, '#a99f88'); }
    strip(a0, a1, h - 4, h, th + 2.4, trim); strip(a0, a1, h - 5.2, h - 4, th + 1.4, dadoRail);   // the cornice, all along
    for (const o of sorted) {
      if (o[2] <= 0.5) { if (o[3] < 20) continue; strip(o[0] - 2.6, o[0] + 0.4, 0, o[3] + 3.5, th + 1.8, trim); strip(o[1] - 0.4, o[1] + 2.6, 0, o[3] + 3.5, th + 1.8, trim); strip(o[0] - 2.6, o[1] + 2.6, o[3] - 0.4, o[3] + 3.5, th + 2.4, trim); }
      else { strip(o[0] - 2, o[0] + 0.4, o[2] - 2, o[3] + 2.5, th + 1.6, trim); strip(o[1] - 0.4, o[1] + 2, o[2] - 2, o[3] + 2.5, th + 1.6, trim); strip(o[0] - 2, o[1] + 2, o[3] - 0.4, o[3] + 2.5, th + 2.4, trim); strip(o[0] - 3, o[1] + 3, o[2] - 2, o[2] + 0.4, th + 3.6, trim); }
    }
    sorted.forEach((o, i) => {                                                            // a door in every doorway (ajar, and no hindrance), double where wide
      if (o[2] > 0.5 || o[3] < 20 || (axis === 'z' && fixed === 110)) return; const w = o[1] - o[0], dbl = w > 30, hh = o[3] - 0.6, par = Math.abs(Math.round(fixed + o[0])) % 2, ang = 1.75 + (Math.abs(Math.round(o[0] * 3)) % 5) * 0.06;
      const leaf = (hx, sgn, lw, push) => { const og = new THREE.Group(); og.position.set(axis === 'z' ? hx : fixed, 0, axis === 'z' ? fixed : hx); og.rotation.y = axis === 'z' ? 0 : -Math.PI / 2; og.userData.noCollide = true; room.add(og);
        const lg = new THREE.Group(); lg.rotation.y = sgn * push * ang; og.add(lg); doors.push({ og, lg, axis, fixed, c: (o[0] + o[1]) / 2 }); const cx = sgn * lw / 2;
        box(lw - 0.4, hh, 1.8, plain('#6a4a2e'), cx, hh / 2, 0, lg); box(lw - 3, hh - 6, 0.5, plain('#7e5a38'), cx, hh / 2, 1.0, lg); box(lw - 3, hh - 6, 0.5, plain('#7e5a38'), cx, hh / 2, -1.0, lg);
        for (const y of [0.22, 0.5, 0.78]) box(lw - 0.2, 2.2, 2.4, plain('#2b2d36'), cx, hh * y, 0, lg); box(1.6, 1.6, 4, plain('#c9a23c'), sgn * (lw - 3), hh * 0.45, 0, lg); };
      if (dbl) { leaf(o[0], 1, w / 2, par ? 1 : -1); leaf(o[1], -1, w / 2, par ? 1 : -1); } else if (par) leaf(o[0], 1, w, 1); else leaf(o[1], -1, w, -1);
    });
    const flake = stoneW ? ['#cfc7b0', '#e6dfca', '#c6bea6'] : ['#d9c196', '#efdcb8', '#cdb48a']; c = a0; const solid = [];
    for (const o of sorted) { solid.push([c, o[0]]); c = o[1]; } solid.push([c, a1]);
    for (const [r0, r1] of solid) for (let k = 0; k < Math.floor((r1 - r0) / 26); k++) for (const side of [-1, 1]) { const cc = r0 + 8 + R2() * Math.max(1, r1 - r0 - 16), y = 26 + R2() * Math.max(2, h - 40), w = 3 + R2() * 7, hh = 2 + R2() * 5, col = flake[Math.floor(R2() * 3)], off = side * (th / 2 + 0.12);
      if (axis === 'z') box(w, hh, 0.3, plain(col), cc, y, fixed + off, room); else box(0.3, hh, w, plain(col), fixed + off, y, cc, room); }
  };
  const DOOR = 52;                                                                  // a doorway: up to 52
  const glass = ['#c0485a', '#d8b04a', '#6a4aa8', '#4a78c8'];
  let gi = 0;
  const windows = [];
  const window_ = (axis, fixed, c, w, y0, y1, dirSign, shaft, clear) => { windows.push({ axis, fixed, c, w, y0, y1, dirSign });                  // glass in the opening, and (if asked) a shaft of coloured light slanting down and in from it
    const col = new THREE.Color(clear ? '#bcd6f4' : glass[gi++ % 4]), g = at(axis === 'z' ? c : fixed, (y0 + y1) / 2, axis === 'z' ? fixed : c); room.add(g);
    const gm = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 });
    if (axis === 'z') box(w, y1 - y0, 0.5, gm, 0, 0, 0, g); else box(0.5, y1 - y0, w, gm, 0, 0, 0, g);
    if (clear) {                                                                      // mullions, and (in the livelier windows) curtains on a rod
      const z_ = axis === 'z', tc = plain('#5a4026'), hh = y1 - y0;
      if (z_) { box(0.9, hh, 1.1, tc, 0, 0, 0, g); box(w, 0.9, 1.1, tc, 0, 0, 0, g); } else { box(1.1, hh, 0.9, tc, 0, 0, 0, g); box(1.1, 0.9, w, tc, 0, 0, 0, g); }
      if (w >= 18 && y0 <= 40 && dirSign) {
        const col = ['#7a2a3a', '#2a4a6a', '#4a6a3a', '#6a4a2a'][Math.abs(Math.round(fixed + c)) % 4], top = y1 + 4, bot = y0 - 3, cy = (top + bot) / 2 - (y0 + y1) / 2, off = dirSign * 4.8;
        for (const sx of [-1, 1]) { const px = sx * (w / 2 + 2.6); if (z_) box(5.2, top - bot, 1.4, plain(col), px, cy, off, g); else box(1.4, top - bot, 5.2, plain(col), off, cy, px, g); }
        if (z_) box(w + 12, 0.9, 0.9, plain('#c9a23c'), 0, top - (y0 + y1) / 2 - 0.5, off, g); else box(0.9, 0.9, w + 12, plain('#c9a23c'), off, top - (y0 + y1) / 2 - 0.5, 0, g);
      }
    }
    if (shaft) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(axis === 'z' ? w * 0.8 : 6, 74, axis === 'z' ? 6 : w * 0.8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending })), sl = 0.42 * dirSign;
      if (axis === 'x') { sh.rotation.z = Math.atan(sl); sh.position.set(sl * 35, -35, 0); } else { sh.rotation.x = -Math.atan(sl); sh.position.set(0, -35, sl * 35); } g.add(sh);
    }
    return g;
  };

  // ════════ THE ENTRANCE HALL: x -90..90, z -110..110 ════════
  const hallFloor = flagFloor(180, 220); slab(-90, -110, 90, 110, hallFloor, boneM, false, HH);
    wall('z', 110, -90, 90, boneM, [[-35, 35, 0, 75], [-73, -49, 50, 76], [49, 73, 50, 76]], HH);                                     // south: the grand doors, and two high windows
  wall('z', -110, -90, 90, boneM, [[-80, -56, 50, 76], [56, 80, 50, 76]], HH);                                                    // north: the hearth wall
  wall('x', -90, -110, 110, boneM, [[-43, -8, 0, 52]], HH);                   // west: to the grand wing
  wall('x', 90, -110, 110, boneM, [[-45, -5, 0, 52]], HH);                    // east: to Gerda's wing
  window_('z', 110, -61, 24, 50, 76, -1, true); window_('z', 110, 61, 24, 50, 76, -1, true);
  window_('z', -110, -68, 24, 50, 76, 1, true); window_('z', -110, 68, 24, 50, 76, 1, true);
  // the grand doors, standing open
  for (const sx of [-1, 1]) { const lf = at(sx * 35, 0, 110); lf.rotation.y = sx * -1.3; room.add(lf); hallLeaves.push({ lf, sx }); B(35, 75, 2.6, '#3a2a20', -sx * 17.5, 37.5, 0, lf); for (const y of [18, 37, 56]) B(35, 3, 3.2, '#2b2d36', -sx * 17.5, y, 0, lf); B(2.4, 75, 3.4, '#2b2d36', -sx * 3, 37.5, 0, lf); }
  box(90, 6, 6, boneM, 0, 79, 110, room);
  // the hearth, gaping, at the far end
  { const hg = at(0, 0, -110); room.add(hg); B(92, 50, 20, '#cfc7b0', 0, 25, 10, hg); B(40, 30, 21, '#14100c', 0, 15, 10.4, hg); B(100, 5, 24, '#bdb59d', 0, 52, 10, hg); B(54, 8, 22, '#bdb59d', 0, 34, 10.2, hg); B(46, 1, 12, '#3a3a3a', 0, 0.5, 14, hg);
    for (let i = 0; i < 7; i++) { const m = B(4 + (i % 3), 10, 4, i % 2 ? '#ffb040' : '#ff7a20', -14 + i * 4.6, 6, 12, hg); flames.push({ m, base: 10, ph: i * 1.3 }); } B(36, 1.5, 3, '#4a3626', 0, 1.5, 12, hg); B(20, 3, 3, '#4a3626', 0, 3, 12.4, hg);
    B(54, HH - 50, 12, '#cfc7b0', 0, 50 + (HH - 50) / 2, 6, hg); B(62, 3, 14, '#bdb59d', 0, 51.5, 6.4, hg); B(60, 4, 14, '#bdb59d', 0, HH - 8, 6.4, hg);
    const hl = lamp(0, 14, -92, 0xff9a40, 1.1, 130); anim.push((t) => { hl.intensity = 1.0 + 0.2 * Math.sin(t * 11) * Math.sin(t * 6.1); }); }
  // the velvet chair, beside the hearth
  { const g = at(0, 0, 0); B(16, 7, 16, '#6a2860', 0, 11, 0, g); B(16, 24, 4, '#5a2052', 0, 22, -6, g); B(3, 12, 16, '#5a2052', -9.5, 14, 0, g); B(3, 12, 16, '#5a2052', 9.5, 14, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(2, 8, 2, '#3a2a20', sx * 7, 4, sz * 7, g); B(18, 1.6, 18, '#c9a23c', 0, 8, 0, g); movable('velvetChair', 'Velvet chair (by the hearth)', g, { x: 36, z: -52, ry: -0.6 }); }
  // the long table, set for one, and its chair
  { const g = at(0, 0, 0); B(76, 3, 24, '#5a3c26', 0, 24, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(4, 24, 4, '#3a2a20', sx * 32, 12, sz * 9, g); B(80, 1, 28, '#7a1f3a', 0, 25.4, 0, g);
    B(8, 0.8, 8, '#f4f0e8', -28, 26.2, 0, g); B(2.6, 5, 2.6, '#c9a23c', -22, 28, -4, g); B(0.7, 0.4, 7, '#c8ccd4', -33, 26, 0, g); B(0.7, 0.4, 7, '#c8ccd4', -23.5, 26, 0, g); B(1.6, 7, 1.6, '#e8dcc0', -14, 29, 5, g); B(2, 1, 2, '#ffd870', -14, 33, 5, g);
    B(16, 3, 16, '#6a2860', -46, 12, 0, g); B(3, 24, 16, '#5a2052', -54, 20, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(2, 10.5, 2, '#3a2a20', -46 + sx * 6.5, 5.25, sz * 6.5, g); movable('longTable', 'Long table, set for one', g, { x: 2, z: 9, ry: 0 }); }
  { const g = at(0, 0, 0); B(44, 20, 15, '#4a3626', 0, 10, 0, g); B(46, 2, 16, '#5a4630', 0, 21, 0, g); B(18, 14, 0.8, '#6a5036', -10, 10, 7.8, g); B(18, 14, 0.8, '#6a5036', 10, 10, 7.8, g); B(2, 2, 1, '#c9a23c', -2, 10, 8.4, g); B(2, 2, 1, '#c9a23c', 2, 10, 8.4, g); B(5, 9, 5, '#8a9ab0', -12, 26, 0, g); B(3, 5, 3, '#c9a23c', 8, 24, 0, g); movable('lowCupboard', 'Low cupboard (by the table)', g, { x: -58, z: -85, ry: 0 }); }
  const chandelier = (k, x, z, label, hh) => { hh = hh || H;                                                // they sway with no wind
    const g = at(x, hh, z), ex = hh - H; B(0.8, 14 + ex, 0.8, '#5a5a62', 0, -7 - ex / 2, 0, g); const ring = at(0, -16 - ex, 0); g.add(ring); B(20, 1.6, 1.6, '#c9a23c', 0, 0, 0, ring); B(1.6, 1.6, 20, '#c9a23c', 0, 0, 0, ring); B(14, 1.2, 14, '#b8923a', 0, -1, 0, ring);
    for (const [cx, cz] of [[-9, 0], [9, 0], [0, -9], [0, 9]]) { B(1.4, 4, 1.4, '#efe8d8', cx, 2.4, cz, ring); B(1.6, 1.8, 1.6, '#ffd870', cx, 5.2, cz, ring); } B(1.6, 6, 1.6, '#c9a23c', 0, -4, 0, ring);
    movable('chandelier' + k, label || 'Chandelier ' + k, g, { x, z, ry: 0 }); anim.push((t) => { g.rotation.z = 0.05 * Math.sin(t * 0.7 + k * 2); g.rotation.x = 0.04 * Math.sin(t * 0.55 + k); });
  };
  chandelier(1, -50, 70, 'Chandelier 1', HH); chandelier(2, 0, 10, 'Chandelier 2', HH); chandelier(3, 40, -50, 'Chandelier 3', HH);
  // tapestries, hanging still
  const tapestry = (axis, fixed, c, y, w, h, tex, ph) => { const g = at(axis === 'z' ? c : fixed, y + h, axis === 'z' ? fixed : c); room.add(g); flat(tex, axis === 'z' ? w : 0.8, h, axis === 'z' ? 0.8 : w, 0, -h / 2, 0, g); return g; };
  const T = [tapTex('#7a1f3a', '#c9a23c', '#3a0f1c'), tapTex('#1f3a7a', '#d8d4c0', '#0f1c3a'), tapTex('#2f6a3a', '#c9a23c', '#173a20'), tapTex('#5a2f78', '#d8b04a', '#2a1238')];
  tapestry('x', -87.5, -64, 16, 22, 54, T[0], 0); tapestry('x', -87.5, 10, 16, 22, 54, T[1], 1.5); tapestry('x', -87.5, 56, 16, 22, 54, T[3], 3); tapestry('x', 87.5, -64, 16, 22, 54, T[2], 2); tapestry('x', 87.5, 10, 16, 22, 54, T[3], 4); tapestry('x', 87.5, 56, 16, 22, 54, T[0], 5);

  // ════════ THE WEST WING: the quiet, grander half. Corridor B runs north-south down its west side; the rooms open off it to the east. ════════
  const stone = stoneFloor();
  slab(-273, -43, -90, -8, stone, boneM);                                                // corridor A, the rug
  wall('z', -43, -273, -90, boneM, []); wall('z', -8, -273, -90, boneM, []);
  { const g = at(0, 0, 0); box(166, 0.5, 28, rugTex(), 0, 0.3, 0, g); B(166, 0.4, 2.6, '#c9a23c', 0, 0.55, 12, g); B(166, 0.4, 2.6, '#c9a23c', 0, 0.55, -12, g); movable('rugA', 'The great rug (gold and violet)', g, { x: -180, z: -26, ry: 0 }); }
  { const g = at(0, 0, 0); B(16, 3, 16, '#6a2860', 0, 12, 0, g); B(3, 24, 16, '#5a2052', -8, 20, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(2, 10.5, 2, '#3a2a20', sx * 6.5, 5.25, sz * 6.5, g); movable('nurseryChair', 'Straight-backed chair (by the cot)', g, { x: -125, z: -247, ry: Math.PI / 2 }); }       // (beside the cot, facing it)
  { const g = at(-215, 0, -40.4); room.add(g); B(24, 40, 0.8, '#26324a', 0, 24, 0, g); B(26, 2, 1, '#c9a23c', 0, 44.5, 0, g); B(26, 2, 1, '#c9a23c', 0, 3.5, 0, g);         // the woman in silver
    B(10, 18, 1, '#cfd4de', 0, 18, 0.8, g); B(12, 10, 1, '#e8ecf4', 0, 29, 0.8, g); B(7, 5, 1, '#e8c8a8', 0, 37, 0.9, g);
    const head = at(0, 41, 1.4); g.add(head); B(7, 7, 7, '#e8c8a8', 0, 0, 0, head); B(8, 3, 8, '#cfd4de', 0, 4, 0, head); B(1.3, 1.3, 0.6, '#2a3a60', -1.8, 0.6, 3.5, head); B(1.3, 1.3, 0.6, '#2a3a60', 1.8, 0.6, 3.5, head); B(3, 0.8, 0.6, '#9a4a4a', 0, -1.8, 3.5, head);
    const spec = { head, look: null }; anim.push((t) => { head.rotation.y = spec.look != null ? spec.look : 0.5 * Math.sin(t * 0.35) * (0.5 + 0.5 * Math.sin(t * 0.13)); }); room.userData.woman = spec; }
  // corridor B: urns and cabinets carved with stories
  slab(-314, -160, -273, 97, stone, boneM);
  wall('x', -314, -160, 97, boneM, [[-129, -111, 38, 54], [-49, -31, 38, 54], [31, 49, 38, 54]]); window_('x', -314, -120, 18, 38, 54, 1, true, 1); window_('x', -314, -40, 18, 38, 54, 1, true, 1); window_('x', -314, 40, 18, 38, 54, 1, true, 1);
  wall('x', -273, -160, 97, boneM, [[-43, -8, 0, 52], [-118, -82, 0, 52], [28, 60, 0, 52]]); wall('z', 97, -314, -273, boneM, []);
  const urn = (k, x, z) => { const g = at(0, 0, 0); B(7, 3, 7, '#b9b4a6', 0, 1.5, 0, g); B(10, 8, 10, '#c4bfb0', 0, 7, 0, g); B(7, 5, 7, '#b9b4a6', 0, 13.5, 0, g); B(4, 3, 4, '#b9b4a6', 0, 17, 0, g); B(6.5, 1.5, 6.5, '#a8a396', 0, 19, 0, g); B(10.4, 1, 0.4, '#8a8478', 0, 7, 5.1, g); movable('urn' + k, 'Stone urn ' + k, g, { x, z, ry: 0 }); };
  [[-306, -142], [-306, -78], [-306, -21], [-306, 39], [-306, 82], [-280, -150]].forEach((p, i) => urn(i + 1, p[0], p[1]));
  const cabinet = (k, x, z, ry) => { const g = at(0, 0, 0); B(26, 34, 12, '#4a3626', 0, 17, 0, g); B(28, 2, 14, '#5a4630', 0, 35, 0, g); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) B(6.5, 7, 0.8, r % 2 ? '#7a6040' : '#8a6c48', -8 + c * 8, 8 + r * 9.5, 6.4, g); B(1.4, 3, 1, '#c9a23c', -1.5, 17, 6.9, g); B(1.4, 3, 1, '#c9a23c', 1.5, 17, 6.9, g); movable('cabinet' + k, 'Carved cabinet ' + k, g, { x, z, ry }); };
  cabinet(1, -306, -121, Math.PI / 2); cabinet(2, -306, -53, Math.PI / 2); cabinet(3, -306, 6, Math.PI / 2); cabinet(4, -306, 62, Math.PI / 2);
  // the music hall: x -273..-93, z 0..88
  slab(-273, 0, -93, 88, woodFloor(), boneM); wall('z', 0, -273, -93, boneM, []); wall('z', 88, -273, -93, boneM, [[-229, -211, 37, 53], [-179, -161, 37, 53], [-125, -107, 37, 53]]); wall('x', -93, 0, 88, boneM, []);
  for (const cx of [-220, -170, -116]) window_('z', 88, cx, 18, 37, 53, -1, true, 1);
  const harp = (k, x, z, ry) => { const g = at(0, 0, 0); B(16, 3, 8, '#c9a23c', 0, 1.5, 0, g); B(3, 40, 3, '#c9a23c', 7, 21, 0, g); const neck = B(18, 3, 3, '#c9a23c', -1, 40, 0, g); neck.rotation.z = -0.28; for (let i = 0; i < 9; i++) B(0.25, 14 + i * 2.8, 0.25, '#f0ecd8', -8 + i * 1.7, 8 + (14 + i * 2.8) / 2 - 1, 0, g); B(2.4, 3, 4, '#5a2f78', 0, 3.6, 0, g); movable('harp' + k, 'Harp ' + k, g, { x, z, ry }); };
  harp(1, -241, 16, 0); harp(2, -204, 14, 0.2); harp(3, -165, 72, Math.PI);
  { const g = at(0, 0, 0); B(34, 2, 10, '#5a4630', 0, 14, 0, g); B(2, 14, 8, '#4a3626', -14, 7, 0, g); B(2, 14, 8, '#4a3626', 14, 7, 0, g); for (let i = 0; i < 6; i++) B(1, 1, 18, i % 2 ? '#c9a23c' : '#c8ccd4', -12 + i * 4.8, 15.4, 0, g); movable('fluteRack', 'Flute rack', g, { x: -124, z: 66, ry: Math.PI / 2 }); }
  for (const [k, x, z] of [[1, -220, 50], [2, -182, 38]]) { const g = at(0, 0, 0); B(9, 2, 9, '#6a2860', 0, 10, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(1.4, 10, 1.4, '#4a3626', sx * 3.4, 5, sz * 3.4, g); movable('stool' + k, 'Music stool ' + k, g, { x, z, ry: 0 }); }
  // the sunlit library, behind a gauze curtain: x -273..-93, z -146..-51
  slab(-273, -146, -93, -51, woodFloor(0xd8c8a8), boneM); wall('z', -146, -273, -93, boneM, []); wall('z', -51, -273, -93, boneM, []); wall('x', -93, -146, -51, boneM, [[-144, -114, 36, 58]]);
  window_('x', -93, -129, 28, 36, 58, -1, true, 1);
  { const g = at(-271.5, 25, -100); room.add(g); const gm = new THREE.MeshBasicMaterial({ color: 0xf4f0ea, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }); const cur = new THREE.Mesh(new THREE.BoxGeometry(0.4, 50, 34), gm); g.add(cur); anim.push((t) => { cur.rotation.z = 0.02 * Math.sin(t * 0.9); cur.rotation.x = 0.03 * Math.sin(t * 0.7 + 1); }); }
  for (let s = 0; s < 3; s++) { const g = at(0, 0, 0); B(8, 38, 34, '#5a4026', 0, 19, 0, g); for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) B(5, 7 - (c % 2) * 0.8, 3.2, ['#7a1f3a', '#2f4a7a', '#2f6a3a', '#c9a23c', '#5a2f78'][(r + c) % 5], 0.8, 6 + r * 8.6, -14 + c * 4, g); movable('shelf' + (s + 1), 'Bookshelf ' + (s + 1), g, [{ x: -263, z: -125, ry: 0 }, { x: -204, z: -141, ry: -Math.PI / 2 }, { x: -140, z: -141, ry: -Math.PI / 2 }][s]); }
  { const g = at(0, 0, 0); const cols = ['#7a1f3a', '#5a2f78', '#c9a23c', '#2a6a7a', '#b84a6a', '#3a5a9a']; for (let i = 0; i < 14; i++) { const a = rng() * 6.28, r = rng() * 12, l = Math.floor(i / 6); B(10 + rng() * 5, 4, 10 + rng() * 5, cols[i % 6], Math.cos(a) * r, 2 + l * 3.4, Math.sin(a) * r, g).rotation.y = rng() * 3; } movable('cushionHeap', 'Heap of silk cushions', g, { x: -161, z: -117, ry: 0 }); }
  { const g = at(0, 0, 0); B(44, 7, 14, '#4a3626', 0, 6, 0, g); B(44, 6, 14, '#6a2860', 0, 12, 0, g); B(44, 10, 3, '#6a2860', 0, 17, -6, g); for (const sx of [-1, 1]) B(3, 8, 14, '#4a3626', sx * 21, 8, 0, g); movable('paddedBench', 'Padded bench', g, { x: -141, z: -70, ry: 0 }); }
  // the old playroom, which is also where Jack sleeps: x -314..-99, z -293..-160
  slab(-314, -293, -99, -160, woodFloor(0xb89a74), boneM); const nW = [[-299, -281], [-249, -231], [-199, -181], [-149, -131]].map(o => [o[0], o[1], 38, 56]), nS = [[-274, -256], [-234, -216], [-194, -176]].map(o => [o[0], o[1], 38, 56]);
  wall('z', -293, -314, -99, boneM, nW); wall('z', -160, -314, -99, boneM, [[-308, -280, 0, 52]]); wall('x', -314, -293, -160, boneM, nS); wall('x', -99, -293, -160, boneM, nS);
  for (const cx of [-290, -240, -190, -140]) window_('z', -293, cx, 18, 38, 56, 1, true, 1); for (const cz of [-265, -225, -185]) { window_('x', -314, cz, 18, 38, 56, 1, true, 1); window_('x', -99, cz, 18, 38, 56, -1, true, 1); }
  const horse = (k, x, z, ry) => { const g = at(0, 0, 0); B(22, 3, 4, '#8a7a60', 0, 2, 5, g); B(22, 3, 4, '#8a7a60', 0, 2, -5, g); B(16, 10, 8, '#a89a82', 0, 14, 0, g); B(5, 10, 5, '#a89a82', 8, 21, 0, g); B(6, 5, 4, '#a89a82', 12, 24, 0, g); B(1, 5, 3, '#6a5a44', 7.5, 25, 0, g); B(2, 8, 2, '#6a5a44', -9, 14, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(1.8, 9, 1.8, '#8a7a60', sx * 5.5, 7, sz * 3.4, g); movable('horse' + k, 'Rocking horse ' + k, g, { x, z, ry }); anim.push((t) => { g.rotation.z = k === 2 ? 0.03 * Math.sin(t * 0.8) : 0; }); };
  horse(1, -198, -239, 0.4);                                                     // (just the one)
  { const g = at(0, 0, 0); for (const [x, z, c] of [[0, 0, '#b04a4a'], [5, 1, '#4a6ab0'], [2, 4, '#c9a23c'], [-4, 3, '#4a9a5a']]) B(4, 4, 4, c, x, 2, z, g).rotation.y = rng() * 3; B(5, 5, 5, '#c4a070', -9, 2.5, -3, g); B(2, 5, 2, '#a04a6a', 9, 2.5, -2, g); movable('toys', 'Worn toys (blocks, ball, top)', g, { x: -186, z: -175, ry: 0 }); }
  { const g = at(0, 0, 0); B(30, 18, 22, '#9a8a6a', 0, 9, 0, g); B(2, 18, 22, '#8a7a5a', 14, 9, 0, g); B(30, 1, 22, '#8a7a5a', 0, 18.5, 0, g); B(2, 8, 20, '#7a6a4a', -6, 3, 14, g).rotation.z = 0.9; B(16, 2, 12, '#6a3a3a', -4, 1.4, 16, g).rotation.x = 0.3; B(8, 8, 1, '#c9a23c', 4, 9, 11.4, g); B(4, 4, 0.5, '#4a6a8a', -6, 12, 11.2, g); B(4, 4, 0.5, '#4a6a8a', 6, 4, 11.2, g); movable('dollhouse', 'Broken dollhouse (in the corner)', g, { x: -292, z: -270, ry: 0.3 }); }
  { const g = at(0, 0, 0); B(7, 1.6, 9, '#6a1a2a', 0, 0.8, 0, g); B(7.2, 0.4, 9.2, '#c9a23c', 0, 1.7, 0, g); movable('ledger', 'The hidden ledger of names', g, { x: -304, z: -283, ry: 0.5 }); }
  { const g = at(0, 0, 0); const W_ = 38, D_ = 24;                                           // Jack's cot: low bars on all four sides
    B(W_, 3, D_, '#5a4026', 0, 5, 0, g); B(W_ - 3, 3.4, D_ - 3, '#e8e0cc', 0, 8, 0, g); B(W_ - 6, 2, D_ - 6, '#6a3a5a', 3, 10, 0, g); B(8, 2.4, 10, '#f4f0e8', -13, 10.4, 0, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(2.4, 16, 2.4, '#4a3420', sx * (W_ / 2 - 1.2), 8, sz * (D_ / 2 - 1.2), g);
    for (const sz of [-1, 1]) { B(W_, 1.4, 1.4, '#4a3420', 0, 15, sz * (D_ / 2 - 1.2), g); for (let i = 0; i < 9; i++) B(1, 9, 1, '#6a4a2e', -W_ / 2 + 4 + i * ((W_ - 8) / 8), 10.5, sz * (D_ / 2 - 1.2), g); }
    for (const sx of [-1, 1]) { B(1.4, 1.4, D_, '#4a3420', sx * (W_ / 2 - 1.2), 15, 0, g); for (let i = 0; i < 5; i++) B(1, 9, 1, '#6a4a2e', sx * (W_ / 2 - 1.2), 10.5, -D_ / 2 + 4 + i * ((D_ - 8) / 4), g); }
    movable('cot', 'Jack\'s cot (low bars on all four sides)', g, { x: -125, z: -270, ry: 0 }); }

  chandelier(4, -183, 44, 'Chandelier (music hall)'); chandelier(5, -183, -98, 'Chandelier (library)'); chandelier(6, -230, -226, 'Chandelier 1 (nursery)'); chandelier(7, -160, -226, 'Chandelier 2 (nursery)');

  // ════════ GERDA'S WING: the warmer half ════════
  slab(90, -111, 250, 53, flagFloor(160, 164, 0xe6cfae), warmM);                                   // the kitchen
  wall('z', 53, 90, 250, warmM, [[108, 138, 35, 52], [171, 201, 35, 52]]); wall('z', -111, 90, 250, warmM, [[110, 130, 36, 54], [150, 174, 0, 50], [196, 216, 36, 54]]); wall('x', 250, -111, 53, warmM, [[-95, -55, 0, 52]]); wall('x', 90, -111, 53, warmM, [[-45, -5, 0, 52]]);
  window_('z', 53, 123, 30, 35, 52, -1, true, 1); window_('z', 53, 186, 30, 35, 52, -1, true, 1); window_('z', -111, 120, 18, 36, 54, 1, true, 1); window_('z', -111, 206, 18, 36, 54, 1, true, 1);
  { const hg = at(246, 0, 5); room.add(hg); hg.rotation.y = -Math.PI / 2; B(66, 40, 14, '#c4a880', 0, 20, 7, hg); B(28, 22, 15, '#14100c', 0, 11, 7.4, hg); B(72, 4, 16, '#a88a62', 0, 42, 7, hg); for (let i = 0; i < 5; i++) { const m = B(3.4, 8, 3, i % 2 ? '#ffb040' : '#ff7a20', -7 + i * 3.6, 5, 9, hg); flames.push({ m, base: 8, ph: i * 1.7 }); } const kl = lamp(230, 12, 5, 0xff9a40, 0.9, 110); anim.push((t) => { kl.intensity = 0.8 + 0.18 * Math.sin(t * 10) * Math.sin(t * 5.7); }); }
  { const g = at(0, 0, 0); B(20, 24, 16, '#2b2d36', 0, 12, 0, g); B(22, 2, 18, '#3a3d48', 0, 25, 0, g); for (const [x, z] of [[-5, -3], [5, 3]]) B(7, 1, 7, '#1a1a20', x, 26, z, g); B(3, 18, 3, '#2b2d36', 6, 34, -5, g); movable('stove', 'Iron stove', g, { x: 125, z: -90, ry: 0 }); }
  { const g = at(0, 0, 0); B(26, 0.8, 14, '#3a2a20', 0, 0.4, 0, g); B(26, 21, 1.2, '#1a1208', 0, 11.3, -6.4, g); for (const sx of [-1, 1]) B(1.2, 21, 14, '#6a4a2e', sx * 12.4, 11.3, 0, g); B(28, 2, 16, '#7a5a3a', 0, 22.8, 0, g);      // a cupboard under the pans, low enough to leave them clear, deep enough to hide in; the right-hand door opens outwards, just wide enough to climb in by
    const dl = at(-12.4, 10.5, 6.8); g.add(dl); B(12.4, 19.4, 0.8, '#8a6a44', 6.2, 0, 0, dl); B(1.2, 3, 1, '#c9a23c', 11, 0.5, 0.8, dl); const dr = at(12.2, 10.5, 6.8); g.add(dr); dr.rotation.y = 0.7; g.userData.cupDoors = { dl, dr }; B(12, 19.4, 0.8, '#8a6a44', -6, 0, 0, dr); B(1.2, 3, 1, '#c9a23c', -10.6, 0.5, 0.8, dr);
    movable('pantry', 'Cupboard under the pans (somewhere to hide)', g, { x: 100, z: -92, ry: Math.PI / 2 }); }
  { const g = at(0, 23.8, 0), W = 15, D = 10, wood = '#4a2e1c', gold = '#c9a23c', vel = '#5a1f78', velD = '#471560';                  // a fine wooden box with a lid, lined in purple velvet, large enough for Jack lying down at a quarter of his size (it stands on the cupboard)
    B(W, 0.8, D, wood, 0, 0.4, 0, g); B(W, 6.6, 0.8, wood, 0, 4.1, -D / 2 + 0.4, g); B(W, 6.6, 0.8, wood, 0, 4.1, D / 2 - 0.4, g); for (const sx of [-1, 1]) B(0.8, 6.6, D - 1.6, wood, sx * (W / 2 - 0.4), 4.1, 0, g);
    B(W - 1.6, 0.4, D - 1.6, vel, 0, 1.0, 0, g); B(W - 1.6, 5.8, 0.4, velD, 0, 4.1, -D / 2 + 1.0, g); B(W - 1.6, 5.8, 0.4, velD, 0, 4.1, D / 2 - 1.0, g); for (const sx of [-1, 1]) B(0.4, 5.8, D - 2.4, velD, sx * (W / 2 - 1.0), 4.1, 0, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(1.4, 1.4, 1.4, gold, sx * (W / 2 - 0.1), 0.5, sz * (D / 2 - 0.1), g); for (const sz of [-1, 1]) B(W + 0.4, 0.5, 1.4, '#3a2214', 0, 7.5, sz * (D / 2 - 0.2), g); for (const sx of [-1, 1]) B(1.4, 0.5, D - 2.4, '#3a2214', sx * (W / 2 - 0.2), 7.5, 0, g);          // (a frame round the rim: the box is open inside)
    const lid = at(0, 7.7, -D / 2); g.add(lid); B(W + 0.8, 1.1, D + 0.8, wood, 0, 0.55, D / 2, lid); B(W - 1.2, 0.3, D - 1.2, vel, 0, -0.1, D / 2, lid); B(W + 1.0, 0.4, 1.0, gold, 0, 1.0, 0.4, lid); B(W + 1.0, 0.4, 1.0, gold, 0, 1.0, D - 0.4 + 0.8, lid); B(2.4, 1.6, 0.7, gold, 0, 0.3, D + 0.9, lid);
    for (const sx of [-1, 1]) B(1.6, 1.1, 1.0, gold, sx * (W / 2 - 2), 0.4, -0.2, g.parent ? lid : lid);
    g.userData.box = { lid }; movable('keepsakeBox', 'The fine box on the cupboard (lined in purple velvet)', g, { x: 100, z: -92, ry: Math.PI / 2 }); }
  { const g = at(0, 0, 0); B(50, 3, 26, '#7a5a3a', 0, 24, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(3.4, 24, 3.4, '#5a4026', sx * 22, 12, sz * 10, g);
    // What is on the table (Jack may look at each, standing beside it: userData.item = { id, kind, text }); the loaf sits at the edge nearest the hall's door, with crumbs about it
    const T0 = 25.5, thing = (id, kind, text, x, z, extra) => { const t = at(x, T0, z); g.add(t); t.userData.item = Object.assign({ id, kind, text }, extra || {}); return t; };
    { const t = thing('loaf', 'loaf', 'It smells wonderful. It isn’t mine, though.', -19, 4); B(10, 1.2, 10, '#d8d4c8', 0, 0.6, 0, t); B(12, 4.4, 6.4, '#c88a3c', 0, 3.4, 0, t); B(10, 1.8, 5.2, '#d49a4c', 0, 6.2, 0, t); for (const dx of [-3.4, 0, 3.4]) B(0.8, 0.5, 5.4, '#b07428', dx, 7.2, 0, t);
      for (let i = 0; i < 3; i++) { const m = B(1.6, 1.6, 1.6, '#f4f0e8', (i - 1) * 2.4, 9, 0, t); m.material = new THREE.MeshLambertMaterial({ color: 0xf4f0e8, transparent: true, opacity: 0.4, emissive: 0x303030 }); anim.push((tm) => { const k = ((tm * 0.35 + i * 0.33) % 1); m.position.set((i - 1) * 2.4 + Math.sin(tm * 2 + i) * 0.8, 9 + k * 9, 0); m.material.opacity = 0.45 * (1 - k); m.scale.setScalar(0.6 + k); }); } }
    for (const [i, [cx, cz]] of [[-12.5, 8.5], [-25 + 1.6, 10.2], [-11.8, 0.6], [-22.5, -2.6]].entries()) { const t = thing('crumb' + i, 'crumb', '', cx, cz); t.userData.noCollide = true; B(1.1, 0.35, 0.9, '#c88a3c', 0, 0.18, 0, t).rotation.y = i; B(0.6, 0.3, 0.6, '#d49a4c', 0.5, 0.45, 0.2, t); }
    { const t = thing('jug', 'look', 'A jug as tall as a cottage. Who needs a jug that size? Someone who drinks by the barrel.', -3, -7); B(6.4, 9, 6.4, '#8a5a3a', 0, 4.5, 0, t); B(7, 1.2, 7, '#6a4026', 0, 9.6, 0, t); B(1.6, 6, 2, '#8a5a3a', 4, 5, 0, t); }
    { const t = thing('cup', 'look', 'A cup I could swim in. I’d want a very big thirst for that.', 5, -3.5); B(4.4, 5, 4.4, '#d8d4c8', 0, 2.5, 0, t); B(1.2, 3, 1.4, '#d8d4c8', 2.8, 2.6, 0, t); }
    { const t = thing('butter', 'look', 'That’s more butter than we’ll see in a year. Who spreads butter on that scale?', 4, 7); B(8, 2.4, 5.4, '#e8e0c8', 0, 1.2, 0, t); B(6, 1.8, 4, '#f2e08a', 0, 3.3, 0, t); }
    { const t = thing('salt', 'look', 'A pinch from that would feed our whole table for a month. Whose table needs a salt cellar this big?', 12, -8); B(3.6, 2.6, 3.6, '#c8c4b8', 0, 1.3, 0, t); B(2.2, 1, 2.2, '#f4f0e8', 0, 3, 0, t); }
    { const t = thing('eggs', 'look', 'Every one of those eggs is bigger than I am. Mother would be cooking for a week.', 15, 6); B(9, 2.6, 9, '#8a6a42', 0, 1.3, 0, t); for (const [x, z] of [[-2, -1.5], [2, -1.2], [0, 2]]) B(3.4, 4.4, 3.4, '#f0e6d0', x, 4.4, z, t); }
    { const t = thing('knife', 'look', 'A knife as long as a cart. I wouldn’t want to meet whoever carves with that.', 21, 0); B(5, 1, 10, '#7a5a3a', 0, 0.5, 0, t); B(0.5, 0.4, 8, '#c8ccd4', 0.2, 1.2, 0, t); B(1, 1.1, 3, '#4a3626', 0.2, 1.1, 5.2, t); }
    movable('kitchenTable', 'Kitchen table', g, { x: 169, z: -36, ry: 0 }); }
  { const g = at(0, 0, 0); B(10, 2, 10, '#7a5a3a', 0, 21, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(1.6, 21, 1.6, '#5a4026', sx * 4, 10.5, sz * 4, g); for (const sz of [-1, 1]) B(9.4, 1, 1.2, '#5a4026', 0, 14.1, sz * 4, g); for (const sx of [-1, 1]) B(1.2, 1, 9.4, '#5a4026', sx * 4, 6.8, 0, g); movable('tallStool', 'Tall stool (at the table)', g, { x: 172, z: -60, ry: 0 }); }
  { const g = at(0, 0, 0); B(44, 32, 14, '#6a4a2e', 0, 16, 0, g); B(46, 2, 16, '#7a5a3a', 0, 33, 0, g); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { B(9.4, 8, 0.8, '#8a6a44', -16.5 + c * 11, 5 + r * 10, 7.4, g); B(1.6, 1.6, 1, '#c9a23c', -16.5 + c * 11, 5 + r * 10, 8, g); } B(8, 12, 8, '#9a7a56', 14, 40, 0, g); movable('drawers', 'Drawers (that hold what she needs)', g, { x: 224, z: -99, ry: Math.PI }); }
  { const g = at(0, 0, 0); B(14, 2, 16, '#5a4026', 0, 12, 0, g); B(14, 20, 2, '#5a4026', 0, 21, -7, g); for (const sx of [-1, 1]) { B(2, 12, 16, '#5a4026', sx * 6.5, 14, 0, g); B(2, 2, 22, '#4a3420', sx * 6.5, 1, 0, g); for (const sz of [-1, 1]) B(1.6, 12, 1.6, '#5a4026', sx * 6.5, 6, sz * 7, g); } B(12, 2, 14, '#b84a4a', 0, 13.4, 0, g); movable('rockingChair', 'Rocking chair (by the fire)', g, { x: 208, z: 23, ry: Math.PI / 2 }); anim.push((t) => { g.rotation.z = 0.04 * Math.sin(t * 0.9); }); }
  // the parlour: x 250..376, z -109..-8
  slab(250, -109, 376, -8, woodFloor(0xd8b890), warmM); wall('z', -8, 250, 376, warmM, [[300, 330, 0, 52]]); wall('x', 376, -109, -8, warmM, [[-90, -50, 28, 54]]); wall('z', -109, 250, 376, warmM, [[258, 288, 0, 52]]);
  window_('x', 376, -70, 40, 28, 54, -1, true, 1);
  { const g = at(0, 0, 0); B(44, 7, 12, '#5a4026', 0, 4, 0, g); B(44, 4, 12, '#b86a4a', 0, 9, 0, g); movable('windowBench', 'Window bench', g, { x: 368, z: -70, ry: Math.PI / 2 }); }
  { const g = at(0, 0, 0); box(30, 0.5, 20, rugTex(), 0, 0.3, 0, g); movable('parlourRug', 'Parlour rug', g, { x: 307, z: -59, ry: 0 }); }
  // where the stairs to the tower will rise (not built yet): a stair hall flush under the parlour, x 250..376, z -8..53 (shares the kitchen's east wall)
  slab(250, -8, 376, 53, woodFloor(0xc8a880), warmM); wall('z', 53, 250, 376, warmM, []); wall('x', 376, -8, 53, warmM, []);
  for (let i = 0; i < 4; i++) B(34 - i * 1.2, 4.6 * (i + 1), 6, '#8a6a44', 313, 2.3 * (i + 1), 46 - i * 5.6, room);
  // the narrow hallway: x 250..295, z -207..-109; and the tiled bathing room: x 295..382, z -202..-115
  slab(250, -207, 295, -109, woodFloor(0xc8a880), warmM); wall('x', 295, -207, -109, warmM, [[-175, -145, 0, 52]]);
  slab(295, -202, 382, -115, tileFloor(), warmM); wall('z', -202, 295, 382, warmM, []); wall('z', -115, 295, 382, warmM, []); wall('x', 382, -202, -115, warmM, [[-172, -145, 36, 54]]);
  window_('x', 382, -158, 27, 36, 54, -1, false, 1);       // (no shaft of light here: the bathroom is lit by candles, at dusk)
  B(87, 18, 1, '#9fc2cf', 338, 9, -201, room); B(1, 18, 87, '#9fc2cf', 381, 9, -158, room);
  const wmSink = plain('#9fd0e8').clone(); wmSink.transparent = true; wmSink.opacity = 0.65;
  { const g = at(0, 0, 0), wm = plain('#9fd0e8').clone(); wm.transparent = true; wm.opacity = 0.62;       // the bath: hollow, and empty (the bathing scene fills it, and the steam rises)
    B(42, 3, 20, '#f0f0ec', 0, 1.5, 0, g); B(42, 12, 2, '#f0f0ec', 0, 6, -9, g); B(42, 12, 2, '#f0f0ec', 0, 6, 9, g); for (const sx of [-1, 1]) B(2, 12, 16, '#f0f0ec', sx * 20, 6, 0, g); B(38, 0.4, 16, '#dfe8ee', 0, 3.2, 0, g);
    for (const sx of [-1, 1]) B(3, 3, 3, '#c9a23c', sx * 18, 1.5, 9, g);
    const water = box(38, 0.5, 16, wm, 0, 9, 0, g); water.visible = false; g.userData.water = water;
    const sm = plain('#ffffff').clone(); sm.transparent = true; sm.opacity = 0.3; const puffs = []; for (let i = 0; i < 9; i++) { const q = box(2.2, 2.2, 2.2, sm, 0, 10, 0, g); q.visible = false; puffs.push(q); } g.userData.steam = { on: false, puffs };
    anim.push((t) => { const S = g.userData.steam; for (let i = 0; i < puffs.length; i++) { const q = puffs[i]; q.visible = S.on; if (!S.on) continue; const k = (t * 0.22 + i / puffs.length) % 1; q.position.set(-16 + (i % 5) * 8 + Math.sin(t * 0.9 + i * 1.7) * 2.2, 10 + k * 30, -5 + (i % 3) * 5 + Math.cos(t * 0.7 + i) * 2); q.scale.setScalar(0.7 + k * 1.6); q.material.opacity = 0.34 * (1 - k); } });
    movable('tub', 'Bathing tub', g, { x: 355, z: -177, ry: 0 }); room.userData.bath = { tub: g }; }
  { const g = at(0, 0, 0); B(8, 12, 8, '#e8e4d8', 0, 6, 0, g); B(10, 1.2, 10, '#c9a23c', 0, 12.6, 0, g); movable('bathStool', 'Bath stool and towels', g, { x: 367, z: -155, ry: 0 }); }
  // the indoor roost: x 250..420, z -330..-208
  slab(250, -330, 420, -208, strawFloor(), warmM); wall('z', -208, 250, 420, warmM, [[258, 288, 0, 52]]); wall('z', -330, 250, 420, warmM, [[300, 316, 44, 58]]); wall('x', 420, -330, -208, warmM, [[-290, -260, 36, 56]]); wall('x', 250, -348, -111, warmM, [[-300, -285, 0, 11], [-240, -220, 38, 56]]);
  window_('z', -330, 308, 16, 44, 58, 1, true, 1); window_('x', 420, -275, 30, 36, 56, -1, true, 1); window_('x', 250, -230, 20, 38, 56, 1, true, 1);
  B(18, 2, 12, '#a89c84', 308, 41, -336, room); B(22, 1, 14, '#bdb59d', 308, 40, -337, room);                                  // the stone ledge outside the high window: Jack's way out
  // the hen's tunnel, through the wall to the garden: just her size
  { const tl = '#a89c84'; B(10, 1.4, 14, tl, 246, 11.5, -292.5, room); B(10, 1.4, 14, tl, 246, 0.2, -292.5, room); B(10, 12, 1.4, tl, 246, 6, -299.7, room); B(10, 12, 1.4, tl, 246, 6, -285.3, room); B(8, 0.6, 12, '#d6b866', 246, 0.9, -292.5, room); }
  const hen = (x, z, sc) => { const g = at(x, 0, z); const gold = '#e8b830'; B(10, 8, 12, gold, 0, 6, 0, g); B(6, 6, 6, gold, 0, 11.5, 5.4, g); B(2, 2, 3, '#e87a20', 0, 11, 9.4, g); B(1.4, 3, 3, '#c0402a', 0, 15.5, 5.4, g); B(2, 5, 6, gold, 0, 8, -7.4, g); B(2, 4, 8, '#d8a828', -5.2, 6.4, 0, g); B(2, 4, 8, '#d8a828', 5.2, 6.4, 0, g); B(0.6, 0.6, 0.6, '#1a1a1a', -2.6, 12.4, 8, g); B(0.6, 0.6, 0.6, '#1a1a1a', 2.6, 12.4, 8, g); g.scale.setScalar(sc); return g; };
  { const g = at(0, 0, 0); B(22, 8, 22, '#6a2860', 0, 4, 0, g); B(24, 1.4, 24, '#c9a23c', 0, 8.4, 0, g); const h = hen(0, 0, 0.9); h.position.y = 9; g.add(h); g.userData.hen = h; anim.push((t) => { if (g.userData.henFree) return; h.rotation.z = 0.02 * Math.sin(t * 1.3); h.position.y = 9 + 0.15 * Math.sin(t * 1.3); }); movable('henCushion', 'The golden hen, on her velvet cushion', g, { x: 320, z: -269, ry: 0 }); }
  { const g = at(0, 0, 0); for (let i = 0; i < 6; i++) B(14, 9, 14, i % 2 ? '#9a7a52' : '#8a6a44', 0, 4.5 + i * 9, 0, g).rotation.y = i * 0.3; movable('crateTower', 'Tower of crates', g, { x: 292, z: -314, ry: 0 }); }
  { const g = at(0, 0, 0); for (let i = 0; i < 5; i++) { B(22, 2, 10, '#5a4026', 0, 12 + i * 8, 0, g); B(2, 8, 2, '#4a3420', -9, 9 + i * 8, 4, g); } movable('shelfTower', 'Shelves climbing to the window', g, { x: 324, z: -318, ry: 0 }); }
  // what the hen\'s keeping needs: the rack and broom, the sack of grain, the dish, the trough, and the well, with its bucket
  { const g = at(0, 0, 0); B(14, 2, 1, '#5a4430', 0, 24, -0.5, g); B(1, 3, 2, '#5a4430', -4, 22, 0.4, g); B(1, 3, 2, '#5a4430', 4, 22, 0.4, g);
    const br = at(0, 4, 1.6); g.add(br); B(0.9, 18, 0.9, '#8a6a40', 0, 9, 0, br); B(3.4, 5, 2.2, '#c9b06a', 0, 2.5, 0, br); B(3, 1, 2, '#6a5030', 0, 5.4, 0, br); br.rotation.x = -0.12; g.userData.broom = br;
    movable('henRack', 'Rack, with the broom', g, { x: 252.5, z: -268, ry: Math.PI / 2 }); }
  { const g = at(0, 0, 0); B(8, 0.5, 8, '#8a8a90', 0, 0.25, 0, g); const bk = at(0, 0.5, 0); g.add(bk); B(4.4, 4, 4.4, '#7a5a38', 0, 2, 0, bk); B(0.5, 3, 0.5, '#4a3a2a', 0, 6, 0, bk); g.userData.bucket = bk; movable('henBucket', 'The bucket, on its flagstone', g, { x: 262, z: -284, ry: 0 }); }
  { const g = at(0, 0, 0), W = 14, D = 10, H = 9, wd = '#6a4a30';       // the feed store: a lidded bin like the velvet box (its lid hinged at the back), so that the hen cannot get in
    B(W, 0.8, D, wd, 0, 0.4, 0, g); B(W, H, 0.8, wd, 0, H / 2, -D / 2 + 0.4, g); B(W, H, 0.8, wd, 0, H / 2, D / 2 - 0.4, g); for (const sx of [-1, 1]) B(0.8, H, D - 1.6, wd, sx * (W / 2 - 0.4), H / 2, 0, g);
    B(W - 1.6, 0.4, D - 1.6, '#e0c46a', 0, H - 1.6, 0, g); for (const sx of [-1, 1]) B(1.2, H + 0.4, 1.2, '#4a3420', sx * (W / 2), (H + 0.4) / 2, D / 2, g);
    const lid = at(0, H, -D / 2); g.add(lid); B(W + 0.8, 1.1, D + 0.8, wd, 0, 0.55, D / 2, lid); B(W + 1, 0.4, 1.0, '#c9a23c', 0, 1.1, 0.4, lid); B(W + 1, 0.4, 1.0, '#c9a23c', 0, 1.1, D - 0.4, lid); B(2.2, 1.2, 1, '#c9a23c', 0, 0.6, D + 0.5, lid);
    g.userData.box = { lid }; movable('henSack', 'The feed store, with a lid', g, { x: 378, z: -323, ry: 0 }); }
  { const g = at(0, 0, 0); B(8, 2, 8, '#6a4a30', 0, 1, 0, g); B(6, 1, 6, '#2a1d12', 0, 2, 0, g); const gr = at(0, 0, 0); g.add(gr); B(5.2, 1.6, 5.2, '#f0c64a', 0, 2.6, 0, gr); B(3.2, 1.2, 3.2, '#f6d868', 0, 3.6, 0, gr); g.userData.grain = gr; movable('henDish', 'The hen\'s dish', g, { x: 334, z: -298, ry: 0 }); }
  { const g = at(0, 0, 0); B(14, 3.2, 6, '#6a4a30', 0, 1.6, 0, g); B(12, 2.4, 4, '#2a1d12', 0, 3, 0, g); g.userData.water = B(11.6, 0.7, 3.6, '#6ab8f6', 0, 4, 0, g); g.scale.setScalar(1.75); movable('henTrough', 'Water trough', g, { x: 346, z: -324, ry: 0 }); }
  { const g = at(0, 0, 0); for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) B(3, 7, 3, '#8a8a90', x, 3.5, z, g);
    for (const [w, d, x, z] of [[8, 3, 0, -4], [8, 3, 0, 4], [3, 8, -4, 0], [3, 8, 4, 0]]) B(w, 3, d, '#8a8a90', x, 8, z, g);
    B(1.4, 16, 1.4, '#5a4430', -5, 8, 0, g); B(1.4, 16, 1.4, '#5a4430', 5, 8, 0, g); B(12, 1.4, 1.4, '#5a4430', 0, 16, 0, g); B(7.4, 0.8, 7.4, '#6ab8f6', 0, 6.2, 0, g);
    movable('henWell', 'The well, and its bucket', g, { x: 378, z: -284, ry: -Math.PI / 2 }); }
  // ════════ THE GARDEN, between the wings: x -95..250, z -348..-111, on the same white moss as the meadow ════════
  const mossG = surface('moss', () => canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#d3ddcd'; g.fillRect(0, 0, w, h); speck(g, w, h, ['#c8d6c2', '#e1ead9', '#bccfb8', '#d6e2c8', '#e8eee0'], 700); }, 120, 120), 0xe8f0e0);
  box(345, 2, 237, mossG, 77.5, -1, -229.5, room);
  const GW = '#c8c0a8', GH = 56;                                                     // the garden wall: no higher than the ceilings, with the clouds beyond it
  for (const [w, d, x, z] of [[349, 4, 77.5, -348], [4, 237, -95, -229.5]]) { B(w, GH, d, GW, x, GH / 2, z, room); B(w + 2, 4, d + 2, '#e8e4ee', x, GH + 2, z, room); }
  for (const [x, z, w, h] of [[77, -410, 520, 50], [-230, -400, 220, 44], [330, -400, 240, 46], [-400, -200, 90, 40]]) B(w, h, 90, '#f4f0f4', x, h / 2 - 4, z, room);
  for (let k = 0; k < 3; k++) { const g = at(0, 0, 0); B(70, 3, 16, '#4a3322', 0, 1.5, 0, g); for (let i = 0; i < 13; i++) B(2, 2 + rng() * 6, 2, ['#4a8a3a', '#6a9a4a', '#3a7a4a'][i % 3], -31 + i * 5, 6, rng() * 8 - 4, g); movable('herbBed' + (k + 1), 'Herb bed ' + (k + 1), g, { x: -10, z: -223 + k * 35, ry: 0 }); }
  for (let k = 0; k < 4; k++) { const g = at(0, 0, 0); B(16, 3, 10, '#7a5a3a', 0, 1.5, 0, g); for (let i = 0; i < 6; i++) B(1.4, 2 + rng() * 2.4, 1.4, '#5aaa4a', -6 + i * 2.4, 4.4, (i % 2) * 3 - 1.5, g); movable('seedlings' + (k + 1), 'Seedling tray ' + (k + 1), g, { x: 100, z: -202 + k * 19, ry: 0 }); }
  { const g = at(170, 0, -111); room.add(g); B(150, 2, 16, '#5a4026', 0, 44, -8, g); B(150, 14, 1, '#6a4a2e', 0, 52, -15.5, g); for (let i = 0; i < 14; i++) { B(0.3, 6, 0.3, '#8a7a5a', -66 + i * 10.4, 40, -7, g); B(3, 6, 3, ['#6a9a4a', '#8a8a5a', '#9a6a8a', '#7aa05a'][i % 4], -66 + i * 10.4, 35, -7, g); } }
  { const g = at(0, 0, 0); B(10, 6, 10, '#a8a396', 0, 3, 0, g); B(4, 24, 4, '#2b2d36', 0, 18, 0, g); B(3, 3, 12, '#2b2d36', 0, 29, 4, g); B(18, 2, 2, '#2b2d36', 0, 27, 0, g).rotation.z = 0.5; B(4, 3, 6, '#2b2d36', 0, 22, 5, g); B(22, 6, 12, '#7a5a3a', 0, 3, 12, g); B(20, 2, 10, '#5aa8d0', 0, 5.4, 12, g); movable('pump', 'Water pump and trough', g, { x: 123, z: -291, ry: Math.PI }); }
  { const g = at(0, 0, 0); B(22, 12, 16, '#7a5a3a', 0, 6, 0, g); B(24, 2, 18, '#5a4026', 0, 13, 0, g); B(16, 4, 12, '#6a2860', 0, 14, 0, g); const h = hen(0, 0, 0.8); h.position.set(0, 16, 0); g.add(h); movable('roost2', 'The hen\'s second roost, in the sun (by her tunnel)', g, { x: 226, z: -292, ry: -Math.PI / 2 }); }

  // ════════ THE DRESSING: what makes the rooms lived in ════════
  // (a placed thing's local +z points into the room: ry 0 faces south, PI north, PI/2 east, -PI/2 west)
  const R = R2, pick = (a) => a[Math.floor(R() * a.length)];
  const put = (x, y, z, ry) => { const g = at(x, y, z); g.rotation.y = ry || 0; room.add(g); return g; };
  const candle = (g, x, y, z, hh) => { B(1.4, hh || 4, 1.4, '#efe8d8', x, y + (hh || 4) / 2, z, g); const f = B(1, 1.6, 1, '#ffd870', x, y + (hh || 4) + 0.8, z, g); flames.push({ m: f, base: 1.6, ph: R() * 6 }); };
  const sconce = (x, y, z, ry) => { const g = put(x, y, z, ry); B(3.4, 1.2, 1.2, '#2b2d36', 0, 0, 0.6, g); B(1.2, 1.2, 3, '#2b2d36', 0, 0, 1.5, g); B(3.6, 0.8, 3.6, '#c9a23c', 0, 0.6, 3, g); candle(g, 0, 1, 3, 4.4); B(1.2, 3, 0.8, '#2b2d36', 0, -1.5, 0.4, g); return g; };
  const painting = (x, y, z, ry, w, h, kind) => {
    const g = put(x, y, z, ry); B(w + 3, h + 3, 1.2, '#5a4026', 0, 0, 0.6, g); B(w + 1, h + 1, 1.3, '#c9a23c', 0, 0, 0.62, g); const cz = 0.95;
    if (kind === 0) { B(w, h, 0.5, '#9fc4e8', 0, 0, cz, g); B(w, h * 0.42, 0.6, '#4a7a4a', 0, -h * 0.29, cz, g); B(w * 0.5, h * 0.3, 0.6, '#3a6a3a', -w * 0.2, -h * 0.1, cz, g); B(w * 0.14, h * 0.16, 0.6, '#fff2b0', w * 0.25, h * 0.28, cz, g); }
    else if (kind === 1) { B(w, h, 0.5, '#2a2a34', 0, 0, cz, g); B(w * 0.36, h * 0.4, 0.6, '#e8c8a8', 0, h * 0.14, cz, g); B(w * 0.5, h * 0.3, 0.6, '#7a1f3a', 0, -h * 0.28, cz, g); B(w * 0.4, h * 0.1, 0.7, '#3a2a20', 0, h * 0.36, cz, g); }
    else if (kind === 2) { B(w, h, 0.5, '#d8c8a0', 0, 0, cz, g); B(w * 0.8, h * 0.12, 0.6, '#7a5a3a', 0, -h * 0.3, cz, g); for (const [dx, c] of [[-0.2, '#c0402a'], [0, '#e8b830'], [0.2, '#5a9a4a']]) B(w * 0.15, w * 0.15, 0.7, c, w * dx, -h * 0.15, cz, g); }
    else { B(w, h, 0.5, '#26324a', 0, 0, cz, g); for (let i = 0; i < 6; i++) B(w * 0.12, w * 0.12, 0.6, '#e8e0b0', (R() - 0.5) * w * 0.8, (R() - 0.5) * h * 0.8, cz, g); B(w * 0.7, h * 0.2, 0.6, '#1a2238', 0, -h * 0.3, cz, g); }
    return g; };
  const pot = (x, z, sc) => { const g = put(x, 0, z, 0); B(9, 8, 9, '#a8583a', 0, 4, 0, g); B(10.4, 1.6, 10.4, '#8a4a30', 0, 8.4, 0, g); B(8, 1, 8, '#4a3322', 0, 8.8, 0, g); for (let i = 0; i < 7; i++) { const l = B(1.2, 7 + R() * 9, 1.2, pick(['#3a7a3a', '#4a8a3a', '#2f6a3a']), (R() - 0.5) * 6, 14, (R() - 0.5) * 6, g); l.rotation.z = (R() - 0.5) * 0.9; l.rotation.x = (R() - 0.5) * 0.9; } g.scale.setScalar(sc || 1); return g; };
  const books = (g, x, y, z, n, flat_) => { let yy = y; for (let i = 0; i < n; i++) { const h = 1.2 + R() * 1.4; B(7 + R() * 3, h, 5 + R() * 3, pick(['#7a1f3a', '#2f4a7a', '#2f6a3a', '#c9a23c', '#5a2f78', '#4a3626']), x + (R() - 0.5) * 1.2, yy + h / 2, z, g).rotation.y = (R() - 0.5) * 0.4; yy += h; } return yy; };
  const jar = (g, x, y, z, col) => { B(2.6, 3.2, 2.6, col, x, y + 1.6, z, g); B(1.8, 0.8, 1.8, '#8a6a42', x, y + 3.6, z, g); };
  const shelfBoard = (g, w, y) => { B(w, 1.4, 6, '#6a4a2e', 0, y, 0, g); for (const sx of [-1, 1]) B(1.2, 4, 5, '#4a3420', sx * (w / 2 - 1.5), y - 2.6, 0, g); };
  const armour = (x, z, ry) => { const g = put(x, 0, z, ry), st = '#9aa0ac', dk = '#6a707c'; B(10, 3, 8, '#4a4a54', 0, 1.5, 0, g); B(3, 12, 3, st, -2.2, 9, 0, g); B(3, 12, 3, st, 2.2, 9, 0, g); B(9, 11, 5.5, st, 0, 20, 0, g); B(9.6, 2, 6, dk, 0, 14.6, 0, g); B(3.2, 9, 3.2, st, -6.4, 20, 0, g); B(3.2, 9, 3.2, st, 6.4, 20, 0, g); B(6.6, 6.6, 6.6, st, 0, 29.4, 0, g); B(5, 1.2, 0.6, '#1a1a20', 0, 29.4, 3.4, g); B(1.4, 3, 4, '#8a2a2a', 0, 34, -0.6, g); B(1, 36, 1, '#5a4026', 8.6, 18, 1.5, g); B(2.6, 8, 0.8, st, 8.6, 38, 1.5, g); return g; };
  const lute = (x, y, z, ry) => { const g = put(x, y, z, ry); B(9, 11, 3, '#8a5a2e', 0, 0, 1.6, g); B(7, 9, 3.2, '#a8723a', 0, 0, 1.7, g); B(3.4, 3.4, 0.5, '#1a1008', 0, 0.4, 3.4, g); B(2.2, 17, 2, '#4a3626', 0, 13, 1.4, g); B(4.4, 4, 2, '#4a3626', 0, 23, 1.4, g); return g; };
  const sack = (x, z, ry, col) => { const g = put(x, 0, z, ry); B(10, 12, 8, col, 0, 6, 0, g); B(6, 3, 5, col, 0, 13, 0, g); B(7, 1, 5.4, '#8a6a42', 0, 11, 0, g); return g; };
  const crate_ = (x, z, ry, s) => { const g = put(x, 0, z, ry); B(12 * s, 9 * s, 12 * s, '#9a7a52', 0, 4.5 * s, 0, g); for (const sy of [-1, 1]) B(12.4 * s, 1.2, 12.4 * s, '#6a4a2e', 0, 4.5 * s + sy * 3.6 * s, 0, g); return g; };

  // — the entrance hall —
  for (const sx of [-1, 1]) for (const z of [-92, 33]) { const g = put(sx * 85.5, 0, z, 0); B(6, HH - 8, 8, '#c4bba3', 0, HH / 2, 0, g); B(7, 5, 10, '#a99f88', 0, 2.5, 0, g); B(7, 5, 10, '#a99f88', 0, HH - 8, 0, g); B(6, 2, 9, '#c9b88a', 0, HH - 4.5, 0, g); sconce(sx * 82.3, 56, z, -sx * Math.PI / 2); }
  armour(-80, 84, Math.PI / 2); armour(80, 84, -Math.PI / 2);
  for (const sx of [-1, 1]) { const g = put(sx * 61, 0, 102, 0); B(34, 9, 10, '#c4bba3', 0, 4.5, 0, g); B(36, 2, 12, '#a99f88', 0, 10, 0, g); }
  { const g = put(0, 0, 0, 0); B(40, 0.6, 12, '#7a1f3a', 0, 0.3, 100, g); B(40, 0.62, 1.6, '#c9a23c', 0, 0.31, 94.4, g); B(40, 0.62, 1.6, '#c9a23c', 0, 0.31, 105.6, g); B(1.6, 0.62, 12, '#c9a23c', -20.8, 0.31, 100, g); B(1.6, 0.62, 12, '#c9a23c', 20.8, 0.31, 100, g); }   // the rug at the entrance
  { const g = put(64, 0, -92, 0.3); B(13, 8, 13, '#5a4026', 0, 4, 0, g); B(11, 1, 11, '#3a2a1a', 0, 8.2, 0, g); for (let i = 0; i < 3; i++) B(2.6, 2.6, 11, '#6a4a2e', -3 + i * 3, 9, 0, g).rotation.y = (i - 1) * 0.15; B(1.2, 24, 1.2, '#2b2d36', 11, 12, 2, g); B(5, 1, 1, '#2b2d36', 11, 24, 2, g); B(1, 1, 4, '#2b2d36', 12.5, 22, 2, g); }
  painting(-88, 80, 78, Math.PI / 2, 14, 18, 1); painting(88, 80, -82, -Math.PI / 2, 12, 16, 0);
  // — corridor A (x -273..-90, z -43..-8) and the music hall —
  for (const x of [-255, -170, -125]) painting(x, 24, -41, 0, 14, 18, [1, 0, 3][Math.abs(x) % 3]);
  for (const x of [-250, -200, -150, -110]) painting(x, 24, -10, Math.PI, 14, 18, [0, 2, 1, 3][Math.abs(x / 50 | 0) % 4]);
  for (const x of [-235, -190, -145]) sconce(x, 46, -41, 0); for (const x of [-230, -175, -125]) sconce(x, 46, -10, Math.PI);
  pot(-266, -37, 1.2); pot(-266, -13, 1); pot(-102, -39, 1.1);
  for (const x of [-250, -208]) lute(x, 34, 2, 0); painting(-166, 30, 2, 0, 16, 20, 3); painting(-120, 30, 2, 0, 16, 20, 1);
  sconce(-95, 46, 22, -Math.PI / 2); sconce(-95, 46, 46, -Math.PI / 2);
  for (const [x, z, ry] of [[-150, 30, 0.5], [-236, 68, -0.4]]) { const g = put(x, 0, z, ry); B(1.4, 22, 1.4, '#2b2d36', 0, 11, 0, g); for (const [sx, sz] of [[-4, 0], [4, 0], [0, 4]]) B(1, 1, 4.6, '#2b2d36', sx, 1, sz, g).rotation.y = Math.atan2(sx, sz - 1) ; const b = B(14, 9, 1, '#4a3626', 0, 25, 0, g); b.rotation.x = -0.3; B(12, 7, 0.4, '#f4f0e8', 0, 25, 0.6, g).rotation.x = -0.3; }
  // — corridor B, the library and the nursery —
  for (const z of [8, 80, -128]) sconce(-275, 46, z, -Math.PI / 2);
  painting(-275, 26, -142, -Math.PI / 2, 14, 16, 2); painting(-275, 26, -62, -Math.PI / 2, 14, 16, 0); painting(-275, 26, 16, -Math.PI / 2, 12, 14, 1);
  sconce(-95, 52, -100, -Math.PI / 2);
  { const g = put(-185, 0, -90, 0.2); B(36, 2, 18, '#6a4a2e', 0, 20, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(3, 20, 3, '#4a3420', sx * 15, 10, sz * 6, g); B(16, 1, 11, '#e8e0cc', -6, 21.5, 0, g).rotation.y = 0.1; B(16, 1, 11, '#d8cfb4', 8, 21.8, -1, g).rotation.y = -0.15; books(g, 12, 21, 4, 3); candle(g, -13, 21, -5, 5); B(8, 0.8, 8, '#c9a23c', 0, 21.4, 5, g); const gl = put(0, 0, 0, 0); B(1.2, 7, 1.2, '#c9a23c', 20, 24.5, 0, g); B(8, 8, 8, '#4a7ab0', 20, 29, 0, g); B(8.6, 0.8, 8.6, '#c9a23c', 20, 29, 0, g); }
  { const g = put(-150, 0, -128, 0); B(16, 4, 12, '#4a3626', 0, 2, 0, g); B(14, 3, 10, '#6a2860', 0, 5.5, 0, g); B(4, 13, 4, '#4a3626', 0, 9, 0, g); }
  for (const [x, z] of [[-268, -58], [-100, -138]]) pot(x, z, 1);
  for (const [x, y, z, w, h, k] of [[-265, 38, -291, 18, 12, 0], [-215, 38, -291, 16, 12, 2], [-120, 30, -162, 22, 14, 3]]) painting(x, y, z, k === 3 ? Math.PI : 0, w, h, k);
  { const g = put(-215, 0, -166, Math.PI); B(52, 3, 8, '#5a4026', 0, 12, 0, g); B(52, 3, 8, '#5a4026', 0, 26, 0, g); for (const sx of [-1, 1]) B(3, 28, 8, '#4a3420', sx * 24.5, 14, 0, g); for (let i = 0; i < 9; i++) { B(4.4, 4.4, 4.4, pick(['#b04a4a', '#4a6ab0', '#c9a23c', '#4a9a5a']), -22 + i * 5.2, 15.2, 0, g).rotation.y = R(); } for (let i = 0; i < 4; i++) B(3 + R() * 2, 1.4, 6, '#d8c8a0', -18 + i * 11, 28.2, 0, g); books(g, 14, 27.4, 0, 3); B(10, 7, 6, '#a04a6a', -6, 31, 0, g); }
  { const g = at(0, 0, 0), wd = '#6a4a2e', lid = at(0, 11, -7);        // the chest in the nursery: an open box (a floor and four walls), a lid hinged at the back, and what it holds
    B(26, 1, 14, '#4a3420', 0, 0.5, 0, g); B(26, 10, 1, wd, 0, 5.5, 6.5, g); B(26, 10, 1, wd, 0, 5.5, -6.5, g); B(1, 10, 14, wd, 12.5, 5.5, 0, g); B(1, 10, 14, wd, -12.5, 5.5, 0, g);
    g.add(lid); B(28, 2, 16, '#4a3420', 0, 1, 8, lid); B(5, 3, 1.2, '#c9a23c', 0, -2.4, 16.4, lid); B(26, 0.4, 14, '#7a5a3a', 0, -0.2, 8, lid);
    const clothes = at(0, 1, 0); g.add(clothes);                                                                                    // folded, in sizes that run from a man's to a baby's
    [[-8, 9, 2.6, 7, '#7a8aa8'], [-2.5, 7, 2.2, 6, '#a87a7a'], [1.8, 5.4, 1.8, 5, '#8aa86a'], [5.2, 4, 1.5, 4, '#c8b06a'], [8.2, 2.8, 1.2, 3, '#b8a0c8']].forEach(([x, w, h, d, c], i) => { B(w, h, d, c, x, 1 + h / 2, -2.5 + (i % 2), clothes); B(w * 0.8, 0.3, d * 0.7, '#e8e0d0', x, 1 + h + 0.15, -2.5 + (i % 2), clothes); });
    const brush = at(-6, 4.3, 3.6); brush.rotation.y = Math.PI / 2; g.add(brush); B(1.3, 1, 6.4, '#e8d8b4', 0, 0, 0, brush); B(3.4, 1.2, 3.6, '#e8d8b4', 0, 0, 5, brush); B(3, 0.9, 3.2, '#d8c8a0', 0, 0.9, 5, brush);
    const book = at(4.5, 3.9, -0.5); g.add(book); B(6.2, 0.5, 8.6, '#5a3220', 0, -0.55, 0, book); B(5.6, 1.1, 8, '#f0e8d0', 0.2, 0.1, 0, book); B(0.6, 1.7, 8.6, '#7a4630', -3.1, 0, 0, book);
    const cov = at(-3.1, 0.7, 0); book.add(cov); B(6.2, 0.5, 8.6, '#5a3220', 3.1, 0.25, 0, cov); B(3.6, 0.2, 5, '#c9a23c', 3.3, 0.55, 0, cov);
    g.userData.chest = { lid, clothes, brush, book, cov }; g.scale.setScalar(0.62); movable('chest', 'Chest (by the east wall)', g, { x: -108, z: -178, ry: -Math.PI / 2 }); }
  { const g = at(0, 0, 0); B(11, 0.7, 8, '#8a6a42', 0, 5.3, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(0.8, 5, 0.8, '#6a4a2e', sx * 4.6, 2.5, sz * 3.1, g); B(8, 0.4, 5.4, '#c8b090', 0, 5.8, 0, g); movable('nurseryTable', 'Table (for someone small)', g, { x: -150, z: -262, ry: 0 }); }       // (made for someone about his size)
  { const g = at(0, 0, 0); B(3.8, 0.6, 3.8, '#8a6a42', 0, 2.9, 0, g); B(0.6, 3.8, 3.8, '#8a6a42', -1.6, 5.2, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(0.6, 2.6, 0.6, '#6a4a2e', sx * 1.5, 1.3, sz * 1.5, g); movable('nurseryChairS', 'Chair (for someone small)', g, { x: -150, z: -255, ry: Math.PI / 2 }); }
  { const g = put(-168, 0, -162, Math.PI); B(30, 20, 1.2, '#2a4a3a', 0, 28, 0.6, g); B(32, 22, 0.6, '#5a4026', 0, 28, 0.3, g); B(5, 1, 3, '#e8e0d0', -8, 17.6, 2, g); B(10, 1, 0.5, '#e8e0d0', 4, 32, 1.3, g); B(7, 0.6, 0.5, '#e8e0d0', 2, 27, 1.3, g); }
  // — Gerda's wing: the kitchen —
  { const g = put(92, 40, -85, Math.PI / 2); B(46, 1.2, 1.2, '#2b2d36', 0, 0, 0.6, g); for (let i = 0; i < 5; i++) { const x = -18 + i * 9, big = i % 2; B(1, 5, 1, '#2b2d36', x, -3, 0.8, g); B(6 + big * 2, 6 + big * 2, 1.2, '#b87a3a', x, -8.5, 1.6, g); B(1.2, 4, 1, '#4a3626', x, -14, 1.6, g); } }
  for (const [x, y] of [[0, 34], [0, 49]]) { const g = put(224 + x, y, 48, Math.PI); shelfBoard(g, 38, 0); for (let i = 0; i < 5; i++) jar(g, -14 + i * 7, 0.7, 0, pick(['#c9a23c', '#a8442a', '#5a8a4a', '#8a6a42', '#c8c4b8'])); }
  sack(240, 41, 0.3, '#c8b890'); sack(231, 44, -0.2, '#bfae80'); sack(238, 30, 0.6, '#c8b890'); crate_(100, 45, 0.2, 1); { const g = put(100, 9, 45, 0); for (let i = 0; i < 5; i++) B(4, 4, 4, '#c8a050', -3 + i * 1.6, 2, (i % 2) * 3 - 1.5, g); }
  { const g = put(118, 0, 20, 0.4); B(14, 6, 14, '#8a6a42', 0, 3, 0, g); for (let i = 0; i < 6; i++) B(3.6, 3.6, 3.6, '#c8803a', -4 + (i % 3) * 4, 7, (i > 2 ? 3 : -3), g); }
  for (let i = 0; i < 6; i++) { const g = put(232, 76, -28 + i * 2.6, 0); B(0.5, 12, 0.5, '#8a7a5a', 0, -6, 0, g); B(2.6, 5, 2.6, i % 2 ? '#e8e0c8' : '#d8b0c0', 0, -14, 0, g); }
  painting(248, 40, -42, -Math.PI / 2, 14, 16, 2); sconce(92, 48, 20, Math.PI / 2); sconce(92, 48, 36, Math.PI / 2);
  { const g = put(204, 0, -80, 0); B(22, 3, 22, '#6a5a44', 0, 1.5, 0, g); }
  // — the parlour, the stair hall, the bathing room, the roost —
  painting(336, 28, -107, 0, 16, 18, 1); painting(362, 28, -107, 0, 14, 16, 0); painting(374, 30, -40, -Math.PI / 2, 14, 18, 3); sconce(374, 48, -100, -Math.PI / 2); sconce(374, 48, -20, -Math.PI / 2); sconce(260, 48, -10, Math.PI);
  { const g = at(0, 0, 0); B(9, 1.4, 9, '#c9a23c', 0, 0.7, 0, g); B(2.2, 26, 2.2, '#b8932f', 0, 14, 0, g); B(5, 1.2, 5, '#c9a23c', 0, 8, 0, g);       // a standing candelabra: a gilt stem on a round foot, five candles on its arms
    B(14, 1.2, 1.4, '#c9a23c', 0, 27, 0, g); B(1.4, 1.2, 8, '#c9a23c', 0, 27, 0, g);
    for (const [cx, cz] of [[-6.6, 0], [6.6, 0], [0, -3.8], [0, 3.8], [0, 0]]) { B(2.6, 0.8, 2.6, '#c9a23c', cx, 28, cz, g); candle(g, cx, 28.4, cz, 5); }
    movable('bathCandelabra', 'Candelabra', g, { x: 372, z: -122, ry: 0 }); }
  lights.candle = lamp(372, 38, -124, 0xffb860, 0, 130); lights.fill = lamp(338, 30, -150, 0xffa850, 0, 90); room.userData.lights = lights;       // (dark in the day; the bathing scene lights them, at dusk)
  pot(364, -102, 1.3); pot(258, -15, 1);
  { const g = put(350, 0, -15, Math.PI); B(30, 16, 10, '#5a4026', 0, 8, 0, g); B(32, 2, 11, '#6a4a2e', 0, 17, 0, g); for (let i = 0; i < 3; i++) { B(3.6, 9, 3.6, pick(['#7a8a4a', '#8a3a3a', '#3a6a7a']), -8 + i * 8, 22, 0, g); B(1.6, 2.4, 1.6, '#c9a23c', -8 + i * 8, 27.6, 0, g); } candle(g, 11, 18, 2, 5); }
  { const g = put(276, 0, 44, 0); B(30, 6, 8, '#6a4a2e', 0, 3, 0, g); B(26, 2, 8, '#c9a23c', 0, 7, 0, g); }
  { const g = put(338, 0, -197, 0); B(46, 2, 7, '#6a4a2e', 0, 30, 0, g); for (const sx of [-1, 1]) B(2, 8, 5, '#4a3420', sx * 21, 26, 0, g); for (let i = 0; i < 4; i++) B(10, 2.6, 5.4, pick(['#f0f0ec', '#e8d8e0', '#d8e8f0']), -15 + i * 10, 32.4, 0, g); for (let i = 0; i < 3; i++) B(9, 2.2, 5, '#f4f0e8', -10 + i * 10, 20, 0, g); }
  { const g = put(307, 0, -190, 0); B(14, 14, 12, '#e8e4d8', 0, 7, 0, g); B(10, 0.4, 8, '#cfd8dc', 0, 14.2, 0, g); { const sw = box(10, 1.2, 8, wmSink, 0, 14.6, 0, g); sw.visible = false; room.userData.bath.sink = sw; } B(2, 6, 2, '#c9a23c', 0, 17, -4, g); B(1.2, 1.2, 4, '#c9a23c', 0, 19.4, -2, g); }
  { const g = put(334, 0, -140, 0); B(26, 0.5, 16, '#c9b8d8', 0, 0.3, 0, g); B(26, 0.5, 1.4, '#e8e0f0', 0, 0.5, 6.5, g); B(26, 0.5, 1.4, '#e8e0f0', 0, 0.5, -6.5, g); }
  for (let i = 0; i < 3; i++) { const g = at(0, 0, 0); B(14, 3, 12, '#8a6a42', 0, 1.5, 0, g); B(14, 9, 1.4, '#8a6a42', 0, 6, -5.6, g); B(1.4, 9, 12, '#8a6a42', -6.6, 6, 0, g); B(1.4, 9, 12, '#8a6a42', 6.6, 6, 0, g); B(11, 2, 9, '#d6b866', 0, 3.4, 0, g); if (i !== 1) { B(3.2, 2.6, 3.2, '#f4ecd8', -1, 5.4, 0, g); if (i === 2) B(3.2, 2.6, 3.2, '#f4ecd8', 2.4, 5.4, 1.4, g); } movable('layingRoost' + (i + 1), 'Laying roost ' + (i + 1), g, { x: 412, z: -228 - i * 14, ry: -Math.PI / 2 }); }
  let hayN = 0;
  for (const [x, z] of [[330, -232], [352, -222], [268, -322], [352, -246]]) { const g = at(0, 0, 0), hry = R() * 3; B(16, 9, 12, '#d6b866', 0, 4.5, 0, g); const straws = at(0, 0, 0); straws.userData.noCollide = true; g.add(straws); for (let i = 0; i < 6; i++) B(1, 6, 1, '#e8cf80', (R() - 0.5) * 14, 11, (R() - 0.5) * 10, straws).rotation.z = (R() - 0.5) * 1.4; movable('hay' + (++hayN), 'Hay bale', g, { x, z, ry: hry }); }
  for (let i = 0; i < 2; i++) { const g = at(0, 0, 0); B(1.6, 16, 1.6, '#5a4026', -8, 8, 0, g); B(1.6, 16, 1.6, '#5a4026', 8, 8, 0, g); B(20, 1.6, 1.6, '#6a4a2e', 0, 15, 0, g); B(18, 1.2, 1.2, '#5a4026', 0, 9, 0, g); movable('perch' + (i + 1), 'Perch', g, { x: 344 + i * 22, z: -214, ry: 0 }); }
  let dirtN = 0;
  { const g = at(0, 0, 0); B(16, 3, 16, '#6a2860', 0, 12, 0, g); B(3, 24, 16, '#5a2052', -8, 20, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(2, 10.5, 2, '#3a2a20', sx * 6.5, 5.25, sz * 6.5, g); movable('roostChair', 'Straight-backed chair (under the east window)', g, { x: 406, z: -276, ry: Math.PI }); }
  // the dirt to sweep: patches of earth and spilt grain, none within 42 of the door (273, -222), where Gerda and Jack stand to talk
  for (const [x, z, r] of [[318, -270, 9], [350, -268, 11], [300, -296, 8], [340, -240, 7], [262, -300, 8], [366, -238, 6], [330, -262, 7], [392, -304, 8], [330, -312, 7], [372, -262, 7]]) { const g = at(0, 0, 0); B(r * 2, 0.3, r * 1.6, '#4a3722', 0, 0.2, 0, g); for (let i = 0; i < 5; i++) B(2.2, 0.35, 0.7, '#c9a54a', (i - 2) * r * 0.5, 0.45, ((i * 7) % 5 - 2) * 1.2, g).rotation.y = i; movable('dirt' + (++dirtN), 'Dirt to sweep', g, { x, z, ry: x * 0.1 }); }
  // — the garden: stepping-stones, a low bench, barrels, a rain butt, a little fence round the herbs, herbs in pots on the kitchen step —
  for (let i = 0; i < 9; i++) B(12, 1.2, 10, pick(['#b8b09c', '#a8a08c', '#c8c0aa']), 162 + R() * 3, 0.4, -112 - i * 14, room);
  for (let i = 0; i < 9; i++) B(12, 1.2, 10, pick(['#b8b09c', '#a8a08c', '#c8c0aa']), 162 - i * 14, 0.4, -129 - R() * 2, room).rotation.y = (R() - 0.5) * 0.3;
  { const g = put(30, 0, -340, 0); B(40, 3, 10, '#6a4a2e', 0, 16, 0, g); for (const sx of [-1, 1]) B(3, 14, 8, '#4a3420', sx * 16, 7, 0, g); B(40, 12, 2, '#6a4a2e', 0, 22, -4, g); }
  for (const [x, z] of [[-60, -334], [-48, -330], [60, -338]]) { const g = put(x, 0, z, 0); B(12, 16, 12, '#7a5a3a', 0, 8, 0, g); for (const y of [4, 12]) B(13.2, 1.4, 13.2, '#3a3a40', 0, y, 0, g); B(10, 1, 10, '#5a8aa8', 0, 16.2, 0, g); }
  { const g = put(154, 0, -122, 0); for (let i = 0; i < 4; i++) { B(7, 6, 7, '#a8583a', -12 + i * 8, 3, 0, g); B(4, 2 + R() * 3, 4, pick(['#4a8a3a', '#6a9a4a', '#8a3a6a']), -12 + i * 8, 8, 0, g); } }
  for (const [x0, x1, z] of [[-90, -22, -122]]) for (let x = x0; x <= x1; x += 8) { B(1.4, 8 + (x % 3), 1.4, '#6a4a2e', x, 4, z, room); }
  B(70, 1.2, 1.2, '#6a4a2e', -56, 6, -122, room); B(70, 1.2, 1.2, '#6a4a2e', -56, 3, -122, room);

  const bounds = { x0: -330, x1: 430, z0: -365, z1: 124 };
  { const into = (d, ok) => { d.og.updateMatrixWorld(true); const B = new THREE.Box3().setFromObject(d.lg); if (!ok((B.min.x + B.max.x) / 2, (B.min.z + B.max.z) / 2)) d.lg.rotation.y = -d.lg.rotation.y; };     // (the doors of the library, the music hall and the nursery open into those rooms, not into the corridors)
    for (let i = doors.length - 1; i >= 0; i--) { const d = doors[i]; if (d.axis === 'x' && d.fixed === -273 && Math.abs(d.c + 25.5) < 6) { d.og.parent && d.og.parent.remove(d.og); doors.splice(i, 1); } }       // (no doors at the west end of corridor A, where it meets corridor B)
    for (const d of doors) { if (d.axis === 'x' && d.fixed === -273 && (Math.abs(d.c + 100) < 6 || Math.abs(d.c - 44) < 6)) into(d, x => x > -273); else if (d.axis === 'z' && d.fixed === -160 && Math.abs(d.c + 294) < 6) into(d, (x, z) => z < -160); } }
  const views = { front: [[40, 36, 420], [40, 30, 100]], top: [[40, 760, 20], [40, 0, -120]], iso: [[330, 380, 300], [30, 0, -110]], hall: [[0, 40, 104], [0, 22, -60]], hearth: [[0, 40, -96], [0, 20, 40]], west: [[-100, 38, -26], [-270, 20, -26]], corridorB: [[-294, 40, 90], [-294, 18, -150]], library: [[-100, 38, -100], [-240, 14, -110]], playroom: [[-110, 44, -170], [-250, 10, -250]], kitchen: [[100, 40, 48], [190, 12, -30]], roost: [[256, 44, -214], [320, 14, -280]], garden: [[-80, 60, -120], [100, 4, -250]] };
  return {
    scene, room, ceiling: ceil, windows, doors, hallLeaves, items, place, layout: () => { const o = {}; for (const k in items) { const g = items[k].g; o[k] = { x: +g.position.x.toFixed(1), z: +g.position.z.toFixed(1), ry: +g.rotation.y.toFixed(3) }; } return o; },
    W: bounds.x1 - bounds.x0, D: bounds.z1 - bounds.z0, H, bounds, rooms, views, woman: room.userData.woman,
    update(dt, t) { for (const f of flames) { const s = f.base * (0.8 + 0.55 * Math.sin(t * 9 + f.ph) * Math.sin(t * 5.3 + f.ph * 2)); f.m.scale.y = Math.max(0.3, s / f.base); } for (const a of anim) a(t); },
  };
}
// The castle's outside, for the cloud meadow: the same plan as the inside (every room's outer walls, the hall a third higher), in the meadow's moonlit bone, but dressed as a castle out of a story:
//   a gabled hall with a rose window and a pointed great arch, slim gate towers, round turrets with coloured slate cones and gold finials, hipped roofs on the wings, pointed windows, a corbelled bay, battlements,
//   and a tower over the parlour and stair hall (one storey above the rest, with a spire); pennants, chimney smoke, birds and drifting wisps of cloud.
//   exterior(group, { stone(rx, ry), win, glints, rnd, ox, oz, gateZ, sideX }): adds its meshes to `group` (the hall's front face lands on z = oz + 112, the great door at x = ox);
//   returns { door, solids: [[x, z, r]…] (what Jack cannot walk through), update(t) }.
function exterior(group, o) {
  const stone = (w, h) => { const m = o.stone(Math.max(1, w / 26), Math.max(1, h / 22)); m.color.setHex(0x585b68); m.emissive.setHex(0x0a0c14); m.fog = false; return m; }, ox = o.ox || 0, oz = o.oz || 0, anim = [], solids = [];
  const put = (w, h, d, m, x, y, z) => box(w, h, d, m, x + ox, y, z + oz, group);
  const lam = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e === undefined ? 0x161b2a : e, fog: false });
  const trim = lam(0x6c6f7a, 0x080a10), plinth = lam(0x3c3e48, 0x06070c), gold = lam(0x4a4538, 0x0a0a08), wood = lam(0x3a2a20, 0x0a0806), iron = lam(0x2b2d36, 0x08090c);
  const slates = [0x10131c, 0x1a1220, 0x0f1a1e, 0x1e1618, 0x101524].map(c => { const m = lam(c, 0x04050a); m.side = THREE.DoubleSide; return m; });
  const warm = new THREE.MeshBasicMaterial({ color: 0xb8863f }), glass = new THREE.MeshBasicMaterial({ color: 0x3a1a26 });
  const flat = g => { g = g.toNonIndexed(); g.computeVertexNormals(); return g; };
  const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x + ox, y, z + oz); group.add(m); return m; };
  const tri = (arr) => { const g = new THREE.BufferGeometry(), p = []; for (const t of arr) p.push(...t[0], ...t[1], ...t[2]); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g; };
  // roofs: a hip (ridge along the long side; a pyramid when square), a gable (vertical ends), a four-sided spire
  const hipGeo = (L, S, h) => { const r = (L - S) / 2, a = [-L / 2, 0, -S / 2], b = [L / 2, 0, -S / 2], c = [L / 2, 0, S / 2], d = [-L / 2, 0, S / 2], r0 = [-r, h, 0], r1 = [r, h, 0]; return tri([[d, c, r1], [d, r1, r0], [b, a, r0], [b, r0, r1], [a, d, r0], [c, b, r1]]); };
  const gableGeo = (L, S, h) => { const a = [-L / 2, 0, -S / 2], b = [L / 2, 0, -S / 2], c = [L / 2, 0, S / 2], d = [-L / 2, 0, S / 2], r0 = [-L / 2, h, 0], r1 = [L / 2, h, 0]; return tri([[d, c, r1], [d, r1, r0], [b, a, r0], [b, r0, r1], [a, d, r0], [c, b, r1]]); };
  const roof = (cx, cz, w, d, h, y, mat, gable) => { const L = Math.max(w, d), S = Math.min(w, d), m = mesh((gable ? gableGeo : hipGeo)(L, S, h), mat, cx, y, cz); if (d > w) m.rotation.y = Math.PI / 2; return m; };
  const spire = (cx, cz, w, d, h, y, mat) => { const m = mesh(flat(new THREE.CylinderGeometry(0, w / Math.SQRT2, h, 4)), mat, cx, y + h / 2, cz); m.rotation.y = Math.PI / 4; m.scale.z = d / w; return m; };
  // pennants, waving
  const pennant = (x, y, z, col, ph) => { return; const pole = put(0.7, 15, 0.7, iron, x, y + 7.5, z), fl = new THREE.Group(); fl.position.set(x + ox, y + 12, z + oz); group.add(fl); box(11, 5.4, 0.4, lam(col, 0x201010), 5.5, 0, 0, fl); box(5, 2.4, 0.5, gold, 11.4, 0, 0, fl); anim.push(t => { fl.rotation.y = Math.sin(t * 2.1 + ph) * 0.35; }); };
  // a round (eight-sided) turret: stone shaft with a ring under the cone, slits, a coloured cone, a gold finial; `y0` lifts it onto a roof or ledge
  const turret = (x, z, r, h, rh, ci, flag, y0) => {
    y0 = y0 || 0; mesh(new THREE.CylinderGeometry(r, r, h, 8), stone(Math.PI * 2 * r, h), x, y0 + h / 2, z); mesh(new THREE.CylinderGeometry(r + 1.8, r + 1.8, 4, 8), trim, x, y0 + h - 2, z); mesh(new THREE.CylinderGeometry(r + 1, r + 1, 4, 8), stone(r * 6, 4), x, y0 + h - 6, z);
    mesh(flat(new THREE.CylinderGeometry(0, r + 4.5, rh, 8)), slates[ci % slates.length], x, y0 + h + rh / 2, z); put(1.6, 7, 1.6, gold, x, y0 + h + rh + 3, z); put(3, 3, 3, gold, x, y0 + h + rh - 1, z);
    for (const yy of [0.35, 0.7]) for (let k = 0; k < 4; k++) { const a = Math.PI / 8 + k * Math.PI / 2 + (k % 2) * Math.PI / 4; if (h > 30 || yy < 0.5) put(3.2, 9, 1, o.win, x + Math.sin(a) * (0.924 * r + 0.3), y0 + h * yy, z + Math.cos(a) * (0.924 * r + 0.3)).rotation.y = a; }
    if (flag) pennant(x, y0 + h + rh + 6, z, [0xb83a4a, 0x3a6ab8, 0xe8b830][ci % 3], ci); solids.push([x + ox, z + oz, r + 3]);
  };
  // ── the walls: each room's outer shell, a base course, an eave band and its roof ──
  const rooms = [[-92, 92, -112, 112, HH], [-275, -88, -45, -6, H], [-316, -271, -162, 99, H], [-275, -91, -2, 90, H], [-275, -91, -148, -49, H], [-316, -97, -295, -158, H], [88, 252, -113, 55, H], [248, 378, -111, -6, H], [249, 377, -10, 55, H], [248, 297, -209, -107, H], [293, 384, -204, -113, H], [248, 392, -332, -206, H]];
  rooms.forEach(([x0, x1, z0, z1, h], i) => { const e = i * 0.07, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    put(w, h + e, d, stone(Math.max(w, d), h), cx, (h + e) / 2, cz); put(w + 6, 5, d + 6, plinth, cx, 2.5, cz); put(w + 5, 6, d + 5, stone(w, 6), cx, h + e + 3, cz);
    if (i === 0) { roof(cx, cz, w + 14, d + 14, 66, h + 6, slates[0], true); } else roof(cx, cz, w + 12, d + 12, Math.min(46, Math.max(18, Math.min(w, d) * 0.36)), h + 6, slates[[1, 2, 3, 4, 0, 1, 2, 3, 4, 1, 2][i - 1] % slates.length]); });
  // the hall: a rose window in the gable, the pointed great arch over the door, a chimney with smoke
  { const gy = HH + 6 + 24; mesh(new THREE.CylinderGeometry(15, 15, 1.4, 12), trim, 0, gy, 118.4).rotation.x = Math.PI / 2; mesh(new THREE.CylinderGeometry(12.4, 12.4, 1.8, 12), glass, 0, gy, 118.6).rotation.x = Math.PI / 2;
    put(1.2, 25, 2, trim, 0, gy, 119.4); put(25, 1.2, 2, trim, 0, gy, 119.4); put(1.2, 25, 2, trim, 0, gy, 119.4).rotation.z = Math.PI / 4; put(1.2, 25, 2, trim, 0, gy, 119.4).rotation.z = -Math.PI / 4; put(7, 7, 2, gold, 0, gy, 119.6); }
  for (let i = 0; i < 12; i++) { const k = i / 12, w = 70 * (1 - Math.pow(k, 1.35)); if (w < 2) break; put(w, 3.2, 3, wood, 0, 75 + i * 3 + 1.6, 113.5); put(w + 14 - i * 0.6, 3.2, 5, trim, 0, 75 + i * 3 + 1.6, 114.4 - 1.2); }
  for (const sx of [-1, 1]) put(7, 78, 5, trim, sx * 38.5, 39, 114.2);
  pennant(0, HH + 6 + 66, 0, 0xb83a4a, 0.5);
  // smoke from the hearths: the hall's, and the kitchen's
  const smokes = []; const chimney = (x, z, y, hh) => { put(12, hh, 12, stone(12, hh), x, y + hh / 2, z); put(15, 3, 15, trim, x, y + hh + 1.5, z); for (let i = 0; i < 9; i++) { const m = put(5, 5, 5, new THREE.MeshLambertMaterial({ color: 0xcfd2d6, transparent: true, opacity: 0.6, emissive: 0x20242c }), x, y + hh + 5, z); smokes.push({ m, x: x + ox, y0: y + hh + 4, z: z + oz, t: i / 9 }); } };
  chimney(0, -100, HH, 70); chimney(236, 5, H + 6, 48);
  anim.push((t, dt) => { for (const s of smokes) { s.t = (s.t + (dt || 0.016) * 0.1) % 1; s.m.position.set(s.x + Math.sin(s.t * 6) * 3 + s.t * 16, s.y0 + s.t * 70, s.z); s.m.scale.setScalar(0.5 + s.t * 1.7); s.m.material.opacity = 0.6 * (1 - s.t); } });
  // ── turrets: the hall's four corners, the slim pair that flank the great door, the wings' corners ──
  [[-92, 108, 17, 150, 60, 0, 1], [92, 108, 17, 150, 60, 1, 1], [-92, -108, 15, 140, 52, 2], [92, -108, 15, 140, 52, 3], [-42, 108, 7, 140, 46, 4], [42, 108, 7, 140, 46, 4],
   [-316, 99, 14, 112, 46, 1], [-316, -162, 11, 104, 40, 2], [-316, -295, 14, 118, 50, 0, 1], [-97, -295, 12, 108, 44, 3], [-91, 90, 10, 104, 38, 4],
   [88, 55, 12, 106, 44, 2], [378, 55, 14, 120, 50, 1, 1], [392, -332, 16, 128, 54, 3, 1], [248, -332, 12, 104, 40, 0], [384, -113, 10, 100, 38, 4]].forEach(t => turret(t[0], t[1], t[2], t[3], t[4], t[5], t[6]));
  // a corbelled bay hanging off the music hall's front, and a stepped one off the kitchen
  for (const [bx, bz, bw] of [[-143, 96, 30], [153, 61, 30]]) { put(bw, 4, 12, trim, bx, 22, bz); put(bw - 4, 36, 10, stone(bw, 36), bx, 42, bz); put(bw + 2, 3, 12, trim, bx, 61, bz); roof(bx, bz, bw + 6, 16, 18, 62.5, slates[bx < 0 ? 2 : 3]); for (const dx of [-8, 0, 8]) { put(5, 14, 1, o.win, bx + dx, 44, bz + 5.4); put(3.4, 3, 1, o.win, bx + dx, 52, bz + 5.4); } }
  // ── the tower, over the parlour and the stair hall: one storey above the rest, with four little turrets and a spire ──
  const tx = 314, tz = -12, TW = 104, TD = 116, TH = H + 86; put(TW, TH, TD, stone(TD, TH), tx, TH / 2, tz); put(TW + 6, 7, TD + 6, plinth, tx, H + 5, tz); put(TW + 8, 6, TD + 8, stone(TW, 6), tx, TH + 3, tz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { turret(tx + sx * (TW / 2 + 1), tz + sz * (TD / 2 + 1), 8, 34, 30, sx > 0 ? 1 : 2, 0, TH - 10); for (let y = H + 12; y < TH; y += 16) put(6, 8, 6, (y / 16 | 0) % 2 ? trim : stone(8, 8), tx + sx * (TW / 2), y, tz + sz * (TD / 2)); }
  spire(tx, tz, TW + 14, TD + 14, 112, TH + 6, slates[0]); put(1.8, 9, 1.8, gold, tx, TH + 6 + 112 + 4, tz); put(4, 4, 4, gold, tx, TH + 6 + 112 - 1, tz); pennant(tx, TH + 6 + 112 + 8, tz, 0xb83a4a, 1.3);
  // ── windows: pointed, with a lighter surround; a few lit warm; the dark slit's old glint ──
  let wn = 0;
  const slit = (axis, face, c, y, w, h, out) => { const z_ = axis === 'z', lit = ((wn++ * 7) % 10) < 2, m = lit ? warm : o.win, pw = (ww, hh, dd, mat, f, cc, yy) => { const pos = face + out * f; return z_ ? put(ww, hh, dd, mat, cc, yy, pos) : put(dd, hh, ww, mat, pos, yy, cc); };
    pw(w + 4, h + 3, 1.2, trim, 0.6, c, y); pw(w, h, 0.8, m, 1.4, c, y);
    if (h >= 18) for (let i = 0; i < 3; i++) { pw(w + 4 - i * 2.4 - 2, 2.4, 1.2, trim, 0.6, c, y + h / 2 + 2.4 + i * 2.4); pw(w * (0.82 - i * 0.28), 2.4, 0.8, m, 1.4, c, y + h / 2 + 1.2 + i * 2.4); }
    if (!lit) { const gm = new THREE.MeshBasicMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.1, depthWrite: false }), g = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.9), gm), pos = face + out * 1.9; g.position.set((z_ ? c : pos) + ox, y, (z_ ? pos : c) + oz); g.rotation.y = z_ ? (out > 0 ? 0 : Math.PI) : (out > 0 ? Math.PI / 2 : -Math.PI / 2); group.add(g); o.glints.push({ m: gm, ph: o.rnd() * 6.28 }); } };
  for (const w of interior().windows) slit(w.axis, w.fixed - w.dirSign * 2, w.c, (w.y0 + w.y1) / 2, w.w, w.y1 - w.y0, -w.dirSign);
  for (const dx of [-30, 0, 30]) { slit('z', tz + TD / 2, tx + dx, H + 44, 12, 30, 1); slit('z', tz - TD / 2, tx + dx, H + 44, 12, 30, -1); }
  for (const dz of [-34, 0, 34]) { slit('x', tx + TW / 2, tz + dz, H + 44, 12, 30, 1); slit('x', tx - TW / 2, tz + dz, H + 44, 12, 30, -1); }
  // ── climbing green on the lower fronts, and the garden's wall with its battlements ──
  const greens = ['#3a4a34', '#44543a', '#2e3e2c', '#4a5a40'];
  for (const [x0, x1, z, avoid] of [[-92, 92, 112, 40], [-316, -271, 99, 0], [-275, -91, 90, 0], [88, 252, 55, 0], [249, 377, 55, 0]]) for (let i = 0; i < 12; i++) { const w = 4 + o.rnd() * 9, x = x0 + o.rnd() * (x1 - x0); if (Math.abs(x) < avoid) continue; put(w, 5 + o.rnd() * 15, 0.7, lam(new THREE.Color(greens[i % 4]).getHex(), 0x050805), x, 2 + (5 + o.rnd() * 10) / 2, z + 2.2); }
  put(349, 56, 4, stone(349, 56), 77.5, 28, -348); put(4, 56, 237, stone(237, 56), -95, 28, -229.5); put(353, 4, 8, stone(353, 4), 77.5, 58, -348); put(8, 4, 241, stone(241, 4), -95, 58, -229.5);
  for (let x = -90; x < 250; x += 12) put(6, 6, 5, stone(6, 6), x, 63, -348); for (let z = -340; z < -112; z += 12) put(5, 6, 6, stone(6, 6), -95, 63, z);
  // ── the forecourt's gate: two pillars with caps and lanterns, and a low battlemented wall along the kerb ──
  if (o.gateZ !== undefined) { const wz = o.gateZ, W = (w, h, d, m, x, y, z) => box(w, h, d, m, x, y, z, group);
    for (const sx of [-1, 1]) { W(7, 24, 7, stone(7, 24), sx * 18, 12, wz); W(9, 3, 9, trim, sx * 18, 25, wz); const cone = new THREE.Mesh(flat(new THREE.CylinderGeometry(0, 7, 12, 8)), slates[sx > 0 ? 1 : 0]); cone.position.set(sx * 18, 32, wz); group.add(cone); W(1.4, 5, 1.4, gold, sx * 18, 40, wz); W(3, 4, 3, warm, sx * 18, 28.5, wz + 4); solids.push([sx * 18, wz, 5]); }
    for (const sx of [-1, 1]) { W(74, 7, 3, stone(74, 7), sx * 55, 3.5, wz); for (let x = 22; x < 90; x += 9) W(5, 4, 3, stone(5, 4), sx * x, 9, wz); const sxw = o.sideX; W(3, 7, 104, stone(104, 7), sx * sxw, 3.5, wz - 52); for (let z = wz - 100; z < wz; z += 9) W(3, 4, 5, stone(5, 4), sx * sxw, 9, z); } }
  // ── life: birds round the tower, wisps of cloud drifting past the turrets ──
  const birds = []; for (let i = 0; i < 5; i++) { const g = new THREE.Group(); group.add(g); box(3, 1, 4, iron, 0, 0, 0, g); const wl = box(5, 0.4, 2, iron, -3.5, 0.3, 0, g), wr = box(5, 0.4, 2, iron, 3.5, 0.3, 0, g); birds.push({ g, wl, wr, ph: i * 1.3, R: 105 + i * 14, y: TH + 20 + i * 11 }); }
  anim.push(t => { for (const b of birds) { const a = t * (0.22 + 0.02 * b.ph) + b.ph; b.g.position.set(tx + ox + Math.cos(a) * b.R, b.y + Math.sin(t * 0.7 + b.ph) * 4, tz + oz + Math.sin(a) * b.R * 0.9); b.g.rotation.y = -a; b.wl.rotation.z = Math.sin(t * 9 + b.ph) * 0.6; b.wr.rotation.z = -Math.sin(t * 9 + b.ph) * 0.6; } });
  const wisps = []; for (let i = 0; i < 7; i++) { const g = new THREE.Group(), cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, emissive: 0x20242c }); for (let k = 0; k < 4; k++) box(16 + o.rnd() * 14, 4 + o.rnd() * 3, 10 + o.rnd() * 8, cm, k * 14 - 20, o.rnd() * 3, o.rnd() * 6, g); group.add(g); wisps.push({ g, x: [-60, 140, 330, 230, -200, 30, 400][i], y: [150, 190, 200, 120, 130, 170, 140][i], z: [-60, -150, 60, -250, -120, 140, -200][i], ph: i * 2.1 }); }
  anim.push(t => { for (const w of wisps) w.g.position.set(w.x + ox + Math.sin(t * 0.05 + w.ph) * 40, w.y, w.z + oz + Math.cos(t * 0.04 + w.ph) * 15); });
  return { door: { w: 70, h: 75, z: oz + 112, x: ox }, solids, update: (t, dt) => { for (const a of anim) a(t, dt); } };
}
root.Castle = { interior, exterior, H, HH };
})(typeof window !== 'undefined' ? window : globalThis);
