# Security Policy

## Supported Versions

Only the latest state of the `main` branch is actively supported with security updates.

| Version / Branch | Supported          |
| ---------------- | ------------------ |
| `main`           | :white_check_mark: |
| Older commits    | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in **Rendezvous** (such as an authentication bypass, XSS vector, E2EE implementation flaw, or insecure Firestore/Storage rule), please report it responsibly:

1. **Do not** open a public GitHub issue with exploit details.
2. Use GitHub's **Private Vulnerability Reporting** (**Security → Advisories → Report a vulnerability**) if enabled, or contact the repository owner directly via the email listed on their GitHub profile.
3. Include steps to reproduce, affected files/endpoints, and potential impact.

You can expect an acknowledgment within **72 hours** and a remediation plan once the issue is confirmed.

## Security Architecture

For technical details on Rendezvous's client-side Web Crypto E2EE (`RSA-OAEP` + `AES-GCM` + `PBKDF2`), Firebase ID token verification, Zod input validation, and upload hardening, see [docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md).
