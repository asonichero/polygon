// Polygon — the toolkit behind the characters (js/poly.js): hand-placed rings smoothed into limbs and torsos, a head grid with a flat face plate, sweeps for locks of hair, rounded boxes,
// and a texture atlas painted in code with vector shapes (curves, gradients, soft edges) so faces and clothes come out crisp at any distance. Lighting, outline and post are js/look.js.
//
//   Atlas   one canvas per character; atlas.pack([[name, w, h], ...]) packs painted rectangles ("sheets") and the meshes' UVs point into them.
//   Sheet   a painter local to its rectangle: draw(fn) hands a clipped, translated 2D context to fn; wrapDraw(fn) repeats it across the seam of a sheet that wraps round a tube.
//   Grid    rows x cols of positions with smooth normals; loft(rings) fills one from a stack of rings (smoothed, with a squareness exponent), sweep(path) from a curved spine. patch() turns a
//           run of its columns into a BufferGeometry, so one surface can be cut into pieces (the head's face plate and the rest of the head) that light as one.
//   merge   joins geometries that share a bone.
(function (root) {
'use strict';
const THREE = root.THREE, V3 = THREE.Vector3;
const Poly = root.Poly = root.Poly || {};

// ---------------------------------------------------------------------------------------------------------------------------
// Atlas and sheets
// ---------------------------------------------------------------------------------------------------------------------------
const EPS = 0.6, PAD = 6;         // (texels pulled in from a sheet's edge, and the gap left between sheets: mipmaps blur a little way across a border, so the gap is filled with the edge's own colour, see bleed)
class Sheet {
  constructor(atlas, name, x, y, w, h) { this.atlas = atlas; this.name = name; this.x = x; this.y = y; this.w = w; this.h = h; this.key = null; }
  get ctx() { return this.atlas.ctx; }
  // The atlas UV of a point (u, v in 0..1, v down the sheet from its top row).
  uv(u, v) { const A = this.atlas; return [(this.x + EPS + u * (this.w - 2 * EPS)) / A.w, 1 - (this.y + EPS + v * (this.h - 2 * EPS)) / A.h]; }
  // Fill the gap round the sheet with its own edge colours (the sides that wrap round a tube take the colours of the opposite side), so mip levels never pick up a neighbour.
  bleed(wrapX) {
    const c = this.ctx, A = this.atlas, n = PAD - 1, x = this.x, y = this.y, w = this.w, h = this.h, cv = A.canvas;
    const sx0 = wrapX ? w - 1 : 0, sx1 = wrapX ? 0 : w - 1;
    if (x >= n) c.drawImage(cv, x + sx0, y, 1, h, x - n, y, n, h); if (x + w + n <= A.w) c.drawImage(cv, x + sx1, y, 1, h, x + w, y, n, h);
    if (y >= n) c.drawImage(cv, x - Math.min(n, x), y, w + 2 * n, 1, x - Math.min(n, x), y - n, w + 2 * n, n); if (y + h + n <= A.h) c.drawImage(cv, x - Math.min(n, x), y + h - 1, w + 2 * n, 1, x - Math.min(n, x), y + h, w + 2 * n, n);
    return this;
  }
  // The UV at the centre of a texel (x, y), for parts that wear one flat colour.
  texel(x, y) { const A = this.atlas; return [(this.x + x + 0.5) / A.w, 1 - (this.y + y + 0.5) / A.h]; }
  clear() { this.ctx.clearRect(this.x, this.y, this.w, this.h); return this; }
  rect(x, y, w, h, c) {
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    if (x1 <= x0 || y1 <= y0) return this;
    this.ctx.fillStyle = c; this.ctx.fillRect(this.x + x0, this.y + y0, x1 - x0, y1 - y0); return this;
  }
  fill(c) { return this.rect(0, 0, this.w, this.h, c); }
  px(x, y, c) { return this.rect(x, y, 1, 1, c); }
  hline(y, c, x0 = 0, x1 = this.w) { return this.rect(x0, y, x1 - x0, 1, c); }
  vline(x, c, y0 = 0, y1 = this.h) { return this.rect(x, y0, 1, y1 - y0, c); }
  // A rectangle that wraps round the sheet's left and right edges (the sheets of tubes wrap at the back).
  wrap(x, y, w, h, c) { x = ((x % this.w) + this.w) % this.w; this.rect(x, y, w, h, c); if (x + w > this.w) this.rect(x - this.w, y, w, h, c); return this; }
  // Pixel art: rows of characters, each looked up in pal ('.' leaves the pixel alone).
  grid(rows, pal, ox = 0, oy = 0) {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.' && ch !== ' ' && pal[ch]) this.px(ox + i, oy + j, pal[ch]); } });
    return this;
  }
  // The same, mirrored left to right.
  gridMirror(rows, pal, ox = 0, oy = 0) { return this.grid(rows.map(r => r.split('').reverse().join('')), pal, ox, oy); }
  // A vertical blend between two colours over rows y0..y1 (hex strings), one row at a time.
  gradV(c0, c1, y0 = 0, y1 = this.h) {
    const a = hex3(c0), b = hex3(c1);
    for (let y = y0; y < y1; y++) { const t = y1 - y0 <= 1 ? 0 : (y - y0) / (y1 - y0 - 1); this.rect(0, y, this.w, 1, rgb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)); }
    return this;
  }
  // A little deterministic grain on every opaque pixel, so flat colours read as cloth, leather and skin.
  noise(seed, amount, skip) {
    const img = this.ctx.getImageData(this.x, this.y, this.w, this.h), d = img.data; let s = seed >>> 0;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 4; s = (s * 1664525 + 1013904223) >>> 0;
      if (d[i + 3] === 0 || (skip && skip(x, y))) continue;
      const k = ((s / 4294967296) - 0.5) * 2 * amount;
      d[i] = clamp8(d[i] + k); d[i + 1] = clamp8(d[i + 1] + k); d[i + 2] = clamp8(d[i + 2] + k);
    }
    this.ctx.putImageData(img, this.x, this.y); return this;
  }
  // Vector painting: fn(ctx, w, h) gets the atlas context clipped to this sheet and translated so (0, 0) is its top-left corner.
  draw(fn) { const c = this.ctx; c.save(); c.beginPath(); c.rect(this.x, this.y, this.w, this.h); c.clip(); c.translate(this.x, this.y); try { fn(c, this.w, this.h); } finally { c.restore(); } return this; }
  // The same, drawn three times (at 0 and one sheet-width either side) so shapes that cross the seam of a tube's sheet carry across it.
  wrapDraw(fn) { for (const dx of [0, -this.w, this.w]) this.draw((c, w, h) => { c.translate(dx, 0); fn(c, w, h); }); return this; }
  // Ordered dither between the sheet's current pixels and a colour, for soft transitions in a few colours (the way a 4-bit texture does it).
  dither(x, y, w, h, c, amount) {
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bayer[((y + j) & 3) * 4 + ((x + i) & 3)] / 16 < amount) this.px(x + i, y + j, c);
    return this;
  }
}
const clamp8 = v => Math.max(0, Math.min(255, v));
const hex3 = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const mix = (a, b, t) => { const p = hex3(a), q = hex3(b); return rgb(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); };
const shadeHex = (h, k) => { const p = hex3(h); return rgb(clamp8(p[0] * k), clamp8(p[1] * k), clamp8(p[2] * k)); };

