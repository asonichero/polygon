// Polygon — the props the figures use: the chair Gerda sits on, the table, the paddle and the birch. Built like the figures (js/poly.js): smooth rounded solids in the toon material, inked,
// with painted wood. Model units: 1 unit = 1 old skin pixel, a standing figure is 35 tall.
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly = root.Poly || {}, K = P.Paint, { loft, ball, merge, place } = P, R = P.R, clamp = P.clamp;

// ---------------------------------------------------------------------------------------------------------------------------
// Painted wood: boards with long grain, rings and a knot, drawn once per palette. The grain runs along u (across a prop's top) and tiles in both directions.
// ---------------------------------------------------------------------------------------------------------------------------
const woodCache = {};
function woodTexture(base, o) {
  o = o || {}; const key = base + '|' + (o.seed || 1) + '|' + (o.boards || 0); if (woodCache[key]) return woodCache[key];
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), r = K.rnd(o.seed || 1), dk = K.shade(base, 0.72), hi = K.shade(base, 1.18), dk2 = K.shade(base, 0.55);
  x.fillStyle = K.grad(x, 0, 0, 0, S, [[0, base], [0.5, hi], [1, base]]); x.fillRect(0, 0, S, S);
  if (o.boards) { x.save(); x.translate(0, S); x.rotate(-Math.PI / 2); }                      // (boards: the grain runs down them)
  const wave = (y0, amp, m, ph, w, col, a) => { for (const oy of [-S, 0, S]) { x.beginPath(); for (let i = 0; i <= S; i += 4) { const y = y0 + oy + Math.sin(i / S * Math.PI * 2 * m + ph) * amp; if (i === 0) x.moveTo(i, y); else x.lineTo(i, y); } x.strokeStyle = K.rgba(col, a); x.lineWidth = w; x.lineCap = 'round'; x.stroke(); } };
  for (let i = 0; i < 34; i++) wave(r() * S, 0.8 + r() * 2.4, 1 + Math.floor(r() * 2), r() * 6, 0.6 + r() * 1.8, r() < 0.6 ? dk : hi, 0.18 + r() * 0.3);
  for (let i = 0; i < 5; i++) wave(r() * S, 1.5 + r() * 2, 1, r() * 6, 2.5 + r() * 3, dk, 0.16);
  if (o.knot !== false) { const kx = 20 + r() * 88, ky = 20 + r() * 88; for (let i = 3; i >= 0; i--) { x.fillStyle = K.rgba(i % 2 ? dk : dk2, 0.2 + 0.1 * (3 - i)); x.beginPath(); x.ellipse(kx, ky, 3 + i * 3.4, 1.8 + i * 1.5, 0, 0, Math.PI * 2); x.fill(); } }
  if (o.boards) x.restore();
  if (o.boards) {                                                                       // boards: a dark seam between each, a nail or two
    const n = o.boards, w = S / n;
    for (let b = 0; b < n; b++) { x.fillStyle = K.rgba(b % 2 ? '#ffffff' : '#000000', 0.045); x.fillRect(b * w, 0, w, S); x.fillStyle = K.rgba(dk2, 0.85); x.fillRect(b * w, 0, 1.6, S); x.fillStyle = K.rgba(dk2, 0.25); x.fillRect(b * w + 1.6, 0, 1.5, S);
      const sy = r() * S; x.fillStyle = K.rgba(dk2, 0.8); x.fillRect(b * w, sy, w, 1.5); for (const ny of [sy + 5, sy - 5]) { x.fillStyle = K.rgba(dk2, 0.9); x.beginPath(); x.arc(b * w + w * 0.5, ny, 1.1, 0, Math.PI * 2); x.fill(); } }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding;
  woodCache[key] = t; return t;
}
const woodMat = (base, o) => root.Look.toon({ map: woodTexture(base, o), vertexColors: true });
// UVs for a part that is a tube along y: u along the height, v round it (so the grain runs along the leg), `scale` units to a repeat.
const tubeUV = (g, N, scale, rad) => (i, k, x, y) => [y / scale, k / N * (2 * Math.PI * (rad || 1)) / scale];

