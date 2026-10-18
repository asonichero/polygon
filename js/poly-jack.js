// Polygon — Jack, 21: lean, quick, a grin kept ready. A grown man built the way a late-90s console character was: about nine hundred triangles, rigid segments on a joint skeleton,
// a face on a flat plate whose texture is swapped for each expression, and a 128x128 atlas painted here pixel by pixel.
// Outfits: 'Outdoor' (linen shirt, green jerkin, patched trousers, boots), 'Day' (a soft green tunic over snug shorts, barefoot), 'Soft' (a cornflower tunic with a pocket over cornflower
// shorts, barefoot), 'Fine' (the outdoor clothes dressed up: a deep green jerkin edged in gold, clean breeches, polished boots with brass buckles).
// rig.paint({ outfit, trousers: 'up'|'down', drawers: 'up'|'down', marks: { L, R } (0-1), expr: 0-7 or a name, hitched, blush }) repaints only what changed.
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly, { loft, loftUV, merge, place, ball, box, flatUV } = P;
const R = P.R;
const clamp = P.clamp;

const JACK_EXPR = { grin: 0, wince: 1, gritted: 2, crying: 3, squint: 4, cheeky: 5, shy: 6, smile: 7 };
const jackExprIndex = e => typeof e === 'string' ? (JACK_EXPR[e] !== undefined ? JACK_EXPR[e] : 0) : clamp(e | 0, 0, 7);
const OUTFITS = ['Outdoor', 'Day', 'Soft', 'Fine'];

// ---------------------------------------------------------------------------------------------------------------------------
// Shapes (the builders are shared, in js/poly.js; these are Jack's measurements)
// ---------------------------------------------------------------------------------------------------------------------------
const HS = 0.93;               // (the whole head is built at 1 and drawn a little smaller: a grown man's head is about a seventh of his height)
const HEAD = { rings: [R(0.8, 1.3, 1.55, 1.7, .78), R(1.4, 2.2, 2.3, 1.2, .86), R(2.4, 2.7, 2.9, 0.55), R(3.5, 2.95, 3.15, 0.25), R(4.6, 3.0, 3.35, 0.1), R(5.6, 2.95, 3.4, 0.1), R(6.7, 2.7, 3.2, -0.1), R(7.6, 1.95, 2.55, -0.2)],
  top: 8.15, faceW: 3.1, faceY0: 0.8, faceY1: 7.5,
  hairline: [[0, 6.0], [0.5, 5.8], [1.05, 5.2], [1.57, 4.5], [2.1, 3.9], [2.6, 3.3], [3.14, 3.0]], hairRows: [8.7, 8.2, 7.6, 6.8, 5.9, 4.9, 4.0, 3.0] };
const hscale = g => { g.scale(HS, HS, HS); return g; };

