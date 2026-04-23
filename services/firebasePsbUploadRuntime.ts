import { storage, ref, uploadBytes, getDownloadURL } from '../firebaseStorage';

interface UploadPsbDocumentInput {
    fieldName: string;
    santriName: string;
    file: File;
}

export const uploadPsbDocument = async ({ fieldName, santriName, file }: UploadPsbDocumentInput) => {
    const cleanSantriName = santriName.replace(/[^a-zA-Z0-9]/g, '_');
    const extension = file.name.split('.').pop();
    const newFileName = `${fieldName}-${cleanSantriName}.${extension}`;
    const storagePath = `psb/${Date.now()}_${newFileName}`;

    const psbRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(psbRef, file);
    return getDownloadURL(snapshot.ref);
};
