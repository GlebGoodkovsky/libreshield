document.addEventListener("DOMContentLoaded", () => {
    const e = document.getElementById("blockMessage");
    const t = document.getElementById("blockReason");
    browser.storage.local.get("blockPageMessage", o => {
        e.textContent = o.blockPageMessage || "I don't need this."
    });
    const o = new URLSearchParams(window.location.search).get("reason");
    o && (t.textContent = `(${o})`)
});