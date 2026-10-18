// Climbing Toward Consequence — Chapter Two, "The Climb", its opening: the waking cutscene, the beanstalk, and the dress-and-knife stretch.
//   Jack lies on his pallet bed in his drawers and a white nightshirt, under a blanket, facing the wall. The fire is banked low and it is still dark. He rolls onto his back as he wakes and wonders
//   that it is still night though he does not feel tired; he throws off the blanket, sits up (and is reminded of last night's ache), rises, walks to the window, gasps, and runs for the door and out.
//   Cut to outside, on the door as he comes out and turns, agog, to the beans he planted; the camera lifts to show a gigantic beanstalk growing from the 3 x 3 patch. His mother will eat her words
//   when she sees it, he says, but perhaps something of more value lies at the top: he will climb it, and be back before she wakes. He goes back in.
// A beat is one camera angle (see G.cut in game.js); everyone is put where they stand as it begins.
// Exposes Chapter3.run(G, W) (W is Night.build's world) and Chapter3.buildStalk(scene).
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky, F = root.Farm, A = root.GameAudio, V3 = THREE.Vector3;
const v = (x, y, z) => new V3(x, y, z), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const ease = x => x * x * (3 - 2 * x);
const turn = (from, to, t) => { const d = ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return from + d * t; };
const SC = 0.95, PLOT = F.PLOT;
const basis = (x, y, z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
const Q_SIDE = basis(v(0, 1, 0), v(-1, 0, 0), v(0, 0, 1)), Q_BACK = basis(v(0, 0, -1), v(-1, 0, 0), v(0, 1, 0)), Q_SIT = basis(v(0, 0, -1), v(0, 1, 0), v(1, 0, 0));

const STALK = { MERGE: 120, N: 69 };            // (the five vines climb to 120 before they braid into one trunk of 69 more segments, to about 810)
// ── The beanstalk: five vines from the five furrows, braiding into one great stalk that climbs out of sight, with leaves, tendrils and pods. ──
function buildStalk(scene) {
  const g = new THREE.Group(); g.userData.leaves = []; scene.add(g); const box = F.box, plain = F.plain;
  const green = [plain('#3f7f3a'), plain('#4a8f42'), plain('#37703a'), plain('#58a04a')], leafM = [plain('#4f9a46'), plain('#3f8a3c'), plain('#62ab52')], pod = plain('#7ab85a');
  const cx = PLOT.cx, cz = PLOT.cz, PIP = [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]].map(([i, j]) => v(cx + i * PLOT.cell, 0, cz + j * PLOT.cell));
  // The five vines lean in from their furrows and join at about 70 up.
  PIP.forEach((p, k) => { for (let s = 0; s < 14; s++) { const t = s / 14, x = lerp(p.x, cx, t * t), z = lerp(p.z, cz, t * t), y = 4 + t * (STALK.MERGE - 4), m = box(7 - t * 2, 11, 7 - t * 2, green[k % 4], x, y, z, g); m.rotation.y = k + t * 3; m.rotation.z = (cx - p.x) * 0.004 * t; m.rotation.x = -(cz - p.z) * 0.004 * t; } });
  // The stalk: it twists as it climbs, thinning a little, bending now one way and now another.
  const N = STALK.N; let top = null;
  for (let s = 0; s < N; s++) {
    const y = STALK.MERGE + s * 10, t = s / N, w = lerp(15, 7, t), sway = Math.sin(s * 0.19) * (8 + t * 40), sway2 = Math.cos(s * 0.15) * (6 + t * 36), x = cx + sway, z = cz + sway2;
    const m = box(w, 11, w, green[s % 4], x, y, z, g); m.rotation.y = s * 0.42;
    box(w * 0.35, 12, w * 0.35, plain('#8bc46a'), x + Math.cos(s * 0.42) * w * 0.5, y, z + Math.sin(s * 0.42) * w * 0.5, g).rotation.y = s * 0.42;       // a pale rib winding up it
    if (s % 3 === 1) { const a = s * 1.3, L = 30 + (1 - t) * 26; const leaf = new THREE.Group(); leaf.position.set(x, y, z); leaf.rotation.y = a; leaf.rotation.z = -0.25; g.add(leaf);
      g.userData.leaves.push({ g: leaf, y, a, L, w, x, z, s });
      box(L, 1.4, 14, leafM[s % 3], L / 2 + w / 2, 0, 0, leaf); box(L * 0.7, 1.4, 9, leafM[(s + 1) % 3], L * 0.9, 0.4, 7, leaf); box(L * 0.7, 1.4, 9, leafM[(s + 2) % 3], L * 0.9, 0.4, -7, leaf); }
    if (s % 8 === 5) { const a = s * 0.9; box(2, 2, 22, pod, x + Math.cos(a) * w, y - 4, z + Math.sin(a) * w, g).rotation.y = -a; }
    top = [x, y, z];
  }
  // A last curl of tendril at the very top, and a faint glow at the base where the beans were.
  box(30, 3, 3, green[1], top[0] + 16, top[1] + 8, top[2], g).rotation.z = 0.5; const light = new THREE.PointLight(0x9be07a, 0.7, 120, 1.5); light.position.set(cx, 20, cz); g.add(light);
  for (const p of PIP) box(CELL_ - 2, 1.2, CELL_ - 2, plain('#33241a'), p.x, 0.7, p.z, g);        // (the five tilled squares)
  return g;
}
const CELL_ = F.PLOT.cell;

