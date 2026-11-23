# Documentation: `backend/lib/schemas.js`

## 1. What it does
`schemas.js` defines the authoritative Zod schemas for incoming client request payloads and outgoing responses across the FormFlow backend proxy. It guarantees that data structures precisely conform to `/contracts/contract.json` and `/contracts/contract.md`, validating data types, string length caps, array bounds, and enum invariants, while actively stripping unlisted or unknown properties.

## 2. How it works technically
- **`FormFieldSchema`:**
  - `id`: Non-empty string capped at 64 characters.
  - `label`: String capped at 200 characters.
  - `type`: Strict enum (`text`, `email`, `tel`, `number`, `date`, `select`, `radio`, `checkbox`, `textarea`, `file`).
  - `required`: Boolean defaulting to `false`.
  - `options`: Array of strings capped at 50 items (each item max 100 characters), defaulting to `[]`.
  - `hint`: String capped at 200 characters, defaulting to `''`.
  - **`.strip()` Mode:** Strips any unlisted properties (mitigating Attack 8).
- **`AnalyzeFormRequestSchema`:**
  - `language`: Strict enum (`en`, `kn`, `hi`).
  - `pageTitle`: String capped at 200 characters, defaulting to `''`.
  - `fields`: Array of `FormFieldSchema` items, bounded between 1 and 100 fields.
  - **`.strip()` Mode:** Strips any unlisted root properties.
- **`AnalyzeFormFieldResponseSchema` & `RequiredDocumentSchema`:**
  - Validates outgoing field guidance (`id`, `explanation`, `explanationLocal`, `example`, `sourceDocument`) and required document checklists (`name`, `why`).

## 3. Judge questions with short answers
- **Q: Why use Zod instead of manual `typeof` or Joi?**
  - **A:** Zod provides lightweight, declarative runtime validation with zero native dependencies, composable schema definitions, and built-in `.strip()` functionality that automatically drops unexpected properties.
- **Q: How does this file protect against mass assignment or parameter tampering?**
  - **A:** By explicitly invoking `.strip()` on every object schema, any unauthorized or injected properties in the request body are silently removed before downstream handlers or model prompts ever see them.
- **Q: What languages does the backend support?**
  - **A:** English (`en`), Kannada (`kn`), and Hindi (`hi`). Any other language code is rejected immediately with HTTP 400.

## 4. What to know before the judges
- The schemas enforce a strict upper limit of 100 fields per form request to protect backend compute resources.
- All field types are restricted to 10 standard web form input types.
- All schemas directly reflect the definitions in `contracts/contract.json`.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified rejection of invalid language enums (e.g. `fr`).
  - Verified rejection of invalid input types (e.g. `invalid_type`).
  - Verified rejection of oversized field arrays (>100 fields).
  - Confirmed unknown properties on both root and field objects are purged.
- **Judge Security Questions:**
  - **Q: How does `schemas.js` defend against Denial of Service (DoS) via unbounded arrays?**
    - **A:** `fields` is strictly capped at `max(100)` and `options` is capped at `max(50)`, preventing attackers from exhausting server memory with millions of array elements.
  - **Q: How does it prevent injection attacks through field labels or IDs?**
    - **A:** String lengths are tightly bounded (`id` to 64 chars, `label` to 200 chars). Furthermore, only explicitly specified schema keys are preserved.
