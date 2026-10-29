 (() => {
   const app = window.SignalMaker;
   app.startHistory = (project, { onRestore, report }) => {
     const HISTORY_LIMIT = 100;
     const undoStack = [];
     const redoStack = [];
     const undoButton = document.getElementById('undoButton');
     const redoButton = document.getElementById('redoButton');
     const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);
     let applyingHistory = false;
     let pendingBefore = null;
     let editingInput = null;
     const serialize = () => JSON.stringify(project);
     // Selection travels with an edit, but selecting alone is not an undo step.
     const drawingKey = snapshot => {
       const drawing = JSON.parse(snapshot);
       if (drawing.mastArms?.length) {
         // The selected arm is an editor view of its saved assembly. Switching
         // that view alone is selection, not a drawing edit or an undo step.
         for (const key of ['activeMastArm', 'support', 'heads', 'streetSigns', 'alignment', 'spacing', 'mastArmId', 'mastArmName']) delete drawing[key];
       }
       return JSON.stringify(drawing, (key, value) =>
         ['selectedId', 'selectedStreetSignId', 'selectedTextIndex', 'selectedElementIndex'].includes(key) ? undefined : value);
     };
     let currentSnapshot = serialize();

     function updateButtons() {
       const pendingChange = pendingBefore !== null && drawingKey(pendingBefore) !== drawingKey(serialize());
       undoButton.disabled = !undoStack.length && !pendingChange;
       redoButton.disabled = !redoStack.length || pendingChange;
     }

     function push(stack, snapshot) {
       if (stack.at(-1) === snapshot) return;
       stack.push(snapshot);
       if (stack.length > HISTORY_LIMIT) stack.shift();
     }

     function commit(before, after) {
       if (drawingKey(before) !== drawingKey(after)) {
         push(undoStack, before);
         redoStack.length = 0;
       }
       currentSnapshot = after;
       updateButtons();
     }

     function finishChange() {
       if (pendingBefore === null) return;
       const before = pendingBefore;
       pendingBefore = null;
       editingInput = null;
       commit(before, serialize());
     }

     function beginChange(input) {
       if (applyingHistory || editingInput === input) return;
       finishChange();
       pendingBefore = serialize();
       editingInput = input;
     }

     app.recordHistory = () => {
       if (applyingHistory) return;
       if (pendingBefore !== null) updateButtons();
       else commit(currentSnapshot, serialize());
     };

     function restore(snapshot) {
       applyingHistory = true;
       try {
         // Keep the shared project object and stable entity IDs used by editors.
         const restored = JSON.parse(snapshot);
         Object.keys(project).forEach(key => { delete project[key]; });
         Object.assign(project, restored);
         onRestore();
         currentSnapshot = serialize();
       } finally {
         applyingHistory = false;
         updateButtons();
       }
     }

     function travel(from, to, message) {
       finishChange();
       if (applyingHistory || !from.length) return;
       // Capture before blur and rebuilding, both of which can reset a menu's
       // scroll range. IDs also cover scroll containers recreated by an editor.
       const scroll = [...document.querySelectorAll('.editor, .editorContent, .headsMenu, #headList, #mastArmList, .symbolPickerMenu')]
         .map(element => ({ element, id: element.id, top: element.scrollTop, left: element.scrollLeft }));
       try {
         document.activeElement?.blur();
         push(to, serialize());
         restore(from.pop());
       } finally {
         for (const state of scroll) {
           const element = state.id ? document.getElementById(state.id) : state.element;
           if (!element) continue;
           element.scrollTop = state.top;
           element.scrollLeft = state.left;
         }
       }
       report(message);
     }
     app.undo = () => travel(undoStack, redoStack, 'Undone.');
     app.redo = () => travel(redoStack, undoStack, 'Redone.');
     app.runWithUndo = callback => {
       finishChange();
       const before = serialize();
       pendingBefore = before;
       try { return callback(); }
       finally { finishChange(); }
     };

     for (const [button, label, shortcut, ariaShortcut, action] of [
       [undoButton, 'Undo', isMac ? '⌘Z' : 'Ctrl+Z', isMac ? 'Meta+Z' : 'Control+Z', app.undo],
       [redoButton, 'Redo', isMac ? '⌘⇧Z' : 'Ctrl+Y / Ctrl+Shift+Z', isMac ? 'Meta+Shift+Z' : 'Control+Y Control+Shift+Z', app.redo],
     ]) {
       button.title = `${label} (${shortcut})`;
       button.setAttribute('aria-label', button.title);
       button.setAttribute('aria-keyshortcuts', ariaShortcut);
       button.addEventListener('click', action);
     }

     const continuousInput = target => target?.matches?.('.editor input:not([type="checkbox"]):not([type="file"]), .editor textarea')
       && target.id !== 'regulatorySignSearch';
     document.addEventListener('input', event => {
       if (continuousInput(event.target)) beginChange(event.target);
     }, true);
     document.addEventListener('change', event => {
       if (event.target === editingInput) finishChange();
     });
     document.addEventListener('focusout', event => {
       if (event.target === editingInput) finishChange();
     });
     document.addEventListener('pointerdown', event => {
       if (event.target !== editingInput) finishChange();
     }, true);
     document.addEventListener('click', event => {
       if (event.target !== editingInput) finishChange();
     }, true);

     document.addEventListener('keydown', event => {
       if (event.defaultPrevented || event.isComposing || event.altKey) return;
       if (isMac ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey) return;
       const key = event.key.toLowerCase();
       const undo = key === 'z' && !event.shiftKey;
       const redo = key === 'z' && event.shiftKey || !isMac && key === 'y' && !event.shiftKey;
       if (!undo && !redo) return;
       // Dialog fields retain their native text undo while the picker is open.
       if (document.querySelector('dialog[open]') || event.target?.closest?.('[contenteditable="true"]')) return;
       event.preventDefault();
       event.stopPropagation();
       if (undo) app.undo();
       else app.redo();
     }, true);
     updateButtons();
   };
 })();
