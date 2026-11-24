# Documentation: `/extension/ui/widget.js`

## 1. What It Does
`widget.js` is the central user interface component of FormFlow. It exposes `window.FormFlow.mountWidget()`, which injects a draggable, collapsible floating assistant pill and modal panel into any scholarship or government web form. It provides:
- A closed Shadow DOM boundary preventing webpage CSS or scripts from interfering with FormFlow.
- W3C ARIA tabbed navigation (`role="tablist"`, `role="tab"`, arrow-key switching).
- A required document checklist explaining why each document is mandatory.
- Multilingual field-by-field guidance (English, Kannada, Hindi) with examples and source documents.
- "Clear my data" profile privacy wipe calling `window.FormFlow.clearProfile()`.
- Toggleable offline demonstration via `USE_DUMMY_DATA = true`.

---

## 2. How It Works Technically
- **Closed Shadow Root:** Uses `hostElement.attachShadow({ mode: 'closed' })`. Webpage scripts calling `document.querySelector('#formflow-widget-host').shadowRoot` receive `null`, shielding the internal UI from hostile page scripts.
- **Constructable Stylesheet Attachment:** Ingests `widgetStyles.js` via `sheet.replaceSync()` and assigns `shadowRoot.adoptedStyleSheets = [sheet]`, avoiding inline styles and dynamic `<style>` parsing.
- **Unified State Management:** State is centralized in a single object (`state`), tracking `isOpen`, `activeTab`, `language`, `loading`, `selectedFieldId`, `scannedFields`, `analysis`, and `profile`.
- **Pointer Event Dragging:** The floating pill employs Pointer Events (`pointerdown`, `pointermove`, `pointerup`, `setPointerCapture`). Small movements (<4px) register as toggle clicks, while continuous movements dynamically reposition the host container across the viewport.
- **Roving Tabindex & ARIA Tabs:** Full keyboard accessibility adhering to the W3C ARIA tab pattern. Active tabs receive `tabindex="0"` and `aria-selected="true"`; Left/Right arrow keys dynamically transition focus and view state.
- **Dual-Mode Data Pipeline:**
  - When `USE_DUMMY_DATA = true`: Loads static, contract-compliant mock fixtures from `window.FormFlow.ui.dummy`.
  - When `USE_DUMMY_DATA = false`: Executes `window.FormFlow.scanForm()`, requests live multilingual analysis from the background service worker (`ANALYZE_FORM`), checks `response.success`, and handles errors cleanly.
- **Future Tab Placeholders:** Contains clearly marked placeholder hooks for `Upload`, `Review`, and `Photo Specs` tabs.

---

## 3. Judge Questions with Short Answers

**Q: Why use a closed ShadowRoot instead of an open ShadowRoot?**  
**A:** In `mode: 'closed'`, JavaScript running on the host webpage cannot inspect the shadow root via element properties (`host.shadowRoot` returns `null`). This prevents malicious scripts on third-party scholarship pages from observing student profile data displayed in the widget.

**Q: How does the widget handle the hostile security test field from mock-form?**  
**A:** The hostile field label contains `<img src=x onerror=alert(1)>`. Because `widget.js` exclusively uses `window.FormFlow.ui.el()` to construct cards, the string is assigned via `textContent`. The browser treats it as harmless literal text without executing script tags.

**Q: Can the user clear their personal data from the UI?**  
**A:** Yes. The "Clear my data" button immediately calls `window.FormFlow.clearProfile()`, sending `CLEAR_PROFILE` to the background worker to wipe records from `chrome.storage.local`.

---

## 4. What to Know Before the Judges
- **Draggable Anywhere:** The pill can be dragged to any corner of the screen so it never obstructs native form fields or submit buttons.
- **One-Click Toggle:** Clicking the extension icon in the Chrome toolbar or tapping the floating pill toggles panel visibility.
- **Zero Framework Footprint:** Built entirely with vanilla JavaScript, native Shadow DOM, and modern Web APIs. No React, Preact, or Webpack required.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Zero DOM Injections:** Absolutely no use of `innerHTML`, `outerHTML`, or `document.write`.
- **Keyboard Trap Prevention:** Standard Tab and Escape key sequences remain natural; focus loops are strictly contained within ARIA tabs.
- **Non-Destructive Styling:** Shadow DOM encapsulation ensures FormFlow styles cannot override host webpage buttons or layouts.
- **Data Minimization:** Displays only `aadhaarLast4` and synthetic profile details.

### Judge Security Questions & Answers:
**Q: Could a host webpage intercept FormFlow's tab clicks or button events?**  
**A:** No. Event listeners are bound within the closed ShadowRoot. Shadow DOM boundary event retargeting prevents parent page scripts from inspecting internal target elements or custom event payloads.

**Q: What happens if the backend server is unreachable?**  
**A:** When `USE_DUMMY_DATA = false`, network failures are caught cleanly, the loading state clears, and a sanitized error message is rendered using plain text nodes. The extension never crashes or enters an unrecoverable state.
