/**
 * /extension/filler/filler.js
 * 
 * FormFlow Form Filler Engine
 * 
 * Fills target web form inputs based on an approved FillPlanItem[]:
 * - Runs ONLY after the student clicks "Fill form" in the FormFlow widget review screen.
 * - Fills ONLY fields that have status === 'green' (user approved).
 * - Framework-safe value setting: Uses native property descriptors so React, Vue,
 *   and Angular detect synthetic value updates.
 * - Dispatches 'input', 'change', and 'blur' bubbling events.
 * - Handles text, number, date, tel, email, textarea, select dropdowns, radio buttons, and checkboxes.
 * - Visibly outlines missing/red fields in red and scrolls to the first missing field.
 * - Provides full Undo functionality restoring previous form values.
 * - NEVER touches password or hidden fields.
 * - NEVER clicks Submit or auto-submits any form.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FormFlow = root.FormFlow || {};
    const filler = factory();
    root.FormFlow.filler = filler;
    root.FormFlow.fillFields = filler.fillFields;
    root.FormFlow.undoFill = filler.undoFill;
    root.FormFlow.canUndo = filler.canUndo;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // State stack for undo operation
  let undoStack = [];

  // ---------------------------------------------------------------------------
  // 1. DOM Element Resolution
  // ---------------------------------------------------------------------------

  /**
   * Finds the target form element across common DOM query strategies:
   * 1. Exact ID
   * 2. Name attribute
   * 3. CSS selector
   * 4. Radio/Checkbox group by name
   * @param {string} fieldId 
   * @returns {HTMLElement|NodeList|null}
   */
  function findTargetElement(fieldId) {
    if (!fieldId || typeof fieldId !== 'string') return null;

    // 1. By ID
    const byId = document.getElementById(fieldId);
    if (byId) return byId;

    // 2. By Name
    const byName = document.getElementsByName(fieldId);
    if (byName && byName.length > 0) {
      if (byName[0].type === 'radio' || byName[0].type === 'checkbox') {
        return byName; // Return full group for radios/checkboxes
      }
      return byName[0];
    }

    // 3. By sanitized CSS selector
    try {
      const bySelector = document.querySelector(fieldId);
      if (bySelector) return bySelector;
    } catch (e) {
      // Invalid selector syntax; continue
    }

    // 4. By query [name="..."]
    try {
      const byNameQuery = document.querySelector(`[name="${CSS.escape ? CSS.escape(fieldId) : fieldId}"]`);
      if (byNameQuery) return byNameQuery;
    } catch (e) {
      // Ignore query error
    }

    return null;
  }

  /**
   * Safety check: never touch passwords or hidden inputs.
   * @param {HTMLElement} el 
   * @returns {boolean}
   */
  function isSafeElement(el) {
    if (!el || !el.tagName) return false;
    const type = (el.type || '').toLowerCase();
    if (type === 'password' || type === 'hidden') {
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // 2. Framework-Safe Value Setting & Event Dispatching
  // ---------------------------------------------------------------------------

  /**
   * Sets value using native prototype setters so React, Angular, and Vue track the change.
   * Modern frameworks hijack the .value property; direct element.value = 'x' does not trigger
   * internal state updates without calling the prototype descriptor.
   * @param {HTMLElement} el 
   * @param {string} value 
   */
  function setNativeValue(el, value) {
    const valString = value === null || value === undefined ? '' : String(value);

    let setter = null;
    const proto = Object.getPrototypeOf(el);

    if (proto) {
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) {
        setter = desc.set;
      }
    }

    // Fallbacks to standard HTML prototype setters
    if (!setter) {
      if (el.tagName === 'INPUT' && HTMLInputElement.prototype) {
        setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      } else if (el.tagName === 'TEXTAREA' && HTMLTextAreaElement.prototype) {
        setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      } else if (el.tagName === 'SELECT' && HTMLSelectElement.prototype) {
        setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      }
    }

    if (setter) {
      setter.call(el, valString);
    } else {
      el.value = valString;
    }
  }

  /**
   * Sets native checked property for checkboxes and radio buttons.
   * @param {HTMLInputElement} el 
   * @param {boolean} checked 
   */
  function setNativeChecked(el, checked) {
    const boolVal = Boolean(checked);
    let setter = null;
    const proto = Object.getPrototypeOf(el);

    if (proto) {
      const desc = Object.getOwnPropertyDescriptor(proto, 'checked');
      if (desc && desc.set) {
        setter = desc.set;
      }
    }

    if (!setter && typeof HTMLInputElement !== 'undefined' && HTMLInputElement.prototype) {
      setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    }

    if (setter) {
      try {
        setter.call(el, boolVal);
      } catch (e) {
        el.checked = boolVal;
      }
    }
    el.checked = boolVal;
  }

  /**
   * Dispatches bubbling input, change, and blur events so validation listeners trigger.
   * @param {HTMLElement} el 
   */
  function dispatchEvents(el) {
    try {
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      el.dispatchEvent(inputEvent);

      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      el.dispatchEvent(changeEvent);

      const blurEvent = new Event('blur', { bubbles: true, cancelable: true });
      el.dispatchEvent(blurEvent);
    } catch (e) {
      // Fallback for older DOM environments
      if (document.createEvent) {
        const ev = document.createEvent('HTMLEvents');
        ev.initEvent('change', true, true);
        el.dispatchEvent(ev);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Field-Specific Fill Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handles <select> dropdowns. Matches by option value OR option text.
   * @param {HTMLSelectElement} selectEl 
   * @param {string} value 
   * @returns {boolean}
   */
  function fillSelect(selectEl, value) {
    if (!selectEl || selectEl.tagName !== 'SELECT') return false;
    const cleanTarget = String(value).trim().toLowerCase();

    let matchedIndex = -1;

    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      const optVal = (opt.value || '').trim().toLowerCase();
      const optText = (opt.text || opt.textContent || '').trim().toLowerCase();

      if (optVal === cleanTarget || optText === cleanTarget) {
        matchedIndex = i;
        break;
      }
    }

    // Substring fallback
    if (matchedIndex === -1) {
      for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        const optVal = (opt.value || '').trim().toLowerCase();
        const optText = (opt.text || opt.textContent || '').trim().toLowerCase();

        if (optText.includes(cleanTarget) || cleanTarget.includes(optText)) {
          matchedIndex = i;
          break;
        }
      }
    }

    if (matchedIndex !== -1) {
      selectEl.selectedIndex = matchedIndex;
      setNativeValue(selectEl, selectEl.options[matchedIndex].value);
      dispatchEvents(selectEl);
      return true;
    }

    return false;
  }

  /**
   * Handles radio button groups.
   * @param {NodeList|HTMLInputElement[]} radioGroup 
   * @param {string} value 
   * @returns {boolean}
   */
  function fillRadio(radioGroup, value) {
    const cleanTarget = String(value).trim().toLowerCase();

    for (const radio of radioGroup) {
      const radioVal = (radio.value || '').trim().toLowerCase();
      // Also check adjacent label text if available
      let labelText = '';
      if (radio.id) {
        const labelEl = document.querySelector(`label[for="${radio.id}"]`);
        if (labelEl) labelText = (labelEl.textContent || '').trim().toLowerCase();
      }

      if (radioVal === cleanTarget || labelText === cleanTarget || labelText.includes(cleanTarget)) {
        setNativeChecked(radio, true);
        dispatchEvents(radio);
        return true;
      }
    }

    return false;
  }

  /**
   * Handles checkboxes.
   * @param {HTMLInputElement} checkboxEl 
   * @param {any} value 
   * @returns {boolean}
   */
  function fillCheckbox(checkboxEl, value) {
    const isTruthy = value === true || value === 'true' || value === '1' || value === 'yes' || value === 'on';
    setNativeChecked(checkboxEl, isTruthy);
    dispatchEvents(checkboxEl);
    return true;
  }

  // ---------------------------------------------------------------------------
  // 4. Fill Fields Engine
  // ---------------------------------------------------------------------------

  /**
   * Fills form fields based on student-approved FillPlanItem[].
   * NEVER touches password/hidden fields. NEVER submits the form.
   * @param {Array<object>} plan FillPlanItem[]
   * @returns {{ filledCount: number, skippedCount: number, errors: string[] }}
   */
  function fillFields(plan) {
    if (!Array.isArray(plan)) {
      return { filledCount: 0, skippedCount: 0, errors: ['Invalid plan array'] };
    }

    let filledCount = 0;
    let skippedCount = 0;
    const errors = [];
    let firstRedElement = null;

    // Clear previous undo stack for this new fill session
    undoStack = [];

    for (const item of plan) {
      if (!item || !item.fieldId) continue;

      const target = findTargetElement(item.fieldId);
      if (!target) {
        skippedCount++;
        continue;
      }

      // Check if it's a group of radio buttons
      const isRadioGroup = (typeof NodeList !== 'undefined' && target instanceof NodeList) || (Array.isArray(target) && target[0]?.type === 'radio');
      const sampleEl = isRadioGroup ? target[0] : target;

      // Security check: Never touch password or hidden fields
      if (!isSafeElement(sampleEl)) {
        skippedCount++;
        continue;
      }

      // 1. GREEN STATUS: User-approved field with valid value
      if (item.status === 'green' && item.value !== null && item.value !== undefined) {
        try {
          // Record undo state before modification
          if (isRadioGroup) {
            for (const radio of target) {
              undoStack.push({
                element: radio,
                type: 'radio',
                previousChecked: radio.checked,
                previousOutline: radio.style.outline,
                previousOutlineOffset: radio.style.outlineOffset
              });
            }
            fillRadio(target, item.value);
          } else {
            undoStack.push({
              element: sampleEl,
              type: sampleEl.type || sampleEl.tagName.toLowerCase(),
              previousValue: sampleEl.value,
              previousChecked: sampleEl.checked,
              previousOutline: sampleEl.style.outline,
              previousOutlineOffset: sampleEl.style.outlineOffset
            });

            const tag = sampleEl.tagName.toLowerCase();
            const type = (sampleEl.type || '').toLowerCase();

            if (tag === 'select') {
              fillSelect(sampleEl, item.value);
            } else if (type === 'checkbox') {
              fillCheckbox(sampleEl, item.value);
            } else {
              setNativeValue(sampleEl, item.value);
              dispatchEvents(sampleEl);
            }

            // Clear any red outline if previously marked
            sampleEl.style.outline = '';
            sampleEl.style.outlineOffset = '';
          }

          filledCount++;
        } catch (fillErr) {
          errors.push(`Failed to fill ${item.fieldId}: ${fillErr.message}`);
          skippedCount++;
        }
      } 
      // 2. RED STATUS: Missing or low confidence; mark with red outline
      else if (item.status === 'red') {
        try {
          if (!isRadioGroup) {
            undoStack.push({
              element: sampleEl,
              type: 'outline_only',
              previousOutline: sampleEl.style.outline,
              previousOutlineOffset: sampleEl.style.outlineOffset
            });

            // Visibly outline missing field in red
            sampleEl.style.outline = '2px solid #ef4444';
            sampleEl.style.outlineOffset = '2px';

            if (!firstRedElement) {
              firstRedElement = sampleEl;
            }
          }
          skippedCount++;
        } catch (e) {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    // Scroll to the first missing / red field if present
    if (firstRedElement && typeof firstRedElement.scrollIntoView === 'function') {
      try {
        firstRedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof firstRedElement.focus === 'function') {
          firstRedElement.focus({ preventScroll: true });
        }
      } catch (scrollErr) {
        // Fallback or ignore scroll failure
      }
    }

    return {
      filledCount: filledCount,
      skippedCount: skippedCount,
      errors: errors
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Undo Mechanism
  // ---------------------------------------------------------------------------

  /**
   * Restores all modified fields to their state prior to fillFields.
   * @returns {{ restoredCount: number, success: boolean }}
   */
  function undoFill() {
    if (undoStack.length === 0) {
      return { restoredCount: 0, success: true };
    }

    let restoredCount = 0;

    // Replay in reverse
    for (let i = undoStack.length - 1; i >= 0; i--) {
      const entry = undoStack[i];
      const el = entry.element;
      if (!el) continue;

      try {
        // Restore outline
        el.style.outline = entry.previousOutline || '';
        el.style.outlineOffset = entry.previousOutlineOffset || '';

        if (entry.type === 'radio' || entry.type === 'checkbox') {
          setNativeChecked(el, entry.previousChecked);
          dispatchEvents(el);
          restoredCount++;
        } else if (entry.type !== 'outline_only') {
          setNativeValue(el, entry.previousValue);
          dispatchEvents(el);
          restoredCount++;
        }
      } catch (err) {
        // Continue restoring other elements
      }
    }

    undoStack = [];
    return { restoredCount: restoredCount, success: true };
  }

  /**
   * Returns whether an active undo stack exists.
   * @returns {boolean}
   */
  function canUndo() {
    return undoStack.length > 0;
  }

  // ---------------------------------------------------------------------------
  // 6. Exports
  // ---------------------------------------------------------------------------

  return {
    fillFields: fillFields,
    undoFill: undoFill,
    canUndo: canUndo,
    setNativeValue: setNativeValue,
    setNativeChecked: setNativeChecked,
    dispatchEvents: dispatchEvents,
    findTargetElement: findTargetElement,
    fillSelect: fillSelect,
    fillRadio: fillRadio,
    fillCheckbox: fillCheckbox
  };
});
