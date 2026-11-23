# Documentation: `backend/test/sanity.test.js`

## 1. What it does
`sanity.test.js` validates that the built-in Node.js test runner environment (`node:test` and `node:assert`) is functioning properly without third-party test framework dependencies.

## 2. How it works technically
- Uses `require('node:test')` and `require('node:assert')`.
- Executes a basic assertion verifying the test runner can evaluate assertions and report passes.

## 3. Judge questions with short answers
- **Q: Why use Node's built-in test runner instead of Jest or Mocha?**
  - **A:** `node:test` is built into modern Node.js runtimes. It requires zero external dependencies, introduces zero security vulnerabilities, and executes instantly.

## 4. What to know before the judges
- The test suite is invoked using `npm test` or `node --test`.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified no external test harness dependencies are required.
- **Judge Security Questions:**
  - **Q: Are tests executed in production?**
    - **A:** No. Tests are run locally and in CI/CD before deployment.
