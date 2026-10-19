// Polygon — Red's painters: her face (redrawn for each expression as vector shapes on the flat plate), hair and braids, the tunic, trousers, boots and bracers, and the Starweave Mantle. See js/poly-red.js.
(function (root) {
'use strict';
const P = root.Poly, K = P.Paint, J = P.RedPaint, clamp = P.clamp, { rgba, mix, shade, blob, ellipse, line, curve, taper, grad, grain, strands, stitches, rrect, rnd } = K;

const C = {
  skin: '#f6c9a6', skinHi: '#fddcc0', skinSh: '#e8a888', skinDk: '#cc8266', blush: '#f4908a', freckle: '#c98258',
  lip: '#d9737c', lipDk: '#9a424e', teeth: '#fffaf0', mouthIn: '#5a1d26', tongue: '#e9737c',
  hair: '#935030', hairHi: '#d28a4e', hairDk: '#5a2e18', brow: '#6a3a20',
  iris: '#a56a30', irisHi: '#ecbb70', irisDk: '#5c3416', pupil: '#1a0f08', white: '#fffaf2', lash: '#3a2014',
  tunic: '#2f6e40', tunicHi: '#4c9a5a', tunicDk: '#1d4a2b', shirt: '#f2e8cf', shirtDk: '#d6c69c', stitch: '#e6d6a4',
  trousers: '#cbb784', trousersHi: '#e5d4a8', trousersDk: '#a2915c',
  boot: '#7c4a28', bootHi: '#a76c3c', bootDk: '#4a2a16', sole: '#2a1a10', lace: '#e8d4a0',
  leather: '#8e5a30', leatherHi: '#b8804a', leatherDk: '#5c3a1e', belt: '#6a4326', brass: '#f2c64a', pouch: '#8a5a32',
  cape: '#d3202f', capeHi: '#f0475a', capeDk: '#8c111f', gold: '#f6c545', goldHi: '#fff3a8', goldDk: '#b8861c',
  ribbon: '#d92b3a', ribbonDk: '#8f1624',
};

// A row of soft vertical folds down a sheet, so flat colour reads as cloth that hangs.
function folds(c, x, y, w, h, seed, n, dk, hi, a) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const cx = x + (i + 0.5 + (r() - 0.5) * 0.7) * w / n, sw = w / n * (0.3 + r() * 0.3), top = y + r() * h * 0.06;
    c.fillStyle = grad(c, cx - sw, 0, cx + sw, 0, [[0, rgba(dk, 0)], [0.42, rgba(dk, a)], [0.56, rgba(hi, a * 0.55)], [1, rgba(hi, 0)]]); c.fillRect(cx - sw, top, sw * 2, y + h - top);
  }
}
// A five-pointed star centred on (x, y): outer radius r.
function star(c, x, y, r, fill, rot) {
  c.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + (rot || 0), rr = i % 2 ? r * 0.42 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fillStyle = fill; c.fill();
}
// A gold star with a light edge and a small glint, as embroidered on the cloak.
function embroidered(c, x, y, r, rot) {
  star(c, x, y + r * 0.08, r * 1.08, rgba('#7a1018', 0.55), rot); star(c, x, y, r, C.gold, rot); star(c, x, y, r * 0.55, C.goldHi, rot);
  c.strokeStyle = C.goldDk; c.lineWidth = Math.max(0.8, r * 0.1); c.lineJoin = 'round'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + (rot || 0), rr = i % 2 ? r * 0.42 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.stroke();
  ellipse(c, x - r * 0.18, y - r * 0.22, r * 0.12, r * 0.12, 'rgba(255,255,255,0.9)'); c.fill();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The face. The plate is 352 x 384 and shows x from -3.0 to 3.0 and y from 7.5 (top) down to 0.8 (the chin): about 58 px to the unit both ways.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const S_ = 58, FX = W => x => (0.5 + x / 6.0) * W, FY = H => y => (7.5 - y) / 6.7 * H;
const Fc = P.Face, FACE_PAL = { s: S_, eyeScale: 1.0, irisK: 1.06, lashK: 0.88, flick: 0.22, white: C.white, iris: C.iris, irisHi: C.irisHi, irisDk: C.irisDk, pupil: C.pupil, lash: C.lash, brow: C.brow, browHi: '#b0703e', skinDk: C.skinDk, lip: C.lip, lipDk: C.lipDk, teeth: C.teeth, mouthIn: C.mouthIn, tongue: C.tongue };
const eye = (c, X0, Y0, side, o) => Fc.eye(c, X0, Y0, side, o, FACE_PAL), brow = (c, X0, Y0, side, a, b, d, th) => Fc.brow(c, X0, Y0, side, a, b, d, th, FACE_PAL), mouth = (c, X0, Y0, m) => Fc.mouth(c, X0, Y0, m, FACE_PAL);

J.paintFace = function (sh, ex) {
  sh.draw((c, W, H) => {
    const X = FX(W), Y = FY(H), s = S_, flush = ex === 6 ? 0.78 : ex === 2 ? 0.55 : ex === 3 ? 0.2 : 0.42;
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinHi], [0.3, C.skin], [0.8, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H);
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba(C.skinDk, 0.5)], [0.1, rgba(C.skinSh, 0.25)], [0.2, rgba(C.skinSh, 0)], [0.8, rgba(C.skinSh, 0)], [0.9, rgba(C.skinSh, 0.25)], [1, rgba(C.skinDk, 0.5)]]); c.fillRect(0, 0, W, H);
    blob(c, X(0), Y(6.3), 2.0 * s, 0.8 * s, C.skinHi, 0.5, 0.2);
    for (const sg of [-1, 1]) {
      blob(c, X(sg * 1.9), Y(3.15), 1.0 * s, 0.75 * s, C.blush, flush, 0.1);                         // the cheeks
      blob(c, X(sg * 1.3), Y(4.45), 1.1 * s, 0.6 * s, '#c07a88', 0.14, 0.1);
      blob(c, X(sg * 1.3), Y(4.95), 0.9 * s, 0.22 * s, '#d98a80', 0.2, 0.1);
    }
    // hair: a fringe swept across the brow, lower at her left (the image's right), a side parting high at her right
    const hl = [[X(-3.2), Y(3.8)], [X(-3.0), Y(4.9)], [X(-2.4), Y(5.85)], [X(-1.4), Y(6.4)], [X(-0.4), Y(6.2)], [X(0.7), Y(5.7)], [X(1.7), Y(5.05)], [X(2.6), Y(4.5)], [X(3.2), Y(3.7)]];
    const hairShape = () => curve(c, [[-10, -10], ...hl, [W + 10, Y(3.7)], [W + 10, -10]]);
    c.fillStyle = grad(c, 0, 0, 0, Y(6.0), [[0, C.hairDk], [1, C.hair]]); hairShape(); c.fill();
    c.save(); hairShape(); c.clip();
    for (let i = 0; i < 40; i++) {                                                         // strands sweeping from the parting over the brow to her left
      const r = rnd(100 + i), k = i / 40, j = (r() - 0.5) * 0.2;
      const pts = [[X(-1.2 + j), Y(7.0)], [X(-0.6 + k * 1.2), Y(6.5 - k * 0.2)], [X(0.4 + k * 2.2), Y(5.8 - k * 0.7)], [X(1.2 + k * 2.0), Y(4.9 - k * 1.1)]];
      taper(c, pts, (0.1 + r() * 0.1) * s, 0.02 * s, rgba(i % 3 === 0 ? C.hairHi : C.hairDk, i % 3 === 0 ? 0.6 : 0.5), 1.1);
    }
    c.restore();
    c.strokeStyle = rgba(C.hairDk, 0.55); c.lineWidth = 2; c.beginPath(); curve(c, hl); c.stroke();
    blob(c, X(0), Y(3.05), 0.8 * s, 0.3 * s, C.skinDk, 0.24, 0.2); for (const sg of [-1, 1]) blob(c, X(sg * 0.4), Y(3.2), 0.18 * s, 0.13 * s, C.skinDk, 0.6, 0.1);
    blob(c, X(0), Y(4.0), 0.2 * s, 1.0 * s, C.skinHi, 0.5, 0.3);
    const r = rnd(7); for (let i = 0; i < 46; i++) { const sg = r() < 0.5 ? -1 : 1, px = X(sg * (0.35 + r() * 1.55)), py = Y(3.15 + r() * 0.95 - Math.abs(sg * 0.0)); ellipse(c, px, py, 1.1 + r() * 1.1, 0.9 + r() * 0.8, rgba(C.freckle, 0.35 + r() * 0.3)); c.fill(); }      // (freckles over the nose and cheeks)
    // expression: [eyes, brows (inner, middle, outer heights), mouth]
    const E = [
      { eye: { up: 0.66, low: -0.48 }, brow: [0.0, 0.26, 0.02], mouth: { w: 0.9, yc: 0.08, yu: -0.07, yl: -0.46, dimples: true } },                                                           // calm: a soft smile
      { eye: { up: 0.5, low: -0.44 }, brow: [0.06, 0.32, 0.12], mouth: { w: 1.12, yc: 0.17, yu: -0.08, yl: -0.84, open: true, teeth: 0.3, tongue: true, dimples: true } },                       // a grin
      { eye: { up: 0.5, low: -0.42, tilt: -0.03 }, brow: [0.24, 0.2, -0.1], mouth: { w: 0.5, yc: -0.08, yu: -0.02, yl: -0.34 } },                                                         // a determined pout
      { eye: { up: 0.82, low: -0.62 }, brow: [0.34, 0.52, 0.3], mouth: { w: 0.46, yc: -0.1, yu: 0.26, yl: -0.78, open: true } },                                                          // a gasp
      { eye: { up: 0.62, low: -0.46, look: 0.28, drop: -0.02 }, brow: [0.4, 0.2, -0.12], mouth: { w: 0.78, yc: -0.02, yu: -0.1, yl: -0.36, dimples: true } },                              // sheepish
      { eye: { up: 0.64, low: -0.46 }, eyeR: { shut: 1 }, brow: [0.02, 0.28, 0.06], browR: [0.1, 0.44, 0.12], mouth: { w: 1.0, yc: 0.2, yu: -0.08, yl: -0.6, open: true, teeth: 0.22, dimples: true } },   // a wink
      { eye: { up: 0.6, low: -0.44, look: 0.14, drop: -0.08 }, brow: [0.34, 0.18, -0.08], mouth: { w: 0.55, yc: 0.02, yu: -0.05, yl: -0.32 } },                                           // shy
      { eye: { shut: -1 }, brow: [0.34, 0.2, -0.16], mouth: { w: 0.9, yc: -0.08, yu: 0.1, yl: -0.34, open: true, teeth: 0.34, lowerTeeth: 0.18 } },                                       // a wince
    ][ex];
    const ey = Y(4.4), exx = 1.3;
    for (const sg of [-1, 1]) eye(c, X(sg * exx), ey, sg, (sg > 0 && E.eyeR) ? E.eyeR : E.eye);
    const bs = E.brow, bR = E.browR || E.brow;
    brow(c, X(-exx), Y(4.4 + 0.98), -1, bs[0], bs[1], bs[2], 0.17); brow(c, X(exx), Y(4.4 + 0.98), 1, bR[0], bR[1], bR[2], 0.17);
    mouth(c, X(0), Y(2.25), E.mouth);
  });
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Everything that does not change with the face
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const shellAngle = u => { let t = Math.PI / 3 + (4 * Math.PI / 3) * u; if (t > Math.PI) t -= 2 * Math.PI; return Math.abs(t); };
J.paintStatic = function (S, rows) {
  const HEAD = P.HEAD_RED, ry = y => rows.torso(y);
  S.ear.draw((c, W, H) => { c.fillStyle = grad(c, 0, 0, W, 0, [[0, C.skinSh], [0.5, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H); blob(c, W / 2, H * 0.55, W * 0.34, H * 0.34, C.skinDk, 0.45, 0.3); blob(c, W / 2, H * 0.16, W * 0.3, H * 0.1, C.skinHi, 0.7, 0.2); });
  // trim swatches (4 px each): gold, gold shine, gold shade, ribbon, ribbon dark, skin, skin light, skin shade, belt, buckle, pouch, dark
  S.trim.draw((c, W, H) => { [C.gold, C.goldHi, C.goldDk, C.ribbon, C.ribbonDk, C.skin, C.skinHi, C.skinSh, C.belt, C.brass, C.pouch, '#2a1a12'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * 4, 0, 4, H); }); });
  // hair (the locks): chestnut with a band of light and strands the length of each lock
  S.hair.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.hairDk], [0.22, C.hair], [0.38, C.hairHi], [0.58, C.hair], [1, C.hairDk]]); c.fillRect(0, 0, W, H);
    strands(c, 0, 0, W, H, 9, 240, C.hairHi, 0.55); strands(c, 0, 0, W, H, 13, 220, C.hairDk, 0.5);
    c.fillStyle = grad(c, 0, H * 0.28, 0, H * 0.42, [[0, rgba('#ffe2b8', 0)], [0.5, rgba('#ffe2b8', 0.34)], [1, rgba('#ffe2b8', 0)]]); c.fillRect(0, H * 0.25, W, H * 0.2);
  });
  S.cap.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.hairDk], [0.16, C.hair], [0.32, C.hairHi], [0.5, C.hair], [1, C.hairDk]]); c.fillRect(0, 0, W, H);
    strands(c, 0, 0, W, H, 21, 420, C.hairHi, 0.5); strands(c, 0, 0, W, H, 23, 380, C.hairDk, 0.5);
    c.fillStyle = grad(c, 0, H * 0.22, 0, H * 0.36, [[0, rgba('#ffe2b8', 0)], [0.5, rgba('#ffe2b8', 0.32)], [1, rgba('#ffe2b8', 0)]]); c.fillRect(0, H * 0.2, W, H * 0.18);
  });
  // a braid (the plaits of its chain, each on a band of the sheet): a strand crossing over, with a dark crease between the crossings
  S.braid.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, C.hairDk], [0.5, C.hair], [1, C.hairDk]]); c.fillRect(0, 0, W, H);
    for (let y = -8, i = 0; y < H + 14; y += H / 15, i++) for (let x = -16; x < W + 16; x += 32) {
      const sx = x + (i % 2 ? 16 : 0), hh = H / 15;
      taper(c, [[sx - 15, y + hh * 0.9], [sx - 1, y + hh * 0.1], [sx + 10, y + hh * 1.0]], 13, 8, shade(C.hair, 1.08), 1.1);
      taper(c, [[sx - 12, y + hh * 0.75], [sx - 1, y + hh * 0.05], [sx + 7, y + hh * 0.85]], 4, 2, rgba(C.hairHi, 0.8), 1.1);
      line(c, sx - 16, y + hh, sx + 12, y + hh, 2.4, rgba(C.hairDk, 0.9)); line(c, sx + 2, y + hh * 0.2, sx + 3, y + hh, 1.4, rgba(C.hairDk, 0.7));
    }
  });
  S.shell.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.hairDk], [0.4, C.hair], [1, C.hairDk]]); c.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 2) { const a = shellAngle(x / W), yb = P.hairline(HEAD, a), row = (HEAD.top - yb) / (HEAD.top - HEAD.faceY0) * H;
      c.fillStyle = grad(c, 0, row, 0, H, [[0, C.skinSh], [0.2, C.skin], [1, C.skinSh]]); c.fillRect(x, row, 2.5, H - row);
      c.fillStyle = rgba(C.hairDk, 0.55); c.fillRect(x, row - 3, 2.5, 3); }
    strands(c, 0, 0, W, H * 0.6, 25, 120, C.hairHi, 0.45);
  });
  S.neck.draw((c, W, H) => { c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinSh], [0.4, C.skin], [1, C.skinHi]]); c.fillRect(0, 0, W, H); blob(c, W / 2, 6, W * 0.35, 14, C.skinDk, 0.32, 0.2); });

  // ── the torso (448 x 224; the front is the middle column): a forest-green tunic with a deep scoop neck over a cream shirt, laced across the chest ──
  S.torso.draw((c, W, H) => {
    const mx = W / 2, y0 = H * ry(10.3), y1 = H * ry(9.1);
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.tunicHi], [0.35, C.tunic], [1, C.tunicDk]]); c.fillRect(0, 0, W, H);
    folds(c, 0, 0, W, H, 41, 18, C.tunicDk, C.tunicHi, 0.3); strands(c, 0, 0, W, H, 7, 160, C.tunicDk, 0.3); strands(c, 0, 0, W, H, 8, 120, C.tunicHi, 0.3);
    // the scoop: skin of the chest and throat, the cream shirt's collar round it, the lacing across
    c.fillStyle = grad(c, 0, y0, 0, y1, [[0, C.skinSh], [0.4, C.skin], [1, C.skinHi]]); c.beginPath(); c.moveTo(mx - 40, y0 - 8); c.quadraticCurveTo(mx - 28, y1 - 2, mx, y1 + 6); c.quadraticCurveTo(mx + 28, y1 - 2, mx + 40, y0 - 8); c.closePath(); c.fill();
    c.strokeStyle = C.shirt; c.lineWidth = 7; c.beginPath(); c.moveTo(mx - 42, y0 - 9); c.quadraticCurveTo(mx - 29, y1 + 3, mx, y1 + 11); c.quadraticCurveTo(mx + 29, y1 + 3, mx + 42, y0 - 9); c.stroke();
    c.strokeStyle = rgba(C.shirtDk, 0.9); c.lineWidth = 1.8; c.beginPath(); c.moveTo(mx - 46, y0 - 9); c.quadraticCurveTo(mx - 32, y1 + 8, mx, y1 + 15); c.quadraticCurveTo(mx + 32, y1 + 8, mx + 46, y0 - 9); c.stroke();
    
    for (let i = 0; i < 4; i++) { const y = y1 + 18 + i * 11, w2 = 11 - i * 1.2; c.strokeStyle = C.lace; c.lineWidth = 2; c.beginPath(); c.moveTo(mx - w2, y); c.lineTo(mx + w2, y + 10); c.moveTo(mx + w2, y); c.lineTo(mx - w2, y + 10); c.stroke(); ellipse(c, mx - w2, y, 2.2, 2.2, C.tunicDk); c.fill(); ellipse(c, mx + w2, y, 2.2, 2.2, C.tunicDk); c.fill(); }
    // soft shapes: under the bust, at the sides, the pull of the belt below
    for (const sg of [-1, 1]) { blob(c, mx + sg * 34, H * ry(6.2), 34, 12, C.tunicDk, 0.5, 0.1); blob(c, mx + sg * 150, H * ry(6.6), 34, 60, C.tunicDk, 0.4, 0.1); blob(c, mx + sg * 30, H * ry(7.7), 20, 14, C.tunicHi, 0.5, 0.1); }
    line(c, 0, H * ry(9.8), 0, H, 3, rgba(C.tunicDk, 0.8), 'butt'); line(c, W - 1, H * ry(9.8), W - 1, H, 3, rgba(C.tunicDk, 0.8), 'butt');
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba('#0f2a18', 0.32)], [0.14, rgba('#0f2a18', 0)], [0.86, rgba('#0f2a18', 0)], [1, rgba('#0f2a18', 0.32)]]); c.fillRect(0, 0, W, H);
  });
  // the tunic's waist piece (448 x 112) and the hem solids round the thighs (256 x 96): green, in soft folds, ending in a hem with a line of stitching
  S.hem.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.tunic], [0.75, C.tunic], [1, C.tunicDk]]); c.fillRect(0, 0, W, H);
    folds(c, 0, 0, W, H, 71, 14, C.tunicDk, C.tunicHi, 0.5); strands(c, 0, 0, W, H, 73, 80, C.tunicDk, 0.25);
    const hy = H * 0.8; c.fillStyle = rgba(C.tunicDk, 0.95); c.fillRect(0, hy, W, H - hy); line(c, 0, hy, W, hy, 2.4, C.leatherHi, 'butt'); stitches(c, 0, hy + 7, W, hy + 7, 6, 4, 1.5, rgba(C.stitch, 0.85));
    for (let x = 6; x < W; x += 22) { c.strokeStyle = rgba(C.gold, 0.75); c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, hy + 14); c.quadraticCurveTo(x + 5, hy + 8, x + 10, hy + 14); c.stroke(); }
  });
  // arms: a long sleeve, gathered a little at the elbow; the forearm: the sleeve's end, a leather bracer with straps, bare skin at the wrist
  S.arm.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.tunicHi], [0.3, C.tunic], [0.9, C.tunicDk], [1, C.tunic]]); c.fillRect(0, 0, W, H);
    folds(c, 0, 0, W, H, 81, 9, C.tunicDk, C.tunicHi, 0.35); strands(c, 0, 0, W, H, 83, 90, C.tunicDk, 0.3);
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba('#0f2a18', 0.3)], [0.2, rgba('#0f2a18', 0)], [0.8, rgba('#0f2a18', 0)], [1, rgba('#0f2a18', 0.3)]]); c.fillRect(0, 0, W, H);
  });
  S.fore.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.tunic], [0.4, C.tunicDk], [0.42, C.tunic], [1, C.tunic]]); c.fillRect(0, 0, W, H * 0.46); strands(c, 0, 0, W, H * 0.46, 85, 40, C.tunicDk, 0.3);
    c.fillStyle = grad(c, 0, H * 0.46, 0, H * 0.88, [[0, C.leatherHi], [0.3, C.leather], [1, C.leatherDk]]); c.fillRect(0, H * 0.44, W, H * 0.45);
    line(c, 0, H * 0.45, W, H * 0.45, 3, rgba('#000', 0.35), 'butt'); line(c, 0, H * 0.88, W, H * 0.88, 3, rgba('#000', 0.4), 'butt');
    for (let i = 0; i < 3; i++) { const y = H * (0.54 + i * 0.1); line(c, W * 0.18, y, W * 0.82, y, 1.8, rgba(C.lace, 0.9)); ellipse(c, W * 0.18, y, 2.2, 2.2, C.leatherDk); c.fill(); ellipse(c, W * 0.82, y, 2.2, 2.2, C.leatherDk); c.fill(); }
    stitches(c, 0, H * 0.47, W, H * 0.47, 7, 5, 1.4, rgba(C.stitch, 0.75)); stitches(c, 0, H * 0.86, W, H * 0.86, 7, 5, 1.4, rgba(C.stitch, 0.75));
    c.fillStyle = grad(c, 0, H * 0.89, 0, H, [[0, C.skin], [1, C.skinSh]]); c.fillRect(0, H * 0.89, W, H * 0.11);
  });
  for (const hd of [S.handL, S.handR]) hd.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinSh], [0.25, C.skin], [1, C.skinHi]]); c.fillRect(0, 0, W, H);
    for (const x of [W * 0.25, W * 0.75]) for (let i = 1; i < 4; i++) line(c, x - 14 + i * 9, H * 0.55, x - 14 + i * 9, H, 1.5, rgba(C.skinDk, 0.5));
    for (const x of [W * 0.25, W * 0.75]) line(c, x - 14, H * 0.5, x + 14, H * 0.5, 1.3, rgba(C.skinDk, 0.3));
    strands(c, 0, 0, W, H * 0.4, 6, 24, C.skinSh, 0.3);
  });
  // legs: loose trousers (the thigh's sheet runs from the hip down, the shin's from the knee), and a tall boot with a turned cuff, laces and a sole
  S.boot.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.bootHi], [0.4, C.boot], [1, C.bootDk]]); c.fillRect(0, 0, W, H);
    c.fillStyle = grad(c, 0, 0, 0, H * 0.3, [[0, C.leatherHi], [1, C.leather]]); c.fillRect(0, 0, W, H * 0.3); line(c, 0, H * 0.3, W, H * 0.3, 2.5, C.bootDk, 'butt'); stitches(c, 0, H * 0.1, W, H * 0.1, 8, 5, 1.8, rgba(C.stitch, 0.75)); stitches(c, 0, H * 0.24, W, H * 0.24, 8, 5, 1.8, rgba(C.stitch, 0.75));
    for (let i = 0; i < 4; i++) { const y = H * 0.38 + i * 11; c.strokeStyle = C.lace; c.lineWidth = 2.3; c.beginPath(); c.moveTo(W / 2 - 13, y); c.lineTo(W / 2 + 13, y + 10); c.moveTo(W / 2 + 13, y); c.lineTo(W / 2 - 13, y + 10); c.stroke(); ellipse(c, W / 2 - 13, y, 2.4, 2.4, '#2a1a10'); c.fill(); ellipse(c, W / 2 + 13, y, 2.4, 2.4, '#2a1a10'); c.fill(); }
    strands(c, 0, 0, W, H, 4, 70, C.bootDk, 0.35);
  });
  S.shoe.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.bootHi], [0.5, C.boot], [1, C.bootDk]]); c.fillRect(0, 0, W, H);
    c.fillStyle = C.sole; c.fillRect(W * 0.3, 0, W * 0.4, H); c.fillStyle = grad(c, 0, 0, 0, H, [[0, rgba('#fff', 0.08)], [1, rgba('#000', 0.2)]]); c.fillRect(W * 0.3, 0, W * 0.4, H);
    line(c, 0, H * 0.18, W, H * 0.18, 2.5, rgba('#000', 0.35), 'butt'); strands(c, 0, 0, W, H, 8, 60, C.bootDk, 0.3);
  });

  // ── the Starweave Mantle (448 x 224; u runs from the front right edge round the back to the front left, v from the collar to the hem): red silk in deep folds, a band of gold stars along the hem ──
  S.cape.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.capeHi], [0.18, C.cape], [0.8, C.cape], [1, C.capeDk]]); c.fillRect(0, 0, W, H);
    folds(c, 0, 0, W, H, 5, 22, C.capeDk, C.capeHi, 0.5); strands(c, 0, 0, W, H, 6, 200, C.capeDk, 0.25); strands(c, 0, 0, W, H, 7, 160, C.capeHi, 0.3);
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba('#4a0710', 0.4)], [0.1, rgba('#4a0710', 0)], [0.9, rgba('#4a0710', 0)], [1, rgba('#4a0710', 0.4)]]); c.fillRect(0, 0, W, H);
    // the collar's edge and the hem's gold border
    c.fillStyle = rgba(C.capeDk, 0.9); c.fillRect(0, 0, W, 9); line(c, 0, 10, W, 10, 2, C.gold, 'butt');
    const hy = H * 0.8; line(c, 0, hy, W, hy, 3, C.gold, 'butt'); line(c, 0, hy + 5, W, hy + 5, 1.4, C.goldDk, 'butt'); line(c, 0, H - 4, W, H - 4, 3, C.gold, 'butt');
    // gold stars, large and small, along the hem, each with a thread arcing to the next; a few faint ones higher up
    const rr = rnd(11);
    for (let i = 0, x = 12; x < W; i++, x += 26 + rr() * 6) {
      const y = hy + 17 + (i % 2 ? 7 : -1) + rr() * 4, r = i % 3 === 1 ? 6.2 : 8.6; embroidered(c, x, y, r, (rr() - 0.5) * 0.5);
      c.strokeStyle = rgba(C.gold, 0.8); c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + r, y); c.quadraticCurveTo(x + 15, y + (i % 2 ? -7 : 7), x + 27, y + (i % 2 ? 4 : -2)); c.stroke();
    }
    for (let i = 0; i < 20; i++) { const x = rr() * W, y = H * (0.12 + rr() * 0.58); star(c, x, y, 3 + rr() * 2.4, rgba(C.goldHi, 0.28 + rr() * 0.25), rr()); }
  });
  S.hood.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.capeHi], [0.3, C.cape], [0.85, C.cape], [1, C.capeDk]]); c.fillRect(0, 0, W, H);
    folds(c, 0, 0, W, H, 15, 12, C.capeDk, C.capeHi, 0.5); strands(c, 0, 0, W, H, 16, 120, C.capeDk, 0.25);
    const hy = H * 0.82; line(c, 0, hy, W, hy, 3, C.gold, 'butt'); line(c, 0, hy + 5, W, hy + 5, 1.2, C.goldDk, 'butt');
    for (let x = 14; x < W; x += 34) embroidered(c, x, hy + 18, 7, 0.1);
  });
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// What depends on what she has on (as in the correction scene): trousers up or down, drawers up or down, the marks on the bare skin; legs, the waist piece and the seat
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
C.drawers = '#f4ecd6'; C.drawersSh = '#d8cba8'; C.seat = '#f9c8a6'; C.seatSh = '#e8a283';
const garmentAt = (down, dd, d) => !down ? 'trousers' : d < 2 ? (dd ? 'skin' : 'drawers') : d < 4 ? 'drawers' : 'trousers';
const flushOn = K.flush;
J.paintLegs = function (S, down, dd, marks, rows) {
  S.thigh.wrapDraw((c, W, H) => {
    const unit = py => -rows.thighY(py);                                          // (how far below the hip joint a row of the sheet is)
    for (let y = 0; y < H; y += 2) {
      const what = garmentAt(down, dd, Math.max(0, unit(y))), base = what === 'skin' ? C.skin : what === 'drawers' ? C.drawers : C.trousers, hi = what === 'skin' ? C.skinHi : what === 'drawers' ? '#ffffff' : C.trousersHi;
      c.fillStyle = grad(c, 0, 0, W, 0, [[0, shade(base, 0.84)], [0.25, base], [0.5, hi], [0.75, base], [1, shade(base, 0.84)]]); c.fillRect(0, y, W, 2.5);
    }
    folds(c, 0, 0, W, H, 91, 6, C.trousersDk, C.trousersHi, 0.16); strands(c, 0, 0, W, H, 12, 90, C.trousersDk, 0.22);
    if (down) for (let y = H * 0.78; y < H; y += 8) line(c, 0, y, W, y, 3.5, rgba(C.trousersDk, 0.8), 'butt');
    if (down) { const ys = []; for (let y = 0; y < H; y += 2) if (garmentAt(down, dd, Math.max(0, unit(y))) === 'skin') ys.push(y); if (ys.length) { const y0 = ys[0], y1 = ys[ys.length - 1] + 3, m = (marks.L + marks.R) / 2; flushOn(c, 0, y0, W * 0.2, y1 - y0, m, 17); flushOn(c, W * 0.8, y0, W * 0.2, y1 - y0, m, 19); } }
  });
  S.shin.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, shade(C.trousers, 0.84)], [0.25, C.trousers], [0.5, C.trousersHi], [0.75, C.trousers], [1, shade(C.trousers, 0.84)]]); c.fillRect(0, 0, W, H);
    folds(c, 0, 0, W, H, 93, 6, C.trousersDk, C.trousersHi, 0.16); strands(c, 0, 0, W, H, 14, 60, C.trousersDk, 0.22);
    c.fillStyle = C.boot; c.fillRect(0, H * 0.5, W, H * 0.5);
  });
};
// the waist piece: the tunic down to its hem, then (hitched up over her back) trousers, drawers or bare skin below it
J.paintWaist = function (S, hitched, down, dd, marks, rows) {
  const what = !down ? 'trousers' : !dd ? 'drawers' : 'skin', col = { trousers: C.trousers, drawers: C.drawers, skin: C.seat }[what];
  S.waist.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.tunic], [0.7, C.tunic], [1, C.tunicDk]]); c.fillRect(0, 0, W, H);
    folds(c, 0, 0, W, H, 61, 26, C.tunicDk, C.tunicHi, 0.45); strands(c, 0, 0, W, H, 63, 120, C.tunicDk, 0.25);
    const hy = H * 0.86; c.fillStyle = rgba(C.tunicDk, 0.9); c.fillRect(0, hy, W, H - hy); line(c, 0, hy, W, hy, 2.2, C.leatherHi, 'butt'); stitches(c, 0, hy + 6, W, hy + 6, 6, 4, 1.4, rgba(C.stitch, 0.8));
    if (hitched) {
      const yb = H * rows.waist(1.3);                                                   // (the tunic's hem, as it lies hitched up over her back)
      c.fillStyle = grad(c, 0, yb, 0, H, [[0, shade(col, 1.0)], [1, shade(col, 0.86)]]); c.fillRect(0, yb, W, H - yb);
      c.fillStyle = grad(c, 0, yb, W, yb, [[0, shade(col, 0.86)], [0.5, what === 'trousers' ? C.trousersHi : shade(col, 1.04)], [1, shade(col, 0.86)]]); c.fillRect(0, yb, W, H - yb);
      c.fillStyle = rgba(C.tunicDk, 0.95); c.fillRect(0, yb - 6, W, 6); line(c, 0, yb - 6, W, yb - 6, 2.2, C.leatherHi, 'butt'); stitches(c, 0, yb - 12, W, yb - 12, 6, 4, 1.4, rgba(C.stitch, 0.8));
      if (what === 'trousers') line(c, W / 2, yb, W / 2, H, 3, rgba(C.trousersDk, 0.8), 'butt');
      if (what === 'skin') for (const [m, x0, x1, seed] of [[marks.L, 0, W * 0.12, 11], [marks.R, W * 0.88, W, 13]]) flushOn(c, x0, yb, x1 - x0, H - yb, m, seed);
    }
  });
};
J.paintSeat = function (Sx, down, dd, marks) {
  const what = !down ? 'trousers' : !dd ? 'drawers' : 'skin';
  const base = { trousers: C.trousers, drawers: C.drawers, skin: C.seat }[what], hi = { trousers: C.trousersHi, drawers: '#ffffff', skin: '#fddcc4' }[what], seam = { trousers: C.trousersDk, drawers: C.drawersSh, skin: C.seatSh }[what];
  Sx.draw((c, W, H) => {
    for (const x0 of [0, W / 2]) { c.fillStyle = grad(c, x0, 0, x0 + W / 2, 0, [[0, shade(base, 0.86)], [0.5, hi], [1, shade(base, 0.86)]]); c.fillRect(x0, 0, W / 2, H); }
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, rgba('#fff', 0)], [1, rgba(seam, 0.55)]]); c.fillRect(0, 0, W, H);
    line(c, W / 2, 0, W / 2, H, 5, rgba(seam, 0.9), 'butt'); strands(c, 0, 0, W, H, 3, 60, seam, 0.25);
    if (what === 'skin') { flushOn(c, 0, 0, W / 2, H, marks.R, 3); flushOn(c, W / 2, 0, W / 2, H, marks.L, 5); }
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
