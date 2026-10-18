// Polygon — the character rig and the props. The figures themselves are in js/poly-jack.js and js/poly-gerda.js; the geometry and texture toolkit is js/poly-geo.js.
//
// The skeleton is the one the correction scene (js/lap.js) was tuned on, joint for joint: a standing figure is 32 units tall (1 unit = 1 old skin pixel); the hips sit 12 up; the torso
// hangs from the hips (12 tall, the neck at its top); the shoulders are 10 up it and 5.5 out; an arm is an upper arm of 4 and a forearm of 6 (the hand's end is 10 below the
// shoulder); a leg is a thigh of 6 and a shin of 6. Meshes are rigid pieces parented to those bones, as Ocarina of Time's and Final Fantasy VII's were, with a ball or a cap over
// each joint so a bend never opens a gap.
//
// A rig is { root, hips, torso, pelvis, neck, armL/armR (shoulder pivots: userData.sign), elbowL/wristL, elbow/wrist (the right arm), legL/legR: { thigh, knee, sign, ring },
// state, target, apply, after, paint(state), stretchShins(k), atlas, ... } and everything in lap.js and the sandbox works through those names.
(function (root) {
'use strict';
const THREE = root.THREE, P = root.Poly = root.Poly || {};

const POSES = {
  stand: { hipY: 12, lift: 0, thighX: 0, shinX: 0, spread: 0.02, armX: 0, armIn: -0.04, forearm: 0, headX: 0 },
  sit:   { hipY: 6,  lift: -2, thighX: -Math.PI / 2, shinX: Math.PI / 2, spread: 0.06, armX: -0.8, armIn: 0.14, forearm: 0, headX: 0.08 },
};

// The bones, with nothing attached yet.
function skeleton() {
  const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips);
  const rig = { root, hips, state: Object.assign({}, POSES.stand), target: Object.assign({}, POSES.stand), pose: 'stand' };
  rig.torso = new THREE.Group(); hips.add(rig.torso);
  rig.pelvis = new THREE.Group(); rig.pelvis.position.y = 1.5; hips.add(rig.pelvis);          // (the bottom of the body, left behind with the hips when the torso turns or leans)
  rig.neck = new THREE.Group(); rig.neck.position.y = 12; rig.torso.add(rig.neck);
  for (const [key, sign] of [['armL', 1], ['armR', -1]]) {
    const pivot = new THREE.Group(); pivot.position.set(sign * 5.5, 10, 0); pivot.rotation.order = 'ZXY'; pivot.userData.sign = sign;
    const elbow = new THREE.Group(); elbow.position.y = -4; pivot.add(elbow);
    const wrist = new THREE.Group(); elbow.add(wrist);                                          // (the forearm and hand hang from a wrist group that turns about the forearm's own axis)
    rig.torso.add(pivot); rig[key] = pivot;
    if (key === 'armR') { rig.elbow = elbow; rig.wrist = wrist; } else { rig.elbowL = elbow; rig.wristL = wrist; }
  }
  for (const [key, sign] of [['legL', 1], ['legR', -1]]) {
    const thigh = new THREE.Group(); thigh.position.x = sign * 2; thigh.rotation.order = 'ZXY';
    const knee = new THREE.Group(); knee.position.y = -6; thigh.add(knee);
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
  for (const l of [rig.legL, rig.legR]) { if (which && which !== l) continue; l.shin.scale.y = k; l.foot.position.y = -6 * k + 6; }
}
// A grown-up sitting in a chair: the knee-to-foot blocks lengthen so that the feet reach the floor (floorY, in the world) from wherever the seat holds the knees. Call it once the pose has settled and the rig is in place.
function seatFeet(rig, floorY) {
  floorY = floorY || 0; const V = THREE.Vector3; stretchShins(rig, 1); rig.root.updateMatrixWorld(true);
  for (const l of [rig.legL, rig.legR]) {
    const kneeY = l.knee.getWorldPosition(new V()).y, footY = l.knee.localToWorld(new V(0, -6, 0)).y;
    if (kneeY - footY > 0.3 && footY > floorY + 0.05) stretchShins(rig, (kneeY - floorY) / (kneeY - footY), l);
  }
}

// Mesh helpers shared by the figures. mat: a Lambert material over the figure's atlas with vertex colours (the Gouraud look); matTwo: the same, double sided, for hair and skirts.
function materials(atlas) {
  const tex = atlas.texture();
  const mat = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true });
  const two = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, side: THREE.DoubleSide });
  return { mat, two };
}
function add(parent, geo, material, name) { const m = new THREE.Mesh(geo, material); if (name) m.name = name; parent.add(m); return m; }

