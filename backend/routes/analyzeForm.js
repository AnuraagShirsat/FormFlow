/**
 * Form Analysis Route (/analyze-form)
 * Owner: Ivan (Backend Engineer)
 *
 * Initial implementation: Contract Stub returning fixed structured JSON
 * adhering to the contract so extension teammates (Himani and Anuraag) can
 * immediately integrate against the expected response schema.
 */

const express = require('express');
const router = express.Router();

/**
 * Fixed mock analysis response adhering to the contract specification.
 * All example data is synthetic and explicitly labelled SAMPLE.
 */
const STUB_ANALYSIS_RESPONSE = {
  fields: [
    {
      id: 'full_name',
      explanationEn: 'Your official full name as printed on your government photo ID.',
      explanationSelected: 'ನಿಮ್ಮ ಅಧಿಕೃತ ಪೂರ್ಣ ಹೆಸರು ನಿಮ್ಮ ಸರ್ಕಾರಿ ಗುರುತಿನ ಚೀಟಿಯಲ್ಲಿ ನಮೂದಿಸಿದಂತೆ.',
      explanation: {
        en: 'Your official full name as printed on your government photo ID.',
        selected: 'ನಿಮ್ಮ ಅಧಿಕೃತ ಪೂರ್ಣ ಹೆಸರು ನಿಮ್ಮ ಸರ್ಕಾರಿ ಗುರುತಿನ ಚೀಟಿಯಲ್ಲಿ ನಮೂದಿಸಿದಂತೆ.'
      },
      example: 'SAMPLE: Priya Ramesh Patil',
      document: 'Aadhaar Card'
    },
    {
      id: 'aadhaar_number',
      explanationEn: 'Your 12-digit unique Aadhaar identification number issued by UIDAI.',
      explanationSelected: 'ನಿಮ್ಮ 12 ಅಂಕಿಯ ಅನನ್ಯ ಆಧಾರ್ ಗುರುತಿನ ಸಂಖ್ಯೆ.',
      explanation: {
        en: 'Your 12-digit unique Aadhaar identification number issued by UIDAI.',
        selected: 'ನಿಮ್ಮ 12 ಅಂಕಿಯ ಅನನ್ಯ ಆಧಾರ್ ಗುರುತಿನ ಸಂಖ್ಯೆ.'
      },
      example: 'SAMPLE: 1234 5678 9012',
      document: 'Aadhaar Card'
    },
    {
      id: 'annual_income',
      explanationEn: 'Total gross annual family income from all revenue sources.',
      explanationSelected: 'ಎಲ್ಲಾ ಮೂಲಗಳಿಂದ ಕುಟುಂಬದ ಒಟ್ಟು ವಾರ್ಷಿಕ ಆದಾಯ.',
      explanation: {
        en: 'Total gross annual family income from all revenue sources.',
        selected: 'ಎಲ್ಲಾ ಮೂಲಗಳಿಂದ ಕುಟುಂಬದ ಒಟ್ಟು ವಾರ್ಷಿಕ ಆದಾಯ.'
      },
      example: 'SAMPLE: 150000',
      document: 'Income Certificate'
    },
    {
      id: 'tenth_marks_percentage',
      explanationEn: 'Aggregate percentage marks obtained in the Class 10 / SSLC examination.',
      explanationSelected: '10ನೇ ತರಗತಿ ಅಥವಾ SSLC ಬೋರ್ಡ್ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಪಡೆದ ಒಟ್ಟು ಶೇಕಡಾವಾರು ಅಂಕಗಳು.',
      explanation: {
        en: 'Aggregate percentage marks obtained in the Class 10 / SSLC examination.',
        selected: '10ನೇ ತರಗತಿ ಅಥವಾ SSLC ಬೋರ್ಡ್ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಪಡೆದ ಒಟ್ಟು ಶೇಕಡಾವಾರು ಅಂಕಗಳು.'
      },
      example: 'SAMPLE: 88.50',
      document: 'Marksheet'
    }
  ],
  requiredDocuments: [
    'Aadhaar Card',
    'Income Certificate',
    'Marksheet'
  ]
};

/**
 * POST /analyze-form
 * Returns contract-compliant stub response.
 */
router.post('/analyze-form', (req, res) => {
  // If specific fields were sent in request, map them dynamically to stub format
  const requestedFields = Array.isArray(req.body && req.body.fields) ? req.body.fields : [];
  const requestedLang = (req.body && req.body.language) || 'en';

  if (requestedFields.length > 0) {
    const dynamicFields = requestedFields.map((field) => {
      const match = STUB_ANALYSIS_RESPONSE.fields.find((f) => f.id === field.id);
      if (match) {
        return match;
      }
      return {
        id: field.id,
        explanationEn: `Please enter the required information for ${field.label || field.id}.`,
        explanationSelected: requestedLang === 'hi'
          ? `कृपया ${field.label || field.id} के लिए आवश्यक जानकारी दर्ज करें।`
          : requestedLang === 'kn'
          ? `${field.label || field.id} ಗಾಗಿ ಅಗತ್ಯ ಮಾಹಿತಿಯನ್ನು ನಮೂದಿಸಿ.`
          : `Please enter the required information for ${field.label || field.id}.`,
        explanation: {
          en: `Please enter the required information for ${field.label || field.id}.`,
          selected: requestedLang === 'hi'
            ? `कृपया ${field.label || field.id} के लिए आवश्यक जानकारी दर्ज करें।`
            : requestedLang === 'kn'
            ? `${field.label || field.id} ಗಾಗಿ ಅಗತ್ಯ ಮಾಹಿತಿಯನ್ನು ನಮೂದಿಸಿ.`
            : `Please enter the required information for ${field.label || field.id}.`
        },
        example: `SAMPLE: ${field.label || field.id} sample value`,
        document: 'General Document'
      };
    });

    return res.status(200).json({
      fields: dynamicFields,
      requiredDocuments: STUB_ANALYSIS_RESPONSE.requiredDocuments
    });
  }

  // Fallback to static stub response
  return res.status(200).json(STUB_ANALYSIS_RESPONSE);
});

module.exports = router;
