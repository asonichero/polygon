// Polygon — Gerda, late thirties: broad-shouldered, practical, laughs easily and means what she says. The same skeleton as Jack (js/poly.js) and the same toon build (js/poly-jack.js): smooth
// rounded parts, a painted face on a flat plate, locks of hair, a 1024x1024 atlas painted in code (js/poly-gerda-paint.js). A bust on the torso; a bun with a pin; and a skirt made as a closed,
// flared solid round each leg (so it drapes over her knees when she sits, as the old rig's leg overlays did) under a waist piece that closes the gap at the hips.
// Outfits: 'Work' (a plum bodice laced over a blouse, a cream apron tied at the waist, an ankle-length skirt, barefoot) and 'Fine' (a lavender embroidered gown to mid-calf, three-quarter sleeves,
// gold bracelets and anklets hung with small bells and moonstones, barefoot).
// rig.paint({ outfit, expr: 0 calm | 1 stern | 2 laughing }) repaints only what changed.
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly, { loft, merge, place, ball, flatUV } = P;
const R = P.R, clamp = P.clamp;
const OUTFITS = ['Work', 'Fine'], GERDA_EXPR = { calm: 0, stern: 1, laughing: 2 };
const gerdaExprIndex = e => typeof e === 'string' ? (GERDA_EXPR[e] !== undefined ? GERDA_EXPR[e] : 0) : clamp(e | 0, 0, 2);

// ---------------------------------------------------------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------------------------------------------------------
const HS = 0.93;
const HEAD = { rings: [R(0.6, 0.9, 1.0, 1.9, .72, 0, 2.0), R(1.0, 1.5, 1.55, 1.78, .8, 0, 2.2), R(1.6, 2.0, 2.1, 1.38, .88, 0, 2.4), R(2.4, 2.4, 2.6, 0.88, .95, 0, 2.4), R(3.4, 2.7, 2.98, 0.42, 1, 0, 2.3), R(4.5, 2.92, 3.3, 0.15, 1, 0, 2.2),
    R(5.6, 2.98, 3.42, 0.1, 1, 0, 2.15), R(6.65, 2.82, 3.3, -0.05, 1, 0, 2.1), R(7.55, 2.3, 2.8, -0.15, 1, 0, 2.0), R(8.1, 1.5, 2.1, -0.2, 1, 0, 2.0)],
  top: 8.5, faceW: 3.0, faceY0: 0.8, faceY1: 7.5,
  hairline: [[0, 6.4], [0.5, 6.1], [1.05, 5.5], [1.57, 4.95], [2.1, 4.1], [2.6, 3.3], [3.14, 2.9]], hairRows: [8.95, 8.55, 8.05, 7.45, 6.75, 5.95, 5.15, 4.35, 3.65, 3.05, 2.65], hairOff: 0.14 };
const hscale = g => { g.scale(HS, HS, HS); return g; };
const TORSO = [R(2.0, 3.4, 2.3, 0, .85, 0, 2.2), R(3.6, 2.95, 2.1, 0, .92), R(5.2, 3.0, 2.15, .05), R(7.0, 3.55, 2.45, .12), R(8.8, 4.0, 2.65, .22, 1, 0, 2.2), R(10.2, 4.35, 2.45, .1, 1, 0, 2.3), R(11.0, 4.5, 2.3, 0, 1, 0, 2.3), R(11.9, 3.4, 1.9, -.1), R(12.45, 1.8, 1.45, -.1, .9)];
const FOOT = [[-1.8, 1.1, 0.82, 5.2], [-0.5, 1.22, 0.96, 5.0], [1.1, 1.27, 0.64, 5.5], [2.6, 1.22, 0.48, 5.62], [3.5, 1.04, 0.42, 5.66]];
const CLOSED = { top: { h: 0.001, steps: 1 }, bottom: { h: 0.001, steps: 1 } };      // (a flat lid at each end, so a tube is a closed solid and takes its ink all round)
const G = {};                                                                           // the painters (js/poly-gerda-paint.js)

