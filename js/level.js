// Beanstalk — test level: Jack looks after the golden hen. Jack (Day clothes) starts at 75% of his size and must sweep the floor, fill the hen's dish,
// carry water to her trough without spilling it, and win her trust by approaching slowly (move too fast near her and she backs away). He can clap to
// shoo her out of the way, but it costs him size. When Gerda (Work clothes) comes back (on a timer, or when he calls her) she asks how it went and Jack
// can tell the truth or lie. A scripted correction follows, across her lap (js/lap.js), its severity decided by how he really did and whether he lied,
// with Jack at whatever size he has been left at. His size never goes below 50%.
// The room is built for Gerda (everything in it is 1.5 times the size of a thing in the blocky model's own units), so a Jack of 75% feels small in it;
// the camera keeps a fixed distance from him *in his own sizes*, so as he shrinks the room seems to grow. The mouse looks around (drag).
// Jack's size is a fraction of his full size, which is 95% of the model's scale.
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky, Lap = root.Lap;
const V3 = THREE.Vector3;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const turn = (from, to, t) => { let d = ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return from + d * t; };   // the short way round

// ── The rules ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SIZE_START = 0.8, SIZE_MIN = 0.5, FULL = 0.95;
const LOCK_CAM = true;                          // the camera stays behind Jack's head; the player only tilts it up and down, and A/D turn him (W/S walk him forwards/back)
const K = 1.5;                                  // the room's scale: it is a Gerda-sized room
// What makes Jack shrink (fractions of his full size, so 0.05 is five percentage points):
const COST = {
  clap: 0.03,         // clapping to shoo the hen
  lie: 0.05,          // lying to Gerda about how it went
  spill: 0.02,        // each spill of the water he is carrying (every 15 units lost), or dropping the bucket
  startle: 0.01,      // frightening the hen by moving too fast near her (at most once every four seconds)
  unfinished: 0.02,   // each chore still undone when Gerda comes back
  dawdle: 0.02,       // not done by the time she is back on her own (the clock ran out)
  litter: 0.01,       // the broom or the bucket left lying about instead of put back
};
const TIME_LIMIT = 240;                         // seconds before Gerda comes back whether he is ready or not
const WALK = 26, CREEP = 7.5, RUN = 50;                  // speeds, in body-lengths-ish per second (times his scale)
const HEN_ALARM = 13, SPILL_ABOVE = 27, CALM = 9.5;   // faster than this near the hen scares her / slops the water; slower than CALM she warms to him
const R_ = 62;                                  // the room is square: 124 design units each way
const HALL = { x0: -R_ * K, x1: R_ * K, z0: -R_ * K, z1: R_ * K };
const ALARM_RADIUS = 28;                        // the hen only minds his pace within this distance
const D = { rack: [-44, -56], sack: [-50, 46], dish: [12, 57], trough: [27, 57], well: [48, -34], nest: [50, 54], chair: [0, -56.7] };   // (design coordinates; the world's are K times these)
const SPOT = {}; for (const k in D) SPOT[k] = new V3(D[k][0] * K, 0, D[k][1] * K); SPOT.bucket = new V3((D.rack[0] + 4.5) * K, 0, (D.rack[1] - 2) * K);   // (on a flagstone beneath the shelf, beside the broom)
SPOT.door = new V3(-(R_ + 2) * K, 0, 0);
const PEN = { x0: 6 * K, x1: 56 * K, z0: 4 * K, z1: 54 * K };
const PATCHES = [[-30, -20], [-10, 10], [5, -25], [-45, 10], [20, -8], [-20, 28]].map(p => [p[0] * K, p[1] * K]);
const CHORES = ['sweep', 'dish', 'water', 'trust'];

// ── Small builders ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const srgb = hex => new THREE.Color(hex).convertSRGBToLinear();
const mat = hex => new THREE.MeshLambertMaterial({ color: srgb(hex) });
function box(w, h, d, x, y, z, hex, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(hex)); m.position.set(x, y, z); if (parent) parent.add(m); return m; }