// ---------------------------------------------------------------------------------------------------------------------------
// Props: the chair the correction scene sits on, the birch.
// ---------------------------------------------------------------------------------------------------------------------------
// The chair: a plank seat (top at y = 4, where Gerda's thighs rest), a straight back and legs that run down to y = -CHAIR.legH, so the floor stands there. It faces +z.
const CHAIR = { legH: 6, seatTop: 4, front: 5.7, back: -6.1, halfW: 7 };
function woodTexture(seed, base, tones) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 32, 32); let s = seed;
  for (let j = 0; j < 32; j++) { s = (s * 1103515245 + 12345) >>> 0; const k = (s >> 16) % 5; if (k < 3) { x.fillStyle = tones[k]; x.fillRect(0, j, 32, 1); } }
  for (let i = 0; i < 40; i++) { s = (s * 1103515245 + 12345) >>> 0; x.fillStyle = tones[(s >> 12) % tones.length]; x.fillRect((s >> 3) % 28, (s >> 9) % 32, 2 + (s % 5), 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
}
function makeChair() {
  const g = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ map: woodTexture(7, '#7a5636', ['#6a4a2e', '#8a6644', '#5a3e26']), vertexColors: false });
  const dark = new THREE.MeshLambertMaterial({ map: woodTexture(11, '#5e4228', ['#4e3620', '#6e4e30', '#3e2a18']) });
  const rounded = (w, h, d, x, y, z, m) => { const geo = new THREE.BoxGeometry(w, h, d); const mesh = new THREE.Mesh(geo, m || wood); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  rounded(14, 3.2, 11.8, 0, 2.4, -0.2);                                   // the plank seat
  rounded(14.4, 0.8, 12.2, 0, 3.9, -0.2, dark);                              // its worn top edge
  rounded(12.6, 3.4, 1.2, 0, 7.5, -5.4); rounded(12.6, 3.4, 1.2, 0, 12.6, -5.4);   // two slats of the back
  rounded(12.6, 1.2, 1.4, 0, 15.9, -5.4, dark);                              // its top rail
  for (const [x, z] of [[-5.6, -5.4], [5.6, -5.4], [-5.6, 5.4], [5.6, 5.4]]) {   // turned legs: a tapered six-sided tube each
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, CHAIR.legH, 6), dark); leg.position.set(x, -CHAIR.legH / 2, z); g.add(leg);
  }
  for (const x of [-6, 6]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 16, 6), dark); post.position.set(x, 8, -6.4); g.add(post); const knob = new THREE.Mesh(new THREE.SphereGeometry(1.0, 6, 4), dark); knob.position.set(x, 16.2, -6.4); g.add(knob); }
  rounded(12, 0.8, 0.8, 0, -3.5, -5.4, dark); rounded(12, 0.8, 0.8, 0, -3.5, 5.4, dark);   // stretchers between the legs
  return g;
}
// The birch: a bundle of pale twigs bound with twine at one end, to be held in the fist (the handle is at the origin and the whole runs on along -y). Each twig is two
// segments, so the bundle can whip: twigs.rotation.x bows the lot, and each of tips[] bows the end of one twig. Returns { root, twigs, tips }.
const BIRCH = { hand: 3.5, len: 15 };
function makeBirch() {
  const srgb = hex => new THREE.Color(hex).convertSRGBToLinear(), L = BIRCH.len, H = BIRCH.hand, root = new THREE.Group(), twigs = new THREE.Group(), tips = [];
  twigs.position.y = -H; root.add(twigs);
  const bark = [0xd9cfb8, 0xc4b79a, 0xe6dec9, 0xa89878], dark = srgb(0x4a3a2a);
  const handleM = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, H + 1.5, 6), new THREE.MeshLambertMaterial({ color: srgb(0xb59a68) })); handleM.position.y = -(H - 1.5) / 2 + 0.2; root.add(handleM);
  const twine = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.7, 6), new THREE.MeshLambertMaterial({ color: srgb(0x6a4a2a) })); twine.position.y = -H + 0.4; root.add(twine);
  const n = 19;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.3, r = 0.35 + (i % 3) * 0.22, tw = new THREE.Group(); tw.position.set(Math.cos(a) * r * 0.6, 0, Math.sin(a) * r * 0.6); tw.rotation.set(Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09); twigs.add(tw);
    const col = new THREE.MeshLambertMaterial({ color: srgb(bark[i % 4]) });
    const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, L / 2, 4), col); seg1.position.y = -L / 4; tw.add(seg1);
    const joint = new THREE.Group(); joint.position.y = -L / 2; tw.add(joint); const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.2, L / 2, 4), col); seg2.position.y = -L / 4; joint.add(seg2);
    if (i % 3 === 0) { const nick = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 4), new THREE.MeshLambertMaterial({ color: dark })); nick.position.y = -L / 4 + 0.4 * (i % 4); tw.add(nick); }
    tips.push(joint);
  }
  return { root, twigs, tips };
}