// V on a loft's sheet for a height y (by distance along the back column), for parts laid over it that take their texture from it (the bust).
function vOfY(g, y) {
  const n = g.rows, ys = [], arc = [0];
  for (let i = 0; i < n; i++) ys.push(g.get(i, 0).y);
  for (let i = 1; i < n; i++) arc.push(arc[i - 1] + g.get(i - 1, 0).distanceTo(g.get(i, 0)));
  const up = ys[0] >= ys[n - 1], total = arc[n - 1];
  for (let i = 0; i < n - 1; i++) { const a = ys[i], b = ys[i + 1]; if ((y <= a && y >= b) || (y >= a && y <= b)) { const t = b === a ? 0 : (y - a) / (b - a), d = arc[i] + (arc[i + 1] - arc[i]) * t; return clamp(up ? d / total : 1 - d / total, 0, 1); } }
  return y > Math.max(ys[0], ys[n - 1]) ? 0 : 1;
}
// A point on (just outside) the hair at angle th round the head (0 the front, positive toward her left) and height y, `extra` units off the cap: where a lock lies.
const capTop = HEAD.rings[HEAD.rings.length - 1].y + 0.4;
const capOff = y => HEAD.hairOff + 0.3 * P.smooth(4.2, 7.8, y);
function onHair(th, y, extra) {
  const hr = P.headRing(HEAD, Math.min(y, capTop)), ex = 2 / (hr.p || 2), sn = Math.sin(th), cs = Math.cos(th), off = capOff(y) + (extra || 0);
  return [(hr.rx + off) * Math.sign(sn) * Math.pow(Math.abs(sn), ex), y, hr.cz + (hr.rz + off) * Math.sign(cs) * Math.pow(Math.abs(cs), ex)];
}
const track = pts => pts.map(p => onHair(p[0], p[1], p[2]));
// A ring value (rx, rz...) of a loft at height y.
const ringAt = (g, y, key) => { const q = g.rings; for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1]; if (a.y !== b.y && (y - a.y) * (y - b.y) <= 0) return a[key] + (b[key] - a[key]) * (y - a.y) / (b.y - a.y); } return q[0][key]; };
// the same U mapping as Jack's, with the other side's tube mirrored (so a painted apron lies on the inside of each skirt)
const mirrored = (g, sheet, side, o) => { const f = P.loftUV(g, sheet, o), N = g.cols; return (i, k) => f(i, side > 0 ? k : N - k); };

