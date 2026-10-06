import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AuditLog } from '../types';
import { useAppContext } from '../AppContext';
import { db } from '../db';
import { logActivity } from '../services/logService';
import { Pagination } from './common/Pagination';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { PrintHeader } from './common/PrintHeader';
import { loadXLSX } from '../utils/lazyClientLibs';

interface TableMeta {
    label: string;
    category: 'Kesantrian' | 'Keuangan' | 'Koperasi' | 'Sarpras' | 'Akademik' | 'Layanan' | 'Sistem';
    icon: string;
    sensitive?: boolean;
}

const TABLE_METADATA: Record<string, TableMeta> = {
    santri: { label: 'Data Santri', category: 'Kesantrian', icon: 'bi-people-fill' },
    pendaftar: { label: 'Pendaftar PSB', category: 'Kesantrian', icon: 'bi-person-plus-fill' },
    kamar: { label: 'Kamar Asrama', category: 'Kesantrian', icon: 'bi-Lamp-fill' },
    tagihan: { label: 'Tagihan Santri', category: 'Keuangan', icon: 'bi-receipt', sensitive: true },
    pembayaran: { label: 'Pembayaran SPP', category: 'Keuangan', icon: 'bi-cash-stack', sensitive: true },
    saldoSantri: { label: 'Saldo Tabungan Santri', category: 'Keuangan', icon: 'bi-wallet2', sensitive: true },
    transaksiSaldo: { label: 'Mutasi Tabungan Santri', category: 'Keuangan', icon: 'bi-arrow-left-right', sensitive: true },
    transaksiKas: { label: 'Buku Kas Umum', category: 'Keuangan', icon: 'bi-journal-Check', sensitive: true },
    chartOfAccounts: { label: 'Bagan Akun (COA)', category: 'Keuangan', icon: 'bi-diagram-2', sensitive: true },
    payrollRecords: { label: 'Penggajian Asatidz', category: 'Keuangan', icon: 'bi-envelope-paper', sensitive: true },
    produkKoperasi: { label: 'Produk Koperasi', category: 'Koperasi', icon: 'bi-box-seam' },
    transaksiKoperasi: { label: 'Penjualan POS Koperasi', category: 'Koperasi', icon: 'bi-cart-check', sensitive: true },
    riwayatStok: { label: 'Mutasi Stok Koperasi', category: 'Koperasi', icon: 'bi-boxes' },
    keuanganKoperasi: { label: 'Kas & Laba Rugi Koperasi', category: 'Koperasi', icon: 'bi-shop', sensitive: true },
    pembayaranHutang: { label: 'Cicilan Kasbon Koperasi', category: 'Koperasi', icon: 'bi-credit-card-2-front', sensitive: true },
    diskon: { label: 'Promo & Diskon Koperasi', category: 'Koperasi', icon: 'bi-tags' },
    suppliers: { label: 'Supplier Koperasi', category: 'Koperasi', icon: 'bi-truck' },
    warehouses: { label: 'Gudang Koperasi', category: 'Koperasi', icon: 'bi-building-check' },
    stockTransfers: { label: 'Transfer Stok Gudang', category: 'Koperasi', icon: 'bi-arrow-repeat' },
    inventaris: { label: 'Sarpras, Aset & Wakaf', category: 'Sarpras', icon: 'bi-building-gear', sensitive: true },
    absensi: { label: 'Presensi Santri', category: 'Akademik', icon: 'bi-calendar2-check' },
    tahfizh: { label: 'Tahfizh & Setoran', category: 'Akademik', icon: 'bi-book-half' },
    raporRecords: { label: 'Nilai & Rapor Santri', category: 'Akademik', icon: 'bi-award' },
    jurnalMengajar: { label: 'Jurnal Mengajar', category: 'Akademik', icon: 'bi-journal-bookmark' },
    calendarEvents: { label: 'Kalender Akademik', category: 'Akademik', icon: 'bi-calendar-event' },
    jadwalPelajaran: { label: 'Jadwal Pelajaran', category: 'Akademik', icon: 'bi-clock-history' },
    jadwalUjian: { label: 'Jadwal Ujian', category: 'Akademik', icon: 'bi-card-checklist' },
    kesehatanRecords: { label: 'Rekam Medis Poskestren', category: 'Layanan', icon: 'bi-heart-pulse' },
    bkSessions: { label: 'Konseling BK', category: 'Layanan', icon: 'bi-chat-heart' },
    bukuTamu: { label: 'Buku Tamu & Ekspedisi', category: 'Layanan', icon: 'bi-person-vcard' },
    buku: { label: 'Katalog Perpustakaan', category: 'Layanan', icon: 'bi-journal-richtext' },
    sirkulasi: { label: 'Sirkulasi Perpustakaan', category: 'Layanan', icon: 'bi-arrow-left-right' },
    perpustakaanBuku: { label: 'Katalog Perpustakaan', category: 'Layanan', icon: 'bi-journal-richtext' },
    perpustakaanSirkulasi: { label: 'Sirkulasi Perpustakaan', category: 'Layanan', icon: 'bi-arrow-left-right' },
    suratTemplates: { label: 'Template Surat', category: 'Layanan', icon: 'bi-file-earmark-word' },
    arsipSurat: { label: 'Arsip Surat Keluar', category: 'Layanan', icon: 'bi-archive' },
    users: { label: 'Akun & Hak Akses User', category: 'Sistem', icon: 'bi-shield-lock-fill', sensitive: true },
    settings: { label: 'Pengaturan Sistem & Master', category: 'Sistem', icon: 'bi-gear-fill', sensitive: true },
};

