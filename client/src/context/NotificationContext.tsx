import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

export type ToastVariant = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

interface NotificationContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (result: boolean) => void;
  } | null>(null);
  const nextToastId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextToastId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast]
  );

  const confirmAction = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmChoice = (accepted: boolean) => {
    if (!confirmState) return;
    confirmState.resolve(accepted);
    setConfirmState(null);
  };

  const variantClasses: Record<ToastVariant, string> = {
    info: 'bg-gray-900 text-white border-gray-700',
    success: 'bg-emerald-600 text-white border-emerald-500',
    error: 'bg-red-600 text-white border-red-500',
  };

  return (
    <NotificationContext.Provider value={{ showToast, confirmAction }}>
      {children}

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${variantClasses[toast.variant]}`}
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="opacity-80 hover:opacity-100 text-xs font-bold"
                aria-label={t('common.close', 'Close')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            {confirmState.options.title && (
              <h3 className="text-lg font-semibold text-gray-900">
                {confirmState.options.title}
              </h3>
            )}
            <p className="text-sm text-gray-600 leading-relaxed">
              {confirmState.options.message}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {confirmState.options.cancelLabel || t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChoice(true)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  confirmState.options.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmState.options.confirmLabel || t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return ctx;
};
