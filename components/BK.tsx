import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { BkSession, Santri } from '../types';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { MobileFilterDrawer } from './common/MobileFilterDrawer';
import { BkModal } from './bk/BkModal';
import { BkFollowUpModal } from './bk/BkFollowUpModal';
import { BkSuratModal } from './bk/BkSuratModal';
import { BkAnalyticsCard } from './bk/BkAnalyticsCard';
import { loadXLSX } from '../utils/lazyClientLibs';
import { logActivity } from '../services/logService';

const BK: React.FC = () => {
    const { currentUser, settings, showToast, showConfirmation } = useAppContext();
    const { santriList } = useSantriContext();

    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.bk === 'write';

    // Live query for active (non-deleted) sessions
    const sessions = useLiveQuery(
        () => db.bkSessions.filter((s) => !s.deleted).reverse().sortBy('tanggal'),
        []
    ) || [];

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterKategori, setFilterKategori] = useState('');
    const [filterPrivasi, setFilterPrivasi] = useState('');
    const [filterJadwal, setFilterJadwal] = useState<'semua' | 'ada_jadwal'>('semua');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    const activeFiltersCount =
        (filterStatus ? 1 : 0) +
        (filterKategori ? 1 : 0) +
        (filterPrivasi ? 1 : 0) +
        (filterJadwal !== 'semua' ? 1 : 0);

    // UI state
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [unmaskedRows, setUnmaskedRows] = useState<Record<number, boolean>>({});

    // Modals state
    const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<BkSession | null>(null);

    const [followUpSession, setFollowUpSession] = useState<BkSession | null>(null);
    const [followUpSantri, setFollowUpSantri] = useState<Santri | null>(null);

    const [suratSession, setSuratSession] = useState<BkSession | null>(null);
    const [suratSantri, setSuratSantri] = useState<Santri | null>(null);

    const today = new Date().toISOString().split('T')[0];

    // Status badge style helper
    const getStatusBadgeClass = (status: BkSession['status']) => {
        switch (status) {
            case 'Selesai': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Pemantauan': return 'bg-sky-100 text-sky-800 border-sky-200';
            case 'Proses': return 'bg-amber-100 text-amber-800 border-amber-200';
            default: return 'bg-rose-100 text-rose-800 border-rose-200';
        }
    };

    // Category badge color helper
    const getCategoryBadgeClass = (kategori: string) => {
        switch (kategori) {
            case 'Homesick': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'Kedisiplinan': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'Perundungan': return 'bg-red-50 text-red-700 border-red-200';
            case 'Ibadah': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Belajar': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Keluarga': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Sosial': return 'bg-teal-50 text-teal-700 border-teal-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // Filter logic
    const filteredSessions = useMemo(() => {
        return sessions.filter((s) => {
            const santri = santriList.find((sa) => sa.id === s.santriId);
            const nameMatch =
                !searchTerm ||
                (santri?.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    santri?.nis.includes(searchTerm) ||
                    s.keluhan.toLowerCase().includes(searchTerm.toLowerCase()));

            const statusMatch = !filterStatus || s.status === filterStatus;
            const kategoriMatch = !filterKategori || s.kategori === filterKategori;
            const privasiMatch = !filterPrivasi || s.privasi === filterPrivasi;
            const jadwalMatch = filterJadwal === 'semua' || (filterJadwal === 'ada_jadwal' && Boolean(s.tanggalBerikutnya));

            return nameMatch && statusMatch && kategoriMatch && privasiMatch && jadwalMatch;
        });
    }, [sessions, santriList, searchTerm, filterStatus, filterKategori, filterPrivasi, filterJadwal]);

    // Statistics
    const stats = useMemo(() => {
        const total = sessions.length;
        const active = sessions.filter((s) => s.status === 'Baru' || s.status === 'Proses').length;
        const monitoring = sessions.filter((s) => s.status === 'Pemantauan').length;
        const resolved = sessions.filter((s) => s.status === 'Selesai').length;
        const upcomingDue = sessions.filter(
            (s) => s.tanggalBerikutnya && s.status !== 'Selesai' && s.tanggalBerikutnya <= today
        ).length;
        return { total, active, monitoring, resolved, upcomingDue };
    }, [sessions, today]);

    // CRUD Handlers
    const handleSave = async (data: Omit<BkSession, 'id'>) => {
        if (!canWrite) return;
        const now = Date.now();
        const newId = await db.bkSessions.add({ ...data, lastModified: now } as BkSession);
        await logActivity('INSERT', 'bkSessions', newId, null, { ...data, id: newId, lastModified: now }, currentUser?.username || 'Konselor');
        setIsCreateEditModalOpen(false);
        showToast('Sesi BK berhasil dicatat.', 'success');
    };

    const handleUpdate = async (data: BkSession) => {
        if (!canWrite) return;
        const oldData = await db.bkSessions.get(data.id);
        const updatedData = { ...data, lastModified: Date.now() };
        await db.bkSessions.put(updatedData);
        await logActivity('UPDATE', 'bkSessions', data.id, oldData, updatedData, currentUser?.username || 'Konselor');
        setIsCreateEditModalOpen(false);
        showToast('Catatan BK diperbarui.', 'success');
    };

    const handleDelete = (id: number) => {
        if (!canWrite) return;
        showConfirmation(
            'Hapus Catatan Konseling?',
            'Data sesi konseling ini bersifat rahasia dan akan dipindahkan ke arsip hapus.',
            async () => {
                const item = await db.bkSessions.get(id);
                if (item) {
                    const deletedItem = { ...item, deleted: true, lastModified: Date.now() };
                    await db.bkSessions.put(deletedItem);
                    await logActivity('DELETE', 'bkSessions', id, item, null, currentUser?.username || 'Konselor');
                    showToast('Catatan BK berhasil dihapus.', 'success');
                }
            },
            { confirmColor: 'red' }
        );
    };

    const toggleMask = (sessionId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setUnmaskedRows((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
    };

    // Export to Excel
    const handleExportExcel = async () => {
        try {
            const XLSX = await loadXLSX();
            const exportRows = filteredSessions.map((s, idx) => {
                const santri = santriList.find((sa) => sa.id === s.santriId);
                const kamarName = santri?.kamarId ? (settings.kamar?.find((k) => k.id === santri.kamarId)?.nama || `Kamar #${santri.kamarId}`) : '-';
                return {
                    'No': idx + 1,
                    'Tanggal Konseling': s.tanggal,
                    'NIS': santri?.nis || '',
                    'Nama Santri': santri?.namaLengkap || 'Tidak Ditemukan',
                    'Kamar / Asrama': kamarName,
                    'Kategori': s.kategori,
                    'Status': s.status,
                    'Tingkat Privasi': s.privasi,
                    'Konselor': s.konselor,
                    'Pihak Terlibat': (s.pihakTerlibat || []).join(', '),
                    'Keluhan / Masalah': s.keluhan,
                    'Arahan / Solusi': s.penanganan,
                    'Komitmen Santri': s.komitmenSantri || '-',
                    'Hasil Evaluasi': s.hasil || '-',
                    'Jadwal Kontrol Berikutnya': s.tanggalBerikutnya || '-',
                    'Jumlah Sesi Lanjutan': s.followUpLogs?.length || 0,
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Laporan_BK');
            XLSX.writeFile(
                wb,
                `Rekap_Bimbingan_Konseling_${new Date().toISOString().split('T')[0]}.xlsx`
            );
            showToast('Berhasil mengunduh rekap konseling format Excel.', 'success');
        } catch (err) {
            console.error('Failed to export Excel', err);
            showToast('Gagal mengekspor data Excel.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Kesiswaan & Pengasuhan"
                title="Bimbingan & Konseling"
                description="Pusat pendampingan mental, pembinaan akhlak, konseling, dan pemantauan santri terpadu."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                        >
                            <i className="bi bi-file-earmark-excel text-emerald-600 text-sm"></i>
                            Ekspor Excel
                        </button>
                        {canWrite && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingSession(null);
                                    setIsCreateEditModalOpen(true);
                                }}
                                className="app-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="bi bi-plus-lg"></i>
                                Catat Sesi Baru
                            </button>
                        )}
                    </div>
                }
            />

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-2xl shadow-xs border border-indigo-100 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Total Sesi</p>
                        <p className="text-2xl font-black text-gray-800 mt-0.5">{stats.total}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                        <i className="bi bi-journal-medical"></i>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-xs border border-amber-100 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Kasus Aktif</p>
                        <p className="text-2xl font-black text-gray-800 mt-0.5">{stats.active}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                        <i className="bi bi-hourglass-split"></i>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-xs border border-sky-100 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Pemantauan</p>
                        <p className="text-2xl font-black text-gray-800 mt-0.5">{stats.monitoring}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl">
                        <i className="bi bi-eye"></i>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-xs border border-emerald-100 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Tuntas</p>
                        <p className="text-2xl font-black text-gray-800 mt-0.5">{stats.resolved}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                        <i className="bi bi-check2-circle"></i>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-xs border border-rose-100 flex items-center justify-between col-span-2 sm:col-span-1">
                    <div>
                        <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Kontrol Segera</p>
                        <p className="text-2xl font-black text-gray-800 mt-0.5">{stats.upcomingDue}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
                        <i className="bi bi-alarm"></i>
                    </div>
                </div>
            </div>

            {/* Analytics & Upcoming Follow-ups Section */}
            <BkAnalyticsCard
                sessions={sessions}
                santriList={santriList}
                onOpenFollowUp={(session, santri) => {
                    setFollowUpSession(session);
                    setFollowUpSantri(santri);
                }}
                onOpenSurat={(session, santri) => {
                    setSuratSession(session);
                    setSuratSantri(santri);
                }}
            />

            {/* Sesi Table Card */}
            <SectionCard
                title="Daftar Sesi Konseling & Pembinaan"
                description="Telusuri, pantau perkembangan berkala, dan cetak administrasi penanganan santri."
                contentClassName="overflow-hidden"
            >
                {/* Mobile Search & Filter Drawer Trigger */}
                <div className="p-3 bg-gray-50/70 border-b border-app-border md:hidden">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari santri, NIS, masalah..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="app-input w-full pl-8 pr-3 py-2 text-xs bg-white"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsFilterDrawerOpen(true)}
                            className={`app-button-secondary h-9 shrink-0 px-3 py-1.5 text-xs flex items-center gap-1.5 ${
                                activeFiltersCount > 0 ? 'border-indigo-400 bg-indigo-50 text-indigo-800 font-bold' : ''
                            }`}
                        >
                            <i className="bi bi-funnel-fill"></i>
                            <span>Filter</span>
                            {activeFiltersCount > 0 && (
                                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Filter Drawer */}
                <MobileFilterDrawer
                    isOpen={isFilterDrawerOpen}
                    onClose={() => setIsFilterDrawerOpen(false)}
                    title="Filter Sesi BK"
                    onReset={() => {
                        setSearchTerm('');
                        setFilterStatus('');
                        setFilterKategori('');
                        setFilterPrivasi('');
                        setFilterJadwal('semua');
                    }}
                >
                    <div className="space-y-4 text-xs">
                        <div>
                            <label className="app-label mb-1.5 block text-xs font-bold text-slate-700">Status Penanganan</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="app-select w-full rounded-xl p-2.5 text-xs font-medium bg-white"
                            >
                                <option value="">Semua Status</option>
                                <option value="Baru">Baru</option>
                                <option value="Proses">Sedang Diproses</option>
                                <option value="Pemantauan">Dalam Pemantauan</option>
                                <option value="Selesai">Selesai / Ditutup</option>
                            </select>
                        </div>

                        <div>
                            <label className="app-label mb-1.5 block text-xs font-bold text-slate-700">Kategori Masalah</label>
                            <select
                                value={filterKategori}
                                onChange={(e) => setFilterKategori(e.target.value)}
                                className="app-select w-full rounded-xl p-2.5 text-xs font-medium bg-white"
                            >
                                <option value="">Semua Kategori</option>
                                <option value="Pribadi">Pribadi</option>
                                <option value="Sosial">Sosial / Teman</option>
                                <option value="Belajar">Belajar / Akademik</option>
                                <option value="Keluarga">Keluarga</option>
                                <option value="Ibadah">Ibadah & Spiritual</option>
                                <option value="Homesick">Homesick / Adaptasi</option>
                                <option value="Kedisiplinan">Kedisiplinan</option>
                                <option value="Perundungan">Perundungan (Bullying)</option>
                                <option value="Karir">Karir</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>

                        <div>
                            <label className="app-label mb-1.5 block text-xs font-bold text-slate-700">Tingkat Privasi</label>
                            <select
                                value={filterPrivasi}
                                onChange={(e) => setFilterPrivasi(e.target.value)}
                                className="app-select w-full rounded-xl p-2.5 text-xs font-medium bg-white"
                            >
                                <option value="">Semua Privasi</option>
                                <option value="Biasa">Biasa</option>
                                <option value="Rahasia">Rahasia</option>
                                <option value="Sangat Rahasia">Sangat Rahasia</option>
                            </select>
                        </div>

                        <div>
                            <label className="app-label mb-1.5 block text-xs font-bold text-slate-700">Jadwal Kontrol</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFilterJadwal('semua')}
                                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
                                        filterJadwal === 'semua'
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                                            : 'bg-white border-gray-200 text-gray-700'
                                    }`}
                                >
                                    Semua
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterJadwal('ada_jadwal')}
                                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center flex items-center justify-center gap-1 ${
                                        filterJadwal === 'ada_jadwal'
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                                            : 'bg-white border-gray-200 text-gray-700'
                                    }`}
                                >
                                    <i className="bi bi-calendar-check"></i>
                                    <span>Ada Kontrol</span>
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-center">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Hasil Filter</div>
                            <div className="text-xl font-black text-indigo-900 mt-0.5">
                                {filteredSessions.length} <span className="text-xs font-bold uppercase text-indigo-600">Sesi BK</span>
                            </div>
                        </div>
                    </div>
                </MobileFilterDrawer>

                {/* Advanced Desktop Filter Toolbar */}
                <div className="hidden md:block p-4 bg-gray-50/70 border-b border-app-border space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        {/* Search */}
                        <div className="relative lg:col-span-2">
                            <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari nama santri, NIS, atau masalah..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="app-input w-full pl-8 p-2 text-xs bg-white"
                            />
                        </div>

                        {/* Filter Status */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="app-select w-full p-2 text-xs bg-white"
                        >
                            <option value="">Semua Status</option>
                            <option value="Baru">Baru</option>
                            <option value="Proses">Sedang Diproses</option>
                            <option value="Pemantauan">Dalam Pemantauan</option>
                            <option value="Selesai">Selesai / Ditutup</option>
                        </select>

                        {/* Filter Kategori */}
                        <select
                            value={filterKategori}
                            onChange={(e) => setFilterKategori(e.target.value)}
                            className="app-select w-full p-2 text-xs bg-white"
                        >
                            <option value="">Semua Kategori</option>
                            <option value="Pribadi">Pribadi</option>
                            <option value="Sosial">Sosial / Teman</option>
                            <option value="Belajar">Belajar / Akademik</option>
                            <option value="Keluarga">Keluarga</option>
                            <option value="Ibadah">Ibadah & Spiritual</option>
                            <option value="Homesick">Homesick / Adaptasi</option>
                            <option value="Kedisiplinan">Kedisiplinan</option>
                            <option value="Perundungan">Perundungan (Bullying)</option>
                            <option value="Karir">Karir</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>

                        {/* Filter Privasi */}
                        <select
                            value={filterPrivasi}
                            onChange={(e) => setFilterPrivasi(e.target.value)}
                            className="app-select w-full p-2 text-xs bg-white"
                        >
                            <option value="">Semua Privasi</option>
                            <option value="Biasa">Biasa</option>
                            <option value="Rahasia">Rahasia</option>
                            <option value="Sangat Rahasia">Sangat Rahasia</option>
                        </select>
                    </div>

                    {/* Filter Jadwal & Reset Button */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium">Jadwal Kontrol:</span>
                            <button
                                type="button"
                                onClick={() => setFilterJadwal('semua')}
                                className={`px-2.5 py-1 rounded-lg transition ${
                                    filterJadwal === 'semua'
                                        ? 'bg-indigo-600 text-white font-bold'
                                        : 'bg-white border text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterJadwal('ada_jadwal')}
                                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                                    filterJadwal === 'ada_jadwal'
                                        ? 'bg-indigo-600 text-white font-bold'
                                        : 'bg-white border text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <i className="bi bi-calendar-check"></i> Memiliki Jadwal Kontrol
                            </button>
                        </div>

                        {(searchTerm || filterStatus || filterKategori || filterPrivasi || filterJadwal !== 'semua') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterStatus('');
                                    setFilterKategori('');
                                    setFilterPrivasi('');
                                    setFilterJadwal('semua');
                                }}
                                className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                            >
                                <i className="bi bi-x-circle"></i> Reset Filter
                            </button>
                        )}
                    </div>
                </div>

                {/* Desktop / Tablet Table */}
                <div className="hidden md:block app-table-shell overflow-x-auto">
                    <table className="app-table text-xs text-left">
                        <thead className="border-b border-app-border bg-gray-50/50">
                            <tr>
                                <th className="p-3 w-8"></th>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Santri & Kamar</th>
                                <th className="p-3">Kategori</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Sesi Lanjutan</th>
                                <th className="p-3">Jadwal Kontrol</th>
                                <th className="p-3">Konselor</th>
                                <th className="p-3 text-center w-36">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSessions.map((s) => {
                                const santri = santriList.find((sa) => sa.id === s.santriId);
                                const kamarName = santri?.kamarId ? (settings.kamar?.find((k) => k.id === santri.kamarId)?.nama || `Kamar #${santri.kamarId}`) : '-';
                                const isExpanded = expandedRow === s.id;
                                const isOverdue = s.tanggalBerikutnya && s.status !== 'Selesai' && s.tanggalBerikutnya < today;
                                const isMasked = s.privasi === 'Sangat Rahasia' && !unmaskedRows[s.id];

                                return (
                                    <React.Fragment key={s.id}>
                                        <tr
                                            className={`hover:bg-indigo-50/40 cursor-pointer transition ${
                                                isExpanded ? 'bg-indigo-50/60' : ''
                                            }`}
                                            onClick={() => setExpandedRow(isExpanded ? null : s.id)}
                                        >
                                            <td className="p-3 text-center text-gray-400">
                                                <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                            </td>
                                            <td className="p-3 whitespace-nowrap text-gray-600 font-medium">
                                                {new Date(s.tanggal).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="p-3">
                                                <p className="font-bold text-gray-800">
                                                    {santri ? santri.namaLengkap : 'Unknown (ID: ' + s.santriId + ')'}
                                                </p>
                                                <p className="text-[11px] text-gray-500">
                                                    NIS: {santri?.nis || '-'} &bull; Kamar: {kamarName}
                                                </p>
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getCategoryBadgeClass(s.kategori)}`}>
                                                    {s.kategori}
                                                </span>
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${getStatusBadgeClass(s.status)}`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                {s.followUpLogs && s.followUpLogs.length > 0 ? (
                                                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 w-fit">
                                                        <i className="bi bi-clock-history"></i> {s.followUpLogs.length} Sesi
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[11px]">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                {s.tanggalBerikutnya ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[11px] font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-gray-700'}`}>
                                                            {s.tanggalBerikutnya}
                                                        </span>
                                                        {isOverdue && (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-700 font-bold">
                                                                Lewat
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[11px]">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-gray-600 whitespace-nowrap">{s.konselor}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    {/* Timeline Sesi Lanjutan Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (santri) {
                                                                setFollowUpSession(s);
                                                                setFollowUpSantri(santri);
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition"
                                                        title="Catatan Sesi Lanjutan & Timeline"
                                                    >
                                                        <i className="bi bi-clock-history"></i>
                                                    </button>

                                                    {/* Cetak Surat Administrasi */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (santri) {
                                                                setSuratSession(s);
                                                                setSuratSantri(santri);
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition"
                                                        title="Cetak Surat Panggilan / Undangan Wali / Komitmen"
                                                    >
                                                        <i className="bi bi-printer"></i>
                                                    </button>

                                                    {canWrite && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingSession(s);
                                                                    setIsCreateEditModalOpen(true);
                                                                }}
                                                                className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition"
                                                                title="Edit Sesi"
                                                            >
                                                                <i className="bi bi-pencil-square"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(s.id)}
                                                                className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                                                                title="Hapus Sesi"
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row Details */}
                                        {isExpanded && (
                                            <tr className="bg-indigo-50/30">
                                                <td colSpan={9} className="p-5 pl-10 border-b border-indigo-100">
                                                    <div className="space-y-4">
                                                        {/* Privacy status & Masking Toggle */}
                                                        <div className="flex items-center justify-between pb-2 border-b border-indigo-100 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-700">Tingkat Privasi:</span>
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                                        s.privasi === 'Sangat Rahasia'
                                                                            ? 'bg-rose-100 text-rose-800'
                                                                            : s.privasi === 'Rahasia'
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-gray-100 text-gray-700'
                                                                    }`}
                                                                >
                                                                    {s.privasi === 'Sangat Rahasia' && <i className="bi bi-shield-lock-fill mr-1"></i>}
                                                                    {s.privasi}
                                                                </span>

                                                                {s.privasi === 'Sangat Rahasia' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => toggleMask(s.id, e)}
                                                                        className="ml-2 px-2.5 py-0.5 border rounded-md text-[11px] font-semibold bg-white hover:bg-gray-50 text-indigo-700"
                                                                    >
                                                                        <i className={`bi bi-${isMasked ? 'eye' : 'eye-slash'} mr-1`}></i>
                                                                        {isMasked ? 'Buka Kunci Teks' : 'Kunci / Samarkan'}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {s.pihakTerlibat && s.pihakTerlibat.length > 0 && (
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-semibold text-gray-600">Koordinasi:</span>
                                                                    {s.pihakTerlibat.map((p, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-medium"
                                                                        >
                                                                            {p}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Masked view */}
                                                        {isMasked ? (
                                                            <div className="p-6 bg-rose-50/50 border border-dashed border-rose-200 rounded-xl text-center text-gray-500">
                                                                <i className="bi bi-shield-lock text-3xl text-rose-400"></i>
                                                                <p className="mt-1 font-bold text-gray-700">Konten Sesi Sangat Rahasia Disamarkan</p>
                                                                <p className="text-[11px] text-gray-500 mb-2">
                                                                    Untuk menjaga kerahasiaan santri di lingkungan kantor/sekolah, detail keluhan disembunyikan.
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => toggleMask(s.id, e)}
                                                                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold"
                                                                >
                                                                    Buka Tampilan Catatan
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                                <div className="space-y-1">
                                                                    <h5 className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">
                                                                        Keluhan / Pokok Masalah:
                                                                    </h5>
                                                                    <div className="bg-white p-3 rounded-xl border border-gray-200 text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                                        {s.keluhan}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <h5 className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">
                                                                        Arahan & Solusi Pembina:
                                                                    </h5>
                                                                    <div className="bg-white p-3 rounded-xl border border-gray-200 text-gray-800 whitespace-pre-wrap leading-relaxed">
                                                                        {s.penanganan || '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Komitmen & Hasil */}
                                                        {!isMasked && (s.komitmenSantri || s.hasil) && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-gray-200">
                                                                {s.komitmenSantri && (
                                                                    <div>
                                                                        <span className="font-bold text-indigo-900">
                                                                            <i className="bi bi-pen mr-1"></i>
                                                                            Komitmen Santri:
                                                                        </span>
                                                                        <p className="text-gray-700 italic mt-0.5">{s.komitmenSantri}</p>
                                                                    </div>
                                                                )}
                                                                {s.hasil && (
                                                                    <div>
                                                                        <span className="font-bold text-emerald-900">
                                                                            <i className="bi bi-check2-circle mr-1"></i>
                                                                            Hasil Evaluasi:
                                                                        </span>
                                                                        <p className="text-gray-700 mt-0.5">{s.hasil}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Action shortcuts in expanded view */}
                                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                {s.tanggalBerikutnya && (
                                                                    <span className="text-gray-500">
                                                                        Jadwal Kontrol Berikutnya: <strong className="text-indigo-700">{s.tanggalBerikutnya}</strong>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {santri && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setFollowUpSession(s);
                                                                                setFollowUpSantri(santri);
                                                                            }}
                                                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs flex items-center gap-1"
                                                                        >
                                                                            <i className="bi bi-clock-history"></i> Buka Timeline Sesi ({s.followUpLogs?.length || 0})
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSuratSession(s);
                                                                                setSuratSantri(santri);
                                                                            }}
                                                                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-1"
                                                                        >
                                                                            <i className="bi bi-printer"></i> Generator Surat BK
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredSessions.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8">
                                        <EmptyState
                                            icon="bi-person-heart"
                                            title="Sesi BK tidak ditemukan"
                                            description="Belum ada data konseling yang cocok dengan kriteria filter saat ini."
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="space-y-3 p-4 md:hidden">
                    {filteredSessions.map((s) => {
                        const santri = santriList.find((sa) => sa.id === s.santriId);
                        const kamarName = santri?.kamarId ? (settings.kamar?.find((k) => k.id === santri.kamarId)?.nama || `Kamar #${santri.kamarId}`) : '-';
                        const isMasked = s.privasi === 'Sangat Rahasia' && !unmaskedRows[s.id];

                        return (
                            <article key={s.id} className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-xs space-y-3 text-xs">
                                <div className="flex items-start justify-between gap-2 border-b pb-2">
                                    <div>
                                        <p className="text-[11px] font-semibold text-indigo-600">
                                            {new Date(s.tanggal).toLocaleDateString('id-ID')}
                                        </p>
                                        <h4 className="font-bold text-gray-800 text-sm">
                                            {santri ? santri.namaLengkap : 'Santri ID: ' + s.santriId}
                                        </h4>
                                        <p className="text-[11px] text-gray-400">
                                            NIS: {santri?.nis || '-'} &bull; Kamar: {kamarName}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadgeClass(s.status)}`}>
                                        {s.status}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${getCategoryBadgeClass(s.kategori)}`}>
                                        {s.kategori}
                                    </span>
                                    <span className="px-2 py-0.5 rounded border text-[10px] bg-gray-50 text-gray-600">
                                        Privasi: <strong>{s.privasi}</strong>
                                    </span>
                                    {s.followUpLogs && s.followUpLogs.length > 0 && (
                                        <span className="px-2 py-0.5 rounded border text-[10px] bg-indigo-50 text-indigo-700 font-semibold">
                                            {s.followUpLogs.length} Sesi Lanjutan
                                        </span>
                                    )}
                                </div>

                                {isMasked ? (
                                    <div className="p-3 bg-rose-50 border border-dashed border-rose-200 rounded-lg text-center">
                                        <p className="text-[11px] text-rose-700 font-bold">Catatan Sangat Rahasia Disamarkan</p>
                                        <button
                                            type="button"
                                            onClick={(e) => toggleMask(s.id, e)}
                                            className="mt-1 px-2.5 py-1 bg-rose-600 text-white rounded text-[10px] font-bold"
                                        >
                                            Buka Teks
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                            <p className="font-bold text-gray-700 text-[11px]">Keluhan:</p>
                                            <p className="mt-0.5 whitespace-pre-wrap text-gray-800">{s.keluhan}</p>
                                        </div>
                                        {s.penanganan && (
                                            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                                <p className="font-bold text-gray-700 text-[11px]">Penanganan:</p>
                                                <p className="mt-0.5 whitespace-pre-wrap text-gray-800">{s.penanganan}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {s.tanggalBerikutnya && (
                                    <p className="text-[11px] text-gray-500">
                                        Jadwal Kontrol: <strong className="text-gray-800">{s.tanggalBerikutnya}</strong>
                                    </p>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <span className="text-[11px] text-gray-400">Konselor: {s.konselor}</span>
                                    <div className="flex items-center gap-1.5">
                                        {santri && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFollowUpSession(s);
                                                        setFollowUpSantri(santri);
                                                    }}
                                                    className="p-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50"
                                                    title="Sesi Lanjutan"
                                                >
                                                    <i className="bi bi-clock-history"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSuratSession(s);
                                                        setSuratSantri(santri);
                                                    }}
                                                    className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 bg-emerald-50"
                                                    title="Cetak Surat"
                                                >
                                                    <i className="bi bi-printer"></i>
                                                </button>
                                            </>
                                        )}
                                        {canWrite && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingSession(s);
                                                        setIsCreateEditModalOpen(true);
                                                    }}
                                                    className="p-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50"
                                                >
                                                    <i className="bi bi-pencil-square"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(s.id)}
                                                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 bg-rose-50"
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

                    {filteredSessions.length === 0 && (
                        <EmptyState
                            icon="bi-person-heart"
                            title="Sesi BK tidak ditemukan"
                            description="Belum ada data konseling yang cocok dengan kriteria filter saat ini."
                        />
                    )}
                </div>
            </SectionCard>

            {/* Modal: Catat / Edit Sesi BK */}
            <BkModal
                isOpen={isCreateEditModalOpen}
                onClose={() => setIsCreateEditModalOpen(false)}
                onSave={handleSave}
                onUpdate={handleUpdate}
                initialData={editingSession}
            />

            {/* Modal: Timeline Sesi Lanjutan (Follow-up) */}
            {followUpSession && followUpSantri && (
                <BkFollowUpModal
                    isOpen={Boolean(followUpSession && followUpSantri)}
                    onClose={() => {
                        setFollowUpSession(null);
                        setFollowUpSantri(null);
                    }}
                    session={followUpSession}
                    santri={followUpSantri}
                    onSaved={() => {
                        // Refresh session in memory if needed
                        db.bkSessions.get(followUpSession.id).then((fresh) => {
                            if (fresh) setFollowUpSession(fresh);
                        });
                    }}
                />
            )}

            {/* Modal: Generator Surat Administrasi BK */}
            {suratSession && suratSantri && (
                <BkSuratModal
                    isOpen={Boolean(suratSession && suratSantri)}
                    onClose={() => {
                        setSuratSession(null);
                        setSuratSantri(null);
                    }}
                    session={suratSession}
                    santri={suratSantri}
                    settings={settings}
                />
            )}
        </div>
    );
};

export default BK;
