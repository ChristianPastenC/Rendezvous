import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cryptoService } from '../../lib/cryptoService';
import { useNotification } from '../../context/NotificationContext';

export type PassphraseModalMode = 'unlock' | 'rotate';

interface SecurityPassphraseModalProps {
  isOpen: boolean;
  isNewUser: boolean;
  isRetry: boolean;
  mode?: PassphraseModalMode;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
  onRotated?: () => void;
}

/**
 * Modal for creating, entering, rotating, or backing up the user's E2EE security passphrase.
 */
const SecurityPassphraseModal = ({
  isOpen,
  isNewUser,
  isRetry,
  mode = 'unlock',
  onSubmit,
  onCancel,
  onRotated,
}: SecurityPassphraseModalProps) => {
  const { t } = useTranslation();
  const { showToast } = useNotification();
  const [passphrase, setPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isRotating, setIsRotating] = useState(false);

  if (!isOpen) return null;

  const isRotateMode = mode === 'rotate';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isRotateMode) {
      if (passphrase.trim().length < 8) {
        setError(t('security.passphrase.currentMinLength', 'Current passphrase must be at least 8 characters long.'));
        return;
      }
      if (newPassphrase.trim().length < 8) {
        setError(t('security.passphrase.newMinLength', 'New passphrase must be at least 8 characters long.'));
        return;
      }
      if (newPassphrase.trim() !== confirmPassphrase.trim()) {
        setError(t('security.passphrase.mismatch', 'New passphrases do not match.'));
        return;
      }
      setIsRotating(true);
      setError('');
      try {
        await cryptoService.rotatePassphrase(passphrase, newPassphrase);
        setPassphrase('');
        setNewPassphrase('');
        setConfirmPassphrase('');
        showToast(t('security.passphrase.rotateSuccess', 'Security passphrase updated successfully.'), 'success');
        onRotated?.();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('security.passphrase.rotateError', 'Failed to rotate security passphrase.')
        );
      } finally {
        setIsRotating(false);
      }
      return;
    }

    if (passphrase.trim().length < 8) {
      setError(t('security.passphrase.minLength', 'Passphrase must be at least 8 characters long.'));
      return;
    }
    const value = passphrase.trim();
    setPassphrase('');
    setError('');
    onSubmit(value);
  };

  const handleExportBackup = async () => {
    try {
      const backupJson = await cryptoService.exportEncryptedKeyBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rendezvous-key-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(t('security.passphrase.backupSuccess', 'Encrypted key backup downloaded.'), 'success');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('security.passphrase.backupError', 'Failed to export encrypted key backup.')
      );
    }
  };

  const handleCancel = () => {
    setPassphrase('');
    setNewPassphrase('');
    setConfirmPassphrase('');
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {isRotateMode
            ? t('security.passphrase.rotateTitle', 'Change Encryption Passphrase & Backup')
            : isNewUser
              ? t('security.passphrase.setupTitle', 'Set Up Encryption Passphrase')
              : t('security.passphrase.unlockTitle', 'Unlock Encrypted Messages')}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isRotateMode
            ? t(
                'security.passphrase.rotateSubtitle',
                'Re-wrap your private encryption key with a new passphrase without losing access to existing messages.'
              )
            : isNewUser
              ? t(
                  'security.passphrase.setupSubtitle',
                  'Create a security passphrase (minimum 8 characters) to protect your private encryption key. Keep it safe—if you lose it, previous messages cannot be recovered.'
                )
              : t(
                  'security.passphrase.unlockSubtitle',
                  'Enter your security passphrase to decrypt your messages in this session.'
                )}
        </p>

        {(isRetry || error) && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error || t('security.passphrase.incorrect', 'Incorrect passphrase. Please try again.')}
          </p>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          <div>
            {isRotateMode && (
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('security.passphrase.currentLabel', 'Current Passphrase')}
              </label>
            )}
            <input
              type="password"
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                if (error) setError('');
              }}
              placeholder={
                isRotateMode
                  ? t('security.passphrase.currentPlaceholder', 'Enter current passphrase')
                  : t('security.passphrase.placeholder', 'Enter passphrase (min. 8 characters)')
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
          </div>

          {isRotateMode && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('security.passphrase.newLabel', 'New Passphrase')}
                </label>
                <input
                  type="password"
                  value={newPassphrase}
                  onChange={(e) => {
                    setNewPassphrase(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={t('security.passphrase.newPlaceholder', 'Enter new passphrase (min. 8 characters)')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('security.passphrase.confirmLabel', 'Confirm New Passphrase')}
                </label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => {
                    setConfirmPassphrase(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={t('security.passphrase.confirmPlaceholder', 'Confirm new passphrase')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => void handleExportBackup()}
                  className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  {t('security.passphrase.downloadBackup', 'Download Encrypted Key Backup (.json)')}
                </button>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isRotating}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isRotating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isRotateMode
                ? isRotating
                  ? t('security.passphrase.updating', 'Updating...')
                  : t('security.passphrase.updateButton', 'Update Passphrase')
                : isNewUser
                  ? t('security.passphrase.saveButton', 'Save & Continue')
                  : t('security.passphrase.unlockButton', 'Unlock')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecurityPassphraseModal;