// ---------------------------------------------------------------------------------------------------------------------------
// The figure
// ---------------------------------------------------------------------------------------------------------------------------
function makeGerda(outfit) {
  const atlas = new P.Atlas(1024, 1024), S = atlas.pack([['ear', 64, 80], ['face', 352, 384], ['shell', 320, 192], ['hair', 256, 128], ['cap', 256, 160], ['streak', 128, 64], ['bun', 192, 96], ['neck', 96, 48],
    ['torso', 448, 224], ['waist', 448, 128], ['arm', 224, 160], ['fore', 224, 160], ['handL', 128, 128], ['handR', 128, 128], ['leg', 224, 160], ['skirtT', 256, 160], ['skirtS', 256, 192], ['foot', 224, 112], ['trim', 64, 16]]);
  for (const n of ['neck', 'torso', 'waist', 'arm', 'fore', 'handL', 'handR', 'leg', 'skirtT', 'skirtS', 'foot', 'hair', 'cap', 'streak', 'bun']) S[n].wraps = true;
  const rig = P.skeleton(), { mat } = P.materials(atlas), add = P.add;
  rig.atlas = atlas; rig.sheets = S; rig.kind = 'gerda';
  const trim = c => S.trim.texel(c * 4 + 2, 8);          // flat-colour cells, 4 px wide: 0 gold, 1 gold shine, 2 gold shade, 3 moonstone, 4 pin, 5 skin, 6 skin light, 7 skin shade, 8 dark
  const mk = (geo, parent, m, name) => add(parent, geo, m || mat, name);
  const U = P.loftUV;

  // ── Head, ears, nose, neck ──
  const H = P.buildHead(HEAD, S);
  mk(hscale(merge([H.face, H.shell])), rig.neck, mat, 'head');
  for (const sg of [1, -1]) {
    const ear = loft({ sides: 14, smooth: 1, rings: [R(0.95, 0.28, 0.46, 0), R(0.2, 0.4, 0.62, 0.05), R(-0.65, 0.34, 0.52, 0), R(-1.05, 0.22, 0.32, 0)], cap: { top: { h: 0.3, steps: 2 }, bottom: { h: 0.3, steps: 2 } } });
    const g = ear.patch(0, 14, (i, k, x, y, z) => S.ear.uv(clamp(0.5 + z / 1.5 * 0.5, 0, 1), clamp(0.5 - y / 2.4, 0, 1))); place(g, sg * 2.86, 3.7, -0.15, 0, sg * 0.3, sg * 0.1); mk(hscale(g), rig.neck, mat, 'ear');
    mk(hscale(place(ball(0.22, 0.38, 0.22, 10, 6, trim(0)), sg * 2.95, 2.45, -0.1)), rig.neck, mat, 'earring');           // a small gold drop at each lobe
  }
  const nose = loft({ sides: 12, smooth: 1, rings: [R(0.2, 0.28, 0.42, 0), R(-0.45, 0.43, 0.62, 0.1), R(-1.05, 0.54, 0.66, 0.28)], cap: { bottom: { h: 0.5, steps: 3 }, top: { h: 0.2, steps: 2 } } });
  mk(hscale(place(nose.patch(0, 12, () => trim(5)), 0, 4.2, 3.38, 0.72, 0, 0)), rig.neck, mat, 'nose');
  const neckG = loft({ sides: 16, smooth: 1, rings: [R(1.4, 1.32, 1.3, 0.1), R(-1.8, 1.52, 1.45, 0)] });
  mk(neckG.patch(0, 16, U(neckG, S.neck)), rig.neck, mat, 'neck');

  // ── Hair: swept back from a centre parting over the ears, a grey streak at her left temple, strands that frame the face, a bun at the back with a pin ──
  const hp = [P.buildHair(HEAD, { hair: S.cap })];
  const L = (path, w, t, up, o) => P.lock(S, path, w, t, up, o);
  for (const sg of [1, -1]) {
    hp.push(L(track([[sg * 0.1, 8.0, 0.2], [sg * 0.5, 7.7, 0.24], [sg * 1.0, 6.9, 0.22], [sg * 1.5, 5.8, 0.2], [sg * 1.9, 4.7, 0.18], [sg * 2.25, 3.9, 0.16]]), [1.3, 0.25], [0.5, 0.1], [sg * 0.2, 1, 0.1], { steps: 10 }));
    hp.push(L(track([[sg * 1.22, 5.6, 0.2], [sg * 1.34, 5.0, 0.3], [sg * 1.42, 4.5, 0.34], [sg * 1.46, 4.1, 0.28]]), [0.42, 0.07], [0.24, 0.05], [sg, 0.2, 0.2], { steps: 8 }));                    // a strand in front of each ear
    hp.push(L([[sg * 0.55, 3.2, -3.0], [sg * 0.75, 2.2, -2.85], [sg * 0.85, 1.2, -2.35]], [0.5, 0.08], [0.3, 0.06], [0, 0.2, -1], { steps: 6 }));                                                       // and one at the nape
  }
  mk(hscale(merge(hp)), rig.neck, mat, 'hair');
  mk(hscale(P.lock(S, track([[0.2, 7.98, 0.3], [0.58, 7.72, 0.34], [1.05, 6.9, 0.32], [1.52, 5.8, 0.3]]), [0.34, 0.07], [0.24, 0.05], [0.2, 1, 0.1], { steps: 8, sheet: S.streak })), rig.neck, mat, 'streak');
  rig.bun = mk(hscale(place(ball(2.25, 1.95, 2.05, 20, 10, (i, k) => S.bun.uv(k / 20, i / 10)), 0, 5.2, -4.55)), rig.neck, mat, 'bun');
  {
    const pin = loft({ sides: 8, rings: [R(2.5, 0.13, 0.13), R(-2.5, 0.13, 0.13)], cap: { top: { h: 0.35, steps: 2 }, bottom: { h: 0.4, steps: 2 } } });
    rig.pin = mk(hscale(place(pin.patch(0, 8, () => trim(4)), 0.4, 5.6, -5.8, 0.1, 0, -1.2)), rig.neck, mat, 'pin');
    rig.pinStone = mk(hscale(place(ball(0.36, 0.36, 0.36, 10, 6, trim(3)), 2.05, 6.7, -5.6)), rig.neck, mat, 'pinStone'); rig.pinStone.visible = false;
  }

  // ── Torso with its bust, the waist piece of the skirt ──
  const torsoG = loft({ sides: 24, smooth: 1, rings: TORSO, cap: { top: { h: 0.4, steps: 2 } } });
  mk(torsoG.patch(0, 24, U(torsoG, S.torso)), rig.torso, mat, 'torso');
  for (const sg of [1, -1]) {                                                       // the bust: two rounded forms standing out from the front, textured from the torso's own front so whatever she wears carries over
    const bx = sg * 1.72, by = 8.5, bz = 2.3;
    const b = ball(1.6, 1.42, 1.18, 16, 9, (i, k, x, y, z) => { const X = x + bx, Y = y + by, Z = z + bz; return S.torso.uv(clamp(0.5 + Math.atan2(X, Z) / (2 * Math.PI), 0.02, 0.98), vOfY(torsoG, Y)); });
    mk(place(b, bx, by, bz, 0.1, 0, 0), rig.torso, mat, 'bust');
  }
  const waistG = loft({ sides: 24, smooth: 1, rings: [R(3.9, 3.1, 2.25, 0), R(2.3, 3.7, 2.75, -0.02), R(0.4, 4.2, 3.1, -0.06), R(-1.8, 4.5, 3.3, -0.07), R(-2.9, 4.55, 3.3, -0.08)], cap: { top: { h: 0.001, steps: 1 }, bottom: { h: 0.5, steps: 3 } } });          // (it ends in a rolled hem, a little proud of the solids below, so the join reads as the hem of an overskirt)
  mk(place(waistG.patch(0, 24, U(waistG, S.waist)), 0, -1.5, 0), rig.pelvis, mat, 'waist');
  rig.rows = { torso: y => vOfY(torsoG, y), waist: y => vOfY(waistG, y), waistRx: y => ringAt(waistG, y, 'rx') };         // (where a height falls on the torso's sheet and the waist piece's, for the painters)

  // ── Arms (strong forearms), with bracelets for the gown ──
  rig.bracelets = [];
  for (const [key, el, wr, side] of [['armL', 'elbowL', 'wristL', 1], ['armR', 'elbow', 'wrist', -1]]) {
    const up = loft({ sides: 16, smooth: 1, rings: [R(1.7, 1.5, 1.46, 0, .92), R(0.2, 1.57, 1.52), R(-2.0, 1.4, 1.4), R(-4.3, 1.22, 1.22)], cap: { top: { h: 0.8, steps: 3, shade: 0.95 } } });
    mk(up.patch(0, 16, U(up, S.arm)), rig[key], mat, 'upperArm');
    mk(ball(1.22, 1.16, 1.22, 12, 6, S.fore.texel(112, 120)), rig[el], mat, 'elbowCap');
    const fo = loft({ sides: 16, smooth: 1, rings: [R(0.3, 1.2, 1.2), R(-1.4, 1.28, 1.26), R(-3.6, 0.92, 0.92), R(-4.2, 0.87, 0.92)] });
    mk(fo.patch(0, 16, U(fo, S.fore)), rig[wr], mat, 'forearm');
    mk(P.handGeo(S, side > 0 ? S.handL : S.handR, side, { w: 0.92, t: 0.92 }), rig[wr], mat, 'hand');
    // a gold bracelet at the wrist with a moonstone and a small bell on its outer side
    const br = new THREE.Group(), ringG = loft({ sides: 16, smooth: 1, rings: [R(-3.1, 1.08, 1.08), R(-3.5, 1.16, 1.16), R(-3.9, 1.1, 1.1)], cap: CLOSED });
    mk(ringG.patch(0, 16, () => trim(0)), br, mat, 'bracelet'); mk(place(ball(0.4, 0.4, 0.4, 10, 6, trim(3)), side * 1.2, -3.5, 0.0), br, mat, 'moonstone'); mk(place(ball(0.3, 0.3, 0.3, 10, 6, trim(1)), side * 1.12, -4.15, 0.4), br, mat, 'bell');
    br.visible = false; rig[wr].add(br); rig.bracelets.push(br);
  }

  // ── Legs (bare, under the skirts), feet, and the skirt solids ──
  rig.anklets = [];
  for (const [key, side] of [['legL', 1], ['legR', -1]]) {
    const leg = rig[key];
    const th = loft({ sides: 16, smooth: 1, rings: [R(0.4, 2.0, 2.05, 0, .92), R(-1.2, 2.05, 2.15, -.05), R(-3.5, 1.82, 1.92), R(-5.4, 1.52, 1.62), R(-6.3, 1.48, 1.58)], cap: { top: { h: 1.1, steps: 3, shade: .88 } } });
    mk(th.patch(0, 16, U(th, S.leg)), leg.thigh, mat, 'thigh');
    mk(ball(1.55, 1.42, 1.62, 12, 6, S.leg.texel(112, 90)), leg.knee, mat, 'kneeCap');
    const sh = loft({ sides: 16, smooth: 1, rings: [R(0.3, 1.52, 1.6), R(-1.5, 1.6, 1.82, -.2), R(-3.7, 1.2, 1.32, -.1), R(-5.4, 1.0, 1.08), R(-6.0, 1.08, 1.15)] });
    mk(sh.patch(0, 16, U(sh, S.leg)), leg.shin, mat, 'shin');
    mk(P.footGeo(S.foot, FOOT), leg.foot, mat, 'foot');
    // the anklet (a ring with a bell and a moonstone), in the foot group so it does not stretch with the shin
    const an = new THREE.Group(), aG = loft({ sides: 16, smooth: 1, rings: [R(-4.8, 1.18, 1.26), R(-5.1, 1.26, 1.34), R(-5.4, 1.2, 1.28)], cap: CLOSED });
    mk(aG.patch(0, 16, () => trim(0)), an, mat, 'anklet'); mk(place(ball(0.4, 0.4, 0.4, 10, 6, trim(3)), 0, -5.1, 1.42), an, mat, 'moonstone'); mk(place(ball(0.3, 0.3, 0.3, 10, 6, trim(1)), side * 1.05, -5.55, 1.15), an, mat, 'bell');
    an.visible = false; leg.foot.add(an); leg.anklet = an; rig.anklets.push(an);
    // the skirt: a flared solid round the thigh, and one round the shin (ankle length for the work dress, mid-calf for the gown). Both grow with the distance d below the hip joint, so they meet in one
    // flare; each is centred a little toward the middle of the body, so the two legs' skirts overlap into one skirt (and her hands, hanging at the sides, are clear of it)
    const cxs = -side * 0.9, rxd = d => 3.0 + 0.1 * d, rzd = d => 2.75 + 0.09 * d;
    const sk = loft({ sides: 20, smooth: 1, rings: [-0.7, 1.5, 4.0, 6.5].map(d => R(-d, rxd(d), rzd(d), 0, 1, cxs)), cap: CLOSED });
    mk(sk.patch(0, 20, mirrored(sk, S.skirtT, side)), leg.thigh, mat, 'skirtThigh');
    const mkShin = (bottom, name) => {
      const g = loft({ sides: 20, smooth: 1, rings: [0.5, -1.8, bottom * 0.7, bottom].map(y => R(y, rxd(6 - y) + 0.03, rzd(6 - y) + 0.03, 0, 1, cxs)), cap: CLOSED });
      return mk(g.patch(0, 20, mirrored(g, S.skirtS, side)), leg.shin, mat, name);
    };
    leg.skirtWork = mkShin(-5.5, 'skirtShin'); leg.skirtFine = mkShin(-3.4, 'skirtShinFine');
  }

  // ── Painting ──
  const keys = {};
  const once = (name, key, fn) => { if (keys[name] === key) return false; keys[name] = key; fn(); return true; };
  rig.paint = function (st) {
    st = Object.assign({ outfit: rig.look ? rig.look.outfit : outfit || 'Work', expr: 0 }, st);
    const of = OUTFITS.indexOf(st.outfit) >= 0 ? st.outfit : 'Work', ex = gerdaExprIndex(st.expr); let changed = false;
    changed = once('face', ex + '|' + of, () => G.paintFace(S.face, ex)) || changed;
    changed = once('static', of, () => G.paintStatic(S, of, rig.rows)) || changed;
    for (const k of ['legL', 'legR']) { const l = rig[k]; l.skirtWork.visible = of === 'Work'; l.skirtFine.visible = of === 'Fine'; l.anklet.visible = of === 'Fine'; }
    for (const b of rig.bracelets) b.visible = of === 'Fine';
    rig.pinStone.visible = of === 'Fine';
    if (changed) { for (const sh of Object.values(S)) sh.bleed(!!sh.wraps); atlas.touch(); }
    rig.last = st; rig.look = { outfit: of };
  };
  rig.setExpr = e => rig.paint(Object.assign({}, rig.last || {}, { expr: e }));
  rig.paint({ outfit });
  return P.finish(rig);
}

Object.assign(P, { makeGerda, GERDA_EXPR, gerdaExprIndex, HEAD_GERDA: HEAD, HS_GERDA: HS, OUTFITS: Object.assign(P.OUTFITS || {}, { gerda: OUTFITS }), GerdaPaint: G });
})(typeof window !== 'undefined' ? window : globalThis);
