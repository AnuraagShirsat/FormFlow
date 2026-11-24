# Documentation: `/extension/core/background.js`

## 1. What It Does
`background.js` is the Manifest V3 background service worker for FormFlow. It functions as the central message broker and security gateway. It coordinates:
- On-demand injection of content scripts when the extension icon is clicked.
- Local profile persistence using `chrome.storage.local` (`GET_PROFILE`, `SAVE_PROFILE`, `CLEAR_PROFILE`).
- Network proxy routing (`ANALYZE_FORM` and `EXTRACT_DOCUMENT`), ensuring the browser never contacts Gemini directly.
- Form scan routing between the UI widget and the DOM scanner.
- Internal catalog routing for portal photo/signature upload specifications (`GET_SPECS` reading `filler/specs.json`).
- Data minimization enforcement, ensuring Aadhaar numbers are masked to the last 4 digits only and profiles are never logged to console.

---

## 2. How It Works Technically
- **Event-Driven Lifecycle:** Built on Manifest V3 service worker architecture; terminates when idle and wakes up instantly upon incoming messages or extension icon clicks.
- **On-Demand Injection:** Uses `chrome.action.onClicked` with `chrome.scripting.executeScript`. Instead of passively running on all URLs, scripts execute only when the user explicitly triggers FormFlow.
- **Fail-Quiet Module Loader:** Iterates through candidate scripts (`core/config.js`, `core/content.js`, `core/scanner.js`, `filler/matcher.js`, `filler/filler.js`, `ui/domUtil.js`, `ui/uploadChecks.js`, `ui/widgetStyles.js`, `ui/dummyData.js`, `ui/imageFixer.js`, `ui/review.js`, `ui/imageFixerPanel.js`, `ui/widget.js`) checking existence via `chrome.runtime.getURL` and `fetch`. Unauthored modules are gracefully skipped without errors.
- **Proxy Gateway:** Makes all external network requests through `callBackendProxy()`. Requests feature a 30-second `AbortController` timeout and return clean error objects without stack traces conforming to `{ success: false, error: { code, message } }`.
- **Aadhaar Privacy Filter:** `saveStoredProfile()` inspects updates. If an unmasked 12-digit Aadhaar number is passed, it isolates the last 4 digits, sets `aadhaarLast4`, and deletes the full number before committing to storage.

---

## 3. Judge Questions with Short Answers

**Q: Why are network requests made from background.js rather than directly from the content script?**  
**A:** Content scripts run in the context of untrusted webpage origins. By centralizing network requests in the background service worker, we prevent untrusted webpage scripts from tampering with proxy calls, observing payload contents, or hijacking network traffic.

**Q: Where does the student profile live, and who has access to it?**  
**A:** The profile is stored strictly inside `chrome.storage.local` on the student's physical machine. It is never synchronized to cloud servers, remote databases, or external analytics.

**Q: What happens if a teammate has not yet pushed their file (e.g. widget.js)?**  
**A:** `injectExtensionScripts()` checks the existence of each component before injecting. If a file is missing, the service worker fails quietly without crashing or breaking other initialized modules.

---

## 4. What to Know Before the Judges
- **The "Clear My Data" Guarantee:** Demonstrating privacy is critical. The `CLEAR_PROFILE` message hook allows students to wipe all stored profile records with a single click.
- **Zero Console Logging of PII:** Profile records and field values are never printed to developer console logs. Only operation metadata (such as field counts) is logged.
- **Backend Dependency:** Live form analysis and document extraction require the local Node proxy running at `http://localhost:5000`.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **No Evaluation or Dynamic Strings:** Zero use of `eval()`, `new Function()`, or `setTimeout("string")`.
- **Aadhaar Sanitization:** Automated stripping of any 12-digit Aadhaar string before persistence.
- **Sanitized Error Envelopes:** Network exceptions, timeouts, and input-validation rejections are transformed into standardized `{ success: false, error: { code, message } }` envelopes without leaking system internals.
- **Restricted URL Guard:** Prevents injection into internal browser schemes (`chrome://`, `edge://`, `chrome-extension://`).

### Judge Security Questions & Answers:
**Q: Can a malicious website trigger SAVE_PROFILE to overwrite student data?**  
**A:** No. `chrome.runtime.onMessage` only accepts messages dispatched from our extension's own origin. Webpages cannot send messages to our internal runtime listeners because we do not declare `externally_connectable` in `manifest.json`.

**Q: What prevents a denial of service if the backend server hangs?**  
**A:** Every outbound fetch is governed by an `AbortController` bounded by `CONFIG.REQUEST_TIMEOUT_MS` (30 seconds). If the proxy fails to respond within that window, the connection terminates cleanly and reports `REQUEST_TIMEOUT`.