// ---------------------------------------------------------------------------------------------------------------------------
// Parts both figures are made of, driven by a spec each: the head grid with its flat face plate, the hair, locks, hands and feet.
// ---------------------------------------------------------------------------------------------------------------------------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const R = (y, rx, rz, cz, shade, cx) => ({ y, rx, rz, cz: cz || 0, shade: shade === undefined ? 1 : shade, cx: cx || 0 });
// The head: 12 columns round, rows from chin to crown. Columns 4..8 (the front 120 degrees) are the face plate, mapped flat from the front (u across x, v down y); the rest is the shell.
// spec: { rings, top (y of the apex), faceW (half-width the face sheet covers), faceY0, faceY1 (chin and hairline heights the face sheet covers) }
function headRing(spec, y) {
  const T = spec.rings; if (y <= T[0].y) return T[0]; if (y >= T[T.length - 1].y) return T[T.length - 1];
  for (let i = 0; i < T.length - 1; i++) if (y <= T[i + 1].y) { const t = (y - T[i].y) / (T[i + 1].y - T[i].y), a = T[i], b = T[i + 1]; return { rx: a.rx + (b.rx - a.rx) * t, rz: a.rz + (b.rz - a.rz) * t, cz: a.cz + (b.cz - a.cz) * t }; }
}
function buildHead(spec, S) {
  const last = spec.rings[spec.rings.length - 1], g = P.loft({ sides: 12, rings: spec.rings, cap: { top: { h: spec.top - last.y, steps: 1 }, bottom: { h: 0.45, steps: 1, shade: 0.7 } } });
  const face = g.patch(4, 4, (i, k, x, y) => S.face.uv(clamp(0.5 + x / (2 * spec.faceW), 0, 1), clamp((spec.faceY1 - y) / (spec.faceY1 - spec.faceY0), 0, 1)));
  const shell = g.patch(8, 8, (i, k, x, y) => S.shell.uv(k / 8, clamp((spec.top - y) / (spec.top - spec.faceY0), 0, 1)));
  return { g, face, shell };
}
// Where the hair stops, by the angle round the head (0 front, pi back): spec.hairline is [[angle, y], ...].
function hairline(spec, th) { const a = Math.abs(th), T = spec.hairline; for (let i = 0; i < T.length - 1; i++) if (a <= T[i + 1][0]) { const t = (a - T[i][0]) / (T[i + 1][0] - T[i][0]); return T[i][1] + (T[i + 1][1] - T[i][1]) * t; } return T[T.length - 1][1]; }
// The hair: the head's own shape grown a little, cut off at the hairline (rows that fall below it collapse onto it, which leaves a ragged edge). spec.hairRows: y of each row, top first.
function buildHair(spec, S) {
  const rows = spec.hairRows, N = 12, g = new P.Grid(rows.length, N, true);
  rows.forEach((y0, i) => {
    for (let j = 0; j < N; j++) {
      const th = -Math.PI + 2 * Math.PI * j / N, yb = hairline(spec, th) + 0.12 * Math.sin(j * 2.3);
      let y = Math.max(y0, yb); if (i === 0) y = y0;
      const hr = headRing(spec, Math.min(y, spec.rings[spec.rings.length - 1].y + 0.3)), t = smooth(4.5, 7.8, y), off = (spec.hairOff || 0.14) + 0.28 * t + (i === 0 ? 0.05 : 0);
      const k = i === 0 ? 0 : 1, rx = (hr.rx + off) * k, rz = (hr.rz + off) * k;
      g.set(i, j, rx * Math.sin(th), y, hr.cz + rz * Math.cos(th));
      g.shade[i * N + j] = 0.82 + 0.18 * smooth(3, 7.5, y);
    }
  });
  g.apex[0] = 1; g.computeNormals();
  return g.patch(0, N, (i, k) => S.hair.uv(k / N, i / (rows.length - 1)));
}
// A lock of hair: a flat tapering tongue (three rings, a tip), hung from its base and swept to one side.
function lock(S, len, w, sweep, bend) {
  const g = P.loft({ sides: 6, rings: [R(0, w, w * 0.45, 0, 1), R(-len * 0.45, w * 0.85, w * 0.4, bend * 0.3, .95, sweep * 0.4), R(-len * 0.85, w * 0.45, w * 0.3, bend * 0.8, .9, sweep * 0.85)], cap: { bottom: { h: len * 0.28, steps: 1 } } });
  return g.patch(0, 6, (i, k) => S.hair.uv(clamp(k / 6, 0, 1), clamp(i / 3, 0, 1)));
}
// A hand: a mitten with a thumb, wide across (z) and thin through (x), the palm facing in (+-x). side +1 the left hand (the thumb toward the body, -x), -1 the right. o: { w, t } width and thickness scale.
function handGeo(S, sheet, side, o) {
  o = o || {}; const w = o.w || 1, t = o.t || 1, sx = o.sides || 8;
  const palm = P.loft({ sides: sx, rings: [R(-3.7, 0.95 * t, 1.1 * w, 0), R(-4.6, 0.78 * t, 1.38 * w, 0), R(-5.7, 0.72 * t, 1.34 * w, 0.05), R(-6.4, 0.62 * t, 1.05 * w, 0.1)], cap: { bottom: { h: 0.45, steps: 2 } } });
  const th = P.loft({ sides: 6, rings: [R(-4.2, 0.46 * t, 0.5 * w, 0), R(-5.0, 0.4 * t, 0.42 * w, 0.45 * w), R(-5.6, 0.34 * t, 0.34 * w, 0.85 * w)], cap: { bottom: { h: 0.4, steps: 1 } } });
  const pg = palm.patch(0, sx, P.loftUV(palm, sheet)), tg = P.place(th.patch(0, 6, () => sheet.texel(2, 2)), -side * 0.7 * t, 0, 0.4, 0, 0, -side * 0.15);
  return P.merge([pg, tg]);
}
// A foot along +z in knee-frame coordinates (the floor at y = -6): heel, arch, ball, toes. rings: [y along the foot, half width, half height, centre height]. The sheet's middle columns are the sole.
function footGeo(sheet, rings, sides) {
  const g = P.loft({ sides: sides || 8, rings: rings.map(r => R(r[0], r[1], r[2], r[3])), cap: { top: { h: 0.55, steps: 2 }, bottom: { h: 0.5, steps: 1 } } });
  const geo = g.patch(0, sides || 8, P.loftUV(g, sheet)); geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2)); return geo;
}

Object.assign(P, { clamp, smooth, R, headRing, buildHead, hairline, buildHair, lock, handGeo, footGeo, POSES, skeleton, apply, setPose, step, stretchShins, seatFeet, materials, add, CHAIR, makeChair, BIRCH, makeBirch, woodTexture });
})(typeof window !== 'undefined' ? window : globalThis);
