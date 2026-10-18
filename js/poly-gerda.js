// Polygon — Gerda, late thirties: broad-shouldered, practical, laughs easily and means what she says. Same skeleton as Jack (js/poly.js), built the same way (js/poly-jack.js): rigid low-poly
// segments, a painted 128x128 atlas, vertex lighting. A bust on the torso, a bun with a pin, and a skirt made as a flared tube round each leg (so it drapes over her knees when she sits,
// as the old rig's leg overlays did), under a waist piece that closes the gap at the hips.
// Outfits: 'Work' (plum bodice laced over a blouse, a bibless cream apron tied at the waist, ankle-length skirt, barefoot) and 'Fine' (a lavender embroidered gown to mid-calf, 3/4 sleeves,
// gold bracelets and anklets hung with small bells and moonstones, barefoot).
// rig.paint({ outfit, expr: 0 calm | 1 stern | 2 laughing }) repaints only what changed.
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly, { loft, loftUV, merge, place, ball, box } = P, R = P.R, clamp = P.clamp;
const OUTFITS = ['Work', 'Fine'], GERDA_EXPR = { calm: 0, stern: 1, laughing: 2 };
const gerdaExprIndex = e => typeof e === 'string' ? (GERDA_EXPR[e] !== undefined ? GERDA_EXPR[e] : 0) : clamp(e | 0, 0, 2);

const HS = 0.93;
const HEAD = { rings: [R(0.8, 1.2, 1.5, 1.6, .78), R(1.4, 2.0, 2.2, 1.15, .86), R(2.4, 2.55, 2.85, 0.55), R(3.5, 2.8, 3.1, 0.25), R(4.6, 2.9, 3.3, 0.1), R(5.6, 2.9, 3.4, 0.1), R(6.7, 2.7, 3.2, -0.1), R(7.6, 1.95, 2.55, -0.2)],
  top: 8.15, faceW: 3.0, faceY0: 0.8, faceY1: 7.5, hairOff: 0.16,
  hairline: [[0, 6.3], [0.5, 6.0], [1.05, 5.4], [1.57, 4.3], [2.1, 3.0], [2.6, 2.3], [3.14, 2.0]], hairRows: [8.7, 8.2, 7.6, 6.8, 5.9, 4.9, 3.9, 3.0, 2.2] };
const hscale = g => { g.scale(HS, HS, HS); return g; };
// V on a loft's sheet for a height y (by distance along the back column), for parts laid over it that take their texture from it (the bust).
function vOfY(g, y) {
  const n = g.rows, ys = [], arc = [0];
  for (let i = 0; i < n; i++) ys.push(g.get(i, 0).y);
  for (let i = 1; i < n; i++) arc.push(arc[i - 1] + g.get(i - 1, 0).distanceTo(g.get(i, 0)));
  const up = ys[0] >= ys[n - 1], total = arc[n - 1];
  for (let i = 0; i < n - 1; i++) { const a = ys[i], b = ys[i + 1]; if ((y <= a && y >= b) || (y >= a && y <= b)) { const t = b === a ? 0 : (y - a) / (b - a), d = arc[i] + (arc[i + 1] - arc[i]) * t; return clamp(up ? d / total : 1 - d / total, 0, 1); } }
  return y > Math.max(ys[0], ys[n - 1]) ? 0 : 1;
}

