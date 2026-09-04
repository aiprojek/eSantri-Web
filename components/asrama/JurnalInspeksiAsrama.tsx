import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { InspeksiKamar, JurnalAsrama } from '../../types';

export const JurnalInspeksiAsrama: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation, showAlert, currentUser, showToast } = useAppContext();
    const { santriList } = useSantriContext();

    const [activeSubTab, setActiveSubTab] = useState<'inspeksi' | 'jurnal'>('inspeksi');

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keasramaan === 'write';

    // -------------------------------------------------------------
    // SECTION 1: INSPEKSI KEBERSIHAN KAMAR
    // -------------------------------------------------------------
    const [inspeksiForm, setInspeksiForm] = useState<Partial<InspeksiKamar>>({
        tanggal: new Date().toISOString().split('T')[0],
        kamarId: settings.kamar[0]?.id || 1,
        skorKebersihan: 85,
        skorKerapian: 85,
        skorKedisiplinan: 90,
        skorTotal: 87,
        predikat: 'Jayyid Jiddan',
        musyrifPemeriksa: currentUser?.username || 'Musyrif Asrama',
        catatan: ''
    });

    const [filterGedungInspeksi, setFilterGedungInspeksi] = useState<number | ''>('');
    const [filterTanggalInspeksi, setFilterTanggalInspeksi] = useState<string>('');

    // Auto-calculate total and predikat
    const calculatePredikat = (total: number): InspeksiKamar['predikat'] => {
        if (total >= 90) return 'Mumtaz';
        if (total >= 80) return 'Jayyid Jiddan';
        if (total >= 70) return 'Jayyid';
        if (total >= 60) return 'Maqbul';
        return 'Rasib';
    };

    const handleScoreChange = (field: 'skorKebersihan' | 'skorKerapian' | 'skorKedisiplinan', val: number) => {
        const clamped = Math.max(0, Math.min(100, val || 0));
        const newForm = { ...inspeksiForm, [field]: clamped };
        const k = newForm.skorKebersihan || 0;
        const r = newForm.skorKerapian || 0;
        const d = newForm.skorKedisiplinan || 0;
        const total = Math.round((k + r + d) / 3);
        const predikat = calculatePredikat(total);

        setInspeksiForm({
            ...newForm,
            skorTotal: total,
            predikat
        });
    };

    const handleSaveInspeksi = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite) {
            showAlert('Akses Ditolak', 'Anda tidak memiliki hak akses menulis.');
            return;
        }

        if (!inspeksiForm.kamarId) {
            showAlert('Pilih Kamar', 'Harap pilih kamar yang diinspeksi.');
            return;
        }

        const existingList = settings.inspeksiKamar || [];
        const newId = existingList.length > 0 ? Math.max(...existingList.map(i => i.id)) + 1 : 1;
        const newInspeksi: InspeksiKamar = {
            id: newId,
            tanggal: inspeksiForm.tanggal || new Date().toISOString().split('T')[0],
            kamarId: Number(inspeksiForm.kamarId),
            skorKebersihan: inspeksiForm.skorKebersihan || 0,
            skorKerapian: inspeksiForm.skorKerapian || 0,
            skorKedisiplinan: inspeksiForm.skorKedisiplinan || 0,
            skorTotal: inspeksiForm.skorTotal || 0,
            predikat: inspeksiForm.predikat || 'Jayyid',
            musyrifPemeriksa: inspeksiForm.musyrifPemeriksa || 'Musyrif',
            catatan: inspeksiForm.catatan || '',
            lastModified: Date.now()
        };

        const updatedList = [newInspeksi, ...existingList];
        await onSaveSettings({ ...settings, inspeksiKamar: updatedList });

        showToast('Hasil sidak kebersihan kamar berhasil disimpan.', 'success');
        setInspeksiForm(prev => ({
            ...prev,
            catatan: ''
        }));
    };

    const handleDeleteInspeksi = (id: number) => {
        if (!canWrite) return;
        showConfirmation(
            'Hapus Hasil Inspeksi?',
            'Data penilaian kebersihan kamar ini akan dihapus permanen.',
            async () => {
                const updated = (settings.inspeksiKamar || []).filter(i => i.id !== id);
                await onSaveSettings({ ...settings, inspeksiKamar: updated });
                showToast('Data inspeksi dihapus.', 'info');
            },
            { confirmColor: 'red' }
        );
    };

    const displayedInspeksi = useMemo(() => {
        return (settings.inspeksiKamar || []).filter(i => {
            const kamar = settings.kamar.find(k => k.id === i.kamarId);
            if (filterGedungInspeksi && kamar?.gedungId !== filterGedungInspeksi) return false;
            if (filterTanggalInspeksi && i.tanggal !== filterTanggalInspeksi) return false;
            return true;
        });
    }, [settings.inspeksiKamar, settings.kamar, filterGedungInspeksi, filterTanggalInspeksi]);

    // -------------------------------------------------------------
    // SECTION 2: JURNAL PEMBINAAN & CATATAN HARIAN MUSYRIF
    // -------------------------------------------------------------
    const [jurnalForm, setJurnalForm] = useState<Partial<JurnalAsrama>>({
        tanggal: new Date().toISOString().split('T')[0],
        waktu: new Date().toTimeString().slice(0, 5),
        gedungId: settings.gedungAsrama[0]?.id || 1,
        kamarId: undefined,
        santriId: undefined,
        jenisKegiatan: 'Pembinaan',
        keterangan: '',
        tindakan: '',
        namaMusyrif: currentUser?.username || 'Musyrif'
    });

    const [filterJenisJurnal, setFilterJenisJurnal] = useState<string>('');
    const [filterGedungJurnal, setFilterGedungJurnal] = useState<number | ''>('');

    const handleSaveJurnal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite) {
            showAlert('Akses Ditolak', 'Anda tidak memiliki hak akses menulis.');
            return;
        }

        if (!jurnalForm.keterangan?.trim()) {
            showAlert('Input Kosong', 'Uraian catatan/kegiatan jurnal tidak boleh kosong.');
            return;
        }

        const existingList = settings.jurnalAsrama || [];
        const newId = existingList.length > 0 ? Math.max(...existingList.map(j => j.id)) + 1 : 1;
        const newJurnal: JurnalAsrama = {
            id: newId,
            tanggal: jurnalForm.tanggal || new Date().toISOString().split('T')[0],
            waktu: jurnalForm.waktu || '08:00',
            gedungId: jurnalForm.gedungId ? Number(jurnalForm.gedungId) : undefined,
            kamarId: jurnalForm.kamarId ? Number(jurnalForm.kamarId) : undefined,
            santriId: jurnalForm.santriId ? Number(jurnalForm.santriId) : undefined,
            jenisKegiatan: (jurnalForm.jenisKegiatan as any) || 'Pembinaan',
            keterangan: jurnalForm.keterangan || '',
            tindakan: jurnalForm.tindakan || '',
            namaMusyrif: jurnalForm.namaMusyrif || 'Musyrif',
            lastModified: Date.now()
        };

        const updated = [newJurnal, ...existingList];
        await onSaveSettings({ ...settings, jurnalAsrama: updated });

        showToast('Catatan jurnal asrama berhasil ditambahkan.', 'success');
        setJurnalForm(prev => ({
            ...prev,
            keterangan: '',
            tindakan: '',
            santriId: undefined
        }));
    };

    const handleDeleteJurnal = (id: number) => {
        if (!canWrite) return;
        showConfirmation(
            'Hapus Catatan Jurnal?',
            'Catatan jurnal harian ini akan dihapus.',
            async () => {
                const updated = (settings.jurnalAsrama || []).filter(j => j.id !== id);
                await onSaveSettings({ ...settings, jurnalAsrama: updated });
                showToast('Catatan jurnal dihapus.', 'info');
            },
            { confirmColor: 'red' }
        );
    };

    const displayedJurnal = useMemo(() => {
        return (settings.jurnalAsrama || []).filter(j => {
            if (filterGedungJurnal && j.gedungId !== filterGedungJurnal) return false;
            if (filterJenisJurnal && j.jenisKegiatan !== filterJenisJurnal) return false;
            return true;
        });
    }, [settings.jurnalAsrama, filterGedungJurnal, filterJenisJurnal]);

    return (
        <div className="space-y-6">
            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                <button
                    onClick={() => setActiveSubTab('inspeksi')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeSubTab === 'inspeksi'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <i className="bi bi-shield-check text-sm"></i>
                    <span>Inspeksi Kebersihan Kamar (Sidak Nadhafah)</span>
                </button>
                <button
                    onClick={() => setActiveSubTab('jurnal')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeSubTab === 'jurnal'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <i className="bi bi-journal-bookmark-fill text-sm"></i>
                    <span>Jurnal Pembinaan &amp; Catatan Musyrif</span>
                </button>
            </div>

            {/* TAB 1: INSPEKSI KEBERSIHAN */}
            {activeSubTab === 'inspeksi' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Form Input Inspeksi (1 Col) */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                        <div className="border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <i className="bi bi-plus-circle text-teal-600"></i> Form Penilaian Sidak Kamar
                            </h3>
                            <p className="text-[11px] text-gray-500">Skoring kebersihan, kerapian kasur, dan ketertiban.</p>
                        </div>

                        <form onSubmit={handleSaveInspeksi} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-gray-700 font-bold mb-1">Tanggal Sidak</label>
                                <input
                                    type="date"
                                    value={inspeksiForm.tanggal || ''}
                                    onChange={e => setInspeksiForm(f => ({ ...f, tanggal: e.target.value }))}
                                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-1">Pilih Kamar yang Dinilai</label>
                                <select
                                    value={inspeksiForm.kamarId || ''}
                                    onChange={e => setInspeksiForm(f => ({ ...f, kamarId: Number(e.target.value) }))}
                                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                >
                                    {settings.kamar.map(k => {
                                        const gedung = settings.gedungAsrama.find(g => g.id === k.gedungId);
                                        return (
                                            <option key={k.id} value={k.id}>
                                                {gedung?.nama} &bull; {k.nama}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Scoring Sliders */}
                            <div className="p-3 bg-gray-50 rounded-xl space-y-3 border border-gray-200">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="font-bold text-gray-700">Kebersihan Lantai &amp; Ruangan:</label>
                                        <span className="font-black text-teal-800">{inspeksiForm.skorKebersihan} / 100</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={inspeksiForm.skorKebersihan || 0}
                                        onChange={e => handleScoreChange('skorKebersihan', Number(e.target.value))}
                                        className="w-full accent-teal-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="font-bold text-gray-700">Kerapian Kasur &amp; Lemari:</label>
                                        <span className="font-black text-teal-800">{inspeksiForm.skorKerapian} / 100</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={inspeksiForm.skorKerapian || 0}
                                        onChange={e => handleScoreChange('skorKerapian', Number(e.target.value))}
                                        className="w-full accent-teal-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="font-bold text-gray-700">Kedisiplinan &amp; Ketertiban:</label>
                                        <span className="font-black text-teal-800">{inspeksiForm.skorKedisiplinan} / 100</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={inspeksiForm.skorKedisiplinan || 0}
                                        onChange={e => handleScoreChange('skorKedisiplinan', Number(e.target.value))}
                                        className="w-full accent-teal-600"
                                    />
                                </div>

                                {/* Total & Predicate Result */}
                                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Skor Total &amp; Predikat</span>
                                        <span className={`inline-block text-xs font-black px-2 py-0.5 rounded ${
                                            inspeksiForm.predikat === 'Mumtaz'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : inspeksiForm.predikat === 'Jayyid Jiddan'
                                                ? 'bg-teal-100 text-teal-800'
                                                : inspeksiForm.predikat === 'Rasib'
                                                ? 'bg-rose-100 text-rose-800'
                                                : 'bg-amber-100 text-amber-900'
                                        }`}>
                                            {inspeksiForm.predikat}
                                        </span>
                                    </div>
                                    <span className="text-2xl font-black text-teal-950">
                                        {inspeksiForm.skorTotal} <span className="text-xs text-gray-400 font-normal">/ 100</span>
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-1">Musyrif Pemeriksa</label>
                                <input
                                    type="text"
                                    value={inspeksiForm.musyrifPemeriksa || ''}
                                    onChange={e => setInspeksiForm(f => ({ ...f, musyrifPemeriksa: e.target.value }))}
                                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-1">Catatan Temuan / Evaluasi</label>
                                <textarea
                                    rows={2}
                                    placeholder="Misal: Rak sepatu rapi, ada pakaian basah di dalam kamar..."
                                    value={inspeksiForm.catatan || ''}
                                    onChange={e => setInspeksiForm(f => ({ ...f, catatan: e.target.value }))}
                                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!canWrite}
                                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                            >
                                <i className="bi bi-check-circle"></i> Simpan Penilaian Sidak
                            </button>
                        </form>
                    </div>

                    {/* Riwayat Inspeksi & Leaderboard (2 Cols) */}
                    <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <i className="bi bi-clock-history text-teal-600"></i> Riwayat Sidak &amp; Evaluasi Kebersihan
                                </h3>
                                <p className="text-[11px] text-gray-500">Log sidak berkala untuk evaluasi piala bergilir kamar terbersih.</p>
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 text-xs">
                                <select
                                    value={filterGedungInspeksi}
                                    onChange={e => setFilterGedungInspeksi(e.target.value ? Number(e.target.value) : '')}
                                    className="p-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                >
                                    <option value="">Semua Gedung</option>
                                    {settings.gedungAsrama.map(g => (
                                        <option key={g.id} value={g.id}>{g.nama}</option>
                                    ))}
                                </select>
                                <input
                                    type="date"
                                    value={filterTanggalInspeksi}
                                    onChange={e => setFilterTanggalInspeksi(e.target.value)}
                                    className="p-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto border border-gray-200 rounded-xl">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                    <tr>
                                        <th className="py-2.5 px-3">Tanggal</th>
                                        <th className="py-2.5 px-3">Kamar &amp; Gedung</th>
                                        <th className="py-2.5 px-3 text-center">Skor Rata-rata</th>
                                        <th className="py-2.5 px-3 text-center">Predikat</th>
                                        <th className="py-2.5 px-3">Pemeriksa &amp; Catatan</th>
                                        {canWrite && <th className="py-2.5 px-3 text-center w-12">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {displayedInspeksi.map(item => {
                                        const kamar = settings.kamar.find(k => k.id === item.kamarId);
                                        const gedung = kamar ? settings.gedungAsrama.find(g => g.id === kamar.gedungId) : null;

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/80">
                                                <td className="py-2.5 px-3 font-mono text-gray-600 whitespace-nowrap">
                                                    {item.tanggal}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="font-bold text-gray-900 block">{kamar?.nama || '-'}</span>
                                                    <span className="text-[10px] text-gray-500">{gedung?.nama}</span>
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-black text-sm text-teal-800">
                                                    {item.skorTotal}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                                                        item.predikat === 'Mumtaz'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : item.predikat === 'Jayyid Jiddan'
                                                            ? 'bg-teal-100 text-teal-800'
                                                            : item.predikat === 'Rasib'
                                                            ? 'bg-rose-100 text-rose-800'
                                                            : 'bg-amber-100 text-amber-900'
                                                    }`}>
                                                        {item.predikat}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="font-medium text-gray-800 block text-[11px]">{item.musyrifPemeriksa}</span>
                                                    {item.catatan && <p className="text-[10px] text-gray-500 italic mt-0.5">{item.catatan}</p>}
                                                </td>
                                                {canWrite && (
                                                    <td className="py-2.5 px-3 text-center">
                                                        <button
                                                            onClick={() => handleDeleteInspeksi(item.id)}
                                                            className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                                            title="Hapus"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}

                                    {displayedInspeksi.length === 0 && (
                                        <tr>
                                            <td colSpan={canWrite ? 6 : 5} className="py-8 text-center text-gray-400">
                                                Belum ada data hasil sidak kebersihan.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: JURNAL PEMBINAAN */}
            {activeSubTab === 'jurnal' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Form Input Jurnal (1 Col) */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                        <div className="border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <i className="bi bi-pencil-square text-indigo-600"></i> Catat Jurnal Harian Asrama
                            </h3>
                            <p className="text-[11px] text-gray-500">Mencatat kejadian penting, pembinaan adab, dan kedisiplinan.</p>
                        </div>

                        <form onSubmit={handleSaveJurnal} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1">Tanggal</label>
                                    <input
                                        type="date"
                                        value={jurnalForm.tanggal || ''}
                                        onChange={e => setJurnalForm(f => ({ ...f, tanggal: e.target.value }))}
                                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1">Waktu</label>
                                    <input
                                        type="time"
                                        value={jurnalForm.waktu || ''}
                                        onChange={e => setJurnalForm(f => ({ ...f, waktu: e.target.value }))}
                                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-1">Jenis Kegiatan / Catatan</label>
                                <select
                                    value={jurnalForm.jenisKegiatan || 'Pembinaan'}
                                    onChange={e => setJurnalForm(f => ({ ...f, jenisKegiatan: e.target.value as any }))}
                                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                >
                                    <option value="Kebersihan">Kebersihan (Roan / Kerja Bakti)</option>
                                    <option value="Kedisiplinan">Kedisiplinan (Bangun Tidur, Sholat, Jam Malam)</option>
                                    <option value="Pembinaan">Pembinaan Adab / Halaqah Kamar</option>
                                    <option value="Kunjungan Wali">Kunjungan Wali Santri</option>
                                    <option value="Kesehatan/P3K">Kesehatan / P3K Ringan di Kamar</option>
                                    <option value="Lainnya">Lainnya</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1">Gedung</label>
                                    <select
                                        value={jurnalForm.gedungId || ''}
                                        onChange={e => setJurnalForm(f => ({ ...f, gedungId: e.target.value ? Number(e.target.value) : undefined }))}
                                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                    >
                                        <option value="">Semua Gedung</option>
                                        {settings.gedungAsrama.map(g => (
                                            <option key={g.id} value={g.id}>{g.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1">Kamar (Opsional)</label>
                                    <select
                                        value={jurnalForm.kamarId || ''}
                                        onChange={e => setJurnalForm(f => ({ ...f, kamarId: e.target.value ? Number(e.target.value) : undefined }))}
                                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                    >
                                        <option value="">-- Umum / Semua --</option>
                                        {settings.kamar
                                            .filter(k => !jurnalForm.gedungId || k.gedungId === jurnalForm.gedungId)
                                            .map(k => (
                                                <option key={k.id} value={k.id}>{k.nama}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-1">Uraian Kejadian / Catatan Musyrif</label>
                                <textarea
                                    rows={3}
                                    placeholder="Jelaskan aktivitas atau kejadian di asrama secara rinci..."
                                    value={jurnalForm.keterangan || ''}
                                    onChange={e => setJurnalForm(f => ({ ...f, keterangan: e.target.value }))}
                                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-1">Tindakan / Arahan Musyrif</label>
                                <input
                                    type="text"
                                    placeholder="Arahan pembinaan, solusi, atau tindak lanjut..."
                                    value={jurnalForm.tindakan || ''}
                                    onChange={e => setJurnalForm(f => ({ ...f, tindakan: e.target.value }))}
                                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-1">Nama Musyrif Pencatat</label>
                                <input
                                    type="text"
                                    value={jurnalForm.namaMusyrif || ''}
                                    onChange={e => setJurnalForm(f => ({ ...f, namaMusyrif: e.target.value }))}
                                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!canWrite}
                                className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                            >
                                <i className="bi bi-save"></i> Simpan Catatan Jurnal
                            </button>
                        </form>
                    </div>

                    {/* Timeline & Daftar Jurnal (2 Cols) */}
                    <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <i className="bi bi-card-text text-indigo-600"></i> Kronologi Jurnal Asrama
                                </h3>
                                <p className="text-[11px] text-gray-500">Catatan kronologis harian pengasuhan santri di asrama.</p>
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 text-xs">
                                <select
                                    value={filterJenisJurnal}
                                    onChange={e => setFilterJenisJurnal(e.target.value)}
                                    className="p-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium"
                                >
                                    <option value="">Semua Kategori</option>
                                    <option value="Kebersihan">Kebersihan</option>
                                    <option value="Kedisiplinan">Kedisiplinan</option>
                                    <option value="Pembinaan">Pembinaan</option>
                                    <option value="Kunjungan Wali">Kunjungan Wali</option>
                                    <option value="Kesehatan/P3K">Kesehatan</option>
                                </select>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            {displayedJurnal.map(j => {
                                const targetGedung = settings.gedungAsrama.find(g => g.id === j.gedungId);
                                const targetKamar = settings.kamar.find(k => k.id === j.kamarId);

                                return (
                                    <div key={j.id} className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px]">
                                                    {j.jenisKegiatan}
                                                </span>
                                                <span className="text-gray-400">&bull;</span>
                                                <span className="text-gray-600 font-semibold text-[11px]">
                                                    {targetGedung?.nama || 'Seluruh Gedung'} {targetKamar ? `( ${targetKamar.nama} )` : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-mono text-gray-500">
                                                    {j.tanggal} {j.waktu ? `• ${j.waktu}` : ''}
                                                </span>
                                                {canWrite && (
                                                    <button
                                                        onClick={() => handleDeleteJurnal(j.id)}
                                                        className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                                        title="Hapus"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-800 leading-relaxed">{j.keterangan}</p>

                                        {j.tindakan && (
                                            <div className="p-2 bg-white rounded-lg border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-1.5">
                                                <i className="bi bi-arrow-return-right text-indigo-500 mt-0.5"></i>
                                                <div>
                                                    <span className="font-bold">Tindakan/Arahan:</span> {j.tindakan}
                                                </div>
                                            </div>
                                        )}

                                        <div className="text-[10px] text-gray-400 text-right pt-1">
                                            Dicatat oleh: <span className="font-semibold text-gray-600">{j.namaMusyrif}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {displayedJurnal.length === 0 && (
                                <div className="p-8 text-center text-gray-400 text-xs">
                                    Belum ada catatan jurnal asrama yang cocok dengan filter.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
