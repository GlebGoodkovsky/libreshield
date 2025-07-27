document.addEventListener("DOMContentLoaded", () => {
    const blockMessageElement = document.getElementById("blockMessage");
    const blockReasonElement = document.getElementById("blockReason");
    
    // NEW: Temporary unblock elements
    const tempMinutesInput = document.getElementById("tempMinutes");
    const requestTempUnblockBtn = document.getElementById("requestTempUnblock");
    const minutesDisplaySpan = document.getElementById("minutesDisplay");
    const tempUnblockStatus = document.getElementById("tempUnblockStatus");

    let currentDomain = "";
    let currentKeyword = "";

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
        
        // NEW: Extract domain or keyword from reason for temporary unblock
        if (reason.startsWith("Blocked Domain:")) {
            currentDomain = reason.replace("Blocked Domain: ", "").trim();
        } else if (reason.startsWith("Content Keyword:")) {
            currentKeyword = reason.replace('Content Keyword: "', '').replace('"', '').trim();
        }
    }

    // NEW: Update minutes display when input changes
    tempMinutesInput.addEventListener("input", () => {
        const minutes = parseInt(tempMinutesInput.value) || 15;
        minutesDisplaySpan.textContent = minutes;
    });

    // NEW: Handle temporary unblock request
    requestTempUnblockBtn.addEventListener("click", async () => {
        const minutes = parseInt(tempMinutesInput.value);
        
        // Validate input
        if (!minutes || minutes < 1 || minutes > 1440) {
            showStatus("Please enter a valid number between 1 and 1440 minutes.", "error");
            return;
        }

        if (!currentDomain && !currentKeyword) {
            showStatus("Unable to determine what to unblock.", "error");
            return;
        }

        // Disable button to prevent multiple requests
        requestTempUnblockBtn.disabled = true;
        showStatus("Processing request...", "info");

        try {
            // Send message to background script to handle temporary unblock
            const response = await browser.runtime.sendMessage({
                action: 'requestTempUnblock',
                domain: currentDomain,
                keyword: currentKeyword,
                minutes: minutes
            });

            if (response.success) {
                showStatus(`Access granted for ${minutes} minutes. Redirecting...`, "success");
                
                // Redirect back to the original URL after a short delay
                setTimeout(() => {
                    if (currentDomain) {
                        // If it was a domain block, go to the domain
                        window.location.href = `https://${currentDomain}`;
                    } else {
                        // If it was a keyword block, go back in history
                        window.history.back();
                    }
                }, 2000);
            } else {
                showStatus(response.error || "Failed to grant temporary access.", "error");
                requestTempUnblockBtn.disabled = false;
            }
        } catch (error) {
            console.error("Error requesting temporary unblock:", error);
            showStatus("Error processing request. Please try again.", "error");
            requestTempUnblockBtn.disabled = false;
        }
    });

    // NEW: Function to show status messages
    function showStatus(message, type) {
        tempUnblockStatus.textContent = message;
        tempUnblockStatus.className = type;
        
        if (type === "error") {
            setTimeout(() => {
                tempUnblockStatus.textContent = "";
                tempUnblockStatus.className = "";
            }, 5000);
        }
    }

    // NEW: Enter key support for minutes input
    tempMinutesInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            requestTempUnblockBtn.click();
        }
    });
});
