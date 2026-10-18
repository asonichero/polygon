// Climbing Toward Consequence — the supporting cast, in the blocky style of js/blocky.js (same rig, same 64x64 skins, adults all).
//   Jack's Mother: a lightly greying blonde, close to Gerda in age; a shawl drawn tight round her shoulders, a linen apron, sleeves rolled to the forearm, eyes sharper
//     than frost and thin lips that press thinner when she disapproves (expr 1). A giver like Gerda: she has the same rig, so she can sit in the chair in the lap scene.
//   The Peddler: Gerda in disguise. Her own model under a hooded cloak that covers her hair and clothes (mask() / unmask() put it on and take it off); in disguise her hair
//     is fully grey and her lips more natural, and she is an ordinary adult's size.
//   The Merchant: weather-worn, bright-eyed, curious, his cloak dusted with stardust, a satchel of golden trinkets at his hip. Never a giver.
// Sizes: an ordinary adult (Jack at full size, his mother, the merchant, the peddler) stands at ADULT = 0.95 of the model's own scale; Gerda at full size is 1.0, a little over
// 105% of them. The lap viewer keeps its giver at 1.0 whoever she is, so the contact poses hold.
(function (root) {
'use strict';
const THREE = root.THREE, B = root.Blocky;
const { Skin, buildCharacter, SIDES, sideOuter } = B;
const ADULT = 0.95, GERDA = 1.0;

// A box whose every face shows a repeating 16x16 pixel texture at one skin pixel per unit, so cloth on a cloak matches the cloth on the skins.
function clothTexture(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); draw(x, c);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding;
  return t;
}
function clothBox(w, h, d, mat) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / 16, uv.getY(i) * dims[f][1] / 16); }
  return new THREE.Mesh(g, mat);
}
const noise = (x, base, tones, seed, density = 0.3) => {
  x.fillStyle = base; x.fillRect(0, 0, 16, 16); let s = seed;
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { s = (s * 1103515245 + 12345) >>> 0; const r = ((s >> 16) % 1000) / 1000; if (r < density) { x.fillStyle = tones[(s >> 8) % tones.length]; x.fillRect(i, j, 1, 1); } }
};
const lam = tex => new THREE.MeshLambertMaterial({ map: tex });
const col = hex => new THREE.MeshLambertMaterial({ color: new THREE.Color(hex).convertSRGBToLinear() });

