import React, { useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Pendaftar, Santri, SantriBerkas } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { formatBytes } from '../../../utils/formatters';
import { createSafeBlobPreviewUrl } from '../../../utils/safePreview';
import {
    applyLocalFotoBerkasToSantri,
    BERKAS_UNSUPPORTED_BACKEND_LABEL,
    canAccessSantriBerkas,
    decryptSantriBerkasBlob,
    deleteAllLocalBerkasForSantri,
    deleteCloudCopiesForBerkasRows,
    deleteCloudCopyForSantriBerkas,
    deleteLocalSantriBerkas,
    detectPendaftarAttachments,
    getSantriBerkasBySantri,
    isAttachmentBackendOfflineSupported,
    isBerkasEligibleForCloudDeletion,
    linkPendaftarBerkasToSantri,
    redownloadSingleSantriBerkas,
    savePendaftarAttachmentsToDevice,
} from '../../../services/santriBerkasService';

interface TabBerkasSantriProps {
    formMethods: UseFormReturn<Santri>;
    santriData: Santri | null;
}

interface PreviewState {
    title: string;
    url: string;
    mime: string;
    fileName: string;
}

export const TabBerkasSantri: React.FC<TabBerkasSantriProps> = ({ formMethods, santriData }) => {
    const { settings, currentUser, showToast, showAlert, showConfirmation } = useAppContext();
    const canManageBerkas = canAccessSantriBerkas(currentUser);
    const santriId = santriData?.id || formMethods.watch('id') || 0;
    const backendSupport = useMemo(() => isAttachmentBackendOfflineSupported(settings), [settings]);

    const [simpanAsli, setSimpanAsli] = useState(false);
    const [busyId, setBusyId] = useState<number | 'all' | 'pull' | 'cloud-all' | null>(null);
    const [preview, setPreview] = useState<PreviewState | null>(null);

    useEffect(() => {
        return () => {
            if (preview?.url) {
                URL.revokeObjectURL(preview.url);
            }
        };
    }, [preview]);

    const linkedData = useLiveQuery(async (): Promise<{
        berkasList: SantriBerkas[];
        linkedPendaftar: Pendaftar | null;
    }> => {
        if (!canManageBerkas || !santriId || santriId <= 0) {
            return { berkasList: [], linkedPendaftar: null };
        }
        const linkedPendaftar = (await db.pendaftar.where('santriId').equals(santriId).first()) || null;
        const berkasList = await getSantriBerkasBySantri(santriId, linkedPendaftar?.id, currentUser);
        return { berkasList, linkedPendaftar };
    }, [canManageBerkas, santriId, currentUser]) || { berkasList: [], linkedPendaftar: null };

    const { berkasList, linkedPendaftar } = linkedData;

    const unpulledRefsCount = useMemo(() => {
        if (!linkedPendaftar) return 0;
        const detected = detectPendaftarAttachments(linkedPendaftar, settings);
        const savedFieldSet = new Set(
            berkasList.filter((b) => b.statusUnduh === 'tersimpan' && b.blob).map((b) => b.fieldId)
        );
        return detected.filter((d) => !savedFieldSet.has(d.fieldId)).length;
    }, [linkedPendaftar, berkasList, settings]);

    if (!canManageBerkas) {
        return (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                Akses ditolak: izin tulis PSB/Santri atau peran Admin diperlukan untuk melihat dan mengelola berkas lokal santri.
            </div>
        );
    }

    if (!santriId || santriId <= 0) {
        return (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Simpan data santri terlebih dahulu sebelum mengelola berkas lampiran offline.
            </div>
        );
    }

    const closePreview = () => {
        if (preview?.url) {
            URL.revokeObjectURL(preview.url);
        }
        setPreview(null);
    };

    const handlePreview = async (item: SantriBerkas) => {
        if (!item.id) return;
        setBusyId(item.id);
        try {
            const plainBlob = await decryptSantriBerkasBlob(item, settings, currentUser);
            const { url, mime } = createSafeBlobPreviewUrl(plainBlob, item.mime);
            if (preview?.url) URL.revokeObjectURL(preview.url);
            setPreview({
                title: item.fieldLabel || item.namaBerkas || item.fieldId,
                url,
                mime,
                fileName: item.namaBerkas || `${item.fieldId}`,
            });
        } catch (err: any) {
            const msg = String(err?.message || 'Gagal membuka pratinjau berkas.');
            if (msg.includes('E2EE_LOCKED')) {
                showAlert(
                    'E2EE Terkunci',
                    'Berkas ini terenkripsi lokal. Buka Master Password di Pengaturan > Keamanan E2EE terlebih dahulu untuk membuka pratinjau.'
                );
            } else {
                showAlert('Gagal Pratinjau', msg);
            }
        } finally {
            setBusyId(null);
        }
    };

    const handleRedownloadItem = async (item: SantriBerkas) => {
        if (!item.id) return;
        setBusyId(item.id);
        try {
            const updated = await redownloadSingleSantriBerkas(item.id, {
                settings,
                currentUser,
                simpanAsliTanpaKompresi: simpanAsli,
            });
            if (updated.statusUnduh === 'tersimpan') {
                showToast(`Berkas "${item.fieldLabel || item.fieldId}" berhasil diunduh ulang.`, 'success');
            } else if (updated.statusUnduh === 'cloud') {
                showToast('E2EE terkunci: buka Master Password dulu sebelum mengunduh ulang.', 'info');
            } else {
                showToast(updated.pesanError || 'Berkas gagal diunduh ulang.', 'info');
            }
        } catch (err: any) {
            showAlert('Gagal Unduh Ulang', err?.message || 'Terjadi kesalahan saat mengunduh ulang berkas.');
        } finally {
            setBusyId(null);
        }
    };

    const handlePullFromLinkedPendaftar = async () => {
        if (!linkedPendaftar) return;
        setBusyId('pull');
        try {
            const summary = await savePendaftarAttachmentsToDevice([linkedPendaftar], {
                settings,
                currentUser,
                simpanAsliTanpaKompresi: simpanAsli,
                onlyFailedOrCloud: true,
            });
            await linkPendaftarBerkasToSantri(linkedPendaftar.id, santriId, currentUser);
            if (summary.saved > 0) {
                showToast(`${summary.saved} berkas berhasil ditarik ke penyimpanan offline.`, 'success');
            } else if (summary.lockedWaitingUnlock > 0) {
                showToast('E2EE terkunci: buka Master Password terlebih dahulu.', 'info');
            } else if (summary.unsupported > 0) {
                showToast(`Lampiran ${BERKAS_UNSUPPORTED_BACKEND_LABEL}.`, 'info');
            } else if (summary.failed > 0) {
                showToast(`${summary.failed} berkas gagal diunduh.`, 'error');
            } else {
                showToast('Semua berkas dari pendaftar sudah tersimpan di perangkat.', 'info');
            }
        } catch (err: any) {
            showAlert('Gagal Tarik Lampiran', err?.message || 'Terjadi kesalahan.');
        } finally {
            setBusyId(null);
        }
    };

    const handleApplyFoto = (item: SantriBerkas) => {
        if (!item.id) return;
        showConfirmation(
            'Jadikan Foto Profil Santri?',
            `Terapkan berkas "${item.fieldLabel || item.fieldId}" sebagai foto profil santri ini? Foto profil saat ini akan diganti dengan gambar lokal tersebut.`,
            async () => {
                setBusyId(item.id!);
                try {
                    const dataUrl = await applyLocalFotoBerkasToSantri(santriId, item.id!, currentUser, settings);
                    formMethods.setValue('fotoUrl', dataUrl, { shouldDirty: false });
                    showToast('Foto profil santri berhasil diperbarui dari berkas lokal.', 'success');
                } catch (err: any) {
                    showAlert('Gagal Memperbarui Foto', err?.message || 'Terjadi kesalahan.');
                } finally {
                    setBusyId(null);
                }
            },
            { confirmText: 'Ya, Terapkan Foto', confirmColor: 'blue' }
        );
    };

    const handleDeleteOne = (item: SantriBerkas) => {
        if (!item.id) return;
        showConfirmation(
            'Hapus Berkas Lokal?',
            `Hapus berkas "${item.fieldLabel || item.fieldId}" dari penyimpanan perangkat ini? Salinan di cloud tidak ikut terhapus.`,
            async () => {
                setBusyId(item.id!);
                try {
                    await deleteLocalSantriBerkas(item.id!, currentUser);
                    showToast('Berkas lokal dihapus dari perangkat.', 'success');
                } catch (err: any) {
                    showAlert('Gagal Menghapus', err?.message || 'Terjadi kesalahan.');
                } finally {
                    setBusyId(null);
                }
            },
            { confirmText: 'Ya, Hapus', confirmColor: 'red' }
        );
    };

    const handleDeleteAllForSantri = () => {
        if (berkasList.length === 0) return;
        showConfirmation(
            'Hapus Semua Berkas Lokal Santri Ini?',
            `Tindakan ini akan menghapus ${berkasList.length} entri berkas lokal milik santri ini dari penyimpanan perangkat. Salinan di cloud tetap aman.`,
            async () => {
                setBusyId('all');
                try {
                    const count = await deleteAllLocalBerkasForSantri(santriId, currentUser);
                    showToast(`${count} berkas lokal santri dihapus.`, 'success');
                } catch (err: any) {
                    showAlert('Gagal Menghapus Semua Berkas', err?.message || 'Terjadi kesalahan.');
                } finally {
                    setBusyId(null);
                }
            },
            { confirmText: 'Ya, Hapus Semua', confirmColor: 'red' }
        );
    };

    const cloudEligibleItems = berkasList.filter((item) => isBerkasEligibleForCloudDeletion(item).eligible);

    const handleDeleteCloudOne = (item: SantriBerkas) => {
        if (!item.id) return;
        const targetCloudDesc =
            item.sumber === 'gas'
                ? 'memindahkan berkas asli ke Trash Google Drive'
                : 'menghapus berkas asli secara permanen dari Firebase Storage';
        showConfirmation(
            'Hapus Salinan Cloud Berkas?',
            `Tindakan ini akan ${targetCloudDesc} untuk "${item.fieldLabel || item.namaBerkas || item.fieldId}". Salinan offline yang sudah tersimpan & terverifikasi di perangkat ini TETAP aman, namun pastikan Anda sudah mencadangkan arsip ZIP berkas lebih dulu.`,
            async () => {
                setBusyId(item.id!);
                try {
                    await deleteCloudCopyForSantriBerkas(item.id!, { settings, currentUser });
                    showToast('Salinan cloud berkas berhasil dihapus; salinan offline tetap tersimpan.', 'success');
                } catch (err: any) {
                    showAlert('Gagal Hapus Salinan Cloud', err?.message || 'Terjadi kesalahan saat menghapus salinan cloud.');
                } finally {
                    setBusyId(null);
                }
            },
            { confirmText: 'Ya, Hapus Salinan Cloud', confirmColor: 'red' }
        );
    };

    const handleDeleteCloudAllForSantri = () => {
        if (cloudEligibleItems.length === 0) return;
        showConfirmation(
            'Hapus Semua Salinan Cloud Santri Ini?',
            `Sebanyak ${cloudEligibleItems.length} berkas santri ini sudah tersimpan & terverifikasi offline. Lanjutkan menghapus salinan cloud (Drive Trash / Firebase Storage)? Salinan offline di perangkat tetap aman, tetapi sebaiknya buat cadangan ZIP berkas dulu.`,
            async () => {
                setBusyId('cloud-all');
                try {
                    const summary = await deleteCloudCopiesForBerkasRows(cloudEligibleItems, {
                        settings,
                        currentUser,
                    });
                    if (summary.failed > 0) {
                        showAlert(
                            'Sebagian Salinan Cloud Gagal Dihapus',
                            `Berhasil: ${summary.deleted}, Gagal: ${summary.failed}. ${summary.errors[0]?.message || ''}`
                        );
                    } else {
                        showToast(`${summary.deleted} salinan cloud berhasil dihapus; salinan offline tetap aman.`, 'success');
                    }
                } catch (err: any) {
                    showAlert('Gagal Hapus Salinan Cloud', err?.message || 'Terjadi kesalahan.');
                } finally {
                    setBusyId(null);
                }
            },
            { confirmText: 'Ya, Hapus Semua Cloud', confirmColor: 'red' }
        );
    };

    const totalSize = berkasList.reduce((acc, item) => acc + (item.ukuran || item.blob?.size || 0), 0);

    return (
        <div className="space-y-4">
            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h4 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                        <i className="bi bi-folder2-open text-sky-700"></i>
                        Lampiran Berkas Offline Santri
                    </h4>
                    <p className="text-xs text-sky-800 mt-0.5">
                        Total tersimpan: <strong>{berkasList.length}</strong> entri ({formatBytes(totalSize)}). Berkas lokal tidak ikut disinkronkan ke cloud atau cadangan JSON.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {linkedPendaftar && unpulledRefsCount > 0 && (
                        <button
                            type="button"
                            disabled={busyId !== null || !backendSupport.supported}
                            onClick={handlePullFromLinkedPendaftar}
                            className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {busyId === 'pull' ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-cloud-arrow-down-fill"></i>}
                            Tarik Lampiran PSB ({unpulledRefsCount})
                        </button>
                    )}
                    {cloudEligibleItems.length > 0 && (
                        <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={handleDeleteCloudAllForSantri}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {busyId === 'cloud-all' ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-cloud-slash-fill"></i>}
                            Hapus Salinan Cloud ({cloudEligibleItems.length})
                        </button>
                    )}
                    {berkasList.length > 0 && (
                        <button
                            type="button"
                            disabled={busyId !== null}
                            onClick={handleDeleteAllForSantri}
                            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <i className="bi bi-trash3"></i>
                            Hapus Semua Berkas Lokal
                        </button>
                    )}
                </div>
            </div>

            {!backendSupport.supported && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0"></i>
                    <span>
                        Backend saat ini (<strong>{backendSupport.provider.toUpperCase()}</strong>) berstatus <strong>{BERKAS_UNSUPPORTED_BACKEND_LABEL}</strong> untuk penarikan ulang dari cloud.
                    </span>
                </div>
            )}

            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={simpanAsli}
                    onChange={(e) => setSimpanAsli(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 border-gray-300"
                />
                <span>Simpan gambar asli tanpa kompresi saat mengunduh ulang (default: 1600px JPEG 0,8)</span>
            </label>

            {berkasList.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-500 space-y-2">
                    <i className="bi bi-inbox text-3xl text-slate-300 block"></i>
                    <div>Belum ada berkas lampiran yang tersimpan secara offline untuk santri ini.</div>
                    {linkedPendaftar && unpulledRefsCount > 0 && (
                        <div className="text-xs text-sky-700">
                            Terdeteksi {unpulledRefsCount} lampiran di data PSB pendaftar. Klik tombol <strong>Tarik Lampiran PSB</strong> di atas untuk mengunduh.
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {berkasList.map((item) => {
                        const isSaved = item.statusUnduh === 'tersimpan' && !!item.blob;
                        const isImage = item.mime?.startsWith('image/');
                        const statusInfo =
                            item.statusUnduh === 'tersimpan'
                                ? { label: 'Tersimpan offline', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
                                : item.statusUnduh === 'gagal'
                                ? { label: 'Gagal', cls: 'bg-red-100 text-red-800 border-red-200' }
                                : item.statusUnduh === 'tidak_didukung'
                                ? { label: BERKAS_UNSUPPORTED_BACKEND_LABEL, cls: 'bg-amber-100 text-amber-800 border-amber-200' }
                                : { label: 'Hanya di cloud', cls: 'bg-slate-100 text-slate-700 border-slate-200' };

                        return (
                            <div key={item.id ?? item.fieldId} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm text-slate-800 truncate">
                                            {item.fieldLabel || item.namaBerkas || item.fieldId}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                                            <span className="uppercase font-semibold px-1.5 py-0.2 bg-slate-100 rounded border border-slate-200">
                                                {item.jenis}
                                            </span>
                                            <span>{item.mime || item.sumber.toUpperCase()}</span>
                                            {item.ukuran > 0 && <span>• {formatBytes(item.ukuran)}</span>}
                                            {item.terenkripsi && (
                                                <span className="text-indigo-700 font-semibold flex items-center gap-0.5">
                                                    <i className="bi bi-lock-fill"></i> Terenkripsi lokal
                                                </span>
                                            )}
                                            {item.cloudDeletedAt && (
                                                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                                    <i className="bi bi-cloud-slash"></i> Cloud dihapus
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusInfo.cls}`}>
                                        {statusInfo.label}
                                    </span>
                                </div>

                                {item.pesanError && item.statusUnduh !== 'tersimpan' && (
                                    <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                        {item.pesanError}
                                    </div>
                                )}

                                {item.sha256 && (
                                    <div className="text-[10px] font-mono text-slate-400 truncate">
                                        SHA-256: {item.sha256}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                                    {isSaved && (
                                        <button
                                            type="button"
                                            disabled={busyId !== null}
                                            onClick={() => handlePreview(item)}
                                            className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <i className="bi bi-eye-fill"></i>
                                            Pratinjau
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={busyId !== null || !backendSupport.supported || Boolean(item.cloudDeletedAt)}
                                        onClick={() => handleRedownloadItem(item)}
                                        title={item.cloudDeletedAt ? 'Salinan cloud telah dihapus' : 'Unduh ulang dari cloud'}
                                        className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <i className={`bi ${busyId === item.id ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'}`}></i>
                                        Unduh Ulang
                                    </button>
                                    {isSaved && isImage && (
                                        <button
                                            type="button"
                                            disabled={busyId !== null}
                                            onClick={() => handleApplyFoto(item)}
                                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <i className="bi bi-person-bounding-box"></i>
                                            Jadikan Foto Profil
                                        </button>
                                    )}
                                    {isBerkasEligibleForCloudDeletion(item).eligible && (
                                        <button
                                            type="button"
                                            disabled={busyId !== null}
                                            onClick={() => handleDeleteCloudOne(item)}
                                            title="Hapus salinan berkas di cloud (salinan offline tetap dipertahankan)"
                                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <i className="bi bi-cloud-slash"></i>
                                            Hapus Cloud
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={busyId !== null}
                                        onClick={() => handleDeleteOne(item)}
                                        className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1 ml-auto disabled:opacity-50"
                                    >
                                        <i className="bi bi-trash"></i>
                                        Hapus Lokal
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {preview && (
                <div className="fixed inset-0 bg-black/75 z-[110] flex items-center justify-center p-4" onClick={closePreview}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                            <div className="font-bold text-sm text-slate-800 truncate">{preview.title}</div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={preview.url}
                                    download={preview.fileName}
                                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"
                                >
                                    <i className="bi bi-download"></i>
                                    Simpan File
                                </a>
                                <button
                                    type="button"
                                    onClick={closePreview}
                                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>
                        <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100">
                            {preview.mime === 'application/pdf' ? (
                                <iframe
                                    src={preview.url}
                                    title={preview.title}
                                    className="w-full h-[70vh] rounded-lg border bg-white"
                                />
                            ) : (
                                <img
                                    src={preview.url}
                                    alt={preview.title}
                                    className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-sm bg-white"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
