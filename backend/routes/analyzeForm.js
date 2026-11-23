/**
 * Form Analysis Route (/analyze-form)
 * Owner: Ivan (Backend Engineer)
 *
 * Implements defenses for:
 * - Attack 5: Zod validation of types, lengths, array size (max 100 fields), enums
 * - Attack 7: Global and endpoint-specific rate limiting (10 req/min)
 * - Attack 8: Strict stripping of unknown properties
 * - Attack 9: Brute-force protection via rate limits and in-memory LRU caching
 * - Attack 10: Gemini prompt-injection defense: system instruction isolates untrusted data,
 *              strict output validation via Zod, retries with safe generic fallback,
 *              never passes raw model text, friendly 503 on quota exhaustion.
 * - Attack 14: In-memory only LRU cache (1-hour TTL, max 500 entries, zero personal data)
 */

const express = require('express');
const router = express.Router();
const { validateAnalyzeForm } = require('../middleware/validate');
const { geminiRateLimiter } = require('../middleware/rateLimiter');
const { formAnalysisCache, generateFormCacheKey } = require('../lib/cache');
const {
  analyzeFormWithGemini,
  generateSafeFallback,
  GeminiQuotaError
} = require('../lib/gemini');

/**
 * POST /analyze-form
 * Applies strict rate limiter (10/min), Zod validation, in-memory LRU caching,
 * and calls Gemini with strict prompt injection defense and safe fallback.
 */
router.post('/analyze-form', geminiRateLimiter, validateAnalyzeForm, async (req, res, next) => {
  const { language, pageTitle, fields } = req.body;

  // Generate deterministic cache key from normalized field structures and language
  const cacheKey = generateFormCacheKey(language, fields);

  // Check in-memory LRU cache (Attack 7 & 9)
  const cached = formAnalysisCache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  try {
    // Invoke Gemini AI analysis with prompt injection defense, timeout, and validation (Attack 10)
    const analysisResponse = await analyzeFormWithGemini(language, pageTitle, fields);

    // Cache form structure only (TTL 1 hour, max 500 entries, zero personal data)
    formAnalysisCache.set(cacheKey, analysisResponse);

    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(analysisResponse);
  } catch (err) {
    // Handle Gemini quota exhaustion with a friendly HTTP 503
    if (err instanceof GeminiQuotaError || err.statusCode === 503) {
      return res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message:
            'AI analysis service is temporarily busy or quota is reached. Please try again shortly.'
        }
      });
    }

    // For any other unexpected error, return the contract-compliant safe fallback
    const fallback = generateSafeFallback(language, fields);
    return res.status(200).json(fallback);
  }
});

module.exports = router;
