// Climbing Toward Consequence — the opening cutscene. A drone view of the homestead (the title screen sits over it), then, when the game begins, a slow descent to the cottage window
// while a correction is heard from inside; a fade to the one-room cottage, where Jack's Mother, by the hearth, finishes lecturing him; she tells him he will sell the cow in the
// morning, and sends him to wash for supper; fade to black.
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky, C = root.Cast, F = root.Farm, A = root.GameAudio, V3 = THREE.Vector3;
const v = (x, y, z) => new V3(x, y, z);

// The drone's shot while the title is up: high over the south-east of the farm, drifting slowly round it, the cottage and its window to the fore.
const DRONE = t => ({ pos: v(250 + 46 * Math.sin(t * 0.045), 270 + 8 * Math.sin(t * 0.07), 430 + 30 * Math.cos(t * 0.04)), look: v(-70 + 6 * Math.sin(t * 0.05), 10, -34), fov: 48 });

function build(G) {
  const ext = F.exterior(), int = F.interior(), S = int.spots;
  // The staging follows the chair (the room editor places it): cl(a, y, b) is a point a units ahead of it, the way it faces, and b to its right.
  const cl = (a, y, b) => v(S.chair.x + a * Math.sin(S.chairRy) + (b || 0) * Math.cos(S.chairRy), y, S.chair.z + a * Math.cos(S.chairRy) - (b || 0) * Math.sin(S.chairRy));
  // The cast: Jack in his own clothes, hurting; his Mother seated by the hearth.
  const jack = B.makeJack(), mother = C.makeMother(), acts = { t: 0, rub: 1, flinch: 0, avert: 0, wag: 0, gesture: 0, sigh: 0, look: 0, nod: 0 };
  const paintJack = e => { B.paintJackInto(jack.skin, { outfit: 'Outdoor', expr: e, trousers: 'up', drawers: 'up' }); jack.tex.needsUpdate = true; };
  paintJack(1); jack.root.scale.setScalar(0.95); jack.root.position.copy(cl(20, 0)); jack.root.rotation.y = S.chairRy + Math.PI; int.scene.add(jack.root);
  mother.root.position.set(S.chair.x, 6, S.chair.z); mother.root.rotation.y = S.chairRy; int.scene.add(mother.root);
  B.setPose(jack, 'stand'); B.setPose(mother, 'sit'); for (let i = 0; i < 40; i++) { B.step(jack, 0.1); B.step(mother, 0.1); }
  B.seatFeet(mother, 0);                                                                                       // (her feet reach the floor from the chair)
  // Jack: nursing his bottom: both hands back on it, rubbing; his weight shifting from foot to foot, his head down; a flinch when he moves wrong.
  jack.after = r => {
    const t = acts.t, rub = acts.rub, f = acts.flinch;
    for (const [a, sg] of [[r.armL, 1], [r.armR, -1]]) { a.rotation.x = 0.34 + rub * 0.05 * Math.sin(t * 5 + sg) - f * 0.05; a.rotation.z = -sg * 0.3; }
    r.torso.rotation.x = 0.1 + f * 0.1; r.neck.rotation.x = 0.28 + 0.04 * Math.sin(t * 0.9) - f * 0.1; r.neck.rotation.y = acts.avert * (0.55 * Math.sin(t * 0.7) + 0.2);
    r.legL.thigh.rotation.x = 0.04 * Math.sin(t * 1.2) - f * 0.1; r.legR.thigh.rotation.x = -0.04 * Math.sin(t * 1.2) - f * 0.1; r.hips.position.x = 0.6 * Math.sin(t * 0.8); r.hips.position.y = 12 - f * 0.8;
  };
  // His Mother: upright in the chair, her left hand in her lap; her right hand up and her finger wagging when she lectures, her head turning to the fire when she softens.
  mother.after = r => {
    const t = acts.t, wag = acts.wag, g = acts.gesture;
    r.armL.rotation.x = -0.9; r.armL.rotation.z = -0.1;
    r.armR.rotation.x = -0.6 - 0.35 * g + wag * 0.12 * Math.sin(t * 8); r.armR.rotation.z = 0.2; if (r.elbow) r.elbow.rotation.x = -0.4 - 1.0 * g;
    r.torso.rotation.x = -0.03 + acts.sigh * 0.1 * Math.sin(Math.min(1, acts.sigh) * 3.14); r.neck.rotation.y = acts.look * 0.75 + 0.05 * Math.sin(t * 0.5); r.neck.rotation.x = 0.04 + acts.nod * 0.12 * Math.sin(t * 4);
  };
  G.updaters.push(dt => { acts.t += dt; B.step(jack, dt); B.step(mother, dt); acts.flinch = Math.max(0, acts.flinch - dt * 2.2); });

  // The shots, in the cottage: wide (the whole room), two (Jack and his Mother), mother and jack (close), hearth (the fire), roof (the hanging herbs, the stairs).
  G.shots.wide = { pos: cl(78, 40, -52), look: cl(12, 20), fov: 56 };
  G.shots.wideIn = { pos: cl(62, 34, -42), look: cl(12, 21), fov: 50 };       // (the camera for the whole of the talk: the push-in comes to rest here and stays)
  G.shots.two = { pos: v(-14, 24, 38), look: v(-16, 15, -24), fov: 40 };
  G.shots.mother = { pos: v(-12, 22, 12), look: v(-25, 20, -24), fov: 30 };
  G.shots.motherSoft = { pos: v(-14, 21, 0), look: v(-25, 21, -24), fov: 24 };
  G.shots.jack = { pos: v(-22, 20, 8), look: v(-6, 16, -24), fov: 38 };
  G.shots.hearth = { pos: v(6, 22, 8), look: v(0, 18, -46), fov: 48 };
  G.shots.roof = { pos: v(40, 8, 10), look: v(-30, 40, -30), fov: 62 };
  G.shots.end = { pos: v(58, 34, 34), look: v(-6, 17, -26), fov: 54 };
  return { ext, int, jack, mother, acts, paintJack };
}

