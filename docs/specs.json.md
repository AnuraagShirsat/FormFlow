# Photo and Signature Spec Registry Documentation (`/extension/filler/specs.json`)

## 1. What it does
`specs.json` is the central registry of official photo and signature upload constraints across key Indian scholarship and examination portals. It provides exact technical constraints including:
- **Identifier** (`id`): Portal slug (e.g., `ssp-karnataka`, `nsp-national`, `nta-jeemain`, `upsc-online`, `ibps-exam`, `ssc-cgl`).
- **Photo Requirements**: Required dimensions (`widthPx`, `heightPx`), file size ceiling (`maxKB`), and accepted MIME types / image extensions (`formats`).
- **Signature Requirements**: Required dimensions (`widthPx`, `heightPx`), file size ceiling (`maxKB`), and accepted MIME types / image extensions (`formats`).
- **Audit Metadata**: `sourceUrl` pointing to the official government notification or portal, `lastVerified` date, verification flag (`verified: true/false`), and explanatory notes.

This file is consumed directly by Himani's photo & signature fixer tool in `/extension/ui/fixer.js`, enabling the extension to automatically resize, crop, recompress, and convert files into the exact format mandated by the targeted form without user trial-and-error.

---

## 2. How it works technically
- **Standardized JSON Schema**:
  ```json
  [
    {
      "id": "ssp-karnataka",
      "name": "Karnataka State Scholarship Portal (SSP Post-Matric)",
      "photo": {
        "widthPx": 200,
        "heightPx": 230,
        "maxKB": 50,
        "formats": ["jpeg", "jpg"]
      },
      "signature": {
        "widthPx": 140,
        "heightPx": 60,
        "maxKB": 50,
        "formats": ["jpeg", "jpg"]
      },
      "sourceUrl": "https://ssp.postmatric.karnataka.gov.in",
      "lastVerified": "2026-11-20",
      "verified": true,
      "notes": "..."
    }
  ]
  ```
- **Strict Verification Protocol**:
  - `verified: true`: Specs were directly checked against official government gazettes, applicant user guides, or active portal upload validation rules (e.g., SSP Karnataka, NSP, NTA, UPSC, IBPS, SSC).
  - `verified: false`: Explicitly marked as a **placeholder** (e.g., `mock-scholarship-portal` for the hackathon test page, and `generic-default` for unrecognized portals). No speculative or invented values are ever marked as verified.
- **Client-Side Image Manipulation**: The fixer widget reads this registry, inspects `window.location.hostname` or the active form's identifier, selects the matching spec entry, and performs client-side canvas-based scaling and JPEG quality adjustment to produce compliant binaries under `maxKB`.

---

## 3. Judge questions with short answers

**Q: Where did you get the numbers for dimensions and file sizes?**  
**A:** All verified entries (`verified: true`) come directly from official government portal notifications, bulletins, and candidate guidelines (e.g., SSP Karnataka Post-Matric user manual, NTA JEE Main information bulletin, UPSC OTR instructions). The links are documented in the `sourceUrl` property.

**Q: What happens if a student is on a portal not listed in `specs.json`?**  
**A:** The extension falls back to `generic-default` (which uses the standard Indian government 200×230 px photo at <50 KB and 140×60 px signature at <30 KB), while alerting the user that the portal uses fallback specifications.

**Q: How does Himani's fixer use this data?**  
**A:** Himani's fixer reads `photo` and `signature` constraints for the detected portal. When a student selects their photo, it uses an HTML5 canvas to resize to `widthPx` × `heightPx`, iteratively compresses the JPEG quality until the resulting byte size is strictly beneath `maxKB`, and displays a side-by-side before/after preview.

---

## 4. What to know before the judges
- Indian government portals are notorious for strict client-side validation: if a photo is 51 KB instead of 50 KB or 201×231 px instead of 200×230 px, the form silently fails or rejects the upload. `specs.json` solves this major student pain point.
- Only verified portals have `verified: true`. The mock portal (`mock-scholarship-portal`) is clearly marked `verified: false` and identified as a hackathon test harness.
- This registry is stored locally in the extension bundle — zero remote network latency and 100% offline functionality.

---

## 5. Security checks done and judge questions about security

### Security Checks Done:
- [x] **No Untrusted Dynamic URLs**: All `sourceUrl` targets point to official `.gov.in` and `.nic.in` domains.
- [x] **Strict Type Whitelisting**: `formats` arrays allow only safe, non-executable raster formats (`jpeg`, `jpg`, `png`). No executable, vector SVG, or scriptable MIME types are permitted.
- [x] **Bound Limits**: Dimension limits (`widthPx`, `heightPx`) and file size ceilings (`maxKB`) are bounded, preventing client-side canvas memory exhaustion attacks (e.g. allocating billion-pixel canvases).

### Judge Questions on Security:
**Q: Could an attacker inject an SVG or malicious image format into `specs.json`?**  
**A:** No. `specs.json` is a static file packaged inside the read-only extension package. It whitelists only standard raster formats (`jpeg`, `jpg`, `png`). SVGs are deliberately omitted to eliminate SVG-based XSS vectors.

**Q: Does `specs.json` collect or transmit any user photo data?**  
**A:** No. `specs.json` contains static metadata only. All photo and signature resizing happens completely in-memory inside the student's browser within the extension sandbox; images are never sent to our backend or any third-party server.
