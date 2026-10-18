// Polygon — the screens around the stage: the content notice, the title (over the turntable), settings, the pause menu; and the sandbox's start.
(function (root) {
'use strict';
const $ = id => document.getElementById(id), A = root.GameAudio;
const G = root.Game.create({ stage: $('stage'), fade: $('fade'), subs: $('subs'), subWho: $('subWho'), subText: $('subText') });
root.__game = G;
const world = G.world0 = root.Stage.build(G); G.setScene(world);
const hud = { hint: $('hint'), toast: $('toast'), size: $('sizeTag') };
const show = id => document.querySelectorAll('.screen').forEach(s => { if (s.id === id) s.classList.add('on'); else if (s.id !== 'dev') s.classList.remove('on'); });
const hideAll = () => document.querySelectorAll('.screen').forEach(s => { if (s.id !== 'dev') s.classList.remove('on'); });
const wake = () => { if (A) { A.init(); A.startMusic(); A.ambience({ wind: 0.4, birds: 0.4, fire: 0 }); } };

const toTitle = () => {
  root.Stage.stop(G, world); G.mode = 'title'; G.skipping = false; G.hideLine(); document.body.classList.remove('cutscene', 'playing');
  $('fade').style.transition = 'opacity .8s ease'; $('fade').style.opacity = 0;
  root.Stage.title(G, world); show('title'); $('dev').style.display = 'block';
  if (A && A.ctx) { A.ambience({ wind: 0.4, birds: 0.4, fire: 0 }); A.duckMusic(1, 2); A.startMusic(); }
};
G.setScene(world); G.mode = 'title'; root.Stage.title(G, world);

// Notice and 18+ confirmation, remembered once given.
if (G.store.get(G.NOTICE_KEY, false)) toTitle(); else { G.mode = 'notice'; show('notice'); }
$('noticeYes').onclick = () => { G.store.set(G.NOTICE_KEY, true); wake(); toTitle(); };
$('noticeNo').onclick = () => { location.href = 'about:blank'; };

// Menu. (A tap here is also what lets the browser start the sound.)
$('bPlay').onclick = () => { wake(); hideAll(); $('dev').style.display = 'none'; root.Stage.play(G, world, hud); };
$('bSettings').onclick = () => { wake(); show('settings'); };
$('bBack').onclick = () => { G.saveSettings(); if (pmOpen()) pmBack(); else show('title'); };
$('skip').onclick = () => { G.skipping = true; };

// Debug controls over a cutscene (shown with ?debug): pause / play, back to the previous beat, on to the next.
if (/[?&]debug\b/.test(location.search)) G.debugCtl = true;
$('dbgBack').onclick = () => G.rewind(); $('dbgPlay').onclick = () => G.pause(); $('dbgFwd').onclick = () => G.forward();
setInterval(() => { const on = G.debugCtl && G.mode === 'cutscene'; document.body.classList.toggle('dbg', on); if (on) { $('dbgPlay').textContent = G.paused ? '▶' : '❚❚'; $('dbgBack').disabled = !G.rerun; $('dbgInfo').textContent = 'beat ' + G.beat + (G.seekTo != null ? ' → ' + G.seekTo : ''); } }, 150);

// The pause menu: the Menu button, or Escape, during anything playable. It stops the scene where it stands; its settings open in the same pop-up.
const setCard = $('settings').firstElementChild, pm = $('pmenu');
const pmOpen = () => pm.classList.contains('on');
const playable = () => !['title', 'notice', 'end'].includes(G.mode) && !document.querySelector('.screen.on:not(#dev):not(#pmenu)');
let pmWas = false;
function pmShow() { if (pmOpen() || !playable()) return; pmWas = G.paused; G.pause(true); pmBack(); pm.classList.add('on'); document.body.classList.add('pm'); }
function pmBack() { if (setCard.parentNode === pm) $('settings').appendChild(setCard); $('pmMain').style.display = ''; }
function pmHide() { pm.classList.remove('on'); document.body.classList.remove('pm'); pmBack(); if (!pmWas) G.pause(false); }
$('menuBtn').onclick = pmShow; $('pmResume').onclick = pmHide;
$('pmSettings').onclick = () => { $('pmMain').style.display = 'none'; pm.appendChild(setCard); };
$('pmTitle').onclick = () => { pmHide(); G.skipping = true; setTimeout(toTitle, 30); };
root.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (pmOpen()) { pmHide(); e.preventDefault(); } else if (playable()) { pmShow(); e.preventDefault(); } });
setInterval(() => document.body.classList.toggle('inplay', playable() && !pmOpen()), 150);

// Settings controls.
const vol = [['vMaster', 'master'], ['vMusic', 'music'], ['vSfx', 'sfx'], ['vVoice', 'voice']];
vol.forEach(([id, k]) => { const el = $(id); el.value = Math.round(A.vols[k] * 100); el.oninput = () => { A.init(); A.setVol(k, el.value / 100); if (k === 'sfx') A.thwack(0.7); if (k === 'voice') A.speak('gerda', 'Stand still, Jack.', 1); }; });
$('vSpeed').value = Math.round(G.settings.speed * 100); $('vSpeed').oninput = () => { G.settings.speed = $('vSpeed').value / 100; G.saveSettings(); };
$('cAuto').checked = G.settings.auto; $('cAuto').onchange = () => { G.settings.auto = $('cAuto').checked; G.saveSettings(); };
$('cSubs').checked = G.settings.subtitles; $('cSubs').onchange = () => { G.settings.subtitles = $('cSubs').checked; G.saveSettings(); };
$('sLines').value = String(G.settings.lines); $('sLines').onchange = () => G.applyDisplay({ lines: +$('sLines').value });
$('cDither').checked = !!G.settings.dither; $('cDither').onchange = () => G.applyDisplay({ dither: $('cDither').checked });
$('cSnap').checked = !!G.settings.snap; $('cSnap').onchange = () => G.applyDisplay({ snap: $('cSnap').checked });
$('cSmooth').checked = !!G.settings.smooth; $('cSmooth').onchange = () => G.applyDisplay({ smooth: $('cSmooth').checked });
})(window);
