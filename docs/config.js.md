HEAD
# Documentation: `backend/lib/config.js`

## 1. What it does
`config.js` serves as the centralized, immutable configuration module for the backend proxy. It reads environment variables specified in `.env.example`, validates required secrets (specifically `GEMINI_API_KEY`), and freezes the configuration object to prevent runtime modification.

## 2. How it works technically
- **Path Resolution:** Resolves potential `.env` locations by checking `backend/.env` first, followed by root `.env`, and falling back to standard `process.env`.
- **Fail-Fast Startup Validation:** Checks `process.env.GEMINI_API_KEY`. If empty, undefined, or whitespace-only, the module writes a clean error notice to `stderr` and immediately halts execution with `process.exit(1)`.
- **Secret Protection:** Under no circumstances does the module print, log, or display the secret key.
- **Default Fallbacks:**
  - `geminiModel`: Defaults to `'gemini-1.5-flash'`.
  - `port`: Defaults to `5000`.
  - `rateLimitPerMin`: Defaults to `30`.
  - `allowedOrigin`: Defaults to empty string (configurable per environment).
- **Object Freezing:** Uses `Object.freeze()` on the exported config object to prevent accidental or malicious tampering at runtime.

## 3. Judge questions with short answers
- **Q: Where is the Gemini API key stored?**
  - **A:** It resides exclusively in server-side environment variables (`backend/.env` or the cloud hosting dashboard). It is never committed to Git, never bundled in the extension, and never printed in logs.
- **Q: What happens if the server is started without an API key?**
  - **A:** The server fails immediately at startup with an informative fatal error message indicating that `GEMINI_API_KEY` is missing, preventing an incomplete or misconfigured server from running.
- **Q: Can other modules modify configuration properties during runtime?**
  - **A:** No. `Object.freeze(config)` makes the configuration strictly read-only.

## 4. What to know before the judges
- Configuration variables strictly reflect the whitelist specified in `.env.example`.
- In production, environment variables are populated directly via host environment dashboards (e.g., Render or Railway).

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Tested startup with missing `GEMINI_API_KEY`; confirmed immediate termination without stack trace or key leakage.
  - Verified that secret strings are never logged or exposed in debug messages.
  - Verified exported object immutability using `Object.isFrozen()`.
- **Judge Security Questions:**
  - **Q: How do you guarantee the API key is never leaked in source control?**
    - **A:** Root `.gitignore` explicitly excludes `.env`, `.env.local`, and related files. Furthermore, `.env.example` provides only blank template placeholders, and pre-commit checks verify no secret files are staged.
  - **Q: What happens if someone tries to inject arbitrary config variables?**
    - **A:** Only explicitly declared keys (`geminiApiKey`, `geminiModel`, `allowedOrigin`, `port`, `rateLimitPerMin`) are parsed and made accessible to the application.
# Documentation: `/extension/core/config.js`

## 1. What It Does
`config.js` serves as the centralized, immutable configuration registry for the FormFlow Chrome extension. It declares backend proxy connection endpoints, request timeouts, chrome.storage keys, supported languages (`en`, `kn`, `hi`), and the canonical blank profile structure matching the contract.

---

## 2. How It Works Technically
- **Zero API Keys:** Completely devoid of secrets, tokens, or credentials. It holds only the backend endpoint address and operational constants.
- **Global Scope Polyfill:** Uses conditional scope binding (`typeof self !== 'undefined'` and `typeof window !== 'undefined'`) to ensure seamless execution in both Service Worker environments (`self`) and Content Script environments (`window`) without bundlers or module loaders.
- **Contract Adherence:** Houses `DEFAULT_PROFILE`, guaranteeing that any freshly initialized student profile adheres strictly to the contract schema with all fields initialized to `null`.
- **Aadhaar Protection:** Enforces `aadhaarLast4` as the only identity field for national identification. Full 12-digit Aadhaar fields are strictly omitted.

---

## 3. Judge Questions with Short Answers

**Q: Why is there a backend URL defined here if the extension doesn't talk to Gemini directly?**  
**A:** The extension talks exclusively to our self-hosted Node.js proxy server. The proxy is what holds the Gemini API key and handles rate limiting. The extension only knows the proxy's URL.

**Q: What happens if the backend server is unreachable?**  
**A:** `REQUEST_TIMEOUT_MS` (30 seconds) guards network calls from hanging indefinitely. If a timeout or error occurs, the background worker catches it and returns a sanitized error envelope to the user.

**Q: Can a student's profile get corrupted if new fields are added later?**  
**A:** `DEFAULT_PROFILE` provides a unified fallback template. When updates are merged in storage, missing keys default cleanly to `null` without throwing undefined errors.

---

## 4. What to Know Before the Judges
- **Local Proxy Port:** The default development port is `http://localhost:5000`. Ensure the Node backend proxy is started before demonstrating the extension.
- **Production URL Replacement:** For production deployment, changing `BACKEND_BASE_URL` to `https://formflow-backend.example.com` (or your cloud URL) switches all proxy routing seamlessly in one line.
- **Zero Configuration Burden:** Students do not configure endpoints, keys, or settings.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **No Hardcoded Secrets:** Audited file contents to confirm zero API keys, auth tokens, or private endpoints exist.
- **Aadhaar Field Masking:** Confirmed the profile schema template only contains `aadhaarLast4`.
- **Object Freezing / Scope Safety:** Scoped declarations prevent accidental variable pollution in the global window object.

### Judge Security Questions & Answers:
**Q: Can a malicious website alter CONFIG.BACKEND_BASE_URL to redirect student data to an attacker's server?**  
**A:** No. `config.js` runs either inside the isolated Chrome extension service worker or inside the content script's isolated world. The host webpage's JavaScript cannot read or mutate variables in FormFlow's execution scope.

**Q: Why not fetch the configuration dynamically from a remote server?**  
**A:** Fetching dynamic configurations from remote servers is strictly prohibited by Chrome Manifest V3 security rules. All extension code and operational configurations must be packaged locally.

