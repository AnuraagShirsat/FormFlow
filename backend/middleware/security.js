/**
 * Security Middleware Module
 * Handles origin verification, secure headers, and contract-compliant error handling.
 *
 * Implements defenses for:
 * - Attack 1: No debug/admin/status/config routes. Unknown routes return plain 404 { error: { code: "not_found" } }.
 * - Attack 2: No stored IDs, no sessions, no cookies, no database.
 * - Attack 8: Reject unauthorized origins with HTTP 403.
 * - Attack 14: Never leak stack traces or internal details in responses. Do not log request bodies.
 */

const config = require('../lib/config');

/**
 * Origin validation middleware.
 * Verifies the Origin header against the configured ALLOWED_ORIGIN (e.g., chrome-extension://<id>).
 * Rejects requests from unauthorized origins with HTTP 403 Forbidden.
 */
function verifyOrigin(req, res, next) {
  // Always permit health checks from orchestrator/health monitoring
  if (req.path === '/health' && req.method === 'GET') {
    return next();
  }

  const origin = req.headers.origin;

  // If ALLOWED_ORIGIN is configured
  if (config.allowedOrigin) {
    // If request contains an Origin header and it doesn't match ALLOWED_ORIGIN, reject with 403
    if (origin && origin !== config.allowedOrigin) {
      return res.status(403).json({
        error: {
          code: 'forbidden_origin',
          message: 'Origin not allowed'
        }
      });
    }

    // In production, enforce that an Origin header must be provided
    if (process.env.NODE_ENV === 'production' && !origin) {
      return res.status(403).json({
        error: {
          code: 'forbidden_origin',
          message: 'Origin header required'
        }
      });
    }
  }

  // Set standard CORS response headers if origin is present and allowed
  if (origin && (!config.allowedOrigin || origin === config.allowedOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }

  // Respond immediately to preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

/**
 * 404 Not Found handler for all unknown routes.
 * Strictly adheres to the contract error shape.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: 'Route not found'
    }
  });
}

/**
 * Centralized error-handling middleware.
 * Returns the contract error shape with no stack traces and no internal details.
 * Never logs request bodies.
 */
function errorHandler(err, req, res, next) {
  // Handle payload too large from express.json limit
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(400).json({
      error: {
        code: 'bad_request',
        message: 'Request payload exceeds 200kb limit'
      }
    });
  }

  // Handle malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'bad_request',
        message: 'Malformed JSON payload'
      }
    });
  }

  const status = typeof err.status === 'number' ? err.status : 500;
  const code = err.code || (status === 400 ? 'bad_request' : 'internal_error');
  const message = err.message && status < 500 ? err.message : 'An internal server error occurred';

  res.status(status).json({
    error: {
      code: code,
      message: message
    }
  });
}

module.exports = {
  verifyOrigin,
  notFoundHandler,
  errorHandler
};
