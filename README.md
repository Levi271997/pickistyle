# pickistyle
extension that gets color hexcode and font style


It works in Chrome, Edge, Brave and other Chromium browsers. All the files pass a syntax check, but I haven't loaded it in a browser and tried it, so please do a quick test.

Install it

Open chrome://extensions (or edge://extensions).
Turn on Developer mode.
Click Load unpacked and choose the Desktop\style-eyedropper folder.
How to use it
Click the toolbar icon to open a small panel with three buttons, or use a keyboard shortcut:

Tool	Shortcut	What you see on the page	What gets copied
Color	Alt+Shift+C	A magnifier showing the pixels around your cursor, with the color value	The color as HEX, RGB or HSL (you choose in the panel)
Font family	Alt+Shift+F	The element under your cursor is outlined, with a label showing the font actually displayed and the full font list	The full font-family value, ready to paste into CSS
Font size	Alt+Shift+S	An outline and label showing size in px and rem, plus line-height and weight	The size, e.g. 16px
Clicking picks the value, copies it to your clipboard and confirms with a short message on screen. Esc cancels.
While a picker is on, clicks don't trigger anything on the page, so links won't open by accident.
The panel keeps a history of your last 30 picks, with previews and the site each one came from. Click an entry to copy it again.
Limitations

The color picker works from a screenshot of the visible page. It takes a new one after you scroll, so the magnifier disappears for about a quarter of a second.
The displayed font is detected by measuring text, which is reliable for installed and web fonts but not guaranteed in every case.
Browsers don't allow extensions on their own pages (like chrome:// pages or the extension store) or in the PDF viewer. The panel shows a message if you try.
If a shortcut clashes with another one, you can change it at chrome://extensions/shortcuts.
