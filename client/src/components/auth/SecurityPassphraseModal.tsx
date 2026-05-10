import { useState, type FormEvent } from 'react';

interface SecurityPassphraseModalProps {
  isOpen: boolean;
  isNewUser: boolean;
  isRetry: boolean;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
}

/**
 * Modal for creating or entering the user's E2EE security passphrase.
 * Replaces native browser prompt()/alert() dialogs.
 */
const SecurityPassphraseModal = ({
  isOpen,
  isNewUser,
  isRetry,
  onSubmit,
  onCancel,
}: SecurityPassphraseModalProps) => {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passphrase.trim().length < 8) {
      setError('Passphrase must be at least 8 characters long.');
      return;
    }
    const value = passphrase.trim();
    setPassphrase('');
    setError('');
    onSubmit(value);
  };

  const handleCancel = () => {
    setPassphrase('');
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {isNewUser ? 'Set Up Encryption Passphrase' : 'Unlock Encrypted Messages'}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isNewUser
            ? 'Create a security passphrase (minimum 8 characters) to protect your private encryption key. Keep it safe—if you lose it, previous messages cannot be recovered.'
            : 'Enter your security passphrase to decrypt your messages in this session.'}
        </p>

        {(isRetry || error) && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error || 'Incorrect passphrase. Please try again.'}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
              if (error) setError('');
            }}
            placeholder="Enter passphrase (min. 8 characters)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {isNewUser ? 'Save & Continue' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecurityPassphraseModal;