function plankTexture(base, line, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 32, 32); x.fillStyle = line; for (let i = 0; i < 4; i++) x.fillRect(0, i * 8, 32, 1);
  let s = 11; for (let i = 0; i < 40; i++) { s = (s * 1103515245 + 12345) >>> 0; x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect((s >> 8) % 32, (s >> 16) % 32, 2, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.encoding = THREE.sRGBEncoding; return t;
}

// Packed earth: pale, trodden clay (lighter than the dirt that is swept up).
function earthTexture(repeat) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  x.fillStyle = '#b79a72'; x.fillRect(0, 0, 32, 32);
  let s = 7; for (let i = 0; i < 150; i++) { s = (s * 1103515245 + 12345) >>> 0; const v = (s >> 24) & 3; x.fillStyle = ['rgba(255,240,210,0.16)', 'rgba(90,60,30,0.14)', 'rgba(150,120,80,0.2)', 'rgba(60,40,20,0.1)'][v]; x.fillRect((s >> 8) % 32, (s >> 16) % 32, 1 + (v & 1), 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.encoding = THREE.sRGBEncoding; return t;
}

// The golden hen: a blocky bird facing +z (designed at twice her size on screen; she is scaled to half). Parts are kept so she can peck, flap and settle.
function makeHen() {
  const g = new THREE.Group(), parts = {};
  const gold = 0xe2ab2c, goldHi = 0xf0c64a, goldDk = 0xb8851c, red = 0xc4402c, orange = 0xe08a2a;
  const body = new THREE.Group(); body.position.y = 6.5; g.add(body); parts.body = body;
  box(7, 6, 10, 0, 0, 0, gold, body); box(5, 3, 8, 0, 3.2, -0.3, goldHi, body); box(6, 4, 4, 0, -0.5, 4.8, goldHi, body);
  parts.tail = new THREE.Group(); parts.tail.position.set(0, 2.5, -5); body.add(parts.tail);
  box(1.6, 5, 1.2, 0, 1.5, -1, goldDk, parts.tail); box(1.6, 4, 1.2, -1.8, 1, -0.8, gold, parts.tail); box(1.6, 4, 1.2, 1.8, 1, -0.8, gold, parts.tail);
  parts.wingL = new THREE.Group(); parts.wingL.position.set(3.6, 1.5, 0); body.add(parts.wingL); box(0.9, 4, 7, 0.3, -1, 0, goldDk, parts.wingL);
  parts.wingR = new THREE.Group(); parts.wingR.position.set(-3.6, 1.5, 0); body.add(parts.wingR); box(0.9, 4, 7, -0.3, -1, 0, goldDk, parts.wingR);
  parts.head = new THREE.Group(); parts.head.position.set(0, 3.2, 5.6); body.add(parts.head);
  box(3, 4, 3, 0, 0.8, 0, goldHi, parts.head); box(3.6, 3.4, 3.6, 0, 3.4, 1.2, gold, parts.head);
  box(1.6, 1.2, 2, 0, 3.3, 3.6, orange, parts.head); box(0.6, 1.2, 2.6, 0, 5.6, 1.2, red, parts.head); box(0.8, 1.4, 0.8, 0, 2.2, 3.1, red, parts.head);
  box(0.6, 0.6, 0.3, 1.5, 4, 3.0, 0x1b1410, parts.head); box(0.6, 0.6, 0.3, -1.5, 4, 3.0, 0x1b1410, parts.head);
  for (const sx of [-1.6, 1.6]) { box(0.7, 3.6, 0.7, sx, 1.8, 0.5, orange, g); box(2.2, 0.5, 2.6, sx, 0.25, 1.1, orange, g); }
  g.userData.parts = parts; return g;
}

// A simple walking rig: legs and arms swing from rig.walk = { sw, arm, carry, clap }.
function rigWalk(rig) {
  rig.walk = { sw: 0, arm: 0, carry: 0, clap: 0, ruffle: false, sit: false, kick: 0, t: 0 };
  rig.after = r => {
    const w = r.walk;
    if (w.ruffle) { r.armR.rotation.x = -1.75; r.armR.rotation.z = 0.15 + 0.2 * Math.sin(w.t * 16); return; }   // a hand on his head, ruffling
    if (w.sit) {                                   // seated: legs hang from the seat; a restless Jack swings his shins
      r.legL.knee.rotation.x = r.state.shinX + w.kick * 0.7 * Math.sin(w.t * 7); r.legR.knee.rotation.x = r.state.shinX + w.kick * 0.7 * Math.sin(w.t * 7 + Math.PI);
      r.legL.thigh.rotation.x = r.state.thighX + w.kick * 0.08 * Math.sin(w.t * 7); r.legR.thigh.rotation.x = r.state.thighX - w.kick * 0.08 * Math.sin(w.t * 7);
      return;
    }
    r.legL.thigh.rotation.x = w.sw; r.legR.thigh.rotation.x = -w.sw;
    r.armL.rotation.x = lerp(-w.arm, -1.15, w.carry); r.armR.rotation.x = lerp(w.arm, -1.15, w.carry);
    if (w.clap > 0) { r.armL.rotation.x = r.armR.rotation.x = -1.2; r.armL.rotation.z = -0.35 + 0.3 * Math.sin(w.clap * 30); r.armR.rotation.z = 0.35 - 0.3 * Math.sin(w.clap * 30); }
  };
}

// ── The level ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function create(els, ui) {
  const lvlEl = els.level, lapEl = els.lap;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1)); lvlEl.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1b2230); scene.fog = new THREE.Fog(0x1b2230, 200, 460);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 900);
  scene.add(new THREE.HemisphereLight(0xe8eeff, 0x40362e, 0.8));
  const sun = new THREE.DirectionalLight(0xfff0d8, 0.7); sun.position.set(-60, 160, 100); scene.add(sun);

  // The room is built in its own group at K times scale: a plank floor, a back wall, a side wall with the door (Gerda's way in), a low far wall.
  const room = new THREE.Group(); room.scale.setScalar(K); scene.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * R_, 2 * R_), new THREE.MeshLambertMaterial({ map: earthTexture([14, 14]) })); floor.rotation.x = -Math.PI / 2; room.add(floor);   // packed earth
  const wallMat = new THREE.MeshLambertMaterial({ map: plankTexture('#6e5a46', '#55442f', [8, 3]) });
  const attached = [];                                                                               // things fixed to a wall go with it
  const mark = (side, from) => { const g = new THREE.Group(); room.children.slice(from).forEach(k => g.add(k)); room.add(g); attached.push({ g, side }); };
  const walls = [];                                                                                  // (each tagged with its side, so a wall the camera has gone through can be left out)
  const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); room.add(m); walls.push({ m, side: Math.abs(x) > Math.abs(z) ? (x < 0 ? 'w' : 'e') : (z < 0 ? 'n' : 's') }); return m; };
  const WH = 42, W = R_ + 1;                                                                        // wall height (design units): over a head taller than Gerda
  const half = (R_ - 9) / 2;
  wall(2 * W, WH, 2, 0, WH / 2, -W);                                                                  // north wall (the chair stands against it)
  wall(2 * W, WH, 2, 0, WH / 2, W);                                                                   // south wall
  wall(2, WH, 2 * half, -W, WH / 2, -9 - half); wall(2, WH, 2 * half, -W, WH / 2, 9 + half); wall(2, WH - 30, 18, -W, 30 + (WH - 30) / 2, 0);   // west wall, with the door
  wall(2, WH, 2 * W, W, WH / 2, 0);                                                                   // east wall
  const nDoor = room.children.length;
  box(2.6, 30, 2.6, -W, 15, -9, 0x4a3a2a, room); box(2.6, 30, 2.6, -W, 15, 9, 0x4a3a2a, room);
  box(0.4, 30, 16, -W + 0.8, 15, 0, 0xf6e6b0, room);                                                 // the doorway's light
  mark('w', nDoor);
  box(20, 1, 14, D.nest[0], 0.5, D.nest[1], 0xc9a54a, room); box(20, 4, 1, D.nest[0], 2, D.nest[1] - 6.5, 0x7a5a38, room); box(1, 4, 14, D.nest[0] - 10.5, 2, D.nest[1], 0x7a5a38, room);   // the hen's nest

  // A high window in the east wall, its shutter half-latched (one leaf ajar, the other held by a latch), nearly hidden behind a tower of stacked crates and
  // shelves that someone has built up against the wall beneath it.
  { const nWin = room.children.length; const wx = R_ - 0.6, wz = -14, wy = 33;
    box(1.4, 11, 11, wx, wy, wz, 0x4a3a2a, room);                                                       // the frame
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8.4, 8.4), new THREE.MeshBasicMaterial({ color: srgb(0xcfe6f6) })); glass.position.set(wx - 0.6, wy, wz); room.add(glass);
    box(0.5, 0.5, 8.4, wx - 0.9, wy, wz, 0x5a4430, room); box(0.5, 8.4, 0.5, wx - 0.9, wy, wz, 0x5a4430, room);   // the mullions
    const leafA = new THREE.Group(); leafA.position.set(wx - 1.1, wy, wz - 4.4); room.add(leafA); box(0.7, 8.8, 4.4, 0, 0, 2.2, 0x6a4a30, leafA); leafA.rotation.y = 0.9;   // ajar
    box(0.7, 8.8, 4.4, wx - 1.1, wy, wz + 2.2, 0x6a4a30, room); box(1, 1.2, 1.6, wx - 1.5, wy, wz + 0.4, 0xb8a050, room);       // the latched leaf, and its latch
    const tow = new THREE.Group(); room.add(tow);
    const crate = (x, y, z, w, h, d, c, ry) => { const b = box(w, h, d, x, y, z, c, tow); b.rotation.y = ry || 0; box(w + 0.2, 0.7, d + 0.2, x, y + h / 2 - 0.35, z, 0x5a4026, tow).rotation.y = ry || 0; return b; };
    const col = [0x8a6a44, 0x7a5c3a, 0x96744a, 0x6e5232];
    for (let i = 0; i < 6; i++) crate(R_ - 5.2 + (i % 2) * 0.3, 3 + i * 6, wz - 1.5 + (i % 3) * 0.8, 7, 6, 7.4 + (i % 2), col[i % 4], 0.05 * (i - 2));   // the tower of crates
    crate(R_ - 5.5, 39, wz + 0.4, 6, 5, 6, col[2], 0.2);
    for (const y of [8, 17, 26, 35]) box(5.6, 0.8, 11, R_ - 3.4, y, wz + 9.5, 0x6a4a30, tow);                // a tall shelf unit beside it, on the south side
    for (const dz of [4.2, 14.8]) box(0.9, 38, 0.9, R_ - 3.4 - 2.2, 19, wz + dz, 0x5a3e26, tow);
    for (const [y, dz, c] of [[10.4, 7, 0xb89a60], [19.4, 11, 0x9a8a70], [28.4, 8, 0xc9a54a], [37.4, 12, 0x7a6a50]]) box(2.6, 2.4, 2.6, R_ - 3.4, y, wz + dz, c, tow);   // things on the shelves
    box(5.6, 0.8, 8, R_ - 3.4, 32, wz - 10, 0x6a4a30, tow); box(2.4, 3, 2.4, R_ - 3.4, 34, wz - 10, 0x8a8a90, tow);   // and a plank across the north side
    mark('e', nWin);
  }
  // Props (design units, so everything is Gerda-sized once the room is scaled).
  const props = {};
  props.rack = new THREE.Group(); props.rack.position.set(D.rack[0], 0, D.rack[1] - 6); room.add(props.rack); attached.push({ g: props.rack, side: 'n' });
  box(14, 2, 1, 0, 24, -0.5, 0x5a4430, props.rack); box(1, 3, 2, -4, 22, 0.4, 0x5a4430, props.rack); box(1, 3, 2, 4, 22, 0.4, 0x5a4430, props.rack);
  props.broom = new THREE.Group(); box(0.9, 18, 0.9, 0, 9, 0, 0x8a6a40, props.broom); box(3.4, 5, 2.2, 0, 2.5, 0, 0xc9b06a, props.broom); box(3, 1, 2, 0, 5.4, 0, 0x6a5030, props.broom);
  props.rack.add(props.broom); props.broom.position.set(0, 4, 1.6); props.broom.rotation.x = -0.12;            // hung on the rack
  props.sack = new THREE.Group(); props.sack.position.set(D.sack[0], 0, D.sack[1]); room.add(props.sack);
  box(9, 10, 7, 0, 5, 0, 0xc2a678, props.sack); box(7, 2, 5, 0, 10.4, 0, 0xe0c46a, props.sack); box(9.2, 1, 7.2, 0, 8, 0, 0x8a7448, props.sack);
  props.dish = new THREE.Group(); props.dish.position.set(D.dish[0], 0, D.dish[1]); room.add(props.dish);
  box(8, 2, 8, 0, 1, 0, 0x6a4a30, props.dish); box(6, 1, 6, 0, 2, 0, 0x2a1d12, props.dish);
  props.grain = new THREE.Group(); box(5.2, 1.6, 5.2, 0, 3.0, 0, 0xf0c64a, props.grain); box(3.2, 1.2, 3.2, 0, 4.2, 0, 0xf6d868, props.grain); box(1.6, 0.8, 1.6, 0, 5.0, 0, 0xfbe58a, props.grain); props.grain.visible = false; props.dish.add(props.grain);
  props.trough = new THREE.Group(); props.trough.position.set(D.trough[0], 0, D.trough[1]); room.add(props.trough);
  box(14, 3.2, 6, 0, 1.6, 0, 0x6a4a30, props.trough); box(12, 2.4, 4, 0, 3.0, 0, 0x2a1d12, props.trough);
  props.water = box(11.6, 0.7, 3.6, 0, 4.0, 0, 0x6ab8f6, props.trough); props.water.visible = false;           // (its top stands above both rims, so it shows)
  props.well = new THREE.Group(); props.well.position.set(D.well[0], 0, D.well[1]); room.add(props.well);
  for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) box(3, 7, 3, x, 3.5, z, 0x8a8a90, props.well);
  box(8, 3, 3, 0, 8, -4, 0x8a8a90, props.well); box(8, 3, 3, 0, 8, 4, 0x8a8a90, props.well); box(3, 3, 8, -4, 8, 0, 0x8a8a90, props.well); box(3, 3, 8, 4, 8, 0, 0x8a8a90, props.well);
  box(1.4, 16, 1.4, -5, 8, 0, 0x5a4430, props.well); box(1.4, 16, 1.4, 5, 8, 0, 0x5a4430, props.well); box(12, 1.4, 1.4, 0, 16, 0, 0x5a4430, props.well);
  // The chair against the north wall, facing south: the very chair in the correction scene (built in world units, so scaled back down inside the room group).
  props.chair = B.makeChair(); props.chair.scale.setScalar(1 / K); props.chair.position.set(D.chair[0], B.CHAIR.legH / K, D.chair[1]); room.add(props.chair);
  const makeBucket = () => { const b = new THREE.Group(); box(4.4, 4, 4.4, 0, 2, 0, 0x7a5a38, b); const w = box(3.6, 0.6, 3.6, 0, 3.8, 0, 0x6ab8f6, b); b.userData.water = w; box(0.5, 3, 0.5, 0, 6, 0, 0x4a3a2a, b); return b; };
  box(8, 0.5, 8, SPOT.bucket.x / K, 0.25, SPOT.bucket.z / K, 0x8a8a90, room); box(8.2, 0.2, 8.2, SPOT.bucket.x / K, 0.1, SPOT.bucket.z / K, 0x6e6e74, room);   // the flagstone
  const bucket = makeBucket(); bucket.position.set(SPOT.bucket.x / K, 0.5, SPOT.bucket.z / K); room.add(bucket);          // stands on it, beneath the shelf beside the broom
  bucket.userData.water.visible = false;                                                               // (empty until he fills it)
  box(7.4, 0.8, 7.4, 0, 6.2, 0, 0x6ab8f6, props.well);                                              // the basin is always full
  // Where the broom and the bucket belong (as a pose within their parents), so they can be put back.
  const home = { broom: { parent: props.rack, pos: props.broom.position.clone(), rotX: -0.12 }, bucket: { parent: room, pos: bucket.position.clone(), rotX: 0 } };

  // Dirt to sweep (world coordinates) and the footprints left in it.
  const patches = [];
  function makePatch(x, z, grainy, rad, tag) {
    const g = new THREE.Group(); g.position.set(x, 0.12, z);
    const d = new THREE.Mesh(new THREE.CircleGeometry(5.2 * K * (rad || 1), 12), mat(0x4a3722)); d.rotation.x = -Math.PI / 2; g.add(d);
    if (grainy) for (let i = 0; i < 6; i++) box(2.2, 0.4, 0.7, (i - 2.5) * 2.4, 0.5, ((i * 7) % 5 - 2) * 1.7, 0xc9a54a, g).rotation.y = i;
    scene.add(g); const p = { g, x, z, amount: 1, tag: tag || null }; patches.push(p); return p;
  }
  PATCHES.forEach(([x, z]) => makePatch(x, z, true));
  const prints = [];                                                                         // { g, x, z, amount, jack }
  const MAX_PRINTS = 90;
  function addPrint(x, z, heading, size, bird, jackMade) {
    const g = new THREE.Group(); g.position.set(x, 0.14, z); g.rotation.y = heading;
    if (bird) { for (const a of [-0.5, 0, 0.5]) { const t = box(0.35 * size, 0.2, 1.6 * size, Math.sin(a) * 0.9 * size, 0, Math.cos(a) * 0.9 * size, 0x3a2a18, g); t.rotation.y = a; } }
    else { box(1.9 * size, 0.2, 4.4 * size, 0, 0, 0, 0x3a2a18, g); box(1.5 * size, 0.2, 1.2 * size, 0, 0, 2.6 * size, 0x3a2a18, g); }
    scene.add(g); prints.push({ g, x, z, amount: 1, jack: jackMade });
    if (prints.length > MAX_PRINTS) { const o = prints.shift(); scene.remove(o.g); }
  }

  // Characters.
  const jack = B.makeJack(); B.paintJackInto(jack.skin, { outfit: 'Day', hitched: false }); jack.tex.needsUpdate = true; rigWalk(jack);
  const jackG = new THREE.Group(); jackG.add(jack.root); scene.add(jackG);
  const gerda = B.makeGerda('Work'); rigWalk(gerda); const gerdaG = new THREE.Group(); gerdaG.add(gerda.root); gerdaG.visible = false; scene.add(gerdaG);
  const hen = makeHen(), henP = hen.userData.parts; hen.scale.setScalar(0.5); scene.add(hen);   // half her old size
  // What Jack carries hangs from his right hand, in a carrier that cancels his own scale so the broom and bucket stay the room's size.
  const carrier = new THREE.Group(); carrier.position.y = -10; jack.armR.add(carrier);
  const carryBroom = new THREE.Group(); carryBroom.visible = false; carrier.add(carryBroom);
  const heldBroom = props.broom.clone(); heldBroom.rotation.set(0.62, 0, 0); heldBroom.position.set(0, -9 * Math.cos(0.62), -9 * Math.sin(0.62));
  carryBroom.add(heldBroom);   // (the handle runs through his fist, bristles leaning forward to the floor)
  const carryGrain = new THREE.Group(); carryGrain.visible = false; carrier.add(carryGrain); box(4, 3, 4, 0, -1, 3, 0xf0c64a, carryGrain); box(4.6, 1, 4.6, 0, -2.8, 3, 0x7a5a38, carryGrain);
  const carryBucket = makeBucket(); carryBucket.visible = false; carryBucket.position.set(0, -4, 3.5); carrier.add(carryBucket);
  // Spilled drops.
  const drops = []; const dropGeo = new THREE.BoxGeometry(1, 1, 1), dropMat = mat(0x6ab0f0);

  // ── State ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const S = {
    phase: 'intro', t: 0, size: SIZE_START, shownSize: SIZE_START, log: [], floats: [],
    stick: { x: 0, y: 0 }, sitting: false, sneak: false, runOn: false, running: false, pos: new V3(-R_ * K + 30, 0, 0), heading: -Math.PI / 2, speedN: 0, creeping: false, phaseWalk: 0, stride: 0, dirt: 0, foot: 1,
    holding: null, water: 0, spillAcc: 0, spillCool: 0, sweeping: false, clapCool: 0,
    items: { broom: { where: 'home', x: 0, z: 0 }, bucket: { where: 'home', x: 0, z: 0 } },
    chores: { sweep: false, dish: false, water: false, trust: false }, dishFilled: false, troughFilled: false, troughLevel: 0,
    counts: { claps: 0, spills: 0, startles: 0, unfinished: 0, dawdle: 0, litter: 0, tracked: 0 }, lie: false, told: null,
    hen: { pos: new V3(30 * K, 0, 24 * K), target: new V3(30 * K, 0, 24 * K), mode: 'wander', timer: 2, trust: 50, startleCool: 0, heading: 0, bob: 0, settled: false, dirt: 0, stride: 0 },
    cam: { yaw: 0, pitch: 0.85 }, shrunk: [], hint: '', msg: '',
  };
  const keys = {};
  const note = (text, cls) => { S.log.unshift({ text, cls: cls || '', t: S.t }); if (S.log.length > 6) S.log.pop(); ui.log && ui.log(S.log); };
  function shrink(amount, why) {
    const before = S.size; S.size = Math.max(SIZE_MIN, S.size - amount); const lost = Math.round((before - S.size) * 100);
    S.shrunk.push({ why, amount: before - S.size });
    note(lost > 0 ? `${why}: −${lost}% (you are ${Math.round(S.size * 100)}%)` : `${why}: you cannot get any smaller (50%)`, 'bad');
    S.floats.push({ text: lost > 0 ? `−${lost}%` : '50% floor', t: 0 });
  }

  // ── Input ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right', Shift: 'run', ' ': 'sweep' };
  root.addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = KEYMAP[e.key]; if (k) { keys[k] = true; if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault(); }
    if (S.phase !== 'play') return;
    if ((e.key === 'e' || e.key === 'E') && !e.repeat) interact();
    if (e.key === ' ' && !e.repeat) spaceAction();
    if ((e.key === 'c' || e.key === 'C') && !e.repeat) toggleSneak();
    if ((e.key === 'g' || e.key === 'G') && !e.repeat) callGerda();
  });
  root.addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });
  // The mouse looks around Jack: drag.
  // Touch and mouse both look around with a drag (each finger on its own: one on the joystick walks, any other drags the view).
  const drags = new Map(); renderer.domElement.style.touchAction = 'none';
  renderer.domElement.addEventListener('pointerdown', e => { drags.set(e.pointerId, { x: e.clientX, y: e.clientY }); renderer.domElement.setPointerCapture && renderer.domElement.setPointerCapture(e.pointerId); });
  renderer.domElement.addEventListener('pointermove', e => {
    const d = drags.get(e.pointerId); if (!d) return;
    if (!LOCK_CAM) { S.camOverride = true; S.cam.yaw -= (e.clientX - d.x) * 0.006; }
    else if (S.phase === 'play' && !S.sitting) S.heading -= (e.clientX - d.x) * 0.006;                       // dragging sideways turns him (and so the camera): an alternative to A/D
     S.cam.pitch = clamp(S.cam.pitch + (e.clientY - d.y) * 0.005, 0.06, 1.4); d.x = e.clientX; d.y = e.clientY;
  });
  const endDrag = e => { drags.delete(e.pointerId); };
  renderer.domElement.addEventListener('pointerup', endDrag); renderer.domElement.addEventListener('pointercancel', endDrag);

  // ── Doing things ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const near = (p, r) => S.pos.distanceTo(p) < (r || 13);
  const itemPos = n => { const it = S.items[n]; return it.where === 'floor' ? new V3(it.x, 0, it.z) : n === 'broom' ? SPOT.rack : SPOT.bucket; };
  function setHeld(what) {
    S.holding = what; carryBroom.visible = what === 'broom'; carryGrain.visible = what === 'grain'; carryBucket.visible = what === 'bucket';
    props.broom.visible = what !== 'broom'; bucket.visible = what !== 'bucket';
  }
  // Putting an item down: back where it belongs, or in place on the floor where Jack stands.
  function placeItem(name, where) {
    const it = S.items[name], obj = name === 'broom' ? props.broom : bucket;
    if (where === 'home') { const h = home[name]; h.parent.add(obj); obj.position.copy(h.pos); obj.rotation.set(h.rotX, 0, 0); it.where = 'home'; }
    else {
      room.add(obj); const x = S.pos.x + Math.sin(S.heading) * 9, z = S.pos.z + Math.cos(S.heading) * 9; it.x = x; it.z = z; it.where = 'floor';
      obj.position.set(x / K, name === 'broom' ? 1.2 : 0, z / K); obj.rotation.set(name === 'broom' ? -1.45 : 0, S.heading, name === 'bucket' ? 1.45 : 0);   // a broom lies flat; a bucket lies on its side
    }
    obj.visible = true;
  }
  const CHAIR_SEAT = B.CHAIR.legH + B.CHAIR.seatTop;
  function sitDown() {
    S.sitting = true; S.pos.set(SPOT.chair.x, 0, SPOT.chair.z); S.heading = 0; S.speedN = 0; note('You sit on the chair.');
  }
  function standUp() { S.sitting = false; S.pos.set(SPOT.chair.x, 0, SPOT.chair.z + B.CHAIR.front + 8); }
  function toggleSneak() { S.sneak = !S.sneak; if (S.sneak) S.runOn = false; note(S.sneak ? 'You start sneaking.' : 'You stop sneaking.'); }
  function toggleRun() { S.runOn = !S.runOn; if (S.runOn) S.sneak = false; }
  // A new patch of dirt where something was dumped, in front of him: it has to be swept up again.
  function dirty(grainy, why) {
    const f = new V3(Math.sin(S.heading), 0, Math.cos(S.heading)).multiplyScalar(9);
    makePatch(clamp(S.pos.x + f.x, HALL.x0 + 8, HALL.x1 - 8), clamp(S.pos.z + f.z, HALL.z0 + 8, HALL.z1 - 8), grainy, 1, grainy ? 'grain' : 'water'); S.chores.sweep = false; note(why, 'bad');
  }
  function dumpWater(why) {
    spillDrops(Math.ceil(S.water / 8)); S.water = 0; S.counts.spills++; shrink(COST.spill, why); dirty(false, 'The water makes a muddy patch.');
  }
  function setTrough() { const f = S.troughLevel / 100; props.water.visible = f > 0; props.water.scale.y = Math.max(0.2, f); props.water.position.y = 3.65 + 0.35 * Math.max(0.2, f); }
  function releaseHen() {
    const h = S.hen; h.pos.copy(S.pos).addScaledVector(new V3(Math.sin(S.heading), 0, Math.cos(S.heading)), 8); h.pos.y = 0; h.mode = 'wander'; h.timer = 1.5; h.settled = false; h.target.copy(h.pos);
    if (nearNest(h.pos)) { h.pos.copy(SPOT.nest); startRest(); note('You set her in her nest.', 'good'); }
    if (h.trust < 100) S.chores.trust = false;
    S.holding = null; note('You put the hen down.');
  }
  // E: pick up whatever is nearest (the hen too), or put down what he holds (back in its place if he is next to it, otherwise where he stands); on the chair, stand.
  function interact() {
    if (S.phase !== 'play') return;
    if (S.sitting) { standUp(); return; }
    if (S.holding) {
      const what = S.holding;
      if (what === 'hen') { releaseHen(); return; }
      if (what === 'broom') { setHeld(null); if (near(SPOT.rack)) { placeItem('broom', 'home'); note('You hang the broom back up.', 'good'); } else { placeItem('broom', 'floor'); note('You drop the broom here.'); } return; }
      if (what === 'bucket') {
        if (S.water > 0) dumpWater('Dropping the water');                          // (a bucket put down with water in it slops it all over the floor)
        if (near(SPOT.bucket, 13)) { setHeld(null); S.water = 0; placeItem('bucket', 'home'); note('You put the bucket back by the broom.', 'good'); return; }
        setHeld(null); placeItem('bucket', 'floor'); note('You drop the bucket here.'); return;
      }
      if (what === 'grain') { setHeld(null); if (near(SPOT.sack)) note('You tip the grain back.'); else { dirty(true, 'The grain scatters across the floor.'); } return; }
      return;
    }
    const c = [];
    const dh = S.hen.pos.distanceTo(S.pos); if (dh < 14) c.push(['hen', dh]);
    for (const n of ['broom', 'bucket']) { const d = itemPos(n).distanceTo(S.pos); if (d < 13) c.push([n, d]); }
    const ds = SPOT.sack.distanceTo(S.pos); if (ds < 13) c.push(['grain', ds]);
    const dc = SPOT.chair.distanceTo(S.pos); if (dc < 18) c.push(['chair', dc]);
    if (!c.length) { note('Nothing to pick up here.'); return; }
    c.sort((a, b) => a[1] - b[1]); const w = c[0][0];
    if (w === 'chair') { sitDown(); return; }
    if (w === 'hen') { setHeld('hen'); note('You pick the hen up. She does not like it.', 'bad'); return; }
    setHeld(w); S.water = 0;
    note(w === 'broom' ? 'You take the broom. Hold Space to sweep.' : w === 'bucket' ? 'You take the bucket. Space at the basin fills it.' : 'You scoop up some grain. Space at the dish pours it.');
  }
  // Space: clap if his hands are free, or use what he holds (the broom sweeps while it is held down).
  function spaceAction() {
    if (S.phase !== 'play' || S.sitting) return;
    const w = S.holding;
    if (!w) {
      if (S.hen.pos.distanceTo(S.pos) < 14 && S.hen.trust >= 100 && !S.chores.trust) { S.chores.trust = true; note('The golden hen lets you stroke her. She trusts you. ✔', 'good'); return; }
      if (S.hen.mode === 'rest' && byNest(S.pos)) {                                      // in or next to her nest: settle her
        if (S.cooCool > 0) return; S.cooCool = 0.5; const h = S.hen; h.trust = Math.min(100, h.trust + 12); h.restLeft = restFor(h.trust);
        S.floats.push({ text: '+trust', t: 0 }); note(h.trust >= 100 ? 'You coo to her and she settles completely.' : 'You coo and pet her softly. She trusts you a little more.', 'good'); return;
      }
      clap(); return;
    }
    if (w === 'broom') return;
    if (w === 'hen') { note('She wriggles in your arms.'); return; }
    if (w === 'grain') {
      if (near(SPOT.dish, 14)) {
        if (S.hen.pos.distanceTo(SPOT.dish) < 10) { note('The hen is standing in the dish. (Put her somewhere else, or clap.)'); return; }
        S.dishFilled = true; S.chores.dish = true; props.grain.visible = true; setHeld(null); note('You fill her dish with grain. ✔', 'good');
      } else { setHeld(null); dirty(true, 'You scatter the grain on the floor.'); }
      return;
    }
    if (w === 'bucket') {
      if (near(SPOT.well, 21)) { if (S.water < 100) { S.water = 100; S.spillAcc = 0; note('You fill the bucket. Sneak (C) so it does not slop.'); } else note('The bucket is full.'); return; }
      if (near(SPOT.trough, 19)) {
        if (S.water < 1) { note('The bucket is empty: fill it at the basin.'); return; }
        if (S.troughLevel >= 99.5) { S.water = 0; note('The trough is already full: the rest of the water is wasted.'); return; }
        const poured = Math.min(S.water, 100 - S.troughLevel); S.troughLevel += poured; S.water = 0; setTrough();
        if (S.troughLevel >= 99.5) { S.troughFilled = true; S.chores.water = true; note('The trough is full. ✔', 'good'); }
        else note(`You pour in ${Math.round(poured)}% of a trough. It is ${Math.round(S.troughLevel)}% full: back to the basin for more.`);
        return;
      }
      if (S.water > 0) dumpWater('Pouring the water out'); else note('The bucket is empty: fill it at the well (Space).');
    }
  }
  function clap() {
    if (S.clapCool > 0) return;
    S.clapCool = 1.2; jack.walk.clap = 0.0001; S.counts.claps++;
    note('CLAP!');
    if (S.hen.pos.distanceTo(S.pos) < 60) { fleeFrom(S.pos); S.hen.trust = Math.max(0, S.hen.trust - 25); S.hen.settled = false; S.chores.trust = false; }
    shrink(COST.clap, 'Clapping at the hen');
  }
  function callGerda() { if (S.phase !== 'play') return; note('You call for Gerda.'); beginReturn(false, true); }
  function spillDrops(n) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(dropGeo, dropMat); m.position.copy(S.pos).add(new V3(0, 8, 0)); scene.add(m); drops.push({ m, v: new V3((Math.random() - 0.5) * 12, 8 + Math.random() * 8, (Math.random() - 0.5) * 12), life: 1.2 }); } }

  // ── The hen ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // The hen roams the whole room. In (or driven to) her nest she rests there for REST_MAX seconds scaled by her trust (the more unsettled, the shorter),
  // and at full trust she stays. Next to the nest, Space coos to her, which builds her trust.
  const REST_MAX = 40, NEST_R = 14;
  const roamPoint = () => new V3(lerp(HALL.x0 + 14, HALL.x1 - 14, Math.random()), 0, lerp(HALL.z0 + 14, HALL.z1 - 14, Math.random()));
  const nearNest = p => Math.abs(p.x - SPOT.nest.x) <= 10 * K && Math.abs(p.z - SPOT.nest.z) <= 7 * K;                 // anywhere within the nest's confines
  const byNest = p => Math.abs(p.x - SPOT.nest.x) <= 10 * K + 12 && Math.abs(p.z - SPOT.nest.z) <= 7 * K + 12;       // inside it or right beside it
  const restFor = trust => trust >= 100 ? Infinity : 5 + 0.2 * trust;                                                    // at least 5 s, plus 2 s for every 10% of trust
  function startRest() { const h = S.hen; h.mode = 'rest'; h.target = SPOT.nest.clone(); h.restLeft = restFor(h.trust); }
  function fleeFrom(from) {
    const h = S.hen, away = h.pos.clone().sub(from); away.y = 0; if (away.lengthSq() < 0.01) away.set(1, 0, 0.3); away.normalize();
    let t = h.pos.clone().addScaledVector(away, 34); t.x = clamp(t.x, HALL.x0 + 14, HALL.x1 - 14); t.z = clamp(t.z, HALL.z0 + 14, HALL.z1 - 14);
    if (t.distanceTo(h.pos) < 10) t = roamPoint();
    const toNest = SPOT.nest.clone().sub(h.pos); toNest.y = 0;                              // driven towards the nest, she bolts for it
    if (toNest.length() > 3 && toNest.length() < 85 && away.dot(toNest.clone().normalize()) > 0.8) t = SPOT.nest.clone();
    h.target = t; h.mode = 'flee'; h.settled = false;
  }
  function updateHen(dt) {
    const h = S.hen, d = h.pos.distanceTo(S.pos), before = h.pos.clone(); h.startleCool = Math.max(0, h.startleCool - dt); S.cooCool = Math.max(0, (S.cooCool || 0) - dt);
    if (S.holding === 'hen') {                                                           // held in his arms: her trust drains as fast as a clap costs it, every second
      const sc = S.shownSize * FULL; h.mode = 'held'; h.settled = false; h.trust = Math.max(0, h.trust - 25 * dt); if (h.trust < 100) S.chores.trust = false;
      h.pos.copy(S.pos).addScaledVector(new V3(Math.sin(S.heading), 0, Math.cos(S.heading)), 7 * sc); hen.position.set(h.pos.x, 11 * sc, h.pos.z); hen.rotation.y = S.heading + Math.PI;
      h.bob += dt * 14; henP.wingL.rotation.z = 0.6 + 0.5 * Math.sin(h.bob); henP.wingR.rotation.z = -henP.wingL.rotation.z; henP.head.rotation.x = -0.2; henP.tail.rotation.x = -0.4; return;
    }
    const staying = h.mode === 'rest';                                                     // once settled she is unmoved by fast movement
    if (d < ALARM_RADIUS && S.speedN > HEN_ALARM && h.mode !== 'flee' && !staying) {         // too fast, too close: she backs away
      fleeFrom(S.pos); h.trust = Math.max(0, h.trust - 14);
      if (h.startleCool <= 0) { h.startleCool = 4; S.counts.startles++; note('You moved too fast: the hen backs away.', 'bad'); shrink(COST.startle, 'Startling the hen'); }
    }
    if (d < 16 && S.speedN < CALM && h.mode !== 'flee' && !S.chores.trust) h.trust = Math.min(100, h.trust + (S.speedN < 1 ? 16 : 10) * dt);   // slow and close: she warms to you
    if (h.mode === 'rest') {
      const dd = SPOT.nest.distanceTo(h.pos); if (dd > 0.5) h.pos.addScaledVector(SPOT.nest.clone().sub(h.pos).normalize(), Math.min(dd, 12 * dt));
      if (h.trust >= 100) h.restLeft = Infinity; else h.restLeft -= dt;
      if (h.restLeft <= 0) { h.mode = 'wander'; h.timer = 1; h.target = roamPoint(); note('The hen gets up and wanders off.'); }
    } else if (h.mode === 'flee') { const dd = h.target.distanceTo(h.pos); if (dd < 1) { if (nearNest(h.pos)) startRest(); else { h.mode = 'wander'; h.timer = 2; } } else h.pos.addScaledVector(h.target.clone().sub(h.pos).normalize(), Math.min(dd, 34 * dt)); }
    else {
      if (h.trust >= 100) h.target = SPOT.nest.clone();                                       // fully trusting: she goes and stays in her nest
      h.timer -= dt; const dd = h.target.distanceTo(h.pos);
      if (dd > 1) h.pos.addScaledVector(h.target.clone().sub(h.pos).normalize(), Math.min(dd, 9 * dt)); else if (h.trust >= 100 || nearNest(h.pos) && h.target.distanceTo(SPOT.nest) < 1) startRest();
      if (h.timer <= 0 && h.mode === 'wander') { h.timer = 3 + Math.random() * 5; h.target = Math.random() < 0.25 ? SPOT.dish.clone().add(new V3(-7, 0, -6)) : roamPoint(); }
    }
    h.pos.x = clamp(h.pos.x, HALL.x0 + 5, HALL.x1 - 5); h.pos.z = clamp(h.pos.z, HALL.z0 + 5, HALL.z1 - 5);
    // Dirt on her feet: the hen tracks it too.
    for (const p of patches) if (p.amount > 0.2 && Math.hypot(p.x - h.pos.x, p.z - h.pos.z) < 5 * K) h.dirt = 4;
    h.stride += before.distanceTo(h.pos); if (h.dirt > 0 && h.stride > 3.6) { h.stride = 0; h.dirt--; addPrint(h.pos.x + (Math.random() - 0.5) * 1.5, h.pos.z + (Math.random() - 0.5) * 1.5, h.heading, 0.7, true, false); }
    const rest = h.mode === 'rest', look = rest ? S.pos.clone().sub(h.pos) : h.target.clone().sub(h.pos); if (look.lengthSq() > 0.5) h.heading = Math.atan2(look.x, look.z);
    hen.position.set(h.pos.x, rest ? 1 * K : 0, h.pos.z); hen.rotation.y = turn(hen.rotation.y, h.heading, Math.min(1, dt * 8)); h.bob += dt * (h.mode === 'flee' ? 18 : rest ? 1.5 : 5);
    const flee = h.mode === 'flee';
    henP.head.rotation.x = flee ? -0.2 : rest ? 0.1 + 0.05 * Math.sin(h.bob) : 0.35 * Math.max(0, Math.sin(h.bob));
    henP.wingL.rotation.z = flee ? 0.9 + 0.5 * Math.sin(h.bob * 2) : 0.05; henP.wingR.rotation.z = -henP.wingL.rotation.z; henP.body.position.y = 6.5 + (flee ? 0.8 * Math.abs(Math.sin(h.bob)) : 0) - (rest ? 1.2 : 0);
    henP.tail.rotation.x = flee ? -0.6 : 0.1;
  }

  // ── Per-frame play ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const sweepDone = () => patches.every(p => p.amount <= 0) && prints.every(p => p.amount <= 0);
  function updatePlay(dt) {
    S.t += dt; S.clapCool = Math.max(0, S.clapCool - dt); S.spillCool = Math.max(0, S.spillCool - dt);
    const scale = S.shownSize * FULL;
    // Movement, relative to where the camera looks. Hold Shift to creep.
    const f = new V3(-Math.sin(S.cam.yaw), 0, -Math.cos(S.cam.yaw)), r = new V3(Math.cos(S.cam.yaw), 0, -Math.sin(S.cam.yaw));
    const dir = new V3().addScaledVector(f, (keys.up ? 1 : 0) - (keys.down ? 1 : 0)).addScaledVector(r, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
    if (Math.hypot(S.stick.x, S.stick.y) > 0.25) dir.addScaledVector(f, -S.stick.y).addScaledVector(r, S.stick.x);
    S.creeping = S.sneak && !S.sitting; S.running = !!(keys.run || S.runOn) && !S.sitting;   // (the stick above is the on-screen joystick) && !S.sitting;
    if (S.sitting && dir.lengthSq() > 0) standUp();
    // The keys set the direction he wants to go (relative to the camera); he turns naturally into it and travels along his heading, so W then S is a
    // turn through 180 degrees, and W with D walks the diagonal.
    let vel = new V3();
    if (LOCK_CAM) {                                                                       // steering: A/D (or the stick's left/right) turn him, W/S (or up/down) walk him
      const turnIn = ((keys.left ? 1 : 0) - (keys.right ? 1 : 0)) + (Math.abs(S.stick.x) > 0.2 ? -S.stick.x : 0), fwd = ((keys.up ? 1 : 0) - (keys.down ? 1 : 0)) + (Math.abs(S.stick.y) > 0.2 ? -S.stick.y : 0);
      if (S.sitting && (turnIn || fwd)) standUp();
      if (!S.sitting) {
        S.heading += clamp(turnIn, -1, 1) * 2.4 * dt;
        if (fwd) vel.set(Math.sin(S.heading), 0, Math.cos(S.heading)).multiplyScalar(clamp(fwd, -1, 1) * (fwd < 0 ? 0.6 : 1) * (S.running ? RUN : S.creeping ? CREEP : WALK) * scale);
      }
    } else if (!S.sitting && dir.lengthSq() > 0) {
      dir.normalize(); S.heading = turn(S.heading, Math.atan2(dir.x, dir.z), Math.min(1, dt * 9));
      const off = Math.abs(turn(S.heading, Math.atan2(dir.x, dir.z), 1) - S.heading), ease = clamp(1 - off / Math.PI * 0.8, 0.2, 1);   // slower while still turning round
      vel.set(Math.sin(S.heading), 0, Math.cos(S.heading)).multiplyScalar((S.running ? RUN : S.creeping ? CREEP : WALK) * scale * ease);
    }
    const before = S.pos.clone(); S.pos.addScaledVector(vel, dt);
    { const c = SPOT.chair, dx = S.pos.x - c.x, dz = S.pos.z - c.z; if (!S.sitting && Math.abs(dx) < 10 && Math.abs(dz) < 9) { if (Math.abs(dx) / 10 > Math.abs(dz) / 9) S.pos.x = c.x + Math.sign(dx || 1) * 10; else S.pos.z = c.z + Math.sign(dz || 1) * 9; } }   // the chair is solid
    { const x0 = (R_ - 8.5) * K, z0 = (-14 - 9) * K, z1 = (-14 + 16) * K; if (S.pos.x > x0 - 3 && S.pos.z > z0 - 3 && S.pos.z < z1 + 3) S.pos.x = Math.min(S.pos.x, x0 - 3); }   // the tower of crates and shelves is solid
    for (const [p, rad] of [[SPOT.well, 11 * K], [SPOT.sack, 7 * K], [SPOT.trough, 9 * K]]) { const dd = S.pos.clone().sub(p); dd.y = 0; if (dd.length() < rad) S.pos.copy(p).addScaledVector(dd.normalize(), rad); }
    S.pos.x = clamp(S.pos.x, HALL.x0 + 6, HALL.x1 - 6); S.pos.z = clamp(S.pos.z, HALL.z0 + 6, HALL.z1 - 6);
    S.speedN = vel.length() / scale;
    // Dirt on his feet: footprints across the clean floor.
    for (const p of patches) if (p.amount > 0.2 && Math.hypot(p.x - S.pos.x, p.z - S.pos.z) < 5.2 * K) S.dirt = 7;
    S.stride += before.distanceTo(S.pos);
    if (S.dirt > 0 && S.stride > 4.4 * scale) {
      S.stride = 0; S.dirt--; S.foot = -S.foot; S.counts.tracked++;
      const side = new V3(Math.cos(S.heading), 0, -Math.sin(S.heading)).multiplyScalar(1.6 * scale * S.foot);
      addPrint(S.pos.x + side.x, S.pos.z + side.z, S.heading, scale * 1.1, false, true); S.chores.sweep = false;
    }
    // The water.
    // The water slops by the distance he covers: nothing at a walk or a sneak, about half the bucket by the trough at a run (so two trips).
    if (S.holding === 'bucket' && S.speedN > SPILL_ABOVE && S.water > 0) {
      const loss = before.distanceTo(S.pos) * 0.6 * (S.speedN - SPILL_ABOVE) / (RUN - SPILL_ABOVE); S.water = Math.max(0, S.water - loss); S.spillAcc += loss; if (Math.random() < 0.4) spillDrops(1);
      if (S.spillAcc >= 15 && S.spillCool <= 0) { S.spillAcc -= 15; S.spillCool = 1.5; S.counts.spills++; note('Water slops over the rim!', 'bad'); shrink(COST.spill, 'Spilling the water'); makePatch(S.pos.x - Math.sin(S.heading) * 4, S.pos.z - Math.cos(S.heading) * 4, false, 0.55, 'water'); S.chores.sweep = false; }
    }
    // Sweeping: Space with the broom (patches and footprints alike).
    S.sweeping = !!(keys.sweep && S.holding === 'broom');
    if (S.sweeping) {
      const front = S.pos.clone().add(new V3(Math.sin(S.heading), 0, Math.cos(S.heading)).multiplyScalar(11));
      for (const p of patches) if (p.amount > 0 && Math.hypot(p.x - front.x, p.z - front.z) < 11) p.amount = Math.max(0, p.amount - dt / 1.1);
      for (const p of prints) if (p.amount > 0 && Math.hypot(p.x - front.x, p.z - front.z) < 10) p.amount = Math.max(0, p.amount - dt / 0.5);
      if (!S.chores.sweep && sweepDone()) { S.chores.sweep = true; note('The floor is swept clean. ✔', 'good'); }
    }
    for (const p of patches) { p.g.visible = p.amount > 0.02; p.g.scale.setScalar(0.4 + 0.6 * p.amount); }
    for (const p of prints) p.g.visible = p.amount > 0.05;
    updateHen(dt);
    // Hints.
    S.hint = '';
    const floorItem = ['broom', 'bucket'].find(n => S.items[n].where === 'floor' && near(itemPos(n), 12));
    const dh = S.hen.pos.distanceTo(S.pos);
    if (S.sitting) S.hint = 'E or move: stand up';
    else if (S.holding === 'hen') S.hint = 'E: put the hen down';
    else if (S.holding === 'broom') S.hint = near(SPOT.rack) ? 'E: hang up the broom · Space (hold): sweep' : 'Space (hold): sweep · E: drop it';
    else if (S.holding === 'grain') S.hint = near(SPOT.dish, 14) ? 'Space: fill the dish' : near(SPOT.sack) ? 'E: put the grain back' : 'Take it to her dish (Space pours it out)';
    else if (S.holding === 'bucket') S.hint = near(SPOT.trough, 19) ? 'Space: pour the water in' : near(SPOT.well, 21) ? (S.water < 100 ? 'Space: fill the bucket from the basin' : 'Sneak (C) to carry it to the trough') : near(SPOT.bucket, 13) ? 'E: put the bucket back' : 'Sneak (C) to carry it; Space pours it out';
    else if (dh < 14 && S.hen.trust >= 100 && !S.chores.trust) S.hint = 'Space: stroke the hen';
    else if (S.hen.mode === 'rest' && byNest(S.pos) && S.hen.trust < 100) S.hint = 'Space: settle her · E: pick her up';
    else if (dh < 14) S.hint = 'E: pick up the hen';
    else if (floorItem) S.hint = `E: pick up the ${floorItem}`;
    else if (near(SPOT.chair, 18)) S.hint = 'E: sit on the chair';
    else if (near(SPOT.rack) && SPOT.rack.distanceTo(S.pos) <= SPOT.bucket.distanceTo(S.pos)) S.hint = S.items.broom.where === 'home' ? 'E: take the broom' : '';
    else if (near(SPOT.sack)) S.hint = 'E: scoop grain';
    else if (near(SPOT.bucket, 13)) S.hint = S.items.bucket.where === 'home' ? 'E: take the bucket' : '';
    // End of the job: when everything is done (and tidy), or the clock runs out.
    const done = CHORES.every(c => S.chores[c]);
    if (done && !S.doneAt) { S.doneAt = S.t; note('All done. Gerda will be back any moment… (or call her with G)'); }
    if ((S.doneAt && S.t - S.doneAt > 4) || S.t > TIME_LIMIT) beginReturn(S.t > TIME_LIMIT && !done, false);
  }

  // ── Characters on screen ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  function poseJack(dt) {
    S.shownSize += (S.size - S.shownSize) * Math.min(1, dt * 5); const sc = S.shownSize * FULL;
    jackG.position.copy(S.pos); if (S.sitting) { jackG.position.y = CHAIR_SEAT - 4 * sc; jackG.position.z = SPOT.chair.z + B.CHAIR.front - 1.5 - 6 * sc; }   // (knees at the seat's front edge, shins hanging free)
    jack.root.scale.setScalar(sc); jack.root.rotation.y = turn(jack.root.rotation.y, S.heading, Math.min(1, dt * 12));
    carrier.scale.setScalar(K / sc);                                                       // (the broom and bucket stay the room's size)
    const patient = clamp((S.size - 0.5) / 0.45, 0, 1);                                      // 95%+ is fully patient, 50% kicks his feet playfully
    if (S.sitting !== !!jack.walk.sit) { B.setPose(jack, S.sitting ? 'sit' : 'stand'); jack.walk.sit = S.sitting; }
    jack.walk.kick = S.sitting ? (1 - patient) * 0.9 : 0; jack.walk.t += dt * (1.6 - 0.6 * patient);
    const moving = S.speedN > 0.5; S.phaseWalk += dt * (S.speedN * 0.42);
    jack.walk.sw = moving ? Math.sin(S.phaseWalk) * 0.65 : 0; jack.walk.arm = moving ? Math.sin(S.phaseWalk) * 0.55 : 0;
    jack.walk.carry = lerp(jack.walk.carry, S.holding === 'bucket' || S.holding === 'grain' || S.holding === 'hen' ? 1 : S.holding === 'broom' ? 0.8 : 0, Math.min(1, dt * 8));
    if (S.sweeping) { jack.walk.arm = 0; carryBroom.rotation.z = Math.sin(S.t * 14) * 0.35; } else carryBroom.rotation.z = 0;
    if (jack.walk.clap > 0) { jack.walk.clap += dt; if (jack.walk.clap > 0.45) jack.walk.clap = 0; }
    if (S.holding === 'bucket') { const w = carryBucket.userData.water; w.scale.y = Math.max(0.01, S.water / 100); w.visible = S.water > 2; }
    B.step(jack, dt);
  }
  function floatTexts(dt) {
    for (const f of S.floats) f.t += dt; S.floats = S.floats.filter(f => f.t < 1.6); ui.floats && ui.floats(S.floats, camera, jackG.position, S.shownSize * FULL);
    for (const d of drops) { d.life -= dt; d.v.y -= 40 * dt; d.m.position.addScaledVector(d.v, dt); if (d.m.position.y < 0.5) { d.m.position.y = 0.5; d.v.set(0, 0, 0); } if (d.life <= 0) scene.remove(d.m); }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].life <= 0) drops.splice(i, 1);
  }

  // ── Gerda comes back ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  let gerdaAt = null;
  function beginReturn(clockRanOut, called) {
    if (S.phase !== 'play') return;
    if (S.sitting) standUp();
    S.phase = 'return'; S.camOverride = false; S.sweeping = false; S.speedN = 0;
    if (S.holding === 'hen') releaseHen();
    if (S.holding === 'broom' || S.holding === 'bucket') { const w = S.holding; setHeld(null); S.water = 0; placeItem(w, 'floor'); } else setHeld(null);   // whatever he holds is set down where he stands
    for (const c of CHORES) if (!S.chores[c]) S.counts.unfinished++;
    if (S.counts.unfinished) shrink(COST.unfinished * S.counts.unfinished, `${S.counts.unfinished} chore${S.counts.unfinished > 1 ? 's' : ''} left undone`);
    S.counts.litter = ['broom', 'bucket'].filter(n => S.items[n].where !== 'home').length;
    if (S.counts.litter) shrink(COST.litter * S.counts.litter, S.counts.litter > 1 ? 'The broom and bucket left lying about' : 'Something left lying about');
    if (clockRanOut) { S.counts.dawdle = 1; shrink(COST.dawdle, 'Taking too long'); }
    S.called = !!called; gerdaG.visible = true; gerdaG.position.copy(SPOT.door); gerdaG.position.x = -R_ * K; gerdaAt = 'walking';
  }
  function updateReturn(dt) {
    S.t += dt;
    // Gerda walks in to meet Jack; Jack turns to face her.
    const target = new V3(S.pos.x - 22, 0, S.pos.z); target.x = Math.max(target.x, -(R_ - 4) * K);
    if (gerdaG.visible && S.phase !== 'praise') {                                          // Jack turns to look at her as she comes in, and the camera settles behind him
      const to = Math.atan2(gerdaG.position.x - S.pos.x, gerdaG.position.z - S.pos.z); S.heading = turn(S.heading, to, Math.min(1, dt * 6)); if (!LOCK_CAM && !S.camOverride) { S.cam.yaw = turn(S.cam.yaw, S.heading + Math.PI, Math.min(1, dt * 0.7)); S.cam.pitch += (0.4 - S.cam.pitch) * Math.min(1, dt * 0.7); }   // (slowly, until the player takes the camera)
    }
    if (gerdaAt === 'walking') {
      const d = target.clone().sub(gerdaG.position); d.y = 0;
      if (d.length() > 2) { gerdaG.position.addScaledVector(d.normalize(), Math.min(d.length(), 22 * dt)); gerda.root.rotation.y = turn(gerda.root.rotation.y, Math.atan2(d.x, d.z), 0.3); gerda.walk.sw = Math.sin(S.t * 8) * 0.5; gerda.walk.arm = Math.sin(S.t * 8) * 0.4; }
      else { gerdaAt = 'here'; gerda.walk.sw = 0; gerda.walk.arm = 0; S.heading = Math.atan2(gerdaG.position.x - S.pos.x, gerdaG.position.z - S.pos.z); gerda.root.rotation.y = Math.atan2(S.pos.x - gerdaG.position.x, S.pos.z - gerdaG.position.z); askHowItWent(); }
    }
    if (gerdaAt === 'praise') {                                                          // she steps up beside him and ruffles his hair
      const t2 = new V3(S.pos.x - 9, 0, S.pos.z), d = t2.clone().sub(gerdaG.position); d.y = 0;
      if (d.length() > 1) { gerdaG.position.addScaledVector(d.normalize(), Math.min(d.length(), 18 * dt)); gerda.walk.sw = Math.sin(S.t * 8) * 0.4; }
      else { gerda.walk.sw = 0; gerda.walk.ruffle = true; }
      gerda.walk.t += dt; gerda.root.rotation.y = turn(gerda.root.rotation.y, Math.atan2(S.pos.x - gerdaG.position.x, S.pos.z - gerdaG.position.z), 0.3);
    }
    updateHen(dt); poseJack(dt); B.step(gerda, dt);
  }
  // What is left at the end that he can be held to account for: spilled water only counts where it was left as dirt, and the hen's final temperament is
  // recorded rather than each time he startled her.
  // Gerda judges only the state the room is left in, not how it got there: no claps, startles, spills (unless left as dirt) or dawdling count, only what she finds.
  function finalState() {
    const left = tag => patches.filter(p => p.tag === tag && p.amount > 0.05).length, t = S.hen.trust;
    return {
      dirt: patches.filter(p => !p.tag && p.amount > 0.05).length, prints: prints.filter(p => p.amount > 0.05).length,
      water: left('water'), grain: left('grain'), litter: ['broom', 'bucket'].filter(n => S.items[n].where !== 'home').length,
      dish: !S.chores.dish, trough: S.troughLevel < 99.5, stroked: S.chores.trust,
      hen: S.chores.trust || t >= 75 ? 'calm' : t < 25 ? 'frightened' : t < 60 ? 'wary' : 'calm',
    };
  }
  const reasons = () => {
    const f = finalState(), r = [];
    if (f.dirt) r.push('left dirt on the floor');
    if (f.prints) r.push('left muddy footprints about');
    if (f.water) r.push('left spilled water on the floor');
    if (f.grain) r.push('left grain scattered about');
    if (f.dish) r.push('left her dish empty');
    if (f.trough) r.push(S.troughLevel > 0 ? 'left her trough only part full' : 'left her trough empty');
    if (f.litter) r.push('left the ' + ['broom', 'bucket'].filter(n => S.items[n].where !== 'home').join(' and the ') + ' lying about');
    if (f.hen === 'frightened') r.push('left the hen frightened'); else if (f.hen === 'wary') r.push('left the hen wary'); else if (!f.stroked) r.push('never won the hen over');
    return r;
  };
  const perfect = () => !reasons().length;
  const list = r => r.length <= 1 ? r.join('') : r.slice(0, -1).join(', ') + ' and ' + r[r.length - 1];
  function askHowItWent() {
    S.phase = 'ask';
    ui.dialog({ who: 'Gerda', text: S.called ? 'You called? Well, I am here. How did it go with the hen?' : 'There you are. So — how did it go with the hen?', choices: [
      { label: 'Tell her exactly what happened', fn: () => answer('truth') },
      { label: 'Say it all went perfectly', fn: () => answer('perfect') },
    ] });
  }
  function answer(kind) {
    S.told = kind; const real = perfect();
    if (kind === 'perfect' && !real) { S.lie = true; shrink(COST.lie, 'Lying to Gerda'); }
    const plan = buildPlan(), rs = reasons();
    // The first box is only Jack's own answer; Gerda summarises and sentences once, in the lecture that follows.
    const said = kind === 'truth' ? (real ? '“Everything done, and she lets me stroke her.”' : `“I ${list(rs)}.”`) : '“It all went perfectly.”';
    const lines = [];
    if (plan.tier === 0 && !S.lie) {                                                    // everything done and nothing wrong: no correction at all
      lines.push({ who: 'Gerda', text: kind === 'truth' ? '“Good. I like it when it is true.” She steps close and ruffles his hair. “Good boy.”' : '“It is true, too. Well done.” She steps close and ruffles his hair. “Good boy.”', praise: true });
    } else {
      lines.push({ who: 'Gerda', text: kind === 'truth' ? `“Thank you for telling me straight. You ${list(rs)}.”` : `“Does it? You ${list(rs)}. And now you have lied to me about it as well — that is the part that earns the extra.”` });
      lines.push({ who: 'Gerda', text: plan.verdict + (plan.tier === 0 ? ' “Across my lap, for luck.”' : ' “Over my knee. Now.”') });
    }
    const go = () => { ui.fade && ui.fade(true); setTimeout(() => { startDiscipline(plan); ui.fade && ui.fade(false); }, 1000); };
    const next = i => {
      if (i < 0) { ui.dialog({ who: 'Jack', text: said, choices: [{ label: 'Continue…', fn: () => next(0) }] }); return; }
      const l = lines[i], last = i === lines.length - 1;
      if (l.praise) { S.phase = 'praise'; gerdaAt = 'praise'; ui.dialog({ who: l.who, text: l.text, choices: [{ label: 'Smile', fn: finishPraise }] }); return; }
      ui.dialog({ who: l.who, text: l.text, choices: [last ? { label: 'Go with her…', fn: go } : { label: 'Listen…', fn: () => next(i + 1) }] });
    };
    next(-1);
  }

  // ── Severity ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // How Jack really did, plus whether he lied: demerits, then a tier (0 token … 3 severe); a lie lifts it a tier.
  function demerits() { const f = finalState(); return (f.dirt ? 2 : 0) + (f.prints ? 0.5 + 0.25 * Math.min(f.prints, 6) : 0) + f.water * 1 + f.grain * 0.5 + (f.dish ? 2 : 0) + (f.trough ? 2 : 0) + f.litter * 0.5 + (f.hen === 'frightened' ? 2.5 : f.hen === 'wary' ? 1.5 : f.stroked ? 0 : 1); }
  function buildPlan() {
    const d = demerits(); let tier = d < 0.01 ? 0 : d < 1.5 ? 1 : d < 4 ? 2 : 3; if (S.lie) tier = Math.min(3, tier + 1);   // (a spotless job is praised, not corrected; anything at all earns at least a light one)
    const TIERS = [
      { name: 'Token', hand: 14, paddle: 0, strength: 0.7, pace: 1.7, verdict: 'No complaints really — “a few for luck, then.”' },
      { name: 'Light', hand: 30, paddle: 0, strength: 0.85, pace: 1.8, verdict: '“A light correction, I think.”' },
      { name: 'Firm', hand: 44, paddle: 0, strength: 0.9, pace: 1.9, verdict: '“A firm one. Come along.”' },
      { name: 'Severe', hand: 34, paddle: 6, strength: 1.0, pace: 2.0, verdict: '“I think the paddle, this time.”' },
    ];
    return Object.assign({ tier, demerits: d, reasons: reasons(), lie: S.lie }, TIERS[tier]);
  }

  // ── The scripted correction ────────────────────────────────────────────────────────────────────────────────────────────────────────
  let lap = null, steps = [], stepAt = 0, stepWait = 0, planNow = null;
  function startDiscipline(plan) {
    planNow = plan; S.phase = 'discipline'; S.floats = []; ui.floats && ui.floats([], camera, jackG.position, 1);
    lvlEl.style.display = 'none'; lapEl.style.display = 'block'; ui.discipline(true, plan);
    if (!lap) { lap = Lap.create(lapEl); lap.on((type) => { if (type === 'tooharsh') say('Gerda', 'That is quite enough.'); }); }
    carryIntoLap();
    lap.reset(); lap.st.sound = true; lap.st.noRecovery = true; lap.outfit('gerda', 'Work'); lap.outfit('jack', 'Day'); lap.size(S.size);
    lap.layers({ trousers: 'up', drawers: 'up' }); lap.implement('hand'); lap.st.side = 'alt';
    // A smaller Jack feels the same hand more: strength grows as he shrinks.
    lap.st.strength = clamp(plan.strength, 0.5, 1.5);       // (the engine itself makes a smaller Jack feel each smack more) lap.st.pace = plan.pace; lap.view('overview');
    steps = scriptFor(plan); stepAt = 0; stepWait = 0.5;
  }
  // The correction happens in the middle of the room, exactly as Jack left it: the room, the dirt and footprints, any broom or bucket left lying
  // about, and the hen settled in her nest, all move into the lap scene (whose own floor is hidden).
  let world = null, after = null;
  function carryIntoLap() {
    props.chair.visible = false;                                                            // (Gerda is sitting on it)
    const sc = lap.scene; lap.floor.visible = false; sc.background = new THREE.Color(0x1b2230); sc.fog = new THREE.Fog(0x1b2230, 240, 560);
    world = new THREE.Group(); world.position.y = lap.floor.position.y; sc.add(world);   // the room's floor is the lowered floor, under the chair's legs
    world.add(room); patches.forEach(p => world.add(p.g)); prints.forEach(p => world.add(p.g)); drops.forEach(d => world.add(d.m));
    const n = SPOT.nest; hen.position.set(n.x, 1 * K, n.z); hen.rotation.y = Math.atan2(-n.x, -n.z); world.add(hen);
    henP.head.rotation.x = 0.1; henP.wingL.rotation.z = 0.05; henP.wingR.rotation.z = -0.05; henP.body.position.y = 5.5; henP.tail.rotation.x = 0.1;
  }
  const say = (who, text) => ui.say(who, text);
  const sayStep = (who, text, ms) => ({ say: [who, text], wait: ms || 2600 });
  // The script: runs of smacks and the actions between them. The talk never pauses anything: lines are tied to the smack count and spoken while the hand keeps
  // falling (Gerda's, and Jack's own cries). Only a change of clothing or implement stops the run, and its line is spoken as it happens.
  let talk = [], talkAt = 0;
  function scriptFor(p) {
    const st = []; talk = []; talkAt = 0; let total = 0, gi = 0, ji = 0, who = 0;
    st.push({ do: () => lap.view('overview'), wait: 900 });
    const G = ['Hold still.', 'Hands where they are.', 'Every one of these was avoidable.', 'You know exactly why.', 'Stay over my knee.', 'I am not nearly done.', 'This is what comes of it.', 'Count them for me. No? Then just feel them.'];
    const Jl = ['Ow!', 'Ahh — sorry!', 'Please!', 'Ow, ow, ow!', 'I will do better, I promise!', 'It stings!', 'I am sorry, Gerda!', 'Ah — ah — please!'];
    const at = (k, w, t) => talk.push({ at: k, who: w, text: t });
    // One unbroken run of n smacks; `ends` are lines at its close.
    const run = (n, ends) => {
      if (!n) return;
      for (let k = 3; k < n; k += 4) { who ^= 1; who ? at(total + k, 'Gerda', G[gi++ % G.length]) : at(total + k, 'Jack', Jl[ji++ % Jl.length]); }
      (ends || []).forEach(e => at(total + n, e[0], e[1]));
      st.push({ run: n }); total += n;
    };
    const act = (fn, who2, text) => st.push({ do: fn, say: text ? [who2, text] : null, wait: 1100 });
    if (p.tier === 0) run(p.hand, [['Gerda', 'There. Off you go.']]);
    else if (p.tier === 1) run(p.hand, [['Gerda', 'That will do.']]);
    else if (p.tier === 2) {
      run(Math.ceil(p.hand / 3));
      act(() => lap.layers({ trousers: 'down' }), 'Gerda', 'Shorts down. You know why.');
      run(p.hand - Math.ceil(p.hand / 3), [['Gerda', 'Nearly done.']]);
    } else {
      act(() => lap.layers({ trousers: 'down' }), 'Gerda', 'Shorts down. This is what honesty costs.');
      run(Math.ceil(p.hand / 2));
      act(() => lap.layers({ trousers: 'down', drawers: 'down' }), 'Gerda', 'And these come down too.');   // (the drawers earned: halfway through the hand)
      run(p.hand - Math.ceil(p.hand / 2));
      st.push({ idle: true }); act(() => lap.implement('paddle'), 'Gerda', 'The paddle for the rest.');
      run(p.paddle, [['Jack', 'Please — no more!'], ['Gerda', 'And that is the last of it.']]);
    }
    st.push({ end: true });
    return st;
  }
  function updateDiscipline(dt) {
    lap.update(dt); cullWalls(lap.camera); ui.meter && ui.meter(lap.info());
    while (talkAt < talk.length && lap.st.hits >= talk[talkAt].at) { say(talk[talkAt].who, talk[talkAt].text); talkAt++; }
    if (after) { const a = after, cp = Math.cos(a.pitch); lap.camera.position.set(a.T.x + Math.sin(a.yaw) * cp * a.dist, a.T.y + Math.sin(a.pitch) * a.dist, a.T.z + Math.cos(a.yaw) * cp * a.dist); lap.camera.lookAt(a.T); cullWalls(lap.camera); }
    if (after) { B.step(after.j, dt); B.step(after.g, dt); after.t += dt; if (after.t > 1) { after.t = 0; after.paint(); } }
    if (stepAt >= steps.length) return;
    if (stepWait > 0) { stepWait -= dt; return; }
    const s = steps[stepAt];
    if (s.run) {                            // a run of smacks: start it, then wait until it has finished (or been stopped)
      if (!s.started) { s.started = true; lap.run(s.run); return; }
      if (!lap.st.swing && lap.st.runLeft === 0) stepAt++;
      return;
    }
    if (s.idle) { if (!lap.st.swing) stepAt++; return; }
    if (s.say) say(s.say[0], s.say[1]);
    if (s.do) s.do();
    if (s.end) { finishDiscipline(false); stepAt = steps.length; return; }
    stepAt++; stepWait = (s.wait || 0) / 1000;
  }
  // The summary shown at the bottom: the smacks and everything he was disciplined for.
  function summary(red, hits) { return { red, praise: false, plan: planNow, size: S.size, hits, reasons: reasons(), lie: S.lie, claps: S.counts.claps }; }
  function finishDiscipline(red) {
    lap.end && lap.end(); const sm = summary(red, lap.st.hits);
    if (red) { ui.finish(sm); return; }
    ui.dialog({ who: 'Gerda', text: '“That is the end of it. Up you get — shorts and all — and nose to the wall. Go on.”', choices: [{ label: 'Continue', fn: () => {
      ui.fade && ui.fade(true); setTimeout(() => { buildAftermath(); ui.finish(sm); ui.fade && ui.fade(false); }, 1000); } }] });
  }
  // Afterwards: Jack stands facing the wall with his bottoms and drawers down, Gerda standing behind him, the chair still in the centre of the room.
  function buildAftermath() {
    lap.gerda.root.visible = false; lap.jack.root.parent.visible = false;
    const sz = S.size * FULL, j = B.makeJack(), g = B.makeGerda('Work'), bz = -(R_ * K) + 7;
    let paint = () => { B.paintJackInto(j.skin, { outfit: 'Day', trousers: 'down', drawers: 'down', marks: lap.st.marks, expr: 2, hitched: true }); j.tex.needsUpdate = true; };
    // The glutes block over the gathered tunic's hem (as in the lap): bare, and carrying the colour.
    const gl = B.makeGlutes(); gl.mesh.scale.set(0.98, 1, 0.4); gl.mesh.position.set(0, -1.4, -2.2); j.hips.add(gl.mesh);
    const paintG = () => { B.paintGlutesInto(gl.skin, { trousers: 'down', drawers: 'down', marks: lap.st.marks, outfit: 'Day' }); gl.tex.needsUpdate = true; };
    paintG(); const paintAll = paint; paint = () => { paintAll(); paintG(); };
    paint(); j.legL.ring.visible = j.legR.ring.visible = true; B.setPose(j, 'stand'); B.setPose(g, 'stand');
    j.after = r => { r.neck.rotation.x = 0.25; };                                              // arms at his sides, head bowed
    const jh = new THREE.Group(), gh = new THREE.Group(); jh.add(j.root); gh.add(g.root);
    jh.position.set(0, 0, bz); jh.rotation.y = Math.PI; j.root.scale.setScalar(sz);
    gh.position.set(-14, 0, -30);                                        // (she stands nearer the chair than to him) gh.rotation.y = Math.PI;                                              // (facing him)
    world.add(jh); world.add(gh);
    // The camera is locked on his glutes, from behind and a little above.
    // (the room sits on the lowered floor) The usual camera rules, except it is pinned to his glutes rather than the back of his head: it sits behind him,
    // the player tilts it with a vertical drag and swings it round him with a horizontal one.
    lap.controls.enabled = false; const fy = world.position.y; lap.controls.target.set(0, fy + 7.2, bz); lap.camera.position.set(9, fy + 14, bz + 24);
    after = { j, g, paint, t: 0, yaw: 0.35, pitch: 0.27, dist: 26, T: new V3(0, fy + 7.2, bz) };
    const el = lap.renderer.domElement, ptr = new Map(); el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); el.setPointerCapture && el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { const d = ptr.get(e.pointerId); if (!d || !after) return; after.yaw -= (e.clientX - d.x) * 0.006; after.pitch = clamp(after.pitch + (e.clientY - d.y) * 0.005, 0.02, 1.4); d.x = e.clientX; d.y = e.clientY; });
    ['pointerup', 'pointercancel'].forEach(ev => el.addEventListener(ev, e => ptr.delete(e.pointerId)));
  }
  function redWord() { if (S.phase !== 'discipline' || !lap) return; stepAt = steps.length; lap.red(); say('Gerda', 'Red. Stopping at once. Come here.'); finishDiscipline(true); }

  // A wall the camera has passed through is not drawn, so the scene stays visible from outside.
  function cullWalls(cam) {
    const lim = R_ * K, p = cam.position;
    const past = side => side === 'n' ? p.z < -lim : side === 's' ? p.z > lim : side === 'w' ? p.x < -lim : p.x > lim;
    for (const w of walls) w.m.visible = !past(w.side);
    for (const a of attached) a.g.visible = !past(a.side);
  }

  // ── The opening: Jack stands facing Gerda in the doorway, who tells him (and the player) what she expects, then goes out ──────────────────────────────
  let leaving = false;
  function startIntro() {
    jack.root.rotation.y = S.heading; gerdaG.visible = true; gerdaG.position.set(-R_ * K + 3, 0, 0); gerda.root.rotation.y = Math.PI / 2; S.cam.pitch = 0.3;
    const lines = [
      '“Jack. I have to go out for a while, and you are in charge of my golden hen. Stand up straight and listen properly.”',
      '“Sweep the floor — every bit of dirt, and any footprints you leave on it. Fill her dish with grain from the sack. And bring her water from the basin to her trough: walk, or sneak, and it will arrive full. Run with that bucket and it will slop, and you will be fetching it twice.”',
      '“Win her trust. Move slowly when you are near her, never clap at her, and never pick her up. If she is unsettled, coax her into her nest and settle her there with a few soft words.”',
      '“When you are done, the broom hangs on its hook and the bucket stands on its flagstone under the shelf. I shall judge the room exactly as I find it — not how it got that way — and I shall ask you how it went. I expect the truth.”',
      '“Do well and you will keep your size. Make a mess of it, and you will find yourself smaller — and over my knee. Off you go.”',
    ];
    const next = i => ui.dialog({ who: 'Gerda', text: lines[i], choices: [{ label: i < lines.length - 1 ? 'Continue…' : 'Yes, Gerda.', fn: () => i < lines.length - 1 ? next(i + 1) : (S.phase = 'play', leaving = true) }] });
    next(0);
  }
  function updateIntro(dt) {
    S.t += dt; poseJack(dt); updateHen(dt); stepLeave(dt);
  }
  function stepLeave(dt) {
    B.step(gerda, dt);
    if (leaving) {
      gerda.root.rotation.y = turn(gerda.root.rotation.y, -Math.PI / 2, Math.min(1, dt * 6)); gerdaG.position.x -= 20 * dt; gerda.walk.sw = Math.sin(S.t * 8) * 0.5; gerda.walk.arm = Math.sin(S.t * 8) * 0.4;
      if (gerdaG.position.x < -R_ * K - 16) { gerdaG.visible = false; leaving = false; gerda.walk.sw = gerda.walk.arm = 0; }
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function frame(dt) {
    if (S.phase === 'discipline') { updateDiscipline(dt); return; }
    if (S.phase === 'play') { updatePlay(dt); poseJack(dt); stepLeave(dt); }
    else if (S.phase === 'intro') updateIntro(dt);
    else if (S.phase === 'return' || S.phase === 'ask' || S.phase === 'praise' || S.phase === 'done') updateReturn(dt);
    floatTexts(dt);
    // Camera: locked at a fixed distance *in Jack's own sizes* (so as he shrinks the room seems to grow), looking where the mouse points. During the
    // talk it takes in Gerda as well.
    if (LOCK_CAM) S.cam.yaw = turn(S.cam.yaw, S.heading + Math.PI, Math.min(1, dt * 10));          // locked behind his head
    const sc = S.shownSize * FULL, talk = S.phase !== 'play' && gerdaG.visible;
    const at = talk ? S.pos.clone().add(gerdaG.position).multiplyScalar(0.5) : S.pos.clone();
    const dist = 105 * sc + (talk ? S.pos.distanceTo(gerdaG.position) * 1.1 : 0), lookH = (S.sitting ? CHAIR_SEAT * 0.8 + 12 * sc : 17 * sc) + (talk ? 8 : 0);
    const cp = Math.cos(S.cam.pitch), sp = Math.sin(S.cam.pitch);
    const want = new V3(at.x + Math.sin(S.cam.yaw) * cp * dist, lookH + sp * dist, at.z + Math.cos(S.cam.yaw) * cp * dist);
    want.x = clamp(want.x, HALL.x0 - 90, HALL.x1 + 90); want.z = clamp(want.z, HALL.z0 - 90, HALL.z1 + 90); want.y = clamp(want.y, 2, 190);
    camera.position.lerp(want, Math.min(1, dt * 10)); camera.lookAt(at.x, lookH, at.z); cullWalls(camera);
    renderer.render(scene, camera);
    ui.hud && ui.hud(S, { SIZE_MIN, TIME_LIMIT, patches: patches.filter(p => p.amount <= 0).length, patchTotal: patches.length, prints: prints.filter(p => p.amount > 0.05).length });
  }
  function resize() { const w = lvlEl.clientWidth || root.innerWidth, h = lvlEl.clientHeight || root.innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  root.addEventListener('resize', resize); resize(); camera.position.set(S.pos.x + 60, 40, S.pos.z); startIntro();

  return {
    frame, S, shrink, redWord, keys, COST, SIZE_MIN, resize, jack, gerda, hen: S.hen, props, patches, prints,
    lapRef: () => lap, view: n => lap && lap.view(n),
    interact, clap, spaceAction, toggleSneak, toggleRun, setHeld, callGerda,
    stick(x, y) { S.stick.x = x; S.stick.y = y; },
    act(name, down) { if (name === 'space') { if (down) { keys.sweep = true; spaceAction(); } else keys.sweep = false; } else if (name === 'interact') interact(); else if (name === 'sneak') toggleSneak(); else if (name === 'run') toggleRun(); else if (name === 'call') callGerda(); },
    debug: { aftermath() { startDiscipline(buildPlan()); steps = []; lap.st.marks = { L: 0.6, R: 0.5 }; buildAftermath(); }, finishAll() { for (const c of CHORES) S.chores[c] = true; S.troughLevel = 100; S.dishFilled = true; S.hen.trust = 100; patches.forEach(p => p.amount = 0); props.grain.visible = props.water.visible = true; }, answer, askHowItWent, beginReturn, buildPlan, startDiscipline },
  };
}

root.Level = { create, COST, SIZE_START, SIZE_MIN, TIME_LIMIT };
})(typeof window !== 'undefined' ? window : globalThis);
