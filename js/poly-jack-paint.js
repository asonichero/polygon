// Polygon — Jack's painters: his face (redrawn for each expression as vector shapes on the flat plate), hair, clothes for each outfit, bare skin and the marks. See js/poly-jack.js.
(function (root) {
'use strict';
const P = root.Poly, K = P.Paint, J = P.JackPaint, clamp = P.clamp, { rgba, mix, shade, blob, ellipse, line, curve, taper, grad, grain, strands, stitches, flush, rrect } = K;

const C = {
  skin: '#f7c4a1', skinHi: '#fcd9bd', skinSh: '#e9a283', skinDk: '#cf7e63', blush: '#f58f86', stub: '#7a5a4c',
  lip: '#dc7a70', lipDk: '#9c4146', teeth: '#fffaf0', mouthIn: '#5a1d26', tongue: '#e9737c',
  hair: '#b8662f', hairHi: '#eaa04a', hairDk: '#7d3d1c', brow: '#6e3718',
  iris: '#52b070', irisHi: '#a4eab0', irisDk: '#1f6a46', pupil: '#0e1e17', white: '#fffaf2', lash: '#3a2016',
  linen: '#f8f0da', linenSh: '#e0d3b2', linenDk: '#c2b28c', vest: '#4fa04f', vestDk: '#2e6b39', vestHi: '#86cf74', gold: '#f3c649', goldDk: '#b9852a', goldHi: '#fff0a0',
  belt: '#6f4527', beltHi: '#9a6638', brass: '#f4c74b', pouch: '#8a5a32',
  trousers: '#8f6038', trousersDk: '#6a4326', trousersHi: '#b98050', patch: '#a77a4a', stitch: '#4e3118',
  boot: '#5e3b22', bootHi: '#8f5d36', bootDk: '#3a2314', sole: '#2a1a10', lace: '#e6d2a0',
  drawers: '#f4ecd6', drawersSh: '#d8cba8', seat: '#f9c8a6', seatSh: '#e8a283',
};
function palFor(outfit) {
  const c = Object.assign({}, C);
  if (outfit === 'Fine') Object.assign(c, { linen: '#fff6e0', linenSh: '#e6dabc', vest: '#2f7a4c', vestDk: '#1b4a2f', vestHi: '#55b073', belt: '#3a2416', beltHi: '#6a4428', brass: '#ffd45a', trousers: '#5a4230', trousersDk: '#3a281c', trousersHi: '#85624a', stitch: '#e0b552',
    boot: '#3a2416', bootHi: '#6a4428', bootDk: '#22140c', lace: '#e8c25a' });
  const T = outfit === 'Day' ? { base: '#8dc27a', dk: '#5f9a55', hi: '#b6e39c', wood: '#8a5a2e', woodHi: '#d29a5e', shorts: '#c8ad7a', shortsDk: '#a08850', len: 3.4 }
    : outfit === 'Soft' ? { base: '#9db8e6', dk: '#6f8ec9', hi: '#c6d9f6', wood: '#6a7fb6', woodHi: '#dbe6fa', shorts: '#86a4d6', shortsDk: '#6485bd', len: 2.4 } : null;
  if (T) { c.trousers = T.shorts; c.trousersDk = T.shortsDk; c.trousersHi = shade(T.shorts, 1.15); }
  return { c, T };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The face. The plate is 352 x 384 and shows x from -3.1 to 3.1 and y from 7.5 (top) down to 0.8 (the chin): about 57 px to the unit both ways.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const S_ = 57, FX = W => x => (0.5 + x / 6.2) * W, FY = H => y => (7.5 - y) / 6.7 * H;
const Fc = P.Face, FACE_PAL = { s: S_, eyeScale: 0.9, white: C.white, iris: C.iris, irisHi: C.irisHi, irisDk: C.irisDk, pupil: C.pupil, lash: C.lash, brow: C.brow, browHi: '#c07a42', skinDk: C.skinDk, lip: C.lip, lipDk: C.lipDk, teeth: C.teeth, mouthIn: C.mouthIn, tongue: C.tongue };
const eye = (c, X0, Y0, side, o) => Fc.eye(c, X0, Y0, side, o, FACE_PAL), brow = (c, X0, Y0, side, a, b, d, th) => Fc.brow(c, X0, Y0, side, a, b, d, th, FACE_PAL), mouth = (c, X0, Y0, m) => Fc.mouth(c, X0, Y0, m, FACE_PAL);

J.paintFace = function (sh, ex, blushOn) {
  sh.draw((c, W, H) => {
    const X = FX(W), Y = FY(H), s = S_;
    // skin: light across the brow, warmer toward the chin; the cheeks and jaw turning away at the sides
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinHi], [0.3, C.skin], [0.78, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H);
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba(C.skinDk, 0.5)], [0.1, rgba(C.skinSh, 0.25)], [0.2, rgba(C.skinSh, 0)], [0.8, rgba(C.skinSh, 0)], [0.9, rgba(C.skinSh, 0.25)], [1, rgba(C.skinDk, 0.5)]]); c.fillRect(0, 0, W, H);
    blob(c, X(0), Y(6.4), 2.0 * s, 0.8 * s, C.skinHi, 0.55, 0.2);                       // the forehead's light
    for (const sg of [-1, 1]) {
      blob(c, X(sg * 1.95), Y(3.2), 0.95 * s, 0.7 * s, C.blush, blushOn ? 0.7 : 0.32, 0.1);        // the cheeks
      blob(c, X(sg * 1.3), Y(4.5), 1.1 * s, 0.6 * s, '#c07a88', 0.18, 0.1);               // the hollow of the eye socket
    }
    // hair across the top, down the temples, as far as the hairline
    const hl = [[X(-3.2), Y(3.9)], [X(-2.9), Y(4.9)], [X(-2.1), Y(5.55)], [X(-1.0), Y(6.0)], [X(0), Y(6.15)], [X(1.0), Y(6.0)], [X(2.1), Y(5.55)], [X(2.9), Y(4.9)], [X(3.2), Y(3.9)]];
    c.fillStyle = grad(c, 0, 0, 0, Y(6.0), [[0, C.hairDk], [1, C.hair]]); curve(c, [[-10, -10], ...hl, [W + 10, Y(3.9)], [W + 10, -10]]); c.fill();
    // stubble: a soft shadow over the jaw and above the lip, and a little grain on it
    c.save(); c.globalAlpha = 1; blob(c, X(0), Y(1.5), 2.5 * s, 1.45 * s, C.stub, 0.42, 0.4); blob(c, X(0), Y(2.95), 1.4 * s, 0.4 * s, C.stub, 0.3, 0.2); c.restore();
    c.save(); c.beginPath(); c.ellipse(X(0), Y(1.6), 2.6 * s, 1.5 * s, 0, 0, Math.PI * 2); c.clip(); grain(c, 0, Y(2.9), W, H, 41, 0.6, '#ffffff', '#4a3028', 2); c.restore();
    // nose: its shadow and light on the plate (the nose itself is geometry)
    blob(c, X(0), Y(3.05), 0.85 * s, 0.32 * s, C.skinDk, 0.3, 0.2); for (const sg of [-1, 1]) blob(c, X(sg * 0.42), Y(3.2), 0.2 * s, 0.14 * s, C.skinDk, 0.7, 0.1);
    blob(c, X(0), Y(4.0), 0.22 * s, 1.0 * s, C.skinHi, 0.5, 0.3);
    // expression
    const E = [
      { eye: { up: 0.62, low: -0.46 }, brow: [0.02, 0.14, -0.02], mouth: { w: 1.15, yc: 0.16, yu: -0.12, yl: -0.46, dimples: true } },                                        // grin
      { eye: { up: 0.12, low: -0.18, tilt: -0.04, drop: -0.04 }, brow: [0.32, 0.16, -0.18], mouth: { w: 0.9, yc: -0.12, yu: 0.0, yl: -0.12, line: true } },                         // wince
      { eye: { shut: -1 }, brow: [-0.2, 0.0, 0.2, 0.4], mouth: { w: 1.15, yc: 0.0, yu: 0.22, yl: -0.34, open: true, teeth: 0.5, rows: true, lowerTeeth: 0.2 } },                  // gritted
      { eye: { shut: -1, tears: true }, brow: [0.38, 0.2, -0.2], mouth: { w: 0.95, yc: -0.05, yu: 0.4, yl: -0.95, open: true, tongue: true } },                                    // crying
      { eye: { up: 0.3, low: -0.24, look: 0.1 }, brow: [-0.02, 0.0, 0.1, 0.36], mouth: { w: 1.15, yc: 0.16, yu: -0.12, yl: -0.46, dimples: true } },                              // squint
      { eye: { up: 0.62, low: -0.46 }, brow: [0.0, 0.14, 0.02], browR: [0.18, 0.46, 0.2], mouth: { w: 1.2, yc: 0.22, yu: -0.06, yl: -0.85, open: true, teeth: 0.34, tongue: true, dimples: true } },   // cheeky
      { eye: { up: 0.62, low: -0.46, look: 0.18, drop: -0.04 }, brow: [0.36, 0.18, -0.12], mouth: { w: 0.55, yc: 0.0, yu: -0.05, yl: -0.34 } },                                      // shy
      { eye: { up: 0.4, low: -0.4 }, brow: [0.08, 0.2, 0.04], mouth: { w: 1.0, yc: 0.14, yu: -0.1, yl: -0.4, dimples: true } },                                                    // smile
    ][ex];
    const ey = Y(4.45), exx = 1.34;
    for (const sg of [-1, 1]) eye(c, X(sg * exx), ey, sg, E.eye);
    const bs = E.brow, bR = E.browR || E.brow;
    brow(c, X(-exx), Y(4.45 + 0.92), -1, bs[0], bs[1], bs[2], 0.4); brow(c, X(exx), Y(4.45 + 0.92), 1, bR[0], bR[1], bR[2], 0.4);
    mouth(c, X(0), Y(2.3), E.mouth);
  });
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Everything that does not change with the face
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// the angle round the head, 0 at the front, for a column of the shell (it runs 240 degrees from Jack's left, round the back, to his right)
const shellAngle = u => { let t = Math.PI / 3 + (4 * Math.PI / 3) * u; if (t > Math.PI) t -= 2 * Math.PI; return Math.abs(t); };
J.paintStatic = function (S, outfit, rows) {
  const { c: C_, T } = palFor(outfit), tunic = !!T, HEAD = P.HEAD_JACK;
  S.ear.draw((c, W, H) => { c.fillStyle = grad(c, 0, 0, W, 0, [[0, C.skinSh], [0.5, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H); blob(c, W / 2, H * 0.55, W * 0.34, H * 0.34, C.skinDk, 0.55, 0.3); blob(c, W / 2, H * 0.16, W * 0.3, H * 0.1, C.skinHi, 0.7, 0.2); });
  // trim swatches (4 px each): belt, buckle, buckle shine, pouch, sole, boot brass, dark, skin, skin light, skin shade
  S.trim.draw((c, W, H) => { [C_.belt, C_.brass, C_.goldHi, C_.pouch, C_.sole, C_.brass, C_.bootDk, C.skin, C.skinHi, C.skinSh].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * 4, 0, 4, H); }); });
  // hair: a chestnut with a bright band of light, darker at the root and toward the nape, with strands running the length of each lock
  S.hair.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.hairDk], [0.22, C.hair], [0.38, C.hairHi], [0.55, C.hair], [1, C.hairDk]]); c.fillRect(0, 0, W, H);
    strands(c, 0, 0, W, H, 9, 260, C.hairHi, 0.5); strands(c, 0, 0, W, H, 13, 220, C.hairDk, 0.5);
    c.fillStyle = grad(c, 0, H * 0.28, 0, H * 0.42, [[0, rgba('#fff0b0', 0)], [0.5, rgba('#fff0b0', 0.4)], [1, rgba('#fff0b0', 0)]]); c.fillRect(0, H * 0.25, W, H * 0.2);
  });
  // the shell of the head: skin below the hairline, chestnut above it, an ear's worth of shade behind the temple
  S.shell.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.hairDk], [0.4, C.hair], [1, C.hairDk]]); c.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 2) { const a = shellAngle(x / W), yb = P.hairline(HEAD, a), row = (HEAD.top - yb) / (HEAD.top - HEAD.faceY0) * H;
      c.fillStyle = grad(c, 0, row, 0, H, [[0, rgba(C.skinSh, 1)], [0.2, C.skin], [1, C.skinSh]]); c.fillRect(x, row, 2.5, H - row);
      c.fillStyle = rgba(C.hairDk, 0.55); c.fillRect(x, row - 3, 2.5, 3); }
    strands(c, 0, 0, W, H * 0.6, 21, 120, C.hairHi, 0.45);
  });
  S.neck.draw((c, W, H) => { c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinSh], [0.4, C.skin], [1, C.skinHi]]); c.fillRect(0, 0, W, H); blob(c, W / 2, 6, W * 0.35, 14, C.skinDk, 0.4, 0.2); });
  // torso (448 x 224; the front is the middle column): the shirt under the jerkin, or a tunic
  S.torso.draw((c, W, H) => {
    const mx = W / 2;
    if (!tunic) {
      c.fillStyle = grad(c, 0, 0, 0, H, [[0, C_.linen], [1, C_.linenSh]]); c.fillRect(0, 0, W, H);
      // the open collar and the placket with its laces
      c.fillStyle = grad(c, 0, 0, 0, 60, [[0, C.skinSh], [1, C.skin]]); c.beginPath(); c.moveTo(mx - 30, 0); c.quadraticCurveTo(mx - 14, 50, mx, 62); c.quadraticCurveTo(mx + 14, 50, mx + 30, 0); c.closePath(); c.fill();
      c.strokeStyle = rgba(C_.linenDk, 0.9); c.lineWidth = 2; c.beginPath(); c.moveTo(mx - 31, 0); c.quadraticCurveTo(mx - 15, 52, mx, 64); c.quadraticCurveTo(mx + 15, 52, mx + 31, 0); c.stroke();
      for (let i = 0; i < 5; i++) { const y = 22 + i * 17, w2 = 14 - i * 1.4; c.strokeStyle = C.lace; c.lineWidth = 2.2; c.beginPath(); c.moveTo(mx - w2, y); c.lineTo(mx + w2, y + 14); c.moveTo(mx + w2, y); c.lineTo(mx - w2, y + 14); c.stroke(); ellipse(c, mx - w2, y, 2.6, 2.6, C_.linenDk); ellipse(c, mx + w2, y, 2.6, 2.6, C_.linenDk); }
      c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba(C_.linenDk, 0.4)], [0.2, rgba(C_.linenDk, 0)], [0.8, rgba(C_.linenDk, 0)], [1, rgba(C_.linenDk, 0.4)]]); c.fillRect(0, 0, W, H);
      strands(c, 0, 70, W, H, 5, 150, C_.linenDk, 0.35);
    } else {
      c.fillStyle = grad(c, 0, 0, 0, H, [[0, T.hi], [0.35, T.base], [1, T.dk]]); c.fillRect(0, 0, W, H);
      c.fillStyle = C.skin; c.beginPath(); c.moveTo(mx - 62, 0); c.quadraticCurveTo(mx - 50, 46, mx, 52); c.quadraticCurveTo(mx + 50, 46, mx + 62, 0); c.closePath(); c.fill();     // a round neckline
      c.strokeStyle = T.dk; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 62, 0); c.quadraticCurveTo(mx - 50, 46, mx, 52); c.quadraticCurveTo(mx + 50, 46, mx + 62, 0); c.stroke();
      if (outfit === 'Day') { c.fillStyle = rgba(T.dk, 0.7); c.fillRect(mx - 7, 52, 14, H); for (let i = 0; i < 5; i++) { const y = 70 + i * 30; ellipse(c, mx, y, 5.5, 5.5, T.wood); ellipse(c, mx - 1.5, y - 1.5, 2.2, 2.2, T.woodHi); } }
      else { c.fillStyle = T.hi; rrect(c, mx - 64, 110, 56, 44, 8); c.fill(); c.strokeStyle = T.dk; c.lineWidth = 2.5; rrect(c, mx - 64, 110, 56, 44, 8); c.stroke(); stitches(c, mx - 58, 124, mx - 14, 124, 5, 4, 1.8, T.dk); }
      strands(c, 0, 0, W, H, 7, 160, T.dk, 0.3); strands(c, 0, 0, W, H, 8, 120, T.hi, 0.35);
      c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba(T.dk, 0.35)], [0.18, rgba(T.dk, 0)], [0.82, rgba(T.dk, 0)], [1, rgba(T.dk, 0.35)]]); c.fillRect(0, 0, W, H);
    }
  });
  // the jerkin (448 x 160: the opening at both ends, the back in the middle): leather-green with piping, stitching, a back seam and rivets
  S.vest.draw((c, W, H) => {
    const fine = outfit === 'Fine';
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C_.vestHi], [0.25, C_.vest], [1, C_.vestDk]]); c.fillRect(0, 0, W, H);
    strands(c, 0, 0, W, H, 3, 220, C_.vestDk, 0.3); strands(c, 0, 0, W, H, 4, 160, C_.vestHi, 0.3);
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba(C_.vestDk, 0.45)], [0.07, rgba(C_.vestDk, 0)], [0.93, rgba(C_.vestDk, 0)], [1, rgba(C_.vestDk, 0.45)]]); c.fillRect(0, 0, W, H);
    const pipe = fine ? C_.gold : C_.vestDk;
    for (const e of [[6, 1], [W - 6, -1]]) { line(c, e[0], 0, e[0], H, fine ? 7 : 8, pipe, 'butt'); line(c, e[0] + e[1] * 11, 0, e[0] + e[1] * 11, H, 2, rgba(C_.stitch, fine ? 0.5 : 0.8)); stitches(c, e[0] + e[1] * 18, 4, e[0] + e[1] * 18, H - 4, 8, 5, 2, rgba(fine ? C_.goldHi : '#e9dca0', 0.8)); }
    line(c, 0, H - 4, W, H - 4, 8, pipe, 'butt'); line(c, 0, 5, W, 5, 7, pipe, 'butt');
    line(c, W / 2, 6, W / 2, H - 6, 3, rgba(C_.vestDk, 0.9)); stitches(c, W / 2 + 9, 8, W / 2 + 9, H - 8, 7, 5, 2, rgba('#e9dca0', 0.6)); stitches(c, W / 2 - 9, 8, W / 2 - 9, H - 8, 7, 5, 2, rgba('#e9dca0', 0.6));
    for (const x of [30]) for (let i = 0; i < 5; i++) { const y = 14 + i * 24; ellipse(c, x, y, 5.5, 5.5, C_.brass); ellipse(c, x - 1.5, y - 1.5, 2.4, 2.4, C_.goldHi); c.strokeStyle = shade(C_.goldDk, 1); c.lineWidth = 1.5; ellipse(c, x, y, 5.5, 5.5); c.stroke(); }
    if (fine) for (let i = 0; i < 9; i++) { const x = 120 + i * 24; c.strokeStyle = rgba(C_.gold, 0.75); c.lineWidth = 2; c.beginPath(); c.moveTo(x, H - 20); c.quadraticCurveTo(x + 6, H - 34, x + 12, H - 20); c.stroke(); }
  });
  // arms: the sleeve (or the tunic's), rolled at the elbow; the forearm with its leather wrist-wrap
  S.arm.draw((c, W, H) => {
    const base = tunic ? T.base : C_.linen, dk = tunic ? T.dk : C_.linenSh, hi = tunic ? T.hi : '#ffffff';
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, hi], [0.3, base], [0.8, dk], [0.82, base]]); c.fillRect(0, 0, W, H);
    c.fillStyle = grad(c, 0, H * 0.74, 0, H * 0.84, [[0, rgba(dk, 0)], [1, rgba(dk, 0.9)]]); c.fillRect(0, H * 0.74, W, H * 0.1);
    c.fillStyle = C.skin; c.fillRect(0, H * 0.86, W, H * 0.14); line(c, 0, H * 0.86, W, H * 0.86, 3, rgba(C.skinDk, 0.6), 'butt');
    strands(c, 0, 0, W, H * 0.8, 11, 90, dk, 0.4); c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba(dk, 0.35)], [0.2, rgba(dk, 0)], [0.8, rgba(dk, 0)], [1, rgba(dk, 0.35)]]); c.fillRect(0, 0, W, H * 0.85);
  });
  S.fore.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skin], [0.7, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H);
    for (const x of [W * 0.25, W * 0.75]) blob(c, x, H * 0.4, 14, 40, C.skinSh, 0.25, 0.2);
    strands(c, 0, 0, W, H * 0.6, 17, 40, C.skinSh, 0.35);
    if (!tunic) { const y0 = H * 0.55, y1 = H * 0.82; c.fillStyle = grad(c, 0, y0, 0, y1, [[0, C_.beltHi], [1, C_.belt]]); c.fillRect(0, y0, W, y1 - y0); line(c, 0, y0, W, y0, 2.5, rgba('#000', 0.35), 'butt'); line(c, 0, y1, W, y1, 2.5, rgba('#000', 0.35), 'butt'); stitches(c, 0, (y0 + y1) / 2, W, (y0 + y1) / 2, 7, 5, 1.6, rgba('#e9c98a', 0.7)); c.fillStyle = C_.brass; rrect(c, W / 2 - 9, y0 + 3, 18, y1 - y0 - 6, 3); c.fill(); c.strokeStyle = C_.goldDk; c.lineWidth = 1.8; rrect(c, W / 2 - 9, y0 + 3, 18, y1 - y0 - 6, 3); c.stroke(); }
  });
  for (const hd of [S.handL, S.handR]) hd.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinSh], [0.25, C.skin], [1, C.skinHi]]); c.fillRect(0, 0, W, H);
    for (const x of [W * 0.25, W * 0.75]) for (let i = 1; i < 4; i++) line(c, x - 14 + i * 9, H * 0.55, x - 14 + i * 9, H, 1.6, rgba(C.skinDk, 0.55));    // the fingers, parted along the palm and the back of the hand
    for (const x of [W * 0.25, W * 0.75]) { line(c, x - 14, H * 0.5, x + 14, H * 0.5, 1.4, rgba(C.skinDk, 0.35)); }
    strands(c, 0, 0, W, H * 0.4, 6, 30, C.skinSh, 0.3);
  });
  // boots (outdoor): leather with a cuff, laces and a sole; bare feet (the tunics): skin, toes
  S.boot.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C_.bootHi], [0.4, C_.boot], [1, C_.bootDk]]); c.fillRect(0, 0, W, H);
    c.fillStyle = C_.bootHi; c.fillRect(0, 0, W, 9); line(c, 0, 10, W, 10, 2.5, C_.bootDk, 'butt'); stitches(c, 0, 14, W, 14, 8, 5, 2, rgba('#e8c98a', 0.7));
    for (let i = 0; i < 4; i++) { const y = 22 + i * 14; c.strokeStyle = C_.lace; c.lineWidth = 2.5; c.beginPath(); c.moveTo(W / 2 - 14, y); c.lineTo(W / 2 + 14, y + 11); c.moveTo(W / 2 + 14, y); c.lineTo(W / 2 - 14, y + 11); c.stroke(); ellipse(c, W / 2 - 14, y, 2.6, 2.6, '#2a1a10'); ellipse(c, W / 2 + 14, y, 2.6, 2.6, '#2a1a10'); }
    if (outfit === 'Fine') { c.fillStyle = C_.brass; rrect(c, W / 2 - 16, 5, 32, 14, 3); c.fill(); }
    strands(c, 0, 0, W, H, 4, 70, C_.bootDk, 0.35);
  });
  S.shoe.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C_.bootHi], [0.5, C_.boot], [1, C_.bootDk]]); c.fillRect(0, 0, W, H);
    c.fillStyle = C_.sole; c.fillRect(W * 0.3, 0, W * 0.4, H); c.fillStyle = grad(c, 0, 0, 0, H, [[0, rgba('#fff', 0.08)], [1, rgba('#000', 0.2)]]); c.fillRect(W * 0.3, 0, W * 0.4, H);
    line(c, 0, H * 0.18, W, H * 0.18, 2.5, rgba('#000', 0.35), 'butt'); strands(c, 0, 0, W, H, 8, 60, C_.bootDk, 0.3);
  });
  S.foot.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinHi], [1, C.skin]]); c.fillRect(0, 0, W, H);
    c.fillStyle = rgba(C.skinSh, 0.8); c.fillRect(W * 0.3, 0, W * 0.4, H);
    for (const x of [W * 0.06, W * 0.14, W * 0.2, W * 0.86, W * 0.94]) { line(c, x, 0, x, H * 0.22, 1.8, rgba(C.skinDk, 0.55)); }
    for (const x of [0.0, 0.1, 0.18, 0.88, 0.96]) ellipse(c, W * x, 5, 5, 4, rgba(C.skinHi, 0.7));
  });
  S.hem.draw((c, W, H) => { const base = T ? T.base : C_.linen; c.fillStyle = grad(c, 0, 0, 0, H, [[0, base], [1, T ? T.dk : C_.linenSh]]); c.fillRect(0, 0, W, H); c.fillStyle = T ? T.dk : C_.linenSh; c.fillRect(0, H * 0.6, W, H * 0.4); stitches(c, 0, H * 0.55, W, H * 0.55, 8, 5, 2, rgba('#ffffff', 0.4)); });
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The parts that depend on what he has on: legs, pelvis and seat
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// which garment lies at a distance d down the thigh from the hip
const garmentAt = (down, dd, d) => !down ? 'trousers' : d < 2 ? (dd ? 'skin' : 'drawers') : d < 4 ? 'drawers' : 'trousers';
J.paintLegs = function (S, outfit, down, dd, marks, rows) {
  const { c: C_, T } = palFor(outfit), tunic = !!T;
  S.thigh.draw((c, W, H) => {
    // rows of the sheet run from the hip (0) down the thigh (6.7 units over H px)
    const unit = py => -rows.thighY(py);                                          // (how far below the hip joint a row of the sheet is)
    for (let y = 0; y < H; y += 2) {
      const d = Math.max(0, unit(y)); let what = garmentAt(down, dd, d); if (tunic && !down && d > T.len) what = 'skin';
      const base = what === 'skin' ? C.skin : what === 'drawers' ? C.drawers : C_.trousers, hi = what === 'skin' ? C.skinHi : what === 'drawers' ? '#ffffff' : C_.trousersHi;
      c.fillStyle = grad(c, 0, 0, W, 0, [[0, shade(base, 0.82)], [0.25, base], [0.5, hi], [0.75, base], [1, shade(base, 0.82)]]); c.fillRect(0, y, W, 2.5);
    }
    if (!tunic) {
      if (outfit === 'Fine') { for (const x of [W * 0.25, W * 0.75]) line(c, x, 0, x, H - 20, 3.5, C_.stitch); }
      else { c.fillStyle = C_.patch; rrect(c, W * 0.46, H * 0.2, 40, 34, 4); c.fill(); c.strokeStyle = C_.stitch; c.lineWidth = 2; c.setLineDash([6, 4]); rrect(c, W * 0.46, H * 0.2, 40, 34, 4); c.stroke(); c.setLineDash([]); }
      strands(c, 0, 0, W, H, 12, 90, C_.trousersDk, 0.3);
      if (down) { for (let y = H * 0.78; y < H; y += 8) line(c, 0, y, W, y, 3.5, rgba(C_.trousersDk, 0.8), 'butt'); }
    } else if (!down) { line(c, 0, H * 0.9, W, H * 0.9, 3, rgba(C.skinDk, 0.35), 'butt'); strands(c, 0, 0, W, H, 12, 40, C.skinSh, 0.3); }
    c.fillStyle = (tunic && !down) ? C.skinSh : C_.trousersDk; c.fillRect(0, H - 14, W, 14);
    // the bare skin of the back of the thigh (the sheet's two ends) takes the colour of the marks
    if (!tunic || down) { const skinRows = []; for (let y = 0; y < H; y += 2) if (garmentAt(down, dd, Math.max(0, unit(y))) === 'skin') skinRows.push(y); if (skinRows.length) { const y0 = skinRows[0], y1 = skinRows[skinRows.length - 1] + 3, m = (marks.L + marks.R) / 2; flush(c, 0, y0, W * 0.2, y1 - y0, m, 17); flush(c, W * 0.8, y0, W * 0.2, y1 - y0, m, 19); } }
  });
  S.shin.draw((c, W, H) => {
    if (!tunic) {
      c.fillStyle = grad(c, 0, 0, W, 0, [[0, shade(C_.trousers, 0.82)], [0.25, C_.trousers], [0.5, C_.trousersHi], [0.75, C_.trousers], [1, shade(C_.trousers, 0.82)]]); c.fillRect(0, 0, W, H);
      if (outfit === 'Fine') for (const x of [W * 0.25, W * 0.75]) line(c, x, 0, x, H, 3.5, C_.stitch);
      c.fillStyle = C_.boot; c.fillRect(0, H * 0.5, W, H * 0.5); strands(c, 0, 0, W, H * 0.5, 14, 60, C_.trousersDk, 0.3);
    } else {
      c.fillStyle = grad(c, 0, 0, W, 0, [[0, C.skinSh], [0.3, C.skin], [0.5, C.skinHi], [0.7, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H);
      c.fillStyle = grad(c, 0, H * 0.7, 0, H, [[0, rgba(C.skinSh, 0)], [1, rgba(C.skinSh, 0.8)]]); c.fillRect(0, H * 0.7, W, H * 0.3); strands(c, 0, 0, W, H, 16, 50, C.skinSh, 0.3);
    }
  });
};
J.paintPelvis = function (Pv, outfit, down, dd, marks, rows) {
  const { c: C_, T } = palFor(outfit), tunic = !!T, what = !down ? 'trousers' : !dd ? 'drawers' : 'skin';
  const col = { trousers: C_.trousers, drawers: C.drawers, skin: C.seat }[what], tail = tunic ? T.base : C_.linen, tailDk = tunic ? T.dk : C_.linenSh;
  Pv.draw((c, W, H) => {
    const yb = rows.pelvis(1.0) * H, front = down ? tail : C_.trousers;       // (the shirt-tail ends a unit above the hips)
    c.fillStyle = grad(c, 0, yb, 0, H, [[0, shade(front, 1.0)], [1, shade(front, 0.85)]]); c.fillRect(0, yb, W, H - yb);
    if (!down) { c.fillStyle = grad(c, 0, yb, W, yb, [[0, shade(front, 0.85)], [0.5, C_.trousersHi], [1, shade(front, 0.85)]]); c.fillRect(0, yb, W, H - yb); line(c, W / 2, yb, W / 2, H, 3, rgba(C_.trousersDk, 0.8), 'butt'); }
    c.fillStyle = grad(c, 0, yb, 0, H, [[0, shade(col, 1.0)], [1, shade(col, 0.88)]]);
    for (const [x0, x1] of [[0, W * 0.3], [W * 0.7, W]]) c.fillRect(x0, yb, x1 - x0, H - yb);
    // the shirt-tail over the hips: a clean, gently scalloped hem
    c.fillStyle = grad(c, 0, 0, 0, yb, [[0, tail], [1, tailDk]]); c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, yb); for (let x = W; x >= 0; x -= 8) c.lineTo(x, yb + 2 * Math.sin(x * 0.09)); c.closePath(); c.fill();
    line(c, 0, yb + 1, W, yb + 1, 2, rgba(tailDk, 0.9), 'butt');
    strands(c, 0, 0, W, yb, 6, 50, tunic ? T.dk : C_.linenDk, 0.3);
    if (what === 'skin') for (const [m, x0, x1, seed] of [[marks.L, 0, W * 0.12, 11], [marks.R, W * 0.88, W, 13]]) flush(c, x0, yb, x1 - x0, H - yb, m, seed);
  });
};
J.paintSeat = function (Sx, outfit, down, dd, marks) {
  const { c: C_ } = palFor(outfit), what = !down ? 'trousers' : !dd ? 'drawers' : 'skin';
  const base = { trousers: C_.trousers, drawers: C.drawers, skin: C.seat }[what], hi = { trousers: C_.trousersHi, drawers: '#ffffff', skin: '#fddcc4' }[what], seam = { trousers: C_.trousersDk, drawers: C.drawersSh, skin: C.seatSh }[what];
  Sx.draw((c, W, H) => {
    for (const x0 of [0, W / 2]) { c.fillStyle = grad(c, x0, 0, x0 + W / 2, 0, [[0, shade(base, 0.86)], [0.5, hi], [1, shade(base, 0.86)]]); c.fillRect(x0, 0, W / 2, H); }
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, rgba('#fff', 0)], [1, rgba(seam, 0.55)]]); c.fillRect(0, 0, W, H);
    line(c, W / 2, 0, W / 2, H, 5, rgba(seam, 0.9), 'butt'); strands(c, 0, 0, W, H, 3, 60, seam, 0.25);
    if (what === 'trousers' && outfit === 'Outdoor') { c.fillStyle = C_.patch; rrect(c, 30, 24, 40, 32, 4); c.fill(); c.strokeStyle = C_.stitch; c.lineWidth = 2; c.setLineDash([6, 4]); rrect(c, 30, 24, 40, 32, 4); c.stroke(); c.setLineDash([]); }
    if (what === 'skin') { flush(c, 0, 0, W / 2, H, marks.R, 3); flush(c, W / 2, 0, W / 2, H, marks.L, 5); }
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
