import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import firebaseConfig from './firebase-applet-config.json';

const isPlaceholder = (value?: string) => !value || value.startsWith('VITE_') || value.includes('YOUR_') || value === 'placeholder';

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

  if (envConfig.apiKey && !isPlaceholder(envConfig.apiKey)) {
    return envConfig;
  }

  try {
    const customConfigStr = localStorage.getItem('esantri_custom_firebase_config');
    if (customConfigStr) {
      const custom = JSON.parse(customConfigStr);
      if (custom.apiKey && !isPlaceholder(custom.apiKey) && custom.projectId && !isPlaceholder(custom.projectId)) {
        return custom;
      }
    }
  } catch (e) {
    console.error('Failed to load custom firebase config:', e);
  }

  return firebaseConfig;
};

export const activeFirebaseConfig = getFirebaseConfig();

export const isFirebaseClientConfigReady = Boolean(
  activeFirebaseConfig?.projectId &&
  !isPlaceholder(activeFirebaseConfig?.projectId) &&
  activeFirebaseConfig?.apiKey &&
  !isPlaceholder(activeFirebaseConfig?.apiKey) &&
  activeFirebaseConfig?.appId &&
  !isPlaceholder(activeFirebaseConfig?.appId)
);

let _firebaseApp: FirebaseApp | null = null;
let _appCheckInitialized = false;

const maybeInitializeAppCheck = (app: FirebaseApp) => {
  if (_appCheckInitialized || typeof window === 'undefined') return;
  const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  if (!siteKey || isPlaceholder(siteKey)) return;
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    _appCheckInitialized = true;
  } catch (err) {
    console.warn('Firebase App Check initialization skipped:', err);
  }
};

export const getFirebaseApp = (): FirebaseApp | null => {
  if (!isFirebaseClientConfigReady) {
    return null;
  }
  const existingApps = getApps();
  if (existingApps.length > 0) {
    maybeInitializeAppCheck(existingApps[0]);
    return existingApps[0];
  }
  if (!_firebaseApp) {
    _firebaseApp = initializeApp(activeFirebaseConfig);
  }
  maybeInitializeAppCheck(_firebaseApp);
  return _firebaseApp;
};

// Lazy proxy for backwards compatibility with direct imports
export const firebaseApp: FirebaseApp = new Proxy({} as FirebaseApp, {
  get(_target, prop, receiver) {
    const app = getFirebaseApp();
    if (!app) {
      return undefined;
    }
    return Reflect.get(app, prop, receiver);
  }
});
