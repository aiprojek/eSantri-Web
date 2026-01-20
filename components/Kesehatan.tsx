
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { KesehatanRecord, Obat, ResepItem, Santri, PondokSettings } from '../types';
import { printToPdfNative } from '../utils/pdfGenerator';
import { PrintHeader } from './common/PrintHeader';
import { formatDate } from '../utils/formatters';

// --- PRINT TEMPLATE ---

const SuratSakitTemplate: React.FC<{ record: KesehatanRecord; santri: Santri; settings: PondokSettings }> = ({ record, santri, settings }) => {
    return (
        <div className="bg-white p-8 font-sans text-black printable-content-wrapper" style={{ width: '21cm', minHeight: '14.8cm' }}> {/* Setengah A4 (A5) landscape-ish look */}
            <PrintHeader settings={settings} title="SURAT KETERANGAN SAKIT" />
            
            <div className="mt-6 text-sm leading-relaxed">
                <p>Yang bertanda tangan di bawah ini, Petugas Kesehatan {settings.namaPonpes} menerangkan bahwa:</p>
                
                <table className="w-full my-4 ml-4">
                    <tbody>
                        <tr><td className="w-32 font-bold py-1">Nama</td><td>: {santri.namaLengkap}</td></tr>
                        <tr><td className="font-bold py-1">NIS</td><td>: {santri.nis}</td></tr>
                        <tr><td className="font-bold py-1">Kamar/Asrama</td><td>: {santri.kamarId ? settings.kamar.find(k=>k.id===santri.kamarId)?.nama : '-'}</td></tr>
                    </tbody>
                </table>

                <p>Berdasarkan hasil pemeriksaan pada tanggal <strong>{formatDate(record.tanggal)}</strong>, santri tersebut didiagnosa mengalami:</p>
                <div className="font-bold text-lg my-2 ml-4">{record.diagnosa}</div>
                
                <p>Dinyatakan <strong>PERLU ISTIRAHAT / {record.status.toUpperCase()}</strong> selama masa pemulihan.</p>
                
                {record.catatan && (
                    <div className="mt-4 p-3 border border-gray-300 rounded bg-gray-50 text-xs">
                        <strong>Catatan Medis:</strong> {record.catatan}
                    </div>
                )}
            </div>

            <div className="flex justify-end mt-12 px-4">
                <div className="text-center w-48 text-sm">
                    <p>{settings.alamat.split(',')[1]?.trim() || 'Tempat'}, {formatDate(record.tanggal)}</p>
                    <p>Pemeriksa,</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{record.pemeriksa}</p>
                </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-gray-400 text-center text-[8pt] text-gray-500 italic">
                Dokumen ini dicetak otomatis oleh sistem eSantri Web.
            </div>
        </div>
    );
};

// --- SUB COMPONENTS ---

