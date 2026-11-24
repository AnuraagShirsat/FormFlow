/**
 * FormFlow - Client-Side Document Upload Validator
 * File: /extension/ui/uploadChecks.js
 *
 * Provides pre-flight security verification for student document uploads.
 * Validates file sizes, enforces magic byte inspection, and tests image decodability.
 *
 * DEFENSE-IN-DEPTH:
 * Client-side validation protects user bandwidth and gives immediate UI feedback.
 * The backend Node proxy (/extract-document) performs strict authoritative re-validation
 * on received payloads before processing with Gemini Vision.
 */

(function (root) {
  'use strict';

  // Ensure FormFlow and UI namespaces exist
  root.FormFlow = root.FormFlow || {};
  root.FormFlow.ui = root.FormFlow.ui || {};

  // Maximum allowed file size: 5 Megabytes (5 * 1024 * 1024 bytes)
  var MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

  /**
   * Inspects binary header bytes to determine genuine document type.
   * NEVER trusts file.name or file.type provided by the browser/OS.
   *
   * Magic number signatures:
   * - JPEG: FF D8 FF
   * - PNG:  89 50 4E 47
   * - PDF:  25 50 44 46 (%PDF)
   *
   * @param {Uint8Array} bytes First 8 bytes of the file.
   * @returns {"jpeg"|"png"|"pdf"|null} Detected file type or null.
   */
  function detectMagicType(bytes) {
    if (!bytes || bytes.length < 4) {
      return null;
    }

    // JPEG signature: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'jpeg';
    }

    // PNG signature: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'png';
    }

    // PDF signature: 25 50 44 46 (%PDF)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'pdf';
    }

    return null;
  }

  /**
   * Validates an uploaded document file.
   *
   * Invariants:
   * 1. File existence and non-zero size.
   * 2. Max size 5 MB.
   * 3. Magic number verification (JPEG, PNG, PDF only; ignores file.name/type).
   * 4. For images (JPEG/PNG), confirms the browser can decode the image via createImageBitmap.
   *
   * NOTE: The backend server checks again before sending to Gemini.
   *
   * @param {File|Blob} file The uploaded file object.
   * @returns {Promise<{ ok: boolean, message?: string }>}
   */
  function checkUpload(file) {
    return new Promise(function (resolve) {
      if (!file || typeof file.size !== 'number') {
        resolve({ ok: false, message: 'Please select a file to upload.' });
        return;
      }

      // Check empty file
      if (file.size === 0) {
        resolve({ ok: false, message: 'The selected file is empty.' });
        return;
      }

      // Check maximum file size (5 MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        resolve({ ok: false, message: 'File exceeds maximum allowed size of 5 MB.' });
        return;
      }

      // Read the first 8 bytes for magic number verification
      var headerSlice = file.slice(0, 8);
      var reader = new FileReader();

      reader.onload = function () {
        try {
          var buffer = reader.result;
          var bytes = new Uint8Array(buffer);
          var detectedType = detectMagicType(bytes);

          if (!detectedType) {
            resolve({
              ok: false,
              message: 'Unsupported file type. Please upload a JPEG, PNG, or PDF document.'
            });
            return;
          }

          // For images (JPEG and PNG), confirm the browser can actually decode them
          if (detectedType === 'jpeg' || detectedType === 'png') {
            if (typeof createImageBitmap === 'function') {
              createImageBitmap(file)
                .then(function (bitmap) {
                  if (!bitmap || bitmap.width === 0 || bitmap.height === 0) {
                    if (bitmap && typeof bitmap.close === 'function') {
                      bitmap.close();
                    }
                    resolve({ ok: false, message: 'Image file is corrupt or has invalid dimensions.' });
                    return;
                  }
                  if (typeof bitmap.close === 'function') {
                    bitmap.close();
                  }
                  resolve({ ok: true });
                })
                .catch(function () {
                  resolve({ ok: false, message: 'Image file is corrupt and cannot be decoded.' });
                });
              return;
            }
          }

          // PDF or environment without createImageBitmap
          resolve({ ok: true });
        } catch (err) {
          resolve({ ok: false, message: 'Failed to read file contents.' });
        }
      };

      reader.onerror = function () {
        resolve({ ok: false, message: 'Failed to read file from disk.' });
      };

      reader.readAsArrayBuffer(headerSlice);
    });
  }

  // Expose to window.FormFlow.ui
  root.FormFlow.ui.checkUpload = checkUpload;

  // Support CommonJS testing environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      checkUpload: checkUpload,
      detectMagicType: detectMagicType,
      MAX_FILE_SIZE_BYTES: MAX_FILE_SIZE_BYTES
    };
  }
})(typeof self !== 'undefined' ? self : this);
