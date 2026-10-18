// Climbing Toward Consequence — Chapter One, "Market Day" (its first part): the first playable sequence, a tutorial in animal care.
//   1. A short dialogue beat outside the cottage: Mother in the doorway, Jack facing her; she sends him to market with the cow, doubts him, and goes back inside.
//   2. Play: fetch the cow's lead from the cowshed, then win Milky-White round enough to put it on her. She starts out trusting Jack 90%, but quick movement near her frightens her
//      exactly as it did the hen in the test level (she backs away and her trust drops), and she will not take the lead until her trust is back to 100%. Sneak (C) and wait.
//   3. A short closing scene (he talks to her, the player presses Continue) and a fade to black.
// Camera: always centred on Jack, starting a little above him; V (or the zoom button, or the wheel) cycles three zoom levels; dragging turns the angle. Movement is WASD relative to the
// camera, Jack turning (not strafing) to go where it points.
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky, C = root.Cast, A = root.GameAudio, V3 = THREE.Vector3;
const v = (x, y, z) => new V3(x, y, z), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const turn = (from, to, t) => { const d = ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return from + d * t; };
const SC = 0.95, WALK = 26, CREEP = 7.5, RUN = 50, ALARM = 13, CALM = 9.5;               // the same pace rules as the hen in the test level
const ZOOMS = [{ name: 'Close', d: 52 }, { name: 'Medium', d: 92 }, { name: 'Far', d: 150 }];
const BOUNDS = { x0: -198, x1: 198, z0: -104, z1: 116 }, COWB = { x0: 162, x1: 202, z0: -6, z1: 104 };
const INF = 1e9, GRAV = 420, JUMP_V = 112;                                                      // a jump rises about 15 units: enough to land on the feed or the trough, not on the barrel
// Everything solid in the yard, as boxes (top = how tall; INF can never be stepped onto). Only the barrel can be climbed (Space beside it); the rest of what is low enough can be jumped onto.
const OBJECTS = [
  { x0: -70, x1: 70, z0: -80, z1: 20, top: INF, kind: 'cottage' }, { x0: 86, x1: 158, z0: -62, z1: -56, top: INF, kind: 'shed' }, { x0: 86, x1: 91, z0: -62, z1: -12, top: INF, kind: 'shed' }, { x0: 153, x1: 158, z0: -62, z1: -12, top: INF, kind: 'shed' },
  { x0: -66, x1: -54, z0: 24, z1: 36, top: 18, kind: 'barrel', climb: true }, { x0: 108, x1: 128, z0: -30.5, z1: -25.5, top: 8.5, kind: 'trough' }, { x0: 129, x1: 151, z0: -57, z1: -45, top: 8, kind: 'feed' },
  { x0: 47.5, x1: 56.5, z0: 21.5, z1: 30.5, top: 9, kind: 'block' }, { x0: -153, x1: -147, z0: 17, z1: 23, top: INF, kind: 'scarecrow' }, { x0: -99, x1: -93, z0: -73, z1: -67, top: INF, kind: 'tree' },
];
const surfaceAt = (x, z) => { let top = 0, kind = null; for (const o of OBJECTS) if (o.top < INF && x > o.x0 - 3 && x < o.x1 + 3 && z > o.z0 - 3 && z < o.z1 + 3 && o.top > top) { top = o.top; kind = o.kind; } return { top, kind }; };
const DOOR = v(34, 0, 22), LEADSPOT = v(122, 0, -52);

// The cow is a solid thing: a box about her body and head (in her own frame), which Jack cannot walk through and she cannot walk into him.
const COWBOX = { hw: 9, z0: -17, z1: 26 };
function cowGap(px, pz, cow) {                                                                                  // distance from a point to the edge of her body box (so her head and tail count, not just her middle)
  const f = v(Math.sin(cow.heading), 0, Math.cos(cow.heading)), r = v(Math.cos(cow.heading), 0, -Math.sin(cow.heading)), dx = px - cow.pos.x, dz = pz - cow.pos.z;
  const lx = dx * r.x + dz * r.z, lz = dx * f.x + dz * f.z, cz = (COWBOX.z0 + COWBOX.z1) / 2, hl = (COWBOX.z1 - COWBOX.z0) / 2;
  return Math.hypot(Math.max(0, Math.abs(lx) - COWBOX.hw), Math.max(0, Math.abs(lz - cz) - hl));
}
function cowHit(px, pz, cow, rad) {
  const f = v(Math.sin(cow.heading), 0, Math.cos(cow.heading)), r = v(Math.cos(cow.heading), 0, -Math.sin(cow.heading)), dx = px - cow.pos.x, dz = pz - cow.pos.z;
  const lx = dx * r.x + dz * r.z, lz = dx * f.x + dz * f.z, cz = (COWBOX.z0 + COWBOX.z1) / 2, hl = (COWBOX.z1 - COWBOX.z0) / 2, ox = COWBOX.hw + rad - Math.abs(lx), oz = hl + rad - Math.abs(lz - cz);
  if (ox <= 0 || oz <= 0) return null;
  if (ox < oz) { const k = Math.sign(lx || 1) * ox; return { x: px + r.x * k, z: pz + r.z * k }; }
  const k = Math.sign(lz - cz || 1) * oz; return { x: px + f.x * k, z: pz + f.z * k };
}

