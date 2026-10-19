// Polygon — the painter's kit: small helpers over the 2D canvas for the vector shapes the figures' textures are made of (soft blobs, tapered strokes, curves, stitches, a little grain),
// and the colour arithmetic that goes with them. Everything takes a canvas context already clipped and translated to one sheet (see Sheet.draw in js/poly-geo.js).
(function (root) {
'use strict';
const P = root.Poly = root.Poly || {};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const hex3 = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const rgba = (h, a) => { const c = hex3(h); return `rgba(${c[0]},${c[1]},${c[2]},${a === undefined ? 1 : a})`; };
const mix = (a, b, t) => { const p = hex3(a), q = hex3(b); return '#' + [0, 1, 2].map(i => Math.round(clamp(p[i] + (q[i] - p[i]) * t, 0, 255)).toString(16).padStart(2, '0')).join(''); };
const shade = (h, k) => mix(h, k < 1 ? '#000000' : '#ffffff', Math.abs(1 - k));          // k < 1 darker, k > 1 lighter
const tint = (h, to, t) => mix(h, to, t);
const rnd = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// A linear gradient from (x0, y0) to (x1, y1); stops: [[t, colour], ...].
function grad(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [t, col] of stops) g.addColorStop(t, col); return g; }
// A soft ellipse: colour fading to nothing at its edge (hard: how much of the radius is solid, 0 to 1).
function blob(c, x, y, rx, ry, color, alpha, hard) {
  c.save(); c.translate(x, y); c.scale(1, ry / rx); const g = c.createRadialGradient(0, 0, rx * (hard || 0), 0, 0, rx); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill(); c.restore();
}
function ellipse(c, x, y, rx, ry, fill, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } }
function rrect(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function line(c, x0, y0, x1, y1, w, color, cap) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineWidth = w; c.strokeStyle = color; c.lineCap = cap || 'round'; c.stroke(); }
// A curve through points (Catmull-Rom) as a path; closed to join the ends.
function curve(c, pts, closed) {
  const n = pts.length; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  const at = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) c.closePath();
}
// A stroke whose width changes along a curve: pts through which the centre line runs, widths: [start, end] (or a function of t). Filled, so its ends are as pointed as you want them.
function taper(c, pts, w0, w1, color, mid) {
  const n = 28, cs = []; const at = (t) => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i, p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const q = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u); return [q(0), q(1)]; };
  for (let i = 0; i <= n; i++) cs.push(at(i / n));
  const L = [], Rr = [];
  for (let i = 0; i <= n; i++) {
    const a = cs[Math.max(0, i - 1)], b = cs[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, t = i / n;
    const w = (typeof w0 === 'function' ? w0(t) : (w0 + (w1 - w0) * t) * (mid ? (1 + (mid - 1) * Math.sin(Math.PI * t)) : 1)) / 2;
    L.push([cs[i][0] + nx * w, cs[i][1] + ny * w]); Rr.push([cs[i][0] - nx * w, cs[i][1] - ny * w]);
  }
  c.beginPath(); c.moveTo(L[0][0], L[0][1]); for (const p of L) c.lineTo(p[0], p[1]); for (let i = n; i >= 0; i--) c.lineTo(Rr[i][0], Rr[i][1]); c.closePath(); c.fillStyle = color; c.fill();
}
// Stitches along a line: short dashes.
function stitches(c, x0, y0, x1, y1, len, gap, w, color) {
  const d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d; c.lineWidth = w; c.strokeStyle = color; c.lineCap = 'round'; c.beginPath();
  for (let t = 0; t < d; t += len + gap) { const e = Math.min(d, t + len); c.moveTo(x0 + ux * t, y0 + uy * t); c.lineTo(x0 + ux * e, y0 + uy * e); } c.stroke();
}
// A little grain over a rectangle, so flat colour reads as cloth, leather or skin and not as plastic: many faint specks and short strokes.
function grain(c, x, y, w, h, seed, amount, light, dark, len) {
  const r = rnd(seed), n = Math.round(w * h / 60 * (amount === undefined ? 1 : amount)); len = len || 3;
  for (let i = 0; i < n; i++) { const px = x + r() * w, py = y + r() * h, l = r() * len; c.fillStyle = r() < 0.5 ? rgba(light || '#ffffff', 0.05 + r() * 0.05) : rgba(dark || '#000000', 0.05 + r() * 0.06); c.fillRect(px, py, 1 + l * r(), 1 + r() * 1.4); }
}
// Vertical (or other-direction) strands for fabric, fur and hair: faint lines along a direction.
function strands(c, x, y, w, h, seed, count, color, alpha, horizontal) {
  const r = rnd(seed); c.lineCap = 'round';
  for (let i = 0; i < count; i++) { const px = x + r() * w, py = y + r() * h, l = 6 + r() * 18; c.strokeStyle = rgba(color, alpha * (0.4 + r() * 0.8)); c.lineWidth = 0.8 + r() * 1.3; c.beginPath(); c.moveTo(px, py); if (horizontal) c.lineTo(px + l, py + (r() - 0.5) * 2); else c.lineTo(px + (r() - 0.5) * 2, py + l); c.stroke(); }
}
// Marks on the bare skin: soft pink and red patches that deepen with m (0-1), as flushed skin does, in a region (x, y, w, h).
function flush(c, x, y, w, h, m, seed) {
  if (m <= 0.01) return; const r = rnd(seed), n = Math.round(10 + 26 * Math.sqrt(m));
  for (let i = 0; i < n; i++) { const px = x + r() * w, py = y + r() * h, rad = (0.1 + r() * 0.22) * Math.min(w, h * 2); blob(c, px, py, rad, rad * (0.7 + r() * 0.6), '#e7667a', Math.min(0.6, 0.38 * Math.sqrt(m) * (0.5 + r())), 0.15); }
  c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = rgba('#e9707e', 0.34 * Math.sqrt(m)); c.fillRect(x, y, w, h); c.restore();
  for (let i = 0; i < Math.round(8 * m * m + 3 * m); i++) { const px = x + r() * w, py = y + r() * h, rad = (0.12 + r() * 0.2) * Math.min(w, h * 2); blob(c, px, py, rad, rad * (0.7 + r() * 0.5), '#b81f3c', 0.55 * m * m * (0.6 + r() * 0.6), 0.1); }
}

Object.assign(P, { Paint: { hex3, rgba, mix, shade, tint, rnd, grad, blob, ellipse, rrect, line, curve, taper, stitches, grain, strands, flush, clamp } });
})(typeof window !== 'undefined' ? window : globalThis);
