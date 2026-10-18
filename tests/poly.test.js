// The character system, headless: build both figures against a stand-in canvas and check what a model has to be true to render and to pose: finite geometry, UVs inside the atlas,
// outward smooth normals, the skeleton the correction scene was tuned on, a polygon budget, and that every state the scenes ask for paints without an error.
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.join(__dirname, '..');

// A canvas that remembers nothing: enough for the painters to run.
const fakeCtx = () => ({ fillStyle: '', imageSmoothingEnabled: false, fillRect() {}, clearRect() {}, drawImage() {}, putImageData() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) });
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }) };
global.window = global; global.THREE = require(path.join(root, 'vendor', 'three.min.js'));
for (const f of ['poly-geo', 'poly', 'poly-jack', 'poly-gerda']) require(path.join(root, 'js', f + '.js'));
const P = global.Poly, THREE = global.THREE;

const meshes = obj => { const out = []; obj.traverse(o => { if (o.isMesh) out.push(o); }); return out; };

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

for (const [name, make] of [['Jack', () => P.makeJack()], ['Gerda', () => P.makeGerda('Work')]]) {
  test(`${name}: the skeleton is the one the correction scene was tuned on`, () => {
    const r = make();
    for (const k of ['root', 'hips', 'torso', 'pelvis', 'neck', 'armL', 'armR', 'elbow', 'elbowL', 'wrist', 'wristL', 'legL', 'legR', 'paint', 'apply', 'stretchShins', 'atlas']) assert.ok(r[k], k);
    assert.equal(r.neck.position.y, 12); assert.equal(r.pelvis.position.y, 1.5); assert.equal(r.armL.position.x, 5.5); assert.equal(r.armR.position.x, -5.5); assert.equal(r.armL.position.y, 10);
    assert.equal(r.elbow.position.y, -4); assert.equal(r.legL.knee.position.y, -6); assert.equal(r.legL.thigh.position.x, 2); assert.equal(r.legR.thigh.position.x, -2);
    assert.equal(r.armL.userData.sign, 1); assert.equal(r.armR.userData.sign, -1); assert.equal(r.legL.sign, 1);
  });
  test(`${name}: geometry is finite, UVs lie inside the atlas, and the polygon budget holds`, () => {
    const r = make(), tris = P.triCount(r.root);
    for (const m of meshes(r.root)) {
      const g = m.geometry, p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { assert.ok(isFinite(p.getX(i) + p.getY(i) + p.getZ(i)), m.name + ' position'); assert.ok(uv.getX(i) >= 0 && uv.getX(i) <= 1 && uv.getY(i) >= 0 && uv.getY(i) <= 1, `${m.name} uv ${uv.getX(i)},${uv.getY(i)}`); }
    }
    assert.ok(tris > 700 && tris < 2400, `${name} has ${tris} visible triangles: a main character of the era`);
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
  g.paint({ outfit: 'Fine' }); assert.ok(g.legL.skirtFine.visible && !g.legL.skirtWork.visible && g.bracelets[0].visible && g.anklets[0].visible);
  g.paint({ outfit: 'Work' }); assert.ok(g.legL.skirtWork.visible && !g.legL.skirtFine.visible && !g.bracelets[0].visible);
  assert.equal(P.gerdaExprIndex('stern'), 1);
});

test('the atlas packs both figures into 128 x 128', () => {
  for (const r of [P.makeJack(), P.makeGerda('Fine')]) { const A = r.atlas; assert.equal(A.w, 128); assert.equal(A.h, 128); for (const s of Object.values(r.sheets)) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= 128 && s.y + s.h <= 128, s.name); }
});
