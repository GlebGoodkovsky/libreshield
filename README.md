<h1 align="center">
  <sub>
    <img src="icons/128x128logo.png" alt="logo" height="38" width="38">
  </sub>
  LibreShield
</h1>

A privacy-focused, free, and open-source content blocker for Firefox and other Gecko-based browsers. Block unwanted websites and keywords, manage exceptions, and protect your settings, all stored locally on your device.

---

## Get LibreShield

**LibreShield is available on the Firefox Browser Add-on Store.**

<a href="https://addons.mozilla.org/en-US/firefox/addon/libreshield/" target="_blank">
  <img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Get LibreShield for Firefox" width="200"/>
</a>

---

## Privacy & Security

LibreShield is built with privacy as a core principle.

-   **No Cloud, No Tracking**: All your data is stored locally in your browser. Nothing is ever sent to any external server.
-   **Strong Password Protection**: Your settings can be protected with a password. The password is never stored directly — it is hashed using PBKDF2 with 100,000 iterations, SHA-256, and a random salt, an industry-standard method that makes it extremely difficult to reverse.
-   **Brute-Force Lockout**: After too many incorrect password attempts, access is locked for 5 minutes. The lockout persists even if the settings page is closed and reopened.
-   **Safe Exports**: When exporting your settings, password data is automatically excluded from the backup file.
-   **Privacy Policy**: See [PRIVACY.md](https://github.com/glebgoodkovsky/libreshield/blob/main/PRIVACY.md) for a full breakdown of permissions and data handling.

---

## Features

-   **Comprehensive Blocking**
    -   **Domain Blocking**: Block entire websites by domain (e.g. `example.com`).
    -   **Keyword Blocking**: Scan page content and block pages that contain specific words or phrases.

-   **Temporary Access**
    -   **Timed Unblocks**: From the block page, request temporary access to a blocked site or keyword for a set number of minutes.
    -   **Password Gated**: Temporary access requires your password, preventing easy bypasses.
    -   **Manage Active Unblocks**: View and revoke all active temporary permissions from the settings page.

-   **Site Allowlist**
    -   Mark trusted sites that always bypass blocking rules, regardless of your keyword or domain lists.

-   **Secure Settings**
    -   Protect your settings page with a password to prevent unauthorized changes.
    -   Change or remove your password at any time from within the settings.

-   **User-Friendly Interface**
    -   **Toggle Blocking On/Off**: Quickly enable or disable all blocking from the popup.
    -   **One-Click Site Actions**: Block or allow the current website directly from the popup.
    -   **Customizable Block Page**: Set your own message to display when a page is blocked.
    -   **Light & Dark Theme**: Switch between themes from the settings page.

-   **Data Management**
    -   **Export & Import**: Back up your full configuration to a JSON file and restore it any time. Password data is excluded from exports for security.

-   **Firefox & LibreWolf Focused**
    -   Built on standard WebExtension APIs for full compatibility with Firefox, LibreWolf, and other Gecko-based browsers.

---

## How It Works

LibreShield is built with plain web technologies and the WebExtensions API - no frameworks, no dependencies.

-   **HTML/CSS**: Structures and styles the popup, settings page, and block page, with full light and dark theme support.
-   **JavaScript (Vanilla)**: Powers all logic across four main scripts:
    -   `background.js`: Handles web request blocking using an in-memory cache for reliable, synchronous decisions. Also manages password verification, temporary unblock timers, and scheduled cleanup via the `alarms` API.
    -   `content.js`: Runs on every page to scan for blocked keywords and communicates with the background script to trigger blocking.
    -   `popup/popup.js`: Manages the toolbar popup — toggle blocking, block or allow the current site.
    -   `options/options.js`: Handles the full settings page including authentication, list management, password management, and import/export.
-   **WebExtensions API**: Uses `storage`, `webRequest`, `webRequestBlocking`, `tabs`, `runtime`, and `alarms`.

---

## Running Locally (Development)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/glebgoodkovsky/libreshield.git
    ```

2.  **Navigate into the directory:**
    ```bash
    cd libreshield
    ```

3.  **Load as a Temporary Add-on in Firefox or LibreWolf:**
    -   Go to `about:debugging#/runtime/this-firefox` in your browser.
    -   Click **Load Temporary Add-on...**.
    -   Select the `manifest.json` file from the project folder.

The extension will appear in your toolbar. Note that temporary add-ons are removed when the browser is closed.

---

## Contributing

Bug reports, suggestions, and pull requests are welcome. Feel free to open an issue to discuss anything.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## A Note on Development

This project was built as a hands-on exercise in WebExtension development. An AI assistant was used as a coding partner throughout, helping write, debug, and improve the code while I learned the fundamentals. The goal was always to understand what was being built.

---