// The pain model: smacks build distress, it fades with time, clothing blunts only the sting, and too much stops the scene.
const test = require('node:test'), assert = require('node:assert/strict');
const { PAIN, createPain } = require('../js/pain.js');

test('a smack adds distress, and a heavier implement adds more', () => {
  const a = createPain(), b = createPain();
  a.hit({ implement: 'hand' }); b.hit({ implement: 'paddle' });
  assert.ok(a.distress() > 0 && b.distress() > a.distress());
});

test('distress fades with time unless it is held', () => {
  const p = createPain(); for (let i = 0; i < 10; i++) p.hit({ implement: 'hand' });
  const d0 = p.distress(); p.update(30); assert.ok(p.distress() < d0);
});

test('clothing cuts the sting but not the ache', () => {
  const bare = createPain(), clad = createPain();
  const h0 = bare.hit({ implement: 'hand' }), h1 = clad.hit({ implement: 'hand', cushion: PAIN.CUSHION.trousers });
  assert.ok(h1.pain < h0.pain); assert.equal(clad.ache, bare.ache); assert.ok(clad.sting < bare.sting);
});

test('the bands rise with distress and too much sets tooHarsh', () => {
  const p = createPain(); assert.equal(p.band(), 'composed');
  let guard = 0; while (!p.tooHarsh && guard++ < 500) p.hit({ implement: 'paddle', strength: 1 });
  assert.ok(p.tooHarsh); assert.equal(p.band(), 'too harsh'); assert.equal(p.receptivity(), 0);
});

test('reset clears everything', () => {
  const p = createPain(); p.hit({ implement: 'hand' }); p.reset();
  assert.equal(p.distress(), 0); assert.equal(p.hits, 0); assert.equal(p.tooHarsh, false);
});
