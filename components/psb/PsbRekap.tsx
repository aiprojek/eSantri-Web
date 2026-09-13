import React, { Suspense, useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { Pendaftar, PondokSettings, Santri, RiwayatStatus, Tagihan, PendaftarStatus } from '../../types';
import { db } from '../../db';
import { loadJsZip, loadSyncService } from '../../utils/lazyCloudServices';
import { loadFirebaseRealtimeRuntime } from '../../utils/lazyFirebaseRuntimes';
import { buildStandardExportFileName } from '../../utils/exportFileName';
import { LoadingFallback } from '../common/LoadingFallback';
import { PsbExamCardModal } from './modals/PsbExamCardModal';
import { PsbAcceptanceModal } from './modals/PsbAcceptanceModal';
import { PsbPrintFormModal } from './modals/PsbPrintFormModal';
import { PsbGasConfigModal } from './modals/PsbGasConfigModal';
import { PsbAnnouncementModal } from './modals/PsbAnnouncementModal';
import { getPsbRegistrationNumber, calculatePsbAverageScore, openWhatsappChat } from './utils/psbUtils';

const PendaftarModal = React.lazy(() => import('./modals/PendaftarModal').then((module) => ({ default: module.PendaftarModal })));
const BulkPendaftarEditor = React.lazy(() => import('./modals/BulkPendaftarEditor').then((module) => ({ default: module.BulkPendaftarEditor })));

interface PsbRekapProps {
    pendaftarList: Pendaftar[];
    settings: PondokSettings;
    onImportFromWA: (text: string) => void;
    onUpdateList: () => void;
    canWrite: boolean;
}

export const PsbRekap: React.FC<PsbRekapProps> = ({ pendaftarList, settings, onImportFromWA, onUpdateList, canWrite }) => {
    const { showToast, showConfirmation, showAlert } = useAppContext();
    const { onBulkAddSantri } = useSantriContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterJenjang, setFilterJenjang] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [waInput, setWaInput] = useState('');
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isGasModalOpen, setIsGasModalOpen] = useState(false);
    
    const [isPendaftarModalOpen, setIsPendaftarModalOpen] = useState(false);
    const [editingPendaftar, setEditingPendaftar] = useState<Pendaftar | null>(null);
    const [examCardPendaftar, setExamCardPendaftar] = useState<Pendaftar | null>(null);
    const [acceptancePendaftar, setAcceptancePendaftar] = useState<Pendaftar | null>(null);
    const [printFormPendaftar, setPrintFormPendaftar] = useState<Pendaftar | null>(null);
    const [isBulkEditorOpen, setIsBulkEditorOpen] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

    // Submission method from settings
    const method = settings.psbConfig.submissionMethod === 'portal' ? 'hybrid' : settings.psbConfig.submissionMethod;
    const scriptUrl = settings.psbConfig.googleScriptUrl;

    const filteredData = useMemo(() => {
        return pendaftarList.filter(p => {
            const noReg = p.nomorRegistrasi || '';
            const matchSearch = p.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               (p.nisn && p.nisn.includes(searchTerm)) ||
                               (p.nomorHpWali && p.nomorHpWali.includes(searchTerm)) ||
                               noReg.toLowerCase().includes(searchTerm.toLowerCase());
            const matchJenjang = !filterJenjang || p.jenjangId === parseInt(filterJenjang);
            const matchStatus = !filterStatus || p.status === filterStatus;
            return matchSearch && matchJenjang && matchStatus;
        });
    }, [pendaftarList, searchTerm, filterJenjang, filterStatus]);

    const psbStats = useMemo(() => {
        return {
            total: pendaftarList.length,
            baru: pendaftarList.filter((p) => p.status === 'Baru').length,
            verifikasi: pendaftarList.filter((p) => p.status === 'Verifikasi Berkas').length,
            ujian: pendaftarList.filter((p) => p.status === 'Ujian Masuk').length,
            cadangan: pendaftarList.filter((p) => p.status === 'Cadangan').length,
            diterima: pendaftarList.filter((p) => p.status === 'Diterima').length,
            ditolak: pendaftarList.filter((p) => p.status === 'Ditolak').length,
        };
    }, [pendaftarList]);

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Diterima':
                return 'bg-green-100 text-green-800 border border-green-300';
            case 'Verifikasi Berkas':
                return 'bg-amber-100 text-amber-800 border border-amber-300';
            case 'Ujian Masuk':
                return 'bg-purple-100 text-purple-800 border border-purple-300';
            case 'Cadangan':
                return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
            case 'Baru':
                return 'bg-blue-100 text-blue-800 border border-blue-300';
            case 'Ditolak':
                return 'bg-red-100 text-red-800 border border-red-300';
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-300';
        }
    };

    const handleInternalSync = async () => {
        if (!canWrite) return;
        const config = settings.cloudSyncConfig;
        if (!config || config.provider === 'none') {
            showAlert('Konfigurasi Cloud Belum Aktif', 'Silakan aktifkan Cloud (Firebase Realtime atau Dropbox) di menu Pengaturan untuk menggunakan fitur sinkronisasi antar-admin.');
            return;
        }

        setIsSyncing(true);
        try {
            if (config.provider === 'firebase') {
                const { auth } = await import('../../firebaseAuth');
                const actualTenantId = config.firebasePairedTenantId || auth?.currentUser?.uid || 'default';
                const { syncPsbWithFirebaseHub } = await loadFirebaseRealtimeRuntime();
                const result = await syncPsbWithFirebaseHub(actualTenantId);
                onUpdateList();
                showToast(`Sinkronisasi Firebase Hub selesai! ${result.pulledCount} data ditarik, ${result.pushedCount} data diunggah ke Cloud. Total: ${result.total} pendaftar.`, 'success');
                return;
            }

            if (config.provider === 'dropbox') {
                // Get valid token first to ensure auth
                const { getValidDropboxToken, fetchPsbFromDropbox } = await loadSyncService();
                const token = await getValidDropboxToken(config);
                const newItems = await fetchPsbFromDropbox(token);

                if (newItems.length > 0) {
                    // Filter existing by Name + HP (Simple de-dupe)
                    const existingKeys = new Set(pendaftarList.map(p => p.namaLengkap + (p.nomorHpWali || '')));
                    const reallyNewItems = newItems.filter((p: any) => !existingKeys.has(p.namaLengkap + (p.nomorHpWali || '')));

                    if (reallyNewItems.length > 0) {
                        // Assign new local IDs
                        const itemsWithId = reallyNewItems.map((item: any) => ({
                            ...item,
                            id: Date.now() + Math.random(),
                            lastModified: item.lastModified || Date.now()
                        }));
                        
                        await db.pendaftar.bulkAdd(itemsWithId);
                        onUpdateList();
                        showToast(`${itemsWithId.length} data pendaftar baru ditarik dari Dropbox.`, 'success');
                    } else {
                        showToast('Data di cloud sudah sinkron dengan lokal.', 'info');
                    }
                } else {
                    showToast('Tidak ada data pendaftaran baru di Cloud (Folder Inbox).', 'info');
                }
                return;
            }

            showAlert('Provider Tidak Didukung', `Provider "${config.provider}" belum mendukung fitur tarik data posko.`);
        } catch (e: any) {
            showAlert('Gagal Sinkronisasi', e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGoogleSync = async () => {
        if (!canWrite) return;
        if (!scriptUrl || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(scriptUrl.trim())) {
            setIsGasModalOpen(true);
            return;
        }

        setIsSyncing(true);
        try {
            // Fetch data from Google Apps Script (doGet)
            const response = await fetch(scriptUrl);
            if (!response.ok) throw new Error('Gagal menghubungi Google Script. Cek koneksi internet.');
            
            const rawData = await response.json();
            
            if (!Array.isArray(rawData)) throw new Error('Format data dari Google Sheet tidak valid.');

            let addedCount = 0;
            const existingNames = new Set(pendaftarList.map(p => p.namaLengkap.toLowerCase().trim()));

            // Define fields that map directly to Pendaftar, others go to customData
            const standardFields = [
                'namaLengkap', 'nisn', 'nik', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 
                'alamat', 'desaKelurahan', 'kecamatan', 'kabupatenKota', 'provinsi', 'kodePos',
                'namaAyah', 'nikAyah', 'statusAyah', 'pekerjaanAyah', 'pendidikanAyah', 'penghasilanAyah', 'teleponAyah',
                'namaIbu', 'nikIbu', 'statusIbu', 'pekerjaanIbu', 'pendidikanIbu', 'penghasilanIbu', 'teleponIbu',
                'namaWali', 'nomorHpWali', 'jenjangId', 'asalSekolah', 'tanggalDaftar', 'Timestamp',
                'catatan', 'jalurPendaftaran'
            ];

            for (const item of rawData) {
                // Validation: Must have name
                if (!item.namaLengkap) continue;
                
                // Duplicate Check (Simple by Name)
                if (existingNames.has(item.namaLengkap.toString().toLowerCase().trim())) continue;

                // Separate Custom Fields / Files
                const customDataObj: any = {};
                Object.keys(item).forEach(key => {
                    // If key is NOT a standard field, treat it as custom data (this handles File Links too)
                    if (!standardFields.includes(key)) {
                        customDataObj[key] = item[key];
                    }
                });

                const newPendaftar: Pendaftar = {
                    id: Date.now() + Math.random(), // Ensure unique ID locally
                    namaLengkap: item.namaLengkap,
                    nisn: item.nisn || '',
                    nik: item.nik || '',
                    nis: '',
                    jenisSantri: 'Mondok - Baru',
                    kelasId: 0,
                    rombelId: 0,
                    jenisKelamin: item.jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
                    tempatLahir: item.tempatLahir || '',
                    tanggalLahir: item.tanggalLahir || '',
                    alamat: {
                        detail: item.alamat || '',
                        desaKelurahan: item.desaKelurahan || '',
                        kecamatan: item.kecamatan || '',
                        kabupatenKota: item.kabupatenKota || '',
                        provinsi: item.provinsi || '',
                        kodePos: item.kodePos || '',
                    },
                    
                    namaWali: item.namaWali || '',
                    nomorHpWali: item.nomorHpWali || '',
                    jenjangId: parseInt(item.jenjangId) || settings.psbConfig.targetJenjangId || 0,
                    asalSekolah: item.asalSekolah || '',
                    tanggalDaftar: item.tanggalDaftar || item.Timestamp || new Date().toISOString(),
                    // Fix: Add missing tanggalMasuk required by Pendaftar type (from Santri)
                    tanggalMasuk: item.tanggalDaftar || item.Timestamp || new Date().toISOString(),
                    status: 'Baru',
                    kewarganegaraan: 'WNI',
                    gelombang: settings.psbConfig.activeGelombang,
                    
                    // Fix: Add missing fields required by Pendaftar type
                    catatan: item.catatan || '',
                    jalurPendaftaran: item.jalurPendaftaran || 'Reguler',

                    // Store extra fields (including Google Drive Links) here
                    customData: JSON.stringify(customDataObj),
                    
                    namaAyah: item.namaAyah || '',
                    nikAyah: item.nikAyah || '',
                    pekerjaanAyah: item.pekerjaanAyah || '',
                    teleponAyah: item.teleponAyah || '',
                    
                    namaIbu: item.namaIbu || '',
                    nikIbu: item.nikIbu || '',
                    pekerjaanIbu: item.pekerjaanIbu || '',
                    teleponIbu: item.teleponIbu || '',
                    lastModified: Date.now(),
                };

                await db.pendaftar.add(newPendaftar);
                addedCount++;
            }

            if (addedCount > 0) {
                onUpdateList();
                showToast(`Berhasil menarik ${addedCount} data pendaftar baru dari Google Sheet.`, 'success');
            } else {
                showToast('Tidak ada data baru. Semua data di Sheet sudah ada di aplikasi.', 'info');
            }

        } catch (e: any) {
            console.error(e);
            showAlert('Gagal Tarik Data', `Terjadi kesalahan: ${e.message}. Pastikan script sudah di-deploy sebagai Web App (Exec: Me, Access: Anyone).`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleProcessWA = () => {
        if(!waInput.trim()) return;
        
        try {
            // Check for New Hybrid Format (Base64 Encoded Backup)
            const backupMatch = waInput.match(/PSB_BACKUP_START([\s\S]*?)PSB_BACKUP_END/);
            
            if (backupMatch && backupMatch[1]) {
                const encoded = backupMatch[1].trim();
                // Decode: Base64 -> String (escaped) -> String (UTF-8)
                const jsonString = decodeURIComponent(escape(atob(encoded)));
                const data = JSON.parse(jsonString);
                
                processPendaftarData(data);
                showToast('Data Backup Terenkripsi berhasil diproses!', 'success');
                setWaInput('');
                setIsWaModalOpen(false);
                return;
            }

            // Fallback to Old JSON Format
            const jsonMatch = waInput.match(/PSB_START([\s\S]*?)PSB_END/);
            if (jsonMatch && jsonMatch[1]) {
                const data = JSON.parse(jsonMatch[1].trim());
                processPendaftarData(data);
                showToast('Data JSON berhasil diimpor.', 'success');
                setWaInput('');
                setIsWaModalOpen(false);
                return;
            }

            showToast('Format pesan tidak valid. Pastikan menyalin kode PSB_BACKUP_START atau PSB_START.', 'error');

        } catch (e) {
            console.error(e);
            showToast('Gagal memproses data. Kode mungkin rusak atau tidak lengkap.', 'error');
        }
    }

    const processPendaftarData = (data: any) => {
        const newPendaftar: Pendaftar = {
            id: Date.now(),
            ...data,
            jenjangId: parseInt(data.jenjangId),
            tanggalDaftar: data.tanggalDaftar || new Date().toISOString(),
            // Fix: Add missing tanggalMasuk required by Pendaftar type (from Santri)
            tanggalMasuk: data.tanggalDaftar || new Date().toISOString(),
            status: 'Baru',
            kewarganegaraan: data.kewarganegaraan || 'WNI',
            gelombang: settings.psbConfig.activeGelombang,
            lastModified: Date.now(),
        };
        db.pendaftar.add(newPendaftar).then(() => {
            onUpdateList();
        });
    }

    const handleDelete = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Pendaftar?', 'Data ini akan dihapus permanen.', async () => {
            await db.pendaftar.delete(id);
            onUpdateList();
            showToast('Pendaftar dihapus', 'success');
        }, { confirmColor: 'red' });
    }

    const handleAccept = (pendaftar: Pendaftar) => {
        if (!canWrite) return;
        setAcceptancePendaftar(pendaftar);
    };

    const handleAcceptConfirmed = async (
        pendaftar: Pendaftar,
        billingOption?: {
            createBilling: boolean;
            biayaId: number;
            nominal: number;
            deskripsi: string;
        }
    ) => {
        if (!canWrite) return;
        const customData = pendaftar.customData ? JSON.parse(pendaftar.customData) : {};
        const firstRiwayat: RiwayatStatus = {
            id: Date.now(),
            status: 'Masuk',
            tanggal: new Date().toISOString().split('T')[0],
            keterangan: 'Diterima melalui Penerimaan Santri Baru (PSB)'
        };

        const newSantriId = Date.now();
        const newSantri: Santri = {
            id: newSantriId,
            namaLengkap: pendaftar.namaLengkap,
            namaHijrah: pendaftar.namaHijrah,
            nis: '', // Will be generated later
            nisn: pendaftar.nisn,
            nik: pendaftar.nik,
            tempatLahir: pendaftar.tempatLahir,
            tanggalLahir: pendaftar.tanggalLahir,
            jenisKelamin: pendaftar.jenisKelamin,
            kewarganegaraan: (pendaftar.kewarganegaraan as 'WNI' | 'WNA' | 'Keturunan') || 'WNI',
            fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto',
            jenisSantri: 'Mondok - Baru',
            
            // Address Mapping
            alamat: { 
                detail: pendaftar.alamat.detail, 
                desaKelurahan: pendaftar.alamat.desaKelurahan, 
                kecamatan: pendaftar.alamat.kecamatan, 
                kabupatenKota: pendaftar.alamat.kabupatenKota, 
                provinsi: pendaftar.alamat.provinsi, 
                kodePos: pendaftar.alamat.kodePos 
            },

            // Parent Data Mapping
            namaAyah: pendaftar.namaAyah,
            nikAyah: pendaftar.nikAyah,
            statusAyah: pendaftar.statusAyah,
            pekerjaanAyah: pendaftar.pekerjaanAyah,
            pendidikanAyah: pendaftar.pendidikanAyah,
            penghasilanAyah: pendaftar.penghasilanAyah,
            teleponAyah: pendaftar.teleponAyah,

            namaIbu: pendaftar.namaIbu,
            nikIbu: pendaftar.nikIbu,
            statusIbu: pendaftar.statusIbu,
            pekerjaanIbu: pendaftar.pekerjaanIbu,
            pendidikanIbu: pendaftar.pendidikanIbu,
            penghasilanIbu: pendaftar.penghasilanIbu,
            teleponIbu: pendaftar.teleponIbu,

            namaWali: pendaftar.namaWali,
            teleponWali: pendaftar.nomorHpWali,
            statusWali: pendaftar.statusWali || customData.hubunganWali,
            statusHidupWali: pendaftar.statusHidupWali,
            pekerjaanWali: pendaftar.pekerjaanWali,
            pendidikanWali: pendaftar.pendidikanWali,
            penghasilanWali: pendaftar.penghasilanWali,

            // Academic & Status
            jenjangId: pendaftar.jenjangId,
            kelasId: 0,
            rombelId: 0,
            status: 'Aktif',
            tanggalMasuk: new Date().toISOString().split('T')[0],
            sekolahAsal: pendaftar.asalSekolah,
            alamatSekolahAsal: pendaftar.alamatSekolahAsal,
            
            statusKeluarga: pendaftar.statusKeluarga,
            anakKe: pendaftar.anakKe,
            jumlahSaudara: pendaftar.jumlahSaudara,
            berkebutuhanKhusus: pendaftar.berkebutuhanKhusus,
            riwayatStatus: [firstRiwayat],
            lastModified: Date.now()
        };

        try {
            await db.santri.put(newSantri);

            // Optional automated billing for registration fee
            if (billingOption?.createBilling && billingOption.nominal > 0) {
                const newTagihan: Tagihan = {
                    id: Date.now() + 1,
                    santriId: newSantriId,
                    biayaId: billingOption.biayaId || 0,
                    deskripsi: billingOption.deskripsi || `Daftar Ulang - ${pendaftar.namaLengkap}`,
                    bulan: new Date().getMonth() + 1,
                    tahun: new Date().getFullYear(),
                    nominal: billingOption.nominal,
                    status: 'Belum Lunas',
                    lastModified: Date.now()
                };
                await db.tagihan.add(newTagihan);
            }

            await db.pendaftar.update(pendaftar.id, {
                status: 'Diterima',
                lastModified: Date.now()
            });

            onUpdateList();
            showToast(`${pendaftar.namaLengkap} resmi diterima! Data santri tersimpan${billingOption?.createBilling ? ' beserta tagihan daftar ulang.' : '.'}`, 'success');
        } catch (e: any) {
            console.error(e);
            showAlert('Gagal Menerima Santri', e.message || 'Terjadi kesalahan saat memproses penerimaan.');
        }
    };

    const handleQuickStatusChange = async (pendaftar: Pendaftar, newStatus: PendaftarStatus) => {
        if (!canWrite) return;
        if (newStatus === 'Diterima') {
            setAcceptancePendaftar(pendaftar);
            return;
        }

        try {
            await db.pendaftar.update(pendaftar.id, {
                status: newStatus,
                lastModified: Date.now()
            });
            onUpdateList();
            showToast(`Status ${pendaftar.namaLengkap} diubah menjadi "${newStatus}".`, 'success');
        } catch (e: any) {
            showAlert('Gagal Ubah Status', e.message);
        }
    };

    const handleSavePendaftar = async (data: Omit<Pendaftar, 'id'>) => {
        await db.pendaftar.add({ ...data, lastModified: Date.now() } as Pendaftar);
        onUpdateList();
        showToast('Pendaftar berhasil ditambahkan', 'success');
    }

    const handleUpdatePendaftar = async (data: Pendaftar) => {
        await db.pendaftar.put({ ...data, lastModified: Date.now() });
        onUpdateList();
        showToast('Data pendaftar diperbarui', 'success');
    }

    const handleDownloadArchive = async () => {
        if (pendaftarList.length === 0) {
            showAlert('Kosong', 'Tidak ada data pendaftar untuk diarsipkan.');
            return;
        }

        setIsArchiving(true);
        const JSZip = await loadJsZip();
        const zip = new JSZip();
        let fileCount = 0;

        try {
            showToast('Menyiapkan arsip dokumen...', 'info');
            
            for (const p of pendaftarList) {
                const customData = p.customData ? JSON.parse(p.customData) : {};
                const files = Object.keys(customData).filter(key => {
                    const val = customData[key];
                    return typeof val === 'string' && (val.startsWith('data:') || val.startsWith('http'));
                });

                if (files.length === 0) continue;

                const folder = zip.folder(p.namaLengkap.replace(/[^a-zA-Z0-9]/g, '_'));
                
                for (const fKey of files) {
                    const val = customData[fKey];
                    try {
                        const response = await fetch(val);
                        const blob = await response.blob();
                        const extension = val.includes('image/') ? 'jpg' : 'pdf'; // Guess if not clear
                        const fileName = `${fKey.replace(/ /g, '_')}.${extension}`;
                        folder?.file(fileName, blob);
                        fileCount++;
                    } catch (e) {
                        console.error(`Failed to download ${fKey} for ${p.namaLengkap}`, e);
                    }
                }
            }

            if (fileCount === 0) {
                showAlert('Tidak Ada Dokumen', 'Tidak ditemukan berkas yang bisa diunduh dari daftar pendaftar saat ini.');
                return;
            }

            const content = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${buildStandardExportFileName('arsip-psb', ['dokumen'])}.zip`;
            link.click();
            window.URL.revokeObjectURL(url);
            
            showToast(`Berhasil mengarsipkan ${fileCount} dokumen.`, 'success');
        } catch (error: any) {
            showAlert('Gagal Arsip', `Terjadi kesalahan saat membuat arsip: ${error.message}`);
        } finally {
            setIsArchiving(false);
        }
    };

    const handleBulkSave = async (data: Partial<Pendaftar>[]) => {
        const newItems = data.map(d => ({
            ...d,
            status: d.status || 'Baru',
            tanggalDaftar: d.tanggalDaftar || new Date().toISOString(),
            // Fix: Add missing tanggalMasuk required by Pendaftar type (from Santri)
            tanggalMasuk: d.tanggalDaftar || new Date().toISOString(),
            jalurPendaftaran: d.jalurPendaftaran || 'Reguler',
            lastModified: Date.now()
        } as Pendaftar));
        
        await db.pendaftar.bulkAdd(newItems as Pendaftar[]);
        onUpdateList();
        showToast(`${newItems.length} pendaftar ditambahkan.`, 'success');
    }

    const handleOpenDocument = (urlOrBase64: string) => {
        if (!urlOrBase64) return;
        
        // If it's a URL (Google Drive), open in new tab
        if (urlOrBase64.startsWith('http')) {
            window.open(urlOrBase64, '_blank');
        } else {
            // It's likely a base64 string (from local/Dropbox), render in iframe wrapper
            const win = window.open();
            if (win) {
                win.document.write('<iframe src="' + urlOrBase64 + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="space-y-3 sm:space-y-4 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Data Pendaftar Santri Baru</h2>
                            <p className="text-xs text-gray-500">Kelola seleksi, berkas, pengumuman kelulusan, dan sinkronisasi data antar-posko.</p>
                        </div>
                    </div>

                    {canWrite && (
                        <div className="w-full pt-1">
                            {/* Exactly 2 Compact Rows on Mobile (grid-cols-3), Flex Toolbar on Desktop (sm+) */}
                            <div className="grid grid-cols-3 sm:flex sm:flex-wrap sm:items-center gap-1.5 sm:gap-2 w-full">
                                {/* Row 1, Col 1: Tombol Tambah Santri - Primary Action */}
                                <button
                                    onClick={() => { setEditingPendaftar(null); setIsPendaftarModalOpen(true); }}
                                    className="bg-teal-700 hover:bg-teal-800 text-white px-2 sm:px-3.5 py-1 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs whitespace-nowrap h-8 sm:h-9 transition-colors min-w-0"
                                    title="Tambah Data Calon Santri Baru secara Manual"
                                >
                                    <i className="bi bi-person-plus-fill text-xs sm:text-sm shrink-0"></i>
                                    <span className="hidden xs:inline truncate">+ Tambah Santri</span>
                                    <span className="xs:hidden truncate">+ Santri</span>
                                </button>

                                {/* Row 1, Col 2: Tombol Google Sync & Pengaturan GAS */}
                                <div className="inline-flex rounded-xl shadow-2xs overflow-hidden h-8 sm:h-9 border border-emerald-700 min-w-0">
                                    <button 
                                        onClick={scriptUrl ? handleGoogleSync : () => setIsGasModalOpen(true)}
                                        disabled={isSyncing}
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-1.5 sm:px-3 py-1 sm:py-2 text-[11px] sm:text-xs flex-1 flex items-center justify-center gap-1 sm:gap-1.5 disabled:bg-emerald-400 font-semibold whitespace-nowrap transition-colors min-w-0"
                                        title={scriptUrl ? "Tarik data terbaru dari Google Sheet" : "Atur link Google Apps Script untuk menarik data"}
                                    >
                                        {isSyncing ? <i className="bi bi-arrow-repeat animate-spin text-xs"></i> : <i className="bi bi-file-earmark-spreadsheet-fill text-xs shrink-0"></i>}
                                        <span className="truncate">Tarik Sheet</span>
                                    </button>
                                    <button
                                        onClick={() => setIsGasModalOpen(true)}
                                        className="bg-emerald-800 hover:bg-emerald-900 text-white px-1.5 sm:px-2 py-1 sm:py-2 border-l border-emerald-600 text-xs flex items-center justify-center transition-colors shrink-0"
                                        title="Pengaturan Koneksi Google Apps Script (GAS)"
                                    >
                                        <i className="bi bi-gear-fill text-[11px]"></i>
                                    </button>
                                </div>

                                {/* Row 1, Col 3: Tombol Pengumuman Hasil Kelulusan (PDF) */}
                                <button
                                    onClick={() => setIsAnnouncementModalOpen(true)}
                                    className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 px-2 sm:px-3 py-1 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs whitespace-nowrap h-8 sm:h-9 transition-colors min-w-0"
                                    title="Ekspor dokumen surat pengumuman kelulusan resmi dalam format PDF siap cetak"
                                >
                                    <i className="bi bi-file-earmark-pdf-fill text-teal-600 text-xs sm:text-sm shrink-0"></i>
                                    <span className="hidden xs:inline truncate">Pengumuman (PDF)</span>
                                    <span className="xs:hidden truncate">Pengumuman</span>
                                </button>

                                {/* Row 2, Col 1: Tombol Impor WA */}
                                <button 
                                    onClick={() => setIsWaModalOpen(true)} 
                                    className="bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs whitespace-nowrap h-8 sm:h-9 transition-colors min-w-0"
                                    title="Impor pendaftar dari format pesan teks WhatsApp"
                                >
                                    <i className="bi bi-whatsapp text-xs shrink-0"></i>
                                    <span className="truncate">Impor WA</span>
                                </button>

                                {/* Row 2, Col 2: Tombol Internal Sync (Dropbox) */}
                                <button 
                                    onClick={handleInternalSync} 
                                    disabled={isSyncing}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2 sm:px-3 py-1 sm:py-2 rounded-xl text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs disabled:bg-slate-100 whitespace-nowrap h-8 sm:h-9 transition-colors min-w-0"
                                    title="Tarik data pendaftar dari sesama admin via Dropbox (Internal)"
                                >
                                    {isSyncing ? <i className="bi bi-arrow-repeat animate-spin text-xs"></i> : <i className="bi bi-cloud-arrow-down-fill text-slate-600 text-xs shrink-0"></i>}
                                    <span className="truncate">Sync Admin</span>
                                </button>

                                {/* Row 2, Col 3: Tombol Unduh Arsip ZIP */}
                                <button 
                                    onClick={handleDownloadArchive} 
                                    disabled={isArchiving}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 sm:px-3 py-1 sm:py-2 rounded-xl text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs disabled:opacity-50 whitespace-nowrap h-8 sm:h-9 transition-colors min-w-0"
                                    title="Unduh seluruh berkas dan dokumen upload pendaftar sebagai file ZIP"
                                >
                                    {isArchiving ? <i className="bi bi-arrow-repeat animate-spin text-xs"></i> : <i className="bi bi-file-earmark-zip-fill text-amber-600 text-xs shrink-0"></i>}
                                    <span className="truncate">Arsip ZIP</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3 lg:grid-cols-6">
                    <button
                        type="button"
                        onClick={() => setFilterStatus('')}
                        className={`text-left rounded-xl border p-2.5 sm:p-3 transition-all ${filterStatus === '' ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-200' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</div>
                        <div className="text-base sm:text-lg font-black text-slate-800">{psbStats.total}</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus(filterStatus === 'Baru' ? '' : 'Baru')}
                        className={`text-left rounded-xl border p-2.5 sm:p-3 transition-all ${filterStatus === 'Baru' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-blue-100 bg-blue-50/50 hover:bg-blue-50'}`}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Baru</div>
                        <div className="text-base sm:text-lg font-black text-blue-800">{psbStats.baru}</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus(filterStatus === 'Verifikasi Berkas' ? '' : 'Verifikasi Berkas')}
                        className={`text-left rounded-xl border p-2.5 sm:p-3 transition-all ${filterStatus === 'Verifikasi Berkas' ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-amber-100 bg-amber-50/50 hover:bg-amber-50'}`}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Verifikasi</div>
                        <div className="text-base sm:text-lg font-black text-amber-800">{psbStats.verifikasi}</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus(filterStatus === 'Ujian Masuk' ? '' : 'Ujian Masuk')}
                        className={`text-left rounded-xl border p-2.5 sm:p-3 transition-all ${filterStatus === 'Ujian Masuk' ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-purple-100 bg-purple-50/50 hover:bg-purple-50'}`}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Ujian Masuk</div>
                        <div className="text-base sm:text-lg font-black text-purple-800">{psbStats.ujian}</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus(filterStatus === 'Cadangan' ? '' : 'Cadangan')}
                        className={`text-left rounded-xl border p-2.5 sm:p-3 transition-all ${filterStatus === 'Cadangan' ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200' : 'border-yellow-100 bg-yellow-50/50 hover:bg-yellow-50'}`}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-600">Cadangan</div>
                        <div className="text-base sm:text-lg font-black text-yellow-800">{psbStats.cadangan}</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus(filterStatus === 'Diterima' ? '' : 'Diterima')}
                        className={`text-left rounded-xl border p-2.5 sm:p-3 transition-all ${filterStatus === 'Diterima' ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-green-100 bg-green-50/50 hover:bg-green-50'}`}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-green-600">Diterima</div>
                        <div className="text-base sm:text-lg font-black text-green-800">{psbStats.diterima}</div>
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-grow">
                        <i className="bi bi-search absolute left-3 top-3 text-gray-400 text-sm"></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Cari nama santri, NISN, No. Registrasi, atau No. HP..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm sm:w-44 bg-white"
                    >
                        <option value="">Semua Status</option>
                        <option value="Baru">Baru</option>
                        <option value="Verifikasi Berkas">Verifikasi Berkas</option>
                        <option value="Ujian Masuk">Ujian Masuk</option>
                        <option value="Cadangan">Cadangan</option>
                        <option value="Diterima">Diterima</option>
                        <option value="Ditolak">Ditolak</option>
                    </select>
                    <select
                        value={filterJenjang}
                        onChange={e => setFilterJenjang(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm sm:w-44 bg-white"
                    >
                        <option value="">Semua Jenjang</option>
                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                </div>

                <div className="hidden md:block overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                            <tr>
                                <th className="p-3 w-10 text-center">No</th>
                                <th className="p-3">Identitas Pendaftar</th>
                                <th className="p-3">Jenjang</th>
                                <th className="p-3">Wali & Kontak</th>
                                <th className="p-3 text-center">Seleksi & Nilai</th>
                                <th className="p-3 text-center">Dokumen</th>
                                <th className="p-3 text-center">Status Tahapan</th>
                                <th className="p-3 text-center">Aksi Alur</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredData.map((p, idx) => {
                                const customData = p.customData ? JSON.parse(p.customData) : {};
                                const files = Object.keys(customData).filter(key => {
                                    const val = customData[key];
                                    return typeof val === 'string' && (val.startsWith('data:') || val.startsWith('http'));
                                });

                                const regNumber = p.nomorRegistrasi || getPsbRegistrationNumber(p, settings.jenjang.find(j => j.id === p.jenjangId)?.nama);
                                const avgScore = calculatePsbAverageScore(p.nilaiUjian);

                                // Physical documents count
                                const berkasCount = p.berkasFisik ? [
                                    p.berkasFisik.kk,
                                    p.berkasFisik.akta,
                                    p.berkasFisik.ijazahSkl,
                                    p.berkasFisik.suratSehat,
                                    p.berkasFisik.pasFoto
                                ].filter(Boolean).length : 0;

                                return (
                                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="p-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-gray-900">{p.namaLengkap}</div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] font-mono font-semibold bg-teal-50 text-teal-700 px-1.5 py-0.2 rounded border border-teal-200">
                                                    {regNumber}
                                                </span>
                                                <span className="text-xs text-gray-400">• {new Date(p.tanggalDaftar).toLocaleDateString('id-ID')}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-medium text-gray-800">{settings.jenjang.find(j => j.id === p.jenjangId)?.nama || '-'}</span>
                                            <div className="text-[11px] text-gray-500">{p.jalurPendaftaran || 'Reguler'}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium text-gray-800">{p.namaWali || '-'}</div>
                                            {p.nomorHpWali && (
                                                <button
                                                    type="button"
                                                    onClick={() => openWhatsappChat(p.nomorHpWali, `Assalamu'alaikum Warahmatullahi Wabarakatuh, terkait pendaftaran PSB di ${settings.namaPonpes || 'Pondok Pesantren'} ananda ${p.namaLengkap}...`)}
                                                    className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium hover:underline"
                                                    title="Hubungi via WhatsApp"
                                                >
                                                    <i className="bi bi-whatsapp text-green-600"></i>
                                                    {p.nomorHpWali}
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${berkasCount >= 4 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : berkasCount > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`} title="Berkas fisik diverifikasi posko">
                                                    <i className="bi bi-folder-check"></i>
                                                    {berkasCount}/5 Berkas
                                                </span>
                                                {avgScore !== null ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200" title="Rata-rata Skor Ujian Seleksi">
                                                        <i className="bi bi-award-fill text-indigo-600"></i>
                                                        Skor: {avgScore}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 italic">Belum Ujian</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            {files.length > 0 ? (
                                                <div className="flex flex-wrap justify-center gap-1 max-w-[130px] mx-auto">
                                                    {files.map(fKey => {
                                                        const val = customData[fKey];
                                                        const isLink = val.startsWith('http');
                                                        return (
                                                            <button 
                                                                key={fKey}
                                                                onClick={() => handleOpenDocument(val)}
                                                                className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1 ${isLink ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
                                                                title={`Lihat ${fKey}`}
                                                            >
                                                                <i className={`bi ${isLink ? 'bi-link-45deg' : 'bi-file-earmark-pdf'}`}></i> 
                                                                {fKey.replace(/_/g, ' ')}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            {canWrite ? (
                                                <select
                                                    value={p.status}
                                                    onChange={e => handleQuickStatusChange(p, e.target.value as PendaftarStatus)}
                                                    className={`text-xs font-bold rounded-lg px-2.5 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${getStatusBadgeClass(p.status)}`}
                                                >
                                                    <option value="Baru">Baru</option>
                                                    <option value="Verifikasi Berkas">Verifikasi Berkas</option>
                                                    <option value="Ujian Masuk">Ujian Masuk</option>
                                                    <option value="Cadangan">Cadangan</option>
                                                    <option value="Diterima">Diterima</option>
                                                    <option value="Ditolak">Ditolak</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${getStatusBadgeClass(p.status)}`}>
                                                    {p.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Cetak Formulir Pendaftaran Lengkap */}
                                                <button
                                                    onClick={() => setPrintFormPendaftar(p)}
                                                    className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                                                    title="Cetak Lembar Formulir Pendaftaran (F-PSB)"
                                                >
                                                    <i className="bi bi-file-earmark-text text-sm"></i>
                                                </button>

                                                {/* Cetak Kartu Ujian */}
                                                <button
                                                    onClick={() => setExamCardPendaftar(p)}
                                                    className="p-1.5 text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                                                    title="Cetak Kartu Ujian & Kirim Jadwal WA"
                                                >
                                                    <i className="bi bi-card-heading text-sm"></i>
                                                </button>

                                                {/* Terima Santri & Penerbitan Tagihan */}
                                                {canWrite && p.status !== 'Diterima' && (
                                                    <button
                                                        onClick={() => handleAccept(p)}
                                                        className="p-1.5 text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Terima & Terbitkan Tagihan Daftar Ulang"
                                                    >
                                                        <i className="bi bi-check2-circle text-base"></i>
                                                    </button>
                                                )}

                                                {/* Edit Pendaftar */}
                                                {canWrite && (
                                                    <>
                                                        <button
                                                            onClick={() => { setEditingPendaftar(p); setIsPendaftarModalOpen(true); }}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit Lengkap Pendaftar"
                                                        >
                                                            <i className="bi bi-pencil-square text-sm"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(p.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Hapus Data Pendaftar"
                                                        >
                                                            <i className="bi bi-trash text-sm"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-gray-500">
                                        <i className="bi bi-inbox text-3xl text-gray-300 block mb-2"></i>
                                        Tidak ada data pendaftar yang sesuai filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-3 md:hidden">
                    {filteredData.map((p) => {
                        const customData = p.customData ? JSON.parse(p.customData) : {};
                        const files = Object.keys(customData).filter((key) => {
                            const val = customData[key];
                            return typeof val === 'string' && (val.startsWith('data:') || val.startsWith('http'));
                        });

                        const regNumber = p.nomorRegistrasi || getPsbRegistrationNumber(p, settings.jenjang.find(j => j.id === p.jenjangId)?.nama);
                        const avgScore = calculatePsbAverageScore(p.nilaiUjian);
                        const berkasCount = p.berkasFisik ? [
                            p.berkasFisik.kk,
                            p.berkasFisik.akta,
                            p.berkasFisik.ijazahSkl,
                            p.berkasFisik.suratSehat,
                            p.berkasFisik.pasFoto
                        ].filter(Boolean).length : 0;

                        return (
                            <article key={p.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h4 className="truncate text-sm font-bold text-slate-800">{p.namaLengkap}</h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] font-mono font-semibold bg-teal-50 text-teal-700 px-1.5 py-0.2 rounded border border-teal-200">
                                                {regNumber}
                                            </span>
                                            <p className="text-xs text-slate-500">{new Date(p.tanggalDaftar).toLocaleDateString('id-ID')}</p>
                                        </div>
                                    </div>
                                    {canWrite ? (
                                        <select
                                            value={p.status}
                                            onChange={e => handleQuickStatusChange(p, e.target.value as PendaftarStatus)}
                                            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${getStatusBadgeClass(p.status)}`}
                                        >
                                            <option value="Baru">Baru</option>
                                            <option value="Verifikasi Berkas">Verifikasi</option>
                                            <option value="Ujian Masuk">Ujian</option>
                                            <option value="Cadangan">Cadangan</option>
                                            <option value="Diterima">Diterima</option>
                                            <option value="Ditolak">Ditolak</option>
                                        </select>
                                    ) : (
                                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${getStatusBadgeClass(p.status)}`}>
                                            {p.status}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1 text-xs text-slate-600">
                                    <p><span className="font-semibold text-slate-700">Jenjang:</span> {settings.jenjang.find(j => j.id === p.jenjangId)?.nama || '-'} ({p.jalurPendaftaran || 'Reguler'})</p>
                                    <p><span className="font-semibold text-slate-700">Wali:</span> {p.namaWali || '-'} {p.nomorHpWali ? `(${p.nomorHpWali})` : ''}</p>
                                </div>

                                <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-1.5 items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded text-[10px] border ${berkasCount >= 4 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            Berkas: {berkasCount}/5
                                        </span>
                                        {avgScore !== null && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                                Nilai: {avgScore}
                                            </span>
                                        )}
                                    </div>
                                    {p.nomorHpWali && (
                                        <button
                                            type="button"
                                            onClick={() => openWhatsappChat(p.nomorHpWali, `Assalamu'alaikum Warahmatullahi Wabarakatuh, terkait pendaftaran PSB ananda ${p.namaLengkap}...`)}
                                            className="text-green-700 text-xs font-semibold flex items-center gap-1"
                                        >
                                            <i className="bi bi-whatsapp"></i> Chat WA
                                        </button>
                                    )}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1">
                                    {files.length > 0 ? files.map((fKey) => {
                                        const val = customData[fKey];
                                        const isLink = val.startsWith('http');
                                        return (
                                            <button
                                                key={fKey}
                                                onClick={() => handleOpenDocument(val)}
                                                className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1 ${isLink ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}
                                            >
                                                <i className={`bi ${isLink ? 'bi-link-45deg' : 'bi-file-earmark-pdf'}`}></i>
                                                {fKey.replace(/_/g, ' ')}
                                            </button>
                                        );
                                    }) : (
                                        <span className="text-[11px] text-slate-400">Tidak ada dokumen upload</span>
                                    )}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-slate-200">
                                    <button
                                        onClick={() => setPrintFormPendaftar(p)}
                                        className="h-8 sm:h-9 px-2.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                                        title="Cetak Formulir Lengkap"
                                    >
                                        <i className="bi bi-file-earmark-text"></i> Formulir
                                    </button>
                                    <button
                                        onClick={() => setExamCardPendaftar(p)}
                                        className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                                        title="Kartu Ujian"
                                    >
                                        <i className="bi bi-card-heading"></i> Kartu Ujian
                                    </button>
                                    {canWrite && p.status !== 'Diterima' && (
                                        <button
                                            onClick={() => handleAccept(p)}
                                            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                                            title="Terima Santri"
                                        >
                                            <i className="bi bi-check2-circle"></i> Terima
                                        </button>
                                    )}
                                    {canWrite && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => { setEditingPendaftar(p); setIsPendaftarModalOpen(true); }}
                                                className="h-8 sm:h-9 w-8 sm:w-9 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 flex items-center justify-center shrink-0"
                                                title="Edit Data Pendaftar"
                                            >
                                                <i className="bi bi-pencil-square text-xs"></i>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                className="h-8 sm:h-9 w-8 sm:w-9 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center justify-center shrink-0"
                                                title="Hapus Data Pendaftar"
                                            >
                                                <i className="bi bi-trash text-xs"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                    {filteredData.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                            Tidak ada data pendaftar yang sesuai filter.
                        </div>
                    )}
                </div>
            </div>

            {/* WA Import Modal */}
            {isWaModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">Impor Data dari WhatsApp</h3>
                        <p className="text-sm text-gray-600 mb-2">Tempelkan seluruh pesan pendaftaran (termasuk kode <code>PSB_BACKUP_START</code> atau <code>PSB_START</code>) di bawah ini:</p>
                        <textarea 
                            className="w-full border rounded-lg p-3 text-sm h-40 font-mono"
                            value={waInput}
                            onChange={e => setWaInput(e.target.value)}
                            placeholder="Paste pesan di sini..."
                        ></textarea>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsWaModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                            <button onClick={handleProcessWA} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Proses</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {examCardPendaftar && (
                <PsbExamCardModal
                    isOpen={!!examCardPendaftar}
                    onClose={() => setExamCardPendaftar(null)}
                    pendaftar={examCardPendaftar}
                    settings={settings}
                />
            )}

            {acceptancePendaftar && (
                <PsbAcceptanceModal
                    isOpen={!!acceptancePendaftar}
                    onClose={() => setAcceptancePendaftar(null)}
                    pendaftar={acceptancePendaftar}
                    settings={settings}
                    onConfirmed={handleAcceptConfirmed}
                />
            )}

            {printFormPendaftar && (
                <PsbPrintFormModal
                    isOpen={!!printFormPendaftar}
                    onClose={() => setPrintFormPendaftar(null)}
                    pendaftar={printFormPendaftar}
                    settings={settings}
                />
            )}

            {isGasModalOpen && (
                <PsbGasConfigModal
                    isOpen={isGasModalOpen}
                    onClose={() => setIsGasModalOpen(false)}
                    settings={settings}
                    onSyncNow={handleGoogleSync}
                />
            )}

            <Suspense fallback={<LoadingFallback />}>
                {isPendaftarModalOpen && (
                    <PendaftarModal 
                        isOpen={isPendaftarModalOpen}
                        onClose={() => setIsPendaftarModalOpen(false)}
                        onSave={handleSavePendaftar}
                        onUpdate={handleUpdatePendaftar}
                        pendaftarData={editingPendaftar}
                        settings={settings}
                    />
                )}

                {isBulkEditorOpen && (
                    <BulkPendaftarEditor
                        isOpen={isBulkEditorOpen}
                        onClose={() => setIsBulkEditorOpen(false)}
                        onSave={handleBulkSave}
                    />
                )}
            </Suspense>

            {/* Modal Pengumuman Hasil Seleksi PSB (PDF) */}
            {isAnnouncementModalOpen && (
                <PsbAnnouncementModal
                    isOpen={isAnnouncementModalOpen}
                    onClose={() => setIsAnnouncementModalOpen(false)}
                    pendaftarList={pendaftarList}
                    settings={settings}
                    config={settings.psbConfig}
                />
            )}
        </div>
    );
};
