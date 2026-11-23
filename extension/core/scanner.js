/**
 * FormFlow - Form Scanner
 * Owner: Anuraag (/extension/core)
 *
 * Scans the active DOM, open Shadow Roots, and same-origin iframes for interactive form fields.
 * Exposes window.FormFlow.scanForm() adhering strictly to the FormField contract.
 *
 * SECURITY & PRIVACY INVARIANTS:
 * - NEVER reads or collects current field values (value, checked).
 * - NEVER captures password, hidden, or disabled inputs.
 * - Caps scanned fields at 100 items; caps labels and hints at 200 characters to prevent prompt injection.
 * - Uses textContent ONLY (never innerHTML).
 */

(function () {
  'use strict';

  // Ensure FormFlow namespace exists
  window.FormFlow = window.FormFlow || {};

  /**
   * Cleans and sanitizes extracted text.
   * Collapses multiple whitespaces and trims output.
   * @param {string} text Raw text string.
   * @param {number} [maxLength=200] Maximum allowed characters.
   * @returns {string} Sanitized string.
   */
  function sanitizeText(text, maxLength) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    const limit = typeof maxLength === 'number' ? maxLength : 200;
    const cleaned = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return cleaned.slice(0, limit);
  }

  /**
   * Checks if an element is hidden or disabled.
   * @param {HTMLElement} el The DOM element to check.
   * @returns {boolean} True if the element should be skipped.
   */
  function isElementSkipped(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }

    // Skip disabled elements
    if (el.disabled || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
      return true;
    }

    // Skip FormFlow's own UI containers
    if (el.closest && (el.closest('#formflow-widget-host') || el.closest('[data-formflow-ui]'))) {
      return true;
    }

    const type = (el.getAttribute('type') || '').toLowerCase();

    // Skip password and hidden types
    if (type === 'password' || type === 'hidden') {
      return true;
    }

    // Skip action buttons
    if (type === 'submit' || type === 'button' || type === 'reset' || type === 'image') {
      return true;
    }

    // Skip hidden DOM nodes
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') {
      return true;
    }

    // Check inline or computed hiding
    if (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden')) {
      return true;
    }

    return false;
  }

  /**
   * Resolves text label for an element using textContent only.
   * Priority: aria-labelledby -> aria-label -> label[for] -> wrapping <label> -> nearby text -> placeholder.
   * @param {HTMLElement} el The form element.
   * @param {Document|ShadowRoot} root The root context for querySelector.
   * @returns {string} Cleaned label string (max 200 chars).
   */
  function resolveLabel(el, root) {
    // 1. Check aria-labelledby
    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const parts = ariaLabelledBy.trim().split(/\s+/);
      const texts = [];
      for (let i = 0; i < parts.length; i++) {
        const target = root.getElementById ? root.getElementById(parts[i]) : root.querySelector('#' + CSS.escape(parts[i]));
        if (target && target.textContent) {
          texts.push(target.textContent);
        }
      }
      const combined = texts.join(' ');
      if (combined.trim()) {
        return sanitizeText(combined, 200);
      }
    }

    // 2. Check aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return sanitizeText(ariaLabel, 200);
    }

    // 3. Check <label for="id">
    if (el.id) {
      try {
        const labelFor = root.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (labelFor && labelFor.textContent) {
          return sanitizeText(labelFor.textContent, 200);
        }
      } catch (err) {
        // Fallback for special characters in ID
      }
    }

    // 4. Check wrapping <label>
    if (el.closest) {
      const parentLabel = el.closest('label');
      if (parentLabel && parentLabel.textContent) {
        return sanitizeText(parentLabel.textContent, 200);
      }
    }

    // 5. Check nearby legend if inside fieldset
    if (el.closest) {
      const fieldset = el.closest('fieldset');
      if (fieldset) {
        const legend = fieldset.querySelector('legend');
        if (legend && legend.textContent) {
          return sanitizeText(legend.textContent, 200);
        }
      }
    }

    // 6. Check nearby text elements (previous sibling or table cell)
    let sibling = el.previousElementSibling;
    while (sibling) {
      if (sibling.textContent && sibling.textContent.trim().length > 1) {
        const tag = sibling.tagName.toLowerCase();
        if (tag === 'span' || tag === 'p' || tag === 'div' || tag === 'label' || tag === 'strong') {
          return sanitizeText(sibling.textContent, 200);
        }
      }
      sibling = sibling.previousElementSibling;
    }

    // 7. Check table layout (preceding <th> or <td>)
    if (el.closest) {
      const td = el.closest('td');
      if (td && td.previousElementSibling && td.previousElementSibling.textContent) {
        return sanitizeText(td.previousElementSibling.textContent, 200);
      }
    }

    // 8. Fallback to placeholder or title
    const placeholder = el.getAttribute('placeholder') || el.getAttribute('title') || '';
    if (placeholder.trim()) {
      return sanitizeText(placeholder, 200);
    }

    // Fallback to name or id if nothing else matches
    const fallback = el.getAttribute('name') || el.id || 'unlabeled_field';
    return sanitizeText(fallback, 200);
  }

  /**
   * Resolves hint, placeholder, or contextual helper text.
   * @param {HTMLElement} el The form element.
   * @param {Document|ShadowRoot} root The root context.
   * @returns {string} Sanitized hint string (max 200 chars).
   */
  function resolveHint(el, root) {
    // 1. Check aria-describedby
    const ariaDescribedBy = el.getAttribute('aria-describedby');
    if (ariaDescribedBy) {
      const parts = ariaDescribedBy.trim().split(/\s+/);
      const texts = [];
      for (let i = 0; i < parts.length; i++) {
        const target = root.getElementById ? root.getElementById(parts[i]) : root.querySelector('#' + CSS.escape(parts[i]));
        if (target && target.textContent) {
          texts.push(target.textContent);
        }
      }
      const combined = texts.join(' ');
      if (combined.trim()) {
        return sanitizeText(combined, 200);
      }
    }

    // 2. Check placeholder attribute
    const placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      return sanitizeText(placeholder, 200);
    }

    // 3. Check title attribute
    const title = el.getAttribute('title');
    if (title && title.trim()) {
      return sanitizeText(title, 200);
    }

    // 4. Check adjacent help text (.help-text, .form-text, <small>)
    if (el.nextElementSibling) {
      const next = el.nextElementSibling;
      const tag = next.tagName.toLowerCase();
      if (tag === 'small' || next.className.indexOf('help') !== -1 || next.className.indexOf('hint') !== -1) {
        return sanitizeText(next.textContent, 200);
      }
    }

    return '';
  }

  /**
   * Normalizes element input type to contract specification.
   * text|email|tel|number|date|select|radio|checkbox|textarea|file
   * @param {HTMLElement} el The form control element.
   * @returns {string} The normalized contract type.
   */
  function normalizeType(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') {
      return 'textarea';
    }
    if (tag === 'select') {
      return 'select';
    }
    if (tag === 'input') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      const validTypes = ['email', 'tel', 'number', 'date', 'radio', 'checkbox', 'file'];
      if (validTypes.indexOf(type) !== -1) {
        return type;
      }
      return 'text';
    }
    return 'text';
  }

  /**
   * Extracts available options for select, radio, or checkbox elements.
   * @param {HTMLElement} el The element or group reference.
   * @param {Array<HTMLElement>} [groupElements] Associated group elements for radios.
   * @returns {Array<string>} Array of max 50 option strings (max 100 chars each).
   */
  function extractOptions(el, groupElements) {
    const options = [];
    const tag = el.tagName.toLowerCase();

    if (tag === 'select') {
      const optionTags = el.querySelectorAll('option');
      for (let i = 0; i < optionTags.length && options.length < 50; i++) {
        const text = optionTags[i].textContent;
        const cleaned = sanitizeText(text || optionTags[i].value, 100);
        if (cleaned) {
          options.push(cleaned);
        }
      }
      return options;
    }

    if (groupElements && Array.isArray(groupElements)) {
      for (let i = 0; i < groupElements.length && options.length < 50; i++) {
        const member = groupElements[i];
        const label = resolveLabel(member, member.ownerDocument || document);
        const val = member.getAttribute('value') || '';
        const choice = label || val;
        const cleaned = sanitizeText(choice, 100);
        if (cleaned && options.indexOf(cleaned) === -1) {
          options.push(cleaned);
        }
      }
      return options;
    }

    return options;
  }

  /**
   * Assigns or retrieves a stable identifier for a form control.
   * Stores the ID in a data-formflow-id attribute so the filler can locate it reliably.
   * @param {HTMLElement} el The form control element.
   * @param {number} index Numeric sequence index.
   * @param {string} type Normalized type string.
   * @returns {string} Stable identifier string (max 64 chars).
   */
  function ensureStableId(el, index, type) {
    const existing = el.getAttribute('data-formflow-id');
    if (existing && existing.length <= 64) {
      return existing;
    }

    let candidate = el.id || el.getAttribute('name') || '';
    candidate = candidate.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);

    if (!candidate) {
      candidate = 'ff_' + type + '_' + index;
    } else if (document.querySelectorAll('[data-formflow-id="' + candidate + '"]').length > 0) {
      candidate = candidate + '_' + index;
    }

    candidate = candidate.slice(0, 64);
    el.setAttribute('data-formflow-id', candidate);
    return candidate;
  }

  /**
   * Recursively collects form controls from documents, open Shadow Roots, and same-origin IFrames.
   * @param {Document|ShadowRoot} root The root context to scan.
   * @param {Array<HTMLElement>} collected Collector array.
   */
  function collectRawElements(root, collected) {
    if (!root || collected.length >= 150) {
      return;
    }

    // Select candidate inputs, selects, textareas
    let candidates = [];
    try {
      candidates = root.querySelectorAll('input, select, textarea');
    } catch (err) {
      return;
    }

    for (let i = 0; i < candidates.length && collected.length < 150; i++) {
      const el = candidates[i];
      if (!isElementSkipped(el)) {
        collected.push(el);
      }
    }

    // Traverse open shadow roots
    try {
      const allElements = root.querySelectorAll('*');
      for (let i = 0; i < allElements.length && collected.length < 150; i++) {
        const item = allElements[i];
        if (item.shadowRoot && !item.hasAttribute('data-formflow-ui')) {
          collectRawElements(item.shadowRoot, collected);
        }
      }
    } catch (err) {
      // Ignore shadow traversal errors
    }

    // Traverse same-origin IFrames
    try {
      const iframes = root.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length && collected.length < 150; i++) {
        try {
          const frameDoc = iframes[i].contentDocument;
          if (frameDoc) {
            collectRawElements(frameDoc, collected);
          }
        } catch (crossOriginErr) {
          // Cross-origin iframe blocked by SOP, skip gracefully
        }
      }
    } catch (err) {
      // Ignore iframe errors
    }
  }

  /**
   * Main scanForm implementation.
   * Scans DOM and transforms raw elements into standard FormField objects.
   * @returns {Array<Object>} List of FormField contract objects (max 100).
   */
  window.FormFlow.scanForm = function () {
    const rawElements = [];
    collectRawElements(document, rawElements);

    const fields = [];
    const handledRadioGroups = {};
    let fieldCounter = 0;

    for (let i = 0; i < rawElements.length && fields.length < 100; i++) {
      const el = rawElements[i];
      const type = normalizeType(el);
      const root = el.getRootNode ? el.getRootNode() : document;

      // Handle radio button groups sharing a common name
      if (type === 'radio') {
        const radioName = el.getAttribute('name');
        if (radioName) {
          if (handledRadioGroups[radioName]) {
            // Already processed this radio group
            continue;
          }
          handledRadioGroups[radioName] = true;

          // Find all radios in this group
          const groupMembers = [];
          for (let j = 0; j < rawElements.length; j++) {
            if (rawElements[j].getAttribute('type') === 'radio' && rawElements[j].getAttribute('name') === radioName) {
              groupMembers.push(rawElements[j]);
            }
          }

          const stableId = ensureStableId(el, ++fieldCounter, 'radio');
          // Tag each radio in group so filler can identify them
          for (let k = 0; k < groupMembers.length; k++) {
            groupMembers[k].setAttribute('data-formflow-id', stableId);
            const optVal = groupMembers[k].getAttribute('value') || ('opt_' + k);
            groupMembers[k].setAttribute('data-formflow-option', optVal);
          }

          const label = resolveLabel(el, root);
          const isRequired = groupMembers.some((m) => m.required || m.getAttribute('aria-required') === 'true');
          const options = extractOptions(el, groupMembers);
          const hint = resolveHint(el, root);

          fields.push({
            id: stableId,
            label: label || radioName,
            type: 'radio',
            required: Boolean(isRequired),
            options: options,
            hint: hint
          });
          continue;
        }
      }

      // Normal field processing (text, email, tel, number, date, select, checkbox, textarea, file)
      const stableId = ensureStableId(el, ++fieldCounter, type);
      const label = resolveLabel(el, root);
      const isRequired = Boolean(el.required || el.getAttribute('aria-required') === 'true');
      const options = type === 'select' ? extractOptions(el) : [];
      const hint = resolveHint(el, root);

      fields.push({
        id: stableId,
        label: label,
        type: type,
        required: isRequired,
        options: options,
        hint: hint
      });
    }

    console.log('FormFlow Scanner: Discovered ' + fields.length + ' fields');
    return fields;
  };
})();