// The farm at first light, with the beanstalk standing in it (done once; the scene is reused if the chapter is played again).
function ensureDawn(E) {
  if (E.userData.c3) return E.userData.c3;
  // Dawn: the night's stars and moon go, the sky warms, a low sun climbs behind the hills.
  { const T = F.textures(), sky = new THREE.Color(0xf0b890);
    E.background = sky; E.fog = new THREE.Fog(0xf0b890, 260, 1100);
    E.traverse(o => {
      if (o.isHemisphereLight) { o.color.set(0xffd9b8); o.groundColor.set(0x5a5242); o.intensity = 0.85; }
      else if (o.isDirectionalLight) { o.color.set(0xffc080); o.intensity = 0.8; o.position.set(300, 70, -150); }
      else if (o.isPointLight) o.visible = false;
      else if (o.isPoints) o.visible = false;
      else if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.material.color.getHex() === 0xf4f0d8) o.visible = false;
      else if (o.isMesh && o.material && o.material.map === T.cloud) { o.visible = true; o.material.color && o.material.color.set(0xffd8c0); }
    });
    const sun = new THREE.Mesh(new THREE.BoxGeometry(90, 90, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a0, fog: false })); sun.position.set(-500, 160, -1000); sun.lookAt(0, 0, 0); E.add(sun); }
  return (E.userData.c3 = buildStalk(E));
}
const STALK_VIEW = () => ({ pos: new THREE.Vector3(250, 230, 520), look: new THREE.Vector3(-40, 330, 0), fov: 66 });

