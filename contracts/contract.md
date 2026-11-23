# FormFlow Shared Interface & Data Contract

**Author & Owner:** Anuraag (/contracts)  
**Version:** 1.0.0  
**Scope:** Defines the authoritative schemas, API contracts, inter-process messaging protocols, and browser runtime interfaces for FormFlow. All data samples are synthetic and labelled **SAMPLE**.

---

## 1. FormField Specification

Represents an interactive input element discovered on a scholarship or government form.

### Security & Privacy Rules:
- **Never include password or hidden inputs** (`type="password"` or `type="hidden"` must be ignored during scanning).
- **Never include existing or typed user values**. Only field metadata (structure, label, choices) is collected.

### Field Limits & Types:
- `id` (`string`, max 64 chars): Unique ID, form control name, or deterministic CSS selector.
- `label` (`string`, max 200 chars): Associated label text extracted from `<label>`, `aria-label`, or adjacent text.
- `type` (`enum`): `"text" | "email" | "tel" | "number" | "date" | "select" | "radio" | "checkbox" | "textarea" | "file"`
- `required` (`boolean`): Whether the field has `required`, `aria-required="true"`, or asterisk indicator.
- `options` (`array of strings`, max 50 items, each string max 100 chars): List of selectable values for select/radio/checkbox.
- `hint` (`string`, max 200 chars): Contextual placeholder, tooltip, or helper text.

```json
{
  "id": "applicant_full_name",
  "label": "Full Name (as per 10th marks card)",
  "type": "text",
  "required": true,
  "options": [],
  "hint": "Enter full name in BLOCK letters (SAMPLE)"
}
```

---

## 2. POST /analyze-form

Analyzes page structure to produce multilingual field-by-field guidance and checklist of required documents.

### Request Contract
- **Endpoint:** `POST http://localhost:5000/analyze-form`
- **Headers:** `Content-Type: application/json`

| Property | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `language` | string | `"en" \| "kn" \| "hi"` | Selected language for local translations. |
| `pageTitle` | string | Max 200 chars | Title or primary heading of the form page. |
| `fields` | array | Max 100 items | Array of `FormField` objects discovered on the page. |

```json
{
  "language": "kn",
  "pageTitle": "Post-Matric Scholarship Portal 2026 (SAMPLE)",
  "fields": [
    {
      "id": "applicant_name",
      "label": "Applicant Full Name",
      "type": "text",
      "required": true,
      "options": [],
      "hint": "As registered in official records (SAMPLE)"
    },
    {
      "id": "income_cert_no",
      "label": "RD Income Certificate Number",
      "type": "text",
      "required": true,
      "options": [],
      "hint": "e.g. RD00382918231 (SAMPLE)"
    }
  ]
}
```

### Response Contract (200 OK)
```json
{
  "fields": [
    {
      "id": "applicant_name",
      "explanation": "Your full legal name as it appears in your government identity documents.",
      "explanationLocal": "ನಿಮ್ಮ ಸರ್ಕಾರಿ ಗುರುತಿನ ದಾಖಲೆಗಳಲ್ಲಿರುವಂತೆ ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು.",
      "example": "KAVYA RAMESH SHETTY (SAMPLE)",
      "sourceDocument": "Aadhaar Card / 10th Marksheet"
    },
    {
      "id": "income_cert_no",
      "explanation": "Revenue Department certificate number validating annual household income.",
      "explanationLocal": "ವಾರ್ಷಿಕ ಆದಾಯವನ್ನು ದೃಢೀಕರಿಸುವ ಕಂದಾಯ ಇಲಾಖೆಯ ಪ್ರಮಾಣಪತ್ರ ಸಂಖ್ಯೆ.",
      "example": "RD00382918231 (SAMPLE)",
      "sourceDocument": "Income Certificate"
    }
  ],
  "requiredDocuments": [
    {
      "name": "Aadhaar Card",
      "why": "Required to verify student identity and seed bank account for Direct Benefit Transfer (DBT)."
    },
    {
      "name": "Income Certificate",
      "why": "Required by department to determine scholarship income eligibility limits."
    }
  ]
}
```

---

## 3. POST /extract-document

Sends base64-encoded document images/PDFs to the Node proxy. Proxy interfaces with Gemini Vision and returns structured field extractions with confidence ratings.

### Request Contract
- **Endpoint:** `POST http://localhost:5000/extract-document`
- **Headers:** `Content-Type: application/json`

| Property | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `docType` | string | `"aadhaar" \| "marksheet_10th" \| "marksheet_12th" \| "income_certificate" \| "caste_certificate" \| "photo" \| "signature"` | Document category identifier. |
| `mimeType` | string | `"image/jpeg" \| "image/png" \| "application/pdf"` | MIME type of data payload. |
| `data` | string | Valid Base64 | Base64 encoded payload without data URL scheme prefix. |

