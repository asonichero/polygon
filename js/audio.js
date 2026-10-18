// Climbing Toward Consequence — sound, all synthesised (no audio files): a soft pastoral score, ambience (wind, birds, a fire), the correction's smacks and Jack's cries (also used by
// the lap scene), and a speech babble for the cutscenes (a short vowel burst per word, higher for the mother, lower for Jack and the merchant).
// Browsers only start audio after a tap or key press: call GameAudio.init() from one (the title screen's buttons do).
(function (root) {
'use strict';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const A = { ctx: null, vols: { master: 0.8, music: 0.25, sfx: 0.8, voice: 0.7 }, nodes: {} };
try { const v = JSON.parse(localStorage.getItem('castle-consequence:volumes') || 'null'); if (v) Object.assign(A.vols, v); } catch (e) { /* no storage */ }

function noiseBuffer(ctx, seconds) {
  const n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

A.init = function () {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return A.ctx; }
  const Ctx = root.AudioContext || root.webkitAudioContext; if (!Ctx) return null;
  const ctx = A.ctx = new Ctx(), N = A.nodes;
  N.master = ctx.createGain(); N.master.connect(ctx.destination);
  N.music = ctx.createGain(); N.sfx = ctx.createGain(); N.voice = ctx.createGain(); N.amb = ctx.createGain();
  for (const g of [N.music, N.sfx, N.voice, N.amb]) g.connect(N.master);
  // A little room for the music and the voices: one soft feedback echo.
  N.echo = ctx.createDelay(1); N.echo.delayTime.value = 0.32; const fb = ctx.createGain(); fb.gain.value = 0.34; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  N.echo.connect(lp); lp.connect(fb); fb.connect(N.echo); lp.connect(N.master);
  N.music.connect(N.echo);                                                  // (the echo is fed after the music's volume, so the slider and the ducking govern it too)
  N.noise = noiseBuffer(ctx, 3);
  A.setVol();
  return ctx;
};
A.setVol = function (k, v) {
  if (k) { A.vols[k] = clamp(v, 0, 1); try { localStorage.setItem('castle-consequence:volumes', JSON.stringify(A.vols)); } catch (e) { /* no storage */ } }
  const N = A.nodes; if (!A.ctx) return;
  N.master.gain.value = A.vols.master; N.music.gain.value = A.vols.music * 0.5; N.sfx.gain.value = A.vols.sfx; N.voice.gain.value = A.vols.voice * 1.1; N.amb.gain.value = A.vols.sfx * 0.16;      // (the dialogue sits well above the wind, the birds and the fire)
};

// ── Music: a few short procedural pieces, one for each place. `A.startMusic({ theme })` begins one (or crossfades from the one that is playing); `A.stopMusic(secs)` fades it out. ──
//   pastoral (the farm and the road): four slow chords on a warm triangle pad, a soft plucked line over them.   dark: the same, muffled (the cottage at night).
//   climb (the beanstalk): a low heartbeat, a pulsing rising arpeggio, minor and urgent.   meadow (the cloud meadow): lydian, open and still, with high bells that ring on in the echo.
//   castle (inside it): C minor, a deep drone, a hushed organ pad and a lone music-box line that does not quite resolve.
const CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]];             // Am, F, C, G
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const THEMES = {
  pastoral: { dt: 0.75, cut: 1500, play(step, t, tone) {
    const bar = Math.floor(step / 8) % 4, chord = CHORDS[bar], beat = step % 8;
    if (beat === 0) { for (const m of chord) tone(hz(m - 12), t, 6.2, 'triangle', 0.07); tone(hz(chord[0] - 24), t, 6.4, 'sine', 0.09); }
    if (beat % 2 === 0 || beat === 5) { const m = chord[[0, 1, 2, 1, 2, 0, 1, 2][beat]] + 12 + ((beat === 6) ? 12 : 0); tone(hz(m), t, 1.6, 'sine', 0.05); } } },
  climb: { dt: 0.34, cut: 1300, play(step, t, tone) {
    const CH = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]], bar = Math.floor(step / 8) % 8, chord = CH[bar % 4], beat = step % 8, lift = bar >= 4 ? 5 : 0;     // Dm, Bb, Gm, A: the second time round it is lifted
    if (beat === 0) { for (const m of chord) tone(hz(m), t, 2.9, 'triangle', 0.045); tone(hz(chord[0] - 24), t, 2.8, 'sine', 0.1); }
    if (beat === 0 || beat === 3) tone(hz(chord[0] - 24), t, 0.45, 'sine', 0.13);                                                                                           // (the heartbeat)
    { const m = chord[[0, 1, 2, 1, 2, 1, 2, 0][beat]] + 12 + (beat > 4 ? 12 : 0) + lift * (beat === 7 ? 1 : 0); tone(hz(m), t, 0.3, 'triangle', 0.04 + 0.012 * (beat % 2 === 0 ? 1 : 0)); }
    if (bar % 2 === 1 && beat === 4) { const up = [62, 65, 69, 72][(bar >> 1) % 4] + lift; tone(hz(up), t, 1.6, 'sine', 0.05); } } },
  meadow: { dt: 0.9, cut: 2600, play(step, t, tone, rnd) {
    const CH = [[48, 55, 59, 64], [50, 57, 62, 66], [52, 59, 62, 67], [50, 57, 62, 66 + 12 - 12]], bar = Math.floor(step / 8) % 4, chord = CH[bar], beat = step % 8, SC = [72, 74, 76, 78, 79, 81, 83, 84, 86, 88];       // C lydian
    if (beat === 0) { for (const m of chord) tone(hz(m), t, 7.4, 'sine', 0.045, 1.8); tone(hz(chord[0] - 12), t, 7.6, 'sine', 0.08, 1.8); }
    if (beat === 2 || beat === 5 || (beat === 7 && rnd() < 0.5)) { const m = SC[Math.floor(rnd() * SC.length)]; tone(hz(m), t, 4.2, 'sine', 0.05); tone(hz(m) * 2.76, t, 1.4, 'sine', 0.012); } } },
  castle: { dt: 1.0, cut: 900, play(step, t, tone) {
    const CH = [[48, 51, 55], [44, 48, 51], [41, 44, 48], [43, 47, 50]], MEL = [[72, 0, 0, 70, 0, 67, 0, 0], [68, 0, 0, 72, 0, 0, 75, 0], [77, 0, 0, 75, 0, 72, 0, 0], [74, 0, 71, 0, 67, 0, 0, 0]], bar = Math.floor(step / 8) % 4, chord = CH[bar], beat = step % 8;       // Cm, Ab, Fm, G
    if (beat === 0) { for (const m of chord) tone(hz(m - 12), t, 8.4, 'sawtooth', 0.016, 2.2); tone(hz(36), t, 8.4, 'sine', 0.1, 1.6); tone(hz(43), t, 8.4, 'sine', 0.05, 1.6); }
    const m = MEL[bar][beat]; if (m) { tone(hz(m), t, 2.2, 'triangle', 0.045); tone(hz(m + 12), t, 0.9, 'sine', 0.014); } } },
};
THEMES.nursery = { dt: 0.5, cut: 3400, play(step, t, tone, rnd) {                    // a music-box lullaby in three, a little out of tune, over a low, slow pad
  const CH = [[48, 55], [45, 52], [41, 48], [43, 50], [48, 55], [40, 52], [41, 48], [48, 55]], MEL = [[79, 0, 76, 0, 72, 0], [76, 0, 72, 0, 69, 0], [77, 0, 74, 0, 72, 0], [71, 0, 74, 0, 79, 0], [79, 0, 76, 0, 72, 0], [76, 0, 79, 0, 83, 0], [81, 0, 77, 0, 74, 0], [72, 0, 0, 0, 0, 0]], bar = Math.floor(step / 6) % 8, beat = step % 6;
  if (beat === 0) { for (const m of CH[bar]) tone(hz(m), t, 3.2, 'sine', 0.06, 1.1); }
  const m = MEL[bar][beat]; if (m) { tone(hz(m), t, 1.5, 'sine', 0.05); tone(hz(m) * 4, t, 0.22, 'sine', 0.011); if (bar % 2 === 1 && rnd() < 0.7) tone(hz(m) * 1.034, t + 0.02, 1.1, 'sine', 0.013); }       // (the shadow note, a hair sharp, as if the box has gone slightly off)
} };
THEMES.dark = Object.assign({}, THEMES.pastoral, { cut: 700 });
A.startMusic = function (opts) {
  if (!A.ctx) return; const want = (opts && opts.theme) || (opts && opts.dark ? 'dark' : 'pastoral'); if (A.musicOn && A.musicTheme === want) return;
  if (A.musicOn) A.stopMusic(2.2);
  A.musicOn = true; A.musicTheme = want; const ctx = A.ctx, N = A.nodes, T = THEMES[want] || THEMES.pastoral; let step = 0, next = ctx.currentTime + 0.1, seed = 7 + want.length * 13;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const sess = ctx.createGain(); sess.gain.value = 1; const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = T.cut; filt.connect(sess); sess.connect(N.music);
  N.musicFilter = filt; A.musicSess = sess; let alive = true; A.musicStop = () => { alive = false; };
  const tone = (f, t, dur, type, peak, atk) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + (atk || Math.min(0.6, dur * 0.3))); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(filt); o.start(t); o.stop(t + dur + 0.05);
  };
  const tick = () => {
    if (!alive) return;
    while (next < ctx.currentTime + 1.5) { T.play(step, next, tone, rnd); next += T.dt; step++; }
    setTimeout(tick, 400);
  };
  tick();
};
A.stopMusic = function (fade = 1.5) {
  A.musicOn = false; A.musicTheme = null; if (A.musicStop) A.musicStop(); A.musicStop = null; if (!A.ctx || !A.musicSess) return;
  const g = A.musicSess.gain, t = A.ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + fade); A.musicSess = null;
};
A.duckMusic = function (to, secs = 1) { if (!A.ctx) return; const g = A.nodes.music, t = A.ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(Math.max(0.0001, A.vols.music * 0.5 * to), t + secs); };

