# Documentation: `/extension/ui/imageFixer.js`

## 1. What It Does
`imageFixer.js` is the core image processing utility in FormFlow. It exposes `window.FormFlow.ui.fixImage(file, spec)`, which normalizes student passport photos and scanned signatures to match strict government portal upload criteria. It guarantees that:
- Images are center-cropped to exact portal pixel dimensions (`widthPx` x `heightPx`) without stretching or distortion.
- Compression quality is dynamically adjusted to ensure final file size falls below `maxKB`.
- Metadata and hidden payloads (EXIF GPS data, device identifiers) are stripped by re-encoding through an HTML5 Canvas.
- Memory is strictly managed via safe object URL creation and revocation helpers.

---

## 2. How It Works Technically
- **Pre-Flight File Screening:** Before decoding, calls `window.FormFlow.ui.checkUpload(file)` to verify size bounds and authentic binary magic numbers (JPEG/PNG).
- **Proportional Center-Cropping (Anti-Stretching):**
  - Calculates source aspect ratio `srcW / srcH` and target aspect ratio `targetW / targetH`.
  - If the source is wider than target: preserves full height, crops horizontal sides symmetrically (`(srcW - cropW) / 2`).
  - If the source is taller than target: preserves full width, crops top and bottom symmetrically (`(srcH - cropH) / 2`).
  - Renders pixels onto an in-memory `<canvas>` initialized with a neutral white background (`#FFFFFF`) to cleanly support transparent PNG signatures.
- **Progressive Compression Optimization:**
  - Iterates through quality steps: `[0.92, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35]`.
  - Converts canvas pixels to JPEG via `canvas.toBlob(callback, 'image/jpeg', q)`.
  - Measures resulting byte size; resolves immediately on the highest quality step where `sizeKB <= spec.maxKB`.
  - If the image cannot reach `spec.maxKB` without unacceptable quality loss, resolves with a descriptive error.
- **Tracked Object URL Helpers:**
  - `createSafeObjectURL(blob)` stores generated URLs in an internal `Set`.
  - `revokeSafeObjectURL(url)` and `revokeAllSafeObjectURLs()` ensure temporary preview URLs are cleanly revoked to avoid browser tab memory bloat.

---

## 3. Judge Questions with Short Answers

**Q: Why re-encode images through an HTML5 canvas rather than resizing on the backend?**  
**A:** Client-side canvas processing operates completely offline without uploading high-resolution personal photos to remote servers. Drawing pixels to a canvas and exporting a new JPEG strictly discards all EXIF metadata (camera serial numbers, geolocation, timestamps), protecting student privacy while saving server bandwidth.

**Q: How does the fixer ensure photos are not stretched or distorted?**  
**A:** It computes aspect ratios and uses center-cropping. It scales the image proportionally and crops excess pixels from the edges, guaranteeing the student's face or signature maintains its natural aspect ratio.

**Q: What happens if an image is too blurry or cannot be compressed under the portal's KB limit?**  
**A:** The quality loop steps down to `0.35`. If the image remains above `spec.maxKB`, it returns a clean error explaining that the file cannot meet the portal's size limit without excessive degradation, prompting the user to upload a cleaner source file.

---

## 4. What to Know Before the Judges
- **Covers All Portal Specifications:** Works seamlessly with specifications from SSP Karnataka (200x230, 50KB), NSP, NTA JEE Main (350x450, 200KB), UPSC (350x350, 300KB), and bank portals.
- **Biometric Privacy:** Biometric photo pixels never leave the student's local machine; they are processed ephemerally in RAM and downloaded directly by the student.
- **Zero Dependencies:** Pure vanilla JavaScript utilizing native Web APIs (`HTMLCanvasElement`, `Blob`, `URL.createObjectURL`).

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **EXIF Stripping:** Removing EXIF metadata strips sensitive geolocation coordinates and device fingerprints.
- **Steganography Neutralization:** Re-rasterizing image pixels neutralizes polyglot payloads and script tags hidden inside image comments or padding bytes.
- **Memory Leak Protection:** Preview URLs are registered and explicitly revoked via `revokeSafeObjectURL()`.

### Judge Security Questions & Answers:
**Q: Could a malicious image crash the browser or trigger an exploit in canvas.toBlob?**  
**A:** No. Pre-flight checks (`uploadChecks.js`) verify that the browser can decode the image structure before canvas drawing commences. Canvas rasterization executes within standard browser sandboxes.

**Q: Are processed photos or signatures saved in local storage or sync storage?**  
**A:** No. `imageFixer.js` never writes binary blobs to `chrome.storage.local` or cookies. The output is provided as an in-memory `Blob` for immediate preview and user-initiated download.
