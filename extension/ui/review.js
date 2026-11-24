/**
 * FormFlow - Document Upload & Field Review Panels
 * File: /extension/ui/review.js
 *
 * Implements the Document Upload tab and the Verification/Review tab:
 * 1. window.FormFlow.ui.renderUploadPanel(container, ctx)
 *    - Drag-and-drop zone + file chooser.
 *    - docType dropdown with: aadhaar, marksheet_10th, marksheet_12th, income_certificate, caste_certificate.
 *    - Validates files with window.FormFlow.ui.checkUpload(file). Files remain in memory only.
 *    - Real mode: sends base64 to EXTRACT_DOCUMENT background message. Dummy mode: uses dummy data.
 *    - Merges extracted values with confidence >= 0.5 into profile. aadhaarLast4 only.
 *    - Displays short list of extracted fields.
 *
 * 2. window.FormFlow.ui.renderReviewPanel(container, ctx)
 *    - Creates review plan using window.FormFlow.createFillPlan(fields, profile).
 *    - Displays field label, editable value input, and status chip (green vs red).
 *    - Handles profileKey null safely for unmatched red fields.
 *    - Edits update a local plan copy only; profile remains untouched.
 *    - Single "Fill form" button passes approved plan to window.FormFlow.fillFields(plan).
 *    - Displays filledCount, skippedCount, errors. NEVER submits forms.
 *    - Provides Undo button calling window.FormFlow.undoFill() using canUndo().
 */

