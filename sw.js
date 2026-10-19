// Service worker: caches the game on first load so it installs and plays offline. Bump VERSION whenever the files change, so installed copies refresh.
const APP = '0.6.0';      // the version shown beside the build number (the tools read it from here); the shell's own badge is in game.html
const VERSION = 'polygon-v060-2';
const FILES = [
  'game.html', 'models.html', 'lap.html', 'manifest.webmanifest',
  'js/look.js', 'js/poly-geo.js', 'js/poly.js', 'js/poly-paint.js', 'js/poly-face.js', 'js/poly-jack.js', 'js/poly-jack-paint.js', 'js/poly-gerda.js', 'js/poly-gerda-paint.js', 'js/poly-red.js', 'js/poly-red-paint.js', 'js/props.js', 'js/world.js', 'js/audio.js', 'js/game.js', 'js/touchui.js', 'js/stage.js', 'js/debuglib.js', 'js/buildbadge.js', 'js/menus.js', 'js/pain.js', 'js/lap-poses.js', 'js/lap.js',
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