function build(G, W) {
  const ext = W.ext, scene = ext.scene;
  const jack = B.makeJack(), mother = C.makeMother();
  const paintJack = e => { B.paintJackInto(jack.skin, { outfit: 'Outdoor', expr: e, trousers: 'up', drawers: 'up' }); jack.tex.needsUpdate = true; };
  jack.root.scale.setScalar(SC); scene.add(jack.root); scene.add(mother.root); mother.root.scale.setScalar(0.95);
  const ja = { t: 0, phase: 0, speed: 0, lead: false, look: 0, shrug: 0, air: false }, ma = { t: 0, phase: 0, speed: 0, wag: 0, gesture: 0, chin: 0, tilt: 0, arms: 0 };
  jack.after = r => {
    const s = Math.sin(ja.phase) * clamp(ja.speed / 20, 0, 1) * 0.7, idle = 0.015 * Math.sin(ja.t * 1.1);
    r.legL.thigh.rotation.x = s; r.legR.thigh.rotation.x = -s; r.armL.rotation.x = -s * 0.8 + idle; r.armR.rotation.x = ja.lead ? -0.55 - s * 0.2 : s * 0.8 - idle;
    if (ja.air) { r.armL.rotation.x = r.armR.rotation.x = -2.5; r.legL.thigh.rotation.x = -0.5; r.legR.thigh.rotation.x = 0.25; r.legR.knee.rotation.x = 0.5; } else { r.legR.knee.rotation.x = 0; }
    r.neck.rotation.y = ja.look; r.torso.rotation.z = 0.01 * Math.sin(ja.t * 0.9); r.hips.position.y = 12 + Math.abs(Math.sin(ja.phase)) * 0.5 * clamp(ja.speed / 20, 0, 1);
  };
  mother.after = r => {
    const s = Math.sin(ma.phase) * clamp(ma.speed / 12, 0, 1) * 0.6, t = ma.t;
    r.legL.thigh.rotation.x = s; r.legR.thigh.rotation.x = -s;
    r.armL.rotation.x = -0.5 * ma.arms; r.armL.rotation.z = -0.1 * ma.arms;                                                       // a hand held at the apron
    r.armR.rotation.x = -0.5 - 0.5 * ma.gesture + ma.wag * 0.14 * Math.sin(t * 8); r.armR.rotation.z = 0.15 + 0.1 * ma.gesture; if (r.elbow) r.elbow.rotation.x = -0.3 - 0.9 * ma.gesture;
    r.neck.rotation.y = ma.chin * 0.65; r.neck.rotation.x = ma.chin * -0.1 + 0.04 * Math.sin(t * 0.7); r.neck.rotation.z = ma.tilt * 0.12;
  };
  G.updaters.push(dt => { ja.t += dt; ma.t += dt; B.step(jack, dt); B.step(mother, dt); });
  B.setPose(jack, 'stand'); B.setPose(mother, 'stand'); for (let i = 0; i < 30; i++) { B.step(jack, 0.1); B.step(mother, 0.1); }
  // The lead on its hook in the cowshed: a coil of rope and a leather headstall. In Jack's hand it hangs from the right hand.
  const rope = C.col('#b89a5a'), leather = C.col('#5a3a22'), brass = C.col('#d9b24a');
  const makeLead = () => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(5.4 - i * 0.5, 1.1, 5.4 - i * 0.5), rope); b.position.y = -i * 1.2; b.rotation.y = i * 0.5; g.add(b); }
    const h = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 2.4), leather); h.position.set(0, -6.4, 0); g.add(h); const ring = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), brass); ring.position.set(0, 2, 0); g.add(ring); return g; };
  const hook = new THREE.Group(); hook.position.set(LEADSPOT.x, 26, LEADSPOT.z - 4); scene.add(hook);
  const peg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 6), C.col('#3a2a1a')); peg.position.set(0, 2, 2); hook.add(peg); const hanging = makeLead(); hanging.position.set(0, -2, 4); hook.add(hanging);
  const held = makeLead(); held.position.set(0, -11, 1.4); held.scale.setScalar(0.8); held.visible = false; jack.armR.add(held);
  const dropped = makeLead(); dropped.rotation.x = Math.PI / 2; dropped.visible = false; scene.add(dropped);                     // the lead, when he drops it
  const cord = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1), rope); cord.visible = false; scene.add(cord);         // the rope from his hand to her halter, once it is on
  const halter = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.4, 11), leather); halter.position.set(0, -1.5, 5); halter.visible = false; ext.cow.userData.head.add(halter);
  jack.root.visible = false; mother.root.visible = false;                                   // (only on stage once the chapter begins)
  return { ext, jack, mother, ja, ma, paintJack, hanging, held, cord, halter, hook, dropped };
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function run(G, W, M) {
  const { ext, jack, mother, ja, ma, paintJack, hanging, held, cord, halter } = M, cowM = ext.cow, A_ = A;
  const scene = ext.scene;
  G.mode = 'cutscene'; document.body.classList.add('cutscene');
  // The door stands open, and Mother in it; Jack faces her in the pale morning light.
  G.setScene(ext); G.drone = null; ext.doorLeaf.rotation.y = -1.9;
  mother.root.position.set(DOOR.x + 2, 0, DOOR.z); mother.root.rotation.y = 0; mother.root.visible = true; mother.setExpr(1); ma.arms = 1; ma.gesture = 0; ma.wag = 0; ma.chin = 0; ma.speed = 0;
  jack.root.visible = true; jack.root.position.set(DOOR.x, 0, DOOR.z + 32); jack.root.rotation.y = Math.PI; paintJack(4); ja.lead = false; ja.speed = 0; ja.look = 0; hanging.visible = true; held.visible = false;
  A_ && A_.ambience({ wind: 0.4, birds: 0.7, fire: 0 }); A_ && A_.duckMusic(0.6, 2);
  const shots = {
    side: { pos: v(112, 24, 40), look: v(34, 20, 36), fov: 42 }, motherFace: { pos: v(54, 23, 62), look: v(35, 23, 22), fov: 32 }, jackFace: { pos: v(70, 34, 30), look: v(34, 22, 56), fov: 52 },
    wide: { pos: v(78, 34, 80), look: v(36, 17, 36), fov: 50 },
  };
  G.cut(shots.wide); await G.fade(false, 1.6); await G.wait(1.0);
  // The dialogue is shot as plain cuts between fixed angles, with no camera movement: Mother's face, Jack's face, the two of them.
  ma.gesture = 1; ma.wag = 1; G.cut(shots.motherFace);
  await G.say('mother', 'Take her to market. Trade her for coin. Not for stories. Not for tricks. Do you understand me, Jack?');
  ma.wag = 0; G.cut(shots.jackFace);
  await G.say('jack', 'Course I do.');
  G.cut(shots.motherFace); ma.gesture = 0.3;
  await G.say('mother', 'Last time you said that, we ate root soup for a fortnight because you came back with a broken compass and a smile.');
  paintJack(5); G.cut(shots.jackFace);
  await G.say('jack', 'It was a magic compass. Just needed the right sort of stars.');
  G.cut(shots.motherFace); ma.gesture = 1; ma.wag = 1;
  await G.say('mother', 'No more magic. No more foolishness. This is the last thing we have. If you waste it\u2014');
  ma.wag = 0; paintJack(0); G.cut(shots.jackFace);
  await G.say('jack', 'I won\u2019t, I swear it.');
  G.cut(shots.side); ma.gesture = 0; ma.tilt = 1;
  await G.say('mother', 'Hmm...');
  G.cut(shots.motherFace); ma.chin = 0; ma.tilt = 0; await G.wait(0.5);              // (she looks at him as she says it)
  await G.say('mother', 'Be back before dusk. And mind your manners.');
  // She turns into the doorway and goes in, the door closing behind her.
  G.cut(shots.side); ma.chin = 0; await G.wait(0.4);
  for (let i = 0; i < 10; i++) { mother.root.rotation.y = lerp(0, Math.PI, (i + 1) / 10); await G.wait(0.04); }
  ma.speed = 12;
  for (let i = 0; i < 26; i++) { mother.root.position.z -= 0.55; ma.phase += 0.7; await G.wait(0.05); } ma.speed = 0; mother.root.visible = false;
  for (let i = 0; i < 16; i++) { ext.doorLeaf.rotation.y = lerp(-1.9, 0, (i + 1) / 16); await G.wait(0.04); }
  A_ && A_.thwack(0.3, true, 0.5);
  paintJack(0); mother.root.position.set(DOOR.x + 2, 0, DOOR.z);

  // ── The play. ──
  G.skipping = false; G.hideLine();
  const result = await playLoop(G, W, M);
  // ── The closing scene. ──
  await closing(G, W, M);
  return result;
}

