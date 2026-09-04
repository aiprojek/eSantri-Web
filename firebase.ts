import { getFirestore, Firestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { activeFirebaseConfig, isFirebaseClientConfigReady, getFirebaseApp } from './firebaseApp';
import { handleFirestoreError, OperationType } from './firebaseErrors';

let _db: Firestore | null = null;

export const getDb = (): Firestore | null => {
  if (_db) return _db;
  const app = getFirebaseApp();
  if (!app) return null;
  _db = getFirestore(app, activeFirebaseConfig.firestoreDatabaseId);
  return _db;
};

export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    const instance = getDb();
    if (!instance) {
      return undefined;
    }
    const val = Reflect.get(instance, prop, receiver);
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

// Export common firestore functions for easier use
export { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocs, writeBatch, serverTimestamp };
export { handleFirestoreError, OperationType, isFirebaseClientConfigReady };
