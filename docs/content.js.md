# Documentation: `/extension/core/content.js`

## 1. What It Does
`content.js` establishes the shared `window.FormFlow` execution namespace within the active webpage's isolated world context:
- Acts as the orchestration bridge connecting Kartik's DOM scanner (`core/scanner.js`) and form filler (`filler/filler.js`) with Himani's floating UI widget (`ui/widget.js`).
- Provides safe, non-throwing fallback stubs for `scanForm()`, `mountWidget()`, and `fillFields(plan)` adhering to the updated `{ filledCount, skippedCount, missingCount, errors: [] }` return contract.
- Exposes Promise-wrapped communication helpers (`sendToBackground`, `getProfile`, `saveProfile`, `clearProfile`).
- Enforces runtime security on incoming messages: validates `sender.id === chrome.runtime.id` and restricts handled messages to known types (`TOGGLE_WIDGET`, `SCAN_FORM`, `PING`).
- Implements the `{ type: 'PING' }` responder so the background service worker can skip redundant script re-injection.

---

## 2. How It Works Technically
- **Namespace Initialization & Guard:** Checks `window.FormFlow && window.FormFlow.__initialized`. If true, exits immediately to prevent duplicate listener registration.
- **Contract-Compliant Fallback Stubs:** Provides default implementations for core APIs. Specifically, `window.FormFlow.fillFields(plan)` defaults to `{ filledCount: 0, skippedCount: plan.length, missingCount: 0, errors: [] }`, preventing crashes if called before filler scripts load.
- **Sender Authentication:** In `chrome.runtime.onMessage.addListener`, verifies that `sender.id === chrome.runtime.id`. Any message from an unauthorized origin is silently dropped.
- **Known Message Filtering:** Checks incoming messages against `KNOWN_CONTENT_TYPES: ['TOGGLE_WIDGET', 'SCAN_FORM', 'PING']`. Unknown actions are rejected without side effects.
- **Ping Responder:** Responds to `{ type: 'PING' }` with `{ success: true, running: true }`, allowing the service worker to verify that the extension bridge is already active in the tab.

---

## 3. Judge Questions with Short Answers

**Q: Why does content.js respond to a PING message?**  
**A:** When a student clicks the extension icon in Chrome, the service worker sends a PING to check if `content.js` is already running in that tab. If it responds, the service worker skips injecting scripts again, preventing memory leaks, duplicate event listeners, and multiple floating pills.

**Q: What is the contract signature of `fillFields` in content.js?**  
**A:** The fallback stub returns `{ filledCount, skippedCount, missingCount, errors: [] }` conforming to the updated shared contract specification, ensuring consistent interface handling even when testing modules independently.

**Q: Can a script on the form page interact with or tamper with `window.FormFlow`?**  
**A:** No. Chrome content scripts run in an "isolated world". Although they interact with the same underlying DOM tree as the host page, their JavaScript execution contexts (`window` globals and variable scopes) are strictly separated.

---

## 4. What to Know Before the Judges
- **Lightweight Vanilla Design:** Runs without Webpack, React, or polyfills. Total execution footprint is under 150 lines.
- **Zero Host Mutation:** Does not modify global page variables, alter page prototypes, or attach global CSS classes.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Sender Runtime ID Guard:** Verified that messages without `sender.id === chrome.runtime.id` are discarded.
- **No Evaluation:** Verified complete absence of `eval()`, `new Function()`, or `setTimeout(string)`.
- **Zero User PII:** Logs only operational startup and warning strings; never outputs form contents or profile keys.

### Judge Security Questions & Answers:
**Q: Could a third-party webpage send synthetic DOM events to trigger FormFlow actions?**  
**A:** No. FormFlow actions (`TOGGLE_WIDGET`, `SCAN_FORM`) are triggered solely via Chrome's internal extension messaging pipeline (`chrome.runtime.onMessage`), which webpage scripts cannot invoke.

**Q: How does content.js ensure no sensitive data is leaked if a background communication fails?**  
**A:** `sendToBackground()` intercepts `chrome.runtime.lastError` and returns a clean, sanitized error object `{ success: false, error: { code: 'COMMUNICATION_ERROR', message: ... } }` rather than letting uncaught exceptions propagate.
