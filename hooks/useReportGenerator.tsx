import React, { useMemo } from 'react';
import { Santri, PondokSettings, RiwayatStatus, MataPelajaran, ReportType, Tagihan, Pembayaran, GedungAsrama, TransaksiKas, TransaksiSaldo, Alamat } from '../types';
import { PrintHeader } from '../components/common/PrintHeader';

// --- Utility Functions ---

const lightenColor = (hex: string, percent: number): string => {
    if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        return '#ffffff';
    }
    let hexVal = hex.substring(1);
    if (hexVal.length === 3) {
        hexVal = hexVal.split('').map(char => char + char).join('');
    }
    const r = parseInt(hexVal.substring(0, 2), 16);
    const g = parseInt(hexVal.substring(2, 4), 16);
    const b = parseInt(hexVal.substring(4, 6), 16);
    const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
};

const formatDateTime = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
}

const toHijri = (date: Date): string => {
    try {
        return new Intl.DateTimeFormat('id-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch (e) {
        console.error("Hijri conversion with 'id' locale failed, falling back.", e);
        return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    }
};

const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

// --- Template Components ---

const PanduanPenilaianTemplate: React.FC = () => {
    return (
        <div className="font-sans text-black" style={{ fontSize: '10pt' }}>
            <h3 className="font-bold text-xl mb-6 text-center">Panduan Penilaian</h3>
            
            <div className="space-y-4 text-justify">
                <div>
                    <h4 className="font-bold text-base mb-2">A. Deskripsi Kolom Penilaian</h4>
                    <ul className="list-disc list-outside pl-5 space-y-1 text-sm">
                        <li><strong className="font-semibold">TP (Tujuan Pembelajaran):</strong> Nilai sumatif lingkup materi untuk mengukur ketercapaian satu atau lebih tujuan pembelajaran.</li>
                        <li><strong className="font-semibold">Rerata TP:</strong> Nilai rata-rata dari seluruh nilai TP.</li>
                        <li><strong className="font-semibold">SM (Sumatif Lingkup Materi):</strong> Nilai sumatif untuk lingkup materi yang lebih luas, mencakup beberapa TP.</li>
                        <li><strong className="font-semibold">Rerata SM:</strong> Nilai rata-rata dari seluruh nilai SM.</li>
                        <li><strong className="font-semibold">STS (Sumatif Tengah Semester):</strong> Penilaian sumatif yang dilaksanakan pada pertengahan semester.</li>
                        <li><strong className="font-semibold">SAS (Sumatif Akhir Semester):</strong> Penilaian sumatif yang dilaksanakan pada akhir semester untuk mengukur capaian santri.</li>
                        <li><strong className="font-semibold">NA (Nilai Akhir):</strong> Nilai rapor yang diolah dari semua bentuk penilaian sumatif.</li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-base mb-2">B. Contoh Pengolahan Nilai Akhir Rapor</h4>
                    <p className="text-sm mb-2">
                        Pengolahan nilai rapor dapat dilakukan dengan berbagai cara, salah satunya adalah menggunakan rata-rata dari semua nilai sumatif yang diperoleh santri. Lembaga pendidikan memiliki keleluasaan untuk menentukan pembobotan jika diperlukan.
                    </p>
                    <div className="pl-5 space-y-3 text-sm">
                        <div>
                            <p className="font-semibold">Contoh 1: Rata-rata Sederhana</p>
                            <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 inline-block">NA = Rata-rata( Rerata TP, Rerata SM, STS, SAS )</p>
                        </div>
                        <div>
                            <p className="font-semibold">Contoh 2: Dengan Pembobotan (Kebijakan Lembaga Pendidikan)</p>
                            <p className="mt-1">Misal: Bobot TP=2, Bobot SM=1, Bobot STS=1, Bobot SAS=2</p>
                            <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 inline-block">NA = ( (2 * Rerata TP) + Rerata SM + STS + (2 * SAS) ) / 6</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-base mb-2">C. Skala Penilaian (Contoh)</h4>
                     <table className="text-sm">
                        <tbody>
                            <tr><td className="font-semibold pr-4">A (Sangat Baik)</td><td className="pr-2">:</td><td>90 - 100</td></tr>
                            <tr><td className="font-semibold pr-4">B (Baik)</td><td className="pr-2">:</td><td>80 - 89</td></tr>
                            <tr><td className="font-semibold pr-4">C (Cukup)</td><td className="pr-2">:</td><td>70 - 79</td></tr>
                            <tr><td className="font-semibold pr-4">D (Kurang)</td><td className="pr-2">:</td><td>&lt; 70</td></tr>
                        </tbody>
                    </table>
                    <p className="text-xs italic mt-2">(Rentang nilai dapat disesuaikan dengan kebijakan lembaga pendidikan).</p>
                </div>
            </div>
        </div>
    );
};

const LaporanArusKasTemplate: React.FC<{
    settings: PondokSettings;
    options: {
        filteredKas: TransaksiKas[];
        allKas: TransaksiKas[];
        kasStartDate: string;
        kasEndDate: string;
    }
}> = ({ settings, options }) => {
    const { filteredKas, allKas, kasStartDate, kasEndDate } = options;
    const startDate = new Date(kasStartDate);
    
    // Find the last transaction before the start date to get the opening balance
    const lastTxBeforePeriod = allKas
        .filter(t => new Date(t.tanggal) < startDate)
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())[0];
        
    const saldoAwal = lastTxBeforePeriod ? lastTxBeforePeriod.saldoSetelah : 0;
    const saldoAkhir = filteredKas.length > 0 ? filteredKas[0].saldoSetelah : saldoAwal;
    
    const totalPemasukan = filteredKas.filter(t => t.jenis === 'Pemasukan').reduce((sum, t) => sum + t.jumlah, 0);
    const totalPengeluaran = filteredKas.filter(t => t.jenis === 'Pengeluaran').reduce((sum, t) => sum + t.jumlah, 0);

    return (
        <div className="font-sans text-black" style={{ fontSize: '10pt' }}>
            <PrintHeader settings={settings} title="Laporan Arus Kas Umum" />
            <p className="text-center text-sm mb-4">Periode: {formatDate(kasStartDate)} s.d. {formatDate(kasEndDate)}</p>

            <table className="w-full text-sm my-4">
                <tbody>
                    <tr className="border-b"><td className="py-1 font-medium">Saldo Awal</td><td className="py-1 text-right font-semibold">{formatRupiah(saldoAwal)}</td></tr>
                    <tr className="border-b text-green-700"><td className="py-1 font-medium">Total Pemasukan</td><td className="py-1 text-right font-semibold">{formatRupiah(totalPemasukan)}</td></tr>
                    <tr className="border-b text-red-700"><td className="py-1 font-medium">Total Pengeluaran</td><td className="py-1 text-right font-semibold">{formatRupiah(totalPengeluaran)}</td></tr>
                    <tr className="border-t-2 border-black"><td className="py-1 font-bold">Saldo Akhir</td><td className="py-1 text-right font-bold">{formatRupiah(saldoAkhir)}</td></tr>
                </tbody>
            </table>
            
            <table className="w-full text-left border-collapse border border-black text-xs mt-6">
                <thead className="bg-gray-200 uppercase">
                    <tr>
                        <th className="p-1 border border-black w-8">No</th>
                        <th className="p-1 border border-black">Tanggal</th>
                        <th className="p-1 border border-black">Kategori</th>
                        <th className="p-1 border border-black">Deskripsi</th>
                        <th className="p-1 border border-black text-right">Pemasukan</th>
                        <th className="p-1 border border-black text-right">Pengeluaran</th>
                        <th className="p-1 border border-black text-right">Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredKas.length > 0 ? (
                        [...filteredKas].reverse().map((t, index) => (
                            <tr key={t.id}>
                                <td className="p-1 border border-black text-center">{index + 1}</td>
                                <td className="p-1 border border-black">{formatDateTime(t.tanggal)}</td>
                                <td className="p-1 border border-black">{t.kategori}</td>
                                <td className="p-1 border border-black">{t.deskripsi}</td>
                                <td className="p-1 border border-black text-right text-green-700">{t.jenis === 'Pemasukan' ? formatRupiah(t.jumlah) : '-'}</td>
                                <td className="p-1 border border-black text-right text-red-700">{t.jenis === 'Pengeluaran' ? formatRupiah(t.jumlah) : '-'}</td>
                                <td className="p-1 border border-black text-right font-semibold">{formatRupiah(t.saldoSetelah)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={7} className="text-center p-4 italic text-gray-500">Tidak ada transaksi pada periode ini.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const RekeningKoranSantriTemplate: React.FC<{
    santri: Santri;
    settings: PondokSettings;
    options: {
        tagihanList: Tagihan[];
        pembayaranList: Pembayaran[];
        transaksiSaldoList: TransaksiSaldo[];
        rekeningKoranStartDate: string;
        rekeningKoranEndDate: string;
    }
}> = ({ santri, settings, options }) => {
    const { tagihanList, pembayaranList, transaksiSaldoList, rekeningKoranStartDate, rekeningKoranEndDate } = options;

    type CombinedTx = {
        tanggal: Date;
        deskripsi: string;
        debit: number;
        kredit: number;
    };

    const startDate = new Date(rekeningKoranStartDate);
    const endDate = new Date(rekeningKoranEndDate + 'T23:59:59');

    // 1. Combine all transactions for this santri
    const allTx: CombinedTx[] = [];
    tagihanList.filter(t => t.santriId === santri.id).forEach(t => allTx.push({ tanggal: new Date(t.tahun, t.bulan - 1), deskripsi: `Tagihan: ${t.deskripsi}`, debit: t.nominal, kredit: 0 }));
    pembayaranList.filter(p => p.santriId === santri.id).forEach(p => allTx.push({ tanggal: new Date(p.tanggal), deskripsi: `Pembayaran Tagihan`, debit: 0, kredit: p.jumlah }));
    transaksiSaldoList.filter(t => t.santriId === santri.id).forEach(t => {
        if (t.jenis === 'Deposit') {
            allTx.push({ tanggal: new Date(t.tanggal), deskripsi: `Uang Saku: ${t.keterangan || 'Deposit'}`, debit: 0, kredit: t.jumlah });
        } else {
            allTx.push({ tanggal: new Date(t.tanggal), deskripsi: `Uang Saku: ${t.keterangan || 'Penarikan'}`, debit: t.jumlah, kredit: 0 });
        }
    });

    // 2. Calculate opening balance (saldo awal)
    const saldoAwal = allTx.filter(tx => tx.tanggal < startDate).reduce((saldo, tx) => saldo + tx.kredit - tx.debit, 0);
    
    // 3. Filter transactions for the period and sort
    const periodTx = allTx.filter(tx => tx.tanggal >= startDate && tx.tanggal <= endDate).sort((a,b) => a.tanggal.getTime() - b.tanggal.getTime());

    let saldoBerjalan = saldoAwal;
    const transactionsWithRunningBalance = periodTx.map(tx => {
        saldoBerjalan = saldoBerjalan + tx.kredit - tx.debit;
        return { ...tx, saldo: saldoBerjalan };
    });

    const saldoAkhir = saldoBerjalan;
    
    return (
        <div className="font-sans text-black" style={{ fontSize: '10pt' }}>
            <PrintHeader settings={settings} title="Rekening Koran Santri" />
            
            <table className="w-full text-sm my-4">
                <tbody>
                    <tr><td className="pr-4 font-medium">Nama Santri</td><td>: {santri.namaLengkap}</td></tr>
                    <tr><td className="pr-4 font-medium">NIS</td><td>: {santri.nis}</td></tr>
                    <tr><td className="pr-4 font-medium">Periode</td><td>: {formatDate(rekeningKoranStartDate)} s.d. {formatDate(rekeningKoranEndDate)}</td></tr>
                </tbody>
            </table>

            <table className="w-full text-left border-collapse border border-black text-xs mt-6">
                <thead className="bg-gray-200 uppercase">
                    <tr>
                        <th className="p-1 border border-black">Tanggal</th>
                        <th className="p-1 border border-black">Deskripsi</th>
                        <th className="p-1 border border-black text-right">Debit</th>
                        <th className="p-1 border border-black text-right">Kredit</th>
                        <th className="p-1 border border-black text-right">Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colSpan={4} className="p-1 border border-black font-semibold">Saldo Awal</td>
                        <td className="p-1 border border-black text-right font-semibold">{formatRupiah(saldoAwal)}</td>
                    </tr>
                    {transactionsWithRunningBalance.map((tx, index) => (
                        <tr key={index}>
                            <td className="p-1 border border-black">{formatDateTime(tx.tanggal)}</td>
                            <td className="p-1 border border-black">{tx.deskripsi}</td>
                            <td className="p-1 border border-black text-right text-red-700">{tx.debit > 0 ? formatRupiah(tx.debit) : '-'}</td>
                            <td className="p-1 border border-black text-right text-green-700">{tx.kredit > 0 ? formatRupiah(tx.kredit) : '-'}</td>
                            <td className="p-1 border border-black text-right font-semibold">{formatRupiah(tx.saldo)}</td>
                        </tr>
                    ))}
                     {transactionsWithRunningBalance.length === 0 && (
                        <tr><td colSpan={5} className="text-center p-4 italic text-gray-500">Tidak ada transaksi pada periode ini.</td></tr>
                    )}
                </tbody>
                 <tfoot>
                    <tr className="bg-gray-200">
                        <td colSpan={4} className="p-1 border border-black font-bold text-right">SALDO AKHIR</td>
                        <td className="p-1 border border-black text-right font-bold">{formatRupiah(saldoAkhir)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

const LaporanAsramaTemplate: React.FC<{
    settings: PondokSettings;
    santriList: Santri[];
    gedungList: GedungAsrama[];
}> = ({ settings, santriList, gedungList }) => {
    const { kamar, tenagaPengajar } = settings;

    const penghuniPerKamar = useMemo(() => {
        const map = new Map<number, Santri[]>();
        santriList.forEach(s => {
            if (s.kamarId && s.status === 'Aktif') {
                if (!map.has(s.kamarId)) map.set(s.kamarId, []);
                map.get(s.kamarId)!.push(s);
            }
        });
        return map;
    }, [santriList]);

    return (
        <div className="font-sans text-black" style={{ fontSize: '10pt' }}>
            <PrintHeader settings={settings} title="Laporan Rekapitulasi Keasramaan" />
            <p className="text-center text-sm mb-4">Dicetak pada: {formatDate(new Date().toISOString())}</p>

            <div className="space-y-6">
                {gedungList.map(gedung => {
                    const kamarDiGedung = kamar.filter(k => k.gedungId === gedung.id);
                    return (
                        <div key={gedung.id} style={{ breakInside: 'avoid' }}>
                            <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">
                                {gedung.nama} ({gedung.jenis})
                            </h4>
                            {kamarDiGedung.length > 0 ? (
                                <div className="space-y-4">
                                    {kamarDiGedung.map(k => {
                                        const penghuni = penghuniPerKamar.get(k.id) || [];
                                        const musyrif = tenagaPengajar.find(tp => tp.id === k.musyrifId);
                                        return (
                                            <div key={k.id} className="pl-4 border-l-2 border-gray-300" style={{ breakInside: 'avoid' }}>
                                                <table className="w-full text-sm mb-2">
                                                    <tbody>
                                                        <tr className="bg-gray-100">
                                                            <td className="p-2 font-semibold" colSpan={2}>{k.nama}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="p-2 w-1/3">Kapasitas</td>
                                                            <td className="p-2 font-medium">{penghuni.length} / {k.kapasitas}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="p-2 w-1/3">Musyrif/ah</td>
                                                            <td className="p-2 font-medium">{musyrif?.nama || '-'}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                                <p className="font-semibold text-sm mb-1">Daftar Penghuni:</p>
                                                {penghuni.length > 0 ? (
                                                    <table className="w-full text-left border-collapse border border-black text-xs">
                                                        <thead className="bg-gray-200">
                                                            <tr>
                                                                <th className="p-1 border border-black w-8">No</th>
                                                                <th className="p-1 border border-black">NIS</th>
                                                                <th className="p-1 border border-black">Nama Lengkap</th>
                                                                <th className="p-1 border border-black">Rombel</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {penghuni.map((santri, index) => {
                                                                const rombel = settings.rombel.find(r => r.id === santri.rombelId);
                                                                return (
                                                                    <tr key={santri.id}>
                                                                        <td className="p-1 border border-black text-center">{index + 1}</td>
                                                                        <td className="p-1 border border-black">{santri.nis}</td>
                                                                        <td className="p-1 border border-black">{santri.namaLengkap}</td>
                                                                        <td className="p-1 border border-black">{rombel?.nama || 'N/A'}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <p className="text-xs italic text-gray-500">Kamar kosong.</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="pl-4 text-sm italic text-gray-500">Tidak ada kamar di gedung ini.</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const DashboardSummaryTemplate: React.FC<{ santriList: Santri[], settings: PondokSettings }> = ({ santriList, settings }) => {
    const data = useMemo(() => {
        const totalSantri = santriList.length;
        const totalPutra = santriList.filter(s => s.jenisKelamin === 'Laki-laki').length;
        const totalPutri = totalSantri - totalPutra;

        const statusCounts = santriList.reduce((acc, santri) => {
            acc[santri.status] = (acc[santri.status] || 0) + 1;
            return acc;
        }, {} as Record<Santri['status'], number>);
        
        const santriByJenjang = settings.jenjang.map(jenjang => {
            const santriInJenjang = santriList.filter(s => s.jenjangId === jenjang.id);
            const total = santriInJenjang.length;
            const putra = santriInJenjang.filter(s => s.jenisKelamin === 'Laki-laki').length;
            const putri = total - putra;
            
            const kelasInJenjang = settings.kelas.filter(k => k.jenjangId === jenjang.id);
            const kelasBreakdown = kelasInJenjang.map(kelas => {
                const santriInKelas = santriInJenjang.filter(s => s.kelasId === kelas.id);
                const totalKelas = santriInKelas.length;
                const putraKelas = santriInKelas.filter(s => s.jenisKelamin === 'Laki-laki').length;
                const putriKelas = totalKelas - putraKelas;
                return { id: kelas.id, nama: kelas.nama, total: totalKelas, putra: putraKelas, putri: putriKelas, };
            });

            return { id: jenjang.id, nama: jenjang.nama, total, putra, putri, kelasBreakdown };
        });

        return { totalSantri, totalPutra, totalPutri, statusCounts, santriByJenjang };
    }, [santriList, settings]);

    return (
        <div className="font-sans text-black" style={{ fontSize: '10pt' }}>
            <PrintHeader settings={settings} title="Laporan Ringkas Dashboard Utama" />
            <p className="text-center text-sm mb-4">Dicetak pada: {formatDate(new Date().toISOString())}</p>

            <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Statistik Utama</h4>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
                <div className="p-2 border border-black rounded"><div className="text-xs text-gray-700">Total Santri</div><div className="text-2xl font-bold">{data.totalSantri}</div></div>
                <div className="p-2 border border-black rounded"><div className="text-xs text-gray-700">Santri Putra</div><div className="text-2xl font-bold">{data.totalPutra}</div></div>
                <div className="p-2 border border-black rounded"><div className="text-xs text-gray-700">Santri Putri</div><div className="text-2xl font-bold">{data.totalPutri}</div></div>
            </div>

            <div className="grid grid-cols-2 gap-6" style={{ breakInside: 'avoid' }}>
                <div>
                    <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Komposisi Status</h4>
                    <table className="w-full text-sm">
                        <tbody>
                            {(['Aktif', 'Hiatus', 'Lulus', 'Keluar/Pindah'] as Santri['status'][]).map(status => {
                                const count = data.statusCounts[status] || 0;
                                const percentage = data.totalSantri > 0 ? (count / data.totalSantri) * 100 : 0;
                                return (<tr key={status}>
                                    <td className="py-1 font-medium">{status}</td>
                                    <td className="py-1 text-right">{count} santri</td>
                                    <td className="py-1 text-right w-24">({percentage.toFixed(1)}%)</td>
                                </tr>);
                            })}
                        </tbody>
                    </table>
                </div>
                <div>
                    <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Struktur Pendidikan</h4>
                     <table className="w-full text-sm">
                        <tbody>
                            <tr><td className="py-1 font-medium">Jumlah Jenjang</td><td className="py-1 text-right">{settings.jenjang.length}</td></tr>
                            <tr><td className="py-1 font-medium">Jumlah Rombel</td><td className="py-1 text-right">{settings.rombel.length}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6" style={{ breakInside: 'avoid' }}>
                <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Distribusi Santri per Jenjang</h4>
                <div className="space-y-4">
                    {data.santriByJenjang.map(item => (
                        <div key={item.id} className="border border-black p-3 rounded">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-base font-medium text-gray-800">{item.nama}</span>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                        <span>{item.putra} Putra</span><span>{item.putri} Putri</span>
                                    </div>
                                </div>
                                <span className="text-lg font-semibold text-gray-900">{item.total} <span className="text-sm font-normal">Santri</span></span>
                            </div>
                             <div className="pl-4 border-l-2 border-gray-300 space-y-2 text-sm">
                                {item.kelasBreakdown.filter(k => k.total > 0).map(kelas => (
                                    <div key={kelas.id}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-700">{kelas.nama} ({kelas.total} santri)</span>
                                            <span className="text-gray-600">{kelas.putra} Putra, {kelas.putri} Putri</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const FinanceSummaryTemplate: React.FC<{ santriList: Santri[], tagihanList: Tagihan[], pembayaranList: Pembayaran[], settings: PondokSettings }> = ({ santriList, tagihanList, pembayaranList, settings }) => {
    const data = useMemo(() => {
        const now = new Date(); const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
        const totalTunggakan = tagihanList.filter(t => t.status === 'Belum Lunas').reduce((sum, t) => sum + t.nominal, 0);
        const penerimaanBulanIni = pembayaranList.filter(p => { const d = new Date(p.tanggal); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((sum, p) => sum + p.jumlah, 0);
        const penerimaanTahunIni = pembayaranList.filter(p => new Date(p.tanggal).getFullYear() === currentYear).reduce((sum, p) => sum + p.jumlah, 0);
        const santriMenunggakIds = new Set(tagihanList.filter(t => t.status === 'Belum Lunas' && santriList.find(s=>s.id === t.santriId && s.status === 'Aktif')).map(t => t.santriId));
        const jumlahSantriMenunggak = santriMenunggakIds.size;
        
        const totalTagihanValue = tagihanList.reduce((sum, t) => sum + t.nominal, 0);
        const totalLunasValue = tagihanList.filter(t => t.status === 'Lunas').reduce((sum, t) => sum + t.nominal, 0);

        return { totalTunggakan, penerimaanBulanIni, penerimaanTahunIni, jumlahSantriMenunggak, totalTagihanValue, totalLunasValue };
    }, [santriList, tagihanList, pembayaranList]);

    return (
         <div className="font-sans text-black" style={{ fontSize: '10pt' }}>
            <PrintHeader settings={settings} title="Laporan Ringkas Keuangan" />
            <p className="text-center text-sm mb-4">Dicetak pada: {formatDate(new Date().toISOString())}</p>
            
            <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Statistik Keuangan Utama</h4>
            <table className="w-full text-sm my-4">
                <tbody>
                    <tr className="border-b"><td className="py-2 font-medium">Total Tunggakan</td><td className="py-2 text-right font-bold text-lg">{formatRupiah(data.totalTunggakan)}</td></tr>
                    <tr className="border-b"><td className="py-2 font-medium">Penerimaan Bulan Ini</td><td className="py-2 text-right font-bold text-lg">{formatRupiah(data.penerimaanBulanIni)}</td></tr>
                    <tr className="border-b"><td className="py-2 font-medium">Total Penerimaan Tahun Ini</td><td className="py-2 text-right font-bold text-lg">{formatRupiah(data.penerimaanTahunIni)}</td></tr>
                    <tr className="border-b"><td className="py-2 font-medium">Jumlah Santri Aktif Menunggak</td><td className="py-2 text-right font-bold text-lg">{data.jumlahSantriMenunggak} Santri</td></tr>
                </tbody>
            </table>

             <div className="mt-6" style={{ breakInside: 'avoid' }}>
                <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Komposisi Seluruh Tagihan</h4>
                <table className="w-full text-sm">
                    <tbody>
                        <tr>
                            <td className="py-1 font-medium">Lunas</td>
                            <td className="py-1 text-right">{formatRupiah(data.totalLunasValue)}</td>
                            <td className="py-1 text-right w-24">({(data.totalTagihanValue > 0 ? (data.totalLunasValue / data.totalTagihanValue) * 100 : 0).toFixed(1)}%)</td>
                        </tr>
                        <tr>
                            <td className="py-1 font-medium">Belum Lunas</td>
                            <td className="py-1 text-right">{formatRupiah(data.totalTunggakan)}</td>
                            <td className="py-1 text-right w-24">({(data.totalTagihanValue > 0 ? (data.totalTunggakan / data.totalTagihanValue) * 100 : 0).toFixed(1)}%)</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black">
                            <td className="pt-2 font-bold">Total Keseluruhan Tagihan</td>
                            <td className="pt-2 text-right font-bold">{formatRupiah(data.totalTagihanValue)}</td>
                            <td className="pt-2 text-right w-24"></td>
                        </tr>
                    </tfoot>
                </table>
             </div>
        </div>
    );
};

const LaporanMutasiTemplate: React.FC<{ 
  mutasiEvents: { santri: Santri; mutasi: RiwayatStatus }[]; 
  settings: PondokSettings; 
  startDate: string; 
  endDate: string;
}> = ({ mutasiEvents, settings, startDate, endDate }) => {
    return (
        <div className="text-black" style={{ fontSize: '10pt' }}>
            <PrintHeader settings={settings} title="LAPORAN MUTASI SANTRI" />
            <div className="text-sm font-semibold mb-4">
              <span>Periode: {formatDate(startDate)} s.d. {formatDate(endDate)}</span>
            </div>
            <table className="w-full text-left border-collapse border border-black">
                <thead className="text-xs uppercase bg-gray-200 text-center">
                    <tr>
                        <th className="px-2 py-2 border border-black">No</th>
                        <th className="px-2 py-2 border border-black">Tanggal</th>
                        <th className="px-2 py-2 border border-black">NIS</th>
                        <th className="px-2 py-2 border border-black text-left" style={{minWidth: '150px'}}>Nama Lengkap</th>
                        <th className="px-2 py-2 border border-black text-left">Jenjang Pendidikan</th>
                        <th className="px-2 py-2 border border-black">Status Baru</th>
                        <th className="px-2 py-2 border border-black text-left" style={{minWidth: '200px'}}>Keterangan</th>
                    </tr>
                </thead>
                <tbody style={{ fontSize: '9pt' }}>
                    {mutasiEvents.map(({ santri, mutasi }, i) => {
                        const jenjang = settings.jenjang.find(j => j.id === santri.jenjangId);
                        return (
                        <tr key={`${santri.id}-${mutasi.id}`}>
                            <td className="px-2 py-2 border border-black text-center" style={{ fontSize: '9pt' }}>{i + 1}</td>
                            <td className="px-2 py-2 border border-black whitespace-nowrap" style={{ fontSize: '9pt' }}>{formatDate(mutasi.tanggal)}</td>
                            <td className="px-2 py-2 border border-black" style={{ fontSize: '9pt' }}>{santri.nis}</td>
                            <td className="px-2 py-2 border border-black" style={{ fontSize: '9pt' }}>{santri.namaLengkap}</td>
                            <td className="px-2 py-2 border border-black" style={{ fontSize: '9pt' }}>{jenjang?.nama || 'N/A'}</td>
                            <td className="px-2 py-2 border border-black text-center" style={{ fontSize: '9pt' }}>{mutasi.status}</td>
                            <td className="px-2 py-2 border border-black" style={{ fontSize: '9pt' }}>{mutasi.keterangan}</td>
                        </tr>
                        )
                    })}
                    {mutasiEvents.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-center py-4 border border-black italic text-gray-500">Tidak ada data mutasi pada rentang tanggal yang dipilih.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const BiodataItem: React.FC<{ number?: string; label: string; value?: string | number | null; sub?: boolean; }> = ({ number, label, value, sub }) => {
    const isHeaderField = !Object.prototype.hasOwnProperty.call({number, label, value, sub}, 'value');
    const hasValue = value !== null && value !== undefined && value !== '';
    return (
      <tr>
        <td className={`align-top py-1 ${sub ? 'pl-8' : 'w-8 pr-2'}`}>{number}</td>
        <td className="align-top py-1 pr-2">{label}</td>
        <td className="align-top py-1 px-2 w-4">{isHeaderField ? '' : ':'}</td>
        <td className="align-top py-1 font-semibold">{isHeaderField ? '' : (hasValue ? value : '-')}</td>
      </tr>
    );
};
  
const BiodataSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <tbody style={{ breakInside: 'avoid' }} className={className}>
        <tr><th colSpan={4} className="font-bold text-md pt-6 pb-2 text-left">{title}</th></tr>
        {children}
    </tbody>
);

const BiodataTemplate: React.FC<{ santri: Santri; settings: PondokSettings; useHijriDate: boolean; hijriDateMode: string; manualHijriDate: string; }> = ({ santri, settings, useHijriDate, hijriDateMode, manualHijriDate }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const mudir = jenjang?.mudirId ? settings.tenagaPengajar.find(p => p.id === jenjang.mudirId) : undefined;

    const gregorianDateString = formatDate(new Date().toISOString());
    let hijriDateString = '';
    if (useHijriDate) {
        hijriDateString = hijriDateMode === 'auto' ? toHijri(new Date()) : manualHijriDate;
    }

    return (
      <div className="font-serif text-black" style={{ fontSize: '12pt', lineHeight: '1.5' }}>
        <PrintHeader settings={settings} title={`BIODATA SANTRI ${jenjang?.nama?.toUpperCase()} ${kelas?.nama?.toUpperCase()} ROMBEL ${rombel?.nama?.toUpperCase()}`} />
        <table className="w-full">
            <BiodataSection title="A. KETERANGAN PRIBADI SANTRI">
                <BiodataItem number="1." label="Nama Lengkap" value={santri.namaLengkap} />
                <BiodataItem number="2." label="Nama Panggilan (Hijrah)" value={santri.namaHijrah} />
                <BiodataItem number="3." label="Nomor Induk" /><BiodataItem label="a. NIS" value={santri.nis} sub /><BiodataItem label="b. NIK" value={santri.nik} sub /><BiodataItem label="c. NISN" value={santri.nisn} sub />
                <BiodataItem number="4." label="Jenis Kelamin" value={santri.jenisKelamin} /><BiodataItem number="5." label="Tempat, Tanggal Lahir" value={`${santri.tempatLahir}, ${formatDate(santri.tanggalLahir)}`} />
                <BiodataItem number="6." label="Kewarganegaraan" value={santri.kewarganegaraan} /><BiodataItem number="7." label="Jenis Santri" value={santri.jenisSantri} /><BiodataItem number="8." label="Berkebutuhan Khusus" value={santri.berkebutuhanKhusus} />
                <BiodataItem number="9." label="Anak Ke" value={santri.anakKe} /><BiodataItem number="10." label="Jumlah Saudara" value={santri.jumlahSaudara} /><BiodataItem number="11." label="Status Keluarga" value={santri.statusKeluarga} />
                <BiodataItem number="12." label="Alamat Santri" value={santri.alamat.detail} /><BiodataItem number="13." label="Diterima di Ponpes ini" /><BiodataItem label="a. Di Jenjang" value={jenjang?.nama} sub /><BiodataItem label="b. Di Rombel" value={rombel?.nama} sub /><BiodataItem label="c. Pada Tanggal" value={formatDate(santri.tanggalMasuk)} sub />
                <BiodataItem number="14." label="Sekolah Asal" /><BiodataItem label="a. Nama Sekolah" value={santri.sekolahAsal} sub /><BiodataItem label="b. Alamat Sekolah" value={santri.alamatSekolahAsal} sub />
            </BiodataSection>
            <BiodataSection title="B. KETERANGAN ORANG TUA KANDUNG">
                <BiodataItem number="15." label="Nama Ayah" value={santri.namaAyah} /><BiodataItem number="16." label="Tempat, Tanggal Lahir Ayah" value={santri.tempatLahirAyah ? `${santri.tempatLahirAyah}, ${formatDate(santri.tanggalLahirAyah)}` : formatDate(santri.tanggalLahirAyah)} />
                <BiodataItem number="17." label="Pendidikan Terakhir Ayah" value={santri.pendidikanAyah} /><BiodataItem number="18." label="Pekerjaan Ayah" value={santri.pekerjaanAyah} /><BiodataItem number="19." label="Penghasilan Ayah" value={santri.penghasilanAyah} /><BiodataItem number="20." label="No. Telepon Ayah" value={santri.teleponAyah} />
                <BiodataItem number="21." label="Nama Ibu" value={santri.namaIbu} /><BiodataItem number="22." label="Tempat, Tanggal Lahir Ibu" value={santri.tempatLahirIbu ? `${santri.tempatLahirIbu}, ${formatDate(santri.tanggalLahirIbu)}` : formatDate(santri.tanggalLahirIbu)} />
                <BiodataItem number="23." label="Pendidikan Terakhir Ibu" value={santri.pendidikanIbu} /><BiodataItem number="24." label="Pekerjaan Ibu" value={santri.pekerjaanIbu} /><BiodataItem number="25." label="Penghasilan Ibu" value={santri.penghasilanIbu} /><BiodataItem number="26." label="No. Telepon Ibu" value={santri.teleponIbu} />
                <BiodataItem number="27." label="Alamat Orang Tua" value={santri.alamatAyah?.detail || santri.alamatIbu?.detail} />
            </BiodataSection>
            {santri.namaWali && (
              <BiodataSection title="C. KETERANGAN WALI">
                <BiodataItem number="28." label="Nama Wali" value={santri.namaWali} /><BiodataItem number="29." label="Hubungan dengan Santri" value={santri.statusWali} /><BiodataItem number="30." label="Pekerjaan Wali" value={santri.pekerjaanWali} /><BiodataItem number="31." label="Penghasilan Wali" value={santri.penghasilanWali} /><BiodataItem number="32." label="No. Telepon Wali" value={santri.teleponWali} /><BiodataItem number="33." label="Alamat Wali" value={santri.alamatWali?.detail} />
              </BiodataSection>
            )}
        </table>
        <div className="mt-16 flow-root" style={{ breakInside: 'avoid' }}>
          <div className="float-right w-72 text-center">
            <p>Sumpiuh, {gregorianDateString}</p>
            {hijriDateString && <p className="text-sm">{hijriDateString}</p>}
            <p className="mt-4">Mudir Marhalah,</p><div className="h-20"></div><p className="font-bold underline">{mudir ? mudir.nama : '_____________________'}</p>
          </div>
        </div>
      </div>
    );
};

const LembarKedatanganTemplate: React.FC<{ 
  santriList: Santri[]; 
  settings: PondokSettings; 
  options: { 
    jenjangNama: string; 
    kelasNama: string; 
    rombelNama: string; 
    agendaKedatangan: string; 
  } 
}> = ({ santriList, settings, options }) => {
    return (
        <div className="text-black" style={{ fontSize: '10pt' }}>
            <PrintHeader settings={settings} title={`LEMBAR KEDATANGAN SANTRI ${options.jenjangNama.toUpperCase()} ${options.kelasNama.toUpperCase()} ROMBEL ${options.rombelNama.toUpperCase()}`} />
            <div className="text-sm font-semibold mb-4">
              <span>Agenda: {options.agendaKedatangan || '........................................................'}</span>
            </div>
            <table className="w-full text-left border-collapse border border-black">
                <thead className="text-xs uppercase bg-gray-200 text-center">
                    <tr>
                        <th rowSpan={2} className="px-2 py-2 border border-black align-middle">No</th>
                        <th rowSpan={2} className="px-2 py-2 border border-black align-middle">NIS</th>
                        <th rowSpan={2} className="px-2 py-2 border border-black align-middle" style={{minWidth: '200px'}}>Nama Lengkap</th>
                        <th colSpan={2} className="px-2 py-2 border border-black">Waktu Kedatangan</th>
                        <th rowSpan={2} className="px-2 py-2 border border-black align-middle">Paraf</th>
                    </tr>
                    <tr>
                        <th className="px-2 py-2 border border-black font-medium" style={{minWidth: '150px'}}>Hari, Tanggal</th>
                        <th className="px-2 py-2 border border-black font-medium" style={{minWidth: '100px'}}>Pukul</th>
                    </tr>
                </thead>
                <tbody>
                    {santriList.map((s, i) => (
                        <tr key={s.id}>
                            <td className="px-2 py-2 border border-black text-center">{i + 1}</td>
                            <td className="px-2 py-2 border border-black">{s.nis}</td>
                            <td className="px-2 py-2 border border-black">{s.namaLengkap}</td>
                            <td className="px-2 py-2 border border-black h-8"></td>
                            <td className="px-2 py-2 border border-black h-8"></td>
                            <td className="px-2 py-2 border border-black h-8"></td>
                        </tr>
                    ))}
                    {santriList.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-4 border border-black">Tidak ada santri aktif di rombel ini.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const LembarRaporTemplate: React.FC<{ 
  santriList: Santri[]; 
  settings: PondokSettings; 
  options: { 
    jenjangNama: string; 
    kelasNama: string; 
    rombelNama: string; 
    semester: string;
    tahunAjaran: string;
  } 
}> = ({ santriList, settings, options }) => {
    const rombel = settings.rombel.find(r => r.nama === options.rombelNama);
    const waliKelas = rombel?.waliKelasId ? settings.tenagaPengajar.find(p => p.id === rombel.waliKelasId) : null;
    return (
        <div className="text-black" style={{ fontSize: '10pt' }}>
            <PrintHeader settings={settings} title={`LEMBAR PENGAMBILAN DAN PENGUMPULAN RAPOR`} />
            <div className="text-sm font-semibold mb-4 grid grid-cols-2">
              <span>Rombel: {options.rombelNama}</span>
              <span className="text-right">Semester: {options.semester}</span>
              <span>Tahun Ajaran: {options.tahunAjaran || '...................................'}</span>
              <span className="text-right">Wali Kelas: {waliKelas?.nama || '...................................'}</span>
            </div>
            <table className="w-full text-left border-collapse border border-black">
                <thead className="text-xs uppercase bg-gray-200 text-center">
                    <tr>
                        <th rowSpan={2} className="p-2 border border-black">No</th>
                        <th rowSpan={2} className="p-2 border border-black">NIS</th>
                        <th rowSpan={2} className="p-2 border border-black">Nama Lengkap</th>
                        <th colSpan={2} className="p-2 border border-black">Pengambilan</th>
                        <th colSpan={2} className="p-2 border border-black">Pengumpulan</th>
                    </tr>
                    <tr>
                        <th className="p-2 border border-black font-medium">Tanggal</th>
                        <th className="p-2 border border-black font-medium">Tanda Tangan</th>
                        <th className="p-2 border border-black font-medium">Tanggal</th>
                        <th className="p-2 border border-black font-medium">Tanda Tangan</th>
                    </tr>
                </thead>
                <tbody>
                    {santriList.map((s, i) => (
                        <tr key={s.id}>
                            <td className="p-2 border border-black text-center">{i + 1}</td>
                            <td className="p-2 border border-black">{s.nis}</td>
                            <td className="p-2 border border-black">{s.namaLengkap}</td>
                            <td className="p-2 border border-black h-12"></td>
                            <td className="p-2 border border-black"></td>
                            <td className="p-2 border border-black"></td>
                            <td className="p-2 border border-black"></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const KartuSantriTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const { cardTheme, cardValidUntil, cardFields, cardSignatoryTitle, cardSignatoryId } = options;
    const signatory = settings.tenagaPengajar.find(p => p.id === parseInt(cardSignatoryId));
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;

    const bgColor = cardTheme;
    const lighterBgColor = lightenColor(bgColor, 80);

    return (
        <div className="rounded-lg overflow-hidden border border-gray-300 flex flex-col" style={{ width: '8.56cm', height: '5.398cm', backgroundColor: lighterBgColor }}>
            {/* Header Section */}
            <div style={{ backgroundColor: bgColor }} className="h-12 flex items-center justify-between p-2 text-white flex-shrink-0">
                <div className="w-10 h-full flex items-center justify-center">
                    {settings.logoYayasanUrl && (
                        <img src={settings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-8 max-w-full object-contain" />
                    )}
                </div>
                <div className="text-center flex-grow px-1">
                    {settings.namaYayasan && <p className="text-[7pt] leading-tight opacity-80">{settings.namaYayasan}</p> }
                    <p className="font-bold text-xs leading-tight">{settings.namaPonpes}</p>
                    <p className="text-[7pt] font-semibold leading-tight mt-1">KARTU TANDA SANTRI</p>
                </div>
                <div className="w-10 h-full flex items-center justify-center">
                    {settings.logoPonpesUrl && (
                        <img src={settings.logoPonpesUrl} alt="Logo Pondok" className="max-h-8 max-w-full object-contain" />
                    )}
                </div>
            </div>
            
            {/* Main Content Section */}
            <div className="p-2 flex gap-2 flex-grow min-h-0">
                {cardFields.includes('foto') && (
                    <div className="flex-shrink-0" style={{ width: '2.2cm' }}>
                        <div className="w-full aspect-[3/4] bg-gray-200 border-2 border-white shadow-md">
                             <img src={santri.fotoUrl || 'https://placehold.co/150x200/e2e8f0/334155?text=Foto'} alt="Foto Santri" className="w-full h-full object-cover" />
                        </div>
                    </div>
                )}
                <div className="flex-grow flex flex-col justify-center" style={{ fontSize: '7pt', lineHeight: '1.4' }}>
                    {cardFields.includes('namaLengkap') && <p className="font-bold text-sm truncate" style={{ fontSize: '9pt' }}>{santri.namaLengkap}</p>}
                    {cardFields.includes('nis') && <p>NIS: {santri.nis}</p>}
                    {cardFields.includes('jenjang') && <p>Jenjang: {jenjang?.nama || 'N/A'}</p>}
                    {cardFields.includes('rombel') && <p>Rombel: {rombel?.nama || 'N/A'}</p>}
                    {cardFields.includes('ttl') && <p>TTL: {santri.tempatLahir}, {formatDate(santri.tanggalLahir)}</p>}
                    {cardFields.includes('ayahWali') && <p>Wali: {santri.namaWali || santri.namaAyah}</p>}
                </div>
            </div>

            {/* Footer Section */}
             <div className="px-2 pb-1 flex justify-between items-end flex-shrink-0" style={{ fontSize: '6pt' }}>
                <div>
                    <p>Berlaku s/d:</p>
                    <p className="font-semibold">{formatDate(cardValidUntil)}</p>
                </div>
                <div className="text-center">
                    <p>{cardSignatoryTitle}</p>
                    <div className="h-6"></div> 
                    <p className="font-bold underline">{signatory ? signatory.nama : '(.....................)'}</p>
                </div>
            </div>
        </div>
    );
};

const LembarPembinaanTemplate: React.FC<{ santri: Santri; settings: PondokSettings; }> = ({ santri, settings }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    return (
        <div className="font-sans text-black" style={{ fontSize: '10pt' }}>
            <PrintHeader settings={settings} title="LEMBAR PEMBINAAN SANTRI" />
            <table className="w-full text-sm my-4">
                <tbody>
                    <tr><td className="pr-4 font-medium w-32">Nama Santri</td><td>: {santri.namaLengkap}</td></tr>
                    <tr><td className="pr-4 font-medium">NIS</td><td>: {santri.nis}</td></tr>
                    <tr><td className="pr-4 font-medium">Rombel</td><td>: {rombel?.nama || 'N/A'}</td></tr>
                </tbody>
            </table>

            <h4 className="font-bold text-base mt-6 mb-2">Catatan Prestasi</h4>
            <table className="w-full text-left border-collapse border border-black text-xs">
                <thead className="bg-gray-200 uppercase">
                    <tr>
                        <th className="p-1 border border-black w-8">No</th>
                        <th className="p-1 border border-black">Tahun</th>
                        <th className="p-1 border border-black">Nama Prestasi</th>
                        <th className="p-1 border border-black">Tingkat</th>
                        <th className="p-1 border border-black">Penyelenggara</th>
                    </tr>
                </thead>
                <tbody>
                    {(santri.prestasi || []).map((p, i) => (
                        <tr key={p.id}>
                            <td className="p-1 border border-black text-center">{i + 1}</td>
                            <td className="p-1 border border-black text-center">{p.tahun}</td>
                            <td className="p-1 border border-black">{p.nama}</td>
                            <td className="p-1 border border-black">{p.tingkat}</td>
                            <td className="p-1 border border-black">{p.penyelenggara}</td>
                        </tr>
                    ))}
                    {(santri.prestasi || []).length === 0 && (
                        <tr><td colSpan={5} className="text-center p-4 italic text-gray-500">Belum ada catatan prestasi.</td></tr>
                    )}
                </tbody>
            </table>

            <h4 className="font-bold text-base mt-6 mb-2">Catatan Pelanggaran</h4>
            <table className="w-full text-left border-collapse border border-black text-xs">
                <thead className="bg-gray-200 uppercase">
                    <tr>
                        <th className="p-1 border border-black w-8">No</th>
                        <th className="p-1 border border-black">Tanggal</th>
                        <th className="p-1 border border-black">Deskripsi</th>
                        <th className="p-1 border border-black">Jenis</th>
                        <th className="p-1 border border-black">Tindak Lanjut</th>
                        <th className="p-1 border border-black">Pelapor</th>
                    </tr>
                </thead>
                <tbody>
                    {(santri.pelanggaran || []).map((p, i) => (
                        <tr key={p.id}>
                            <td className="p-1 border border-black text-center">{i + 1}</td>
                            <td className="p-1 border border-black text-center">{formatDate(p.tanggal)}</td>
                            <td className="p-1 border border-black">{p.deskripsi}</td>
                            <td className="p-1 border border-black">{p.jenis}</td>
                            <td className="p-1 border border-black">{p.tindakLanjut}</td>
                            <td className="p-1 border border-black">{p.pelapor}</td>
                        </tr>
                    ))}
                    {(santri.pelanggaran || []).length === 0 && (
                         <tr><td colSpan={6} className="text-center p-4 italic text-gray-500">Belum ada catatan pelanggaran.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const FormulirIzinTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const signatory = settings.tenagaPengajar.find(p => p.id === parseInt(options.izinSignatoryId));
    
    return (
        <div className="font-serif text-black" style={{ fontSize: '11pt', lineHeight: '1.6' }}>
            <PrintHeader settings={settings} title="FORMULIR IZIN SANTRI" />
            <p className="text-center text-sm mb-4">No: ....../IZN/PP-AH/...../{new Date().getFullYear()}</p>
            <p className="mb-4">Yang bertanda tangan di bawah ini, Bagian Keamanan {settings.namaPonpes} memberikan izin kepada santri:</p>
            <table className="w-full my-2 ml-4">
                <tbody>
                    <tr><td className="pr-4 w-40">Nama</td><td>: {santri.namaLengkap}</td></tr>
                    <tr><td>NIS</td><td>: {santri.nis}</td></tr>
                    <tr><td>Rombel</td><td>: {rombel?.nama || 'N/A'}</td></tr>
                    <tr><td>Alamat</td><td>: {santri.alamat.detail}</td></tr>
                </tbody>
            </table>
            <p className="my-4">Untuk meninggalkan area pondok pesantren dengan rincian sebagai berikut:</p>
             <table className="w-full my-2 ml-4">
                <tbody>
                    <tr><td className="pr-4 w-40">Tujuan</td><td>: {options.izinTujuan}</td></tr>
                    <tr><td>Keperluan</td><td>: {options.izinKeperluan}</td></tr>
                    <tr><td>Tanggal Berangkat</td><td>: {formatDate(options.izinTanggalBerangkat)}</td></tr>
                    <tr><td>Tanggal Kembali</td><td>: {formatDate(options.izinTanggalKembali)}</td></tr>
                    <tr><td>Penjemput</td><td>: {options.izinPenjemput}</td></tr>
                </tbody>
            </table>
            <h4 className="font-bold text-sm mt-6 mb-2">Ketentuan Izin:</h4>
            <div className="text-xs border p-2 bg-gray-50 rounded-md" style={{whiteSpace: 'pre-wrap'}}>
                {options.izinKetentuan}
            </div>
            <div className="mt-8 flow-root">
                <div className="float-left text-center w-60">
                    <p>Orang Tua/Wali Santri,</p>
                    <div className="h-20"></div>
                    <p className="font-bold underline">( {santri.namaWali || santri.namaAyah} )</p>
                </div>
                <div className="float-right text-center w-60">
                    <p>{settings.alamat.split(',')[1] || 'Sumpiuh'}, {formatDate(new Date().toISOString())}</p>
                    <p>{options.izinSignatoryTitle},</p>
                    <div className="h-20"></div>
                    <p className="font-bold underline">{signatory ? signatory.nama : '( ............................................ )'}</p>
                </div>
            </div>
        </div>
    );
};

const LabelSantriTemplate: React.FC<{ santriList: Santri[]; settings: PondokSettings; options: any }> = ({ santriList, settings, options }) => {
    const { labelWidth, labelHeight, labelFields } = options;

    const getFieldData = (santri: Santri, field: string): string => {
        switch(field) {
            case 'namaLengkap': return santri.namaLengkap;
            case 'nis': return santri.nis;
            case 'rombel': return settings.rombel.find(r => r.id === santri.rombelId)?.nama || '';
            case 'jenjang': 
                const rombel = settings.rombel.find(r => r.id === santri.rombelId);
                const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
                return kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId)?.nama || '' : '';
            case 'namaHijrah': return santri.namaHijrah || '';
            case 'ttl': return `${santri.tempatLahir}, ${formatDate(santri.tanggalLahir)}`;
            default: return '';
        }
    };
    
    const getDynamicStyles = (santri: Santri): React.CSSProperties => {
        const totalLength = labelFields.reduce((sum: number, field: string) => sum + (getFieldData(santri, field)?.length || 0), 0);
        const lineCount = labelFields.length;
        
        let fontSizePt = 11; // Default size in points

        // Adjust based on total character length
        if (totalLength > 80) {
            fontSizePt = 8;
        } else if (totalLength > 60) {
            fontSizePt = 9;
        } else if (totalLength > 40) {
            fontSizePt = 10;
        }

        // Further adjust based on number of lines to prevent vertical overflow
        if (lineCount >= 4) {
            fontSizePt = Math.min(fontSizePt, 9);
        }
        if (lineCount >= 5) {
             fontSizePt = Math.min(fontSizePt, 8);
        }

        return {
            fontSize: `${fontSizePt}pt`,
            lineHeight: '1.2',
        };
    };

    return (
        <div className="grid grid-cols-3 gap-2 p-2">
            {santriList.map(santri => {
                const dynamicStyles = getDynamicStyles(santri);
                return (
                    <div 
                        key={santri.id} 
                        className="border border-black border-dashed text-center flex flex-col justify-center p-1 font-sans" 
                        style={{ width: `${labelWidth}cm`, height: `${labelHeight}cm`, breakInside: 'avoid', ...dynamicStyles }}
                    >
                        {labelFields.map((field: string) => (
                            <p key={field} className="px-1" style={{ fontWeight: field === 'namaLengkap' ? 'bold' : 'normal', overflowWrap: 'break-word' }}>
                                {getFieldData(santri, field)}
                            </p>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

const DaftarRombelTemplate: React.FC<{ santriList: Santri[]; settings: PondokSettings; options: { rombelNama: string } }> = ({ santriList, settings, options }) => {
    const rombel = settings.rombel.find(r => r.nama === options.rombelNama);
    const waliKelas = settings.tenagaPengajar.find(tp => tp.id === rombel?.waliKelasId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    
    const formatFullAlamat = (alamat: Alamat): string => {
        return [
            alamat.detail,
            alamat.desaKelurahan,
            alamat.kecamatan,
            alamat.kabupatenKota,
            alamat.provinsi
        ].filter(Boolean).join(', ');
    };

    return (
        <div className="text-black" style={{ fontSize: '9pt' }}>
            <PrintHeader settings={settings} title={`DAFTAR SANTRI ROMBEL ${options.rombelNama.toUpperCase()}`} />
            <div className="text-sm font-semibold mb-4 grid grid-cols-2">
              <span>Jenjang: {jenjang?.nama || 'N/A'}</span>
              <span className="text-right">Wali Kelas: {waliKelas?.nama || '...................................'}</span>
            </div>
            <table className="w-full text-left border-collapse border border-black">
                <thead className="text-xs uppercase bg-gray-200 text-center">
                    <tr>
                        <th className="px-1 py-1 border border-black">No</th>
                        <th className="px-1 py-1 border border-black">NIS</th>
                        <th className="px-1 py-1 border border-black text-left">Nama Lengkap</th>
                        <th className="px-1 py-1 border border-black text-left">Tempat, Tgl. Lahir</th>
                        <th className="px-1 py-1 border border-black text-left">Wali / Ayah</th>
                        <th className="px-1 py-1 border border-black text-left">Alamat</th>
                        <th className="px-1 py-1 border border-black text-left">No. Telepon</th>
                    </tr>
                </thead>
                <tbody style={{ fontSize: '8pt' }}>
                    {santriList.map((s, i) => (
                        <tr key={s.id}>
                            <td className="px-1 py-1 border border-black text-center align-top">{i + 1}</td>
                            <td className="px-1 py-1 border border-black align-top">{s.nis}</td>
                            <td className="px-1 py-1 border border-black align-top">{s.namaLengkap}</td>
                            <td className="px-1 py-1 border border-black align-top">{`${s.tempatLahir}, ${formatDate(s.tanggalLahir)}`}</td>
                            <td className="px-1 py-1 border border-black align-top">{s.namaWali || s.namaAyah}</td>
                            <td className="px-1 py-1 border border-black align-top">{formatFullAlamat(s.alamat)}</td>
                            <td className="px-1 py-1 border border-black align-top">{s.teleponWali || s.teleponAyah || s.teleponIbu}</td>
                        </tr>
                    ))}
                    {santriList.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-center py-4 border border-black">Tidak ada santri aktif di rombel ini.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const LembarNilaiTable: React.FC<{
    santriList: Santri[];
    settings: PondokSettings;
    options: any;
    mapel: MataPelajaran;
    jenjangNama: string;
}> = ({ santriList, settings, options, mapel, jenjangNama }) => {
    const { rombelNama, nilaiTpCount, nilaiSmCount, showNilaiTengahSemester, semester, tahunAjaran } = options;
    const waliKelas = settings.tenagaPengajar.find(tp => tp.id === settings.rombel.find(r => r.nama === rombelNama)?.waliKelasId);
    const totalCols = 7 + nilaiTpCount + nilaiSmCount + (showNilaiTengahSemester ? 1 : 0);

    return (
        <div className="text-black" style={{ fontSize: '9pt' }}>
            <PrintHeader settings={settings} title={`LEMBAR PENILAIAN SANTRI`} />
            <div className="text-sm font-semibold mb-4 grid grid-cols-2 gap-x-4">
                <div>
                    <p>Rombel: {rombelNama}</p>
                    <p>Jenjang: {jenjangNama}</p>
                </div>
                <div className="text-right">
                    <p>Semester: {semester}</p>
                    <p>Tahun Ajaran: {tahunAjaran || '...........................'}</p>
                </div>
                <div className="col-span-2">
                    <p>Wali Kelas: {waliKelas?.nama || '...........................'}</p>
                </div>
                 <div className="col-span-2 font-bold mt-2">
                    <p>Mata Pelajaran: {mapel.nama}</p>
                </div>
            </div>
            <table className="w-full text-left border-collapse border border-black" style={{ fontSize: '8pt' }}>
                <thead className="uppercase bg-gray-200 text-center align-middle">
                    <tr>
                        <th rowSpan={2} className="p-1 border border-black w-6">No</th>
                        <th rowSpan={2} className="p-1 border border-black w-16">NIS</th>
                        <th rowSpan={2} className="p-1 border border-black" style={{ minWidth: '150px' }}>Nama Lengkap</th>
                        <th colSpan={nilaiTpCount + 1} className="p-1 border border-black">TP</th>
                        <th colSpan={nilaiSmCount + 1} className="p-1 border border-black">SM</th>
                        {showNilaiTengahSemester && <th rowSpan={2} className="p-1 border border-black" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>STS</th>}
                        <th rowSpan={2} className="p-1 border border-black" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>SAS</th>
                        <th rowSpan={2} className="p-1 border border-black" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>NA</th>
                    </tr>
                    <tr>
                        {[...Array(nilaiTpCount)].map((_, i) => <th key={`tp-${i}`} className="p-0.5 border border-black font-medium w-6">{i + 1}</th>)}
                        <th className="p-1 border border-black font-medium bg-gray-300 w-8" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center' }}>Rerata TP</th>
                        {[...Array(nilaiSmCount)].map((_, i) => <th key={`sm-${i}`} className="p-0.5 border border-black font-medium w-6">{i + 1}</th>)}
                        <th className="p-1 border border-black font-medium bg-gray-300 w-8" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center' }}>Rerata SM</th>
                    </tr>
                </thead>
                <tbody>
                    {santriList.map((s, i) => (
                        <tr key={s.id}>
                            <td className="p-1 border border-black text-center h-7">{i + 1}</td>
                            <td className="p-1 border border-black">{s.nis}</td>
                            <td className="p-1 border border-black">{s.namaLengkap}</td>
                            {[...Array(nilaiTpCount)].map((_, j) => <td key={`tp-val-${j}`} className="p-1 border border-black"></td>)}
                            <td className="p-1 border border-black bg-gray-100"></td>
                            {[...Array(nilaiSmCount)].map((_, j) => <td key={`sm-val-${j}`} className="p-1 border border-black"></td>)}
                            <td className="p-1 border border-black bg-gray-100"></td>
                            {showNilaiTengahSemester && <td className="p-1 border border-black"></td>}
                            <td className="p-1 border border-black"></td>
                            <td className="p-1 border border-black bg-gray-100"></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={totalCols} className="p-2 text-xs border border-black">
                            <strong>Keterangan:</strong> TP = Tujuan Pembelajaran, SM = Sumatif Lingkup Materi, STS = Sumatif Tengah Semester, SAS = Sumatif Akhir Semester, NA = Nilai Akhir
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

const LembarAbsensiTemplate: React.FC<{ santriList: Santri[]; settings: PondokSettings; options: { rombelNama: string; bulan: string; tahun: string } }> = ({ santriList, settings, options }) => {
    const { rombelNama, bulan, tahun } = options;
    const rombel = settings.rombel.find(r => r.nama === rombelNama);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const waliKelas = settings.tenagaPengajar.find(tp => tp.id === rombel?.waliKelasId);
    
    return (
        <div className="text-black" style={{ fontSize: '9pt' }}>
            <PrintHeader settings={settings} title={`LEMBAR ABSENSI SANTRI`} />
            <div className="text-sm font-semibold mb-2 grid grid-cols-2 gap-x-4">
                <div>
                    <p>Jenjang Pendidikan: {jenjang?.nama || 'N/A'}</p>
                    <p>Rombel: {rombelNama}</p>
                </div>
                <div className="text-right">
                    <p>Bulan: {bulan} {tahun}</p>
                    <p>Wali Kelas: {waliKelas?.nama || '...........................'}</p>
                </div>
            </div>
            <table className="w-full text-left border-collapse border border-black">
                <thead className="text-[8pt] uppercase bg-gray-200 text-center">
                    <tr>
                        <th rowSpan={2} className="p-1 border border-black align-middle w-6">No</th>
                        <th rowSpan={2} className="p-1 border border-black align-middle" style={{minWidth: '200px'}}>Nama Lengkap</th>
                        <th colSpan={31} className="p-1 border border-black">Tanggal</th>
                        <th colSpan={3} className="p-1 border border-black">Jumlah</th>
                    </tr>
                    <tr>
                        {[...Array(31)].map((_, i) => <th key={i} className="p-1 border border-black font-medium w-6">{i + 1}</th>)}
                        <th className="p-1 border border-black font-medium bg-blue-100">S</th>
                        <th className="p-1 border border-black font-medium bg-yellow-100">I</th>
                        <th className="p-1 border border-black font-medium bg-red-100">A</th>
                    </tr>
                </thead>
                <tbody style={{ fontSize: '9pt' }}>
                    {santriList.map((s, i) => (
                        <tr key={s.id}>
                            <td className="p-1 border border-black text-center h-7" style={{ fontSize: '9pt' }}>{i + 1}</td>
                            <td className="p-1 border border-black" style={{ fontSize: '9pt' }}>{s.namaLengkap}</td>
                            {[...Array(31)].map((_, i) => <td key={i} className="p-1 border border-black text-center"></td>)}
                            <td className="p-1 border border-black bg-blue-50"></td>
                            <td className="p-1 border border-black bg-yellow-50"></td>
                            <td className="p-1 border border-black bg-red-50"></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="text-xs mt-2">Keterangan: S=Sakit, I=Izin, A=Alpa</div>
        </div>
    );
};


export const useReportGenerator = (settings: PondokSettings) => {
    let hasGeneratedGuidance = false;

    const resetGuidanceFlag = () => {
        hasGeneratedGuidance = false;
    };

    const paperDimensions = useMemo(() => ({
        A4: { width: 21, height: 29.7 },
        F4: { width: 21.5, height: 33 },
        Legal: { width: 21.6, height: 35.6 },
        Letter: { width: 21.6, height: 27.9 },
    }), []);

    const marginValues = useMemo(() => ({
        narrow: 1.27,
        normal: 2,
        wide: 3,
    }), []);
    
    const hijriMonths = useMemo(() => [
        { value: 1, name: "Muharram" }, { value: 2, name: "Safar" }, { value: 3, name: "Rabi'ul Awwal" },
        { value: 4, name: "Rabi'ul Akhir" }, { value: 5, name: "Jumadal Ula" }, { value: 6, name: "Jumadal Akhirah" },
        { value: 7, name: "Rajab" }, { value: 8, name: "Sha'ban" }, { value: 9, name: "Ramadhan" },
        { value: 10, name: "Shawwal" }, { value: 11, name: "Dhu al-Qi'dah" }, { value: 12, name: "Dhu al-Hijjah" }
    ], []);

    const generateReport = (reportType: ReportType, santriData: Santri[], options: any): { content: React.ReactNode; orientation: 'portrait' | 'landscape' }[] => {
        switch (reportType) {
            case ReportType.LaporanArusKas:
                return [{
                    content: <LaporanArusKasTemplate settings={settings} options={options} />,
                    orientation: 'portrait'
                }];
            
            case ReportType.RekeningKoranSantri:
                return santriData.map(santri => ({
                    content: <RekeningKoranSantriTemplate santri={santri} settings={settings} options={options} />,
                    orientation: 'portrait'
                }));

            case ReportType.DashboardSummary:
                return [{
                    content: <DashboardSummaryTemplate santriList={santriData} settings={settings} />,
                    orientation: 'portrait'
                }];

            case ReportType.FinanceSummary:
                return [{
                    content: <FinanceSummaryTemplate santriList={santriData} tagihanList={options.tagihanList} pembayaranList={options.pembayaranList} settings={settings} />,
                    orientation: 'portrait'
                }];

            case ReportType.LaporanMutasi:
                {
                    const mutasiEvents: { santri: Santri; mutasi: RiwayatStatus }[] = [];
                    santriData.forEach(santri => {
                        (santri.riwayatStatus || []).forEach(mutasi => {
                            const mutasiDate = new Date(mutasi.tanggal);
                            if (mutasiDate >= new Date(options.mutasiStartDate) && mutasiDate <= new Date(options.mutasiEndDate)) {
                                mutasiEvents.push({ santri, mutasi });
                            }
                        });
                    });
                    mutasiEvents.sort((a, b) => new Date(a.mutasi.tanggal).getTime() - new Date(b.mutasi.tanggal).getTime());
                    return [{ 
                        content: <LaporanMutasiTemplate mutasiEvents={mutasiEvents} settings={settings} startDate={options.mutasiStartDate} endDate={options.mutasiEndDate} />, 
                        orientation: 'portrait' 
                    }];
                }
            
            case ReportType.LaporanAsrama:
                return [{
                    content: <LaporanAsramaTemplate
                        settings={settings}
                        santriList={santriData}
                        gedungList={options.filteredGedung || settings.gedungAsrama}
                    />,
                    orientation: 'portrait'
                }];

            case ReportType.Biodata:
                return santriData.map(santri => ({
                    content: <BiodataTemplate santri={santri} settings={settings} useHijriDate={options.useHijriDate} hijriDateMode={options.hijriDateMode} manualHijriDate={options.manualHijriDate} />,
                    orientation: 'portrait'
                }));
            
            case ReportType.LembarKedatangan:
                {
                    if (santriData.length === 0) return [];
                    const firstSantri = santriData[0];
                    const rombel = settings.rombel.find(r => r.id === firstSantri.rombelId);
                    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
                    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
                    const reportOptions = {
                        jenjangNama: jenjang?.nama || '',
                        kelasNama: kelas?.nama || '',
                        rombelNama: rombel?.nama || '',
                        agendaKedatangan: options.agendaKedatangan,
                    };
                    return [{ content: <LembarKedatanganTemplate santriList={santriData} settings={settings} options={reportOptions} />, orientation: 'portrait' }];
                }
            
            case ReportType.LembarRapor:
                 {
                    if (santriData.length === 0) return [];
                    const firstSantri = santriData[0];
                    const rombel = settings.rombel.find(r => r.id === firstSantri.rombelId);
                    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
                    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
                    const reportOptions = {
                        jenjangNama: jenjang?.nama || '',
                        kelasNama: kelas?.nama || '',
                        rombelNama: rombel?.nama || '',
                        semester: options.semester,
                        tahunAjaran: options.tahunAjaran,
                    };
                    return [{ content: <LembarRaporTemplate santriList={santriData} settings={settings} options={reportOptions} />, orientation: 'portrait' }];
                }

            case ReportType.DaftarRombel:
                {
                    if (santriData.length === 0) return [];
                    const firstSantri = santriData[0];
                    const rombel = settings.rombel.find(r => r.id === firstSantri.rombelId);
                    return [{ content: <DaftarRombelTemplate santriList={santriData} settings={settings} options={{ rombelNama: rombel?.nama || '' }} />, orientation: 'landscape' }];
                }
            case ReportType.LembarNilai:
                {
                    if (santriData.length === 0) return [];
                    const results: { content: React.ReactNode; orientation: 'portrait' | 'landscape' }[] = [];
                    
                    if (options.guidanceOption === 'show' && !hasGeneratedGuidance) {
                        results.push({
                            content: <PanduanPenilaianTemplate />,
                            orientation: 'portrait'
                        });
                        hasGeneratedGuidance = true;
                    }

                    const firstSantri = santriData[0];
                    const rombel = settings.rombel.find(r => r.id === firstSantri.rombelId);
                    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
                    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
                    const jenjangNama = jenjang?.nama || 'N/A';
                    const reportOptions = { rombelNama: rombel?.nama || '', ...options };
                    const selectedMapels = settings.mataPelajaran.filter(m => options.selectedMapelIds.includes(m.id));

                    selectedMapels.forEach(mapel => {
                        results.push({
                            content: <LembarNilaiTable santriList={santriData} settings={settings} options={reportOptions} mapel={mapel} jenjangNama={jenjangNama} />,
                            orientation: 'landscape'
                        });
                    });

                    return results;
                }
            case ReportType.LembarAbsensi:
                {
                    if (santriData.length === 0) return [];
                    const firstSantri = santriData[0];
                    const rombel = settings.rombel.find(r => r.id === firstSantri.rombelId);
                    const results: { content: React.ReactNode; orientation: 'portrait' | 'landscape' }[] = [];

                    if (options.attendanceCalendar === 'Masehi') {
                        const start = new Date(options.startMonth);
                        const end = new Date(options.endMonth);
                        let current = start;
                        while (current <= end) {
                            results.push({
                                content: <LembarAbsensiTemplate santriList={santriData} settings={settings} options={{ rombelNama: rombel?.nama || '', bulan: current.toLocaleString('id-ID', { month: 'long' }), tahun: current.getFullYear().toString() }} />,
                                orientation: 'landscape'
                            });
                            current.setMonth(current.getMonth() + 1);
                        }
                    } else {
                        let currentYear = options.hijriStartYear;
                        let currentMonth = options.hijriStartMonth;
                        const endYear = options.hijriEndYear;
                        const endMonth = options.hijriEndMonth;

                        while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
                            const hijriMonthName = hijriMonths.find(m => m.value === currentMonth)?.name || `Bulan ${currentMonth}`;
                            results.push({
                                content: <LembarAbsensiTemplate santriList={santriData} settings={settings} options={{ rombelNama: rombel?.nama || '', bulan: hijriMonthName, tahun: `${currentYear} H` }} />,
                                orientation: 'landscape'
                            });

                            currentMonth++;
                            if (currentMonth > 12) {
                                currentMonth = 1;
                                currentYear++;
                            }
                        }
                    }
                    return results;
                }
            case ReportType.LabelSantri:
                return [{ content: <LabelSantriTemplate santriList={santriData} settings={settings} options={options} />, orientation: 'portrait' }];
            case ReportType.KartuSantri: {
                const cards = santriData.map(santri => <KartuSantriTemplate key={santri.id} santri={santri} settings={settings} options={options} />);
                const cardsPerPage = 8;
                const pages: React.ReactNode[] = [];
                for (let i = 0; i < cards.length; i += cardsPerPage) {
                    pages.push(<div className="grid grid-cols-2 gap-2 p-2">{cards.slice(i, i + cardsPerPage)}</div>);
                }
                return pages.map(page => ({ content: page, orientation: 'portrait' }));
            }
            case ReportType.LembarPembinaan:
                return santriData.map(santri => ({
                    content: <LembarPembinaanTemplate santri={santri} settings={settings} />,
                    orientation: 'portrait'
                }));
            case ReportType.FormulirIzin:
                return santriData.map(santri => ({
                    content: <FormulirIzinTemplate santri={santri} settings={settings} options={options} />,
                    orientation: 'portrait'
                }));

            default:
                return [];
        }
    };
    
    return { generateReport, paperDimensions, marginValues, resetGuidanceFlag };
};
