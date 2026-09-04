import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { KesehatanRecord, Obat, ResepItem, Santri } from '../types';
import { printToPdfNative } from '../utils/pdfGenerator';
import { formatDate } from '../utils/formatters';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { KesehatanDashboard } from './kesehatan/KesehatanDashboard';
import {
    SuratSakitTemplate,
    SuratRujukanTemplate,
    SuratIzinPulangTemplate,
    DocumentType
} from './kesehatan/KesehatanPrintTemplates';
import { WhatsAppHealthModal } from './kesehatan/WhatsAppHealthModal';
import { MedicalPrintPreviewModal, MedicalDocumentType } from './kesehatan/MedicalPrintPreviewModal';

// --- SUB COMPONENTS: STOK OBAT ---

const StokObatView: React.FC<{ canWrite: boolean; initialFilter?: string | null }> = ({ canWrite, initialFilter }) => {
    const { showToast, showConfirmation } = useAppContext();
    const obatList = useLiveQuery(() => db.obat.filter(o => !o.deleted).toArray(), []) || [];
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingObat, setEditingObat] = useState<Obat | null>(null);
    const [searchObat, setSearchObat] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'kritis' | 'expired'>('all');

    useEffect(() => {
        if (initialFilter === 'kritis-obat') {
            setStatusFilter('kritis');
        }
    }, [initialFilter]);

    const { register, handleSubmit, reset } = useForm<Obat>();

    const openModal = (obat: Obat | null) => {
        if (obat) {
            setEditingObat(obat);
            reset({
                ...obat,
                stokMinimum: obat.stokMinimum ?? 5,
                tglKadaluarsa: obat.tglKadaluarsa || ''
            });
        } else {
            setEditingObat(null);
            reset({
                nama: '',
                jenis: 'Tablet',
                stok: 0,
                satuan: 'strip',
                stokMinimum: 5,
                tglKadaluarsa: '',
                keterangan: ''
            });
        }
        setIsModalOpen(true);
    };

    const onSubmit = async (data: Obat) => {
        try {
            const sanitized = {
                ...data,
                stok: Number(data.stok) || 0,
                stokMinimum: Number(data.stokMinimum) || 5,
                tglKadaluarsa: data.tglKadaluarsa || undefined,
                lastModified: Date.now()
            };

            if (editingObat) {
                await db.obat.put({ ...sanitized, id: editingObat.id });
                showToast('Data obat berhasil diperbarui.', 'success');
            } else {
                await db.obat.add({ ...sanitized, id: Date.now() });
                showToast('Obat baru berhasil ditambahkan.', 'success');
            }
            setIsModalOpen(false);
        } catch (e) {
            showToast('Gagal menyimpan data obat.', 'error');
        }
    };

    const handleDelete = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Obat?', 'Data obat akan dihapus dari inventaris.', async () => {
            const target = obatList.find(o => o.id === id);
            if (target) {
                await db.obat.put({ ...target, deleted: true, lastModified: Date.now() });
                showToast('Obat berhasil dihapus.', 'success');
            }
        }, { confirmColor: 'red' });
    };

    // Filter Logic
    const todayStr = new Date().toISOString().split('T')[0];
    const thresholdDays = 60;
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + thresholdDays);
    const futureLimitStr = futureLimit.toISOString().split('T')[0];

    const filteredObat = useMemo(() => {
        return obatList.filter(o => {
            const matchSearch = !searchObat ||
                o.nama.toLowerCase().includes(searchObat.toLowerCase()) ||
                o.jenis.toLowerCase().includes(searchObat.toLowerCase()) ||
                (o.keterangan && o.keterangan.toLowerCase().includes(searchObat.toLowerCase()));

            if (!matchSearch) return false;

            const minStok = o.stokMinimum ?? 5;
            const isLowStock = o.stok <= minStok;
            const isExpired = o.tglKadaluarsa ? o.tglKadaluarsa <= todayStr : false;
            const isExpiringSoon = o.tglKadaluarsa ? (o.tglKadaluarsa > todayStr && o.tglKadaluarsa <= futureLimitStr) : false;

            if (statusFilter === 'kritis') {
                return isLowStock;
            }
            if (statusFilter === 'expired') {
                return isExpired || isExpiringSoon;
            }
            return true;
        });
    }, [obatList, searchObat, statusFilter, todayStr, futureLimitStr]);

    const lowStockCount = obatList.filter(o => o.stok <= (o.stokMinimum ?? 5)).length;
    const expiredCount = obatList.filter(o => o.tglKadaluarsa && o.tglKadaluarsa <= futureLimitStr).length;

    return (
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-gray-200">
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Stok Obat & Inventaris Poskestren</h3>
                    <p className="text-xs text-gray-500">Kelola persediaan obat, masa kadaluarsa, dan peringatan stok menipis.</p>
                </div>
                {canWrite && (
                    <button
                        onClick={() => openModal(null)}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition"
                    >
                        <i className="bi bi-plus-lg"></i> Tambah Obat Baru
                    </button>
                )}
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 bg-gray-50/70 p-3 rounded-xl border border-gray-200">
                <div className="relative w-full sm:w-72">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <i className="bi bi-search text-xs"></i>
                    </span>
                    <input
                        type="text"
                        value={searchObat}
                        onChange={e => setSearchObat(e.target.value)}
                        placeholder="Cari nama atau jenis obat..."
                        className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                    />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                    >
                        Semua ({obatList.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('kritis')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${statusFilter === 'kritis' ? 'bg-orange-600 text-white' : 'bg-white text-orange-700 hover:bg-orange-50 border border-orange-200'}`}
                    >
                        <i className="bi bi-exclamation-circle-fill text-[11px]"></i> Stok Kritis ({lowStockCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter('expired')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${statusFilter === 'expired' ? 'bg-rose-600 text-white' : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'}`}
                    >
                        <i className="bi bi-calendar-x-fill text-[11px]"></i> Expired / Dekat ({expiredCount})
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                        <tr>
                            <th className="p-3.5">Nama Obat</th>
                            <th className="p-3.5">Jenis</th>
                            <th className="p-3.5 text-center">Stok / Min</th>
                            <th className="p-3.5">Satuan</th>
                            <th className="p-3.5">Tgl Kadaluarsa</th>
                            <th className="p-3.5">Keterangan</th>
                            <th className="p-3.5 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredObat.map(obat => {
                            const minStok = obat.stokMinimum ?? 5;
                            const isLowStock = obat.stok <= minStok;
                            const isExpired = obat.tglKadaluarsa ? obat.tglKadaluarsa <= todayStr : false;
                            const isExpiringSoon = obat.tglKadaluarsa ? (obat.tglKadaluarsa > todayStr && obat.tglKadaluarsa <= futureLimitStr) : false;

                            return (
                                <tr key={obat.id} className="hover:bg-gray-50/80 transition">
                                    <td className="p-3.5 font-bold text-gray-900">
                                        <div className="flex items-center gap-2">
                                            <span>{obat.nama}</span>
                                            {isLowStock && (
                                                <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                                    Stok Menipis
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3.5">
                                        <span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded text-[11px]">
                                            {obat.jenis}
                                        </span>
                                    </td>
                                    <td className="p-3.5 text-center">
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className={`text-sm font-bold ${isLowStock ? 'text-red-600' : 'text-emerald-700'}`}>
                                                {obat.stok}
                                            </span>
                                            <span className="text-[10px] text-gray-400">/ min {minStok}</span>
                                        </div>
                                    </td>
                                    <td className="p-3.5 text-gray-600">{obat.satuan}</td>
                                    <td className="p-3.5">
                                        {obat.tglKadaluarsa ? (
                                            <div>
                                                <span className="text-gray-700 font-medium">
                                                    {formatDate(obat.tglKadaluarsa)}
                                                </span>
                                                {isExpired && (
                                                    <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                                                        <i className="bi bi-x-circle-fill"></i> Sudah Kadaluarsa!
                                                    </div>
                                                )}
                                                {isExpiringSoon && (
                                                    <div className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                                                        <i className="bi bi-clock-history"></i> Segera Kadaluarsa
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">-</span>
                                        )}
                                    </td>
                                    <td className="p-3.5 text-gray-500 max-w-xs truncate">{obat.keterangan || '-'}</td>
                                    <td className="p-3.5 text-center">
                                        <div className="flex justify-center items-center gap-1.5">
                                            {canWrite && (
                                                <>
                                                    <button
                                                        onClick={() => openModal(obat)}
                                                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                                                        title="Edit Data Obat"
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(obat.id)}
                                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                                                        title="Hapus Obat"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredObat.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-500 italic">
                                    Tidak ada data obat yang sesuai dengan filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Input/Edit Obat */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="p-4 bg-gradient-to-r from-teal-600 to-cyan-700 text-white flex justify-between items-center">
                            <h3 className="font-bold text-sm">
                                {editingObat ? 'Edit Data Obat' : 'Tambah Obat Baru'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Nama Obat</label>
                                <input
                                    {...register('nama', { required: true })}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                    placeholder="Contoh: Paracetamol 500mg, Promag, Betadine..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Jenis Obat</label>
                                    <select
                                        {...register('jenis')}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                    >
                                        <option value="Tablet">Tablet</option>
                                        <option value="Kapsul">Kapsul</option>
                                        <option value="Sirup">Sirup</option>
                                        <option value="Salep">Salep</option>
                                        <option value="Tetes">Tetes (Mata/Telinga)</option>
                                        <option value="Inhaler">Inhaler</option>
                                        <option value="Alat">Alat Medis / P3K</option>
                                        <option value="Lainnya">Lainnya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Satuan</label>
                                    <input
                                        {...register('satuan')}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                        placeholder="strip, botol, tube, tablet..."
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Stok Saat Ini</label>
                                    <input
                                        type="number"
                                        {...register('stok', { valueAsNumber: true })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Ambang Minimum Stok</label>
                                    <input
                                        type="number"
                                        {...register('stokMinimum', { valueAsNumber: true })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                        min="1"
                                        placeholder="Default: 5"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Tanggal Kadaluarsa (Expired Date)
                                </label>
                                <input
                                    type="date"
                                    {...register('tglKadaluarsa')}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                />
                                <p className="text-[10px] text-gray-500 mt-0.5">Sistem akan memberi peringatan jika obat kadaluarsa dalam 60 hari.</p>
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Keterangan / Aturan Khusus</label>
                                <textarea
                                    {...register('keterangan')}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                    rows={2}
                                    placeholder="Simpan di suhu ruang, pereda demam dan nyeri..."
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs transition"
                                >
                                    Simpan Obat
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB COMPONENTS: REKAM MEDIS ---

const RekamMedisView: React.FC<{ canWrite: boolean; initialFilter?: string | null }> = ({ canWrite, initialFilter }) => {
    const { santriList } = useSantriContext();
    const { showToast, showConfirmation, currentUser, settings } = useAppContext();
    const records = useLiveQuery(() => db.kesehatanRecords.filter(r => !r.deleted).reverse().sortBy('tanggal'), []) || [];
    const obatList = useLiveQuery(() => db.obat.filter(o => !o.deleted && o.stok > 0).toArray(), []) || [];

    // Filter states
    const [subTab, setSubTab] = useState<'all' | 'active'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');

    useEffect(() => {
        if (initialFilter === 'rawat-inap') {
            setSubTab('active');
            setStatusFilter('Rawat Inap (Pondok)');
        } else if (initialFilter === 'rujuk') {
            setSubTab('active');
            setStatusFilter('Rujuk RS/Klinik');
        } else if (initialFilter === 'month') {
            setSubTab('all');
            setStatusFilter('all');
            setDateRangeFilter('month');
        }
    }, [initialFilter]);

    // Modal Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchSantri, setSearchSantri] = useState('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
    const [editingRecord, setEditingRecord] = useState<KesehatanRecord | null>(null);

    // Document Print States (Integrated Live Preview Modal)
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printTarget, setPrintTarget] = useState<{ record: KesehatanRecord; santri: Santri; type?: MedicalDocumentType } | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ record: KesehatanRecord; santri: Santri; type: DocumentType } | null>(null);

    // WhatsApp Modal States
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppTarget, setWhatsAppTarget] = useState<{ record: KesehatanRecord; santri: Santri } | null>(null);

    // Resep State
    const [resepList, setResepList] = useState<ResepItem[]>([]);
    const [selectedObatId, setSelectedObatId] = useState<string>('');
    const [jumlahObat, setJumlahObat] = useState(1);
    const [dosisObat, setDosisObat] = useState('3x1');

    const { register, handleSubmit, reset, watch } = useForm<KesehatanRecord>();
    const watchStatus = watch('status', 'Rawat Jalan');

    const getStatusBadgeClass = (status: KesehatanRecord['status']) => {
        if (status === 'Sembuh') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (status === 'Rawat Inap (Pondok)') return 'bg-amber-100 text-amber-800 border-amber-200';
        if (status === 'Rujuk RS/Klinik') return 'bg-rose-100 text-rose-800 border-rose-200';
        return 'bg-blue-50 text-blue-700 border-blue-200';
    };

    const filteredSantri = useMemo(() => {
        if (!searchSantri) return [];
        return santriList
            .filter(s => s.status === 'Aktif' && (s.namaLengkap.toLowerCase().includes(searchSantri.toLowerCase()) || s.nis.includes(searchSantri)))
            .slice(0, 10);
    }, [santriList, searchSantri]);

    const selectedSantriData = useMemo(() => {
        return santriList.find(s => s.id === selectedSantriId);
    }, [selectedSantriId, santriList]);

    // Active in-patient or referral count
    const activeInpatientsCount = useMemo(() => {
        return records.filter(r => r.status === 'Rawat Inap (Pondok)' || r.status === 'Rujuk RS/Klinik').length;
    }, [records]);

    // Filtering table records
    const filteredRecords = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        const currentMonthPrefix = new Date().toISOString().slice(0, 7);

        return records.filter(rec => {
            const santri = santriList.find(s => s.id === rec.santriId);
            const namaSantri = santri ? santri.namaLengkap.toLowerCase() : '';
            const nis = santri ? santri.nis : '';

            // Sub tab filter: Sedang Dirawat / Rujuk
            if (subTab === 'active') {
                if (rec.status !== 'Rawat Inap (Pondok)' && rec.status !== 'Rujuk RS/Klinik') {
                    return false;
                }
            }

            // Status filter
            if (statusFilter !== 'all' && rec.status !== statusFilter) {
                return false;
            }

            // Date Range filter
            if (dateRangeFilter === 'today' && rec.tanggal !== today) return false;
            if (dateRangeFilter === '7days' && rec.tanggal < sevenDaysAgoStr) return false;
            if (dateRangeFilter === 'month' && !rec.tanggal.startsWith(currentMonthPrefix)) return false;

            // Search query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchName = namaSantri.includes(q);
                const matchNis = nis.includes(q);
                const matchKeluhan = rec.keluhan?.toLowerCase().includes(q);
                const matchDiagnosa = rec.diagnosa?.toLowerCase().includes(q);
                const matchTindakan = rec.tindakan?.toLowerCase().includes(q);
                if (!matchName && !matchNis && !matchKeluhan && !matchDiagnosa && !matchTindakan) {
                    return false;
                }
            }

            return true;
        });
    }, [records, santriList, subTab, statusFilter, dateRangeFilter, searchQuery]);

    const handleAddRecord = () => {
        setEditingRecord(null);
        reset({
            tanggal: new Date().toISOString().split('T')[0],
            keluhan: '',
            diagnosa: '',
            tindakan: '',
            status: 'Rawat Jalan',
            pemeriksa: currentUser?.fullName || currentUser?.username || 'Petugas Poskestren',
            catatan: '',
            suhuTubuh: undefined,
            tekananDarah: '',
            beratBadan: undefined,
            lamaIstirahatHari: 1,
            faskesRujukan: '',
            alasanRujukan: ''
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
            catatan: record.catatan,
            suhuTubuh: record.suhuTubuh,
            tekananDarah: record.tekananDarah,
            beratBadan: record.beratBadan,
            lamaIstirahatHari: record.lamaIstirahatHari,
            faskesRujukan: record.faskesRujukan,
            alasanRujukan: record.alasanRujukan
        });
        setIsModalOpen(true);
    };

    // Quick Discharge: Tandai Sembuh
    const handleQuickDischarge = (record: KesehatanRecord) => {
        const santri = santriList.find(s => s.id === record.santriId);
        const nama = santri ? santri.namaLengkap : 'Santri';

        showConfirmation(
            'Tandai Sembuh / Selesai Rawat?',
            `Ubah status perawatan ${nama} menjadi 'Sembuh'?`,
            async () => {
                try {
                    await db.kesehatanRecords.update(record.id, {
                        status: 'Sembuh',
                        lastModified: Date.now()
                    });
                    showToast(`${nama} ditandai telah Sembuh.`, 'success');
                } catch (e) {
                    showToast('Gagal memperbarui status.', 'error');
                }
            },
            { confirmColor: 'green', confirmText: 'Ya, Tandai Sembuh' }
        );
    };

    // Open Print & Live Preview Modal
    const handleOpenPrintModal = (record: KesehatanRecord, defaultType?: MedicalDocumentType) => {
        const santri = santriList.find(s => s.id === record.santriId);
        if (santri) {
            let docType: MedicalDocumentType = defaultType || 'surat-sakit';
            if (!defaultType) {
                if (record.status === 'Rujuk RS/Klinik') docType = 'surat-rujukan';
                else if (record.status === 'Rawat Inap (Pondok)' && (record.lamaIstirahatHari || 0) >= 3) docType = 'surat-pulang';
            }
            setPrintTarget({ record, santri, type: docType });
            setIsPrintModalOpen(true);
        }
    };

    // Execute Print
    const handleExecutePrint = (type: DocumentType) => {
        if (!printTarget) return;
        setPreviewDoc({ record: printTarget.record, santri: printTarget.santri, type });
        setTimeout(() => {
            const prefix =
                type === 'surat-sakit'
                    ? 'Surat_Sakit'
                    : type === 'surat-rujukan'
                    ? 'Surat_Rujukan'
                    : 'Surat_Izin_Pulang';
            printToPdfNative('surat-medical-preview-wrapper', `${prefix}_${printTarget.santri.namaLengkap}_${printTarget.record.tanggal}`);
        }, 350);
    };

    // Open WhatsApp Modal
    const handleOpenWhatsAppModal = (record: KesehatanRecord) => {
        const santri = santriList.find(s => s.id === record.santriId);
        if (santri) {
            setWhatsAppTarget({ record, santri });
            setIsWhatsAppModalOpen(true);
        }
    };

    const handleDeleteRecord = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Data Pemeriksaan?', 'Data pemeriksaan akan dihapus dan stok obat yang terpakai akan DIKEMBALIKAN ke inventaris.', async () => {
            try {
                await (db as any).transaction('rw', db.kesehatanRecords, db.obat, async () => {
                    const record = await db.kesehatanRecords.get(id);
                    if (record && record.resep && record.resep.length > 0) {
                        for (const item of record.resep) {
                            const obat = await db.obat.get(item.obatId);
                            if (obat) {
                                await db.obat.update(obat.id, { stok: obat.stok + item.jumlah, lastModified: Date.now() });
                            }
                        }
                    }
                    await db.kesehatanRecords.update(id, { deleted: true, lastModified: Date.now() });
                });
                showToast('Data pemeriksaan dihapus & stok obat dikembalikan.', 'success');
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
            alert(`Stok di inventaris saat ini hanya: ${obat.stok}.`);
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
            alert("Silakan pilih santri terlebih dahulu.");
            return;
        }

        if (selectedObatId) {
            const confirmSkip = window.confirm("Anda memilih obat di dropdown tapi belum menekan tombol Tambah (+). Obat ini TIDAK akan dicatat ke resep. Lanjutkan?");
            if (!confirmSkip) return;
        }

        try {
            let absensiUpdated = false;

            await (db as any).transaction('rw', db.kesehatanRecords, db.obat, db.absensi, async () => {
                // 1. Kembalikan stok obat dari resep lama jika sedang mengedit
                if (editingRecord && editingRecord.resep && editingRecord.resep.length > 0) {
                    for (const item of editingRecord.resep) {
                        const obat = await db.obat.get(item.obatId);
                        if (obat) {
                            await db.obat.update(obat.id, { stok: obat.stok + item.jumlah, lastModified: Date.now() });
                        }
                    }
                }

                // 2. Kurangi stok obat untuk resep baru
                for (const item of resepList) {
                    const obat = await db.obat.get(item.obatId);
                    if (obat) {
                        const currentStok = Number(obat.stok);
                        const qty = Number(item.jumlah);
                        if (currentStok < qty) throw new Error(`Stok ${obat.nama} tidak mencukupi (Sisa: ${currentStok}).`);
                        await db.obat.update(obat.id, { stok: currentStok - qty, lastModified: Date.now() });
                    }
                }

                // 3. Format tindakan
                let tindakanFinal = data.tindakan || '';
                if (resepList.length > 0) {
                    const resepStr = resepList.map(r => `${r.namaObat} (${r.jumlah}) ${r.dosis}`).join(', ');
                    if (!tindakanFinal.includes(resepStr)) {
                        tindakanFinal = tindakanFinal ? `${tindakanFinal}. Terapi Obat: ${resepStr}` : `Terapi Obat: ${resepStr}`;
                    }
                }

                // 4. Sanitasi data record
                const recordData: Partial<KesehatanRecord> = {
                    ...data,
                    tindakan: tindakanFinal,
                    resep: resepList,
                    santriId: selectedSantriId,
                    suhuTubuh: data.suhuTubuh ? Number(data.suhuTubuh) : undefined,
                    tekananDarah: data.tekananDarah ? data.tekananDarah.trim() : undefined,
                    beratBadan: data.beratBadan ? Number(data.beratBadan) : undefined,
                    lamaIstirahatHari: data.lamaIstirahatHari ? Number(data.lamaIstirahatHari) : undefined,
                    faskesRujukan: data.faskesRujukan ? data.faskesRujukan.trim() : undefined,
                    alasanRujukan: data.alasanRujukan ? data.alasanRujukan.trim() : undefined,
                    lastModified: Date.now()
                };

                if (editingRecord) {
                    await db.kesehatanRecords.put({ ...recordData, id: editingRecord.id } as KesehatanRecord);
                } else {
                    await db.kesehatanRecords.add({ ...recordData, id: Date.now() } as KesehatanRecord);
                }

                // 5. Integrasi presensi santri jika rawat inap / rujuk
                const shouldSyncSickAbsence = data.status === 'Rawat Inap (Pondok)' || data.status === 'Rujuk RS/Klinik';
                if (shouldSyncSickAbsence) {
                    const santri = santriList.find(s => s.id === selectedSantriId);
                    if (santri) {
                        const existingAbsen = await db.absensi
                            .where({ santriId: santri.id })
                            .filter(a => a.tanggal === data.tanggal)
                            .first();

                        const keteranganAbsen = `[Poskestren] ${data.status}: ${data.diagnosa || 'Pemeriksaan Kesehatan'}`;

                        if (existingAbsen) {
                            await db.absensi.update(existingAbsen.id, {
                                status: 'S',
                                keterangan: keteranganAbsen,
                                lastModified: Date.now()
                            });
                        } else {
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

            const msgParts = ['Data rekam medis disimpan'];
            if (resepList.length > 0) msgParts.push('stok obat disesuaikan');
            if (absensiUpdated) msgParts.push('absensi dicatat SAKIT');

            showToast(msgParts.join(', ') + '.', 'success');
            setIsModalOpen(false);

        } catch (e: any) {
            showToast(`Gagal: ${e.message}`, 'error');
        }
    };

    return (
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-gray-200">
            {/* Top Bar with Sub-tabs & Action */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                {/* Sub-tab: Semua vs Sedang Dirawat */}
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold">
                    <button
                        onClick={() => {
                            setSubTab('all');
                            setStatusFilter('all');
                        }}
                        className={`px-4 py-1.5 rounded-lg transition ${subTab === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Semua Riwayat ({records.length})
                    </button>
                    <button
                        onClick={() => {
                            setSubTab('active');
                            setStatusFilter('all');
                        }}
                        className={`px-4 py-1.5 rounded-lg transition flex items-center gap-1.5 ${subTab === 'active' ? 'bg-white text-amber-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <span>Sedang Dirawat / Rujuk</span>
                        {activeInpatientsCount > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                {activeInpatientsCount}
                            </span>
                        )}
                    </button>
                </div>

                {canWrite && (
                    <button
                        onClick={handleAddRecord}
                        className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition"
                    >
                        <i className="bi bi-clipboard2-pulse"></i> Catat Pemeriksaan Baru
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-5 p-3.5 bg-gray-50/80 rounded-xl border border-gray-200 text-xs">
                {/* Search */}
                <div className="sm:col-span-6 relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <i className="bi bi-search"></i>
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari santri, NIS, keluhan, diagnosa..."
                        className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                    />
                </div>

                {/* Status Filter */}
                <div className="sm:col-span-3">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                    >
                        <option value="all">Semua Status</option>
                        <option value="Rawat Inap (Pondok)">Rawat Inap (Pondok)</option>
                        <option value="Rujuk RS/Klinik">Rujuk RS/Klinik</option>
                        <option value="Rawat Jalan">Rawat Jalan</option>
                        <option value="Sembuh">Sembuh</option>
                    </select>
                </div>

                {/* Date Filter */}
                <div className="sm:col-span-3">
                    <select
                        value={dateRangeFilter}
                        onChange={e => setDateRangeFilter(e.target.value as any)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                    >
                        <option value="all">Semua Tanggal</option>
                        <option value="today">Hari Ini</option>
                        <option value="7days">7 Hari Terakhir</option>
                        <option value="month">Bulan Ini</option>
                    </select>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                        <tr>
                            <th className="p-3.5">Tanggal</th>
                            <th className="p-3.5">Santri</th>
                            <th className="p-3.5">Tanda Vital</th>
                            <th className="p-3.5">Keluhan & Diagnosa</th>
                            <th className="p-3.5">Tindakan / Terapi</th>
                            <th className="p-3.5 text-center">Status</th>
                            <th className="p-3.5 text-center w-36">Aksi Cepat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRecords.map(rec => {
                            const santri = santriList.find(s => s.id === rec.santriId);
                            const isActiveInpatient = rec.status === 'Rawat Inap (Pondok)' || rec.status === 'Rujuk RS/Klinik';

                            return (
                                <tr key={rec.id} className="hover:bg-gray-50/80 transition">
                                    <td className="p-3.5 whitespace-nowrap text-gray-500">
                                        <div className="font-semibold text-gray-800">{new Date(rec.tanggal).toLocaleDateString('id-ID')}</div>
                                        <div className="text-[10px] text-gray-400">{rec.pemeriksa}</div>
                                    </td>
                                    <td className="p-3.5">
                                        <div className="font-bold text-gray-900">{santri ? santri.namaLengkap : 'Santri Tidak Ditemukan'}</div>
                                        <div className="text-[10px] text-gray-500">NIS: {santri?.nis || '-'}</div>
                                    </td>
                                    <td className="p-3.5 whitespace-nowrap">
                                        {(rec.suhuTubuh || rec.tekananDarah || rec.beratBadan) ? (
                                            <div className="space-y-0.5 text-[11px]">
                                                {rec.suhuTubuh && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-400">🌡️</span>
                                                        <span className={`font-semibold ${rec.suhuTubuh >= 38 ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                                                            {rec.suhuTubuh}°C
                                                        </span>
                                                    </div>
                                                )}
                                                {rec.tekananDarah && (
                                                    <div className="flex items-center gap-1 text-gray-600">
                                                        <span>🩺</span>
                                                        <span>{rec.tekananDarah}</span>
                                                    </div>
                                                )}
                                                {rec.beratBadan && (
                                                    <div className="flex items-center gap-1 text-gray-500">
                                                        <span>⚖️</span>
                                                        <span>{rec.beratBadan} kg</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic text-[10px]">-</span>
                                        )}
                                    </td>
                                    <td className="p-3.5 max-w-xs">
                                        <div className="font-bold text-red-600 text-xs">{rec.diagnosa || 'Pemeriksaan Umum'}</div>
                                        <div className="text-gray-600 text-[11px] mt-0.5 line-clamp-2">{rec.keluhan}</div>
                                    </td>
                                    <td className="p-3.5 max-w-xs">
                                        <div className="text-gray-800 text-[11px] line-clamp-2">{rec.tindakan || '-'}</div>
                                        {rec.status === 'Rujuk RS/Klinik' && rec.faskesRujukan && (
                                            <div className="mt-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded inline-block border border-rose-200">
                                                Rujukan: {rec.faskesRujukan}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3.5 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${getStatusBadgeClass(rec.status)}`}>
                                            {rec.status}
                                        </span>
                                    </td>
                                    <td className="p-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {/* Quick Discharge Button if in treatment */}
                                            {canWrite && isActiveInpatient && (
                                                <button
                                                    onClick={() => handleQuickDischarge(rec)}
                                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition"
                                                    title="Tandai Sembuh / Selesai Rawat"
                                                >
                                                    <i className="bi bi-check2-circle text-sm"></i>
                                                </button>
                                            )}

                                            {/* WhatsApp Wali */}
                                            <button
                                                onClick={() => handleOpenWhatsAppModal(rec)}
                                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                                                title="Kirim Laporan via WhatsApp"
                                            >
                                                <i className="bi bi-whatsapp text-sm"></i>
                                            </button>

                                            {/* Print Surat */}
                                            <button
                                                onClick={() => handleOpenPrintModal(rec)}
                                                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                                                title="Cetak Surat Medis"
                                            >
                                                <i className="bi bi-printer-fill text-sm"></i>
                                            </button>

                                            {/* Edit */}
                                            {canWrite && (
                                                <>
                                                    <button
                                                        onClick={() => handleEditRecord(rec)}
                                                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                                                        title="Edit Data"
                                                    >
                                                        <i className="bi bi-pencil-square text-sm"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRecord(rec.id)}
                                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                                                        title="Hapus Data"
                                                    >
                                                        <i className="bi bi-trash text-sm"></i>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredRecords.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-500 italic">
                                    Tidak ada data rekam medis yang sesuai kriteria pencarian.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List */}
            <div className="space-y-3 md:hidden">
                {filteredRecords.map(rec => {
                    const santri = santriList.find(s => s.id === rec.santriId);
                    const isActiveInpatient = rec.status === 'Rawat Inap (Pondok)' || rec.status === 'Rujuk RS/Klinik';

                    return (
                        <article key={rec.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{santri ? santri.namaLengkap : 'Santri'}</h4>
                                    <p className="text-[11px] text-gray-500">NIS: {santri?.nis || '-'} • {formatDate(rec.tanggal)}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border shrink-0 ${getStatusBadgeClass(rec.status)}`}>
                                    {rec.status}
                                </span>
                            </div>

                            {/* Vital signs */}
                            {(rec.suhuTubuh || rec.tekananDarah || rec.beratBadan) && (
                                <div className="flex flex-wrap gap-2 text-[11px] bg-gray-50 p-2 rounded-lg my-2 border border-gray-200">
                                    {rec.suhuTubuh && <span>🌡️ <strong>{rec.suhuTubuh}°C</strong></span>}
                                    {rec.tekananDarah && <span>🩺 <strong>{rec.tekananDarah}</strong></span>}
                                    {rec.beratBadan && <span>⚖️ <strong>{rec.beratBadan} kg</strong></span>}
                                </div>
                            )}

                            <div className="space-y-1 text-xs mt-2">
                                <div>
                                    <span className="font-bold text-red-600">{rec.diagnosa || 'Pemeriksaan Umum'}</span>
                                    <p className="text-gray-600 mt-0.5">{rec.keluhan}</p>
                                </div>
                                {rec.tindakan && (
                                    <div className="p-2 bg-gray-50 rounded-lg text-gray-700 text-[11px] border border-gray-100 mt-1">
                                        <strong>Tindakan:</strong> {rec.tindakan}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    {canWrite && isActiveInpatient && (
                                        <button
                                            onClick={() => handleQuickDischarge(rec)}
                                            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                                        >
                                            <i className="bi bi-check2"></i> Sembuh
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleOpenWhatsAppModal(rec)}
                                        className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                        title="Kirim WA Wali"
                                    >
                                        <i className="bi bi-whatsapp"></i>
                                    </button>
                                    <button
                                        onClick={() => handleOpenPrintModal(rec)}
                                        className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        title="Cetak Surat"
                                    >
                                        <i className="bi bi-printer-fill"></i>
                                    </button>
                                    {canWrite && (
                                        <>
                                            <button
                                                onClick={() => handleEditRecord(rec)}
                                                className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200"
                                                title="Edit"
                                            >
                                                <i className="bi bi-pencil-square"></i>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRecord(rec.id)}
                                                className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200"
                                                title="Hapus"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </article>
                    );
                })}
                {filteredRecords.length === 0 && (
                    <div className="p-8 text-center text-gray-500 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        Tidak ada riwayat pemeriksaan yang sesuai kriteria.
                    </div>
                )}
            </div>

            {/* Modal Input/Edit Record */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100">
                        <div className="p-4 bg-gradient-to-r from-teal-600 to-cyan-700 text-white flex justify-between items-center">
                            <h3 className="font-bold text-sm">
                                {editingRecord ? 'Edit Rekam Medis Santri' : 'Catat Pemeriksaan Santri'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3.5 overflow-y-auto flex-grow text-xs">
                            {/* Santri Selector */}
                            <div className="relative">
                                <label className="block font-bold text-gray-700 mb-1">Cari Santri (Nama / NIS)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchSantri}
                                        onChange={e => { setSearchSantri(e.target.value); setSelectedSantriId(null); }}
                                        className={`w-full border rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden ${selectedSantriId ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' : 'border-gray-300'}`}
                                        placeholder="Ketik minimal 2 karakter nama santri..."
                                    />
                                    {selectedSantriId && (
                                        <span className="absolute right-3 top-2.5 text-emerald-600 flex items-center gap-1 font-semibold text-[11px]">
                                            <i className="bi bi-check-circle-fill"></i> Terpilih
                                        </span>
                                    )}
                                </div>
                                {searchSantri && !selectedSantriId && (
                                    <div className="absolute z-20 w-full bg-white border border-gray-200 shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto divide-y">
                                        {filteredSantri.map(s => (
                                            <div
                                                key={s.id}
                                                onClick={() => { setSelectedSantriId(s.id); setSearchSantri(s.namaLengkap); }}
                                                className="p-2.5 hover:bg-teal-50 cursor-pointer transition flex items-center justify-between"
                                            >
                                                <span className="font-semibold text-gray-800">{s.namaLengkap}</span>
                                                <span className="text-[11px] text-gray-400">NIS: {s.nis}</span>
                                            </div>
                                        ))}
                                        {filteredSantri.length === 0 && (
                                            <div className="p-3 text-center text-gray-400 italic">Santri tidak ditemukan.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Medical Alert if patient has known illness */}
                            {selectedSantriData?.riwayatPenyakit && (
                                <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-lg text-xs text-rose-900">
                                    <div className="font-bold flex items-center gap-1.5 mb-0.5">
                                        <i className="bi bi-exclamation-triangle-fill text-rose-600"></i> PERINGATAN RIWAYAT MEDIS
                                    </div>
                                    <p>Santri tercatat memiliki riwayat penyakit: <strong>{selectedSantriData.riwayatPenyakit}</strong>. Mohon periksa indikasi kontra obat.</p>
                                </div>
                            )}

                            {/* Tanggal & Status Perawatan */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Tanggal Periksa</label>
                                    <input
                                        type="date"
                                        {...register('tanggal', { required: true })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Status Rawat</label>
                                    <select
                                        {...register('status', { required: true })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-semibold"
                                    >
                                        <option value="Rawat Jalan">Rawat Jalan</option>
                                        <option value="Rawat Inap (Pondok)">Rawat Inap (Pondok)</option>
                                        <option value="Rujuk RS/Klinik">Rujuk RS/Klinik</option>
                                        <option value="Sembuh">Sembuh</option>
                                    </select>
                                </div>
                            </div>

                            {/* Tanda Vital (Vital Signs) */}
                            <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200">
                                <label className="block font-bold text-teal-900 mb-2 flex items-center gap-1.5">
                                    <i className="bi bi-activity"></i> Tanda Vital Pasien (Opsional)
                                </label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[11px] text-gray-600 mb-0.5">Suhu (°C)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            {...register('suhuTubuh', { valueAsNumber: true })}
                                            placeholder="Mis: 37.5"
                                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-600 mb-0.5">Tensi (mmHg)</label>
                                        <input
                                            type="text"
                                            {...register('tekananDarah')}
                                            placeholder="Mis: 120/80"
                                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-600 mb-0.5">Berat (kg)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            {...register('beratBadan', { valueAsNumber: true })}
                                            placeholder="Mis: 48"
                                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Keluhan & Diagnosa */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Keluhan Pasien</label>
                                <textarea
                                    {...register('keluhan', { required: true })}
                                    rows={2}
                                    placeholder="Demam sejak semalam, pusing, batuk pilek..."
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                ></textarea>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Diagnosa Medis</label>
                                    <input
                                        type="text"
                                        {...register('diagnosa')}
                                        placeholder="ISPA, Flu, Gastritis/Maag..."
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden font-medium text-red-700"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Anjuran Istirahat (Hari)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        {...register('lamaIstirahatHari', { valueAsNumber: true })}
                                        placeholder="Jumlah hari, contoh: 2"
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                    />
                                </div>
                            </div>

                            {/* Conditional Section jika Rujuk RS */}
                            {watchStatus === 'Rujuk RS/Klinik' && (
                                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                                    <label className="block font-bold text-rose-900 flex items-center gap-1.5">
                                        <i className="bi bi-hospital"></i> Informasi Rujukan Faskes Luar
                                    </label>
                                    <div>
                                        <input
                                            type="text"
                                            {...register('faskesRujukan')}
                                            placeholder="Nama Faskes Tujuan (Puskesmas / RSUD / Klinik)..."
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <textarea
                                            {...register('alasanRujukan')}
                                            rows={2}
                                            placeholder="Alasan rujukan (Demam tinggi >3 hari, perlu rontgen, penanganan dokter spesialis)..."
                                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
                                        ></textarea>
                                    </div>
                                </div>
                            )}

                            {/* Resep Obat & Pengurangan Stok */}
                            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                                <label className="block font-bold text-blue-900 mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <i className="bi bi-capsule"></i> Resep Obat (Kurangi Stok Inventaris)
                                    </span>
                                    <span className="text-[10px] font-normal text-blue-700">Atomik & Otomatis</span>
                                </label>
                                <div className="flex gap-2 mb-2 items-end">
                                    <div className="flex-grow">
                                        <select
                                            value={selectedObatId}
                                            onChange={e => setSelectedObatId(e.target.value)}
                                            className="w-full bg-white text-xs border border-gray-300 rounded-lg p-1.5 h-8 focus:ring-2 focus:ring-blue-500 outline-hidden"
                                        >
                                            <option value="">-- Pilih Obat dari Inventaris --</option>
                                            {obatList.map(o => (
                                                <option key={o.id} value={o.id}>
                                                    {o.nama} (Stok: {o.stok} {o.satuan})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            value={jumlahObat}
                                            onChange={e => setJumlahObat(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-14 bg-white text-xs border border-gray-300 rounded-lg p-1.5 text-center h-8 focus:ring-2 focus:ring-blue-500 outline-hidden"
                                            min="1"
                                            placeholder="Jml"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={dosisObat}
                                            onChange={e => setDosisObat(e.target.value)}
                                            className="w-16 bg-white text-xs border border-gray-300 rounded-lg p-1.5 text-center h-8 focus:ring-2 focus:ring-blue-500 outline-hidden"
                                            placeholder="3x1"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddObatToResep}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg h-8 text-xs font-bold transition shrink-0"
                                        title="Tambahkan ke daftar resep"
                                    >
                                        <i className="bi bi-plus-lg"></i>
                                    </button>
                                </div>

                                {resepList.length > 0 ? (
                                    <ul className="space-y-1 mt-2 bg-white rounded-lg border border-blue-100 p-1.5 max-h-28 overflow-y-auto divide-y divide-gray-100">
                                        {resepList.map((r, idx) => (
                                            <li key={idx} className="flex justify-between items-center text-xs p-1.5">
                                                <span className="font-semibold text-gray-800">
                                                    {r.namaObat} <span className="text-gray-500 font-normal">({r.jumlah} item • {r.dosis})</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveResep(idx)}
                                                    className="text-rose-500 hover:text-rose-700 p-1"
                                                    title="Hapus item resep"
                                                >
                                                    <i className="bi bi-x-circle"></i>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[11px] text-gray-500 italic mt-1 text-center">Belum ada obat yang dimasukkan ke resep pemeriksaan ini.</p>
                                )}
                            </div>

                            {/* Tindakan Lain & Pemeriksa */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Tindakan Lain / Petunjuk Perawatan</label>
                                <textarea
                                    {...register('tindakan')}
                                    rows={2}
                                    placeholder="Kompres air hangat, istirahat di kamar UKS, minum air putih..."
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Nama Petugas / Dokter Pemeriksa</label>
                                    <input
                                        type="text"
                                        {...register('pemeriksa', { required: true })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Catatan Tambahan (Internal)</label>
                                    <input
                                        type="text"
                                        {...register('catatan')}
                                        placeholder="Catatan khusus petugas..."
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-500 outline-hidden"
                                    />
                                </div>
                            </div>

                            <div className="bg-amber-50 p-2.5 rounded-xl text-[11px] text-amber-900 border border-amber-200 flex items-start gap-2">
                                <i className="bi bi-info-circle-fill text-amber-600 mt-0.5"></i>
                                <span>
                                    Jika status <strong>Rawat Inap (Pondok)</strong> atau <strong>Rujuk RS/Klinik</strong>, sistem akan otomatis mencatat presensi <strong>Sakit (S)</strong> pada absensi rombel santri pada tanggal tersebut.
                                </span>
                            </div>
                        </form>

                        <div className="p-4 bg-gray-50 border-t flex flex-col-reverse sm:flex-row justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-medium transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit(onSubmit)}
                                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                            >
                                Simpan Rekam Medis
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print & Live Preview Modal */}
            {isPrintModalOpen && printTarget && (
                <MedicalPrintPreviewModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    record={printTarget.record}
                    santri={printTarget.santri}
                    settings={settings}
                    initialType={printTarget.type || 'surat-sakit'}
                />
            )}

            {/* WhatsApp Modal */}
            {isWhatsAppModalOpen && whatsAppTarget && (
                <WhatsAppHealthModal
                    isOpen={isWhatsAppModalOpen}
                    onClose={() => setIsWhatsAppModalOpen(false)}
                    record={whatsAppTarget.record}
                    santri={whatsAppTarget.santri}
                    settings={settings}
                    onShowToast={showToast}
                />
            )}

            {/* Hidden Printable Area */}
            {previewDoc && (
                <div className="hidden print:block">
                    <div id="surat-medical-preview-wrapper">
                        {previewDoc.type === 'surat-sakit' && (
                            <SuratSakitTemplate
                                record={previewDoc.record}
                                santri={previewDoc.santri}
                                settings={settings}
                            />
                        )}
                        {previewDoc.type === 'surat-rujukan' && (
                            <SuratRujukanTemplate
                                record={previewDoc.record}
                                santri={previewDoc.santri}
                                settings={settings}
                            />
                        )}
                        {previewDoc.type === 'surat-pulang' && (
                            <SuratIzinPulangTemplate
                                record={previewDoc.record}
                                santri={previewDoc.santri}
                                settings={settings}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN KESEHATAN PAGE ---

const Kesehatan: React.FC = () => {
    const { currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<'rekam' | 'obat'>('rekam');
    const [dashboardFilter, setDashboardFilter] = useState<string | null>(null);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.kesehatan === 'write';

    // Live data for dashboard
    const records = useLiveQuery(() => db.kesehatanRecords.filter(r => !r.deleted).toArray(), []) || [];
    const obatList = useLiveQuery(() => db.obat.filter(o => !o.deleted).toArray(), []) || [];

    const handleDashboardFilter = (filter: 'all' | 'rawat-inap' | 'rujuk' | 'kritis-obat') => {
        if (filter === 'kritis-obat') {
            setActiveTab('obat');
            setDashboardFilter('kritis-obat');
        } else {
            setActiveTab('rekam');
            setDashboardFilter(filter);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Kesiswaan"
                title="Poskestren & UKS"
                description="Pusat layanan kesehatan santri, rekam medis terpadu, manajemen persediaan obat, dan notifikasi ke wali santri."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={(tab: any) => {
                            setActiveTab(tab);
                            setDashboardFilter(null);
                        }}
                        tabs={[
                            { value: 'rekam', label: 'Rekam Medis Santri', icon: 'bi-clipboard2-pulse-fill' },
                            { value: 'obat', label: 'Stok Obat & Inventaris', icon: 'bi-capsule' },
                        ]}
                    />
                }
            />

            {/* Dashboard Quick Stats */}
            <KesehatanDashboard
                records={records}
                obatList={obatList}
                onFilterStatus={handleDashboardFilter}
                activeStatusFilter={dashboardFilter || undefined}
            />

            {/* Active Content */}
            <div>
                {activeTab === 'rekam' && (
                    <RekamMedisView canWrite={canWrite} initialFilter={dashboardFilter} />
                )}
                {activeTab === 'obat' && (
                    <StokObatView canWrite={canWrite} initialFilter={dashboardFilter} />
                )}
            </div>
        </div>
    );
};

export default Kesehatan;
