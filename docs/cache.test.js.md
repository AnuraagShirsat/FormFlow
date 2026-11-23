# Documentation: `backend/test/cache.test.js`

## 1. What it does
`cache.test.js` contains automated unit and integration tests verifying the in-memory LRU cache mechanics, field normalization, deterministic SHA-256 hash generation, TTL expiration, capacity eviction, and `X-Cache` HTTP header behavior.

## 2. How it works technically
- Uses `node:test` and `node:assert`.
- **Normalization Test:** Confirms fields sorted by ID and text trimmed to lowercase.
- **Hash Invariance Test:** Verifies that identical fields supplied in reversed orders yield the identical SHA-256 cache key.
- **Language Isolation Test:** Verifies that distinct language selections (`en`, `kn`, `hi`) yield distinct cache keys.
- **TTL Expiration Test:** Stores an entry with short TTL (50ms) and confirms eviction after 60ms.
- **LRU Eviction Test:** Configures `max: 2`, accesses the older item to refresh recency, inserts a 3rd item, and verifies that the un-accessed second item was evicted.
- **HTTP Header Test:** Simulates two requests to `/analyze-form`: the first returns `X-Cache: MISS`, while the second returns `X-Cache: HIT` with identical response data.

## 3. Judge questions with short answers
- **Q: Why test field order invariance in cache key generation?**
  - **A:** DOM scanners might discover form inputs in varying order depending on page load timing or iframe nesting. Sorting guarantees cache hits regardless of scanning order.
- **Q: How does this test verify that the cache expires over time?**
  - **A:** It sets an item with a 50ms TTL, awaits 60ms, and asserts that subsequent retrieval returns `null`.

## 4. What to know before the judges
- All cache tests execute in sub-100ms using the in-memory test runner without external dependencies.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified 6/6 cache test assertions pass.
  - Verified zero personal data is involved in key generation or cached payloads.
- **Judge Security Questions:**
  - **Q: How do these tests prove memory cannot leak infinitely?**
    - **A:** The eviction test proves that once `max` capacity is reached, every new insertion strictly evicts the least recently used item, keeping cache size invariant.