const getTableMeta = (tableName: string): TableMeta => {
    return TABLE_METADATA[tableName] || {
        label: tableName,
        category: 'Sistem',
        icon: 'bi-database'
    };
};

const formatCurrencyIfNumber = (key: string, val: any): string => {
    if (typeof val === 'number' && /nominal|jumlah|saldo|harga|total|biaya|bayar|diskon|pokok|tunjangan|potongan/i.test(key)) {
        return `Rp ${val.toLocaleString('id-ID')}`;
    }
    if (val === undefined || val === null) return '-';
    if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
};

/**
 * Extracts a human-readable summary from old_data or new_data so INSERT and DELETE logs
 * immediately show which record/person/amount was affected.
 */
const extractRecordSummary = (data: any): string => {
    if (!data || typeof data !== 'object') return '';
    const parts: string[] = [];

    const primaryName =
        data.namaLengkap ||
        data.nama ||
        data.namaBarang ||
        data.namaTamu ||
        data.judul ||
        data.perihal ||
        data.username ||
        data.fullName ||
        data.namaPembeli ||
        data.deskripsi ||
        data.keterangan ||
        data.keluhan ||
        data.materi;

    const code =
        data.nis ||
        data.kode ||
        data.nomorSurat ||
        data.nomorRegistrasi ||
        data.noTransaksi;

    if (primaryName) {
        parts.push(code ? `${primaryName} (${code})` : String(primaryName));
    } else if (code) {
        parts.push(`Kode: ${code}`);
    }

    if (data.jenis && typeof data.jenis === 'string') {
        parts.push(`[${data.jenis}]`);
    }
    if (data.kategori && typeof data.kategori === 'string' && data.kategori !== primaryName) {
        parts.push(`Kat: ${data.kategori}`);
    }
    if (data.lokasi && typeof data.lokasi === 'string') {
        parts.push(`Lokasi: ${data.lokasi}`);
    }

    const amount =
        data.jumlah ??
        data.nominal ??
        data.totalBayar ??
        data.total ??
        data.hargaPerolehan ??
        data.hargaJual ??
        data.saldo;

    if (typeof amount === 'number' && !isNaN(amount)) {
        parts.push(`Rp ${amount.toLocaleString('id-ID')}`);
    }

    if (data.rekening && typeof data.rekening === 'string') {
        parts.push(`(${data.rekening})`);
    }

    return parts.join(' • ');
};

