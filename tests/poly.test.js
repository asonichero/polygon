// The character system and the world, headless: build both figures, the props and the scenery against a stand-in canvas and check what has to be true for them to render and to pose: finite
// geometry, UVs inside the atlas, outward smooth normals, the skeleton the correction scene was tuned on, a triangle budget, the toon material's shader patch, the ink hulls, and that every state
// the scenes ask for paints without an error.
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.join(__dirname, '..');

// A canvas that remembers nothing: enough for the painters to run (every drawing call does nothing; gradients accept their colour stops).
const gradient = { addColorStop() {} };
const fakeCtx = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => gradient : k === 'getImageData' ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }) };
global.window = global; global.THREE = require(path.join(root, 'vendor', 'three.min.js'));
for (const f of ['look', 'poly-geo', 'poly', 'poly-paint', 'poly-face', 'poly-jack', 'poly-jack-paint', 'poly-gerda', 'poly-gerda-paint', 'props', 'world']) require(path.join(root, 'js', f + '.js'));
const P = global.Poly, THREE = global.THREE, Look = global.Look, World = global.World;

const meshes = obj => { const out = []; obj.traverse(o => { if (o.isMesh && !o.userData.hull) out.push(o); }); return out; };

test('a loft is a closed, smooth tube with outward normals and a UV for every vertex', () => {
  const g = P.loft({ sides: 8, rings: [P.R(2, 1, 1), P.R(0, 1.5, 1.5), P.R(-2, 1, 1)], cap: { top: { h: 0.5, steps: 1 }, bottom: { h: 0.5, steps: 1 } } });
  const geo = g.patch(0, 8, (i, k) => [k / 8, i / 5]);
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  assert.equal(p.count, uv.count);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i), nn = new THREE.Vector3().fromBufferAttribute(n, i);
    assert.ok(Math.abs(nn.length() - 1) < 1e-3, 'unit normal');
    const out = new THREE.Vector3(v.x, 0, v.z); if (out.length() > 0.3) assert.ok(nn.dot(out.normalize()) > -0.01, 'normal points away from the axis at vertex ' + i);
  }
  // triangles wind the way their normals face
  const I = geo.index.array, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3(); let agree = 0, total = 0;
  for (let t = 0; t < I.length; t += 3) { a.fromBufferAttribute(p, I[t]); b.fromBufferAttribute(p, I[t + 1]); c.fromBufferAttribute(p, I[t + 2]); fn.crossVectors(b.sub(a), c.sub(a)); const vn = new THREE.Vector3().fromBufferAttribute(n, I[t]); total++; if (fn.dot(vn) > 0) agree++; }
  assert.ok(agree / total > 0.95, 'winding follows the normals');
});

test('merging keeps every triangle and every attribute', () => {
  const a = P.ball(1, 1, 1, 6, 3, [0.5, 0.5]), b = P.box(1, 1, 1, [0.1, 0.1]);
  const na = a.index.count / 3, nb = b.index.count / 3, m = P.merge([a, b]);
  assert.equal(m.index.count / 3, na + nb); assert.equal(m.attributes.position.count, a.attributes.position.count + b.attributes.position.count);
  for (const k of ['position', 'normal', 'uv', 'color']) assert.ok(m.attributes[k], k);
});

test('hairlines and head rings interpolate and stay in range', () => {
  const spec = { rings: [P.R(0, 1, 1), P.R(4, 3, 3), P.R(8, 1, 1)], hairline: [[0, 6], [3.14, 3]] };
  assert.ok(Math.abs(P.hairline(spec, 0) - 6) < 1e-9 && Math.abs(P.hairline(spec, Math.PI) - 3) < 1e-2 && Math.abs(P.hairline(spec, -Math.PI) - 3) < 1e-2);
  assert.ok(Math.abs(P.headRing(spec, 2).rx - 2) < 1e-9);
});

