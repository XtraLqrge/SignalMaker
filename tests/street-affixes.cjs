const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ window: {}, console });
for (const name of ['dimensions', 'street-font-data', 'street-signs', 'signal-model', 'mast-approach', 'signal-renderer', 'templates']) vm.runInContext(fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8'), context);
const app = context.window.SignalMaker;
let checks = 0;
const equal = (a, b) => { assert.equal(a, b); checks++; };
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
const near = (a, b) => ok(Math.abs(a - b) < 1e-7);
const cap = (size, font) => size * (font.startsWith('Series ') ? 0.5690625 : font.startsWith('Clearview ') ? 0.69046875 : 0.7);
// Creation uses the main size only until an existing affix can supply it.
for (const mainSize of [100, 200, 350, 500]) for (const type of ['prefix', 'suffix']) {
  const row = app.createStreetText(); row.fontSize = mainSize;
  equal(app.addStreetTextElement(row, type).fontSize, mainSize * 0.6);
}
const sizingSign = app.createStreetSign();
const sizingRows = sizingSign.texts;
sizingRows.push(app.createStreetText(), app.createStreetText(), app.createStreetText());
const firstPrefix = app.addStreetTextElement(sizingRows[0], 'prefix', sizingRows); firstPrefix.fontSize = 88;
sizingRows[0].fontSize = 450; sizingRows[0].selectedElementIndex = 0;
const firstSuffix = app.addStreetTextElement(sizingRows[0], 'suffix', sizingRows);
equal(firstSuffix.fontSize, 88); firstSuffix.fontSize = 104;
equal(app.addStreetTextElement(sizingRows[0], 'prefix', sizingRows).fontSize, 88);
const lastPrefix = sizingRows[0].affixElements.at(-1); lastPrefix.fontSize = 93;
equal(app.addStreetTextElement(sizingRows[0], 'prefix', sizingRows).fontSize, 93);
equal(app.addStreetTextElement(sizingRows[0], 'suffix', sizingRows).fontSize, 104);
const nearbySuffix = app.addStreetTextElement(sizingRows[2], 'suffix', sizingRows);
equal(nearbySuffix.fontSize, 104); nearbySuffix.fontSize = 137;
equal(app.addStreetTextElement(sizingRows[3], 'prefix', sizingRows).fontSize, 137);
sizingRows[3].fontSize = 500;
equal(app.addStreetTextElement(sizingRows[3], 'suffix', sizingRows).fontSize, 137);
// Scripts and affixes on a different sign never override the first-affix ratio.
const separate = app.createStreetSign(); separate.texts[0].fontSize = 250;
app.addStreetTextElement(separate.texts[0], 'subscript').fontSize = 70;
equal(app.addStreetTextElement(separate.texts[0], 'prefix', separate.texts).fontSize, 150);
equal(firstPrefix.fontSize, 88); equal(firstSuffix.fontSize, 104);
// Exercise the editor's Add button so inheritance also reaches other text rows.
const editorSource = fs.readFileSync(path.join(root, 'js/street-sign-editor.js'), 'utf8');
const handlerStart = editorSource.indexOf("    form.addEventListener('click', event => {\n      const action = event.target.closest('[data-street-element-action]')");
const handlerEnd = editorSource.indexOf('    function edit(event)', handlerStart);
sizingSign.selectedTextIndex = 1;
let addHandler, refreshes = 0;
app.refresh = () => { refreshes++; };
Object.assign(context, { app, form: { addEventListener(type, handler) { addHandler = handler; } }, selected: () => sizingSign });
vm.runInContext(editorSource.slice(handlerStart, handlerEnd), context);
addHandler({ target: { closest() { return { dataset: { streetElementAction: 'suffix' } }; } } });
equal(sizingRows[1].affixElements[0].fontSize, 104); equal(refreshes, 1);
for (const prefixSide of ['left', 'right']) for (const suffixSide of ['left', 'right']) {
  for (const arrowSide of ['left', 'right']) for (const arrow of ['none', 'TYPE_D', 'TYPE_A']) {
    const sign = app.createStreetSign(), row = sign.texts[0]; row.textContent = 'Racine'; row.fontFamily = 'Clearview 3'; row.arrow = arrow; row.arrowSide = arrowSide;
    const upper = app.addStreetTextElement(row, 'superscript'), lower = app.addStreetTextElement(row, 'subscript');
    upper.scriptSide = 'left'; lower.scriptSide = 'left';
    const original = app.streetSignGeometry(sign).rows[0].lines[0];
    const upperY = original.find(run => run.element === upper).dy, lowerY = original.find(run => run.element === lower).dy;
    const prefix = app.addStreetTextElement(row, 'prefix'), suffix = app.addStreetTextElement(row, 'suffix');
    prefix.affixSide = prefixSide; suffix.affixSide = suffixSide; suffix.textContent = 'Av'; suffix.fontFamily = 'Series D';
    const geometry = app.streetSignGeometry(sign), layout = geometry.rows[0], runs = layout.lines[0];
    equal(row.scriptElements.length, 2); equal(row.affixElements.length, 2);
    equal(runs.find(run => run.element === upper).dy, upperY); equal(runs.find(run => run.element === lower).dy, lowerY);
    for (const run of runs.filter(run => run.element?.affix)) {
      near(run.dy - cap(run.size, run.font) / 2, -layout.mainCap / 2);
      ok(run.offsetX >= 0); ok(run.offsetX + run.width <= layout.width - layout.arrowSpace + 1e-7);
    }
    // Affixes sit outside the script/name block and cannot overlap it.
    const block = runs.filter(run => !run.element?.affix);
    for (const element of [prefix, suffix]) {
      const run = runs.find(run => run.element === element);
      if (element.affixSide === 'left') ok(run.offsetX + run.width < Math.min(...block.map(run => run.offsetX)));
      else ok(run.offsetX > Math.max(...block.map(run => run.offsetX + run.width)));
    }
    const markup = app.streetSignMarkup(sign, geometry);
    ok(markup.includes('data-affix="prefix"')); ok(markup.includes('data-affix="suffix"')); ok(!/NaN|undefined|Infinity/.test(markup));
    const textNodes = [...markup.matchAll(/<text\b[^>]*\sx="([^"]+)"[^>]*>([^<]*)<\/text>/g)];
    equal(textNodes.length, runs.length);
    if (arrow !== 'none') {
      const center = Number(markup.match(/class="streetTextArrow" transform="translate\(([^ ]+)/)[1]);
      const textLeft = Math.min(...textNodes.map(match => Number(match[1])));
      const textRight = Math.max(...textNodes.map((match, index) => Number(match[1]) + runs[index].width));
      if (arrowSide === 'left') ok(center + layout.arrow.length / 2 + layout.arrow.gap <= textLeft + 1e-7, JSON.stringify({ arrow, arrowSide, center, textLeft, textRight, arrowLength: layout.arrow.length, gap: layout.arrow.gap }));
      else ok(textRight + layout.arrow.gap <= center - layout.arrow.length / 2 + 1e-7, JSON.stringify({ arrow, arrowSide, center, textLeft, textRight, arrowLength: layout.arrow.length, gap: layout.arrow.gap }));
    }
  }
}
// Multiline prefixes stay with the first visible line, suffixes with the last.
// Both retain their independent side choice, including arrows and scripts.
for (const prefixSide of ['left', 'right']) for (const suffixSide of ['left', 'right']) {
  for (const justification of ['Left', 'Center', 'Right']) for (const arrowSide of ['left', 'right']) {
    for (const fontFamily of ['Series EM', 'Clearview 3']) {
      const sign = app.createStreetSign(), row = sign.texts[0];
      Object.assign(row, { textContent: 'Dr. Martin Luther\\nKing Jr.', fontFamily, justification, arrow: 'TYPE_D', arrowSide });
      const prefix = app.addStreetTextElement(row, 'prefix'), suffix = app.addStreetTextElement(row, 'suffix');
      prefix.affixSide = prefixSide; suffix.affixSide = suffixSide;
      prefix.textContent = 'S'; suffix.textContent = 'Dr.'; suffix.fontFamily = 'Series EEM';
      const upper = app.addStreetTextElement(row, 'superscript'); upper.textContent = 'St';
      const geometry = app.streetSignGeometry(sign), layout = geometry.rows[0];
      equal(layout.lines.length, 2);
      equal(layout.lines[0].filter(run => run.element === suffix).length, 0);
      equal(layout.lines[1].filter(run => run.element === prefix || run.element === upper).length, 0);
      const markup = app.streetSignMarkup(sign, geometry, true);
      const nodes = [...markup.matchAll(/<text\b[^>]*\sx="([^"]+)" y="([^"]+)"[^>]*>([^<]*)<\/text>/g)];
      const arrows = [...markup.matchAll(/class="streetTextArrow"[^>]*transform="translate\(([^ ]+) ([^)]+)\)/g)];
      equal(arrows.length, 2);
      let nodeIndex = 0;
      for (const [index, runs] of layout.lines.entries()) {
        const element = index === 0 ? prefix : suffix;
        const affixIndex = runs.findIndex(run => run.element === element);
        ok(affixIndex >= 0);
        const affixRun = runs[affixIndex], affixNode = nodes[nodeIndex + affixIndex];
        const mainIndex = runs.findIndex(run => !run.element), mainRun = runs[mainIndex], mainNode = nodes[nodeIndex + mainIndex];
        const mainCap = Math.max(...runs.filter(run => !run.element).map(run => cap(run.size, layout.font)));
        near(affixRun.dy - cap(affixRun.size, affixRun.font) / 2, -mainCap / 2);
        near(Number(affixNode[2]) - Number(mainNode[2]), affixRun.dy);
        const block = runs.filter(run => run.element !== element);
        if (element.affixSide === 'left') ok(affixRun.offsetX + affixRun.width < Math.min(...block.map(run => run.offsetX)));
        else ok(affixRun.offsetX > Math.max(...block.map(run => run.offsetX + run.width)));
        const lineNodes = nodes.slice(nodeIndex, nodeIndex + runs.length);
        const textLeft = Math.min(...lineNodes.map(node => Number(node[1])));
        const textRight = Math.max(...lineNodes.map((node, n) => Number(node[1]) + runs[n].width));
        const center = Number(arrows[index][1]);
        if (arrowSide === 'left') ok(center + layout.arrow.length / 2 + layout.arrow.gap <= textLeft + 1e-7);
        else ok(textRight + layout.arrow.gap <= center - layout.arrow.length / 2 + 1e-7);
        ok(markup.includes(`data-street-row-id="${row.id}" data-street-element-id="${element.id}"`));
        nodeIndex += runs.length;
      }
      equal(nodeIndex, nodes.length); ok(!/NaN|undefined|Infinity/.test(markup));
      // Adding a line moves the suffix to it without duplication or stale offsets.
      row.textContent += '\n2400'; row.useNumeralFormatting = true; row.numeralFormattingSize = 150;
      const threeLines = app.streetSignGeometry(sign).rows[0].lines;
      equal(threeLines[1].some(run => run.element === suffix), false);
      ok(threeLines[2].some(run => run.element === suffix));
      row.textContent = '\nFirst\nLast\n';
      const paddedLines = app.streetSignGeometry(sign).rows[0].lines;
      ok(paddedLines[1].some(run => run.element === prefix));
      ok(paddedLines[2].some(run => run.element === suffix));
    }
  }
}
const sign = app.createStreetSign(), row = sign.texts[0];
const prefix = app.addStreetTextElement(row, 'prefix'); equal(app.selectedStreetText(row), prefix); equal(prefix.affixSide, 'left');
const script = app.addStreetTextElement(row, 'superscript'); equal(app.selectedStreetText(row), script); equal(row.affixElements[0], prefix);
const suffix = app.addStreetTextElement(row, 'suffix'); equal(app.selectedStreetText(row), suffix); equal(suffix.affixSide, 'right');
suffix.fontFamily = 'Series EEM'; suffix.textColor = 'Yellow'; suffix.affixSide = 'left'; suffix.textContent = '<Av> & Street';
const project = app.restoreProject(JSON.stringify({ version: 1, heads: [], support: { type: 'mast-arm' }, streetSigns: [sign] }));
const saved = project.streetSigns[0].texts[0];
equal(saved.affixElements.length, 2); equal(saved.scriptElements.length, 1);
equal(app.selectedStreetText(saved).affix, 'suffix'); equal(saved.affixElements[1].fontFamily, 'Series EEM');
equal(saved.affixElements[1].textColor, 'Yellow'); equal(saved.affixElements[1].affixSide, 'left');
ok(saved.affixElements[0].id !== prefix.id);
const svg = app.renderSVG(project); ok(svg.includes('&lt;Av&gt;')); ok(svg.includes('&amp;')); ok(svg.includes('#fccf34'));
app.duplicateMastArm(project);
equal(project.streetSigns[0].texts[0].affixElements.length, 2);
ok(project.streetSigns[0].texts[0].affixElements[0].id !== saved.affixElements[0].id);
const snapshot = app.templateSnapshot(project, 'arm');
const into = app.restoreProject(null); into.support.type = 'mast-arm'; app.applySignalTemplate(into, { scope: 'arm', data: snapshot, variants: [] }, 'add');
equal(into.streetSigns[0].texts[0].affixElements[1].affix, 'suffix');
// Removal selects the correct collection without changing scripts.
ok(app.removeStreetTextElement(row)); equal(row.affixElements.length, 1); equal(row.scriptElements.length, 1);
equal(row.selectedElementIndex, 0); equal(app.removeStreetTextElement(row), false);
const legacy = app.restoreProject(JSON.stringify({ version: 1, heads: [], streetSigns: [{ texts: [{ textContent: 'Old', scriptElements: [{ script: 'subscript', textContent: 'St' }], selectedElementIndex: 1 }] }] }));
equal(legacy.streetSigns[0].texts[0].affixElements.length, 0); equal(app.selectedStreetText(legacy.streetSigns[0].texts[0]).script, 'subscript');
const limits = app.createStreetText(); for (let i = 0; i < 20; i++) app.addStreetTextElement(limits, 'prefix');
equal(app.addStreetTextElement(limits, 'suffix'), null); ok(app.addStreetTextElement(limits, 'subscript'));
// Font changes in the template editor include affixes in every assembly.
context.project = project; context.app = app; app.refresh = () => {};
const source = fs.readFileSync(path.join(root, 'js/templates.js'), 'utf8');
const start = source.indexOf('    function applyFont(font) {'), end = source.indexOf("    get('templateEditorApplyFont')", start);
vm.runInContext(`(() => { ${source.slice(start, end)} applyFont('Series D'); })()`, context);
for (const arm of app.mastArmProjects(project)) for (const item of arm.streetSigns) for (const text of item.texts) for (const element of app.streetTextChildren(text)) equal(element.fontFamily, 'Series D');
(async () => {
  const embedded = await app.embedStreetSignFonts(app.renderSVG(into), into);
  ok(embedded.includes(app.streetFontData['Series EEM']));
  console.log(`${checks} prefix/suffix placement, independent scripts, arrows, persistence, templates, and export checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
