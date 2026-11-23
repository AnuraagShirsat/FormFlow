/**
 * Form Analysis Route (/analyze-form)
 * Owner: Ivan (Backend Engineer)
 *
 * Implements defenses for:
 * - Attack 5: Zod validation of types, lengths, array size (max 100 fields), enums
 * - Attack 8: Strict stripping of unknown properties
 * - Attack 14: In-memory only, no DB, no logging of request bodies
 */

const express = require('express');
const router = express.Router();
const { validateAnalyzeForm } = require('../middleware/validate');

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
 * Validates request payload with Zod (validateAnalyzeForm) and returns contract-compliant response.
 */
router.post('/analyze-form', validateAnalyzeForm, (req, res) => {
  const { language, fields } = req.body;

  // Map each input field dynamically to a contract-compliant analysis response
  const mappedFields = fields.map((field) => {
    const known = STUB_ANALYSIS_RESPONSE.fields.find((f) => f.id === field.id);
    if (known) {
      // Adjust localized explanation depending on requested language
      let localExp = known.explanationLocal;
      if (language === 'hi') {
        localExp = `सरकारी पहचान दस्तावेजों के अनुसार आपका आधिकारिक पूरा नाम।`;
      } else if (language === 'en') {
        localExp = known.explanation;
      }
      return {
        ...known,
        explanationLocal: localExp
      };
    }

    // Default safe fallback for other input fields
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

  return res.status(200).json({
    fields: mappedFields,
    requiredDocuments: STUB_ANALYSIS_RESPONSE.requiredDocuments
  });
});

module.exports = router;