// ---------------------------------------------------------------------------------------------------------------------------
// Jack's Mother, late fifties.
// ---------------------------------------------------------------------------------------------------------------------------
const MOTHER_BUN = ['#c8a96a', '#dcc48a', '#9c7f48', '#b99a5a', '#d8d2c4'];
const GREY_BUN = ['#8d8983', '#aaa6a0', '#6e6a65', '#98948e', '#d8d4ce'];
function paintMotherInto(k, st) {
  st = Object.assign({ expr: 0 }, st); const stern = st.expr === 1, soft = st.expr === 2;   // 0 composed, 1 disapproving, 2 softened
  k.ctx.clearRect(0, 0, 64, 64);
  const C = { skin: '#e4bd98', skinSh: '#c9a27e', skinHi: '#eccaa8', line: '#c0987a', brow: '#8c7448', white: '#eef0f0', iris: '#7ea2b8', lip: '#bf8a80', lipDk: '#93625b',
    hair: '#c8a96a', hairHi: '#dcc48a', hairDk: '#9c7f48', grey: '#d8d2c4',
    dress: '#6e5b48', dressDk: '#57463a', dressHi: '#85705a', shawl: '#6c7b86', shawlDk: '#56646e', shawlHi: '#8797a3', fringe: '#9aa7b0', knot: '#46525b',
    apron: '#cfc4a8', apronSh: '#b3a789', patch: '#bdae8c', stitch: '#8a7b5f', stock: '#8c857b', shoe: '#3d2c20', shoeHi: '#5a4130', sole: '#22160c', hem: '#7a6850' };
  const pal = { H: C.hair, h: C.hairHi, d: C.hairDk, g: C.grey, S: C.skin, s: C.skinSh, t: C.line, b: C.brow, W: C.white, E: C.iris, M: C.lip, m: C.lipDk, n: C.skinSh, k: C.skinHi };

  // Head: a lined, composed face; the eyes pale and level, the lips a single thin line (shorter and darker, with pressed corners, when she disapproves).
  k.all('head', C.skin);
  k.grid('head', 'front', [
    'HHHHHHHH',
    'HHHHHHHH',
    'HSSSSSSH',
    'HbbSSbbH',
    'HWESSEWH',
    'HSSnnSSH',
    'SSMMMMSS',
    'SSSsSSSS' ], pal);
  k.px('head', 'front', 1, 5, C.skinSh); k.px('head', 'front', 6, 5, C.skinSh);              // the faintest crow's feet
  if (stern) {
    k.grid('head', 'front', ['SSSmmSSS'], pal, 0, 6);                                       // the lips pressed thin
    k.px('head', 'front', 2, 6, C.line); k.px('head', 'front', 5, 6, C.line);               // pinched corners
    k.px('head', 'front', 2, 7, C.line); k.px('head', 'front', 5, 7, C.line);               // and drawn down
    k.px('head', 'front', 3, 3, C.brow); k.px('head', 'front', 4, 3, C.brow); k.px('head', 'front', 3, 2, C.line); k.px('head', 'front', 4, 2, C.line);   // a frown between the brows
  } else if (soft) {
    k.grid('head', 'front', ['SSMMMMSS'], pal, 0, 6); k.px('head', 'front', 2, 6, C.skinHi); k.px('head', 'front', 5, 6, C.skinHi);   // the lips a little fuller, the corners easing
    k.px('head', 'front', 3, 3, C.skin); k.px('head', 'front', 4, 3, C.skin); k.px('head', 'front', 1, 3, C.skin); k.px('head', 'front', 6, 3, C.skin);   // the brows lifting at the ends
    k.px('head', 'front', 2, 5, C.skinHi); k.px('head', 'front', 5, 5, C.skinHi);
  } else {
    k.grid('head', 'front', ['SSSMMSSS'], pal, 0, 6);                                       // thin even lips
    k.px('head', 'front', 2, 7, C.skinSh); k.px('head', 'front', 5, 7, C.skinSh);
  }
  k.fill('head', 'top', C.hair); k.fill('head', 'back', C.hair);
  for (const f of ['right', 'left']) { k.fill('head', f, C.skin); k.fill('head', f, C.hair, 0, 0, undefined, 3); }
  k.fill('head', 'right', C.hair, 0, 3, 3, 4); k.fill('head', 'left', C.hair, 5, 3, 3, 4);
  k.fill('head', 'right', C.hair, 7, 3, 1, 3); k.fill('head', 'left', C.hair, 0, 3, 1, 3);
  k.fill('head', 'right', C.skinSh, 4, 4, 1, 2); k.fill('head', 'left', C.skinSh, 3, 4, 1, 2);
  k.fill('head', 'bottom', C.skinSh);
  // Hair layer: swept back and pinned in a tight bun, a blonde just starting to grey at the temples and along the parting.
  k.fill('hat', 'top', C.hair); k.grid('hat', 'top', ['.h..h.h.', 'h..h..h.', '..h.h..h', 'h.h..h..', '.h..h..h', 'h...h.h.'], { h: C.hairHi }, 0, 1); k.px('hat', 'top', 3, 1, C.grey); k.px('hat', 'top', 4, 2, C.grey); k.px('hat', 'top', 2, 3, C.grey);
  k.fill('hat', 'back', C.hair, 0, 0, undefined, 7); k.fill('hat', 'back', C.hairDk, 0, 6, undefined, 1); k.px('hat', 'back', 2, 2, C.hairHi); k.px('hat', 'back', 5, 3, C.grey); k.px('hat', 'back', 3, 5, C.hairHi);
  for (const f of ['right', 'left']) k.fill('hat', f, C.hair, 0, 0, undefined, 3);
  k.fill('hat', 'right', C.hair, 0, 3, 3, 4); k.fill('hat', 'left', C.hair, 5, 3, 3, 4); k.px('hat', 'right', 1, 4, C.grey); k.px('hat', 'left', 6, 4, C.grey);
  k.grid('hat', 'front', ['HHHHHHHH', 'HgHHHgHH', 'g......g'], { H: C.hair, g: C.grey });

  // Torso: the dress, a faded shawl drawn tight across the shoulders and crossed over the chest (knotted at the breast bone, fringed ends), then a linen apron.
  k.all('body', C.dress);
  k.grid('body', 'front', [
    'ssSSSSss', 'sSsSSsSs', 'ssSKKSss', 'LsssKsss', 'sLssssLs', 'sssLssss', 'f.f.f.f.', 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd', 'dddddddd' ],
    { s: C.shawl, L: C.shawlHi, S: C.skin, K: C.knot, f: C.fringe, d: C.dress });
  k.grid('body', 'front', ['sssDDsss'], { s: C.shawlDk, D: C.shawlDk }, 0, 4);
  k.fill('body', 'back', C.dress); k.fill('body', 'back', C.shawl, 0, 0, undefined, 4); k.fill('body', 'back', C.shawl, 1, 4, 6, 1); k.fill('body', 'back', C.shawl, 2, 5, 4, 1); k.fill('body', 'back', C.shawl, 3, 6, 2, 1);
  k.grid('body', 'back', ['.L..L..L', 'L..L..L.', '..L..L..'], { L: C.shawlHi }, 0, 0); k.px('body', 'back', 3, 7, C.fringe); k.px('body', 'back', 4, 7, C.fringe);
  for (const f of ['right', 'left']) { k.fill('body', f, C.dress); k.fill('body', f, C.shawl, 0, 0, undefined, 6); k.px('body', f, 1, 2, C.shawlHi); k.px('body', f, 2, 4, C.shawlHi); }
  k.fill('body', 'top', C.shawl); k.fill('body', 'bottom', C.dressDk);
  // Outer layer: the skirt flaring from the hip, and a plain linen apron tied round the waist (no bib), a darned patch on its pocket.
  for (const f of ['right', 'left', 'back']) { k.fill('jacket', f, C.dress, 0, 8, undefined, 4); k.fill('jacket', f, C.dressDk, 0, 11, undefined, 1); }
  k.fill('jacket', 'front', C.dress, 0, 8, 1, 4); k.fill('jacket', 'front', C.dress, 7, 8, 1, 4);
  k.fill('jacket', 'front', C.apron, 1, 9, 6, 3); k.fill('jacket', 'front', C.apronSh, 1, 9, 6, 1);
  k.fill('jacket', 'front', C.patch, 2, 10, 4, 2); k.fill('jacket', 'front', C.stitch, 2, 10, 4, 1); k.px('jacket', 'front', 2, 11, C.stitch); k.px('jacket', 'front', 5, 11, C.stitch);
  for (const f of ['front', 'right', 'left', 'back']) { k.fill('jacket', f, C.apron, 0, 7, undefined, 2); k.fill('jacket', f, C.apronSh, 0, 8, undefined, 1); }
  k.fill('jacket', 'back', C.apronSh, 3, 7, 2, 3); k.fill('jacket', 'back', C.apron, 2, 9, 1, 3); k.fill('jacket', 'back', C.apron, 5, 9, 1, 3);

  // Arms (slim): the shawl over the shoulder, then the dress sleeve rolled to above the elbow in a thick cuff, and a strong, freckled forearm.
  for (const side of ['rArm', 'lArm']) {
    k.all(side, C.skin);
    k.band(side, C.shawl, 0, 3); k.band(side, C.shawlDk, 2, 1); k.band(side, C.dress, 3, 2); k.band(side, C.dressHi, 5, 1); k.band(side, C.dressDk, 6, 1);
    k.fill(side, 'top', C.shawl); k.fill(side, 'bottom', C.skinSh);
    k.band(side, C.skinHi, 7, 1); k.band(side, C.skinSh, 10, 1); k.px(side, 'front', 1, 8, C.line); k.px(side, 'front', 2, 9, C.line);
  }
  // Legs: wool stockings, stout shoes; the skirt's overlay runs to the ankle (a worn lighter hem), the apron down the front of the thighs.
  for (const leg of ['rLeg', 'lLeg']) {
    k.all(leg, C.stock);
    k.band(leg, C.shoe, 10, 2); k.band(leg, C.shoeHi, 10, 1); k.fill(leg, 'bottom', C.sole); k.fill(leg, 'top', C.dressDk); k.px(leg, 'front', 1, 11, C.shoeHi); k.px(leg, 'front', 2, 11, C.shoeHi);
    const o = sideOuter(leg);
    for (const f of SIDES) { k.fill(o, f, C.dress, 0, 0, undefined, 10); k.px(o, f, 1, 3, C.dressHi); k.px(o, f, 2, 7, C.dressHi); k.fill(o, f, C.hem, 0, 9, undefined, 1); k.fill(o, f, C.dressDk, 0, 10, undefined, 1); }
    const ax = leg === 'rLeg' ? 1 : 0;
    k.fill(o, 'front', C.apron, ax, 0, 3, 6); k.fill(o, 'front', C.apronSh, ax, 0, 3, 1); k.fill(o, 'front', C.stitch, ax, 6, 3, 1);
  }
  k.grain(3191, 5, [{ x: 8, y: 8, w: 8, h: 8 }]);
  return k;
}
function makeMother() {
  const rig = buildCharacter(paintMotherInto(new Skin(3, 3), { expr: 0 }), { armWidth: 3, bun: true, skirt: true, elbow: 'armR', bust: true, bunCols: MOTHER_BUN });
  rig.root.scale.setScalar(ADULT);                                      // an ordinary adult, a little smaller than Gerda
  rig.expr = 0;
  rig.setExpr = e => { rig.expr = e; paintMotherInto(rig.skin, { expr: e }); rig.tex.needsUpdate = true; };
  return rig;
}

// ---------------------------------------------------------------------------------------------------------------------------
// The Peddler: Gerda under a hooded travelling cloak. The cloak, hood and pack are plain 3D pieces over her ordinary model.
// ---------------------------------------------------------------------------------------------------------------------------
const DISGUISE = { hair: '#9a958f', hairHi: '#b8b3ad', hairDk: '#77726c', grey: '#d3cfc9', lip: '#c8877e', lipDk: '#a8625c' };   // fully grey hair, natural lips
function paintPeddlerInto(k) {
  B.paintGerdaInto(k, 'Work', DISGUISE);                                // her own face, her hair dyed grey and her lips left natural
  const cl = '#58553f', clDk = '#403e2e', boot = '#3a2a1e';
  for (const p of ['body', 'jacket', 'rArm', 'rArmO', 'lArm', 'lArmO', 'rLeg', 'rLegO', 'lLeg', 'lLegO']) { for (const f of ['right', 'front', 'left', 'back', 'top', 'bottom']) k.fill(p, f, f === 'bottom' ? clDk : cl); }
  for (const p of ['jacket', 'rArmO', 'lArmO', 'rLegO', 'lLegO']) for (const f of ['right', 'front', 'left', 'back', 'top', 'bottom']) { const r = B.faceRect(k.A[p], f); k.ctx.clearRect(r.x, r.y, r.w, r.h); }
  for (const side of ['rArm', 'lArm']) { k.band(side, '#d6a888', 10, 2); k.band(side, clDk, 9, 1); }   // bare hands at the cuffs
  for (const leg of ['rLeg', 'lLeg']) { k.band(leg, boot, 8, 4); k.fill(leg, 'bottom', '#22160c'); }
  k.grain(4421, 5, [{ x: 8, y: 8, w: 8, h: 8 }]);
  return k;
}
function makePeddler() {
  const rig = B.makeGerda('Work'); paintPeddlerInto(rig.skin); rig.tex.needsUpdate = true;
  const cloth = lam(clothTexture((x) => { noise(x, '#5c5a46', ['#4a4836', '#6a6850', '#3e3c2c', '#787558'], 11, 0.35); x.fillStyle = '#4a4836'; x.fillRect(0, 7, 16, 1); }));
  const mud = lam(clothTexture((x) => noise(x, '#4a3e2c', ['#382e20', '#5a4c36', '#2e261a'], 5, 0.5)));
  const patchM = lam(clothTexture((x) => { noise(x, '#7a6a48', ['#6a5c3c', '#8a7a58'], 9, 0.3); x.fillStyle = '#4a3e2c'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); }));
  const g = new THREE.Group(); rig.hips.add(g);
  const add = (mesh, x, y, z, parent) => { mesh.position.set(x, y, z); (parent || g).add(mesh); return mesh; };
  // The body of the cloak: a long box over shoulders and arms, flaring to a muddy hem just above the ground (the pivot is the hips, 12 up when she stands).
  add(clothBox(15.4, 14, 6.8, cloth), 0, 5.4, 0);                       // shoulders to the hips
  add(clothBox(16.6, 11.2, 8, cloth), 0, -7.2, 0);                      // the skirt of it
  add(clothBox(16.8, 2.4, 8.2, mud), 0, -11.2, 0);                      // the muddy hem
  add(clothBox(1.6, 11, 0.5, col('#2e2c20')), 0, -6.6, 4.05);            // the dark slit down the front, where it hangs open a little
  add(clothBox(5, 6, 1, patchM), 3, -3, -4.1); add(clothBox(3, 4, 1, patchM), -4, 1, -3.5);   // patches on the back
  add(clothBox(2, 2, 0.6, col('#b8923a')), 0, 11.2, 3.5);                // the brass clasp
  add(clothBox(8, 7, 5, mud), 0, 4, -6.8); add(clothBox(1, 8, 1, col('#5a4430')), -3.6, 5, -4.4); add(clothBox(1, 8, 1, col('#5a4430')), 3.6, 5, -4.4);   // a pedlar's pack and its straps
  // The hood, on the head: the top, the two sides and the back, with the front left open (the face sits in its shadow), a brim, and a cowl round the neck.
  const hood = new THREE.Group(); rig.neck.add(hood); hood.position.y = 4;
  add(clothBox(9.8, 1, 10.6, cloth), 0, 4.9, -0.3, hood); add(clothBox(1, 9.4, 10.6, cloth), 4.9, 0, -0.3, hood); add(clothBox(1, 9.4, 10.6, cloth), -4.9, 0, -0.3, hood);
  add(clothBox(9.8, 9.4, 1, cloth), 0, 0, -5.4, hood); add(clothBox(9.8, 1.4, 1.8, cloth), 0, 4.4, 5.3, hood);   // top, sides, back, the brim over the brow
  add(clothBox(1.4, 5, 1.4, cloth), 4.7, 2, 5.2, hood); add(clothBox(1.4, 5, 1.4, cloth), -4.7, 2, 5.2, hood);   // the hood's front edges
  add(clothBox(11, 2.6, 8, cloth), 0, -5.2, 0, hood);                    // the cowl
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false })); add(shade, 0, 2.4, 4.3, hood);   // the shadow the hood throws across her brow
  rig.cloakParts = [g, hood];
  rig.disguised = true;
  const GERDA_BUN = ['#4b3022', '#67432f', '#33201a', '#4b3022', '#b9b0a6'];
  const apply = on => {                                                    // the disguise: cloak, hood and pack, grey hair, an ordinary adult's size
    rig.disguised = on; if (on) paintPeddlerInto(rig.skin); else B.paintGerdaInto(rig.skin, 'Work'); rig.tex.needsUpdate = true;
    rig.cloakParts.forEach(p => { p.visible = on; }); rig.paintBun(on ? GREY_BUN : GERDA_BUN); rig.bun.visible = rig.pin.visible = !on;   // (the bun is tucked under the hood)
    rig.root.scale.setScalar(on ? ADULT : GERDA);
  };
  rig.mask = () => apply(true); rig.unmask = () => apply(false); apply(true);
  return rig;
}