async function run(G, W) {
  const { ext, int, acts, paintJack, mother } = W;
  const sx = ext.windowTarget;
  G.mode = 'cutscene'; document.body.classList.add('cutscene');
  // 1. Down from the sky to the window. The wind, the birds; and, as we near the glass, muffled through the wall, the sound of a correction coming to its end.
  A && A.ambience({ wind: 0.8, birds: 0.6, fire: 0 }); A && A.duckMusic(0.35, 4);
  G.drone = null;
  const from = G.shotNow();
  // The correction, heard from the end of the first camera move: nine smacks of a hand on bare skin through the wall, Jack's cries and his Mother's scolding with them.
  // They start dull and far off and grow more distinct (the wall's low-pass opens, the volume rises) as the camera nears the glass.
  const sounds = async () => {
    const gaps = [1.25, 1.2, 1.35, 1.15, 1.25, 1.15, 1.05, 1.2, 1.0], n = gaps.length; A && A.duckMusic(0.1, 2.5);
    for (let i = 0; i < n; i++) {
      if (G.skipping) return; const f = i / (n - 1), cut = 2200 * Math.pow(5.5, f), vol = 0.75 + 0.45 * f;   // (barely dulled by the wall: 2.2 kHz, opening to 12 kHz at the glass)
      if (A) { A.thwack(0.85 + 0.15 * f, cut, vol); A.voice(0.7 + 0.4 * f, Math.min(4, 1 + Math.floor(f * 3.5)), cut * 0.5, vol * 0.9); if (i === 2) A.speak('mother', 'And that is what comes of telling tales to me, Jack, mind you remember it', 4.5, { muffle: true, cutoff: cut * 0.5, vol: 0.9 }); if (i === 6) A.speak('mother', 'I will not do this again', 2, { muffle: true, cutoff: cut * 0.5, vol: 1.1 }); }
      await G.wait(gaps[i]);
    }
  };
  await G.shot({ pos: v(-76, 130, 200), look: v(-34, 24, 18), fov: 44 }, 8.5, 'inOut');
  const heard = sounds();
  await G.shot({ pos: v(-34, 38, 74), look: v(-34, 30, 18), fov: 40 }, 7, 'inOut');
  await G.shot({ pos: v(-34, 31, 40), look: v(-34, 30, 18), fov: 38 }, 5, 'in');
  await heard;
  await G.wait(0.6);
  await G.fade(true, 1.2);
  // 2. The room.
  G.setScene(int); G.cut('wide'); A && A.ambience({ wind: 0.12, birds: 0, fire: 0.8 }); A && A.duckMusic(0.5, 2);
  acts.avert = 0; acts.gesture = 0; acts.wag = 0; acts.rub = 1; mother.setExpr(1); paintJack(1);
  G.shot('wideIn', 14, 'soft');
  await G.fade(false, 1.6);
  await G.wait(1.4);
  await G.wait(1.6); acts.gesture = 1; acts.wag = 1;
  await G.say('mother', 'Stand still, Jack. Rubbing it will not make it any less deserved.');
  acts.flinch = 1; paintJack(2); acts.rub = 0.4;
  await G.say('jack', '...Yes, Mother.');
  await G.say('mother', 'Three times this week you have come through that door with a tale grown taller than the barn. A wolf at the wall. A fox in a henhouse we have not had a hen in for a year. The neighbour’s boy who owes you a shilling.');
  await G.say('mother', 'A little stretched, and a little more each day. That is how milk turns, Jack. Nobody can stomach it by the end.');
  acts.avert = 1; paintJack(2);
  await G.say('jack', 'It was only a story...');
  await G.say('mother', 'It is always only a story.');
  acts.wag = 0.5;
  await G.say('mother', 'And that shrug. “It will all come right, Mother.” Will it? Look about you. The roof does not come right by itself. The garden has not come right in two summers; there is nothing in it but stones.');
  await G.say('mother', 'There are only the two of us, and the little we have is going. I wish — I do wish — you would take it seriously. Just once.');
  // She softens.
  acts.wag = 0; acts.gesture = 0; acts.look = 1; acts.sigh = 1; mother.setExpr(2); acts.avert = 0.3; paintJack(1);
  await G.wait(1.4);
  await G.say('mother', '...I wish I did not have to do this, you know. I would sooner never lay a hand on you.');
  await G.say('mother', 'But there is a good heart under all that nonsense, and I would rather see it grow into something than go to waste.');
  acts.rub = 0.2; acts.avert = 0;
  await G.say('jack', 'I know, Mother. I am sorry.');
  // Back to business.
  acts.look = 0; acts.sigh = 0; mother.setExpr(0); acts.gesture = 1; acts.wag = 0.3;
  await G.wait(0.6);
  await G.say('mother', 'Good. Now. Tomorrow morning you will take Milky-White to market and sell her.');
  acts.flinch = 0.6; paintJack(1);
  await G.say('jack', 'Sell her? But Mother —');
  await G.say('mother', 'She gives barely a cupful these days. What she will fetch will do us more good than her milk ever did. Get a fair price, and do not let any silver-tongued fellow talk you out of it.');
  await G.say('jack', 'A fair price. I will, Mother. I promise.');
  acts.wag = 0; mother.setExpr(1);
  await G.say('mother', 'Mm. We shall see. Now go and wash up for supper. Properly — behind the ears.');
  await G.wait(2.4);
  A && A.stopMusic(2.5); await G.fade(true, 2.2);
  A && A.ambience({ wind: 0, birds: 0, fire: 0 });
  await G.wait(1);
  G.mode = 'end'; document.body.classList.remove('cutscene'); G.hideLine && G.hideLine();
}

root.Opening = { build, run, DRONE };
})(typeof window !== 'undefined' ? window : globalThis);
