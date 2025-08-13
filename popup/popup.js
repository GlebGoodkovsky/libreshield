document.addEventListener("DOMContentLoaded", () => {
    const currentSiteEl = document.getElementById("currentSite");
    const blockSiteBtn = document.getElementById("blockSiteBtn");
    const allowSiteBtn = document.getElementById("allowSiteBtn");
    const openOptionsBtn = document.getElementById("openOptionsBtn");
    const powerToggle = document.getElementById("powerToggle");
    const powerStatus = document.getElementById("powerStatus");
    const blocksTodayStatEl = document.getElementById("blocksTodayStat"); // NEW
    let currentHostname = "";
    let settings = {};

    async function initialize() {
        settings = await browser.storage.local.get({
            blockedDomains: [],
            allowedSites: [],
            isBlockingEnabled: true,
            theme: "light",
            usageStats: { blocksToday: 0 } // NEW
        });
        
        document.body.classList.toggle("dark-mode", "dark" === settings.theme);
        powerToggle.checked = settings.isBlockingEnabled;
        powerStatus.textContent = settings.isBlockingEnabled ? "ON" : "OFF";
        
        // NEW: Update stats display
        blocksTodayStatEl.textContent = settings.usageStats?.blocksToday || 0;

        try {
            const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (activeTab && activeTab.url && !activeTab.url.startsWith("about:")) {
                const url = new URL(activeTab.url);
                currentHostname = url.hostname;
                currentSiteEl.textContent = currentHostname;
                updateButtonStates();
            } else {
                throw new Error("Special or invalid page");
            }
        } catch (error) {
            currentSiteEl.textContent = "N/A";
            blockSiteBtn.disabled = true;
            allowSiteBtn.disabled = true;
        }
    }

    function updateButtonStates() {
        if (!currentHostname) return;
        const isBlocked = settings.blockedDomains.includes(currentHostname);
        const isAllowed = settings.allowedSites.includes(currentHostname);
        blockSiteBtn.textContent = isBlocked ? "Already Blocked" : "Block This Site";
        blockSiteBtn.disabled = isBlocked;
        allowSiteBtn.textContent = isAllowed ? "Already Allowed" : "Allow This Site";
        allowSiteBtn.disabled = isAllowed;
    }

    async function modifyLists(listType, hostname) {
        try {
            if ("blockedDomains" === listType) {
                settings.blockedDomains.push(hostname);
                settings.allowedSites = settings.allowedSites.filter(site => site !== hostname);
            } else if ("allowedSites" === listType) {
                settings.allowedSites.push(hostname);
                settings.blockedDomains = settings.blockedDomains.filter(site => site !== hostname);
            }
            // Use the whole settings object to set, to keep usageStats etc.
            await browser.storage.local.set(settings); 
            updateButtonStates();
        } catch (error) {
            console.error('Storage error:', error);
            alert('Failed to save settings. Browser storage may be full.');
        }
    }
    
    powerToggle.addEventListener("change", () => {
        settings.isBlockingEnabled = powerToggle.checked;
        powerStatus.textContent = settings.isBlockingEnabled ? "ON" : "OFF";
        browser.storage.local.set({ isBlockingEnabled: settings.isBlockingEnabled });
    });
    
    blockSiteBtn.addEventListener("click", () => modifyLists("blockedDomains", currentHostname));
    allowSiteBtn.addEventListener("click", () => modifyLists("allowedSites", currentHostname));
    
    openOptionsBtn.addEventListener("click", () => {
        browser.runtime.openOptionsPage();
        window.close();
    });
    
    initialize();
});
