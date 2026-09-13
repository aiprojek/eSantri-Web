import type { Pendaftar, PondokSettings, PsbConfig } from '../types';
import { liteDb, doc, getDoc, setDoc, serverTimestamp } from '../firebaseLite';
import { storage, ref, uploadBytes, getDownloadURL } from '../firebaseStorage';

export const fetchPublicPortalSettings = async (tenantId: string) => {
    const tenantDoc = await getDoc(doc(liteDb, 'publicPortals', tenantId));
    return tenantDoc.exists() ? tenantDoc.data() as PondokSettings : null;
};

interface SubmitPortalPsbRegistrationInput {
    tenantId: string;
    config: PsbConfig;
    fields: Record<string, unknown>;
}

export const submitPortalPsbRegistration = async ({
    tenantId,
    config,
    fields,
}: SubmitPortalPsbRegistrationInput) => {
    const pendaftarId = Date.now().toString();
    const year = new Date().getFullYear();
    const regNumber = `PSB-${year}-REG-${pendaftarId.slice(-4)}`;

    const pendaftarData: Partial<Pendaftar> = {
        nomorRegistrasi: regNumber,
        ...fields,
        tanggalDaftar: new Date().toISOString(),
        tanggalMasuk: new Date().toISOString(),
        status: 'Baru',
        jalurPendaftaran: (fields.jalurPendaftaran as string) || 'Reguler',
        gelombang: config.activeGelombang || 1,
        berkasFisik: {
            kk: false,
            akta: false,
            ijazahSkl: false,
            suratSehat: false,
            pasFoto: false,
            catatanBerkas: 'Pendaftaran Online via Portal Publik'
        },
        nilaiUjian: {
            rekomendasi: 'Dipertimbangkan',
            ruangUjian: 'Posko PSB',
            catatanUjian: 'Pendaftaran online via portal publik (menunggu jadwal seleksi)',
        },
        lastModified: Date.now(),
    };

    const customData: Record<string, unknown> = {};
    const uploadPromises: Promise<void>[] = [];

    for (const key of Object.keys(fields)) {
        if (!key.startsWith('custom_')) {
            continue;
        }

        const fieldId = key.replace('custom_', '');
        const value = fields[key];

        if (value instanceof File) {
            const fieldLabel = config.customFields?.find((field) => field.id === fieldId)?.label || fieldId;
            const safeLabel = fieldLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeName = String(fields.namaLengkap || 'TanpaNama').replace(/[^a-z0-9]/gi, '_');
            const filename = `${safeLabel}-${safeName}-${Date.now()}`;
            const storageRef = ref(storage, `tenants/${tenantId}/psb/${filename}`);

            const uploadTask = uploadBytes(storageRef, value).then(async (snapshot) => {
                const url = await getDownloadURL(snapshot.ref);
                customData[fieldId] = url;
            });

            uploadPromises.push(uploadTask);
        } else {
            customData[fieldId] = value;
        }
    }

    await Promise.all(uploadPromises);

    pendaftarData.customData = JSON.stringify(customData);

    await setDoc(doc(liteDb, `tenants/${tenantId}/pendaftar`, pendaftarId), {
        ...pendaftarData,
        id: parseInt(pendaftarId, 10),
        createdAt: serverTimestamp(),
    });

    return pendaftarId;
};
