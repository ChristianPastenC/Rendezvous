import { useState, useEffect } from 'react';
import { cryptoService } from '../lib/cryptoService';

/**
 * Asynchronously decrypts an E2EE payload for the current user using Web Crypto API.
 */
export const useDecryptedMessage = (
  encryptedData: string | null | undefined
): { decryptedText: string | null; isDecrypting: boolean } => {
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(Boolean(encryptedData));

  useEffect(() => {
    if (!encryptedData) {
      setDecryptedText(null);
      setIsDecrypting(false);
      return;
    }

    let cancelled = false;
    setIsDecrypting(true);

    void cryptoService.decrypt(encryptedData).then((result) => {
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