class Atlas {
  constructor(w, h) {
    this.w = w; this.h = h; this.canvas = document.createElement('canvas'); this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }); this.ctx.imageSmoothingEnabled = false;
    this.sheets = {}; this._x = 0; this._y = 0; this._row = 0; this.tex = null;
  }
  // Shelf-pack a sheet: left to right along a row, a new row when it runs out.
  sheet(name, w, h) {
    if (this._x + w > this.w) { this._x = 0; this._y += this._row + PAD; this._row = 0; }
    if (this._y + h > this.h || w > this.w) throw new Error('atlas full at sheet ' + name);
    const s = new Sheet(this, name, this._x, this._y, w, h); this._x += w + PAD; this._row = Math.max(this._row, h); this.sheets[name] = s; return s;
  }
  // Pack a list of [name, w, h] with MaxRects (best short side fit): the largest first, each into the free rectangle it leaves least room beside, a PAD gap kept round every sheet. Returns the sheets by name.
  pack(defs) {
    const out = {}, free = [{ x: 0, y: 0, w: this.w + PAD, h: this.h + PAD }];
    const items = defs.slice().sort((a, b) => Math.max(b[1], b[2]) - Math.max(a[1], a[2]) || b[1] * b[2] - a[1] * a[2]);
    for (const [name, w, h] of items) {
      const W = w + PAD, H = h + PAD; let best = null;
      for (const f of free) if (W <= f.w && H <= f.h) { const sc = Math.min(f.w - W, f.h - H), sl = Math.max(f.w - W, f.h - H); if (!best || sc < best.sc || (sc === best.sc && sl < best.sl)) best = { f, sc, sl }; }
      if (!best) throw new Error('atlas full at sheet ' + name);
      const px = best.f.x, py = best.f.y; out[name] = this.sheets[name] = new Sheet(this, name, px, py, w, h);
      const placed = { x: px, y: py, w: W, h: H }, next = [];
      for (const f of free) {                                                           // (cut every free rectangle the new sheet overlaps into what is left of it)
        if (placed.x >= f.x + f.w || placed.x + placed.w <= f.x || placed.y >= f.y + f.h || placed.y + placed.h <= f.y) { next.push(f); continue; }
        if (placed.x > f.x) next.push({ x: f.x, y: f.y, w: placed.x - f.x, h: f.h });
        if (placed.x + placed.w < f.x + f.w) next.push({ x: placed.x + placed.w, y: f.y, w: f.x + f.w - placed.x - placed.w, h: f.h });
        if (placed.y > f.y) next.push({ x: f.x, y: f.y, w: f.w, h: placed.y - f.y });
        if (placed.y + placed.h < f.y + f.h) next.push({ x: f.x, y: placed.y + placed.h, w: f.w, h: f.y + f.h - placed.y - placed.h });
      }
      free.length = 0; for (const f of next) if (!next.some(g => g !== f && f.x >= g.x && f.y >= g.y && f.x + f.w <= g.x + g.w && f.y + f.h <= g.y + g.h)) free.push(f);      // (and drop those that lie inside another)
    }
    return out;
  }
  texture() {
    if (this.tex) return this.tex;
    const t = this.tex = new THREE.CanvasTexture(this.canvas);
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; return t;
  }
  touch() { if (this.tex) this.tex.needsUpdate = true; }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Grids and lofts