```json
{
  "docType": "aadhaar",
  "mimeType": "image/jpeg",
  "data": "U0FNUExFX0JBU0U2NF9EQVRBX09OTFk..."
}
```

### Response Contract (200 OK)
```json
{
  "docType": "aadhaar",
  "fields": {
    "fullName": {
      "value": "KAVYA RAMESH SHETTY (SAMPLE)",
      "confidence": 0.98
    },
    "dob": {
      "value": "2004-05-14",
      "confidence": 0.95
    },
    "gender": {
      "value": "Female",
      "confidence": 0.99
    },
    "aadhaarLast4": {
      "value": "4321",
      "confidence": 0.97
    }
  }
}
```

---

## 4. Profile Schema (chrome.storage.local)

The user profile is strictly stored in client-side extension storage (`chrome.storage.local`). It is never transmitted to any external analytics, database, or server.

### Aadhaar Privacy Invariant:
**Only the last 4 digits of Aadhaar (`aadhaarLast4`) are ever retained.** The full 12 digits must NEVER be stored, logged, or sent to backend storage.

| Key | Type | Constraints / Format | Description |
| :--- | :--- | :--- | :--- |
| `fullName` | string \| null | Max 150 chars | Full student legal name. |
| `fatherName` | string \| null | Max 150 chars | Father / guardian name. |
| `motherName` | string \| null | Max 150 chars | Mother name. |
| `dob` | string \| null | Format `YYYY-MM-DD` | Date of birth. |
| `gender` | string \| null | `"Male" \| "Female" \| "Other" \| null` | Gender. |
| `category` | string \| null | Max 50 chars | Caste / reservation category (e.g. `OBC-2A`). |
| `annualIncome` | string \| null | Max 20 chars | Verified annual family income in INR. |
| `aadhaarLast4` | string \| null | Exactly 4 digits `^\d{4}$` | Last 4 digits of Aadhaar card only. |
| `mobile` | string \| null | 10 digits `^[6-9]\d{9}$` | Primary contact mobile number. |
| `email` | string \| null | Max 100 chars | Student email address. |
| `address` | string \| null | Max 300 chars | Residential address. |
| `pincode` | string \| null | Exactly 6 digits `^\d{6}$` | Postal PIN code. |
| `bankAccount` | string \| null | Max 30 chars | Direct Benefit Transfer bank account number. |
| `ifsc` | string \| null | 11 chars `^[A-Z]{4}0[A-Z0-9]{6}$` | Bank branch IFSC code. |
| `course` | string \| null | Max 100 chars | Current enrolled degree or diploma course. |
| `institution` | string \| null | Max 150 chars | Name of college or university. |
| `marks` | string \| null | Max 20 chars | Percentage or CGPA in preceding qualifying exam. |

```json
{
  "fullName": "KAVYA RAMESH SHETTY (SAMPLE)",
  "fatherName": "RAMESH SHETTY (SAMPLE)",
  "motherName": "SAVITHA SHETTY (SAMPLE)",
  "dob": "2004-05-14",
  "gender": "Female",
  "category": "OBC-2A (SAMPLE)",
  "annualIncome": "120000",
  "aadhaarLast4": "4321",
  "mobile": "9876543210",
  "email": "sample.student@example.edu",
  "address": "123 Saraswathi Nagar, Bengaluru (SAMPLE)",
  "pincode": "560001",
  "bankAccount": "987654321001",
  "ifsc": "SBIN0001234",
  "course": "B.E. Computer Science (SAMPLE)",
  "institution": "Government Engineering College (SAMPLE)",
  "marks": "88.5"
}
```

---

## 5. Extension Inter-Process Messaging

Communication between content scripts (DOM context) and the background service worker (`chrome.runtime.sendMessage` and `chrome.runtime.onMessage`).

### Message Types Table

| Message Action | Sent By | Received By | Payload Shape | Success Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| `SCAN_FORM` | UI / Content Script | Filler Script | `{}` | `{ success: true, fields: FormField[] }` |
| `ANALYZE_FORM` | Content Script | Background Worker | `{ language: "en"\|"kn"\|"hi", pageTitle: string, fields: FormField[] }` | `{ success: true, data: AnalyzeFormResponse }` |
| `EXTRACT_DOCUMENT` | UI / Content Script | Background Worker | `{ docType: string, mimeType: string, data: string }` | `{ success: true, data: ExtractDocumentResponse }` |
| `GET_PROFILE` | UI / Content Script | Background Worker | `{}` | `{ success: true, profile: Profile }` |
| `SAVE_PROFILE` | UI / Content Script | Background Worker | `{ updates: Partial<Profile> }` | `{ success: true, profile: Profile }` |
| `CLEAR_PROFILE` | UI / Content Script | Background Worker | `{}` | `{ success: true }` |

