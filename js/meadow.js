// Climbing Toward Consequence — the cloud meadow, Chapter Two ("The Climb"): Jack walks from the top of the beanstalk to the castle gate.
//   The land is built at full scale (a castle for people; a meadow of moss and low flowers). Jack starts at a quarter of his size and, as he walks, shrinks to a tenth; the camera is kept to his size,
//   so the meadow seems to grow round him, though nothing in it changes. He does not notice, and neither does the prose, until the gate.
//   An opening cutscene (the moss, the air, the land, the castle), a walk (WASD or the stick; Shift runs, Space jumps; drag to look; V or the wheel to zoom: as in Chapter One), and a closing cutscene at the gate.
// Exposes Meadow.run(G, W): W is Night.build's world (Jack, in his outdoor clothes).
(function (root) {
'use strict';
const THREE = root.THREE, F = root.Farm, A = root.GameAudio, V3 = THREE.Vector3;
const v = (x, y, z) => new V3(x, y, z), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const SC = 0.95, K0 = 0.25, K1 = 0.10;
const START_Z = 40, DOOR_Z = -788, TRIGGER_Z = -742, CZW = -790;                    // (the walk runs along -z, from the edge of the cloud, over a paved forecourt, to the castle's great door)
const KFIX = (/[?&]meadowk=([0-9.]+)/.exec(typeof location !== 'undefined' ? location.search : '') || [])[1];            // (a test: ?meadowk=1 puts Jack at full size the whole way, to judge the flora against him)
const kOf = z => KFIX ? +KFIX : lerp(K0, K1, clamp((START_Z - z) / (START_Z - TRIGGER_Z), 0, 1));
// The way to the castle: a footpath at full size (about 14 across), meandering gently, and straight to the gate.
const pathX = z => 22 * Math.sin(z * 0.009) * clamp((40 - z) / 90, 0, 1) * clamp((z + 620) / 160, 0, 1);
const rnd = (() => { let s = 777; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

function canvasTex(w, h, paint, rx, ry) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry); return t; }
const mossTex = () => canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#d3ddcd'; g.fillRect(0, 0, w, h); const cols = ['#c8d6c2', '#e1ead9', '#bccfb8', '#d6e2c8', '#e8eee0']; for (let i = 0; i < 700; i++) { g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 2, 2); } }, 260, 260);
const stoneTex = (rx, ry) => canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#d9d3bd'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = '#b9b39c'; g.fillRect(0, y, w, 2); for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) g.fillRect(x, y, 2, 16); } for (let i = 0; i < 120; i++) { g.fillStyle = rnd() < 0.5 ? '#f4f0e2' : '#dcd6c0'; g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 2, 2); } }, rx, ry);

function build() {
  const scene = new THREE.Scene(), sky = new THREE.Color(0x9fd0f4);
  scene.background = sky; scene.fog = new THREE.Fog(0xcfe6f8, 120, 1700);
  scene.add(new THREE.HemisphereLight(0xc4e0ff, 0xd0d8c0, 0.85)); const sun = new THREE.DirectionalLight(0xfff4dc, 0.95); sun.position.set(70, 900, 50); scene.add(sun);
  // A brilliant sky: it is long past dawn, and the sun stands high overhead.
  { const tex = canvasTex(2, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f78d2'); gr.addColorStop(0.45, '#69aeea'); gr.addColorStop(0.8, '#b9dcf6'); gr.addColorStop(1, '#dcf0fb'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; const dome = new THREE.Mesh(new THREE.SphereGeometry(3200, 24, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })); scene.add(dome);
    const disc = new THREE.Mesh(new THREE.BoxGeometry(150, 150, 14), new THREE.MeshBasicMaterial({ color: 0xfffbe6, fog: false })); disc.position.set(60, 2900, -200); disc.lookAt(0, 0, 0); scene.add(disc);
    const halo = new THREE.Mesh(new THREE.BoxGeometry(300, 300, 8), new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.25, fog: false })); halo.position.set(60, 2890, -200); halo.lookAt(0, 0, 0); scene.add(halo); }
  const box = F.box, glints = [];
  // The ground: white moss, to the haze.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({ map: mossTex(), color: 0xe2ecda })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // Hills, in soft blocks, and distant banks of cloud.
  const mossCols = [0xc9d6c0, 0xbccdb4, 0xd2dcc8, 0xaec2a8];
  const hill = (x, z, r, h) => { for (let i = 0; i < 4; i++) { const w = r * 2 * (1 - i * 0.24), hh = h / 4; box(w, hh, w * (0.8 + rnd() * 0.4), new THREE.MeshLambertMaterial({ color: mossCols[(i + Math.floor(rnd() * 4)) % 4] }), x, i * hh + hh / 2, z, scene); } };
  for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1; hill(side * (260 + rnd() * 420), 100 - i * 55 - rnd() * 60, 70 + rnd() * 90, 40 + rnd() * 70); }
  for (let i = 0; i < 10; i++) box(300 + rnd() * 200, 30 + rnd() * 30, 200, new THREE.MeshBasicMaterial({ color: 0xf4eee8 }), (rnd() - 0.5) * 2600, 40 + rnd() * 120, -1500 - rnd() * 600, scene);
  // The path: pale worn stone, laid in short lengths along its meander.
  { const pm = new THREE.MeshLambertMaterial({ color: 0xc4bfae }), em = new THREE.MeshLambertMaterial({ color: 0xa8a391 }); let pz = 70, px = pathX(70); for (let z = 56; z >= -712; z -= 14) { const x = pathX(z), len = Math.hypot(14, x - px); const m = box(14, 0.3, len + 1, pm, (x + px) / 2, 0.16, (z + pz) / 2, scene); m.rotation.y = Math.atan2(x - px, z - pz) + Math.PI; for (const sx of [-8, 8]) box(2, 0.5, len + 1, em, (x + px) / 2 + sx, 0.18, (z + pz) / 2, scene).rotation.y = m.rotation.y; px = x; pz = z; } }
  // The silver stream: twice across the way, shallow enough to wade.
  const silver = new THREE.MeshPhongMaterial({ color: 0xcfe0ee, emissive: 0x6c7a8a, shininess: 140, specular: 0xffffff });
  const ribbon = (z0, amp, ph) => { let px = -520, pz = z0 + amp * Math.sin(px * 0.012 + ph); for (let x = -500; x <= 520; x += 14) { const z = z0 + amp * Math.sin(x * 0.012 + ph), len = Math.hypot(14, z - pz), m = box(len + 1, 0.5, 24 + 6 * Math.sin(x * 0.03), silver, (x + px) / 2, 0.22, (z + pz) / 2, scene); m.rotation.y = -Math.atan2(z - pz, 14); px = x; pz = z; } };
  const streams = [[-210, 40, 0.5], [-430, 55, 2.1], [-90, 120, 4.0]]; for (const q of streams) ribbon(q[0], q[1], q[2]);
  // The flora, all of it built as it would stand beside a full-size Jack (about 30 high: tufts to his shin, flowers to his thigh and waist, tall spikes above his head, shrubs, small trees),
  // so that a full-size Jack would wade a meadow that comes to his thigh and waist, with only the odd spike reaching his chest (test it: ?meadowk=1 puts him at full size the whole way).
  const dummy = new THREE.Object3D(), inst = (geo, mat, n, place) => { const m = new THREE.InstancedMesh(geo, mat, n); const col = new THREE.Color(); for (let i = 0; i < n; i++) { const c = place(dummy, col, i); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (c) m.setColorAt(i, c); } m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); return m; };
  const C = a => a.map(c => new THREE.Color(c));
  const tuftCols = C(['#cfe0c8', '#bcd4b8', '#e4eedc', '#c4dcc0']), bloomCols = C(['#f4f0ff', '#e8d8f8', '#ffe8c8', '#dff0ff', '#fff6d8', '#f8d8e4']), spikeCols = C(['#d8c8f0', '#f0d8e8', '#cfe0f8', '#f8e8c0']), bushCols = C(['#b4cdb0', '#a4c0a2', '#c2d8b8']);
  // (where things stand: thinly near where he arrives, more and more as he walks; and clear of the stream's banks only by chance)
  const spot = (clearStart, wide, margin) => { for (;;) { const x = rnd() < wide ? (rnd() < 0.5 ? -1 : 1) * (60 + rnd() * 340) : (rnd() - 0.5) * 170, z = 90 - rnd() * 790; if (clearStart && z > 8 && Math.abs(x) < 30) continue; if (Math.abs(x - pathX(z)) < (margin || 13)) continue; if (z < -430 && rnd() > clamp((z + 700) / 270, 0, 1)) continue; return [x, z]; } };      // (the meadow thins as the castle nears, to bare ground)

  const solids = [], field = (n, clearStart, wide, margin) => { const a = []; for (let i = 0; i < n; i++) a.push(spot(clearStart, wide, margin)); return a; };
  // Tufts of grass: ankle to knee.
  { const P = field(14000, true, 0.3, 8), H = P.map(() => 1.8 + rnd() * 3.6); inst(new THREE.BoxGeometry(0.45, 1, 0.45), new THREE.MeshLambertMaterial({ color: 0xffffff }), P.length, (d, c, i) => { d.position.set(P[i][0], H[i] / 2, P[i][1]); d.scale.set(1, H[i], 1); d.rotation.set((rnd() - 0.5) * 0.3, rnd() * 3, 0); return tuftCols[i % 4]; }); }
  // Wildflowers: thigh to waist, each a stem and a bloom.
  { const P = field(3500, true, 0.3), H = P.map(() => 6 + rnd() * 9); for (const q of P) solids.push([q[0], q[1], 0.6]); inst(new THREE.BoxGeometry(0.4, 1, 0.4), new THREE.MeshLambertMaterial({ color: 0x9fc08a }), P.length, (d, c, i) => { d.position.set(P[i][0], H[i] / 2, P[i][1]); d.scale.set(1, H[i], 1); d.rotation.set(0, rnd() * 3, 0); return null; });
    inst(new THREE.BoxGeometry(2.2, 1.3, 2.2), new THREE.MeshLambertMaterial({ color: 0xffffff }), P.length, (d, c, i) => { d.position.set(P[i][0], H[i] + 0.3, P[i][1]); d.scale.set(1, 1, 1); d.rotation.set(0, rnd() * 3, 0); return bloomCols[i % bloomCols.length]; }); }
  // Tall spiked flowers: waist to chest.
  { const P = field(500, true, 0.35), H = P.map(() => 14 + rnd() * 8); for (const q of P) solids.push([q[0], q[1], 0.8]); inst(new THREE.BoxGeometry(0.6, 1, 0.6), new THREE.MeshLambertMaterial({ color: 0x8fb27c }), P.length, (d, c, i) => { d.position.set(P[i][0], H[i] / 2, P[i][1]); d.scale.set(1, H[i], 1); return null; });
    inst(new THREE.BoxGeometry(1.7, 1, 1.7), new THREE.MeshLambertMaterial({ color: 0xffffff }), P.length, (d, c, i) => { const h = 4.5 + rnd() * 3; d.position.set(P[i][0], H[i] - h / 2 + 1, P[i][1]); d.scale.set(1, h, 1); return spikeCols[i % 4]; }); }
  // Bushes and ferns: waist to shoulder, built of a few blocks.
  for (let i = 0; i < 160; i++) { const [x, z] = spot(true, 0.45, 30), w = 9 + rnd() * 9; solids.push([x, z, w * 0.55]); const ww = w, h = 8 + rnd() * 6, m = new THREE.MeshLambertMaterial({ color: bushCols[i % 3] }); box(w, h, w * 0.9, m, x, h / 2, z, scene).rotation.y = rnd() * 3; box(w * 0.65, h * 0.7, w * 0.6, m, x + w * 0.2, h * 0.9, z - w * 0.1, scene); }
  // Great pale stones and a few fallen stems, for the eye to measure against.
  for (let i = 0; i < 40; i++) { const [x, z] = spot(true, 0.4, 24), w = 6 + rnd() * 10; solids.push([x, z, w * 0.55]); box(w, w * 0.6, w * 0.8, new THREE.MeshLambertMaterial({ color: 0xcfd0c8 }), x, w * 0.3, z, scene).rotation.y = rnd() * 3; }
  // The beanstalk's top, rising out of a ring of cloud behind where Jack arrives.
  { const g = new THREE.Group(); g.position.set(0, 0, 78); scene.add(g); const dark = new THREE.MeshLambertMaterial({ color: 0x4f6f5a }), gm = ['#3f7f3a', '#4a8f42', '#37703a', '#58a04a'].map(c => F.plain(c));
    box(40, 0.4, 40, dark, 0, 0.05, 0, g);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, r = 18 + rnd() * 5; box(10 + rnd() * 8, 3 + rnd() * 4, 10 + rnd() * 8, new THREE.MeshLambertMaterial({ color: 0xe8e6ee }), Math.cos(a) * r, 1.5, Math.sin(a) * r, g); }
    for (let i = 0; i < 9; i++) { const y = -20 + i * 8.5, sway = Math.sin(i * 0.5) * 2; box(7 - i * 0.12, 9.5, 7 - i * 0.12, gm[i % 4], sway, y + 4, Math.cos(i * 0.4) * 2, g).rotation.y = i * 0.42; box(2.4, 10, 2.4, F.plain('#8bc46a'), sway + 3.4, y + 4, Math.cos(i * 0.4) * 2, g); }
    for (const [y, a, L] of [[14, 0.6, 36], [34, 2.8, 30], [50, 4.6, 22]]) { const lf = new THREE.Group(); lf.position.set(0, y, 0); lf.rotation.y = a; lf.rotation.z = -0.3; g.add(lf); box(L, 1.4, 13, F.plain('#4f9a46'), L / 2 + 4, 0, 0, lf); box(L * 0.7, 1.4, 8, F.plain('#62ab52'), L * 0.9, 0.3, 6, lf); box(L * 0.7, 1.4, 8, F.plain('#3f8a3c'), L * 0.9, 0.3, -6, lf); }
    box(26, 2.4, 2.4, gm[1], 12, 56, 0, g).rotation.z = 0.5; }
  // A few pale trees lining the way to the gate: the tallest is the measure the gate is held against.
  const trunkM = new THREE.MeshLambertMaterial({ color: 0xd9d3c0 }), leafM = [0xb9d4c0, 0xa8c8b4, 0xc6dccb].map(c => new THREE.MeshLambertMaterial({ color: c }));
  for (let i = 0; i < 13; i++) { const side = i % 2 ? 1 : -1, x = side * (70 + rnd() * 90), z = -300 - i * 22 - rnd() * 14, h = 34 + rnd() * 22; solids.push([x, z, 4]); box(4, h, 4, trunkM, x, h / 2, z, scene); box(24, 8, 24, leafM[0], x, h + 2, z, scene); box(17, 8, 17, leafM[1], x, h + 9, z, scene); box(10, 8, 10, leafM[2], x, h + 16, z, scene); }
  // The castle: moonlight and bone. The inside's own plan seen from outside (the hall in front, the wings behind it, the garden walled off at the back), and a tower over the parlour and the stair hall; no flag.
  const stone = (rx, ry) => new THREE.MeshLambertMaterial({ map: stoneTex(rx, ry), emissive: 0x161b2a });
  const win = new THREE.MeshBasicMaterial({ color: 0x0b0f1c });
  const castle = new THREE.Group(); scene.add(castle);
  const CZ = -790;                                                         // the hall's front face
  let castleExt;
  { const cache = {}; castleExt = root.Castle.exterior(castle, { stone: (rx, ry) => { const k = Math.round(rx) + ':' + Math.round(ry); return cache[k] || (cache[k] = stone(Math.round(rx), Math.round(ry))); }, win, glints, rnd, ox: 0, oz: CZ - 112, gateZ: CZ + 104, sideX: 92 }); for (const so of castleExt.solids) solids.push(so); }
  // The forecourt: quiet paving, edged with a low kerb, from where the path ends to the great door; and the great door itself.
  const pave = new THREE.MeshLambertMaterial({ map: stoneTex(26, 11), color: 0xaaa798 }), kerb = new THREE.MeshLambertMaterial({ map: stoneTex(30, 1), color: 0xbab6a6 });
  box(184, 0.6, 104, pave, 0, 0.3, CZ + 52, castle); for (const sx of [-1, 1]) { box(78, 1.4, 2, kerb, sx * 53, 0.7, CZ + 104, castle); box(2, 1.4, 104, kerb, sx * 92, 0.7, CZ + 52, castle); }       // (the forecourt reaches only as far as the hall's turrets)
  const wood = new THREE.MeshLambertMaterial({ color: 0x3a2a20 }), iron = new THREE.MeshPhongMaterial({ color: 0x2b2d36, shininess: 70, specular: 0x667088 });
  box(33, 75, 3, wood, -18.5, 37.5, CZ + 1.5, castle); box(33, 75, 3, wood, 18.5, 37.5, CZ + 1.5, castle); box(4, 68.4, 3, wood, 0, 40.8, CZ + 1.5, castle); box(4, 2.4, 3, pave, 0, 1.2, CZ + 1.5, castle);           // the great door, with a crack at its foot just wide enough for him
  { const gl = new THREE.Mesh(new THREE.PlaneGeometry(4, 4.2), new THREE.MeshBasicMaterial({ color: 0x6a4824, fog: false })); gl.position.set(0, 4.5, CZ + 0.08); castle.add(gl); }                                       // (a dim warm light beyond it)
  box(70, 3, 4, iron, 0, 20, CZ + 2, castle); box(70, 3, 4, iron, 0, 55, CZ + 2, castle); box(2, 68, 4, iron, -3.4, 41, CZ + 2, castle); box(2, 68, 4, iron, 3.4, 41, CZ + 2, castle); box(4, 4, 3, iron, -9, 36, CZ + 3, castle); box(4, 4, 3, iron, 9, 36, CZ + 3, castle);
  for (let i = 0; i < 3; i++) { const top = 1.2 + i * 0.6; box(78, top - 0.6, 6, pave, 0, 0.6 + (top - 0.6) / 2, CZ + 15 - i * 6 - 3 + 6, castle); }
  castle.updateMatrixWorld(true);
  // What he stands on: the path, the shallow stream and the paving are floor, at their own heights.
  const groundY = (x, z) => {
    if (z < CZ + 21 && z > CZ + 3 && Math.abs(x) < 39) return 1.2 + 0.6 * Math.floor((CZ + 21 - z) / 6);
    if (z < CZ + 104 && z > CZ && Math.abs(x) < 92) return 0.6;
    for (const q of streams) { const zs = q[0] + q[1] * Math.sin(x * 0.012 + q[2]); if (Math.abs(z - zs) < 11) return 0.47; }
    if (z < 60 && z > CZ + 104 && Math.abs(x - pathX(z)) < 7.5) return 0.31;
    return 0;
  };
  const kerbed = (x, z) => ((Math.abs(z - (CZ + 104)) < 1.4 && Math.abs(x) > 14 && Math.abs(x) < 92) || (Math.abs(Math.abs(x) - 92) < 1.4 && z < CZ + 104 && z > CZ));
  return { scene, glints, solids, groundY, kerbed, sun, hemi: scene.children.find(o => o.isHemisphereLight), update(dt, t) { castleExt.update(t, dt); for (const g of glints) g.m.opacity = 0.08 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.6 + g.ph)) * (0.5 + 0.5 * Math.sin(t * 0.23 + g.ph * 3)); } };
}

