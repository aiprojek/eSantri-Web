
import { db } from '../db';

export interface HealthCheckResult {
    category: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    details?: string;
    actionLabel?: string;
    action?: () => Promise<void>;
}

export const runFullHealthCheck = async (): Promise<HealthCheckResult[]> => {
    const results: HealthCheckResult[] = [];

    // 1. Data Integrity: Santri & Saldo
    const santriIds = await db.santri.toCollection().primaryKeys();
    const saldoCount = await db.saldoSantri.count();
    
    if (santriIds.length !== saldoCount) {
        // Find missing IDs
        const existingSaldoIds = new Set(await db.saldoSantri.toCollection().primaryKeys());
        const missingIds = santriIds.filter(id => !existingSaldoIds.has(id));

        results.push({
            category: 'Integritas Data',
            status: 'warning',
            message: `Ketimpangan Data Saldo: Ada ${santriIds.length} santri tapi hanya ${saldoCount} data saldo.`,
            details: `Ditemukan ${missingIds.length} santri tanpa catatan saldo. Sistem akan membuatkan saldo awal Rp 0 untuk mereka.`,
            actionLabel: 'Perbaiki Saldo',
            action: async () => {
                const newSaldos = missingIds.map(id => ({
                    santriId: id as number,
                    saldo: 0,
                    lastModified: Date.now()
                }));
                await db.saldoSantri.bulkAdd(newSaldos);
            }
        });
    } else {
        results.push({
            category: 'Integritas Data',
            status: 'ok',
            message: 'Integritas Santri & Saldo OK.'
        });
    }

    // 2. Indexing: lastModified check
    const tablesToCheck = ['santri', 'transaksiSaldo', 'transaksiKas', 'absensi', 'tahfizh'] as const;
    let tablesMissingIndex: typeof tablesToCheck[number][] = [];
    
    for (const table of tablesToCheck) {
        const sample = await (db as any)[table].limit(50).toArray();
        const missing = sample.some((r: any) => !r.lastModified);
        if (missing) tablesMissingIndex.push(table);
    }

    if (tablesMissingIndex.length > 0) {
        results.push({
            category: 'Kinerja Cloud',
            status: 'warning',
            message: `Index Sinkronisasi Tidak Lengkap (${tablesMissingIndex.length} tabel)`,
            details: 'Beberapa record lama tidak memiliki timestamp sinkronisasi. Hal ini bisa memperlambat proses Incremental Sync pertama kali.',
            actionLabel: 'Re-Index Data',
            action: async () => {
                const now = Date.now();
                for (const table of tablesMissingIndex) {
                    await (db as any)[table].toCollection().modify((obj: any) => {
                        if (!obj.lastModified) obj.lastModified = now;
                    });
                }
            }
        });
    } else {
        results.push({
            category: 'Kinerja Cloud',
            status: 'ok',
            message: 'Index Sinkronisasi (lastModified) Lengkap.'
        });
    }

    // 3. Browser Storage Quota
    // ... (Keep existing quota check)
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        const percent = (usage / quota) * 100;

        if (percent > 80) {
            results.push({
                category: 'Penyimpanan Lokal',
                status: 'error',
                message: `Kapasitas Browser Hampir Penuh (${percent.toFixed(1)}%)`,
                details: 'Segera lakukan backup data ke cloud atau bersihkan file sampah.'
            });
        } else {
            results.push({
                category: 'Penyimpanan Lokal',
                status: 'ok',
                message: `Penyimpanan Lokal Aman (Digunakan: ${(usage / 1024 / 1024).toFixed(1)}MB)`
            });
        }
    }

    // 4. Orphaned Records check
    const limit = 500;
    const transaksiSantri = await db.transaksiSaldo.limit(limit).toArray();
    const allSantriIds = new Set(await db.santri.toCollection().primaryKeys());
    const orphans = transaksiSantri.filter(t => !allSantriIds.has(t.santriId));
    
    if (orphans.length > 0) {
         results.push({
            category: 'Kerapihan Database',
            status: 'warning',
            message: 'Ditemukan Transaksi Tanpa Pemilik',
            details: `Ditemukan ${orphans.length} transaksi (dari ${limit} sampel) yang merujuk ke ID santri yang sudah dihapus.`,
            actionLabel: 'Bersihkan Orphan',
            action: async () => {
                const orphanIds = orphans.map(o => o.id);
                await db.transaksiSaldo.bulkDelete(orphanIds);
            }
        });
    } else {
        results.push({
            category: 'Kerapihan Database',
            status: 'ok',
            message: `Tidak ada data yatim (orphaned records) di ${limit} sampel terakhir.`
        });
    }

    return results;
};
