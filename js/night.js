// Climbing Toward Consequence — the close of Chapter One: the cottage at night.
//   Jack comes home through the gate and up to the door under the stars; then, indoors, he tells his Mother what he has done with the cow, in a tone set by the choices he made at the
//   Peddler's cart; she is furious, sits in the chair by the hearth and calls him to her. The scene ends there, as he steps up to her knee: the correction itself is to be a scene of its own.
//   A beat is one camera angle (see G.cut in game.js): everyone is put where they stand as it begins, and what happens in it happens in view of that one angle.
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky, C = root.Cast, F = root.Farm, A = root.GameAudio, V3 = THREE.Vector3;
const v = (x, y, z) => new V3(x, y, z), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const turn = (from, to, t) => { const d = ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return from + d * t; };
const SC = 0.95, STAGE_Y = 5.7;

// How brash Jack was at the cart, from his three choices: 0 (the most humble) to 6.
function brashness(choices) {
  const c = choices || [];
  return [2, 1, 0][c[0]] + [1, 0, 2][c[1]] + [2, 1, 0][c[2]] || 0;
}
const tierOf = c => { const b = brashness(c); return b >= 5 ? 2 : b >= 3 ? 1 : 0; };     // 0 humble, 1 cheeky, 2 brash

// ── The night outside: the same farm, under the stars. ──
function nightify(ext) {
  const s = ext.scene, T = F.textures();
  s.background = new THREE.Color(0x070b18); s.fog = new THREE.Fog(0x070b18, 220, 900);
  s.traverse(o => {
    if (o.isHemisphereLight) { o.color.set(0x6a7ab8); o.groundColor.set(0x1a1a24); o.intensity = 0.75; }
    else if (o.isDirectionalLight) { o.color.set(0x9db4f0); o.intensity = 0.55; }
    if (o.isMesh && o.material && o.material.map === T.cloud) o.visible = false;
  });
  const pts = []; let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 260; i++) { const th = rnd() * Math.PI * 2, ph = 0.15 + rnd() * 1.2; pts.push(Math.cos(th) * Math.cos(ph) * 1500, Math.sin(ph) * 1500, Math.sin(th) * Math.cos(ph) * 1500); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  s.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: false, fog: false })));
  const moon = new THREE.Mesh(new THREE.BoxGeometry(60, 60, 8), new THREE.MeshBasicMaterial({ color: 0xf4f0d8, fog: false })); moon.position.set(-700, 700, -900); moon.lookAt(0, 0, 0); s.add(moon);
  // The warmth of the windows and the door spilling out onto the yard.
  for (const [x, y, z, i] of [[-34, 30, 40, 1.1], [8, 30, 40, 1.1], [34, 20, 40, 0.9]]) { const l = new THREE.PointLight(0xffb060, i, 150, 1.5); l.position.set(x, y, z); s.add(l); }
  ext.cow.visible = false;
}

