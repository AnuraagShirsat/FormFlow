# Scripts (/scripts)

**Owner:** Anuraag

## Scope & Responsibilities
- Developer automation scripts (verification, lint checks, contract validation).
- Test runners and fixture validation scripts.
- Packaging utilities for extension release.

## Available Scripts
- `node scripts/secret-scan.js`: Scans the entire repo and extension for credential leaks before git push.
- `scripts/scanner-test.html`: Standalone browser test page for verifying `window.FormFlow.scanForm()`.
