// client/src/pages/AuthenticationPage.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { syncUserWithBackend } from '../lib/authService';
import AuthLayout from '../components/layout/AuthLayout';
import AuthForm from '../components/auth/AuthForm';
import { useNavigate } from 'react-router';

const passwordRegex = /.{8,}/;

const AuthenticationPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoginView, setIsLoginView] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await syncUserWithBackend(user, false);
          setCurrentUser(user);
          navigate('/');
        } catch (error) {
          setError(t('pages.auth.errors.syncFailed'));
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, t]);

  /**
   * Handles form submission for both login and registration with email and password.
   * It performs validation, calls the appropriate Firebase authentication method,
   * and syncs the user data with the backend.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   * @async
   */
  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLoginView) {
      if (!displayName.trim()) {
        setError(t('pages.auth.errors.nameRequired'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('pages.auth.errors.passwordMismatch'));
        return;
      }
      if (!passwordRegex.test(password)) {
        setError(t('pages.auth.errors.passwordRequirements'));
        return;
      }
    }

    try {
      let userCredential;
      if (isLoginView) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        await syncUserWithBackend(userCredential.user, false);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName });
        await syncUserWithBackend(userCredential.user, true);
      }
    } catch (firebaseError) {
      const errorKeyMap = {
        'auth/user-not-found': 'pages.auth.errors.userNotFound',
        'auth/wrong-password': 'pages.auth.errors.wrongPassword',
        'auth/email-already-in-use': 'pages.auth.errors.emailInUse',
        'auth/weak-password': 'pages.auth.errors.weakPassword',
        'auth/invalid-email': 'pages.auth.errors.invalidEmail',
        'auth/invalid-credential': 'pages.auth.errors.invalidCredential',
        'auth/too-many-requests': 'pages.auth.errors.tooManyRequests'
      };

      const errorKey = errorKeyMap[firebaseError.code];
      setError(errorKey ? t(errorKey) : firebaseError.message);
    }
  };

  /**
   * Handles the Google Sign-In process using a popup.
   * On success, it syncs the user data with the backend.
   * @async
   */
  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;

      await syncUserWithBackend(result.user, isNewUser);

    } catch (error) {
      const errorKeyMap = {
        'auth/popup-closed-by-user': 'pages.auth.errors.popupClosed',
        'auth/cancelled-popup-request': 'pages.auth.errors.popupCancelled',
        'auth/popup-blocked': 'pages.auth.errors.popupBlocked',
        'auth/account-exists-with-different-credential': 'pages.auth.errors.accountExists'
      };

      const errorKey = errorKeyMap[error.code];
      setError(errorKey ? t(errorKey) : error.message);
    }
  };

  /**
   * Toggles the view between the login and registration forms.
   * It also resets all form fields and error messages.
   */
  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
    setDisplayName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const pageTitle = isLoginView
    ? t('pages.auth.titleLogin')
    : t('pages.auth.titleRegister');

  const pageSubtitle = isLoginView
    ? t('pages.auth.subtitleLogin')
    : t('pages.auth.subtitleRegister');

  if (loading) {
    return (
      <AuthLayout title={t('pages.auth.loading')}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={pageTitle} subtitle={pageSubtitle}>
      <AuthForm
        isLoginView={isLoginView}
        displayName={displayName}
        setDisplayName={setDisplayName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        error={error}
        handleEmailPasswordSubmit={handleEmailPasswordSubmit}
        handleGoogleLogin={handleGoogleLogin}
        toggleView={toggleView}
      />
    </AuthLayout>
  );
};

export default AuthenticationPage;