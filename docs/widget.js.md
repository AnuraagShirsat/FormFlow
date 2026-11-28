# Documentation: `/extension/ui/widget.js`

## 1. What It Does
`widget.js` is the primary user interface component of FormFlow. It mounts an isolated, accessible, draggable floating assistant pill and modal dialog into any scholarship or government web form:
- Mounts inside a closed Shadow DOM (`mode: 'closed'`), shielding FormFlow from host webpage styles and scripts.
- Implements a re-load guard (`__widgetLoaded`) and stray-host cleanup to guarantee that clicking the extension icon repeatedly never creates duplicate pills.
- Implements `positionPanel()` to dynamically place the panel below the pill (`.ff-panel-below`) when dragged near the top of the viewport, or align it to the left (`.ff-panel-left`) when dragged near the left edge.
- Reads `CONFIG.USE_DUMMY_DATA` dynamically rather than using a hardcoded toggle.
- Provides W3C ARIA tabbed navigation across Required Checklist, Field Guidance, Upload, Review, and Photo Specs tabs.
- Offers multilingual explanations (English, Kannada, Hindi) with examples and source documents.
- Includes a "Clear my data" profile wipe triggering `window.FormFlow.clearProfile()`.

---

## 2. How It Works Technically
- **Closed Shadow Root:** Enforces `hostElement.attachShadow({ mode: 'closed' })`. Third-party webpage scripts calling `host.shadowRoot` receive `null`, preventing inspection or tampering with student data rendered inside the widget.
- **Single-Pill Invariant & Stray Host Cleanup:** In `mountWidget()`, checks if an active `hostElement` and `shadowRoot` already exist in the document. If so, it toggles panel visibility instead of re-creating elements. It also cleans up any stray `#formflow-widget-host` or `[data-formflow-ui]` elements before creating a fresh host container.
- **Script Re-Load Guard:** Uses `root.FormFlow.__widgetLoaded` at the top of the IIFE. If the script is ever executed again in the same tab, it returns immediately without re-initializing component closures.
- **Intelligent Panel Positioning (`positionPanel`):** When the user drags the pill or opens the panel, `positionPanel()` evaluates the pill's bounding client rect:
  - If `rect.top < 560px` (near the top of the screen), adds `.ff-panel-below` so the panel expands downward instead of overflowing above the viewport.
  - If `rect.left < 390px` (near the left edge), adds `.ff-panel-left` so the panel aligns left instead of clipping against the left screen boundary.
- **Dynamic Configuration Toggle:** Replaces hardcoded dummy constants with `getUseDummyData()`, which dynamically reads `CONFIG.USE_DUMMY_DATA` (defaulting to `false` for live mode).
- **Constructable Stylesheet Attachment:** Uses `CSSStyleSheet` with `sheet.replaceSync(window.FormFlow.ui.widgetCss)` and `shadowRoot.adoptedStyleSheets = [sheet]`, eliminating inline `<style>` tags.

---

## 3. Judge Questions with Short Answers

**Q: What happens if a user drags the floating pill to the top of the browser window and opens the panel?**  
**A:** `positionPanel()` detects that the pill is near the top of the viewport (`rect.top < 560px`) and automatically applies the `.ff-panel-below` CSS class. The panel then opens below the pill (`top: calc(100% + 12px)`) instead of above it, ensuring the interface remains fully visible and usable.

**Q: How does FormFlow prevent multiple floating pills if the extension icon is clicked 5 times?**  
**A:** Three coordinated guards enforce this:
1. `background.js` pings the content script and skips re-injection if FormFlow is already running.
2. `widget.js` has a top-level re-load guard (`root.FormFlow.__widgetLoaded`).
3. `mountWidget()` checks for existing active host containers and removes any stray host nodes before mounting. Clicking the icon 5 times simply toggles panel visibility on the single existing pill.

**Q: Does the widget render hostile form labels safely?**  
**A:** Yes. In test scenarios with hostile form labels like `<img src=x onerror=alert(1)>`, `widget.js` renders all dynamic text strictly through `window.FormFlow.ui.el()`, which assigns text via `node.textContent`. The browser renders it as harmless plain text without executing scripts.

---

## 4. What to Know Before the Judges
- **Pill Drag & Drop:** Students can drag the pill anywhere on their screen via Pointer Events. A drag of more than 4 pixels moves the pill; a tap/click toggles the panel.
- **Full Keyboard Accessibility:** Roving tabindex and Left/Right arrow key navigation fully comply with W3C ARIA Tab patterns.
- **Zero DOM Injections:** Built with 100% vanilla JavaScript, native Shadow DOM, and textContent nodes.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Icon Click Invariant:** Verified that clicking the extension action icon 5 times results in exactly one pill.
- **Top Viewport Drag:** Verified that dragging the pill to the top edge activates `.ff-panel-below` and opens the panel downward.
- **Zero innerHTML:** Verified that `innerHTML`, `outerHTML`, and `eval` are completely absent.
- **Data Minimization:** Verified that only `aadhaarLast4` and synthetic student data are displayed.

### Judge Security Questions & Answers:
**Q: Could a malicious website capture student input entered into the FormFlow widget?**  
**A:** No. All input elements and buttons inside the widget reside within a closed Shadow DOM (`mode: 'closed'`). Webpage scripts cannot access the shadow root or query internal inputs.

**Q: Can host page CSS break the widget's layout or hide buttons?**  
**A:** No. Shadow DOM boundary isolation and `:host { all: initial; }` prevent host webpage styles from affecting FormFlow.
