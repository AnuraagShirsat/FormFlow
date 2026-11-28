/**
 * FormFlow - Background Service Worker
 * Owner: Anuraag (/extension/core)
 *
 * Central message router, profile storage manager, and proxy communication gateway.
 * Complies strictly with Chrome MV3 standards.
 *
 * SECURITY:
 * - NO API keys or secrets are stored here.
 * - ALL backend requests route exclusively through our Node proxy.
 * - Profile data is stored ONLY in chrome.storage.local. Never logged.
 * - Only the last 4 digits of Aadhaar are ever retained.
 * - Strictly validates sender runtime IDs and message types.
 * - Rejects payloads exceeding 6 MB before forwarding.
 */

// Load centralized configuration
importScripts('/core/config.js');

// Known message types handled by this background service worker
const KNOWN_MESSAGE_TYPES = [
  'GET_PROFILE',
  'SAVE_PROFILE',
  'CLEAR_PROFILE',
  'ANALYZE_FORM',
  'EXTRACT_DOCUMENT',
  'SCAN_FORM',
  'GET_SPECS'
];

// Maximum allowed payload size for backend requests (6 MB)
const MAX_PAYLOAD_BYTES = 6 * 1024 * 1024;

/**
 * Retrieves the student profile from chrome.storage.local.
 * If not yet created, returns a blank profile matching the contract schema.
 * @returns {Promise<Object>} The student profile object.
 */
async function getStoredProfile() {
  try {
    const result = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.PROFILE]);
    const stored = result[CONFIG.STORAGE_KEYS.PROFILE];
    if (stored && typeof stored === 'object') {
      return Object.assign({}, CONFIG.DEFAULT_PROFILE, stored);
    }
    return Object.assign({}, CONFIG.DEFAULT_PROFILE);
  } catch (err) {
    console.error('FormFlow: Failed to read local profile storage');
    return Object.assign({}, CONFIG.DEFAULT_PROFILE);
  }
}

/**
 * Merges updates into the student profile in chrome.storage.local.
 * Enforces zero-trust data minimization:
 * 1. Aadhaar numbers (aadhaar, id_number, aadhaarNumber) reduced to aadhaarLast4 (4 digits) and originals deleted.
 * 2. Normalizes extractor keys to canonical profile keys via CONFIG.EXTRACT_KEY_MAP.
 * 3. Cleans values: annualIncome to digits only, marks to plain number string, ifsc to uppercase, pincode to 6 digits.
 * 4. Whitelists fields against CONFIG.DEFAULT_PROFILE.
 * 5. Logs ONLY the count of saved fields; never keys or values.
 *
 * @param {Object} updates Key-value updates conforming to the profile schema.
 * @returns {Promise<Object>} The updated merged profile.
 */
