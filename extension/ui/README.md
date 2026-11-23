# Extension UI (/extension/ui)

**Owner:** Himani

## Scope & Responsibilities
- Floating widget injected into scholarship/government form pages using isolated Shadow DOM.
- Multilingual explanations for scanned form fields (English, Kannada, Hindi).
- Document upload and scanning checklist interface.
- Verification and review screen (green = matched, red = missing or low confidence).
- UI safety: Strict adherence to DOM manipulation via safe DOM APIs (`textContent`, `createElement`), zero use of `innerHTML`.