test('a rounded box is closed, faces outward everywhere, and its normals are exact', () => {
  const g = P.softBox(6, 3, 4, 0.8, 3), p = g.attributes.position, n = g.attributes.normal, I = g.index.array, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < I.length; t += 3) {
    a.fromBufferAttribute(p, I[t]); b.fromBufferAttribute(p, I[t + 1]); c.fromBufferAttribute(p, I[t + 2]);
    const fn = b.clone().sub(a).cross(c.clone().sub(a)); if (fn.lengthSq() < 1e-12) continue;
    assert.ok(fn.dot(a.clone().add(b).add(c)) > 0, 'triangle ' + t / 3 + ' faces outward');
  }
  const box = new THREE.Box3().setFromBufferAttribute(p);
  assert.ok(Math.abs(box.max.x - 3) < 1e-6 && Math.abs(box.max.y - 1.5) < 1e-6 && Math.abs(box.max.z - 2) < 1e-6 && Math.abs(box.min.x + 3) < 1e-6, 'it spans w x h x d');
  for (let i = 0; i < p.count; i++) assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) < 1e-5, 'unit normal');
});

for (const [name, make] of [['Jack', () => P.makeJack()], ['Gerda', () => P.makeGerda('Work')]]) {
  test(`${name}: the skeleton is the one the correction scene was tuned on`, () => {
    const r = make();
    for (const k of ['root', 'hips', 'torso', 'pelvis', 'neck', 'armL', 'armR', 'elbow', 'elbowL', 'wrist', 'wristL', 'legL', 'legR', 'paint', 'apply', 'stretchShins', 'atlas']) assert.ok(r[k], k);
    assert.equal(r.neck.position.y, 12); assert.equal(r.pelvis.position.y, 1.5); assert.equal(r.armL.position.x, 5.5); assert.equal(r.armR.position.x, -5.5); assert.equal(r.armL.position.y, 10);
    assert.equal(r.elbow.position.y, -4); assert.equal(r.legL.knee.position.y, -6); assert.equal(r.legL.thigh.position.x, 2); assert.equal(r.legR.thigh.position.x, -2);
    assert.equal(r.armL.userData.sign, 1); assert.equal(r.armR.userData.sign, -1); assert.equal(r.legL.sign, 1);
  });
  test(`${name}: geometry is finite, UVs lie inside the atlas, and the triangle budget holds`, () => {
    const r = make(), tris = P.triCount(r.root);
    for (const m of meshes(r.root)) {
      const g = m.geometry, p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { assert.ok(isFinite(p.getX(i) + p.getY(i) + p.getZ(i)), m.name + ' position'); assert.ok(uv.getX(i) >= 0 && uv.getX(i) <= 1 && uv.getY(i) >= 0 && uv.getY(i) <= 1, `${m.name} uv ${uv.getX(i)},${uv.getY(i)}`); }
    }
    assert.ok(tris > 4000 && tris < 20000, `${name} has ${tris} visible triangles: smooth, but not wasteful`);
  });
  test(`${name}: every part is inked, and the ink is not counted among the triangles`, () => {
    const r = make(); let bodies = 0, inked = 0;
    r.root.traverse(o => { if (o.isMesh && !o.userData.hull) { bodies++; if (o.children.some(h => h.userData.hull && h.geometry === o.geometry)) inked++; } });
    assert.ok(bodies > 20 && inked === bodies, `${inked} of ${bodies} parts have their hull`);
  });
  test(`${name}: standing, the feet are on the floor and the head is at the top`, () => {
    const r = make(); P.setPose(r, 'stand'); for (let i = 0; i < 40; i++) P.step(r, 0.1); r.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(r.root);
    assert.ok(Math.abs(box.min.y) < 0.8, 'feet at the floor: ' + box.min.y); assert.ok(box.max.y > 30 && box.max.y < 35.5, 'a standing figure is about 32 tall: ' + box.max.y);
  });
  test(`${name}: sitting lowers the hips and folds the legs forward`, () => {
    const r = make(); P.setPose(r, 'sit'); for (let i = 0; i < 40; i++) P.step(r, 0.1);
    assert.ok(Math.abs(r.hips.position.y - 6) < 0.05); assert.ok(r.legL.thigh.rotation.x < -1.5 && r.legL.knee.rotation.x > 1.5);
    P.stretchShins(r, 2); assert.equal(r.legL.shin.scale.y, 2); assert.equal(r.legR.foot.position.y, 6 - 12); P.setPose(r, 'stand'); assert.equal(r.legL.shin.scale.y, 1);
  });
}