// ---------------------------------------------------------------------------------------------------------------------------
// The figure
// ---------------------------------------------------------------------------------------------------------------------------
function makeJack() {
  const atlas = new P.Atlas(128, 128), S = atlas.pack([['face', 32, 32], ['shell', 40, 32], ['hair', 32, 16], ['neck', 16, 8], ['torso', 48, 32], ['pelvis', 48, 16], ['arm', 32, 24], ['fore', 32, 24], ['handL', 16, 16], ['handR', 16, 16],
    ['thigh', 32, 24], ['shin', 32, 24], ['boot', 32, 10], ['shoe', 32, 14], ['foot', 32, 12], ['seat', 32, 16], ['hem', 32, 8], ['trim', 16, 8]]);
  const rig = P.skeleton(), { mat, two } = P.materials(atlas), add = P.add;
  rig.atlas = atlas; rig.sheets = S; rig.kind = 'jack';
  const trim = c => S.trim.texel(c % 16, Math.floor(c / 16));           // flat-colour cells: 0 belt, 1 buckle, 2 buckle shine, 3 pouch, 4 sole, 5 boot brass, 6 dark
  const mk = (geo, parent, m, name) => add(parent, geo, m || mat, name);

  // ── Head, neck and hair ──
  const H = P.buildHead(HEAD, S);
  mk(hscale(merge([H.face, H.shell])), rig.neck, mat, 'head');
  const earSkin = S.face.texel(1, 20);
  for (const sg of [1, -1]) {                                                      // ears: small flattened balls on the sides, a little back of centre
    const e = ball(0.5, 1.0, 0.75, 6, 3, earSkin); place(e, sg * 3.05, 3.7, -0.15, 0, 0, sg * 0.18); mk(hscale(e), rig.neck, mat, 'ear');
  }
  const nose = loft({ sides: 6, rings: [R(0, 0.32, 0.45, 0), R(-0.55, 0.5, 0.62, 0.12), R(-1.0, 0.55, 0.66, 0.28)], cap: { bottom: { h: 0.32, steps: 1 } } });   // (a small wedge: bridge, then the tip)
  const noseGeo = nose.patch(0, 6, () => S.face.texel(16, 18)); place(noseGeo, 0, 4.2, 3.4, 0.7, 0, 0); mk(hscale(noseGeo), rig.neck, mat, 'nose');
  const neckG = loft({ sides: 8, rings: [R(1.4, 1.5, 1.45, 0.1), R(-1.6, 1.68, 1.6, 0)] });
  mk(neckG.patch(0, 8, loftUV(neckG, S.neck)), rig.neck, mat, 'neck');
  const hairGeo = P.buildHair(HEAD, S); const hairParts = [hairGeo];
  // the swept fringe: three locks falling over the brow to Jack's left, a tuft at the crown, and one at the nape
  const L = (len, w, sw, bd, x, y, z, rx, ry, rz) => place(P.lock(S, len, w, sw, bd), x, y, z, rx, ry, rz);
  hairParts.push(L(1.8, 0.95, 0.9, 0.5, 1.9, 6.6, 3.0, 0.5, -0.3, 0.2), L(2.0, 1.0, 0.8, 0.5, 0.4, 6.75, 3.15, 0.55, -0.15, 0.1), L(1.5, 0.85, 0.6, 0.4, -1.2, 6.6, 3.1, 0.5, 0.1, -0.05));
  hairParts.push(L(1.6, 0.7, 0.2, 0.2, 2.3, 8.2, -0.6, -0.4, 0.3, 0.45));
  mk(hscale(merge(hairParts)), rig.neck, two, 'hair');

  // ── Torso, pelvis ──
  const torsoG = loft({ sides: 12, rings: [R(2.2, 3.0, 2.05, 0, .8), R(4.4, 3.2, 2.2, 0, .9), R(6.8, 3.6, 2.45, 0.05), R(9.2, 4.0, 2.6, 0.1), R(10.9, 4.4, 2.35, 0), R(11.9, 3.3, 1.95, -0.1), R(12.5, 1.9, 1.55, -0.1, .9)], cap: { top: { h: 0.4, steps: 1 } } });
  mk(torsoG.patch(0, 12, loftUV(torsoG, S.torso)), rig.torso, mat, 'torso');
  const pelG = loft({ sides: 12, rings: [R(3.6, 3.15, 2.05, 0, .85), R(2.2, 3.55, 2.3, -0.05), R(0.6, 3.8, 2.55, -0.1), R(-1.2, 3.65, 2.5, -0.1, .95), R(-2.6, 3.0, 2.1, 0, .8)], cap: { bottom: { h: 0.8, steps: 2, shade: 0.8 } } });
  mk(place(pelG.patch(0, 12, loftUV(pelG, S.pelvis)), 0, -1.5, 0), rig.pelvis, mat, 'pelvis');
  // belt, buckle and pouch (hidden once the trousers are down, and in the tunics)
  rig.belt = new THREE.Group(); rig.pelvis.add(rig.belt);
  const beltG = loft({ sides: 12, rings: [R(3.05, 3.4, 2.22), R(1.85, 3.74, 2.5, -0.05)] });
  mk(place(beltG.patch(0, 12, () => trim(0)), 0, -1.5, 0), rig.belt, mat, 'belt');
  mk(place(box(1.5, 1.1, 0.35, trim(1)), 0, 1.0, 2.62), rig.belt, mat, 'buckle');
  mk(place(box(1.5, 1.7, 1.1, trim(3)), 3.75, 0.4, 0.6, 0, 0, -0.12), rig.belt, mat, 'pouch');

  // ── Arms: a shoulder dome capping the upper arm, an elbow ball, forearm, and a hand with its thumb ──
  for (const [key, el, wr, side] of [['armL', 'elbowL', 'wristL', 1], ['armR', 'elbow', 'wrist', -1]]) {
    const up = loft({ sides: 8, rings: [R(1.7, 1.72, 1.66, 0, .9), R(0.2, 1.78, 1.7), R(-2.0, 1.58, 1.58), R(-4.3, 1.38, 1.38)], cap: { top: { h: 0.75, steps: 2, shade: 0.95 } } });
    mk(up.patch(0, 8, loftUV(up, S.arm)), rig[key], mat, 'upperArm');
    const eb = ball(1.38, 1.3, 1.38, 8, 4, S.fore.texel(3, 1)); mk(eb, rig[el], mat, 'elbowCap');
    const fo = loft({ sides: 8, rings: [R(0.3, 1.34, 1.34), R(-1.4, 1.42, 1.4), R(-3.6, 1.0, 1.0), R(-4.2, 0.95, 1.0)] });
    mk(fo.patch(0, 8, loftUV(fo, S.fore)), rig[wr], mat, 'forearm');
    mk(P.handGeo(S, side > 0 ? S.handL : S.handR, side), rig[wr], mat, 'hand');
  }

  // ── Legs: thigh (a dome at the hip), knee ball, shin, boot and foot ──
  const FOOT_BOOT = [[-1.8, 1.3, 0.95, 5.1], [-0.6, 1.5, 1.15, 4.9], [1.2, 1.45, 0.8, 5.4], [2.7, 1.3, 0.62, 5.55], [3.7, 1.0, 0.5, 5.6]];    // (along z, half width, half height, centre height below the knee's origin... floor at 6)
  const FOOT_BARE = [[-1.7, 1.15, 0.85, 5.2], [-0.5, 1.3, 1.0, 5.0], [1.1, 1.35, 0.68, 5.5], [2.6, 1.3, 0.5, 5.62], [3.5, 1.1, 0.42, 5.66]];
  for (const [key, side] of [['legL', 1], ['legR', -1]]) {
    const leg = rig[key];
    const th = loft({ sides: 8, rings: [R(0.4, 2.05, 2.1, 0, .9), R(-1.2, 2.1, 2.2, -0.05), R(-3.5, 1.85, 1.95), R(-5.4, 1.58, 1.68), R(-6.3, 1.52, 1.62)], cap: { top: { h: 1.1, steps: 2, shade: .85 } } });
    mk(th.patch(0, 8, loftUV(th, S.thigh)), leg.thigh, mat, 'thigh');
    mk(ball(1.62, 1.5, 1.7, 8, 4, S.thigh.texel(5, 22)), leg.knee, mat, 'kneeCap');
    const sh = loft({ sides: 8, rings: [R(0.3, 1.6, 1.68), R(-1.5, 1.68, 1.92, -0.25), R(-3.7, 1.3, 1.42, -0.1), R(-5.4, 1.08, 1.15), R(-6.0, 1.15, 1.22)] });
    mk(sh.patch(0, 8, loftUV(sh, S.shin)), leg.shin, mat, 'shin');
    leg.boot = mk(P.footGeo(S.shoe, FOOT_BOOT), leg.foot, mat, 'boot'); leg.bare = mk(P.footGeo(S.foot, FOOT_BARE), leg.foot, mat, 'foot');
    // the boot's shaft over the shin's lower part
    const shaft = loft({ sides: 8, rings: [R(-3.0, 1.42, 1.5), R(-4.6, 1.5, 1.62), R(-6.05, 1.52, 1.66)] });
    leg.shaft = mk(shaft.patch(0, 8, loftUV(shaft, S.boot)), leg.shin, mat, 'shaft');
    // the gathered trousers (a ring about the knee, seen when the trousers are down) and the tunic's hem (a flare over the top of the thigh)
    const ring = loft({ sides: 8, rings: [R(1.7, 2.1, 2.25), R(0.2, 2.5, 2.6), R(-1.4, 2.1, 2.25)], cap: {} });
    leg.ring = mk(ring.patch(0, 8, () => S.thigh.texel(4, 22)), leg.knee, two, 'ring'); leg.ring.visible = false;
    const hem = loft({ sides: 8, rings: [R(0.7, 2.55, 2.6), R(-0.8, 2.95, 3.0), R(-1.9, 3.15, 3.2)] });
    leg.hem = mk(hem.patch(0, 8, loftUV(hem, S.hem)), leg.thigh, two, 'hem'); leg.hem.visible = false;
  }
  // ── The seat (lap scene): two rounded cheeks bridging his back and his thighs once they fold. Built in the hinge's frame (see js/lap.js), which adds rig.seat to it ──
  {
    const cheeks = [];
    for (const sg of [1, -1]) {                                                         // (+x is his left: the right half of the seat sheet)
      const b = ball(2.5, 2.6, 2.65, 10, 5, (i, k, x, y) => S.seat.uv((sg > 0 ? 0.5 : 0) + (0.5 + x / 5) * 0.5, clamp(0.5 - y / 5.2, 0, 1)));
      cheeks.push(place(b, sg * 2.2, -2.6, 2.7));
    }
    rig.seat = new THREE.Mesh(merge(cheeks), mat); rig.seat.name = 'seat';
  }

  // ── Painting ──
  const keys = {};
  const once = (name, key, fn) => { if (keys[name] === key) return false; keys[name] = key; fn(); return true; };
  rig.paint = function (st) {
    st = Object.assign({ outfit: 'Outdoor', trousers: 'up', drawers: 'up', marks: { L: 0, R: 0 }, expr: 0, hitched: false, blush: false }, st);
    const outfit = OUTFITS.indexOf(st.outfit) >= 0 ? st.outfit : 'Outdoor', ex = jackExprIndex(st.expr), mk_ = (m) => Math.round(clamp(m, 0, 1) * 40);
    const tunic = outfit === 'Day' || outfit === 'Soft', down = st.trousers === 'down', dd = st.drawers === 'down';
    let changed = false;
    changed = once('face', ex + '|' + !!st.blush + '|' + outfit, () => paintFace(S.face, ex, st.blush)) || changed;
    changed = once('static', outfit, () => paintStatic(S, outfit)) || changed;
    changed = once('legs', [outfit, st.trousers, st.drawers, mk_(st.marks.L), mk_(st.marks.R)].join('|'), () => paintLegs(S, outfit, down, dd, st.marks)) || changed;
    changed = once('seat', [outfit, st.trousers, st.drawers, mk_(st.marks.L), mk_(st.marks.R)].join('|'), () => { paintSeat(S.seat, outfit, down, dd, st.marks); paintPelvis(S.pelvis, outfit, down, dd, st.marks); }) || changed;
    const boots = !tunic;
    for (const k of ['legL', 'legR']) { const l = rig[k]; l.boot.visible = l.shaft.visible = boots; l.bare.visible = !boots; l.hem.visible = tunic && !st.hitched; l.ring.visible = down; }
    rig.belt.visible = !tunic && !down;
    if (changed) atlas.touch();
    rig.last = st; rig.look = { outfit, tunic, down, dd };
  };
  rig.setExpr = e => rig.paint(Object.assign({}, rig.last || {}, { expr: e }));
  rig.paint({});
  return rig;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Painting
// ---------------------------------------------------------------------------------------------------------------------------
const C = { skin: '#e2b58f', skinSh: '#c99874', skinHi: '#eec7a2', seat: '#ebc4a0', seatSh: '#c99874', hair: '#7a4a22', hairHi: '#9a6532', hairDk: '#5c3517', brow: '#5c3517', white: '#f2f0ea', iris: '#3f7f4a', irisDk: '#2c5c36',
  lid: '#b98a68', lip: '#b4685a', lipDk: '#8f4c44', teeth: '#f6f2ea', stub: '#c8a07f', mouth: '#6a2a2a', tongue: '#c0605a', blush: '#e8938a',
  linen: '#e8dfc4', linenSh: '#cfc4a6', vest: '#4b7a3a', vestDk: '#375c2a', vestHi: '#5d9248', belt: '#4a3220', buckle: '#d6b24a', pouch: '#6b4a2a',
  trousers: '#6d5233', trousersDk: '#59422a', patch: '#8b7048', stitch: '#4a3820', boot: '#3a2616', bootHi: '#5a3d24', sole: '#22160c', lace: '#b8a070', drawers: '#e6dcc2', drawersSh: '#cbbf9f' };

function palFor(outfit) {
  const c = Object.assign({}, C);
  if (outfit === 'Fine') Object.assign(c, { linen: '#f3ecd8', linenSh: '#d8cfb6', vest: '#2f6140', vestDk: '#214a30', vestHi: '#3c7a50', belt: '#2f1f14', buckle: '#e8c75a', trousers: '#4c3827', trousersDk: '#3b2a1d', stitch: '#d9b24a', boot: '#2a1a10', bootHi: '#4a3020', sole: '#160d07', lace: '#d9b24a' });
  const T = outfit === 'Day' ? { base: '#86ad72', dk: '#6c9459', hi: '#9cc388', wood: '#8a6038', woodHi: '#b0834f', shorts: '#b8a173', shortsDk: '#9b855d', len: 3.4 }
    : outfit === 'Soft' ? { base: '#93acd9', dk: '#7c97c9', hi: '#adc2e8', wood: '#6f86b4', woodHi: '#c4d4f0', shorts: '#7f9ccc', shortsDk: '#6a88b8', len: 2.4 } : null;
  if (T) { c.trousers = T.shorts; c.trousersDk = T.shortsDk; }
  return { c, T };
}
const seedRand = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// The face: skin shaded toward the cheeks, hair across the top, then eyes, brows, nose and mouth for the expression. 32x32: the plate runs 6.2 units wide and 6.7 tall
// (eye line at row 14, brows at 10, nose tip at 20, mouth at 24).
function paintFace(F, ex, blush) {
  const c = C, rnd = seedRand(77);
  F.fill(c.skin);
  // light from the front: a lit forehead and nose bridge, the cheeks and jaw falling into shade toward the sides and under the chin
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const side = Math.abs(x - 15.5) / 15.5;
    if (side > 0.84) F.px(x, y, c.skinSh); else if (side > 0.74 && (x + y) % 2 === 0) F.px(x, y, c.skinSh);
    if (y > 29) F.px(x, y, c.skinSh);
  }
  F.rect(9, 3, 14, 5, c.skinHi); F.rect(14, 8, 4, 8, c.skinHi);
  // hair across the top and down the temples (the fringe is geometry; this is what shows under it)
  for (let x = 0; x < 32; x++) { const h = x < 3 || x > 28 ? 12 : x < 6 || x > 25 ? 7 : 4; F.rect(x, 0, 1, h, (x * 7 + h) % 5 === 0 ? c.hairHi : c.hair); }
  F.rect(0, 0, 32, 2, c.hairDk);
  // a grown man's face: eye sockets and cheek hollows, creases from nose to mouth, stubble over the jaw and the lip
  F.rect(5, 12, 7, 1, c.skinSh); F.rect(20, 12, 7, 1, c.skinSh); F.rect(5, 17, 7, 1, c.lid); F.rect(20, 17, 7, 1, c.lid);
  for (const [x, y] of [[8, 21], [8, 22], [9, 23], [23, 21], [23, 22], [22, 23]]) F.px(x, y, c.skinSh);
  for (let i = 0; i < 110; i++) { const x = 6 + Math.floor(rnd() * 20), y = 23 + Math.floor(rnd() * 9), onMouth = y >= 23 && y <= 27 && x > 9 && x < 22; if (!onMouth && (y > 26 || x < 11 || x > 20)) F.px(x, y, i % 3 ? c.stub : '#b98e6e'); }
  for (let x = 12; x < 20; x++) if (x % 2 === 0) F.px(x, 22, c.stub);
  // ── eyes, brows, mouth ──
  const E = [
    { eye: 'open', brow: 'flat', mouth: 'grin' }, { eye: 'wince', brow: 'worry', mouth: 'tight' }, { eye: 'shut', brow: 'furrow', mouth: 'gritted' }, { eye: 'cry', brow: 'worry', mouth: 'open' },
    { eye: 'squint', brow: 'low', mouth: 'grin' }, { eye: 'open', brow: 'cheeky', mouth: 'toothy' }, { eye: 'open', brow: 'worry', mouth: 'small' }, { eye: 'soft', brow: 'flat', mouth: 'smile' }][ex];
  const pal = { d: '#3c2414', w: c.white, i: c.iris, j: c.irisDk, p: '#13100d', h: '#ffffff', s: c.skinSh, l: c.lid, b: c.brow };
  const eyes = {
    open:   ['.ddddd.', 'whipiiw', '.lllll.'],
    wince:  ['.ddddd.', 'dddddds', '.sssss.'],
    shut:   ['.......', 'ddddddd', '.sssss.'],
    cry:    ['.......', 'ddddddd', '.sssss.'],
    squint: ['.......', 'dddddd.', 'wippiw.'],
    soft:   ['.ddddd.', 'dddddd.', '.wiiiw.'],
  };
  const eg = eyes[E.eye];
  for (const [ex0, mirror] of [[5, false], [20, true]]) {            // the image's left eye is Jack's right
    const rows = mirror ? eg.map(r => r.split('').reverse().join('')) : eg;
    F.grid(rows, Object.assign({ t: '#9cc8ee' }, pal), ex0, 14);
    if (E.eye === 'cry') { const tx = ex0 + (mirror ? 5 : 1); F.px(tx, 17, '#9cc8ee'); F.px(tx, 18, '#cfe6f8'); F.px(tx + (mirror ? -1 : 1), 19, '#cfe6f8'); F.px(tx, 20, '#9cc8ee'); }
  }
  const brows = { flat: [[4, 10, 8, 0], [20, 10, 8, 0]], worry: [[4, 10, 8, -1], [20, 10, 8, 1]], furrow: [[5, 11, 8, 1], [19, 11, 8, -1]], low: [[4, 12, 8, 0], [20, 12, 8, 0]], cheeky: [[4, 8, 8, 0], [20, 10, 8, 0]] };
  for (const [bx, by, bw, slope] of brows[E.brow]) {                 // a heavy brow: two rows thick, tilted by `slope` (+1: the inner end drops; -1: it lifts)
    const left = bx < 16;
    for (let i = 0; i < bw; i++) { const t = left ? i : bw - 1 - i, dy = slope > 0 ? Math.round(t * slope / (bw - 1) * 2) : slope < 0 ? Math.round((bw - 1 - t) * -slope / (bw - 1) * 2) : (i === 0 || i === bw - 1 ? 1 : 0); F.px(bx + i, by + dy, c.brow); F.px(bx + i, by + dy + 1, c.brow); }
  }
  // nose: shaded underside and nostrils (the nose itself is geometry), a lit bridge
  F.rect(13, 20, 6, 2, c.skinSh); F.px(13, 22, c.lipDk); F.px(18, 22, c.lipDk); F.px(15, 18, c.skinHi); F.px(16, 18, c.skinHi);
  // mouth
  const m = { l: c.lip, k: c.lipDk, t: c.teeth, m: c.mouth, s: c.skinSh, g: c.tongue };
  const mouths = {
    grin:    [{ x: 10, y: 24, rows: ['s.........s', '.kllllllllk.'.slice(0, 11), '..kkkkkkk..'] }],
    tight:   [{ x: 11, y: 25, rows: ['kllllllk', '.kkkkkk.'] }],
    gritted: [{ x: 10, y: 24, rows: ['kkkkkkkkkkk', 'ttttktttttt', 'ttttktttttt', 'kkkkkkkkkkk'] }],
    open:    [{ x: 11, y: 23, rows: ['.kkkkkkkk.', 'kmmmmmmmmk', 'kmmmmmmmmk', 'kmmggggmmk', '.kmmggmmk.', '..kkkkkk..'] }],
    toothy:  [{ x: 10, y: 24, rows: ['s.........s', 'kkkkkkkkkkk', 'kttttttttk.'.slice(0, 10) + 'k', '.ktttttttk.', '..kkkkkkk..'] }],
    small:   [{ x: 12, y: 25, rows: ['.kllllk.', '..kkkk..'] }],
    smile:   [{ x: 10, y: 24, rows: ['s.........s', '.kk.....kk.', '..kllllk...'.slice(0, 11), '...kttk....'.slice(0, 11)] }],
  };
  for (const part of mouths[E.mouth]) F.grid(part.rows, m, part.x, part.y);
  if (blush) { F.rect(4, 19, 5, 2, c.blush); F.rect(23, 19, 5, 2, c.blush); }
  F.noise(1021, 3);
}

