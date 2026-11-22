import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MissingEnvScreen } from './components/common/MissingEnvScreen';
import { missingFirebaseEnvVars } from './lib/firebase';
import './assets/index.css';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      {missingFirebaseEnvVars.length > 0 ? (
        <MissingEnvScreen missingVars={missingFirebaseEnvVars} />
      ) : (
        <App />
      )}
    </Suspense>
  </React.StrictMode>
);
