// Polygon — the character rig. The figures themselves are in js/poly-jack.js and js/poly-gerda.js; the props (chair, table, paddle, birch) are js/props.js; the geometry and texture toolkit is js/poly-geo.js.
//
// The skeleton, joint by joint (DIM below has every length; 1 unit is about a hand's width). A standing figure is about 35 units tall and six heads high: long legs (the hips are half way
// up, a thigh of 8.5 and a shin of 8.5 down to the sole), a torso with its neck 11.1 above the hips and the shoulder joints 3 below that and 3.4 out, a long arm (an upper arm of 5.6,
// a forearm of 4 to the wrist, a hand of 3.1: the fingertips reach mid-thigh), and a head a little under a fifth of the height on a visible neck. Meshes are rigid, smooth pieces parented to those bones, with a ball or
// a cap over each joint so a bend never opens a gap.
//
// A rig is { root, hips, torso, pelvis, neck, armL/armR (shoulder pivots: userData.sign), elbowL/wristL, elbow/wrist (the right arm), legL/legR: { thigh, knee, sign, ring },
// state, target, apply, after, paint(state), stretchShins(k), atlas, ... } and everything in lap.js and the sandbox works through those names.
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly = root.Poly || {};

const DIM = {
  hipY: 17.0,                // standing height of the hip joints
  hipX: 1.9,                 // each hip joint is this far from the middle
  thigh: 8.5, shin: 8.5,     // hip to knee, knee to sole
  neck: 11.1,                // the head's pivot above the hips (torso frame)
  shoulderX: 3.4, shoulderY: 8.2,   // each shoulder joint: out from the middle, up from the hips
  upper: 5.6,                // shoulder to elbow
  fore: 4.0,                 // elbow to wrist (the forearm block hangs from the elbow; the hand starts here)
  hand: 3.1,                 // wrist to fingertip
  headScale: 0.78,           // the head is built at 1 (about 8 tall) and drawn at this
  sitHipY: 5.6,              // the hips' height when seated on a seat whose top is at y = 4
};
const POSES = {
  stand: { hipY: DIM.hipY, lift: 0, thighX: 0, shinX: 0, spread: 0.02, armX: 0, armIn: -0.09, forearm: 0, headX: 0 },
  sit:   { hipY: DIM.sitHipY, lift: -2, thighX: -Math.PI / 2, shinX: Math.PI / 2, spread: 0.06, armX: -0.8, armIn: 0.14, forearm: 0, headX: 0.08 },
};

// The bones, with nothing attached yet.
function skeleton() {
  const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips);
  const rig = { root, hips, state: Object.assign({}, POSES.stand), target: Object.assign({}, POSES.stand), pose: 'stand' };
  rig.torso = new THREE.Group(); hips.add(rig.torso);
  rig.pelvis = new THREE.Group(); rig.pelvis.position.y = 1.5; hips.add(rig.pelvis);          // (the bottom of the body, left behind with the hips when the torso turns or leans)
  rig.neck = new THREE.Group(); rig.neck.position.y = DIM.neck; rig.torso.add(rig.neck);
  for (const [key, sign] of [['armL', 1], ['armR', -1]]) {
    const pivot = new THREE.Group(); pivot.position.set(sign * DIM.shoulderX, DIM.shoulderY, 0); pivot.rotation.order = 'ZXY'; pivot.userData.sign = sign;
    const elbow = new THREE.Group(); elbow.position.y = -DIM.upper; pivot.add(elbow);
    const wrist = new THREE.Group(); elbow.add(wrist);                                          // (the forearm and hand hang from a wrist group that turns about the forearm's own axis)
    rig.torso.add(pivot); rig[key] = pivot;
    if (key === 'armR') { rig.elbow = elbow; rig.wrist = wrist; } else { rig.elbowL = elbow; rig.wristL = wrist; }
  }
  for (const [key, sign] of [['legL', 1], ['legR', -1]]) {
    const thigh = new THREE.Group(); thigh.position.x = sign * DIM.hipX; thigh.rotation.order = 'ZXY';
    const knee = new THREE.Group(); knee.position.y = -DIM.thigh; thigh.add(knee);
    hips.add(thigh); rig[key] = { thigh, knee, sign, shin: new THREE.Group(), foot: new THREE.Group() };
    knee.add(rig[key].shin); knee.add(rig[key].foot);                                              // (the shin stretches for a seated giant; the foot rides its end)
  }
  rig.apply = apply; rig.stretchShins = (k, which) => stretchShins(rig, k, which);
  return rig;
}

