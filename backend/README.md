# Backend Proxy (/backend)

**Owner:** Ivan (Kartik owns `/backend/routes/extractDocument.js` only)

## Scope & Responsibilities
- Secure Node.js proxy server that interfaces with Gemini API.
- Securely stores and uses `GEMINI_API_KEY` from backend `.env` (never exposed to client).
- Document extraction route (`/backend/routes/extractDocument.js` maintained by Kartik) processing document images via Gemini vision.
- Rate limiting, origin validation, and request payload validation.
- No user accounts/login, no payment systems, no database, no admin panels.
