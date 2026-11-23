/**
 * Rate Limiting Middleware Module
 * Owner: Ivan (Backend Engineer)
 *
 * Implements defenses for:
 * - Attack 7: Global volumetric DoS defense and quota preservation per IP
 * - Attack 9: Brute-force guessing / repetitive probing defense
 *
 * Enforces:
 * - Global rate limit across all endpoints
 * - Stricter rate limit (~10 requests/minute) specifically on expensive Gemini AI endpoints
 * - Standard draft-7 headers and Retry-After header with HTTP 429 status
 */

const rateLimit = require('express-rate-limit');
const config = require('../lib/config');

/**
 * Creates contract-compliant rate limit error response handler.
 * @param {string} message
 */
function createRateLimitHandler(message) {
  return (req, res, next, options) => {
    // express-rate-limit automatically populates the Retry-After header
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests. Please try again later.'
      }
    });
  };
}

/**
 * Global rate limiter: Applies to all incoming requests.
 * Default: Reads config.rateLimitPerMin (30 req/min) with 1-minute window.
 */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimitPerMin || 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests. Please try again later.')
});

/**
 * Stricter rate limiter for Gemini AI endpoints:
 * Enforces ~10 requests per minute per IP on POST /analyze-form and POST /extract-document.
 */
const geminiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per client IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many requests to AI endpoints. Please wait before analyzing more forms.'
  )
});

module.exports = {
  globalRateLimiter,
  geminiRateLimiter
};
