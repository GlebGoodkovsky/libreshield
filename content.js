// File: content.js (Verified to respect Allowlist Precedence)

chrome.storage.local.get(
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
        if (settings.allowedSites && settings.allowedSites.some(allowed => domain.includes(allowed))) {
            console.log(`LibreShield: ${domain} is on the allowlist. Halting content scan.`);
            return; // <-- THIS IS THE FIX.
        }

        // --- Step 3: The keyword scanning function (only runs if site is NOT allowed) ---
        const findBlockedKeywords = () => {
            if (!document.body) return false;

            const pageText = document.body.innerText.toLowerCase();

            for (const keyword of settings.blockedKeywords) {
                if (keyword && pageText.includes(keyword.toLowerCase())) {
                    window.stop();
                    chrome.runtime.sendMessage({
                        action: 'blockPageByKeyword',
                        keyword: `Content Keyword: "${keyword}"`
                    });
                    return true;
                }
            }
            return false;
        };

        // --- Step 4: Run the scanner repeatedly ---
        let checkCount = 0;
        const intervalId = setInterval(() => {
            if (findBlockedKeywords()) {
                clearInterval(intervalId);
            }
            checkCount++;
            if (checkCount > 50) {
                clearInterval(intervalId);
            }
        }, 100);
    }
);