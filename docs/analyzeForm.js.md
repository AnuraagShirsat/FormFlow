# Documentation: `backend/routes/analyzeForm.js`

## 1. What it does
`analyzeForm.js` manages the `POST /analyze-form` endpoint. It enforces rate limiting (10 req/min per IP), input validation via `validateAnalyzeForm` (checking languages `en|kn|hi`, bounding field counts to 100, and stripping extra attributes), and checks an in-memory LRU cache before generating analysis. If cached, it returns the result immediately with `X-Cache: HIT`. Otherwise, it generates the contract-compliant form analysis (explanations in English, Kannada, and Hindi, concrete examples, document associations, and required documents checklist), caches it with a 1-hour TTL, and returns `X-Cache: MISS`.

## 2. How it works technically
- **Express Router:** Exports an Express router mounted on the root application path.
- **Rate Limiting:** Protects the route via `geminiRateLimiter` (10 requests/minute per client IP), returning HTTP 429 with `Retry-After` if breached.
- **Validation Pipeline:** Integrates `validateAnalyzeForm` middleware, enforcing Zod validation before handling requests.
- **In-Memory LRU Caching:** Computes deterministic SHA-256 hash key using `generateFormCacheKey(language, fields)`. If present in `formAnalysisCache`, serves from cache with `X-Cache: HIT`. On miss, saves to cache with `X-Cache: MISS`.
- **Contract Adherence:** Returns payload conforming strictly to `/contracts/contract.json` (`AnalyzeFormResponse` with `fields` and `requiredDocuments`).
- **Dynamic Field Mapping:** Maps incoming scanned fields to structured guidance in the student's chosen language (`en`, `kn`, or `hi`).
- **Synthetic Sample Labeling:** All examples returned are explicitly tagged with `(SAMPLE)` to prevent confusion with authentic user data.
- **Zero State / Zero Storage:** Operates completely in-memory with zero side effects, database queries, or persistent disk writes. Caches only form structure, never personal data.

## 3. Judge questions with short answers
- **Q: How does caching improve user experience and backend efficiency?**
  - **A:** If multiple students fill the same scholarship application, subsequent requests are returned in under 2 milliseconds from in-memory cache, saving Gemini API calls and eliminating latency.
- **Q: What happens if an attacker attempts to flood this endpoint?**
  - **A:** Requests exceeding 10 per minute per IP are blocked with HTTP 429 and `RATE_LIMIT_EXCEEDED`.
- **Q: Is any personal student data handled or stored in this endpoint or its cache?**
  - **A:** No. The endpoint receives only form metadata (field labels, input types, IDs, page title) and never receives or stores personal student responses or values.

## 4. What to know before the judges
- The endpoint strictly complies with the schema defined in `contracts/contract.json`.
- Cache misses return `X-Cache: MISS`, subsequent calls for identical forms return `X-Cache: HIT`.
- All sample examples are fake synthetic values clearly marked `(SAMPLE)`.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified rate limit triggers HTTP 429 on 11th request.
  - Verified cache hit header and cache miss header.
  - Verified no user data or inputs are saved to disk or external databases.
  - Verified all synthetic examples are labelled `SAMPLE`.
  - Verified unknown input properties are stripped.
  - Verified 100-field array limit.
- **Judge Security Questions:**
  - **Q: What happens if an attacker sends sensitive personal information inside the form fields scan?**
    - **A:** The extension only scans HTML field labels, IDs, and placeholders—never user values. Furthermore, the backend does not store, log, or persist request bodies.
  - **Q: How does this endpoint prevent cross-user data contamination in cache?**
    - **A:** The cache key is derived strictly from public form structure (HTML field IDs, labels, types) and language. No user credentials, session IDs, or profile data are part of the cache key or value.
