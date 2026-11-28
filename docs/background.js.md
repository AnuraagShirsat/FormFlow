# Documentation: `/extension/core/background.js`

## 1. What It Does
`background.js` is the Chrome Manifest V3 background service worker for FormFlow. It functions as the central message broker, profile storage manager, and proxy communication gateway:
- Coordinates on-demand script injection, checking whether FormFlow is already running in the tab to prevent redundant re-injection.
- Manages client-side profile persistence in `chrome.storage.local` (`GET_PROFILE`, `SAVE_PROFILE`, `CLEAR_PROFILE`).
- Normalizes incoming document extraction keys through `CONFIG.EXTRACT_KEY_MAP` and cleans values (digits-only annual income, plain number string marks, uppercase IFSC, 6-digit pincode).
- Enforces strict Aadhaar data minimization: reduces `aadhaar`, `id_number`, and `aadhaarNumber` to `aadhaarLast4` (4 digits) and deletes the original keys.
- Enforces runtime security: rejects messages from untrusted sender IDs (`sender.id !== chrome.runtime.id`), validates message types, and caps payload sizes at 6 MB before forwarding to the backend proxy.
- Routes backend calls (`ANALYZE_FORM` and `EXTRACT_DOCUMENT`) to the Node proxy.
- Logs strictly the count of saved fields, never logging profile keys or student values.

---

## 2. How It Works Technically
- **Event-Driven Lifecycle:** Built on Chrome MV3 service worker architecture; automatically idles when inactive and awakens upon toolbar clicks or runtime messages.
- **Duplicate Injection Guard:** In `chrome.action.onClicked`, dispatches a lightweight `{ type: 'PING' }` message to the active tab. If a running content script responds, script injection is skipped and the widget is toggled immediately, preventing duplicate pill elements.
- **Strict Sender & Type Validation:** In `handleMessage`, verifies that `sender.id === chrome.runtime.id` and validates that `message.type` belongs to `KNOWN_MESSAGE_TYPES`. Unrecognized types or external senders are rejected immediately.
- **6 MB Payload Boundary:** Before forwarding payloads to `POST /analyze-form` or `POST /extract-document`, `callBackendProxy()` serializes the payload and checks its length. Any payload exceeding 6 MB is rejected with `{ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: ... } }`.
- **Zero-Trust Profile Normalization:** `saveStoredProfile()` processes incoming updates through four sequential safeguards:
  1. Identifies Aadhaar aliases (`aadhaar`, `id_number`, `aadhaarNumber`), isolates the final 4 digits into `aadhaarLast4`, and deletes the original raw properties.
  2. Normalizes extractor keys to standard camelCase profile keys via `CONFIG.EXTRACT_KEY_MAP`, safely ignoring unmapped keys like `certificate_number` or `issue_date`.
  3. Sanitizes values: converts `annualIncome` to digits only (e.g. `'2,50,000'` becomes `'250000'`), converts `marks` to a plain number string, trims and uppercases `ifsc`, and clamps `pincode` to 6 digits.
  4. Whitelists fields against `CONFIG.DEFAULT_PROFILE` and persists the result to `chrome.storage.local`.
- **Redacted Console Logging:** Logs only the count of saved fields (e.g. `FormFlow: Student profile updated in local storage (5 fields)`), guaranteeing zero PII leaks in browser logs.

---

## 3. Judge Questions with Short Answers

**Q: What prevents multiple FormFlow pills from appearing if a student clicks the extension icon multiple times?**  
**A:** When the icon is clicked, `background.js` first pings the active tab with `{ type: 'PING' }`. If the content script is already active, `injectExtensionScripts()` is skipped entirely and only `{ type: 'TOGGLE_WIDGET' }` is sent. Furthermore, `widget.js` has a re-load guard and clears any stray host containers.

**Q: How does FormFlow handle dirty data extracted from uploaded documents?**  
**A:** Document extractions often contain formatted text like `"Rs. 2,50,000/-"` or `"88.5%"`. In `saveStoredProfile()`, `annualIncome` is stripped to pure digits (`"250000"`), `marks` is cleaned to plain numbers (`"88.5"`), `ifsc` is converted to uppercase, and `pincode` is limited to 6 digits.

**Q: Can an external webpage send fake messages to background.js?**  
**A:** No. `handleMessage` verifies `sender.id === chrome.runtime.id`. Any message lacking our extension's internal runtime ID is rejected with `UNAUTHORIZED_SENDER`. Furthermore, `manifest.json` does not declare `externally_connectable`.

---

## 4. What to Know Before the Judges
- **Payload Pre-flight:** Outbound proxy payloads are limited to 6 MB to protect backend proxy memory and prevent denial-of-service.
- **Privacy Assurance:** Full Aadhaar numbers are never stored under any circumstances. Even if an extractor outputs `id_number: "123456789012"`, only `"9012"` is retained under `aadhaarLast4`.
- **Render Cold Start Resilience:** `REQUEST_TIMEOUT_MS` is set to 60,000 ms to handle free-tier cloud backend wake-ups seamlessly.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Sender ID Verification:** Tested message handling with simulated external sender; confirmed immediate rejection.
- **Payload Size Enforcement:** Tested serialization threshold; confirmed rejection of payloads >6 MB.
- **Aadhaar Redaction:** Tested with full 12-digit numbers across `aadhaar`, `id_number`, and `aadhaarNumber`; verified that only `aadhaarLast4` is persisted and raw keys are deleted.
- **Zero PII Logging:** Verified console output; only operational field counts are logged.

### Judge Security Questions & Answers:
**Q: What happens if a malicious script attempts prompt injection through document extraction fields?**  
**A:** Any unknown or unexpected keys returned by extraction models are discarded because `saveStoredProfile` strictly whitelists keys against `CONFIG.DEFAULT_PROFILE`. Expected fields are sanitized to strict types (digits for income, uppercase for IFSC).

**Q: What prevents memory exhaustion in the background worker?**  
**A:** The 6 MB pre-flight check in `callBackendProxy()` ensures oversized payloads are rejected before allocation or transmission. Outbound HTTP requests are aborted cleanly after 60 seconds if the backend hangs.
