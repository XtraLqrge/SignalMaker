(() => {
  const app = window.SignalMaker;
  const mime = 'application/x-signalmaker-head+json';
  const placement = ['armPosition', 'poleHeight', 'poleMounted', 'poleMounting', 'poleMountSide', 'spanPole'];

  function createHeadClipboard(project) {
    let data = null;
    const selected = () => project.heads.find(head => head.id === project.selectedId);
    function decode(text) {
      if (typeof text !== 'string' || text.length > 64000) return null;
      try {
        const value = JSON.parse(text);
        if (value.application !== 'SignalMaker' || value.kind !== 'head' || value.version !== 1
          || !Array.isArray(value.head?.indications) || !value.head.indications.length || value.head.indications.length > 5) return null;
        // Use the same validation and fresh head/indication IDs as project load.
        const head = app.restoreProject(JSON.stringify({ version: 1, support: project.support, heads: [value.head] })).heads[0];
        return head ? { head, sourceId: value.head.id } : null;
      } catch { return null; }
    }
    function copy() {
      const head = selected();
      if (!head) return null;
      data = JSON.stringify({ application: 'SignalMaker', kind: 'head', version: 1, head });
      return data;
    }
    function cut() {
      const head = selected();
      if (!head || !copy()) return false;
      project.heads.splice(project.heads.indexOf(head), 1);
      project.selectedId = null;
      return true;
    }
    function paste(text = data) {
      const incoming = decode(text);
      if (!incoming) return null;
      const { head, sourceId } = incoming;
      const target = selected();
      if (target && target.id !== sourceId) {
        for (const field of placement) {
          if (target[field] !== undefined) head[field] = target[field];
          else delete head[field];
        }
        head.id = target.id;
        head.name = target.name;
        project.heads.splice(project.heads.indexOf(target), 1, head);
      } else {
        let number = 1;
        while (project.heads.some(item => item.name === `Head ${number}`)) number++;
        head.name = `Head ${number}`;
        app.placeNewHead(project, head);
        project.heads.push(head);
      }
      project.selectedId = head.id;
      data = text;
      return head;
    }
    return { copy, cut, paste, selected, get data() { return data; } };
  }

  function startHeadClipboard(project, { report }) {
    const clipboard = createHeadClipboard(project);
    let localOnly = false;
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);
    const buttons = [...document.querySelectorAll('[data-head-clipboard]')];
    function update() {
      for (const button of buttons) {
        const action = button.dataset.headClipboard;
        button.disabled = action === 'paste' ? !clipboard.data && !navigator.clipboard?.readText : !clipboard.selected();
        const key = { copy: 'C', cut: 'X', paste: 'V' }[action];
        button.title = `${action[0].toUpperCase() + action.slice(1)} head (${isMac ? '⌘' : 'Ctrl+'}${key})`;
        button.setAttribute('aria-keyshortcuts', `${isMac ? 'Meta' : 'Control'}+${key}`);
      }
    }
    function change(callback) {
      const run = () => {
        const result = callback();
        if (result) app.refresh();
        update();
        return result;
      };
      return app.runWithUndo ? app.runWithUndo(run) : run();
    }
    async function write(text, action) {
      localOnly = true;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          localOnly = false;
        }
      } catch {}
      update();
      report(`${action} head.${localOnly ? ' Ready to paste within SignalMaker.' : ''}`);
    }
    async function buttonAction(action) {
      if (action === 'copy' || action === 'cut') {
        const text = clipboard.copy();
        if (!text) return;
        if (action === 'cut') change(() => clipboard.cut());
        await write(text, action === 'cut' ? 'Cut' : 'Copied');
        return;
      }
      const selection = project.selectedId, assembly = project.mastArmId;
      let text = clipboard.data;
      if (!localOnly && navigator.clipboard?.readText) {
        try { text = await navigator.clipboard.readText(); } catch {}
      }
      if (selection !== project.selectedId || assembly !== project.mastArmId) {
        report('Paste canceled because the selection changed.');
        return;
      }
      const target = clipboard.selected();
      const head = change(() => clipboard.paste(text));
      report(head ? head.id === target?.id ? 'Selected head replaced.' : 'Head pasted.' : 'Copy a SignalMaker head first.');
    }
    const editingText = event => Boolean(document.querySelector('dialog[open]')
      || event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
    for (const type of ['copy', 'cut']) document.addEventListener(type, event => {
      if (event.defaultPrevented || editingText(event) || window.getSelection?.()?.toString() || !event.clipboardData) return;
      const text = clipboard.copy();
      if (!text) return;
      try { event.clipboardData.setData('text/plain', text); } catch { return; }
      try { event.clipboardData.setData(mime, text); } catch {}
      event.preventDefault();
      localOnly = false;
      if (type === 'cut') change(() => clipboard.cut());
      update();
      report(type === 'cut' ? 'Head cut.' : 'Head copied.');
    });
    document.addEventListener('paste', event => {
      if (event.defaultPrevented || editingText(event) || !event.clipboardData) return;
      const text = event.clipboardData.getData(mime) || event.clipboardData.getData('text/plain');
      const target = clipboard.selected();
      const head = change(() => clipboard.paste(text));
      if (!head) return;
      event.preventDefault();
      report(head.id === target?.id ? 'Selected head replaced.' : 'Head pasted.');
    });
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-head-clipboard]');
      if (button) { if (!button.disabled) void buttonAction(button.dataset.headClipboard); return; }
      // Only an explicitly selected head is a paste target. Signs, supports,
      // and empty canvas deselect it without creating a drawing history step.
      const stage = document.getElementById('previewStage');
      const inStage = stage.contains(event.target) || event.composedPath?.().includes(stage);
      if (inStage && !event.target.closest('[data-head-id], [data-head-action]')
        && project.selectedId !== null) {
        project.selectedId = null;
        app.refresh();
      }
    });
    const previousChanged = app.onDrawingChanged;
    app.onDrawingChanged = () => { previousChanged?.(); update(); };
    update();
    app.headClipboard = clipboard;
    return clipboard;
  }

  Object.assign(app, { createHeadClipboard, startHeadClipboard });
})();
