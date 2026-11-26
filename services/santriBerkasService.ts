import { db } from '../db';
import {
    Pendaftar,
    PondokSettings,
    SantriBerkas,
    SantriBerkasJenis,
    SantriBerkasSumber,
    User,
} from '../types';
import {
    BERKAS_LOCAL_E2EE_CONTEXT,
    decryptLocalBerkasBlob,
    encryptLocalBerkasBlob,
    ensureDeviceVaultHydrated,
    isDeviceUnlockedForConfig,
} from './e2eeService';
import { logActivity } from './logService';
import {
    computeSha256Hex,
    deleteCloudBerkas,
    detectBerkasProvider,
    extractDriveFileId,
    fetchBerkas,
    getExtensionFromMime,
    isBerkasProviderSupported,
    PSB_BERKAS_ALLOWED_MIMES,
    PSB_BERKAS_DEFAULT_CONCURRENCY,
    PSB_BERKAS_MAX_BYTES,
    PsbBerkasFetcherConfig,
    runWithConcurrency,
    UnsupportedProviderBerkasError,
    validateFetchedBerkasBytes,
} from './psbBerkasFetcher';
import {
    ImageBlobCompressor,
    processFetchedBerkas,
} from './psbBerkasProcessor';
import { isSafeHttpUrl, SAFE_DOC, SAFE_IMG } from '../utils/safePreview';
import { makeInitials } from '../utils/psbNaming';
import { loadJsZip } from '../utils/lazyCloudServices';

export const BERKAS_UNSUPPORTED_BACKEND_LABEL = 'belum didukung oleh backend ini';
export const BERKAS_E2EE_LOCKED_LABEL = 'Menunggu buka kunci Master Password E2EE';

let storagePersistAttempted = false;

export function canAccessSantriBerkas(user?: User | null): boolean {
    if (!user) return false;
    return (
        user.role === 'admin' ||
        user.permissions?.psb === 'write' ||
        user.permissions?.santri === 'write'
    );
}

export function assertCanAccessSantriBerkas(user?: User | null, actionLabel: string = 'mengakses berkas'): void {
    if (!canAccessSantriBerkas(user)) {
        throw new Error(
            `Akses ditolak: izin tulis PSB/Santri atau peran Admin diperlukan untuk ${actionLabel}.`
        );
    }
}

export async function requestPersistentStorageOnce(): Promise<boolean> {
    if (storagePersistAttempted) return false;
    storagePersistAttempted = true;
    try {
        if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
            return await navigator.storage.persist();
        }
    } catch {
        // non-fatal
    }
    return false;
}

export function inferBerkasJenis(fieldId: string, fieldLabel?: string): SantriBerkasJenis {
    const s = `${fieldId || ''} ${fieldLabel || ''}`.toLowerCase();
    if (s.includes('kk') || s.includes('kartu keluarga')) return 'kk';
    if (s.includes('akta') || s.includes('akte')) return 'akta';
    if (s.includes('ijazah') || s.includes('skl')) return 'ijazah';
    if (s.includes('foto')) return 'foto';
    return 'lainnya';
}

export function isAttachmentRefValue(val: unknown): val is string {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed) return false;
    if (trimmed.includes('placehold.co')) return false;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('data:')) {
        return SAFE_IMG.test(trimmed) || SAFE_DOC.test(trimmed);
    }
    if (isSafeHttpUrl(trimmed)) {
        return (
            lower.includes('drive.google.com') ||
            lower.includes('docs.google.com') ||
            lower.includes('firebasestorage.googleapis.com') ||
            lower.includes('action=file') ||
            lower.includes('/storage/v1/object/') ||
            /\.(pdf|jpg|jpeg|png|webp)(\?|#|$)/i.test(trimmed)
        );
    }
    if (lower.startsWith('gs://') || lower.startsWith('tenants/') || lower.startsWith('psb/')) {
        return true;
    }
    return extractDriveFileId(trimmed) !== null;
}

export interface DetectedPendaftarAttachment {
    pendaftarId: number;
    santriId?: number;
    fieldId: string;
    fieldLabel: string;
    jenis: SantriBerkasJenis;
    sumberRef: string;
    sumber: SantriBerkasSumber;
}

export function isAttachmentBackendOfflineSupported(settings?: PondokSettings): {
    supported: boolean;
    provider: SantriBerkasSumber;
    reason?: string;
} {
    const psb = settings?.psbConfig;
    const provider: SantriBerkasSumber =
        psb?.submissionMethod === 'portal' && settings?.portalConfig?.provider === 'firebase'
            ? 'firebase'
            : psb?.backendProvider || 'gas';

    if (provider === 'cloudflare_d1' || provider === 'cloudflare_r2' || provider === 'supabase') {
        return {
            supported: false,
            provider,
            reason: `Backend ${provider.toUpperCase()} ${BERKAS_UNSUPPORTED_BACKEND_LABEL} (menunggu pembaruan skrip backend dengan autentikasi ADMIN_KEY / signed URL admin).`,
        };
    }
    return { supported: true, provider };
}

export function detectPendaftarAttachments(
    pendaftar: Pendaftar,
    settings?: PondokSettings
): DetectedPendaftarAttachment[] {
    const results: DetectedPendaftarAttachment[] = [];
    const seenFields = new Set<string>();
    const customFields = settings?.psbConfig?.customFields || [];
    const customFieldLabelById = new Map<string, string>();
    customFields.forEach((f) => {
        if (f?.id && f?.label) customFieldLabelById.set(f.id, f.label);
    });

    const addRef = (fieldId: string, fieldLabel: string, rawVal: unknown) => {
        if (!isAttachmentRefValue(rawVal)) return;
        const cleanFieldId = String(fieldId || '').trim();
        if (!cleanFieldId || seenFields.has(cleanFieldId.toLowerCase())) return;
        seenFields.add(cleanFieldId.toLowerCase());
        const sumber = detectBerkasProvider(rawVal, {
            psbConfig: settings?.psbConfig,
            portalConfig: settings?.portalConfig,
        });
        results.push({
            pendaftarId: pendaftar.id,
            santriId: pendaftar.santriId,
            fieldId: cleanFieldId,
            fieldLabel: fieldLabel || cleanFieldId,
            jenis: inferBerkasJenis(cleanFieldId, fieldLabel),
            sumberRef: rawVal.trim(),
            sumber,
        });
    };

    if (pendaftar.customData) {
        try {
            const parsed =
                typeof pendaftar.customData === 'string'
                    ? JSON.parse(pendaftar.customData)
                    : pendaftar.customData;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                for (const [k, v] of Object.entries(parsed)) {
                    if (k === '__e2ee_bio') continue;
                    const label = customFieldLabelById.get(k) || k.replace(/^custom_/, '');
                    addRef(k, label, v);
                }
            }
        } catch {
            // abaikan customData non-JSON
        }
    }

    if (pendaftar.fotoUrl && isAttachmentRefValue(pendaftar.fotoUrl)) {
        const hasFotoAlready = results.some((r) => r.jenis === 'foto');
        if (!hasFotoAlready) {
            addRef('foto', 'Pas Foto', pendaftar.fotoUrl);
        }
    }

    return results;
}

export interface SaveAttachmentsSummary {
    totalAttachments: number;
    saved: number;
    skipped: number;
    failed: number;
    unsupported: number;
    lockedWaitingUnlock: number;
    errors: Array<{ pendaftarId: number; fieldId: string; fieldLabel: string; message: string }>;
}

export interface SaveAttachmentsProgress {
    completed: number;
    total: number;
    currentLabel: string;
    summary: SaveAttachmentsSummary;
}

export interface SaveAttachmentsOptions {
    settings: PondokSettings;
    currentUser?: User | null;
    simpanAsliTanpaKompresi?: boolean;
    forceRedownload?: boolean;
    onlyFailedOrCloud?: boolean;
    concurrency?: number;
    fetcherConfig?: PsbBerkasFetcherConfig;
    canvasCompressor?: ImageBlobCompressor;
    onProgress?: (progress: SaveAttachmentsProgress) => void;
}