function apply() {
  const s = this.state;
  this.hips.position.y = s.hipY;
  this.torso.position.y = s.lift;
  this.neck.rotation.x = s.headX;
  for (const k of ['armL', 'armR']) { const a = this[k], sg = a.userData.sign; a.rotation.x = s.armX; a.rotation.z = -sg * s.armIn; }
  for (const k of ['legL', 'legR']) { const l = this[k]; l.thigh.rotation.x = s.thighX; l.thigh.rotation.z = l.sign * s.spread; l.knee.rotation.x = s.shinX; }
  if (this.after) this.after(this);   // a scene's own additions to the pose (the lap scene's swing and kicks)
}
// The pose a rig is easing toward. Standing again, the shins go back to their own length.
function setPose(rig, name) {
  rig.target = Object.assign({}, POSES[name]); rig.pose = name;
  if (name !== 'sit' && rig.shinK && rig.shinK !== 1) rig.stretchShins(1);
}
function step(rig, dt) {
  const k = Math.min(1, dt * 9);
  for (const key in rig.target) rig.state[key] += (rig.target[key] - rig.state[key]) * k;
  rig.apply();
}
// Lengthen both shins by k (the lower leg and the foot below it ride along): a giant on a chair whose feet must reach the floor.
function stretchShins(rig, k, which) {
  rig.shinK = k;
  for (const l of [rig.legL, rig.legR]) { if (which && which !== l) continue; l.shin.scale.y = k; l.foot.position.y = -DIM.shin * k + DIM.shin; }
}
// A grown-up sitting in a chair: the knee-to-foot blocks lengthen so that the feet reach the floor (floorY, in the world) from wherever the seat holds the knees. Call it once the pose has settled and the rig is in place.
function seatFeet(rig, floorY) {
  floorY = floorY || 0; const V = THREE.Vector3; stretchShins(rig, 1); rig.root.updateMatrixWorld(true);
  for (const l of [rig.legL, rig.legR]) {
    const kneeY = l.knee.getWorldPosition(new V()).y, footY = l.knee.localToWorld(new V(0, -DIM.shin, 0)).y;
    if (kneeY - footY > 0.3 && footY > floorY + 0.05) stretchShins(rig, (kneeY - floorY) / (kneeY - footY), l);
  }
}

// Mesh helpers shared by the figures. mat: the toon material (js/look.js) over the figure's atlas, with vertex colours for painted shading; two: the same, double sided, for anything thin.
function materials(atlas) {
  const tex = atlas.texture();
  const mat = root.Look.toon({ map: tex, vertexColors: true });
  const two = root.Look.toon({ map: tex, vertexColors: true, side: THREE.DoubleSide });
  return { mat, two };
}
// Ink and shade a finished figure: an outline hull on every mesh, and the shadow flags.
function finish(rig) { root.Look.decorate(rig.root); root.Look.shade(rig.root); return rig; }
function add(parent, geo, material, name) { const m = new THREE.Mesh(geo, material); if (name) m.name = name; parent.add(m); return m; }

