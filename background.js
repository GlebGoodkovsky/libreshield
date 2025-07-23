// File: background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (data) => {
    const defaults = {
      blockedDomains: [], blockedKeywords: [], allowedSites: [],
      blockPageMessage: "I don't need this.", isBlockingEnabled: true, theme: 'light'
    };
    chrome.storage.local.set({ ...defaults, ...data });
  });
});

async function blockRequestHandler(details) {
    const { isBlockingEnabled } = await chrome.storage.local.get('isBlockingEnabled');
    if (isBlockingEnabled === false) return { cancel: false };
    if (details.url.startsWith(chrome.runtime.getURL(''))) return { cancel: false };

    const { blockedDomains, allowedSites } = await chrome.storage.local.get(['blockedDomains', 'allowedSites']);
    const domain = new URL(details.url).hostname;

    if (allowedSites && allowedSites.some(allowed => domain.includes(allowed))) return { cancel: false };
    if (blockedDomains && blockedDomains.some(blocked => domain.includes(blocked))) {
      const blockPageUrl = chrome.runtime.getURL('block_page/block.html');
      return { redirectUrl: `${blockPageUrl}?reason=${encodeURIComponent(`Blocked Domain: ${domain}`)}` };
    }
    return { cancel: false };
}

chrome.webRequest.onBeforeRequest.addListener(blockRequestHandler, { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] }, ["blocking"]);

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'blockPageByKeyword') {
        const blockPageUrl = chrome.runtime.getURL('block_page/block.html');
        chrome.tabs.update(sender.tab.id, { url: `${blockPageUrl}?reason=${encodeURIComponent(message.keyword)}` });
    }
});
