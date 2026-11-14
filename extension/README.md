# Persuasion Cartographer Chrome Extension

This Manifest V3 extension analyzes text selected on a webpage, or text pasted into the popup, using the existing Persuasion Cartographer API.

## Load it in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `extension` folder.
4. Select text on a webpage, right-click, and choose **Analyze Rhetoric**. The extension popup opens with the selection prefilled. If Chrome does not open it automatically, click the extension icon. You can also open the popup directly and paste text there.

This extension requires Chrome 127 or later. If Chrome was already open when you installed or updated the extension, reload it from `chrome://extensions` so the context-menu item is registered.

The extension sends the submitted passage to `https://persuasioncartographer.duckdns.org/analyze`. The host permission in `manifest.json` is scoped to that API host. Update `API_URL` and the matching `host_permissions` entry if the API domain changes.

Chrome restricts script injection on some browser-internal and store pages; paste text into the popup on those pages. The extension does not inspect or transmit page contents beyond the selected text submitted for analysis. Text passed from the context menu is held temporarily in Chrome session storage and removed when the popup reads it.
