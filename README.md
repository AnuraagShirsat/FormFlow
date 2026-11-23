# FormFlow

FormFlow is a privacy-first Chrome Manifest V3 extension designed to help students easily and accurately fill complex scholarship and government application forms. 

Operating directly on application portals via an isolated Shadow DOM floating widget, FormFlow:
- **Scans form fields** and identifies required supporting documents.
- **Explains each field** in plain language across multiple languages (**English**, **Kannada**, and **Hindi**).
- **Extracts student data** from uploaded documents using Google Gemini Vision via a secure, private local Node.js proxy.
- **Provides a transparent review screen** highlighting fields by confidence (green = matched, red = missing or low confidence) so students remain in full control.
- **Normalizes photo and signature uploads** to strictly meet portal file type and size constraints.
- **Fills forms strictly on demand**: Form fields are populated ONLY when the student explicitly clicks "Fill Form". **It never auto-submits any form.**

> **Privacy & Security Notice:** FormFlow requires **no login**, **no payments**, **no remote database**, and **no admin area**. The extension never contacts Gemini directly; all AI requests route through our Node proxy where API keys remain protected. All test data consists strictly of synthetic mock records labelled **SAMPLE**.

---

## Folder Owners

| Folder | Owner | Scope & Responsibility |
| :--- | :--- | :--- |
| `/extension/core` | **Anuraag** | Extension lifecycle, background service worker, storage, and proxy communication. |
| `/extension/ui` | **Himani** | Floating widget UI (Shadow DOM), multilingual explanations, review screen. |
| `/extension/filler` | **Kartik** | Form field scanning, profile data mapping, photo/signature normalizer, autofill engine. |
| `/backend` | **Ivan** *(Kartik owns `/backend/routes/extractDocument.js` only)* | Secure Node.js proxy holding Gemini API key, request validation, rate limiting. |
| `/contracts` | **Anuraag only** | JSON schemas, interface definitions, and request/response contracts. |
| `/mock-form` | **Himani** | Realistic mock scholarship and government portal forms for testing and demo. |
| `/fixtures` | **Kartik** | Sample test documents and synthetic assets labelled SAMPLE. |
| `/docs` | **Shared / Documentation** | Technical specs, judge Q&A guides, and security audit checklists. |
| `/scripts` | **Anuraag** | Development, testing, and contract verification scripts. |

---

## How to Load the Extension

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `extension` folder inside this repository:
   ```text
   /path/to/FormFlow/extension
   ```
5. The FormFlow icon will appear in your Chrome toolbar. When visiting supported scholarship or mock portals, the FormFlow floating widget will initialize.

---

## How to Run the Backend Proxy

The extension communicates with a local Node.js proxy server that securely stores the Gemini API key.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   ```bash
   cp ../.env.example .env
   ```
   Add your Gemini API key and configuration inside `backend/.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ALLOWED_ORIGIN=chrome-extension://<your-extension-id>
   PORT=5000
   RATE_LIMIT_PER_MIN=30
   ```
4. Start the proxy server:
   ```bash
   npm start
   ```
   The backend will start listening at `http://localhost:5000`.