function playLoop(G, W, M) {
  const { ext, jack, ja, hanging, held, cord, halter, dropped } = M, cowM = ext.cow, ui = hud(), scene = ext.scene;
  return new Promise(resolve => {
    const keys = {}, prints = [], tu = root.TouchUI.create({ keys, run: true, sneak: true, jump: true, act: true, drop: true, cam: true }), st = { y: 0, vy: 0, grounded: true, wet: 0, stride: 0, foot: 1, boost: 0, climb: null, jumpReq: false, leadDropped: false, pos: v(DOOR.x, 0, DOOR.z + 30), heading: Math.PI, speedN: 0, sneak: false, yaw: -Math.PI / 2, pitch: 0.5, zoom: 1, hasLead: false, stick: tu.stick, hint: '', toastAt: 0, startled: 0, shownTip: false, attached: false };
    const cow = { pos: v(186, 0, 24), target: v(186, 0, 24), mode: 'graze', timer: 2, trust: 90, cool: 0, heading: -2.2, t: 0, flee: 0 };
    jack.root.position.copy(st.pos); st.heading = Math.PI;
    const camPos = new V3(), look = new V3(), spec = { pos: camPos, look, fov: 48 };
    const camGoal = dt0 => { const sc = SC, d = ZOOMS[st.zoom].d * sc / SC, p = st.pitch, at = look.set(st.pos.x, st.y + 15 * sc, st.pos.z); return new V3(at.x + Math.sin(st.yaw) * Math.cos(p) * d, Math.max(3, at.y + Math.sin(p) * d), at.z + Math.cos(st.yaw) * Math.cos(p) * d); };
    camPos.copy(camGoal()); G.cut(spec);
    // Input.
    const KM = { w: 'up', W: 'up', ArrowUp: 'up', s: 'down', S: 'down', ArrowDown: 'down', a: 'left', A: 'left', ArrowLeft: 'left', d: 'right', D: 'right', ArrowRight: 'right', Shift: 'run' };
    const kd = e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = KM[e.key]; if (k) { keys[k] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); }
      if (e.key === ' ') e.preventDefault(); if (e.repeat) return; if (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X') toggleSneak(); if (e.key === 'e' || e.key === 'E') interact(); if (e.key === 'q' || e.key === 'Q') take(); if (e.key === ' ') st.jumpReq = true; if (e.key === 'v' || e.key === 'V') cycleZoom(); };
    const ku = e => { const k = KM[e.key]; if (k) keys[k] = false; };
    root.addEventListener('keydown', kd); root.addEventListener('keyup', ku);
    const drags = new Map(), el = G.renderer.domElement;
    const pd = e => drags.set(e.pointerId, { x: e.clientX, y: e.clientY }), pm = e => { const d = drags.get(e.pointerId); if (!d) return; st.yaw -= (e.clientX - d.x) * 0.006; st.pitch = clamp(st.pitch + (e.clientY - d.y) * 0.005, 0.08, 1.35); d.x = e.clientX; d.y = e.clientY; }, pu = e => drags.delete(e.pointerId);
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
    const wheel = e => { e.preventDefault(); cycleZoom(e.deltaY > 0 ? 1 : -1); }; el.addEventListener('wheel', wheel, { passive: false });
    const camIcon = () => tu.set('cam', { icon: 'camera', title: 'Camera: ' + ZOOMS[st.zoom].name });
    function cycleZoom(dir) { st.zoom = (st.zoom + (dir || 1) + ZOOMS.length) % ZOOMS.length; camIcon(); }
    function setSneak(on) { st.sneak = on; tu.setSneak(on); if (on && tu.run) tu.setRun(false); toast(on ? 'Sneaking: slow and quiet.' : 'Walking.'); }              // (the C key and the on-screen Sneak button share this)
    function toggleSneak() { setSneak(!st.sneak); }
    ui.tu = tu; camIcon();
    tu.on.cam = () => cycleZoom(); tu.on.jump = () => { st.jumpReq = true; }; tu.on.act = () => interact(); tu.on.drop = () => take(); tu.on.sneak = on => { st.sneak = on; toast(on ? 'Sneaking: slow and quiet.' : 'Walking.'); };
    const findBar = () => OBJECTS.find(o => o.climb && st.y < o.top - 1 && inBox(o, st.pos.x, st.pos.z, 9) && Math.cos(st.heading) * ((o.z0 + o.z1) / 2 - st.pos.z) + Math.sin(st.heading) * ((o.x0 + o.x1) / 2 - st.pos.x) > 0);   // (the barrel Jack is beside and facing)
    const toast = (t, ms = 3200) => { ui.toast.textContent = root.Tips.clean(t); ui.toast.style.opacity = 1; st.toastAt = performance.now() + ms; };
    const near = (p, r) => Math.hypot(st.pos.x - p.x, st.pos.z - p.z) < r;

    function take() {                                                                                   // Q: take the lead (off its hook, or from where it was dropped), or put it down
      if (st.attached) return; if (st.hasLead) { drop(); return; }
      if (!st.hasLead && hanging.visible && near(LEADSPOT, 20)) { st.hasLead = true; ja.lead = true; held.visible = true; hanging.visible = false; toast('You take the lead off its hook.'); return; }
      if (!st.hasLead && st.leadDropped && Math.hypot(st.pos.x - dropped.position.x, st.pos.z - dropped.position.z) < 18) { st.hasLead = true; st.leadDropped = false; ja.lead = true; held.visible = true; dropped.visible = false; toast('You pick the lead up.'); return; }
      toast('Nothing to take here.');
    }
    function interact() {                                                                                // E: the action: put the lead on her
      if (st.attached) return;
      const d = cowGap(st.pos.x, st.pos.z, cow);
      if (st.hasLead && d < 16) {
        if (cow.trust >= 99.5 && cow.mode !== 'flee') attach();
        else { toast(cow.mode === 'flee' ? 'She is too startled. Keep your distance and let her settle.' : 'She tosses her head. She is not ready yet: stay close, stay slow, and wait.'); A && A.moo(0.4, 0.7); }
      } else if (!st.hasLead && !st.leadDropped) toast('Nothing to take here.');
    }
    function drop() {                                                                                  // Q: put down what he carries, where he stands (back on the hook if he is beside it)
      if (!st.hasLead || st.attached) return; st.hasLead = false; ja.lead = false; held.visible = false;
      if (near(LEADSPOT, 24) && st.y < 16) { hanging.visible = true; toast('You hang the lead back on its hook.'); }
      else { dropped.visible = true; dropped.position.set(st.pos.x + Math.sin(st.heading) * 8, st.y + 1.6, st.pos.z + Math.cos(st.heading) * 8); dropped.rotation.y = st.heading; st.leadDropped = true; toast('You drop the lead.'); }
    }
    function attach() {
      st.attached = true; held.visible = false; halter.visible = true; cord.visible = true; ja.lead = true; A && A.moo(0.5, 0.9);
      cow.mode = 'calm'; ui.show(false); cleanup();
      resolve({ startles: st.startled, trust: cow.trust });
    }
    function cleanup() { tu.destroy(); ui.tu = null; root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); el.removeEventListener('wheel', wheel); G.updaters = G.updaters.filter(u => u !== tick); for (const p of prints) scene.remove(p.m); prints.length = 0; M.state = { pos: st.pos.clone(), heading: st.heading, cow }; }

    const scold = () => { const lines = ['Where do you think you’re going, Jack? You can’t go to market without Milky-White.', 'Idiot. Mother said to take the cow. Go and get the cow.', 'Not without the cow, Jack. Think!']; const t = lines[st.scolds++ % lines.length]; toast('Jack: “' + t + '”', 4200); A && A.speak('jack', t, 3, {}); st.scoldAt = performance.now() + 7000; };
    const inBox = (o, x, z, m) => x > o.x0 - m && x < o.x1 + m && z > o.z0 - m && z < o.z1 + m;
    function blocked(x, z, y) { if (x < BOUNDS.x0 || x > BOUNDS.x1 || z < BOUNDS.z0 || z > BOUNDS.z1) return true; for (const o of OBJECTS) if (inBox(o, x, z, 5) && (o.top >= INF || y < o.top - 2)) return true; return false; }

    const tick = dt => {
      // Jack: WASD relative to the camera; he turns into the direction and walks along his heading.
      const f = new V3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw)), r = new V3(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
      const dir = new V3().addScaledVector(f, (keys.up ? 1 : 0) - (keys.down ? 1 : 0)).addScaledVector(r, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
      if (Math.hypot(st.stick.x, st.stick.y) > 0.2) dir.addScaledVector(f, -st.stick.y).addScaledVector(r, st.stick.x);
      let vel = new V3(); if (st.climb) dir.set(0, 0, 0);
      if (dir.lengthSq() > 0) {
        dir.normalize(); const want = Math.atan2(dir.x, dir.z); st.heading = turn(st.heading, want, Math.min(1, dt * 9));
        const off = Math.abs(turn(st.heading, want, 1) - st.heading), ease = clamp(1 - off / Math.PI * 0.8, 0.2, 1), sp = keys.run ? RUN : st.sneak ? CREEP : WALK;
        vel.set(Math.sin(st.heading), 0, Math.cos(st.heading)).multiplyScalar(sp * SC * ease);
      }
      // Jump (Space), or, beside the barrel, climb it: a jump rises about 15 units, so the feed and the trough can be landed on, but only the barrel (18) needs a climb.
      st.boost = Math.max(0, st.boost - dt);
      if (st.jumpReq) {
        st.jumpReq = false;
        if (st.grounded && !st.climb) {
          const bar = findBar();
          if (bar) st.climb = { t: 0, dur: 0.6, from: v(st.pos.x, st.y, st.pos.z), to: v(clamp(st.pos.x, bar.x0 + 4, bar.x1 - 4), bar.top, clamp(st.pos.z, bar.z0 + 4, bar.z1 - 4)) };
          else { st.vy = JUMP_V; st.grounded = false; st.boost = 0.5; }
        }
      }
      if (st.climb) {
        const c = st.climb; c.t += dt; const k = clamp(c.t / c.dur, 0, 1); st.pos.x = lerp(c.from.x, c.to.x, k); st.pos.z = lerp(c.from.z, c.to.z, k);
        st.y = lerp(c.from.y, c.to.y, k) + Math.sin(k * Math.PI) * 5; if (k >= 1) { st.climb = null; st.y = c.to.y; st.vy = 0; st.grounded = true; }
      } else {
        const nx = st.pos.x + vel.x * dt, nz = st.pos.z + vel.z * dt; if (!blocked(nx, st.pos.z, st.y)) st.pos.x = nx; if (!blocked(st.pos.x, nz, st.y)) st.pos.z = nz;
        st.vy -= GRAV * dt; st.y += st.vy * dt; const gnd = surfaceAt(st.pos.x, st.pos.z);
        if (st.y <= gnd.top) { st.y = gnd.top; st.vy = 0; st.grounded = true; st.on = gnd.kind; } else { st.grounded = false; st.on = null; }
        for (const o of OBJECTS) if (inBox(o, st.pos.x, st.pos.z, 5) && (o.top >= INF || st.y < o.top - 2)) {            // (pushed out of anything he is inside)
          const cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2, ox = (o.x1 - o.x0) / 2 + 5 - Math.abs(st.pos.x - cx), oz = (o.z1 - o.z0) / 2 + 5 - Math.abs(st.pos.z - cz);
          if (ox < oz) st.pos.x += Math.sign(st.pos.x - cx || 1) * ox; else st.pos.z += Math.sign(st.pos.z - cz || 1) * oz;
        }
      }
      ja.air = !st.grounded || !!st.climb;
      if (st.y < 24) { const push = cowHit(st.pos.x, st.pos.z, cow, 5); if (push && !blocked(push.x, push.z, st.y)) { st.pos.x = push.x; st.pos.z = push.z; } }                           // (Jack cannot walk through her)
      // Feet wet from the trough or the feed: wet prints behind him for a short while.
      if (st.grounded && (st.on === 'trough' || st.on === 'feed')) { if (st.wet <= 0) toast(st.on === 'trough' ? 'Splosh. Your feet are soaked.' : 'Your boots are sodden with feed.', 2600); st.wet = 7; }
      else st.wet = Math.max(0, st.wet - dt);
      if (st.wet > 0 && st.grounded && st.speedN > 1) {
        st.stride += vel.length() * dt; if (st.stride > 4.6 * SC) {
          st.stride = 0; st.foot = -st.foot; const g = new THREE.Group(), mt = new THREE.MeshBasicMaterial({ color: 0x2a1c10, transparent: true, opacity: 0.8 }); const a = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 4.4), mt), b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.2), mt); b.position.z = 2.6; g.add(a, b);
          const sd = v(Math.cos(st.heading), 0, -Math.sin(st.heading)).multiplyScalar(1.7 * st.foot); g.position.set(st.pos.x + sd.x, st.y + 0.18, st.pos.z + sd.z); g.rotation.y = st.heading; scene.add(g); prints.push({ m: g, mt, age: 0 });
          if (prints.length > 40) scene.remove(prints.shift().m);
        }
      }
      for (let k = prints.length - 1; k >= 0; k--) { const pr = prints[k]; pr.age += dt; pr.mt.opacity = 0.8 * clamp(1 - (pr.age - 4) / 8, 0, 1); if (pr.age > 12) { scene.remove(pr.m); prints.splice(k, 1); } }                           // (Jack cannot walk through her)
      if (st.pos.z > 98 && Math.abs(st.pos.x) < 34 && performance.now() > st.scoldAt) scold();                                          // heading for the gate without the cow: he talks himself out of it
      st.speedN = vel.length() / SC; ja.speed = st.speedN * 0.8; ja.phase += dt * st.speedN * 0.42;
      jack.root.position.set(st.pos.x, st.y, st.pos.z); jack.root.rotation.y = turn(jack.root.rotation.y, st.heading, Math.min(1, dt * 12));
      // Milky-White: grazes about her yard; frightened by quick movement near her (as the hen was), calmed by slow, close company.
      cow.t += dt; cow.cool -= dt; const d = Math.hypot(st.pos.x - cow.pos.x, st.pos.z - cow.pos.z), before = cow.pos.clone(), gap = cowGap(st.pos.x, st.pos.z, cow);
      if (cow.mode !== 'calm') {
        if (d < 44 && (st.speedN > ALARM || st.boost > 0) && cow.mode !== 'flee' && cow.cool <= 0) {
          cow.mode = 'flee'; cow.flee = 2.6; cow.cool = 1.4; cow.trust = Math.max(0, cow.trust - 14); st.startled++; A && A.moo(0.55, 0.8);
          const away = cow.pos.clone().sub(st.pos); away.y = 0; if (away.lengthSq() < 0.01) away.set(1, 0, 0); away.normalize(); cow.target = cow.pos.clone().addScaledVector(away, 40);
          cow.target.x = clamp(cow.target.x, COWB.x0, COWB.x1); cow.target.z = clamp(cow.target.z, COWB.z0, COWB.z1);
          if (!st.shownTip) { st.shownTip = true; toast('You startled her. Quick movement frightens animals: sneak (C) when you are near her, and give her time.', 6000); }
        }
        if (gap < 18 && st.speedN < CALM && cow.mode !== 'flee') cow.trust = Math.min(100, cow.trust + (st.speedN < 1 ? 7 : 4) * dt);
        if (cow.mode === 'flee') { cow.flee -= dt; const dd = cow.target.distanceTo(cow.pos); if (cow.flee <= 0 || dd < 1) { cow.mode = 'graze'; cow.timer = 2; cow.target = cow.pos.clone(); } else cow.pos.addScaledVector(cow.target.clone().sub(cow.pos).normalize(), Math.min(dd, 22 * dt)); }
        else { cow.timer -= dt; const dd = cow.target.distanceTo(cow.pos); if (dd > 1) cow.pos.addScaledVector(cow.target.clone().sub(cow.pos).normalize(), Math.min(dd, 5 * dt));
          if (cow.timer <= 0) { cow.timer = 3 + Math.random() * 4; cow.target = v(lerp(COWB.x0 + 6, COWB.x1 - 6, Math.random()), 0, lerp(COWB.z0 + 6, COWB.z1 - 6, Math.random())); } }
      }
      cow.pos.x = clamp(cow.pos.x, COWB.x0, COWB.x1); cow.pos.z = clamp(cow.pos.z, COWB.z0, COWB.z1);
      if (cowHit(st.pos.x, st.pos.z, cow, 5)) cow.pos.copy(before);                                                                                                  // (nor she through him)
      const mv = cow.pos.clone().sub(before); if (mv.lengthSq() > 1e-6) cow.heading = turn(cow.heading, Math.atan2(mv.x, mv.z), Math.min(1, dt * 4)); else if (d < 60) cow.heading = turn(cow.heading, Math.atan2(st.pos.x - cow.pos.x, st.pos.z - cow.pos.z), Math.min(1, dt * 1.2));
      cowM.position.set(cow.pos.x, 0, cow.pos.z); cowM.rotation.y = cow.heading; cowM.userData.headBase = cow.mode === 'flee' ? -0.25 : cow.mode === 'graze' && mv.lengthSq() < 1e-6 && d > 30 ? 0.55 : 0.1;
      if (cord.visible) { /* (only after the lead is on) */ }
      // The camera: always centred on Jack.
      const goal = camGoal(); camPos.lerp(goal, Math.min(1, dt * 8)); look.set(st.pos.x, st.y + 15 * SC, st.pos.z); G.cut(spec);
      // HUD.
      const near_ = d < 90 || st.hasLead, pace = st.speedN < 0.5 ? 'Still' : st.speedN > ALARM + 14 ? 'Running' : st.sneak ? 'Sneaking' : 'Walking';
      ui.obj.textContent = root.Tips.clean(!st.hasLead ? 'Fetch the cow’s lead from the cowshed.' : cow.trust >= 99.5 ? 'Put the lead on Milky-White (E).' : 'Win Milky-White’s trust, gently: sneak (C) up and wait beside her.');
      ui.trustWrap.style.display = near_ ? 'block' : 'none'; ui.trustBar.style.width = cow.trust + '%'; ui.trustVal.textContent = Math.round(cow.trust) + '%'; ui.trustBar.classList.toggle('full', cow.trust >= 99.5);
      ui.pace.textContent = pace + (st.speedN > ALARM && d < 44 && cow.mode !== 'calm' ? ' — too fast near her!' : ''); ui.pace.classList.toggle('warn', st.speedN > ALARM && d < 44);
      const h = !st.hasLead && (hanging.visible && near(LEADSPOT, 20) || st.leadDropped && Math.hypot(st.pos.x - dropped.position.x, st.pos.z - dropped.position.z) < 18) ? 'Q: take the lead' : st.hasLead && gap < 16 ? (cow.trust >= 99.5 ? 'E: put the lead on her' : 'She is still jumpy. Stay slow, stay close.') : '';
      const h2 = h || (st.hasLead && !st.attached ? (near(LEADSPOT, 24) && st.y < 16 ? 'Q: hang the lead back up' : 'Q: drop the lead') : '');
      ui.hint.textContent = h2; ui.hint.style.display = h2 ? 'block' : 'none';
      if (st.toastAt && performance.now() > st.toastAt) { ui.toast.style.opacity = 0; st.toastAt = 0; }
      // The touch buttons say what a tap will do now, and grey out when it would do nothing (the same conditions as the keys above).
      { const bar = !st.climb && st.grounded && findBar(), ground = st.grounded && !st.climb && !st.attached;
        tu.set('jump', bar ? { label: 'Climb', icon: 'climb', enabled: ground } : { label: 'Jump', icon: 'jump', enabled: ground });
        const lead = !st.hasLead && hanging.visible && near(LEADSPOT, 20), dropd = !st.hasLead && st.leadDropped && Math.hypot(st.pos.x - dropped.position.x, st.pos.z - dropped.position.z) < 18;
        tu.set('act', !st.attached && st.hasLead && gap < 16 ? { label: 'Use', enabled: true } : { label: 'Do', enabled: false });
        tu.set('drop', { label: st.hasLead ? (near(LEADSPOT, 24) && st.y < 16 ? 'Hang up' : 'Put down') : 'Take', enabled: !st.attached && (st.hasLead || lead || dropd) }); }
    };
    st.scolds = 0; st.scoldAt = 0;
    M.play = { st, cow, interact, toggleSneak, cycleZoom, drop };                                                                       // (for the tests)
    G.updaters.push(tick); ui.show(true); G.mode = 'play'; document.body.classList.remove('cutscene');
  });
}

