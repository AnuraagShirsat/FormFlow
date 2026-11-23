# Documentation: `/extension/core/scanner.js`

## 1. What It Does
`scanner.js` implements the DOM form inspection engine for FormFlow. It inspects web forms to locate interactive input elements (text, email, tel, number, date, select, radio groups, checkboxes, textareas, and file upload fields). It extracts accessible labels, assigns persistent identifiers via HTML5 `data-formflow-id` attributes, and outputs an array of `FormField` objects matching the central contract.

---

## 2. How It Works Technically
- **Label Resolution Priority:** Intelligently discovers labels using DOM semantics in order: `aria-labelledby`, `aria-label`, `<label for="...">`, wrapping `<label>`, fieldset `<legend>`, adjacent sibling text (`<span>`, `<p>`, `<strong>`), preceding table cells (`<th>`, `<td>`), and finally `placeholder`/`title`.
- **Text Extraction via `textContent`:** All text parsing is performed strictly using `textContent` and regex whitespace normalization. `innerHTML` is never invoked.
- **Deep Tree Traversal:** Recursively traverses the standard document DOM, open Shadow Roots (`element.shadowRoot`), and same-origin `<iframe>` documents.
- **Stable ID Stamping:** Elements are stamped with a unique `data-formflow-id` attribute (max 64 characters) so that the downstream autofill engine (`/extension/filler/filler.js`) can re-query the exact target DOM node during population.
- **Strict Boundary Caps:** Caps the total output to 100 fields, and limits label and hint lengths to 200 characters each to prevent memory overload and limit prompt injection surface.

---

## 3. Judge Questions with Short Answers

**Q: Why do you never inspect `element.value` or current field values in the scanner?**  
**A:** The scanner's job is structural form discovery, not data scraping. By intentionally ignoring existing user input values, FormFlow guarantees that draft text or pre-filled data on the webpage is never harvested or forwarded to the proxy.

**Q: How do you handle modern web apps built with Web Components or Shadow DOM?**  
**A:** `collectRawElements()` inspects all nodes in the DOM tree. If an element exposes an open `.shadowRoot`, the scanner recursively descends into the shadow DOM to discover inputs while ignoring our own extension's UI host.

**Q: How does the autofill engine find fields after they have been scanned?**  
**A:** During the scan pass, every identified field receives a persistent `data-formflow-id` attribute in the DOM. When the student approves the fill plan, the filler matches `item.fieldId` directly to `[data-formflow-id="..."]`.

---

## 4. What to Know Before the Judges
- **Negative Security Checks:** The scanner actively filters out `type="password"`, `type="hidden"`, action buttons (`submit`, `button`, `reset`), and disabled inputs (`[disabled]`, `aria-disabled="true"`).
- **Prompt Injection Defense:** Restricting labels and hints to 200 characters prevents malicious webpages from embedding massive adversarial instructions inside form labels intended to manipulate Gemini.
- **Integration Status:** Currently validated using `/scripts/scanner-test.html`; full portal testing will run against `/mock-form` upon merge by Himani.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Zero Sensitive Field Scraping:** Confirmed password inputs and hidden session tokens are filtered out and ignored.
- **XSS Prevention:** Zero use of `innerHTML` or dynamic string evaluation; labels are gathered using `textContent` and sanitized.
- **Cross-Origin Iframe Isolation:** Wrapped iframe document access in `try...catch` blocks so Cross-Origin Same-Origin Policy (SOP) blocks are handled without exceptions.
- **No Infinite Loops:** Recursive DOM traversal limits collection to a maximum of 150 raw nodes and outputs at most 100 fields.

### Judge Security Questions & Answers:
**Q: Could an attacker craft a form with hundreds of thousands of inputs to crash the user's browser or exhaust Gemini tokens?**  
**A:** No. `collectRawElements` halts traversal if candidates exceed 150 elements, and `scanForm()` strictly slices output to 100 fields. Furthermore, each label and hint is capped at 200 characters.

**Q: Can a malicious website detect FormFlow by checking for DOM changes?**  
**A:** FormFlow only injects `data-formflow-id` attributes on form inputs when the student explicitly triggers the extension via the toolbar icon. The attributes use standard HTML5 dataset conventions and expose no personal information.
