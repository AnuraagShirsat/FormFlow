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