export const AuditLogView: React.FC = () => {
    const { settings, currentUser, showToast, showConfirmation } = useAppContext();

    // Live reactive query from IndexedDB (auto-updates on local actions, Hub & Spoke Merge, and Firebase Realtime)
    const allLogs = useLiveQuery(
        () => db.auditLogs.orderBy('created_at').reverse().toArray(),
        []
    );
    const isLoading = allLogs === undefined;
    const rawLogs = allLogs || [];

    // Filters & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTable, setFilterTable] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterOp, setFilterOp] = useState('');
    const [datePreset, setDatePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Inspection Modal State
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [detailTab, setDetailTab] = useState<'diff' | 'json'>('diff');
    const [isExporting, setIsExporting] = useState(false);

    const isAdmin = !settings.multiUserMode || currentUser?.role === 'admin';

    // Distinct Users & Tables present in logs for dropdown filters
    const availableUsers = useMemo(() => {
        const set = new Set<string>();
        rawLogs.forEach(l => {
            const u = l.username || l.changed_by || 'Admin';
            if (u) set.add(u);
        });
        return Array.from(set).sort();
    }, [rawLogs]);

    const availableTables = useMemo(() => {
        const set = new Set<string>(Object.keys(TABLE_METADATA));
        rawLogs.forEach(l => {
            if (l.table_name) set.add(l.table_name);
        });
        return Array.from(set).sort((a, b) => getTableMeta(a).label.localeCompare(getTableMeta(b).label));
    }, [rawLogs]);

    // KPI Metrics
    const kpiStats = useMemo(() => {
        const todayPrefix = new Date().toISOString().split('T')[0];
        let todayCount = 0;
        let insertCount = 0;
        let updateCount = 0;
        let deleteCount = 0;
        let sensitiveCount = 0;

        rawLogs.forEach(l => {
            if (l.created_at?.startsWith(todayPrefix)) todayCount++;
            if (l.operation === 'INSERT') insertCount++;
            else if (l.operation === 'UPDATE') updateCount++;
            else if (l.operation === 'DELETE') deleteCount++;

            const meta = getTableMeta(l.table_name);
            if (l.operation === 'DELETE' || meta.sensitive) {
                sensitiveCount++;
            }
        });

        return {
            total: rawLogs.length,
            todayCount,
            insertCount,
            updateCount,
            deleteCount,
            sensitiveCount
        };
    }, [rawLogs]);

    // Filtered Logs
    const filteredLogs = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const q = searchQuery.trim().toLowerCase();

        return rawLogs.filter(log => {
            // 1. Module / Table filter
            if (filterTable && log.table_name !== filterTable) return false;

            // 2. User filter
            const actor = log.username || log.changed_by || 'Admin';
            if (filterUser && actor !== filterUser) return false;

            // 3. Operation / Sensitivity filter
            if (filterOp === 'SENSITIVE') {
                const meta = getTableMeta(log.table_name);
                if (log.operation !== 'DELETE' && !meta.sensitive) return false;
            } else if (filterOp && log.operation !== filterOp) {
                return false;
            }

            // 4. Date filter
            if (datePreset !== 'all') {
                const logTime = new Date(log.created_at).getTime();
                if (datePreset === 'today' && logTime < todayStart) return false;
                if (datePreset === '7d' && logTime < now.getTime() - 7 * 86400000) return false;
                if (datePreset === '30d' && logTime < now.getTime() - 30 * 86400000) return false;
                if (datePreset === 'custom') {
                    if (dateFrom) {
                        const fromTs = new Date(`${dateFrom}T00:00:00`).getTime();
                        if (logTime < fromTs) return false;
                    }
                    if (dateTo) {
                        const toTs = new Date(`${dateTo}T23:59:59`).getTime();
                        if (logTime > toTs) return false;
                    }
                }
            }

            // 5. Free-text search across record_id, table label, username, and JSON payload
            if (q) {
                const metaLabel = getTableMeta(log.table_name).label.toLowerCase();
                const recMatch = String(log.record_id || '').toLowerCase().includes(q);
                const userMatch = actor.toLowerCase().includes(q);
                const tblMatch = log.table_name.toLowerCase().includes(q) || metaLabel.includes(q);
                if (recMatch || userMatch || tblMatch) return true;

                const oldStr = log.old_data ? JSON.stringify(log.old_data).toLowerCase() : '';
                const newStr = log.new_data ? JSON.stringify(log.new_data).toLowerCase() : '';
                return oldStr.includes(q) || newStr.includes(q);
            }

            return true;
        });
    }, [rawLogs, filterTable, filterUser, filterOp, datePreset, dateFrom, dateTo, searchQuery]);

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filterTable, filterUser, filterOp, datePreset, dateFrom, dateTo, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(start, start + itemsPerPage);
    }, [filteredLogs, currentPage]);

    const getOpBadge = (op: string) => {
        switch (op) {
            case 'INSERT':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <i className="bi bi-plus-circle-fill"></i> INSERT
                    </span>
                );
            case 'UPDATE':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <i className="bi bi-pencil-square"></i> UPDATE
                    </span>
                );
            case 'DELETE':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                        <i className="bi bi-trash3-fill"></i> DELETE
                    </span>
                );
            default:
                return <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-800">{op}</span>;
        }
    };

    const renderLogSummary = (log: AuditLog) => {
        if (log.operation === 'INSERT') {
            const summary = extractRecordSummary(log.new_data);
            return (
                <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                        <i className="bi bi-check2-circle"></i> Data baru ditambahkan
                    </span>
                    {summary && (
                        <div className="text-xs text-gray-700 bg-emerald-50/70 border border-emerald-100 px-2.5 py-1.5 rounded-lg font-sans">
                            {summary}
                        </div>
                    )}
                </div>
            );
        }

        if (log.operation === 'DELETE') {
            const summary = extractRecordSummary(log.old_data || log.new_data);
            return (
                <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-xs">
                        <i className="bi bi-exclamation-octagon-fill"></i> Data dihapus dari daftar aktif
                    </span>
                    {summary && (
                        <div className="text-xs text-red-900 bg-red-50/80 border border-red-100 px-2.5 py-1.5 rounded-lg font-sans">
                            {summary}
                        </div>
                    )}
                </div>
            );
        }

        // UPDATE
        const oldData = log.old_data;
        const newData = log.new_data;
        if (!oldData && !newData) {
            return <span className="text-gray-400 italic text-xs">Pembaruan data tercatat</span>;
        }

        const contextName = extractRecordSummary(newData || oldData);
        const changes: React.ReactNode[] = [];
        const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

        allKeys.forEach(key => {
            if (['lastModified', 'updatedAt', 'createdAt', 'updated_at', 'created_at'].includes(key)) return;
            const valOld = oldData?.[key];
            const valNew = newData?.[key];

            if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
                let displayOld = formatCurrencyIfNumber(key, valOld);
                let displayNew = formatCurrencyIfNumber(key, valNew);

                if (displayOld.length > 48) displayOld = displayOld.substring(0, 48) + '...';
                if (displayNew.length > 48) displayNew = displayNew.substring(0, 48) + '...';

                changes.push(
                    <div key={key} className="flex flex-wrap items-center gap-1.5 py-0.5 text-[11px]">
                        <span className="font-bold text-gray-500 uppercase tracking-tight">{key}:</span>
                        <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded line-through decoration-red-300">{displayOld}</span>
                        <i className="bi bi-arrow-right text-gray-400"></i>
                        <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">{displayNew}</span>
                    </div>
                );
            }
        });

        return (
            <div className="space-y-1 font-sans">
                {contextName && (
                    <div className="text-[11px] font-semibold text-slate-700 truncate max-w-md">
                        {contextName}
                    </div>
                )}
                {changes.length > 0 ? (
                    <div className="space-y-0.5">
                        {changes.slice(0, 3)}
                        {changes.length > 3 && (
                            <span className="text-[10px] text-teal-700 font-semibold">
                                +{changes.length - 3} field lainnya berubah (klik Detail)
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-gray-400 italic text-xs">Pembaruan atribut internal</span>
                )}
            </div>
        );
    };

    // Rollback / Restore Handler for Super Admin
    const handleRollback = (log: AuditLog) => {
        if (!isAdmin) {
            showToast('Hanya Administrator Utama yang dapat memulihkan data dari Audit Log.', 'error');
            return;
        }
        const targetTable = (db as any)[log.table_name];
        if (!targetTable) {
            showToast(`Tabel "${log.table_name}" tidak mendukung pemulihan langsung.`, 'error');
            return;
        }
        const restorePayload = log.old_data;
        if (!restorePayload || typeof restorePayload !== 'object') {
            showToast('Data historis (old_data) tidak tersedia pada log ini untuk dipulihkan.', 'error');
            return;
        }

        const meta = getTableMeta(log.table_name);
        const actionTitle = log.operation === 'DELETE'
            ? `Pulihkan Data Terhapus (${meta.label})?`
            : `Kembalikan Data ke Versi Sebelumnya (${meta.label})?`;

        const actionDesc = log.operation === 'DELETE'
            ? `Data pada modul ${meta.label} (#${log.record_id}) akan dikembalikan ke daftar aktif dan disinkronkan ulang.`
            : `Seluruh field pada record #${log.record_id} di modul ${meta.label} akan dikembalikan ke nilai sebelum perubahan ini terjadi.`;

        showConfirmation(
            actionTitle,
            actionDesc,
            async () => {
                try {
                    const currentRecord = await targetTable.get(
                        !isNaN(Number(log.record_id)) ? Number(log.record_id) : log.record_id
                    );
                    const restoredRecord = {
                        ...restorePayload,
                        deleted: false,
                        lastModified: Date.now()
                    };
                    await targetTable.put(restoredRecord);
                    await logActivity(
                        'UPDATE',
                        log.table_name,
                        log.record_id,
                        currentRecord || null,
                        restoredRecord,
                        currentUser?.username || 'Admin (Rollback)'
                    );
                    showToast(`Data pada ${meta.label} berhasil dipulihkan!`, 'success');
                    setSelectedLog(null);
                } catch (err: any) {
                    console.error('Rollback failed:', err);
                    showToast(`Gagal memulihkan data: ${err.message || 'Error'}`, 'error');
                }
            },
            { confirmText: 'Ya, Pulihkan Data', confirmColor: 'teal' }
        );
    };

    // Export to Excel / CSV
    const handleExportExcel = async (format: 'xlsx' | 'csv') => {
        if (filteredLogs.length === 0 || isExporting) return;
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const rows = filteredLogs.map((l, idx) => {
                const meta = getTableMeta(l.table_name);
                return {
                    No: idx + 1,
                    Waktu: new Date(l.created_at).toLocaleString('id-ID'),
                    Petugas_Admin: l.username || l.changed_by || 'Admin',
                    Kategori_Modul: meta.category,
                    Nama_Modul: meta.label,
                    Tabel_Teknis: l.table_name,
                    ID_Record: l.record_id,
                    Operasi: l.operation,
                    Ringkasan_Objek: extractRecordSummary(l.new_data || l.old_data) || '-',
                    Data_Sebelum_JSON: l.old_data ? JSON.stringify(l.old_data) : '',
                    Data_Sesudah_JSON: l.new_data ? JSON.stringify(l.new_data) : ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'AuditLog');
            const dateStamp = new Date().toISOString().split('T')[0];
            if (format === 'csv') {
                XLSX.writeFile(wb, `Audit_Log_eSantri_${dateStamp}.csv`, { bookType: 'csv' });
            } else {
                XLSX.writeFile(wb, `Audit_Log_eSantri_${dateStamp}.xlsx`);
            }
            showToast(`Berhasil mengekspor ${rows.length} baris log audit.`, 'success');
        } catch (err) {
            console.error('Export error:', err);
            showToast('Gagal mengekspor log audit.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    // Prune Old Logs (Retention Management)
    const handlePruneOldLogs = (days: number) => {
        if (!isAdmin) return;
        const cutoffTime = Date.now() - days * 86400000;
        const toDelete = rawLogs.filter(l => new Date(l.created_at).getTime() < cutoffTime);

        if (toDelete.length === 0) {
            showToast(`Tidak ada log yang berusia lebih dari ${days} hari.`, 'info');
            return;
        }

        showConfirmation(
            `Bersihkan Log Lama (> ${days} Hari)?`,
            `Terdapat ${toDelete.length} catatan log yang berusia lebih dari ${days} hari. Disarankan mengekspor ke Excel terlebih dahulu sebagai arsip sebelum membersihkan database.`,
            async () => {
                try {
                    const ids = toDelete.map(l => l.id);
                    await db.auditLogs.bulkDelete(ids);
                    showToast(`${ids.length} log lama berhasil dibersihkan.`, 'success');
                } catch (err) {
                    showToast('Gagal membersihkan log lama.', 'error');
                }
            },
            { confirmText: `Ya, Hapus ${toDelete.length} Log Lama`, confirmColor: 'red' }
        );
    };

    const resetFilters = () => {
        setSearchQuery('');
        setFilterTable('');
        setFilterUser('');
        setFilterOp('');
        setDatePreset('all');
        setDateFrom('');
        setDateTo('');
    };

    return (
        <div className="space-y-6 pb-16">
            <PageHeader
                eyebrow="Keamanan & Pengawasan Sistem"
                title="Pusat Audit & Log Aktivitas"
                description="Pantau jejak perubahan data, histori transaksi sensitif, inspeksi perubahan (Before/After Diff), dan pemulihan data (Rollback) lintas perangkat."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-panduan', { detail: 'auditlog' }))}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
                        >
                            <i className="bi bi-shield-check text-teal-600"></i>
                            <span>SOP Audit &amp; Multi-Admin</span>
                        </button>
                        {settings.cloudSyncConfig?.provider === 'firebase' ? (
                            <span className="app-chip bg-emerald-50 text-emerald-800 border-emerald-200">
                                <i className="bi bi-cloud-check-fill text-emerald-600"></i>
                                Live Audit: Firebase Realtime
                            </span>
                        ) : settings.cloudSyncConfig?.provider && settings.cloudSyncConfig.provider !== 'none' ? (
                            <span className="app-chip bg-indigo-50 text-indigo-800 border-indigo-200">
                                <i className="bi bi-hdd-network-fill text-indigo-600"></i>
                                Audit Sync: Hub &amp; Spoke ({settings.cloudSyncConfig.provider})
                            </span>
                        ) : (
                            <span className="app-chip">
                                <i className="bi bi-hdd-fill"></i>
                                Audit Lokal (IndexedDB)
                            </span>
                        )}
                    </div>
                }
            />

            {/* 4 Executive KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs flex items-start justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Jejak Audit</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{kpiStats.total.toLocaleString('id-ID')}</p>
                        <p className="text-[11px] text-teal-700 font-semibold mt-1">
                            <i className="bi bi-clock-history mr-1"></i>
                            {kpiStats.todayCount} aktivitas hari ini
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center text-lg shrink-0">
                        <i className="bi bi-activity"></i>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs flex items-start justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Input &amp; Pembaruan</p>
                        <p className="text-2xl font-black text-blue-900 mt-1">
                            {(kpiStats.insertCount + kpiStats.updateCount).toLocaleString('id-ID')}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                            <span className="text-emerald-700 font-semibold">+{kpiStats.insertCount} Baru</span> • <span className="text-blue-700 font-semibold">{kpiStats.updateCount} Revisi</span>
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-lg shrink-0">
                        <i className="bi bi-pencil-square"></i>
                    </div>
                </div>

                <div
                    onClick={() => setFilterOp(filterOp === 'DELETE' ? '' : 'DELETE')}
                    className={`cursor-pointer rounded-2xl border p-4 shadow-2xs flex items-start justify-between transition ${
                        filterOp === 'DELETE' ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-white border-gray-200 hover:border-red-200'
                    }`}
                >
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Data Dihapus (DELETE)</p>
                        <p className="text-2xl font-black text-red-700 mt-1">{kpiStats.deleteCount.toLocaleString('id-ID')}</p>
                        <p className="text-[11px] text-red-600 font-medium mt-1">
                            Klik untuk filter riwayat hapus
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center text-lg shrink-0">
                        <i className="bi bi-trash3-fill"></i>
                    </div>
                </div>

                <div
                    onClick={() => setFilterOp(filterOp === 'SENSITIVE' ? '' : 'SENSITIVE')}
                    className={`cursor-pointer rounded-2xl border p-4 shadow-2xs flex items-start justify-between transition ${
                        filterOp === 'SENSITIVE' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-gray-200 hover:border-amber-200'
                    }`}
                >
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Aksi Sensitif &amp; Kas</p>
                        <p className="text-2xl font-black text-amber-900 mt-1">{kpiStats.sensitiveCount.toLocaleString('id-ID')}</p>
                        <p className="text-[11px] text-amber-700 font-medium mt-1">
                            Keuangan, Aset, User &amp; Hapus
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center text-lg shrink-0">
                        <i className="bi bi-shield-exclamation"></i>
                    </div>
                </div>
            </div>

            <SectionCard
                title="Daftar Riwayat & Forensik Perubahan Data"
                description="Klik tombol 'Inspeksi' pada baris log untuk melihat detail perubahan lengkap (Before vs After) atau memulihkan data."
                contentClassName="p-4 sm:p-6"
            >
                {/* Toolbar Filter & Ekspor */}
                <div className="mb-5 space-y-3 print:hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        <div className="sm:col-span-2 lg:col-span-2 relative">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Cari nama santri/barang, nominal, ID record, atau admin..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="app-input pl-8 pr-3 py-2 text-xs w-full"
                            />
                        </div>

                        <select
                            value={filterTable}
                            onChange={e => setFilterTable(e.target.value)}
                            className="app-select py-2 px-2.5 text-xs"
                        >
                            <option value="">Semua Modul / Tabel</option>
                            {availableTables.map(tbl => {
                                const meta = getTableMeta(tbl);
                                return (
                                    <option key={tbl} value={tbl}>
                                        [{meta.category}] {meta.label} ({tbl})
                                    </option>
                                );
                            })}
                        </select>

                        <select
                            value={filterUser}
                            onChange={e => setFilterUser(e.target.value)}
                            className="app-select py-2 px-2.5 text-xs"
                        >
                            <option value="">Semua Admin / Petugas ({availableUsers.length})</option>
                            {availableUsers.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>

                        <select
                            value={filterOp}
                            onChange={e => setFilterOp(e.target.value)}
                            className="app-select py-2 px-2.5 text-xs"
                        >
                            <option value="">Semua Jenis Operasi</option>
                            <option value="INSERT">INSERT (Tambah Data Baru)</option>
                            <option value="UPDATE">UPDATE (Revisi / Ubah Data)</option>
                            <option value="DELETE">DELETE (Hapus Data)</option>
                            <option value="SENSITIVE">⚡ Khusus Aksi Sensitif &amp; Kas</option>
                        </select>
                    </div>

                    {/* Baris Filter Waktu & Tombol Ekspor/Retensi */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-500 mr-1">Rentang Waktu:</span>
                            {([
                                { id: 'all', label: 'Semua' },
                                { id: 'today', label: 'Hari Ini' },
                                { id: '7d', label: '7 Hari' },
                                { id: '30d', label: '30 Hari' },
                                { id: 'custom', label: 'Pilih Tanggal' }
                            ] as const).map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setDatePreset(p.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                        datePreset === p.id
                                            ? 'bg-teal-600 text-white shadow-2xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}

                            {datePreset === 'custom' && (
                                <div className="flex items-center gap-1.5 ml-1">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={e => setDateFrom(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs"
                                    />
                                    <span className="text-xs text-gray-400">s/d</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={e => setDateTo(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs"
                                    />
                                </div>
                            )}

                            {(searchQuery || filterTable || filterUser || filterOp || datePreset !== 'all') && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    <i className="bi bi-x-circle"></i> Reset Filter
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                                Menampilkan {filteredLogs.length.toLocaleString('id-ID')} Log
                            </span>

                            <button
                                type="button"
                                disabled={filteredLogs.length === 0 || isExporting}
                                onClick={() => handleExportExcel('xlsx')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                            >
                                <i className="bi bi-file-earmark-excel-fill"></i>
                                <span>Ekspor Excel</span>
                            </button>

                            <button
                                type="button"
                                disabled={filteredLogs.length === 0}
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
                            >
                                <i className="bi bi-printer-fill"></i>
                                <span>Cetak</span>
                            </button>

                            {isAdmin && rawLogs.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handlePruneOldLogs(90)}
                                    title="Bersihkan log yang berusia lebih dari 90 hari"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
                                >
                                    <i className="bi bi-broom"></i>
                                    <span className="hidden sm:inline">Retensi &gt;90 Hari</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Kop Surat Khusus Mode Cetak */}
                <div className="hidden print:block mb-6">
                    <PrintHeader settings={settings} title="LAPORAN AUDIT AKTIVITAS SISTEM (AUDIT TRAIL)" />
                    <p className="text-xs text-center text-gray-600 mt-1">
                        Dicetak pada: {new Date().toLocaleString('id-ID')} • Total Baris: {filteredLogs.length}
                    </p>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block app-table-shell overflow-x-auto">
                    <table className="min-w-full divide-y divide-app-border text-sm">
                        <thead className="uppercase font-medium bg-gray-50 text-xs text-gray-600">
                            <tr>
                                <th className="px-4 py-3 text-left">Waktu</th>
                                <th className="px-4 py-3 text-left">Petugas / Admin</th>
                                <th className="px-4 py-3 text-left">Modul &amp; ID Record</th>
                                <th className="px-4 py-3 text-center">Operasi</th>
                                <th className="px-4 py-3 text-left">Ringkasan &amp; Rincian Perubahan</th>
                                <th className="px-4 py-3 text-right print:hidden">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedLogs.map(log => {
                                const meta = getTableMeta(log.table_name);
                                const actor = log.username || log.changed_by || 'Admin';
                                const isHighRisk = log.operation === 'DELETE';

                                return (
                                    <tr
                                        key={log.id}
                                        className={`transition hover:bg-gray-50 ${isHighRisk ? 'bg-red-50/20' : ''}`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                            <div className="font-semibold text-gray-800">
                                                {new Date(log.created_at).toLocaleDateString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                            <div className="text-[11px] text-gray-400">
                                                {new Date(log.created_at).toLocaleTimeString('id-ID')} WIB
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                                                <i className="bi bi-person-badge text-teal-600"></i>
                                                <span>{actor}</span>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-xs shrink-0">
                                                    <i className={`bi ${meta.icon}`}></i>
                                                </span>
                                                <div>
                                                    <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                                        <span>{meta.label}</span>
                                                        {meta.sensitive && (
                                                            <i className="bi bi-shield-lock text-amber-600 text-[10px]" title="Modul Sensitif"></i>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-gray-400">
                                                        {log.table_name} • #{String(log.record_id).slice(-8)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            {getOpBadge(log.operation)}
                                        </td>

                                        <td className="px-4 py-3 text-xs text-gray-600 max-w-md">
                                            {renderLogSummary(log)}
                                        </td>

                                        <td className="px-4 py-3 text-right whitespace-nowrap print:hidden">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedLog(log);
                                                        setDetailTab('diff');
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 transition"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                    <span>Inspeksi</span>
                                                </button>
                                                {isAdmin && log.old_data && (log.operation === 'DELETE' || log.operation === 'UPDATE') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRollback(log)}
                                                        title={log.operation === 'DELETE' ? 'Pulihkan Data Terhapus' : 'Kembalikan ke Nilai Sebelumnya'}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                                                    >
                                                        <i className="bi bi-arrow-counterclockwise"></i>
                                                        <span className="hidden lg:inline">Pulihkan</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedLogs.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={6} className="p-6">
                                        <EmptyState
                                            icon="bi-activity"
                                            title="Tidak ada log aktivitas yang sesuai"
                                            description="Belum ada perubahan sistem yang tercatat atau tidak ada log yang cocok dengan filter pencarian Anda."
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile & Tablet Card View */}
                <div className="md:hidden space-y-3">
                    {paginatedLogs.map(log => {
                        const meta = getTableMeta(log.table_name);
                        const actor = log.username || log.changed_by || 'Admin';
                        return (
                            <article
                                key={log.id}
                                className={`rounded-xl border p-3.5 shadow-2xs space-y-2.5 ${
                                    log.operation === 'DELETE' ? 'border-red-200 bg-red-50/10' : 'border-gray-200 bg-white'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-sm shrink-0">
                                            <i className={`bi ${meta.icon}`}></i>
                                        </span>
                                        <div>
                                            <div className="text-xs font-bold text-gray-900">{meta.label}</div>
                                            <div className="text-[11px] text-gray-500">
                                                {new Date(log.created_at).toLocaleString('id-ID')} • #{String(log.record_id).slice(-6)}
                                            </div>
                                        </div>
                                    </div>
                                    {getOpBadge(log.operation)}
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                                    <span>Petugas: <strong className="text-gray-800">{actor}</strong></span>
                                    <span className="font-mono text-[10px] text-gray-400">{log.table_name}</span>
                                </div>

                                <div className="text-xs text-gray-700">
                                    {renderLogSummary(log)}
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                    {isAdmin && log.old_data && (log.operation === 'DELETE' || log.operation === 'UPDATE') && (
                                        <button
                                            type="button"
                                            onClick={() => handleRollback(log)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800"
                                        >
                                            <i className="bi bi-arrow-counterclockwise"></i> Pulihkan Data
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedLog(log);
                                            setDetailTab('diff');
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-xs font-semibold text-teal-800"
                                    >
                                        <i className="bi bi-eye"></i> Detail Inspeksi
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                    {paginatedLogs.length === 0 && !isLoading && (
                        <div className="p-4">
                            <EmptyState
                                icon="bi-activity"
                                title="Belum ada log aktivitas"
                                description="Log perubahan sistem akan tampil secara otomatis saat ada transaksi atau perubahan data."
                            />
                        </div>
                    )}
                </div>

                <div className="mt-4 print:hidden">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </SectionCard>

            {/* Forensic Inspection Modal (Before vs After Diff & Raw JSON) */}
            {selectedLog && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs animate-fade-in"
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 bg-gray-50 border-b border-gray-200 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center text-lg shadow-xs shrink-0">
                                    <i className={`bi ${getTableMeta(selectedLog.table_name).icon}`}></i>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-base sm:text-lg font-bold text-gray-900">
                                            Inspeksi Audit: {getTableMeta(selectedLog.table_name).label}
                                        </h3>
                                        {getOpBadge(selectedLog.operation)}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Waktu: <strong>{new Date(selectedLog.created_at).toLocaleString('id-ID')}</strong> • Petugas: <strong>{selectedLog.username || selectedLog.changed_by || 'Admin'}</strong> • Record ID: <code>#{selectedLog.record_id}</code>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                            >
                                <i className="bi bi-x-lg text-sm"></i>
                            </button>
                        </div>

                        {/* Modal Sub-Tabs */}
                        <div className="px-5 pt-3 bg-white border-b border-gray-200 flex items-center justify-between gap-2">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setDetailTab('diff')}
                                    className={`pb-2.5 text-xs font-bold border-b-2 transition ${
                                        detailTab === 'diff'
                                            ? 'border-teal-600 text-teal-700'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <i className="bi bi-columns-gap mr-1.5"></i>
                                    Perbandingan Nilai (Sebelum vs Sesudah)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDetailTab('json')}
                                    className={`pb-2.5 text-xs font-bold border-b-2 transition ${
                                        detailTab === 'json'
                                            ? 'border-teal-600 text-teal-700'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <i className="bi bi-code-slash mr-1.5"></i>
                                    Data Mentah (Raw JSON)
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                            {detailTab === 'diff' ? (
                                (() => {
                                    const oldObj = selectedLog.old_data || {};
                                    const newObj = selectedLog.new_data || {};
                                    const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).filter(
                                        k => !['lastModified', 'updatedAt', 'createdAt', 'updated_at', 'created_at'].includes(k)
                                    );

                                    if (keys.length === 0) {
                                        return (
                                            <div className="p-6 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-200">
                                                Tidak ada rincian field yang tersimpan pada log ini.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                <thead className="bg-gray-100 font-bold text-gray-700 uppercase">
                                                    <tr>
                                                        <th className="px-3 py-2.5 text-left w-1/4">Nama Field / Atribut</th>
                                                        <th className="px-3 py-2.5 text-left w-[37.5%]">Nilai Sebelum (Old)</th>
                                                        <th className="px-3 py-2.5 text-left w-[37.5%]">Nilai Sesudah (New)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {keys.map(k => {
                                                        const vOld = oldObj[k];
                                                        const vNew = newObj[k];
                                                        const isChanged = JSON.stringify(vOld) !== JSON.stringify(vNew);
                                                        return (
                                                            <tr key={k} className={isChanged ? 'bg-amber-50/40' : ''}>
                                                                <td className="px-3 py-2 font-mono font-bold text-gray-700 align-top">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span>{k}</span>
                                                                        {isChanged && (
                                                                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Berubah"></span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className={`px-3 py-2 break-all align-top ${isChanged ? 'text-red-700 bg-red-50/40 font-medium' : 'text-gray-500'}`}>
                                                                    {formatCurrencyIfNumber(k, vOld)}
                                                                </td>
                                                                <td className={`px-3 py-2 break-all align-top ${isChanged ? 'text-emerald-800 bg-emerald-50/40 font-bold' : 'text-gray-500'}`}>
                                                                    {formatCurrencyIfNumber(k, vNew)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1.5">
                                        <span className="font-bold text-red-700 uppercase tracking-wider block">
                                            Data Sebelum (old_data):
                                        </span>
                                        <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] max-h-80">
                                            {selectedLog.old_data ? JSON.stringify(selectedLog.old_data, null, 2) : '// Kosong (Data Baru)'}
                                        </pre>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="font-bold text-emerald-700 uppercase tracking-wider block">
                                            Data Sesudah (new_data):
                                        </span>
                                        <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] max-h-80">
                                            {selectedLog.new_data ? JSON.stringify(selectedLog.new_data, null, 2) : '// Kosong (Data Dihapus)'}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[11px] text-gray-500">
                                ID Log: <code className="text-gray-700">{selectedLog.id}</code>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAdmin && selectedLog.old_data && (selectedLog.operation === 'DELETE' || selectedLog.operation === 'UPDATE') && (
                                    <button
                                        type="button"
                                        onClick={() => handleRollback(selectedLog)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-xs transition"
                                    >
                                        <i className="bi bi-arrow-counterclockwise"></i>
                                        <span>
                                            {selectedLog.operation === 'DELETE'
                                                ? 'Pulihkan Data Terhapus (Restore)'
                                                : 'Kembalikan ke Nilai Sebelumnya (Revert)'}
                                        </span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedLog(null)}
                                    className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs font-bold hover:bg-gray-100"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
