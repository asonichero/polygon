// Climbing Toward Consequence — a test level: walk Jack about the castle (js/castle.js, at 100% model scale).
//   Chapter One's controls (WASD or the stick, Shift runs, Space jumps, drag to look, V or the wheel to zoom), plus C for a first-person camera, and a slider that sets Jack's size from 5% to 150%.
//   The walls, furniture and sills are solid, found by walking the built scene (every opaque box); Jack steps up onto low things and can jump onto higher ones.
// Exposes CastleWalk.run(G, W): W is Night.build's world (Jack, in his outdoor clothes).
(function (root) {
'use strict';
const THREE = root.THREE, A = root.GameAudio, V3 = THREE.Vector3;
const v = (x, y, z) => new V3(x, y, z), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const SC = 0.95, HEIGHT = 31, FULL = 1.4;                            // (Jack's model height at the cottage's 100% is 31; in the castle his "100%" is 1.4 times that, 43, and the ceiling, 86, is twice it)
const PLACES = [['Entrance hall', 0, 70, Math.PI], ['Corridor A', -180, -26, Math.PI / 2], ['Music hall', -150, 44, Math.PI], ['Library', -150, -98, Math.PI], ['Nursery', -250, -205, 0], ['Narrow corridor, kitchen end', -95, -25, Math.PI / 2], ['Nursery chest', -125, -178, Math.PI / 2], ['Kitchen', 150, 0, Math.PI], ['Parlour', 310, -40, Math.PI],
  ['Bathing room', 320, -140, -Math.PI / 2], ['Hen roost', 280, -250, 0], ['Garden', 80, -200, Math.PI]];

// Every opaque box in the room becomes a collision box (floors, rugs and glass excepted), in a grid for quick lookup.
function collect(room, ceiling, pantry) {
  const boxes = [], grid = new Map(), CELL = 24, key = (a, b) => a * 4096 + b; room.updateMatrixWorld(true);
  room.traverse(o => {
    if (!o.isMesh || !o.visible) return; for (let p = o.parent; p; p = p.parent) if (p === ceiling || (p.userData && p.userData.noCollide)) return;
    if (o.material && (o.material.transparent || o.material.blending === THREE.AdditiveBlending)) return;
    const b = new THREE.Box3().setFromObject(o); if (b.max.x - b.min.x < 0.3 || b.max.z - b.min.z < 0.3) return;
    const low = b.max.y <= 0.7; if (low) { const m = o.matrixWorld.elements; if (b.max.y <= 0.15 || Math.abs(m[0] * m[2]) > 0.01) return; }          // (rugs and mats are floor he stands on, not walls: only the squared-up ones, whose boxes are true)
    const e = { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, y0: b.min.y, y1: b.max.y, low };
    if (pantry) for (let q = o.parent; q; q = q.parent) if (q === pantry) { e.pantry = true; break; }
    { const m = o.material, c = m && !m.map && m.color; if (c) { const sc = c.clone().convertLinearToSRGB(), R = Math.round(sc.r * 255), G_ = Math.round(sc.g * 255), B_ = Math.round(sc.b * 255); e.wood = R >= 0x30 && R <= 0xa0 && R > G_ && G_ > B_ && R - B_ >= 14 && R - B_ <= 75; } }      // (brown, unglazed: wood he can get his hands into) boxes.push(e);
    for (let i = Math.floor(e.x0 / CELL); i <= Math.floor(e.x1 / CELL); i++) for (let j = Math.floor(e.z0 / CELL); j <= Math.floor(e.z1 / CELL); j++) { const k = key(i, j); (grid.get(k) || grid.set(k, []).get(k)).push(e); }
  });
  const near = (x, z, r) => { const out = [], seen = new Set(); for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) { const c = grid.get(key(i, j)); if (c) for (const e of c) if (!seen.has(e)) { seen.add(e); out.push(e); } } return out; };
  return { boxes, near };
}

function run(G, W, opts) {
  opts = opts || {}; const ch3 = !!opts.ch3, story = !!opts.story, ROOMS = { hall: [-88, 88, -108, 108], kitchen: [92, 248, -109, 51], hallKitchenDoor: [86, 94, -45, -5] };
  return new Promise(async resolve => {
    const { jackOut, aOut } = W, el = G.renderer.domElement, camera = G.camera, nearOld = camera.near;
    const M = root.Castle.interior(), scene = M.scene, ceiling = M.ceiling;
    // In the story, only some rooms are his: the others' doors are shut, and the walls of the rest keep him in. (Jack comes in under the great door, at the size he left the meadow: a tenth.)
    const open = story ? (opts.rooms || ['hall', 'kitchen', 'hallKitchenDoor']).map(k => ROOMS[k]) : null;
    if (story) { const near = (d, r) => { const x = d.axis === 'z' ? d.c : d.fixed, z = d.axis === 'z' ? d.fixed : d.c, e = 6; return x > r[0] - e && x < r[1] + e && z > r[2] - e && z < r[3] + e && !(x > r[0] + e && x < r[1] - e && z > r[2] + e && z < r[3] - e); };
      const STATES = opts.doors || [['x', -90, -25.5, 'ajar'], ['x', 90, -25, 'open'], ['z', -111, 162, 'closed'], ['x', 250, -75, 'closed'], ['x', -273, -100, 'closed']];     // the narrow corridor's doors pulled to; the kitchen's open; the garden's and the parlour's shut
      for (const d of M.doors) { const sp = STATES.find(q => q[0] === d.axis && Math.abs(q[1] - d.fixed) < 3 && Math.abs(q[2] - d.c) < 6);
        if (sp && sp[3] === 'open') continue; if (sp && sp[3] === 'ajar') { d.lg.rotation.y = Math.sign(d.lg.rotation.y || 1) * 0.42; d.og.userData.noCollide = false; continue; }
        if (sp || open.some(r => near(d, r))) { d.openAng = d.lg.rotation.y; d.lg.rotation.y = 0; d.og.userData.noCollide = false; } } for (const h of M.hallLeaves) h.lf.rotation.y = 0; }
    let gerda = null; const world = { scene, update(dt, t) { M.update(dt, t); G.exprWatch && G.exprWatch(); aOut.t += dt; if (st && st.wriggle && st.inHand && gerda && jackOut.root.parent === gerda.wrist && root.GerdaHold) { const J = root.GerdaHold.jack, w = t * 1; jackOut.root.rotation.set(J.rx + 0.045 * Math.sin(w * 3.1), J.ry + 0.06 * Math.sin(w * 2.3 + 1), J.rz + 0.04 * Math.sin(w * 3.7 + 2)); jackOut.root.position.set(J.px + 0.02 * Math.sin(w * 2.9), J.py + 0.025 * Math.sin(w * 3.3 + 1), J.pz + 0.02 * Math.sin(w * 2.1)); }
      root.Blocky.step(jackOut, dt); if (gerda) root.Blocky.step(gerda, dt); } };
    // two more horses' worth of toys are not wanted here: one rocking horse is all the nursery has (see castle.js)
    if (ch3) {                                                                                              // Chapter Three opens in the kitchen: the table is cleared, and the keepsake box stands in the middle of it
      const tgp = M.items.kitchenTable.g, gone = []; tgp.traverse(o => { if (o.userData && o.userData.item) gone.push(o); }); for (const o of gone) if (o.parent) o.parent.remove(o);
      const b0 = M.items.keepsakeBox.g; b0.position.set(tgp.position.x, 25.5, tgp.position.z); b0.rotation.y = 0; b0.userData.box.lid.rotation.x = 0;
      for (const d of M.doors) if (d.axis === 'z' && Math.abs(d.fixed + 111) < 3 && Math.abs(d.c - 162) < 6) { d.openAng = d.lg.rotation.y; d.lg.rotation.y = 0; d.og.userData.noCollide = false; }       // the garden door is shut
      for (const d of M.doors) if (d.axis === 'x' && Math.abs(d.fixed + 273) < 3 && Math.abs(d.c + 100) < 6) { d.openAng = d.lg.rotation.y; d.lg.rotation.y = 0; d.og.userData.noCollide = false; }       // (the library door is shut)
      for (const d of M.doors) if (d.axis === 'z' && Math.abs(d.fixed + 8) < 3 && Math.abs(d.c - 315) < 8) { d.openAng = d.lg.rotation.y; d.lg.rotation.y = 0; d.og.userData.noCollide = false; }       // (the stairwell door is shut)
      for (const d of M.doors) if (d.axis === 'x' && Math.abs(d.fixed + 90) < 3 && Math.abs(d.c + 25.5) < 8) { d.og.visible = false; d.og.userData.noCollide = true; }       // (no doors where the narrow corridor meets the corridor with the urns)
      for (const h of M.hallLeaves) h.lf.rotation.y = 0;                                                                                                                                               // and so are the great doors, with the crack he came in by still to be seen at their foot
      { const crack = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.6, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff1c4 })); crack.position.set(0, 2.3, 108.5); M.scene.add(crack); }
    }
    const C = collect(M.room, ceiling, M.items.pantry && M.items.pantry.g);
    const things = []; if (story) { M.room.updateMatrixWorld(true); M.room.traverse(o => { if (o.userData && o.userData.item) { const w = new V3(); o.getWorldPosition(w); things.push(Object.assign({ o, pos: w }, o.userData.item)); } }); }
    { const pj = W.paintJack; let lastBeat = -1; W.paintJack = (rig, o) => { if (rig === jackOut && G.exprOverride) { const e = G.exprOverride(G.beat); if (e) o = Object.assign({}, o, { expr: e }); } return pj.call(W, rig, o); };
      G.refreshExpr = () => { const e = G.exprOverride && G.exprOverride(G.beat); if (e) pj.call(W, jackOut, { expr: e }); };      // (the scene notes can choose his face for a beat; it holds for the whole of it)
      G.exprWatch = () => { if (G.exprOverride && G.beat !== lastBeat) { lastBeat = G.beat; G.refreshExpr(); } }; }
      scene.add(jackOut.root); jackOut.root.visible = true; W.paintJack(jackOut, { expr: 0 }); root.Meadow && root.Meadow.addGear && root.Meadow.addGear(jackOut);
    G.setScene(world); G.drone = null; if (!story && !ch3) G.noSave = true;
    camera.near = 0.4; camera.far = 1600; camera.updateProjectionMatrix(); let nearS = 0;
    A && A.ambience({ wind: 0, birds: 0, fire: 0.2 });
    const st = { pos: v(0, 0, story ? 98 : 70), heading: Math.PI, walkN: 0, walkPh: 0, camA: Math.PI / 2, pitch: 0.35, fpPitch: 0, zoom: 1, vy: 0, y: 0, jumpReq: false, s: opts.scale || (story ? 0.1 : FULL), fp: false, scene: false, actReq: false, putReq: false, eaten: 0, perch: null, air: false, cl: null, mant: null, stam: 1, climbPh: 0, toastAt: 0 };
    jackOut.after = r => {
      const w = Math.sin(st.walkPh) * 0.7 * st.walkN;
      r.legL.thigh.rotation.x = w; r.legR.thigh.rotation.x = -w; r.legL.knee.rotation.x = 0; r.legR.knee.rotation.x = 0;
      r.armL.rotation.x = -w * 0.8; r.armR.rotation.x = w * 0.8; r.armL.rotation.z = 0.06; r.armR.rotation.z = -0.06; r.neck.rotation.x = 0; r.torso.rotation.x = 0.04; r.hips.position.y = 12 + Math.abs(Math.sin(st.walkPh)) * 0.5 * st.walkN;
      if (st.cl) { const c = Math.sin(st.climbPh); r.armL.rotation.x = -2.5 + 0.5 * c; r.armR.rotation.x = -2.5 - 0.5 * c; r.legL.thigh.rotation.x = -0.9 - 0.5 * c; r.legR.thigh.rotation.x = -0.9 + 0.5 * c; r.legL.knee.rotation.x = 0.9; r.legR.knee.rotation.x = 0.9; r.torso.rotation.x = -0.15; }
      else if (st.mant) { r.armL.rotation.x = r.armR.rotation.x = -2.2; r.legL.thigh.rotation.x = -1.0; r.legR.thigh.rotation.x = -0.3; r.legL.knee.rotation.x = 1.0; }
      else if (st.sit) { const k = st.sit; r.legL.thigh.rotation.x = r.legR.thigh.rotation.x = -1.35 * k; r.legL.knee.rotation.x = r.legR.knee.rotation.x = 0.15 * k; r.armL.rotation.set(-0.2 * k, 0, 0.5 * k); r.armR.rotation.set(-0.2 * k, 0, -0.5 * k); r.torso.rotation.x = -0.05 * k; r.neck.rotation.x = -0.85 * k; }          // (sitting up in the box, his hands braced on the velvet, his head back, looking up at her)
      else if (st.inHand && root.GerdaHold) { const J = root.GerdaHold.jack, wg = st.wriggle ? 0.3 * Math.sin(G.t * 3.4) : 0, wg2 = st.wriggle ? 0.3 * Math.sin(G.t * 2.7 + 1.5) : 0; r.armL.rotation.set(J.armLx + 0.3 * wg, 0, J.armLz + 0.2 * wg2); r.armR.rotation.set(J.armRx - 0.3 * wg, 0, J.armRz - 0.2 * wg2); r.legL.thigh.rotation.x = J.legLx + 0.35 * wg2; r.legR.thigh.rotation.x = J.legRx - 0.35 * wg; r.legL.knee.rotation.x = J.kneeL; r.legR.knee.rotation.x = J.kneeR; r.torso.rotation.x = J.torsoX; r.neck.rotation.x = J.neckX; }
      else if (st.air) { r.armL.rotation.x = r.armR.rotation.x = -2.5; r.legL.thigh.rotation.x = -0.5; r.legR.thigh.rotation.x = 0.25; r.legR.knee.rotation.x = 0.5; }                    // (the leap, as in Chapter One)
      if (st.pose) { const q = st.pose; if (q.thigh !== undefined) r.legL.thigh.rotation.x = r.legR.thigh.rotation.x = q.thigh; if (q.legLx !== undefined) { r.legL.thigh.rotation.x = q.legLx; r.legR.thigh.rotation.x = q.legRx; r.legL.knee.rotation.x = q.kneeL; r.legR.knee.rotation.x = q.kneeR; } if (q.knee !== undefined) r.legL.knee.rotation.x = r.legR.knee.rotation.x = q.knee; if (q.armLx !== undefined) r.armL.rotation.set(q.armLx, q.armLy || 0, q.armLz || 0); if (q.armRx !== undefined) r.armR.rotation.set(q.armRx, q.armRy || 0, q.armRz || 0); if (q.elbowL !== undefined) r.elbowL.rotation.x = q.elbowL; if (q.elbowR !== undefined) r.elbow.rotation.x = q.elbowR; if (q.torso !== undefined) r.torso.rotation.x = q.torso; if (q.neckX !== undefined) r.neck.rotation.x = q.neckX; if (q.neckY !== undefined) r.neck.rotation.y = q.neckY; }       // (a pose set by a scene, over the rest)
      if (st.gaze) { r.neck.rotation.y = st.gaze.y; r.neck.rotation.x = st.gaze.x; }       // (where he is looking: set by the dressing scene, from his shyness)
      if ((st.scene || st.frozen) && !st.air && !st.cl && !st.mant && st.walkN < 0.3) { const t = G.t, tk = st.talk || 0;                                    // (a little breath and sway in the cutscenes, as in the others: only on what is set afresh each frame, so that it does not build up)
        r.torso.rotation.x += 0.012 * Math.sin(t * 1.5); r.neck.rotation.x += 0.03 * Math.sin(t * 0.9) + tk * 0.02 * Math.sin(t * 3.3); r.armL.rotation.x += 0.015 * Math.sin(t * 1.1); r.armR.rotation.x -= 0.015 * Math.sin(t * 1.1) - tk * 0.04 * Math.sin(t * 2.6); r.hips.position.y += 0.06 * Math.sin(t * 1.5); }
    };
    // ── HUD and controls ──
    const css = document.createElement('style');
    css.textContent = `#cwHud { position: fixed; inset: 0; pointer-events: none; z-index: 12; font-family: Georgia, serif; color: #ece8df; }
      #cwPanel { position: absolute; top: 12px; left: 12px; background: rgba(10,12,16,0.78); border: 1px solid #4a4d58; border-radius: 8px; padding: 8px 12px; font-size: 14px; pointer-events: auto; display: flex; flex-direction: column; gap: 6px; max-width: 46vw; }
      #cwPanel input[type=range] { width: 200px; max-width: 40vw; } #cwPanel select { background: #20232e; color: #ece8df; border: 1px solid #4a4d58; border-radius: 6px; padding: 4px; font-size: 14px; }
      #cwToast { position: absolute; left: 50%; bottom: 22vh; transform: translateX(-50%); background: rgba(10,12,16,0.8); border: 1px solid #4a4d58; padding: 7px 15px; border-radius: 8px; font-size: 14px; max-width: 80vw; text-align: center; opacity: 0; transition: opacity .5s; }
      #cwStamW { position: absolute; left: 50%; bottom: 14vh; transform: translateX(-50%); width: 160px; height: 10px; background: rgba(10,12,16,0.7); border: 1px solid #4a4d58; border-radius: 5px; display: none; overflow: hidden; } #cwStam { height: 100%; width: 100%; background: #e6c46a; }
      #cwPrompt { position: absolute; left: 50%; bottom: 30vh; transform: translateX(-50%); background: rgba(10,12,16,0.82); border: 1px solid #c9a84c; color: #f3e4b0; padding: 6px 14px; border-radius: 8px; font-size: 15px; display: none; white-space: nowrap; cursor: pointer; pointer-events: auto; }
      #cwObjt { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(10,12,16,0.7); border: 1px solid #4a4d58; border-radius: 8px; padding: 8px 16px; font-size: 16px; display: none; }
      #cwPage { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.96); width: min(520px, 80vw); padding: 44px 20px 36px; background: radial-gradient(ellipse at 50% 40%, #f3e8c8, #e2d0a0); border: 3px double #8a6a3a; box-shadow: 0 10px 60px #000; text-align: center; opacity: 0; transition: opacity 1.2s ease, transform 1.2s ease; pointer-events: none; z-index: 30; }
      #cwPage.on { opacity: 1; transform: translate(-50%, -50%) scale(1); } #cwPage span { font: italic 600 clamp(64px, 15vw, 128px)/1 'Snell Roundhand', 'Zapfino', 'Brush Script MT', 'Lucida Handwriting', 'Apple Chancery', cursive; color: #3a2616; text-shadow: 1px 1px 0 #b89a62; } #cwPage:after { content: '\\2766'; display: block; margin-top: 10px; font-size: 26px; color: #8a6a3a; }
      #cwCross { position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: rgba(255,255,255,0.7); display: none; }`;
    document.head.appendChild(css);
    const hud = document.createElement('div'); hud.id = 'cwHud';
    hud.innerHTML = '<div id="cwPanel"><label>Jack’s size: <b id="cwPct">100%</b><br><input id="cwScale" type="range" min="5" max="150" step="1" value="100"></label><select id="cwGo"><option value="">Go to…</option></select></div><div id="cwObjt"></div><div id="cwPrompt"></div><div id="cwStamW"><div id="cwStam"></div></div><div id="cwCross"></div><div id="cwToast"></div><div id="cwPage"><span>Jack</span></div>';
    document.body.appendChild(hud);
    const $ = id => document.getElementById(id);
    const toast = (t, ms = 6000) => { $('cwToast').textContent = root.Tips.clean(t); $('cwToast').style.opacity = 1; st.toastAt = performance.now() + ms; };
    const keys = {}, ui = root.TouchUI.create({ keys, run: true, sneak: true, jump: true, act: true, drop: true, cam: true }), stick = ui.stick, KM = { w: 'up', W: 'up', ArrowUp: 'up', s: 'down', S: 'down', ArrowDown: 'down', a: 'left', A: 'left', ArrowLeft: 'left', d: 'right', D: 'right', ArrowRight: 'right', Shift: 'run', Control: 'sneak', x: 'sneak', X: 'sneak' };
    const typing = e => e.target && /TEXTAREA|SELECT/.test(e.target.tagName) || (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'range');
    const ZOOMS = [{ name: 'Close', d: 52 }, { name: 'Medium', d: 92 }, { name: 'Far', d: 150 }];
    function cycleZoom(dir) { st.zoom = (st.zoom + (dir || 1) + ZOOMS.length) % ZOOMS.length; camIcon(); }
    const camIcon = () => ui.set('cam', { icon: st.fp ? 'eye' : 'camera', title: st.fp ? 'First person' : 'Camera: ' + ZOOMS[st.zoom].name });
    const camStep = () => cycleZoom();       // (the camera button: close, medium, far, and round again)
    function toggleView() { st.fp = !st.fp; $('cwCross').style.display = st.fp ? 'block' : 'none'; jackOut.root.visible = !st.fp; if (st.fp) st.fpPitch = 0; camIcon(); }
    const kd = e => { if (typing(e)) return; const k = KM[e.key]; if (k) { keys[k] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); } if (e.key === ' ') { keys.space = true; e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } if (e.repeat) return; if (e.key === ' ') st.jumpReq = true; if (e.key === 'c' || e.key === 'C') { keys.sneak = !keys.sneak; ui.setSneak(keys.sneak); } if (e.key === 'e' || e.key === 'E') st.actReq = true; if (e.key === 'q' || e.key === 'Q') st.putReq = true; }, ku = e => { const k = KM[e.key]; if (k) keys[k] = false; if (e.key === ' ') keys.space = false; };
    root.addEventListener('keydown', kd); root.addEventListener('keyup', ku);
    camIcon(); ui.on.cam = camStep; ui.on.jump = () => { st.jumpReq = true; keys.space = true; }; ui.on.jumpUp = () => { keys.space = false; }; ui.on.act = () => { st.actReq = true; }; ui.on.drop = () => { st.putReq = true; }; ui.on.sneak = on => { keys.sneak = on; };
    $('cwScale').oninput = () => { st.s = +$('cwScale').value / 100 * FULL; $('cwPct').textContent = Math.round(st.s / FULL * 100) + '%'; };
    $('cwScale').onchange = () => $('cwScale').blur();
    for (const [i, p] of PLACES.entries()) { const o = document.createElement('option'); o.value = i; o.textContent = p[0]; $('cwGo').appendChild(o); }
    $('cwGo').onchange = () => { const p = PLACES[+$('cwGo').value]; $('cwGo').value = ''; $('cwGo').blur(); if (!p) return; st.pos.set(p[1], 0, p[2]); st.heading = p[3]; st.y = 0; st.vy = 0; st.camA = Math.atan2(-Math.cos(p[3]), -Math.sin(p[3])) + 0; camPos.set(0, 0, 0); };
    const drags = new Map();
    const pd = e => drags.set(e.pointerId, { x: e.clientX, y: e.clientY }), pu = e => drags.delete(e.pointerId);
    const pm = e => { const d = drags.get(e.pointerId); if (!d) return; st.camA += (e.clientX - d.x) * 0.006; if (st.fp) st.fpPitch = clamp(st.fpPitch + (e.clientY - d.y) * 0.005, -1.3, 1.3); else st.pitch = clamp(st.pitch + (e.clientY - d.y) * 0.005, -0.9, 1.35); d.x = e.clientX; d.y = e.clientY; };
    const wheel = e => { e.preventDefault(); if (!st.fp) cycleZoom(e.deltaY > 0 ? 1 : -1); };
    el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);


    // ── Collision: a circle against the boxes, vertically as tall as Jack. ──
    const camPos = new V3(), camLook = new V3();
    const step = () => 4 * st.s;                                                       // how high a ledge he steps straight up onto
    const blockedAt = (x, z, y) => { const r = 4 * st.s, top = y + HEIGHT * st.s * 0.98, up = y + step(); if (x < M.bounds.x0 || x > M.bounds.x1 || z < M.bounds.z0 || z > M.bounds.z1) return true;
      if (open && !open.some(q => x > q[0] && x < q[1] && z > q[2] && z < q[3])) return true;
      if (st.perch && (x < st.perch.x0 || x > st.perch.x1 || z < st.perch.z0 || z > st.perch.z1)) return true;                      // (on a rung he cannot walk off: only jump)
      if (story && st.bread && x < -83.5 && z > -43 && z < -8) return true;                                  // (once he has smelt it, the narrow corridor's doors are as far as he goes)
      for (const e of C.near(x, z, r)) { if (e.low || e.y1 <= up || e.y0 >= top) continue; const cx = clamp(x, e.x0, e.x1), cz = clamp(z, e.z0, e.z1); if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < r * r) return true; } return false; };
    const floorAt = (x, z, y) => { const r = 1.2 * st.s, up = y + step() + 0.5; let g = 0; for (const e of C.near(x, z, r)) { if (e.y1 > up || e.y1 <= g) continue; const cx = clamp(x, e.x0, e.x1), cz = clamp(z, e.z0, e.z1); if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < r * r) g = e.y1; } return g; };
    const ceilAt = p => (Math.abs(p.x) < 92 && Math.abs(p.z) < 112) ? root.Castle.HH : M.H;                     // (the hall's ceiling is higher)
    const roomBox = (x, z) => { let rm = null; for (const r of M.rooms || []) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1 && (!rm || (r.x1 - r.x0) * (r.z1 - r.z0) < (rm.x1 - rm.x0) * (rm.z1 - rm.z0))) rm = r; return rm; };       // (the roofed room that holds a place: its walls and ceiling)
    const camBlocked = (p, s) => { if (p.y > ceilAt(p) - 9) return true; for (const e of C.near(p.x, p.z, 3)) if ((e.y1 - e.y0 > 30 || (st.inCup && e.pantry)) && p.x > e.x0 - 1.5 * s && p.x < e.x1 + 1.5 * s && p.z > e.z0 - 1.5 * s && p.z < e.z1 + 1.5 * s && p.y > e.y0 && p.y < e.y1) return true; return false; };

    // ── The kitchen table: things to look at, crumbs to take or leave, the loaf that is not his, and then footsteps overhead. ──
    const sayW = async (who, text) => { const o = who === 'gerda' ? gst : st; o.talk = 1; if (who === 'jack' && gerda) gst.listen = 1; try { await G.say(who, text); } finally { o.talk = 0; if (who === 'jack' && gerda) gst.listen = 0; } };       // (she talks with her free hand, and he with a little head and hand: from the first word to the last)
    const say = t => G.caption('jack', t), later = (ms, f) => setTimeout(f, ms), tableG = M.items.kitchenTable.g, pantryG = M.items.pantry.g;
    const promptEl = () => $('cwPrompt');
    $('cwPrompt').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (st.wait) { if (st.wait.key === 'q') st.putReq = true; else st.actReq = true; } });       // (the prompt is a button too: a click or a tap does what its key does)
    function storyTick(dt) {
      const Hj = HEIGHT * SC * st.s, pr = promptEl(); let text = '';
      { const lp = pantryG.worldToLocal(new V3(st.pos.x, st.y, st.pos.z)); st.inCup = Math.abs(lp.x) < 11.6 && lp.z > -6.2 && lp.z < 6.4 && lp.y > -1 && lp.y < 22; }               // (inside the cupboard its walls and doors hold the camera in)
      st.uiAct = null; st.uiDrop = false; st.uiDropLabel = null;
      if (st.hiding) { pr.style.display = 'none'; return; }
      if (st.busy) { pr.style.display = 'none'; st.actReq = st.putReq = false; return; }                          // (he is saying what he has to say: nothing else can be touched until it is said)
      const onTable = st.y >= 25.3 && Math.abs(st.pos.x - tableG.position.x) <= 25 && Math.abs(st.pos.z - tableG.position.z) <= 13;
      if (onTable && !st.tMount) st.tMount = performance.now();
      if (st.tMount && !st.alarm) { const el = (performance.now() - st.tMount) / 1000; if ((st.loafTaken && el >= 50) || el >= 110) alarm(); }
      const act = st.actReq, put = st.putReq; st.actReq = st.putReq = false;
      if (st.held) {                                                                                       // a crumb in his hand: eat it, or put it back
        text = 'E \u2014 eat it     Q \u2014 put it back'; st.uiAct = 'Eat'; st.uiDrop = true; st.uiDropLabel = 'Put back';
        if (act) { st.eaten++; const k = st.held; st.held = null; const mm = say(st.eaten === 1 ? 'Mm. Sorry. It was only a crumb.' : 'Mm.'); if (st.eaten >= 4) { st.busy = true; mm.then(() => say('That barely touched it... I’m still hungry.')).then(() => { st.loafReady = true; st.busy = false; }); } }
        else if (put) { st.held.o.visible = true; st.held = null; say('No. Better to leave it where it was.'); }
      } else {
        let best = null, bd = 1e9;
        for (const t of things) { if (t.kind === 'crumb' && !t.o.visible) continue; const dx = t.pos.x - st.pos.x, dz = t.pos.z - st.pos.z, d = Math.hypot(dx, dz); if (d < (t.kind === 'crumb' ? 1.7 : 3.4) * Hj && Math.abs(t.pos.y - st.y) < 1.4 * Hj && d < bd) { best = t; bd = d; } }
        if (best) {
          st.uiAct = best.kind === 'crumb' ? null : best.kind === 'loaf' ? (st.loafReady ? 'Take' : 'Look') : 'Look'; if (best.kind === 'crumb') { st.uiDrop = true; st.uiDropLabel = 'Pick up'; }
          text = best.kind === 'crumb' ? 'Q \u2014 pick up the crumb' : best.kind === 'loaf' ? (st.loafReady ? 'E \u2014 take a crumb of the loaf' : 'E \u2014 look at the loaf') : 'E \u2014 look';
          if (put && best.kind === 'crumb') { best.o.visible = false; st.held = best; if (!st.firstCrumb) { st.firstCrumb = true; say('Should I? It isn’t mine... it doesn’t belong to me.'); } }
          if (act) {
            if (best.kind === 'look') say(best.text);
            else if (best.kind === 'crumb') { best.o.visible = false; st.held = best; if (!st.firstCrumb) { st.firstCrumb = true; say('Should I? It isn’t mine... it doesn’t belong to me.'); } }
            else if (best.kind === 'loaf') {
              if (!st.loafReady) say(best.text);
              else if (!st.loafHes) { st.loafHes = true; say('Mother would say not to take what isn’t offered.'); }
              else if (!st.loafTaken) { st.loafTaken = true; say('Just one crumb. A loaf that size won’t miss it.'); }
              else say('I’ve had my crumb.');
            }
          }
        }
      }
      pr.textContent = text; pr.style.display = text ? 'block' : 'none';
    }
    function alarm() {
      st.alarm = true; st.shakeT = 1.4; A && A.thud && A.thud(0.8); say('What was that? Movement... above me.');
      later(3200, () => { A && A.thud && A.thud(0.9); st.shakeT = 1.0; say('Footsteps. Someone’s coming! I have to hide!'); $('cwObjt').textContent = 'Find somewhere to hide.'; $('cwObjt').style.display = 'block'; later(22000, gerdaScene); });
    }
    G.gerdaNamed = false;       // (to Jack she is the Giantess, until she gives her name)
    // ── Gerda, at full size: she opens the parlour door, circles the kitchen looking, and ends at the cupboard. Whatever she sees, she sees by line of sight. ──
    const GS = FULL, gst = { x: 0, z: 0, h: 0, ph: 0, walk: 0, bend: 0, reach: 0, look: 0, tilt: 0, sit: 0, y: 0 }, EYE = 41;
    const gsay = t => G.caption('gerda', t);
    function placeGerda() { gerda.root.position.set(gst.x, gst.y || 0, gst.z); gerda.root.rotation.y = gst.h; }
    function makeG(outfit) { gerda = root.Blocky.makeGerda(outfit || 'Fine'); gerda.root.scale.setScalar(GS); scene.add(gerda.root); gerda.after = r => { if (gst._o) { const q = gst._o; r.torso.rotation.y -= q.ty; r.torso.rotation.z -= q.tz; r.neck.rotation.y -= q.ny; r.neck.rotation.z -= q.nz; r.armL.rotation.z -= q.lz; r.armR.rotation.z -= q.rz; gst._o = null; }
      const w = Math.sin(gst.ph) * 0.62 * gst.walk; r.legL.thigh.rotation.x = w; r.legR.thigh.rotation.x = -w; r.armL.rotation.x = -w * 0.7; r.armR.rotation.x = w * 0.7 - gst.reach; r.torso.rotation.x = gst.bend; r.neck.rotation.x = gst.look - gst.bend * 0.6; r.neck.rotation.z = gst.tilt || 0; if (gst.sit > 0) { r.hips.position.y -= 6 * gst.sit; r.legL.thigh.rotation.x = r.legR.thigh.rotation.x = -1.5 * gst.sit; r.legL.knee.rotation.x = r.legR.knee.rotation.x = 1.5 * gst.sit; }
      const h = gst.hold || 0, HP = root.GerdaHold && root.GerdaHold.gerda; if (h > 0 && HP) { const L = (a, b) => a + (b - a) * h;                                  // holding Jack: the pose set in pose-editor.html (js/gerda-pose.js)
        r.hips.position.y -= HP.hipsY * h; r.torso.rotation.set(L(r.torso.rotation.x, HP.torsoX), L(0, HP.torsoY), L(0, HP.torsoZ)); r.neck.rotation.set(L(r.neck.rotation.x, HP.neckX), L(0, HP.neckY), 0);
        r.armR.rotation.set(L(r.armR.rotation.x, HP.armRx), 0, L(0, HP.armRz)); r.elbow.rotation.x = L(0, HP.elbowX); r.wrist.rotation.y = L(0, HP.wristY); r.armL.rotation.set(L(r.armL.rotation.x, HP.armLx), 0, L(0, HP.armLz));
        r.legL.thigh.rotation.x = L(w, HP.legLx) + w * h; r.legL.knee.rotation.x = L(0, HP.legLknee); r.legR.thigh.rotation.x = L(-w, HP.legRx) - w * h; r.legR.knee.rotation.x = L(0, HP.legRknee); }
      if (gst.nose > 0) { const k = gst.nose; r.armR.rotation.x += (gst.nA - r.armR.rotation.x) * k; r.armR.rotation.z += (gst.nZ - r.armR.rotation.z) * k; r.elbow.rotation.x += (gst.nE - r.elbow.rotation.x) * k; }                       // (she brings him up close to her face to smell him)
      if (gst.give > 0) { const k = gst.give, L2 = (a, b) => a + (b - a) * k; r.armR.rotation.x = L2(r.armR.rotation.x, gst.gArm === undefined ? -1.5 : gst.gArm); r.armR.rotation.z = L2(r.armR.rotation.z, 0.05); r.elbow.rotation.x = L2(r.elbow.rotation.x, -0.15); r.torso.rotation.x = L2(r.torso.rotation.x, gst.gTorso === undefined ? 0.5 : gst.gTorso); r.neck.rotation.x = L2(r.neck.rotation.x, 0.25); }
      if (gst.lreach > 0) r.armL.rotation.set(-gst.lreach, 0, 0.05 + (gst.lz || 0)); if (gst.p50 && gst.p50.w > 0) { const hq = gst.p50, w50 = hq.w, A_ = root.GerdaHold50[hq.a].gerda, B_ = root.GerdaHold50[hq.b].gerda, L5 = k => A_[k] + (B_[k] - A_[k]) * hq.t, M5 = (cur, to) => cur + (to - cur) * w50;
        r.hips.position.y -= L5('hipsY') * w50; r.torso.rotation.set(M5(r.torso.rotation.x, L5('torsoX')), M5(0, L5('torsoY')), M5(0, L5('torsoZ'))); r.neck.rotation.set(M5(r.neck.rotation.x, L5('neckX')), M5(0, L5('neckY')), r.neck.rotation.z);
        r.armR.rotation.set(M5(r.armR.rotation.x, L5('armRx')), 0, M5(0, L5('armRz'))); r.elbow.rotation.x = M5(r.elbow.rotation.x, L5('elbowX')); r.wrist.rotation.y = M5(0, L5('wristY')); r.armL.rotation.set(M5(r.armL.rotation.x, L5('armLx')), 0, M5(r.armL.rotation.z, L5('armLz')));
        r.legL.thigh.rotation.x = M5(r.legL.thigh.rotation.x, L5('legLx') + w); r.legL.knee.rotation.x = M5(r.legL.knee.rotation.x, L5('legLknee')); r.legR.thigh.rotation.x = M5(r.legR.thigh.rotation.x, L5('legRx') - w); r.legR.knee.rotation.x = M5(r.legR.knee.rotation.x, L5('legRknee')); }       // (the half-size poses: blended in by w, and from carrying to the knee by t)
      if (gst.headY) r.neck.rotation.y += gst.headY;       // (she turns her head to him)
      if (gst.kneel > 0) { const k = gst.kneel; for (const L of [r.legL, r.legR]) { L.thigh.rotation.x += (0.02 - L.thigh.rotation.x) * k; L.knee.rotation.x += (1.55 - L.knee.rotation.x) * k; } }       // (kneeling: the thighs upright, the shins along the floor behind)
      if (gst.seated > 0) { const k = gst.seated; r.hips.position.y -= 6 * k; r.legL.thigh.rotation.x += (-1.5 - r.legL.thigh.rotation.x) * k; r.legR.thigh.rotation.x += (-1.5 - r.legR.thigh.rotation.x) * k; r.legL.knee.rotation.x += (1.5 - r.legL.knee.rotation.x) * k; r.legR.knee.rotation.x += (1.5 - r.legR.knee.rotation.x) * k;       // (seated: thighs level, shins down, hands resting on her knees unless she is reaching)
        r.armL.rotation.x += (-0.1 - r.armL.rotation.x) * k; r.armL.rotation.z += (-0.15 - r.armL.rotation.z) * k; r.elbowL.rotation.x += (-1.45 - r.elbowL.rotation.x) * k; if (!(gst.reach > 0)) { r.armR.rotation.x += (-0.1 - r.armR.rotation.x) * k; r.armR.rotation.z += (0.15 - r.armR.rotation.z) * k; r.elbow.rotation.x += (-1.45 - r.elbow.rotation.x) * k; } }       // (hands in her lap)
      if (gst.sniff) r.neck.rotation.x += gst.sniff;
      if (gst.l2 > 0) { const k = gst.l2; r.torso.rotation.x += (gst.l2T - r.torso.rotation.x) * k; r.armL.rotation.x += (gst.l2X - r.armL.rotation.x) * k; r.armL.rotation.z += (gst.l2Z - r.armL.rotation.z) * k; r.neck.rotation.x += (gst.l2NX - r.neck.rotation.x) * k; r.neck.rotation.y += (gst.l2NY - r.neck.rotation.y) * k; }          // (leaning over the box, her free hand poised on its lid)
      if (gst.alive || st.scene) { const t = G.t, a = gst.alive || 1, tk = gst.talk || 0, ls = gst.listen || 0;                       // (she is not a statue: she breathes, shifts her weight, turns her head, talks with her free hand, and feels him wriggle: in the cutscenes, and small)
        const o = { ty: a * (0.025 * Math.sin(t * 0.55) + 0.015 * tk * Math.sin(t * 1.8)), tz: a * 0.012 * Math.sin(t * 0.8 + 1), ny: a * (0.04 * Math.sin(t * 0.63) + 0.02 * tk * Math.sin(t * 2.4)), nz: a * 0.015 * Math.sin(t * 0.7 + 2), lz: 0, rz: 0 };
        r.torso.rotation.x += a * 0.012 * Math.sin(t * 1.5); r.neck.rotation.x += a * (0.02 * Math.sin(t * 0.9 + 1) + 0.03 * tk * Math.sin(t * 3.2) + 0.08 * ls);
        if (!(gst.lreach > 0) && !(gst.seated > 0)) { r.armL.rotation.x += a * (0.03 * Math.sin(t * 1.3) - 0.18 * tk * (0.5 + 0.5 * Math.sin(t * 1.7))); o.lz = a * (0.03 + 0.08 * tk * (0.5 + 0.5 * Math.sin(t * 1.5 + 1))); }
        if (st.wriggle) { r.armR.rotation.x += a * 0.008 * Math.sin(t * 3.4); o.rz = a * 0.008 * Math.sin(t * 2.7 + 1); }
        r.torso.rotation.y += o.ty; r.torso.rotation.z += o.tz; r.neck.rotation.y += o.ny; r.neck.rotation.z += o.nz; r.armL.rotation.z += o.lz; r.armR.rotation.z += o.rz; gst._o = o;       // (what was added is taken off again at the start of the next frame, so that it never builds up)
        r.hips.rotation.y = a * 0.015 * Math.sin(t * 0.5 + 0.5); } }; placeGerda(); }
    const seen = () => {                                                                                    // does she see him? from her eyes to his head, chest and feet, through the boxes that stand between
      if (!gerda || st.caught) return st.caught; const Hj = HEIGHT * SC * st.s;
      if (gst.cupOpen && st.inCup && Math.hypot(st.pos.x - gst.x, st.pos.z - gst.z) < 60) return true;
      const ey = (EYE - gst.bend * 16) * GS / 1.4, ex = gst.x + Math.sin(gst.h) * 4, ez = gst.z + Math.cos(gst.h) * 4;
      for (const f of [0.85, 0.5, 0.12]) { const tx = st.pos.x, ty = st.y + f * Hj, tz = st.pos.z, dx = tx - ex, dy = ty - ey, dz = tz - ez, L = Math.hypot(dx, dy, dz); if (L > 170) continue;
        const cand = new Set(); for (let u = 0; u <= L; u += 6) for (const e of C.near(ex + dx * u / L, ez + dz * u / L, 7)) cand.add(e); cand.add(null);
        let clear = true; for (const e of cand) { if (!e || e.low || e.y1 - e.y0 < 0.5) continue;                      // an exact test of the sight line against each box that stands near it (a thin door cannot slip between samples)
          let t0 = 0, t1 = 1, hit = true; for (const [o0, d0, lo, hi] of [[ex, dx, e.x0, e.x1], [ey, dy, e.y0, e.y1], [ez, dz, e.z0, e.z1]]) { if (Math.abs(d0) < 1e-6) { if (o0 < lo || o0 > hi) { hit = false; break; } } else { let ta = (lo - o0) / d0, tb = (hi - o0) / d0; if (ta > tb) { const tt = ta; ta = tb; tb = tt; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { hit = false; break; } } }
          if (hit && t1 > 0.001 && t0 < 0.999) { clear = false; break; } }
        if (clear) return true; }
      return false; };
    async function gWalk(tx, tz, sp) {                                                                     // true if she arrives; false if she sees him on the way
      const dx = tx - gst.x, dz = tz - gst.z, d = Math.hypot(dx, dz), n = Math.max(2, Math.ceil(d / (sp * 0.04))), h1 = Math.atan2(dx, dz);
      for (let i = 1; i <= n; i++) { gst.h += angDiff(h1, gst.h) * 0.35; gst.x += dx / n; gst.z += dz / n; gst.ph += 0.42; gst.walk = 1; placeGerda(); if (seen()) { gst.walk = 0; return false; } await G.wait(0.04); }
      gst.walk = 0; return true; }
    async function gLook(secs, bend) { const n = Math.round(secs / 0.04); for (let i = 1; i <= n; i++) { const k = Math.sin(Math.PI * i / n); gst.bend = bend * Math.min(1, k * 2.2); gst.look = 0.25 * Math.sin(i * 0.2); placeGerda(); if (seen()) { gst.bend = bend; return false; } await G.wait(0.04); } gst.bend = 0; gst.look = 0; return true; }
    const quick = d => new Promise(r => setTimeout(r, d));
    let endN = 0;                                                                                           // (the ending's own beats, counted as scene-notes counts them: js/capture-cams.js holds the angles set there)
    const cutK = sp => { endN++; const C = root.CaptureCams, c = C && C.cams[endN]; if (!c) return cutIn(sp);
      let P = v(c.pos[0], c.pos[1], c.pos[2]), L = v(c.look[0], c.look[1], c.look[2]);
      if (endN <= C.relativeTo) { const d = gst.h - C.ref.h, co = Math.cos(d), si = Math.sin(d), mv = q => { const dx = q.x - C.ref.x, dz = q.z - C.ref.z; return v(gst.x + dx * co + dz * si, q.y, gst.z - dx * si + dz * co); }; P = mv(P); L = mv(L); }
      G.cut({ pos: P, look: L, fov: c.fov }); };
    const KIT = [93.5, 246, -107, 49, 84];                                                                  // the kitchen's walls and ceiling: a camera is never put outside them
    const cutIn = sp => { const p = sp.pos.clone(), l = sp.look; for (let i = 0; i < 40 && (p.x < KIT[0] || p.x > KIT[1] || p.z < KIT[2] || p.z > KIT[3] || p.y > KIT[4]); i++) p.lerp(l, 0.1); p.y = Math.max(p.y, 3); G.cut({ pos: p, look: sp.look, fov: sp.fov }); };
    if (story) { makeG(); gst.x = 268; gst.z = -75; gst.h = -Math.PI / 2; placeGerda(); }                   // she is in the parlour from the start, behind its shut doors
    const swing = d => { const a = Math.abs(d.openAng || 1.75), bx = new THREE.Box3(), r0 = d.lg.rotation.y; d.lg.rotation.y = a; d.og.updateMatrixWorld(true); bx.setFromObject(d.lg); const cx = (bx.min.x + bx.max.x) / 2; d.lg.rotation.y = r0; d.og.updateMatrixWorld(true); return cx < d.fixed ? a : -a; };   // which way the leaf swings to open into the kitchen (judged by where the leaf itself ends up, as the two leaves are hung opposite ways)
    async function gerdaScene() {
      if (st.scene || st.caught) return; const doors = M.doors.filter(d => d.axis === 'x' && Math.abs(d.fixed - 250) < 3 && Math.abs(d.c + 75) < 6);
      for (const d of doors) d.ang = swing(d);
      A && A.thud && A.thud(0.5); for (let i = 1; i <= 25; i++) { for (const d of doors) d.lg.rotation.y = d.ang * i / 25; await G.wait(0.04); }
      gsay('I can tell somebody’s here. I can feel it.');
      const route = [[238, -75], [214, -66], { say: 'Don’t think I won’t find you. Small things leave small marks.' }, [214, -8], { look: 1.6, bend: 0.8 }, [226, 22], [222, 38], { say: 'Come out, now. I’m not cross... yet.' }, [170, 38], [122, 24], { look: 1.4, bend: 0.7 }, [126, -6], [126, -66], { say: 'Only one place left.' }, [126, -92]];
      for (const r of route) { let ok = true; if (Array.isArray(r)) ok = await gWalk(r[0], r[1], 30); else if (r.say) gsay(r.say); else ok = await gLook(r.look, r.bend); if (!ok) return caught(); }
      // the cupboard
      gst.h = Math.PI / 2 * -1 + Math.PI; gst.h = -Math.PI / 2; placeGerda(); const cd = pantryG.userData.cupDoors; await G.wait(0.6);
      for (let i = 1; i <= 22; i++) { cd.dl.rotation.y = -1.7 * i / 22; cd.dr.rotation.y = 0.7 + 1.0 * i / 22; gst.bend = 0.5 * i / 22; placeGerda(); await G.wait(0.04); } gst.cupOpen = true;
      if (seen()) return caught();
      gsay('Nothing. Hm.'); await G.wait(1.6); gst.bend = 0; placeGerda(); gsay('I must be going soft.'); await G.wait(1.4);
      if (!(await gWalk(238, -75, 26)) ) return caught(); await gWalk(268, -75, 26); for (let i = 24; i >= 0; i--) { for (const d of doors) d.lg.rotation.y = d.ang * i / 24; await G.wait(0.04); }
      if (gerda) { scene.remove(gerda.root); }
      G.castleResult = 'hidden'; $('cwObjt').style.display = 'none'; $('cwObjt').textContent = 'She has gone.'; $('cwObjt').style.display = 'block'; await G.wait(2.5); await finish('hidden');
    }
    const gbody = (x, z) => !hitBody(x, z, 7, 4, 44), hitBody = (x, z, r, y0, y1) => { for (const e of C.near(x, z, r + 1)) { if (e.low || e.y1 <= y0 || e.y0 >= y1) continue; const cx = clamp(x, e.x0, e.x1), cz = clamp(z, e.z0, e.z1); if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < r * r) return true; } return false; };
    const gseg = (a1, b1) => { const n = Math.ceil(Math.hypot(b1[0] - a1[0], b1[1] - a1[1]) / 3); for (let i = 1; i <= n; i++) if (!gbody(a1[0] + (b1[0] - a1[0]) * i / n, a1[1] + (b1[1] - a1[1]) * i / n)) return false; return true; };
    function gnav(sx, sz, tx, tz) {                                                                          // her way across the kitchen without going through anything: a short search over a grid of floor she can stand on
      const S = [sx, sz], T = [tx, tz]; if (gseg(S, T)) return [T]; const nodes = [S, T]; for (let x = 100; x <= 238; x += 14) for (let z = -98; z <= 46; z += 14) if (gbody(x, z)) nodes.push([x, z]);
      const dist = new Array(nodes.length).fill(1e9), prev = new Array(nodes.length).fill(-1), done = new Array(nodes.length).fill(false); dist[0] = 0;
      for (let k = 0; k < nodes.length; k++) { let u = -1; for (let i = 0; i < nodes.length; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i; if (u < 0 || dist[u] >= 1e9) break; done[u] = true; if (u === 1) break;
        for (let i = 0; i < nodes.length; i++) if (!done[i]) { const d = Math.hypot(nodes[i][0] - nodes[u][0], nodes[i][1] - nodes[u][1]); if (dist[u] + d < dist[i] && d < 60 && gseg(nodes[u], nodes[i])) { dist[i] = dist[u] + d; prev[i] = u; } } }
      const out = []; let i = 1; while (i > 0) { out.unshift(nodes[i]); i = prev[i]; } return out.length && i === 0 ? out : [T]; }
    const gspeak = async (who, text) => { gst.talk = who === 'gerda' ? 1 : 0; gst.listen = who === 'jack' ? 1 : 0; await G.say(who, text); gst.talk = 0; gst.listen = 0; };
    async function ending(follow, cam) {
      gst.alive = 1;
      const jc = () => jackOut.torso.localToWorld(new V3(0, 6, 0)), hd = () => gerda.neck.localToWorld(new V3(0, 4, 0)), face = e => W.paintJack(jackOut, { expr: e });
      const fwd = () => new V3(Math.sin(gst.h), 0, Math.cos(gst.h)), side = f => new V3(f.z, 0, -f.x);
      const shotFace = () => { const h = hd(), j = jc(), f = fwd(), mid = h.clone().lerp(j, 0.5); cutK({ pos: mid.clone().add(f.clone().multiplyScalar(44)).add(side(f).multiplyScalar(9)).add(new V3(0, 3, 0)), look: mid, fov: 38 }); };      // (on Gerda, from in front and a little to one side, wide enough to have Jack in her fist in the frame)
      const shotJack = () => { const h = hd(), j = jc(), f = fwd(), s2 = side(f), sg = Math.sign(j.clone().sub(h).dot(s2)) || 1; cutK({ pos: h.clone().sub(f.clone().multiplyScalar(18)).add(s2.multiplyScalar(sg * 11)).add(new V3(0, 5, 0)), look: j.clone().add(new V3(0, 0.6, 0)), fov: 30 }); };      // (on Jack, from over her shoulder: behind her, on the side his hand is, so the line to him passes her shoulder and not her head)
      const shotBoxJack = () => { const f = fwd(), h = hd(), s2 = side(f); cutK({ pos: h.clone().sub(f.clone().multiplyScalar(10)).add(s2.multiplyScalar(8)).add(new V3(0, 2, 0)), look: bx.localToWorld(new V3(0, 2.4, 0.6)), fov: 26 }); };          // (and on him in the box, from over her shoulder)
      face(1);                                                                                              // wincing, whenever he is not speaking
      shotFace(); await gspeak('gerda', 'Well. Not so badly put together. A little wild at the edges. A little soft in the jaw.');
      await G.wait(0.4);
      { const o = gerda.neck.localToWorld(new V3(0, 2.5, 0)), hf = gerda.neck.localToWorld(new V3(0, 2.5, 1)).sub(o).normalize(), T = o.clone().add(hf.multiplyScalar(6.5)).add(new V3(0, -0.8, 0)), HP = root.GerdaHold.gerda, jn = new V3(); let b2 = null;      // (the least change of her arm that brings his head to just in front of her nose, wherever her own head is turned)
        for (let na = -1.9; na <= -0.8; na += 0.1) for (let ne = -2.0; ne <= -0.5; ne += 0.1) for (const nz of [-0.5, -0.3, -0.1, 0.1]) { gst.nA = na; gst.nE = ne; gst.nZ = nz; gst.nose = 1; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); jackOut.neck.getWorldPosition(jn); const e = jn.distanceTo(T) + 2 * (Math.abs(na - HP.armRx) + Math.abs(ne - HP.elbowX) + Math.abs(nz - HP.armRz)); if (!b2 || e < b2.e) b2 = { na, ne, nz, e }; }
        gst.nA = b2.na; gst.nE = b2.ne; gst.nZ = b2.nz; gst.nose = 0; placeGerda(); }
      for (let i = 1; i <= 16; i++) { gst.nose = i / 16; placeGerda(); await G.wait(0.04); }
      for (let i = 1; i <= 24; i++) { gst.sniff = 0.3 * Math.sin(Math.PI * i / 24); placeGerda(); await G.wait(0.04); } gst.sniff = 0;
      await gspeak('gerda', 'Sweat, and sap. And underneath it, something like home.');
      for (let i = 15; i >= 0; i--) { gst.nose = i / 16; placeGerda(); await G.wait(0.04); } gst.nose = 0;
      shotJack(); face(3); await gspeak('jack', '...'); face(1);
      shotFace(); await gspeak('gerda', 'Now then. What small creature walks into my kitchen and helps himself?');
      shotJack(); face(3); await gspeak('jack', 'I didn’t take a thing! I was only looking!'); face(1);
      shotFace(); await gspeak('gerda', 'Only looking. Of course you were. A curious little mouse.');
      shotJack(); face(3); await gspeak('jack', 'I’m no mouse! Put me down!'); face(1);
      shotFace(); await gspeak('gerda', 'No? Then a boy, perhaps.');
      shotJack(); face(2); await G.wait(0.5); await gspeak('jack', 'I’m a man.'); face(1); await G.wait(0.6);
      shotFace(); await gspeak('gerda', 'Are you. We’ll see.');
      // to the cupboard, with him in her hand
      const bx = M.items.keepsakeBox.g, box = bx.userData.box, tgt = new V3(114.5, 0, -92); const route = gnav(gst.x, gst.z, tgt.x, tgt.z);
      { const mx = (gst.x + tgt.x) / 2, mz = (gst.z + tgt.z) / 2, sp = Math.hypot(gst.x - tgt.x, gst.z - tgt.z); cutK({ pos: v(mx + 10, 62 + sp * 0.2, mz + 70 + sp * 0.3), look: v(mx, 22, mz), fov: 56 }); }                    // (the walk across the kitchen, from above and to the side)
      for (const [wx, wz] of route) { const x0 = gst.x, z0 = gst.z, d = Math.hypot(wx - x0, wz - z0), n = Math.max(2, Math.ceil(d / 1.2)), h1 = Math.atan2(wx - x0, wz - z0); for (let i = 1; i <= n; i++) { const k = i / n; gst.x = x0 + (wx - x0) * k; gst.z = z0 + (wz - z0) * k; gst.h += angDiff(h1, gst.h) * 0.3; gst.ph += 0.4; gst.walk = 1; placeGerda(); follow(); cam(); await G.wait(0.04); } }
      gst.walk = 0; for (let i = 0; i < 14; i++) { gst.h += angDiff(-Math.PI / 2, gst.h) * 0.3; placeGerda(); follow(); cam(); await G.wait(0.04); }
      // the least she need lean, and how high she need raise her arm, for her hand to be over the open box
      { const T = bx.localToWorld(new V3(0, 11, 0)); let bestG = null; gst.give = 1;
        for (let tq = 0; tq <= 0.6; tq += 0.05) for (let ar = -2.4; ar <= -0.7; ar += 0.1) { gst.gTorso = tq; gst.gArm = ar; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); const hp = gerda.wrist.localToWorld(new V3(0, -6, 0)), e = hp.distanceTo(T), hd2 = gerda.neck.localToWorld(new V3(0, 4, 0)); if (Math.hypot(hd2.x - T.x, hd2.z - T.z) < 15) continue; if (e < 4 && (!bestG || tq < bestG.tq - 1e-6 || (tq === bestG.tq && e < bestG.e))) bestG = { tq, ar, e }; }
        if (!bestG) { let m = 1e9; for (let tq = 0; tq <= 0.9; tq += 0.05) for (let ar = -2.6; ar <= -0.5; ar += 0.1) { gst.gTorso = tq; gst.gArm = ar; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); const e = gerda.wrist.localToWorld(new V3(0, -6, 0)).distanceTo(T), hd2 = gerda.neck.localToWorld(new V3(0, 4, 0)); if (Math.hypot(hd2.x - T.x, hd2.z - T.z) < 15) continue; if (e < m) { m = e; bestG = { tq, ar, e }; } } }
        if (!bestG) bestG = { tq: 0.3, ar: -1.5, e: 99 };
        gst.give = 0; gst.gTorso = bestG.tq; gst.gArm = bestG.ar; G.castleWalk.giveSolve = bestG; G.castleWalk.giveHead = (() => { const q = gerda.neck.localToWorld(new V3(0, 4, 0)); return [q.x, q.y, q.z, T.x, T.y, T.z]; })(); placeGerda(); }
      // she opens the box with her free hand
      cutK({ pos: bx.localToWorld(new V3(-26, 28, 24)), look: bx.localToWorld(new V3(10, 8, 0)), fov: 50 });
      for (let i = 1; i <= 20; i++) { const k = i / 20; gst.lreach = 1.3 * k; box.lid.rotation.x = -1.95 * k; placeGerda(); follow(); cam(); await G.wait(0.04); }
      // and gives him up to it: he is eased down and laid on the velvet
      for (let i = 1; i <= 18; i++) { gst.give = i / 18; placeGerda(); follow(); cam(); await G.wait(0.04); }
      st.wriggle = 0; bx.attach(jackOut.root); st.inHand = true; const p0 = jackOut.root.position.clone(), q0 = jackOut.root.quaternion.clone(), qL = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), pIn = new V3(0, 1.45, 1.4), pAbove = new V3(0, 4.2, 0.4);
      cutK({ pos: bx.localToWorld(new V3(-13, 15, 10)), look: bx.localToWorld(new V3(0, 3, 0)), fov: 42 });
      face(3); G.caption('jack', 'AAAAAAH—!'); if (A && A.voice) { A.voice(1.4, 5, 0, 1.4); setTimeout(() => A.voice(1.5, 5, 0, 1.4), 520); }                         // (he screams as she lowers him)
      const bs = jackOut.root.scale.x; for (let i = 1; i <= 26; i++) { const k = i / 26, e = k * k * (3 - 2 * k), up = Math.sin(Math.PI * k) * 0.0; const tgtP = k < 0.5 ? p0.clone().lerp(pAbove, k / 0.5) : pAbove.clone().lerp(pIn, (k - 0.5) / 0.5); jackOut.root.position.copy(tgtP); jackOut.root.quaternion.copy(q0).slerp(qL, e); gst.give = 1 - 0.35 * k; placeGerda(); follow(); await G.wait(0.04); }
      // beat 13: he sits up in the box; she leans over it with her free hand poised on its lid, ready to close it
      face(3); const qSit = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0)), pSit = new V3(0, 2.0, 0.5).sub(new V3(0, 12 * bs, 0).applyQuaternion(qSit));
      const sitUp = (async () => { for (let i = 1; i <= 34; i++) { const k = i / 34, e = k * k * (3 - 2 * k); jackOut.root.quaternion.copy(qL).slerp(qSit, e); jackOut.root.position.copy(pIn).lerp(pSit, e); st.sit = e; await G.wait(0.04); } })();
      const LA = -1.15;                                                                                    // (the lid is brought back to a little past upright for the hand to rest on, not left thrown right back)
      { box.lid.rotation.x = LA; box.lid.updateMatrixWorld(true); const T = box.lid.localToWorld(new V3(0, -0.3, 9.4)); box.lid.rotation.x = -1.95; box.lid.updateMatrixWorld(true); const cx = bx.localToWorld(new V3(0, 0, 0)), hd2 = new V3(); let b3 = null; gst.l2 = 1;
        for (let tq = 0.15; tq <= 0.7; tq += 0.07) for (let lx = -2.6; lx <= -0.6; lx += 0.15) for (const lz of [-0.2, 0, 0.2, 0.4]) { gst.l2T = tq; gst.l2X = lx; gst.l2Z = lz; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); gerda.neck.localToWorld(hd2.set(0, 4, 0)); const e = gerda.armL.localToWorld(new V3(0, -11, 0)).distanceTo(T) + 3 * Math.abs(tq - 0.4) + 1.5 * Math.max(0, 9 - Math.hypot(hd2.x - cx.x, hd2.z - cx.z)); if (!b3 || e < b3.e) b3 = { tq, lx, lz, e }; }
        if (!b3) b3 = { tq: 0.5, lx: -1.5, lz: 0, e: 99 }; gst.l2T = b3.tq; gst.l2X = b3.lx; gst.l2Z = b3.lz; G.castleWalk.lidSolve = b3;
        // and her head: turned and tipped so that she looks straight at him, where he will be sitting
        { const rp = jackOut.root.position.clone(), rq = jackOut.root.quaternion.clone(), sv = st.sit; jackOut.root.position.copy(pSit); jackOut.root.quaternion.copy(qSit); st.sit = 1; root.Blocky.step(jackOut, 0); bx.updateMatrixWorld(true); const J = new V3(); jackOut.neck.getWorldPosition(J); J.y += 0.8; jackOut.root.position.copy(rp); jackOut.root.quaternion.copy(rq); st.sit = sv;
          gst.l2 = 1; let bn = null; for (let nx = -0.3; nx <= 1.4; nx += 0.1) for (let ny = -1.1; ny <= 1.1; ny += 0.1) { gst.l2NX = nx; gst.l2NY = ny; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); const o = gerda.neck.localToWorld(new V3(0, 2.5, 0)), f = gerda.neck.localToWorld(new V3(0, 2.5, 1)).sub(o).normalize(), d = J.clone().sub(o).normalize(), c = f.dot(d); if (!bn || c > bn.c) bn = { nx, ny, c }; }
          gst.l2NX = bn.nx; gst.l2NY = bn.ny; G.castleWalk.lookSolve = bn; }
        gst.l2 = 0; placeGerda(); }
      for (let i = 1; i <= 24; i++) { gst.l2 = i / 24; gst.give = 0.65 - 0.4 * (i / 24); box.lid.rotation.x = -1.95 + (LA + 1.95) * (i / 24); placeGerda(); await G.wait(0.04); }
      cutK({ pos: bx.localToWorld(new V3(0, 3.6, -3.9)), look: hd().clone().add(new V3(0, 2, 0)), fov: 62 });                                          // (from behind him, in the box: her face looking down through the top)
      await gspeak('gerda', 'A magic stalk, a stranger’s house, a plate that was never yours. And you thought no one would notice.');
      await gspeak('gerda', 'That isn’t a man’s doing, little one. That’s mischief. And mischief gets put somewhere safe.'); await sitUp;
      shotBoxJack(); gerda.root.visible = false; face(3); await gspeak('jack', 'I’m not—');                        // (the last beat is his alone: she is not in it, though the lid still drops on its old timing)
      for (let i = 1; i <= 14; i++) { box.lid.rotation.x = LA * (1 - i / 14); gst.lreach = 1.3 * (1 - i / 14); gst.l2 = 1 - i / 14; placeGerda(); await G.wait(0.04); } A && A.thud && A.thud(0.4); await G.wait(1.2);
    }
    async function caught() {
      if (st.caught) return; st.caught = true; st.scene = true; G.mode = 'cutscene'; document.body.classList.add('cutscene'); $('cwPrompt').style.display = 'none'; $('cwObjt').style.display = 'none'; st.walkN = 0; st.cl = null; st.mant = null; st.vy = 0;
      const wasSkip = G.skipping; if (opts.capture) G.skipping = true;                                      // (in the capture, finding him and picking him up belong to the level: they are run through unseen, and the cutscene proper begins with her holding him)
      const wide = () => { if (opts.capture) return; const mx = (gst.x + st.pos.x) / 2, mz = (gst.z + st.pos.z) / 2, px = -(gst.z - st.pos.z), pz = gst.x - st.pos.x, pl = Math.hypot(px, pz) || 1, dd = Math.max(52, pl * 0.9); cutIn({ pos: v(mx + px / pl * dd, 58 + Math.max(0, dd - 52) * 0.4, mz + pz / pl * dd), look: v(mx, 26, mz), fov: 54 }); };      // (one angle per beat, from above the height of the table so nothing stands between; the scene-notes tool can then move it)
      const cam = () => {};
      const jx = st.pos.x, jz = st.pos.z, jy = st.y;
      st.heading = Math.atan2(gst.x - jx, gst.z - jz);                                                   // he freezes, and turns his face to her
      // Where she can stand and lean without any of her going into anything: her body on the floor, her torso over what is between, her arm down to him.
      const hit = (x, z, r, y0, y1, top) => { for (const e of C.near(x, z, r + 1)) { if (e.low || e.y1 <= y0 || e.y0 >= y1 || (top !== undefined && e.y1 <= top + 0.6)) continue; const cx = clamp(x, e.x0, e.x1), cz = clamp(z, e.z0, e.z1); if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < r * r) return true; } return false; };
      let stance = null;
      // how far from him she can stand and still reach: probed once per distance (her hand, over the grid of bends and reaches, at the height of his feet), so that she can stand clear of a table he is hiding on and lean over it
      const probe = D => { const sx0 = gst.x, sz0 = gst.z, sh0 = gst.h, sb0 = gst.bend, sr0 = gst.reach; gst.x = 0; gst.z = 0; gst.h = 0; let m = 1e9;
        for (let bd = 0; bd <= 1.4; bd += 0.1) for (let rc = 0.5; rc <= 2.0; rc += 0.15) { gst.bend = bd; gst.reach = rc; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); const hp = gerda.wrist.localToWorld(new V3(0, -6, 0)); m = Math.min(m, Math.abs(Math.hypot(hp.x, hp.z) - D) + Math.abs(hp.y - (jy + 2)) * 0.8); }
        gst.x = sx0; gst.z = sz0; gst.h = sh0; gst.bend = sb0; gst.reach = sr0; placeGerda(); return m; };
      const place = (D, a) => { const sx = jx + Math.cos(a) * D, sz = jz + Math.sin(a) * D; let ok = !hit(sx, sz, 7, 4, 44) && !hit(sx, sz, 7, 4, 44, jy);
        for (const t of [0.3, 0.6, 0.85]) { const lx = sx + (jx - sx) * t, lz = sz + (jz - sz) * t; if (hit(lx, lz, 3.6, jy + 12, jy + 36, jy)) ok = false; }
        if (hit(jx, jz, 2.6, jy + 0.9, jy + 12, jy)) ok = false;
        const n = Math.ceil(Math.hypot(sx - gst.x, sz - gst.z) / 3); for (let i = 1; i <= n && ok; i++) if (hit(gst.x + (sx - gst.x) * i / n, gst.z + (sz - gst.z) * i / n, 7, 4, 44, 0)) ok = false;
        return ok ? { sx, sz, D, d: Math.hypot(sx - gst.x, sz - gst.z) } : null; };
      const DS = [12, 16, 20, 24, 28, 32, 36, 40, 44], feas = DS.map(D => probe(D));
      for (const pass of [true, false]) { for (let i = 0; i < DS.length && !stance; i++) { if (pass && feas[i] > 3.5) continue; const cands = []; for (let k = 0; k < 24; k++) { const c = place(DS[i], k * Math.PI / 12); if (c) cands.push(c); } if (cands.length) { cands.sort((p1, p2) => p1.d - p2.d); stance = cands[0]; } } if (stance) break; }
      if (!stance) { const a = Math.atan2(gst.z - jz, gst.x - jx); stance = { sx: jx + Math.cos(a) * 27, sz: jz + Math.sin(a) * 27, D: 27 }; }
      const faceJ = Math.atan2(jx - stance.sx, jz - stance.sz);
      for (let i = 0; i < 14; i++) { gst.h += angDiff(Math.atan2(jx - gst.x, jz - gst.z), gst.h) * 0.3; placeGerda(); cam(); await G.wait(0.04); }
      wide(); gsay('There you are.'); await G.wait(0.6);
      { const x0 = gst.x, z0 = gst.z, n = Math.max(2, Math.ceil(Math.hypot(stance.sx - x0, stance.sz - z0) / 1.2)); for (let i = 1; i <= n; i++) { const k = i / n; gst.x = x0 + (stance.sx - x0) * k; gst.z = z0 + (stance.sz - z0) * k; gst.h += angDiff(i < n * 0.7 ? Math.atan2(stance.sx - x0, stance.sz - z0) : faceJ, gst.h) * 0.35; gst.ph += 0.42; gst.walk = 1; placeGerda(); cam(); await G.wait(0.04); } gst.walk = 0; gst.h = faceJ; }
      wide();
      // she leans only as far as her hand needs to meet him: the least bend (then reach) that puts her palm at his feet
      const handAt = (bd, rc) => { gst.bend = bd; gst.reach = rc; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); return gerda.wrist.localToWorld(new V3(0, -6, 0)); };
      let best = null; for (let bd = 0; bd <= 1.4; bd += 0.05) for (let rc = 0.5; rc <= 2.0; rc += 0.1) { const hp = handAt(bd, rc), e = Math.hypot(hp.x - jx, hp.z - jz) + Math.abs(hp.y - (jy + 2)) * 0.8; if (e < 3.2 && (!best || bd < best.bd - 1e-6 || (bd === best.bd && e < best.e))) best = { bd, rc, e }; }
      if (!best) { let m = 1e9; for (let bd = 0; bd <= 1.4; bd += 0.05) for (let rc = 0.5; rc <= 2.0; rc += 0.1) { const hp = handAt(bd, rc), e = Math.hypot(hp.x - jx, hp.z - jz) + Math.abs(hp.y - (jy + 2)) * 0.8; if (e < m) { m = e; best = { bd, rc, e }; } } }
      handAt(0, 0); const bendTo = best.bd, reachTo = best.rc;
      for (let i = 1; i <= 18; i++) { const k = i / 18; gst.bend = bendTo * k; gst.reach = reachTo * k; placeGerda(); cam(); await G.wait(0.04); }
      { const hp = handAt(bendTo, reachTo), x0 = st.pos.x, z0 = st.pos.z; for (let i = 1; i <= 6; i++) { const k = i / 6; st.pos.x = x0 + (hp.x - x0) * k; st.pos.z = z0 + (hp.z - z0) * k; placeGerda(); cam(); await G.wait(0.04); } }
      // the hand has him: he is fixed to her wrist from here, so he goes wherever her arm goes; she rises into the held pose
      gerda.root.updateMatrixWorld(true); { const wq = new THREE.Quaternion(), jq = new THREE.Quaternion(), wp = new V3(); gerda.wrist.getWorldQuaternion(wq); jackOut.root.getWorldQuaternion(jq); jackOut.root.getWorldPosition(wp);
        const lp = gerda.wrist.worldToLocal(wp.clone()), le = new THREE.Euler().setFromQuaternion(wq.clone().invert().multiply(jq), 'XYZ'), PJ = root.GerdaHold.jack, lerp = (a1, b1, k) => a1 + (b1 - a1) * k;
        gerda.wrist.add(jackOut.root); jackOut.root.scale.setScalar(SC * st.s / GS); st.inHand = true;
        const follow = () => { gerda.root.updateMatrixWorld(true); const wp2 = new V3(); jackOut.root.getWorldPosition(wp2); st.pos.set(wp2.x, 0, wp2.z); st.y = wp2.y; };
        for (let i = 1; i <= 30; i++) { const k = i / 30; gst.hold = k; gst.bend *= 0.96; gst.reach *= 0.96; jackOut.root.position.set(lerp(lp.x, PJ.px, k), lerp(lp.y, PJ.py, k), lerp(lp.z, PJ.pz, k)); jackOut.root.rotation.set(lerp(le.x, PJ.rx, k), lerp(le.y, PJ.ry, k), lerp(le.z, PJ.rz, k)); placeGerda(); follow(); cam(); await G.wait(0.04); }
        for (let i = 0; i < 6; i++) { jackOut.root.position.set(PJ.px, PJ.py, PJ.pz); jackOut.root.rotation.set(PJ.rx, PJ.ry, PJ.rz); placeGerda(); follow(); cam(); await G.wait(0.04); }
        st.wriggle = 1;                                                                                    // (he wriggles in her fist for as long as he is held)
        // before the scene proper, she steps back into the nearest open space, so that the cameras have room and nothing of hers goes into anything
        { const clear = (x, z) => !hit(x, z, 15, 4, 50, 0), pathOk = (x, z) => !hit(x, z, 8, 4, 50, 0); let sp = null, bd = 1e9;
          const front = (x, z, h) => { const fx = Math.sin(h), fz = Math.cos(h); for (const d of [12, 22, 32, 42, 52]) for (const l of [-16, 0, 16]) if (hit(x + fx * d + fz * l, z + fz * d - fx * l, 6, 4, 60, 0)) return false; return true; };      // (clear ground in front of her, where the cameras will be, as well as around her)
          for (let r = 0; r <= 110; r += 5) for (let k = 0; k < 36; k++) { const a2 = k * Math.PI / 18, x = gst.x + Math.cos(a2) * r, z = gst.z + Math.sin(a2) * r; if (!clear(x, z) || x < 100 || x > 236 || z < -100 || z > 44) continue;
            for (let m = 0; m < 16; m++) { const psi = m * Math.PI / 8; if (!front(x, z, psi)) continue; const cost = r + Math.abs(angDiff(psi, gst.h)) * 9; if (cost < bd) { bd = cost; sp = [x, z, psi]; } } }
          G.castleWalk.back = { from: [gst.x, gst.z], sp };
          if (sp) { gst.x = sp[0]; gst.z = sp[1]; gst.h = sp[2]; gst.walk = 0; placeGerda(); follow(); } }                // (the cutscene opens with her already in the open space: nothing of her walking there is seen)
        if (opts.capture) { root.Blocky.step(gerda, 0); root.Blocky.step(jackOut, 0); gerda.root.updateMatrixWorld(true); G.skipping = wasSkip; }       // (and from here it is seen)
        await ending(follow, cam); }
      await finish('caught');
    }
    async function finish(res) { A && A.stopMusic && A.stopMusic(2.2); G.castleResult = res; await G.fade(true, 2.2); await G.wait(0.3); cleanup(); G.mode = 'end'; document.body.classList.remove('cutscene'); resolve({ result: res }); }
    const tick = dt => {
      if ((st.scene && !st.wait) || st.caught) ui.show(false); else ui.show(true);
      if (st.scene) { const w = st.wait, pe = promptEl();       // (a playable cutscene: the camera stays where it is put, and the one button answers what she asks)
        if (w) { const q = w.key === 'q', hit = q ? st.putReq : st.actReq; pe.textContent = (q ? 'Q' : 'E') + ' \u2014 ' + w.label; pe.style.display = 'block'; st.uiAct = q ? null : w.label; st.uiDrop = q; st.uiDropLabel = q ? w.label : null;
          ui.set('act', q ? { label: 'Do', enabled: false } : { label: w.label, enabled: true }); ui.set('drop', { label: q ? w.label : 'Drop', enabled: q }); ui.set('jump', { label: 'Jump', icon: 'jump', enabled: false }); ui.set('run', { enabled: false }); ui.set('sneak', { enabled: false });
          if (hit || G.skipping) { st.wait = null; pe.style.display = 'none'; st.uiAct = null; st.uiDrop = false; w.res(); } }
        st.jumpReq = st.actReq = st.putReq = false; if (!st.inHand && !st.boxed) { jackOut.root.scale.setScalar(SC * st.s); jackOut.root.position.set(st.pos.x, st.y, st.pos.z); jackOut.root.rotation.y = st.heading; } return; }
      const s = st.s; if (Math.abs(s - nearS) > 0.02) { nearS = s; camera.near = Math.max(0.1, 0.3 * s); camera.updateProjectionMatrix(); }       // (a nearer near plane only as he is small: the depth buffer keeps its precision, so flat surfaces do not shimmer)
      const f = v(-Math.cos(st.camA), 0, -Math.sin(st.camA)), r = v(Math.sin(st.camA), 0, -Math.cos(st.camA));
      if (st.frozen) { keys.up = keys.down = keys.left = keys.right = false; keys.space = false; stick.x = stick.y = 0; st.jumpReq = false; }       // (being dressed: he does not move, or jump; the camera is still the player's)
      if (st.lockT > 0) { st.lockT -= dt; keys.up = keys.down = keys.left = keys.right = false; stick.x = stick.y = 0; st.heading += angDiff(st.lockH, st.heading) * Math.min(1, dt * 5); st.camA += angDiff(Math.atan2(-Math.cos(st.lockH), -Math.sin(st.lockH)), st.camA) * Math.min(1, dt * 3); st.pitch += (0.1 - st.pitch) * Math.min(1, dt * 3); }       // (the camera settles low behind him, so that what he has noticed is in view)
      const Hj = HEIGHT * SC * s, busy = !!(st.cl || st.mant);
      const dir = v(0, 0, 0).addScaledVector(f, (keys.up ? 1 : 0) - (keys.down ? 1 : 0)).addScaledVector(r, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
      if (Math.hypot(stick.x, stick.y) > 0.2) dir.addScaledVector(f, -stick.y).addScaledVector(r, stick.x);
      const edge = (x, z) => { if (st.cl || st.mant) return; let best = null;
        for (const e of C.near(x, z, Hj + 4)) { if (!e.wood || e.low || e.y1 >= st.y - 0.05 || e.y1 < st.y - 0.8 * Hj || e.y0 > st.y - 2 * Hj) continue; const qx = clamp(x, e.x0, e.x1), qz = clamp(z, e.z0, e.z1), d = Math.hypot(qx - x, qz - z); if (d > 0.9 * Hj) continue; if (!best || d < best.d) best = { e, qx, qz, d }; }
        if (!st.dropSaid) { st.dropSaid = true; G.caption('jack', best ? 'Too far to jump. But I could climb down that.' : 'Too far to jump. I\u2019d break my neck.'); }
        st.dropC = best && st.y <= st.standY + 0.5 * s ? { best, x, z, t: performance.now() } : null; };                       // (an edge he is pushing at, with wood he could climb down: the Climb button now offers it)
      const downReady = () => !!(st.dropC && !st.cl && !st.mant && performance.now() - st.dropC.t < 600);
      const startDown = () => { const c = st.dropC, best = c.best, x = c.x, z = c.z; st.dropC = null;
        let nx = x - best.qx, nz = z - best.qz; const nl = Math.hypot(nx, nz); if (nl < 0.01) { nx = Math.sin(st.heading); nz = Math.cos(st.heading); } else { nx /= nl; nz /= nl; }
        st.pos.x = best.qx + nx * 6.5 * s; st.pos.z = best.qz + nz * 6.5 * s; st.heading = Math.atan2(-nx, -nz); st.y = best.e.y1; st.cl = { e: best.e, down: true, top: best.e.y1 }; st.vy = 0; st.perch = null; st.stam = 1; return true; };
      if (busy) { st.walkN = 0; } else if (dir.lengthSq() > 0) {
        dir.normalize(); const want = Math.atan2(dir.x, dir.z); st.heading += angDiff(want, st.heading) * Math.min(1, dt * 9);
        const off = Math.abs(angDiff(want, st.heading)), ease = clamp(1 - off / Math.PI * 0.8, 0.2, 1), sp = (keys.run ? 50 : keys.sneak ? 11 : 26) * SC * Math.pow(s, 0.6) * ease, nx = st.pos.x + Math.sin(st.heading) * sp * dt, nz = st.pos.z + Math.cos(st.heading) * sp * dt;
        const dropBad = (x, z) => { if (st.standY === undefined || st.y < st.standY - 0.5 * s && st.vy < 0) return false; const lo = floorAt(x, z, st.y); if (lo >= st.standY - 2 * Hj) return false; edge(x, z); return true; };       // (never off anything more than twice his height: walking or leaping)
        if (!blockedAt(nx, st.pos.z, st.y) && !dropBad(nx, st.pos.z)) st.pos.x = nx; if (!st.cl && !blockedAt(st.pos.x, nz, st.y) && !dropBad(st.pos.x, nz)) st.pos.z = nz; st.walkN = 1; st.walkPh += 10.9 * Math.pow(s, -0.35) * 0.55 * dt * 1.4 * (keys.run ? 1.5 : keys.sneak ? 0.6 : 1);
      } else st.walkN = Math.max(0, st.walkN - dt * 6);
      if (story && !st.loaf && st.pos.x > 96 && st.pos.z > -109 && st.pos.z < 51) { st.loaf = true; st.lockT = 1.8; st.lockH = Math.atan2(175 - st.pos.x, -36 - st.pos.z); G.caption('jack', 'A loaf! A freshly baked loaf, right there on the table.'); setTimeout(() => G.caption('jack', 'It must be miles up... I wonder if I could climb to it.'), 3400); }
      if (story) { const near = st.pos.x < -82.5 && st.pos.z > -43 && st.pos.z < -8;                                   // (right up at the narrow corridor's doors, where the smell of bread comes through the gap)
        if (near && !st.inZone) { st.inZone = true;
          if (!st.bread) { st.bread = true; st.lockT = 3.0; st.lockH = Math.atan2(90 - st.pos.x, -25 - st.pos.z); G.caption('jack', 'Is that... warm bread?'); setTimeout(() => G.caption('jack', 'I can smell it from here. I haven\u2019t eaten since... I\u2019m starving.'), 3200); }
          else { if (performance.now() - (st.remindAt || 0) > 6000) { st.remindAt = performance.now(); G.caption('jack', 'Not that way. I’m starving, and that bread has to be somewhere close.'); } } }
        else if (!near) st.inZone = false; }
      if (story) storyTick(dt);
      if (ch3) ch3Tick(dt);
      const gy = floorAt(st.pos.x, st.pos.z, st.y), rj = 4 * s;
      if (!busy && !st.scene && st.y <= gy + 0.5 * s && blockedAt(st.pos.x, st.pos.z, st.y)) { let bd = 1e9, to = null; for (let r = 1; r <= 60; r += 1) { for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, x = st.pos.x + Math.cos(a) * r * s, z = st.pos.z + Math.sin(a) * r * s; if (!blockedAt(x, z, gy) && floorAt(x, z, gy) <= gy + 0.01 && r < bd) { bd = r; to = [x, z]; } } if (to) break; } if (to) { st.pos.x = to[0]; st.pos.z = to[1]; st.y = gy; } }       // (if he is ever wedged in something, as under a rung, he is put to the nearest clear spot)
      // Wood he can get his hands to: a short step up (to three quarters of his height) is a mantle; anything taller, a climb, which tires him fast (about a height and a half) unless there is a rung to rest on, and a rung or a top he can pull onto within one more height.
      const pointOn = (e, x, z) => [clamp(x, e.x0, e.x1), clamp(z, e.z0, e.z1)];
      const landingFor = e => { const mx = Math.min(rj * 0.8, (e.x1 - e.x0) / 2), mz = Math.min(rj * 0.8, (e.z1 - e.z0) / 2), x0 = e.x0 + mx, x1 = e.x1 - mx, z0 = e.z0 + mz, z1 = e.z1 - mz;
        let to = null, bd = 1e9; for (let i = 0; i <= 16; i++) for (let j = 0; j <= 16; j++) { const x = x0 + (x1 - x0) * i / 16, z = z0 + (z1 - z0) * j / 16; if (blockedAt(x, z, e.y1)) continue; const d = Math.hypot(x - st.pos.x, z - st.pos.z); if (d < bd) { bd = d; to = [x, z]; } }
        return to; };                                   // (the nearest spot of it that is clear of the wood above: the top of a leg that runs into the seat is no place to stand)
      const startMantle = (e, to) => { st.mant = { e, t: 0, dur: 0.85, from: { x: st.pos.x, y: st.y, z: st.pos.z }, to: { x: to[0], y: e.y1, z: to[1] } }; st.cl = null; st.vy = 0; };
      const findClimb = () => { const R = rj + 1.2 * s, fx = Math.sin(st.heading), fz = Math.cos(st.heading); let best = null;
        for (const e of C.near(st.pos.x, st.pos.z, R + 2)) { if (!e.wood || e.low || e.y1 <= st.y + 0.45 * Hj || e.y0 > st.y + 0.5 * Hj) continue; const [qx, qz] = pointOn(e, st.pos.x, st.pos.z), dx = qx - st.pos.x, dz = qz - st.pos.z, d = Math.hypot(dx, dz);
          if (d > R || (d > 0.01 && (dx * fx + dz * fz) / d < 0.2)) continue; if (!best || e.y1 > best.e.y1) best = { e, qx, qz, d }; }
        if (!best) return null; best.gap = best.e.y1 - st.y; return best.gap <= 0.5 * Hj ? null : best; };       // (what he could get his hands to just now, if anything)
      const tryClimb = () => { const best = findClimb(); if (!best) return false; const gap = best.gap, fx = Math.sin(st.heading), fz = Math.cos(st.heading); if (gap <= 0.75 * Hj) { const to = landingFor(best.e); if (to) { startMantle(best.e, to); return true; } }
        let nx = st.pos.x - best.qx, nz = st.pos.z - best.qz; const nl = Math.hypot(nx, nz); if (nl < 0.01) { nx = -fx; nz = -fz; } else { nx /= nl; nz /= nl; }
        st.pos.x = best.qx + nx * 6.5 * s; st.pos.z = best.qz + nz * 6.5 * s; st.heading = Math.atan2(-nx, -nz); st.cl = { e: best.e }; st.stam = 1; st.vy = 0; st.perch = null; return true; };
      if (st.jumpReq) { st.jumpReq = false; if (!busy && st.y <= gy + 0.01 && !(downReady() && startDown()) && !tryClimb()) { st.vy = 112 * s; st.perch = null; } }
      if (st.mant) { const m = st.mant; m.t += dt; const k = clamp(m.t / m.dur, 0, 1), rise = Math.max(m.from.y, m.to.y + 0.22 * Hj);                // (up the face to above the lip, then over the edge and down onto the top: the edge climbs as the leg did)
        if (k < 0.5) { const q = k / 0.5, e2 = q * q * (3 - 2 * q); st.pos.x = m.from.x; st.pos.z = m.from.z; st.y = m.from.y + (rise - m.from.y) * e2; }
        else { const q = (k - 0.5) / 0.5, e2 = q * q * (3 - 2 * q); st.pos.x = m.from.x + (m.to.x - m.from.x) * e2; st.pos.z = m.from.z + (m.to.z - m.from.z) * e2; st.y = rise + (m.to.y - rise) * e2; }
        if (k >= 1) { st.y = m.to.y; st.mant = null; st.vy = 0; st.stam = 1; st.perch = m.e && Math.min(m.e.x1 - m.e.x0, m.e.z1 - m.e.z0) < 20 * s ? m.e : null; } }
      else if (st.cl) {
        st.climbPh += dt * 9;
        if (st.cl.down) { st.y -= 0.8 * Hj * dt; let g = 0; for (const e of C.near(st.pos.x, st.pos.z, 3 * s + 2)) { if (e.y1 > st.cl.top - 0.01 || e.y1 <= g) continue; const cx = clamp(st.pos.x, e.x0, e.x1), cz = clamp(st.pos.z, e.z0, e.z1); if ((st.pos.x - cx) ** 2 + (st.pos.z - cz) ** 2 < (1.2 * s) ** 2) g = e.y1; } if (st.y <= g) { st.y = g; st.cl = null; st.vy = 0; } }
        else if (!keys.space || st.stam <= 0) { st.cl = null; }
        else { const sp = 0.8 * Hj; st.y += sp * dt; st.stam -= sp * dt / (1.6 * Hj); let plat = null;
          for (const e of C.near(st.pos.x, st.pos.z, 1.2 * Hj + 3)) { if (!e.wood || e.low || e.y1 <= st.y + 0.3 * Hj || e.y1 > st.y + 1.3 * Hj) continue; const [qx, qz] = pointOn(e, st.pos.x, st.pos.z); if (Math.hypot(qx - st.pos.x, qz - st.pos.z) > 0.8 * Hj) continue; if (!landingFor(e)) continue; if (!plat || e.y1 > plat.y1) plat = e; }
          if (plat) startMantle(plat, landingFor(plat)); }
      }
      if (!busy || (!st.cl && !st.mant)) {
        if (st.vy <= 0 && st.y <= gy + 0.4 * s && !st.cl && !st.mant) { st.y += (gy - st.y) * Math.min(1, dt * 22); st.vy = 0; } else if (!st.cl && !st.mant) { st.vy -= 420 * s * dt; st.y += st.vy * dt; if (st.y < gy) { st.y = gy; st.vy = 0; } else if (st.vy > 0 && blockedAt(st.pos.x, st.pos.z, st.y)) st.vy = 0; }
      }
      if (!st.cl && !st.mant && st.vy <= 0 && st.y <= gy + 0.05 * s + 0.01) st.standY = gy;
      { const cb = !busy && st.y <= gy + 0.01 ? findClimb() : null;
        if (cb && !st.scene) root.Tips.once('castle-climb', () => toast('Space climbs the wood: hold it to keep going.', 5000));
        if (st.cl) ui.set('jump', { label: 'Climb', icon: 'climb', enabled: true }); else if (st.mant) ui.set('jump', { label: 'Climb', icon: 'climb', enabled: false });
        else if (!cb && !busy && st.y <= gy + 0.01 && downReady()) ui.set('jump', { label: 'Climb', icon: 'climb', enabled: true });
        else if (cb) ui.set('jump', cb.gap <= 0.75 * Hj ? { label: 'Pull up', icon: 'pull', enabled: true } : { label: 'Climb', icon: 'climb', enabled: true });
        else ui.set('jump', { label: 'Jump', icon: 'jump', enabled: st.y <= gy + 0.01 });
        ui.set('act', st.uiAct ? { label: st.uiAct, enabled: true } : { label: 'Do', enabled: false }); ui.set('drop', { label: st.uiDropLabel || (st.held ? 'Put back' : 'Drop'), enabled: !!st.uiDrop }); }
      if (st.frozen && !st.scene) { ui.set('jump', { label: 'Jump', icon: 'jump', enabled: false }); ui.set('drop', { label: 'Drop', enabled: false }); ui.set('run', { enabled: false }); ui.set('sneak', { enabled: false }); }
      if ((st.frozen || st.seated) && st.fz) { st.y = st.fz.y; st.vy = 0; st.standY = st.fz.y; st.pos.x = st.fz.x; st.pos.z = st.fz.z; }       // (being dressed: he stands where he was put, on the table, whatever is under him)
      st.air = !st.cl && !st.mant && (st.vy > 1 || st.y > gy + 0.5 * s); if (!st.air && !st.cl && !st.mant) st.stam = 1;
      $('cwStamW').style.display = st.cl ? 'block' : 'none'; $('cwStam').style.width = Math.max(0, st.stam * 100) + '%';
      jackOut.root.scale.setScalar(SC * s); jackOut.root.position.set(st.pos.x, st.y, st.pos.z); jackOut.root.rotation.y = st.heading;
      if (st.toastAt && performance.now() > st.toastAt) { $('cwToast').style.opacity = 0; st.toastAt = 0; }
      // the camera: behind him (never snapping back), or through his eyes
      if (st.fp) {
        const eye = v(st.pos.x, st.y + 27 * SC * s, st.pos.z), d = v(-Math.cos(st.camA) * Math.cos(st.fpPitch), -Math.sin(st.fpPitch), -Math.sin(st.camA) * Math.cos(st.fpPitch));
        camPos.copy(eye).addScaledVector(d, -0.01); camLook.copy(eye).addScaledVector(d, 10); G.cut({ pos: camPos, look: camLook, fov: 72 });
      } else {
        const d = ZOOMS[st.zoom].d * s, at = v(st.pos.x, st.y + 15 * SC * s, st.pos.z), dirv = v(Math.cos(st.camA) * Math.cos(st.pitch), Math.sin(st.pitch), Math.sin(st.camA) * Math.cos(st.pitch));
        let reach = d, p = v(0, 0, 0); for (let u = 4 * s; u <= d; u += Math.max(1, 2 * s)) { p.copy(at).addScaledVector(dirv, u); p.y = Math.max(p.y, 1.2 * s); if (camBlocked(p, s)) { reach = Math.max(4 * s, u - 3 * s); break; } }
        const want = at.clone().addScaledVector(dirv, reach); want.y = Math.max(want.y, 1.2 * s);
        { let rm = null; for (const r of M.rooms || []) if (st.pos.x > r.x0 && st.pos.x < r.x1 && st.pos.z > r.z0 && st.pos.z < r.z1 && (!rm || (r.x1 - r.x0) * (r.z1 - r.z0) < (rm.x1 - rm.x0) * (rm.z1 - rm.z0))) rm = r;
          if (rm) { want.x = clamp(want.x, rm.x0 + 3, rm.x1 - 3); want.z = clamp(want.z, rm.z0 + 3, rm.z1 - 3); want.y = Math.min(want.y, rm.h - 9); } }       // (the camera never leaves the room he is in: its walls, and its ceiling)                       // (the camera slides along the floor, never below it, and tilts up to take in the ceiling)
        if (camPos.lengthSq() === 0) camPos.copy(want); else camPos.lerp(want, Math.min(1, dt * 10)); camLook.copy(at); camLook.y += Math.max(0, -st.pitch) * d * 0.9; let cp = camPos; if (st.shakeT > 0) { st.shakeT -= dt; cp = camPos.clone(); cp.x += (Math.random() - 0.5) * 0.6 * s; cp.y += (Math.random() - 0.5) * 0.6 * s; } G.cut({ pos: cp, look: camLook, fov: 48 });
      }
    };
    const cleanup = () => { if (jackOut.root.parent !== scene) { scene.add(jackOut.root); st.inHand = false; } root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); el.removeEventListener('wheel', wheel); el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); G.updaters = G.updaters.filter(u => u !== tick); hud.remove(); css.remove(); ui.destroy(); jackOut.after = null; jackOut.root.scale.setScalar(SC); jackOut.root.visible = true; camera.near = nearOld; camera.updateProjectionMatrix(); };
    if (!opts.capture && A && A.ctx) { A.startMusic({ theme: 'castle' }); A.duckMusic(0.7, 3); }
    G.updaters.push(tick); G.castleWalk = { st, cleanup, resolve, C, M, gst };
    if (opts.capture) {                                                                                      // the capture, on its own (for scene-notes.html): Jack is hiding in the cupboard, and Gerda has just opened its doors
      if (G.seekTo == null) G.skipping = false;                                                            // (a 'Skip scene' pressed in an earlier scene must not carry over and skip this one)
      const cd = pantryG.userData.cupDoors; cd.dl.rotation.y = -1.7; cd.dr.rotation.y = 1.7; st.inCup = true;
      st.pos.set(98, 0, -84); st.y = 0; st.scene = true; G.mode = 'cutscene'; $('cwPanel').style.display = 'none'; st.alarm = true; st.heading = Math.PI / 2;
      gst.x = 126; gst.z = -92; gst.h = -Math.PI / 2; gst.bend = 0.5; gst.cupOpen = true; placeGerda(); jackOut.root.scale.setScalar(SC * st.s); jackOut.root.position.set(st.pos.x, 0, st.pos.z); jackOut.root.rotation.y = st.heading; $('fade').style.transition = ''; G.fade(false, 0.8); await caught(); return; }

    // ── Chapter Three: The Measure of a Man. It opens in the kitchen: Jack in the box on the table, at a quarter of his size, and Gerda in her work clothes. ──
    const ch3Items = { clothes: null };
    const zoneSeen = {}, zoneIn = {}, zoneN = {}; let lastRemark = 0;
    const ZONES = {
      door: { in: p => p.z > 90 && Math.abs(p.x) < 30, first: ['That’s the crack I came in by. I’d never squeeze through it now.', 'And I can’t go home with nothing to show for it. Mother’s been frantic since morning, and I know what waits for a son who comes back empty-handed.'], again: ['Maybe there’s another way out.', 'There has to be some other way out of here.', 'Still too big for it. Another way, then.'] },
      nursery: { in: p => p.x > -312 && p.x < -100 && p.z > -292 && p.z < -192, first: ['A nursery. A real one, with a cot and a rocking horse and a whole shelf of toys.', 'I don’t know what to make of it. Where I come from, a toy is a stick and a good imagination.', 'It’s very quiet. It feels like a room that’s waiting for someone.'], again: [] },
    };
    // ── The exploration: he may look at what he passes, he grows a little along the narrow corridor, and the nursery ends it. ──
    const c3 = { looks: {}, nL: 0, shift: false, g1: false, g2: false, done: false, targets: [], grow: 0.25 };
    const LK = {
      urn: { name: 'urn', r: 17, keys: ['urn1', 'urn2', 'urn3', 'urn4', 'urn5', 'urn6'], lines: ['Taller than I am, and carved all round with something I can’t read. Whatever it holds, it isn’t going home in my pockets.', 'Another. They stand in a row like mourners. I wonder who she keeps in them.', 'Cold stone, thick as a church bell and about as portable. Nothing here for the taking.', 'Not a scratch on it. Somebody dusts these, and it isn’t me.', 'If I were sensible I’d be looking for a door, not for pots.', 'Cold, and quiet. A person could grow old in a corridor like this and never be missed.'] },
      cabinet: { name: 'cabinet', r: 21, keys: ['cabinet1', 'cabinet2', 'cabinet3', 'cabinet4'], lines: ['Carved all over with little scenes: a river, a hunter, a woman with a basket. Shut tight, and I’d not know what to do with what’s inside.', 'Brass handles, level with my chin. I could pull one. But what would I carry out of a drawer that size?', 'Every cabinet in this house is shut. Plates, probably. Plates and secrets.', 'Beautiful work. Mother would say the wood alone could feed us a winter. And Mother would be right, and it still wouldn’t fit through the crack.'] },
      harp: { name: 'harp', r: 20, keys: ['harp1', 'harp2', 'harp3'], lines: ['A harp, and gold from top to bottom. Nobody could carry that out of here, least of all a boy my size. It’s only music, anyway.', 'I’ve only ever heard a fiddle, at the fair. I wonder what a thing like this sounds like when someone plays it.', 'Her fingers must be as long as my arm. Odd, to think of her playing something so fine.'] },
      flute: { name: 'flutes', r: 24, keys: ['fluteRack'], lines: ['Flutes, in a row, gold and silver. A boy could charm a rat out of its hole with one of those. It’s not a way out, though.', 'Somebody once played these. The rack has the shine of hands on it.'] },
      doll: { name: 'dollhouse', r: 24, nursery: true, keys: ['dollhouse'], lines: ['A house, with a roof and a proper door. A door a person could walk through. A person my size. Everything else here is built for giants.', 'The little windows are painted in. Somebody took such care with it, and then it was left to break.'] },
      horse: { name: 'rocking horse', r: 20, nursery: true, keys: ['horse1'], lines: ['A wooden horse, and the saddle sits just where I’d need it. Who builds a giant’s castle and then a horse like this?', 'The paint’s rubbed off its ears, where small hands held on. It was loved, this one.'] },
      toys: { name: 'toys', r: 14, nursery: true, keys: ['toys'], lines: ['Blocks, a ball, a top. Worn smooth. Somebody played with these, and played a great deal.', 'A top. I never had one. Father meant to carve me one, once.'] },
      table: { name: 'little table', r: 13, nursery: true, keys: ['nurseryTable'], lines: ['A table no higher than my chest. Somebody sat here and drew, or took their supper. A small somebody.', 'There’s a ring on it where a cup stood. Somebody was told, I expect, to use a coaster.'] },
      chair: { name: 'little chair', r: 9, nursery: true, keys: ['nurseryChairS'], lines: ['A chair for someone my size. I could sit in it. I’m not sure I should.'] },
      chest: { name: 'chest', r: 21, special: true, keys: ['chest'], lines: [] },
    };
    for (const cat in LK) LK[cat].keys.forEach((k, i) => { if (M.items[k]) c3.targets.push({ k, cat, i, g: M.items[k].g }); });
    async function doLook(t) {
      if (t.cat === 'chest') { await chestScene(); return; }
      st.busy = true;                                                                          // (he speaks as he stands or walks: no snapping of the camera, no hold on his movement)
      const n = c3.looks[t.k] || 0; c3.looks[t.k] = n + 1; const L = LK[t.cat].lines; await say(L[(t.i + n) % L.length]);
      if (LK[t.cat].nursery && n === 0) { c3.nL++; if (c3.nL === 2 && !c3.shift) { c3.shift = true; await say('I came in here looking for something worth carrying home.'); await say('I haven’t thought about that in five minutes. I only want to know whose all this was.'); } }
      st.busy = false;
    }
    // the chest: he opens it, finds what is inside, reads the first page, and drops the book. Gerda is in the doorway.
    async function chestScene() {
      const ch = M.items.chest.g, K = ch.userData.chest, Hj = HEIGHT * SC * st.s, ease = k => k * k * (3 - 2 * k), W3 = (a, b, k) => a + (b - a) * k;
      c3.done = true; st.busy = true; st.scene = true; G.mode = 'cutscene'; document.body.classList.add('cutscene'); st.lockT = 0; st.walkN = 0; $('cwPrompt').style.display = 'none'; $('cwPage').classList.remove('on');
      const P = ch.localToWorld(new V3(0, 0, 11.5)), C0 = ch.localToWorld(new V3(0, 0, 0)), hh = Math.PI / 2;
      G.cut({ pos: v(P.x - 20, 14, P.z - 28), look: v(C0.x - 3, 4, C0.z), fov: 40 });
      { const x0 = st.pos.x, z0 = st.pos.z, h0 = st.heading, n = 24; for (let i = 1; i <= n; i++) { const k = ease(i / n); st.pos.x = W3(x0, P.x, k); st.pos.z = W3(z0, P.z, k); st.heading = h0 + angDiff(hh, h0) * k; st.walkN = 1; st.walkPh += 0.5; await G.wait(0.04); } st.walkN = 0; st.heading = hh; }
      st.pose = { armLx: -0.15, armLz: 0.3, armRx: -0.15, armRz: -0.3, torso: 0, neckX: 0, neckY: 0 };
      await sayW('jack', 'A chest. No lock on it, no key. Nothing to say it isn’t for opening.');
      for (let i = 1; i <= 14; i++) { const k = ease(i / 14); st.pose.armLx = st.pose.armRx = W3(-0.15, -1.7, k); st.pose.neckX = -0.15 * k; await G.wait(0.04); }
      A && A.thud && A.thud(0.15);
      for (let i = 1; i <= 34; i++) { const k = ease(i / 34); K.lid.rotation.x = -1.95 * k; st.pose.armLx = st.pose.armRx = W3(-1.7, -2.5, Math.min(1, k * 1.6)); await G.wait(0.04); }
      for (let i = 1; i <= 12; i++) { const k = ease(i / 12); st.pose.armLx = st.pose.armRx = W3(-2.5, -0.5, k); st.pose.neckX = W3(-0.15, 0.55, k); await G.wait(0.04); }
      const at3 = o => ch.localToWorld(new V3(...o));
      G.cut({ pos: v(C0.x - 12, 12, C0.z - 8), look: v(C0.x, 3, C0.z), fov: 46 });
      await sayW('jack', 'Clothes. Folded and put away with care.');
      await sayW('jack', 'And they get smaller as they go: a man’s shirt, a boy’s, a little one’s, a baby’s.');
      await sayW('jack', 'Someone kept every size.');
      { const bp = K.brush.getWorldPosition(new V3()); G.cut({ pos: v(bp.x - 1.8, bp.y + 11.3, bp.z + 10.7), look: bp, fov: 40 }); }
      await sayW('jack', 'A hairbrush. A tiny one, with a handle worn pale where a thumb has held it.');
      { const bp = K.book.getWorldPosition(new V3()); G.cut({ pos: v(bp.x - 3, bp.y + 14, bp.z - 5), look: bp, fov: 40 }); }
      await sayW('jack', 'And a book.');
      // he takes the book up, and opens it
      scene.attach(K.book); const b0 = K.book.position.clone(), q0 = K.book.quaternion.clone(), qT = new THREE.Quaternion().setFromAxisAngle(v(0, 0, 1), 0.7).multiply(q0), H = v(P.x + 2.4, 0.56 * Hj, P.z - 0.4);
      G.cut({ pos: v(P.x - 3, 0.85 * Hj, P.z - 17), look: v(P.x + 1.5, 0.55 * Hj, P.z - 0.2), fov: 38 });
      for (let i = 1; i <= 24; i++) { const k = ease(i / 24); K.book.position.set(W3(b0.x, H.x, k), W3(b0.y, H.y, k) + Math.sin(k * Math.PI) * 2.2, W3(b0.z, H.z, k)); K.book.quaternion.copy(q0).slerp(qT, k); st.pose.armLx = st.pose.armRx = W3(-0.5, -1.1, k); st.pose.armLz = W3(0.3, 0.08, k); st.pose.armRz = W3(-0.3, -0.08, k); st.pose.neckX = W3(0.55, 0.45, k); await G.wait(0.04); }
      await G.wait(0.3);
      { const x0 = st.pos.x, hx0 = H.x; for (let i = 1; i <= 18; i++) { const k = ease(i / 18); st.pos.x = x0 - 4.6 * k; K.book.position.x = hx0 - 4.6 * k; st.walkN = 0.6; st.walkPh -= 0.3; await G.wait(0.04); } st.walkN = 0; H.x = hx0 - 4.6; }       // (a step back from the chest, with the book, before he opens it: it stays clear of the wall)
      await G.wait(0.3);
      for (let i = 1; i <= 26; i++) { K.cov.rotation.z = 2.9 * ease(i / 26); await G.wait(0.04); }
      A && A.blip && A.blip(); await G.wait(0.5);
      $('cwPage').classList.add('on'); await G.wait(3.4);
      // the first page. He lets it go at once.
      $('cwPage').classList.remove('on'); await G.wait(0.15);
      { const y0 = K.book.position.y, x0 = K.book.position.x, q1 = K.book.quaternion.clone(), qEnd = new THREE.Quaternion().setFromAxisAngle(v(0, 1, 0), 0.7); let vy = 0, y = y0;     // (it lands flat, face up, on the floor)
        for (let i = 1; i <= 18; i++) { vy -= 90 * 0.04; y = Math.max(0.5, y + vy * 0.04); K.book.position.y = y; K.book.position.x = x0 + 0.05 * i; K.book.quaternion.copy(q1).slerp(qEnd, Math.min(1, i / 12)); st.pose.armLx = st.pose.armRx = W3(-1.1, -0.2, Math.min(1, i / 6)); st.pose.armLz = W3(0.08, 0.7, Math.min(1, i / 6)); st.pose.armRz = W3(-0.08, -0.7, Math.min(1, i / 6)); st.pose.neckX = W3(0.45, -0.1, Math.min(1, i / 8)); await G.wait(0.04); }
        K.book.position.y = 0.5; K.book.quaternion.copy(qEnd); }
      A && A.thud && A.thud(0.5);
      { const x0 = st.pos.x; for (let i = 1; i <= 14; i++) { const k = ease(i / 14); st.pos.x = x0 - 2.2 * k; st.walkN = 0.6; st.walkPh -= 0.3; await G.wait(0.04); } st.walkN = 0; }
      await G.wait(0.9);
      // and in the room, Gerda
      gerda.root.visible = true; gst.x = -238; gst.z = -192; gst.h = Math.atan2(st.pos.x - gst.x, st.pos.z - gst.z); gst.walk = 0; gst.bend = 0; gst.tilt = 0; gst.sit = 0; gst.y = 0; placeGerda(); gerda.root.updateMatrixWorld(true);       // (further into the room than the doorway, and facing him)
      A && A.thud && A.thud(0.7);
      G.cut({ pos: v(C0.x - 3, 8.1, C0.z + 3.6), look: v(-305.6, 26.6, -203.6), fov: 54 });       // (from the chest, over Jack, down the room to her)
      // her line, and the walk that brings her closer (she is already walking as the line begins); he spins to face her
      const gwalk = async (wx, wz, spd, onStep) => { const x0 = gst.x, z0 = gst.z, d = Math.hypot(wx - x0, wz - z0), n = Math.max(2, Math.ceil(d / (spd || 1.2))); for (let i = 1; i <= n; i++) { const k = i / n, h1 = Math.atan2(wx - gst.x, wz - gst.z); gst.x = x0 + (wx - x0) * k; gst.z = z0 + (wz - z0) * k; gst.h += angDiff(h1, gst.h) * 0.3; gst.ph += 0.4; gst.walk = 1; placeGerda(); onStep && onStep(); await G.wait(0.04); } gst.walk = 0; };
      const faceJ = () => { gst.h = Math.atan2(st.pos.x - gst.x, st.pos.z - gst.z); placeGerda(); };
      const dirGJ = () => { const dx = gst.x - st.pos.x, dz = gst.z - st.pos.z, d = Math.hypot(dx, dz) || 1; return [dx / d, dz / d]; };
      const shotG = (dy, dx, dz) => G.cut({ pos: v(st.pos.x + (dx || 10), dy || 3.4, st.pos.z - (dz || 6.5)), look: v(gst.x + 0.3, 30.8, gst.z + 3), fov: 42 });      // (on Gerda, low, from just behind Jack: looking up at her)
      const shotJ = () => G.cut({ pos: v(st.pos.x - 41, 44, st.pos.z - 27), look: v(st.pos.x, 8, st.pos.z), fov: 38 });      // (on Jack, from high behind her)
      const shotSweep = () => G.cut({ pos: v(st.pos.x - 7, 52, st.pos.z - 50), look: v(st.pos.x - 8, 20, st.pos.z - 5), fov: 44 });
      const tx = st.pos.x - 27, tz = st.pos.z - 3, camHere = G.shotNow().pos, come = gwalk(tx, tz, 1.3, () => { if (!(G.camOverride && G.camOverride(G.beat))) G.cutNow({ pos: camHere, look: v(gst.x, 38, gst.z), fov: 54 }); });       // (the camera pans up and across to keep her head in frame as she comes)
      const gline = t => sayW('gerda', t), jline = t => sayW('jack', t);
      const spinTo = async () => { const h0 = st.heading, h1 = Math.atan2(gst.x - st.pos.x, gst.z - st.pos.z); for (let i = 1; i <= 10; i++) { st.heading = h0 + angDiff(h1, h0) * ease(i / 10); st.pose.armLz = 0.5 * ease(i / 10); st.pose.armRz = -0.5 * ease(i / 10); await G.wait(0.04); } };
      const headTo = (to, n) => { const from = st.pose.neckX || 0, m = n || 14; return (async () => { for (let i = 1; i <= m; i++) { st.pose.neckX = W3(from, to, ease(i / m)); await G.wait(0.04); } })(); };       // (his head moves, and does not snap)
      await G.wait(1.3); await gline('Curiosity again.'); await G.wait(0.2); spinTo(); await come; faceJ(); gst.look = 0.35; headTo(-0.45);       // (she looks down at him, and he looks up at her)
      shotJ(); W.paintJack(jackOut, { expr: 4 }); await jline('I wasn’t stealing!');
      shotG(); for (let i = 1; i <= 10; i++) { gst.tilt = 0.32 * ease(i / 10); faceJ(); await G.wait(0.04); } await gline('No? Only looking, I’m sure.');
      shotJ(); { const x0 = st.pos.x, z0 = st.pos.z, [ux, uz] = dirGJ(); for (let i = 1; i <= 8; i++) { const k = ease(i / 8); st.pos.x = x0 - ux * 3 * k; st.pos.z = z0 - uz * 3 * k; st.walkN = 0.5; st.walkPh -= 0.3; st.pose.torso = 0.08 * k; st.pose.armLz = W3(0.5, 0.15, k); st.pose.armRz = W3(-0.5, -0.15, k); await G.wait(0.04); } st.walkN = 0; }
      await jline('I didn’t touch anything.');
      shotSweep(); for (let i = 1; i <= 8; i++) { gst.look = W3(0.35, 0.8, ease(i / 8)); st.pose.neckX = W3(-0.45, 0.5, ease(i / 8)); faceJ(); await G.wait(0.04); } await G.wait(0.9);       // (they both look down at the book)      // (her eyes sweep down to the book on the floor)
      shotJ(); headTo(-0.45); W.paintJack(jackOut, { expr: 3 }); await jline('You can’t just sneak up on me.');
      shotG(6.4, 9, 6.6); for (let i = 1; i <= 6; i++) { gst.look = W3(0.8, 0.35, ease(i / 6)); await G.wait(0.04); } await gline('Can’t I?');
      await gline('You’re in my house, little climber. Why?');
      // the questions: the truth, or a lie she sees through; after three lies only the truth is left
      const TRUTH = 'I came to take something. Anything worth carrying home.', LIES = ['I was lost. I only wandered in.', 'I came looking for work. Somebody said you might need a hand.', 'I was bringing you a message from the village.'], SEE = ['Lost. Four storeys up, through a crack no wider than a thumb, and you wandered into my nursery. Again, please.', 'Work. In a nursery, with nothing in your hands but my book. Try again.', 'A message. Delivered to a chest, by hand, with the lid shut. Last chance, little climber.'];
      let lies = 0; const opts_auto = opts.ch3lies;       // (in the scene notes the path is fixed, so that the beats are the same each time: truth at once, or after one, two or three lies)
      for (;;) {
        const opts = lies < 3 ? [TRUTH, LIES[lies]] : [TRUTH], k = opts_auto !== undefined ? (lies >= opts_auto ? 0 : 1) : await G.choose('jack', opts);
        if (k === 0) break;
        shotJ(); await jline(LIES[lies]); shotG(6.1, 6.1, 5.9); await gline(SEE[lies]); lies++;
      }
      shotJ(); W.paintJack(jackOut, { expr: 2 }); headTo(0.55);
      // the truth is told, and he grows, to half her size, from the moment he begins to speak
      const growing = (async () => { A && A.blip && A.blip(); for (let i = 1; i <= 48; i++) { st.s = W3(0.4, 0.5, ease(i / 48)); await G.wait(0.05); } st.s = 0.5; })();
      await jline('We’ve nothing at home, and Mother’s frantic. I thought one small thing from a house this rich would make the climb worth it.'); await growing;
      shotG(12.3, 12.1, 6.5);
      await gline(['Honest, and at the first asking. I’ll say that for you.', 'The truth, after one fib. It is a start.', 'Two lies, and then the truth. You are getting there, slowly.', 'Three lies, and the truth only when you had run out of the other kind.'][lies]);
      headTo(-0.45);                                                                              // (he looks up at her again for the second line)
      await gline('But I told you to stay put, and to touch nothing, did I not, ' + ['little one', 'little climber', 'little mouse', 'my little thief'][lies] + '?');
      shotJ(); await jline('I’m not a—');
      // she lifts him, and carries him to the chair by the cot
      { const mx = (st.pos.x + gst.x) / 2, mz = (st.pos.z + gst.z) / 2, [ux, uz] = dirGJ(); G.cut({ pos: v(mx - uz * 62, 26, mz + ux * 62), look: v(mx, 14, mz), fov: 46 }); }       // (from the side, so that the lift is seen)
      st.boxed = true; jackOut.root.scale.setScalar(SC * 0.5 * FULL);       // (at half her size: the same as the lap engine's Jack, which is half of her whole, so that he is not smaller in one scene than the other)
      st.pose = { thigh: -0.3, knee: 0.2, armLx: -0.2, armLz: 0.35, armRx: -0.2, armRz: -0.35, torso: 0, neckX: -0.2, neckY: 0 };
      let liftAt = { d: 14, b: 0.9 };
      { faceJ(); const [ux, uz] = dirGJ(), hipsPt = v(st.pos.x, 0.5 * HEIGHT * SC * st.s, st.pos.z), mid = () => { root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); return gerda.wrist.localToWorld(v(0, -6, 0)).add(gerda.armL.localToWorld(v(0, -12, 0))).multiplyScalar(0.5); };
        const sx = gst.x, sz = gst.z, sb = gst.bend, sr = gst.reach, sl = gst.lreach; let best = { e: 1e9, d: 14, b: 0.9 }; gst.reach = gst.lreach = 1.35;
        for (let d = 8; d <= 26; d += 1) for (let b = 0.3; b <= 1.3; b += 0.05) { gst.x = st.pos.x + ux * d; gst.z = st.pos.z + uz * d; gst.bend = b; placeGerda(); const e = mid().distanceTo(hipsPt); if (e < best.e) best = { e, d, b }; }
        gst.x = sx; gst.z = sz; gst.bend = sb; gst.reach = sr; gst.lreach = sl; placeGerda(); liftAt = best;       // (she stops where her hands will reach his hips, and bends as far as that takes)
        await gwalk(st.pos.x + ux * best.d, st.pos.z + uz * best.d, 0.8); faceJ(); }
      const H50 = root.GerdaHold50, E50 = j => new THREE.Quaternion().setFromEuler(new THREE.Euler(j.rx, j.ry, j.rz, 'XYZ'));       // (the two poses are from pose-editor-half.html: carried upright between her hands, and across her knee)
      const hp = { a: 'carry', b: 'carry', t: 0, w: 0 }; gst.p50 = hp;
      const jackPose = () => { const A_ = H50[hp.a].jack, B_ = H50[hp.b].jack, L = k => { const d = k === 's' ? 0.7 : 0, a = A_[k] === undefined ? d : A_[k], b = B_[k] === undefined ? d : B_[k]; return a + (b - a) * hp.t; }; return { pos: gerda.root.localToWorld(v(L('px'), L('py'), L('pz'))), q: gerda.root.quaternion.clone().multiply(E50(A_).slerp(E50(B_), hp.t)), L }; };
      const JKEYS = [['legLx', 'legLx'], ['legRx', 'legRx'], ['kneeL', 'kneeL'], ['kneeR', 'kneeR'], ['armLx', 'armLx'], ['armRx', 'armRx'], ['armLz', 'armLz'], ['armRz', 'armRz'], ['torso', 'torsoX'], ['neckX', 'neckX']];
      const putJack = (from, k) => { const J = jackPose(); jackOut.root.scale.setScalar(SC * J.L('s')); if (from) { jackOut.root.position.set(W3(from.p.x, J.pos.x, k), W3(0, J.pos.y, k), W3(from.p.z, J.pos.z, k)); jackOut.root.quaternion.copy(from.q).slerp(J.q, k); } else { jackOut.root.position.copy(J.pos); jackOut.root.quaternion.copy(J.q); } for (const [pk, dk] of JKEYS) st.pose[pk] = from ? W3(from.pose[pk], J.L(dk), k) : J.L(dk); };
      { const from = { p: st.pos.clone(), q: jackOut.root.quaternion.clone(), pose: { legLx: -0.3, legRx: -0.3, kneeL: 0.2, kneeR: 0.2, armLx: -0.2, armRx: -0.2, armLz: 0.35, armRz: -0.35, torso: 0, neckX: 0.55 } };
        for (let i = 1; i <= 16; i++) { const k = ease(i / 16); gst.bend = liftAt.b * k; gst.reach = 1.35 * k; gst.lreach = 1.35 * k; faceJ(); st.pose.neckX = W3(0.55, -0.2, k); await G.wait(0.04); }       // (she bends to him, and her hands find his hips)
        from.pose.neckX = -0.2; await G.wait(0.2);
        for (let i = 1; i <= 24; i++) { const k = ease(i / 24); gst.bend = W3(liftAt.b, 0.35, k); hp.w = k; faceJ(); putJack(from, k); await G.wait(0.04); } hp.w = 1; }
      const chair = M.items.nurseryChair.g.position, SEATX = chair.x, SEATZ = chair.z;
      const walkCarrying = async (wx, wz, spd) => { const x0 = gst.x, z0 = gst.z, d = Math.hypot(wx - x0, wz - z0), n = Math.max(2, Math.ceil(d / spd)); for (let i = 1; i <= n; i++) { const k = i / n, h1 = Math.atan2(wx - gst.x, wz - gst.z); gst.x = x0 + (wx - x0) * k; gst.z = z0 + (wz - z0) * k; gst.h += angDiff(h1, gst.h) * 0.3; gst.ph += 0.4; gst.walk = 0.6; placeGerda(); putJack(); await G.wait(0.04); } gst.walk = 0; };
      G.cut({ pos: v(-160, 40, -240), look: v(SEATX, 14, SEATZ), fov: 46 });
      await walkCarrying(SEATX - 12, SEATZ, 0.9);
      // she turns and sits, with him across her knee
      hp.a = 'carry'; hp.b = 'lap';
      { const h0 = gst.h; for (let i = 1; i <= 26; i++) { const k = ease(i / 26); gst.h = h0 + angDiff(-Math.PI / 2, h0) * k; gst.x = W3(SEATX - 12, SEATX, k); hp.t = k; gst.y = 5.1 * k; placeGerda(); gerda.root.position.y = gst.y; gerda.root.updateMatrixWorld(true); putJack(); await G.wait(0.04); } }
      hp.t = 1; root.Blocky.seatFeet && root.Blocky.seatFeet(gerda, 0);
      const lapX = SEATX - 6.5;
      G.cut({ pos: v(SEATX - 59.2, 14, SEATZ + 31.1), look: v(lapX, 14, SEATZ - 2), fov: 40 });
      W.paintJack(jackOut, { expr: 4 });
      const squirm = (async () => { for (let i = 1; i <= 80; i++) { const t = i * 0.35; putJack(); st.pose.legLx += 0.7 * Math.sin(t * 2.3); st.pose.legRx += 0.7 * Math.sin(t * 2.3 + 1.6); st.pose.kneeL += 0.4 * Math.abs(Math.sin(t * 2.3 + 1)); st.pose.kneeR += 0.4 * Math.abs(Math.sin(t * 2.3 + 2)); st.pose.armLx += 0.4 * Math.sin(t * 2.9); st.pose.armRx += 0.4 * Math.sin(t * 2.9 + 2); jackOut.root.position.x += 0.25 * Math.sin(t * 3.1); jackOut.root.position.y += 0.2 * Math.abs(Math.sin(t * 2.3)); await G.wait(0.04); } })();       // (he struggles from the first moment of the beat)
      await Promise.all([squirm, jline('No!').then(() => jline('Let me go!'))]);
      putJack(); await G.wait(0.6);
      // her hand settles at the small of his back (the pose holds)
      G.ch3lies = lies; await finish('discipline');
    }
    async function disciplineScene(lies) {
      const ease = k => k * k * (3 - 2 * k), W3 = (a, b, k) => a + (b - a) * k;
      // ── The discipline: the lap engine (js/lap.js) takes over from the carried pose, in the nursery, with Jack at half size over her knee ──
      if (!root.Lap) { await finish('discipline'); return; }
      const chair = M.items.nurseryChair.g.position, SEATX = chair.x, SEATZ = chair.z;
      const LAP_S = 1.4, LAP_Y = 6 * LAP_S;
      await G.fade(true, 0.7);
      const lap = root.Lap.create(null, { external: { scene, camera: G.camera, renderer: G.renderer }, table: false, jackFull: 0.95 });
      lap.giver('gerda'); lap.outfit('gerda', 'Work'); lap.stage.scale.setScalar(LAP_S); lap.stage.position.set(SEATX, LAP_Y, SEATZ); lap.stage.rotation.y = -Math.PI / 2; lap.stage.updateMatrixWorld(true);
      gerda.root.visible = false; jackOut.root.visible = false; M.items.nurseryChair.g.visible = false;
      lap.reset(); lap.layers({ trousers: 'up', drawers: 'up' }); lap.armed(false); lap.implement('hand'); lap.place('lap', 0); lap.size(0.5); lap.st.side = 'alt'; lap.st.noRecovery = true; lap.st.sound = true; lap.st.strength = 1.05;
      lap.pain.ache = 0.5 * lap.pain.capacity();       // (he begins already flinching: he has been struggling in her arms since she lifted him) lap.st.pace = 1;
      { const knife = new THREE.Group(), mk = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); knife.add(m); };
        mk(1.2, 8, 0.8, 0xb9bfc8, 0, -4.5, 0); mk(1.6, 3.6, 1.2, 0x4a3626, 0, 0, 0); mk(3, 0.7, 1.4, 0xb8923a, 0, -1.8, 0); knife.position.set(-5.6, 2, 0.4); lap.jack.hips.add(knife); }       // (his father's knife at his belt, as in the cottage; no satchel, which would be in the way)
      const lapTick = dt => lap.update(dt); G.updaters.push(lapTick);
      // (the cameras: the engine's own views, kept inside the room)
      const Co = root.Correction, cam = Co.freeCam(G, roomBox(SEATX, SEATZ)), panel = Co.ui(), camBtn = document.getElementById('corrCam'), redBtn = document.getElementById('corrRed'), RED = { red: true };
      let red = false, shown = null;
      redBtn.onclick = () => { red = true; lap.red(); G.captionOff && G.captionOff(); };
      const showUI = on => panel.classList.toggle('on', !!on);
      const stageView = (name, ms) => { const V = lap.views[name]; lap.stage.updateMatrixWorld(true); const P = lap.stage.localToWorld(v(...V.pos)); if (ms === 0) { P.x = clamp(P.x, -302, -110); P.z = clamp(P.z, -282, -178); P.y = Math.min(P.y, 76); } cam.go(P, lap.stage.localToWorld(v(...V.at)), 46, ms == null ? 700 : ms); shown = name; };
      const SET = ['overview', 'behind', 'shoulder', 'face'];
      camBtn.onclick = () => stageView(SET[(SET.indexOf(shown) + 1) % SET.length]);       // (one button: each press goes on to the next angle, and the player can drag, pan and zoom as well)
      const say = async (who, text) => { if (red) throw RED; await G.say(who, text); if (red) throw RED; };
      const wait = async s => { await G.wait(s); if (red) throw RED; };
      const smacks = async n => { if (!n) return; lap.run(n); await G.wait(0.4); for (let i = 0; i < 700 && (lap.info().busy || lap.info().running); i++) { await G.wait(0.1); if (red) return; } };
      const step = async (line, n) => { if (red) throw RED; const l = line ? G.say(line[0], line[1]) : Promise.resolve(); await Promise.all([l, smacks(n)]); if (red) throw RED; };
      const ramp = async (key, to, secs) => { const from = lap.st[key] || 0, n = Math.max(1, Math.round(secs / 0.04)); for (let i = 1; i <= n; i++) { lap.st[key] = W3(from, to, ease(i / n)); await G.wait(0.04); } lap.st[key] = to; };
      stageView('overview', 0);
      // ── Afterwards: Jack stands before her, rubbing; she gives her name, and takes him to dress ──
      const aftermath = async () => {
        await G.fade(true, 0.8);
        lap.stage.visible = false; M.items.nurseryChair.g.visible = true; G.captionOff && G.captionOff();
        const gear = jackOut.gear, satchel = new THREE.Group();
        if (gear) { gear.knife.visible = false; gear.satchel.visible = false; const bag = gear.satchel.clone(); bag.visible = true; bag.scale.setScalar(SC * 0.7 * 0.95); bag.rotation.set(0, 0.6, -Math.PI / 2); satchel.add(bag); }       // (the knife is hers now; the satchel is put down)
        satchel.updateMatrixWorld(true); { const bb = new THREE.Box3().setFromObject(satchel); satchel.position.y = -bb.min.y; }
        satchel.position.x = SEATX - 2; satchel.position.z = (SEATZ + M.items.cot.g.position.z) / 2; scene.add(satchel);       // (his satchel, on the floor between the chair and the cot)       // (his satchel, on the floor between the chair and the cot)
        scene.attach(jackOut.root); jackOut.root.quaternion.identity(); jackOut.root.rotation.set(0, st.heading, 0);
        gerda.root.visible = true; jackOut.root.visible = true; st.scene = true; st.s = 0.7; st.boxed = false; st.inHand = false; st.walkN = 0;
        Object.assign(gst, { x: SEATX, z: SEATZ, h: -Math.PI / 2, y: 5.1, seated: 1, walk: 0, reach: 0, bend: 0, look: 0 }); placeGerda(); root.Blocky.step(gerda, 0); root.Blocky.seatFeet && root.Blocky.seatFeet(gerda, 0);
        st.pos.set(SEATX - 30, 0, SEATZ); st.heading = Math.PI / 2; st.y = 0; W.paintJack(jackOut, { expr: 'wince', trousers: 'up', drawers: 'up' });
        // (his hands on his seat: the upper arms turned in, so that the elbows bend back)
        const rub = { thigh: 0, knee: 0, armLx: 0.3, armRx: 0.3, armLy: -1.4, armRy: 1.4, armLz: 0, armRz: 0, elbowL: -0.4, elbowR: -0.4, torso: 0.1, neckX: 0.35 }; st.pose = rub; let rubbing = true;
        const rubber = (async () => { for (let t = 0; rubbing; t += 0.04) { rub.armLx = 0.3 + 0.12 * Math.sin(t * 7); rub.armRx = 0.3 + 0.12 * Math.sin(t * 7 + 1.4); rub.elbowL = -0.4 - 0.1 * Math.sin(t * 7 + 0.5); rub.elbowR = -0.4 - 0.1 * Math.sin(t * 7 + 1.9); await G.wait(0.04); } })();
        // (the cameras are the notes': on Gerda from beside Jack, on Jack from behind her, and the one for them leaving)
        const camG = () => G.cut({ pos: v(-190, 14, -236), look: v(-132, 18, -223), fov: 44 }), camJ = () => G.cut({ pos: v(-110, 40, -180), look: v(-144, 17.5, -212), fov: 44 });
        const nod = async (n, secs, amp) => { const base = rub.neckX; for (let k = 0; k < n; k++) for (let i = 1; i <= Math.round(secs / 0.04); i++) { rub.neckX = base + amp * Math.sin(Math.PI * 2 * i / Math.round(secs / 0.04)) * 0.5; await G.wait(0.04); } rub.neckX = base; };
        const lookUp = async () => { const h0 = rub.neckX; for (let i = 1; i <= 16; i++) { rub.neckX = W3(h0, -0.4, ease(i / 16)); await G.wait(0.04); } };
        Object.assign(gst, { look: 0.35, headY: 0 });       // (she looks down at him, her hands in her lap, from the first word)
        camG(); await G.fade(false, 0.8); await G.wait(0.6);
        await sayW('gerda', 'Are you ready to behave yourself now, little climber?');
        camJ(); await G.wait(1.0); await nod(2, 1.1, 0.5); await G.wait(0.6);       // (he hesitates, and nods twice, slowly)
        camG(); await sayW('gerda', 'Out loud, please.');
        camJ(); await G.wait(0.3); await lookUp(); await G.wait(1.1); await sayW('jack', '…Yes. Um…');       // (he looks up at her, and holds, the question unspoken)
        camG(); await sayW('gerda', 'My name is Gerda.'); G.gerdaNamed = true;
        camJ(); await G.wait(0.3); { const nodding = nod(2, 0.6, 0.45); await sayW('jack', 'Yes Gerda.'); await nodding; }       // (still looking at her, he nods twice again, quicker)
        await sayW('gerda', 'Good boy.');
        W.paintJack(jackOut, { expr: 'smile', trousers: 'up', drawers: 'up' }); rubbing = false; await rubber;       // (he brightens at the praise, and stops rubbing)
        for (let i = 1; i <= 12; i++) { const k = ease(i / 12); rub.armLx = W3(rub.armLx, 0.05, k); rub.armRx = W3(rub.armRx, 0.05, k); rub.armLy = W3(rub.armLy, 0, k); rub.armRy = W3(rub.armRy, 0, k); rub.armLz = W3(rub.armLz, 0.1, k); rub.armRz = W3(rub.armRz, -0.1, k); rub.elbowL = W3(rub.elbowL, -0.2, k); rub.elbowR = W3(rub.elbowR, -0.2, k); await G.wait(0.04); }
        await G.wait(1.0);
        camG(); await sayW('gerda', 'Now, I set some nice fresh clothes out for you. Let’s get you into them, shall we?');
        camJ(); W.paintJack(jackOut, { expr: 'squint', trousers: 'up', drawers: 'up' }); await sayW('jack', 'Yes Gerda.');
        G.cut({ pos: v(-202, 34, -184), look: v(-132, 23, -222), fov: 44 });       // (the last beat: she stands, he takes her hand, and they walk out of the frame)
        W.paintJack(jackOut, { expr: 'shy', trousers: 'up', drawers: 'up' });
        // she stands, and offers a hand; he takes it after a beat (the pose is from pose-editor-half.html: standing, hand in hand)
        const HD = root.GerdaHold50.hold, hp = { a: 'hold', b: 'hold', t: 0, w: 0 }; gst.p50 = hp; st.s = HD.jack.s || 0.7;
        const jackAt = () => { const P = gerda.root.localToWorld(v(HD.jack.px, 0, HD.jack.pz)); st.pos.x = P.x; st.pos.z = P.z; st.heading = gst.h + HD.jack.ry; };
        for (let i = 1; i <= 24; i++) { const k = ease(i / 24); gst.seated = 1 - k; gst.y = 5.1 * (1 - k); gst.x = W3(SEATX, SEATX - 16, k); hp.w = k * 0.6; gst.headY = -0.8 * k; placeGerda(); await G.wait(0.04); }       // (she rises, her hand coming out to him)
        gst.seated = 0; gst.y = 0; placeGerda();
        await G.wait(0.9);
        { gerda.root.updateMatrixWorld(true); const x0 = st.pos.x, z0 = st.pos.z, h0 = st.heading, P = gerda.root.localToWorld(v(HD.jack.px, 0, HD.jack.pz)), h1 = gst.h + HD.jack.ry, J = HD.jack, from = { armLx: rub.armLx, armLy: rub.armLy, armLz: rub.armLz, elbowL: rub.elbowL, neckX: rub.neckX, torso: rub.torso };
          for (let i = 1; i <= 16; i++) { const k = ease(i / 16); st.pos.x = W3(x0, P.x, k); st.pos.z = W3(z0, P.z, k); st.heading = h0 + angDiff(h1, h0) * k; st.walkN = 0.5; st.walkPh += 0.35; hp.w = 0.6 + 0.4 * k;
            rub.armLx = W3(from.armLx, J.armLx, k); rub.armLy = W3(from.armLy, J.armLy || 0, k); rub.armLz = W3(from.armLz, J.armLz, k); rub.elbowL = W3(from.elbowL, J.elbowLx, k); rub.neckX = W3(from.neckX, J.neckX, k); rub.torso = W3(from.torso, J.torsoX, k); await G.wait(0.04); } st.walkN = 0; hp.w = 1; }
        await sayW('gerda', 'Come along, then.');
        // together, to the door of the nursery
        const route = [[-250, -203], [-290, -190], [-294, -164]];
        let frames = 0, faded = false;       // (they start walking, and the scene fades out on them)
        for (const [px, pz] of route) for (let n = 0; n < 400 && !faded; n++) { if (++frames === 22) G.fade(true, 1.3).then(() => { faded = true; }); const dx = px - gst.x, dz = pz - gst.z, d = Math.hypot(dx, dz); if (d < 1.2) break; const h1 = Math.atan2(dx, dz); gst.h += angDiff(h1, gst.h) * 0.12; gst.x += Math.sin(gst.h) * 0.9; gst.z += Math.cos(gst.h) * 0.9; gst.ph += 0.4; gst.walk = 0.6; placeGerda(); gerda.root.updateMatrixWorld(true); jackAt(); st.walkN = 1; st.walkPh += 0.3 * 1.4;
          await G.wait(0.04); }
        gst.walk = 0; st.walkN = 0; st.pose = null; gst.p50 = null;
      };
      if (opts.ch3after) { cam.restore(); G.updaters = G.updaters.filter(u => u !== lapTick); await aftermath(); await finish('discipline'); return; }       // (the scene on its own, for the scene notes and for tests)
      G.lap = lap; G.fc = cam.fc;       // (for tools and tests)
      try {
        try {
      await G.fade(false, 0.7); showUI(true); await wait(0.5);
      // over his trousers, to begin with: no more than a humble correction
      await say('gerda', 'When you behave like a child, you’ll be treated like one.');
      await step(['gerda', 'I told you to stay put, and to touch nothing.'], 6);
      await step(['jack', 'Ow! I only wanted—'], 4);
      await step(['gerda', lies === 0 ? 'You told me the truth, at the first asking. That does not make the rest of it right.' : lies === 1 ? 'And you lied to me. “Lost”, you said, when you had climbed four storeys to be here.' : lies === 2 ? 'And you lied to me, twice, with a straight face, to a woman who watched you climb in.' : 'And you lied to me three times over, each one worse than the last, until you had run out of them.'], 8);
      await step(['jack', 'I’m sorry! I’m sorry!'], 4);
      // his hand goes for the knife at his belt, and is caught
      await step(['gerda', 'Into my house, through my door, up my walls and into my chest—'], 4); await wait(0.3);
      ramp('armReach', 1, 0.45);
      await wait(0.5); await say('jack', 'Let me—');
      await Promise.all([ramp('armReach', 0, 0.35), ramp('armHold', 1, 0.35)]);                      // (she catches his wrist, and takes it into the small of his back)
      A && A.blip && A.blip(); await wait(0.5);
      await say('gerda', 'No, you don’t.');
      await say('jack', 'Ow— my arm—');
      await say('gerda', 'Keep it there. You will not be touching that blade, nor anything else in this house.');
      await say('gerda', 'And since you cannot be trusted to take your correction like a man—');
      lap.layers({ trousers: 'down', drawers: 'down' }); A && A.blip && A.blip(); await wait(0.7);                  // (trousers and drawers, in one movement)
      await say('jack', 'No! Wait! You can’t—'); lap.st.strength = 1.35;
      await say('gerda', 'I can, and I will.');
      // the same as the brash correction; and he settles into it once he is past the edge of resistance
      const GL = [['gerda', 'This is for the door you were told to leave alone.'], ['jack', 'Ow! Ow! Please!'], ['gerda', 'This is for the chest, and the things in it that were never yours.'], ['jack', 'I wasn’t—! Ow! I was only looking!'],
        ['gerda', lies > 0 ? 'And this is for the “lost”, and the rest of your little stories.' : 'And this is for thinking that a house this rich would not notice what it lost.'], ['jack', 'I’m sorry, I’m sorry, I’m sorry!'], ['gerda', 'You will obey me, or you will answer for it.'], ['jack', 'Yes! Yes, I will!']];
      for (let i = 0; i < GL.length; i++) {
        if ((lap.bandIndex() >= 4 && i >= 3) || i >= 7) break;
        await step(GL[i], 6 + (i % 3) * 2);
      }
      ramp('settle', 1, 3.2);                                                                                       // (his struggling stops: he is still, apart from what each smack does to him)
      await step(['gerda', 'There. That is better. Stay just as you are.'], 5); await step(null, 6);
      await step(['gerda', 'You see how much easier it is, when you stop fighting me.'], 5);
      await step(['jack', '…I’m sorry.'], 4); await step(null, 5);
      await wait(0.5);
      await say('gerda', 'That will do.');
      // she puts him right again, gently await wait(0.4);
      lap.layers({ drawers: 'up' }); A && A.blip && A.blip(); await wait(0.9);
      lap.layers({ trousers: 'up' }); A && A.blip && A.blip(); await wait(0.9);
      await ramp('armHold', 0, 0.8);
      await say('gerda', 'There now. It is over.');
      await wait(0.8);
      await say('gerda', 'The knife stays with me. And you will ask, the next time you want something from my house.');
      await wait(0.8);
        } catch (e) {
          if (e !== RED) throw e;
          // Red: it ends here, and he is put right again, gently.
          lap.stop(); G.captionOff && G.captionOff(); red = false; showUI(false); lap.st.sound = false;
          await G.say('jack', 'Red! No more, please!'); await G.say('gerda', 'Alright, Jack. I hear you. That is an end to it.');
          lap.layers({ drawers: 'up' }); await G.wait(0.8); lap.layers({ trousers: 'up' }); await G.wait(0.8); await ramp('armHold', 0, 0.8); await ramp('armReach', 0, 0.1);
          await G.say('gerda', 'The knife stays with me.'); await G.wait(0.6);
        }
      } finally { showUI(false); G.cut({ pos: cam.fc.position.clone(), look: cam.controls.target.clone(), fov: cam.fc.fov }); cam.restore(); G.updaters = G.updaters.filter(u => u !== lapTick); }       // (the game's own camera takes up where the player's was left, for the fade out: it was elsewhere, outside the castle)

      G.updaters = G.updaters.filter(u => u !== lapTick);
      await aftermath();
      if (!opts.ch3notes) G.save({ step: 'ch3dress' });
      await dressScene(lap.stage);
      await choreScene(); await bathScene();
      await finish('bath');
    }
    // ── Dressed: the playable sequence at the kitchen table. Jack stands on it, Gerda before him at its edge; he cannot move or jump, and the one button answers what she asks of him. ──
    async function dressScene(lapStage) {
      const ease = k => k * k * (3 - 2 * k), W3 = (a, b, k) => a + (b - a) * k, tc = M.items.kitchenTable.g.position, TOP = 25.5, JX = tc.x + 9, JZ = tc.z + 9;       // (the kitchen table, where the box and his clothes stood when he woke)
      const mk = (w, h, d, col, x, y, z, par) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), root.Farm.plain(col)); m.position.set(x, y, z); par.add(m); return m; };
      if (!ch3Items.clothes) { const cl = new THREE.Group(); cl.position.set(tc.x - 9, TOP, tc.z - 6); cl.scale.setScalar(2); scene.add(cl); ch3Items.clothes = cl; mk(2.7, 0.7, 2.2, '#5a7a3e', 0, 0.35, 0, cl); mk(0.9, 0.22, 0.5, '#e8dcb8', -0.4, 0.76, -0.8, cl); mk(2.1, 0.5, 2.8, '#6d5233', 0.1, 0.95, 0.1, cl); mk(0.3, 0.2, 2.3, '#8a6a42', -0.6, 1.3, 0.1, cl); mk(0.9, 0.8, 2.1, '#3a2616', 2.1, 0.4, -0.6, cl); mk(0.9, 0.8, 2.1, '#3a2616', 2.1, 0.4, 1.0, cl); }
      const clothes = ch3Items.clothes; clothes.visible = true;
      // the props: what comes off him is put down on the table, and what goes on him comes from her hands
      const prop = (build, x, z, ry) => { const g = new THREE.Group(); build(g); g.position.set(x, TOP, z); g.rotation.y = ry || 0; g.visible = false; scene.add(g); return g; };
      const PS = SC * 0.7;
      const boot = g => { mk(2.6, 3.4, 2.6, '#3a2616', 0, 1.7, -0.3, g); mk(2.6, 1.6, 4.2, '#3a2616', 0, 0.8, 1.2, g); mk(2.7, 0.35, 4.3, '#22160c', 0, 0.2, 1.2, g); mk(0.5, 0.5, 0.5, '#b8a070', 0, 2.6, 1.05, g); g.scale.setScalar(PS * 1.15); };
      const bootL = prop(boot, tc.x - 17, tc.z - 5, 0.5), bootR = prop(boot, tc.x - 17, tc.z + 1, -0.3);       // (what comes off him goes down on the table's middle, to his right: toward -x)
      const trousers = prop(g => { mk(7, 0.9, 5.5, '#6d5233', 0, 0.45, 0, g); mk(7, 0.7, 2.2, '#59422a', 0, 1.2, -0.8, g); mk(1.8, 0.2, 1.6, '#8b7048', -1.6, 1.0, 0.8, g); mk(7.4, 0.5, 0.9, '#4a3220', 0, 1.0, 2.5, g); g.scale.setScalar(PS * 1.1); }, tc.x - 3, tc.z + 1, 0.2);
      const shirt = prop(g => { mk(6.2, 0.8, 5, '#e8dfc4', 0, 0.4, 0, g); mk(5.6, 0.6, 4.4, '#4b7a3a', 0, 1.1, 0, g); mk(1.2, 0.2, 1.2, '#cfc4a6', 0, 1.5, -1, g); g.scale.setScalar(PS * 1.1); }, tc.x - 11, tc.z + 4, -0.25);
      const heldTunic = new THREE.Group(); mk(5.6, 0.7, 4.6, '#86ad72', 0, 0, 0, heldTunic); mk(0.9, 0.2, 2.4, '#8a6038', 0, 0.45, 0, heldTunic); heldTunic.scale.setScalar(PS * 1.1); heldTunic.visible = false; gerda.wrist.add(heldTunic); heldTunic.position.set(0, -6, 0.8);
      const heldBoot = new THREE.Group(); boot(heldBoot); heldBoot.visible = false; gerda.wrist.add(heldBoot); heldBoot.position.set(0, -6, 0.8);
      const heldShirt = new THREE.Group(); mk(6.2, 0.8, 5, '#e8dfc4', 0, 0, 0, heldShirt); mk(5.6, 0.6, 4.4, '#4b7a3a', 0, 0.7, 0, heldShirt); heldShirt.scale.setScalar(PS * 1.1); heldShirt.visible = false; gerda.wrist.add(heldShirt); heldShirt.position.set(0, -6, 0.8);
      const heldTrousers = new THREE.Group(); mk(7, 0.9, 5.5, '#6d5233', 0, 0, 0, heldTrousers); mk(7, 0.7, 2.2, '#59422a', 0, 0.8, -0.8, heldTrousers); mk(7.4, 0.5, 0.9, '#4a3220', 0, 0.6, 2.5, heldTrousers); heldTrousers.scale.setScalar(PS * 1.1); heldTrousers.visible = false; gerda.wrist.add(heldTrousers); heldTrousers.position.set(0, -6, 0.8);
      const heldShorts = new THREE.Group(); mk(5.2, 0.8, 3.6, '#b8a173', 0, 0, 0, heldShorts); mk(5.2, 0.5, 0.6, '#9b855d', 0, 0.5, 1.6, heldShorts); heldShorts.scale.setScalar(PS * 1.1); heldShorts.visible = false; scene.add(heldShorts); const shortsTick = () => { if (!heldShorts.visible) return; const a = wr(), b = wl(); heldShorts.position.copy(a).add(b).multiplyScalar(0.5); heldShorts.rotation.y = gst.h; heldShorts.scale.set(Math.max(PS * 1.1, a.distanceTo(b) / 5.2 * 0.95), PS * 1.1, PS * 1.1); }; G.updaters.push(shortsTick);       // (the shorts are held between both her hands)
      // the places
      if (lapStage) lapStage.visible = false; M.items.nurseryChair.g.visible = true; G.captionOff && G.captionOff(); jackOut.root.visible = true; gerda.root.visible = true; scene.attach(jackOut.root);
      if (jackOut.gear) { jackOut.gear.knife.visible = jackOut.gear.satchel.visible = jackOut.gear.flask.visible = false; }       // (his gear is put by: the knife is hers, the satchel is in the nursery)
      G.cwState = st; st.props = { bootL, bootR, trousers, shirt, clothes };       // (for tools and tests)
      { const it = M.items.keepsakeBox, bg = it.g; bg.position.set(it.def.x, it.y, it.def.z); bg.rotation.set(0, it.def.ry || 0, 0); bg.userData.box.lid.rotation.x = 0; }       // (the box goes back on the pantry, where it stood before she took it down)
      st.s = 0.7; st.boxed = false; st.inHand = false; st.pose = null; st.pos.set(JX, 0, JZ); st.y = TOP; st.heading = 0; st.walkN = 0; st.vy = 0; st.standY = TOP; st.fz = { x: JX, y: TOP, z: JZ };
      Object.assign(gst, { x: JX, z: JZ + 15, h: Math.PI, y: 0, seated: 0, walk: 0, reach: 0, lreach: 0, bend: 0, look: 0.25, headY: 0, p50: null, hold: 0 }); placeGerda(); root.Blocky.step(gerda, 0);
      const look = (o) => W.paintJack(jackOut, Object.assign({ outfit: 'Outdoor', trousers: 'up', drawers: 'up' }, o));
      look({ expr: 'shy' }); let dressed = { outfit: 'Outdoor', trousers: 'up', drawers: 'up' }; const paint = o => { Object.assign(dressed, o); W.paintJack(jackOut, dressed); };
      st.scene = false; st.frozen = true; st.camA = -0.15; st.pitch = 0.3; st.zoom = 1; camPos.set(0, 0, 0); G.mode = 'play'; document.body.classList.remove('cutscene'); $('cwPanel').style.display = 'none'; $('cwObjt').style.display = 'none'; G.skipping = false;
      // helpers: her hands to a place (the bend and the reach that bring her wrist nearest it), the tween between her stances, and the one button
      const wr = () => gerda.wrist.localToWorld(new V3(0, -6, 0)), wl = () => gerda.wristL.localToWorld(new V3(0, -6, 0));
      const solveHand = (T, left) => { const sv = { bend: gst.bend, reach: gst.reach, lreach: gst.lreach }; let best = { d: 1e9, bd: 0, rc: 1 }; for (let bd = 0; bd <= 0.9; bd += 0.1) for (let rc = 0.4; rc <= 2.2; rc += 0.12) { gst.bend = bd; gst.reach = rc; gst.lreach = left ? rc : 0; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); const d = (left ? wl() : wr()).distanceTo(T); if (d < best.d) best = { d, bd, rc }; } Object.assign(gst, sv); placeGerda(); return best; };       // (the search leaves her as she was: it is only a search)
      const pose = async (to, secs) => { const from = { bend: gst.bend, reach: gst.reach, lreach: gst.lreach }, n = Math.max(1, Math.round((secs || 0.5) / 0.04)); for (let i = 1; i <= n; i++) { const k = ease(i / n); for (const key in to) gst[key] = W3(from[key], to[key], k); placeGerda(); await G.wait(0.04); } };
      const handTo = async (T, both, secs) => { const b = solveHand(T, both); await pose({ bend: b.bd, reach: b.rc, lreach: both ? b.rc : 0 }, secs); };
      const rest = (secs) => pose({ bend: 0, reach: 0, lreach: 0 }, secs || 0.5);
      const act = label => new Promise(res => { st.dressWait = { label, res }; });
      const setDown = async (held, prop, fold) => { const sp = prop.position, base = held.scale.clone(); await handTo(v(sp.x, TOP + 9, sp.z + 2), false, 0.5);       // what comes off him: she lifts it clear, folds it if it folds, and puts it down on the table
        if (fold) for (let i = 0; i < 2; i++) { for (let k = 1; k <= 8; k++) { const q = ease(k / 8); held.scale.set(base.x, base.y * W3(1, 0.55, q), base.z * W3(1, 0.7, q)); await G.wait(0.04); } if (!i) await G.wait(0.1); }
        await handTo(v(sp.x, TOP + 2, sp.z + 1), false, 0.45); held.visible = false; held.scale.copy(base); prop.visible = true; A && A.blip && A.blip(); await G.wait(0.15); };

      const footAt = left => (left ? jackOut.legL : jackOut.legR).knee.localToWorld(new V3(0, -8, 0));
      const liftFoot = async (left, on) => { const k0 = st.pose || (st.pose = { thigh: 0, knee: 0 }); const n = 12; for (let i = 1; i <= n; i++) { const k = on ? ease(i / n) : 1 - ease(i / n); st.pose.legLx = left ? W3(0, -0.55, k) : 0; st.pose.legRx = left ? 0 : W3(0, -0.55, k); st.pose.kneeL = left ? 0.9 * k : 0; st.pose.kneeR = left ? 0 : 0.9 * k; await G.wait(0.04); } };
      // ── eyes: she looks at his face, and at her hands when they are busy; he is shy of her gaze at first, and meets it more as the praise lands ──
      const gz = { b: 0, w: 0, side: 1, aw: 0 }; gst.alive = 1; st.gaze = { x: 0, y: 0 };
      const gazeTick = dt => {
        const jh = jackOut.neck.localToWorld(new V3(0, 3, 0)), gh = gerda.neck.localToWorld(new V3(0, 2.5, 0)), busy = Math.max(gst.reach || 0, gst.lreach || 0, (gst.bend || 0) * 2) > 0.3;
        const hand = (gst.lreach || 0) > (gst.reach || 0) * 0.8 ? wl() : wr(), tgt = busy ? hand : jh, hd = Math.hypot(tgt.x - gh.x, tgt.z - gh.z) || 1;
        const lk = clamp(Math.atan2(gh.y - tgt.y, hd) + (gst.bend || 0) * 0.6, 0, 1.2); gst.look += (lk - gst.look) * Math.min(1, dt * 5);       // (her head: down to wherever her eyes should be)
        const d = new V3().subVectors(gh, jh), h = st.heading, lx = d.x * Math.cos(h) - d.z * Math.sin(h), lz = d.x * Math.sin(h) + d.z * Math.cos(h);
        const my = clamp(Math.atan2(lx, lz), -0.9, 0.9), mx = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.9, 0.5);       // (the way to her eyes)
        const want = busy ? (gz.b > 0.55 ? 0.7 : 0) : gz.b;       // (how much he meets: her eyes on him, in proportion to his boldness; her hands, once he dares)
        const wy = busy && gz.b > 0.55 ? clamp(Math.atan2(hand.x - jh.x, hand.z - jh.z) * 0 + my, -0.9, 0.9) : my;
        gz.w += (want - gz.w) * Math.min(1, dt * (busy ? 2 : 3.5 * (0.3 + gz.b)));       // (shy, he is slow to look up; bold, he is quick)
        gz.aw += dt; const dither = 0.05 * Math.sin(gz.aw * 0.8);
        st.gaze.y = W3(0.55 * gz.side * (1 - 0.4 * gz.b) + dither, wy, gz.w); st.gaze.x = W3(0.4 - 0.1 * gz.b, mx, gz.w);       // (away and down, or at her)
      };
      G.updaters.push(gazeTick);
      await G.fade(false, 1.0); await G.wait(0.8);
      await sayW('gerda', 'Now then, little climber. Let’s have you out of these dusty things and into something comfortable.');
      await sayW('gerda', 'Boots first. Left foot up for me, please.');
      // ── boots: each foot offered in turn ──
      for (const left of [true, false]) {
        await act(left ? 'Lift left foot' : 'Lift right foot');
        liftFoot(left, true); await G.wait(0.5); await handTo(footAt(left), false, 0.5);
        for (let t = 0; t < 3; t++) { st.pose.legLx += left ? -0.1 : 0; st.pose.legRx += left ? 0 : -0.1; await G.wait(0.08); st.pose.legLx -= left ? -0.1 : 0; st.pose.legRx -= left ? 0 : -0.1; await G.wait(0.08); }       // (a tug, and a tug)
        paint(left ? { bootL: false } : { bootR: false }); heldBoot.visible = true; A && A.blip && A.blip();
        await Promise.all([liftFoot(left, false), setDown(heldBoot, left ? bootL : bootR, false)]); await rest(0.4);
        await sayW('gerda', left ? 'There’s a good boy. And the other one, now.' : 'Both off! Look at you, such a good helper. Doesn’t that feel better?'); gz.b = left ? 0.25 : 0.45;
      }
      // ── trousers: she lowers them, he steps out ──
      await sayW('gerda', 'Now these. Don’t worry, I have you.');
      { const hip = jackOut.hips.localToWorld(new V3(-3.5, 1, 0)); await handTo(hip, true, 0.6); }
      paint({ trousers: 'down' }); A && A.blip && A.blip(); await G.wait(0.5); await handTo(jackOut.hips.localToWorld(new V3(-3.5, -5, 0)), true, 0.5);       // (she keeps hold of them, low, for him to step out of)
      await sayW('gerda', 'Step out of them for me. Nice and steady.');
      await act('Step out');
      liftFoot(true, true); await G.wait(0.3); paint({ legs: 'drawers', trousers: 'up' }); heldTrousers.visible = true; A && A.blip && A.blip(); await G.wait(0.25);       // (the left foot comes up, and with the first movement they are off him and in her hand)
      await liftFoot(true, false); await liftFoot(false, true); await G.wait(0.15); await liftFoot(false, false);
      await setDown(heldTrousers, trousers, true); await rest(0.5);
      await sayW('gerda', 'Beautifully done! You see? Nothing to it.'); gz.b = 0.6; paint({ expr: 'smile' });
      // ── tunic and shirt, in one: arms up ──
      await sayW('gerda', 'Arms up high for me, there’s a brave boy.');
      await act('Arms up');
      for (let i = 1; i <= 14; i++) { const k = ease(i / 14); st.pose = Object.assign(st.pose || {}, { armLx: W3(0, -2.9, k), armRx: W3(0, -2.9, k), armLz: W3(0.08, 0.25, k), armRz: W3(-0.08, -0.25, k) }); await G.wait(0.04); }
      { const hem = jackOut.torso.localToWorld(new V3(0, 3, 4)); await handTo(hem, true, 0.5); const top = jackOut.torso.localToWorld(new V3(0, 22, 0)); await handTo(top, true, 0.7); }
      paint({ top: false }); heldShirt.visible = true; A && A.blip && A.blip(); await G.wait(0.3);
      for (let i = 1; i <= 14; i++) { const k = ease(i / 14); st.pose.armLx = W3(-2.9, 0, k); st.pose.armRx = W3(-2.9, 0, k); st.pose.armLz = W3(0.25, 0.08, k); st.pose.armRz = W3(-0.25, -0.08, k); await G.wait(0.04); }
      await setDown(heldShirt, shirt, true); await rest(0.5);
      await sayW('gerda', 'Off it all comes, and not a murmur. You are doing so well.'); gz.b = 0.75;
      // ── the day tunic: over his head ──
      await sayW('gerda', 'Now something clean and soft for you.');
      clothes.visible = false; heldTunic.visible = true; await handTo(jackOut.torso.localToWorld(new V3(0, 16, 0)), true, 0.6);
      for (let i = 1; i <= 14; i++) { const k = ease(i / 14); st.pose.armLx = W3(0, -2.9, k); st.pose.armRx = W3(0, -2.9, k); st.pose.armLz = W3(0.08, 0.25, k); st.pose.armRz = W3(-0.08, -0.25, k); await G.wait(0.04); }
      await handTo(jackOut.torso.localToWorld(new V3(0, 8, 0)), true, 0.6);
      paint({ outfit: 'Day', shorts: false, legs: undefined, top: undefined, bootL: undefined, bootR: undefined, trousers: 'up', drawers: 'up' }); heldTunic.visible = false; A && A.blip && A.blip();
      for (let i = 1; i <= 14; i++) { const k = ease(i / 14); st.pose.armLx = W3(-2.9, 0, k); st.pose.armRx = W3(-2.9, 0, k); st.pose.armLz = W3(0.25, 0.08, k); st.pose.armRz = W3(-0.25, -0.08, k); await G.wait(0.04); }
      await rest(0.5);
      await sayW('gerda', 'Oh, that suits you. Soft green, and a perfect fit.'); gz.b = 0.9;
      // ── the shorts: held low for him to step into ──
      heldShorts.visible = true; await handTo(v(JX, TOP + 1, JZ - 6 + 3), true, 0.6);
      await sayW('gerda', 'And last, these. Step right in when you’re ready.');
      await act('Step in');
      await liftFoot(true, true); await G.wait(0.25); await liftFoot(true, false); await liftFoot(false, true); await G.wait(0.25); await liftFoot(false, false);       // (a foot into each leg, in place)
      await handTo(jackOut.hips.localToWorld(new V3(0, -4, 0)), true, 0.4); await handTo(jackOut.hips.localToWorld(new V3(0, 2, 0)), true, 0.6);
      heldShorts.visible = false; paint({ outfit: 'Day', shorts: undefined, trousers: 'up', drawers: 'up', expr: 'smile' }); A && A.blip && A.blip(); await rest(0.6);
      await sayW('gerda', 'There! All dressed, and so well behaved. I am proud of you, Jack.');
      gz.b = 1; await G.wait(1.0);
      // ── then she lifts him down to the floor, and leads him to the roost: he follows, growing as he is good ──
      { const dA = (d, ang, up) => { for (const sg of [1, -1]) { d.lg.rotation.y = sg * ang; d.og.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(d.lg), c = d.axis === 'x' ? (bb.min.x + bb.max.x) / 2 : (bb.min.z + bb.max.z) / 2; if ((c > d.fixed) === up) break; } d.og.userData.noCollide = true; };       // (a door open by so much, to the side asked)
        const bathD = M.doors.find(d => d.axis === 'x' && Math.abs(d.fixed - 295) < 3 && Math.abs(d.c + 160) < 8), roostD = M.doors.find(d => d.axis === 'z' && Math.abs(d.fixed + 208) < 3 && Math.abs(d.c - 273) < 8);
        if (bathD) dA(bathD, Math.abs(bathD.openAng || 1.75), true);       // (the bathroom's door opens into the room, not the corridor)
        if (roostD) dA(roostD, Math.PI / 2, false); }       // (the roost's, a quarter turn, into the hallway)
      await sayW('gerda', 'Up you come, little climber.');
      // her hands find his hips, and she lifts him upright between them (the carry pose, as when she carried him to the chair)
      await handTo(jackOut.hips.localToWorld(new V3(0, 0, 0)), true, 0.8); await G.wait(0.15);
      const H50 = root.GerdaHold50, E50 = j => new THREE.Quaternion().setFromEuler(new THREE.Euler(j.rx, j.ry, j.rz, 'XYZ')), hp = { a: 'carry', b: 'carry', t: 0, w: 0 };
      const jackPose = () => { const A_ = H50[hp.a].jack, L = k => (A_[k] === undefined ? (k === 's' ? 0.7 : 0) : A_[k]); return { pos: gerda.root.localToWorld(v(L('px'), L('py'), L('pz'))), q: gerda.root.quaternion.clone().multiply(E50(A_)), L }; };
      const JKEYS = [['legLx', 'legLx'], ['legRx', 'legRx'], ['kneeL', 'kneeL'], ['kneeR', 'kneeR'], ['armLx', 'armLx'], ['armRx', 'armRx'], ['armLz', 'armLz'], ['armRz', 'armRz'], ['torso', 'torsoX'], ['neckX', 'neckX']];
      const putJack = (from, k) => { const J = jackPose(); jackOut.root.scale.setScalar(SC * J.L('s')); if (from) { jackOut.root.position.set(W3(from.p.x, J.pos.x, k), W3(from.p.y, J.pos.y, k), W3(from.p.z, J.pos.z, k)); jackOut.root.quaternion.copy(from.q).slerp(J.q, k); } else { jackOut.root.position.copy(J.pos); jackOut.root.quaternion.copy(J.q); } for (const [pk, dk] of JKEYS) st.pose[pk] = from ? W3(from.pose[pk], J.L(dk), k) : J.L(dk); };
      const from = { p: jackOut.root.position.clone(), q: jackOut.root.quaternion.clone(), pose: { legLx: 0, legRx: 0, kneeL: 0, kneeR: 0, armLx: 0, armRx: 0, armLz: 0.08, armRz: -0.08, torso: 0, neckX: 0 } };
      st.pose = Object.assign({}, from.pose); st.fz = null; st.scene = true; st.boxed = true; gst.p50 = hp;
      { const b0 = gst.bend; for (let i = 1; i <= 24; i++) { const k = ease(i / 24); gst.bend = W3(b0, 0.35, k); hp.w = k; putJack(from, k); await G.wait(0.04); } hp.w = 1; }
      { const h0 = gst.h; for (let i = 1; i <= 22; i++) { const k = ease(i / 22); gst.h = h0 + angDiff(0, h0) * k; placeGerda(); putJack(); await G.wait(0.04); } }       // (she turns, to face the room)
      { let want = 1.2; for (let bd = 0.35; bd <= 1.2; bd += 0.05) { gst.bend = bd; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); if (jackPose().pos.y <= 0.3) { want = bd; break; } }
        const b0 = 0.35; gst.bend = b0; for (let i = 1; i <= 26; i++) { const k = ease(i / 26); gst.bend = W3(b0, want, k); placeGerda(); putJack(); await G.wait(0.04); } }       // (and bends, to set him down)
      await G.wait(0.2);
      { const J = jackPose(), hd = new THREE.Euler().setFromQuaternion(J.q, 'YXZ').y; st.pos.set(J.pos.x, 0, J.pos.z); st.y = Math.max(0, J.pos.y); st.heading = hd; jackOut.root.quaternion.identity(); jackOut.root.rotation.set(0, hd, 0); st.pose = null; st.boxed = false; st.scene = false; st.vy = 0; st.standY = 0; st.walkN = 0; st.frozen = false; }       // (he is let go, and stands)
      for (let i = 1; i <= 12; i++) { hp.w = 1 - ease(i / 12); gst.bend *= 0.92; placeGerda(); await G.wait(0.04); } gst.p50 = null; rest(0.5); gst.walk = 0;
      await sayW('gerda', 'Now come along, Jack. Follow me, and stay close.');
      // the walk: she goes ahead; he follows at his own pace, and she waits when he lags
      const route = gnav(gst.x, gst.z, 238, -75).concat([[262, -75], [274, -92], [274, -110], [273, -135], [273, -198], [274, -216], [276, -236], [274, -250]]);
      const tgt = new V3(274, 0, -250), start = new V3(st.pos.x, 0, st.pos.z), D0 = start.distanceTo(tgt);
      let prog = 0, pen = 0; const S0 = st.s;
      const zones = [{ hit: p => p.x < 118 && p.z > -56 && p.z < 6, fix: p => { p.x = 118; }, line: 'Jack! No dawdling, now. Come along, and keep being good for me.', n: 0, t: 0 },
        { hit: p => p.x > 299 && p.x < 384 && p.z > -203 && p.z < -114, fix: p => { p.x = 299; }, line: 'Not in there, Jack, no dawdling. Come along, and keep being good.', n: 0, t: 0 }];
      st.guard = () => { const p = st.pos; for (const z of zones) if (z.hit(p)) { z.fix(p); const now = performance.now(); if (now - z.t > 3500) { z.t = now; if (z.n++ === 0) { pen += 0.05; G.caption('gerda', z.line); } else { pen += 0.02; G.caption('gerda', 'Jack!'); } gst.talk = 1; setTimeout(() => { gst.talk = 0; }, 1800); } } };       // (kept from the hall and the bathroom: 5 per cent for the first try, 2 for each after, and never below half)
      const grow = () => { const here = new V3(st.pos.x, 0, st.pos.z); prog = Math.max(prog, clamp(1 - here.distanceTo(tgt) / D0, 0, 1)); const want = Math.max(0.5 * FULL, S0 + (0.2 * prog - pen) * FULL); st.s += (want - st.s) * 0.05; };
      const near = () => Math.hypot(st.pos.x - gst.x, st.pos.z - gst.z);
      for (const [wx, wz] of route) { while (Math.hypot(wx - gst.x, wz - gst.z) > 1.2) { grow();
          if (near() > 75) { gst.walk = 0; gst.h += angDiff(Math.atan2(st.pos.x - gst.x, st.pos.z - gst.z), gst.h) * 0.1; } else { const d = Math.hypot(wx - gst.x, wz - gst.z), stp = Math.min(1, d); gst.h += angDiff(Math.atan2(wx - gst.x, wz - gst.z), gst.h) * 0.3; gst.x += (wx - gst.x) / d * stp; gst.z += (wz - gst.z) / d * stp; gst.ph += 0.4; gst.walk = 1; }
          placeGerda(); await G.wait(0.04); } }
      gst.walk = 0; for (let i = 0; i < 12; i++) { gst.h += angDiff(-Math.PI / 2, gst.h) * 0.3; grow(); placeGerda(); await G.wait(0.04); }       // (she stops by the bucket)
      while (near() > 30) { grow(); gst.h += angDiff(Math.atan2(st.pos.x - gst.x, st.pos.z - gst.z), gst.h) * 0.08; placeGerda(); await G.wait(0.04); }       // (and waits for him: the beat ends when he reaches her)
      st.guard = null; await G.wait(0.5); await G.fade(true, 1.4);
      G.updaters = G.updaters.filter(u => u !== gazeTick && u !== shortsTick); heldShorts.visible = false; st.gaze = null; gst.alive = 0; st.frozen = false; st.dressWait = null; st.fz = null;
    }
    // ── The chores: the hen's room. Gerda sets the task and leaves; the mechanics are the test level's (js/level.js), the hen's way of going on the Market Road's cow's. ──
    async function choreScene(skip) {
      const ease = k => k * k * (3 - 2 * k), W3 = (a, b, k) => a + (b - a) * k, IT = M.items, gp = k => IT[k].g, FLOOR = 0.5 * FULL;
      const cushionG = gp('henCushion'), cushion = cushionG.position, hen = cushionG.userData.hen;
      const roostD = M.doors.find(d => d.axis === 'z' && Math.abs(d.fixed + 208) < 3 && Math.abs(d.c - 273) < 8);
      const mk = (w, h, d, col, x, y, z, par) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), root.Farm.plain(col)); m.position.set(x, y, z); par.add(m); return m; };
      const SQUAWK_LIMIT = 12, TIME_LIMIT = 300, SPILL_ABOVE = 27, RUNNING = 38, ALARM_R = 34, BUCKET = 50;
      if (!skip) G.save({ step: 'ch3chores' });
      $('cwPanel').style.display = 'none'; $('cwObjt').style.display = 'none'; G.mode = 'cutscene'; document.body.classList.add('cutscene'); G.skipping = false; G.cwState = st;
      { const f = $('fade'); f.style.transition = 'none'; f.style.opacity = 1; }
      st.scene = true; st.frozen = false; st.boxed = false; st.inHand = false; st.guard = null; st.fz = null; st.gaze = null; st.pose = null; st.vy = 0; st.walkN = 0; st.seated = false;
      jackOut.root.visible = gerda.root.visible = true; scene.attach(jackOut.root); jackOut.root.quaternion.identity(); G.captionOff && G.captionOff();
      if (jackOut.gear) jackOut.gear.knife.visible = jackOut.gear.satchel.visible = jackOut.gear.flask.visible = false;
      const doorTo = (ang, up) => { const d = roostD; if (!d) return; for (const sg of [1, -1]) { d.lg.rotation.y = sg * ang; d.og.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(d.lg); if (((bb.min.z + bb.max.z) / 2 > d.fixed) === up) break; } d.og.userData.noCollide = true; };
      cushionG.userData.henFree = true; M.room.attach(hen);
      const rackP = gp('henRack').position, buckP = gp('henBucket').position, binG = gp('henSack'), binP = binG.position, dishP = gp('henDish').position, troughP = gp('henTrough').position, wellP = gp('henWell').position, chairG = gp('roostChair'), chairP = chairG.position;
      const nod = async n => { for (let i = 0; i < n; i++) { for (let k = 1; k <= 8; k++) { st.pose = { neckX: 0.4 * Math.sin(Math.PI * k / 8) }; await G.wait(0.04); } await G.wait(0.08); } st.pose = null; };
      const faceG = async (tx, tz, secs) => { const h0 = gst.h, h1 = Math.atan2(tx - gst.x, tz - gst.z), n = Math.round((secs || 0.5) / 0.04); for (let i = 1; i <= n; i++) { gst.h = h0 + angDiff(h1, h0) * ease(i / n); placeGerda(); await G.wait(0.04); } };
      const walkG = async wps => { for (const [wx, wz] of wps) { while (Math.hypot(wx - gst.x, wz - gst.z) > 1) { const d = Math.hypot(wx - gst.x, wz - gst.z); gst.h += angDiff(Math.atan2(wx - gst.x, wz - gst.z), gst.h) * 0.3; gst.x += (wx - gst.x) / d * Math.min(0.95, d); gst.z += (wz - gst.z) / d * Math.min(0.95, d); gst.ph += 0.4; gst.walk = 1; placeGerda(); st.heading += angDiff(Math.atan2(gst.x - st.pos.x, gst.z - st.pos.z), st.heading) * 0.1; await G.wait(0.04); } } gst.walk = 0; placeGerda(); };
      const CAM_BOTH = () => G.cut({ pos: v(350, 46, -230), look: v(273, 32, -236), fov: 52 });
      // ── the places: Gerda just inside the door, facing the room; Jack before her, facing her ──
      const places = () => { st.scene = true; st.air = false; st.cl = null; st.mant = null; st.pos.set(273, 0, -246); st.y = 0; st.heading = 0; st.standY = 0; st.pose = null; st.seated = false; st.fz = null; jackOut.root.visible = gerda.root.visible = true;
        Object.assign(gst, { x: 273, z: -222, h: Math.PI, y: 0, seated: 0, walk: 0, reach: 0, lreach: 0, bend: 0, look: 0.2, headY: 0, p50: null, hold: 0, alive: 1 }); placeGerda(); root.Blocky.step(gerda, 0); doorTo(Math.PI / 2, true); };
      const leave = async () => { G.cut({ pos: v(290, 24, -246), look: v(273, 20, -214), fov: 46 }); await walkG([[273, -214], [273, -200]]);       // (she goes, and shuts the door behind her)
        for (let i = 0; i < 10; i++) { gst.h += angDiff(0, gst.h) * 0.3; placeGerda(); await G.wait(0.04); } await G.wait(0.3);
        if (roostD) { const a0 = roostD.lg.rotation.y; for (let i = 1; i <= 24; i++) { roostD.lg.rotation.y = a0 * (1 - ease(i / 24)); await G.wait(0.04); } roostD.og.userData.noCollide = false; A && A.thud && A.thud(0.5); }
        gerda.root.visible = false; await G.wait(0.8); };
      // ── the room's things ──
      const patches = []; for (let k = 1; k <= 14; k++) { const it = IT['dirt' + k]; if (!it) break; const g = it.g; patches.push({ g, x: g.position.x, z: g.position.z, amount: 1, r: g.children[0].geometry.parameters.width / 2, orig: true }); }
      const prints = [], extra = [];
      const underObj = (x, z) => { for (const e of C.near(x, z, 8)) if (!e.low && e.y0 < 4 && e.y1 > 1.5 && x > e.x0 - 3 && x < e.x1 + 3 && z > e.z0 - 3 && z < e.z1 + 3) return true; return false; };       // (what is under a thing cannot be seen, nor swept)
      const addPrint = (x, z, heading, size, bird) => { if (underObj(x, z)) return; const g = new THREE.Group(); g.position.set(x, 0.14, z); g.rotation.y = heading;
        if (bird) for (const a of [-0.5, 0, 0.5]) { const t = mk(0.5, 0.2, 2.2, '#3a2a18', Math.sin(a) * 1.3, 0, Math.cos(a) * 1.3, g); t.rotation.y = a; } else { mk(2.6 * size, 0.2, 6 * size, '#3a2a18', 0, 0, 0, g); mk(2 * size, 0.2, 1.6 * size, '#3a2a18', 0, 0, 3.8 * size, g); }
        M.room.add(g); prints.push({ g, x, z, amount: 1 }); if (prints.length > 90) { const o = prints.shift(); M.room.remove(o.g); } };
      const S = {}, H = { pos: new V3(), target: new V3() };
      const freshS = () => ({ sitting: false, dirt: 0, stride: 0, foot: 1, holding: null, water: 0, spillAcc: 0, spillCool: 0, chores: { sweep: false, dish: false, water: false, trust: false }, troughLevel: 0, speedN: 0, mv: 0, px: st.pos.x, pz: st.pos.z, stroke: 0, sweeping: false, sweepT: 99, workP: null, soothedAt: 0, soothN: 0, messN: 0, t: 0, done: false, doneAt: 0, scooping: false, binOpen: false, binRaids: 0, squawkT: 0, lie: false, sTarget: st.s, ended: false });
      const freshH = () => ({ mode: 'rest', trust: 50, restLeft: 15, timer: 2, cool: 0, heading: Math.PI, bob: 0, y: 9, scratch: 0, coax: 0, dirt: 0, stride: 0, tgtP: null, dirtWait: 0, sndT: 2, drinkT: 14, drink: 0, splashCool: 0, binCool: 0, binWait: 0 });
      const restFor = t => t >= 100 ? Infinity : 5 + 0.2 * t;       // (as in the test level: at least five seconds, two more for every ten per cent of trust, and at full trust she stays)
      const itm = { broom: { where: 'home', x: 0, z: 0 }, bucket: { where: 'home', x: 0, z: 0 } };
      // what he carries hangs from his right hand, in a carrier that cancels his own scale so that it stays the room's size
      const carrier = new THREE.Group(); carrier.position.y = -10; jackOut.armR.add(carrier);
      const broomMesh = () => { const b = new THREE.Group(); mk(0.9, 18, 0.9, '#8a6a40', 0, 9, 0, b); mk(3.4, 5, 2.2, '#c9b06a', 0, 2.5, 0, b); mk(3, 1, 2, '#6a5030', 0, 5.4, 0, b); return b; };
      const bucketMesh = () => { const b = new THREE.Group(); mk(4.4, 4, 4.4, '#7a5a38', 0, 2, 0, b); mk(0.5, 3, 0.5, '#4a3a2a', 0, 6, 0, b); return b; };
      const hBroom = new THREE.Group(), hBr = broomMesh(); hBr.rotation.x = 0.62; hBr.position.set(0, -9 * Math.cos(0.62), -9 * Math.sin(0.62)); hBroom.add(hBr); hBroom.visible = false; carrier.add(hBroom);
      const hBucket = new THREE.Group(); mk(4.4, 4, 4.4, '#7a5a38', 0, 2, 0, hBucket); const hWater = mk(3.6, 0.6, 3.6, '#6ab8f6', 0, 3.8, 0, hBucket); mk(0.5, 3, 0.5, '#4a3a2a', 0, 6, 0, hBucket); hBucket.position.set(0, -6, 6); hBucket.visible = false; carrier.add(hBucket);
      const hGrain = new THREE.Group(); mk(4, 3, 4, '#f0c64a', 0, 0, 0, hGrain); mk(4.6, 1, 4.6, '#7a5a38', 0, -1.8, 0, hGrain); hGrain.position.set(0, -4, 6); hGrain.visible = false; carrier.add(hGrain);
      const fBroom = broomMesh(), fBucket = bucketMesh(); fBroom.visible = fBucket.visible = false; M.room.add(fBroom); M.room.add(fBucket);
      const setHeld = what => { if (what && itm[what]) itm[what].where = 'held'; S.holding = what; hBroom.visible = what === 'broom'; hBucket.visible = what === 'bucket'; hGrain.visible = what === 'grain'; gp('henRack').userData.broom.visible = itm.broom.where === 'home'; gp('henBucket').userData.bucket.visible = itm.bucket.where === 'home'; fBroom.visible = itm.broom.where === 'floor'; fBucket.visible = itm.bucket.where === 'floor'; S.water = what === 'bucket' ? S.water : 0; };
      const putHome = name => { itm[name].where = 'home'; setHeld(null); };
      const itemPos = name => itm[name].where === 'floor' ? new V3(itm[name].x, 0, itm[name].z) : name === 'broom' ? rackP : buckP;
      const shrink = (frac, why) => { S.sTarget = Math.max(FLOOR, S.sTarget - frac * FULL); toast(why + ': −' + Math.round(frac * 100) + '%', 2600); };
      const hudEl = (() => { let e = $('cwTrustW'); if (!e) { e = document.createElement('div'); e.id = 'cwTrustW'; e.style.cssText = 'position:absolute;left:50%;top:12px;transform:translateX(-50%);width:200px;font-size:13px;text-align:center;background:rgba(10,12,16,0.7);border:1px solid #4a4d58;border-radius:8px;padding:5px 8px;pointer-events:none;color:#ece8df;'; e.innerHTML = 'The hen trusts you <b id="cwTrustV"></b><div style="height:7px;margin-top:4px;background:#222;border-radius:4px;overflow:hidden"><i id="cwTrustB" style="display:block;height:100%;width:0;background:#e6c46a"></i></div>'; $('cwHud') ? $('cwHud').appendChild(e) : document.body.appendChild(e); } return e; })();
      const dbgOpen = (() => { try { return localStorage.getItem('castle-consequence:dbg') === '1'; } catch (e) { return false; } })(), dbgState = { open: dbgOpen };
      const dbgEl = (() => { let e = $('cwDebug'); if (!e) { e = document.createElement('div'); e.id = 'cwDebug'; e.style.cssText = 'position:absolute;left:12px;top:12px;z-index:14;display:none;font:12px/1.45 monospace;color:#d8f0d0;pointer-events:auto;';
          e.innerHTML = '<button id="cwDbgBtn" style="font:12px monospace;color:#d8f0d0;background:rgba(10,12,16,0.78);border:1px solid #4a6a4a;border-radius:6px;padding:4px 10px;cursor:pointer;"></button><pre id="cwDbgBody" style="margin:4px 0 0;padding:8px 10px;background:rgba(10,12,16,0.78);border:1px solid #4a6a4a;border-radius:6px;white-space:pre;"></pre>';
          $('cwHud') ? $('cwHud').appendChild(e) : document.body.appendChild(e); const b = e.querySelector('#cwDbgBtn'); b.onclick = ev => { ev.stopPropagation(); dbgState.open = !dbgState.open; try { localStorage.setItem('castle-consequence:dbg', dbgState.open ? '1' : '0'); } catch (x) { /* no storage */ } }; b.addEventListener('pointerdown', ev => ev.stopPropagation()); } return e; })();
      const setTrough = () => { const w = gp('henTrough').userData.water, f = S.troughLevel / 100; w.visible = f > 0.02; w.scale.y = Math.max(0.2, f); w.position.y = 3.65 + 0.35 * Math.max(0.2, f); };
      // the feed bin: its lid opens toward the room, whichever way the bin is turned
      const lid = binG.userData.box.lid; let lidSign = -1;
      { const ry = binG.rotation.y, lean = { x: Math.sin(ry), z: Math.cos(ry) }, px = binP.x + lean.x * 14, pz = binP.z + lean.z * 14; if (px < 256 || px > 416 || pz > -214 || pz < -326) { lid.position.z = 5; lid.rotation.y = Math.PI; lidSign = 1; } else { lid.position.z = -5; lid.rotation.y = 0; } }
      const lidTo = async (to, secs) => { const from = lid.rotation.x, n = Math.max(1, Math.round(secs / 0.04)); for (let i = 1; i <= n; i++) { lid.rotation.x = W3(from, to, ease(i / n)); await G.wait(0.04); } lid.rotation.x = to; };
      const openBin = async () => { if (S.binOpen || S.scooping) return; S.scooping = true; await lidTo(1.15 * lidSign, 0.4); S.binOpen = true; S.scooping = false; };
      const closeBin = async () => { if (!S.binOpen || S.scooping) return; S.scooping = true; await lidTo(0, 0.4); S.binOpen = false; A && A.thud && A.thud(0.25); S.scooping = false; };
      const scoop = async () => { if (S.scooping || !S.binOpen) return; S.scooping = true; setHeld('grain'); A && A.blip && A.blip(); S.scooping = false; };
      // the hen
      const onCushion = p => Math.abs(p.x - cushion.x) < 11 && Math.abs(p.z - cushion.z) < 11;
      const roam = () => new V3(W3(266, 408, Math.random()), 0, W3(-320, -222, Math.random()));
      const dist = p => Math.hypot(p.x - st.pos.x, p.z - st.pos.z);
      const startRest = () => { H.mode = 'rest'; H.restLeft = restFor(H.trust); };
      const flee = from => { const away = H.pos.clone().sub(from); away.y = 0; if (away.lengthSq() < 0.01) away.set(1, 0, 0.3); away.normalize(); const t = H.pos.clone().addScaledVector(away, 34); t.x = clamp(t.x, 266, 408); t.z = clamp(t.z, -320, -222); H.target = t; H.mode = 'flee'; };
      const addPatch = (x, z, amount, why, tag) => { if (patches.length >= 22) return null; let px = clamp(x, 262, 410), pz = clamp(z, -322, -214); for (let k = 0; k < 10 && underObj(px, pz); k++) { const a = Math.random() * 6.28, r = 8 + k * 4; px = clamp(x + Math.cos(a) * r, 262, 410); pz = clamp(z + Math.sin(a) * r, -322, -214); } if (underObj(px, pz)) return null; const g2 = patches[0].g.clone(true); M.room.add(g2); g2.position.set(px, 0, pz); const p = { g: g2, x: g2.position.x, z: g2.position.z, amount, r: patches[0].r, tag: tag || null }; patches.push(p); S.chores.sweep = false; if (why) toast(why, 2600); return p; };
      const nextDirt = () => { let best = null, bd = 1e9; for (const p of patches) { if (p.amount < 0.15 || p === S.workP || Math.hypot(p.x - st.pos.x, p.z - st.pos.z) < 24) continue; const d = Math.hypot(p.x - H.pos.x, p.z - H.pos.z); if (d < bd) { best = p; bd = d; } } return best; };
      const mess = p => { p.amount = Math.min(1, p.amount + 0.7); if (Math.random() < 0.6) { const ang = Math.random() * 6.28; addPatch(p.x + Math.cos(ang) * 11, p.z + Math.sin(ang) * 11, 0.8); } S.chores.sweep = false;
        S.messN++; if (S.messN === 1 || S.messN % 4 === 0) G.caption('jack', ['Oh, no. She’s making more of a mess than I’m clearing!', 'She’s undoing it as fast as I sweep!', 'Not there, girl! I only just cleared that.'][(S.messN / 4 | 0) % 3]); };
      const cluck = (kind, v0) => { A && A.cluck && A.cluck(kind, v0); };
      const updateHen = dt => {
        const hx = H.pos.x, hz = H.pos.z, d = dist(H.pos), sneaking = S.speedN < 18, running = S.speedN > RUNNING; H.cool = Math.max(0, H.cool - dt); H.splashCool = Math.max(0, H.splashCool - dt); H.binCool = Math.max(0, H.binCool - dt); H.bob += dt * (H.mode === 'flee' ? 18 : 5);
        if (H.mode !== 'rest') H.trust = Math.max(0, H.trust - 0.2 * dt);       // (unsettled, her trust leaks away)
        if (running && d < ALARM_R && H.mode !== 'flee' && H.mode !== 'rest') { flee(st.pos); H.trust = Math.max(0, H.trust - 14); if (H.cool <= 0) { H.cool = 4; shrink(0.01, 'Startling the hen'); } }
        if (st.vy > 1 && d < 30 && H.mode !== 'flee' && H.mode !== 'rest' && H.cool <= 0) { flee(st.pos); H.trust = Math.max(0, H.trust - 7); H.cool = 4; }       // (landing beside her is no gentler)
        const binRadius = dist(binP) > 34;
        if (S.binOpen && binRadius && H.binCool <= 0 && H.mode !== 'flee' && H.mode !== 'bin' && !(H.mode === 'rest' && H.trust >= 100)) { H.mode = 'bin'; H.binWait = 0; H.scratch = 0; }       // (the lid left open: as soon as he is out of its reach, she is there)
        if (H.mode === 'bin' && !S.binOpen) H.mode = 'wander';
        if (H.mode === 'rest') {
          const dd = Math.hypot(cushion.x - H.pos.x, cushion.z - H.pos.z); if (dd > 0.5) { H.pos.x += (cushion.x - H.pos.x) / dd * Math.min(dd, 12 * dt); H.pos.z += (cushion.z - H.pos.z) / dd * Math.min(dd, 12 * dt); }
          H.restLeft = H.trust >= 100 ? Infinity : H.restLeft - dt; if (H.restLeft <= 0) { H.mode = 'wander'; H.timer = 1; H.target = roam(); }
        } else if (H.mode === 'flee') { const dd = Math.hypot(H.target.x - H.pos.x, H.target.z - H.pos.z); if (dd < 1) { if (onCushion(H.pos)) startRest(); else { H.mode = 'wander'; H.timer = 2; } } else { H.pos.x += (H.target.x - H.pos.x) / dd * Math.min(dd, 34 * dt); H.pos.z += (H.target.z - H.pos.z) / dd * Math.min(dd, 34 * dt); } }
        else if (H.mode === 'bin') {
          const dd = Math.hypot(binP.x - H.pos.x, binP.z - H.pos.z + 8);
          if (H.scratch > 0) { H.scratch -= dt; if (H.scratch <= 0) { S.binRaids++; H.binCool = 14; for (let i = 0; i < 3; i++) addPatch(binP.x + (Math.random() - 0.5) * 28, binP.z - 8 - Math.random() * 12, 1, null, 'grain'); G.caption('jack', ['Oh, no — she’s in the feed!', 'The lid! I left the lid up!'][S.binRaids % 2]); H.mode = 'wander'; H.timer = 2; H.target = roam(); } }
          else if (dd < 7) { H.scratch = 2; cluck('frantic', 0.6); } else { H.pos.x += (binP.x - H.pos.x) / dd * Math.min(dd, 13 * dt); H.pos.z += (binP.z - 8 - H.pos.z) / dd * Math.min(dd, 13 * dt); H.heading = Math.atan2(binP.x - H.pos.x, binP.z - H.pos.z); }
        } else if (H.mode === 'drink') {
          const tx = troughP.x, tz = troughP.z + 11, dd = Math.hypot(tx - H.pos.x, tz - H.pos.z);
          if (H.drink > 0) { H.drink -= dt; H.heading = Math.PI; if (H.drink <= 0) { S.troughLevel = Math.max(0, S.troughLevel - 16); setTrough(); H.mode = 'wander'; H.timer = 3; H.target = roam(); H.drinkT = 12 + Math.random() * 10; } }
          else if (dd < 3) H.drink = 3; else { H.pos.x += (tx - H.pos.x) / dd * Math.min(dd, 9 * dt); H.pos.z += (tz - H.pos.z) / dd * Math.min(dd, 9 * dt); H.heading = Math.atan2(tx - H.pos.x, tz - H.pos.z); }
        } else if (H.mode === 'dirt') {
          if (H.scratch > 0) { H.scratch -= dt; if (H.scratch <= 0 && H.tgtP) { mess(H.tgtP); H.tgtP = null; H.mode = S.sweepT < 10 ? 'dirt' : 'wander'; H.timer = 1.5; H.dirtWait = 1.2; } }
          else if (H.dirtWait > 0) H.dirtWait -= dt;
          else { if (!H.tgtP || H.tgtP.amount < 0.15 || H.tgtP === S.workP) H.tgtP = nextDirt(); if (!H.tgtP) H.mode = 'wander'; else { const dd = Math.hypot(H.tgtP.x - H.pos.x, H.tgtP.z - H.pos.z); if (dd < 5) H.scratch = 1.4; else { H.pos.x += (H.tgtP.x - H.pos.x) / dd * Math.min(dd, 11 * dt); H.pos.z += (H.tgtP.z - H.pos.z) / dd * Math.min(dd, 11 * dt); H.heading = Math.atan2(H.tgtP.x - H.pos.x, H.tgtP.z - H.pos.z); } } }
        } else {                                                                   // wandering
          H.coax = Math.max(0, H.coax - dt); H.drinkT -= dt;
          if (sneaking && S.speedN > 1 && d < ALARM_R) { const away = H.pos.clone().sub(st.pos); away.y = 0; away.normalize(); const tc = new V3(cushion.x - H.pos.x, 0, cushion.z - H.pos.z); if (tc.lengthSq() > 0.01) tc.normalize(); const dir = away.addScaledVector(tc, 1.3); if (dir.lengthSq() > 0.01) dir.normalize(); H.pos.addScaledVector(dir, 9 * dt); H.heading = Math.atan2(dir.x, dir.z); H.coax = 1.2; H.timer = 2; }       // (she moves on ahead of him, but leaning toward her cushion: so that creeping at her leads her there)       // (sneaking up on her, she moves on a little ahead of him: so that he can corral her)
          else if (H.drinkT <= 0 && S.troughLevel > 10) { H.mode = 'drink'; H.drink = 0; }       // (when there is water, she drinks from it at intervals)
          else { H.timer -= dt; const dd = Math.hypot(H.target.x - H.pos.x, H.target.z - H.pos.z); if (dd > 1) { H.pos.x += (H.target.x - H.pos.x) / dd * Math.min(dd, 9 * dt); H.pos.z += (H.target.z - H.pos.z) / dd * Math.min(dd, 9 * dt); H.heading = Math.atan2(H.target.x - H.pos.x, H.target.z - H.pos.z); } if (H.timer <= 0) { H.timer = 3 + Math.random() * 5; H.target = roam(); } }
          if (onCushion(H.pos) && (H.coax > 0 || H.trust >= 100)) startRest();
        }
        if (H.mode !== 'rest' && d < 20 && S.speedN < 2) H.trust = Math.min(100, H.trust + 3 * dt);       // (still and close, she warms a little)
        H.pos.x = clamp(H.pos.x, 264, 410); H.pos.z = clamp(H.pos.z, -322, -222);
        // through the water: chased across the trough, she runs through it, and tracks it about
        if (H.mode === 'flee' && S.troughLevel > 5 && Math.abs(H.pos.x - troughP.x) < 14 && Math.abs(H.pos.z - troughP.z) < 8 && H.splashCool <= 0) { H.splashCool = 3; S.troughLevel = Math.max(0, S.troughLevel - 25); setTrough(); addPatch(H.pos.x, H.pos.z + 6, 0.8, 'She runs straight through the trough!', 'water'); H.dirt = 6; }
        for (const p of patches) if (p.amount > 0.2 && Math.hypot(p.x - H.pos.x, p.z - H.pos.z) < p.r + 3 && H.mode !== 'rest') H.dirt = Math.max(H.dirt, 4);
        H.stride += Math.hypot(H.pos.x - hx, H.pos.z - hz); if (H.dirt > 0 && H.stride > 5) { H.stride = 0; H.dirt--; addPrint(H.pos.x + (Math.random() - 0.5) * 2, H.pos.z + (Math.random() - 0.5) * 2, H.heading, 1, true); S.chores.sweep = false; }
        // her voice: a contented cluck, a frantic one when chased, and a squawk when her trust is gone
        H.sndT -= dt; S.squawkT = H.trust < 20 ? S.squawkT + dt : Math.max(0, S.squawkT - dt * 2);
        if (H.sndT <= 0) { if (H.trust < 20) { cluck('squawk'); H.sndT = 1.1 + Math.random() * 0.6; } else if (H.mode === 'flee') { cluck('frantic'); H.sndT = 0.55 + Math.random() * 0.3; } else { cluck('content', 0.7); H.sndT = (H.mode === 'rest' ? 3 : 6) + Math.random() * 3; } }
        const rest = H.mode === 'rest', ty = rest ? 9 : 0; H.y += (ty - H.y) * Math.min(1, dt * 9);
        if (rest) H.heading = Math.atan2(st.pos.x - H.pos.x, st.pos.z - H.pos.z);
        hen.position.set(H.pos.x, H.y + (H.mode === 'flee' ? 1.2 * Math.abs(Math.sin(H.bob)) : 0), H.pos.z); let dr = H.heading - hen.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); hen.rotation.y += dr * Math.min(1, dt * 8);
        hen.rotation.z = H.mode === 'flee' || H.trust < 20 ? 0.1 * Math.sin(H.bob * 2) : rest ? 0.02 * Math.sin(H.bob * 0.3) : 0.03 * Math.sin(H.bob);
      };
      const SOOTHE = ['Easy, now. Easy, girl.', 'There you are. Nothing to be frightened of.', 'That’s it. Nice and quiet, the pair of us.', 'Good girl. You’re all right.', 'Steady. Nobody’s going to hurt you.'];
      const soothe = () => { const now = performance.now(); if (now < S.soothedAt) return; S.soothedAt = now + 2200; const line = SOOTHE[S.soothN++ % SOOTHE.length]; A && A.speak && A.speak('jack', line, 3, {}); G.caption('jack', line); H.trust = Math.min(100, H.trust + 15); if (H.mode === 'rest') H.restLeft = restFor(H.trust); st.heading += angDiff(Math.atan2(H.pos.x - st.pos.x, H.pos.z - st.pos.z), st.heading) * 0.8; };
      const pour = () => { const q = Math.min(S.water, 100 - S.troughLevel); S.troughLevel += q; S.water = 0; setTrough(); if (S.troughLevel >= 60) { S.chores.water = true; toast('The trough is ' + (S.troughLevel >= 99.5 ? 'full' : 'filled') + '. ✔', 2400); } else toast('You pour in some water, but she’ll want more than that.', 3000); };
      const front = d => ({ x: st.pos.x + Math.sin(st.heading) * d, z: st.pos.z + Math.cos(st.heading) * d });
      const dumpWater = why => { S.water = 0; shrink(0.02, why); const f = front(10); addPatch(f.x, f.z, 0.7, 'The water makes a muddy patch.', 'water'); };
      const drop = () => { const f = front(12);
        if (S.holding === 'broom') { itm.broom.where = 'floor'; itm.broom.x = f.x; itm.broom.z = f.z; fBroom.position.set(f.x, 1.2, f.z); fBroom.rotation.set(0, st.heading, Math.PI / 2); setHeld(null); toast('You lay the broom down.', 1800); }
        else if (S.holding === 'bucket') { if (S.water > 0) dumpWater('Dropping the water'); itm.bucket.where = 'floor'; itm.bucket.x = f.x; itm.bucket.z = f.z; fBucket.position.set(f.x, 2, f.z); fBucket.rotation.set(0, st.heading, 1.45); setHeld(null); toast('You set the bucket down on its side.', 1800); }
        else if (S.holding === 'grain') { setHeld(null); addPatch(f.x, f.z, 0.7, 'The grain scatters across the floor.', 'grain'); } };
      // the chair: he sits, and his legs swing; any movement stands him up
      const cr = chairG.rotation.y, frontDir = { x: Math.cos(cr), z: -Math.sin(cr) }, seatH = Math.atan2(frontDir.x, frontDir.z);
      const sit = () => { jackOut.root.updateMatrixWorld(true); const hy = jackOut.hips.getWorldPosition(new V3()).y - st.y; S.sitting = true; st.seated = true; st.fz = { x: chairP.x + frontDir.x * 3.5, y: Math.max(0, 13.5 - hy + 1.5), z: chairP.z + frontDir.z * 3.5 }; st.heading = seatH; st.walkN = 0; st.camA = Math.atan2(-Math.cos(seatH + 1.1), -Math.sin(seatH + 1.1)) + Math.PI; st.pitch = 0.25; camPos.set(0, 0, 0); };
      const standUp = () => { S.sitting = false; st.seated = false; st.pos.set(chairP.x + frontDir.x * 16, 0, chairP.z + frontDir.z * 16); st.y = 0; st.fz = null; st.vy = 0; st.pose = null; };
      // how it stands at the end
      const finalState = () => { const left = tag => patches.filter(p => p.tag === tag && p.amount > 0.05).length, t = H.trust;
        return { dirt: patches.filter(p => !p.tag && p.amount > 0.05).length, prints: prints.filter(p => p.amount > 0.05).length, water: left('water'), grain: left('grain'), litter: ['broom', 'bucket'].filter(n => itm[n].where !== 'home').length,
          dish: !S.chores.dish, trough: S.troughLevel < 60, stroked: S.chores.trust, bin: S.binOpen || S.binRaids > 0, hen: S.chores.trust || t >= 75 ? 'calm' : t < 25 ? 'frightened' : t < 60 ? 'wary' : 'calm' }; };
      const evidence = () => { const f = finalState(), r = [], at = (x, z) => ({ x, z }), tagged = tg => patches.find(p => p.tag === tg && p.amount > 0.05);       // (what he left, and where it lies, for the camera to cut to)
        if (f.dirt) { const p = patches.find(q => !q.tag && q.amount > 0.05); r.push(['left dirt on the floor', at(p.x, p.z)]); }
        if (f.prints) { const q = prints.find(u => u.amount > 0.05); r.push(['left muddy footprints about', at(q.x, q.z)]); }
        if (f.water) { const p = tagged('water'); r.push(['left spilled water on the floor', at(p.x, p.z)]); }
        if (f.grain) { const p = tagged('grain'); r.push(['left grain scattered about', at(p.x, p.z)]); }
        if (f.dish) r.push(['left her dish empty', at(dishP.x, dishP.z)]);
        if (f.trough) r.push([S.troughLevel > 0 ? 'left her trough only part full' : 'left her trough empty', at(troughP.x, troughP.z)]);
        if (f.litter) { const l = ['broom', 'bucket'].filter(n => itm[n].where !== 'home'), held = l.filter(n => itm[n].where === 'held'), q = itm[l[0]].where === 'held' ? st.pos : itemPos(l[0]); r.push([held.length === l.length ? 'still had the ' + l.join(' and the ') + ' in your hands' : 'left the ' + l.join(' and the ') + ' lying about', at(q.x, q.z)]); }
        if (S.binRaids) r.push(['let the hen into the feed', at(binP.x, binP.z)]); else if (S.binOpen) r.push(['left the feed bin open', at(binP.x, binP.z)]);
        if (f.hen === 'frightened') r.push(['left the hen frightened', at(H.pos.x, H.pos.z)]); else if (f.hen === 'wary') r.push(['left the hen wary', at(H.pos.x, H.pos.z)]); else if (!f.stroked) r.push(['never won the hen over', at(H.pos.x, H.pos.z)]);
        return r; };
      const reasons = () => evidence().map(e => e[0]);
      const demerits = () => { const f = finalState(); return (f.dirt ? 2 : 0) + (f.prints ? 0.5 + 0.25 * Math.min(f.prints, 6) : 0) + f.water + f.grain * 0.5 + (f.dish ? 2 : 0) + (f.trough ? 2 : 0) + f.litter * 0.5 + S.binRaids + (S.binOpen && !S.binRaids ? 0.5 : 0) + (f.hen === 'frightened' ? 2.5 : f.hen === 'wary' ? 1.5 : f.stroked ? 0 : 1); };
      const listOf = r => r.length <= 1 ? r.join('') : r.slice(0, -1).join(', ') + ' and ' + r[r.length - 1];
      const TIERS = [{ name: 'Token', hand: 14, paddle: 0, strength: 0.7, pace: 1.7 }, { name: 'Light', hand: 30, paddle: 0, strength: 0.85, pace: 1.8 }, { name: 'Firm', hand: 44, paddle: 0, strength: 0.9, pace: 1.9 }, { name: 'Severe', hand: 52, paddle: 0, strength: 1.0, pace: 2.0 }];
      const buildPlan = minTier => { const d = demerits(); let tier = d < 0.01 ? 0 : d < 1.5 ? 1 : d < 4 ? 2 : 3; if (S.lie) tier = Math.min(3, tier + 1); tier = Math.max(tier, minTier || 0); return Object.assign({ tier }, TIERS[tier]); };
      // ── a round: everything back as it was, and the player let loose ──
      const resetRoom = () => {
        for (const p of patches.slice()) { if (p.orig) { p.amount = 1; p.g.visible = true; p.g.scale.setScalar(1); p.tag = null; } else { M.room.remove(p.g); patches.splice(patches.indexOf(p), 1); } }
        for (const q of prints) M.room.remove(q.g); prints.length = 0;
        Object.assign(S, freshS()); Object.assign(H, freshH()); H.pos.set(cushion.x, 0, cushion.z); H.restLeft = restFor(H.trust);
        itm.broom.where = itm.bucket.where = 'home'; setHeld(null); lid.rotation.x = 0; gp('henDish').userData.grain.visible = false; setTrough();
        hen.position.set(cushion.x, 9, cushion.z); hen.rotation.set(0, Math.PI, 0); hen.visible = true; S.sTarget = st.s;
      };
      const playRound = () => new Promise(resolve => {
        G.save({ step: 'ch3chorework', chSize: st.s });       // (a save point: the work begins)
        st.chore = { S, H, patches, prints, itm }; st.scene = false; G.mode = 'play'; document.body.classList.remove('cutscene'); st.pose = null; st.camA = 0.15; st.pitch = 0.42; st.zoom = 1; camPos.set(0, 0, 0); st.heading = Math.PI; st.walkN = 0; $('cwObjt').style.display = 'none'; hudEl.style.display = 'block'; S.px = st.pos.x; S.pz = st.pos.z;
        G.cut({ pos: v(st.pos.x + 55, 36, st.pos.z - 10), look: v(st.pos.x, 10, st.pos.z), fov: 48 });
        let prevSweeping = false; const end = kind => { if (S.ended) return; S.ended = true; st.choreTick = null; resolve({ kind, clock: kind === 'time' }); };
        st.choreTick = dt => {
          S.t += dt; const sc = SC * st.s; carrier.scale.setScalar(1 / sc);
          st.s += (S.sTarget - st.s) * Math.min(1, dt * 4);
          if (st.pos.z > -213) st.pos.z = -213;       // (the door is shut, and he stays in)
          { S.mv = Math.hypot(st.pos.x - S.px, st.pos.z - S.pz); const inst = S.mv / Math.max(dt, 1e-3) / (SC * Math.pow(st.s, 0.6)); S.speedN += (inst - S.speedN) * Math.min(1, dt * 8); S.px = st.pos.x; S.pz = st.pos.z; }
          // the broom sweeps what is in front of it, a stroke at a time
          S.stroke = Math.max(0, S.stroke - dt); S.sweeping = S.holding === 'broom' && S.stroke > 0; S.workP = null;
          if (S.sweeping) { const f = new V3(st.pos.x + Math.sin(st.heading) * 14, 0, st.pos.z + Math.cos(st.heading) * 14); for (const p of patches) if (p.amount > 0 && Math.hypot(p.x - f.x, p.z - f.z) < p.r + 8) { S.workP = p; p.amount = Math.max(0, p.amount - dt / 1.1); } for (const q of prints) if (q.amount > 0 && Math.hypot(q.x - f.x, q.z - f.z) < 10) q.amount = Math.max(0, q.amount - dt / 0.5); }
          if (S.sweeping) { S.sweepT = 0; if (!prevSweeping && (H.trust < 100 || H.mode !== 'rest') && H.mode !== 'bin') { H.mode = 'dirt'; H.tgtP = nextDirt(); H.scratch = 0; H.dirtWait = 0.3; } } else S.sweepT += dt; prevSweeping = S.sweeping;
          for (const p of patches) { p.g.visible = p.amount > 0.02; p.g.scale.setScalar(0.4 + 0.6 * p.amount); } for (const q of prints) q.g.visible = q.amount > 0.05;
          for (const p of patches) if (p.amount > 0.2 && Math.hypot(p.x - st.pos.x, p.z - st.pos.z) < p.r + 2) S.dirt = 7;
          S.stride += S.mv; if (S.dirt > 0 && S.stride > 6 * sc && !S.sitting) { S.stride = 0; S.dirt--; S.foot = -S.foot; addPrint(st.pos.x + Math.cos(st.heading) * 1.8 * sc * S.foot, st.pos.z - Math.sin(st.heading) * 1.8 * sc * S.foot, st.heading, sc, false); S.chores.sweep = false; }
          if (!S.chores.sweep && patches.every(p => p.amount <= 0.02) && prints.every(q => q.amount <= 0.05)) { S.chores.sweep = true; toast('The floor is swept clean. ✔', 2600); }
          S.chores.water = S.troughLevel >= 60;
          // the water slops if he runs with it
          if (S.holding === 'bucket' && S.water > 0 && S.speedN > SPILL_ABOVE) { const l = dt * 18 * (S.speedN - SPILL_ABOVE) / 23; S.water = Math.max(0, S.water - l); S.spillAcc += l; S.spillCool = Math.max(0, S.spillCool - dt); if (S.spillAcc >= 15 && S.spillCool <= 0) { S.spillAcc -= 15; S.spillCool = 1.5; shrink(0.02, 'Spilling the water'); addPatch(st.pos.x, st.pos.z, 0.6, null, 'water'); } }
          if (S.holding === 'bucket') { hWater.scale.y = Math.max(0.01, S.water / BUCKET); hWater.visible = S.water > 2; }
          if (S.sitting) { if (keys.up || keys.down || keys.left || keys.right || Math.hypot(stick.x, stick.y) > 0.3 || st.jumpReq) { st.jumpReq = false; standUp(); } else { const kick = (1 - clamp((st.s / FULL - 0.5) / 0.45, 0, 1)) * 0.9, t = S.t * 7; st.pose = { legLx: -1.5 + kick * 0.08 * Math.sin(t), legRx: -1.5 - kick * 0.08 * Math.sin(t), kneeL: 1.5 - 1.1 * kick * (0.5 + 0.5 * Math.sin(t)), kneeR: 1.5 - 1.1 * kick * (0.5 + 0.5 * Math.sin(t + Math.PI)), armLx: -0.25, armRx: -0.25, armLz: 0.15, armRz: -0.15, torso: 0, neckX: 0 }; } }
          if (S.sitting) { /* (seated: the pose above) */ } else if (S.holding) { const sw = S.sweeping ? 0.3 * Math.sin(S.t * 14) : 0; st.pose = { armRx: (S.holding === 'broom' ? -0.9 : -1.15) + sw, armLx: S.holding === 'broom' ? -0.5 : -1.15, armRz: -0.1, armLz: 0.1 }; hBroom.rotation.z = S.sweeping ? 0.35 * Math.sin(S.t * 14) : 0; } else st.pose = null;
          updateHen(dt);
          if (H.trust >= 100 && H.mode === 'rest' && !S.chores.trust) { S.chores.trust = true; toast('The hen settles on her cushion, and lets you near. ✔', 3000); }
          if (H.trust < 100 && S.chores.trust && H.mode !== 'rest') S.chores.trust = false;
          // E: an action (the nearest); Q: take up or put down
          const act = st.actReq, put = st.putReq; st.actReq = st.putReq = false; const pr = promptEl(); let bE = null, bQ = null, fE = null, fQ = null;
          const addE = (p, r, label, fn) => { const d = dist(p); if (d < r && (!bE || d < bE.d)) bE = { d, label, fn }; }, addQ = (p, r, label, fn) => { const d = dist(p); if (d < r && (!bQ || d < bQ.d)) bQ = { d, label, fn }; };
          if (S.sitting) addE(chairP, 400, 'Stand up', standUp);
          else {
            if (!S.holding) { for (const nm of ['broom', 'bucket']) addQ(itemPos(nm), nm === 'broom' && itm.broom.where === 'home' ? 28 : 24, 'Take the ' + nm, () => { setHeld(nm); S.water = 0; }); if (S.binOpen) addQ(binP, 26, 'Scoop grain', scoop); }
            else { if (S.holding === 'broom') addQ(rackP, 28, 'Hang up the broom', () => putHome('broom')); if (S.holding === 'bucket') addQ(buckP, 24, 'Put the bucket back', () => { if (S.water > 0) dumpWater('Putting it back full'); putHome('bucket'); }); if (S.holding === 'grain') addQ(binP, 26, 'Tip it back', () => setHeld(null)); fQ = { d: 1e9, label: 'Put it down', fn: drop }; }
            addE(binP, 26, S.binOpen ? 'Close the bin' : 'Open the bin', S.binOpen ? closeBin : openBin);
            if (!S.holding) addE(chairP, 26, 'Sit on the chair', sit);
            if (S.holding === 'broom') fE = { d: 1e9, label: 'Sweep', fn: () => { S.stroke = 0.9; } };
            if (S.holding === 'bucket') { addE(wellP, 32, S.water < BUCKET ? 'Fill the bucket' : 'Full', () => { if (S.water < BUCKET) { S.water = BUCKET; S.spillAcc = 0; toast('You fill the bucket. Walk, so that it does not slop.', 2600); } }); if (S.water > 0) addE(troughP, 34, 'Pour into the trough', pour); if (S.water > 0) fE = { d: 1e9, label: 'Pour it out', fn: () => dumpWater('Pouring the water out') }; }
            if (S.holding === 'grain') addE(dishP, 22, 'Fill the dish', () => { if (Math.hypot(H.pos.x - dishP.x, H.pos.z - dishP.z) < 9) { toast('The hen is in the way of the dish.', 2400); return; } gp('henDish').userData.grain.visible = true; setHeld(null); S.chores.dish = true; toast('You fill her dish with grain. ✔', 2600); });
            if (S.holding !== 'broom' && !S.scooping) addE(H.pos, 30, 'Speak softly', soothe);       // (and not while he sweeps)
          }
          if (!bE && fE) bE = fE; if (!bQ && fQ) bQ = fQ;
          if (S.scooping) bE = bQ = null;
          if (act && bE) bE.fn(); if (put && bQ) bQ.fn();
          { const t = [bE ? 'E \u2014 ' + bE.label : '', bQ ? 'Q \u2014 ' + bQ.label : ''].filter(Boolean).join('     '); if (t) { pr.textContent = t; pr.style.display = 'block'; } else pr.style.display = 'none'; st.uiAct = bE ? bE.label : null; st.uiDrop = !!bQ; st.uiDropLabel = bQ ? (S.holding ? 'Put down' : 'Take') : null; }
          $('cwTrustV').textContent = Math.round(H.trust) + '%'; $('cwTrustB').style.width = H.trust + '%';
          { const ck = b => b ? '[x]' : '[ ]', c = S.chores, lim = Math.max(0, TIME_LIMIT - S.t), dn = S.doneAt ? Math.max(0, 4 - (S.t - S.doneAt)) : null;
            dbgEl.style.display = 'block'; dbgEl.querySelector('#cwDbgBtn').textContent = (dbgState.open ? '▾' : '▸') + ' Debug: chores and Gerda\'s return'; const body = dbgEl.querySelector('#cwDbgBody'); body.style.display = dbgState.open ? 'block' : 'none'; if (dbgState.open) body.textContent = 'CHORES\n' + ck(c.sweep) + ' swept   (dirt ' + patches.filter(p => p.amount > 0.02).length + ', prints ' + prints.filter(q => q.amount > 0.05).length + ')\n' + ck(c.dish) + ' dish filled\n' + ck(c.water) + ' trough >= 60%   (' + Math.round(S.troughLevel) + '%)\n' + ck(c.trust) + ' hen settled   (trust ' + Math.round(H.trust) + '%, ' + H.mode + ')\n' + ck(itm.broom.where === 'home') + ' broom put away  (' + itm.broom.where + ')\n' + ck(itm.bucket.where === 'home') + ' bucket put away (' + itm.bucket.where + ')\n' + ck(!S.holding) + ' hands empty' + (S.holding ? '  (' + S.holding + ')' : '') + '\n' + ck(!S.binOpen) + ' bin shut' + (S.binRaids ? '  (raids ' + S.binRaids + ')' : '') + '\n\nGERDA RETURNS\n  timer:    ' + lim.toFixed(0) + 's of ' + TIME_LIMIT + 's\n  all done: ' + (dn === null ? 'not yet' : 'in ' + dn.toFixed(1) + 's') + '\n  squawk:   ' + S.squawkT.toFixed(1) + 's of ' + SQUAWK_LIMIT + 's'; }
          // how the round ends: the hen left squawking, everything done (and a few moments to be sure), or the clock
          const done = ['sweep', 'dish', 'water', 'trust'].every(c => S.chores[c]) && itm.broom.where === 'home' && itm.bucket.where === 'home' && !S.holding;       // (not done until it is all put away) if (done && !S.doneAt) S.doneAt = S.t; if (!done) S.doneAt = 0;
          if (S.squawkT > SQUAWK_LIMIT) end('squawk'); else if (S.doneAt && S.t - S.doneAt > 4) end('done'); else if (S.t > TIME_LIMIT) end('time');
        };
      });
      // ── Gerda comes back, and asks how it went ──
      const returnScene = async out => {
        st.choreTick = null; $('cwPrompt').style.display = 'none'; hudEl.style.display = 'none'; dbgEl.style.display = 'none'; $('cwObjt').style.display = 'none'; st.uiAct = null; st.uiDrop = false;
        if (S.sitting) standUp(); st.seated = false; st.air = false; st.cl = null; st.mant = null;       // (what he is holding, he keeps holding)
        const undone = ['sweep', 'dish', 'water', 'trust'].filter(c => !S.chores[c]).length, lit = ['broom', 'bucket'].filter(n => itm[n].where !== 'home');
        if (undone) shrink(0.02 * undone, undone + ' chore' + (undone > 1 ? 's' : '') + ' left undone'); if (lit.length) shrink(0.01 * lit.length, lit.length > 1 ? 'The broom and bucket left lying about' : 'The ' + lit[0] + ' left lying about'); if (out.clock) shrink(0.02, 'Taking too long');
        st.s = S.sTarget; st.scene = true; G.mode = 'cutscene'; document.body.classList.add('cutscene'); st.vy = 0; st.walkN = 0; st.heading = Math.atan2(273 - st.pos.x, -212 - st.pos.z);
        hen.position.set(cushion.x, 9, cushion.z); hen.rotation.y = Math.PI;
        // the door opens, and she comes in to him
        Object.assign(gst, { x: 273, z: -196, h: Math.PI, y: 0, seated: 0, walk: 0, reach: 0, lreach: 0, bend: 0, look: 0.2, headY: 0, p50: null, hold: 0, alive: 1 }); placeGerda(); gerda.root.visible = true;
        { const a1 = (doorTo(Math.PI / 2, true), roostD ? roostD.lg.rotation.y : 0); if (roostD) { roostD.lg.rotation.y = 0; roostD.og.userData.noCollide = true; A && A.latch && A.latch(); for (let i = 1; i <= 24; i++) { roostD.lg.rotation.y = a1 * ease(i / 24); await G.wait(0.04); } roostD.lg.rotation.y = a1; } }
        const dj = new V3(273 - st.pos.x, 0, -212 - st.pos.z).normalize(), tx = clamp(st.pos.x + dj.x * 26, 264, 410), tz = clamp(st.pos.z + dj.z * 26, -320, -216), mx = (tx + st.pos.x) / 2, mz = (tz + st.pos.z) / 2;
        const behind = g => { const dx = g.x - st.pos.x, dz = g.z - st.pos.z, d = Math.hypot(dx, dz) || 1; return { pos: v(clamp(st.pos.x - dx / d * 46, 258, 414), 33, clamp(st.pos.z - dz / d * 46, -324, -216)), look: v(g.x, 33, g.z), fov: 48 }; };       // (from behind him, on her)
        st.pose = S.holding ? { armRx: S.holding === 'broom' ? -0.9 : -1.15, armLx: S.holding === 'broom' ? -0.5 : -1.15, armRz: -0.1, armLz: 0.1 } : null; hBroom.rotation.z = 0; st.walkN = 0; st.jumpReq = false; G.cut(behind({ x: 273, z: -212 })); await G.fade(false, 0.8);
        await walkG([[273, -214], [tx, tz]]); gst.h = Math.atan2(st.pos.x - gst.x, st.pos.z - gst.z); st.heading = Math.atan2(gst.x - st.pos.x, gst.z - st.pos.z); placeGerda(); G.cut(behind(gst));
        const rs = reasons();
        if (out.kind === 'squawk') {
          await sayW('gerda', 'Jack! What is all that noise? What have you done to her?');
          await sayW('gerda', 'Listen to her. Frightened half out of her feathers. Is this how you look after something precious?');
          await sayW('jack', 'I only— I didn’t mean to—');
          const plan = buildPlan(2); await sayW('gerda', 'No. You did not think.');
          await sayW('jack', 'Oh… I’m still sore from the last time.'); await sayW('gerda', 'Then you should have been gentler with her. Come here.');
          return { plan };
        }
        await sayW('gerda', out.kind === 'done' ? 'All finished already? Let me see.' : 'That is the afternoon, Jack.'); await sayW('gerda', 'So. How did it go with the hen?');
        const ci = await G.choose('jack', ['Tell her exactly what happened', 'Say it all went perfectly']);
        const lie = ci === 1 && rs.length > 0; if (lie) { S.lie = true; shrink(0.05, 'Lying to Gerda'); }
        await sayW('jack', ci === 0 ? (rs.length ? 'I ' + listOf(rs) + '.' : 'Everything done, and she lets me near her.') : 'It all went perfectly.');
        if (!rs.length) { await sayW('gerda', ci === 0 ? 'Good. I like it when it is true.' : 'It is true, too. Well done.'); W.paintJack(jackOut, { outfit: 'Day', trousers: 'up', drawers: 'up', expr: 'smile' }); await sayW('gerda', 'Good boy.'); await sayW('gerda', 'And you’re filthy, after all that. Come along. I’ve run you a nice warm bath.'); await sayW('jack', 'A bath? …Thank you, Gerda.'); return { praised: true }; }
        const plan = buildPlan(0);
        await sayW('gerda', ci === 0 ? 'Thank you for telling me straight. Let us go through it.' : 'Does it? Let us go through it, then.');
        for (const [text, at] of evidence()) { const sx = clamp(at.x + 30, 258, 414), sz = clamp(at.z + 32, -324, -216); G.cut({ pos: v(sx, 30, sz), look: v(at.x, 3, at.z), fov: 46 }); await sayW('gerda', 'You ' + text + '.'); }       // (and the camera goes to each thing as she names it)
        G.cut(behind(gst)); if (ci === 1) await sayW('gerda', 'And now you have lied to me about it as well, which is the part that earns the extra.');
                await sayW('jack', 'Oh… I’m still sore from the last time.'); await sayW('gerda', 'Then you will know to take more care. Come here.');
        return { plan };
      };
      // ── the correction, over her knee in the roost ──
      const roostDiscipline = async plan => {
        if (!root.Lap) return;
        const LAP_S = 1.4, LAP_Y = 6 * LAP_S;
        await G.fade(true, 0.7);
        const lap = root.Lap.create(null, { external: { scene, camera: G.camera, renderer: G.renderer }, table: false, jackFull: 0.95 });
        lap.giver('gerda'); lap.outfit('gerda', 'Work'); lap.outfit('jack', 'Day'); lap.stage.scale.setScalar(LAP_S); lap.stage.position.set(chairP.x, LAP_Y, chairP.z); lap.stage.rotation.y = -Math.PI / 2; lap.stage.updateMatrixWorld(true);
        gerda.root.visible = false; jackOut.root.visible = false; chairG.visible = false; hen.position.set(cushion.x, 9, cushion.z);
        lap.reset(); lap.layers({ trousers: 'up', drawers: 'up' }); lap.armed(false); lap.implement('hand'); lap.place('lap', 0); lap.size(clamp(st.s / FULL, 0.5, 0.95)); lap.st.side = 'alt'; lap.st.noRecovery = true; lap.st.sound = true; lap.st.strength = plan.strength; lap.st.pace = plan.pace; lap.pain.ache = 0.35 * lap.pain.capacity();
        const lapTick = dt => lap.update(dt); G.updaters.push(lapTick);
        const Co = root.Correction, cam = Co.freeCam(G, roomBox(chairP.x, chairP.z)), panel = Co.ui(), camBtn = document.getElementById('corrCam'), redBtn = document.getElementById('corrRed'), RED = { red: true }; G.fc = cam.fc;
        let red = false, shown = null; redBtn.onclick = () => { red = true; lap.red(); G.captionOff && G.captionOff(); };
        const showUI = on => panel.classList.toggle('on', !!on);
        const stageView = (name, ms) => { const V = lap.views[name]; lap.stage.updateMatrixWorld(true); const P = lap.stage.localToWorld(v(...V.pos)); if (ms === 0) { P.x = clamp(P.x, 258, 412); P.z = clamp(P.z, -324, -214); P.y = Math.min(P.y, 60); } cam.go(P, lap.stage.localToWorld(v(...V.at)), 46, ms == null ? 700 : ms); shown = name; };
        const SETV = ['overview', 'behind', 'shoulder', 'face']; camBtn.onclick = () => stageView(SETV[(SETV.indexOf(shown) + 1) % SETV.length]);
        const say = async (who, text) => { if (red) throw RED; await G.say(who, text); if (red) throw RED; };
        const wait = async s => { await G.wait(s); if (red) throw RED; };
        const smacks = async n => { if (!n) return; lap.run(n); await G.wait(0.4); for (let i = 0; i < 700 && (lap.info().busy || lap.info().running); i++) { await G.wait(0.1); if (red) return; } };
        const step = async (line, n) => { if (red) throw RED; const l = line ? G.say(line[0], line[1]) : Promise.resolve(); await Promise.all([l, smacks(n)]); if (red) throw RED; };
        const GL = ['Hold still.', 'Hands where they are.', 'Every one of these was avoidable.', 'You know exactly why.', 'Stay over my knee.', 'I am not nearly done.', 'This is what comes of it.'], JL = ['Ow!', 'Ahh — sorry!', 'Please!', 'Ow, ow, ow!', 'I will do better, I promise!', 'It stings!', 'I am sorry, Gerda!'];
        let li = 0; const run = async n => { let left = n; while (left > 0) { const k = Math.min(4, left), line = li % 2 === 0 ? ['gerda', GL[(li >> 1) % GL.length]] : ['jack', JL[(li >> 1) % JL.length]]; li++; await step(line, k); left -= k; } };
        stageView('overview', 0);
        try { try {
          await G.fade(false, 0.7); showUI(true); await wait(0.5);
          await say('gerda', 'Over my knee, Jack. Hands out of the way.');
          if (plan.tier <= 1) { await run(plan.hand); await say('gerda', plan.tier === 0 ? 'There. Off you go.' : 'That will do.'); }
          else if (plan.tier === 2) { await run(Math.ceil(plan.hand / 3)); lap.layers({ trousers: 'down' }); A && A.blip && A.blip(); await say('gerda', 'Shorts down. You know why.'); await run(plan.hand - Math.ceil(plan.hand / 3)); await say('gerda', 'Nearly done.'); await run(6); }
          else { lap.layers({ trousers: 'down' }); A && A.blip && A.blip(); await say('gerda', 'Shorts down. This is what carelessness costs.'); await run(Math.ceil(plan.hand / 2)); lap.layers({ trousers: 'down', drawers: 'down' }); A && A.blip && A.blip(); await say('jack', 'No! Wait! You can’t—'); await say('gerda', 'I can, and I will.'); await run(plan.hand - Math.ceil(plan.hand / 2) - 6); await step(['jack', 'Please — no more!'], 6); await say('gerda', 'And that is the last of it.'); }
          await wait(0.5); await say('gerda', 'There. That is the end of it.');
          lap.layers({ drawers: 'up' }); A && A.blip && A.blip(); await wait(0.8); lap.layers({ trousers: 'up' }); A && A.blip && A.blip(); await wait(0.8);
        } catch (e) { if (e !== RED) throw e;       // Red: it ends here, and he is put right again, gently
          lap.stop(); G.captionOff && G.captionOff(); red = false; showUI(false); lap.st.sound = false; await G.say('jack', 'Red! No more, please!'); await G.say('gerda', 'Alright, Jack. I hear you. That is an end to it.');
          lap.layers({ drawers: 'up' }); await G.wait(0.8); lap.layers({ trousers: 'up' }); await G.wait(0.8); }
        } finally { showUI(false); G.cut({ pos: cam.fc.position.clone(), look: cam.controls.target.clone(), fov: cam.fc.fov }); cam.restore(); G.updaters = G.updaters.filter(u => u !== lapTick); }
        // afterwards: he stands before her, rubbing; she has a few words
        await G.fade(true, 0.8); lap.stage.visible = false; chairG.visible = true; G.captionOff && G.captionOff();
        scene.attach(jackOut.root); jackOut.root.quaternion.identity(); jackOut.root.rotation.set(0, Math.PI / 2, 0); gerda.root.visible = true; jackOut.root.visible = true; st.scene = true; st.boxed = false; st.inHand = false; st.walkN = 0;
        Object.assign(gst, { x: chairP.x, z: chairP.z, h: -Math.PI / 2, y: 5.1, seated: 1, walk: 0, reach: 0, bend: 0, look: 0.3, headY: 0 }); placeGerda(); root.Blocky.step(gerda, 0); root.Blocky.seatFeet && root.Blocky.seatFeet(gerda, 0);
        st.pos.set(chairP.x - 30, 0, chairP.z); st.heading = Math.PI / 2; st.y = 0; W.paintJack(jackOut, { outfit: 'Day', expr: 'wince', trousers: 'up', drawers: 'up' });
        const rub = { thigh: 0, knee: 0, armLx: 0.3, armRx: 0.3, armLy: -1.4, armRy: 1.4, armLz: 0, armRz: 0, elbowL: -0.4, elbowR: -0.4, torso: 0.1, neckX: 0.35 }; st.pose = rub; let rubbing = true;
        const rubber = (async () => { for (let t = 0; rubbing; t += 0.04) { rub.armLx = 0.3 + 0.12 * Math.sin(t * 7); rub.armRx = 0.3 + 0.12 * Math.sin(t * 7 + 1.4); rub.elbowL = -0.4 - 0.1 * Math.sin(t * 7 + 0.5); rub.elbowR = -0.4 - 0.1 * Math.sin(t * 7 + 1.9); await G.wait(0.04); } })();
        G.cut({ pos: v(chairP.x - 44, 28, chairP.z - 48), look: v(chairP.x - 14, 18, chairP.z), fov: 44 }); await G.fade(false, 0.8); await G.wait(0.6);
        await sayW('gerda', 'There. Now. You will do it properly this time.');
        W.paintJack(jackOut, { outfit: 'Day', expr: 'shy', trousers: 'up', drawers: 'up' }); await sayW('jack', 'Yes, Gerda.');
        rubbing = false; await rubber; await G.fade(true, 0.9); st.pose = null; gst.seated = 0; gst.y = 0;
      };
      // ── the sequence ──
      places(); resetRoom(); W.paintJack(jackOut, { outfit: 'Day', trousers: 'up', drawers: 'up', expr: 'shy' });
      if (A && A.ctx) A.startMusic({ theme: 'castle' });
      CAM_BOTH();       // (the camera is in the room before the fade lifts, however the scene was reached)
      await G.fade(false, 1.2);
      if (!skip) {
        await G.wait(0.6);
        await sayW('gerda', 'Seeing as sitting patiently didn’t go so well, I have something to keep you in one place this afternoon. Nothing grand. Just care.');
        await nod(1); await sayW('jack', 'Yes, Gerda.');
        G.cut({ pos: v(276, 36, -230), look: v(320, 10, -270), fov: 46 }); faceG(cushion.x, cushion.z, 0.8);
        await sayW('gerda', 'This is the golden hen’s room, and that is she, on her cushion. She is precious, and she frightens very easily.');
        W.paintJack(jackOut, { outfit: 'Day', trousers: 'up', drawers: 'up', expr: 'smile' });
        await sayW('jack', 'She’s lovely. I won’t frighten her.');
        G.cut({ pos: v(322, 42, -240), look: v(rackP.x + 4, 16, (rackP.z + buckP.z) / 2), fov: 52 }); faceG(rackP.x, rackP.z, 0.8);
        await sayW('gerda', 'Three things want doing. The floor wants sweeping: the broom hangs on that rack, and the bucket stands beside it.');
        G.cut({ pos: v(binP.x + 22, 40, binP.z - 52), look: v(binP.x, 10, binP.z), fov: 52 }); faceG(binP.x, binP.z, 0.8);
        await sayW('gerda', 'Her dish wants filling from the feed bin there. Lift the lid, take a scoop, and mind that it shuts again behind you, or she will be in it.');
        G.cut({ pos: v(264, 54, -226), look: v((dishP.x + wellP.x) / 2, 8, (dishP.z + wellP.z) / 2), fov: 70 }); faceG(troughP.x, troughP.z, 0.8);
        await sayW('gerda', 'And her trough wants water from the well, carried without spilling a drop. Walk with the bucket, Jack. A boy who runs, spills.');
        CAM_BOTH(); faceG(st.pos.x, st.pos.z, 0.7);
        await sayW('gerda', 'Sweep, feed, water. Have you got all that?');
        await nod(2); await sayW('jack', 'Sweep, feed, water. Yes, Gerda.');
        await sayW('gerda', 'Now, the hen. You do not chase her, you do not run about the room, and you do not leave her frightened. Run, and she will run from you. Walk, and she will go about her business. If you want her back on her cushion, creep up on her slowly, and she will move on ahead of you. And speak softly to her. She is fond of a gentle voice.');
        await sayW('gerda', 'Can you be gentle for me, Jack?');
        await nod(1); await sayW('jack', 'I can. I promise. I’ll do just as I’m told.');
        await sayW('gerda', 'Good boy. I shall be back before the afternoon is out, and I shall want to see all of it done. Be good.');
        await leave();
      } else { if (roostD) { roostD.lg.rotation.y = 0; roostD.og.userData.noCollide = false; } gerda.root.visible = false; }       // (resumed at the work: the briefing is behind him, and the door shut)
      for (let round = 0; ; round++) {
        const out = await playRound(), res = await returnScene(out);
        if (res.praised) { await G.wait(0.8); break; }
        await roostDiscipline(res.plan);
        places(); resetRoom(); W.paintJack(jackOut, { outfit: 'Day', trousers: 'up', drawers: 'up', expr: 'shy' }); await G.fade(false, 0.9);       // (the level resets, and she sends him back to it)
        CAM_BOTH(); await G.wait(0.5); await sayW('gerda', 'Again, then. Sweep, feed and water, and gently with the hen. Properly, this time.'); await nod(1); await sayW('jack', 'Yes, Gerda.'); await leave();
      }
      st.seated = false; for (const q of prints) M.room.remove(q.g); hudEl.style.display = 'none'; dbgEl.style.display = 'none'; $('cwObjt').style.display = 'none'; $('cwPrompt').style.display = 'none'; st.pose = null; st.uiAct = null; hBroom.visible = hBucket.visible = hGrain.visible = false;
    }
    // ── Bath time: in the bathroom, with the door shut. Gerda kneels to take his things off, one at a time; then he is in the water, and she takes a sponge to him. ──
    async function bathScene() {
      const ease = k => k * k * (3 - 2 * k), W3 = (a, b, k) => a + (b - a) * k, tubG = M.items.tub.g, tubP = tubG.position, stoolP = M.items.bathStool.g.position, bath = M.room.userData.bath || {};
      const mk = (w, h, d, col, x, y, z, par) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), root.Farm.plain(col)); m.position.set(x, y, z); par.add(m); return m; };
      G.save({ step: 'ch3bath' });
      $('cwPanel').style.display = 'none'; $('cwObjt').style.display = 'none'; $('cwPrompt').style.display = 'none'; G.mode = 'cutscene'; document.body.classList.add('cutscene'); G.skipping = false; G.cwState = st; G.captionOff && G.captionOff();
      { const f = $('fade'); f.style.transition = 'none'; f.style.opacity = 1; }
      st.scene = true; st.frozen = false; st.boxed = false; st.inHand = false; st.guard = null; st.fz = null; st.gaze = null; st.pose = null; st.vy = 0; st.walkN = 0; st.seated = false; st.choreTick = null; st.air = false; st.cl = null; st.mant = null;
      jackOut.root.visible = gerda.root.visible = true; scene.attach(jackOut.root); jackOut.root.quaternion.identity();
      if (jackOut.gear) jackOut.gear.knife.visible = jackOut.gear.satchel.visible = jackOut.gear.flask.visible = false;
      { const bd = M.doors.find(d => d.axis === 'x' && Math.abs(d.fixed - 295) < 3 && Math.abs(d.c + 160) < 8); if (bd) { bd.lg.rotation.y = 0; bd.og.userData.noCollide = false; } }       // (the bathroom's door is shut)
      if (tubG.userData.water) tubG.userData.water.visible = true; if (tubG.userData.steam) tubG.userData.steam.on = true; if (bath.sink) bath.sink.visible = true;       // (the bath is run, and steams; so is the basin)
      // dusk: the daylight is gone, and the candles are the light of the room
      const Lg = M.room.userData.lights || {}, lsave = Lg.hemi ? { hi: Lg.hemi.intensity, hc: Lg.hemi.color.getHex(), gc: Lg.hemi.groundColor.getHex(), bl: Lg.bathLamp ? Lg.bathLamp.intensity : 0 } : null;
      const lampSave = (Lg.all || []).filter(l => l !== Lg.candle && l !== Lg.fill).map(l => [l, l.intensity]); for (const [l] of lampSave) l.intensity = 0.04;       // (every other lamp in the castle dims: it is dusk)
      if (Lg.hemi) { Lg.hemi.intensity = 0.1; Lg.hemi.color.setHex(0x8a7898); Lg.hemi.groundColor.setHex(0x3a3040); }
      const flick = () => { const t = G.t; if (Lg.candle) Lg.candle.intensity = 0.85 + 0.09 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23); if (Lg.fill) Lg.fill.intensity = 0.34 + 0.04 * Math.sin(t * 11 + 1); }; G.updaters.push(flick);
      const PS = SC * 0.7;
      const act = (label, key) => new Promise(res => { if (G.skipping) res(); else st.wait = { label, key: key || 'e', res }; });
      const dress = o => W.paintJack(jackOut, Object.assign({ outfit: 'Day', trousers: 'up', drawers: 'up' }, o));
      dress({ expr: 'shy' }); let cur = { expr: 'shy' }; const paint = o => { Object.assign(cur, o); dress(cur); };
      const props = (() => { const held = (build) => { const g = new THREE.Group(); build(g); g.scale.setScalar(PS * 1.1); g.visible = false; gerda.wrist.add(g); g.position.set(0, -6, 0.8); return g; }, onStool = (build, y) => { const g = new THREE.Group(); build(g); g.scale.setScalar(PS * 1.1); g.position.set(stoolP.x, 13.4 + y, stoolP.z); g.visible = false; scene.add(g); return g; };
        const tunicB = g => { mk(5.6, 0.7, 4.6, '#86ad72', 0, 0, 0, g); mk(0.9, 0.2, 2.4, '#8a6038', 0, 0.45, 0, g); }, shortsB = g => { mk(5.2, 0.8, 3.6, '#b8a173', 0, 0, 0, g); mk(5.2, 0.5, 0.6, '#9b855d', 0, 0.5, 1.6, g); }, drawB = g => { mk(5, 0.7, 3.4, '#e6dcc2', 0, 0, 0, g); mk(5, 0.4, 0.5, '#cbbf9f', 0, 0.4, 1.5, g); };
        return { heldTunic: held(tunicB), heldShorts: held(shortsB), heldDrawers: held(drawB), tunic: onStool(tunicB, 0), shorts: onStool(shortsB, 0.9), drawers: onStool(drawB, 1.7) }; })();
      const sponge = new THREE.Group(); mk(3.2, 2, 3.2, '#e6c84a', 0, 0, 0, sponge); mk(2.6, 0.4, 2.6, '#f0dc78', 0, 1.1, 0, sponge); sponge.scale.setScalar(PS * 1.2); sponge.visible = false; gerda.wrist.add(sponge); sponge.position.set(0, -6, 0.8);
      // ── her hands, and her kneeling (the helpers of the dressing, here too) ──
      const wr = () => gerda.wrist.localToWorld(new V3(0, -6, 0)), wl = () => gerda.wristL.localToWorld(new V3(0, -6, 0));
      const solveHand = (T, left) => { const sv = { bend: gst.bend, reach: gst.reach, lreach: gst.lreach }; let best = { d: 1e9, bd: 0, rc: 1 }; for (let bd = 0; bd <= 1.1; bd += 0.1) for (let rc = 0.3; rc <= 2.3; rc += 0.1) { gst.bend = bd; gst.reach = rc; gst.lreach = left ? rc : 0; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); const d = (left ? wl() : wr()).distanceTo(T); if (d < best.d) best = { d, bd, rc }; } Object.assign(gst, sv); placeGerda(); return best; };
      const pose = async (to, secs) => { const from = { bend: gst.bend, reach: gst.reach, lreach: gst.lreach }, n = Math.max(1, Math.round((secs || 0.5) / 0.04)); for (let i = 1; i <= n; i++) { const k = ease(i / n); for (const key in to) gst[key] = W3(from[key], to[key], k); placeGerda(); await G.wait(0.04); } };
      const handTo = async (T, both, secs) => { const b = solveHand(T, both); await pose({ bend: b.bd, reach: b.rc, lreach: both ? b.rc : 0 }, secs); return b; };
      const rest = secs => pose({ bend: 0, reach: 0, lreach: 0 }, secs || 0.5);
      const kneel = async (on, secs) => { gerda.root.updateMatrixWorld(true); const n = Math.max(1, Math.round((secs || 0.8) / 0.04)), y0 = gst.y, k0 = gst.kneel || 0; if (!kneel.drop) { const kk = gst.kneel; gst.kneel = 0; gst.y = 0; placeGerda(); root.Blocky.step(gerda, 0); gerda.root.updateMatrixWorld(true); kneel.drop = gerda.legL.knee.getWorldPosition(new V3()).y - 1.4; gst.kneel = kk; }
        for (let i = 1; i <= n; i++) { const k = ease(i / n); gst.kneel = W3(k0, on ? 1 : 0, k); gst.y = W3(y0, on ? -kneel.drop : 0, k); placeGerda(); await G.wait(0.04); } };
      const setDown = async (held, prop) => { await handTo(v(stoolP.x, 18, stoolP.z), false, 0.6); held.visible = false; prop.visible = true; A && A.blip && A.blip(); await rest(0.5); };
      const liftFoot = async (left, on) => { const n = 12; st.pose = st.pose || {}; for (let i = 1; i <= n; i++) { const k = on ? ease(i / n) : 1 - ease(i / n); st.pose.legLx = left ? W3(0, -0.55, k) : 0; st.pose.legRx = left ? 0 : W3(0, -0.55, k); st.pose.kneeL = left ? 0.9 * k : 0; st.pose.kneeR = left ? 0 : 0.9 * k; await G.wait(0.04); } };
      const nodJ = async n => { const base = (st.pose && st.pose.neckX) || 0; for (let i = 0; i < n; i++) { for (let k = 1; k <= 8; k++) { st.pose = Object.assign(st.pose || {}, { neckX: base + 0.35 * Math.sin(Math.PI * k / 8) }); await G.wait(0.04); } } };
      // ── the undressing: Jack standing, Gerda kneeling before him, the tub behind him ──
      Object.assign(gst, { x: 350, z: -146, h: Math.PI, y: 0, seated: 0, kneel: 0, walk: 0, reach: 0, lreach: 0, bend: 0, look: 0.3, headY: 0, p50: null, hold: 0, alive: 1 }); placeGerda(); root.Blocky.step(gerda, 0);
      st.pos.set(350, 0, -160); st.y = 0; st.heading = 0; st.standY = 0; st.pose = null;
      const camA = () => G.cut({ pos: v(299, 44, -153), look: v(351, 20, -153), fov: 62 }), camB = () => G.cut({ pos: v(306, 32, -152), look: v(351, 14, -155), fov: 52 });
      if (A && A.ctx) A.startMusic({ theme: 'castle' });
      camA(); await G.fade(false, 1.2); await G.wait(0.5);
      await kneel(true, 0.9);
      await sayW('gerda', 'Now, then. Let’s have you out of these before the water goes cold.');
      await sayW('jack', 'Yes, Gerda.');
      // the shorts
      await sayW('gerda', 'Shorts first. Step out of them for me.');
      await handTo(jackOut.hips.localToWorld(new V3(0, 0, 0)), true, 0.6);
      paint({ shorts: false }); props.heldShorts.visible = true; A && A.blip && A.blip(); await G.wait(0.3);
      await act('Step out');
      await liftFoot(true, true); await G.wait(0.2); await liftFoot(true, false); await liftFoot(false, true); await G.wait(0.2); await liftFoot(false, false);
      await setDown(props.heldShorts, props.shorts);
      // the tunic, over his head
      await sayW('gerda', 'And the tunic. Arms up high.');
      await act('Arms up');
      for (let i = 1; i <= 14; i++) { const k = ease(i / 14); st.pose = Object.assign(st.pose || {}, { armLx: W3(0, -2.9, k), armRx: W3(0, -2.9, k), armLz: W3(0.08, 0.25, k), armRz: W3(-0.08, -0.25, k) }); await G.wait(0.04); }
      await handTo(jackOut.torso.localToWorld(new V3(0, 3, 4)), true, 0.5); await handTo(jackOut.torso.localToWorld(new V3(0, 22, 0)), true, 0.7);
      paint({ strip: 1 }); props.heldTunic.visible = true; A && A.blip && A.blip(); await G.wait(0.3);
      for (let i = 1; i <= 14; i++) { const k = ease(i / 14); st.pose.armLx = W3(-2.9, 0, k); st.pose.armRx = W3(-2.9, 0, k); st.pose.armLz = W3(0.25, 0.08, k); st.pose.armRz = W3(-0.25, -0.08, k); await G.wait(0.04); }
      await setDown(props.heldTunic, props.tunic);
      // and the last, at which he turns bashful
      await sayW('gerda', 'And these, last of all.');
      camB(); await G.wait(0.3);
      await handTo(jackOut.hips.localToWorld(new V3(0, 0, 0)), true, 0.6);
      await act('Step out');
      paint({ strip: 2 }); props.heldDrawers.visible = true; A && A.blip && A.blip(); await G.wait(0.2);
      { const from = { armLx: st.pose.armLx || 0, armRx: st.pose.armRx || 0, armLz: st.pose.armLz || 0.08, armRz: st.pose.armRz || -0.08 }; const to = { armLx: -0.55, armRx: -0.55, armLz: -0.5, armRz: 0.5, elbowL: -0.2, elbowR: -0.2, torso: 0.3, neckX: 0.55 }, h0 = st.heading;       // (his hands cross low in front of him, he hunches, bends his knees, turns half away, and goes red)
        paint({ blush: true, expr: 'shy' });
        for (let i = 1; i <= 14; i++) { const k = ease(i / 14); st.pose = Object.assign(st.pose, { armLx: W3(from.armLx, to.armLx, k), armRx: W3(from.armRx, to.armRx, k), armLz: W3(from.armLz, to.armLz, k), armRz: W3(from.armRz, to.armRz, k), elbowL: to.elbowL * k, elbowR: to.elbowR * k, torso: to.torso * k, neckX: to.neckX * k, neckY: 0.5 * k, legLx: -0.3 * k, legRx: -0.3 * k, kneeL: 0.5 * k, kneeR: 0.5 * k }); st.heading = h0 + 0.85 * k; await G.wait(0.04); } }
      await setDown(props.heldDrawers, props.drawers);
      await G.wait(0.4);
      await sayW('jack', '…');
      await sayW('gerda', 'Oh, Jack. There’s no call for that. Hands down, now.');
      await act('Lower your hands');
      await sayW('gerda', 'A bath is only a bath, and nobody here is going to think the less of you for it. There’s a good boy.');
      { const from = { armLx: st.pose.armLx, armRx: st.pose.armRx, armLz: st.pose.armLz, armRz: st.pose.armRz, elbowL: st.pose.elbowL, elbowR: st.pose.elbowR, torso: st.pose.torso, neckX: st.pose.neckX, neckY: st.pose.neckY, legLx: st.pose.legLx, legRx: st.pose.legRx, kneeL: st.pose.kneeL, kneeR: st.pose.kneeR, hd: st.heading };
        for (let i = 1; i <= 26; i++) { const k = ease(i / 26); st.pose = Object.assign(st.pose, { armLx: W3(from.armLx, 0.05, k), armRx: W3(from.armRx, 0.05, k), armLz: W3(from.armLz, 0.1, k), armRz: W3(from.armRz, -0.1, k), elbowL: W3(from.elbowL, 0, k), elbowR: W3(from.elbowR, 0, k), torso: W3(from.torso, 0, k), neckX: W3(from.neckX, 0.25, k), neckY: W3(from.neckY, 0, k), legLx: W3(from.legLx, 0, k), legRx: W3(from.legRx, 0, k), kneeL: W3(from.kneeL, 0, k), kneeR: W3(from.kneeR, 0, k) }); st.heading = W3(from.hd, 0, k); await G.wait(0.04); } }       // (slowly, he lets them fall)
      await G.wait(0.6);
      await sayW('gerda', 'In you get, now. Mind the edge.');
      await act('Step into the bath');
      await G.fade(true, 0.9);
      // ── in the bath: he sits in the warm water, and she kneels at its side with a sponge ──
      for (const k of ['heldShorts', 'heldTunic', 'heldDrawers']) props[k].visible = false;
      await rest(0.01); gst.x = 352; gst.z = -155; gst.h = Math.PI; placeGerda();
      jackOut.root.updateMatrixWorld(true); { const hy = jackOut.hips.getWorldPosition(new V3()).y - st.y; st.pos.set(tubP.x + 6, 0, tubP.z); st.y = Math.max(0, 3.4 - hy + 1.2); }
      st.heading = -Math.PI / 2;       // (facing the door)
      st.air = false;
      { jackOut.root.position.set(st.pos.x, st.y, st.pos.z); jackOut.root.scale.setScalar(SC * st.s); jackOut.root.updateMatrixWorld(true); const wy = jackOut.hips.getWorldPosition(new V3()).y + 3.4 * SC * st.s; if (tubG.userData.water) tubG.userData.water.position.y = Math.min(10.4, wy - 0.25); }       // (the water comes up to his waist) st.walkN = 0; paint({ expr: 'smile' });
      st.pose = { legLx: -1.45, legRx: -1.45, kneeL: 0.25, kneeR: 0.25, armLx: -0.3, armRx: -0.3, armLz: 0.2, armRz: -0.2, elbowL: -0.5, elbowR: -0.5, torso: 0, neckX: 0.1 };
      sponge.visible = true;
      G.cut({ pos: v(299, 42, -146), look: v(352, 10, -172), fov: 62 }); await G.fade(false, 0.9); await G.wait(0.4);
      await sayW('gerda', 'There. Warm enough?');
      await sayW('jack', 'It’s lovely.');
      const scrub = async (T, secs, extra) => { const b = solveHand(T, false), n = Math.round(secs / 0.04); for (let i = 1; i <= n; i++) { const k = Math.min(1, i / 12); gst.bend = b.bd * k; gst.reach = b.rc * k + 0.14 * Math.sin(i * 0.5) * k; placeGerda(); if (extra) extra(i / n); await G.wait(0.04); } };
      const chest = () => jackOut.torso.localToWorld(new V3(0, 14, 3));
      await sayW('gerda', 'Chest first.'); await scrub(chest(), 3.2);
      await sayW('gerda', 'Lean forward for me, and I’ll do your back.');
      await act('Lean forward');
      for (let i = 1; i <= 10; i++) { st.pose.torso = 0.4 * ease(i / 10); await G.wait(0.04); }
      await scrub(jackOut.torso.localToWorld(new V3(0, 12, -4)), 3.2);
      for (let i = 1; i <= 10; i++) { st.pose.torso = 0.4 * (1 - ease(i / 10)); await G.wait(0.04); }
      await sayW('gerda', 'Now your arms. One, and the other.');
      await act('Raise an arm');
      for (let i = 1; i <= 12; i++) { st.pose.armRx = W3(-0.3, -1.3, ease(i / 12)); await G.wait(0.04); }
      await scrub(jackOut.armR.localToWorld(new V3(0, -6, 0)), 2.6);
      await act('Raise the other arm');
      for (let i = 1; i <= 12; i++) { st.pose.armRx = W3(-1.3, -0.3, ease(i / 12)); st.pose.armLx = W3(-0.3, -1.3, ease(i / 12)); await G.wait(0.04); }
      await scrub(jackOut.armL.localToWorld(new V3(0, -6, 0)), 2.6);
      for (let i = 1; i <= 12; i++) { st.pose.armLx = W3(-1.3, -0.3, ease(i / 12)); await G.wait(0.04); }
      await sayW('gerda', 'And now your legs.');
      await act('Lift a leg');
      { const T = jackOut.legR.knee.localToWorld(new V3(0, -2, 0)); T.y = Math.min(T.y, 7); await scrub(T, 3.6); }       // (her hand goes down into the water)
      await G.fade(true, 1.8);
      st.wait = null; sponge.visible = false; st.pose = null; gst.kneel = 0; gst.y = 0; if (tubG.userData.steam) tubG.userData.steam.on = false;
      G.updaters = G.updaters.filter(u => u !== flick); if (Lg.candle) Lg.candle.intensity = 0; if (Lg.fill) Lg.fill.intensity = 0; if (lsave) { Lg.hemi.intensity = lsave.hi; Lg.hemi.color.setHex(lsave.hc); Lg.hemi.groundColor.setHex(lsave.gc); } for (const [l, i] of lampSave) l.intensity = i;
    }
    function ch3Tick(dt) {
      if (st.guard && !st.frozen) st.guard();       // (the way to the roost: some places he is kept from)
      if (st.choreTick && !st.scene) { st.choreTick(dt); return; }       // (the hen's room: the chores are played in their own tick)
      if (st.frozen) { const act = st.actReq, pr = promptEl(); st.actReq = st.putReq = st.jumpReq = false;       // (being dressed: the one button answers what she asks)
        if (st.dressWait && !st.scene) { pr.textContent = 'E \u2014 ' + st.dressWait.label; pr.style.display = 'block'; st.uiAct = st.dressWait.label; if (act) { const r = st.dressWait.res; st.dressWait = null; st.uiAct = null; pr.style.display = 'none'; r(); } } else { pr.style.display = 'none'; st.uiAct = null; }
        return; }
      const act = st.actReq; st.actReq = false; const pr = promptEl(); pr.style.display = 'none'; st.uiAct = null; if (st.scene) return;
      for (const k in ZONES) { const z = ZONES[k], here = z.in(st.pos);
        if (here && !zoneIn[k]) { zoneIn[k] = true; const now = performance.now();
          if (!zoneSeen[k]) { zoneSeen[k] = true; lastRemark = now; z.first.reduce((pr2, t) => pr2.then(() => say(t)), Promise.resolve()); }
          else if (now - lastRemark > 4000 && z.again.length) { lastRemark = now; zoneN[k] = (zoneN[k] || 0) + 1; say(z.again[(zoneN[k] - 1) % z.again.length]); } }
        else if (!here) zoneIn[k] = false; }
      if (st.pos.z > -43 && st.pos.z < -8 && st.pos.x < -90 && st.pos.x > -275) {                                // the narrow corridor: the further he walks, the larger he is, from a quarter to a third and a bit
        const t = clamp((-90 - st.pos.x) / 183, 0, 1), target = 0.25 + 0.10 * t; if (target > st.s) { st.s = target; c3.grow = target; }
        if (t > 0.3 && !c3.g1) { c3.g1 = true; say('Odd. My boots are tighter than they were. Am I... bigger?'); }
        if (t > 0.95 && !c3.g2) { c3.g2 = true; say('A little more with every step. Whatever this place does to me, it isn’t finished.'); } }
      { const inN = st.pos.x > -312 && st.pos.x < -100 && (c3.inN ? st.pos.z < -158 : st.pos.z < -168) && st.pos.z > -292; if (inN !== !!c3.inN) { c3.inN = inN; if (inN && !opts.ch3notes) G.save({ step: 'ch3nursery' }); if (A && A.ctx && !opts.ch3notes) A.startMusic({ theme: inN ? 'nursery' : 'castle' }); } }       // (the nursery has its own music)
      if (c3.inN && !c3.done && st.pos.z > -163) {                                                          // (he does not leave the nursery without trying the chest: he stops at the door, and remarks on it)
        st.pos.z = -167;
        if (!c3.leaveAt || performance.now() - c3.leaveAt > 5000) { c3.leaveAt = performance.now(); c3.leaves = (c3.leaves || 0) + 1; say(c3.leaves === 1 ? 'I can’t leave with nothing. There might be something in that chest by the wall. I should at least look.' : ['Not before I’ve tried that chest.', 'The chest first.', 'There might still be something in that chest.'][(c3.leaves - 2) % 3]); } }
      if (!c3.n40 && st.pos.x > -312 && st.pos.x < -100 && st.pos.z < -166 && st.pos.z > -292) c3.n40 = true;                                  // (inside the nursery he grows to forty per cent, and says nothing of it)
      if (c3.n40 && st.s < 0.4) st.s = Math.min(0.4, st.s + dt * 0.03);
      if (!st.busy && !c3.done) { let best = null, bd = 1e9; for (const t of c3.targets) { const d = Math.hypot(t.g.position.x - st.pos.x, t.g.position.z - st.pos.z); if (d < LK[t.cat].r && d < bd) { best = t; bd = d; } }
        if (best) { pr.textContent = 'E — ' + (best.cat === 'chest' ? 'open the chest' : 'look at the ' + LK[best.cat].name); pr.style.display = 'block'; st.uiAct = best.cat === 'chest' ? 'Open' : 'Look'; if (act) doLook(best); } }
    }
    async function ch3Open() {
      const f = $('fade'), tgp = M.items.kitchenTable.g, TOP = 25.5, bx = M.items.keepsakeBox.g, box = bx.userData.box, tc = bx.position.clone(), bs = SC * st.s;
      $('cwPanel').style.display = 'none'; G.mode = 'cutscene'; document.body.classList.add('cutscene'); st.scene = true; st.boxed = true; G.save({ step: 'ch3' }); f.style.transition = 'none'; f.style.opacity = 1;
      const ease = k => k * k * (3 - 2 * k), W3 = (a, b, k) => a + (b - a) * k;
      // the room: the parlour's doors open into the kitchen; every other door stands open as it was built
      const pdoors = M.doors.filter(d => d.axis === 'x' && Math.abs(d.fixed - 250) < 3 && Math.abs(d.c + 75) < 6); for (const d of pdoors) { d.ang = swing(d); d.lg.rotation.y = d.ang; d.og.userData.noCollide = true; }
      makeG('Work'); gst.x = tc.x; gst.z = tc.z + 24; gst.h = Math.PI; placeGerda();
      // the folded clothes on the table (his day clothes), to be seen later
      const mk = (w, h, d, col, x, y, z, par) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), root.Farm.plain(col)); m.position.set(x, y, z); par.add(m); return m; };
      const clothes = new THREE.Group(); clothes.position.set(tc.x - 9, TOP, tc.z - 6); clothes.scale.setScalar(2); scene.add(clothes); ch3Items.clothes = clothes;
      mk(2.7, 0.7, 2.2, '#5a7a3e', 0, 0.35, 0, clothes); mk(0.9, 0.22, 0.5, '#e8dcb8', -0.4, 0.76, -0.8, clothes); mk(2.1, 0.5, 2.8, '#6d5233', 0.1, 0.95, 0.1, clothes); mk(0.3, 0.2, 2.3, '#8a6a42', -0.6, 1.3, 0.1, clothes); mk(0.9, 0.8, 2.1, '#3a2616', 2.1, 0.4, -0.6, clothes); mk(0.9, 0.8, 2.1, '#3a2616', 2.1, 0.4, 1.0, clothes);      // (his day clothes, folded, at the size of him now: a quarter, the tunic about as wide as his shoulders and a half again)
      // Jack, lying in the box on his back, head to the back of it, pressed in
      bx.add(jackOut.root); jackOut.root.scale.setScalar(bs); const YQ = new THREE.Quaternion().setFromAxisAngle(v(0, 1, 0), Math.PI / 2), qL = YQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))), qSit = YQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0))), qUp = YQ.clone(), TILT = YQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, 0, 0)));       // (he lies along the box with his head to its left, so that he sits up facing the parlour doors, and climbs out over the right-hand side)
      const pL = new V3(0, 1.2 + 2.6 * st.s, 3.5).applyQuaternion(YQ), pSit = new V3(0, 1.9, 0.7).applyQuaternion(YQ).sub(new V3(0, 12 * bs, 0).applyQuaternion(qSit)), pUp = new V3(0, 1.2, 0.7).applyQuaternion(YQ);
      jackOut.root.quaternion.copy(qL); jackOut.root.position.copy(pL); st.pose = { thigh: 0, knee: 0, armLx: 0.05, armLz: 0.25, armRx: 0.05, armRz: -0.25, torso: 0, neckX: -0.1, neckY: 0 }; W.paintJack(jackOut, { expr: 1 });
      // 1. in the dark: the box is carried and set down; what he notices
      gerda.root.updateMatrixWorld(true); G.cut({ pos: bx.localToWorld(new V3(0.06, 5.04, -4.26)), look: gerda.neck.localToWorld(new V3(0, 2.5, 0)).add(new V3(0.06, -1.16, -0.36)), fov: 54 });      // (from inside, up at where her face will be)
      const carry = (async () => { for (let i = 0; i < 9; i++) { A && A.thud && A.thud(0.22 + 0.04 * (i % 3)); bx.rotation.z = 0.025 * Math.sin(i * 1.7); bx.position.y = TOP + 0.5 * Math.abs(Math.sin(i * 1.3)); await G.wait(0.45); } A && A.thud && A.thud(0.6); bx.rotation.z = 0; bx.position.y = TOP; })();
      await G.wait(1.2);
      await sayW('jack', 'Something’s moving. The box... she’s carrying me.');
      await sayW('jack', 'The sides feel closer than they did. Tighter. As if the box has shrunk around me.');
      await carry; await G.wait(0.5);
      await sayW('jack', 'Did I sleep? How long have I been in here?');
      // 2. from inside the box: the lid is lifted, and the light comes up with it; Gerda, in her work clothes, above
      jackOut.root.visible = false; gst.bend = 0.3; gst.reach = 1.15; gst.lreach = 1.15; placeGerda(); await G.wait(0.7); A && A.latch && A.latch(0.6);
      for (let i = 1; i <= 64; i++) { const k = ease(i / 64); box.lid.rotation.x = -1.95 * k; f.style.opacity = 1 - Math.min(1, k * 1.2); gst.bend = W3(0.3, 0.1, k); placeGerda(); await G.wait(0.04); }
      f.style.transition = ''; f.style.opacity = 0;
      await sayW('gerda', 'Stay put, little one. Touch nothing until I return.');
      for (let i = 1; i <= 14; i++) { gst.reach = 1.15 * (1 - i / 14); gst.lreach = 1.15 * (1 - i / 14); gst.bend = 0.1 * (1 - i / 14); gst.h += angDiff(Math.PI / 2 - 0.4, gst.h) * 0.25; placeGerda(); await G.wait(0.04); }
      // 3. outside: she leaves by the parlour doors, which pull to behind her; he sits up and rubs his eyes, then looks about
      jackOut.root.visible = true; G.cut({ pos: v(146, 80, 20), look: v(198, 24, -50), fov: 52 });
      const gGo = async (wx, wz) => { const x0 = gst.x, z0 = gst.z, d = Math.hypot(wx - x0, wz - z0), n = Math.max(2, Math.ceil(d / 1.1)), h1 = Math.atan2(wx - x0, wz - z0); for (let i = 1; i <= n; i++) { const k = i / n; gst.x = x0 + (wx - x0) * k; gst.z = z0 + (wz - z0) * k; gst.h += angDiff(h1, gst.h) * 0.3; gst.ph += 0.4; gst.walk = 1; placeGerda(); await G.wait(0.04); } };
      const leave = (async () => { for (const [wx, wz] of gnav(gst.x, gst.z, 238, -75)) await gGo(wx, wz); await gGo(264, -75); gst.walk = 0; for (let i = 1; i <= 30; i++) { for (const d of pdoors) d.lg.rotation.y = d.ang + (Math.sign(d.ang) * 0.42 - d.ang) * ease(i / 30); await G.wait(0.04); } gerda.root.visible = false; })();
      const wake = (async () => {
        await G.wait(1.0);
        for (let i = 1; i <= 30; i++) { const k = ease(i / 30); jackOut.root.quaternion.copy(qL).slerp(qUp, k); jackOut.root.position.copy(pL).lerp(pUp, k); st.pose.thigh = 0; st.pose.knee = 0; st.pose.armLz = W3(0.25, 0.5, k); st.pose.armRz = W3(-0.25, -0.5, k); st.pose.armLx = st.pose.armRx = W3(0.05, -0.15, k); st.pose.neckX = W3(-0.1, 0.1, k); await G.wait(0.04); }      // (he stands up in the box, so that he is seen from outside it)
        W.paintJack(jackOut, { expr: 4 });
        for (let i = 1; i <= 56; i++) { const k = Math.min(1, i / 8), tt = i * 0.04; st.pose.armRx = W3(-0.15, -2.55, k); st.pose.armRz = W3(-0.5, -0.1 + 0.09 * Math.sin(tt * 16), k); st.pose.armLx = W3(-0.15, -2.4, k * 0.8); st.pose.armLz = W3(0.5, 0.15 + 0.07 * Math.sin(tt * 14), k * 0.8); st.pose.neckX = W3(0.1, 0.38, k); await G.wait(0.04); }
        W.paintJack(jackOut, { expr: 0 });
        for (let i = 1; i <= 20; i++) { const k = ease(i / 20); st.pose.armRx = W3(-2.55, -0.15, k); st.pose.armRz = W3(-0.1, -0.5, k); st.pose.armLx = W3(-1.9, -0.15, k); st.pose.armLz = W3(0.15, 0.5, k); st.pose.neckX = W3(0.38, 0.05, k); await G.wait(0.04); }
        for (let i = 1; i <= 64; i++) { st.pose.neckY = 0.95 * Math.sin(Math.PI * 2 * i / 64) * (i < 32 ? 1 : 0.6); await G.wait(0.04); } st.pose.neckY = 0;
      })();
      await Promise.all([leave, wake]);
      // 4. he climbs out of the box, over its front, and down onto the table
      G.cut({ pos: v(tc.x - 12, TOP + 15, tc.z + 24), look: v(tc.x, TOP + 6, tc.z + 1.5), fov: 44 });
      await G.wait(0.4);
      for (let i = 1; i <= 26; i++) { const k = ease(i / 26); st.pose.armLx = st.pose.armRx = W3(-0.15, -2.9, k); st.pose.armLz = W3(0.5, 0.25, k); st.pose.armRz = W3(-0.5, -0.25, k); st.pose.neckX = W3(0.05, -0.5, k); await G.wait(0.04); }
      for (let i = 1; i <= 40; i++) { const k = ease(i / 40), sw = Math.sin(i * 0.9); jackOut.root.position.set(1.3 * W3(0.7, 4.0, k), W3(1.2, 6.4, k), 0); st.pose.thigh = -0.9 - 0.4 * sw; st.pose.knee = 0.8 + 0.4 * sw; await G.wait(0.04); }
      for (let i = 1; i <= 24; i++) { const k = ease(i / 24); jackOut.root.position.set(1.3 * W3(4.0, 5.2, k), W3(6.4, 7.3, k), 0); jackOut.root.quaternion.copy(qUp).slerp(TILT, k); st.pose.thigh = W3(-0.9, -0.4, k); st.pose.knee = W3(0.8, 0.2, k); st.pose.torso = 0; await G.wait(0.04); }
      for (let i = 1; i <= 24; i++) { const k = ease(i / 24); jackOut.root.position.set(1.3 * W3(5.2, 7.2, k), W3(7.3, 0, k * k), 0); jackOut.root.quaternion.copy(TILT).slerp(qUp, k); st.pose.armLx = st.pose.armRx = W3(-2.9, -0.4, k); st.pose.thigh = W3(-0.4, -0.25, k); st.pose.knee = W3(0.2, 0.3, k); st.pose.neckX = W3(-0.5, 0, k); await G.wait(0.04); }
      scene.attach(jackOut.root); const wp = new V3(); jackOut.root.getWorldPosition(wp); st.pos.set(wp.x, 0, wp.z); st.y = TOP; st.heading = Math.PI / 2; jackOut.root.quaternion.identity(); jackOut.root.rotation.y = Math.PI / 2; jackOut.root.scale.setScalar(bs); st.boxed = false; st.pose = { armLx: -0.15, armLz: 0.3, armRx: -0.15, armRz: -0.3, torso: 0, neckX: 0, neckY: 0 };
      // 5. the clothes on the table: he notices them now, and goes to look
      G.cut({ pos: v(tc.x + 22.5, TOP + 6.6, tc.z + 17.4), look: v(tc.x + 13, TOP + 2.2, tc.z + 2), fov: 38 });
      { const x0 = st.pos.x, z0 = st.pos.z, x1 = clothes.position.x - 2.3, z1 = clothes.position.z, n = 44; for (let i = 1; i <= n; i++) { const k = ease(i / n); st.pos.x = x0 + (x1 - x0) * k; st.pos.z = z0 + (z1 - z0) * k; st.heading = Math.atan2(clothes.position.x - st.pos.x, clothes.position.z - st.pos.z); st.walkN = 1; st.walkPh += 0.5; await G.wait(0.04); } st.walkN = 0; st.heading = Math.atan2(clothes.position.x - st.pos.x, clothes.position.z - st.pos.z); }       // (right up to them, facing them)
      await G.wait(0.4);
      for (let i = 1; i <= 16; i++) { const k = ease(i / 16); st.pose.neckX = 0.45 * k; st.pose.armRx = W3(-0.15, -0.9, k); st.pose.armRz = W3(-0.3, -0.05, k); await G.wait(0.04); }       // (he takes the tunic's collar between finger and thumb)
      await sayW('jack', 'Linen. Stitched by careful hands.');
      W.paintJack(jackOut, { expr: 1 });
      await sayW('jack', 'A child’s tunic. Laces at the collar, a round neck, the seams doubled for wear.');
      await sayW('jack', 'Soft green, and made so that someone else can do it up for you.');
      await sayW('jack', 'Someone not trusted with buttons or belts. Someone like me, in her eyes.');
      for (let i = 1; i <= 12; i++) { const k = i / 12; st.pose.armRx = W3(-0.9, -0.15, k); st.pose.neckX = W3(0.45, -0.1, k); await G.wait(0.04); }
      A && A.blip && A.blip(); await G.wait(0.5);
      await sayW('jack', 'Well, she won’t get me in those!');
      if (opts.ch3notes) { await finish('ch3open'); return; }
      // out, and on the table: his
      st.pose = null; st.camA = Math.PI * 0.75; st.pitch = 0.45; st.zoom = 1; camPos.set(0, 0, 0);       // (the camera comes in from the south-west, clear of the open box)
      G.skipping = false; st.scene = false; st.jumpReq = st.actReq = st.putReq = false; for (const k in keys) keys[k] = false; stick.x = stick.y = 0; st.walkN = 0; st.vy = 0; st.lockT = 0; G.mode = 'play'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine();
      $('cwObjt').style.display = 'none';
    }
    const f = $('fade');
    if (ch3) { if (opts.ch3start === 'nursery') { makeG('Work'); gerda.root.visible = false; st.s = 0.35; st.pos.set(-294, 0, -172); st.heading = Math.PI; st.camA = Math.atan2(-Math.cos(st.heading), -Math.sin(st.heading)); st.pitch = 0.45; st.zoom = 1; camPos.set(0, 0, 0); G.skipping = false; st.scene = false; st.pose = null; $('cwPanel').style.display = 'none'; $('cwObjt').style.display = 'none'; G.mode = 'play'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine(); f.style.transition = ''; await G.fade(false, 1.0); return; }
      if (opts.ch3dress) { st.scene = true; st.s = 0.7; makeG('Work'); G.gerdaNamed = true; G.mode = 'cutscene'; if (A && A.ctx && !opts.ch3notes) A.startMusic({ theme: 'castle' }); await dressScene(); await choreScene(); await bathScene(); await finish('bath'); return; }
      if (opts.ch3chores) { st.scene = true; st.s = opts.chSize || 0.98; makeG('Work'); G.gerdaNamed = true; G.mode = 'cutscene'; await choreScene(!!opts.ch3chorework); await bathScene(); await finish('bath'); return; }
      if (opts.ch3bath) { st.scene = true; st.s = opts.chSize || 0.98; makeG('Work'); G.gerdaNamed = true; G.mode = 'cutscene'; await bathScene(); await finish('bath'); return; }
      if (opts.ch3disc) { st.scene = true; st.s = 0.5; makeG('Work'); st.pos.set(-294, 0, -172); G.mode = 'cutscene'; document.body.classList.add('cutscene'); $('cwPanel').style.display = 'none'; $('cwObjt').style.display = 'none'; if (A && A.ctx && !opts.ch3notes) A.startMusic({ theme: 'nursery' }); await disciplineScene(opts.ch3lies || 0); return; }       // (the correction is a scene of its own, after the one in which he is put across her knee)
      if (opts.ch3notes === 'close') { st.scene = true; st.s = 0.4; makeG('Work'); gerda.root.visible = false; const cg = M.items.chest.g.position; st.pos.set(cg.x - 12, 0, cg.z + 10); st.heading = Math.PI / 2; $('cwPanel').style.display = 'none'; await chestScene(); return; } await ch3Open(); return; }
    if (!story) { G.mode = 'play'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine(); f.style.transition = ''; await G.fade(false, 1.2); return; }
    // ── The story: the hall, from a few angles, and what it says to him; then it is his. ──
    st.scene = true; G.mode = 'cutscene'; document.body.classList.add('cutscene'); $('cwPanel').style.display = 'none'; G.save({ step: 'castle' });
    const wait = G.wait, walkTo = async (tx, tz, secs) => { const x0 = st.pos.x, z0 = st.pos.z, n = Math.max(2, Math.round(secs / 0.04)); st.heading = Math.atan2(tx - x0, tz - z0); for (let i = 1; i <= n; i++) { const k = i / n; st.pos.x = x0 + (tx - x0) * k; st.pos.z = z0 + (tz - z0) * k; st.walkN = 1; st.walkPh += 10.9 * Math.pow(st.s, -0.35) * 0.55 * 0.04 * 1.4; await wait(0.04); } st.walkN = 0; };
    st.pos.set(0, 0, 94); st.heading = Math.PI; G.cut({ pos: v(4, 2.4, 60), look: v(0, 2.4, 86), fov: 34 });                 // (it opens on Jack, coming in; the hall is shown once, when he looks up at it)
    f.style.transition = ''; G.fade(false, 1.6); W.paintJack(jackOut, { expr: 1 }); const wk = walkTo(0, 76, 4.2); await wait(1.4);
    await sayW('jack', 'Who lives in a place like this?');
    G.cut({ pos: v(-3, 1.6, 101), look: v(0, 24, 62), fov: 58 }); const rv = G.shot({ pos: v(-3, 1.6, 101), look: v(0, 118, 12), fov: 58 }, 6, 'inOut');
    await sayW('jack', 'A table set for one, and a hall you could lose a village in.'); await rv;
    G.cut({ pos: v(3, 2.7, 64), look: v(0, 2.7, 76), fov: 32 }); await wait(0.8);
    await sayW('jack', 'There has to be something here I can carry home. Something Mother can’t argue with.');
    await wait(0.4); const kk = st.s, d0 = 92 * kk; await G.shot({ pos: v(0, 15 * SC * kk + Math.sin(0.5) * d0, st.pos.z + d0 * Math.cos(0.5)), look: v(0, 15 * SC * kk, st.pos.z), fov: 48 }, 1.6, 'inOut');
    await wk; G.skipping = false; st.scene = false; st.jumpReq = st.actReq = st.putReq = false; for (const k in keys) keys[k] = false; stick.x = stick.y = 0; st.walkN = 0; st.vy = 0; st.lockT = 0; G.mode = 'play'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine(); st.heading = Math.PI; st.camA = Math.PI / 2; camPos.set(0, 0, 0);
  });
}

root.CastleWalk = { run };
})(typeof window !== 'undefined' ? window : globalThis);
