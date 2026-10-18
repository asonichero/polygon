// Polygon — the sandbox stage: a plain floor with a few things to jump on, a chair, Gerda standing by it, and Jack to walk about as. There is no level here, only what shows the engine
// working: the third-person controller (WASD relative to the camera, Jack turning into the way he goes rather than strafing; Shift runs, C creeps, Space jumps; drag, wheel or V for
// the camera; [ and ] shrink and grow Jack, with the camera and his pace following his size), sitting in the chair, a walk cycle on the jointed rig, and a short cutscene built
// with the toolkit in js/game.js.
//   const world = Stage.build(G);  G.setScene(world);  Stage.title(G, world);   // the slow turntable behind the title screen
//   Stage.play(G, world, hud);                                                      // the sandbox itself; Stage.stop(G, world) leaves it
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly, A = root.GameAudio, V3 = THREE.Vector3;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const turn = (from, to, t) => { const d = ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return from + d * t; };

const FULL = 0.95, SIZE_MIN = 0.5;                                  // Jack's full size is 95% of the model's own scale, as in the correction scene
const WALK = 26, CREEP = 7.5, RUN = 50, GRAV = 420, JUMP_V = 112, STEP = 3;     // units per second (times his scale); a jump rises about 15 units
const ZOOMS = [{ name: 'Close', d: 44 }, { name: 'Medium', d: 78 }, { name: 'Far', d: 130 }];
const BOUNDS = { x0: -250, x1: 250, z0: -250, z1: 250 }, INF = 1e9;
const START = new V3(0, 0, 70), GERDA_AT = new V3(-34, 0, 18), CHAIR_AT = new V3(66, 0, 8);

// ── Textures: small, hard-edged, painted here ──
function tex(draw, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); draw(x);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; if (repeat) t.repeat.set(repeat, repeat); return t;
}
const rnd = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const speckle = (x, seed, tones, n) => { const r = rnd(seed); for (let i = 0; i < n; i++) { x.fillStyle = tones[Math.floor(r() * tones.length)]; x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1 + Math.floor(r() * 2), 1); } };
const floorTex = repeat => tex(x => {                                // flagstones, four to a tile, with mortar and wear
  x.fillStyle = '#7a7f86'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#70757c'; x.fillRect(0, 0, 16, 16); x.fillRect(16, 16, 16, 16);
  x.fillStyle = '#585c64'; x.fillRect(0, 15, 32, 1); x.fillRect(15, 0, 1, 32); x.fillRect(0, 31, 32, 1); x.fillRect(31, 0, 1, 32); speckle(x, 5, ['#8a8f96', '#63676f', '#6a6f76'], 60);
}, repeat);
const crateTex = () => tex(x => {
  x.fillStyle = '#8a6a44'; x.fillRect(0, 0, 32, 32); for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#7c5e3a' : '#94744c'; x.fillRect(0, i * 8, 32, 7); x.fillStyle = '#4e3a24'; x.fillRect(0, i * 8 + 7, 32, 1); }
  x.fillStyle = '#5a4128'; x.fillRect(0, 0, 3, 32); x.fillRect(29, 0, 3, 32); x.fillRect(0, 0, 32, 3); x.fillRect(0, 29, 32, 3); speckle(x, 9, ['#a58358', '#6a4e30'], 40);
});
const stoneTex = () => tex(x => {
  x.fillStyle = '#8b8d86'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#6e7068'; x.fillRect(0, 10, 32, 1); x.fillRect(0, 21, 32, 1); x.fillRect(8, 0, 1, 10); x.fillRect(22, 11, 1, 10); x.fillRect(12, 22, 1, 10);
  speckle(x, 21, ['#9a9c94', '#7a7c74', '#6e7a5a'], 70);
});
const lam = map => new THREE.MeshLambertMaterial({ map });