// What he carries: his father's knife, the satchel, and a flask at his belt (the flask is new).
function addGear(rig) {
  if (rig.geared) return; rig.geared = true;
  const box = F.box, plain = F.plain, g = new THREE.Group();
  const knife = new THREE.Group(); box(1.2, 8, 0.8, plain('#b9bfc8'), 0, -4.5, 0, knife); box(1.6, 3.6, 1.2, plain('#4a3626'), 0, 0, 0, knife); box(3, 0.7, 1.4, plain('#b8923a'), 0, -1.8, 0, knife); knife.position.set(-5.6, 2, 0.4); rig.hips.add(knife);
  const satchel = new THREE.Group(); box(1.3, 10, 4.7, plain('#6a4a2e'), 0, 6.5, 0, satchel).rotation.z = 0.37; box(2.6, 7, 8, plain('#8a6a42'), 5.4, 3, 0, satchel); box(2.9, 3, 8.2, plain('#6a4a2e'), 5.4, 5.6, 0, satchel); box(0.8, 1.6, 1.4, plain('#b8923a'), 6.9, 4.4, 0, satchel); rig.torso.add(satchel);
  const flask = new THREE.Group(); box(2.6, 5.6, 2.6, plain('#6f8294'), 0, -2.8, 0, flask); box(1.2, 1.4, 1.2, plain('#c8a060'), 0, 0.6, 0, flask); box(0.5, 4, 0.5, plain('#4a3626'), 0, 2.6, 0, flask); flask.position.set(-4.6, 1, 2.6); rig.hips.add(flask);
  rig.gear = { knife, satchel, flask };
  return g;
}

