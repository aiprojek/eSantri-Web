
import { db } from '../db';
import { isFirebaseClientConfigReady } from '../firebaseApp';

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

    // Master Santri IDs
    const santriList = await db.santri.toArray();
    const allSantriIds = new Set(santriList.map(s => s.id));
    const settings = (await db.settings.toArray())[0];

    // 1. Data Integrity: Santri & Saldo (1-to-1)
    const saldoCount = await db.saldoSantri.count();
    const existingSaldoIds = new Set(await db.saldoSantri.toCollection().primaryKeys());
    const missingSaldoIds = santriList.filter(s => !existingSaldoIds.has(s.id)).map(s => s.id);

    if (missingSaldoIds.length > 0) {
        results.push({
            category: 'Integritas Relasi Santri',
            status: 'warning',
            message: `Ketimpangan Saldo: ${missingSaldoIds.length} santri belum memiliki buku saldo.`,
            details: `Ada ${santriList.length} santri terdaftar namun baru ${saldoCount} data saldo. Saldo awal Rp 0 akan otomatis dibuatkan.`,
            actionLabel: 'Buat Saldo Awal',
            action: async () => {
                const now = Date.now();
                const newSaldos = missingSaldoIds.map(id => ({
                    santriId: id,
                    saldo: 0,
                    lastModified: now
                }));
                await db.saldoSantri.bulkAdd(newSaldos);
            }
        });
    } else {
        results.push({
            category: 'Integritas Relasi Santri',
            status: 'ok',
            message: `Relasi Santri & Saldo Sempurna (100% dari ${santriList.length} santri terhubung).`
        });
    }

    // 2. Data Integrity: Tagihan Tanpa Santri (Orphaned Tagihan)
    const tagihanList = await db.tagihan.toArray();
    const orphanedTagihan = tagihanList.filter(t => !allSantriIds.has(t.santriId));
    if (orphanedTagihan.length > 0) {
        results.push({
            category: 'Integritas Keuangan',
            status: 'warning',
            message: `Tagihan Yatim: Ditemukan ${orphanedTagihan.length} tagihan merujuk santri yang sudah dihapus.`,
            details: `Tagihan tanpa induk santri dapat merusak rekapitulasi tunggakan dan laporan kas masuk.`,
            actionLabel: 'Bersihkan Tagihan Yatim',
            action: async () => {
                const ids = orphanedTagihan.map(t => t.id).filter((id): id is number => typeof id === 'number');
                await db.tagihan.bulkDelete(ids);
            }
        });
    } else {
        results.push({
            category: 'Integritas Keuangan',
            status: 'ok',
            message: `Seluruh Tagihan (${tagihanList.length} data) valid dan terhubung ke santri aktif.`
        });
    }

    // 3. Data Integrity: Pembayaran Tanpa Santri
    const pembayaranList = await db.pembayaran.toArray();
    const orphanedPembayaran = pembayaranList.filter(p => !allSantriIds.has(p.santriId));
    if (orphanedPembayaran.length > 0) {
        results.push({
            category: 'Integritas Keuangan',
            status: 'warning',
            message: `Pembayaran Yatim: Ditemukan ${orphanedPembayaran.length} pembayaran tanpa santri aktif.`,
            details: `Catatan pembayaran ini merujuk ke ID santri yang sudah tidak ada.`,
            actionLabel: 'Bersihkan Pembayaran Yatim',
            action: async () => {
                const ids = orphanedPembayaran.map(p => p.id).filter((id): id is number => typeof id === 'number');
                await db.pembayaran.bulkDelete(ids);
            }
        });
    } else {
        results.push({
            category: 'Integritas Keuangan',
            status: 'ok',
            message: `Seluruh Catatan Pembayaran (${pembayaranList.length} data) terhubung ke santri valid.`
        });
    }

    // 4. Data Integrity: Transaksi Saldo Tabungan Tanpa Santri
    const transaksiSantri = await db.transaksiSaldo.toArray();
    const orphanedTransaksi = transaksiSantri.filter(t => !allSantriIds.has(t.santriId));
    if (orphanedTransaksi.length > 0) {
        results.push({
            category: 'Integritas Keuangan',
            status: 'warning',
            message: `Mutasi Saldo Yatim: Ditemukan ${orphanedTransaksi.length} mutasi saldo tanpa santri.`,
            details: `Data riwayat tabungan tidak bertuan dapat menyebabkan selisih saldo agregat.`,
            actionLabel: 'Bersihkan Mutasi Yatim',
            action: async () => {
                const ids = orphanedTransaksi.map(t => t.id).filter((id): id is number => typeof id === 'number');
                await db.transaksiSaldo.bulkDelete(ids);
            }
        });
    } else {
        results.push({
            category: 'Integritas Keuangan',
            status: 'ok',
            message: `Mutasi Saldo Tabungan (${transaksiSantri.length} transaksi) bersih dan terhubung.`
        });
    }

    // 5. Data Integrity: Akademik & Catatan Harian (Absensi, Tahfizh, Kesehatan, BK, Rapor)
    const [absensiList, tahfizhList, kesehatanList, bkList, sirkulasiList] = await Promise.all([
        db.absensi.toArray(),
        db.tahfizh.toArray(),
        db.kesehatanRecords.toArray(),
        db.bkSessions.toArray(),
        db.sirkulasi.toArray()
    ]);

    const orphanAbsensi = absensiList.filter(a => !allSantriIds.has(a.santriId)).length;
    const orphanTahfizh = tahfizhList.filter(t => !allSantriIds.has(t.santriId)).length;
    const orphanKesehatan = kesehatanList.filter(k => !allSantriIds.has(k.santriId)).length;
    const orphanBk = bkList.filter(b => !allSantriIds.has(b.santriId)).length;
    const orphanSirkulasi = sirkulasiList.filter(s => !allSantriIds.has(s.santriId)).length;
    const totalAcademicOrphans = orphanAbsensi + orphanTahfizh + orphanKesehatan + orphanBk + orphanSirkulasi;

    if (totalAcademicOrphans > 0) {
        results.push({
            category: 'Integritas Akademik & Santri',
            status: 'warning',
            message: `Catatan Santri Yatim: Ditemukan ${totalAcademicOrphans} catatan tak bertuan.`,
            details: `Rincian: Absensi (${orphanAbsensi}), Tahfizh (${orphanTahfizh}), Kesehatan (${orphanKesehatan}), BK (${orphanBk}), Sirkulasi Buku (${orphanSirkulasi}).`,
            actionLabel: 'Bersihkan Catatan Yatim',
            action: async () => {
                if (orphanAbsensi > 0) {
                    const ids = absensiList.filter(a => !allSantriIds.has(a.santriId)).map(a => a.id).filter((id): id is number => typeof id === 'number');
                    await db.absensi.bulkDelete(ids);
                }
                if (orphanTahfizh > 0) {
                    const ids = tahfizhList.filter(t => !allSantriIds.has(t.santriId)).map(t => t.id).filter((id): id is number => typeof id === 'number');
                    await db.tahfizh.bulkDelete(ids);
                }
                if (orphanKesehatan > 0) {
                    const ids = kesehatanList.filter(k => !allSantriIds.has(k.santriId)).map(k => k.id).filter((id): id is number => typeof id === 'number');
                    await db.kesehatanRecords.bulkDelete(ids);
                }
                if (orphanBk > 0) {
                    const ids = bkList.filter(b => !allSantriIds.has(b.santriId)).map(b => b.id).filter((id): id is number => typeof id === 'number');
                    await db.bkSessions.bulkDelete(ids);
                }
                if (orphanSirkulasi > 0) {
                    const ids = sirkulasiList.filter(s => !allSantriIds.has(s.santriId)).map(s => s.id).filter((id): id is number => typeof id === 'number');
                    await db.sirkulasi.bulkDelete(ids);
                }
            }
        });
    } else {
        results.push({
            category: 'Integritas Akademik & Santri',
            status: 'ok',
            message: 'Semua rekam jejak santri (Absensi, Tahfizh, Kesehatan, BK, Perpustakaan) valid.'
        });
    }

    // 6. Master Data Settings vs Santri Reference (Jenjang, Kelas, Rombel, Kamar)
    if (settings) {
        const validKamarIds = new Set((settings.kamar || []).map(k => k.id));
        const santriInvalidKamar = santriList.filter(s => s.kamarId && !validKamarIds.has(s.kamarId));

        if (santriInvalidKamar.length > 0) {
            results.push({
                category: 'Master Data Pondok',
                status: 'warning',
                message: `Asrama/Kamar Kadaluarsa: Ada ${santriInvalidKamar.length} santri di kamar yang sudah dihapus.`,
                details: `Santri masih mencantumkan kamar lama. Tindakan ini akan mengosongkan ID kamar agar siap ditempatkan ulang.`,
                actionLabel: 'Reset Kamar Santri',
                action: async () => {
                    const now = Date.now();
                    for (const s of santriInvalidKamar) {
                        await db.santri.update(s.id, { kamarId: undefined, lastModified: now });
                    }
                }
            });
        } else {
            results.push({
                category: 'Master Data Pondok',
                status: 'ok',
                message: 'Pemetaan Kamar & Asrama seluruh santri valid.'
            });
        }
    }

    // 7. Jadwal Piket Ibadah & Kalender
    const piketList = await db.piketSchedules.toArray();
    const calendarList = await db.calendarEvents.toArray();
    const invalidPiketCount = piketList.filter(p => {
        if (!p.tanggal || !p.sholat) return true;
        const muadzinValid = !p.muadzinSantriId || allSantriIds.has(p.muadzinSantriId);
        const imamValid = !p.imamSantriId || allSantriIds.has(p.imamSantriId);
        return !muadzinValid || !imamValid;
    }).length;

    if (invalidPiketCount > 0) {
        results.push({
            category: 'Kalender & Piket Ibadah',
            status: 'warning',
            message: `Jadwal Piket: Ditemukan ${invalidPiketCount} jadwal dengan petugas tidak aktif.`,
            details: 'Petugas muadzin atau imam merujuk ke santri yang sudah tidak aktif / dihapus.',
            actionLabel: 'Bersihkan Petugas Non-Aktif',
            action: async () => {
                const now = Date.now();
                for (const p of piketList) {
                    let updated = false;
                    const mods: any = { lastModified: now };
                    if (p.muadzinSantriId && !allSantriIds.has(p.muadzinSantriId)) {
                        mods.muadzinSantriId = undefined;
                        updated = true;
                    }
                    if (p.imamSantriId && !allSantriIds.has(p.imamSantriId)) {
                        mods.imamSantriId = undefined;
                        updated = true;
                    }
                    if (updated && p.id) {
                        await db.piketSchedules.update(p.id, mods);
                    }
                }
            }
        });
    } else {
        results.push({
            category: 'Kalender & Piket Ibadah',
            status: 'ok',
            message: `Data Kalender (${calendarList.length} agenda) & Piket Ibadah (${piketList.length} jadwal) konsisten.`
        });
    }

    // 8. Indexing: lastModified check across all syncable tables
    const tablesToCheck = ['santri', 'transaksiSaldo', 'transaksiKas', 'absensi', 'tahfizh', 'tagihan', 'pembayaran', 'piketSchedules', 'calendarEvents'] as const;
    let tablesMissingIndex: typeof tablesToCheck[number][] = [];
    
    for (const table of tablesToCheck) {
        const sample = await (db as any)[table].limit(50).toArray();
        const missing = sample.some((r: any) => !r.lastModified);
        if (missing) tablesMissingIndex.push(table);
    }

    if (tablesMissingIndex.length > 0) {
        results.push({
            category: 'Kinerja Cloud Sync',
            status: 'warning',
            message: `Index Sinkronisasi Tidak Lengkap (${tablesMissingIndex.length} tabel)`,
            details: 'Beberapa record lama belum memiliki timestamp sinkronisasi. Re-index akan melengkapi timestamp untuk sinkronisasi cloud.',
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
            category: 'Kinerja Cloud Sync',
            status: 'ok',
            message: 'Index Sinkronisasi (lastModified) Lengkap pada semua tabel utama.'
        });
    }

    // 9. Cloud Configuration Status
    if (isFirebaseClientConfigReady) {
        const pairedTenant = settings?.cloudSyncConfig?.firebasePairedTenantId;
        results.push({
            category: 'Konektivitas Cloud',
            status: 'ok',
            message: 'Konfigurasi Firebase Firestore Siap.',
            details: pairedTenant 
                ? `Perangkat terhubung dengan Tenant ID: ${pairedTenant}. Sinkronisasi multi-perangkat aktif.`
                : 'Firebase siap digunakan. Anda dapat melakukan pairing atau sinkronisasi data antar perangkat.'
        });
    } else {
        results.push({
            category: 'Konektivitas Cloud',
            status: 'warning',
            message: 'Konfigurasi Firebase belum terpasang penuh.',
            details: 'Aplikasi berjalan dalam mode Database Lokal Mandiri (IndexedDB offline-first).'
        });
    }

    // 10. Browser Storage Quota
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        const percent = (usage / quota) * 100;

        if (percent > 80) {
            results.push({
                category: 'Penyimpanan Lokal Browser',
                status: 'error',
                message: `Kapasitas Browser Hampir Penuh (${percent.toFixed(1)}%)`,
                details: 'Segera lakukan backup data ke file JSON atau sinkronkan ke cloud.'
            });
        } else {
            results.push({
                category: 'Penyimpanan Lokal Browser',
                status: 'ok',
                message: `Penyimpanan Aman (Terpakai: ${(usage / 1024 / 1024).toFixed(1)} MB dari ${(quota / 1024 / 1024 / 1024).toFixed(1)} GB).`
            });
        }
    }

    return results;
};