async function closing(G, W, M) {
  const { ext, jack, ja, cord, halter } = M, cowM = ext.cow, cow = M.state.cow, st = M.state;
  G.mode = 'cutscene'; document.body.classList.add('cutscene'); G.hideLine();
  // The rope between his hand and her halter, kept up to date as they stand there.
  const hand = new V3(), neck = new V3(), tmp = new V3();
  const cordUpdate = () => { jack.root.updateMatrixWorld(true); cowM.updateMatrixWorld(true); jack.armR.localToWorld(hand.set(0, -11, 1)); cowM.userData.head.localToWorld(neck.set(0, -1.5, 5)); tmp.copy(neck).sub(hand); const len = tmp.length() || 1; cord.position.copy(hand).add(neck).multiplyScalar(0.5); cord.scale.set(1, 1, len); cord.lookAt(neck); };
  G.updaters.push(cordUpdate);
  // Jack turns to her; the camera finds the two of them from the side.
  const mid = new V3((st.pos.x + cow.pos.x) / 2, 0, (st.pos.z + cow.pos.z) / 2), toCow = Math.atan2(cow.pos.x - st.pos.x, cow.pos.z - st.pos.z); jack.root.rotation.y = toCow; ja.speed = 0; ja.lead = true;
  const side = new V3(Math.cos(toCow), 0, -Math.sin(toCow)), c1 = mid.clone().addScaledVector(side, 62), c2 = mid.clone().addScaledVector(side, -62), open_ = v(60, 0, 60);
  const pos = (c1.distanceTo(open_) < c2.distanceTo(open_) ? c1 : c2).add(v(0, 24, 0));      // from whichever side opens onto the yard, not through the fence
  await G.shot({ pos, look: mid.clone().add(v(0, 15, 0)), fov: 40 }, 2.4, 'inOut');
  ja.look = 0; await G.wait(0.4); A && A.moo(0.45, 0.9); cowM.userData.headBase = 0.0;
  await G.say('jack', 'Come on, girl, we’ve got a long walk ahead.', { gate: 'Continue' });
  A && A.stopMusic(2.2); await G.fade(true, 1.8); A && A.ambience({ wind: 0, birds: 0, fire: 0 });
  G.updaters = G.updaters.filter(u => u !== cordUpdate); await G.wait(0.8);
  G.mode = 'end'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine();
}

