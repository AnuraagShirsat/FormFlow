# Documentation: `/extension/ui/review.js`

## 1. What It Does
`review.js` implements two interactive screens within the FormFlow floating widget:
1. **Document Upload Panel (`window.FormFlow.ui.renderUploadPanel`):** Enables students to upload verification documents (Aadhaar cards, marksheets, income/caste certificates) via drag-and-drop or file selection. Validates files in memory using `checkUpload(file)`, performs AI extraction (or offline dummy extraction), and saves high-confidence extracted values (>= 0.5) to the student profile while preserving Aadhaar privacy (`aadhaarLast4` only).
2. **Verification and Review Panel (`window.FormFlow.ui.renderReviewPanel`):** Generates a fill plan via `createFillPlan(fields, profile)`. Displays matched fields in editable inputs with status chips (green for verified/matched, red for missing/low-confidence). Allows inline manual edits to a local copy of the plan. A single "Fill form" button populates the form using `fillFields(plan)`. Provides full undo capability via `undoFill()` and `canUndo()`.

---

## 2. How It Works Technically
- **Document Selection & Validation:** Provides a dropdown of supported document categories (`aadhaar`, `marksheet_10th`, `marksheet_12th`, `income_certificate`, `caste_certificate`). All files are pre-screened through `checkUpload(file)` before reading.
- **In-Memory File Processing:** Uploaded files remain strictly in browser memory. In real mode, files are converted to raw base64 strings (without the `data:` URL scheme prefix) and dispatched via `sendToBackground('EXTRACT_DOCUMENT', { docType, mimeType, data })`. In dummy mode, pre-configured fixtures from `window.FormFlow.ui.dummy.extractDocument` are utilized.
- **Confidence Filtering & Data Minimization:** Only extracted fields with `confidence >= 0.5` and non-null values are merged into the profile via `ctx.saveProfile(updates)`. Any Aadhaar number is stripped to its trailing 4 digits (`aadhaarLast4`) before saving.
- **Isolated Plan Editing:** `renderReviewPanel` creates a deep clone of the plan returned by `createFillPlan()`. User edits in text inputs update only the local plan copy, leaving stored profile records intact.
- **Null profileKey Resilience:** Unmatched red fields possess `profileKey: null`. The review panel safely handles `null` profile keys without reference errors.
- **Deterministic Fill Execution:** Form fields remain untouched until the student explicitly clicks "Fill form". Only green items and edited items with non-empty values are passed to `fillFields(plan)`. FormFlow strictly never invokes `form.submit()`.
- **Stateful Undo Integration:** After filling, an "Undo fill" button is enabled based on `canUndo()`. Clicking it invokes `undoFill()`, restoring previous DOM field states, values, and outlines.

---

## 3. Judge Questions with Short Answers

**Q: Does FormFlow automatically fill or submit forms as soon as a document is uploaded?**  
**A:** Never. Uploaded documents only populate the student's local profile in `chrome.storage.local`. Form fields are only modified when the student reviews the matches and explicitly clicks "Fill form". FormFlow contains zero automated submission logic (`form.submit()`), keeping the student in complete control.

**Q: How does the review screen handle fields that were not found in uploaded documents?**  
**A:** Unmatched fields are flagged with a prominent red status chip ("Missing") and display a clear reason. The student can type the missing information directly into the field's input box; typing a value converts the item to "Edited" (green) so it will be included in the form fill.

**Q: What happens if an uploaded document contains an unmasked 12-digit Aadhaar number?**  
**A:** `review.js` extracts only the last 4 digits (`val.replace(/\D/g, '').slice(-4)`), saves it as `aadhaarLast4`, and discards the full number. Furthermore, `background.js` enforces a secondary sanitization guard in `saveStoredProfile()`, guaranteeing that full Aadhaar numbers are never stored in `chrome.storage.local`.

---

## 4. What to Know Before the Judges
- **Immediate Undo:** If a form fill populates unwanted data or disrupts user input, clicking "Undo fill" instantly restores all fields to their prior values and outlines.
- **Memory Safety:** Files dropped into the upload zone are processed as ephemeral `ArrayBuffer` / `File` objects in memory and are discarded after extraction.
- **Safe DOM Standards:** All labels, extracted summaries, and card elements are built using `domUtil.el()`, guaranteeing that third-party form labels or AI extraction strings cannot execute XSS.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **No Evaluation or Injection:** Zero use of `innerHTML`, `outerHTML`, `eval()`, or inline event handlers.
- **Pre-Flight Magic Byte Check:** Files are checked with `checkUpload(file)` before reading bytes.
- **Base64 Sanitization:** Strips data URI prefixes prior to background message dispatch.
- **Aadhaar Privacy Filter:** Strips full 12-digit Aadhaar numbers to the last 4 digits only.

### Judge Security Questions & Answers:
**Q: Can a malicious document trigger code execution during extraction?**  
**A:** No. Files are validated for magic numbers and decodability on the client, converted to raw base64, and sent to our private Node backend. The backend proxy validates payload boundaries before querying Gemini Vision. Gemini returns structured text, which is parsed and rendered purely through `textContent`.

**Q: Can a student's profile be overwritten with low-confidence AI hallucinations?**  
**A:** No. `review.js` enforces a strict confidence cutoff (`item.confidence >= 0.5`). Any field where the model has less than 50% confidence is ignored and not merged into the profile.
