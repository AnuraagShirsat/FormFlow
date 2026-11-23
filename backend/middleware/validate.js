/**
 * Validation Middleware
 * Owner: Ivan (Backend Engineer)
 *
 * Enforces schema validation using Zod:
 * - Validates types, lengths, array bounds (max 100 fields), and enum constraints (Attack 5).
 * - Strips unknown / injected fields so only whitelisted keys proceed (Attack 8).
 * - Returns clean HTTP 400 Bad Request with contract-compliant error formatting.
 */

const { AnalyzeFormRequestSchema } = require('../lib/schemas');

/**
 * Middleware to validate POST /analyze-form request body against AnalyzeFormRequestSchema.
 */
function validateAnalyzeForm(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      error: {
        code: 'bad_request',
        message: 'Request body must be a valid JSON object'
      }
    });
  }

  const result = AnalyzeFormRequestSchema.safeParse(req.body);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const pathStr = firstIssue.path && firstIssue.path.length > 0 ? ` (${firstIssue.path.join('.')})` : '';
    const message = `${firstIssue.message}${pathStr}`;

    return res.status(400).json({
      error: {
        code: 'bad_request',
        message: message
      }
    });
  }

  // Replace req.body with the strictly parsed and stripped data (Attack 8)
  req.body = result.data;
  next();
}

module.exports = {
  validateAnalyzeForm
};
