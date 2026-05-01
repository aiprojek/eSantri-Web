
import React from 'react';
import { Santri, PondokSettings, RiwayatStatus, GedungAsrama, AbsensiRecord, JurnalMengajarRecord, TahfizhRecord, KesehatanRecord, BkSession, Tagihan, TransaksiKas, Pendaftar } from '../../../types';
import { PrintHeader } from '../../common/PrintHeader';
import { ReportFooter, formatDate, formatRupiah, formatAlamat } from './Common';
import { getDefaultAcademicYear } from '../../../utils/academicYear';

// --- DASHBOARD SUMMARY ---
export const DashboardSummaryTemplate: React.FC<{ santriList: Santri[], settings: PondokSettings }> = ({ santriList, settings }) => {
    const totalSantri = santriList.length;
    const totalPutra = santriList.filter(s => s.jenisKelamin === 'Laki-laki').length;
    const totalPutri = totalSantri - totalPutra;
    const statusCounts = santriList.reduce((acc, santri) => { acc[santri.status] = (acc[santri.status] || 0) + 1; return acc; }, {} as Record<Santri['status'], number>);
    
    // Calculate detailed breakdown
    const jenjangBreakdown = settings.jenjang.map(jenjang => {
        const santriInJenjang = santriList.filter(s => s.jenjangId === jenjang.id);
        const kelasBreakdown = settings.kelas.filter(k => k.jenjangId === jenjang.id).map(kelas => {
            const santriInKelas = santriInJenjang.filter(s => s.kelasId === kelas.id);
            const rombels = settings.rombel.filter(r => r.kelasId === kelas.id).map(rombel => {
                 const santriInRombel = santriInKelas.filter(s => s.rombelId === rombel.id);
                 return {
                     nama: rombel.nama,
                     total: santriInRombel.length,
                     putra: santriInRombel.filter(s => s.jenisKelamin === 'Laki-laki').length,
                     putri: santriInRombel.filter(s => s.jenisKelamin === 'Perempuan').length
                 };
            });
            return { 
                nama: kelas.nama, 
                total: santriInKelas.length,
                rombels
            };
        });
        return { 
            nama: jenjang.nama, 
            total: santriInJenjang.length, 
            putra: santriInJenjang.filter(s => s.jenisKelamin === 'Laki-laki').length,
            putri: santriInJenjang.filter(s => s.jenisKelamin === 'Perempuan').length,
            kelasBreakdown 
        };
    });

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="Laporan Ringkas Dashboard Utama" />
                <p className="print-meta text-center text-sm mb-4">Dicetak pada: {formatDate(new Date().toISOString())}</p>
                
                <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Statistik Utama</h4>
                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                    <div className="p-2 border border-black rounded"><div className="text-xs text-gray-700">Total Santri</div><div className="text-2xl font-bold">{totalSantri}</div></div>
                    <div className="p-2 border border-black rounded"><div className="text-xs text-gray-700">Santri Putra</div><div className="text-2xl font-bold">{totalPutra}</div></div>
                    <div className="p-2 border border-black rounded"><div className="text-xs text-gray-700">Santri Putri</div><div className="text-2xl font-bold">{totalPutri}</div></div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6" style={{ breakInside: 'avoid' }}>
                    <div>
                        <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Komposisi Status</h4>
                        <table className="w-full text-sm">
                            <tbody>{(['Aktif', 'Hiatus', 'Lulus', 'Keluar/Pindah'] as Santri['status'][]).map(s => (<tr key={s}><td className="py-1 font-medium">{s}</td><td className="py-1 text-right">{statusCounts[s] || 0}</td></tr>))}</tbody>
                        </table>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Struktur Pendidikan</h4>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr><td className="py-1 font-medium">Jumlah Jenjang</td><td className="py-1 text-right">{settings.jenjang.length}</td></tr>
                                <tr><td className="py-1 font-medium">Jumlah Kelas</td><td className="py-1 text-right">{settings.kelas.length}</td></tr>
                                <tr><td className="py-1 font-medium">Jumlah Rombel</td><td className="py-1 text-right">{settings.rombel.length}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Detail Distribusi Santri</h4>
                <div className="space-y-4">
                    {jenjangBreakdown.map((j, idx) => (
                        <div key={idx} className="border border-black rounded p-3" style={{ breakInside: 'avoid' }}>
                            <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-1">
                                <span className="font-bold text-base">{j.nama}</span>
                                <span className="font-bold text-sm">Total: {j.total} (L:{j.putra}, P:{j.putri})</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {j.kelasBreakdown.map((k, kIdx) => (
                                    <div key={kIdx} className="text-xs">
                                        <div className="font-semibold bg-gray-100 px-1">{k.nama} <span className="float-right">{k.total}</span></div>
                                        <div className="pl-2 space-y-0.5 mt-0.5">
                                            {k.rombels.map((r, rIdx) => (
                                                <div key={rIdx} className="flex justify-between text-[10px] text-gray-600">
                                                    <span>- {r.nama}</span>
                                                    <span>{r.total} (L:{r.putra}, P:{r.putri})</span>
                                                </div>
                                            ))}
                                            {k.rombels.length === 0 && <div className="italic text-gray-400">- Belum ada rombel</div>}
                                        </div>
                                    </div>
                                ))}
                                {j.kelasBreakdown.length === 0 && <div className="text-xs italic text-gray-500">Belum ada data kelas.</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- OPERASIONAL HARIAN ---
export const OperasionalHarianTemplate: React.FC<{
    settings: PondokSettings;
    absensiList: AbsensiRecord[];
    jurnalMengajarList: JurnalMengajarRecord[];
    kesehatanRecords: KesehatanRecord[];
    bkSessions: BkSession[];
    transaksiKasList: TransaksiKas[];
    pendaftarList: Pendaftar[];
}> = ({ settings, absensiList, jurnalMengajarList, kesehatanRecords, bkSessions, transaksiKasList, pendaftarList }) => {
    const today = new Date().toISOString().slice(0, 10);
    const absenToday = absensiList.filter(a => a.tanggal === today);
    const h = absenToday.filter(a => a.status === 'H').length;
    const s = absenToday.filter(a => a.status === 'S').length;
    const i = absenToday.filter(a => a.status === 'I').length;
    const a = absenToday.filter(a => a.status === 'A').length;
    const kesehatanToday = kesehatanRecords.filter(k => k.tanggal === today);
    const bkToday = bkSessions.filter(b => b.tanggal === today);
    const jurnalToday = jurnalMengajarList.filter(j => j.tanggal === today);
    const kasToday = transaksiKasList.filter(k => (k.tanggal || '').slice(0, 10) === today);
    const kasMasuk = kasToday.filter(k => k.jenis === 'Pemasukan').reduce((sum, k) => sum + (Number(k.jumlah) || 0), 0);
    const kasKeluar = kasToday.filter(k => k.jenis === 'Pengeluaran').reduce((sum, k) => sum + (Number(k.jumlah) || 0), 0);
    const daftarToday = pendaftarList.filter(p => (p.tanggalDaftar || '').slice(0, 10) === today);

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="SNAPSHOT OPERASIONAL HARIAN" />
                <p className="print-meta text-center text-sm mb-4">Tanggal Operasional: {formatDate(today)}</p>

                <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="p-2 border rounded border-black text-center"><div className="text-xs text-gray-600">Hadir</div><div className="text-xl font-bold">{h}</div></div>
                    <div className="p-2 border rounded border-black text-center"><div className="text-xs text-gray-600">Sakit/Izin</div><div className="text-xl font-bold">{s + i}</div></div>
                    <div className="p-2 border rounded border-black text-center"><div className="text-xs text-gray-600">Alpha</div><div className="text-xl font-bold">{a}</div></div>
                    <div className="p-2 border rounded border-black text-center"><div className="text-xs text-gray-600">Jurnal Mengajar</div><div className="text-xl font-bold">{jurnalToday.length}</div></div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div style={{ breakInside: 'avoid' }}>
                        <h4 className="font-bold mb-2 border-b border-black pb-1">Layanan Harian</h4>
                        <table className="w-full text-sm border-collapse border border-black">
                            <tbody>
                                <tr><td className="p-2 border border-black">Pemeriksaan Kesehatan</td><td className="p-2 border border-black text-right font-semibold">{kesehatanToday.length} kasus</td></tr>
                                <tr><td className="p-2 border border-black">Sesi BK</td><td className="p-2 border border-black text-right font-semibold">{bkToday.length} sesi</td></tr>
                                <tr><td className="p-2 border border-black">Pendaftar PSB Baru</td><td className="p-2 border border-black text-right font-semibold">{daftarToday.length} orang</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div style={{ breakInside: 'avoid' }}>
                        <h4 className="font-bold mb-2 border-b border-black pb-1">Keuangan Harian</h4>
                        <table className="w-full text-sm border-collapse border border-black">
                            <tbody>
                                <tr><td className="p-2 border border-black">Pemasukan Kas</td><td className="p-2 border border-black text-right font-semibold text-green-700">{formatRupiah(kasMasuk)}</td></tr>
                                <tr><td className="p-2 border border-black">Pengeluaran Kas</td><td className="p-2 border border-black text-right font-semibold text-red-700">{formatRupiah(kasKeluar)}</td></tr>
                                <tr><td className="p-2 border border-black">Selisih Harian</td><td className="p-2 border border-black text-right font-bold">{formatRupiah(kasMasuk - kasKeluar)}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- EARLY WARNING SANTRI ---
export const EarlyWarningSantriTemplate: React.FC<{
    settings: PondokSettings;
    santriList: Santri[];
    absensiList: AbsensiRecord[];
    kesehatanRecords: KesehatanRecord[];
    bkSessions: BkSession[];
    tagihanList: Tagihan[];
}> = ({ settings, santriList, absensiList, kesehatanRecords, bkSessions, tagihanList }) => {
    const cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() - 30);
    const cutoff60 = new Date();
    cutoff60.setDate(cutoff60.getDate() - 60);

    const rows = santriList.map((s) => {
        const absensi = absensiList.filter(a => a.santriId === s.id && new Date(a.tanggal) >= cutoff30);
        const alpha = absensi.filter(a => a.status === 'A').length;
        const sakitIzin = absensi.filter(a => a.status === 'S' || a.status === 'I').length;
        const bkAktif = bkSessions.filter(b => b.santriId === s.id && (b.status === 'Proses' || b.status === 'Pemantauan')).length;
        const kesehatanRisiko = kesehatanRecords.filter(k => k.santriId === s.id && new Date(k.tanggal) >= cutoff60 && (k.status === 'Rawat Inap (Pondok)' || k.status === 'Rujuk RS/Klinik')).length;
        const tunggakan = tagihanList
            .filter(t => t.santriId === s.id && t.status === 'Belum Lunas')
            .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

        const score = (alpha * 5) + (sakitIzin * 2) + (bkAktif * 4) + (kesehatanRisiko * 4) + (tunggakan > 0 ? Math.min(10, Math.ceil(tunggakan / 500000)) : 0);
        const level = score >= 15 ? 'Tinggi' : score >= 8 ? 'Sedang' : 'Rendah';
        return { santri: s, alpha, sakitIzin, bkAktif, kesehatanRisiko, tunggakan, score, level };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);

    const topRows = rows.slice(0, 50);

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="EARLY WARNING SANTRI BERISIKO" />
                <p className="print-meta text-center text-sm mb-4">Perhitungan berbasis 30-60 hari terakhir: absensi, BK, kesehatan, dan tunggakan.</p>
                <table className="w-full text-left border-collapse border border-black text-xs">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border border-black w-8 text-center">No</th>
                            <th className="p-2 border border-black">Nama Santri</th>
                            <th className="p-2 border border-black text-center">Rombel</th>
                            <th className="p-2 border border-black text-center">Alpha</th>
                            <th className="p-2 border border-black text-center">S/I</th>
                            <th className="p-2 border border-black text-center">BK Aktif</th>
                            <th className="p-2 border border-black text-center">Rawat/Rujuk</th>
                            <th className="p-2 border border-black text-right">Tunggakan</th>
                            <th className="p-2 border border-black text-center">Skor</th>
                            <th className="p-2 border border-black text-center">Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topRows.map((row, idx) => (
                            <tr key={row.santri.id}>
                                <td className="p-2 border border-black text-center">{idx + 1}</td>
                                <td className="p-2 border border-black font-semibold">{row.santri.namaLengkap}</td>
                                <td className="p-2 border border-black text-center">{settings.rombel.find(r => r.id === row.santri.rombelId)?.nama || '-'}</td>
                                <td className="p-2 border border-black text-center">{row.alpha}</td>
                                <td className="p-2 border border-black text-center">{row.sakitIzin}</td>
                                <td className="p-2 border border-black text-center">{row.bkAktif}</td>
                                <td className="p-2 border border-black text-center">{row.kesehatanRisiko}</td>
                                <td className="p-2 border border-black text-right">{formatRupiah(row.tunggakan)}</td>
                                <td className="p-2 border border-black text-center font-bold">{row.score}</td>
                                <td className="p-2 border border-black text-center">{row.level}</td>
                            </tr>
                        ))}
                        {topRows.length === 0 && (
                            <tr>
                                <td colSpan={10} className="p-4 border border-black text-center italic text-gray-500">Belum ada indikator risiko pada rentang data saat ini.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- KINERJA PENGAJAR ---
export const KinerjaPengajarTemplate: React.FC<{ settings: PondokSettings; jurnalMengajarList: JurnalMengajarRecord[] }> = ({ settings, jurnalMengajarList }) => {
    const rows = settings.tenagaPengajar.map((guru) => {
        const jurnal = jurnalMengajarList.filter(j => j.guruId === guru.id);
        const rombelCount = new Set(jurnal.map(j => j.rombelId)).size;
        const mapelCount = new Set(jurnal.map(j => j.mataPelajaranId)).size;
        const lastDate = jurnal.length > 0 ? jurnal.map(j => j.tanggal).sort().at(-1) : '';
        return {
            guru,
            totalJurnal: jurnal.length,
            rombelCount,
            mapelCount,
            lastDate: lastDate || '-'
        };
    }).sort((a, b) => b.totalJurnal - a.totalJurnal);

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN KINERJA PENGAJAR" />
                <p className="print-meta text-center text-sm mb-4">Indikator berbasis aktivitas jurnal mengajar yang tercatat.</p>
                <table className="w-full text-left border-collapse border border-black text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border border-black w-8 text-center">No</th>
                            <th className="p-2 border border-black">Nama Pengajar</th>
                            <th className="p-2 border border-black text-center">Total Jurnal</th>
                            <th className="p-2 border border-black text-center">Rombel</th>
                            <th className="p-2 border border-black text-center">Mapel</th>
                            <th className="p-2 border border-black text-center">Jurnal Terakhir</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row.guru.id}>
                                <td className="p-2 border border-black text-center">{idx + 1}</td>
                                <td className="p-2 border border-black font-semibold">{row.guru.nama}</td>
                                <td className="p-2 border border-black text-center">{row.totalJurnal}</td>
                                <td className="p-2 border border-black text-center">{row.rombelCount}</td>
                                <td className="p-2 border border-black text-center">{row.mapelCount}</td>
                                <td className="p-2 border border-black text-center">{row.lastDate === '-' ? '-' : formatDate(row.lastDate)}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-4 border border-black text-center italic text-gray-500">Belum ada data pengajar/jurnal yang tercatat.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- TAHFIZH PROGRESS ---
export const TahfizhProgressTemplate: React.FC<{ settings: PondokSettings; santriList: Santri[]; tahfizhList: TahfizhRecord[] }> = ({ settings, santriList, tahfizhList }) => {
    const rows = santriList.map(s => {
        const rec = tahfizhList.filter(t => t.santriId === s.id);
        const ziyadah = rec.filter(t => t.tipe === 'Ziyadah').length;
        const murojaah = rec.filter(t => t.tipe === 'Murojaah').length;
        const tasmi = rec.filter(t => t.tipe === "Tasmi'").length;
        const lancar = rec.filter(t => t.predikat === 'Sangat Lancar' || t.predikat === 'Lancar').length;
        const persen = rec.length > 0 ? Math.round((lancar / rec.length) * 100) : 0;
        return { santri: s, total: rec.length, ziyadah, murojaah, tasmi, persen };
    }).sort((a, b) => b.total - a.total);

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN PERKEMBANGAN TAHFIZH" />
                <p className="print-meta text-center text-sm mb-4">Ringkasan capaian setoran dan kelancaran bacaan.</p>
                <table className="w-full text-left border-collapse border border-black text-xs">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border border-black w-8 text-center">No</th>
                            <th className="p-2 border border-black">Nama Santri</th>
                            <th className="p-2 border border-black text-center">Rombel</th>
                            <th className="p-2 border border-black text-center">Total Setoran</th>
                            <th className="p-2 border border-black text-center">Ziyadah</th>
                            <th className="p-2 border border-black text-center">Murojaah</th>
                            <th className="p-2 border border-black text-center">Tasmi'</th>
                            <th className="p-2 border border-black text-center">% Lancar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 60).map((row, idx) => (
                            <tr key={row.santri.id}>
                                <td className="p-2 border border-black text-center">{idx + 1}</td>
                                <td className="p-2 border border-black font-semibold">{row.santri.namaLengkap}</td>
                                <td className="p-2 border border-black text-center">{settings.rombel.find(r => r.id === row.santri.rombelId)?.nama || '-'}</td>
                                <td className="p-2 border border-black text-center">{row.total}</td>
                                <td className="p-2 border border-black text-center">{row.ziyadah}</td>
                                <td className="p-2 border border-black text-center">{row.murojaah}</td>
                                <td className="p-2 border border-black text-center">{row.tasmi}</td>
                                <td className="p-2 border border-black text-center font-semibold">{row.persen}%</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-4 border border-black text-center italic text-gray-500">Belum ada data tahfizh pada filter ini.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- KELAS/ASRAMA BERMASALAH ---
export const KelasAsramaBermasalahTemplate: React.FC<{
    settings: PondokSettings;
    santriList: Santri[];
    absensiList: AbsensiRecord[];
    kesehatanRecords: KesehatanRecord[];
    bkSessions: BkSession[];
    tagihanList: Tagihan[];
}> = ({ settings, santriList, absensiList, kesehatanRecords, bkSessions, tagihanList }) => {
    const rombelRows = settings.rombel.map((rombel) => {
        const santriIds = santriList.filter(s => s.rombelId === rombel.id).map(s => s.id);
        const alpha = absensiList.filter(a => santriIds.includes(a.santriId) && a.status === 'A').length;
        const sakit = absensiList.filter(a => santriIds.includes(a.santriId) && a.status === 'S').length;
        const bk = bkSessions.filter(b => santriIds.includes(b.santriId)).length;
        const rawat = kesehatanRecords.filter(k => santriIds.includes(k.santriId) && (k.status === 'Rawat Inap (Pondok)' || k.status === 'Rujuk RS/Klinik')).length;
        const tunggakan = tagihanList.filter(t => santriIds.includes(t.santriId) && t.status === 'Belum Lunas').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
        const score = (alpha * 3) + (sakit * 1) + (bk * 2) + (rawat * 2) + (tunggakan > 0 ? Math.min(10, Math.ceil(tunggakan / 1000000)) : 0);
        return { rombel, score, alpha, sakit, bk, rawat, tunggakan };
    }).sort((a, b) => b.score - a.score).slice(0, 10);

    const gedungRows = settings.gedungAsrama.map((gedung) => {
        const kamarIds = settings.kamar.filter(k => k.gedungId === gedung.id).map(k => k.id);
        const santriIds = santriList.filter(s => s.kamarId && kamarIds.includes(s.kamarId)).map(s => s.id);
        const bk = bkSessions.filter(b => santriIds.includes(b.santriId)).length;
        const rawat = kesehatanRecords.filter(k => santriIds.includes(k.santriId)).length;
        const tunggakan = tagihanList.filter(t => santriIds.includes(t.santriId) && t.status === 'Belum Lunas').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);
        const score = (bk * 2) + (rawat * 2) + (tunggakan > 0 ? Math.min(10, Math.ceil(tunggakan / 1000000)) : 0);
        return { gedung, score, bk, rawat, tunggakan };
    }).sort((a, b) => b.score - a.score).slice(0, 10);

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="KELAS & ASRAMA DENGAN RISIKO TERTINGGI" />
                <div className="grid grid-cols-2 gap-4">
                    <div style={{ breakInside: 'avoid' }}>
                        <h4 className="font-bold mb-2 border-b border-black pb-1">Top Rombel</h4>
                        <table className="w-full text-xs border-collapse border border-black">
                            <thead className="bg-gray-100">
                                <tr><th className="p-2 border border-black text-center">Rombel</th><th className="p-2 border border-black text-center">Alpha</th><th className="p-2 border border-black text-center">BK</th><th className="p-2 border border-black text-center">Rawat</th><th className="p-2 border border-black text-center">Skor</th></tr>
                            </thead>
                            <tbody>
                                {rombelRows.map(row => (
                                    <tr key={row.rombel.id}>
                                        <td className="p-2 border border-black font-semibold">{row.rombel.nama}</td>
                                        <td className="p-2 border border-black text-center">{row.alpha}</td>
                                        <td className="p-2 border border-black text-center">{row.bk}</td>
                                        <td className="p-2 border border-black text-center">{row.rawat}</td>
                                        <td className="p-2 border border-black text-center font-bold">{row.score}</td>
                                    </tr>
                                ))}
                                {rombelRows.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-4 border border-black text-center italic text-gray-500">Belum ada data rombel untuk dianalisis.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ breakInside: 'avoid' }}>
                        <h4 className="font-bold mb-2 border-b border-black pb-1">Top Gedung Asrama</h4>
                        <table className="w-full text-xs border-collapse border border-black">
                            <thead className="bg-gray-100">
                                <tr><th className="p-2 border border-black text-center">Gedung</th><th className="p-2 border border-black text-center">BK</th><th className="p-2 border border-black text-center">Kesehatan</th><th className="p-2 border border-black text-center">Skor</th></tr>
                            </thead>
                            <tbody>
                                {gedungRows.map(row => (
                                    <tr key={row.gedung.id}>
                                        <td className="p-2 border border-black font-semibold">{row.gedung.nama}</td>
                                        <td className="p-2 border border-black text-center">{row.bk}</td>
                                        <td className="p-2 border border-black text-center">{row.rawat}</td>
                                        <td className="p-2 border border-black text-center font-bold">{row.score}</td>
                                    </tr>
                                ))}
                                {gedungRows.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-4 border border-black text-center italic text-gray-500">Belum ada data asrama untuk dianalisis.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- COHORT SANTRI ---
export const CohortSantriTemplate: React.FC<{ settings: PondokSettings; santriList: Santri[] }> = ({ settings, santriList }) => {
    const byYear = santriList.reduce<Record<string, Santri[]>>((acc, s) => {
        const year = s.tanggalMasuk ? new Date(s.tanggalMasuk).getFullYear().toString() : 'Tidak Diketahui';
        if (!acc[year]) acc[year] = [];
        acc[year].push(s);
        return acc;
    }, {});

    const rows = Object.entries(byYear)
        .map(([year, list]) => {
            const total = list.length;
            const aktif = list.filter(s => s.status === 'Aktif').length;
            const lulus = list.filter(s => s.status === 'Lulus').length;
            const keluar = list.filter(s => s.status === 'Keluar/Pindah').length;
            const hiatus = list.filter(s => s.status === 'Hiatus').length;
            const retention = total > 0 ? Math.round((aktif / total) * 100) : 0;
            return { year, total, aktif, lulus, keluar, hiatus, retention };
        })
        .sort((a, b) => parseInt(b.year, 10) - parseInt(a.year, 10));

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN COHORT SANTRI" />
                <p className="print-meta text-center text-sm mb-4">Retensi dan outcome santri berdasarkan tahun masuk.</p>
                <table className="w-full text-left border-collapse border border-black text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border border-black text-center">Tahun Masuk</th>
                            <th className="p-2 border border-black text-center">Total</th>
                            <th className="p-2 border border-black text-center">Aktif</th>
                            <th className="p-2 border border-black text-center">Lulus</th>
                            <th className="p-2 border border-black text-center">Keluar</th>
                            <th className="p-2 border border-black text-center">Hiatus</th>
                            <th className="p-2 border border-black text-center">Retensi Aktif</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.year}>
                                <td className="p-2 border border-black font-semibold text-center">{row.year}</td>
                                <td className="p-2 border border-black text-center">{row.total}</td>
                                <td className="p-2 border border-black text-center">{row.aktif}</td>
                                <td className="p-2 border border-black text-center">{row.lulus}</td>
                                <td className="p-2 border border-black text-center">{row.keluar}</td>
                                <td className="p-2 border border-black text-center">{row.hiatus}</td>
                                <td className="p-2 border border-black text-center font-bold">{row.retention}%</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-4 border border-black text-center italic text-gray-500">Belum ada data cohort yang dapat ditampilkan.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- KEPATUHAN ADMINISTRASI ---
export const KepatuhanAdministrasiTemplate: React.FC<{ settings: PondokSettings; santriList: Santri[] }> = ({ settings, santriList }) => {
    const rows = santriList.map((s) => {
        const missing: string[] = [];
        if (!s.nik) missing.push('NIK');
        if (!s.nisn) missing.push('NISN');
        if (!s.namaIbu) missing.push('Nama Ibu');
        if (!s.namaAyah) missing.push('Nama Ayah');
        if (!(s.teleponWali || s.teleponAyah || s.teleponIbu || (s as any).nomorHpWali)) missing.push('Kontak Wali');
        if (!s.alamat?.kabupatenKota || !s.alamat?.provinsi) missing.push('Alamat Pokok');
        if (!s.tanggalLahir || !s.tempatLahir) missing.push('TTL');
        return { santri: s, missing };
    }).filter(r => r.missing.length > 0).sort((a, b) => b.missing.length - a.missing.length);

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN KEPATUHAN ADMINISTRASI SANTRI" />
                <p className="print-meta text-center text-sm mb-4">Daftar santri dengan data inti yang belum lengkap.</p>
                <table className="w-full text-left border-collapse border border-black text-xs">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border border-black w-8 text-center">No</th>
                            <th className="p-2 border border-black">Nama Santri</th>
                            <th className="p-2 border border-black text-center">Rombel</th>
                            <th className="p-2 border border-black text-center">Jumlah Kurang</th>
                            <th className="p-2 border border-black">Field Belum Lengkap</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row.santri.id}>
                                <td className="p-2 border border-black text-center">{idx + 1}</td>
                                <td className="p-2 border border-black font-semibold">{row.santri.namaLengkap}</td>
                                <td className="p-2 border border-black text-center">{settings.rombel.find(r => r.id === row.santri.rombelId)?.nama || '-'}</td>
                                <td className="p-2 border border-black text-center font-bold">{row.missing.length}</td>
                                <td className="p-2 border border-black">{row.missing.join(', ')}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-4 border border-black text-center italic text-gray-500">Seluruh data inti santri sudah lengkap.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- EFEKTIVITAS PSB ---
export const EfektivitasPSBTemplate: React.FC<{ settings: PondokSettings; pendaftarList: Pendaftar[] }> = ({ settings, pendaftarList }) => {
    const total = pendaftarList.length;
    const baru = pendaftarList.filter(p => p.status === 'Baru').length;
    const diterima = pendaftarList.filter(p => p.status === 'Diterima').length;
    const cadangan = pendaftarList.filter(p => p.status === 'Cadangan').length;
    const ditolak = pendaftarList.filter(p => p.status === 'Ditolak').length;
    const conversion = total > 0 ? Math.round((diterima / total) * 100) : 0;

    const byJalur = pendaftarList.reduce<Record<string, number>>((acc, p) => {
        const key = p.jalurPendaftaran || 'Tanpa Jalur';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const byGelombang = pendaftarList.reduce<Record<string, number>>((acc, p) => {
        const key = p.gelombang ? `Gelombang ${p.gelombang}` : 'Tanpa Gelombang';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN EFEKTIVITAS PSB" />
                <div className="grid grid-cols-5 gap-3 mb-5">
                    <div className="p-2 border rounded border-black text-center"><div className="text-xs text-gray-600">Total</div><div className="text-xl font-bold">{total}</div></div>
                    <div className="p-2 border rounded border-black text-center"><div className="text-xs text-gray-600">Baru</div><div className="text-xl font-bold">{baru}</div></div>
                    <div className="p-2 border rounded border-black text-center"><div className="text-xs text-gray-600">Diterima</div><div className="text-xl font-bold">{diterima}</div></div>
                    <div className="p-2 border rounded border-black text-center"><div className="text-xs text-gray-600">Cadangan</div><div className="text-xl font-bold">{cadangan}</div></div>
                    <div className="p-2 border rounded border-black text-center"><div className="text-xs text-gray-600">Ditolak</div><div className="text-xl font-bold">{ditolak}</div></div>
                </div>

                <div className="mb-4 p-3 border border-black rounded">
                    <div className="text-sm">Konversi Diterima: <span className="font-bold">{conversion}%</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div style={{ breakInside: 'avoid' }}>
                        <h4 className="font-bold mb-2 border-b border-black pb-1">Distribusi Jalur Pendaftaran</h4>
                        <table className="w-full text-sm border-collapse border border-black">
                            <tbody>
                                {Object.entries(byJalur).map(([jalur, count]) => (
                                    <tr key={jalur}>
                                        <td className="p-2 border border-black">{jalur}</td>
                                        <td className="p-2 border border-black text-right font-semibold">{count}</td>
                                    </tr>
                                ))}
                                {Object.entries(byJalur).length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="p-4 border border-black text-center italic text-gray-500">Belum ada data jalur pendaftaran.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ breakInside: 'avoid' }}>
                        <h4 className="font-bold mb-2 border-b border-black pb-1">Distribusi Gelombang</h4>
                        <table className="w-full text-sm border-collapse border border-black">
                            <tbody>
                                {Object.entries(byGelombang).map(([gelombang, count]) => (
                                    <tr key={gelombang}>
                                        <td className="p-2 border border-black">{gelombang}</td>
                                        <td className="p-2 border border-black text-right font-semibold">{count}</td>
                                    </tr>
                                ))}
                                {Object.entries(byGelombang).length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="p-4 border border-black text-center italic text-gray-500">Belum ada data gelombang pendaftaran.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- WALI KELAS ---
export const DaftarWaliKelasTemplate: React.FC<{ settings: PondokSettings }> = ({ settings }) => {
    const activeAcademicYear = getDefaultAcademicYear(settings);
    const dataByJenjang = settings.jenjang.map(jenjang => {
        const kelasInJenjang = settings.kelas.filter(k => k.jenjangId === jenjang.id);
        const rombelData = [];
        for (const kelas of kelasInJenjang) {
            const rombelInKelas = settings.rombel.filter(r => r.kelasId === kelas.id);
            for (const rombel of rombelInKelas) {
                const wali = settings.tenagaPengajar.find(t => t.id === rombel.waliKelasId);
                rombelData.push({ 
                    kelas: kelas.nama, 
                    rombel: rombel.nama, 
                    wali: wali ? wali.nama : '-',
                    kontak: wali?.telepon || '-' 
                });
            }
        }
        return { jenjang: jenjang.nama, rombels: rombelData };
    });

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="DAFTAR WALI KELAS PER ROMBEL" />
                <p className="print-meta text-center text-sm mb-6">Tahun Ajaran: {activeAcademicYear}</p>
                <div className="space-y-6">
                    {dataByJenjang.map((group, idx) => (
                        <div key={idx} style={{ breakInside: 'avoid' }}>
                            <h4 className="font-bold text-lg mb-2 text-gray-800 border-b border-gray-400 pb-1">{group.jenjang}</h4>
                            {group.rombels.length > 0 ? (
                                <table className="w-full text-left border-collapse border border-black text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 border border-black w-10 text-center">No</th>
                                            <th className="p-2 border border-black w-32">Kelas</th>
                                            <th className="p-2 border border-black w-48">Rombel</th>
                                            <th className="p-2 border border-black">Nama Wali Kelas</th>
                                            <th className="p-2 border border-black w-40 text-center">Kontak/HP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.rombels.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                <td className="p-2 border border-black text-center">{rIdx + 1}</td>
                                                <td className="p-2 border border-black">{row.kelas}</td>
                                                <td className="p-2 border border-black">{row.rombel}</td>
                                                <td className="p-2 border border-black font-semibold">{row.wali}</td>
                                                <td className="p-2 border border-black text-center font-mono">{row.kontak}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-sm italic text-gray-500 pl-2">Belum ada data rombel.</p>}
                        </div>
                    ))}
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- KONTAK ---
export const LaporanKontakTemplate: React.FC<{ santriList: Santri[], settings: PondokSettings }> = ({ santriList, settings }) => (
    <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
        <div>
            <PrintHeader settings={settings} title="LAPORAN KONTAK WALI SANTRI" />
            <table className="w-full text-left border-collapse border border-black text-sm">
                <thead className="bg-gray-200 uppercase"><tr><th className="p-2 border border-black w-8 text-center">No</th><th className="p-2 border border-black w-24 text-center">NIS</th><th className="p-2 border border-black">Nama Santri</th><th className="p-2 border border-black">Rombel</th><th className="p-2 border border-black">Nama Wali</th><th className="p-2 border border-black text-center">No. HP Wali</th><th className="p-2 border border-black">Alamat Rumah</th></tr></thead>
                <tbody>
                    {santriList.map((s, i) => (
                        <tr key={s.id}><td className="p-2 border border-black text-center">{i + 1}</td><td className="p-2 border border-black text-center">{s.nis}</td><td className="p-2 border border-black">{s.namaLengkap}</td><td className="p-2 border border-black">{settings.rombel.find(r => r.id === s.rombelId)?.nama || '-'}</td><td className="p-2 border border-black">{s.namaWali || s.namaAyah || s.namaIbu}</td><td className="p-2 border border-black text-center font-mono">{s.teleponWali || (s as any).nomorHpWali || s.teleponAyah || s.teleponIbu || '-'}</td><td className="p-2 border border-black text-xs leading-tight">{formatAlamat(s.alamat) || '-'}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
        <ReportFooter />
    </div>
);

export const LaporanKontakStafTemplate: React.FC<{ settings: PondokSettings }> = ({ settings }) => (
    <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
        <div>
            <PrintHeader settings={settings} title="LAPORAN KONTAK TENAGA PENDIDIK & STAF" />
            <table className="w-full text-left border-collapse border border-black text-sm">
                <thead className="bg-gray-200 uppercase">
                    <tr>
                        <th className="p-2 border border-black w-8 text-center">No</th>
                        <th className="p-2 border border-black">Nama Lengkap</th>
                        <th className="p-2 border border-black">Jabatan Terakhir</th>
                        <th className="p-2 border border-black text-center">No. Telepon/WA</th>
                        <th className="p-2 border border-black">Email</th>
                    </tr>
                </thead>
                <tbody>
                    {settings.tenagaPengajar.map((t, i) => {
                        const activeJabatan = t.riwayatJabatan
                            ?.filter(r => !r.tanggalSelesai)
                            .sort((a, b) => new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime())[0] 
                            || t.riwayatJabatan?.[0];
                        
                        return (
                            <tr key={t.id}>
                                <td className="p-2 border border-black text-center">{i + 1}</td>
                                <td className="p-2 border border-black font-semibold">{t.nama}</td>
                                <td className="p-2 border border-black">{activeJabatan?.jabatan || '-'}</td>
                                <td className="p-2 border border-black text-center font-mono">{t.telepon || '-'}</td>
                                <td className="p-2 border border-black">{t.email || '-'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        <ReportFooter />
    </div>
);

// --- MATA PELAJARAN ---
export const LaporanMapelTemplate: React.FC<{ settings: PondokSettings }> = ({ settings }) => {
    const dataByJenjang = settings.jenjang.map(jenjang => {
        const mapels = settings.mataPelajaran.filter(m => m.jenjangId === jenjang.id);
        return { jenjang: jenjang.nama, mapels };
    });

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="DAFTAR KURIKULUM & MATA PELAJARAN" />
                <div className="space-y-8 mt-4">
                    {dataByJenjang.map((group, idx) => (
                        <div key={idx} style={{ breakInside: 'avoid' }}>
                            <h4 className="font-bold text-lg mb-2 text-gray-800 border-b-2 border-teal-600 pb-1 flex justify-between items-center">
                                <span>{group.jenjang}</span>
                                <span className="text-sm font-normal text-gray-500">Total: {group.mapels.length} Mapel</span>
                            </h4>
                            {group.mapels.length > 0 ? (
                                <table className="w-full text-left border-collapse border border-black text-sm">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 border border-black w-8 text-center">No</th>
                                            <th className="p-2 border border-black">Nama Mata Pelajaran</th>
                                            <th className="p-2 border border-black w-12 text-center">KKM</th>
                                            <th className="p-2 border border-black">Modul / Kitab</th>
                                            <th className="p-2 border border-black text-xs">Link (Unduh/Beli)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.mapels.map((row, mIdx) => (
                                            <tr key={mIdx}>
                                                <td className="p-2 border border-black text-center">{mIdx + 1}</td>
                                                <td className="p-2 border border-black font-semibold">{row.nama}</td>
                                                <td className="p-2 border border-black text-center">{row.kkm || '-'}</td>
                                                <td className="p-2 border border-black">
                                                    {(row.modulList && row.modulList.length > 0) ? row.modulList.join(', ') : (row.modul || '-')}
                                                </td>
                                                <td className="p-2 border border-black text-[9px] text-gray-600 truncate max-w-[150px]">
                                                    {(row.linkUnduhList && row.linkUnduhList.length > 0)
                                                        ? row.linkUnduhList.map((item: string, idx: number) => <div key={`u-${idx}`} className="truncate"><i className="bi bi-download mr-1"></i>{item}</div>)
                                                        : (row.linkUnduh && <div className="truncate"><i className="bi bi-download mr-1"></i>{row.linkUnduh}</div>)}
                                                    {(row.linkPembelianList && row.linkPembelianList.length > 0)
                                                        ? row.linkPembelianList.map((item: string, idx: number) => <div key={`b-${idx}`} className="truncate"><i className="bi bi-cart mr-1"></i>{item}</div>)
                                                        : (row.linkPembelian && <div className="truncate"><i className="bi bi-cart mr-1"></i>{row.linkPembelian}</div>)}
                                                    {!row.linkUnduh && !row.linkPembelian && (!row.linkUnduhList || row.linkUnduhList.length === 0) && (!row.linkPembelianList || row.linkPembelianList.length === 0) && '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-sm italic text-gray-500 pl-2">Belum ada data mata pelajaran.</p>}
                        </div>
                    ))}
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- ASRAMA ---
export const LaporanAsramaTemplate: React.FC<{ settings: PondokSettings; santriList: Santri[]; gedungList: GedungAsrama[]; }> = ({ settings, santriList, gedungList }) => {
    const penghuniPerKamar = new Map<number, Santri[]>();
    santriList.forEach(s => { if (s.kamarId && s.status === 'Aktif') { if (!penghuniPerKamar.has(s.kamarId)) penghuniPerKamar.set(s.kamarId, []); penghuniPerKamar.get(s.kamarId)!.push(s); } });

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="Laporan Rekapitulasi Keasramaan" />
                <div className="space-y-6">
                    {gedungList.map(gedung => (
                        <div key={gedung.id} style={{ breakInside: 'avoid' }}>
                            <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">{gedung.nama} ({gedung.jenis})</h4>
                            {settings.kamar.filter(k => k.gedungId === gedung.id).map(k => {
                                const penghuni = penghuniPerKamar.get(k.id) || [];
                                const musyrif = settings.tenagaPengajar.find(tp => tp.id === k.musyrifId);
                                return (
                                    <div key={k.id} className="pl-4 border-l-2 border-gray-300 mb-4" style={{ breakInside: 'avoid' }}>
                                        <div className="bg-gray-100 p-1 font-semibold text-sm flex justify-between"><span>{k.nama}</span><span>{penghuni.length} / {k.kapasitas}</span></div>
                                        <p className="text-xs text-gray-600 mb-1">Musyrif: {musyrif?.nama || '-'}</p>
                                        {penghuni.length > 0 ? (
                                            <table className="w-full text-xs border-collapse border border-black">
                                                <thead className="bg-gray-200">
                                                    <tr>
                                                        <th className="p-1 border border-black w-8">No</th>
                                                        <th className="p-1 border border-black w-24">NIS</th>
                                                        <th className="p-1 border border-black">Nama Lengkap</th>
                                                        <th className="p-1 border border-black w-10 text-center">L/P</th>
                                                        <th className="p-1 border border-black w-32">Rombel</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {penghuni.map((s, i) => (
                                                        <tr key={s.id}>
                                                            <td className="p-1 border border-black text-center">{i+1}</td>
                                                            <td className="p-1 border border-black text-center">{s.nis}</td>
                                                            <td className="p-1 border border-black">{s.namaLengkap}</td>
                                                            <td className="p-1 border border-black text-center">{s.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                                            <td className="p-1 border border-black">{settings.rombel.find(r=>r.id===s.rombelId)?.nama || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : <p className="text-xs italic text-gray-500">Kamar kosong.</p>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- MUTASI ---
export const LaporanMutasiTemplate: React.FC<{ mutasiEvents: any[]; settings: PondokSettings; startDate: string; endDate: string }> = ({ mutasiEvents, settings, startDate, endDate }) => (
    <div className="text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
        <div>
            <PrintHeader settings={settings} title="LAPORAN MUTASI SANTRI" />
            <div className="print-meta text-sm font-semibold mb-4 text-center"><span>Periode: {formatDate(startDate)} s.d. {formatDate(endDate)}</span></div>
            <table className="w-full text-left border-collapse border border-black">
                <thead className="text-xs uppercase bg-gray-200 text-center"><tr><th className="px-2 py-2 border border-black">No</th><th className="px-2 py-2 border border-black">Tanggal</th><th className="px-2 py-2 border border-black">NIS</th><th className="px-2 py-2 border border-black text-left">Nama Lengkap</th><th className="px-2 py-2 border border-black">Status Baru</th><th className="px-2 py-2 border border-black text-left">Keterangan</th></tr></thead>
                <tbody style={{ fontSize: '9pt' }}>
                    {mutasiEvents.map(({ santri, mutasi }, i) => (
                        <tr key={`${santri.id}-${mutasi.id}`}><td className="px-2 py-2 border border-black text-center">{i + 1}</td><td className="px-2 py-2 border border-black whitespace-nowrap">{formatDate(mutasi.tanggal)}</td><td className="px-2 py-2 border border-black">{santri.nis}</td><td className="px-2 py-2 border border-black">{santri.namaLengkap}</td><td className="px-2 py-2 border border-black text-center">{mutasi.status}</td><td className="px-2 py-2 border border-black">{mutasi.keterangan}</td></tr>
                    ))}
                    {mutasiEvents.length === 0 && <tr><td colSpan={6} className="text-center py-4 border border-black italic text-gray-500">Tidak ada data mutasi.</td></tr>}
                </tbody>
            </table>
        </div>
        <ReportFooter />
    </div>
);

// --- PEMBINAAN ---
export const LembarPembinaanTemplate: React.FC<{ santri: Santri; settings: PondokSettings }> = ({ santri, settings }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LEMBAR PEMBINAAN SANTRI" />
                <div className="print-meta mb-6 p-4 border rounded bg-gray-50">
                    <table className="w-full"><tbody><tr><td className="font-semibold w-32">Nama</td><td>: {santri.namaLengkap}</td><td className="font-semibold w-32">NIS</td><td>: {santri.nis}</td></tr><tr><td className="font-semibold">Jenjang/Kelas</td><td>: {jenjang?.nama} / {kelas?.nama}</td><td className="font-semibold">Rombel</td><td>: {rombel?.nama}</td></tr><tr><td className="font-semibold">Wali</td><td>: {santri.namaWali || santri.namaAyah}</td><td className="font-semibold">Kamar</td><td>: {santri.kamarId ? settings.kamar.find(k=>k.id===santri.kamarId)?.nama : '-'}</td></tr></tbody></table>
                </div>
                <h4 className="font-bold text-lg border-b border-black mb-2 mt-4">A. Catatan Prestasi</h4>
                <table className="w-full border-collapse border border-black text-sm mb-6">
                    <thead className="bg-gray-200"><tr><th className="border p-2 w-10">No</th><th className="border p-2">Kegiatan/Lomba</th><th className="border p-2">Tingkat</th><th className="border p-2">Tahun</th><th className="border p-2">Ket.</th></tr></thead>
                    <tbody>{santri.prestasi && santri.prestasi.length > 0 ? santri.prestasi.map((p, i) => (<tr key={i}><td className="border p-2 text-center">{i+1}</td><td className="border p-2">{p.nama}</td><td className="border p-2">{p.tingkat}</td><td className="border p-2 text-center">{p.tahun}</td><td className="border p-2">{p.jenis}</td></tr>)) : <tr><td colSpan={5} className="border p-4 text-center italic text-gray-500">Belum ada data prestasi.</td></tr>}</tbody>
                </table>
                <h4 className="font-bold text-lg border-b border-black mb-2">B. Catatan Pelanggaran & Pembinaan</h4>
                <table className="w-full border-collapse border border-black text-sm">
                    <thead className="bg-gray-200"><tr><th className="border p-2 w-10">No</th><th className="border p-2 w-24">Tanggal</th><th className="border p-2">Jenis Pelanggaran</th><th className="border p-2">Tindak Lanjut / Sanksi</th><th className="border p-2 w-32">Paraf Pembina</th></tr></thead>
                    <tbody>{santri.pelanggaran && santri.pelanggaran.length > 0 ? santri.pelanggaran.map((p, i) => (<tr key={i}><td className="border p-2 text-center">{i+1}</td><td className="border p-2">{formatDate(p.tanggal)}</td><td className="border p-2"><div>{p.deskripsi}</div><div className="text-xs text-gray-500 italic">({p.jenis})</div></td><td className="border p-2">{p.tindakLanjut}</td><td className="border p-2"></td></tr>)) : <> {[1,2,3,4,5].map(i => <tr key={i} className="h-10"><td className="border p-2 text-center">{i}</td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>)} </>}</tbody>
                </table>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- IZIN PULANG ---
export const FormulirIzinTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const signatory = settings.tenagaPengajar.find(p => p.id === parseInt(options.izinSignatoryId));

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '11pt' }}>
            <div>
                <PrintHeader settings={settings} title="SURAT IZIN KELUAR PONDOK" />
                <div className="print-meta my-6">
                    <p>Yang bertanda tangan di bawah ini memberikan izin kepada:</p>
                    <table className="w-full my-4 ml-4">
                        <tbody>
                            <tr><td className="w-40 py-1">Nama</td><td>: <strong>{santri.namaLengkap}</strong></td></tr>
                            <tr><td className="w-40 py-1">NIS</td><td>: {santri.nis}</td></tr>
                            <tr><td className="w-40 py-1">Jenjang</td><td>: {jenjang?.nama || '-'}</td></tr>
                            <tr><td className="w-40 py-1">Kelas / Rombel</td><td>: {kelas?.nama || '-'} / {rombel?.nama || '-'}</td></tr>
                            <tr><td className="w-40 py-1">Kamar</td><td>: {santri.kamarId ? settings.kamar.find(k=>k.id===santri.kamarId)?.nama : '-'}</td></tr>
                        </tbody>
                    </table>
                    <p>Untuk keluar lingkungan pondok pesantren dengan detail sebagai berikut:</p>
                    <table className="w-full my-4 ml-4">
                        <tbody>
                            <tr><td className="w-40 py-1">Tujuan</td><td>: {options.izinTujuan}</td></tr>
                            <tr><td className="w-40 py-1">Keperluan</td><td>: {options.izinKeperluan}</td></tr>
                            <tr><td className="w-40 py-1">Waktu Berangkat</td><td>: {formatDate(options.izinTanggalBerangkat)}</td></tr>
                            <tr><td className="w-40 py-1">Waktu Kembali</td><td>: {formatDate(options.izinTanggalKembali)}</td></tr>
                            <tr><td className="w-40 py-1">Penjemput</td><td>: {options.izinPenjemput || 'Sendiri'}</td></tr>
                        </tbody>
                    </table>
                    <div className="border-2 border-gray-800 p-4 rounded-md mt-6 bg-gray-50">
                        <h4 className="font-bold underline mb-2 text-sm">KETENTUAN IZIN:</h4>
                        <div className="text-sm space-y-1 whitespace-pre-wrap">{options.izinKetentuan}</div>
                    </div>
                </div>
                <div className="flex justify-between items-end mt-16 px-8" style={{ breakInside: 'avoid' }}>
                    <div className="text-center w-48"><p>Santri Ybs,</p><div className="h-20"></div><p className="font-bold underline">{santri.namaLengkap}</p></div>
                    <div className="text-center w-48"><p>Sumpiuh, {formatDate(new Date().toISOString())}</p><p>{options.izinSignatoryTitle}</p><div className="h-20"></div><p className="font-bold underline">{signatory?.nama || '..........................'}</p></div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};
