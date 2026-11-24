# Documentation: `/extension/core/content.js`

## 1. What It Does
`content.js` establishes the shared `window.FormFlow` execution namespace within the active webpage's isolated world context. It acts as the orchestration hub that bridges Kartik's scanning and filling scripts (`/extension/filler`) with Himani's user interface widget (`/extension/ui`), while providing communication channels to the background service worker.

---

## 2. How It Works Technically
- **Namespace Initialization:** Instantiates `window.FormFlow` and safeguards against duplicate injection with an `__initialized` flag.
- **Contract Interface Stubs:** Provides default, graceful stub implementations for `scanForm()`, `mountWidget()`, and `fillFields(plan)`. This allows independent development and testing of extension components without throwing runtime reference errors. Fallback warnings accurately point to `core/scanner.js`.
- **Profile Action Hooks:** Exposes `window.FormFlow.clearProfile()`, `window.FormFlow.getProfile()`, and `window.FormFlow.saveProfile(updates)` directly to the UI widget, allowing user actions like "Clear my data" to communicate with `chrome.storage.local`.
- **Message Dispatcher:** Provides `window.FormFlow.sendToBackground(type, payload)`, wrapping `chrome.runtime.sendMessage` in a Promise for clean async/await interactions throughout the UI layer.
- **Runtime Message Listener:** Listens for `TOGGLE_WIDGET` and `SCAN_FORM` commands dispatched from the background service worker, invoking the appropriate module method when available.
- **Safe DOM Practices:** Employs zero `innerHTML`, `eval()`, or inline event listeners.

---

## 3. Judge Questions with Short Answers

**Q: Why use a shared window.FormFlow namespace instead of ES module imports?**  
**A:** In Chrome Manifest V3 content scripts, native ES module imports across distinct files injected into the DOM require specific manifest configurations or complex bundlers like Webpack/Vite. Using vanilla JavaScript with a shared namespace eliminates the need for build tools, keeping code transparent and immediately reviewable.

**Q: Can a form website's JavaScript access window.FormFlow?**  
**A:** No. Chrome content scripts execute in an "isolated world". Even though they share the same DOM elements as the host webpage, their JavaScript execution environments (`window` scopes) are strictly separated. The host page cannot inspect or modify `window.FormFlow`.

**Q: What happens if the student clicks the extension before the filler script finishes loading?**  
**A:** The safe fallback stubs in `content.js` handle invocations gracefully, returning empty arrays and logging warnings without throwing uncaught exceptions.

---

## 4. What to Know Before the Judges
- **Vanilla Architecture:** FormFlow uses no React, Vue, or Webpack in its content scripts. It runs entirely on lightweight vanilla JavaScript.
- **Non-Destructive Invariant:** `content.js` does not alter page styles or inject global CSS that could disrupt the host application's layout.
- **Orchestration Role:** Kartik attaches `scanForm` and `fillFields`; Himani attaches `mountWidget`. Anuraag maintains the `content.js` bridge.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **No Evaluation:** Free of `eval()`, `new Function()`, or dynamic code evaluation.
- **Strict DOM Separation:** Avoids direct modification of the host page's window prototypes.
- **PII Scrubbing:** Logs only operational lifecycle milestones; does not log user-entered values or form payloads.

### Judge Security Questions & Answers:
**Q: How do you prevent event listener leaks when scripts are injected on demand?**  
**A:** The script checks `window.FormFlow.__initialized`. If the script was already injected into the tab during a previous click, subsequent executions exit immediately to prevent duplicate event listener registrations.

**Q: Does content.js store student credentials in cookies or session storage?**  
**A:** No. It stores zero state in cookies, `localStorage`, or `sessionStorage`. All state persistence is mediated through the background service worker into `chrome.storage.local`.
