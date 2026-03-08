// In-memory cache for synchronous blocking decisions
let cache = {
  isBlockingEnabled: true,
  blockedDomains: [],
  allowedSites: [],
  tempUnblocks: []
};

async function initCache() {
  const data = await browser.storage.local.get(['isBlockingEnabled', 'blockedDomains', 'allowedSites', 'tempUnblocks']);
  cache.isBlockingEnabled = data.isBlockingEnabled !== false;
  cache.blockedDomains = data.blockedDomains || [];
  cache.allowedSites = data.allowedSites || [];
  cache.tempUnblocks = data.tempUnblocks || [];
}

// Keep cache in sync whenever storage changes
browser.storage.onChanged.addListener((changes) => {
  if (changes.isBlockingEnabled) cache.isBlockingEnabled = changes.isBlockingEnabled.newValue;
  if (changes.blockedDomains) cache.blockedDomains = changes.blockedDomains.newValue || [];
  if (changes.allowedSites) cache.allowedSites = changes.allowedSites.newValue || [];
  if (changes.tempUnblocks) cache.tempUnblocks = changes.tempUnblocks.newValue || [];
});

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
      usageStats: { blocksToday: 0, blocksByValue: {} }
    };
    browser.storage.local.set({ ...defaults, ...data });
  });

  browser.alarms.create('dailyStatReset', { periodInMinutes: 1440 });
  browser.alarms.create('tempUnblockCleanup', { periodInMinutes: 1 });
});

// Initialize cache on startup
initCache();

// PBKDF2 helper
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

async function recordBlock(type, value) {
  const { usageStats = { blocksToday: 0, blocksByValue: {} } } = await browser.storage.local.get('usageStats');
  usageStats.blocksToday = (usageStats.blocksToday || 0) + 1;
  const key = `${type}:${value}`;
  usageStats.blocksByValue[key] = (usageStats.blocksByValue[key] || 0) + 1;
  await browser.storage.local.set({ usageStats });
}

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyStatReset') {
    const { usageStats } = await browser.storage.local.get('usageStats');
    await browser.storage.local.set({ usageStats: { ...usageStats, blocksToday: 0 } });
    console.log('LibreShield: Daily stats reset.');
  }

  if (alarm.name === 'tempUnblockCleanup') {
    const { tempUnblocks } = await browser.storage.local.get('tempUnblocks');
    if (!tempUnblocks || tempUnblocks.length === 0) return;
    const now = Date.now();
    const active = tempUnblocks.filter(item => item.expiresAt > now);
    if (active.length !== tempUnblocks.length) {
      await browser.storage.local.set({ tempUnblocks: active });
      console.log('LibreShield: Cleaned up expired temporary unblocks.');
    }
  }
});

// Synchronous blocking handler using cache
function blockRequestHandler(details) {
  if (!cache.isBlockingEnabled) return { cancel: false };
  if (details.url.startsWith(browser.runtime.getURL(''))) return { cancel: false };

  let domain;
  try {
    domain = new URL(details.url).hostname;
  } catch (e) {
    return { cancel: false };
  }

  if (cache.allowedSites.some(allowed =>
    domain === allowed || domain.endsWith('.' + allowed)
  )) return { cancel: false };

  const now = Date.now();
  if (cache.tempUnblocks.some(item =>
    item.type === 'domain' &&
    (item.value === domain || domain.endsWith('.' + item.value)) &&
    item.expiresAt > now
  )) {
    console.log(`LibreShield: ${domain} is temporarily unblocked`);
    return { cancel: false };
  }

  if (cache.blockedDomains.some(blocked =>
    domain === blocked || domain.endsWith('.' + blocked)
  )) {
    recordBlock('domain', domain);
    const blockPageUrl = browser.runtime.getURL('block_page/block.html');
    return { redirectUrl: `${blockPageUrl}?reason=${encodeURIComponent(`Blocked Domain: ${domain}`)}` };
  }

  return { cancel: false };
}

browser.webRequest.onBeforeRequest.addListener(
  blockRequestHandler,
  { urls: ["<all_urls>"], types: ["main_frame", "sub_frame"] },
  ["blocking"]
);

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== browser.runtime.id) return false;

  if (message.action === 'blockPageByKeyword') {
    const keywordMatch = message.keyword.match(/Content Keyword: "(.+)"/);
    if (keywordMatch) {
      const keyword = keywordMatch[1];
      const now = Date.now();
      const isTempUnblocked = cache.tempUnblocks.some(item =>
        item.type === 'keyword' &&
        item.value.toLowerCase() === keyword.toLowerCase() &&
        item.expiresAt > now
      );
      if (isTempUnblocked) {
        console.log(`LibreShield: Keyword "${keyword}" is temporarily unblocked`);
        return false;
      }
      recordBlock('keyword', keyword);
    }
    const blockPageUrl = browser.runtime.getURL('block_page/block.html');
    browser.tabs.update(sender.tab.id, {
      url: `${blockPageUrl}?reason=${encodeURIComponent(message.keyword)}`
    }).catch(err => console.error(`Failed to redirect tab: ${err.message}`));
    return false;
  }

  if (message.action === 'requestTempUnblock') {
    (async () => {
      try {
        const { domain, keyword, minutes, password } = message;
        const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);

        if (passwordHash) {
          if (!password) return sendResponse({ success: false, error: 'Password required.' });
          const saltBytes = passwordSalt
            ? new Uint8Array(passwordSalt.match(/.{2}/g).map(b => parseInt(b, 16)))
            : null;
          const { hash: enteredHash } = await hashPassword(password, saltBytes);
          if (enteredHash !== passwordHash) return sendResponse({ success: false, error: 'Incorrect password.' });
        }

        if (!domain && !keyword) return sendResponse({ success: false, error: 'No domain or keyword specified.' });
        if (!minutes || minutes < 1 || minutes > 1440) return sendResponse({ success: false, error: 'Invalid duration (1-1440 min).' });

        const { tempUnblocks = [] } = await browser.storage.local.get('tempUnblocks');
        const now = Date.now();
        const newEntry = {
          id: `temp_${now}_${Math.random().toString(36).substr(2, 9)}`,
          type: domain ? 'domain' : 'keyword',
          value: domain || keyword,
          createdAt: now,
          expiresAt: now + (minutes * 60 * 1000),
          duration: minutes
        };

        const filtered = tempUnblocks.filter(item =>
          !(item.type === newEntry.type && item.value === newEntry.value)
        );
        filtered.push(newEntry);
        await browser.storage.local.set({ tempUnblocks: filtered });
        sendResponse({ success: true, tempUnblock: newEntry });
      } catch (error) {
        console.error('Error processing temp unblock:', error);
        sendResponse({ success: false, error: 'Internal error.' });
      }
    })();
    return true; // keep message channel open for async response
  }

  if (message.action === 'getTempUnblocks') {
    (async () => {
      try {
        const { tempUnblocks = [] } = await browser.storage.local.get('tempUnblocks');
        const active = tempUnblocks.filter(item => item.expiresAt > Date.now());
        sendResponse({ success: true, tempUnblocks: active });
      } catch (error) {
        sendResponse({ success: false, error: 'Failed to retrieve temporary unblocks.' });
      }
    })();
    return true;
  }

  if (message.action === 'removeTempUnblock') {
    (async () => {
      try {
        const { tempUnblocks = [] } = await browser.storage.local.get('tempUnblocks');
        await browser.storage.local.set({
          tempUnblocks: tempUnblocks.filter(item => item.id !== message.id)
        });
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: 'Failed to remove.' });
      }
    })();
    return true;
  }

  return false;
});