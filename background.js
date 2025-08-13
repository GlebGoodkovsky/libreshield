// File: background.js - Updated with Temporary Unblock Feature + Password Gate
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(null, (data) => {
    const defaults = {
      blockedDomains: [], 
      blockedKeywords: [], 
      allowedSites: [],
      blockPageMessage: "I don't need this.", 
      isBlockingEnabled: true, 
      theme: 'light',
      tempUnblocks: [],
      usageStats: { blocksToday: 0, blocksByValue: {} } // NEW: For stats
    };
    browser.storage.local.set({ ...defaults, ...data });
  });
  startCleanupTimer();
  
  // NEW: Set up daily alarm for stats reset
  browser.alarms.create('dailyStatReset', {
    periodInMinutes: 1440 // 24 hours
  });
});

// ★ NEW – Helper to record block events
async function recordBlock(type, value) {
  const { usageStats = { blocksToday: 0, blocksByValue: {} } } = await browser.storage.local.get('usageStats');
  
  usageStats.blocksToday = (usageStats.blocksToday || 0) + 1;
  
  const key = `${type}:${value}`;
  usageStats.blocksByValue[key] = (usageStats.blocksByValue[key] || 0) + 1;

  await browser.storage.local.set({ usageStats });
  console.log(`LibreShield: Block recorded for ${key}. Total today: ${usageStats.blocksToday}`);
}

// ★ NEW – Listener for the daily alarm
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyStatReset') {
    const { usageStats } = await browser.storage.local.get('usageStats');
    // Keep historical data but reset daily counter
    const newStats = {
        ...usageStats,
        blocksToday: 0
    };
    await browser.storage.local.set({ usageStats: newStats });
    console.log('LibreShield: Daily usage stats have been reset.');
  }
});


// ★ NEW  – PBKDF2 helper (needed by background & block page)
async function hashPassword(password, existingSalt = null) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = existingSalt || crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw', data, { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key, 256
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(salt);
  return {
    hash: hashArray.map(b => b.toString(16).padStart(2, '0')).join(''),
    salt: saltArray.map(b => b.toString(16).padStart(2, '0')).join('')
  };
}

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
  }, 60000);
}

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

  if (await isDomainTempUnblocked(domain)) {
    console.log(`LibreShield: ${domain} is temporarily unblocked`);
    return { cancel: false };
  }

  if (blockedDomains && blockedDomains.some(blocked => 
      domain === blocked || domain.endsWith('.' + blocked))) {    
    await recordBlock('domain', domain); // NEW: Record the block
    const blockPageUrl = browser.runtime.getURL('block_page/block.html');
    return { redirectUrl: `${blockPageUrl}?reason=${encodeURIComponent(`Blocked Domain: ${domain}`)}` };
  }
  return { cancel: false };
}

browser.webRequest.onBeforeRequest.addListener(blockRequestHandler,
  { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] }, ["blocking"]);

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (sender.id !== browser.runtime.id) return;

  if (message.action === 'blockPageByKeyword') {
    const keywordMatch = message.keyword.match(/Content Keyword: "(.+)"/);
    if (keywordMatch) {
      const keyword = keywordMatch[1];
      if (await isKeywordTempUnblocked(keyword)) {
        console.log(`LibreShield: Keyword "${keyword}" is temporarily unblocked`);
        return;
      }
      await recordBlock('keyword', keyword); // NEW: Record the block
    }
    const blockPageUrl = browser.runtime.getURL('block_page/block.html');
    try {
      browser.tabs.update(sender.tab.id, { url: `${blockPageUrl}?reason=${encodeURIComponent(message.keyword)}` });
    } catch (error) {
      console.error(`Failed to redirect tab: ${error.message}`);
    }
  }

  // ★ NEW  – password check added here
  else if (message.action === 'requestTempUnblock') {
    try {
      const { domain, keyword, minutes, password } = message;

      const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);
      if (passwordHash) {
        if (!password) return { success: false, error: 'Password required.' };
        const saltBytes = passwordSalt
          ? new Uint8Array(passwordSalt.match(/.{2}/g).map(b => parseInt(b, 16)))
          : null;
        const { hash: enteredHash } = await hashPassword(password, saltBytes);
        if (enteredHash !== passwordHash) return { success: false, error: 'Incorrect password.' };
      }

      if (!domain && !keyword) return { success: false, error: 'No domain or keyword specified' };
      if (!minutes || minutes < 1 || minutes > 1440) return { success: false, error: 'Invalid duration (1-1440 min).' };

      const { tempUnblocks = [] } = await browser.storage.local.get('tempUnblocks');
      const now = Date.now();
      const expiresAt = now + (minutes * 60 * 1000);

      const newTempUnblock = {
        id: `temp_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type: domain ? 'domain' : 'keyword',
        value: domain || keyword,
        createdAt: now,
        expiresAt,
        duration: minutes
      };

      const filteredTempUnblocks = tempUnblocks.filter(item => 
        !(item.type === newTempUnblock.type && item.value === newTempUnblock.value)
      );
      filteredTempUnblocks.push(newTempUnblock);
      await browser.storage.local.set({ tempUnblocks: filteredTempUnblocks });
      console.log(`LibreShield: Temporary unblock granted for ${newTempUnblock.type}: ${newTempUnblock.value} (${minutes} min)`);
      return { success: true, tempUnblock: newTempUnblock };
    } catch (error) {
      console.error('Error processing temp unblock request:', error);
      return { success: false, error: 'Internal error processing request' };
    }
  }

  else if (message.action === 'getTempUnblocks') {
    try {
      const { tempUnblocks = [] } = await browser.storage.local.get('tempUnblocks');
      const activeTempUnblocks = tempUnblocks.filter(item => item.expiresAt > Date.now());
      return { success: true, tempUnblocks: activeTempUnblocks };
    } catch (error) {
      console.error('Error getting temp unblocks:', error);
      return { success: false, error: 'Failed to retrieve temporary unblocks' };
    }
  }

  else if (message.action === 'removeTempUnblock') {
    try {
      const { id } = message;
      const { tempUnblocks = [] } = await browser.storage.local.get('tempUnblocks');
      const updatedTempUnblocks = tempUnblocks.filter(item => item.id !== id);
      await browser.storage.local.set({ tempUnblocks: updatedTempUnblocks });
      return { success: true };
    } catch (error) {
      console.error('Error removing temp unblock:', error);
      return { success: false, error: 'Failed to remove temporary unblock' };
    }
  }
});