export async function upsertSantriBerkasIdempotent(
    row: Omit<SantriBerkas, 'id'>
): Promise<number> {
    return (db as any).transaction('rw', db.santriBerkas, async () => {
        if (row.pendaftarId !== undefined) {
            const existing = await db.santriBerkas
                .where('[pendaftarId+fieldId]')
                .equals([row.pendaftarId, row.fieldId])
                .first();
            if (existing && existing.id !== undefined) {
                const merged: SantriBerkas = {
                    ...existing,
                    ...row,
                    id: existing.id,
                    santriId: row.santriId ?? existing.santriId,
                    createdAt: existing.createdAt || row.createdAt,
                    lastModified: Date.now(),
                };
                await db.santriBerkas.put(merged);
                return existing.id;
            }
        }
        return await db.santriBerkas.add({
            ...row,
            lastModified: Date.now(),
        });
    });
}

export async function savePendaftarAttachmentsToDevice(
    pendaftarList: Pendaftar[],
    options: SaveAttachmentsOptions
): Promise<SaveAttachmentsSummary> {
    assertCanAccessSantriBerkas(options.currentUser, 'menyimpan lampiran ke perangkat');
    await requestPersistentStorageOnce();

    const summary: SaveAttachmentsSummary = {
        totalAttachments: 0,
        saved: 0,
        skipped: 0,
        failed: 0,
        unsupported: 0,
        lockedWaitingUnlock: 0,
        errors: [],
    };

    const tasks: DetectedPendaftarAttachment[] = [];
    for (const p of pendaftarList) {
        if (!p || typeof p.id !== 'number') continue;
        const detected = detectPendaftarAttachments(p, options.settings);
        tasks.push(...detected);
    }

    summary.totalAttachments = tasks.length;
    if (tasks.length === 0) {
        return summary;
    }

    await ensureDeviceVaultHydrated();
    const e2eeCfg = options.settings.e2eeConfig;
    const isE2eeActive = Boolean(e2eeCfg?.enabled);
    const isE2eeLocked = isE2eeActive && !isDeviceUnlockedForConfig(e2eeCfg);

    // Jika E2EE aktif tetapi terkunci, JANGAN simpan plaintext: tandai status 'cloud' menunggu buka kunci
    if (isE2eeLocked) {
        const nowIso = new Date().toISOString();
        for (const task of tasks) {
            const existing = await db.santriBerkas
                .where('[pendaftarId+fieldId]')
                .equals([task.pendaftarId, task.fieldId])
                .first();
            if (existing && existing.statusUnduh === 'tersimpan' && existing.blob) {
                summary.skipped++;
                continue;
            }
            await upsertSantriBerkasIdempotent({
                santriId: task.santriId,
                pendaftarId: task.pendaftarId,
                jenis: task.jenis,
                fieldId: task.fieldId,
                fieldLabel: task.fieldLabel,
                mime: existing?.mime || '',
                ukuran: existing?.ukuran || 0,
                sha256: existing?.sha256 || '',
                sumber: task.sumber,
                sumberRef: task.sumberRef,
                statusUnduh: isBerkasProviderSupported(task.sumber) ? 'cloud' : 'tidak_didukung',
                pesanError: isBerkasProviderSupported(task.sumber)
                    ? BERKAS_E2EE_LOCKED_LABEL
                    : BERKAS_UNSUPPORTED_BACKEND_LABEL,
                terenkripsi: false,
                createdAt: existing?.createdAt || nowIso,
                lastModified: Date.now(),
            });
            summary.lockedWaitingUnlock++;
        }
        options.onProgress?.({
            completed: tasks.length,
            total: tasks.length,
            currentLabel: BERKAS_E2EE_LOCKED_LABEL,
            summary: { ...summary },
        });
        return summary;
    }

    let completed = 0;
    const concurrency = options.concurrency ?? PSB_BERKAS_DEFAULT_CONCURRENCY;

    await runWithConcurrency(
        tasks,
        async (task) => {
            const nowIso = new Date().toISOString();
            const wantRaw = Boolean(options.simpanAsliTanpaKompresi);
            try {
                const existing = await db.santriBerkas
                    .where('[pendaftarId+fieldId]')
                    .equals([task.pendaftarId, task.fieldId])
                    .first();

                if (options.onlyFailedOrCloud && existing && existing.statusUnduh === 'tersimpan' && existing.blob) {
                    summary.skipped++;
                    return;
                }

                if (
                    existing &&
                    existing.statusUnduh === 'tersimpan' &&
                    existing.blob &&
                    (existing.cloudDeletedAt ||
                        (!options.forceRedownload &&
                            Boolean(existing.asliTanpaKompresi) === wantRaw &&
                            existing.sumberRef === task.sumberRef))
                ) {
                    summary.skipped++;
                    return;
                }

                const fetched = await fetchBerkas(task.sumberRef, {
                    ...(options.fetcherConfig || {}),
                    psbConfig: options.settings.psbConfig,
                    portalConfig: options.settings.portalConfig,
                    sumberOverride: task.sumber,
                });

                const processed = await processFetchedBerkas(fetched, {
                    simpanAsliTanpaKompresi: wantRaw,
                    canvasCompressor: options.canvasCompressor,
                });

                // sha256 selalu dihitung dari isi asli (plaintext) sebelum enkripsi lokal
                let blobToStore: Blob = processed.blob;
                let terenkripsi = false;
                let encryptionMeta: SantriBerkas['encryptionMeta'] = undefined;

                if (isE2eeActive && e2eeCfg) {
                    const docKey = `${task.pendaftarId}:${task.fieldId}`;
                    const enc = await encryptLocalBerkasBlob(processed.blob, e2eeCfg, {
                        context: BERKAS_LOCAL_E2EE_CONTEXT,
                        docId: docKey,
                    });
                    blobToStore = enc.encryptedBlob;
                    terenkripsi = true;
                    encryptionMeta = enc.encryptionMeta;
                }

                await upsertSantriBerkasIdempotent({
                    santriId: task.santriId,
                    pendaftarId: task.pendaftarId,
                    jenis: task.jenis,
                    fieldId: task.fieldId,
                    fieldLabel: task.fieldLabel,
                    namaBerkas: processed.name,
                    mime: processed.mime,
                    ukuran: processed.ukuran,
                    sha256: processed.sha256,
                    sumberSha256: processed.sumberSha256,
                    blob: blobToStore,
                    sumber: fetched.sumber || task.sumber,
                    sumberRef: task.sumberRef,
                    statusUnduh: 'tersimpan',
                    pesanError: undefined,
                    terenkripsi,
                    encryptionMeta,
                    asliTanpaKompresi: processed.asliTanpaKompresi,
                    createdAt: existing?.createdAt || nowIso,
                    lastModified: Date.now(),
                });
                summary.saved++;
            } catch (err: any) {
                const isUnsupported = err instanceof UnsupportedProviderBerkasError;
                const statusUnduh = isUnsupported ? 'tidak_didukung' : 'gagal';
                const errMsg = isUnsupported
                    ? BERKAS_UNSUPPORTED_BACKEND_LABEL
                    : String(err?.message || 'Gagal mengunduh berkas lampiran.');

                await upsertSantriBerkasIdempotent({
                    santriId: task.santriId,
                    pendaftarId: task.pendaftarId,
                    jenis: task.jenis,
                    fieldId: task.fieldId,
                    fieldLabel: task.fieldLabel,
                    mime: '',
                    ukuran: 0,
                    sha256: '',
                    sumber: task.sumber,
                    sumberRef: task.sumberRef,
                    statusUnduh,
                    pesanError: errMsg,
                    terenkripsi: false,
                    createdAt: nowIso,
                    lastModified: Date.now(),
                });

                if (isUnsupported) {
                    summary.unsupported++;
                } else {
                    summary.failed++;
                }
                summary.errors.push({
                    pendaftarId: task.pendaftarId,
                    fieldId: task.fieldId,
                    fieldLabel: task.fieldLabel,
                    message: errMsg,
                });
            } finally {
                completed++;
                options.onProgress?.({
                    completed,
                    total: tasks.length,
                    currentLabel: task.fieldLabel,
                    summary: { ...summary },
                });
            }
        },
        concurrency
    );

    await logActivity(
        'INSERT',
        'santriBerkas',
        pendaftarList.length === 1 ? `pendaftar-${pendaftarList[0].id}` : `bulk-${Date.now()}`,
        null,
        {
            action: 'tarik_lampiran',
            pendaftarCount: pendaftarList.length,
            saved: summary.saved,
            skipped: summary.skipped,
            failed: summary.failed,
            unsupported: summary.unsupported,
        },
        options.currentUser?.username || options.currentUser?.fullName || 'Admin'
    );

    return summary;
}

