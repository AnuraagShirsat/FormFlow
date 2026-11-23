# Form Filler Documentation (`/extension/filler/filler.js`)

## 1. What it does
`/extension/filler/filler.js` is the DOM automation engine in FormFlow. It executes the form filling operation on target scholarship and government portals.
- **Explicit User Consent**: Runs **ONLY** after the student explicitly clicks the **"Fill form"** button on the widget review screen.
- **Fills Approved Fields Only**: Operates strictly on plan items where `status === 'green'`.
- **Framework-Safe Input Updates**: Interacts with the native HTML prototype setters (`HTMLInputElement.prototype`, `HTMLSelectElement.prototype`, `HTMLTextAreaElement.prototype`) and dispatches bubbling `input`, `change`, and `blur` events so reactive frameworks (React, Vue, Angular) immediately recognize updated values.
- **Visual Missing-Field Indicators**: Visibly outlines missing / low-confidence (`red`) fields in red (`2px solid #ef4444`) and automatically scrolls the viewport to the first missing field.
- **Instant One-Click Undo**: Maintains an internal undo stack allowing the student to instantly restore previous field values and clear outlines with `window.FormFlow.undoFill()`.
- **Absolute Safety Boundaries**:
  - **NEVER** touches password fields (`type="password"`).
  - **NEVER** touches hidden fields (`type="hidden"`).
  - **NEVER** clicks submit buttons or calls `form.submit()`. Auto-submission is strictly prohibited.

---

## 2. How it works technically
- **Global Contract Namespace**: Attaches functions directly to `window.FormFlow`:
  - `window.FormFlow.fillFields(plan)`
  - `window.FormFlow.undoFill()`
  - `window.FormFlow.canUndo()`
- **Target Resolution Strategy** (`findTargetElement`):
  Resolves form controls by checking:
  1. `document.getElementById(fieldId)`
  2. `document.getElementsByName(fieldId)` (handles individual controls and radio groups)
  3. `document.querySelector(fieldId)`
  4. `document.querySelector('[name="..."]')`
- **React/Angular Native Prototype Setter**:
  Modern frontend libraries override the `.value` accessor property on inputs. Setting `el.value = 'abc'` directly bypasses React's synthetic event system. `filler.js` inspects the prototype chain:
  ```javascript
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  desc.set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
  ```
- **Control Handlers**:
  - **Text / Number / Date / Tel / Email / Textarea**: Native prototype setter + change events.
  - **Select Dropdowns**: Searches `<option>` tags by `value` or `text` (case-insensitive and substring), updates `selectedIndex`, and dispatches change events.
  - **Radios**: Identifies the radio in the group matching the target value or adjacent label text and sets `checked = true`.
  - **Checkboxes**: Evaluates truthy states (`true`, `'yes'`, `'1'`, `'on'`) and sets native checked property.
- **Undo Stack**:
  Captures pre-modification snapshots:
  ```javascript
  {
    element: el,
    type: 'text' | 'radio' | 'checkbox' | 'outline_only',
    previousValue: el.value,
    previousChecked: el.checked,
    previousOutline: el.style.outline,
    previousOutlineOffset: el.style.outlineOffset
  }
  ```
  `undoFill()` iterates the stack in reverse, restoring previous values and clearing added outlines.

---

## 3. Judge questions with short answers

**Q: Why doesn't FormFlow auto-submit the form once filled?**  
**A:** Auto-submission on government scholarship portals is dangerous. Scholarships involve legal declarations where false or mistyped information could lead to rejection or disqualification. FormFlow assists by filling the fields, but strictly mandates that the student performs the final manual review and clicks submit themselves.

**Q: Many modern web forms built with React or Angular ignore autofill scripts. How does FormFlow handle this?**  
**A:** Frameworks like React hijack the `.value` property setter on input elements to track state changes. FormFlow invokes the native setter from `HTMLInputElement.prototype` directly on the element before dispatching bubbling `input` and `change` events. This ensures synthetic event handlers in React, Angular, and Vue process the change cleanly.

**Q: What if the student made a mistake or wants to revert the filled values?**  
**A:** FormFlow provides an Undo button (`window.FormFlow.undoFill()`). Every element's previous value and checked state is recorded in memory prior to filling. Clicking Undo restores every input to its exact prior state.

---

## 4. What to know before the judges
- Filling only occurs when the user clicks **"Fill form"** inside the review widget.
- Missing fields (`status === 'red'`) are visibly highlighted with a red outline, and the page smoothly scrolls to the first missing field so the applicant knows exactly what needs attention.
- Password fields and hidden fields are completely skipped.

---

## 5. Security checks done and judge questions about security

### Security Checks Done:
- [x] **No Auto-Submit**: Verified that `form.submit()`, button clicks, or synthetic submission events are completely absent.
- [x] **Password Protection**: Verified that `type="password"` inputs are never read or modified, even if present in the plan.
- [x] **Hidden Input Protection**: Verified that `type="hidden"` inputs are ignored to prevent tampering with CSRF tokens or internal state.
- [x] **No eval / No innerHTML**: Plain, clean JavaScript using native DOM properties and events.

### Judge Questions on Security:
**Q: Could a malicious website hijack FormFlow to extract or tamper with passwords or CSRF tokens?**  
**A:** No. `isSafeElement()` specifically blocks `type="password"` and `type="hidden"` elements. FormFlow never reads, touches, or overwrites password fields or hidden anti-CSRF token inputs.

**Q: Does FormFlow inject any third-party scripts or use `eval()`?**  
**A:** No. `filler.js` is pure standard JavaScript with zero third-party dependencies, zero eval, zero `new Function`, and zero `innerHTML`. It runs securely inside the extension's isolated content script world.
