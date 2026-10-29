const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const context = vm.createContext({ window: {}, console });
for (const name of ['dimensions', 'regulatory-sign-data', 'street-signs', 'signal-model', 'mast-approach', 'signal-renderer', 'templates']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', `${name}.js`), 'utf8'), context);
const app = context.window.SignalMaker;
for (const side of ['above', 'below']) {
  const head = app.createHead('Four-section');
  app.setHeadLayout(head, `cluster-${side}`);
  assert.equal(head.indications.length, 4);
  assert.equal(head.orientation, 'vertical');
  assert.equal(head.fourCluster, side);
  assert.equal(head.cluster, false);
  assert.equal(head.hawk, false);
  const geometry = app.headGeometry(head);
  assert.equal(geometry.width, 30.5 + 10);
  assert.equal(geometry.height, 42 + 10);
  const pairIndices = side === 'above' ? [0, 1] : [2, 3];
  const stemIndices = side === 'above' ? [2, 3] : [0, 1];
  const pair = pairIndices.map(index => geometry.sections[index]);
  const stem = stemIndices.map(index => geometry.sections[index]);
  assert.equal(pair[0].cy, pair[1].cy);
  assert.ok(pair[0].cx < stem[0].cx && stem[0].cx < pair[1].cx);
  assert.equal(stem[0].cx, stem[1].cx);
  assert.ok(side === 'above' ? pair[0].cy < stem[0].cy : pair[0].cy > stem[1].cy);
  head.indications[pairIndices[0]].size = 8;
  head.indications[3].symbol = 'bicycle';
  head.indications[3].color = 'green';
  const mixed = app.headGeometry(head);
  assert.equal(mixed.sections[pairIndices[0]].cy, mixed.sections[pairIndices[1]].cy);
  assert.equal(mixed.sections[stemIndices[0]].cx, mixed.sections[stemIndices[1]].cx);
  head.orientation = 'horizontal'; // Saved invalid orientations must restore upright.
  const project = { version: 1, heads: [head], selectedId: head.id, support: app.normalizeSupport(), streetSigns: [] };
  const restored = app.restoreProject(JSON.stringify(project));
  assert.equal(restored.heads[0].orientation, 'vertical');
  assert.equal(restored.heads[0].fourCluster, side);
  assert.equal(restored.heads[0].indications[3].symbol, 'bicycle');
  assert.equal(restored.heads[0].indications[pairIndices[0]].size, 8);
  for (const type of ['none', 'mast-arm', 'span-wire']) {
    restored.support.type = type;
    app.ensureArmPositions(restored);
    const svg = app.renderSVG(restored);
    assert.ok(!svg.includes('NaN'));
    assert.ok(!/<g transform="translate\([^"]+\) rotate\(-90\)">/.test(svg));
  }
  head.backplateFullRectangle = true;
  assert.notEqual(app.backplatePath(head, mixed), (() => { head.backplateFullRectangle = false; return app.backplatePath(head, mixed); })());
  const before = JSON.stringify(head.indications);
  app.setHeadLayout(head, side === 'above' ? 'cluster-below' : 'cluster-above');
  assert.equal(JSON.stringify(head.indications), before);
  app.setHeadLayout(head, 'linear');
  assert.equal(head.fourCluster, null);
  assert.equal(JSON.stringify(head.indications), before);
  app.setHeadLayout(head, 'cluster-above'); app.setHeadLayout(head, 'hawk');
  assert.equal(head.fourCluster, null); assert.equal(head.indications.length, 3);
  app.setHeadLayout(head, 'cluster-below'); app.setHeadLayout(head, 'cluster');
  assert.equal(head.fourCluster, null); assert.equal(head.indications.length, 5);
}
console.log('Four-section T/inverted-T geometry, mixed lenses, upright restoration, backplates, editing retention and support exports passed');
