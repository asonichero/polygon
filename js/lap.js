// Beanstalk — Across the Lap. Gerda (the Giantess) is the giver and Jack the subject, in the blocky style of js/blocky.js; this is the
// game's correction scene, driven by the pain model (js/pain.js), which turns each smack
// (implement, strength, pace, the wait with the hand raised, the clothing over the skin, how tender the skin already is) into Jack's
// distress, whose bands drive his reaction and face; the rear colours up with the smacks; trousers and drawers come up and down; and the
// safe word ("Red") stops everything at once.
// Everything is in skin pixels (1 unit = 1 pixel, a standing figure is 32 tall). Gerda sits on the chair facing +z; Jack lies face down
// across her lap, hips over her right knee, head hanging off her left side, hands toward the floor.
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky, S = root.Pain;
const V3 = THREE.Vector3, UP = new V3(0, 1, 0), DOWN = new V3(0, -1, 0);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const srgb = hex => new THREE.Color(hex).convertSRGBToLinear();

// Where everything is. P is Jack's hip joint; PITCH tips him head-down so his upper body leans toward the floor.
const P = new V3(-6, 10, 6.5), PITCH = -0.05;   // hip joint: his torso's centre (6 up from it) is over the centre of her thighs (x 0, z 3)
const JACK_FULL = 0.95;        // Jack's full size (100%) as a fraction of the model's own scale: he is a little smaller than the model he is built as
const HOVER = 1.4;            // at rest the hand or paddle hovers this far above the centre of his lower back (the contact pose, lifted)
const TIMES = { lift: 0.45, hold: 0.15, strike: 0.09, contact: 0.32, back: 0.3 };
// Implements: the hand lands with the end of Gerda's arm block, on the middle of his rear. The paddle is a small rounded blade held out from the
// right-hand face of her arm block (the side toward his head in the top view) with its face down, so it lies across one cheek at a time.
// mark is the engine's weight toward the colour at the contact site; weight/sting live in the engine's PAIN.implement.
const IMPL = {
  hand:   { name: 'Hand',   mark: 1,     paddle: false },
  paddle: { name: 'Paddle', mark: 8 / 3, paddle: true },
  birch:  { name: 'Birch',  mark: 3.2,   birch: true },
};
const LEAN = -0.75;              // how far back she sits (fixed)
const BANDS = ['composed', 'flinching', 'struggling', 'close to the edge of resistance', 'past the edge of resistance: most receptive', 'too harsh'];

