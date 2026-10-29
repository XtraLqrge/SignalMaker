const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ window: {}, console });
for (const name of ['dimensions', 'street-signs', 'signal-model', 'mast-approach', 'signal-renderer', 'mast-drag']) vm.runInContext(fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8'), context);
const app = context.window.SignalMaker;
let checks = 0;
const equal = (a, b) => { assert.equal(a, b); checks++; };
const ok = value => { assert.ok(value); checks++; };
const sign = app.createStreetSign();
sign.texts.push(app.createStreetText()); sign.texts[1].textContent = 'Second Street';
for (const row of sign.texts) for (const type of ['prefix', 'suffix', 'superscript', 'subscript']) app.addStreetTextElement(row, type);
const geometry = app.streetSignGeometry(sign), preview = app.streetSignMarkup(sign, geometry, true), exported = app.streetSignMarkup(sign, geometry);
for (const row of sign.texts) for (const element of [row, ...app.streetTextChildren(row)]) {
  ok(preview.includes(`data-street-row-id="${row.id}" data-street-element-id="${element.id}"`));
  ok(app.selectStreetTextElement(sign, row.id, element.id));
  equal(sign.texts[sign.selectedTextIndex], row); equal(app.selectedStreetText(row), element);
}
equal(app.selectStreetTextElement(sign, 'missing', 'missing'), false);
const selection = JSON.stringify([sign.selectedTextIndex, sign.texts.map(row => row.selectedElementIndex)]);
equal(app.selectStreetTextElement(sign, sign.texts[0].id, 'missing'), false);
equal(JSON.stringify([sign.selectedTextIndex, sign.texts.map(row => row.selectedElementIndex)]), selection);
ok(preview.includes('class="streetTextHit"')); equal(exported.includes('streetTextHit'), false);
equal(exported.includes('data-street-row-id'), false);
equal((preview.match(/<text\b/g) || []).length, (exported.match(/<text\b/g) || []).length);
sign.texts[0].arrow = 'TYPE_D';
const withArrow = app.streetSignMarkup(sign, app.streetSignGeometry(sign), true);
ok(withArrow.includes(`class="streetTextArrow" data-street-row-id="${sign.texts[0].id}" data-street-element-id="${sign.texts[0].id}"`));
const project = app.restoreProject(JSON.stringify({ version: 1, heads: [], support: { type: 'mast-arm' }, streetSigns: [sign] }));
equal(app.renderSVG(project).includes('streetTextTarget'), false);
ok(app.renderPreview(project).includes('streetTextTarget'));
// Run the actual delegated click and pointer handlers, including retargeted
// clicks after pointer capture and the forced update of a focused text input.
class Element {
  constructor(parent = null) { this.parent = parent; this.dataset = {}; this.events = {}; this.rect = { left: 100, top: 100, width: 200, height: 60 }; this.style = { setProperty() {} }; this.classList = { add() {} }; }
  closest(selector) {
    if (selector === '[data-street-sign-id]' && this.dataset.streetSignId) return this;
    if (selector === '[data-street-row-id]' && this.dataset.streetRowId) return this;
    return this.parent?.closest(selector) ?? null;
  }
  addEventListener(type, fn) { (this.events[type] ??= []).push(fn); }
  getBoundingClientRect() { return this.rect; }
  setPointerCapture(id) { this.capture = id; } hasPointerCapture(id) { return this.capture === id; } releasePointerCapture() { this.capture = null; }
  cloneNode() { return new Element(); } setAttribute() {} remove() {} focus() {}
  querySelectorAll() { return []; }
}
const stage = new Element(), document = new Element(), container = new Element(), signNode = new Element();
signNode.dataset.streetSignId = project.streetSigns[0].id;
container.rect.width = app.scene(project).width * 2;
document.body = { append() {} };
document.createElement = () => ({ getContext: () => ({ font: '', measureText(text) { return { width: text.length * parseFloat(this.font) * 0.52 }; } }) });
let forced = 0, shown = null, selectedContent = '', flashes = 0;
Object.assign(context, { app, project, stage, document, get: () => container,
  refreshEditor(force) { if (force) forced++; const s = project.streetSigns.find(item => item.id === project.selectedStreetSignId); selectedContent = app.selectedStreetText(s.texts[s.selectedTextIndex]).textContent; },
  showEditor(id) { shown = id; }, editorFor: () => 'streetSignsEditor', flash() { flashes++; } });
app.refresh = () => {};
const source = fs.readFileSync(path.join(root, 'js/street-sign-editor.js'), 'utf8');
const clickStart = source.indexOf("      const preview = event.target.closest('[data-street-sign-id]');");
const clickEnd = source.indexOf("    });\n    form.addEventListener('click'", clickStart);
const pointerStart = source.indexOf("    stage.addEventListener('pointerdown', event => {");
const pointerEnd = source.indexOf('    app.refreshStreetSignEditor = refreshEditor;', pointerStart);
vm.runInContext(`(() => { let drag = null, pendingTextClick = null, suppressClickUntil = 0;
  document.addEventListener('click', event => { ${source.slice(clickStart, clickEnd)} });
  ${source.slice(pointerStart, pointerEnd)}
})()`, context);
function dispatch(node, type, target, extra = {}) {
  const event = { target, button: 0, pointerId: 1, clientX: 150, clientY: 130, preventDefault() {}, ...extra };
  for (const handler of node.events[type] ?? []) handler(event);
}
function textNode(row, element) { const group = new Element(signNode); group.dataset = { streetRowId: row.id, streetElementId: element.id }; return new Element(group); }
const current = project.streetSigns[0];
for (const row of current.texts) for (const element of [row, ...app.streetTextChildren(row)]) {
  const node = textNode(row, element);
  dispatch(document, 'click', node);
  equal(current.texts[current.selectedTextIndex], row); equal(app.selectedStreetText(row), element);
  equal(shown, 'streetSignsEditor'); equal(selectedContent, element.textContent);
  equal(flashes, 0);
}
equal(forced, 10);
const row = current.texts[0], suffix = row.affixElements.find(item => item.affix === 'suffix');
app.selectStreetTextElement(current, row.id, row.id);
dispatch(stage, 'pointerdown', textNode(row, suffix)); dispatch(stage, 'pointerup', signNode);
// Browsers can send the click to the capturing sign rather than the SVG text.
dispatch(document, 'click', signNode);
equal(app.selectedStreetText(row), suffix); equal(selectedContent, suffix.textContent);
equal(flashes, 0);
dispatch(document, 'click', textNode(row, row)); equal(app.selectedStreetText(row), row);
// Canceled gestures must not leave a stale suffix target for a background click.
dispatch(stage, 'pointerdown', textNode(row, suffix)); dispatch(stage, 'pointercancel', signNode);
dispatch(document, 'click', signNode); equal(app.selectedStreetText(row), row);
equal(flashes, 1); // Whole-sign background selection retains its existing flash.
// Selecting text works without movable supports or explicit pointer capture.
for (const type of ['none', 'span-wire']) {
  project.support.type = type; app.selectStreetTextElement(current, row.id, row.id);
  dispatch(stage, 'pointerdown', textNode(row, suffix)); dispatch(document, 'click', textNode(row, suffix));
  equal(app.selectedStreetText(row), suffix);
  equal(flashes, 1);
}
const css = fs.readFileSync(path.join(root, 'css/street-signs.css'), 'utf8');
ok(/\.previewStreetSign svg\s*\{[^}]*pointer-events: auto/.test(css));
ok(/\.previewStreetSign \.streetTextHit\s*\{ pointer-events: all/.test(css));
equal(preview.includes('pointer-events="all"'), false); // Drag ghosts inherit disabled pointer events.
console.log(`${checks} text target, row/element selection without flashes, pointer capture, cancellation, and export checks passed`);
