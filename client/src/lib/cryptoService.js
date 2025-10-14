import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';

const KEY_SIZE = 2048;
const STORAGE_KEY_PRIVATE = 'crypto_private_key';
const STORAGE_KEY_PUBLIC = 'crypto_public_key';

class CryptoService {
  constructor() {
    this.jsEncrypt = new JSEncrypt({ default_key_size: KEY_SIZE });
    this.privateKey = localStorage.getItem(STORAGE_KEY_PRIVATE);
    this.publicKey = localStorage.getItem(STORAGE_KEY_PUBLIC);

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

  encrypt(text, recipientPublicKey) {
    try {
      const aesKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);

      const encryptedData = CryptoJS.AES.encrypt(text, aesKey).toString();

      const rsaEncryptor = new JSEncrypt();
      rsaEncryptor.setPublicKey(recipientPublicKey);
      const encryptedAesKey = rsaEncryptor.encrypt(aesKey);

      if (!encryptedAesKey) {
        throw new Error("RSA encryption of AES key failed.");
      }

      return JSON.stringify({
        key: encryptedAesKey,
        data: encryptedData,
      });
    } catch (error) {
      console.error("[Crypto] Hybrid encryption failed:", error);
      return null;
    }
  }

  decrypt(encryptedPayload) {
    try {
      const { key: encryptedAesKey, data: encryptedData } = JSON.parse(encryptedPayload);

      const aesKey = this.jsEncrypt.decrypt(encryptedAesKey);

      if (!aesKey) {
        return '[Error: No se pudo descifrar la clave del mensaje]';
      }

      const bytes = CryptoJS.AES.decrypt(encryptedData, aesKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

      return decryptedData;
    } catch (error) {
      console.error("[Crypto] Hybrid decryption failed:", error);
      return '[Mensaje no se pudo descifrar]';
    }
  }
}

export const cryptoService = new CryptoService();