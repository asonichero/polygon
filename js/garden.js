// Climbing Toward Consequence — the garden, the close of Chapter One (planting): Jack plants the beans, by night.
//   He starts outside the closed cottage door. In the arable land (Farm.PLOT, a 3 x 3 of 15-unit cells) he clears the ground (rocks are carried off the plot; pulled weeds melt away), takes the hoe from
//   where it leans against the cottage wall and tills the five cells that make the five of a die (the four corners and the middle), then plants the beans one at a time, one in each furrow. He
//   says what he expects, or hopes, to himself (by the variation of the correction before it), goes back to the door, opens it and steps inside; and the camera lifts to the angle of the title sequence.
// Controls: WASD / arrows to walk, drag to turn the view, wheel or V for the zoom; E to lift, pull, till or plant and to open the door; Q to put down what he holds.
// Exposes Garden.run(G, W, tier): W is Night.build's world (its exterior, and Jack out of doors).
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky, F = root.Farm, A = root.GameAudio, V3 = THREE.Vector3;
const v = (x, y, z) => new V3(x, y, z), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const turn = (from, to, t) => { const d = ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return from + d * t; };
const SC = 0.95, WALK = 26, RUN = 50, HEAVY = 15;
const ZOOMS = [{ name: 'Close', d: 52 }, { name: 'Medium', d: 92 }, { name: 'Far', d: 150 }];
const BOUNDS = { x0: -196, x1: 196, z0: -100, z1: 116 };
const SOLID = [{ x0: -70, x1: 70, z0: -80, z1: 20 }, { x0: -66, x1: -54, z0: 24, z1: 36 }, { x0: -153, x1: -147, z0: 17, z1: 23 }, { x0: -99, x1: -93, z0: -73, z1: -67 }];      // the cottage, the barrel, the scarecrow, the tree
const DOOR = v(34, 0, 22), PLOT = F.PLOT, CELL = PLOT.cell, HALF = CELL * PLOT.n / 2;
const cellAt = (i, j) => v(PLOT.cx + (i - 1) * CELL, 0, PLOT.cz + (j - 1) * CELL);
const PIPS = [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]];                         // the five of a die
const BEANS = [['gold', 0xe2ab2c], ['silver', 0xd4d8e0], ['ember red', 0xc4402c], ['moss green', 0x5a8a3a], ['deep blue', 0x2a46b8]];
const HOPES = [
  'Grow, please. Just this once, let me have been right about something small.',
  'Go on, then. Grow. You had better be worth all the trouble.',
  'They’ll grow. They’ll grow, and then she’ll have to eat every word.',
];

