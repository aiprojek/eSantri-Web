import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { GedungAsrama, Kamar } from '../../types';
import { LabelPintuKamarModal } from './LabelPintuKamarModal';

// Modal CRUD Gedung
interface GedungModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (gedung: GedungAsrama) => void;
    gedungData: GedungAsrama | null;
}

const GedungModal: React.FC<GedungModalProps> = ({ isOpen, onClose, onSave, gedungData }) => {
    const { showAlert } = useAppContext();
    const [gedung, setGedung] = useState<Partial<GedungAsrama>>(gedungData || { nama: '', jenis: 'Putra' });

    React.useEffect(() => {
        setGedung(gedungData || { nama: '', jenis: 'Putra' });
    }, [gedungData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!gedung.nama?.trim()) {
            showAlert('Input Tidak Lengkap', 'Nama gedung asrama tidak boleh kosong.');
            return;
        }
        onSave(gedung as GedungAsrama);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 bg-teal-800 text-white flex justify-between items-center">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <i className="bi bi-building"></i> {gedungData ? 'Edit' : 'Tambah'} Gedung Asrama
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="p-5 space-y-4 text-xs">
                    <div>
                        <label className="block mb-1 font-bold text-gray-700">Nama Gedung Asrama</label>
                        <input
                            type="text"
                            placeholder="Contoh: Asrama Putra Al-Fatih"
                            value={gedung.nama || ''}
                            onChange={e => setGedung(g => ({ ...g, nama: e.target.value }))}
                            autoFocus
                            className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 font-bold text-gray-700">Jenis Asrama</label>
                        <select
                            value={gedung.jenis || 'Putra'}
                            onChange={e => setGedung(g => ({ ...g, jenis: e.target.value as any }))}
                            className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium"
                        >
                            <option value="Putra">Putra (Banin)</option>
                            <option value="Putri">Putri (Banat)</option>
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                    <button onClick={onClose} className="text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 font-semibold px-4 py-2 text-xs">
                        Batal
                    </button>
                    <button onClick={handleSave} className="text-white bg-teal-700 hover:bg-teal-800 font-bold rounded-lg text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm">
                        <i className="bi bi-save"></i> Simpan Gedung
                    </button>
                </div>
            </div>
        </div>
    );
};

// Modal CRUD Kamar Lengkap
interface KamarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (kamar: Kamar) => void;
    kamarData: Kamar | null;
    gedungId: number;
}

