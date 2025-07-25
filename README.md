# LibreShield 🛡️

A powerful, private, and fully-free content blocker designed as a browser extension. Take control of your browsing experience by blocking unwanted domains and keywords, all while safeguarding your settings with a password.

---

## ⚠️ Important User Information

### Data Handling & Security

LibreShield stores all your settings, including blocked domains, keywords, and your password hash, directly in your browser's chrome.storage.local (or browser.storage.local for Firefox).

- **Password Protection:** Your settings are secured by a password, which is stored as a SHA-256 hash. This prevents casual unauthorized access to your blocklists. 
- **No Cloud Storage:** Your data **never leaves your browser** and is not sent to any external servers. 
- **No Sensitive Information:** While the extension offers strong privacy features, as with any local storage, avoid storing highly sensitive or unencrypted personal identification data directly within the keyword lists.

For more details, a PRIVACY.md file will be added soon.

---

## ✨ Features

- **Comprehensive Blocking** 🚫:
    - **Domain Blocking:** Prevent access to entire websites. 
    - **Keyword Blocking:** Block pages based on specific words or phrases found in their content.
- **Site Allowlist** ✅: Easily create a list of trusted sites that will bypass all blocking rules.
- **Password-Protected Settings** 🔐: Secure your configuration page with a password to prevent unauthorized changes.
- **Toggle Blocking On/Off** ⚡: Quickly enable or disable the extension's blocking functionality from the popup.
- **Contextual Site Actions** 🔗: Block or allow the current website directly from the extension's popup.
- **Customizable Block Page** 📝: Personalize the message displayed when a page is blocked.
- **Theme Options** 🌙☀️: Switch between light and dark modes for the settings interface.
- **Settings Backup & Restore** 💾: Export your entire configuration to a JSON file and import it later.
- **Firefox/LibreWolf Compatibility**: Built using standard WebExtension APIs, specifically targeting Firefox, LibreWolf, and other Gecko-based browsers.

---

## 🛠️ How It Works (Tech Stack)

LibreShield is built using core web technologies and the powerful WebExtensions API:

- **HTML:** Structures the user interfaces for the options, popup, and block pages.
- **CSS:** Styles the entire extension, including theme management.
- **JavaScript (Vanilla JS):** Powers all the interactive logic, including:
    - Background script for webRequestBlocking. 
    - Content script for on-page keyword scanning.
    - Logic for options management, password handling, and popup interactions.
- **WebExtensions API (browser.* / chrome.*):** The browser-provided API for storage, webRequest, tabs, and runtime features. While Chrome uses chrome.*, Firefox/LibreWolf typically use browser.* via polyfills or direct support.
    
---

## 🚀 How to Use

1. **Install the Extension:**
    - **From Source (for Developers):** Follow the "Running Locally" steps below.
    - (Future) From Official Stores: Links to Firefox Add-ons will be provided here once available.
        
2. **Open the Popup:** Click on the LibreShield icon in your browser's toolbar.
    - Toggle blocking on/off.
    - See the current site and quickly block or allow it.
        
3. **Access Settings:**
    - Click the "Manage Settings" button in the popup, or navigate to about:addons in Firefox/LibreWolf, find LibreShield, and click "Options" or "Preferences".
    - **Set a Password:** Upon first opening, you'll be prompted to set a password to protect your settings.
    - **Manage Lists:** Add/remove blocked domains, blocked keywords, and allowed sites.
    - **Customize Message:** Change the message shown on the block page.
    - **Export/Import:** Backup or restore your settings.

---

## 💻 Running Locally (For Development in Firefox/LibreWolf)

To run LibreShield from its source code (e.g., for development or testing):

1. **Clone this repository:**

```bash
git clone https://github.com/GlebGoodkovsky/libreshield-project.git`
```  
    
2. **Navigate into the project directory:**

```bash
cd libreshield-project`
```

3. **Load as a Temporary Add-on in Firefox/LibreWolf:**
    
    - Open the Add-ons page: Go to about:debugging#/runtime/this-firefox in your browser. 
    - Click "Load Temporary Add-on...".
    - Navigate into the libreshield-project directory you just cloned and select any file inside it (e.g., manifest.json). Firefox/LibreWolf will load the entire extension.

The extension icon should now appear in your browser's toolbar. Note that temporary add-ons are removed when the browser is closed. For persistent installation during development, you would typically use web-ext run with the Mozilla Web-Ext tool, or install it permanently after signing.

---

## 🤝 Contributing

Suggestions, bug reports, and pull requests are warmly welcome! Please feel free to open an issue to discuss features or submit changes

---

## A Note on the Learning Process

This project was created as a hands-on exercise to develop a full-featured browser extension. It demonstrates core concepts of WebExtension development, including background scripts, content scripts, user interfaces, and persistent storage. The goal was to build a simple, understandable, yet fully functional content blocker. I used an AI assistant as a tool to help write and, more importantly, explain the code, using it as a learning partner to grasp fundamentals step-by-step.

---
