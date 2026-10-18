// Climbing Toward Consequence — the family homestead, in blocky Minecraft style: Farm.exterior() is the hillside seen by the drone (cottage, barren garden, cowshed, stone wall and gate,
// the path down the valley); Farm.interior() is the cottage's one room (the hearth, the chair and the stool, the table, the cabinet, the stairs, the undusted corners).
// World units are skin pixels (Jack stands about 30 tall), x east, z south, y up; the plateau the cottage stands on is y = 0.
(function (root) {
'use strict';
const THREE = root.THREE, Cast = root.Cast, B = root.Blocky;
const { clothBox, clothTexture, noise, lam, col } = Cast;
const V3 = THREE.Vector3;

// A seeded random, so the farm looks the same every time.
const rng = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const tex = (base, tones, seed, density, extra) => clothTexture(x => { noise(x, base, tones, seed, density); if (extra) extra(x); });
const T = {};                                                                    // the pixel textures, made once
function textures() {
  if (T.grass) return T;
  T.grass = tex('#5f8f3a', ['#6aa044', '#538030', '#78b050', '#4a7a2c'], 1, 0.5);
  T.grassSide = tex('#7a5a3a', ['#6a4c30', '#8a6844', '#5a3e28'], 2, 0.4, x => { x.fillStyle = '#5f8f3a'; x.fillRect(0, 0, 16, 5); x.fillStyle = '#538030'; x.fillRect(1, 5, 3, 2); x.fillRect(8, 5, 4, 1); });
  T.dirt = tex('#7a5a3a', ['#6a4c30', '#8a6844', '#5a3e28', '#8f6f48'], 3, 0.45);
  T.path = tex('#ad8f5f', ['#a08454', '#bd9f6c', '#94784a'], 4, 0.4);
  T.garden = tex('#6b5236', ['#5a4430', '#7a6040', '#4a3828', '#8a6e48'], 5, 0.5, x => { x.fillStyle = '#4a3828'; x.fillRect(0, 4, 16, 1); x.fillRect(0, 11, 16, 1); });
  T.stone = tex('#8c8a84', ['#7a7872', '#9a9890', '#6a6862', '#a8a69e'], 6, 0.5, x => { x.fillStyle = '#5e5c56'; x.fillRect(0, 5, 16, 1); x.fillRect(0, 11, 16, 1); x.fillRect(5, 0, 1, 5); x.fillRect(11, 6, 1, 5); x.fillRect(3, 12, 1, 4); });
  T.plaster = tex('#d9ccae', ['#cdbf9f', '#e4d8bc', '#bfb190'], 7, 0.35);
  T.plasterOld = tex('#bfb190', ['#a89a7a', '#cdbf9f', '#8f8468'], 8, 0.5);
  T.timber = tex('#4a3624', ['#3a2a1a', '#5a4430', '#2e2014'], 9, 0.4);
  T.plank = tex('#8a6c4a', ['#7a5e3e', '#9a7c58', '#6a5034'], 10, 0.4, x => { x.fillStyle = '#5e4630'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 8, 16, 1); });
  T.plankDark = tex('#6a5034', ['#5a4228', '#7a5e3e', '#4a3620'], 11, 0.4, x => { x.fillStyle = '#3e2c1a'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 8, 16, 1); });
  T.thatch = tex('#a88f50', ['#94793c', '#bca262', '#7e6630', '#c9b074'], 12, 0.6, x => { x.fillStyle = '#6e5828'; for (let i = 0; i < 16; i += 3) x.fillRect(i, 0, 1, 16); });
  T.thatchOld = tex('#8a7440', ['#6e5a30', '#a08a54', '#5a4824', '#4a6030'], 13, 0.6, x => { x.fillStyle = '#5a4824'; for (let i = 0; i < 16; i += 3) x.fillRect(i, 0, 1, 16); });
  T.leaf = tex('#3f7a2c', ['#34682a', '#4a8a34', '#2c5a22'], 14, 0.5);
  T.bark = tex('#5a4430', ['#4a3624', '#6a523a'], 15, 0.5);
  T.rug = tex('#7a3a32', ['#8a4a40', '#6a2e28', '#a88a50', '#3a4a5a'], 16, 0.5, x => { x.fillStyle = '#a88a50'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); });
  T.hay = tex('#c9ad5a', ['#b8993f', '#dcc274', '#a4872e'], 17, 0.6);
  T.cloud = tex('#f4f6f8', ['#e8ecf0', '#ffffff'], 18, 0.4);
  return T;
}
const M = new Map(); const mat = (name, color) => { const k = name + (color || ''); if (!M.has(k)) M.set(k, color ? new THREE.MeshLambertMaterial({ map: textures()[name], color }) : lam(textures()[name])); return M.get(k); };
const plain = hex => col(hex);
const unlit = hex => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).convertSRGBToLinear() });
function box(w, h, d, material, x, y, z, parent) { const m = clothBox(w, h, d, material); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
const P = (x, y, z) => new V3(x, y, z);

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The hillside: columns of 12-unit cells, stepped in 6-unit blocks. The plateau (y = 0) holds the cottage; the hills climb on three sides, and the valley falls away south.
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const CELL = 12, NX = 70, NZ = 66, X0 = -NX * CELL / 2, Z0 = -300;
function groundHeight(x, z, r) {
  let h = 0;
  const ax = Math.max(0, Math.abs(x) - 210), north = Math.max(0, -150 - z), south = Math.max(0, z - 150);
  h += Math.round((ax + north) / CELL) * 6;                                             // the hills round the farm
  h -= Math.min(60, Math.round(south / CELL) * 6);                                       // the valley falling away down the path
  if (ax + north > 0) h += Math.round((r() - 0.5) * 2) * 6;
  return h;
}
function pathCell(x, z) {                                                               // the way from the door, out of the gate and down the valley
  const cx = (a, b, w) => Math.abs(x - a) < w && z >= b[0] && z <= b[1];
  if (cx(34, [20, 62], 12) || (Math.abs(z - 62) < 12 && x >= -2 && x <= 36) || cx(0, [62, 140], 12)) return true;
  if (z > 140) { const mx = 40 * Math.sin((z - 140) / 70) - 10 * Math.sin((z - 140) / 31); return Math.abs(x - mx) < 14; }
  return false;
}
// The plot to be dug in the arable land (the gardening sequence): a 3 x 3 of cells, 15 units each, centred here.
const PLOT = { cx: -118, cz: 10, cell: 15, n: 3 };
const inPlot = (x, z, m) => Math.abs(x - PLOT.cx) < PLOT.cell * PLOT.n / 2 + (m || 0) && Math.abs(z - PLOT.cz) < PLOT.cell * PLOT.n / 2 + (m || 0);
function gardenCell(x, z) { return x > -190 && x < -78 && z > -50 && z < 70; }

function buildTerrain(scene) {
  const T_ = textures(), r = rng(77);
  const geo = new THREE.BoxGeometry(CELL, 6, CELL);
  const mk = (top, side, count) => { const m = new THREE.InstancedMesh(geo, [side, side, top, side, side, side], count); m.instanceMatrix.setUsage(THREE.StaticDrawUsage); return m; };
  const cells = [], Hs = [];
  for (let i = 0; i < NX; i++) { Hs[i] = []; for (let j = 0; j < NZ; j++) Hs[i][j] = groundHeight(X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL, r); }
  let nGrass = 0, nPath = 0, nGarden = 0, nDirt = 0;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL, h = Hs[i][j];
    const type = pathCell(x, z) && h <= 6 ? 'path' : gardenCell(x, z) && h === 0 ? 'garden' : 'grass';
    let low = h; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = Hs[i + di] && Hs[i + di][j + dj]; if (n !== undefined) low = Math.min(low, n); }
    cells.push({ x, z, h, type, low }); if (type === 'grass') nGrass++; else if (type === 'path') nPath++; else nGarden++;
    nDirt += Math.max(0, Math.round((h - 6 - low) / 6)) + 1;
  }
  const g = mk(mat('grass'), mat('grassSide'), nGrass), p = mk(mat('path'), mat('dirt'), nPath), ga = mk(mat('garden'), mat('dirt'), nGarden), d = mk(mat('dirt'), mat('dirt'), nDirt + 40);
  let ig = 0, ip = 0, iga = 0, id = 0; const m4 = new THREE.Matrix4(), c = new THREE.Color();
  for (const cell of cells) {
    const target = cell.type === 'grass' ? g : cell.type === 'path' ? p : ga, idx = cell.type === 'grass' ? ig++ : cell.type === 'path' ? ip++ : iga++;
    m4.setPosition(cell.x, cell.h - 3, cell.z); target.setMatrixAt(idx, m4);
    const v = 0.9 + 0.2 * r(); c.setRGB(v, v, v); target.setColorAt(idx, c);
    for (let y = cell.h - 9; y >= Math.min(cell.low, cell.h - 6) - 6 && y > -70; y -= 6) { m4.setPosition(cell.x, y, cell.z); d.setMatrixAt(id, m4); const q = 0.85 + 0.2 * r(); c.setRGB(q, q, q); d.setColorAt(id++, c); if (id >= nDirt + 40) break; }
  }
  g.count = ig; p.count = ip; ga.count = iga; d.count = id;
  for (const m of [g, p, ga, d]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); }
}