### Detailed Messaging Specifications

#### 1. `SCAN_FORM`
- **Request:** `{ "type": "SCAN_FORM" }`
- **Response:**
  ```json
  {
    "success": true,
    "fields": [
      {
        "id": "applicant_name",
        "label": "Applicant Full Name",
        "type": "text",
        "required": true,
        "options": [],
        "hint": "Name as per records (SAMPLE)"
      }
    ]
  }
  ```

#### 2. `ANALYZE_FORM`
- **Request:**
  ```json
  {
    "type": "ANALYZE_FORM",
    "payload": {
      "language": "hi",
      "pageTitle": "State Pre-Matric Scholarship (SAMPLE)",
      "fields": [...]
    }
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "fields": [...],
      "requiredDocuments": [...]
    }
  }
  ```

#### 3. `EXTRACT_DOCUMENT`
- **Request:**
  ```json
  {
    "type": "EXTRACT_DOCUMENT",
    "payload": {
      "docType": "aadhaar",
      "mimeType": "image/jpeg",
      "data": "U0FNUExFX0JBU0U2NF9EQVRB..."
    }
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "docType": "aadhaar",
      "fields": {
        "fullName": { "value": "KAVYA RAMESH SHETTY (SAMPLE)", "confidence": 0.98 }
      }
    }
  }
  ```

#### 4. `GET_PROFILE`
- **Request:** `{ "type": "GET_PROFILE" }`
- **Response:** `{ "success": true, "profile": { ...Profile } }`

#### 5. `SAVE_PROFILE`
- **Request:** `{ "type": "SAVE_PROFILE", "payload": { "updates": { "annualIncome": "120000" } } }`
- **Response:** `{ "success": true, "profile": { ...MergedProfile } }`

#### 6. `CLEAR_PROFILE`
- **Request:** `{ "type": "CLEAR_PROFILE" }`
- **Response:** `{ "success": true }`

---

## 6. Shared Content Script Namespace (`window.FormFlow`)

To coordinate between modular content scripts without global variable collisions or build step tooling, modules attach to `window.FormFlow`:

```javascript
window.FormFlow = {
  scanForm: function() {},
  mountWidget: function() {},
  fillFields: function(plan) {}
};
```

### Signatures & Behavioral Contracts

### 1. `window.FormFlow.scanForm()`
- **Signature:** `scanForm() -> FormField[]`
- **Behavior:** Scans the active DOM for actionable inputs (`input`, `select`, `textarea`). Skips hidden inputs, buttons, submits, passwords, and the FormFlow shadow widget itself. Does NOT extract current field values.
- **Returns:** Array of `FormField` objects (max 100).

### 2. `window.FormFlow.mountWidget()`
- **Signature:** `mountWidget() -> HTMLElement`
- **Behavior:** Attaches a persistent floating button and panel into an isolated `ShadowRoot` (`mode: 'closed'`). Uses standard DOM creation (`document.createElement`) and never uses `innerHTML`.
- **Returns:** The host container element attached to `document.body`.

### 3. `window.FormFlow.fillFields(plan)`
- **Signature:** `fillFields(plan: FillPlanItem[]) -> { filledCount: number, skippedCount: number, errors: string[] }`
- **Behavior:**
  - Iterates over the `plan` items.
  - Matches each `item.fieldId` to target DOM elements.
  - Checks `item.status === 'green'`.
  - Dispatches native DOM change events (`input`, `change`, `blur`) so form frameworks detect updates.
  - **NEVER triggers form submission (`form.submit()` or clicking submit buttons).**
- **Plan Item Shape (`FillPlanItem`):**
  ```json
  {
    "fieldId": "applicant_full_name",
    "profileKey": "fullName",
    "value": "KAVYA RAMESH SHETTY (SAMPLE)",
    "confidence": 0.98,
    "status": "green",
    "reason": "Direct match from verified Aadhaar record."
  }
  ```

---

## 7. Universal Error Shape

All proxy HTTP error responses and internal background error envelopes strictly follow this format. **Stack traces and internal server diagnostics are never returned.**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests to document extraction. Please wait one minute before trying again."
  }
}
```

### Standardized Error Codes:
- `INVALID_PAYLOAD`: Missing required fields, improper base64, or schema violation.
- `UNSUPPORTED_DOC_TYPE`: Unrecognized or unsupported document category.
- `AI_EXTRACTION_FAILED`: Vision model unable to read or parse document.
- `RATE_LIMIT_EXCEEDED`: Client exceeded hourly/per-minute call threshold.
- `SERVICE_UNAVAILABLE`: Backend proxy unable to contact Gemini API.
