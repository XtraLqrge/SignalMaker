 (() => {
   const root = document.documentElement;
   const prefersDarkScheme = typeof window.matchMedia === 'function'
     ? window.matchMedia('(prefers-color-scheme: dark)') : null;
   let userThemeOverride = false;
   const getSystemTheme = () => prefersDarkScheme?.matches ? 'dark' : 'light';
   root.dataset.theme = getSystemTheme();

   document.addEventListener("DOMContentLoaded", () => {
     const toolbar = document.getElementById("configBar");
     const buttons = [...toolbar.querySelectorAll("[data-editor]")];
     const copyMenu = document.getElementById('copyHeadContextMenu');
     const copyButton = document.getElementById('copy');

     const popovers = ['headsMenu', 'mastArmsMenu'].map(id => ({
       menu: document.getElementById(id), button: buttons.find(button => button.dataset.editor === id),
     }));
     function positionHeads() {
       for (const { menu, button } of popovers) {
         if (menu.hidden) continue;
         const anchor = button.getBoundingClientRect();
         const bar = toolbar.getBoundingClientRect();
         menu.style.left = `${Math.max(10, Math.min(anchor.left, window.innerWidth - menu.offsetWidth - 10))}px`;
         menu.style.bottom = `${window.innerHeight - bar.top + 10}px`;
       }
     }

     function showEditor(id) {
       window.SignalMaker.setSignEditorMode?.(id);
       buttons.forEach(button => {
         const selected = button.dataset.editor === id;
         button.classList.toggle("selected", selected);
         button.setAttribute("aria-expanded", String(selected));
         document.getElementById(button.dataset.editor).hidden = !selected;
       });
       positionHeads();
       window.SignalMaker.fitPreview?.();
     }

     buttons.forEach(button => {
       button.addEventListener("click", () => {
         showEditor(button.getAttribute("aria-expanded") === "true" ? null : button.dataset.editor);
       });
     });

     document.addEventListener("click", event => {
       if (popovers.some(({ menu, button }) => !menu.hidden && !menu.contains(event.target) && !button.contains(event.target))) {
         showEditor(null);
       }
     });
     document.addEventListener("keydown", event => {
       if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
       if (!copyMenu.hidden) { closeCopyMenu(true); return; }
       const activeButton = buttons.find(button => button.getAttribute("aria-expanded") === "true");
       showEditor(null);
       activeButton?.focus();
     });
     window.addEventListener("resize", positionHeads);
     toolbar.addEventListener("scroll", positionHeads);

     const darkMode = document.getElementById("darkMode");
     function updateDarkMode() {
       const dark = root.dataset.theme === "dark";
       darkMode.setAttribute("aria-pressed", String(dark));
       darkMode.title = dark ? "Light mode" : "Dark mode";
       darkMode.querySelector("span").textContent = dark ? "light_mode" : "dark_mode";
     }
     function applyTheme(theme) {
       root.dataset.theme = theme;
       updateDarkMode();
     }
     function syncThemeWithSystem() {
       const systemTheme = getSystemTheme();
       if (!userThemeOverride) applyTheme(systemTheme);
       else if (root.dataset.theme === systemTheme) userThemeOverride = false;
     }
     darkMode.addEventListener("click", () => {
       const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
       applyTheme(nextTheme);
       userThemeOverride = nextTheme !== getSystemTheme();
     });
     syncThemeWithSystem();
     if (typeof prefersDarkScheme?.addEventListener === 'function') {
       prefersDarkScheme.addEventListener('change', syncThemeWithSystem);
     } else if (typeof prefersDarkScheme?.addListener === 'function') {
       prefersDarkScheme.addListener(syncThemeWithSystem);
     }

     const app = window.SignalMaker;
     const project = app.startHeads({ showEditor, positionHeads });
     app.startStreetSigns({ project, showEditor });
     const status = document.getElementById('actionStatus');
     let statusTimeout;
     function report(message) {
       clearTimeout(statusTimeout);
       status.textContent = message;
       statusTimeout = setTimeout(() => { status.textContent = ''; }, 5000);
     }

     app.startHistory(project, {
       report,
       onRestore: () => {
         closeCopyMenu();
         const sign = project.streetSigns.find(item => item.id === project.selectedStreetSignId);
         const signEditorOpen = buttons.some(button => button.getAttribute('aria-expanded') === 'true'
           && ['streetSignsEditor', 'regulatorySignsEditor'].includes(button.dataset.editor));
         if (sign && signEditorOpen) showEditor(app.isRegulatorySign(sign) ? 'regulatorySignsEditor' : 'streetSignsEditor');
         app.refresh();
         app.refreshStreetSignEditor(true);
       },
     });

     async function pngBlob(exportProject = project) {
       exportProject = structuredClone(exportProject);
       await document.fonts?.ready;
       const svg = await app.embedStreetSignFonts(app.renderSVG(exportProject), exportProject);
       const layout = app.scene(exportProject);
       const width = layout.width + 4;
       const height = layout.height + 4;
       const scale = Math.min(12, 8192 / width, 8192 / height, Math.sqrt(16000000 / (width * height)));
       const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
       try {
         const image = new Image();
         await new Promise((resolve, reject) => {
           image.onload = resolve;
           image.onerror = () => reject(new Error('Image rendering failed'));
           image.src = url;
         });
         const canvas = document.createElement('canvas');
         canvas.width = Math.ceil(width * scale);
         canvas.height = Math.ceil(height * scale);
         canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
         return await new Promise((resolve, reject) => canvas.toBlob(blob => {
           if (blob) resolve(blob);
           else reject(new Error('PNG generation failed'));
         }, 'image/png'));
       } finally { URL.revokeObjectURL(url); }
     }

     let preparedPNG;
     let prepareTimer;
     function drawingKey(exportProject) {
       return JSON.stringify(exportProject, (key, value) =>
         ['selectedId', 'selectedStreetSignId', 'selectedTextIndex'].includes(key) ? undefined : value);
     }
     function preparePNG(exportProject = project) {
       const key = drawingKey(exportProject);
       if (preparedPNG?.key === key) return preparedPNG;
       const entry = { key, blob: null, promise: pngBlob(exportProject) };
       preparedPNG = entry;
       entry.promise.then(blob => { entry.blob = blob; }).catch(() => {
         if (preparedPNG === entry) preparedPNG = null;
       });
       return entry;
     }
     app.onDrawingChanged = () => {
       clearTimeout(prepareTimer);
       if (!app.hasDrawing(project) || preparedPNG?.key === drawingKey(project)) return;
       prepareTimer = setTimeout(() => preparePNG(), 350);
     };
     app.onDrawingChanged();

     let copyRestoreTimer;
     function setCopyButtonState(state = 'idle') {
       clearTimeout(copyRestoreTimer);
       const states = {
         idle: ['content_copy', 'Copy signal as PNG'],
         copying: ['hourglass_empty', 'Copying...'],
         copied: ['check', 'Copied'],
         downloaded: ['download_done', 'Downloaded PNG'],
         error: ['error', 'Copy Failed'],
       };
       const [icon, title] = states[state];
       copyButton.dataset.copying = String(state === 'copying');
       copyButton.disabled = state === 'copying' || !app.hasDrawing(project);
       copyButton.setAttribute('aria-busy', String(state === 'copying'));
       copyButton.classList.toggle('activated', ['copied', 'downloaded'].includes(state));
       copyButton.title = title;
       copyButton.querySelector('.material-symbols-outlined').textContent = icon;
       if (['copied', 'downloaded', 'error'].includes(state)) {
         copyRestoreTimer = setTimeout(() => setCopyButtonState(), state === 'copied' ? 1400 : 1800);
       }
     }

     function downloadBlob(blob) {
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = 'SignalMaker.png';
       link.click();
       setTimeout(() => URL.revokeObjectURL(url), 1000);
     }

     async function copySignal(exportProject = project) {
       if (copyButton.dataset.copying === 'true' || !app.hasDrawing(exportProject)) return;
       setCopyButtonState('copying');
       const entry = preparePNG(exportProject);
       try {
         if (navigator.clipboard?.write && window.ClipboardItem) {
           await navigator.clipboard.write([new ClipboardItem({ 'image/png': entry.blob ?? entry.promise })]);
           setCopyButtonState('copied');
           report('Signal image copied.');
         } else {
           downloadBlob(await entry.promise);
           setCopyButtonState('downloaded');
           report('Image copying is unavailable in this browser. PNG downloaded.');
         }
       } catch (error) {
         app.lastCopyError = { name: error?.name, message: error?.message };
         try {
           downloadBlob(await entry.promise);
           setCopyButtonState('downloaded');
           report('The browser could not copy to the clipboard. PNG downloaded.');
         } catch (renderError) {
           setCopyButtonState('error');
           report(`Could not render the image: ${renderError?.message || 'PNG generation failed'}.`);
         }
       }
 // in #sm-links
 // in #sm-links
     }

     function closeCopyMenu(restoreFocus = false) {
       copyMenu.hidden = true;
       copyMenu.replaceChildren();
       if (restoreFocus) copyButton.focus({ preventScroll: true });
     }

function openCopyMenu(event) {
  event.preventDefault();
  closeCopyMenu();
  if (!project.heads.length || copyButton.dataset.copying === 'true') return;
  project.heads.forEach(head => {
    const item = document.createElement('li');
    item.setAttribute('role', 'presentation');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'menuitem');
    button.textContent = app.displayName(head);
    button.addEventListener('click', () => {
      closeCopyMenu(true);
      copySignal({ ...project, mastArms: [], activeMastArm: 0, support: { ...project.support, type: 'none' }, heads: [head], streetSigns: [] });
    });
    item.append(button);
    copyMenu.append(item);
  });
  copyMenu.hidden = false;
  const margin = 4;
  const rect = copyMenu.getBoundingClientRect();
  const anchor = copyButton.getBoundingClientRect();
  const x = event.clientX || anchor.left;
  const y = event.clientY || anchor.top;
  copyMenu.style.left = `${Math.min(Math.max(x, margin), Math.max(margin, innerWidth - rect.width - margin))}px`;
  copyMenu.style.top = `${Math.min(Math.max(y, margin), Math.max(margin, innerHeight - rect.height - margin))}px`;
  copyMenu.querySelector('button')?.focus({ preventScroll: true });
}

     copyButton.addEventListener('click', () => { closeCopyMenu(); copySignal(); });
     copyButton.addEventListener('contextmenu', openCopyMenu);
     copyButton.addEventListener('keydown', event => {
       if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) openCopyMenu(event);
     });
     document.addEventListener('pointerdown', event => {
       if (!copyMenu.hidden && !copyMenu.contains(event.target) && !copyButton.contains(event.target)) closeCopyMenu();
     });
     window.addEventListener('resize', () => closeCopyMenu());
     window.addEventListener('scroll', () => closeCopyMenu(), true);
     copyMenu.addEventListener('keydown', event => {
       if (event.key === 'Tab') { closeCopyMenu(true); return; }
       if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
       event.preventDefault();
       const items = [...copyMenu.querySelectorAll('button')];
       const index = items.indexOf(document.activeElement);
       const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
         : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
       items[next]?.focus();
     });
     document.getElementById('clearAll').addEventListener('click', () => {
       closeCopyMenu();
       showEditor(null);
       Object.assign(project, app.restoreProject(null));
       app.refresh();
       report('All signals, signs, and supports cleared.');
     });
     document.getElementById('download').addEventListener('click', async () => {
       try {
         downloadBlob(await preparePNG().promise);
         report('Signal image downloaded.');
       } catch { report('Could not download the image. Try again.'); }
     });
     app.startHeadClipboard(project, { report });
     app.startTemplates({ project, showEditor, report });
   });
 })();
