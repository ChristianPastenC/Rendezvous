import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { NotificationProvider, useNotification } from '../../context/NotificationContext';
import AuthForm from '../auth/AuthForm';
import SecurityPassphraseModal from '../auth/SecurityPassphraseModal';
import MessageList from '../chat/MessageList';
import type { EncryptedMessage } from '@rendezvous/shared';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
    i18n: { resolvedLanguage: 'en', changeLanguage: vi.fn() },
  }),
}));

const { mockRotatePassphrase, mockDecrypt, mockSubscribe, mockGetKeyVersion, mockHasUnlocked } =
  vi.hoisted(() => ({
    mockRotatePassphrase: vi.fn(),
    mockDecrypt: vi.fn(),
    mockSubscribe: vi.fn(() => () => {}),
    mockGetKeyVersion: vi.fn(() => 1),
    mockHasUnlocked: vi.fn(() => true),
  }));

vi.mock('../../lib/cryptoService', () => ({
  cryptoService: {
    rotatePassphrase: mockRotatePassphrase,
    exportEncryptedKeyBackup: vi.fn().mockResolvedValue('{"format":"backup"}'),
    decrypt: mockDecrypt,
    subscribe: mockSubscribe,
    getKeyVersion: mockGetKeyVersion,
    hasUnlockedPrivateKey: mockHasUnlocked,
  },
}));

