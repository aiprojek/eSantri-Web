
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { Pendaftar, PondokSettings, Santri, RiwayatStatus } from '../../types';
import { db } from '../../db';
import { fetchPsbFromDropbox } from '../../services/syncService';
import { PendaftarModal } from './modals/PendaftarModal';
import { BulkPendaftarEditor } from './modals/BulkPendaftarEditor';

interface PsbRekapProps {
    pendaftarList: Pendaftar[];
    settings: PondokSettings;
    onImportFromWA: (text: string) => void;
    onUpdateList: () => void;
    canWrite: boolean;
}

export const PsbRekap: React.FC<PsbRekapProps> = ({ pendaftarList, settings, onImportFromWA, onUpdateList, canWrite }) => {
    const { onBulkAddSantri, showToast, showConfirmation, showAlert } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterJenjang, setFilterJenjang] = useState('');
    const [waInput, setWaInput] = useState('');
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [isPendaftarModalOpen, setIsPendaftarModalOpen] = useState(false);
    const [editingPendaftar, setEditingPendaftar] = useState<Pendaftar | null>(null);
    const [isBulkEditorOpen, setIsBulkEditorOpen] = useState(false);

    const filteredData = useMemo(() => {
        return pendaftarList.filter(p => {
            const matchSearch = p.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               (p.nisn && p.nisn.includes(searchTerm));
            const matchJenjang = !filterJenjang || p.jenjangId === parseInt(filterJenjang);
            return matchSearch && matchJenjang;
        });
    }, [pendaftarList, searchTerm, filterJenjang]);

    const handleCloudSync = async () => {
        if (!canWrite) return;
        const config = settings.cloudSyncConfig;
        if (!config || config.provider === 'none') {
            showAlert('Konfigurasi Cloud Belum Aktif', 'Silakan aktifkan Dropbox di menu Pengaturan untuk menggunakan fitur tarik data otomatis.');
            return;
        }

        setIsSyncing(true);
        try {
            let newItems: Omit<Pendaftar, 'id'>[] = [];
            
            if (config.provider === 'dropbox') {
                newItems = await fetchPsbFromDropbox(config.dropboxToken!);
            }

            if (newItems.length > 0) {
                await db.pendaftar.bulkAdd(newItems as Pendaftar[]);
                onUpdateList();
                showToast(`${newItems.length} data pendaftar baru ditarik dari Cloud.`, 'success');
            } else {
                showToast('Tidak ada data pendaftaran baru di Cloud.', 'info');
            }
        } catch (e: any) {
            showAlert('Gagal Sinkronisasi', e.message);
        } finally {
            setIsSyncing(false);
        }
    }

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
            status: 'Baru',
            kewarganegaraan: data.kewarganegaraan || 'WNI',
            gelombang: settings.psbConfig.activeGelombang
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
        showConfirmation('Terima Sebagai Santri?', `Pindahkan ${pendaftar.namaLengkap} ke Database Santri Aktif? Data akan disalin dan status pendaftar akan berubah menjadi "Diterima".`, async () => {
            
            // Initial Status History Entry
            const firstRiwayat: RiwayatStatus = {
                id: Date.now(),
                status: 'Masuk',
                tanggal: new Date().toISOString().split('T')[0],
                keterangan: 'Diterima melalui Jalur Pendaftaran Online (PSB)'
            };

            const newSantri: Omit<Santri, 'id'> = {
                namaLengkap: pendaftar.namaLengkap,
                namaHijrah: pendaftar.namaHijrah,
                nis: '', // Will be generated or filled later by admin
                nisn: pendaftar.nisn,
                nik: pendaftar.nik,
                tempatLahir: pendaftar.tempatLahir,
                tanggalLahir: pendaftar.tanggalLahir,
                jenisKelamin: pendaftar.jenisKelamin,
                kewarganegaraan: (pendaftar.kewarganegaraan as 'WNI' | 'WNA' | 'Keturunan') || 'WNI',
                fotoUrl: 'https://placehold.co/150x200/e2e8f0/334155?text=Foto', // Default Placeholder
                
                // Address Mapping
                alamat: { 
                    detail: pendaftar.alamat, 
                    desaKelurahan: pendaftar.desaKelurahan, 
                    kecamatan: pendaftar.kecamatan, 
                    kabupatenKota: pendaftar.kabupatenKota, 
                    provinsi: pendaftar.provinsi, 
                    kodePos: pendaftar.kodePos 
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
                statusWali: pendaftar.hubunganWali,
                statusHidupWali: pendaftar.statusHidupWali,
                pekerjaanWali: pendaftar.pekerjaanWali,
                pendidikanWali: pendaftar.pendidikanWali,
                penghasilanWali: pendaftar.penghasilanWali,

                // Academic & Status
                jenjangId: pendaftar.jenjangId,
                kelasId: 0, // 0 means unassigned
                rombelId: 0, // 0 means unassigned
                status: 'Aktif',
                tanggalMasuk: new Date().toISOString().split('T')[0],
                sekolahAsal: pendaftar.asalSekolah,
                alamatSekolahAsal: pendaftar.alamatSekolahAsal,
                
                // Extra
                statusKeluarga: pendaftar.statusKeluarga,
                anakKe: pendaftar.anakKe,
                jumlahSaudara: pendaftar.jumlahSaudara,
                berkebutuhanKhusus: pendaftar.berkebutuhanKhusus,
                riwayatStatus: [firstRiwayat]
            };
            
            try {
                await onBulkAddSantri([newSantri]);
                await db.pendaftar.update(pendaftar.id, { status: 'Diterima' });
                onUpdateList();
                showToast(`${pendaftar.namaLengkap} berhasil diterima. Silakan atur kelas di menu Data Santri.`, 'success');
            } catch(e) {
                console.error(e);
                showToast('Gagal memindahkan data ke database santri.', 'error');
            }
        }, { confirmColor: 'green', confirmText: 'Ya, Terima Santri' });
    }

    const handleSavePendaftar = async (data: Omit<Pendaftar, 'id'>) => {
        await db.pendaftar.add(data as Pendaftar);
        onUpdateList();
        showToast('Pendaftar berhasil ditambahkan', 'success');
    }

    const handleUpdatePendaftar = async (data: Pendaftar) => {
        await db.pendaftar.put(data);
        onUpdateList();
        showToast('Data pendaftar diperbarui', 'success');
    }

    const handleBulkSave = async (data: Partial<Pendaftar>[]) => {
        const newItems = data.map(d => ({
            ...d,
            status: d.status || 'Baru',
            tanggalDaftar: d.tanggalDaftar || new Date().toISOString(),
            jalurPendaftaran: d.jalurPendaftaran || 'Reguler'
        } as Pendaftar));
        
        await db.pendaftar.bulkAdd(newItems as Pendaftar[]);
        onUpdateList();
        showToast(`${newItems.length} pendaftar ditambahkan.`, 'success');
    }

    const handleOpenDocument = (base64: string) => {
        const win = window.open();
        if (win) {
            win.document.write('<iframe src="' + base64 + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-700">Data Pendaftar</h2>
                        <p className="text-xs text-gray-500">Kelola dan sinkronkan data santri baru.</p>
                    </div>
                    {canWrite && (
                        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                            <button 
                                onClick={handleCloudSync} 
                                disabled={isSyncing}
                                className="flex-grow lg:flex-grow-0 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm disabled:bg-blue-400"
                            >
                                {isSyncing ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-cloud-download"></i>}
                                Tarik Data Cloud
                            </button>
                            <button onClick={() => setIsWaModalOpen(true)} className="flex-grow lg:flex-grow-0 bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 flex items-center justify-center gap-2">
                                <i className="bi bi-whatsapp"></i> Impor WA
                            </button>
                            <button onClick={() => { setEditingPendaftar(null); setIsPendaftarModalOpen(true); }} className="flex-grow lg:flex-grow-0 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 flex items-center justify-center gap-2">
                                <i className="bi bi-plus-lg"></i> Tambah
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari nama atau NISN..." className="flex-grow border rounded-lg p-2.5 text-sm"/>
                    <select value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)} className="border rounded-lg p-2.5 text-sm sm:w-48">
                        <option value="">Semua Jenjang</option>
                        {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                            <tr>
                                <th className="p-3 w-10">No</th>
                                <th className="p-3">Nama Lengkap</th>
                                <th className="p-3">Jenjang</th>
                                <th className="p-3">Wali & Kontak</th>
                                <th className="p-3 text-center">Dokumen</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredData.map((p, idx) => {
                                const customData = p.customData ? JSON.parse(p.customData) : {};
                                const files = Object.keys(customData).filter(key => customData[key]?.startsWith('data:'));
                                
                                return (
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-center">{idx + 1}</td>
                                        <td className="p-3 font-medium">
                                            {p.namaLengkap}
                                            <div className="text-xs text-gray-500">{new Date(p.tanggalDaftar).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-3">{settings.jenjang.find(j => j.id === p.jenjangId)?.nama || '-'}</td>
                                        <td className="p-3">
                                            <div className="font-medium">{p.namaWali}</div>
                                            <div className="text-xs text-gray-500">{p.nomorHpWali}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            {files.length > 0 ? (
                                                <div className="flex flex-wrap justify-center gap-1">
                                                    {files.map(fKey => (
                                                        <button 
                                                            key={fKey}
                                                            onClick={() => handleOpenDocument(customData[fKey])}
                                                            className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 text-[10px] hover:bg-blue-100"
                                                            title="Lihat Dokumen"
                                                        >
                                                            <i className="bi bi-file-earmark-pdf"></i> File
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full ${p.status === 'Baru' ? 'bg-blue-100 text-blue-800' : p.status === 'Diterima' ? 'bg-green-100 text-green-800' : p.status === 'Cadangan' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                {canWrite && p.status === 'Baru' && (
                                                    <button onClick={() => handleAccept(p)} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="Terima sebagai Santri">
                                                        <i className="bi bi-check-lg"></i>
                                                    </button>
                                                )}
                                                {canWrite && (
                                                    <>
                                                        <button onClick={() => { setEditingPendaftar(p); setIsPendaftarModalOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Edit">
                                                            <i className="bi bi-pencil-square"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Hapus">
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredData.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">Tidak ada data pendaftar.</td></tr>}
                        </tbody>
                    </table>
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

            <PendaftarModal 
                isOpen={isPendaftarModalOpen}
                onClose={() => setIsPendaftarModalOpen(false)}
                onSave={handleSavePendaftar}
                onUpdate={handleUpdatePendaftar}
                pendaftarData={editingPendaftar}
                settings={settings}
            />

            <BulkPendaftarEditor
                isOpen={isBulkEditorOpen}
                onClose={() => setIsBulkEditorOpen(false)}
                onSave={handleBulkSave}
            />
        </div>
    );
};
