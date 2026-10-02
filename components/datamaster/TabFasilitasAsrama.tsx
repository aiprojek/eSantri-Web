import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PondokSettings, GedungAsrama, Kamar } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { loadXLSX } from '../../utils/lazyClientLibs';

interface TabFasilitasAsramaProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
    canWrite: boolean;
}

export const TabFasilitasAsrama: React.FC<TabFasilitasAsramaProps> = ({
    localSettings,
    handleInputChange,
    canWrite
}) => {
    const { showAlert, showConfirmation, showToast } = useAppContext();
    const { santriList } = useSantriContext();

    const gedungList = localSettings.gedungAsrama || [];
    const kamarList = localSettings.kamar || [];
    const teachersList = localSettings.tenagaPengajar || [];

    const [selectedGedungId, setSelectedGedungId] = useState<number | 'ALL'>('ALL');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isActionOpen, setIsActionOpen] = useState(false);
    const actionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
                setIsActionOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Modal state for Gedung
    const [gedungModal, setGedungModal] = useState<{
        mode: 'add' | 'edit';
        item?: GedungAsrama;
    } | null>(null);

    // Modal state for Kamar
    const [kamarModal, setKamarModal] = useState<{
        mode: 'add' | 'edit';
        item?: Kamar;
    } | null>(null);

    // Form inputs for Gedung Modal
    const [gedungForm, setGedungForm] = useState<{ nama: string; jenis: 'Putra' | 'Putri' }>({
        nama: '',
        jenis: 'Putra'
    });

    // Form inputs for Kamar Modal
    const [kamarForm, setKamarForm] = useState<{
        nama: string;
        gedungId: number;
        kapasitas: number;
        lantai: string;
        musyrifId: number | '';
        fasilitas: string;
        kondisiFasilitas: 'Baik' | 'Cukup' | 'Perlu Perbaikan';
        catatan: string;
    }>({
        nama: '',
        gedungId: gedungList[0]?.id || 1,
        kapasitas: 10,
        lantai: '1',
        musyrifId: '',
        fasilitas: '',
        kondisiFasilitas: 'Baik',
        catatan: ''
    });

    // Metrics
    const stats = useMemo(() => {
        const totalGedung = gedungList.length;
        const totalKamar = kamarList.length;
        const totalKapasitas = kamarList.reduce((acc, k) => acc + (k.kapasitas || 0), 0);
        
        // Count santri who reside in rooms
        const santriTerisi = santriList.filter(s => s.kamarId && s.status === 'Aktif').length;
        const sisaKuota = Math.max(0, totalKapasitas - santriTerisi);
        const persentaseOkupansi = totalKapasitas > 0 ? Math.round((santriTerisi / totalKapasitas) * 100) : 0;

        return {
            totalGedung,
            totalKamar,
            totalKapasitas,
            santriTerisi,
            sisaKuota,
            persentaseOkupansi
        };
    }, [gedungList, kamarList, santriList]);

    // Filtered rooms
    const filteredKamar = useMemo(() => {
        return kamarList.filter(k => {
            if (selectedGedungId !== 'ALL' && k.gedungId !== selectedGedungId) {
                return false;
            }
            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase();
                const gedungName = gedungList.find(g => g.id === k.gedungId)?.nama.toLowerCase() || '';
                const musyrifName = teachersList.find(t => t.id === k.musyrifId)?.nama.toLowerCase() || '';
                const matchNama = k.nama.toLowerCase().includes(kw);
                const matchFasilitas = (k.fasilitas || '').toLowerCase().includes(kw);
                return matchNama || gedungName.includes(kw) || musyrifName.includes(kw) || matchFasilitas;
            }
            return true;
        });
    }, [kamarList, selectedGedungId, searchKeyword, gedungList, teachersList]);

    // Handlers for Gedung
    const openAddGedung = () => {
        setGedungForm({ nama: '', jenis: 'Putra' });
        setGedungModal({ mode: 'add' });
    };

    const openEditGedung = (g: GedungAsrama) => {
        setGedungForm({ nama: g.nama, jenis: g.jenis });
        setGedungModal({ mode: 'edit', item: g });
    };

    const handleSaveGedung = (e: React.FormEvent) => {
        e.preventDefault();
        if (!gedungForm.nama.trim()) {
            showAlert('Validasi', 'Nama gedung asrama wajib diisi.');
            return;
        }

        let updated: GedungAsrama[];
        if (gedungModal?.mode === 'add') {
            const nextId = gedungList.length > 0 ? Math.max(...gedungList.map(g => g.id)) + 1 : 1;
            updated = [...gedungList, { id: nextId, nama: gedungForm.nama.trim(), jenis: gedungForm.jenis }];
        } else if (gedungModal?.item) {
            updated = gedungList.map(g => g.id === gedungModal.item?.id ? { ...g, nama: gedungForm.nama.trim(), jenis: gedungForm.jenis } : g);
        } else {
            return;
        }

        handleInputChange('gedungAsrama', updated);
        setGedungModal(null);
        showToast('Data gedung berhasil disimpan.', 'success');
    };

    const handleDeleteGedung = (id: number) => {
        const kamarInGedung = kamarList.filter(k => k.gedungId === id);
        if (kamarInGedung.length > 0) {
            showAlert('Gagal Menghapus', `Gedung ini masih memiliki ${kamarInGedung.length} kamar santri. Hapus atau pindahkan kamar terlebih dahulu.`);
            return;
        }

        const g = gedungList.find(item => item.id === id);
        showConfirmation(
            'Hapus Gedung Asrama',
            `Yakin ingin menghapus gedung "${g?.nama}"?`,
            () => {
                const updated = gedungList.filter(item => item.id !== id);
                handleInputChange('gedungAsrama', updated);
                showToast('Gedung berhasil dihapus.', 'success');
            },
            { confirmColor: 'red' }
        );
    };

    // Handlers for Kamar
    const openAddKamar = () => {
        setKamarForm({
            nama: '',
            gedungId: selectedGedungId !== 'ALL' ? selectedGedungId : (gedungList[0]?.id || 1),
            kapasitas: 10,
            lantai: '1',
            musyrifId: '',
            fasilitas: 'Ranjang Susun, Lemari, Kipas Angin',
            kondisiFasilitas: 'Baik',
            catatan: ''
        });
        setKamarModal({ mode: 'add' });
    };

    const openEditKamar = (k: Kamar) => {
        setKamarForm({
            nama: k.nama,
            gedungId: k.gedungId,
            kapasitas: k.kapasitas || 10,
            lantai: k.lantai ? String(k.lantai) : '1',
            musyrifId: k.musyrifId || '',
            fasilitas: k.fasilitas || '',
            kondisiFasilitas: k.kondisiFasilitas || 'Baik',
            catatan: k.catatan || ''
        });
        setKamarModal({ mode: 'edit', item: k });
    };

    const handleSaveKamar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!kamarForm.nama.trim()) {
            showAlert('Validasi', 'Nama kamar asrama wajib diisi.');
            return;
        }

        const payload: Kamar = {
            id: kamarModal?.mode === 'edit' && kamarModal.item ? kamarModal.item.id : (kamarList.length > 0 ? Math.max(...kamarList.map(k => k.id)) + 1 : 1),
            nama: kamarForm.nama.trim(),
            gedungId: Number(kamarForm.gedungId),
            kapasitas: Number(kamarForm.kapasitas) || 1,
            lantai: kamarForm.lantai.trim() || undefined,
            musyrifId: kamarForm.musyrifId ? Number(kamarForm.musyrifId) : undefined,
            fasilitas: kamarForm.fasilitas.trim() || undefined,
            kondisiFasilitas: kamarForm.kondisiFasilitas,
            catatan: kamarForm.catatan.trim() || undefined
        };

        let updated: Kamar[];
        if (kamarModal?.mode === 'add') {
            updated = [...kamarList, payload];
        } else {
            updated = kamarList.map(k => k.id === payload.id ? payload : k);
        }

        handleInputChange('kamar', updated);
        setKamarModal(null);
        showToast('Data kamar berhasil disimpan.', 'success');
    };

    const handleDeleteKamar = (id: number) => {
        const santriInKamar = santriList.filter(s => s.kamarId === id && s.status === 'Aktif');
        if (santriInKamar.length > 0) {
            showAlert('Gagal Menghapus', `Kamar ini masih ditempati oleh ${santriInKamar.length} santri aktif. Pindahkan santri terlebih dahulu di modul Keasramaan.`);
            return;
        }

        const k = kamarList.find(item => item.id === id);
        showConfirmation(
            'Hapus Kamar Asrama',
            `Yakin ingin menghapus kamar "${k?.nama}"?`,
            () => {
                const updated = kamarList.filter(item => item.id !== id);
                handleInputChange('kamar', updated);
                showToast('Kamar berhasil dihapus.', 'success');
            },
            { confirmColor: 'red' }
        );
    };

    // Export to Excel
    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const exportData = kamarList.map((k, index) => {
                const gedung = gedungList.find(g => g.id === k.gedungId);
                const musyrif = teachersList.find(t => t.id === k.musyrifId);
                const penghuniCount = santriList.filter(s => s.kamarId === k.id && s.status === 'Aktif').length;
                const kapasitas = k.kapasitas || 0;
                const sisa = Math.max(0, kapasitas - penghuniCount);
                const persentase = kapasitas > 0 ? Math.round((penghuniCount / kapasitas) * 100) : 0;

                return {
                    'No': index + 1,
                    'Nama Kamar': k.nama,
                    'Gedung Asrama': gedung?.nama || 'Tanpa Gedung',
                    'Kategori': gedung?.jenis || '-',
                    'Lantai': k.lantai || '-',
                    'Kapasitas': kapasitas,
                    'Santri Terisi': penghuniCount,
                    'Sisa Kuota': sisa,
                    'Okupansi (%)': `${persentase}%`,
                    'Musyrif / Pembina': musyrif?.nama || 'Belum Ditentukan',
                    'Kondisi Fasilitas': k.kondisiFasilitas || 'Baik',
                    'Fasilitas': k.fasilitas || '-',
                    'Catatan': k.catatan || '-'
                };
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, "Master Asrama & Kamar");
            XLSX.writeFile(wb, `Data_Master_Asrama_Kamar_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast('Data master asrama berhasil diekspor ke Excel!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Gagal mengekspor data asrama.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Metrics */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="bi bi-buildings text-teal-600"></i>
                            Fasilitas & Asrama (Gedung & Kamar)
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Kelola data master gedung asrama putra/putri, kamar santri, daya tampung, serta pembina/musyrif kamar.
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
                                                openAddGedung();
                                            }}
                                            className="w-full text-left px-3.5 py-2 hover:bg-teal-50 flex items-center gap-2.5 text-gray-700 transition"
                                        >
                                            <i className="bi bi-building-add text-teal-600 text-sm"></i>
                                            <div>
                                                <span className="font-semibold block text-gray-800">Tambah Gedung</span>
                                                <span className="text-[10px] text-gray-400">Gedung asrama putra/putri</span>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsActionOpen(false);
                                                openAddKamar();
                                            }}
                                            className="w-full text-left px-3.5 py-2 hover:bg-teal-50 flex items-center gap-2.5 text-gray-700 transition"
                                        >
                                            <i className="bi bi-door-open-fill text-indigo-600 text-sm"></i>
                                            <div>
                                                <span className="font-semibold block text-gray-800">Tambah Kamar</span>
                                                <span className="text-[10px] text-gray-400">Ruangan &amp; kapasitas bed</span>
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
                                        disabled={isExporting || kamarList.length === 0}
                                        className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-center gap-2.5 text-gray-700 transition disabled:opacity-50"
                                    >
                                        <i className="bi bi-file-earmark-excel-fill text-emerald-600 text-sm"></i>
                                        <div>
                                            <span className="font-semibold block text-emerald-800">Ekspor Excel</span>
                                            <span className="text-[10px] text-gray-400">Unduh data fasilitas (.xlsx)</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4 Cards Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-[11px] font-semibold text-gray-500 block uppercase">Total Gedung</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xl font-bold text-gray-800">{stats.totalGedung}</span>
                            <span className="text-[10px] text-gray-400">Gedung</span>
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-[11px] font-semibold text-gray-500 block uppercase">Total Kamar</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xl font-bold text-gray-800">{stats.totalKamar}</span>
                            <span className="text-[10px] text-gray-400">Ruangan</span>
                        </div>
                    </div>
                    <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg">
                        <span className="text-[11px] font-semibold text-teal-800 block uppercase">Kapasitas Asrama</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xl font-bold text-teal-900">{stats.santriTerisi} / {stats.totalKapasitas}</span>
                            <span className="text-[10px] text-teal-700 font-medium">Santri ({stats.persentaseOkupansi}%)</span>
                        </div>
                    </div>
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                        <span className="text-[11px] font-semibold text-amber-800 block uppercase">Sisa Kuota Kamar</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xl font-bold text-amber-900">{stats.sisaKuota}</span>
                            <span className="text-[10px] text-amber-700">Bed Tersedia</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gedung Asrama Section */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <i className="bi bi-building text-teal-600"></i>
                        Daftar Gedung Asrama
                        <span className="text-xs font-normal text-gray-400">({gedungList.length})</span>
                    </h3>
                </div>
                {gedungList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {gedungList.map(g => {
                            const kamarsInThis = kamarList.filter(k => k.gedungId === g.id);
                            const totalBedInGedung = kamarsInThis.reduce((acc, k) => acc + (k.kapasitas || 0), 0);
                            const santriInGedung = santriList.filter(s => {
                                const k = kamarList.find(km => km.id === s.kamarId);
                                return k?.gedungId === g.id && s.status === 'Aktif';
                            }).length;

                            return (
                                <div key={g.id} className="p-3.5 border border-gray-200 rounded-xl hover:border-teal-300 transition-all bg-white relative group shadow-xs">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.jenis === 'Putra' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-pink-50 text-pink-700 border border-pink-200'}`}>
                                                Asrama {g.jenis}
                                            </span>
                                            <h4 className="font-bold text-gray-900 text-sm mt-1.5">{g.nama}</h4>
                                        </div>
                                        {canWrite && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditGedung(g)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit Gedung"
                                                >
                                                    <i className="bi bi-pencil-square text-xs"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteGedung(g.id)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    title="Hapus Gedung"
                                                >
                                                    <i className="bi bi-trash text-xs"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                        <span>{kamarsInThis.length} Kamar</span>
                                        <span className="font-semibold text-gray-700">{santriInGedung} / {totalBedInGedung} Santri</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-400 text-xs">
                        Belum ada data gedung asrama. Klik "Tambah Gedung" untuk membuat gedung baru.
                    </div>
                )}
            </div>

            {/* Kamar Asrama Table Section */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b pb-3">
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <i className="bi bi-door-closed text-teal-600"></i>
                            Daftar Kamar Asrama
                            <span className="text-xs font-normal text-gray-400">({filteredKamar.length})</span>
                        </h3>
                    </div>

                    {/* Filter by Gedung & Search */}
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={selectedGedungId}
                            onChange={(e) => setSelectedGedungId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                            aria-label="Filter Gedung Asrama"
                            className="text-xs py-1.5 px-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        >
                            <option value="ALL">Semua Gedung ({gedungList.length})</option>
                            {gedungList.map(g => (
                                <option key={g.id} value={g.id}>{g.nama} ({g.jenis})</option>
                            ))}
                        </select>

                        <div className="relative">
                            <i className="bi bi-search absolute left-2.5 top-2 text-gray-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari kamar, pembina, fasilitas..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                className="pl-7 pr-7 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 w-44 sm:w-56"
                            />
                            {searchKeyword && (
                                <button
                                    onClick={() => setSearchKeyword('')}
                                    className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 text-xs"
                                >
                                    <i className="bi bi-x-circle-fill"></i>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-600 font-bold uppercase border-b border-gray-200">
                            <tr>
                                <th className="p-3 w-12 text-center">No</th>
                                <th className="p-3">Nama Kamar</th>
                                <th className="p-3">Gedung / Kategori</th>
                                <th className="p-3">Lantai</th>
                                <th className="p-3">Musyrif / Pembina</th>
                                <th className="p-3">Kapasitas & Okupansi</th>
                                <th className="p-3">Fasilitas & Kondisi</th>
                                {canWrite && <th className="p-3 text-center w-20">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredKamar.length > 0 ? (
                                filteredKamar.map((k, idx) => {
                                    const gedung = gedungList.find(g => g.id === k.gedungId);
                                    const musyrif = teachersList.find(t => t.id === k.musyrifId);
                                    const santriCount = santriList.filter(s => s.kamarId === k.id && s.status === 'Aktif').length;
                                    const kapasitas = k.kapasitas || 1;
                                    const ratio = Math.min(100, Math.round((santriCount / kapasitas) * 100));
                                    const isFull = santriCount >= kapasitas;

                                    return (
                                        <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-center font-medium text-gray-400">{idx + 1}</td>
                                            <td className="p-3">
                                                <span className="font-bold text-gray-900 block">{k.nama}</span>
                                                {k.catatan && <span className="text-[10px] text-gray-400 italic block mt-0.5">{k.catatan}</span>}
                                            </td>
                                            <td className="p-3">
                                                <span className="font-medium text-gray-700">{gedung?.nama || 'Tanpa Gedung'}</span>
                                                {gedung && (
                                                    <span className={`text-[10px] ml-1.5 px-1.5 py-0.5 rounded font-bold ${gedung.jenis === 'Putra' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                                        {gedung.jenis}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-gray-600 font-medium">
                                                {k.lantai ? `Lantai ${k.lantai}` : '-'}
                                            </td>
                                            <td className="p-3">
                                                {musyrif ? (
                                                    <span className="font-semibold text-teal-700 flex items-center gap-1">
                                                        <i className="bi bi-person-badge"></i>
                                                        {musyrif.nama}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Belum ada pembina</span>
                                                )}
                                            </td>
                                            <td className="p-3 min-w-[140px]">
                                                <div className="flex items-center justify-between text-[11px] mb-1">
                                                    <span className="font-bold text-gray-800">{santriCount} / {kapasitas}</span>
                                                    <span className={`font-semibold ${isFull ? 'text-rose-600' : ratio > 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        {isFull ? 'Penuh' : `${ratio}%`}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${isFull ? 'bg-rose-500' : ratio > 75 ? 'bg-amber-500' : 'bg-teal-500'}`}
                                                        style={{ width: `${ratio}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${k.kondisiFasilitas === 'Perlu Perbaikan' ? 'bg-red-50 text-red-700 border border-red-200' : k.kondisiFasilitas === 'Cukup' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                        {k.kondisiFasilitas || 'Baik'}
                                                    </span>
                                                    {k.fasilitas && <span className="text-[11px] text-gray-600 truncate max-w-[150px]">{k.fasilitas}</span>}
                                                </div>
                                            </td>
                                            {canWrite && (
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditKamar(k)}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Edit Kamar"
                                                        >
                                                            <i className="bi bi-pencil-square"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteKamar(k.id)}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                            title="Hapus Kamar"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={canWrite ? 8 : 7} className="text-center py-8 text-gray-400">
                                        {searchKeyword ? 'Tidak ada kamar yang cocok dengan pencarian.' : 'Belum ada data kamar asrama.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gedung Modal */}
            {gedungModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 text-sm">
                                {gedungModal.mode === 'add' ? 'Tambah Gedung Asrama' : 'Edit Gedung Asrama'}
                            </h3>
                            <button onClick={() => setGedungModal(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSaveGedung} className="p-4 space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Nama Gedung</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Gedung Umar bin Khattab"
                                    value={gedungForm.nama}
                                    onChange={(e) => setGedungForm({ ...gedungForm, nama: e.target.value })}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Kategori Penghuni</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 cursor-pointer font-bold ${gedungForm.jenis === 'Putra' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        <input
                                            type="radio"
                                            name="jenisGedung"
                                            checked={gedungForm.jenis === 'Putra'}
                                            onChange={() => setGedungForm({ ...gedungForm, jenis: 'Putra' })}
                                            className="hidden"
                                        />
                                        <i className="bi bi-gender-male"></i>
                                        Asrama Putra
                                    </label>
                                    <label className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 cursor-pointer font-bold ${gedungForm.jenis === 'Putri' ? 'bg-pink-50 border-pink-300 text-pink-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        <input
                                            type="radio"
                                            name="jenisGedung"
                                            checked={gedungForm.jenis === 'Putri'}
                                            onChange={() => setGedungForm({ ...gedungForm, jenis: 'Putri' })}
                                            className="hidden"
                                        />
                                        <i className="bi bi-gender-female"></i>
                                        Asrama Putri
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setGedungModal(null)}
                                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs"
                                >
                                    Simpan Gedung
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Kamar Modal */}
            {kamarModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 text-sm">
                                {kamarModal.mode === 'add' ? 'Tambah Kamar Asrama' : 'Edit Kamar Asrama'}
                            </h3>
                            <button onClick={() => setKamarModal(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSaveKamar} className="p-4 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Nama Kamar *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Kamar A1 / Madinah 01"
                                        value={kamarForm.nama}
                                        onChange={(e) => setKamarForm({ ...kamarForm, nama: e.target.value })}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Gedung Asrama *</label>
                                    <select
                                        value={kamarForm.gedungId}
                                        onChange={(e) => setKamarForm({ ...kamarForm, gedungId: Number(e.target.value) })}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    >
                                        {gedungList.map(g => (
                                            <option key={g.id} value={g.id}>{g.nama} ({g.jenis})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Kapasitas Maksimal (Santri) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="100"
                                        value={kamarForm.kapasitas}
                                        onChange={(e) => setKamarForm({ ...kamarForm, kapasitas: Number(e.target.value) })}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Posisi Lantai</label>
                                    <input
                                        type="text"
                                        placeholder="1, 2, atau Dasar"
                                        value={kamarForm.lantai}
                                        onChange={(e) => setKamarForm({ ...kamarForm, lantai: e.target.value })}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Musyrif / Pembina Kamar</label>
                                <select
                                    value={kamarForm.musyrifId}
                                    onChange={(e) => setKamarForm({ ...kamarForm, musyrifId: e.target.value ? Number(e.target.value) : '' })}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">-- Pilih Musyrif / Pembina (Opsional) --</option>
                                    {teachersList.map(t => (
                                        <option key={t.id} value={t.id}>{t.nama} {t.jenisPegawai === 'kependidikan' ? '(Staf)' : '(Guru)'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Kondisi Fasilitas</label>
                                    <select
                                        value={kamarForm.kondisiFasilitas}
                                        onChange={(e) => setKamarForm({ ...kamarForm, kondisiFasilitas: e.target.value as any })}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    >
                                        <option value="Baik">Baik (Optimal)</option>
                                        <option value="Cukup">Cukup (Layak Pakai)</option>
                                        <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Rincian Fasilitas Kamar</label>
                                    <input
                                        type="text"
                                        placeholder="5 Ranjang Susun, 10 Lemari, 2 Kipas"
                                        value={kamarForm.fasilitas}
                                        onChange={(e) => setKamarForm({ ...kamarForm, fasilitas: e.target.value })}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Catatan Tambahan</label>
                                <textarea
                                    rows={2}
                                    placeholder="Catatan khusus kondisi kamar atau arahan..."
                                    value={kamarForm.catatan}
                                    onChange={(e) => setKamarForm({ ...kamarForm, catatan: e.target.value })}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setKamarModal(null)}
                                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs"
                                >
                                    Simpan Kamar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