async function saveStoredProfile(updates) {
  if (!updates || typeof updates !== 'object') {
    return await getStoredProfile();
  }

  const current = await getStoredProfile();
  const rawInput = Object.assign({}, updates);

  // 1. CRITICAL PRIVACY GUARD: Handle all Aadhaar aliases.
  // Any key named aadhaar, id_number, or aadhaarNumber must be reduced to aadhaarLast4 (last 4 digits) and the original deleted.
  const aadhaarAliases = ['aadhaar', 'id_number', 'aadhaarNumber'];
  for (const alias of aadhaarAliases) {
    if (Object.prototype.hasOwnProperty.call(rawInput, alias)) {
      const rawVal = rawInput[alias];
      const valStr = (rawVal && typeof rawVal === 'object' && rawVal.value !== undefined)
        ? rawVal.value
        : rawVal;
      if (valStr !== null && valStr !== undefined) {
        const digits = String(valStr).replace(/\D/g, '');
        rawInput.aadhaarLast4 = digits.length > 0 ? digits.slice(-4) : null;
      }
      delete rawInput[alias];
    }
  }

  // Also sanitize aadhaarLast4 if provided directly
  if (Object.prototype.hasOwnProperty.call(rawInput, 'aadhaarLast4')) {
    const rawVal = rawInput.aadhaarLast4;
    const valStr = (rawVal && typeof rawVal === 'object' && rawVal.value !== undefined)
      ? rawVal.value
      : rawVal;
    if (valStr !== null && valStr !== undefined) {
      const digits = String(valStr).replace(/\D/g, '');
      rawInput.aadhaarLast4 = digits.length > 0 ? digits.slice(-4) : null;
    }
  }

  // 2. Normalize incoming keys through EXTRACT_KEY_MAP
  const normalized = {};
  const extractMap = (typeof CONFIG !== 'undefined' && CONFIG.EXTRACT_KEY_MAP) ? CONFIG.EXTRACT_KEY_MAP : {};
  const defaultProfile = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_PROFILE) ? CONFIG.DEFAULT_PROFILE : {};

  for (const rawKey of Object.keys(rawInput)) {
    // Unwrap { value, confidence } extractor objects if present
    let val = rawInput[rawKey];
    if (val !== null && typeof val === 'object' && val.value !== undefined) {
      val = val.value;
    }

    if (Object.prototype.hasOwnProperty.call(extractMap, rawKey)) {
      const targetKey = extractMap[rawKey];
      normalized[targetKey] = val;
    } else if (Object.prototype.hasOwnProperty.call(defaultProfile, rawKey)) {
      normalized[rawKey] = val;
    }
    // Unmapped keys (such as certificate_number, issue_date) are ignored
  }

  // 3. Clean field values
  // annualIncome: digits only (for example '2,50,000' becomes '250000')
  if (normalized.annualIncome !== undefined && normalized.annualIncome !== null) {
    const digits = String(normalized.annualIncome).replace(/\D/g, '');
    normalized.annualIncome = digits.length > 0 ? digits : null;
  }

  // marks: plain number string (for example '88.5%' becomes '88.5')
  if (normalized.marks !== undefined && normalized.marks !== null) {
    const cleaned = String(normalized.marks).replace(/[^\d.]/g, '');
    normalized.marks = cleaned.length > 0 ? cleaned : null;
  }

  // ifsc: uppercase
  if (normalized.ifsc !== undefined && normalized.ifsc !== null) {
    normalized.ifsc = String(normalized.ifsc).trim().toUpperCase();
  }

  // pincode: 6 digits
  if (normalized.pincode !== undefined && normalized.pincode !== null) {
    const pinDigits = String(normalized.pincode).replace(/\D/g, '');
    normalized.pincode = pinDigits.length > 0 ? pinDigits.slice(0, 6) : null;
  }

  // 4. Whitelist keys according to DEFAULT_PROFILE schema
  const merged = Object.assign({}, current);
  let savedCount = 0;
  for (const key of Object.keys(defaultProfile)) {
    if (Object.prototype.hasOwnProperty.call(normalized, key)) {
      merged[key] = normalized[key];
      savedCount++;
    }
  }

  await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.PROFILE]: merged });
  // Log ONLY the count of saved fields, never keys or values
  console.log('FormFlow: Student profile updated in local storage (' + savedCount + ' fields)');
  return merged;
}

/**
 * Clears the student profile from chrome.storage.local.
 * Hook called by the widget's "Clear my data" user action.
 * @returns {Promise<boolean>} True upon successful deletion.
 */
async function clearStoredProfile() {
  try {
    await chrome.storage.local.remove([CONFIG.STORAGE_KEYS.PROFILE]);
    console.log('FormFlow: Student profile cleared successfully');
    return true;
  } catch (err) {
    console.error('FormFlow: Failed to clear local profile storage');
    return false;
  }
}

/**
 * Dispatches a POST request to the local Node backend proxy.
 * Ensures the extension never calls Gemini directly.
 * Rejects payloads whose JSON exceeds 6 MB before network transmission.
 *
 * @param {string} endpoint The relative endpoint path (e.g. 'analyze-form').
 * @param {Object} payload The JSON payload matching contract specifications.
 * @returns {Promise<Object>} Standardized response with data or sanitized error.
 */
async function callBackendProxy(endpoint, payload) {
  let payloadJson;
  try {
    payloadJson = JSON.stringify(payload);
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Payload cannot be serialized to JSON'
      }
    };
  }

  // Reject payloads larger than 6 MB before forwarding to the backend
  if (payloadJson.length > MAX_PAYLOAD_BYTES) {
    return {
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Payload size exceeds the 6 MB limit before backend proxy transmission'
      }
    };
  }

  const url = CONFIG.BACKEND_BASE_URL.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payloadJson,
      signal: controller.signal
    });
    clearTimeout(timer);

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: (result && result.error) ? result.error : {
          code: 'HTTP_' + response.status,
          message: 'Backend proxy returned an error (status ' + response.status + ')'
        }
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      error: {
        code: isTimeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
        message: isTimeout
          ? 'Backend proxy request timed out. Please check that the backend server is running.'
          : 'Unable to reach backend proxy. Ensure Node server is active on ' + CONFIG.BACKEND_BASE_URL
      }
    };
  }
}

/**
 * Injects existing extension modules on-demand into the active tab.
 * Silently ignores files that are not yet authored by teammates.
 * @param {number} tabId Target Chrome tab ID.
 */
