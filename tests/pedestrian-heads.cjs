const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const context = vm.createContext({ window: {}, console });
for (const name of ['dimensions', 'regulatory-sign-data', 'street-signs', 'signal-model', 'signal-renderer']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', `${name}.js`), 'utf8'), context);
}
const app = context.window.SignalMaker;
const ordinary = app.createHead('Ordinary');
app.setHeadLayout(ordinary, 'pedestrian');
assert.equal(ordinary.pedestrian, false);
const head = app.createHead('Supplementary');
Object.assign(head, { poleMounted: true, poleHeight: 108, poleMounting: 'direct', armPosition: 120 });
app.setHeadLayout(head, 'pedestrian');
assert.equal(head.pedestrian, true);
assert.equal(app.headGeometry(head).width, 20);
assert.equal(app.headGeometry(head).height, 18);
const project = { version: 1, heads: [head], selectedId: head.id, support: app.normalizeSupport({ type: 'mast-arm' }), spacing: 12 };
const handSVG = app.renderSVG(project);
assert.ok(handSVG.includes(app.dimensions.pedestrian.hand));
assert.ok(!handSVG.includes('NaN'));
head.pedestrianDisplay = 'walk';
const restored = app.restoreProject(JSON.stringify(project));
assert.equal(restored.heads[0].pedestrian, true);
assert.equal(restored.heads[0].pedestrianDisplay, 'walk');
assert.equal(restored.heads[0].poleHeight, 108);
assert.equal(restored.heads[0].armPosition, 120);
assert.ok(app.renderSVG(restored).includes(app.dimensions.pedestrian.walk[0]));
const duplicate = JSON.parse(JSON.stringify(head));
assert.equal(app.headGeometry(duplicate).height, 18);
app.setHeadLayout(head, 'hawk');
assert.equal(head.pedestrian, false);
assert.equal(head.hawk, true);
assert.equal(head.indications.length, 3);
const invalid = JSON.parse(JSON.stringify(project));
invalid.heads[0].poleMounted = false;
invalid.heads[0].pedestrian = true;
assert.equal(app.restoreProject(JSON.stringify(invalid)).heads[0].pedestrian, true);
console.log('Pedestrian layout, restrictions, persistence, duplication and SVG export passed');
// Mount changes retain one fit envelope, with left/right interpreted on screen
// for either mast side. Artwork and physical housing dimensions stay identical.
const ped = app.createHead('Pedestrian mount');
ped.poleMounted = true;
app.setHeadLayout(ped, 'pedestrian');
for (const side of ['left', 'right']) {
  const assembly = { version: 1, heads: [ped], support: app.normalizeSupport({ type: 'mast-arm', side }), spacing: 12 };
  ped.poleMounting = 'direct';
  const direct = app.scene(assembly);
  const poleCenter = direct.heads[0].x + direct.heads[0].geometry.width / 2;
  for (const bracketSide of ['left', 'right']) {
    ped.poleMounting = 'side';
    ped.poleMountSide = bracketSide;
    const bracket = app.scene(assembly);
    assert.equal(bracket.width, direct.width);
    assert.equal(bracket.height, direct.height);
    assert.equal(bracket.heads[0].geometry.width, direct.heads[0].geometry.width);
    const center = bracket.heads[0].x + bracket.heads[0].geometry.width / 2;
    assert.ok(bracketSide === 'left' ? center < poleCenter : center > poleCenter);
    assert.ok(!app.renderSVG(assembly).includes('NaN'));
    assert.equal(app.restoreProject(JSON.stringify(assembly)).heads[0].poleMountSide, bracketSide);
  }
}
console.log('Direct/side fit scale, left/right mirrored placement and bracket-side restoration passed');
