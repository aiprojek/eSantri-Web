import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useAppContext } from '../AppContext';
import { useFinanceContext } from '../contexts/FinanceContext';
import { TransaksiKas, ChartOfAccount } from '../types';
import { formatRupiah } from '../utils/formatters';
import { db } from '../db';
import { loadXLSX } from '../utils/lazyClientLibs';
import { buildStandardExportFileName } from '../utils/exportFileName';
import { printExportFacade } from '../utils/printExportFacade';
import { printToPdfNative } from '../utils/pdfGenerator';
import { Pagination } from './common/Pagination';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';

const DEFAULT_REKENING_LIST = [
    'Kas Tunai Bendahara',
    'Bank Syariah Indonesia (BSI)',
    'Bank Muamalat',
    'Bank BRI / Mandiri',
    'Kas Kecil Operasional',
];

type EnrichedTransaksiKas = TransaksiKas & {
    runningBalanceGlobal: number;
    runningBalanceRekening: number;
};

const toDateInputValue = (isoOrDate?: string) => {
    if (!isoOrDate) return new Date().toISOString().split('T')[0];
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
};

const buildIsoFromDateInput = (dateStr: string, originalIso?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (originalIso && originalIso.startsWith(dateStr)) {
        return originalIso;
    }
    if (dateStr === todayStr) {
        return new Date().toISOString();
    }
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return new Date(`${dateStr}T${hh}:${mm}:${ss}`).toISOString();
};

const StatCard: React.FC<{ icon: string; title: string; value: string | number; subtitle?: string; color: string; textColor: string }> = ({ icon, title, value, subtitle, color, textColor }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4 transition-transform hover:-translate-y-0.5">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
            <i className={`${icon} text-lg`}></i>
        </div>
        <div className="min-w-0">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide truncate">{title}</p>
            <p className={`text-xl font-bold ${textColor} truncate`}>{value}</p>
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
    </div>
);

interface TransaksiFormValues {
    tanggalInput: string;
    jenis: 'Pemasukan' | 'Pengeluaran';
    kategori: string;
    deskripsi: string;
    jumlah: number;
    penanggungJawab: string;
    rekening: string;
}

interface TransaksiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'> & { tanggal?: string }, editId?: number) => Promise<void>;
    existingKategori: string[];
    coaList: ChartOfAccount[];
    defaultPj: string;
    editingTx?: TransaksiKas | null;
}

