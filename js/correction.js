// Climbing Toward Consequence — the correction, at the close of Chapter One (the cottage at night).
//   The discipline engine of the hen test (js/lap.js), in the cottage: Jack stands before his Mother in the overview camera, his britches come down, she orders him over her knee and he goes; a
//   run of the hand with the dialogue laid over it and some breaks of uninterrupted smacks. Whoever saw the cheeky or brash scene has his drawers taken down partway through. Afterwards he stands
//   before her (she is still seated), rubbing his seat as in the opening, bared to whichever level he was, and the closing words are said over it. At his most brash she sends him for the birch
//   (a shot of it on the wall, a shot of his face turned to it), and a second correction follows, over the kitchen table with the birch, ending the same way.
//   The camera is the player's: a switcher top right, drag to look about. A red stop sign beside it calls Red: it ends the discipline there and then, and he stands before her.
//   Exposes Correction.run(G, W, tier) where W is Night.build's world (the room, Jack, his Mother) and tier 0 humble, 1 cheeky, 2 brash.
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky, Lap = root.Lap, A = root.GameAudio, V3 = THREE.Vector3;
const v = (x, y, z) => new V3(x, y, z);
const SC = 0.95, STAGE_Y = 5.7;
const RED = { red: true };

// ── The interface: camera switcher and the stop sign, top right. ──
function ui() {
  if (document.getElementById('corrUI')) return document.getElementById('corrUI');
  const st = document.createElement('style');
  st.textContent = `#corrUI { position: fixed; right: 92px; top: 10px; z-index: 36; display: none; flex-direction: row; align-items: center; gap: 12px; }
    #corrUI.on { display: flex; }
    #corrCam { width: 74px; height: 74px; margin: 0; padding: 0; border-radius: 50%; border: 3px solid #fff; background: rgba(20,22,30,0.88); cursor: pointer; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 6px #000); }
    #corrCam:hover { background: rgba(60,66,90,0.95); } #corrCam svg { width: 40px; height: 40px; fill: none; stroke: #fff; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    #corrRed { position: relative; width: 74px; height: 74px; margin: 0; padding: 0; border: 0; background: #fff; cursor: pointer; clip-path: polygon(29% 0, 71% 0, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0 71%, 0 29%); filter: drop-shadow(0 2px 6px #000); }
    #corrRed::before { content: ''; position: absolute; inset: 4px; background: #c4141c; clip-path: polygon(29% 0, 71% 0, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0 71%, 0 29%); }
    #corrRed span { position: relative; color: #fff; font: bold 19px Georgia, serif; letter-spacing: .06em; } #corrRed:hover::before { background: #e01c26; }`;
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'corrUI';
  d.innerHTML = '<button id="corrCam" title="Change the camera angle"><svg viewBox="0 0 24 24"><path d="M3 8h4l1.6-2.4h6.8L17 8h4v11H3z"/><circle cx="12" cy="13.2" r="3.6"/></svg></button><button id="corrRed" title="Red: stop now"><span>RED</span></button>';
  document.body.appendChild(d); return d;
}