function run(G, W, tier) {
  return new Promise(resolve => {
    const { ext, jackOut, aOut, world } = W, scene = ext.scene, mat = F.mat, plain = F.plain, box = F.box;
    const el = G.renderer.domElement;
    G.setScene(world); G.drone = null; G.mode = 'garden'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine();
    A && A.ambience({ wind: 0.3, birds: 0, fire: 0 });
    // ── Jack, outside the closed door. ──
    const st = { pos: v(DOOR.x, 0, DOOR.z + 10), heading: Math.PI, yaw: 0, pitch: 0.42, zoom: 1, y: 0, hold: null, act: null, phase: 'clear', toastAt: 0, speedN: 0, inside: false };
    jackOut.root.visible = true; jackOut.root.rotation.y = Math.PI; jackOut.root.position.copy(st.pos); aOut.fist = 0; aOut.bow = 0.1; aOut.hold = 0; aOut.cover = 0; aOut.look = 0; aOut.shuffle = 0; aOut.rub = 0;
    W.paintJack(jackOut, { expr: 1 });
    ext.doorLeaf.rotation.y = 0;
    // Light on the plot, as from the moon.
    const glow = new THREE.PointLight(0x9fb4e8, 0.9, 130, 1.4); glow.position.set(PLOT.cx, 40, PLOT.cz); scene.add(glow);

    // ── The plot: its cells (faint lines), and what is in it. ──
    const stage = new THREE.Group(); scene.add(stage);
    const line = plain('#6d5a40');
    for (let k = 0; k <= PLOT.n; k++) {
      const o = -HALF + k * CELL; box(PLOT.n * CELL, 0.5, 0.7, line, PLOT.cx, 0.3, PLOT.cz + o, stage); box(0.7, 0.5, PLOT.n * CELL, line, PLOT.cx + o, 0.3, PLOT.cz, stage);
    }
    const rnd = (() => { let s = 4141; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const rocks = [], weeds = [];
    for (const [i, j, dx, dz] of [[0, 1, 2, -3], [2, 1, -2, 2], [1, 0, 0, 3], [1, 2, 3, -1], [2, 2, -3, -3]]) {
      const g = new THREE.Group(), p = cellAt(i, j); g.position.set(p.x + dx, 0, p.z + dz); g.rotation.y = rnd() * 3;
      box(6 + rnd() * 2, 4 + rnd() * 2, 5.5, mat('stone'), 0, 2.4, 0, g); box(4, 3, 4, mat('stone'), 1.4, 5.2, 0.4, g);
      stage.add(g); rocks.push({ g, base: g.position.clone() });
    }
    for (const [i, j, dx, dz] of [[0, 0, 3, 3], [1, 0, -4, -2], [2, 0, 2, 2], [0, 1, -3, 3], [1, 1, 3, -3], [0, 2, 1, -2], [1, 2, -3, 1], [2, 2, 3, 2]]) {
      const g = new THREE.Group(), p = cellAt(i, j); g.position.set(p.x + dx, 0, p.z + dz);
      const m = new THREE.MeshLambertMaterial({ color: i % 2 ? 0x4f7a34 : 0x3f6a2c, transparent: true, opacity: 1 });
      for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4 + (k % 3) * 2, 0.9), m); b.position.set((k - 2.5) * 0.9, 2.2 + (k % 3), (k % 2 - 0.5) * 1.4); b.rotation.z = (k - 2.5) * 0.12; g.add(b); }
      stage.add(g); weeds.push({ g, m, gone: false });
    }
    const pips = PIPS.map(([i, j]) => { const p = cellAt(i, j), m = box(2.4, 0.4, 2.4, plain('#b8a47a'), p.x, 0.5, p.z, stage); m.rotation.y = 0.785; m.visible = false; return { i, j, p, m, tilled: false, bean: null, tilledG: null }; });

    // ── The hoe: the one that leans against the wall (Farm's), taken in hand. ──
    const hoe = ext.hoe, holder = new THREE.Group(); const hoeRest = { pos: hoe.position.clone(), rot: hoe.rotation.clone() };
    const handHoe = on => {
      if (on) { holder.add(hoe); hoe.position.set(0, -15, 0); hoe.rotation.order = 'YXZ'; hoe.rotation.set(0, 0, 0); jackOut.armR.add(holder); holder.position.set(0, -10, 1.2); holder.rotation.set(-1.0, 0, 0); }
      else { hoe.parent && hoe.parent.remove(hoe); }
    };
    const layHoe = () => {                                                                         // put it down where he stands
      handHoe(false); scene.add(hoe); hoe.position.set(st.pos.x + Math.sin(st.heading) * 7, 0.9, st.pos.z + Math.cos(st.heading) * 7); hoe.rotation.order = 'YXZ'; hoe.rotation.set(Math.PI / 2, st.heading + 1.2, 0); st.hold = null; aOut.carry = 0;
    };
    const rockInHand = new THREE.Group(); box(7, 5, 6, mat('stone'), 0, 0, 0, rockInHand); box(4, 3, 4, mat('stone'), 1.2, 3, 0.4, rockInHand); rockInHand.position.set(0, 6, 5.5); rockInHand.visible = false; jackOut.torso.add(rockInHand);

    // ── HUD ──
    const css = document.createElement('style');
    css.textContent = `#gHud { position: fixed; inset: 0; pointer-events: none; z-index: 12; font-family: Georgia, serif; color: #ece8df; }
      #gObj { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(10,12,16,0.78); border: 1px solid #4a4d58; border-radius: 8px; padding: 8px 16px; font-size: clamp(13px, 1.9vw, 17px); max-width: 80vw; text-align: center; }
      #gHint { position: absolute; left: 50%; bottom: 18vh; transform: translateX(-50%); background: rgba(10,12,16,0.85); border: 1px solid #c9a84c; color: #f0d98a; padding: 6px 14px; border-radius: 6px; font-size: 15px; display: none; }
      #gToast { position: absolute; left: 50%; bottom: 8vh; transform: translateX(-50%); background: rgba(10,12,16,0.85); border: 1px solid #4a4d58; padding: 8px 16px; border-radius: 8px; font-size: 14px; max-width: 86vw; text-align: center; opacity: 0; transition: opacity .4s; }
      #gBeans { position: absolute; top: 56px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; } #gBeans i { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #000; opacity: .35; } #gBeans i.on { opacity: 1; }`;
    document.head.appendChild(css);
    const hud = document.createElement('div'); hud.id = 'gHud';
    hud.innerHTML = '<div id="gObj"></div><div id="gBeans"></div><div id="gHint"></div><div id="gToast"></div>';
    document.body.appendChild(hud);
    const $ = id => document.getElementById(id);
    BEANS.forEach(([n, c]) => { const i = document.createElement('i'); i.style.background = '#' + c.toString(16).padStart(6, '0'); i.title = n; $('gBeans').appendChild(i); });
    const toast = (t, ms = 3200) => { $('gToast').textContent = root.Tips.clean(t); $('gToast').style.opacity = 1; st.toastAt = performance.now() + ms; };
    const keys = {}, ui = root.TouchUI.create({ keys, run: true, jump: true, act: true, drop: true, cam: true }), stick = ui.stick;
    const KM = { w: 'up', W: 'up', ArrowUp: 'up', s: 'down', S: 'down', ArrowDown: 'down', a: 'left', A: 'left', ArrowLeft: 'left', d: 'right', D: 'right', ArrowRight: 'right', Shift: 'run' };
    const typing = e => e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    const kd = e => { if (typing(e)) return; const k = KM[e.key]; if (k) { keys[k] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); } if (e.repeat) return; if (e.key === 'e' || e.key === 'E') interact(); else if (e.key === 'q' || e.key === 'Q') pickUp(); else if (e.key === 'v' || e.key === 'V') cycleZoom(); else if (e.key === ' ') { e.preventDefault(); ui.on.jump(); } };
    const ku = e => { const k = KM[e.key]; if (k) keys[k] = false; };
    root.addEventListener('keydown', kd); root.addEventListener('keyup', ku);
    const drags = new Map();
    const pd = e => drags.set(e.pointerId, { x: e.clientX, y: e.clientY }), pm = e => { const d = drags.get(e.pointerId); if (!d) return; st.yaw -= (e.clientX - d.x) * 0.006; st.pitch = clamp(st.pitch + (e.clientY - d.y) * 0.005, 0.08, 1.35); d.x = e.clientX; d.y = e.clientY; }, pu = e => drags.delete(e.pointerId);
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
    const wheel = e => { e.preventDefault(); cycleZoom(e.deltaY > 0 ? 1 : -1); }; el.addEventListener('wheel', wheel, { passive: false });
    const camIcon = () => ui.set('cam', { icon: 'camera', title: 'Camera: ' + ZOOMS[st.zoom].name });
    function cycleZoom(dir) { st.zoom = (st.zoom + (dir || 1) + ZOOMS.length) % ZOOMS.length; camIcon(); }
    camIcon(); ui.on.cam = () => cycleZoom(); ui.on.act = () => interact(); ui.on.drop = () => pickUp(); const hop = { y: 0, vy: 0 }, canHop = () => !st.act && !st.inside && st.hold !== 'rock' && hop.y <= 0.01; ui.on.jump = () => { if (canHop()) hop.vy = 112 * SC; };

    // ── What he can do. ──
    const near = (p, r) => Math.hypot(st.pos.x - p.x, st.pos.z - p.z) < r;
    const inPlot = (p, m) => F.inPlot(p.x, p.z, m || 0);
    const remaining = () => ({ rocks: rocks.filter(r => !r.out).length, weeds: weeds.filter(w => !w.gone).length });
    const cellOf = () => { const i = Math.floor((st.pos.x - (PLOT.cx - HALF)) / CELL), j = Math.floor((st.pos.z - (PLOT.cz - HALF)) / CELL); return i >= 0 && i < PLOT.n && j >= 0 && j < PLOT.n ? [i, j] : null; };
    const pipAt = (i, j) => pips.find(p => p.i === i && p.j === j);
    function setObjective() {
      const o = $('gObj'), r = remaining();
      if (st.phase === 'clear') o.textContent = `Clear the plot of rocks and weeds.  Rocks left: ${r.rocks}   Weeds left: ${r.weeds}`;
      else if (st.phase === 'till') o.textContent = `Take the hoe from the cottage wall and till five squares like the five on a die: the four corners and the middle.  (${pips.filter(p => p.tilled).length}/5)`;
      else if (st.phase === 'plant') o.textContent = `Plant a bean in each furrow, one at a time.  (${pips.filter(p => p.bean).length}/5)`;
      else if (st.phase === 'home') o.textContent = 'Go back to the cottage door.';
      else o.textContent = '';
      [...$('gBeans').children].forEach((c, k) => c.classList.toggle('on', k >= pips.filter(p => p.bean).length));
    }
    const doAct = (kind, dur, then) => { st.act = { kind, t: 0, dur, then }; aOut.speed = 0; };
    function putDown() {
      if (st.act || st.inside) return;
      if (st.hold === 'hoe') { layHoe(); toast('You lay the hoe down.'); }
      else if (st.hold === 'rock') {
        if (inPlot(st.pos, 3)) { toast('Not in the bed. Take it off the plot.'); return; }
        const r = st.rockObj; st.hold = null; st.rockObj = null; rockInHand.visible = false; aOut.carry = 0; stage.add(r.g); r.g.position.set(st.pos.x + Math.sin(st.heading) * 8, 0, st.pos.z + Math.cos(st.heading) * 8); r.g.rotation.y = st.heading; r.out = true; A && A.thwack && A.thwack(0.3, true, 0.35); setObjective(); afterClear();
      }
    }
    function afterClear() {
      const r = remaining();
      if (st.phase === 'clear' && r.rocks === 0 && r.weeds === 0) { st.phase = 'till'; pips.forEach(p => { p.m.visible = true; }); toast('Clear. Now the hoe: it leans against the cottage wall, on the garden side.', 5200); }
      setObjective();
    }
    function pickUp() {                                                                                    // Q: take up the stone or the hoe beside him, or put down what he carries
      if (st.act || st.inside) return;
      const hoeFree = hoe.parent !== holder;
      if (st.hold === 'rock') { putDown(); return; }
      if (st.phase === 'clear') {
        let best = null, bd = 12; for (const r of rocks) if (!r.out && r.g.parent === stage && inPlot(r.g.position, 8)) { const d = Math.hypot(st.pos.x - r.g.position.x, st.pos.z - r.g.position.z); if (d < bd) { bd = d; best = r; } }
        if (best) { if (st.hold === 'hoe') layHoe(); doAct('lift', 0.7, () => { st.hold = 'rock'; st.rockObj = best; stage.remove(best.g); rockInHand.visible = true; aOut.carry = 1; toast('Carry it off the plot, and put it down.'); A && A.blip && A.blip(); }); return; }
      }
      if (st.hold === 'hoe') { putDown(); return; }
      if (st.phase !== 'plant' && st.phase !== 'home') {        // (the hoe is done with, once the furrows are made)
        const hp = hoe.getWorldPosition(new V3());
        if (hoeFree && Math.hypot(st.pos.x - hp.x, st.pos.z - hp.z) < 16) { doAct('lift', 0.5, () => { scene.remove(hoe); handHoe(true); st.hold = 'hoe'; aOut.carry = 0; toast(st.phase === 'clear' ? 'You take the hoe. Clear the ground first.' : 'You take the hoe.'); A && A.blip && A.blip(); }); return; }
      }
      toast('Nothing to take here.', 1800);
    }
    function interact() {
      if (st.act || st.inside) return;
      const hoeFree = hoe.parent !== holder;          // (not in his hand)
      // The door.
      if (st.phase === 'home' && near(DOOR, 20)) { goInside(); return; }
      // Weeds, while the ground is being cleared (the stones are lifted with Q).
      if (st.phase === 'clear') {
        if (st.hold === 'rock') { toast('Put the stone down first (Q).'); return; }
        let bw = null, wd = 10; for (const w of weeds) if (!w.gone) { const d = Math.hypot(st.pos.x - w.g.position.x, st.pos.z - w.g.position.z); if (d < wd) { wd = d; bw = w; } }
        if (bw) {
          if (st.hold === 'hoe') layHoe();
          doAct('pull', 0.8, () => { bw.gone = true; bw.fade = 0; A && A.blip && A.blip(); setObjective(); afterClear(); });
          return;
        }
      }
      // Tilling.
      if (st.phase === 'till' && st.hold === 'hoe') {
        const c = cellOf(); const pip = c && pipAt(c[0], c[1]);
        if (!c) { toast('Stand on the plot, in the square you mean to till.'); return; }
        if (!pip) { toast('Not that one. Five, like the face of a die: the four corners and the middle.'); return; }
        if (pip.tilled) { toast('That square is done.'); return; }
        doAct('dig', 1.9, () => { till(pip); setObjective(); if (pips.every(p => p.tilled)) { st.phase = 'plant'; layHoe(); toast('Now the beans, one to a furrow.', 4200); setObjective(); } });
        return;
      } else if (st.phase === 'till' && st.hold !== 'hoe') { toast('You need the hoe: it leans against the cottage wall by the garden.'); return; }
      // Planting.
      if (st.phase === 'plant') {
        const c = cellOf(); const pip = c && pipAt(c[0], c[1]);
        if (!pip || !pip.tilled) { toast('Plant in a furrow: stand in a tilled square.'); return; }
        if (pip.bean) { toast('A bean is in that one already.'); return; }
        const k = pips.filter(p => p.bean).length;
        doAct('plant', 1.0, () => { plant(pip, k); setObjective(); if (pips.every(p => p.bean)) finish(); });
        return;
      }
      if (st.phase === 'clear') toast('Nothing to do here. Rocks must be carried off; weeds are pulled up.');
    }
    function till(pip) {
      pip.tilled = true; const g = new THREE.Group(); g.position.set(pip.p.x, 0, pip.p.z);
      box(CELL - 2, 1.2, CELL - 2, plain('#33241a'), 0, 0.7, 0, g); for (let k = 0; k < 4; k++) box(CELL - 4, 1.1, 1.5, plain('#4a3626'), 0, 1.6, (k - 1.5) * 3.2, g);
      stage.add(g); pip.tilledG = g; pip.m.visible = false; A && A.thwack && A.thwack(0.35, true, 0.4);
    }
    function plant(pip, k) {
      const g = new THREE.Group(); g.position.set(pip.p.x, 0, pip.p.z); box(4, 1.6, 4, plain('#3a2a1c'), 0, 2.4, 0, g); box(2, 2, 2, new THREE.MeshLambertMaterial({ color: BEANS[k][1] }), 0, 3.6, 0, g);
      stage.add(g); pip.bean = g; toast(`You plant the ${BEANS[k][0]} bean.`); A && A.blip && A.blip();
    }
    async function finish() {
      st.phase = 'done'; st.act = { kind: 'idle', t: 0, dur: 99 }; setObjective();
      await G.wait(0.8);
      await G.caption('jack', HOPES[tier]);
      st.act = null; st.phase = 'home'; setObjective(); toast('Back to the cottage door.', 3600);
    }
    async function goInside() {
      st.inside = true; st.act = { kind: 'idle', t: 0, dur: 99 }; $('gHint').style.display = 'none'; hud.style.display = 'none'; ui.show(false);
      // The door opens; he steps in.
      const t0 = G.t; while (G.t - t0 < 0.8) { ext.doorLeaf.rotation.y = lerp(0, -1.9, clamp((G.t - t0) / 0.8, 0, 1)); await G.wait(0.03); }
      A && A.latch && A.latch();
      const to = v(DOOR.x + 2, 0, DOOR.z - 8); st.heading = Math.atan2(to.x - st.pos.x, to.z - st.pos.z);
      while (Math.hypot(to.x - st.pos.x, to.z - st.pos.z) > 1.5) { const d = Math.hypot(to.x - st.pos.x, to.z - st.pos.z), s = Math.min(d, WALK * SC * 0.04); st.heading = turn(st.heading, Math.atan2(to.x - st.pos.x, to.z - st.pos.z), 0.3); st.pos.x += Math.sin(st.heading) * s; st.pos.z += Math.cos(st.heading) * s; aOut.speed = 24; aOut.phase += s * 0.42; jackOut.root.position.copy(st.pos); jackOut.root.rotation.y = st.heading; await G.wait(0.04); }
      jackOut.root.visible = false; aOut.speed = 0;
      const t1 = G.t; while (G.t - t1 < 0.7) { ext.doorLeaf.rotation.y = lerp(-1.9, 0, clamp((G.t - t1) / 0.7, 0, 1)); await G.wait(0.03); }
      A && A.thwack && A.thwack(0.3, true, 0.5);
      await G.wait(0.8);
      // Up and away, to the angle of the title sequence.
      const DR = root.Opening && root.Opening.DRONE ? root.Opening.DRONE(0) : { pos: v(250, 270, 460), look: v(-70, 10, -34), fov: 48 };
      G.cut({ pos: camPos.clone(), look: camLook.clone(), fov: 50 });
      await G.shot({ pos: DR.pos.clone(), look: DR.look.clone(), fov: DR.fov }, 7.5, 'inOut');
      await G.wait(1.6);
      A && A.stopMusic && A.stopMusic(2.5); await G.fade(true, 2.0); A && A.ambience({ wind: 0, birds: 0, fire: 0 });
      cleanup(); resolve({ planted: pips.filter(p => p.bean).length });
    }
    function cleanup() {
      root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); el.removeEventListener('wheel', wheel);
      G.updaters = G.updaters.filter(u => u !== tick); hud.remove(); css.remove(); ui.destroy(); scene.remove(glow); G.mode = 'end';
    }

    // ── Each frame. ──
    const camPos = new V3(), camLook = new V3();
    const blockedAt = (x, z) => { if (x < BOUNDS.x0 || x > BOUNDS.x1 || z < BOUNDS.z0 || z > BOUNDS.z1) return true; for (const o of SOLID) if (x > o.x0 - 5 && x < o.x1 + 5 && z > o.z0 - 5 && z < o.z1 + 5) return true; return false; };
    const tick = dt => {
      // Weeds melting away.
      for (const w of weeds) if (w.gone && w.fade != null && w.fade < 1) { w.fade = Math.min(1, w.fade + dt / 0.7); w.m.opacity = 1 - w.fade; w.g.position.y = w.fade * 7; w.g.scale.setScalar(1 - 0.7 * w.fade); if (w.fade >= 1) stage.remove(w.g); }
      // Jack: acting, or walking relative to the camera.
      if (st.act) {
        const a = st.act; a.t += dt; aOut.speed = 0;
        aOut.crouch = a.kind === 'pull' || a.kind === 'plant' ? Math.min(1, a.t * 5) : a.kind === 'lift' ? Math.min(1, a.t * 5) * (a.t > a.dur - 0.2 ? Math.max(0, (a.dur - a.t) / 0.2) : 1) : 0;
        aOut.dig = a.kind === 'dig' ? 1 : 0; aOut.digT = a.t;
        if (a.kind === 'dig' && Math.floor((a.t - dt) * 5.5 / Math.PI) !== Math.floor(a.t * 5.5 / Math.PI) && Math.cos(a.t * 5.5) < -0.9) A && A.thwack && A.thwack(0.25, true, 0.3);
        if (a.t >= a.dur && a.kind !== 'idle') { st.act = null; aOut.crouch = 0; aOut.dig = 0; if (a.then) a.then(); }
      } else {
        aOut.crouch = 0; aOut.dig = 0;
        const f = new V3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw)), r = new V3(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
        const dir = new V3().addScaledVector(f, (keys.up ? 1 : 0) - (keys.down ? 1 : 0)).addScaledVector(r, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
        if (Math.hypot(stick.x, stick.y) > 0.2) dir.addScaledVector(f, -stick.y).addScaledVector(r, stick.x);
        if (dir.lengthSq() > 0) {
          dir.normalize(); const want = Math.atan2(dir.x, dir.z); st.heading = turn(st.heading, want, Math.min(1, dt * 9));
          const sp = (st.hold === 'rock' ? HEAVY : keys.run ? RUN : WALK) * SC, nx = st.pos.x + Math.sin(st.heading) * sp * dt, nz = st.pos.z + Math.cos(st.heading) * sp * dt;
          if (!blockedAt(nx, st.pos.z)) st.pos.x = nx; if (!blockedAt(st.pos.x, nz)) st.pos.z = nz; st.speedN = sp / SC;
        } else st.speedN = 0;
        aOut.speed = st.speedN; aOut.phase += st.speedN * SC * dt * 0.42 / 0.95;
      }
      if (hop.y > 0 || hop.vy > 0) { hop.vy -= 420 * SC * dt; hop.y += hop.vy * dt; if (hop.y <= 0) { hop.y = 0; hop.vy = 0; } } aOut.air = hop.y > 0.01;
      ui.set('jump', { label: 'Jump', icon: 'jump', enabled: canHop() });
      if (!st.inside) { jackOut.root.position.set(st.pos.x, hop.y, st.pos.z); jackOut.root.rotation.y = st.heading; }
      // The hint, for what E would do.
      let hint = '';
      if (!st.act && !st.inside) {
        if (st.phase === 'home' && near(DOOR, 20)) hint = 'E: open the door';
        else if (st.phase === 'clear') {
          if (st.hold === 'rock') hint = inPlot(st.pos, 3) ? 'Carry it off the plot' : 'Q: put the stone down';
          else { for (const r of rocks) if (!r.out && r.g.parent === stage && Math.hypot(st.pos.x - r.g.position.x, st.pos.z - r.g.position.z) < 12 && inPlot(r.g.position, 8)) hint = 'Q: lift the stone'; if (!hint) for (const w of weeds) if (!w.gone && Math.hypot(st.pos.x - w.g.position.x, st.pos.z - w.g.position.z) < 10) hint = 'E: pull the weed'; }
        } else if (st.phase === 'till' && st.hold === 'hoe') { const c = cellOf(), pip = c && pipAt(c[0], c[1]); if (pip && !pip.tilled) hint = 'E: till this square'; }
        else if (st.phase === 'plant') { const c = cellOf(), pip = c && pipAt(c[0], c[1]); if (pip && pip.tilled && !pip.bean) hint = 'E: plant a bean'; }
        if (!hint && st.hold !== 'hoe' && st.hold !== 'rock' && st.phase !== 'plant' && st.phase !== 'home') { const hp = hoe.getWorldPosition(new V3()); if (hoe.parent !== holder && Math.hypot(st.pos.x - hp.x, st.pos.z - hp.z) < 16) hint = 'Q: take the hoe'; }
      }
      if (!hint && st.hold === 'hoe' && !st.act && !st.inside) hint = 'Q: lay the hoe down';
      $('gHint').textContent = hint; $('gHint').style.display = hint ? 'block' : 'none';
      { const L = { 'E: open the door': 'Open', 'E: pull the weed': 'Pull weed', 'E: till this square': 'Till', 'E: plant a bean': 'Plant' }[hint], canTake = hint === 'Q: lift the stone' || hint === 'Q: take the hoe';
        ui.set('act', L ? { label: L, enabled: true } : { label: 'Do', enabled: false });
        const can = !st.act && !st.inside && (canTake || st.hold === 'hoe' || (st.hold === 'rock' && !inPlot(st.pos, 3)));
        ui.set('drop', { label: st.hold ? 'Put down' : 'Pick up', enabled: can }); }
      if (st.toastAt && performance.now() > st.toastAt) { $('gToast').style.opacity = 0; st.toastAt = 0; }
      // The camera: round Jack, as in Chapter One.
      if (!st.inside) {
        const d = ZOOMS[st.zoom].d, p = st.pitch, at = v(st.pos.x, 15 * SC, st.pos.z);
        const want = v(at.x + Math.sin(st.yaw) * Math.cos(p) * d, Math.max(3, at.y + Math.sin(p) * d), at.z + Math.cos(st.yaw) * Math.cos(p) * d);
        if (camPos.lengthSq() === 0) camPos.copy(want); else camPos.lerp(want, Math.min(1, dt * 10)); camLook.copy(at);
        G.cut({ pos: camPos, look: camLook, fov: 48 });
      }
    };
    G.updaters.push(tick); G.garden = { st, rocks, weeds, pips, interact, pickUp, putDown, hoe, cellAt };      // (for tools and tests)
    setObjective(); G.fade(false, 1.4);
    toast('The beans are in your pocket. Clear a plot in the garden to the west.', 6000);
  });
}

root.Garden = { run };
})(typeof window !== 'undefined' ? window : globalThis);
