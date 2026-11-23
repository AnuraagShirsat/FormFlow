# Documentation: `backend/routes/analyzeForm.js`

## 1. What it does
`analyzeForm.js` manages the `POST /analyze-form` endpoint. It enforces strict input validation via `validateAnalyzeForm` (checking languages `en|kn|hi`, bounding field counts to 100, and stripping extra attributes), and produces contract-compliant form analysis containing field explanations in English, Kannada, and Hindi, concrete examples, document associations, and required supporting documents checklist (`name`, `why`).

## 2. How it works technically
- **Express Router:** Exports an Express router mounted on the root application path.
- **Validation Pipeline:** Integrates `validateAnalyzeForm` middleware, enforcing Zod validation before handling requests.
- **Contract Adherence:** Returns payload conforming strictly to `/contracts/contract.json` (`AnalyzeFormResponse` with `fields` and `requiredDocuments`).
- **Dynamic Field Mapping:** Maps incoming scanned fields to structured guidance in the student's chosen language (`en`, `kn`, or `hi`).
- **Synthetic Sample Labeling:** All examples returned are explicitly tagged with `(SAMPLE)` to prevent confusion with authentic user data.
- **Zero State / Zero Storage:** Operates completely in-memory with zero side effects, database queries, or persistent disk writes.

## 3. Judge questions with short answers
- **Q: What happens if an attacker sends an invalid language code like `fr` or `es`?**
  - **A:** The request is rejected at the validation layer with HTTP 400 Bad Request before hitting the route logic.
- **Q: What data does `/analyze-form` return to the student?**
  - **A:** It returns plain-language field explanations in English, Kannada, or Hindi, practical examples, the specific document type needed for each field, and an overall checklist of required documents with reasons (`why`).
- **Q: Is any personal student data handled or stored in this endpoint?**
  - **A:** No. The endpoint receives only form metadata (field labels, input types, IDs, page title) and never receives or stores personal student responses or values.

## 4. What to know before the judges
- The endpoint strictly complies with the schema defined in `contracts/contract.json`.
- Supported languages include English (`en`), Kannada (`kn`), and Hindi (`hi`).
- All sample examples are fake synthetic values clearly marked `(SAMPLE)`.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified no user data or inputs are saved to disk or external databases.
  - Verified all synthetic examples are labelled `SAMPLE`.
  - Verified unknown input properties are stripped.
  - Verified 100-field array limit.
- **Judge Security Questions:**
  - **Q: What happens if an attacker sends sensitive personal information inside the form fields scan?**
    - **A:** The extension only scans HTML field labels, IDs, and placeholders—never user values. Furthermore, the backend does not store, log, or persist request bodies.
  - **Q: How does this endpoint prevent cross-user data contamination?**
    - **A:** The proxy is stateless and does not use session identifiers, user accounts, or shared storage between requests.