// ---------------------------------------------------------------------------------------------------------------------------
// A rows x cols lattice of points. wrap: the last column joins the first (a tube). Columns run round the tube, rows along it.
class Grid {
  constructor(rows, cols, wrap) { this.rows = rows; this.cols = cols; this.wrap = !!wrap; this.p = new Float32Array(rows * cols * 3); this.n = new Float32Array(rows * cols * 3); this.shade = new Float32Array(rows * cols).fill(1); this.apex = new Uint8Array(rows); this.apexDir = {}; }
  set(i, j, x, y, z) { const k = (i * this.cols + j) * 3; this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z; return this; }
  get(i, j, out) { const k = (i * this.cols + j) * 3; return (out || new V3()).set(this.p[k], this.p[k + 1], this.p[k + 2]); }
  col(j) { return this.wrap ? ((j % this.cols) + this.cols) % this.cols : Math.max(0, Math.min(this.cols - 1, j)); }
  // Smooth normals from the neighbours along both directions (the outward side is whichever points away from the middle of its row).
  computeNormals() {
    const a = new V3(), b = new V3(), c = new V3(), d = new V3(), du = new V3(), dv = new V3(), n = new V3(), mid = new V3(), q = new V3();
    for (let i = 0; i < this.rows; i++) {
      mid.set(0, 0, 0); for (let j = 0; j < this.cols; j++) mid.add(this.get(i, j, q)); mid.multiplyScalar(1 / this.cols);
      for (let j = 0; j < this.cols; j++) {
        const i0 = Math.max(0, i - 1), i1 = Math.min(this.rows - 1, i + 1);
        this.get(i, this.col(j - 1), a); this.get(i, this.col(j + 1), b); du.subVectors(b, a);
        this.get(i0, j, c); this.get(i1, j, d); dv.subVectors(d, c);
        n.crossVectors(dv, du);
        const p = this.get(i, j, q);
        if (n.lengthSq() < 1e-10) { const d = this.apexDir[i]; if (d) n.set(d[0], d[1], d[2]); else { n.set(0, this.apex[i] === 2 ? -1 : 1, 0); if (this.apex[i] === 0) n.copy(p).sub(mid); } }
        else if (n.dot(p.clone().sub(mid)) < 0 && this.apex[i] === 0) n.negate();
        n.normalize(); const k = (i * this.cols + j) * 3; this.n[k] = n.x; this.n[k + 1] = n.y; this.n[k + 2] = n.z;
      }
    }
    return this;
  }
  // A BufferGeometry from `count` columns starting at column j0 (so count + 1 vertex columns, the last one a copy of the first when the patch goes right round). uvFn(i, k, x, y, z, j) gives the UV.
  patch(j0, count, uvFn, o) {
    o = o || {};
    const R = this.rows, C = count + 1, pos = new Float32Array(R * C * 3), nor = new Float32Array(R * C * 3), uv = new Float32Array(R * C * 2), col = new Float32Array(R * C * 3);
    for (let i = 0; i < R; i++) for (let k = 0; k < C; k++) {
      const j = this.col(j0 + k), s = (i * this.cols + j) * 3, t = (i * C + k) * 3, sh = this.shade[i * this.cols + j];
      pos[t] = this.p[s]; pos[t + 1] = this.p[s + 1]; pos[t + 2] = this.p[s + 2]; nor[t] = this.n[s]; nor[t + 1] = this.n[s + 1]; nor[t + 2] = this.n[s + 2];
      col[t] = col[t + 1] = col[t + 2] = sh;
      const u = uvFn(i, k, pos[t], pos[t + 1], pos[t + 2], j); uv[(i * C + k) * 2] = u[0]; uv[(i * C + k) * 2 + 1] = u[1];
    }
    const idx = [], same = (a, b) => Math.abs(pos[a * 3] - pos[b * 3]) + Math.abs(pos[a * 3 + 1] - pos[b * 3 + 1]) + Math.abs(pos[a * 3 + 2] - pos[b * 3 + 2]) < 1e-5;
    const flip = !!o.flip;
    for (let i = 0; i < R - 1; i++) for (let k = 0; k < C - 1; k++) {
      const a = i * C + k, b = i * C + k + 1, c = (i + 1) * C + k, d = (i + 1) * C + k + 1;
      const t1 = !(same(a, b) || same(a, c) || same(b, c)), t2 = !(same(b, d) || same(b, c) || same(c, d));
      if (!flip) { if (t1) idx.push(a, c, b); if (t2) idx.push(b, c, d); } else { if (t1) idx.push(a, b, c); if (t2) idx.push(b, d, c); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
    fixWinding(g); g.userData.smoothNormals = true;
    return g;
  }
}
// Make the triangles face the way the smooth normals do (a lofted surface is built bottom to top; some are flipped by the caller's ring order).
function fixWinding(g) {
  const P = g.attributes.position, N = g.attributes.normal, I = g.index.array; let agree = 0, total = 0;
  const a = new V3(), b = new V3(), c = new V3(), n = new V3();
  for (let t = 0; t < I.length; t += 3) {
    a.fromBufferAttribute(P, I[t]); b.fromBufferAttribute(P, I[t + 1]); c.fromBufferAttribute(P, I[t + 2]);
    n.crossVectors(b.sub(a), c.sub(a)); if (n.lengthSq() < 1e-12) continue;
    const vn = new V3().fromBufferAttribute(N, I[t]).add(new V3().fromBufferAttribute(N, I[t + 1])).add(new V3().fromBufferAttribute(N, I[t + 2]));
    total++; if (n.dot(vn) > 0) agree++;
  }
  if (total && agree < total / 2) { for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; } g.index.needsUpdate = true; }
}

// Smooth a ring table: a Catmull-Rom curve through the rings, k extra rings between each pair (every number a ring has is interpolated, radii kept above zero).
function profile(rings, k) {
  if (!k) return rings;
  const keys = ['y', 'rx', 'rz', 'cx', 'cz', 'shade', 'p'], dflt = { p: 2, shade: 1, cx: 0, cz: 0 }, n = rings.length, out = [];
  const val = (i, key) => { const r = rings[Math.max(0, Math.min(n - 1, i))], v = r[key]; return v === undefined ? (dflt[key] || 0) : v; };
  const cr = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  for (let i = 0; i < n - 1; i++) for (let s = 0; s <= k; s++) {
    const t = s / (k + 1), o = {};
    for (const key of keys) o[key] = cr(val(i - 1, key), val(i, key), val(i + 1, key), val(i + 2, key), t);
    o.rx = Math.max(0.02, o.rx); o.rz = Math.max(0.02, o.rz); out.push(o);
  }
  out.push(Object.assign({ cx: 0, cz: 0, shade: 1, p: 2 }, rings[n - 1]));
  return out;
}

// A tube from a stack of rings. rings: [{ y, rx, rz, cx, cz, shade, p }] (any order along y; rows go in the order given; p is the squareness of the cross-section: 2 an ellipse, higher a rounded
// square). sides: columns round it (the first at the back, the middle at the front: the front of a body is +z, its left is +x). smooth: k extra rings between each pair, on a smooth curve.
// cap: { top: { h, steps }, bottom: { h, steps } } closes an end with a dome of that height.
function loft(o) {
  const N = o.sides || 8, rings = profile(o.rings.map(r => Object.assign({ cx: 0, cz: 0, shade: 1, p: 2 }, r)), o.smooth || 0);
  const extra = (end, spec, dir) => {
    if (!spec) return []; const steps = spec.steps || 2, out = [], r = end;
    for (let s = 1; s <= steps; s++) {
      const a = (s / steps) * Math.PI / 2, k = Math.cos(a);
      out.push({ y: r.y + dir * spec.h * Math.sin(a), rx: r.rx * k, rz: r.rz * k, cx: r.cx, cz: r.cz, p: r.p, shade: r.shade * (spec.shade === undefined ? 1 : 1 - (1 - spec.shade) * Math.sin(a)), apex: s === steps ? (dir > 0 ? 1 : 2) : 0 });
    }
    return out;
  };
  // cap.top closes the physically higher end, cap.bottom the lower one, whichever way the rings are listed.
  const cap = o.cap || {}, asc = rings[0].y <= rings[rings.length - 1].y;
  const topRing = asc ? rings[rings.length - 1] : rings[0], botRing = asc ? rings[0] : rings[rings.length - 1];
  const capTop = extra(topRing, cap.top, 1), capBot = extra(botRing, cap.bottom, -1);
  const full = asc ? capBot.slice().reverse().concat(rings, capTop) : capTop.slice().reverse().concat(rings, capBot);
  const g = new Grid(full.length, N, true);
  full.forEach((r, i) => {
    g.apex[i] = r.apex || 0; const ex = 2 / (r.p || 2);
    for (let j = 0; j < N; j++) {
      const th = -Math.PI + 2 * Math.PI * j / N, sn = Math.sin(th), cs = Math.cos(th);
      g.set(i, j, r.cx + r.rx * Math.sign(sn) * Math.pow(Math.abs(sn), ex), r.y, r.cz + r.rz * Math.sign(cs) * Math.pow(Math.abs(cs), ex)); g.shade[i * N + j] = r.shade;
    }
  });
  g.rings = full; g.sides = N;
  return g.computeNormals();
}
// A tube along a curved spine, for locks of hair, tails and the like. o: { path: [[x,y,z], ...] (a smooth curve is drawn through them), steps: rings along it, sides, w: [start, end] width, t: [start, end]
// thickness (thickness is along `up`, the way the lock lies on what it covers), up: [x,y,z], taper: the width profile exponent, tip: 'point' | 'round' | 'open' }.
function sweep(o) {
  const pts = o.path.map(a => new V3(a[0], a[1], a[2])), n = pts.length, steps = o.steps || 8, N = o.sides || 8, up0 = new V3(...(o.up || [0, 1, 0]));
  const cr = (p0, p1, p2, p3, t) => p1.clone().multiplyScalar(2).add(p2.clone().sub(p0).multiplyScalar(t)).add(p0.clone().multiplyScalar(2).sub(p1.clone().multiplyScalar(5)).add(p2.clone().multiplyScalar(4)).sub(p3).multiplyScalar(t * t)).add(p0.clone().negate().add(p1.clone().multiplyScalar(3)).sub(p2.clone().multiplyScalar(3)).add(p3).multiplyScalar(t * t * t)).multiplyScalar(0.5);
  const at = u => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), t = f - i; return cr(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(n - 1, i + 2)], t); };
  const w = o.w || [1, 0.2], th = o.t || w, taper = o.taper === undefined ? 1 : o.taper, tip = o.tip || 'point', extraRows = tip === 'point' ? 1 : tip === 'round' ? 2 : 0;
  const rows = steps + 1 + extraRows, g = new Grid(rows, N, true), P_ = [], T_ = [];
  for (let i = 0; i <= steps; i++) P_.push(at(i / steps));
  for (let i = 0; i <= steps; i++) { const a = P_[Math.max(0, i - 1)], b = P_[Math.min(steps, i + 1)]; T_.push(b.clone().sub(a).normalize()); }
  let nrm = up0.clone().sub(T_[0].clone().multiplyScalar(up0.dot(T_[0]))).normalize();
  if (!isFinite(nrm.x)) nrm.set(1, 0, 0);
  const frames = [];
  for (let i = 0; i <= steps; i++) {                            // parallel transport the thickness axis along the spine, staying as near `up` as it can
    const tg = T_[i]; nrm = nrm.sub(tg.clone().multiplyScalar(nrm.dot(tg))); if (nrm.lengthSq() < 1e-8) nrm.set(0, 1, 0).cross(tg); nrm.normalize();
    const want = up0.clone().sub(tg.clone().multiplyScalar(up0.dot(tg))); if (want.lengthSq() > 1e-6) nrm.lerp(want.normalize(), 0.3).normalize();
    frames.push({ n: nrm.clone(), b: new V3().crossVectors(tg, nrm).normalize() });
  }
  for (let i = 0; i < rows; i++) {
    const k = Math.min(i, steps), u = k / steps, f = frames[k], c = P_[k];
    let sw = (w[0] + (w[1] - w[0]) * Math.pow(u, taper)), st = (th[0] + (th[1] - th[0]) * Math.pow(u, taper)), cc = c.clone();
    if (i > steps) { const e = (i - steps) / extraRows; if (tip === 'point') { sw = st = 0; cc.addScaledVector(T_[steps], Math.max(w[1], th[1]) * 0.8); } else { const a = e * Math.PI / 2; cc.addScaledVector(T_[steps], Math.max(sw, st) * 0.9 * Math.sin(a)); sw *= Math.cos(a); st *= Math.cos(a); if (e >= 1) { sw = st = 0; } } }
    if (sw <= 1e-5 && st <= 1e-5) { g.apex[i] = 1; g.apexDir[i] = T_[steps].toArray(); }
    for (let j = 0; j < N; j++) { const a = -Math.PI + 2 * Math.PI * j / N, cs = Math.cos(a), sn = Math.sin(a); g.set(i, j, cc.x + f.b.x * sw * sn + f.n.x * st * cs, cc.y + f.b.y * sw * sn + f.n.y * st * cs, cc.z + f.b.z * sw * sn + f.n.z * st * cs); }
  }
  g.rows = rows; g.sides = N; g.pathPoints = P_;
  return g.computeNormals();
}
// The standard UV for a loft: u round the tube (0.5 at the front), v down the sheet from the top ring, by distance along the surface (or by ring index with even: true).
function loftUV(g, sheet, o) {
  o = o || {}; const v0 = o.v0 || 0, v1 = o.v1 === undefined ? 1 : o.v1, u0 = o.u0 || 0, u1 = o.u1 === undefined ? 1 : o.u1;
  const R = g.rows, N = g.cols, arc = [0];
  for (let i = 1; i < R; i++) { const a = g.get(i - 1, 0), b = g.get(i, 0); arc.push(arc[i - 1] + (o.even ? 1 : a.distanceTo(b))); }
  const total = arc[R - 1] || 1, top = o.flipV ? 1 : 0;
  // rows run in the order given; the sheet's top is whichever end has the greater y (so a limb's sheet reads shoulder to hand whichever way its rings were listed)
  const up = g.get(0, 0).y >= g.get(R - 1, 0).y;
  return (i, k) => {
    const t = (up ? arc[i] : total - arc[i]) / total;
    return sheet.uv(u0 + (u1 - u0) * (k / (o.count || N)), v0 + (v1 - v0) * t);
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Small shapes, transforms and merging
// ---------------------------------------------------------------------------------------------------------------------------
function flatUV(geo, uv) { const A = geo.attributes.uv; for (let i = 0; i < A.count; i++) A.setXY(i, uv[0], uv[1]); return geo; }
function paintShade(geo, k) { const C = geo.attributes.color; for (let i = 0; i < C.count; i++) C.setXYZ(i, k, k, k); return geo; }
// Make sure a geometry has the attributes merging needs (a color of 1 if it has none).
function ensure(geo) {
  if (!geo.attributes.color) { const c = new Float32Array(geo.attributes.position.count * 3).fill(1); geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  if (!geo.index) { const n = geo.attributes.position.count, idx = []; for (let i = 0; i < n; i++) idx.push(i); geo.setIndex(idx); }
  return geo;
}
function merge(list) {
  const P = [], N = [], U = [], C = [], I = []; let base = 0;
  for (const g0 of list) {
    const g = ensure(g0), p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); U.push(u.getX(i), u.getY(i)); C.push(c.getX(i), c.getY(i), c.getZ(i)); }
    for (const x of g.index.array) I.push(base + x); base += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); out.setIndex(I);
  out.userData.smoothNormals = list.every(g => g.userData && g.userData.smoothNormals);
  out.computeBoundingSphere(); return out;
}
const place = (geo, x, y, z, rx, ry, rz) => {
  if (rx || ry || rz) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')));
  geo.translate(x || 0, y || 0, z || 0); return geo;
};
// A low-poly ellipsoid (sides x rings), for caps, knuckles, buns and the like. UVs all on one texel unless a uvFn is given.
function ball(rx, ry, rz, sides, rings, uvOrFn, shade) {
  const R = [];
  for (let i = 0; i <= rings; i++) { const a = -Math.PI / 2 + Math.PI * i / rings, k = Math.cos(a); R.push({ y: ry * Math.sin(a), rx: rx * k, rz: rz * k, shade: shade === undefined ? 1 : shade, apex: i === 0 ? 2 : i === rings ? 1 : 0 }); }
  const g = loft({ rings: R.map(r => ({ y: r.y, rx: r.rx, rz: r.rz, shade: r.shade })), sides });
  g.apex[0] = 2; g.apex[rings] = 1; g.computeNormals();
  const geo = g.patch(0, sides, Array.isArray(uvOrFn) ? () => uvOrFn : uvOrFn);
  return geo;
}
// A box with rounded-looking chamfers is not needed here: plain boxes for the flat things (buckles, chair parts), one texel each.
function box(w, h, d, uv) { const g = new THREE.BoxGeometry(w, h, d); const c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return uv ? flatUV(g, uv) : g; }
// A cylinder (tube) along y, one texel.
function tube(r0, r1, h, sides, uv) { const g = new THREE.CylinderGeometry(r1, r0, h, sides || 8, 1); const c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return uv ? flatUV(g, uv) : g; }
const triCount = obj => { let n = 0; obj.traverseVisible(o => { if (o.isMesh && !o.userData.hull) { const g = o.geometry; n += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } }); return Math.round(n); };

// A box with soft, rounded edges (w x h x d, the corners rounded to radius r), for props. Each face is a grid whose lines crowd into the rounded edges; every vertex is pushed out to the
// rounded surface, so the normals are exact. UVs are not set: use boxUV to lay a tiling texture on it.
function softBox(w, h, d, r, steps) {
  r = Math.min(r === undefined ? Math.min(w, h, d) * 0.18 : r, Math.min(w, h, d) / 2 - 0.01); steps = steps || 3;
  const half = [w / 2, h / 2, d / 2], axisPts = L => { const a = L / 2, up = []; for (let i = 0; i <= steps; i++) up.push(a - r + r * Math.tan(i / steps * Math.PI / 4)); return up.slice().reverse().map(v => -v).concat(up); };
  const lists = half.map((a, k) => axisPts([w, h, d][k])), P = [], N = [], U = [], C = [], I = [], q = new V3(), inner = new V3(), n = new V3();
  for (let axis = 0; axis < 3; axis++) for (const sg of [1, -1]) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3, A = lists[u], B = lists[v], base = P.length / 3;
    for (let j = 0; j < B.length; j++) for (let i = 0; i < A.length; i++) {
      q.set(0, 0, 0); q.setComponent(axis, sg * half[axis]); q.setComponent(u, A[i]); q.setComponent(v, B[j]);
      for (let k = 0; k < 3; k++) inner.setComponent(k, Math.max(-(half[k] - r), Math.min(half[k] - r, q.getComponent(k))));
      n.subVectors(q, inner).normalize(); q.copy(inner).addScaledVector(n, r);
      P.push(q.x, q.y, q.z); N.push(n.x, n.y, n.z); U.push(0, 0); C.push(1, 1, 1);
    }
    for (let j = 0; j < B.length - 1; j++) for (let i = 0; i < A.length - 1; i++) { const a0 = base + j * A.length + i, b0 = a0 + 1, c0 = a0 + A.length, d0 = c0 + 1; if (sg > 0) I.push(a0, b0, c0, b0, d0, c0); else I.push(a0, c0, b0, b0, c0, d0); }          // (the winding that faces outward, for the + and - side of each axis)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  g.userData.smoothNormals = true; g.computeBoundingSphere(); return g;
}
// Tile a texture over a prop by world position: each vertex takes its UV from the two axes its normal points least along, `scale` units to a repeat.
function boxUV(geo, scale) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / scale, p.getZ(i) / scale); else if (ax >= az) uv.setXY(i, p.getZ(i) / scale, p.getY(i) / scale); else uv.setXY(i, p.getX(i) / scale, p.getY(i) / scale);
  }
  uv.needsUpdate = true; return geo;
}
Object.assign(Poly, { Atlas, Sheet, Grid, loft, sweep, profile, softBox, boxUV, loftUV, flatUV, paintShade, merge, place, ball, box, tube, triCount, mix, shadeHex, hex3, rgb, fixWinding });
})(typeof window !== 'undefined' ? window : globalThis);
