# Documentation: `/extension/core/config.js`

## 1. What It Does
`config.js` serves as the centralized, immutable configuration registry for the FormFlow Chrome extension. It declares:
- Backend proxy connection endpoints (`BACKEND_BASE_URL` and `PRODUCTION_BASE_URL`).
- Network request timeout limit (`REQUEST_TIMEOUT_MS` set to 60,000 ms to accommodate Render server cold starts).
- Demonstration toggle (`CONFIG.USE_DUMMY_DATA = false`), allowing the widget to read global configuration rather than relying on hardcoded constants.
- Canonical local storage keys (`STORAGE_KEYS`).
- Canonical blank profile schema (`DEFAULT_PROFILE`), with all fields initialized to `null`. This includes newly added profile keys: `state`, `district`, `rollNumber`, and `bankName`.
- Extractor key normalization map (`EXTRACT_KEY_MAP`), mapping vision/extractor keys (e.g. `annual_income`, `student_name`, `ifsc_code`, `account_number`) to standard profile keys while ignoring unmapped keys (e.g. `certificate_number`, `issue_date`).
- Supported regional languages (`SUPPORTED_LANGUAGES`: `en`, `kn`, `hi`).

---

## 2. How It Works Technically
- **Zero API Keys:** Free of secrets, tokens, or credentials. It holds only backend proxy endpoints and operational constants.
- **Cross-Scope Binding:** Evaluates environment availability (`typeof self !== 'undefined'` and `typeof window !== 'undefined'`) to expose `CONFIG` consistently across ServiceWorkerGlobalScope (`self`) and Content Script execution contexts (`window`) without requiring bundlers.
- **Contract Schema Alignment:** Reflects the shared data contract in `/contracts/contract.json`. The profile template includes all 21 approved keys, enforcing `aadhaarLast4` as the only national ID field and rejecting full 12-digit Aadhaar storage.
- **Extractor Key Translation:** `EXTRACT_KEY_MAP` maps legacy, snake_case, and document-specific extractor aliases to their corresponding canonical camelCase profile keys, preventing data fragmentation across different document types.

---

## 3. Judge Questions with Short Answers

**Q: Why was the network timeout increased to 60,000 milliseconds?**  
**A:** Free-tier cloud hosting services (such as Render) spin down container instances during idle periods. When a student initiates form analysis or document extraction after inactivity, cold starts can take 30 to 45 seconds. Raising `REQUEST_TIMEOUT_MS` to 60 seconds prevents false-positive network timeouts during backend spin-up.

**Q: How does `CONFIG.USE_DUMMY_DATA` affect live operation vs offline demos?**  
**A:** When `CONFIG.USE_DUMMY_DATA` is `false`, FormFlow triggers live DOM scans and communicates with the Node proxy for real AI-powered form analysis and document extractions. Setting it to `true` switches the widget to offline mock fixtures for robust offline demonstration without network dependencies.

**Q: How are non-standard extractor field names handled?**  
**A:** `CONFIG.EXTRACT_KEY_MAP` explicitly maps recognized extractor field names (such as `annual_income`, `percentage`, `student_name`) to canonical profile keys. Any unrecognized keys (such as `certificate_number` or `issue_date`) are deliberately excluded to prevent schema pollution.

---

## 4. What to Know Before the Judges
- **New Profile Keys:** Four new keys were integrated: `state`, `district`, `rollNumber`, and `bankName`, matching the scholarship portal requirement for direct benefit transfers and academic tracking.
- **Single Source of Truth:** All modules read `CONFIG.DEFAULT_PROFILE` and `CONFIG.STORAGE_KEYS` rather than hardcoding storage keys or default structures.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **No Secrets or Credentials:** Audited with `scripts/secret-scan.js`; contains zero API keys or private tokens.
- **Aadhaar Protection:** Enforces `aadhaarLast4` only. Full 12-digit Aadhaar fields are never part of `DEFAULT_PROFILE`.
- **Stateless Configuration:** Contains only immutable configuration declarations; cannot be mutated to alter extension permissions or hijack origins.

### Judge Security Questions & Answers:
**Q: Can a malicious webpage modify CONFIG.BACKEND_BASE_URL to redirect student data?**  
**A:** No. Content scripts run in an isolated world with their own `window` object. Scripts executing on the webpage cannot access or alter the extension's execution scope or modify `CONFIG`.

**Q: Where is the Gemini API key kept?**  
**A:** The key is strictly kept in the backend server's `.env` environment variable. `config.js` only knows `http://localhost:5000` (or the deployed proxy URL).
