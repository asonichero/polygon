// The pain model for the correction: each smack adds a sharp sting (which fades in seconds) and a deep ache (which fades over minutes); distress is their total
// against how much the subject can take, and the band it falls in drives his reactions (expression, kicking, voice). Clothing takes the edge off the sting only.
// Standalone: it needs nothing from the old engine. Exposes root.Pain = { PAIN, createPain }.
(function (root) {
'use strict';
const PAIN = {
  // base: pain of a full-strength smack at standard speed; sting: the share that is sharp (fades fast).
  implement: { hand: { base: 0.8, sting: 0.55 }, paddle: { base: 1.65, sting: 0.3 }, birch: { base: 1.35, sting: 0.82 } },   // (the birch is all bite: most of what it does is the sharp part)
  TAU_STING: 3.0, TAU_ACHE: 120,         // seconds for the sting and the ache to fall by 1/e, at resilience 0.5
  RESIST: 0.5,                          // resilience takes up to this share off every smack
  SPEED_EXP: 1.0,                        // pain ∝ speed ^ this
  ANTIC_MAX: 0.6, ANTIC_TAU: 1.0,        // dread adds up to this share, building over this many seconds of waiting
  DWELL_RATE: 0.9, DWELL_MAX: 2.0,      // staying on the skin adds this share of the smack per second, up to this many seconds
  TENDER: 0.6,                           // fully marked skin hurts this much more
  // What clothing takes off the sting (the sharp part; the deep ache goes through cloth untouched): by garment, stacking.
  CUSHION: { briefs: 0.12, shorts: 0.35, trousers: 0.4 }, CUSHION_MAX: 0.7,
  CAP: 70,                               // the capacity at tolerance 0.5 is CAP × (0.7 + 0.6 × tolerance)
  EDGE: 1, TOO_HARSH: 1.5,   // distress at the edge of resistance, and half again past it, where it's too harsh
  BANDS: [[0.3, 'composed'], [0.6, 'flinching'], [0.9, 'struggling'], [1, 'close to the edge of resistance'], [1.5, 'past the edge of resistance: most receptive'], [Infinity, 'too harsh']],
};

function createPain(stats = {}) {
  const st = { tolerance: 0.5, resilience: 0.5, ...stats };
  const P = { stats: st, sting: 0, ache: 0, hits: 0, last: null, dwell: 0, atEdge: false, atLimit: false, tooHarsh: false, peak: 0 };
  P.capacity = () => PAIN.CAP * (0.7 + 0.6 * st.tolerance);
  P.level = () => P.sting + P.ache;
  P.distress = () => P.level() / P.capacity();
  // How receptive he is to the lesson: little while composed, building as he struggles, fullest from the edge of resistance to half again past it, and gone once it's too harsh.
  P.receptivity = () => { const d = P.distress(), t = Math.max(0, Math.min(1, (d - 0.5) / 0.5)), r = 0.15 + 0.85 * t * t * (3 - 2 * t); return d < PAIN.TOO_HARSH ? r : 0; };
  P.inEdge = () => { const d = P.distress(); return d >= PAIN.EDGE && d < PAIN.TOO_HARSH; };
  const mark = () => { const d = P.distress(); if (d >= PAIN.EDGE) P.atEdge = P.atLimit = true; if (d >= PAIN.TOO_HARSH) P.tooHarsh = true; };
  P.band = () => PAIN.BANDS.find(([max]) => P.distress() < max)[1];
  // A smack lands. info: { implement, strength (0–1), speed (1 = standard), raised (seconds the arm waited raised), tender (0–1), cushion (0–1) }.
  // Returns { pain, reaction }: this smack's pain, and how hard he reacts (0–1) given it and how he already is.
  P.hit = info => {
    const cushion = Math.max(0, Math.min(PAIN.CUSHION_MAX, info.cushion || 0));
    const I = PAIN.implement[info.implement] || PAIN.implement.hand;
    const speed = Math.max(0.2, info.speed == null ? 1 : info.speed);
    const antic = PAIN.ANTIC_MAX * (1 - Math.exp(-(info.raised || 0) / PAIN.ANTIC_TAU)) * (1 - 0.5 * st.tolerance);
    const p = I.base * (info.strength == null ? 1 : info.strength) * Math.pow(speed, PAIN.SPEED_EXP) * (1 + antic)
      * (1 + PAIN.TENDER * (info.tender || 0)) * (1 - PAIN.RESIST * st.resilience);
    // Clothing blunts the sting only: the sharp share is cut, the ache comes through whole.
    const sting = p * I.sting * (1 - cushion), ache = p * (1 - I.sting), eff = sting + ache;
    P.sting += sting; P.ache += ache;
    P.hits++; P.dwell = 0; P.last = { sting, ache, p: eff, cushion };
    P.peak = Math.max(P.peak, P.distress());
    mark();
    // The reaction: how big this smack is against what he can take, how worked up he already is, and how long he waited for it.
    const reaction = Math.max(0, Math.min(1, 0.2 + 0.8 * (0.5 * eff / (0.3 * P.capacity()) + 0.35 * Math.min(1, P.distress()) + 0.15 * (antic / PAIN.ANTIC_MAX))));
    return { pain: eff, reaction, cushion };
  };
  // Every frame. `onSkin`: the hand or paddle is still on the skin from the last smack.
  P.update = (dt, onSkin = false) => {
    if (onSkin && P.last && P.dwell < PAIN.DWELL_MAX) {
      const d = Math.min(dt, PAIN.DWELL_MAX - P.dwell);
      P.sting += P.last.sting * PAIN.DWELL_RATE * d; P.ache += P.last.ache * PAIN.DWELL_RATE * d; P.dwell += d;
    }
    const k = 0.5 + st.resilience;   // the fade rate: resilient people recover faster
    P.sting *= Math.exp(-dt * k / PAIN.TAU_STING); P.ache *= Math.exp(-dt * k / PAIN.TAU_ACHE);
    mark();
  };
  P.reset = () => { P.sting = P.ache = 0; P.hits = 0; P.last = null; P.dwell = 0; P.atEdge = P.atLimit = P.tooHarsh = false; P.peak = 0; };
  return P;
}

const api = { PAIN, createPain };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.Pain = api;
})(typeof window !== 'undefined' ? window : globalThis);
