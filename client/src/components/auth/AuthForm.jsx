// src/components/auth/AuthForm.jsx

import React from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { GoogleIcon } from '../../assets/Icons';

const AuthForm = ({
  isLoginView,
  displayName, setDisplayName,
  email, setEmail,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  error,
  handleEmailPasswordSubmit,
  handleGoogleLogin,
  toggleView,
}) => {
  return (
    <>
      <form onSubmit={handleEmailPasswordSubmit} noValidate>
        {isLoginView ? (
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={error}
          />
        ) : (
          <RegisterForm
            displayName={displayName}
            setDisplayName={setDisplayName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            error={error}
          />
        )}
      </form>
      <div className="relative flex justify-center text-xs uppercase my-6">
        <span className="bg-white px-2 text-gray-500">
          O
        </span>
        <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300 -z-10"></div>
      </div>
      <button
        onClick={handleGoogleLogin}
        className='w-full flex items-center justify-center p-3 border border-gray-300 rounded-md shadow-sm text-gray-700 font-medium bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors'
      >
        <GoogleIcon 
          className='h-5 w-5 mr-3'
        />
        Continuar con Google
      </button>

      <p className='text-sm text-center text-gray-600 mt-6'>
        {isLoginView ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
        <button onClick={toggleView} className='ml-1 font-semibold text-[#3B82F6] hover:underline '>
          {isLoginView ? 'Regístrate' : 'Inicia sesión'}
        </button>
      </p>
    </>
  );
};

export default AuthForm;