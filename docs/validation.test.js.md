# Documentation: `backend/test/validation.test.js`

## 1. What it does
`validation.test.js` contains automated security and validation tests verifying the defenses implemented in Tasks 2 and 3, using Node.js's native test runner (`node:test` and `node:assert`).

## 2. How it works technically
Executes 11 distinct automated tests:
1. `GET /health` returns `{ ok: true }` only.
2. Attack 1 defense: Unknown routes (`/admin/debug`) return HTTP 404 with `{ error: { code: "not_found" } }`.
3. Attack 8 defense: Unauthorized `Origin` header returns HTTP 403 with `{ error: { code: "forbidden_origin" } }`.
4. `POST /analyze-form` accepts valid contract payloads and produces structured field guidance and document checklists.
5. Attack 8 defense: Extra / injected properties at the root or inside field objects are strictly stripped.
6. Attack 5 defense: Invalid language enums (e.g. `fr`) are rejected with HTTP 400.
7. Attack 5 defense: Invalid field types (e.g. `invalid_type_enum`) are rejected with HTTP 400.
8. Attack 5 defense: Field arrays exceeding the 100-field limit are rejected with HTTP 400.
9. Attack 5 defense: Non-object or empty request bodies are rejected with HTTP 400.
10. Attack 5 defense: Oversize request bodies exceeding the 200kb limit are rejected with HTTP 400.
11. Test environment sanity check.

## 3. Judge questions with short answers
- **Q: Which security attacks are covered by this test suite?**
  - **A:** Attack 1 (probing unknown/admin routes), Attack 5 (type confusion, invalid enums, unbounded arrays, oversize payloads), and Attack 8 (unauthorized origins and extra injected fields).
- **Q: How are tests run?**
  - **A:** By running `npm test` or `node --test test/**/*.test.js`.

## 4. What to know before the judges
- 100% of the tests execute against the production Express application instance without external dependencies.
- Every assertion validates status codes, contract error structures, and response shapes.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified 11/11 tests pass with zero warnings or failures.
- **Judge Security Questions:**
  - **Q: How does this test suite ensure continuous compliance with the shared contract?**
    - **A:** The assertions explicitly compare against the schema definitions and error shapes specified in `/contracts/contract.json`.
