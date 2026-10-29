// Template workflow and UI adapted from SignMaker v2.2 (GPL-3.0).
// SignalMaker snapshots deliberately exclude SignMaker's sign-template format.
(() => {
  const app = window.SignalMaker;
  const key = 'signalmaker-templates-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => app.createHead('').id;
  const assemblySnapshot = project => Object.fromEntries(['support', 'heads', 'streetSigns', 'selectedId', 'selectedStreetSignId', 'selectedTextIndex', 'alignment', 'spacing', 'mastArmId', 'mastArmName'].map(key => [key, project[key]]));
  const scopes = { head: 'Head', arm: 'Mast Arm', approach: 'Approach' };
  function templateSnapshot(project, scope) {
    app.syncMastArms(project);
    if (scope === 'head') {
      const head = project.heads.find(head => head.id === project.selectedId);
      if (!head) throw new Error('Select a head to save.');
      return clone({ version: 1, heads: [head], selectedId: head.id, support: app.normalizeSupport(), streetSigns: [], spacing: 12, alignment: 'center' });
    }
    if (scope === 'arm') {
      if (!app.hasMast(project)) throw new Error('Select a mast arm to save.');
      return clone({ ...assemblySnapshot(app.mastArmProjects(project)[project.activeMastArm ?? 0]), version: 1 });
    }
    return clone(project);
  }
  function freshProject(data) {
    if (data?.version !== 1 || !Array.isArray(data.heads)) throw new Error('Invalid SignalMaker template.');
    const restored = app.restoreProject(JSON.stringify(data));
    restored.mastArmId = uid();
    for (const arm of restored.mastArms) arm.mastArmId = uid();
    if (restored.mastArms.length) app.syncMastArms(restored);
    return restored;
  }
  function replaceProject(project, data) {
    Object.keys(project).forEach(key => delete project[key]);
    Object.assign(project, data);
  }
  function applyTemplate(project, template, mode, variantId = '') {
    const data = template.variants.find(item => item.id === variantId)?.data ?? template.data;
    const incoming = freshProject(data);
    if (mode === 'replace-approach') {
      if (template.scope === 'head' && incoming.heads[0]?.pedestrian) incoming.support.type = 'mast-arm';
      replaceProject(project, incoming); return;
    }
    if (template.scope === 'head') {
      const head = incoming.heads[0];
      if (!head) throw new Error('This template has no head.');
      const target = project.heads.find(item => item.id === project.selectedId);
      if (head.pedestrian && (!app.hasSupport(project) || mode === 'replace-head' && !target?.poleMounted)) {
        throw new Error('Pedestrian templates require a supplementary head on a support.');
      }
      if (mode === 'replace-head') {
        if (!target) throw new Error('Select a head to replace.');
        for (const field of ['armPosition', 'poleHeight', 'poleMounted', 'poleMounting', 'poleMountSide', 'spanPole']) {
          if (target[field] !== undefined) head[field] = target[field];
        }
        project.heads.splice(project.heads.indexOf(target), 1, head);
      } else {
        const names = new Set(project.heads.map(head => head.name));
        let number = 1;
        while (names.has(`Head ${number}`)) number++;
        head.name = `Head ${number}`;
        app.placeNewHead(project, head);
        project.heads.splice(target ? project.heads.indexOf(target) + 1 : project.heads.length, 0, head);
      }
      project.selectedId = head.id;
      return;
    }
    if (!app.hasMast(project) || !app.hasMast(incoming)) throw new Error('Adding assemblies requires mast-arm supports in both the drawing and template.');
    if (!project.mastArms.length) project.mastArms = [clone(assemblySnapshot(project))];
    app.syncMastArms(project);
    const additions = app.mastArmProjects(incoming).map(arm => {
      const names = new Set(project.mastArms.map(arm => arm.mastArmName));
      let number = 1;
      while (names.has(`Mast Arm ${number}`)) number++;
      const item = { ...clone(assemblySnapshot(arm)), mastArmName: `Mast Arm ${number}`, mastArmId: uid() };
      project.mastArms.push(item);
      return item;
    });
    app.selectMastArm(project, project.mastArms.indexOf(additions[0]));
  }
  function defaultTemplates() {
    const now = '2026-10-13T00:00:00.000Z';
    return ['linear', 'cluster', 'hawk', 'pedestrian'].map(layout => {
      const project = app.restoreProject(null);
      const head = app.createHead('Head 1');
      if (layout === 'pedestrian') { head.poleMounted = true; head.poleHeight = 108; head.poleMounting = 'direct'; }
      app.setHeadLayout(head, layout);
      project.heads = [head]; project.selectedId = head.id;
      return { id: `default-${layout}`, name: { linear: 'Three-section signal', cluster: 'Five-section cluster', hawk: 'HAWK beacon', pedestrian: 'Pedestrian signal' }[layout], scope: 'head',
        data: templateSnapshot(project, 'head'), variants: [], dateCreated: now, dateModified: now, isDefault: true };
    });
  }
  function normalizeTemplates(raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved.version !== 1 || !Array.isArray(saved.templates)) return [];
      return saved.templates.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && scopes[item.scope]).map(item => {
        freshProject(item.data);
        return { id: item.id, name: item.name.slice(0, 80), scope: item.scope, data: clone(item.data),
          variants: (Array.isArray(item.variants) ? item.variants : []).filter(variant => variant && typeof variant.id === 'string' && typeof variant.name === 'string').map(variant => {
            freshProject(variant.data); return { id: variant.id, name: variant.name.slice(0, 80), font: app.streetFonts.includes(variant.font) ? variant.font : '', data: clone(variant.data) };
          }), dateCreated: item.dateCreated, dateModified: item.dateModified, lastUsed: item.lastUsed };
      });
    } catch { return []; }
  }
  app.startTemplates = ({ project, showEditor, report }) => {
    const get = id => document.getElementById(id);
    let saved = null;
    try { saved = localStorage.getItem(key); } catch {}
    let library = normalizeTemplates(saved);
    const defaults = defaultTemplates();
    let usage = {};
    try { usage = JSON.parse(localStorage.getItem(`${key}-usage`) ?? '{}'); } catch {}
    for (const item of defaults) item.lastUsed = usage?.[item.id];
    const all = () => [...defaults, ...library];
    let editing = null;
    let warning = false;
    try { warning = localStorage.getItem(`${key}-warning`) === 'true'; } catch {}
    get('templateLoadWarning').checked = warning;
    const persist = () => {
      try { localStorage.setItem(key, JSON.stringify({ version: 1, templates: library })); return true; }
      catch { report('Templates are available for this session; browser storage is unavailable or full.'); return false; }
    };
    const tab = editor => {
      get('templatesSaved').hidden = editor;
      get('templateEdit').hidden = !editor;
      for (const [id, selected] of [['templatesSavedTab', !editor], ['templateEditTab', editor]]) {
        get(id).classList.toggle('selected', selected);
        get(id).setAttribute('aria-selected', String(selected));
        get(id).tabIndex = selected ? 0 : -1;
      }
      app.fitPreview();
    };
    const refreshStatus = () => {
      get('saveHeadTemplate').disabled = !!editing || !project.selectedId;
      get('saveArmTemplate').disabled = !!editing || !app.hasMast(project);
      get('saveApproachTemplate').disabled = !!editing || !app.hasDrawing(project);
      get('templateEditingNotice').hidden = !editing;
      get('templateEditingNoticeText').textContent = editing ? `Editing ${editing.draft.name}` : '';
    };
    function list() {
      const search = get('templateSearchInput').value.toLowerCase();
      const sort = get('templateSortSelect').value;
      const templates = all().filter(item => item.name.toLowerCase().includes(search));
      templates.sort((a, b) => sort === 'alphabetical' ? a.name.localeCompare(b.name) : String(sort === 'last-used' ? b.lastUsed ?? '' : b.dateCreated ?? '').localeCompare(String(sort === 'last-used' ? a.lastUsed ?? '' : a.dateCreated ?? '')));
      get('savedTemplatesList').innerHTML = templates.map(item => `<div class="templateItem" data-template-id="${app.escape(item.id)}"><div class="templateItemInfo"><div class="templateNameRow"><strong class="templateItemName">${app.escape(item.name)}</strong><select class="templateVariantSelect" aria-label="Version of ${app.escape(item.name)}"><option value="">Original</option>${item.variants.map(variant => `<option value="${app.escape(variant.id)}">${app.escape(variant.name)}</option>`).join('')}</select><button type="button" class="templateEditBtn" data-template-action="edit" aria-label="Edit ${app.escape(item.name)}"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button></div><span class="templateItemDate">${item.isDefault ? 'Default · ' : ''}${scopes[item.scope]} · ${app.escape(new Date(item.dateModified ?? item.dateCreated).toLocaleDateString())}</span></div><div class="templateItemActions"><button type="button" class="templateLoadBtn" data-template-action="replace-approach">Replace Approach</button>${item.scope === 'head' ? '<button type="button" class="templateLoadBtn templateReplacePanelBtn" draggable="true" data-template-action="replace-head" title="Replace selected head, or drag onto a head">Replace Head</button>' : ''}<button type="button" class="templateLoadBtn" data-template-action="add">Add</button>${item.isDefault ? '' : '<button type="button" class="templateDeleteBtn" data-template-action="delete" aria-label="Delete template"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>'}</div></div>`).join('') || '<p class="templateEmptyMessage">No templates found.</p>';
      refreshStatus();
    }
    function save(scope) {
      if (editing) return;
      const name = get('templateNameInput').value.trim();
      if (!name) { report('Enter a template name.'); get('templateNameInput').focus(); return; }
      try {
        const now = new Date().toISOString();
        library.push({ id: uid(), name, scope, data: templateSnapshot(project, scope), variants: [], dateCreated: now, dateModified: now });
        if (persist()) report('Template saved.');
        get('templateNameInput').value = ''; list();
      } catch (error) { report(error.message); }
    }
    const version = () => editing.variantId ? editing.draft.variants.find(item => item.id === editing.variantId) : editing.draft;
    function capture() {
      if (!editing) return;
      version().data = templateSnapshot(project, editing.draft.scope);
      editing.draft.name = get('templateEditorName').value.trim() || editing.draft.name;
      if (editing.variantId) {
        version().name = get('templateEditorVariantName').value.trim() || version().name;
        version().font = get('templateEditorVariantFont').value;
      }
    }
    function updateEditor() {
      get('templateEditorEmpty').hidden = !!editing;
      get('templateEditorForm').hidden = !editing;
      if (!editing) return;
      get('templateEditorName').value = editing.draft.name;
      get('templateEditorScope').textContent = scopes[editing.draft.scope];
      get('templateEditorVariantSelect').innerHTML = '<option value="">Original</option>' + editing.draft.variants.map(item => `<option value="${item.id}">${app.escape(item.name)}</option>`).join('');
      get('templateEditorVariantSelect').value = editing.variantId;
      get('templateEditorVariantName').value = editing.variantId ? version().name : 'Original';
      get('templateEditorVariantName').disabled = !editing.variantId;
      get('templateEditorVariantFont').value = version().font ?? '';
      get('templateEditorDeleteVariant').disabled = !editing.variantId;
      refreshStatus();
    }
    function edit(item, variantId) {
      if (editing) { report('Save or cancel the current template edit first.'); tab(true); return; }
      app.syncMastArms(project);
      editing = { draft: clone(item), before: clone(project), variantId };
      if (item.isDefault) { editing.draft.id = uid(); delete editing.draft.isDefault; }
      replaceProject(project, freshProject(version().data));
      app.refresh(); updateEditor(); tab(true);
    }
    function load(item, mode, variantId) {
      if (editing) { report('Save or cancel the current template edit first.'); tab(true); return; }
      if (mode !== 'add' && warning && !window.confirm(`Replace the current ${mode === 'replace-head' ? 'head' : 'approach'} with this template?`)) return;
      try {
        app.runWithUndo(() => { applyTemplate(project, item, mode, variantId); app.refresh(); });
        item.lastUsed = new Date().toISOString();
        if (item.isDefault) { usage[item.id] = item.lastUsed; try { localStorage.setItem(`${key}-usage`, JSON.stringify(usage)); } catch {} }
        persist(); list(); report('Template applied.');
      } catch (error) { report(error.message); }
    }
    for (const [id, scope] of [['saveHeadTemplate', 'head'], ['saveArmTemplate', 'arm'], ['saveApproachTemplate', 'approach']]) get(id).addEventListener('click', () => save(scope));
    get('templateNameInput').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); save('approach'); } });
    get('templateSearchInput').addEventListener('input', list);
    get('templateSortSelect').addEventListener('change', list);
    get('templateLoadWarning').addEventListener('change', event => { warning = event.target.checked; try { localStorage.setItem(`${key}-warning`, String(warning)); } catch {} });
    get('savedTemplatesList').addEventListener('click', event => {
      const button = event.target.closest('[data-template-action]');
      const row = button?.closest('[data-template-id]');
      const item = all().find(item => item.id === row?.dataset.templateId);
      if (!item) return;
      const action = button.dataset.templateAction;
      const variant = row.querySelector('select').value;
      if (action === 'edit') edit(item, variant);
      else if (action === 'delete') { if (editing) { report('Save or cancel the template edit first.'); return; } library = library.filter(template => template.id !== item.id); persist(); list(); }
      else load(item, action, variant);
    });
    for (const [id, editor] of [['templatesSavedTab', false], ['templateEditTab', true], ['templateReturnEditor', true]]) get(id).addEventListener('click', () => tab(editor));
    for (const id of ['templatesSavedTab', 'templateEditTab']) get(id).addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
