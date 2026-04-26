import { auth } from './firebase';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const STORAGE_KEY_PUBLIC = 'crypto_public_key';
const SESSION_KEY_PRIVATE = 'crypto_private_key_pkcs8';
const SESSION_KEY_PASSPHRASE = 'crypto_user_passphrase';
const PBKDF2_ITERATIONS = 100000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface PassphrasePromptOptions {
  isNewUser: boolean;
  isRetry: boolean;
}

export type RequestPassphraseFn = (options: PassphrasePromptOptions) => Promise<string | null>;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Handles client-side End-to-End Encryption (E2EE) using the browser's native Web Crypto API:
 * - RSA-OAEP (2048-bit, SHA-256) for asymmetric key wrapping
 * - AES-GCM (256-bit) for symmetric message and private-key encryption
 * - PBKDF2 (SHA-256, 100k iterations) for passphrase-based key derivation
 */
class CryptoService {
  private privateKeyBase64: string | null;
  private publicKey: string | null;
  private privateCryptoKey: CryptoKey | null = null;
  private publicKeyCache = new Map<string, string>();
  private importedPublicKeyCache = new Map<string, CryptoKey>();

  constructor() {
    this.privateKeyBase64 = sessionStorage.getItem(SESSION_KEY_PRIVATE);
    this.publicKey = localStorage.getItem(STORAGE_KEY_PUBLIC);
  }

  async getPrivateCryptoKey(): Promise<CryptoKey | null> {
    if (this.privateCryptoKey) return this.privateCryptoKey;
    if (!this.privateKeyBase64) return null;

    this.privateCryptoKey = await window.crypto.subtle.importKey(
      'pkcs8',
      base64ToArrayBuffer(this.privateKeyBase64),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );
    return this.privateCryptoKey;
  }

  async importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    const cached = this.importedPublicKeyCache.get(publicKeyBase64);
    if (cached) return cached;

