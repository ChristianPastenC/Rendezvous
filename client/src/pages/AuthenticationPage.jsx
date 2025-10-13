import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { syncUserWithBackend } from '../lib/authService';
import AuthLayout from '../components/layout/AuthLayout';

const passwordRegex = /.{8,}/;
const passwordRequirements = 'La contraseña debe tener al menos 8 caracteres.';

const AuthenticationPage = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

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
        console.log('Usuario inició sesión:', userCredential.user);
        await syncUserWithBackend(userCredential.user, false);

      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(userCredential.user, {
          displayName: displayName
        });

        console.log(`Perfil actualizado para el usuario: ${displayName}`);
        console.log('Usuario registrado:', userCredential.user);

        await syncUserWithBackend(userCredential.user, true);
      }

    } catch (firebaseError) {
      console.error(`Error durante ${isLoginView ? 'el inicio de sesión' : 'el registro'}:`, firebaseError.message);
      setError(firebaseError.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      console.log('Usuario autenticado con Google:', result.user);
      await syncUserWithBackend(result.user);

    } catch (error) {
      console.error('Error durante el inicio de sesión con Google:', error);
      setError(error.message);
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

  return (
    <AuthLayout title={isLoginView ? 'Iniciar Sesión' : 'Crear una cuenta'}>
      <form onSubmit={handleEmailPasswordSubmit} noValidate>
        {!isLoginView && (
          <div className='mb-4'>
            <label className='block text-gray-400 text-sm font-bold mb-2' htmlFor='displayName'>
              Nombre
            </label>
            <input
              id='displayName' type='text' value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className='shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline'
              required
            />
          </div>
        )}

        <div className='mb-4'>
          <label className='block text-gray-400 text-sm font-bold mb-2' htmlFor='email'>
            Correo Electrónico
          </label>
          <input
            id='email' type='email' value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline'
            required
          />
        </div>

        <div className='mb-4'>
          <label className='block text-gray-400 text-sm font-bold mb-2' htmlFor='password'>
            Contraseña
          </label>
          <input
            id='password' type='password' value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline'
            required
          />
        </div>

        {!isLoginView && (
          <div className='mb-6'>
            <label className='block text-gray-400 text-sm font-bold mb-2' htmlFor='confirm-password'>
              Confirmar Contraseña
            </label>
            <input
              id='confirm-password'
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className='shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline'
              required
            />
          </div>
        )}

        {error && <p className='text-red-500 text-xs italic mb-4'>{error}</p>}

        <button type='submit' className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors'>
          {isLoginView ? 'Iniciar Sesión' : 'Registrarse'}
        </button>
      </form>

      <div className='my-4 flex items-center before:flex-1 before:border-t before:border-gray-600 after:flex-1 after:border-t after:border-gray-600'>
        <p className='mx-4 text-center text-sm text-gray-400'>O</p>
      </div>

      <button onClick={handleGoogleLogin} className='w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2'>
        <svg className='w-5 h-5' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M48 24C48 22.0427 47.8364 20.1273 47.5273 18.2727H24.4364V28.7273H37.8182C37.2364 31.9636 35.6364 34.6182 33.1273 36.3273V42.6182H41.5636C45.6 38.4 48 31.8182 48 24Z' fill='#4285F4'></path><path d='M24.4364 48C30.9818 48 36.4364 45.8182 40.0364 42.6182L32.8364 36.3273C30.6909 37.8182 27.8182 38.7273 24.4364 38.7273C18.2727 38.7273 13.0182 34.8545 11.2 29.5636H2.52727V35.9818C6.32727 43.3455 14.7273 48 24.4364 48Z' fill='#34A853'></path><path d='M11.2 29.5636C10.7273 28.1455 10.4364 26.6182 10.4364 25C10.4364 23.3818 10.7273 21.8545 11.2 20.4364V14.0182H2.52727C.945455 17.1455 0 20.8909 0 25C0 29.1091 .945455 32.8545 2.52727 35.9818L11.2 29.5636Z' fill='#FBBC05'></path><path d='M24.4364 9.27273C28.2545 9.27273 31.3273 10.6545 33.8545 12.9818L40.2182 6.85455C36.4364 3.38182 30.9818 1 24.4364 1C14.7273 1 6.32727 5.65455 2.52727 13.0182L11.2 19.4364C13.0182 14.1455 18.2727 10.2727 24.4364 10.2727V9.27273Z' fill='#EA4335'></path></svg>
        Iniciar sesión con Google
      </button>

      <p className='mt-6 text-center text-sm text-gray-400'>
        {isLoginView ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
        <button onClick={toggleView} className='ml-1 font-semibold text-blue-500 hover:hover:text-blue-400'>
          {isLoginView ? 'Regístrate' : 'Inicia sesión'}
        </button>
      </p>
    </AuthLayout>
  );
};

export default AuthenticationPage;