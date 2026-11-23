# FormFlow Security Architecture & Threat Model

**Author & Owner:** Anuraag (/docs/SECURITY.md)  
**Hackathon Target Date:** 24 November 2026  
**Scope:** Authoritative security specification, threat mitigation matrix, data handling guarantees, and architectural boundaries.

---

## 1. The 14-Attacks Mitigation Table

The following matrix documents FormFlow's threat model across common web and AI attack vectors:

| # | Attack Vector | FormFlow Status | Fix / Mitigation | Owner |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Type `/admin`** | No admin pages | Return plain 404; zero administrative endpoints, routes, or control panels exist in the backend. | **Ivan** |
| **2** | **Change ID in URL** | Nothing queried by ID | No entity lookup endpoints or resource IDs exist; proxy is completely stateless. | **Ivan** |
| **3** | **API key in browser** | Key only in backend env | Extension never contacts Gemini directly; `GEMINI_API_KEY` lives in backend `.env`; automated scanner prevents leaks. | **Anuraag scans** |
| **4** | **Edit the price** | No payments | Feature not built; FormFlow is a free, non-commercial accessibility tool for students. | **Not built** |
| **5** | **Bad inputs** | Schema validation | Proxy enforces strict JSON schema contracts, bounded string lengths (max 200 chars), and type checks. | **Ivan** |
| **6** | **Fake a payment** | Not built | Zero payment gateways, webhooks, or transaction handling logic exist in the codebase. | **Not built** |
| **7** | **Redeem 100 times** | Rate limit and cache | In-memory IP/origin rate limiting (30 requests/minute) on proxy endpoints prevents quota exhaustion. | **Ivan** |
| **8** | **Admin at signup** | Listed fields only | No user registration or role assignment exists; schema whitelists exact form fields only. | **Ivan** |
| **9** | **Guess login code** | Rate limiting, no login | Zero authentication or OTP login mechanisms exist; data resides purely on local client. | **No login** |
| **10** | **Prompt injection** | Data not instructions | Form text treated as untrusted data; system prompts demand strict JSON; outputs validated against schema; user reviews before fill. | **Ivan and Kartik** |
| **11** | **XSS** | `textContent` only | Zero use of `innerHTML`, `outerHTML`, or `eval()`; all DOM updates rendered using `textContent` and `createElement`. | **Himani** |
| **12** | **Upload non-photo** | Real type, size, allow-list | Backend validates magic numbers and MIME types (`image/jpeg`, `image/png`, `application/pdf`), caps file size at 5MB. | **Kartik and Himani** |
| **13** | **.env in Git** | `.gitignore`, `.env.example`, secret scan | `.gitignore` excludes all `.env*` except `.env.example`; pre-push `node scripts/secret-scan.js` audits the repo. | **Anuraag** |
| **14** | **Query database** | No database | Proxy is completely stateless with zero SQL/NoSQL databases or connection strings. | **Ivan** |

---

## 2. Core Data-Handling Guarantees

FormFlow was designed from first principles around zero-trust privacy:

1. **Nothing Stored on Our Server:** The Node.js backend proxy is strictly an ephemeral protocol bridge. It retains zero databases, zero caches, and zero disk logs of document images, scanned field names, or student attributes.
2. **Profile Only in the User's Browser:** Student profile records reside exclusively on the student's physical device inside Chrome's sandboxed `chrome.storage.local`. It is never uploaded to external clouds or third-party tracking providers.
3. **Documents Processed in Memory and Discarded:** When a student uploads a document image for analysis, the base64 payload is forwarded to Gemini Vision in-memory via TLS 1.3 and discarded immediately after extraction. No document binaries are saved to disk.
4. **Nothing Auto-Submitted:** FormFlow strictly enforces human-in-the-loop agency. Fields are populated only when the student explicitly clicks the "Fill Form" button after reviewing values. FormFlow **NEVER** invokes `form.submit()` or programmatically clicks submit buttons. Final application submission remains 100% under student control.

---

## 3. Intentionally Absent Features

To eliminate entire classes of security vulnerabilities, FormFlow explicitly omits features common in traditional web apps:

- **Login:** Not built — storing student profiles locally in the browser eliminates credential theft, password cracking, session hijacking, and database breaches.
- **Payments:** Not built — FormFlow is an open public-benefit assistive tool for students, eliminating PCI compliance burdens, payment tampering, and billing fraud.
- **Database:** Not built — client-side storage completely removes SQL injection (SQLi), remote database leaks, and server-side data compliance liability.
- **Admin Area:** Not built — because there are no stored user accounts, records, or multi-tenant configurations, having an admin interface would introduce unnecessary privilege escalation risk.

