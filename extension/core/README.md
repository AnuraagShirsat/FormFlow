# Core Extension (/extension/core)

**Owner:** Anuraag

## Scope & Responsibilities
- Extension lifecycle, background service worker, and message routing.
- Chrome storage management and local profile persistence.
- Proxy communication layer (talking strictly to Node backend proxy, never Gemini directly).
- Security controls: no `eval`, no `innerHTML`, no dynamic code execution.