function run(G, W) {
  return new Promise(async resolve => {
    const { jackOut, aOut } = W, el = G.renderer.domElement, camera = G.camera, nearOld = camera.near;
    const M = build(), scene = M.scene, world = { scene, update(dt, t) { M.update(dt, t); aOut.t += dt; root.Blocky.step(jackOut, dt); } };      // (Jack is stepped here: his own world's update is not running)
    scene.add(jackOut.root); jackOut.root.visible = true; W.paintJack(jackOut, { expr: 0 }); addGear(jackOut);
    G.setScene(world); G.drone = null; G.save({ step: 'meadow' });
    camera.near = 0.1; camera.updateProjectionMatrix();
    A && A.ambience({ wind: 0.14, birds: 0, fire: 0 });
    A && A.ctx && (A.startMusic({ theme: 'meadow' }), A.duckMusic(0.9, 3));
    const st = { pos: v(0, 0, START_Z), heading: Math.PI, walkN: 0, walkPh: 0, mode: 'intro', free: false, camA: Math.PI / 2, pitch: 0.5, zoom: 1, vy: 0, y: 0, jumpReq: false, gy: 0, kk: K0, look: 0, shiver: 0, bob: 0, craned: 0, frown: 0, stillSaid: 0, toastAt: 0, spd: 0, gripPrev: false, air: false };
    // Jack's body: walking, looking, shivering.
    jackOut.after = r => {
      const w = Math.sin(st.walkPh) * 0.7 * st.walkN, t = G.t, sh = st.shiver * 0.05 * Math.sin(t * 38);
      r.legL.thigh.rotation.x = w - st.bob * 0.5; r.legR.thigh.rotation.x = -w - st.bob * 0.5; r.legL.knee.rotation.x = st.bob * 1.0; r.legR.knee.rotation.x = st.bob * 1.0;
      r.armL.rotation.x = -w * 0.8 + sh; r.armR.rotation.x = w * 0.8 - sh; r.armL.rotation.z = 0.06 + st.shiver * 0.18; r.armR.rotation.z = -0.06 - st.shiver * 0.18;
      r.neck.rotation.x = st.look; r.torso.rotation.x = 0.04 + st.craned * 0.08 + sh * 0.6; r.hips.position.y = 12 - st.bob * 3 + Math.abs(Math.sin(st.walkPh)) * 0.5 * st.walkN;
      if (st.air) { r.armL.rotation.x = r.armR.rotation.x = -2.5; r.legL.thigh.rotation.x = -0.5; r.legR.thigh.rotation.x = 0.25; r.legR.knee.rotation.x = 0.5; r.legL.knee.rotation.x = 0; }                    // (the leap, as in Chapter One)
    };
    // ── HUD and controls ──
    const css = document.createElement('style');
    css.textContent = `#mwHud { position: fixed; inset: 0; pointer-events: none; z-index: 12; font-family: Georgia, serif; color: #ece8df; }
      #mwObj { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(10,12,16,0.7); border: 1px solid #4a4d58; border-radius: 8px; padding: 8px 16px; font-size: clamp(13px, 1.9vw, 17px); text-align: center; display: none; }
      #mwToast { position: absolute; left: 50%; bottom: 22vh; transform: translateX(-50%); background: rgba(10,12,16,0.8); border: 1px solid #4a4d58; padding: 7px 15px; border-radius: 8px; font-size: 14px; max-width: 80vw; text-align: center; opacity: 0; transition: opacity .5s; }`;
    document.head.appendChild(css);
    const hud = document.createElement('div'); hud.id = 'mwHud'; hud.style.display = 'none';
    hud.innerHTML = '<div id="mwObj">Walk to the castle.</div><div id="mwToast"></div>';
    document.body.appendChild(hud);
    const $ = id => document.getElementById(id);
    const toast = (t, ms = 5000) => { $('mwToast').textContent = root.Tips.clean(t); $('mwToast').style.opacity = 1; st.toastAt = performance.now() + ms; };
    const keys = {}, ui = root.TouchUI.create({ keys, run: true, jump: true, cam: true }), stick = ui.stick, KM = { w: 'up', W: 'up', ArrowUp: 'up', s: 'down', S: 'down', ArrowDown: 'down', a: 'left', A: 'left', ArrowLeft: 'left', d: 'right', D: 'right', ArrowRight: 'right', Shift: 'run' };
    ui.show(false);                                                                  // (shown only while he walks)
    const typing = e => e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    const kd = e => { if (typing(e)) return; const k = KM[e.key]; if (k) { keys[k] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); } if (e.key === ' ') e.preventDefault(); if (e.repeat) return; if (e.key === ' ') st.jumpReq = true; if (e.key === 'v' || e.key === 'V') cycleZoom(); }, ku = e => { const k = KM[e.key]; if (k) keys[k] = false; };
    root.addEventListener('keydown', kd); root.addEventListener('keyup', ku);
    const ZOOMS = [{ name: 'Close', d: 52 }, { name: 'Medium', d: 92 }, { name: 'Far', d: 150 }];                  // (as in Chapter One, in units of his full size)
    const camIcon = () => ui.set('cam', { icon: 'camera', title: 'Camera: ' + ZOOMS[st.zoom].name });
    function cycleZoom(dir) { st.zoom = (st.zoom + (dir || 1) + ZOOMS.length) % ZOOMS.length; camIcon(); }
    camIcon(); ui.on.cam = () => cycleZoom(); ui.on.jump = () => { st.jumpReq = true; };
    const drags = new Map();
    const pd = e => drags.set(e.pointerId, { x: e.clientX, y: e.clientY }), pm = e => { const d = drags.get(e.pointerId); if (!d || !st.free) return; st.camA += (e.clientX - d.x) * 0.006; st.pitch = clamp(st.pitch + (e.clientY - d.y) * 0.005, 0.08, 1.35); d.x = e.clientX; d.y = e.clientY; }, pu = e => drags.delete(e.pointerId);
    const wheel = e => { e.preventDefault(); if (st.free) cycleZoom(e.deltaY > 0 ? 1 : -1); };
    el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);

    // ── Each frame: the walk, and the camera when it is the player's. ──
    const camPos = new V3(), camLook = new V3();
    const grid = new Map(), CELL = 12, gk = (ix, iz) => ix * 4096 + iz;
    for (const o of M.solids) { const ix = Math.floor(o[0] / CELL), iz = Math.floor(o[1] / CELL), k = gk(ix, iz); (grid.get(k) || grid.set(k, []).get(k)).push(o); }
    const hitsFlora = (x, z) => { const rJ = 4 * st.kk, ix = Math.floor(x / CELL), iz = Math.floor(z / CELL); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const c = grid.get(gk(ix + a, iz + b)); if (c) for (const o of c) if (Math.hypot(x - o[0], z - o[1]) < o[2] + rJ) return true; } return false; };
    const blocked = (x, z) => x < -280 || x > 280 || z > 120 || z < -772 || (z < -716 && Math.abs(x) > 128) || hitsFlora(x, z) || (M.kerbed(x, z) && st.y < 1.3);       // (the flora stands like the trees on the market road: he goes round, along the path)
    const place = () => { st.kk = kOf(st.pos.z); jackOut.root.scale.setScalar(SC * st.kk); jackOut.root.position.set(st.pos.x, st.y - 0.5 * st.bob * st.kk, st.pos.z); jackOut.root.rotation.y = st.heading; };
    const tick = dt => {
      if (st.mode === 'walk') {
        const f = v(-Math.cos(st.camA), 0, -Math.sin(st.camA)), r = v(Math.sin(st.camA), 0, -Math.cos(st.camA));
        const dir = v(0, 0, 0).addScaledVector(f, (keys.up ? 1 : 0) - (keys.down ? 1 : 0)).addScaledVector(r, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
        if (Math.hypot(stick.x, stick.y) > 0.2) dir.addScaledVector(f, -stick.y).addScaledVector(r, stick.x);
        if (dir.lengthSq() > 0) {
          dir.normalize(); const want = Math.atan2(dir.x, dir.z); st.heading += angDiff(want, st.heading) * Math.min(1, dt * 9);
          const off = Math.abs(angDiff(want, st.heading)), ease = clamp(1 - off / Math.PI * 0.8, 0.2, 1), sp = (keys.run ? 50 : 26) * SC * Math.pow(st.kk, 0.6) * ease, nx = st.pos.x + Math.sin(st.heading) * sp * dt, nz = st.pos.z + Math.cos(st.heading) * sp * dt;     // (Chapter One's pace, his stride shortening as he shrinks, though not as fast as his size)
          if (!blocked(nx, st.pos.z)) st.pos.x = nx; if (!blocked(st.pos.x, nz)) st.pos.z = nz; st.walkN = 1; st.walkPh += 10.9 * Math.pow(st.kk / SC, -0.35) * 0.55 * dt * 1.4 * (keys.run ? 1.5 : 1);
        } else st.walkN = Math.max(0, st.walkN - dt * 6);
        ui.set('jump', { label: 'Jump', icon: 'jump', enabled: st.free && st.y <= st.gy + 0.01 });
        if (st.jumpReq) { st.jumpReq = false; if (st.y <= st.gy + 0.01) st.vy = 112 * st.kk; }           // (Space jumps, exactly as in Chapter One, in proportion to his size: the same height for his body, the same time in the air)
        st.gy = M.groundY(st.pos.x, st.pos.z); const fall = st.vy <= 0 && st.y <= st.gy + 0.4 * st.kk;
        if (fall) { st.y += (st.gy - st.y) * Math.min(1, dt * 22); st.vy = 0; } else { st.vy -= 420 * st.kk * dt; st.y += st.vy * dt; if (st.y < st.gy) { st.y = st.gy; st.vy = 0; } }
        st.bob = st.y > 0 ? 0 : st.walkN * 0.15 * (0.5 + 0.5 * Math.sin(st.walkPh * 2));
        st.air = st.vy > 1 || st.y > st.gy + 0.5 * st.kk;                                  // (the moss gives a little under each step)
        // (no narration: the land is left to speak. Only the quiet falls as he goes in.)
        const p = clamp((START_Z - st.pos.z) / (START_Z - TRIGGER_Z), 0, 1);
        if (st.stillSaid === 0 && p > 0.04) { st.stillSaid = 1; A && A.ambience({ wind: 0, birds: 0, fire: 0 }); A && A.duckMusic && A.duckMusic(0.18, 5); }
        else if (st.stillSaid === 1 && p > 0.28) { st.stillSaid = 2; G.caption('jack', 'Funny. Those flowers only came to my shins when I started.'); }       // (he begins to notice, as he walks, without the walk being stopped)
        else if (st.stillSaid === 2 && p > 0.55) { st.stillSaid = 3; G.caption('jack', 'Is it just me, or is the grass getting taller?'); }
        else if (st.stillSaid === 3 && p > 0.8) { st.stillSaid = 4; G.caption('jack', 'Everything looks bigger from here... or I’m only tired. Keep going.'); }
        const sh = clamp((-st.pos.z - 520) / 90, 0, 1); M.hemi.intensity = 0.85 * (1 - 0.3 * sh); M.sun.intensity = 0.95 * (1 - 0.55 * sh);
        if (st.pos.z <= TRIGGER_Z && st.mode === 'walk') { st.mode = 'arrive'; arrive(); }
      }
      place();
      if (st.toastAt && performance.now() > st.toastAt) { $('mwToast').style.opacity = 0; st.toastAt = 0; }
      if (st.free) {
        const kk = st.kk, d = ZOOMS[st.zoom].d * kk, at = v(st.pos.x, st.y + 15 * SC * kk, st.pos.z), want = v(at.x + Math.cos(st.camA) * d * Math.cos(st.pitch), Math.max(3 * kk, at.y + Math.sin(st.pitch) * d), at.z + Math.sin(st.camA) * d * Math.cos(st.pitch));
        if (camPos.lengthSq() === 0) camPos.copy(want); else camPos.lerp(want, Math.min(1, dt * 8)); camLook.copy(at); G.cut({ pos: camPos, look: camLook, fov: 48 });
      }
    };
    const cleanup = () => { root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); el.removeEventListener('wheel', wheel); el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); G.updaters = G.updaters.filter(u => u !== tick); hud.remove(); css.remove(); ui.destroy(); jackOut.after = null; jackOut.root.scale.setScalar(SC); camera.near = nearOld; camera.updateProjectionMatrix(); };
    place(); G.updaters.push(tick); G.meadow = { st, blocked, pathX };

    // ── The opening: the beanstalk climbing out of the cloud behind him, and the castle a long way off; then Jack, with something to say; then round behind him, and the walk. ──
    const k = K0, S = () => st.pos, wait = G.wait;
    G.mode = 'cutscene'; document.body.classList.add('cutscene');
    const f = $('fade'); f.style.background = '#fff'; f.style.transition = 'none'; f.style.opacity = 1;
    st.look = 0.1; st.heading = Math.PI;
    G.cut({ pos: v(46, 9, 112), look: v(0, 14, 78), fov: 50 }); await wait(0.5);
    f.style.transition = ''; await G.fade(false, 2.2); f.style.background = '';
    await wait(0.8);
    // He is small beside the stalk; the camera draws away and across, and the castle stands at the end of the land.
    await G.shot({ pos: v(0, 96, 98), look: v(0, 66, -760), fov: 36 }, 8.5, 'inOut');
    await wait(0.5);
    // Jack, in close: the moment he has been proved right.
    G.cut({ pos: v(-7, 5.4, S().z - 12), look: v(S().x, 6.1, S().z), fov: 34 }); st.look = 0; W.paintJack(jackOut, { expr: 1 });
    await wait(0.6); st.shiver = 0.7; await wait(0.7); st.shiver = 0;
    await G.say('jack', 'A whole land above the clouds... and a castle at the end of it.');
    W.paintJack(jackOut, { expr: 1 });
    await G.say('jack', 'Mother will eat every word. Come on, then. Let’s see what the castle has to offer.');
    // Round behind him, and the walk is his.
    { const kk = K0, d = 92 * kk, c = Math.cos(0.5); await G.shot({ pos: v(0, 15 * SC * kk + Math.sin(0.5) * d, S().z + d * c), look: v(0, 15 * SC * kk, S().z), fov: 48 }, 1.8, 'inOut'); }
    G.skipping = false; G.mode = 'play'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine(); st.heading = Math.PI; st.look = 0; st.camA = Math.PI / 2; camPos.set(0, 0, 0);
    st.free = true; st.mode = 'walk'; hud.style.display = 'block'; ui.show(true); $('mwObj').style.display = 'block';

    // ── At the gate. ──
    async function arrive() {
      st.free = false; st.walkN = 0; st.bob = 0; hud.style.display = 'none'; ui.show(false); G.mode = 'cutscene'; document.body.classList.add('cutscene'); st.pos.x = clamp(st.pos.x, -30, 30); st.heading = Math.PI;
      const zJ = st.pos.z; G.cut({ pos: v(st.pos.x + 5, 2.4, zJ + 34), look: v(0, 30, DOOR_Z), fov: 56 }); st.look = -0.7; st.craned = 1;
      await G.shot({ pos: v(st.pos.x + 4, 1.4, zJ + 26), look: v(0, 72, DOOR_Z), fov: 64 }, 6.5, 'inOut'); await wait(0.8);
      G.cut({ pos: v(st.pos.x - 3, 3.4, zJ - 10), look: v(st.pos.x, 2.5, zJ), fov: 36 }); st.look = 0.1; st.craned = 0; W.paintJack(jackOut, { expr: 4 });
      await wait(0.8);
      await G.say('jack', 'My satchel’s heavier... my belt, the flask... it isn’t the world that’s grown. It’s me. I’m getting smaller.'); await wait(0.5); await G.say('jack', 'Doesn’t matter. I’m not turning back now.');
      st.look = 0; W.paintJack(jackOut, { expr: 1 });
      // The walk to the foot of the great door (scripted, in a fixed number of steps so that skipping lands him in the same place).
      const walkTo = async (tx, tz, secs, cam) => {
        const x0 = st.pos.x, z0 = st.pos.z, n = Math.max(2, Math.round(secs / 0.04)); st.heading = Math.atan2(tx - x0, tz - z0);
        for (let i = 1; i <= n; i++) { const k = i / n; st.pos.x = x0 + (tx - x0) * k; st.pos.z = z0 + (tz - z0) * k; st.y += (M.groundY(st.pos.x, st.pos.z) - st.y) * 0.45; st.walkN = 1; st.walkPh += 10.9 * Math.pow(st.kk / SC, -0.35) * 0.55 * 0.04 * 1.4; if (cam) G.cut(cam()); await wait(0.04); }
        st.walkN = 0;
      };
      const low = () => ({ pos: v(st.pos.x - 1.6, st.y + 1.7, st.pos.z + 9), look: v(0, st.y + 2.6, CZW), fov: 46 });
      await walkTo(0, CZW + 26, 4.4, low);
      // At the foot of the steps: the gap under the door, and him looking at it.
      G.cut({ pos: v(-7, 1.4, CZW + 17), look: v(0, 3.2, CZW + 2), fov: 38 }); st.heading = Math.PI; st.look = 0.15; await wait(1.4);
      await G.say('jack', 'There. A gap at the foot of the door. Just wide enough.'); st.look = 0; await wait(0.4);
      // Up the steps and into the dark, the picture fading as he goes.
      const fadeOut = G.fade(true, 2.0);
      await walkTo(0, CZW + 8, 1.6, () => ({ pos: v(-5, st.y + 1.5, st.pos.z + 9), look: v(0, st.y + 2.8, CZW), fov: 42 }));
      await walkTo(0, CZW + 0.6, 1.5, () => ({ pos: v(-4, st.y + 1.2, st.pos.z + 7), look: v(0, st.y + 2.8, CZW), fov: 40 }));
      await fadeOut; A && A.ambience({ wind: 0, birds: 0, fire: 0 }); await wait(0.5);
      jackOut.root.visible = false; G.snapshotFarm(world, () => ({ pos: v(-120, 105, CZW + 360), look: v(10, 110, CZW), fov: 52 })); jackOut.root.visible = true;       // (the title screen, from here on: the castle from the meadow)
      cleanup(); G.mode = 'end'; document.body.classList.remove('cutscene'); resolve({ arrived: true });
    }
  });
}

// The title screen's picture, from here on: the castle from the meadow, as the meadow builds it now (kept up to date: it is taken afresh, not carried over from when the meadow was last played).
function titleShot(G) { const M = build(); G.snapshotFarm(M, () => ({ pos: v(-120, 105, CZW + 360), look: v(10, 110, CZW), fov: 52 })); }
root.Meadow = { run, addGear, titleShot };
})(typeof window !== 'undefined' ? window : globalThis);
