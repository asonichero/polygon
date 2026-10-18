// Polygon — the debug library: an expandable panel on the title screen with everything the engine is made of (the tools and pages, the data the editors write, and every source file with its
// own description, read from its first comment line). To keep it complete, tests/files.test.js fails if a js file or page is not listed here.
(function () {
'use strict';
const LIB = {
  tools: [
    ['models.html', 'Models', 'Jack and Gerda: their poses, outfits, expressions, clothes and marks, the texture atlases, wireframe and the retro look.'],
    ['lap.html', 'Correction positions', 'The over-the-knee and over-the-table positions with their pose editor, and Jack\'s arm poses over the knee: reaching back for his belt, and pinned behind his back.'],
  ],
  data: ['js/lap-poses.js'],
  files: ['js/poly-geo.js', 'js/poly.js', 'js/poly-jack.js', 'js/poly-gerda.js', 'js/retro.js', 'js/game.js', 'js/stage.js', 'js/menus.js', 'js/debuglib.js', 'js/buildbadge.js', 'js/audio.js', 'js/touchui.js', 'js/pain.js', 'js/lap.js'],
};
(typeof window !== 'undefined' ? window : globalThis).DebugLib = LIB;
if (typeof document === 'undefined') return;

const css = document.createElement('style');
css.textContent = `#dlibBtn { background: #1a1d26; color: #c9b87a; border: 1px solid #4a4d58; border-radius: 4px; font-size: 12px; padding: 2px 8px; cursor: pointer; margin-left: 8px; }
  #dlib { position: fixed; left: 12px; bottom: 36px; width: min(620px, calc(100vw - 24px)); max-height: 72vh; overflow: auto; z-index: 40; background: rgba(10,12,16,0.95); border: 1px solid #4a4d58; border-radius: 8px; padding: 10px 12px; color: #ece8df; font: 13px Georgia, serif; display: none; }
  #dlib.on { display: block; } #dlib h4 { margin: 0 0 6px; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: #e6c46a; font-weight: normal; }
  #dlib details { margin: 6px 0; border-top: 1px solid #2a2e3a; padding-top: 6px; } #dlib summary { cursor: pointer; color: #e6c46a; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
  #dlib .row { display: flex; gap: 8px; align-items: baseline; margin: 4px 0; } #dlib .row a, #dlib .row button { color: #c9b87a; flex: none; text-decoration: none; background: none; border: 0; padding: 0; font: inherit; cursor: pointer; text-align: left; } #dlib .row a:hover, #dlib .row button:hover { text-decoration: underline; }
  #dlib .row span { opacity: .6; font-size: 12px; line-height: 1.35; } #dlib .nm { min-width: 190px; max-width: 190px; } #dlib input { width: 100%; box-sizing: border-box; background: #0d1018; color: #ece8df; border: 1px solid #3a3f52; border-radius: 4px; padding: 4px 6px; font: inherit; margin-bottom: 6px; }
  #dlib .hide { display: none; }`;
document.head.appendChild(css);

const dev = document.getElementById('dev'); if (!dev) return;
const btn = document.createElement('button'); btn.id = 'dlibBtn'; btn.textContent = 'Debug library ▸'; dev.appendChild(btn);
const panel = document.createElement('div'); panel.id = 'dlib'; document.body.appendChild(panel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let built = false, build = '';

function section(title, open, rows) { return '<details' + (open ? ' open' : '') + '><summary>' + esc(title) + ' (' + rows.length + ')</summary>' + rows.join('') + '</details>'; }
function build_() {
  built = true;
    const tools = LIB.tools.map(t => '<div class="row" data-q="' + esc((t[1] + ' ' + t[2] + ' ' + t[0]).toLowerCase()) + '"><a class="nm" href="' + esc(t[0]) + '" target="_blank">' + esc(t[1]) + '</a><span>' + esc(t[2]) + '</span></div>');
  const fileRow = f => '<div class="row" data-q="' + esc(f.toLowerCase()) + '" data-f="' + esc(f) + '"><a class="nm" href="' + esc(f) + '" target="_blank">' + esc(f) + '</a><span>…</span></div>';
  panel.innerHTML = '<h4>Debug library <span id="dlibVer" style="opacity:.6;text-transform:none;letter-spacing:0"></span></h4><input id="dlibQ" placeholder="Filter…" autocomplete="off">' +
    section('Pages', true, tools) + section('Data written by the editors', false, LIB.data.map(fileRow)) + section('Source files', false, LIB.files.map(fileRow));
  panel.querySelector('#dlibQ').oninput = e => { const q = e.target.value.trim().toLowerCase(); panel.querySelectorAll('.row').forEach(r => r.classList.toggle('hide', !!q && !r.dataset.q.includes(q))); if (q) panel.querySelectorAll('details').forEach(d => { d.open = true; }); };
  fetch('sw.js', { cache: 'no-store' }).then(r => r.text()).then(t => { const m = /polygon-v\d+-(\d+)/.exec(t); const v = panel.querySelector('#dlibVer'); if (v && m) v.textContent = ' · build ' + m[1]; }).catch(() => { /* offline */ });
  panel.querySelectorAll('[data-f]').forEach(r => fetch(r.dataset.f).then(x => x.text()).then(t => { const l = (t.split('\n')[0] || '').replace(/^\/\/\s*/, ''); r.querySelector('span').textContent = l.length > 160 ? l.slice(0, 157) + '…' : l; r.dataset.q += ' ' + l.toLowerCase(); }).catch(() => { r.querySelector('span').textContent = ''; }));
}
new MutationObserver(() => { if (dev.style.display === 'none') { panel.classList.remove('on'); btn.textContent = 'Debug library \u25B8'; } }).observe(dev, { attributes: true, attributeFilter: ['style'] });
btn.onclick = () => { if (!built) build_(); const on = panel.classList.toggle('on'); btn.textContent = 'Debug library ' + (on ? '▾' : '▸'); };
})();
