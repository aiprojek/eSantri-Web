import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { KelompokHalaqah, Santri } from '../../types';

export const TahfizhHalaqahManager: React.FC = () => {
    const { settings, onUpdateSettings, showToast, showConfirmation, currentUser } = useAppContext();
    const { santriList, onBulkUpdateSantri, onUpdateSantri } = useSantriContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedHalaqah, setSelectedHalaqah] = useState<KelompokHalaqah | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

    // Form State
    const [formNama, setFormNama] = useState('');
    const [formMuhaffizhId, setFormMuhaffizhId] = useState<number>(0);
    const [formTargetJuz, setFormTargetJuz] = useState<number>(30);
    const [formLokasi, setFormLokasi] = useState('');
    const [formKeterangan, setFormKeterangan] = useState('');

    // Member Assignment Modal State
    const [memberSearch, setMemberSearch] = useState('');
    const [memberFilterJenjang, setMemberFilterJenjang] = useState<number>(0);
    const [memberFilterKelas, setMemberFilterKelas] = useState<number>(0);
    const [memberFilterRombel, setMemberFilterRombel] = useState<number>(0);
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);

    // Available Kelas & Rombel for Member Assignment Modal
    const availableKelasForModal = useMemo(() => {
        if (!memberFilterJenjang) return settings.kelas || [];
        return (settings.kelas || []).filter(k => k.jenjangId === memberFilterJenjang);
    }, [memberFilterJenjang, settings.kelas]);

    const availableRombelForModal = useMemo(() => {
        if (memberFilterKelas) {
            return (settings.rombel || []).filter(r => r.kelasId === memberFilterKelas);
        }
        if (memberFilterJenjang) {
            const kelasIds = availableKelasForModal.map(k => k.id);
            return (settings.rombel || []).filter(r => kelasIds.includes(r.kelasId));
        }
        return settings.rombel || [];
    }, [memberFilterKelas, memberFilterJenjang, availableKelasForModal, settings.rombel]);

    const halaqahList: KelompokHalaqah[] = useMemo(() => {
        return settings.kelompokHalaqah || [];
    }, [settings.kelompokHalaqah]);

    const canEdit = currentUser?.role === 'admin' || currentUser?.permissions?.tahfizh === 'write' || currentUser?.permissions?.datamaster === 'write';

    // Santri map for fast lookup
    const santriByHalaqah = useMemo(() => {
        const map: { [halaqahId: number]: Santri[] } = {};
        santriList.forEach((s) => {
            if (s.status === 'Aktif' && s.halaqahId) {
                if (!map[s.halaqahId]) map[s.halaqahId] = [];
                map[s.halaqahId].push(s);
            }
        });
        return map;
    }, [santriList]);

    const unassignedSantri = useMemo(() => {
        return santriList.filter(s => s.status === 'Aktif' && !s.halaqahId);
    }, [santriList]);

    const filteredHalaqah = useMemo(() => {
        return halaqahList.filter((h) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const muhaffizh = settings.tenagaPengajar?.find(t => t.id === h.muhaffizhId)?.nama || '';
            return (
                h.nama.toLowerCase().includes(q) ||
                muhaffizh.toLowerCase().includes(q) ||
                (h.lokasi && h.lokasi.toLowerCase().includes(q))
            );
        });
    }, [halaqahList, searchQuery, settings.tenagaPengajar]);

    // Open Form for Create
    const handleOpenCreate = () => {
        setSelectedHalaqah(null);
        setFormNama('');
        setFormMuhaffizhId(settings.tenagaPengajar?.[0]?.id || 0);
        setFormTargetJuz(30);
        setFormLokasi('Masjid Utama Pondok');
        setFormKeterangan('Setoran harian Ba\'da Shubuh & Ba\'da Ashar');
        setIsFormOpen(true);
    };

    // Open Form for Edit
    const handleOpenEdit = (h: KelompokHalaqah) => {
        setSelectedHalaqah(h);
        setFormNama(h.nama);
        setFormMuhaffizhId(h.muhaffizhId || 0);
        setFormTargetJuz(h.targetJuz || 30);
        setFormLokasi(h.lokasi || '');
        setFormKeterangan(h.keterangan || '');
        setIsFormOpen(true);
    };

    // Save Halaqah (Create or Update)
    const handleSaveHalaqah = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formNama.trim()) {
            showToast('Nama kelompok halaqah wajib diisi.', 'error');
            return;
        }

        const currentList = [...(settings.kelompokHalaqah || [])];
        let updatedList: KelompokHalaqah[];

        if (selectedHalaqah) {
            // Edit existing
            updatedList = currentList.map((item) => {
                if (item.id === selectedHalaqah.id) {
                    return {
                        ...item,
                        nama: formNama.trim(),
                        muhaffizhId: formMuhaffizhId ? Number(formMuhaffizhId) : undefined,
                        targetJuz: Number(formTargetJuz),
                        lokasi: formLokasi.trim(),
                        keterangan: formKeterangan.trim(),
                    };
                }
                return item;
            });
            showToast(`Kelompok halaqah "${formNama}" berhasil diperbarui.`, 'success');
        } else {
            // Create new
            const newId = Date.now();
            const newHalaqah: KelompokHalaqah = {
                id: newId,
                nama: formNama.trim(),
                muhaffizhId: formMuhaffizhId ? Number(formMuhaffizhId) : undefined,
                targetJuz: Number(formTargetJuz),
                lokasi: formLokasi.trim(),
                keterangan: formKeterangan.trim(),
                santriIds: []
            };
            updatedList = [...currentList, newHalaqah];
            showToast(`Kelompok halaqah "${formNama}" berhasil ditambahkan.`, 'success');
        }

        await onUpdateSettings({
            ...settings,
            kelompokHalaqah: updatedList
        });

        setIsFormOpen(false);
    };

    // Delete Halaqah
    const handleDeleteHalaqah = (h: KelompokHalaqah) => {
        showConfirmation(
            'Hapus Kelompok Halaqah?',
            `Apakah Anda yakin ingin menghapus kelompok "${h.nama}"? Santri anggota kelompok ini akan diubah statusnya menjadi belum memiliki kelompok halaqah.`,
            async () => {
                // Remove halaqah from settings
                const updatedList = (settings.kelompokHalaqah || []).filter(item => item.id !== h.id);
                await onUpdateSettings({
                    ...settings,
                    kelompokHalaqah: updatedList
                });

                // Unassign santri who belonged to this halaqah
                const members = santriList.filter(s => s.halaqahId === h.id);
                if (members.length > 0) {
                    const updatedMembers = members.map(m => ({ ...m, halaqahId: undefined }));
                    await onBulkUpdateSantri(updatedMembers);
                }

                showToast(`Kelompok "${h.nama}" berhasil dihapus.`, 'info');
            }
        );
    };

    // Open Member Assignment Modal
    const handleOpenMemberModal = (h: KelompokHalaqah) => {
        setSelectedHalaqah(h);
        const currentMembers = santriList.filter(s => s.halaqahId === h.id).map(s => s.id);
        setSelectedSantriIds(currentMembers);
        setMemberSearch('');
        setMemberFilterJenjang(0);
        setMemberFilterKelas(0);
        setMemberFilterRombel(0);
        setIsMemberModalOpen(true);
    };

    // Save Member Assignment
    const handleSaveMembers = async () => {
        if (!selectedHalaqah) return;

        const halaqahId = selectedHalaqah.id;
        const santriToUpdate: Santri[] = [];

        santriList.forEach((s) => {
            const shouldBeInHalaqah = selectedSantriIds.includes(s.id);
            const isCurrentlyInHalaqah = s.halaqahId === halaqahId;

            if (shouldBeInHalaqah && !isCurrentlyInHalaqah) {
                santriToUpdate.push({ ...s, halaqahId });
            } else if (!shouldBeInHalaqah && isCurrentlyInHalaqah) {
                santriToUpdate.push({ ...s, halaqahId: undefined });
            }
        });

        if (santriToUpdate.length > 0) {
            await onBulkUpdateSantri(santriToUpdate);
        }

        // Also update halaqah.santriIds in settings
        const updatedList = (settings.kelompokHalaqah || []).map((h) => {
            if (h.id === halaqahId) {
                return { ...h, santriIds: selectedSantriIds };
            }
            return h;
        });

        await onUpdateSettings({
            ...settings,
            kelompokHalaqah: updatedList
        });

        showToast(`Daftar santri untuk "${selectedHalaqah.nama}" berhasil disimpan (${selectedSantriIds.length} santri).`, 'success');
        setIsMemberModalOpen(false);
    };

    const toggleSantriSelection = (sId: number) => {
        setSelectedSantriIds((prev) => {
            if (prev.includes(sId)) {
                return prev.filter(id => id !== sId);
            } else {
                return [...prev, sId];
            }
        });
    };

    // Santri List for Modal
    const modalFilteredSantri = useMemo(() => {
        return santriList
            .filter((s) => {
                if (s.status !== 'Aktif') return false;

                // Filter Jenjang
                if (memberFilterJenjang) {
                    const santriKelas = (settings.kelas || []).find(k => k.id === s.kelasId);
                    const isSameJenjang = s.jenjangId === memberFilterJenjang || santriKelas?.jenjangId === memberFilterJenjang;
                    if (!isSameJenjang) return false;
                }

                // Filter Kelas
                if (memberFilterKelas) {
                    const santriRombel = (settings.rombel || []).find(r => r.id === s.rombelId);
                    const isSameKelas = s.kelasId === memberFilterKelas || santriRombel?.kelasId === memberFilterKelas;
                    if (!isSameKelas) return false;
                }

                // Filter Rombel
                if (memberFilterRombel && s.rombelId !== memberFilterRombel) {
                    return false;
                }

                // Search Query
                if (memberSearch) {
                    const q = memberSearch.toLowerCase();
                    const matchNama = s.namaLengkap.toLowerCase().includes(q);
                    const matchNis = s.nis && s.nis.toLowerCase().includes(q);
                    if (!matchNama && !matchNis) return false;
                }

                return true;
            })
            .sort((a, b) => {
                // Put already selected members first
                const aSelected = selectedSantriIds.includes(a.id);
                const bSelected = selectedSantriIds.includes(b.id);
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                return a.namaLengkap.localeCompare(b.namaLengkap);
            });
    }, [santriList, memberFilterJenjang, memberFilterKelas, memberFilterRombel, memberSearch, selectedSantriIds, settings.kelas, settings.rombel]);

    // Export Halaqah Plotting to CSV
    const handleExportHalaqahCsv = () => {
        if (halaqahList.length === 0) {
            showToast('Tidak ada kelompok halaqah untuk diekspor.', 'info');
            return;
        }

        const rows: string[][] = [
            ['No', 'Nama Kelompok Halaqah', 'Muhaffizh / Pembimbing', 'Target Hafalan', 'Lokasi', 'Keterangan', 'NIS Santri', 'Nama Santri', 'Kelas / Rombel']
        ];

        let no = 1;
        halaqahList.forEach(h => {
            const muhaffizh = settings.tenagaPengajar?.find(t => t.id === h.muhaffizhId)?.nama || '-';
            const members = santriList.filter(s => s.status === 'Aktif' && s.halaqahId === h.id);

            if (members.length === 0) {
                rows.push([
                    String(no++), h.nama, muhaffizh, `${h.targetJuz || 30} Juz`, h.lokasi || '-', h.keterangan || '-',
                    '-', '(Belum ada anggota)', '-'
                ]);
            } else {
                members.forEach(s => {
                    const rombel = settings.rombel.find(r => r.id === s.rombelId)?.nama || '-';
                    rows.push([
                        String(no++), h.nama, muhaffizh, `${h.targetJuz || 30} Juz`, h.lokasi || '-', h.keterangan || '-',
                        s.nis, s.namaLengkap, rombel
                    ]);
                });
            }
        });

        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `data-kelompok-halaqah-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Data plotting halaqah berhasil diekspor ke CSV.', 'success');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Stat Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-xl font-bold">
                        <i className="bi bi-diagram-3-fill"></i>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Total Halaqah</p>
                        <h3 className="text-xl font-extrabold text-gray-900">{halaqahList.length} Kelompok</h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 text-xl font-bold">
                        <i className="bi bi-people-fill"></i>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Santri Ber-Halaqah</p>
                        <h3 className="text-xl font-extrabold text-emerald-800">
                            {santriList.filter(s => s.status === 'Aktif' && s.halaqahId).length} Santri
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 text-xl font-bold">
                        <i className="bi bi-person-exclamation"></i>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Belum Masuk Halaqah</p>
                        <h3 className="text-xl font-extrabold text-amber-800">{unassignedSantri.length} Santri</h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 text-xl font-bold">
                        <i className="bi bi-mortarboard-fill"></i>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Total Muhaffizh</p>
                        <h3 className="text-xl font-extrabold text-blue-900">
                            {new Set(halaqahList.map(h => h.muhaffizhId).filter(Boolean)).size} Pembimbing
                        </h3>
                    </div>
                </div>
            </div>

            {/* Main Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari kelompok halaqah, nama pembimbing, atau lokasi..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleExportHalaqahCsv}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                        title="Ekspor daftar plotting seluruh kelompok halaqah ke file CSV"
                    >
                        <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-600"></i>
                        <span>Ekspor CSV Halaqah</span>
                    </button>

                    {/* Add Halaqah Button */}
                    {canEdit && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                        >
                            <i className="bi bi-plus-lg text-base"></i>
                            <span>Tambah Kelompok Halaqah</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Halaqah Cards Grid */}
            {filteredHalaqah.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredHalaqah.map((h) => {
                        const muhaffizh = settings.tenagaPengajar?.find(t => t.id === h.muhaffizhId);
                        const members = santriByHalaqah[h.id] || [];

                        return (
                            <div
                                key={h.id}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                            >
                                <div className="p-5 space-y-3.5">
                                    {/* Header of Card */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <span className="bg-teal-50 text-teal-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
                                                Target: {h.targetJuz || 30} Juz
                                            </span>
                                            <h4 className="text-base font-extrabold text-gray-900 mt-1.5">{h.nama}</h4>
                                        </div>

                                        {canEdit && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(h)}
                                                    className="p-1.5 text-gray-400 hover:text-teal-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Edit Halaqah"
                                                >
                                                    <i className="bi bi-pencil-square text-base"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteHalaqah(h)}
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Hapus Halaqah"
                                                >
                                                    <i className="bi bi-trash text-base"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Muhaffizh / Pembimbing */}
                                    <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                            {muhaffizh?.nama ? muhaffizh.nama.charAt(0) : 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase font-bold text-gray-400">Pembimbing / Muhaffizh</p>
                                            <p className="text-xs font-extrabold text-gray-800 truncate">
                                                {muhaffizh ? muhaffizh.nama : 'Belum Ditentukan'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Info Badges (Lokasi & Keterangan) */}
                                    <div className="space-y-1.5 text-xs text-gray-600">
                                        {h.lokasi && (
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <i className="bi bi-geo-alt-fill text-teal-600 text-xs"></i>
                                                <span className="truncate">{h.lokasi}</span>
                                            </div>
                                        )}
                                        {h.keterangan && (
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <i className="bi bi-clock-fill text-amber-600 text-xs"></i>
                                                <span className="truncate">{h.keterangan}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Santri Members Preview */}
                                    <div className="pt-2 border-t border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-700">
                                                Anggota Santri ({members.length})
                                            </span>
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenMemberModal(h)}
                                                    className="text-[11px] text-teal-700 hover:text-teal-900 font-bold underline"
                                                >
                                                    + Kelola Anggota
                                                </button>
                                            )}
                                        </div>

                                        {members.length > 0 ? (
                                            <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                                {members.map((s) => (
                                                    <div
                                                        key={s.id}
                                                        className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded-lg hover:bg-teal-50/50"
                                                    >
                                                        <span className="font-semibold text-gray-800 truncate max-w-[170px]">
                                                            {s.namaLengkap}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            {s.nis}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 bg-gray-50 rounded-xl text-gray-400 text-xs italic">
                                                Belum ada santri di halaqah ini
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer Button */}
                                <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-[11px] text-gray-500">
                                        ID Halaqah: #{h.id.toString().slice(-4)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenMemberModal(h)}
                                        className="text-xs font-bold text-teal-700 bg-white border border-teal-300 hover:bg-teal-50 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
                                    >
                                        <i className="bi bi-people mr-1"></i> Plotting Santri
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-3xl mx-auto">
                        <i className="bi bi-diagram-3"></i>
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-gray-800">Belum Ada Kelompok Halaqah</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                            Buat kelompok halaqah pertama untuk membagi santri ke dalam kelompok bimbingan hafalan Al-Qur'an bersama masing-masing Ustadz/Muhaffizh.
                        </p>
                    </div>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:bg-teal-800 transition-colors"
                        >
                            <i className="bi bi-plus-lg"></i>
                            <span>Buat Kelompok Baru</span>
                        </button>
                    )}
                </div>
            )}

            {/* MODAL: Form Create / Edit Halaqah */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 to-teal-900 text-white flex justify-between items-center">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <i className="bi bi-diagram-3-fill text-amber-400"></i>
                                {selectedHalaqah ? 'Edit Kelompok Halaqah' : 'Tambah Kelompok Halaqah Baru'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="text-gray-300 hover:text-white"
                            >
                                <i className="bi bi-x-lg text-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSaveHalaqah} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Nama Kelompok Halaqah *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formNama}
                                    onChange={(e) => setFormNama(e.target.value)}
                                    placeholder="Contoh: Halaqah Imam Nafi' / Halaqah Al-Mulk"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Pembimbing / Muhaffizh
                                </label>
                                <select
                                    value={formMuhaffizhId}
                                    onChange={(e) => setFormMuhaffizhId(Number(e.target.value))}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value={0}>-- Belum Ditentukan --</option>
                                    {(settings.tenagaPengajar || []).map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.nama} {t.telepon ? `(${t.telepon})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Target Hafalan
                                    </label>
                                    <select
                                        value={formTargetJuz}
                                        onChange={(e) => setFormTargetJuz(Number(e.target.value))}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-teal-900 focus:ring-2 focus:ring-teal-500"
                                    >
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                                            <option key={j} value={j}>Target {j} Juz</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Lokasi / Ruang
                                    </label>
                                    <input
                                        type="text"
                                        value={formLokasi}
                                        onChange={(e) => setFormLokasi(e.target.value)}
                                        placeholder="Contoh: Masjid Lt. 2 / Gazebo 1"
                                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Keterangan / Jadwal Rutin
                                </label>
                                <textarea
                                    rows={2}
                                    value={formKeterangan}
                                    onChange={(e) => setFormKeterangan(e.target.value)}
                                    placeholder="Contoh: Setoran Ba'da Subuh & Muroja'ah Ba'da Maghrib"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md"
                                >
                                    Simpan Kelompok
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Member Assignment / Plotting Santri */}
            {isMemberModalOpen && selectedHalaqah && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-2 sm:p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 to-teal-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-base flex items-center gap-2">
                                    <i className="bi bi-people-fill text-amber-400"></i>
                                    Plotting Anggota: {selectedHalaqah.nama}
                                </h3>
                                <p className="text-xs text-teal-200 mt-0.5">
                                    Pilih santri yang masuk ke dalam kelompok halaqah ini ({selectedSantriIds.length} santri terpilih).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMemberModalOpen(false)}
                                className="text-gray-300 hover:text-white"
                            >
                                <i className="bi bi-x-lg text-lg"></i>
                            </button>
                        </div>

                        {/* Filter Bar: Search, Jenjang, Kelas, Rombel, & Action Buttons */}
                        <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-col gap-2 shrink-0">
                            {/* Search & Actions */}
                            <div className="flex flex-wrap gap-2 items-center">
                                <div className="relative flex-1 min-w-[200px]">
                                    <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                    <input
                                        type="text"
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        placeholder="Cari nama santri / NIS..."
                                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allVisibleIds = modalFilteredSantri.map(s => s.id);
                                            setSelectedSantriIds(prev => Array.from(new Set([...prev, ...allVisibleIds])));
                                        }}
                                        className="text-xs bg-teal-50 text-teal-700 font-bold px-2.5 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors"
                                        title="Pilih seluruh santri yang tampil sesuai filter"
                                    >
                                        Pilih Semua ({modalFilteredSantri.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSantriIds([])}
                                        className="text-xs bg-gray-100 text-gray-600 font-bold px-2.5 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {/* Cascading Filter Controls: Jenjang, Kelas, Rombel */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {/* Filter Jenjang */}
                                <div>
                                    <select
                                        value={memberFilterJenjang}
                                        onChange={(e) => {
                                            setMemberFilterJenjang(Number(e.target.value));
                                            setMemberFilterKelas(0);
                                            setMemberFilterRombel(0);
                                        }}
                                        className="w-full p-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value={0}>Semua Jenjang</option>
                                        {(settings.jenjang || []).map((j) => (
                                            <option key={j.id} value={j.id}>{j.nama}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filter Kelas */}
                                <div>
                                    <select
                                        value={memberFilterKelas}
                                        onChange={(e) => {
                                            setMemberFilterKelas(Number(e.target.value));
                                            setMemberFilterRombel(0);
                                        }}
                                        className="w-full p-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value={0}>Semua Kelas</option>
                                        {availableKelasForModal.map((k) => (
                                            <option key={k.id} value={k.id}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filter Rombel */}
                                <div>
                                    <select
                                        value={memberFilterRombel}
                                        onChange={(e) => setMemberFilterRombel(Number(e.target.value))}
                                        className="w-full p-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value={0}>Semua Rombel</option>
                                        {availableRombelForModal.map((r) => (
                                            <option key={r.id} value={r.id}>{r.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Santri List with Checkboxes */}
                        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100">
                            {modalFilteredSantri.length > 0 ? (
                                modalFilteredSantri.map((s) => {
                                    const isSelected = selectedSantriIds.includes(s.id);
                                    const currentHalaqahName = s.halaqahId && s.halaqahId !== selectedHalaqah.id
                                        ? settings.kelompokHalaqah?.find(h => h.id === s.halaqahId)?.nama
                                        : null;

                                    const jenjangObj = settings.jenjang?.find(j => j.id === s.jenjangId);
                                    const kelasObj = settings.kelas?.find(k => k.id === s.kelasId);
                                    const rombelObj = settings.rombel?.find(r => r.id === s.rombelId);

                                    return (
                                        <label
                                            key={s.id}
                                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                                                isSelected ? 'bg-teal-50/80 border border-teal-200' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSantriSelection(s.id)}
                                                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300"
                                                />
                                                <div className="min-w-0">
                                                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-teal-900' : 'text-gray-800'}`}>
                                                        {s.namaLengkap}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">
                                                        NIS: {s.nis}
                                                        {jenjangObj ? ` • ${jenjangObj.nama}` : ''}
                                                        {kelasObj ? ` (${kelasObj.nama})` : ''}
                                                        {rombelObj ? ` • Rombel: ${rombelObj.nama}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            {currentHalaqahName && !isSelected && (
                                                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                                                    Di: {currentHalaqahName}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 text-gray-400 text-xs italic">
                                    Tidak ada data santri yang cocok dengan pencarian dan filter yang dipilih.
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-between items-center shrink-0">
                            <span className="text-xs text-gray-600 font-semibold">
                                Total dipilih: <strong className="text-teal-800">{selectedSantriIds.length} santri</strong>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsMemberModalOpen(false)}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveMembers}
                                    className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md"
                                >
                                    Simpan Anggota
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
