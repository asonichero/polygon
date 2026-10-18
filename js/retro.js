// Polygon — the late-90s picture. Retro.attach(renderer) makes everything that renders through that renderer go through a small low-resolution target, drawn up to the screen with
// hard pixels and then reduced to 15-bit colour with the PlayStation's ordered dither; optionally every vertex is snapped to the low-resolution pixel grid (the polygon "wobble"
// of the original hardware). Nothing else has to change: the renderer's own render() is wrapped.
//
//   const retro = Retro.attach(renderer, { lines: 480, dither: true, snap: false, smooth: false });
//   retro.set({ lines: 240 })      // internal vertical resolution; 0 is native (the effect is bypassed)
//   retro.enabled = false          // straight to the screen again
//   Retro.settings                 // what the game's settings screen reads and writes (kept in localStorage by the shell)
(function (root) {
'use strict';
const THREE = root.THREE;

const Retro = root.Retro = { snapUniform: { value: new THREE.Vector2(0, 0) }, installed: false, settings: { lines: 480, dither: true, snap: false, smooth: false } };

// Every material gets a vertex-snap hook (inert while the snap uniform is zero), installed once on the base Material.
function install() {
  if (Retro.installed) return; Retro.installed = true;
  THREE.Material.prototype.onBeforeCompile = function (shader) {
    if (!this.isMeshLambertMaterial && !this.isMeshBasicMaterial && !this.isMeshPhongMaterial) return;
    shader.uniforms.uSnapRes = Retro.snapUniform;
    shader.vertexShader = 'uniform vec2 uSnapRes;\n' + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      if (uSnapRes.x > 0.0) { vec4 sp = gl_Position; sp.xy = floor(sp.xy / sp.w * uSnapRes + 0.5) / uSnapRes * sp.w; gl_Position = sp; }`);
  };
}

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
  uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uDither; uniform float uLevels;
  varying vec2 vUv;
  float b2(float x, float y) { return 2.0 * x + 3.0 * y - 4.0 * x * y; }
  float bayer4(vec2 p) { vec2 q = floor(mod(p, 4.0)); return (4.0 * b2(mod(q.x, 2.0), mod(q.y, 2.0)) + b2(floor(q.x / 2.0), floor(q.y / 2.0))) / 16.0; }
  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float d = (bayer4(floor(vUv * uRes)) - 0.5 + 0.03125) * uDither;
    c = floor(c * uLevels + 0.5 + d) / uLevels;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`;

function attach(renderer, opts) {
  install();
  const raw = renderer.render.bind(renderer);
  const o = Object.assign({}, Retro.settings, opts || {});
  const self = { enabled: true, lines: o.lines, dither: o.dither, snap: o.snap, smooth: o.smooth, target: null, w: 0, h: 0 };
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uDither: { value: 1 }, uLevels: { value: 31 } }, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const quad = new THREE.Mesh(tri, mat); quad.frustumCulled = false; quadScene.add(quad);
  const size = new THREE.Vector2();
  function ensureTarget() {
    renderer.getDrawingBufferSize(size);
    const H = Math.max(1, Math.round(self.lines)), W = Math.max(1, Math.round(H * size.x / Math.max(1, size.y)));
    if (self.target && self.w === W && self.h === H && (self.target.texture.magFilter === THREE.LinearFilter) === !!self.smooth) return;
    if (self.target) self.target.dispose();
    const f = self.smooth ? THREE.LinearFilter : THREE.NearestFilter;
    self.target = new THREE.WebGLRenderTarget(W, H, { minFilter: f, magFilter: f, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false });
    self.target.texture.encoding = THREE.sRGBEncoding; self.target.texture.generateMipmaps = false; self.w = W; self.h = H;
    mat.uniforms.uRes.value.set(W, H); mat.uniforms.tDiffuse.value = self.target.texture;
  }
  self.active = () => self.enabled && self.lines > 0;
  self.render = function (scene, camera) {
    if (!self.active()) { Retro.snapUniform.value.set(0, 0); raw(scene, camera); return; }
    renderer.getDrawingBufferSize(size);
    if (self.lines >= size.y) { Retro.snapUniform.value.set(0, 0); raw(scene, camera); return; }       // (already no larger than the target: nothing to reduce)
    ensureTarget();
    Retro.snapUniform.value.set(self.snap ? self.w * 0.5 : 0, self.snap ? self.h * 0.5 : 0);
    mat.uniforms.uDither.value = self.dither ? 1 : 0;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(self.target); raw(scene, camera);
    renderer.setRenderTarget(prev); raw(quadScene, quadCam);
  };
  self.set = function (s) { Object.assign(self, s); Object.assign(Retro.settings, s); };
  self.resize = function () { /* the target follows the drawing buffer on the next frame */ };
  renderer.render = self.render; renderer.retro = self;
  return self;
}

Retro.attach = attach;
// Presets for the settings screen: the internal vertical resolution.
Retro.PRESETS = [['Native', 0], ['480 lines', 480], ['360 lines', 360], ['240 lines (PlayStation)', 240]];
install();
})(typeof window !== 'undefined' ? window : globalThis);
