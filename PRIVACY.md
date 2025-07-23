# LibreShield Privacy Policy

This privacy policy describes how the LibreShield browser extension handles your data. We are committed to protecting your privacy and ensuring the security of your information.

## Data Collection and Storage

LibreShield **does not collect any personal data** from its users. All settings and data are stored locally within your browser's storage. This includes:

*   **Blocked Domains List:** A list of domains you have chosen to block.
*   **Blocked Keywords List:** A list of keywords that trigger page blocking.
*   **Allowed Sites List:** A list of domains you have explicitly allowed.
*   **Custom Block Page Message:** The message displayed on blocked pages.
*   **Extension Settings:** Preferences such as the chosen theme (light/dark) and whether blocking is enabled.
*   **Password Hash:** A hashed version of your password, used to protect access to the extension's settings.

**Important Information about Password Security:**

*   LibreShield stores your password as a `SHA-256` hash, which is a one-way function. This means we do not store your password in plain text.
*   We recommend using a strong, unique password for your LibreShield settings.

## Data Usage

The data stored by LibreShield is used exclusively for the following purposes:

*   **Content Blocking:** To block access to websites and content based on your configured blocklists.
*   **Settings Management:** To store and retrieve your preferences for the extension's behavior and appearance.
*   **Password Protection:** To authenticate access to the extension's settings page.

## Data Sharing

LibreShield **does not share any user data** with any third parties. All data remains within your browser's local storage and is not transmitted to any external servers.

## Permissions

LibreShield requires the following permissions to function:

*   **`storage`:**  Allows the extension to store and retrieve your settings and blocklists in your browser's local storage.
*   **`webRequest`:** Allows the extension to observe and modify network requests, which is necessary to block access to websites.
*   **`webRequestBlocking`:** Allows the extension to block network requests, preventing access to blocked domains and content.
*   **`tabs`:** Allows the extension to access information about open tabs, primarily to redirect blocked pages and determine the current website for quick-block actions.
*   **`scripting` (or implicit permission for `content_scripts`):** Allows the extension to inject content scripts into web pages, enabling keyword scanning and other content filtering features.
*   `"<all_urls>"`: Allows the extension to access all URLs. This permission is necessary for the `webRequest`, `webRequestBlocking` and `content_scripts` to function correctly across all websites.

We only request the minimum permissions necessary for the extension to function as described.

## Security

We take reasonable measures to protect the security of your data, including:

*   Storing your password as a `SHA-256` hash.
*   Ensuring all data remains within your browser's local storage.
*   Regularly reviewing our code for potential security vulnerabilities.

While we strive to protect your data, please be aware that no method of transmission over the Internet or method of electronic storage is completely secure.

---