async function run(G, W, opts) {
  const { ext, int, jackIn, jackOut, ja, aOut } = W, A_ = A, I = int.scene, E = ext.scene;
  G.mode = 'cutscene'; document.body.classList.add('cutscene'); G.drone = null; G.keepLine = false;
  // ── The room, in the dark, the fire banked low. ──
  int.setBank(0.12); int.hemi.intensity = 0.1; int.dim.intensity = 0.03;
  const moon = new THREE.PointLight(0x8aa0d8, 0.7, 95, 1.4); moon.position.set(-34, 30, 64); I.add(moon);
  for (const m of int.bedBlanket) m.visible = false;
  W.paintJack(jackIn, { outfit: 'Night', expr: 1 });
  jackIn.root.visible = true; jackIn.root.scale.setScalar(SC); W.mother.root.visible = false; int.chair.visible = true;
  const blanket = new THREE.Group(); const bl = F.box(32, 2.4, 18.4, F.plain('#6a4a3a'), 0, 0, 0, blanket); F.box(32.2, 2.5, 4, F.plain('#8a6a4a'), 0, 0.1, -7, blanket); I.add(blanket);
  const drapes = [F.box(32, 10, 0.9, F.plain('#5a3e30'), 0, -6, -9.2, blanket), F.box(32, 10, 0.9, F.plain('#5a3e30'), 0, -6, 9.2, blanket), F.box(0.9, 10, 18.4, F.plain('#5a3e30'), -16, -6, 0, blanket), F.box(0.9, 10, 18.4, F.plain('#5a3e30'), 16, -6, 0, blanket)]; drapes.forEach(d => { d.visible = false; }); let coverOn = false;      // (while he sleeps the blanket is fitted to him each frame: from his shoulders to past his feet, over the top of him, and falling to the bed on the room's side)
  // ── Jack's body: limbs by a few numbers, the whole of him placed by the point of his hips and which way up he lies. ──
  const P = { thigh: -0.25, knee: 0.5, armX: 0.2, armZ: 0.12, torso: 0.1, neckX: 0.15, neckY: 0, rub: 0, lie: 1 };
  jackIn.after = r => {
    const sw = Math.sin(ja.phase) * clamp(ja.speed / 20, 0, 1) * (ja.speed > 35 ? 1.15 : 0.7), t = ja.t, br = 0.02 * Math.sin(t * 1.7) * P.lie;
    r.hips.position.y = 12 + Math.abs(Math.sin(ja.phase)) * 0.5 * clamp(ja.speed / 20, 0, 1);
    r.legL.thigh.rotation.set(P.thigh + sw, 0, 0.03); r.legR.thigh.rotation.set(P.thigh - sw, 0, -0.03); r.legL.knee.rotation.set(P.knee, 0, 0); r.legR.knee.rotation.set(P.knee, 0, 0);
    for (const [a, sg] of [[r.armL, 1], [r.armR, -1]]) {
      a.rotation.x = lerp(P.armX + (sg > 0 ? -sw : sw) * 0.9, 0.34 + 0.05 * Math.sin(t * 5 + sg), P.rub); a.rotation.z = lerp(sg * P.armZ, -sg * 0.3, P.rub);
    }
    r.torso.rotation.set(P.torso + br, 0, 0); r.neck.rotation.set(P.neckX, P.neckY, 0);
    if (ja.air) { r.armL.rotation.x = r.armR.rotation.x = -2.5; r.legL.thigh.rotation.x = -0.5; r.legR.thigh.rotation.x = 0.25; r.legR.knee.rotation.x = 0.5; }       // (the leap)
    if (coverOn) fitBlanket();
  };
  const hipsLocal = v(0, 12 * SC, 0);
  const setBody = (Q, p) => { jackIn.root.quaternion.copy(Q); jackIn.root.position.copy(p).sub(hipsLocal.clone().applyQuaternion(Q)); };
  const tween = async (secs, fn) => { if (G.skipping) { fn(1, 1); return; } const t0 = G.t; for (;;) { const k = clamp((G.t - t0) / secs, 0, 1); fn(k, ease(k)); if (k >= 1) break; await G.wait(0.03); } };
  const BED_Y = 6.2, HIPS_SIDE = v(-28.5, BED_Y + 4.2, 62.5), HIPS_BACK = v(-28.5, BED_Y + 2.4, 62), HIPS_SIT = v(-34, BED_Y + 2.2, 62);
  const placeBlanket = (x, y, z, sx) => { blanket.position.set(x, y, z); blanket.scale.set(sx == null ? 1 : sx, 1, 1); coverOn = false; drapes.forEach(d => { d.visible = false; }); };
  const fitBlanket = () => {
    jackIn.root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(jackIn.root), nk = new THREE.Vector3(), hp = new THREE.Vector3(); jackIn.neck.getWorldPosition(nk); jackIn.hips.getWorldPosition(hp);
    const dir = Math.sign(nk.x - hp.x) || -1, head = dir < 0 ? bb.min.x : bb.max.x, feet = dir < 0 ? bb.max.x : bb.min.x, a = head - dir * 8.5, b = feet - dir * 1.5, x0 = Math.min(a, b), x1 = Math.max(a, b);
    const top = bb.max.y + 1.35, zc = (bb.min.z + bb.max.z) / 2, sz = clamp((bb.max.z - bb.min.z + 9) / 18.4, 0.55, 1), H = Math.max(2, top - 1.2 - BED_Y + 0.3);
    blanket.position.set((x0 + x1) / 2, top, zc); blanket.scale.set(Math.max(0.2, (x1 - x0) / 32), 1, sz); for (const d of drapes) { d.visible = true; d.scale.y = H / 10; d.position.y = -1.2 - H / 2; }
  };
  const sleeping = () => { P.lie = 1; P.thigh = -0.25; P.knee = 0.55; P.armX = 0.25; P.armZ = 0.1; P.torso = 0.12; P.neckX = 0.1; P.neckY = 0; P.rub = 0; ja.speed = 0; setBody(Q_SIDE, HIPS_SIDE); placeBlanket(-31, 11.2, 62.2, 1); coverOn = true; };
  const cams = {
    room: { pos: v(-14, 40, 20), look: v(-34, 8, 62), fov: 52 },
    over: { pos: v(-32, 34, 42), look: v(-33, 9, 62), fov: 40 },
    sit: { pos: v(-8, 26, 48), look: v(-34, 14, 62), fov: 44 },
    window: { pos: v(4, 22, 60), look: v(-34, 22, 68), fov: 40 },
    run: { pos: v(-70, 46, 30), look: v(-4, 10, 60), fov: 56 },
    door: { pos: v(8, 30, 2), look: v(34, 12, 70), fov: 42 },
  };

  // ── 9. Playable: the room at first light. He must dress (the wardrobe) and take his father's knife (the chest of drawers) before he goes out. ──
  async function dress() {
    G.skipping = false;                                    // (a skipped cutscene hands over to play at normal speed)
    ensureDawn(E); jackOut.root.visible = false; G.save({ step: 'dress' }); G.snapshotFarm(W.world, STALK_VIEW);       // (a save point: Continue comes back here, and the title shows the farm at dawn)
    G.setScene(W.iworld); G.drone = null; G.mode = 'play'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine();
    A_ && A_.ambience({ wind: 0.1, birds: 0.5, fire: 0.25 });
    int.setBank(0.3); int.hemi.intensity = 0.55; int.dim.intensity = 0.6; int.dim.color.set(0xffd2a0); moon.visible = false; int.ceiling.visible = false;
    if (!blanket.parent) I.add(blanket); placeBlanket(-8, 8.6, 66, 0.55);
    W.paintJack(jackIn, { outfit: 'Night', expr: 0 });
    Object.assign(P, { lie: 0, thigh: 0, knee: 0, armX: 0.05, armZ: 0.12, torso: 0.05, neckX: 0.1, neckY: 0, rub: 0 }); ja.speed = 0;
    jackIn.root.visible = true; jackIn.root.scale.setScalar(SC); W.mother.root.visible = false; int.chair.visible = true;
    int.doorLeaf.rotation.y = 0;
    const st = { pos: v(34, 0, 56), heading: Math.PI, yaw: Math.PI, pitch: 0.4, zoom: 1, dressed: false, knife: false, act: null, toastAt: 0, capAt: 0, stairsNear: false, leaving: false };
    const ZOOMS = [{ name: 'Close', d: 40 }, { name: 'Medium', d: 64 }, { name: 'Far', d: 92 }];
    const WARD = v(55, 0, -34), DRAW = v(55, 0, 4), STAIRS = v(-62, 0, 22);
    // What blocks him: the fixed furniture, and the movable pieces wherever the room layout has put them (half-widths across x and z, with the piece turned a quarter or not).
    const SOLID = [[58, -46, 76, -22], [58, -12, 76, 20], [-24, -76, 24, -58]];            // (the wardrobe, the chest of drawers, the hearth)
    for (const [key, hx, hz, z0, z1] of [['table', 15, 10], ['chair', 7, 7], ['stool', 6, 6], ['sack1', 6, 4.5], ['sack2', 6, 4.5], ['sack3', 6, 4.5], ['barrel', 7, 7], ['crate', 6, 6], ['broom', 5, 5], ['bed', 23, 10.7], ['stairs', 9, 0, -44, 4]]) {
      const it = int.items[key]; if (!it) continue; const g = it.g, q = Math.abs(Math.sin(g.rotation.y)) > 0.7, ax = q ? hz : hx, az = q ? hx : hz;
      if (key === 'stairs') SOLID.push([g.position.x - hx, g.position.z + z0, g.position.x + hx, g.position.z + z1]); else SOLID.push([g.position.x - ax, g.position.z - az, g.position.x + ax, g.position.z + az]);
    }
    if (int.items.stairs) STAIRS.set(int.items.stairs.g.position.x, 0, int.items.stairs.g.position.z + 12);
    const blocked = (x, z) => { if (Math.abs(x) > 69 || z < -69 || z > 76) return true; if (z > 69 && Math.abs(x - 34) > 9) return true; for (const [x0, z0, x1, z1] of SOLID) if (x > x0 - 4 && x < x1 + 4 && z > z0 - 4 && z < z1 + 4) return true; return false; };
    const knife = new THREE.Group(); F.box(1.2, 8, 0.8, F.plain('#b9bfc8'), 0, -4.5, 0, knife); F.box(1.6, 3.6, 1.2, F.plain('#4a3626'), 0, 0, 0, knife); F.box(3, 0.7, 1.4, F.plain('#b8923a'), 0, -1.8, 0, knife); knife.position.set(-5.6, 2, 0.4); knife.visible = false; jackIn.hips.add(knife);
    const satchel = new THREE.Group(), leather = F.plain('#8a6a42');                                  // (worn across the body, the bag at the right hip)
    F.box(1.3, 10, 4.7, F.plain('#6a4a2e'), 0, 6.5, 0, satchel).rotation.z = 0.37; F.box(2.6, 7, 8, leather, 5.4, 3, 0, satchel); F.box(2.9, 3, 8.2, F.plain('#6a4a2e'), 5.4, 5.6, 0, satchel); F.box(0.8, 1.6, 1.4, F.plain('#b8923a'), 6.9, 4.4, 0, satchel); satchel.visible = false; jackIn.torso.add(satchel);

    const css = document.createElement('style');
    css.textContent = `#cHud { position: fixed; inset: 0; pointer-events: none; z-index: 12; font-family: Georgia, serif; color: #ece8df; }
      #cObj { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(10,12,16,0.78); border: 1px solid #4a4d58; border-radius: 8px; padding: 8px 16px; font-size: clamp(13px, 1.9vw, 17px); text-align: center; max-width: 80vw; } #cObj .done { opacity: .5; text-decoration: line-through; }
      #cHint { position: absolute; left: 50%; bottom: 18vh; transform: translateX(-50%); background: rgba(10,12,16,0.85); border: 1px solid #c9a84c; color: #f0d98a; padding: 6px 14px; border-radius: 6px; font-size: 15px; display: none; }
      #cToast { position: absolute; left: 50%; bottom: 8vh; transform: translateX(-50%); background: rgba(10,12,16,0.85); border: 1px solid #4a4d58; padding: 8px 16px; border-radius: 8px; font-size: 14px; opacity: 0; transition: opacity .4s; }`;
    document.head.appendChild(css);
    const hud = document.createElement('div'); hud.id = 'cHud';
    hud.innerHTML = '<div id="cObj"></div><div id="cHint"></div><div id="cToast"></div>';
    document.body.appendChild(hud);
    const $ = id => document.getElementById(id), el = G.renderer.domElement;
    const toast = (t, ms = 3000) => { $('cToast').textContent = root.Tips.clean(t); $('cToast').style.opacity = 1; st.toastAt = performance.now() + ms; };
    const objective = () => { $('cObj').innerHTML = `<span class="${st.dressed ? 'done' : ''}">Dress (the wardrobe)</span> &nbsp;·&nbsp; <span class="${st.knife ? 'done' : ''}">Take Father’s knife (the chest of drawers)</span>`; };
    const mutter = (text, force) => { if (!force && performance.now() < st.capAt) return; st.capAt = performance.now() + 6500; G.caption('jack', text); };
    const keys = {}, ui = root.TouchUI.create({ keys, run: true, jump: true, act: true, drop: true, cam: true }), stick = ui.stick, KM = { w: 'up', W: 'up', ArrowUp: 'up', s: 'down', S: 'down', ArrowDown: 'down', a: 'left', A: 'left', ArrowLeft: 'left', d: 'right', D: 'right', ArrowRight: 'right', Shift: 'run' };
    const typing = e => e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    const kd = e => { if (typing(e)) return; const k = KM[e.key]; if (k) { keys[k] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); } if (e.repeat) return; if (e.key === 'e' || e.key === 'E') interact(); else if (e.key === 'q' || e.key === 'Q') takeKnife(); else if (e.key === 'v' || e.key === 'V') zoom(); else if (e.key === ' ') { e.preventDefault(); ui.on.jump(); } };
    const ku = e => { const k = KM[e.key]; if (k) keys[k] = false; };
    root.addEventListener('keydown', kd); root.addEventListener('keyup', ku);
    const drags = new Map();
    const pd = e => drags.set(e.pointerId, { x: e.clientX, y: e.clientY }), pm = e => { const d = drags.get(e.pointerId); if (!d) return; st.yaw -= (e.clientX - d.x) * 0.006; st.pitch = clamp(st.pitch + (e.clientY - d.y) * 0.005, 0.1, 1.35); d.x = e.clientX; d.y = e.clientY; }, pu = e => drags.delete(e.pointerId);
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
    const wheel = e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1 : -1); }; el.addEventListener('wheel', wheel, { passive: false });
    const camIcon = () => ui.set('cam', { icon: 'camera', title: 'Camera: ' + ZOOMS[st.zoom].name });
    function zoom(dir) { st.zoom = (st.zoom + (dir || 1) + ZOOMS.length) % ZOOMS.length; camIcon(); }
    camIcon(); ui.on.cam = () => zoom(); ui.on.act = () => interact(); ui.on.drop = () => takeKnife(); const hop = { y: 0, vy: 0 }, canHop = () => !st.act && !st.leaving && hop.y <= 0.01; ui.on.jump = () => { if (canHop()) hop.vy = 112 * SC; };

    const near = (p, r) => Math.hypot(st.pos.x - p.x, st.pos.z - p.z) < r;
    const act = (dur, then) => { st.act = { t: 0, dur, then }; ja.speed = 0; };
    function interact() {
      if (st.act || st.leaving) return;
      if (near(WARD, 20)) {
        if (st.dressed) { toast('You are dressed already.'); return; }
        st.heading = Math.atan2(WARD.x + 8 - st.pos.x, WARD.z - st.pos.z);
        act(1.8, () => { st.dressed = true; W.paintJack(jackIn, { outfit: 'Outdoor', expr: 1 }); objective(); toast('Dressed: shirt, jerkin and boots.'); A_ && A_.blip && A_.blip(); });
      }
    }
    function takeKnife() {                                                                                  // Q: take up Father’s knife
      if (st.act || st.leaving) return;
      if (near(DRAW, 20)) {
        if (st.knife) { toast('You have the knife.'); return; }
        if (!st.dressed) { mutter('I should dress first. I can’t go about in my nightshirt.', true); return; }
        st.heading = Math.atan2(DRAW.x + 8 - st.pos.x, DRAW.z - st.pos.z);
        act(1.6, () => { st.knife = true; knife.visible = true; satchel.visible = true; objective(); toast('Father’s knife on your belt, and a satchel over your shoulder.'); A_ && A_.blip && A_.blip(); });
      }
    }
    let resolveDress; const done = new Promise(r => { resolveDress = r; });
    async function leave() {
      st.leaving = true; $('cHint').style.display = 'none'; hud.style.display = 'none'; ui.show(false); st.act = null; ja.speed = 0;
      st.heading = 0; jackIn.root.quaternion.setFromAxisAngle(v(0, 1, 0), 0); await tween(0.8, (k, e) => { int.doorLeaf.rotation.y = lerp(0, -1.9, e); }); A_ && A_.latch && A_.latch();
      while (st.pos.z < 86) { st.pos.z += 0.7; jackIn.root.position.set(st.pos.x, 0, st.pos.z); ja.speed = 22; ja.phase += 0.3; await G.wait(0.04); }
      jackIn.root.visible = false; ja.speed = 0; await G.wait(0.6);
      A_ && A_.stopMusic && A_.stopMusic(2.5); await G.fade(true, 1.8); A_ && A_.ambience({ wind: 0, birds: 0, fire: 0 });
      root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); el.removeEventListener('wheel', wheel);
      G.updaters = G.updaters.filter(u => u !== tick); hud.remove(); css.remove(); ui.destroy(); G.mode = 'end'; resolveDress();
    }
    const camPos = new V3(), camLook = new V3();
    const tick = dt => {
      if (st.leaving) return;
      if (st.act) {
        const a = st.act; a.t += dt; ja.speed = 0; P.armX = -0.5 * Math.sin(Math.min(1, a.t / 0.4) * Math.PI / 2) + 0.05; P.torso = 0.18;
        if (a.t >= a.dur) { st.act = null; P.armX = 0.05; P.torso = 0.05; a.then && a.then(); }
      } else {
        const f = new V3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw)), r = new V3(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
        const dir = new V3().addScaledVector(f, (keys.up ? 1 : 0) - (keys.down ? 1 : 0)).addScaledVector(r, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
        if (Math.hypot(stick.x, stick.y) > 0.2) dir.addScaledVector(f, -stick.y).addScaledVector(r, stick.x);
        if (dir.lengthSq() > 0) {
          dir.normalize(); st.heading = turn(st.heading, Math.atan2(dir.x, dir.z), Math.min(1, dt * 9));
          const sp = (keys.run ? 48 : 24) * SC, nx = st.pos.x + Math.sin(st.heading) * sp * dt, nz = st.pos.z + Math.cos(st.heading) * sp * dt;
          if (!blocked(nx, st.pos.z)) st.pos.x = nx; if (!blocked(st.pos.x, nz)) st.pos.z = nz; ja.speed = 24; ja.phase += sp * dt * 0.42 / 0.95;
        } else ja.speed = 0;
      }
      if (hop.y > 0 || hop.vy > 0) { hop.vy -= 420 * SC * dt; hop.y += hop.vy * dt; if (hop.y <= 0) { hop.y = 0; hop.vy = 0; } } ja.air = hop.y > 0.01; ui.set('jump', { label: 'Jump', icon: 'jump', enabled: canHop() });
      jackIn.root.position.set(st.pos.x, hop.y, st.pos.z); jackIn.root.quaternion.setFromAxisAngle(v(0, 1, 0), st.heading);
      const atStairs = near(STAIRS, 17); if (atStairs && !st.stairsNear) mutter('Quietly... I mustn’t wake Mother.'); st.stairsNear = atStairs;
      if (st.pos.z > 66 && Math.abs(st.pos.x - 34) < 10) {
        if (st.dressed && st.knife) { leave(); return; }
        if (!st.dressed && !st.knife) mutter('I can’t go out like this. I need to dress, and fetch Father’s knife from the drawers first.');
        else if (!st.dressed) mutter('I’m still in my nightshirt. I need to dress first.');
        else mutter('Not yet. I still need Father’s knife from the drawers.');
        st.pos.z = Math.min(st.pos.z, 64); st.heading = Math.PI;
      }
      let hint = ''; if (!st.act) { if (near(WARD, 20)) hint = st.dressed ? '' : 'E: dress'; else if (near(DRAW, 20)) hint = st.knife ? '' : 'Q: take Father’s knife'; }
      $('cHint').textContent = hint; $('cHint').style.display = hint ? 'block' : 'none';
      ui.set('act', hint === 'E: dress' ? { label: 'Dress', enabled: true } : { label: 'Do', enabled: false }); ui.set('drop', { label: 'Take', enabled: hint === 'Q: take Father’s knife' });
      if (st.toastAt && performance.now() > st.toastAt) { $('cToast').style.opacity = 0; st.toastAt = 0; }
      const d = ZOOMS[st.zoom].d, p = st.pitch, at = v(st.pos.x, 15 * SC, st.pos.z);
      const want = v(clamp(at.x + Math.sin(st.yaw) * Math.cos(p) * d, -70, 70), clamp(at.y + Math.sin(p) * d, 4, 56), clamp(at.z + Math.cos(st.yaw) * Math.cos(p) * d, -70, 70));
      if (camPos.lengthSq() === 0) camPos.copy(want); else camPos.lerp(want, Math.min(1, dt * 10)); camLook.copy(at);
      G.cut({ pos: camPos, look: camLook, fov: 48 });
    };
    G.updaters.push(tick); G.chapter3 = { st, interact };
    objective(); await G.fade(false, 1.4);
    G.caption('jack', 'I can’t climb in my nightshirt. I’ll dress, and fetch Father’s knife from the chest of drawers.');
    st.capAt = performance.now() + 5000;
    await done;
  }
  if (opts && opts.only === 'dress') { await dress(); return { stalk: null }; }
  G.setScene(W.iworld);
  A_ && A_.ambience({ wind: 0.12, birds: 0, fire: 0.25 });

  // ── 1. The room: the bed, a sleeper under a blanket, facing the wall. ──
  G.cut(cams.room, () => { sleeping(); });
  G.fade(false, 1.6); await G.wait(3.2);
  // ── 2. He wakes: rolls onto his back. ──
  G.cut(cams.over, () => { sleeping(); });
  await G.wait(1.4);
  await tween(1.6, (k, e) => {
    jackIn.root.quaternion.slerpQuaternions(Q_SIDE, Q_BACK, e); const p = HIPS_SIDE.clone().lerp(HIPS_BACK, e); jackIn.root.position.copy(p).sub(hipsLocal.clone().applyQuaternion(jackIn.root.quaternion));
    P.thigh = lerp(-0.25, 0, e); P.knee = lerp(0.55, 0.1, e); P.armX = lerp(0.25, 0.05, e); W.paintJack(jackIn, { outfit: 'Night', expr: k > 0.6 ? 0 : 1 });
  });
  W.paintJack(jackIn, { outfit: 'Night', expr: 0 });
  await G.wait(0.8);
  await G.say('jack', 'Still dark. It must still be night.');
  await G.say('jack', 'Strange... I don’t feel the least bit tired.');
  // ── 3. The blanket thrown back; he sits up, and remembers. ──
  G.cut(cams.sit, () => { P.lie = 1; P.thigh = 0; P.knee = 0.1; P.armX = 0.05; P.rub = 0; setBody(Q_BACK, HIPS_BACK); placeBlanket(-31, 11, 62.2, 1); });
  await tween(0.9, (k, e) => { placeBlanket(lerp(-31, -8, e), lerp(11, 8.6, e), lerp(62.2, 66, e), lerp(1, 0.55, e)); P.armX = lerp(0.05, -0.9, Math.sin(e * Math.PI)); });
  await tween(1.3, (k, e) => {
    jackIn.root.quaternion.slerpQuaternions(Q_BACK, Q_SIT, e); const p = HIPS_BACK.clone().lerp(HIPS_SIT, e); jackIn.root.position.copy(p).sub(hipsLocal.clone().applyQuaternion(jackIn.root.quaternion));
    P.thigh = lerp(0, -1.5, e); P.knee = lerp(0.1, 0, e); P.torso = lerp(0.1, 0.05, e); P.neckX = lerp(0.1, 0.25, e); P.lie = 1 - e;
  });
  W.paintJack(jackIn, { outfit: 'Night', expr: 1 }); A_ && A_.voice && A_.voice(0.5, 2, 0, 0.5);            // the ache from the night before
  await tween(1.2, (k, e) => { P.rub = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 1; P.torso = 0.05 + 0.12 * Math.sin(k * Math.PI); });
  P.rub = 0; W.paintJack(jackIn, { outfit: 'Night', expr: 0 });
  await G.wait(0.5);
  // ── 4. He rises, onto the pallet, and goes to the window. ──
  G.cut(cams.sit, () => { P.lie = 0; P.thigh = -1.5; P.knee = 0; P.rub = 0; P.torso = 0.05; setBody(Q_SIT, HIPS_SIT); placeBlanket(-8, 8.6, 66, 0.55); });
  const STAND_Y = BED_Y + 12 * SC;
  await tween(0.9, (k, e) => { setBody(Q_SIT, v(-34, lerp(BED_Y + 2.2, STAND_Y, e), 62)); P.thigh = lerp(-1.5, 0, e); P.neckX = lerp(0.25, 0.1, e); });
  jackIn.root.quaternion.setFromAxisAngle(v(0, 1, 0), Math.PI / 2); jackIn.root.position.set(-34, BED_Y, 62);
  const heading = { y: Math.PI / 2 };
  const walkTo = async (to, speed, h0) => {                                                                // walk along the ground (and over the pallet), heading his way
    let ws = G.t; const from = jackIn.root.position.clone();
    for (;;) {
      const d = Math.hypot(to.x - jackIn.root.position.x, to.z - jackIn.root.position.z); if (d < 1.2) break;
      const want = Math.atan2(to.x - jackIn.root.position.x, to.z - jackIn.root.position.z), stp = Math.min(d, speed * 0.04); heading.y = turn(heading.y, want, 0.3);
      jackIn.root.quaternion.setFromAxisAngle(v(0, 1, 0), heading.y); jackIn.root.position.x += Math.sin(heading.y) * stp; jackIn.root.position.z += Math.cos(heading.y) * stp;
      const onBed = jackIn.root.position.x > -57 && jackIn.root.position.x < -11 && jackIn.root.position.z > 52 && jackIn.root.position.z < 72; jackIn.root.position.y = lerp(jackIn.root.position.y, onBed ? BED_Y : 0, 0.35);
      ja.speed = speed * 0.95; ja.phase += stp * 0.42; await G.wait(0.04);
    }
    ja.speed = 0;
  };
  P.lie = 0; P.armX = 0.05; P.armZ = 0.1; P.knee = 0; P.torso = 0.05;
  await walkTo(v(-34, 0, 68.5), 14, Math.PI / 2);
  heading.y = turn(heading.y, 0, 1); jackIn.root.quaternion.setFromAxisAngle(v(0, 1, 0), 0);
  // ── 5. At the window: he looks out, and gasps. ──
  G.cut(cams.window, () => { P.lie = 0; P.thigh = 0; P.knee = 0; P.rub = 0; P.torso = 0.05; ja.speed = 0; jackIn.root.position.set(-34, BED_Y, 68.2); jackIn.root.quaternion.setFromAxisAngle(v(0, 1, 0), 0); heading.y = 0; placeBlanket(-8, 8.6, 66, 0.55); });
  await G.wait(0.9);
  A_ && A_.voice && A_.voice(0.9, 4, 0, 0.9);                                                               // the gasp
  W.paintJack(jackIn, { outfit: 'Night', expr: 3 });
  await tween(0.5, (k, e) => { P.armX = lerp(0.05, -0.5, e); P.armZ = lerp(0.1, 0.5, e); P.torso = lerp(0.05, -0.1, e); P.neckX = lerp(0.1, -0.1, e); });
  await G.wait(0.9);
  // ── 6. He runs for the door. ──
  G.cut(cams.run, () => { P.lie = 0; P.thigh = 0; P.knee = 0; P.rub = 0; P.armX = -0.5; P.armZ = 0.5; P.torso = -0.1; P.neckX = -0.1; jackIn.root.position.set(-34, BED_Y, 68.2); heading.y = 0; jackIn.root.quaternion.setFromAxisAngle(v(0, 1, 0), 0); });
  P.armX = 0.2; P.armZ = 0.1; P.torso = 0.18; P.neckX = 0.1;
  const dpos = v(34, 0, 74);
  await walkTo(v(-34, 0, 54), 40); await walkTo(v(30, 0, 62), 52);
  G.cut(cams.door, () => { P.lie = 0; P.thigh = 0; P.knee = 0; P.rub = 0; P.armX = 0.2; P.armZ = 0.1; P.torso = 0.18; P.neckX = 0.1; jackIn.root.position.set(30, 0, 62); heading.y = Math.atan2(4, 12); ja.speed = 0; });
  { const w = walkTo(v(34, 0, 71), 52); await tween(0.5, (k, e) => { int.doorLeaf.rotation.y = lerp(0, -1.9, e); }); A_ && A_.latch && A_.latch(); await w; }
  await walkTo(v(36, 0, 82), 52);
  jackIn.root.visible = false; I.remove(moon); I.remove(blanket);

  // ── 7. Outside: the door, and Jack coming out of it. ──
  W.paintJack(jackOut, { outfit: 'Night', expr: 4 });
  const stalk = ensureDawn(E);
  const DOOR = v(34, 0, 22), look = { y: 0 };
  G.setScene(W.world); A_ && A_.ambience({ wind: 0.3, birds: 0.6, fire: 0 });
  const outPose = () => { aOut.speed = 0; aOut.fist = 0; aOut.hold = 0; aOut.cover = 0; aOut.crouch = 0; aOut.dig = 0; aOut.carry = 0; aOut.bow = 0; aOut.look = 0; };
  G.cut({ pos: v(96, 34, 112), look: v(36, 14, 36), fov: 40 }, () => { outPose(); jackOut.root.visible = true; jackOut.root.position.set(DOOR.x + 2, 0, DOOR.z + 2); jackOut.root.rotation.y = 0; ext.doorLeaf.rotation.y = -1.9; });
  await G.fade(false, 0.5);
  { let h = 0; const to = v(40, 0, 44); for (;;) { const d = Math.hypot(to.x - jackOut.root.position.x, to.z - jackOut.root.position.z); if (d < 1) break; const stp = Math.min(d, 46 * 0.04); h = turn(h, Math.atan2(to.x - jackOut.root.position.x, to.z - jackOut.root.position.z), 0.3); jackOut.root.rotation.y = h; jackOut.root.position.x += Math.sin(h) * stp; jackOut.root.position.z += Math.cos(h) * stp; aOut.speed = 44; aOut.phase += stp * 0.42; await G.wait(0.04); } }
  aOut.speed = 0;
  // He turns, to the beans he planted, agog.
  await tween(0.9, (k, e) => { jackOut.root.rotation.y = lerp(jackOut.root.rotation.y, -Math.PI / 2 - 0.1, e); });
  W.paintJack(jackOut, { outfit: 'Night', expr: 3 }); aOut.hold = 0.35; aOut.bow = -0.3;
  await G.wait(1.2);
  // ── 8. The camera lifts, and the beanstalk is revealed. ──
  await G.shot({ pos: v(150, 150, 300), look: v(-60, 240, 0), fov: 62 }, 8, 'inOut');
  await G.say('jack', 'Mother will eat every word when she sees this.');
  await G.say('jack', '...But perhaps something worth more than her words lies at the top.');
  await G.say('jack', 'I’ll climb it. I’ll be back before she wakes.');
  // ── 9. He goes back inside. ──
  G.cut({ pos: v(70, 30, 70), look: v(34, 16, 26), fov: 50 }, () => { aOut.hold = 0; aOut.bow = 0; jackOut.root.position.set(40, 0, 44); jackOut.root.rotation.y = Math.PI; });
  { let h = Math.PI; const to = v(36, 0, 28); for (;;) { const d = Math.hypot(to.x - jackOut.root.position.x, to.z - jackOut.root.position.z); if (d < 1) break; const stp = Math.min(d, 22 * 0.04); h = turn(h, Math.atan2(to.x - jackOut.root.position.x, to.z - jackOut.root.position.z), 0.3); jackOut.root.rotation.y = h; jackOut.root.position.x += Math.sin(h) * stp; jackOut.root.position.z += Math.cos(h) * stp; aOut.speed = 22; aOut.phase += stp * 0.42; await G.wait(0.04); } }
  { let h = Math.PI; for (let i = 0; i < 40; i++) { jackOut.root.position.z -= 0.35; aOut.speed = 20; aOut.phase += 0.3; await G.wait(0.04); } }
  jackOut.root.visible = false; aOut.speed = 0;
  { const t0 = G.t; await tween(0.7, (k, e) => { ext.doorLeaf.rotation.y = lerp(-1.9, 0, e); }); A_ && A_.thwack && A_.thwack(0.3, true, 0.5); }
  await G.wait(1.4);
  await G.fade(true, 1.6); G.hideLine && G.hideLine(); await G.wait(0.5);
  // The room again, at first light, and now it is his to move about in.
  I.add(moon); await dress();
  return { stalk };
}

root.Chapter3 = { run, buildStalk, ensureDawn, STALK_VIEW, STALK };
})(typeof window !== 'undefined' ? window : globalThis);
