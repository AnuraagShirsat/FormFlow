# Documentation: `docs/api.md`

## 1. What it does
`api.md` is the authoritative API documentation and production deployment specification for the FormFlow backend proxy. It documents all HTTP routes (`GET /health`, `POST /analyze-form`, `POST /extract-document`), request/response contracts, field constraints, error catalogs, and step-by-step instructions for deploying to free cloud hosting (Render) with dashboard-managed secrets.

## 2. How it works technically
- **Contract Alignment:** Derives all JSON schemas directly from `/contracts/contract.json` and `/contracts/contract.md`.
- **Error Catalog:** Lists all standardized error codes (`bad_request`, `forbidden_origin`, `not_found`, `RATE_LIMIT_EXCEEDED`, `not_implemented`, `SERVICE_UNAVAILABLE`) and their trigger conditions.
- **Reverse Proxy Architecture:** Explains reverse proxy trust mechanics (`trust proxy: 1`), enabling `express-rate-limit` to read genuine client IPs from `X-Forwarded-For` behind Render and Cloudflare edge gateways.
- **Production Key Isolation:** Outlines the separation between version-controlled source code and environment credentials configured in cloud dashboards.

## 3. Judge questions with short answers
- **Q: How does this documentation facilitate team integration during the hackathon?**
  - **A:** It provides Anuraag (extension core) and Himani (UI widget) with exact request and response schemas, sample payloads, and status codes, allowing frontend and backend development to proceed in parallel without API mismatch.
- **Q: Where is the production proxy deployed and how is it secured?**
  - **A:** Deployed on Render's free tier with environment variables in the host dashboard, protected by Helmet headers, 200kb payload ceilings, 10 req/min rate limits, and server-side `Origin` header verification matching the Chrome extension ID.

## 4. What to know before the judges
- The backend is ready for one-click deployment to Render using `backend/server.js` and `backend/package.json`.
- The URL is shared with the extension lead to populate `BACKEND_URL` in `/extension/core/api.js`.

## 5. Security checks done and judge questions about security
- **Security Checks Done:**
  - Verified no live API keys or credentials are in `api.md`.
  - Confirmed all example request/response payloads strictly use synthetic data labelled `SAMPLE`.
  - Verified that all error shapes comply with the contract specification.
- **Judge Security Questions:**
  - **Q: What happens if an unauthorized client invokes the public Render URL?**
    - **A:** The proxy checks the `Origin` header against `ALLOWED_ORIGIN`. If it does not match `chrome-extension://<id>`, the server immediately rejects the call with HTTP 403 Forbidden.
