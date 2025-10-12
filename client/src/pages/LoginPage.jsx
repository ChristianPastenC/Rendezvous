import React from 'react';

const LoginPage = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="p-8 bg-gray-800 rounded-lg shadow-xl text-center">
        <h1 className="text-3xl font-bold text-white mb-6">Welcome to Rendezvous</h1>
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default LoginPage;