// ── The player's camera: orbit, pan and zoom; the switcher puts it at a named view. ──
function freeCam(G, box) {       // (box: { x0, x1, z0, z1, h }: the room the camera is kept inside, its walls and its ceiling)
  const fc = new THREE.PerspectiveCamera(40, 1, 0.5, 4000), controls = new THREE.OrbitControls(fc, G.renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12; controls.minDistance = 6; controls.maxDistance = 240; controls.maxPolarAngle = 1.52;
  const orig = G.renderer.render; let tween = null;
  G.renderer.render = function (scene) {
    const w = G.renderer.domElement.clientWidth || innerWidth, h = G.renderer.domElement.clientHeight || innerHeight;
    if (Math.abs(fc.aspect - w / h) > 1e-3) { fc.aspect = w / h; fc.updateProjectionMatrix(); }
    if (tween) { const k = Math.min(1, (performance.now() - tween.t0) / tween.ms), e = k * k * (3 - 2 * k); fc.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.l0, tween.l1, e); if (k >= 1) tween = null; }
    if (box) { const m = 3, cx = x => Math.max(box.x0 + m, Math.min(box.x1 - m, x)), cz = z => Math.max(box.z0 + m, Math.min(box.z1 - m, z)); controls.target.x = cx(controls.target.x); controls.target.z = cz(controls.target.z); controls.target.y = Math.max(0, Math.min(box.h - 9, controls.target.y)); }
    controls.update();
    if (box) { const m = 3; fc.position.x = Math.max(box.x0 + m, Math.min(box.x1 - m, fc.position.x)); fc.position.z = Math.max(box.z0 + m, Math.min(box.z1 - m, fc.position.z)); fc.position.y = Math.max(1.5, Math.min(box.h - 9, fc.position.y)); }       // (the camera never leaves the room)
    orig.call(G.renderer, scene, fc);
  };
  return {
    fc, controls,
    go(pos, look, fov, ms) { if (fov) { fc.fov = fov; fc.updateProjectionMatrix(); } if (!ms) { tween = null; fc.position.copy(pos); controls.target.copy(look); controls.update(); return; } tween = { t0: performance.now(), ms, p0: fc.position.clone(), p1: pos.clone(), l0: controls.target.clone(), l1: look.clone() }; },
    enable(on) { controls.enabled = on; },
    restore() { G.renderer.render = orig; controls.dispose && controls.dispose(); },
  };
}

