import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { PondokSettings, TenagaPengajar, RiwayatJabatan } from '../../types';
import { useAppContext } from '../../AppContext';
import { TeacherModal, TeacherTtdPayload } from '../settings/modals/TeacherModal';
import { BulkMasterEditor } from './modals/BulkMasterEditor';
import { SignatureDropzone } from '../common/SignatureDropzone';
import { loadXLSX } from '../../utils/lazyClientLibs';
import { optimizeSignatureImage } from '../../utils/imageOptimizer';
import {
    findStrictTeacherTtdAsset,
    upsertTeacherTtdAsset,
    removeTeacherTtdAsset,
    syncTeacherMetadataToDigitalAsset,
    reconcileDigitalAssetsWithSettings,
    getTeacherPrimaryRoleLabel,
} from '../../utils/digitalAssetUtils';

interface TabTenagaPendidikProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
    canWrite: boolean;
}

export const TabTenagaPendidik: React.FC<TabTenagaPendidikProps> = ({ localSettings, handleInputChange, canWrite }) => {
    const { showAlert, showConfirmation, showToast } = useAppContext();
    const [teacherModalData, setTeacherModalData] = useState<{
        mode: 'add' | 'edit';
        item?: TenagaPengajar;
    } | null>(null);
    const [quickTtdTeacher, setQuickTtdTeacher] = useState<TenagaPengajar | null>(null);
    const [quickTtdValue, setQuickTtdValue] = useState<string | null>(null);
    const [dragOverTeacherId, setDragOverTeacherId] = useState<number | null>(null);

    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkInitialData, setBulkInitialData] = useState<any[] | undefined>(undefined);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filterCategory, setFilterCategory] = useState<
        'all' | 'pendidik' | 'kependidikan' | 'wali_kelas' | 'belum_ttd' | 'tanpa_kontak'
    >('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isActionOpen, setIsActionOpen] = useState(false);
    const actionRef = useRef<HTMLDivElement>(null);

    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];

    useEffect(() => {
        reconcileDigitalAssetsWithSettings(localSettings).catch(() => {});
    }, [localSettings]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
                setIsActionOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTeacherStatus = (teacher: TenagaPengajar) => {
        if (!teacher.riwayatJabatan || teacher.riwayatJabatan.length === 0) {
            const structuralRole = getTeacherPrimaryRoleLabel(teacher, localSettings);
            return { isActive: true, jabatan: structuralRole, text: 'Aktif', color: 'teal' };
        }

        const latestRiwayat = [...teacher.riwayatJabatan].sort(
            (a, b) => new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime()
        )[0];
        const formatDate = (dateString: string) =>
            new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        if (latestRiwayat.tanggalSelesai) {
            return {
                isActive: false,
                jabatan: latestRiwayat.jabatan,
                text: `Berakhir pada ${formatDate(latestRiwayat.tanggalSelesai)}`,
                color: 'red',
            };
        }
        return {
            isActive: true,
            jabatan: latestRiwayat.jabatan,
            text: `Aktif sejak ${formatDate(latestRiwayat.tanggalMulai)}`,
            color: 'teal',
        };
    };

    const handleSaveTeacher = async (teacher: TenagaPengajar, ttdPayload?: TeacherTtdPayload) => {
        if (!teacherModalData) return;
        const { mode, item: previousItem } = teacherModalData;

        const teacherList = localSettings.tenagaPengajar;
        const rombelList = [...localSettings.rombel];
        let savedTeacher: TenagaPengajar;
        let updatedTeachers: TenagaPengajar[];

        if (mode === 'add') {
            const finalId = teacherList.length > 0 ? Math.max(...teacherList.map((t) => t.id)) + 1 : 1;
            savedTeacher = { ...teacher, id: finalId };
            updatedTeachers = [...teacherList, savedTeacher];
        } else {
            savedTeacher = teacher;
            updatedTeachers = teacherList.map((t) => (t.id === teacher.id ? teacher : t));
        }

        const activeWaliRombelIds = savedTeacher.riwayatJabatan
            .filter((r) => r.jabatan === 'Wali Kelas' && r.rombelId && !r.tanggalSelesai)
            .map((r) => r.rombelId as number);

        const finalRombels = rombelList.map((r) => {
            if (activeWaliRombelIds.includes(r.id)) {
                return { ...r, waliKelasId: savedTeacher.id };
            } else if (r.waliKelasId === savedTeacher.id) {
                return { ...r, waliKelasId: undefined };
            }
            return r;
        });

        const nextSettingsSnapshot: PondokSettings = {
            ...localSettings,
            tenagaPengajar: updatedTeachers,
            rombel: finalRombels,
        };

        handleInputChange('tenagaPengajar', updatedTeachers);
        handleInputChange('rombel', finalRombels);

        // Sinkronisasi langsung TTD ke db.digitalAssets (otomatis terdaftar di Daftar Aset Digital)
        try {
            if (ttdPayload?.action === 'upsert' && ttdPayload.base64Image) {
                await upsertTeacherTtdAsset(savedTeacher, ttdPayload.base64Image, nextSettingsSnapshot);
            } else if (ttdPayload?.action === 'remove') {
                await removeTeacherTtdAsset(savedTeacher);
            } else {
                await syncTeacherMetadataToDigitalAsset(savedTeacher, nextSettingsSnapshot, previousItem?.nama);
            }
        } catch (err) {
            console.error('Gagal sinkronisasi TTD ke Aset Digital:', err);
        }

        setTeacherModalData(null);
        showToast(
            `Data ${savedTeacher.nama} berhasil diperbarui${ttdPayload?.action === 'upsert' ? ' beserta TTD di Aset Digital' : ''}. Jangan lupa klik Simpan Pengaturan jika mengubah biodata.`,
            'success'
        );
    };

    const openQuickTtdModal = (teacher: TenagaPengajar) => {
        const existing = findStrictTeacherTtdAsset(digitalAssets, teacher);
        setQuickTtdTeacher(teacher);
        setQuickTtdValue(existing?.base64Image || null);
    };

    const handleSaveQuickTtd = async () => {
        if (!quickTtdTeacher) return;
        try {
            if (quickTtdValue) {
                await upsertTeacherTtdAsset(quickTtdTeacher, quickTtdValue, localSettings);
                showToast(`TTD ${quickTtdTeacher.nama} langsung tersimpan dan terdaftar di Aset Digital!`, 'success');
            } else {
                await removeTeacherTtdAsset(quickTtdTeacher);
                showToast(`TTD ${quickTtdTeacher.nama} telah dihapus dari Aset Digital.`, 'info');
            }
            setQuickTtdTeacher(null);
            setQuickTtdValue(null);
        } catch (err) {
            console.error(err);
            showToast('Gagal menyimpan TTD ke Aset Digital.', 'error');
        }
    };

    const handleRowDropFile = async (e: React.DragEvent<HTMLLIElement>, teacher: TenagaPengajar) => {
        if (!canWrite) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOverTeacherId(null);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Berkas yang diseret harus berupa gambar (PNG/JPG/WEBP/SVG).', 'error');
            return;
        }

        try {
            const optimized = await optimizeSignatureImage(file, {
                maxWidth: 650,
                maxHeight: 360,
                removeWhiteBg: false,
                autoTrim: true,
            });
            await upsertTeacherTtdAsset(teacher, optimized, localSettings);
            showToast(`TTD ${teacher.nama} berhasil diunggah & otomatis terdaftar di Aset Digital!`, 'success');
        } catch (err: any) {
            showToast(err?.message || 'Gagal memproses gambar TTD.', 'error');
        }
    };

    const handleBulkSave = async (data: any[]) => {
        const teacherList = [...localSettings.tenagaPengajar];
        const rombelList = [...localSettings.rombel];
        let nextId = teacherList.length > 0 ? Math.max(...teacherList.map((t) => t.id)) + 1 : 1;

        let rombelsChanged = false;
        const editedPairs: Array<{ saved: TenagaPengajar; prevName?: string }> = [];

        data.forEach((item) => {
            const isEdit = !!item.id;
            const riwayat: RiwayatJabatan[] = [];

            const teacherId = isEdit ? item.id : nextId++;
            const isKependidikan = item.jenisPegawai === 'Kependidikan (Staf)' || item.jenisPegawai === 'kependidikan';
            const jenisPegawaiVal = isKependidikan ? 'kependidikan' : 'pendidik';

            if (item.jabatan) {
                riwayat.push({
                    id: Date.now() + Math.random(),
                    jabatan: item.jabatan,
                    rombelId: item.rombelId,
                    tanggalMulai: item.tanggalMulai || new Date().toISOString().split('T')[0],
                });
            }

            if (item.jabatan === 'Wali Kelas' && item.rombelId) {
                const rombelIdx = rombelList.findIndex((r) => r.id === item.rombelId);
                if (rombelIdx !== -1) {
                    rombelsChanged = true;
                    rombelList[rombelIdx] = { ...rombelList[rombelIdx], waliKelasId: teacherId };
                }
            }

            const teacherData: TenagaPengajar = {
                id: teacherId,
                nama: item.nama,
                nip: item.nip?.trim() || undefined,
                telepon: item.telepon,
                email: item.email,
                status: 'Aktif',
                jenisPegawai: jenisPegawaiVal,
                kategoriStaf: isKependidikan ? item.jabatan || 'Tata Usaha (TU)' : undefined,
                riwayatJabatan: riwayat,
            };

            if (isEdit) {
                const idx = teacherList.findIndex((t) => t.id === item.id);
                if (idx !== -1) {
                    const prevName = teacherList[idx].nama;
                    const merged: TenagaPengajar = {
                        ...teacherList[idx],
                        nama: item.nama,
                        nip: item.nip !== undefined ? String(item.nip).trim() || undefined : teacherList[idx].nip,
                        telepon: item.telepon,
                        email: item.email,
                        jenisPegawai: jenisPegawaiVal,
                        kategoriStaf: isKependidikan
                            ? item.jabatan || teacherList[idx].kategoriStaf || 'Tata Usaha (TU)'
                            : undefined,
                        riwayatJabatan: riwayat.length > 0 ? riwayat : teacherList[idx].riwayatJabatan,
                    };
                    teacherList[idx] = merged;
                    editedPairs.push({ saved: merged, prevName });
                }
            } else {
                teacherList.push(teacherData);
            }
        });

        const nextSnapshot: PondokSettings = {
            ...localSettings,
            tenagaPengajar: teacherList,
            rombel: rombelsChanged ? rombelList : localSettings.rombel,
        };

        handleInputChange('tenagaPengajar', teacherList);
        if (rombelsChanged) {
            handleInputChange('rombel', rombelList);
        }

        for (const pair of editedPairs) {
            await syncTeacherMetadataToDigitalAsset(pair.saved, nextSnapshot, pair.prevName).catch(() => {});
        }

        setIsBulkOpen(false);
        setBulkInitialData(undefined);
        setSelectedIds([]);
        showToast('Operasi massal berhasil diterapkan.', 'success');
    };

    const handleRemoveTeacher = (id: number) => {
        const target = localSettings.tenagaPengajar.find((t) => t.id === id);
        if (!target) return;

        if (target.id === localSettings.mudirAamId) {
            showAlert('Penghapusan Dicegah', `${target.nama} masih ditetapkan sebagai Mudir Aam di Pengaturan Umum.`);
            return;
        }
        if (localSettings.jenjang.some((j) => j.mudirId === target.id)) {
            showAlert('Penghapusan Dicegah', `${target.nama} masih bertugas sebagai Mudir Marhalah.`);
            return;
        }
        if (localSettings.rombel.some((r) => r.waliKelasId === target.id)) {
            showAlert('Penghapusan Dicegah', `${target.nama} masih bertugas sebagai Wali Kelas.`);
            return;
        }

        showConfirmation(
            'Hapus Pegawai / Pengajar',
            `Apakah Anda yakin ingin menghapus "${target.nama}" beserta tautan tanda tangan digitalnya?`,
            async () => {
                const updated = localSettings.tenagaPengajar.filter((t) => t.id !== id);
                handleInputChange('tenagaPengajar', updated);
                await removeTeacherTtdAsset(target).catch(() => {});
                setSelectedIds((prev) => prev.filter((item) => item !== id));
                showToast(`Data ${target.nama} berhasil dihapus.`, 'success');
            },
            { confirmText: 'Ya, Hapus', confirmColor: 'red' }
        );
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        const selectedTeachers = localSettings.tenagaPengajar.filter((t) => selectedIds.includes(t.id));
        const mudirAam = selectedTeachers.find((t) => t.id === localSettings.mudirAamId);
        const mudirMarhalah = selectedTeachers.find((t) => localSettings.jenjang.some((j) => j.mudirId === t.id));
        const waliKelas = selectedTeachers.find((t) => localSettings.rombel.some((r) => r.waliKelasId === t.id));

        if (mudirAam) {
            showAlert('Penghapusan Gagal', `Gagal menghapus secara massal. ${mudirAam.nama} masih bertugas sebagai Mudir Aam.`);
            return;
        }
        if (mudirMarhalah) {
            showAlert('Penghapusan Gagal', `Gagal menghapus secara massal. ${mudirMarhalah.nama} masih bertugas sebagai Mudir Marhalah.`);
            return;
        }
        if (waliKelas) {
            showAlert('Penghapusan Gagal', `Gagal menghapus secara massal. ${waliKelas.nama} masih bertugas sebagai Wali Kelas.`);
            return;
        }

        showConfirmation(
            `Hapus ${selectedIds.length} Pegawai`,
            `Apakah Anda yakin ingin menghapus ${selectedIds.length} data yang terpilih secara massal?`,
            async () => {
                const updatedTeachers = localSettings.tenagaPengajar.filter((t) => !selectedIds.includes(t.id));
                handleInputChange('tenagaPengajar', updatedTeachers);
                for (const t of selectedTeachers) {
                    await removeTeacherTtdAsset(t).catch(() => {});
                }
                setSelectedIds([]);
                showToast(`${selectedIds.length} pegawai berhasil dihapus.`, 'success');
            },
            { confirmText: 'Ya, Hapus Semua', confirmColor: 'red' }
        );
    };

    const handleBulkEdit = () => {
        const selectedTeachers = localSettings.tenagaPengajar.filter((t) => selectedIds.includes(t.id));
        const preparedData = selectedTeachers.map((t) => {
            const latestRiwayat = [...t.riwayatJabatan].sort(
                (a, b) => new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime()
            )[0];
            return {
                id: t.id,
                nama: t.nama,
                nip: t.nip || '',
                jenisPegawai: t.jenisPegawai === 'kependidikan' ? 'Kependidikan (Staf)' : 'Pendidik (Guru)',
                telepon: t.telepon || '',
                email: t.email || '',
                jabatan: latestRiwayat?.jabatan || t.kategoriStaf || '',
                rombelId: latestRiwayat?.rombelId || '',
                tanggalMulai: latestRiwayat?.tanggalMulai || '',
            };
        });
        setBulkInitialData(preparedData);
        setIsBulkOpen(true);
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const exportData = localSettings.tenagaPengajar.map((t, idx) => {
                const status = getTeacherStatus(t);
                const isKependidikan = t.jenisPegawai === 'kependidikan';
                const waliRombel = localSettings.rombel
                    .filter((r) => r.waliKelasId === t.id)
                    .map((r) => r.nama)
                    .join(', ');
                const mapelList = (t.kompetensiMapelIds || [])
                    .map((mId) => localSettings.mataPelajaran.find((m) => m.id === mId)?.nama)
                    .filter(Boolean)
                    .join(', ');
                const hasTtd = Boolean(findStrictTeacherTtdAsset(digitalAssets, t));

                return {
                    No: idx + 1,
                    'Nama Lengkap': t.nama,
                    'NIP / NIY': t.nip || '-',
                    'Kode Guru': t.kodeGuru || '-',
                    Kategori: isKependidikan ? 'Tenaga Kependidikan' : 'Tenaga Pendidik',
                    'Jabatan / Tugas': status.jabatan || t.kategoriStaf || '-',
                    'Status Keaktifan': status.text || '-',
                    'Wali Kelas': waliRombel || '-',
                    'Status TTD Digital': hasTtd ? 'Tersedia' : 'Belum Ada',
                    'Mapel Diampu': mapelList || '-',
                    'No. Telepon / WA': t.telepon || '-',
                    Email: t.email || '-',
                };
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Tenaga Pendidik & Staf');
            XLSX.writeFile(wb, `Data_Pendidik_Staf_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast('Data tenaga pendidik berhasil diekspor ke Excel!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Gagal mengekspor data tenaga pendidik.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const totalPendidik = localSettings.tenagaPengajar.filter((t) => t.jenisPegawai !== 'kependidikan').length;
    const totalKependidikan = localSettings.tenagaPengajar.filter((t) => t.jenisPegawai === 'kependidikan').length;
    const totalWaliKelas = localSettings.tenagaPengajar.filter((t) =>
        localSettings.rombel.some((r) => r.waliKelasId === t.id)
    ).length;
    const totalSudahTtd = localSettings.tenagaPengajar.filter((t) =>
        Boolean(findStrictTeacherTtdAsset(digitalAssets, t))
    ).length;
    const totalBelumTtd = Math.max(0, localSettings.tenagaPengajar.length - totalSudahTtd);
    const totalTanpaKontak = localSettings.tenagaPengajar.filter((t) => !t.telepon || !t.telepon.trim()).length;

    const filteredTeachers = localSettings.tenagaPengajar.filter((t) => {
        const isKependidikan =
            t.jenisPegawai === 'kependidikan' ||
            (!t.jenisPegawai &&
                t.riwayatJabatan?.some((r) => {
                    const j = (r.jabatan || '').toLowerCase();
                    return (
                        j.includes('satpam') ||
                        j.includes('security') ||
                        j.includes('kasir') ||
                        j.includes('keuangan') ||
                        j.includes('tu') ||
                        j.includes('tata usaha') ||
                        j.includes('bk') ||
                        j.includes('konseling') ||
                        j.includes('kebersihan') ||
                        j.includes('dapur')
                    );
                }));

        const isWali = localSettings.rombel.some((r) => r.waliKelasId === t.id);
        const isTanpaKontak = !t.telepon || !t.telepon.trim();
        const hasTtd = Boolean(findStrictTeacherTtdAsset(digitalAssets, t));

        if (filterCategory === 'pendidik' && isKependidikan) return false;
        if (filterCategory === 'kependidikan' && !isKependidikan) return false;
        if (filterCategory === 'wali_kelas' && !isWali) return false;
        if (filterCategory === 'belum_ttd' && hasTtd) return false;
        if (filterCategory === 'tanpa_kontak' && !isTanpaKontak) return false;

        if (searchKeyword.trim()) {
            const kw = searchKeyword.toLowerCase();
            const matchName = t.nama.toLowerCase().includes(kw);
            const matchJabatan = t.riwayatJabatan?.some((r) => r.jabatan.toLowerCase().includes(kw));
            const matchStaf = t.kategoriStaf?.toLowerCase().includes(kw);
            const matchPhone = t.telepon?.includes(kw);
            const matchKode = t.kodeGuru?.toLowerCase().includes(kw);
            return matchName || matchJabatan || matchStaf || matchPhone || matchKode;
        }

        return true;
    });

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredTeachers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredTeachers.map((t) => t.id));
        }
    };

    const toggleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((i) => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-xs mb-6 space-y-4">
            {/* Header & Actions */}
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center border-b pb-4">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-person-badge-fill text-teal-600"></i>
                        Tenaga Pendidik & Kependidikan (Pengurus)
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Kelola data ustadz, wali kelas, dan pengurus beserta <strong>Tanda Tangan Digital (TTD)</strong> yang otomatis terdaftar ke Aset Digital. Tip: Anda bisa langsung menyeret berkas TTD ke baris nama pengurus.
                    </p>
                </div>

                <div className="relative" ref={actionRef}>
                    <button
                        type="button"
                        onClick={() => setIsActionOpen(!isActionOpen)}
                        className="text-xs bg-teal-700 hover:bg-teal-800 text-white font-semibold px-3.5 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
                    >
                        <i className="bi bi-grid-fill"></i>
                        <span>Menu Aksi</span>
                        <i className={`bi bi-chevron-${isActionOpen ? 'up' : 'down'} text-[10px]`}></i>
                    </button>

                    {isActionOpen && (
                        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 animate-fade-in text-xs divide-y divide-gray-100">
                            {canWrite && (
                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsActionOpen(false);
                                            setTeacherModalData({ mode: 'add' });
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-teal-50 flex items-center gap-2.5 text-gray-700 transition"
                                    >
                                        <i className="bi bi-plus-circle-fill text-teal-600 text-sm"></i>
                                        <div>
                                            <span className="font-semibold block text-gray-800">Tambah Manual</span>
                                            <span className="text-[10px] text-gray-400">Input formulir & TTD baru</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsActionOpen(false);
                                            setBulkInitialData(undefined);
                                            setIsBulkOpen(true);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-teal-50 flex items-center gap-2.5 text-gray-700 transition"
                                    >
                                        <i className="bi bi-table text-indigo-600 text-sm"></i>
                                        <div>
                                            <span className="font-semibold block text-gray-800">Tambah Massal</span>
                                            <span className="text-[10px] text-gray-400">Editor spreadsheet cepat</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                            <div className="py-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsActionOpen(false);
                                        handleExportExcel();
                                    }}
                                    disabled={isExporting || localSettings.tenagaPengajar.length === 0}
                                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-center gap-2.5 text-gray-700 transition disabled:opacity-50"
                                >
                                    <i className="bi bi-file-earmark-excel-fill text-emerald-600 text-sm"></i>
                                    <div>
                                        <span className="font-semibold block text-emerald-800">Ekspor Excel</span>
                                        <span className="text-[10px] text-gray-400">Unduh data (.xlsx)</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-[11px] font-semibold text-gray-500 block uppercase">Total Pegawai</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-bold text-gray-800">{localSettings.tenagaPengajar.length}</span>
                        <span className="text-[10px] text-gray-400">Orang</span>
                    </div>
                </div>
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg">
                    <span className="text-[11px] font-semibold text-teal-800 block uppercase">Pendidik (Guru)</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-bold text-teal-900">{totalPendidik}</span>
                        <span className="text-[10px] text-teal-700">Asatidz</span>
                    </div>
                </div>
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg">
                    <span className="text-[11px] font-semibold text-indigo-800 block uppercase">Pengurus / Staf</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-bold text-indigo-900">{totalKependidikan}</span>
                        <span className="text-[10px] text-indigo-700">Staf</span>
                    </div>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                    <span className="text-[11px] font-semibold text-blue-800 block uppercase">Wali Kelas</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-bold text-blue-900">{totalWaliKelas}</span>
                        <span className="text-[10px] text-blue-700">Terplot</span>
                    </div>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-semibold text-emerald-800 block uppercase">TTD Digital</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-bold text-emerald-900">{totalSudahTtd}</span>
                        <span className="text-[10px] text-emerald-700">/ {localSettings.tenagaPengajar.length} siap</span>
                    </div>
                </div>
            </div>

            {/* Bulk Selection Actions */}
            {selectedIds.length > 0 && (
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between gap-3 animate-fade-in text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                            {selectedIds.length} data terpilih
                        </span>
                        <button onClick={() => setSelectedIds([])} className="text-gray-500 hover:text-gray-700 underline">
                            Batal
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBulkEdit}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md font-bold flex items-center gap-1 shadow-xs"
                        >
                            <i className="bi bi-pencil-square"></i> Edit Massal
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md font-bold flex items-center gap-1 shadow-xs"
                        >
                            <i className="bi bi-trash"></i> Hapus Massal
                        </button>
                    </div>
                </div>
            )}

            {/* Filter Category & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs overflow-x-auto scrollbar-thin">
                    <button
                        type="button"
                        onClick={() => setFilterCategory('all')}
                        className={`px-3 py-1.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                            filterCategory === 'all' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Semua ({localSettings.tenagaPengajar.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterCategory('pendidik')}
                        className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            filterCategory === 'pendidik' ? 'bg-white text-teal-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <i className="bi bi-mortarboard-fill text-teal-600"></i>
                        Guru ({totalPendidik})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterCategory('kependidikan')}
                        className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            filterCategory === 'kependidikan'
                                ? 'bg-white text-indigo-800 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <i className="bi bi-person-gear text-indigo-600"></i>
                        Staf ({totalKependidikan})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterCategory('wali_kelas')}
                        className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                            filterCategory === 'wali_kelas' ? 'bg-white text-blue-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <i className="bi bi-person-check-fill text-blue-600"></i>
                        Wali Kelas ({totalWaliKelas})
                    </button>
                    {totalBelumTtd > 0 && (
                        <button
                            type="button"
                            onClick={() => setFilterCategory('belum_ttd')}
                            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                filterCategory === 'belum_ttd'
                                    ? 'bg-white text-purple-800 shadow-xs'
                                    : 'text-purple-700 hover:text-purple-900'
                            }`}
                        >
                            <i className="bi bi-pen text-purple-600"></i>
                            Belum Ada TTD ({totalBelumTtd})
                        </button>
                    )}
                    {totalTanpaKontak > 0 && (
                        <button
                            type="button"
                            onClick={() => setFilterCategory('tanpa_kontak')}
                            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                filterCategory === 'tanpa_kontak'
                                    ? 'bg-amber-100 text-amber-900 shadow-xs'
                                    : 'text-amber-700 hover:text-amber-900'
                            }`}
                        >
                            <i className="bi bi-exclamation-triangle-fill text-amber-500"></i>
                            Tanpa No. HP ({totalTanpaKontak})
                        </button>
                    )}
                </div>

                <div className="relative">
                    <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                    <input
                        type="text"
                        placeholder="Cari nama, kode guru, tugas, no telp..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="w-full sm:w-64 pl-8 pr-7 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                    {searchKeyword && (
                        <button
                            onClick={() => setSearchKeyword('')}
                            className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                        >
                            <i className="bi bi-x-circle-fill"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {filteredTeachers.length > 0 ? (
                    <ul className="divide-y divide-gray-100 text-sm">
                        <li className="bg-gray-50 p-2.5 flex items-center justify-between border-b sticky top-0 z-10">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length > 0 && selectedIds.length === filteredTeachers.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 text-teal-600 rounded mr-3 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-gray-500 uppercase">
                                    Pilih Semua ({filteredTeachers.length})
                                </span>
                            </div>
                            <span className="text-[11px] text-gray-400 hidden sm:inline">
                                Klik tombol TTD atau seret berkas tanda tangan langsung ke baris nama
                            </span>
                        </li>
                        {filteredTeachers.map((t) => {
                            const status = getTeacherStatus(t);
                            const isSelected = selectedIds.includes(t.id);
                            const isKependidikan = t.jenisPegawai === 'kependidikan';
                            const waliRombel = localSettings.rombel.find((r) => r.waliKelasId === t.id);
                            const mudirJenjang = localSettings.jenjang.find((j) => j.mudirId === t.id);
                            const isMudirAam = localSettings.mudirAamId === t.id;
                            const cleanPhone = t.telepon ? t.telepon.replace(/\D/g, '').replace(/^0/, '62') : '';
                            const ttdAsset = findStrictTeacherTtdAsset(digitalAssets, t);
                            const isRowDragOver = dragOverTeacherId === t.id;

                            return (
                                <li
                                    key={t.id}
                                    onDragOver={(e) => {
                                        if (!canWrite) return;
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'copy';
                                        if (dragOverTeacherId !== t.id) setDragOverTeacherId(t.id);
                                    }}
                                    onDragLeave={(e) => {
                                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                            setDragOverTeacherId(null);
                                        }
                                    }}
                                    onDrop={(e) => handleRowDropFile(e, t)}
                                    className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 p-3 group transition-all ${
                                        isRowDragOver
                                            ? 'bg-teal-50 ring-2 ring-inset ring-teal-500'
                                            : isSelected
                                            ? 'bg-teal-50/70'
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectOne(t.id)}
                                            className="w-4 h-4 text-teal-600 rounded cursor-pointer shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-gray-900 truncate">{t.nama}</p>
                                                <span className="text-xs text-gray-500">
                                                    • {isKependidikan ? t.kategoriStaf || 'Pengurus / Staf' : 'Guru'}
                                                </span>
                                                {t.kodeGuru && (
                                                    <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                                        {t.kodeGuru}
                                                    </span>
                                                )}
                                                {isMudirAam && (
                                                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                                        Mudir Aam
                                                    </span>
                                                )}
                                                {mudirJenjang && (
                                                    <span className="text-[11px] font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                                                        Mudir {mudirJenjang.kode || mudirJenjang.nama}
                                                    </span>
                                                )}
                                                {waliRombel && (
                                                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                                        Wali {waliRombel.nama}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                                <span>{status.jabatan}</span>
                                                <span className={`font-medium ${status.color === 'red' ? 'text-red-600' : 'text-teal-600'}`}>
                                                    ({status.text})
                                                </span>
                                                {t.kompetensiMapelIds && t.kompetensiMapelIds.length > 0 && (
                                                    <span className="text-gray-600 font-medium">
                                                        • {t.kompetensiMapelIds.length} Mapel
                                                    </span>
                                                )}
                                                {t.telepon ? (
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <i className="bi bi-telephone text-gray-400"></i>
                                                        <span>{t.telepon}</span>
                                                        {cleanPhone && (
                                                            <a
                                                                href={`https://wa.me/${cleanPhone}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-emerald-600 hover:text-emerald-700 font-bold ml-1 text-[11px] flex items-center gap-0.5"
                                                                title="Kirim pesan WhatsApp"
                                                            >
                                                                <i className="bi bi-whatsapp"></i>
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-amber-600 text-[11px] italic">Belum ada telepon</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Signature Integration + Row Actions */}
                                    <div className="flex items-center justify-end gap-2 shrink-0 pl-7 sm:pl-2">
                                        {ttdAsset ? (
                                            <button
                                                type="button"
                                                disabled={!canWrite}
                                                onClick={() => openQuickTtdModal(t)}
                                                title="Klik untuk melihat, merapikan background, atau mengganti TTD"
                                                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-teal-200 bg-white hover:border-teal-400 hover:bg-teal-50/40 transition-colors"
                                            >
                                                <img
                                                    src={ttdAsset.base64Image}
                                                    alt={`TTD ${t.nama}`}
                                                    className="h-6 w-12 object-contain"
                                                />
                                                <span className="text-[11px] font-semibold text-teal-700">TTD Siap</span>
                                            </button>
                                        ) : canWrite ? (
                                            <button
                                                type="button"
                                                onClick={() => openQuickTtdModal(t)}
                                                title="Unggah atau seret gambar tanda tangan pengurus/ustadz ini"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-600 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/40 text-xs font-medium transition-colors"
                                            >
                                                <i className="bi bi-pen"></i>
                                                <span>Upload TTD</span>
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-gray-400 italic">Tanpa TTD</span>
                                        )}

                                        {canWrite && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setTeacherModalData({ mode: 'edit', item: t })}
                                                    className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 text-xs"
                                                    aria-label={`Edit data ${t.nama}`}
                                                    title="Edit Biodata & Jabatan"
                                                >
                                                    <i className="bi bi-pencil-square"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveTeacher(t.id)}
                                                    className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 text-xs"
                                                    aria-label={`Hapus data ${t.nama}`}
                                                    title="Hapus"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="py-8 text-center text-gray-400 text-xs">
                        <i className="bi bi-people text-2xl mb-1 block"></i>
                        {searchKeyword
                            ? 'Tidak ada tenaga pendidik/kependidikan yang cocok dengan kata kunci.'
                            : 'Belum ada data tenaga pendidik / kependidikan.'}
                    </div>
                )}
            </div>

            {teacherModalData && (
                <TeacherModal
                    isOpen={!!teacherModalData}
                    onClose={() => setTeacherModalData(null)}
                    onSave={handleSaveTeacher}
                    modalData={teacherModalData}
                />
            )}

            {/* Quick TTD Upload & Cleanup Modal (Langsung Tersimpan ke Daftar Aset Digital) */}
            {quickTtdTeacher && (
                <div
                    className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setQuickTtdTeacher(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/70">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                    <i className="bi bi-pen-fill text-teal-600"></i>
                                    Tanda Tangan Digital: {quickTtdTeacher.nama}
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {getTeacherPrimaryRoleLabel(quickTtdTeacher, localSettings)} • Otomatis terdaftar di Daftar Aset Digital
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQuickTtdTeacher(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-5 space-y-3">
                            <SignatureDropzone
                                value={quickTtdValue}
                                onChange={(next) => setQuickTtdValue(next)}
                                label="Unggah / Seret Gambar TTD"
                                helperText="Seret & lepas (drag & drop) gambar TTD ke sini, pilih berkas, atau tempel (Ctrl+V). Klik 'Hapus Background Putih' jika difoto di atas kertas."
                                onError={(msg) => showToast(msg, 'error')}
                            />
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setQuickTtdTeacher(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 bg-white"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveQuickTtd}
                                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
                            >
                                <i className="bi bi-check-lg"></i>
                                <span>Simpan TTD Sekarang</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BulkMasterEditor
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                mode="pendidik"
                settings={localSettings}
                onSave={handleBulkSave}
                initialData={bulkInitialData}
            />
        </div>
    );
};