// Everything that does not change with the face: shell, hair, neck, torso, pelvis, arms, hands, boots, feet and the trim swatches, for an outfit.
function paintStatic(S, outfit) {
  const { c, T } = palFor(outfit), tunic = !!T, rnd = seedRand(311);
  // trim swatches
  S.trim.fill('#000'); [c.belt, c.buckle, '#f0d878', c.pouch, c.sole, '#d9b24a', '#241a12'].forEach((col, i) => S.trim.px(i, 0, col));
  // hair: brown strands running from the crown down, a sheen band across the top
  S.hair.fill(c.hair);
  for (let x = 0; x < 32; x++) { let y = 0; while (y < 16) { const len = 2 + Math.floor(rnd() * 5), col = rnd() < 0.4 ? c.hairHi : rnd() < 0.5 ? c.hairDk : c.hair; S.hair.rect(x, y, 1, len, col); y += len; } }
  S.hair.rect(0, 3, 32, 1, c.hairHi); S.hair.dither(0, 2, 32, 3, c.hairHi, 0.35); S.hair.rect(0, 13, 32, 3, c.hairDk);
  // shell: skin below the hairline, hair above it; ears and the nape
  S.shell.fill(c.skin);
  for (let x = 0; x < 40; x++) {
    const k = x / 40 * 8, jj = 8 + k, th = -Math.PI + 2 * Math.PI * ((jj % 12) / 12), yb = P.hairline(HEAD, th), row = Math.round((HEAD.top - yb) / (HEAD.top - 0.8) * 32);
    for (let y = 0; y < 32; y++) S.shell.px(x, y, y < row ? ((x * 3 + y) % 7 === 0 ? c.hairHi : (x + y * 2) % 5 === 0 ? c.hairDk : c.hair) : (y > row + 6 ? c.skinSh : c.skin));
  }
  S.neck.fill(c.skin); S.neck.rect(0, 5, 16, 3, c.skinSh); S.neck.rect(6, 0, 4, 5, c.skinHi);
  // torso (48x32): the rows run from the neck down to the waist
  const T_ = S.torso;
  if (!tunic) {
    T_.fill(c.vest);
    // linen shirt showing at the throat, laced, and at the sides under the arms
    T_.rect(20, 0, 8, 12, c.linen); T_.rect(22, 0, 4, 9, c.linenSh); T_.rect(23, 0, 2, 3, c.skin);
    for (let y = 2; y < 11; y += 3) { T_.px(22, y, c.stitch); T_.px(25, y, c.stitch); T_.px(23, y + 1, c.lace); T_.px(24, y + 1, c.lace); }
    // the jerkin's front edges, a darker edge and the back panel's seam
    T_.rect(18, 4, 2, 28, c.vestDk); T_.rect(28, 4, 2, 28, c.vestDk);
    T_.rect(16, 0, 2, 5, c.vestDk); T_.rect(30, 0, 2, 5, c.vestDk);
    T_.rect(0, 0, 48, 2, c.vestHi); T_.rect(22, 6, 4, 26, c.vest);
    T_.rect(23, 12, 2, 20, c.vestHi);
    for (let y = 8; y < 30; y += 6) { T_.rect(19, y, 1, 1, c.buckle); T_.rect(28, y, 1, 1, c.buckle); }
    T_.rect(0, 0, 4, 32, c.vestDk); T_.rect(44, 0, 4, 32, c.vestDk); T_.rect(23, 2, 2, 30, c.vestDk);      // (the back, where the seam runs: at the sheet's edges)
    T_.rect(0, 29, 48, 3, c.vestDk);
    for (let x = 4; x < 44; x++) if ((x * 5) % 7 === 0) T_.px(x, 14 + (x % 9), c.vestHi);
    // linen at the sides under the arms, the shirt-tail line at the hem
    T_.rect(10, 6, 3, 18, c.linenSh); T_.rect(35, 6, 3, 18, c.linenSh);
  } else {
    T_.fill(T.base); T_.rect(0, 0, 48, 2, T.hi);
    T_.rect(19, 0, 10, 4, c.skin); T_.rect(20, 3, 8, 1, c.skinSh); T_.rect(21, 0, 6, 3, c.skin);      // a round neckline
    if (outfit === 'Day') { T_.rect(23, 3, 2, 29, T.dk); for (const y of [6, 11, 16, 21, 26]) { T_.px(23, y, T.wood); T_.px(24, y, T.woodHi); } }
    else { T_.rect(17, 14, 8, 6, T.hi); T_.rect(18, 15, 6, 4, T.base); T_.rect(18, 15, 6, 1, T.dk); T_.px(21, 17, T.dk); }
    T_.rect(0, 0, 4, 32, T.dk); T_.rect(44, 0, 4, 32, T.dk); T_.rect(0, 30, 48, 2, T.dk);
    for (let x = 0; x < 48; x += 3) T_.px(x, 8 + (x % 5) * 3, T.hi);
  }
  T_.noise(2021, 4);
  // pelvis (48x16): the shirt-tail (or the tunic) under the belt; what lies below it depends on the trousers, see paintPelvis.
  S.pelvis.fill(tunic ? T.base : c.linen); S.pelvis.rect(0, 0, 48, 1, tunic ? T.hi : c.linen); if (!tunic) S.pelvis.rect(0, 5, 48, 1, c.linenSh); else S.pelvis.rect(0, 5, 48, 1, T.dk);
  // arms: the sleeve (or the tunic's), and the forearm
  const A = S.arm, Fo = S.fore;
  if (!tunic) { A.fill(c.linen); A.rect(0, 0, 32, 8, c.vest); A.rect(0, 7, 32, 1, c.vestDk); A.rect(0, 17, 32, 3, c.linenSh); A.rect(0, 20, 32, 4, c.skin); A.rect(0, 20, 32, 1, c.skinSh); A.rect(14, 8, 4, 9, '#f6f0dc'); }
  else { A.fill(T.base); A.rect(0, 0, 32, 2, T.hi); A.rect(0, 14, 32, 2, T.dk); A.rect(0, 16, 32, 8, c.skin); A.rect(0, 16, 32, 1, c.skinSh); }
  A.noise(2031, 4);
  Fo.fill(c.skin); Fo.rect(0, 0, 32, 3, c.skinHi); for (let i = 0; i < 22; i++) Fo.px(Math.floor(rnd() * 32), 2 + Math.floor(rnd() * 12), c.skinSh); Fo.rect(12, 2, 8, 1, c.skinSh);
  if (!tunic) { Fo.rect(0, 14, 32, 5, c.belt); Fo.rect(0, 14, 32, 1, c.pouch); Fo.rect(15, 15, 2, 3, c.buckle); }
  Fo.rect(0, 20, 32, 4, c.skinSh); Fo.noise(2033, 4);
  for (const hd of [S.handL, S.handR]) { hd.fill(c.skin); hd.rect(0, 0, 16, 2, c.skinSh); hd.rect(0, 10, 16, 6, c.skinHi); for (let x = 1; x < 16; x += 4) hd.vline(x, c.skinSh, 6, 16); hd.px(2, 2, c.skin); hd.noise(2039, 3); }
  // boots (outdoor): the shaft with its laces; the foot with a toe cap and a sole down its middle (the loft's front is its underside, so the sole is the sheet's middle columns).
  S.boot.fill(c.boot); S.boot.rect(0, 0, 32, 2, c.bootHi); S.boot.rect(0, 9, 32, 1, c.sole);
  for (let y = 1; y < 9; y += 2) { S.boot.px(15, y, c.lace); S.boot.px(16, y + 1, c.lace); S.boot.px(14, y, c.bootHi); S.boot.px(17, y + 1, c.bootHi); }
  S.shoe.fill(c.boot); S.shoe.rect(0, 0, 32, 4, c.bootHi); S.shoe.rect(8, 0, 16, 14, c.sole); S.shoe.rect(0, 12, 32, 2, c.sole); S.shoe.rect(0, 0, 32, 1, c.boot);
  for (let y = 5; y < 12; y += 3) { S.shoe.px(28, y, c.lace); S.shoe.px(3, y, c.lace); }
  if (outfit === 'Fine') { S.boot.rect(13, 3, 6, 3, c.buckle); S.boot.rect(14, 4, 4, 1, c.bootHi); S.boot.rect(0, 0, 32, 1, c.buckle); S.shoe.rect(0, 0, 32, 1, c.buckle); }
  S.boot.noise(2041, 4); S.shoe.noise(2042, 4);
  S.foot.fill(c.skin); S.foot.rect(8, 0, 16, 12, c.skinSh); S.foot.rect(0, 3, 4, 8, c.skinHi); S.foot.rect(28, 3, 4, 8, c.skinHi); S.foot.rect(0, 10, 32, 2, c.skinSh);
  for (const x of [29, 31, 1, 3]) S.foot.px(x, 1, c.skinSh); for (const x of [27, 0, 2, 4]) S.foot.px(x, 0, c.skinHi); S.foot.noise(2043, 3);
  // hem of the tunics
  if (T) { S.hem.fill(T.base); S.hem.rect(0, 5, 32, 3, T.dk); S.hem.rect(0, 7, 32, 1, T.hi); S.hem.noise(2047, 4); } else S.hem.fill(c.linen);
}

