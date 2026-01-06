
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { GedungAsrama, Kamar, Santri, TenagaPengajar } from '../types';

// --- Modals for CRUD ---

interface GedungModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (gedung: GedungAsrama) => void;
    gedungData: GedungAsrama | null;
}

const GedungModal: React.FC<GedungModalProps> = ({ isOpen, onClose, onSave, gedungData }) => {
    const { showAlert } = useAppContext();
    const [gedung, setGedung] = useState<Partial<GedungAsrama>>(gedungData || { nama: '', jenis: 'Putra' });

    useEffect(() => {
        setGedung(gedungData || { nama: '', jenis: 'Putra' });
    }, [gedungData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!gedung.nama?.trim()) {
            showAlert('Input Tidak Lengkap', 'Nama gedung tidak boleh kosong.');
            return;
        }
        onSave(gedung as GedungAsrama);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">{gedungData ? 'Edit' : 'Tambah'} Gedung Asrama</h3></div>
                <div className="p-5 space-y-4">
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Nama Gedung</label><input type="text" value={gedung.nama} onChange={e => setGedung(g => ({...g, nama: e.target.value}))} autoFocus className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Jenis</label><select value={gedung.jenis} onChange={e => setGedung(g => ({...g, jenis: e.target.value as any}))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="Putra">Putra</option><option value="Putri">Putri</option></select></div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2"><button onClick={onClose} className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button><button onClick={handleSave} className="text-white bg-teal-700 hover:bg-teal-800 font-medium rounded-lg text-sm px-5 py-2.5">Simpan</button></div>
            </div>
        </div>
    );
};

interface KamarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (kamar: Kamar) => void;
    kamarData: Kamar | null;
    gedungId: number;
}

const KamarModal: React.FC<KamarModalProps> = ({ isOpen, onClose, onSave, kamarData, gedungId }) => {
    const { showAlert, settings } = useAppContext();
    const [kamar, setKamar] = useState<Partial<Kamar>>(kamarData || { nama: '', kapasitas: 0, gedungId, musyrifId: undefined });

    useEffect(() => {
        setKamar(kamarData || { nama: '', kapasitas: 0, gedungId, musyrifId: undefined });
    }, [kamarData, gedungId]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!kamar.nama?.trim() || (kamar.kapasitas || 0) <= 0) {
            showAlert('Input Tidak Lengkap', 'Nama kamar dan kapasitas (harus > 0) wajib diisi.');
            return;
        }
        onSave(kamar as Kamar);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">{kamarData ? 'Edit' : 'Tambah'} Kamar</h3></div>
                <div className="p-5 space-y-4">
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Nama Kamar</label><input type="text" value={kamar.nama} onChange={e => setKamar(k => ({...k, nama: e.target.value}))} autoFocus className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Kapasitas</label><input type="number" value={kamar.kapasitas} onChange={e => setKamar(k => ({...k, kapasitas: parseInt(e.target.value) || 0}))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Musyrif/ah</label><select value={kamar.musyrifId || ''} onChange={e => setKamar(k => ({...k, musyrifId: e.target.value ? parseInt(e.target.value) : undefined}))} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Tidak Ada --</option>{settings.tenagaPengajar.map(tp => <option key={tp.id} value={tp.id}>{tp.nama}</option>)}</select></div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2"><button onClick={onClose} className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button><button onClick={handleSave} className="text-white bg-teal-700 hover:bg-teal-800 font-medium rounded-lg text-sm px-5 py-2.5">Simpan</button></div>
            </div>
        </div>
    );
};


// --- Sub-Components for Asrama Feature ---

