# Documentation: `backend/middleware/validate.js`

## 1. What it does
`validate.js` provides Express middleware that gates the `POST /analyze-form` route. It inspects incoming HTTP request bodies against `AnalyzeFormRequestSchema`, ensures the body is a valid JSON object, rejects malformed payloads with HTTP 400 Bad Request, and replaces `req.body` with the parsed, sanitized, and stripped dataset.

## 2. How it works technically
- **Null/Primitive Check:** Verifies `req.body` is present and is a non-null object. If not, immediately terminates with HTTP 400.
- **Zod `safeParse` Execution:** Executes `AnalyzeFormRequestSchema.safeParse(req.body)`.
- **Error Formatting:** On failure, formats the first encountered validation violation with exact path context into the contract error shape `{ error: { code: "bad_request", message: "..." } }`.
- **Request Body Replacement:** On success, replaces `req.body` with `result.data`. Because `AnalyzeFormRequestSchema` uses `.strip()`, any extra keys sent by a malicious client are removed before route handlers execute.

## 3. Judge questions with short answers
- **Q: What HTTP status code is returned when input validation fails?**
  - **A:** HTTP 400 Bad Request, containing a user-friendly error message indicating the specific validation constraint that failed.
- **Q: How does this middleware stop prototype pollution or property injection?**
  - **A:** `req.body` is completely reassigned to the fresh, sanitized output of Zod's `safeParse`, ensuring only validated, whitelisted properties persist in the request pipeline.
- **Q: Does this middleware log or retain invalid request bodies?**
  - **A:** No. In accordance with privacy and security requirements, request bodies are never logged or stored.

## 4. What to know before the judges
- The middleware runs before any AI model invocation, preventing invalid requests from consuming Gemini quota or compute.
- Error codes strictly follow the contract's `bad_request` convention.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified non-object inputs (e.g., strings, null, undefined) return HTTP 400.
  - Verified schema violations return HTTP 400 with descriptive error messages.
  - Verified stripped request bodies drop extraneous injected properties.
- **Judge Security Questions:**
  - **Q: What prevents an attacker from sending malicious objects that bypass schema validation?**
    - **A:** Zod performs strict type enforcement at runtime. If any property does not match the exact expected type, length, or enum value, `safeParse` returns failure and the request is rejected with 400.
  - **Q: How does this help defend the Gemini API downstream?**
    - **A:** It ensures that untrusted data entering the backend is bounded in length (max 200 chars per label, max 100 fields), sanitized, and structurally predictable before prompt assembly.