// ── Ambience: wind (always, level 0..1), birds, a crackling fire. ─────────────────────────────────────────────────────────────────────────────────────
A.ambience = function (levels) {
  if (!A.ctx) return; const ctx = A.ctx, N = A.nodes; A.amb = Object.assign(A.amb || { wind: 0, birds: 0, fire: 0 }, levels);
  if (!N.windGain) {
    const src = ctx.createBufferSource(); src.buffer = N.noise; src.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.7;
    N.windGain = ctx.createGain(); N.windGain.gain.value = 0; src.connect(bp); bp.connect(N.windGain); N.windGain.connect(N.amb); src.start();
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 260; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    const fsrc = ctx.createBufferSource(); fsrc.buffer = N.noise; fsrc.loop = true; const flp = ctx.createBiquadFilter(); flp.type = 'lowpass'; flp.frequency.value = 220;
    N.fireGain = ctx.createGain(); N.fireGain.gain.value = 0; fsrc.connect(flp); flp.connect(N.fireGain); N.fireGain.connect(N.amb); fsrc.start();
    const chirp = () => {                                                         // birds and the fire's crackle: random little events
      const a = A.amb, t = ctx.currentTime;
      if (a.birds > 0.02 && Math.random() < 0.55) {
        const n = 1 + Math.floor(Math.random() * 3), f0 = 2200 + Math.random() * 1600;
        for (let i = 0; i < n; i++) { const o = ctx.createOscillator(), g = ctx.createGain(), s = t + i * 0.13; o.type = 'sine'; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(f0 * 1.35, s + 0.08);
          g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.05 * a.birds, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.1); o.connect(g); g.connect(N.amb); o.start(s); o.stop(s + 0.12); }
      }
      if (a.fire > 0.02) {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) { const s = t + Math.random() * 0.4, src2 = ctx.createBufferSource(); src2.buffer = N.noise; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500 + Math.random() * 2500;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.12 * a.fire * Math.random(), s + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.04 + Math.random() * 0.05);
          src2.connect(hp); hp.connect(g); g.connect(N.amb); src2.start(s, Math.random()); src2.stop(s + 0.12); }
      }
      N.ambTimer = setTimeout(chirp, 220 + Math.random() * 700);
    };
    chirp();
  }
  const t = ctx.currentTime; N.windGain.gain.linearRampToValueAtTime(0.35 * A.amb.wind, t + 1.5); N.fireGain.gain.linearRampToValueAtTime(0.5 * A.amb.fire, t + 1.5);
};

