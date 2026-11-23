# Documentation: `backend/routes/analyzeForm.js`

## 1. What it does
`analyzeForm.js` manages the `POST /analyze-form` endpoint. In this initial stage, it serves as a contract-compliant stub that returns pre-structured form analysis data containing field explanations in English, Kannada, and Hindi, concrete examples, document associations (such as Aadhaar Card, Income Certificate, and Marksheet), and a list of required supporting documents. This allows frontend and extension engineers (Himani and Anuraag) to immediately integrate and build the floating UI widget without blocking on live AI model pipelines.

## 2. How it works technically
- **Express Router:** Exports an Express router mounted on the root application path.
- **Contract Adherence:** Houses a baseline `STUB_ANALYSIS_RESPONSE` matching the shared schema specifications.
- **Dynamic Field Reflection:** When incoming requests provide a list of scanned fields, the route maps the field identifiers to appropriate explanations in English, Kannada (`kn`), and Hindi (`hi`), providing both `explanationEn` / `explanationSelected` and nested `explanation: { en, selected }` structures for maximum frontend compatibility.
- **Synthetic Sample Labeling:** All examples returned by the stub are explicitly tagged with `SAMPLE:` to prevent confusion with authentic user data.
- **Zero State / Zero Storage:** Operates completely in-memory with zero side effects, database queries, or persistent disk writes.

## 3. Judge questions with short answers
- **Q: Why ship a stub endpoint before connecting the live Gemini model?**
  - **A:** Contract-first parallel development. Shipping a deterministic stub conforming to the contract allows UI and extension engineers to build and test their components immediately, eliminating cross-team blocking while backend security layers and AI pipelines are finalized.
- **Q: What data does `/analyze-form` return to the student?**
  - **A:** It returns plain-language field explanations in English, Kannada, or Hindi, practical examples, the specific document type needed for each field, and an overall checklist of required documents.
- **Q: Is any personal student data handled or stored in this endpoint?**
  - **A:** No. The endpoint receives only form metadata (field labels, input types, IDs, page title) and never receives or stores personal student responses or values.

## 4. What to know before the judges
- The stub returns data in the exact JSON shape required by the extension widget.
- Supported languages in the contract include English (`en`), Kannada (`kn`), and Hindi (`hi`).
- All sample examples are fake synthetic values clearly prefixed with `SAMPLE:`.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified no user data or inputs are saved to disk or external databases.
  - Verified all synthetic examples are labelled `SAMPLE`.
  - Confirmed the route produces strictly JSON responses with appropriate `Content-Type: application/json`.
- **Judge Security Questions:**
  - **Q: What happens if an attacker sends sensitive personal information inside the form fields scan?**
    - **A:** The extension only scans HTML field labels, IDs, and placeholders—never user values. Furthermore, the backend does not store, log, or persist request bodies.
  - **Q: How does this endpoint prevent cross-user data contamination?**
    - **A:** The proxy is stateless and does not use session identifiers, user accounts, or shared storage between requests.
