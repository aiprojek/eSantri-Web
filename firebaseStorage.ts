import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { getFirebaseApp, isFirebaseClientConfigReady } from './firebaseApp';

let _storage: FirebaseStorage | null = null;

export const getFirebaseStorage = (): FirebaseStorage | null => {
  if (_storage) return _storage;
  const app = getFirebaseApp();
  if (!app) return null;
  _storage = getStorage(app);
  return _storage;
};

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_target, prop, receiver) {
    const instance = getFirebaseStorage();
    if (!instance) {
      return undefined;
    }
    const val = Reflect.get(instance, prop, receiver);
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

export { ref, uploadBytes, getDownloadURL, isFirebaseClientConfigReady };
