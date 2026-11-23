# Documentation: `/scripts/scanner-test.html`

## 1. What It Does
`scanner-test.html` provides a dedicated standalone test harness for validating `window.FormFlow.scanForm()`. It features a diverse synthetic scholarship form with varied input types (text, date, number, select, radio groups, textarea, file upload, checkboxes) along with negative security test inputs (passwords, hidden CSRF tokens, disabled inputs).

---

## 2. How It Works Technically
- **Independent Test Harness:** Loads `content.js` and `scanner.js` locally in a test browser tab without requiring Chrome extension installation.
- **Automated Invariant Assertion:** When the user clicks "Run FormFlow Scanner", the script measures execution latency, checks that output adheres to the `FormField` contract, and asserts that security exclusions (passwords, hidden fields, disabled fields) succeeded.
- **Safe Output Rendering:** Displays JSON output inside a `<pre>` element using `textContent` only. Zero `innerHTML` is used.
- **Label Resolution Coverage:** Tests label resolution across `label[for]`, wrapping `<label>`, `aria-label`, `<legend>`, and placeholder mechanisms.

---

## 3. Judge Questions with Short Answers

**Q: Why have a dedicated test HTML page when there is a /mock-form folder?**  
**A:** `scanner-test.html` is an isolated developer unit test harness owned by Anuraag to verify DOM scanning algorithms, negative edge cases, and security invariants immediately, without depending on Himani's ongoing mock portal UI development in `/mock-form`.

**Q: Does this test page use any real student information?**  
**A:** No. Every single field name, label, option, and placeholder contains synthetic mock data explicitly marked `(SAMPLE)`.

---

## 4. What to Know Before the Judges
- **Self-Contained Verification:** Judges can open `scripts/scanner-test.html` directly in any web browser and click "Run FormFlow Scanner" to inspect live scanning and contract compliance.
- **Upcoming Mock Portal:** Real-world scholarship portal verification will run against `/mock-form` once Himani finalizes that module.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Negative Test Case Validation:** Specifically embeds a password field (`#secret_pin`), a hidden CSRF token (`[name="internal_csrf_token"]`), and a disabled input (`#disabled_field`) to verify the scanner ignores them.
- **Clean Content Security:** No external CDN scripts, tracking beacons, or third-party stylesheets.
- **Safe DOM Invariant:** All UI feedback rendered via `document.createElement()` and `textContent`.

### Judge Security Questions & Answers:
**Q: How do you prove the scanner ignores passwords during a live demo?**  
**A:** On `scripts/scanner-test.html`, click "Run FormFlow Scanner" — the test assertions explicitly verify that the password input (`#secret_pin`) is absent from the scanned JSON results, displaying a green pass badge.
