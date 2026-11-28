# Contract Documentation: `/contracts/contract.md` & `/contracts/contract.json`

## 1. What It Does
The FormFlow contract establishes the authoritative interface boundary across all extension components and the Node.js backend proxy:
- Defines the `FormField` specification capturing inputs without collecting passwords, hidden inputs, or user values.
- Specifies API request/response payloads for `/analyze-form` (`explanation`, `explanationLocal`, `example`, `sourceDocument`, `requiredDocuments`) and `/extract-document`.
- Defines the canonical 21-key `Profile` schema persisted in `chrome.storage.local`, including the new keys: `state`, `district`, `rollNumber`, and `bankName`. Full 12-digit Aadhaar numbers are strictly forbidden (`aadhaarLast4` only).
- Defines the three-tier `FillPlanItem` specification: `status: "green" | "amber" | "red"`, including the optional `approved` boolean flag for amber items.
- Defines the full-plan execution contract for `window.FormFlow.fillFields(plan)`, returning `{ filledCount, skippedCount, missingCount, errors: [] }`.
- Defines internal Chrome runtime message types and standardized success/error reply envelopes.

---

## 2. How It Works Technically
- **JSON Schema Validation:** Defined in [contract.json](file:///c:/GitHub%20Projects/FormFlow/contracts/contract.json) conforming to JSON Schema Draft-07, supporting schema validation across backend routes and client scripts.
- **Specification Documentation:** Detailed in human-readable Markdown in [contract.md](file:///c:/GitHub%20Projects/FormFlow/contracts/contract.md) with types, constraints, descriptions, and synthetic sample objects.
- **Three-Tier Match Review:**
  - `"green"`: High confidence match; filled automatically when the student clicks "Fill form".
  - `"amber"`: Medium confidence match; requires student review, filled only when `approved === true`.
  - `"red"`: Missing or low confidence match; never filled, visibly outlined in red with automatic scroll to the first red field.
- **Full-Plan Return Contract:** `window.FormFlow.fillFields(plan)` receives the complete plan and returns `{ filledCount, skippedCount, missingCount, errors: [] }`. An item only increments `filledCount` if the element value actually changed.
- **Zero-Trust Data Minimization:** Restricts national identification strictly to `aadhaarLast4` (exactly 4 digits).

---

## 3. Judge Questions with Short Answers

**Q: What is the purpose of the new `amber` status in `FillPlanItem`?**  
**A:** In high-stakes scholarship applications, guessing values with moderate confidence can cause application rejection. The `amber` status flags fields that need human review (such as fuzzy name matches or document roll numbers). These fields are only populated if the student explicitly marks them `approved: true` in the review UI.

**Q: Why was `missingCount` added to the `fillFields` return shape?**  
**A:** Returning `{ filledCount, skippedCount, missingCount, errors: [] }` provides full transparency. The UI widget can display how many fields were filled, how many were skipped by the student, and how many are missing required data, giving students confidence in what was changed.

**Q: Why are `state`, `district`, `rollNumber`, and `bankName` included in the Profile schema?**  
**A:** Indian state and central scholarship portals (e.g. SSP Karnataka, NSP) require domicile state, district, academic roll number, and DBT bank name to disburse funds. Standardizing these 4 keys in the contract allows automatic mapping from marks cards and bank passbooks.

---

## 4. What to Know Before the Judges
- **Synthetic Sample Labeling:** Every sample value in `contract.json` and `contract.md` is explicitly labelled `(SAMPLE)`. Zero real PII exists in the repository.
- **Single Source of Truth:** Maintained by Anuraag under `/contracts`. Teammates submit proposed contract changes via `docs/contract-requests.md`.
- **Zero Auto-Submit:** FormFlow strictly forbids programmatic form submission (`form.submit()`); human agency is preserved.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Schema Validation:** Validated `contract.json` syntax and draft-07 compatibility.
- **Password Exclusion Invariant:** Confirmed that passwords and hidden fields are excluded from `FormField`.
- **Aadhaar Regex Enforcement:** Verified that `aadhaarLast4` strictly enforces `^\d{4}$`.
- **Error Sanitization:** Universal error response shape guarantees zero stack traces or internal server error leaks.

### Judge Security Questions & Answers:
**Q: How does the contract prevent cross-site data theft?**  
**A:** The student profile contract stipulates storage exclusively in `chrome.storage.local`. The extension has no external sync API, no remote user database, and runs in an isolated extension world.

**Q: What prevents a prompt injection in form fields from overriding contract constraints?**  
**A:** The contract restricts string lengths (max 200 chars for labels, max 50 for options), and system prompts treat input text as passive data. The client review screen ensures the student reviews and approves values before they are written.
