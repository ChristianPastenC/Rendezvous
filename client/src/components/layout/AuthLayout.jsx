// src/components/auth/AuthLayout.jsx

const AuthLayout = ({ title, subtitle, children }) => {
  return (
    <div 
      className='flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 sm:p-6'
    >
      <div className="mb-8 text-center">
        <img 
          src="/vite.svg"
          alt="Logo" 
          className="mx-auto h-16 w-auto mb-4" 
        />

        <h1 
          className='text-3xl sm:text-4xl font-extrabold text-gray-900 mt-4 max-w-sm sm:max-w-md mx-auto leading-tight'
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 text-sm mt-2">
            {subtitle}
          </p>
        )}
      </div>

      <div 
        className='w-full max-w-md bg-white rounded-lg shadow-md p-6 sm:p-8 space-y-6 border border-gray-200'
      >
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;