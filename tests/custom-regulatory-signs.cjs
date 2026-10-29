const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ window: {}, console });
for (const file of ['dimensions', 'regulatory-sign-data', 'street-signs', 'signal-model', 'signal-renderer']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', `${file}.js`), 'utf8'), context);
}
const app = context.window.SignalMaker;
// A valid transparent one-pixel PNG; fixture dimensions exercise aspect ratios.
const src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const image = app.restoreRegulatoryImage({ src, width: 400, height: 600, name: 'Custom <sign>.png' });
assert.equal(image.width, 24);
assert.equal(image.height, 36);
assert.equal(image.pixelWidth, 400);
const sign = app.createStreetSign('Custom');
Object.assign(sign, { regulatoryImage: image, regulatoryScale: 1.5, mounting: 'direct', armPosition: 100, spanPosition: 120 });
assert.equal(app.isRegulatorySign(sign), true);
assert.equal(app.canBlankOut(sign), false);
const saved = { version: 1, heads: [], streetSigns: [sign], selectedStreetSignId: sign.id };
const restored = app.restoreProject(JSON.stringify(saved));
assert.equal(restored.streetSigns.length, 1);
const copy = restored.streetSigns[0];
assert.equal(copy.regulatoryImage.src, src);
assert.equal(copy.regulatoryImage.width, 24);
assert.equal(copy.regulatoryScale, 1.5);
assert.equal(copy.armPosition, 100);
assert.equal(copy.spanPosition, 120);
assert.equal(restored.selectedStreetSignId, copy.id);
const geometry = app.streetSignGeometry(copy);
assert.equal(geometry.width, 36);
assert.equal(geometry.height, 54);
assert.ok(app.streetSignMarkup(copy, geometry).includes(src));
assert.ok(app.streetSignMarkup(copy, geometry).includes('Custom &lt;sign&gt;.png'));
assert.ok(app.renderSVG(restored).includes(src));
for (const type of ['mast-arm', 'span-wire']) assert.equal(app.signCanMove(copy, { type }), true);
assert.equal(app.restoreRegulatoryImage({ ...image, src: 'https://example.org/image.png' }), null);
assert.equal(app.restoreRegulatoryImage({ ...image, pixelWidth: 9999 }), null);
assert.equal(app.restoreRegulatoryImage({ ...image, pixelWidth: 0 }), null);
const duplicate = JSON.parse(JSON.stringify(copy));
assert.equal(app.streetSignMarkup(duplicate, app.streetSignGeometry(duplicate)), app.streetSignMarkup(copy, geometry));
// Undo/redo restores the embedded artwork along with the project, without a
// separately registered image catalog that could become stale after travel.
const buttons = Object.fromEntries(['undoButton', 'redoButton'].map(id => [id, { setAttribute() {}, addEventListener() {} }]));
context.navigator = { platform: 'MacIntel' };
context.document = { querySelectorAll: () => [], getElementById: id => buttons[id], addEventListener() {}, activeElement: null };
vm.runInContext(fs.readFileSync(path.join(root, 'js/history.js'), 'utf8'), context);
app.startHistory(restored, { onRestore() {}, report() {} });
app.runWithUndo(() => { restored.streetSigns.length = 0; });
app.undo();
assert.equal(restored.streetSigns[0].regulatoryImage.src, src);
app.redo();
assert.equal(restored.streetSigns.length, 0);
console.log('Custom regulatory sign restoration, duplication, sizing, mounting, export, validation, and undo/redo passed.');
