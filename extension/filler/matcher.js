/**
 * /extension/filler/matcher.js
 * 
 * FormFlow Field-Matching Logic
 * 
 * Maps discovered FormField[] to the student Profile to generate a reviewable
 * FillPlanItem[]: [{ fieldId, profileKey, value, confidence, status: 'green'|'red', reason }]
 * 
 * STRATEGY:
 * 1. Deterministic first: Multilingual synonym dictionary (English, Hindi, Kannada, Indian form abbreviations)
 * 2. Normalized token & fuzzy matching on labels, placeholders, hints, and field IDs
 * 3. Type compatibility enforcement (date, tel, email, select, radio, checkbox, text)
 * 4. Value transformation (HTML5 date formats vs DD/MM/YYYY, option fuzzy-matching, numeric stripping)
 * 5. Low confidence or absent values marked 'red' with human-readable reasons
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FormFlow = root.FormFlow || {};
    root.FormFlow.matcher = factory();
    root.FormFlow.createFillPlan = root.FormFlow.matcher.createFillPlan;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // ---------------------------------------------------------------------------
  // 1. Multilingual Synonym Dictionary
  // ---------------------------------------------------------------------------

  const SYNONYM_DICTIONARY = {
    fullName: [
      'fullname', 'full name', 'applicant name', 'applicant full name', 'candidate name',
      'student name', 'name of candidate', 'name of applicant', 'name of student',
      'name', 'naam', 'hesaru', 'vidyarthi hesaru', 'vidyarthi ka naam',
      'as per 10th', 'as per sslc', 'as per marks card', 'candidate_name', 'applicant_name'
    ],
    fatherName: [
      'father name', 'father full name', 'fathers name', "father's name",
      'guardian name', 'guardian', "guardian's name", 'parent name',
      'pita ka naam', 'thande hesaru', 'thande', 's/o', 'd/o', 'w/o',
      'father/guardian', 'father_name', 'guardian_name'
    ],
    motherName: [
      'mother name', 'mother full name', 'mothers name', "mother's name",
      'mata ka naam', 'thaayi hesaru', 'thaayi', 'mother_name'
    ],
    dob: [
      'date of birth', 'dob', 'birth date', 'birthdate', 'd.o.b', 'd.o.b.',
      'janma dinank', 'janmadina', 'date_of_birth'
    ],
    gender: [
      'gender', 'sex', 'linga', 'male/female', 'gender_id'
    ],
    category: [
      'category', 'social category', 'caste category', 'reservation category',
      'caste', 'sub caste', 'sub-caste', 'community', 'varga', 'jaati',
      'quota', 'caste_category'
    ],
    annualIncome: [
      'annual income', 'family income', 'annual family income', 'household income',
      'total annual income', 'gross income', 'income', 'varshika aadaya', 'aaya',
      'aamdani', 'income per annum', 'annual_income', 'family_income'
    ],
    aadhaarLast4: [
      'aadhaar', 'aadhaar number', 'aadhaar no', 'aadhaar last 4', 'aadhar',
      'aadhar number', 'uid', 'uidai', 'aadhaar_no', 'aadhaar_last4'
    ],
    mobile: [
      'mobile', 'mobile number', 'phone', 'phone number', 'contact number',
      'cell', 'cell number', 'telephone', 'samparka sankhye', 'duravani',
      'mobile_no', 'contact_no'
    ],
    email: [
      'email', 'e-mail', 'email address', 'e-mail address', 'mail id', 'email id',
      'email_id'
    ],
    address: [
      'address', 'permanent address', 'residential address', 'communication address',
      'correspondence address', 'present address', 'vilasa', 'pata', 'postal address',
      'residential_address', 'permanent_address'
    ],
    pincode: [
      'pincode', 'pin code', 'pin', 'postal code', 'zip', 'zipcode',
      'anjal sankhye', 'pin_code'
    ],
    bankAccount: [
      'bank account', 'account number', 'acc no', 'account no', 'bank acc no',
      'bank account number', 'sb account', 'khata sankhye', 'a/c no', 'bank a/c',
      'bank_account_no', 'account_no'
    ],
    ifsc: [
      'ifsc', 'ifsc code', 'branch ifsc', 'bank ifsc', 'ifsc_code'
    ],
    course: [
      'course', 'program', 'degree', 'class', 'current course', 'branch of study',
      'department', 'course name', 'stream', 'course_name'
    ],
    institution: [
      'institution', 'college', 'school', 'university', 'institute', 'college name',
      'school name', 'institution name', 'college_name', 'institution_name'
    ],
    marks: [
      'marks', 'percentage', 'percentage of marks', 'cgpa', 'score', 'grade',
      'marks obtained', 'sslc marks', '10th marks', 'aggregate marks', 'total marks',
      'percentage_marks'
    ]
  };

  // ---------------------------------------------------------------------------
  // 2. Normalization & Token Matching
  // ---------------------------------------------------------------------------

  const STOP_WORDS = new Set([
    'enter', 'your', 'please', 'the', 'of', 'in', 'an', 'a', 'and', 'for', 'to',
    'select', 'choose', 'type', 'here', 'as', 'per', 'details'
  ]);

  /**
   * Normalizes a text string: lowercases, removes special characters, and filters stop words.
   * @param {string} text 
   * @returns {string[]} tokens
   */
  function tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[_\-\/\.:,()]/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  /**
   * Cleans and flattens a string for substring comparison.
   * @param {string} text 
   * @returns {string}
   */
  function cleanString(text) {
    if (!text || typeof text !== 'string') return '';
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Calculates similarity between a field's attributes and a profile key's synonyms.
   * Checks label, id, hint, and option text.
   * @param {object} field FormField
   * @param {string} profileKey 
   * @returns {number} score between 0.0 and 1.0
   */
  function scoreFieldMatch(field, profileKey) {
    const synonyms = SYNONYM_DICTIONARY[profileKey] || [];
    const fieldTokens = new Set([
      ...tokenize(field.label),
      ...tokenize(field.id),
      ...tokenize(field.hint)
    ]);

    const fieldCleanId = cleanString(field.id);
    const fieldCleanLabel = cleanString(field.label);

    let bestScore = 0;

    for (const syn of synonyms) {
      const cleanSyn = cleanString(syn);

      // 1. Exact clean string match on ID or Label
      if (fieldCleanId === cleanSyn || fieldCleanLabel === cleanSyn) {
        return 0.99;
      }

      // 2. Exact word substring match (only for substantial synonyms of length >= 4)
      if (cleanSyn.length >= 4 && (fieldCleanLabel.includes(cleanSyn) || fieldCleanId.includes(cleanSyn))) {
        bestScore = Math.max(bestScore, 0.92);
      }

      // 3. For short synonyms (e.g. 'dob', 'pin', 's/o', 'd/o'), check exact token membership
      if (cleanSyn.length <= 3 && fieldTokens.has(cleanSyn)) {
        bestScore = Math.max(bestScore, 0.95);
      }

      // 3. Token overlap check
      const synTokens = tokenize(syn);
      if (synTokens.length > 0) {
        let matchedTokens = 0;
        for (const st of synTokens) {
          if (fieldTokens.has(st)) matchedTokens++;
        }
        const tokenRatio = matchedTokens / synTokens.length;
        if (tokenRatio === 1) {
          bestScore = Math.max(bestScore, 0.88);
        } else if (tokenRatio >= 0.5) {
          bestScore = Math.max(bestScore, 0.65);
        }
      }
    }

    // Type compatibility bonus / penalty
    if (field.type === 'date' && profileKey === 'dob') {
      bestScore = Math.max(bestScore + 0.1, 0.85);
    } else if (field.type === 'date' && profileKey !== 'dob') {
      bestScore = Math.min(bestScore, 0.2); // Don't put non-dates into date fields
    }

    if (field.type === 'tel' && profileKey === 'mobile') {
      bestScore = Math.max(bestScore + 0.1, 0.9);
    }

    if (field.type === 'email' && profileKey === 'email') {
      bestScore = Math.max(bestScore + 0.1, 0.95);
    }

    return Math.min(bestScore, 0.99);
  }

  // ---------------------------------------------------------------------------
  // 3. Format Conversion & Value Adaptation
  // ---------------------------------------------------------------------------

  /**
   * Adapts date string to match field constraints.
   * Default output is ISO YYYY-MM-DD for <input type="date">.
   * If field hints DD/MM/YYYY, converts to DD/MM/YYYY.
   * @param {string} dateVal YYYY-MM-DD
   * @param {object} field 
   * @returns {string}
   */
  function adaptDateFormat(dateVal, field) {
    if (!dateVal || typeof dateVal !== 'string') return dateVal;
    const parts = dateVal.split('-');
    if (parts.length !== 3) return dateVal;

    const [yyyy, mm, dd] = parts;
    const hint = (field.hint || '').toLowerCase();
    const label = (field.label || '').toLowerCase();

    // If input expects DD/MM/YYYY or DD-MM-YYYY
    if (field.type !== 'date' && (hint.includes('dd/mm/yyyy') || label.includes('dd/mm/yyyy'))) {
      return `${dd}/${mm}/${yyyy}`;
    }
    if (field.type !== 'date' && (hint.includes('dd-mm-yyyy') || label.includes('dd-mm-yyyy'))) {
      return `${dd}-${mm}-${yyyy}`;
    }

    // Default standard HTML5 date format
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Fuzzy matches a profile value against a select or radio option list.
   * @param {string} profileVal 
   * @param {string[]} options 
   * @returns {string|null} best matching option value or null
   */
  function matchOptionValue(profileVal, options) {
    if (!profileVal || !Array.isArray(options) || options.length === 0) {
      return profileVal;
    }

    const cleanVal = cleanString(profileVal);

    // 1. Exact match (case-insensitive)
    for (const opt of options) {
      if (opt.toLowerCase() === profileVal.toLowerCase()) {
        return opt;
      }
    }

    // 2. Exact clean match
    for (const opt of options) {
      if (cleanString(opt) === cleanVal) {
        return opt;
      }
    }

    // 3. Substring match (e.g. "Male" in "Male / Purusha" or "OBC" in "OBC (Cat-2A)")
    for (const opt of options) {
      const cleanOpt = cleanString(opt);
      if (cleanOpt.includes(cleanVal) || cleanVal.includes(cleanOpt)) {
        return opt;
      }
    }

    // 4. Single-letter gender shortcuts: "M" for "Male", "F" for "Female"
    if (cleanVal === 'male') {
      const mOpt = options.find(o => cleanString(o) === 'm');
      if (mOpt) return mOpt;
    }
    if (cleanVal === 'female') {
      const fOpt = options.find(o => cleanString(o) === 'f');
      if (fOpt) return fOpt;
    }

    return null;
  }

  /**
   * Formats numeric fields (strips non-digits for type="number", handles Indian currency).
   * @param {string|number} val 
   * @param {object} field 
   * @returns {string}
   */
  function adaptNumberFormat(val, field) {
    if (val === null || val === undefined) return '';
    const strVal = String(val).trim();

    if (field.type === 'number') {
      // Remove all non-numeric characters except decimal
      return strVal.replace(/[^0-9.]/g, '');
    }

    return strVal;
  }

  // ---------------------------------------------------------------------------
  // 4. Fill Plan Generator
  // ---------------------------------------------------------------------------

  /**
   * Generates a fill plan mapping scanned FormField[] to the student Profile.
   * @param {Array<object>} scannedFields Array of FormField objects from scanner
   * @param {object} profile Student profile from chrome.storage.local
   * @returns {Array<object>} Array of FillPlanItem objects
   */
  function createFillPlan(scannedFields, profile) {
    if (!Array.isArray(scannedFields)) return [];
    const prof = profile || {};

    const plan = [];
    const usedProfileKeys = new Set();

    for (const field of scannedFields) {
      // Skip passwords, hidden, file inputs, and submit buttons
      if (field.type === 'password' || field.type === 'file') {
        continue;
      }

      let bestKey = null;
      let highestScore = 0;

      // Evaluate match against each profile key
      for (const profileKey of Object.keys(SYNONYM_DICTIONARY)) {
        const score = scoreFieldMatch(field, profileKey);
        if (score > highestScore && score >= 0.70) {
          highestScore = score;
          bestKey = profileKey;
        }
      }

      // Check if we found a match and if the profile contains a value
      let profileValue = bestKey ? prof[bestKey] : null;

      if (bestKey && profileValue !== null && profileValue !== undefined && String(profileValue).trim() !== '') {
        let adaptedValue = String(profileValue).trim();

        // Format conversion per field type
        if (bestKey === 'dob' || field.type === 'date') {
          adaptedValue = adaptDateFormat(adaptedValue, field);
        } else if (field.type === 'select' || field.type === 'radio') {
          const matchedOpt = matchOptionValue(adaptedValue, field.options || []);
          if (matchedOpt) {
            adaptedValue = matchedOpt;
          } else {
            // Option mismatch: downgrade confidence
            highestScore = 0.50;
          }
        } else if (field.type === 'number' || bestKey === 'annualIncome' || bestKey === 'pincode') {
          adaptedValue = adaptNumberFormat(adaptedValue, field);
        }

        // Determine green or red status
        if (highestScore >= 0.70) {
          plan.push({
            fieldId: field.id,
            profileKey: bestKey,
            value: adaptedValue,
            confidence: Math.round(highestScore * 100) / 100,
            status: 'green',
            reason: `Matched ${field.label || field.id} to verified profile ${bestKey}.`
          });
          usedProfileKeys.add(bestKey);
          continue;
        }
      }

      // Red status: Unmatched, low confidence, or missing from profile
      let reason = 'Not found in your documents';
      if (bestKey && (!profileValue || String(profileValue).trim() === '')) {
        reason = `Value for ${bestKey} is missing from profile. Please upload the required document.`;
      } else if (bestKey && highestScore < 0.70) {
        reason = `Low match confidence (${Math.round(highestScore * 100)}%). Please review manually.`;
      }

      plan.push({
        fieldId: field.id,
        profileKey: bestKey,
        value: null,
        confidence: 0.0,
        status: 'red',
        reason: reason
      });
    }

    return plan;
  }

  // ---------------------------------------------------------------------------
  // 5. Exports
  // ---------------------------------------------------------------------------

  return {
    createFillPlan: createFillPlan,
    scoreFieldMatch: scoreFieldMatch,
    adaptDateFormat: adaptDateFormat,
    matchOptionValue: matchOptionValue,
    adaptNumberFormat: adaptNumberFormat,
    SYNONYM_DICTIONARY: SYNONYM_DICTIONARY
  };
});
