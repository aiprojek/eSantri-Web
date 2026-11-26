import type { Pendaftar, PondokSettings, PsbConfig } from '../types';
import { liteDb, doc, getDoc, setDoc, serverTimestamp } from '../firebaseLite';
import { storage, ref, uploadBytes, getDownloadURL } from '../firebaseStorage';
import {
    assertPinnedPublicKeyFingerprint,
    encryptObjectHybridWithPublicKey,
    isWebCryptoAvailable,
    normalizePublicKeyFingerprint,
} from './e2eeService';
import { assertSafePsbUploadFile, sanitizePendaftar, sanitizePsbSubmissionFields } from '../utils/sanitizePendaftar';
import { detectPsbDocKind, makeFileName, makeRegNumber, normalizeDocExtension } from '../utils/psbNaming';

export const fetchPublicPortalSettings = async (tenantId: string) => {
    const tenantDoc = await getDoc(doc(liteDb, 'publicPortals', tenantId));
    return tenantDoc.exists() ? tenantDoc.data() as PondokSettings : null;
};

export const fetchPublicPortalEntry = async (tenantId: string, lookupIds: string[]): Promise<any | null> => {
    for (const entryId of lookupIds) {
        if (!entryId || !/^[a-zA-Z0-9_-]{1,128}$/.test(entryId)) continue;
        try {
            const snap = await getDoc(doc(liteDb, 'publicPortals', tenantId, 'entries', entryId));
            if (snap.exists()) {
                return snap.data();
            }
        } catch {
            // Abaikan dan lanjut ke kandidat berikutnya
        }
    }
    return null;
};

interface SubmitPortalPsbRegistrationInput {
    tenantId: string;
    config: PsbConfig;
    fields: Record<string, unknown>;
    e2eePublicKey?: string;
    e2eeKeyId?: string;
    e2eeFingerprint?: string;
}

const NON_PII_FIELDS = new Set([
    'tanggalDaftar',
    'tanggalMasuk',
    'status',
    'jenjangId',
    'gelombang',
    'jalurPendaftaran',
    'tahunAjaranAktif',
    'sheetName',
]);

