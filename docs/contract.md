# Contract Documentation: `/contracts/contract.md` & `/contracts/contract.json`

## 1. What It Does
The FormFlow contract establishes a strict, immutable interface boundary between all modules of the hackathon project:
- Defines the scanning structure (`FormField`) that extracts page elements without collecting passwords, hidden inputs, or typed user values.
- Specifies API request/response payloads for the Node.js backend proxy (`/analyze-form` and `/extract-document`).
- Standardizes the student profile schema persisted exclusively inside `chrome.storage.local`.
- Dictates internal Chrome runtime message types between content scripts and the background service worker (`SCAN_FORM`, `ANALYZE_FORM`, `EXTRACT_DOCUMENT`, `GET_PROFILE`, `SAVE_PROFILE`, `CLEAR_PROFILE`).
- Outlines the global DOM namespace (`window.FormFlow`) that allows decoupled scripts to coordinate safely without modern bundlers or global pollution.
- Standardizes error structures across the system without leaking stack traces.

---

## 2. How It Works Technically
- **JSON Schema Validation:** Defined in [contract.json](file:///c:/GitHub%20Projects/FormFlow/contracts/contract.json) conforming to JSON Schema Draft-07, supporting automated payload validation on both frontend and backend.
- **Specification Documentation:** Documented in human-readable Markdown in [contract.md](file:///c:/GitHub%20Projects/FormFlow/contracts/contract.md) with constraints, bounds, types, and synthetic samples.
- **Single Source of Truth:** Maintained exclusively by Anuraag to eliminate integration bugs between distributed teammates (UI by Himani, Filler by Kartik, Backend by Ivan).
- **Loose Coupling via Vanilla JS:** Modules attach methods to `window.FormFlow` (`scanForm`, `mountWidget`, `fillFields`), allowing modular execution without Node build steps or transpilation.
- **Confidence Rating & Plan Execution:** The fill plan requires explicit `status: "green" | "red"`, confidence thresholds, and plain-language reasoning before values can touch user form fields.

---

## 3. Judge Questions with Short Answers

**Q: Why have a rigid contract for a hackathon project?**  
**A:** With three engineers simultaneously authoring the UI, form filler, and backend proxy, the contract eliminates cross-team blockers, avoids API drift, and guarantees that security invariants (like zero password scanning) are honored from day one.

**Q: Why is Aadhaar restricted to only the last 4 digits in the Profile schema?**  
**A:** Government portals only use the last 4 digits for student validation against DBT and UIDAI databases. Storing full 12-digit Aadhaar numbers creates immense privacy liability; keeping only the last 4 digits follows zero-trust data minimization.

**Q: What prevents the extension from filling wrong fields or submitting forms automatically?**  
**A:** The `fillFields(plan)` contract requires an explicit user click ("Fill Form") and validates that each item is flagged `status: "green"`. FormFlow's contract strictly prohibits programmatic form submission (`form.submit()`), leaving final submission under human control.

---

## 4. What to Know Before the Judges
- **Synthetic Data Guarantee:** All sample data in contracts and mock fixtures are explicitly marked with `(SAMPLE)`. No live personally identifiable information (PII) is ever used.
- **Client-Side Profile Storage:** The student profile lives only in the browser's `chrome.storage.local`. It is never uploaded to a database or cloud server.
- **No Direct AI Communication:** The browser extension never communicates directly with Gemini. It routes through the private Node proxy defined in the contract.
- **Multilingual Support:** The `/analyze-form` contract specifically requires native support for English (`en`), Kannada (`kn`), and Hindi (`hi`).

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Zero Sensitive Field Capture:** Form scanning contract explicitly forbids capturing `type="password"`, `type="hidden"`, or existing input values.
- **Payload Constraints:** Strict limits enforced on all fields (max 100 fields per form, max 64 characters per ID, max 200 characters per label, max 50 options per select) to prevent denial-of-service via malformed DOM attacks.
- **Information Leak Prevention:** The universal error response shape `{ error: { code, message } }` strips all stack traces, file paths, and environment internals.
- **Safe DOM Invariant:** Widget contracts mandate the use of Shadow DOM and forbid `innerHTML`, protecting against XSS attacks from third-party form pages.

### Judge Security Questions & Answers:
**Q: Could a malicious form page steal the student's profile via window.FormFlow?**  
**A:** Content scripts run in an isolated execution world in Chrome MV3. While `window.FormFlow` is shared across our own extension content scripts within their isolated world, the host webpage's untrusted scripts cannot inspect or access our isolated world's `window` object or storage.

**Q: What happens if an image payload contains exploit code or an invalid file?**  
**A:** The `/extract-document` contract strictly limits MIME types to `image/jpeg`, `image/png`, and `application/pdf`, and the backend proxy validates base64 structure and payload limits before passing data to Gemini.
