import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { db } from '../../db';
import { Santri, Kamar, GedungAsrama, KesehatanRecord, AbsensiRecord } from '../../types';
import { PindahKamarModal } from './PindahKamarModal';
import { LabelPintuKamarModal } from './LabelPintuKamarModal';

export const PenempatanMutasiSantri: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation, showAlert, currentUser, showToast } = useAppContext();
    const { santriList, onUpdateSantri } = useSantriContext();

    // Health & Attendance real-time data
    const [activeHealthRecords, setActiveHealthRecords] = useState<KesehatanRecord[]>([]);
    const [todayAbsensi, setTodayAbsensi] = useState<AbsensiRecord[]>([]);

    // Modals state
    const [pindahModalSantri, setPindahModalSantri] = useState<{
        santri: Santri;
        kamar: Kamar | null;
        gedung: GedungAsrama | null;
    } | null>(null);

    const [printDoorTagData, setPrintDoorTagData] = useState<{
        kamar: Kamar;
        gedung: GedungAsrama;
        penghuni: Santri[];
    } | null>(null);

    // Filters for room placement
    const [selectedGedungId, setSelectedGedungId] = useState<number | ''>('');
    const [filterKelasId, setFilterKelasId] = useState<string>('');
    const [searchUnassigned, setSearchUnassigned] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Multi-select for unassigned santri
    const [selectedUnassignedIds, setSelectedUnassignedIds] = useState<number[]>([]);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keasramaan === 'write';

    // Load health and absensi records for status badges
    useEffect(() => {
        let isMounted = true;
        const loadRealtimeStatus = async () => {
            try {
                const health = await db.kesehatanRecords
                    .filter(rec => !rec.deleted && rec.status !== 'Sembuh')
                    .toArray();
                
                const todayStr = new Date().toISOString().split('T')[0];
                const abs = await db.absensi
                    .where('tanggal')
                    .equals(todayStr)
                    .filter(rec => rec.status === 'I' || rec.status === 'S')
                    .toArray();

                if (isMounted) {
                    setActiveHealthRecords(health);
                    setTodayAbsensi(abs);
                }
            } catch (err) {
                console.error('Failed to load asrama health/absensi records:', err);
            }
        };

        loadRealtimeStatus();
        return () => {
            isMounted = false;
        };
    }, []);

    // Helper map of santri status
    const santriStatusMap = useMemo(() => {
        const map = new Map<number, { type: 'inap' | 'sakit' | 'izin'; label: string }>();
        
        activeHealthRecords.forEach(h => {
            if (h.status === 'Rawat Inap (Pondok)') {
                map.set(h.santriId, { type: 'inap', label: '🏥 Rawat Inap' });
            } else if (h.status === 'Rawat Jalan' || h.status === 'Rujuk RS/Klinik') {
                map.set(h.santriId, { type: 'sakit', label: '💊 Sakit' });
            }
        });

        todayAbsensi.forEach(a => {
            if (!map.has(a.santriId)) {
                if (a.status === 'I') {
                    map.set(a.santriId, { type: 'izin', label: '📋 Izin Pulang' });
                } else if (a.status === 'S') {
                    map.set(a.santriId, { type: 'sakit', label: '💊 Sakit' });
                }
            }
        });

        return map;
    }, [activeHealthRecords, todayAbsensi]);

    // Active unassigned santri
    const unassignedSantri = useMemo(() => {
        return santriList.filter(s => {
            if (s.status !== 'Aktif') return false;
            if (s.kamarId) return false;
            if (filterKelasId && s.rombelId !== Number(filterKelasId)) return false;
            if (searchUnassigned) {
                const q = searchUnassigned.toLowerCase();
                const matchName = s.namaLengkap.toLowerCase().includes(q);
                const matchNis = s.nis.toLowerCase().includes(q);
                if (!matchName && !matchNis) return false;
            }
            return true;
        });
    }, [santriList, filterKelasId, searchUnassigned]);

    // Global searched santri (all active santri)
    const globalSearchResults = useMemo(() => {
        if (!globalSearch.trim()) return [];
        const q = globalSearch.toLowerCase();
        return santriList
            .filter(s => s.status === 'Aktif' && (s.namaLengkap.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)))
            .slice(0, 10);
    }, [santriList, globalSearch]);

    // Rooms to display
    const displayedRooms = useMemo(() => {
        if (!selectedGedungId) return settings.kamar;
        return settings.kamar.filter(k => k.gedungId === selectedGedungId);
    }, [settings.kamar, selectedGedungId]);

    // Place selected unassigned santri into room
    const handlePlaceSantri = async (kamarId: number) => {
        if (!canWrite) {
            showAlert('Akses Ditolak', 'Anda tidak memiliki hak akses menulis.');
            return;
        }

        const targetKamar = settings.kamar.find(k => k.id === kamarId);
        const targetGedung = targetKamar ? settings.gedungAsrama.find(g => g.id === targetKamar.gedungId) : null;
        if (!targetKamar || !targetGedung) return;

        const currentPenghuniCount = santriList.filter(s => s.kamarId === targetKamar.id && s.status === 'Aktif').length;
        const availableSlots = targetKamar.kapasitas - currentPenghuniCount;

        if (availableSlots <= 0) {
            showAlert('Kamar Penuh', `Kamar ${targetKamar.nama} sudah penuh.`);
            return;
        }

        // Get santri to place
        let santriToPlace: Santri[] = [];
        if (selectedUnassignedIds.length > 0) {
            santriToPlace = santriList.filter(s => selectedUnassignedIds.includes(s.id));
        } else {
            showAlert('Pilih Santri', 'Pilih minimal satu santri dari daftar "Santri Tanpa Kamar" terlebih dahulu.');
            return;
        }

        // Gender check
        const targetGender = targetGedung.jenis === 'Putri' ? 'Perempuan' : 'Laki-laki';
        const invalidGender = santriToPlace.filter(s => s.jenisKelamin !== targetGender);
        if (invalidGender.length > 0) {
            showAlert('Gender Tidak Sesuai', `Santri ${invalidGender.map(s => s.namaLengkap).join(', ')} tidak sesuai dengan jenis asrama ${targetGedung.jenis}.`);
            return;
        }

        if (santriToPlace.length > availableSlots) {
            showAlert('Kapasitas Tidak Cukup', `Slot kamar hanya tersisa ${availableSlots} kasur, sedangkan santri yang dipilih ada ${santriToPlace.length} santri.`);
            return;
        }

        // Apply placement
        for (const s of santriToPlace) {
            await onUpdateSantri({ ...s, kamarId: targetKamar.id });
        }

        setSelectedUnassignedIds([]);
        showToast(`${santriToPlace.length} santri berhasil ditempatkan di ${targetKamar.nama}.`, 'success');
    };

    // Remove single santri from room
    const handleRemoveFromRoom = (santri: Santri) => {
        if (!canWrite) return;
        showConfirmation(
            `Keluarkan ${santri.namaLengkap}?`,
            'Santri ini akan dikeluarkan dari kamar dan berstatus Tanpa Kamar.',
            async () => {
                // If santri was ketua kamar, clear it from room
                if (santri.kamarId) {
                    const kamar = settings.kamar.find(k => k.id === santri.kamarId);
                    if (kamar && kamar.ketuaKamarId === santri.id) {
                        const updatedKamar = settings.kamar.map(k => (k.id === kamar.id ? { ...k, ketuaKamarId: undefined } : k));
                        await onSaveSettings({ ...settings, kamar: updatedKamar });
                    }
                }
                await onUpdateSantri({ ...santri, kamarId: undefined });
                showToast(`${santri.namaLengkap} dikeluarkan dari kamar.`, 'info');
            },
            { confirmColor: 'red' }
        );
    };

    // Bulk clear entire room
    const handleBulkClearRoom = (kamar: Kamar, occupants: Santri[]) => {
        if (!canWrite) return;
        if (occupants.length === 0) {
            showToast('Kamar sudah kosong.', 'info');
            return;
        }

        showConfirmation(
            `Kosongkan Kamar ${kamar.nama}?`,
            `Apakah Anda yakin ingin mengeluarkan seluruh (${occupants.length}) santri dari kamar ini? Data santri akan kembali berstatus Tanpa Kamar.`,
            async () => {
                // Clear ketua kamar
                const updatedKamar = settings.kamar.map(k => (k.id === kamar.id ? { ...k, ketuaKamarId: undefined } : k));
                await onSaveSettings({ ...settings, kamar: updatedKamar });

                // Remove kamarId from each occupant
                for (const occ of occupants) {
                    await onUpdateSantri({ ...occ, kamarId: undefined });
                }

                showToast(`Kamar ${kamar.nama} telah dikosongkan.`, 'success');
            },
            { confirmColor: 'red' }
        );
    };

    // Set / Unset Ketua Kamar
    const handleToggleKetuaKamar = async (kamar: Kamar, santriId: number) => {
        if (!canWrite) return;
        const newKetuaId = kamar.ketuaKamarId === santriId ? undefined : santriId;
        const updatedKamar = settings.kamar.map(k => (k.id === kamar.id ? { ...k, ketuaKamarId: newKetuaId } : k));
        await onSaveSettings({ ...settings, kamar: updatedKamar });
        showToast(newKetuaId ? 'Ketua Kamar (Rais Ghorfah) ditetapkan.' : 'Status Ketua Kamar dilepas.', 'success');
    };

    // Execute Move / Swap confirmation
    const handleExecutePindah = async (santri: Santri, targetKamarId: number) => {
        // If santri was ketua kamar in old room, clear it
        if (santri.kamarId) {
            const oldKamar = settings.kamar.find(k => k.id === santri.kamarId);
            if (oldKamar && oldKamar.ketuaKamarId === santri.id) {
                const updatedKamar = settings.kamar.map(k => (k.id === oldKamar.id ? { ...k, ketuaKamarId: undefined } : k));
                await onSaveSettings({ ...settings, kamar: updatedKamar });
            }
        }
        await onUpdateSantri({ ...santri, kamarId: targetKamarId });
        const targetKamar = settings.kamar.find(k => k.id === targetKamarId);
        showToast(`${santri.namaLengkap} berhasil dipindahkan ke ${targetKamar?.nama || 'kamar tujuan'}.`, 'success');
    };

    return (
        <div className="space-y-6">
            {/* Top Toolbar: Global Search Santri */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                            <i className="bi bi-search"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-gray-900">Pencarian Cepat Lokasi Kamar Santri</h3>
                            <p className="text-xs text-gray-500">Ketik nama santri atau NIS untuk cek lokasi kamar &amp; pindah cepat</p>
                        </div>
                    </div>
                    <div className="w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="Cari santri siapa saja..."
                            value={globalSearch}
                            onChange={e => setGlobalSearch(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                </div>

                {/* Global Search Results Dropdown/Box */}
                {globalSearchResults.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 divide-y divide-gray-100">
                        {globalSearchResults.map(s => {
                            const currentKamar = settings.kamar.find(k => k.id === s.kamarId);
                            const currentGedung = currentKamar ? settings.gedungAsrama.find(g => g.id === currentKamar.gedungId) : null;
                            const statusInfo = santriStatusMap.get(s.id);

                            return (
                                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-900 font-bold flex items-center justify-center text-[10px]">
                                            {s.namaLengkap.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">{s.namaLengkap}</span>
                                                <span className="text-[10px] text-gray-500 font-mono">({s.nis})</span>
                                                {statusInfo && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                                        statusInfo.type === 'inap' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                                                    }`}>
                                                        {statusInfo.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500">
                                                {currentKamar ? (
                                                    <span className="text-teal-800 font-semibold">
                                                        <i className="bi bi-door-closed mr-1"></i> {currentGedung?.nama} &bull; {currentKamar.nama}
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-600 font-semibold">
                                                        <i className="bi bi-exclamation-circle mr-1"></i> Belum Memiliki Kamar
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {canWrite && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPindahModalSantri({ santri: s, kamar: currentKamar || null, gedung: currentGedung || null })}
                                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <i className="bi bi-arrow-left-right mr-1"></i> {currentKamar ? 'Pindah' : 'Tempatkan'}
                                            </button>
                                            {currentKamar && (
                                                <button
                                                    onClick={() => handleRemoveFromRoom(s)}
                                                    className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                                    title="Keluarkan dari Kamar"
                                                >
                                                    <i className="bi bi-x-circle"></i>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Main Split Layout: Left Unassigned, Right Room Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Panel: Santri Tanpa Kamar (1 Col) */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                        <div>
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <i className="bi bi-person-x text-rose-500 text-base"></i> Santri Tanpa Kamar
                            </h3>
                            <p className="text-[11px] text-gray-500">Pilih santri untuk ditempatkan ke kamar.</p>
                        </div>
                        <span className="text-xs font-black px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full">
                            {unassignedSantri.length} Santri
                        </span>
                    </div>

                    {/* Filter Kelas & Search */}
                    <div className="space-y-2">
                        <select
                            value={filterKelasId}
                            onChange={e => setFilterKelasId(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                        >
                            <option value="">Semua Rombel / Kelas</option>
                            {settings.rombel.map(r => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Filter nama / NIS..."
                            value={searchUnassigned}
                            onChange={e => setSearchUnassigned(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                        />
                    </div>

                    {/* Selection Controls */}
                    {unassignedSantri.length > 0 && (
                        <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                                <input
                                    type="checkbox"
                                    checked={selectedUnassignedIds.length === unassignedSantri.length && unassignedSantri.length > 0}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setSelectedUnassignedIds(unassignedSantri.map(s => s.id));
                                        } else {
                                            setSelectedUnassignedIds([]);
                                        }
                                    }}
                                    className="rounded text-teal-600 focus:ring-teal-500"
                                />
                                <span>Pilih Semua ({selectedUnassignedIds.length} dipilih)</span>
                            </label>
                            {selectedUnassignedIds.length > 0 && (
                                <button
                                    onClick={() => setSelectedUnassignedIds([])}
                                    className="text-rose-600 hover:underline font-medium"
                                >
                                    Batal Pilih
                                </button>
                            )}
                        </div>
                    )}

                    {/* Scrollable Santri List */}
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
                        {unassignedSantri.map(s => {
                            const isSelected = selectedUnassignedIds.includes(s.id);
                            const rombel = settings.rombel.find(r => r.id === s.rombelId);
                            const statusInfo = santriStatusMap.get(s.id);

                            return (
                                <div
                                    key={s.id}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedUnassignedIds(ids => ids.filter(id => id !== s.id));
                                        } else {
                                            setSelectedUnassignedIds(ids => [...ids, s.id]);
                                        }
                                    }}
                                    className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                        isSelected ? 'bg-teal-50 border-l-4 border-teal-600' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}} // handled by div click
                                            className="rounded text-teal-600 focus:ring-teal-500"
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-gray-900">{s.namaLengkap}</span>
                                                <span className={`text-[9px] font-bold px-1 rounded ${
                                                    s.jenisKelamin === 'Perempuan' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {s.jenisKelamin === 'Perempuan' ? 'Pi' : 'Pa'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-mono">
                                                NIS: {s.nis} &bull; {rombel?.nama || 'Tanpa Kelas'}
                                            </p>
                                        </div>
                                    </div>
                                    {statusInfo && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                            statusInfo.type === 'inap' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                                        }`}>
                                            {statusInfo.label}
                                        </span>
                                    )}
                                </div>
                            );
                        })}

                        {unassignedSantri.length === 0 && (
                            <div className="p-8 text-center text-gray-500 text-xs">
                                <i className="bi bi-check2-circle text-2xl text-emerald-500 block mb-1"></i>
                                Semua santri telah mendapatkan kamar asrama.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Room Cards & Placement (2 Cols) */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filter Gedung */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600">Pilih Gedung:</span>
                            <div className="flex gap-1.5 flex-wrap">
                                <button
                                    onClick={() => setSelectedGedungId('')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        selectedGedungId === '' ? 'bg-teal-800 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Semua Gedung
                                </button>
                                {settings.gedungAsrama.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setSelectedGedungId(g.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                            selectedGedungId === g.id
                                                ? 'bg-teal-800 text-white shadow-xs'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {g.nama} ({g.jenis})
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedUnassignedIds.length > 0 && (
                            <div className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 flex items-center gap-1.5">
                                <i className="bi bi-info-circle-fill text-teal-600"></i>
                                <span>{selectedUnassignedIds.length} santri siap ditempatkan</span>
                            </div>
                        )}
                    </div>

                    {/* Room Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedRooms.map(kamar => {
                            const gedung = settings.gedungAsrama.find(g => g.id === kamar.gedungId);
                            const musyrif = settings.tenagaPengajar.find(tp => tp.id === kamar.musyrifId);
                            const occupants = santriList.filter(s => s.kamarId === kamar.id && s.status === 'Aktif');
                            const isFull = occupants.length >= kamar.kapasitas;
                            const sisaKasur = Math.max(0, kamar.kapasitas - occupants.length);
                            const percent = kamar.kapasitas > 0 ? (occupants.length / kamar.kapasitas) * 100 : 0;

                            return (
                                <div
                                    key={kamar.id}
                                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col justify-between"
                                >
                                    {/* Card Header */}
                                    <div className="p-4 bg-gray-50/70 border-b border-gray-100">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-extrabold text-sm text-gray-900">{kamar.nama}</h4>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                        gedung?.jenis === 'Putri' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {gedung?.nama}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Musyrif: {musyrif?.nama || 'Belum diatur'} &bull; {kamar.lantai || 'Lantai 1'}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                                    isFull
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : sisaKasur <= 2
                                                        ? 'bg-amber-100 text-amber-900'
                                                        : 'bg-teal-100 text-teal-900'
                                                }`}>
                                                    {occupants.length} / {kamar.kapasitas} Kasur
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3 overflow-hidden">
                                            <div
                                                className={`h-1.5 rounded-full ${
                                                    isFull ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-teal-600'
                                                }`}
                                                style={{ width: `${Math.min(100, percent)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Occupants List */}
                                    <div className="p-3.5 space-y-2 flex-1 max-h-56 overflow-y-auto divide-y divide-gray-50">
                                        {occupants.map((s, idx) => {
                                            const isRais = s.id === kamar.ketuaKamarId;
                                            const statusInfo = santriStatusMap.get(s.id);
                                            const rombel = settings.rombel.find(r => r.id === s.rombelId);

                                            return (
                                                <div key={s.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-400 font-mono text-[10px] w-4">{idx + 1}.</span>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-semibold text-gray-900">{s.namaLengkap}</span>
                                                                {isRais && (
                                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[9px] font-bold rounded" title="Ketua Kamar">
                                                                        <i className="bi bi-star-fill text-[8px] text-amber-600"></i> Rais
                                                                    </span>
                                                                )}
                                                                {statusInfo && (
                                                                    <span className={`text-[9px] font-bold px-1 rounded ${
                                                                        statusInfo.type === 'inap' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                                                                    }`}>
                                                                        {statusInfo.label}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-gray-500 font-mono">
                                                                NIS: {s.nis} &bull; {rombel?.nama || '-'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {canWrite && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleToggleKetuaKamar(kamar, s.id)}
                                                                className={`p-1 rounded text-xs transition-colors ${
                                                                    isRais ? 'text-amber-600 hover:bg-amber-50' : 'text-gray-300 hover:text-amber-500'
                                                                }`}
                                                                title={isRais ? 'Lepas Jabatan Ketua Kamar' : 'Tunjuk sebagai Ketua Kamar (Rais Ghorfah)'}
                                                            >
                                                                <i className="bi bi-star-fill"></i>
                                                            </button>
                                                            <button
                                                                onClick={() => setPindahModalSantri({ santri: s, kamar, gedung: gedung || null })}
                                                                className="p-1 text-gray-400 hover:text-teal-700 rounded transition-colors"
                                                                title="Pindah / Mutasi Kamar"
                                                            >
                                                                <i className="bi bi-arrow-left-right"></i>
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveFromRoom(s)}
                                                                className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                                                title="Keluarkan dari Kamar"
                                                            >
                                                                <i className="bi bi-x-circle"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {occupants.length === 0 && (
                                            <div className="py-6 text-center text-gray-400 text-xs italic">
                                                Kamar masih kosong ({sisaKasur} slot tersedia).
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer: Quick Actions */}
                                    <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                                        <button
                                            onClick={() => setPrintDoorTagData({ kamar, gedung: gedung!, penghuni: occupants })}
                                            className="text-teal-700 hover:text-teal-900 font-bold inline-flex items-center gap-1 text-[11px]"
                                        >
                                            <i className="bi bi-printer"></i> Cetak Label
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {canWrite && occupants.length > 0 && (
                                                <button
                                                    onClick={() => handleBulkClearRoom(kamar, occupants)}
                                                    className="text-gray-400 hover:text-rose-600 text-[11px] font-semibold"
                                                    title="Kosongkan Seluruh Penghuni Kamar"
                                                >
                                                    Kosongkan
                                                </button>
                                            )}

                                            {canWrite && (
                                                <button
                                                    onClick={() => handlePlaceSantri(kamar.id)}
                                                    disabled={isFull || selectedUnassignedIds.length === 0}
                                                    className="px-3 py-1 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs transition-colors"
                                                >
                                                    <i className="bi bi-plus-lg"></i> Tempatkan
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {pindahModalSantri && (
                <PindahKamarModal
                    isOpen={!!pindahModalSantri}
                    onClose={() => setPindahModalSantri(null)}
                    santri={pindahModalSantri.santri}
                    currentKamar={pindahModalSantri.kamar}
                    currentGedung={pindahModalSantri.gedung}
                    allKamar={settings.kamar}
                    allGedung={settings.gedungAsrama}
                    santriList={santriList}
                    onConfirmPindah={handleExecutePindah}
                />
            )}

            {printDoorTagData && (
                <LabelPintuKamarModal
                    isOpen={!!printDoorTagData}
                    onClose={() => setPrintDoorTagData(null)}
                    kamar={printDoorTagData.kamar}
                    gedung={printDoorTagData.gedung}
                    penghuni={printDoorTagData.penghuni}
                    settings={settings}
                />
            )}
        </div>
    );
};
