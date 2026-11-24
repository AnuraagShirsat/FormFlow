/**
 * FormFlow - Photo and Signature Fixer UI Panel
 * File: /extension/ui/imageFixerPanel.js
 *
 * Renders the interactive Photo and Signature Fixer tab within the FormFlow widget:
 * - Fetches portal photo/signature specifications via GET_SPECS background message.
 * - Allows selecting target government portal and switching between Photo and Signature modes.
 * - Warns user if a specification is unverified (spec.verified === false).
 * - Provides file selection and side-by-side before/after preview comparison.
 * - Displays dimensions in pixels and sizes in KB.
 * - Provides one-click download for the optimized artifact.
 * - Built exclusively with window.FormFlow.ui.el (textContent only).
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

  // Fallback specs in offline dummy mode
  var BUILTIN_FALLBACK_SPECS = [
    {
      id: 'ssp-karnataka',
      name: 'Karnataka State Scholarship Portal (SSP Post-Matric)',
      photo: { widthPx: 200, heightPx: 230, maxKB: 50, formats: ['jpeg', 'jpg'] },
      signature: { widthPx: 140, heightPx: 60, maxKB: 50, formats: ['jpeg', 'jpg'] },
      verified: true
    },
    {
      id: 'nsp-national',
      name: 'National Scholarship Portal (NSP)',
      photo: { widthPx: 200, heightPx: 230, maxKB: 50, formats: ['jpeg', 'jpg'] },
      signature: { widthPx: 140, heightPx: 60, maxKB: 20, formats: ['jpeg', 'jpg'] },
      verified: true
    },
    {
      id: 'mock-scholarship-portal',
      name: 'FormFlow Mock Scholarship Portal (Hackathon Test Form)',
      photo: { widthPx: 200, heightPx: 200, maxKB: 100, formats: ['jpeg', 'jpg', 'png'] },
      signature: { widthPx: 200, heightPx: 100, maxKB: 50, formats: ['jpeg', 'jpg', 'png'] },
      verified: false
    }
  ];

  /**
   * Renders the Photo and Signature Fixer panel.
   *
   * @param {HTMLElement} container Parent DOM element.
   * @param {Object} ctx Context: { useDummy }
   */
  function renderFixerPanel(container, ctx) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    var specsList = BUILTIN_FALLBACK_SPECS;
    var selectedPortalId = specsList[0].id;
    var selectedMode = 'photo'; // 'photo' | 'signature'
    var currentFile = null;
    var currentOptimizedResult = null;

    var beforePreviewUrl = null;
    var afterPreviewUrl = null;

    function cleanupUrls() {
      if (beforePreviewUrl && root.FormFlow.ui.revokeSafeObjectURL) {
        root.FormFlow.ui.revokeSafeObjectURL(beforePreviewUrl);
        beforePreviewUrl = null;
      }
      if (afterPreviewUrl && root.FormFlow.ui.revokeSafeObjectURL) {
        root.FormFlow.ui.revokeSafeObjectURL(afterPreviewUrl);
        afterPreviewUrl = null;
      }
    }

    // Dynamic containers
    var noticeBox = el('div', null, { class: 'ff-hidden' });
    var statusBox = el('div', null, { class: 'ff-hidden' });
    var previewContainer = el('div', null, { class: 'ff-hidden' });

    function showStatus(msg, isError) {
      statusBox.className = isError ? 'ff-card ff-chip-red' : 'ff-card ff-chip-green';
      statusBox.textContent = msg;
      statusBox.classList.remove('ff-hidden');
    }

    function clearStatus() {
      statusBox.textContent = '';
      statusBox.className = 'ff-hidden';
    }

    function updateNotice() {
      var currentSpec = specsList.find(function (s) { return s.id === selectedPortalId; }) || specsList[0];
      if (currentSpec && currentSpec.verified === false) {
        noticeBox.className = 'ff-card ff-chip-red';
        noticeBox.textContent = 'Notice: This portal specification is unverified by administrators. Please check guidelines.';
        noticeBox.classList.remove('ff-hidden');
      } else {
        noticeBox.textContent = '';
        noticeBox.className = 'ff-hidden';
      }
    }

    // Portal Dropdown
    var portalSelect = el('select', null, {
      class: 'ff-btn',
      id: 'ff-portal-spec-select',
      style: 'width: 100%; margin-bottom: 8px;'
    });

    function populatePortalSelect() {
      while (portalSelect.firstChild) {
        portalSelect.removeChild(portalSelect.firstChild);
      }
      specsList.forEach(function (s) {
        portalSelect.appendChild(el('option', s.name, { value: s.id }));
      });
      portalSelect.value = selectedPortalId;
      updateNotice();
    }

    portalSelect.addEventListener('change', function () {
      selectedPortalId = portalSelect.value;
      updateNotice();
      if (currentFile) {
        processSelectedImage(currentFile);
      }
    });

    // Mode Toggle (Photo vs Signature)
    var photoBtn = el('button', 'Passport Photo', {
      type: 'button',
      class: 'ff-btn ff-btn-primary',
      style: 'flex: 1;'
    });

    var sigBtn = el('button', 'Signature', {
      type: 'button',
      class: 'ff-btn',
      style: 'flex: 1;'
    });

    function setMode(mode) {
      selectedMode = mode;
      if (mode === 'photo') {
        photoBtn.className = 'ff-btn ff-btn-primary';
        sigBtn.className = 'ff-btn';
      } else {
        photoBtn.className = 'ff-btn';
        sigBtn.className = 'ff-btn ff-btn-primary';
      }
      if (currentFile) {
        processSelectedImage(currentFile);
      }
    }

    photoBtn.addEventListener('click', function () { setMode('photo'); });
    sigBtn.addEventListener('click', function () { setMode('signature'); });

    var modeBar = el('div', null, {
      style: 'display: flex; gap: 8px; margin-bottom: 12px;'
    }, [photoBtn, sigBtn]);

    // File input and picker
    var fileInput = el('input', null, {
      type: 'file',
      class: 'ff-hidden',
      id: 'ff-fixer-file-input'
    });

    var chooseBtn = el('button', 'Choose image to optimize', {
      type: 'button',
      class: 'ff-btn ff-btn-primary',
      style: 'width: 100%;'
    });

    chooseBtn.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        currentFile = fileInput.files[0];
        processSelectedImage(currentFile);
      }
    });

    /**
     * Executes image optimization through imageFixer.js.
     * @param {File} file
     */
    function processSelectedImage(file) {
      clearStatus();
      cleanupUrls();
      while (previewContainer.firstChild) {
        previewContainer.removeChild(previewContainer.firstChild);
      }
      previewContainer.classList.add('ff-hidden');

      var currentSpecObj = specsList.find(function (s) { return s.id === selectedPortalId; }) || specsList[0];
      var targetSpec = (selectedMode === 'photo') ? currentSpecObj.photo : currentSpecObj.signature;

      showStatus('Normalizing dimensions and optimizing quality...', false);

      // Create preview URL for original
      if (root.FormFlow.ui.createSafeObjectURL) {
        beforePreviewUrl = root.FormFlow.ui.createSafeObjectURL(file);
      }

      if (root.FormFlow.ui && typeof root.FormFlow.ui.fixImage === 'function') {
        root.FormFlow.ui.fixImage(file, targetSpec).then(function (result) {
          if (!result || result.error) {
            showStatus(result && result.error ? result.error : 'Optimization failed.', true);
            return;
          }

          currentOptimizedResult = result;
          if (root.FormFlow.ui.createSafeObjectURL) {
            afterPreviewUrl = root.FormFlow.ui.createSafeObjectURL(result.blob);
          }

          clearStatus();
          renderComparison(file, result, targetSpec);
        }).catch(function (err) {
          showStatus(err && err.message ? err.message : 'Processing error.', true);
        });
      } else {
        showStatus('Image fixer utility is not initialized.', true);
      }
    }

    /**
     * Renders side-by-side preview comparison and download button.
     * @param {File} original
     * @param {Object} optimized
     * @param {Object} spec
     */
    function renderComparison(original, optimized, spec) {
      while (previewContainer.firstChild) {
        previewContainer.removeChild(previewContainer.firstChild);
      }

      var origKB = Math.round((original.size / 1024) * 10) / 10;

      // Original card
      var origImg = el('img', null, {
        src: beforePreviewUrl,
        alt: 'Original image preview',
        style: 'max-width: 100%; max-height: 120px; border-radius: 4px; display: block; margin: 6px auto;'
      });

      var origCard = el('div', null, { class: 'ff-card', style: 'flex: 1; text-align: center;' }, [
        el('div', 'Original Image', { style: 'font-weight: 600; font-size: 12px;' }),
        origImg,
        el('div', origKB + ' KB', { style: 'font-size: 11px; color: #94a3b8;' })
      ]);

      // Optimized card
      var optImg = el('img', null, {
        src: afterPreviewUrl,
        alt: 'Optimized image preview',
        style: 'max-width: 100%; max-height: 120px; border-radius: 4px; display: block; margin: 6px auto; border: 1px solid #38bdf8;'
      });

      var optCard = el('div', null, { class: 'ff-card', style: 'flex: 1; text-align: center;' }, [
        el('div', 'Optimized (' + selectedMode.toUpperCase() + ')', { style: 'font-weight: 600; font-size: 12px; color: #38bdf8;' }),
        optImg,
        el('div', optimized.widthPx + 'x' + optimized.heightPx + ' px', { style: 'font-size: 11px; color: #f8fafc;' }),
        el('div', optimized.sizeKB + ' KB (max ' + spec.maxKB + ' KB)', { style: 'font-size: 11px; color: #4ade80; font-weight: 600;' })
      ]);

      var comparisonRow = el('div', null, {
        style: 'display: flex; gap: 8px; margin-top: 10px;'
      }, [origCard, optCard]);

      // Download button
      var downloadBtn = el('button', 'Download ' + selectedMode + '.jpg', {
        type: 'button',
        class: 'ff-btn ff-btn-primary',
        style: 'width: 100%; margin-top: 10px;'
      });

      downloadBtn.addEventListener('click', function () {
        if (!optimized || !optimized.blob) return;
        var downloadUrl = URL.createObjectURL(optimized.blob);
        var a = document.createElement('a');
        a.href = downloadUrl;
        a.download = selectedMode + '_' + selectedPortalId + '.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () {
          URL.revokeObjectURL(downloadUrl);
        }, 1000);
      });

      previewContainer.appendChild(comparisonRow);
      previewContainer.appendChild(downloadBtn);
      previewContainer.classList.remove('ff-hidden');
    }

    // Build overall layout
    container.appendChild(el('div', '1. Select Target Portal Specifications', { style: 'font-weight: 600; margin-bottom: 6px;' }));
    container.appendChild(portalSelect);
    container.appendChild(noticeBox);
    container.appendChild(el('div', '2. Select Upload Category', { style: 'font-weight: 600; margin-bottom: 6px;' }));
    container.appendChild(modeBar);
    container.appendChild(chooseBtn);
    container.appendChild(fileInput);
    container.appendChild(statusBox);
    container.appendChild(previewContainer);

    // Fetch real specs from background worker
    if (ctx && ctx.useDummy) {
      specsList = BUILTIN_FALLBACK_SPECS;
      populatePortalSelect();
    } else if (typeof root.FormFlow.sendToBackground === 'function') {
      root.FormFlow.sendToBackground('GET_SPECS').then(function (res) {
        if (res && res.success && res.data && Array.isArray(res.data.specs) && res.data.specs.length > 0) {
          specsList = res.data.specs;
        } else {
          specsList = BUILTIN_FALLBACK_SPECS;
        }
        populatePortalSelect();
      }).catch(function () {
        specsList = BUILTIN_FALLBACK_SPECS;
        populatePortalSelect();
      });
    } else {
      specsList = BUILTIN_FALLBACK_SPECS;
      populatePortalSelect();
    }
  }

  // Expose to window.FormFlow.ui
  root.FormFlow.ui.renderFixerPanel = renderFixerPanel;

  // Support CommonJS testing environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      renderFixerPanel: renderFixerPanel,
      BUILTIN_FALLBACK_SPECS: BUILTIN_FALLBACK_SPECS
    };
  }
})(typeof self !== 'undefined' ? self : this);