    const cryptoKey = await window.crypto.subtle.importKey(
      'spki',
      base64ToArrayBuffer(publicKeyBase64),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );
    this.importedPublicKeyCache.set(publicKeyBase64, cryptoKey);
    return cryptoKey;
  }

  async deriveWrappingKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      textEncoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptPrivateKey(privateKeyBuffer: ArrayBuffer, passphrase: string): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const wrappingKey = await this.deriveWrappingKey(passphrase, salt);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      wrappingKey,
      privateKeyBuffer
    );

    return JSON.stringify({
      version: 2,
      salt: arrayBufferToBase64(salt.buffer),
      iv: arrayBufferToBase64(iv.buffer),
      encrypted: arrayBufferToBase64(encryptedBuffer),
    });
  }

  async decryptPrivateKey(wrappedKey: string, passphrase: string): Promise<string | null> {
    try {
      const parsed = JSON.parse(wrappedKey) as {
        salt?: string;
        iv?: string;
        encrypted?: string;
      };
      if (!parsed.salt || !parsed.iv || !parsed.encrypted) return null;

      const salt = new Uint8Array(base64ToArrayBuffer(parsed.salt));
      const iv = new Uint8Array(base64ToArrayBuffer(parsed.iv));
      const ciphertext = base64ToArrayBuffer(parsed.encrypted);

      const wrappingKey = await this.deriveWrappingKey(passphrase, salt);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        wrappingKey,
        ciphertext
      );

      return arrayBufferToBase64(decryptedBuffer);
    } catch {
      return null;
    }
  }

  async getOrPromptPassphrase(
    requestPassphrase: RequestPassphraseFn,
    isNewUser = false,
    isRetry = false
  ): Promise<string | null> {
    if (!isRetry) {
      const cachedPassphrase = sessionStorage.getItem(SESSION_KEY_PASSPHRASE);
      if (cachedPassphrase) return cachedPassphrase;
    }

    if (!auth.currentUser) {
      throw new Error('User is not authenticated.');
    }

    const passphrase = await requestPassphrase({ isNewUser, isRetry });
    if (passphrase && passphrase.trim().length >= 8) {
      const trimmed = passphrase.trim();
      sessionStorage.setItem(SESSION_KEY_PASSPHRASE, trimmed);
      return trimmed;
    }

    return null;
  }

  async generateAndStoreKeys(
    requestPassphrase: RequestPassphraseFn
  ): Promise<{ publicKey: string; privateKey: string }> {
    if (!auth.currentUser) {
      throw new Error('User is not authenticated.');
    }

    const token = await auth.currentUser.getIdToken();

    const response = await fetch(`${API_URL}/api/users/me/keys`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = (await response.json()) as {
        publicKey: string;
        wrappedPrivateKey: string;
      };
      let isRetry = false;

      while (true) {
        const passphrase = await this.getOrPromptPassphrase(requestPassphrase, false, isRetry);
        if (!passphrase) {
          throw new Error('Security passphrase is required to unlock your messages.');
        }

        const decryptedPrivateKeyBase64 = await this.decryptPrivateKey(
          data.wrappedPrivateKey,
          passphrase
        );

        if (decryptedPrivateKeyBase64) {
          this.privateKeyBase64 = decryptedPrivateKeyBase64;
          this.publicKey = data.publicKey;
          this.privateCryptoKey = null;
          await this.getPrivateCryptoKey();

          sessionStorage.setItem(SESSION_KEY_PRIVATE, this.privateKeyBase64);
          localStorage.setItem(STORAGE_KEY_PUBLIC, this.publicKey);
          return { publicKey: this.publicKey, privateKey: this.privateKeyBase64 };
        }

        sessionStorage.removeItem(SESSION_KEY_PASSPHRASE);
        isRetry = true;
      }
    }

    if (response.status !== 404) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const passphrase = await this.getOrPromptPassphrase(requestPassphrase, true, false);
    if (!passphrase) {
      throw new Error('Security passphrase is required to protect your messages.');
    }

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

    this.publicKey = arrayBufferToBase64(spkiBuffer);
    this.privateKeyBase64 = arrayBufferToBase64(pkcs8Buffer);
    this.privateCryptoKey = keyPair.privateKey;

    const wrappedPrivateKey = await this.encryptPrivateKey(pkcs8Buffer, passphrase);

    const saveResponse = await fetch(`${API_URL}/api/users/me/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        publicKey: this.publicKey,
        wrappedPrivateKey,
      }),
    });

    if (!saveResponse.ok) {
      const errorData = (await saveResponse.json().catch(() => ({}))) as { error?: string };
      throw new Error(errorData.error || 'Failed to save encryption keys on the server.');
    }

    sessionStorage.setItem(SESSION_KEY_PRIVATE, this.privateKeyBase64);
    localStorage.setItem(STORAGE_KEY_PUBLIC, this.publicKey);

    return { publicKey: this.publicKey, privateKey: this.privateKeyBase64 };
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  async fetchPublicKey(userId: string): Promise<string | null> {
    try {
      const cached = this.publicKeyCache.get(userId);
      if (cached) return cached;

      if (!auth.currentUser) throw new Error('User is not authenticated.');
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_URL}/api/users/${userId}/key`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return null;

      const data = (await response.json()) as { publicKey: string };
      this.publicKeyCache.set(userId, data.publicKey);
      return data.publicKey;
    } catch {
      return null;
    }
  }

  async fetchPublicKeysForGroup(
    groupId: string
  ): Promise<Array<{ uid: string; publicKey: string }>> {
    try {
      if (!auth.currentUser) throw new Error('User is not authenticated.');
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return [];

      const members = (await response.json()) as Array<{ uid: string; publicKey?: string | null }>;
      const keys: Array<{ uid: string; publicKey: string }> = [];

      for (const member of members) {
        if (member.publicKey) {
          keys.push({ uid: member.uid, publicKey: member.publicKey });
          this.publicKeyCache.set(member.uid, member.publicKey);
        } else {
          const fetchedKey = await this.fetchPublicKey(member.uid);
          if (fetchedKey) keys.push({ uid: member.uid, publicKey: fetchedKey });
        }
      }
      return keys;
    } catch {
      return [];
    }
  }

  async encrypt(text: string, recipientPublicKeyBase64: string): Promise<string | null> {
    try {
      const aesKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedDataBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        textEncoder.encode(text)
      );

      const rawAesKeyBuffer = await window.crypto.subtle.exportKey('raw', aesKey);
      const rsaPublicKey = await this.importPublicKey(recipientPublicKeyBase64);
      const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        rsaPublicKey,
        rawAesKeyBuffer
      );

      return JSON.stringify({
        v: 2,
        key: arrayBufferToBase64(encryptedAesKeyBuffer),
        iv: arrayBufferToBase64(iv.buffer),
        data: arrayBufferToBase64(encryptedDataBuffer),
      });
    } catch {
      return null;
    }
  }

  async decrypt(encryptedPayload: string): Promise<string> {
    try {
      const { key: encryptedAesKey, iv, data: encryptedData } = JSON.parse(encryptedPayload) as {
        key: string;
        iv?: string;
        data: string;
      };
      const privateKey = await this.getPrivateCryptoKey();
      if (!privateKey || !iv) {
        return '[Unable to decrypt message key]';
      }

      const rawAesKeyBuffer = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        base64ToArrayBuffer(encryptedAesKey)
      );

      const aesKey = await window.crypto.subtle.importKey(
        'raw',
        rawAesKeyBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(iv)) },
        aesKey,
        base64ToArrayBuffer(encryptedData)
      );

      return textDecoder.decode(decryptedBuffer);
    } catch {
      return '[Message could not be decrypted]';
    }
  }

  clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY_PRIVATE);
    sessionStorage.removeItem(SESSION_KEY_PASSPHRASE);
    this.privateKeyBase64 = null;
    this.privateCryptoKey = null;
    this.publicKeyCache.clear();
  }
}

export const cryptoService = new CryptoService();