const StokObatView: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
    const { showToast, showConfirmation } = useAppContext();
    const obatList = useLiveQuery(() => db.obat.filter(o => !o.deleted).toArray(), []) || [];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingObat, setEditingObat] = useState<Obat | null>(null);

    const { register, handleSubmit, reset } = useForm<Obat>();

    const openModal = (obat: Obat | null) => {
        if (obat) {
            setEditingObat(obat);
            reset(obat);
        } else {
            setEditingObat(null);
            reset({ nama: '', jenis: 'Tablet', stok: 0, satuan: 'strip', keterangan: '' });
        }
        setIsModalOpen(true);
    };

    const onSubmit = async (data: Obat) => {
        try {
            if (editingObat) {
                await db.obat.put({ ...data, id: editingObat.id, lastModified: Date.now() });
                showToast('Data obat diperbarui.', 'success');
            } else {
                await db.obat.add({ ...data, id: Date.now(), lastModified: Date.now() });
                showToast('Obat baru ditambahkan.', 'success');
            }
            setIsModalOpen(false);
        } catch (e) {
            showToast('Gagal menyimpan data.', 'error');
        }
    };

    const handleDelete = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Obat?', 'Data obat akan dihapus permanen.', async () => {
            await db.obat.put({ ...obatList.find(o => o.id === id)!, deleted: true, lastModified: Date.now() });
            showToast('Obat dihapus.', 'success');
        }, { confirmColor: 'red' });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Stok Obat & Inventaris Medis</h3>
                {canWrite && (
                    <button onClick={() => openModal(null)} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 flex items-center gap-2">
                        <i className="bi bi-plus-lg"></i> Tambah Obat
                    </button>
                )}
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                            <th className="p-3">Nama Obat</th>
                            <th className="p-3">Jenis</th>
                            <th className="p-3 text-center">Stok</th>
                            <th className="p-3">Satuan</th>
                            <th className="p-3">Keterangan</th>
                            <th className="p-3 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {obatList.map(obat => (
                            <tr key={obat.id} className="hover:bg-gray-50">
                                <td className="p-3 font-medium">{obat.nama}</td>
                                <td className="p-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{obat.jenis}</span></td>
                                <td className={`p-3 text-center font-bold ${obat.stok < 5 ? 'text-red-600' : 'text-green-600'}`}>{obat.stok}</td>
                                <td className="p-3 text-gray-500">{obat.satuan}</td>
                                <td className="p-3 text-gray-500 truncate max-w-xs">{obat.keterangan || '-'}</td>
                                <td className="p-3 text-center flex justify-center gap-2">
                                    {canWrite && (
                                        <>
                                            <button onClick={() => openModal(obat)} className="text-blue-600 hover:text-blue-800"><i className="bi bi-pencil-square"></i></button>
                                            <button onClick={() => handleDelete(obat.id)} className="text-red-600 hover:text-red-800"><i className="bi bi-trash"></i></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {obatList.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500 italic">Belum ada data obat.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b font-bold text-gray-800">{editingObat ? 'Edit Obat' : 'Tambah Obat Baru'}</div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Nama Obat</label><input {...register('nama', { required: true })} className="w-full border rounded p-2 text-sm" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Jenis</label><select {...register('jenis')} className="w-full border rounded p-2 text-sm"><option value="Tablet">Tablet</option><option value="Sirup">Sirup</option><option value="Salep">Salep</option><option value="Alat">Alat Medis</option><option value="Lainnya">Lainnya</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Satuan</label><input {...register('satuan')} className="w-full border rounded p-2 text-sm" placeholder="strip/botol" /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Stok Awal</label><input type="number" {...register('stok', { valueAsNumber: true })} className="w-full border rounded p-2 text-sm" /></div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Keterangan</label><textarea {...register('keterangan')} className="w-full border rounded p-2 text-sm" rows={2}></textarea></div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const RekamMedisView: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
    const { santriList } = useSantriContext();
    const { showToast, showConfirmation, currentUser, settings } = useAppContext();
    const records = useLiveQuery(() => db.kesehatanRecords.filter(r => !r.deleted).reverse().sortBy('tanggal'), []) || [];
    const obatList = useLiveQuery(() => db.obat.filter(o => !o.deleted && o.stok > 0).toArray(), []) || [];
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchSantri, setSearchSantri] = useState('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
    const [editingRecord, setEditingRecord] = useState<KesehatanRecord | null>(null);
    
    // Print State
    const [previewRecord, setPreviewRecord] = useState<{ record: KesehatanRecord, santri: Santri } | null>(null);
    
    // Resep State
    const [resepList, setResepList] = useState<ResepItem[]>([]);
    const [selectedObatId, setSelectedObatId] = useState<string>('');
    const [jumlahObat, setJumlahObat] = useState(1);
    const [dosisObat, setDosisObat] = useState('3x1');

    const { register, handleSubmit, reset, setValue } = useForm<KesehatanRecord>();

    const filteredSantri = useMemo(() => {
        if (!searchSantri) return [];
        return santriList.filter(s => s.status === 'Aktif' && (s.namaLengkap.toLowerCase().includes(searchSantri.toLowerCase()) || s.nis.includes(searchSantri))).slice(0, 10);
    }, [santriList, searchSantri]);

    // Derived state for selected santri detail to show warnings
    const selectedSantriData = useMemo(() => {
        return santriList.find(s => s.id === selectedSantriId);
    }, [selectedSantriId, santriList]);

    const handleAddRecord = () => {
        setEditingRecord(null);
        reset({
            tanggal: new Date().toISOString().split('T')[0],
            keluhan: '', diagnosa: '', tindakan: '', status: 'Rawat Jalan', pemeriksa: currentUser?.fullName || '', catatan: ''
        });
        setSelectedSantriId(null);
        setSearchSantri('');
        setResepList([]);
        setSelectedObatId('');
        setIsModalOpen(true);
    };

    const handleEditRecord = (record: KesehatanRecord) => {
        setEditingRecord(record);
        const santri = santriList.find(s => s.id === record.santriId);
        setSelectedSantriId(record.santriId);
        setSearchSantri(santri ? santri.namaLengkap : '');
        setResepList(record.resep || []);
        
        reset({
            tanggal: record.tanggal,
            keluhan: record.keluhan,
            diagnosa: record.diagnosa,
            tindakan: record.tindakan, 
            status: record.status,
            pemeriksa: record.pemeriksa,
            catatan: record.catatan
        });
        setIsModalOpen(true);
    };

    const handlePrintRecord = (record: KesehatanRecord) => {
        const santri = santriList.find(s => s.id === record.santriId);
        if (santri) {
            setPreviewRecord({ record, santri });
            // Small delay to allow DOM render before print trigger
            setTimeout(() => {
                printToPdfNative('surat-sakit-preview', `Surat_Sakit_${santri.namaLengkap}_${record.tanggal}`);
            }, 300);
        }
    };

    const handleDeleteRecord = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Data?', 'Data pemeriksaan akan dihapus dan stok obat akan DIKEMBALIKAN ke gudang.', async () => {
            try {
                await (db as any).transaction('rw', db.kesehatanRecords, db.obat, async () => {
                    const record = await db.kesehatanRecords.get(id);
                    if (record && record.resep && record.resep.length > 0) {
                        // Restore Stock
                        for (const item of record.resep) {
                            const obat = await db.obat.get(item.obatId);
                            if (obat) {
                                await db.obat.update(obat.id, { stok: obat.stok + item.jumlah, lastModified: Date.now() });
                            }
                        }
                    }
                    await db.kesehatanRecords.update(id, { deleted: true, lastModified: Date.now() });
                });
                showToast('Data dihapus & stok dikembalikan.', 'success');
            } catch (e) {
                showToast('Gagal menghapus data.', 'error');
            }
        }, { confirmColor: 'red' });
    };

    const handleAddObatToResep = () => {
        if (!selectedObatId) return;
        const obat = obatList.find(o => o.id === Number(selectedObatId));
        if (!obat) return;

        if (jumlahObat > obat.stok) {
            alert(`Stok di gudang saat ini hanya: ${obat.stok}.`);
            return;
        }

        const newItem: ResepItem = {
            obatId: obat.id,
            namaObat: obat.nama,
            jumlah: jumlahObat,
            dosis: dosisObat
        };

        setResepList(prev => [...prev, newItem]);
        setSelectedObatId('');
        setJumlahObat(1);
        setDosisObat('3x1');
    };

    const handleRemoveResep = (index: number) => {
        setResepList(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: KesehatanRecord) => {
        if (!selectedSantriId) {
            alert("Pilih santri terlebih dahulu.");
            return;
        }

        if (selectedObatId) {
            const confirmSkip = window.confirm("Anda memilih obat di dropdown tapi belum menekan tombol Tambah (+). Obat ini TIDAK akan dicatat. Lanjutkan?");
            if (!confirmSkip) return;
        }
        
        try {
            let absensiUpdated = false;

            // Masukkan 'db.absensi' ke dalam transaction agar atomik
            await (db as any).transaction('rw', db.kesehatanRecords, db.obat, db.absensi, async () => {
                
                // 1. STOK MANAGEMENT (Sama seperti sebelumnya)
                if (editingRecord && editingRecord.resep && editingRecord.resep.length > 0) {
                     for (const item of editingRecord.resep) {
                        const obat = await db.obat.get(item.obatId);
                        if (obat) {
                            await db.obat.update(obat.id, { stok: obat.stok + item.jumlah }); 
                        }
                    }
                }

                for (const item of resepList) {
                    const obat = await db.obat.get(item.obatId);
                    if (obat) {
                        const currentStok = Number(obat.stok);
                        const qty = Number(item.jumlah);
                        if (currentStok < qty) throw new Error(`Stok ${obat.nama} tidak mencukupi (Sisa: ${currentStok}).`);
                        await db.obat.update(obat.id, { stok: currentStok - qty, lastModified: Date.now() });
                    }
                }

                // 2. FORMAT TINDAKAN
                let tindakanFinal = data.tindakan || '';
                if (resepList.length > 0) {
                    const resepStr = resepList.map(r => `${r.namaObat} (${r.jumlah}) ${r.dosis}`).join(', ');
                    if (!tindakanFinal.includes(resepStr)) {
                         tindakanFinal = tindakanFinal ? `${tindakanFinal}. Obat: ${resepStr}` : `Obat: ${resepStr}`;
                    }
                }

                // 3. SIMPAN RECORD
                const recordData = {
                    ...data,
                    tindakan: tindakanFinal,
                    resep: resepList,
                    santriId: selectedSantriId,
                    lastModified: Date.now()
                };

                if (editingRecord) {
                    await db.kesehatanRecords.put({ ...recordData, id: editingRecord.id });
                } else {
                    await db.kesehatanRecords.add({ ...recordData, id: Date.now() });
                }

                // 4. INTEGRASI ABSENSI OTOMATIS
                // Jika status BUKAN 'Sembuh', catat sebagai SAKIT di Absensi
                if (data.status !== 'Sembuh') {
                    const santri = santriList.find(s => s.id === selectedSantriId);
                    if (santri) {
                        // Cari absensi existing di tanggal tersebut
                        const existingAbsen = await db.absensi
                            .where({ santriId: santri.id })
                            .filter(a => a.tanggal === data.tanggal)
                            .first();

                        const keteranganAbsen = `[Poskestren] ${data.status}: ${data.diagnosa}`;

                        if (existingAbsen) {
                            // Update jika belum ada atau overwrite
                            await db.absensi.update(existingAbsen.id, {
                                status: 'S', // Force Sakit
                                keterangan: keteranganAbsen,
                                lastModified: Date.now()
                            });
                        } else {
                            // Buat baru
                            await db.absensi.add({
                                id: Date.now() + Math.random(),
                                santriId: santri.id,
                                rombelId: santri.rombelId,
                                tanggal: data.tanggal,
                                status: 'S',
                                keterangan: keteranganAbsen,
                                recordedBy: currentUser?.username || 'Poskestren',
                                lastModified: Date.now()
                            });
                        }
                        absensiUpdated = true;
                    }
                }
            });

            const msgParts = ['Data disimpan'];
            if (resepList.length > 0) msgParts.push('stok dikurangi');
            if (absensiUpdated) msgParts.push('absensi dicatat SAKIT');
            
            showToast(msgParts.join(', ') + '.', 'success');
            setIsModalOpen(false);

        } catch (e: any) {
            showToast(`Gagal: ${e.message}`, 'error');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Riwayat Kesehatan Santri</h3>
                {canWrite && (
                    <button onClick={handleAddRecord} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-700 flex items-center gap-2">
                        <i className="bi bi-clipboard2-pulse"></i> Catat Pemeriksaan
                    </button>
                )}
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">Nama Santri</th>
                            <th className="p-3">Keluhan & Diagnosa</th>
                            <th className="p-3">Tindakan / Obat</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {records.map(rec => {
                            const santri = santriList.find(s => s.id === rec.santriId);
                            return (
                                <tr key={rec.id} className="hover:bg-gray-50">
                                    <td className="p-3 whitespace-nowrap text-gray-500">{new Date(rec.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3 font-medium">{santri ? santri.namaLengkap : 'Unknown'}</td>
                                    <td className="p-3">
                                        <div className="font-bold text-xs text-red-600">{rec.diagnosa}</div>
                                        <div className="text-xs text-gray-500">{rec.keluhan}</div>
                                    </td>
                                    <td className="p-3 text-gray-700 text-xs max-w-xs">{rec.tindakan}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            rec.status === 'Sembuh' ? 'bg-green-100 text-green-700' :
                                            rec.status === 'Rawat Inap (Pondok)' ? 'bg-yellow-100 text-yellow-700' :
                                            rec.status === 'Rujuk RS/Klinik' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                                        }`}>
                                            {rec.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handlePrintRecord(rec)} className="text-gray-600 hover:text-gray-900" title="Cetak Surat Sakit"><i className="bi bi-printer-fill"></i></button>
                                            {canWrite && (
                                                <>
                                                    <button onClick={() => handleEditRecord(rec)} className="text-blue-600 hover:text-blue-800" title="Edit"><i className="bi bi-pencil-square"></i></button>
                                                    <button onClick={() => handleDeleteRecord(rec.id)} className="text-red-600 hover:text-red-800" title="Hapus"><i className="bi bi-trash"></i></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                         {records.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500 italic">Belum ada riwayat pemeriksaan.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Modal Input/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b font-bold text-gray-800">{editingRecord ? 'Edit Pemeriksaan' : 'Catat Pemeriksaan'}</div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 overflow-y-auto flex-grow">
                            
                            {/* Santri Selector */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-600 mb-1">Cari Santri</label>
                                <input 
                                    type="text" 
                                    value={searchSantri}
                                    onChange={e => { setSearchSantri(e.target.value); setSelectedSantriId(null); }}
                                    className={`w-full border rounded p-2 text-sm ${selectedSantriId ? 'bg-green-50 border-green-500' : ''}`}
                                    placeholder="Ketik nama..."
                                />
                                {selectedSantriId && <i className="bi bi-check-circle-fill text-green-600 absolute right-3 top-8"></i>}
                                {searchSantri && !selectedSantriId && (
                                    <div className="absolute z-10 w-full bg-white border shadow-lg rounded mt-1 max-h-40 overflow-y-auto">
                                        {filteredSantri.map(s => (
                                            <div key={s.id} onClick={() => { setSelectedSantriId(s.id); setSearchSantri(s.namaLengkap); }} className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b">
                                                {s.namaLengkap} <span className="text-xs text-gray-400">({s.nis})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Medical Alert */}
                            {selectedSantriData?.riwayatPenyakit && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-800 animate-pulse">
                                    <div className="font-bold flex items-center gap-2"><i className="bi bi-exclamation-triangle-fill"></i> PERHATIAN MEDIS</div>
                                    <p>Santri ini memiliki riwayat: <strong>{selectedSantriData.riwayatPenyakit}</strong>. Mohon cek sebelum memberi obat.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Tanggal</label><input type="date" {...register('tanggal')} className="w-full border rounded p-2 text-sm" /></div>
                                <div><label className="block text-xs font-bold text-gray-600 mb-1">Status</label><select {...register('status')} className="w-full border rounded p-2 text-sm"><option value="Rawat Jalan">Rawat Jalan</option><option value="Rawat Inap (Pondok)">Rawat Inap (Pondok)</option><option value="Rujuk RS/Klinik">Rujuk RS/Klinik</option><option value="Sembuh">Sembuh</option></select></div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Keluhan</label><textarea {...register('keluhan', { required: true })} className="w-full border rounded p-2 text-sm" rows={2} placeholder="Sakit kepala, demam..."></textarea></div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Diagnosa</label><input type="text" {...register('diagnosa')} className="w-full border rounded p-2 text-sm" placeholder="Demam biasa, Flu..." /></div>
                            
                            {/* Obat Section */}
                            <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                <label className="block text-xs font-bold text-blue-800 mb-2"><i className="bi bi-capsule"></i> Resep Obat (Kurangi Stok)</label>
                                <div className="flex gap-2 mb-2 items-end">
                                    <div className="flex-grow">
                                        <select value={selectedObatId} onChange={e => setSelectedObatId(e.target.value)} className="w-full text-xs border rounded p-1.5 h-8">
                                            <option value="">-- Pilih Obat --</option>
                                            {obatList.map(o => <option key={o.id} value={o.id}>{o.nama} (Sisa: {o.stok})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <input type="number" value={jumlahObat} onChange={e => setJumlahObat(Math.max(1, parseInt(e.target.value)))} className="w-12 text-xs border rounded p-1.5 text-center h-8" min="1" placeholder="Jml" />
                                    </div>
                                    <div>
                                        <input type="text" value={dosisObat} onChange={e => setDosisObat(e.target.value)} className="w-16 text-xs border rounded p-1.5 text-center h-8" placeholder="Dosis" />
                                    </div>
                                    <button type="button" onClick={handleAddObatToResep} className="bg-blue-600 text-white px-3 rounded h-8 text-xs flex items-center justify-center hover:bg-blue-700" title="Tambahkan ke daftar"><i className="bi bi-plus-lg"></i></button>
                                </div>
                                {resepList.length > 0 ? (
                                    <ul className="space-y-1 mt-2 bg-white rounded border p-1 max-h-24 overflow-y-auto">
                                        {resepList.map((r, idx) => (
                                            <li key={idx} className="flex justify-between items-center text-xs p-1 hover:bg-gray-50 border-b last:border-0">
                                                <span className="font-medium text-gray-700">{r.namaObat} <span className="text-gray-500 font-normal">({r.jumlah} {r.dosis})</span></span>
                                                <button type="button" onClick={() => handleRemoveResep(idx)} className="text-red-500 hover:text-red-700 px-1"><i className="bi bi-x"></i></button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[10px] text-gray-500 italic mt-1 text-center">Belum ada obat yang ditambahkan ke resep.</p>
                                )}
                            </div>

                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Tindakan Lain / Catatan</label><textarea {...register('tindakan')} className="w-full border rounded p-2 text-sm" rows={2} placeholder="Istirahat, kompres..."></textarea></div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Pemeriksa</label><input type="text" {...register('pemeriksa')} className="w-full border rounded p-2 text-sm" /></div>
                            
                            <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-200 mt-2">
                                <i className="bi bi-info-circle-fill mr-1"></i>
                                Jika status selain "Sembuh", sistem akan otomatis mencatat Absensi "Sakit" untuk santri ini pada tanggal yang dipilih.
                            </div>
                        </form>
                         <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded text-sm border">Batal</button>
                            <button type="button" onClick={handleSubmit(onSubmit)} className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 font-bold shadow-sm">Simpan Data</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Area */}
            {previewRecord && (
                <div className="hidden print:block">
                    <div id="surat-sakit-preview">
                        <SuratSakitTemplate record={previewRecord.record} santri={previewRecord.santri} settings={settings} />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN PAGE ---

const Kesehatan: React.FC = () => {
    const { currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<'rekam' | 'obat'>('rekam');
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.kesehatan === 'write';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Poskestren (Kesehatan)</h1>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <nav className="flex -mb-px border-b">
                    <button onClick={() => setActiveTab('rekam')} className={`flex-1 py-4 text-center font-medium text-sm border-b-2 transition-colors ${activeTab === 'rekam' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <i className="bi bi-clipboard2-pulse-fill mr-2"></i> Rekam Medis
                    </button>
                    <button onClick={() => setActiveTab('obat')} className={`flex-1 py-4 text-center font-medium text-sm border-b-2 transition-colors ${activeTab === 'obat' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <i className="bi bi-capsule mr-2"></i> Stok Obat
                    </button>
                </nav>

                <div className="p-6">
                    {activeTab === 'rekam' && <RekamMedisView canWrite={canWrite} />}
                    {activeTab === 'obat' && <StokObatView canWrite={canWrite} />}
                </div>
            </div>
        </div>
    );
};

export default Kesehatan;
