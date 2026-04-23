import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from './firebaseApp';

export const storage = getStorage(firebaseApp);

export { ref, uploadBytes, getDownloadURL };
