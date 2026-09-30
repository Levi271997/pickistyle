// In-page picker. Injected on demand; guarded so repeated injections reuse one instance.
(() => {
  if (window.__styleEyedropper) return;
  window.__styleEyedropper = true;

  const HISTORY_MAX = 30;
  const LOUPE_CELLS = 11;
  const LOUPE_CELL_PX = 11;
  const LOUPE_PX = LOUPE_CELLS * LOUPE_CELL_PX;

  const MODE_LABELS = {
    color: 'Color picker',
    fontFamily: 'Font family picker',
    fontSize: 'Font size picker',
  };

  const state = {
    mode: null,
    colorFormat: 'hex',
    target: null,
    mouse: { x: -1, y: -1 },
    shot: null,
    capturing: false,
    recaptureTimer: 0,
  };

  // ---------- UI (shadow DOM so page CSS can't interfere) ----------

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    [hidden] { display: none !important; }
    .hl { position: fixed; border: 2px solid #6d5dfc; background: rgba(109, 93, 252, 0.12); border-radius: 2px; pointer-events: none; }
    .tip { position: fixed; max-width: 340px; background: #16161d; color: #f4f4f6; border-radius: 10px; padding: 10px 12px;
           font-size: 12px; line-height: 1.45; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35); pointer-events: none; }
    .tip .label { color: #a0a0ad; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
    .tip .big { font-size: 17px; font-weight: 600; color: #fff; word-break: break-word; }
    .tip .stack { color: #c9c9d3; font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 11px; word-break: break-word; margin-top: 4px; }
    .tip .meta { color: #a0a0ad; margin-top: 6px; }
    .tip .rendered { color: #8f84ff; }
    .loupe { position: fixed; width: ${LOUPE_PX + 16}px; background: #16161d; border-radius: 12px; padding: 8px;
             box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35); pointer-events: none; }
    .loupe canvas { display: block; width: ${LOUPE_PX}px; height: ${LOUPE_PX}px; border-radius: 6px; image-rendering: pixelated; }
    .row { display: flex; align-items: center; gap: 8px; margin-top: 7px; color: #fff;
           font: 600 12px ui-monospace, "Cascadia Code", Consolas, monospace; }
    .sw { flex: none; width: 16px; height: 16px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35); }
    .banner { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); background: #16161d; color: #fff;
              padding: 8px 14px; border-radius: 999px; font-size: 13px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
              pointer-events: none; white-space: nowrap; }
    .banner.bottom { top: auto; bottom: 12px; }
    .banner b { color: #8f84ff; font-weight: 600; }
    kbd { font: 11px ui-monospace, Consolas, monospace; background: #2c2c38; border-radius: 4px; padding: 1px 5px; margin: 0 2px; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px;
             background: #16161d; color: #fff; padding: 10px 16px; border-radius: 10px; font-size: 13px; max-width: 80vw;
             box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35); pointer-events: none; }
    .toast code { font: 600 12px ui-monospace, Consolas, monospace; color: #c9c4ff; word-break: break-word; }
    .toast.error { background: #5c1a1a; }
  `;

  let host = null;
  let ui = {};
  let cursorStyle = null;
  let toastTimer = 0;

  function ensureUI() {
    if (host && host.isConnected) return;
    host = document.createElement('style-eyedropper-ui');
    host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>${CSS}</style>
      <div class="hl" hidden></div>
      <div class="tip" hidden></div>
      <div class="loupe" hidden>
        <canvas width="${LOUPE_PX}" height="${LOUPE_PX}"></canvas>
        <div class="row"><span class="sw"></span><span class="val"></span></div>
      </div>
      <div class="banner" hidden></div>
      <div class="toast" hidden></div>
    `;
    ui = {
      hl: root.querySelector('.hl'),
      tip: root.querySelector('.tip'),
      loupe: root.querySelector('.loupe'),
      loupeCanvas: root.querySelector('.loupe canvas'),
      loupeSwatch: root.querySelector('.loupe .sw'),
      loupeValue: root.querySelector('.loupe .val'),
      banner: root.querySelector('.banner'),
      toast: root.querySelector('.toast'),
    };
    document.documentElement.appendChild(host);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function placeNearCursor(el, x, y) {
    const pad = 16;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = x + pad;
    let top = y + pad;
    if (left + w > window.innerWidth - 8) left = x - pad - w;
    if (top + h > window.innerHeight - 8) top = y - pad - h;
    el.style.left = Math.max(8, left) + 'px';
    el.style.top = Math.max(8, top) + 'px';
  }

  function showToast(html, isError = false) {
    ensureUI();
    clearTimeout(toastTimer);
    ui.toast.innerHTML = html;
    ui.toast.classList.toggle('error', isError);
    ui.toast.hidden = false;
    toastTimer = setTimeout(() => {
      ui.toast.hidden = true;
      if (!state.mode && host) {
        host.remove();
        host = null;
      }
    }, isError ? 4000 : 2200);
  }

  // ---------- Color helpers ----------

  function toHex(n) {
    return n.toString(16).padStart(2, '0');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }

  function formatColor([r, g, b], format) {
    if (format === 'rgb') return `rgb(${r}, ${g}, ${b})`;
    if (format === 'hsl') {
      const [h, s, l] = rgbToHsl(r, g, b);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // ---------- Font helpers ----------

  const GENERIC_FAMILIES = new Set([
    'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif',
    'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong', '-apple-system', 'blinkmacsystemfont',
  ]);
  const measureCtx = document.createElement('canvas').getContext('2d');
  const availableFonts = new Set();

  function parseFamilies(value) {
    return (value.match(/"[^"]*"|'[^']*'|[^,]+/g) || [])
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  // A font is "available" if text measured with it differs from every generic fallback.
  function isFontAvailable(family) {
    const key = family.toLowerCase();
    if (GENERIC_FAMILIES.has(key) || availableFonts.has(key)) return true;
    const sample = 'mmmmmmmmmmlli1WQ@#&';
    const quoted = `"${family.replace(/"/g, '\\"')}"`;
    for (const base of ['monospace', 'serif', 'sans-serif']) {
      measureCtx.font = `72px ${base}`;
      const baseWidth = measureCtx.measureText(sample).width;
      measureCtx.font = `72px ${quoted}, ${base}`;
      if (measureCtx.measureText(sample).width !== baseWidth) {
        availableFonts.add(key);
        return true;
      }
    }
    return false;
  }

  function fontInfo(el) {
    const cs = getComputedStyle(el);
    const families = parseFamilies(cs.fontFamily);
    const rendered = families.find(isFontAvailable) || families[0] || '(unknown)';
    const sizePx = parseFloat(cs.fontSize);
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return {
      stack: cs.fontFamily,
      rendered,
      size: `${round(sizePx)}px`,
      rem: `${round(sizePx / rootPx, 3)}rem`,
      lineHeight: cs.lineHeight === 'normal' ? 'normal' : `${round(parseFloat(cs.lineHeight))}px`,
      weight: cs.fontWeight,
      style: cs.fontStyle,
    };
  }

  function round(n, digits = 2) {
    const f = 10 ** digits;
    return Math.round(n * f) / f;
  }

  // ---------- Clipboard + history ----------

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position: fixed; top: 0; left: 0; opacity: 0;';
      document.documentElement.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
      return ok;
    }
  }

  async function saveToHistory(entry) {
    try {
      const { history = [] } = await chrome.storage.local.get('history');
      history.unshift({ ...entry, url: location.href, time: Date.now() });
      await chrome.storage.local.set({ history: history.slice(0, HISTORY_MAX) });
    } catch { /* extension reloaded; ignore */ }
  }

  async function finishPick(entry, label) {
    stop();
    const copied = await copyText(entry.value);
    saveToHistory(entry);
    showToast(`${copied ? 'Copied' : 'Picked'} ${label}: <code>${escapeHtml(entry.value)}</code>`);
  }

  // ---------- Color mode ----------

  function nextFrame() {
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  async function dataUrlToBitmap(dataUrl) {
    // Decode manually so strict page CSPs (img-src / connect-src) can't block it.
    const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  }

  async function capture(retry = true) {
    if (state.mode !== 'color') return;
    state.capturing = true;
    state.shot = null;
    host.style.visibility = 'hidden';
    await nextFrame();
    let res;
    try {
      res = await chrome.runtime.sendMessage({ type: 'sed:capture' });
    } catch (err) {
      res = { error: err.message };
    }
    if (host) host.style.visibility = '';
    state.capturing = false;
    if (state.mode !== 'color') return;

    if (!res || res.error) {
      // captureVisibleTab is rate-limited; one delayed retry covers fast scrolling.
      if (retry) {
        setTimeout(() => capture(false), 700);
        return;
      }
      stop();
      showToast(`Could not capture the page: ${escapeHtml(res?.error || 'unknown error')}`, true);
      return;
    }

    const bitmap = await dataUrlToBitmap(res.dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    state.shot = {
      canvas,
      ctx,
      sx: canvas.width / window.innerWidth,
      sy: canvas.height / window.innerHeight,
    };
    updateColor();
  }

  function scheduleRecapture() {
    state.shot = null;
    ui.loupe.hidden = true;
    clearTimeout(state.recaptureTimer);
    state.recaptureTimer = setTimeout(() => capture(), 250);
  }

  function pixelAt(x, y) {
    const { ctx, sx, sy, canvas } = state.shot;
    const px = Math.min(canvas.width - 1, Math.max(0, Math.floor(x * sx)));
    const py = Math.min(canvas.height - 1, Math.max(0, Math.floor(y * sy)));
    const d = ctx.getImageData(px, py, 1, 1).data;
    return { rgb: [d[0], d[1], d[2]], px, py };
  }

  function updateColor() {
    const { x, y } = state.mouse;
    if (!state.shot || x < 0) {
      ui.loupe.hidden = true;
      return;
    }
    const { rgb, px, py } = pixelAt(x, y);
    const half = Math.floor(LOUPE_CELLS / 2);
    const lctx = ui.loupeCanvas.getContext('2d');
    lctx.imageSmoothingEnabled = false;
    lctx.fillStyle = '#16161d';
    lctx.fillRect(0, 0, LOUPE_PX, LOUPE_PX);
    lctx.drawImage(state.shot.canvas, px - half, py - half, LOUPE_CELLS, LOUPE_CELLS, 0, 0, LOUPE_PX, LOUPE_PX);

    lctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    lctx.lineWidth = 1;
    for (let i = 1; i < LOUPE_CELLS; i++) {
      const p = i * LOUPE_CELL_PX + 0.5;
      lctx.beginPath(); lctx.moveTo(p, 0); lctx.lineTo(p, LOUPE_PX); lctx.stroke();
      lctx.beginPath(); lctx.moveTo(0, p); lctx.lineTo(LOUPE_PX, p); lctx.stroke();
    }
    const c = half * LOUPE_CELL_PX;
    lctx.strokeStyle = '#fff';
    lctx.lineWidth = 2;
    lctx.strokeRect(c, c, LOUPE_CELL_PX, LOUPE_CELL_PX);
    lctx.strokeStyle = '#000';
    lctx.lineWidth = 1;
    lctx.strokeRect(c - 1.5, c - 1.5, LOUPE_CELL_PX + 3, LOUPE_CELL_PX + 3);

    const value = formatColor(rgb, state.colorFormat);
    ui.loupeSwatch.style.background = `rgb(${rgb.join(',')})`;
    ui.loupeValue.textContent = value;
    ui.loupe.hidden = false;
    placeNearCursor(ui.loupe, x, y);
  }

  function pickColor(x, y) {
    if (!state.shot) return;
    const { rgb } = pixelAt(x, y);
    finishPick({ type: 'color', value: formatColor(rgb, state.colorFormat), hex: formatColor(rgb, 'hex') }, 'color');
  }

  // ---------- Font modes ----------

  function updateFont() {
    const { x, y } = state.mouse;
    const el = x < 0 ? null : document.elementFromPoint(x, y);
    if (!el || el === host) {
      ui.hl.hidden = true;
      ui.tip.hidden = true;
      state.target = null;
      return;
    }
    state.target = el;

    const r = el.getBoundingClientRect();
    Object.assign(ui.hl.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    ui.hl.hidden = false;

    const f = fontInfo(el);
    if (state.mode === 'fontFamily') {
      ui.tip.innerHTML = `
        <div class="label">Font family</div>
        <div class="big">${escapeHtml(f.rendered)}</div>
        <div class="stack">${escapeHtml(f.stack)}</div>
        <div class="meta">${f.size} · weight ${f.weight}${f.style !== 'normal' ? ' · ' + f.style : ''}</div>`;
    } else {
      ui.tip.innerHTML = `
        <div class="label">Font size</div>
        <div class="big">${f.size} <span class="meta">(${f.rem})</span></div>
        <div class="meta">line-height ${f.lineHeight} · weight ${f.weight}</div>
        <div class="meta"><span class="rendered">${escapeHtml(f.rendered)}</span></div>`;
    }
    ui.tip.hidden = false;
    placeNearCursor(ui.tip, x, y);
  }

  function pickFont() {
    if (!state.target) return;
    const f = fontInfo(state.target);
    if (state.mode === 'fontFamily') {
      finishPick({ type: 'fontFamily', value: f.stack, rendered: f.rendered }, 'font family');
    } else {
      finishPick(
        { type: 'fontSize', value: f.size, rem: f.rem, lineHeight: f.lineHeight, weight: f.weight, rendered: f.rendered },
        'font size'
      );
    }
  }

  // ---------- Events ----------

  function update() {
    if (state.mode === 'color') updateColor();
    else if (state.mode) updateFont();
    ui.banner.classList.toggle('bottom', state.mouse.y >= 0 && state.mouse.y < 70);
  }

  function onMove(e) {
    state.mouse = { x: e.clientX, y: e.clientY };
    update();
  }

  function onBlock(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function onClick(e) {
    onBlock(e);
    if (e.button !== 0) return;
    if (state.mode === 'color') pickColor(e.clientX, e.clientY);
    else {
      state.mouse = { x: e.clientX, y: e.clientY };
      updateFont();
      pickFont();
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      onBlock(e);
      stop();
    }
  }

  function onScroll() {
    if (state.mode === 'color') scheduleRecapture();
    else update();
  }

  function onResize() {
    if (state.mode === 'color') scheduleRecapture();
  }

  const BLOCKED = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'dblclick', 'auxclick'];

  function addListeners() {
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onResize, true);
    BLOCKED.forEach((t) => window.addEventListener(t, onBlock, true));
  }

  function removeListeners() {
    window.removeEventListener('mousemove', onMove, true);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('scroll', onScroll, { capture: true });
    window.removeEventListener('resize', onResize, true);
    BLOCKED.forEach((t) => window.removeEventListener(t, onBlock, true));
  }

  function start(mode, colorFormat) {
    if (state.mode) stop();
    ensureUI();
    state.mode = mode;
    state.colorFormat = colorFormat || 'hex';
    state.target = null;

    cursorStyle = document.createElement('style');
    cursorStyle.textContent = `* { cursor: ${mode === 'color' ? 'crosshair' : 'default'} !important; }`;
    document.documentElement.appendChild(cursorStyle);

    ui.banner.innerHTML = `<b>${MODE_LABELS[mode]}</b> — click to pick · <kbd>Esc</kbd> to cancel`;
    ui.banner.hidden = false;
    ui.toast.hidden = true;

    addListeners();
    if (mode === 'color') capture();
    else update();
  }

  function stop() {
    if (!state.mode) return;
    state.mode = null;
    state.target = null;
    state.shot = null;
    clearTimeout(state.recaptureTimer);
    removeListeners();
    cursorStyle?.remove();
    cursorStyle = null;
    if (host) {
      ui.hl.hidden = true;
      ui.tip.hidden = true;
      ui.loupe.hidden = true;
      ui.banner.hidden = true;
      if (ui.toast.hidden) {
        host.remove();
        host = null;
      }
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'sed:start') start(msg.mode, msg.colorFormat);
  });
})();
