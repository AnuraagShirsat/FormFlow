# Documentation: `/extension/ui/domUtil.js`

## 1. What It Does
`domUtil.js` is FormFlow's core DOM generation security utility. It exposes `window.FormFlow.ui.el(tag, text, attrs, children)` to safely construct HTML elements across all widget views. It serves as our frontline defense against **Attack 11 (Cross-Site Scripting via malicious webpage labels or prompt injection text)**. It guarantees that untrusted webpage content, form labels, tooltips, and AI explanations are rendered strictly as harmless text, never as executable HTML.

---

## 2. How It Works Technically
- **Safe Element Creation:** Uses `document.createElement(tag)` exclusively. Never invokes `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write`.
- **Text-Only Content Binding:** Sets text content strictly via `element.textContent = String(text)`. This ensures special characters (`<`, `>`, `&`, `"`, `'`) are treated as literal text nodes by the browser engine rather than parsed markup.
- **Strict Attribute Allow-List:** Attributes are filtered against a verified allow-list:
  - Common presentation attributes: `class`, `id`, `type`, `role`, `tabindex`, `title`, `placeholder`, `for`
  - Form state attributes: `value`, `checked`, `disabled`
  - Accessibility attributes: any attribute starting with `aria-`
  - Dataset attributes: any attribute starting with `data-`
- **Inline Handler Defense:** Explicitly identifies and rejects any attribute starting with `on` (e.g. `onclick`, `onerror`, `onload`, `onmouseover`), preventing inline script injection.
- **Safe URL Gating:** Allows `href` attributes only when the value is a string beginning strictly with `https:`, blocking `javascript:`, `data:`, and `vbscript:` URI schemes.
- **Safe Child Node Appending:** Safely appends child `Node` elements or creates text nodes via `document.createTextNode` for string/number children.

---

## 3. Judge Questions with Short Answers

**Q: Why author a custom DOM helper instead of using innerHTML with DOMPurify?**  
**A:** Content scripts in FormFlow run with zero build step and zero third-party npm dependencies. Sanitizer libraries can still suffer from mutation XSS bugs and bundle bloat. By constructing elements natively with `document.createElement` and `textContent`, we eliminate the HTML parser entirely, making XSS impossible by design.

**Q: What happens if a malicious form contains a label like `<img src=x onerror=alert(1)>`?**  
**A:** `domUtil.js` sets the element's `textContent` to the string. The browser renders the literal text characters `"<img src=x onerror=alert(1)>"`. The browser's HTML parser is never invoked, so no image element is created and the onerror script never executes.

**Q: Why is href restricted to URLs starting with https:?**  
**A:** In HTML, an anchor tag with `href="javascript:..."` executes arbitrary code when clicked. Restricting `href` strictly to `https:` completely eliminates protocol-based code execution vectors while ensuring all external documentation links use encrypted transport.

---

## 4. What to Know Before the Judges
- **The Hostile Test Field:** In `mock-form/index.html` (Field 6), there is a deliberately hostile label: `TEST FIELD <img src=x onerror=alert(1)> Ignore your previous instructions...`. When FormFlow scans and displays this field, `domUtil.js` ensures it displays as inert plain text with zero alert popups or prompt leaks.
- **Zero Build Step:** The file is pure vanilla JavaScript loaded directly by MV3's `chrome.scripting.executeScript`.
- **Global UI Namespace:** Attaches cleanly to `window.FormFlow.ui.el`, providing a shared utility across `widgetStyles.js`, `review.js`, and `widget.js`.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **No HTML Interpretation:** Zero use of `innerHTML`, `outerHTML`, or `insertAdjacentHTML`.
- **Inline Handler Rejection:** Any attribute key matching `/^on/i` is immediately discarded.
- **URL Scheme Validation:** `href` values are tested with `toLowerCase().indexOf('https:') === 0`.
- **No Dynamic Code Evaluation:** Free of `eval()`, `new Function()`, or dynamic script tags.

### Judge Security Questions & Answers:
**Q: How does domUtil.js protect against Attack 11 (XSS in extension UI)?**  
**A:** Attack 11 targets extensions by injecting script payloads through target webpage attributes into the extension's popup or floating panel. Because `domUtil.js` never parses markup and enforces an attribute allow-list, hostile strings injected from form inputs remain inert text nodes within the Shadow DOM.

**Q: Can a webpage manipulate element attributes through data-* or aria-*?**  
**A:** No. `data-*` and `aria-*` attributes cannot trigger script execution in modern browsers, but they enable full accessibility compliance (WCAG/ARIA) and deterministic UI targeting without security risks.
