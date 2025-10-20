// src/components/auth/AuthForm.jsx

import React from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

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
        <>
          <svg
            viewBox='0 0 48 48'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            className="h-5 w-5 mr-3"
          >
            <path d='M48 24C48 22.0427 47.8364 20.1273 47.5273 18.2727H24.4364V28.7273H37.8182C37.2364 31.9636 35.6364 34.6182 33.1273 36.3273V42.6182H41.5636C45.6 38.4 48 31.8182 48 24Z' fill='#4285F4'></path>
            <path d='M24.4364 48C30.9818 48 36.4364 45.8182 40.0364 42.6182L32.8364 36.3273C30.6909 37.8182 27.8182 38.7273 24.4364 38.7273C18.2727 38.7273 13.0182 34.8545 11.2 29.5636H2.52727V35.9818C6.32727 43.3455 14.7273 48 24.4364 48Z' fill='#34A853'></path>
            <path d='M11.2 29.5636C10.7273 28.1455 10.4364 26.6182 10.4364 25C10.4364 23.3818 10.7273 21.8545 11.2 20.4364V14.0182H2.52727C.945455 17.1455 0 20.8909 0 25C0 29.1091 .945455 32.8545 2.52727 35.9818L11.2 29.5636Z' fill='#FBBC05'></path>
            <path d='M24.4364 9.27273C28.2545 9.27273 31.3273 10.6545 33.8545 12.9818L40.2182 6.85455C36.4364 3.38182 30.9818 1 24.4364 1C14.7273 1 6.32727 5.65455 2.52727 13.0182L11.2 19.4364C13.0182 14.1455 18.2727 10.2727 24.4364 10.2727V9.27273Z' fill='#EA4335'></path>
          </svg>
        </>
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