function create(view, opts) {
  opts = opts || {};
  // ── Stage ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // Standalone (lap.html) it makes its own renderer, camera, orbit controls, floor and lights. Embedded (opts.external = { scene, camera, renderer }) it only adds its
  // cast to the game's scene, inside one group (api.stage) that the game places and scales, and the game renders.
  const ext = opts.external || null;
  let renderer, scene, camera, controls, floor = null;
  if (ext) {
    renderer = ext.renderer; scene = ext.scene; camera = ext.camera;
    controls = { target: new V3(), enabled: true, update() {} };
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1));
    view.appendChild(renderer.domElement);
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x14181f); scene.fog = new THREE.Fog(0x14181f, 140, 300);
    camera = new THREE.PerspectiveCamera(36, 1, 1, 600);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.minDistance = 12; controls.maxDistance = 160; controls.maxPolarAngle = Math.PI * 0.495;
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x30283a, 0.62));
    const sun = new THREE.DirectionalLight(0xfff0d8, 0.62); sun.position.set(40, 80, 60); scene.add(sun);
    const fc = document.createElement('canvas'); fc.width = fc.height = 32; const fx = fc.getContext('2d');
    fx.fillStyle = '#3a3f4a'; fx.fillRect(0, 0, 32, 32); fx.fillStyle = '#343944'; fx.fillRect(0, 0, 16, 16); fx.fillRect(16, 16, 16, 16);
    fx.fillStyle = '#2a2e38'; fx.fillRect(0, 15, 32, 1); fx.fillRect(15, 0, 1, 32);
    const ft = new THREE.CanvasTexture(fc); ft.magFilter = THREE.NearestFilter; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(16, 16); ft.encoding = THREE.sRGBEncoding;
    floor = new THREE.Mesh(new THREE.PlaneGeometry(256, 256), new THREE.MeshLambertMaterial({ map: ft })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  }
  const stage = new THREE.Group(); scene.add(stage);
  // The chair: a plank seat (top at y = 4, where Gerda's thighs rest) and a straight back.
  const LEGH = B.CHAIR.legH, chair = B.makeChair(); if (opts.noChair !== true) stage.add(chair);   // (the same chair stands in the level's room; a floor lowered to meet its legs, and Gerda's shins lengthened by the same amount)
  if (floor) floor.position.y = -LEGH;
  let jackFull = opts.jackFull || JACK_FULL;

  // ── The cast ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const gerda = B.makeGerda(), jack = B.makeJack();
  stage.add(gerda.root);
  const frame = new THREE.Group(); frame.add(jack.root); stage.add(frame);
  // Jack's frame: local +y (his head) runs along world +x, his front faces down, then the whole body is tipped head-down by PITCH.
  const qx = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), Math.PI / 2), qy = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), Math.PI / 2);
  const qz = new THREE.Quaternion().setFromAxisAngle(new V3(0, 0, 1), PITCH);
  frame.quaternion.copy(qz).multiply(qy).multiply(qx);
  const shins = [gerda.legL, gerda.legR].map(l => l.knee.children[0]);
  const setShins = seated => { for (const sh of shins) { sh.scale.y = seated ? (6 + LEGH) / 6 : 1; sh.position.y = -3 * sh.scale.y; } };   // (seated, her shins reach the lowered floor; standing, they are as they are)
  setShins(true);
  B.setPose(gerda, 'sit'); Object.assign(gerda.state, B.POSES.sit);
  Object.assign(jack.state, { hipY: 0, lift: 0 }); Object.assign(jack.target, { hipY: 0, lift: 0 });
  // The glutes block hangs from a hinge at its top edge, which lies in the plane of his back (just proud of it) at the bottom edge of the torso, and
  // tips forward from there part-way toward the angle of his thighs (which fold forward at the hip), bridging his back and his thighs. It
  // takes the look of the trousers, drawers or bare skin.
  const glutes = B.makeGlutes(), glutesTilt = new THREE.Group();
  glutesTilt.position.set(0, 0.6, -2.55); glutesTilt.rotation.x = -0.45;
  glutes.mesh.scale.set(1.1, 1.2, 1.2); glutes.mesh.position.set(0, -2.6, 2.58);   // back face in the hinge's plane, top face at the hinge
  glutesTilt.add(glutes.mesh); jack.hips.add(glutesTilt);
  // Where the hand lands: points on the back of Jack's hips (his left cheek is the nearer, world −z side), and the middle of his back.
  const mk = (x, y, z, parent) => { const o = new THREE.Object3D(); o.position.set(x, y, z); (parent || jack.torso).add(o); return o; };
  const rear = { L: mk(2, -2.4, -0.05, glutesTilt), R: mk(-2, -2.4, -0.05, glutesTilt), C: mk(0, -2.4, -0.05, glutesTilt) }, upperBack = mk(0, 10, -2);

  // The paddle: a short round handle out of the middle of the right-hand face of her forearm block (the face toward his head in the top view, +x in the
  // forearm's own frame, near its end) and a small blade with rounded corners, lying along that direction with its face down at the contact, its
  // width along the arm, across one cheek. Tool-local, the paddle runs along -y; the tool group is turned a quarter so that it runs along the arm's +x.
  const HANDLE = 1.2, BLADE_L = 4.5, BLADE_W = 4;
  const PALM_M = 6.7;       // her palm: the face of the forearm from two-thirds of the way along it from the elbow (its middle)
  const PAD_M = 5.8, PAD_SIDE = 1.5 + HANDLE + BLADE_L / 2;   // how far along the arm the paddle springs, and how far its blade's middle stands out to the side
  const tool = new THREE.Group(); tool.position.set(1.5, -PAD_M, 0); tool.rotation.z = Math.PI / 2; gerda.wrist.add(tool);
  const woodMat = c => new THREE.MeshLambertMaterial({ color: srgb(c) });
  const paddle = new THREE.Group(); paddle.visible = false; tool.add(paddle);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, HANDLE + 0.2, 12), woodMat(0x7a4e26)); handle.position.y = -(HANDLE + 0.2) / 2; paddle.add(handle);
  {
    const w = BLADE_W, l = BLADE_L, rad = 1.2, x0 = -w / 2, x1 = w / 2, y1 = -HANDLE, y0 = y1 - l, sh = new THREE.Shape();
    sh.moveTo(x0 + rad, y0); sh.lineTo(x1 - rad, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + rad); sh.lineTo(x1, y1 - rad); sh.quadraticCurveTo(x1, y1, x1 - rad, y1);
    sh.lineTo(x0 + rad, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - rad); sh.lineTo(x0, y0 + rad); sh.quadraticCurveTo(x0, y0, x0 + rad, y0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, -0.4); paddle.add(new THREE.Mesh(g, woodMat(0x9a6a38)));
  }

  // The birch: a bundle of pale twigs bound with twine at one end, held in the fist at the end of the forearm and running on along it. Each twig is two
  // segments, so the whole thing can whip: it trails behind on the way up, and bows forward on the skin.
  const BIRCH_HAND = B.BIRCH.hand, BIRCH_L = B.BIRCH.len, BIRCH_AT = BIRCH_HAND + BIRCH_L * 0.6, BIRCH_FIST = 6;     // the handle in the fist, the twigs beyond it, how far from the hand the twigs meet the skin, and how near the shoulder the fist is brought
  const birchTool = new THREE.Group(); birchTool.position.set(0, -6, 0); gerda.wrist.add(birchTool);
  const bModel = B.makeBirch(), birch = bModel.root, twigs = bModel.twigs, tips = bModel.tips; birch.visible = false; birchTool.add(birch);

  // ── The session ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  const pain = S.createPain({ tolerance: 1, resilience: 0.7 });       // (Jack at full size: the edge of resistance comes slowly; a smaller Jack feels each smack more, see impact)
  const st = {
    outfit: { gerda: 'Work', jack: 'Outdoor' }, lean: LEAN, size: 1, implement: 'hand', pace: 1, strength: 1, side: 'alt', nextSide: 'R',
    trousers: 'up', drawers: 'up', marks: { L: 0, R: 0 }, expr: 0,
    hits: 0, ended: false, red: false, peak: 0, swing: null, runLeft: 0, gap: 0, sound: true, last: null,
    from: 'lap', to: 'lap', blend: 1, blendSecs: 1, giverStance: 'sit', shinsSeated: true, armed: true, cover: 0, fumble: 0, place: 'lap', freeOn: true,
  };
  const J = { kick: 0, kickSide: 'R', t: 0 };     // Jack's reaction to the last smack, and a clock for his wriggling
  let dirty = true, repaintAt = 0, fadeAcc = 0;
  const events = [];
  const say = (type, data) => events.forEach(f => f(type, data));

  const cushion = () => {      // what Jack is wearing over the struck area, stacked as in the engine (sting only)
    const c = S.PAIN.CUSHION, worn = st.trousers === 'up' ? [c.trousers, c.briefs] : st.drawers === 'up' ? [c.briefs] : [];
    return 1 - worn.reduce((left, x) => left * (1 - x), 1);
  };
  const bandIndex = () => { const d = pain.distress(); return d < 0.3 ? 0 : d < 0.6 ? 1 : d < 0.9 ? 2 : d < 1 ? 3 : d < 1.5 ? 4 : 5; };
  const exprFor = () => Math.min(3, Math.max(0, bandIndex() - (bandIndex() >= 3 ? 1 : 0)));
  const canStrike = () => !st.ended && st.blend >= 1 && (st.to === 'lap' ? st.implement !== 'birch' : st.to === 'table');   // (the birch is for the table; it is not used across the knee)

  // Audio (js/audio.js): the smack is a short noise burst, deeper through clothing, and Jack's voice is a synthesised vowel, higher, longer and more broken the more distressed he is.
  const thwack = power => { if (st.sound && root.GameAudio) { if (st.implement === 'birch') root.GameAudio.birch(power, st.trousers === 'up'); else root.GameAudio.thwack(power, st.trousers === 'up'); } };
  const voice = (power, band) => { if (st.sound && root.GameAudio) root.GameAudio.voice(power, band, false); };

  // ── Smacks ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function smack() {
    if (!canStrike() || st.swing) return false;
    st.swing = { phase: 'lift', t: 0, side: pickSide(), waited: 0, tau: 1, hover: 1 };
    return true;
  }
  // Which cheek takes the colour of the next smack (alternating, or the one chosen).
  function pickSide() {
    if (st.implement === 'birch') return 'C';                                        // (the birch lays across both cheeks in one stroke)
    const side = st.side === 'alt' ? st.nextSide : st.side;
    if (st.side === 'alt') st.nextSide = st.nextSide === 'R' ? 'L' : 'R';
    return side;
  }
  function impact(sw) {
    const impl = IMPL[st.implement], tender = (st.marks.L + st.marks.R) / 2;
    const hit = pain.hit({ implement: st.implement, strength: st.strength / clamp(st.size, 0.5, 1),       // (as he shrinks the same smack tells more: at half size, twice as much, so the edge arrives twice as quickly)
       speed: st.pace, raised: sw.waited, tender, cushion: cushion() });
    const gain = 0.01875 * impl.mark * st.strength;
    for (const c of sw.side === 'C' ? ['L', 'R'] : [sw.side]) st.marks[c] = 1 - (1 - st.marks[c]) * (1 - gain);
    st.hits++; st.peak = Math.max(st.peak, pain.distress()); st.last = hit;
    J.kick = Math.max(J.kick, hit.reaction); J.kickSide = sw.side === 'C' ? (Math.random() < 0.5 ? 'L' : 'R') : sw.side;
    thwack(hit.reaction); voice(hit.reaction, bandIndex()); dirty = true;
    say('hit', { hit, side: sw.side, distress: pain.distress(), band: BANDS[bandIndex()] });
  }
  function advance(dt) {
    const sw = st.swing; if (!sw) return;
    const sp = st.pace; sw.t += dt * sp;       // (the whole of a smack runs at the pace: twice the pace is twice as many smacks in the time)
    const ease = x => x * x * (3 - 2 * x);
    switch (sw.phase) {
      case 'lift': sw.tau = lerp(1, 0, ease(clamp(sw.t / TIMES.lift, 0, 1))); sw.hover = sw.tau; if (sw.t >= TIMES.lift) { sw.phase = 'hold'; sw.t = 0; } break;
      case 'hold': sw.tau = 0; sw.waited = sw.t; if (sw.t >= TIMES.hold) { sw.phase = 'strike'; sw.t = 0; if (st.implement === 'birch' && st.sound && root.GameAudio) root.GameAudio.swish(st.strength); } break;
      case 'strike': { const x = clamp(sw.t / TIMES.strike, 0, 1); sw.tau = x * x; if (x >= 1) { sw.tau = 1; sw.phase = 'contact'; sw.t = 0; impact(sw); } break; }
      case 'contact': sw.tau = 1; if (sw.t >= TIMES.contact) {
        // In a run the arm goes straight from contact back up to raised for the next smack; only the last one returns to rest.
        if (st.runLeft > 0 && canStrike()) { st.runLeft--; sw.phase = 'rise'; sw.side = pickSide(); sw.waited = 0; } else sw.phase = 'back';
        sw.t = 0;
      } break;
      case 'rise': sw.tau = lerp(1, 0, ease(clamp(sw.t / TIMES.lift, 0, 1))); if (sw.t >= TIMES.lift) { sw.phase = 'hold'; sw.t = 0; } break;
      case 'back': sw.tau = 1; sw.hover = ease(clamp(sw.t / TIMES.back, 0, 1)); if (sw.t >= TIMES.back) { st.swing = null; st.gap = 0.25; } break;
    }
  }

  // ── Posing ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const tmpA = new V3(), tmpB = new V3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion();
  const world = o => o.getWorldPosition(new V3());
  const aim = (obj, dirWorld) => {            // turn obj so its -y axis runs along dirWorld
    obj.parent.getWorldQuaternion(tmpQ).invert();
    tmpA.copy(dirWorld).normalize().applyQuaternion(tmpQ);
    obj.quaternion.setFromUnitVectors(DOWN, tmpA);
  };

  // ── Pose edits (js/lap-poses.js): offsets on top of the procedural pose, per beat, applied bone by bone ───────────────────────────────────
  const ARM = 10, shoulderLocal = new V3(-5.5, 10, 0), DEG = Math.PI / 180, eul = new THREE.Euler(0, 0, 0, 'YXZ'), qd = new THREE.Quaternion();
  // Two sets of poses, made at different sizes of Jack, 100% and 50%, which the poses blend between as he scales (so the contact sites always work).
  // The file is { 100: {gerda, jack}, 50: {gerda, jack} } (a file with no sizes is taken for both).
  const LP = root.LapPoses || {};
  const mkSet = src => JSON.parse(JSON.stringify(src || {}));
  // One set of pose edits for each position (over the knee, bent over the table; the table's are optional in the file as LapPoses.table), at each of the two sizes.
  const SETS = { lap: { 100: mkSet(LP[100] || (LP.gerda ? LP : {})), 50: mkSet(LP[50] || (LP.gerda ? LP : {})) }, table: { 100: mkSet(LP.table && LP.table[100]), 50: mkSet(LP.table && LP.table[50]) } };
  const BELT_AT = new V3(-5.4, 2, -0.5), PIN_AT = new V3(0, 7.2, -3.3), GRIP_AT = new V3(-1.2, 7.2, -3.7);       // (where his hand goes for his belt, where it lies in the small of his back, and where she holds his wrist then: his hips' and torso's own axes)
  const SIZE_MIN = 0.5;                       // below this the poses do not reach (the lower limit of the position)
  // Editable poses: Hand, Paddle and Birch { rest, raised, contactL, contactR } for Gerda (the contact pose is per cheek, and per implement), and Jack { base, react }.
  const GERDA_BEATS = ['rest', 'raised', 'contactL', 'contactR'], WIELD = ['hand', 'paddle', 'birch', 'hand~reach', 'hand~hold'];      // ('hand~reach' and 'hand~hold' are laid over 'hand' while Jack's arm is reaching for his belt or pinned behind him)
  for (const pos in SETS) for (const k of [100, 50]) {
    const e = SETS[pos][k]; e.gerda = e.gerda || {}; e.jack = e.jack || {};
    for (const w of WIELD) { e.gerda[w] = e.gerda[w] || {}; for (const b of GERDA_BEATS) e.gerda[w][b] = e.gerda[w][b] || {}; }
    for (const w of WIELD) { e.jack[w] = e.jack[w] || {}; for (const b of GERDA_BEATS) e.jack[w][b] = e.jack[w][b] || {}; }     // (Jack's beats are the giver's: the same moments of the same blow)
  }
  const LOCK = JSON.parse(JSON.stringify(SETS));            // the poses as loaded: locked. The editor's sliders are offsets from these (0 when it opens); Report writes out the sum.
  const posKey = () => stanceNow() === 'table' ? 'table' : 'lap';           // the poses in force are those of where the scene is
  const EDITS = new Proxy({}, { get: (_, k) => SETS[posKey()][k] });
  let editKey = 100;                          // the set the editor is working on (Jack is held at that size while it is open)
  const sizeT = () => clamp((st.size - SIZE_MIN) / (1 - SIZE_MIN), 0, 1);    // 0 at 50%, 1 at 100%
  // The set of edits in force for a figure's bones: Gerda's depend on the implement in hand.
  const setOf = (who, key, imp) => EDITS[key][who === 'gerda' ? 'gerda' : 'jack'][imp || st.implement];
  const variant = () => st.implement !== 'hand' ? null : (st.armHold || 0) > 0.5 ? 'hand~hold' : (st.armReach || 0) > 0.5 ? 'hand~reach' : null;       // (the arm pose in force has offsets of its own)
  const editImp = () => variant() || st.implement;       // (what the editor works on)      // each body's poses for the implement in hand
  const BONES = {
    gerda: { torso: gerda.torso, neck: gerda.neck, armL: gerda.armL, armR: gerda.armR, elbowL: gerda.elbowL, elbowR: gerda.elbow, wristR: gerda.wrist, thighL: gerda.legL.thigh, thighR: gerda.legR.thigh, kneeL: gerda.legL.knee, kneeR: gerda.legR.knee, paddle: tool, birch: birchTool },
    jack: { frame, torso: jack.torso, neck: jack.neck, glutes: glutesTilt, armL: jack.armL, armR: jack.armR, elbowL: jack.elbowL, elbowR: jack.elbow, thighL: jack.legL.thigh, thighR: jack.legR.thigh, kneeL: jack.legL.knee, kneeR: jack.legR.knee },
  };
  const frameBase = frame.quaternion.clone(), glutesBase = glutesTilt.quaternion.clone(), basePos = new Map();
  for (const w in BONES) for (const n in BONES[w]) basePos.set(BONES[w][n], BONES[w][n].position.clone());
  // Put every bone back to its procedural pose (undoing last frame's offsets) before the new frame's pose is built.
  function restoreBones() {
    for (const w in BONES) for (const n in BONES[w]) {
      const b = BONES[w][n];
      if (b.userData.proc) { b.quaternion.copy(b.userData.proc); b.userData.proc = null; b.position.copy(basePos.get(b)); }
    }
    frame.quaternion.copy(frameBase); glutesTilt.quaternion.copy(glutesBase);
    gerda.pelvis.position.set(0, 1.5, 0); jack.pelvis.position.set(0, 1.5, 0);
  }
  // The offsets one bone takes at the given beat weights: a rotation (quaternion) and a position shift, or null if it has none.
  // Over the knee with the hand there are three poses of Jack's arm, each with a set of its own, never added to another: normal, reaching for his belt, and pinned. Their weights follow the pose in force (blending as one passes into the next).
  const poseSets = () => { if (st.implement !== 'hand') return [[st.implement, 1]]; const r = Math.min(1, st.armReach || 0), h = Math.min(1, st.armHold || 0); return [['hand', Math.max(0, 1 - r - h)], ['hand~reach', r], ['hand~hold', h]]; };
  // The poses are absolute: a rotation entry is the joint's own angles (degrees, in its own order) from its standing position, within the joint's range; a position entry is how far
  // the part has moved from where it stands. A bone with no rotation entry in the pose in force keeps its procedural pose; with entries in some of the beats, it blends toward them.
  const ORDER = { torso: 'YXZ', armL: 'ZXY', armR: 'ZXY', thighL: 'ZXY', thighR: 'ZXY' };
  const orderOf = n => ORDER[n] || 'XYZ';
  const LIMITS = {                                      // [low, high] in degrees about x, y, z
    elbowL: [[-150, 5], [-80, 80], [-10, 10]], elbowR: [[-150, 5], [-80, 80], [-10, 10]],       // (an elbow bends forward: negative about x; a knee, backward: positive)
    kneeL: [[0, 150], [-5, 5], [-5, 5]], kneeR: [[0, 150], [-5, 5], [-5, 5]],
    wristR: [[-10, 10], [-80, 80], [-10, 10]],
    neck: [[-55, 55], [-80, 80], [-30, 30]],
    torso: [[-35, 75], [-60, 60], [-30, 30]],
    armL: [[-185, 65], [-90, 90], [-110, 110]], armR: [[-185, 65], [-90, 90], [-110, 110]],
    thighL: [[-125, 30], [-45, 45], [-50, 50]], thighR: [[-125, 30], [-45, 45], [-50, 50]],
  };
  const clampRot = (n, r) => { const L = LIMITS[n]; return L ? r.map((v, i) => clamp(v, L[i][0], L[i][1])) : r.slice(); };
  const rotQ = (n, r) => { const c = clampRot(n, r); return new THREE.Quaternion().setFromEuler(new THREE.Euler(c[0] * DEG, c[1] * DEG, c[2] * DEG, orderOf(n))); };
  const eulerOf = (n, q) => { const e = new THREE.Euler().setFromQuaternion(q, orderOf(n)); return [e.x / DEG, e.y / DEG, e.z / DEG]; };
  function editFor(who, n, weights) {
    let any = false, wsum = 0; const pp = [0, 0, 0], qa = new THREE.Quaternion(0, 0, 0, 0); let first = null;
    const t = sizeT();
    for (const [key, wk] of [[50, 1 - t], [100, t]]) {            // blend the two sets by Jack's size
      if (!wk) continue;
      for (const [imp, vf] of poseSets()) { if (!vf) continue; const set = setOf(who, key, imp), wts = weights;       // (each pose has a set of its own: nothing is laid over anything else)
      for (const beat in wts) {
        const e = set[beat] && set[beat][n], wt = wts[beat] * wk * vf; if (!e || !wt) continue;
        if (e.r) { any = true; const q = rotQ(n, e.r); if (!first) first = q; else if (q.dot(first) < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; } qa.x += wt * q.x; qa.y += wt * q.y; qa.z += wt * q.z; qa.w += wt * q.w; wsum += wt; }
        if (e.p) { any = true; for (let i = 0; i < 3; i++) pp[i] += wt * e.p[i]; }
      } }
    }
    if (!any) return null;
    return { q: first ? qa.normalize() : null, w: Math.min(1, wsum), p: pp };
  }
  const MOVABLE = { torso: 1, frame: 1, glutes: 1, paddle: 1, birch: 1 };
  function applyEdits(who, names, weights) {
    for (const n of names) {
      const e = editFor(who, n, weights); if (!e) continue;
      const bone = BONES[who][n];
      bone.userData.proc = bone.quaternion.clone();
      if (e.q) bone.quaternion.slerp(e.q, e.w);
      if (MOVABLE[n]) { bone.position.x += e.p[0]; bone.position.y += e.p[1]; bone.position.z += e.p[2]; }       // (only the body's own parts move: a forearm, hand or leg is never pulled away from its joint)
      if (n === 'torso' && (e.p[0] || e.p[1] || e.p[2])) {            // moving the torso carries the legs with it (they hang from the same hips)
        for (const leg of ['thighL', 'thighR']) { const lb = BONES[who][leg]; if (!lb.userData.proc) lb.userData.proc = lb.quaternion.clone(); lb.position.x += e.p[0]; lb.position.y += e.p[1]; lb.position.z += e.p[2]; }
        const pv = (who === 'gerda' ? gerda : jack).pelvis; pv.position.x += e.p[0]; pv.position.y += e.p[1]; pv.position.z += e.p[2];       // (and the pelvis, which is the legs' top)
      }
    }
  }
  // How much of each beat's offsets applies now.
  // The landed pose belongs to the cheek being struck: contactL or contactR.
  function gerdaWeights() {
    const w = gerdaBeatWeights(), sw = st.swing;
    if (w.contact) { w[sw && sw.side === 'R' ? 'contactR' : 'contactL'] = w.contact; delete w.contact; }       // (both cheeks at once, 'C', is the left-hand pose)
    return w;
  }
  function gerdaBeatWeights() {
    const sw = st.swing; if (!sw) return { rest: 1 };
    const t = sw.tau;
    switch (sw.phase) {
      case 'lift': { const a = clamp(1 - t, 0, 1); return { rest: 1 - a, raised: a }; }
      case 'hold': return { raised: 1 };
      case 'strike': case 'rise': case 'freeze': return { raised: 1 - t, contact: t };
      case 'contact': return { contact: 1 };
      case 'back': { const b = clamp(sw.hover || 0, 0, 1); return { contact: 1 - b, rest: b }; }
    }
    return { rest: 1 };
  }
  const jackWeights = () => gerdaWeights();                // his beats are hers

  // Her swinging arm has an elbow: an upper arm of 4 (shoulder pivot to elbow) and a forearm of 6. Two-bone reach: where the elbow goes for the
  // shoulder at S to bring the point m along the forearm to M (it bends toward the pole when M is nearer than the arm's full length, and the arm
  // straightens, short of M, when it is further).
  const LU = 4, LF = 6, POLE = new V3(-0.7, 0.5, -0.5).normalize();
  const POLE_L = new V3(0.7, 0.5, -0.5).normalize();
  function twoBone(S, M, m, pole, lu) {
    const LUx = lu || LU, v = M.clone().sub(S), d = clamp(v.length(), Math.abs(LUx - m) + 0.05, LUx + m - 0.01), ud = v.normalize();
    const cosA = clamp((LUx * LUx + d * d - m * m) / (2 * LUx * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    const PL = pole || POLE, pp = PL.clone().addScaledVector(ud, -PL.dot(ud)).normalize();
    const E = S.clone().addScaledVector(ud, LUx * cosA).addScaledVector(pp, LUx * sinA);
    const Mx = S.clone().addScaledVector(ud, d);
    return { u1: E.clone().sub(S).normalize(), f: Mx.clone().sub(E).normalize() };
  }
  // The blade's side and the arm's pose for a forearm direction f: the blade lies toward the world's +x as far as the forearm's axis allows.
  const sideOf = f => { const v = new V3(1, 0, 0).addScaledVector(f, -f.x); return v.lengthSq() > 1e-4 ? v.normalize() : new V3(0, 0, 1); };

  // ── Places and stances ──────────────────────────────────────────────────────────────────────────────────────────────────────
  // A place is where the giver is (seated, or standing at the table) and where Jack is. His stances: 'standSeat' (upright between her knees, facing her), 'lap' (face
  // down across her right knee), 'table' (bent forward over the table's edge, chest on the top, feet on the floor), 'standTable' (upright beside the table, facing her).
  // moving between two blends his body (and the hands she lays on him) over a few seconds.
  const FLOOR = -LEGH, TABLE_H = 14.2, TABLE_TOP = FLOOR + TABLE_H, LEAN_STAND = 0.32;
  const PLACES = { seat: { giver: 'sit', jack: 'standSeat' }, lap: { giver: 'sit', jack: 'lap' }, table: { giver: 'stand', jack: 'table' }, after: { giver: 'stand', jack: 'standTable' } };
  const GIVER_AT = { sit: new V3(0, 0, 0), stand: new V3(-3, FLOOR, -10) };
  const AXX = new V3(1, 0, 0), AXY = new V3(0, 1, 0), AXZ = new V3(0, 0, 1), axq = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
  const lapQ = pitch => axq(AXZ, pitch).multiply(axq(AXY, Math.PI / 2)).multiply(axq(AXX, Math.PI / 2)), uprightQ = axq(AXY, Math.PI);
  const tablePitch = sz => clamp(Math.asin(clamp((TABLE_TOP + 2 * sz - (FLOOR + 12 * sz)) / (11 * sz), -1, 1)), 0, 0.8);
  const tableEdgeX = sz => -6 * sz + 3.5 * sz;
  function stanceFrame(name, sz) {                    // where his hip joint is, and which way his body faces
    switch (name) {
      case 'standSeat': return { p: new V3(0, FLOOR + 12 * sz, 18.5), q: uprightQ };       // (a little back from her knees, so that her head and his do not meet as she works at his belt)
      case 'standTable': return { p: new V3(-6 * sz, FLOOR + 12 * sz, 0), q: uprightQ };
      case 'table': return { p: new V3(-6 * sz, FLOOR + 12 * sz, 0), q: lapQ(tablePitch(sz)) };
      default: return { p: new V3(-6 * sz, 8.75 + 2 * sz, P.z), q: lapQ(PITCH) };
    }
  }
  const stanceNow = () => st.blend < 0.5 ? st.from : st.to;
  const strikeStance = () => { const n = stanceNow(); return n === 'lap' || n === 'table'; };
  const strikeReady = () => st.blend >= 1 && (st.to === 'lap' || st.to === 'table');
  // Jack's limbs for a stance: thighs and shins, head, arms, a little of the torso; the reaction to the last smack (k), his distress (d) and his wriggle (w) work on them.
  function limbs(name, k, d, w, sz) {
    const dd = Math.min(1, d), t = J.t, mL = J.kickSide === 'L' ? 1 : 0.45, mR = J.kickSide === 'R' ? 1 : 0.45, cover = st.cover || 0;
    if (name === 'lap') {
      // Hanging off the edge of her lap: thighs down and out from the glutes block, knees bent back so the feet clear the floor; arms reaching down past his head to the floor.
      return { tL: -0.96 + k * 0.9 * mL + w, tR: -0.96 + k * 0.9 * mR - w, zL: 0.12 + 0.2 * k * mL, zR: -(0.12 + 0.2 * k * mR), kL: 0.6 + 0.6 * k * mL + 0.5 * Math.max(0, w), kR: 0.6 + 0.6 * k * mR + 0.5 * Math.max(0, -w),
        nx: -0.1 - 0.5 * k + 0.1 * dd * Math.sin(t * 4), ny: -0.75 + 0.15 * Math.sin(t * 3) * dd, aLx: -2.14 - 0.25 * k + Math.sin(t * 7) * 0.08 * dd, aRx: -2.14 - 0.25 * k + Math.sin(t * 7 + 1.7) * 0.08 * dd,
        aLz: 0.12 + 0.1 * k, aRz: -(0.12 + 0.1 * k), tz: 0.06 * dd * Math.sin(t * 6), tx: 0, eL: -(0.35 + 0.25 * k + 0.1 * dd * Math.sin(t * 7)), eR: -(0.35 + 0.25 * k + 0.1 * dd * Math.sin(t * 7 + 1.7)) };
    }
    if (name === 'table') {
      // Bent over the table's edge: legs straight down to the floor (shifting from foot to foot, rising onto the toes at a bad one), arms out along the top, cheek on it.
      const phi = tablePitch(sz), leg = -Math.PI / 2 + phi;
      // (Over the table his hands and feet stay where the pose puts them: only his head and torso react.)
      return { tL: leg, tR: leg, zL: 0.1, zR: -0.1, kL: 0.1 * dd, kR: 0.1 * dd,
        nx: -0.1 - 0.25 * k + 0.04 * dd * Math.sin(t * 4), ny: -0.95 + 0.08 * Math.sin(t * 3) * dd, aLx: phi - Math.PI, aRx: phi - Math.PI,
        aLz: 0.26, aRz: -0.26, tz: 0.02 * dd * Math.sin(t * 6), tx: -0.05 * k, eL: -0.3, eR: -0.3 };
    }
    // Standing: weight shifting, head bowed, hands at his sides (or, as he comes to it, swung back to cover himself).
    const sh = Math.sin(t * 2.1) * dd;
    return { tL: -0.08 * sh, tR: 0.08 * sh, zL: 0.05, zR: -0.05, kL: 0.04 * Math.max(0, sh), kR: 0.04 * Math.max(0, -sh), nx: 0.05 + 0.12 * dd, ny: 0.15 * Math.sin(t * 0.7) * dd,
      aLx: 0.05 + 0.65 * cover, aRx: 0.05 + 0.65 * cover, aLz: 0.08 - 0.38 * cover, aRz: -(0.08 - 0.38 * cover), tz: 0, tx: 0.06 * dd, eL: -(0.2 + 0.7 * cover), eR: -(0.2 + 0.7 * cover) };
  }
  const mixPose = (a, b, e) => { const o = {}; for (const key in a) o[key] = a[key] + (b[key] - a[key]) * e; return o; };
  const easeIO = x => x * x * (3 - 2 * x);
  // Where she lays her hands while he is being brought to her: his belt as he stands, his shoulders once he is up again.
  const beltL = mk(2.6, 1.2, 3.2, jack.hips), beltR = mk(-2.6, 1.2, 3.2, jack.hips), shoulderL = mk(5.2, 10, 1.5, jack.torso), shoulderR = mk(-5.2, 10, 1.5, jack.torso);
  const LEAN_SIT_HANDS = 0.5;
  // The table (standalone; in the game the room's own table is used): a plank top 22 deep from the edge Jack lies over and 30 wide, on four legs.
  let table = null;
  if (opts.table !== false) {
    table = new THREE.Group(); stage.add(table); const wood = new THREE.MeshLambertMaterial({ color: srgb(0x8a6c4a) }), legs = new THREE.MeshLambertMaterial({ color: srgb(0x5a4430) });
    const tb = (w, h, d, x, y, z, m) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); table.add(q); };
    tb(22, 2.4, 30, 11, TABLE_TOP - 1.2, 0, wood); for (const [x, z] of [[2.4, -12.6], [19.6, -12.6], [2.4, 12.6], [19.6, 12.6]]) tb(2.6, TABLE_H - 2.4, 2.6, x, FLOOR + (TABLE_H - 2.4) / 2, z, legs); table.visible = false;
  }

  function birchFlex(sw, tau) {                      // the twigs trail on the way up, bow forward on the skin, and settle
    const ph = sw && sw.phase, flex = !sw ? 0.04 : (ph === 'lift' || ph === 'hold' || ph === 'rise') ? -0.25 * (1 - sw.tau) : ph === 'strike' ? -0.25 * (1 - tau) + 0.2 * tau : ph === 'contact' ? 0.2 * Math.max(0.3, 1 - sw.t / TIMES.contact) : ph === 'freeze' ? -0.25 * (1 - tau) + 0.2 * tau : ph === 'back' ? 0.1 * (1 - (sw.hover || 0)) : 0.1;
    twigs.rotation.x = flex; for (const j of tips) j.rotation.x = flex * 1.3;
  }
  // Free pose (the editor, over the table): nothing is pinned to the skin: no hand is brought to a contact point and no arm or implement aimed at one. She stands as she is, and
  // the offsets ARE the pose.
  // It also plays, outside the editor, wherever the table has poses made for the implement in hand (unless a scene turns that off with st.usePoses = false).
  const tableHasPoses = () => { const set = SETS.table[100].gerda[st.implement] || {}, set2 = SETS.table[50].gerda[st.implement] || {}; return GERDA_BEATS.some(b => Object.keys(set[b] || {}).length || Object.keys(set2[b] || {}).length); };
  const isFree = () => posKey() === 'table' && (hs.on || (st.usePoses !== false && tableHasPoses()));
  function freePose(g) {
    const impl = IMPL[st.implement], gw = gerdaWeights(), sw = st.swing;
    g.torso.rotation.order = 'YXZ'; g.torso.rotation.set(0, 0, 0); g.neck.rotation.set(0.1, 0, 0); g.elbow.rotation.set(0, 0, 0); g.elbowL.rotation.set(0, 0, 0); g.wrist.rotation.set(0, 0, 0);
    for (const key of ['armL', 'armR']) { const a = g[key]; a.rotation.set(gerda.state.armX, 0, -a.userData.sign * gerda.state.armIn); }
    paddle.visible = !!impl.paddle && st.armed; birch.visible = !!impl.birch && st.armed; tool.rotation.set(0, 0, Math.PI / 2); birchTool.quaternion.identity();
    g.root.updateMatrixWorld(true);
    applyEdits('gerda', ['torso', 'neck', 'armL', 'armR', 'elbowL', 'elbowR', 'wristR', 'thighL', 'thighR', 'kneeL', 'kneeR'], gw);
    if (impl.paddle) applyEdits('gerda', ['paddle'], gw);
    if (impl.birch) { birchFlex(sw, sw ? sw.tau : 1); applyEdits('gerda', ['birch'], gw); }
    // Playing (not editing): as the stroke lands, the arm is aimed so that the birch lies across both cheeks, its length along the line from the near cheek to the far one and its middle
    // on the centre of the glutes. The hold is the authored one (the same fist, the same birch); only the hand is brought to where the birch has to be.
    const wc = (gw.contactL || 0) + (gw.contactR || 0);
    if (impl.birch && !hs.on && wc > 0.001) {
      const q0 = g.armR.quaternion.clone(), e0 = g.elbow.rotation.x, wy0 = g.wrist.rotation.y, b0 = birchTool.quaternion.clone();
      g.root.updateMatrixWorld(true);
      const rc = world(rear.C), rl = world(rear.L), rr = world(rear.R), u = rr.clone().sub(rl).normalize(), out = new V3(0, 0, -1).applyQuaternion(glutesTilt.getWorldQuaternion(tmpQ)).normalize(), Hh = rc.clone().addScaledVector(out, 1.6); Hh.addScaledVector(u, -BIRCH_AT);      // (the birch lies on the skin, out along the back face's own normal)
      armTo(g, Hh); g.root.updateMatrixWorld(true); aim(birchTool, u);
      const q1 = g.armR.quaternion.clone(), e1 = g.elbow.rotation.x, b1 = birchTool.quaternion.clone(), k = clamp(wc, 0, 1);
      g.armR.quaternion.copy(q0).slerp(q1, k); g.elbow.rotation.set(lerp(e0, e1, k), 0, 0); g.wrist.rotation.set(0, lerp(wy0, 0, k), 0); birchTool.quaternion.copy(b0).slerp(b1, k);
    }
  }
  function armToSide(g, key, tR, pole, sc) {                   // set her arm (shoulder and elbow: both arms have one) so that the end of the forearm reaches tR
    const right = key === 'armR', arm = g[key], elbow = right ? g.elbow : g.elbowL, wrist = right ? g.wrist : g.wristL;
    const sh = world(arm), ik = twoBone(sh, tR, LF * (sc || 1), pole, LU * (sc || 1));
    aim(arm, ik.u1); const h = new V3().crossVectors(ik.u1, ik.f); let psi = Math.acos(clamp(ik.u1.dot(ik.f), -1, 1));
    if (h.lengthSq() > 1e-6) { h.normalize().negate(); arm.updateMatrixWorld(true); const xw = new V3(1, 0, 0).applyQuaternion(arm.getWorldQuaternion(tmpQ2)); const ang = Math.atan2(xw.clone().cross(h).dot(ik.u1), xw.dot(h)); arm.parent.getWorldQuaternion(tmpQ).invert(); arm.quaternion.premultiply(tmpQ2.setFromAxisAngle(ik.u1.clone().applyQuaternion(tmpQ), ang)); } else psi = 0;
    elbow.rotation.set(-psi, 0, 0); wrist.rotation.set(0, 0, 0); g.root.updateMatrixWorld(true);       // (an elbow bends the forearm forward: that is a turn of the hinge the other way from a knee's)
    const fw = new V3(0, -1, 0).applyQuaternion(wrist.getWorldQuaternion(tmpQ2)); if (fw.dot(ik.f) < 0.999) elbow.rotation.x = psi;
    return ik;
  }
  const armTo = (g, tR) => armToSide(g, 'armR', tR);
  gerda.after = function (g) {
    for (const l of [g.legL, g.legR]) { l.thigh.rotation.y = 0; l.knee.rotation.y = 0; l.knee.rotation.z = 0; }      // (see jack.after: no stray turns about the wrong axis)
    g.neck.rotation.z = 0;
    if (isFree()) { freePose(g); return; }
    const sw0 = st.swing, standing = st.giverStance === 'stand';
    if (!strikeStance()) {
      // Hands on him: at his belt (and a little fumbling at it, if `fumble` is up), or on his shoulders once he is upright again.
      g.torso.rotation.order = 'YXZ'; g.torso.rotation.set(standing ? 0.16 : LEAN_SIT_HANDS, 0, 0); g.neck.rotation.set(standing ? 0.3 : -0.45, 0, 0);      // (seated, she leans in and looks up into his face, not down at her hands)
      paddle.visible = false; birch.visible = !!(IMPL[st.implement].birch && st.armed); if (birch.visible) { twigs.rotation.x = 0.1; for (const j of tips) j.rotation.x = 0.15; }
      g.root.updateMatrixWorld(true);
      const up = st.to === 'standTable', tL = world(up ? shoulderL : beltL), tR = world(up ? shoulderR : beltR), fum = (st.fumble || 0) * 0.5 * Math.sin(J.t * 13);
      tL.y += fum; tR.y -= fum;
      armToSide(g, 'armL', tL, POLE_L);
      armToSide(g, 'armR', tR);
      return;
    }
    const gw = gerdaWeights(), sw = st.swing, impl = IMPL[st.implement], tau = sw ? sw.tau : 1, hover = sw ? (sw.hover || 0) : 1;
    // Where she lands, on the cheek being struck (they alternate, or the one chosen). The hand: the end of her forearm on its middle. The paddle: the
    // middle of its blade on it (the blade's middle plane stands a little off his skin).
    // At rest (no swing) the aim is the centre of his lower back, at whatever size he is; during a swing it is the cheek struck. It eases from one to
    // the other (and is exact while the editor holds a pose).
    const padSide = sw ? sw.side : (st.side === 'alt' ? st.nextSide : st.side);
    const goal = world(rear[sw ? padSide : 'C']); if (impl.paddle) goal.y += 0.4; goal.y += hover * HOVER;
    const snap = !st.aim || hs.on || (sw && sw.phase === 'freeze');
    st.aim = snap ? goal.clone() : st.aim.lerp(goal, 1 - Math.exp(-(st.dt || 0.016) * 12));
    const T = st.aim.clone();
    // Her torso never twists or leans for a strike (a pose edit of it stays put); the arm and, for the paddle, the blade's angle do the aiming.
    st.yaw = 0;
    g.torso.rotation.order = 'YXZ'; g.torso.rotation.set(standing ? LEAN_STAND : LEAN, st.yaw, 0); g.neck.rotation.x = standing ? 0.3 : 0.55 + 0.4 * LEAN; g.neck.rotation.y = -st.yaw * 0.9;
    applyEdits('gerda', ['torso', 'neck', 'thighL', 'thighR', 'kneeL', 'kneeR'], gw);
    g.root.updateMatrixWorld(true);
    // Left hand rests on Jack's back.
    const ahL = clamp(st.armHold || 0, 0, 1); jack.root.updateMatrixWorld(true);
    const tL = world(upperBack).lerp(jack.torso.localToWorld(GRIP_AT.clone()), ahL);       // (between his shoulder blades; or, when his arm is pinned, holding his wrist behind his back)
    armToSide(g, 'armL', tL, POLE_L); applyEdits('gerda', ['armL', 'elbowL'], gw);       // (reached by its own joints; an edit of the angles is laid over that, within their range)
    // Right arm: shoulder, elbow and wrist (the forearm's own twist). Contact pose: the hand's forearm end, or the paddle's mount, is brought to where
    // it lands; the raised pose lifts the elbow up and forward. They blend by how far the swing has come.
    const sh = world(g.armR);
    const hand = !impl.paddle && !impl.birch, reachM = impl.paddle ? PAD_M : hand ? PALM_M : LF;
    const nInW = new V3(0, 0, 1).applyQuaternion(glutesTilt.getWorldQuaternion(tmpQ)).normalize();       // (into his skin, from the back face of the glutes block)
    // The elbow's place about the line from shoulder to hand: of those that keep her arm clear of her own head, the one that lays her forearm flattest on his skin when n is given (the palm lands,
    // rather than the end of a fist), and the nearest to the usual one, and clear of him.
    g.root.updateMatrixWorld(true);
    const headAt = g.neck.localToWorld(new V3(0, 4, 0.5)), segD = (a, b, c) => { const ab = b.clone().sub(a), t = clamp(c.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1); return a.clone().addScaledVector(ab, t).distanceTo(c); };
    const flat = (S, M, m, n) => { const ud = M.clone().sub(S).normalize(); let best = null; for (let a = -180; a <= 180; a += 10) { const ik = twoBone(S, M, m, POLE.clone().applyAxisAngle(ud, a * DEG)), E = S.clone().addScaledVector(ik.u1, LU), clear = Math.min(segD(S, E, headAt), segD(E, M, headAt)), cost = (n ? Math.abs(ik.f.dot(n)) : 0) + 0.25 * Math.abs(a) / 180 + (E.y < M.y + 1 ? 2 : 0) + Math.max(0, 7.5 - clear) * 0.8; if (!best || cost < best.cost) best = { cost, ik }; } return best.ik; };
    // The birch: the fist is brought to a point above the skin, near the shoulder (about BIRCH_FIST from it), so that the twigs, running on from the fist along u, lie on the
    // skin with their middle (BIRCH_AT from the fist) on T. The forearm and the birch then differ by the bend of the wrist.
    let birchU = new V3(0, -1, 0);
    const birchContact = () => {
      const e = T.clone().sub(sh), Ld = Math.max(0.1, e.length()); e.normalize();
      const cosT = clamp((Ld * Ld + BIRCH_AT * BIRCH_AT - BIRCH_FIST * BIRCH_FIST) / (2 * Ld * BIRCH_AT), -1, 1), sinT = Math.sqrt(1 - cosT * cosT);
      let down = DOWN.clone().addScaledVector(e, -DOWN.dot(e)); if (down.lengthSq() < 0.04) down = new V3(1, 0, 0).addScaledVector(e, -e.x); down.normalize();
      const u = e.clone().multiplyScalar(cosT).addScaledVector(down, sinT).normalize();
      const H = T.clone().addScaledVector(u, -BIRCH_AT); if (root.__lapDebug) root.__lapDebug.birch = { sh: sh.toArray().map(x => +x.toFixed(1)), T: T.toArray().map(x => +x.toFixed(1)), H: H.toArray().map(x => +x.toFixed(1)), u: u.toArray().map(x => +x.toFixed(2)), Ld: +Ld.toFixed(1), cosT: +cosT.toFixed(2) };
      return { u, H };
    };
    const solve = (Mt, withSide) => {        // pose params for the forearm's point m to reach Mt (the paddle: its blade's middle then lands on T)
      if (impl.birch) { const r = birchContact(); birchU = r.u; return flat(sh, r.H, reachM, null); }
      if (hand) return flat(sh, Mt, reachM, nInW);
      let M = Mt, ik;
      for (let it = 0; it < (withSide ? 4 : 1); it++) {
        ik = flat(sh, M, reachM, null);
        if (withSide) M = Mt.clone().addScaledVector(sideOf(ik.f), -PAD_SIDE);
      }
      return ik;
    };
    const contact = solve(T, impl.paddle);
    const ud = T.clone().sub(sh).normalize();
    const outward = sh.clone().sub(headAt); outward.y = 0; outward.normalize();       // (raised up and a little out from her head, not past her face)
    const raisedAt = sh.clone().addScaledVector(ud.clone().multiplyScalar(0.35).addScaledVector(UP, 0.95).addScaledVector(outward, 0.6).normalize(), reachM * 0.95);
    const armPose = (ik, palmTo) => {                 // set the arm to ik, return its local pivot rotation, elbow flexion and wrist twist
      aim(g.armR, ik.u1);
      const h = new V3().crossVectors(ik.u1, ik.f); let psi = Math.acos(clamp(ik.u1.dot(ik.f), -1, 1));
      if (h.lengthSq() > 1e-6) {             // roll the upper arm about its own axis so the elbow's hinge (local x) is across the bend, and the forearm comes forward
        h.normalize().negate(); g.armR.updateMatrixWorld(true);
        const xw = new V3(1, 0, 0).applyQuaternion(g.armR.getWorldQuaternion(tmpQ2));
        const ang = Math.atan2(xw.clone().cross(h).dot(ik.u1), xw.dot(h));
        g.armR.parent.getWorldQuaternion(tmpQ).invert();
        g.armR.quaternion.premultiply(tmpQ2.setFromAxisAngle(ik.u1.clone().applyQuaternion(tmpQ), ang));
      } else psi = 0;
      // The elbow hinges about local x; take whichever sign puts the forearm along ik.f.
      g.elbow.rotation.set(-psi, 0, 0); g.wrist.rotation.set(0, 0, 0); g.root.updateMatrixWorld(true);
      const fw = new V3(0, -1, 0).applyQuaternion(g.wrist.getWorldQuaternion(tmpQ2));
      if (fw.dot(ik.f) < 0.999) { g.elbow.rotation.x = psi; g.root.updateMatrixWorld(true); }
      let omega = 0;
      if (impl.paddle || hand) {              // twist the forearm about its axis so the blade lies toward his head; or so that the palm (a flat face of the forearm) faces where it should (his skin, at contact; the floor, raised)
        const xw = new V3(1, 0, 0).applyQuaternion(g.wrist.getWorldQuaternion(tmpQ2)), want = hand ? palmTo : sideOf(ik.f);
        omega = -Math.atan2(xw.clone().cross(want).dot(ik.f), xw.dot(want));
        if (hand) { if (omega > Math.PI / 2) omega -= Math.PI; else if (omega < -Math.PI / 2) omega += Math.PI; }       // (either flat face will do: the nearer)
      }
      return { q: g.armR.quaternion.clone(), psi: g.elbow.rotation.x, omega };
    };
    const pc = armPose(contact, nInW);
    // The raised pose is the one, of the elbow's places about the line from shoulder to hand, that takes her arm from the landed pose with the least turn of the upper arm about itself (so that nothing spins as it
    // comes down), clear of her head, and nearest the usual one.
    const turnBetween = (qa, qb) => { const aa = new V3(0, -1, 0).applyQuaternion(qa), ab = new V3(0, -1, 0).applyQuaternion(qb), sw = new THREE.Quaternion().setFromUnitVectors(aa, ab), r = qb.clone().multiply(sw.multiply(qa).invert()); let t = 2 * Math.atan2(r.x * ab.x + r.y * ab.y + r.z * ab.z, r.w); if (t > Math.PI) t -= 2 * Math.PI; if (t < -Math.PI) t += 2 * Math.PI; return Math.abs(t); };
    let raisedIK = null; { const udr = raisedAt.clone().sub(sh).normalize(); let bestC = 1e9; for (let a = -180; a <= 180; a += 15) { const ik = twoBone(sh, raisedAt, reachM, POLE.clone().applyAxisAngle(udr, a * DEG)), E = sh.clone().addScaledVector(ik.u1, LU), clear = Math.min(segD(sh, E, headAt), segD(E, raisedAt, headAt)), q = armPose(ik, DOWN).q, cost = 1.5 * turnBetween(pc.q, q) / Math.PI + 0.25 * Math.abs(a) / 180 + Math.max(0, 7.5 - clear) * 0.8; if (cost < bestC) { bestC = cost; raisedIK = ik; } } }
    const pr = armPose(raisedIK, DOWN);
    if (root.__lapDebug) root.__lapDebug.turn = Math.round(turnBetween(pc.q, pr.q) * 180 / Math.PI);
    g.armR.quaternion.copy(pr.q).slerp(pc.q, tau);
    const birchUraised = impl.birch ? new V3(-ud.x * 0.5, 0, -ud.z * 0.5).addScaledVector(UP, 0.9).normalize() : null;
    g.elbow.rotation.set(lerp(pr.psi, pc.psi, tau), 0, 0); g.wrist.rotation.set(0, lerp(pr.omega, pc.omega, tau), 0);
    paddle.visible = !!impl.paddle && st.armed; birch.visible = !!impl.birch && st.armed;
    if (impl.birch) birchFlex(sw, tau);
    const gwArm = gw;      // (at rest the right arm is aimed over the centre of his lower back; its rest offsets are laid on that)
    applyEdits('gerda', ['armR', 'elbowR', 'wristR'], gwArm);
    if (impl.birch) { g.root.updateMatrixWorld(true); aim(birchTool, birchUraised.clone().lerp(birchU, tau).normalize()); applyEdits('gerda', ['birch'], gwArm); }
    if (impl.paddle) {
      // Roll the blade about its own length so that, at contact, its face lies on the angle of his glutes (the block's back face, tipped between his
      // back and his thighs); raised, it is left as the forearm carries it.
      tool.rotation.set(0, 0, Math.PI / 2); g.root.updateMatrixWorld(true);
      tool.getWorldQuaternion(tmpQ2);
      const lw = new V3(1, 0, 0).applyQuaternion(tmpQ2), zw = new V3(0, 0, 1).applyQuaternion(tmpQ2);
      const nIn = new V3(0, 0, 1).applyQuaternion(glutesTilt.getWorldQuaternion(tmpQ)).addScaledVector(lw, 0);   // into the block, from its back face
      const want = nIn.addScaledVector(lw, -nIn.dot(lw));
      if (want.lengthSq() > 1e-4) { want.normalize(); tool.rotation.set(Math.atan2(zw.clone().cross(want).dot(lw), zw.dot(want)) * tau, 0, Math.PI / 2); }
    }
    if (impl.paddle) applyEdits('gerda', ['paddle'], gwArm);
  };
  const STANDING = { standSeat: 1, standTable: 1 };
  jack.after = function (j) {
    glutesTilt.visible = !STANDING[stanceNow()];      // (the glutes block bridges his back and his thighs once they fold: upright, it would only cut into his legs)
    const sf = 1 - 0.72 * (st.settle || 0);      // (settled: he lies still over her lap, and only the contact itself moves him)
    const k = J.kick * sf, d = clamp(pain.distress(), 0, 1.5) * sf, w = (Math.sin(J.t * 9) * 0.05 * Math.min(1, d) + Math.sin(J.t * 5.3) * 0.03 * Math.min(1, d)) * sf, sz = st.size * jackFull;
    const e = easeIO(clamp(st.blend, 0, 1)), p = mixPose(limbs(st.from, k, d, w, sz), limbs(st.to, k, d, w, sz), e);
    // (Every angle is set afresh: a bone put back from its stored quaternion has its Euler angles worked out again, and a leftover turn about the wrong axis would twist the limb.)
    j.legL.thigh.rotation.set(p.tL, 0, j.legL.sign * p.zL); j.legR.thigh.rotation.set(p.tR, 0, j.legR.sign * -p.zR);
    j.legL.knee.rotation.set(p.kL, 0, 0); j.legR.knee.rotation.set(p.kR, 0, 0);
    j.neck.rotation.set(p.nx, p.ny, 0);
    j.armL.rotation.set(p.aLx, 0, p.aLz); j.armR.rotation.set(p.aRx, 0, p.aRz); if (j.elbowL) { j.elbowL.rotation.set(p.eL, 0, 0); j.elbow.rotation.set(p.eR, 0, 0); }       // (both elbows bend)
    j.torso.rotation.set(p.tx, 0, p.tz);
    applyEdits('jack', ['torso', 'neck', 'glutes', 'thighL', 'thighR', 'kneeL', 'kneeR'], jackWeights());
    // His right arm: reaching back for the knife at his belt (armReach), or held behind him with the hand in the small of his back (armHold). Both are reached by the arm's own joints
    // (the shoulder swings, and the elbow bends one way, as an elbow does), so that the hand stays where it should whatever his body is doing; they blend into one another and out to
    // his ordinary pose as the weights change.
    const ah = clamp(st.armHold || 0, 0, 1), ar = clamp(st.armReach || 0, 0, 1);
    if (ah > 0 || ar > 0) {
      j.root.updateMatrixWorld(true);
      const q0 = j.armR.quaternion.clone(), e0 = j.elbow.rotation.x, out = { q: q0.clone(), e: e0 };
      const solve = (target, poleLocal, w) => { armToSide(j, 'armR', target, new V3(...poleLocal).transformDirection(j.torso.matrixWorld), sz); out.q.slerp(j.armR.quaternion, w); out.e += (j.elbow.rotation.x - out.e) * w; j.armR.quaternion.copy(q0); j.elbow.rotation.set(e0, 0, 0); j.root.updateMatrixWorld(true); };
      if (ar > 0) solve(j.hips.localToWorld(BELT_AT.clone()), [-1, -0.2, -0.3], ar);
      if (ah > 0) solve(j.torso.localToWorld(PIN_AT.clone()), [-0.7, 0.2, -1], ah);
      j.armR.quaternion.copy(out.q); j.elbow.rotation.set(out.e, 0, 0); j.wrist.rotation.set(0, 0, 0);
    }
    applyEdits('jack', ['armL', 'armR', 'elbowL', 'elbowR'], jackWeights());
  };

  // ── Frame loop ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  function repaint() {
    st.expr = exprFor();
    B.paintJackInto(jack.skin, { trousers: st.trousers, drawers: st.drawers, marks: st.marks, expr: st.expr, outfit: st.outfit.jack, hitched: true });
    jack.tex.needsUpdate = true;
    B.paintGlutesInto(glutes.skin, { trousers: st.trousers, drawers: st.drawers, marks: st.marks, outfit: st.outfit.jack }); glutes.tex.needsUpdate = true;
    jack.legL.ring.visible = jack.legR.ring.visible = st.trousers === 'down';
    dirty = false;
  }
  function update(dt) {
    // Moving between places: his stance blends from one to the other.
    if (st.blend < 1) { st.blend = Math.min(1, st.blend + dt / Math.max(0.05, st.blendSecs)); if (st.blend >= 1) st.from = st.to; }
    const sz = st.size * jackFull, fa = stanceFrame(st.from, sz), fb = stanceFrame(st.to, sz), eb = easeIO(clamp(st.blend, 0, 1));
    frameBase.copy(fa.q).slerp(fb.q, eb);
    restoreBones(); st.dt = dt;
    J.t += dt; J.kick *= Math.exp(-dt * 4.5); if (st.holdKick != null) J.kick = st.holdKick;
    if (st.swing) advance(dt);
    { const s0 = pain.sting, a0 = pain.ache; pain.update(dt, !!(st.swing && st.swing.phase === 'contact')); if (st.noRecovery) { pain.sting = Math.max(pain.sting, s0); pain.ache = Math.max(pain.ache, a0); } }   // (with noRecovery his distress never falls)
    if (st.ended && !st.swing && st.runLeft) st.runLeft = 0;
    if (exprFor() !== st.expr) dirty = true;
    // (The colour never fades: it stays until the level resets.)
    repaintAt -= dt; if (dirty && repaintAt <= 0) { repaint(); repaintAt = 0.12; }
    // Jack's size (the premise: he shrinks on arrival): his frame is scaled about his hip joint, which is re-placed for the stance: across her knee his torso's centre is over
    // the centre of her thighs and his belly rests on them (their tops are at y = 8, 8.75 under the skirt; his body is 4 deep); at the table his chest is on its top.
    frame.scale.setScalar(sz);    // (his full size, 100%, is 95% of the model's own scale)
    const hop = (st.to === 'lap' || st.from === 'lap' ? 0.7 : st.to === 'table' ? 0 : 0) * J.kick * sz;
    frame.position.copy(fa.p).lerp(fb.p, eb); frame.position.y += hop;
    applyEdits('jack', ['frame'], jackWeights());
    // The giver's place: seated in the chair (her shins long enough to reach its floor), or standing at the table's side.
    gerda.root.position.copy(GIVER_AT[st.giverStance]); chair.visible = st.giverStance === 'sit' && opts.noChair !== true;
    if (st.shinsSeated !== (st.giverStance === 'sit')) { st.shinsSeated = st.giverStance === 'sit'; setShins(st.shinsSeated); }
    if (table) { table.visible = st.showTable !== false && (st.to === 'table' || st.from === 'table' || st.showTable === true); table.position.x = tableEdgeX(sz); }
    B.step(jack, dt); scene.updateMatrixWorld(true);
    B.step(gerda, dt);
    updateHandles(); if (!ext) { controls.update(); renderer.render(scene, camera); }
  }

  // ── Cameras ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const VIEWS = {
    overview: { pos: [-44, 56, 50], at: [-3, 10, 4] },       // three-quarter, from in front of Gerda's right
    behind: { pos: [-38, 58, 12], at: [-8, 10, 4] },         // down on Jack's rear, from his feet
    shoulder: { pos: [-22, 46, -22], at: [-6, 8, 6] },       // over Gerda's right shoulder: the giver's own view
    face: { pos: [22, 6, 30], at: [6, 5, 3] },               // Jack's face, from the floor side
    tableSide: { pos: [-62, 24, 34], at: [-3, 8, -4] },      // the table scene from Jack's right: him bent over it, her at his side
    tableBehind: { pos: [-52, 26, -22], at: [-6, 6, -3] },    // from behind them both, over her shoulder
    tableAbove: { pos: [-40, 46, 14], at: [-7, 9, -2] },        // from above and behind Jack's feet, a little to his right
    tableFront: { pos: [38, 22, 24], at: [-4, 8, -4] },       // from beyond the table, looking back along him
    seat: { pos: [-26, 20, 50], at: [0, 8, 6] },              // standing before her, seen from the side
  };
  function view_(name) { const v = VIEWS[name]; camera.position.set(...v.pos); controls.target.set(...v.at); }
  if (!ext) view_('overview');
  function resize() { if (ext) return; const w = view.clientWidth || 800, h = view.clientHeight || 600; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  root.addEventListener('resize', resize); resize();

  // ── Public ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // The pose editor's interface (the page builds the controls): preview only, nothing is stored; report() prints the file to paste back.
  const round = v => Math.round(v * 10) / 10;
  // ── Pose handles: click and drag a joint in the view. Dragging a handle turns the bone it belongs to (so the joint at the other end of that bone
  // follows the cursor), twists it, or moves it, by editing the held beat's offsets; the sliders show the same numbers. ──────────────────────────
  const hpt = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const H = (bone, kind, label, tip, axis) => ({ bone, kind, label, tip, axis });
  const BLADE_END = -(HANDLE + BLADE_L);
  const HANDLE_DEFS = {
    gerda: [
      H('neck', 'aim', 'Head', hpt(gerda.neck, 0, 4, 0)),
      H('torso', 'aim', 'Chest (turns and leans the torso)', hpt(gerda.torso, 0, 12, 0)),
      H('torso', 'move', 'Torso (moves it)', hpt(gerda.torso, 0, 2, 0)),
      H('armL', 'aim', 'Left elbow (swings the left upper arm)', gerda.elbowL),
      H('elbowL', 'aim', 'Left hand (bends the left elbow)', hpt(gerda.wristL, 0, -6, 0)),
      H('armR', 'aim', 'Right elbow (swings the right upper arm)', gerda.elbow),
      H('elbowR', 'aim', 'Right hand (bends the elbow)', hpt(gerda.wrist, 0, -6, 0)),
      H('wristR', 'twist', 'Right wrist twist (turns the forearm, hand and paddle about the forearm)', hpt(gerda.wrist, 2.4, -3, 0), new V3(0, 1, 0)),
      H('paddle', 'aim', 'Paddle tip (swings the paddle)', hpt(tool, 0, BLADE_END, 0)),
      H('paddle', 'twist', 'Paddle roll (rolls the blade about its length)', hpt(tool, BLADE_W / 2, -(HANDLE + BLADE_L / 2), 0), new V3(0, 1, 0)),
      H('birch', 'aim', 'Birch tip (swings the birch)', hpt(birchTool, 0, -(BIRCH_HAND + BIRCH_L), 0)),
      H('thighL', 'aim', 'Left knee', hpt(gerda.legL.thigh, 0, -6, 0)), H('kneeL', 'aim', 'Left foot', hpt(gerda.legL.knee, 0, -6, 0)),
      H('thighR', 'aim', 'Right knee', hpt(gerda.legR.thigh, 0, -6, 0)), H('kneeR', 'aim', 'Right foot', hpt(gerda.legR.knee, 0, -6, 0)),
    ],
    jack: [
      H('frame', 'move', 'Jack (moves his whole body on her lap)', hpt(frame, 0, 0, 0)),
      H('torso', 'aim', 'Shoulders (turns his torso)', hpt(jack.torso, 0, 12, 0)),
      H('neck', 'aim', 'Head', hpt(jack.neck, 0, 4, 0)),
      H('armL', 'aim', 'Left elbow (swings the upper arm)', jack.elbowL), H('elbowL', 'aim', 'Left hand (bends the elbow)', hpt(jack.elbowL, 0, -6, 0)),
      H('armR', 'aim', 'Right elbow (swings the upper arm)', jack.elbow), H('elbowR', 'aim', 'Right hand (bends the elbow)', hpt(jack.elbow, 0, -6, 0)),
      H('glutes', 'aim', 'Glutes block (tilts it)', hpt(glutesTilt, 0, -5.2, 2.25)),
      H('thighL', 'aim', 'Left knee', hpt(jack.legL.thigh, 0, -6, 0)), H('kneeL', 'aim', 'Left foot', hpt(jack.legL.knee, 0, -6, 0)),
      H('thighR', 'aim', 'Right knee', hpt(jack.legR.thigh, 0, -6, 0)), H('kneeR', 'aim', 'Right foot', hpt(jack.legR.knee, 0, -6, 0)),
    ],
  };
  // What each bone is, in plain words (shown in the editor).
  const BONE_INFO = {
    torso: 'Torso: turns and leans the whole upper body from the hips (its position moves it).',
    neck: 'Head: tilts and turns the head from the base of the neck.',
    armL: 'Left arm: swings the whole left arm from the shoulder.',
    armR: 'Right shoulder: swings the whole right arm from the shoulder; the forearm follows.',
    elbowL: 'Left elbow: bends the left forearm (and hand) at the elbow.',
    elbowR: 'Right elbow: bends the right forearm (and hand) at the elbow.',
    wristR: 'Right wrist: the forearm turned about its own length (twist), and the forearm, hand and paddle mount moved as a unit (position). It does not bend the elbow.',
    paddle: 'Paddle: swings the paddle at its mount on the forearm, and rolls the blade.',
    birch: 'Birch: swings the bundle at the end of the forearm.',
    thighL: 'Left thigh: swings the left leg from the hip.', thighR: 'Right thigh: swings the right leg from the hip.',
    kneeL: 'Left knee: bends the left lower leg.', kneeR: 'Right knee: bends the right lower leg.',
    glutes: 'Glutes block: tilts the block that bridges his back and thighs.',
    frame: 'Jack: moves and turns his whole body on her lap.',
  };
  const handleMat = (color) => new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 });
  const handleGeo = { aim: new THREE.SphereGeometry(0.85, 14, 10), move: new THREE.BoxGeometry(1.3, 1.3, 1.3), twist: new THREE.OctahedronGeometry(1.0) };
  const HCOL = { aim: 0xffcc33, move: 0x44ddff, twist: 0xff66cc };
  const handleGroup = new THREE.Group(); handleGroup.visible = false; scene.add(handleGroup);
  for (const who in HANDLE_DEFS) for (const h of HANDLE_DEFS[who]) {
    h.who = who; h.mesh = new THREE.Mesh(handleGeo[h.kind], handleMat(HCOL[h.kind])); h.mesh.renderOrder = 999; h.mesh.userData.handle = h; h.mesh.visible = false; handleGroup.add(h.mesh);
  }
  const hs = { on: false, who: 'gerda', bone: null, onPick: null, onChange: null, drag: null };
  function updateHandles() {
    if (!hs.on) return;
    for (const w in HANDLE_DEFS) for (const h of HANDLE_DEFS[w]) {
      const show = w === hs.who; h.mesh.visible = show;
      if (!show) continue;
      h.tip.getWorldPosition(h.mesh.position);
      const sel = h.bone === hs.bone, d = camera.position.distanceTo(h.mesh.position);
      h.mesh.scale.setScalar((sel ? 1.35 : 1) * Math.max(0.5, d / 70)); h.mesh.material.opacity = sel ? 1 : 0.65;
      h.mesh.material.color.setHex(sel ? 0xffffff : HCOL[h.kind]);
    }
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), dragPlane = new THREE.Plane(), hitP = new V3();
  const weightsNow = () => gerdaWeights();
  function pointerRay(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  }
  function applyDrag(drag, target) {
    const h = drag.h, fig = h.who, bone = BONES[fig][h.bone], rt = route(cur.fig, cur.beat, h.bone), set = setAt(cur.fig, rt.imp)[rt.beat], wts = rt.wts || weightsNow(), wb = wts[rt.beat] || 1;
    const entry = set[h.bone] || (set[h.bone] = {}); entry.p = entry.p || [0, 0, 0];
    if (h.kind === 'move') {
      const inv = new THREE.Matrix4().copy(bone.parent ? bone.parent.matrixWorld : new THREE.Matrix4()).invert();
      const a = drag.startWorld.clone().applyMatrix4(inv), b = target.clone().applyMatrix4(inv);
      for (let i = 0; i < 3; i++) entry.p[i] = drag.startP[i] + (b.getComponent(i) - a.getComponent(i)) / wb;
    } else {
      bone.updateWorldMatrix(true, false);
      const pivot = bone.getWorldPosition(new V3()), tip = h.tip.getWorldPosition(new V3());
      const cq = bone.getWorldQuaternion(new THREE.Quaternion()), pq = (bone.parent ? bone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion());
      let qw = new THREE.Quaternion();
      if (h.kind === 'aim') {
        const d0 = tip.clone().sub(pivot), d1 = target.clone().sub(pivot);
        if (d0.length() < 1e-6 || d1.length() < 1e-6) return;
        qw.setFromUnitVectors(d0.normalize(), d1.normalize());
      } else {
        const axis = h.axis.clone().applyQuaternion(cq).normalize();
        const v0 = tip.clone().sub(pivot), v1 = target.clone().sub(pivot);
        v0.addScaledVector(axis, -v0.dot(axis)); v1.addScaledVector(axis, -v1.dot(axis));
        if (v0.length() < 1e-6 || v1.length() < 1e-6) return;
        qw.setFromAxisAngle(axis, Math.atan2(v0.clone().cross(v1).dot(axis), v0.dot(v1)));
      }
      const newLocal = pq.clone().invert().multiply(qw.multiply(cq));
      entry.r = clampRot(h.bone, eulerOf(h.bone, newLocal));                    // (the joint's own angles, from its standing position, within its range)
    }
    if (entry.p.every(v => Math.abs(v) < 0.005)) delete entry.p;
    if (!entry.r && !entry.p) delete set[h.bone];
    if (hs.onChange) hs.onChange(h.bone);
  }
  const hostEl = renderer.domElement.parentElement;
  hostEl.addEventListener('pointerdown', e => {
    if (!hs.on || e.button !== 0) return;
    pointerRay(e);
    const meshes = HANDLE_DEFS[hs.who].map(h => h.mesh), hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) return;
    e.stopPropagation(); e.preventDefault();
    const h = hit.object.userData.handle; hs.bone = h.bone; controls.enabled = false;
    dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new V3()).negate(), hit.point);
    const rt = route(cur.fig, cur.beat, h.bone), set = setAt(cur.fig, rt.imp)[rt.beat], ent = set[h.bone];
    hs.drag = { h, grab: hit.point.clone().sub(h.mesh.position), startWorld: h.tip.getWorldPosition(new V3()), startP: ent && ent.p ? ent.p.slice() : [0, 0, 0] };
    if (hs.onPick) hs.onPick(h.bone, h.label);
    renderer.domElement.setPointerCapture && renderer.domElement.setPointerCapture(e.pointerId);
  }, true);
  hostEl.addEventListener('pointermove', e => {
    if (!hs.drag) return;
    pointerRay(e);
    if (ray.ray.intersectPlane(dragPlane, hitP)) applyDrag(hs.drag, hitP.clone().sub(hs.drag.grab));
  }, true);
  const endDrag = () => { if (hs.drag) { hs.drag = null; controls.enabled = true; } };
  hostEl.addEventListener('pointerup', endDrag, true); hostEl.addEventListener('pointercancel', endDrag, true);

  // The editor holds the scene at a beat (rest, raised, or landed on one cheek) for whichever body is being posed: 'giver' or 'jack'. Both bodies have the same beats, and the
  // position and implement are the scene's own (chosen outside the editor).
  const cur = { fig: 'giver', beat: 'contactL' };
  const bodyOf = fig => fig === 'jack' ? 'jack' : 'gerda';
  const setAt = (fig, imp) => SETS[posKey()][editKey][bodyOf(fig)][imp];
  // Where an edit goes: into the set of the pose in force (normal, reaching or pinned), at the held beat.
  const route = (fig, beat, bone) => ({ imp: editImp(), beat, wts: null });
  const setFor = (fig, beat, bone) => { const r = route(fig, beat, bone); return setAt(fig, r.imp); };
  const editor = {
    beats: GERDA_BEATS,
    bones: fig => Object.keys(BONES[bodyOf(fig)]).filter(n => (n !== 'paddle' || st.implement === 'paddle') && (n !== 'birch' || st.implement === 'birch')),
    // Can the scene be posed as it is? (the knee or the table, once he is there; the birch is for the table)
    editable() { return st.blend >= 1 && (st.to === 'table' || (st.to === 'lap' && st.implement !== 'birch')); },
    // What is locked for a bone at a beat (as loaded), and the sliders' values: the edit relative to it.
    locked(fig, beat, bone) { const r = route(fig, beat, bone); const e = (((LOCK[posKey()][editKey][bodyOf(fig)][r.imp] || {})[r.beat]) || {})[bone]; return e ? JSON.parse(JSON.stringify(e)) : null; },
    // The sliders' values: absolute. The entry's own angles, or (no entry yet) the angles the bone has now from its standing position.
    get(fig, beat, bone) {
      const rt = route(fig, beat, bone), e = setAt(fig, rt.imp)[rt.beat][bone] || {}, b = BONES[bodyOf(fig)][bone];
      return { r: e.r ? clampRot(bone, e.r) : eulerOf(bone, b.userData.proc || b.quaternion), p: e.p ? e.p.slice() : [0, 0, 0], own: !!e.r };
    },
    set(fig, beat, bone, r, p) {                      // r: the joint's angles (degrees, absolute); p: how far it has moved from where it stands
      const rt = route(fig, beat, bone), set = setAt(fig, rt.imp)[rt.beat], P = MOVABLE[bone] ? p.slice() : [0, 0, 0], ent = { r: clampRot(bone, r) };
      if (P.some(v => Math.abs(v) > 0.005)) ent.p = P;
      set[bone] = ent;
    },
    limits: bone => LIMITS[bone] || null,
    resetBone(fig, beat, bone) { const rt = route(fig, beat, bone), set = setAt(fig, rt.imp)[rt.beat], l = editor.locked(fig, beat, bone); if (l) set[bone] = l; else delete set[bone]; },
    resetBeat(fig, beat) { const lk = (((LOCK[posKey()][editKey][bodyOf(fig)][editImp()] || {})[beat]) || {}); setAt(fig, editImp())[beat] = JSON.parse(JSON.stringify(lk)); },    clear() { for (const f of ['giver', 'jack']) for (const b of GERDA_BEATS) editor.resetBeat(f, b); },
    sizeMin: SIZE_MIN, variant, canMove: bone => !!MOVABLE[bone],
    hold(fig, beat) {
      cur.fig = fig; cur.beat = beat; st.runLeft = 0; st.swing = null; st.armed = true; st.holdKick = null;
      if (beat !== 'rest') st.swing = { phase: 'freeze', t: 0, side: beat === 'contactL' ? 'L' : 'R', waited: 0, tau: beat === 'raised' ? 0 : 1 };
    },
    release() { st.swing = null; st.holdKick = null; },
    // Handles in the view: on or off, for the giver's bones or Jack's; which bone is selected; callbacks for a pick and for a change by dragging.
    handles(on, fig) { hs.on = !!on; if (hs.on) st.size = editKey / 100; hs.who = fig === 'jack' ? 'jack' : 'gerda'; handleGroup.visible = hs.on; if (!hs.on) { endDrag(); for (const w in HANDLE_DEFS) for (const h of HANDLE_DEFS[w]) h.mesh.visible = false; } },
    select(bone) { hs.bone = bone; },
    onPick(f) { hs.onPick = f; }, onChange(f) { hs.onChange = f; },
    info: (fig, bone) => BONE_INFO[bone] || '',
    handlePoints: fig => { const r = renderer.domElement.getBoundingClientRect(); return HANDLE_DEFS[bodyOf(fig)].map(h => { const q = h.mesh.position.clone().project(camera); return { bone: h.bone, kind: h.kind, x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height }; }); },      // (screen places of the handles, for tests)
    handleLabels: fig => HANDLE_DEFS[bodyOf(fig)].map(h => ({ bone: h.bone, kind: h.kind, label: h.label })),
    // Which of the two sets is being edited (100 or 50); Jack is held at that size while the editor is open.
    sizeKey(k) { if (k === undefined) return editKey; editKey = k === 50 ? 50 : 100; if (hs.on) st.size = editKey / 100; return editKey; },
    report() {
      const dump = (set, beats, pad) => beats.map(b => {
        const bones = Object.keys(set[b]).map(n => { const e = set[b][n], parts = [];
          if (e.r) parts.push(`r: [${e.r.map(round).join(', ')}]`);
          if (e.p && e.p.some(v => v)) parts.push(`p: [${e.p.map(round).join(', ')}]`);
          return `${n}: { ${parts.join(', ')} }`; });
        return `${pad}${b}: {${bones.length ? '\n' + pad + '  ' + bones.join(',\n' + pad + '  ') + ',\n' + pad : ''}}`;
      }).join(',\n');
      const body = (set, ind) => WIELD.map(w => `${ind}    ${/^\w+$/.test(w) ? w : "'" + w + "'"}: {\n${dump(set[w], GERDA_BEATS, ind + '      ')},\n${ind}    }`).join(',\n');
      const one = (pos, k, ind) => { const e = SETS[pos][k]; return `${ind}${k}: {\n${ind}  gerda: {\n${body(e.gerda, ind)},\n${ind}  },\n${ind}  jack: {\n${body(e.jack, ind)},\n${ind}  },\n${ind}},`; };
      return `root.LapPoses = {\n${one('lap', 100, '  ')}\n${one('lap', 50, '  ')}\n  table: {\n${one('table', 100, '    ')}\n${one('table', 50, '    ')}\n  },\n};`;
    },
  };
  // Move the scene to a place ('seat', 'lap', 'table', 'after'), taking `secs` for him to get there (0: at once).
  function place(name, secs) {
    const pl = PLACES[name]; if (!pl) return; secs = secs || 0; st.place = name;
    if (st.giverStance !== pl.giver) { st.giverStance = pl.giver; B.setPose(gerda, pl.giver === 'sit' ? 'sit' : 'stand'); if (!secs) Object.assign(gerda.state, B.POSES[pl.giver === 'sit' ? 'sit' : 'stand']); }
    if (!secs) { st.from = st.to = pl.jack; st.blend = 1; } else { st.from = stanceNow(); st.to = pl.jack; st.blend = 0; st.blendSecs = secs; }
    st.swing = null; st.runLeft = 0; dirty = true;
  }
  const api = {
    editor, stage, place, PLACES, BONES,
    armReach(v) { st.armReach = v; },
    armHold(v) { st.armHold = v; }, settle(v) { st.settle = v; },
    scene, floor, camera, controls, renderer, gerda, jack, pain, st, IMPL, BANDS, J,
    on: f => events.push(f),
    update, view: view_, views: VIEWS, smack,
    // A run: the first smack lifts from rest, each next one comes straight up from contact to raised, and the last one returns to rest.
    run(n) { if (!canStrike()) return; n = Math.max(1, n | 0); if (st.swing) st.runLeft = n; else if (smack()) st.runLeft = n - 1; },
    stop() { st.runLeft = 0; },
    end() { if (st.ended) return; st.ended = true; st.runLeft = 0; say('end', { red: false, hits: st.hits, peak: st.peak }); },
    red() { if (st.ended) return; st.ended = true; st.red = true; st.runLeft = 0; st.swing = null; say('end', { red: true, hits: st.hits, peak: st.peak }); },
    reset() { pain.reset(); Object.assign(st, { hits: 0, ended: false, red: false, peak: 0, swing: null, runLeft: 0, marks: { L: 0, R: 0 }, last: null }); J.kick = 0; dirty = true; say('reset', {}); },
    size(v) { if (!hs.on) st.size = clamp(v, SIZE_MIN, 1); },
    jackFull(v) { jackFull = v; },
    armed(v) { st.armed = !!v; },
    cover(v) { st.cover = v; }, fumble(v) { st.fumble = v; },
    // Wardrobe: Jack has 'Outdoor'; Gerda 'Work' or 'Fine'.
    // Who gives: Gerda, or Jack's mother (js/cast.js), on the same rig. expr 1 is her disapproving face.
    giver(name, expr) {
      st.giver = name === 'mother' && root.Cast ? 'mother' : 'gerda';
      if (st.giver === 'mother') { root.Cast.paintMotherInto(gerda.skin, { expr: expr || 0 }); gerda.paintBun(root.Cast.MOTHER_BUN); }
      else { B.paintGerdaInto(gerda.skin, st.outfit.gerda); gerda.paintBun(['#4b3022', '#67432f', '#33201a', '#4b3022', '#b9b0a6']); }
      gerda.tex.needsUpdate = true;
    },
    outfit(who, name) {
      if (who === 'gerda' && B.OUTFITS.gerda.indexOf(name) >= 0) { st.outfit.gerda = name; if (st.giver !== 'mother') { B.paintGerdaInto(gerda.skin, name); gerda.tex.needsUpdate = true; } }
      if (who === 'jack' && B.OUTFITS.jack.indexOf(name) >= 0) { st.outfit.jack = name; dirty = true; }
    },
    outfits: B.OUTFITS,
    clearMarks() { st.marks = { L: 0, R: 0 }; dirty = true; },
    implement(name) { if (!IMPL[name] || (st.swing && st.swing.phase !== 'freeze')) return; st.implement = name; },
    layers(o) { Object.assign(st, o); dirty = true; },
    canStrike, bandIndex, bandName: () => BANDS[bandIndex()],
    info: () => ({ distress: pain.distress(), band: BANDS[bandIndex()], hits: st.hits, peak: st.peak, ended: st.ended, red: st.red, tooHarsh: pain.tooHarsh, busy: !!st.swing, running: st.runLeft > 0, marks: st.marks, receptivity: pain.receptivity() }),
    repaintNow: () => { repaint(); },
  };
  repaint();
  return api;
}

root.Lap = { create, IMPL, BANDS };
})(typeof window !== 'undefined' ? window : globalThis);
