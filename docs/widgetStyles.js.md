# Documentation: `/extension/ui/widgetStyles.js`

## 1. What It Does
`widgetStyles.js` defines the encapsulated visual design system for the FormFlow floating widget. It exports a compact, high-contrast, dark translucent CSS string via `window.FormFlow.ui.widgetCss` (strictly under 150 lines):
- Styles the persistent floating pill button and count badge.
- Styles the collapsible modal dialog panel with backdrop blur effects.
- Supports adaptive panel positioning through `.ff-panel-below` (opens downward when pill is near the top of the viewport) and `.ff-panel-left` (aligns left when pill is near the left edge).
- Styles review status chips across all three contract states: `.ff-chip-green`, `.ff-chip-amber`, and `.ff-chip-red`.
- Implements accessible focus rings and typography supporting English, Kannada, and Devanagari.

---

## 2. How It Works Technically
- **Constructable Stylesheets:** The CSS string is compiled into a native `CSSStyleSheet` object using `sheet.replaceSync()` and bound to the closed ShadowRoot with `shadowRoot.adoptedStyleSheets = [sheet]`.
- **CSS Isolation (`:host`):** Starts with `:host { all: initial; }` to shield widget elements from host page CSS resets, font styles, and color rules.
- **Adaptive Positioning Modifiers:**
  - `.ff-panel.ff-panel-below`: Overrides default upward placement with `bottom: auto !important; top: calc(100% + 12px) !important;`.
  - `.ff-panel.ff-panel-left`: Overrides default right alignment with `right: auto !important; left: 0 !important;`.
- **Three-Tier Status Chips:**
  - Green (`.ff-chip-green`): High confidence match (`#4ade80`).
  - Amber (`.ff-chip-amber`): Medium confidence / needs review (`#fbbf24`).
  - Red (`.ff-chip-red`): Missing / low confidence (`#f87171`).
- **Zero Remote Dependencies:** Zero `@import`, zero external Google Fonts, and zero remote asset fetches, adhering to Chrome MV3 Content Security Policy.

---

## 3. Judge Questions with Short Answers

**Q: How do the `.ff-panel-below` and `.ff-panel-left` styles support draggable positioning?**  
**A:** By default, `.ff-panel` uses `bottom: calc(100% + 12px); right: 0;` to open above and align right from the pill. When dragged to the top of the viewport or near the left edge, `.ff-panel-below` and `.ff-panel-left` cleanly flip placement to `top: calc(100% + 12px)` and `left: 0`, preventing off-screen overflow.

**Q: What styles are provided for the new amber review status?**  
**A:** `.ff-chip-amber` applies a high-contrast amber translucent pill (`background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4);`) indicating fields requiring user verification before approval.

**Q: Can styles inside widgetStyles.js pollute or alter the host scholarship webpage?**  
**A:** No. All styles are attached exclusively to the closed `ShadowRoot` via `adoptedStyleSheets`. Shadow DOM encapsulation prevents any FormFlow rules from leaking into or altering the outer webpage's layout.

---

## 4. What to Know Before the Judges
- **WCAG High Contrast:** Chip colors deliver AAA contrast ratios on dark translucent backgrounds.
- **Strict Size Constraint:** The entire CSS ruleset is under 110 lines of code, minimizing memory and execution overhead.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Zero Remote CSS:** Audited for `@import`, `url()`, or external font references; zero remote calls found.
- **Adopted Stylesheet Verification:** Verified that styles are attached via `adoptedStyleSheets` without creating inline `<style>` nodes.
- **Adaptive Positioning Verification:** Verified that `.ff-panel-below` and `.ff-panel-left` properly position the panel without clipping.

### Judge Security Questions & Answers:
**Q: Can a malicious form page hijack or inspect FormFlow's adoptedStyleSheets?**  
**A:** No. `adoptedStyleSheets` on a `mode: 'closed'` ShadowRoot cannot be accessed or queried from the host document.

**Q: How does the stylesheet defend against CSS injection?**  
**A:** The CSS string contains zero dynamic string interpolations or user-supplied variables. It is static and compiled once via `replaceSync()`.
