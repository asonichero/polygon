// Polygon — Gerda's painters: her face (redrawn for each expression as vector shapes on the flat plate), hair, the two outfits, bare skin. See js/poly-gerda.js.
(function (root) {
'use strict';
const P = root.Poly, K = P.Paint, G = P.GerdaPaint, clamp = P.clamp, { rgba, mix, shade, blob, ellipse, line, curve, taper, grad, grain, strands, stitches, rrect, rnd } = K;

const C = {
  skin: '#f1bf9c', skinHi: '#f9d6b8', skinSh: '#dd9c7e', skinDk: '#c4775c', blush: '#f08c88',
  lip: '#c85a62', lipDk: '#8a3844', teeth: '#fffaf0', mouthIn: '#5a1d26', tongue: '#e9737c',
  hair: '#6a4130', hairHi: '#aa7650', hairDk: '#3b2218', grey: '#dcd6cf', greyDk: '#9c9690', brow: '#4a2c1e',
  iris: '#6d9cc4', irisHi: '#bfe0f5', irisDk: '#35608a', pupil: '#0f1a24', white: '#fffaf2', lash: '#2a1a14',
  // the work dress
  blouse: '#f6efdc', blouseSh: '#e0d4b4', blouseDk: '#c4b68f', plum: '#9a3f5c', plumDk: '#6e2640', plumHi: '#c4607e', lace: '#f3e4ba', belt: '#5a3a24', beltHi: '#86593a',
  apron: '#f4ebd3', apronSh: '#dccfaa', apronDk: '#bfae85', pocket: '#e8dabb', gold: '#eab84a', goldDk: '#b8862a', goldHi: '#fff0a0',
};
// the gown
const F = { lav: '#b2a4e2', lavDk: '#8a7bc8', lavHi: '#d2c8f4', lavDp: '#6a5aac', cream: '#f8efd9', creamDk: '#ddd0ae', gold: '#f0c352', goldDk: '#b98a2c', goldHi: '#fff0a0', moon: '#e6f0ff', moonSh: '#a9bde6' };

// Heights on the torso were chosen for a first body; this maps them to where they fall on the present one (the hips, the waist, under the bust, the bust, the collarbone, the neck's base).
const OLDH = [2.0, 3.9, 7.0, 8.5, 10.0, 12.45], NEWH = [2.0, 4.0, 5.9, 7.3, 9.0, 10.75];
const mapH = y => { if (y <= OLDH[0]) return NEWH[0] + (y - OLDH[0]); for (let i = 0; i < OLDH.length - 1; i++) if (y <= OLDH[i + 1]) return NEWH[i] + (NEWH[i + 1] - NEWH[i]) * (y - OLDH[i]) / (OLDH[i + 1] - OLDH[i]); return NEWH[NEWH.length - 1] + (y - OLDH[OLDH.length - 1]); };

// Soft pleats: n strips of shadow with a light edge down a skirt's sheet, so flat colour reads as cloth that hangs in folds.
function pleats(c, x, y, w, h, seed, n, dk, hi, a) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const cx = x + (i + 0.5 + (r() - 0.5) * 0.7) * w / n, sw = w / n * (0.3 + r() * 0.3), top = y + r() * h * 0.08;
    c.fillStyle = grad(c, cx - sw, 0, cx + sw, 0, [[0, rgba(dk, 0)], [0.42, rgba(dk, a)], [0.56, rgba(hi, a * 0.55)], [1, rgba(hi, 0)]]); c.fillRect(cx - sw, top, sw * 2, y + h - top);
  }
}
// A row of small leaves and dots along a horizontal line, for embroidery.
function vine(c, x0, x1, y, amp, step, col, col2, seed) {
  const r = rnd(seed); c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath();
  for (let x = x0; x <= x1; x += 2) { const yy = y + Math.sin((x - x0) / step * Math.PI) * amp; if (x === x0) c.moveTo(x, yy); else c.lineTo(x, yy); } c.stroke();
  for (let x = x0 + step * 0.5; x < x1; x += step) { const up = ((x - x0) / step | 0) % 2 ? 1 : -1, yy = y + Math.sin((x - x0) / step * Math.PI) * amp; ellipse(c, x, yy + up * 4.5, 3.2, 1.6, col2, up * 0.6 + r() * 0.2); c.fill(); ellipse(c, x + step * 0.5, y - up * 3, 2, 2, col); c.fill(); }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The face. The plate is 352 x 384 and shows x from -3.0 to 3.0 and y from 7.5 (top) down to 0.8 (the chin): about 58 px to the unit both ways.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const S_ = 58, FX = W => x => (0.5 + x / 6.0) * W, FY = H => y => (7.5 - y) / 6.7 * H;
const Fc = P.Face, FACE_PAL = { s: S_, eyeScale: 0.96, irisK: 1.0, lashK: 0.82, flick: 0.2, white: C.white, iris: C.iris, irisHi: C.irisHi, irisDk: C.irisDk, pupil: C.pupil, lash: C.lash, brow: C.brow, browHi: '#a06a44', skinDk: C.skinDk, lip: C.lip, lipDk: C.lipDk, teeth: C.teeth, mouthIn: C.mouthIn, tongue: C.tongue };
const eye = (c, X0, Y0, side, o) => Fc.eye(c, X0, Y0, side, o, FACE_PAL), brow = (c, X0, Y0, side, a, b, d, th) => Fc.brow(c, X0, Y0, side, a, b, d, th, FACE_PAL), mouth = (c, X0, Y0, m) => Fc.mouth(c, X0, Y0, m, FACE_PAL);

G.paintFace = function (sh, ex) {
  sh.draw((c, W, H) => {
    const X = FX(W), Y = FY(H), s = S_;
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinHi], [0.3, C.skin], [0.8, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H);
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba(C.skinDk, 0.5)], [0.1, rgba(C.skinSh, 0.25)], [0.2, rgba(C.skinSh, 0)], [0.8, rgba(C.skinSh, 0)], [0.9, rgba(C.skinSh, 0.25)], [1, rgba(C.skinDk, 0.5)]]); c.fillRect(0, 0, W, H);
    blob(c, X(0), Y(6.3), 2.0 * s, 0.8 * s, C.skinHi, 0.5, 0.2);                           // the forehead's light
    for (const sg of [-1, 1]) {
      blob(c, X(sg * 1.9), Y(3.15), 0.95 * s, 0.72 * s, C.blush, ex === 2 ? 0.75 : 0.42, 0.1);       // the cheeks (fuller when she laughs)
      blob(c, X(sg * 1.3), Y(4.45), 1.1 * s, 0.6 * s, '#c07a88', 0.16, 0.1);               // the hollow of the eye socket
      blob(c, X(sg * 1.3), Y(4.95), 0.9 * s, 0.22 * s, '#d98a80', 0.2, 0.1);               // a little warmth on the lid
    }
    // hair: parted in the middle, smoothed down over the temples as far as a high, rounded hairline; a streak of grey at her left (the image's right)
    const hl = [[X(-3.2), Y(3.6)], [X(-3.0), Y(4.6)], [X(-2.4), Y(5.55)], [X(-1.5), Y(6.1)], [X(-0.6), Y(6.38)], [X(0), Y(6.44)], [X(0.6), Y(6.38)], [X(1.5), Y(6.1)], [X(2.4), Y(5.55)], [X(3.0), Y(4.6)], [X(3.2), Y(3.6)]];
    const hairShape = () => curve(c, [[-10, -10], ...hl, [W + 10, Y(3.6)], [W + 10, -10]]);
    c.fillStyle = grad(c, 0, 0, 0, Y(6.0), [[0, C.hairDk], [1, C.hair]]); hairShape(); c.fill();
    c.save(); hairShape(); c.clip();
    for (let i = 0; i < 34; i++) {                                                          // strands running from the parting down and out along the hairline
      const sg = i % 2 ? 1 : -1, k = (i >> 1) / 17 * 1.5, r = rnd(100 + i), j = (r() - 0.5) * 0.14;
      const pts = [[X(sg * (0.04 + j)), Y(6.5 + k)], [X(sg * (1.0 + j)), Y(6.25 + k * 0.92)], [X(sg * (2.0 + j)), Y(5.6 + k * 0.7)], [X(sg * (2.95 + j)), Y(4.3 + k * 0.4)]];
      taper(c, pts, (0.1 + r() * 0.1) * s, 0.02 * s, rgba(i % 3 === 0 ? C.hairHi : C.hairDk, i % 3 === 0 ? 0.55 : 0.5), 1.1);
    }
    for (let i = 0; i < 5; i++) { const r = rnd(300 + i), k = i * 0.07; taper(c, [[X(0.14 + k * 0.1), Y(6.46 + k)], [X(1.0 + k * 0.3), Y(6.22 + k * 0.9)], [X(1.8 + k * 0.4), Y(5.75 + k * 0.6)]], (0.04 + r() * 0.03) * s, 0.012 * s, rgba(C.grey, 0.65), 1.1); }
    c.restore();
    c.strokeStyle = rgba(C.hairDk, 0.55); c.lineWidth = 2; c.beginPath(); c.moveTo(...hl[0]); curve(c, hl); c.stroke();
    line(c, X(0), 0, X(0), Y(6.44), 3, rgba(C.skinSh, 0.95), 'butt'); line(c, X(0.02), 0, X(0.02), Y(6.5), 1.5, rgba(C.skinHi, 0.9), 'butt');       // the parting
    // the nose's shadow and light on the plate (the nose itself is geometry)
    blob(c, X(0), Y(3.05), 0.8 * s, 0.3 * s, C.skinDk, 0.26, 0.2); for (const sg of [-1, 1]) blob(c, X(sg * 0.4), Y(3.2), 0.18 * s, 0.13 * s, C.skinDk, 0.65, 0.1);
    blob(c, X(0), Y(4.0), 0.2 * s, 1.0 * s, C.skinHi, 0.5, 0.3);
    // the faint lines of a woman near forty: smile lines, a crease under each eye, crow's feet; a little deeper when she laughs
    const age = ex === 2 ? 1.5 : 1;
    for (const sg of [-1, 1]) {
      taper(c, [[X(sg * 0.8), Y(3.0)], [X(sg * 1.12), Y(2.55)], [X(sg * 1.22), Y(1.95)]], 0.07 * s, 0.015 * s, rgba(C.skinDk, 0.2 * age), 1.1);
      taper(c, [[X(sg * 0.6), Y(3.88)], [X(sg * 1.3), Y(3.8)], [X(sg * 2.0), Y(3.97)]], 0.05 * s, 0.012 * s, rgba(C.skinDk, 0.1 * age));
      for (const [dx, dy] of [[0.45, 0.32], [0.5, 0.0], [0.42, -0.3]]) taper(c, [[X(sg * 2.15), Y(4.4)], [X(sg * (2.15 + dx)), Y(4.4 + dy)]], 0.04 * s, 0.01 * s, rgba(C.skinDk, 0.16 * age));
    }
    // expression: [eyes, brows (inner, middle, outer heights), mouth]
    const E = [
      { eye: { up: 0.66, low: -0.48 }, brow: [0.0, 0.24, 0.0], mouth: { w: 0.86, yc: 0.07, yu: -0.07, yl: -0.46 } },                                                                    // calm: a soft, closed smile
      { eye: { up: 0.5, low: -0.42, tilt: -0.03 }, brow: [0.2, 0.2, -0.08], mouth: { w: 0.8, yc: -0.04, yu: 0.0, yl: -0.2, line: true } },                                                // stern: brows drawn in, the mouth pressed
      { eye: { shut: 1 }, brow: [0.06, 0.3, 0.08], mouth: { w: 1.08, yc: 0.17, yu: -0.08, yl: -0.88, open: true, teeth: 0.32, tongue: true, dimples: true } },                            // laughing
    ][ex];
    const ey = Y(4.4), exx = 1.3;
    for (const sg of [-1, 1]) eye(c, X(sg * exx), ey, sg, E.eye);
    const bs = E.brow;
    for (const sg of [-1, 1]) brow(c, X(sg * exx), Y(4.4 + 0.98), sg, bs[0], bs[1], bs[2], 0.17);
    mouth(c, X(0), Y(2.25), E.mouth);
  });
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Everything that does not change with the face
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const shellAngle = u => { let t = Math.PI / 3 + (4 * Math.PI / 3) * u; if (t > Math.PI) t -= 2 * Math.PI; return Math.abs(t); };
G.paintStatic = function (S, outfit, rows) {
  const fine = outfit === 'Fine', HEAD = P.HEAD_GERDA;
  S.ear.draw((c, W, H) => { c.fillStyle = grad(c, 0, 0, W, 0, [[0, C.skinSh], [0.5, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H); blob(c, W / 2, H * 0.55, W * 0.34, H * 0.34, C.skinDk, 0.5, 0.3); blob(c, W / 2, H * 0.16, W * 0.3, H * 0.1, C.skinHi, 0.7, 0.2); });
  // trim swatches (4 px each): gold, gold shine, gold shade, moonstone, the pin, skin, skin light, skin shade, dark
  S.trim.draw((c, W, H) => { [F.gold, F.goldHi, F.goldDk, F.moon, '#e9dcc0', C.skin, C.skinHi, C.skinSh, '#3a2a22'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * 4, 0, 4, H); }); });
  // hair (the locks): dark brunette with a band of light, strands the length of each lock, a few grey threads
  S.hair.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.hairDk], [0.22, C.hair], [0.38, C.hairHi], [0.58, C.hair], [1, C.hairDk]]); c.fillRect(0, 0, W, H);
    strands(c, 0, 0, W, H, 9, 240, C.hairHi, 0.5); strands(c, 0, 0, W, H, 13, 220, C.hairDk, 0.5); strands(c, 0, 0, W, H, 17, 30, C.grey, 0.55);
    c.fillStyle = grad(c, 0, H * 0.28, 0, H * 0.42, [[0, rgba('#ffe2b8', 0)], [0.5, rgba('#ffe2b8', 0.32)], [1, rgba('#ffe2b8', 0)]]); c.fillRect(0, H * 0.25, W, H * 0.2);
  });
  S.streak.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, '#7c7570'], [0.3, '#aaa29a'], [0.5, '#c6bfb7'], [0.7, '#aaa29a'], [1, '#7c7570']]); c.fillRect(0, 0, W, H);
    strands(c, 0, 0, W, H, 5, 120, '#e4ded6', 0.5); strands(c, 0, 0, W, H, 7, 90, '#6a635e', 0.45);
  });
  // the cap of hair (u round the head from the back, v from the crown down to the hairline): radial strands, a ring of light, the parting at the front
  S.cap.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.hairDk], [0.16, C.hair], [0.32, C.hairHi], [0.5, C.hair], [1, C.hairDk]]); c.fillRect(0, 0, W, H);
    strands(c, 0, 0, W, H, 21, 420, C.hairHi, 0.45); strands(c, 0, 0, W, H, 23, 380, C.hairDk, 0.5);
    c.fillStyle = grad(c, 0, H * 0.22, 0, H * 0.36, [[0, rgba('#ffe2b8', 0)], [0.5, rgba('#ffe2b8', 0.3)], [1, rgba('#ffe2b8', 0)]]); c.fillRect(0, H * 0.2, W, H * 0.18);
    const r = rnd(77); for (let i = 0; i < 9; i++) { const x = W * (0.515 + r() * 0.06), y = H * (0.1 + r() * 0.12), l = H * (0.16 + r() * 0.2); c.strokeStyle = rgba(C.grey, 0.6); c.lineWidth = 1.1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 3, y + l); c.stroke(); }
    line(c, W / 2, H * 0.06, W / 2, H * 0.47, 2.6, rgba(C.skinSh, 0.95), 'butt');
  });
  // the bun: a swirl of strands round a soft knob, a ring of light high on it
  S.bun.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.hairDk], [0.5, C.hair], [0.75, C.hairHi], [1, C.hair]]); c.fillRect(0, 0, W, H);
    const r = rnd(31); for (let i = 0; i < 70; i++) { const x = r() * W, l = 20 + r() * 60; c.strokeStyle = rgba(r() < 0.5 ? C.hairHi : C.hairDk, 0.35 + r() * 0.3); c.lineWidth = 1 + r() * 2; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + l * 0.5, H * 0.3, x + l, H * 0.6, x + l * 0.6, H); c.stroke(); }
    c.fillStyle = grad(c, 0, H * 0.55, 0, H * 0.78, [[0, rgba('#ffe2b8', 0)], [0.5, rgba('#ffe2b8', 0.28)], [1, rgba('#ffe2b8', 0)]]); c.fillRect(0, H * 0.5, W, H * 0.3);
    strands(c, 0, 0, W, H, 41, 14, C.grey, 0.7);
  });
  // the shell of the head: skin below the hairline, hair above it, a darker line where the hair ends
  S.shell.draw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.hairDk], [0.4, C.hair], [1, C.hairDk]]); c.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 2) { const a = shellAngle(x / W), yb = P.hairline(HEAD, a), row = (HEAD.top - yb) / (HEAD.top - HEAD.faceY0) * H;
      c.fillStyle = grad(c, 0, row, 0, H, [[0, C.skinSh], [0.2, C.skin], [1, C.skinSh]]); c.fillRect(x, row, 2.5, H - row);
      c.fillStyle = rgba(C.hairDk, 0.55); c.fillRect(x, row - 3, 2.5, 3); }
    strands(c, 0, 0, W, H * 0.6, 25, 120, C.hairHi, 0.45);
  });
  S.neck.draw((c, W, H) => { c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinSh], [0.4, C.skin], [1, C.skinHi]]); c.fillRect(0, 0, W, H); blob(c, W / 2, 6, W * 0.35, 14, C.skinDk, 0.35, 0.2); });

  // ── torso (448 x 224; the front is the middle column): a bodice laced over a blouse, or the gown ──
  S.torso.draw((c, W, H) => {
    const mx = W / 2, ry = y => rows.torso(mapH(y)) * H;
    if (!fine) {
      c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.blouse], [1, C.blouseSh]]); c.fillRect(0, 0, W, H);
      // the blouse's scoop neck, with a lace edge and a gathering string
      const y0 = ry(12.0), y1 = ry(10.0);
      c.fillStyle = grad(c, 0, y0, 0, y1, [[0, C.skinSh], [0.4, C.skin], [1, C.skinHi]]); c.beginPath(); c.moveTo(mx - 78, y0 - 8); c.quadraticCurveTo(mx - 58, y1 - 4, mx, y1); c.quadraticCurveTo(mx + 58, y1 - 4, mx + 78, y0 - 8); c.closePath(); c.fill();
      c.strokeStyle = rgba(C.blouseDk, 0.95); c.lineWidth = 2.2; c.beginPath(); c.moveTo(mx - 79, y0 - 8); c.quadraticCurveTo(mx - 58, y1 - 3, mx, y1 + 1); c.quadraticCurveTo(mx + 58, y1 - 3, mx + 79, y0 - 8); c.stroke();
      stitches(c, mx - 74, y0 + 6, mx - 6, y1 + 8, 5, 4, 2, rgba(C.lace, 0.55)); stitches(c, mx + 6, y1 + 8, mx + 74, y0 + 6, 5, 4, 2, rgba(C.lace, 0.55));
      strands(c, 0, 0, W, ry(9.2), 5, 150, C.blouseDk, 0.28);
      // the bodice: plum from a gently dipping top edge (lower across the bust, higher at the sides and back) down to the waist
      const top = u => { const d = Math.abs(u - mx) / mx; return ry(8.75 + 0.45 * P.smooth(0, 0.1, d) + 1.5 * P.smooth(0.15, 0.95, d)); };
      const edge = []; for (let x = 0; x <= W; x += 14) edge.push([x, top(x)]);
      c.fillStyle = grad(c, 0, ry(9.5), 0, ry(3.6), [[0, C.plumHi], [0.25, C.plum], [1, C.plumDk]]); c.beginPath(); c.moveTo(0, H + 5); c.lineTo(0, edge[0][1]); for (const p of edge) c.lineTo(p[0], p[1]); c.lineTo(W, H + 5); c.closePath(); c.fill();
      c.strokeStyle = C.plumDk; c.lineWidth = 3.5; c.beginPath(); c.moveTo(edge[0][0], edge[0][1]); for (const p of edge) c.lineTo(p[0], p[1]); c.stroke();
      c.strokeStyle = rgba(C.gold, 0.9); c.lineWidth = 1.6; c.beginPath(); c.moveTo(edge[0][0], edge[0][1] + 5); for (const p of edge) c.lineTo(p[0], p[1] + 5); c.stroke();
      // soft shapes: under the bust, at the sides, the pull of the lacing
      for (const sg of [-1, 1]) { blob(c, mx + sg * 38, ry(7.15), 40, 13, C.plumDk, 0.55, 0.1); blob(c, mx + sg * 150, ry(7.0), 36, 60, C.plumDk, 0.4, 0.1); blob(c, mx + sg * 36, ry(8.9), 22, 16, C.plumHi, 0.55, 0.1); }
      for (const sg of [-1, 1]) { c.strokeStyle = rgba(C.plumDk, 0.7); c.lineWidth = 2.4; c.beginPath(); c.moveTo(mx + sg * 52, ry(8.2)); c.quadraticCurveTo(mx + sg * 60, ry(6.0), mx + sg * 44, ry(3.9)); c.stroke(); stitches(c, mx + sg * 58, ry(8.0), mx + sg * 47, ry(4.1), 6, 5, 1.6, rgba(C.lace, 0.55)); }
      // the lacing: a panel down the front, criss-crossed
      const ya = ry(8.35), yb = ry(3.95);
      c.fillStyle = rgba(C.plumDk, 0.85); rrect(c, mx - 15, ya - 4, 30, yb - ya + 8, 5); c.fill();
      for (let y = ya, i = 0; y < yb - 6; y += 13, i++) { c.strokeStyle = C.lace; c.lineWidth = 2.3; c.beginPath(); c.moveTo(mx - 10, y); c.lineTo(mx + 10, y + 13); c.moveTo(mx + 10, y); c.lineTo(mx - 10, y + 13); c.stroke(); ellipse(c, mx - 11, y, 2.4, 2.4, C.gold); c.fill(); ellipse(c, mx + 11, y, 2.4, 2.4, C.gold); c.fill(); }
      line(c, mx, yb + 1, mx, yb + 14, 2.4, C.lace); line(c, mx, yb + 1, mx - 8, yb + 15, 2, C.lace);
      // the back: a seam up the middle, and the bodice's pull at the shoulder blades
      line(c, 0, ry(9.8), 0, H, 3, rgba(C.plumDk, 0.8), 'butt'); line(c, W - 1, ry(9.8), W - 1, H, 3, rgba(C.plumDk, 0.8), 'butt'); blob(c, 0, ry(8.0), 40, 50, C.plumDk, 0.25, 0.1); blob(c, W, ry(8.0), 40, 50, C.plumDk, 0.25, 0.1);
    } else {
      c.fillStyle = grad(c, 0, 0, 0, H, [[0, F.lavHi], [0.3, F.lav], [1, F.lavDk]]); c.fillRect(0, 0, W, H);
      strands(c, 0, 0, W, H, 3, 220, F.lavDk, 0.3); strands(c, 0, 0, W, H, 4, 160, F.lavHi, 0.35);
      // a wide, shallow neckline edged in cream embroidery
      const y0 = ry(12.0), y1 = ry(10.1);
      c.fillStyle = grad(c, 0, y0, 0, y1, [[0, C.skinSh], [0.4, C.skin], [1, C.skinHi]]); c.beginPath(); c.moveTo(mx - 98, y0 - 10); c.quadraticCurveTo(mx - 70, y1 - 2, mx, y1 + 2); c.quadraticCurveTo(mx + 70, y1 - 2, mx + 98, y0 - 10); c.closePath(); c.fill();
      c.strokeStyle = F.cream; c.lineWidth = 15; c.beginPath(); c.moveTo(mx - 100, y0 - 10); c.quadraticCurveTo(mx - 72, y1 + 12, mx, y1 + 16); c.quadraticCurveTo(mx + 72, y1 + 12, mx + 100, y0 - 10); c.stroke();
      c.strokeStyle = F.gold; c.lineWidth = 1.8; c.beginPath(); c.moveTo(mx - 100, y0 - 10); c.quadraticCurveTo(mx - 72, y1 + 20, mx, y1 + 24); c.quadraticCurveTo(mx + 72, y1 + 20, mx + 100, y0 - 10); c.stroke();
      c.strokeStyle = rgba(F.lavDk, 0.9); c.lineWidth = 2; c.beginPath(); c.moveTo(mx - 100, y0 - 10); c.quadraticCurveTo(mx - 72, y1 + 6, mx, y1 + 9); c.quadraticCurveTo(mx + 72, y1 + 6, mx + 100, y0 - 10); c.stroke();
      for (let i = -9; i <= 9; i++) { const t = i / 9, x = mx + t * 92, y = y1 + 12 + Math.pow(Math.abs(t), 2) * -22 + 3; ellipse(c, x, y, 3.4, 2, i % 2 ? F.lavDk : F.gold, t * 0.7); c.fill(); }
      // the stomacher: a cream panel down the front with a lattice of gold thread and small buttons
      const ya = ry(9.4), yb = ry(3.9), pw = 34;
      c.fillStyle = grad(c, 0, ya, 0, yb, [[0, F.cream], [1, F.creamDk]]); c.beginPath(); c.moveTo(mx - pw - 8, ya); c.lineTo(mx + pw + 8, ya); c.lineTo(mx + pw - 6, yb); c.lineTo(mx - pw + 6, yb); c.closePath(); c.fill();
      c.save(); c.clip(); c.strokeStyle = rgba(F.gold, 0.8); c.lineWidth = 1.3; for (let k = -6; k < 12; k++) { c.beginPath(); c.moveTo(mx - 60 + k * 14, ya); c.lineTo(mx - 20 + k * 14 + 40, yb); c.moveTo(mx + 60 - k * 14, ya); c.lineTo(mx + 20 - k * 14 - 40, yb); c.stroke(); } c.restore();
      c.strokeStyle = F.goldDk; c.lineWidth = 2; c.beginPath(); c.moveTo(mx - pw - 8, ya); c.lineTo(mx - pw + 6, yb); c.moveTo(mx + pw + 8, ya); c.lineTo(mx + pw - 6, yb); c.stroke();
      for (let y = ya + 12; y < yb - 4; y += 17) { ellipse(c, mx, y, 4.6, 4.6, F.gold); c.fill(); ellipse(c, mx - 1.2, y - 1.2, 1.8, 1.8, F.goldHi); c.fill(); }
      ellipse(c, mx, ya + 1, 7, 7, F.moonSh); c.fill(); ellipse(c, mx, ya, 5.4, 5.4, F.moon); c.fill(); ellipse(c, mx - 1.6, ya - 1.6, 1.8, 1.8, '#fff'); c.fill();
      // soft shapes: under the bust, at the sides, the waist band
      for (const sg of [-1, 1]) { blob(c, mx + sg * 38, ry(7.15), 40, 13, F.lavDp, 0.5, 0.1); blob(c, mx + sg * 150, ry(7.0), 36, 60, F.lavDp, 0.4, 0.1); blob(c, mx + sg * 36, ry(8.8), 22, 16, F.lavHi, 0.6, 0.1); }
      c.fillStyle = F.cream; c.fillRect(0, ry(4.55), W, ry(3.9) - ry(4.55) + 6); line(c, 0, ry(4.55), W, ry(4.55), 2, F.goldDk, 'butt'); line(c, 0, ry(3.9) + 6, W, ry(3.9) + 6, 2, F.goldDk, 'butt'); vine(c, 0, W, (ry(4.55) + ry(3.9) + 6) / 2, 2, 22, F.goldDk, F.lavDk, 9);
      line(c, 0, ry(9.8), 0, H, 3, rgba(F.lavDp, 0.8), 'butt'); line(c, W - 1, ry(9.8), W - 1, H, 3, rgba(F.lavDp, 0.8), 'butt');
    }
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba('#2a1a40', 0.3)], [0.14, rgba('#2a1a40', 0)], [0.86, rgba('#2a1a40', 0)], [1, rgba('#2a1a40', 0.3)]]); c.fillRect(0, 0, W, H);
  });

  // ── the waist piece (448 x 128): the top band and the apron's panel down the front, the knot and tails at the back, pleats all round ──
  S.waist.wrapDraw((c, W, H) => {
    const mx = W / 2, ry = y => rows.waist(y) * H, base = fine ? F.lav : C.plum, dk = fine ? F.lavDk : C.plumDk, hi = fine ? F.lavHi : C.plumHi;
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, base], [0.6, base], [1, dk]]); c.fillRect(0, 0, W, H);
    pleats(c, 0, 0, W, H, 61, 26, dk, hi, 0.5);
    if (!fine) {
      // the apron: a cream band at the waist, its panel down the front with a stitched pocket, tied at the back
      const edge = y => Math.asin(clamp(2.3 / rows.waistRx(y), 0, 1)) / (2 * Math.PI) * W;       // (the half-width on the sheet of a panel 4.6 units wide)
      const pts = []; for (let y = 3.9; y >= -3.7; y -= 0.35) pts.push(y); pts.push(-3.7);
      c.beginPath(); pts.forEach((y, i) => i ? c.lineTo(mx - edge(y), ry(y)) : c.moveTo(mx - edge(y), ry(y))); for (let i = pts.length - 1; i >= 0; i--) c.lineTo(mx + edge(pts[i]), ry(pts[i])); c.closePath();
      c.fillStyle = grad(c, mx - 60, 0, mx + 60, 0, [[0, C.apronSh], [0.2, C.apron], [0.8, C.apron], [1, C.apronSh]]); c.fill(); c.strokeStyle = rgba(C.apronDk, 0.55); c.lineWidth = 2; c.stroke();
      c.fillStyle = C.pocket; rrect(c, mx - 24, 40, 48, 38, 6); c.fill(); c.strokeStyle = C.apronDk; c.lineWidth = 2; rrect(c, mx - 24, 40, 48, 38, 6); c.stroke(); stitches(c, mx - 20, 46, mx + 20, 46, 5, 4, 1.6, rgba(C.apronDk, 0.9));
      c.fillStyle = grad(c, 0, 0, 0, 22, [[0, C.apron], [1, C.apronSh]]); c.fillRect(0, 0, W, 22); line(c, 0, 22, W, 22, 2.4, rgba(C.apronDk, 0.9), 'butt'); line(c, 0, 3, W, 3, 1.4, rgba('#fff', 0.7), 'butt');
      for (const sg of [-1, 1]) { c.fillStyle = grad(c, sg * 4, 20, sg * 26, 90, [[0, C.apron], [1, C.apronSh]]); c.beginPath(); c.moveTo(sg * 2, 18); c.lineTo(sg * 22, 24); c.lineTo(sg * 34, 84); c.lineTo(sg * 16, 78); c.closePath(); c.fill(); c.strokeStyle = C.apronDk; c.lineWidth = 1.6; c.stroke(); }      // the tails and knot at the back (the seam, so drawn by wrapDraw on both sides of it)
      ellipse(c, 0, 16, 11, 8, C.apron); c.strokeStyle = C.apronDk; c.lineWidth = 1.6; c.stroke(); ellipse(c, 0, 16, 4, 3.5, C.apronSh);
    } else {
      // the gown: a cream band at the waist stitched in gold, and flowers scattered down the skirt
      c.fillStyle = F.cream; c.fillRect(0, 0, W, 22); line(c, 0, 22, W, 22, 2, F.goldDk, 'butt'); line(c, 0, 1, W, 1, 2, F.goldDk, 'butt'); vine(c, 0, W, 11, 2, 22, F.goldDk, F.lavDk, 11);
      const r = rnd(5); for (let i = 0; i < 24; i++) { const x = r() * W, y = 36 + r() * 80; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ellipse(c, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.2, 1.8, F.cream, a); c.fill(); } ellipse(c, x, y, 2.2, 2.2, F.gold); c.fill(); }
    }
    const hy = H * 0.86; c.fillStyle = fine ? F.cream : rgba(C.plumDk, 0.85); c.fillRect(0, hy, W, H - hy); line(c, 0, hy, W, hy, 2.2, fine ? F.goldDk : C.gold, 'butt'); line(c, 0, hy + 5, W, hy + 5, 1.2, fine ? F.gold : C.goldDk, 'butt');       // the rolled hem
  });

  // ── arms: the sleeves (blouse rolled above the elbow; or the gown's three-quarter sleeve), and strong forearms ──
  S.arm.wrapDraw((c, W, H) => {
    if (!fine) {
      c.fillStyle = grad(c, 0, 0, 0, H, [[0, '#ffffff'], [0.3, C.blouse], [0.8, C.blouseSh], [0.82, C.blouse]]); c.fillRect(0, 0, W, H);
      c.fillStyle = grad(c, 0, H * 0.74, 0, H * 0.84, [[0, rgba(C.blouseSh, 0)], [1, rgba(C.blouseDk, 0.9)]]); c.fillRect(0, H * 0.74, W, H * 0.1);
      c.fillStyle = C.skin; c.fillRect(0, H * 0.86, W, H * 0.14); line(c, 0, H * 0.86, W, H * 0.86, 3, rgba(C.skinDk, 0.6), 'butt');
      strands(c, 0, 0, W, H * 0.8, 11, 90, C.blouseDk, 0.4);
    } else {
      c.fillStyle = grad(c, 0, 0, 0, H, [[0, F.lavHi], [0.3, F.lav], [1, F.lavDk]]); c.fillRect(0, 0, W, H);
      pleats(c, 0, 0, W, H, 73, 9, F.lavDp, F.lavHi, 0.35); strands(c, 0, 0, W, H, 11, 90, F.lavDk, 0.35);
      c.fillStyle = grad(c, 0, H * 0.84, 0, H, [[0, rgba(F.lavDp, 0)], [1, rgba(F.lavDp, 0.4)]]); c.fillRect(0, H * 0.84, W, H * 0.16);
    }
    c.fillStyle = grad(c, 0, 0, W, 0, [[0, rgba('#2a1a30', 0.28)], [0.2, rgba('#2a1a30', 0)], [0.8, rgba('#2a1a30', 0)], [1, rgba('#2a1a30', 0.28)]]); c.fillRect(0, 0, W, H * 0.85);
  });
  S.fore.wrapDraw((c, W, H) => {
    if (!fine) {
      c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skin], [0.7, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H);
      for (const x of [W * 0.25, W * 0.75]) blob(c, x, H * 0.4, 14, 40, C.skinSh, 0.25, 0.2);
      strands(c, 0, 0, W, H * 0.6, 17, 40, C.skinSh, 0.3); const r = rnd(9); for (let i = 0; i < 40; i++) ellipse(c, r() * W, H * (0.1 + r() * 0.6), 1.2, 1.2, rgba(C.skinDk, 0.35 + r() * 0.3)), c.fill();      // (freckles: she works outdoors)
    } else {
      c.fillStyle = grad(c, 0, 0, 0, H, [[0, F.lavHi], [0.3, F.lav], [0.42, F.lavDk]]); c.fillRect(0, 0, W, H * 0.46);
      pleats(c, 0, 0, W, H * 0.46, 79, 9, F.lavDp, F.lavHi, 0.35);
      c.fillStyle = F.cream; c.fillRect(0, H * 0.44, W, H * 0.16); line(c, 0, H * 0.44, W, H * 0.44, 2.4, F.goldDk, 'butt'); line(c, 0, H * 0.6, W, H * 0.6, 2.4, F.goldDk, 'butt'); vine(c, 0, W, H * 0.52, 2, 22, F.goldDk, F.lavDk, 13);
      c.fillStyle = grad(c, 0, H * 0.6, 0, H, [[0, C.skin], [1, C.skinSh]]); c.fillRect(0, H * 0.6, W, H * 0.4); blob(c, W * 0.25, H * 0.8, 14, 24, C.skinSh, 0.25, 0.2); blob(c, W * 0.75, H * 0.8, 14, 24, C.skinSh, 0.25, 0.2);
    }
  });
  for (const hd of [S.handL, S.handR]) hd.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinSh], [0.25, C.skin], [1, C.skinHi]]); c.fillRect(0, 0, W, H);
    for (const x of [W * 0.25, W * 0.75]) for (let i = 1; i < 4; i++) line(c, x - 14 + i * 9, H * 0.55, x - 14 + i * 9, H, 1.5, rgba(C.skinDk, 0.5));
    for (const x of [W * 0.25, W * 0.75]) line(c, x - 14, H * 0.5, x + 14, H * 0.5, 1.3, rgba(C.skinDk, 0.3));
    strands(c, 0, 0, W, H * 0.4, 6, 24, C.skinSh, 0.3);
  });
  // legs (what shows below the skirts) and feet: bare skin, a faint line at the ankle, toes
  S.leg.wrapDraw((c, W, H) => { c.fillStyle = grad(c, 0, 0, W, 0, [[0, C.skinSh], [0.3, C.skin], [0.5, C.skinHi], [0.7, C.skin], [1, C.skinSh]]); c.fillRect(0, 0, W, H); c.fillStyle = grad(c, 0, H * 0.8, 0, H, [[0, rgba(C.skinSh, 0)], [1, rgba(C.skinSh, 0.8)]]); c.fillRect(0, H * 0.8, W, H * 0.2); strands(c, 0, 0, W, H, 16, 50, C.skinSh, 0.3); });
  S.foot.wrapDraw((c, W, H) => {
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, C.skinHi], [1, C.skin]]); c.fillRect(0, 0, W, H);
    c.fillStyle = rgba(C.skinSh, 0.8); c.fillRect(W * 0.3, 0, W * 0.4, H);
    for (const x of [W * 0.06, W * 0.14, W * 0.2, W * 0.86, W * 0.94]) line(c, x, 0, x, H * 0.22, 1.7, rgba(C.skinDk, 0.5));
    for (const x of [0.0, 0.1, 0.18, 0.88, 0.96]) { ellipse(c, W * x, 5, 5, 4, rgba(C.skinHi, 0.7)); c.fill(); }
  });

  // ── the skirt on the thigh (256 x 160; the apron's panel lies on the inside of the front) and on the shin (256 x 192) ──
  S.skirtT.wrapDraw((c, W, H) => {
    const base = fine ? F.lav : C.plum, dk = fine ? F.lavDk : C.plumDk, hi = fine ? F.lavHi : C.plumHi;
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, base], [0.9, base], [1, dk]]); c.fillRect(0, 0, W, H);
    pleats(c, 0, 0, W, H, 83, 20, dk, hi, 0.5); strands(c, 0, 0, W, H, 85, 70, dk, 0.25);
    if (!fine) {
      const x0 = W * 0.40, x1 = W * 0.552;
      c.fillStyle = grad(c, x0, 0, x1, 0, [[0, C.apronSh], [0.18, C.apron], [1, C.apron]]); c.fillRect(x0, 0, x1 - x0, H * 0.86); c.fillStyle = rgba(C.apronDk, 0.5); c.fillRect(x0, 0, 2, H * 0.86);
      c.fillStyle = C.gold; c.fillRect(x0, H * 0.86, x1 - x0, 5); line(c, x0, H * 0.86 + 5, x1, H * 0.86 + 5, 1.6, C.goldDk, 'butt');       // (the apron's hem lies at the knee, where the shin's solid begins)
    } else {
      const r = rnd(7); for (let i = 0; i < 10; i++) { const x = r() * W, y = 14 + r() * 100; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ellipse(c, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.2, 1.8, F.cream, a); c.fill(); } ellipse(c, x, y, 2.2, 2.2, F.gold); c.fill(); }
    }
  });
  S.skirtS.wrapDraw((c, W, H) => {
    const base = fine ? F.lav : C.plum, dk = fine ? F.lavDk : C.plumDk, hi = fine ? F.lavHi : C.plumHi;
    c.fillStyle = grad(c, 0, 0, 0, H, [[0, base], [0.8, base], [1, dk]]); c.fillRect(0, 0, W, H);
    pleats(c, 0, 0, W, H, 83, 20, dk, hi, 0.5); strands(c, 0, 0, W, H, 91, 80, dk, 0.25);
    if (!fine) {
      c.fillStyle = rgba(C.plumDk, 0.8); c.fillRect(0, H * 0.8, W, H * 0.1); c.fillStyle = C.gold; c.fillRect(0, H * 0.9, W, 5); line(c, 0, H * 0.9 + 5, W, H * 0.9 + 5, 1.6, C.goldDk, 'butt'); line(c, 0, H * 0.9, W, H * 0.9, 1.4, C.goldHi, 'butt');
      c.fillStyle = C.plumDk; c.fillRect(0, H * 0.95, W, H * 0.05);
    } else {
      const y0 = H * 0.66; c.fillStyle = F.cream; c.fillRect(0, y0, W, H - y0); line(c, 0, y0, W, y0, 2.4, F.goldDk, 'butt');
      vine(c, 0, W, y0 + (H - y0) * 0.32, 2.5, 26, F.goldDk, F.lavDk, 15); vine(c, 0, W, y0 + (H - y0) * 0.68, 2.5, 26, F.goldDk, F.lav, 17);
      c.fillStyle = F.gold; c.fillRect(0, H - 6, W, 6); line(c, 0, H - 6, W, H - 6, 1.6, F.goldDk, 'butt');
    }
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
