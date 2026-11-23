# Documentation: `backend/test/test-helper.js`

## 1. What it does
`test-helper.js` provides an in-memory HTTP request simulator for testing the FormFlow Express application without opening TCP listening sockets or relying on external networking.

## 2. How it works technically
- **`request(app, options)`:**
  - Constructs genuine Node.js `http.IncomingMessage` and `http.ServerResponse` instances linked via a mock `net.Socket`.
  - Streams optional JSON request body buffers directly into the incoming stream.
  - Intercepts response stream writes (`write`, `end`) and parses JSON payloads.
  - Returns a promise resolving to `{ status, statusCode, headers, body }`.
- **Sandbox Compatibility:** Resolves Windows sandbox loopback network restrictions (`EACCES 127.0.0.1`) while executing the real Express middleware pipeline in memory with maximum performance.

## 3. Judge questions with short answers
- **Q: Why use an in-memory test helper rather than starting a live server on port 5000?**
  - **A:** In-memory request execution runs orders of magnitude faster, avoids port conflicts in CI/CD pipelines, and avoids external network or sandbox socket permissions.
- **Q: Does this execute the exact same middleware and routes as a live server?**
  - **A:** Yes. Express receives the request and executes the entire middleware chain, including Helmet, body parsers, origin verification, and route handlers.

## 4. What to know before the judges
- The helper supports all HTTP verbs (`GET`, `POST`, `OPTIONS`), arbitrary request headers, and automatic JSON stringification/parsing.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Confirmed accurate header and status code propagation across all test cases.
- **Judge Security Questions:**
  - **Q: Does this mock alter application security semantics?**
    - **A:** No. The actual Express application instance and middleware functions run unmodified.
