# Documentation: `backend/package.json`

## 1. What it does
`package.json` specifies the metadata, runtime dependencies, test commands, and execution scripts for the FormFlow backend Node proxy.

## 2. How it works technically
- **Metadata:** Sets package name `formflow-backend` and marks the package as `"private": true` to prevent unintended npm registry publication.
- **Scripts:**
  - `npm start`: Runs `node server.js`.
  - `npm test`: Executes the built-in Node.js test runner using `node --test test/**/*.test.js`.
- **Core Dependencies:**
  - `express`: Minimalist, unopinionated web framework for HTTP routing and middleware.
  - `helmet`: Essential security headers middleware.
  - `cors`: Cross-Origin Resource Sharing control.
  - `dotenv`: Zero-dependency environment variable loader.
  - `zod`: TypeScript-first schema validation with static type inference and strict object stripping.
  - `express-rate-limit`: Basic rate-limiting middleware for Express.
  - `@google/generative-ai`: Official Google Gemini SDK for model calls.

## 3. Judge questions with short answers
- **Q: Why are third-party dependencies kept minimal?**
  - **A:** Keeping the dependency tree lean minimizes the attack surface, eliminates unnecessary transitive vulnerabilities, and speeds up cold-start deployment times on free hosting tiers.
- **Q: Which test runner is used?**
  - **A:** Node.js's native test runner (`node --test`), avoiding heavy external test frameworks and extra dependencies.

## 4. What to know before the judges
- The backend uses standard Node.js without requiring transpilations or build steps.
- Node.js LTS (v18 or v20+) is supported.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified package is marked `"private": true`.
  - Confirmed all listed packages are actively maintained production-grade libraries.
- **Judge Security Questions:**
  - **Q: How do you safeguard against malicious or vulnerable packages?**
    - **A:** Dependencies are pinned to standard production versions, validated against known CVE databases (`npm audit`), and vetted to ensure no unnecessary native binaries or build scripts are executed.
