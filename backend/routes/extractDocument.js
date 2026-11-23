/**
 * Document Extraction Route (Stub)
 * Owner: Kartik (/backend/routes/extractDocument.js)
 *
 * This route is designated for Kartik to implement document extraction
 * using Gemini Vision (processing Aadhaar, Marksheet, Income Certificate, etc.).
 * Returns HTTP 501 Not Implemented until Kartik replaces it.
 *
 * Rate limiting: Governed by geminiRateLimiter (10 requests/minute).
 */

const express = require('express');
const router = express.Router();
const { geminiRateLimiter } = require('../middleware/rateLimiter');

router.post('/extract-document', geminiRateLimiter, (req, res) => {
  res.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'Document extraction endpoint is not implemented yet'
    }
  });
});

module.exports = router;
