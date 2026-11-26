import { useState, useEffect, useCallback } from 'react';
import { cryptoService } from '../lib/cryptoService';

/**
 * Asynchronously decrypts an E2EE payload for the current user using Web Crypto API.
 * Automatically re-runs when the user's private key is unlocked or when retry() is called.
 */
export const useDecryptedMessage = (
  encryptedData: string | null | undefined
): {
  decryptedText: string | null;
  isDecrypting: boolean;
  isKeyLocked: boolean;
  hasDecryptionError: boolean;
  retryDecryption: () => void;
} => {
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(Boolean(encryptedData));
  const [keyVersion, setKeyVersion] = useState<number>(() => cryptoService.getKeyVersion());
  const [manualRetryCount, setManualRetryCount] = useState(0);

  useEffect(() => {
    return cryptoService.subscribe(() => {
      setKeyVersion(cryptoService.getKeyVersion());
    });
  }, []);

  const retryDecryption = useCallback(() => {
    setManualRetryCount((c) => c + 1);
  }, []);

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
  }, [encryptedData, keyVersion, manualRetryCount]);

  const isKeyLocked =
    decryptedText === '[Unable to decrypt message key]' || !cryptoService.hasUnlockedPrivateKey();
  const hasDecryptionError =
    decryptedText === '[Unable to decrypt message key]' ||
    decryptedText === '[Message could not be decrypted]';

  return {
    decryptedText,
    isDecrypting,
    isKeyLocked,
    hasDecryptionError,
    retryDecryption,
  };
};
