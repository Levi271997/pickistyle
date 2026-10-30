# pickistyle

A free browser extension for picking **colors**, **font families** and **font sizes** straight from any webpage and copying them as CSS-ready values.

Works in Chrome, Edge, Brave and other Chromium-based browsers. In the browser it shows up as **Style Eyedropper**.

> **Status:** early release. All files pass a syntax check, but the extension hasn't been fully tested in a browser yet. If something doesn't work, please [open an issue](https://github.com/Levi271997/pickistyle/issues).

## Features

- **Color picker** with a magnifier that shows the pixels around your cursor. Copies the color as HEX, RGB or HSL.
- **Font family picker** that tells you which font is actually rendered, not just the first name in the CSS stack.
- **Font size picker** that shows the size in px and rem, plus line-height and weight.
- **Pick history** of your last 30 picks, with previews and the site each one came from. Click any entry to copy it again.
- **Private by design:** no accounts, no tracking, no network requests. Your picks and history are only stored locally in your browser.

## Installation

The extension isn't on the Chrome Web Store yet, so you load it manually:

1. Download this repo (**Code → Download ZIP**, then unzip it) or clone it:
   ```sh
   git clone https://github.com/Levi271997/pickistyle.git
   ```
2. Open `chrome://extensions` (or `edge://extensions` in Edge).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `pickistyle` folder.
5. Optional: pin the extension to your toolbar.

## How to use

Click the toolbar icon to open the panel and choose a tool, or use a keyboard shortcut:

| Tool | Shortcut | What you see on the page | What gets copied |
| --- | --- | --- | --- |
| Color | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> | A magnifier around your cursor with the color value | The color as HEX, RGB or HSL (set in the panel) |
| Font family | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> | The element under your cursor is outlined, with the rendered font and the full font stack | The complete `font-family` value, ready to paste into CSS |
| Font size | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> | An outline with the size in px and rem, plus line-height and weight | The size, e.g. `16px` |

- **Click** an element to pick its value. It's copied to your clipboard and a short message confirms it.
- Press <kbd>Esc</kbd> to cancel.
- While a picker is active, clicks don't reach the page, so you won't open links by accident.

If a shortcut clashes with another extension or browser shortcut, change it at `chrome://extensions/shortcuts`.

## Limitations

- The color picker reads from a screenshot of the visible page. After you scroll, it takes a new screenshot, so the magnifier may disappear for about a quarter of a second.
- The rendered font is detected by measuring text. This is reliable for installed fonts and web fonts, but may not be right in every case.
- Browsers don't let extensions run on their own pages, such as `chrome://` pages, extension stores or the built-in PDF viewer. The panel shows a message if you try.

## Permissions

| Permission | Why it's needed |
| --- | --- |
| `activeTab` | Run the picker on the tab you're using, only when you start it |
| `scripting` | Add the picker to that page |
| `storage` | Save your color format setting and pick history locally |

## Project structure

```
manifest.json   Extension config, permissions and keyboard shortcuts
background.js   Service worker: starts pickers and takes screenshots for the color picker
content.js      The on-page pickers (magnifier, outlines, labels, copying)
popup.html/css/js  Toolbar panel with tools, color format and history
icons/          Extension icons
```
