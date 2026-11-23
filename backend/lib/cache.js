/**
 * In-Memory LRU Cache Module
 * Owner: Ivan (Backend Engineer)
 *
 * Implements defenses for:
 * - Attack 7: Mitigates denial-of-service / resource exhaustion by serving cached form structures
 * - Attack 9: Mitigates repetitive brute-force scanning
 * - Attack 14: Zero database, pure in-memory cache with strictly capped memory footprint
 *
 * Privacy Invariant:
 * Caches ONLY public form structure, field guidance, and document checklists.
 * NEVER stores student values, personal identifiable information (PII), or form answers.
 */

const crypto = require('crypto');

class LRUCache {
  /**
   * @param {Object} options
   * @param {number} [options.max=500] Maximum number of form structures to cache
   * @param {number} [options.ttlMs=3600000] Time-to-live in milliseconds (default: 1 hour)
   */
  constructor({ max = 500, ttlMs = 60 * 60 * 1000 } = {}) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  /**
   * Retrieve cached item by key.
   * Updates LRU recency on hit. Returns null if expired or missing.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh recency by re-inserting at the end of the Map
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Store item in cache.
   * Evicts least recently used item if max capacity is exceeded.
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Evict oldest (least recently used) entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  /**
   * Check if active unexpired key exists.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Remove specific entry.
   * @param {string} key
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Current number of stored entries.
   */
  get size() {
    return this.cache.size;
  }
}

/**
 * Normalizes form fields deterministically for caching.
 * Sorts fields by ID and strips volatile or formatting discrepancies.
 * @param {Array<Object>} fields
 * @returns {Array<Object>}
 */
function normalizeFieldsForCache(fields) {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map((f) => ({
      id: String(f.id || '').trim(),
      label: String(f.label || '').trim().toLowerCase(),
      type: String(f.type || '').trim().toLowerCase(),
      required: Boolean(f.required),
      options: Array.isArray(f.options)
        ? [...f.options].map((opt) => String(opt).trim().toLowerCase()).sort()
        : []
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Computes a deterministic SHA-256 cache key from language and normalized fields.
 * @param {string} language 'en' | 'kn' | 'hi'
 * @param {Array<Object>} fields Array of FormField objects
 * @returns {string} Hex-encoded SHA-256 digest
 */
function generateFormCacheKey(language, fields) {
  const normalized = normalizeFieldsForCache(fields);
  const payload = JSON.stringify({
    lang: String(language || 'en').trim().toLowerCase(),
    fields: normalized
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Global in-memory cache instance for /analyze-form
// Max 500 unique form schemas, 1 hour TTL
const formAnalysisCache = new LRUCache({
  max: 500,
  ttlMs: 60 * 60 * 1000 // 1 hour
});

module.exports = {
  LRUCache,
  formAnalysisCache,
  normalizeFieldsForCache,
  generateFormCacheKey
};
