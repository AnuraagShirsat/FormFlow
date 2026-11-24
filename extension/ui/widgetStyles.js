/**
 * FormFlow - Isolated Shadow DOM Widget Stylesheet
 * File: /extension/ui/widgetStyles.js
 *
 * Provides dark translucent, high-contrast styles for the FormFlow floating widget.
 * Applied strictly via `new CSSStyleSheet().replaceSync()` and `shadowRoot.adoptedStyleSheets`.
 * Contains zero remote imports, zero inline style requirements, and supports Kannada and Devanagari.
 */

(function (root) {
  'use strict';

  // Ensure FormFlow and UI namespaces exist
  root.FormFlow = root.FormFlow || {};
  root.FormFlow.ui = root.FormFlow.ui || {};

  // FormFlow isolated Shadow DOM CSS (strictly under 150 lines)
  var widgetCss = [
    ':host {',
    '  all: initial;',
    '  position: fixed;',
    '  z-index: 2147483647;',
    '  bottom: 24px;',
    '  right: 24px;',
    '  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Kannada", "Noto Sans Devanagari", sans-serif;',
    '  font-size: 14px;',
    '  color: #f8fafc;',
    '  line-height: 1.5;',
    '  box-sizing: border-box;',
    '}',
    '*, *::before, *::after { box-sizing: border-box; }',
    '.ff-pill {',
    '  display: flex; align-items: center; gap: 8px; background: rgba(15, 23, 42, 0.90);',
    '  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: #f8fafc;',
    '  border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; padding: 10px 18px;',
    '  font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);',
    '  user-select: none; touch-action: none; transition: transform 0.15s ease, background 0.2s ease;',
    '}',
    '.ff-pill:hover { background: rgba(30, 41, 59, 0.96); border-color: #38bdf8; transform: translateY(-1px); }',
    '.ff-pill-badge { background: #38bdf8; color: #0f172a; border-radius: 9999px; padding: 2px 8px; font-size: 11px; font-weight: 700; }',
    '.ff-panel {',
    '  position: absolute; bottom: calc(100% + 12px); right: 0; width: 380px; max-width: calc(100vw - 32px);',
    '  max-height: 540px; background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(16px);',
    '  -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.18);',
    '  border-radius: 14px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55); display: flex; flex-direction: column;',
    '  overflow: hidden;',
    '}',
    '.ff-hidden { display: none !important; }',
    '.ff-header {',
    '  display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;',
    '  border-bottom: 1px solid rgba(255, 255, 255, 0.12); background: rgba(30, 41, 59, 0.6);',
    '  flex: 0 0 auto;',
    '}',
    '.ff-title { font-size: 15px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px; }',
    '.ff-controls { display: flex; align-items: center; gap: 6px; }',
    '.ff-tablist {',
    '  display: flex; gap: 4px; padding: 8px 12px; background: rgba(15, 23, 42, 0.7);',
    '  border-bottom: 1px solid rgba(255, 255, 255, 0.1); overflow-x: auto;',
    '  flex: 0 0 auto; min-height: 44px; scrollbar-width: none;',
    '}',
    '.ff-tablist::-webkit-scrollbar { display: none; }',
    '.ff-tab {',
    '  background: transparent; color: #94a3b8; border: none; border-radius: 6px; padding: 10px 12px;',
    '  font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;',
    '  flex: 1 1 auto;',
    '}',
    '.ff-tab:hover { color: #f1f5f9; background: rgba(255, 255, 255, 0.08); }',
    '.ff-tab[aria-selected="true"] { color: #0f172a; background: #38bdf8; }',
    '.ff-body { padding: 14px 16px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }',
    '.ff-card {',
    '  background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;',
    '  padding: 10px 12px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease;',
    '}',
    '.ff-card:hover { background: rgba(51, 65, 85, 0.8); border-color: rgba(56, 189, 248, 0.5); }',
    '.ff-card-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: #f8fafc; font-size: 13px; }',
    '.ff-card-body { font-size: 12px; color: #cbd5e1; margin-top: 6px; line-height: 1.45; }',
    '.ff-detail-row { margin-top: 4px; font-size: 11px; color: #94a3b8; }',
    '.ff-detail-row span { color: #f1f5f9; font-weight: 500; }',
    '.ff-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; }',
    '.ff-chip-green { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.4); }',
    '.ff-chip-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); }',
    '.ff-btn {',
    '  background: rgba(51, 65, 85, 0.8); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.2);',
    '  border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s ease;',
    '}',
    '.ff-btn:hover { background: rgba(71, 85, 105, 1); border-color: #38bdf8; }',
    '.ff-btn-primary { background: #38bdf8; color: #0f172a; border-color: #38bdf8; }',
    '.ff-btn-primary:hover { background: #0ea5e9; }',
    '.ff-btn-danger { background: rgba(239, 68, 68, 0.25); color: #fca5a5; border-color: rgba(239, 68, 68, 0.5); }',
    '.ff-btn-danger:hover { background: rgba(239, 68, 68, 0.5); color: #fff; }',
    '.ff-lang-btn {',
    '  background: rgba(30, 41, 59, 0.8); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.15);',
    '  border-radius: 4px; padding: 3px 7px; font-size: 11px; font-weight: 700; cursor: pointer;',
    '}',
    '.ff-lang-btn.ff-lang-active { background: #38bdf8; color: #0f172a; border-color: #38bdf8; }',
    'button:focus-visible, [tabindex]:focus-visible { outline: 2px solid #38bdf8 !important; outline-offset: 2px !important; }',
    '.ff-loading, .ff-empty { display: flex; align-items: center; justify-content: center; padding: 32px 16px; color: #94a3b8; font-size: 13px; text-align: center; }'
  ].join('\n');

  // Expose to window.FormFlow.ui.widgetCss
  root.FormFlow.ui.widgetCss = widgetCss;

  // Support CommonJS testing environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = widgetCss;
  }
})(typeof self !== 'undefined' ? self : this);
