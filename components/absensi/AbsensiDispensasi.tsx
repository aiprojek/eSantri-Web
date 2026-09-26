import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { AbsensiRecord, Santri, SesiAbsensi } from '../../types';
import { SESI_ABSENSI_LIST } from './absensiConstants';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';

interface DispensasiEntry {
    id: string;
    santriIds: number[];
    tanggalMulai: string;
    tanggalSelesai: string;
    status: 'I' | 'S';
    sesi: string;
    kategori: string;
    keterangan: string;
    noSurat?: string;
    petugasPemberiIzin: string;
    createdAt: string;
}

export const AbsensiDispensasi: React.FC = () => {
    const { settings, showToast, showConfirmation, currentUser } = useAppContext();
    const { santriList, absensiList, onSaveAbsensi } = useSantriContext();

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.absensi === 'write';

    // Cascading filter state
    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(0);
    const [selectedKelasId, setSelectedKelasId] = useState<number>(0);
    const [selectedRombelId, setSelectedRombelId] = useState<number>(0);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    const activeFilterCount = (selectedJenjangId ? 1 : 0) + (selectedKelasId ? 1 : 0) + (selectedRombelId ? 1 : 0);
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
    const [searchSantri, setSearchSantri] = useState('');
    const [statusIzin, setStatusIzin] = useState<'I' | 'S'>('I');
    const [kategoriIzin, setKategoriIzin] = useState<string>('Izin Pulang Keluarga');
    const [tanggalMulai, setTanggalMulai] = useState<string>(new Date().toISOString().split('T')[0]);
    const [tanggalSelesai, setTanggalSelesai] = useState<string>(new Date().toISOString().split('T')[0]);
    const [sesiPilihan, setSesiPilihan] = useState<string>('Semua Sesi');
    const [noSurat, setNoSurat] = useState<string>('');
    const [keterangan, setKeterangan] = useState<string>('');
    const [petugas, setPetugas] = useState<string>(currentUser?.fullName || currentUser?.username || 'Ustadz Pengasuhan');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // List of active filter for recent records
    const [filterSearch, setFilterSearch] = useState('');

    // Available Kelas and Rombel based on cascading selections
    const availableKelas = useMemo(() => {
        if (!selectedJenjangId) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === selectedJenjangId);
    }, [selectedJenjangId, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (selectedKelasId) {
            return settings.rombel.filter(r => r.kelasId === selectedKelasId);
        }
        if (selectedJenjangId) {
            const validKelasIds = availableKelas.map(k => k.id);
            return settings.rombel.filter(r => validKelasIds.includes(r.kelasId));
        }
        return settings.rombel;
    }, [selectedKelasId, selectedJenjangId, availableKelas, settings.rombel]);

    // Handle Jenjang Change
    const handleJenjangChange = (jenjangId: number) => {
        setSelectedJenjangId(jenjangId);
        setSelectedKelasId(0);
        setSelectedRombelId(0);
    };

    // Handle Kelas Change
    const handleKelasChange = (kelasId: number) => {
        setSelectedKelasId(kelasId);
        setSelectedRombelId(0);
    };

    // Available santri in chosen filter
    const rombelSantri = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;

            const santriRombel = settings.rombel.find(r => r.id === s.rombelId);
            const santriKelas = settings.kelas.find(k => k.id === santriRombel?.kelasId);

            if (selectedJenjangId && santriKelas?.jenjangId !== selectedJenjangId) return false;
            if (selectedKelasId && santriRombel?.kelasId !== selectedKelasId) return false;
            if (selectedRombelId && s.rombelId !== selectedRombelId) return false;

            if (searchSantri.trim()) {
                const q = searchSantri.toLowerCase();
                return s.namaLengkap.toLowerCase().includes(q) || (s.nis && s.nis.toLowerCase().includes(q));
            }
            return true;
        });
    }, [santriList, selectedJenjangId, selectedKelasId, selectedRombelId, searchSantri, settings.rombel, settings.kelas]);

    // Calculate dates between start and end
    const dateRangeList = useMemo(() => {
        if (!tanggalMulai || !tanggalSelesai) return [];
        const start = new Date(tanggalMulai);
        const end = new Date(tanggalSelesai);
        if (start > end) return [];
        
        const dates: string[] = [];
        const curr = new Date(start);
        while (curr <= end) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    }, [tanggalMulai, tanggalSelesai]);

    const handleToggleSantri = (id: number) => {
        setSelectedSantriIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllRombel = () => {
        const ids = rombelSantri.map(s => s.id);
        const allSelected = ids.every(id => selectedSantriIds.includes(id));
        if (allSelected) {
            setSelectedSantriIds(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setSelectedSantriIds(prev => Array.from(new Set([...prev, ...ids])));
        }
    };

    const handleRemoveSelectedSantri = (id: number) => {
        setSelectedSantriIds(prev => prev.filter(item => item !== id));
    };

    // Apply dispensasi directly to absensi database
    const handleApplyDispensasi = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite) {
            showToast('Anda tidak memiliki hak akses untuk mencatat dispensasi presensi.', 'error');
            return;
        }

        if (selectedSantriIds.length === 0) {
            showToast('Pilih minimal 1 santri yang mengajukan izin / dispensasi.', 'info');
            return;
        }

        if (dateRangeList.length === 0) {
            showToast('Tanggal selesai harus sama atau setelah tanggal mulai.', 'info');
            return;
        }

        const totalRecordsToCreate = selectedSantriIds.length * dateRangeList.length;
        const confirmMsg = `Terapkan dispensasi (${statusIzin === 'I' ? 'Izin' : 'Sakit'}) untuk ${selectedSantriIds.length} santri selama ${dateRangeList.length} hari (${dateRangeList[0]} s/d ${dateRangeList[dateRangeList.length - 1]})? Total ${totalRecordsToCreate} data absensi akan dicatat.`;

        showConfirmation(
            'Konfirmasi Terapkan Dispensasi',
            confirmMsg,
            async () => {
                setIsSubmitting(true);
                try {
                    const newRecords: AbsensiRecord[] = [];
                    const fullKet = [
                        kategoriIzin,
                        noSurat ? `No: ${noSurat}` : '',
                        keterangan.trim(),
                        petugas ? `[Pemberi Izin: ${petugas}]` : ''
                    ].filter(Boolean).join(' • ');

                    selectedSantriIds.forEach(sId => {
                        const santri = santriList.find(s => s.id === sId);
                        const rId = santri?.rombelId || selectedRombelId || 0;

                        dateRangeList.forEach(tgl => {
                            // If specific session or all sessions
                            const targetSesi = sesiPilihan === 'Semua Sesi' ? 'KBM Pagi' : sesiPilihan;
                            
                            // Check existing
                            const existing = absensiList.find(a => 
                                a.santriId === sId && 
                                a.tanggal === tgl && 
                                (!a.sesi || a.sesi === targetSesi || sesiPilihan === 'Semua Sesi')
                            );

                            newRecords.push({
                                id: existing?.id || Date.now() + Math.random() * 100000,
                                santriId: sId,
                                rombelId: rId,
                                tanggal: tgl,
                                status: statusIzin,
                                keterangan: fullKet,
                                sesi: targetSesi,
                                recordedBy: currentUser?.username || 'Dispensasi',
                                lastModified: Date.now()
                            });
                        });
                    });

                    await onSaveAbsensi(newRecords);
                    showToast(`Dispensasi berhasil diterapkan untuk ${selectedSantriIds.length} santri (${dateRangeList.length} hari).`, 'success');

                    // Reset form selection
                    setSelectedSantriIds([]);
                    setKeterangan('');
                    setNoSurat('');
                } catch (err: any) {
                    console.error('Failed to save dispensasi:', err);
                    showToast('Gagal menyimpan dispensasi: ' + (err.message || 'Terjadi kesalahan'), 'error');
                } finally {
                    setIsSubmitting(false);
                }
            },
            { confirmText: 'Ya, Terapkan ke Absensi' }
        );
    };

    // Filter recent absensi that have dispensasi/izin/sakit notes
    const recentDispensasiRecords = useMemo(() => {
        return absensiList
            .filter(a => (a.status === 'I' || a.status === 'S') && a.keterangan && a.keterangan.length > 3)
            .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
            .filter(a => {
                if (!filterSearch.trim()) return true;
                const q = filterSearch.toLowerCase();
                const santri = santriList.find(s => s.id === a.santriId);
                return (
                    (santri?.namaLengkap.toLowerCase().includes(q)) ||
                    (a.keterangan?.toLowerCase().includes(q)) ||
                    (a.tanggal.includes(q))
                );
            })
            .slice(0, 50);
    }, [absensiList, santriList, filterSearch]);

    return (
        <div className="space-y-6">
            {/* Main Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel: Santri Selector (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <i className="bi bi-people-fill text-blue-600"></i>
                                <span>Pilih Santri ({selectedSantriIds.length} Terpilih)</span>
                            </h3>
                            {rombelSantri.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleSelectAllRombel}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                >
                                    {rombelSantri.every(s => selectedSantriIds.includes(s.id)) ? 'Batal Pilih Semua' : `Pilih Semua (${rombelSantri.length})`}
                                </button>
                            )}
                        </div>

                        {/* Mobile Filter & Search Trigger */}
                        <div className="flex md:hidden items-center gap-2">
                            <div className="relative flex-1">
                                <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Cari nama santri atau NIS..."
                                    value={searchSantri}
                                    onChange={e => setSearchSantri(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMobileFilterOpen(true)}
                                className={`h-9 px-3 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
                                    activeFilterCount > 0
                                        ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-xs'
                                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                                }`}
                            >
                                <i className="bi bi-funnel-fill text-blue-600"></i>
                                <span>Filter</span>
                                {activeFilterCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Mobile Filter Drawer */}
                        <MobileFilterDrawer
                            isOpen={isMobileFilterOpen}
                            onClose={() => setIsMobileFilterOpen(false)}
                            title="Filter Kelas Santri Dispensasi"
                            onReset={() => {
                                setSelectedJenjangId(0);
                                setSelectedKelasId(0);
                                setSelectedRombelId(0);
                            }}
                        >
                            <div className="space-y-3.5 text-xs">
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1">Marhalah / Jenjang</label>
                                    <select
                                        value={selectedJenjangId}
                                        onChange={e => handleJenjangChange(Number(e.target.value))}
                                        className="w-full text-xs font-medium p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value={0}>Semua Jenjang</option>
                                        {settings.jenjang.map(j => (
                                            <option key={j.id} value={j.id}>{j.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1">Tingkat / Kelas</label>
                                    <select
                                        value={selectedKelasId}
                                        onChange={e => handleKelasChange(Number(e.target.value))}
                                        className="w-full text-xs font-medium p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value={0}>Semua Tingkat</option>
                                        {availableKelas.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1">Rombel / Kelas Belajar</label>
                                    <select
                                        value={selectedRombelId}
                                        onChange={e => setSelectedRombelId(Number(e.target.value))}
                                        className="w-full text-xs font-medium p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value={0}>Semua Rombel</option>
                                        {availableRombel.map(r => {
                                            const k = settings.kelas.find(kl => kl.id === r.kelasId);
                                            return <option key={r.id} value={r.id}>{r.nama} ({k?.nama || '-'})</option>;
                                        })}
                                    </select>
                                </div>
                            </div>
                        </MobileFilterDrawer>

                        {/* Complete Cascading Filter: Jenjang, Kelas, Rombel (Desktop) */}
                        <div className="hidden md:block space-y-2.5 bg-gray-50/80 p-3 rounded-xl border border-gray-200/80">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Marhalah / Jenjang</label>
                                    <select
                                        value={selectedJenjangId}
                                        onChange={e => handleJenjangChange(Number(e.target.value))}
                                        className="w-full text-xs font-medium p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value={0}>Semua Jenjang</option>
                                        {settings.jenjang.map(j => (
                                            <option key={j.id} value={j.id}>{j.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tingkat / Kelas</label>
                                    <select
                                        value={selectedKelasId}
                                        onChange={e => handleKelasChange(Number(e.target.value))}
                                        className="w-full text-xs font-medium p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value={0}>Semua Tingkat</option>
                                        {availableKelas.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Rombel / Kelas Belajar</label>
                                <select
                                    value={selectedRombelId}
                                    onChange={e => setSelectedRombelId(Number(e.target.value))}
                                    className="w-full text-xs font-medium p-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value={0}>Semua Rombel</option>
                                    {availableRombel.map(r => {
                                        const k = settings.kelas.find(kl => kl.id === r.kelasId);
                                        return <option key={r.id} value={r.id}>{r.nama} ({k?.nama || '-'})</option>;
                                    })}
                                </select>
                            </div>

                            <div className="relative">
                                <i className="bi bi-search absolute left-3 top-2 text-gray-400 text-xs"></i>
                                <input
                                    type="text"
                                    placeholder="Cari nama santri atau NIS..."
                                    value={searchSantri}
                                    onChange={e => setSearchSantri(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Selected Santri Badges */}
                        {selectedSantriIds.length > 0 && (
                            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                                <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Santri yang Dipilih:</p>
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                    {selectedSantriIds.map(id => {
                                        const s = santriList.find(item => item.id === id);
                                        return (
                                            <span
                                                key={id}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-300 text-blue-800 rounded-lg text-xs font-semibold shadow-2xs"
                                            >
                                                <span>{s?.namaLengkap || 'Santri'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSelectedSantri(id)}
                                                    className="text-blue-500 hover:text-red-600 transition-colors"
                                                >
                                                    <i className="bi bi-x text-sm"></i>
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Santri Checklist List */}
                        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-80 overflow-y-auto custom-scrollbar">
                            {rombelSantri.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 text-xs">
                                    Tidak ada santri ditemukan pada rombel ini.
                                </div>
                            ) : (
                                rombelSantri.map(s => {
                                    const isChecked = selectedSantriIds.includes(s.id);
                                    const rombel = settings.rombel.find(r => r.id === s.rombelId);
                                    return (
                                        <label
                                            key={s.id}
                                            className={`flex items-center gap-3 p-2.5 px-3 text-xs cursor-pointer hover:bg-gray-50 transition-colors ${isChecked ? 'bg-blue-50/50 font-semibold' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleSantri(s.id)}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-gray-900 truncate">{s.namaLengkap}</p>
                                                <p className="text-[11px] text-gray-500 truncate">NIS: {s.nis || '-'} • {rombel?.nama || 'Tanpa Rombel'}</p>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Dispensasi Details & Action (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                    <form onSubmit={handleApplyDispensasi} className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs space-y-5">
                        <div className="border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                                <i className="bi bi-file-earmark-medical-fill text-indigo-600"></i>
                                <span>Formulir Surat & Keterangan Dispensasi</span>
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">Tentukan parameter izin, durasi tanggal, dan alasan ketidakhadiran.</p>
                        </div>

                        {/* Status Type & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Status Presensi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStatusIzin('I')}
                                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${statusIzin === 'I' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                    >
                                        <i className="bi bi-info-circle-fill"></i>
                                        <span>IZIN (I)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusIzin('S')}
                                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${statusIzin === 'S' ? 'bg-yellow-500 text-white border-yellow-500 shadow-xs' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                    >
                                        <i className="bi bi-bandaid-fill"></i>
                                        <span>SAKIT (S)</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Kategori Keperluan</label>
                                <select
                                    value={kategoriIzin}
                                    onChange={e => setKategoriIzin(e.target.value)}
                                    className="w-full text-xs font-medium p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Izin Pulang Keluarga">Izin Pulang / Acara Keluarga</option>
                                    <option value="Sakit Rawat Jalan">Sakit Rawat Jalan di Asrama/Rumah</option>
                                    <option value="Sakit Rawat Inap Rumah Sakit">Sakit Rawat Inap (RS / Klinik)</option>
                                    <option value="Dispensasi Lomba / Olimpiade">Dispensasi Lomba / Olimpiade / Kejuaraan</option>
                                    <option value="Tugas Dinas Pondok">Tugas Dinas / Kepanitiaan Pondok</option>
                                    <option value="Keperluan Medis / Terapi">Pemeriksaan Dokter / Terapi Medis</option>
                                    <option value="Lainnya">Keperluan Lainnya</option>
                                </select>
                            </div>
                        </div>

                        {/* Date Range Selector */}
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                            <label className="block text-xs font-bold text-indigo-900">Rentang Tanggal Dispensasi</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Mulai Dari Tanggal</label>
                                    <input
                                        type="date"
                                        value={tanggalMulai}
                                        onChange={e => setTanggalMulai(e.target.value)}
                                        className="w-full text-xs font-medium p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Sampai Dengan Tanggal</label>
                                    <input
                                        type="date"
                                        value={tanggalSelesai}
                                        onChange={e => setTanggalSelesai(e.target.value)}
                                        className="w-full text-xs font-medium p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-indigo-800 pt-1">
                                <span>Total Durasi: <strong>{dateRangeList.length} Hari</strong></span>
                                <span className="text-[11px] text-indigo-600">
                                    {dateRangeList.length > 0 ? `(${dateRangeList[0]} s/d ${dateRangeList[dateRangeList.length - 1]})` : 'Rentang tanggal tidak valid'}
                                </span>
                            </div>
                        </div>

                        {/* Session, Nomor Surat, and Officer */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Sesi Presensi</label>
                                <select
                                    value={sesiPilihan}
                                    onChange={e => setSesiPilihan(e.target.value)}
                                    className="w-full text-xs font-medium p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Semua Sesi">Semua Sesi Harian</option>
                                    {SESI_ABSENSI_LIST.map(sesi => (
                                        <option key={sesi} value={sesi}>{sesi}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">No. Surat Izin (Opsional)</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: 014/IZN/VIII/2026"
                                    value={noSurat}
                                    onChange={e => setNoSurat(e.target.value)}
                                    className="w-full text-xs font-medium p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Petugas / Ustadz</label>
                                <input
                                    type="text"
                                    value={petugas}
                                    onChange={e => setPetugas(e.target.value)}
                                    className="w-full text-xs font-medium p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Detailed Reason */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Catatan / Alasan Dispensasi</label>
                            <textarea
                                rows={2}
                                placeholder="Tuliskan keterangan rinci (misal: Menghadiri pernikahan kakak kandung di Surabaya / Dirawat di RSUD karena demam berdarah)..."
                                value={keterangan}
                                onChange={e => setKeterangan(e.target.value)}
                                className="w-full text-xs p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || selectedSantriIds.length === 0 || !canWrite}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-center"
                            >
                                <i className="bi bi-check2-circle text-base sm:text-lg shrink-0"></i>
                                <span className="sm:hidden">{isSubmitting ? 'Menerapkan...' : `Terapkan Izin (${selectedSantriIds.length} Santri)`}</span>
                                <span className="hidden sm:inline">{isSubmitting ? 'Menerapkan ke Database...' : `Terapkan Izin untuk ${selectedSantriIds.length} Santri (${dateRangeList.length} Hari)`}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Bottom Section: Recent Dispensasi Records */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                            <i className="bi bi-clock-history text-teal-600"></i>
                            <span>Histori & Log Dispensasi Terakhir</span>
                        </h3>
                        <p className="text-xs text-gray-500">Daftar presensi santri yang memiliki catatan dispensasi dan izin.</p>
                    </div>
                    <div className="w-full sm:w-64 relative">
                        <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                        <input
                            type="text"
                            placeholder="Cari santri / alasan..."
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 font-bold border-y border-gray-200">
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Nama Santri</th>
                                <th className="p-3">Rombel</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Sesi</th>
                                <th className="p-3">Keterangan & Catatan</th>
                                <th className="p-3">Dicatat Oleh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentDispensasiRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">
                                        Belum ada riwayat dispensasi tercatat.
                                    </td>
                                </tr>
                            ) : (
                                recentDispensasiRecords.map(rec => {
                                    const santri = santriList.find(s => s.id === rec.santriId);
                                    const rombel = settings.rombel.find(r => r.id === rec.rombelId);
                                    return (
                                        <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-3 font-semibold text-gray-800 whitespace-nowrap">{rec.tanggal}</td>
                                            <td className="p-3 font-bold text-gray-900">{santri?.namaLengkap || 'Santri'}</td>
                                            <td className="p-3 text-gray-600 whitespace-nowrap">{rombel?.nama || '-'}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${rec.status === 'I' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                    {rec.status === 'I' ? 'IZIN' : 'SAKIT'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-600 whitespace-nowrap">{rec.sesi || 'KBM Pagi'}</td>
                                            <td className="p-3 text-gray-700 max-w-md">{rec.keterangan || '-'}</td>
                                            <td className="p-3 text-gray-500 whitespace-nowrap">{rec.recordedBy || 'System'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
