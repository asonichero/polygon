// Climbing Toward Consequence — the game shell: the content notice and 18+ confirmation, the title screen (over the drone view of the homestead), settings, saves, and the cutscene
// toolkit the story scenes are written with. A cutscene is an async function that awaits these: G.say(who, text), G.shot(name, secs), G.fade(black, secs), G.wait(secs).
// Skipping sets a flag that makes every wait, line and move finish at once, so a scene can be skipped and still land on the right frame.
(function (root) {
'use strict';
const THREE = root.THREE, Audio_ = root.GameAudio, V3 = THREE.Vector3;
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = { linear: t => t, inOut: t => t * t * (3 - 2 * t), out: t => 1 - (1 - t) * (1 - t), in: t => t * t, soft: t => t * t * t * (t * (6 * t - 15) + 10) };

const SAVE_KEY = 'castle-consequence:save:v1', NOTICE_KEY = 'castle-consequence:notice:v1', SET_KEY = 'castle-consequence:settings:v1';
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* no storage */ } },
};

function create(els) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1)); els.stage.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 4000);
  const G = { renderer, camera, scene: null, t: 0, skipping: false, settings: Object.assign({ speed: 1, auto: true, subtitles: true }, store.get(SET_KEY, {})), mode: 'notice', shots: {}, updaters: [], drone: null, maxDt: 0.05 };
  const cam = { pos: new V3(), look: new V3(), fov: 50 }, move = { active: null };

  function resize() { const w = els.stage.clientWidth || root.innerWidth, h = els.stage.clientHeight || root.innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  root.addEventListener('resize', resize); resize();

  // ── Camera: named shots {pos, look, fov}; G.shot(name | spec, secs, easing) moves there (secs 0 cuts); G.drone is a function(t) that drives the camera while set. ──
  const specOf = s => typeof s === 'string' ? G.shots[s] : s;
  const cutNow = s => { s = specOf(s); cam.pos.copy(s.pos); cam.look.copy(s.look); cam.fov = s.fov || cam.fov; move.active = null; };
  G.cut = cutNow;
  G.shot = (s, secs = 2, e = 'inOut') => new Promise(res => {
    s = specOf(s); if (G.skipping || secs <= 0) { cutNow(s); res(); return; }
    move.active = { from: { pos: cam.pos.clone(), look: cam.look.clone(), fov: cam.fov }, to: s, t: 0, secs, e: ease[e] || ease.inOut, res };
  });
  G.shotNow = () => ({ pos: cam.pos.clone(), look: cam.look.clone(), fov: cam.fov });

  // ── Timing. ──
  const waiters = [];
  G.wait = secs => new Promise(res => { if (G.skipping) { res(); return; } waiters.push({ t: secs, res }); });
  const fadeEl = els.fade;
  G.fade = (toBlack, secs = 1) => G.noFade ? G.wait(secs) : new Promise(res => {
    if (G.skipping) { fadeEl.style.transition = 'none'; fadeEl.style.opacity = toBlack ? 1 : 0; res(); return; }
    fadeEl.style.transition = G.seekTo != null ? 'none' : `opacity ${secs}s ease`; fadeEl.style.opacity = toBlack ? 1 : 0; G.wait(secs).then(res);
  });

  // ── Dialogue: a subtitle box that types its line out (the voice babbles for the same length). A tap or key press finishes typing, then moves on. ──
  const subs = els.subs, subWho = els.subWho, subText = els.subText;
  let advance = null;
  const tap = () => { if (advance) advance(); };
  const typing_ = e => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable);   // (keys typed into a field are not the story's)
  root.addEventListener('keydown', e => { if (G.manual || typing_(e)) return; if (e.key === ' ' || e.key === 'Enter') { if (G.mode === 'cutscene') { e.preventDefault(); tap(); } } });
  els.stage.addEventListener('pointerdown', () => { if (G.mode === 'cutscene' && !G.manual) tap(); });
  subs.addEventListener('pointerdown', e => { e.stopPropagation(); if (G.mode === 'cutscene') tap(); });
  const WHO = { mother: ['Mother', '#e6b8a0'], jack: ['Jack', '#a8d8a0'], gerda: ['Gerda', '#e6a0c0'], peddler: ['Peddler', '#c8c090'], merchant: ['Merchant', '#a0c8f0'], narrator: ['', '#e6c46a'] };
  const whoOf = who => { const w = WHO[who] || [who, '#e6c46a']; return who === 'gerda' && !G.gerdaNamed ? ['The Giantess', w[1]] : w; };       // (Jack does not know her name until she gives it)
  let capTok = 0; const caps = new Set(), supersede = () => { capTok++; for (const f of [...caps]) f(); }, live = { say: 0 };      // (a spoken line ends any caption still up, and no caption is drawn over a line while it is up: the two used to overwrite, and hide, each other)
  G.say = (who, text, opts) => new Promise(resolve => {
    const ep = G.epoch;
    if (G.skipping || (!G.settings.subtitles && !(opts && opts.force))) { resolve(); return; }
    supersede(); live.say++;
    const w = whoOf(who); subWho.textContent = w[0]; subWho.style.color = w[1]; subs.style.display = 'block'; subText.textContent = '';
    const cps = 34 * G.settings.speed, typeSecs = Math.max(0.6, text.length / cps), voice = Audio_ && who !== 'narrator' ? Audio_.speak(who, text, typeSecs, { muffle: opts && opts.muffle }) : null;
    const t0 = G.t; let typed = false, holdAt = null, poll = null, typing = null; const gateBtn = document.getElementById('subGate');
    let closed = false; const close = () => { if (!closed) { closed = true; live.say = Math.max(0, live.say - 1); } clearInterval(typing); clearInterval(poll); if (voice) voice.stop(); if (ep !== G.epoch) return; advance = null; if (gateBtn) gateBtn.style.display = 'none'; if (!G.keepLine) subs.style.display = 'none'; resolve(); };
    const gateLabel = opts && opts.gate;
    const finish = () => {
      if (typed) return; typed = true; clearInterval(typing); subText.textContent = text;
      if (gateLabel) { gateBtn.textContent = gateLabel; gateBtn.style.display = 'inline-block'; gateBtn.onclick = e => { e.stopPropagation(); gateBtn.style.display = 'none'; close(); }; }   // a button inside the box that ends the line, so it cannot be missed
      else if (G.settings.auto) holdAt = G.t + Math.max(1100, text.length * 48 / G.settings.speed) / 1000;
    };
    typing = setInterval(() => { const n = Math.min(text.length, Math.floor((G.t - t0) * cps)); subText.textContent = text.slice(0, n); if (n >= text.length) finish(); }, 30);
    advance = () => { if (!typed) { finish(); if (voice) voice.stop(); } else if (!gateLabel) close(); };            // a tap finishes the typing, the next one moves on
    poll = setInterval(() => { if (G.skipping || (G.seekTo != null && typed) || (holdAt != null && G.t >= holdAt) || ep !== G.epoch) close(); }, 60);
  });
  // A caption: a line spoken over the scene while it goes on (nothing waits for it, though the promise resolves when it has had its time). The next caption replaces it.
  G.caption = (who, text, opts) => new Promise(resolve => {
    if (live.say > 0) { resolve(); return; }
    const tok = ++capTok, w = whoOf(who), cps = 34 * G.settings.speed, typeSecs = Math.max(0.6, text.length / cps), holdSecs = Math.max(1.1, text.length * 0.048 / G.settings.speed);
    subWho.textContent = w[0]; subWho.style.color = w[1]; subs.style.display = 'block'; subText.textContent = '';
    const voice = Audio_ && who !== 'narrator' ? Audio_.speak(who, text, typeSecs, { muffle: opts && opts.muffle }) : null, t0 = G.t, ep = G.epoch;
    const finish = () => { clearInterval(iv); caps.delete(finish); if (voice && voice.stop) voice.stop(); if (tok === capTok) subs.style.display = 'none'; resolve(); };
    const iv = setInterval(() => {
      const el = G.t - t0;
      if (tok === capTok) subText.textContent = el >= typeSecs ? text : text.slice(0, Math.floor(el * cps));
      if (el >= typeSecs + holdSecs || tok !== capTok && el >= typeSecs || ep !== G.epoch) finish();
    }, 30);
    caps.add(finish);
  });
  G.captionOff = () => { capTok++; for (const f of [...caps]) f(); subs.style.display = 'none'; };
  // A choice for the player: buttons inside the dialogue box (or the keys 1 to 9); resolves with the index picked.
  G.choose = (who, options) => new Promise(resolve => {
    const w = whoOf(who), box = document.getElementById('subChoices'); subWho.textContent = w[0]; subWho.style.color = w[1]; subText.textContent = ''; subs.style.display = 'block'; box.innerHTML = ''; box.style.display = 'block'; advance = null;
    const pick = i => { clearInterval(poll); root.removeEventListener('keydown', onKey, true); box.style.display = 'none'; box.innerHTML = ''; subs.style.display = 'none'; resolve(i); };
    const onKey = e => { const n = parseInt(e.key, 10); if (n >= 1 && n <= options.length) { e.preventDefault(); e.stopPropagation(); pick(n - 1); } };
    options.forEach((o, i) => { const b = document.createElement('button'); b.className = 'choice'; b.textContent = (i + 1) + '. ' + o; b.onclick = e => { e.stopPropagation(); pick(i); }; box.appendChild(b); });
    root.addEventListener('keydown', onKey, true);
    const poll = setInterval(() => { if (G.skipping) { clearInterval(poll); pick(0); } }, 80);
    if (G.skipping) pick(0);
  });
  G.hideLine = () => { subs.style.display = 'none'; advance = null; };

  // ── The frame loop. ──
  let last = performance.now();
  function frame(now) {
    const real = Math.min(G.maxDt, (now - last) / 1000); last = now;
    if (G.seekTo != null && G.mode !== 'cutscene') G.seekTo = null;
    const seeking = G.seekTo != null; if (seeking !== muted) setMuted(seeking);
    const steps = G.paused ? 0 : seeking ? 40 : 1, dt = seeking ? 0.05 : real;
    for (let i = 0; i < steps; i++) { step(dt); if (seeking && G.seekTo == null) break; }
    if (G.scene) {
      camera.position.copy(cam.pos); camera.lookAt(cam.look); if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
      renderer.render(G.scene, camera);
    }
    requestAnimationFrame(frame);
  }
  function step(dt) {
    G.t += dt;
    for (let i = waiters.length - 1; i >= 0; i--) { const w = waiters[i]; w.t -= dt; if (w.t <= 0) { waiters.splice(i, 1); w.res(); } }
    if (G.skipping) { for (const w of waiters.splice(0)) w.res(); if (move.active) { const m = move.active; move.active = null; cutNow(m.to); m.res(); } }
    if (move.active) {
      const m = move.active; m.t += dt; const k = m.e(clamp(m.t / m.secs, 0, 1));
      cam.pos.lerpVectors(m.from.pos, m.to.pos, k); cam.look.lerpVectors(m.from.look, m.to.look, k); cam.fov = m.from.fov + ((m.to.fov || m.from.fov) - m.from.fov) * k;
      if (m.t >= m.secs) { move.active = null; m.res(); }
    } else if (G.drone) { const s = G.drone(G.t); cam.pos.copy(s.pos); cam.look.copy(s.look); cam.fov = s.fov; }
    for (const u of G.updaters) u(dt, G.t);
  }
  requestAnimationFrame(frame);

  // ── Scenes: G.setScene(world) shows a world ({ scene, update(dt, t) }) and runs its update each frame. ──
  G.setScene = world => { G.scene = world.scene; G.world = world; G.updaters = G.updaters.filter(u => !u.isWorld); const u = (dt, t) => world.update && world.update(dt, t); u.isWorld = true; G.updaters.push(u); };

  // ── Debug controls for cutscenes: pause / play, and jump to the start of the previous or next beat (a spoken line or a new camera angle). ──
  // A scene is a chain of awaited calls, so going forward just runs it fast (silently) up to the next beat, and going back runs the scene again from its start the same way, up to the
  // wanted beat (G.rerun, set by the screen code, starts the current scene afresh). A run that has been left behind is cut off: its calls never come back.
  G.epoch = 0; G.beat = 0; G.beatT = 0; G.seekTo = null; G.paused = false; G.rerun = null; G.debugCtl = false;
  let muted = false;
  const setMuted = m => { muted = m; const A = Audio_; if (A && A.nodes && A.nodes.master && A.ctx) { if (m) A.nodes.master.gain.value = 0; else A.setVol(); } };
  // Hooks for tools that work on the beats (scene-notes.html): onBeat(info) at every beat call; beatGate(n) may return a promise that holds the scene at the start of beat n;
  // camOverride(n) may return a camera { pos, look, fov } to use for beat n in place of the scene's own.
  G.onBeat = null; G.beatGate = null; G.camOverride = null; G.specOf = specOf; G.cutNow = cutNow;
  let stall = null, deferred = null;
  // A beat is one camera angle: it begins when the scene cuts (or moves) to a new angle and runs until the next one, whatever is said and done in between. (Lines said before any angle
  // has been set open beat 1.) G.cut(shot, setup): `setup` runs as the cut happens, to put everyone where they stand as the beat begins.
  const mark = kind => {
    if (kind === 'say' && G.beat > 0) return false;
    G.beat++; G.beatT = G.t; if (G.seekTo != null && G.beat >= G.seekTo) { G.seekTo = null; G.skipping = false; }
    return true;
  };
  const guard = fn => (...a) => { const ep = G.epoch, r = fn(...a); return r && r.then ? r.then(x => ep === G.epoch ? x : new Promise(() => {})) : r; };
  const wrapBeat = (name, kind) => {
    const f = G[name];
    G[name] = (...a) => {
      const isNew = mark(kind);
      if (G.onBeat) G.onBeat({ beat: G.beat, kind, name, args: a, isNew });
      const run = () => {
        if (kind === 'cut') { const ov = G.camOverride && G.camOverride(G.beat); if (ov) a = [ov, ...a.slice(1)]; }
        else if (isNew && G.camOverride) { const ov = G.camOverride(G.beat); if (ov) cutNow(ov); }
        if (name === 'cut') { f(a[0]); if (typeof a[1] === 'function') a[1](); return undefined; }
        return f(...a);
      };
      const gate = isNew && G.beatGate ? G.beatGate(G.beat) : null;
      if (gate) { if (name === 'cut') { stall = gate; deferred = run; return undefined; } return gate.then(run); }   // (a cut is not awaited, so the hold comes at the next awaited call)
      return run();
    };
  };
  wrapBeat('cut', 'cut'); wrapBeat('shot', 'cut'); wrapBeat('say', 'say'); wrapBeat('choose', 'say');
  const stalled = fn => (...a) => { if (stall) { const g = stall, d = deferred; stall = deferred = null; return g.then(() => { if (d) d(); return fn(...a); }); } return fn(...a); };
  for (const n of ['shot', 'say', 'choose', 'wait', 'fade', 'caption']) G[n] = guard(stalled(G[n]));      // (a caption, like a line, waits for the beat that holds the scene: it began in the previous beat otherwise)
  G.pause = on => { G.paused = on === undefined ? !G.paused : !!on; const A = Audio_; if (A && A.ctx) { try { G.paused ? A.ctx.suspend() : A.ctx.resume(); } catch (e) { /* no audio */ } } return G.paused; };
  G.forward = () => { if (G.mode !== 'cutscene') return; G.pause(false); G.seekTo = G.beat + 1; };
  // Run the current scene again from its start, fast and silent, up to the start of beat `target` (then it plays normally).
  G.restartAt = target => {
    if (!G.rerun) return false;
    G.pause(false); G.epoch++; G.beat = 0; stall = deferred = null; waiters.length = 0; move.active = null; G.skipping = false; G.seekTo = Math.max(1, target); G.hideLine();
    fadeEl.style.transition = 'none'; G.rerun(); return true;
  };
  G.rewind = () => G.mode === 'cutscene' && G.restartAt(G.t - G.beatT > 1.5 || G.beat <= 1 ? Math.max(1, G.beat) : G.beat - 1);      // (well into a beat, back goes to its own start)
  root.addEventListener('keydown', e => {
    if (!G.debugCtl || G.mode !== 'cutscene' || typing_(e)) return;
    if (e.key === 'p' || e.key === 'P') G.pause(); else if (e.key === ',' || e.key === '[') G.rewind(); else if (e.key === '.' || e.key === ']') G.forward(); else return; e.preventDefault();
  });

  G.store = store; G.SAVE_KEY = SAVE_KEY; G.NOTICE_KEY = NOTICE_KEY; G.saveSettings = () => store.set(SET_KEY, G.settings);
  G.save = data => G.noSave || store.set(SAVE_KEY, Object.assign(store.get(SAVE_KEY, {}), data, { savedAt: Date.now() }));
  const SHOT_KEY = 'castle-consequence:titleshot:v1';
  G.loadSave = () => store.get(SAVE_KEY, null); G.clearSave = () => { store.del(SAVE_KEY); store.del(SHOT_KEY); };
  // The wide view of the farm, as it stands now, kept for the title screen (rendered once from the drone's first position, then shrunk to a JPEG).
  G.titleShot = () => G.memShot || store.get(SHOT_KEY, null);
  G.snapshotFarm = (world, drone) => {
    if (!world || !world.scene || !drone) return;
    try {
      const s = drone(0), old = { fov: camera.fov, p: camera.position.clone() };
      camera.position.copy(s.pos); camera.fov = s.fov; camera.updateProjectionMatrix(); camera.lookAt(s.look);
      renderer.render(world.scene, camera);
      const c = document.createElement('canvas'); c.width = 1280; c.height = Math.round(1280 * renderer.domElement.height / renderer.domElement.width);
      c.getContext('2d').drawImage(renderer.domElement, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/jpeg', 0.78); if (G.noSave) G.memShot = url; else { G.memShot = null; store.set(SHOT_KEY, url); }
      camera.position.copy(old.p); camera.fov = old.fov; camera.updateProjectionMatrix();
    } catch (e) { console.warn('snapshotFarm', e && e.message); }
  };
  return G;
}

root.Game = { create, ease, store, SAVE_KEY, NOTICE_KEY };
})(typeof window !== 'undefined' ? window : globalThis);
