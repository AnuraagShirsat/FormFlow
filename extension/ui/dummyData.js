/**
 * FormFlow - Offline Mock Data & Schema Fixtures
 * File: /extension/ui/dummyData.js
 *
 * Provides offline mock analysis, document extraction, and profile fixtures
 * conforming exactly to /contracts/contract.json specifications.
 *
 * ARCHITECTURAL SECURITY NOTE:
 * This data is packaged as a pure JavaScript file rather than a JSON file because
 * Chrome Manifest V3 content scripts cannot read extension JSON via fetch() or
 * XMLHttpRequest without declaring it in `web_accessible_resources` in manifest.json.
 * Declaring extension resources in `web_accessible_resources` exposes those files
 * directly to every website the user visits, creating fingerprinting and data leakage
 * vectors. Storing offline fixtures inside an injected script protects extension data
 * within the isolated world.
 *
 * ALL VALUES ARE INVENTED AND SYNTHETIC, CLEARLY LABELLED AS "SAMPLE".
 * Aadhaar privacy invariant is honored: aadhaarLast4 only.
 */

(function (root) {
  'use strict';

  // Ensure FormFlow and UI namespaces exist
  root.FormFlow = root.FormFlow || {};
  root.FormFlow.ui = root.FormFlow.ui || {};

  // Standard checklist of required documents across state scholarship portals
  var REQUIRED_DOCUMENTS = [
    {
      name: 'Aadhaar Card',
      why: 'Required to verify student identity and seed bank account for Direct Benefit Transfer (DBT).'
    },
    {
      name: 'Income Certificate',
      why: 'Required by government department to determine scholarship income eligibility limits.'
    },
    {
      name: '10th Marksheet',
      why: 'Verifies applicant legal name, date of birth, and preceding qualifying academic percentage.'
    },
    {
      name: 'Bank Passbook',
      why: 'Validates active savings bank account number and branch IFSC code for electronic stipend deposit.'
    },
    {
      name: 'Passport Photo',
      why: 'Mandatory recent passport-sized photograph adhering to portal dimension specifications.'
    }
  ];

  // Common field definitions based on /mock-form/index.html (including hostile security test field)
  var FIELD_DEFINITIONS = [
    {
      id: 'fullName',
      explanation: 'Full legal name of the student as recorded on your official Aadhaar card.',
      explanationKn: 'ನಿಮ್ಮ ಆಧಾರ್ ಕಾರ್ಡ್‌ನಲ್ಲಿ ನಮೂದಿಸಿದಂತೆ ವಿದ್ಯಾರ್ಥಿಯ ಅಧಿಕೃತ ಪೂರ್ಣ ಹೆಸರು.',
      explanationHi: 'आपके आधिकारिक आधार कार्ड में दर्ज छात्र का पूरा कानूनी नाम।',
      example: 'SAMPLE: Kavya Ramesh Shetty',
      sourceDocument: 'Aadhaar Card'
    },
    {
      id: 'fatherName',
      explanation: 'Full legal name of your father or primary legal guardian.',
      explanationKn: 'ತಂದೆ ಅಥವಾ ಕಾನೂನುಬದ್ಧ ಪೋಷಕರ ಅಧಿಕೃತ ಪೂರ್ಣ ಹೆಸರು.',
      explanationHi: 'पिता या प्राथमिक कानूनी अभिभावक का पूरा कानूनी नाम।',
      example: 'SAMPLE: Ramesh Shetty',
      sourceDocument: 'Aadhaar Card / 10th Marksheet'
    },
    {
      id: 'dob',
      explanation: 'Date of birth in YYYY-MM-DD format as documented on birth records or school marksheets.',
      explanationKn: 'ಜನನ ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ ಅಂಕಪಟ್ಟಿಯಲ್ಲಿ ನಮೂದಿಸಿದಂತೆ ಹುಟ್ಟಿದ ದಿನಾಂಕ (YYYY-MM-DD).',
      explanationHi: 'जन्म प्रमाण पत्र या अंकतालिका के अनुसार जन्म तिथि (YYYY-MM-DD)।',
      example: 'SAMPLE: 2004-05-14',
      sourceDocument: '10th Marksheet / Aadhaar Card'
    },
    {
      id: 'gender',
      explanation: 'Official legal gender identity of the student (Female, Male, or Other).',
      explanationKn: 'ವಿದ್ಯಾರ್ಥಿಯ ಅಧಿಕೃತ ಕಾನೂನುಬದ್ಧ ಲಿಂಗ ವಿವರಣೆ (ಮಹಿಳೆ, ಪುರುಷ, ಅಥವಾ ಇತರೆ).',
      explanationHi: 'छात्र की आधिकारिक विधिक लिंग पहचान (महिला, पुरुष, या अन्य)।',
      example: 'SAMPLE: Female',
      sourceDocument: 'Aadhaar Card'
    },
    {
      id: 'category',
      explanation: 'Caste reservation or merit quota category (GM, OBC, SC, ST, or EWS).',
      explanationKn: 'ಮೀಸಲಾತಿ ಅಥವಾ ವಿದ್ಯಾರ್ಥಿವೇತನ ಅರ್ಹತೆಗಾಗಿ ಸಾಮಾಜಿಕ ಜಾತಿ ಅಥವಾ ಪ್ರವರ್ಗ.',
      explanationHi: 'आरक्षण या छात्रवृत्ति पात्रता के लिए सामाजिक जाति या आरक्षण श्रेणी।',
      example: 'SAMPLE: OBC',
      sourceDocument: 'Caste Certificate'
    },
    {
      id: 'income',
      explanation: 'Combined annual gross family income in Indian Rupees from all earning sources.',
      explanationKn: 'ಎಲ್ಲಾ ಮೂಲಗಳಿಂದ ಕುಟುಂಬದ ಒಟ್ಟು ವಾರ್ಷಿಕ ಆದಾಯ (ಭಾರತೀಯ ರೂಪಾಯಿಗಳಲ್ಲಿ).',
      explanationHi: 'सभी स्रोतों से परिवार की कुल सकल वार्षिक आय (भारतीय रुपये में)।',
      example: 'SAMPLE: 120000',
      sourceDocument: 'Income Certificate'
    },
    {
      id: 'aadhaar',
      explanation: '12-digit Aadhaar identification number (FormFlow retains last 4 digits only).',
      explanationKn: 'ಡಿಬಿಟಿ ಪರಿಶೀಲನೆಗಾಗಿ 12 ಅಂಕಿಯ ಆಧಾರ್ ಸಂಖ್ಯೆ (ಕೊನೆಯ 4 ಅಂಕಿಗಳು ಮಾತ್ರ ಉಳಿಯುತ್ತವೆ).',
      explanationHi: '12 अंकों का आधार नंबर (फॉर्मफ्लो केवल अंतिम 4 अंक ही सुरक्षित रखता है)।',
      example: 'SAMPLE: 000000004321',
      sourceDocument: 'Aadhaar Card'
    },
    {
      id: 'mobile',
      explanation: 'Primary 10-digit mobile number for portal verification and SMS status updates.',
      explanationKn: 'ಪೋರ್ಟಲ್ ಒಟಿಪಿ ಮತ್ತು ಸಂದೇಶ ನವೀಕರಣಗಳಿಗಾಗಿ 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ.',
      explanationHi: 'सत्यापन और स्थिति अपडेट प्राप्त करने के लिए 10 अंकों का प्राथमिक मोबाइल नंबर।',
      example: 'SAMPLE: 9876543210',
      sourceDocument: 'Personal Records'
    },
    {
      id: 'email',
      explanation: 'Active personal email address for official scholarship notifications.',
      explanationKn: 'ಅಧಿಕೃತ ವಿದ್ಯಾರ್ಥಿವೇತನ ಸೂಚನೆಗಳನ್ನು ಸ್ವೀಕರಿಸಲು ಸಕ್ರಿಯ ಇಮೇಲ್ ವಿಳಾಸ.',
      explanationHi: 'आधिकारिक छात्रवृत्ति अधिसूचनाएं प्राप्त करने के लिए सक्रिय ईमेल पता।',
      example: 'SAMPLE: student.kavya@example.com',
      sourceDocument: 'Personal Records'
    },
    {
      id: 'address',
      explanation: 'Permanent residential postal address including house number and street name.',
      explanationKn: 'ಮನೆ ಸಂಖ್ಯೆ ಮತ್ತು ರಸ್ತೆ ಹೆಸರು ಒಳಗೊಂಡ ಅಧಿಕೃತ ಕಾಯಂ ವಾಸಸ್ಥಳದ ವಿಳಾಸ.',
      explanationHi: 'मकान नंबर और सड़क सहित पूरा स्थायी आवासीय डाक पता।',
      example: 'SAMPLE: 123 Saraswathi Nagar, Bengaluru',
      sourceDocument: 'Aadhaar Card / Domicile Certificate'
    },
    {
      id: 'pincode',
      explanation: '6-digit postal PIN code corresponding to your permanent residential area.',
      explanationKn: 'ನಿಮ್ಮ ಕಾಯಂ ವಾಸಸ್ಥಳದ ವ್ಯಾಪ್ತಿಗೆ ಸೇರಿದ 6 ಅಂಕಿಯ ಅಂಚೆ ಪಿನ್ ಕೋಡ್.',
      explanationHi: 'आपके स्थायी आवासीय क्षेत्र से संबंधित 6 अंकों का पोस्टल पिन कोड।',
      example: 'SAMPLE: 560001',
      sourceDocument: 'Aadhaar Card'
    },
    {
      id: 'bankAccount',
      explanation: 'Savings bank account number in the student name for Direct Benefit Transfer.',
      explanationKn: 'ವಿದ್ಯಾರ್ಥಿವೇತನ ಜಮೆಗಾಗಿ ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರಿನಲ್ಲಿರುವ ಉಳಿತಾಯ ಬ್ಯಾಂಕ್ ಖಾತೆ ಸಂಖ್ಯೆ.',
      explanationHi: 'छात्रवृत्ति जमा करने के लिए छात्र के नाम पर सक्रिय बचत बैंक खाता संख्या।',
      example: 'SAMPLE: 987654321001',
      sourceDocument: 'Bank Passbook'
    },
    {
      id: 'ifsc',
      explanation: '11-character Indian Financial System Code identifying the bank branch.',
      explanationKn: 'ಬ್ಯಾಂಕ್ ಶಾಖೆಯನ್ನು ನಿಖರವಾಗಿ ಗುರುತಿಸುವ 11 ಅಕ್ಷರಗಳ ಐಎಫ್‌ಎಸ್‌ಸಿ ಕೋಡ್.',
      explanationHi: 'संबंधित बैंक शाखा की पहचान करने वाला 11 अक्षरों का आईएफएससी कोड।',
      example: 'SAMPLE: SBIN0001234',
      sourceDocument: 'Bank Passbook'
    },
    {
      id: 'course',
      explanation: 'Degree, diploma, or certificate course in which currently enrolled.',
      explanationKn: 'ಪ್ರಸ್ತುತ ಪ್ರವೇಶ ಪಡೆದಿರುವ ಪದವಿ, ಡಿಪ್ಲೊಮಾ ಅಥವಾ ಕೋರ್ಸ್ ಹೆಸರು.',
      explanationHi: 'वर्तमान में नामांकित डिग्री, डिप्लोमा या प्रमाण पत्र पाठ्यक्रम का नाम।',
      example: 'SAMPLE: B.E. Computer Science',
      sourceDocument: 'College Admission Receipt / ID Card'
    },
    {
      id: 'institution',
      explanation: 'Official recognized name of the college, polytechnic, or university.',
      explanationKn: 'ವಿದ್ಯಾರ್ಥಿ ವ್ಯಾಸಂಗ ಮಾಡುತ್ತಿರುವ ಮಾನ್ಯತೆ ಪಡೆದ ಕಾಲೇಜು ಅಥವಾ ಸಂಸ್ಥೆಯ ಹೆಸರು.',
      explanationHi: 'संबंधित कॉलेज, संस्थान या विश्वविद्यालय का आधिकारिक मान्यता प्राप्त नाम।',
      example: 'SAMPLE: Government Engineering College',
      sourceDocument: 'College Admission Receipt / ID Card'
    },
    {
      id: 'marks',
      explanation: 'Aggregate marks percentage achieved in the preceding qualifying examination.',
      explanationKn: 'ಹಿಂದಿನ ಅರ್ಹತಾ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಗಳಿಸಿದ ಒಟ್ಟು ಶೇಕಡಾವಾರು ಅಂಕಗಳು.',
      explanationHi: 'पिछली अर्हक परीक्षा में प्राप्त कुल प्रतिशत अंक।',
      example: 'SAMPLE: 88.5',
      sourceDocument: '10th / 12th Marksheet'
    },
    {
      id: 'photo',
      explanation: 'Recent color passport-sized photo conforming to specified width, height, and KB limits.',
      explanationKn: 'ನಿಗದಿತ ಪಿಕ್ಸೆಲ್ ಮತ್ತು ಗಾತ್ರ ಮಿತಿಯಲ್ಲಿರುವ ಇತ್ತೀಚಿನ ಪಾಸ್‌ಪೋರ್ಟ್ ಅಳತೆಯ ಭಾವಚಿತ್ರ.',
      explanationHi: 'निर्धारित चौड़ाई, ऊंचाई और आकार के अनुसार हालिया पासपोर्ट साइज फोटो।',
      example: 'SAMPLE: passport_photo.jpg',
      sourceDocument: 'Passport Photo'
    },
    {
      id: 'signature',
      explanation: 'Digital scan of applicant signature on white paper conforming to portal dimensions.',
      explanationKn: 'ಬಿಳಿ ಕಾಗದದ ಮೇಲೆ ಮಾಡಿದ ಅರ್ಜಿದಾರರ ಸಹಿಯ ಡಿಜಿಟಲ್ ಸ್ಕ್ಯಾನ್ ಪ್ರತಿ.',
      explanationHi: 'सफेद कागज पर आवेदक के हस्ताक्षर की निर्धारित आकार वाली डिजिटल स्कैन कॉपी।',
      example: 'SAMPLE: applicant_signature.jpg',
      sourceDocument: 'Applicant Signature Scan'
    },
    {
      id: 'hostileTest',
      explanation: 'Deliberate hostile security test label verifying XSS prevention and safe textContent rendering.',
      explanationKn: 'ಭದ್ರತಾ ಪರೀಕ್ಷೆ: ಎಕ್ಸ್ಎಸ್ಎಸ್ ತಡೆಗಟ್ಟುವಿಕೆ ಮತ್ತು ಸುರಕ್ಷಿತ ಪಠ್ಯ ಪರಿಶೀಲನೆ.',
      explanationHi: 'सुरक्षा परीक्षण: एक्सएसएस रोकथाम और सुरक्षित टेक्स्ट प्रतिपादन का सत्यापन।',
      example: 'SAMPLE: security test, leave empty',
      sourceDocument: 'FormFlow Security Harness'
    },
    {
      id: 'declaration',
      explanation: 'Mandatory applicant declaration confirming accuracy of all provided records.',
      explanationKn: 'ಅರ್ಜಿಯಲ್ಲಿ ನೀಡಲಾದ ಎಲ್ಲಾ ದಾಖಲೆ ಮತ್ತು ಮಾಹಿತಿಯು ಸತ್ಯವೆಂದು ಅರ್ಜಿದಾರರ ದೃಢೀಕರಣ.',
      explanationHi: 'प्रस्तुत सभी दस्तावेजों और जानकारी की सत्यता की अनिवार्य आवेदक पुष्टि।',
      example: 'SAMPLE: true',
      sourceDocument: 'Applicant Declaration'
    }
  ];

  /**
   * Builds an AnalyzeFormResponse fixture for a given language.
   * - en: explanationLocal is empty string ""
   * - kn: explanationLocal in Kannada
   * - hi: explanationLocal in Hindi
   * @param {"en"|"kn"|"hi"} lang
   * @returns {Object} AnalyzeFormResponse matching contract
   */
  function buildAnalyzeFormFixture(lang) {
    var fields = FIELD_DEFINITIONS.map(function (def) {
      var local = '';
      if (lang === 'kn') {
        local = def.explanationKn;
      } else if (lang === 'hi') {
        local = def.explanationHi;
      }

      return {
        id: def.id,
        explanation: def.explanation,
        explanationLocal: local,
        example: def.example,
        sourceDocument: def.sourceDocument
      };
    });

    return {
      fields: fields,
      requiredDocuments: REQUIRED_DOCUMENTS
    };
  }

  // Complete offline dummy data object matching contract specifications
  var dummy = {
    analyzeForm: {
      en: buildAnalyzeFormFixture('en'),
      kn: buildAnalyzeFormFixture('kn'),
      hi: buildAnalyzeFormFixture('hi')
    },
    extractDocument: {
      docType: 'aadhaar',
      fields: {
        fullName: {
          value: 'SAMPLE: Kavya Ramesh Shetty',
          confidence: 0.98
        },
        dob: {
          value: '2004-05-14',
          confidence: 0.95
        },
        gender: {
          value: 'Female',
          confidence: 0.99
        },
        aadhaarLast4: {
          value: '4321',
          confidence: 0.97
        }
      }
    },
    profile: {
      fullName: 'SAMPLE: Kavya Ramesh Shetty',
      fatherName: 'SAMPLE: Ramesh Shetty',
      motherName: 'SAMPLE: Savitha Shetty',
      dob: '2004-05-14',
      gender: 'Female',
      category: 'OBC',
      annualIncome: '120000',
      aadhaarLast4: '4321',
      mobile: '9876543210',
      email: 'SAMPLE: student.kavya@example.com',
      address: 'SAMPLE: 123 Saraswathi Nagar, Bengaluru',
      pincode: '560001',
      bankAccount: '987654321001',
      ifsc: 'SBIN0001234',
      course: 'SAMPLE: B.E. Computer Science',
      institution: 'SAMPLE: Government Engineering College',
      marks: '88.5'
    }
  };

  // Expose to window.FormFlow.ui.dummy
  root.FormFlow.ui.dummy = dummy;

  // Support CommonJS testing environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = dummy;
  }
})(typeof self !== 'undefined' ? self : this);
