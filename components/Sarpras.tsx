import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { useFinanceContext } from '../contexts/FinanceContext';
import { logActivity } from '../services/logService';
import { Inventaris, SarprasMaintenanceLog, SarprasBorrowLog } from '../types';
import { formatRupiah, formatDate } from '../utils/formatters';
import { loadXLSX } from '../utils/lazyClientLibs';
import { printExportFacade } from '../utils/printExportFacade';
import { buildStandardExportFileName } from '../utils/exportFileName';
import { SarprasReportTemplate } from './sarpras/SarprasReportTemplate';
import { SarprasLabelModal } from './sarpras/SarprasLabelModal';
import {
    MaintenanceModal,
    BorrowModal,
    BulkSarprasModal,
    generateSarprasId,
    SARPRAS_POS_KAS_OPTIONS
} from './sarpras/SarprasModals';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { HeaderTabs } from './common/HeaderTabs';

// Helper estimasi nilai buku setelah penyusutan garis lurus (Straight-Line Depreciation)
const calculateBookValue = (item: Inventaris): number => {
    const cost = Number(item.hargaPerolehan) || 0;
    if (item.jenis === 'Tidak Bergerak' || cost <= 0) return cost; // Tanah/bangunan tidak disusutkan otomatis
    if (item.kondisi === 'Afkir') return 0;

    const usefulLife = Number(item.umurEkonomisTahun) || 5; // Default 5 tahun untuk barang bergerak
    const acquiredYear = item.tanggalPerolehan ? Number(item.tanggalPerolehan.slice(0, 4)) : new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - (isNaN(acquiredYear) ? currentYear : acquiredYear));

    if (age >= usefulLife) return Math.round(cost * 0.1); // Nilai residu 10% selama belum afkir
    const depreciated = cost - (cost * 0.9 * (age / usefulLife));
    return Math.max(0, Math.round(depreciated));
};

// --- SUB-COMPONENT: DASHBOARD ANALITIK SARPRAS ---

interface SarprasDashboardProps {
    assets: Inventaris[];
    onOpenKirByLocation: (loc: string) => void;
    onOpenMaintenance: (asset: Inventaris) => void;
    onOpenBorrow: (asset: Inventaris) => void;
    onOpenLabelModal: () => void;
}

