// Sanity checks on the shipped files: every script parses, every file the pages and the service worker name exists, and the manifest is complete.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('every game script parses', () => {
  for (const f of fs.readdirSync(path.join(root, 'js')).filter(n => n.endsWith('.js'))) assert.doesNotThrow(() => new vm.Script(read('js/' + f), { filename: f }), f);
});

test('pages only load scripts that exist', () => {
  for (const page of ['index.html', 'game.html', 'level.html', 'lap.html', 'blocky.html'])
    for (const m of read(page).matchAll(/<script src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, m[1])), `${page} loads ${m[1]}`);
});

test('the service worker caches only files that exist, and covers every script the level loads', () => {
  const sw = read('sw.js'), files = [...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  for (const f of files) assert.ok(fs.existsSync(path.join(root, f)), `sw.js lists ${f}`);
  for (const page of ['game.html', 'level.html']) for (const m of read(page).matchAll(/<script src="([^"]+)"/g)) assert.ok(files.includes(m[1]), `sw.js caches ${m[1]} (${page})`);
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
