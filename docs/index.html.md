# /mock-form/index.html

## 1. What it does
A fake single-page scholarship application used to test FormFlow without touching a real government site. It has 17 normal fields (name, father's name, date of birth, gender radio, category select, income, Aadhaar, mobile, email, address, pincode, bank account, IFSC, course, institution, marks), a photo and a signature upload, a declaration checkbox and a Submit button. It also has one deliberately hostile label for security testing. All data is fake and labelled SAMPLE.

## 2. How it works technically
- Plain HTML and CSS, one small inline script, no libraries.
- Each field has a `<label for>` so the scanner can find label text, and the radio group uses `role="radiogroup"` with `aria-labelledby`.
- Hints under the upload fields state the size rules (200x230 px / 50 KB photo, 140x60 px / 30 KB signature) so the image fixer has a spec to test against.
- Submit is blocked with `preventDefault()` in a script using `addEventListener`, and only prints "nothing was submitted".
- The hostile label is escaped in the source (`&lt;img ...&gt;`). The page does not run it, but the label's `textContent` is the literal attack string, which is exactly what the widget will read.

## 3. Judge questions
- **Why a mock form?** Real portals change and may not be used for testing. A fixed page gives repeatable demos and tests.
- **Does Submit send data anywhere?** No. It is cancelled and shows a message.
- **What is the odd label?** A security test: it contains an XSS payload and a prompt-injection sentence.
- **Is any real data in it?** No, only SAMPLE placeholders.

## 4. What to know before the judges
- Open this page with the extension loaded, then show the widget listing the hostile label as plain text.
- The form is intentionally generic. Other forms may use different markup, which Kartik's filler handles.
- The photo hint (200x230 px, 50 KB) and signature hint (140x60 px, 30 KB) are test values and should match `specs.json` once Kartik's registry exists.

## 5. Security checks done and judge questions about security
**Checks done**
- The hostile payload is HTML-escaped in the source, so the page itself never executes it.
- A code comment marks the field clearly as a test.
- No inline event handlers, no external scripts, no network calls, no real personal data.
- Submit cannot send anything.

**Judge questions**
- **What happens if a real website has a label like that?** The widget builds text with `textContent` only (never innerHTML), so it shows as plain characters. The AI prompt on the backend also treats form text as data, not instructions.
- **Could the page leak the system prompt?** The page has no access to prompts; they live only on the backend.
