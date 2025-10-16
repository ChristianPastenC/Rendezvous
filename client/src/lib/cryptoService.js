import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';
import { auth } from './firebase'; // Importar auth directamente

const KEY_SIZE = 2048;
const STORAGE_KEY_PRIVATE = 'crypto_private_key';
const STORAGE_KEY_PUBLIC = 'crypto_public_key';

class CryptoService {
  constructor() {
    this.jsEncrypt = new JSEncrypt({ default_key_size: KEY_SIZE });
    this.privateKey = localStorage.getItem(STORAGE_KEY_PRIVATE);
    this.publicKey = localStorage.getItem(STORAGE_KEY_PUBLIC);
    this.publicKeyCache = new Map();

    if (this.privateKey) {
      this.jsEncrypt.setPrivateKey(this.privateKey);
    }
  }

  async generateAndStoreKeys() {
    if (this.privateKey && this.publicKey) {
      return { publicKey: this.publicKey, privateKey: this.privateKey };
    }
    this.jsEncrypt.getKey();
    this.privateKey = this.jsEncrypt.getPrivateKey();
    this.publicKey = this.jsEncrypt.getPublicKey();
    localStorage.setItem(STORAGE_KEY_PRIVATE, this.privateKey);
    localStorage.setItem(STORAGE_KEY_PUBLIC, this.publicKey);
    return { publicKey: this.publicKey, privateKey: this.privateKey };
  }

  getPublicKey() {
    return this.publicKey;
  }

  async fetchPublicKey(userId) {
    try {
      if (this.publicKeyCache.has(userId)) {
        return this.publicKeyCache.get(userId);
      }

      if (!auth.currentUser) throw new Error('Usuario no autenticado para obtener token.');
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`http://localhost:3000/api/users/${userId}/key`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return null;

      const data = await response.json();
      this.publicKeyCache.set(userId, data.publicKey);
      return data.publicKey;
    } catch (error) {
      console.error(`[Crypto] Error al obtener clave pública de ${userId}:`, error);
      return null;
    }
  }

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
      console.error("[Crypto] Hybrid encryption failed:", error);
      return null;
    }
  }

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
}

export const cryptoService = new CryptoService();