// ---------------------------------------------------------------------------------------------------------------------------
// The chair: a plank seat (top at y = 4, where Gerda's thighs rest), a straight back and legs that run down to y = -CHAIR.legH, so the floor stands there. It faces +z.
// ---------------------------------------------------------------------------------------------------------------------------
const CHAIR = { legH: 4.6, seatTop: 4, front: 5.7, back: -6.1, halfW: 7 };
function makeChair() {
  const g = new THREE.Group(), wood = woodMat('#c88f58', { seed: 7, boards: 0 }), dark = woodMat('#93603a', { seed: 11, knot: false }), top = woodMat('#a97245', { seed: 5, knot: false });
  const part = (geo, x, y, z, m, scale) => { P.boxUV(geo, scale || 9); const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  part(P.softBox(14, 3.2, 11.8, 0.9), 0, 2.4, -0.2, wood);                                // the plank seat
  part(P.softBox(14.4, 0.8, 12.2, 0.38), 0, 3.9, -0.2, top);                               // its worn top edge
  part(P.softBox(12.6, 3.4, 1.2, 0.5), 0, 7.5, -5.4, wood); part(P.softBox(12.6, 3.4, 1.2, 0.5), 0, 12.6, -5.4, wood);          // two slats of the back
  part(P.softBox(12.6, 1.2, 1.4, 0.5), 0, 15.9, -5.4, dark);                              // its top rail
  const turned = (x, z, y0, y1, r, bulges) => {                                           // a turned leg or post: a tapered tube with a swelling or two
    const rings = [R(y1, r * 0.92, r * 0.92), R(y1 - 0.5, r, r)]; for (const b of bulges || []) rings.push(R(b[0], r * b[1], r * b[1])), rings.push(R(b[0] - 0.7, r * 0.82, r * 0.82)); rings.push(R(y0 + 0.4, r * 0.84, r * 0.84), R(y0, r * 0.78, r * 0.78));
    const geo = loft({ sides: 14, smooth: 1, rings, cap: { top: { h: 0.001, steps: 1 }, bottom: { h: 0.001, steps: 1 } } }), N = 14;
    const m = new THREE.Mesh(geo.patch(0, N, tubeUV(geo, N, 9, r)), dark); m.position.set(x, 0, z); g.add(m); return m;
  };
  for (const [x, z] of [[-5.6, -5.4], [5.6, -5.4], [-5.6, 5.4], [5.6, 5.4]]) turned(x, z, -CHAIR.legH, 1.2, 1.05, [[-2.0, 1.12]]);
  for (const x of [-6, 6]) { turned(x, -6.4, 1, 16.0, 0.8, [[8, 1.1]]); const k = ball(1.05, 1.05, 1.05, 12, 8, [0.5, 0.5]); const mk = new THREE.Mesh(k, dark); mk.position.set(x, 16.5, -6.4); g.add(mk); }       // (the back posts, each with a knob)
  part(P.softBox(12, 0.8, 0.8, 0.3), 0, -3.5, -5.4, dark); part(P.softBox(12, 0.8, 0.8, 0.3), 0, -3.5, 5.4, dark);        // stretchers between the legs
  part(P.softBox(0.8, 0.8, 10.8, 0.3), -5.6, -3.5, 0, dark); part(P.softBox(0.8, 0.8, 10.8, 0.3), 5.6, -3.5, 0, dark);
  root.Look.decorate(g); root.Look.shade(g); return g;
}

// ---------------------------------------------------------------------------------------------------------------------------
// The table (the correction scene's second setting): a plank top 22 deep from the edge Jack lies over and 30 wide, on four turned legs. floorY: the floor's height; h: the table's height.
// ---------------------------------------------------------------------------------------------------------------------------
function makeTable(floorY, h) {
  const g = new THREE.Group(), wood = woodMat('#c19a68', { seed: 3, boards: 3 }), legs = woodMat('#8d6a46', { seed: 13, knot: false });
  const top = P.softBox(22, 2.4, 30, 0.8); P.boxUV(top, 9); const t = new THREE.Mesh(top, wood); t.position.set(11, floorY + h - 1.2, 0); g.add(t);
  for (const [x, z] of [[2.4, -12.6], [19.6, -12.6], [2.4, 12.6], [19.6, 12.6]]) {
    const len = h - 2.4, geo = loft({ sides: 14, smooth: 1, rings: [R(len, 1.2, 1.2), R(len - 1, 1.3, 1.3), R(len * 0.7, 1.05, 1.05), R(len * 0.55, 1.35, 1.35), R(len * 0.4, 1.02, 1.02), R(0.4, 0.95, 0.95), R(0, 0.85, 0.85)], cap: { top: { h: 0.001, steps: 1 }, bottom: { h: 0.001, steps: 1 } } });
    const m = new THREE.Mesh(geo.patch(0, 14, tubeUV(geo, 14, 9, 1.1)), legs); m.position.set(x, floorY, z); g.add(m);
  }
  root.Look.decorate(g); root.Look.shade(g); return g;
}

// ---------------------------------------------------------------------------------------------------------------------------
// The paddle: a short round handle and a flat blade with rounded corners. Tool-local it runs along -y (the handle at the origin), the blade's face toward +-z. Returns the group.
// ---------------------------------------------------------------------------------------------------------------------------
function makePaddle(o) {
  o = Object.assign({ handle: 1.2, bladeL: 4.5, bladeW: 4 }, o || {}); const g = new THREE.Group();
  const hm = woodMat('#8b5a34', { seed: 17, knot: false }), bm = woodMat('#e0ac70', { seed: 19, knot: false });
  const hg = loft({ sides: 14, smooth: 1, rings: [R(0.1, 0.62, 0.62), R(-0.4, 0.7, 0.7), R(-o.handle - 0.1, 0.78, 0.78)], cap: { top: { h: 0.35, steps: 2 }, bottom: { h: 0.001, steps: 1 } } });
  const handle = new THREE.Mesh(hg.patch(0, 14, tubeUV(hg, 14, 4, 0.7)), hm); g.add(handle);
  const w = o.bladeW, l = o.bladeL, rad = 1.2, x0 = -w / 2, x1 = w / 2, y1 = -o.handle, y0 = y1 - l, sh = new THREE.Shape();
  sh.moveTo(x0 + rad, y0); sh.lineTo(x1 - rad, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + rad); sh.lineTo(x1, y1 - rad); sh.quadraticCurveTo(x1, y1, x1 - rad, y1);
  sh.lineTo(x0 + rad, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - rad); sh.lineTo(x0, y0 + rad); sh.quadraticCurveTo(x0, y0, x0 + rad, y0);
  const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 3, curveSegments: 10 });
  bg.translate(0, 0, -0.4); const uv = bg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
  g.add(new THREE.Mesh(bg, root.Look.toon({ map: woodTexture('#e0ac70', { seed: 19, knot: false }) })));
  root.Look.decorate(g); root.Look.shade(g); return g;
}

