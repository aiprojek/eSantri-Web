
import React from 'react';
import { Santri, PondokSettings, RiwayatStatus, GedungAsrama, AbsensiRecord, JurnalMengajarRecord, TahfizhRecord, KesehatanRecord, BkSession, Tagihan, TransaksiKas, Pendaftar } from '../../../types';
import { PrintHeader } from '../../common/PrintHeader';
import { ReportFooter, formatDate, formatRupiah, formatAlamat } from './Common';
import { getDefaultAcademicYear } from '../../../utils/academicYear';
import { isSantriPutra, isSantriPutri } from '../../../utils/formatters';

// --- DASHBOARD SUMMARY ---
export const DashboardSummaryTemplate: React.FC<{ santriList: Santri[], settings: PondokSettings }> = ({ santriList, settings }) => {
    const totalSantri = santriList.length;
    const activeSantri = santriList.filter(s => s.status === 'Aktif');
    const activeTotal = activeSantri.length;
    const activePutra = activeSantri.filter(s => isSantriPutra(s)).length;
    const activePutri = activeSantri.filter(s => isSantriPutri(s)).length;

    const totalPutra = santriList.filter(s => isSantriPutra(s)).length;
    const totalPutri = santriList.filter(s => isSantriPutri(s)).length;
    const statusCounts = santriList.reduce((acc, santri) => { acc[santri.status] = (acc[santri.status] || 0) + 1; return acc; }, {} as Record<Santri['status'], number>);
    
    // Calculate detailed breakdown based on active santri (with total fallback)
    const jenjangBreakdown = settings.jenjang.map(jenjang => {
        const santriInJenjang = santriList.filter(s => Number(s.jenjangId) === Number(jenjang.id));
        const activeInJenjang = santriInJenjang.filter(s => s.status === 'Aktif');
        const kelasBreakdown = settings.kelas.filter(k => Number(k.jenjangId) === Number(jenjang.id)).map(kelas => {
            const santriInKelas = santriInJenjang.filter(s => Number(s.kelasId) === Number(kelas.id));
            const activeInKelas = santriInKelas.filter(s => s.status === 'Aktif');
            const rombels = settings.rombel.filter(r => Number(r.kelasId) === Number(kelas.id)).map(rombel => {
                 const santriInRombel = santriInKelas.filter(s => Number(s.rombelId) === Number(rombel.id));
                 const activeInRombel = santriInRombel.filter(s => s.status === 'Aktif');
                 return {
                     nama: rombel.nama,
                     total: santriInRombel.length,
                     active: activeInRombel.length,
                     putra: santriInRombel.filter(s => isSantriPutra(s)).length,
                     putri: santriInRombel.filter(s => isSantriPutri(s)).length,
                     putraActive: activeInRombel.filter(s => isSantriPutra(s)).length,
                     putriActive: activeInRombel.filter(s => isSantriPutri(s)).length,
                 };
            });
            return { 
                nama: kelas.nama, 
                total: santriInKelas.length,
                active: activeInKelas.length,
                rombels
            };
        });
        return { 
            nama: jenjang.nama, 
            total: santriInJenjang.length, 
            active: activeInJenjang.length,
            putra: santriInJenjang.filter(s => isSantriPutra(s)).length,
            putri: santriInJenjang.filter(s => isSantriPutri(s)).length,
            kelasBreakdown 
        };
    });

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="Laporan Ringkas Dashboard Utama" />
                <p className="print-meta text-center text-sm mb-4">Dicetak pada: {formatDate(new Date().toISOString())}</p>
                
                <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Statistik Populasi Santri</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <table className="w-full text-sm border-collapse border border-black">
                        <thead className="bg-gray-100">
                            <tr>
                                <th colSpan={2} className="p-2 border border-black text-left font-bold text-teal-800">Santri Aktif (Operasional)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td className="p-2 border border-black">Total Santri Aktif</td><td className="p-2 border border-black text-right font-bold text-teal-700">{activeTotal}</td></tr>
                            <tr><td className="p-2 border border-black">Santri Putra (Aktif)</td><td className="p-2 border border-black text-right font-semibold">{activePutra}</td></tr>
                            <tr><td className="p-2 border border-black">Santri Putri (Aktif)</td><td className="p-2 border border-black text-right font-semibold">{activePutri}</td></tr>
                        </tbody>
                    </table>

                    <table className="w-full text-sm border-collapse border border-black">
                        <thead className="bg-gray-100">
                            <tr>
                                <th colSpan={2} className="p-2 border border-black text-left font-bold">Total Terdaftar (Historis)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td className="p-2 border border-black">Total Database Santri</td><td className="p-2 border border-black text-right font-bold">{totalSantri}</td></tr>
                            <tr><td className="p-2 border border-black">Total Putra Historis</td><td className="p-2 border border-black text-right">{totalPutra}</td></tr>
                            <tr><td className="p-2 border border-black">Total Putri Historis</td><td className="p-2 border border-black text-right">{totalPutri}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6" style={{ breakInside: 'avoid' }}>
                    <div>
                        <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Komposisi Status</h4>
                        <table className="w-full text-sm border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-gray-50 text-xs">
                                    <th className="p-1.5 border border-gray-300 text-left">Status</th>
                                    <th className="p-1.5 border border-gray-300 text-right">Jumlah</th>
                                    <th className="p-1.5 border border-gray-300 text-right">Persentase</th>
                                </tr>
                            </thead>
                            <tbody>{(['Aktif', 'Hiatus', 'Lulus', 'Keluar/Pindah'] as Santri['status'][]).map(s => {
                                const count = statusCounts[s] || 0;
                                const pct = totalSantri > 0 ? ((count / totalSantri) * 100).toFixed(1) : '0';
                                return (
                                    <tr key={s}>
                                        <td className="p-1.5 border border-gray-300 font-medium">{s}</td>
                                        <td className="p-1.5 border border-gray-300 text-right font-semibold">{count}</td>
                                        <td className="p-1.5 border border-gray-300 text-right text-gray-600">{pct}%</td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Struktur Lembaga</h4>
                        <table className="w-full text-sm border-collapse border border-gray-300">
                            <tbody>
                                <tr><td className="p-1.5 border border-gray-300 font-medium">Jumlah Jenjang Pendidikan</td><td className="p-1.5 border border-gray-300 text-right font-semibold">{settings.jenjang.length}</td></tr>
                                <tr><td className="p-1.5 border border-gray-300 font-medium">Jumlah Tingkat Kelas</td><td className="p-1.5 border border-gray-300 text-right font-semibold">{settings.kelas.length}</td></tr>
                                <tr><td className="p-1.5 border border-gray-300 font-medium">Jumlah Rombel Belajar</td><td className="p-1.5 border border-gray-300 text-right font-semibold">{settings.rombel.length}</td></tr>
                                <tr><td className="p-1.5 border border-gray-300 font-medium">Gedung Asrama</td><td className="p-1.5 border border-gray-300 text-right font-semibold">{settings.gedungAsrama?.length || 0}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Detail Distribusi Santri per Rombel</h4>
                <table className="w-full text-xs border-collapse border border-black">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border border-black text-left">Jenjang</th>
                            <th className="p-2 border border-black text-left">Kelas</th>
                            <th className="p-2 border border-black text-left">Rombel</th>
                            <th className="p-2 border border-black text-right">Santri Aktif</th>
                            <th className="p-2 border border-black text-right">Putra</th>
                            <th className="p-2 border border-black text-right">Putri</th>
                            <th className="p-2 border border-black text-right">Total Historis</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jenjangBreakdown.flatMap((j) => {
                            if (j.kelasBreakdown.length === 0) {
                                return (
                                    <tr key={`jenjang-${j.nama}`}>
                                        <td className="p-2 border border-black font-semibold">{j.nama}</td>
                                        <td className="p-2 border border-black italic text-gray-500" colSpan={2}>Belum ada data kelas/rombel</td>
                                        <td className="p-2 border border-black text-right font-semibold text-teal-700">{j.active}</td>
                                        <td className="p-2 border border-black text-right">{j.putra}</td>
                                        <td className="p-2 border border-black text-right">{j.putri}</td>
                                        <td className="p-2 border border-black text-right text-gray-500">{j.total}</td>
                                    </tr>
                                );
                            }

                            return j.kelasBreakdown.flatMap((k) => {
                                if (k.rombels.length === 0) {
                                    return (
                                        <tr key={`kelas-${j.nama}-${k.nama}`}>
                                            <td className="p-2 border border-black font-semibold">{j.nama}</td>
                                            <td className="p-2 border border-black">{k.nama}</td>
                                            <td className="p-2 border border-black italic text-gray-500">Belum ada rombel</td>
                                            <td className="p-2 border border-black text-right font-semibold text-teal-700">{k.active}</td>
                                            <td className="p-2 border border-black text-right">-</td>
                                            <td className="p-2 border border-black text-right">-</td>
                                            <td className="p-2 border border-black text-right text-gray-500">{k.total}</td>
                                        </tr>
                                    );
                                }

                                return k.rombels.map((r) => (
                                    <tr key={`rombel-${j.nama}-${k.nama}-${r.nama}`}>
                                        <td className="p-2 border border-black font-semibold">{j.nama}</td>
                                        <td className="p-2 border border-black">{k.nama}</td>
                                        <td className="p-2 border border-black">{r.nama}</td>
                                        <td className="p-2 border border-black text-right font-bold text-teal-700">{r.active}</td>
                                        <td className="p-2 border border-black text-right">{r.putraActive}</td>
                                        <td className="p-2 border border-black text-right">{r.putriActive}</td>
                                        <td className="p-2 border border-black text-right text-gray-500">{r.total}</td>
                                    </tr>
                                ));
                            });
                        })}
                    </tbody>
                </table>
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
        const mapelCount = new Set(jurnal.map(j => j.mataPelajaranId).filter((id): id is number => typeof id === 'number')).size;
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
        const ujian = rec.filter(t => t.tipe === 'Ujian Hafalan').length;
        const murojaah = rec.filter(t => t.tipe === 'Murojaah').length;
        const tasmi = rec.filter(t => t.tipe === "Tasmi'").length;
        const lancar = rec.filter(t => t.predikat === 'Sangat Lancar' || t.predikat === 'Lancar').length;
        const persen = rec.length > 0 ? Math.round((lancar / rec.length) * 100) : 0;
        return { santri: s, total: rec.length, ziyadah, murojaah, tasmi, ujian, persen };
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
                            <th className="p-2 border border-black text-center">Ujian</th>
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
                                <td className="p-2 border border-black text-center">{row.ujian}</td>
                                <td className="p-2 border border-black text-center font-semibold">{row.persen}%</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={9} className="p-4 border border-black text-center italic text-gray-500">Belum ada data tahfizh pada filter ini.</td>
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

// --- SURAT KETERANGAN SANTRI AKTIF ---
export const SuratKeteranganAktifTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const gedung = santri.gedungId ? settings.gedungAsrama.find(g => g.id === santri.gedungId) : undefined;
    const kamar = santri.kamarId ? settings.kamar.find(k => k.id === santri.kamarId) : undefined;
    const signatory = settings.tenagaPengajar.find(p => p.id === parseInt(options.suratAktifSignatoryId));

    const tanggalSurat = options.suratAktifTanggal ? new Date(options.suratAktifTanggal) : new Date();
    const tahunSurat = tanggalSurat.getFullYear();
    const bulanRomawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][tanggalSurat.getMonth()];
    
    const defaultNoSurat = `421.1/PP.${(settings.namaPonpes || 'MAHAD').slice(0, 4).toUpperCase().replace(/\s+/g, '')}/TU/${bulanRomawi}/${tahunSurat}`;
    const displayNoSurat = options.suratAktifNoSurat?.trim() || defaultNoSurat;

    const signatoryTitle = options.suratAktifSignatoryTitle || 'Kepala Madrasah / Mudir';
    const signatoryName = signatory ? signatory.nama : (settings.namaMudir || '__________________________');

    return (
        <div className="font-serif text-black flex flex-col h-full justify-between leading-relaxed" style={{ fontSize: '10.5pt' }}>
            <div>
                {/* Official Letterhead Header */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                    <div className="w-20 h-20 flex items-center justify-center">
                        {settings.logoYayasanUrl ? (
                            <img src={settings.logoYayasanUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        ) : settings.logoPonpesUrl ? (
                            <img src={settings.logoPonpesUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center text-xl font-bold font-sans">PP</div>
                        )}
                    </div>
                    <div className="text-center flex-1 px-4">
                        <div className="text-xs uppercase tracking-wider font-sans font-semibold text-gray-700">Pondok Pesantren / Yayasan</div>
                        <h2 className="text-xl font-bold uppercase tracking-wide">{settings.namaPonpes}</h2>
                        <p className="text-xs font-sans mt-0.5">{settings.alamat}</p>
                        <p className="text-xs font-sans text-gray-700">
                            {settings.telepon && `Telp: ${settings.telepon}`}
                            {settings.telepon && settings.website && ' | '}
                            {settings.website && `Website: ${settings.website}`}
                            {settings.email && ` | Email: ${settings.email}`}
                        </p>
                    </div>
                    <div className="w-20 h-20 flex items-center justify-center">
                        {settings.logoPonpesUrl && settings.logoYayasanUrl ? (
                            <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-20"></div>
                        )}
                    </div>
                </div>
                <div className="border-t border-black mt-0.5 mb-6"></div>

                {/* Document Title & Number */}
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold uppercase tracking-wider underline underline-offset-4">
                        SURAT KETERANGAN SANTRI AKTIF
                    </h3>
                    <p className="text-sm font-sans mt-1">
                        Nomor: <span className="font-mono">{displayNoSurat}</span>
                    </p>
                </div>

                {/* Opening Clause */}
                <div className="space-y-4">
                    <p className="text-justify indent-8">
                        Yang bertanda tangan di bawah ini, <strong>{signatoryTitle}</strong> {settings.namaPonpes}, menerangkan dengan sebenarnya bahwa:
                    </p>

                    {/* Santri Data Identity Table */}
                    <div className="pl-6 pr-2">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr>
                                    <td className="w-48 py-1 align-top font-medium">Nama Lengkap</td>
                                    <td className="w-4 py-1 align-top">:</td>
                                    <td className="py-1 align-top font-bold uppercase tracking-wide">{santri.namaLengkap}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Nomor Induk Santri (NIS)</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top font-mono">{santri.nis}</td>
                                </tr>
                                {santri.nisn && (
                                    <tr>
                                        <td className="py-1 align-top font-medium">NISN</td>
                                        <td className="py-1 align-top">:</td>
                                        <td className="py-1 align-top font-mono">{santri.nisn}</td>
                                    </tr>
                                )}
                                {santri.nik && (
                                    <tr>
                                        <td className="py-1 align-top font-medium">NIK</td>
                                        <td className="py-1 align-top">:</td>
                                        <td className="py-1 align-top font-mono">{santri.nik}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="py-1 align-top font-medium">Tempat, Tanggal Lahir</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{santri.tempatLahir}, {formatDate(santri.tanggalLahir)}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Jenis Kelamin</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{santri.jenisKelamin || 'Laki-laki'}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Tingkat / Kelas / Rombel</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{jenjang?.nama ? `${jenjang.nama} - ` : ''}{kelas?.nama || '-'} ({rombel?.nama || '-'})</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Gedung / Asrama</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{gedung?.nama || 'Asrama Pondok'}{kamar?.nama ? ` / Kamar: ${kamar.nama}` : ''}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Nama Orang Tua / Wali</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{santri.namaAyah || santri.namaWali || santri.namaIbu || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Alamat Orang Tua</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{formatAlamat(santri) || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Active Confirmation Clause */}
                    <p className="text-justify indent-8 leading-relaxed">
                        Adalah benar yang bersangkutan merupakan <strong>santri aktif</strong> yang terdaftar dan bermukim di asrama pondok pesantren <strong>{settings.namaPonpes}</strong> pada <strong>Tahun Ajaran {options.tahunAjaran || 'berjalan'}</strong>.
                    </p>

                    {/* Purpose Clause */}
                    <p className="text-justify indent-8 leading-relaxed">
                        Surat keterangan ini diterbitkan atas permohonan yang bersangkutan sebagai kelengkapan dokumen administrasi untuk keperluan:
                    </p>
                    <div className="mx-6 p-3 bg-gray-50 border border-gray-300 rounded font-sans text-sm font-semibold text-center">
                        "{options.suratAktifKeperluan || 'Pengajuan Tunjangan Gaji Orang Tua (PNS/TNI/POLRI/BUMN)'}"
                    </div>

                    {/* Closing Clause */}
                    <p className="text-justify indent-8 leading-relaxed">
                        Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya oleh pihak yang berkepentingan.
                    </p>
                </div>

                {/* Signatory Section */}
                <div className="flex justify-between items-end mt-12 px-6" style={{ breakInside: 'avoid' }}>
                    <div className="text-center w-52">
                        <div className="border border-dashed border-gray-400 w-24 h-32 mx-auto flex items-center justify-center text-xs text-gray-400 font-sans">
                            Foto Santri<br/>3 x 4 cm
                        </div>
                    </div>
                    <div className="text-center w-64">
                        <p className="font-sans text-xs">
                            {settings.kabupatenKota || 'Ditetapkan di Pesantren'}, {formatDate(options.suratAktifTanggal || new Date().toISOString())}
                        </p>
                        <p className="font-bold text-sm mt-1">{signatoryTitle},</p>
                        <div className="h-20 flex items-center justify-center">
                            <span className="text-[10px] text-gray-400 font-sans italic">[Tanda Tangan & Cap Lembaga]</span>
                        </div>
                        <p className="font-bold underline uppercase text-sm">{signatoryName}</p>
                        {signatory?.nip && <p className="font-mono text-xs text-gray-700">NIP/NIY: {signatory.nip}</p>}
                    </div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- SURAT KETERANGAN BERKELAKUAN BAIK (SYAHADAH HUSNUS SULUK) ---
export const SuratBerkelakuanBaikTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const signatory = settings.tenagaPengajar.find(p => p.id === parseInt(options.suratBaikSignatoryId));

    const tanggalSurat = options.suratBaikTanggal ? new Date(options.suratBaikTanggal) : new Date();
    const tahunSurat = tanggalSurat.getFullYear();
    const bulanRomawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][tanggalSurat.getMonth()];
    
    const defaultNoSurat = `421.2/PP.${(settings.namaPonpes || 'MAHAD').slice(0, 4).toUpperCase().replace(/\s+/g, '')}/BK/${bulanRomawi}/${tahunSurat}`;
    const displayNoSurat = options.suratBaikNoSurat?.trim() || defaultNoSurat;

    const signatoryTitle = options.suratBaikSignatoryTitle || 'Kepala Bagian Pengasuhan / Mudir';
    const signatoryName = signatory ? signatory.nama : (settings.namaMudir || '__________________________');

    return (
        <div className="font-serif text-black flex flex-col h-full justify-between leading-relaxed" style={{ fontSize: '10.5pt' }}>
            <div>
                {/* Official Letterhead Header */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                    <div className="w-20 h-20 flex items-center justify-center">
                        {settings.logoYayasanUrl ? (
                            <img src={settings.logoYayasanUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        ) : settings.logoPonpesUrl ? (
                            <img src={settings.logoPonpesUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center text-xl font-bold font-sans">PP</div>
                        )}
                    </div>
                    <div className="text-center flex-1 px-4">
                        <div className="text-xs uppercase tracking-wider font-sans font-semibold text-gray-700">Pondok Pesantren / Yayasan</div>
                        <h2 className="text-xl font-bold uppercase tracking-wide">{settings.namaPonpes}</h2>
                        <p className="text-xs font-sans mt-0.5">{settings.alamat}</p>
                        <p className="text-xs font-sans text-gray-700">
                            {settings.telepon && `Telp: ${settings.telepon}`}
                            {settings.telepon && settings.website && ' | '}
                            {settings.website && `Website: ${settings.website}`}
                            {settings.email && ` | Email: ${settings.email}`}
                        </p>
                    </div>
                    <div className="w-20 h-20 flex items-center justify-center">
                        {settings.logoPonpesUrl && settings.logoYayasanUrl ? (
                            <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-20"></div>
                        )}
                    </div>
                </div>
                <div className="border-t border-black mt-0.5 mb-6"></div>

                {/* Document Title & Number */}
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold uppercase tracking-wider underline underline-offset-4">
                        SURAT KETERANGAN BERKELAKUAN BAIK
                    </h3>
                    <div className="text-base font-medium mt-0.5 text-gray-800">
                        (شَهَادَةُ حُسْنِ السِّيْرَةِ وَالسُّلُوْكِ)
                    </div>
                    <p className="text-sm font-sans mt-1">
                        Nomor: <span className="font-mono">{displayNoSurat}</span>
                    </p>
                </div>

                {/* Opening Clause */}
                <div className="space-y-4">
                    <p className="text-justify indent-8">
                        Yang bertanda tangan di bawah ini, <strong>{signatoryTitle}</strong> {settings.namaPonpes}, setelah meneliti dan memeriksa buku catatan kedisiplinan dan pembinaan santri, dengan ini menerangkan bahwa:
                    </p>

                    {/* Identity Table */}
                    <div className="pl-6 pr-2">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr>
                                    <td className="w-48 py-1 align-top font-medium">Nama Lengkap</td>
                                    <td className="w-4 py-1 align-top">:</td>
                                    <td className="py-1 align-top font-bold uppercase tracking-wide">{santri.namaLengkap}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Nomor Induk Santri (NIS)</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top font-mono">{santri.nis}</td>
                                </tr>
                                {santri.nik && (
                                    <tr>
                                        <td className="py-1 align-top font-medium">NIK</td>
                                        <td className="py-1 align-top">:</td>
                                        <td className="py-1 align-top font-mono">{santri.nik}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="py-1 align-top font-medium">Tempat, Tanggal Lahir</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{santri.tempatLahir}, {formatDate(santri.tanggalLahir)}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Jenis Kelamin</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{santri.jenisKelamin || 'Laki-laki'}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Kelas / Rombel Terakhir</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{jenjang?.nama ? `${jenjang.nama} - ` : ''}{kelas?.nama || '-'} ({rombel?.nama || '-'})</td>
                                </tr>
                                <tr>
                                    <td className="py-1 align-top font-medium">Alamat Asal</td>
                                    <td className="py-1 align-top">:</td>
                                    <td className="py-1 align-top">{formatAlamat(santri) || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Conduct Points */}
                    <p className="text-justify indent-8 leading-relaxed">
                        Menerangkan bahwa santri tersebut di atas selama menempuh pendidikan dan tinggal di lingkungan Pondok Pesantren <strong>{settings.namaPonpes}</strong>:
                    </p>

                    <div className="pl-6 pr-2 space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                            <span className="font-bold font-sans">1.</span>
                            <p className="text-justify">
                                Senantiasa <strong>berkelakuan baik</strong>, santun, menjaga akhlakul karimah (<em>husnus suluk</em>), serta mematuhi seluruh tata tertib dan syariat yang berlaku di pesantren.
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-bold font-sans">2.</span>
                            <p className="text-justify">
                                <strong>Tidak pernah terlibat</strong> dalam tindakan kriminal, penyalahgunaan narkotika/miras, perkelahian/tawuran, asusila, maupun pelanggaran berat lainnya.
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-bold font-sans">3.</span>
                            <p className="text-justify">
                                Istiqomah dalam menjalankan ibadah shalat berjamaah, ta'lim, pengajian, dan kegiatan ubudiyah pesantren lainnya.
                            </p>
                        </div>
                    </div>

                    {/* Purpose Clause */}
                    <p className="text-justify indent-8 leading-relaxed">
                        Surat keterangan ini diberikan atas permohonan santri/wali santri untuk dipergunakan sebagai:
                    </p>
                    <div className="mx-6 p-2.5 bg-gray-50 border border-gray-300 rounded font-sans text-sm font-semibold text-center">
                        "{options.suratBaikKeperluan || 'Kelengkapan Pendaftaran Masuk Perguruan Tinggi / Beasiswa'}"
                    </div>

                    {/* Closing Clause */}
                    <p className="text-justify indent-8 leading-relaxed">
                        Demikian surat keterangan ini kami berikan dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.
                    </p>
                </div>

                {/* Signatory Section */}
                <div className="flex justify-between items-end mt-10 px-6" style={{ breakInside: 'avoid' }}>
                    <div className="text-center w-52">
                        <div className="border border-dashed border-gray-400 w-24 h-32 mx-auto flex items-center justify-center text-xs text-gray-400 font-sans">
                            Foto Santri<br/>3 x 4 cm
                        </div>
                    </div>
                    <div className="text-center w-64">
                        <p className="font-sans text-xs">
                            {settings.kabupatenKota || 'Ditetapkan di Pesantren'}, {formatDate(options.suratBaikTanggal || new Date().toISOString())}
                        </p>
                        <p className="font-bold text-sm mt-1">{signatoryTitle},</p>
                        <div className="h-20 flex items-center justify-center">
                            <span className="text-[10px] text-gray-400 font-sans italic">[Tanda Tangan & Cap Lembaga]</span>
                        </div>
                        <p className="font-bold underline uppercase text-sm">{signatoryName}</p>
                        {signatory?.nip && <p className="font-mono text-xs text-gray-700">NIP/NIY: {signatory.nip}</p>}
                    </div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- SYAHADAH / PIAGAM KELULUSAN TAHFIZH RESMI ---
export const SyahadahTahfizhTemplate: React.FC<{
    santri: Santri;
    settings: PondokSettings;
    options: any;
}> = ({ santri, settings, options }) => {
    const theme = options?.syahadahTheme || 'emerald';
    
    // Theme palette mappings
    const themeConfig = {
        emerald: {
            outerBorder: 'border-emerald-800',
            innerBorder: 'border-amber-600',
            bgTint: 'bg-gradient-to-br from-emerald-50/40 via-amber-50/20 to-white',
            accentText: 'text-emerald-800',
            badgeBg: 'bg-emerald-900 text-amber-300 border-amber-500',
            arabicColor: 'text-emerald-950',
            sealBorder: 'border-amber-600 text-amber-700 bg-amber-50',
        },
        gold: {
            outerBorder: 'border-amber-700',
            innerBorder: 'border-amber-500',
            bgTint: 'bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-white',
            accentText: 'text-amber-800',
            badgeBg: 'bg-amber-900 text-yellow-200 border-amber-400',
            arabicColor: 'text-amber-950',
            sealBorder: 'border-amber-600 text-amber-800 bg-amber-50',
        },
        royal_blue: {
            outerBorder: 'border-blue-900',
            innerBorder: 'border-amber-600',
            bgTint: 'bg-gradient-to-br from-blue-50/40 via-sky-50/20 to-white',
            accentText: 'text-blue-900',
            badgeBg: 'bg-blue-950 text-amber-300 border-amber-500',
            arabicColor: 'text-blue-950',
            sealBorder: 'border-blue-700 text-blue-800 bg-blue-50',
        },
        monochrome: {
            outerBorder: 'border-gray-900',
            innerBorder: 'border-gray-600',
            bgTint: 'bg-white',
            accentText: 'text-black',
            badgeBg: 'bg-black text-white border-gray-600',
            arabicColor: 'text-black',
            sealBorder: 'border-black text-black bg-gray-50',
        }
    }[theme as 'emerald' | 'gold' | 'royal_blue' | 'monochrome'] || {
        outerBorder: 'border-emerald-800',
        innerBorder: 'border-amber-600',
        bgTint: 'bg-gradient-to-br from-emerald-50/40 via-amber-50/20 to-white',
        accentText: 'text-emerald-800',
        badgeBg: 'bg-emerald-900 text-amber-300 border-amber-500',
        arabicColor: 'text-emerald-950',
        sealBorder: 'border-amber-600 text-amber-700 bg-amber-50',
    };

    const tingkatJuz = options?.syahadahTingkatJuz || options?.syahadahJenis || '30 Juz (Khatam Bil-Ghaib)';
    const predikat = options?.syahadahPredikat || 'Mumtaz (Sangat Baik Sekali)';
    const rasm = options?.syahadahRasm || "Riwayat Hafsh 'an 'Ashim Thariq Asy-Syathibiyyah";
    const nomorSurat = options?.syahadahNomorSurat || options?.syahadahNomor || `SYH/${new Date().getFullYear()}/${santri.nis}`;
    const tanggalMasehi = options?.syahadahTanggalMasehi ? formatDate(options.syahadahTanggalMasehi) : (options?.syahadahTanggal ? formatDate(options.syahadahTanggal) : formatDate(new Date().toISOString()));
    const tanggalHijriyah = options?.syahadahTanggalHijriyah || options?.syahadahManualHijri || '15 Sya\'ban 1446 H';

    const sig1 = settings.tenagaPengajar.find(p => p.id === parseInt(options?.syahadahSignatory1Id));
    const sig2 = settings.tenagaPengajar.find(p => p.id === parseInt(options?.syahadahSignatory2Id));
    const title1 = options?.syahadahSignatory1Title || options?.syahadahRoleBottom || 'Musyrif / Penguji Tahfizh';
    const title2 = options?.syahadahSignatory2Title || 'Pengasuh Pondok Pesantren';
    const name1 = sig1 ? sig1.nama : (options?.syahadahMuhaffizhName || '__________________________');

    return (
        <div className={`font-serif text-black h-full flex flex-col justify-between p-6 ${themeConfig.bgTint} select-none relative box-border`} style={{ minHeight: '100%' }}>
            {/* Ornate Double Border */}
            <div className={`absolute inset-3 border-4 ${themeConfig.outerBorder} pointer-events-none rounded-sm`}></div>
            <div className={`absolute inset-4 border ${themeConfig.innerBorder} pointer-events-none rounded-sm`}></div>
            <div className={`absolute inset-5 border-2 border-dashed ${themeConfig.innerBorder} opacity-40 pointer-events-none`}></div>

            {/* Corner Ornaments */}
            <div className={`absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 ${themeConfig.outerBorder} pointer-events-none`}></div>
            <div className={`absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 ${themeConfig.outerBorder} pointer-events-none`}></div>
            <div className={`absolute bottom-5 left-5 w-8 h-8 border-b-2 border-l-2 ${themeConfig.outerBorder} pointer-events-none`}></div>
            <div className={`absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 ${themeConfig.outerBorder} pointer-events-none`}></div>

            {/* Inner Content */}
            <div className="relative z-10 px-8 py-2 flex flex-col h-full justify-between">
                <div>
                    {/* Header Syahadah */}
                    <div className="text-center pt-2">
                        {/* Bismillah Calligraphy */}
                        <div className={`text-2xl font-bold font-arabic mb-1 tracking-widest ${themeConfig.arabicColor}`}>
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </div>

                        <div className="flex items-center justify-center gap-4 my-1">
                            {settings.logoYayasanUrl ? (
                                <img src={settings.logoYayasanUrl} alt="Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                            ) : settings.logoPonpesUrl ? (
                                <img src={settings.logoPonpesUrl} alt="Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                            ) : null}
                            <div>
                                <h3 className="text-xs font-sans uppercase font-bold tracking-widest text-gray-600">
                                    Lembaga Tahfizh & Pengajian Al-Qur'an
                                </h3>
                                <h2 className="text-base font-sans uppercase font-extrabold tracking-wider text-gray-900">
                                    {settings.namaPonpes}
                                </h2>
                            </div>
                        </div>

                        {/* Title Plaque */}
                        <div className="mt-2 mb-1">
                            <h1 className={`text-2xl font-extrabold uppercase tracking-widest font-sans ${themeConfig.accentText}`}>
                                SYAHADAH TAHFIZH AL-QUR'AN
                            </h1>
                            <div className="text-sm font-arabic font-semibold text-gray-700">
                                شَهَادَةُ حِفْظِ الْقُرْآنِ الْكَرِيمِ
                            </div>
                            <div className="text-[9pt] font-sans font-mono text-gray-600 mt-0.5">
                                Nomor: {nomorSurat}
                            </div>
                        </div>
                    </div>

                    {/* Body Narrative */}
                    <div className="text-center mt-3 space-y-2">
                        <p className="text-xs font-sans italic text-gray-700">
                            Dewan Asatidz & Penguji Tahfizh Al-Qur'an menerangkan dengan sesungguhnya bahwa:
                        </p>

                        {/* Santri Name Hero */}
                        <div className="py-1 border-b-2 border-t-2 border-amber-600/30 inline-block px-12 my-1">
                            <h2 className="text-xl font-bold uppercase tracking-wider text-gray-950 font-sans">
                                {santri.namaLengkap}
                            </h2>
                            <div className="flex justify-center gap-6 text-[8.5pt] font-sans text-gray-600 mt-0.5">
                                <span>NIS: <strong className="font-mono">{santri.nis}</strong></span>
                                {santri.nisn && <span>NISN: <strong className="font-mono">{santri.nisn}</strong></span>}
                                <span>Tempat & Tgl Lahir: <strong>{santri.tempatLahir}, {formatDate(santri.tanggalLahir)}</strong></span>
                            </div>
                        </div>

                        <p className="text-xs font-sans text-gray-800 leading-relaxed max-w-2xl mx-auto">
                            Telah berhasil menyelesaikan tasmi' ujian hafalan Al-Qur'anul Karim dan dinyatakan lulus dalam kategori:
                        </p>

                        {/* Category & Grade Plaque */}
                        <div className="flex justify-center items-center gap-4 my-2">
                            <div className={`px-6 py-1.5 rounded-full border shadow-sm font-sans font-extrabold text-sm uppercase tracking-wide ${themeConfig.badgeBg}`}>
                                ✦ {tingkatJuz} ✦
                            </div>
                            <div className="px-4 py-1 rounded border border-gray-400 bg-white/90 text-xs font-sans font-bold text-gray-800 shadow-sm">
                                Predikat: <span className={themeConfig.accentText}>{predikat}</span>
                            </div>
                        </div>

                        <div className="text-[8.5pt] font-sans text-gray-600">
                            Riwayat / Thariq: <strong className="text-gray-900">{rasm}</strong>
                        </div>

                        {options?.syahadahKeteranganTambahan && (
                            <p className="text-[8pt] font-sans italic text-gray-500 max-w-xl mx-auto">
                                "{options.syahadahKeteranganTambahan}"
                            </p>
                        )}

                        {/* Quranic Verse / Quote */}
                        <div className="pt-2 text-center">
                            <p className="text-xs font-arabic text-emerald-950 font-bold">
                                « خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ »
                            </p>
                            <p className="text-[7.5pt] font-sans italic text-gray-500">
                                "Sebaik-baik kalian adalah orang yang belajar Al-Qur'an dan mengajarkannya." (HR. Al-Bukhari)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Signatures & Seal Section */}
                <div className="mt-4 pt-2 flex justify-between items-end px-6 font-sans" style={{ breakInside: 'avoid' }}>
                    {/* Signatory 1 */}
                    <div className="text-center w-56">
                        <p className="text-[8.5pt] text-gray-600">Penguji / Musyrif,</p>
                        <p className="font-bold text-xs mt-0.5">{title1}</p>
                        <div className="h-16 flex items-center justify-center">
                            <span className="text-[8pt] text-gray-400 italic">[Tanda Tangan]</span>
                        </div>
                        <p className="font-bold underline text-xs">{name1}</p>
                        {sig1?.nip && <p className="font-mono text-[7pt] text-gray-600">NIP/NIY: {sig1.nip}</p>}
                    </div>

                    {/* Official Seal Emblem */}
                    <div className="flex flex-col items-center justify-center">
                        <div className={`w-20 h-20 rounded-full border-2 border-dashed flex flex-col items-center justify-center shadow-inner ${themeConfig.sealBorder}`}>
                            <span className="text-[7pt] font-bold uppercase tracking-widest text-center">CAP RESMI</span>
                            <span className="text-[6pt] text-center font-serif">PESANTREN</span>
                        </div>
                        <div className="text-[7pt] text-gray-500 font-mono mt-1">
                            {settings.kabupatenKota || 'Pusat'}
                        </div>
                    </div>

                    {/* Signatory 2 */}
                    <div className="text-center w-56">
                        <p className="text-[8.5pt] text-gray-600">
                            {tanggalHijriyah} / {tanggalMasehi}
                        </p>
                        <p className="font-bold text-xs mt-0.5">{title2}</p>
                        <div className="h-16 flex items-center justify-center">
                            <span className="text-[8pt] text-gray-400 italic">[Tanda Tangan & Stempel]</span>
                        </div>
                        <p className="font-bold underline text-xs">{sig2 ? sig2.nama : (settings.namaMudir || '__________________________')}</p>
                        {sig2?.nip && <p className="font-mono text-[7pt] text-gray-600">NIP/NIY: {sig2.nip}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const generateSyahadahReports = (data: Santri[], settings: PondokSettings, options: any) => {
    return data.map(santri => ({
        content: <SyahadahTahfizhTemplate santri={santri} settings={settings} options={options} />,
        orientation: 'landscape' as const
    }));
};
