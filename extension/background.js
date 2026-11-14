const CONTEXT_MENU_ID = 'persuasion-cartographer-analyze-selection';

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: CONTEXT_MENU_ID,
            title: 'Analyze Rhetoric',
            contexts: ['selection']
        });
    });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText) return;

    const requestId = crypto.randomUUID();
    await chrome.storage.session.set({ [requestId]: info.selectionText });
    await chrome.tabs.create({ url: chrome.runtime.getURL(`context.html?id=${requestId}`) });
});
