// Polygon — Red, in her twenties: a young woman of the village with a ready smile and a habit of getting distracted. The same skeleton as Jack and Gerda (js/poly.js, every length in Poly.DIM) and the
// same toon build: smooth rounded parts, a painted face on a flat plate, locks of hair, a 1024x1024 atlas painted in code (js/poly-red-paint.js). An adult in every form: she is built to the same
// grown proportions as the others, long in the leg, low and narrow in the shoulder.
// Her things: a forest-green tunic with a leather belt and two pouches, loose tan trousers tucked into brown boots, leather bracers, a red ribbon on each of two braids, and (the 'Mantle' outfit) the
// Starweave Mantle: a waist-length red cloak with a hood hanging down behind and gold stars worked along its hem. She can carry a walking staff.
// rig.paint({ outfit: 'Village' | 'Mantle', expr: 0 calm | 1 grin | 2 pout | 3 gasp | 4 sheepish | 5 wink | 6 shy | 7 wince }) repaints only what changed.
// rig.sway = { braidL, braidR, cape } are groups a scene may turn a little (the braids swing and the cape lifts as she walks); rig.holdStaff(true) puts the staff in her right hand.
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly, { loft, merge, place, ball, flatUV } = P;
const R = P.R, clamp = P.clamp, vOfY = P.vOfY, ringAt = P.ringAt;
const OUTFITS = ['Village', 'Mantle'], RED_EXPR = { calm: 0, grin: 1, pout: 2, gasp: 3, sheepish: 4, wink: 5, shy: 6, wince: 7 };
const redExprIndex = e => typeof e === 'string' ? (RED_EXPR[e] !== undefined ? RED_EXPR[e] : 0) : clamp(e | 0, 0, 7);

// ---------------------------------------------------------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------------------------------------------------------
const D = P.DIM, HS = D.headScale * 0.95;
const HEAD = { rings: [R(0.6, 0.95, 1.05, 1.9, .72, 0, 2.0), R(1.0, 1.55, 1.62, 1.78, .8, 0, 2.2), R(1.6, 2.05, 2.15, 1.38, .88, 0, 2.4), R(2.4, 2.45, 2.65, 0.88, .95, 0, 2.4), R(3.4, 2.72, 3.0, 0.42, 1, 0, 2.3), R(4.5, 2.88, 3.28, 0.15, 1, 0, 2.2),
    R(5.6, 2.96, 3.4, 0.1, 1, 0, 2.15), R(6.65, 2.8, 3.3, -0.05, 1, 0, 2.1), R(7.55, 2.3, 2.8, -0.15, 1, 0, 2.0), R(8.1, 1.5, 2.1, -0.2, 1, 0, 2.0)],
  top: 8.5, faceW: 3.0, faceY0: 0.8, faceY1: 7.5,
  hairline: [[0, 6.5], [0.5, 6.2], [1.05, 5.6], [1.57, 4.9], [2.1, 4.0], [2.6, 3.2], [3.14, 2.8]], hairRows: [8.95, 8.55, 8.05, 7.45, 6.75, 5.95, 5.15, 4.35, 3.65, 3.05, 2.55], hairOff: 0.16 };
const hscale = g => { g.scale(HS, HS, HS); return g; };
// the torso, from the hips (y = 0) up to the base of the neck: a slim waist, a small bust, a shoulder line that slopes away from the neck
const TORSO = [R(2.0, 3.0, 2.0, 0, .86, 0, 2.2), R(4.0, 2.3, 1.75, 0, .93), R(5.8, 2.65, 1.9, .08), R(7.3, 3.05, 2.15, .15, 1, 0, 2.2), R(8.8, 3.1, 1.95, .06, 1, 0, 2.3), R(9.8, 2.35, 1.65, -.1), R(10.35, 1.4, 1.3, -.05, .9)];
// a boot in the knee's frame: [y along the foot, half width, half height]; its bottom lies on the sole (D.shin below the knee)
const foot = list => list.map(([y, w, h]) => [y, w, h, D.shin + 0.05 - h]);
const FOOT_BOOT = foot([[-1.5, 0.92, 0.8], [-0.5, 1.04, 0.92], [0.9, 1.02, 0.68], [2.1, 0.94, 0.52], [3.0, 0.74, 0.44]]);
const CLOSED = { top: { h: 0.001, steps: 1 }, bottom: { h: 0.001, steps: 1 } };      // (a flat lid at each end, so a tube is a closed solid and takes its ink all round)
const J = {};                                                                           // the painters (js/poly-red-paint.js)

