import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';

const mockCurrentUser = {
  uid: 'user-test-1',
  getIdToken: vi.fn().mockResolvedValue('mock-jwt-token'),
};

vi.mock('../firebase', () => ({
  auth: {
    get currentUser() {
      return mockCurrentUser;
    },
  },
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
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('wraps and unwraps a private key using PBKDF2 + AES-GCM', async () => {
    const { cryptoService } = await import('../cryptoService');
    const samplePrivateKey = new TextEncoder().encode('sample-pkcs8-private-key-material').buffer;

    const wrapped = await cryptoService.encryptPrivateKey(samplePrivateKey, 'correct-horse-battery');
    const parsed = JSON.parse(wrapped) as {
      version: number;
      salt: string;
      iv: string;
      encrypted: string;
    };

    expect(parsed.version).toBe(2);
    expect(parsed.salt).toBeTruthy();
    expect(parsed.iv).toBeTruthy();
    expect(parsed.encrypted).toBeTruthy();

    const unwrapped = await cryptoService.decryptPrivateKey(wrapped, 'correct-horse-battery');
    expect(unwrapped).toBe(arrayBufferToBase64(samplePrivateKey));

    const wrongPassphraseResult = await cryptoService.decryptPrivateKey(
      wrapped,
      'wrong-passphrase'
    );
    expect(wrongPassphraseResult).toBeNull();

    const malformedResult = await cryptoService.decryptPrivateKey(
      'not-json',
      'correct-horse-battery'
    );
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

  it('computes a deterministic SHA-256 safety fingerprint from an SPKI public key', async () => {
    const { cryptoService } = await import('../cryptoService');
    const sampleSpki = arrayBufferToBase64(
      new TextEncoder().encode('sample-spki-public-key-bytes').buffer
    );

    const fp1 = await cryptoService.computeKeyFingerprint(sampleSpki);
    const fp2 = await cryptoService.computeKeyFingerprint(sampleSpki);

    expect(fp1).toBeTruthy();
    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^([0-9A-F]{4} ){7}[0-9A-F]{4}$/);
    expect(await cryptoService.computeKeyFingerprint(null)).toBeNull();
  });

  it('rotates security passphrase without losing access to historical messages', async () => {
    const { cryptoService } = await import('../cryptoService');

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
    const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const pkcs8Buffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const publicKeyBase64 = arrayBufferToBase64(spkiBuffer);

    const initialWrapped = await cryptoService.encryptPrivateKey(pkcs8Buffer, 'old-passphrase-123');
    const historicalCiphertext = await cryptoService.encrypt('Historical message', publicKeyBase64);

    let savedWrappedKey = initialWrapped;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (!init?.method || init.method === 'GET') {
        return new Response(
          JSON.stringify({
            publicKey: publicKeyBase64,
            wrappedPrivateKey: savedWrappedKey,
          }),
          { status: 200 }
        );
      }
      const body = JSON.parse(init.body as string) as {
        publicKey: string;
        wrappedPrivateKey: string;
      };
      savedWrappedKey = body.wrappedPrivateKey;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    await cryptoService.rotatePassphrase('old-passphrase-123', 'new-passphrase-456');

    expect(savedWrappedKey).not.toBe(initialWrapped);
    expect(await cryptoService.decryptPrivateKey(savedWrappedKey, 'old-passphrase-123')).toBeNull();
    expect(
      await cryptoService.decryptPrivateKey(savedWrappedKey, 'new-passphrase-456')
    ).toBeTruthy();

    // Verify historical message still decrypts cleanly
    const decryptedHistorical = await cryptoService.decrypt(historicalCiphertext!);
    expect(decryptedHistorical).toBe('Historical message');
  });

  it('returns fallback error string when decrypting tampered or invalid payload', async () => {
    const { cryptoService } = await import('../cryptoService');
    const result = await cryptoService.decrypt('invalid-payload');
    expect(result).toBe('[Message could not be decrypted]');
  });
});
