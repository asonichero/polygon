// Polygon — Jack, 21: lean, quick, a grin kept ready. A grown man drawn in the toon style of js/look.js: smooth rounded limbs, a squared jaw, a painted face whose expressions are redrawn on a flat
// plate (eyes, brows, mouth as vector shapes), swept locks of hair, clothes with their own thickness (a jerkin that stands off the shirt, a belt, a hem), and a 1024x1024 atlas painted in code.
// Outfits: 'Outdoor' (linen shirt, green jerkin, patched trousers, boots), 'Day' (a soft green tunic over snug shorts, barefoot), 'Soft' (a cornflower tunic with a pocket over cornflower
// shorts, barefoot), 'Fine' (the outdoor clothes dressed up: a deep green jerkin edged in gold, clean breeches, polished boots with brass buckles).
// rig.paint({ outfit, trousers: 'up'|'down', drawers: 'up'|'down', marks: { L, R } (0-1), expr: 0-7 or a name, hitched, blush }) repaints only what changed. The painters are in js/poly-jack-paint.js.
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly, { loft, merge, place, ball, flatUV } = P;
const R = P.R, clamp = P.clamp;

const JACK_EXPR = { grin: 0, wince: 1, gritted: 2, crying: 3, squint: 4, cheeky: 5, shy: 6, smile: 7 };
const jackExprIndex = e => typeof e === 'string' ? (JACK_EXPR[e] !== undefined ? JACK_EXPR[e] : 0) : clamp(e | 0, 0, 7);
const OUTFITS = ['Outdoor', 'Day', 'Soft', 'Fine'];

// ---------------------------------------------------------------------------------------------------------------------------
// Measurements. The head is built at 1 and drawn at HS: a grown man's head is about a seventh of his height.
// ---------------------------------------------------------------------------------------------------------------------------
const HS = 0.93;
const HEAD = { rings: [R(0.55, 1.0, 1.1, 1.9, .72, 0, 2.0), R(0.95, 1.65, 1.7, 1.78, .8, 0, 2.6), R(1.5, 2.2, 2.3, 1.35, .88, 0, 3.0), R(2.3, 2.6, 2.75, 0.85, .95, 0, 3.0), R(3.3, 2.8, 3.05, 0.42, 1, 0, 2.6), R(4.4, 3.0, 3.35, 0.15, 1, 0, 2.3),
    R(5.5, 3.05, 3.45, 0.1, 1, 0, 2.2), R(6.6, 2.85, 3.3, -0.05, 1, 0, 2.1), R(7.5, 2.3, 2.8, -0.15, 1, 0, 2.0), R(8.05, 1.5, 2.1, -0.2, 1, 0, 2.0)],
  top: 8.5, faceW: 3.1, faceY0: 0.8, faceY1: 7.5,
  hairline: [[0, 6.1], [0.5, 5.9], [1.05, 5.3], [1.57, 4.6], [2.1, 4.0], [2.6, 3.4], [3.14, 3.1]], hairRows: [8.95, 8.55, 8.05, 7.45, 6.75, 5.95, 5.15, 4.35, 3.65, 3.05], hairOff: 0.14 };
const hscale = g => { g.scale(HS, HS, HS); return g; };
const TORSO = [R(2.0, 3.05, 2.1, 0, .85, 0, 2.2), R(3.6, 3.0, 2.05, 0, .92), R(5.6, 3.4, 2.25), R(7.6, 3.95, 2.45, .05), R(9.4, 4.55, 2.6, .1, 1, 0, 2.3), R(10.9, 4.9, 2.35, 0, 1, 0, 2.3), R(11.9, 3.7, 1.95, -.1), R(12.45, 1.9, 1.5, -.1, .9)];
const FOOT_BOOT = [[-1.9, 1.3, 1.0, 5.1], [-0.6, 1.52, 1.18, 4.9], [1.2, 1.5, 0.82, 5.4], [2.8, 1.35, 0.64, 5.55], [3.9, 1.05, 0.52, 5.6]];
const FOOT_BARE = [[-1.8, 1.18, 0.88, 5.2], [-0.5, 1.32, 1.02, 5.0], [1.1, 1.38, 0.7, 5.5], [2.6, 1.34, 0.52, 5.62], [3.6, 1.14, 0.44, 5.66]];
const CLOSED = { top: { h: 0.001, steps: 1 }, bottom: { h: 0.001, steps: 1 } };      // (a flat lid at each end, so a tube is a closed solid and takes its ink all round)

