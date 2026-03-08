const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 300000; // 5 minutes

let tempUnblocksRefreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
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

    async function hashPassword(password, existingSalt = null) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const salt = existingSalt || crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.importKey(
            'raw', data, { name: 'PBKDF2' }, false, ['deriveBits']
        );
        const hashBuffer = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            key, 256
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
        const { passwordHash, theme } = await browser.storage.local.get(['passwordHash', 'theme']);
        if (theme === 'dark') document.body.classList.add('dark-mode');
        if (passwordHash) {
            loginContainer.style.display = 'block';
        } else {
            setPasswordContainer.style.display = 'block';
        }
    }

    async function resetAllSettings() {
        // Replace the prompt() with an inline confirmation UI
        loginError.textContent = '';
        const confirmed = await showInlineConfirm(
            loginError,
            "This will delete ALL settings and remove the password. Type RESET to confirm:",
            "RESET"
        );
        if (confirmed) {
            await browser.storage.local.clear();
            loginError.textContent = 'Extension has been reset. Reloading...';
            setTimeout(() => location.reload(), 2000);
        } else {
            loginError.textContent = 'Reset cancelled.';
            setTimeout(() => loginError.textContent = '', 2000);
        }
    }

    // Replaces native prompt() with an inline input confirmation
    function showInlineConfirm(container, message, expectedValue) {
        return new Promise((resolve) => {
            container.innerHTML = '';
            const msg = document.createElement('p');
            msg.textContent = message;
            msg.style.marginBottom = '8px';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = expectedValue;
            input.style.cssText = 'width:100%;padding:8px;margin-bottom:8px;box-sizing:border-box;border:1px solid var(--border-color);border-radius:4px;background:var(--card-background);color:var(--text-color);';

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm';
            confirmBtn.style.cssText = 'flex:1;padding:8px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = 'flex:1;padding:8px;background:#6c757d;color:#fff;border:none;border-radius:4px;cursor:pointer;';

            btnRow.appendChild(confirmBtn);
            btnRow.appendChild(cancelBtn);
            container.appendChild(msg);
            container.appendChild(input);
            container.appendChild(btnRow);

            confirmBtn.addEventListener('click', () => {
                container.innerHTML = '';
                resolve(input.value === expectedValue);
            });
            cancelBtn.addEventListener('click', () => {
                container.innerHTML = '';
                resolve(false);
            });
        });
    }

    setPasswordBtn.addEventListener('click', async () => {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        if (!newPassword || !confirmPassword) { setPasswordError.textContent = 'Both fields are required.'; return; }
        if (newPassword !== confirmPassword) { setPasswordError.textContent = 'Passwords do not match.'; return; }
        const hashData = await hashPassword(newPassword);
        await browser.storage.local.set({ passwordHash: hashData.hash, passwordSalt: hashData.salt });
        showAndInitializeSettings();
    });

    unlockBtn.addEventListener('click', async () => {
        // Load lockout state from storage instead of memory
        const { loginAttempts = 0, lockoutUntil = 0 } = await browser.storage.local.get(['loginAttempts', 'lockoutUntil']);

        if (Date.now() < lockoutUntil) {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 60000);
            loginError.textContent = `Too many attempts. Try again in ${remaining} minute(s).`;
            return;
        }

        const enteredPassword = passwordInput.value;
        if (!enteredPassword) { loginError.textContent = 'Password is required.'; return; }

        const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);
        const salt = passwordSalt
            ? new Uint8Array(passwordSalt.match(/.{2}/g).map(b => parseInt(b, 16)))
            : null;
        const enteredHashData = await hashPassword(enteredPassword, salt);

        if (enteredHashData.hash === passwordHash) {
            await browser.storage.local.set({ loginAttempts: 0, lockoutUntil: 0 });
            showAndInitializeSettings();
        } else {
            const newAttempts = loginAttempts + 1;
            if (newAttempts >= MAX_ATTEMPTS) {
                const newLockout = Date.now() + LOCKOUT_TIME;
                await browser.storage.local.set({ loginAttempts: newAttempts, lockoutUntil: newLockout });
                loginError.textContent = 'Too many attempts. Locked for 5 minutes.';
            } else {
                await browser.storage.local.set({ loginAttempts: newAttempts, lockoutUntil: 0 });
                loginError.textContent = `Incorrect password. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`;
            }
            passwordInput.value = '';
        }
    });

    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') unlockBtn.click(); });
    forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); resetAllSettings(); });

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
            loadTempUnblocks();
        }

        async function loadTempUnblocks() {
            try {
                const response = await browser.runtime.sendMessage({ action: 'getTempUnblocks' });
                renderTempUnblocks(response.success ? response.tempUnblocks : []);
            } catch (error) {
                renderTempUnblocks([]);
            }
        }

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
                const minutesRemaining = Math.ceil(timeRemaining / 60000);
                const hoursRemaining = Math.floor(minutesRemaining / 60);
                const timeDisplay = hoursRemaining > 0
                    ? `${hoursRemaining}h ${minutesRemaining % 60}m`
                    : `${minutesRemaining}m`;

                const header = document.createElement('div');
                header.className = 'temp-unblock-header';
                const title = document.createElement('div');
                title.className = 'temp-unblock-title';
                title.textContent = unblock.value;
                const type = document.createElement('div');
                type.className = 'temp-unblock-type';
                type.textContent = unblock.type;
                header.appendChild(title);
                header.appendChild(type);

                const details = document.createElement('div');
                details.className = 'temp-unblock-details';
                const timeContainer = document.createElement('div');
                timeContainer.className = 'temp-unblock-time';
                const durationDiv = document.createElement('div');
                durationDiv.textContent = `Duration: ${unblock.duration} minutes`;
                const remainingDiv = document.createElement('div');
                remainingDiv.textContent = 'Remaining: ';
                const countdownSpan = document.createElement('span');
                countdownSpan.className = 'temp-unblock-countdown';
                countdownSpan.textContent = timeDisplay;
                remainingDiv.appendChild(countdownSpan);
                timeContainer.appendChild(durationDiv);
                timeContainer.appendChild(remainingDiv);

                const actions = document.createElement('div');
                actions.className = 'temp-unblock-actions';
                const removeBtn = document.createElement('button');
                removeBtn.className = 'temp-unblock-remove-btn';
                removeBtn.dataset.id = unblock.id;
                removeBtn.textContent = 'Remove';
                actions.appendChild(removeBtn);

                details.appendChild(timeContainer);
                details.appendChild(actions);

                const progressContainer = document.createElement('div');
                progressContainer.className = 'temp-unblock-progress';
                const progressBar = document.createElement('div');
                progressBar.className = 'temp-unblock-progress-bar';
                progressBar.style.width = `${progress}%`;
                progressContainer.appendChild(progressBar);

                li.appendChild(header);
                li.appendChild(details);
                li.appendChild(progressContainer);
                tempUnblocksList.appendChild(li);
            });

            tempUnblocksList.querySelectorAll('.temp-unblock-remove-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    await removeTempUnblock(e.target.getAttribute('data-id'));
                });
            });
        }

        async function removeTempUnblock(id) {
            try {
                const response = await browser.runtime.sendMessage({ action: 'removeTempUnblock', id });
                statusDiv.textContent = response.success
                    ? 'Temporary unblock removed.'
                    : 'Failed to remove temporary unblock.';
                setTimeout(() => statusDiv.textContent = '', 2000);
                if (response.success) loadTempUnblocks();
            } catch (error) {
                statusDiv.textContent = 'Error removing temporary unblock.';
                setTimeout(() => statusDiv.textContent = '', 3000);
            }
        }

        function startTempUnblocksAutoRefresh() {
            if (tempUnblocksRefreshInterval) clearInterval(tempUnblocksRefreshInterval);
            tempUnblocksRefreshInterval = setInterval(loadTempUnblocks, 60000);
        }

        function renderList(ulElement, itemsArray) {
            ulElement.innerHTML = '';
            if (itemsArray.length === 0) {
                ulElement.innerHTML = `<li style="font-style:italic;color:var(--subtle-text-color);justify-content:center;">No items added yet.</li>`;
                return;
            }
            itemsArray.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'X';
                deleteBtn.classList.add('delete-btn');
                deleteBtn.onclick = () => removeItem(item, itemsArray, ulElement);
                li.appendChild(deleteBtn);
                ulElement.appendChild(li);
            });
        }

        async function addItem(inputElement, itemsArray, ulElement) {
            const rawInput = inputElement.value.trim();
            if (!rawInput) return;
            const itemsToAdd = rawInput.includes(',')
                ? rawInput.split(',').map(s => s.trim()).filter(Boolean)
                : [rawInput];
            let addedCount = 0;
            itemsToAdd.forEach(item => { if (!itemsArray.includes(item)) { itemsArray.push(item); addedCount++; } });
            if (addedCount > 0) {
                const config = listConfigurations.find(c => c.listId === ulElement.id);
                if (config) await browser.storage.local.set({ [config.storageKey]: itemsArray });
                renderList(ulElement, itemsArray);
                inputElement.value = '';
                statusDiv.textContent = `Added ${addedCount} new item(s).`;
            } else {
                statusDiv.textContent = 'Item(s) already in list.';
            }
            setTimeout(() => statusDiv.textContent = '', 2000);
        }

        async function removeItem(itemToRemove, itemsArray, ulElement) {
            const index = itemsArray.indexOf(itemToRemove);
            if (index > -1) {
                itemsArray.splice(index, 1);
                const config = listConfigurations.find(c => c.listId === ulElement.id);
                if (config) await browser.storage.local.set({ [config.storageKey]: itemsArray });
                renderList(ulElement, itemsArray);
                statusDiv.textContent = `Removed: ${itemToRemove}`;
                setTimeout(() => statusDiv.textContent = '', 2000);
            }
        }

        async function exportSettings() {
            statusDiv.textContent = 'Exporting...';
            try {
                const all = await browser.storage.local.get(null);
                // Strip password data from export for security
                const { passwordHash, passwordSalt, loginAttempts, lockoutUntil, ...safeSettings } = all;
                const blob = new Blob([JSON.stringify(safeSettings, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `libreshield-settings-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                statusDiv.textContent = 'Settings exported successfully!';
            } catch (error) {
                statusDiv.textContent = 'Error during export.';
            }
            setTimeout(() => statusDiv.textContent = '', 3000);
        }

        function importSettings() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = readerEvent => {
                    try {
                        const importedSettings = JSON.parse(readerEvent.target.result);
                        browser.storage.local.set(importedSettings, () => {
                            if (browser.runtime.lastError) throw new Error(browser.runtime.lastError.message);
                            statusDiv.textContent = 'Settings imported! Reloading...';
                            setTimeout(() => location.reload(), 1500);
                        });
                    } catch (error) {
                        statusDiv.textContent = 'Error: Invalid or corrupted settings file.';
                        setTimeout(() => statusDiv.textContent = '', 3000);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        listConfigurations.forEach(config => {
            const inputEl = document.getElementById(config.inputId);
            const buttonEl = document.getElementById(config.buttonId);
            const listEl = document.getElementById(config.listId);
            buttonEl.addEventListener('click', () => addItem(inputEl, config.dataArray, listEl));
            inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(inputEl, config.dataArray, listEl); } });
        });

        themeToggle.addEventListener('change', () => {
            const theme = themeToggle.checked ? 'dark' : 'light';
            document.body.classList.toggle('dark-mode', themeToggle.checked);
            browser.storage.local.set({ theme });
        });

        exportSettingsBtn.addEventListener('click', exportSettings);
        importSettingsBtn.addEventListener('click', importSettings);
        refreshTempUnblocksBtn.addEventListener('click', loadTempUnblocks);

        saveButton.addEventListener('click', () => {
            saveConfirmationContainer.style.display = 'block';
            saveButton.style.display = 'none';
            statusDiv.textContent = '';
        });

        function resetSaveUi() {
            saveConfirmationContainer.style.display = 'none';
            savePasswordConfirmInput.value = '';
            saveConfirmError.textContent = '';
            saveButton.style.display = 'block';
        }

        confirmSaveBtn.addEventListener('click', async () => {
            const enteredPassword = savePasswordConfirmInput.value;
            if (!enteredPassword) { saveConfirmError.textContent = 'Password is required to confirm.'; return; }
            const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);
            const saltBytes = passwordSalt
                ? new Uint8Array(passwordSalt.match(/.{2}/g).map(b => parseInt(b, 16)))
                : null;
            const enteredHashData = await hashPassword(enteredPassword, saltBytes);
            if (enteredHashData.hash === passwordHash) {
                await browser.storage.local.set({ blockPageMessage: messageInput.value });
                statusDiv.textContent = 'Settings saved successfully!';
                setTimeout(() => statusDiv.textContent = '', 2000);
                resetSaveUi();
                loadSettings();
            } else {
                saveConfirmError.textContent = 'Incorrect password. Please try again.';
                savePasswordConfirmInput.value = '';
            }
        });

        cancelSaveBtn.addEventListener('click', resetSaveUi);

        managePasswordBtn.addEventListener('click', () => {
            const isVisible = passwordManagementContainer.style.display === 'block';
            passwordManagementContainer.style.display = isVisible ? 'none' : 'block';
        });

        confirmPasswordChangeBtn.addEventListener('click', async () => {
            const currentPassword = currentPasswordInput.value;
            const newPassword = manageNewPasswordInput.value;
            const confirmPassword = manageConfirmPasswordInput.value;
            passwordManageError.textContent = '';
            if (!currentPassword) { passwordManageError.textContent = 'Current password is required.'; return; }
            const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);
            const salt = passwordSalt
                ? new Uint8Array(passwordSalt.match(/.{2}/g).map(b => parseInt(b, 16)))
                : null;
            const currentHashData = await hashPassword(currentPassword, salt);
            if (currentHashData.hash !== passwordHash) { passwordManageError.textContent = 'Incorrect current password.'; return; }
            if (!newPassword && !confirmPassword) { passwordManageError.textContent = 'No changes to save.'; return; }
            if (newPassword !== confirmPassword) { passwordManageError.textContent = 'New passwords do not match.'; return; }
            const newHashData = await hashPassword(newPassword);
            await browser.storage.local.set({ passwordHash: newHashData.hash, passwordSalt: newHashData.salt });
            statusDiv.textContent = 'Password changed successfully!';
            passwordManagementContainer.style.display = 'none';
            currentPasswordInput.value = '';
            manageNewPasswordInput.value = '';
            manageConfirmPasswordInput.value = '';
            setTimeout(() => statusDiv.textContent = '', 3000);
        });

        removePasswordBtn.addEventListener('click', async () => {
            const currentPassword = currentPasswordInput.value;
            passwordManageError.textContent = '';
            if (!currentPassword) { passwordManageError.textContent = 'Current password is required to remove protection.'; return; }
            const { passwordHash, passwordSalt } = await browser.storage.local.get(['passwordHash', 'passwordSalt']);
            const salt = passwordSalt
                ? new Uint8Array(passwordSalt.match(/.{2}/g).map(b => parseInt(b, 16)))
                : null;
            const currentHashData = await hashPassword(currentPassword, salt);
            if (currentHashData.hash !== passwordHash) { passwordManageError.textContent = 'Incorrect current password.'; return; }

            // Replace confirm() with inline UI
            passwordManageError.innerHTML = '';
            const warning = document.createElement('p');
            warning.textContent = 'Are you sure? Settings will be accessible to anyone with browser access.';
            warning.style.color = '#e74c3c';

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;';

            const yesBtn = document.createElement('button');
            yesBtn.textContent = 'Yes, remove password';
            yesBtn.style.cssText = 'flex:1;padding:8px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;';

            const noBtn = document.createElement('button');
            noBtn.textContent = 'Cancel';
            noBtn.style.cssText = 'flex:1;padding:8px;background:#6c757d;color:#fff;border:none;border-radius:4px;cursor:pointer;';

            btnRow.appendChild(yesBtn);
            btnRow.appendChild(noBtn);
            passwordManageError.appendChild(warning);
            passwordManageError.appendChild(btnRow);

            yesBtn.addEventListener('click', async () => {
                await browser.storage.local.remove(['passwordHash', 'passwordSalt']);
                statusDiv.textContent = 'Password protection removed! Reloading...';
                setTimeout(() => location.reload(), 2000);
            });

            noBtn.addEventListener('click', () => {
                passwordManageError.innerHTML = '';
            });
        });

        startTempUnblocksAutoRefresh();
        loadSettings();
    }

    initializeAuth();
});