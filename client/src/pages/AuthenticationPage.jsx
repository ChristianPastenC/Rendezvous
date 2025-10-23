import React, { useState, useEffect } from 'react';
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
const passwordRequirements = 'La contraseña debe tener al menos 8 caracteres.';

const AuthenticationPage = () => {
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
          console.error('Error sincronizando usuario:', error);
          setError('Error al sincronizar datos del usuario');
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLoginView) {
      if (!displayName.trim()) {
        setError('Por favor, ingresa tu nombre.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      if (!passwordRegex.test(password)) {
        setError(passwordRequirements);
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
      console.error(`Error durante ${isLoginView ? 'el inicio de sesión' : 'el registro'}:`, firebaseError);

      const errorMessages = {
        'auth/user-not-found': 'Usuario no encontrado.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/email-already-in-use': 'Este correo ya está registrado.',
        'auth/weak-password': 'La contraseña es muy débil.',
        'auth/invalid-email': 'Correo electrónico inválido.',
        'auth/invalid-credential': 'Credenciales inválidas.',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.'
      };

      setError(errorMessages[firebaseError.code] || firebaseError.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;

      await syncUserWithBackend(result.user, isNewUser);

    } catch (error) {
      console.error('Error durante el inicio de sesión con Google:', error);

      const errorMessages = {
        'auth/popup-closed-by-user': 'Inicio de sesión cancelado.',
        'auth/cancelled-popup-request': 'Operación cancelada.',
        'auth/popup-blocked': 'Popup bloqueado por el navegador. Permite popups para este sitio.',
        'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo.'
      };

      setError(errorMessages[error.code] || error.message);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
    setDisplayName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const pageTitle = isLoginView ? 'Inicia sesión en tu cuenta' : 'Crea una nueva cuenta';
  const pageSubtitle = isLoginView ? 'Bienvenido de nuevo' : 'Regístrate para empezar';

  if (loading) {
    return (
      <AuthLayout title="Cargando...">
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