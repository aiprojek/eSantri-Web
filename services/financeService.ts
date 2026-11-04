
import { db } from '../db';
import { PondokSettings, Santri, Tagihan, TenagaPengajar, PayrollRecord } from '../types';
import { generateSyncSafeId } from '../utils/idGenerator';

export const generateTagihanBulanan = async (
    dexieDb: typeof db,
    settings: PondokSettings,
    santriList: Santri[],
    tahun: number,
    bulan: number
): Promise<{ result: { generated: number; skipped: number }, newTagihan: Tagihan[] }> => {
    const bulananBiaya = settings.biaya.filter(b => b.jenis === 'Bulanan');
    const aktifSantri = santriList.filter(s => s.status === 'Aktif');
    let generated = 0;
    let skipped = 0;

    const newTagihanData: any[] = [];

    for (const santri of aktifSantri) {
        for (const biaya of bulananBiaya) {
            if (!biaya.jenjangId || biaya.jenjangId === santri.jenjangId) {
                // Check if exists using query (ignoring deleted for safety, though finance integrity implies we check all)
                const exists = await dexieDb.tagihan.where({
                    santriId: santri.id,
                    biayaId: biaya.id,
                    tahun: tahun,
                    bulan: bulan
                }).filter(t => !t.deleted).first();

                if (!exists) {
                    const monthName = new Date(tahun, bulan - 1).toLocaleString('id-ID', { month: 'long' });
                    newTagihanData.push({
                        santriId: santri.id,
                        biayaId: biaya.id,
                        deskripsi: `${biaya.nama} - ${monthName} ${tahun}`,
                        bulan,
                        tahun,
                        nominal: biaya.nominal,
                        status: 'Belum Lunas',
                    });
                    generated++;
                } else {
                    skipped++;
                }
            }
        }
    }
    
    // We return the raw data objects. The AppContext will map them to have unique IDs.
    return { result: { generated, skipped }, newTagihan: newTagihanData };
};

export const generateTagihanAwal = async (
    dexieDb: typeof db,
    settings: PondokSettings,
    santriList: Santri[]
): Promise<{ result: { generated: number; skipped: number }, newTagihan: Tagihan[] }> => {
    const awalBiaya = settings.biaya.filter(b => b.jenis === 'Sekali Bayar' || b.jenis === 'Cicilan');
    const aktifSantri = santriList.filter(s => s.status === 'Aktif');
    let generated = 0;
    let skipped = 0;

    const newTagihanData: any[] = [];
    const currentYear = new Date().getFullYear();

    for (const santri of aktifSantri) {
        for (const biaya of awalBiaya) {
            const isEligibleByJenjang = !biaya.jenjangId || biaya.jenjangId === santri.jenjangId;
            const isEligibleByYear = !biaya.tahunMasuk || new Date(santri.tanggalMasuk).getFullYear() === biaya.tahunMasuk;

            if (isEligibleByJenjang && isEligibleByYear) {
                const exists = await dexieDb.tagihan.where({ santriId: santri.id, biayaId: biaya.id }).filter(t => !t.deleted).first();
                
                if (exists) {
                    skipped++;
                    continue;
                }

                if (biaya.jenis === 'Sekali Bayar') {
                    newTagihanData.push({
                        santriId: santri.id,
                        biayaId: biaya.id,
                        deskripsi: biaya.nama,
                        bulan: new Date().getMonth() + 1,
                        tahun: currentYear,
                        nominal: biaya.nominal,
                        status: 'Belum Lunas',
                    });
                    generated++;
                } else if (biaya.jenis === 'Cicilan' && biaya.jumlahCicilan && biaya.nominalCicilan) {
                    for (let i = 1; i <= biaya.jumlahCicilan; i++) {
                        newTagihanData.push({
                            santriId: santri.id,
                            biayaId: biaya.id,
                            deskripsi: `${biaya.nama} (Cicilan ${i}/${biaya.jumlahCicilan})`,
                            bulan: i, 
                            tahun: currentYear,
                            nominal: biaya.nominalCicilan,
                            status: 'Belum Lunas',
                        });
                    }
                    generated += biaya.jumlahCicilan;
                }
            }
        }
    }

    return { result: { generated, skipped }, newTagihan: newTagihanData };
};

// --- PAYROLL SERVICES ---

export const generatePayrollDraft = async (
    dexieDb: typeof db,
    teachers: TenagaPengajar[],
    month: number,
    year: number,
    effectiveWeeks: number = 4,
    jtmSource: 'jadwal' | 'jurnal' = 'jadwal'
): Promise<PayrollRecord[]> => {
    // Check if payroll already exists for this period
    const existing = await dexieDb.payrollRecords
        .where({ bulan: month, tahun: year })
        .filter((r: any) => !r.deleted)
        .toArray();

    const existingMap = new Map(existing.map(r => [r.guruId, r]));
    const drafts: PayrollRecord[] = [];
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const activeJurnalMonth = jtmSource === 'jurnal'
        ? await dexieDb.jurnalMengajar
            .filter((j: any) => !j.deleted && typeof j.tanggal === 'string' && j.tanggal.startsWith(monthPrefix))
            .toArray()
        : [];

    for (const t of teachers) {
        if (existingMap.has(t.id)) {
            continue;
        }

        let totalJamSebulan = 0;
        if (jtmSource === 'jurnal') {
            totalJamSebulan = activeJurnalMonth
                .filter(j => j.guruId === t.id)
                .reduce((sum, j) => sum + (Array.isArray(j.jamPelajaranIds) && j.jamPelajaranIds.length > 0 ? j.jamPelajaranIds.length : 1), 0);
        } else {
            // Only count active (non-deleted) schedule slots
            const jadwalCount = await dexieDb.jadwalPelajaran
                .where('guruId')
                .equals(t.id)
                .filter((j: any) => !j.deleted)
                .count();
            totalJamSebulan = jadwalCount * effectiveWeeks;
        }

        const cfg = t.configGaji || {
            gajiPokok: 0,
            tunjanganJabatan: 0,
            honorPerJam: 0,
            tunjanganLain: 0,
            potonganLain: 0
        };

        const totalHonorJTM = totalJamSebulan * cfg.honorPerJam;

        const jabatan = t.riwayatJabatan.length > 0
            ? [...t.riwayatJabatan].sort((a, b) => b.tanggalMulai.localeCompare(a.tanggalMulai))[0].jabatan
            : 'Guru';

        const totalDiterima = cfg.gajiPokok + cfg.tunjanganJabatan + totalHonorJTM + cfg.tunjanganLain - cfg.potonganLain;

        const draft: PayrollRecord = {
            id: generateSyncSafeId(),
            guruId: t.id,
            namaGuru: t.nama,
            jabatan: jabatan,
            bulan: month,
            tahun: year,
            tanggalBayar: new Date().toISOString().split('T')[0],

            gajiPokok: cfg.gajiPokok,
            tunjanganJabatan: cfg.tunjanganJabatan,
            totalJamMengajar: totalJamSebulan,
            honorPerJam: cfg.honorPerJam,
            totalHonorJTM: totalHonorJTM,
            tunjanganLain: cfg.tunjanganLain,
            bonus: 0,

            potonganLain: cfg.potonganLain,
            potonganAbsen: 0,

            totalDiterima: totalDiterima,
            deleted: false,
            lastModified: Date.now()
        };

        drafts.push(draft);
    }

    return drafts;
};
