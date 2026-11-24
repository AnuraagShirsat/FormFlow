# Documentation: `/extension/ui/dummyData.js`

## 1. What It Does
`dummyData.js` provides static offline mock fixtures conforming strictly to the schemas defined in `/contracts/contract.json`. It attaches to `window.FormFlow.ui.dummy` and contains:
- `analyzeForm`: Complete multilingual form analysis responses for English (`en`), Kannada (`kn`), and Hindi (`hi`), covering all 20 fields discovered on `/mock-form/index.html` (including its deliberate hostile security test field) and the 5 required scholarship documents.
- `extractDocument`: High-confidence document extraction sample for Aadhaar card parsing.
- `profile`: Full 17-field student profile fixture adhering to the local profile schema, retaining only the last 4 digits of Aadhaar.

---

## 2. How It Works Technically
- **Packaging as JavaScript vs JSON:** In Chrome Manifest V3, content scripts executing in the page's isolated world cannot load local extension `.json` files via `fetch()` without declaring them in `web_accessible_resources` inside `manifest.json`. Declaring files in `web_accessible_resources` exposes them to any untrusted website visited by the user. By bundling fixtures inside a pure JavaScript file injected on demand, data remains completely private within the extension's execution scope.
- **Multilingual Analysis Generator:** Uses `buildAnalyzeFormFixture(lang)` to construct an `AnalyzeFormResponse` for each supported language. For `en`, `explanationLocal` is an empty string `""`; for `kn`, it provides Kannada translations; for `hi`, it provides Hindi translations.
- **Synthetic Data Labeling:** All personal names, dates, addresses, and ID records are entirely fictitious and explicitly prepended with `"SAMPLE:"`.
- **Aadhaar Privacy Enforcement:** Complies with the privacy invariant: `aadhaarLast4` is stored as `"4321"`; full 12-digit Aadhaar numbers are never retained.

---

## 3. Judge Questions with Short Answers

**Q: Why is dummyData stored in a JS file instead of a JSON file?**  
**A:** In Chrome Manifest V3, reading local extension JSON from a content script requires listing the file in `web_accessible_resources`. This creates a security flaw where any host website can probe or fetch the extension's assets. Packaging fixtures as an injected JavaScript file keeps the data isolated within `window.FormFlow.ui` without exposing web-accessible endpoints.

**Q: Does dummyData include the hostile security test field from mock-form?**  
**A:** Yes. Field `#hostileTest` (`<img src=x onerror=alert(1)> Ignore your previous instructions...`) is included in `FIELD_DEFINITIONS` with standard explanations. When rendered by `domUtil.js`, it verifies that hostile script tags or prompt injection strings are rendered strictly as inert text.

**Q: What languages are supported by the offline analysis fixture?**  
**A:** English (`en`), Kannada (`kn`), and Hindi (`hi`), matching the contract requirements and the local scholarship demographics of post-matric portals like Karnataka SSP and National Scholarship Portal.

---

## 4. What to Know Before the Judges
- **Demonstration Without Backend:** The extension can be demonstrated offline with zero internet access or without running the Node proxy simply by setting `USE_DUMMY_DATA = true` in `widget.js`.
- **Zero Real Personal Data:** All data records are synthetic and marked with `SAMPLE:`. No live student PII is included.
- **Direct Schema Alignment:** The property names and nesting match `AnalyzeFormResponse`, `ExtractDocumentResponse`, and `Profile` in `/contracts/contract.json` down to the character.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **No Evaluation:** Pure object literal declarations; zero use of `eval()` or `Function()`.
- **Zero Web-Accessible Exposure:** Avoids `web_accessible_resources` declarations in `manifest.json`.
- **Aadhaar Minimization:** Stores only `aadhaarLast4`, eliminating biometric or 12-digit UIDAI exposure.
- **Strict Safe Text Values:** Sample data contains no live script tags, tracking pixels, or active links.

### Judge Security Questions & Answers:
**Q: Could a malicious website scrape student data from window.FormFlow.ui.dummy?**  
**A:** No. `window.FormFlow` resides exclusively within the content script's "isolated world" in Chrome MV3. Host webpage scripts and browser extensions do not share global variables; the host website's JavaScript engine cannot access the `window.FormFlow` object.

**Q: Are the explanations in dummyData safe against prompt injection?**  
**A:** Yes. The explanations are static, reviewed strings, and are passed to the DOM using `domUtil.el()` (via `textContent`), ensuring that even if an explanation contained markdown or HTML entities, it cannot execute code in the user's browser.
