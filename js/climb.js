// Climbing Toward Consequence — the climb, Chapter Two, "The Climb": Jack goes up the beanstalk.
//   One path winds up the stalk, of handholds (knots of bark); he moves hand over hand to the next, reading the stalk as he goes; his grip is limited by stamina, and the path rests on the broad leaves it crosses.
//   Lower stalk: every hold is sound, the reachable ones glow, and the way teaches grip, stamina and rest.
//   Middle stalk: it resists: some holds are slick with sap (reach through them quickly), leaves curl away when he lingers, and gusts come (shown first by the leaves and a rush at the screen's edge).
//   Upper stalk: the thin air narrows his sight and drains his strength faster; a vast shadow slides through the clouds overhead from time to time.
//   The top: a blanket of cloud, a ceiling the camera cannot pass; he goes up through it. As he climbs he is scaled down to a quarter, with the camera kept to him, so the stalk seems to grow.
// Controls: WASD / arrows (or the stick) to reach for a hold; hold Space (or the Grip button) to brace; drag to turn the view.
// Exposes Climb.run(G, W): W is Night.build's world (its exterior, and Jack out of doors).
(function (root) {
'use strict';
const THREE = root.THREE, F = root.Farm, A = root.GameAudio, V3 = THREE.Vector3;
const v = (x, y, z) => new V3(x, y, z), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const SC = 0.95, TOP = 790, CLOUD_Y = 800, MIN_S = 0.25;
const PLOT = F.PLOT, CX = PLOT.cx, CZ = PLOT.cz, HALF = PLOT.cell * PLOT.n / 2, { MERGE, N: NT } = root.Chapter3.STALK;
const VINE = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([i, j]) => v(CX + i * PLOT.cell, 0, CZ + j * PLOT.cell));       // the four outer stalks, from their furrows; the fifth, in the middle, goes straight up inside the braid
const SOLID = [{ x0: -70, x1: 70, z0: -80, z1: 20 }, { x0: -66, x1: -54, z0: 24, z1: 36 }, { x0: -153, x1: -147, z0: 17, z1: 23 }, { x0: -99, x1: -93, z0: -73, z1: -67 }];      // (the cottage, the barrel, the scarecrow, the tree, as in the garden)
const sOf = y => lerp(1, MIN_S, clamp(y / TOP, 0, 1));                       // how big Jack is at a height
const zoneOf = y => (y < 240 ? 'lower' : y < 540 ? 'middle' : 'upper');
// The stalk's centre and radius at a height (as Chapter3.buildStalk makes it: five vines to about 70 up, then the twisting trunk).
const centre = y => {
  if (y < MERGE) return v(CX, y, lerp(CZ, CZ + 6, y / MERGE));
  const s = (y - MERGE) / 10, t = s / NT; return v(CX + Math.sin(s * 0.19) * (8 + t * 40), y, CZ + Math.cos(s * 0.15) * (6 + t * 36));
};
const centreOf = (fr, y) => { if (fr > 3) return centre(y); const t = clamp((y - 4) / (MERGE - 4), 0, 13 / 14), p = VINE[fr]; return v(lerp(p.x, CX, t * t), y, lerp(p.z, CZ, t * t)); };
// The radius of the stalk's actual surface at a height and a bearing: the stacked boxes are square and each turned a little from the last, with a pale rib up one corner.
const surfR = (y, a) => {
  if (y < MERGE - 5.5) return 4.4;
  const s0 = Math.floor((y - MERGE) / 10); let r = 0;
  for (const s of [s0, s0 + 1]) {
    if (s < 0 || s > NT - 1) continue; const w = lerp(15, 7, s / NT), rot = s * 0.42, d = a + rot, c = Math.max(Math.abs(Math.cos(d)), Math.abs(Math.sin(d)));
    r = Math.max(r, w / 2 / c); if (Math.abs(angDiff(a, rot)) < 0.4) r = Math.max(r, w * 0.64);
  }
  return Math.max(r, 3.5);
};
const surfRf = (fr, y, a) => (fr < 4 ? 4.0 : surfR(y, a));
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

function run(G, W) {
  return new Promise(resolve => {
    const { ext, jackOut, world } = W, E = ext.scene, el = G.renderer.domElement, box = F.box, plain = F.plain;
    const C3 = root.Chapter3; C3 && C3.ensureDawn && C3.ensureDawn(E);
    G.setScene(world); G.drone = null; G.mode = 'play'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine();
    A && A.ambience({ wind: 0.35, birds: 0.5, fire: 0 });
    A && A.ctx && (A.startMusic({ theme: 'climb' }), A.duckMusic(0.8, 3));
    G.save({ step: 'climb' });
    const rnd = (() => { let s = 90210; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const stage = new THREE.Group(); E.add(stage);

    // ── The holds: a ring of three to a rung, the rungs closer as he shrinks; a broad leaf now and again to rest on. ──
    const holds = [], mats = {
      good: new THREE.MeshLambertMaterial({ color: 0xc9a862 }), glow: new THREE.MeshBasicMaterial({ color: 0xffeaa0 }), faint: new THREE.MeshLambertMaterial({ color: 0xe0c47a, emissive: 0x3a2e10 }),
      slick: new THREE.MeshPhongMaterial({ color: 0xa8d890, emissive: 0x2a5a3a, shininess: 120, specular: 0xffffff }), burl: new THREE.MeshLambertMaterial({ color: 0x8a6238 }), burlRing: new THREE.MeshLambertMaterial({ color: 0xe0cfa0 }), leaf: new THREE.MeshLambertMaterial({ color: 0x5aa84c }), rim: new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.45 }),
    };
    const worldOf = h => { if (h.lf) return v(h.lf.x + Math.cos(h.a) * h.r, h.y, h.lf.z + Math.sin(h.a) * h.r); const c = centreOf(h.fr, h.y); return v(c.x + Math.cos(h.a) * h.r, h.y, c.z + Math.sin(h.a) * h.r); };
    const holdPos = worldOf;
    const make = (fr, a, hy, kind, s) => {
      const r = surfRf(fr, hy, a) + 0.6 * s;
      const h = { fr, y: hy, a, r, kind, s, ph: rnd() * 6.28, mesh: null, leaf: null, curl: 0, curlT: 0, gone: 0 };
      const m = kind === 'burl' ? new THREE.Group() : new THREE.Mesh(new THREE.BoxGeometry(5 * s, 2.8 * s, 3.4 * s), kind === 'slick' ? mats.slick : mats.good);
      if (kind === 'burl') { box(8.5 * s, 5.5 * s, 6.5 * s, mats.burl, 0, 0, 0, m); box(9.5 * s, 1.2 * s, 7.4 * s, mats.burlRing, 0, 2.2 * s, 0, m); box(9.5 * s, 1.2 * s, 7.4 * s, mats.burlRing, 0, -2.2 * s, 0, m); }
      m.rotation.y = -a; stage.add(m); h.mesh = m; holds.push(h); return h;
    };
    const arcStep = (fr, yy, aa, ss) => { let da = 10.5 * ss / Math.min(surfRf(fr, yy, aa) + 0.6 * ss, 12); for (let i = 0; i < 4; i++) { const r = (surfRf(fr, yy, aa) + surfRf(fr, yy + 8 * ss, aa + da)) / 2 + 0.6 * ss; da = 10.5 * ss / Math.min(r, 12); } return da; };      // (the turn that makes a rung's reach a fixed length, whatever the stalk's corners do)
    // The winding is not uniform: for a few rungs it goes straight up, then round one way, then the other.
    const wind = { d: 1, left: 0 }; const nextDa = step => { if (wind.left <= 0) { const q = rnd(); wind.d = q < 0.3 ? 0 : q < 0.65 ? 1 : -1; wind.left = 2 + Math.floor(rnd() * 4); } wind.left--; return wind.d * step * (0.75 + 0.25 * rnd()); };
    // The first stretch: any of the four outer stalks, each its own way up to where they braid together.
    const grounds = [], vineTop = [];
    for (let k = 0; k < 4; k++) {
      let yv = 38, av = rnd() * 6.28, first = null; wind.left = 0;
      while (yv <= MERGE - 8) { const sv = sOf(yv), h = make(k, av, yv, 'good', sv); if (!first) { first = h; h.first = true; } av += nextDa(arcStep(k, yv, av, sv)); yv += 8 * sv; vineTop[k] = h; }
      grounds.push({ fr: k, y: 0, a: first.a, r: surfRf(k, 0, 0) + 3, kind: 'ground', s: 1, first, mesh: null });
    }
    // Where they braid: three knots round the trunk, all within reach of the way on.
    let y = MERGE + 6, rung = 0, a0 = rnd() * 6.28;
    for (const da of [-1.6, 0, 1.6]) make(4, a0 + da, MERGE - 2, 'good', sOf(MERGE));
    const stalkLeaves = (E.userData.c3 && E.userData.c3.userData.leaves) || [];
    let lf = null, targetY = MERGE + 60, sinceBurl = 0; wind.left = 0;
    while (y < TOP - 8) {
      const s = sOf(y), z = zoneOf(y);
      const finalLeaf = stalkLeaves.find(c => c.y >= 745 && c.y <= 775);
      if (!lf && finalLeaf && y >= 690) lf = finalLeaf;
      if (!lf && y >= targetY - 60) {                                         // the next leaf to cross: of those about that height, the one whose bearing is nearest where the path is
        let bm = 9; for (const c of stalkLeaves) { if (c.y < y + 24 || c.y > y + 130 || c.y > TOP - 90) continue; const m = Math.abs(angDiff(-c.a, a0)); if (m < bm) { bm = m; lf = c; } }
      }
      const lfA = lf ? -lf.a : 0, d = lf ? lf.w / 2 + 0.4 * lf.L : 0, yStand = lf ? lf.y - Math.sin(0.25) * d + 0.7 : 0;
      const step = arcStep(4, y, a0, s), n = lf ? Math.max(1, Math.round((yStand - y) / (8 * s))) : 99;
      if (lf && yStand - y <= 8 * s * 1.15) {                                // the path comes to the leaf, and crosses it
        a0 = a0 + angDiff(lfA, a0);
        const h = { fr: 4, y: yStand, a: a0, r: d, kind: 'ledge', s: sOf(yStand), ph: rnd() * 6.28, mesh: null, leaf: lf.g, curl: 0, curlT: 0, gone: 0, L: 0, lf };
        lf.g.userData.hold = h; h.rim = box(lf.L * 0.9, 0.35, 12, mats.rim, lf.w / 2 + lf.L / 2, 0.95, 0, lf.g); if (lf === finalLeaf) h.final = true; holds.push(h); const wasFinal = lf === finalLeaf; lf = null; if (wasFinal) { a0 = h.a; let yy = yStand + 38 * s; while (yy < CLOUD_Y - 6) { make(4, a0, yy, 'good', sOf(yy)); yy += 8 * sOf(yy); } break; } targetY = yStand + (z === 'lower' ? 12 : z === 'middle' ? 10 : 8) * 8 * s; y = yStand + 38 * s; a0 += arcStep(4, y, a0, s); continue;
      }
      let kind = 'good'; sinceBurl++;
      if (z !== 'lower' && sinceBurl >= (z === 'middle' ? 6 : 5)) { kind = 'burl'; sinceBurl = 0; }          // (a great knot to wedge himself against when the wind comes)
      else if (z === 'middle' && rnd() < 0.3) kind = 'slick';
      else if (z === 'upper' && rnd() < 0.34) kind = 'slick';
      make(4, a0, y, kind, s);
      if (kind === 'slick') make(4, a0 - 0.42, y + 0.8 * s, 'good', s);
      let da = nextDa(step);
      if (lf && n <= 6) { const e = angDiff(lfA, a0); if (Math.abs(e) > step * n * 0.95) { lf = null; targetY = y + 10; } else da = e / n; }       // (bend the winding so it meets the leaf)
      a0 += da; y += 8 * s; rung++;
    }
    holds.sort((p, q) => p.y - q.y);
    for (const h of holds) if (h.mesh) { const p = worldOf(h); h.mesh.position.copy(p); h.mesh.rotation.y = -h.a; }
    const sap = new THREE.Group(); stage.add(sap);                        // drips under the slick holds, so they can be read
    for (const h of holds) if (h.kind === 'slick') { const p = holdPos(h); box(0.9 * h.s, 4 * h.s, 0.9 * h.s, mats.slick, p.x, p.y - 3 * h.s, p.z, sap); }

    // ── Clouds overhead (the ceiling), and the shadow that slides through them. ──
    const cloudMats = [new THREE.MeshBasicMaterial({ color: 0xfbece0 }), new THREE.MeshBasicMaterial({ color: 0xf2dcd0 }), new THREE.MeshBasicMaterial({ color: 0xffffff })];
    const clouds = new THREE.Group(); stage.add(clouds);
    for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) { const w = 200 + rnd() * 70, m = box(w, 14 + rnd() * 10, w, cloudMats[(i + j + 14) % 3], CX + i * 190 + (rnd() - 0.5) * 30, CLOUD_Y + rnd() * 8, CZ + j * 190 + (rnd() - 0.5) * 30, clouds); m.rotation.y = rnd(); }
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1500, 560), new THREE.MeshBasicMaterial({ color: 0x1a1a2c, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }));
    shadow.rotation.x = Math.PI / 2; shadow.position.set(CX, CLOUD_Y - 7, CZ); stage.add(shadow);
    const lights = []; E.traverse(o => { if (o.isHemisphereLight || o.isDirectionalLight) lights.push([o, o.intensity]); });
    const sky0 = new THREE.Color(0xf0b890), sky1 = new THREE.Color(0x8fc6f0), fogOld = E.fog, bgOld = E.background;
    const camera = G.camera, nearOld = camera.near;

    // ── Jack on the stalk. ──
    const st = { gustN: 0, cur: grounds[1], fr: 1, y: 0, a: 0, r: 7, pos: v(CX, 0, CZ + HALF + 14), heading: Math.PI, walkN: 0, walkPh: 0, mode: 'walk', mt: 0, from: null, to: null, xf: false, fromW: null, stamina: 100, grip: false, gripPrev: false, hold: 0, cool: 0, gust: { t: 14, phase: 'wait' }, slip: 0, toastAt: 0, capAt: 0, pitch: 0.5, zoom: 1, wy: 0, wvy: 0, camA: Math.PI / 2, shake: 0, zone: 'lower', best: 0, ended: false, tut: 0, lock: 0 };
    jackOut.root.visible = true; jackOut.root.rotation.set(0, 0, 0); jackOut.root.position.copy(st.pos); W.paintJack(jackOut, { expr: 1 });
    const pose = { up: 0, reach: 0, stand: 1, fall: 0 };
    jackOut.after = r => {
      const t = G.t, tr = 0.04 * Math.sin(t * 22) * Math.max(0, 1 - st.stamina / 30);       // trembling when spent
      const hang = 1 - pose.stand, sw = Math.sin(t * 1.3) * 0.05;
      r.armL.rotation.x = lerp(0.05, -2.95 + (st.mode === 'move' || st.mode === 'rise' ? 0.5 * Math.sin(st.mt * 6.28) : 0), hang) + tr; r.armR.rotation.x = lerp(0.05, -2.95 - (st.mode === 'move' || st.mode === 'rise' ? 0.5 * Math.sin(st.mt * 6.28) : 0), hang) + tr;
      r.armL.rotation.z = lerp(0, 0.12, hang); r.armR.rotation.z = lerp(0, -0.12, hang);
      r.legL.thigh.rotation.x = lerp(0, -0.35 + sw + (st.mode === 'move' || st.mode === 'rise' ? 0.4 * Math.sin(st.mt * 6.28 + 1) : 0), hang); r.legR.thigh.rotation.x = lerp(0, -0.2 - sw + (st.mode === 'move' || st.mode === 'rise' ? 0.4 * Math.sin(st.mt * 6.28) : 0), hang);
      r.legL.knee.rotation.x = lerp(0, 0.6, hang); r.legR.knee.rotation.x = lerp(0, 0.9, hang);
      if (pose.fall) { r.armL.rotation.x = -2.2 + 0.4 * Math.sin(t * 30); r.armR.rotation.x = -2.2 - 0.4 * Math.sin(t * 30); }
      if (st.walkN > 0) { const w = Math.sin(st.walkPh) * 0.7 * st.walkN; r.legL.thigh.rotation.x += w; r.legR.thigh.rotation.x -= w; r.armL.rotation.x -= w * 0.8; r.armR.rotation.x += w * 0.8; }
      r.hips.position.y = 12 + Math.abs(Math.sin(st.walkPh)) * 0.5 * st.walkN; r.torso.rotation.x = lerp(0.05, 0.12, hang); r.neck.rotation.x = lerp(0.1, -0.25, hang);
    };

    // ── HUD ──
    const css = document.createElement('style');
    css.textContent = `#clHud { position: fixed; inset: 0; pointer-events: none; z-index: 12; font-family: Georgia, serif; color: #ece8df; }
      #clAlt { position: absolute; top: 12px; left: 14px; background: rgba(10,12,16,0.78); border: 1px solid #4a4d58; border-radius: 8px; padding: 6px 12px; font-size: 14px; }
      #clObj { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(10,12,16,0.78); border: 1px solid #4a4d58; border-radius: 8px; padding: 8px 16px; font-size: clamp(13px, 1.9vw, 17px); text-align: center; max-width: 60vw; }
      #clSt { position: absolute; left: 50%; bottom: 3.5vh; transform: translateX(-50%); width: min(340px, 56vw); } #clSt span { font-size: 12px; opacity: .85; letter-spacing: .08em; text-transform: uppercase; }
      #clBar { height: 12px; background: #1c1f27; border: 1px solid #454a58; border-radius: 5px; overflow: hidden; margin-top: 3px; } #clBar i { display: block; height: 100%; width: 100%; background: linear-gradient(90deg, #c9a84c, #7ab85a); transition: background .2s; } #clBar.low i { background: #c0503a; }
      #clHint { position: absolute; left: 50%; bottom: 22vh; transform: translateX(-50%); background: rgba(10,12,16,0.85); border: 1px solid #c9a84c; color: #f0d98a; padding: 5px 14px; border-radius: 6px; font-size: 14px; opacity: 0; }
      #clToast { position: absolute; left: 50%; bottom: 12vh; transform: translateX(-50%); background: rgba(10,12,16,0.85); border: 1px solid #4a4d58; padding: 8px 16px; border-radius: 8px; font-size: 14px; max-width: 80vw; text-align: center; opacity: 0; transition: opacity .4s; }
      #clVig { position: absolute; inset: 0; opacity: 0; } #clGust { position: absolute; inset: 0; opacity: 0; background: linear-gradient(90deg, rgba(255,255,255,.55), transparent 22%, transparent 78%, rgba(255,255,255,.55)); }
      #clGustTxt { position: absolute; top: 18%; left: 50%; transform: translateX(-50%); font-size: 20px; letter-spacing: .3em; color: #fff; text-shadow: 0 0 10px #000; opacity: 0; }`;
    document.head.appendChild(css);
    const hud = document.createElement('div'); hud.id = 'clHud';
    hud.innerHTML = '<div id="clVig"></div><div id="clGust"></div><div id="clGustTxt">WIND</div><div id="clAlt"></div><div id="clObj">Climb the beanstalk.</div><div id="clSt"><span>Stamina</span><div id="clBar"><i></i></div></div><div id="clToast"></div><div id="clHint"></div>';
    document.body.appendChild(hud);
    const $ = id => document.getElementById(id);
    const tipToast = (t, ms) => { if (!root.Tips.mobile()) toast(t, ms); };       // (the how-to tips are for the keyboard: the touch buttons say what they do)
    const toast = (t, ms = 3600) => { $('clToast').textContent = root.Tips.clean(t); $('clToast').style.opacity = 1; st.toastAt = performance.now() + ms; };
    const mutter = (t, force) => { if (!force && performance.now() < st.capAt) return; st.capAt = performance.now() + 7000; G.caption('jack', t); };
    const keys = {}, ui = root.TouchUI.create({ keys, run: true, jump: { icon: 'grip', label: 'Grip' }, cam: true }), stick = ui.stick, KM = { w: 'up', W: 'up', ArrowUp: 'up', s: 'down', S: 'down', ArrowDown: 'down', a: 'left', A: 'left', ArrowLeft: 'left', d: 'right', D: 'right', ArrowRight: 'right', ' ': 'grip', Shift: 'run' };
    const typing = e => e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    const kd = e => { if (typing(e)) return; const k = KM[e.key]; if (k) { keys[k] = true; if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); } if (e.repeat) return; if (e.key === 'v' || e.key === 'V') cycleZoom(); };
    const ku = e => { const k = KM[e.key]; if (k) keys[k] = false; };
    root.addEventListener('keydown', kd); root.addEventListener('keyup', ku);
    ui.on.jump = () => { keys.grip = true; st.gripRel = false; }; ui.on.jumpUp = () => { st.gripRel = true; };                     // (the big button is Space: hold it to brace; a tap climbs on, jumps, or takes the stalk)
    const ZOOMS = [{ name: 'Close', d: 52 }, { name: 'Medium', d: 92 }, { name: 'Far', d: 150 }], ZF = [52 / 92, 1, 150 / 92];      // (as in Chapter One)
    const camIcon = () => ui.set('cam', { icon: 'camera', title: 'Camera: ' + ZOOMS[st.zoom].name });
    function cycleZoom(dir) { st.zoom = (st.zoom + (dir || 1) + ZOOMS.length) % ZOOMS.length; camIcon(); }
    camIcon(); ui.on.cam = () => cycleZoom();
    const drags = new Map();
    const pd = e => drags.set(e.pointerId, { x: e.clientX, y: e.clientY }), pm = e => { const d = drags.get(e.pointerId); if (!d) return; const walkingNow = st.mode === 'walk' || st.mode === 'mount'; st.camA += (e.clientX - d.x) * 0.006; st.pitch = clamp(st.pitch + (e.clientY - d.y) * 0.005, walkingNow ? 0.08 : -0.9, walkingNow ? 1.35 : 1.45); d.x = e.clientX; d.y = e.clientY; }, pu = e => { drags.delete(e.pointerId); };
    const wheel = e => { e.preventDefault(); cycleZoom(e.deltaY > 0 ? 1 : -1); }; el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);

    // ── Reaching. ──
    const reachOf = h => 20 * (h.s || 1) * (h.kind === 'ground' ? 1.5 : 1);
    const yFrom = p => (p.kind === 'ledge' || p.kind === 'ground' ? p.y + 30 * (p.s || 1) : p.y);        // (hands, from a standing place)
    // The way from one hold to another as the screen shows it: across (sx) and up (sy), and how far (len). Along the one stalk it goes round by the surface; from stalk to stalk, straight.
    const vec = (p, q) => {
      if (p.fr === q.fr) { const rr = o => (o.kind === 'ledge' ? surfRf(o.fr, o.y, o.a) + 0.6 * o.s : o.r), dth = angDiff(q.a, p.a), r = (rr(p) + rr(q)) / 2, arc = -dth * Math.min(r, 12), up = q.y - yFrom(p), tm = p.a + dth / 2; return { sx: arc * Math.cos(tm - st.camA), sy: up, len: Math.hypot(arc, up) }; }
      const P = worldOf(p), Q = worldOf(q); P.y = yFrom(p); const dx = Q.x - P.x, dz = Q.z - P.z, up = Q.y - P.y; return { sx: dx * Math.sin(st.camA) - dz * Math.cos(st.camA), sy: up, len: Math.hypot(dx, dz, up) * 0.85 };
    };
    const reachable = (from, h) => { if (h === from || h.gone > 0.5 || h.kind === 'ground') return false; return vec(from, h).len <= reachOf(from) * (h.kind === 'ledge' ? 1.35 : 1) && h.y > 1; };
    const input = () => { let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), iy = (keys.up ? 1 : 0) - (keys.down ? 1 : 0); if (Math.hypot(stick.x, stick.y) > 0.3) { ix += stick.x; iy -= stick.y; } const m = Math.hypot(ix, iy); return m > 0.3 ? { x: ix / m, y: iy / m } : null; };
    function pick(from, inp) {
      if (inp.y < -0.5 && from.first) return grounds[from.fr];                   // (down from the lowest knot: back to the ground)
      let best = null, bs = -9;
      for (const h of holds) { if (Math.abs(h.y - yFrom(from)) > 70) continue; if (!reachable(from, h)) continue; const d = vec(from, h), M = Math.hypot(d.sx, d.sy) || 1, cos = (d.sx * inp.x + d.sy * inp.y) / M; if (cos < 0.25) continue; const sc = cos * 2 - d.len / reachOf(from); if (sc > bs) { bs = sc; best = h; } }
      if (!best && Math.abs(inp.y) > 0.5) {                 // (up or down on its own: the nearest sound way that way, whichever side of the stalk it winds to)
        let bd = 1e9; for (const h of holds) { if (h === from || h.gone > 0.5 || Math.abs(h.y - yFrom(from)) > 70 || !reachable(from, h)) continue; const dy = (h.y - yFrom(from)) * inp.y; if (dy < 0.5) continue; const dd = vec(from, h).len; if (dd < bd) { bd = dd; best = h; } }
      }
      return best;
    }
    const drain = () => (st.zone === 'upper' ? 1.4 : 1);
    function poseAt(h) {
      if (h.kind === 'ground') return { y: 0, a: h.a, r: h.r };
      if (h.kind === 'ledge') return { y: h.y, a: h.a, r: h.r };
      return { y: h.y - 34 * SC * sOf(h.y), a: h.a, r: surfRf(h.fr, h.y, h.a) + 2.4 * sOf(h.y) };
    }
    const poseWorld = (h, p) => { if (h.lf) return v(h.lf.x + Math.cos(p.a) * p.r, p.y, h.lf.z + Math.sin(p.a) * p.r); const c = centreOf(h.fr, p.y); return v(c.x + Math.cos(p.a) * p.r, p.y, c.z + Math.sin(p.a) * p.r); };
    const jackWorld = () => { const c = st.xf ? null : centreOf(st.fr, st.y); return c ? v(c.x + Math.cos(st.a) * st.r, st.y, c.z + Math.sin(st.a) * st.r) : st.pos.clone(); };
    function startMove(h, mode) {
      if (st.stamina <= 0 && h.kind !== 'ground') return;
      st.fromW = jackWorld(); st.xf = h.fr !== st.fr; st.from = { y: st.y, a: st.a, r: st.r }; st.to = h; st.mode = mode || 'move'; st.mt = 0;
      if (!mode) { st.stamina = Math.max(0, st.stamina - 3 * drain()); A && A.blip && A.blip(); }
    }
    function drop(msg, toLedge) {                   // loses his hold: falls to the nearest leaf below (or a good way down) and catches himself
      let tgt = null; const lim = st.cur.y;
      for (let i = holds.length - 1; i >= 0; i--) { const h = holds[i]; if (h.y < lim - 20 * sOf(lim) && h.kind === 'ledge' && h.gone < 0.5) { tgt = h; break; } }
      if (!tgt) { for (let i = holds.length - 1; i >= 0; i--) { const h = holds[i]; if (h.y < lim - 40 * sOf(lim) && h.kind !== 'slick' && h.fr === st.cur.fr) { tgt = h; break; } } }
      if (!tgt) tgt = grounds[st.cur.fr < 4 ? st.cur.fr : nearestVine(jackWorld())];
      if (toLedge && st.cur.kind === 'ledge') tgt = st.cur;
      st.lastFall = Math.round(st.cur.y); startMove(tgt, 'drop'); pose.fall = 1; st.stamina = Math.max(st.stamina, 35); if (msg) toast(msg + ' (fell at height ' + st.lastFall + ')', 4200); A && A.thwack && A.thwack(0.3, true, 0.3);
    }
    const nearestVine = p => { let bk = 0, bd = 1e9; VINE.forEach((q, k) => { const d = Math.hypot(p.x - q.x, p.z - q.z); if (d < bd) { bd = d; bk = k; } }); return bk; };
    const nearVineNow = () => { const k = nearestVine(st.pos); return Math.hypot(st.pos.x - VINE[k].x, st.pos.z - VINE[k].z) < 20; };
    const blockedAt = (x, z) => { if (x < -196 || x > 196 || z < -100 || z > 116) return true; for (const o of SOLID) if (x > o.x0 - 5 && x < o.x1 + 5 && z > o.z0 - 5 && z < o.z1 + 5) return true; for (const q of VINE) if (Math.hypot(x - q.x, z - q.z) < 6.5) return true; if (Math.hypot(x - CX, z - CZ) < 7) return true; return false; };
    function scheduleGust() { const z = st.zone; st.gust = { phase: 'wait', t: z === 'middle' ? 13 + rnd() * 7 : z === 'upper' ? 8 + rnd() * 5 : 999 }; }
    scheduleGust();

    // ── Each frame. ──
    const camPos = new V3(), camLook = new V3(); let ended = false, fovCur = 50;
    const GUSTLINES = ['Another gust of wind!', 'The wind is picking up.', 'Here comes another gust...', 'Wind again. Hold tight!', 'I can feel another gust coming.'];
    const GATE = v(0, 0, 118), DOORP = v(34, 0, 30);
    const tick = dt => {
      if (ended) return;
      const edge = !!keys.grip && !st.gripPrev, t = G.t, k = SC * sOf(st.y), walking = st.mode === 'walk' || st.mode === 'mount';
      st.zone = zoneOf(st.y); if (st.zone !== st.lastZone) { st.lastZone = st.zone; scheduleGust(); if (st.zone === 'middle') { mutter('It’s fighting me... the bark is slick with sap.', true); toast('The stalk resists: sap makes some holds slick, leaves curl away, and gusts come.', 6000); } else if (st.zone === 'upper') { mutter('The air is so thin... everything is harder.', true); toast('Thin air: your sight narrows and your strength drains faster. Great knots on the stalk give you a place to brace.', 6000); } }
      // The leaves that curl away.
      for (const h of holds) if (h.kind === 'ledge' && h.leaf) {
        const on = st.cur === h && st.mode === 'idle', lim = st.zone === 'middle' ? 12 : st.zone === 'upper' ? 15 : 1e9;
        if (st.zone !== 'lower') { if (h.gone <= 0 && on) { h.curlT += dt; if (h.curlT > lim - 2.5 && !h.warned) { h.warned = true; toast('The leaf is starting to curl. Move on soon.', 2400); } if (h.curlT > lim) { h.gone = 1; h.curlT = 0; h.warned = false; drop('The leaf curls away beneath you!'); } } else if (h.gone > 0) { h.curlT += dt; if (h.curlT > 7) { h.gone = 0; h.curlT = 0; } } if (h.gone <= 0 && !on) { h.curlT = Math.max(0, h.curlT - dt * 2); h.warned = false; } }
        if (h.rim) h.rim.visible = h.gone <= 0 && st.zone !== 'upper';
        const want = h.gone > 0 ? 1.45 : 0, windy = st.gust.phase === 'warn' || st.gust.phase === 'blow' ? 0.09 * Math.sin(t * 9 + h.ph) : 0; h.curl = lerp(h.curl, want, Math.min(1, dt * 4)); h.leaf.rotation.z = -0.25 - h.curl + windy; h.leaf.rotation.x = h.curl * 0.2;
      }
      // Gusts: a warning first, then the blow.
      const g = st.gust; if (!walking) g.t -= dt;
      if (g.phase === 'wait' && g.t <= 0) { g.phase = 'warn'; g.t = 3.2; A && A.ambience({ wind: 0.9, birds: 0.1, fire: 0 }); const first = !st.gustSaid; st.gustSaid = true; mutter(first ? 'That’s the wind rising... a gust is coming. I have to hold on to something!' : GUSTLINES[st.gustN++ % GUSTLINES.length], true); }
      else if (g.phase === 'warn' && g.t <= 0) { g.phase = 'blow'; g.t = 1.5; }
      else if (g.phase === 'blow') {
        st.shake = 1;
        if (g.t <= 0) { A && A.ambience({ wind: 0.35, birds: 0.4, fire: 0 }); scheduleGust(); }
        else if (!g.hit && st.mode !== 'drop' && !walking) { g.hit = true; if (st.grip) { st.stamina = Math.max(0, st.stamina - 12); toast('You hold on against the wind.', 1800); } else if (st.cur.kind === 'ledge') { toast('The leaf bucks, but you ride it out.', 1800); } else if (st.cur.kind === 'burl') { toast('You wedge yourself against the great knot.', 1800); } else { st.stamina = Math.max(0, st.stamina - 14); drop('The gust tears you from the stalk!'); } }
      }
      if (g.phase !== 'blow') g.hit = false;
      // On the ground: free to roam.
      if (st.mode === 'walk') {
        const f = v(-Math.cos(st.camA), 0, -Math.sin(st.camA)), r = v(Math.sin(st.camA), 0, -Math.cos(st.camA));
        const dir = v(0, 0, 0).addScaledVector(f, (keys.up ? 1 : 0) - (keys.down ? 1 : 0)).addScaledVector(r, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
        if (Math.hypot(stick.x, stick.y) > 0.2) dir.addScaledVector(f, -stick.y).addScaledVector(r, stick.x);
        if (dir.lengthSq() > 0) { dir.normalize(); const want = Math.atan2(dir.x, dir.z); st.heading = st.heading + angDiff(want, st.heading) * Math.min(1, dt * 9); const off = Math.abs(angDiff(want, st.heading)), ease = Math.max(0.2, Math.min(1, 1 - off / Math.PI * 0.8)), sp = (keys.run ? 50 : 26) * SC * ease, nx = st.pos.x + Math.sin(st.heading) * sp * dt, nz = st.pos.z + Math.cos(st.heading) * sp * dt; if (!blockedAt(nx, st.pos.z)) st.pos.x = nx; if (!blockedAt(st.pos.x, nz)) st.pos.z = nz; st.walkN = 1; st.walkPh += sp * dt * 0.42 / 0.95 / Math.max(0.2, ease); } else st.walkN = Math.max(0, st.walkN - dt * 6);
        if (edge && !nearVineNow()) st.wvy = 112;                                    // (Space jumps, as in Chapter One, unless a stalk is at hand to climb)
        st.wvy -= 420 * dt; st.wy += st.wvy * dt; if (st.wy <= 0) { st.wy = 0; st.wvy = 0; }
        st.stamina = Math.min(100, st.stamina + 30 * dt);
        const vk = nearestVine(st.pos), dv = Math.hypot(st.pos.x - VINE[vk].x, st.pos.z - VINE[vk].z), nearV = dv < 20;
        if (nearV && keys.grip && !st.gripPrev) { st.mount = { k: vk, t: 0, from: st.pos.clone() }; st.mode = 'mount'; }
        // Wandering towards the way out, or the door: he reminds himself why he is here.
        if (Math.hypot(st.pos.x - GATE.x, st.pos.z - GATE.z) < 26) mutter('No... not out there. I came to find what lies at the top of that stalk.');
        else if (Math.hypot(st.pos.x - DOORP.x, st.pos.z - DOORP.z) < 20) mutter('I can’t go back to bed now. I have to know what lies at the top of that stalk.');
        $('clHint').textContent = nearV ? 'Space: climb this stalk' : ''; $('clHint').style.opacity = nearV ? 1 : 0;
      } else if (st.mode === 'mount') {
        const m = st.mount; m.t += dt / 0.55; const u = clamp(m.t, 0, 1), e = u * u * (3 - 2 * u), gn = grounds[m.k], to = poseWorld(gn, poseAt(gn));
        st.pos.set(lerp(m.from.x, to.x, e), 0, lerp(m.from.z, to.z, e)); st.heading = st.heading + angDiff(Math.atan2(centreOf(m.k, 0).x - st.pos.x, centreOf(m.k, 0).z - st.pos.z), st.heading) * Math.min(1, dt * 12); st.walkN = 0.6;
        if (u >= 1) { st.cur = gn; st.fr = m.k; st.y = 0; st.a = gn.a; st.r = gn.r; st.xf = false; st.mode = 'idle'; st.walkN = 0; startMove(gn.first); }
      }
      // Strength.
      { const gl = { label: 'Grip', icon: 'grip', enabled: false };                       // (what the big button does now: jump or take a stalk on the ground, climb on from a leaf, brace on a hold)
        if (st.mode === 'walk') { if (nearVineNow()) { gl.label = 'Climb'; gl.icon = 'climb'; gl.enabled = true; } else { gl.label = 'Jump'; gl.icon = 'jump'; gl.enabled = st.wy <= 0.01; } }
        else if (st.mode === 'idle') { if (st.cur.kind === 'ledge') { gl.label = 'Climb on'; gl.icon = 'climb'; gl.enabled = st.lock <= 0; } else gl.enabled = st.stamina > 0; }
        ui.set('jump', gl); }
      st.grip = !!keys.grip && st.mode === 'idle'; st.gripPrev = !!keys.grip; if (st.gripRel) { st.gripRel = false; keys.grip = false; }
      if (st.mode === 'idle') {
        const onLedge = st.cur.kind === 'ledge', onBurl = st.cur.kind === 'burl';
        if (onLedge) st.stamina = Math.min(100, st.stamina + 16 * dt);
        else if (onBurl) st.stamina = Math.min(100, st.stamina + 3 * dt);
        else st.stamina = Math.max(0, st.stamina - 1.6 * drain() * (st.grip ? 0.3 : 1) * dt * (st.zone === 'lower' ? 0.6 : 1));
        if (st.stamina <= 0) { drop('Your arms give out! You slide, and catch yourself below.'); }
        else { // slick holds: leave them quickly
          if (st.cur.kind === 'slick') { st.slip += dt; if (st.slip > 0.75) { st.slip = 0; st.stamina = Math.max(0, st.stamina - 10); drop('Slick with sap! Your hands slide off.'); } } else st.slip = 0;
          st.cool -= dt; if (st.lock > 0) { st.lock -= dt; if (st.lock <= 0) tipToast('Rested. Press Space to climb on.', 2600); } const inp = st.lock > 0 ? null : input();
          if (st.cur.kind === 'ledge') { if (edge && st.lock <= 0 && st.cool <= 0) { const h = pick(st.cur, { x: 0, y: 1 }); if (h) startMove(h); } }       // (a leaf is a stop: out on it, away from the stalk, he climbs on only when told: Space)
          else if (inp && st.cool <= 0 && !st.grip && st.mode === 'idle') { const h = pick(st.cur, inp); if (h) startMove(h); else st.cool = 0.12; }
        }
        if (st.mode === 'idle') { const p = poseAt(st.cur); st.fr = st.cur.fr; st.y = lerp(st.y, p.y, Math.min(1, dt * 12)); st.a = st.a + angDiff(st.cur.a, st.a) * Math.min(1, dt * 12); st.r = p.r; }
      } else if (st.mode === 'move' || st.mode === 'drop') {
        const dur = st.mode === 'drop' ? 0.75 : 0.42; st.mt += dt / dur; const u = clamp(st.mt, 0, 1), e = st.mode === 'drop' ? u * u : u * u * (3 - 2 * u), p = poseAt(st.to); st.eMove = e;
        if (st.xf) { const W2 = poseWorld(st.to, p); st.pos.set(lerp(st.fromW.x, W2.x, e), lerp(st.fromW.y, W2.y, e), lerp(st.fromW.z, W2.z, e)); st.a = st.a + angDiff(p.a, st.a) * Math.min(1, dt * 8); }
        else { const da = angDiff(st.to.a, st.from.a); st.y = lerp(st.from.y, p.y, e); st.a = st.from.a + da * e; st.r = lerp(st.from.r, p.r, e); }
        if (u >= 1) {
          st.cur = st.to; st.fr = st.to.fr; st.mode = 'idle'; st.cool = 0.14; pose.fall = 0; st.best = Math.max(st.best, st.cur.y); st.xf = false; st.a = st.cur.a; const pp = poseAt(st.cur); st.y = pp.y; st.r = pp.r;
          if (st.cur.kind === 'ground') { const w = poseWorld(st.cur, pp); st.pos.set(w.x, 0, w.z); st.heading = Math.atan2(centreOf(st.fr, 0).x - w.x, centreOf(st.fr, 0).z - w.z) + Math.PI; st.mode = 'walk'; st.stamina = 100; st.zone = 'lower'; }
          else if (st.cur.kind === 'ledge' && !st.restedOnce) { st.restedOnce = true; st.lock = 4.5; st.stamina = Math.min(st.stamina, 55); st.capAt = 0; mutter('A broad leaf. I can rest here.', true); toast('Where the path crosses a leaf, you rest. Your strength returns while you stand on it; press Space to climb on.', 5600); }
        }
      }
      pose.stand = lerp(pose.stand, st.mode === 'rise' ? 0 : walking || st.mode === 'walk' || st.cur.kind === 'ledge' ? (st.mode === 'move' ? 0.5 : 1) : 0, Math.min(1, dt * 9));
      if (st.mode === 'drop') pose.stand = 0;
      // Teaching.
      if (st.tut === 0 && t > 1.0) { st.tut = 1; tipToast('Walk up to one of the four outer stalks, then press Space to climb. Any of them will do.', 7000); }
      else if (st.tut === 1 && st.mode === 'idle' && st.cur.kind !== 'ground') { st.tut = 2; st.tutAt = t; mutter('Hand over hand. Up we go.'); tipToast('Reach for a glowing handhold: W A S D, or the stick.', 6000); }
      else if (st.tut === 2 && t > st.tutAt + 8) { st.tut = 3; tipToast('Hanging tires you. Hold Space to grip and steady yourself; it costs less strength.', 7000); }
      else if (st.tut === 3 && st.stamina < 65) { st.tut = 4; tipToast('Watch the stamina bar. Where the path crosses a broad leaf you rest and recover; press Space to climb on when you are ready.', 7000); }
      if (st.best > TOP - 70 && !st.near) { st.near = true; mutter('Cloud! I can see the cloud above!', true); }
      { const tgt = st.mode === 'idle' ? st.cur : st.to, hang = tgt && tgt.kind !== 'ground' && tgt.kind !== 'ledge' && !st.xf;
        if (hang && st.mode !== 'rise') { const kz = sOf(st.y), rj = Math.max(surfRf(st.fr, st.y, st.a), surfRf(st.fr, st.y + 18 * kz, st.a), surfRf(st.fr, st.y + 32 * kz, st.a)) + 3 * SC * kz; st.r = st.mode === 'idle' ? rj : lerp(st.from.r, rj, st.eMove || 0); } }
      // Jack himself: scaled down as he climbs.
      jackOut.root.scale.setScalar(k);
      let pos, face;
      if (st.mode === 'walk' || st.mode === 'mount' || st.xf) { pos = st.pos.clone(); if (st.mode === 'walk') pos.y = st.wy; face = st.mode === 'walk' || st.mode === 'mount' ? st.heading : Math.atan2(-Math.cos(st.a), -Math.sin(st.a)); }
      else { const tp = centreOf(st.fr, st.y); pos = v(tp.x + Math.cos(st.a) * st.r, st.y, tp.z + Math.sin(st.a) * st.r); face = Math.atan2(-Math.cos(st.a), -Math.sin(st.a)); if (st.mode !== 'rise') st.pos.copy(pos); }
      jackOut.root.position.copy(pos); jackOut.root.rotation.y = face;
      // Which holds are within reach (lower: bright and pulsing; middle: a faint tint).
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      for (const h of holds) if (h.mesh) { const near = st.mode === 'idle' && st.cur.kind !== 'ground' && Math.abs(h.y - st.cur.y) < 60 && reachable(st.cur, h); const base = h.kind === 'slick' ? mats.slick : mats.good; h.mesh.material = near && st.zone === 'lower' ? mats.glow : near && st.zone === 'middle' && h.kind === 'good' ? mats.faint : base; h.mesh.scale.setScalar(near && st.zone === 'lower' ? 1.15 + 0.2 * pulse : 1); }
      // The sky, the light and the air.
      const hf = clamp(st.y / TOP, 0, 1), sky = sky0.clone().lerp(sky1, hf); E.background = sky; E.fog = new THREE.Fog(sky.getHex(), 260 + hf * 300, 1500);
      const sx = CX + lerp(-1700, 1700, ((t % 46) / 46)), shade = clamp(1 - Math.abs(sx - pos.x) / 650, 0, 1) * clamp((st.y - 380) / 200, 0, 1); shadow.position.x = sx;
      for (const [l, i0] of lights) l.intensity = i0 * (1 - 0.45 * shade);
      const vig = clamp((st.y - 500) / 260, 0, 1), low = st.stamina < 25 && !walking ? 0.2 * (0.5 + 0.5 * Math.sin(t * 6)) : 0;
      $('clVig').style.opacity = Math.min(1, vig + low); $('clVig').style.background = `radial-gradient(circle at 50% 52%, transparent ${Math.round(lerp(90, 18, vig))}%, rgba(8,10,16,${0.55 + 0.4 * vig}) ${Math.round(lerp(120, 48, vig))}%)`;
      $('clGust').style.opacity = g.phase === 'warn' ? 0.25 + 0.5 * (1 - g.t / 3.2) : g.phase === 'blow' ? 0.8 : 0; $('clGustTxt').style.opacity = 0;
      if (st.mode !== 'walk') { const onL = st.cur.kind === 'ledge' && st.mode === 'idle', near = !onL && st.mode === 'idle' && holds.some(h => h.kind === 'ledge' && h.gone <= 0 && Math.abs(h.y - st.y) < 40 && reachable(st.cur, h)); $('clHint').textContent = onL ? (st.stamina < 99.5 ? 'Resting on the leaf. Press Space to climb on.' : 'Rested. Press Space to climb on.') : near ? 'A leaf ahead: a place to rest' : ''; $('clHint').style.opacity = $('clHint').textContent ? 1 : 0; }
      $('clAlt').textContent = st.mode === 'walk' ? 'On the ground' : `Height ${Math.round(st.mode === 'idle' ? st.cur.y : st.to ? st.to.y : st.y)}   ·   ${st.zone === 'lower' ? 'Lower stalk' : st.zone === 'middle' ? 'Middle stalk' : 'Upper stalk'}${st.lastFall != null ? '   ·   last fall at ' + st.lastFall : ''}`;
      $('clObj').textContent = st.mode === 'walk' ? 'Choose a stalk to climb.' : 'Climb the beanstalk.';
      $('clBar').firstChild.style.width = st.stamina + '%'; $('clBar').classList.toggle('low', st.stamina < 25); $('clSt').style.opacity = st.mode === 'walk' ? 0.4 : 1;
      if (st.toastAt && performance.now() > st.toastAt) { $('clToast').style.opacity = 0; st.toastAt = 0; }
      // The camera: outside him, at his own scale (so as he shrinks the stalk looms), held under the cloud.
      const kk = sOf(st.y);       // (the view is the player's: all the way round, never turned for him; only the cloud ceiling and the ground hold it back; zoom is Chapter One's three steps)
      const walkCam = st.mode === 'walk' || st.mode === 'mount', d = walkCam ? ZOOMS[st.zoom].d : (88 + 14 * (st.zone === 'upper' ? 1 : 0)) * kk * ZF[st.zoom], ax = centreOf(st.fr, st.y);
      const at = walkCam ? v(pos.x, st.wy + 15 * SC, pos.z) : v(lerp(ax.x, pos.x, 0.6), st.y + (st.cur.kind === 'ledge' ? 14 : -4) * kk * 0.95, lerp(ax.z, pos.z, 0.6));
      const want = v(at.x + Math.cos(st.camA) * d * Math.cos(st.pitch), at.y + Math.sin(st.pitch) * d * 0.9 + 6 * kk, at.z + Math.sin(st.camA) * d * Math.cos(st.pitch));
      if (st.cine) { want.copy(st.cine.pos); at.copy(st.cine.look); }
      want.y = clamp(want.y, 3, CLOUD_Y - 8); at.y = Math.min(at.y, CLOUD_Y - 2);
      if (st.shake > 0) { want.x += (Math.random() - 0.5) * 2.2 * kk; want.y += (Math.random() - 0.5) * 1.6 * kk; st.shake = Math.max(0, st.shake - dt * 3); }
      if (camPos.lengthSq() === 0) camPos.copy(want); else camPos.lerp(want, Math.min(1, dt * (st.cine ? 2.2 : 8))); camLook.lerp(at, st.cine ? Math.min(1, dt * 4) : 1);
      fovCur = lerp(fovCur, st.cine ? st.cine.fov : g.phase === 'blow' ? 56 : 50, Math.min(1, dt * 4));
      G.cut({ pos: camPos, look: camLook, fov: fovCur });
      // At the top: up through the cloud.
      if (!st.ended && st.cur.final && st.mode === 'idle') { st.ended = true; finish(); }
    };
    async function finish() {
      // The last leaf: a breath, a line, and then straight up the stalk and into the cloud.
      const h = st.cur, kk = sOf(st.y), d0 = st.r; G.mode = 'cutscene'; document.body.classList.add('cutscene'); st.mode = 'cut'; st.lock = 0; st.gust = { phase: 'wait', t: 9999 }; hud.style.display = 'none'; ui.show(false); A && A.ambience({ wind: 0.5, birds: 0, fire: 0 });
      const jp = () => { const c = centreOf(4, st.y); return v(c.x + Math.cos(st.a) * st.r, st.y, c.z + Math.sin(st.a) * st.r); };
      const side = h.a + Math.PI / 2, setCine = (dist, below, lookUp, fov) => { const j = jp(); st.cine = { pos: v(j.x + Math.cos(side) * dist * kk, j.y + below * kk, j.z + Math.sin(side) * dist * kk), look: v(j.x, j.y + lookUp * kk, j.z), fov }; };
      setCine(120, 6, 14, 42); await G.wait(1.6);
      await G.say('jack', 'Look at that... the cloud is right above me.');
      setCine(84, 2, 16, 38); await G.say('jack', 'I feel like I’m almost there.');
      // He steps in to the stalk, and goes up it hand over hand.
      const rHang = Math.max(surfRf(4, st.y, st.a), surfRf(4, st.y + 18 * kk, st.a), surfRf(4, st.y + 32 * kk, st.a)) + 3 * SC * kk, y0 = st.y + 6 * kk;
      st.mode = 'rise'; st.cur = h; const yRise = CLOUD_Y + 24;
      for (let i = 0; i <= 37; i++) { const u = i / 37, e = u * u * (3 - 2 * u); st.r = lerp(d0, rHang, e); st.y = lerp(h.y, y0, e); st.mt = i * 0.03 / 0.55; await G.wait(0.03); }
      const up = yRise - y0; setCine(74, -22, 8, 44);
      for (let i = 0; i <= 250; i++) { const u = i / 250; st.y = y0 + up * (0.15 * u + 0.85 * u * u); st.r = rHang; st.mt = i * 0.03 / 0.5; setCine(74 + 12 * u, -22 + 6 * u, 8, 44); await G.wait(0.03); }
      const f = $('fade'); f.style.background = '#fff'; await G.fade(true, 1.4);
      await G.wait(0.4); cleanup(); f.style.background = ''; G.mode = 'end'; document.body.classList.remove('cutscene'); resolve({ top: true });
    }
    // (a tick-mode of 'rise' lets the frame code above keep placing him as st.y changes)
    function cleanup() {
      ended = true; root.removeEventListener('keydown', kd); root.removeEventListener('keyup', ku); el.removeEventListener('wheel', wheel); el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu);
      G.updaters = G.updaters.filter(u => u !== tick); hud.remove(); css.remove(); ui.destroy(); E.remove(stage); E.fog = fogOld; E.background = bgOld; for (const [l, i0] of lights) l.intensity = i0; jackOut.after = null; jackOut.root.scale.setScalar(SC); camera.near = nearOld;
    }
    camera.near = 0.3; camera.updateProjectionMatrix();
    G.updaters.push(tick); G.climb = { st, holds, drop, pick, reachable, grounds };           // (for tools and tests)
    G.fade(false, 1.4);
    mutter('There it is. Whatever lies at the top, I mean to see it.', true);
  });
}

root.Climb = { run };
})(typeof window !== 'undefined' ? window : globalThis);
