// Climbing Toward Consequence — a small corner strip for the editors and tools: a link back to the title screen, and a "build N" badge read from the service worker's VERSION so that it is always the one the game shows (no second number to bump).
(function () {
'use strict';
const bar = document.createElement('div'); bar.id = 'devBar';
bar.style.cssText = 'position:fixed;left:8px;bottom:6px;z-index:9999;display:flex;gap:6px;align-items:center;font:11px Georgia,serif';
const a = document.createElement('a'); a.href = 'game.html'; a.textContent = '◂ Title screen';
a.style.cssText = 'color:#e6c46a;background:rgba(10,12,16,0.8);border:1px solid #4a4d58;border-radius:6px;padding:2px 8px;text-decoration:none;opacity:.9';
const b = document.createElement('div'); b.id = 'buildBadge'; b.textContent = 'build …';
b.style.cssText = 'color:#e6c46a;background:rgba(10,12,16,0.7);border:1px solid #4a4d58;border-radius:6px;padding:2px 8px;pointer-events:none;opacity:.85';
bar.appendChild(a); bar.appendChild(b);
document.addEventListener('DOMContentLoaded', () => document.body.appendChild(bar));
fetch('sw.js', { cache: 'no-store' }).then(r => r.text()).then(t => { const m = /consequence-v\d+-(\d+)/.exec(t), a = /const APP = '([^']+)'/.exec(t); b.textContent = m ? 'v' + (a ? a[1] : '0.4') + ' · build ' + m[1] : 'build ?'; }).catch(() => { b.textContent = 'build ?'; });
})();