function build(G) {
  const ext = F.exterior(); nightify(ext);
  const int = F.interior(), scene = int.scene;
  // ── Actors: Jack and his Mother as they stand and walk and talk. ──
  const paintJack = (rig, o) => { B.paintJackInto(rig.skin, Object.assign({ outfit: 'Outdoor', expr: 0, trousers: 'up', drawers: 'up' }, o || {})); rig.tex.needsUpdate = true; rig.legL.ring.visible = rig.legR.ring.visible = !!(o && o.trousers === 'down'); };
  const mk = () => {
    const j = B.makeJack(); j.root.scale.setScalar(SC); paintJack(j); B.setPose(j, 'stand'); for (let i = 0; i < 30; i++) B.step(j, 0.1); return j;
  };
  const ja = { t: 0, phase: 0, speed: 0, bare: 0, hold: 0, cover: 0, bow: 0, look: 0, fist: 0, shuffle: 0, rub: 0, hitch: 0 };
  const hold = (rig, st) => { rig.after = r => st(r); return rig; };
  const jackOut = mk(), jackIn = mk();                       // outside under the stars, and in the room
  const poseJack = (rig, a) => r => {
    const sw = Math.sin(a.phase) * clamp(a.speed / 20, 0, 1) * (a.shuffle ? 0.35 : 0.7), idle = 0.015 * Math.sin(a.t * 1.1);
    r.legL.thigh.rotation.x = sw; r.legR.thigh.rotation.x = -sw;
    r.armL.rotation.x = -sw * 0.8 + idle; r.armR.rotation.x = sw * 0.8 - idle; r.armL.rotation.z = r.armR.rotation.z = 0;
    if (a.fist) { r.armR.rotation.x = -1.0 * a.fist; r.armR.rotation.z = -0.15; }
    if (a.hold) { r.armL.rotation.x = r.armR.rotation.x = -1.25 * a.hold; r.armL.rotation.z = 0.2; r.armR.rotation.z = -0.2; }
    if (a.cover) { r.armL.rotation.x = r.armR.rotation.x = 0.7 * a.cover; r.armL.rotation.z = -0.35 * a.cover; r.armR.rotation.z = 0.35 * a.cover; }
    if (a.rub) {      // nursing his bottom, as in the opening: both hands back on it, rubbing; his weight shifting from foot to foot, his head down
      for (const [arm, sg] of [[r.armL, 1], [r.armR, -1]]) { arm.rotation.x = 0.34 + 0.05 * Math.sin(a.t * 5 + sg); arm.rotation.z = -sg * 0.3; }
      r.legL.thigh.rotation.x = 0.04 * Math.sin(a.t * 1.2); r.legR.thigh.rotation.x = -0.04 * Math.sin(a.t * 1.2); r.hips.position.x = 0.6 * Math.sin(a.t * 0.8);
    }
    r.neck.rotation.x = 0.28 * a.bow + 0.03 * Math.sin(a.t * 0.9); r.neck.rotation.y = a.look; r.torso.rotation.x = 0.06 * a.bow;
    r.hips.position.y = 12 + Math.abs(Math.sin(a.phase)) * 0.5 * clamp(a.speed / 20, 0, 1);
    if (a.air) { r.armL.rotation.x = r.armR.rotation.x = -2.5; r.legL.thigh.rotation.x = -0.5; r.legR.thigh.rotation.x = 0.25; r.legR.knee.rotation.x = 0.5; }       // (the leap, as in Chapter One)
    if (a.hitch) {      // pulling his trousers up: he bends to take them at the knee (0 to 0.4), holds a beat, then gives them a hitch as he straightens (0.55 on) and settles
      const p = a.hitch, bend = p < 0.4 ? p / 0.4 : p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.3), tug = p > 0.55 && p < 0.85 ? Math.sin(Math.PI * (p - 0.55) / 0.3) : 0, ease = bend * bend * (3 - 2 * bend);
      r.torso.rotation.x = 0.06 * a.bow + 0.62 * ease; r.neck.rotation.x = 0.28 * a.bow - 0.2 * ease; r.hips.position.y = 12 - 0.7 * ease + 0.5 * tug;
      r.legL.thigh.rotation.x = r.legR.thigh.rotation.x = -0.1 * ease; r.legL.knee.rotation.x = r.legR.knee.rotation.x = 0.2 * ease;
      for (const [arm, sg] of [[r.armL, 1], [r.armR, -1]]) { arm.rotation.x = -0.35 * ease - 0.45 * tug; arm.rotation.z = sg * 0.06 * ease; }
    }
    // The garden's work: carrying a stone in both arms; crouching to a weed, a furrow, a bean; swinging the hoe overhead and down.
    if (a.carry) { r.armL.rotation.x = r.armR.rotation.x = -1.15 * a.carry; r.armL.rotation.z = 0.18 * a.carry; r.armR.rotation.z = -0.18 * a.carry; }
    if (a.crouch) { const c = a.crouch; r.hips.position.y = 12 - 5 * c; r.legL.thigh.rotation.x = r.legR.thigh.rotation.x = -1.1 * c; r.legL.knee.rotation.x = r.legR.knee.rotation.x = 1.5 * c; r.torso.rotation.x = 0.5 * c; r.armL.rotation.x = -1.3 * c + 0.12 * c * Math.sin(a.t * 9); r.armR.rotation.x = -1.3 * c - 0.12 * c * Math.sin(a.t * 9); }
    if (a.dig) { const k = 0.5 - 0.5 * Math.cos(a.digT * 5.5), sw = -2.5 + 1.9 * k; r.armL.rotation.x = r.armR.rotation.x = sw; r.armL.rotation.z = 0.12; r.armR.rotation.z = -0.12; r.torso.rotation.x = 0.1 + 0.35 * k; }
  };
  const aOut = { t: 0, phase: 0, speed: 0, bare: 0, hold: 0, cover: 0, bow: 0, look: 0, fist: 0, shuffle: 0, rub: 0, carry: 0, crouch: 0, dig: 0, digT: 0 }, aIn = ja;
  hold(jackOut, poseJack(jackOut, aOut)); hold(jackIn, poseJack(jackIn, aIn));
  jackOut.root.visible = false; ext.scene.add(jackOut.root);
  const mother = C.makeMother(); mother.setExpr(1);
  const ma = { t: 0, phase: 0, speed: 0, wag: 0, gesture: 0, fold: 0, chin: 0, tilt: 0, birch: 0, point: 0, side: 0 };
  mother.after = r => {
    const s = Math.sin(ma.phase) * clamp(ma.speed / 12, 0, 1) * 0.6, t = ma.t;
    if (mother.pose !== 'sit') { r.legL.thigh.rotation.x = s; r.legR.thigh.rotation.x = -s; }
    const f = ma.fold;
    r.armL.rotation.x = (mother.pose === 'sit' ? -0.9 : -0.05) * (1 - f) - 1.0 * f; r.armL.rotation.z = -0.1 * (1 - f) + 0.55 * f;
    r.armR.rotation.x = (-0.5 - 0.5 * ma.gesture + ma.wag * 0.14 * Math.sin(t * 8) - 0.5 * ma.point) * (1 - f) - 1.1 * f; r.armR.rotation.z = (0.15 + 0.1 * ma.gesture) * (1 - f) - 0.55 * f;
    if (r.elbow) r.elbow.rotation.x = (-0.3 - 0.9 * ma.gesture) * (1 - f) - 0.6 * f;
    if (ma.side) { r.armL.rotation.x = -0.05; r.armL.rotation.z = -0.1; r.armR.rotation.x = -0.05; r.armR.rotation.z = 0.1; if (r.elbow) r.elbow.rotation.x = -0.05; }     // (both arms hanging still at her sides)
    r.neck.rotation.y = ma.chin * 0.65; r.neck.rotation.x = 0.05 + 0.04 * Math.sin(t * 0.7); r.neck.rotation.z = ma.tilt * 0.12;
  };
  // The glutes block for the correction's standing-bared beats: it stands proud of the back of his torso box, so that the whole of the coloured area shows (hidden otherwise).
  const jackGl = B.makeGlutes(); jackGl.mesh.scale.set(0.98, 1, 0.45); jackGl.mesh.position.set(0, -1.4, -2.4); jackGl.mesh.visible = false; jackIn.hips.add(jackGl.mesh);
  scene.add(mother.root); scene.add(jackIn.root);
  int.chair.visible = true;
  const world = { scene: ext.scene, update(dt, t) { ext.update(dt, t); aOut.t += dt; B.step(jackOut, dt); } };
  const iworld = { scene, update(dt, t) { int.update(dt, t); ja.t += dt; ma.t += dt; B.step(jackIn, dt); B.step(mother, dt); } };
  // Where the chair stands (the room editor decides), and which way it faces.
  const ch = int.spots.chair, SEAT = { x: ch.x, z: ch.z, ry: int.spots.chairRy };
  return { SEAT, ext, int, jackOut, aOut, jackIn, jackGl, ja, mother, ma, paintJack, world, iworld, scene };
}

