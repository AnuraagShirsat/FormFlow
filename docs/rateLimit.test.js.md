# Documentation: `backend/test/rateLimit.test.js`

## 1. What it does
`rateLimit.test.js` verifies the rate limiting defenses protecting the FormFlow backend against volumetric floods, automated scanning, and Gemini API quota depletion.

## 2. How it works technically
- Uses `node:test` and `node:assert`.
- **Quota Allowance Test:** Validates that requests below the 10 requests/minute threshold succeed with HTTP 200.
- **Quota Exceeded Test:**
  - Fires 10 consecutive requests from IP `192.168.1.99`, asserting HTTP 200 on each.
  - Sends an 11th request from the same IP, asserting that it is rejected with HTTP 429 Too Many Requests.
  - Checks for the contract error code: `RATE_LIMIT_EXCEEDED`.
  - Checks for the presence of the HTTP `Retry-After` header.
- **IP Isolation Test:** Sends a concurrent request from a different IP (`192.168.1.100`) and asserts that it succeeds with HTTP 200, proving that rate limiting is strictly partitioned per client IP.

## 3. Judge questions with short answers
- **Q: How does this test confirm that legitimate students are not blocked when an attacker is rate-limited?**
  - **A:** The test proves that when IP A exhausts its 10-request allowance and gets blocked with 429, requests from IP B continue to succeed with 200.
- **Q: Does the client know how long to wait before retrying?**
  - **A:** Yes. The test explicitly verifies that the `Retry-After` header is included in the 429 response.

## 4. What to know before the judges
- Rate limits apply per IP address per sliding 60-second window.
- The test harness simulates distinct client IP addresses via `X-Forwarded-For` with trusted reverse proxy emulation.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Confirmed 10-request ceiling enforcement.
  - Confirmed 429 status code and contract JSON error format.
  - Confirmed `Retry-After` header presence.
  - Confirmed IP partition isolation.
- **Judge Security Questions:**
  - **Q: How does this test demonstrate protection of third-party API quotas?**
    - **A:** It proves that an abusive client cannot make more than 10 calls to Gemini endpoints in any 60-second period, preventing runaway bills or service outages.