// The legs (thigh and shin sheets) for the state of the trousers and drawers; the bare skin of the thigh takes the marks.
function paintLegs(S, outfit, down, dd, marks) {
  const { c, T } = palFor(outfit), tunic = !!T, Th = S.thigh, Sh = S.shin, rnd = seedRand(401);
  const rows = 24, unit = y => y / 24 * 6.7 - 0.4;                       // sheet row -> distance down the thigh from the hip (units)
  const colourAt = d => !down ? 'trousers' : d < 2 ? (dd ? 'skin' : 'drawers') : d < 4 ? 'drawers' : 'trousers';
  for (let y = 0; y < rows; y++) {
    const d = Math.max(0, unit(y)); let what = colourAt(d);
    // shorts and the like: the trousers end part-way down the thigh in the tunics
    if (tunic && !down && d > T.len) what = 'skin';
    const base = what === 'skin' ? c.skin : what === 'drawers' ? c.drawers : c.trousers;
    Th.rect(0, y, 32, 1, base);
    if (what === 'trousers' && (y % 9 === 0)) Th.rect(0, y, 32, 1, c.trousersDk);
  }
  // seams, patch (outdoor), gold seam (fine), the knee line
  if (!tunic) {
    if (outfit === 'Fine') { Th.rect(7, 0, 1, 20, c.stitch); Th.rect(24, 0, 1, 20, c.stitch); } else { Th.rect(14, 5, 5, 5, c.patch); Th.rect(14, 5, 5, 1, c.stitch); Th.rect(14, 9, 5, 1, c.stitch); Th.px(14, 7, c.stitch); Th.px(18, 7, c.stitch); }
    if (down) for (let y = 16; y < 24; y++) Th.rect(0, y, 32, 1, y % 3 === 0 ? c.trousersDk : c.trousers);
  }
  if (tunic && !down) { Th.rect(0, 14, 32, 10, c.skin); Th.rect(0, 22, 32, 2, c.skinSh); }
  Th.rect(0, 22, 32, 2, tunic && !down ? c.skinSh : c.trousersDk);
  for (let i = 0; i < 12; i++) { if (tunic && !down) Th.px(Math.floor(rnd() * 32), 16 + Math.floor(rnd() * 5), c.skinSh); }
  Th.noise(2051, 4);
  // marks on the bare skin of the back of the thigh (the left leg is the +x side: the sheet's right-hand half is the left leg's, but both legs share it, so the marks are mirrored by cheek in the legs' own UVs)
  const skinRows = []; for (let y = 0; y < rows; y++) if (colourAt(Math.max(0, unit(y))) === 'skin' && (!tunic || down)) skinRows.push(y);
  const markSheet = (sheet, m, rows_, x0, x1, seed) => {
    if (m <= 0.01) return; const r = seedRand(seed);
    for (const y of rows_) for (let x = x0; x < x1; x++) {
      const jit = 0.6 + 0.8 * r();
      sheet.ctx.fillStyle = `rgba(226,112,104,${Math.min(0.5, 0.5 * Math.sqrt(m) * jit)})`; sheet.ctx.fillRect(sheet.x + x, sheet.y + y, 1, 1);
      sheet.ctx.fillStyle = `rgba(150,26,30,${Math.min(0.75, 0.75 * m * m * jit)})`; sheet.ctx.fillRect(sheet.x + x, sheet.y + y, 1, 1);
    }
  };
  const mAvg = (marks.L + marks.R) / 2;
  markSheet(Th, mAvg, skinRows, 0, 8, 17); markSheet(Th, mAvg, skinRows, 24, 32, 19);
  // shin: trousers (outdoor), bare (tunics)
  if (!tunic) { Sh.fill(c.trousers); Sh.rect(0, 0, 32, 1, c.trousersDk); if (outfit === 'Fine') { Sh.rect(7, 0, 1, 14, c.stitch); Sh.rect(24, 0, 1, 14, c.stitch); } Sh.rect(0, 14, 32, 10, c.boot); Sh.rect(0, 14, 32, 1, c.bootHi); Sh.noise(2053, 4); }
  else { Sh.fill(c.skin); Sh.rect(0, 0, 32, 3, c.skinHi); Sh.rect(0, 14, 32, 3, c.skinHi); Sh.rect(0, 20, 32, 4, c.skinSh); for (let i = 0; i < 14; i++) Sh.px(Math.floor(rnd() * 32), 3 + Math.floor(rnd() * 14), c.skinSh); Sh.noise(2053, 3); }
}

