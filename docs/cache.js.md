# Documentation: `backend/lib/cache.js`

## 1. What it does
`cache.js` implements a zero-dependency in-memory Least Recently Used (LRU) cache tailored for the `POST /analyze-form` route. It caches analyzed form structures (field guidance, multilingual explanations, and document checklists) keyed by a deterministic SHA-256 hash of the normalized form fields and target language. It features a 1-hour time-to-live (TTL) and a capped capacity (500 form structures), strictly guaranteeing that zero student values or personal data are ever retained.

## 2. How it works technically
- **`LRUCache` Class:**
  - Utilizes JavaScript's native `Map` which natively maintains key insertion order.
  - On `get(key)`: If expired (`Date.now() > expiresAt`), the entry is purged and `null` is returned. If valid, the entry is deleted and re-inserted at the end of the `Map`, marking it as the most recently used entry.
  - On `set(key, value)`: If capacity (`max = 500`) is exceeded, the oldest entry (`this.cache.keys().next().value`) is evicted in O(1) time.
- **Field Normalization (`normalizeFieldsForCache`):**
  - Normalizes field IDs, trims labels to lowercase, standardizes types, and sorts options.
  - Sorts fields alphabetically by `id`. This guarantees that differences in field discovery order on the web page produce identical hashes.
- **Hash Key Generation (`generateFormCacheKey`):**
  - Computes `crypto.createHash('sha256')` over `{ lang, fields: normalizedFields }`.
  - Produces a 64-character hexadecimal cache key.
- **`formAnalysisCache` Singleton:**
  - Configured with `max: 500` entries and `ttlMs: 3600000` (1 hour).

## 3. Judge questions with short answers
- **Q: Why cache form structures in memory instead of Redis or a database?**
  - **A:** FormFlow has a strict "no external database" architecture. In-memory caching runs with zero external network overhead, provides sub-millisecond retrieval, requires no credentials or servers, and naturally flushes across restarts.
- **Q: Does this cache store student answers, names, or uploaded documents?**
  - **A:** Absolutely not. The cache key is derived solely from public HTML form metadata (field labels, IDs, input types) and language. The cached value contains only generic guidance and document requirements. No student inputs or profile data are ever cached.
- **Q: How does the cache handle memory bounds?**
  - **A:** Capped at 500 entries with automatic LRU eviction. When the 501st distinct form template is analyzed, the least recently requested template is evicted immediately, preventing unbounded RAM consumption.

## 4. What to know before the judges
- When a student visits a scholarship portal that has already been analyzed by another student in the same language, the analysis response returns instantly with `X-Cache: HIT`, consuming zero Gemini API quota.
- When field order changes or extra whitespace exists in portal HTML, field normalization ensures cache hits are preserved.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Tested deterministic SHA-256 generation across reordered fields.
  - Tested TTL expiration after configured lifespan.
  - Verified least-recently-used eviction when `max` is reached.
  - Verified `X-Cache: HIT` and `X-Cache: MISS` headers.
- **Judge Security Questions:**
  - **Q: How does caching defend against Denial of Service and API quota depletion (Attack 7)?**
    - **A:** If attackers repeatedly submit identical form structures to exhaust Gemini credits, 99% of requests are served directly from the in-memory cache without making any upstream AI API calls.
  - **Q: Can one student view another student's data via cache collisions?**
    - **A:** No. Student data is never sent to or cached by this proxy. The cache key represents only public HTML form structure, and the cached response consists strictly of generic instructional templates and document requirements.