// ──────────────────────────────────────────────────────────────────────────────────────────
async function run(G, choices, opts) {
  opts = opts || {};
  const W = build(G), tier = tierOf(choices), who = (w, t, o) => G.say(w, t, o);
  const { jackOut, aOut, jackIn, ja, mother, ma, int, SEAT } = W;
  const pick = (a, b, c) => [a, b, c][tier];
  // The indoor staging is laid out from the chair: cl(a, y, b) is a point a units ahead of it (the way it faces) and b to its right, so it follows the chair wherever the room editor puts it.
  const cl = (a, y, b) => v(SEAT.x + a * Math.sin(SEAT.ry) + (b || 0) * Math.cos(SEAT.ry), y, SEAT.z + a * Math.cos(SEAT.ry) - (b || 0) * Math.sin(SEAT.ry));
  G.mode = 'cutscene'; document.body.classList.add('cutscene'); G.drone = null;
  const walk = async (rig, a, pts, speed, face) => {                    // walk a rig through points, its feet going
    for (const q of pts) {
      let d = Math.hypot(q.x - rig.root.position.x, q.z - rig.root.position.z);
      while (d > 1.2) {
        const ang = Math.atan2(q.x - rig.root.position.x, q.z - rig.root.position.z), step = Math.min(d, speed * 0.04);
        rig.root.rotation.y = turn(rig.root.rotation.y, ang, 0.35); rig.root.position.x += Math.sin(ang) * step; rig.root.position.z += Math.cos(ang) * step; a.speed = speed * 0.95; a.phase += step * 0.42 * (a.shuffle ? 1.4 : 1);
        await G.wait(0.04); d = Math.hypot(q.x - rig.root.position.x, q.z - rig.root.position.z);
      }
    }
    a.speed = 0; if (face != null) rig.root.rotation.y = face;
  };

  // ── 1. Outside: home through the gate, up the path to the door. Three angles; Jack is put where he stands as each begins. ──
  G.setScene(W.world); A && A.ambience({ wind: 0.25, birds: 0, fire: 0 }); A && A.duckMusic(0.5, 2); A && A.startMusic({ dark: true });
  const outJack = (x, z) => { jackOut.root.visible = true; jackOut.root.position.set(x, 0, z); jackOut.root.rotation.y = Math.PI; aOut.speed = 0; aOut.fist = 1; aOut.bow = 0.2; W.paintJack(jackOut, { expr: pick(1, 5, 5) }); };
  const outShots = {
    wide: { pos: v(250, 270, 460), look: v(-70, 10, -34), fov: 48 },
    gate: { pos: v(-62, 20, 176), look: v(4, 14, 100), fov: 46 },
    path: { pos: v(-40, 16, 88), look: v(6, 14, 60), fov: 48 },
    door: { pos: v(84, 16, 56), look: v(30, 16, 26), fov: 44 },
  };
  // The first angle is the wide shot from the title card, by night: Jack comes up the road towards the gate.
  const roadX = z => z > 140 ? 40 * Math.sin((z - 140) / 70) - 10 * Math.sin((z - 140) / 31) : 0;
  const roadPts = [200, 170, 150, 138].map(z => v(roadX(z), 0, z));
  G.cut(outShots.wide, () => outJack(roadX(230), 230));
  G.fade(false, 1.6);
  await walk(jackOut, aOut, roadPts, 22, Math.PI);
  G.cut(outShots.gate, () => outJack(0, 120));                           // just inside the gate
  await walk(jackOut, aOut, [v(0, 0, 84)], 24, Math.PI);
  G.cut(outShots.path, () => outJack(0, 84));                            // straight across to the door, saying his piece as he goes
  const toDoor = walk(jackOut, aOut, [v(34, 0, 29)], 16, Math.PI);
  await who('jack', pick('Perhaps I should have said no.', 'She’ll understand, once she sees them.', 'Home before the lamps burn low. Wait until she sees what I’ve brought.'));
  await toDoor;
  G.cut(outShots.door, () => outJack(34, 29));                           // he stands at the door; the latch lifts
  await G.wait(0.6); A && A.latch && A.latch();
  await G.wait(1.4);
  await G.fade(true, 0.8);

  // ── 2. Indoors: the telling. Every beat puts Jack and his Mother where they are as it begins (telling()), then does only what happens within it. ──
  // Mother stands in the middle of the hearth rug to receive him, and Jack comes to stand 23 units from her, along the line he crosses the room on. The angles for the talk were
  // framed on heads (Mother and Jack 23 apart, the line between them running as the chair faces); they are carried to wherever the two now stand.
  const rugC = int.items.rug.g.position, M1 = v(rugC.x, 0, rugC.z), HEAD = 0.66;
  const fwd = v(Math.sin(HEAD), 0, Math.cos(HEAD)), J1 = M1.clone().addScaledVector(fwd, 23), W1 = M1.clone().addScaledVector(fwd, 70);
  const Mold = v(-31.46, 0, -31.46), dA = HEAD - 0.785, cA = Math.cos(dA), sA = Math.sin(dA);
  const carry = q => v(M1.x + (q.x - Mold.x) * cA + (q.z - Mold.z) * sA, q.y, M1.z - (q.x - Mold.x) * sA + (q.z - Mold.z) * cA);
  const shot = (pos, look, fov) => ({ pos: carry(pos), look: carry(look), fov });
  const sh = {
    wide: shot(v(-32, 30, -63), v(-19, 22, -24), 42),
    mother: shot(v(-21, 25, 10), v(-30, 25, -32), 40),
    jack: shot(v(-46, 28, -25), v(-23, 22, -23), 50),
    two: { pos: v(-55, 28, 18), look: v(-15, 19, -24), fov: 47 },       // the wide shot, for her to cross to the chair and sit
  };
  const telling = (o) => {
    o = Object.assign({ jackAt: J1, ry: HEAD + Math.PI, bow: pick(1, 0.4, 0), fist: 1, hold: 0, gesture: 0, wag: 0, fold: 1, chin: 0, side: 0, seated: false }, o || {});
    G.setScene(W.iworld); A && A.ambience({ wind: 0.1, birds: 0, fire: 0.8 });
    jackOut.root.visible = false; mother.root.visible = true; jackIn.root.visible = true; int.chair.visible = true; mother.setExpr(1);
    jackIn.root.position.copy(o.jackAt); jackIn.root.rotation.y = o.ry; W.paintJack(jackIn, { expr: pick(1, 5, 5) });
    ja.speed = 0; ja.fist = o.fist; ja.hold = o.hold; ja.bow = o.bow; ja.cover = 0; ja.shuffle = 0;
    ma.gesture = o.gesture; ma.wag = o.wag; ma.fold = o.fold; ma.chin = o.chin; ma.side = o.side; ma.speed = 0;
    if (o.seated) { B.setPose(mother, 'sit'); mother.pose = 'sit'; mother.root.position.set(SEAT.x, STAGE_Y, SEAT.z); mother.root.rotation.y = SEAT.ry; }
    else { B.setPose(mother, 'stand'); mother.pose = 'stand'; mother.root.position.copy(M1); mother.root.rotation.y = HEAD; }
    for (let i = 0; i < 20; i++) { B.step(mother, 0.1); B.step(jackIn, 0.1); }
    if (o.seated) B.seatFeet(mother, 0);
  };
  // Jack comes in at the door already walking, past the table and straight to where he stands before her; they speak as he crosses.
  G.cut(sh.wide, () => { telling({ jackAt: v(34, 0, 66), ry: Math.PI, bow: 0 }); ja.speed = 23; });
  G.fade(false, 0.8);
  const crossing = walk(jackIn, ja, [W1, J1], 24, HEAD + Math.PI);      // past the table, then straight along the line to her
  await who('mother', 'Where is Milky-White?');
  await who('jack', pick('I sold her, Mother. But not for coin. I know how it will sound.', 'I sold her, Mother. Look what I got for her.', 'Gone, Mother. Sold, and for a good deal more than coin.'));
  await crossing;
  ja.bow = pick(1, 0.4, 0);
  G.cut(sh.mother, () => telling());
  await who('mother', 'What is in your hand, Jack?');
  G.cut(sh.jack, () => telling({ fist: 0, hold: 0.8 }));
  await who('jack', pick('Beans. The woman said they grow whatever we need, whether we know it or not. I believed her.', 'Beans, Mother. Magic ones. The woman at the cart said they grow whatever we need.', 'Beans, Mother. Five of them, and every one enchanted. Gold, silver, ember red, moss green, and one the deep blue of a night sky.'));
  G.cut(sh.mother, () => telling({ fist: 0 }));
  await who('mother', 'Beans.');
  ma.gesture = 1; ma.wag = 0.6; ma.fold = 0;
  await who('mother', 'We had one cow. One. You were to bring home coin for the roof and flour for the winter. And you have brought me five beans.');
  G.cut(sh.jack, () => telling({ fist: 0, gesture: 0, wag: 0, fold: 0, side: 1 }));
  await who('jack', pick('I know. I’m sorry. I didn’t think. She spoke so well, and I wanted so badly to bring you something.', 'It was a fair trade, Mother. She said so herself.', 'It was a fair exchange. You’ll see. By spring we’ll have more than a cow’s worth, and you’ll be the first to say so.'));
  G.cut(sh.mother, () => telling({ fist: 0, gesture: 1, wag: 1, fold: 0 }));
  await who('mother', 'A fair trade. This is the third time this week you have come home with foolishness in place of sense, and the last of our cow besides. I told you this morning. Not for stories. Not for tricks.');
  G.cut(sh.jack, () => telling({ fist: 0, gesture: 0, wag: 0, fold: 0, side: 1 }));
  await who('jack', pick('Mother, please. I can fix this. I’ll find her, I’ll—', 'I did what I thought was best.', 'You never believe me! One day you’ll see I was right.'));
  G.cut(sh.mother, () => telling({ fist: 0, gesture: 0, wag: 0, fold: 0, side: 1 }));
  await who('mother', pick('Hush.', 'You did what pleased you.', 'I believe every word you say, Jack. That is the trouble.'));
  // She is in the chair by the hearth when the next angle opens, and calls him to her.
  G.cut(sh.two, () => telling({ fist: 0, gesture: 0, wag: 0, fold: 0 }));
  // She crosses to the chair by the hearth, turns, and sits before she says it.
  await walk(mother, ma, [cl(4, 0)], 20, SEAT.ry);
  B.setPose(mother, 'sit'); mother.pose = 'sit'; mother.root.position.set(SEAT.x, STAGE_Y, SEAT.z); mother.root.rotation.y = SEAT.ry; ma.fold = 0;
  for (let i = 0; i < 12; i++) B.step(mother, 0.1);
  B.seatFeet(mother, 0);
  await G.wait(0.4);
  await who('mother', 'Come here.');
  await who('jack', 'Mother?');
  await who('mother', 'Come here, Jack.');
  ja.shuffle = 1; ja.bow = 1;
  await walk(jackIn, ja, [cl(16, 0)], 12, SEAT.ry + Math.PI);
  ja.speed = 0;
  // The scene ends here, as he steps up to her knee: the correction follows (js/correction.js), in this same room.
  await G.wait(0.8);
  G.hideLine && G.hideLine();
  G.mode = 'end'; document.body.classList.remove('cutscene');
  return { tier, brash: brashness(choices), hits: 0, world: W };
}

root.Night = { run, brashness, tierOf, build };
})(typeof window !== 'undefined' ? window : globalThis);
