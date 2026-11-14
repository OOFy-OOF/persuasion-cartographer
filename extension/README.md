# Persuasion Cartographer Browser Extension

This Manifest V3 extension analyzes text selected on a webpage, or text pasted into the popup, using the existing Persuasion Cartographer API. It reads the browser's plain-text selection; it does not capture anything else.

## Compatibility
This extension is built for **all Chromium-based browsers** (Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi, etc.). 
*Note: Only explicitly been tested on Microsoft Edge*

## Load it in your browser

1. Open your browser's extension management page (e.g., `chrome://extensions` in Chrome/Edge/Brave, or `opera://extensions` in Opera).
2. Turn on **Developer mode** (usually a toggle in the top right or left sidebar).
3. Click **Load unpacked** and select this `extension` folder.

## Usage

1. Select text on a webpage, right-click, and choose **Analyze Rhetoric**. 
2. The extension popup opens with the selection prefilled. If your browser does not open it automatically, click the extension icon in your toolbar. 
3. You can also open the popup directly and paste text there.

This extension requires a Chromium-based browser (version 127 or later). If your browser was already open when you installed or updated the extension, reload it from the extension management page so the context-menu item is registered.

On first use, click the gear icon in the top-right of the extension popup to open **Configure API endpoint** settings. Enter your deployment's full HTTPS analysis URL, such as `https://your-domain.example/analyze`. The extension asks Chrome for access to only that host when you save. For local development, HTTP is allowed only on localhost. If you move the API, update the endpoint in settings; the previous host permission is removed when possible.

## Privacy & Limitations

Browsers restrict script injection on some internal and store pages; simply paste text into the extension manually on those pages. 

The extension does not inspect or transmit page contents beyond the selected text submitted for analysis. Text passed from the context menu is held temporarily in browser session storage and removed as soon as the popup reads it.
