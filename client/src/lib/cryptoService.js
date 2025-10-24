import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';
import { auth } from './firebase';

const KEY_SIZE = 2048;
const STORAGE_KEY_PUBLIC = 'crypto_public_key';
const SESSION_KEY_PRIVATE = 'crypto_private_key_decrypted';
const SESSION_KEY_PASSPHRASE = 'crypto_user_passphrase';

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

  isGoogleAuthUser(user) {
    if (!user || !user.providerData) return false;
    return user.providerData.some(provider => provider.providerId === 'google.com');
  }

  deriveKeyFromPassphrase(passphrase, salt) {
    return CryptoJS.PBKDF2(passphrase, salt, {
      keySize: 256 / 32,
      iterations: 10000
    }).toString();
  }

  encryptPrivateKey(privateKey, passphrase) {
    const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
    const derivedKey = this.deriveKeyFromPassphrase(passphrase, salt);
    const encrypted = CryptoJS.AES.encrypt(privateKey, derivedKey).toString();
    return JSON.stringify({ encrypted, salt });
  }

  decryptPrivateKey(wrappedKey, passphrase) {
    try {
      const { encrypted, salt } = JSON.parse(wrappedKey);
      const derivedKey = this.deriveKeyFromPassphrase(passphrase, salt);
      const decrypted = CryptoJS.AES.decrypt(encrypted, derivedKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('[Crypto] Error al descifrar clave privada:', error);
      return null;
    }
  }

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

  async generateAndStoreKeys() {
    if (!auth.currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const token = await auth.currentUser.getIdToken();

    try {
      const response = await fetch(`http://localhost:3000/api/users/me/keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();

        if (data.publicKey && data.wrappedPrivateKey) {
          console.log('[Crypto] Recuperando claves existentes...');
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

          console.log('[Crypto] Claves recuperadas exitosamente');
          return { publicKey: this.publicKey, privateKey: this.privateKey };
        }
      }
    } catch (error) {
      if (!error.message || !error.message.includes('404')) {
        console.error('[Crypto] Error al verificar claves existentes:', error);
      }
    }

    console.log('[Crypto] Generando nuevas claves...');
    const passphrase = await this.getOrPromptPassphrase(true);

    if (!passphrase) {
      throw new Error('Se requiere la frase de seguridad para continuar');
    }

    this.jsEncrypt.getKey();
    this.privateKey = this.jsEncrypt.getPrivateKey();
    this.publicKey = this.jsEncrypt.getPublicKey();

    const wrappedPrivateKey = this.encryptPrivateKey(this.privateKey, passphrase);

    try {
      const saveResponse = await fetch(`http://localhost:3000/api/users/me/keys`, {
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

      console.log('[Crypto] Nuevas claves guardadas exitosamente');
    } catch (error) {
      console.error('[Crypto] Error al guardar claves:', error);
      throw error;
    }

    sessionStorage.setItem(SESSION_KEY_PRIVATE, this.privateKey);
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

  async fetchPublicKeysForGroup(groupId) {
    try {
      if (!auth.currentUser) throw new Error('Usuario no autenticado para obtener token.');
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`http://localhost:3000/api/groups/${groupId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.error(`[Crypto] Error al obtener miembros del grupo ${groupId}`);
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
      console.error(`[Crypto] Error al obtener claves para el grupo ${groupId}:`, error);
      return [];
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

  clearSession() {
    sessionStorage.removeItem(SESSION_KEY_PRIVATE);
    sessionStorage.removeItem(SESSION_KEY_PASSPHRASE);
    this.privateKey = null;
    this.publicKeyCache.clear();
    console.log('[Crypto] Sesión limpiada');
  }
}

export const cryptoService = new CryptoService();