// File: background.js
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(null, (data) => {
    const defaults = {
      blockedDomains: [], blockedKeywords: [], allowedSites: [],
      blockPageMessage: "I don't need this.", isBlockingEnabled: true, theme: 'light'
    };
    browser.storage.local.set({ ...defaults, ...data });
  });
});

async function blockRequestHandler(details) {
    const { isBlockingEnabled } = await browser.storage.local.get('isBlockingEnabled');
    if (isBlockingEnabled === false) return { cancel: false };
    if (details.url.startsWith(browser.runtime.getURL(''))) return { cancel: false };

    const { blockedDomains, allowedSites } = await browser.storage.local.get(['blockedDomains', 'allowedSites']);
    const domain = new URL(details.url).hostname;

    if (allowedSites && allowedSites.some(allowed =>
      domain === allowed || domain.endsWith('.' + allowed))) return { cancel: false };
      
    if (blockedDomains && blockedDomains.some(blocked => 
      domain === blocked || domain.endsWith('.' + blocked))) {    
      const blockPageUrl = browser.runtime.getURL('block_page/block.html');
      return { redirectUrl: `${blockPageUrl}?reason=${encodeURIComponent(`Blocked Domain: ${domain}`)}` };
    }
    return { cancel: false };
}

browser.webRequest.onBeforeRequest.addListener(blockRequestHandler, { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] }, ["blocking"]);

browser.runtime.onMessage.addListener((message, sender) => {
    // Security Check: Only accept messages from our own extension.
    // This prevents malicious websites from triggering actions.
    if (sender.id !== browser.runtime.id) {
        return; 
    }

    if (message.action === 'blockPageByKeyword') {
        const blockPageUrl = browser.runtime.getURL('block_page/block.html');
        // Use a try-catch block in case the tab was closed before the update.
        try {
            browser.tabs.update(sender.tab.id, { url: `${blockPageUrl}?reason=${encodeURIComponent(message.keyword)}` });
        } catch (error) {
            console.error(`Failed to redirect tab: ${error.message}`);
        }
    }
});