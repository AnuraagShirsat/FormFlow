/**
 * FormFlow Secure Backend Proxy
 * Owner: Ivan (Backend Engineer)
 *
 * Responsibilities:
 * - Secure Node/Express proxy interfacing with Gemini API
 * - Enforces locked-down security posture (Helmet, no x-powered-by, strict CORS/Origin)
 * - Rate limiting and in-memory LRU caching (no DB, no sessions, no user state)
 * - Input validation and response sanitization
 */

const express = require('express');
const helmet = require('helmet');
const config = require('./lib/config');
const { verifyOrigin, notFoundHandler, errorHandler } = require('./middleware/security');
const { globalRateLimiter } = require('./middleware/rateLimiter');

const app = express();

// Disable Express fingerprinting header (Attack 1)
app.disable('x-powered-by');

// Trust reverse proxy (Render, Railway, Cloudflare) for accurate client IP resolution (Attacks 7, 9)
app.set('trust proxy', 1);

// Apply Helmet security headers with restrictive defaults
app.use(
  helmet({
    contentSecurityPolicy: false, // API proxy serving pure JSON, no HTML/scripts
    crossOriginResourcePolicy: { policy: 'same-site' }
  })
);

// Apply global rate limiting across all incoming requests (Attacks 7, 9)
app.use(globalRateLimiter);

// Enforce request payload size limit (max 200kb for /analyze-form)
app.use(express.json({ limit: '200kb' }));

// Validate origin against ALLOWED_ORIGIN (Attacks 1, 8)
app.use(verifyOrigin);

// ----------------------------------------------------
// Core API Routes
// ----------------------------------------------------

// Health check endpoint: returns { ok: true } only
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// Form analysis route (Initial stub returning contract-compliant fixed JSON)
app.use(require('./routes/analyzeForm'));

// Document extraction route (Kartik's route stub returning 501 until implemented)
app.use(require('./routes/extractDocument'));

// ----------------------------------------------------
// Error & 404 Handling
// ----------------------------------------------------

// Reject all unknown routes with a clean 404 (Attack 1)
app.use(notFoundHandler);

// Centralized error handler returning contract error shape (Attack 14)
app.use(errorHandler);

// Start listening if run directly
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`FormFlow backend proxy running on port ${config.port}`);
  });
}

module.exports = app;
