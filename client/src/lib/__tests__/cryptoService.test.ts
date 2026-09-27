import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';

vi.mock('../firebase', () => ({
  auth: { currentUser: null },
}));

const arrayBufferToBase64 = (buffer: ArrayBuffer): string =>
  Buffer.from(buffer).toString('base64');

describe('CryptoService (Web Crypto E2EE)', () => {
  beforeAll(() => {
    if (!window.crypto?.subtle) {
      Object.defineProperty(window, 'crypto', {
        value: webcrypto,
        configurable: true,
      });
    }
  });

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.resetModules();
  });

  it('wraps and unwraps a private key using PBKDF2 + AES-GCM', async () => {
    const { cryptoService } = await import('../cryptoService');
    const samplePrivateKey = new TextEncoder().encode('sample-pkcs8-private-key-material').buffer;

    const wrapped = await cryptoService.encryptPrivateKey(samplePrivateKey, 'correct-horse-battery');
    const parsed = JSON.parse(wrapped) as { version: number; salt: string; iv: string; encrypted: string };

    expect(parsed.version).toBe(2);
    expect(parsed.salt).toBeTruthy();
    expect(parsed.iv).toBeTruthy();
    expect(parsed.encrypted).toBeTruthy();

    const unwrapped = await cryptoService.decryptPrivateKey(wrapped, 'correct-horse-battery');
    expect(unwrapped).toBe(arrayBufferToBase64(samplePrivateKey));

    const wrongPassphraseResult = await cryptoService.decryptPrivateKey(wrapped, 'wrong-passphrase');
    expect(wrongPassphraseResult).toBeNull();

    const malformedResult = await cryptoService.decryptPrivateKey('not-json', 'correct-horse-battery');
    expect(malformedResult).toBeNull();
  });

  it('encrypts and decrypts a message roundtrip with RSA-OAEP + AES-GCM', async () => {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    const publicKeyBase64 = arrayBufferToBase64(
      await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
    );
    const privateKeyBase64 = arrayBufferToBase64(
      await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
    );

    sessionStorage.setItem('crypto_private_key_pkcs8', privateKeyBase64);
    localStorage.setItem('crypto_public_key', publicKeyBase64);

    const { cryptoService } = await import('../cryptoService');
    const plaintext = 'Hello Rendezvous E2EE! 🔐🚀';

    const encrypted = await cryptoService.encrypt(plaintext, publicKeyBase64);
    expect(encrypted).not.toBeNull();

    const decrypted = await cryptoService.decrypt(encrypted!);
    expect(decrypted).toBe(plaintext);
  });

  it('returns fallback error string when decrypting tampered or invalid payload', async () => {
    const { cryptoService } = await import('../cryptoService');
    const result = await cryptoService.decrypt('invalid-payload');
    expect(result).toBe('[Message could not be decrypted]');
  });
});