async function run(G, W, tier, opts) {
  opts = opts || {};
  const { jackIn, ja, mother, ma, int, SEAT, scene } = W;
  const pick = (a, b, c) => [a, b, c][tier];
  const cl = (a, y, b) => v(SEAT.x + a * Math.sin(SEAT.ry) + (b || 0) * Math.cos(SEAT.ry), y, SEAT.z + a * Math.cos(SEAT.ry) - (b || 0) * Math.sin(SEAT.ry));
  const tb = int.table, tr = tb.rotation.y, TABLE = { x: tb.position.x - 7.6 * Math.sin(tr), z: tb.position.z - 7.6 * Math.cos(tr), ry: -Math.PI / 2 + tr };

  // The engine, in the room.
  const lap = Lap.create(null, { external: { scene, camera: G.camera, renderer: G.renderer }, table: false, jackFull: 1 });
  lap.giver('mother', 1); lap.stage.scale.setScalar(SC); lap.stage.visible = false; lap.jack.root.visible = true;
  lap.st.noRecovery = true; lap.st.side = 'alt';
  G.lap = lap;      // (for tools and tests)
  const placeStage = at => { lap.stage.position.set(at.x, STAGE_Y, at.z); lap.stage.rotation.y = at.ry; lap.stage.updateMatrixWorld(true); };
  const cworld = { scene, update(dt, t) { int.update(dt, t); ja.t += dt; ma.t += dt; B.step(jackIn, dt); B.step(mother, dt); if (lap.stage.visible) lap.update(dt); } };
  G.setScene(cworld); G.drone = null; G.mode = 'correction'; document.body.classList.remove('cutscene');
  A && A.ambience({ wind: 0.1, birds: 0, fire: 0.8 });

  const cam = freeCam(G, { x0: -75, x1: 75, z0: -75, z1: 75, h: 62 }), panel = ui(), camBtn = document.getElementById('corrCam'), redBtn = document.getElementById('corrRed');
  let red = false, shown = null;
  redBtn.onclick = () => { red = true; lap.red(); G.captionOff(); };
  // Named views of the stage (in its own units, so they follow it wherever it stands); the switcher offers the ones that suit what is on.
  const stageView = (name, ms) => {
    const V = lap.views[name]; lap.stage.updateMatrixWorld(true);
    cam.go(lap.stage.localToWorld(v(...V.pos)), lap.stage.localToWorld(v(...V.at)), 46, ms == null ? 700 : ms); shown = name; sync();
  };
  const SETS = { knee: ['overview', 'behind', 'shoulder', 'face'], table: ['tableSide', 'tableBehind', 'tableAbove', 'tableFront'] };
  let set = 'knee';
  const switcher = which => { set = which; };
  camBtn.onclick = () => { const L = SETS[set], i = L.indexOf(shown); stageView(L[(i + 1) % L.length]); };      // one button: each press goes on to the next angle
  const sync = () => {};
  const showUI = on => panel.classList.toggle('on', !!on);
  const caption = (who, text) => { if (red) throw RED; return G.caption(who, text); };
  const say = async (who, text) => { await caption(who, text); if (red) throw RED; };
  const wait = async s => { await G.wait(s); if (red) throw RED; };
  const smacks = async n => { if (!n) return; lap.run(n); await G.wait(0.4); for (let i = 0; i < 700 && (lap.info().busy || lap.info().running); i++) { await G.wait(0.1); if (red) return; } };
  // A step: a line spoken over a run of n smacks (the line never stops the hand), or a run with nothing said.
  const step = async (line, n) => { if (red) throw RED; const l = line ? G.caption(line[0], line[1]) : Promise.resolve(); await Promise.all([l, smacks(n)]); if (red) throw RED; };
  const dip = async (fn, a = 0.5, b = 0.6) => { await G.fade(true, a); await fn(); await G.fade(false, b); };

  // Jack standing before her, rubbing his seat: the actors take over from the engine's pair. At the chair (she is seated) or, after the birch, at the table (she is on her feet).
  let where = 'chair';
  const standBefore = (faceBirch) => {
    lap.stage.visible = false; int.chair.visible = true; mother.root.visible = jackIn.root.visible = true; mother.setExpr(1);
    ma.fold = 0; ma.gesture = 0; ma.wag = 0; ma.side = 0; ma.chin = 0; ma.speed = 0;
    if (where === 'table') {
      placeStage(TABLE); int.chair.visible = true; int.tableClutter.visible = false;
      const mp = lap.stage.localToWorld(v(-17, -6, -10)), jp = lap.stage.localToWorld(v(-17, -6, 10));      // (as far apart as he stands from her at the chair)
      B.setPose(mother, 'stand'); mother.pose = 'stand'; mother.root.position.copy(mp); mother.root.position.y = 0; mother.root.rotation.y = TABLE.ry;
      jackIn.root.position.copy(jp); jackIn.root.position.y = 0; jackIn.root.rotation.y = TABLE.ry + Math.PI;
    } else {
      placeStage(SEAT);
      B.setPose(mother, 'sit'); mother.pose = 'sit'; mother.root.position.set(SEAT.x, STAGE_Y, SEAT.z); mother.root.rotation.y = SEAT.ry;
      jackIn.root.position.copy(cl(20, 0));       // (as far from her as he stands in the opening, rubbing)
      jackIn.root.rotation.y = faceBirch ? Math.atan2(71.6 - SEAT.x, 56 - SEAT.z) : SEAT.ry + Math.PI;
    }
    ja.speed = 0; ja.rub = 1; ja.shuffle = 0; ja.bow = 0.5; ja.look = 0; ja.cover = 0; ja.fist = 0; ja.hold = 0;
    W.paintJack(jackIn, { expr: 3, trousers: 'down', drawers: tier >= 1 ? 'down' : 'up', marks: lap.st.marks });
    W.jackGl.mesh.visible = true; B.paintGlutesInto(W.jackGl.skin, { trousers: 'down', drawers: tier >= 1 ? 'down' : 'up', marks: lap.st.marks, outfit: 'Outdoor' }); W.jackGl.tex.needsUpdate = true;
    for (let i = 0; i < 12; i++) { B.step(mother, 0.1); B.step(jackIn, 0.1); }
    if (where === 'chair') B.seatFeet(mother, 0);
  };
  const closing = async () => {
    await say('mother', tier === 0 ? 'Pull your trousers up.' : 'Pull your trousers up, and wipe your face.');
    await say('jack', 'Yes, Mother.');
    ja.rub = 0; ja.bow = 0.3; W.paintJack(jackIn, { expr: 1, trousers: 'down', drawers: tier >= 1 ? 'down' : 'up', marks: lap.st.marks });
    for (let i = 1; i <= 34; i++) { ja.hitch = i / 34; if (i === 20) { W.paintJack(jackIn, { expr: 1, trousers: 'up', drawers: 'up' }); W.jackGl.mesh.visible = false; A && A.blip && A.blip(); } await wait(0.04); }        // he bends, takes them at the knee, and hitches them up
    ja.hitch = 0; await wait(0.5);
    await say('mother', 'Go and plant them, then. If they’re so powerful. We will see what comes up.');
    await wait(0.6);
  };
  const aftermath = async (lines) => {                       // he stands before her; what is said, is said over it
    showUI(false); cam.enable(true);
    await dip(async () => { standBefore(); stageView(where === 'table' ? 'tableSide' : 'seat', 0); }, 0.5, 0.6);
    for (const l of lines || []) await say(l[0], l[1]);
    await closing();
  };

  // ── First correction: over her knee, with the hand. ──
  const handScene = async () => {
    placeStage(SEAT); lap.stage.visible = true; int.chair.visible = false; jackIn.root.visible = mother.root.visible = false;
    lap.reset(); lap.layers({ trousers: 'up', drawers: 'up' }); lap.armed(false); lap.implement('hand'); lap.place('seat', 0); lap.giver('mother', 1);
    lap.st.sound = true; lap.st.strength = 1.1; lap.st.pace = 1;
    switcher('knee'); showUI(true); cam.enable(true); stageView('overview', 0);
    await G.fade(false, 0.6);
    await wait(0.6);
    await say('jack', pick('Mother, please. I’ve learned, I swear it.', 'Mother, you can’t mean it.', 'You can’t be serious.'));
    lap.fumble(1); await wait(0.4);
    await say('mother', pick('If you had learned, you’d have listened. You were told, plain and clear.', 'I mean it, Jack. You were told, plain and clear.', 'Dead serious. You were told, plain and clear.'));
    await say('jack', pick('I’m too old for this—', 'I’m twenty-one! You can’t treat me like a boy!', 'I’m twenty-one, Mother! You can’t just—'));
    await say('mother', pick('Then start acting like it.', 'I shall as long as you behave like one.', 'When you behave like a child, you’ll be treated like one.'));
    lap.layers({ trousers: 'down' }); A && A.blip && A.blip(); await wait(0.6);                      // the britches come down
    await say('jack', 'Mother!');
    lap.fumble(0); lap.cover(1); await wait(0.4);
    await say('mother', 'No more clever excuses. No more compasses and lucky finds and magic anything. I am tired, Jack. Tired of clearing up after your choices.');
    await say('mother', 'Over my knee.');
    lap.cover(0); lap.place('lap', 1.4); await wait(1.8);                                                // he goes
    lap.implement('hand');
    const P_ = (a, b, c) => pick(a, b, c);
    lap.st.pace = 2;                                                                                  // the first run is twice as many smacks, twice as fast
    await step(['mother', 'You were trusted with a simple task.'], 2 * P_(5, 6, 6));
    await step(['jack', pick('Ow! I’m sorry, I’m sorry!', 'Ow! It was a fair trade!', 'It was a fair trade!')], 6);
    await step(['mother', 'You sold our food for a dream, and came home smiling.'], 2 * P_(6, 7, 7));
    if (tier >= 1) {                                                                                  // partway through, the drawers come down
      await step(['mother', 'And these come down too.'], 0); lap.layers({ drawers: 'down' }); A && A.blip && A.blip(); await wait(0.7);
      await step(['jack', tier === 1 ? 'Mother, please!' : 'It’s not fair!'], 0);
    }
    await step(null, 12);                                                                             // a run with nothing said
    await step(['jack', pick('I won’t do it again, I won’t!', 'Mother, that’s enough!', 'They’re magic, Mother! You’ll see!')], 6);
    await step(['mother', 'You think the world owes you wonders. Perhaps it does. But not like this.'], 2 * P_(5, 8, 8));
    await step(null, 10);
    await step(['jack', pick('Please, Mother, I understand, I do!', 'Ow! Please!', 'I’d do it again! Ow! I would!')], 6);
    lap.st.pace = 1;
    if (tier >= 1) {
      await step(['mother', 'That is for forgetting my voice.'], 3);
      await step(['mother', 'For forgetting your word.'], 3);
      await step(['mother', 'And for forgetting your place.'], P_(0, 4, 6));
      await step(['jack', tier === 1 ? 'Yes, Mother! I’m sorry! I’m sorry!' : 'It’s not— it’s not fair! Ow! You’ll see, you’ll all see!'], 0);
    }
    await wait(0.5);
    if (tier < 2) await say('mother', tier === 0 ? 'There. That will do.' : 'There. Up.');
    else { await say('mother', 'You still think this a joke.'); await say('jack', 'It isn’t— Mother, I— the beans—'); await say('mother', 'Up.'); }
    lap.place('seat', 1.2); lap.cover(1); await wait(1.4);
  };

  // ── The birch: for the brash, at the end of the first. ──
  const fetchBirch = async () => {
    await aftermath0([
      ['mother', 'Fetch me the birch.'], ['jack', 'The birch? Mother, no—'], ['mother', 'It hangs on its nail by the door. Fetch it. Now.'], ['jack', 'I’ve had enough! I’ve— I’ve had enough!'], ['mother', 'Not by half. Go.'],
    ]);
    cam.enable(false); showUI(false);
    cam.go(v(40, 31, 36), v(72, 27, 56), 40, 0); await wait(2.2);                                         // the birch, hanging on its nail
    standBefore(true); ja.rub = 0; ja.shuffle = 1; ja.bow = 0.3;                                         // Jack, walking to it with his face to us
    const dir = jackIn.root.rotation.y; cam.go(cl(20, 0).add(v(Math.sin(dir) * 46, 30, Math.cos(dir) * 46)), cl(20, 25).add(v(Math.sin(dir) * 14, 0, Math.cos(dir) * 14)), 34, 0);
    for (let i = 0; i < 85; i++) { const st = 14 * 0.04; jackIn.root.position.x += Math.sin(dir) * st; jackIn.root.position.z += Math.cos(dir) * st; ja.speed = 13; ja.phase += st * 0.42 * 1.4; await G.wait(0.04); }
    ja.speed = 0;
  };
  // (the first part of an aftermath: the actors, and what is said over them)
  const aftermath0 = async lines => {
    showUI(false); cam.enable(true);
    await dip(async () => { standBefore(); stageView('seat', 0); }, 0.5, 0.6);
    for (const l of lines) await say(l[0], l[1]);
  };
  const birchScene = async () => {
    await G.fade(true, 0.8);
    placeStage(TABLE); lap.stage.visible = true; int.chair.visible = false; int.tableClutter.visible = false; jackIn.root.visible = mother.root.visible = false;
    lap.layers({ trousers: 'down', drawers: 'down' }); lap.armed(true); lap.implement('birch'); lap.place('table', 0); lap.giver('mother', 1); lap.st.strength = 1.35; lap.st.sound = true; lap.st.pace = 1; where = 'table';
    switcher('table'); showUI(true); cam.enable(true); stageView('tableSide', 0);
    await G.fade(false, 0.8);
    await wait(0.8);
    await step(['mother', 'Hands flat on the table.'], 0);
    await step(['jack', 'Mother, I’ve learned, I swear—'], 4);
    await step(null, 4);
    await step(['jack', 'Ow! Ow! Mother!'], 2);
    await step(['mother', 'Is it a fair trade now?'], 4);
    await step(['jack', 'No! No, it isn’t! I’m sorry, I’m sorry!'], 3);
    await step(['mother', 'Every one of those beans goes into the ground tonight, and every one of them is yours to answer for.'], 3);
    await step(null, 3);
    await step(['jack', 'Yes, Mother! Yes!'], 0);
    await wait(0.5);
    await say('mother', 'Up.');
    lap.place('after', 1.6); lap.cover(1); await wait(1.8);
  };

  // ── The whole of it. ──
  try {
    try {
      await handScene();
      if (tier === 2) { await fetchBirch(); await birchScene(); await aftermath(); }
      else await aftermath();
    } catch (e) {
      if (e !== RED) throw e;
      // Red: the discipline ends here and now, and he is called to stand before her.
      lap.stop(); G.captionOff && G.captionOff(); red = false; showUI(false);
      await G.caption('jack', 'Red! No more, please!');
      await G.caption('mother', 'Alright, Jack. I hear you. That’s an end to it.');
      await wait(0.4);
      await aftermath();
    }
  } finally { showUI(false); cam.restore(); }
  A && A.stopMusic(2.5); await G.fade(true, 2.4); A && A.ambience({ wind: 0, birds: 0, fire: 0 });
  G.captionOff && G.captionOff(); await G.wait(0.8);
  lap.stage.visible = false; G.mode = 'end';
  return { tier, hits: lap.st.hits };
}

root.Correction = { run, freeCam, ui };
})(typeof window !== 'undefined' ? window : globalThis);
