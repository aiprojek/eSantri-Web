import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { firebaseApp, activeFirebaseConfig } from './firebaseApp';
import { handleFirestoreError, OperationType } from './firebaseErrors';

export const db = getFirestore(firebaseApp, activeFirebaseConfig.firestoreDatabaseId);

// Export common firestore functions for easier use
export { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocs, writeBatch, serverTimestamp };
export { handleFirestoreError, OperationType };
