# Field Matcher Documentation (`/extension/filler/matcher.js`)

## 1. What it does
`/extension/filler/matcher.js` implements the deterministic field-matching engine for FormFlow. It bridges the gap between raw web form inputs discovered by the scanner and the student's verified profile data.
- **Input**: `scannedFields` (`FormField[]`) and student `profile` (`Profile`).
- **Output**: An actionable, reviewable plan (`FillPlanItem[]`):
  ```json
  [
    {
      "fieldId": "applicant_full_name",
      "profileKey": "fullName",
      "value": "Aarav Ramesh Kumar",
      "confidence": 0.98,
      "status": "green",
      "reason": "Matched Full Name of the Applicant to verified profile fullName."
    },
    {
      "fieldId": "hostel_id",
      "profileKey": null,
      "value": null,
      "confidence": 0.0,
      "status": "red",
      "reason": "Not found in your documents"
    }
  ]
  ```
- **Review Screen Contract**: High-confidence matches (>= 0.70) are designated `green` (ready for filling). Missing, low-confidence, or unmatched fields are designated `red` (flagged for student attention before autofill).

---

## 2. How it works technically
- **Deterministic-First Architecture**:
  1. **Multilingual Synonym Dictionary**: Comprehensive mapping covering English, Hindi transliterated terms (e.g. *pita ka naam*, *mata ka naam*, *aamdani*), Kannada terms (*thande hesaru*, *thaayi hesaru*, *varshika aadaya*), and standard Indian portal notations (*s/o*, *d/o*, *as per sslc*, *marks card*).
  2. **Token Normalization & Fuzzy Scoring**: Strips stop words (*enter*, *your*, *please*), cleans punctuation, and calculates token overlaps across field `id`, `label`, and `hint`. Substring matches on short tokens (<= 3 characters) are restricted to exact token boundaries to prevent false positives (such as *d/o* matching *ddmmyyyy*).
  3. **Type Compatibility Guards**: Strongly pairs inputs with appropriate data types. Date pickers (`type="date"`) only receive valid dates; telephone inputs (`type="tel"`) prioritize mobile numbers; non-date profile keys are prohibited from populating date inputs.
  4. **Value & Format Adaptation**:
     - **Dates**: Dynamically formats date values into ISO `YYYY-MM-DD` for native HTML5 `<input type="date">`, or `DD/MM/YYYY` / `DD-MM-YYYY` when text inputs explicitly hint at day-first formatting.
     - **Selects & Radios**: Employs fuzzy option text matching to resolve discrepancies between stored values (e.g., `"Male"`) and dropdown options (e.g., `["M", "F"]` or `["Male / Purusha", "Female"]`).
     - **Numbers**: Strips commas and currency symbols for `type="number"` inputs to prevent browser validation errors.
  5. **Safety Filtering**: Password inputs (`type="password"`) and file inputs (`type="file"`) are completely omitted from the plan.

---

## 3. Judge questions with short answers

**Q: Why use a deterministic matcher instead of calling an LLM on every form?**  
**A:** Speed, privacy, cost, and reliability. Form filling happens on live student devices where latency must be under 100ms. Deterministic matching runs 100% locally in JavaScript with zero network calls, zero API costs, and zero risk of hallucinating false answers into official scholarship forms.

**Q: How does FormFlow handle Indian multilingual forms (e.g., Hindi or Kannada labels)?**  
**A:** Our synonym dictionary includes common transliterated Hindi and Kannada terms used on state portals (e.g., *thande hesaru*, *pita ka naam*, *janma dinank*, *varga*). The normalizer tokenizes and matches these directly to the profile keys.

**Q: What happens if a field is not in the student's profile?**  
**A:** The matcher marks the field `status: "red"` with `value: null`, `confidence: 0.0`, and an explanatory reason like `"Value for fatherName is missing from profile. Please upload the required document."`. The widget's review screen displays this field in red so the student knows to enter it manually or upload the missing document.

---

## 4. What to know before the judges
- The matcher produces the exact `FillPlanItem` contract expected by Himani's review widget (`extension/ui/`) and Kartik's form filler (`extension/filler/filler.js`).
- The review step is mandatory: FormFlow NEVER fills fields directly from the matcher. It presents the plan to the student first. Only approved green fields are dispatched to the filler.
- Password fields and hidden fields are completely ignored.

---

## 5. Security checks done and judge questions about security

### Security Checks Done:
- [x] **No Password or Hidden Inputs**: Verified that `type="password"` inputs are stripped from the plan.
- [x] **No Auto-Fill Without Review**: Verified output requires student review before any DOM modification.
- [x] **False Positive Prevention**: Tested short acronym collision prevention (e.g., `d/o` vs `dd/mm/yyyy`).
- [x] **Memory & Client-Side Execution**: Verified 100% offline, synchronous local execution without external network telemetry.

### Judge Questions on Security:
**Q: Could a malicious form label trick the matcher into leaking sensitive fields like passwords?**  
**A:** No. FormFlow strictly ignores `type="password"` fields. Furthermore, FormFlow never stores full 12-digit Aadhaar numbers in the profile (only `aadhaarLast4`), so an Aadhaar leakage vector cannot occur.

**Q: Does the matcher modify the live webpage DOM?**  
**A:** No. `matcher.js` is a pure function. It reads scanned metadata and outputs an immutable JSON plan. It performs zero DOM manipulation.
