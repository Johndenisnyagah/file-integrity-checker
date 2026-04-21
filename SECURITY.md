# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | ✅ |

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not open a public GitHub issue**. Instead:

1. Email details to the repository owner via GitHub's private contact
2. Include a description of the vulnerability, steps to reproduce, and potential impact
3. Allow up to 7 days for an initial response

Responsible disclosures will be credited in the changelog.

---

## Security Design Decisions

This tool is designed with the following security properties:

### Electron hardening
- `contextIsolation: true` — renderer runs in a separate context from the main process
- `nodeIntegration: false` — the renderer has no access to Node.js APIs
- `sandbox: false` — required for the preload script; main process handles all privileged operations
- The `contextBridge` exposes a minimal named API (`window.api`) — no passthrough to raw `ipcRenderer`

### Data handling
- All SHA-256 hashing is performed in the main process, not the renderer
- Hashes and file paths are stored locally in SQLite (`userData/data.db`) — no data leaves the machine
- Settings are stored in plain JSON (`userData/settings.json`) — no sensitive data is written there

### Known limitations
- **No tamper detection on the database itself** — the SQLite file could be modified by an attacker with local access; a future version could sign the database or individual baseline records
- **No hash-of-hashes / Merkle tree** — a sophisticated attacker could modify files and update the database; the tool is intended for detection, not prevention
- **No privilege separation** — the app runs with the user's full permissions; it does not require elevation

### What this tool is and is not
This is a **file integrity monitoring** tool suitable for detecting accidental or malicious changes to files you care about. It is **not** a replacement for endpoint detection and response (EDR) software, antivirus, or OS-level audit logging.