export const submitPortalPsbRegistration = async ({
    tenantId,
    config,
    fields,
    e2eePublicKey,
    e2eeKeyId,
    e2eeFingerprint,
}: SubmitPortalPsbRegistrationInput) => {
    const pendaftarId = Date.now().toString();
    const year = new Date().getFullYear();
    const regNumber = makeRegNumber(year);

    let pubSpki = e2eePublicKey || '';
    let keyId = e2eeKeyId || '';
    let serverFingerprint = '';
    if (!pubSpki || !keyId) {
        try {
            const pubSettings = (await fetchPublicPortalSettings(tenantId)) as any;
            if (pubSettings?.psbE2ee?.publicKeySpki && pubSettings?.psbE2ee?.keyId) {
                pubSpki = String(pubSettings.psbE2ee.publicKeySpki);
                keyId = String(pubSettings.psbE2ee.keyId);
                serverFingerprint = normalizePublicKeyFingerprint(pubSettings?.psbE2ee?.fingerprint);
            }
        } catch {
            // Tetap lanjutkan tanpa override jika dokumen publik tidak terjangkau
        }
    }

    const pinnedFingerprint = normalizePublicKeyFingerprint(e2eeFingerprint || config.pinnedE2eeFingerprint);
    if (pinnedFingerprint && (!pubSpki || !keyId)) {
        throw new Error('Formulir memiliki pin fingerprint E2EE, tetapi Public Key E2EE server tidak tersedia. Pendaftaran dibatalkan demi keamanan.');
    }

    if (pubSpki && keyId) {
        if (!isWebCryptoAvailable()) {
            throw new Error('Enkripsi E2EE (Web Crypto) tidak tersedia di konteks ini. Buka formulir lewat HTTPS atau localhost.');
        }
        if (pinnedFingerprint) {
            await assertPinnedPublicKeyFingerprint(pubSpki, pinnedFingerprint);
        }
        if (serverFingerprint) {
            await assertPinnedPublicKeyFingerprint(pubSpki, serverFingerprint);
        }
    }

    const useE2ee = Boolean(pubSpki && keyId && isWebCryptoAvailable());

    const cleanFields = sanitizePsbSubmissionFields(fields || {});
    const customData: Record<string, unknown> = {};
    const uploadPromises: Promise<void>[] = [];

    for (const key of Object.keys(cleanFields)) {
        if (!key.startsWith('custom_')) {
            continue;
        }

        const fieldId = key.replace('custom_', '');
        const value = cleanFields[key];

        if (value instanceof File) {
            assertSafePsbUploadFile(value);
            const fieldLabel = config.customFields?.find((field) => field.id === fieldId)?.label || fieldId;
            const docKind = detectPsbDocKind(fieldId, value.name, fieldLabel);
            const ext = normalizeDocExtension(value.name, value.type);
            const filename = makeFileName({
                nomorRegistrasi: regNumber,
                nama: useE2ee ? '' : String(cleanFields.namaLengkap || ''),
                jenisBerkas: docKind,
                ext,
            });
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

    const baseMeta: Partial<Pendaftar> = {
        nomorRegistrasi: regNumber,
        tanggalDaftar: new Date().toISOString(),
        tanggalMasuk: new Date().toISOString(),
        status: 'Baru',
        jalurPendaftaran: (cleanFields.jalurPendaftaran as string) || 'Reguler',
        gelombang: config.activeGelombang || 1,
        ...(cleanFields.jenjangId !== undefined ? { jenjangId: Number(cleanFields.jenjangId) || undefined } : {}),
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

    let docPayload: Record<string, unknown>;

    if (useE2ee) {
        const sensitiveBio: Record<string, unknown> = {
            nomorRegistrasi: regNumber,
        };
        for (const [k, v] of Object.entries(cleanFields)) {
            if (k.startsWith('custom_')) {
                const fId = k.replace('custom_', '');
                if (!(v instanceof File)) {
                    sensitiveBio[fId] = v;
                }
                continue;
            }
            if (!NON_PII_FIELDS.has(k)) {
                sensitiveBio[k] = v;
            }
        }
        const envelope = await encryptObjectHybridWithPublicKey(sensitiveBio, pubSpki, keyId, {
            context: 'psb',
            expectedFingerprint: pinnedFingerprint || serverFingerprint || undefined,
        });
        // Pertahankan URL lampiran (tanpa isi teks kustom sensitif) & bungkus biodata dalam __e2ee_bio
        const sanitizedCustomData: Record<string, unknown> = {
            __e2ee_bio: JSON.stringify(envelope),
        };
        for (const [ck, cv] of Object.entries(customData)) {
            if (typeof cv === 'string' && /^https?:\/\//i.test(cv)) {
                sanitizedCustomData[ck] = cv;
            }
        }
        docPayload = {
            ...sanitizePendaftar({
                ...baseMeta,
                namaLengkap: '[TERENKRIPSI E2EE]',
                customData: JSON.stringify(sanitizedCustomData),
                id: parseInt(pendaftarId, 10),
            }),
            createdAt: serverTimestamp(),
        };
    } else {
        const safeNama = String(cleanFields.namaLengkap || '').trim() || 'Calon Santri';
        docPayload = {
            ...sanitizePendaftar({
                ...baseMeta,
                ...cleanFields,
                namaLengkap: safeNama,
                status: 'Baru',
                deleted: false,
                customData: JSON.stringify(customData),
                id: parseInt(pendaftarId, 10),
            }),
            createdAt: serverTimestamp(),
        };
    }

    await setDoc(doc(liteDb, `tenants/${tenantId}/pendaftar`, pendaftarId), docPayload);

    return pendaftarId;
};
