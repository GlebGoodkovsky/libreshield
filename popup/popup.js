document.addEventListener("DOMContentLoaded", () => {
    const e = document.getElementById("currentSite");
    const t = document.getElementById("blockSiteBtn");
    const o = document.getElementById("allowSiteBtn");
    const n = document.getElementById("openOptionsBtn");
    const d = document.getElementById("powerToggle");
    const i = document.getElementById("powerStatus");
    let a = "";
    let c = {};

    async function r() {
        c = await browser.storage.local.get({
            blockedDomains: [],
            allowedSites: [],
            isBlockingEnabled: !0,
            theme: "light"
        });
        document.body.classList.toggle("dark-mode", "dark" === c.theme);
        d.checked = c.isBlockingEnabled;
        i.textContent = c.isBlockingEnabled ? "ON" : "OFF";
        try {
            const [r] = await browser.tabs.query({ active: !0, currentWindow: !0 });
            if (r && r.url && !r.url.startsWith("about:")) {
                const t = new URL(r.url);
                a = t.hostname;
                e.textContent = a;
                s()
            } else throw new Error("Special or invalid page")
        } catch (t) {
            e.textContent = "N/A",
            blockSiteBtn.disabled = !0,
            allowSiteBtn.disabled = !0
        }
    }

    function s() {
        if (!a) return;
        const e = c.blockedDomains.includes(a),
            n = c.allowedSites.includes(a);
        t.textContent = e ? "Already Blocked" : "Block This Site",
        t.disabled = e,
        o.textContent = n ? "Already Allowed" : "Allow This Site",
        o.disabled = n
    }

    async function l(e, t) {
        try {
            if ("blockedDomains" === e) {
                c.blockedDomains.push(t);
                c.allowedSites = c.allowedSites.filter(site => site !== t);
            } else if ("allowedSites" === e) {
                c.allowedSites.push(t);
                c.blockedDomains = c.blockedDomains.filter(site => site !== t);
            }
            await browser.storage.local.set(c);
            s();
        } catch (error) {
            console.error('Storage error:', error);
            alert('Failed to save settings. Browser storage may be full.');
        }
    }
    d.addEventListener("change", () => {
        c.isBlockingEnabled = d.checked,
        i.textContent = c.isBlockingEnabled ? "ON" : "OFF",
        browser.storage.local.set({ isBlockingEnabled: c.isBlockingEnabled })
    }),
    t.addEventListener("click", () => l("blockedDomains", a)),
    o.addEventListener("click", () => l("allowedSites", a)),
    n.addEventListener("click", () => {
        browser.runtime.openOptionsPage(),
        window.close()
    }),
    r()
});