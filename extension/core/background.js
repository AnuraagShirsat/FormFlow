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
 */

// Load centralized configuration
importScripts('/core/config.js');

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
 * Enforces zero-trust data minimization (e.g. stripping full Aadhaar).
 * Profile contents are strictly NEVER logged to the console.
 * @param {Object} updates Key-value updates conforming to the profile schema.
 * @returns {Promise<Object>} The updated merged profile.
 */
async function saveStoredProfile(updates) {
  if (!updates || typeof updates !== 'object') {
    return await getStoredProfile();
  }

  const current = await getStoredProfile();
  const sanitized = Object.assign({}, updates);

  // CRITICAL PRIVACY GUARD: Never store full Aadhaar numbers.
  // If an entire Aadhaar string was mistakenly provided, extract only last 4 digits.
  if (sanitized.aadhaar) {
    const rawAadhaar = String(sanitized.aadhaar).replace(/\D/g, '');
    sanitized.aadhaarLast4 = rawAadhaar.slice(-4);
    delete sanitized.aadhaar;
  }
  if (sanitized.aadhaarLast4) {
    sanitized.aadhaarLast4 = String(sanitized.aadhaarLast4).replace(/\D/g, '').slice(-4);
  }

  // Whitelist keys according to DEFAULT_PROFILE schema
  const merged = Object.assign({}, current);
  for (const key of Object.keys(CONFIG.DEFAULT_PROFILE)) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      merged[key] = sanitized[key];
    }
  }

  await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.PROFILE]: merged });
  console.log('FormFlow: Student profile updated in local storage (' + Object.keys(sanitized).length + ' fields)');
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
 * @param {string} endpoint The relative endpoint path (e.g. 'analyze-form').
 * @param {Object} payload The JSON payload matching contract specifications.
 * @returns {Promise<Object>} Standardized response with data or sanitized error.
 */
async function callBackendProxy(endpoint, payload) {
  const url = CONFIG.BACKEND_BASE_URL.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
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

  // Order of dependencies: config -> content namespace bridge -> filler -> widget UI
  const candidateScripts = [
    'core/config.js',
    'core/content.js',
    'filler/scanner.js',
    'filler/filler.js',
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
 * Maps contract message types to corresponding handlers.
 */
async function handleMessage(message, sender) {
  if (!message || typeof message !== 'object') {
    return { error: { code: 'INVALID_MESSAGE', message: 'Message payload must be an object' } };
  }

  const { type, payload } = message;

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
        return { error: { code: 'INVALID_PAYLOAD', message: 'Missing payload for ANALYZE_FORM' } };
      }
      return await callBackendProxy('analyze-form', payload);
    }

    case 'EXTRACT_DOCUMENT': {
      if (!payload) {
        return { error: { code: 'INVALID_PAYLOAD', message: 'Missing payload for EXTRACT_DOCUMENT' } };
      }
      return await callBackendProxy('extract-document', payload);
    }

    case 'SCAN_FORM': {
      // If requested by UI, forward scan request to the content script in the sender's tab
      const tabId = (sender && sender.tab && sender.tab.id) ? sender.tab.id : null;
      if (!tabId) {
        return { error: { code: 'NO_ACTIVE_TAB', message: 'Cannot scan form without an active tab' } };
      }
      try {
        const response = await chrome.tabs.sendMessage(tabId, { type: 'SCAN_FORM' });
        return response || { success: true, fields: [] };
      } catch (err) {
        return { error: { code: 'SCAN_FAILED', message: 'Form scanner script is not active on this page' } };
      }
    }

    default:
      return { error: { code: 'UNKNOWN_MESSAGE_TYPE', message: 'Unrecognized message type: ' + type } };
  }
}

// Register Chrome runtime message listener with async response support
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((result) => sendResponse(result))
    .catch((err) => {
      sendResponse({
        error: {
          code: 'UNHANDLED_ERROR',
          message: err && err.message ? err.message : 'An unhandled service worker error occurred'
        }
      });
    });
  return true; // Keep message port open for asynchronous sendResponse
});

// User action click handler: Injects content scripts on-demand and toggles the widget
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id || !tab.url) return;

  // Disallow execution on internal chrome:// or edge:// pages
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  try {
    // 1. Inject available scripts dynamically
    await injectExtensionScripts(tab.id);

    // 2. Notify the injected widget to mount or toggle visibility
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_WIDGET' });
  } catch (err) {
    // Fail quietly if tab cannot receive messages
  }
});
