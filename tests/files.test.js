// Sanity checks on the shipped files: every script parses, every file the pages and the service worker name exists, and the manifest is complete.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const PAGES = ['index.html', 'game.html', 'lap.html', 'models.html'];

test('every game script parses', () => {
  for (const f of fs.readdirSync(path.join(root, 'js')).filter(n => n.endsWith('.js'))) assert.doesNotThrow(() => new vm.Script(read('js/' + f), { filename: f }), f);
});

test('pages only load scripts that exist', () => {
  for (const page of PAGES)
    for (const m of read(page).matchAll(/<script src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, m[1])), `${page} loads ${m[1]}`);
});

test('every page that builds a figure loads the picture, the figure code and the world in dependency order', () => {
  const ORDER = ['vendor/three.min.js', 'js/look.js', 'js/poly-geo.js', 'js/poly.js', 'js/poly-paint.js', 'js/poly-face.js', 'js/poly-jack.js', 'js/poly-jack-paint.js', 'js/poly-gerda.js', 'js/poly-gerda-paint.js', 'js/props.js', 'js/world.js'];
  for (const page of ['game.html', 'lap.html', 'models.html']) {
    const srcs = [...read(page).matchAll(/<script src="([^"]+)"/g)].map(m => m[1]), at = f => srcs.indexOf(f);
    for (const f of ORDER) assert.ok(at(f) >= 0, `${page} loads ${f}`);
    for (let i = 1; i < ORDER.length; i++) assert.ok(at(ORDER[i - 1]) < at(ORDER[i]), `${page} loads ${ORDER[i - 1]} before ${ORDER[i]}`);
  }
});

test('the pictures settings are the toon look\'s, and nothing of the retro pass is left', () => {
  assert.ok(!fs.existsSync(path.join(root, 'js', 'retro.js')), 'js/retro.js is gone');
  for (const f of [...fs.readdirSync(path.join(root, 'js')).map(n => 'js/' + n), ...PAGES, 'sw.js']) assert.ok(!/\bRetro\b|retro\.js|\.retro\b/.test(read(f)), `${f} does not use the retro pass`);
  for (const id of ['sScale', 'cOutline', 'cBloom', 'cShadows']) assert.ok(read('game.html').includes(`id="${id}"`) && read('js/menus.js').includes(`'${id}'`), `the shell has the ${id} setting`);
  for (const id of ['pScale', 'pOutline', 'pBloom', 'pShadows']) assert.ok(read('lap.html').includes(`id="${id}"`), `the correction scene has ${id}`);
});

test('the service worker caches only files that exist, and covers every script the pages load', () => {
  const sw = read('sw.js'), files = [...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  for (const f of files) assert.ok(fs.existsSync(path.join(root, f)), `sw.js lists ${f}`);
  for (const page of PAGES.filter(p => p !== 'index.html')) { assert.ok(files.includes(page), `sw.js caches ${page}`); for (const m of read(page).matchAll(/<script src="([^"]+)"/g)) assert.ok(files.includes(m[1]), `sw.js caches ${m[1]} (${page})`); }
});

test('the manifest is installable', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.ok(m.name && m.start_url && m.display); assert.ok(fs.existsSync(path.join(root, m.start_url)));
  const sizes = m.icons.map(i => i.sizes); assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(root, i.src)), i.src);
});

test('the debug library lists every script and every page', () => {
  const lib = read('js/debuglib.js'), listed = f => lib.includes("'" + f + "'") || lib.includes("'" + f + "?");
  for (const f of fs.readdirSync(path.join(root, 'js')).filter(n => n.endsWith('.js'))) assert.ok(listed('js/' + f), `debuglib lists js/${f}`);
  for (const f of fs.readdirSync(root).filter(n => n.endsWith('.html') && n !== 'index.html' && n !== 'game.html')) assert.ok(listed(f), `debuglib lists ${f}`);
});

test('no story content is left behind', () => {
  const gone = ['farm', 'opening', 'market', 'road', 'night', 'correction', 'garden', 'chapter3', 'climb', 'meadow', 'castle', 'castlewalk', 'level', 'cast', 'blocky'];
  for (const n of gone) assert.ok(!fs.existsSync(path.join(root, 'js', n + '.js')), `js/${n}.js is gone`);
  for (const f of fs.readdirSync(path.join(root, 'js')).filter(n => n.endsWith('.js'))) for (const w of ['Beanstalk', 'beanstalk', 'Market', 'Peddler', 'Milky-White', 'Birchwood']) assert.ok(!read('js/' + f).includes(w), `js/${f} does not mention ${w}`);
});
