// File: content.js (Verified to respect Allowlist Precedence)

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






        const findBlockedKeywords = () => {
            if (!document.body) return false;
        
            // Use textContent instead of innerText for better performance
            const pageText = document.body.textContent.toLowerCase();
        
            for (const keyword of settings.blockedKeywords) {
                if (keyword && keyword.trim()) {
                    // Create word boundary regex for exact matches
                    const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${escaped}\\b`);
                    
                    if (regex.test(pageText)) {
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
    if (findBlockedKeywords()) {
        observer.disconnect();
    }
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