export async function linkPendaftarBerkasToSantri(
    pendaftarId: number,
    santriId: number,
    currentUser?: User | null
): Promise<number> {
    assertCanAccessSantriBerkas(currentUser, 'memindahkan rujukan berkas santri');
    const rows = await db.santriBerkas.where('pendaftarId').equals(pendaftarId).toArray();
    if (rows.length === 0) return 0;

    const now = Date.now();
    const updated = rows.map((row) => ({
        ...row,
        santriId,
        lastModified: now,
    }));
    await db.santriBerkas.bulkPut(updated);
    return updated.length;
}

export async function getSantriBerkasByPendaftar(
    pendaftarId: number,
    currentUser?: User | null
): Promise<SantriBerkas[]> {
    assertCanAccessSantriBerkas(currentUser, 'membaca daftar berkas pendaftar');
    return db.santriBerkas.where('pendaftarId').equals(pendaftarId).toArray();
}

export async function getSantriBerkasBySantri(
    santriId: number,
    pendaftarId?: number,
    currentUser?: User | null
): Promise<SantriBerkas[]> {
    assertCanAccessSantriBerkas(currentUser, 'membaca daftar berkas santri');
    const bySantri = await db.santriBerkas.where('santriId').equals(santriId).toArray();
    if (!pendaftarId) return bySantri;
    const byPendaftar = await db.santriBerkas.where('pendaftarId').equals(pendaftarId).toArray();
    const map = new Map<number, SantriBerkas>();
    [...bySantri, ...byPendaftar].forEach((item) => {
        if (item.id !== undefined) map.set(item.id, item);
    });
    return Array.from(map.values());
}

export async function decryptSantriBerkasBlob(
    berkas: SantriBerkas,
    _settings?: PondokSettings,
    currentUser?: User | null,
    options?: { skipAuditLog?: boolean }
): Promise<Blob> {
    assertCanAccessSantriBerkas(currentUser, 'membuka lampiran berkas');
    if (!berkas.blob) {
        throw new Error('Berkas belum tersimpan di perangkat ini.');
    }

    let outputBlob: Blob;
    if (berkas.terenkripsi) {
        if (!berkas.encryptionMeta) {
            throw new Error('Metadata enkripsi berkas lokal tidak ditemukan.');
        }
        const docKey =
            berkas.pendaftarId !== undefined
                ? `${berkas.pendaftarId}:${berkas.fieldId}`
                : berkas.id !== undefined
                ? String(berkas.id)
                : berkas.fieldId;
        outputBlob = await decryptLocalBerkasBlob(
            berkas.blob,
            berkas.encryptionMeta,
            berkas.mime || 'application/octet-stream',
            { expectedContext: BERKAS_LOCAL_E2EE_CONTEXT, expectedDocId: docKey }
        );
    } else {
        outputBlob =
            berkas.blob.type === berkas.mime || !berkas.mime
                ? berkas.blob
                : new Blob([berkas.blob], { type: berkas.mime });
    }

    if (!options?.skipAuditLog) {
        await logActivity(
            'UPDATE',
            'santriBerkas',
            berkas.id ?? berkas.fieldId,
            null,
            {
                action: 'lihat_berkas',
                santriId: berkas.santriId,
                pendaftarId: berkas.pendaftarId,
                fieldId: berkas.fieldId,
            },
            currentUser?.username || currentUser?.fullName || 'Admin'
        );
    }

    return outputBlob;
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Gagal membaca data berkas foto.'));
        reader.readAsDataURL(blob);
    });
}

export async function applyLocalFotoBerkasToSantri(
    santriId: number,
    berkasId: number,
    currentUser?: User | null,
    settings?: PondokSettings
): Promise<string> {
    assertCanAccessSantriBerkas(currentUser, 'memperbarui foto profil santri');
    const berkas = await db.santriBerkas.get(berkasId);
    if (!berkas || !berkas.blob) {
        throw new Error('Berkas foto lokal tidak ditemukan atau belum diunduh.');
    }
    if (!berkas.mime.startsWith('image/')) {
        throw new Error('Hanya berkas gambar yang dapat dijadikan foto profil santri.');
    }

    const plainBlob = await decryptSantriBerkasBlob(berkas, settings, currentUser, {
        skipAuditLog: true,
    });
    const dataUrl = await blobToDataUrl(plainBlob);
    const santri = await db.santri.get(santriId);
    if (!santri) {
        throw new Error('Data santri tidak ditemukan.');
    }
    await db.santri.update(santriId, {
        fotoUrl: dataUrl,
        lastModified: Date.now(),
    });
    await logActivity(
        'UPDATE',
        'santri',
        santriId,
        { fotoUrl: '[sebelumnya]' },
        { action: 'terapkan_foto_berkas_lokal', berkasId },
        currentUser?.username || currentUser?.fullName || 'Admin'
    );
    return dataUrl;
}

export async function deleteLocalSantriBerkas(
    berkasId: number,
    currentUser?: User | null
): Promise<void> {
    assertCanAccessSantriBerkas(currentUser, 'menghapus berkas lokal');
    const existing = await db.santriBerkas.get(berkasId);
    if (!existing) return;
    await db.santriBerkas.delete(berkasId);
    await logActivity(
        'DELETE',
        'santriBerkas',
        berkasId,
        {
            santriId: existing.santriId,
            pendaftarId: existing.pendaftarId,
            fieldId: existing.fieldId,
            ukuran: existing.ukuran,
        },
        null,
        currentUser?.username || currentUser?.fullName || 'Admin'
    );
}

export async function deleteAllLocalBerkasForSantri(
    santriId: number,
    currentUser?: User | null
): Promise<number> {
    assertCanAccessSantriBerkas(currentUser, 'menghapus semua berkas lokal santri');
    const rows = await db.santriBerkas.where('santriId').equals(santriId).toArray();
    if (rows.length === 0) return 0;
    const ids = rows.map((r) => r.id).filter((id): id is number => typeof id === 'number');
    if (ids.length > 0) {
        await db.santriBerkas.bulkDelete(ids);
    }
    await logActivity(
        'DELETE',
        'santriBerkas',
        `santri-${santriId}`,
        { santriId, count: ids.length },
        null,
        currentUser?.username || currentUser?.fullName || 'Admin'
    );
    return ids.length;
}

export interface BerkasStorageStats {
    totalRows: number;
    storedRows: number;
    totalBytes: number;
    orphanCount: number;
    orphanBytes: number;
    orphanIds: number[];
}

export async function getBerkasStorageStats(): Promise<BerkasStorageStats> {
    const [allBerkas, allSantri, allPendaftar] = await Promise.all([
        db.santriBerkas.toArray(),
        db.santri.toArray(),
        db.pendaftar.toArray(),
    ]);

    const activeSantriIds = new Set<number>(
        allSantri.filter((s) => !s.deleted && typeof s.id === 'number').map((s) => s.id)
    );
    const activePendaftarIds = new Set<number>(
        allPendaftar.filter((p) => !p.deleted && typeof p.id === 'number').map((p) => p.id)
    );

    let storedRows = 0;
    let totalBytes = 0;
    const orphanIds: number[] = [];
    let orphanBytes = 0;

    for (const row of allBerkas) {
        const size = row.ukuran || row.blob?.size || 0;
        if (row.statusUnduh === 'tersimpan' && row.blob) {
            storedRows++;
            totalBytes += size;
        }
        const isOrphan =
            row.santriId !== undefined
                ? !activeSantriIds.has(row.santriId)
                : row.pendaftarId === undefined || !activePendaftarIds.has(row.pendaftarId);

        if (isOrphan && typeof row.id === 'number') {
            orphanIds.push(row.id);
            orphanBytes += size;
        }
    }

    return {
        totalRows: allBerkas.length,
        storedRows,
        totalBytes,
        orphanCount: orphanIds.length,
        orphanBytes,
        orphanIds,
    };
}

