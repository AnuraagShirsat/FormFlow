# Documentation: `/extension/manifest.json`

## 1. What It Does
The `manifest.json` file configures FormFlow as a Chrome Manifest V3 (MV3) extension with minimal, zero-trust permissions. It registers the background service worker, declares client-side storage access, and ensures content scripts are executed only on-demand when the user clicks the toolbar icon, rather than running passively across all websites.

---

## 2. How It Works Technically
- **Manifest Version 3:** Built strictly according to modern Chromium Manifest V3 specifications.
- **On-Demand Injection (`activeTab` + `scripting`):** Instead of requesting intrusive `<all_urls>` content script matches, FormFlow uses `activeTab` combined with `chrome.scripting`. Scripts execute solely in response to explicit student invocation.
- **Service Worker Declaration:** Registers `core/background.js` as an event-driven background service worker that activates on events and idles to conserve system memory.
- **Scoped Host Permissions:** Requests network host permissions strictly for the backend proxy (`https://formflow-backend.example.com/*` in production and `http://localhost:5000/*` in local hackathon development). No external third-party origins or Google Gemini endpoints are contacted from the browser.
- **Strict Content Security Policy:** Defines `"script-src 'self'; object-src 'self'"` to prohibit inline JavaScript, remote script loading, and `eval()` execution.

---

## 3. Judge Questions with Short Answers

**Q: Why didn't you declare `<all_urls>` in content_scripts?**  
**A:** Requesting `<all_urls>` triggers alarming browser permission warnings for students and violates the principle of least privilege. FormFlow operates only when the student explicitly summons it via the extension action icon.

**Q: Where is the Gemini API key stored in the extension?**  
**A:** Nowhere. The extension does not store, bundle, or reference any API keys. Network communication is strictly confined to our private Node.js backend proxy.

**Q: Does the extension run on tabs where the student hasn't clicked the icon?**  
**A:** No. Because no automatic content scripts are declared, the extension remains completely inactive until clicked on the target active tab.

---

## 4. What to Know Before the Judges
- **Production Host Placeholder:** Note that `https://formflow-backend.example.com/*` is the production host placeholder, while `http://localhost:5000/*` enables seamless local demonstration.
- **Zero Inline Handlers:** MV3 enforces strict CSP; no inline scripts or eval patterns are used anywhere in the extension.
- **Clean Chrome Web Store Compatibility:** The minimal permission footprint aligns with Google's highest security and privacy audit standards.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **No Broad Permissions:** Excluded intrusive permissions such as `webRequest`, `cookies`, `management`, or `<all_urls>`.
- **Enforced Strict CSP:** Confirmed no remote code sources (`'unsafe-eval'`, `'unsafe-inline'`) are allowed in `content_security_policy`.
- **Origin Confinement:** Host permissions permit communication only with the authenticated local or private backend proxy.

### Judge Security Questions & Answers:
**Q: Can a malicious site trigger the extension without user consent?**  
**A:** No. Chrome's `activeTab` permission model grants script execution rights to the extension only upon a trusted user gesture (clicking the toolbar action icon). Webpage scripts have no capability to invoke the extension's execution.

**Q: What prevents arbitrary code execution within the background service worker?**  
**A:** Chrome Manifest V3 service workers disallow remote code fetching, dynamic string evaluation (`eval`, `new Function`), and external script tags. All executable code is bundled locally.
