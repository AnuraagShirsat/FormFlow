# Documentation: `backend/server.js`

## 1. What it does
`server.js` is the central entry point and HTTP orchestration layer for the FormFlow backend proxy. It initializes an Express application, configures security headers via Helmet, strips identifying metadata like `X-Powered-By`, restricts CORS access strictly to the extension origin, sets up JSON body parsing limits (200kb), registers the `/health`, `/analyze-form`, and `/extract-document` routes, and catches all invalid or unknown endpoints with standard contract-compliant error responses.

## 2. How it works technically
- **Express Initialization:** Sets up the HTTP pipeline with `app.disable('x-powered-by')` to eliminate server fingerprinting.
- **Reverse Proxy Trust:** Sets `app.set('trust proxy', 1)` so IP-based rate limiting functions accurately behind cloud platforms such as Render, Railway, or AWS.
- **Helmet Headers:** Enforces security headers (DNS prefetch control, frameguard, hide powered by, HSTS, no sniff, XSS filter) while disabling CSP since the backend serves pure JSON API payloads.
- **Payload Limiting:** Integrates `express.json({ limit: '200kb' })` globally to mitigate denial-of-service attempts via oversized payloads before any route handlers execute.
- **Origin Gatekeeping:** Mounts the `verifyOrigin` middleware before API routes to validate the client's `Origin` header against `ALLOWED_ORIGIN`.
- **Route Mounting:** Mounts `GET /health` inline returning `{ ok: true }` only, mounts `require('./routes/analyzeForm')`, and registers Kartik's document extraction route with a single line: `app.use(require('./routes/extractDocument'))`.
- **404 & Error Traps:** Catches unmapped routes with `notFoundHandler` returning `{ error: { code: "not_found" } }` and formats unhandled exceptions with `errorHandler`.

## 3. Judge questions with short answers
- **Q: Why does the extension need a backend proxy instead of calling the Gemini API directly from the client?**
  - **A:** Calling the Gemini API directly from a browser extension leaks the secret API key in the extension bundle or client network traffic. The Node proxy securely keeps the API key on the server, validates inputs, and rate-limits requests.
- **Q: Why is there no admin or dashboard route?**
  - **A:** FormFlow has zero admin routes, zero debug endpoints, and zero databases by design. Eliminating admin areas entirely eliminates privilege escalation, credential stuffing, and session hijacking attack vectors.
- **Q: How does the server respond to unmapped routes?**
  - **A:** It returns HTTP 404 with a strict contract JSON object: `{ "error": { "code": "not_found" } }`. It never renders default HTML error pages or stack traces.

## 4. What to know before the judges
- The server is stateless: no cookies, no sessions, no user databases, and no local disk storage of user inputs.
- All configuration values are loaded strictly from environment variables validated at startup.
- The health check endpoint `GET /health` returns `{ ok: true }` and nothing else, allowing cloud orchestrators to monitor uptime without leaking version or environment information.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified `x-powered-by` header is completely disabled.
  - Verified request body size limit is constrained to 200kb.
  - Verified unknown routes return clean JSON 404 without stack traces or framework banners.
  - Verified all error responses conform to `{ error: { code: string } }`.
- **Judge Security Questions:**
  - **Q: Can an attacker induce memory exhaustion by sending gigabyte-sized JSON payloads?**
    - **A:** No. `express.json({ limit: '200kb' })` immediately aborts the connection with HTTP 400 (`entity.too.large`) before the payload can consume system RAM.
  - **Q: How do you prevent information leakage in production crashes?**
    - **A:** The centralized error middleware captures all exceptions, logs internal operational diagnostics server-side without request bodies, and responds only with generic error codes (`bad_request`, `internal_error`), never exposing stack traces or filenames.
