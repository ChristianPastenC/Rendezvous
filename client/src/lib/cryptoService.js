// client/src/lib/cryptoService.js
import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';
import { auth } from './firebase';

const KEY_SIZE = 2048;
const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const STORAGE_KEY_PUBLIC = 'crypto_public_key';
const SESSION_KEY_PRIVATE = 'crypto_private_key_decrypted';
const SESSION_KEY_PASSPHRASE = 'crypto_user_passphrase';

/**
 * A service class to handle all cryptographic operations, including key generation,
 * storage, encryption, and decryption for end-to-end encrypted messaging.
 */
class CryptoService {
  constructor() {
    this.jsEncrypt = new JSEncrypt({ default_key_size: KEY_SIZE });
    this.privateKey = sessionStorage.getItem(SESSION_KEY_PRIVATE);
    this.publicKey = localStorage.getItem(STORAGE_KEY_PUBLIC);
    this.publicKeyCache = new Map();

    if (this.privateKey) {
      this.jsEncrypt.setPrivateKey(this.privateKey);
    }
  }

  /**
   * Checks if the user authenticated using Google as a provider.
   * @param {object} user - The Firebase user object.
   * @returns {boolean} True if the user is a Google auth user, false otherwise.
   */
  isGoogleAuthUser(user) {
    if (!user || !user.providerData) return false;
    return user.providerData.some(provider => provider.providerId === 'google.com');
  }

