
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { TahfizhRecord } from '../../types';
import { QURAN_DATA } from '../../data/quran';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';

export const TahfizhInput: React.FC = () => {
    const { settings, showToast, currentUser } = useAppContext();
    const { santriList, tahfizhList, onSaveTahfizh } = useSantriContext();
    
    // --- STATE ---
    const [santriId, setSantriId] = useState<number>(0);
    const [searchSantri, setSearchSantri] = useState('');
    const [isSantriPickerOpen, setIsSantriPickerOpen] = useState(false);
    
    // Filters
    const [filterJenjang, setFilterJenjang] = useState<number>(0);
    const [filterKelas, setFilterKelas] = useState<number>(0);
    const [filterRombel, setFilterRombel] = useState<number>(0);

    const [tipe, setTipe] = useState<TahfizhRecord['tipe']>('Ziyadah');
    const [juz, setJuz] = useState<number>(30); // Default Juz 30
    const [surahIndex, setSurahIndex] = useState<number>(77); // Default An-Naba (Index 77 in 0-based array is 78-AnNaba)
    const [ayatStart, setAyatStart] = useState<number>(1);
    const [ayatEnd, setAyatEnd] = useState<number>(5);
    const [predikat, setPredikat] = useState<TahfizhRecord['predikat']>('Lancar');
    const [catatan, setCatatan] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // --- DERIVED DATA ---
    // Filter Cascading Options
    const availableKelas = useMemo(() => {
        if (!filterJenjang) return [];
        return settings.kelas.filter(k => k.jenjangId === filterJenjang);
    }, [filterJenjang, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (!filterKelas) return [];
        return settings.rombel.filter(r => r.kelasId === filterKelas);
    }, [filterKelas, settings.rombel]);

    const filteredSantri = useMemo(() => {
        return santriList
            .filter(s => {
                // Status Filter
                if (s.status !== 'Aktif') return false;
                
                // Search Filter
                if (searchSantri) {
                    const lower = searchSantri.toLowerCase();
                    if (!s.namaLengkap.toLowerCase().includes(lower) && !s.nis.includes(lower)) return false;
                }

                // Dropdown Filters
                if (filterJenjang && s.jenjangId !== filterJenjang) return false;
                if (filterKelas && s.kelasId !== filterKelas) return false;
                if (filterRombel && s.rombelId !== filterRombel) return false;

                return true;
            })
            .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [santriList, searchSantri, filterJenjang, filterKelas, filterRombel]);

    const selectedSantri = useMemo(() => santriList.find(s => s.id === santriId), [santriList, santriId]);
    const currentSurah = QURAN_DATA[surahIndex];
    const selectedSantriRecentRecords = useMemo(() => {
        if (!santriId) return [];
        return tahfizhList
            .filter(record => record.santriId === santriId)
            .sort((a, b) => {
                const byDate = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
                if (byDate !== 0) return byDate;
                return b.id - a.id;
            })
            .slice(0, 3);
    }, [tahfizhList, santriId]);
    const ayatValidationWarning = useMemo(() => {
        if (ayatStart < 1) return 'Ayat mulai minimal 1.';
        if (ayatStart > currentSurah.ayat) return `Ayat mulai melebihi total ayat surah (${currentSurah.ayat}).`;
        if (ayatEnd < ayatStart) return 'Ayat akhir tidak boleh lebih kecil dari ayat mulai.';
        if (ayatEnd > currentSurah.ayat) return `Ayat akhir melebihi total ayat surah (${currentSurah.ayat}).`;
        return null;
    }, [ayatStart, ayatEnd, currentSurah]);
    const quickRangeSizes = [3, 5, 10];

    // --- HANDLERS ---
    const persistTahfizhRecord = async (): Promise<boolean> => {
        if (!santriId) {
            showToast('Pilih santri terlebih dahulu.', 'error');
            return false;
        }
        if (ayatValidationWarning) {
            showToast(ayatValidationWarning, 'error');
            return false;
        }

        setIsSaving(true);
        try {
            const newRecord: TahfizhRecord = {
                id: Date.now(),
                santriId,
                tanggal: new Date().toISOString().split('T')[0],
                tipe,
                juz,
                surah: currentSurah.name,
                ayatAwal: ayatStart,
                ayatAkhir: ayatEnd,
                predikat,
                catatan,
                muhaffizhId: currentUser?.id 
            };

            await onSaveTahfizh(newRecord);
            showToast('Setoran berhasil disimpan!', 'success');
            return true;
        } catch (error) {
            showToast('Gagal menyimpan.', 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const applyPostSaveState = (resetSantri: boolean) => {
        if (resetSantri) {
            setSantriId(0);
            setSearchSantri('');
        }
        if (ayatEnd < currentSurah.ayat) {
            setAyatStart(ayatEnd + 1);
            setAyatEnd(Math.min(ayatEnd + 5, currentSurah.ayat));
        } else if (surahIndex < 113) {
            setSurahIndex(surahIndex + 1);
            setAyatStart(1);
            setAyatEnd(5);
        }
        setCatatan('');
    };

    const handleSave = async (resetSantri: boolean) => {
        const isSaved = await persistTahfizhRecord();
        if (!isSaved) return;
        applyPostSaveState(resetSantri);
    };

    const handleSaveAndNextSantri = async () => {
        if (!santriId) {
            showToast('Pilih santri terlebih dahulu.', 'error');
            return;
        }
        const currentIndex = filteredSantri.findIndex(s => s.id === santriId);
        if (currentIndex < 0 || currentIndex === filteredSantri.length - 1) {
            showToast('Santri berikutnya tidak tersedia pada filter saat ini.', 'info');
            return;
        }
        const isSaved = await persistTahfizhRecord();
        if (!isSaved) return;
        applyPostSaveState(false);
        setSantriId(filteredSantri[currentIndex + 1].id);
        showToast('Berhasil simpan. Berpindah ke santri berikutnya.', 'success');
    };

    const handleQuickRange = (rangeSize: number) => {
        const normalizedStart = Math.max(1, Math.min(ayatStart, currentSurah.ayat));
        setAyatStart(normalizedStart);
        setAyatEnd(Math.min(currentSurah.ayat, normalizedStart + rangeSize - 1));
    };

    const PredikatButton: React.FC<{ value: TahfizhRecord['predikat'], label: string, color: string }> = ({ value, label, color }) => (
        <button
            onClick={() => setPredikat(value)}
            className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold border-2 transition-all ${
                predikat === value 
                ? `bg-${color}-600 text-white border-${color}-600 shadow-md transform scale-105` 
                : `bg-white text-gray-600 border-gray-200 hover:border-${color}-300 hover:bg-${color}-50`
            }`}
        >
            {label}
        </button>
    );

    const handleResetSantriFilter = () => {
        setSearchSantri('');
        setFilterJenjang(0);
        setFilterKelas(0);
        setFilterRombel(0);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full pb-24 lg:pb-0">
            {/* LEFT COLUMN: SANTRI SELECTION */}
            <div className="hidden lg:flex lg:col-span-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex-col h-[calc(100vh-140px)]">
                <div className="mb-4 space-y-3">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <i className="bi bi-people-fill text-teal-600"></i> Pilih Santri
                    </h3>
                    
                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-2">
                        <select 
                            value={filterJenjang} 
                            onChange={(e) => { setFilterJenjang(Number(e.target.value)); setFilterKelas(0); setFilterRombel(0); }} 
                            className="bg-gray-50 border border-gray-300 text-xs rounded-lg p-2"
                        >
                            <option value={0}>Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                        <select 
                            value={filterKelas} 
                            onChange={(e) => { setFilterKelas(Number(e.target.value)); setFilterRombel(0); }} 
                            disabled={!filterJenjang}
                            className="bg-gray-50 border border-gray-300 text-xs rounded-lg p-2 disabled:bg-gray-100"
                        >
                            <option value={0}>Semua Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <select 
                        value={filterRombel} 
                        onChange={(e) => setFilterRombel(Number(e.target.value))} 
                        disabled={!filterKelas}
                        className="w-full bg-gray-50 border border-gray-300 text-xs rounded-lg p-2 disabled:bg-gray-100"
                    >
                        <option value={0}>Semua Rombel</option>
                        {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                    </select>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Cari nama / NIS..."
                            value={searchSantri}
                            onChange={(e) => setSearchSantri(e.target.value)}
                            className="w-full p-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                        />
                        <i className="bi bi-search absolute left-3 top-2.5 text-gray-400"></i>
                    </div>
                </div>
                
                {/* Scrollable List */}
                <div className="flex-grow overflow-y-auto border rounded-lg bg-gray-50 custom-scrollbar max-h-[300px] lg:max-h-none">
                    {filteredSantri.length > 0 ? (
                        <div className="divide-y">
                            {filteredSantri.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setSantriId(s.id)}
                                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${santriId === s.id ? 'bg-teal-100 border-l-4 border-teal-600' : 'hover:bg-white'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${santriId === s.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-300'}`}>
                                        {s.namaLengkap.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-bold text-sm truncate ${santriId === s.id ? 'text-teal-900' : 'text-gray-700'}`}>{s.namaLengkap}</p>
                                        <p className="text-xs text-gray-500 truncate">{settings.rombel.find(r=>r.id === s.rombelId)?.nama || 'Tanpa Kelas'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            <i className="bi bi-search text-2xl mb-2 block opacity-50"></i>
                            Tidak ada data
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: FORM INPUT */}
            <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="lg:hidden bg-white p-3 rounded-xl shadow-sm border border-gray-200 space-y-3">
                    <button
                        onClick={() => setIsSantriPickerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <i className="bi bi-people-fill"></i>
                        <span>{selectedSantri ? 'Ganti Santri' : 'Pilih Santri'}</span>
                    </button>
                    <p className="text-[11px] text-gray-500">
                        {selectedSantri
                            ? `Terpilih: ${selectedSantri.namaLengkap} • ${settings.rombel.find(r => r.id === selectedSantri.rombelId)?.nama || 'Tanpa Kelas'}`
                            : 'Belum ada santri terpilih.'}
                    </p>
                </div>

                 {/* Selected Santri Info Banner (Mobile mainly, but nice on desktop too) */}
                 {selectedSantri ? (
                    <div className="bg-teal-600 text-white p-4 rounded-xl shadow-md flex justify-between items-center animate-fade-in-down">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold border border-white/30">
                                {selectedSantri.namaLengkap.charAt(0)}
                            </div>
                            <div>
                                <h2 className="font-bold text-lg leading-tight">{selectedSantri.namaLengkap}</h2>
                                <p className="text-teal-100 text-xs">NIS: {selectedSantri.nis} • {settings.rombel.find(r=>r.id === selectedSantri.rombelId)?.nama}</p>
                            </div>
                        </div>
                        <button onClick={() => setSantriId(0)} className="lg:hidden text-white/80 hover:text-white"><i className="bi bi-x-lg text-xl"></i></button>
                     </div>
                 ) : (
                     <div className="bg-gray-100 border-2 border-dashed border-gray-300 p-6 rounded-xl text-center text-gray-500 hidden lg:block">
                         <i className="bi bi-arrow-left-circle text-2xl mb-2 block"></i>
                         Pilih santri dari daftar di sebelah kiri untuk mulai menginput hafalan.
                     </div>
                 )}

                {selectedSantri && (
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-gray-700">Riwayat Ringkas Santri Ini</h3>
                            <span className="text-[11px] text-gray-500">{selectedSantriRecentRecords.length} terbaru</span>
                        </div>
                        {selectedSantriRecentRecords.length > 0 ? (
                            <div className="space-y-2">
                                {selectedSantriRecentRecords.map(record => (
                                    <div key={record.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-700">
                                                {record.tanggal} • {record.tipe} • QS. {record.surah}
                                            </p>
                                            <p className="text-[11px] text-gray-500">Ayat {record.ayatAwal}-{record.ayatAkhir} • {record.predikat}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 italic">Belum ada riwayat setoran untuk santri ini.</p>
                        )}
                    </div>
                )}

                <div className={`space-y-4 ${!selectedSantri ? 'opacity-50 pointer-events-none lg:pointer-events-auto lg:opacity-100' : ''}`}>
                    {/* Jenis Setoran */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Jenis Setoran</label>
                        <div className="flex gap-3">
                            {(['Ziyadah', 'Murojaah', 'Tasmi\''] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTipe(t)}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${
                                        tipe === t 
                                        ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-200' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Detail Hafalan */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Detail Hafalan</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Juz</label>
                                    <select value={juz} onChange={(e) => setJuz(Number(e.target.value))} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500">
                                        {Array.from({length: 30}, (_, i) => 30 - i).map(j => (
                                            <option key={j} value={j}>Juz {j}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Surah</label>
                                    <select value={surahIndex} onChange={(e) => setSurahIndex(Number(e.target.value))} className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500">
                                        {QURAN_DATA.map((s, idx) => (
                                            <option key={idx} value={idx}>{s.number}. {s.name} ({s.ayat} ayat)</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex flex-col justify-end">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Rentang Ayat</label>
                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <button onClick={() => setAyatStart(Math.max(1, ayatStart - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-l border border-r-0 hover:bg-gray-100 text-teal-700"><i className="bi bi-dash"></i></button>
                                            <input type="number" value={ayatStart} onChange={(e) => setAyatStart(Number(e.target.value))} className="w-full h-8 border-y text-center font-bold text-gray-800 text-sm focus:outline-none" />
                                            <button onClick={() => setAyatStart(Math.min(currentSurah.ayat, ayatStart + 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-r border border-l-0 hover:bg-gray-100 text-teal-700"><i className="bi bi-plus"></i></button>
                                        </div>
                                        <div className="text-[9px] text-center text-gray-500 mt-1">Mulai</div>
                                    </div>
                                    <span className="text-gray-400 font-bold"><i className="bi bi-arrow-right"></i></span>
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <button onClick={() => setAyatEnd(Math.max(ayatStart, ayatEnd - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-l border border-r-0 hover:bg-gray-100 text-teal-700"><i className="bi bi-dash"></i></button>
                                            <input type="number" value={ayatEnd} onChange={(e) => setAyatEnd(Number(e.target.value))} className="w-full h-8 border-y text-center font-bold text-gray-800 text-sm focus:outline-none" />
                                            <button onClick={() => setAyatEnd(Math.min(currentSurah.ayat, ayatEnd + 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-r border border-l-0 hover:bg-gray-100 text-teal-700"><i className="bi bi-plus"></i></button>
                                        </div>
                                        <div className="text-[9px] text-center text-gray-500 mt-1">Sampai</div>
                                    </div>
                                </div>
                                <div className="text-right text-[10px] text-gray-500 mt-1">
                                    Total: {currentSurah.ayat} Ayat
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {quickRangeSizes.map(size => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => handleQuickRange(size)}
                                            className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100"
                                        >
                                            Set {size} Ayat
                                        </button>
                                    ))}
                                </div>
                                {ayatValidationWarning && (
                                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                        <i className="bi bi-exclamation-triangle-fill mr-1"></i>
                                        {ayatValidationWarning}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Penilaian */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Penilaian & Catatan</label>
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                            <PredikatButton value="Sangat Lancar" label="Mumtaz (A)" color="green" />
                            <PredikatButton value="Lancar" label="Jayyid (B)" color="blue" />
                            <PredikatButton value="Kurang Lancar" label="Maqbul (C)" color="yellow" />
                            <PredikatButton value="Belum Lulus" label="Rosib (D)" color="red" />
                        </div>
                        <textarea
                            rows={2}
                            placeholder="Catatan ustadz/ustadzah (opsional)..."
                            value={catatan}
                            onChange={(e) => setCatatan(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                        ></textarea>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-3">
                        <button
                            onClick={() => handleSave(true)}
                            disabled={isSaving || !santriId}
                            className="py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm disabled:opacity-50"
                        >
                            Simpan & Ganti Santri
                        </button>
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving || !santriId}
                            className="py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:shadow-none disabled:transform-none"
                        >
                            {isSaving ? 'Menyimpan...' : <><i className="bi bi-check-circle-fill"></i> Simpan Setoran</>}
                        </button>
                        <button
                            onClick={handleSaveAndNextSantri}
                            disabled={isSaving || !santriId}
                            className="py-3 bg-blue-600 text-white font-bold rounded-xl shadow hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-400"
                        >
                            <i className="bi bi-skip-forward-fill"></i> Setoran Berikutnya
                        </button>
                    </div>
                </div>
            </div>

            <MobileFilterDrawer
                isOpen={isSantriPickerOpen}
                onClose={() => setIsSantriPickerOpen(false)}
                title="Pilih Santri Tahfizh"
                onReset={handleResetSantriFilter}
                onApply={() => setIsSantriPickerOpen(false)}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={filterJenjang}
                            onChange={(e) => { setFilterJenjang(Number(e.target.value)); setFilterKelas(0); setFilterRombel(0); }}
                            className="bg-gray-50 border border-gray-300 text-xs rounded-lg p-3"
                        >
                            <option value={0}>Semua Jenjang</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                        <select
                            value={filterKelas}
                            onChange={(e) => { setFilterKelas(Number(e.target.value)); setFilterRombel(0); }}
                            disabled={!filterJenjang}
                            className="bg-gray-50 border border-gray-300 text-xs rounded-lg p-3 disabled:bg-gray-100"
                        >
                            <option value={0}>Semua Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <select
                        value={filterRombel}
                        onChange={(e) => setFilterRombel(Number(e.target.value))}
                        disabled={!filterKelas}
                        className="w-full bg-gray-50 border border-gray-300 text-xs rounded-lg p-3 disabled:bg-gray-100"
                    >
                        <option value={0}>Semua Rombel</option>
                        {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                    </select>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Cari nama / NIS..."
                            value={searchSantri}
                            onChange={(e) => setSearchSantri(e.target.value)}
                            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                        />
                        <i className="bi bi-search absolute left-3 top-3.5 text-gray-400"></i>
                    </div>
                </div>

                <div className="mt-2 max-h-[42vh] overflow-y-auto border rounded-lg bg-gray-50 custom-scrollbar">
                    {filteredSantri.length > 0 ? (
                        <div className="divide-y">
                            {filteredSantri.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setSantriId(s.id); setIsSantriPickerOpen(false); }}
                                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${santriId === s.id ? 'bg-teal-100 border-l-4 border-teal-600' : 'hover:bg-white'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${santriId === s.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-300'}`}>
                                        {s.namaLengkap.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-bold text-sm truncate ${santriId === s.id ? 'text-teal-900' : 'text-gray-700'}`}>{s.namaLengkap}</p>
                                        <p className="text-xs text-gray-500 truncate">{settings.rombel.find(r => r.id === s.rombelId)?.nama || 'Tanpa Kelas'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            <i className="bi bi-search text-2xl mb-2 block opacity-50"></i>
                            Tidak ada data
                        </div>
                    )}
                </div>
            </MobileFilterDrawer>

            {/* Mobile Bottom Action Bar (Only shows when scrolled) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-50">
                 <button
                    onClick={() => handleSave(false)}
                    disabled={isSaving || !santriId}
                    className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 disabled:bg-gray-400"
                >
                    {isSaving ? 'Menyimpan...' : <><i className="bi bi-save"></i> Simpan</>}
                </button>
            </div>
        </div>
    );
};
