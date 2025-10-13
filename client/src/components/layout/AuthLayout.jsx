// src/components/auth/AuthLayout.jsx

const AuthLayout = ({ title, children }) => {
  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-900 text-white'>
      <div className='p-8 bg-gray-800 rounded-lg shadow-xl w-full max-w-sm'>
        <h1 className='text-3xl font-bold mb-6 text-center'>
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;