const KamarModal: React.FC<KamarModalProps> = ({ isOpen, onClose, onSave, kamarData, gedungId }) => {
    const { showAlert, settings } = useAppContext();
    const { santriList } = useSantriContext();

    const [kamar, setKamar] = useState<Partial<Kamar>>(
        kamarData || {
            nama: '',
            kapasitas: 10,
            gedungId,
            musyrifId: undefined,
            ketuaKamarId: undefined,
            lantai: 'Lantai 1',
            fasilitas: '5 Ranjang Tingkat, 10 Lemari, 2 Kipas Angin',
            kondisiFasilitas: 'Baik',
            catatan: ''
        }
    );

    React.useEffect(() => {
        setKamar(
            kamarData || {
                nama: '',
                kapasitas: 10,
                gedungId,
                musyrifId: undefined,
                ketuaKamarId: undefined,
                lantai: 'Lantai 1',
                fasilitas: '5 Ranjang Tingkat, 10 Lemari, 2 Kipas Angin',
                kondisiFasilitas: 'Baik',
                catatan: ''
            }
        );
    }, [kamarData, gedungId]);

    // Santri penghuni kamar ini saat ini (untuk opsi ketua kamar)
    const occupants = useMemo(() => {
        if (!kamarData?.id) return [];
        return santriList.filter(s => s.kamarId === kamarData.id && s.status === 'Aktif');
    }, [santriList, kamarData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!kamar.nama?.trim() || (kamar.kapasitas || 0) <= 0) {
            showAlert('Input Tidak Lengkap', 'Nama kamar dan kapasitas (harus > 0) wajib diisi.');
            return;
        }
        onSave({
            ...kamar,
            gedungId: kamar.gedungId || gedungId
        } as Kamar);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
                <div className="p-4 bg-teal-800 text-white flex justify-between items-center">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <i className="bi bi-door-open-fill"></i> {kamarData ? 'Edit' : 'Tambah'} Data Kamar Asrama
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="p-5 space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block mb-1 font-bold text-gray-700">Nama Kamar</label>
                            <input
                                type="text"
                                placeholder="Contoh: Kamar 101 (Abu Bakar)"
                                value={kamar.nama || ''}
                                onChange={e => setKamar(k => ({ ...k, nama: e.target.value }))}
                                autoFocus
                                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-bold text-gray-700">Lantai / Posisi</label>
                            <input
                                type="text"
                                placeholder="Contoh: Lantai 1 / Sayap Timur"
                                value={kamar.lantai || ''}
                                onChange={e => setKamar(k => ({ ...k, lantai: e.target.value }))}
                                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block mb-1 font-bold text-gray-700">Kapasitas Maksimal (Kasur)</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={kamar.kapasitas || 0}
                                onChange={e => setKamar(k => ({ ...k, kapasitas: parseInt(e.target.value) || 0 }))}
                                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-bold text-gray-700">Musyrif / Pembina Asrama</label>
                            <select
                                value={kamar.musyrifId || ''}
                                onChange={e => setKamar(k => ({ ...k, musyrifId: e.target.value ? parseInt(e.target.value) : undefined }))}
                                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium"
                            >
                                <option value="">-- Pilih Musyrif --</option>
                                {settings.tenagaPengajar.map(tp => (
                                    <option key={tp.id} value={tp.id}>{tp.nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Ketua Kamar (Rais Ghorfah) */}
                    <div>
                        <label className="block mb-1 font-bold text-gray-700 flex items-center justify-between">
                            <span>Ketua Kamar (Rais Ghorfah)</span>
                            <span className="text-[10px] text-gray-400 font-normal">Santri penanggung jawab kamar</span>
                        </label>
                        <select
                            value={kamar.ketuaKamarId || ''}
                            onChange={e => setKamar(k => ({ ...k, ketuaKamarId: e.target.value ? parseInt(e.target.value) : undefined }))}
                            className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium"
                        >
                            <option value="">-- Belum Ditentukan --</option>
                            {occupants.map(s => (
                                <option key={s.id} value={s.id}>{s.namaLengkap} (NIS: {s.nis})</option>
                            ))}
                            {occupants.length === 0 && (
                                <option value="" disabled>Kamar belum berpenghuni (isi santri terlebih dahulu)</option>
                            )}
                        </select>
                    </div>

                    {/* Fasilitas Kamar & Kondisi */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block mb-1 font-bold text-gray-700">Daftar Fasilitas / Inventaris Kamar</label>
                            <input
                                type="text"
                                placeholder="Contoh: 5 Ranjang Susun, 10 Lemari, 2 Kipas Angin"
                                value={kamar.fasilitas || ''}
                                onChange={e => setKamar(k => ({ ...k, fasilitas: e.target.value }))}
                                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-bold text-gray-700">Kondisi Fasilitas</label>
                            <select
                                value={kamar.kondisiFasilitas || 'Baik'}
                                onChange={e => setKamar(k => ({ ...k, kondisiFasilitas: e.target.value as any }))}
                                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium"
                            >
                                <option value="Baik">Baik</option>
                                <option value="Cukup">Cukup</option>
                                <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1 font-bold text-gray-700">Catatan Khusus Kamar (Opsional)</label>
                        <textarea
                            rows={2}
                            placeholder="Catatan kebersihan, kunci lemari, atau nomor inventaris..."
                            value={kamar.catatan || ''}
                            onChange={e => setKamar(k => ({ ...k, catatan: e.target.value }))}
                            className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg w-full p-2.5 text-xs font-medium"
                        />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                    <button onClick={onClose} className="text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 font-semibold px-4 py-2 text-xs">
                        Batal
                    </button>
                    <button onClick={handleSave} className="text-white bg-teal-700 hover:bg-teal-800 font-bold rounded-lg text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm">
                        <i className="bi bi-save"></i> Simpan Data Kamar
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ManajemenGedungKamar: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation, showAlert, currentUser, showToast } = useAppContext();
    const { santriList } = useSantriContext();

    const [gedungModalData, setGedungModalData] = useState<{ mode: 'add' | 'edit'; item: GedungAsrama | null } | null>(null);
    const [kamarModalData, setKamarModalData] = useState<{ mode: 'add' | 'edit'; item: Kamar | null; gedungId: number } | null>(null);
    const [printDoorTagData, setPrintDoorTagData] = useState<{ kamar: Kamar; gedung: GedungAsrama; penghuni: any[] } | null>(null);

    // Filters
    const [filterGedungId, setFilterGedungId] = useState<number | ''>('');
    const [filterKondisi, setFilterKondisi] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keasramaan === 'write';

    const handleSaveGedung = async (gedung: GedungAsrama) => {
        let updatedList;
        if (gedung.id > 0) {
            updatedList = settings.gedungAsrama.map(g => (g.id === gedung.id ? gedung : g));
        } else {
            const newId = settings.gedungAsrama.length > 0 ? Math.max(...settings.gedungAsrama.map(g => g.id)) + 1 : 1;
            updatedList = [...settings.gedungAsrama, { ...gedung, id: newId }];
        }
        await onSaveSettings({ ...settings, gedungAsrama: updatedList });
        setGedungModalData(null);
        showToast(`Gedung ${gedung.nama} berhasil disimpan.`, 'success');
    };

    const handleSaveKamar = async (kamar: Kamar) => {
        let updatedList;
        if (kamar.id > 0) {
            updatedList = settings.kamar.map(k => (k.id === kamar.id ? kamar : k));
        } else {
            const newId = settings.kamar.length > 0 ? Math.max(...settings.kamar.map(k => k.id)) + 1 : 1;
            updatedList = [...settings.kamar, { ...kamar, id: newId }];
        }
        await onSaveSettings({ ...settings, kamar: updatedList });
        setKamarModalData(null);
        showToast(`Kamar ${kamar.nama} berhasil disimpan.`, 'success');
    };

    const handleDeleteGedung = (id: number) => {
        const gedung = settings.gedungAsrama.find(g => g.id === id);
        if (!gedung) return;
        if (settings.kamar.some(k => k.gedungId === id)) {
            showAlert('Penghapusan Gagal', `Tidak dapat menghapus ${gedung.nama} karena masih memiliki kamar terdaftar.`);
            return;
        }
        showConfirmation(
            `Hapus ${gedung.nama}?`,
            'Anda yakin ingin menghapus gedung ini secara permanen?',
            async () => {
                const updatedList = settings.gedungAsrama.filter(g => g.id !== id);
                await onSaveSettings({ ...settings, gedungAsrama: updatedList });
                showToast(`Gedung berhasil dihapus.`, 'success');
            },
            { confirmColor: 'red' }
        );
    };

    const handleDeleteKamar = (id: number) => {
        const kamar = settings.kamar.find(k => k.id === id);
        if (!kamar) return;
        if (santriList.some(s => s.kamarId === id)) {
            showAlert('Penghapusan Gagal', `Tidak dapat menghapus ${kamar.nama} karena masih ada santri yang menempatinya. Harap kosongkan santri terlebih dahulu.`);
            return;
        }
        showConfirmation(
            `Hapus ${kamar.nama}?`,
            'Anda yakin ingin menghapus kamar ini?',
            async () => {
                const updatedList = settings.kamar.filter(k => k.id !== id);
                await onSaveSettings({ ...settings, kamar: updatedList });
                showToast(`Kamar berhasil dihapus.`, 'success');
            },
            { confirmColor: 'red' }
        );
    };

    // Filtered Buildings
    const displayedGedung = useMemo(() => {
        if (!filterGedungId) return settings.gedungAsrama;
        return settings.gedungAsrama.filter(g => g.id === filterGedungId);
    }, [settings.gedungAsrama, filterGedungId]);

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
            {/* Header & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-building-gear text-teal-600"></i> Manajemen Gedung &amp; Kamar Asrama
                    </h2>
                    <p className="text-xs text-gray-500">
                        Atur nama gedung, nomor kamar, penugasan musyrif pembina, ketua kamar, serta fasilitas kamar.
                    </p>
                </div>
                {canWrite && (
                    <button
                        onClick={() => setGedungModalData({ mode: 'add', item: null })}
                        className="w-full sm:w-auto px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                        <i className="bi bi-plus-circle"></i> Tambah Gedung Asrama
                    </button>
                )}
            </div>

            {!canWrite && (
                <div className="p-3 bg-amber-50 text-amber-900 text-xs rounded-xl border border-amber-200 flex items-center gap-2">
                    <i className="bi bi-shield-lock text-amber-700 text-sm"></i>
                    <span>Mode Akses Lihat Saja: Anda tidak memiliki hak akses menulis pada modul Keasramaan.</span>
                </div>
            )}

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl text-xs">
                <div>
                    <label className="block text-gray-600 font-bold mb-1">Filter Gedung:</label>
                    <select
                        value={filterGedungId}
                        onChange={e => setFilterGedungId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                    >
                        <option value="">Semua Gedung Asrama</option>
                        {settings.gedungAsrama.map(g => (
                            <option key={g.id} value={g.id}>{g.nama} ({g.jenis})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-gray-600 font-bold mb-1">Filter Kondisi Fisik:</label>
                    <select
                        value={filterKondisi}
                        onChange={e => setFilterKondisi(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                    >
                        <option value="">Semua Kondisi</option>
                        <option value="Baik">Kondisi Baik</option>
                        <option value="Cukup">Kondisi Cukup</option>
                        <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                    </select>
                </div>

                <div>
                    <label className="block text-gray-600 font-bold mb-1">Cari Kamar / Musyrif:</label>
                    <input
                        type="text"
                        placeholder="Ketik nama kamar atau musyrif..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                    />
                </div>
            </div>

            {/* List Gedung & Kamar */}
            <div className="space-y-6">
                {displayedGedung.map(gedung => {
                    // Filter kamar for this gedung
                    const roomsInGedung = settings.kamar.filter(k => {
                        if (k.gedungId !== gedung.id) return false;
                        if (filterKondisi && (k.kondisiFasilitas || 'Baik') !== filterKondisi) return false;
                        if (searchQuery) {
                            const musyrif = settings.tenagaPengajar.find(tp => tp.id === k.musyrifId);
                            const matchNama = k.nama.toLowerCase().includes(searchQuery.toLowerCase());
                            const matchMusyrif = musyrif?.nama.toLowerCase().includes(searchQuery.toLowerCase());
                            if (!matchNama && !matchMusyrif) return false;
                        }
                        return true;
                    });

                    return (
                        <div key={gedung.id} className="p-5 border border-gray-200 rounded-2xl bg-gray-50/40 space-y-4">
                            {/* Gedung Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                                        gedung.jenis === 'Putra' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                                    }`}>
                                        <i className="bi bi-building"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-gray-900">{gedung.nama}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                gedung.jenis === 'Putra' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                                            }`}>
                                                {gedung.jenis}
                                            </span>
                                            <span>&bull; {roomsInGedung.length} Kamar Aktif</span>
                                        </div>
                                    </div>
                                </div>

                                {canWrite && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setKamarModalData({ mode: 'add', item: null, gedungId: gedung.id })}
                                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
                                        >
                                            <i className="bi bi-plus"></i> Tambah Kamar
                                        </button>
                                        <button
                                            onClick={() => setGedungModalData({ mode: 'edit', item: gedung })}
                                            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                                            title="Edit Nama Gedung"
                                        >
                                            <i className="bi bi-pencil-square"></i>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteGedung(gedung.id)}
                                            className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                                            title="Hapus Gedung"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Room Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {roomsInGedung.map(kamar => {
                                    const penghuni = santriList.filter(s => s.kamarId === kamar.id && s.status === 'Aktif');
                                    const musyrif = settings.tenagaPengajar.find(tp => tp.id === kamar.musyrifId);
                                    const ketuaKamar = penghuni.find(s => s.id === kamar.ketuaKamarId);
                                    const isFull = penghuni.length >= kamar.kapasitas;

                                    return (
                                        <div
                                            key={kamar.id}
                                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3 hover:border-teal-300 transition-colors"
                                        >
                                            {/* Room Title & Occupancy Pill */}
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-extrabold text-sm text-gray-900">{kamar.nama}</h4>
                                                    <p className="text-[11px] text-gray-500 font-medium">
                                                        {kamar.lantai || 'Lantai 1'}
                                                    </p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    isFull
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : penghuni.length === 0
                                                        ? 'bg-gray-100 text-gray-600'
                                                        : 'bg-teal-100 text-teal-800'
                                                }`}>
                                                    {penghuni.length} / {kamar.kapasitas} Kasur
                                                </span>
                                            </div>

                                            {/* Details & Roles */}
                                            <div className="space-y-1.5 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400">Musyrif:</span>
                                                    <span className="font-semibold text-gray-800 truncate max-w-[150px]">
                                                        {musyrif?.nama || '-'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400">Ketua Kamar:</span>
                                                    <span className="font-semibold text-teal-800 truncate max-w-[150px]">
                                                        {ketuaKamar?.namaLengkap || '-'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400">Kondisi Fasilitas:</span>
                                                    <span className={`font-bold text-[10px] px-1.5 py-0.2 rounded ${
                                                        kamar.kondisiFasilitas === 'Perlu Perbaikan'
                                                            ? 'bg-rose-100 text-rose-800'
                                                            : kamar.kondisiFasilitas === 'Cukup'
                                                            ? 'bg-amber-100 text-amber-900'
                                                            : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                        {kamar.kondisiFasilitas || 'Baik'}
                                                    </span>
                                                </div>
                                                {kamar.fasilitas && (
                                                    <p className="text-[10px] text-gray-500 italic truncate pt-0.5">
                                                        <i className="bi bi-box-seam mr-1"></i> {kamar.fasilitas}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                                                <button
                                                    onClick={() => setPrintDoorTagData({ kamar, gedung, penghuni })}
                                                    className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold text-[11px]"
                                                    title="Cetak Label Pintu Kamar"
                                                >
                                                    <i className="bi bi-printer"></i> Label Pintu
                                                </button>

                                                {canWrite && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setKamarModalData({ mode: 'edit', item: kamar, gedungId: gedung.id })}
                                                            className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100 transition-colors"
                                                            title="Edit Kamar"
                                                        >
                                                            <i className="bi bi-pencil-square"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteKamar(kamar.id)}
                                                            className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-gray-100 transition-colors"
                                                            title="Hapus Kamar"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {roomsInGedung.length === 0 && (
                                    <div className="col-span-full p-8 text-center text-gray-500 text-xs border border-dashed border-gray-200 rounded-xl">
                                        Belum ada kamar yang terdaftar di gedung ini.
                                        {canWrite && (
                                            <button
                                                onClick={() => setKamarModalData({ mode: 'add', item: null, gedungId: gedung.id })}
                                                className="block mx-auto mt-2 text-teal-700 font-bold underline"
                                            >
                                                + Tambah Kamar Baru
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {displayedGedung.length === 0 && (
                    <div className="p-12 text-center text-gray-500 text-sm">
                        Belum ada gedung asrama. Klik tombol <strong>"Tambah Gedung Asrama"</strong> di atas.
                    </div>
                )}
            </div>

            {/* Modals */}
            {gedungModalData && (
                <GedungModal
                    isOpen={!!gedungModalData}
                    onClose={() => setGedungModalData(null)}
                    onSave={handleSaveGedung}
                    gedungData={gedungModalData.item}
                />
            )}

            {kamarModalData && (
                <KamarModal
                    isOpen={!!kamarModalData}
                    onClose={() => setKamarModalData(null)}
                    onSave={handleSaveKamar}
                    kamarData={kamarModalData.item}
                    gedungId={kamarModalData.gedungId}
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