// The painters are in js/poly-jack-paint.js (they are long); makeJack reaches them through J when it paints.
const J = {};

// ---------------------------------------------------------------------------------------------------------------------------
// The figure
// ---------------------------------------------------------------------------------------------------------------------------
function makeJack() {
  const atlas = new P.Atlas(1024, 1024), S = atlas.pack([['ear', 64, 80], ['face', 352, 384], ['shell', 320, 192], ['hair', 256, 128], ['neck', 96, 48], ['torso', 448, 224], ['vest', 448, 160], ['pelvis', 320, 80], ['arm', 224, 160], ['fore', 224, 160],
    ['handL', 128, 128], ['handR', 128, 128], ['thigh', 224, 160], ['shin', 224, 160], ['boot', 224, 80], ['shoe', 224, 112], ['foot', 224, 112], ['seat', 256, 112], ['hem', 224, 48], ['trim', 64, 16]]);
  for (const n of ['neck', 'torso', 'pelvis', 'arm', 'fore', 'handL', 'handR', 'thigh', 'shin', 'boot', 'shoe', 'foot', 'hem', 'hair']) S[n].wraps = true;     // (the sheets that go all the way round a tube)
  const rig = P.skeleton(), { mat } = P.materials(atlas), add = P.add;
  rig.atlas = atlas; rig.sheets = S; rig.kind = 'jack';
  const trim = c => S.trim.texel(c * 4 + 2, 8);          // flat-colour cells, 4 px wide: 0 belt, 1 buckle, 2 buckle shine, 3 pouch, 4 sole, 5 boot brass, 6 dark, 7 skin, 8 skin light, 9 skin shade
  const mk = (geo, parent, m, name) => add(parent, geo, m || mat, name);
  const U = P.loftUV;

  // ── Head, ears, nose, neck, hair ──
  const H = P.buildHead(HEAD, S);
  mk(hscale(merge([H.face, H.shell])), rig.neck, mat, 'head');
  for (const sg of [1, -1]) {
    const ear = loft({ sides: 14, smooth: 1, rings: [R(1.0, 0.3, 0.5, 0), R(0.2, 0.42, 0.68, 0.05), R(-0.7, 0.36, 0.56, 0), R(-1.15, 0.22, 0.34, 0)], cap: { top: { h: 0.3, steps: 2 }, bottom: { h: 0.3, steps: 2 } } });
    const g = ear.patch(0, 14, (i, k, x, y, z) => S.ear.uv(clamp(0.5 + z / 1.5 * 0.5 * (sg > 0 ? 1 : 1), 0, 1), clamp(0.5 - y / 2.4, 0, 1))); place(g, sg * 2.98, 3.7, -0.15, 0, sg * 0.3, sg * 0.1); mk(hscale(g), rig.neck, mat, 'ear');
  }
  const nose = loft({ sides: 12, smooth: 1, rings: [R(0.2, 0.32, 0.46, 0), R(-0.45, 0.5, 0.66, 0.1), R(-1.1, 0.62, 0.72, 0.3)], cap: { bottom: { h: 0.55, steps: 3 }, top: { h: 0.2, steps: 2 } } });
  mk(hscale(place(nose.patch(0, 12, () => trim(7)), 0, 4.2, 3.4, 0.72, 0, 0)), rig.neck, mat, 'nose');
  const neckG = loft({ sides: 16, smooth: 1, rings: [R(1.4, 1.5, 1.45, 0.1), R(-1.8, 1.7, 1.62, 0)] });
  mk(neckG.patch(0, 16, U(neckG, S.neck)), rig.neck, mat, 'neck');
  // hair: the cap, and locks: a fringe swept across the brow to Jack's left, a crown of spikes, and a few at the nape
  const hp = [P.buildHair(HEAD, S)];
  const L = (path, w, t, up, o) => P.lock(S, path, w, t, up, o);
  hp.push(L([[-1.5, 7.5, 2.0], [-0.3, 7.3, 3.0], [1.2, 6.6, 3.5], [2.5, 5.7, 3.3]], [1.0, 0.12], [0.55, 0.1], [0, 0.6, 1]));
  hp.push(L([[0.2, 7.9, 1.4], [1.0, 7.5, 2.7], [2.2, 6.7, 3.3], [3.0, 5.6, 2.8]], [1.05, 0.14], [0.6, 0.1], [0.3, 0.6, 1]));
  hp.push(L([[-2.2, 7.1, 2.0], [-1.6, 6.9, 3.0], [-0.4, 6.3, 3.55], [0.9, 5.6, 3.55]], [0.9, 0.12], [0.5, 0.1], [0, 0.5, 1]));
  hp.push(L([[1.4, 8.1, 0.6], [2.4, 7.4, 1.8], [3.1, 6.3, 2.0], [3.3, 5.0, 1.4]], [0.95, 0.14], [0.6, 0.1], [0.5, 0.4, 0.8]));
  hp.push(L([[-0.6, 8.7, -0.4], [0.4, 9.3, 0.4], [1.3, 9.0, 1.4]], [0.75, 0.1], [0.5, 0.1], [0, 1, 0], { steps: 6 }));
  hp.push(L([[0.9, 8.6, -1.6], [2.0, 9.0, -1.2], [2.8, 8.5, -0.2]], [0.7, 0.1], [0.45, 0.1], [0, 1, 0], { steps: 6 }));
  mk(hscale(merge(hp)), rig.neck, mat, 'hair');

  // ── Torso, the jerkin that stands off it, pelvis, belt ──
  const torsoG = loft({ sides: 20, smooth: 1, rings: TORSO, cap: { top: { h: 0.4, steps: 2 } } });
  mk(torsoG.patch(0, 20, U(torsoG, S.torso)), rig.torso, mat, 'torso');
  {                                                                                      // the jerkin: the torso's shape grown a little, open at the front in a V that narrows to the waist
    const vg = loft({ sides: 20, smooth: 2, rings: TORSO.slice(0, 7).map(r => Object.assign({}, r, { rx: r.rx + 0.16, rz: r.rz + 0.16 })) });
    for (let i = 0; i < vg.rows; i++) for (const [j, sg] of [[11, 1], [9, -1]]) {
      const q = vg.get(i, j), half = 0.18 + 1.5 * P.smooth(3.6, 10.8, q.y); vg.set(i, j, sg * Math.min(Math.abs(q.x), half), q.y, q.z);
    }
    vg.computeNormals();
    rig.vest = mk(vg.patch(11, 18, (i, k, x, y) => S.vest.uv(clamp(k / 18, 0, 1), clamp((11.9 - y) / (11.9 - 2.0), 0, 1))), rig.torso, mat, 'vest');
  }
  const pelG = loft({ sides: 20, smooth: 1, rings: [R(3.6, 3.15, 2.05, 0, .88), R(2.2, 3.55, 2.3), R(0.6, 3.85, 2.6, -.1), R(-1.2, 3.7, 2.55, -.1, .95), R(-2.6, 3.0, 2.1, 0, .85)], cap: { bottom: { h: 0.8, steps: 3, shade: 0.85 } } });
  mk(place(pelG.patch(0, 20, U(pelG, S.pelvis)), 0, -1.5, 0), rig.pelvis, mat, 'pelvis');
  rig.belt = new THREE.Group(); rig.pelvis.add(rig.belt);
  const beltG = loft({ sides: 20, smooth: 1, rings: [R(3.05, 3.5, 2.28), R(2.4, 3.62, 2.4), R(1.85, 3.78, 2.52, -0.05)], cap: CLOSED });
  mk(place(beltG.patch(0, 20, () => trim(0)), 0, -1.5, 0), rig.belt, mat, 'belt');
  mk(flatUV(place(P.softBox(1.7, 1.25, 0.4, 0.2), 0, 1.0, 2.7), trim(1)), rig.belt, mat, 'buckle');
  mk(flatUV(place(P.softBox(1.6, 1.8, 1.2, 0.35), 3.85, 0.4, 0.6, 0, 0, -0.12), trim(3)), rig.belt, mat, 'pouch');

  // ── Arms: a shoulder dome capping the upper arm, an elbow ball, forearm, and a hand with its thumb ──
  for (const [key, el, wr, side] of [['armL', 'elbowL', 'wristL', 1], ['armR', 'elbow', 'wrist', -1]]) {
    const up = loft({ sides: 16, smooth: 1, rings: [R(1.7, 1.6, 1.56, 0, .92), R(0.2, 1.66, 1.6), R(-2.0, 1.48, 1.48), R(-4.3, 1.3, 1.3)], cap: { top: { h: 0.8, steps: 3, shade: 0.95 } } });
    mk(up.patch(0, 16, U(up, S.arm)), rig[key], mat, 'upperArm');
    mk(ball(1.3, 1.24, 1.3, 12, 6, trim(7)), rig[el], mat, 'elbowCap');
    const fo = loft({ sides: 16, smooth: 1, rings: [R(0.3, 1.28, 1.28), R(-1.4, 1.36, 1.34), R(-3.6, 0.98, 0.98), R(-4.2, 0.93, 0.98)] });
    mk(fo.patch(0, 16, U(fo, S.fore)), rig[wr], mat, 'forearm');
    mk(P.handGeo(S, side > 0 ? S.handL : S.handR, side), rig[wr], mat, 'hand');
  }

  // ── Legs: thigh (a dome at the hip), knee ball, shin, boot and foot, the gathered trousers, the tunic's hem ──
  for (const [key] of [['legL'], ['legR']]) {
    const leg = rig[key];
    const th = loft({ sides: 16, smooth: 1, rings: [R(0.4, 2.1, 2.15, 0, .92), R(-1.2, 2.15, 2.25, -.05), R(-3.5, 1.9, 2.0), R(-5.4, 1.62, 1.72), R(-6.3, 1.55, 1.65)], cap: { top: { h: 1.2, steps: 3, shade: .88 } } });
    mk(th.patch(0, 16, U(th, S.thigh)), leg.thigh, mat, 'thigh');
    mk(ball(1.62, 1.5, 1.7, 12, 6, S.thigh.texel(5, 150)), leg.knee, mat, 'kneeCap');
    const sh = loft({ sides: 16, smooth: 1, rings: [R(0.3, 1.62, 1.7), R(-1.5, 1.72, 1.95, -.25), R(-3.7, 1.32, 1.45, -.1), R(-5.4, 1.1, 1.18), R(-6.0, 1.18, 1.25)] });
    mk(sh.patch(0, 16, U(sh, S.shin)), leg.shin, mat, 'shin');
    leg.boot = mk(P.footGeo(S.shoe, FOOT_BOOT), leg.foot, mat, 'boot'); leg.bare = mk(P.footGeo(S.foot, FOOT_BARE), leg.foot, mat, 'foot');
    const shaft = loft({ sides: 16, smooth: 1, rings: [R(-2.9, 1.48, 1.58), R(-4.6, 1.58, 1.7), R(-6.05, 1.6, 1.74)], cap: { top: { h: 0.001, steps: 1 } } });
    leg.shaft = mk(shaft.patch(0, 16, U(shaft, S.boot)), leg.shin, mat, 'shaft');
    const ring = loft({ sides: 16, smooth: 1, rings: [R(1.7, 2.1, 2.25), R(0.2, 2.55, 2.65), R(-1.4, 2.1, 2.25)], cap: CLOSED });
    leg.ring = mk(ring.patch(0, 16, () => S.thigh.texel(4, 150)), leg.knee, mat, 'ring'); leg.ring.visible = false;
    const hem = loft({ sides: 16, smooth: 1, rings: [R(0.7, 2.6, 2.65), R(-0.8, 3.0, 3.05), R(-1.9, 3.2, 3.25)], cap: CLOSED });
    leg.hem = mk(hem.patch(0, 16, U(hem, S.hem)), leg.thigh, mat, 'hem'); leg.hem.visible = false;
  }
  // ── The seat (lap scene): two rounded cheeks bridging his back and his thighs once they fold. Built in the hinge's frame (see js/lap.js), which adds rig.seat to it ──
  {
    const cheeks = [];
    for (const sg of [1, -1]) {                                                         // (+x is his left: the right half of the seat sheet)
      const b = ball(2.5, 2.6, 2.65, 14, 9, (i, k, x, y) => S.seat.uv((sg > 0 ? 0.5 : 0) + (0.5 + x / 5) * 0.5, clamp(0.5 - y / 5.2, 0, 1)));
      cheeks.push(place(b, sg * 2.2, -2.6, 2.7));
    }
    rig.seat = new THREE.Mesh(merge(cheeks), mat); rig.seat.name = 'seat';
  }

  // ── Painting ──
  const keys = {};
  const once = (name, key, fn) => { if (keys[name] === key) return false; keys[name] = key; fn(); return true; };
  rig.paint = function (st) {
    st = Object.assign({ outfit: 'Outdoor', trousers: 'up', drawers: 'up', marks: { L: 0, R: 0 }, expr: 0, hitched: false, blush: false }, st);
    const outfit = OUTFITS.indexOf(st.outfit) >= 0 ? st.outfit : 'Outdoor', ex = jackExprIndex(st.expr), mk_ = m => Math.round(clamp(m, 0, 1) * 40);
    const tunic = outfit === 'Day' || outfit === 'Soft', down = st.trousers === 'down', dd = st.drawers === 'down';
    let changed = false;
    changed = once('face', ex + '|' + !!st.blush + '|' + outfit, () => J.paintFace(S.face, ex, st.blush)) || changed;
    changed = once('static', outfit, () => J.paintStatic(S, outfit)) || changed;
    changed = once('legs', [outfit, st.trousers, st.drawers, mk_(st.marks.L), mk_(st.marks.R)].join('|'), () => J.paintLegs(S, outfit, down, dd, st.marks)) || changed;
    changed = once('seat', [outfit, st.trousers, st.drawers, mk_(st.marks.L), mk_(st.marks.R)].join('|'), () => { J.paintSeat(S.seat, outfit, down, dd, st.marks); J.paintPelvis(S.pelvis, outfit, down, dd, st.marks); }) || changed;
    const boots = !tunic;
    for (const k of ['legL', 'legR']) { const l = rig[k]; l.boot.visible = l.shaft.visible = boots; l.bare.visible = !boots; l.hem.visible = tunic && !st.hitched; l.ring.visible = down; }
    rig.belt.visible = !tunic && !down; rig.vest.visible = !tunic;
    if (changed) { for (const sh of Object.values(S)) sh.bleed(!!sh.wraps); atlas.touch(); }
    rig.last = st; rig.look = { outfit, tunic, down, dd };
  };
  rig.setExpr = e => rig.paint(Object.assign({}, rig.last || {}, { expr: e }));
  rig.paint({});
  return P.finish(rig);
}

Object.assign(P, { makeJack, JACK_EXPR, jackExprIndex, HEAD_JACK: HEAD, HS_JACK: HS, OUTFITS: Object.assign(P.OUTFITS || {}, { jack: OUTFITS }), JackPaint: J });
})(typeof window !== 'undefined' ? window : globalThis);
