import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const getFirebaseConfig = () => {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };

  if (envConfig.apiKey) {
    return envConfig;
  }

  try {
    const customConfigStr = localStorage.getItem('esantri_custom_firebase_config');
    if (customConfigStr) {
      const custom = JSON.parse(customConfigStr);
      if (custom.apiKey && custom.projectId) {
        return custom;
      }
    }
  } catch (e) {
    console.error('Failed to load custom firebase config:', e);
  }

  return firebaseConfig;
};

export const activeFirebaseConfig = getFirebaseConfig();
export const firebaseApp = initializeApp(activeFirebaseConfig);