  /**
   * Derives a key from a passphrase using PBKDF2.
   * @param {string} passphrase - The user's security passphrase.
   * @param {string} salt - The salt for the key derivation.
   * @returns {string} The derived key as a hex string.
   */
  deriveKeyFromPassphrase(passphrase, salt) {
    return CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256 / 32,
      iterations: 10000
    }).toString();
  }

  /**
   * Encrypts a private key using AES with a key derived from a passphrase.
   * @param {string} privateKey - The RSA private key to encrypt.
   * @param {string} passphrase - The user's security passphrase.
   * @returns {string} A JSON string containing the encrypted key and the salt used.
   */
  encryptPrivateKey(privateKey, passphrase) {
    const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
    const derivedKey = this.deriveKeyFromPassphrase(passphrase, salt);
    const encrypted = CryptoJS.AES.encrypt(privateKey, derivedKey).toString();
    return JSON.stringify({ encrypted, salt });
  }

  /**
   * Decrypts a wrapped private key using a passphrase.
   * @param {string} wrappedKey - A JSON string containing the encrypted key and salt.
   * @param {string} passphrase - The user's security passphrase.
   * @returns {string|null} The decrypted private key, or null on failure.
   */
  decryptPrivateKey(wrappedKey, passphrase) {
    try {
      const { encrypted, salt } = JSON.parse(wrappedKey);
      const derivedKey = this.deriveKeyFromPassphrase(passphrase, salt);
      const decrypted = CryptoJS.AES.decrypt(encrypted, derivedKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return null;
    }
  }

  /**
   * Retrieves the security passphrase from session storage or prompts the user for it.
   * For non-Google auth users, it defaults to their email.
   * For Google auth users, it shows a prompt.
   * @param {boolean} [isNewUser=false] - If true, shows a setup message in the prompt.
   * @returns {Promise<string|null>} A promise that resolves with the passphrase or null if canceled.
   */
  async getOrPromptPassphrase(isNewUser = false) {
    const cachedPassphrase = sessionStorage.getItem(SESSION_KEY_PASSPHRASE);
    if (cachedPassphrase) {
      return cachedPassphrase;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const isGoogleAuth = this.isGoogleAuthUser(currentUser);

    if (!isGoogleAuth) {
      const passphrase = currentUser.email;
      sessionStorage.setItem(SESSION_KEY_PASSPHRASE, passphrase);
      return passphrase;
    }

    return new Promise((resolve) => {
      const message = isNewUser
        ? 'Configuración de Seguridad\n\n' +
        'Para proteger tus mensajes cifrados, crea una frase de seguridad.\n' +
        'Esta frase es necesaria para descifrar tus mensajes.\n\n' +
        'IMPORTANTE: Guarda esta frase en un lugar seguro.\n' +
        'Si la olvidas, no podrás leer tus mensajes anteriores.\n\n' +
        'Ingresa tu frase de seguridad (mínimo 8 caracteres):'
        : 'Verificación de Seguridad\n\n' +
        'Ingresa tu frase de seguridad para descifrar tus mensajes:';

      const passphrase = prompt(message);

      if (passphrase && passphrase.trim().length >= 8) {
        sessionStorage.setItem(SESSION_KEY_PASSPHRASE, passphrase.trim());
        resolve(passphrase.trim());
      } else if (passphrase !== null) {
        alert('La frase de seguridad debe tener al menos 8 caracteres.');
        resolve(this.getOrPromptPassphrase(isNewUser));
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Manages the user's cryptographic keys. It tries to fetch existing keys from the server
   * and decrypt them. If no keys are found, it generates a new key pair, encrypts the
   * private key, and stores both on the server.
   * @returns {Promise<{publicKey: string, privateKey: string}>} A promise that resolves with the user's key pair.
   * @throws Will throw an error if the user is not authenticated or cancels the passphrase prompt.
   */
  async generateAndStoreKeys() {
    if (!auth.currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const token = await auth.currentUser.getIdToken();

    try {
      const response = await fetch(`${API_URL}/api/users/me/keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const passphrase = await this.getOrPromptPassphrase(false);

        if (!passphrase) {
          throw new Error('Se requiere la frase de seguridad para continuar');
        }

        const privateKey = this.decryptPrivateKey(data.wrappedPrivateKey, passphrase);

        if (!privateKey) {
          sessionStorage.removeItem(SESSION_KEY_PASSPHRASE);
          alert('Frase de seguridad incorrecta.\n\nPor favor, inténtalo de nuevo.');
          return this.generateAndStoreKeys();
        }

        this.privateKey = privateKey;
        this.publicKey = data.publicKey;
        this.jsEncrypt.setPrivateKey(this.privateKey);

        sessionStorage.setItem(SESSION_KEY_PRIVATE, this.privateKey);
        localStorage.setItem(STORAGE_KEY_PUBLIC, this.publicKey);

        return { publicKey: this.publicKey, privateKey: this.privateKey };
      } else if (response.status === 404) {
        alert('[Crypto] No se encontraron claves existentes. Generando nuevas...');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }

    const passphrase = await this.getOrPromptPassphrase(true);
    if (!passphrase) {
      throw new Error('Se requiere la frase de seguridad para continuar');
    }

    this.jsEncrypt.getKey();
    this.privateKey = this.jsEncrypt.getPrivateKey();
    this.publicKey = this.jsEncrypt.getPublicKey();
    const wrappedPrivateKey = this.encryptPrivateKey(this.privateKey, passphrase);

    try {
      const saveResponse = await fetch(`${API_URL}/api/users/me/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          publicKey: this.publicKey,
          wrappedPrivateKey
        })
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || 'Error al guardar las claves en el servidor');
      }
    } catch (error) {
      throw error;
    }

    sessionStorage.setItem(SESSION_KEY_PRIVATE, this.privateKey);
    localStorage.setItem(STORAGE_KEY_PUBLIC, this.publicKey);

    return { publicKey: this.publicKey, privateKey: this.privateKey };
  }

  /**
   * Returns the current user's public key.
   * @returns {string|null} The public key.
   */
  getPublicKey() {
    return this.publicKey;
  }

  /**
   * Fetches the public key for a given user ID from the API or a local cache.
   * @param {string} userId - The UID of the user whose public key is needed.
   * @returns {Promise<string|null>} A promise that resolves with the public key or null if not found.
   * @async
   */
  async fetchPublicKey(userId) {
    try {
      if (this.publicKeyCache.has(userId)) {
        return this.publicKeyCache.get(userId);
      }

      if (!auth.currentUser) throw new Error('Usuario no autenticado para obtener token.');
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_URL}/api/users/${userId}/key`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return null;

      const data = await response.json();
      this.publicKeyCache.set(userId, data.publicKey);
      return data.publicKey;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches the public keys for all members of a given group.
   * @param {string} groupId - The ID of the group.
   * @returns {Promise<Array<{uid: string, publicKey: string}>>} A promise that resolves with an array of member UIDs and their public keys.
   * @async
   */
  async fetchPublicKeysForGroup(groupId) {
    try {
      if (!auth.currentUser) throw new Error('Usuario no autenticado para obtener token.');
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        return [];
      }

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
    } catch (error) {
      return [];
    }
  }

  /**
   * Encrypts text using a hybrid encryption scheme (AES + RSA).
   * The text is encrypted with a new random AES key, and the AES key itself is encrypted with the recipient's RSA public key.
   * @param {string} text - The plaintext to encrypt.
   * @param {string} recipientPublicKey - The RSA public key of the recipient.
   * @returns {string|null} A JSON string containing the encrypted AES key and the encrypted data, or null on failure.
   */
  encrypt(text, recipientPublicKey) {
    try {
      const aesKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
      const encryptedData = CryptoJS.AES.encrypt(text, aesKey).toString();
      const rsaEncryptor = new JSEncrypt();
      rsaEncryptor.setPublicKey(recipientPublicKey);
      const encryptedAesKey = rsaEncryptor.encrypt(aesKey);
      if (!encryptedAesKey) throw new Error("RSA encryption of AES key failed.");
      return JSON.stringify({ key: encryptedAesKey, data: encryptedData });
    } catch (error) {
      return null;
    }
  }

  /**
   * Decrypts a hybrid-encrypted payload.
   * It first decrypts the AES key using the user's private RSA key, then uses the decrypted AES key to decrypt the actual message data.
   * @param {string} encryptedPayload - The JSON string payload from the `encrypt` method.
   * @returns {string} The decrypted plaintext. Returns an error message string on failure.
   */
  decrypt(encryptedPayload) {
    try {
      const { key: encryptedAesKey, data: encryptedData } = JSON.parse(encryptedPayload);
      const aesKey = this.jsEncrypt.decrypt(encryptedAesKey);
      if (!aesKey) return '[Error: No se pudo descifrar la clave del mensaje]';
      const bytes = CryptoJS.AES.decrypt(encryptedData, aesKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return '[Mensaje no se pudo descifrar]';
    }
  }

  /**
   * Clears all cryptographic keys and passphrases from the current session.
   */
  clearSession() {
    sessionStorage.removeItem(SESSION_KEY_PRIVATE);
    sessionStorage.removeItem(SESSION_KEY_PASSPHRASE);
    this.privateKey = null;
    this.publicKeyCache.clear();
  }
}

/**
 * A singleton instance of the CryptoService.
 */
export const cryptoService = new CryptoService();