<h1 align="center" style="font-size: 4rem;">
  <img src="icons/128x128logo.png" alt="logo" height="100" width="100" style="vertical-align: middle;">
  LibreShield
</h1>

A powerful, private, and fully-free content blocker designed as a browser extension. Take control of your browsing experience by blocking unwanted domains, filtering content by keywords, and safeguarding your settings with a robust password system.

---

## Get LibreShield

**LibreShield is officially available on the Firefox Browser Add-on Store.**

<a href="https://addons.mozilla.org/en-US/firefox/addon/libreshield/" target="_blank">
  <img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get LibreShield for Firefox" width="200"/>
</a>

---

## Important User Information

### Data Handling & Security

LibreShield is built with privacy as a core principle. All your settings are stored locally in your browser's own secure storage.

-   **Strong Password Protection**: Your settings are secured by a password. This password is **never stored directly**. Instead, it's protected using a strong cryptographic hashing function (**PBKDF2 with a 100,000-iteration SHA-256 hash and a random salt**). This industry-standard method makes it extremely difficult for anyone to access your settings without the correct password.
-   **No Cloud Storage**: Your data **never leaves your computer** and is never sent to any external servers. Your privacy is paramount.
-   **Privacy Policy**: For a detailed breakdown of permissions and data handling, please see the [PRIVACY.md](https://github.com/GlebGoodkovsky/libreshield/blob/main/PRIVACY.md) file included in this repository.

---

## Features

-   **Comprehensive Blocking**
    -   **Domain Blocking**: Prevent access to entire websites (e.g., `unwanted-site.com`).
    -   **Keyword Blocking**: Scans page content and blocks pages containing specific words or phrases.
-   **Temporary Access**
    -   **Request Timed Access**: From the block page, you can grant temporary access to a blocked site or keyword for a specific number of minutes.
    -   **Password Gated**: Temporary access requires the correct password, preventing easy bypasses.
    -   **Manage Active Unblocks**: View and manage all active temporary permissions from the settings page.
-   **Secure & Manageable Password**
    -   Protect your settings page with a password to prevent unauthorized changes.
    -   Easily change or remove your password from within the settings.
    -   Includes a login attempt lockout to prevent brute-force attacks.
-   **Site Allowlist**
    -   Easily create a list of trusted sites that will always bypass blocking rules.
-   **User-Friendly Interface**
    -   **Toggle Blocking On/Off**: Quickly enable or disable all blocking functionality from the popup.
    -   **Contextual Site Actions**: Block or allow the current website with a single click from the extension's popup.
    -   **Customizable Block Page**: Personalize the message displayed on the page that appears when content is blocked.
    -   **Theme Options**: Switch between light and dark modes for a comfortable user interface.
-   **Data Management**
    -   **Settings Backup & Restore**: Export your entire configuration to a JSON file and import it later or on another device.
-   **Firefox/LibreWolf Focused**
    -   Built using standard WebExtension APIs for excellent compatibility with Firefox, LibreWolf, and other Gecko-based browsers.

---

## How It Works (Tech Stack)

LibreShield is built using core web technologies and the powerful WebExtensions API:
-   **HTML**: Structures the user interfaces for the options, popup, and block pages.
-   **CSS**: Styles the entire extension, including responsive design and theme management.
-   **JavaScript (Vanilla JS)**: Powers all the interactive logic, including:
    -   `background.js:` Manages web request blocking, password verification, and temporary unblock timers.
    -   `content.js:` Handles on-page keyword scanning and communicates with the background script.
    -   **UI Logic**: Manages the options page, popup interactions, and the block page.
-   **WebExtensions API (`browser.*`)**: The browser-provided API for `storage`, `webRequest`, `tabs`, and `runtime` features, which are the backbone of the extension's functionality.

---

## Running Locally (For Development in Firefox/LibreWolf)

To run LibreShield from its source code for development or testing:

1.  **Clone this repository:**
    ```bash
    git clone https://github.com/GlebGoodkovsky/libreshield.git
    ```
2.  **Navigate into the project directory:**
    ```bash
    cd libreshield
    ```

3.  **Load as a Temporary Add-on in Firefox/LibreWolf:**
    -   Open the debugging page by navigating to `about:debugging#/runtime/this-firefox` in your browser.
    -   Click "**Load Temporary Add-on...**".
    -   Navigate into the `libreshield` directory you just cloned and select the `manifest.json` file.

The extension icon will now appear in your browser's toolbar. Note that temporary add-ons are removed when you close the browser.

---

## Contributing

Suggestions, bug reports, and pull requests are warmly welcome! Please feel free to open an issue to discuss features or submit changes.

---

## A Note on the Learning Process

This project was created as a hands-on exercise to develop a full-featured browser extension. It demonstrates core concepts of WebExtension development, including background scripts, content scripts, user interfaces, and persistent storage. The goal was to build a simple, understandable, yet fully functional content blocker. I used an AI assistant as a tool to help write and learn the code, using it as a learning partner to grasp fundamentals step-by-step.

---