export async function deleteOrphanSantriBerkas(
    currentUser?: User | null
): Promise<{ deletedCount: number; freedBytes: number }> {
    assertCanAccessSantriBerkas(currentUser, 'menghapus berkas yatim');
    const stats = await getBerkasStorageStats();
    if (stats.orphanIds.length === 0) {
        return { deletedCount: 0, freedBytes: 0 };
    }
    await db.santriBerkas.bulkDelete(stats.orphanIds);
    await logActivity(
        'DELETE',
        'santriBerkas',
        `orphans-${Date.now()}`,
        { orphanCount: stats.orphanCount, orphanBytes: stats.orphanBytes },
        null,
        currentUser?.username || currentUser?.fullName || 'Admin'
    );
    return {
        deletedCount: stats.orphanIds.length,
        freedBytes: stats.orphanBytes,
    };
}

export async function redownloadSingleSantriBerkas(
    berkasId: number,
    options: {
        settings: PondokSettings;
        currentUser?: User | null;
        simpanAsliTanpaKompresi?: boolean;
        fetcherConfig?: PsbBerkasFetcherConfig;
        canvasCompressor?: ImageBlobCompressor;
    }
): Promise<SantriBerkas> {
    assertCanAccessSantriBerkas(options.currentUser, 'mengunduh ulang berkas lokal');
    await requestPersistentStorageOnce();
    const existing = await db.santriBerkas.get(berkasId);
    if (!existing || existing.id === undefined) {
        throw new Error('Data berkas tidak ditemukan.');
    }
    if (existing.cloudDeletedAt && existing.statusUnduh === 'tersimpan' && existing.blob) {
        throw new Error(
            'Salinan cloud untuk berkas ini sudah dihapus sebelumnya; berkas hanya tersimpan secara offline di perangkat ini.'
        );
    }

    await ensureDeviceVaultHydrated();
    const e2eeCfg = options.settings.e2eeConfig;
    const isE2eeActive = Boolean(e2eeCfg?.enabled);
    const isE2eeLocked = isE2eeActive && !isDeviceUnlockedForConfig(e2eeCfg);

    if (isE2eeLocked) {
        const lockedStatus = isBerkasProviderSupported(existing.sumber) ? 'cloud' : 'tidak_didukung';
        const updatedLocked: SantriBerkas = {
            ...existing,
            statusUnduh: lockedStatus,
            pesanError: isBerkasProviderSupported(existing.sumber)
                ? BERKAS_E2EE_LOCKED_LABEL
                : BERKAS_UNSUPPORTED_BACKEND_LABEL,
            lastModified: Date.now(),
        };
        await db.santriBerkas.put(updatedLocked);
        return updatedLocked;
    }

    const wantRaw = Boolean(options.simpanAsliTanpaKompresi);
    try {
        const fetched = await fetchBerkas(existing.sumberRef, {
            ...(options.fetcherConfig || {}),
            psbConfig: options.settings.psbConfig,
            portalConfig: options.settings.portalConfig,
            sumberOverride: existing.sumber,
        });
        const processed = await processFetchedBerkas(fetched, {
            simpanAsliTanpaKompresi: wantRaw,
            canvasCompressor: options.canvasCompressor,
        });

        let blobToStore: Blob = processed.blob;
        let terenkripsi = false;
        let encryptionMeta: SantriBerkas['encryptionMeta'] = undefined;

        if (isE2eeActive && e2eeCfg) {
            const docKey =
                existing.pendaftarId !== undefined
                    ? `${existing.pendaftarId}:${existing.fieldId}`
                    : String(existing.id);
            const enc = await encryptLocalBerkasBlob(processed.blob, e2eeCfg, {
                context: BERKAS_LOCAL_E2EE_CONTEXT,
                docId: docKey,
            });
            blobToStore = enc.encryptedBlob;
            terenkripsi = true;
            encryptionMeta = enc.encryptionMeta;
        }

        const updated: SantriBerkas = {
            ...existing,
            namaBerkas: processed.name,
            mime: processed.mime,
            ukuran: processed.ukuran,
            sha256: processed.sha256,
            sumberSha256: processed.sumberSha256,
            blob: blobToStore,
            sumber: fetched.sumber || existing.sumber,
            statusUnduh: 'tersimpan',
            pesanError: undefined,
            terenkripsi,
            encryptionMeta,
            asliTanpaKompresi: processed.asliTanpaKompresi,
            lastModified: Date.now(),
        };
        await db.santriBerkas.put(updated);
        await logActivity(
            'UPDATE',
            'santriBerkas',
            existing.id,
            null,
            { action: 'tarik_ulang_berkas', santriId: existing.santriId, fieldId: existing.fieldId },
            options.currentUser?.username || options.currentUser?.fullName || 'Admin'
        );
        return updated;
    } catch (err: any) {
        const isUnsupported = err instanceof UnsupportedProviderBerkasError;
        const updatedErr: SantriBerkas = {
            ...existing,
            statusUnduh: isUnsupported ? 'tidak_didukung' : 'gagal',
            pesanError: isUnsupported
                ? BERKAS_UNSUPPORTED_BACKEND_LABEL
                : String(err?.message || 'Gagal mengunduh ulang berkas.'),
            lastModified: Date.now(),
        };
        await db.santriBerkas.put(updatedErr);
        throw err;
    }
}

export function isBerkasEligibleForCloudDeletion(berkas: SantriBerkas): {
    eligible: boolean;
    reason?: string;
} {
    if (berkas.statusUnduh !== 'tersimpan' || !berkas.blob || berkas.blob.size <= 0) {
        return {
            eligible: false,
            reason: 'Berkas belum tersimpan offline di perangkat ini.',
        };
    }
    if (!/^[a-f0-9]{64}$/.test(String(berkas.sha256 || '').trim().toLowerCase())) {
        return {
            eligible: false,
            reason: 'Checksum SHA-256 lokal tidak lengkap atau belum terverifikasi.',
        };
    }
    if (berkas.cloudDeletedAt) {
        return {
            eligible: false,
            reason: 'Salinan cloud sudah dihapus sebelumnya.',
        };
    }
    if (berkas.sumber === 'lokal' || !String(berkas.sumberRef || '').trim()) {
        return {
            eligible: false,
            reason: 'Berkas lokal tidak memiliki salinan di cloud.',
        };
    }
    if (!isBerkasProviderSupported(berkas.sumber)) {
        return {
            eligible: false,
            reason: BERKAS_UNSUPPORTED_BACKEND_LABEL,
        };
    }
    return { eligible: true };
}

export interface DeleteCloudCopySummary {
    totalCandidates: number;
    deleted: number;
    skippedNotSavedLocally: number;
    skippedAlreadyDeleted: number;
    skippedLocalOnly: number;
    unsupported: number;
    failed: number;
    errors: Array<{ berkasId: number; fieldLabel: string; message: string }>;
}

export async function deleteCloudCopyForSantriBerkas(
    berkasId: number,
    options: {
        settings: PondokSettings;
        currentUser?: User | null;
        fetcherConfig?: PsbBerkasFetcherConfig;
    }
): Promise<SantriBerkas> {
    assertCanAccessSantriBerkas(options.currentUser, 'menghapus salinan cloud berkas');

    const existing = await db.santriBerkas.get(berkasId);
    if (!existing || existing.id === undefined) {
        throw new Error('Data berkas tidak ditemukan.');
    }

    if (existing.cloudDeletedAt) {
        return existing;
    }

    if (
        existing.statusUnduh !== 'tersimpan' ||
        !existing.blob ||
        existing.blob.size <= 0 ||
        !/^[a-f0-9]{64}$/.test(String(existing.sha256 || '').trim().toLowerCase())
    ) {
        throw new Error(
            'Ditolak: berkas harus tersimpan offline dan terverifikasi SHA-256 di perangkat ini sebelum menghapus salinan cloud.'
        );
    }

    if (existing.sumber === 'lokal' || !String(existing.sumberRef || '').trim()) {
        throw new Error('Berkas ini hanya tersimpan secara lokal (tidak memiliki salinan cloud).');
    }

    await deleteCloudBerkas(existing.sumberRef, {
        ...(options.fetcherConfig || {}),
        psbConfig: options.settings.psbConfig,
        portalConfig: options.settings.portalConfig,
        sumberOverride: existing.sumber,
    });

    const cloudDeletedAt = new Date().toISOString();
    const updated: SantriBerkas = {
        ...existing,
        cloudDeletedAt,
        lastModified: Date.now(),
    };
    await db.santriBerkas.put(updated);

    await logActivity(
        'DELETE',
        'santriBerkas',
        `cloud-del-${existing.id}`,
        {
            sumber: existing.sumber,
            sumberRef: existing.sumberRef,
            santriId: existing.santriId,
            pendaftarId: existing.pendaftarId,
            fieldId: existing.fieldId,
        },
        {
            action: 'hapus_salinan_cloud',
            cloudDeletedAt,
            sumber: existing.sumber,
            fieldId: existing.fieldId,
        },
        options.currentUser?.username || options.currentUser?.fullName || 'Admin'
    );

    return updated;
}

