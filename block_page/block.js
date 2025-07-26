document.addEventListener("DOMContentLoaded", () => {
    const blockMessageElement = document.getElementById("blockMessage");
    const blockReasonElement = document.getElementById("blockReason");

    // Fetch the custom block message from storage.
    browser.storage.local.get("blockPageMessage", (settings) => {
        if (settings.blockPageMessage) {
            blockMessageElement.textContent = settings.blockPageMessage;
        } else {
            blockMessageElement.textContent = "I don't need this.";
        }
    });

    // Get the reason for the block from the URL.
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get("reason");
    
    if (reason) {
        blockReasonElement.textContent = `(${reason})`;
    }
});