function makeGerda(outfit) {
  const atlas = new P.Atlas(128, 128), S = atlas.pack([['face', 32, 32], ['shell', 40, 32], ['hair', 32, 16], ['neck', 16, 8], ['torso', 48, 32], ['pelvis', 16, 8], ['waist', 48, 16], ['arm', 32, 24], ['fore', 32, 24],
    ['handL', 16, 16], ['handR', 16, 16], ['leg', 32, 16], ['skirtT', 32, 16], ['skirtS', 32, 20], ['foot', 32, 12], ['bun', 16, 8], ['trim', 16, 8]]);
  const rig = P.skeleton(), { mat, two } = P.materials(atlas), add = P.add;
  rig.atlas = atlas; rig.sheets = S; rig.kind = 'gerda';
  const trim = c => S.trim.texel(c % 16, Math.floor(c / 16));           // flat-colour cells: 0 gold, 1 gold shine, 2 gold shade, 3 moonstone, 4 pin
  const mk = (geo, parent, m, name) => add(parent, geo, m || mat, name);

  // ── Head, neck, hair, bun ──
  const H = P.buildHead(HEAD, S);
  mk(hscale(merge([H.face, H.shell])), rig.neck, mat, 'head');
  const earSkin = S.face.texel(1, 20);
  for (const sg of [1, -1]) {
    const e = ball(0.45, 0.9, 0.7, 6, 3, earSkin); place(e, sg * 2.85, 3.7, -0.15, 0, 0, sg * 0.18); mk(hscale(e), rig.neck, mat, 'ear');
    const ring = box(0.5, 0.7, 0.5, trim(0)); place(ring, sg * 3.0, 2.85, -0.1); mk(hscale(ring), rig.neck, mat, 'earring');              // small gold earrings
  }
  const nose = loft({ sides: 6, rings: [R(0, 0.28, 0.4, 0), R(-0.5, 0.44, 0.55, 0.1), R(-0.9, 0.48, 0.58, 0.24)], cap: { bottom: { h: 0.28, steps: 1 } } });
  const noseGeo = nose.patch(0, 6, () => S.face.texel(16, 18)); place(noseGeo, 0, 4.2, 3.3, 0.7, 0, 0); mk(hscale(noseGeo), rig.neck, mat, 'nose');
  const neckG = loft({ sides: 8, rings: [R(1.4, 1.35, 1.3, 0.1), R(-1.6, 1.5, 1.45, 0)] });
  mk(neckG.patch(0, 8, loftUV(neckG, S.neck)), rig.neck, mat, 'neck');
  // hair: swept back, falling behind the ears to the jaw; side curtains and a parting fringe of locks at the temples
  const parts = [P.buildHair(HEAD, S)];
  const L = (len, w, sw, bd, x, y, z, rx, ry, rz) => place(P.lock(S, len, w, sw, bd), x, y, z, rx, ry, rz);
  parts.push(L(2.6, 0.9, -0.2, -0.4, 2.7, 4.6, -1.6, 0.0, 0.0, 0.0), L(2.6, 0.9, 0.2, -0.4, -2.7, 4.6, -1.6, 0.0, 0.0, 0.0));          // (a lock each side, behind the ear)
  parts.push(L(1.6, 0.8, 0.5, 0.2, 2.2, 6.4, 2.6, 0.4, -0.5, 0.2), L(1.5, 0.8, -0.5, 0.2, -2.2, 6.4, 2.6, 0.4, 0.5, -0.2));         // (a wisp at each temple)
  mk(hscale(merge(parts)), rig.neck, two, 'hair');
  rig.bun = mk(hscale(place(ball(2.2, 1.9, 2.0, 8, 4, (i, k) => S.bun.uv(k / 8, i / 4)), 0, 5.6, -4.6)), rig.neck, mat, 'bun');
  rig.pin = mk(hscale(place(box(0.45, 0.45, 3.0, trim(4)), 1.7, 6.3, -4.9, 0.0, 0.25, 0.35)), rig.neck, mat, 'pin');

  // ── Torso, bust, pelvis, the waist piece of the skirt ──
  const torsoG = loft({ sides: 12, rings: [R(2.2, 2.95, 2.0, 0, .8), R(4.2, 2.85, 2.0, 0, .9), R(6.6, 3.4, 2.25, 0.05), R(9.0, 3.85, 2.4, 0.1), R(10.8, 4.3, 2.2), R(11.9, 3.3, 1.85, -0.1), R(12.5, 1.8, 1.45, -0.1, .9)], cap: { top: { h: 0.4, steps: 1 } } });
  mk(torsoG.patch(0, 12, loftUV(torsoG, S.torso)), rig.torso, mat, 'torso');
  for (const sg of [1, -1]) {                                                       // the bust: two rounded blocks standing out from the front, textured from the torso's own front so whatever she wears carries over
    const bx = sg * 1.85, by = 8.6, bz = 2.25;
    const b = ball(1.8, 1.55, 1.4, 8, 4, (i, k, x, y, z) => { const X = x + bx, Y = y + by, Z = z + bz; return S.torso.uv(clamp(0.5 + Math.atan2(X, Z) / (2 * Math.PI), 0.02, 0.98), vOfY(torsoG, Y)); });
    mk(place(b, bx, by, bz, 0.12, 0, 0), rig.torso, mat, 'bust');
  }
  const pelG = loft({ sides: 12, rings: [R(3.6, 3.1, 2.05, 0, .85), R(2.2, 3.7, 2.35, -0.05), R(0.6, 4.05, 2.75, -0.15), R(-1.2, 3.9, 2.7, -0.15, .95), R(-2.6, 3.1, 2.2, 0, .8)], cap: { bottom: { h: 0.8, steps: 2, shade: 0.8 } } });
  mk(place(pelG.patch(0, 12, loftUV(pelG, S.pelvis)), 0, -1.5, 0), rig.pelvis, mat, 'pelvis');
  const waistG = loft({ sides: 12, rings: [R(3.7, 3.3, 2.25, 0), R(2.0, 4.0, 2.9, -0.05), R(0.0, 4.4, 3.3, -0.1), R(-2.5, 4.5, 3.4, -0.1), R(-3.6, 4.5, 3.4, -0.1)] });
  mk(place(waistG.patch(0, 12, loftUV(waistG, S.waist)), 0, -1.5, 0), rig.pelvis, two, 'waist');

  // ── Arms (strong forearms), with bracelets for the gown ──
  rig.bracelets = [];
  for (const [key, el, wr, side] of [['armL', 'elbowL', 'wristL', 1], ['armR', 'elbow', 'wrist', -1]]) {
    const up = loft({ sides: 8, rings: [R(1.7, 1.5, 1.45, 0, .9), R(0.2, 1.55, 1.5), R(-2.0, 1.38, 1.38), R(-4.3, 1.22, 1.22)], cap: { top: { h: 0.7, steps: 2, shade: 0.95 } } });
    mk(up.patch(0, 8, loftUV(up, S.arm)), rig[key], mat, 'upperArm');
    mk(ball(1.22, 1.15, 1.22, 6, 3, S.fore.texel(3, 1)), rig[el], mat, 'elbowCap');
    const fo = loft({ sides: 8, rings: [R(0.3, 1.2, 1.2), R(-1.4, 1.28, 1.25), R(-3.6, 0.92, 0.92), R(-4.2, 0.86, 0.92)] });
    mk(fo.patch(0, 8, loftUV(fo, S.fore)), rig[wr], mat, 'forearm');
    mk(P.handGeo(S, side > 0 ? S.handL : S.handR, side, { w: 0.92, t: 0.92 }), rig[wr], mat, 'hand');
    // a gold bracelet at the wrist with a moonstone and a small bell on its outer side
    const br = new THREE.Group(); const ringG = loft({ sides: 8, rings: [R(-3.3, 1.12, 1.12), R(-3.9, 1.12, 1.12)] });
    mk(ringG.patch(0, 8, () => trim(0)), br, mat, 'bracelet'); mk(place(ball(0.42, 0.42, 0.42, 6, 3, trim(3)), side * 1.15, -3.6, 0.0), br, mat, 'moonstone'); mk(place(ball(0.3, 0.3, 0.3, 6, 3, trim(1)), side * 1.1, -4.2, 0.4), br, mat, 'bell');
    br.visible = false; rig[wr].add(br); rig.bracelets.push(br);
  }

  // ── Legs (bare), feet, and the skirt tubes ──
  const FOOT = [[-1.7, 1.1, 0.8, 5.2], [-0.5, 1.25, 0.95, 5.0], [1.1, 1.25, 0.62, 5.5], [2.6, 1.2, 0.46, 5.64], [3.4, 1.0, 0.4, 5.68]];
  rig.anklets = [];
  for (const [key, side] of [['legL', 1], ['legR', -1]]) {
    const leg = rig[key];
    const th = loft({ sides: 8, rings: [R(0.4, 2.0, 2.05, 0, .9), R(-1.2, 2.0, 2.1, -0.05), R(-3.5, 1.75, 1.85), R(-5.4, 1.5, 1.6), R(-6.3, 1.45, 1.55)], cap: { top: { h: 1.0, steps: 2, shade: .85 } } });
    mk(th.patch(0, 8, loftUV(th, S.leg, { v0: 0, v1: 0.5 })), leg.thigh, mat, 'thigh');
    mk(ball(1.55, 1.4, 1.6, 6, 3, S.leg.texel(5, 7)), leg.knee, mat, 'kneeCap');
    const sh = loft({ sides: 8, rings: [R(0.3, 1.5, 1.58), R(-1.5, 1.6, 1.8, -0.2), R(-3.7, 1.2, 1.3, -0.1), R(-5.4, 1.0, 1.08), R(-6.0, 1.08, 1.15)] });
    mk(sh.patch(0, 8, loftUV(sh, S.leg, { v0: 0.4, v1: 1 })), leg.shin, mat, 'shin');
    mk(P.footGeo(S.foot, FOOT), leg.foot, mat, 'foot');
    // the anklet (a ring with a bell and a moonstone), in the foot group so it does not stretch
    const an = new THREE.Group(); const aG = loft({ sides: 8, rings: [R(-4.95, 1.22, 1.3), R(-5.45, 1.14, 1.22)] });
    mk(aG.patch(0, 8, () => trim(0)), an, mat, 'anklet'); mk(place(ball(0.42, 0.42, 0.42, 6, 3, trim(3)), 0, -5.1, 1.35), an, mat, 'moonstone'); mk(place(ball(0.3, 0.3, 0.3, 6, 3, trim(1)), side * 1.0, -5.6, 1.1), an, mat, 'bell');
    an.position.y = 6 - 6 + 0; an.visible = false; leg.foot.add(an); leg.anklet = an; rig.anklets.push(an);
    // the skirt: a flared tube round the thigh (the apron's panel on the inside of the front), and one round the shin (ankle length for the work dress, mid-calf for the gown)
    const sk = loft({ sides: 8, rings: [R(0.7, 2.7, 2.75), R(-1.5, 2.8, 2.85), R(-4.0, 2.9, 2.95), R(-6.5, 2.95, 3.0)], cap: {} });
    mk(sk.patch(0, 8, (i, k) => S.skirtT.uv(side > 0 ? k / 8 : 1 - k / 8, i / 3)), leg.thigh, two, 'skirtThigh');
    const mkShin = (bottom, name) => {
      const g = loft({ sides: 8, rings: [R(0.5, 2.95, 3.0), R(-1.8, 3.0, 3.05), R(bottom * 0.7, 3.1, 3.15), R(bottom, 3.2, 3.25)] });
      const m = mk(g.patch(0, 8, (i, k) => S.skirtS.uv(k / 8, i / 3)), leg.shin, two, name); return m;
    };
    leg.skirtWork = mkShin(-5.5, 'skirtShin'); leg.skirtFine = mkShin(-3.4, 'skirtShinFine');
  }

  // ── Painting ──
  const keys = {};
  const once = (name, key, fn) => { if (keys[name] === key) return false; keys[name] = key; fn(); return true; };
  rig.paint = function (st) {
    st = Object.assign({ outfit: rig.look ? rig.look.outfit : outfit || 'Work', expr: 0 }, st);
    const of = OUTFITS.indexOf(st.outfit) >= 0 ? st.outfit : 'Work', ex = gerdaExprIndex(st.expr); let changed = false;
    changed = once('face', ex + '|' + of, () => paintFace(S.face, ex)) || changed;
    changed = once('static', of, () => paintStatic(S, of)) || changed;
    for (const k of ['legL', 'legR']) { const l = rig[k]; l.skirtWork.visible = of === 'Work'; l.skirtFine.visible = of === 'Fine'; l.anklet.visible = of === 'Fine'; }
    for (const b of rig.bracelets) b.visible = of === 'Fine';
    if (changed) atlas.touch();
    rig.last = st; rig.look = { outfit: of };
  };
  rig.setExpr = e => rig.paint(Object.assign({}, rig.last || {}, { expr: e }));
  rig.paint({ outfit });
  return rig;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Painting
// ---------------------------------------------------------------------------------------------------------------------------
const C = { skin: '#ecc3a0', skinSh: '#d3a584', skinHi: '#f3d0b0', line: '#dcae8c', hair: '#4b3022', hairHi: '#67432f', hairDk: '#33201a', grey: '#a39a90', brow: '#3a2418', white: '#f2f0ea', iris: '#5f7f95', irisDk: '#47657a', lid: '#c79876',
  lip: '#a8525a', lipDk: '#8a3038', teeth: '#f6f2ea', mouth: '#6a2a2a', ring: '#e6c24a',
  blouse: '#ece6d6', blouseSh: '#cfc7b4', plum: '#7a2a3a', plumDk: '#5c1e2c', plumHi: '#923a4c', lace: '#e6d7b0', belt: '#4a3220', apron: '#e9dfc8', apronSh: '#cdc2a8', pocket: '#d8ccb0', trimGold: '#c9a84c' };
const F_ = { lav: '#a99bd6', lavDk: '#8678bd', lavHi: '#bcb0e4', cream: '#f1e8d2', creamDk: '#d9cdb0', gold: '#d9b24a', goldDk: '#a8832a', goldHi: '#f3dc7a', moon: '#dce6f6', moonSh: '#9fb3d6' };
const seedRand = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

function paintFace(F, ex) {
  const c = C, rnd = seedRand(91);
  F.fill(c.skin);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const side = Math.abs(x - 15.5) / 15.5;
    if (side > 0.84) F.px(x, y, c.skinSh); else if (side > 0.74 && (x + y) % 2 === 0) F.px(x, y, c.skinSh);
    if (y > 29) F.px(x, y, c.skinSh);
  }
  F.rect(9, 3, 14, 5, c.skinHi); F.rect(14, 8, 4, 8, c.skinHi);
  // hair across the forehead: parted, swept back from the temples, a streak of grey at the left temple
  for (let x = 0; x < 32; x++) { const h = x < 3 || x > 28 ? 12 : x < 6 || x > 25 ? 6 : 3; F.rect(x, 0, 1, h, (x * 7 + h) % 5 === 0 ? c.hairHi : c.hair); }
  F.rect(0, 0, 32, 2, c.hairDk); F.rect(15, 0, 2, 3, c.hairDk); for (let y = 0; y < 8; y++) F.px(26 - (y >> 1), y, c.grey);
  // soft shading at the eye sockets, laugh lines at the corners of the eyes and the mouth
  F.rect(5, 12, 7, 1, c.skinSh); F.rect(20, 12, 7, 1, c.skinSh); F.rect(5, 17, 7, 1, c.lid); F.rect(20, 17, 7, 1, c.lid);
  for (const [x, y] of [[3, 15], [3, 16], [28, 15], [28, 16], [8, 21], [8, 22], [23, 21], [23, 22]]) F.px(x, y, c.skinSh);
  const E = [{ brow: 'arch', eye: 'open', mouth: 'warm' }, { brow: 'stern', eye: 'open', mouth: 'press' }, { brow: 'arch', eye: 'soft', mouth: 'laugh' }][ex];
  const pal = { d: '#2c1a10', w: c.white, i: c.iris, j: c.irisDk, p: '#13100d', h: '#ffffff', s: c.skinSh, l: c.lid };
  const eyes = { open: ['.dddd.d', 'wiiiipw'.replace('wiiiipw', 'whiipiw'), 'wiiiiiw'.replace(/w$/, 'w'), '.lllll.'], soft: ['.......', '.dddddd', 'dwiiiwd', '.lllll.'] };
  const eg = eyes[E.eye];
  for (const [ex0, mirror] of [[5, false], [20, true]]) { const rows = mirror ? eg.map(r => r.split('').reverse().join('')) : eg; F.grid(rows, pal, ex0, 13); }
  const brows = { arch: [[4, 10, 8, -1], [20, 10, 8, 1]], stern: [[5, 11, 8, 1], [19, 11, 8, -1]] };
  for (const [bx, by, bw, slope] of brows[E.brow]) {                 // a finer brow than Jack's: one row, arched (slope: +1 the inner end drops, -1 it lifts)
    const left = bx < 16;
    for (let i = 0; i < bw; i++) { const t = left ? i : bw - 1 - i, dy = slope > 0 ? Math.round(t * 2 / (bw - 1)) : slope < 0 ? Math.round((bw - 1 - t) * 1 / (bw - 1)) + (i > 1 && i < bw - 2 ? 0 : 1) : 0; F.px(bx + i, by + dy, c.brow); if (i > 1 && i < bw - 2) F.px(bx + i, by + dy + 1, c.brow); }
  }
  F.rect(14, 21, 4, 1, c.skinSh); F.px(13, 22, c.lipDk); F.px(18, 22, c.lipDk); F.px(15, 18, c.skinHi); F.px(16, 18, c.skinHi);
  const m = { l: c.lip, k: c.lipDk, t: c.teeth, m: c.mouth, s: c.skinSh, h: '#c77a80' };
  const mouths = {
    warm:  [{ x: 11, y: 24, rows: ['s.........s'.slice(0, 10), '.kllhhllk.', '..kllllk..'] }],
    press: [{ x: 11, y: 25, rows: ['kkkkkkkkk', '.kkkkkkk.'] }],
    laugh: [{ x: 10, y: 23, rows: ['kkkkkkkkkkk', 'ktttttttttk', '.kmmmmmmmk.', '..kkkkkkk..'] }],
  };
  for (const part of mouths[E.mouth]) F.grid(part.rows, m, part.x, part.y);
  F.noise(1031, 3);
}

