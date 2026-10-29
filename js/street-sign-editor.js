// SignMaker v2.2's native Panel Style and Control Text controls (GPL-3.0).
(() => {
  const app = window.SignalMaker;
  const controlTemplate = `<div data-property="sdCtrlText" class="">
                  <label for="streetText_textContent">Content:</label>
                  <input type="text" id="streetText_textContent" data-text-field="textContent" class="sdTextEditorWide" placeholder="Street Name"
                    value="Street Name" />
                  <br />
                  <label for="streetText_arrow">Arrow:</label>
                  <select id="streetText_arrow" data-text-field="arrow"><option value="none">None</option><option value="TYPE_D">Type D</option><option value="TYPE_A">Type A</option></select>
                  <label for="streetText_arrowSide">Arrow Side:</label>
                  <select id="streetText_arrowSide" data-text-field="arrowSide"><option value="left">Left</option><option value="right">Right</option></select>
                  <br />
                  <label for="streetText_backgroundColor">BG:</label>
                  <select id="streetText_backgroundColor" data-text-field="backgroundColor"></select>
                  <label for="streetText_textColor">Text:</label>
                  <select id="streetText_textColor" data-text-field="textColor"></select>
                  <label for="streetText_fontFamily">Font:</label>
                  <select id="streetText_fontFamily" data-text-field="fontFamily"></select>
                  <br />
                  <label for="streetText_spacing"
                    data-toolTip="Spacing of the Control Text element on the left-right axis">Spacing:</label>
                  <input type="number" id="streetText_spacing" data-text-field="spacing" placeholder="0" max="20" min="0" step="1" value="0" />
                  <label for="streetText_fontSize">Font Size (%):</label>
                  <input type="number" id="streetText_fontSize" data-text-field="fontSize" placeholder="200" max="500" min="50" step="1"
                    value="200" />
                  <br />
                  <label for="streetText_smallCapitals">Small Capitals:</label>
                  <input type="checkbox" id="streetText_smallCapitals" data-text-field="smallCapitals" />
                  <label for="streetText_alignment">Alignment: </label>
                  <select id="streetText_alignment" data-text-field="alignment"></select>
                  <label for="streetText_justification">Justification: </label>
                  <select id="streetText_justification" data-text-field="justification"></select>
                  <br />
                  <label for="streetText_lineHeight">Line Height (%): </label>
                  <input type="range" min="0" max="300" value="100" step="1" id="streetText_lineHeight" data-text-field="lineHeight" />
                  <input id="streetText_lineHeightVal" data-text-field="lineHeight" class="smallVal" type="number" value="100" />
                  <br />
                  <label for="streetText_useNumeralFormatting">Enlarge Numerals:</label>
                  <input type="checkbox" id="streetText_useNumeralFormatting" data-text-field="useNumeralFormatting" />
                  <input type="number" class="sdTextEditorSmall" hidden id="streetText_numeralFormattingSize" data-text-field="numeralFormattingSize"
                    data-toolTip="Relative Size (%)" placeholder="120" max="150" min="50" step="1" value="120" />
                  <label for="streetText_useBannerFormatting">Enlarge Banners:</label>
                  <input type="checkbox" id="streetText_useBannerFormatting" data-text-field="useBannerFormatting" />
                  <input type="number" class="sdTextEditorSmall" hidden id="streetText_bannerFormattingSize" data-text-field="bannerFormattingSize"
                    data-toolTip="Relative Size (%)" placeholder="100" max="150" min="50" step="1" value="100" />
                  <input type="number" class="sdTextEditorSmall" hidden id="streetText_bannerFirstLetterSize" data-text-field="bannerFirstLetterSize"
                    data-toolTip="First Letter Size (%)" placeholder="120" max="150" min="50" step="1" value="120" />
                </div>`;
  app.startStreetSigns = ({ project, showEditor }) => {
    const get = id => document.getElementById(id);
    const form = get('streetSignForm');
    const stage = get('previewStage');
    let regulatoryMode = false;
    const lastSelection = { street: null, regulatory: null };
    const visibleSigns = () => project.streetSigns.filter(sign => app.isRegulatorySign(sign) === regulatoryMode);
    const selected = () => visibleSigns().find(sign => sign.id === project.selectedStreetSignId);
    const editorFor = sign => app.isRegulatorySign(sign) ? 'regulatorySignsEditor' : 'streetSignsEditor';
    function setSignEditorMode(id) {
      if (!['streetSignsEditor', 'regulatorySignsEditor'].includes(id)) return;
      regulatoryMode = id === 'regulatorySignsEditor';
      const key = regulatoryMode ? 'regulatory' : 'street';
      const signs = visibleSigns();
      if (!signs.some(sign => sign.id === project.selectedStreetSignId)) {
        project.selectedStreetSignId = signs.find(sign => sign.id === lastSelection[key])?.id ?? signs[0]?.id ?? null;
      }
      if (get('signEditorContent').parentElement !== get(id)) get(id).append(get('signEditorContent'));
      get('addStreetSign').textContent = regulatoryMode ? 'Add Regulatory Sign' : 'Add Sign';
      get('blankoutSignActions').hidden = !regulatoryMode;
      get('regulatoryUploadStatus').hidden = !regulatoryMode;
      get('addStreetSign').dataset.streetAction = regulatoryMode ? 'add-regulatory' : 'add';
      get('streetSignsEmpty').textContent = regulatoryMode ? 'No regulatory signs yet.' : 'No street signs yet.';
      app.refresh(false);
    }
    const options = values => values.map(value => `<option value="${app.escape(value)}">${app.escape(value)}</option>`).join('');
    const select = (id, label, field, values) => `<div class="fieldRow"><label for="${id}">${label}</label><select id="${id}" data-street-field="${field}">${values.map(([value, name]) => `<option value="${value}">${name}</option>`).join('')}</select></div>`;
    const numeric = (id, label, field, value, max, step) => `<div class="fieldRow"><label for="${id}">${label}</label><input type="number" id="${id}" data-street-field="${field}" value="${value}" min="0" max="${max}" step="${step}" /></div>`;
    form.innerHTML = `<div class="fieldRow"><label for="streetSignName">Name:</label><input id="streetSignName" data-street-field="name" maxlength="80" /></div>
      <div id="regulatorySignOptions" hidden>
        <div class="fieldRow"><label for="regulatorySignChoose">Sign:</label><button type="button" id="regulatorySignChoose" aria-haspopup="dialog" aria-controls="regulatorySignPicker">Choose Sign...</button></div>
        <p id="regulatorySignCurrent">Current: None</p>
        <div class="fieldRow"><label for="regulatorySignSize">Size:</label><input type="range" id="regulatorySignSize" min="25" max="400" step="1" value="100" aria-label="Regulatory sign size" /></div>
        ${select('regulatorySignType', 'Sign Type:', 'signType', [['static', 'Static'], ['blank-out', 'Blank-out']])}
        <p id="blankoutAvailability" hidden>Blank-out is available for No Left Turn, No Right Turn, No Turn on Red, and Yield to Pedestrians.</p>
        ${select('regulatorySignDisplay', 'Display:', 'display', [['on', 'On'], ['off', 'Off']])}
      </div>
      ${select('streetSignMounting', 'Mounting:', 'mounting', [['free-swinging', 'Free swinging'], ['direct', 'Mast arm mounted'], ['mast', 'Mast mounted'], ['pedestal', 'Pedestal mounted']])}
      ${select('streetSignSpanSide', 'Signal Pole:', 'spanSide', [['left', 'Left'], ['right', 'Right']])}
      <div id="streetSignPositionOptions" class="fieldRow"><label for="streetSignPosition">Arm Position (ft):</label><div class="dimensionInputs"><input id="streetSignPosition" type="range" step="any" aria-label="Street sign position along mast arm in feet" /><input id="streetSignPositionValue" type="number" step="any" aria-label="Street sign position along mast arm in feet" /></div></div>
      <div id="streetSignAppearance"><hr />
      ${select('streetPanelColor', 'Panel Color:', 'color', Object.keys(app.streetPalette).map(value => [value, value]))}
      ${select('streetPanelCorner', 'Panel Corners:', 'corner', [['Sharp', 'Sharp'], ['Round', 'Round']])}
      ${numeric('streetPanelBorderRadius', 'Sign Border Radius (rem):', 'borderRadius', 0, 5, 0.05)}
      <details><summary>Padding</summary>
        ${['Top', 'Right', 'Bottom', 'Left'].map(side => numeric(`streetPadding${side}`, `Padding ${side}:`, `padding${side}`, ['Top', 'Bottom'].includes(side) ? 0.3 : 0.75, 20, 0.01)).join('')}
      </details>
      <hr /><h3>Icon</h3>
      <div class="headActions"><button id="chooseStreetSignIcon" type="button">Choose Icon</button><button id="uploadStreetSignIcon" type="button">Upload Icon</button><button id="removeStreetSignIcon" type="button">Remove Icon</button></div>
      <input id="streetSignIconFile" type="file" accept="image/*,.svg" aria-label="Upload street sign icon" hidden />
      <p id="streetSignIconStatus" role="status"></p>
      ${select('streetSignIconSide', 'Icon Side:', 'iconSide', [['left', 'Left'], ['right', 'Right']])}
      <div id="streetIconStyleOptions">
      <div class="fieldRow"><label for="streetIconSize">Icon Size (%):</label><div class="dimensionInputs"><input id="streetIconSize" type="range" min="25" max="300" step="5" value="100" data-street-field="iconSize" aria-label="Icon size percent"/><input id="streetIconSizeValue" type="number" min="25" max="300" step="5" value="100" data-street-field="iconSize" aria-label="Icon size percent"/></div></div>
      ${select('streetIconBackground', 'BG Color:', 'iconBackground', ['Transparent', ...Object.keys(app.streetPalette)].map(value => [value, value]))}
      ${select('streetIconCorners', 'Corners:', 'iconCorners', [['Sharp', 'Sharp'], ['Round', 'Round']])}
      <div class="fieldRow"><label for="streetIconPadding">BG Padding (in):</label><div class="dimensionInputs"><input id="streetIconPadding" type="range" min="0" max="6" step="0.25" value="0" data-street-field="iconBackgroundPadding" aria-label="Icon background padding in inches"/><input id="streetIconPaddingValue" type="number" min="0" max="6" step="0.25" value="0" data-street-field="iconBackgroundPadding" aria-label="Icon background padding in inches"/></div></div>
      <div class="fieldRow"><label for="streetIconSquare">Square Aspect:</label><input id="streetIconSquare" type="checkbox" data-street-field="iconSquare"/></div>
      <div class="fieldRow"><label for="streetIconExtend">White to Edges:</label><input id="streetIconExtend" type="checkbox" data-street-field="iconExtendBackground" title="Extend a square white background to the sign's top, bottom, and outer side"/></div>
      </div>
      <hr /><h3>Control Text</h3>
      <div class="fieldRow"><label for="streetElementSelection">Text Element:</label><select id="streetElementSelection" aria-label="Text element on the selected row"></select></div>
      <div id="streetScriptSideRow" class="fieldRow" hidden><label for="streetText_scriptSide">Position:</label><select id="streetText_scriptSide" data-text-field="scriptSide" aria-label="Superscript or subscript position"><option value="left">Left</option><option value="right">Right</option></select></div>
      <div id="streetAffixSideRow" class="fieldRow" hidden><label for="streetText_affixSide">Position:</label><select id="streetText_affixSide" data-text-field="affixSide" aria-label="Prefix or suffix position"><option value="left">Left</option><option value="right">Right</option></select></div>
      <div class="headActions"><button type="button" data-street-element-action="prefix">Add Prefix</button><button type="button" data-street-element-action="suffix">Add Suffix</button></div>
      <div class="headActions"><button type="button" data-street-element-action="superscript">Add Superscript</button><button type="button" data-street-element-action="subscript">Add Subscript</button><button id="deleteStreetElement" type="button" data-street-element-action="remove">Delete Element</button></div>
      <div class="headActions"><button type="button" data-street-text-action="add">New</button><button type="button" data-street-text-action="duplicate">Duplicate</button><button id="deleteStreetText" type="button" data-street-text-action="remove">Delete Selected</button></div>
      <div id="streetTextSelectionRow" class="fieldRow"><label for="streetTextSelection">Text Row:</label><select id="streetTextSelection"></select></div>
      <div class="streetTextProperties">${controlTemplate}</div>
      <div class="fieldRow"><label for="streetText_arrowSize">Arrow Size (%):</label><div class="dimensionInputs"><input id="streetText_arrowSize" type="range" min="25" max="300" step="5" value="100" data-text-field="arrowSize" aria-label="Arrow size percent"/><input id="streetText_arrowSizeValue" type="number" min="25" max="300" step="5" value="100" data-text-field="arrowSize" aria-label="Arrow size percent"/></div></div></div>`;
    form.addEventListener('submit', event => event.preventDefault());
    const mountingPicker = app.createNativeSelectPicker(get('streetSignMounting'), 'Mounting');
    const properties = form.querySelector('[data-property="sdCtrlText"]');
    [...properties.querySelectorAll('label')].forEach(label => {
      const row = document.createElement('div');
      row.className = 'fieldRow';
      const input = get(label.htmlFor);
      row.append(label, input);
      if (input.id === 'streetText_lineHeight') {
        const pair = document.createElement('div');
        pair.className = 'dimensionInputs';
        pair.append(input, get('streetText_lineHeightVal'));
        row.append(pair);
      }
      properties.append(row);
    });
    properties.querySelectorAll('br').forEach(element => element.remove());
    for (const [id, label, owner] of [
      ['numeralFormattingSize', 'Numeral size (%)', 'useNumeralFormatting'],
      ['bannerFormattingSize', 'Banner size (%)', 'useBannerFormatting'],
      ['bannerFirstLetterSize', 'Banner first letter size (%)', 'useBannerFormatting'],
    ]) {
      const input = get(`streetText_${id}`);
      input.setAttribute('aria-label', label);
      get(`streetText_${owner}`).parentElement.append(input);
    }
    get('streetText_lineHeightVal').setAttribute('aria-label', 'Control text line height (%)');
    const textChoices = { fontFamily: app.streetFonts, backgroundColor: ['Inherit', ...Object.keys(app.streetPalette)],
      textColor: ['Match BG', ...Object.keys(app.streetPalette)], alignment: ['Left', 'Center', 'Right'], justification: ['Left', 'Center', 'Right'] };
    for (const [key, values] of Object.entries(textChoices)) get(`streetText_${key}`).innerHTML = options(values);
    // Retain the native palette order and values, with SignMaker's swatches.
    const colorForValue = value => {
      const sign = selected();
      if (value === 'Inherit') return app.streetPalette[sign?.color];
      if (value === 'Match BG' && sign) {
        const text = app.selectedStreetText(sign.texts[sign.selectedTextIndex]);
        const background = text.backgroundColor === 'Inherit' ? sign.color : text.backgroundColor;
        return ['White', 'Yellow', 'Orange', 'Fluorescent Pink', 'Fluorescent Yellow-Green'].includes(background) ? '#000000' : '#ffffff';
      }
      return app.streetPalette[value];
    };
    const colorPickers = [
      ['streetPanelColor', 'Panel color'], ['streetIconBackground', 'Icon background color'],
      ['streetText_backgroundColor', 'Text background color'], ['streetText_textColor', 'Text color'],
    ].map(([id, label]) => app.createNativeSelectPicker(get(id), label, { colorForValue, minMenuWidth: 230 }));
    const fontPicker = app.createNativeSelectPicker(get('streetText_fontFamily'), 'Font', {
      minMenuWidth: 230,
      // SignMaker previews Clearview's B/W variants against the menu theme,
      // and enlarges Highway Gothic names to account for their cap height.
      textStyleForValue: value => {
        const background = document.documentElement.dataset.theme === 'light' ? 'White' : 'Black';
        const font = app.streetFont({ fontFamily: value || 'Series EM', backgroundColor: background }, { color: background });
        return { fontFamily: `"${font}", sans-serif`, fontSize: value?.startsWith('Series ') ? '120%' : '100%' };
      },
    });
    new MutationObserver(() => fontPicker.sync()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    get('streetText_lineHeightVal').min = 0;
    get('streetText_lineHeightVal').max = 300;
    get('streetText_lineHeightVal').step = 1;
    let suppressClickUntil = 0;
    let drag = null;
    let pendingTextClick = null;
    const loadedFonts = new Set();
    const iconUploads = new WeakMap();
    app.startStreetIconPicker({ project, selected, iconUploads });
    // SignMaker v2.2 iconSelectorModal / populateGrid pattern (GPL-3.0).
    const picker = get('regulatorySignPicker');
    const signGrid = get('regulatorySignGrid');
    let pickerSignId = null;
    function regulatoryOptions() {
      const query = get('regulatorySignSearch').value.trim().toLowerCase().replace(/\bpeds\b/g, 'pedestrians');
      const custom = [...new Map(project.streetSigns.filter(sign => sign.regulatoryImage).map(sign =>
        [sign.regulatoryImage.src, { id: `custom-${sign.id}`, ...app.regulatoryDesign(sign), image: sign.regulatoryImage }])).values()];
      const matches = [...(app.regulatoryCatalog ?? []), ...custom].filter(entry => (!app.isBlankOut(selected() ?? {}) || app.canBlankOut({ regulatoryCode: entry.id })) && `${entry.code} ${entry.name}`.toLowerCase().includes(query));
      signGrid.replaceChildren();
      for (const entry of matches) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'iconGridItem';
        item.dataset.regulatoryDesign = entry.id;
        const name = app.isBlankOut(selected() ?? {}) ? app.regulatoryBlankoutLabels[entry.id] : entry.name;
        const label = `${entry.code} — ${name}`;
        item.setAttribute('aria-label', label);
        item.setAttribute('aria-pressed', String(entry.image ? entry.image.src === selected()?.regulatoryImage?.src : !selected()?.regulatoryImage && entry.id === selected()?.regulatoryCode));
        item.title = label;
        const img = document.createElement('img');
        img.src = app.isBlankOut(selected() ?? {}) ? app.regulatoryBlankoutData[entry.id] : entry.image?.src ?? app.regulatoryPNGData[entry.id];
        img.loading = 'lazy';
        img.alt = '';
        item.append(img);
        item.addEventListener('click', () => {
          const sign = project.streetSigns.find(sign => sign.id === pickerSignId);
          if (sign && app.isRegulatorySign(sign)) {
            if (entry.image) {
              sign.regulatoryImage = structuredClone(entry.image);
              delete sign.regulatoryCode;
              sign.signType = 'static';
            } else {
              sign.regulatoryCode = entry.id;
              delete sign.regulatoryImage;
            }
            app.refresh(false);
// in #sm-links
// in #sm-links
          }
          picker.close();
        });
        signGrid.append(item);
      }
      get('regulatorySearchStatus').textContent = matches.length ? `${matches.length} matching signs` : 'No matching signs.';
    }
    get('regulatorySignChoose').addEventListener('click', () => {
      if (!app.isRegulatorySign(selected() ?? {})) return;
      pickerSignId = selected().id;
      get('regulatorySignPickerTitle').textContent = app.isBlankOut(selected()) ? 'Select a Blank-out Sign' : 'Select a Regulatory Sign';
      get('regulatorySignSearch').value = '';
      get('uploadRegulatorySignPicker').hidden = app.isBlankOut(selected());
      regulatoryOptions();
      signGrid.scrollTop = 0;
      picker.showModal();
      get('regulatorySignSearch').focus();
    });
    get('closeRegulatorySignPicker').addEventListener('click', () => picker.close());
    picker.addEventListener('close', () => {
      pickerSignId = null;
      get('regulatorySignChoose').focus({ preventScroll: true });
    });
    get('regulatorySignSearch').addEventListener('input', regulatoryOptions);
    function refreshEditor(updateActiveText = false) {
      const sign = selected();
      const selectInput = get('streetSignSelection');
      const entries = visibleSigns().map(item => `<option value="${item.id}">${app.escape(item.name.trim() || 'Untitled street sign')}</option>`).join('');
      if (selectInput.innerHTML !== entries) selectInput.innerHTML = entries;
      selectInput.value = sign?.id ?? '';
      selectInput.disabled = !sign;
      form.hidden = !sign;
      get('streetSignsEmpty').hidden = Boolean(sign);
      for (const id of ['duplicateStreetSign', 'removeStreetSign']) get(id).disabled = !sign;
      if (!sign) { mountingPicker.close(); fontPicker.close(); colorPickers.forEach(picker => picker.close()); return; }
      lastSelection[regulatoryMode ? 'regulatory' : 'street'] = sign.id;
      const span = app.hasSpan(project);
      const regulatory = app.isRegulatorySign(sign);
      get('regulatorySignOptions').hidden = !regulatory;
      get('streetSignAppearance').hidden = regulatory;
      if (regulatory) {
        const design = app.regulatoryDesign(sign);
        get('regulatorySignCurrent').textContent = `Current: ${design.code} — ${app.isBlankOut(sign) ? app.regulatoryBlankoutLabels[sign.regulatoryCode] : design.name}`;
        const size = get('regulatorySignSize');
        if (document.activeElement !== size) size.value = (sign.regulatoryScale ?? 1) * 100;
        size.setAttribute('aria-valuetext', `${size.value}%`);
        get('regulatorySignType').querySelector('[value="blank-out"]').disabled = !app.canBlankOut(sign);
        get('blankoutAvailability').hidden = app.canBlankOut(sign);
        get('regulatorySignDisplay').parentElement.hidden = !app.isBlankOut(sign);
      }
      form.querySelectorAll('[data-street-field]').forEach(input => {
        if (input.type === 'checkbox') { input.checked = Boolean(sign[input.dataset.streetField]); return; }
        if (document.activeElement !== input) input.value = span && input.dataset.streetField === 'mounting' ? 'free-swinging' : sign[input.dataset.streetField] ?? ({ signType: 'static', display: 'on' }[input.dataset.streetField] ?? '');
      });
      get('streetSignMounting').querySelector('[value="pedestal"]').disabled = !app.hasPedestal(project);
      get('streetSignMounting').disabled = span || app.hasPedestal(project);
      if (app.hasPedestal(project)) get('streetSignMounting').value = 'pedestal';
      mountingPicker.sync();
      get('streetSignSpanSide').parentElement.hidden = !span || regulatory;
      get('streetSignPositionOptions').hidden = !app.signCanMove(sign, project.support);
      const poleMounted = app.isPoleMountedSign(sign, project.support);
      get('streetSignPositionOptions').querySelector('label').textContent = poleMounted ? app.hasPedestal(project) ? 'Mount Height (ft):' : 'Mast Height (ft):' : span ? 'Span Position (ft):' : 'Arm Position (ft):';
      get('streetIconStyleOptions').hidden = !sign.icon;
      get('streetIconPadding').disabled = get('streetIconPaddingValue').disabled = !sign.iconExtendBackground && sign.iconBackground === 'Transparent';
      get('streetIconBackground').disabled = get('streetIconCorners').disabled = get('streetIconSquare').disabled = Boolean(sign.iconExtendBackground);
      get('removeStreetSignIcon').disabled = !sign.icon && !iconUploads.has(sign);
      get('streetSignIconStatus').textContent = iconUploads.has(sign) ? 'Loading icon…' : sign.icon?.name ?? 'No icon';
      if (app.signCanMove(sign, project.support)) {
        const bounds = app.streetSignBounds(sign, project.support);
        for (const id of ['streetSignPosition', 'streetSignPositionValue']) {
          const input = get(id);
          input.min = bounds.min / 12;
          input.max = bounds.max / 12;
          input.setAttribute('aria-label', poleMounted ? 'Sign center height above grade in feet' : `Sign position along ${span ? 'span wire' : 'mast arm'} in feet`);
          if (document.activeElement !== input) input.value = Number((app.streetSignPosition(sign, project.support) / 12).toFixed(3));
        }
      }
      for (const item of project.streetSigns.filter(item => !app.isRegulatorySign(item))) for (const row of item.texts) for (const element of [row, ...app.streetTextChildren(row)]) {
        const font = app.streetFont(element, item);
        if (loadedFonts.has(font)) continue;
        loadedFonts.add(font);
        document.fonts?.load(`21px "${font}"`).then(() => { if (!drag) app.refresh(false); }).catch(() => {});
      }
      if (regulatory) { fontPicker.close(); colorPickers.forEach(picker => picker.close()); return; }
      const row = sign.texts[sign.selectedTextIndex];
      const text = app.selectedStreetText(row);
      const elementSelect = get('streetElementSelection');
      elementSelect.innerHTML = '<option value="0">Main text</option>' + app.streetTextChildren(row).map((element, index) => `<option value="${index + 1}">${element.affix ? element.affix === 'prefix' ? 'Prefix' : 'Suffix' : element.script === 'subscript' ? 'Subscript' : 'Superscript'}: ${app.escape(element.textContent.slice(0, 40))}</option>`).join('');
      elementSelect.value = row.selectedElementIndex ?? 0;
      get('deleteStreetElement').disabled = !row.selectedElementIndex;
      get('streetScriptSideRow').hidden = !text.script;
      get('streetAffixSideRow').hidden = !text.affix;
      form.querySelectorAll('[data-text-field]').forEach(input => {
        if (!updateActiveText && document.activeElement === input) return;
        if (input.type === 'checkbox') input.checked = text[input.dataset.textField];
        else input.value = text[input.dataset.textField];
      });
      for (const field of ['spacing', 'alignment', 'justification', 'lineHeight', 'arrow', 'arrowSide', 'arrowSize', 'backgroundColor']) {
        get(`streetText_${field}`)?.closest('.fieldRow')?.toggleAttribute('hidden', text !== row);
      }
      get('streetText_arrowSide').disabled = get('streetText_arrowSize').disabled = get('streetText_arrowSizeValue').disabled = text.arrow === 'none';
      get('streetText_numeralFormattingSize').hidden = !text.useNumeralFormatting;
      get('streetText_bannerFormattingSize').hidden = !text.useBannerFormatting;
      get('streetText_bannerFirstLetterSize').hidden = !text.useBannerFormatting;
      get('deleteStreetText').disabled = sign.texts.length <= 1;
      const list = get('streetTextSelection');
      const rows = sign.texts.map((text, index) => `<option value="${index}">${index + 1}. ${app.escape(text.textContent.slice(0, 60) || 'Empty text')}</option>`).join('');
      if (list.innerHTML !== rows) list.innerHTML = rows;
      list.value = sign.selectedTextIndex;
      get('streetTextSelectionRow').hidden = sign.texts.length <= 1;
      colorPickers.forEach(picker => picker.sync());
      fontPicker.sync();
    }
    function flash(id) {
      const element = stage.querySelector(`[data-street-sign-id="${id}"]`);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const host = stage.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.className = 'flash-selection';
      Object.assign(overlay.style, { left: `${rect.left - host.left}px`, top: `${rect.top - host.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      stage.append(overlay);
      setTimeout(() => overlay.remove(), 500);
    }
    function nextName(regulatory = false) {
      let number = 1;
      const prefix = regulatory ? 'Regulatory Sign' : 'Street Sign';
      while (project.streetSigns.some(sign => sign.name === `${prefix} ${number}`)) number++;
      return `${prefix} ${number}`;
    }
    get('streetSignSelection').addEventListener('change', event => {
      project.selectedStreetSignId = event.target.value;
      app.refresh(false);
      flash(project.selectedStreetSignId);
    });
    get('streetTextSelection').addEventListener('change', event => {
      const sign = selected();
      if (!sign) return;
      sign.selectedTextIndex = Number(event.target.value);
      app.refresh(false);
      refreshEditor(true);
    });
    // Reuse the native file-input/image-decoding upload convention (GPL-3.0).
    // Rasterize to a transparent PNG so preview, local restoration and export
    // use identical artwork, without external resources or uploaded markup.
    let regulatoryUploadTarget = null;
    let regulatoryUploadRequest = 0;
    const uploadStatus = message => {
      get('regulatoryUploadStatus').textContent = message;
      if (picker.open) get('regulatorySearchStatus').textContent = message;
    };
    get('uploadRegulatorySign').addEventListener('click', () => {
      regulatoryUploadTarget = null;
      get('regulatorySignFile').click();
    });
    get('uploadRegulatorySignPicker').addEventListener('click', () => {
      regulatoryUploadTarget = pickerSignId;
      get('regulatorySignFile').click();
    });
    get('regulatorySignFile').addEventListener('change', async event => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      const targetId = regulatoryUploadTarget;
      const request = ++regulatoryUploadRequest;
      uploadStatus('Loading sign…');
      if (file.size > 20 * 1024 * 1024) { uploadStatus('Choose an image smaller than 20 MB.'); return; }
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image');
        const canvas = document.createElement('canvas');
        let scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
        let src;
        do {
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          src = canvas.toDataURL('image/png');
          scale *= 0.75;
        } while (src.length > 512 * 1024 && Math.max(canvas.width, canvas.height) > 1);
        const artwork = app.restoreRegulatoryImage({ src, width: canvas.width, height: canvas.height, name: file.name });
        if (!artwork) throw new Error('Invalid image');
        if (request !== regulatoryUploadRequest) return;
        const target = targetId ? project.streetSigns.find(sign => sign.id === targetId) : null;
        if (targetId && !target) { uploadStatus('The sign was removed before the upload finished.'); return; }
        app.runWithUndo(() => {
          const sign = target ?? app.createStreetSign(nextName(true));
          sign.regulatoryImage = artwork;
          delete sign.regulatoryCode;
          sign.signType = 'static';
          if (!target) { sign.mounting = 'direct'; project.streetSigns.push(sign); }
          project.selectedStreetSignId = sign.id;
          app.ensureStreetSignPositions(project);
          if (picker.open) picker.close();
          showEditor('regulatorySignsEditor');
          app.refresh(false);
          flash(sign.id);
        });
        try {
          localStorage.setItem('signalmaker-project-v1', JSON.stringify(project));
          uploadStatus('Sign uploaded and saved locally.');
        } catch {
          uploadStatus('Sign uploaded. Browser storage is unavailable or full; it will not survive a reload.');
        }
      } catch {
        if (request === regulatoryUploadRequest) uploadStatus('Could not read that image. Try another image file.');
      } finally { URL.revokeObjectURL(url); }
    });
    get('uploadStreetSignIcon').addEventListener('click', () => get('streetSignIconFile').click());
    get('removeStreetSignIcon').addEventListener('click', () => {
      const sign = selected();
      if (!sign) return;
      iconUploads.delete(sign);
      sign.icon = null;
      app.refresh(false);
    });
    get('streetSignIconFile').addEventListener('change', async event => {
      const file = event.target.files[0];
      event.target.value = '';
      const sign = selected();
      if (!file || !sign) return;
      const request = {};
      iconUploads.set(sign, request);
      refreshEditor();
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image');
        const canvas = document.createElement('canvas');
        let scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
        let src;
        do {
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          src = canvas.toDataURL('image/png');
          scale *= 0.75;
        } while (src.length > 512 * 1024);
        if (!project.streetSigns.includes(sign) || iconUploads.get(sign) !== request) return;
        app.runWithUndo(() => {
          sign.icon = { src, width: canvas.width, height: canvas.height, name: file.name.slice(0, 160) };
          iconUploads.delete(sign);
          app.refresh(false);
          if (!app.rememberStreetIcon(sign.icon)) get('streetSignIconStatus').textContent += ' — Library storage is unavailable or full; icon retained for this session.';
        });
      } catch {
        if (iconUploads.get(sign) !== request) return;
        iconUploads.delete(sign);
        refreshEditor();
        if (selected() === sign) get('streetSignIconStatus').textContent = 'Could not read that image. Try another image file.';
      } finally { URL.revokeObjectURL(url); }
    });
    document.addEventListener('click', event => {
      const action = event.target.closest('[data-street-action]')?.dataset.streetAction;
      const sign = selected();
      if (action === 'add' || action === 'add-regulatory' || action === 'add-blankout' || action === 'duplicate' && sign) {
        const item = action === 'duplicate' ? structuredClone(sign) : app.createStreetSign();
        if (action === 'add-regulatory') Object.assign(item, { regulatoryCode: 'R3-5', mounting: 'direct' });
        if (action === 'add-blankout') Object.assign(item, { regulatoryCode: 'R3-1', signType: 'blank-out', display: 'on', mounting: 'direct' });
        item.id = app.createStreetSign().id;
        item.name = nextName(app.isRegulatorySign(item));
        get('regulatorySignSearch').value = '';
        if (action === 'duplicate') item.texts.forEach(text => { text.id = app.createStreetText().id; app.streetTextChildren(text).forEach(element => { element.id = app.createStreetText().id; }); });
        project.streetSigns.push(item);
        project.selectedStreetSignId = item.id;
        app.ensureStreetSignPositions(project);
        app.refresh(false);
        showEditor(editorFor(item));
        flash(item.id);
      } else if (action === 'remove' && sign) {
        const index = project.streetSigns.indexOf(sign);
        project.streetSigns.splice(index, 1);
        const remaining = visibleSigns();
        project.selectedStreetSignId = remaining[Math.min(index, remaining.length - 1)]?.id ?? null;
        app.refresh(false);
      }
      const preview = event.target.closest('[data-street-sign-id]');
      if (preview && Date.now() > suppressClickUntil) {
        const target = event.target.closest('[data-street-row-id]');
        const hit = target ? { rowId: target.dataset.streetRowId, elementId: target.dataset.streetElementId }
          : pendingTextClick?.signId === preview.dataset.streetSignId && Date.now() < pendingTextClick.until ? pendingTextClick.hit : null;
        pendingTextClick = null;
        project.selectedStreetSignId = preview.dataset.streetSignId;
        const sign = project.streetSigns.find(item => item.id === project.selectedStreetSignId);
        const textSelected = hit && app.selectStreetTextElement(sign, hit.rowId, hit.elementId);
        app.refresh(false);
        showEditor(editorFor(sign));
        refreshEditor(true);
        get(app.isRegulatorySign(sign) ? 'regulatorySignsTitle' : 'streetSignsTitle').focus();
        if (!textSelected) flash(project.selectedStreetSignId);
      }
    });
    form.addEventListener('click', event => {
      const sign = selected();
      if (!sign) return;
      const action = event.target.closest('[data-street-text-action]')?.dataset.streetTextAction;
      if (!action) return;
      const text = sign.texts[sign.selectedTextIndex];
      if (action === 'add' || action === 'duplicate') {
        const row = action === 'add' ? app.createStreetText() : structuredClone(text);
        if (action === 'duplicate') {
          row.id = app.createStreetText().id;
          app.streetTextChildren(row).forEach(element => { element.id = app.createStreetText().id; });
        }
        sign.texts.splice(sign.selectedTextIndex + 1, 0, row);
        sign.selectedTextIndex++;
      } else if (action === 'remove' && sign.texts.length > 1) {
        sign.texts.splice(sign.selectedTextIndex, 1);
        sign.selectedTextIndex = Math.min(sign.selectedTextIndex, sign.texts.length - 1);
      }
      app.refresh(false);
    });
    get('streetElementSelection').addEventListener('change', event => {
      const sign = selected();
      if (!sign) return;
      sign.texts[sign.selectedTextIndex].selectedElementIndex = Number(event.target.value);
      app.refresh(false);
    });
    form.addEventListener('click', event => {
      const action = event.target.closest('[data-street-element-action]')?.dataset.streetElementAction;
      const sign = selected();
      if (!action || !sign) return;
      const row = sign.texts[sign.selectedTextIndex];
      if (action === 'remove') { if (!app.removeStreetTextElement(row)) return; }
      else if (!app.addStreetTextElement(row, action, sign.texts)) return;
      app.refresh(false);
    });
    function edit(event) {
      const input = event.target;
      const sign = selected();
      if (!sign) return;
      if (input.id === 'regulatorySignSize') {
        if (!app.isRegulatorySign(sign) || input.value === '' || !input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
        sign.regulatoryScale = Math.max(0.25, Math.min(4, input.valueAsNumber / 100));
      } else if (['streetSignPosition', 'streetSignPositionValue'].includes(input.id)) {
        if (input.value !== '' && Number.isFinite(input.valueAsNumber)) app.setStreetSignPosition(sign, project.support, input.valueAsNumber * 12);
      } else {
        const field = input.dataset.streetField ?? input.dataset.textField;
        if (!field || input.type === 'number' && (input.value === '' || !input.validity.valid)) return;
        if (field === 'regulatoryCode' && !(app.regulatoryCatalog ?? []).some(entry => entry.id === input.value)) return;
        if (field === 'signType' && input.value === 'blank-out' && !app.canBlankOut(sign)) return;
        if (field === 'mounting' && app.hasSpan(project)) return;
        const target = input.dataset.streetField ? sign : app.selectedStreetText(sign.texts[sign.selectedTextIndex]);
        if (field === 'mounting' && input.value === 'mast' && target.mounting !== 'mast') target.armMounting = target.mounting;
        target[field] = input.type === 'checkbox' ? input.checked : ['number', 'range'].includes(input.type) ? Number(input.value) : input.value;
      }
      app.refresh(false);
    }
    form.addEventListener('input', edit);
    form.addEventListener('change', event => {
      if (event.target.tagName === 'SELECT') edit(event);
      refreshEditor();
    });
    stage.addEventListener('keydown', event => {
      const element = event.target.closest('[data-street-sign-id]');
      if (!element) return;
      if (['Enter', ' '].includes(event.key)) { event.preventDefault(); element.click(); }
      const sign = project.streetSigns.find(item => item.id === element.dataset.streetSignId);
      if (!sign || !app.signCanMove(sign, project.support)) return;
      const poleMounted = app.isPoleMountedSign(sign, project.support);
      if (!(poleMounted ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight']).includes(event.key)) return;
      event.preventDefault();
      const direction = poleMounted ? event.key === 'ArrowUp' ? 1 : -1
        : (event.key === 'ArrowRight' ? 1 : -1) * (app.hasMast(project) && project.support.side === 'left' ? -1 : 1);
      app.setStreetSignPosition(sign, project.support, app.streetSignPosition(sign, project.support) + direction * (event.shiftKey ? 12 : 3));
      app.refresh(false);
      stage.querySelector(`[data-street-sign-id="${sign.id}"]`)?.focus({ preventScroll: true });
    });
    stage.addEventListener('pointerdown', event => {
      pendingTextClick = null;
      const element = event.target.closest('[data-street-sign-id]');
      const sign = project.streetSigns.find(item => item.id === element?.dataset.streetSignId);
      if (!sign || !app.signCanMove(sign, project.support) || event.button !== 0) return;
      const rect = element.getBoundingClientRect();
      const textTarget = event.target.closest('[data-street-row-id]');
      drag = { element, id: element.dataset.streetSignId, pointerId: event.pointerId, x: event.clientX, y: event.clientY, rect,
vertical: app.isPoleMountedSign(sign, project.support), position: app.streetSignPosition(sign, project.support),
layout: app.scene(project), containerRect: get('headContainer').getBoundingClientRect() };
        layout: app.scene(project), containerRect: get('headContainer').getBoundingClientRect() };
      element.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointermove', event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.ghost && (app.hasMast(project) ? Math.hypot(dx, dy) : Math.abs(dx)) < 6) return;
      event.preventDefault();
      if (!drag.ghost) {
        app.streetSignDragging = true;
        stage.querySelectorAll('.flash-selection').forEach(element => element.remove());
        stage.querySelectorAll('.previewStreetSign').forEach(element => {
          element.classList.add('panelWiggle');
          element.style.setProperty('--wiggle-delay', `${Math.random() * 0.12}s`);
        });
        drag.element.classList.add('dragging');
        drag.ghost = drag.element.cloneNode(true);
        drag.ghost.className = 'dragGhost';
        drag.ghost.inert = true;
        drag.ghost.setAttribute('aria-hidden', 'true');
        Object.assign(drag.ghost.style, { top: `${drag.rect.top}px`, width: `${drag.rect.width}px`, height: `${drag.rect.height}px` });
        document.body.append(drag.ghost);
      }
      drag.ghost.style.left = `${drag.rect.left + dx}px`;
      drag.ghost.style.top = `${drag.rect.top + (app.hasMast(project) ? dy : 0)}px`;
    });
    function finishDrag(event, cancelled = false) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const state = drag;
      drag = null;
      // Pointer capture can retarget the subsequent click to the whole sign.
      // Retain the original text hit for an ordinary click or tap only.
      pendingTextClick = !cancelled && !state.ghost && state.textHit
        ? { signId: state.id, hit: state.textHit, until: Date.now() + 500 } : null;
      if (state.element.hasPointerCapture(state.pointerId)) state.element.releasePointerCapture(state.pointerId);
      if (state.ghost) {
        state.ghost.remove();
        if (!cancelled) {
          const scale = state.containerRect.width / state.layout.width;
          const sign = project.streetSigns.find(item => item.id === state.id);
          if (app.hasMast(project)) {
            const x = (state.rect.left + state.rect.width / 2 + event.clientX - state.x - state.containerRect.left) / scale;
            const y = (state.rect.top + state.rect.height / 2 + event.clientY - state.y - state.containerRect.top) / scale;
            app.dropMastElement(project, state.layout, sign, 'sign', x, y);
          } else {
            const position = app.streetSignDragPosition(sign, project.support, state.position, event.clientX - state.x, event.clientY - state.y, scale);
            app.setStreetSignPosition(sign, project.support, position);
          }
        }
        suppressClickUntil = Date.now() + 250;
      }
      app.streetSignDragging = false;
      if (state.ghost) app.refresh(false);
    }
    stage.addEventListener('pointerup', event => finishDrag(event));
    stage.addEventListener('pointercancel', event => finishDrag(event, true));
    stage.addEventListener('lostpointercapture', event => finishDrag(event, true));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && drag) finishDrag({ pointerId: drag.pointerId }, true); });
    app.refreshStreetSignEditor = refreshEditor;
    app.setSignEditorMode = setSignEditorMode;
    setSignEditorMode(editorFor(project.streetSigns.find(sign => sign.id === project.selectedStreetSignId) ?? {}));
  };
})();