const SarprasDashboard: React.FC<SarprasDashboardProps> = ({
    assets,
    onOpenKirByLocation,
    onOpenMaintenance,
    onOpenBorrow,
    onOpenLabelModal
}) => {
    const totalAset = assets.length;
    const totalNilaiPerolehan = assets.reduce((sum, item) => sum + (Number(item.hargaPerolehan) || 0), 0);
    const totalNilaiBuku = assets.reduce((sum, item) => sum + calculateBookValue(item), 0);

    const asetBergerak = assets.filter(a => a.jenis === 'Bergerak');
    const asetTetap = assets.filter(a => a.jenis === 'Tidak Bergerak');
    const asetWakaf = assets.filter(a => a.sumber === 'Wakaf');
    const nilaiWakaf = asetWakaf.reduce((sum, item) => sum + (Number(item.hargaPerolehan) || 0), 0);

    const sedangDipinjam = assets.filter(a => a.statusPinjam === 'Dipinjam');
    const asetPerluServis = assets.filter(a => a.kondisi === 'Rusak Ringan' || a.kondisi === 'Rusak Berat');

    const totalBiayaServis = useMemo(() => {
        return assets.reduce((sum, a) => {
            const logs = a.riwayatServis || [];
            return sum + logs.reduce((s, l) => s + (Number(l.biaya) || 0), 0);
        }, 0);
    }, [assets]);

    const kondisiStats = {
        Baik: assets.filter(a => a.kondisi === 'Baik').length,
        RusakRingan: assets.filter(a => a.kondisi === 'Rusak Ringan').length,
        RusakBerat: assets.filter(a => a.kondisi === 'Rusak Berat').length,
        Afkir: assets.filter(a => a.kondisi === 'Afkir').length,
    };

    const sumberBreakdown = useMemo(() => {
        const sources: Inventaris['sumber'][] = ['Wakaf', 'Beli Sendiri', 'Hibah/Hadiah', 'Bantuan Pemerintah'];
        return sources.map(src => {
            const items = assets.filter(a => a.sumber === src);
            const nilai = items.reduce((s, i) => s + (Number(i.hargaPerolehan) || 0), 0);
            const pct = totalNilaiPerolehan > 0 ? Math.round((nilai / totalNilaiPerolehan) * 100) : 0;
            return { sumber: src, count: items.length, nilai, pct };
        });
    }, [assets, totalNilaiPerolehan]);

    const lokasiBreakdown = useMemo(() => {
        const map = new Map<string, { lokasi: string; count: number; nilai: number; rusak: number }>();
        assets.forEach(a => {
            const loc = (a.lokasi || 'Belum Ditentukan').trim();
            const cur = map.get(loc) || { lokasi: loc, count: 0, nilai: 0, rusak: 0 };
            cur.count += 1;
            cur.nilai += Number(a.hargaPerolehan) || 0;
            if (a.kondisi !== 'Baik') cur.rusak += 1;
            map.set(loc, cur);
        });
        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [assets]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Baris 1: 4 Kartu KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 border-l-4 border-l-teal-600">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-xs uppercase font-bold">Total Nilai Perolehan</p>
                        <i className="bi bi-cash-coin text-teal-600 text-lg"></i>
                    </div>
                    <p className="text-2xl font-black text-teal-700 mt-1">{formatRupiah(totalNilaiPerolehan)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">Estimasi Nilai Buku:</span>
                        <span className="font-bold text-slate-700">{formatRupiah(totalNilaiBuku)}</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 border-l-4 border-l-emerald-600">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-xs uppercase font-bold">Harta Wakaf &amp; Tetap</p>
                        <i className="bi bi-building-check text-emerald-600 text-lg"></i>
                    </div>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{formatRupiah(nilaiWakaf)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">{asetWakaf.length} Aset Wakaf</span>
                        <span className="font-bold text-purple-700">{asetTetap.length} Tanah/Bangunan</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 border-l-4 border-l-blue-600">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-xs uppercase font-bold">Inventaris Bergerak</p>
                        <i className="bi bi-box-seam text-blue-600 text-lg"></i>
                    </div>
                    <p className="text-2xl font-black text-blue-700 mt-1">{asetBergerak.length} <span className="text-sm font-semibold text-gray-500">Item</span></p>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">Sedang Dipinjam:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${sedangDipinjam.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                            {sedangDipinjam.length} Aset
                        </span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-xs uppercase font-bold">Kondisi &amp; Perawatan</p>
                        <i className="bi bi-tools text-amber-600 text-lg"></i>
                    </div>
                    <div className="mt-1.5 space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Baik ({totalAset > 0 ? Math.round((kondisiStats.Baik / totalAset) * 100) : 0}%)</span>
                            <span className="font-bold text-green-600">{kondisiStats.Baik}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Rusak Ringan / Berat</span>
                            <span className="font-bold text-amber-600">{kondisiStats.RusakRingan} / <span className="text-red-600">{kondisiStats.RusakBerat}</span></span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-gray-100 text-[11px]">
                            <span className="text-gray-500">Total Biaya Servis:</span>
                            <span className="font-bold text-amber-800">{formatRupiah(totalBiayaServis)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Baris 2: 3 Panel Analitik & Tindakan Cepat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel 1: Sumber Perolehan */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                    <i className="bi bi-pie-chart-fill text-teal-600"></i>
                                    Valuasi per Sumber Perolehan
                                </h4>
                                <p className="text-xs text-gray-500">Proporsi nilai aset wakaf, kas pondok, hibah &amp; bantuan</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {sumberBreakdown.map(item => (
                                <div key={item.sumber} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-semibold text-gray-700">
                                            {item.sumber} <span className="text-gray-400 font-normal">({item.count} item)</span>
                                        </span>
                                        <span className="font-bold text-gray-900">{formatRupiah(item.nilai)} ({item.pct}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${
                                                item.sumber === 'Wakaf' ? 'bg-emerald-500' :
                                                item.sumber === 'Beli Sendiri' ? 'bg-teal-600' :
                                                item.sumber === 'Hibah/Hadiah' ? 'bg-blue-500' : 'bg-purple-500'
                                            }`}
                                            style={{ width: `${Math.max(item.count > 0 ? 4 : 0, item.pct)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">Siapkan stiker barcode inventaris:</span>
                        <button
                            type="button"
                            onClick={onOpenLabelModal}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                            <i className="bi bi-upc-scan"></i> Cetak Label Stiker
                        </button>
                    </div>
                </div>

                {/* Panel 2: Sebaran Lokasi & Cetak KIR */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col">
                    <div className="mb-3">
                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <i className="bi bi-geo-alt-fill text-indigo-600"></i>
                            Sebaran Ruangan / Lokasi &amp; Cetak KIR
                        </h4>
                        <p className="text-xs text-gray-500">Klik tombol KIR untuk membuka &amp; mencetak Kartu Inventaris Ruangan</p>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-gray-100">
                        {lokasiBreakdown.map(loc => (
                            <div key={loc.lokasi} className="py-2.5 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="font-bold text-xs text-gray-800 truncate">{loc.lokasi}</div>
                                    <div className="text-[11px] text-gray-500">
                                        {loc.count} Aset • {formatRupiah(loc.nilai)}
                                        {loc.rusak > 0 && <span className="ml-1.5 text-red-600 font-semibold">({loc.rusak} rusak)</span>}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onOpenKirByLocation(loc.lokasi)}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1"
                                    title="Filter ruangan ini untuk cetak Kartu Inventaris Ruangan (KIR)"
                                >
                                    <i className="bi bi-card-checklist"></i> Lihat / KIR
                                </button>
                            </div>
                        ))}
                        {lokasiBreakdown.length === 0 && (
                            <p className="text-xs text-gray-400 py-8 text-center">Belum ada data lokasi aset.</p>
                        )}
                    </div>
                </div>

                {/* Panel 3: Perlu Perbaikan & Sedang Dipinjam */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col">
                    <div className="mb-3">
                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <i className="bi bi-exclamation-triangle-fill text-amber-500"></i>
                            Perhatian Segera (Servis &amp; Pinjaman)
                        </h4>
                        <p className="text-xs text-gray-500">Daftar aset rusak yang butuh perbaikan &amp; aset sedang dipinjam</p>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-64 space-y-2">
                        {asetPerluServis.slice(0, 5).map(item => (
                            <div key={`rusak-${item.id}`} className="p-2.5 rounded-lg bg-red-50/70 border border-red-200 flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                    <div className="font-bold text-red-950 truncate">{item.nama}</div>
                                    <div className="text-[10px] text-red-700">
                                        {item.kondisi} • {item.lokasi || '-'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onOpenMaintenance(item)}
                                    className="px-2.5 py-1 bg-white hover:bg-red-100 text-red-700 border border-red-300 rounded font-bold text-[11px] shrink-0"
                                >
                                    <i className="bi bi-tools mr-1"></i>Servis
                                </button>
                            </div>
                        ))}

                        {sedangDipinjam.slice(0, 5).map(item => {
                            const activeLoan = item.riwayatPeminjaman?.find(l => l.status === 'Dipinjam');
                            return (
                                <div key={`pinjam-${item.id}`} className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2 text-xs">
                                    <div className="min-w-0">
                                        <div className="font-bold text-amber-950 truncate">{item.nama}</div>
                                        <div className="text-[10px] text-amber-800 truncate">
                                            Peminjam: {activeLoan?.peminjam || '-'} (Kembali: {activeLoan?.estimasiKembali || '-'})
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onOpenBorrow(item)}
                                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold text-[11px] shrink-0"
                                    >
                                        Kembali
                                    </button>
                                </div>
                            );
                        })}

                        {asetPerluServis.length === 0 && sedangDipinjam.length === 0 && (
                            <div className="py-10 text-center text-xs text-emerald-700 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                <i className="bi bi-check-circle-fill text-xl block mb-1 text-emerald-500"></i>
                                Seluruh aset dalam kondisi baik dan tidak ada peminjaman tertunda.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: MODAL TAMBAH / EDIT ASET ---

interface InventarisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Inventaris, 'id'>, catatKeBukuKas: boolean, posKas: string) => Promise<void>;
    onUpdate: (data: Inventaris) => Promise<void>;
    initialData: Inventaris | null;
    existingLocations: string[];
    teacherNames: string[];
}

const InventarisModal: React.FC<InventarisModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onUpdate,
    initialData,
    existingLocations,
    teacherNames
}) => {
    const { register, handleSubmit, watch, reset } = useForm<Inventaris>();
    const watchJenis = watch('jenis', 'Bergerak');
    const watchSumber = watch('sumber', 'Beli Sendiri');
    const watchHarga = watch('hargaPerolehan', 0);

    const [catatKeBukuKas, setCatatKeBukuKas] = useState(false);
    const [posKas, setPosKas] = useState('Kas Tunai Bendahara');

    useEffect(() => {
        if (isOpen) {
            setCatatKeBukuKas(false);
            if (initialData) {
                reset(initialData);
            } else {
                reset({
                    kode: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                    jenis: 'Bergerak',
                    kondisi: 'Baik',
                    sumber: 'Beli Sendiri',
                    tanggalPerolehan: new Date().toISOString().split('T')[0],
                    jumlah: 1,
                    satuan: 'Unit',
                    hargaPerolehan: 0,
                    umurEkonomisTahun: 5,
                    merkSpesifikasi: '',
                    penanggungJawab: '',
                    nadzirWakaf: ''
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: Inventaris) => {
        if (initialData?.id) {
            await onUpdate({ ...initialData, ...data, id: initialData.id });
        } else {
            await onSave(
                data,
                !initialData && data.sumber === 'Beli Sendiri' && Number(data.hargaPerolehan) > 0 && catatKeBukuKas,
                posKas
            );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">
                            {initialData ? 'Edit Data Aset & Inventaris' : 'Tambah Aset & Inventaris Baru'}
                        </h3>
                        <p className="text-xs text-gray-500">Lengkapi spesifikasi, lokasi ruangan, PIC, dan sumber perolehan aset.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Kode Inventaris *</label>
                            <input type="text" {...register('kode', { required: true })} className="w-full border rounded-lg p-2 text-sm bg-gray-50 font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Aset *</label>
                            <select {...register('jenis')} className="w-full border rounded-lg p-2 text-sm">
                                <option value="Bergerak">Barang Bergerak (Inventaris)</option>
                                <option value="Tidak Bergerak">Aset Tetap (Tanah / Bangunan / Wakaf)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nama Barang / Aset *</label>
                            <input
                                type="text"
                                {...register('nama', { required: true })}
                                className="w-full border rounded-lg p-2 text-sm"
                                placeholder={watchJenis === 'Bergerak' ? 'Contoh: Laptop Asus, Proyektor Epson' : 'Contoh: Tanah Wakaf Kampus 2, Gedung Asrama Putra'}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Merk / Tipe / Spesifikasi</label>
                            <input
                                type="text"
                                {...register('merkSpesifikasi')}
                                className="w-full border rounded-lg p-2 text-sm"
                                placeholder={watchJenis === 'Bergerak' ? 'Contoh: Epson EB-X500, Kayu Jati' : 'Contoh: Beton Bertulang 2 Lantai'}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                            <input list="kategori-sarpras-list" {...register('kategori')} className="w-full border rounded-lg p-2 text-sm" placeholder="Ketik atau pilih..." />
                            <datalist id="kategori-sarpras-list">
                                <option value="Elektronik" />
                                <option value="Meubeler" />
                                <option value="Kendaraan" />
                                <option value="Peralatan Dapur" />
                                <option value="Sound & Multimedia" />
                                <option value="Alat Kesehatan / UKS" />
                                <option value="Tanah" />
                                <option value="Bangunan" />
                                <option value="Instalasi Air & Listrik" />
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Lokasi / Ruangan</label>
                            <input
                                list="lokasi-sarpras-list"
                                type="text"
                                {...register('lokasi')}
                                className="w-full border rounded-lg p-2 text-sm"
                                placeholder="Contoh: Kantor TU, Kelas 7A"
                            />
                            <datalist id="lokasi-sarpras-list">
                                {existingLocations.map(loc => (
                                    <option key={loc} value={loc} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Penanggung Jawab (PIC)</label>
                            <input
                                list="pic-sarpras-list"
                                type="text"
                                {...register('penanggungJawab')}
                                className="w-full border rounded-lg p-2 text-sm"
                                placeholder="Nama Ustadz / Staf PIC"
                            />
                            <datalist id="pic-sarpras-list">
                                {teacherNames.map(name => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
                        </div>
                    </div>

                    {watchJenis === 'Bergerak' ? (
                        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-blue-900 mb-1">Jumlah</label>
                                <input type="number" min={1} {...register('jumlah', { valueAsNumber: true })} className="w-full border rounded-lg p-2 text-sm bg-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-900 mb-1">Satuan</label>
                                <input type="text" {...register('satuan')} className="w-full border rounded-lg p-2 text-sm bg-white" placeholder="Unit, Pcs, Set" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-900 mb-1">Umur Ekonomis (Thn)</label>
                                <input type="number" min={1} max={50} {...register('umurEkonomisTahun', { valueAsNumber: true })} className="w-full border rounded-lg p-2 text-sm bg-white" placeholder="5" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-900 mb-1">Kondisi Fisik</label>
                                <select {...register('kondisi')} className="w-full border rounded-lg p-2 text-sm bg-white font-semibold">
                                    <option value="Baik">Baik</option>
                                    <option value="Rusak Ringan">Rusak Ringan</option>
                                    <option value="Rusak Berat">Rusak Berat</option>
                                    <option value="Afkir">Afkir (Dibuang)</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-emerald-900 mb-1">Luas Area / Bangunan (m²)</label>
                                <input type="number" {...register('luas', { valueAsNumber: true })} className="w-full border rounded-lg p-2 text-sm bg-white" placeholder="Luas m²" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-emerald-900 mb-1">Legalitas / Sertifikat / AIW</label>
                                <input type="text" {...register('legalitas')} className="w-full border rounded-lg p-2 text-sm bg-white" placeholder="SHM No... / Akta Ikrar Wakaf" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-emerald-900 mb-1">Kondisi Fisik</label>
                                <select {...register('kondisi')} className="w-full border rounded-lg p-2 text-sm bg-white font-semibold">
                                    <option value="Baik">Baik / Terawat</option>
                                    <option value="Rusak Ringan">Perlu Renovasi Ringan</option>
                                    <option value="Rusak Berat">Perlu Renovasi Berat</option>
                                    <option value="Afkir">Afkir / Dibongkar</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Perolehan</label>
                            <input type="date" {...register('tanggalPerolehan')} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Sumber Perolehan</label>
                            <select {...register('sumber')} className="w-full border rounded-lg p-2 text-sm font-semibold">
                                <option value="Beli Sendiri">Beli Sendiri (Kas Pondok)</option>
                                <option value="Wakaf">Wakaf</option>
                                <option value="Hibah/Hadiah">Hibah / Hadiah</option>
                                <option value="Bantuan Pemerintah">Bantuan Pemerintah</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Nilai Perolehan Total (Rp)</label>
                            <input type="number" min={0} {...register('hargaPerolehan', { valueAsNumber: true })} className="w-full border rounded-lg p-2 text-sm font-bold" placeholder="Harga beli / taksiran" />
                        </div>
                    </div>

                    {watchSumber === 'Wakaf' && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <label className="block text-xs font-bold text-emerald-900 mb-1">Nama Pewakif (Wakif) / Nadzir Wakaf</label>
                            <input
                                type="text"
                                {...register('nadzirWakaf')}
                                className="w-full border border-emerald-300 rounded-lg p-2 text-sm bg-white"
                                placeholder="Contoh: Wakaf Keluarga H. Ahmad Sulaiman / Nadzir Yayasan..."
                            />
                        </div>
                    )}

                    {!initialData && watchSumber === 'Beli Sendiri' && Number(watchHarga) > 0 && (
                        <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl space-y-2 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-950">
                                <input
                                    type="checkbox"
                                    checked={catatKeBukuKas}
                                    onChange={e => setCatatKeBukuKas(e.target.checked)}
                                    className="rounded text-teal-600 focus:ring-teal-500"
                                />
                                Otomatis catat pembelian aset ini ({formatRupiah(Number(watchHarga))}) sebagai Pengeluaran di Buku Kas Pondok
                            </label>
                            {catatKeBukuKas && (
                                <div className="flex items-center gap-2 pl-6">
                                    <span className="text-gray-600 font-medium">Potong dari Pos Kas:</span>
                                    <select
                                        value={posKas}
                                        onChange={e => setPosKas(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-semibold bg-white"
                                    >
                                        {SARPRAS_POS_KAS_OPTIONS.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan / Catatan Tambahan</label>
                        <textarea {...register('keterangan')} rows={2} className="w-full border rounded-lg p-2 text-sm" placeholder="Catatan nomor seri, kelengkapan, batas tanah, dll..."></textarea>
                    </div>

                    <div className="flex justify-end pt-4 border-t gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">Batal</button>
                        <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-bold shadow-xs">Simpan Aset</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const normalizeInventarisPayload = (raw: Partial<Inventaris>): Omit<Inventaris, 'id'> => {
    const isBergerak = raw.jenis !== 'Tidak Bergerak';
    return {
        kode: String(raw.kode || '').trim(),
        nama: String(raw.nama || '').trim(),
        jenis: isBergerak ? 'Bergerak' : 'Tidak Bergerak',
        kategori: String(raw.kategori || 'Lainnya').trim(),
        kondisi: raw.kondisi || 'Baik',
        lokasi: String(raw.lokasi || '').trim(),
        jumlah: isBergerak ? Math.max(1, Number(raw.jumlah) || 1) : 1,
        satuan: isBergerak ? String(raw.satuan || 'Unit').trim() : 'Bidang/Unit',
        luas: !isBergerak ? Math.max(0, Number(raw.luas) || 0) : 0,
        legalitas: !isBergerak ? String(raw.legalitas || '').trim() : '',
        noSertifikat: !isBergerak ? String(raw.noSertifikat || '').trim() : '',
        tanggalPerolehan: raw.tanggalPerolehan || new Date().toISOString().split('T')[0],
        sumber: raw.sumber || 'Beli Sendiri',
        hargaPerolehan: Math.max(0, Number(raw.hargaPerolehan) || 0),
        keterangan: String(raw.keterangan || '').trim(),
        merkSpesifikasi: String(raw.merkSpesifikasi || '').trim(),
        penanggungJawab: String(raw.penanggungJawab || '').trim(),
        umurEkonomisTahun: isBergerak ? Math.max(1, Number(raw.umurEkonomisTahun) || 5) : 0,
        nadzirWakaf: raw.sumber === 'Wakaf' ? String(raw.nadzirWakaf || '').trim() : '',
        statusPinjam: raw.statusPinjam || 'Tersedia',
        riwayatServis: Array.isArray(raw.riwayatServis) ? raw.riwayatServis : [],
        riwayatPeminjaman: Array.isArray(raw.riwayatPeminjaman) ? raw.riwayatPeminjaman : [],
        deleted: Boolean(raw.deleted),
        lastModified: Date.now()
    };
};

const Sarpras: React.FC = () => {
    const { showToast, showConfirmation, currentUser, settings } = useAppContext();
    const { onAddTransaksiKas } = useFinanceContext();
    const assets = useLiveQuery(() => db.inventaris.filter(i => !i.deleted).toArray(), []) || [];
    const [activeTab, setActiveTab] = useState<'dashboard' | 'bergerak' | 'tetap' | 'pemeliharaan'>('dashboard');

    // Multi-dimensional filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterKondisi, setFilterKondisi] = useState('');
    const [filterKategori, setFilterKategori] = useState('');
    const [filterLokasi, setFilterLokasi] = useState('');
    const [filterSumber, setFilterSumber] = useState('');

    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Modals State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Inventaris | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [maintenanceAsset, setMaintenanceAsset] = useState<Inventaris | null>(null);
    const [borrowAsset, setBorrowAsset] = useState<Inventaris | null>(null);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.sarpras === 'write';
    const currentUserName = currentUser?.fullName || currentUser?.username || 'Petugas Sarpras';

    const existingLocations = useMemo(() => {
        const set = new Set<string>();
        assets.forEach(a => { if (a.lokasi?.trim()) set.add(a.lokasi.trim()); });
        settings.gedungAsrama?.forEach(g => { if (g.nama?.trim()) set.add(g.nama.trim()); });
        settings.rombel?.forEach(r => { if (r.nama?.trim()) set.add(`Ruang ${r.nama.trim()}`); });
        return Array.from(set).sort();
    }, [assets, settings.gedungAsrama, settings.rombel]);

    const existingCategories = useMemo(() => {
        const set = new Set<string>();
        assets.forEach(a => { if (a.kategori?.trim()) set.add(a.kategori.trim()); });
        return Array.from(set).sort();
    }, [assets]);

    const teacherNames = useMemo(() => {
        return (settings.tenagaPengajar || []).map(t => t.nama).filter(Boolean);
    }, [settings.tenagaPengajar]);

    // Filtered Assets
    const filteredAssets = useMemo(() => {
        let result = assets;
        if (activeTab === 'bergerak') result = result.filter(a => a.jenis === 'Bergerak');
        if (activeTab === 'tetap') result = result.filter(a => a.jenis === 'Tidak Bergerak');

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(a =>
                a.nama.toLowerCase().includes(lower) ||
                a.kode.toLowerCase().includes(lower) ||
                (a.lokasi || '').toLowerCase().includes(lower) ||
                (a.merkSpesifikasi || '').toLowerCase().includes(lower) ||
                (a.penanggungJawab || '').toLowerCase().includes(lower)
            );
        }
        if (filterKondisi) result = result.filter(a => a.kondisi === filterKondisi);
        if (filterKategori) result = result.filter(a => a.kategori === filterKategori);
        if (filterLokasi) result = result.filter(a => (a.lokasi || '').trim() === filterLokasi);
        if (filterSumber) result = result.filter(a => a.sumber === filterSumber);

        return result;
    }, [assets, activeTab, searchTerm, filterKondisi, filterKategori, filterLokasi, filterSumber]);

    // All Maintenance & Borrow logs across assets for the 'pemeliharaan' tab
    const allMaintenanceLogs = useMemo(() => {
        const list: { asset: Inventaris; log: SarprasMaintenanceLog }[] = [];
        assets.forEach(a => {
            (a.riwayatServis || []).forEach(log => list.push({ asset: a, log }));
        });
        return list.sort((a, b) => b.log.tanggal.localeCompare(a.log.tanggal));
    }, [assets]);

    const allBorrowLogs = useMemo(() => {
        const list: { asset: Inventaris; log: SarprasBorrowLog }[] = [];
        assets.forEach(a => {
            (a.riwayatPeminjaman || []).forEach(log => list.push({ asset: a, log }));
        });
        return list.sort((a, b) => b.log.tanggalPinjam.localeCompare(a.log.tanggalPinjam));
    }, [assets]);

    // Handlers
    const handleSave = async (data: Omit<Inventaris, 'id'>, catatKeBukuKas: boolean, posKas: string) => {
        if (!canWrite) return;
        const now = Date.now();
        const newId = generateSarprasId();
        const normalized = normalizeInventarisPayload(data);
        const newAsset: Inventaris = {
            ...normalized,
            id: newId,
            statusPinjam: 'Tersedia',
            deleted: false,
            lastModified: now
        };
        await db.inventaris.put(newAsset);
        await logActivity('INSERT', 'inventaris', newId.toString(), null, newAsset, currentUserName);

        if (catatKeBukuKas && normalized.hargaPerolehan > 0) {
            const isoDate = normalized.tanggalPerolehan
                ? new Date(`${normalized.tanggalPerolehan}T${new Date().toTimeString().slice(0, 8)}`).toISOString()
                : new Date().toISOString();
            await onAddTransaksiKas({
                tanggal: isoDate,
                jenis: 'Pengeluaran',
                kategori: '504 - Pemeliharaan Gedung & Asrama',
                deskripsi: `Pengadaan Aset Sarpras: [${normalized.kode}] ${normalized.nama} (${normalized.lokasi || '-'})`,
                jumlah: normalized.hargaPerolehan,
                penanggungJawab: currentUserName,
                rekening: posKas || 'Kas Tunai Bendahara'
            });
        }

        setIsModalOpen(false);
        showToast(
            catatKeBukuKas ? 'Aset disimpan & pengeluaran tercatat di Buku Kas' : 'Aset berhasil ditambahkan',
            'success'
        );
    };

    const handleSaveBulk = async (items: Omit<Inventaris, 'id'>[]) => {
        if (!canWrite) return;
        const now = Date.now();
        const records: Inventaris[] = items.map(item => ({
            ...normalizeInventarisPayload(item),
            id: generateSarprasId(),
            deleted: false,
            lastModified: now
        }));
        await db.inventaris.bulkPut(records);
        await logActivity('INSERT', 'inventaris', `bulk-${records.length}`, null, { count: records.length }, currentUserName);
        showToast(`${records.length} aset berhasil ditambahkan secara massal`, 'success');
    };

    const handleUpdate = async (data: Inventaris) => {
        if (!canWrite) return;
        const existing = await db.inventaris.get(data.id);
        const normalized = normalizeInventarisPayload({ ...existing, ...data });
        const updatedRecord: Inventaris = {
            ...normalized,
            id: data.id,
            deleted: false,
            lastModified: Date.now()
        };
        await db.inventaris.put(updatedRecord);
        await logActivity('UPDATE', 'inventaris', data.id.toString(), existing, updatedRecord, currentUserName);
        setIsModalOpen(false);
        showToast('Data aset diperbarui', 'success');
    };

    const handleDelete = (id: number) => {
        if (!canWrite) return;
        showConfirmation('Hapus Aset?', 'Aset ini akan dihapus dari daftar inventaris aktif.', async () => {
            const item = await db.inventaris.get(id);
            if (item) {
                const deletedRecord = { ...item, deleted: true, lastModified: Date.now() };
                await db.inventaris.put(deletedRecord);
                await logActivity('DELETE', 'inventaris', id.toString(), item, deletedRecord, currentUserName);
                showToast('Aset dihapus', 'success');
            }
        }, { confirmColor: 'red' });
    };

    const handleSaveMaintenance = async (
        asset: Inventaris,
        log: SarprasMaintenanceLog,
        catatKeBukuKas: boolean,
        posKas: string
    ) => {
        if (!canWrite) return;
        const now = Date.now();
        const updatedAsset: Inventaris = {
            ...asset,
            kondisi: log.kondisiSetelah,
            riwayatServis: [...(asset.riwayatServis || []), log],
            lastModified: now
        };
        await db.inventaris.put(updatedAsset);
        await logActivity('UPDATE', 'inventaris', asset.id.toString(), asset, updatedAsset, currentUserName);

        if (catatKeBukuKas && log.biaya > 0) {
            const isoDate = log.tanggal
                ? new Date(`${log.tanggal}T${new Date().toTimeString().slice(0, 8)}`).toISOString()
                : new Date().toISOString();
            await onAddTransaksiKas({
                tanggal: isoDate,
                jenis: 'Pengeluaran',
                kategori: '504 - Pemeliharaan Gedung & Asrama',
                deskripsi: `${log.jenisTindakan} Sarpras [${asset.kode} - ${asset.nama}]: ${log.deskripsi}`,
                jumlah: Number(log.biaya) || 0,
                penanggungJawab: currentUserName,
                rekening: posKas || 'Kas Kecil Operasional'
            });
        }

        showToast(
            catatKeBukuKas && log.biaya > 0
                ? 'Catatan servis disimpan & biaya dibukukan ke Buku Kas'
                : 'Catatan servis aset berhasil disimpan',
            'success'
        );
    };

    const handleBorrowAsset = async (asset: Inventaris, log: SarprasBorrowLog) => {
        if (!canWrite) return;
        const updatedAsset: Inventaris = {
            ...asset,
            statusPinjam: 'Dipinjam',
            riwayatPeminjaman: [...(asset.riwayatPeminjaman || []), log],
            lastModified: Date.now()
        };
        await db.inventaris.put(updatedAsset);
        await logActivity('UPDATE', 'inventaris', asset.id.toString(), asset, updatedAsset, currentUserName);
        showToast(`Peminjaman ${asset.nama} oleh ${log.peminjam} tercatat`, 'success');
    };

    const handleReturnAsset = async (
        asset: Inventaris,
        logId: string,
        kondisiKembali: Inventaris['kondisi'],
        catatan: string
    ) => {
        if (!canWrite) return;
        const today = new Date().toISOString().split('T')[0];
        const updatedHistory = (asset.riwayatPeminjaman || []).map(l =>
            l.id === logId
                ? { ...l, status: 'Dikembalikan' as const, tanggalKembaliAktual: today, kondisiKembali, catatan }
                : l
        );
        const stillBorrowed = updatedHistory.some(l => l.status === 'Dipinjam');
        const updatedAsset: Inventaris = {
            ...asset,
            statusPinjam: stillBorrowed ? 'Dipinjam' : 'Tersedia',
            kondisi: kondisiKembali,
            riwayatPeminjaman: updatedHistory,
            lastModified: Date.now()
        };
        await db.inventaris.put(updatedAsset);
        await logActivity('UPDATE', 'inventaris', asset.id.toString(), asset, updatedAsset, currentUserName);
        showToast(`Aset ${asset.nama} telah dikembalikan`, 'success');
    };

    const handleOpenKirByLocation = (loc: string) => {
        setFilterLokasi(loc === 'Belum Ditentukan' ? '' : loc);
        setActiveTab('bergerak');
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterKondisi('');
        setFilterKategori('');
        setFilterLokasi('');
        setFilterSumber('');
    };

    const buildSarprasFileName = () => {
        const scope = filterLokasi
            ? `kir-${filterLokasi}`
            : activeTab === 'dashboard'
            ? 'semua'
            : activeTab === 'bergerak'
            ? 'bergerak'
            : 'tetap';
        return buildStandardExportFileName('laporan-sarpras', [scope]);
    };

    const handleExportAction = async (type: 'pdfVisual' | 'pdfImage' | 'print' | 'pdfAutoTable' | 'word' | 'excel' | 'html') => {
        if (isExporting) return;
        const fileName = buildSarprasFileName();
        setIsExportMenuOpen(false);
        setIsExporting(true);
        try {
            if (type === 'pdfVisual' || type === 'print') {
                await printExportFacade.printDialog({ elementId: 'sarpras-print-area', fileName, paperSize: 'A4', target: 'sarpras' });
                return;
            }
            if (type === 'pdfImage') {
                await printExportFacade.downloadPdfImage({ elementId: 'sarpras-print-area', fileName, paperSize: 'A4', target: 'sarpras' });
                return;
            }
            if (type === 'pdfAutoTable') {
                await printExportFacade.downloadPdfAutoTable({ elementId: 'sarpras-print-area', fileName, paperSize: 'A4', target: 'sarpras' });
                return;
            }
            if (type === 'word') {
                printExportFacade.downloadWord({ elementId: 'sarpras-print-area', fileName, paperSize: 'A4', target: 'sarpras' });
                return;
            }
            if (type === 'html') {
                printExportFacade.downloadHtml({ elementId: 'sarpras-print-area', fileName, paperSize: 'A4', target: 'sarpras' });
                return;
            }
            if (type === 'excel') {
                const XLSX = await loadXLSX();
                const rows = (activeTab === 'dashboard' ? assets : filteredAssets).map((item, idx) => ({
                    No: idx + 1,
                    Kode: item.kode,
                    Nama: item.nama,
                    Merk_Spesifikasi: item.merkSpesifikasi || '-',
                    Jenis: item.jenis,
                    Kategori: item.kategori || '-',
                    Lokasi: item.lokasi || '-',
                    Penanggung_Jawab: item.penanggungJawab || '-',
                    Kondisi: item.kondisi,
                    Status_Pinjam: item.statusPinjam || 'Tersedia',
                    Jumlah: item.jenis === 'Bergerak' ? item.jumlah : '',
                    Satuan: item.jenis === 'Bergerak' ? (item.satuan || '-') : '',
                    Luas_m2: item.jenis === 'Tidak Bergerak' ? (item.luas || '') : '',
                    Legalitas: item.jenis === 'Tidak Bergerak' ? (item.legalitas || '-') : '',
                    Sumber: item.sumber || '-',
                    Wakif_Nadzir: item.nadzirWakaf || '-',
                    Tanggal_Perolehan: item.tanggalPerolehan || '-',
                    Nilai_Perolehan: Number(item.hargaPerolehan) || 0,
                    Estimasi_Nilai_Buku: calculateBookValue(item),
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Sarpras');
                XLSX.writeFile(wb, `${fileName}.xlsx`);
                return;
            }
        } catch (error) {
            console.error(error);
            showToast('Gagal mengekspor laporan sarpras.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col space-y-6 pb-20">
            <PageHeader
                eyebrow="Keuangan & Aset"
                title="Manajemen Sarana, Prasarana & Wakaf"
                description="Kelola inventaris bergerak, tanah & bangunan wakaf, cetak stiker barcode & Kartu Inventaris Ruangan (KIR), serta pemeliharaan dan peminjaman aset."
                actions={
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-panduan', { detail: 'sarpras' }))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-2xs transition hover:bg-teal-100"
                    >
                        <i className="bi bi-journal-bookmark-fill text-teal-600"></i>
                        <span>Panduan &amp; SOP Sarpras</span>
                    </button>
                }
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={(v) => setActiveTab(v as 'dashboard' | 'bergerak' | 'tetap' | 'pemeliharaan')}
                        tabs={[
                            { value: 'dashboard', label: 'Dashboard & Valuasi', icon: 'bi-speedometer2' },
                            { value: 'bergerak', label: 'Aset Bergerak', icon: 'bi-box-seam' },
                            { value: 'tetap', label: 'Tanah, Bangunan & Wakaf', icon: 'bi-building' },
                            { value: 'pemeliharaan', label: 'Servis & Peminjaman', icon: 'bi-tools' },
                        ]}
                    />
                }
            />

            {activeTab === 'dashboard' && (
                <SarprasDashboard
                    assets={assets}
                    onOpenKirByLocation={handleOpenKirByLocation}
                    onOpenMaintenance={(item) => setMaintenanceAsset(item)}
                    onOpenBorrow={(item) => setBorrowAsset(item)}
                    onOpenLabelModal={() => setIsLabelModalOpen(true)}
                />
            )}

            {(activeTab === 'bergerak' || activeTab === 'tetap') && (
                <SectionCard className="animate-fade-in" contentClassName="p-4 md:p-6">
                    {/* Baris Filter & Tombol Aksi */}
                    <div className="mb-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                            <div className="sm:col-span-2 lg:col-span-1">
                                <input
                                    type="text"
                                    placeholder="Cari nama, kode, spek, PIC..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-xs w-full"
                                />
                            </div>
                            <select
                                value={filterLokasi}
                                onChange={e => setFilterLokasi(e.target.value)}
                                className="border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-medium"
                            >
                                <option value="">Semua Lokasi / Ruangan (KIR)</option>
                                {existingLocations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                            <select
                                value={filterKategori}
                                onChange={e => setFilterKategori(e.target.value)}
                                className="border border-gray-300 rounded-lg px-2.5 py-2 text-xs"
                            >
                                <option value="">Semua Kategori</option>
                                {existingCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <select
                                value={filterSumber}
                                onChange={e => setFilterSumber(e.target.value)}
                                className="border border-gray-300 rounded-lg px-2.5 py-2 text-xs"
                            >
                                <option value="">Semua Sumber Perolehan</option>
                                <option value="Beli Sendiri">Beli Sendiri (Kas Pondok)</option>
                                <option value="Wakaf">Wakaf</option>
                                <option value="Hibah/Hadiah">Hibah / Hadiah</option>
                                <option value="Bantuan Pemerintah">Bantuan Pemerintah</option>
                            </select>
                            <select
                                value={filterKondisi}
                                onChange={e => setFilterKondisi(e.target.value)}
                                className="border border-gray-300 rounded-lg px-2.5 py-2 text-xs"
                            >
                                <option value="">Semua Kondisi</option>
                                <option value="Baik">Baik</option>
                                <option value="Rusak Ringan">Rusak Ringan</option>
                                <option value="Rusak Berat">Rusak Berat</option>
                                <option value="Afkir">Afkir (Dibuang)</option>
                            </select>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                <span>
                                    Menampilkan <strong>{filteredAssets.length}</strong> aset
                                    {filterLokasi && (
                                        <span className="ml-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                                            Mode KIR: {filterLokasi}
                                        </span>
                                    )}
                                </span>
                                {(searchTerm || filterKondisi || filterKategori || filterLokasi || filterSumber) && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="text-red-600 hover:underline font-semibold"
                                    >
                                        Reset Filter
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLabelModalOpen(true)}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                                >
                                    <i className="bi bi-upc-scan"></i> Cetak Label Stiker
                                </button>

                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsExportMenuOpen(prev => !prev)}
                                        disabled={isExporting}
                                        className="bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-indigo-800 flex items-center gap-1.5 disabled:opacity-60"
                                    >
                                        <i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-printer-fill'}`}></i>
                                        {isExporting ? 'Memproses...' : filterLokasi ? `Cetak KIR (${filterLokasi})` : 'Cetak Laporan / KIR'}
                                    </button>
                                    {isExportMenuOpen && (
                                        <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden text-xs">
                                            <button disabled={isExporting} onClick={() => handleExportAction('print')} className="w-full px-3.5 py-2 text-left hover:bg-gray-50 font-semibold flex items-center gap-2"><i className="bi bi-printer text-teal-600"></i> Cetak / PDF Vektor</button>
                                            <button disabled={isExporting} onClick={() => handleExportAction('pdfImage')} className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-2"><i className="bi bi-file-earmark-pdf text-rose-600"></i> PDF Gambar</button>
                                            <button disabled={isExporting} onClick={() => handleExportAction('pdfAutoTable')} className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-2"><i className="bi bi-table text-blue-600"></i> PDF AutoTable</button>
                                            <button disabled={isExporting} onClick={() => handleExportAction('excel')} className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-2"><i className="bi bi-file-earmark-excel text-emerald-600"></i> Ekspor Excel (.xlsx)</button>
                                            <button disabled={isExporting} onClick={() => handleExportAction('word')} className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-2"><i className="bi bi-file-earmark-word text-indigo-600"></i> Dokumen Word</button>
                                            <button disabled={isExporting} onClick={() => handleExportAction('html')} className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-2"><i className="bi bi-filetype-html text-amber-600"></i> Dokumen HTML</button>
                                        </div>
                                    )}
                                </div>

                                {canWrite && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setIsBulkModalOpen(true)}
                                            className="bg-teal-50 text-teal-800 border border-teal-300 px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-100 flex items-center gap-1.5"
                                        >
                                            <i className="bi bi-table"></i> Tambah Massal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}
                                            className="bg-teal-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 flex items-center gap-1.5 shadow-xs"
                                        >
                                            <i className="bi bi-plus-lg"></i> Tambah Aset
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabel Desktop */}
                    <div className="hidden md:block app-table-shell overflow-x-auto">
                        <table className="app-table text-sm text-left">
                            <thead className="uppercase border-b border-app-border text-xs">
                                <tr>
                                    <th className="px-4 py-3">Kode &amp; Nama Barang</th>
                                    <th className="px-4 py-3">Kategori &amp; Sumber</th>
                                    <th className="px-4 py-3">Lokasi &amp; PIC</th>
                                    {activeTab === 'bergerak' ? <th className="px-4 py-3 text-center">Jml</th> : <th className="px-4 py-3">Legalitas / Luas</th>}
                                    <th className="px-4 py-3">Kondisi &amp; Status</th>
                                    <th className="px-4 py-3 text-right">Nilai Perolehan / Buku</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredAssets.map(item => {
                                    const bookVal = calculateBookValue(item);
                                    const activeLoan = item.riwayatPeminjaman?.find(l => l.status === 'Dipinjam');
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-mono text-[11px] text-teal-700 font-bold">{item.kode}</div>
                                                <div className="font-bold text-gray-900">{item.nama}</div>
                                                {item.merkSpesifikasi && (
                                                    <div className="text-xs text-gray-500">{item.merkSpesifikasi}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="font-semibold text-gray-800">{item.kategori || '-'}</div>
                                                <div className="text-gray-500">
                                                    <span className={`font-semibold ${item.sumber === 'Wakaf' ? 'text-emerald-700' : ''}`}>{item.sumber}</span> • {item.tanggalPerolehan}
                                                </div>
                                                {item.nadzirWakaf && (
                                                    <div className="text-[10px] text-emerald-700 font-medium">Wakif: {item.nadzirWakaf}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="font-semibold text-gray-800">{item.lokasi || '-'}</div>
                                                {item.penanggungJawab && (
                                                    <div className="text-gray-500">PIC: {item.penanggungJawab}</div>
                                                )}
                                            </td>
                                            {activeTab === 'bergerak' ? (
                                                <td className="px-4 py-3 text-center font-bold text-xs">{item.jumlah} {item.satuan || 'Unit'}</td>
                                            ) : (
                                                <td className="px-4 py-3 text-xs">
                                                    <div className="font-bold">{item.luas || 0} m²</div>
                                                    <div className="text-gray-500 truncate max-w-[160px]" title={item.legalitas}>{item.legalitas || '-'}</div>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-xs space-y-1">
                                                <div>
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        item.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                                                        item.kondisi === 'Rusak Ringan' ? 'bg-yellow-100 text-yellow-700' :
                                                        item.kondisi === 'Rusak Berat' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-200 text-gray-700'
                                                    }`}>
                                                        {item.kondisi}
                                                    </span>
                                                </div>
                                                {item.statusPinjam === 'Dipinjam' && (
                                                    <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                                                        Dipinjam: {activeLoan?.peminjam || '-'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs">
                                                <div className="font-bold text-gray-900">{formatRupiah(item.hargaPerolehan)}</div>
                                                {item.jenis === 'Bergerak' && bookVal !== item.hargaPerolehan && (
                                                    <div className="text-[10px] text-gray-400" title="Estimasi nilai buku saat ini setelah penyusutan">
                                                        Nilai Buku: {formatRupiah(bookVal)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {canWrite && (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMaintenanceAsset(item)}
                                                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                                                            title="Catat Servis / Pemeliharaan"
                                                        >
                                                            <i className="bi bi-tools"></i>
                                                        </button>
                                                        {item.jenis === 'Bergerak' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setBorrowAsset(item)}
                                                                className={`p-1.5 rounded-lg ${
                                                                    item.statusPinjam === 'Dipinjam'
                                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                                }`}
                                                                title={item.statusPinjam === 'Dipinjam' ? 'Proses Pengembalian Aset' : 'Catat Peminjaman Aset'}
                                                            >
                                                                <i className="bi bi-arrow-left-right"></i>
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditingAsset(item); setIsModalOpen(true); }}
                                                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                            title="Edit Aset"
                                                        >
                                                            <i className="bi bi-pencil-square"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                                            title="Hapus Aset"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredAssets.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-4">
                                            <EmptyState icon="bi-box-seam" title="Data aset kosong" description="Belum ada data aset yang cocok dengan filter sarpras saat ini." />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Kartu Mobile / Tablet Kecil */}
                    <div className="md:hidden space-y-3">
                        {filteredAssets.map(item => (
                            <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-mono text-[10px] font-bold text-teal-700">{item.kode}</div>
                                        <div className="font-bold text-sm text-gray-900">{item.nama}</div>
                                        {item.merkSpesifikasi && <div className="text-xs text-gray-500">{item.merkSpesifikasi}</div>}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        item.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                                        item.kondisi === 'Rusak Ringan' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {item.kondisi}
                                    </span>
                                </div>
                                <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                                    <div>{item.kategori} • Lokasi: <strong>{item.lokasi || '-'}</strong></div>
                                    {item.penanggungJawab && <div>PIC: {item.penanggungJawab}</div>}
                                    <div>{item.sumber} • {item.tanggalPerolehan}</div>
                                    {activeTab === 'bergerak' ? (
                                        <div className="font-semibold mt-1">Jumlah: {item.jumlah} {item.satuan || 'Unit'}</div>
                                    ) : (
                                        <div className="font-semibold mt-1">Luas: {item.luas || 0} m² • {item.legalitas || '-'}</div>
                                    )}
                                </div>
                                <div className="mt-3 pt-2.5 border-t flex items-center justify-between">
                                    <div className="text-sm font-bold text-gray-900">{formatRupiah(item.hargaPerolehan)}</div>
                                    {canWrite && (
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setMaintenanceAsset(item)} className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold"><i className="bi bi-tools"></i></button>
                                            {item.jenis === 'Bergerak' && (
                                                <button onClick={() => setBorrowAsset(item)} className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold"><i className="bi bi-arrow-left-right"></i></button>
                                            )}
                                            <button onClick={() => { setEditingAsset(item); setIsModalOpen(true); }} className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold"><i className="bi bi-pencil-square"></i></button>
                                            <button onClick={() => handleDelete(item.id)} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold"><i className="bi bi-trash"></i></button>
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Tab 4: Pusat Servis & Peminjaman */}
            {activeTab === 'pemeliharaan' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    {/* Kolom Kiri: Riwayat Servis & Perbaikan */}
                    <SectionCard
                        title="Jurnal Pemeliharaan & Servis Aset"
                        description="Rekam jejak perawatan, perbaikan kerusakan, dan biaya pemeliharaan inventaris."
                        contentClassName="p-4 md:p-5"
                    >
                        <div className="space-y-3">
                            {allMaintenanceLogs.length > 0 ? (
                                allMaintenanceLogs.map(({ asset, log }) => (
                                    <div key={log.id} className="p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-start justify-between gap-3 text-xs">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-bold text-gray-900">{asset.nama}</span>
                                                <span className="font-mono text-[10px] text-gray-500">({asset.kode})</span>
                                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">{log.jenisTindakan}</span>
                                            </div>
                                            <p className="text-gray-700">{log.deskripsi}</p>
                                            <p className="text-[11px] text-gray-400">
                                                {formatDate(log.tanggal)} • Teknisi: {log.teknisiVendor || '-'} • Lokasi: {asset.lokasi || '-'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 space-y-1">
                                            <div className="font-bold text-gray-900">{formatRupiah(log.biaya)}</div>
                                            <button
                                                type="button"
                                                onClick={() => setMaintenanceAsset(asset)}
                                                className="text-[11px] text-amber-700 hover:underline font-semibold"
                                            >
                                                + Servis Lagi
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon="bi-tools"
                                    title="Belum ada riwayat servis"
                                    description="Klik ikon kunci pas (Servis) pada baris aset di tab Aset Bergerak atau Tanah & Bangunan untuk mencatat pemeliharaan."
                                />
                            )}
                        </div>
                    </SectionCard>

                    {/* Kolom Kanan: Sirkulasi Peminjaman Aset */}
                    <SectionCard
                        title="Sirkulasi Peminjaman Aset"
                        description="Daftar aset yang sedang dipinjam maupun riwayat pengembalian inventaris bergerak."
                        contentClassName="p-4 md:p-5"
                    >
                        <div className="space-y-3">
                            {allBorrowLogs.length > 0 ? (
                                allBorrowLogs.map(({ asset, log }) => (
                                    <div key={log.id} className="p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-start justify-between gap-3 text-xs">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-bold text-gray-900">{asset.nama}</span>
                                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                                    log.status === 'Dipinjam' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                            <p className="text-gray-700">
                                                Peminjam: <strong>{log.peminjam}</strong> ({log.tipePeminjam}) — {log.keperluan}
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                Pinjam: {formatDate(log.tanggalPinjam)} • Target Kembali: {formatDate(log.estimasiKembali)}
                                                {log.tanggalKembaliAktual ? ` • Kembali: ${formatDate(log.tanggalKembaliAktual)}` : ''}
                                            </p>
                                        </div>
                                        {log.status === 'Dipinjam' && canWrite && (
                                            <button
                                                type="button"
                                                onClick={() => setBorrowAsset(asset)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shrink-0"
                                            >
                                                Kembalikan
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    icon="bi-arrow-left-right"
                                    title="Belum ada riwayat peminjaman"
                                    description="Klik ikon Pinjam pada baris aset di tab Aset Bergerak untuk mencatat peminjaman inventaris."
                                />
                            )}
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* Modals */}
            <InventarisModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                onUpdate={handleUpdate}
                initialData={editingAsset}
                existingLocations={existingLocations}
                teacherNames={teacherNames}
            />

            <BulkSarprasModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSaveBulk={handleSaveBulk}
            />

            <SarprasLabelModal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                assets={activeTab === 'dashboard' || activeTab === 'pemeliharaan' ? assets : filteredAssets}
                settings={settings}
            />

            <MaintenanceModal
                isOpen={Boolean(maintenanceAsset)}
                onClose={() => setMaintenanceAsset(null)}
                asset={maintenanceAsset}
                onSaveMaintenance={handleSaveMaintenance}
                currentUserName={currentUserName}
            />

            <BorrowModal
                isOpen={Boolean(borrowAsset)}
                onClose={() => setBorrowAsset(null)}
                asset={borrowAsset}
                onBorrowAsset={handleBorrowAsset}
                onReturnAsset={handleReturnAsset}
                currentUserName={currentUserName}
                teacherNames={teacherNames}
            />

            {/* Offscreen Print Area */}
            <div
                className="fixed -left-[10000px] top-0 z-[-1] opacity-0 pointer-events-none print:static print:left-auto print:top-auto print:z-auto print:opacity-100 print:pointer-events-auto"
                aria-hidden="true"
            >
                <div id="sarpras-print-area">
                    <SarprasReportTemplate
                        settings={settings}
                        assets={activeTab === 'dashboard' || activeTab === 'pemeliharaan' ? assets : filteredAssets}
                        filterTitle={
                            filterLokasi
                                ? `Ruangan / Lokasi: ${filterLokasi}`
                                : activeTab === 'dashboard' || activeTab === 'pemeliharaan'
                                ? 'Semua Aset & Inventaris'
                                : activeTab === 'bergerak'
                                ? 'Inventaris Aset Bergerak'
                                : 'Aset Tetap (Tanah, Bangunan & Wakaf)'
                        }
                        filterLokasi={filterLokasi}
                    />
                </div>
            </div>
        </div>
    );
};

export default Sarpras;
