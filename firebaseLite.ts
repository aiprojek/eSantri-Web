import { getFirestore, Firestore, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore/lite';
import { activeFirebaseConfig, isFirebaseClientConfigReady, getFirebaseApp } from './firebaseApp';
import { handleFirestoreError, OperationType } from './firebaseErrors';

let _liteDb: Firestore | null = null;

export const getLiteDb = (): Firestore | null => {
  if (_liteDb) return _liteDb;
  const app = getFirebaseApp();
  if (!app) return null;
  _liteDb = getFirestore(app, activeFirebaseConfig.firestoreDatabaseId);
  return _liteDb;
};

export const liteDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    const instance = getLiteDb();
    if (!instance) {
      return undefined;
    }
    const val = Reflect.get(instance, prop, receiver);
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

export { doc, setDoc, getDoc, deleteDoc, serverTimestamp, handleFirestoreError, OperationType, isFirebaseClientConfigReady };