// ---------------------------------------------------------------------------------------------------------------------------
// Parts both figures are made of, driven by a spec each: the head grid with its flat face plate, the hair, hands and feet.
// ---------------------------------------------------------------------------------------------------------------------------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const R = (y, rx, rz, cz, shade, cx, p) => ({ y, rx, rz, cz: cz || 0, shade: shade === undefined ? 1 : shade, cx: cx || 0, p: p || 2 });
const SIDES_HEAD = 24;
// The head: 24 columns round, rows from chin to crown. Columns 8..16 (the front 120 degrees) are the face plate, mapped flat from the front (u across x, v down y); the rest is the shell.
// spec: { rings, top (y of the apex), faceW (half-width the face sheet covers), faceY0, faceY1 (chin and hairline heights the face sheet covers) }
function headRing(spec, y) {
  const T = spec.rings; if (y <= T[0].y) return T[0]; if (y >= T[T.length - 1].y) return T[T.length - 1];
  for (let i = 0; i < T.length - 1; i++) if (y <= T[i + 1].y) { const t = (y - T[i].y) / (T[i + 1].y - T[i].y), a = T[i], b = T[i + 1]; return { rx: a.rx + (b.rx - a.rx) * t, rz: a.rz + (b.rz - a.rz) * t, cz: a.cz + (b.cz - a.cz) * t, p: (a.p || 2) + ((b.p || 2) - (a.p || 2)) * t }; }
}
function buildHead(spec, S) {
  const last = spec.rings[spec.rings.length - 1], N = SIDES_HEAD, g = P.loft({ sides: N, smooth: 2, rings: spec.rings, cap: { top: { h: spec.top - last.y, steps: 3 }, bottom: { h: 0.5, steps: 2, shade: 0.8 } } });
  const a = N / 2 - N / 6, n = N / 3, b = N / 2 + N / 6;                                   // (the face plate: the middle third of the columns, 120 degrees)
  const face = g.patch(a, n, (i, k, x, y) => S.face.uv(clamp(0.5 + x / (2 * spec.faceW), 0, 1), clamp((spec.faceY1 - y) / (spec.faceY1 - spec.faceY0), 0, 1)));
  const shell = g.patch(b, N - n, (i, k, x, y) => S.shell.uv(k / (N - n), clamp((spec.top - y) / (spec.top - spec.faceY0), 0, 1)));
  return { g, face, shell };
}
// Where the hair stops, by the angle round the head (0 front, pi back): spec.hairline is [[angle, y], ...].
function hairline(spec, th) { const a = Math.abs(th), T = spec.hairline; for (let i = 0; i < T.length - 1; i++) if (a <= T[i + 1][0]) { const t = (a - T[i][0]) / (T[i + 1][0] - T[i][0]); return T[i][1] + (T[i + 1][1] - T[i][1]) * t; } return T[T.length - 1][1]; }
// The hair's base: the head's own shape grown a little, cut off at the hairline (rows that fall below it collapse onto it, which leaves a ragged edge). spec.hairRows: y of each row, top first.
function buildHair(spec, S) {
  const rows = spec.hairRows, N = SIDES_HEAD, g = new P.Grid(rows.length, N, true), top = spec.rings[spec.rings.length - 1].y + 0.4;
  rows.forEach((y0, i) => {
    for (let j = 0; j < N; j++) {
      const th = -Math.PI + 2 * Math.PI * j / N, yb = hairline(spec, th) + 0.1 * Math.sin(j * 1.7);
      let y = Math.max(y0, yb); if (i === 0) y = y0;
      const hr = headRing(spec, Math.min(y, top)), t = smooth(4.2, 7.8, y), off = (spec.hairOff || 0.16) + 0.3 * t + (i === 0 ? 0.05 : 0), ex = 2 / (hr.p || 2);
      const k = i === 0 ? 0 : 1, sn = Math.sin(th), cs = Math.cos(th);
      g.set(i, j, (hr.rx + off) * k * Math.sign(sn) * Math.pow(Math.abs(sn), ex), y, hr.cz + (hr.rz + off) * k * Math.sign(cs) * Math.pow(Math.abs(cs), ex));
      g.shade[i * N + j] = 0.88 + 0.12 * smooth(3, 7.5, y);
    }
  });
  g.apex[0] = 1; g.computeNormals();
  return g.patch(0, N, (i, k) => S.hair.uv(k / N, i / (rows.length - 1)));
}
// A lock of hair: a tapering tongue swept along a curve, thick on the surface it lies on (`up`), pointed at the tip. path: points in head space; w, t: [root, tip] width and thickness.
function lock(S, path, w, t, up, o) {
  o = o || {}; const g = P.sweep({ path, w, t, up: up || [0, 1, 0], steps: o.steps || 9, sides: o.sides || 10, taper: o.taper === undefined ? 1.3 : o.taper, tip: 'point' }), sh = o.sheet || S.hair;
  const rows = g.rows; return g.patch(0, g.sides, (i, k) => sh.uv(clamp(k / g.sides, 0, 1), clamp(i / (rows - 1), 0, 1)));
}
// A hand: a smooth mitten with a thumb, wide across (z) and thin through (x), the palm facing in (+-x). side +1 the left hand (the thumb toward the body, -x), -1 the right. o: { w, t } width and thickness scale.
// It hangs from the wrist group (which sits at the elbow): from just above the wrist (DIM.fore down) to the fingertips (DIM.hand beyond it).
function handGeo(S, sheet, side, o) {
  o = o || {}; const w = o.w || 1, t = o.t || 1, y0 = -(DIM.fore - 0.35), L = DIM.hand + 0.35, f = k => y0 - L * k;
  const palm = P.loft({ sides: 14, smooth: 1, rings: [R(f(0), 0.54 * t, 0.66 * w, 0), R(f(0.3), 0.48 * t, 0.9 * w, 0, 1, 0, 2.6), R(f(0.68), 0.44 * t, 0.88 * w, 0.03, 1, 0, 2.6), R(f(1), 0.34 * t, 0.66 * w, 0.08)], cap: { bottom: { h: 0.45, steps: 3 } } });
  const th = P.loft({ sides: 10, smooth: 1, rings: [R(f(0.2), 0.3 * t, 0.33 * w, 0), R(f(0.5), 0.27 * t, 0.27 * w, 0.26 * w), R(f(0.74), 0.22 * t, 0.22 * w, 0.5 * w)], cap: { bottom: { h: 0.3, steps: 3 } } });
  const pg = palm.patch(0, 14, P.loftUV(palm, sheet)), tg = P.place(th.patch(0, 10, P.loftUV(th, sheet, { v0: 0.05, v1: 0.45 })), -side * 0.5 * t, 0, 0.3 * w, 0, 0, -side * 0.18);
  return P.merge([pg, tg]);
}
// A fist closed on a handle: a rounded block from just above the wrist to 2.6 below it, a little thicker than the hand, textured from the same sheet. A giver swaps her hand for it while she holds an implement.
function fistGeo(S, sheet, side, o) {
  o = o || {}; const w = o.w || 1, t = o.t || 1, y0 = -(DIM.fore - 0.35), f = k => y0 - 2.7 * k;
  const blk = P.loft({ sides: 14, smooth: 1, rings: [R(f(0), 0.54 * t, 0.66 * w, 0), R(f(0.18), 0.86 * t, 0.94 * w, 0.02, 1, 0, 2.6), R(f(0.6), 0.94 * t, 0.98 * w, 0.05, 1, 0, 2.6), R(f(0.92), 0.8 * t, 0.84 * w, 0.07, 1, 0, 2.4), R(f(1), 0.52 * t, 0.58 * w, 0.07)], cap: { bottom: { h: 0.4, steps: 3 } } });
  return blk.patch(0, 14, P.loftUV(blk, sheet));
}
// A foot along +z in knee-frame coordinates (the floor at y = -6): heel, arch, ball, toes. rings: [y along the foot, half width, half height, centre height]. The sheet's middle columns are the sole.
function footGeo(sheet, rings, sides) {
  sides = sides || 14;
  const g = P.loft({ sides, smooth: 1, rings: rings.map(r => R(r[0], r[1], r[2], r[3], 1, 0, 2.4)), cap: { top: { h: 0.65, steps: 3 }, bottom: { h: 0.6, steps: 2 } } });
  const geo = g.patch(0, sides, P.loftUV(g, sheet)); geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2)); geo.userData.smoothNormals = true; return geo;
}