function paintStatic(S, outfit) {
  const c = C, fine = outfit === 'Fine', F = F_, rnd = seedRand(521);
  // trim swatches: gold, shine, shade, moonstone, the pin
  [F.gold, F.goldHi, F.goldDk, F.moon, c.trimGold].forEach((col, i) => S.trim.px(i, 0, col)); S.trim.px(5, 0, '#000');
  // hair: dark brunette strands from the crown, with grey threads at the front
  S.hair.fill(c.hair);
  for (let x = 0; x < 32; x++) { let y = 0; while (y < 16) { const len = 2 + Math.floor(rnd() * 5), col = rnd() < 0.4 ? c.hairHi : rnd() < 0.45 ? c.hairDk : c.hair; S.hair.rect(x, y, 1, len, col); y += len; } }
  S.hair.rect(0, 3, 32, 1, c.hairHi); S.hair.dither(0, 2, 32, 3, c.hairHi, 0.3); S.hair.rect(0, 13, 32, 3, c.hairDk);
  for (let i = 0; i < 18; i++) S.hair.rect(Math.floor(rnd() * 32), Math.floor(rnd() * 8), 1, 2 + Math.floor(rnd() * 3), c.grey);
  S.bun.fill(c.hair); for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) { const r = rnd(); S.bun.px(x, y, r < 0.35 ? c.hairHi : r < 0.55 ? c.hairDk : c.hair); if (y % 3 === 0 && x % 2 === 0 && r > 0.8) S.bun.px(x, y, c.grey); }
  // shell: skin below the hairline, hair above it (the hair falls past the jaw behind the ears)
  S.shell.fill(c.skin);
  for (let x = 0; x < 40; x++) {
    const k = x / 40 * 8, th = -Math.PI + 2 * Math.PI * (((8 + k) % 12) / 12), yb = P.hairline(HEAD, th), row = Math.round((HEAD.top - yb) / (HEAD.top - 0.8) * 32);
    for (let y = 0; y < 32; y++) S.shell.px(x, y, y < row ? ((x * 3 + y) % 7 === 0 ? c.hairHi : (x + y * 2) % 5 === 0 ? c.hairDk : c.hair) : (y > row + 6 ? c.skinSh : c.skin));
  }
  S.neck.fill(c.skin); S.neck.rect(0, 5, 16, 3, c.skinSh); S.neck.rect(6, 0, 4, 5, c.skinHi);
  // legs and feet: bare skin, a faint line at the knee, ankles shaded
  S.leg.fill(c.skin); S.leg.rect(0, 0, 32, 2, c.skinHi); S.leg.rect(0, 6, 32, 2, c.line); S.leg.rect(0, 14, 32, 2, c.skinSh); S.leg.noise(2203, 3);
  S.foot.fill(c.skin); S.foot.rect(8, 0, 16, 12, c.skinSh); S.foot.rect(0, 3, 4, 8, c.skinHi); S.foot.rect(28, 3, 4, 8, c.skinHi); S.foot.rect(0, 10, 32, 2, c.skinSh);
  for (const x of [29, 31, 1, 3]) S.foot.px(x, 1, c.skinSh); S.foot.noise(2209, 3);
  for (const [hd, ring] of [[S.handL, true], [S.handR, false]]) { hd.fill(c.skin); hd.rect(0, 0, 16, 2, c.skinSh); hd.rect(0, 10, 16, 6, c.skinHi); for (let x = 1; x < 16; x += 4) hd.vline(x, c.skinSh, 6, 16); if (ring && !fine) { hd.rect(0, 8, 16, 1, c.ring); } hd.noise(2213, 3); }
  const T = S.torso, A = S.arm, Fo = S.fore, W = S.waist, Th = S.skirtT, Sh = S.skirtS, Pv = S.pelvis;
  if (!fine) {
    // ── Work: a plum bodice laced up the front over a cream blouse, a belt, the apron's waist band ──
    T.fill(c.plum);
    T.rect(14, 0, 20, 6, c.blouse); T.rect(0, 0, 8, 6, c.blouse); T.rect(40, 0, 8, 6, c.blouse); T.rect(17, 0, 14, 3, c.skin); T.rect(19, 3, 10, 1, c.skin); T.rect(21, 0, 6, 1, c.skinHi);
    T.rect(14, 5, 20, 1, c.blouseSh);
    T.rect(0, 0, 48, 1, c.blouse); T.rect(0, 5, 48, 1, c.blouseSh);
    T.rect(21, 6, 6, 20, c.plumDk); for (let y = 7; y < 25; y += 4) { T.px(22, y, c.lace); T.px(25, y, c.lace); T.px(23, y + 1, c.lace); T.px(24, y + 1, c.lace); T.px(22, y + 2, c.lace); T.px(25, y + 2, c.lace); }
    T.rect(10, 7, 4, 8, c.plumHi); T.rect(34, 7, 4, 8, c.plumHi);           // the bust's sheen
    T.rect(0, 6, 5, 20, c.plumDk); T.rect(43, 6, 5, 20, c.plumDk); T.rect(0, 6, 48, 1, c.plumDk);    // the back and the sides darker
    T.wrap(-2, 6, 4, 20, c.plumDk);                                 // (the back's seam runs across the sheet's edges)
    T.rect(0, 25, 48, 2, c.belt);
    T.rect(0, 27, 48, 5, c.apron); T.rect(0, 27, 48, 1, c.apronSh); T.rect(0, 30, 48, 2, c.apronSh);
    T.wrap(-3, 27, 6, 5, c.apronSh);
    // sleeves: blouse rolled above the elbow, strong forearms
    A.fill(c.blouse); A.rect(0, 15, 32, 2, c.blouseSh); A.rect(0, 17, 32, 7, c.skin); A.rect(0, 17, 32, 1, c.skinSh); A.rect(0, 0, 32, 2, c.blouseSh); A.noise(2221, 3);
    Fo.fill(c.skin); Fo.rect(0, 0, 32, 3, c.skinHi); Fo.rect(0, 20, 32, 4, c.skinSh); for (let i = 0; i < 14; i++) Fo.px(Math.floor(rnd() * 32), 2 + Math.floor(rnd() * 14), c.skinSh); Fo.noise(2223, 3);
    // the waist piece (7 units of bell from the waist to well below the hips): the apron's tie round the top, its panel down the front with a pocket, the knot and tails at the back
    W.fill(c.plum); for (let x = 2; x < 46; x += 6) W.px(x, 7 + (x % 5), c.plumHi);
    W.rect(0, 0, 48, 4, c.apron); W.rect(0, 3, 48, 1, c.apronSh);
    W.rect(18, 4, 12, 12, c.apron); W.rect(18, 4, 12, 1, c.apronSh); W.rect(20, 8, 8, 5, c.pocket); W.rect(20, 8, 8, 1, c.apronSh); W.px(20, 12, c.apronSh); W.px(27, 12, c.apronSh);
    W.wrap(-3, 0, 6, 16, c.apron); W.wrap(-1, 0, 2, 6, c.apronSh); W.wrap(-4, 4, 2, 10, c.apron); W.wrap(2, 4, 2, 10, c.apron);
    W.rect(0, 15, 48, 1, c.plumDk); W.noise(2227, 3);
    Pv.fill(c.plum); Pv.noise(2229, 3);
    // thigh skirt: plum, the apron's panel on the inside of the front, down to a gold hem at the knee
    Th.fill(c.plum); for (let x = 1; x < 32; x += 5) Th.px(x, 3 + (x % 7), c.plumHi);
    Th.rect(9, 0, 8, 13, c.apron); Th.rect(9, 0, 8, 1, c.apronSh); Th.rect(9, 13, 8, 1, c.trimGold); Th.rect(0, 15, 32, 1, c.plumDk); Th.noise(2231, 3);
    // shin skirt: plum, a darker band, a gold trim at the hem
    Sh.fill(c.plum); Sh.rect(0, 15, 32, 3, c.plumDk); Sh.rect(0, 18, 32, 2, c.trimGold); for (let x = 2; x < 32; x += 5) Sh.px(x, 4 + (x % 6), c.plumHi); Sh.noise(2233, 3);
  } else {
    // ── Fine: a lavender embroidered gown ──
    T.fill(F.lav);
    T.rect(14, 0, 20, 7, F.cream); T.rect(17, 0, 14, 3, c.skin); T.rect(19, 3, 10, 1, c.skin); T.rect(21, 0, 6, 1, c.skinHi);   // a cream embroidered neckline
    for (let x = 14; x < 34; x += 2) { T.px(x, 6, F.creamDk); T.px(x + 1, 7, F.creamDk); }
    T.rect(14, 7, 20, 1, F.lavDk);
    for (let y = 9; y < 24; y += 4) { T.px(23, y, F.cream); T.px(24, y, F.cream); T.px(22, y + 1, F.lavHi); T.px(25, y + 1, F.lavHi); }
    T.rect(10, 8, 4, 9, F.lavHi); T.rect(34, 8, 4, 9, F.lavHi); T.rect(0, 8, 5, 18, F.lavDk); T.rect(43, 8, 5, 18, F.lavDk);
    T.rect(0, 26, 48, 6, F.cream); for (let x = 0; x < 48; x += 2) { T.px(x, 27, F.creamDk); T.px(x + 1, 29, F.creamDk); } T.rect(0, 31, 48, 1, F.lavDk);
    A.fill(F.lav); A.rect(0, 0, 32, 2, F.lavDk); A.rect(0, 20, 32, 4, F.lavDk); for (let x = 0; x < 32; x += 6) A.px(x, 8 + (x % 5), F.lavHi); A.noise(2241, 3);
    Fo.fill(F.lav); Fo.rect(0, 0, 32, 2, F.lavDk); Fo.rect(0, 13, 32, 2, F.creamDk); Fo.rect(0, 15, 32, 4, F.cream); for (let x = 0; x < 32; x += 3) Fo.px(x, 16, F.lavHi); Fo.rect(0, 19, 32, 5, c.skin); Fo.rect(0, 19, 32, 1, c.skinSh); Fo.noise(2243, 3);
    W.fill(F.lav); W.rect(0, 0, 48, 4, F.cream); for (let x = 0; x < 48; x += 2) W.px(x, 1, F.creamDk); W.rect(0, 4, 48, 1, F.lavDk); for (let x = 3; x < 48; x += 7) W.px(x, 8 + (x % 4), F.lavHi); W.rect(0, 15, 48, 1, F.lavDk); W.noise(2247, 3);
    Pv.fill(F.lav); Pv.noise(2249, 3);
    Th.fill(F.lav); for (let x = 2; x < 32; x += 6) { Th.px(x, 3 + (x % 5), F.lavHi); Th.px(x + 2, 8 + (x % 3), F.lavDk); } Th.rect(0, 15, 32, 1, F.lavDk); Th.noise(2251, 3);
    Sh.fill(F.lav); for (let x = 1; x < 32; x += 5) { Sh.px(x, 3 + (x % 6), F.lavHi); Sh.px(x + 2, 9 + (x % 4), F.lavDk); } Sh.rect(0, 14, 32, 2, F.lavDk); Sh.rect(0, 16, 32, 4, F.cream); for (let x = 0; x < 32; x += 2) { Sh.px(x, 17, F.creamDk); Sh.px(x + 1, 19, F.creamDk); } Sh.noise(2253, 3);
  }
  T.noise(2203, 3);
}

Object.assign(P, { makeGerda, GERDA_EXPR, gerdaExprIndex, OUTFITS: Object.assign(P.OUTFITS || {}, { gerda: OUTFITS }) });
})(typeof window !== 'undefined' ? window : globalThis);