export async function deleteCloudCopiesForBerkasRows(
    rows: SantriBerkas[],
    options: {
        settings: PondokSettings;
        currentUser?: User | null;
        fetcherConfig?: PsbBerkasFetcherConfig;
        concurrency?: number;
        onProgress?: (info: { completed: number; total: number; currentLabel: string }) => void;
    }
): Promise<DeleteCloudCopySummary> {
    assertCanAccessSantriBerkas(options.currentUser, 'menghapus salinan cloud berkas');

    const summary: DeleteCloudCopySummary = {
        totalCandidates: rows.length,
        deleted: 0,
        skippedNotSavedLocally: 0,
        skippedAlreadyDeleted: 0,
        skippedLocalOnly: 0,
        unsupported: 0,
        failed: 0,
        errors: [],
    };

    if (rows.length === 0) return summary;

    const toDelete: SantriBerkas[] = [];
    for (const row of rows) {
        if (
            row.statusUnduh !== 'tersimpan' ||
            !row.blob ||
            row.blob.size <= 0 ||
            !/^[a-f0-9]{64}$/.test(String(row.sha256 || '').trim().toLowerCase())
        ) {
            summary.skippedNotSavedLocally++;
            continue;
        }
        if (row.cloudDeletedAt) {
            summary.skippedAlreadyDeleted++;
            continue;
        }
        if (row.sumber === 'lokal' || !String(row.sumberRef || '').trim()) {
            summary.skippedLocalOnly++;
            continue;
        }
        if (!isBerkasProviderSupported(row.sumber)) {
            summary.unsupported++;
            continue;
        }
        toDelete.push(row);
    }

    if (toDelete.length === 0) {
        return summary;
    }

    let completed = 0;
    const concurrency = options.concurrency ?? PSB_BERKAS_DEFAULT_CONCURRENCY;

    await runWithConcurrency(
        toDelete,
        async (row) => {
            const label = row.fieldLabel || row.namaBerkas || row.fieldId;
            try {
                await deleteCloudBerkas(row.sumberRef, {
                    ...(options.fetcherConfig || {}),
                    psbConfig: options.settings.psbConfig,
                    portalConfig: options.settings.portalConfig,
                    sumberOverride: row.sumber,
                });

                const cloudDeletedAt = new Date().toISOString();
                if (row.id !== undefined) {
                    await db.santriBerkas.put({
                        ...row,
                        cloudDeletedAt,
                        lastModified: Date.now(),
                    });
                }
                summary.deleted++;
            } catch (err: any) {
                if (err instanceof UnsupportedProviderBerkasError) {
                    summary.unsupported++;
                } else {
                    summary.failed++;
                    summary.errors.push({
                        berkasId: row.id ?? 0,
                        fieldLabel: label,
                        message: String(err?.message || 'Gagal menghapus salinan cloud berkas.'),
                    });
                }
            } finally {
                completed++;
                options.onProgress?.({
                    completed,
                    total: toDelete.length,
                    currentLabel: label,
                });
            }
        },
        concurrency
    );

    await logActivity(
        'DELETE',
        'santriBerkas',
        `cloud-del-bulk-${Date.now()}`,
        null,
        {
            action: 'hapus_salinan_cloud_massal',
            totalCandidates: summary.totalCandidates,
            deleted: summary.deleted,
            skippedNotSavedLocally: summary.skippedNotSavedLocally,
            skippedAlreadyDeleted: summary.skippedAlreadyDeleted,
            skippedLocalOnly: summary.skippedLocalOnly,
            unsupported: summary.unsupported,
            failed: summary.failed,
        },
        options.currentUser?.username || options.currentUser?.fullName || 'Admin'
    );

    return summary;
}

export async function deleteCloudCopiesForPendaftarList(
    pendaftarIds: number[],
    options: {
        settings: PondokSettings;
        currentUser?: User | null;
        fetcherConfig?: PsbBerkasFetcherConfig;
        concurrency?: number;
        onProgress?: (info: { completed: number; total: number; currentLabel: string }) => void;
    }
): Promise<DeleteCloudCopySummary> {
    assertCanAccessSantriBerkas(options.currentUser, 'menghapus salinan cloud berkas pendaftar');
    const validIds = pendaftarIds.filter((id) => typeof id === 'number' && id > 0);
    if (validIds.length === 0) {
        return {
            totalCandidates: 0,
            deleted: 0,
            skippedNotSavedLocally: 0,
            skippedAlreadyDeleted: 0,
            skippedLocalOnly: 0,
            unsupported: 0,
            failed: 0,
            errors: [],
        };
    }
    const rows = await db.santriBerkas.where('pendaftarId').anyOf(validIds).toArray();
    return deleteCloudCopiesForBerkasRows(rows, options);
}

function sanitizeArchiveSegment(input: string, fallback: string = 'item'): string {
    const cleaned = String(input || '')
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return (cleaned || fallback).slice(0, 80);
}

export function buildPsbArchiveEntryPath(params: {
    pendaftar: Pick<Pendaftar, 'id' | 'namaLengkap' | 'nomorRegistrasi'>;
    fieldLabel: string;
    fieldId: string;
    mime: string;
    useFriendlyName?: boolean;
}): { folderName: string; fileName: string; fullPath: string } {
    const regNo = sanitizeArchiveSegment(
        params.pendaftar.nomorRegistrasi || `REG-${params.pendaftar.id}`,
        `REG-${params.pendaftar.id}`
    ).replace(/\s+/g, '_');
    const inisial = makeInitials(params.pendaftar.namaLengkap || 'Santri');
    const ext = getExtensionFromMime(params.mime);
    const labelClean = sanitizeArchiveSegment(params.fieldLabel || params.fieldId, params.fieldId);

    if (params.useFriendlyName) {
        const namaClean = sanitizeArchiveSegment(params.pendaftar.namaLengkap || `Pendaftar_${params.pendaftar.id}`);
        const folderName = `${namaClean} (${regNo})`;
        const fileName = `${namaClean} - ${labelClean}${ext}`;
        return { folderName, fileName, fullPath: `${folderName}/${fileName}` };
    }

    const folderName = `${regNo}_${inisial}`;
    const docSlug = labelClean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'dokumen';
    const fileName = `${docSlug}${ext}`;
    return { folderName, fileName, fullPath: `${folderName}/${fileName}` };
}

export interface PsbArchiveBuildResult {
    zipBlob: Blob;
    fileCount: number;
    skippedLocked: number;
    skippedUnsupported: number;
    failedCount: number;
    errors: string[];
}