// in #sm-links
// in #sm-links
      event.preventDefault(); const editor = event.key === 'End' || event.key === 'ArrowRight'; tab(editor); get(editor ? 'templateEditTab' : 'templatesSavedTab').focus();
    });
    const fonts = '<option value="">Current fonts</option>' + app.streetFonts.map(font => `<option>${app.escape(font)}</option>`).join('');
    get('templateEditorVariantFont').innerHTML = get('templateNewVariantFont').innerHTML = fonts;
    function applyFont(font) {
      if (!font) return;
      for (const arm of app.mastArmProjects(project)) for (const sign of arm.streetSigns ?? []) for (const row of sign.texts) for (const text of [row, ...app.streetTextChildren(row)]) text.fontFamily = font;
      app.refresh();
    }
    get('templateEditorApplyFont').addEventListener('click', () => { if (editing) applyFont(get('templateEditorVariantFont').value); });
    get('templateEditorVariantSelect').addEventListener('change', event => {
      if (!editing) return;
      capture(); editing.variantId = event.target.value; replaceProject(project, freshProject(version().data)); app.refresh(); updateEditor();
    });
    get('templateAddVariant').addEventListener('click', () => {
      if (!editing) return;
      const name = get('templateNewVariantName').value.trim();
      if (!name) { report('Enter a variant name.'); return; }
      capture();
      const variant = { id: uid(), name, font: get('templateNewVariantFont').value, data: templateSnapshot(project, editing.draft.scope) };
      editing.draft.variants.push(variant); editing.variantId = variant.id;
      applyFont(variant.font); capture(); get('templateNewVariantName').value = ''; updateEditor();
    });
    get('templateEditorDeleteVariant').addEventListener('click', () => {
      if (!editing?.variantId) return;
      editing.draft.variants = editing.draft.variants.filter(item => item.id !== editing.variantId); editing.variantId = '';
      replaceProject(project, freshProject(version().data)); app.refresh(); updateEditor();
    });
    function exit(saveChanges) {
      if (!editing) return;
      try {
        let stored = true;
        if (saveChanges) {
          capture(); const draft = editing.draft; draft.dateModified = new Date().toISOString();
          const index = library.findIndex(item => item.id === draft.id); if (index < 0) library.push(draft); else library[index] = draft;
          stored = persist();
        }
        const before = editing.before; editing = null; replaceProject(project, before); app.refresh(); updateEditor(); list(); tab(false);
        report(saveChanges ? stored ? 'Template saved; original drawing restored.' : 'Template retained for this session; original drawing restored.' : 'Template edits canceled; original drawing restored.');
      } catch (error) { report(error.message); }
    }
    get('templateEditorSave').addEventListener('click', () => exit(true));
    get('templateEditorCancel').addEventListener('click', () => exit(false));
    let draggedTemplate = null;
    get('savedTemplatesList').addEventListener('dragstart', event => {
      const button = event.target.closest('[data-template-action="replace-head"]');
      if (!button) return;
      const row = button.closest('[data-template-id]'); draggedTemplate = { id: row.dataset.templateId, variant: row.querySelector('select').value };
      event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('application/x-signalmaker-template', JSON.stringify(draggedTemplate));
    });
    get('savedTemplatesList').addEventListener('dragend', () => { draggedTemplate = null; });
    const stage = get('previewStage');
    stage.addEventListener('dragover', event => { if (draggedTemplate && event.target.closest('[data-head-id]')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } });
    stage.addEventListener('drop', event => {
      const target = event.target.closest('[data-head-id]');
      if (!draggedTemplate || !target) return;
      event.preventDefault(); const item = all().find(item => item.id === draggedTemplate.id);
      const index = Number(target.dataset.mastArmIndex); if (Number.isInteger(index)) app.selectMastArm(project, index);
      project.selectedId = target.dataset.headId; load(item, 'replace-head', draggedTemplate.variant); draggedTemplate = null;
    });
    app.projectForStorage = drawing => editing ? editing.before : drawing;
    const previousChanged = app.onDrawingChanged;
    app.onDrawingChanged = () => { previousChanged?.(); refreshStatus(); };
    app.refreshTemplates = list;
    list(); updateEditor();
  };
  Object.assign(app, { templateSnapshot, applySignalTemplate: applyTemplate, normalizeSignalTemplates: normalizeTemplates, defaultSignalTemplates: defaultTemplates });
})();