// ---------------------------------------------------------------------------------------------------------------------------
// The birch: a bundle of pale twigs bound with twine at one end, to be held in the fist (the handle is at the origin and the whole runs on along -y). Each twig is two
// segments, so the bundle can whip: twigs.rotation.x bows the lot, and each of tips[] bows the end of one twig. Returns { root, twigs, tips }.
// ---------------------------------------------------------------------------------------------------------------------------
const BIRCH = { hand: 3.5, len: 15 };
function makeBirch() {
  const L = BIRCH.len, H = BIRCH.hand, rootG = new THREE.Group(), twigs = new THREE.Group(), tips = [];
  twigs.position.y = -H; rootG.add(twigs);
  const flat = hex => root.Look.toon({ color: new THREE.Color(hex).convertSRGBToLinear() });
  const bark = ['#f0e6cc', '#dccfae', '#f8f0dc', '#c9b98e'].map(flat), nick = flat('#5a4636');
  const hg = loft({ sides: 12, smooth: 1, rings: [R(1.0, 0.8, 0.8), R(0.2, 0.9, 0.9), R(-H + 1.0, 0.9, 0.9), R(-H - 0.4, 0.95, 0.95)], cap: { top: { h: 0.5, steps: 2 }, bottom: { h: 0.001, steps: 1 } } });
  const handle = new THREE.Mesh(hg.patch(0, 12, tubeUV(hg, 12, 5, 0.9)), woodMat('#b98a52', { seed: 23, knot: false })); rootG.add(handle);
  const twine = new THREE.Mesh(loft({ sides: 12, smooth: 1, rings: [R(0.5, 1.12, 1.12), R(0, 1.2, 1.2), R(-0.5, 1.12, 1.12)], cap: { top: { h: 0.001, steps: 1 }, bottom: { h: 0.001, steps: 1 } } }).patch(0, 12, () => [0.5, 0.5]), flat('#7a5530')); twine.position.y = -H + 0.2; rootG.add(twine);
  const n = 19;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.3, r = 0.35 + (i % 3) * 0.22, tw = new THREE.Group(); tw.position.set(Math.cos(a) * r * 0.6, 0, Math.sin(a) * r * 0.6); tw.rotation.set(Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09); twigs.add(tw);
    const col = bark[i % 4];
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, L / 2, 6), col); s1.position.y = -L / 4; s1.userData.noOutline = true; tw.add(s1);
    const joint = new THREE.Group(); joint.position.y = -L / 2; tw.add(joint); const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.2, L / 2, 6), col); s2.position.y = -L / 4; s2.userData.noOutline = true; joint.add(s2);
    if (i % 3 === 0) { const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 6), nick); nk.position.y = -L / 4 + 0.4 * (i % 4); nk.userData.noOutline = true; tw.add(nk); }
    tips.push(joint);
  }
  root.Look.decorate(rootG); root.Look.shade(rootG, true, false);
  return { root: rootG, twigs, tips };
}

Object.assign(P, { CHAIR, makeChair, makeTable, makePaddle, BIRCH, makeBirch, woodTexture });
})(typeof window !== 'undefined' ? window : globalThis);