export async function buildPsbArchiveZip(
    pendaftarList: Pendaftar[],
    options: {
        settings: PondokSettings;
        currentUser?: User | null;
        useFriendlyName?: boolean;
        fetcherConfig?: PsbBerkasFetcherConfig;
        onProgress?: (info: { processedPendaftar: number; totalPendaftar: number; currentName: string; fileCount: number }) => void;
    }
): Promise<PsbArchiveBuildResult> {
    assertCanAccessSantriBerkas(options.currentUser, 'mengekspor arsip ZIP berkas PSB');

    const JSZip = await loadJsZip();
    const zip = new JSZip();

    let fileCount = 0;
    let skippedLocked = 0;
    let skippedUnsupported = 0;
    let failedCount = 0;
    const errors: string[] = [];

    await ensureDeviceVaultHydrated();

    for (let idx = 0; idx < pendaftarList.length; idx++) {
        const p = pendaftarList[idx];
        const localRows = typeof p.id === 'number'
            ? await db.santriBerkas.where('pendaftarId').equals(p.id).toArray()
            : [];
        const detected = detectPendaftarAttachments(p, options.settings);

        const localByField = new Map<string, SantriBerkas>();
        localRows.forEach((r) => localByField.set(r.fieldId, r));

        const allFieldIds = new Set<string>([
            ...localRows.map((r) => r.fieldId),
            ...detected.map((d) => d.fieldId),
        ]);

        const usedFileNamesInFolder = new Set<string>();

        for (const fieldId of allFieldIds) {
            const localRow = localByField.get(fieldId);
            const detectedRef = detected.find((d) => d.fieldId === fieldId);
            const fieldLabel = localRow?.fieldLabel || detectedRef?.fieldLabel || fieldId;

            let outputBlob: Blob | null = null;
            let mime = localRow?.mime || '';

            if (localRow && localRow.statusUnduh === 'tersimpan' && localRow.blob) {
                try {
                    outputBlob = await decryptSantriBerkasBlob(localRow, options.settings, options.currentUser, {
                        skipAuditLog: true,
                    });
                    mime = outputBlob.type || localRow.mime;
                } catch (decErr: any) {
                    const msg = String(decErr?.message || '');
                    if (msg.includes('E2EE_LOCKED')) {
                        skippedLocked++;
                        errors.push(`${p.namaLengkap} (${fieldLabel}): terkunci E2EE`);
                    } else {
                        failedCount++;
                        errors.push(`${p.namaLengkap} (${fieldLabel}): ${msg}`);
                    }
                    continue;
                }
            } else if (detectedRef) {
                try {
                    const fetched = await fetchBerkas(detectedRef.sumberRef, {
                        ...(options.fetcherConfig || {}),
                        psbConfig: options.settings.psbConfig,
                        portalConfig: options.settings.portalConfig,
                        sumberOverride: detectedRef.sumber,
                    });
                    outputBlob = fetched.blob;
                    mime = fetched.mime;
                } catch (fetchErr: any) {
                    if (fetchErr instanceof UnsupportedProviderBerkasError) {
                        skippedUnsupported++;
                    } else {
                        failedCount++;
                        errors.push(`${p.namaLengkap} (${fieldLabel}): ${fetchErr?.message || 'gagal unduh'}`);
                    }
                    continue;
                }
            }

            if (outputBlob && outputBlob.size > 0) {
                const entry = buildPsbArchiveEntryPath({
                    pendaftar: p,
                    fieldLabel,
                    fieldId,
                    mime,
                    useFriendlyName: options.useFriendlyName,
                });

                let uniqueFileName = entry.fileName;
                if (usedFileNamesInFolder.has(uniqueFileName)) {
                    const dotIdx = uniqueFileName.lastIndexOf('.');
                    const base = dotIdx > -1 ? uniqueFileName.slice(0, dotIdx) : uniqueFileName;
                    const ext = dotIdx > -1 ? uniqueFileName.slice(dotIdx) : '';
                    let counter = 2;
                    while (usedFileNamesInFolder.has(`${base}-${counter}${ext}`)) counter++;
                    uniqueFileName = `${base}-${counter}${ext}`;
                }
                usedFileNamesInFolder.add(uniqueFileName);

                zip.folder(entry.folderName)?.file(uniqueFileName, outputBlob);
                fileCount++;
            }
        }

        options.onProgress?.({
            processedPendaftar: idx + 1,
            totalPendaftar: pendaftarList.length,
            currentName: p.namaLengkap,
            fileCount,
        });
    }

    const zipBlob: Blob = await zip.generateAsync({ type: 'blob' });

    await logActivity(
        'UPDATE',
        'santriBerkas',
        `zip-export-${Date.now()}`,
        null,
        {
            action: 'ekspor_arsip_zip',
            pendaftarCount: pendaftarList.length,
            fileCount,
            skippedLocked,
            skippedUnsupported,
            failedCount,
            useFriendlyName: Boolean(options.useFriendlyName),
        },
        options.currentUser?.username || options.currentUser?.fullName || 'Admin'
    );

    return {
        zipBlob,
        fileCount,
        skippedLocked,
        skippedUnsupported,
        failedCount,
        errors,
    };
}

export const BERKAS_BACKUP_FORMAT = 'esantri-berkas-backup' as const;
export const BERKAS_BACKUP_VERSION = 1 as const;
export const BERKAS_BACKUP_KDF_ITERATIONS = 310000;

export interface BerkasBackupManifestEntry {
    path: string;
    santriId?: number;
    pendaftarId?: number;
    jenis: SantriBerkasJenis;
    fieldId: string;
    fieldLabel?: string;
    namaBerkas?: string;
    mime: string;
    ukuran: number;
    sha256: string;
    sumberSha256?: string;
    sumber: SantriBerkasSumber;
    sumberRef: string;
    asliTanpaKompresi?: boolean;
    createdAt: string;
    entryIv?: string;
}

export interface BerkasBackupManifest {
    format: typeof BERKAS_BACKUP_FORMAT;
    version: typeof BERKAS_BACKUP_VERSION;
    createdAt: string;
    encrypted: boolean;
    cipher?: 'AES-GCM';
    kdf?: 'PBKDF2';
    kdfHash?: 'SHA-256';
    iterations?: number;
    salt?: string;
    entryCount: number;
    entries: BerkasBackupManifestEntry[];
}

export interface BerkasBackupExportResult {
    zipBlob: Blob | null;
    fileCount: number;
    skippedLocked: number;
    failedIntegrity: number;
    encrypted: boolean;
    errors: string[];
}

export interface BerkasBackupRestoreResult {
    totalEntries: number;
    restored: number;
    rejected: number;
    errors: string[];
}

const u8ToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
};

const base64ToU8 = (b64: string): Uint8Array => {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        out[i] = binary.charCodeAt(i);
    }
    return out;
};

const toExactArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
};

async function deriveBerkasBackupAesKey(
    password: string,
    salt: Uint8Array,
    iterations: number,
    usages: KeyUsage[]
): Promise<CryptoKey> {
    if (!globalThis.crypto?.subtle) {
        throw new Error('Web Crypto API tidak tersedia.');
    }
    const keyMaterial = await globalThis.crypto.subtle.importKey(
        'raw',
        toExactArrayBuffer(new TextEncoder().encode(password)),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return globalThis.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: toExactArrayBuffer(salt),
            iterations,
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        usages
    );
}

function buildBerkasBackupEntryAad(entryPath: string, sha256: string): ArrayBuffer {
    return toExactArrayBuffer(
        new TextEncoder().encode(`esantri-berkas-backup-v1|${entryPath}|${sha256.toLowerCase()}`)
    );
}

function isSafeArchiveRelativePath(p: string): boolean {
    if (!p || p.startsWith('/') || p.startsWith('\\')) return false;
    if (p.includes('\x00') || p.includes('..')) return false;
    return p.startsWith('files/') && p.length > 'files/'.length;
}