// A box whose texture repeats once every 16 units, whatever its size.
function boxMesh(w, h, d, mat) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / 16, uv.getY(i) * dims[f][1] / 16); }
  return new THREE.Mesh(g, mat);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The world
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function build(G) {
  const scene = new THREE.Scene(), sky = 0x8fa6c4;
  scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(sky, 200, 640);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x4a4036, 0.72));
  const sun = new THREE.DirectionalLight(0xfff0d8, 0.7); sun.position.set(60, 120, 80); scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), lam(floorTex(1000 / 32))); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const crate = lam(crateTex()), stone = lam(stoneTex()), solids = [];
  const addBox = (x, z, w, d, h, mat, top, y0) => { y0 = y0 || 0; const m = boxMesh(w, h, d, mat); m.position.set(x, y0 + h / 2, z); scene.add(m); solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, top: top === undefined ? y0 + h : top }); return m; };
  // things to jump on: low crates, a stack, a run of steps (each a jump higher), a wall, a pillar that cannot be climbed
  addBox(-60, -40, 16, 16, 8, crate); addBox(-36, -62, 20, 20, 14, crate); addBox(-36, -62, 10, 10, 8, crate, undefined, 14);
  for (let i = 0; i < 4; i++) addBox(40 + i * 11, -86, 11, 28, 5 * (i + 1), stone);
  addBox(0, -150, 120, 8, 12, stone); addBox(120, -40, 10, 10, 60, stone, INF);
  const chair = P.makeChair(); chair.position.set(CHAIR_AT.x, P.CHAIR.legH, CHAIR_AT.z); chair.rotation.y = -Math.PI / 2; scene.add(chair);
  const jack = P.makeJack(), gerda = P.makeGerda('Work');
  jack.root.scale.setScalar(FULL); scene.add(jack.root); scene.add(gerda.root);
  gerda.root.position.copy(GERDA_AT); gerda.root.rotation.y = Math.PI / 2;
  const world = { scene, jack, gerda, chair, solids, t: 0, player: null, mode: 'title', update: null };
  // idle life for Gerda (she watches Jack; gestures when she speaks)
  const ga = world.ga = { t: 0, look: 0, talk: 0 };
  gerda.after = r => {
    const t = ga.t; r.armL.rotation.x = 0.04 * Math.sin(t * 1.1); r.armR.rotation.x = -0.1 * ga.talk * (0.6 + 0.4 * Math.sin(t * 5)) + 0.04 * Math.sin(t * 1.1 + 1);
    r.armR.rotation.z = -0.1 * ga.talk; if (r.elbow) r.elbow.rotation.x = -0.9 * ga.talk * (0.6 + 0.4 * Math.sin(t * 5));
    r.neck.rotation.y = ga.look; r.torso.rotation.z = 0.01 * Math.sin(t * 0.8);
  };
  walker(jack);
  P.setPose(jack, 'stand'); P.setPose(gerda, 'stand'); for (let i = 0; i < 30; i++) { P.step(jack, 0.1); P.step(gerda, 0.1); }
  world.update = dt => {
    world.t += dt; ga.t += dt; P.step(jack, dt); P.step(gerda, dt);
    if (world.player) world.player.tick(dt);
    // Gerda turns her head toward Jack when he is near
    const dx = jack.root.position.x - gerda.root.position.x, dz = jack.root.position.z - gerda.root.position.z, near = Math.hypot(dx, dz) < 90;
    const want = near ? clamp(turn(gerda.root.rotation.y, Math.atan2(dx, dz), 1), -0.9, 0.9) : 0;
    ga.look = lerp(ga.look, want, Math.min(1, dt * 4));
  };
  return world;
}