// The lower part of the pelvis (below the shirt-tail): what he wears on his hips, which at the back is the same as the seat's, so the two always match. The back is the sheet's two ends.
function paintPelvis(Pv, outfit, down, dd, marks) {
  const { c, T } = palFor(outfit), tunic = !!T, what = !down ? 'trousers' : !dd ? 'drawers' : 'skin';
  const col = { trousers: c.trousers, drawers: c.drawers, skin: c.seat }[what], seam = { trousers: c.trousersDk, drawers: c.drawersSh, skin: c.seatSh }[what];
  const front = down ? (tunic ? T.base : c.linen) : c.trousers;
  Pv.rect(0, 6, 48, 10, front); if (!down) Pv.rect(23, 7, 2, 9, c.trousersDk); else Pv.rect(0, 6, 48, 1, tunic ? T.dk : c.linenSh);
  for (const [x0, x1] of [[0, 15], [33, 48]]) { Pv.rect(x0, 6, x1 - x0, 10, col); }
  Pv.rect(0, 6, 1, 10, seam); Pv.rect(47, 6, 1, 10, seam);
  Pv.noise(2024, 4);
  if (what === 'skin') for (const [m, x0, x1, seed] of [[marks.L, 0, 7, 11], [marks.R, 41, 48, 13]]) {       // (the left cheek is the +x side: the sheet's right of centre, before the wrap)
    if (m <= 0.01) continue; const r = seedRand(seed);
    for (let y = 6; y < 16; y++) for (let x = x0; x < x1; x++) { const jit = 0.6 + 0.8 * r(); Pv.ctx.fillStyle = `rgba(226,112,104,${Math.min(0.5, 0.5 * Math.sqrt(m) * jit)})`; Pv.ctx.fillRect(Pv.x + x, Pv.y + y, 1, 1); Pv.ctx.fillStyle = `rgba(150,26,30,${Math.min(0.75, 0.75 * m * m * jit)})`; Pv.ctx.fillRect(Pv.x + x, Pv.y + y, 1, 1); }
  }
}

