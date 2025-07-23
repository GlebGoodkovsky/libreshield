document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    // Authentication elements
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

    // Settings elements (to be used after unlock)
    const themeToggle = document.getElementById('theme-toggle');
    const messageInput = document.getElementById('blockPageMessage');
    const saveButton = document.getElementById('saveButton');
    const statusDiv = document.getElementById('status');
    const exportSettingsBtn = document.getElementById('exportSettingsBtn');
    const importSettingsBtn = document.getElementById('importSettingsBtn');

    // New Save Confirmation elements
    const saveConfirmationContainer = document.getElementById('saveConfirmationContainer');
    const savePasswordConfirmInput = document.getElementById('savePasswordConfirm');
    const confirmSaveBtn = document.getElementById('confirmSaveBtn');
    const cancelSaveBtn = document.getElementById('cancelSaveBtn');
    const saveConfirmError = document.getElementById('saveConfirmError');

    const listConfigurations = [
        { listId: 'blockedDomainsList', inputId: 'newDomain', buttonId: 'addDomain', storageKey: 'blockedDomains', dataArray: [] },
        { listId: 'blockedKeywordsList', inputId: 'newKeyword', buttonId: 'addKeyword', storageKey: 'blockedKeywords', dataArray: [] },
        { listId: 'allowedSitesList', inputId: 'newAllowedSite', buttonId: 'addAllowedSite', storageKey: 'allowedSites', dataArray: [] }
    ];

    // --- Core Authentication Logic ---

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function showAndInitializeSettings() {
        setPasswordContainer.style.display = 'none';
        loginContainer.style.display = 'none';
        settingsContainer.style.display = 'block';
        initializeSettingsFunctionality();
    }

    async function initializeAuth() {
        const { passwordHash } = await chrome.storage.local.get('passwordHash');
        if (passwordHash) {
            loginContainer.style.display = 'block';
        } else {
            setPasswordContainer.style.display = 'block';
        }
    }

    // --- Authentication Event Listeners ---
    setPasswordBtn.addEventListener('click', async () => {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        if (!newPassword || !confirmPassword) {
            setPasswordError.textContent = 'Both fields are required.';
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError.textContent = 'Passwords do not match.';
            return;
        }
        const hash = await hashPassword(newPassword);
        await chrome.storage.local.set({ passwordHash: hash });
        showAndInitializeSettings();
    });

    unlockBtn.addEventListener('click', async () => {
        const enteredPassword = passwordInput.value;
        if (!enteredPassword) {
            loginError.textContent = 'Password is required.';
            return;
        }
        const { passwordHash } = await chrome.storage.local.get('passwordHash');
        const enteredHash = await hashPassword(enteredPassword);
        if (enteredHash === passwordHash) {
            showAndInitializeSettings();
        } else {
            loginError.textContent = 'Incorrect password.';
            passwordInput.value = '';
        }
    });
    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') unlockBtn.click();
    });


    // --- All settings functionality is now inside this function ---
    function initializeSettingsFunctionality() {
        
        function loadSettings() {
            const keysToGet = ['blockPageMessage', 'theme', ...listConfigurations.map(c => c.storageKey)];
            chrome.storage.local.get(keysToGet, (data) => {
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
        }

        function renderList(ulElement, itemsArray) {
            ulElement.innerHTML = '';
            if (itemsArray.length === 0) {
                ulElement.innerHTML = `<li style="font-style: italic; color: var(--subtle-text-color); justify-content: center;">No items added yet.</li>`;
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
            const itemsToAdd = rawInput.includes(',') ? rawInput.split(',').map(s => s.trim()).filter(Boolean) : [rawInput];
            let addedCount = 0;
            itemsToAdd.forEach(item => {
                if (!itemsArray.includes(item)) {
                    itemsArray.push(item);
                    addedCount++;
                }
            });
            if (addedCount > 0) {
                const storageKey = ulElement.id.replace('List', '');
                await chrome.storage.local.set({ [storageKey]: itemsArray });
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
                const storageKey = ulElement.id.replace('List', '');
                await chrome.storage.local.set({ [storageKey]: itemsArray });
                renderList(ulElement, itemsArray);
                statusDiv.textContent = `Removed: ${itemToRemove}`;
                setTimeout(() => statusDiv.textContent = '', 2000);
            }
        }

        async function exportSettings() {
            statusDiv.textContent = 'Exporting...';
            try {
                const settingsToExport = await chrome.storage.local.get(null);
                const jsonString = JSON.stringify(settingsToExport, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `libreshield-settings-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                statusDiv.textContent = 'Settings exported successfully!';
            } catch (error) {
                console.error('Error exporting settings:', error);
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
                        chrome.storage.local.set(importedSettings, () => {
                            if (chrome.runtime.lastError) { throw new Error(chrome.runtime.lastError.message); }
                            statusDiv.textContent = 'Settings imported! Reloading...';
                            setTimeout(() => location.reload(), 1500);
                        });
                    } catch (error) {
                        console.error('Error parsing imported file:', error);
                        statusDiv.textContent = 'Error: Invalid or corrupted settings file.';
                        setTimeout(() => statusDiv.textContent = '', 3000);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        // --- Attach Event Listeners for the Settings Page ---
        listConfigurations.forEach(config => {
            const inputEl = document.getElementById(config.inputId);
            const buttonEl = document.getElementById(config.buttonId);
            const listEl = document.getElementById(config.listId);
            buttonEl.addEventListener('click', () => addItem(inputEl, config.dataArray, listEl));
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); addItem(inputEl, config.dataArray, listEl); }
            });
        });

        themeToggle.addEventListener('change', () => {
            const theme = themeToggle.checked ? 'dark' : 'light';
            document.body.classList.toggle('dark-mode', themeToggle.checked);
            chrome.storage.local.set({ theme });
        });

        exportSettingsBtn.addEventListener('click', exportSettings);
        importSettingsBtn.addEventListener('click', importSettings);

        // --- NEW SAVE CONFIRMATION LOGIC ---
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
            if (!enteredPassword) {
                saveConfirmError.textContent = 'Password is required to confirm.';
                return;
            }
            const { passwordHash } = await chrome.storage.local.get('passwordHash');
            const enteredHash = await hashPassword(enteredPassword);
            if (enteredHash === passwordHash) {
                chrome.storage.local.set({ blockPageMessage: messageInput.value }, () => {
                    statusDiv.textContent = 'Block page message saved successfully!';
                    setTimeout(() => statusDiv.textContent = '', 2000);
                });
                resetSaveUi();
            } else {
                saveConfirmError.textContent = 'Incorrect password. Please try again.';
                savePasswordConfirmInput.value = '';
            }
        });

        cancelSaveBtn.addEventListener('click', () => {
            resetSaveUi();
        });

        // Load all the settings data into the UI
        loadSettings();
    }

    // --- Start the Authentication Flow ---
    initializeAuth();
});