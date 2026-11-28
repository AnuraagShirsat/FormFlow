/**
 * FormFlow - Floating Assistant Widget
 * File: /extension/ui/widget.js
 *
 * Mounts an isolated, accessible, floating UI widget into a closed ShadowRoot.
 * Adheres strictly to the FormFlow interface contract and security guidelines.
 *
 * SECURITY INVARIANTS:
 * - Mounted exclusively in a closed Shadow DOM (mode: 'closed').
 * - Styles applied strictly via adoptedStyleSheets (zero inline styles, zero remote CSS).
 * - All DOM elements built with window.FormFlow.ui.el (textContent only; zero innerHTML).
 * - Deliberate hostile test labels and third-party webpage strings are rendered as inert text.
 * - Never auto-submits any form.
 * - Never logs PII to the browser console.
 */

(function (root) {
  'use strict';

  // Prevent duplicate execution if widget script is re-injected
  if (root.FormFlow && root.FormFlow.__widgetLoaded) {
    return;
  }

  // Ensure FormFlow namespace exists
  root.FormFlow = root.FormFlow || {};
  root.FormFlow.__widgetLoaded = true;

  // Offline demonstration toggle:
  // Reads CONFIG.USE_DUMMY_DATA if available, defaults to false
  var getUseDummyData = function () {
    if (typeof CONFIG !== 'undefined' && typeof CONFIG.USE_DUMMY_DATA === 'boolean') {
      return CONFIG.USE_DUMMY_DATA;
    }
    if (root.CONFIG && typeof root.CONFIG.USE_DUMMY_DATA === 'boolean') {
      return root.CONFIG.USE_DUMMY_DATA;
    }
    return false;
  };

  // DOM creation helper reference
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

  // Internal component state
  var state = {
    isOpen: false,
    activeTab: 'checklist', // 'checklist' | 'fields' | 'upload' | 'review' | 'photo'
    language: 'en', // 'en' | 'kn' | 'hi'
    loading: false,
    errorMessage: '',
    selectedFieldId: null,
    scannedFields: [],
    analysis: null,
    profile: null,
    statusMessage: ''
  };

  // References to mounted DOM containers
  var hostElement = null;
  var shadowRoot = null;
  var panelContainer = null;
  var pillButton = null;
  var pillBadge = null;

  /**
   * Loads analysis and profile data either from offline dummy fixtures or live backend proxy.
   */
  function loadData() {
    state.loading = true;
    state.errorMessage = '';
    render();

    if (getUseDummyData()) {
      // Use offline fixtures matching contract
      var dummy = root.FormFlow.ui.dummy || {};
      state.scannedFields = (typeof root.FormFlow.scanForm === 'function')
        ? root.FormFlow.scanForm()
        : [];
      state.analysis = (dummy.analyzeForm && dummy.analyzeForm[state.language])
        ? dummy.analyzeForm[state.language]
        : { fields: [], requiredDocuments: [] };
      state.profile = dummy.profile || {};
      state.loading = false;
      render();
      return;
    }

    // Live mode: Scan DOM and request analysis from backend proxy via background worker
    var fields = (typeof root.FormFlow.scanForm === 'function')
      ? root.FormFlow.scanForm()
      : [];
    state.scannedFields = fields;

    // Fetch stored profile from background worker
    if (typeof root.FormFlow.getProfile === 'function') {
      root.FormFlow.getProfile().then(function (res) {
        if (res && res.success && res.profile) {
          state.profile = res.profile;
        }
      });
    }

    // Dispatch ANALYZE_FORM request
    if (typeof root.FormFlow.sendToBackground === 'function') {
      root.FormFlow.sendToBackground('ANALYZE_FORM', {
        language: state.language,
        pageTitle: document.title || 'Scholarship Application Form',
        fields: fields
      }).then(function (res) {
        state.loading = false;
        if (res && res.success && res.data) {
          state.analysis = res.data;
        } else {
          var errMsg = (res && res.error && res.error.message)
            ? res.error.message
            : 'Unable to analyze form. Please check that the backend server is running.';
          state.errorMessage = errMsg;
        }
        render();
      }).catch(function () {
        state.loading = false;
        state.errorMessage = 'Network error while contacting form analysis service.';
        render();
      });
    } else {
      state.loading = false;
      state.errorMessage = 'FormFlow content bridge is not initialized.';
      render();
    }
  }

  /**
   * Switches the active language (en, kn, hi) and refreshes field explanations.
   * @param {"en"|"kn"|"hi"} newLang
   */
  function switchLanguage(newLang) {
    if (state.language === newLang) return;
    state.language = newLang;
    state.loading = true;
    state.statusMessage = '';
    render();

    if (getUseDummyData()) {
      var dummy = root.FormFlow.ui.dummy || {};
      if (dummy.analyzeForm && dummy.analyzeForm[newLang]) {
        state.analysis = dummy.analyzeForm[newLang];
      }
      state.loading = false;
      render();
      return;
    }

    // Live backend re-analysis in the selected language
    if (typeof root.FormFlow.sendToBackground === 'function') {
      root.FormFlow.sendToBackground('ANALYZE_FORM', {
        language: newLang,
        pageTitle: document.title || 'Scholarship Application Form',
        fields: state.scannedFields
      }).then(function (res) {
        state.loading = false;
        if (res && res.success && res.data) {
          state.analysis = res.data;
        } else {
          state.errorMessage = (res && res.error && res.error.message)
            ? res.error.message
            : 'Language translation failed.';
        }
        render();
      }).catch(function () {
        state.loading = false;
        state.errorMessage = 'Failed to refresh translations.';
        render();
      });
    }
  }

  /**
   * Clears the student's local profile data ("Clear my data").
   */
  function handleClearProfile() {
    if (typeof root.FormFlow.clearProfile === 'function') {
      root.FormFlow.clearProfile().then(function (res) {
        if (res && res.success) {
          state.profile = null;
          state.statusMessage = 'Profile data cleared from local storage.';
          render();
        }
      });
    } else {
      state.profile = null;
      state.statusMessage = 'Local profile wiped.';
      render();
    }
  }

  /**
   * Builds the Tab List with W3C ARIA accessibility and keyboard navigation.
   * @returns {HTMLElement} The tablist navigation element.
   */
  function buildTabList() {
    var tabs = [
      { id: 'checklist', label: 'Checklist' },
      { id: 'fields', label: 'Fields' },
      { id: 'upload', label: 'Upload' },
      { id: 'review', label: 'Review' },
      { id: 'photo', label: 'Photo' }
    ];

    var tabButtons = [];
    var tabList = el('div', null, {
      class: 'ff-tablist',
      role: 'tablist',
      'aria-label': 'FormFlow Assistant Navigation'
    });

    tabs.forEach(function (t, idx) {
      var isSelected = (state.activeTab === t.id);
      var btn = el('button', t.label, {
        class: 'ff-tab',
        role: 'tab',
        id: 'ff-tab-' + t.id,
        'aria-selected': isSelected ? 'true' : 'false',
        'aria-controls': 'ff-panel-' + t.id,
        tabindex: isSelected ? '0' : '-1'
      });

      btn.addEventListener('click', function () {
        state.activeTab = t.id;
        state.statusMessage = '';
        render();
        btn.focus();
      });

      // W3C ARIA Keyboard Navigation: Left / Right arrow keys move focus and select tabs
      btn.addEventListener('keydown', function (evt) {
        var targetIndex = -1;
        if (evt.key === 'ArrowRight') {
          targetIndex = (idx + 1) % tabs.length;
        } else if (evt.key === 'ArrowLeft') {
          targetIndex = (idx - 1 + tabs.length) % tabs.length;
        } else if (evt.key === 'Home') {
          targetIndex = 0;
        } else if (evt.key === 'End') {
          targetIndex = tabs.length - 1;
        }

        if (targetIndex !== -1) {
          evt.preventDefault();
          state.activeTab = tabs[targetIndex].id;
          state.statusMessage = '';
          render();
          var nextBtn = shadowRoot.getElementById('ff-tab-' + tabs[targetIndex].id);
          if (nextBtn) nextBtn.focus();
        }
      });

      tabButtons.push(btn);
      tabList.appendChild(btn);
    });

    return tabList;
  }

  /**
   * Builds the Checklist View displaying required documents and reasons.
   * @returns {HTMLElement}
   */
  function buildChecklistView() {
    var docs = (state.analysis && state.analysis.requiredDocuments)
      ? state.analysis.requiredDocuments
      : [];

    if (docs.length === 0) {
      return el('div', 'No required documents found for this form.', { class: 'ff-empty' });
    }

    var list = el('div', null, { class: 'ff-checklist' });
    docs.forEach(function (doc) {
      var card = el('div', null, { class: 'ff-card' }, [
        el('div', null, { class: 'ff-card-header' }, [
          el('span', doc.name, { class: 'ff-doc-name' }),
          el('span', 'Required', { class: 'ff-chip ff-chip-green' })
        ]),
        el('div', doc.why, { class: 'ff-card-body' })
      ]);
      list.appendChild(card);
    });

    return list;
  }

  /**
   * Builds the Fields View displaying scanned form fields with expandable details.
   * @returns {HTMLElement}
   */
  function buildFieldsView() {
    var fields = (state.analysis && state.analysis.fields)
      ? state.analysis.fields
      : [];

    if (fields.length === 0) {
      return el('div', 'No form fields detected.', { class: 'ff-empty' });
    }

    var container = el('div', null, { class: 'ff-field-list' });

    fields.forEach(function (field) {
      var isExpanded = (state.selectedFieldId === field.id);
      var explanationText = '';
      if (state.language !== 'en' && field.explanationLocal) {
        explanationText = field.explanationLocal;
      } else if (typeof field.explanation === 'string') {
        explanationText = field.explanation;
      } else if (field.explanation && typeof field.explanation === 'object') {
        explanationText = (state.language !== 'en' && field.explanation.selected)
          ? field.explanation.selected
          : (field.explanation.en || '');
      } else if (state.language !== 'en' && field.explanationSelected) {
        explanationText = field.explanationSelected;
      } else if (field.explanationEn) {
        explanationText = field.explanationEn;
      }

      var header = el('div', null, { class: 'ff-card-header' }, [
        el('span', field.id, { class: 'ff-field-title' }),
        el('span', isExpanded ? '▲' : '▼', { class: 'ff-expand-icon' })
      ]);

      var cardChildren = [header];

      if (isExpanded) {
        var detailBody = el('div', null, { class: 'ff-card-body' }, [
          el('div', explanationText, { class: 'ff-explanation' }),
          el('div', null, { class: 'ff-detail-row' }, [
            el('strong', 'Example: '),
            el('span', field.example || 'N/A')
          ]),
          el('div', null, { class: 'ff-detail-row' }, [
            el('strong', 'Source Document: '),
            el('span', field.sourceDocument || field.document || 'General')
          ])
        ]);
        cardChildren.push(detailBody);
      }

      var card = el('div', null, {
        class: 'ff-card',
        role: 'button',
        tabindex: '0',
        'aria-expanded': isExpanded ? 'true' : 'false'
      }, cardChildren);

      card.addEventListener('click', function () {
        state.selectedFieldId = isExpanded ? null : field.id;
        render();
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          state.selectedFieldId = isExpanded ? null : field.id;
          render();
        }
      });

      container.appendChild(card);
    });

    return container;
  }

  /**
   * Builds the Header containing brand, language switchers, and clear data button.
   * @returns {HTMLElement}
   */
  function buildHeader() {
    var langs = [
      { code: 'en', label: 'EN' },
      { code: 'kn', label: 'KN' },
      { code: 'hi', label: 'HI' }
    ];

    var langButtons = langs.map(function (l) {
      var btn = el('button', l.label, {
        class: 'ff-lang-btn' + (state.language === l.code ? ' ff-lang-active' : ''),
        type: 'button',
        title: 'Switch language to ' + l.label
      });
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        switchLanguage(l.code);
      });
      return btn;
    });

    var clearBtn = el('button', 'Clear my data', {
      class: 'ff-btn ff-btn-danger',
      type: 'button',
      title: 'Wipe stored profile data'
    });
    clearBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      handleClearProfile();
    });

    var closeBtn = el('button', '✕', {
      class: 'ff-btn',
      type: 'button',
      title: 'Close panel',
      'aria-label': 'Close FormFlow panel'
    });
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      state.isOpen = false;
      render();
    });

    var header = el('div', null, { class: 'ff-header' }, [
      el('div', null, { class: 'ff-title' }, [
        el('span', '✨ FormFlow', { class: 'ff-brand' })
      ]),
      el('div', null, { class: 'ff-controls' }, [
        el('div', null, { class: 'ff-lang-group' }, langButtons),
        clearBtn,
        closeBtn
      ])
    ]);

    return header;
  }

  /**
   * Dynamically positions the panel relative to the pill.
   * If the pill is near the top of the viewport (< 560px), opens panel below (.ff-panel-below).
   * If the pill is near the left edge (< 390px), aligns panel to the left (.ff-panel-left).
   */
  function positionPanel() {
    if (!panelContainer || !hostElement) return;
    var rect = hostElement.getBoundingClientRect();
    if (rect.top < 560) {
      panelContainer.classList.add('ff-panel-below');
    } else {
      panelContainer.classList.remove('ff-panel-below');
    }
    if (rect.left < 390) {
      panelContainer.classList.add('ff-panel-left');
    } else {
      panelContainer.classList.remove('ff-panel-left');
    }
  }

  /**
   * Renders the complete widget contents inside the closed ShadowRoot.
   */
  function render() {
    if (!shadowRoot) return;

    // 1. Update Floating Pill
    var fieldCount = (state.analysis && state.analysis.fields) ? state.analysis.fields.length : 0;
    if (pillBadge) {
      pillBadge.textContent = String(fieldCount);
    }

    // 2. Clear and Rebuild Panel
    while (panelContainer.firstChild) {
      panelContainer.removeChild(panelContainer.firstChild);
    }

    // Manage visibility
    if (!state.isOpen) {
      panelContainer.classList.add('ff-hidden');
      return;
    }
    panelContainer.classList.remove('ff-hidden');
    positionPanel();

    // Header
    panelContainer.appendChild(buildHeader());

    // Tab Navigation
    panelContainer.appendChild(buildTabList());

    // Body content
    var body = el('div', null, {
      class: 'ff-body',
      id: 'ff-panel-' + state.activeTab,
      role: 'tabpanel',
      'aria-labelledby': 'ff-tab-' + state.activeTab
    });

    if (state.statusMessage) {
      body.appendChild(el('div', state.statusMessage, { class: 'ff-card ff-chip-green' }));
    }

    if (state.loading) {
      body.appendChild(el('div', 'Loading form guidance...', { class: 'ff-loading' }));
    } else if (state.errorMessage) {
      body.appendChild(el('div', state.errorMessage, { class: 'ff-empty' }));
    } else {
      if (state.activeTab === 'checklist') {
        body.appendChild(buildChecklistView());
      } else if (state.activeTab === 'fields') {
        body.appendChild(buildFieldsView());
      } else if (state.activeTab === 'upload') {
        if (root.FormFlow.ui && typeof root.FormFlow.ui.renderUploadPanel === 'function') {
          root.FormFlow.ui.renderUploadPanel(body, {
            useDummy: getUseDummyData(),
            getProfile: function () {
              return state.profile;
            },
            saveProfile: function (updates) {
              if (typeof root.FormFlow.saveProfile === 'function') {
                return root.FormFlow.saveProfile(updates).then(function (res) {
                  if (res && res.success && res.profile) {
                    state.profile = res.profile;
                  }
                  return res;
                });
              } else {
                state.profile = Object.assign({}, state.profile || {}, updates);
                return Promise.resolve({ success: true, profile: state.profile });
              }
            },
            onProfileChanged: function () {
              if (typeof root.FormFlow.getProfile === 'function') {
                root.FormFlow.getProfile().then(function (res) {
                  if (res && res.success && res.profile) {
                    state.profile = res.profile;
                    if (state.activeTab === 'review') {
                      render();
                    }
                  }
                });
              } else {
                if (state.activeTab === 'review') {
                  render();
                }
              }
            }
          });
        }
      } else if (state.activeTab === 'review') {
        if (root.FormFlow.ui && typeof root.FormFlow.ui.renderReviewPanel === 'function') {
          root.FormFlow.ui.renderReviewPanel(body, {
            getFields: function () {
              return state.scannedFields;
            },
            getProfile: function () {
              return state.profile;
            }
          });
        }
      } else if (state.activeTab === 'photo') {
        if (root.FormFlow.ui && typeof root.FormFlow.ui.renderFixerPanel === 'function') {
          root.FormFlow.ui.renderFixerPanel(body, {
            useDummy: getUseDummyData()
          });
        }
      }
    }

    panelContainer.appendChild(body);
  }

  /**
   * Sets up pointer dragging on the floating pill.
   * @param {HTMLElement} pill The pill button element.
   */
  function setupDragging(pill) {
    var isPointerDown = false;
    var hasMoved = false;
    var startX = 0;
    var startY = 0;
    var initialLeft = 0;
    var initialTop = 0;

    pill.addEventListener('pointerdown', function (e) {
      isPointerDown = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      var rect = hostElement.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      pill.setPointerCapture(e.pointerId);
    });

    pill.addEventListener('pointermove', function (e) {
      if (!isPointerDown) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMoved = true;
        // Position host element dynamically
        hostElement.style.right = 'auto';
        hostElement.style.bottom = 'auto';
        hostElement.style.left = Math.max(12, Math.min(window.innerWidth - 180, initialLeft + dx)) + 'px';
        hostElement.style.top = Math.max(12, Math.min(window.innerHeight - 60, initialTop + dy)) + 'px';
        positionPanel();
      }
    });

    pill.addEventListener('pointerup', function (e) {
      if (!isPointerDown) return;
      isPointerDown = false;
      try {
        pill.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore pointer capture release error
      }

      // If user did not drag, treat as toggle click
      if (!hasMoved) {
        state.isOpen = !state.isOpen;
        render();
      } else {
        positionPanel();
      }
      hasMoved = false;
    });

    pill.addEventListener('pointercancel', function () {
      isPointerDown = false;
      hasMoved = false;
    });
  }

  /**
   * Mounts the widget into document.body inside an isolated closed ShadowRoot.
   * Calling mountWidget() again toggles visibility of the widget panel.
   * Cleans up stray host elements to guarantee only one pill exists.
   *
   * @returns {HTMLElement} The host container attached to document.body.
   */
  function mountWidget() {
    // If widget host already exists and is active, toggle panel visibility
    if (hostElement && shadowRoot && document.body.contains(hostElement)) {
      state.isOpen = !state.isOpen;
      positionPanel();
      render();
      return hostElement;
    }

    // Clean up any stray host elements from prior runs or duplicate injections
    var strayHosts = document.querySelectorAll('#formflow-widget-host, [data-formflow-ui="true"]');
    for (var s = 0; s < strayHosts.length; s++) {
      strayHosts[s].remove();
    }

    // 1. Create host element
    hostElement = el('div', null, {
      id: 'formflow-widget-host',
      'data-formflow-ui': 'true'
    });

    // 2. Attach closed Shadow DOM (mode: 'closed')
    shadowRoot = hostElement.attachShadow({ mode: 'closed' });

    // 3. Adopt styles via adoptedStyleSheets
    if (typeof CSSStyleSheet !== 'undefined' && shadowRoot.adoptedStyleSheets) {
      var sheet = new CSSStyleSheet();
      var cssContent = (root.FormFlow.ui && root.FormFlow.ui.widgetCss)
        ? root.FormFlow.ui.widgetCss
        : '';
      sheet.replaceSync(cssContent);
      shadowRoot.adoptedStyleSheets = [sheet];
    }

    // 4. Create Panel Container
    panelContainer = el('div', null, {
      class: 'ff-panel ff-hidden',
      role: 'dialog',
      'aria-label': 'FormFlow Assistant'
    });

    // 5. Create Floating Pill
    pillBadge = el('span', '0', { class: 'ff-pill-badge' });
    pillButton = el('div', null, {
      class: 'ff-pill',
      role: 'button',
      tabindex: '0',
      'aria-label': 'FormFlow Assistant'
    }, [
      el('span', '✨ FormFlow', { class: 'ff-pill-text' }),
      pillBadge
    ]);

    // Attach dragging and click handlers to the pill
    setupDragging(pillButton);

    // Keyboard trigger on pill
    pillButton.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        state.isOpen = !state.isOpen;
        render();
      }
    });

    // Append containers to shadow root
    shadowRoot.appendChild(panelContainer);
    shadowRoot.appendChild(pillButton);

    // Attach to document body
    document.body.appendChild(hostElement);

    // Initial data load
    loadData();

    return hostElement;
  }

  // Expose to window.FormFlow.mountWidget
  root.FormFlow.mountWidget = mountWidget;

  // Support CommonJS testing environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      mountWidget: mountWidget,
      state: state
    };
  }
})(typeof self !== 'undefined' ? self : this);