export async function exportBerkasBackupZip(options: {
    settings: PondokSettings;
    currentUser?: User | null;
    password?: string;
    onProgress?: (info: { processed: number; total: number }) => void;
}): Promise<BerkasBackupExportResult> {
    assertCanAccessSantriBerkas(options.currentUser, 'membuat cadangan ZIP berkas santri');

    const cleanPassword = options.password ? String(options.password) : '';
    const useEncryption = cleanPassword.length > 0;
    if (useEncryption && cleanPassword.length < 6) {
        throw new Error('Password enkripsi cadangan berkas minimal 6 karakter.');
    }

    const allRows = await db.santriBerkas.toArray();
    const storedRows = allRows.filter((r) => r.statusUnduh === 'tersimpan' && r.blob);

    const errors: string[] = [];
    let skippedLocked = 0;
    let failedIntegrity = 0;

    if (storedRows.length === 0) {
        return {
            zipBlob: null,
            fileCount: 0,
            skippedLocked: 0,
            failedIntegrity: 0,
            encrypted: useEncryption,
            errors: ['Belum ada berkas lampiran offline yang tersimpan untuk dicadangkan.'],
        };
    }

    await ensureDeviceVaultHydrated();

    const JSZip = await loadJsZip();
    const zip = new JSZip();

    let saltBytes: Uint8Array | null = null;
    let backupKey: CryptoKey | null = null;
    if (useEncryption) {
        saltBytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
        backupKey = await deriveBerkasBackupAesKey(
            cleanPassword,
            saltBytes,
            BERKAS_BACKUP_KDF_ITERATIONS,
            ['encrypt']
        );
    }

    const entries: BerkasBackupManifestEntry[] = [];
    const usedPaths = new Set<string>();

    for (let idx = 0; idx < storedRows.length; idx++) {
        const row = storedRows[idx];
        try {
            const plainBlob = await decryptSantriBerkasBlob(row, options.settings, options.currentUser, {
                skipAuditLog: true,
            });
            const plainBytes = new Uint8Array(await plainBlob.arrayBuffer());
            const computedSha = await computeSha256Hex(plainBytes);
            if (row.sha256 && row.sha256.trim().toLowerCase() !== computedSha) {
                failedIntegrity++;
                errors.push(`Entri #${row.id ?? idx} (${row.fieldLabel || row.fieldId}): hash SHA-256 tidak cocok.`);
                continue;
            }

            const ext = getExtensionFromMime(row.mime || plainBlob.type);
            const safeFieldSlug =
                sanitizeArchiveSegment(row.fieldId || 'berkas', 'berkas')
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]+/g, '-') || 'berkas';
            let entryPath = `files/${row.id ?? idx}_${safeFieldSlug}${ext}`;
            let suffixCounter = 2;
            while (usedPaths.has(entryPath)) {
                entryPath = `files/${row.id ?? idx}_${safeFieldSlug}-${suffixCounter}${ext}`;
                suffixCounter++;
            }
            usedPaths.add(entryPath);

            let bytesToWrite = plainBytes;
            let entryIv: string | undefined;
            if (useEncryption && backupKey) {
                const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
                const cipherBuf = await globalThis.crypto.subtle.encrypt(
                    {
                        name: 'AES-GCM',
                        iv: toExactArrayBuffer(iv),
                        additionalData: buildBerkasBackupEntryAad(entryPath, computedSha),
                    },
                    backupKey,
                    toExactArrayBuffer(plainBytes)
                );
                bytesToWrite = new Uint8Array(cipherBuf);
                entryIv = u8ToBase64(iv);
            }

            zip.file(entryPath, bytesToWrite);
            entries.push({
                path: entryPath,
                santriId: row.santriId,
                pendaftarId: row.pendaftarId,
                jenis: row.jenis,
                fieldId: row.fieldId,
                fieldLabel: row.fieldLabel,
                namaBerkas: row.namaBerkas,
                mime: row.mime || plainBlob.type || 'application/octet-stream',
                ukuran: plainBytes.byteLength,
                sha256: computedSha,
                sumberSha256: row.sumberSha256,
                sumber: row.sumber,
                sumberRef: row.sumberRef,
                asliTanpaKompresi: row.asliTanpaKompresi,
                createdAt: row.createdAt || new Date().toISOString(),
                ...(entryIv ? { entryIv } : {}),
            });
        } catch (err: any) {
            const msg = String(err?.message || 'Gagal memproses berkas');
            if (msg.includes('E2EE_LOCKED')) {
                skippedLocked++;
                errors.push(`Entri #${row.id ?? idx} (${row.fieldLabel || row.fieldId}): terkunci E2EE.`);
            } else {
                failedIntegrity++;
                errors.push(`Entri #${row.id ?? idx} (${row.fieldLabel || row.fieldId}): ${msg}`);
            }
        } finally {
            options.onProgress?.({ processed: idx + 1, total: storedRows.length });
        }
    }

    if (entries.length === 0) {
        return {
            zipBlob: null,
            fileCount: 0,
            skippedLocked,
            failedIntegrity,
            encrypted: useEncryption,
            errors,
        };
    }

    const manifest: BerkasBackupManifest = {
        format: BERKAS_BACKUP_FORMAT,
        version: BERKAS_BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        encrypted: useEncryption,
        ...(useEncryption && saltBytes
            ? {
                  cipher: 'AES-GCM' as const,
                  kdf: 'PBKDF2' as const,
                  kdfHash: 'SHA-256' as const,
                  iterations: BERKAS_BACKUP_KDF_ITERATIONS,
                  salt: u8ToBase64(saltBytes),
              }
            : {}),
        entryCount: entries.length,
        entries,
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    const zipBlob: Blob = await zip.generateAsync({ type: 'blob' });

    await logActivity(
        'UPDATE',
        'santriBerkas',
        `zip-backup-${Date.now()}`,
        null,
        {
            action: 'cadangkan_berkas_zip',
            fileCount: entries.length,
            skippedLocked,
            failedIntegrity,
            encrypted: useEncryption,
        },
        options.currentUser?.username || options.currentUser?.fullName || 'Admin'
    );

    return {
        zipBlob,
        fileCount: entries.length,
        skippedLocked,
        failedIntegrity,
        encrypted: useEncryption,
        errors,
    };
}

export async function inspectBerkasBackupZip(
    zipFile: Blob | ArrayBuffer | Uint8Array
): Promise<{
    manifest: BerkasBackupManifest;
    encrypted: boolean;
    entryCount: number;
    createdAt: string;
}> {
    const JSZip = await loadJsZip();
    const zip = await JSZip.loadAsync(zipFile);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
        throw new Error('File ZIP cadangan berkas tidak valid: manifest.json tidak ditemukan.');
    }
    const rawJson = await manifestFile.async('string');
    let parsed: any;
    try {
        parsed = JSON.parse(rawJson);
    } catch {
        throw new Error('manifest.json di dalam arsip ZIP cadangan berkas rusak.');
    }

    if (
        !parsed ||
        parsed.format !== BERKAS_BACKUP_FORMAT ||
        parsed.version !== BERKAS_BACKUP_VERSION ||
        !Array.isArray(parsed.entries)
    ) {
        throw new Error('Format arsip ZIP cadangan berkas tidak dikenali oleh eSantri.');
    }

    const manifest = parsed as BerkasBackupManifest;
    return {
        manifest,
        encrypted: Boolean(manifest.encrypted),
        entryCount: manifest.entries.length,
        createdAt: manifest.createdAt || '',
    };
}