// ---------------------------------------------------------------------------------------------------------------------------
// The Merchant: tall, weathered, bright-eyed and curious; a cloak of deep indigo dusted with stardust (it twinkles), a satchel of golden trinkets.
// ---------------------------------------------------------------------------------------------------------------------------
function paintMerchantInto(k) {
  k.ctx.clearRect(0, 0, 64, 64);
  const C = { skin: '#c99a73', skinSh: '#ad7e5a', skinHi: '#d8aa83', line: '#9c6e4c', hair: '#8a7e70', hairHi: '#a89d8f', hairDk: '#5c5247', white: '#ffffff', iris: '#4fc3e8', irisHi: '#d6f6ff',
    brow: '#6a5f52', beard: '#7b7266', beardDk: '#5f574c', lip: '#a8645a', mouth: '#5a2c28',
    tunic: '#7a5a3a', tunicDk: '#5f4429', tunicHi: '#94714a', shirt: '#d8c9a8', belt: '#3a2616', buckle: '#d9b24a', brace: '#4a3322', trou: '#3d3a36', trouDk: '#2c2a27', boot: '#4a3322', bootHi: '#6a4a30', sole: '#22160c' };
  const pal = { H: C.hair, h: C.hairHi, d: C.hairDk, S: C.skin, s: C.skinSh, t: C.line, b: C.brow, W: C.white, E: C.iris, e: C.irisHi, B: C.beard, D: C.beardDk, M: C.lip, m: C.mouth, n: C.skinSh };
  k.all('head', C.skin);
  k.grid('head', 'front', [
    'HHHHHHHH',
    'HhHHhHHH',
    'HSSSSbSH',
    'HSbbSSbH',
    'HWEeSEWH',
    'HtSnnStH',
    'SBDmMDBS',
    'SDBBBBDS' ], pal);
  k.px('head', 'front', 5, 4, C.iris); k.px('head', 'front', 4, 4, C.skin); k.px('head', 'front', 3, 4, C.skin); k.px('head', 'front', 2, 4, C.iris); k.px('head', 'front', 3, 4, C.skin);
  k.px('head', 'front', 1, 4, C.white); k.px('head', 'front', 6, 4, C.white); k.px('head', 'front', 2, 3, C.skinHi);    // wide, bright eyes
  k.px('head', 'front', 2, 4, C.irisHi); k.px('head', 'front', 5, 4, C.irisHi); k.px('head', 'front', 2, 5, C.iris);
  k.fill('head', 'top', C.hair); k.fill('head', 'back', C.hair); k.fill('head', 'back', C.beardDk, 0, 7, undefined, 1);
  for (const f of ['right', 'left']) { k.fill('head', f, C.skin); k.fill('head', f, C.hair, 0, 0, undefined, 3); }
  k.fill('head', 'right', C.hair, 0, 3, 2, 3); k.fill('head', 'left', C.hair, 6, 3, 2, 3); k.fill('head', 'right', C.beard, 3, 6, 5, 2); k.fill('head', 'left', C.beard, 0, 6, 5, 2);
  k.fill('head', 'bottom', C.beard);
  k.fill('hat', 'top', C.hair); k.grid('hat', 'top', ['.h..h..h', 'h..h.h..', '..h..h.h', '.h.h..h.', 'h...h..h', '..h.h...'], { h: C.hairHi }, 0, 1);
  k.fill('hat', 'back', C.hair, 0, 0, undefined, 5); k.px('hat', 'back', 2, 2, C.hairHi); k.px('hat', 'back', 5, 3, C.hairHi);
  for (const f of ['right', 'left']) k.fill('hat', f, C.hair, 0, 0, undefined, 3);
  k.grid('hat', 'front', ['HHHHHHHH', 'HhHH.hHH', 'H......H'], { H: C.hair, h: C.hairHi });
  // Torso: a travel-worn tunic open at the throat, a leather belt with a brass buckle, a strap (the satchel's) across the chest.
  k.all('body', C.tunic);
  k.grid('body', 'front', ['tSSSSSSt', 'ttSSSStt', 'tttSStt.', 'tttttttt', 'tttttttt', 'tttttttt', 'tttttttt', 'tttttttt', 'bbbBBbbb', 'tttttttt', 'tttttttt', 'DDDDDDDD'],
    { t: C.tunic, S: C.skin, b: C.belt, B: C.buckle, D: C.tunicDk, '.': C.tunic });
  k.fill('body', 'back', C.tunic); k.fill('body', 'back', C.tunicDk, 0, 11, undefined, 1); k.fill('body', 'back', C.belt, 0, 8, undefined, 1);
  for (const f of ['right', 'left']) { k.fill('body', f, C.tunic); k.fill('body', f, C.belt, 0, 8, undefined, 1); k.fill('body', f, C.tunicDk, 0, 11, undefined, 1); }
  k.fill('body', 'top', C.tunic); k.fill('body', 'bottom', C.tunicDk);
  k.grid('body', 'front', ['h.h..h..', '..h.h..h'], { h: C.tunicHi }, 0, 4);
  for (const side of ['rArm', 'lArm']) {
    k.all(side, C.tunic); k.band(side, C.tunicDk, 6, 1); k.band(side, C.brace, 8, 3); k.band(side, C.skin, 11, 1); k.fill(side, 'top', C.tunic); k.fill(side, 'bottom', C.skinSh);
    k.band(side, C.tunicHi, 2, 1);
  }
  for (const leg of ['rLeg', 'lLeg']) {
    k.all(leg, C.trou); k.band(leg, C.trouDk, 6, 1); k.band(leg, C.boot, 5, 7); k.band(leg, C.bootHi, 5, 1); k.fill(leg, 'bottom', C.sole); k.fill(leg, 'top', C.trouDk); k.fill(leg, 'front', C.trouDk, 1, 2, 2, 2);
    k.px(leg, 'front', 1, 8, C.buckle); k.px(leg, 'front', 2, 10, C.buckle);
  }
  k.grain(5531, 5, [{ x: 8, y: 8, w: 8, h: 8 }]);
  return k;
}
function makeMerchant() {
  const rig = buildCharacter(paintMerchantInto(new Skin(3, 3)), { armWidth: 3 });
  rig.root.scale.setScalar(ADULT);                                        // as tall as Jack at full size
  // The cloak: indigo wool, its stardust a handful of sparkles that twinkle (rig.tick(dt)).
  const dust = clothTexture(() => {}), ctx = dust.image.getContext('2d'); let phase = 0;
  const SPARK = [], rs = (() => { let s = 91; return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >> 8) / 16777216; }; })();
  for (let i = 0; i < 52; i++) SPARK.push({ x: Math.floor(rs() * 16), y: Math.floor(rs() * 16), c: ['#e8f0ff', '#9fd0ff', '#ffe9a8'][i % 3], p: Math.floor(rs() * 3) });
  const paintDust = () => {
    noise(ctx, '#2c3366', ['#232957', '#363e76', '#1d2248'], 21, 0.4);
    for (const s of SPARK) if ((phase + s.p) % 3 !== 0) { ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y, 1, 1); }
    dust.needsUpdate = true;
  };
  paintDust();
  const cloak = lam(dust), g = new THREE.Group(); rig.hips.add(g);
  const add = (mesh, x, y, z, parent) => { mesh.position.set(x, y, z); (parent || g).add(mesh); return mesh; };
  add(clothBox(15.6, 3.4, 8, cloak), 0, 11.8, 0);                         // the mantle over the shoulders
  add(clothBox(13.6, 21, 1.4, cloak), 0, 1.4, -3.6);                      // the long back of the cloak, hanging to the calf
  add(clothBox(1.4, 20, 5.4, cloak), 6.6, 1.2, -0.8); add(clothBox(1.4, 20, 5.4, cloak), -6.6, 1.2, -0.8);   // the open front edges
  add(clothBox(9, 4, 1.2, cloak), 0, 13.8, -3.2);                         // a high collar behind the neck
  // The satchel: a strap across the chest to a leather bag at the hip, its flap open on a few golden trinkets.
  const leather = col('#5a3a22'), gold = col('#e6b83a'), goldHi = col('#fbe08a');
  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 17, 0.5), leather); strap.position.set(0.4, 5.4, 2.4); strap.rotation.z = -0.62; g.add(strap);
  const bag = new THREE.Group(); bag.position.set(-6.4, -0.4, 0.4); g.add(bag);
  add(new THREE.Mesh(new THREE.BoxGeometry(2.8, 6.2, 6.4), leather), 0, 0, 0, bag); add(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 6.8), col('#7a5230')), 0, 3.2, 0, bag);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 1.2), gold), -1.5, 1.4, 0, bag);                                        // the buckle
  const trink = [[0.2, 3.9, -1.6, 1.4, 1.4, 0.5, gold], [0.2, 4.2, 0.3, 0.7, 2.4, 0.7, goldHi], [-0.3, 3.9, 1.8, 1.2, 1.2, 1.2, gold], [0.6, 4.6, -0.2, 1.8, 0.5, 0.5, goldHi], [0, 4.3, 2.4, 0.5, 1.8, 0.5, gold]];
  for (const [x, y, z, w, h, d, m] of trink) add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z, bag);             // a coin, a key, a bell, a star...
  rig.cloakParts = [g]; rig.tick = dt => { rig.t = (rig.t || 0) + dt; const p = Math.floor(rig.t * 2.5); if (p !== phase) { phase = p; paintDust(); } };
  return rig;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Milky-White, the family's last cow: a white cow with a few brown patches, thin from a dry season. Built of plain boxes; cow.tick(dt) lets her chew and flick her tail.
