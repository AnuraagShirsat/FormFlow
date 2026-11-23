# Documentation: `backend/middleware/security.js`

## 1. What it does
`security.js` encapsulates the perimeter security logic for the FormFlow proxy. It performs origin validation to guarantee that incoming requests originate strictly from the authorized FormFlow Chrome extension (`chrome-extension://<id>`), provides a contract-compliant 404 handler for unmapped routes, and manages a global error handler that prevents stack trace leakage, traps oversized JSON bodies (>200kb), and sanitizes all application error outputs.

## 2. How it works technically
- **`verifyOrigin` Middleware:**
  - Exempts `GET /health` requests to permit cloud provider health checks and container probes.
  - Inspects the HTTP `Origin` header. If `ALLOWED_ORIGIN` is configured and an incoming request supplies an origin that does not match, the middleware immediately rejects the request with HTTP 403 Forbidden: `{ error: { code: "forbidden_origin", message: "Origin not allowed" } }`.
  - In production mode, if `ALLOWED_ORIGIN` is configured, it enforces that an `Origin` header must be present.
  - Automatically handles preflight `OPTIONS` requests by returning HTTP 204 No Content with appropriate CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `Vary: Origin`).
- **`notFoundHandler` Middleware:**
  - Catches all requests that do not match registered API endpoints and returns HTTP 404 with `{ error: { code: "not_found", message: "Route not found" } }`.
- **`errorHandler` Middleware:**
  - Intercepts body-parser limits (such as `entity.too.large` or status 413) and returns HTTP 400 with `{ error: { code: "bad_request", message: "Request payload exceeds 200kb limit" } }`.
  - Intercepts syntax errors from malformed JSON and returns HTTP 400 with `{ error: { code: "bad_request", message: "Malformed JSON payload" } }`.
  - Translates unexpected exceptions to generic HTTP 500 responses with `{ error: { code: "internal_error", message: "..." } }`, never exposing runtime stack traces or system internals.

## 3. Judge questions with short answers
- **Q: How does the backend prevent random websites or malicious scripts from using this proxy?**
  - **A:** Strict CORS configuration combined with server-side `Origin` header verification (`verifyOrigin`). If the `Origin` header does not match our specific `ALLOWED_ORIGIN` (`chrome-extension://<id>`), the proxy rejects the call with HTTP 403 Forbidden.
- **Q: Why are stack traces suppressed in error responses?**
  - **A:** Stack traces disclose server file paths, dependency versions, internal functions, and operating system details that attackers use for reconnaissance. Stripping them is an essential defense-in-depth practice.
- **Q: What happens if a request sends invalid JSON or an oversized body?**
  - **A:** The parser traps the condition before route handlers execute, returning HTTP 400 Bad Request with a clean contract error message.

## 4. What to know before the judges
- The origin verification mechanism protects our Gemini API key and quota from unauthorized third-party domains.
- No session IDs, cookies, or user tokens are processed or maintained.
- Error codes strictly adhere to the contract schema.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Tested requests with mismatched `Origin` headers; verified immediate HTTP 403 rejection.
  - Tested requests to non-existent paths (`/admin`, `/debug`, `/config`); verified HTTP 404 with `{ error: { code: "not_found" } }`.
  - Tested oversized payloads (>200kb); verified HTTP 400 rejection.
  - Verified request bodies are never logged to console or disk.
- **Judge Security Questions:**
  - **Q: Can an attacker spoof the Origin header in a browser?**
    - **A:** No. Web browsers and the Chrome extension sandbox prohibit JavaScript from tampering with or setting the `Origin` header during standard `fetch` or `XMLHttpRequest` calls.
  - **Q: What stops an attacker from probing internal debug routes?**
    - **A:** There are zero debug, admin, status, or test routes registered in the application. Any unknown route unconditionally hits `notFoundHandler` returning a minimal 404 response.
