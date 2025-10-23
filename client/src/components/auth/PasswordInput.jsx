// src/components/auth/PasswordInput.jsx

import React, { useState } from 'react';
import { EyeClosedIcon, EyeOpenIcon } from '../../assets/Icons';

const PasswordInput = ({ value, onChange, placeholder, id, label }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className='space-y-1 text-sm'>
      <label htmlFor={id} className='block text-gray-700'>
        {label}
      </label>
      <div className='relative'>
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className='w-full px-4 py-3 pr-10 rounded-md border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
          required
        />
        <button
          type='button'
          onClick={() => setShowPassword(!showPassword)}
          className='absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none'
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPassword ? (
            <EyeClosedIcon className='h-5 w-5' />
          ) : (
            <EyeOpenIcon className='h-5 w-5' />
          )}
        </button>
      </div>
    </div>
  );
};

export default PasswordInput;