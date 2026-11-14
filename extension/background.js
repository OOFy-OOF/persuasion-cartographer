const CONTEXT_MENU_ID = 'persuasion-cartographer-analyze-selection';
const PENDING_SELECTION_KEY = 'pendingSelection';

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: 'Analyze Rhetoric',
            contexts: ['selection']
        });
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText) return;

    await chrome.storage.session.set({ [PENDING_SELECTION_KEY]: info.selectionText });
    try {
        await chrome.action.openPopup({ windowId: tab.windowId });
    } catch (error) {
        // The selected text remains queued; the user can open the extension icon manually.
    }
});