const TransaksiModal: React.FC<TransaksiModalProps> = ({ isOpen, onClose, onSave, existingKategori, coaList, defaultPj, editingTx }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, reset, setValue } = useForm<TransaksiFormValues>({
        defaultValues: {
            tanggalInput: toDateInputValue(),
            jenis: 'Pemasukan',
            kategori: '',
            deskripsi: '',
            jumlah: 0,
            penanggungJawab: defaultPj,
            rekening: 'Kas Tunai Bendahara'
        }
    });
    const jenis = watch('jenis');
    const currentKategori = watch('kategori');

    useEffect(() => {
        if (isOpen) {
            if (editingTx) {
                reset({
                    tanggalInput: toDateInputValue(editingTx.tanggal),
                    jenis: editingTx.jenis,
                    kategori: editingTx.kategori,
                    deskripsi: editingTx.deskripsi,
                    jumlah: editingTx.jumlah,
                    penanggungJawab: editingTx.penanggungJawab || defaultPj,
                    rekening: editingTx.rekening || 'Kas Tunai Bendahara',
                });
            } else {
                reset({
                    tanggalInput: toDateInputValue(),
                    jenis: 'Pemasukan',
                    kategori: '',
                    deskripsi: '',
                    jumlah: 0,
                    penanggungJawab: defaultPj,
                    rekening: 'Kas Tunai Bendahara',
                });
            }
        }
    }, [isOpen, reset, defaultPj, editingTx]);

    const filteredCoaOptions = useMemo(() => {
        return coaList
            .filter(c => {
                if (jenis === 'Pemasukan') return c.kategori === 'Pendapatan' || c.kategori === 'Modal' || c.kategori === 'Kewajiban';
                return c.kategori === 'Beban' || c.kategori === 'Harta' || c.kategori === 'Kewajiban';
            })
            .sort((a, b) => a.kode.localeCompare(b.kode));
    }, [coaList, jenis]);

    const combinedSuggestions = useMemo(() => {
        const coaLabels = filteredCoaOptions.map(c => `${c.kode} - ${c.nama}`);
        const manual = existingKategori.filter(k => !coaLabels.includes(k));
        return [...coaLabels, ...manual];
    }, [filteredCoaOptions, existingKategori]);

    if (!isOpen) return null;

    const onSubmit = async (data: TransaksiFormValues) => {
        const finalIso = buildIsoFromDateInput(data.tanggalInput, editingTx?.tanggal);
        await onSave({
            jenis: data.jenis,
            kategori: data.kategori.trim(),
            deskripsi: data.deskripsi.trim(),
            jumlah: Number(data.jumlah),
            penanggungJawab: data.penanggungJawab.trim(),
            rekening: data.rekening,
            tanggal: finalIso,
        }, editingTx?.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{editingTx ? 'Edit / Koreksi Transaksi Kas' : 'Tambah Transaksi Kas'}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Sesuaikan tanggal nota fisik, pos rekening, dan akun kategori COA.</p>
                        </div>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg"></i></button>
                    </div>
                    <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase text-gray-600">Tanggal Nota</label>
                                <input type="date" {...register('tanggalInput', { required: 'Tanggal wajib diisi' })} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase text-gray-600">Jenis Transaksi</label>
                                <select {...register('jenis')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5 font-semibold">
                                    <option value="Pemasukan">Pemasukan (+)</option>
                                    <option value="Pengeluaran">Pengeluaran (-)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase text-gray-600">Jumlah (Rp)</label>
                                <input type="number" {...register('jumlah', { required: 'Jumlah wajib diisi', valueAsNumber: true, min: { value: 1, message: 'Jumlah harus > 0' }})} className={`bg-gray-50 border text-gray-900 text-sm font-bold rounded-lg w-full p-2.5 ${errors.jumlah ? 'border-red-500' : 'border-gray-300'}`} />
                                {errors.jumlah && <p className="text-xs text-red-600 mt-1">{errors.jumlah.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase text-gray-600">Pos Kas / Rekening</label>
                                <select {...register('rekening')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                    {DEFAULT_REKENING_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-semibold uppercase text-gray-600">Kategori / Akun COA</label>
                                <input list="kategori-list" {...register('kategori', { required: 'Kategori wajib diisi' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.kategori ? 'border-red-500' : 'border-gray-300'}`} placeholder="Pilih akun COA atau ketik..." />
                                <datalist id="kategori-list">{combinedSuggestions.map(k => <option key={k} value={k} />)}</datalist>
                                {errors.kategori && <p className="text-xs text-red-600 mt-1">{errors.kategori.message}</p>}
                            </div>
                        </div>

                        {filteredCoaOptions.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Pilih Cepat Bagan Akun ({jenis}):</p>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {filteredCoaOptions.map(c => {
                                        const label = `${c.kode} - ${c.nama}`;
                                        const isSelected = currentKategori === label || currentKategori === c.nama;
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setValue('kategori', label, { shouldValidate: true })}
                                                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${isSelected ? 'bg-teal-600 text-white border-teal-600 font-semibold' : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50'}`}
                                            >
                                                <span className="font-mono font-bold">{c.kode}</span> {c.nama}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block mb-1 text-xs font-semibold uppercase text-gray-600">Deskripsi / Uraian Nota</label>
                            <textarea {...register('deskripsi', { required: 'Deskripsi wajib diisi' })} rows={2} placeholder="Contoh: Pembelian beras 5 karung Nota #104 / Infaq Hamba Allah" className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.deskripsi ? 'border-red-500' : 'border-gray-300'}`}></textarea>
                            {errors.deskripsi && <p className="text-xs text-red-600 mt-1">{errors.deskripsi.message}</p>}
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-semibold uppercase text-gray-600">Penanggung Jawab / Penerima</label>
                            <input type="text" {...register('penanggungJawab', { required: 'Penanggung Jawab wajib diisi' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.penanggungJawab ? 'border-red-500' : 'border-gray-300'}`}/>
                            {errors.penanggungJawab && <p className="text-xs text-red-600 mt-1">{errors.penanggungJawab.message}</p>}
                        </div>
                    </div>
                    <div className="p-4 border-t bg-slate-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button>
                        <button type="submit" disabled={isSubmitting} className={`text-white font-semibold rounded-lg text-sm px-5 py-2.5 ${jenis === 'Pemasukan' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:bg-gray-300`}>{isSubmitting ? 'Menyimpan...' : (editingTx ? 'Simpan Perubahan' : 'Simpan Transaksi')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface MutasiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMutasi: (from: string, to: string, jumlah: number, deskripsi: string, pj: string, tanggal?: string) => Promise<void>;
    defaultPj: string;
    rekeningBalances: Record<string, number>;
}

const MutasiKasModal: React.FC<MutasiModalProps> = ({ isOpen, onClose, onMutasi, defaultPj, rekeningBalances }) => {
    const [tanggalInput, setTanggalInput] = useState(toDateInputValue());
    const [fromRekening, setFromRekening] = useState('Kas Tunai Bendahara');
    const [toRekening, setToRekening] = useState('Bank Syariah Indonesia (BSI)');
    const [jumlah, setJumlah] = useState<number>(0);
    const [deskripsi, setDeskripsi] = useState('');
    const [pj, setPj] = useState(defaultPj);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTanggalInput(toDateInputValue());
            setJumlah(0);
            setDeskripsi('');
            setPj(defaultPj);
        }
    }, [isOpen, defaultPj]);

    if (!isOpen) return null;

    const availableSourceBalance = rekeningBalances[fromRekening] || 0;
    const isInsufficient = jumlah > availableSourceBalance;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fromRekening === toRekening || jumlah <= 0) return;
        setIsSubmitting(true);
        try {
            const isoDate = buildIsoFromDateInput(tanggalInput);
            await onMutasi(fromRekening, toRekening, jumlah, deskripsi || 'Pindah buku / Setor tunai ke bank', pj || 'Bendahara', isoDate);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-800">Mutasi Kas Antar Pos / Rekening</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Pindahkan dana antar kas tunai dan rekening bank tanpa mengubah total saldo akhir.</p>
                    </div>
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block mb-1 text-xs font-semibold uppercase text-slate-600">Tanggal Mutasi</label>
                            <input type="date" value={tanggalInput} onChange={e => setTanggalInput(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold uppercase text-slate-600">Dari Pos Kas (Sumber)</label>
                                <span className={`text-xs font-bold ${availableSourceBalance <= 0 ? 'text-red-600' : 'text-teal-700'}`}>
                                    Saldo: {formatRupiah(availableSourceBalance)}
                                </span>
                            </div>
                            <select value={fromRekening} onChange={e => setFromRekening(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-medium">
                                {DEFAULT_REKENING_LIST.map(r => (
                                    <option key={r} value={r}>{r} ({formatRupiah(rekeningBalances[r] || 0)})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-semibold uppercase text-slate-600">Ke Pos Kas (Tujuan)</label>
                            <select value={toRekening} onChange={e => setToRekening(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-medium">
                                {DEFAULT_REKENING_LIST.map(r => (
                                    <option key={r} value={r}>{r} ({formatRupiah(rekeningBalances[r] || 0)})</option>
                                ))}
                            </select>
                            {fromRekening === toRekening && (
                                <p className="text-xs text-red-600 mt-1">Pos sumber dan tujuan tidak boleh sama.</p>
                            )}
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-semibold uppercase text-slate-600">Nominal Mutasi (Rp)</label>
                            <input type="number" min={1} value={jumlah || ''} onChange={e => setJumlah(Number(e.target.value) || 0)} required className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm font-bold" placeholder="Contoh: 5000000" />
                            {isInsufficient && (
                                <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-1.5">
                                    <i className="bi bi-exclamation-triangle-fill text-amber-600"></i>
                                    <span>Perhatian: Nominal mutasi melebihi tercatat di <strong>{fromRekening}</strong> ({formatRupiah(availableSourceBalance)}).</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-semibold uppercase text-slate-600">Keterangan Mutasi</label>
                            <input type="text" value={deskripsi} onChange={e => setDeskripsi(e.target.value)} required placeholder="Contoh: Setor tunai kas laci ke BSI" className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                        </div>
                        <div>
                            <label className="block mb-1 text-xs font-semibold uppercase text-slate-600">Penanggung Jawab</label>
                            <input type="text" value={pj} onChange={e => setPj(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm" />
                        </div>
                    </div>
                    <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border bg-white hover:bg-gray-50">Batal</button>
                        <button type="submit" disabled={isSubmitting || fromRekening === toRekening || jumlah <= 0} className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300">
                            {isSubmitting ? 'Memproses...' : 'Simpan Mutasi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface CoaManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    coaList: ChartOfAccount[];
    onSaveCoa: (coa: Omit<ChartOfAccount, 'id'> & { id?: number }) => Promise<void>;
    onDeleteCoa: (id: number) => Promise<void>;
    onSeedDefaultCoa: () => Promise<number>;
}

const CoaManagerModal: React.FC<CoaManagerModalProps> = ({ isOpen, onClose, coaList, onSaveCoa, onDeleteCoa, onSeedDefaultCoa }) => {
    const { showToast, showConfirmation } = useAppContext();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [kode, setKode] = useState('');
    const [nama, setNama] = useState('');
    const [kategori, setKategori] = useState<ChartOfAccount['kategori']>('Pendapatan');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const sortedCoa = [...coaList].sort((a, b) => a.kode.localeCompare(b.kode));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kode.trim() || !nama.trim()) return;
        setIsSaving(true);
        try {
            await onSaveCoa({
                id: editingId || undefined,
                kode: kode.trim(),
                nama: nama.trim(),
                kategori
            });
            showToast(editingId ? 'Akun COA diperbarui.' : 'Akun COA ditambahkan.', 'success');
            setEditingId(null);
            setKode('');
            setNama('');
        } catch (err) {
            showToast((err as Error).message || 'Gagal menyimpan akun COA.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSeed = async () => {
        const added = await onSeedDefaultCoa();
        if (added > 0) {
            showToast(`${added} akun standar pesantren berhasil dimuat.`, 'success');
        } else {
            showToast('Seluruh kode akun standar pesantren sudah tersedia.', 'info');
        }
    };

    const handleEdit = (c: ChartOfAccount) => {
        setEditingId(c.id);
        setKode(c.kode);
        setNama(c.nama);
        setKategori(c.kategori);
    };

    const handleDelete = (c: ChartOfAccount) => {
        showConfirmation(
            'Hapus Akun COA?',
            `Hapus akun "${c.kode} - ${c.nama}" dari daftar Bagan Akun?`,
            async () => {
                await onDeleteCoa(c.id);
                showToast('Akun COA dihapus.', 'success');
            },
            { confirmColor: 'red', confirmText: 'Ya, Hapus' }
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Bagan Akun / Master Kategori Kas (COA)</h3>
                        <p className="text-xs text-slate-500">Standarisasi kode dan nama akun untuk Pemasukan (Pendapatan) &amp; Pengeluaran (Beban).</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleSeed} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold hover:bg-teal-100 flex items-center gap-1">
                            <i className="bi bi-magic"></i> Muat Preset Pesantren
                        </button>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><i className="bi bi-x-lg"></i></button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-4 bg-slate-50/60 border-b grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Kode</label>
                        <input type="text" value={kode} onChange={e => setKode(e.target.value)} placeholder="401" required className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono font-bold" />
                    </div>
                    <div className="sm:col-span-5">
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nama Akun / Kategori</label>
                        <input type="text" value={nama} onChange={e => setNama(e.target.value)} placeholder="Contoh: Konsumsi & Dapur Santri" required className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs" />
                    </div>
                    <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Kelompok</label>
                        <select value={kategori} onChange={e => setKategori(e.target.value as ChartOfAccount['kategori'])} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium">
                            <option value="Pendapatan">Pendapatan (Masuk)</option>
                            <option value="Beban">Beban / Biaya (Keluar)</option>
                            <option value="Harta">Harta / Aset</option>
                            <option value="Kewajiban">Kewajiban / Hutang</option>
                            <option value="Modal">Modal / Wakaf</option>
                        </select>
                    </div>
                    <div className="sm:col-span-2 flex gap-1">
                        <button type="submit" disabled={isSaving} className="w-full rounded-lg bg-teal-600 text-white py-2 px-3 text-xs font-bold hover:bg-teal-700">
                            {editingId ? 'Update' : 'Tambah'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={() => { setEditingId(null); setKode(''); setNama(''); }} className="rounded-lg border bg-white px-2 py-2 text-xs text-slate-600">
                                Batal
                            </button>
                        )}
                    </div>
                </form>

                <div className="flex-1 overflow-y-auto p-4">
                    {sortedCoa.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            Belum ada Bagan Akun (COA). Klik tombol <strong>"Muat Preset Pesantren"</strong> di kanan atas untuk mengisi akun standar secara instan.
                        </div>
                    ) : (
                        <table className="w-full text-xs text-left border rounded-lg overflow-hidden">
                            <thead className="bg-slate-100 text-slate-600 uppercase">
                                <tr>
                                    <th className="p-2.5 w-20">Kode</th>
                                    <th className="p-2.5">Nama Akun / Kategori</th>
                                    <th className="p-2.5 w-36">Kelompok</th>
                                    <th className="p-2.5 w-24 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {sortedCoa.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                        <td className="p-2.5 font-mono font-bold text-slate-800">{c.kode}</td>
                                        <td className="p-2.5 font-medium text-slate-800">{c.nama}</td>
                                        <td className="p-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.kategori === 'Pendapatan' || c.kategori === 'Modal' ? 'bg-green-100 text-green-800' : c.kategori === 'Beban' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {c.kategori}
                                            </span>
                                        </td>
                                        <td className="p-2.5 text-center space-x-2">
                                            <button type="button" onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800" title="Edit"><i className="bi bi-pencil-square"></i></button>
                                            <button type="button" onClick={() => handleDelete(c)} className="text-red-600 hover:text-red-800" title="Hapus"><i className="bi bi-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end">
                    <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-900">Tutup</button>
                </div>
            </div>
        </div>
    );
};

const VoucherPreviewModal: React.FC<{ tx: EnrichedTransaksiKas | null; onClose: () => void }> = ({ tx, onClose }) => {
    const { settings } = useAppContext();
    if (!tx) return null;

    const isMasuk = tx.jenis === 'Pemasukan';
    const kodeBukti = `${isMasuk ? 'BKM' : 'BKK'}-${new Date(tx.tanggal).getFullYear()}${String(new Date(tx.tanggal).getMonth() + 1).padStart(2, '0')}-${String(tx.id).slice(-5)}`;

    const handlePrint = () => {
        printToPdfNative('bukti-kas-voucher-print', `${kodeBukti}_${tx.kategori.replace(/\s+/g, '_')}`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[80] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Cetak {isMasuk ? 'Bukti Kas Masuk (BKM)' : 'Bukti Kas Keluar (BKK)'}</h3>
                        <p className="text-xs text-slate-500">Nomor: {kodeBukti}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handlePrint} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 flex items-center gap-1.5">
                            <i className="bi bi-printer-fill"></i> Cetak / Simpan PDF
                        </button>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5"><i className="bi bi-x-lg"></i></button>
                    </div>
                </div>

                <div className="p-6 bg-slate-100 max-h-[75vh] overflow-y-auto">
                    <div id="bukti-kas-voucher-print" className="bg-white p-8 border border-slate-300 rounded-lg text-slate-900 space-y-5">
                        <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-wide text-slate-900">{settings.namaPonpes || 'Pondok Pesantren'}</h2>
                                <p className="text-xs text-slate-600">{settings.alamat || ''}</p>
                                {settings.telepon && <p className="text-xs text-slate-600">Telp: {settings.telepon}</p>}
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded text-xs font-black uppercase border ${isMasuk ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300'}`}>
                                    {isMasuk ? 'BUKTI KAS MASUK' : 'BUKTI KAS KELUAR'}
                                </span>
                                <p className="text-xs font-mono font-bold mt-1">No: {kodeBukti}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                                <p><span className="text-slate-500 inline-block w-28">Tanggal:</span> <strong>{new Date(tx.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></p>
                                <p><span className="text-slate-500 inline-block w-28">Pos Rekening:</span> <strong>{tx.rekening || 'Kas Tunai Bendahara'}</strong></p>
                            </div>
                            <div className="space-y-1">
                                <p><span className="text-slate-500 inline-block w-28">Akun / Kategori:</span> <strong>{tx.kategori}</strong></p>
                                <p><span className="text-slate-500 inline-block w-28">{isMasuk ? 'Diterima Oleh:' : 'Penanggung Jawab:'}</span> <strong>{tx.penanggungJawab || 'Bendahara'}</strong></p>
                            </div>
                        </div>

                        <table className="w-full text-xs border-collapse border border-slate-400">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="border border-slate-400 p-2.5 text-left">Uraian / Deskripsi Transaksi</th>
                                    <th className="border border-slate-400 p-2.5 text-right w-44">Nominal (Rp)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-slate-400 p-3 align-top min-h-[60px]">{tx.deskripsi}</td>
                                    <td className="border border-slate-400 p-3 text-right font-bold text-sm align-top">{formatRupiah(tx.jumlah)}</td>
                                </tr>
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold">
                                <tr>
                                    <td className="border border-slate-400 p-2.5 text-right uppercase">Total {tx.jenis}</td>
                                    <td className="border border-slate-400 p-2.5 text-right text-sm">{formatRupiah(tx.jumlah)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
                            <div>
                                <p className="text-slate-600 mb-14">Mengetahui,<br/>Pimpinan / Mudir</p>
                                <p className="font-bold underline">{settings.namaMudir || '..........................'}</p>
                            </div>
                            <div>
                                <p className="text-slate-600 mb-14">Dibukukan Oleh,<br/>Bendahara Pondok</p>
                                <p className="font-bold underline">{tx.penanggungJawab || '..........................'}</p>
                            </div>
                            <div>
                                <p className="text-slate-600 mb-14">{isMasuk ? 'Penyetor,' : 'Penerima Dana,'}<br/>&nbsp;</p>
                                <p className="font-bold underline">..........................</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BukuKas: React.FC = () => {
    const { showToast, showAlert, showConfirmation, currentUser } = useAppContext();
    const {
        transaksiKasList,
        coaList,
        onAddTransaksiKas,
        onUpdateTransaksiKas,
        onDeleteTransaksiKas,
        onMutasiKas,
        onSaveCoa,
        onDeleteCoa,
        onSeedDefaultCoa,
    } = useFinanceContext();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<TransaksiKas | null>(null);
    const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
    const [isCoaModalOpen, setIsCoaModalOpen] = useState(false);
    const [voucherTx, setVoucherTx] = useState<EnrichedTransaksiKas | null>(null);
    const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);
    
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.bukukas === 'write';
    const defaultPj = currentUser?.fullName || currentUser?.username || 'Bendahara';

    const [filters, setFilters] = useState({ startDate: '', endDate: '', jenis: '', kategori: '', rekening: '' });
    
    const [transactions, setTransactions] = useState<EnrichedTransaksiKas[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const itemsPerPage = 15;
    
    const [stats, setStats] = useState({ totalPemasukan: 0, totalPengeluaran: 0, saldoAkhir: 0 });
    const [rekeningBalances, setRekeningBalances] = useState<Record<string, number>>({});
    const [existingKategori, setExistingKategori] = useState<string[]>([]);
    const [filteredRows, setFilteredRows] = useState<EnrichedTransaksiKas[]>([]);
    const fetchRunIdRef = useRef(0);

    const applyDatePreset = (preset: 0 | 7 | 30 | 'month') => {
        const end = new Date();
        const start = new Date();
        if (preset === 'month') {
            start.setDate(1);
        } else if (preset > 0) {
            start.setDate(end.getDate() - (preset - 1));
        }
        const toInputDate = (d: Date) => d.toISOString().split('T')[0];
        setFilters(f => ({
            ...f,
            startDate: toInputDate(start),
            endDate: toInputDate(end),
        }));
    };

    const resetFilters = () => {
        setFilters({ startDate: '', endDate: '', jenis: '', kategori: '', rekening: '' });
    };

    const fetchTransactions = useCallback(async () => {
        const runId = ++fetchRunIdRef.current;
        setIsLoading(true);
        try {
            const startDate = filters.startDate ? new Date(`${filters.startDate}T00:00:00`).getTime() : null;
            const endDate = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`).getTime() : null;
            const searchQuery = filters.kategori.trim().toLowerCase();

            // Load all active transactions and sort chronologically ascending to compute exact running balances
            const allTxAsc = (await db.transaksiKas.filter(t => !t.deleted).toArray()).sort((a, b) => {
                const timeDiff = new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
                if (timeDiff !== 0) return timeDiff;
                return (a.id || 0) - (b.id || 0);
            });

            const rekMap: Record<string, number> = {};
            DEFAULT_REKENING_LIST.forEach(r => {
                rekMap[r] = 0;
            });
            let globalRunning = 0;
            const uniqueCats = new Set<string>();

            const enrichedAsc: EnrichedTransaksiKas[] = allTxAsc.map(t => {
                const rek = t.rekening || 'Kas Tunai Bendahara';
                const delta = t.jenis === 'Pemasukan' ? t.jumlah : -t.jumlah;
                globalRunning += delta;
                rekMap[rek] = (rekMap[rek] || 0) + delta;
                uniqueCats.add(t.kategori);
                return {
                    ...t,
                    runningBalanceGlobal: globalRunning,
                    runningBalanceRekening: rekMap[rek],
                };
            });

            // Reverse for newest-first display
            const enrichedDesc = [...enrichedAsc].reverse();

            const allMatching = enrichedDesc.filter(t => {
                const txTime = new Date(t.tanggal).getTime();
                if (startDate !== null && txTime < startDate) return false;
                if (endDate !== null && txTime > endDate) return false;
                const jenisMatch = !filters.jenis || t.jenis === filters.jenis;
                const rek = t.rekening || 'Kas Tunai Bendahara';
                const rekMatch = !filters.rekening || rek === filters.rekening;
                const queryMatch = !searchQuery ||
                    t.kategori.toLowerCase().includes(searchQuery) ||
                    t.deskripsi.toLowerCase().includes(searchQuery) ||
                    (t.penanggungJawab || '').toLowerCase().includes(searchQuery);
                return jenisMatch && rekMatch && queryMatch;
            });

            if (runId !== fetchRunIdRef.current) return;

            const count = allMatching.length;
            setTotalItems(count);
            setFilteredRows(allMatching);
            setRekeningBalances(rekMap);

            const offset = (currentPage - 1) * itemsPerPage;
            setTransactions(allMatching.slice(offset, offset + itemsPerPage));

            let totalPemasukan = 0;
            let totalPengeluaran = 0;
            allMatching.forEach(t => {
                if (t.jenis === 'Pemasukan') totalPemasukan += t.jumlah;
                else totalPengeluaran += t.jumlah;
            });

            const saldoAkhir = filters.rekening
                ? (rekMap[filters.rekening] || 0)
                : Object.values(rekMap).reduce((sum, val) => sum + val, 0);

            if (runId !== fetchRunIdRef.current) return;
            setStats({ totalPemasukan, totalPengeluaran, saldoAkhir });
            setExistingKategori(Array.from(uniqueCats));

        } catch (e) {
            console.error("Failed to fetch Buku Kas", e);
        } finally {
            if (runId === fetchRunIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [currentPage, filters]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions, transaksiKasList]);

    const categoryBreakdown = useMemo(() => {
        const masukMap: Record<string, { total: number; count: number }> = {};
        const keluarMap: Record<string, { total: number; count: number }> = {};

        filteredRows.forEach(t => {
            const target = t.jenis === 'Pemasukan' ? masukMap : keluarMap;
            if (!target[t.kategori]) target[t.kategori] = { total: 0, count: 0 };
            target[t.kategori].total += t.jumlah;
            target[t.kategori].count += 1;
        });

        const masukList = Object.entries(masukMap)
            .map(([kategori, v]) => ({ kategori, ...v, pct: stats.totalPemasukan > 0 ? (v.total / stats.totalPemasukan) * 100 : 0 }))
            .sort((a, b) => b.total - a.total);

        const keluarList = Object.entries(keluarMap)
            .map(([kategori, v]) => ({ kategori, ...v, pct: stats.totalPengeluaran > 0 ? (v.total / stats.totalPengeluaran) * 100 : 0 }))
            .sort((a, b) => b.total - a.total);

        return { masukList, keluarList };
    }, [filteredRows, stats.totalPemasukan, stats.totalPengeluaran]);

    const handleSave = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'> & { tanggal?: string }, editId?: number) => {
        if (!canWrite) return;
        try {
            if (editId) {
                await onUpdateTransaksiKas(editId, data);
                showToast('Transaksi berhasil diperbarui.', 'success');
            } else {
                await onAddTransaksiKas(data);
                showToast('Transaksi berhasil ditambahkan.', 'success');
            }
            setEditingTx(null);
            fetchTransactions();
        } catch (e) {
            showAlert('Gagal Menyimpan', (e as Error).message);
        }
    };

    const handleDelete = (t: EnrichedTransaksiKas) => {
        if (!canWrite) return;
        showConfirmation(
            'Hapus Transaksi Kas?',
            `Apakah Anda yakin ingin menghapus transaksi "${t.kategori} - ${formatRupiah(t.jumlah)}"? Saldo Buku Kas akan otomatis disesuaikan.`,
            async () => {
                try {
                    await onDeleteTransaksiKas(t.id);
                    showToast('Transaksi kas berhasil dihapus.', 'success');
                    fetchTransactions();
                } catch (e) {
                    showAlert('Gagal Menghapus', (e as Error).message);
                }
            },
            { confirmColor: 'red', confirmText: 'Ya, Hapus Transaksi' }
        );
    };

    const handleMutasi = async (from: string, to: string, jumlah: number, deskripsi: string, pj: string, tanggal?: string) => {
        if (!canWrite) return;
        try {
            await onMutasiKas(from, to, jumlah, deskripsi, pj, tanggal);
            showToast(`Mutasi sebesar ${formatRupiah(jumlah)} dari ${from} ke ${to} berhasil dicatat.`, 'success');
            fetchTransactions();
        } catch (e) {
            showAlert('Gagal Mutasi Kas', (e as Error).message);
        }
    };

    const buildExportRows = () => {
        return filteredRows.map((t) => ({
            Tanggal: new Date(t.tanggal).toLocaleString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }),
            PosRekening: t.rekening || 'Kas Tunai Bendahara',
            Jenis: t.jenis,
            Kategori: t.kategori,
            Deskripsi: t.deskripsi,
            PenanggungJawab: t.penanggungJawab || '',
            Pemasukan: t.jenis === 'Pemasukan' ? t.jumlah : 0,
            Pengeluaran: t.jenis === 'Pengeluaran' ? t.jumlah : 0,
            SaldoBerjalan: filters.rekening ? t.runningBalanceRekening : t.runningBalanceGlobal,
        }));
    };

    const buildFileName = (ext: 'csv' | 'xlsx') => {
        const suffix = [
            filters.startDate ? `from-${filters.startDate}` : '',
            filters.endDate ? `to-${filters.endDate}` : '',
            filters.jenis || 'semua-jenis',
            filters.kategori ? `kat-${filters.kategori.replace(/\s+/g, '-')}` : '',
        ].filter(Boolean);
        return `${buildStandardExportFileName('buku-kas', suffix)}.${ext}`;
    };

    const handleExportCsv = () => {
        if (isExporting) return;
        if (filteredRows.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'info');
            return;
        }
        setIsExporting(true);
        const rows = buildExportRows();
        const headers = Object.keys(rows[0]);
        const csv = [
            headers.join(','),
            ...rows.map(r => headers.map(h => {
                const v = String((r as any)[h] ?? '');
                return `"${v.replace(/"/g, '""')}"`;
            }).join(',')),
        ].join('\n');

        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = buildFileName('csv');
        link.click();
        URL.revokeObjectURL(url);
        showToast('Ekspor CSV berhasil.', 'success');
        setIsExporting(false);
    };

    const handleExportExcel = async () => {
        if (isExporting) return;
        if (filteredRows.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'info');
            return;
        }
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const rows = buildExportRows();
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'BukuKas');
            XLSX.writeFile(wb, buildFileName('xlsx'));
            showToast('Ekspor Excel berhasil.', 'success');
        } catch (e) {
            showAlert('Ekspor Gagal', 'Terjadi kendala saat membuat file Excel.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPdfImage = async () => {
        if (isExporting) return;
        if (filteredRows.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'info');
            return;
        }
        setIsExporting(true);
        try {
            const suffix = [
                filters.startDate ? `from-${filters.startDate}` : '',
                filters.endDate ? `to-${filters.endDate}` : '',
                filters.jenis || 'semua-jenis',
                filters.kategori ? `kat-${filters.kategori.replace(/\s+/g, '-')}` : '',
            ].filter(Boolean);
            await printExportFacade.downloadPdfImage({
                elementId: 'buku-kas-export-area',
                fileName: buildStandardExportFileName('buku-kas', suffix),
                paperSize: 'A4',
            });
            showToast('Ekspor PDF Gambar berhasil.', 'success');
        } catch (e) {
            showAlert('Ekspor Gagal', 'Terjadi kendala saat membuat PDF Gambar.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPdfAutoTable = async () => {
        if (isExporting) return;
        if (filteredRows.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'info');
            return;
        }
        setIsExporting(true);
        try {
            const suffix = [
                filters.startDate ? `from-${filters.startDate}` : '',
                filters.endDate ? `to-${filters.endDate}` : '',
                filters.jenis || 'semua-jenis',
                filters.kategori ? `kat-${filters.kategori.replace(/\s+/g, '-')}` : '',
            ].filter(Boolean);
            await printExportFacade.downloadPdfAutoTable({
                elementId: 'buku-kas-export-area',
                fileName: buildStandardExportFileName('buku-kas', suffix),
                paperSize: 'A4',
                target: 'report',
            });
            showToast('Ekspor PDF AutoTable berhasil.', 'success');
        } catch (e) {
            showAlert('Ekspor Gagal', 'Terjadi kendala saat membuat PDF AutoTable.');
        } finally {
            setIsExporting(false);
        }
    };

    const netCashflow = stats.totalPemasukan - stats.totalPengeluaran;

    return (
        <div className="w-full space-y-6">
            <PageHeader
                eyebrow="Keuangan & Aset"
                title="Buku Kas Umum & Multi-Pos Rekening"
                description="Catat, koreksi, dan pantau arus kas masuk, keluar, bagan akun (COA), serta mutasi antar pos kas dengan saldo berjalan dinamis."
                actions={canWrite ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setIsCoaModalOpen(true)} className="app-button-secondary px-3.5 py-2.5 text-sm font-semibold flex items-center gap-1.5">
                            <i className="bi bi-journal-bookmark-fill text-indigo-600"></i> Bagan Akun (COA)
                        </button>
                        <button onClick={() => setIsMutasiModalOpen(true)} className="app-button-secondary px-3.5 py-2.5 text-sm font-semibold flex items-center gap-1.5">
                            <i className="bi bi-arrow-left-right text-teal-600"></i> Mutasi Antar Kas
                        </button>
                        <button onClick={() => { setEditingTx(null); setIsModalOpen(true); }} className="app-button-primary px-4 py-2.5 text-sm flex items-center gap-1.5">
                            <i className="bi bi-plus-lg"></i> Tambah Transaksi
                        </button>
                    </div>
                ) : undefined}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Pemasukan (Filter)" value={formatRupiah(stats.totalPemasukan)} icon="bi-arrow-down-circle-fill" color="bg-green-100 text-green-600" textColor="text-green-600" />
                <StatCard title="Total Pengeluaran (Filter)" value={formatRupiah(stats.totalPengeluaran)} icon="bi-arrow-up-circle-fill" color="bg-red-100 text-red-600" textColor="text-red-600" />
                <StatCard
                    title={netCashflow >= 0 ? 'Surplus Periode (Filter)' : 'Defisit Periode (Filter)'}
                    value={`${netCashflow >= 0 ? '+' : ''}${formatRupiah(netCashflow)}`}
                    subtitle="Selisih Masuk - Keluar"
                    icon="bi-activity"
                    color={netCashflow >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}
                    textColor={netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-700'}
                />
                <StatCard
                    title={filters.rekening ? `Saldo ${filters.rekening}` : 'Total Saldo Kas (Aktual)'}
                    value={formatRupiah(stats.saldoAkhir)}
                    subtitle={filters.rekening ? 'Khusus Pos Terpilih' : 'Gabungan Seluruh Pos'}
                    icon="bi-wallet2"
                    color="bg-blue-100 text-blue-600"
                    textColor="text-blue-600"
                />
            </div>

            {Object.keys(rekeningBalances).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Posisi Saldo per Pos Kas / Rekening (Klik untuk Filter)</h4>
                        <div className="flex items-center gap-3">
                            {filters.rekening && (
                                <button onClick={() => setFilters(f => ({ ...f, rekening: '' }))} className="text-xs text-teal-600 font-semibold hover:underline">
                                    Tampilkan Semua Pos
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowCategoryBreakdown(prev => !prev)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <i className={`bi ${showCategoryBreakdown ? 'bi-chevron-up' : 'bi-bar-chart-steps'}`}></i>
                                {showCategoryBreakdown ? 'Sembunyikan Rekap Kategori' : 'Lihat Rekap per Kategori'}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {Object.entries(rekeningBalances).map(([rek, bal]) => (
                            <button
                                key={rek}
                                type="button"
                                onClick={() => setFilters(f => ({ ...f, rekening: f.rekening === rek ? '' : rek }))}
                                className={`text-left p-3 rounded-xl border transition-all ${filters.rekening === rek ? 'border-teal-500 bg-teal-50/60 ring-1 ring-teal-500' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-600 truncate">{rek}</span>
                                    <i className={`bi ${rek.toLowerCase().includes('bank') ? 'bi-bank text-blue-600' : 'bi-cash-coin text-teal-600'} text-sm`}></i>
                                </div>
                                <p className={`text-base font-bold mt-1 ${bal < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatRupiah(bal)}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {showCategoryBreakdown && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2.5 flex items-center gap-1.5">
                            <i className="bi bi-arrow-down-left-circle-fill"></i> Rincian Pemasukan per Kategori ({categoryBreakdown.masukList.length})
                        </h5>
                        {categoryBreakdown.masukList.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Tidak ada pemasukan pada filter ini.</p>
                        ) : (
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                {categoryBreakdown.masukList.map(item => (
                                    <div key={item.kategori} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                                        <div className="flex justify-between font-semibold text-slate-800">
                                            <span>{item.kategori} <span className="text-slate-400 font-normal">({item.count}x)</span></span>
                                            <span className="text-green-700">{formatRupiah(item.total)} ({item.pct.toFixed(1)}%)</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, item.pct)}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2.5 flex items-center gap-1.5">
                            <i className="bi bi-arrow-up-right-circle-fill"></i> Rincian Pengeluaran per Kategori ({categoryBreakdown.keluarList.length})
                        </h5>
                        {categoryBreakdown.keluarList.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Tidak ada pengeluaran pada filter ini.</p>
                        ) : (
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                {categoryBreakdown.keluarList.map(item => (
                                    <div key={item.kategori} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                                        <div className="flex justify-between font-semibold text-slate-800">
                                            <span>{item.kategori} <span className="text-slate-400 font-normal">({item.count}x)</span></span>
                                            <span className="text-red-700">{formatRupiah(item.total)} ({item.pct.toFixed(1)}%)</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, item.pct)}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div id="buku-kas-export-area">
            <SectionCard title="Transaksi Kas" description="Gunakan filter untuk menelusuri transaksi dan memantau posisi saldo berjalan." contentClassName="overflow-hidden">
                <div className="app-toolbar border-b border-app-border p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2 lg:mb-2">
                        <button type="button" onClick={() => applyDatePreset(0)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">Hari Ini</button>
                        <button type="button" onClick={() => applyDatePreset(7)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">7 Hari</button>
                        <button type="button" onClick={() => applyDatePreset(30)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">30 Hari</button>
                        <button type="button" onClick={() => applyDatePreset('month')} className="rounded-md border border-teal-200 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100">Bulan Ini</button>
                        <button type="button" onClick={resetFilters} className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100">Reset Filter</button>
                        <button type="button" disabled={isExporting} onClick={handleExportPdfImage} className="rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-60 disabled:cursor-not-allowed"><i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-file-earmark-image'} mr-1`}></i>{isExporting ? 'Memproses...' : 'PDF Gambar'}</button>
                        <button type="button" disabled={isExporting} onClick={handleExportPdfAutoTable} className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-60 disabled:cursor-not-allowed"><i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-file-earmark-ruled'} mr-1`}></i>{isExporting ? 'Memproses...' : 'PDF AutoTable'}</button>
                        <button type="button" disabled={isExporting} onClick={handleExportCsv} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"><i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-filetype-csv'} mr-1`}></i>{isExporting ? 'Memproses...' : 'CSV'}</button>
                        <button type="button" disabled={isExporting} onClick={handleExportExcel} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"><i className={`bi ${isExporting ? 'bi-arrow-repeat animate-spin' : 'bi-file-earmark-spreadsheet'} mr-1`}></i>{isExporting ? 'Memproses...' : 'Excel'}</button>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-5">
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Tanggal Mulai</label>
                            <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} className="app-input h-10 w-full rounded-md px-3 text-sm"/>
                        </div>
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Tanggal Akhir</label>
                            <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} className="app-input h-10 w-full rounded-md px-3 text-sm"/>
                        </div>
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Pos Kas / Rekening</label>
                            <select value={filters.rekening} onChange={e => setFilters(f => ({...f, rekening: e.target.value}))} className="app-select h-10 w-full px-3 text-sm">
                                <option value="">Semua Pos Kas</option>
                                {DEFAULT_REKENING_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Jenis Transaksi</label>
                            <select value={filters.jenis} onChange={e => setFilters(f => ({...f, jenis: e.target.value}))} className="app-select h-10 w-full min-w-[140px] px-3 text-sm">
                                <option value="">Semua Jenis</option>
                                <option value="Pemasukan">Pemasukan</option>
                                <option value="Pengeluaran">Pengeluaran</option>
                            </select>
                        </div>
                        <div>
                            <label className="app-label mb-1.5 block pl-1">Cari Kategori / Uraian / PJ</label>
                            <input type="text" value={filters.kategori} onChange={e => setFilters(f => ({...f, kategori: e.target.value}))} placeholder="Ketik kata kunci..." className="app-input h-10 w-full min-w-[160px] rounded-md px-3 text-sm"/>
                        </div>
                    </div>
                </div>

                <div className="app-table-shell min-h-[300px]">
                    <div className="space-y-3 p-3 md:hidden">
                        {transactions.map(t => {
                            const displaySaldo = filters.rekening ? t.runningBalanceRekening : t.runningBalanceGlobal;
                            return (
                                <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                                    <div className="mb-2 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs text-slate-500">{new Date(t.tanggal).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-800">{t.kategori}</p>
                                            <span className="inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">{t.rekening || 'Kas Tunai Bendahara'}</span>
                                        </div>
                                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${t.jenis === 'Pemasukan' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {t.jenis}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700">{t.deskripsi}</p>
                                    {t.penanggungJawab && <p className="mt-1 text-xs text-slate-500">Oleh: {t.penanggungJawab}</p>}
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                        <div className="rounded-lg bg-slate-50 p-2">
                                            <p className="text-slate-500">Nominal</p>
                                            <p className={`font-semibold ${t.jenis === 'Pemasukan' ? 'text-green-700' : 'text-red-700'}`}>{formatRupiah(t.jumlah)}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-2">
                                            <p className="text-slate-500">{filters.rekening ? 'Saldo Pos' : 'Saldo Berjalan'}</p>
                                            <p className="font-semibold text-slate-800">{formatRupiah(displaySaldo)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-2 border-t flex justify-end gap-2">
                                        <button type="button" onClick={() => setVoucherTx(t)} className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                                            <i className="bi bi-printer mr-1"></i>Bukti Kas
                                        </button>
                                        {canWrite && (
                                            <>
                                                <button type="button" onClick={() => { setEditingTx(t); setIsModalOpen(true); }} className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                                                    <i className="bi bi-pencil-square mr-1"></i>Edit
                                                </button>
                                                <button type="button" onClick={() => handleDelete(t)} className="px-2.5 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold">
                                                    <i className="bi bi-trash mr-1"></i>Hapus
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {transactions.length === 0 && !isLoading && (
                            <EmptyState icon="bi-inbox" title="Tidak ada transaksi" description="Tidak ada transaksi yang cocok dengan filter buku kas saat ini." />
                        )}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                    <table className="app-table text-left">
                        <thead className="sticky top-0 z-10 border-b border-app-border">
                            <tr>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pos Kas</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori / COA</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Pemasukan</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Pengeluaran</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                                    {filters.rekening ? 'Saldo (Pos)' : 'Saldo Berjalan'}
                                </th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map(t => {
                                const displaySaldo = filters.rekening ? t.runningBalanceRekening : t.runningBalanceGlobal;
                                return (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 font-mono">{new Date(t.tanggal).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{t.rekening || 'Kas Tunai Bendahara'}</span></td>
                                        <td className="px-4 py-3.5 whitespace-nowrap"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{t.kategori}</span></td>
                                        <td className="px-4 py-3.5 text-sm text-gray-900 max-w-xs truncate" title={t.deskripsi}>{t.deskripsi}{t.penanggungJawab && <div className="text-xs text-gray-400 mt-0.5">Oleh: {t.penanggungJawab}</div>}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-sm text-right font-medium text-green-600">{t.jenis === 'Pemasukan' ? formatRupiah(t.jumlah) : '-'}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-sm text-right font-medium text-red-600">{t.jenis === 'Pengeluaran' ? formatRupiah(t.jumlah) : '-'}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-sm text-right font-bold text-gray-800">{formatRupiah(displaySaldo)}</td>
                                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setVoucherTx(t)}
                                                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-teal-700 transition-colors"
                                                    title="Cetak Bukti Kas (BKM/BKK)"
                                                >
                                                    <i className="bi bi-printer"></i>
                                                </button>
                                                {canWrite && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditingTx(t); setIsModalOpen(true); }}
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                            title="Edit / Koreksi Transaksi"
                                                        >
                                                            <i className="bi bi-pencil-square"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(t)}
                                                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                                            title="Hapus Transaksi"
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
                             {transactions.length === 0 && !isLoading && <tr><td colSpan={8} className="p-4"><EmptyState icon="bi-inbox" title="Tidak ada transaksi" description="Tidak ada transaksi yang cocok dengan filter buku kas saat ini." /></td></tr>}
                        </tbody>
                    </table>
                    </div>
                </div>

                <div className="bg-gray-50 border-t border-gray-200 p-4">
                     <Pagination currentPage={currentPage} totalPages={Math.ceil(totalItems / itemsPerPage)} onPageChange={setCurrentPage} />
                </div>
            </SectionCard>
            </div>
            {isModalOpen && (
                <TransaksiModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingTx(null); }}
                    onSave={handleSave}
                    existingKategori={existingKategori}
                    coaList={coaList}
                    defaultPj={defaultPj}
                    editingTx={editingTx}
                />
            )}
            {isMutasiModalOpen && (
                <MutasiKasModal
                    isOpen={isMutasiModalOpen}
                    onClose={() => setIsMutasiModalOpen(false)}
                    onMutasi={handleMutasi}
                    defaultPj={defaultPj}
                    rekeningBalances={rekeningBalances}
                />
            )}
            {isCoaModalOpen && (
                <CoaManagerModal
                    isOpen={isCoaModalOpen}
                    onClose={() => setIsCoaModalOpen(false)}
                    coaList={coaList}
                    onSaveCoa={onSaveCoa}
                    onDeleteCoa={onDeleteCoa}
                    onSeedDefaultCoa={onSeedDefaultCoa}
                />
            )}
            {voucherTx && (
                <VoucherPreviewModal
                    tx={voucherTx}
                    onClose={() => setVoucherTx(null)}
                />
            )}
        </div>
    );
};

export default BukuKas;
