# Security & End-to-End Encryption Architecture

## 1. End-to-End Encryption (E2EE)

Rendezvous implements client-side E2EE using the browser's native **Web Crypto API** (`window.crypto.subtle`):

- **Asymmetric Keypair:** Each user generates an `RSA-OAEP` 2048-bit keypair (`SHA-256`) on the client.
  - The SPKI public key is published to Firestore (`/users/{uid}.publicKey`).
  - The PKCS#8 private key never leaves the client in plaintext.
- **Passphrase-Protected Key Wrapping & Rotation:**
  - Before uploading the private key backup to Firestore (`wrappedPrivateKey`), the client derives a 256-bit `AES-GCM` wrapping key from the user's security passphrase using `PBKDF2` (`SHA-256`, 100,000 iterations, random 16-byte salt) and encrypts the PKCS#8 key with a random 12-byte IV.
  - Users can rotate their security passphrase (`cryptoService.rotatePassphrase`) or download an offline encrypted key backup bundle (`.json`) without regenerating their RSA keypair, preserving access to all historical messages.
  - Participants can verify each other's SHA-256 SPKI public key safety fingerprints out-of-band via the in-chat **E2EE Verify** modal.
  - Because key derivation and unwrapping run exclusively on the client, the server cannot decrypt stored private keys or message payloads.
- **Hybrid Message Encryption (Per-Message Ephemeral Key):**
  - For each message, the client generates a fresh 256-bit `AES-GCM` key and encrypts the message plaintext.
  - The AES key is encrypted separately with each participant's `RSA-OAEP` public key, producing a recipient-keyed `encryptedPayload` map (`Record<uid, string>`).

## 2. Authentication & API Validation

- **Firebase ID Tokens:** All protected REST routes validate the `Authorization: Bearer <idToken>` header using `firebase-admin` (`auth.verifyIdToken`).
- **Socket.IO Authentication:** Socket connections verify the Firebase ID token during handshake middleware before registering presence or joining rooms.
- **Input Validation:** Request bodies are validated with **Zod** schemas (`server/src/utils/validation.ts`), and JSON payloads are capped at `1mb`.
- **CORS:** Restricted to explicit origins configured via `CORS_ORIGIN`.

## 3. File Upload Hardening

- Client-side validation (`client/src/utils/allowedFiles.ts`) enforces a 10 MB limit and an explicit allowlist of safe document, image, and source-code formats, rejecting active web/script types (`.html`, `.js`, `.svg`, `.sh`).
- Server-side Firebase security rules (`firestore.rules` and `storage.rules`) enforce authentication, membership checks, file size limits, and content-type restrictions.
