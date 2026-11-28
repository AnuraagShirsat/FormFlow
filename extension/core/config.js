/**
 * FormFlow - Core Configuration
 * Owner: Anuraag (/extension/core)
 *
 * Provides centralized configuration constants across the extension.
 * SECURITY: NEVER store API keys or secrets in this or any extension file.
 */

// Backend proxy configuration.
// In development, points to the local Node proxy.
// In production, update this to your deployed proxy domain.
const CONFIG = {
  // Base URL for the Node proxy holding Gemini credentials
  BACKEND_BASE_URL: 'http://localhost:5000',

  // Fallback production placeholder for deployment verification
  PRODUCTION_BASE_URL: 'https://formflow-backend.example.com',

  // Network request timeout limit in milliseconds (60 seconds for Render cold starts)
  REQUEST_TIMEOUT_MS: 60000,

  // Offline demonstration toggle:
  // true: Uses offline fixtures from window.FormFlow.ui.dummy
  // false: Sends ANALYZE_FORM messages to background service worker and local Node proxy
  USE_DUMMY_DATA: false,

  // Local storage keys (scoped to chrome.storage.local)
  STORAGE_KEYS: {
    PROFILE: 'formflow_profile_v1',
    SETTINGS: 'formflow_settings_v1'
  },

  // Blank profile template matching the contract specification.
  // Full Aadhaar numbers are NEVER stored; only aadhaarLast4 is supported.
  DEFAULT_PROFILE: {
    fullName: null,
    fatherName: null,
    motherName: null,
    dob: null,
    gender: null,
    category: null,
    annualIncome: null,
    aadhaarLast4: null,
    mobile: null,
    email: null,
    address: null,
    pincode: null,
    bankAccount: null,
    ifsc: null,
    course: null,
    institution: null,
    marks: null,
    state: null,
    district: null,
    rollNumber: null,
    bankName: null
  },

  // Extractor key mapping to canonical profile keys.
  // Unmapped keys (such as certificate_number, issue_date) are ignored.
  EXTRACT_KEY_MAP: {
    annual_income: 'annualIncome',
    annualIncome: 'annualIncome',
    percentage: 'marks',
    marks: 'marks',
    student_name: 'fullName',
    applicant_name: 'fullName',
    account_holder_name: 'fullName',
    father_name: 'fatherName',
    ifsc_code: 'ifsc',
    account_number: 'bankAccount',
    bank_name: 'bankName',
    roll_number: 'rollNumber',
    state: 'state',
    district: 'district'
  },

  // Supported UI languages
  SUPPORTED_LANGUAGES: ['en', 'kn', 'hi']
};

// Expose safely across ServiceWorkerGlobalScope and Window contexts
if (typeof self !== 'undefined') {
  self.CONFIG = CONFIG;
}
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
