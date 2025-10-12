import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from '../lib/firebase';

const LoginPage = () => {
  const provider = new GoogleAuthProvider();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);

      const user = result.user;
      console.log("Usuario autenticado:", user);

    } catch (error) {
      console.error("Error durante el inicio de sesión con Google:", error);
      const errorCode = error.code;
      const errorMessage = error.message;
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="p-8 bg-gray-800 rounded-lg shadow-xl text-center">
        <h1 className="text-3xl font-bold text-white mb-6">Welcome to Rendezvous</h1>
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M48 24C48 22.0427 47.8364 20.1273 47.5273 18.2727H24.4364V28.7273H37.8182C37.2364 31.9636 35.6364 34.6182 33.1273 36.3273V42.6182H41.5636C45.6 38.4 48 31.8182 48 24Z" fill="#4285F4"></path><path d="M24.4364 48C30.9818 48 36.4364 45.8182 40.0364 42.6182L32.8364 36.3273C30.6909 37.8182 27.8182 38.7273 24.4364 38.7273C18.2727 38.7273 13.0182 34.8545 11.2 29.5636H2.52727V35.9818C6.32727 43.3455 14.7273 48 24.4364 48Z" fill="#34A853"></path><path d="M11.2 29.5636C10.7273 28.1455 10.4364 26.6182 10.4364 25C10.4364 23.3818 10.7273 21.8545 11.2 20.4364V14.0182H2.52727C.945455 17.1455 0 20.8909 0 25C0 29.1091 .945455 32.8545 2.52727 35.9818L11.2 29.5636Z" fill="#FBBC05"></path><path d="M24.4364 9.27273C28.2545 9.27273 31.3273 10.6545 33.8545 12.9818L40.2182 6.85455C36.4364 3.38182 30.9818 1 24.4364 1C14.7273 1 6.32727 5.65455 2.52727 13.0182L11.2 19.4364C13.0182 14.1455 18.2727 10.2727 24.4364 10.2727V9.27273Z" fill="#EA4335"></path></svg>
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  );
};

export default LoginPage;