// ---------------------------------------------------------------------------------------------------------------------------
function makeCow() {
  const hide = lam(clothTexture(x => { noise(x, '#eae6dc', ['#d8d3c6', '#f4f1ea'], 3, 0.3); }));
  const patch = lam(clothTexture(x => { noise(x, '#7a5a3a', ['#6a4c30', '#8a6844'], 8, 0.3); }));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (m, x, y, z, par) => { m.position.set(x, y, z); (par || body).add(m); return m; };
  add(clothBox(14, 14, 30, hide), 0, 19, 0);                                          // the body
  add(clothBox(14.2, 8, 9, patch), 0, 22.5, 6); add(clothBox(14.2, 6, 7, patch), 0, 17, -9);   // brown patches
  add(clothBox(8, 3.4, 6, col('#d9a0a0')), 0, 10.4, -8);                                // the udder
  for (const [x, z] of [[-4.6, -11], [4.6, -11], [-4.6, 11], [4.6, 11]]) add(clothBox(4, 12.5, 4, hide), x, 6.25, z, g);   // legs
  for (const [x, z] of [[-4.6, -11], [4.6, -11], [-4.6, 11], [4.6, 11]]) add(clothBox(4.1, 2.2, 4.1, col('#3a2c20')), x, 1.1, z, g);   // hooves
  const head = new THREE.Group(); head.position.set(0, 24, 15); body.add(head);
  add(clothBox(9, 9, 10, hide), 0, -1, 4, head); add(clothBox(7, 5, 3.4, col('#d9a0a0')), 0, -3, 9.6, head);   // the head and her nose
  add(clothBox(1.6, 1.6, 1.6, col('#1b1410')), -3.2, 1.6, 8.6, head); add(clothBox(1.6, 1.6, 1.6, col('#1b1410')), 3.2, 1.6, 8.6, head);   // eyes
  add(clothBox(2.4, 1.2, 4, hide), -6, 2, 3, head); add(clothBox(2.4, 1.2, 4, hide), 6, 2, 3, head);                      // ears
  add(clothBox(1.2, 3.2, 1.2, col('#d8d0b8')), -3.4, 4.8, 3, head); add(clothBox(1.2, 3.2, 1.2, col('#d8d0b8')), 3.4, 4.8, 3, head);   // horns
  const tail = new THREE.Group(); tail.position.set(0, 24, -15); body.add(tail); add(clothBox(1.4, 12, 1.4, hide), 0, -6, -0.6, tail); add(clothBox(2, 3, 2, patch), 0, -12.5, -0.6, tail);
  g.userData = { head, tail, t: 0 };
  g.tick = dt => { const u = g.userData; u.t += dt; u.hb = (u.hb == null ? 0.1 : u.hb) + ((u.headBase == null ? 0.1 : u.headBase) - (u.hb == null ? 0.1 : u.hb)) * Math.min(1, dt * 3); head.rotation.x = u.hb + 0.08 * Math.sin(u.t * 1.3); head.rotation.y = 0.12 * Math.sin(u.t * 0.5); tail.rotation.z = 0.25 * Math.sin(u.t * 1.9); };
  return g;
}

root.Cast = { clothBox, clothTexture, noise, lam, col, makeCow, ADULT, GERDA, paintMotherInto, makeMother, paintPeddlerInto, makePeddler, paintMerchantInto, makeMerchant, MOTHER_BUN };
})(typeof window !== 'undefined' ? window : globalThis);
