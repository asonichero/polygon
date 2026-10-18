// Climbing Toward Consequence — the camera angles of the capture (Gerda catches Jack), as set in scene-notes.html and pasted back: { beat: { pos, look, fov } }, numbered as scene-notes numbers them.
// Beats 1 to 9 (the dialogue in her hand) are kept relative to where Gerda stands and which way she faces in the reference run (REF), so that they hold wherever she picks her spot; 10 on (the box) are absolute.
(function (root) {
'use strict';
root.CaptureCams = {
  ref: { x: 131.62, z: -84.99, h: Math.PI / 2 },
  relativeTo: 9,
  cams: {
    1: { pos: [184, 37, -90], look: [140, 34, -81], fov: 38 },
    2: { pos: [142, 37, -95], look: [144, 33, -87], fov: 60 },
    3: { pos: [184, 37, -90], look: [140, 34, -81], fov: 38 },
    4: { pos: [140, 38, -108], look: [144, 32, -86], fov: 20 },
    5: { pos: [183.9, 37.2, -90], look: [139.9, 34.2, -81], fov: 38 },
    6: { pos: [140, 38, -108], look: [144, 32, -86], fov: 20 },
    7: { pos: [184, 37.2, -89.9], look: [140, 34.2, -80.9], fov: 38 },
    8: { pos: [136, 38, -85], look: [144, 30, -78], fov: 22 },
    13: { pos: [98, 26, -92], look: [108, 36, -92], fov: 85 },
    14: { pos: [118, 66, -92], look: [100.2, 28, -92], fov: 20 },
  },
};
})(typeof window !== 'undefined' ? window : globalThis);
