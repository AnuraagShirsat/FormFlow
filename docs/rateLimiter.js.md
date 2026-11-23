# Documentation: `backend/middleware/rateLimiter.js`

## 1. What it does
`rateLimiter.js` provides multi-tier rate limiting per client IP using `express-rate-limit`. It establishes a global perimeter limit on all HTTP requests to prevent server resource exhaustion, alongside a strict limit of 10 requests per minute specifically on expensive Gemini AI endpoints (`/analyze-form` and `/extract-document`). When limits are breached, it returns HTTP 429 Too Many Requests with standard `Retry-After` headers and contract-compliant error responses.

## 2. How it works technically
- **`createRateLimitHandler`:**
  - Generates standardized JSON error bodies: `{ error: { code: "RATE_LIMIT_EXCEEDED", message: "..." } }`.
  - Automatically respects and propagates the `Retry-After` HTTP header indicating seconds until the client may retry.
- **`globalRateLimiter`:**
  - Mounted globally across the Express application in `server.js`.
  - Window: 1 minute (60,000 ms).
  - Maximum requests: Reads `config.rateLimitPerMin` (default: 30 requests/minute).
  - Uses `draft-7` rate limit headers (`RateLimit-Policy`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).
- **`geminiRateLimiter`:**
  - Mounted specifically on Gemini AI endpoints (`POST /analyze-form` and `POST /extract-document`).
  - Window: 1 minute (60,000 ms).
  - Maximum requests: Fixed at 10 requests/minute per client IP.
  - Prevents rapid consumption of Google Gemini API quotas.
- **Reverse Proxy Compatibility:**
  - Works in conjunction with `app.set('trust proxy', 1)` in `server.js` so client IPs are accurately resolved behind Render, Railway, or Cloudflare via `X-Forwarded-For`.

## 3. Judge questions with short answers
- **Q: Why are there two separate rate limiters?**
  - **A:** Defense in depth. The global limiter protects server throughput from volumetric floods across all endpoints, while the stricter Gemini limiter protects expensive model quotas and GPU backend capacity from automated abuse.
- **Q: What status code and header are returned when the limit is reached?**
  - **A:** HTTP 429 Too Many Requests accompanied by the `Retry-After` header specifying how many seconds to wait before retrying.
- **Q: How does this work when hosted behind Render's reverse proxy?**
  - **A:** `app.set('trust proxy', 1)` tells Express to trust the first proxy hop, allowing `express-rate-limit` to read the true client IP from `X-Forwarded-For` rather than rate limiting Render's load balancer IP.

## 4. What to know before the judges
- The AI endpoint limit of 10 requests/minute is generous for genuine students filling 1-2 forms per session, while strictly preventing automated scraping or quota exhaustion attacks.
- Each client IP maintains its own isolated counter window.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Tested that 10 consecutive requests from an IP succeed.
  - Tested that the 11th request from that same IP receives HTTP 429 with `RATE_LIMIT_EXCEEDED`.
  - Verified presence of `Retry-After` header.
  - Verified that an independent IP address remains unblocked.
- **Judge Security Questions:**
  - **Q: How does rate limiting mitigate brute-force guessing attacks (Attack 9)?**
    - **A:** By capping requests to 10 per minute per IP, attackers cannot brute-force internal endpoints, test credentials, or flood the API with randomized payloads.
  - **Q: What prevents IP spoofing in the `X-Forwarded-For` header?**
    - **A:** By setting `trust proxy: 1`, Express strips client-supplied fake headers and extracts only the client IP appended by Render's trusted edge gateway.
