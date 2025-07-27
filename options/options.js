let loginAttempts = 0;
let lockoutUntil = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 300000; // 5 minutes

// NEW: Variable to track temporary unblocks refresh interval
let tempUnblocksRefreshInterval = null;

// File: options.js (Updated with Temporary Unblocks Feature)
document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const setPasswordContainer = document.getElementById('setPasswordContainer');
    const loginContainer = document.getElementById('loginContainer');
    const settingsContainer = document.getElementById('settingsContainer');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const setPasswordBtn = document.getElementById('setPasswordBtn');
    const setPasswordError = document.getElementById('setPasswordError');
    const passwordInput = document.getElementById('passwordInput');
    const unlockBtn = document.getElementById('unlockBtn');
    const loginError = document.getElementById('loginError');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    // --- Core Authentication Logic ---
    async function hashPassword(password, existingSalt = null) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        
        // Generate or use existing salt
        const salt = existingSalt || crypto.getRandomValues(new Uint8Array(16));
        
        // Use PBKDF2 with 100,000 iterations
        const key = await crypto.subtle.importKey(
            'raw', data, { name: 'PBKDF2' }, false, ['deriveBits']
        );
        
        const hashBuffer = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            key,
            256
        );
        
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const saltArray = Array.from(salt);
        
        return {
            hash: hashArray.map(b => b.toString(16).padStart(2, '0')).join(''),
            salt: saltArray.map(b => b.toString(16).padStart(2, '0')).join('')
        };
    }

    function showAndInitializeSettings() {
        setPasswordContainer.style.display = 'none';
        loginContainer.style.display = 'none';
        settingsContainer.style.display = 'block';
        initializeSettingsFunctionality();
    }

    async function initializeAuth() {
        const { passwordHash } = await browser.storage.local.get('passwordHash');
        if (passwordHash) {
            loginContainer.style.display = 'block';
        } else {
            setPasswordContainer.style.display = 'block';
        }
    }

    async function resetAllSettings() {
        const confirmation = prompt(
            "WARNING: This will delete ALL your settings (blocklists, keywords, etc.) and remove the password. This cannot be undone.\n\nType 'RESET' to confirm."
        );
        if (confirmation === 'RESET') {
            await browser.storage.local.clear();
            loginError.textContent = 'Extension has been reset. Reloading page...';
            setTimeout(() => location.reload(), 2000);
        } else {
            loginError.textContent = 'Reset cancelled.';
        }
    }

    // --- Authentication Event Listeners ---
    setPasswordBtn.addEventListener('click', async () => {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        if (!newPassword || !confirmPassword) { setPasswordError.textContent = 'Both fields are required.'; return; }
        if (newPassword !== confirmPassword) { setPasswordError.textContent = 'Passwords do not match.'; return; }
        const hashData = await hashPassword(newPassword);
        await browser.storage.local.set({ 
            passwordHash: hashData.hash,
            passwordSalt: hashData.salt 
        });
        showAndInitializeSettings();
    });

    unlockBtn.addEventListener('click', async () => {
        if (Date.now() < lockoutUntil) {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 60000);
            loginError.textContent = `Too many attempts. Try again in ${remaining} minutes.`;
            return;
        }
        
        const enteredPassword = passwordInput.value;
        if (!enteredPassword) { 
            loginError.textContent = 'Password is required.'; 
            return; 
        }
        
        const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);
        let salt = null;
        if (passwordSalt) {
            salt = new Uint8Array(passwordSalt.match(/.{2}/g).map(byte => parseInt(byte, 16)));
        }
        const enteredHashData = await hashPassword(enteredPassword, salt);
        if (enteredHashData.hash === passwordHash) {
            loginAttempts = 0;
            showAndInitializeSettings();
        } else {
            loginAttempts++;
            if (loginAttempts >= MAX_ATTEMPTS) {
                lockoutUntil = Date.now() + LOCKOUT_TIME;
                loginError.textContent = `Too many attempts. Locked for 5 minutes.`;
            } else {
                loginError.textContent = `Incorrect password. ${MAX_ATTEMPTS - loginAttempts} attempts remaining.`;
            }
            passwordInput.value = '';
        }
    });

    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') unlockBtn.click(); });
    forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); resetAllSettings(); });

    // --- All settings functionality is now inside this function ---
    function initializeSettingsFunctionality() {
        const themeToggle = document.getElementById('theme-toggle');
        const messageInput = document.getElementById('blockPageMessage');
        const saveButton = document.getElementById('saveButton');
        const statusDiv = document.getElementById('status');
        const exportSettingsBtn = document.getElementById('exportSettingsBtn');
        const importSettingsBtn = document.getElementById('importSettingsBtn');
        const saveConfirmationContainer = document.getElementById('saveConfirmationContainer');
        const savePasswordConfirmInput = document.getElementById('savePasswordConfirm');
        const confirmSaveBtn = document.getElementById('confirmSaveBtn');
        const cancelSaveBtn = document.getElementById('cancelSaveBtn');
        const saveConfirmError = document.getElementById('saveConfirmError');
        const managePasswordBtn = document.getElementById('managePasswordBtn');
        const passwordManagementContainer = document.getElementById('passwordManagementContainer');
        const currentPasswordInput = document.getElementById('currentPassword');
        const manageNewPasswordInput = document.getElementById('manageNewPassword');
        const manageConfirmPasswordInput = document.getElementById('manageConfirmPassword');
        const confirmPasswordChangeBtn = document.getElementById('confirmPasswordChangeBtn');
        const removePasswordBtn = document.getElementById('removePasswordBtn');
        const passwordManageError = document.getElementById('passwordManageError');
        
        // NEW: Temporary unblocks elements
        const tempUnblocksList = document.getElementById('tempUnblocksList');
        const refreshTempUnblocksBtn = document.getElementById('refreshTempUnblocks');

        const listConfigurations = [
            { listId: 'blockedDomainsList', inputId: 'newDomain', buttonId: 'addDomain', storageKey: 'blockedDomains', dataArray: [] },
            { listId: 'blockedKeywordsList', inputId: 'newKeyword', buttonId: 'addKeyword', storageKey: 'blockedKeywords', dataArray: [] },
            { listId: 'allowedSitesList', inputId: 'newAllowedSite', buttonId: 'addAllowedSite', storageKey: 'allowedSites', dataArray: [] }
        ];

        function loadSettings() {
            const keysToGet = ['blockPageMessage', 'theme', ...listConfigurations.map(c => c.storageKey)];
            browser.storage.local.get(keysToGet, (data) => {
                messageInput.value = data.blockPageMessage || "I don't need this.";
                listConfigurations.forEach(config => {
                    config.dataArray = data[config.storageKey] || [];
                    renderList(document.getElementById(config.listId), config.dataArray);
                });
                if (data.theme === 'dark') {
                    document.body.classList.add('dark-mode');
                    themeToggle.checked = true;
                }
            });
            
            // NEW: Load temporary unblocks
            loadTempUnblocks();
        }

        // NEW: Function to load and display temporary unblocks
        async function loadTempUnblocks() {
            try {
                const response = await browser.runtime.sendMessage({ action: 'getTempUnblocks' });
                if (response.success) {
                    renderTempUnblocks(response.tempUnblocks);
                } else {
                    console.error('Failed to load temp unblocks:', response.error);
                    renderTempUnblocks([]);
                }
            } catch (error) {
                console.error('Error loading temp unblocks:', error);
                renderTempUnblocks([]);
            }
        }

        // NEW: Function to render temporary unblocks list
        function renderTempUnblocks(tempUnblocks) {
            tempUnblocksList.innerHTML = '';
            
            if (!tempUnblocks || tempUnblocks.length === 0) {
                const li = document.createElement('li');
                li.classList.add('no-items');
                li.textContent = 'No active temporary unblocks.';
                tempUnblocksList.appendChild(li);
                return;
            }

            tempUnblocks.forEach(unblock => {
                const li = document.createElement('li');
                
                const now = Date.now();
                const timeRemaining = Math.max(0, unblock.expiresAt - now);
                const totalDuration = unblock.expiresAt - unblock.createdAt;
                const progress = Math.max(0, Math.min(100, ((totalDuration - timeRemaining) / totalDuration) * 100));
                
                const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
                const hoursRemaining = Math.floor(minutesRemaining / 60);
                const displayMinutes = minutesRemaining % 60;
                
                let timeDisplay;
                if (hoursRemaining > 0) {
                    timeDisplay = `${hoursRemaining}h ${displayMinutes}m`;
                } else {
                    timeDisplay = `${minutesRemaining}m`;
                }

                li.innerHTML = `
                    <div class="temp-unblock-header">
                        <div class="temp-unblock-title">${unblock.value}</div>
                        <div class="temp-unblock-type">${unblock.type}</div>
                    </div>
                    <div class="temp-unblock-details">
                        <div class="temp-unblock-time">
                            <div>Duration: ${unblock.duration} minutes</div>
                            <div>Remaining: <span class="temp-unblock-countdown">${timeDisplay}</span></div>
                        </div>
                        <div class="temp-unblock-actions">
                            <button class="temp-unblock-remove-btn" data-id="${unblock.id}">Remove</button>
                        </div>
                    </div>
                    <div class="temp-unblock-progress">
                        <div class="temp-unblock-progress-bar" style="width: ${progress}%"></div>
                    </div>
                `;
                
                tempUnblocksList.appendChild(li);
            });

            // Add event listeners for remove buttons
            tempUnblocksList.querySelectorAll('.temp-unblock-remove-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    await removeTempUnblock(id);
                });
            });
        }

        // NEW: Function to remove a temporary unblock
        async function removeTempUnblock(id) {
            try {
                const response = await browser.runtime.sendMessage({ 
                    action: 'removeTempUnblock', 
                    id: id 
                });
                
                if (response.success) {
                    statusDiv.textContent = 'Temporary unblock removed successfully.';
                    setTimeout(() => statusDiv.textContent = '', 2000);
                    loadTempUnblocks(); // Refresh the list
                } else {
                    statusDiv.textContent = 'Failed to remove temporary unblock.';
                    setTimeout(() => statusDiv.textContent = '', 3000);
                }
            } catch (error) {
                console.error('Error removing temp unblock:', error);
                statusDiv.textContent = 'Error removing temporary unblock.';
                setTimeout(() => statusDiv.textContent = '', 3000);
            }
        }

        // NEW: Auto-refresh temporary unblocks every minute
        function startTempUnblocksAutoRefresh() {
            if (tempUnblocksRefreshInterval) {
                clearInterval(tempUnblocksRefreshInterval);
            }
            
            tempUnblocksRefreshInterval = setInterval(() => {
                loadTempUnblocks();
            }, 60000); // Refresh every minute
        }

        function renderList(ulElement, itemsArray) {
            ulElement.innerHTML = '';
            if (itemsArray.length === 0) { ulElement.innerHTML = `<li style="font-style: italic; color: var(--subtle-text-color); justify-content: center;">No items added yet.</li>`; return; }
            itemsArray.forEach(item => {
                const li = document.createElement('li'); li.textContent = item;
                const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'X'; deleteBtn.classList.add('delete-btn');
                deleteBtn.onclick = () => removeItem(item, itemsArray, ulElement);
                li.appendChild(deleteBtn); ulElement.appendChild(li);
            });
        }

        async function addItem(inputElement, itemsArray, ulElement) {
            const rawInput = inputElement.value.trim(); if (!rawInput) return;
            const itemsToAdd = rawInput.includes(',') ? rawInput.split(',').map(s => s.trim()).filter(Boolean) : [rawInput];
            let addedCount = 0; itemsToAdd.forEach(item => { if (!itemsArray.includes(item)) { itemsArray.push(item); addedCount++; } });
            if (addedCount > 0) {
                const storageKey = ulElement.id.replace('List', ''); await browser.storage.local.set({ [storageKey]: itemsArray });
                renderList(ulElement, itemsArray); inputElement.value = ''; statusDiv.textContent = `Added ${addedCount} new item(s).`;
            } else { statusDiv.textContent = 'Item(s) already in list.'; }
            setTimeout(() => statusDiv.textContent = '', 2000);
        }

        async function removeItem(itemToRemove, itemsArray, ulElement) {
            const index = itemsArray.indexOf(itemToRemove);
            if (index > -1) {
                itemsArray.splice(index, 1); const storageKey = ulElement.id.replace('List', '');
                await browser.storage.local.set({ [storageKey]: itemsArray });
                renderList(ulElement, itemsArray); statusDiv.textContent = `Removed: ${itemToRemove}`;
                setTimeout(() => statusDiv.textContent = '', 2000);
            }
        }

        async function exportSettings() {
            statusDiv.textContent = 'Exporting...';
            try {
                const settingsToExport = await browser.storage.local.get(null);
                const jsonString = JSON.stringify(settingsToExport, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = `libreshield-settings-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url); statusDiv.textContent = 'Settings exported successfully!';
            } catch (error) { console.error('Error exporting settings:', error); statusDiv.textContent = 'Error during export.'; }
            setTimeout(() => statusDiv.textContent = '', 3000);
        }

        function importSettings() {
            const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
            input.onchange = e => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = readerEvent => {
                    try {
                        const importedSettings = JSON.parse(readerEvent.target.result);
                        browser.storage.local.set(importedSettings, () => {
                            if (browser.runtime.lastError) { throw new Error(browser.runtime.lastError.message); }
                            statusDiv.textContent = 'Settings imported! Reloading...';
                            setTimeout(() => location.reload(), 1500);
                        });
                    } catch (error) { console.error('Error parsing imported file:', error); statusDiv.textContent = 'Error: Invalid or corrupted settings file.'; setTimeout(() => statusDiv.textContent = '', 3000); }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        listConfigurations.forEach(config => {
            const inputEl = document.getElementById(config.inputId); const buttonEl = document.getElementById(config.buttonId); const listEl = document.getElementById(config.listId);
            buttonEl.addEventListener('click', () => addItem(inputEl, config.dataArray, listEl));
            inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(inputEl, config.dataArray, listEl); } });
        });
        
        themeToggle.addEventListener('change', () => { const theme = themeToggle.checked ? 'dark' : 'light'; document.body.classList.toggle('dark-mode', themeToggle.checked); browser.storage.local.set({ theme }); });
        exportSettingsBtn.addEventListener('click', exportSettings);
        importSettingsBtn.addEventListener('click', importSettings);

        // NEW: Temporary unblocks event listeners
        refreshTempUnblocksBtn.addEventListener('click', loadTempUnblocks);

        saveButton.addEventListener('click', () => { saveConfirmationContainer.style.display = 'block'; saveButton.style.display = 'none'; statusDiv.textContent = ''; });
        function resetSaveUi() { saveConfirmationContainer.style.display = 'none'; savePasswordConfirmInput.value = ''; saveConfirmError.textContent = ''; saveButton.style.display = 'block'; }
        
        confirmSaveBtn.addEventListener('click', async () => {
            const enteredPassword = savePasswordConfirmInput.value;
            if (!enteredPassword) {
                saveConfirmError.textContent = 'Password is required to confirm.';
                return;
            }
        
            // This logic correctly verifies the entered password against the stored hash and salt.
            const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);
            const saltBytes = passwordSalt ? new Uint8Array(passwordSalt.match(/.{2}/g).map(byte => parseInt(byte, 16))) : null;
            const enteredHashData = await hashPassword(enteredPassword, saltBytes);
        
            // Check if the password is correct
            if (enteredHashData.hash === passwordHash) {
                // 1. Save the new message to storage
                await browser.storage.local.set({ blockPageMessage: messageInput.value });
        
                // 2. Show a success message
                statusDiv.textContent = 'Settings saved successfully!';
                setTimeout(() => { statusDiv.textContent = ''; }, 2000);
                
                // 3. Hide the password confirmation UI
                resetSaveUi();
        
                // 4. *** THIS IS THE FIX ***
                // Reload all settings from storage to make sure the page shows the latest saved data.
                loadSettings();
        
            } else {
                // Handle incorrect password
                saveConfirmError.textContent = 'Incorrect password. Please try again.';
                savePasswordConfirmInput.value = '';
            }
        });

        cancelSaveBtn.addEventListener('click', () => { resetSaveUi(); });

        managePasswordBtn.addEventListener('click', () => { 
            const isVisible = passwordManagementContainer.style.display === 'block'; passwordManagementContainer.style.display = isVisible ? 'none' : 'block'; });
        confirmPasswordChangeBtn.addEventListener('click', async () => {
            const currentPassword = currentPasswordInput.value; 
            const newPassword = manageNewPasswordInput.value; 
            const confirmPassword = manageConfirmPasswordInput.value;
            passwordManageError.textContent = ''; if (!currentPassword) { passwordManageError.textContent = 'Current password is required.'; return; }
            const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);
            let salt = null;
            if (passwordSalt) {
                salt = new Uint8Array(passwordSalt.match(/.{2}/g).map(byte => parseInt(byte, 16)));
            }
            const currentHashData = await hashPassword(currentPassword, salt);
            if (currentHashData.hash !== passwordHash) { passwordManageError.textContent = 'Incorrect current password.'; return; }
            if (!newPassword && !confirmPassword) { passwordManageError.textContent = 'No changes to save.'; return; }
            if (newPassword !== confirmPassword) { passwordManageError.textContent = 'New passwords do not match.'; return; }
            const newHashData = await hashPassword(newPassword);
            await browser.storage.local.set({ 
                passwordHash: newHashData.hash,
                passwordSalt: newHashData.salt 
            });
            statusDiv.textContent = 'Password changed successfully!'; passwordManagementContainer.style.display = 'none';
            currentPasswordInput.value = ''; manageNewPasswordInput.value = ''; manageConfirmPasswordInput.value = '';
            setTimeout(() => statusDiv.textContent = '', 3000);
        });
        removePasswordBtn.addEventListener('click', async () => {
            const currentPassword = currentPasswordInput.value; passwordManageError.textContent = ''; if (!currentPassword) { passwordManageError.textContent = 'Current password is required to remove protection.'; return; }
            const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);
            let salt = null;
            if (passwordSalt) {
                salt = new Uint8Array(passwordSalt.match(/.{2}/g).map(byte => parseInt(byte, 16)));
            }
            const currentHashData = await hashPassword(currentPassword, salt);
            if (currentHashData.hash === passwordHash) {
                if (confirm("Are you sure you want to remove password protection? Settings will be accessible to anyone with browser access.")) {
                    await browser.storage.local.remove(['passwordHash', 'passwordSalt']); statusDiv.textContent = 'Password protection removed! Reloading...'; setTimeout(() => location.reload(), 2000);
                }
            } else { passwordManageError.textContent = 'Incorrect current password.'; }
        });

        // NEW: Start auto-refresh for temporary unblocks
        startTempUnblocksAutoRefresh();

        loadSettings();
    }
    initializeAuth();
});