(function (root) {
  'use strict';

  // Ensure FormFlow and UI namespaces exist
  root.FormFlow = root.FormFlow || {};
  root.FormFlow.ui = root.FormFlow.ui || {};

  var el = (root.FormFlow.ui && root.FormFlow.ui.el) ? root.FormFlow.ui.el : function (tag, text, attrs, children) {
    var node = document.createElement(tag);
    if (text !== null && text !== undefined && text !== '') node.textContent = String(text);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    }
    if (children) {
      if (Array.isArray(children)) children.forEach(function (c) { if (c) node.appendChild(c); });
      else node.appendChild(children);
    }
    return node;
  };

  // Supported upload document types matching backend contract
  var DOC_TYPES = [
    { value: 'aadhaar', label: 'Aadhaar Card' },
    { value: 'marksheet_10th', label: '10th Marksheet' },
    { value: 'marksheet_12th', label: '12th Marksheet' },
    { value: 'income_certificate', label: 'Income Certificate' },
    { value: 'caste_certificate', label: 'Caste Certificate' }
  ];

  /**
   * 1. Render Document Upload Panel
   *
   * @param {HTMLElement} container Parent DOM element.
   * @param {Object} ctx Context: { useDummy, getProfile(), saveProfile(updates), onProfileChanged() }
   */
  function renderUploadPanel(container, ctx) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    var selectedDocType = 'aadhaar';

    // Status message area
    var statusBox = el('div', null, { class: 'ff-hidden' });

    function showStatus(text, isError) {
      statusBox.className = isError ? 'ff-card ff-chip-red' : 'ff-card ff-chip-green';
      statusBox.textContent = text;
      statusBox.classList.remove('ff-hidden');
    }

    function clearStatus() {
      statusBox.textContent = '';
      statusBox.className = 'ff-hidden';
    }

    // Results container
    var resultsBox = el('div', null, { class: 'ff-hidden' });

    // Document Type Selector
    var docSelectOptions = DOC_TYPES.map(function (dt) {
      return el('option', dt.label, { value: dt.value });
    });

    var docSelect = el('select', null, {
      class: 'ff-btn',
      id: 'ff-doc-type-select',
      style: 'width: 100%; margin-bottom: 12px;'
    }, docSelectOptions);

    docSelect.addEventListener('change', function () {
      selectedDocType = docSelect.value;
      clearStatus();
    });

    // Hidden native file input
    var fileInput = el('input', null, {
      type: 'file',
      class: 'ff-hidden',
      id: 'ff-file-input'
    });

    // "Choose file" trigger button
    var chooseBtn = el('button', 'Choose document file', {
      type: 'button',
      class: 'ff-btn ff-btn-primary'
    });

    chooseBtn.addEventListener('click', function () {
      fileInput.click();
    });

    // Drag and drop zone
    var dropZone = el('div', null, {
      class: 'ff-card',
      role: 'region',
      tabindex: '0',
      'aria-label': 'Document file drop area',
      style: 'text-align: center; padding: 24px 16px; border-style: dashed; cursor: pointer;'
    }, [
      el('div', '📁 Drag & drop document here', { style: 'font-weight: 600; margin-bottom: 6px;' }),
      el('div', 'Supports JPEG, PNG, or PDF up to 5 MB (files stay in memory only)', { style: 'font-size: 11px; color: #94a3b8; margin-bottom: 12px;' }),
      chooseBtn,
      fileInput
    ]);

    // Drag and drop event listeners
    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.borderColor = '#38bdf8';
    });

    dropZone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.borderColor = '';
    });

    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.borderColor = '';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleIncomingFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        handleIncomingFile(fileInput.files[0]);
      }
    });

    /**
     * Handles file validation and AI extraction.
     * @param {File} file
     */
    function handleIncomingFile(file) {
      clearStatus();
      while (resultsBox.firstChild) {
        resultsBox.removeChild(resultsBox.firstChild);
      }
      resultsBox.classList.add('ff-hidden');

      showStatus('Validating file integrity...', false);

      // STEP 1: Pre-flight security verification via uploadChecks.js
      if (root.FormFlow.ui && typeof root.FormFlow.ui.checkUpload === 'function') {
        root.FormFlow.ui.checkUpload(file).then(function (checkRes) {
          if (!checkRes || !checkRes.ok) {
            showStatus((checkRes && checkRes.message) ? checkRes.message : 'Invalid document upload.', true);
            return;
          }
          // File passed client security checks
          executeExtraction(file);
        }).catch(function () {
          showStatus('File verification failed.', true);
        });
      } else {
        executeExtraction(file);
      }
    }

    /**
     * Dispatches file to offline dummy data or real backend extraction.
     * @param {File} file
     */
    function executeExtraction(file) {
      showStatus('Extracting document information...', false);

      // Dummy mode
      if (ctx && ctx.useDummy) {
        var dummyData = (root.FormFlow.ui.dummy && root.FormFlow.ui.dummy.extractDocument)
          ? root.FormFlow.ui.dummy.extractDocument
          : { docType: selectedDocType, fields: {} };

        processExtractionResults(dummyData);
        return;
      }

      // Real mode: Read to base64 WITHOUT the data: prefix
      var reader = new FileReader();
      reader.onload = function () {
        var dataUrl = reader.result;
        var commaIndex = dataUrl.indexOf(',');
        var base64Data = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;
        var mimeType = file.type || 'image/jpeg';

        if (typeof root.FormFlow.sendToBackground === 'function') {
          root.FormFlow.sendToBackground('EXTRACT_DOCUMENT', {
            docType: selectedDocType,
            mimeType: mimeType,
            data: base64Data
          }).then(function (res) {
            if (res && res.success && res.data && res.data.fields) {
              processExtractionResults(res.data);
            } else {
              var err = (res && res.error && res.error.message)
                ? res.error.message
                : 'Document extraction failed. Please check that the backend is running.';
              showStatus(err, true);
            }
          }).catch(function () {
            showStatus('Network error during document extraction.', true);
          });
        } else {
          showStatus('Background connection unavailable.', true);
        }
      };

      reader.onerror = function () {
        showStatus('Failed to read file from memory.', true);
      };

      reader.readAsDataURL(file);
    }

    /**
     * Merges high-confidence extracted fields into profile and renders output.
     * @param {Object} extractionResponse
     */
    function processExtractionResults(extractionResponse) {
      var rawFields = extractionResponse.fields || {};
      var updates = {};
      var savedItems = [];

      Object.keys(rawFields).forEach(function (k) {
        var item = rawFields[k];
        // Merge only values that are not null with confidence >= 0.5
        if (item && item.value !== null && item.value !== undefined && typeof item.confidence === 'number' && item.confidence >= 0.5) {
          var strVal = String(item.value).trim();
          if (strVal !== '') {
            // CRITICAL PRIVACY GUARD: Never store full Aadhaar numbers, only aadhaarLast4
            if (k === 'aadhaar' || k === 'aadhaarNumber') {
              var last4 = strVal.replace(/\D/g, '').slice(-4);
              if (last4) {
                updates.aadhaarLast4 = last4;
                savedItems.push({ name: 'Aadhaar (Last 4)', value: last4, confidence: item.confidence });
              }
            } else if (k === 'aadhaarLast4') {
              var last4Direct = strVal.replace(/\D/g, '').slice(-4);
              updates.aadhaarLast4 = last4Direct;
              savedItems.push({ name: 'Aadhaar (Last 4)', value: last4Direct, confidence: item.confidence });
            } else {
              updates[k] = strVal;
              savedItems.push({ name: k, value: strVal, confidence: item.confidence });
            }
          }
        }
      });

      // Save updates into profile
      if (Object.keys(updates).length > 0 && ctx && typeof ctx.saveProfile === 'function') {
        Promise.resolve(ctx.saveProfile(updates)).then(function () {
          if (typeof ctx.onProfileChanged === 'function') {
            ctx.onProfileChanged();
          }
        });
      }

      showStatus('Document processed! ' + savedItems.length + ' field(s) saved to profile.', false);

      // Render extracted fields list
      while (resultsBox.firstChild) {
        resultsBox.removeChild(resultsBox.firstChild);
      }

      if (savedItems.length > 0) {
        var resultsCard = el('div', null, { class: 'ff-card', style: 'margin-top: 12px;' }, [
          el('div', 'Extracted Document Fields', { class: 'ff-card-header' })
        ]);

        savedItems.forEach(function (it) {
          var confPct = Math.round(it.confidence * 100);
          var row = el('div', null, { class: 'ff-detail-row', style: 'padding: 4px 0;' }, [
            el('strong', it.name + ': '),
            el('span', it.value),
            el('span', ' (' + confPct + '% confidence)', { style: 'color: #94a3b8; font-size: 10px;' })
          ]);
          resultsCard.appendChild(row);
        });

        resultsBox.appendChild(resultsCard);
        resultsBox.classList.remove('ff-hidden');
      }
    }

    // Build panel layout
    container.appendChild(el('div', '1. Select Document Category', { style: 'font-weight: 600; margin-bottom: 6px;' }));
    container.appendChild(docSelect);
    container.appendChild(el('div', '2. Upload Document File', { style: 'font-weight: 600; margin-bottom: 6px;' }));
    container.appendChild(dropZone);
    container.appendChild(statusBox);
    container.appendChild(resultsBox);
  }

  /**
   * 2. Render Verification and Review Panel
   *
   * @param {HTMLElement} container Parent DOM element.
   * @param {Object} ctx Context: { getFields(), getProfile() }
   */
  function renderReviewPanel(container, ctx) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    var fields = (ctx && typeof ctx.getFields === 'function') ? ctx.getFields() : [];
    var profile = (ctx && typeof ctx.getProfile === 'function') ? ctx.getProfile() : {};

    // Generate fill plan from matcher
    var rawPlan = (typeof root.FormFlow.createFillPlan === 'function')
      ? root.FormFlow.createFillPlan(fields, profile)
      : [];

    // Local deep copy of plan (edits change local copy only, never profile)
    var localPlan = rawPlan.map(function (p) {
      return {
        fieldId: p.fieldId,
        profileKey: p.profileKey, // safely null for unmatched fields
        value: p.value !== null && p.value !== undefined ? String(p.value) : '',
        confidence: typeof p.confidence === 'number' ? p.confidence : 0,
        status: p.status || 'red',
        reason: p.reason || 'Missing or unverified'
      };
    });

    var summaryBox = el('div', null, { class: 'ff-hidden' });

    function showSummary(text, isError) {
      summaryBox.className = isError ? 'ff-card ff-chip-red' : 'ff-card ff-chip-green';
      summaryBox.textContent = text;
      summaryBox.classList.remove('ff-hidden');
    }

    // Header intro
    var intro = el('div', 'Review matched profile values before filling. Green fields are verified. Red fields require review or manual entry.', {
      style: 'font-size: 12px; color: #cbd5e1; margin-bottom: 12px;'
    });
    container.appendChild(intro);
    container.appendChild(summaryBox);

    // List of form field cards
    var list = el('div', null, { class: 'ff-review-list' });

    localPlan.forEach(function (planItem) {
      // Find matching field definition for display label
      var matchedField = fields.find(function (f) { return f.id === planItem.fieldId; });
      var fieldLabel = (matchedField && matchedField.label) ? matchedField.label : planItem.fieldId;

      var isGreen = (planItem.status === 'green');
      var chip = el('span', isGreen ? 'Matched' : 'Missing', {
        class: isGreen ? 'ff-chip ff-chip-green' : 'ff-chip ff-chip-red'
      });

      var reasonEl = el('div', isGreen ? planItem.reason : ('Notice: ' + planItem.reason), {
        class: 'ff-card-body',
        style: 'font-size: 11px; color: ' + (isGreen ? '#94a3b8' : '#f87171') + ';'
      });

      // Editable input for user review/modification
      var valInput = el('input', null, {
        type: 'text',
        class: 'ff-btn',
        value: planItem.value,
        placeholder: 'Enter ' + fieldLabel,
        style: 'width: 100%; margin-top: 6px; text-align: left; cursor: text;'
      });

      // User edit listener: Updates local plan copy only
      valInput.addEventListener('input', function () {
        planItem.value = valInput.value;
        if (valInput.value.trim() !== '') {
          planItem.status = 'green';
          chip.className = 'ff-chip ff-chip-green';
          chip.textContent = 'Edited';
          reasonEl.textContent = 'User-provided value for form fill.';
          reasonEl.style.color = '#94a3b8';
        } else {
          planItem.status = 'red';
          chip.className = 'ff-chip ff-chip-red';
          chip.textContent = 'Missing';
          reasonEl.textContent = 'Field value cleared.';
          reasonEl.style.color = '#f87171';
        }
      });

      var card = el('div', null, { class: 'ff-card' }, [
        el('div', null, { class: 'ff-card-header' }, [
          el('span', fieldLabel, { style: 'font-size: 13px;' }),
          chip
        ]),
        valInput,
        reasonEl
      ]);

      list.appendChild(card);
    });

    container.appendChild(list);

    // Fill form and Undo action bar
    var fillBtn = el('button', 'Fill form', {
      type: 'button',
      class: 'ff-btn ff-btn-primary',
      style: 'margin-right: 8px;'
    });

    var undoBtn = el('button', 'Undo fill', {
      type: 'button',
      class: 'ff-btn',
      disabled: !((typeof root.FormFlow.canUndo === 'function') && root.FormFlow.canUndo())
    });

    // "Fill form" action: Passes approved plan to window.FormFlow.fillFields
    fillBtn.addEventListener('click', function () {
      // Approved plan: green items and edited items only
      var approvedPlan = localPlan.filter(function (it) {
        return it.status === 'green' && it.value !== null && it.value !== undefined && String(it.value).trim() !== '';
      });

      if (approvedPlan.length === 0) {
        showStatus('No verified or entered fields to populate.', true);
        return;
      }

      if (typeof root.FormFlow.fillFields === 'function') {
        var result = root.FormFlow.fillFields(approvedPlan);
        var msg = 'Filled ' + result.filledCount + ' field(s). Skipped ' + result.skippedCount + '.';
        if (result.errors && result.errors.length > 0) {
          msg += ' Errors: ' + result.errors.join('; ');
        }
        showSummary(msg, result.filledCount === 0);

        // Update undo button state
        var canUndoNow = (typeof root.FormFlow.canUndo === 'function') && root.FormFlow.canUndo();
        if (canUndoNow) {
          undoBtn.removeAttribute('disabled');
          undoBtn.disabled = false;
        }
      }
    });

    // "Undo" action: Calls window.FormFlow.undoFill
    undoBtn.addEventListener('click', function () {
      if (typeof root.FormFlow.undoFill === 'function') {
        var undoRes = root.FormFlow.undoFill();
        showSummary('Undo complete: Restored ' + undoRes.restoredCount + ' field(s).', false);
        undoBtn.setAttribute('disabled', '');
        undoBtn.disabled = true;
      }
    });

    var actionBar = el('div', null, {
      style: 'margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center;'
    }, [
      fillBtn,
      undoBtn
    ]);

    container.appendChild(actionBar);
  }

  // Expose render functions to window.FormFlow.ui
  root.FormFlow.ui.renderUploadPanel = renderUploadPanel;
  root.FormFlow.ui.renderReviewPanel = renderReviewPanel;

  // Support CommonJS testing environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      renderUploadPanel: renderUploadPanel,
      renderReviewPanel: renderReviewPanel
    };
  }
})(typeof self !== 'undefined' ? self : this);
