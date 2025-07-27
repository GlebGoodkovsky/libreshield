// File: content.js - Updated with Temporary Unblock Support

browser.storage.local.get(
    ['isBlockingEnabled', 'blockedKeywords', 'allowedSites'],
    (settings) => {
        // --- Step 1: Perform initial checks for power and keywords ---
        if (
            settings.isBlockingEnabled === false ||
            !settings.blockedKeywords ||
            settings.blockedKeywords.length === 0
        ) {
            return; // Exit if blocking is off or there are no keywords.
        }

        // --- Step 2: THE CRITICAL ALLOWLIST CHECK ---
        // This is the most important guard. If the site is allowed,
        // the script must stop all further execution immediately.
        const domain = window.location.hostname;
        if (settings.allowedSites && settings.allowedSites.some(allowed => 
            domain === allowed || domain.endsWith('.' + allowed))) {
            console.log(`LibreShield: ${domain} is on the allowlist. Halting content scan.`);
            return; // <-- THIS IS THE FIX.
        }

        // NEW: Function to check if keyword is temporarily unblocked
        async function isKeywordTempUnblocked(keyword) {
            try {
                const response = await browser.runtime.sendMessage({
                    action: 'getTempUnblocks'
                });
                
                if (response.success) {
                    const now = Date.now();
                    return response.tempUnblocks.some(item => 
                        item.type === 'keyword' && 
                        item.value.toLowerCase() === keyword.toLowerCase() &&
                        item.expiresAt > now
                    );
                }
                return false;
            } catch (error) {
                console.error('LibreShield: Error checking temp unblocks:', error);
                return false;
            }
        }

        const findBlockedKeywords = async () => {
            if (!document.body) return false;
        
            // Use textContent instead of innerText for better performance
            const pageText = document.body.textContent.toLowerCase();
        
            for (const keyword of settings.blockedKeywords) {
                if (keyword && keyword.trim()) {
                    // Create word boundary regex for exact matches
                    const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${escaped}\\b`);
                    
                    if (regex.test(pageText)) {
                        // NEW: Check if this keyword is temporarily unblocked
                        if (await isKeywordTempUnblocked(keyword)) {
                            console.log(`LibreShield: Keyword "${keyword}" is temporarily unblocked, skipping block`);
                            continue; // Skip this keyword and check the next one
                        }
                        
                        window.stop();
                        browser.runtime.sendMessage({
                            action: 'blockPageByKeyword',
                            keyword: `Content Keyword: "${keyword}"`
                        });
                        return true;
                    }
                }
            }
            return false;
        };

        // REPLACE WITH:
        const observer = new MutationObserver(() => {
            findBlockedKeywords().then(blocked => {
                if (blocked) {
                    observer.disconnect();
                }
            });
        });

        // Only start observing after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, { childList: true, subtree: true });
            });
        } else {
            observer.observe(document.body, { childList: true, subtree: true });
        }

        // Also run initial check
        findBlockedKeywords();
    }
);
