// Polygon — the picture: a Nintendo Switch-era toon look, in the spirit of Wind Waker HD and Mika and the Witch's Mountain.
//   * Toon shading: a soft two-step ramp whose shadows are tinted, not greyed (violet in the shade, warm in the light), and a faint rim light that lifts the edges.
//   * Ink: an inverted-hull outline on every model, drawn a fixed number of screen pixels wide and coloured from the model's own texture (a darker skin, a darker plum), never plain black.
//   * Soft shadows from one sun, a painted sky with clouds, a little fog toward the horizon.
//   * A post pass: multisampled colour, a bloom that gives the bright places their glow, and a gentle grade (a touch more colour and contrast, a soft vignette).
// Nothing in a scene has to know: Look.attach(renderer) wraps the renderer's own render(); Look.decorate(object) inks whatever meshes it holds; Look.rig(scene) lights, fogs and skies a scene.
//
//   const look = Look.attach(renderer, { outline: true, bloom: true, shadows: true, scale: 1 });
//   const rig = Look.rig(scene);  Look.decorate(model);
//   look.set({ bloom: false })   // any of the settings, live
(function (root) {
'use strict';
const THREE = root.THREE, V3 = THREE.Vector3;
const Look = root.Look = { settings: { outline: true, bloom: true, shadows: true, scale: 1 }, thick: { value: 2.0 }, view: { value: new THREE.Vector2(1280, 720) }, active: null };

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Toon material: three's own MeshToonMaterial with the ramp and a rim light swapped into its shader.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const RAMP = `
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
  float d = dot( normal, lightDirection );
  float lit = smoothstep( -0.04, 0.26, d );
  float core = smoothstep( -0.75, -0.25, d );
  vec3 shade = mix( vec3( 0.27, 0.26, 0.50 ), vec3( 0.46, 0.44, 0.64 ), core );       // the shadow: violet, lighter where light bounces back
  return mix( shade, vec3( 1.0, 0.985, 0.95 ), lit );                                  // the light: a little warm
}`;
function patchToon(shader) {
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <gradientmap_pars_fragment>', RAMP)
    .replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
      `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
       { vec3 V = normalize( vViewPosition ); float rimD = 1.0 - saturate( dot( normalize( normal ), V ) ); float rim = smoothstep( 0.58, 0.92, rimD );
         outgoingLight += diffuseColor.rgb * rim * 0.26 * vec3( 1.0, 0.96, 0.9 ); }`);
}
// Look.toon({ map, color, vertexColors, side, ... }): a material in the house style.
Look.toon = function (o) {
  const m = new THREE.MeshToonMaterial(Object.assign({}, o));
  m.onBeforeCompile = patchToon; m.customProgramCacheKey = () => 'polygon-toon-1';
  return m;
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Ink: an inverted hull. A second copy of each mesh, drawn back faces only, pushed outward along its smooth normals by a fixed number of screen pixels, in a darker shade of its own texture.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const HULL_VERT = `
#include <common>
#include <fog_pars_vertex>
uniform float uThick; uniform vec2 uView;
attribute vec3 outlineNormal;
varying vec2 vUv; varying vec3 vVC;
void main() {
  vUv = uv;
  #ifdef USE_COLOR
    vVC = color;
  #else
    vVC = vec3( 1.0 );
  #endif
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  vec4 clip = projectionMatrix * mvPosition;
  vec3 n = normalize( normalMatrix * outlineNormal );
  vec4 cn = projectionMatrix * vec4( n, 0.0 );
  vec2 dir = cn.xy * uView; float l = length( dir ); dir = l > 1e-5 ? dir / l : vec2( 0.0 );
  clip.xy += dir / uView * 2.0 * uThick * clip.w;
  gl_Position = clip;
  #include <fog_vertex>
}`;
const HULL_FRAG = `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D map; uniform vec3 uColor; uniform vec3 uTint;
varying vec2 vUv; varying vec3 vVC;
void main() {
  #ifdef USE_HMAP
    vec3 c = texture2D( map, vUv ).rgb;
  #else
    vec3 c = uColor;
  #endif
  gl_FragColor = vec4( c * vVC * uTint, 1.0 );
  #include <fog_fragment>
}`;
const hulls = new Map();
function hullMaterial(map, color) {
  const key = map ? map.uuid : 'c' + color.getHex();
  let m = hulls.get(key); if (m) return m;
  const fog = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
  m = new THREE.ShaderMaterial({
    uniforms: Object.assign(fog, { uThick: Look.thick, uView: Look.view, map: { value: map || null }, uColor: { value: color ? color.clone().convertLinearToSRGB() : new THREE.Color(1, 1, 1) }, uTint: { value: new THREE.Color(0.34, 0.27, 0.36) } }),
    vertexShader: HULL_VERT, fragmentShader: HULL_FRAG, side: THREE.BackSide, fog: true, vertexColors: true, defines: map ? { USE_HMAP: '' } : {},
  });
  m.visible = Look.settings.outline; hulls.set(key, m); return m;
}
// Smooth outward normals for geometry whose own normals are hard (boxes, extrusions): each vertex takes the average of every normal at its position.
function outlineNormals(geo) {
  if (!geo.attributes.color) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  if (geo.attributes.outlineNormal) return;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  if (geo.userData.smoothNormals) { geo.setAttribute('outlineNormal', n); return; }      // (lofted geometry: the normals are already smooth)
  const sum = new Map(), key = i => Math.round(p.getX(i) * 1000) + ',' + Math.round(p.getY(i) * 1000) + ',' + Math.round(p.getZ(i) * 1000);
  for (let i = 0; i < p.count; i++) { const k = key(i); let s = sum.get(k); if (!s) sum.set(k, s = [0, 0, 0]); s[0] += n.getX(i); s[1] += n.getY(i); s[2] += n.getZ(i); }
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const s = sum.get(key(i)), l = Math.hypot(s[0], s[1], s[2]) || 1; out[i * 3] = s[0] / l; out[i * 3 + 1] = s[1] / l; out[i * 3 + 2] = s[2] / l; }
  geo.setAttribute('outlineNormal', new THREE.BufferAttribute(out, 3));
}
// Ink every mesh under `obj` that has not been inked (skipping hulls, transparent things and anything marked userData.noOutline).
Look.decorate = function (obj) {
  const todo = [];
  obj.traverse(m => { if (m.isMesh && !m.userData.hull && !m.userData.noOutline && !m.userData.inked && m.material && !m.material.isShaderMaterial && !m.material.transparent && !m.isSkinnedMesh) todo.push(m); });
  for (const m of todo) {
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    outlineNormals(m.geometry);
    const h = new THREE.Mesh(m.geometry, hullMaterial(mat.map || null, mat.map ? null : mat.color || new THREE.Color(1, 1, 1)));
    h.userData.hull = true; h.castShadow = false; h.receiveShadow = false; h.renderOrder = m.renderOrder; h.frustumCulled = false; m.userData.inked = true; m.add(h);
  }
  return obj;
};
// Everything the shadow pass and the lights should know about a model.
Look.shade = function (obj, cast, receive) { obj.traverse(m => { if (m.isMesh && !m.userData.hull) { m.castShadow = cast !== false; m.receiveShadow = receive !== false; } }); return obj; };

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Lights, fog and sky for a scene.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SKY_VERT = 'varying vec3 vDir; void main() { vDir = normalize( position ); gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }';
const SKY_FRAG = `
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform vec3 uSun; varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 c = h > 0.0 ? mix( uMid, uTop, pow( smoothstep( 0.0, 0.85, h ), 0.75 ) ) : mix( uMid, uLow, smoothstep( 0.0, -0.4, h ) );
  float s = max( dot( normalize( vDir ), normalize( uSun ) ), 0.0 );
  c += vec3( 1.0, 0.93, 0.75 ) * ( pow( s, 18.0 ) * 0.22 + pow( s, 400.0 ) * 0.9 );
  gl_FragColor = vec4( c, 1.0 );
}`;
function cloudTexture(seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  let s = seed >>> 0; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const puff = (px, py, rad, a) => { const g = x.createRadialGradient(px, py - rad * 0.25, rad * 0.1, px, py, rad); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.7, `rgba(250,252,255,${a * 0.9})`); g.addColorStop(1, 'rgba(240,246,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.fill(); };
  for (let i = 0; i < 9; i++) puff(40 + i * 22 + r() * 8, 70 - Math.sin(i / 8 * Math.PI) * 26 + r() * 8, 22 + Math.sin(i / 8 * Math.PI) * 18 + r() * 8, 0.95);
  const g = x.createLinearGradient(0, 60, 0, 112); g.addColorStop(0, 'rgba(180,200,235,0)'); g.addColorStop(1, 'rgba(170,190,230,0.55)'); x.globalCompositeOperation = 'source-atop'; x.fillStyle = g; x.fillRect(0, 60, 256, 60);   // (a blue-grey underside)
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
// Look.rig(scene, o): hemisphere light, the sun (with soft shadows), fog and a painted sky. Returns { hemi, sun, sky, fit(center, radius) }.
Look.rig = function (scene, o) {
  o = Object.assign({ top: 0x4e9be0, mid: 0xbfe0f4, low: 0xe3f0ee, fog: 0xbfe0f4, fogNear: 220, fogFar: 760, sun: [70, 120, 90], sunColor: 0xfff0d6, hemi: [0xe4f2ff, 0x8a7a62, 0.5], key: 0.5, shadow: 80, clouds: 9 }, o || {});
  const hemi = new THREE.HemisphereLight(o.hemi[0], o.hemi[1], o.hemi[2]); scene.add(hemi);
  const sun = new THREE.DirectionalLight(o.sunColor, o.key); sun.position.set(...o.sun); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.25; sun.shadow.radius = 2.5;
  const sc = sun.shadow.camera; sc.near = 10; sc.far = 600; sc.left = sc.bottom = -o.shadow; sc.right = sc.top = o.shadow;
  scene.add(sun); scene.add(sun.target);
  scene.background = new THREE.Color(o.fog); scene.fog = new THREE.Fog(o.fog, o.fogNear, o.fogFar);
  // the sky: a gradient dome that follows the camera, with a few clouds drifting round it
  const sky = new THREE.Group(); sky.userData.noOutline = true;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), new THREE.ShaderMaterial({ uniforms: { uTop: { value: new THREE.Color(o.top) }, uMid: { value: new THREE.Color(o.mid) }, uLow: { value: new THREE.Color(o.low) }, uSun: { value: new V3(...o.sun) } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }));
  dome.userData.noOutline = true; dome.renderOrder = -10; dome.frustumCulled = false; sky.add(dome);
  const clouds = new THREE.Group(); sky.add(clouds); let s = 7; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const tex = [cloudTexture(3), cloudTexture(11), cloudTexture(29)];
  for (let i = 0; i < o.clouds; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex[i % 3], transparent: true, depthWrite: false, fog: false, opacity: 0.95 })); m.userData.noOutline = true;
    const a = r() * Math.PI * 2, el = 0.12 + r() * 0.34, d = 0.92; m.position.set(Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(a) * Math.cos(el) * d); m.scale.set(0.5 + r() * 0.4, 0.22 + r() * 0.12, 1); m.userData.drift = 0.004 + r() * 0.004; m.userData.a = a; m.userData.el = el; m.renderOrder = -9; clouds.add(m);
  }
  sky.userData.clouds = clouds; scene.add(sky); scene.userData.sky = sky;
  const rig = { hemi, sun, sky, key: new V3(...o.sun), fit(center, radius) { sun.position.copy(center).add(rig.key); sun.target.position.copy(center); if (radius) { const c = sun.shadow.camera; c.left = c.bottom = -radius; c.right = c.top = radius; c.updateProjectionMatrix(); } } };
  return rig;
};
// The sky follows the camera and is sized to sit just inside its far plane.
function updateSky(scene, camera, dt) {
  const sky = scene.userData && scene.userData.sky; if (!sky) return;
  sky.position.copy(camera.position); sky.scale.setScalar(camera.far * 0.92);
  for (const c of sky.userData.clouds.children) { const a = c.userData.a += (dt || 0.016) * c.userData.drift, el = c.userData.el; c.position.set(Math.cos(a) * Math.cos(el) * 0.92, Math.sin(el) * 0.92, Math.sin(a) * Math.cos(el) * 0.92); }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The post pass: multisampled scene, bloom (bright pass, then blurs at a half, a quarter and an eighth of the size), a grade, and out.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const FS_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
const BRIGHT_FRAG = `uniform sampler2D tDiffuse; uniform float uThresh; varying vec2 vUv;
  void main() { vec3 c = texture2D( tDiffuse, vUv ).rgb; float l = dot( c, vec3( 0.299, 0.587, 0.114 ) ); float k = smoothstep( uThresh, uThresh + 0.22, l ); gl_FragColor = vec4( c * k, 1.0 ); }`;
const BLUR_FRAG = `uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
  void main() { vec3 c = texture2D( tDiffuse, vUv ).rgb * 0.2270270270;
    c += ( texture2D( tDiffuse, vUv + uDir * 1.3846153846 ).rgb + texture2D( tDiffuse, vUv - uDir * 1.3846153846 ).rgb ) * 0.3162162162;
    c += ( texture2D( tDiffuse, vUv + uDir * 3.2307692308 ).rgb + texture2D( tDiffuse, vUv - uDir * 3.2307692308 ).rgb ) * 0.0702702703; gl_FragColor = vec4( c, 1.0 ); }`;
const COMP_FRAG = `uniform sampler2D tScene; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3; uniform float uBloom; varying vec2 vUv;
  void main() {
    vec3 c = texture2D( tScene, vUv ).rgb;
    c += ( texture2D( tB1, vUv ).rgb * 0.55 + texture2D( tB2, vUv ).rgb * 0.7 + texture2D( tB3, vUv ).rgb * 0.8 ) * uBloom;
    float l = dot( c, vec3( 0.299, 0.587, 0.114 ) );
    c = mix( vec3( l ), c, 1.10 );                                           // a little more colour
    c = mix( c, c * c * ( 3.0 - 2.0 * c ), 0.22 );                           // a little more contrast
    vec2 q = vUv - 0.5; c *= 1.0 - dot( q, q ) * 0.42;                       // a soft vignette
    gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
  }`;
function attach(renderer, opts) {
  const raw = renderer.render.bind(renderer), gl2 = !!renderer.capabilities.isWebGL2;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const o = Object.assign({}, Look.settings, opts || {});
  const self = { enabled: true, outline: o.outline, bloom: o.bloom, shadows: o.shadows, scale: o.scale, t: 0 };
  const fsGeo = new THREE.BufferGeometry(); fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); fsGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsMesh = new THREE.Mesh(fsGeo, null); fsMesh.frustumCulled = false; fsScene.add(fsMesh);
  const sm = (frag, uniforms) => new THREE.ShaderMaterial({ uniforms, vertexShader: FS_VERT, fragmentShader: frag, depthTest: false, depthWrite: false });
  const mBright = sm(BRIGHT_FRAG, { tDiffuse: { value: null }, uThresh: { value: 0.84 } }), mBlur = sm(BLUR_FRAG, { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } });
  const mComp = sm(COMP_FRAG, { tScene: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, uBloom: { value: 0.5 } });
  let rts = null, key = '';
  const size = new THREE.Vector2();
  const mk = (w, h, ms) => { const f = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: !!ms, stencilBuffer: false }; const t = ms && gl2 ? new THREE.WebGLMultisampleRenderTarget(w, h, f) : new THREE.WebGLRenderTarget(w, h, f); if (ms && gl2) t.samples = 4; t.texture.encoding = THREE.sRGBEncoding; t.texture.generateMipmaps = false; return t; };
  function ensure() {
    renderer.getDrawingBufferSize(size);
    const W = Math.max(2, Math.round(size.x * self.scale)), H = Math.max(2, Math.round(size.y * self.scale)), k = W + 'x' + H;
    if (rts && key === k) return; if (rts) for (const t of Object.values(rts)) t.dispose();
    key = k; rts = { scene: mk(W, H, true) };
    for (const [n, d] of [['h', 2], ['q', 4], ['e', 8]]) { const w = Math.max(2, Math.round(W / d)), h = Math.max(2, Math.round(H / d)); rts[n + 'a'] = mk(w, h); rts[n + 'b'] = mk(w, h); }
  }
  const pass = (mat, target) => { fsMesh.material = mat; renderer.setRenderTarget(target); raw(fsScene, fsCam); };
  self.render = function (scene, camera) {
    Look.active = self; renderer.getDrawingBufferSize(size); Look.view.value.set(size.x * self.scale, size.y * self.scale); Look.thick.value = 2.2 * (size.y * self.scale / 720);
    for (const m of hulls.values()) m.visible = self.outline;
    updateSky(scene, camera, 0.016);
    if (scene.userData.lookShadows !== self.shadows) { scene.userData.lookShadows = self.shadows; scene.traverse(l => { if (l.isDirectionalLight && l.userData.noShadow !== true) l.castShadow = self.shadows; }); }
    ensure(); const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rts.scene); raw(scene, camera);
    let bloom = self.bloom;
    if (bloom) {
      mBright.uniforms.tDiffuse.value = rts.scene.texture; pass(mBright, rts.ha);
      let src = rts.ha;
      for (const n of ['h', 'q', 'e']) {
        const a = rts[n + 'a'], b = rts[n + 'b'];
        if (src !== a) { mBlur.uniforms.tDiffuse.value = src.texture; mBlur.uniforms.uDir.value.set(0, 0); pass(mBlur, a); }       // (a straight copy down to this size)
        mBlur.uniforms.tDiffuse.value = a.texture; mBlur.uniforms.uDir.value.set(1 / a.width, 0); pass(mBlur, b);
        mBlur.uniforms.tDiffuse.value = b.texture; mBlur.uniforms.uDir.value.set(0, 1 / a.height); pass(mBlur, a);
        src = a;
      }
      mComp.uniforms.tB1.value = rts.ha.texture; mComp.uniforms.tB2.value = rts.qa.texture; mComp.uniforms.tB3.value = rts.ea.texture;
    }
    mComp.uniforms.tScene.value = rts.scene.texture; mComp.uniforms.uBloom.value = bloom ? 0.3 : 0;
    if (!bloom) { mComp.uniforms.tB1.value = mComp.uniforms.tB2.value = mComp.uniforms.tB3.value = rts.scene.texture; }
    pass(mComp, prev);
  };
  self.set = function (s) { Object.assign(self, s); Object.assign(Look.settings, s); };
  self.resize = function () { /* the targets follow the drawing buffer on the next frame */ };
  renderer.render = self.render; renderer.look = self;
  return self;
}
Look.attach = attach;
})(typeof window !== 'undefined' ? window : globalThis);
