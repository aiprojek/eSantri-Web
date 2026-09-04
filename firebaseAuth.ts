import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth } from 'firebase/auth';
import { getFirebaseApp, isFirebaseClientConfigReady } from './firebaseApp';

let _auth: Auth | null = null;

export const getFirebaseAuth = (): Auth | null => {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) return null;
  _auth = getAuth(app);
  return _auth;
};

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    const instance = getFirebaseAuth();
    if (!instance) {
      return undefined;
    }
    const val = Reflect.get(instance, prop, receiver);
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => {
  const authInstance = getFirebaseAuth();
  if (!authInstance || !isFirebaseClientConfigReady) {
    throw new Error('Kredensial Firebase (BYOK) belum dikonfigurasi. Silakan lengkapi pengaturan Firebase di menu Pengaturan > Sinkronisasi Cloud.');
  }
  return signInWithPopup(authInstance, googleProvider);
};

export const logout = () => {
  const authInstance = getFirebaseAuth();
  if (!authInstance) return Promise.resolve();
  return signOut(authInstance);
};
