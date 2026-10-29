// Panel palette, type choices, text metrics and formatting adapted from SignMaker v2.2 (GPL-3.0).
(() => {
  const app = window.SignalMaker;
  const palette = { Green: '#005f4d', Blue: '#00437b', Brown: '#62331e', Yellow: '#fccf34', White: '#ffffff', Black: '#000000', Purple: '#4b0082', Orange: '#ff5904', Red: '#ff0000', 'Fluorescent Pink': '#ff33cc', 'Fluorescent Yellow-Green': '#99ff00' };
  // Exact SVG paths from SignMaker v2.2 img/arrowBlocks (GPL-3.0); originals
  // retained in assets/street-arrows. Rotate only, preserving artwork proportions.
  const streetArrows = {"TYPE_D": {"width": 641.0, "height": 1044.0, "path": "M202.043,1043.75l237.768,0l4.448,-565.97l128.724,44.095c41.034,13.065 81.846,-31.886 61.828,-63.038l-314.268,-458.837l-314.655,456.427c-21.898,31.636 21.725,77.052 57.952,65.448l137.724,-42.28l0.479,564.155Z"}, "TYPE_A": {"width": 2667.0, "height": 4188.0, "path": "M1025.35,1920.47l-91.84,2262.62l799.898,0.24l-91.569,-2262.69l902.465,200.126c119.17,28.112 144.584,-103.048 85.914,-201.067l-1200.25,-1868.46c-65.61,-83.82 -154.946,-54.666 -192.082,-1.317l-1190.48,1844.31c-66.473,106.434 -72.7,256.284 94.122,224.823l883.814,-198.577Z"}};
  const fonts = ['Clearview 1', 'Clearview 2', 'Clearview 3', 'Clearview 4', 'Clearview 5WR', 'Clearview 5', 'Clearview 6', 'Series B', 'Series C', 'Series D', 'Series E', 'Series EEM', 'Series EM', 'Series F', 'Arial', 'Arial Bold', 'Transport', 'Modern VMS'];
  const fontFiles = {};
  for (const series of ['B', 'C', 'D', 'E', 'EEM', 'EM', 'F']) fontFiles[`Series ${series}`] = `Roadgeek2014Series${series}.woff2`;
  ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].forEach((word, index) => {
    for (const variant of ['B', 'W']) fontFiles[`Clearview ${index + 1}${variant}`] = `ClearviewHwy-${word}-${variant}.woff2`;
  });
  Object.assign(fontFiles, { 'Clearview 5WR': 'ClearviewHwy-Five-W-R.woff2', Transport: 'Transport.woff2', 'Modern VMS': 'VCR_OSD_MONO.ttf' });
  const uid = () => window.crypto?.randomUUID?.() ?? `street-${Date.now()}-${Math.random()}`;
  const contrast = color => ['White', 'Yellow', 'Orange', 'Fluorescent Pink', 'Fluorescent Yellow-Green'].includes(color) ? '#000000' : '#ffffff';
  const number = (value, min, max, fallback) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  const choice = (value, choices, fallback) => choices.includes(value) ? value : fallback;
  const regulatoryById = new Map((app.regulatoryCatalog ?? []).map(entry => [entry.id, entry]));
  const regulatoryDesign = sign => sign.regulatoryImage
    ? { code: 'Custom', name: sign.regulatoryImage.name, width: sign.regulatoryImage.width, height: sign.regulatoryImage.height }
    : regulatoryById.get(sign.regulatoryCode);
  const isRegulatorySign = sign => Boolean(regulatoryDesign(sign));
  const canBlankOut = sign => !sign.regulatoryImage && Boolean(app.regulatoryBlankoutData?.[sign.regulatoryCode]);
  const isBlankOut = sign => sign.signType === 'blank-out' && canBlankOut(sign);
  const signCanMove = (sign, support) => support.type === 'mast-arm' || support.type === 'span-wire' && isRegulatorySign(sign);
  const isMastMountedSign = (sign, support) => support.type === 'mast-arm' && sign.mounting === 'mast';
  const signPositionKey = (sign, support) => isMastMountedSign(sign, support) ? 'poleHeight'
    : support.type === 'span-wire' && isRegulatorySign(sign) ? 'spanPosition' : 'armPosition';
  const streetSignPosition = (sign, support) => sign[signPositionKey(sign, support)];
  function createStreetText() {
    return { id: uid(), scriptElements: [], affixElements: [], selectedElementIndex: 0, textContent: 'Street Name', fontFamily: 'Series EM', fontSize: 200, lineHeight: 75,
      arrow: 'none', arrowSize: 100, arrowSide: 'left', backgroundColor: 'Inherit', textColor: 'Match BG', spacing: 0, smallCapitals: false, alignment: 'Center', justification: 'Center',
      useNumeralFormatting: false, numeralFormattingSize: 120, useBannerFormatting: false, bannerFormattingSize: 100, bannerFirstLetterSize: 120 };
  }
  const streetTextChildren = row => [...(row.scriptElements ?? []), ...(row.affixElements ?? [])];
  const selectedStreetText = row => streetTextChildren(row)[(row.selectedElementIndex ?? 0) - 1] ?? row;
  function selectStreetTextElement(sign, rowId, elementId) {
    const rowIndex = sign.texts.findIndex(row => row.id === rowId);
    if (rowIndex < 0) return false;
    const row = sign.texts[rowIndex];
    const childIndex = streetTextChildren(row).findIndex(element => element.id === elementId);
    if (elementId !== row.id && childIndex < 0) return false;
    sign.selectedTextIndex = rowIndex;
    row.selectedElementIndex = elementId === row.id ? 0 : childIndex + 1;
    return true;
  }
  function createStreetScript(row, script) {
    return { ...createStreetText(), textContent: 'St', scriptSide: 'right',
      fontFamily: row.fontFamily, fontSize: Math.max(50, row.fontSize * 0.6), textColor: row.textColor, script };
  }
  function createStreetAffix(row, affix, texts = [row]) {
    const side = affix === 'prefix' ? 'left' : 'right';
    const rowIndex = texts.indexOf(row);
    const nearby = rowIndex < 0 ? [{ text: row, distance: 0 }]
      : texts.map((text, index) => ({ text, distance: Math.abs(index - rowIndex) })).sort((a, b) => a.distance - b.distance);
    let closest;
    for (const { text } of nearby) {
      const existing = (text.affixElements ?? []).filter(element => Number.isFinite(element.fontSize));
      const sameSide = existing.filter(element => (element.affixSide ?? (element.affix === 'prefix' ? 'left' : 'right')) === side);
      // Appending beside existing affixes puts the new one nearest the last on that side.
      closest = (sameSide.length ? sameSide : existing).at(-1);
      if (closest) break;
    }
    return { ...createStreetText(), textContent: affix === 'prefix' ? 'N' : 'St',
      affix, affixSide: side,
      fontFamily: row.fontFamily, fontSize: closest?.fontSize ?? Math.max(50, row.fontSize * 0.6), textColor: row.textColor };
  }
  function addStreetTextElement(row, type, texts = [row]) {
    row.scriptElements ??= [];
    row.affixElements ??= [];
    const affix = ['prefix', 'suffix'].includes(type);
    if (!affix && !['superscript', 'subscript'].includes(type)) return null;
    const collection = affix ? row.affixElements : row.scriptElements;
    if (collection.length >= 20) return null;
    const element = affix ? createStreetAffix(row, type, texts) : createStreetScript(row, type);
    collection.push(element);
    row.selectedElementIndex = streetTextChildren(row).indexOf(element) + 1;
    return element;
  }
  function removeStreetTextElement(row) {
    const element = selectedStreetText(row);
    if (element === row) return false;
    const collection = element.affix ? row.affixElements : row.scriptElements;
    collection.splice(collection.indexOf(element), 1);
    row.selectedElementIndex = 0;
    return true;
  }
  function createStreetSign(name = 'Street Sign 1') {
    return { id: uid(), name, mounting: 'free-swinging', spanSide: 'right', color: 'Green', corner: 'Sharp', borderRadius: 0,
      paddingTop: 0.3, paddingRight: 0.75, paddingBottom: 0.3, paddingLeft: 0.75, icon: null, iconSide: 'left', iconBackground: 'Transparent', iconCorners: 'Sharp', iconBackgroundPadding: 0, iconSize: 100, iconSquare: false, iconExtendBackground: false,
      texts: [createStreetText()], selectedTextIndex: 0 };
  }
  function restoreStreetIcon(icon) {
    if (!icon || typeof icon.src !== 'string' || icon.src.length > 512 * 1024
      || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(icon.src)
      || !Number.isFinite(icon.width) || !Number.isFinite(icon.height)
      || icon.width < 1 || icon.height < 1 || icon.width > 1024 || icon.height > 1024) return null;
    return { src: icon.src, width: icon.width, height: icon.height,
      name: typeof icon.name === 'string' ? icon.name.slice(0, 160) : 'Uploaded icon' };
  }
  function restoreRegulatoryImage(image) {
    const artwork = restoreStreetIcon(image && { ...image, width: image.pixelWidth ?? image.width, height: image.pixelHeight ?? image.height });
    if (!artwork) return null;
    // Uploaded artwork defaults to a schematic 36-inch longest edge. The existing
    // Size slider scales both dimensions together; PNG pixels stay independent.
    const scale = 36 / Math.max(artwork.width, artwork.height);
    return { ...artwork, pixelWidth: artwork.width, pixelHeight: artwork.height,
      width: artwork.width * scale, height: artwork.height * scale };
  }
  function restoreStreetText(value, allowChildren = true) {
        const text = createStreetText();
        if (typeof value?.textContent === 'string') text.textContent = value.textContent.slice(0, 2000);
        text.fontFamily = choice(value?.fontFamily, fonts, 'Series EM');
        text.arrow = choice(value?.arrow === 'TYPE_A_EXTENDED' ? 'TYPE_A' : value?.arrow, ['none', ...Object.keys(streetArrows)], 'none');
        text.arrowSize = number(value?.arrowSize, 25, 300, 100);
        text.arrowSide = choice(value?.arrowSide, ['left', 'right'], 'left');
        text.backgroundColor = choice(value?.backgroundColor, ['Inherit', ...Object.keys(palette)], 'Inherit');
        text.textColor = choice(value?.textColor, ['Match BG', ...Object.keys(palette)], 'Match BG');
        for (const key of ['alignment', 'justification']) text[key] = choice(value?.[key], ['Left', 'Center', 'Right'], 'Center');
        for (const key of ['smallCapitals', 'useNumeralFormatting', 'useBannerFormatting']) text[key] = value?.[key] === true;
        text.fontSize = number(value?.fontSize, 50, 500, 200);
        text.lineHeight = number(value?.lineHeight, 0, 300, 75);
        text.spacing = number(value?.spacing, 0, 20, 0);
        for (const key of ['numeralFormattingSize', 'bannerFormattingSize', 'bannerFirstLetterSize']) text[key] = number(value?.[key], 50, 150, text[key]);
        if (allowChildren) {
          text.scriptElements = (Array.isArray(value?.scriptElements) ? value.scriptElements : []).slice(0, 20).map(raw => {
            const element = restoreStreetText(raw, false);
            element.script = raw?.script === 'subscript' ? 'subscript' : 'superscript';
            element.scriptSide = raw?.scriptSide === 'left' ? 'left' : 'right';
            return element;
          });
          text.affixElements = (Array.isArray(value?.affixElements) ? value.affixElements : []).slice(0, 20).map(raw => {
            const element = restoreStreetText(raw, false);
            element.affix = raw?.affix === 'prefix' ? 'prefix' : 'suffix';
            element.affixSide = choice(raw?.affixSide, ['left', 'right'], element.affix === 'prefix' ? 'left' : 'right');
            return element;
          });
          text.selectedElementIndex = number(value?.selectedElementIndex, 0, streetTextChildren(text).length, 0) | 0;
        }
        return text;
  }
  function restoreStreetSigns(project, saved) {
    project.streetSigns = (Array.isArray(saved.streetSigns) ? saved.streetSigns : []).filter(sign => sign && typeof sign === 'object').slice(0, 100).map(raw => {
      const sign = createStreetSign(typeof raw.name === 'string' ? raw.name.slice(0, 80) : 'Street Sign');
      if (raw.regulatoryImage) {
        sign.regulatoryImage = restoreRegulatoryImage(raw.regulatoryImage);
        if (!sign.regulatoryImage) return null;
        sign.regulatoryScale = number(raw.regulatoryScale, 0.25, 4, 1);
        sign.signType = 'static';
      } else if (typeof raw.regulatoryCode === 'string') {
        if (!regulatoryById.has(raw.regulatoryCode)) return null;
        sign.regulatoryCode = raw.regulatoryCode;
        sign.regulatoryScale = number(raw.regulatoryScale, 0.25, 4, 1);
        sign.signType = raw.signType === 'blank-out' && canBlankOut(sign) ? 'blank-out' : 'static';
        sign.display = raw.display === 'off' ? 'off' : 'on';
      }
      sign.color = choice(raw.color, Object.keys(palette), 'Green');
      sign.corner = choice(raw.corner, ['Sharp', 'Round'], 'Sharp');
      sign.mounting = choice(raw.mounting, ['free-swinging', 'direct', 'mast'], 'free-swinging');
      if (['free-swinging', 'direct'].includes(raw.armMounting)) sign.armMounting = raw.armMounting;
      sign.spanSide = raw.spanSide === 'left' ? 'left' : 'right';
      sign.icon = restoreStreetIcon(raw.icon);
      sign.iconSide = raw.iconSide === 'right' ? 'right' : 'left';
      sign.iconBackground = choice(raw.iconBackground, ['Transparent', ...Object.keys(palette)], 'Transparent');
      sign.iconCorners = raw.iconCorners === 'Round' ? 'Round' : 'Sharp';
      sign.iconSize = number(raw.iconSize, 25, 300, 100);
      sign.iconBackgroundPadding = number(raw.iconBackgroundPadding, 0, 6, 0);
      sign.iconSquare = raw.iconSquare === true;
      sign.iconExtendBackground = raw.iconExtendBackground === true;
      sign.borderRadius = number(raw.borderRadius, 0, 5, 0);
      for (const key of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) sign[key] = number(raw[key], 0, 20, sign[key]);
      if (Number.isFinite(raw.armPosition)) sign.armPosition = raw.armPosition;
      if (Number.isFinite(raw.spanPosition)) sign.spanPosition = raw.spanPosition;
      if (Number.isFinite(raw.poleHeight)) sign.poleHeight = raw.poleHeight;
      sign.texts = (Array.isArray(raw.texts) && raw.texts.length ? raw.texts : [createStreetText()]).slice(0, 50).map(value => {
        return restoreStreetText(value);
      });
      sign.selectedTextIndex = number(raw.selectedTextIndex, 0, sign.texts.length - 1, 0) | 0;
      if (raw.id === saved.selectedStreetSignId) project.selectedStreetSignId = sign.id;
      return sign;
    }).filter(Boolean);
    project.selectedStreetSignId ??= project.streetSigns[0]?.id ?? null;
  }
  function streetFont(text, sign) {
    if (text.fontFamily.startsWith('Clearview ') && text.fontFamily !== 'Clearview 5WR') {
      const background = text.backgroundColor === 'Inherit' ? sign.color : text.backgroundColor;
      return text.fontFamily + (contrast(background) === '#000000' ? 'B' : 'W');
    }
    return text.fontFamily === 'Series A' ? 'Series EM' : text.fontFamily;
  }
  let canvas;
  function measure(text, size, font, smallCapitals) {
    if (typeof document !== 'undefined') {
      canvas ??= document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = `${smallCapitals ? 'small-caps ' : ''}${font === 'Arial Bold' ? 'bold ' : ''}${size}px "${font}", "Series EM"`;
      return context.measureText(text).width;
    }
    return text.length * size * 0.52;
  }
  const banners = /^(North|East|South|West|Arterial|Jct|Begin|End|Spur|Alt|Truck|Business|Bus|Byp|Loop|Express|Local|Inner|Outer|Future|Toll|City|Conn|To|Via|Turnpike|Nord|Est|Sud|Ouest)$/i;
  function textRuns(content, text, font) {
    const scale = font.startsWith('Clearview ') ? 56.90625 / 69.046875 : 1;
    const base = 10.5 * text.fontSize / 100 * scale;
    const runs = [];
    for (const token of content.split(/(\s+|\d+\S*)/).filter(Boolean)) {
      const banner = text.useBannerFormatting && banners.test(token);
      const size = base * (text.useNumeralFormatting && /^\d/.test(token) ? text.numeralFormattingSize / 100 : banner ? text.bannerFormattingSize / 100 : 1);
      const parts = banner ? [token[0], token.slice(1)] : [token];
      parts.forEach((part, index) => {
        const fontSize = size * (banner && index === 0 ? text.bannerFirstLetterSize / 100 : 1);
        runs.push({ content: part, size: fontSize, width: measure(part, fontSize, font, text.smallCapitals) });
      });
    }
    return runs;
  }
  const streetLineWidth = runs => runs.some(run => Number.isFinite(run.offsetX))
    ? Math.max(0, ...runs.map(run => run.offsetX + run.width))
    : runs.reduce((sum, run) => sum + run.width, 0);
  function streetSignGeometry(sign) {
    const regulatory = regulatoryDesign(sign);
    if (regulatory) {
      const scale = number(sign.regulatoryScale, 0.25, 4, 1);
      return { width: regulatory.width * scale, height: regulatory.height * scale, regulatory };
    }
    const rows = sign.texts.map(text => {
      const font = streetFont(text, sign);
      const lines = text.textContent.replace(/\\n/g, '\n').replace(/\\t/g, '\t').split('\n').map(line => textRuns(line, text, font));
      const baseSize = 10.5 * text.fontSize / 100;
      const capFor = run => run.size * ((run.font ?? font).startsWith('Series ') ? 0.5690625 : (run.font ?? font).startsWith('Clearview ') ? 0.69046875 : 0.7);
      const mainCaps = lines.map(runs => Math.max(0, ...runs.map(capFor)));
      const mainCap = mainCaps[0];
      // Super/subscripts share a side column, with independent upper and
      // lower baselines. Reserve the wider lane once rather than adding both.
      const sides = { left: { superscript: [], subscript: [] }, right: { superscript: [], subscript: [] } };
      const gap = baseSize * 0.2;
      for (const element of text.scriptElements ?? []) {
        const scriptFont = streetFont(element, sign);
        const dy = baseSize * (element.script === 'subscript' ? 0.22 : -0.35);
        const content = element.textContent.replace(/\\n|\\t|[\r\n\t]/g, ' ');
        if (!content) continue;
        const lane = sides[element.scriptSide === 'left' ? 'left' : 'right'][element.script === 'subscript' ? 'subscript' : 'superscript'];
        const start = lane.length ? streetLineWidth(lane) + gap / 2 : 0;
        let x = start;
        for (const run of textRuns(content, element, scriptFont)) {
          lane.push({ ...run, element, font: scriptFont, dy, offsetX: x });
          x += run.width;
        }
      }
      const leftWidth = Math.max(streetLineWidth(sides.left.superscript), streetLineWidth(sides.left.subscript));
      const mainStart = leftWidth ? leftWidth + gap : 0;
      let mainEnd = mainStart;
      const mainRuns = lines[0].map(run => { const item = { ...run, offsetX: mainEnd }; mainEnd += run.width; return item; });
      const leftRuns = [...sides.left.superscript, ...sides.left.subscript];
      const rightRuns = [...sides.right.superscript, ...sides.right.subscript].map(run => ({ ...run, offsetX: run.offsetX + mainEnd + gap }));
      lines[0] = [...leftRuns, ...mainRuns, ...rightRuns];
      for (const side of ['left', 'right']) {
        const scripts = lines[0].filter(run => run.element && (run.element.scriptSide === 'left' ? 'left' : 'right') === side);
        const upper = scripts.filter(run => run.element.script !== 'subscript');
        const lower = scripts.filter(run => run.element.script === 'subscript');
        if (upper.length && lower.length) {
          const upperBottom = Math.max(...upper.map(run => run.dy + run.size * 0.18));
          const lowerTop = Math.min(...lower.map(run => run.dy - capFor(run)));
          const clearance = Math.max(0, upperBottom + baseSize * 0.08 - lowerTop);
          lower.forEach(run => { run.dy += clearance; });
        }
      }
      // Prefixes follow the first visible line and suffixes the last, retaining
      // their chosen side and cap-center alignment independently of scripts.
      const visibleLines = lines.map((runs, index) => runs.some(run => !run.element && run.content.trim()) ? index : -1).filter(index => index >= 0);
      const affixes = lines.map(() => ({ left: [], right: [] }));
      for (const element of text.affixElements ?? []) {
        const content = element.textContent.replace(/\\n|\\t|[\r\n\t]/g, ' ');
        if (!content) continue;
        const lineIndex = element.affix === 'suffix' ? visibleLines[visibleLines.length - 1] ?? lines.length - 1 : visibleLines[0] ?? 0;
        const affixFont = streetFont(element, sign);
        const lane = affixes[lineIndex][element.affixSide === 'left' ? 'left' : 'right'];
        let x = lane.length ? streetLineWidth(lane) + gap : 0;
        for (const run of textRuns(content, element, affixFont)) {
          const item = { ...run, element, font: affixFont, offsetX: x };
          item.dy = (capFor(item) - mainCaps[lineIndex]) / 2;
          lane.push(item);
          x += run.width;
        }
      }
      affixes.forEach((lanes, index) => {
        if (!lanes.left.length && !lanes.right.length) return;
        const leftWidth = streetLineWidth(lanes.left), blockWidth = streetLineWidth(lines[index]);
        const leftSpace = leftWidth + (leftWidth && blockWidth ? gap : 0);
        const rightStart = leftSpace + blockWidth + (leftWidth || blockWidth ? gap : 0);
        let nextX = 0;
        const block = lines[index].map(run => {
          const offsetX = Number.isFinite(run.offsetX) ? run.offsetX : nextX;
          nextX = offsetX + run.width;
          return { ...run, offsetX: offsetX + leftSpace };
        });
        lines[index] = [...lanes.left, ...block, ...lanes.right.map(run => ({ ...run, offsetX: run.offsetX + rightStart }))];
      });
      const scriptAbove = Math.max(0, ...lines.flatMap((runs, index) => runs.filter(run => run.element).map(run => capFor(run) - run.dy - mainCaps[index])));
      const scriptBelow = Math.max(0, ...lines.flat().filter(run => run.element).map(run => run.dy + run.size * 0.18));
      const lineHeight = baseSize * (text.lineHeight / 100 + 0.2);
      const artwork = streetArrows[text.arrow];
      const arrowLength = baseSize * 1.5 * number(text.arrowSize, 25, 300, 100) / 100;
      const arrow = artwork ? { ...artwork, length: arrowLength,
// in #sm-links
// in #sm-links
        thickness: arrowLength * artwork.width / artwork.height, gap: baseSize * 0.4 } : null;
      const arrowSpace = arrow ? arrow.length + arrow.gap : 0;
      const width = Math.max(0, ...lines.map(streetLineWidth)) + arrowSpace;
      const rowLineHeight = Math.max(lineHeight, arrow?.thickness ?? 0);
      return { text, font, lines, width, arrow, arrowSpace, mainCap, scriptAbove, scriptBelow, lineHeight: rowLineHeight,
        height: Math.max(rowLineHeight, ...lines.flat().filter(run => !run.element).map(run => run.size * 0.7)) + scriptAbove + scriptBelow + rowLineHeight * (lines.length - 1) };
    });
    const border = 1.2;
    const textWidth = Math.max(12, ...rows.map(row => row.width + row.text.spacing * 12));
    const contentHeight = rows.reduce((sum, row) => sum + row.height, 0);
    const left = border + sign.paddingLeft * 6;
    const top = border + sign.paddingTop * 6;
    const padding = sign.icon && (sign.iconExtendBackground || palette[sign.iconBackground])
      ? number(sign.iconBackgroundPadding, 0, 6, 0) : 0;
    const iconFactor = number(sign.iconSize, 25, 300, 100) / 100;
    const iconScale = sign.icon ? contentHeight / Math.max(sign.icon.height, sign.icon.width / 2) * iconFactor : 0;
    const square = sign.iconSquare || sign.iconExtendBackground;
    const imageHeight = sign.icon ? square ? contentHeight * iconFactor : sign.icon.height * iconScale : 0;
    const paddedHeight = Math.max(contentHeight, imageHeight + (sign.icon && !sign.iconExtendBackground ? padding * 2 : 0));
    const height = paddedHeight + (sign.paddingTop + sign.paddingBottom) * 6 + border * 2;
    const textY = top + (paddedHeight - contentHeight) / 2;
    let icon = null;
    if (sign.icon) {
      const width = square ? contentHeight * iconFactor : sign.icon.width * iconScale;
      const inset = sign.iconExtendBackground ? 0 : padding;
      icon = { width, height: imageHeight, x: left + inset + (sign.iconSide === 'right' ? textWidth + 4.5 : 0),
        y: top + (paddedHeight - imageHeight) / 2 };
    }
    const iconSpace = icon ? icon.width + (sign.iconExtendBackground ? 0 : padding * 2) + 4.5 : 0;
    let textX = left + (icon && sign.iconSide !== 'right' ? iconSpace : 0);
    let width = textWidth + iconSpace + (sign.paddingLeft + sign.paddingRight) * 6 + border * 2;
    if (icon && sign.iconExtendBackground) {
      // Full-height white end blocks remain flush; padding insets the artwork.
      const right = sign.iconSide === 'right';
      const endPadding = right ? left : border + sign.paddingRight * 6;
      width = height + 4.5 + textWidth + endPadding;
      textX = right ? left : height + 4.5;
      const x = right ? width - height : 0;
      icon.background = { x, y: 0, width: height, height, radius: 0, color: '#ffffff' };
      icon.width = icon.height = Math.max(0.5, contentHeight * iconFactor - padding * 2);
      icon.x = x + (height - icon.width) / 2;
      icon.y = (height - icon.height) / 2;
    } else if (icon && palette[sign.iconBackground]) {
      const bgWidth = icon.width + padding * 2, bgHeight = icon.height + padding * 2;
      icon.background = { x: icon.x - padding, y: icon.y - padding, width: bgWidth, height: bgHeight,
        radius: sign.iconCorners === 'Round' ? Math.min(bgWidth, bgHeight) * 0.12 : 0,
        color: palette[sign.iconBackground] };
    }
    return { width, height, rows, border, textWidth, textX, textY, icon };
  }
  function streetSignBounds(sign, support) {
    if (isMastMountedSign(sign, support)) {
      const halfHeight = streetSignGeometry(sign).height / 2;
      // Schematic pole mount: keep the sign's top two inches below the
      // arm-connection plate and its bottom above the mast base plate.
      const top = app.dimensions.mast.armHeight - app.mastGeometry(support).connectionHeight / 2 - 2;
      const bottom = app.dimensions.mast.baseThickness;
      const min = bottom + halfHeight, max = top - halfHeight;
      return min <= max ? { min, max } : { min: (top + bottom) / 2, max: (top + bottom) / 2 };
    }
    return app.supportPositionBounds(streetSignGeometry(sign).width, support);
  }
  function setStreetSignPosition(sign, support, value) {
    if (!sign || !signCanMove(sign, support) || !Number.isFinite(value)) return;
    const bounds = streetSignBounds(sign, support);
    sign[signPositionKey(sign, support)] = Math.max(bounds.min, Math.min(bounds.max, value));
  }
  function ensureStreetSignPositions(project) {
    (project.streetSigns ?? []).forEach((sign, index) => setStreetSignPosition(sign, project.support,
      streetSignPosition(sign, project.support) ?? (isMastMountedSign(sign, project.support)
        ? streetSignBounds(sign, project.support).max : Math.min(96 + index * 60, app.supportLength(project.support) / 2))));
  }
  function streetSignDragPosition(sign, support, position, dx, dy, scale) {
    if (!sign || !Number.isFinite(position) || !Number.isFinite(scale) || scale <= 0) return position;
    if (isMastMountedSign(sign, support)) return position - dy / scale;
    const direction = support.type === 'mast-arm' && support.side === 'left' ? -1 : 1;
    return app.supportPositionAtX(support, app.supportXAtPosition(support, position) + direction * dx / scale);
  }
  function streetSignMarkup(sign, geometry, interactive = false) {
    const esc = app.escape;
    const targetAttributes = (row, element) => `data-street-row-id="${esc(row.id)}" data-street-element-id="${esc(element.id)}"`;
    if (geometry.regulatory) {
      if (isBlankOut(sign)) {
        const { width, height } = geometry;
        return `<rect class="blankoutHousing" width="${width}" height="${height}" fill="#24272b"/><rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="#000"/>`
          + (sign.display === 'off' ? '' : `<image class="regulatorySignFace blankoutFace" x="1" y="1" width="${width - 2}" height="${height - 2}" href="${app.regulatoryBlankoutData[sign.regulatoryCode]}" preserveAspectRatio="xMidYMid meet"><title>${esc(geometry.regulatory.name)}</title></image>`);
      }
      return `<image class="regulatorySignFace" width="${geometry.width}" height="${geometry.height}" href="${esc(sign.regulatoryImage?.src ?? app.regulatoryPNGData[sign.regulatoryCode])}" preserveAspectRatio="xMidYMid meet"><title>${esc(geometry.regulatory.code + ' — ' + geometry.regulatory.name)}</title></image>`;
    }
    const radius = sign.corner === 'Round' ? Math.min(sign.borderRadius * 6, geometry.height / 2, geometry.width / 2) : 0;
    const foreground = contrast(sign.color);
    let result = `<rect class="streetSignPanel" width="${geometry.width}" height="${geometry.height}" rx="${radius}" fill="${palette[sign.color]}"/>`;
    result += `<rect x="${geometry.border / 2}" y="${geometry.border / 2}" width="${geometry.width - geometry.border}" height="${geometry.height - geometry.border}" rx="${Math.max(0, radius - geometry.border / 2)}" fill="none" stroke="${foreground}" stroke-width="${geometry.border}"/>`;
    if (geometry.icon) {
      const { x, y, width, height } = geometry.icon;
      const imageRadius = sign.iconCorners === 'Round' && !sign.iconExtendBackground ? Math.min(width, height) * 0.12 : 0;
      const imageClipId = `street-icon-image-${String(sign.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
      if (imageRadius) result += `<defs><clipPath id="${imageClipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${imageRadius}"/></clipPath></defs>`;
      if (geometry.icon.background) {
        const bg = geometry.icon.background;
        // Clip full-bleed backgrounds to the panel's outer rounded silhouette.
        const clipId = `street-icon-panel-${String(sign.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
        if (sign.iconExtendBackground) result += `<defs><clipPath id="${clipId}"><rect width="${geometry.width}" height="${geometry.height}" rx="${radius}"/></clipPath></defs>`;
        result += `<rect class="streetIconBackground" x="${bg.x}" y="${bg.y}" width="${bg.width}" height="${bg.height}" rx="${bg.radius}" fill="${bg.color}"${sign.iconExtendBackground ? ` clip-path="url(#${clipId})"` : ''}/>`;
      }
      result += `<image class="streetSignIcon" x="${x}" y="${y}" width="${width}" height="${height}" href="${esc(sign.icon.src)}" preserveAspectRatio="xMidYMid meet"${imageRadius ? ` clip-path="url(#${imageClipId})"` : ''}><title>${esc(sign.icon.name)}</title></image>`;
    }
    let y = geometry.textY ?? geometry.border + sign.paddingTop * 6;
    for (const row of geometry.rows) {
      const { text, font } = row;
      const available = geometry.textWidth;
      const extra = available - row.width - text.spacing * 12;
      const start = geometry.textX + text.spacing * 6 + (text.alignment === 'Left' ? 0 : text.alignment === 'Right' ? extra : extra / 2);
      const color = text.textColor === 'Match BG' ? contrast(text.backgroundColor === 'Inherit' ? sign.color : text.backgroundColor) : palette[text.textColor];
      if (text.backgroundColor !== 'Inherit') result += `<rect x="${start}" y="${y}" width="${row.width}" height="${row.height}" fill="${palette[text.backgroundColor]}"/>`;
      row.lines.forEach((runs, index) => {
        const textWidth = streetLineWidth(runs);
        const width = textWidth + row.arrowSpace;
        let x = start + (text.justification === 'Left' ? 0 : text.justification === 'Right' ? row.width - width : (row.width - width) / 2);
        const cap = font.startsWith('Clearview ') ? 0.69046875 : font.startsWith('Series ') ? 0.5690625 : 0.7;
        const maxCap = Math.max(0, ...runs.filter(run => !run.element).map(run => run.size * cap));
        const baseline = y + index * row.lineHeight + (row.height - row.scriptAbove - row.scriptBelow - (row.lines.length - 1) * row.lineHeight + maxCap) / 2 + row.scriptAbove;
        if (row.arrow) {
          const arrow = row.arrow;
          const cx = x + (text.arrowSide === 'right' ? textWidth + arrow.gap : 0) + arrow.length / 2;
          const cy = y + index * row.lineHeight + (row.height - (row.lines.length - 1) * row.lineHeight) / 2;
          result += `<g class="streetTextArrow"${interactive ? ` ${targetAttributes(text, text)}` : ''} transform="translate(${cx} ${cy}) rotate(${text.arrowSide === 'right' ? 90 : -90}) scale(${arrow.length / arrow.height}) translate(${-arrow.width / 2} ${-arrow.height / 2})" fill="${color}" fill-rule="evenodd" stroke-linejoin="round"><path d="${arrow.path}"/></g>`;
          if (text.arrowSide === 'left') x += row.arrowSpace;
        }
        const lineX = x;
        for (const run of runs) {
          const runX = Number.isFinite(run.offsetX) ? lineX + run.offsetX : x;
          const element = run.element ?? text;
          const runFont = run.font ?? font;
          const family = runFont === 'Arial Bold' ? 'Arial' : runFont;
          const runColor = element.textColor === 'Match BG' ? contrast(element.backgroundColor === 'Inherit' ? sign.color : element.backgroundColor) : palette[element.textColor];
          if (interactive) {
            // A transparent rectangle makes the whole word selectable, including
            // spaces and letter counters. Exports use only the original artwork.
            const capHeight = run.size * (runFont.startsWith('Series ') ? 0.5690625 : runFont.startsWith('Clearview ') ? 0.69046875 : 0.7);
            result += `<g class="streetTextTarget" ${targetAttributes(text, element)}><rect class="streetTextHit" x="${runX}" y="${baseline + (run.dy ?? 0) - capHeight}" width="${run.width}" height="${capHeight + run.size * 0.18}" fill="transparent"/>`;
          }
          result += `<text xml:space="preserve" x="${runX}" y="${baseline + (run.dy ?? 0)}" data-script="${run.element?.script ?? 'normal'}"${run.element?.affix ? ` data-affix="${run.element.affix}"` : ''} font-family="${esc(`"${family}", "Series EM"`)}" font-size="${run.size}"${element.smallCapitals ? ' font-variant="small-caps"' : ''}${runFont === 'Arial Bold' ? ' font-weight="bold"' : ''} fill="${runColor}">${esc(run.content)}</text>`;
          if (interactive) result += '</g>';
          x += run.width;
        }
      });
      y += row.height;
    }
    return result;
  }
  async function embedStreetSignFonts(svg, project) {
    if (app.mastArmProjects) project = { ...project, streetSigns: app.mastArmProjects(project).flatMap(arm => arm.streetSigns ?? []) };
    const used = new Set((project.streetSigns ?? []).filter(sign => !isRegulatorySign(sign)).flatMap(sign => sign.texts.flatMap(text => [text, ...streetTextChildren(text)].map(element => streetFont(element, sign)))));
    const styles = [...used].filter(font => fontFiles[font]).map(font => {
      const data = app.streetFontData?.[font];
      if (!data) throw new Error('Street sign font unavailable');
      return `@font-face{font-family:"${font}";src:url(${data})}`;
    });
    return styles.length ? svg.replace(/(<svg\b[^>]*>)/, `$1<defs><style>${styles.join('')}</style></defs>`) : svg;
  }
  Object.assign(app, { streetPalette: palette, streetFonts: fonts, streetFontFiles: fontFiles, createStreetText, createStreetScript, createStreetAffix, streetTextChildren, addStreetTextElement, removeStreetTextElement, selectedStreetText, selectStreetTextElement, createStreetSign,
    regulatoryDesign, isRegulatorySign, canBlankOut, isBlankOut, signCanMove, isMastMountedSign, streetSignPosition, streetSignDragPosition,
    restoreStreetIcon, restoreRegulatoryImage, restoreStreetSigns, streetFont, streetSignGeometry, streetSignBounds, setStreetSignPosition, ensureStreetSignPositions, streetSignMarkup, embedStreetSignFonts });
})();
