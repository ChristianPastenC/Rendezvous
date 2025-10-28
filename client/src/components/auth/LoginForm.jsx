// src/components/auth/LoginForm.jsx
import PasswordInput from './PasswordInput';
import { useTranslation } from 'react-i18next';

const LoginForm = ({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  error
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div className='space-y-1 text-sm'>
        <label className='block text-gray-700' htmlFor='email'>
          {t('auth.emailLabel')}
        </label>
        <input
          id='email' type='email' value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.emailPlaceholder')}
          className='w-full px-4 py-3 rounded-md border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
          required
        />
      </div>

      <PasswordInput
        id="password"
        label={t('auth.passwordLabel')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('auth.passwordPlaceholder')}
      />

      {error && <p className='text-red-500 text-sm text-center -mt-2'>{error}</p>}

      <button type='submit' className='w-full p-3 text-center rounded-md text-white font-semibold bg-[#3B82F6] hover:bg-[#2563EB] transition-colors'>
        {t('auth.login.submitButton')}
      </button>

    </div>
  );
};

export default LoginForm;