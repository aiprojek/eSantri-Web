import React, { useState, useMemo, useEffect } from 'react';
import { Buku, Sirkulasi as SirkulasiType } from '../../types';
import { useSantriContext } from '../../contexts/SantriContext';
import { useAppContext } from '../../AppContext';
import { formatRupiah, formatDate } from '../../utils/formatters';

interface SirkulasiProps {
    sirkulasiList: SirkulasiType[];
    bukuList: Buku[];
    onPinjam: (santriId: number, bukuId: number, duration: number) => void;
    onKembali: (id: number, denda: number, status: 'Kembali' | 'Rusak' | 'Hilang', catatan: string) => void;
    onPerpanjang?: (id: number, additionalDays: number) => void;
    initialFilter?: 'semua' | 'terlambat' | 'aktif';
    onOpenPengaturan?: () => void;
    canWrite: boolean;
}

interface ActiveLoanItem extends SirkulasiType {
    santriName: string;
    santriNis: string;
    bukuJudul: string;
    bukuKode: string;
    daysOverdue: number;
    daysRemaining: number;
    estimatedFine: number;
    isOverdue: boolean;
}

export const Sirkulasi: React.FC<SirkulasiProps> = ({ 
    sirkulasiList, 
    bukuList, 
    onPinjam, 
    onKembali, 
    onPerpanjang,
    initialFilter = 'semua',
    onOpenPengaturan,
    canWrite 
}) => {
    const { santriList } = useSantriContext();
    const { settings, showToast } = useAppContext();
    const [mode, setMode] = useState<'pinjam' | 'kembali' | 'riwayat'>('kembali');

    // Dynamic rate fine per day and default duration from settings
    const FINE_PER_DAY = settings.perpusConfig?.dendaPerHari ?? 1000;
    const defaultDuration = settings.perpusConfig?.durasiPinjamDefault ?? 7;

    // Pinjam State
    const [searchSantri, setSearchSantri] = useState('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
    const [searchBuku, setSearchBuku] = useState('');
    const [selectedBukuId, setSelectedBukuId] = useState<number | null>(null);
    const [duration, setDuration] = useState(defaultDuration);

    useEffect(() => {
        setDuration(defaultDuration);
    }, [defaultDuration]);

    // Kembali State
    const [returnSearch, setReturnSearch] = useState('');
    const [activeLoanFilter, setActiveLoanFilter] = useState<'semua' | 'terlambat' | 'segera' | 'aman'>('semua');

    // Smart Return Modal
    const [returnModal, setReturnModal] = useState<{
        isOpen: boolean;
        loan?: ActiveLoanItem;
        condition: 'Kembali' | 'Rusak' | 'Hilang';
        denda: number;
        catatan: string;
    }>({
        isOpen: false,
        condition: 'Kembali',
        denda: 0,
        catatan: ''
    });

    // Extension Modal
    const [extensionModal, setExtensionModal] = useState<{
        isOpen: boolean;
        loan?: ActiveLoanItem;
        daysToAdd: number;
    }>({
        isOpen: false,
        daysToAdd: 7
    });

    // Riwayat Filter State
    const [historySearch, setHistorySearch] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'Kembali' | 'Rusak' | 'Hilang'>('all');

    // Sync initial filter from parent
    useEffect(() => {
        if (initialFilter === 'terlambat') {
            setMode('kembali');
            setActiveLoanFilter('terlambat');
        }
    }, [initialFilter]);

    // Active santri searching
    const filteredSantriList = useMemo(() => {
        const term = searchSantri.trim().toLowerCase();
        if (!term) return [];
        return santriList
            .filter(s => s.status === 'Aktif' && (
                s.namaLengkap.toLowerCase().includes(term) || 
                (s.nis && s.nis.toLowerCase().includes(term))
            ))
            .slice(0, 10);
    }, [santriList, searchSantri]);

    // Available books searching
    const filteredBukuList = useMemo(() => {
        const term = searchBuku.trim().toLowerCase();
        if (!term) return [];
        return bukuList
            .filter(b => (
                (b.judul.toLowerCase().includes(term) || b.kodeBuku.toLowerCase().includes(term)) && 
                (Number(b.stok) || 0) > 0
            ))
            .slice(0, 10);
    }, [bukuList, searchBuku]);

    // Calculated Active Loans
    const activeLoans = useMemo<ActiveLoanItem[]>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return sirkulasiList
            .filter(s => s.status === 'Dipinjam')
            .map(s => {
                const santri = santriList.find(sa => sa.id === s.santriId);
                const buku = bukuList.find(b => b.id === s.bukuId);
                
                const dueDate = new Date(s.tanggalKembaliSeharusnya);
                dueDate.setHours(0, 0, 0, 0);

                const diffTime = today.getTime() - dueDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const daysOverdue = diffDays > 0 ? diffDays : 0;
                const daysRemaining = diffDays <= 0 ? Math.abs(diffDays) : -diffDays;
                const estimatedFine = daysOverdue * FINE_PER_DAY;

                return {
                    ...s,
                    santriName: santri?.namaLengkap || 'Nama Tidak Ditemukan',
                    santriNis: santri?.nis || '-',
                    bukuJudul: buku?.judul || 'Buku Tidak Ditemukan',
                    bukuKode: buku?.kodeBuku || '-',
                    daysOverdue,
                    daysRemaining,
                    estimatedFine,
                    isOverdue: daysOverdue > 0
                };
            })
            .sort((a, b) => {
                // Prioritize overdue items first, then earliest due date
                if (a.isOverdue && !b.isOverdue) return -1;
                if (!a.isOverdue && b.isOverdue) return 1;
                return new Date(a.tanggalKembaliSeharusnya).getTime() - new Date(b.tanggalKembaliSeharusnya).getTime();
            });
    }, [sirkulasiList, santriList, bukuList]);

    // Filtered Active Loans
    const filteredActiveLoans = useMemo(() => {
        return activeLoans.filter(item => {
            const term = returnSearch.trim().toLowerCase();
            const matchSearch = !term || 
                item.santriName.toLowerCase().includes(term) || 
                item.santriNis.toLowerCase().includes(term) || 
                item.bukuJudul.toLowerCase().includes(term) || 
                item.bukuKode.toLowerCase().includes(term);

            let matchStatus = true;
            if (activeLoanFilter === 'terlambat') {
                matchStatus = item.isOverdue;
            } else if (activeLoanFilter === 'segera') {
                matchStatus = !item.isOverdue && item.daysRemaining <= 2;
            } else if (activeLoanFilter === 'aman') {
                matchStatus = !item.isOverdue && item.daysRemaining > 2;
            }

            return matchSearch && matchStatus;
        });
    }, [activeLoans, returnSearch, activeLoanFilter]);

    // History
    const history = useMemo(() => {
        return sirkulasiList
            .filter(s => s.status !== 'Dipinjam')
            .map(s => {
                const santri = santriList.find(sa => sa.id === s.santriId);
                const buku = bukuList.find(b => b.id === s.bukuId);
                return {
                    ...s,
                    santriName: santri?.namaLengkap || 'Tidak Ditemukan',
                    santriNis: santri?.nis || '-',
                    bukuJudul: buku?.judul || 'Tidak Ditemukan',
                    bukuKode: buku?.kodeBuku || '-'
                };
            })
            .filter(item => {
                const term = historySearch.trim().toLowerCase();
                const matchSearch = !term || 
                    item.santriName.toLowerCase().includes(term) || 
                    item.santriNis.toLowerCase().includes(term) || 
                    item.bukuJudul.toLowerCase().includes(term);
                const matchStatus = historyStatusFilter === 'all' || item.status === historyStatusFilter;
                return matchSearch && matchStatus;
            })
            .sort((a, b) => new Date(b.tanggalDikembalikan || '').getTime() - new Date(a.tanggalDikembalikan || '').getTime());
    }, [sirkulasiList, santriList, bukuList, historySearch, historyStatusFilter]);

    // Action: Submit Pinjam
    const handleProsesPinjam = () => {
        if (!selectedSantriId || !selectedBukuId) {
            showToast('Pilih santri dan buku terlebih dahulu.', 'error');
            return;
        }
        onPinjam(selectedSantriId, selectedBukuId, duration);
        setSelectedBukuId(null);
        setSearchBuku('');
        // Keep santri selected so librarian can record multiple books in one visit
    };

    // Open Smart Return Modal
    const openReturnModal = (loan: ActiveLoanItem) => {
        setReturnModal({
            isOpen: true,
            loan,
            condition: 'Kembali',
            denda: loan.estimatedFine,
            catatan: loan.daysOverdue > 0 ? `Terlambat ${loan.daysOverdue} hari.` : ''
        });
    };

    // Confirm Return in Modal
    const handleExecuteReturn = () => {
        if (!returnModal.loan) return;
        onKembali(
            returnModal.loan.id, 
            returnModal.denda, 
            returnModal.condition, 
            returnModal.catatan
        );
        setReturnModal({ isOpen: false, condition: 'Kembali', denda: 0, catatan: '' });
    };

    // Open Extension Modal
    const openExtensionModal = (loan: ActiveLoanItem) => {
        setExtensionModal({
            isOpen: true,
            loan,
            daysToAdd: 7
        });
    };

    // Execute Extension
    const handleExecuteExtension = () => {
        if (!extensionModal.loan || !onPerpanjang) return;
        onPerpanjang(extensionModal.loan.id, extensionModal.daysToAdd);
        setExtensionModal({ isOpen: false, daysToAdd: 7 });
    };

    // CSV Export for Circulation
    const exportActiveLoansCSV = () => {
        if (filteredActiveLoans.length === 0) {
            showToast('Tidak ada data peminjaman aktif.', 'info');
            return;
        }

        const headers = ['Kode Buku', 'Judul Buku', 'NIS Santri', 'Nama Santri', 'Tgl Pinjam', 'Jatuh Tempo', 'Status Keterlambatan', 'Hari Telat', 'Estimasi Denda'];
        const rows = filteredActiveLoans.map(l => [
            `"${l.bukuKode}"`,
            `"${l.bukuJudul.replace(/"/g, '""')}"`,
            `"${l.santriNis}"`,
            `"${l.santriName.replace(/"/g, '""')}"`,
            l.tanggalPinjam,
            l.tanggalKembaliSeharusnya,
            l.isOverdue ? 'Terlambat' : 'Tepat Waktu',
            l.daysOverdue,
            l.estimatedFine
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Peminjaman_Aktif_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Berhasil mengunduh rekap peminjaman aktif.', 'success');
    };

    const exportHistoryCSV = () => {
        if (history.length === 0) {
            showToast('Tidak ada data riwayat transaksi.', 'info');
            return;
        }

        const headers = ['Tgl Pinjam', 'Tgl Kembali', 'NIS', 'Nama Santri', 'Kode Buku', 'Judul Buku', 'Status Akhir', 'Denda', 'Catatan'];
        const rows = history.map(h => [
            h.tanggalPinjam,
            h.tanggalDikembalikan || '-',
            `"${h.santriNis}"`,
            `"${h.santriName.replace(/"/g, '""')}"`,
            `"${h.bukuKode}"`,
            `"${h.bukuJudul.replace(/"/g, '""')}"`,
            h.status,
            h.denda || 0,
            `"${(h.catatan || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Riwayat_Sirkulasi_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Berhasil mengunduh rekap riwayat peminjaman.', 'success');
    };

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-fade-in">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-3 space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">Menu Sirkulasi</h3>
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={() => setMode('kembali')} 
                            className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                                mode === 'kembali' 
                                    ? 'bg-blue-50 border border-blue-200 text-blue-900 shadow-sm font-bold' 
                                    : 'border border-transparent text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${mode === 'kembali' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    <i className="bi bi-box-arrow-in-down-left"></i>
                                </div>
                                <div>
                                    <div className="text-sm">Pengembalian</div>
                                    <div className="text-[11px] font-normal text-slate-500">Buku kembali & denda</div>
                                </div>
                            </div>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                                {activeLoans.length}
                            </span>
                        </button>

                        <button 
                            onClick={() => setMode('pinjam')} 
                            className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                                mode === 'pinjam' 
                                    ? 'bg-teal-50 border border-teal-200 text-teal-900 shadow-sm font-bold' 
                                    : 'border border-transparent text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${mode === 'pinjam' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    <i className="bi bi-box-arrow-up-right"></i>
                                </div>
                                <div>
                                    <div className="text-sm">Peminjaman Baru</div>
                                    <div className="text-[11px] font-normal text-slate-500">Scan & catat pinjaman</div>
                                </div>
                            </div>
                            <i className="bi bi-chevron-right text-slate-400 text-xs"></i>
                        </button>

                        <button 
                            onClick={() => setMode('riwayat')} 
                            className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all ${
                                mode === 'riwayat' 
                                    ? 'bg-slate-100 border border-slate-300 text-slate-900 shadow-sm font-bold' 
                                    : 'border border-transparent text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${mode === 'riwayat' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    <i className="bi bi-clock-history"></i>
                                </div>
                                <div>
                                    <div className="text-sm">Riwayat Transaksi</div>
                                    <div className="text-[11px] font-normal text-slate-500">Log semua transaksi</div>
                                </div>
                            </div>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {history.length}
                            </span>
                        </button>
                    </div>

                    {/* Rules reminder box */}
                    <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-xs text-teal-900">
                        <div className="font-bold flex items-center justify-between gap-1.5 mb-1.5 text-teal-800">
                            <span className="flex items-center gap-1.5">
                                <i className="bi bi-info-circle-fill text-teal-600"></i> Ketentuan Perpustakaan
                            </span>
                            {onOpenPengaturan && (
                                <button
                                    type="button"
                                    onClick={onOpenPengaturan}
                                    title="Ubah tarif denda & aturan peminjaman"
                                    className="text-[11px] font-bold text-teal-700 hover:text-teal-950 underline flex items-center gap-0.5"
                                >
                                    <span>Ubah</span>
                                    <i className="bi bi-gear-fill text-[10px]"></i>
                                </button>
                            )}
                        </div>
                        <ul className="space-y-1 text-teal-700 list-disc list-inside">
                            <li>Denda keterlambatan: <strong>{formatRupiah(FINE_PER_DAY)} / hari</strong></li>
                            <li>Durasi standar: <strong>{defaultDuration} hari</strong></li>
                            <li>Batas pinjam: <strong>{settings.perpusConfig?.maksPinjamBuku ?? 3} buku/santri</strong></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-9">
                {/* 1. TAB PENGEMBALIAN BUKU (ACTIVE LOANS) */}
                {mode === 'kembali' && (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        value={returnSearch} 
                                        onChange={e => setReturnSearch(e.target.value)} 
                                        placeholder="Cari nama santri, NIS, kode buku, atau judul buku..." 
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none" 
                                    />
                                    <i className="bi bi-search absolute left-3.5 top-3 text-slate-400"></i>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={exportActiveLoansCSV}
                                        title="Export daftar peminjaman aktif ke CSV"
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                                    >
                                        <i className="bi bi-file-earmark-spreadsheet text-emerald-600"></i>
                                        <span>Export CSV</span>
                                    </button>
                                </div>
                            </div>

                            {/* Filter Chips */}
                            <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                                <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
                                <button
                                    onClick={() => setActiveLoanFilter('semua')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                        activeLoanFilter === 'semua'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Semua Aktif ({activeLoans.length})
                                </button>
                                <button
                                    onClick={() => setActiveLoanFilter('terlambat')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                        activeLoanFilter === 'terlambat'
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    }`}
                                >
                                    Terlambat ({activeLoans.filter(l => l.isOverdue).length})
                                </button>
                                <button
                                    onClick={() => setActiveLoanFilter('segera')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                        activeLoanFilter === 'segera'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    }`}
                                >
                                    Segera Tempo (≤ 2 hari) ({activeLoans.filter(l => !l.isOverdue && l.daysRemaining <= 2).length})
                                </button>
                                <button
                                    onClick={() => setActiveLoanFilter('aman')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                        activeLoanFilter === 'aman'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                >
                                    Masih Aman ({activeLoans.filter(l => !l.isOverdue && l.daysRemaining > 2).length})
                                </button>
                            </div>
                        </div>

                        {/* Loans List */}
                        <div className="space-y-3">
                            {filteredActiveLoans.map(loan => {
                                return (
                                    <div 
                                        key={loan.id} 
                                        className={`rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                                            loan.isOverdue 
                                                ? 'border-rose-200 bg-gradient-to-r from-white via-white to-rose-50/40' 
                                                : loan.daysRemaining <= 2
                                                ? 'border-amber-200 bg-gradient-to-r from-white via-white to-amber-50/40'
                                                : 'border-slate-200/80'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            {/* Details */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                                        {loan.bukuKode}
                                                    </span>
                                                    <h4 className="font-bold text-slate-900 text-base leading-snug">
                                                        {loan.bukuJudul}
                                                    </h4>
                                                </div>

                                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                                                        <i className="bi bi-person-circle text-teal-600"></i>
                                                        <span>{loan.santriName}</span>
                                                        <span className="font-normal text-slate-400">({loan.santriNis})</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400">Pinjam:</span> {formatDate(loan.tanggalPinjam)}
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400">Jatuh Tempo:</span>{' '}
                                                        <strong className={loan.isOverdue ? 'text-rose-600' : 'text-slate-700'}>
                                                            {formatDate(loan.tanggalKembaliSeharusnya)}
                                                        </strong>
                                                    </div>
                                                </div>

                                                {/* Status Badges */}
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    {loan.isOverdue ? (
                                                        <>
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 animate-pulse">
                                                                <i className="bi bi-exclamation-circle-fill"></i>
                                                                Terlambat {loan.daysOverdue} hari
                                                            </span>
                                                            <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                                                                Estimasi Denda: {formatRupiah(loan.estimatedFine)}
                                                            </span>
                                                        </>
                                                    ) : loan.daysRemaining === 0 ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                                            <i className="bi bi-clock-history"></i>
                                                            Jatuh Tempo Hari Ini
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                                            Sisa waktu: {loan.daysRemaining} hari lagi
                                                        </span>
                                                    )}
                                                    {loan.catatan && (
                                                        <span className="text-xs text-slate-400 italic">
                                                            "{loan.catatan}"
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            {canWrite && (
                                                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                                                    <button 
                                                        onClick={() => openReturnModal(loan)} 
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                                                    >
                                                        <i className="bi bi-box-arrow-in-down-left"></i>
                                                        <span>Proses Kembali</span>
                                                    </button>

                                                    {onPerpanjang && (
                                                        <button 
                                                            onClick={() => openExtensionModal(loan)} 
                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                                        >
                                                            <i className="bi bi-arrow-repeat text-teal-600"></i>
                                                            <span>Perpanjang</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredActiveLoans.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
                                    <i className="bi bi-check2-circle text-4xl text-teal-500 mb-2"></i>
                                    <div className="text-base font-bold text-slate-700">Tidak ada peminjaman buku aktif</div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Semua buku telah dikembalikan atau belum ada peminjaman baru yang dicatat.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. TAB PEMINJAMAN BARU (NEW LOAN FORM) */}
                {mode === 'pinjam' && (
                    <div className="rounded-2xl border border-teal-200/80 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Catat Peminjaman Buku Baru</h3>
                                <p className="text-xs text-slate-500">Pilih identitas santri peminjam, buku koleksi yang dipinjam, serta tentukan durasi.</p>
                            </div>
                            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                                Langkah Mudah
                            </span>
                        </div>

                        {/* Step 1: Santri Selection */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                1. Cari Santri Peminjam (Nama Lengkap / NIS) <span className="text-rose-500">*</span>
                            </label>
                            
                            {selectedSantriId ? (
                                <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/60 p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold">
                                            <i className="bi bi-person text-lg"></i>
                                        </div>
                                        <div>
                                            <div className="font-bold text-teal-950">
                                                {santriList.find(s => s.id === selectedSantriId)?.namaLengkap}
                                            </div>
                                            <div className="text-xs text-teal-700">
                                                NIS: {santriList.find(s => s.id === selectedSantriId)?.nis}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedSantriId(null); setSearchSantri(''); }} 
                                        className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                    >
                                        Ganti Santri
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={searchSantri} 
                                        onChange={e => setSearchSantri(e.target.value)} 
                                        placeholder="Ketik nama santri atau scan barcode kartu santri..." 
                                        autoFocus
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none" 
                                    />
                                    <i className="bi bi-search absolute left-3.5 top-3 text-slate-400"></i>

                                    {searchSantri && (
                                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                            {filteredSantriList.map(s => (
                                                <div 
                                                    key={s.id} 
                                                    onClick={() => { 
                                                        setSelectedSantriId(s.id); 
                                                        setSearchSantri(s.namaLengkap); 
                                                    }} 
                                                    className="flex items-center justify-between border-b border-slate-50 p-3 hover:bg-teal-50 cursor-pointer transition-colors"
                                                >
                                                    <div>
                                                        <span className="font-bold text-slate-800 text-sm">{s.namaLengkap}</span>
                                                        <span className="text-xs text-slate-400 ml-2 font-mono">({s.nis})</span>
                                                    </div>
                                                    <span className="rounded bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">Pilih</span>
                                                </div>
                                            ))}
                                            {filteredSantriList.length === 0 && (
                                                <div className="p-4 text-center text-xs text-slate-400">
                                                    Santri tidak ditemukan dengan kata kunci "{searchSantri}".
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Step 2: Book Selection */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                2. Cari Buku Koleksi (Judul / Barcode Buku) <span className="text-rose-500">*</span>
                            </label>

                            {selectedBukuId ? (
                                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
                                            <i className="bi bi-book text-lg"></i>
                                        </div>
                                        <div>
                                            <div className="font-bold text-blue-950">
                                                {bukuList.find(b => b.id === selectedBukuId)?.judul}
                                            </div>
                                            <div className="text-xs text-blue-700">
                                                Kode: {bukuList.find(b => b.id === selectedBukuId)?.kodeBuku} • Rak: {bukuList.find(b => b.id === selectedBukuId)?.lokasiRak || '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedBukuId(null); setSearchBuku(''); }} 
                                        className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                    >
                                        Ganti Buku
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={searchBuku} 
                                        onChange={e => setSearchBuku(e.target.value)} 
                                        placeholder="Ketik judul buku atau scan barcode buku..." 
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none" 
                                    />
                                    <i className="bi bi-upc-scan absolute left-3.5 top-3 text-slate-400"></i>

                                    {searchBuku && (
                                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                            {filteredBukuList.map(b => (
                                                <div 
                                                    key={b.id} 
                                                    onClick={() => { 
                                                        setSelectedBukuId(b.id); 
                                                        setSearchBuku(b.judul); 
                                                    }} 
                                                    className="flex items-center justify-between border-b border-slate-50 p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{b.judul}</div>
                                                        <div className="text-xs text-slate-400 font-mono">
                                                            {bukuList.find(item => item.id === b.id)?.kodeBuku} • Stok: {b.stok}
                                                        </div>
                                                    </div>
                                                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">Pilih</span>
                                                </div>
                                            ))}
                                            {filteredBukuList.length === 0 && (
                                                <div className="p-4 text-center text-xs text-slate-400">
                                                    Tidak ada buku dengan stok tersedia untuk "{searchBuku}".
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Step 3: Duration & Submission */}
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-center">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Durasi Peminjaman</label>
                                    <select 
                                        value={duration} 
                                        onChange={e => setDuration(parseInt(e.target.value))} 
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value={3}>3 Hari (Koleksi Singkat)</option>
                                        <option value={7}>7 Hari (1 Minggu - Standar)</option>
                                        <option value={14}>14 Hari (2 Minggu)</option>
                                        <option value={30}>30 Hari (1 Bulan - Kitab/Pelajaran)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Jatuh Tempo</label>
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-teal-800">
                                        {formatDate(new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                                <button 
                                    onClick={handleProsesPinjam} 
                                    disabled={!selectedSantriId || !selectedBukuId || !canWrite}
                                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <i className="bi bi-check2-circle text-base"></i>
                                    <span>Simpan Transaksi Peminjaman</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. TAB RIWAYAT TRANSAKSI */}
                {mode === 'riwayat' && (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        value={historySearch} 
                                        onChange={e => setHistorySearch(e.target.value)} 
                                        placeholder="Cari santri, NIS, atau judul buku di riwayat..." 
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none" 
                                    />
                                    <i className="bi bi-search absolute left-3.5 top-2.5 text-slate-400"></i>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={historyStatusFilter}
                                        onChange={e => setHistoryStatusFilter(e.target.value as any)}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                                    >
                                        <option value="all">Semua Kondisi</option>
                                        <option value="Kembali">Kembali (Baik)</option>
                                        <option value="Rusak">Kembali (Rusak)</option>
                                        <option value="Hilang">Hilang</option>
                                    </select>

                                    <button
                                        onClick={exportHistoryCSV}
                                        title="Export riwayat sirkulasi ke CSV"
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        <i className="bi bi-file-earmark-spreadsheet text-emerald-600"></i>
                                        <span>Export</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* History Table */}
                        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Tgl Kembali</th>
                                        <th className="px-4 py-3">Santri Peminjam</th>
                                        <th className="px-4 py-3">Buku Koleksi</th>
                                        <th className="px-4 py-3 text-center">Kondisi / Status</th>
                                        <th className="px-4 py-3 text-right">Denda</th>
                                        <th className="px-4 py-3">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.map(h => (
                                        <tr key={h.id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                                                {formatDate(h.tanggalDikembalikan) || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-800">{h.santriName}</div>
                                                <div className="text-xs text-slate-400">{h.santriNis}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-800">{h.bukuJudul}</div>
                                                <div className="text-xs font-mono text-slate-400">{h.bukuKode}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {h.status === 'Kembali' && (
                                                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                                                        Kembali Baik
                                                    </span>
                                                )}
                                                {h.status === 'Rusak' && (
                                                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                                                        Rusak
                                                    </span>
                                                )}
                                                {h.status === 'Hilang' && (
                                                    <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
                                                        Hilang
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-xs">
                                                {(h.denda || 0) > 0 ? (
                                                    <span className="text-rose-600">{formatRupiah(h.denda || 0)}</span>
                                                ) : (
                                                    <span className="text-slate-400">Rp 0</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 italic max-w-xs truncate">
                                                {h.catatan || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                                                Belum ada riwayat transaksi pengembalian.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* History Mobile View */}
                        <div className="space-y-3 md:hidden">
                            {history.map(h => (
                                <div key={h.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="text-xs text-slate-400">Kembali: {formatDate(h.tanggalDikembalikan)}</div>
                                            <div className="font-bold text-slate-900 mt-0.5">{h.santriName}</div>
                                            <div className="text-xs text-slate-600 mt-1">{h.bukuJudul}</div>
                                        </div>
                                        <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                                            h.status === 'Kembali' ? 'bg-emerald-100 text-emerald-800' :
                                            h.status === 'Rusak' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                        }`}>
                                            {h.status}
                                        </span>
                                    </div>
                                    {(h.denda || 0) > 0 && (
                                        <div className="mt-2 text-xs font-bold text-rose-600">
                                            Denda: {formatRupiah(h.denda || 0)}
                                        </div>
                                    )}
                                    {h.catatan && (
                                        <div className="mt-1 text-xs text-slate-500 italic">
                                            Catatan: {h.catatan}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* SMART RETURN MODAL */}
            {returnModal.isOpen && returnModal.loan && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <i className="bi bi-box-arrow-in-down-left text-lg"></i>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Proses Pengembalian Buku</h3>
                                    <p className="text-xs text-slate-500">Periksa kondisi buku fisik dan penyesuaian denda</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setReturnModal(prev => ({ ...prev, isOpen: false }))}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Summary Box */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Judul Buku:</span>
                                    <span className="font-bold text-slate-800 text-right">{returnModal.loan.bukuJudul}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Kode Buku:</span>
                                    <span className="font-mono font-semibold text-slate-700">{returnModal.loan.bukuKode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Nama Peminjam:</span>
                                    <span className="font-bold text-slate-800">{returnModal.loan.santriName} ({returnModal.loan.santriNis})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Tanggal Pinjam:</span>
                                    <span className="text-slate-700">{formatDate(returnModal.loan.tanggalPinjam)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Jatuh Tempo:</span>
                                    <span className={`font-semibold ${returnModal.loan.isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                        {formatDate(returnModal.loan.tanggalKembaliSeharusnya)}
                                    </span>
                                </div>
                                {returnModal.loan.isOverdue && (
                                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-rose-700">
                                        <span>Keterlambatan:</span>
                                        <span>{returnModal.loan.daysOverdue} hari</span>
                                    </div>
                                )}
                            </div>

                            {/* Kondisi Buku Saat Kembali */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Kondisi Fisik Buku Saat Dikembalikan</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReturnModal(prev => ({
                                                ...prev,
                                                condition: 'Kembali',
                                                denda: returnModal.loan?.estimatedFine || 0
                                            }));
                                        }}
                                        className={`rounded-xl border p-2.5 text-center transition-all ${
                                            returnModal.condition === 'Kembali'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-500/20'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <i className="bi bi-check-circle-fill text-emerald-600 block text-lg mb-1"></i>
                                        <div className="text-xs">Kembali Baik</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReturnModal(prev => ({
                                                ...prev,
                                                condition: 'Rusak',
                                                denda: (returnModal.loan?.estimatedFine || 0) + 15000,
                                                catatan: prev.catatan || 'Kondisi buku rusak/robek.'
                                            }));
                                        }}
                                        className={`rounded-xl border p-2.5 text-center transition-all ${
                                            returnModal.condition === 'Rusak'
                                                ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold ring-2 ring-amber-500/20'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <i className="bi bi-exclamation-triangle-fill text-amber-600 block text-lg mb-1"></i>
                                        <div className="text-xs">Buku Rusak</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReturnModal(prev => ({
                                                ...prev,
                                                condition: 'Hilang',
                                                denda: (returnModal.loan?.estimatedFine || 0) + 50000,
                                                catatan: prev.catatan || 'Buku hilang oleh santri.'
                                            }));
                                        }}
                                        className={`rounded-xl border p-2.5 text-center transition-all ${
                                            returnModal.condition === 'Hilang'
                                                ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-500/20'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <i className="bi bi-x-circle-fill text-rose-600 block text-lg mb-1"></i>
                                        <div className="text-xs">Buku Hilang</div>
                                    </button>
                                </div>
                            </div>

                            {/* Denda Pengembalian */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Denda / Biaya Ganti Rugi <span className="font-normal text-slate-500">({formatRupiah(FINE_PER_DAY)}/hari)</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setReturnModal(prev => ({ ...prev, denda: 0 }))}
                                            className="text-[11px] font-semibold text-emerald-600 hover:underline"
                                        >
                                            Bebaskan Denda (Rp 0)
                                        </button>
                                        <span className="text-slate-300">•</span>
                                        <button
                                            type="button"
                                            onClick={() => setReturnModal(prev => ({ ...prev, denda: returnModal.loan?.estimatedFine || 0 }))}
                                            className="text-[11px] font-semibold text-blue-600 hover:underline"
                                        >
                                            Reset Standar
                                        </button>
                                    </div>
                                </div>
                                <input 
                                    type="number" 
                                    min={0}
                                    step={500}
                                    value={returnModal.denda} 
                                    onChange={e => setReturnModal(prev => ({ ...prev, denda: Math.max(0, parseInt(e.target.value) || 0) }))} 
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none" 
                                />
                                {returnModal.denda > 0 && (
                                    <p className="mt-1 text-[11px] text-rose-600 font-semibold">
                                        Denda yang harus dibayar: {formatRupiah(returnModal.denda)}
                                    </p>
                                )}
                            </div>

                            {/* Catatan */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Pengembalian (Opsional)</label>
                                <textarea
                                    rows={2}
                                    value={returnModal.catatan}
                                    onChange={e => setReturnModal(prev => ({ ...prev, catatan: e.target.value }))}
                                    placeholder="Contoh: Denda sudah dibayar lunas / Halaman belakang sedikit lecek..."
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <button 
                                onClick={() => setReturnModal(prev => ({ ...prev, isOpen: false }))} 
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleExecuteReturn} 
                                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                            >
                                Konfirmasi Pengembalian
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXTENSION MODAL */}
            {extensionModal.isOpen && extensionModal.loan && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                            <h3 className="font-bold text-slate-800">Perpanjang Masa Pinjam</h3>
                            <button 
                                onClick={() => setExtensionModal(prev => ({ ...prev, isOpen: false }))}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl space-y-1">
                                <div>Buku: <strong>{extensionModal.loan.bukuJudul}</strong></div>
                                <div>Santri: <strong>{extensionModal.loan.santriName}</strong></div>
                                <div>Jatuh Tempo Saat Ini: <strong>{formatDate(extensionModal.loan.tanggalKembaliSeharusnya)}</strong></div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tambah Hari Peminjaman</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[3, 7, 14].map(days => (
                                        <button
                                            key={days}
                                            type="button"
                                            onClick={() => setExtensionModal(prev => ({ ...prev, daysToAdd: days }))}
                                            className={`rounded-xl border py-2.5 text-center text-xs font-bold transition-all ${
                                                extensionModal.daysToAdd === days
                                                    ? 'border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20'
                                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            +{days} Hari
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <button 
                                onClick={() => setExtensionModal(prev => ({ ...prev, isOpen: false }))} 
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleExecuteExtension} 
                                className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-700"
                            >
                                Simpan Perpanjangan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
