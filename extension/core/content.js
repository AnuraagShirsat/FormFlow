/**
 * FormFlow - Content Script Bridge & Global Namespace
 * Owner: Anuraag (/extension/core)
 *
 * Initializes the window.FormFlow shared namespace in the content script environment.
 * Acts as an orchestration bridge between Kartik's scanner/filler and Himani's UI widget.
 *
 * RULES:
 * - Never use innerHTML, eval, or new Function.
 * - Never auto-submit forms.
 * - Never log sensitive student data.
 * - Validate sender runtime ID and message type.
 */

(function () {
  'use strict';

  // Prevent multiple initializations of the core namespace bridge
  if (window.FormFlow && window.FormFlow.__initialized) {
    return;
  }

  // Initialize shared FormFlow namespace
  window.FormFlow = window.FormFlow || {};
  window.FormFlow.__initialized = true;

  // Known message types handled by the content script
  const KNOWN_CONTENT_TYPES = ['TOGGLE_WIDGET', 'SCAN_FORM', 'PING'];

  /**
   * Helper to dispatch messages to the FormFlow background service worker.
   * @param {string} type Contract message type (e.g. 'ANALYZE_FORM', 'GET_PROFILE').
   * @param {Object} [payload] Optional data payload.
   * @returns {Promise<Object>} Standardized response from service worker.
   */
  window.FormFlow.sendToBackground = function (type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: type, payload: payload }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: {
              code: 'COMMUNICATION_ERROR',
              message: chrome.runtime.lastError.message || 'Failed to message background worker'
            }
          });
          return;
        }
        resolve(response || { success: true });
      });
    });
  };

  /**
   * Action hook for clearing the student's local profile data ("Clear my data").
   * Can be called directly from the widget UI.
   * @returns {Promise<Object>} Status of the clear operation.
   */
  window.FormFlow.clearProfile = function () {
    return window.FormFlow.sendToBackground('CLEAR_PROFILE');
  };

  /**
   * Action hook for retrieving the student's profile.
   * @returns {Promise<Object>} Contains { success: true, profile: Object }.
   */
  window.FormFlow.getProfile = function () {
    return window.FormFlow.sendToBackground('GET_PROFILE');
  };

  /**
   * Action hook for saving/updating the student's profile.
   * @param {Object} updates Partial profile object.
   * @returns {Promise<Object>} Contains { success: true, profile: Object }.
   */
  window.FormFlow.saveProfile = function (updates) {
    return window.FormFlow.sendToBackground('SAVE_PROFILE', { updates: updates });
  };

  /**
   * Default scanForm fallback if core/scanner.js has not loaded.
   * Overridden by Kartik's scanner.js.
   * @returns {Array} List of detected FormField objects.
   */
  if (typeof window.FormFlow.scanForm !== 'function') {
    window.FormFlow.scanForm = function () {
      console.warn('FormFlow: scanForm called before core/scanner.js loaded');
      return [];
    };
  }

  /**
   * Default mountWidget fallback if ui/widget.js has not loaded.
   * Overridden by Himani's widget.js.
   * @returns {HTMLElement|null} The mounted container element.
   */
  if (typeof window.FormFlow.mountWidget !== 'function') {
    window.FormFlow.mountWidget = function () {
      console.warn('FormFlow: mountWidget called before ui/widget.js loaded');
      return null;
    };
  }

  /**
   * Default fillFields fallback if filler/filler.js has not loaded.
   * Overridden by Kartik's filler.js.
   * Conforms to the updated contract: { filledCount, skippedCount, missingCount, errors }.
   * @param {Array} plan Array of FillPlanItem objects.
   * @returns {Object} Result summary { filledCount, skippedCount, missingCount, errors: [] }.
   */
  if (typeof window.FormFlow.fillFields !== 'function') {
    window.FormFlow.fillFields = function (plan) {
      console.warn('FormFlow: fillFields called before filler/filler.js loaded');
      const total = Array.isArray(plan) ? plan.length : 0;
      return { filledCount: 0, skippedCount: total, missingCount: 0, errors: [] };
    };
  }

  /**
   * Listen for commands from the background service worker.
   * Enforces strict sender checks and validates message types.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Reject any message where sender.id !== chrome.runtime.id
    if (sender && sender.id && sender.id !== chrome.runtime.id) {
      return;
    }

    if (!message || typeof message !== 'object') {
      return;
    }

    // Validate that message.type is one of the known content message types
    if (!KNOWN_CONTENT_TYPES.includes(message.type)) {
      return;
    }

    // Ping check to detect if FormFlow is already running in the tab
    if (message.type === 'PING') {
      sendResponse({ success: true, running: true });
      return true;
    }

    if (message.type === 'TOGGLE_WIDGET') {
      if (typeof window.FormFlow.mountWidget === 'function') {
        window.FormFlow.mountWidget();
        sendResponse({ success: true, action: 'MOUNTED_OR_TOGGLED' });
      } else {
        sendResponse({ success: false, reason: 'WIDGET_NOT_LOADED' });
      }
      return true;
    }

    if (message.type === 'SCAN_FORM') {
      if (typeof window.FormFlow.scanForm === 'function') {
        const fields = window.FormFlow.scanForm();
        sendResponse({ success: true, fields: fields });
      } else {
        sendResponse({ success: false, fields: [] });
      }
      return true;
    }
  });

  console.log('FormFlow: Content bridge initialized');
})();
