import { getFirestore, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore/lite';
import { firebaseApp, activeFirebaseConfig } from './firebaseApp';
import { handleFirestoreError, OperationType } from './firebaseErrors';

export const liteDb = getFirestore(firebaseApp, activeFirebaseConfig.firestoreDatabaseId);

export { doc, setDoc, getDoc, deleteDoc, serverTimestamp, handleFirestoreError, OperationType };
