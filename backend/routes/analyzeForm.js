/**
 * Form Analysis Route (/analyze-form)
 * Owner: Ivan (Backend Engineer)
 *
 * Implements defenses for:
 * - Attack 5: Zod validation of types, lengths, array size (max 100 fields), enums
 * - Attack 7: Global and endpoint-specific rate limiting (10 req/min)
 * - Attack 8: Strict stripping of unknown properties
 * - Attack 9: Brute-force protection via rate limits and in-memory LRU caching
 * - Attack 14: In-memory only LRU cache (1-hour TTL, max 500 entries, no personal data)
 */

const express = require('express');
const router = express.Router();
const { validateAnalyzeForm } = require('../middleware/validate');
const { geminiRateLimiter } = require('../middleware/rateLimiter');
const { formAnalysisCache, generateFormCacheKey } = require('../lib/cache');

/**
 * Standard stub analysis data conforming strictly to contracts/contract.json.
 * All sample values are synthetic and labelled SAMPLE.
 */
const STUB_ANALYSIS_RESPONSE = {
  fields: [
    {
      id: 'applicant_full_name',
      explanation: 'Your official full name as recorded on government identity documents.',
      explanationLocal: 'ಗುರುತಿನ ದಾಖಲೆಗಳಲ್ಲಿ ನೋಂದಾಯಿಸಲಾದ ನಿಮ್ಮ ಅಧಿಕೃತ ಪೂರ್ಣ ಹೆಸರು.',
      example: 'KAVYA RAMESH SHETTY (SAMPLE)',
      sourceDocument: 'Aadhaar Card / 10th Marksheet'
    },
    {
      id: 'aadhaar_number',
      explanation: 'Your 12-digit unique Aadhaar identification number issued by UIDAI.',
      explanationLocal: 'ನಿಮ್ಮ 12 ಅಂಕಿಯ ಅನನ್ಯ ಆಧಾರ್ ಗುರುತಿನ ಸಂಖ್ಯೆ.',
      example: '1234 5678 9012 (SAMPLE)',
      sourceDocument: 'Aadhaar Card'
    },
    {
      id: 'annual_family_income',
      explanation: 'Total yearly gross income of all earning family members combined.',
      explanationLocal: 'ಕುಟುಂಬದ ಎಲ್ಲಾ ದುಡಿಯುವ ಸದಸ್ಯರ ಒಟ್ಟು ವಾರ್ಷಿಕ ಆದಾಯ.',
      example: '150000 (SAMPLE)',
      sourceDocument: 'Income Certificate'
    },
    {
      id: 'tenth_marks_percentage',
      explanation: 'Aggregate percentage marks obtained in the Class 10 / SSLC examination.',
      explanationLocal: '10ನೇ ತರಗತಿ ಅಥವಾ SSLC ಬೋರ್ಡ್ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಪಡೆದ ಒಟ್ಟು ಶೇಕಡಾವಾರು ಅಂಕಗಳು.',
      example: '88.50 (SAMPLE)',
      sourceDocument: 'Marksheet'
    }
  ],
  requiredDocuments: [
    {
      name: 'Aadhaar Card',
      why: 'Verifies student identity and last 4 digits for DBT verification.'
    },
    {
      name: 'Income Certificate',
      why: 'Verifies eligibility within government scholarship income threshold.'
    },
    {
      name: 'Marksheet',
      why: 'Verifies qualifying educational criteria and merit scores.'
    }
  ]
};

/**
 * POST /analyze-form
 * Applies strict rate limiter (10/min), Zod validation, and in-memory LRU caching.
 */
router.post('/analyze-form', geminiRateLimiter, validateAnalyzeForm, (req, res) => {
  const { language, fields } = req.body;

  // Generate deterministic cache key from normalized field structures and language
  const cacheKey = generateFormCacheKey(language, fields);

  // Check in-memory LRU cache (Attack 7 & 9)
  const cached = formAnalysisCache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  // Map input fields dynamically to a contract-compliant analysis response
  const mappedFields = fields.map((field) => {
    const known = STUB_ANALYSIS_RESPONSE.fields.find((f) => f.id === field.id);
    if (known) {
      let localExp = known.explanationLocal;
      if (language === 'hi') {
        localExp = 'सरकारी पहचान दस्तावेजों के अनुसार आपका आधिकारिक पूरा नाम।';
      } else if (language === 'en') {
        localExp = known.explanation;
      }
      return {
        ...known,
        explanationLocal: localExp
      };
    }

    // Default safe fallback for other fields
    const label = field.label || field.id;
    const localExp =
      language === 'hi'
        ? `${label} के लिए आवश्यक जानकारी दर्ज करें।`
        : language === 'kn'
        ? `${label} ಗಾಗಿ ಅಗತ್ಯ ಮಾಹಿತಿಯನ್ನು ನಮೂದಿಸಿ.`
        : `Please enter the required information for ${label}.`;

    return {
      id: field.id,
      explanation: `Please enter the required information for ${label}.`,
      explanationLocal: localExp,
      example: `${label} (SAMPLE)`,
      sourceDocument: 'Supporting Document'
    };
  });

  const responsePayload = {
    fields: mappedFields,
    requiredDocuments: STUB_ANALYSIS_RESPONSE.requiredDocuments
  };

  // Cache form structure only (TTL 1 hour, max 500 entries, zero personal data)
  formAnalysisCache.set(cacheKey, responsePayload);

  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(responsePayload);
});

module.exports = router;
