# FormFlow — Integration Checklist

Code-review date: 2026-11-24  
Reviewer: Frontend engineer (UI owner)  
Backend proxy assumed at `localhost:5000`. `USE_DUMMY_DATA = false`.

> [!NOTE]
> "Works" means the full code path is traceable and correct from source alone.  
> "Needs manual test" means the code path is correct but the outcome depends on a running backend, browser APIs, or hardware that cannot be verified by reading code.

---

## Checklist

| # | Step | Works | Broken | Needs manual test | Notes |
|---|------|:-----:|:------:|:-----------------:|-------|
| 1 | **Load extension** | | | ✓ | `manifest.json` is valid MV3 JSON with correct permissions (`scripting`, `activeTab`, `storage`). Actual installation and browser acceptance requires a live browser. |
| 2 | **Toolbar click shows widget** | ✓ | | | `chrome.action.onClicked` → `chrome.scripting.executeScript` injects candidate scripts quietly → sends `TOGGLE_WIDGET` → `content.js` calls `window.FormFlow.mountWidget()`. Closed ShadowRoot created once; pill toggled on repeat clicks. |
| 3 | **Scan** | ✓ | | | `window.FormFlow.scanForm()` traverses the live DOM, open shadow roots, and same-origin iframes. Skips `password` and `hidden` inputs. Field cap: 100. Returns `{ fields, pageTitle }`. |
| 4 | **Analyze — English** | | | ✓ | Code path: `sendToBackground('ANALYZE_FORM', { language:'en', … })` → background proxy → backend. Client-side wiring is correct. Result depends on a running backend. See Known Issues §1 for backend schema mismatch. |
| 5 | **Analyze — Kannada (kn)** | | | ✓ | Same path as English with `language:'kn'`. `widget.js` selects the `kn` dummy-data locale when `USE_DUMMY_DATA = true`. |
| 6 | **Analyze — Hindi (hi)** | | | ✓ | Same path as English with `language:'hi'`. `widget.js` selects the `hi` dummy-data locale when `USE_DUMMY_DATA = true`. |
| 7 | **Checklist tab** | ✓ | | | Reads `state.analysis.requiredDocuments`; builds list via `domUtil.el()` with `textContent` only. No network call. Renders correctly from both dummy and live analysis response shapes. |
| 8 | **Upload fake document** | | | ✓ | `checkUpload` pre-flight (magic bytes, 5 MB, MIME, `createImageBitmap` for images) is correct in code. Base64 encoding and `EXTRACT_DOCUMENT` dispatch are correct. Actual server-side extraction needs a live backend. |
| 9 | **Review — green and red items** | ✓ | | | `createFillPlan(fields, profile)` → `renderReviewPanel`. Green chip when `confidence >= 0.5`. Red chip when `profileKey` is `null` or confidence is low; `reason` shown in plain text. `null` profileKey is handled safely (no crash). |
| 10 | **Edit a value in Review** | ✓ | | | `input` event listener writes to a local `localPlan` copy only. Profile is not mutated. Status chip updates to green / "Edited" immediately. |
| 11 | **Fill form** | ✓ | | | "Fill form" button calls `window.FormFlow.fillFields(approvedPlan)` from `filler.js`. Response `{ filledCount, success }` shown in summary. `canUndo()` checked before enabling Undo button. |
| 12 | **Undo fill** | ✓ | | | `window.FormFlow.undoFill()` → `{ restoredCount, success }`. Button disabled when `canUndo()` returns `false` (snapshot absent). `showSummary` called with result. |
| 13 | **Hostile label shown as plain text** | ✓ | | | `domUtil.el()` sets text exclusively via `textContent`. The hostile field `<img src=x onerror=alert(1)>` from `mock-form/index.html` renders as the literal string; no HTML is parsed, no event fires. |
| 14 | **Fake `.exe` renamed `.jpg` rejected** | ✓ | | | `uploadChecks.js` reads the first 4 bytes and matches magic numbers (`FF D8 FF` JPEG, `89 50 4E 47` PNG, `25 50 44 46` PDF). An `.exe` (MZ header `4D 5A`) does not match any allowed signature → rejected with "Unsupported file type". `file.name` and `file.type` are never trusted. |
| 15 | **Photo fixer output under size limit** | | | ✓ | `imageFixer.js` quality ladder (0.92 → 0.85 → 0.75 → 0.65 → 0.55 → 0.45 → 0.35) is correct in code. Whether the final JPEG actually fits within `spec.maxKB` for a given real image depends on browser canvas implementation — needs manual test. |
| 16 | **Clear my data** | ✓ | | | Header button → `window.FormFlow.clearProfile()` → `sendToBackground('CLEAR_PROFILE')` → `chrome.storage.local.remove(['formflow_profile'])` → returns `{ success: true }`. UI state is reset to empty profile. |

---

## Known Issues

### 1. Backend `analyzeForm` response schema mismatch — **Owner: Ivan (Backend Engineer)**

| Field | Contract (`contract.json`) | Backend (`backend/routes/analyzeForm.js`) |
|---|---|---|
| Field explanation | `explanation: string` | `explanation: { en: string, selected: string }` |
| Localised explanation | `explanationLocal: string` | *(absent)* |
| Source document | `sourceDocument: string` | `document: string` |

**Impact:** `widget.js` has defensive parsing to handle both formats (added in Task 6), so the UI does not crash, but the backend is out of contract. Ivan must align the response with `/contracts/contract.json`.

### 2. Live backend required when `USE_DUMMY_DATA = false`

`USE_DUMMY_DATA` is currently `false`. The Analyze and Extract Document flows require the Node proxy to be running at `localhost:5000`. When the proxy is unavailable the widget shows the error message from the `{ success: false, error }` envelope — no crash, but no data either. Developers testing offline should temporarily set `USE_DUMMY_DATA = true` in `widget.js`.

### 3. `GET_SPECS` only accessible from the background service worker

`filler/specs.json` is not listed in `web_accessible_resources` (by design — it would otherwise be readable by any website). `GET_SPECS` is served via `fetch(chrome.runtime.getURL('filler/specs.json'))` from inside the background worker and returned over the message channel. This works correctly, but it means content scripts cannot fetch the file directly; they must always go through `sendToBackground('GET_SPECS')`.
