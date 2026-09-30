pickistyle

A free browser extension for picking colors, font families, and font sizes directly from webpages.

It works with Chrome, Edge, Brave, and other Chromium-based browsers.

Note: All files pass a syntax check, but I haven't loaded the extension in a browser yet. Please do a quick test before using it.

Installation

Open chrome://extensions (or edge://extensions).

Turn on Developer mode.

Click Load unpacked.

Select the Desktop\style-eyedropper folder.

How to Use

Click the toolbar icon to open a small panel with three tools, or use the keyboard shortcuts below:

Tool	Shortcut	What you see on the page	What gets copied
Color	Alt+Shift+C	A magnifier showing the pixels around your cursor and the color value	The color as HEX, RGB, or HSL, depending on your selection in the panel
Font family	Alt+Shift+F	The element under your cursor is outlined, with a label showing the displayed font and the full font list	The complete font-family value, ready to paste into CSS
Font size	Alt+Shift+S	An outline and label showing the size in px and rem, along with line-height and weight	The size, e.g. 16px
Picking a Value

Clicking an element picks the value and copies it to your clipboard. A short message on screen confirms the action.

Press Esc to cancel.

While a picker is active, clicks won't trigger actions on the webpage, so links won't open accidentally.

Pick History

The panel keeps a history of your last 30 picks, including previews and the website each pick came from.

Click any history entry to copy its value again.

Limitations

The color picker works from a screenshot of the visible page. It takes a new screenshot after you scroll, so the magnifier may disappear for about a quarter of a second.

The displayed font is detected by measuring text. This is reliable for installed and web fonts, but it isn't guaranteed to work correctly in every case.

Browsers don't allow extensions to run on their own pages, such as chrome:// pages, extension stores, or the built-in PDF viewer. The panel will show a message if you try to use the extension there.

If a keyboard shortcut conflicts with another extension or browser shortcut, you can change it at chrome://extensions/shortcuts.