// Where a height falls on a loft's sheet (v, 0 at the sheet's top and 1 at its bottom, by distance along the back column): for painters that must put a hem or a belt at a place on the body,
// and for parts laid over the loft that take their texture from it.
function vOfY(g, y) {
  const n = g.rows, ys = [], arc = [0];
  for (let i = 0; i < n; i++) ys.push(g.get(i, 0).y);
  for (let i = 1; i < n; i++) arc.push(arc[i - 1] + g.get(i - 1, 0).distanceTo(g.get(i, 0)));
  const up = ys[0] >= ys[n - 1], total = arc[n - 1];
  for (let i = 0; i < n - 1; i++) { const a = ys[i], b = ys[i + 1]; if ((y <= a && y >= b) || (y >= a && y <= b)) { const t = b === a ? 0 : (y - a) / (b - a), d = arc[i] + (arc[i + 1] - arc[i]) * t; return clamp(up ? d / total : 1 - d / total, 0, 1); } }
  return y > Math.max(ys[0], ys[n - 1]) ? 0 : 1;
}
// The inverse, as a function of a row of a sheet H pixels tall: the height (y) at that row. Searches y from hi down to lo.
function yOfRow(g, H, lo, hi) {
  const tab = []; for (let y = hi; y >= lo; y -= (hi - lo) / 200) tab.push([vOfY(g, y) * H, y]);
  return py => { if (py <= tab[0][0]) return tab[0][1]; for (let i = 0; i < tab.length - 1; i++) if (py <= tab[i + 1][0]) { const t = (py - tab[i][0]) / Math.max(1e-6, tab[i + 1][0] - tab[i][0]); return tab[i][1] + (tab[i + 1][1] - tab[i][1]) * t; } return tab[tab.length - 1][1]; };
}
// A ring value (rx, rz...) of a loft at height y.
function ringAt(g, y, key) { const q = g.rings; for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1]; if (a.y !== b.y && (y - a.y) * (y - b.y) <= 0) return a[key] + (b[key] - a[key]) * (y - a.y) / (b.y - a.y); } return q[0][key]; }

Object.assign(P, { finish, clamp, smooth, vOfY, yOfRow, ringAt, R, headRing, buildHead, hairline, buildHair, lock, handGeo, fistGeo, footGeo, SIDES_HEAD, DIM, POSES, skeleton, apply, setPose, step, stretchShins, seatFeet, materials, add });
})(typeof window !== 'undefined' ? window : globalThis);