// ── Effects: a smack (muffled through a wall when `muffle` is set) and Jack's voice. ──────────────────────────────────────────────────────────────────
// A smack. muffle: false = bare skin in open air (a flat, bright slap with a crack and a little skin "pap"); true = through cloth (duller, with a thump);
// a number = a low-pass cutoff in Hz: a hand on bare skin heard through a wall, which opens up as the listener gets closer.
A.thwack = function (power, muffle, vol) {
  if (!A.init()) return; const ctx = A.ctx, N = A.nodes, t = ctx.currentTime + 0.01, k = vol == null ? 1 : vol, p = clamp(power, 0.2, 1.3);
  const clothed = muffle === true, cutoff = typeof muffle === 'number' ? muffle : clothed ? 1100 : 9000;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.6;
  const out = ctx.createGain(); out.gain.value = k * (1 + 0.5 * clamp(1 - cutoff / 6000, 0, 1)); lp.connect(out); out.connect(N.sfx);
  const burst = (start, len, peak, type, f, q) => {                                         // a slice of noise with a sharp edge and a quick decay
    const src = ctx.createBufferSource(); src.buffer = N.noise; const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(peak, start + 0.0015); g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    src.connect(flt); flt.connect(g); g.connect(lp); src.start(start, Math.random() * 2); src.stop(start + len + 0.02);
  };
  const tone = (start, f0, f1, len, peak) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, start); o.frequency.exponentialRampToValueAtTime(f1, start + len);
    g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(peak, start + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, start + len); o.connect(g); g.connect(lp); o.start(start); o.stop(start + len + 0.02);
  };
  if (clothed) { burst(t, 0.07, 0.5 * p, 'lowpass', 800, 0.5); tone(t, 170, 85, 0.12, 0.45 * p); return; }
  burst(t, 0.085, 0.9 * p, 'bandpass', 1500, 0.45);                                        // the flat of the palm, with some body to it
  burst(t + 0.002, 0.016, 0.5 * p, 'highpass', 3400, 0.7);                                  // the crack of the fingers
  burst(t + 0.011, 0.03, 0.25 * p, 'bandpass', 1200, 0.9);                                  // a second, softer slap as the hand settles
  tone(t, 380, 190, 0.09, 0.45 * p);                                                         // the "pap" of flesh
};
// The birch: the swish of the twigs through the air (call it as the arm comes down), and the sharp crack and scatter of them on bare skin.
A.swish = function (power, vol) {
  if (!A.init()) return; const ctx = A.ctx, N = A.nodes, t = ctx.currentTime + 0.005, k = vol == null ? 1 : vol, p = clamp(power, 0.3, 1.3);
  const src = ctx.createBufferSource(); src.buffer = N.noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(1100, t); f.frequency.exponentialRampToValueAtTime(5200, t + 0.11);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32 * p * k, t + 0.07); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  src.connect(f); f.connect(g); g.connect(N.sfx); src.start(t, Math.random() * 2); src.stop(t + 0.16);
};
A.birch = function (power, muffle, vol) {
  if (!A.init()) return; const ctx = A.ctx, N = A.nodes, t = ctx.currentTime + 0.01, k = vol == null ? 1 : vol, p = clamp(power, 0.2, 1.3), clothed = muffle === true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clothed ? 1500 : 11000; const out = ctx.createGain(); out.gain.value = k; lp.connect(out); out.connect(N.sfx);
  const burst = (start, len, peak, type, f, q) => { const src = ctx.createBufferSource(); src.buffer = N.noise; const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(peak, start + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, start + len); src.connect(flt); flt.connect(g); g.connect(lp); src.start(start, Math.random() * 2); src.stop(start + len + 0.02); };
  burst(t, 0.05, 0.75 * p, 'highpass', 3600, 0.7);                                                  // the crack, high and thin
  burst(t + 0.001, 0.07, 0.55 * p, 'bandpass', 2300, 0.6);                                          // the sting of it
  for (let i = 0; i < 5; i++) burst(t + 0.006 + i * 0.006 + Math.random() * 0.004, 0.02, 0.25 * p, 'highpass', 4500 + Math.random() * 2000, 0.8);   // the twigs landing one after another
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.07);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22 * p, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); o.connect(g); g.connect(lp); o.start(t); o.stop(t + 0.1);
};
A.voice = function (power, band, muffle, vol) {
  if (!A.init()) return; const ctx = A.ctx, N = A.nodes, k = (vol == null ? 1 : vol) * (muffle ? 2.2 : 1);
  const t0 = ctx.currentTime + 0.05 + Math.random() * 0.05, dur = [0.12, 0.2, 0.3, 0.42, 0.6, 0.6][band] || 0.3;
  const f0 = 125 + 70 * clamp(power, 0, 1.5) + 22 * band + Math.random() * 14;
  const vowel = [[420, 800], [760, 1150], [620, 1000], [700, 1100], [520, 920], [480, 880]][band] || [650, 1000];
  const osc = ctx.createOscillator(); osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f0, t0); osc.frequency.linearRampToValueAtTime(f0 * (band >= 3 ? 1.35 : band === 2 ? 1.12 : 0.9), t0 + dur);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = band >= 4 ? 7 : 5; lg.gain.value = band >= 4 ? f0 * 0.06 : f0 * 0.015; lfo.connect(lg); lg.connect(osc.frequency);
  const out = ctx.createGain(), peak = clamp(0.07 + 0.08 * power + 0.02 * band, 0.06, 0.28) * 3.6 * k;
  out.gain.setValueAtTime(0.0001, t0); out.gain.linearRampToValueAtTime(peak, t0 + 0.025); out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  for (const fc of vowel) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = 5; const g = ctx.createGain(); g.gain.value = fc === vowel[0] ? 1 : 0.6; osc.connect(f); f.connect(g); g.connect(out); }
  let dest = N.sfx; if (muffle) { const m = ctx.createBiquadFilter(); m.type = 'lowpass'; m.frequency.value = typeof muffle === 'number' ? muffle : 650; m.connect(N.sfx); dest = m; }
  out.connect(dest); osc.start(t0); lfo.start(t0); osc.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
};

