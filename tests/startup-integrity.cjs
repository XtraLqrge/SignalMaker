const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1].split('?')[0]);
const ready = [];
const context = vm.createContext({ console, window: {}, document: {
  documentElement: { dataset: {} },
  addEventListener(type, callback) { if (type === 'DOMContentLoaded') ready.push(callback); },
} });
for (const relative of scripts) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  assert.ok(!/^(?:<<<<<<< |=======$|>>>>>>> )/m.test(source), `${relative} has unresolved merge markers`);
  new vm.Script(source, { filename: relative }).runInContext(context);
}
assert.equal(ready.length, 1, 'The page must register its startup handler');
const app = context.window.SignalMaker;
for (const name of ['startHeads', 'startMastApproach', 'startStreetSigns', 'startHeadClipboard', 'startHistory', 'startTemplates',
  'restoreProject', 'createHead', 'addSupport', 'scene', 'supportAnchor', 'renderPreview', 'renderSVG', 'selectStreetTextElement']) {
  assert.equal(typeof app[name], 'function', `${name} must exist before page startup`);
}
assert.equal(Object.keys(app.streetFontData).length, 22);
const project = app.restoreProject(null);
for (const type of ['mast-arm', 'pedestal', 'span-wire']) {
  app.addSupport(project, type);
  assert.equal(project.support.type, type);
  const head = app.createHead(`${type} head`);
  app.placeNewHead(project, head);
  project.heads.push(head);
  project.selectedId = head.id;
  app.ensureArmPositions(project);
  app.syncMastArms(project);
  assert.ok(app.renderPreview(project).includes(`data-head-id="${head.id}"`));
  assert.ok(!/NaN|undefined|Infinity/.test(app.renderSVG(project)));
}
assert.equal(project.mastArms.length, 3);
const saved = app.restoreProject(JSON.stringify(project));
assert.equal(saved.mastArms.length, 3);
assert.equal(app.scene(saved).heads.length, 3);
for (const match of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?#]+)(?:[?#][^"]*)?"/g)) {
  assert.ok(fs.statSync(path.join(root, match[1])).isFile(), `Missing page resource ${match[1]}`);
}
for (const css of fs.readdirSync(path.join(root, 'css')).filter(name => name.endsWith('.css'))) {
  const source = fs.readFileSync(path.join(root, 'css', css), 'utf8');
  for (const match of source.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
    if (/^(?:data:|https?:|#)/.test(match[1])) continue;
    assert.ok(fs.statSync(path.resolve(root, 'css', match[1])).isFile(), `Missing style resource ${match[1]}`);
  }
}
console.log('Page script order, merge integrity, startup APIs, head/support creation, restoration, rendering, fonts and resource paths passed');
