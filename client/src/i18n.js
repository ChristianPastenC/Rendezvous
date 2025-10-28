// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import esTranslation from './resources.json';

const resources = {
  es: {
    translation: esTranslation
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['navigator', 'localStorage', 'cookie', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    }
  });

export default i18n;