// ── Speech babble: a vowel burst per word, so a line of dialogue is "spoken" over the length of its typing. who: 'mother' | 'jack' | 'gerda' | 'merchant' ──
const PITCH = { mother: 205, gerda: 190, jack: 135, merchant: 118, narrator: 150 };
A.speak = function (who, text, seconds, opts) {   // opts.muffle: heard through a wall (louder in the filter, to carry); opts.vol scales it
  if (!A.init()) return { stop() {} }; const ctx = A.ctx, N = A.nodes, base = PITCH[who] || 160, muffle = opts && opts.muffle;
  const words = text.split(/\s+/).filter(Boolean); let t = ctx.currentTime + 0.05; const step = seconds / Math.max(1, words.length), stopAt = t + seconds + 0.3, nodes = [];
  let dest = N.voice; if (muffle) { const m = ctx.createBiquadFilter(); m.type = 'lowpass'; m.frequency.value = (opts && opts.cutoff) || 520; m.connect(N.sfx); dest = m; }
  const vowels = [[700, 1100], [500, 1700], [350, 2300], [450, 800], [320, 900]];
  words.forEach((w, i) => {
    const s = t + i * step, len = clamp(0.05 + w.length * 0.018, 0.07, 0.2), v = vowels[(w.charCodeAt(0) + w.length) % vowels.length], q = /[?]$/.test(w) ? 1.18 : /[.!]$/.test(w) ? 0.88 : 1;
    const f0 = base * (0.92 + 0.16 * ((w.charCodeAt(w.length - 1) % 7) / 6)) * q;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, s); o.frequency.linearRampToValueAtTime(f0 * (q === 0.88 ? 0.9 : 1.05), s + len);
    g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.6 * (muffle ? 2 : 1) * ((opts && opts.vol) || 1), s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + len);
    for (const fc of v) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = 4; const gg = ctx.createGain(); gg.gain.value = fc === v[0] ? 1 : 0.5; o.connect(f); f.connect(gg); gg.connect(g); }
    g.connect(dest); o.start(s); o.stop(s + len + 0.05); nodes.push(o);
  });
  return { stop() { for (const o of nodes) { try { o.stop(); } catch (e) { /* already stopped */ } } } };
};
// Milky-White's low: a sawtooth that slides down through two throat formants, with a little shake in it.
A.moo = function (vol, seconds) {
  if (!A.init()) return; const ctx = A.ctx, N = A.nodes, t = ctx.currentTime + 0.03, d = seconds || 1.3, k = vol == null ? 1 : vol;
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(118, t + d * 0.25); o.frequency.linearRampToValueAtTime(78, t + d);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 3; lfo.connect(lg); lg.connect(o.frequency);
  const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(0.5 * k, t + 0.15); out.gain.setValueAtTime(0.5 * k, t + d * 0.6); out.gain.exponentialRampToValueAtTime(0.0001, t + d);
  for (const [fc, g] of [[300, 1], [820, 0.55]]) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(fc * 0.8, t); f.frequency.linearRampToValueAtTime(fc * 1.1, t + d * 0.5); f.Q.value = 4; const gg = ctx.createGain(); gg.gain.value = g; o.connect(f); f.connect(gg); gg.connect(out); }
  out.connect(N.sfx); o.start(t); lfo.start(t); o.stop(t + d + 0.1); lfo.stop(t + d + 0.1);
};
// The golden hen: 'content' is a soft, bubbling bok-bok; 'frantic' a quick run of sharp clucks; 'squawk' a harsh, rising shriek.
A.cluck = function (kind, vol) {
  if (!A.init()) return; const ctx = A.ctx, N = A.nodes, t = ctx.currentTime + 0.02, k = vol == null ? 1 : vol;
  const note = (start, f0, f1, len, peak, type, vib) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, start); o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), start + len);
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib; lg.gain.value = f0 * 0.06; l.connect(lg); lg.connect(o.frequency); l.start(start); l.stop(start + len + 0.05); }
    g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(peak * k, start + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    for (const [fc, gg] of [[1100, 1], [2400, 0.5]]) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = 3; const q = ctx.createGain(); q.gain.value = gg; o.connect(f); f.connect(q); q.connect(g); }
    g.connect(N.sfx); o.start(start); o.stop(start + len + 0.05);
  };
  if (kind === 'frantic') for (let i = 0; i < 5; i++) note(t + i * 0.07, 900 + Math.random() * 160, 560, 0.05, 0.2, 'sawtooth');
  else if (kind === 'squawk') { note(t, 720, 1250, 0.18, 0.26, 'sawtooth', 38); note(t + 0.17, 1250, 560, 0.38, 0.26, 'sawtooth', 44); }
  else { note(t, 560, 430, 0.07, 0.15, 'triangle'); note(t + 0.1, 500, 400, 0.06, 0.12, 'triangle'); }
};
// A door latch: the bar lifts with a tick, drops back with a clack, and the door gives a short creak.
A.latch = function (vol) {
  if (!A.init()) return; const ctx = A.ctx, N = A.nodes, t = ctx.currentTime + 0.02, k = vol == null ? 0.7 : vol;
  const burst = (start, len, peak, type, f, q) => {
    const src = ctx.createBufferSource(); src.buffer = N.noise; const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(peak * k, start + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    src.connect(flt); flt.connect(g); g.connect(N.sfx); src.start(start, Math.random() * 2); src.stop(start + len + 0.02);
  };
  burst(t, 0.03, 0.5, 'bandpass', 2600, 3); burst(t + 0.015, 0.05, 0.25, 'highpass', 4200, 0.7);       // the tick of the lifted bar
  burst(t + 0.22, 0.05, 0.7, 'bandpass', 1400, 2.2); burst(t + 0.225, 0.09, 0.4, 'lowpass', 500, 0.6);  // the clack of it falling clear
  const creak = ctx.createOscillator(), cg = ctx.createGain(), cf = ctx.createBiquadFilter(); creak.type = 'sawtooth'; creak.frequency.setValueAtTime(95, t + 0.45); creak.frequency.linearRampToValueAtTime(140, t + 0.95);
  cf.type = 'bandpass'; cf.frequency.value = 520; cf.Q.value = 6; cg.gain.setValueAtTime(0.0001, t + 0.45); cg.gain.linearRampToValueAtTime(0.08 * k, t + 0.6); cg.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
  creak.connect(cf); cf.connect(cg); cg.connect(N.sfx); creak.start(t + 0.45); creak.stop(t + 1.05);
};
A.blip = function () { if (!A.init()) return; const ctx = A.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 660; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(g); g.connect(A.nodes.sfx); o.start(t); o.stop(t + 0.15); };

// A great bell tolling, low and slow, far off inside a stone place: a deep fundamental with the inharmonic partials of cast bronze, each ringing out long.
A.bell = function (vol) {
  if (!A.init()) return; const ctx = A.ctx, t = ctx.currentTime, v0 = vol == null ? 0.5 : vol;
  for (const [mul, g0, dec] of [[1, 1, 7], [2.01, 0.55, 5.5], [2.76, 0.4, 4], [4.1, 0.22, 3], [5.4, 0.12, 2.2]]) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'sine'; o.frequency.value = 73.4 * mul; lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * g0 * v0, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); o.connect(lp); lp.connect(g); g.connect(A.nodes.sfx); o.start(t); o.stop(t + dec + 0.1);
  }
};

A.thud = function (vol) {                                       // a heavy tread somewhere overhead
  if (!A.init()) return; const ctx = A.ctx, t = ctx.currentTime, v0 = vol == null ? 0.6 : vol;
  for (const [f, d] of [[48, 0.5], [31, 0.8]]) { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); lp.type = 'lowpass'; lp.frequency.value = 220;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * v0, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(lp); lp.connect(g); g.connect(A.nodes.sfx || ctx.destination); o.start(t); o.stop(t + d + 0.1); }
};

root.GameAudio = A;
})(typeof window !== 'undefined' ? window : globalThis);