// The walk: legs and arms swing from jack.walk = { phase, speed, air, sneak, sit, kick, t, look }, as the rig's own `after` hook.
function walker(rig) {
  const w = rig.walk = { phase: 0, speed: 0, air: false, sneak: false, sit: false, kick: 0, t: 0, look: 0 };
  rig.after = r => {
    const sp = clamp(w.speed / 24, 0, 1.4), ph = w.phase, sw = Math.sin(ph) * 0.8 * Math.min(1, sp);
    if (w.sit) {                                                    // seated: legs hang from the seat, a restless Jack swings his shins
      r.legL.knee.rotation.x = r.state.shinX + w.kick * 0.7 * Math.sin(w.t * 7); r.legR.knee.rotation.x = r.state.shinX + w.kick * 0.7 * Math.sin(w.t * 7 + Math.PI);
      r.neck.rotation.y = w.look; return;
    }
    if (w.air) {                                                    // in the air: arms up, one knee tucked
      r.armL.rotation.x = r.armR.rotation.x = -2.3; r.armL.rotation.z = -0.25; r.armR.rotation.z = 0.25; r.legL.thigh.rotation.x = -0.7; r.legL.knee.rotation.x = 0.9; r.legR.thigh.rotation.x = 0.35; r.legR.knee.rotation.x = 0.4; r.torso.rotation.x = 0.05; return;
    }
    if (w.sneak) { r.hips.position.y = 10.4; r.torso.rotation.x = 0.28; r.neck.rotation.x = -0.2 + r.state.headX; }
    const bend = w.sneak ? 0.5 : 0;
    r.legL.thigh.rotation.x = sw - bend * 0.6; r.legR.thigh.rotation.x = -sw - bend * 0.6;
    r.legL.knee.rotation.x = bend + (sp > 0.05 ? 0.12 + Math.max(0, -Math.cos(ph)) * 0.95 * Math.min(1, sp) * (Math.sin(ph) < 0 ? 1 : 0.8) : 0); r.legR.knee.rotation.x = bend + (sp > 0.05 ? 0.12 + Math.max(0, Math.cos(ph)) * 0.95 * Math.min(1, sp) * (Math.sin(ph) > 0 ? 1 : 0.8) : 0);
    r.armL.rotation.x = -sw * 0.9; r.armR.rotation.x = sw * 0.9; if (r.elbowL) { r.elbowL.rotation.x = -0.2 - 0.5 * Math.max(0, -Math.sin(ph)) * sp; r.elbow.rotation.x = -0.2 - 0.5 * Math.max(0, Math.sin(ph)) * sp; }
    if (!w.sneak) { r.hips.position.y = r.state.hipY + Math.abs(Math.sin(ph)) * 0.6 * Math.min(1, sp); r.torso.rotation.x = 0.1 * clamp((w.speed - 30) / 30, 0, 1); }
    r.torso.rotation.y = -sw * 0.18; r.neck.rotation.y = w.look - r.torso.rotation.y;
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The title: Jack and Gerda side by side, the camera drifting slowly round them
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function title(G, world) {
  const { jack, gerda } = world;
  world.player = null; world.mode = 'title'; world.chair.visible = true;
  jack.root.visible = true; jack.root.scale.setScalar(FULL); jack.root.position.set(-13, 0, 0); jack.root.rotation.y = 0.35; gerda.root.position.set(14, 0, 0); gerda.root.rotation.y = -0.35;
  P.setPose(jack, 'stand'); P.setPose(gerda, 'stand'); jack.walk.sit = false; jack.walk.speed = 0; jack.walk.air = false; jack.walk.sneak = false; world.ga.talk = 0;
  const c = new V3(0, 17, 0);
  G.drone = t => { const a = 0.55 + t * 0.07, sx = Math.cos(a) * -22, sz = Math.sin(a) * 22; return { pos: new V3(Math.sin(a) * 78 + sx, 24 + Math.sin(t * 0.13) * 3, Math.cos(a) * 78 + sz), look: new V3(c.x + sx, c.y, c.z + sz), fov: 40 }; };   // (the pair sit right of centre, clear of the menu)
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The sandbox
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function play(G, world, hud) {
  stop(G, world);
  const { jack, gerda, chair, solids } = world, w = jack.walk;
  const S = { pos: START.clone(), y: 0, vy: 0, grounded: true, heading: Math.PI, speed: 0, sneak: false, size: 1, sit: false, yaw: 0, pitch: 0.42, zoom: 1, jumpReq: false, toastAt: 0, talking: false };
  const keys = {}, ui = root.TouchUI.create({ keys, run: true, sneak: true, jump: true, act: true, drop: false, cam: true });
  const sc = () => S.size * FULL;
  jack.root.visible = true; jack.root.scale.setScalar(sc()); P.setPose(jack, 'stand'); w.sit = false;
  gerda.root.position.copy(GERDA_AT); gerda.root.rotation.y = Math.PI / 2;
  world.mode = 'play'; G.mode = 'play'; document.body.classList.add('playing');
  const camPos = new V3(), look = new V3(), spec = { pos: camPos, look, fov: 48 };
  const camGoal = () => { const d = ZOOMS[S.zoom].d * S.size, p = S.pitch, at = look.set(S.pos.x, S.y + 16 * sc() / FULL * 0.95, S.pos.z); return new V3(at.x + Math.sin(S.yaw) * Math.cos(p) * d, Math.max(3, at.y + Math.sin(p) * d), at.z + Math.cos(S.yaw) * Math.cos(p) * d); };
  camPos.copy(camGoal()); G.drone = () => spec; G.cut(spec); G.drone = () => spec;

  // ── Input ──
  const KM = { w: 'up', W: 'up', ArrowUp: 'up', s: 'down', S: 'down', ArrowDown: 'down', a: 'left', A: 'left', ArrowLeft: 'left', d: 'right', D: 'right', ArrowRight: 'right', Shift: 'run' };
  const typing = e => e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  const kd = e => {
    if (G.mode !== 'play' || typing(e)) return; const k = KM[e.key]; if (k) { keys[k] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); }
    if (e.key === ' ') e.preventDefault(); if (e.repeat) return;
    if (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X') setSneak(!S.sneak);
    if (e.key === 'e' || e.key === 'E') interact(); if (e.key === ' ') S.jumpReq = true; if (e.key === 'v' || e.key === 'V') cycleZoom(1);
    if (e.key === '[') resize(-0.05); if (e.key === ']') resize(0.05);
  };
  const ku = e => { const k = KM[e.key]; if (k) keys[k] = false; };
  root.addEventListener('keydown', kd); root.addEventListener('keyup', ku);
  const drags = new Map(), el = G.renderer.domElement;
  const pd = e => drags.set(e.pointerId, { x: e.clientX, y: e.clientY }), pu = e => drags.delete(e.pointerId);
  const pm = e => { const d = drags.get(e.pointerId); if (!d || G.mode !== 'play') return; S.yaw -= (e.clientX - d.x) * 0.006; S.pitch = clamp(S.pitch + (e.clientY - d.y) * 0.005, 0.08, 1.35); d.x = e.clientX; d.y = e.clientY; };
  const wheel = e => { if (G.mode !== 'play') return; e.preventDefault(); cycleZoom(e.deltaY > 0 ? 1 : -1); };
  el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu); el.addEventListener('wheel', wheel, { passive: false });
  const camIcon = () => ui.set('cam', { icon: 'camera', title: 'Camera: ' + ZOOMS[S.zoom].name });
  function cycleZoom(dir) { S.zoom = (S.zoom + (dir || 1) + ZOOMS.length) % ZOOMS.length; camIcon(); toast('Camera: ' + ZOOMS[S.zoom].name); }
  function setSneak(on) { S.sneak = on; ui.setSneak(on); if (on && ui.run) ui.setRun(false); toast(on ? 'Creeping.' : 'Walking.'); }
  function resize(d) { S.size = clamp(Math.round((S.size + d) * 100) / 100, SIZE_MIN, 1); toast("Jack's size: " + Math.round(S.size * 100) + '%'); }
  ui.on.cam = () => cycleZoom(1); ui.on.jump = () => { S.jumpReq = true; }; ui.on.act = () => interact(); ui.on.sneak = on => { S.sneak = on; toast(on ? 'Creeping.' : 'Walking.'); };
  camIcon();
  const toast = t => { if (!hud) return; hud.toast.textContent = root.Tips.clean(t); hud.toast.style.opacity = 1; S.toastAt = performance.now() + 2200; };

  // ── The world, as boxes: standing height and walls ──
  const groundY = (x, z, pad) => { let h = 0; for (const o of solids) if (x > o.x0 - pad && x < o.x1 + pad && z > o.z0 - pad && z < o.z1 + pad && o.top > h) h = o.top; return h; };
  const near = (p, r) => Math.hypot(S.pos.x - p.x, S.pos.z - p.z) < r;
  const seatPos = () => { const th = chair.rotation.y, s = sc(), lx = 0, lz = -1.2 * s; return new V3(chair.position.x + Math.sin(th) * lz + Math.cos(th) * lx, chair.position.y + P.CHAIR.seatTop - 4 * s, chair.position.z + Math.cos(th) * lz - Math.sin(th) * lx); };

  // ── Acting: sit and stand, talk to Gerda ──
  let busy = false;
  async function interact() {
    if (busy || G.mode !== 'play') return;
    if (S.sit) { standUp(); return; }
    if (near(GERDA_AT, 30)) { busy = true; await talk(G, world, S, ui, hud); busy = false; return; }
    if (near(new V3(chair.position.x, 0, chair.position.z), 22)) { sitDown(); return; }
    toast('Nothing to do here.');
  }
  function sitDown() { S.sit = true; w.sit = true; P.setPose(jack, 'sit'); S.heading = chair.rotation.y; S.speed = 0; }
  function standUp() { S.sit = false; w.sit = false; P.setPose(jack, 'stand'); const th = chair.rotation.y; S.pos.set(chair.position.x + Math.sin(th) * (P.CHAIR.front + 8 * sc()), 0, chair.position.z + Math.cos(th) * (P.CHAIR.front + 8 * sc())); S.y = 0; S.vy = 0; S.grounded = true; }

  const tick = dt => {
    if (G.mode !== 'play') return;
    const s = sc(); jack.root.scale.setScalar(lerp(jack.root.scale.x, s, Math.min(1, dt * 6)));
    if (S.sit) {
      const sp = seatPos(); jack.root.position.copy(sp); jack.root.rotation.y = chair.rotation.y; w.t += dt; w.kick = 0.5 * (1 - (S.size - SIZE_MIN) / 0.5) + 0.3; w.speed = 0; w.look = 0; S.pos.set(sp.x, 0, sp.z); S.y = sp.y;
    } else {
      const f = new V3(-Math.sin(S.yaw), 0, -Math.cos(S.yaw)), r = new V3(Math.cos(S.yaw), 0, -Math.sin(S.yaw));
      const dir = new V3().addScaledVector(f, (keys.up ? 1 : 0) - (keys.down ? 1 : 0)).addScaledVector(r, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
      if (Math.hypot(ui.stick.x, ui.stick.y) > 0.2) dir.addScaledVector(f, -ui.stick.y).addScaledVector(r, ui.stick.x);
      const vel = new V3();
      if (dir.lengthSq() > 0 && !S.talking) {
        dir.normalize(); const want = Math.atan2(dir.x, dir.z); S.heading = turn(S.heading, want, Math.min(1, dt * 9));
        const off = Math.abs(turn(S.heading, want, 1) - S.heading), ease = clamp(1 - off / Math.PI * 0.8, 0.2, 1), base = keys.run ? RUN : S.sneak ? CREEP : WALK;
        vel.set(Math.sin(S.heading), 0, Math.cos(S.heading)).multiplyScalar(base * s * ease);
      }
      const r_ = 3.4 * s, stepMax = STEP * s / FULL * 0.95 + 0.01;
      // horizontal moves, each axis on its own, stopped by anything too tall to step onto
      for (const ax of ['x', 'z']) {
        if (!vel[ax]) continue; const nx = S.pos.x + (ax === 'x' ? vel.x * dt : 0), nz = S.pos.z + (ax === 'z' ? vel.z * dt : 0);
        if (nx < BOUNDS.x0 || nx > BOUNDS.x1 || nz < BOUNDS.z0 || nz > BOUNDS.z1) continue;
        if (groundY(nx, nz, r_) - S.y > stepMax) continue;
        if (Math.hypot(nx - GERDA_AT.x, nz - GERDA_AT.z) < 8 + r_ && Math.hypot(S.pos.x - GERDA_AT.x, S.pos.z - GERDA_AT.z) >= 8 + r_) continue;       // (Gerda is solid)
        if (ax === 'x') S.pos.x = nx; else S.pos.z = nz;
      }
      S.speed = vel.length();
      // jump and fall
      if (S.jumpReq) { S.jumpReq = false; if (S.grounded && !S.talking) { S.vy = JUMP_V * Math.sqrt(S.size * FULL / FULL); S.grounded = false; A && A.blip && A.blip(); } }
      const g = groundY(S.pos.x, S.pos.z, 0.55 * r_);
      if (S.grounded && S.y > g + 0.05) S.grounded = false;                         // (walked off an edge)
      if (!S.grounded) { S.vy -= GRAV * dt; S.y += S.vy * dt; if (S.y <= g && S.vy <= 0) { S.y = g; S.vy = 0; S.grounded = true; } }
      else S.y = lerp(S.y, g, Math.min(1, dt * 30));                                   // (stepping up or down onto what is under him)
      jack.root.position.set(S.pos.x, S.y, S.pos.z); jack.root.rotation.y = S.heading;
      w.air = !S.grounded; w.sneak = S.sneak; w.speed = S.speed / Math.max(0.3, s / FULL); w.phase += dt * (S.speed > 0.5 ? 3.2 + S.speed / (s * 9) : 0); w.t += dt;
      const dxg = GERDA_AT.x - S.pos.x, dzg = GERDA_AT.z - S.pos.z; w.look = lerp(w.look, Math.hypot(dxg, dzg) < 60 ? clamp(turn(S.heading, Math.atan2(dxg, dzg), 1), -0.8, 0.8) : 0, Math.min(1, dt * 5));
    }
    // the camera, kept at a distance in Jack's own sizes
    const goal = camGoal(); camPos.lerp(goal, Math.min(1, dt * 14));
    // the prompt
    if (hud) {
      let hint = ''; if (!busy) { if (S.sit) hint = 'Stand up (E)'; else if (near(GERDA_AT, 30)) hint = 'Talk to Gerda (E)'; else if (near(new V3(chair.position.x, 0, chair.position.z), 22)) hint = 'Sit in the chair (E)'; }
      hud.hint.textContent = root.Tips.clean(hint); hud.hint.style.display = hint ? 'block' : 'none';
      hud.size.textContent = 'Jack ' + Math.round(S.size * 100) + '%';
      if (S.toastAt && performance.now() > S.toastAt) { hud.toast.style.opacity = 0; S.toastAt = 0; }
    }
  };
  world.player = { tick, S };
  world.cleanup = () => { root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); el.removeEventListener('wheel', wheel); ui.destroy(); if (hud) { hud.hint.style.display = 'none'; hud.toast.style.opacity = 0; } document.body.classList.remove('playing'); };
  root.Tips.once('stage', () => toast('WASD to move, Shift runs, C creeps, Space jumps. [ and ] change Jack’s size. E to sit or talk.'));
  return world.player;
}
function stop(G, world) { if (world.cleanup) { world.cleanup(); world.cleanup = null; } world.player = null; }

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// A short cutscene, written with the toolkit: camera shots, typed lines with a babbling voice, and a choice.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function talk(G, world, S, ui, hud) {
  const { jack, gerda } = world, ga = world.ga; S.talking = true; ui.show(false);
  if (hud) { hud.hint.style.display = 'none'; hud.toast.style.opacity = 0; }
  const mine = G.mode, drone = G.drone; G.drone = null; G.mode = 'cutscene'; document.body.classList.add('cutscene'); G.skipping = false;
  const at = (o, y) => new V3(o.x, y, o.z), j = jack.root.position, g = gerda.root.position;
  const mid = new V3((j.x + g.x) / 2, 17, (j.z + g.z) / 2), perp = new V3(g.z - j.z, 0, j.x - g.x).normalize();
  G.cut({ pos: mid.clone().addScaledVector(perp, 56).setY(24), look: mid.clone(), fov: 40 });
  const face = Math.atan2(g.x - j.x, g.z - j.z); S.heading = face; jack.root.rotation.y = face; gerda.root.rotation.y = face + Math.PI;
  ga.talk = 1;
  await G.say('gerda', 'This is the stage. A floor, a few boxes to jump on, a chair. Nothing else, on purpose.');
  await G.shot({ pos: g.clone().add(new V3(Math.sin(face + 2.4) * 30, 23, Math.cos(face + 2.4) * 30)), look: at(g, 22), fov: 36 }, 1.6);
  await G.say('gerda', 'The engine is what is left: a camera, a voice, a walk, and two people made of about a thousand triangles each.');
  await G.shot({ pos: j.clone().add(new V3(Math.sin(face - 2.4) * 28, 22, Math.cos(face - 2.4) * 28)), look: at(j, 20), fov: 36 }, 1.6);
  ga.talk = 0;
  const pick = await G.choose('jack', ['Can I be smaller?', 'Is that all?']);
  ga.talk = 1;
  if (pick === 0) await G.say('gerda', 'Press [ and ] and see. Everything follows your size: how fast you walk, how high you jump, how far the camera stands.');
  else await G.say('gerda', 'It is plenty. The correction scene is its own page, and it is the part that took the time.');
  await G.say('jack', 'Then I will go and jump on something.');
  ga.talk = 0; await G.fade(true, 0.5); G.skipping = false; G.hideLine();
  document.body.classList.remove('cutscene'); G.mode = mine; G.drone = drone; S.talking = false; ui.show(true);
  await G.fade(false, 0.5);
}

root.Stage = { build, title, play, stop, talk, FULL, SIZE_MIN, ZOOMS };
})(typeof window !== 'undefined' ? window : globalThis);