// The seat: the colour of what he wears over it, and its bare skin takes the colour of the marks, cheek by cheek (the left cheek is the sheet's right half).
function paintSeat(Sx, outfit, down, dd, marks) {
  const { c } = palFor(outfit), what = !down ? 'trousers' : !dd ? 'drawers' : 'skin';
  const base = { trousers: c.trousers, drawers: c.drawers, skin: c.seat }[what], seam = { trousers: c.trousersDk, drawers: c.drawersSh, skin: c.seatSh }[what];
  Sx.fill(base); Sx.rect(15, 0, 2, 16, seam); Sx.rect(0, 14, 32, 2, seam);
  if (what === 'trousers' && outfit === 'Outdoor') { Sx.rect(3, 3, 5, 4, c.patch); Sx.rect(3, 3, 5, 1, c.stitch); }
  for (let y = 0; y < 16; y += 5) Sx.rect(1, y, 6, 1, what === 'skin' ? c.seat : base);
  Sx.noise(2061, 4);
  if (what === 'skin') {
    for (const [m, x0, x1, seed] of [[marks.R, 0, 16, 3], [marks.L, 16, 32, 5]]) {
      if (m <= 0.01) continue; const r = seedRand(seed);
      for (let y = 0; y < 16; y++) for (let x = x0; x < x1; x++) {
        const jit = 0.6 + 0.8 * r();
        Sx.ctx.fillStyle = `rgba(226,112,104,${Math.min(0.5, 0.5 * Math.sqrt(m) * jit)})`; Sx.ctx.fillRect(Sx.x + x, Sx.y + y, 1, 1);
        Sx.ctx.fillStyle = `rgba(150,26,30,${Math.min(0.75, 0.75 * m * m * jit)})`; Sx.ctx.fillRect(Sx.x + x, Sx.y + y, 1, 1);
      }
    }
  }
}

Object.assign(P, { makeJack, JACK_EXPR, jackExprIndex, OUTFITS: Object.assign(P.OUTFITS || {}, { jack: OUTFITS }) });
})(typeof window !== 'undefined' ? window : globalThis);