// A point on (just outside) the hair at angle th round the head (0 the front, positive toward her left) and height y, `extra` units off the cap: where a lock lies.
const capTop = HEAD.rings[HEAD.rings.length - 1].y + 0.4;
const capOff = y => HEAD.hairOff + 0.3 * P.smooth(4.2, 7.8, y);
function onHair(th, y, extra) {
  const hr = P.headRing(HEAD, Math.min(y, capTop)), ex = 2 / (hr.p || 2), sn = Math.sin(th), cs = Math.cos(th), off = capOff(y) + (extra || 0);
  return [(hr.rx + off) * Math.sign(sn) * Math.pow(Math.abs(sn), ex), y, hr.cz + (hr.rz + off) * Math.sign(cs) * Math.pow(Math.abs(cs), ex)];
}
const track = pts => pts.map(p => onHair(p[0], p[1], p[2]));
const mirrored = (g, sheet, side, o) => { const f = P.loftUV(g, sheet, o), N = g.cols; return (i, k) => f(i, side > 0 ? k : N - k); };

// ---------------------------------------------------------------------------------------------------------------------------
// The figure
// ---------------------------------------------------------------------------------------------------------------------------
function makeRed(outfit) {
  const atlas = new P.Atlas(1024, 1024), S = atlas.pack([['ear', 64, 80], ['face', 352, 384], ['shell', 320, 192], ['hair', 256, 128], ['cap', 256, 160], ['braid', 128, 96], ['neck', 160, 88],
    ['torso', 448, 224], ['waist', 448, 112], ['arm', 152, 176], ['fore', 128, 112], ['handL', 128, 128], ['handR', 128, 128], ['thigh', 232, 232], ['shin', 176, 208], ['boot', 192, 96], ['shoe', 224, 112], ['hem', 256, 96], ['cape', 448, 224], ['hood', 192, 128], ['trim', 64, 16]]);
  for (const n of ['neck', 'torso', 'waist', 'arm', 'fore', 'handL', 'handR', 'thigh', 'shin', 'boot', 'shoe', 'hem', 'hair', 'cap', 'braid']) S[n].wraps = true;
  const rig = P.skeleton(), { mat, two } = P.materials(atlas), add = P.add;
  rig.atlas = atlas; rig.sheets = S; rig.kind = 'red';
  const trim = c => S.trim.texel(c * 4 + 2, 8);        // flat-colour cells, 4 px wide: 0 gold, 1 gold shine, 2 gold shade, 3 ribbon, 4 ribbon dark, 5 skin, 6 skin light, 7 skin shade, 8 belt, 9 buckle, 10 pouch, 11 dark, 12 stone
  const mk = (geo, parent, m, name) => add(parent, geo, m || mat, name);
  const U = P.loftUV;

  // ── Head, ears, nose, neck ──
  const H = P.buildHead(HEAD, S);
  mk(hscale(merge([H.face, H.shell])), rig.neck, mat, 'head');
  for (const sg of [1, -1]) {
    const ear = loft({ sides: 14, smooth: 1, rings: [R(0.9, 0.26, 0.44, 0), R(0.2, 0.38, 0.6, 0.05), R(-0.62, 0.32, 0.5, 0), R(-1.0, 0.2, 0.3, 0)], cap: { top: { h: 0.3, steps: 2 }, bottom: { h: 0.3, steps: 2 } } });
    const g = ear.patch(0, 14, (i, k, x, y, z) => S.ear.uv(clamp(0.5 + z / 1.5 * 0.5, 0, 1), clamp(0.5 - y / 2.4, 0, 1))); place(g, sg * 2.84, 3.7, -0.15, 0, sg * 0.3, sg * 0.1); mk(hscale(g), rig.neck, mat, 'ear');
  }
  const nose = loft({ sides: 12, smooth: 1, rings: [R(0.2, 0.26, 0.4, 0), R(-0.45, 0.4, 0.58, 0.1), R(-1.0, 0.5, 0.62, 0.26)], cap: { bottom: { h: 0.45, steps: 3 }, top: { h: 0.2, steps: 2 } } });
  mk(hscale(place(nose.patch(0, 12, () => trim(5)), 0, 4.2, 3.36, 0.72, 0, 0)), rig.neck, mat, 'nose');
  const neckG = loft({ sides: 16, smooth: 1, rings: [R(1.2, 0.95, 0.93, 0.08), R(-2.4, 1.1, 1.02, 0)] });
  mk(neckG.patch(0, 16, U(neckG, S.neck)), rig.neck, mat, 'neck');

  // ── Hair: the cap, a fringe swept across the brow to her left, locks that frame the face and tuck behind the ears, and a fall at the nape ──
  const hp = [P.buildHair(HEAD, { hair: S.cap })];
  const L = (path, w, t, up, o) => P.lock(S, path, w, t, up, o);
  hp.push(L(track([[-0.3, 8.2, 0.3], [0.1, 7.6, 0.55], [0.7, 6.55, 0.65], [1.2, 5.5, 0.55], [1.55, 4.6, 0.45]]), [1.5, 0.3], [0.6, 0.14], [0.1, 1, 0.4], { steps: 10 }));
  hp.push(L(track([[0.2, 8.3, 0.3], [0.6, 7.7, 0.5], [1.15, 6.7, 0.55], [1.65, 5.6, 0.45], [1.95, 4.6, 0.35]]), [1.1, 0.22], [0.5, 0.1], [0.4, 1, 0.3], { steps: 10 }));
  hp.push(L(track([[-0.8, 8.1, 0.25], [-1.0, 7.4, 0.4], [-1.45, 6.4, 0.45], [-1.85, 5.2, 0.4], [-2.1, 4.1, 0.3]]), [1.0, 0.2], [0.5, 0.1], [-0.4, 1, 0.3], { steps: 10 }));
  for (const sg of [1, -1]) {
    hp.push(L(track([[sg * 1.0, 7.9, 0.2], [sg * 1.5, 7.0, 0.22], [sg * 1.9, 5.8, 0.2], [sg * 2.3, 4.5, 0.18], [sg * 2.55, 3.5, 0.15]]), [1.2, 0.3], [0.5, 0.12], [sg * 0.3, 1, 0.1], { steps: 10 }));
    for (const [dx, y] of [[0.0, 3.0], [0.7, 3.3], [-0.7, 3.2]]) hp.push(L([[sg * (0.9 + dx), y + 0.8, -3.0], [sg * (1.0 + dx), y - 0.4, -3.2], [sg * (1.0 + dx), y - 2.0, -2.9], [sg * (1.0 + dx), y - 3.6, -2.4]], [0.75, 0.1], [0.4, 0.08], [0, 0.2, -1], { steps: 7 }));       // (the fall at the nape)
  }
  mk(hscale(merge(hp)), rig.neck, mat, 'hair');

  // ── Two braids hanging over her shoulders in front, each tied with a red ribbon. A braid is a chain of overlapping plaits, each turned a little the other way from the last. They hang from groups
  //    (rig.sway) so that a scene can swing them. ──
  rig.sway = { braidL: new THREE.Group(), braidR: new THREE.Group(), cape: new THREE.Group() };
  const cr3 = (a, b, c, d, t) => a.clone().multiplyScalar(-0.5 * t * t * t + t * t - 0.5 * t).add(b.clone().multiplyScalar(1.5 * t * t * t - 2.5 * t * t + 1)).add(c.clone().multiplyScalar(-1.5 * t * t * t + 2 * t * t + 0.5 * t)).add(d.clone().multiplyScalar(0.5 * t * t * t - 0.5 * t * t));
  const along = (pts, u) => { const f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)); return cr3(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)], f - i); };
  for (const sg of [1, -1]) {
    const g = rig.sway[sg > 0 ? 'braidL' : 'braidR']; g.position.set(sg * 2.55, 13.5, -0.5); rig.torso.add(g);
    const pts = [[0, 0, 0], [sg * 0.3, -1.5, 0.9], [sg * 0.35, -3.1, 1.8], [sg * 0.0, -4.5, 2.6], [sg * -0.35, -6.3, 3.0], [sg * -0.6, -8.5, 2.85], [sg * -0.75, -11.0, 2.65]].map(p => new THREE.Vector3(...p)), n = 15, parts = [];
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1), c = along(pts, u), t = along(pts, Math.min(1, u + 0.02)).sub(along(pts, Math.max(0, u - 0.02))).normalize(), sc = 1 - 0.22 * u;
      const bg = ball(0.44 * sc, 0.74 * sc, 0.42 * sc, 10, 6, (i, kk) => S.braid.uv(clamp(kk / 10, 0, 1), clamp((k + i / 6) / n, 0, 1)));
      bg.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), t)));
      const side = (k % 2 ? 1 : -1) * 0.1 * sc, tw = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(side);
      bg.translate(c.x + tw.x, c.y + tw.y, c.z + tw.z); parts.push(bg);
    }
    mk(merge(parts), g, mat, 'braid');
    const tie = new THREE.Group(); tie.position.set(sg * -0.78, -11.4, 2.62); g.add(tie);
    mk(ball(0.4, 0.44, 0.4, 10, 6, trim(3)), tie, mat, 'ribbonKnot');
    for (const s2 of [1, -1]) mk(place(ball(0.74, 0.3, 0.2, 10, 6, trim(3)), s2 * 0.58, -0.15, 0.05, 0, 0, s2 * -0.5), tie, mat, 'ribbonLoop');
    for (const s2 of [1, -1]) mk(place(ball(0.18, 0.74, 0.11, 8, 5, trim(4)), s2 * 0.28, -0.8, 0.05, 0, 0, s2 * 0.22), tie, mat, 'ribbonTail');
  }

  // ── Torso with its small bust, the tunic's waist piece ──
  const torsoG = loft({ sides: 24, smooth: 1, rings: TORSO, cap: { top: { h: 0.4, steps: 2 } } });
  mk(torsoG.patch(0, 24, U(torsoG, S.torso)), rig.torso, mat, 'torso');
  for (const sg of [1, -1]) {
    const bx = sg * 1.3, by = 7.0, bz = 2.0;
    const b = ball(1.15, 1.05, 0.9, 16, 9, (i, k, x, y, z) => { const X = x + bx, Y = y + by, Z = z + bz; return S.torso.uv(clamp(0.5 + Math.atan2(X, Z) / (2 * Math.PI), 0.02, 0.98), vOfY(torsoG, Y)); });
    mk(place(b, bx, by, bz, 0.1, 0, 0), rig.torso, mat, 'bust');
  }
  const waistG = loft({ sides: 24, smooth: 1, rings: [R(3.9, 2.7, 2.0, 0), R(2.3, 3.2, 2.3, -0.02), R(0.4, 3.55, 2.6, -0.05), R(-1.0, 3.6, 2.65, -0.06)], cap: { top: { h: 0.001, steps: 1 }, bottom: { h: 0.4, steps: 3 } } });
  mk(place(waistG.patch(0, 24, U(waistG, S.waist)), 0, -1.5, 0), rig.pelvis, mat, 'waist');
  rig.rows = { torso: y => vOfY(torsoG, y), waist: y => vOfY(waistG, y), waistRx: y => ringAt(waistG, y, 'rx') };
  // the belt, with its buckle and two pouches
  const beltG = loft({ sides: 24, smooth: 1, rings: [R(3.55, 2.95, 2.1), R(3.05, 3.12, 2.26), R(2.55, 3.3, 2.42, -0.03)], cap: CLOSED });
  mk(place(beltG.patch(0, 24, () => trim(8)), 0, -1.5, 0), rig.pelvis, mat, 'belt');
  mk(flatUV(place(P.softBox(1.3, 1.0, 0.34, 0.16), 0, 1.3, 2.62), trim(9)), rig.pelvis, mat, 'buckle');
  for (const sg of [1, -1]) mk(flatUV(place(P.softBox(1.15, 1.5, 0.95, 0.28), sg * 3.65, 0.4, 0.7, 0, 0, sg * -0.14), trim(10)), rig.pelvis, mat, 'pouch');

  // ── Arms: a long sleeve, an elbow, a bracer on the forearm, a small hand (and a fist for the staff) ──
  rig.hands = {}; rig.fists = {};
  rig.grip = on => { rig.hands.R.visible = !on; rig.fists.R.visible = !!on; };
  for (const [key, el, wr, side] of [['armL', 'elbowL', 'wristL', 1], ['armR', 'elbow', 'wrist', -1]]) {
    const up = loft({ sides: 16, smooth: 1, rings: [R(1.0, 0.9, 0.88, 0, .94), R(-0.3, 0.98, 0.94), R(-2.6, 0.9, 0.88), R(-5.0, 0.8, 0.8), R(-5.8, 0.8, 0.8)], cap: { top: { h: 0.8, steps: 3, shade: 0.95 } } });
    mk(up.patch(0, 16, U(up, S.arm)), rig[key], mat, 'upperArm');
    mk(ball(0.82, 0.78, 0.82, 12, 6, S.arm.texel(76, 100)), rig[el], mat, 'elbowCap');
    const fo = loft({ sides: 16, smooth: 1, rings: [R(0.3, 0.8, 0.8), R(-1.2, 0.84, 0.82), R(-3.2, 0.62, 0.62), R(-4.1, 0.58, 0.6)] });
    mk(fo.patch(0, 16, U(fo, S.fore)), rig[wr], mat, 'forearm');
    const hs = side > 0 ? S.handL : S.handR, ho = { w: 0.88, t: 0.86 };
    rig.hands[side > 0 ? 'L' : 'R'] = mk(P.handGeo(S, hs, side, ho), rig[wr], mat, 'hand');
    rig.fists[side > 0 ? 'L' : 'R'] = mk(P.fistGeo(S, hs, side, ho), rig[wr], mat, 'fist'); rig.fists[side > 0 ? 'L' : 'R'].visible = false;
  }

  // ── Legs: thigh in loose trousers, a knee ball, shin, a tall boot with its cuff, and the tunic's hem solids round the thighs ──
  const th = loft({ sides: 16, smooth: 1, rings: [R(0.5, 1.5, 1.55, 0, .92), R(-1.6, 1.58, 1.68, -.04), R(-4.6, 1.46, 1.54), R(-7.0, 1.14, 1.22), R(-8.2, 1.08, 1.16)], cap: { top: { h: 0.9, steps: 3, shade: .88 } } });
  const sh = loft({ sides: 16, smooth: 1, rings: [R(0.3, 1.1, 1.18), R(-1.8, 1.18, 1.34, -.2), R(-4.4, 0.94, 1.04, -.1), R(-7.4, 0.76, 0.82), R(-8.2, 0.82, 0.88)] });
  const shaft = loft({ sides: 16, smooth: 1, rings: [R(-2.4, 1.2, 1.3), R(-4.4, 1.14, 1.24), R(-6.4, 1.08, 1.16), R(-8.3, 1.06, 1.14)], cap: { top: { h: 0.001, steps: 1 } } });
  const cuff = loft({ sides: 16, smooth: 1, rings: [R(-2.0, 1.32, 1.42), R(-2.7, 1.38, 1.48), R(-3.5, 1.2, 1.3)], cap: CLOSED });
  for (const [key, side] of [['legL', 1], ['legR', -1]]) {
    const leg = rig[key];
    mk(th.patch(0, 16, U(th, S.thigh)), leg.thigh, mat, 'thigh');
    mk(ball(1.14, 1.08, 1.2, 12, 6, S.thigh.texel(112, 90)), leg.knee, mat, 'kneeCap');
    mk(sh.patch(0, 16, U(sh, S.shin)), leg.shin, mat, 'shin');
    leg.boot = mk(P.footGeo(S.shoe, FOOT_BOOT), leg.foot, mat, 'boot');
    leg.shaft = mk(shaft.patch(0, 16, U(shaft, S.boot)), leg.shin, mat, 'shaft');
    leg.cuff = mk(cuff.patch(0, 16, U(cuff, S.boot, { v0: 0, v1: 0.3 })), leg.shin, mat, 'cuff');
    // the tunic: a flared solid round each thigh, centred a little toward the middle so the two make one skirt (mid-thigh long), opening as the legs swing
    const cxs = -side * 0.6, rxd = d => 2.3 + 0.1 * d, rzd = d => 2.3 + 0.08 * d;
    const sk = loft({ sides: 20, smooth: 1, rings: [-0.7, 1.6, 3.2, 4.8].map(d => R(-d, rxd(d), rzd(d), 0, 1, cxs)), cap: { top: { h: 0.001, steps: 1 }, bottom: { h: 0.3, steps: 2 } } });
    leg.hem = mk(sk.patch(0, 20, mirrored(sk, S.hem, side)), leg.thigh, mat, 'tunicHem');
  }
  rig.rows.thighY = P.yOfRow(th, S.thigh.h, -9.2, 2.2); rig.rows.shinY = P.yOfRow(sh, S.shin.h, -9, 1);

  // ── The Starweave Mantle: a waist-length cloak over the shoulders and back, open at the front, with a hood hanging behind the neck, a clasp at the collar, and a hem that rises at the front ──
  {
    const N = 28, cg = loft({ sides: N, smooth: 1, rings: [R(10.45, 2.1, 1.8, -0.15), R(9.7, 3.5, 2.4, -0.2), R(8.6, 4.45, 2.7, -0.25), R(6.6, 4.8, 2.95, -0.45), R(4.4, 5.2, 3.2, -0.65), R(1.9, 5.65, 3.45, -0.85)] });
    const last = cg.rows - 1;
    for (let i = last - 2; i <= last; i++) for (let j = 0; j < N; j++) {                    // (the hem rises toward the front, where the cloak opens)
      const q = cg.get(i, j), fr = Math.max(0, q.z) / 3.9, lift = (i === last ? 1.7 : i === last - 1 ? 0.8 : 0.2) * fr * fr;
      cg.set(i, j, q.x, q.y + lift, q.z);
    }
    const edge = y => 0.35 + 2.9 * P.smooth(10.4, 2.4, y);                                      // (it closes at the collar and opens toward the hem)
    for (let i = 0; i < cg.rows; i++) for (const [j, sg] of [[12, -1], [16, 1]]) { const q = cg.get(i, j); cg.set(i, j, sg * Math.min(Math.abs(q.x), edge(q.y)), q.y, q.z); }
    cg.computeNormals();
    const cape = new THREE.Group(); rig.sway.cape.add(cape); rig.torso.add(rig.sway.cape);
    const cm = mk(cg.patch(16, 24, (i, k) => S.cape.uv(clamp(k / 24, 0, 1), clamp(i / (cg.rows - 1), 0, 1))), cape, two, 'cloak');
    const hood = loft({ sides: 20, smooth: 1, rings: [R(10.6, 1.8, 1.2, -1.5), R(9.9, 2.6, 1.3, -2.3), R(8.8, 2.7, 1.1, -3.0), R(7.8, 2.1, 0.9, -3.3), R(7.0, 1.1, 0.6, -3.4)], cap: { top: { h: 0.3, steps: 2 }, bottom: { h: 0.7, steps: 3 } } });
    mk(hood.patch(0, 20, U(hood, S.hood)), cape, two, 'hood');
    const clasp = new THREE.Group(); cape.add(clasp);
    mk(place(ball(0.62, 0.62, 0.28, 12, 7, trim(0)), 0, 9.55, 2.5), clasp, mat, 'clasp'); mk(place(ball(0.3, 0.3, 0.2, 8, 5, trim(3)), 0, 9.55, 2.72), clasp, mat, 'claspStone');
    rig.cape = cape; cape.visible = false; rig.mantleRows = { hem: cg.rows };
  }

  // ── Painting ──
  const keys = {};
  const once = (name, key, fn) => { if (keys[name] === key) return false; keys[name] = key; fn(); return true; };
  rig.paint = function (st) {
    st = Object.assign({ outfit: rig.look ? rig.look.outfit : outfit || 'Village', expr: 0 }, st);
    const of = OUTFITS.indexOf(st.outfit) >= 0 ? st.outfit : 'Village', ex = redExprIndex(st.expr); let changed = false;
    changed = once('face', ex, () => J.paintFace(S.face, ex)) || changed;
    changed = once('static', 'all', () => J.paintStatic(S, rig.rows)) || changed;
    rig.cape.visible = of === 'Mantle';
    for (const g of [rig.sway.braidL, rig.sway.braidR]) g.position.z = (of === 'Mantle' ? 0.9 : 0) - 0.3;       // (over the cloak, the braids hang a little further out)
    if (changed) { for (const sh2 of Object.values(S)) sh2.bleed(!!sh2.wraps); atlas.touch(); }
    rig.last = st; rig.look = { outfit: of };
  };
  rig.setExpr = e => rig.paint(Object.assign({}, rig.last || {}, { expr: e }));
  rig.paint({ outfit });

  // ── The walking staff: held in the right fist, upright when the arm is bent forward (rig.holdStaff) ──
  rig.staff = P.makeStaff(); rig.staff.visible = false; rig.staffMount = new THREE.Group(); rig.staffMount.position.set(0, -(D.fore + 1.0), 0); rig.staffMount.rotation.x = Math.PI / 2; rig.wrist.add(rig.staffMount); rig.staffMount.add(rig.staff);
  rig.holdStaff = on => { rig.staff.visible = !!on; rig.grip(!!on); };
  return P.finish(rig);
}

Object.assign(P, { makeRed, RED_EXPR, redExprIndex, HEAD_RED: HEAD, HS_RED: HS, OUTFITS: Object.assign(P.OUTFITS || {}, { red: OUTFITS }), RedPaint: J });
})(typeof window !== 'undefined' ? window : globalThis);
