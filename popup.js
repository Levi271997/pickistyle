const errorEl = document.querySelector('.error');
const listEl = document.getElementById('history');
const emptyEl = document.getElementById('empty');

// ---------- Launch pickers ----------

document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', async () => {
    errorEl.hidden = true;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const res = await chrome.runtime.sendMessage({ type: 'sed:launch', tabId: tab.id, mode: btn.dataset.mode });
    if (res?.ok) {
      window.close();
    } else {
      errorEl.textContent = "This page can't be inspected (browser pages, the extension store and PDF viewers are off-limits). Try a regular website.";
      errorEl.hidden = false;
    }
  });
});

// ---------- Color format ----------

const formatButtons = document.querySelectorAll('.segmented button');

function setFormatUI(format) {
  formatButtons.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.format === format)));
}

formatButtons.forEach((b) => {
  b.addEventListener('click', () => {
    setFormatUI(b.dataset.format);
    chrome.storage.local.set({ colorFormat: b.dataset.format });
  });
});

// ---------- History ----------

const TYPE_LABELS = { color: 'Color', fontFamily: 'Font family', fontSize: 'Font size' };

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function renderHistory(history) {
  listEl.replaceChildren();
  emptyEl.hidden = history.length > 0;

  for (const item of history) {
    const li = document.createElement('li');
    li.title = 'Click to copy';

    const preview = document.createElement('span');
    preview.className = 'preview';
    let sub = '';
    if (item.type === 'color') {
      preview.style.background = item.value;
      sub = item.hex && item.hex !== item.value ? item.hex : TYPE_LABELS.color;
    } else if (item.type === 'fontFamily') {
      preview.textContent = 'Aa';
      preview.style.fontFamily = item.value;
      sub = `Rendered: ${item.rendered}`;
    } else {
      preview.textContent = 'Aa';
      preview.style.fontSize = Math.min(18, parseFloat(item.value)) + 'px';
      sub = [item.rem, `lh ${item.lineHeight}`, `wt ${item.weight}`].filter(Boolean).join(' · ');
    }

    const info = document.createElement('div');
    info.className = 'info';
    const value = document.createElement('div');
    value.className = 'value';
    value.textContent = item.type === 'fontFamily' ? item.rendered : item.value;
    const subEl = document.createElement('div');
    subEl.className = 'sub';
    const site = hostOf(item.url);
    subEl.textContent = site ? `${sub} · ${site}` : sub;
    info.append(value, subEl);

    li.append(preview, info);
    li.addEventListener('click', async () => {
      await navigator.clipboard.writeText(item.value);
      const badge = document.createElement('span');
      badge.className = 'copied';
      badge.textContent = 'Copied';
      li.append(badge);
      setTimeout(() => badge.remove(), 1200);
    });
    listEl.append(li);
  }
}

document.getElementById('clear').addEventListener('click', async () => {
  await chrome.storage.local.set({ history: [] });
  renderHistory([]);
});

chrome.storage.local.get(['history', 'colorFormat']).then(({ history = [], colorFormat = 'hex' }) => {
  setFormatUI(colorFormat);
  renderHistory(history);
});
