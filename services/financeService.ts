
import { db } from '../db';
import { PondokSettings, Santri, Tagihan } from '../types';

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