const AsramaDashboard: React.FC = () => {
    const { settings, santriList } = useAppContext();
    const { gedungAsrama, kamar } = settings;

    const stats = useMemo(() => {
        const totalGedung = gedungAsrama.length;
        const totalKamar = kamar.length;
        const totalKapasitas = kamar.reduce((sum, k) => sum + k.kapasitas, 0);
        const santriDiKamar = santriList.filter(s => s.kamarId && s.status === 'Aktif').length;
        const santriTanpaKamar = santriList.filter(s => !s.kamarId && s.status === 'Aktif').length;
        const tingkatHunian = totalKapasitas > 0 ? (santriDiKamar / totalKapasitas) * 100 : 0;

        const occupancyByBuilding = gedungAsrama.map(gedung => {
            const kamarDiGedung = kamar.filter(k => k.gedungId === gedung.id);
            const kapasitasGedung = kamarDiGedung.reduce((sum, k) => sum + k.kapasitas, 0);
            const penghuniGedung = santriList.filter(s => {
                const santriKamar = kamar.find(k => k.id === s.kamarId);
                return santriKamar && santriKamar.gedungId === gedung.id && s.status === 'Aktif';
            }).length;
            return {
                nama: gedung.nama,
                penghuni: penghuniGedung,
                kapasitas: kapasitasGedung,
                persentase: kapasitasGedung > 0 ? (penghuniGedung / kapasitasGedung) * 100 : 0
            };
        });

        return { totalGedung, totalKamar, totalKapasitas, santriDiKamar, santriTanpaKamar, tingkatHunian, occupancyByBuilding };
    }, [gedungAsrama, kamar, santriList]);

    const StatCard: React.FC<{ icon: string; title: string; value: string | number; color: string; }> = ({ icon, title, value, color }) => (
        <div className="bg-white p-5 rounded-xl shadow-md flex items-start">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color} mr-4 flex-shrink-0`}>
                <i className={`${icon} text-2xl text-white`}></i>
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Gedung" value={stats.totalGedung} icon="bi-building" color="bg-blue-500" />
                <StatCard title="Total Kamar" value={stats.totalKamar} icon="bi-door-open-fill" color="bg-green-500" />
                <StatCard title="Kapasitas Total" value={stats.totalKapasitas} icon="bi-people-fill" color="bg-purple-500" />
                <StatCard title="Tingkat Hunian" value={`${stats.tingkatHunian.toFixed(1)}%`} icon="bi-pie-chart-fill" color="bg-teal-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-gray-700 mb-4">Okupansi per Gedung</h3>
                    <div className="space-y-4">
                        {stats.occupancyByBuilding.map(gedung => (
                            <div key={gedung.nama}>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="font-medium text-gray-700">{gedung.nama}</span>
                                    <span className="text-gray-600">{gedung.penghuni} / {gedung.kapasitas} Santri</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div className="bg-teal-500 h-4 rounded-full" style={{ width: `${gedung.persentase}%` }}></div>
                                </div>
                            </div>
                        ))}
                         {stats.occupancyByBuilding.length === 0 && <p className="text-center text-gray-500 py-4">Data gedung belum diatur.</p>}
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-gray-700 mb-4">Santri Tanpa Kamar</h3>
                    <div className="text-center">
                        <p className="text-5xl font-bold text-red-600">{stats.santriTanpaKamar}</p>
                        <p className="text-gray-600 mt-2">Santri aktif yang belum ditempatkan</p>
                    </div>
                 </div>
            </div>
        </div>
    );
};

const ManajemenAsrama: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation, showAlert, santriList, currentUser } = useAppContext();
    const [gedungModalData, setGedungModalData] = useState<{ mode: 'add' | 'edit', item: GedungAsrama | null } | null>(null);
    const [kamarModalData, setKamarModalData] = useState<{ mode: 'add' | 'edit', item: Kamar | null, gedungId: number } | null>(null);

    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keasramaan === 'write';

    const handleSaveGedung = async (gedung: GedungAsrama) => {
        let updatedList;
        if (gedung.id > 0) {
            updatedList = settings.gedungAsrama.map(g => g.id === gedung.id ? gedung : g);
        } else {
            const newId = settings.gedungAsrama.length > 0 ? Math.max(...settings.gedungAsrama.map(g => g.id)) + 1 : 1;
            updatedList = [...settings.gedungAsrama, { ...gedung, id: newId }];
        }
        await onSaveSettings({ ...settings, gedungAsrama: updatedList });
        setGedungModalData(null);
    };

    const handleSaveKamar = async (kamar: Kamar) => {
        let updatedList;
        if (kamar.id > 0) {
            updatedList = settings.kamar.map(k => k.id === kamar.id ? kamar : k);
        } else {
            const newId = settings.kamar.length > 0 ? Math.max(...settings.kamar.map(k => k.id)) + 1 : 1;
            updatedList = [...settings.kamar, { ...kamar, id: newId }];
        }
        await onSaveSettings({ ...settings, kamar: updatedList });
        setKamarModalData(null);
    };

    const handleDeleteGedung = (id: number) => {
        const gedung = settings.gedungAsrama.find(g => g.id === id);
        if (!gedung) return;
        if (settings.kamar.some(k => k.gedungId === id)) {
            showAlert('Penghapusan Gagal', `Tidak dapat menghapus ${gedung.nama} karena masih memiliki kamar terdaftar.`);
            return;
        }
        showConfirmation(`Hapus ${gedung.nama}?`, "Anda yakin ingin menghapus gedung ini?", async () => {
            const updatedList = settings.gedungAsrama.filter(g => g.id !== id);
            await onSaveSettings({ ...settings, gedungAsrama: updatedList });
        }, { confirmColor: 'red' });
    };

    const handleDeleteKamar = (id: number) => {
        const kamar = settings.kamar.find(k => k.id === id);
        if (!kamar) return;
        if (santriList.some(s => s.kamarId === id)) {
            showAlert('Penghapusan Gagal', `Tidak dapat menghapus ${kamar.nama} karena masih ada santri yang menempatinya.`);
            return;
        }
        showConfirmation(`Hapus ${kamar.nama}?`, "Anda yakin ingin menghapus kamar ini?", async () => {
            const updatedList = settings.kamar.filter(k => k.id !== id);
            await onSaveSettings({ ...settings, kamar: updatedList });
        }, { confirmColor: 'red' });
    };

    return (
         <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-700">Manajemen Asrama & Kamar</h2>
                {canWrite && (
                    <button onClick={() => setGedungModalData({ mode: 'add', item: null })} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm flex items-center gap-2">
                        <i className="bi bi-plus-circle"></i> Tambah Gedung
                    </button>
                )}
            </div>
            {!canWrite && (
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200 flex items-center">
                    <i className="bi bi-eye-fill mr-2"></i> Mode Lihat Saja: Anda tidak memiliki akses untuk mengubah data asrama.
                </div>
            )}
            <div className="space-y-4">
                {settings.gedungAsrama.map(gedung => (
                    <div key={gedung.id} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{gedung.nama}</h3>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${gedung.jenis === 'Putra' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>{gedung.jenis}</span>
                            </div>
                            {canWrite && (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setGedungModalData({ mode: 'edit', item: gedung })} className="text-blue-600 hover:text-blue-800"><i className="bi bi-pencil-square"></i></button>
                                    <button onClick={() => handleDeleteGedung(gedung.id)} className="text-red-600 hover:text-red-800"><i className="bi bi-trash-fill"></i></button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2 pl-4 border-l-2">
                            {settings.kamar.filter(k => k.gedungId === gedung.id).map(kamar => {
                                const penghuni = santriList.filter(s => s.kamarId === kamar.id).length;
                                const musyrif = settings.tenagaPengajar.find(tp => tp.id === kamar.musyrifId);
                                return (
                                <div key={kamar.id} className="flex justify-between items-center p-2 bg-white rounded-md border group">
                                    <div>
                                        <p className="font-semibold text-sm">{kamar.nama}</p>
                                        <p className="text-xs text-gray-500">Kapasitas: {penghuni}/{kamar.kapasitas} | Musyrif: {musyrif?.nama || '-'}</p>
                                    </div>
                                    {canWrite && (
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setKamarModalData({ mode: 'edit', item: kamar, gedungId: gedung.id })} className="text-blue-500 text-xs"><i className="bi bi-pencil-square"></i></button>
                                            <button onClick={() => handleDeleteKamar(kamar.id)} className="text-red-500 text-xs"><i className="bi bi-trash-fill"></i></button>
                                        </div>
                                    )}
                                </div>
                            )})}
                            {canWrite && (
                                <button onClick={() => setKamarModalData({ mode: 'add', item: null, gedungId: gedung.id })} className="text-sm text-teal-600 hover:text-teal-800 font-medium mt-2">+ Tambah Kamar</button>
                            )}
                        </div>
                    </div>
                ))}
                {settings.gedungAsrama.length === 0 && <p className="text-center text-gray-500 py-10">Belum ada gedung yang ditambahkan.</p>}
            </div>
            {gedungModalData && <GedungModal isOpen={!!gedungModalData} onClose={() => setGedungModalData(null)} onSave={handleSaveGedung} gedungData={gedungModalData.item} />}
            {kamarModalData && <KamarModal isOpen={!!kamarModalData} onClose={() => setKamarModalData(null)} onSave={handleSaveKamar} kamarData={kamarModalData.item} gedungId={kamarModalData.gedungId} />}
         </div>
    );
};

const PenempatanSantri: React.FC = () => {
     const { settings, santriList, onBulkUpdateSantri, showToast, showAlert, showConfirmation, currentUser } = useAppContext();
    const { gedungAsrama, kamar, jenjang, kelas, rombel } = settings;
    
    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keasramaan === 'write';

    const [filters, setFilters] = useState({ jenjang: '', kelas: '', rombel: '', gender: '' });
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);

    const santriTanpaKamar = useMemo(() => {
        return santriList.filter(s =>
            !s.kamarId &&
            s.status === 'Aktif' &&
            (!filters.jenjang || s.jenjangId === parseInt(filters.jenjang)) &&
            (!filters.kelas || s.kelasId === parseInt(filters.kelas)) &&
            (!filters.rombel || s.rombelId === parseInt(filters.rombel)) &&
            (!filters.gender || s.jenisKelamin === filters.gender)
        );
    }, [santriList, filters]);

    const penghuniPerKamar = useMemo(() => {
        const map = new Map<number, Santri[]>();
        santriList.forEach(s => {
            if (s.kamarId) {
                if (!map.has(s.kamarId)) map.set(s.kamarId, []);
                map.get(s.kamarId)!.push(s);
            }
        });
        return map;
    }, [santriList]);
    
    const handleSelectSantri = (id: number) => {
        setSelectedSantriIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleTempatkan = async (targetKamar: Kamar) => {
        const penghuniSaatIni = penghuniPerKamar.get(targetKamar.id)?.length || 0;
        const sisaKapasitas = targetKamar.kapasitas - penghuniSaatIni;

        if (selectedSantriIds.length > sisaKapasitas) {
            showAlert('Kapasitas Tidak Cukup', `Kamar ${targetKamar.nama} hanya memiliki sisa ${sisaKapasitas} tempat, tetapi Anda memilih ${selectedSantriIds.length} santri.`);
            return;
        }

        const gedung = gedungAsrama.find(g => g.id === targetKamar.gedungId);
        const santriToPlace = santriList.filter(s => selectedSantriIds.includes(s.id));
        const genderMismatch = santriToPlace.some(s => (s.jenisKelamin === 'Laki-laki' && gedung?.jenis === 'Putri') || (s.jenisKelamin === 'Perempuan' && gedung?.jenis === 'Putra'));
        
        if (genderMismatch) {
            showAlert('Jenis Kelamin Tidak Sesuai', `Gedung ${gedung?.nama} hanya untuk santri ${gedung?.jenis.toLowerCase()}. Harap periksa kembali pilihan Anda.`);
            return;
        }
        
        const updatedSantri = santriToPlace.map(s => ({ ...s, kamarId: targetKamar.id }));
        try {
            await onBulkUpdateSantri(updatedSantri);
            showToast(`${updatedSantri.length} santri berhasil ditempatkan di kamar ${targetKamar.nama}.`, 'success');
            setSelectedSantriIds([]);
        } catch (e) {
            showToast('Gagal menempatkan santri.', 'error');
        }
    };
    
    const handleKeluarkan = (santri: Santri) => {
        showConfirmation(
            `Keluarkan ${santri.namaLengkap}?`,
            `Anda yakin ingin mengeluarkan santri ini dari kamarnya? Santri akan masuk ke daftar "Tanpa Kamar".`,
            async () => {
                try {
                    await onBulkUpdateSantri([{ ...santri, kamarId: undefined }]);
                    showToast(`${santri.namaLengkap} berhasil dikeluarkan dari kamar.`, 'success');
                } catch(e) {
                    showToast('Gagal mengeluarkan santri.', 'error');
                }
            },
            { confirmText: 'Ya, Keluarkan', confirmColor: 'red' }
        );
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-700 mb-4">Santri Tanpa Kamar ({santriTanpaKamar.length})</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <select value={filters.gender} onChange={e => setFilters(f => ({...f, gender: e.target.value}))} className="bg-gray-50 border p-2 text-sm rounded-lg"><option value="">Semua Gender</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select>
                     <select value={filters.jenjang} onChange={e => setFilters(f => ({...f, jenjang: e.target.value, kelas: '', rombel: ''}))} className="bg-gray-50 border p-2 text-sm rounded-lg"><option value="">Semua Jenjang</option>{jenjang.map(j=><option key={j.id} value={j.id}>{j.nama}</option>)}</select>
                </div>
                 <div className="max-h-96 overflow-y-auto border rounded-md divide-y">
                     {santriTanpaKamar.map(s => (
                        <div key={s.id} className="flex items-center p-2 hover:bg-gray-50">
                            <input type="checkbox" checked={selectedSantriIds.includes(s.id)} onChange={() => handleSelectSantri(s.id)} disabled={!canWrite} className="h-4 w-4 text-teal-600 rounded mr-3 disabled:text-gray-300"/>
                            <div className={!canWrite ? "opacity-60" : ""}>
                                <p className="font-semibold text-sm">{s.namaLengkap}</p>
                                <p className="text-xs text-gray-500">{rombel.find(r=>r.id === s.rombelId)?.nama}</p>
                            </div>
                        </div>
                     ))}
                     {santriTanpaKamar.length === 0 && <p className="text-center text-gray-500 p-8">Semua santri aktif sudah memiliki kamar.</p>}
                </div>
            </div>
             <div className="bg-white p-6 rounded-lg shadow-md">
                 <h3 className="text-xl font-bold text-gray-700 mb-4">Daftar Kamar Asrama</h3>
                 {!canWrite && <p className="text-sm text-yellow-600 mb-2 italic">Mode Lihat Saja (Read-Only)</p>}
                 <div className="max-h-[30rem] overflow-y-auto space-y-4">
                    {gedungAsrama.map(gedung => (
                        <div key={gedung.id} className="p-3 border rounded-lg">
                            <h4 className="font-bold text-gray-800">{gedung.nama} <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${gedung.jenis === 'Putra' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>{gedung.jenis}</span></h4>
                            <div className="mt-2 space-y-2">
                                {kamar.filter(k => k.gedungId === gedung.id).map(k => {
                                    const penghuni = penghuniPerKamar.get(k.id) || [];
                                    const isFull = penghuni.length >= k.kapasitas;
                                    return (
                                    <div key={k.id} className="p-3 bg-gray-50 rounded-md border">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-gray-700">{k.nama}</p>
                                                <p className="text-xs text-gray-500">Kapasitas: {penghuni.length}/{k.kapasitas}</p>
                                            </div>
                                            <button onClick={() => handleTempatkan(k)} disabled={selectedSantriIds.length === 0 || isFull || !canWrite} className="px-3 py-1 bg-teal-600 text-white rounded-md text-xs font-semibold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed">Tempatkan ({selectedSantriIds.length})</button>
                                        </div>
                                        {penghuni.length > 0 && <div className="mt-2 pt-2 border-t text-sm space-y-1">
                                            {penghuni.map(s => (
                                                <div key={s.id} className="flex justify-between items-center group">
                                                    <p>{s.namaLengkap}</p>
                                                    {canWrite && (
                                                        <button onClick={() => handleKeluarkan(s)} className="text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <i className="bi bi-box-arrow-right"></i> Keluarkan
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>}
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                 </div>
             </div>
        </div>
    );
};

const Asrama: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'manajemen' | 'penempatan'>('dashboard');

    const TabButton: React.FC<{ tabId: string, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId as any)}
            className={`py-3 px-5 font-medium text-sm border-b-2 ${activeTab === tabId ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            {label}
        </button>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Manajemen Keasramaan</h1>

            <div className="mb-6 border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                    <TabButton tabId="dashboard" label="Dashboard Asrama" />
                    <TabButton tabId="manajemen" label="Manajemen Asrama" />
                    <TabButton tabId="penempatan" label="Penempatan Santri" />
                </nav>
            </div>

            {activeTab === 'dashboard' && <AsramaDashboard />}
            {activeTab === 'manajemen' && <ManajemenAsrama />}
            {activeTab === 'penempatan' && <PenempatanSantri />}
        </div>
    );
};

export default Asrama;