describe('Critical React UI Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('NotificationContext (Toasts & Confirm Modal)', () => {
    const TestConsumer = ({ onResult }: { onResult: (res: boolean) => void }) => {
      const { showToast, confirmAction } = useNotification();
      return (
        <div>
          <button type="button" onClick={() => showToast('Profile saved!', 'success')}>
            Trigger Toast
          </button>
          <button
            type="button"
            onClick={() => {
              void confirmAction({
                title: 'Delete Account',
                message: 'Are you sure?',
                confirmLabel: 'Yes, Delete',
                cancelLabel: 'No',
                isDanger: true,
              }).then(onResult);
            }}
          >
            Trigger Confirm
          </button>
        </div>
      );
    };

    it('renders toast notifications and resolves confirmation modal choices', async () => {
      const onResult = vi.fn();
      render(
        <NotificationProvider>
          <TestConsumer onResult={onResult} />
        </NotificationProvider>
      );

      fireEvent.click(screen.getByText('Trigger Toast'));
      expect(screen.getByText('Profile saved!')).toBeTruthy();

      fireEvent.click(screen.getByText('Trigger Confirm'));
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Delete Account')).toBeTruthy();

      fireEvent.click(screen.getByText('Yes, Delete'));
      await waitFor(() => {
        expect(onResult).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('AuthForm (Login & Registration Views)', () => {
    it('switches between login and register views and submits credentials', () => {
      const handleSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      const handleGoogle = vi.fn();
      const toggleView = vi.fn();

      const { rerender } = render(
        <AuthForm
          isLoginView={true}
          displayName=""
          setDisplayName={vi.fn()}
          email="alice@example.com"
          setEmail={vi.fn()}
          password="password123"
          setPassword={vi.fn()}
          confirmPassword=""
          setConfirmPassword={vi.fn()}
          error=""
          handleEmailPasswordSubmit={handleSubmit}
          handleGoogleLogin={handleGoogle}
          toggleView={toggleView}
        />
      );

      fireEvent.click(screen.getByText('auth.googleLogin'));
      expect(handleGoogle).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByText('auth.registerLink'));
      expect(toggleView).toHaveBeenCalledOnce();

      rerender(
        <AuthForm
          isLoginView={false}
          displayName="Alice"
          setDisplayName={vi.fn()}
          email="alice@example.com"
          setEmail={vi.fn()}
          password="password123"
          setPassword={vi.fn()}
          confirmPassword="password123"
          setConfirmPassword={vi.fn()}
          error="pages.auth.errors.passwordMismatch"
          handleEmailPasswordSubmit={handleSubmit}
          handleGoogleLogin={handleGoogle}
          toggleView={toggleView}
        />
      );

      expect(screen.getByText('pages.auth.errors.passwordMismatch')).toBeTruthy();
    });
  });

  describe('SecurityPassphraseModal (Unlock & Passphrase Rotation)', () => {
    it('validates minimum passphrase length on unlock and submits valid passphrase', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <NotificationProvider>
          <SecurityPassphraseModal
            isOpen={true}
            isNewUser={false}
            isRetry={false}
            mode="unlock"
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        </NotificationProvider>
      );

      const input = screen.getByPlaceholderText('Enter passphrase (min. 8 characters)');
      fireEvent.change(input, { target: { value: 'short' } });
      fireEvent.click(screen.getByText('Unlock'));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Passphrase must be at least 8 characters long.')).toBeTruthy();

      fireEvent.change(input, { target: { value: 'valid-passphrase-123' } });
      fireEvent.click(screen.getByText('Unlock'));
      expect(onSubmit).toHaveBeenCalledWith('valid-passphrase-123');
    });

    it('rotates passphrase when current and new passphrases are valid', async () => {
      mockRotatePassphrase.mockResolvedValueOnce(undefined);
      const onRotated = vi.fn();

      render(
        <NotificationProvider>
          <SecurityPassphraseModal
            isOpen={true}
            isNewUser={false}
            isRetry={false}
            mode="rotate"
            onSubmit={vi.fn()}
            onCancel={vi.fn()}
            onRotated={onRotated}
          />
        </NotificationProvider>
      );

      fireEvent.change(screen.getByPlaceholderText('Enter current passphrase'), {
        target: { value: 'current-secret-123' },
      });
      fireEvent.change(screen.getByPlaceholderText('Enter new passphrase (min. 8 characters)'), {
        target: { value: 'new-secret-456' },
      });
      fireEvent.change(screen.getByPlaceholderText('Confirm new passphrase'), {
        target: { value: 'new-secret-456' },
      });

      fireEvent.click(screen.getByText('Update Passphrase'));

      await waitFor(() => {
        expect(mockRotatePassphrase).toHaveBeenCalledWith('current-secret-123', 'new-secret-456');
        expect(onRotated).toHaveBeenCalledOnce();
      });
    });
  });

  describe('MessageList (Pagination, Unread Separator & Optimistic Retry)', () => {
    it('renders messages, unread separator, pagination trigger, and failed-message retry', async () => {
      mockDecrypt.mockResolvedValue(JSON.stringify({ type: 'text', content: 'Hello world!' }));
      Element.prototype.scrollIntoView = vi.fn();

      const onLoadOlder = vi.fn();
      const onRetrySend = vi.fn();

      const messages: EncryptedMessage[] = [
        {
          id: 'msg-1',
          authorId: 'user-1',
          authorInfo: { uid: 'user-1', displayName: 'Alice', photoURL: null },
          createdAt: '2026-01-01T10:00:00.000Z',
          encryptedPayload: { 'user-1': 'cipher-1' },
          status: 'failed',
        },
        {
          id: 'msg-2',
          authorId: 'user-2',
          authorInfo: { uid: 'user-2', displayName: 'Bob', photoURL: null },
          createdAt: '2026-01-01T10:05:00.000Z',
          encryptedPayload: { 'user-1': 'cipher-2' },
          status: 'sent',
        },
      ];

      render(
        <MessageList
          messages={messages}
          currentUserUid="user-1"
          hasMoreMessages={true}
          isLoadingOlder={false}
          lastReadTimestamp="2026-01-01T10:02:00.000Z"
          onLoadOlder={onLoadOlder}
          onRetrySend={onRetrySend}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Hello world!').length).toBe(2);
      });

      // Unread separator appears before msg-2
      expect(screen.getByRole('separator')).toBeTruthy();
      expect(screen.getByText('Unread messages')).toBeTruthy();

      // Load older messages button
      fireEvent.click(screen.getByText('messages.loadOlder'));
      expect(onLoadOlder).toHaveBeenCalledOnce();

      // Failed message retry button
      fireEvent.click(screen.getByText('Retry'));
      expect(onRetrySend).toHaveBeenCalledWith(messages[0]);
    });
  });
});
