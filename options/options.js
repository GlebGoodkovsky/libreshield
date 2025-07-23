document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const themeToggle = document.getElementById('theme-toggle');
    const messageInput = document.getElementById('blockPageMessage');
    const saveButton = document.getElementById('saveButton');
    const statusDiv = document.getElementById('status');
    const exportSettingsBtn = document.getElementById('exportSettingsBtn'); // New
    const importSettingsBtn = document.getElementById('importSettingsBtn'); // New

    const listConfigurations = [
        {
            listId: 'blockedDomainsList',
            inputId: 'newDomain',
            buttonId: 'addDomain',
            storageKey: 'blockedDomains',
            dataArray: []
        },
        {
            listId: 'blockedKeywordsList',
            inputId: 'newKeyword',
            buttonId: 'addKeyword',
            storageKey: 'blockedKeywords',
            dataArray: []
        },
        {
            listId: 'allowedSitesList',
            inputId: 'newAllowedSite',
            buttonId: 'addAllowedSite',
            storageKey: 'allowedSites',
            dataArray: []
        }
    ];

    // --- Core Functions ---

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

    // --- New Export and Import Functions ---

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
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
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
                        if (chrome.runtime.lastError) {
                            throw new Error(chrome.runtime.lastError.message);
                        }
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

    // --- Event Listeners ---

    listConfigurations.forEach(config => {
        const inputEl = document.getElementById(config.inputId);
        const buttonEl = document.getElementById(config.buttonId);
        const listEl = document.getElementById(config.listId);
        buttonEl.addEventListener('click', () => addItem(inputEl, config.dataArray, listEl));
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addItem(inputEl, config.dataArray, listEl);
            }
        });
    });

    saveButton.addEventListener('click', () => {
        chrome.storage.local.set({ blockPageMessage: messageInput.value }, () => {
            statusDiv.textContent = 'Block page message saved!';
            setTimeout(() => statusDiv.textContent = '', 2000);
        });
    });

    themeToggle.addEventListener('change', () => {
        const theme = themeToggle.checked ? 'dark' : 'light';
        document.body.classList.toggle('dark-mode', themeToggle.checked);
        chrome.storage.local.set({ theme });
    });

    exportSettingsBtn.addEventListener('click', exportSettings); // New
    importSettingsBtn.addEventListener('click', importSettings); // New

    // Initial load
    loadSettings();
});