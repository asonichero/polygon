// Polygon — the low-poly toolkit behind the characters (js/poly.js). Everything a 1996-2000 console model was made of, built in code: hand-placed rings lofted into limbs and torsos,
// a head grid with a flat face plate, a small texture atlas painted pixel by pixel (the faces swap their texture like Ocarina of Time's and Final Fantasy VII's did), and vertex-shaded
// (Gouraud) lighting through a plain MeshLambertMaterial. No asset files.
//
//   Atlas   one canvas per character; atlas.sheet(name, w, h) shelf-packs a painted rectangle ("sheet") and the meshes' UVs point into it.
//   Sheet   a pixel painter local to its rectangle: rect, px, grid (rows of characters through a palette), noise, shade bands.
//   Grid    rows x cols of positions with smooth normals; loft(rings) fills one from a stack of ellipses. patch() turns a run of its columns into a BufferGeometry, so one
//           surface can be cut into pieces (the head's face plate and the rest of the head) that light as one.
//   merge   joins geometries that share a bone, so a limb is a handful of draw calls rather than a dozen.
(function (root) {
'use strict';
const THREE = root.THREE, V3 = THREE.Vector3;
const Poly = root.Poly = root.Poly || {};

// ---------------------------------------------------------------------------------------------------------------------------
// Atlas and sheets
// ---------------------------------------------------------------------------------------------------------------------------
const EPS = 0.02;                 // (texels pulled in from a sheet's edge, so nearest filtering never reads a neighbour's colour)
class Sheet {
  constructor(atlas, name, x, y, w, h) { this.atlas = atlas; this.name = name; this.x = x; this.y = y; this.w = w; this.h = h; this.key = null; }
  get ctx() { return this.atlas.ctx; }
  // The atlas UV of a point (u, v in 0..1, v down the sheet from its top row).
  uv(u, v) { const A = this.atlas; return [(this.x + EPS + u * (this.w - 2 * EPS)) / A.w, 1 - (this.y + EPS + v * (this.h - 2 * EPS)) / A.h]; }
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
    if (this._x + w > this.w) { this._x = 0; this._y += this._row + 1; this._row = 0; }
    if (this._y + h > this.h || w > this.w) throw new Error('atlas full at sheet ' + name);
    const s = new Sheet(this, name, this._x, this._y, w, h); this._x += w + 1; this._row = Math.max(this._row, h); this.sheets[name] = s; return s;
  }
  // Pack a list of [name, w, h] tallest first (shelf packing wastes least that way); returns the sheets by name.
  pack(defs) {
    const out = {}; defs.slice().sort((a, b) => b[2] - a[2] || b[1] - a[1]).forEach(d => { out[d[0]] = this.sheet(d[0], d[1], d[2]); }); return out;
  }
  texture() {
    if (this.tex) return this.tex;
    const t = this.tex = new THREE.CanvasTexture(this.canvas);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding; return t;
  }
  touch() { if (this.tex) this.tex.needsUpdate = true; }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Grids and lofts
// ---------------------------------------------------------------------------------------------------------------------------
// A rows x cols lattice of points. wrap: the last column joins the first (a tube). Columns run round the tube, rows along it.
class Grid {
  constructor(rows, cols, wrap) { this.rows = rows; this.cols = cols; this.wrap = !!wrap; this.p = new Float32Array(rows * cols * 3); this.n = new Float32Array(rows * cols * 3); this.shade = new Float32Array(rows * cols).fill(1); this.apex = new Uint8Array(rows); }
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
        if (n.lengthSq() < 1e-10) { n.set(0, this.apex[i] === 2 ? -1 : 1, 0); if (this.apex[i] === 0) n.copy(p).sub(mid); }
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
    fixWinding(g);
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

// A tube from a stack of rings. rings: [{ y, rx, rz, cx, cz, shade, rot }] (any order along y; rows go in the order given). sides: columns round it (the first at the back, the middle at the front: the
// front of a body is +z, its left is +x). cap: { top: { h, steps }, bottom: { h, steps } } closes an end with a dome of that height.
function loft(o) {
  const N = o.sides || 8, rings = o.rings.map(r => Object.assign({ cx: 0, cz: 0, shade: 1 }, r));
  const extra = (end, spec, dir) => {
    if (!spec) return []; const steps = spec.steps || 2, out = [], r = end;
    for (let s = 1; s <= steps; s++) {
      const a = (s / steps) * Math.PI / 2, k = Math.cos(a);
      out.push({ y: r.y + dir * spec.h * Math.sin(a), rx: r.rx * k, rz: r.rz * k, cx: r.cx, cz: r.cz, shade: r.shade * (spec.shade === undefined ? 1 : 1 - (1 - spec.shade) * Math.sin(a)), apex: s === steps ? (dir > 0 ? 1 : 2) : 0 });
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
    g.apex[i] = r.apex || 0;
    for (let j = 0; j < N; j++) {
      const th = -Math.PI + 2 * Math.PI * j / N;
      g.set(i, j, r.cx + r.rx * Math.sin(th), r.y, r.cz + r.rz * Math.cos(th)); g.shade[i * N + j] = r.shade;
    }
  });
  g.rings = full; g.sides = N;
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
const triCount = obj => { let n = 0; obj.traverseVisible(o => { if (o.isMesh) { const g = o.geometry; n += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } }); return Math.round(n); };

Object.assign(Poly, { Atlas, Sheet, Grid, loft, loftUV, flatUV, paintShade, merge, place, ball, box, tube, triCount, mix, shadeHex, hex3, rgb, fixWinding });
})(typeof window !== 'undefined' ? window : globalThis);
