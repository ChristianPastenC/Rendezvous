import { useState, useEffect } from 'react';
import { cryptoService } from '../lib/cryptoService';

/**
 * Asynchronously decrypts an E2EE payload for the current user using Web Crypto API.
 * @param {string|null|undefined} encryptedData
 * @returns {{ decryptedText: string|null, isDecrypting: boolean }}
 */
export const useDecryptedMessage = (encryptedData) => {
  const [decryptedText, setDecryptedText] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(Boolean(encryptedData));

  useEffect(() => {
    if (!encryptedData) {
      setDecryptedText(null);
      setIsDecrypting(false);
      return;
    }

    let cancelled = false;
    setIsDecrypting(true);

    cryptoService.decrypt(encryptedData).then((result) => {
      if (!cancelled) {
        setDecryptedText(result);
        setIsDecrypting(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [encryptedData]);

  return { decryptedText, isDecrypting };
};
