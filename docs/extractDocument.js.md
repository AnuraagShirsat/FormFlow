# Documentation: `backend/routes/extractDocument.js`

## 1. What it does
`extractDocument.js` is a placeholder route file owned by Kartik (`/backend/routes/extractDocument.js`). It registers the `POST /extract-document` endpoint, applies `geminiRateLimiter` (10 requests/minute), and returns HTTP 501 Not Implemented with a contract-compliant error response until Kartik implements the Gemini Vision document extraction logic.

## 2. How it works technically
- **Express Router:** Instantiates an isolated router handling `POST /extract-document`.
- **Rate Limiting:** Gated by `geminiRateLimiter` to protect vision model quotas from excessive invocation.
- **HTTP 501 Response:** Returns HTTP status 501 with `{ error: { code: "not_implemented", message: "..." } }`.
- **Modular Interface:** Designed to be replaced cleanly by Kartik without requiring modifications to `server.js` or other backend core modules.

## 3. Judge questions with short answers
- **Q: Who owns `/backend/routes/extractDocument.js`?**
  - **A:** Kartik owns this file. Ivan maintains the core backend proxy infrastructure (`server.js`, middleware, security, rate limiting, and `/analyze-form`), while Kartik implements document extraction using Gemini Vision.
- **Q: Why return 501 instead of 404?**
  - **A:** 501 Not Implemented indicates that the server recognizes the endpoint and intends to support it, but the underlying capability is currently under development.

## 4. What to know before the judges
- The route integrates cleanly via a single line in `server.js`: `app.use(require('./routes/extractDocument'))`.
- When Kartik implements document extraction, the endpoint will accept document images and extract profile data into the student's local extension storage.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified the endpoint returns clean JSON adhering to the `{ error: { code: string } }` contract format.
  - Verified `geminiRateLimiter` applies to protect vision endpoints from flood attacks.
  - Verified no internal stack traces or path disclosures occur when invoking this route.
- **Judge Security Questions:**
  - **Q: How will document extraction ensure student document privacy when implemented?**
    - **A:** When implemented, documents processed via Gemini Vision are evaluated in-memory without persistent server storage, returning structured profile fields directly to the extension's local client storage.
