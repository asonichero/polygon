// Service worker: caches the game on first load so it installs and plays offline. Bump VERSION whenever the files change, so installed copies refresh.
const APP = '0.4.1';      // the version shown beside the build number (the editors read it from here); the game's own badge is in game.html
const VERSION = 'consequence-v041-222';
const FILES = [
  'game.html', 'level.html', 'manifest.webmanifest',
  'js/blocky.js', 'js/cast.js', 'js/audio.js', 'js/farm-layout.js', 'js/farm.js', 'js/game.js', 'js/opening.js', 'js/touchui.js', 'js/market.js', 'js/road.js', 'js/night.js', 'js/correction.js', 'js/garden.js', 'js/chapter3.js', 'js/climb.js', 'js/meadow.js', 'js/castle.js', 'js/castle-layout.js', 'js/gerda-pose.js', 'js/gerda-pose-half.js', 'js/capture-cams.js', 'js/castlewalk.js', 'js/debuglib.js', 'js/buildbadge.js', 'js/menus.js', 'js/pain.js', 'js/lap-poses.js', 'js/lap.js', 'js/level.js',
  'vendor/three.min.js', 'vendor/OrbitControls.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];
// Install: cache every file straight from the network (never from the browser's own cache), one by one, so a single missing file cannot stop a new version installing (that is what once kept a player on an old build).
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(FILES.map(f => c.add(new Request(f, { cache: 'reload' }))))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Network first (so the newest build is always the one you play), falling back to the cached copy when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(async c => {
    try { const r = await fetch(e.request, { cache: 'no-cache' }); if (r && r.ok && new URL(e.request.url).origin === location.origin) c.put(e.request, r.clone()); return r; }
    catch (err) { const hit = await c.match(e.request, { ignoreSearch: true }); if (hit) return hit; throw err; }
  }));
});
