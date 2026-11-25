import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cryptoService } from '../../lib/cryptoService';
import { CloseIcon } from '../../assets/Icons';

export interface SafetyParticipant {
  uid: string;
  displayName: string;
  publicKey?: string | null;
}

interface SafetyVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserUid?: string;
  currentUserName?: string;
  participants: SafetyParticipant[];
}

interface ParticipantFingerprint {
  uid: string;
  displayName: string;
  fingerprint: string | null;
  isCurrentUser: boolean;
}

/**
 * Displays SHA-256 SPKI public key safety fingerprints so conversation participants
 * can verify end-to-end encryption integrity out-of-band.
 */
const SafetyVerificationModal = ({
  isOpen,
  onClose,
  currentUserUid,
  currentUserName = 'You',
  participants,
}: SafetyVerificationModalProps) => {
  const { t } = useTranslation();
  const [fingerprints, setFingerprints] = useState<ParticipantFingerprint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadFingerprints = async () => {
      setIsLoading(true);
      try {
        const list: ParticipantFingerprint[] = [];
        const seen = new Set<string>();

        if (currentUserUid) {
          seen.add(currentUserUid);
          const ownKey =
            cryptoService.getPublicKey() || (await cryptoService.fetchPublicKey(currentUserUid));
          const ownFp = await cryptoService.computeKeyFingerprint(ownKey);
          list.push({
            uid: currentUserUid,
            displayName: `${currentUserName} (${t('messages.you', 'You')})`,
            fingerprint: ownFp,
            isCurrentUser: true,
          });
        }

        for (const p of participants) {
          if (seen.has(p.uid)) continue;
          seen.add(p.uid);
          const pubKey = p.publicKey || (await cryptoService.fetchPublicKey(p.uid));
          const fp = await cryptoService.computeKeyFingerprint(pubKey);
          list.push({
            uid: p.uid,
            displayName: p.displayName,
            fingerprint: fp,
            isCurrentUser: false,
          });
        }

        if (!cancelled) {
          setFingerprints(list);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadFingerprints();
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentUserUid, currentUserName, participants, t]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('security.verification.title', 'Encryption Safety Verification')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t(
                'security.verification.subtitle',
                'Compare these SHA-256 SPKI public key fingerprints with your contacts to verify E2EE.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={t('common.close', 'Close')}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('common.loading', 'Loading...')}
            </p>
          ) : (
            fingerprints.map((item) => (
              <div
                key={item.uid}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {item.displayName}
                  </span>
                  {item.fingerprint ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      {t('security.verification.activeKey', 'RSA-2048 Active')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {t('security.verification.missingKey', 'No Public Key')}
                    </span>
                  )}
                </div>
                {item.fingerprint ? (
                  <code className="block font-mono text-xs tracking-wider text-gray-700 bg-white border border-gray-200 rounded px-2.5 py-2 select-all">
                    {item.fingerprint}
                  </code>
                ) : (
                  <p className="text-xs text-amber-700">
                    {t(
                      'security.verification.missingKeyHint',
                      'This user has not published an encryption key yet. They must sign in and unlock their passphrase first.'
                    )}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyVerificationModal;
