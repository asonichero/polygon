// Polygon — the face kit: the eyes, brows and mouths the figures' expressions are drawn with, as vector shapes on a face plate that shows 6.2 x 6.7 units at about 57 px to the unit (pal.s).
// Each takes a palette: { s, eyeScale, irisK, lashK, flick, white, iris, irisHi, irisDk, pupil, lash, brow, browHi, skinDk, lip, lipDk, teeth, mouthIn, tongue } (irisK, lashK and flick scale the iris and the lash line and lengthen its sweep at the outer corner). Positions are in sheet pixels; the shapes are in units.
(function (root) {
'use strict';
const P = root.Poly = root.Poly || {}, K = P.Paint, { rgba, ellipse, taper, grad, blob } = K;
// An eye. (X0, Y0): its centre in sheet pixels; side: -1 for the image's left eye (Jack's right), +1 for the other; the outer corner is toward the side of the face.
function eye(c, X0, Y0, side, o, pal) {
  const s = pal.s * (pal.eyeScale || 0.9), Pt = (x, y) => [X0 + side * x * s, Y0 - y * s];
  const up = o.up * 0.94, low = o.low, tilt = o.tilt || 0;
  const a = Pt(-0.8, -0.04 - tilt * 0.4), b = Pt(0.84, 0.1 + tilt);
  const path = () => { c.beginPath(); c.moveTo(...a); c.bezierCurveTo(...Pt(-0.5, up * 0.8 - tilt * 0.3), ...Pt(0.3, up), ...b); c.bezierCurveTo(...Pt(0.55, low * 0.8), ...Pt(-0.3, low), ...a); c.closePath(); };
  if (o.shut) {                                                                           // closed: a curve, curved up (a happy line) or down (screwed shut), with a crease
    const bend = o.shut;
    c.strokeStyle = pal.lash; c.lineCap = 'round';
    taper(c, [Pt(-0.85, -0.06), Pt(-0.2, 0.06 * bend), Pt(0.4, 0.04 * bend), Pt(0.9 + (pal.flick || 0), -0.12 + (pal.flick || 0) * 0.5)], 0.2 * s * (pal.lashK || 1), 0.1 * s * (pal.lashK || 1), pal.lash, 1.3);
    taper(c, [Pt(-0.8, 0.0 + 0.3), Pt(0, 0.3 + 0.12 * bend), Pt(0.8, 0.12 + 0.3)], 0.07 * s, 0.03 * s, rgba(pal.skinDk, 0.55));
    if (o.tears) tears(c, Pt, s);
    return;
  }
  // the eyeball: white, a soft shadow under the lid, the iris and pupil with their catchlights, all clipped to the eye's shape
  c.save(); path(); c.clip();
  c.fillStyle = pal.white; c.fillRect(X0 - 2 * s, Y0 - 2 * s, 4 * s, 4 * s);
  c.fillStyle = grad(c, 0, Pt(0, up)[1], 0, Pt(0, up)[1] + 0.55 * s, [[0, rgba('#8a5a6a', 0.45)], [1, rgba('#8a5a6a', 0)]]); c.fillRect(X0 - 2 * s, Pt(0, up)[1] - 0.2 * s, 4 * s, 0.9 * s);
  const ic = Pt(o.look || 0.06, -0.01 + (o.drop || 0)), ir = 0.56 * s * (pal.irisK || 1);
  const g = c.createRadialGradient(ic[0], ic[1] + 0.12 * s, ir * 0.1, ic[0], ic[1], ir); g.addColorStop(0, pal.irisHi); g.addColorStop(0.55, pal.iris); g.addColorStop(1, pal.irisDk); c.fillStyle = g; ellipse(c, ic[0], ic[1], ir, ir); c.fill();
  c.lineWidth = 0.07 * s; c.strokeStyle = rgba(pal.irisDk, 0.9); ellipse(c, ic[0], ic[1], ir - 0.03 * s, ir - 0.03 * s); c.stroke();
  ellipse(c, ic[0], ic[1], 0.23 * s, 0.25 * s, pal.pupil);
  const h1 = Pt((o.look || 0.06) + 0.2, 0.2 + (o.drop || 0)), h2 = Pt((o.look || 0.06) - 0.2, -0.2 + (o.drop || 0));
  ellipse(c, h1[0], h1[1], 0.15 * s, 0.17 * s, 'rgba(255,255,255,0.95)'); ellipse(c, h2[0], h2[1], 0.07 * s, 0.07 * s, 'rgba(255,255,255,0.75)');
  c.restore();
  // the lids: the upper lash line, thick and swept out at the corner; the lower lid a faint line; a crease above
  const bz = (t, p0, p1, p2, p3) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
  const c1 = Pt(-0.5, up * 0.8 - tilt * 0.3), c2 = Pt(0.3, up), upper = []; for (let i = 0; i <= 14; i++) upper.push(bz(i / 14, a, c1, c2, b));
  const fl = pal.flick || 0, lk = pal.lashK || 1; upper.push(Pt(1.02 + fl, 0.14 + tilt + fl * 0.6)); taper(c, upper, 0.2 * s * lk, 0.1 * s * lk, pal.lash, 1.4);
  const l1 = Pt(0.55, low * 0.8), l2 = Pt(-0.3, low), lower = []; for (let i = 0; i <= 14; i++) lower.push(bz(i / 14, b, l1, l2, a));
  taper(c, lower, 0.05 * s, 0.05 * s, rgba(pal.skinDk, 0.55));
  const crease = upper.slice(2, 13).map(p => [p[0] - side * 0.0, p[1] - 0.3 * s]); taper(c, crease, 0.05 * s, 0.03 * s, rgba(pal.skinDk, 0.5), 1.2);
  if (o.tears) tears(c, Pt, s);
}
function tears(c, Pt, s) {
  const x = 0.5, y = -0.55; c.beginPath(); c.moveTo(...Pt(x, y)); c.bezierCurveTo(...Pt(x - 0.32, y - 0.5), ...Pt(x - 0.3, y - 1.1), ...Pt(x, y - 1.15)); c.bezierCurveTo(...Pt(x + 0.3, y - 1.1), ...Pt(x + 0.32, y - 0.5), ...Pt(x, y)); c.closePath();
  c.fillStyle = 'rgba(150,210,250,0.9)'; c.fill(); c.lineWidth = 0.05 * s; c.strokeStyle = 'rgba(70,140,200,0.8)'; c.stroke(); ellipse(c, ...Pt(x - 0.08, y - 0.75), 0.05 * s, 0.14 * s, 'rgba(255,255,255,0.85)');
  c.fillStyle = 'rgba(150,210,250,0.55)'; c.beginPath(); c.ellipse(...Pt(0.1, -0.45), 0.7 * s, 0.1 * s, 0.1, 0, Math.PI * 2); c.fill();
}
// A brow: a thick, tapering stroke from the inner end through a mid point to the outer end; a, b, d are the heights of those three points (units, up positive).
function brow(c, X0, Y0, side, a, b, d, thick, pal) {
  const s = pal.s, Pt = (x, y) => [X0 + side * x * s, Y0 - y * s];
  taper(c, [Pt(-0.95, a), Pt(-0.2, b + 0.06), Pt(0.5, b), Pt(1.05, d)], (thick || 0.34) * s, 0.08 * s, pal.brow, 1.25);
  taper(c, [Pt(-0.8, a + 0.08), Pt(0, b + 0.14), Pt(0.6, b + 0.08)], 0.07 * s, 0.04 * s, rgba(pal.browHi || '#c07a42', 0.5));          // a lighter hair-line along the top
}
// A mouth from its corner, upper-lip and lower-lip heights (a quadratic through each), half-width and what is inside.
function mouth(c, X0, Y0, m, pal) {
  const s = pal.s, Pt = (x, y) => [X0 + x * s, Y0 - y * s], w = m.w, yc = m.yc, yu = m.yu, yl = m.yl;
  const shape = () => { c.beginPath(); c.moveTo(...Pt(-w, yc)); c.quadraticCurveTo(...Pt(0, 2 * yu - yc), ...Pt(w, yc)); c.quadraticCurveTo(...Pt(0, 2 * yl - yc), ...Pt(-w, yc)); c.closePath(); };
  if (m.line) {                                                                          // a pressed line: just the lips' edge
    c.beginPath(); c.moveTo(...Pt(-w, yc)); c.quadraticCurveTo(...Pt(0, 2 * yu - yc), ...Pt(w, yc)); c.lineWidth = 0.13 * s; c.strokeStyle = pal.lipDk; c.lineCap = 'round'; c.stroke();
    taper(c, [Pt(-w * 0.8, yu - 0.2), Pt(0, yu - 0.28), Pt(w * 0.8, yu - 0.2)], 0.14 * s, 0.05 * s, rgba(pal.lip, 0.8), 1.5); return;
  }
  shape(); c.fillStyle = m.open ? pal.mouthIn : pal.lip; c.fill();
  if (m.open) {
    c.save(); shape(); c.clip();
    if (m.teeth) { c.fillStyle = pal.teeth; c.fillRect(X0 - w * s, Y0 - (yu + 0.05) * s, 2 * w * s, (m.teeth + 0.05) * s); if (m.teeth > 0.2 && m.rows) { c.fillStyle = rgba('#b9a98a', 0.8); for (let i = -3; i <= 3; i++) c.fillRect(X0 + i * w * s / 3.5 - 1, Y0 - (yu + 0.05) * s, 2, (m.teeth + 0.05) * s); } }
    if (m.lowerTeeth) { c.fillStyle = pal.teeth; c.fillRect(X0 - w * s, Y0 - (yl + m.lowerTeeth) * s, 2 * w * s, m.lowerTeeth * s + 2); c.fillStyle = rgba('#b9a98a', 0.7); c.fillRect(X0 - w * s, Y0 - (yl + m.lowerTeeth) * s - 1, 2 * w * s, 2); }
    if (m.tongue) blob(c, ...Pt(0, yl + 0.18), 0.6 * s, 0.34 * s, pal.tongue, 1, 0.5);
    c.restore();
    shape(); c.lineWidth = 0.1 * s; c.strokeStyle = pal.lipDk; c.lineJoin = 'round'; c.stroke();
  } else {
    blob(c, ...Pt(0, (yu + yl) / 2 - 0.02), w * 0.55 * s, 0.1 * s, '#ffffff', 0.35, 0.2);        // the lip's shine
    c.beginPath(); c.moveTo(...Pt(-w, yc)); c.quadraticCurveTo(...Pt(0, 2 * yu - yc), ...Pt(w, yc)); c.lineWidth = 0.11 * s; c.strokeStyle = pal.lipDk; c.lineCap = 'round'; c.stroke();
  }
  if (m.dimples) for (const sg of [-1, 1]) { c.beginPath(); c.arc(...Pt(sg * (w + 0.12), yc + 0.12), 0.16 * s, sg > 0 ? Math.PI * 0.55 : Math.PI * 1.45 - Math.PI * 0.9, sg > 0 ? Math.PI * 1.45 : Math.PI * 1.45 - Math.PI * 0.1 + 0.2); c.lineWidth = 0.06 * s; c.strokeStyle = rgba(pal.skinDk, 0.7); c.stroke(); }
}


P.Face = { eye, brow, mouth, tears };
})(typeof window !== 'undefined' ? window : globalThis);
