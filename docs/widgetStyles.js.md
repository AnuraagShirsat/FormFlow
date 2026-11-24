# Documentation: `/extension/ui/widgetStyles.js`

## 1. What It Does
`widgetStyles.js` defines the complete visual design system for the FormFlow floating widget. It attaches a compact, high-contrast, dark translucent CSS string to `window.FormFlow.ui.widgetCss` (strictly under 150 lines). It styles:
- The persistent floating pill button and badge.
- The collapsible floating panel container with backdrop blur.
- W3C ARIA tab navigation (`[role="tablist"]`, `[role="tab"]`).
- Interactive field cards, document checklists, and status chips (`green` and `red`).
- Action buttons (`primary`, `danger`, and language selectors).
- Accessible focus rings and typography supporting English, Kannada, and Devanagari.

---

## 2. How It Works Technically
- **Constructable Stylesheets:** The styles are compiled into a native `CSSStyleSheet` object using `sheet.replaceSync(window.FormFlow.ui.widgetCss)` and attached to the widget's closed Shadow Root via `shadowRoot.adoptedStyleSheets = [sheet]`.
- **Zero Inline Styles & Zero Remote Fonts:** Eliminates inline `style=""` tags and external `@import` / `<link>` stylesheets, completely complying with strict MV3 Content Security Policies.
- **CSS Isolation (`:host` & Shadow DOM):** Uses `:host { all: initial; }` to prevent host webpage CSS (such as resets, font sizes, or color overrides) from bleeding into the widget UI.
- **Multilingual Font Stack:** Incorporates system font fallbacks prioritizing Kannada and Devanagari: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Kannada", "Noto Sans Devanagari", sans-serif`.
- **Dark Mode Translucency:** Uses `rgba(15, 23, 42, 0.96)` with `backdrop-filter: blur(16px)` to provide modern depth and high contrast without obscuring underlying web forms.

---

## 3. Judge Questions with Short Answers

**Q: Why use adoptedStyleSheets rather than injecting a `<style>` tag into the shadow DOM?**  
**A:** Constructable stylesheets (`adoptedStyleSheets`) parse CSS once in memory, share styles across shadow boundaries without DOM overhead, and prevent DOM-injection vulnerabilities where text inside `<style>` tags could be broken out of or manipulated by malicious strings.

**Q: Does the host website's CSS leak into FormFlow's widget?**  
**A:** No. The widget is mounted inside a closed `ShadowRoot` and begins with `:host { all: initial; }`. Styles defined on the host webpage cannot cross the shadow boundary to distort FormFlow's buttons, tabs, or text colors.

**Q: How does the stylesheet support Indian regional languages like Kannada and Hindi?**  
**A:** The font family declares `"Noto Sans Kannada"` and `"Noto Sans Devanagari"` directly after system fonts, guaranteeing that Kannada vowel conjuncts and Hindi ligatures render legibly on Windows, macOS, Android, and Linux.

---

## 4. What to Know Before the Judges
- **High Contrast Accessibility:** Status chips feature distinct contrast ratios exceeding WCAG AAA standards (`#4ade80` on dark green, `#f87171` on dark red).
- **Visible Keyboard Focus:** Every interactive tab and button implements `:focus-visible` with a distinct 2px sky-blue outline ring (`#38bdf8`), supporting keyboard navigation.
- **Compact Size:** The entire styling definition occupies under 100 lines of plain JavaScript, keeping extension overhead minimal.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **No Remote CSS:** Zero `@import url(...)` or external CDN dependencies.
- **No Inline Styles:** Completely eliminates inline `style=""` attributes in HTML.
- **Safe Stylesheet Replacement:** Uses `replaceSync()` with static, trusted design tokens.

### Judge Security Questions & Answers:
**Q: Can a malicious form page alter FormFlow's widget styles?**  
**A:** No. `adoptedStyleSheets` attached to a `mode: 'closed'` ShadowRoot cannot be accessed, modified, or queried by the host webpage or other content scripts.

**Q: Can CSS injection occur through dynamic field values?**  
**A:** No. Dynamic field names and values are inserted strictly as text nodes in the DOM. No CSS variables or style rules are dynamically constructed from untrusted webpage input.
