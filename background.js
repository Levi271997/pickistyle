// Service worker: injects the picker into the active tab and captures screenshots
// for the color picker (content scripts can't capture the screen themselves).

const COMMAND_MODES = {
  'pick-color': 'color',
  'pick-font-family': 'fontFamily',
  'pick-font-size': 'fontSize',
};

async function startPicker(tabId, mode) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  const { colorFormat = 'hex' } = await chrome.storage.local.get('colorFormat');
  await chrome.tabs.sendMessage(tabId, { type: 'sed:start', mode, colorFormat });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'sed:launch') {
    startPicker(msg.tabId, msg.mode).then(
      () => sendResponse({ ok: true }),
      (err) => sendResponse({ ok: false, error: err.message })
    );
    return true;
  }

  if (msg.type === 'sed:capture') {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }).then(
      (dataUrl) => sendResponse({ dataUrl }),
      (err) => sendResponse({ error: err.message })
    );
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  const mode = COMMAND_MODES[command];
  if (!mode || !tab?.id) return;
  try {
    await startPicker(tab.id, mode);
  } catch (err) {
    console.warn('Style Eyedropper: cannot run on this page.', err);
  }
});
