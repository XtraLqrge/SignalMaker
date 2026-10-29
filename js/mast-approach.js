 (() => {
   const app = window.SignalMaker;
   // Each approach assembly retains the existing single-support project shape.
   // The selected assembly is exposed through the original editor fields; archived
   // assemblies have no references back to the approach, so JSON stays acyclic.
   const fields = ['support', 'heads', 'streetSigns', 'selectedId', 'selectedStreetSignId', 'selectedTextIndex', 'alignment', 'spacing', 'mastArmId', 'mastArmName'];
   const snapshot = project => Object.fromEntries(fields.map(field => [field, project[field]]));
   const uid = () => app.createHead('').id;
   const supportLabel = type => ({ 'mast-arm': 'Mast Arm', 'span-wire': 'Span Wire', pedestal: 'Pedestal' }[type] ?? 'Support');
   const nextName = (project, type = project.support.type) => {
     const names = new Set((project.mastArms ?? []).map(arm => arm.mastArmName));
     names.add(project.mastArmName);
     let number = 1;
     while (names.has(`${supportLabel(type)} ${number}`)) number++;
     return `${supportLabel(type)} ${number}`;
   };
   const spacing = value => Number.isFinite(value) ? Math.max(0, Math.min(6000, value)) : 720;
   function syncMastArms(project) {
     if (!project.mastArms?.length) return;
     project.activeMastArm = Math.max(0, Math.min(project.mastArms.length - 1, project.activeMastArm ?? 0));
     project.mastArms[project.activeMastArm] = snapshot(project);
   }
   function mastArmProjects(project) {
     if (!project.mastArms?.length) return [project];
     return project.mastArms.map((arm, index) => index === project.activeMastArm ? snapshot(project) : arm);
   }
   function selectMastArm(project, index) {
     if (!Number.isInteger(index) || index < 0 || index >= (project.mastArms?.length ?? 0)) return;
     syncMastArms(project);
     project.activeMastArm = index;
     Object.assign(project, project.mastArms[index]);
   }
   function addSupport(project, type = 'mast-arm') {
     if (!['mast-arm', 'span-wire', 'pedestal'].includes(type)) return;
     if (!project.mastArms?.length && !app.hasSupport(project) && !project.heads.length && !project.streetSigns?.length) {
       project.support = app.normalizeSupport({ type });
       project.mastArmName = `${supportLabel(type)} 1`;
       return;
     }
     if (!project.mastArms?.length) { project.mastArms = [snapshot(project)]; project.activeMastArm = 0; }
     syncMastArms(project);
     project.mastArms.push({ mastArmId: uid(), mastArmName: nextName(project, type), support: app.normalizeSupport({ type }), heads: [], streetSigns: [],
       selectedId: null, selectedStreetSignId: null, selectedTextIndex: 0, alignment: 'center', spacing: 12 });
     selectMastArm(project, project.mastArms.length - 1);
   }
   const addMastArm = project => addSupport(project, 'mast-arm');
   function removeMastArm(project) {
     if ((project.mastArms?.length ?? 0) < 2) return;
     const index = project.activeMastArm;
     syncMastArms(project);
     project.mastArms.splice(index, 1);
     project.activeMastArm = Math.min(index, project.mastArms.length - 1);
     Object.assign(project, project.mastArms[project.activeMastArm]);
   }
   function reorderMastArms(project, from, drop) {
     if (!project.mastArms?.length) return;
     syncMastArms(project);
     const selected = project.mastArms[project.activeMastArm];
     const moved = app.moveItem(project.mastArms, from, drop);
     project.activeMastArm = project.mastArms.indexOf(selected);
     return moved;
   }
   function duplicateMastArm(project) {
     if (!project.mastArms?.length) { project.mastArms = [snapshot(project)]; project.activeMastArm = 0; }
     syncMastArms(project);
     const copy = restoreSingle(JSON.stringify({ ...snapshot(project), version: 1 }));
     Object.assign(copy, { mastArmId: uid(), mastArmName: nextName(project) });
     project.mastArms.splice(project.activeMastArm + 1, 0, snapshot(copy));
     selectMastArm(project, project.activeMastArm + 1);
   }
   const restoreSingle = app.restoreProject;
   app.restoreProject = raw => {
     const project = restoreSingle(raw);
     project.mastArmId = uid();
     project.mastArmName = `${supportLabel(project.support.type === 'none' ? 'mast-arm' : project.support.type)} 1`;
     project.mastArms = [];
     project.activeMastArm = 0;
     project.mastArmSpacing = 720;
     try {
       const saved = JSON.parse(raw);
       project.mastArmSpacing = spacing(saved?.mastArmSpacing);
       if (typeof saved?.mastArmId === 'string') project.mastArmId = saved.mastArmId;
       if (typeof saved?.mastArmName === 'string') project.mastArmName = saved.mastArmName.slice(0, 80);
       if (saved?.version === 1 && Array.isArray(saved?.mastArms) && saved.mastArms.length) {
         const active = Number.isInteger(saved.activeMastArm) ? Math.max(0, Math.min(saved.mastArms.length - 1, saved.activeMastArm)) : 0;
         if (typeof saved.mastArmName !== 'string') project.mastArmName = `${supportLabel(project.support.type)} ${active + 1}`;
         project.mastArms = saved.mastArms.map((arm, index) => index === active ? snapshot(project)
           : { ...snapshot(restoreSingle(JSON.stringify({ ...arm, version: 1, support: { ...arm.support, type: arm.support?.type ?? 'mast-arm' } }))),
             mastArmId: typeof arm.mastArmId === 'string' ? arm.mastArmId : uid(),
             mastArmName: typeof arm.mastArmName === 'string' ? arm.mastArmName.slice(0, 80) : `${supportLabel(arm.support?.type)} ${index + 1}` });
         project.activeMastArm = active;
       }
     } catch {}
     return project;
   };
   function startMastApproach(project, { showEditor }) {
     const get = id => document.getElementById(id);
     const list = get('mastArmList');
     let suppressClickUntil = 0;
     const update = () => {
       const scroll = list.scrollTop;
       const focusId = list.contains(document.activeElement) ? document.activeElement.id : null;
       const arms = project.mastArms?.length ? project.mastArms : [project];
       const select = get('mastArmSelector');
       select.innerHTML = arms.map((_, index) => `<option value="${index}">${app.escape(arms[index].mastArmName ?? `Mast Arm ${index + 1}`)}</option>`).join('');
       select.value = project.activeMastArm ?? 0;
       get('removeMastArm').disabled = get('removeMastArmPopover').disabled = arms.length < 2;
       get('mastArmsToolbar').disabled = false;
       list.innerHTML = arms.map((arm, index) => `<li><button id="mast-select-${arm.mastArmId}" type="button" class="headListButton${index === (project.activeMastArm ?? 0) ? ' active' : ''}" data-select-arm="${index}" draggable="${arms.length > 1}" aria-current="${index === (project.activeMastArm ?? 0)}" aria-keyshortcuts="ArrowUp ArrowDown" title="Drag to reorder; arrow keys also move this support">${app.escape(arm.mastArmName ?? `Mast Arm ${index + 1}`)}</button></li>`).join('');
       list.scrollTop = scroll;
       if (focusId) get(focusId)?.focus({ preventScroll: true });
       get('mastArmSpacingOptions').hidden = arms.length < 2;
       for (const id of ['mastArmSpacing', 'mastArmSpacingValue']) {
         if (document.activeElement !== get(id)) get(id).value = (project.mastArmSpacing ?? 720) / 12;
       }
     };
     get('mastArmSelector').addEventListener('change', event => { selectMastArm(project, Number(event.target.value)); app.refresh(); flashArm(); });
     for (const id of ['addMastArm', 'addMastArmPopover']) get(id).addEventListener('click', () => { addSupport(project, get(id === 'addMastArm' ? 'newSupportKind' : 'newSupportKindPopover').value); app.refresh(); });
     for (const id of ['newSupportKind', 'newSupportKindPopover']) get(id).addEventListener('change', event => {
       get(id === 'newSupportKind' ? 'newSupportKindPopover' : 'newSupportKind').value = event.target.value;
     });
     get('duplicateMastArm').addEventListener('click', () => { duplicateMastArm(project); app.refresh(); });
     for (const id of ['removeMastArm', 'removeMastArmPopover']) get(id).addEventListener('click', () => { removeMastArm(project); app.refresh(); });
     for (const id of ['mastArmSpacing', 'mastArmSpacingValue']) {
       get(id).addEventListener('input', event => {
         if (event.target.value === '' || !event.target.validity.valid) return;
         project.mastArmSpacing = spacing(Number(event.target.value) * 12);
         app.refresh(false);
       });
       get(id).addEventListener('change', update);
     }
     // Activate the assembly before the existing head/sign event handlers run.
     // Keep the mounted DOM intact so pointer capture, touch and drag remain valid.
     const stage = get('previewStage');
     for (const type of ['pointerdown', 'click', 'keydown', 'dragstart', 'contextmenu']) {
       stage.addEventListener(type, event => {
         const element = event.target.closest('[data-mast-arm-index]');
         if (!element) return;
         const index = Number(element.dataset.mastArmIndex);
         if (index !== project.activeMastArm) selectMastArm(project, index);
         if (element.hasAttribute('data-select-mast-arm') && (type === 'click' || type === 'keydown' && ['Enter', ' '].includes(event.key))) {
           if (type === 'click' && Date.now() < suppressClickUntil) return;
           if (type === 'keydown') event.preventDefault();
           app.refresh();
           showEditor('supportEditor');
           flashArm();
           if (type === 'keydown') get('mastArmSelector').focus({ preventScroll: true });
         }
       }, true);
     }
     // SignMaker v2.2 panel-selector drag conventions: midpoint insertion,
     // random-delay wiggle, faded source, insertion markers, and an open popup.
     let drag = null;
     let touch = null;
     const rows = () => [...list.querySelectorAll('.headListButton')];
     function flashArm() {
       const target = stage.querySelector(`[data-select-mast-arm="${project.activeMastArm ?? 0}"]`);
       if (!target) return;
       const rect = target.getBoundingClientRect(), host = stage.getBoundingClientRect();
       const overlay = document.createElement('div');
       overlay.className = 'flash-selection';
       Object.assign(overlay.style, { left: `${rect.left - host.left}px`, top: `${rect.top - host.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
       stage.append(overlay);
       setTimeout(() => overlay.remove(), 500);
     }
     function wiggleArms(active, source = -1) {
       stage.querySelectorAll('[data-select-mast-arm]').forEach(target => {
         const visual = target.querySelector('.mastArmVisual');
         visual?.classList.toggle('panelWiggle', active);
         visual?.classList.toggle('dragging', active && Number(target.dataset.selectMastArm) === source);
         if (active) visual?.style.setProperty('--wiggle-delay', `${Math.random() * 0.12}s`);
         else visual?.style.removeProperty('--wiggle-delay');
       });
     }
     const cleanup = () => {
       wiggleArms(false);
       rows().forEach(button => {
         button.classList.remove('panelWiggle', 'dragging', 'dropBefore', 'dropAfter');
         button.style.removeProperty('--wiggle-delay');
       });
       drag = null;
     };
     const begin = button => {
       drag = { from: Number(button.dataset.selectArm), focusId: button.id };
       wiggleArms(true, drag.from);
       rows().forEach(row => {
         row.classList.add('panelWiggle');
         row.style.setProperty('--wiggle-delay', `${Math.random() * 0.12}s`);
       });
       button.classList.add('dragging');
     };
     const placement = y => {
       const buttons = rows();
       let index = buttons.findIndex(button => y < button.getBoundingClientRect().top + button.getBoundingClientRect().height / 2);
       if (index < 0) index = buttons.length;
       return { index, target: buttons[Math.min(index, buttons.length - 1)], before: index < buttons.length };
     };
     const mark = y => {
       const rect = list.getBoundingClientRect();
       if (y < rect.top + 20) list.scrollTop -= 12;
       if (y > rect.bottom - 20) list.scrollTop += 12;
       rows().forEach(row => row.classList.remove('dropBefore', 'dropAfter'));
       const drop = placement(y);
       if (drop.target && !drop.target.classList.contains('dragging')) drop.target.classList.add(drop.before ? 'dropBefore' : 'dropAfter');
     };
     const finish = (y, cancelled = false) => {
       if (!drag) return;
       const state = drag;
       if (!cancelled) reorderMastArms(project, state.from, placement(y).index);
       cleanup();
       suppressClickUntil = Date.now() + 250;
       app.refresh();
       get(state.focusId)?.focus({ preventScroll: true });
     };
     list.addEventListener('dragstart', event => {
       const button = event.target.closest('[data-select-arm]');
       if (!button || (project.mastArms?.length ?? 0) < 2) return;
       begin(button);
       event.dataTransfer.effectAllowed = 'move';
       event.dataTransfer.setData('text/plain', String(drag.from));
     });
     list.addEventListener('dragover', event => {
       if (!drag) return;
       event.preventDefault();
       event.dataTransfer.dropEffect = 'move';
       mark(event.clientY);
     });
     list.addEventListener('drop', event => { if (drag) { event.preventDefault(); finish(event.clientY); } });
 // in #sm-links
 // in #sm-links
     list.addEventListener('dragleave', event => {
       if (!list.contains(event.relatedTarget)) rows().forEach(row => row.classList.remove('dropBefore', 'dropAfter'));
     });
     list.addEventListener('dragend', () => { suppressClickUntil = Date.now() + 250; cleanup(); });
     list.addEventListener('pointerdown', event => {
       const button = event.target.closest('[data-select-arm]');
       if (!button || event.pointerType === 'mouse' || (project.mastArms?.length ?? 0) < 2 || !event.isPrimary) return;
       touch = { button, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
       button.setPointerCapture(event.pointerId);
     });
     list.addEventListener('pointermove', event => {
       if (!touch || touch.pointerId !== event.pointerId) return;
       if (!drag && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) < 6) return;
       event.preventDefault();
       if (!drag) begin(touch.button);
       mark(event.clientY);
     });
     const endTouch = (event, cancelled = false) => {
       if (!touch || touch.pointerId !== event.pointerId) return;
       const state = touch;
       touch = null;
       if (state.button.hasPointerCapture(state.pointerId)) state.button.releasePointerCapture(state.pointerId);
       finish(event.clientY, cancelled);
     };
     list.addEventListener('pointerup', event => endTouch(event));
     list.addEventListener('pointercancel', event => endTouch(event, true));
     list.addEventListener('lostpointercapture', event => { if (touch) endTouch(event, true); });
     document.addEventListener('keydown', event => {
       if (event.key !== 'Escape') return;
       if (touch?.button.hasPointerCapture(touch.pointerId)) touch.button.releasePointerCapture(touch.pointerId);
       touch = null;
       cleanup();
     });
     list.addEventListener('click', event => {
       const button = event.target.closest('[data-select-arm]');
       if (!button || Date.now() < suppressClickUntil) return;
       selectMastArm(project, Number(button.dataset.selectArm));
       app.refresh();
       get(button.id)?.focus({ preventScroll: true });
       flashArm();
     });
     list.addEventListener('keydown', event => {
       const button = event.target.closest('[data-select-arm]');
       if (!button || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
       event.preventDefault();
       const index = Number(button.dataset.selectArm);
       reorderMastArms(project, index, event.key === 'ArrowUp' ? index - 1 : index + 2);
       app.refresh();
     });
     let viewerDrag = null;
     stage.addEventListener('pointerdown', event => {
       const target = event.target.closest('[data-select-mast-arm]');
       if (!target || event.button !== 0 || !event.isPrimary) return;
       viewerDrag = { pointerId: event.pointerId, from: Number(target.dataset.selectMastArm), x: event.clientX, y: event.clientY, moving: false };
       stage.setPointerCapture(event.pointerId);
     });
     const viewerPlacement = x => {
       const layout = app.scene(project);
       const rect = get('headContainer').getBoundingClientRect();
       const scale = rect.width / layout.width;
       const assemblies = layout.assemblies ?? [{ layout, x: 0 }];
       const centers = assemblies.map(item => rect.left + scale * (item.x + app.supportAnchor(item.layout).x));
       const found = centers.findIndex(center => x < center);
       return { index: found < 0 ? centers.length : found, centers, rect };
     };
     stage.addEventListener('pointermove', event => {
       if (!viewerDrag || viewerDrag.pointerId !== event.pointerId) return;
       if (!viewerDrag.moving && Math.hypot(event.clientX - viewerDrag.x, event.clientY - viewerDrag.y) < 6) return;
       event.preventDefault();
       if (!viewerDrag.moving) {
         viewerDrag.moving = true;
         stage.querySelectorAll('.flash-selection').forEach(element => element.remove());
         wiggleArms(true, viewerDrag.from);
       }
       const drop = viewerPlacement(event.clientX);
       let marker = stage.querySelector('.mastArmInsertion');
       if (!marker) { marker = document.createElement('div'); marker.className = 'mastArmInsertion'; stage.append(marker); }
       const host = stage.getBoundingClientRect();
       const x = drop.index === 0 ? drop.centers[0] - 12 : drop.index === drop.centers.length ? drop.centers.at(-1) + 12 : (drop.centers[drop.index - 1] + drop.centers[drop.index]) / 2;
       Object.assign(marker.style, { left: `${x - host.left}px`, top: `${drop.rect.top - host.top}px`, height: `${drop.rect.height}px` });
     });
     const finishViewer = (event, cancelled = false) => {
       if (!viewerDrag || viewerDrag.pointerId !== event.pointerId) return;
       const state = viewerDrag;
       viewerDrag = null;
       if (stage.hasPointerCapture(state.pointerId)) stage.releasePointerCapture(state.pointerId);
       if (!state.moving && !cancelled) {
         suppressClickUntil = Date.now() + 250;
         app.refresh();
         showEditor('supportEditor');
         flashArm();
       }
       if (state.moving) {
         if (!cancelled) reorderMastArms(project, state.from, viewerPlacement(event.clientX).index);
         suppressClickUntil = Date.now() + 250;
         wiggleArms(false);
         stage.querySelector('.mastArmInsertion')?.remove();
         app.refresh();
       }
     };
     stage.addEventListener('pointerup', event => finishViewer(event));
     stage.addEventListener('pointercancel', event => finishViewer(event, true));
     stage.addEventListener('lostpointercapture', event => finishViewer(event, true));
     document.addEventListener('keydown', event => {
       if (event.key === 'Escape' && viewerDrag) finishViewer({ pointerId: viewerDrag.pointerId }, true);
     });
     app.updateMastApproachControls = update;
   }
   Object.assign(app, { syncMastArms, mastArmProjects, selectMastArm, addMastArm, addSupport, nextSupportName: nextName, supportTypeLabel: supportLabel, removeMastArm, reorderMastArms, duplicateMastArm, startMastApproach });
 })();
