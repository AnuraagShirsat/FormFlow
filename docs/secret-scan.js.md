# Documentation: `/scripts/secret-scan.js`

## 1. What It Does
`secret-scan.js` is an automated, zero-dependency pre-commit security verification tool. It scans the entire repository working tree and the `/extension` directory for leaked API keys, tokens, cryptographic private keys, and unapproved `.env` configuration files.

### Execution Command:
```bash
node scripts/secret-scan.js
```
Every engineer on the FormFlow team is required to run this script before pushing code to GitHub.

---

## 2. How It Works Technically
- **Dependency-Free Node.js:** Built using standard Node.js built-ins (`fs`, `path`) without requiring external npm packages or build steps.
- **Dynamic Pattern Construction:** Assembles regex patterns dynamically in memory (e.g. `'AI' + 'za'`, `'sk' + '-'`, `'BEGIN' + ' PRIVATE KEY'`) and explicitly skips its own source file, preventing false positives during self-inspection.
- **Rule Set:**
  1. Google API Key Prefix: Detects exposed Google Cloud and Gemini API credentials.
  2. OpenAI Key Prefix: Detects OpenAI and third-party secret tokens.
  3. Non-empty Gemini Key: Detects accidental hardcoding of Gemini keys (non-empty key assignments).
  4. Private Key Headers: Detects TLS/SSH private certificates (e.g. PKCS8 / RSA headers).
  5. Forbidden `.env` files: Detects `.env`, `.env.local`, `.env.production` etc., permitting only `.env.example`.
- **Safe Violation Reporting:** Emits only the first 4 characters of any matched string alongside file path and line number. Full credentials are never printed to terminal logs.
- **CI/Exit Status:** Exits with status code `1` upon detecting any violation, halting automated pipelines or git workflows. Exits with code `0` when clean.

---

## 3. Judge Questions with Short Answers

**Q: How do you guarantee the Gemini API key was never accidentally pushed to GitHub?**  
**A:** We enforce automated secret scanning via `node scripts/secret-scan.js` before every push, combined with a strict `.gitignore` that permits only `.env.example`. The scanner explicitly searches for Google and OpenAI key prefixes, `GEMINI_API_KEY` assignments, and forbidden environment files.

**Q: Why does the scanner only print the first 4 characters of a match?**  
**A:** Printing full keys in terminal logs or CI output creates a secondary credential leak into build logs and developer consoles. Printing only the first 4 characters provides sufficient context for remediation while protecting the secret.

**Q: Does this scanner run inside the Chrome extension?**  
**A:** No. `secret-scan.js` is a developer utility in `/scripts` executed locally or in CI before code merges into main.

---

## 4. What to Know Before the Judges
- **Run Before Demonstrating:** You can run `node scripts/secret-scan.js` in front of the judges to prove in real time that zero secrets or live keys exist in the repository or extension package.
- **Clean Baseline:** The repository ships with an empty `.env.example` file. All actual keys reside locally in the developer's uncommitted `backend/.env`.

---

## 5. Security Checks Done and Judge Questions About Security

### Security Checks Done:
- **Exclusion of Binary Files:** Skips binary files (`.png`, `.pdf`, `.zip`) to optimize scanning performance and eliminate binary pattern collisions.
- **Ignored Directory Protection:** Skips `.git` and `node_modules` to prevent scanning external package files.
- **Dynamic String Assembly:** Prevents the scanner script from triggering false alarms on its own source code.

### Judge Security Questions & Answers:
**Q: Can an attacker bypass the scanner by renaming a file or using mixed casing?**  
**A:** File traversal uses lowercased extension and name comparisons, and regex checks operate globally across all text lines. The scanner inspects all code files across `/extension`, `/contracts`, `/docs`, `/scripts`, and `/backend`.

**Q: How does this prevent prompt injection or browser attacks?**  
**A:** Secret scanning specifically prevents API key exfiltration and credential compromise at rest. Runtime defenses (like schema validation and content script isolation) handle application-level threats.