// ── The HUD (built once): objective, hint, toast, cow trust, pace, (the touch controls are TouchUI's, set up by each scene). ──
let HUD = null;
function hud() {
  if (HUD) return HUD;
  const mk = (tag, id, cls, parent) => { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; (parent || document.body).appendChild(e); return e; };
  const root_ = mk('div', 'mHud', 'mhud'); root_.style.display = 'none';
  const obj = mk('div', 'mObj', 'mobj', root_), pace = mk('div', 'mPace', 'mpace', root_), trustWrap = mk('div', 'mTrust', 'mtrust', root_);
  trustWrap.innerHTML = '<div class="mtl">Milky-White trusts you <b id="mTrustVal">90%</b></div><div class="mtb"><i id="mTrustBar"></i></div>';
  const hint = mk('div', 'mHint', 'mhint', root_), toast = mk('div', 'mToast', 'mtoast', root_);
  HUD = { root: root_, obj, pace, trustWrap, trustBar: document.getElementById('mTrustBar'), trustVal: document.getElementById('mTrustVal'), hint, toast, tu: null,
    show(on) { root_.style.display = on ? 'block' : 'none'; document.body.classList.toggle('playing', on); if (HUD.tu) HUD.tu.show(on); } };   // (the touch controls, TouchUI's, are shown and hidden with the HUD)
  return HUD;
}

root.Market = { build, run, ZOOMS, hud, cowHit, cowGap, COWBOX, SC, WALK, CREEP, RUN, ALARM, CALM, GRAV, JUMP_V };
})(typeof window !== 'undefined' ? window : globalThis);
