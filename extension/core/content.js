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
   * Default scanForm fallback if filler/scanner.js has not loaded.
   * Overridden by Kartik's scanner.js.
   * @returns {Array} List of detected FormField objects.
   */
  if (typeof window.FormFlow.scanForm !== 'function') {
    window.FormFlow.scanForm = function () {
      console.warn('FormFlow: scanForm called before filler/scanner.js loaded');
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
   * @param {Array} plan Array of FillPlanItem objects.
   * @returns {Object} Result summary.
   */
  if (typeof window.FormFlow.fillFields !== 'function') {
    window.FormFlow.fillFields = function (plan) {
      console.warn('FormFlow: fillFields called before filler/filler.js loaded');
      return { filledCount: 0, skippedCount: Array.isArray(plan) ? plan.length : 0, errors: [] };
    };
  }

  /**
   * Listen for commands from the background service worker.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object') {
      return;
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