test('Jack paints every outfit, expression and state the scenes ask for', () => {
  const j = P.makeJack();
  for (const outfit of P.OUTFITS.jack) for (const trousers of ['up', 'down']) for (const drawers of ['up', 'down']) assert.doesNotThrow(() => j.paint({ outfit, trousers, drawers, marks: { L: 0.4, R: 0.9 }, expr: 3, hitched: true }));
  for (const e of Object.keys(P.JACK_EXPR)) assert.doesNotThrow(() => j.paint({ expr: e, blush: true }));
  assert.equal(P.jackExprIndex('crying'), 3); assert.equal(P.jackExprIndex(9), 7); assert.equal(P.jackExprIndex('nonsense'), 0);
  j.paint({ outfit: 'Outdoor', trousers: 'down' }); assert.ok(j.legL.ring.visible && !j.belt.visible);
  j.paint({ outfit: 'Day', trousers: 'up' }); assert.ok(!j.legL.boot.visible && j.legL.bare.visible);
  assert.ok(j.seat && j.seat.geometry.attributes.position.count > 0, 'the seat for the lap scene');
});
test('Gerda paints both outfits and every face', () => {
  const g = P.makeGerda('Work');
  for (const outfit of P.OUTFITS.gerda) for (const expr of [0, 1, 2]) assert.doesNotThrow(() => g.paint({ outfit, expr }));
  g.paint({ outfit: 'Fine' }); assert.ok(g.legL.skirtFine.visible && !g.legL.skirtWork.visible && g.bracelets[0].visible && g.anklets[0].visible && g.pinStone.visible);
  g.paint({ outfit: 'Work' }); assert.ok(g.legL.skirtWork.visible && !g.legL.skirtFine.visible && !g.bracelets[0].visible && !g.pinStone.visible);
  assert.equal(P.gerdaExprIndex('stern'), 1);
});
test('Gerda: the painters can find a height on the torso and the waist piece, and the hair and bun are there', () => {
  const g = P.makeGerda('Work');
  assert.ok(g.rows.waistRx(0) > 3 && g.rows.torso(8) > 0 && g.rows.torso(8) < 1 && g.rows.torso(11) < g.rows.torso(4), 'a higher place is nearer the top of the sheet');
  assert.ok(g.bun && g.pin && g.legL.skirtWork && g.legR.skirtFine);
});

