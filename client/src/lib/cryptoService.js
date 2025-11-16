// client/src/lib/cryptoService.js
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const STORAGE_KEY_PUBLIC = 'crypto_public_key';
const SESSION_KEY_PRIVATE = 'crypto_private_key_pkcs8';
const SESSION_KEY_PASSPHRASE = 'crypto_user_passphrase';
const PBKDF2_ITERATIONS = 100000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
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
  constructor() {
    this.privateKeyBase64 = sessionStorage.getItem(SESSION_KEY_PRIVATE);
    this.publicKey = localStorage.getItem(STORAGE_KEY_PUBLIC);
    this.privateCryptoKey = null;
    this.publicKeyCache = new Map();
    this.importedPublicKeyCache = new Map();
  }

  /**
   * Lazily imports and caches the user's RSA-OAEP private CryptoKey from sessionStorage.
   * @returns {Promise<CryptoKey|null>}
   */
  async getPrivateCryptoKey() {
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

  /**
   * Imports and caches a recipient's RSA-OAEP public key from Base64 SPKI.
   * @param {string} publicKeyBase64
   * @returns {Promise<CryptoKey>}
   */
  async importPublicKey(publicKeyBase64) {
    if (this.importedPublicKeyCache.has(publicKeyBase64)) {
      return this.importedPublicKeyCache.get(publicKeyBase64);
    }
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

  /**
   * Derives an AES-GCM-256 key from a user passphrase and salt using PBKDF2.
   * @param {string} passphrase
   * @param {Uint8Array} salt
   * @returns {Promise<CryptoKey>}
   */
  async deriveWrappingKey(passphrase, salt) {
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
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a PKCS#8 private key buffer using a passphrase-derived AES-GCM key.
   * @param {ArrayBuffer} privateKeyBuffer
   * @param {string} passphrase
   * @returns {Promise<string>} JSON string containing salt, iv, and ciphertext.
   */
  async encryptPrivateKey(privateKeyBuffer, passphrase) {
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

  /**
   * Decrypts a wrapped private key using the user's security passphrase.
   * @param {string} wrappedKey
   * @param {string} passphrase
   * @returns {Promise<string|null>} Base64 PKCS#8 private key, or null if decryption fails.
   */
  async decryptPrivateKey(wrappedKey, passphrase) {
    try {
      const parsed = JSON.parse(wrappedKey);
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

  /**
   * Resolves the security passphrase from sessionStorage or by invoking the UI callback.
   * @param {function({ isNewUser: boolean, isRetry: boolean }): Promise<string|null>} requestPassphrase
   * @param {boolean} isNewUser
   * @param {boolean} isRetry
   * @returns {Promise<string|null>}
   */
  async getOrPromptPassphrase(requestPassphrase, isNewUser = false, isRetry = false) {
    if (!isRetry) {
      const cachedPassphrase = sessionStorage.getItem(SESSION_KEY_PASSPHRASE);
      if (cachedPassphrase) return cachedPassphrase;
    }

    if (!auth.currentUser) {
      throw new Error('User is not authenticated.');
    }

    if (typeof requestPassphrase !== 'function') {
      throw new Error('A passphrase prompt handler is required.');
    }

    const passphrase = await requestPassphrase({ isNewUser, isRetry });
    if (passphrase && passphrase.trim().length >= 8) {
      const trimmed = passphrase.trim();
      sessionStorage.setItem(SESSION_KEY_PASSPHRASE, trimmed);
      return trimmed;
    }

    return null;
  }

  /**
   * Loads existing E2EE keys from the server and decrypts them, or generates a new RSA-OAEP key pair
   * and stores the wrapped private key on the server.
   * @param {function({ isNewUser: boolean, isRetry: boolean }): Promise<string|null>} requestPassphrase
   * @returns {Promise<{ publicKey: string, privateKey: string }>}
   */
  async generateAndStoreKeys(requestPassphrase) {
    if (!auth.currentUser) {
      throw new Error('User is not authenticated.');
    }

    const token = await auth.currentUser.getIdToken();

    const response = await fetch(`${API_URL}/api/users/me/keys`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      let isRetry = false;

      // Retry loop until valid passphrase or user cancellation
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    // No keys found: generate a new RSA-OAEP key pair
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
      const errorData = await saveResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save encryption keys on the server.');
    }

    sessionStorage.setItem(SESSION_KEY_PRIVATE, this.privateKeyBase64);
    localStorage.setItem(STORAGE_KEY_PUBLIC, this.publicKey);

    return { publicKey: this.publicKey, privateKey: this.privateKeyBase64 };
  }

  /**
   * Returns the current user's Base64 SPKI public key.
   * @returns {string|null}
   */
  getPublicKey() {
    return this.publicKey;
  }

  /**
   * Fetches the public key for a given user ID from the API or local cache.
   * @param {string} userId
   * @returns {Promise<string|null>}
   */
  async fetchPublicKey(userId) {
    try {
      if (this.publicKeyCache.has(userId)) {
        return this.publicKeyCache.get(userId);
      }

      if (!auth.currentUser) throw new Error('User is not authenticated.');
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_URL}/api/users/${userId}/key`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return null;

      const data = await response.json();
      this.publicKeyCache.set(userId, data.publicKey);
      return data.publicKey;
    } catch {
      return null;
    }
  }

  /**
   * Fetches public keys for all members of a given group.
   * @param {string} groupId
   * @returns {Promise<Array<{ uid: string, publicKey: string }>>}
   */
  async fetchPublicKeysForGroup(groupId) {
    try {
      if (!auth.currentUser) throw new Error('User is not authenticated.');
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return [];

      const members = await response.json();
      const keys = [];

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

  /**
   * Encrypts plaintext using hybrid encryption (AES-GCM-256 + RSA-OAEP).
   * @param {string} text
   * @param {string} recipientPublicKeyBase64
   * @returns {Promise<string|null>}
   */
  async encrypt(text, recipientPublicKeyBase64) {
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

  /**
   * Decrypts a hybrid-encrypted payload using the user's RSA-OAEP private key.
   * @param {string} encryptedPayload
   * @returns {Promise<string>}
   */
  async decrypt(encryptedPayload) {
    try {
      const { key: encryptedAesKey, iv, data: encryptedData } = JSON.parse(encryptedPayload);
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

  /**
   * Clears all cryptographic keys and passphrases from the current session.
   */
  clearSession() {
    sessionStorage.removeItem(SESSION_KEY_PRIVATE);
    sessionStorage.removeItem(SESSION_KEY_PASSPHRASE);
    this.privateKeyBase64 = null;
    this.privateCryptoKey = null;
    this.publicKeyCache.clear();
  }
}

export const cryptoService = new CryptoService();
