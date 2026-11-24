# Documentation: `/extension/ui/uploadChecks.js`

## 1. What It Does
`uploadChecks.js` provides pre-flight client-side security verification for documents uploaded to FormFlow (such as Aadhaar cards, income certificates, marksheets, photos, and signatures). It exposes `window.FormFlow.ui.checkUpload(file)`, which returns a Promise resolving to `{ ok: true }` or `{ ok: false, message: string }`. It rejects oversized, fake, or corrupted files before they consume upload bandwidth, proxy resources, or Gemini Vision quota.

---

## 2. How It Works Technically
- **File Presence & Size Validation:** Ensures the uploaded file exists, is non-empty, and does not exceed the strict 5 MB (`5 * 1024 * 1024` bytes) threshold.
- **Magic Number Inspection:** Slices the first 8 bytes of the file and reads them as an `ArrayBuffer` via `FileReader`. It verifies true binary file signatures, ignoring potentially spoofed `file.name` or `file.type` headers:
  - **JPEG:** First 3 bytes match `0xFF 0xD8 0xFF`.
  - **PNG:** First 4 bytes match `0x89 0x50 0x4E 0x47` (`\x89PNG`).
  - **PDF:** First 4 bytes match `0x25 0x50 0x44 0x46` (`%PDF`).
- **Image Decodability Test:** For JPEG and PNG files, the script tests whether the browser's graphics rendering pipeline can decode the image using `createImageBitmap(file)`. If the file contains truncated byte sequences, malformed chunks, or zero-dimension headers, the promise catches the error and rejects the file. Bitmaps are promptly closed via `bitmap.close()` to prevent memory leaks.
- **Defense-in-Depth Invariant:** While client checks provide immediate, friendly UI feedback and protect network bandwidth, the backend Node proxy independently re-validates payload bounds, base64 structure, and file integrity before dispatching to the Gemini API.

---

## 3. Judge Questions with Short Answers

**Q: Why inspect binary magic numbers instead of checking file.type or the file extension?**  
**A:** `file.type` and file extensions are easily spoofed: renaming an executable or malicious script from `payload.exe` to `id_card.jpg` fools standard browser `accept` attributes. Reading the raw first bytes (`FF D8 FF`, `89 50 4E 47`, `25 50 44 46`) proves the file's authentic binary header.

**Q: Why use createImageBitmap on the client before uploading?**  
**A:** A file can have valid header bytes but contain truncated or corrupted image streams. Testing decodability with `createImageBitmap` ensures that only well-formed images reach our backend proxy and Gemini Vision, eliminating wasted API costs and failed extractions.

**Q: Does the backend proxy trust the client's validation?**  
**A:** Never. Client validation is purely for instant user feedback and bandwidth conservation. The backend proxy (`/extract-document`) independently inspects payload size, MIME types, and base64 structure under zero-trust principles.

---

## 4. What to Know Before the Judges
- **Friendly Student Feedback:** Error messages are concise and helpful (e.g., "File exceeds maximum allowed size of 5 MB", "Unsupported file type. Please upload a JPEG, PNG, or PDF document", "Image file is corrupt and cannot be decoded").
- **Covers All Scholarship Artifacts:** Supports both single-page PDF records (standard for government income/caste certificates) and JPEG/PNG photos (standard for marks cards and identity cards).
- **Zero External Dependencies:** Implemented using native Web APIs (`FileReader`, `Uint8Array`, `createImageBitmap`), requiring no external npm packages or build pipeline.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Spoofed Extension Defense:** Magic byte verification ensures `.exe`, `.html`, or binary scripts disguised as `.jpg` are rejected immediately.
- **Resource Exhaustion Defense:** Rejection of files larger than 5 MB prevents memory spikes and base64 inflation in the service worker.
- **Memory Management:** Immediate closure of decoded bitmaps via `bitmap.close()` prevents browser tab memory bloat.
- **No Evaluation or Execution:** Uploaded files are read purely as binary array buffers; they are never executed or rendered into the active webpage DOM.

### Judge Security Questions & Answers:
**Q: What prevents an attacker from uploading a polyglot file (e.g., a file that is both valid JPEG and HTML)?**  
**A:** FormFlow only extracts text from images via Gemini Vision; it never writes uploaded files to the webpage DOM or executes them as HTML. Even if a polyglot passed header inspection, it is serialized into base64 and routed exclusively to our private vision model backend.

**Q: What happens if createImageBitmap is not supported in an older environment?**  
**A:** The script checks `typeof createImageBitmap === 'function'`. If unavailable, it gracefully falls back to magic byte verification without throwing unhandled exceptions.
