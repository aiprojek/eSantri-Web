import { storage, ref, uploadBytes, getDownloadURL } from '../firebaseStorage';
import { assertSafePsbUploadFile } from '../utils/sanitizePendaftar';

interface UploadPsbDocumentInput {
    fieldName: string;
    santriName: string;
    file: File;
}

export const uploadPsbDocument = async ({ fieldName, santriName, file }: UploadPsbDocumentInput) => {
    assertSafePsbUploadFile(file);
    const cleanField = String(fieldName || 'berkas').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'berkas';
    const cleanSantriName = String(santriName || 'santri').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'santri';
    const rawExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const extension = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'].includes(rawExt) ? rawExt : 'bin';
    const newFileName = `${cleanField}-${cleanSantriName}.${extension}`;
    const storagePath = `psb/${Date.now()}_${newFileName}`;

    const psbRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(psbRef, file);
    return getDownloadURL(snapshot.ref);
};