function tree(x, z, y, s, parent, r, dead) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const h = (18 + r() * 14) * s; box(5 * s, h, 5 * s, mat('bark'), 0, h / 2, 0, g);
  if (dead) { box(2 * s, 14 * s, 2 * s, mat('bark'), 5 * s, h - 3 * s, 0, g).rotation.z = -0.9; box(2 * s, 10 * s, 2 * s, mat('bark'), -4 * s, h - 6 * s, 1, g).rotation.z = 0.8; box(1.5 * s, 8 * s, 1.5 * s, mat('bark'), 1, h + 3 * s, 3 * s, g).rotation.x = 0.6; }
  else { for (const [w, up, hh] of [[22, 0, 10], [16, 8, 9], [10, 15, 8]]) box(w * s, hh * s, w * s, mat('leaf'), 0, h + up * s - 2 * s, 0, g); }
  parent.add(g); return g;
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The exterior.
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function exterior() {
  textures();
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xbcd8ee); scene.fog = new THREE.Fog(0xcfe4f2, 650, 1700);
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x6a5a40, 0.95)); const sun = new THREE.DirectionalLight(0xfff1d6, 0.85); sun.position.set(220, 300, 160); scene.add(sun);
  buildTerrain(scene);
  const r = rng(5), farm = new THREE.Group(); scene.add(farm);

  // The cottage: stone footings, plaster and timber walls (the plaster flaking), a thatched roof stepped like stairs and slumped in one corner, a leaning chimney.
  const W = 132, D = 96, WH = 46, cz = -30, cottage = new THREE.Group(); cottage.position.set(0, 0, cz); farm.add(cottage);
  box(W + 6, 14, D + 6, mat('stone'), 0, 7, 0, cottage);                                                                       // the footing
  box(W, WH - 14, D, mat('plasterOld'), 0, 14 + (WH - 14) / 2, 0, cottage);
  for (const x of [-W / 2, -W / 6, W / 6, W / 2]) for (const sz of [-1, 1]) box(4, WH - 14, 5, mat('timber'), x, 14 + (WH - 14) / 2, sz * (D / 2 + 0.2), cottage);   // the timber frame, front and back
  for (const z of [-D / 2, D / 2]) { box(W + 4, 4, 5, mat('timber'), 0, 14 + 2, z, cottage); box(W + 4, 4, 5, mat('timber'), 0, WH - 2, z, cottage); }
  for (const sx of [-1, 1]) for (const z of [-D / 2, 0, D / 2]) box(5, WH - 14, 4, mat('timber'), sx * (W / 2 + 0.2), 14 + (WH - 14) / 2, z, cottage);
  for (let i = 0; i < 26; i++) { const sz = r() < 0.7 ? 1 : -1, px = (r() - 0.5) * (W - 20), py = 18 + r() * 24; box(4 + r() * 8, 3 + r() * 6, 0.6, mat('plaster', 0x8a7a5a), px, py, sz * (D / 2 + 0.5), cottage); }   // plaster fallen away, the lath showing
  // The roof: layers 4 high, each narrower than the one below, with the eaves overhanging.
  const roof = new THREE.Group(); roof.position.y = WH; cottage.add(roof);
  for (let i = 0; i < 13; i++) {
    const wz = D + 20 - i * 8; if (wz < 6) break; const old = i % 4 === 1;
    box(W + 16, 4.2, wz, mat(old ? 'thatchOld' : 'thatch'), 0, 2 + i * 4, 0, roof);
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 13; i++) { const wz = D - i * 8; if (wz < 4) break; box(2, 4, wz, mat('plasterOld'), sx * (W / 2 - 1), 2 + i * 4, 0, roof); }   // the gable ends
  box(24, 3, 20, plain('#2a2218'), -34, 36, 18, roof).rotation.y = 0.2;                                                         // a hole where the thatch has gone
  for (let i = 0; i < 9; i++) box(5 + r() * 9, 1.2, 4 + r() * 8, plain(['#4a6a2a', '#5a7a34', '#3e5a24'][i % 3]), (r() - 0.5) * (W - 20), 18 + r() * 14, (r() - 0.5) * 60 + 8, roof);   // moss
  const chimney = new THREE.Group(); chimney.position.set(2, WH, -D / 2 + 12); cottage.add(chimney); chimney.rotation.z = 0.05;
  box(18, 74, 16, mat('stone'), 0, 37, 0, chimney); box(22, 4, 20, mat('stone'), 0, 76, 0, chimney); box(8, 3, 8, plain('#1a1612'), 0, 78, 0, chimney);
  // Windows (south wall): glass lit by the fire inside; the left one, the one the camera comes down to, has a shutter hanging by one hinge and a dead window box.
  const glow = unlit('#ffcf7a'), windows = [];
  for (const [x, hang] of [[-34, true], [8, false]]) {
    const wd = new THREE.Group(); wd.position.set(x, 30, D / 2 + 1); cottage.add(wd); windows.push(wd);
    box(22, 20, 3, mat('timber'), 0, 0, 0, wd); box(16, 14, 1.4, glow, 0, 0, 1.2, wd); box(1.6, 14, 1.6, mat('timber'), 0, 0, 2, wd); box(16, 1.6, 1.6, mat('timber'), 0, 0, 2, wd);
    box(26, 3, 6, mat('stone'), 0, -11.6, 2, wd);                                                                                 // the sill
    if (hang) { const sh = box(9, 18, 1.6, mat('plankDark'), -15.5, 0, 3, wd); sh.rotation.z = 0.35; sh.position.y = -3; box(18, 4, 5, mat('plankDark'), 0, -15, 5, wd); for (let i = 0; i < 4; i++) box(0.8, 5 + r() * 4, 0.8, plain('#6a5a3a'), -6 + i * 4, -11 + 3, 5, wd).rotation.z = (r() - 0.5) * 0.8; }
    else { box(9, 18, 1.6, mat('plankDark'), -15.5, 0, 3, wd); box(9, 18, 1.6, mat('plankDark'), 15.5, 0, 3, wd); }
  }
  const door = new THREE.Group(); door.position.set(34, 0, D / 2 + 1); cottage.add(door);                                          // the door, and its worn step
  box(22, 42, 3, mat('timber'), 0, 21, 0, door); box(15, 38, 1.4, unlit('#241408'), 0, 19.5, 1.2, door); box(13, 36, 0.4, unlit('#4a2c14'), 0, 19, 1.9, door);   // the frame, and the dark doorway behind the door
  const doorLeaf = new THREE.Group(); doorLeaf.position.set(-7.5, 0, 2.2); door.add(doorLeaf);                                      // the door itself, hinged on its left edge (closed at rest)
  box(15, 38, 1.8, mat('plankDark'), 7.5, 19.5, 0, doorLeaf); box(2, 2, 2, plain('#b8923a'), 12.5, 19, 1.4, doorLeaf); box(15, 2.6, 2, mat('timber'), 7.5, 8, 0.4, doorLeaf); box(15, 2.6, 2, mat('timber'), 7.5, 30, 0.4, doorLeaf);
  box(26, 3, 10, mat('stone'), 0, 1.5, 6, door);
  // Odds and ends at the door: a woodpile with a chopping block and an axe, a rain barrel.
  for (let i = 0; i < 10; i++) box(14, 4, 4, mat('bark'), 62 + (i % 2) * 1, 2 + Math.floor(i / 2) * 4, -D / 2 + 8 - 0 + (i % 2) * 5 + 12, cottage);
  box(9, 9, 9, mat('bark'), 52, 4.5, 56, cottage);
  box(12, 18, 12, mat('plankDark'), -60, 9, 60, cottage);
  // The hoe, leaning against the cottage's west wall where it looks over the garden: the handle's top against the wall, the blade on the ground, turned out.
  const hoe = new THREE.Group(); hoe.position.set(-76.4, 0, PLOT.cz - 12); hoe.rotation.order = 'YXZ'; hoe.rotation.set(-0.2, -Math.PI / 2, 0); farm.add(hoe);       // (against the cottage's west wall, on the garden side)
  box(1.4, 31, 1.4, mat('plankDark'), 0, 15.5, 0, hoe); box(1.2, 5, 1.2, plain('#4a4a50'), 0, 2.2, 1.6, hoe).rotation.x = -0.5; box(8, 0.9, 4.6, plain('#6a6a72'), 0, 0.6, 3.4, hoe);
  // Smoke from the chimney: grey puffs that rise, widen and fade.
  const smoke = []; for (let i = 0; i < 9; i++) { const s = box(7, 7, 7, new THREE.MeshLambertMaterial({ color: 0xcfd2d6, transparent: true, opacity: 0.6 }), 0, 0, 0, chimney); smoke.push({ m: s, t: i / 9 }); }

  // The grounds: a low, patched stone wall, a gate hanging off one hinge, the barren garden, the cowshed with Milky-White, a bare tree.
  const wall = new THREE.Group(); farm.add(wall); const wx0 = -210, wx1 = 210, wz0 = -118, wz1 = 128;
  const run = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 10); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, h = 9 + Math.round(r() * 3) * 1.5, horiz = Math.abs(z1 - z0) < 1;
    if (Math.abs(x) < 20 && z > 100) continue; box(horiz ? 11 : 6.4, h, horiz ? 6.4 : 11, mat('stone'), x, h / 2, z, wall); } };
  run(wx0, wz0, wx1, wz0); run(wx0, wz1, wx1, wz1); run(wx0, wz0, wx0, wz1); run(wx1, wz0, wx1, wz1);
  const gate = new THREE.Group(); gate.position.set(-17, 0, wz1); farm.add(gate);                                                 // the gate, open on a loose hinge
  box(7, 22, 7, mat('stone'), 0, 11, 0, gate); box(7, 22, 7, mat('stone'), 34, 11, 0, gate);
  const leaf = new THREE.Group(); leaf.position.set(3, 0, 0); leaf.rotation.y = -1.05; gate.add(leaf);
  box(26, 3, 2, mat('plankDark'), 13, 16, 0, leaf); box(26, 3, 2, mat('plankDark'), 13, 8, 0, leaf); for (let i = 0; i < 5; i++) box(3, 17, 2, mat('plankDark'), 3 + i * 5.5, 12, 0.2, leaf);
  box(24, 2, 2, mat('plankDark'), 14, 13, 0.2, leaf).rotation.z = 0.5;
  // The garden: ridges that grew nothing, dry stalks, stones, a leaning scarecrow, a fallen fence.
  for (let i = 0; i < 7; i++) {                                                                                                  // (the ridges stop short of the plot)
    const z = -40 + i * 15;
    if (Math.abs(z - PLOT.cz) < PLOT.cell * PLOT.n / 2 + 4) { const x1 = PLOT.cx - PLOT.cell * PLOT.n / 2 - 5; box(x1 + 182, 3, 6, mat('garden'), (x1 - 182) / 2, 1.5, z, farm); }
    else box(96, 3, 6, mat('garden'), -134, 1.5, z, farm);
  }
  for (let i = 0; i < 40; i++) { const x = -182 + r() * 100, z = -44 + r() * 108, m = box(1, 3 + r() * 7, 1, plain(['#7a6a3a', '#8a7a4a', '#5a4a2a'][i % 3]), x, 4 + r() * 2, z, farm); m.rotation.z = (r() - 0.5) * 0.9; if (inPlot(x, z, 5)) farm.remove(m); }
  for (let i = 0; i < 14; i++) { const x = -180 + r() * 100, z = -44 + r() * 108, m = box(3 + r() * 4, 2 + r() * 3, 3 + r() * 4, mat('stone'), x, 1.5, z, farm); if (inPlot(x, z, 6)) farm.remove(m); }
  const sc = new THREE.Group(); sc.position.set(-150, 0, 20); sc.rotation.z = 0.12; farm.add(sc);
  box(2, 34, 2, mat('bark'), 0, 17, 0, sc); box(24, 2, 2, mat('bark'), 0, 26, 0, sc); box(9, 9, 9, mat('hay'), 0, 36, 0, sc); box(12, 3, 12, plain('#4a3a2a'), 0, 41, 0, sc); box(14, 12, 3, plain('#6a5a48'), 0, 22, 0, sc);
  for (let i = 0; i < 6; i++) box(1.6, 10, 1.6, mat('bark'), -86 + i * 11, 5, 80, farm).rotation.z = (i % 3 - 1) * 0.5; box(70, 1.6, 1.6, mat('bark'), -50, 3, 80, farm).rotation.z = 0.1;
  tree(-96, -70, 0, 1.2, farm, r, true);
  // The cowshed: open at the front, a back wall of planks and a lean-to roof; a trough, some hay, and a rail fence round the yard where the cow stands.
  const shed = new THREE.Group(); shed.position.set(122, 0, -34); farm.add(shed);
  for (const [x, z] of [[-34, -26], [34, -26], [-34, 20], [34, 20]]) box(4, 48, 4, mat('timber'), x, 24, z, shed);
  box(70, 46, 2.4, mat('plankDark'), 0, 23, -26, shed); box(2.4, 46, 46, mat('plankDark'), -34, 23, -3, shed); box(2.4, 46, 46, mat('plankDark'), 34, 23, -3, shed);   // tall enough for a man to stand in with the roof well over his head
  for (let i = 0; i < 9; i++) { const zz = -26 + i * 6; box(82, 4, 8, mat(i % 3 === 1 ? 'thatchOld' : 'thatch'), 0, 57 - i * 1.25, zz + 4 - 9, shed).rotation.x = -0.12; }
  box(20, 7, 5, mat('plank'), -4, 4, 6, shed); box(16, 2, 3, plain('#3a6a8a'), -4, 7.5, 6, shed); box(22, 8, 12, mat('hay'), 18, 4, -17, shed);
  const cow = Cast.makeCow(); cow.position.set(186, 0, 24); cow.rotation.y = -2.2; farm.add(cow);
  tree(-60, -150, 0, 1.3, farm, r); tree(160, -150, 0, 1.2, farm, r); tree(-250, 40, 6, 1.4, farm, r); tree(260, 10, 12, 1.2, farm, r); tree(250, -90, 18, 1.3, farm, r); tree(-240, -120, 18, 1.2, farm, r);
  for (let i = 0; i < 20; i++) { const x = (r() - 0.5) * 520, z = -170 + r() * 80, y = 24 + r() * 14; if (Math.abs(x) > 230 || z < -150) tree(x, z, y - 8, 0.9 + r() * 0.5, scene, r); }
  // Clouds, drifting slowly.
  const clouds = []; for (let i = 0; i < 7; i++) { const c = new THREE.Group(); const n = 3 + Math.floor(r() * 3); for (let k = 0; k < n; k++) box(40 + r() * 40, 10 + r() * 6, 30 + r() * 30, mat('cloud'), k * 34 - n * 17, r() * 6, r() * 20, c); c.position.set(-500 + r() * 1000, 250 + r() * 70, -380 + r() * 400); scene.add(c); clouds.push(c); }

  const windowTarget = new V3(-34, 30, cz + D / 2 + 1);
  return {
    scene, cow, windowTarget, cottage, doorLeaf, hoe,
    update(dt, t) {
      cow.tick(dt);
      for (const s of smoke) { s.t = (s.t + dt * 0.12) % 1; s.m.position.set(Math.sin(s.t * 6 + 1) * 3 + s.t * 14, 80 + s.t * 70, 0); s.m.scale.setScalar(0.5 + s.t * 1.8); s.m.material.opacity = 0.65 * (1 - s.t); }
      for (const c of clouds) { c.position.x += dt * 4; if (c.position.x > 600) c.position.x = -600; }
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The interior: one room, 150 wide (x) and 150 deep (z), square, the hearth in the middle of the north wall, the ceiling 62 up.
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function interior() {
  textures();
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x120d09); scene.fog = new THREE.Fog(0x120d09, 140, 330);
  const hemi = new THREE.HemisphereLight(0xffe2b8, 0x20140c, 0.42); scene.add(hemi); let bank = 1;      // (bank: how high the fire burns, 1 full, towards 0 banked low)
  const dim = new THREE.DirectionalLight(0xc8d8f0, 0.22); dim.position.set(-40, 60, 120); scene.add(dim);                  // a little grey daylight from the south window
  const W = 150, D = 150, H = 62, r = rng(31), room = new THREE.Group(); scene.add(room);        // (square: every side is the length of the hearth wall)
  // Free-standing things (the chair, the stool, the rug, the table with what stands on it, the stairs with the hole above them, the sacks, the barrel, the crate, the broom) are placed by
  // FarmLayout (js/farm-layout.js, written by room-editor.html): each is { x, z, ry } on the floor. Whatever is missing there stays where it is below.
  let LAY = root.FarmLayout || {};
  try { if (root.location && /[?&]layout=draft/.test(root.location.search)) LAY = JSON.parse(root.localStorage.getItem('castle-consequence:layout:draft')) || LAY; } catch (e) { /* no draft */ }
  const items = {}, ceil = new THREE.Group(); room.add(ceil);                                                                     // (the ceiling is one group, so the editor can lift it away)
  const movable = (key, label, g, def) => { items[key] = { g, label, def, y: g.position.y }; g.userData.movable = key; place(key, LAY[key] || def); return g; };
  const place = (key, o) => { const it = items[key], g = it.g; g.position.set(o.x, it.y, o.z); g.rotation.y = o.ry || 0; if (key === 'stairs' && holeBox) syncHole(); };
  let holeBox = null; const syncHole = () => { const g = items.stairs.g, c = Math.cos(g.rotation.y), sn = Math.sin(g.rotation.y); holeBox.position.set(g.position.x + sn * -24, H + 1.7, g.position.z + c * -24); holeBox.rotation.y = g.rotation.y; };
  // Floor, walls, ceiling.
  box(W + 8, 4, D + 8, mat('plank'), 0, -2, 0, room);
  for (let i = 0; i < 9; i++) box(W, 0.3, 0.8, plain('#4a3624'), 0, 0.2, -56 + i * 14, room);
  const wallM = mat('plasterOld');
  box(W + 8, H, 4, wallM, 0, H / 2, -D / 2 - 2, room); box(W + 8, H, 4, wallM, 0, H / 2, D / 2 + 2, room); box(4, H, D, wallM, -W / 2 - 2, H / 2, 0, room); box(4, H, D, wallM, W / 2 + 2, H / 2, 0, room);
  box(W + 8, 12, D + 8, mat('stone'), 0, -10, 0, room);
  for (const x of [-W / 2, -W / 6, W / 6, W / 2]) { box(5, H, 3, mat('timber'), x, H / 2, -D / 2 + 1.5, room); box(5, H, 3, mat('timber'), x, H / 2, D / 2 - 1.5, room); }   // the timber frame, over the plaster
  for (const z of [-D / 2, -D / 6, D / 6, D / 2]) { box(3, H, 5, mat('timber'), -W / 2 + 1.5, H / 2, z, room); box(3, H, 5, mat('timber'), W / 2 - 1.5, H / 2, z, room); }
  for (const y of [3, H - 3]) { box(W, 4, 3, mat('timber'), 0, y, -D / 2 + 1.5, room); box(W, 4, 3, mat('timber'), 0, y, D / 2 - 1.5, room); box(3, 4, D, mat('timber'), -W / 2 + 1.5, y, 0, room); box(3, 4, D, mat('timber'), W / 2 - 1.5, y, 0, room); }
  for (let i = 0; i < 18; i++) { const wallpick = [[0, -D / 2 + 0.4, 0], [0, D / 2 - 0.4, 0]][i % 2]; box(4 + r() * 8, 3 + r() * 6, 0.5, mat('plaster', 0x6a5a40), (r() - 0.5) * (W - 20), 10 + r() * 34, wallpick[1], room); }   // flaked plaster
  // Ceiling: planks on dark beams, with a square hole where the stairs go up (the room above is never seen).
  const hole = { x0: -W / 2 + 6, x1: -W / 2 + 28, z0: -26, z1: 22 };
  for (let i = 0; i < 11; i++) box(W + 6, 3, 14.4, mat('plankDark'), 0, H + 1.5, -D / 2 + 7 + i * 14, ceil);
  holeBox = box(hole.x1 - hole.x0, 3.2, hole.z1 - hole.z0, plain('#000000'), (hole.x0 + hole.x1) / 2, H + 1.7, (hole.z0 + hole.z1) / 2, ceil); holeBox.material = unlit('#020202');
  for (let i = 0; i < 9; i++) box(W + 6, 5, 6, mat('timber'), 0, H - 2.5, -D / 2 + 9 + i * (D - 18) / 8, ceil);
  for (const [x, z] of [[-40, 34], [-10, -4], [28, 40], [44, -20]]) { const hg = new THREE.Group(); hg.position.set(x, H - 5, z); ceil.add(hg); box(0.6, 8, 0.6, plain('#8a7a5a'), 0, 0, 0, hg); for (let k = 0; k < 4; k++) box(1.4, 1.4, 1.4, plain(['#c9ad5a', '#a8442a', '#5a7a34', '#c9ad5a'][k]), (k % 2 - 0.5) * 2, -5 - k, (k - 1.5) * 0.6, hg); }   // bundles of herbs and onions hung to dry
  // The hearth, the middle of the house: a stone breast against the north wall, a hearthstone, the firebox, the chimney narrowing to the ceiling.
  const hearth = new THREE.Group(); hearth.position.set(0, 0, -D / 2); room.add(hearth);
  box(54, 3, 20, mat('stone'), 0, 1.5, 11, hearth);                                                                                // the hearthstone
  box(54, 22, 10, mat('stone'), 0, 14, 5, hearth); box(14, 22, 10, mat('stone'), -20, 14, 5, hearth); box(14, 22, 10, mat('stone'), 20, 14, 5, hearth);
  box(26, 20, 7, plain('#16100c'), 0, 13, 2, hearth);                                                                                // the dark firebox
  box(58, 6, 12, mat('stone'), 0, 27, 5, hearth); box(46, 10, 10, mat('stone'), 0, 35, 4, hearth); box(32, 12, 8, mat('stone'), 0, 46, 3, hearth); box(24, 8, 6, mat('stone'), 0, 53, 2.6, hearth);
  box(40, 3, 5, mat('timber'), 0, 25.5, 9, hearth);                                                                                  // the mantel beam
  const logs = [[-6, 5.4, 0.2, 14], [5, 5.8, 1, 12], [0, 7.8, 0.4, 12]]; for (const [x, y, rz, l] of logs) box(l, 3.2, 3.2, mat('bark'), x, y, 7.5, hearth).rotation.y = rz;
  const flames = []; for (let i = 0; i < 7; i++) { const f = box(3, 7, 3, unlit(['#ff8a2a', '#ffb84a', '#ffd870', '#e8501a'][i % 4]), -8 + i * 2.7, 9, 6.8 + (i % 2) * 1.4, hearth); flames.push({ m: f, ph: r() * 6, base: 5 + r() * 4 }); }
  const embers = box(18, 1, 8, unlit('#e8641a'), 0, 4, 7.4, hearth);
  const fire = new THREE.PointLight(0xff9a40, 1.6, 190, 1.6); fire.position.set(0, 12, -D / 2 + 22); room.add(fire);
  // The crane over the fire with its pot to stir, the kettle on the hearthstone, the fire iron leaning on the breast.
  box(2, 26, 2, plain('#26221e'), 15, 15, 9, hearth); const arm = new THREE.Group(); arm.position.set(15, 26, 9); hearth.add(arm); arm.rotation.y = 0.55; box(22, 1.6, 1.6, plain('#26221e'), -11, 0, 0, arm);
  const pot = new THREE.Group(); pot.position.set(-2, 18, 8.4); hearth.add(pot); box(0.7, 7, 0.7, plain('#26221e'), 0, 9.5, 0, pot);
  box(11, 8, 11, plain('#1c1a18'), 0, 0, 0, pot); box(12.4, 1.4, 12.4, plain('#2c2a28'), 0, 4.2, 0, pot); box(9.4, 0.8, 9.4, plain('#7a5a38'), 0, 3.6, 0, pot); box(1.4, 15, 1.4, mat('plank'), 2, 8, 1, pot).rotation.z = -0.3;
  const kettle = new THREE.Group(); kettle.position.set(-20, 3, 14); hearth.add(kettle); box(9, 7, 9, plain('#6a4a2a'), 0, 3.5, 0, kettle); box(8, 2, 8, plain('#8a6234'), 0, 7.6, 0, kettle); box(2.4, 2.4, 6, plain('#6a4a2a'), 5.6, 5.4, 0, kettle).rotation.y = 1.5708; box(1.2, 8, 1.2, plain('#26221e'), -2, 10, 0, kettle).rotation.z = 0.6; box(1, 1.6, 1, plain('#26221e'), 0, 11, 0, kettle);
  const iron = new THREE.Group(); iron.position.set(28, 0, 8); hearth.add(iron); iron.rotation.z = -0.16; box(0.9, 34, 0.9, plain('#2a2622'), 0, 17, 0, iron); box(3.4, 0.9, 0.9, plain('#2a2622'), 1.2, 34, 0, iron); box(0.9, 4, 0.9, plain('#2a2622'), 2.6, 32, 0, iron);
  // Chair by the hearth (the same chair as in the correction scene), the stool opposite it, a worn rag rug between them.
  const chair = B.makeChair(); chair.position.set(-26, 6, -24); room.add(chair); movable('chair', 'Chair', chair, { x: -26, z: -24, ry: Math.PI / 2 });
  const stool = new THREE.Group(); stool.position.set(26, 0, -24); room.add(stool);
  box(11, 2, 11, mat('plankDark'), 0, 9, 0, stool); for (const [x, z] of [[-4, -4], [4, -4], [0, 4.4]]) box(1.8, 9, 1.8, mat('bark'), x, 4.5, z, stool); movable('stool', 'Stool', stool, { x: 26, z: -24, ry: 0 });
  const rug = new THREE.Group(); room.add(rug); box(40, 0.5, 30, mat('rug'), 0, 0.25, 0, rug); movable('rug', 'Rug', rug, { x: 0, z: -24, ry: 0 });
  // Table (small), a cabinet, store cupboards, shelves and sacks.
  const table = new THREE.Group(); table.position.set(46, -5.7, 30); room.add(table); movable('table', 'Table (and what is on it)', table, { x: 46, z: 30, ry: 0 });          // (a kitchen table: its top 13.5 from the floor, the right height to bend over)
  box(30, 2.4, 20, mat('plank'), 0, 18, 0, table); for (const [x, z] of [[-12, -7], [12, -7], [-12, 7], [12, 7]]) box(2.6, 17, 2.6, mat('bark'), x, 8.5, z, table);
  const tableClutter = new THREE.Group(); table.add(tableClutter);                                                                                     // (what stands on it: lifted off when someone is to be bent over it)
  box(8, 2.6, 8, plain('#6a5a48'), -7, 20.5, 2, tableClutter); box(8, 2.6, 8, plain('#6a5a48'), 6, 20.5, -3, tableClutter); box(7, 3.4, 4, plain('#b48a50'), 8, 20.8, 5, tableClutter); box(1.4, 6, 1.4, plain('#e8dcc0'), -11, 22, -5, tableClutter); box(2.2, 0.6, 2.2, unlit('#ffd870'), -11, 25.3, -5, tableClutter);
  const cab = new THREE.Group(); cab.position.set(W / 2 - 8, 0, -34); room.add(cab);
  box(14, 46, 22, mat('plankDark'), 0, 23, 0, cab); box(1, 38, 9, mat('plank'), -7.2, 24, -5.2, cab); box(1, 38, 9, mat('plank'), -7.2, 24, 5.2, cab); box(1.4, 3, 1.4, plain('#b8923a'), -7.9, 24, -1.2, cab); box(1.4, 3, 1.4, plain('#b8923a'), -7.9, 24, 1.2, cab); box(16, 3, 24, mat('timber'), 0, 47.5, 0, cab);
  const cup = new THREE.Group(); cup.position.set(W / 2 - 8, 0, 4); room.add(cup);
  box(14, 22, 30, mat('plank'), 0, 11, 0, cup); box(1, 18, 13, mat('plankDark'), -7.2, 11, -7, cup); box(1, 18, 13, mat('plankDark'), -7.2, 11, 7, cup); box(15, 2, 32, mat('timber'), 0, 23, 0, cup);
  box(5, 5, 5, plain('#a8442a'), 0, 27, -8, cup); box(4, 7, 4, plain('#8a8060'), 0, 28.5, 0, cup); box(6, 4, 6, plain('#6a5a48'), 0, 26, 9, cup);
  const shelf = new THREE.Group(); shelf.position.set(W / 2 - 4, 0, 36); room.add(shelf);
  for (const y of [30, 40]) box(8, 1.6, 24, mat('plank'), 0, y, -2, shelf); for (let i = 0; i < 5; i++) box(3.6, 5 + (i % 2) * 2, 3.6, plain(['#8a6234', '#6a7a5a', '#a8845a', '#7a6a58', '#5a6a7a'][i]), 0, 33.2 + (i % 2) + 0 , -10 + i * 4.6, shelf);
  for (let i = 0; i < 3; i++) { const sk = new THREE.Group(); room.add(sk); box(12, 10 - i, 9, plain(['#b8a47a', '#a89464', '#c8b488'][i]), 0, 5, 0, sk); movable('sack' + (i + 1), 'Sack ' + (i + 1), sk, { x: -W / 2 + 40 + i * 14, z: D / 2 - 12 + (i % 2), ry: 0 }); }   // sacks of not much
  const barrel = new THREE.Group(); room.add(barrel); box(14, 14, 14, mat('plankDark'), 0, 7, 0, barrel); movable('barrel', 'Barrel', barrel, { x: -W / 2 + 44, z: D / 2 - 30, ry: 0 });
  const crate = new THREE.Group(); room.add(crate); box(12, 8, 12, mat('plank'), 0, 4, 0, crate); movable('crate', 'Crate', crate, { x: 18, z: D / 2 - 12, ry: 0 });   // a barrel and a crate
  // The stairs: bare treads climbing along the west wall into the ceiling, no bannister, the open side to the room.
  const stairs = new THREE.Group(); stairs.position.set(-W / 2 + 17, 0, 22); room.add(stairs);
  for (let i = 0; i < 12; i++) { const y = 4.6 * (i + 1); box(16, 1.6, 6.4, mat('plank'), 0, y - 0.8, -i * 3.6, stairs); box(16, 4.4, 1, mat('plankDark'), 0, y - 3, -i * 3.6 + 3, stairs); }
  for (const x of [-7.2, 7.2]) { const st = new THREE.Group(); st.position.set(x, 0, 0); stairs.add(st); for (let i = 0; i < 12; i++) box(1.6, 4.6 * (i + 1), 3.6, mat('timber'), 0, 2.3 * (i + 1), -i * 3.6, st); }
  movable('stairs', 'Stairs (and the hole above)', stairs, { x: -W / 2 + 17, z: 22, ry: 0 });
  // The birch: a bundle of twigs hung on a nail by the hearth, on the wall to its left. (Not the broom in the corner: that one is for sweeping.)
  // (it hangs on the east wall beside the broom, from a nail at the height the broom's handle reaches)
  box(4, 1.4, 1.4, plain('#2a2622'), W / 2 - 2, 34, 56, room);
  const birchHook = new THREE.Group(); birchHook.position.set(W / 2 - 3.4, 33.5, 56); birchHook.rotation.y = -Math.PI / 2; room.add(birchHook);
  const birchProp = B.makeBirch(); birchProp.root.rotation.z = 0.05; birchHook.add(birchProp.root);
  // The corners nobody has dusted in a long time: cobwebs, grey drifts, mouse droppings; and in one, the birch bundle that does for a broom.
  const web = new THREE.MeshLambertMaterial({ color: 0xd8d8d0, transparent: true, opacity: 0.55 });
  for (const [cx, cz, sx, sz] of [[W / 2 - 3, D / 2 - 3, -1, -1], [-W / 2 + 3, D / 2 - 3, 1, -1], [W / 2 - 3, -D / 2 + 3, -1, 1], [-W / 2 + 3, -D / 2 + 3, 1, 1]]) {
    for (let i = 0; i < 6; i++) { const s = 5 + i * 3; box(s, 0.5, 0.5, web, cx + sx * s / 2, H - 2 - i * 0.6, cz, room); box(0.5, 0.5, s, web, cx, H - 2 - i * 0.6, cz + sz * s / 2, room); box(0.5, s, 0.5, web, cx, H - 2 - s / 2, cz, room); }
    box(14, 0.6, 14, new THREE.MeshLambertMaterial({ color: 0x7a736a }), cx + sx * 6, 0.3, cz + sz * 6, room);
  }
  const broomAt = new THREE.Group(); room.add(broomAt); const broom = new THREE.Group(); broom.rotation.z = -0.1; broomAt.add(broom);
  box(1.2, 28, 1.2, mat('bark'), 0, 20, 0, broom); box(7, 12, 7, plain('#cbbfa0'), 0, 6, 0, broom); for (let i = 0; i < 6; i++) box(0.6, 12, 0.6, plain(i % 2 ? '#f0ecdd' : '#8a7a58'), (i % 3 - 1) * 2.4, 6, (i % 2 - 0.5) * 4.4, broom); box(8, 1.2, 8, plain('#4a3a28'), 0, 12, 0, broom); movable('broom', 'Broom', broomAt, { x: W / 2 - 8, z: D / 2 - 8, ry: 0 });
  // Jack's pallet bed: a low frame with a straw tick, a blanket and a flat pillow; it goes under the window, its long edge to the front (south) wall.
  const bed = new THREE.Group(); room.add(bed);
  box(44, 3, 21, mat('plankDark'), 0, 1.5, 0, bed); for (const x of [-21, 21]) box(2, 6, 21, mat('plank'), x, 3, 0, bed); box(44, 6, 1.6, mat('plank'), 0, 3, -10.2, bed); box(44, 6, 1.6, mat('plank'), 0, 3, 10.2, bed);
  box(40, 3, 18.4, plain('#c4ac6a'), 0, 4.5, 0, bed); for (let i = 0; i < 7; i++) box(40.2, 0.4, 0.6, plain('#a8904e'), 0, 6.1, -7.5 + i * 2.5, bed);
  const bedBlanket = [box(24, 1.2, 18.6, plain('#6a4a3a'), 7, 6.6, 0, bed), box(24.2, 1.3, 3, plain('#8a6a4a'), 7, 6.7, -6, bed)]; box(9, 2, 13, plain('#d8d0b8'), -15, 7, 0, bed);
  movable('bed', 'Jack\'s pallet bed', bed, { x: -34, z: D / 2 - 3 - 10.7, ry: 0 });
  // A window in the south wall, and the door.
  const win = new THREE.Group(); win.position.set(-34, 30, D / 2 - 1); room.add(win); box(22, 20, 3, mat('timber'), 0, 0, 0, win); box(16, 14, 1.2, unlit('#6a7a8a'), 0, 0, -0.6, win); box(1.6, 14, 1.6, mat('timber'), 0, 0, -1, win); box(16, 1.6, 1.6, mat('timber'), 0, 0, -1, win);
  const dr = new THREE.Group(); dr.position.set(34, 0, D / 2 - 1.5); room.add(dr); box(22, 42, 3, mat('timber'), 0, 21, 0, dr); const doorLeaf = new THREE.Group(); doorLeaf.position.set(-7.5, 0, -0.8); dr.add(doorLeaf);                                   // (hinged on its west edge, swinging out; the same size as the door outside)
  box(15, 38, 1.8, mat('plankDark'), 7.5, 19.5, 0, doorLeaf); box(15, 2.6, 1.2, mat('timber'), 7.5, 8, -0.8, doorLeaf); box(15, 2.6, 1.2, mat('timber'), 7.5, 30, -0.8, doorLeaf); box(2, 2, 2, plain('#b8923a'), 12.5, 19, -1.2, doorLeaf);
  return {
    scene, room, ceiling: ceil, hemi, dim, bedBlanket, doorLeaf, setBank: v => { bank = v; }, items, place, layout: () => { const o = {}; for (const k in items) { const g = items[k].g; o[k] = { x: +g.position.x.toFixed(1), z: +g.position.z.toFixed(1), ry: +g.rotation.y.toFixed(3) }; } return o; },
    W, D, H, chair, table, tableClutter, birchHook, birchProp,
    spots: { birch: P(W / 2 - 13, 0, 56), chair: P(chair.position.x, 0, chair.position.z), chairRy: chair.rotation.y, stool: P(stool.position.x, 0, stool.position.z), jack: P(-6, 0, -24), table: P(table.position.x, 0, table.position.z), tableRy: table.rotation.y, hearth: P(0, 0, -D / 2 + 14) },
    update(dt, t) {
      for (const f of flames) { const s = f.base * (0.8 + 0.55 * Math.sin(t * 9 + f.ph) * Math.sin(t * 5.3 + f.ph * 2)); f.m.scale.y = Math.max(0.2, s / 5) * (0.2 + 0.8 * bank); f.m.position.y = 6 + s * 0.8 * 0.5; f.m.rotation.z = 0.12 * Math.sin(t * 7 + f.ph); }
      fire.intensity = (1.5 + 0.35 * Math.sin(t * 11) * Math.sin(t * 6.1) + 0.15 * Math.sin(t * 23)) * (0.15 + 0.85 * bank); embers.scale.x = 0.9 + 0.1 * Math.sin(t * 3);
    },
  };
}

root.Farm = { PLOT, inPlot, exterior, interior, mat, plain, unlit, box, rng, tree, textures };
})(typeof window !== 'undefined' ? window : globalThis);