async function injectExtensionScripts(tabId) {
  if (!tabId) return;

  // Order of dependencies: config -> content namespace bridge -> scanner -> matcher -> filler -> widget UI helpers -> widget UI
  const candidateScripts = [
    'core/config.js',
    'core/content.js',
    'core/scanner.js',
    'filler/matcher.js',
    'filler/filler.js',
    'ui/domUtil.js',
    'ui/uploadChecks.js',
    'ui/widgetStyles.js',
    'ui/dummyData.js',
    'ui/imageFixer.js',
    'ui/review.js',
    'ui/imageFixerPanel.js',
    'ui/widget.js'
  ];

  for (const scriptPath of candidateScripts) {
    try {
      const url = chrome.runtime.getURL(scriptPath);
      const res = await fetch(url);
      if (res.ok) {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: [scriptPath]
        });
      }
    } catch (err) {
      // Fail quietly if file is missing or not yet implemented
    }
  }
}

/**
 * Central message router processing inter-process communications.
 * Validates sender origin and message type against contract specifications.
 */
async function handleMessage(message, sender) {
  // Sender check: reject any message where sender.id !== chrome.runtime.id
  if (sender && sender.id && sender.id !== chrome.runtime.id) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED_SENDER',
        message: 'Sender ID does not match extension runtime ID'
      }
    };
  }

  if (!message || typeof message !== 'object') {
    return {
      success: false,
      error: {
        code: 'INVALID_MESSAGE',
        message: 'Message payload must be an object'
      }
    };
  }

  const { type, payload } = message;

  // Validate message.type is one of the known types
  if (!KNOWN_MESSAGE_TYPES.includes(type)) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_MESSAGE_TYPE',
        message: 'Unrecognized message type: ' + type
      }
    };
  }

  switch (type) {
    case 'GET_PROFILE': {
      const profile = await getStoredProfile();
      return { success: true, profile: profile };
    }

    case 'SAVE_PROFILE': {
      const updates = (payload && payload.updates) ? payload.updates : payload;
      const profile = await saveStoredProfile(updates);
      return { success: true, profile: profile };
    }

    case 'CLEAR_PROFILE': {
      const cleared = await clearStoredProfile();
      return { success: cleared };
    }

    case 'ANALYZE_FORM': {
      if (!payload) {
        return { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Missing payload for ANALYZE_FORM' } };
      }
      return await callBackendProxy('analyze-form', payload);
    }

    case 'EXTRACT_DOCUMENT': {
      if (!payload) {
        return { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Missing payload for EXTRACT_DOCUMENT' } };
      }
      return await callBackendProxy('extract-document', payload);
    }

    case 'SCAN_FORM': {
      // If requested by UI, forward scan request to the content script in the sender's tab
      const tabId = (sender && sender.tab && sender.tab.id) ? sender.tab.id : null;
      if (!tabId) {
        return { success: false, error: { code: 'NO_ACTIVE_TAB', message: 'Cannot scan form without an active tab' } };
      }
      try {
        const response = await chrome.tabs.sendMessage(tabId, { type: 'SCAN_FORM' });
        return response || { success: true, fields: [] };
      } catch (err) {
        return { success: false, error: { code: 'SCAN_FAILED', message: 'Form scanner script is not active on this page' } };
      }
    }

    case 'GET_SPECS': {
      try {
        const specsUrl = chrome.runtime.getURL('filler/specs.json');
        const res = await fetch(specsUrl);
        const specs = await res.json();
        return { success: true, data: { specs: specs } };
      } catch (err) {
        return { success: false, error: { code: 'SPECS_LOAD_FAILED', message: 'Unable to load portal specifications' } };
      }
    }

    default:
      return { success: false, error: { code: 'UNKNOWN_MESSAGE_TYPE', message: 'Unrecognized message type: ' + type } };
  }
}

// Register Chrome runtime message listener with async response support
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((result) => sendResponse(result))
    .catch((err) => {
      sendResponse({
        success: false,
        error: {
          code: 'UNHANDLED_ERROR',
          message: err && err.message ? err.message : 'An unhandled service worker error occurred'
        }
      });
    });
  return true; // Keep message port open for asynchronous sendResponse
});

// User action click handler: Injects content scripts on-demand and toggles the widget.
// Skips re-injection if FormFlow already runs in the active tab.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id || !tab.url) return;

  // Disallow execution on internal chrome:// or edge:// pages
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  try {
    // Check if FormFlow is already running in the tab to skip re-injection
    let isAlreadyRunning = false;
    try {
      const pingResponse = await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
      if (pingResponse && pingResponse.running) {
        isAlreadyRunning = true;
      }
    } catch (_) {
      isAlreadyRunning = false;
    }

    if (!isAlreadyRunning) {
      await injectExtensionScripts(tab.id);
    }

    // Notify the injected widget to mount or toggle visibility
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_WIDGET' });
  } catch (err) {
    // Fail quietly if tab cannot receive messages
  }
});