export async function restoreBerkasBackupZip(
    zipFile: Blob | ArrayBuffer | Uint8Array,
    options: {
        settings: PondokSettings;
        currentUser?: User | null;
        password?: string;
        onProgress?: (info: { processed: number; total: number }) => void;
    }
): Promise<BerkasBackupRestoreResult> {
    assertCanAccessSantriBerkas(options.currentUser, 'memulihkan cadangan ZIP berkas santri');

    await ensureDeviceVaultHydrated();
    const e2eeCfg = options.settings.e2eeConfig;
    const isE2eeActive = Boolean(e2eeCfg?.enabled);
    if (isE2eeActive && !isDeviceUnlockedForConfig(e2eeCfg)) {
        throw new Error(
            'E2EE_LOCKED: Buka kunci Master Password E2EE terlebih dahulu sebelum memulihkan berkas agar tersimpan terenkripsi lokal.'
        );
    }

    const JSZip = await loadJsZip();
    const zip = await JSZip.loadAsync(zipFile);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
        throw new Error('File ZIP cadangan berkas tidak valid: manifest.json tidak ditemukan.');
    }

    const manifest = JSON.parse(await manifestFile.async('string')) as BerkasBackupManifest;
    if (
        !manifest ||
        manifest.format !== BERKAS_BACKUP_FORMAT ||
        manifest.version !== BERKAS_BACKUP_VERSION ||
        !Array.isArray(manifest.entries)
    ) {
        throw new Error('Format manifest cadangan berkas tidak valid.');
    }

    let decryptKey: CryptoKey | null = null;
    if (manifest.encrypted) {
        if (!options.password) {
            throw new Error('BERKAS_BACKUP_PASSWORD_REQUIRED: Arsip cadangan berkas ini terenkripsi. Masukkan password cadangan.');
        }
        if (
            manifest.cipher !== 'AES-GCM' ||
            manifest.kdf !== 'PBKDF2' ||
            !manifest.salt ||
            !Number.isFinite(manifest.iterations) ||
            (manifest.iterations as number) < 100000
        ) {
            throw new Error('Parameter enkripsi pada manifest cadangan berkas tidak valid.');
        }
        decryptKey = await deriveBerkasBackupAesKey(
            options.password,
            base64ToU8(manifest.salt),
            manifest.iterations as number,
            ['decrypt']
        );
    }

    let restored = 0;
    let rejected = 0;
    const errors: string[] = [];
    const total = manifest.entries.length;
    let verifiedAtLeastOneEncrypted = false;

    for (let i = 0; i < total; i++) {
        const entry = manifest.entries[i];
        const label = entry?.fieldLabel || entry?.fieldId || `entri-${i + 1}`;
        try {
            if (!entry || !isSafeArchiveRelativePath(entry.path)) {
                rejected++;
                errors.push(`${label}: path berkas di ZIP tidak valid.`);
                continue;
            }
            const zipEntry = zip.file(entry.path);
            if (!zipEntry) {
                rejected++;
                errors.push(`${label}: file "${entry.path}" hilang dari arsip ZIP.`);
                continue;
            }

            const rawBytes = await zipEntry.async('uint8array');
            let plainBytes: Uint8Array = rawBytes;

            if (manifest.encrypted && decryptKey) {
                if (!entry.entryIv || !entry.sha256) {
                    rejected++;
                    errors.push(`${label}: metadata dekripsi (IV/SHA-256) tidak lengkap.`);
                    continue;
                }
                try {
                    const ptBuf = await globalThis.crypto.subtle.decrypt(
                        {
                            name: 'AES-GCM',
                            iv: toExactArrayBuffer(base64ToU8(entry.entryIv)),
                            additionalData: buildBerkasBackupEntryAad(entry.path, entry.sha256),
                        },
                        decryptKey,
                        toExactArrayBuffer(rawBytes)
                    );
                    plainBytes = new Uint8Array(ptBuf);
                    verifiedAtLeastOneEncrypted = true;
                } catch {
                    if (!verifiedAtLeastOneEncrypted) {
                        throw new Error('Password cadangan berkas ZIP salah atau arsip rusak.');
                    }
                    rejected++;
                    errors.push(`${label}: gagal mendekripsi / terindikasi diubah.`);
                    continue;
                }
            }

            if (plainBytes.byteLength <= 0 || plainBytes.byteLength > PSB_BERKAS_MAX_BYTES) {
                rejected++;
                errors.push(`${label}: ukuran file (${plainBytes.byteLength} B) melanggar batas 5 MB.`);
                continue;
            }

            const { mime } = validateFetchedBerkasBytes(plainBytes, entry.mime, entry.namaBerkas);
            if (!PSB_BERKAS_ALLOWED_MIMES.has(mime)) {
                rejected++;
                errors.push(`${label}: tipe MIME tidak diizinkan (${mime}).`);
                continue;
            }

            const expectedSha = String(entry.sha256 || '').trim().toLowerCase();
            const actualSha = await computeSha256Hex(plainBytes);
            if (!/^[a-f0-9]{64}$/.test(expectedSha) || actualSha !== expectedSha) {
                rejected++;
                errors.push(`${label}: checksum SHA-256 tidak cocok (berkas korup atau dimodifikasi).`);
                continue;
            }

            const plainBlob = new Blob([toExactArrayBuffer(plainBytes)], { type: mime });
            const nowIso = entry.createdAt || new Date().toISOString();

            if (entry.pendaftarId !== undefined) {
                let blobToStore: Blob = plainBlob;
                let terenkripsi = false;
                let encryptionMeta: SantriBerkas['encryptionMeta'] = undefined;
                if (isE2eeActive && e2eeCfg) {
                    const enc = await encryptLocalBerkasBlob(plainBlob, e2eeCfg, {
                        context: BERKAS_LOCAL_E2EE_CONTEXT,
                        docId: `${entry.pendaftarId}:${entry.fieldId}`,
                    });
                    blobToStore = enc.encryptedBlob;
                    terenkripsi = true;
                    encryptionMeta = enc.encryptionMeta;
                }
                await upsertSantriBerkasIdempotent({
                    santriId: entry.santriId,
                    pendaftarId: entry.pendaftarId,
                    jenis: entry.jenis || 'lainnya',
                    fieldId: entry.fieldId,
                    fieldLabel: entry.fieldLabel,
                    namaBerkas: entry.namaBerkas,
                    mime,
                    ukuran: plainBytes.byteLength,
                    sha256: actualSha,
                    sumberSha256: entry.sumberSha256 || actualSha,
                    blob: blobToStore,
                    sumber: entry.sumber || 'lokal',
                    sumberRef: entry.sumberRef || '',
                    statusUnduh: 'tersimpan',
                    pesanError: undefined,
                    terenkripsi,
                    encryptionMeta,
                    asliTanpaKompresi: entry.asliTanpaKompresi,
                    createdAt: nowIso,
                    lastModified: Date.now(),
                });
            } else {
                const existingNoPend =
                    entry.santriId !== undefined
                        ? await db.santriBerkas
                              .where('santriId')
                              .equals(entry.santriId)
                              .filter((r) => r.fieldId === entry.fieldId)
                              .first()
                        : undefined;

                const targetId =
                    existingNoPend?.id ??
                    (await db.santriBerkas.add({
                        santriId: entry.santriId,
                        jenis: entry.jenis || 'lainnya',
                        fieldId: entry.fieldId,
                        fieldLabel: entry.fieldLabel,
                        namaBerkas: entry.namaBerkas,
                        mime,
                        ukuran: plainBytes.byteLength,
                        sha256: actualSha,
                        sumberSha256: entry.sumberSha256 || actualSha,
                        sumber: entry.sumber || 'lokal',
                        sumberRef: entry.sumberRef || '',
                        statusUnduh: 'cloud',
                        terenkripsi: false,
                        asliTanpaKompresi: entry.asliTanpaKompresi,
                        createdAt: nowIso,
                        lastModified: Date.now(),
                    }));

                let blobToStore: Blob = plainBlob;
                let terenkripsi = false;
                let encryptionMeta: SantriBerkas['encryptionMeta'] = undefined;
                if (isE2eeActive && e2eeCfg) {
                    const enc = await encryptLocalBerkasBlob(plainBlob, e2eeCfg, {
                        context: BERKAS_LOCAL_E2EE_CONTEXT,
                        docId: String(targetId),
                    });
                    blobToStore = enc.encryptedBlob;
                    terenkripsi = true;
                    encryptionMeta = enc.encryptionMeta;
                }

                await db.santriBerkas.put({
                    id: targetId,
                    santriId: entry.santriId,
                    jenis: entry.jenis || 'lainnya',
                    fieldId: entry.fieldId,
                    fieldLabel: entry.fieldLabel,
                    namaBerkas: entry.namaBerkas,
                    mime,
                    ukuran: plainBytes.byteLength,
                    sha256: actualSha,
                    sumberSha256: entry.sumberSha256 || actualSha,
                    blob: blobToStore,
                    sumber: entry.sumber || 'lokal',
                    sumberRef: entry.sumberRef || '',
                    statusUnduh: 'tersimpan',
                    pesanError: undefined,
                    terenkripsi,
                    encryptionMeta,
                    asliTanpaKompresi: entry.asliTanpaKompresi,
                    createdAt: existingNoPend?.createdAt || nowIso,
                    lastModified: Date.now(),
                });
            }

            restored++;
        } catch (err: any) {
            if (String(err?.message || '').includes('Password cadangan berkas ZIP salah')) {
                throw err;
            }
            rejected++;
            errors.push(`${label}: ${err?.message || 'gagal memulihkan entri'}`);
        } finally {
            options.onProgress?.({ processed: i + 1, total });
        }
    }

    await logActivity(
        'INSERT',
        'santriBerkas',
        `zip-restore-${Date.now()}`,
        null,
        {
            action: 'pulihkan_berkas_zip',
            totalEntries: total,
            restored,
            rejected,
        },
        options.currentUser?.username || options.currentUser?.fullName || 'Admin'
    );

    return {
        totalEntries: total,
        restored,
        rejected,
        errors,
    };
}

