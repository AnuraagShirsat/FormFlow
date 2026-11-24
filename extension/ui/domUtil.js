/**
 * FormFlow - Safe DOM Construction Utility
 * File: /extension/ui/domUtil.js
 *
 * Security helper for constructing DOM elements safely without XSS vulnerabilities.
 * Implements strict defense against Attack 11 (XSS via malicious webpage text, prompt
 * injection labels, or hostile HTML snippets).
 *
 * SECURITY INVARIANTS:
 * - Uses document.createElement exclusively.
 * - Sets text content ONLY with textContent (never innerHTML, outerHTML, or insertAdjacentHTML).
 * - Enforces a strict allow-list for element attributes.
 * - Explicitly rejects any attribute beginning with "on" (e.g. onclick, onerror, onload).
 * - Restricts "href" strictly to HTTPS URLs (rejecting javascript:, data:, and http: schemes).
 */

(function (root) {
  'use strict';

  // Ensure FormFlow and UI namespaces exist
  root.FormFlow = root.FormFlow || {};
  root.FormFlow.ui = root.FormFlow.ui || {};

  // Exact allow-list of safe attributes permitted on constructed elements
  var EXACT_ALLOWED_ATTRS = {
    'class': true,
    'id': true,
    'type': true,
    'role': true,
    'tabindex': true,
    'title': true,
    'placeholder': true,
    'value': true,
    'checked': true,
    'disabled': true,
    'for': true
  };

  /**
   * Validates whether an attribute name and value are permissible.
   * @param {string} name Attribute name.
   * @param {any} value Attribute value.
   * @returns {boolean} True if attribute is allowed.
   */
  function isAttributeAllowed(name, value) {
    if (!name || typeof name !== 'string') {
      return false;
    }

    var lowerName = name.toLowerCase().trim();

    // CRITICAL: Reject any attribute starting with "on" (inline handler defense for attack 11)
    if (lowerName.indexOf('on') === 0) {
      return false;
    }

    // Allow-list checks
    if (EXACT_ALLOWED_ATTRS[lowerName]) {
      return true;
    }

    // Allow aria-* accessibility attributes
    if (lowerName.indexOf('aria-') === 0) {
      return true;
    }

    // Allow data-* dataset attributes
    if (lowerName.indexOf('data-') === 0) {
      return true;
    }

    // Allow href ONLY when it starts with https:
    if (lowerName === 'href') {
      return typeof value === 'string' && value.toLowerCase().indexOf('https:') === 0;
    }

    // All other attributes are rejected
    return false;
  }

  /**
   * Constructs a DOM element safely.
   * Sets text strictly via textContent. Filters attributes against a strict allow-list.
   *
   * @param {string} tag HTML tag name (e.g. 'div', 'button', 'span').
   * @param {string|number|null} [text] Optional text content (set ONLY via textContent).
   * @param {Object|null} [attrs] Key-value map of permitted attributes.
   * @param {Array<Node>|Node|null} [children] Child element(s) or text node(s).
   * @returns {HTMLElement} The created DOM element.
   */
  function el(tag, text, attrs, children) {
    if (!tag || typeof tag !== 'string') {
      throw new Error('FormFlow.ui.el requires a valid string tag name');
    }

    var element = document.createElement(tag);

    // Set text content strictly using textContent (Attack 11 XSS defense)
    if (text !== null && text !== undefined && text !== '') {
      element.textContent = String(text);
    }

    // Apply allowed attributes
    if (attrs && typeof attrs === 'object') {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = attrs[key];

        if (isAttributeAllowed(key, val)) {
          var lowerKey = key.toLowerCase().trim();

          // Handle boolean attributes (checked, disabled)
          if (lowerKey === 'checked') {
            if (val) {
              element.setAttribute('checked', '');
              element.checked = true;
            } else {
              element.removeAttribute('checked');
              element.checked = false;
            }
          } else if (lowerKey === 'disabled') {
            if (val) {
              element.setAttribute('disabled', '');
              element.disabled = true;
            } else {
              element.removeAttribute('disabled');
              element.disabled = false;
            }
          } else if (lowerKey === 'value' && ('value' in element)) {
            element.setAttribute('value', String(val));
            element.value = String(val);
          } else {
            element.setAttribute(key, String(val));
          }
        }
      }
    }

    // Append child elements or nodes
    if (children) {
      if (Array.isArray(children)) {
        for (var j = 0; j < children.length; j++) {
          var child = children[j];
          if (child && child.nodeType) {
            element.appendChild(child);
          } else if (child !== null && child !== undefined && child !== '') {
            element.appendChild(document.createTextNode(String(child)));
          }
        }
      } else if (children.nodeType) {
        element.appendChild(children);
      } else if (children !== null && children !== undefined && children !== '') {
        element.appendChild(document.createTextNode(String(children)));
      }
    }

    return element;
  }

  // Expose to window.FormFlow.ui
  root.FormFlow.ui.el = el;

  // Support CommonJS testing environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      el: el,
      isAttributeAllowed: isAttributeAllowed
    };
  }
})(typeof self !== 'undefined' ? self : this);
