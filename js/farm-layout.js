// Beanstalk — the cottage's room layout: where the free-standing things stand, as { x, z, ry } on the floor (ry in radians). Written by room-editor.html (Copy layout): paste it over this file.
(function (root) {
'use strict';
root.FarmLayout = {
  chair: { x: -35, z: -35, ry: 0.785 },
  stool: { x: 26, z: -24, ry: 0 },
  rug: { x: 0, z: -24, ry: 0 },
  table: { x: 0, z: 25, ry: 0 },
  sack1: { x: -67.5, z: -38, ry: 1.571 },
  sack2: { x: -67.5, z: -51, ry: 1.571 },
  sack3: { x: -37, z: -67.5, ry: 0 },
  barrel: { x: -65, z: -65, ry: 0 },
  crate: { x: 66, z: -66, ry: 0 },
  stairs: { x: -64, z: 10, ry: 0 },
  broom: { x: 67, z: 67, ry: 0 },
  bed: { x: -34, z: 61.3, ry: 0 },
};
})(typeof window !== 'undefined' ? window : globalThis);
