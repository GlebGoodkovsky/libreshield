// File: background.js - Updated with Temporary Unblock Feature
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(null, (data) => {
    const defaults = {
      blockedDomains: [], 
      blockedKeywords: [], 
      allowedSites: [],
      blockPageMessage: "I don't need this.", 
      isBlockingEnabled: true, 
      theme: 'light',
      // NEW: Temporary unblocks storage
      tempUnblocks: []
    };
    browser.storage.local.set({ ...defaults, ...data });
  });
  
  // NEW: Start cleanup timer for expired temporary unblocks
  startCleanupTimer();
});

// NEW: Cleanup timer to remove expired temporary unblocks
function startCleanupTimer() {
  setInterval(async () => {
    const { tempUnblocks } = await browser.storage.local.get('tempUnblocks');
    if (!tempUnblocks || tempUnblocks.length === 0) return;
    
    const now = Date.now();
    const activeTempUnblocks = tempUnblocks.filter(item => item.expiresAt > now);
    
    if (activeTempUnblocks.length !== tempUnblocks.length) {
      await browser.storage.local.set({ tempUnblocks: activeTempUnblocks });
      console.log('LibreShield: Cleaned up expired temporary unblocks');
    }
  }, 60000); // Check every minute
}

// NEW: Function to check if domain is temporarily unblocked
async function isDomainTempUnblocked(domain) {
  const { tempUnblocks } = await browser.storage.local.get('tempUnblocks');
  if (!tempUnblocks) return false;
  
  const now = Date.now();
  return tempUnblocks.some(item => 
    item.type === 'domain' && 
    (item.value === domain || domain.endsWith('.' + item.value)) &&
    item.expiresAt > now
  );
}

// NEW: Function to check if keyword is temporarily unblocked  
async function isKeywordTempUnblocked(keyword) {
  const { tempUnblocks } = await browser.storage.local.get('tempUnblocks');
  if (!tempUnblocks) return false;
  
  const now = Date.now();
  return tempUnblocks.some(item => 
    item.type === 'keyword' && 
    item.value.toLowerCase() === keyword.toLowerCase() &&
    item.expiresAt > now
  );
}

async function blockRequestHandler(details) {
    const { isBlockingEnabled } = await browser.storage.local.get('isBlockingEnabled');
    if (isBlockingEnabled === false) return { cancel: false };
    if (details.url.startsWith(browser.runtime.getURL(''))) return { cancel: false };

    const { blockedDomains, allowedSites } = await browser.storage.local.get(['blockedDomains', 'allowedSites']);
    const domain = new URL(details.url).hostname;

    if (allowedSites && allowedSites.some(allowed =>
      domain === allowed || domain.endsWith('.' + allowed))) return { cancel: false };
    
    // NEW: Check if domain is temporarily unblocked
    if (await isDomainTempUnblocked(domain)) {
      console.log(`LibreShield: ${domain} is temporarily unblocked`);
      return { cancel: false };
    }
      
    if (blockedDomains && blockedDomains.some(blocked => 
      domain === blocked || domain.endsWith('.' + blocked))) {    
      const blockPageUrl = browser.runtime.getURL('block_page/block.html');
      return { redirectUrl: `${blockPageUrl}?reason=${encodeURIComponent(`Blocked Domain: ${domain}`)}` };
    }
    return { cancel: false };
}

browser.webRequest.onBeforeRequest.addListener(blockRequestHandler, { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] }, ["blocking"]);

browser.runtime.onMessage.addListener(async (message, sender) => {
    // Security Check: Only accept messages from our own extension.
    if (sender.id !== browser.runtime.id) {
        return; 
    }

    if (message.action === 'blockPageByKeyword') {
        // NEW: Check if keyword is temporarily unblocked before blocking
        const keywordMatch = message.keyword.match(/Content Keyword: "(.+)"/);
        if (keywordMatch) {
          const keyword = keywordMatch[1];
          if (await isKeywordTempUnblocked(keyword)) {
            console.log(`LibreShield: Keyword "${keyword}" is temporarily unblocked`);
            return;
          }
        }
        
        const blockPageUrl = browser.runtime.getURL('block_page/block.html');
        try {
            browser.tabs.update(sender.tab.id, { url: `${blockPageUrl}?reason=${encodeURIComponent(message.keyword)}` });
        } catch (error) {
            console.error(`Failed to redirect tab: ${error.message}`);
        }
    }
    
    // NEW: Handle temporary unblock requests
    else if (message.action === 'requestTempUnblock') {
        try {
            const { domain, keyword, minutes } = message;
            
            if (!domain && !keyword) {
                return { success: false, error: "No domain or keyword specified" };
            }
            
            if (!minutes || minutes < 1 || minutes > 1440) {
                return { success: false, error: "Invalid duration. Must be between 1 and 1440 minutes." };
            }
            
            const { tempUnblocks = [] } = await browser.storage.local.get('tempUnblocks');
            const now = Date.now();
            const expiresAt = now + (minutes * 60 * 1000);
            
            const newTempUnblock = {
                id: `temp_${now}_${Math.random().toString(36).substr(2, 9)}`,
                type: domain ? 'domain' : 'keyword',
                value: domain || keyword,
                createdAt: now,
                expiresAt: expiresAt,
                duration: minutes
            };
            
            // Remove any existing temp unblock for the same domain/keyword
            const filteredTempUnblocks = tempUnblocks.filter(item => 
                !(item.type === newTempUnblock.type && item.value === newTempUnblock.value)
            );
            
            // Add the new temp unblock
            filteredTempUnblocks.push(newTempUnblock);
            
            await browser.storage.local.set({ tempUnblocks: filteredTempUnblocks });
            
            console.log(`LibreShield: Temporary unblock granted for ${newTempUnblock.type}: ${newTempUnblock.value} for ${minutes} minutes`);
            
            return { success: true, tempUnblock: newTempUnblock };
            
        } catch (error) {
            console.error('Error processing temp unblock request:', error);
            return { success: false, error: "Internal error processing request" };
        }
    }
    
    // NEW: Handle requests to get active temporary unblocks
    else if (message.action === 'getTempUnblocks') {
        try {
            const { tempUnblocks = [] } = await browser.storage.local.get('tempUnblocks');
            const now = Date.now();
            
            // Filter out expired ones and return active ones
            const activeTempUnblocks = tempUnblocks.filter(item => item.expiresAt > now);
            
            return { success: true, tempUnblocks: activeTempUnblocks };
        } catch (error) {
            console.error('Error getting temp unblocks:', error);
            return { success: false, error: "Failed to retrieve temporary unblocks" };
        }
    }
    
    // NEW: Handle requests to remove specific temporary unblocks
    else if (message.action === 'removeTempUnblock') {
        try {
            const { id } = message;
            const { tempUnblocks = [] } = await browser.storage.local.get('tempUnblocks');
            
            const updatedTempUnblocks = tempUnblocks.filter(item => item.id !== id);
            await browser.storage.local.set({ tempUnblocks: updatedTempUnblocks });
            
            return { success: true };
        } catch (error) {
            console.error('Error removing temp unblock:', error);
            return { success: false, error: "Failed to remove temporary unblock" };
        }
    }
});
