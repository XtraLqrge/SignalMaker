const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const context = vm.createContext({ window: {}, console });
for (const name of ['dimensions', 'regulatory-sign-data', 'street-signs', 'signal-model', 'mast-approach', 'signal-renderer', 'templates']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', `${name}.js`), 'utf8'), context);
const app = context.window.SignalMaker;
const project = app.restoreProject(null);
const types = ['mast-arm', 'pedestal', 'span-wire', 'pedestal', 'mast-arm', 'span-wire'];
for (const [index, type] of types.entries()) {
  app.addSupport(project, type);
  const head = app.createHead(`Assembly ${index}`);
  if (type === 'pedestal') {
    app.setHeadLayout(head, 'pedestrian', project.support);
    head.poleMounting = 'direct';
  }
  project.heads.push(head);
  project.selectedId = head.id;
  app.ensureArmPositions(project);
}
app.syncMastArms(project);
assert.equal(project.mastArms.length, 6);
const names = project.mastArms.map(arm => arm.mastArmName).join();
assert.equal(names, 'Mast Arm 1,Pedestal 1,Span Wire 1,Pedestal 2,Mast Arm 2,Span Wire 2');
const positions = project.mastArms.map(arm => app.headPosition(arm.heads[0], arm.support));
const layout = app.scene(project);
assert.equal(layout.assemblies.length, 6);
const grades = layout.assemblies.map(item => app.supportAnchor(item.layout).grade + item.y);
assert.ok(grades.every(grade => Math.abs(grade - grades[0]) < 1e-8));
for (let index = 1; index < 6; index++) {
  const previous = layout.assemblies[index - 1], current = layout.assemblies[index];
  const a = app.supportAnchor(previous.layout), b = app.supportAnchor(current.layout);
  assert.ok(Math.abs(current.x + b.x - (previous.x + a.x + a.span) - project.mastArmSpacing) < 1e-8);
}
for (const [index, type] of types.entries()) {
  app.selectMastArm(project, index);
  assert.equal(project.support.type, type);
  assert.equal(project.heads[0].name, `Assembly ${index}`);
  const svg = app.renderSVG(project);
  assert.ok(!/NaN|undefined|Infinity/.test(svg));
  assert.equal((svg.match(/class="mastArm"/g) ?? []).length, 2);
  assert.equal((svg.match(/class="pedestalPole"/g) ?? []).length, 2);
  assert.equal((svg.match(/class="spanWire"/g) ?? []).length, 2);
  const preview = app.renderPreview(project);
  assert.equal((preview.match(/data-select-mast-arm=/g) ?? []).length, 6);
  const restored = app.restoreProject(JSON.stringify(project));
  assert.equal(restored.mastArms.map(arm => arm.support.type).join(), types.join());
  assert.equal(restored.mastArms.map(arm => arm.mastArmName).join(), names);
  assert.equal(restored.mastArms.map(arm => app.headPosition(arm.heads[0], arm.support)).join(), positions.join());
  assert.equal(restored.activeMastArm, index);
}
app.selectMastArm(project, 1);
const ped = project.heads[0];
const single = app.scene({ ...project, mastArms: [] });
assert.equal(single.heads[0].y + single.heads[0].geometry.height - 2, single.supportOffset.y);
app.setPedestalHeight(project, 72);
const raised = app.scene({ ...project, mastArms: [] });
assert.equal(ped.pedestalPosition, app.armPositionBounds(ped, project.support).max);
assert.equal(raised.heads[0].y + raised.heads[0].geometry.height - 2, raised.supportOffset.y);
assert.equal(app.restoreProject(JSON.stringify(project)).heads[0].poleMounting, 'direct');
const saved = app.templateSnapshot(project, 'arm');
assert.equal(saved.support.type, 'pedestal');
app.duplicateMastArm(project);
assert.equal(project.support.type, 'pedestal');
assert.equal(project.heads[0].poleMounting, 'direct');
assert.notEqual(project.heads[0].id, ped.id);
const selected = project.mastArmId;
app.reorderMastArms(project, project.activeMastArm, 0);
assert.equal(project.mastArmId, selected);
assert.equal(project.activeMastArm, 0);
app.removeMastArm(project);
assert.equal(app.scene(project).assemblies.length, 6);
app.applySignalTemplate(project, { scope: 'arm', data: saved, variants: [] }, 'add');
assert.equal(project.support.type, 'pedestal');
assert.equal(project.mastArms.length, 7);
console.log('Mixed supports: two of each type, pole spacing, shared grade, selection, reordering, duplication, restoration, templates, preview/export and direct-mounted pedestrian heads concealing the pole cap passed');