test('the atlas packs both figures into 1024 x 1024, sheets apart from one another', () => {
  for (const r of [P.makeJack(), P.makeGerda('Fine')]) {
    const A = r.atlas, all = Object.values(r.sheets); assert.equal(A.w, 1024); assert.equal(A.h, 1024);
    for (const s of all) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= 1024 && s.y + s.h <= 1024, s.name);
    for (const a of all) for (const b of all) if (a !== b) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.name} and ${b.name} do not overlap`);
  }
});

test('the toon material patches three\'s toon shader: a ramp of tinted shadow, and a rim light', () => {
  const m = Look.toon({ color: 0xffffff }), shader = { fragmentShader: THREE.ShaderLib.toon.fragmentShader };
  assert.ok(shader.fragmentShader.includes('#include <gradientmap_pars_fragment>'), 'the shader chunk the ramp replaces is still there');
  m.onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.includes('getGradientIrradiance') && !shader.fragmentShader.includes('#include <gradientmap_pars_fragment>') && shader.fragmentShader.includes('rimD'), 'ramp and rim are in');
});

test('ink: every mesh gets one hull on its own geometry, props included, and boxes get smooth outward normals', () => {
  const grp = new THREE.Group(), box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), Look.toon({ color: 0xff0000 })), skip = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), Look.toon({ color: 0x00ff00 })); skip.userData.noOutline = true; grp.add(box, skip);
  Look.decorate(grp); Look.decorate(grp);
  assert.equal(box.children.length, 1, 'inked once, however often it is asked'); assert.ok(box.children[0].userData.hull && box.children[0].geometry === box.geometry && box.children[0].material.side === THREE.BackSide);
  assert.equal(skip.children.length, 0, 'noOutline is respected');
  const on = box.geometry.attributes.outlineNormal, p = box.geometry.attributes.position; assert.ok(on && on.count === p.count);
  for (let i = 0; i < p.count; i++) assert.ok(on.getX(i) * p.getX(i) + on.getY(i) * p.getY(i) + on.getZ(i) * p.getZ(i) > 0, 'a corner pushes outward');
  assert.equal(P.triCount(grp), 24, 'the hull is not counted among the triangles');
  for (const o of [P.makeChair(), P.makeTable(-6, 14.2), P.makePaddle(), P.makeBirch().root]) { let any = 0; o.traverse(m => { if (m.isMesh && m.userData.hull) any++; }); assert.ok(any > 0, 'a prop is inked'); }
});

test('Look.rig lights a scene: a sun with a shadow, a hemisphere, fog and a sky, and it fits the sun to a place', () => {
  const scene = new THREE.Scene(), rig = Look.rig(scene, { shadow: 50 });
  assert.ok(rig.sun.castShadow && rig.hemi && scene.fog && scene.userData.sky && scene.background);
  rig.fit(new THREE.Vector3(10, 0, 20), 30); assert.ok(Math.abs(rig.sun.target.position.x - 10) < 1e-9 && rig.sun.position.distanceTo(rig.sun.target.position) > 50 && rig.sun.shadow.camera.right === 30);
});

test('the props build: the chair has the dimensions the lap scene counts on; the table, paddle and birch are where they are held', () => {
  const chair = P.makeChair(), box = new THREE.Box3().setFromObject(chair);
  assert.ok(Math.abs(box.min.y + P.CHAIR.legH) < 0.1, 'the legs reach down to -legH: ' + box.min.y); assert.ok(box.max.y > 16 && box.max.y < 18, 'the back posts rise to about 17: ' + box.max.y);
  assert.ok(Math.abs(box.max.x - 7.2) < 0.7 && box.min.z < -6 && box.max.z > 5.5, 'about as wide as it is deep: ' + [box.max.x, box.min.z, box.max.z]);
  const b = P.makeBirch(); assert.equal(b.tips.length, 19); assert.equal(b.twigs.position.y, -P.BIRCH.hand);
  const t = new THREE.Box3().setFromObject(P.makeTable(-6, 14.2)); assert.ok(Math.abs(t.max.y - (-6 + 14.2)) < 0.05 && Math.abs(t.min.y + 6) < 0.15, 'the table top is where the lap scene puts Jack: ' + t.max.y);
  const pb = new THREE.Box3().setFromObject(P.makePaddle({ handle: 1.2, bladeL: 4.5, bladeW: 4 })); assert.ok(pb.min.y < -5.5 && pb.min.y > -7.5 && pb.max.x > 1.9, 'a short handle and a blade along -y');
});

test('the world builds: textures, the island, the deck, the rug, and scenery that keeps clear of what it is told to', () => {
  for (const t of ['grassTex', 'stoneTex', 'soilTex', 'barkTex', 'leafTex', 'rockTex', 'rugTex']) assert.ok(World[t]().isTexture, t);
  const island = World.island({ radius: 120 }); assert.ok(island.group.children.length >= 2 && island.radius === 120);
  island.group.traverse(o => { if (o.isMesh) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) assert.ok(isFinite(p.getX(i) + p.getY(i) + p.getZ(i)), 'finite'); } });
  const keep = [{ x: 0, z: 0, r: 60 }], placed = World.scatter(island.group, { seed: 2, inner: 20, outer: 110, trees: 10, bushes: 12, rocks: 6, keep });
  assert.ok(placed.length > 15);
  for (const q of placed) { assert.ok(Math.hypot(q.x, q.z) >= 59 && Math.hypot(q.x, q.z) <= 110.01, 'placed in the ring, outside the kept circle'); assert.ok(q.object.userData.fade && q.object.userData.fade.r > 0); }
  const cam = new THREE.Vector3(placed[0].x, placed[0].object.userData.fade.cy, placed[0].z); World.clearView(placed.map(q => q.object), cam);
  assert.equal(placed[0].object.visible, false, 'a camera inside a bush hides it'); cam.x += 500; World.clearView(placed.map(q => q.object), cam); assert.ok(placed.every(q => q.object.visible));
  const deck = World.deck({ radius: 40 }), rug = World.rug(20, 10, 0.1); assert.ok(deck.children.length >= 2 && rug.position.y === 0.1);
});
