
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

// --- Footer Component ---
const ReportFooter: React.FC = () => (
    <div className="mt-auto pt-2 border-t border-gray-400 text-center text-[8pt] text-gray-500 italic w-full" style={{ breakInside: 'avoid' }}>
        dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
    </div>
);

// --- Card Avatar Components ---
const AvatarPlaceholder: React.FC<{ variant: 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria' }> = ({ variant }) => {
    // General Gender-Neutral Avatar: Circle Head + Curved Body
    // Colors are adapted to the card theme

    if (variant === 'classic') {
        // Green Theme
        return (
            <svg viewBox="0 0 100 120" className="w-full h-full">
                <rect width="100" height="120" fill="#f0fdf4"/> {/* Mint/Green 50 Background to match theme */}
                <path d="M15 120 Q 50 70 85 120" fill="#1B4D3E" /> {/* Dark Green Body */}
                <circle cx="50" cy="50" r="22" fill="#d1fae5"/> {/* Light Green Head */}
            </svg>
        );
    } else if (variant === 'modern') {
        // Blue Theme
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="#bfdbfe"/>
                <path d="M15 100 Q 50 60 85 100" fill="#1e3a8a"/> {/* Dark Blue Body */}
                <circle cx="50" cy="45" r="20" fill="#dbeafe"/> {/* Light Blue Head */}
            </svg>
        );
    } else if (variant === 'vertical') {
        // Red Theme
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="#f3f4f6"/>
                <path d="M15 100 Q 50 65 85 100" fill="#991b1b"/> {/* Dark Red Body */}
                <circle cx="50" cy="50" r="22" fill="#fee2e2"/> {/* Light Red Head */}
            </svg>
        );
    } else if (variant === 'dark') {
        // Dark/Slate Theme
        return (
            <svg viewBox="0 0 100 120" className="w-full h-full">
                <rect width="100" height="120" fill="#1e293b"/>
                <path d="M15 120 Q 50 70 85 120" fill="#0f172a"/> {/* Darker Slate Body */}
                <circle cx="50" cy="50" r="22" fill="#94a3b8"/> {/* Slate Head */}
            </svg>
        );
    } else { // ceria
        // Teal/Orange Theme
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
                <rect width="100" height="100" fill="#fff7ed"/>
                <path d="M15 110 Q 50 65 85 110" fill="#14b8a6"/> {/* Teal Body */}
                <circle cx="50" cy="45" r="20" fill="#ccfbf1"/> {/* Light Teal Head */}
            </svg>
        );
    }
};

const SmartAvatar: React.FC<{ santri: Santri, variant: 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria', className?: string, forcePlaceholder?: boolean }> = ({ santri, variant, className, forcePlaceholder }) => {
    // Treat placeholder images with text as invalid
    const hasValidPhoto = santri.fotoUrl && !santri.fotoUrl.includes('text=Foto');

    return (
        <div className={`overflow-hidden ${className}`}>
            {!forcePlaceholder && hasValidPhoto ? (
                <img src={santri.fotoUrl} alt={santri.namaLengkap} className="w-full h-full object-cover" />
            ) : (
                <AvatarPlaceholder variant={variant} />
            )}
        </div>
    );
};

// --- Template Components ---

const DaftarWaliKelasTemplate: React.FC<{ settings: PondokSettings }> = ({ settings }) => {
    // Group Data: Jenjang -> Kelas -> Rombel -> Teacher Name
    const dataByJenjang = useMemo(() => {
        return settings.jenjang.map(jenjang => {
            const kelasInJenjang = settings.kelas.filter(k => k.jenjangId === jenjang.id);
            const rombelData = [];
            
            for (const kelas of kelasInJenjang) {
                const rombelInKelas = settings.rombel.filter(r => r.kelasId === kelas.id);
                for (const rombel of rombelInKelas) {
                    const wali = settings.tenagaPengajar.find(t => t.id === rombel.waliKelasId);
                    rombelData.push({
                        kelas: kelas.nama,
                        rombel: rombel.nama,
                        wali: wali ? wali.nama : '-'
                    });
                }
            }
            return {
                jenjang: jenjang.nama,
                rombels: rombelData
            };
        });
    }, [settings]);

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="DAFTAR WALI KELAS PER ROMBEL" />
                <p className="text-center text-sm mb-6">Tahun Ajaran: {new Date().getFullYear()}/{new Date().getFullYear()+1}</p>

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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.rombels.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                <td className="p-2 border border-black text-center">{rIdx + 1}</td>
                                                <td className="p-2 border border-black">{row.kelas}</td>
                                                <td className="p-2 border border-black">{row.rombel}</td>
                                                <td className="p-2 border border-black font-semibold">{row.wali}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-sm italic text-gray-500 pl-2">Belum ada data rombel untuk jenjang ini.</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

const PanduanPenilaianTemplate: React.FC = () => {
    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <h3 className="font-bold text-xl mb-6 text-center">Panduan Penilaian</h3>
                
                <div className="columns-2 gap-8 text-justify">
                    <div className="break-inside-avoid mb-4">
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

                    <div className="break-inside-avoid mb-4">
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

                    <div className="break-inside-avoid">
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
            <ReportFooter />
        </div>
    );
};

const LaporanKontakTemplate: React.FC<{ santriList: Santri[], settings: PondokSettings }> = ({ santriList, settings }) => {
    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LAPORAN KONTAK WALI SANTRI" />
                <div className="mb-4 text-sm text-gray-700">
                    <p>Laporan ini berisi daftar kontak wali santri yang siap untuk diekspor. Gunakan tombol <strong>"Unduh CSV (Format Kontak)"</strong> pada menu unduhan untuk mendapatkan file yang kompatibel dengan Google Contacts / Android / iOS.</p>
                </div>
                <table className="w-full text-left border-collapse border border-black text-sm">
                    <thead className="bg-gray-200 uppercase">
                        <tr>
                            <th className="p-2 border border-black w-8 text-center">No</th>
                            <th className="p-2 border border-black w-24 text-center">NIS</th>
                            <th className="p-2 border border-black">Nama Santri</th>
                            <th className="p-2 border border-black">Rombel</th>
                            <th className="p-2 border border-black">Nama Wali / Orang Tua</th>
                            <th className="p-2 border border-black text-center">Nomor Telepon (HP)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {santriList.map((s, i) => {
                            let phone = s.teleponWali || s.teleponAyah || s.teleponIbu || '-';
                            let parent = s.namaWali || s.namaAyah || s.namaIbu || '-';
                            const rombel = settings.rombel.find(r => r.id === s.rombelId)?.nama || '-';
                            
                            return (
                                <tr key={s.id}>
                                    <td className="p-2 border border-black text-center">{i + 1}</td>
                                    <td className="p-2 border border-black text-center">{s.nis}</td>
                                    <td className="p-2 border border-black">{s.namaLengkap}</td>
                                    <td className="p-2 border border-black">{rombel}</td>
                                    <td className="p-2 border border-black">{parent}</td>
                                    <td className="p-2 border border-black text-center font-mono">{phone}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <ReportFooter />
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
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
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
            <ReportFooter />
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
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
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
            <ReportFooter />
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
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
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
            <ReportFooter />
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
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
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
            <ReportFooter />
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
         <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
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
             <ReportFooter />
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
        <div className="text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
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
            <ReportFooter />
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
      <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '12pt', lineHeight: '1.5' }}>
        <div>
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
        <ReportFooter />
      </div>
    );
};

const LembarKedatanganTemplate: React.FC<{ 
  santriList: Santri[]; 
  settings: PondokSettings; 
  options: { 
    rombelId: number; // Change from rombelNama to rombelId
    agendaKedatangan: string;
    semester: string;
    tahunAjaran: string;
  } 
}> = ({ santriList, settings, options }) => {
    const rombel = settings.rombel.find(r => r.id === options.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const waliKelas = rombel?.waliKelasId ? settings.tenagaPengajar.find(p => p.id === rombel.waliKelasId) : null;

    const jenjangNama = jenjang?.nama || 'N/A';
    const kelasNama = kelas?.nama || 'N/A';
    const rombelNama = rombel?.nama || 'N/A';
    const waliKelasNama = waliKelas?.nama || '...................................';

    return (
        <div className="text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LEMBAR KEDATANGAN SANTRI" />
                <div className="text-sm font-semibold mb-4 grid grid-cols-2 gap-x-4">
                <div>
                    <p>Jenjang: {jenjangNama}</p>
                    <p>Kelas / Rombel: {kelasNama} / {rombelNama}</p>
                    <p>Agenda: {options.agendaKedatangan || '...................................'}</p>
                </div>
                <div className="text-right">
                    <p>Semester: {options.semester}</p>
                    <p>Tahun Ajaran: {options.tahunAjaran || '...................................'}</p>
                    <p>Wali Kelas: {waliKelasNama}</p>
                </div>
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
                    <tbody className="text-xs">
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
            <ReportFooter />
        </div>
    );
};

const LembarRaporTemplate: React.FC<{ 
  santriList: Santri[]; 
  settings: PondokSettings; 
  options: { 
    rombelId: number; // Change from rombelNama to rombelId
    semester: string;
    tahunAjaran: string;
  } 
}> = ({ santriList, settings, options }) => {
    const rombel = settings.rombel.find(r => r.id === options.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const waliKelas = rombel?.waliKelasId ? settings.tenagaPengajar.find(p => p.id === rombel.waliKelasId) : null;

    const jenjangNama = jenjang?.nama || 'N/A';
    const kelasNama = kelas?.nama || 'N/A';
    const rombelNama = rombel?.nama || 'N/A';

    return (
        <div className="text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LEMBAR PENGAMBILAN DAN PENGUMPULAN RAPOR" />
                <div className="text-sm font-semibold mb-4 grid grid-cols-2">
                <span>Jenjang: {jenjangNama}</span>
                <span className="text-right">Semester: {options.semester}</span>
                <span>Kelas: {kelasNama}</span>
                <span className="text-right">Tahun Ajaran: {options.tahunAjaran || '...................................'}</span>
                <span>Rombel: {rombelNama}</span>
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
                    <tbody className="text-xs">
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
            <ReportFooter />
        </div>
    );
};

const KartuSantriTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const { cardDesign, cardValidUntil, cardFields, cardWidth, cardHeight } = options;
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;

    const showPhoto = cardFields.includes('foto');
    const showNama = cardFields.includes('namaLengkap');
    const showNis = cardFields.includes('nis');
    const showJenjang = cardFields.includes('jenjang');
    const showRombel = cardFields.includes('rombel');
    const showTtl = cardFields.includes('ttl');
    const showAlamat = cardFields.includes('alamat');
    const showAyahWali = cardFields.includes('ayahWali');

    // Data Helpers
    const nama = santri.namaLengkap;
    const nis = santri.nis;
    const jenjangKelas = `${jenjang?.nama?.split(' ')[0] || ''} / ${kelas?.nama || ''}`; // e.g. Wustho / Kelas 1
    const rombelNama = rombel?.nama || 'N/A';
    const ttl = `${santri.tempatLahir}, ${formatDate(santri.tanggalLahir)}`;
    const ayahWali = santri.namaAyah || santri.namaWali || '-';
    const alamat = santri.alamat.detail || '-';
    
    // Dynamic Dimensions
    const cardStyle = {
        width: `${cardWidth}cm`,
        height: `${cardHeight}cm`,
        flexShrink: 0,
    };

    // --- Design 1: Classic Traditional ---
    if (cardDesign === 'classic') {
        return (
            <div className="rounded-xl overflow-hidden relative flex flex-col text-white border-4 border-double border-[#D4AF37]" 
                 style={{ ...cardStyle, backgroundColor: '#1B4D3E', borderColor: '#D4AF37' }}>
                <div className="flex justify-between items-center px-2 py-1.5 border-b border-[#D4AF37]/30 bg-black/20 h-1/4">
                    {/* Left Logo (Yayasan) */}
                    <div className="w-10 h-full flex items-center justify-center">
                        {settings.logoYayasanUrl && <img src={settings.logoYayasanUrl} alt="Logo Yayasan" className="max-h-full max-w-full object-contain" />}
                    </div>
                    <div className="text-center flex-grow">
                        <div className="text-[7pt] font-bold uppercase tracking-wider text-[#D4AF37]">{settings.namaYayasan}</div>
                        <div className="text-[9pt] font-bold leading-tight">{settings.namaPonpes}</div>
                    </div>
                    {/* Right Logo (Ponpes) */}
                    <div className="w-10 h-full flex items-center justify-center">
                        {settings.logoPonpesUrl && <img src={settings.logoPonpesUrl} alt="Logo Ponpes" className="max-h-full max-w-full object-contain" />}
                    </div>
                </div>
                
                <div className="flex p-2 gap-2 flex-grow relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center h-full">
                        <SmartAvatar santri={santri} variant="classic" className="w-[2cm] h-[2.5cm] bg-[#f0fdf4] border-2 border-[#D4AF37] shadow-lg rounded-sm" forcePlaceholder={!showPhoto} />
                        <div className="mt-1 text-[6pt] text-center bg-[#D4AF37] text-[#1B4D3E] px-1 rounded font-bold w-full">SANTRI AKTIF</div>
                    </div>
                    <div className="flex-grow text-[7pt] space-y-0.5 z-10 flex flex-col justify-center">
                        {showNama && <div className="font-bold text-[#D4AF37] text-[10pt] border-b border-[#D4AF37]/30 pb-0.5 mb-1">{nama}</div>}
                        {showNis && <div className="grid grid-cols-[35px_1fr]"><span>NIS</span><span>: {nis}</span></div>}
                        {showJenjang && <div className="grid grid-cols-[35px_1fr]"><span>Jenjang</span><span>: {jenjangKelas}</span></div>}
                        {showRombel && <div className="grid grid-cols-[35px_1fr]"><span>Rombel</span><span>: {rombelNama}</span></div>}
                        {showTtl && <div className="grid grid-cols-[35px_1fr]"><span>TTL</span><span>: {ttl}</span></div>}
                        {showAyahWali && <div className="grid grid-cols-[35px_1fr]"><span>Wali</span><span>: {ayahWali}</span></div>}
                        {showAlamat && <div className="grid grid-cols-[35px_1fr] items-start"><span>Alamat</span><span className="leading-tight line-clamp-2">: {alamat}</span></div>}
                    </div>
                    
                    {/* Pattern Overlay */}
                    <div className="absolute right-[-20px] bottom-[-20px] text-[#D4AF37] opacity-10 text-[80pt] pointer-events-none">
                        <i className="bi bi-stars"></i>
                    </div>
                </div>

                <div className="bg-[#D4AF37] text-[#1B4D3E] text-[5pt] text-center py-0.5 font-bold h-[12px]">
                    Kartu ini sah selama santri masih aktif di pondok pesantren. Berlaku s.d. {formatDate(cardValidUntil)}
                </div>
            </div>
        );
    } 
    
    // --- Design 2: Modern Tech ---
    else if (cardDesign === 'modern') {
        return (
            <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border border-gray-200 shadow-sm" style={cardStyle}>
                {/* Background Shapes */}
                <div className="absolute top-0 left-0 w-2/5 h-full bg-blue-600 skew-x-12 -ml-8 z-0"></div>
                <div className="absolute top-0 left-0 w-2/5 h-full bg-blue-500 skew-x-12 -ml-4 z-0 opacity-50"></div>
                
                {/* Header Section (Moved to Top) */}
                <div className="bg-blue-600/10 p-2 border-b border-blue-100 text-center z-10 relative">
                     <div className="text-[6pt] font-light text-gray-500 uppercase tracking-widest">{settings.namaYayasan}</div>
                     <div className="text-[9pt] font-bold text-blue-900 leading-none mt-0.5">{settings.namaPonpes}</div>
                </div>

                {/* Body Section: Photo and Data */}
                <div className="flex justify-between items-start p-3 z-10 relative flex-grow overflow-hidden">
                    <div className="text-white mt-1">
                        <SmartAvatar santri={santri} variant="modern" className="w-[1.8cm] h-[1.8cm] rounded-full border-4 border-white shadow-md bg-white object-cover" forcePlaceholder={!showPhoto} />
                    </div>
                    <div className="text-right flex-grow pl-2 pt-1 flex flex-col items-end">
                        <div className="text-[6pt] text-gray-400 tracking-[0.2em] uppercase mb-1">Kartu Tanda Santri</div>
                        {showNama && <div className="text-[10pt] font-bold text-blue-900 leading-tight">{nama}</div>}
                        {showNis && <div className="text-[8pt] font-mono text-blue-600 bg-blue-50 inline-block px-1 rounded mt-1">{nis}</div>}
                        
                        <div className="mt-2 text-[6.5pt] space-y-0.5 text-gray-600">
                            {showJenjang && <div className="flex justify-end gap-1"><span className="font-semibold">Jenjang:</span> {jenjangKelas}</div>}
                            {showRombel && <div className="flex justify-end gap-1"><span className="font-semibold">Rombel:</span> {rombelNama}</div>}
                            {showTtl && <div className="flex justify-end gap-1"><span className="font-semibold">Lahir:</span> {ttl}</div>}
                            {showAyahWali && <div className="flex justify-end gap-1"><span className="font-semibold">Wali:</span> {ayahWali}</div>}
                            {showAlamat && <div className="flex justify-end gap-1 text-right"><span className="font-semibold">Alamat:</span> <span className="truncate max-w-[120px]">{alamat}</span></div>}
                        </div>
                    </div>
                </div>
                
                {/* Footer: Validity Only */}
                <div className="mt-auto bg-gray-50 px-3 py-1 border-t z-10 relative flex flex-col items-center justify-center text-center">
                    <div className="text-[6pt] text-gray-500">
                        Masa Berlaku: {formatDate(cardValidUntil)}
                    </div>
                </div>
            </div>
        );
    } 
    
    // --- Design 3: Vertical ID ---
    else if (cardDesign === 'vertical') {
        return (
            <div className="rounded-lg overflow-hidden relative flex flex-col bg-white text-gray-800 border shadow-sm items-center text-center" style={cardStyle}>
                <div className="w-full h-24 bg-red-700 absolute top-0 rounded-b-[50%] scale-x-150 z-0"></div>
                
                <div className="z-10 mt-3 text-white">
                    <div className="text-[6pt] opacity-80 uppercase tracking-widest">KARTU SANTRI</div>
                    <div className="text-[8pt] font-bold mt-0.5">{settings.namaPonpes}</div>
                </div>

                <div className="z-10 mt-3 relative">
                    <SmartAvatar santri={santri} variant="vertical" className="w-[2.2cm] h-[2.8cm] rounded-lg shadow-lg border-2 border-white bg-gray-100 object-cover" forcePlaceholder={!showPhoto} />
                </div>

                <div className="z-10 mt-4 px-2 w-full flex-grow flex flex-col items-center overflow-hidden">
                    {showNama && <div className="text-[9pt] font-bold text-gray-800 leading-tight">{nama}</div>}
                    {showNis && <div className="text-[7pt] text-red-600 font-medium mt-0.5 mb-2">{nis}</div>}
                    
                    <div className="w-full border-t border-gray-200 my-1"></div>
                    
                    <div className="text-[6.5pt] text-gray-600 space-y-0.5 w-full text-left px-2">
                        {showJenjang && <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Kelas</span><span>: {jenjangKelas}</span></div>}
                        {showRombel && <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Rombel</span><span>: {rombelNama}</span></div>}
                        {showAyahWali && <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Wali</span><span>: {ayahWali}</span></div>}
                        {showAlamat && <div className="grid grid-cols-[40px_1fr]"><span className="text-gray-400">Alamat</span><span className="truncate">: {alamat}</span></div>}
                    </div>
                </div>
                
                <div className="w-full bg-gray-800 text-white text-[5pt] py-1 absolute bottom-0">
                    Masa Berlaku: {formatDate(cardValidUntil)}
                </div>
            </div>
        );
    } 
    
    // --- Design 4: Dark Premium ---
    else if (cardDesign === 'dark') {
        return (
            <div className="rounded-xl overflow-hidden relative flex flex-col bg-slate-900 text-white border border-slate-700" style={cardStyle}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 rounded-full blur-[40px] opacity-20 -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full blur-[30px] opacity-20 -ml-8 -mb-8"></div>

                <div className="flex items-center justify-between p-3 border-b border-slate-800 z-10">
                    <div className="flex items-center gap-2">
                        {settings.logoPonpesUrl && (
                            <div className="w-8 h-8 flex items-center justify-center">
                                <img src={settings.logoPonpesUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                            </div>
                        )}
                        <div>
                            <div className="text-[8pt] font-normal text-teal-400">Kartu Santri</div>
                            <div className="text-[7pt] font-bold tracking-wide uppercase leading-none">{settings.namaPonpes}</div>
                        </div>
                    </div>
                </div>

                <div className="flex p-3 gap-3 z-10 flex-grow overflow-hidden">
                    <div className="flex flex-col gap-2">
                        <SmartAvatar santri={santri} variant="dark" className="w-[2cm] h-[2cm] rounded-lg border border-slate-600 bg-slate-800 object-cover" forcePlaceholder={!showPhoto} />
                        <div className="text-center">
                            {showNis && <div className="text-[9pt] font-mono font-bold text-teal-400">{nis}</div>}
                            <div className="text-[5pt] text-slate-500 uppercase tracking-widest">Nomor Induk</div>
                        </div>
                    </div>
                    <div className="flex-grow space-y-1">
                        {showNama && (
                            <div className="mb-2">
                                <div className="text-[5pt] text-slate-500 uppercase">Nama Lengkap</div>
                                <div className="text-[8pt] font-bold leading-tight">{nama}</div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-1">
                            {showJenjang && <div><div className="text-[5pt] text-slate-500 uppercase">Jenjang</div><div className="text-[6.5pt]">{jenjangKelas}</div></div>}
                            {showRombel && <div><div className="text-[5pt] text-slate-500 uppercase">Rombel</div><div className="text-[6.5pt]">{rombelNama}</div></div>}
                        </div>
                        {showAyahWali && <div><div className="text-[5pt] text-slate-500 uppercase">Orang Tua / Wali</div><div className="text-[6.5pt] truncate">{ayahWali}</div></div>}
                        {showAlamat && <div><div className="text-[5pt] text-slate-500 uppercase">Alamat</div><div className="text-[6.5pt] leading-tight line-clamp-2">{alamat}</div></div>}
                    </div>
                </div>

                <div className="px-3 pb-2 z-10 flex justify-between items-end">
                    <div className="text-[5pt] text-slate-500 w-full text-center">Berlaku s.d. {formatDate(cardValidUntil)}</div>
                </div>
            </div>
        );
    } 
    
    // --- Design 5: Ceria / TPQ ---
    else {
        return (
            <div className="rounded-2xl overflow-hidden relative flex flex-col bg-orange-50 text-orange-900 border-2 border-orange-200" style={cardStyle}>
                <div className="bg-orange-400 p-2 text-center text-white relative overflow-hidden">
                    <div className="absolute w-4 h-4 bg-white rounded-full opacity-20 top-1 left-2"></div>
                    <div className="absolute w-6 h-6 bg-white rounded-full opacity-20 bottom-[-10px] right-4"></div>
                    <div className="text-[8pt] font-normal mb-0.5 relative z-10">Kartu Santri</div>
                    <div className="text-[8pt] font-bold relative z-10 leading-none">{settings.namaPonpes}</div>
                </div>

                <div className="flex p-2 gap-3 items-start flex-grow pl-4 overflow-hidden">
                    <div className="relative mt-1">
                        <div className="absolute inset-0 bg-teal-400 rounded-full transform translate-x-1 translate-y-1"></div>
                        <SmartAvatar santri={santri} variant="ceria" className="w-[2cm] h-[2cm] rounded-full border-2 border-white bg-teal-200 relative z-10 object-cover" forcePlaceholder={!showPhoto} />
                    </div>
                    
                    <div className="flex-grow pl-2 z-10 relative">
                         {showNama && (
                            <div className="mb-2 border-b border-orange-200 pb-1">
                                <div className="text-[5pt] text-orange-400 uppercase tracking-wide">Nama Lengkap</div>
                                <div className="text-[9pt] font-bold text-teal-800 leading-tight">{nama}</div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[6.5pt]">
                             {/* NIS */}
                             {showNis && <div><div className="text-[5pt] text-orange-400 uppercase">NIS</div><div className="font-mono text-orange-700 bg-white/50 inline-block px-1 rounded font-bold">{nis}</div></div>}
                             
                             {/* Jenjang */}
                             {showJenjang && <div><div className="text-[5pt] text-orange-400 uppercase">Jenjang</div><div className="text-teal-700 font-bold leading-tight">{jenjangKelas}</div></div>}
                             
                             {/* Rombel */}
                             {showRombel && <div><div className="text-[5pt] text-orange-400 uppercase">Rombel</div><div className="text-teal-700 font-bold leading-tight">{rombelNama}</div></div>}
                             
                             {/* Wali */}
                             {showAyahWali && <div className="col-span-2"><div className="text-[5pt] text-orange-400 uppercase">Wali</div><div className="text-teal-700 font-bold truncate">{ayahWali}</div></div>}
                        </div>
                    </div>
                </div>

                <div className="bg-teal-50 px-3 py-1 flex justify-center items-center text-[6pt] text-teal-700 border-t border-orange-100">
                    <div>Masa Berlaku: {formatDate(cardValidUntil)}</div>
                </div>
            </div>
        );
    }
};

// --- Main Hook Export ---

export const useReportGenerator = (settings: PondokSettings) => {
    const paperDimensions = {
        'A4': { width: 21.0, height: 29.7 },
        'F4': { width: 21.5, height: 33.0 },
        'Legal': { width: 21.6, height: 35.6 },
        'Letter': { width: 21.6, height: 27.9 },
    };

    const marginValues = {
        'narrow': 1.27,
        'normal': 2.0,
        'wide': 3.0
    };

    const resetGuidanceFlag = () => { /* No-op for now, or reset logic if needed */ };

    const generateReport = (reportType: ReportType, data: Santri[], options: any) => {
        const previews: { content: React.ReactNode; orientation: 'portrait' | 'landscape' }[] = [];
        
        // ... (Report generation logic switch)
        // Ensure KartuSantri case uses the new component
        if (reportType === ReportType.KartuSantri) {
            
            // Determine paper orientation based on card dimensions
            // Standard ID card is usually landscape (~8.5cm w) or portrait (~5.4cm w).
            // A4 is 21cm wide.
            // If cardWidth > cardHeight (Landscape Card):
            //   - Width ~8.5cm. 2 cards fit in A4 Portrait width (21cm).
            //   - Width ~8.5cm. 3 cards fit in A4 Landscape width (29.7cm).
            //   Standard sheet usually fits 3x3 grid (9 cards) on A4 Landscape.
            // If cardHeight > cardWidth (Vertical Card):
            //   - Width ~5.4cm. 3 cards fit in A4 Portrait width (21cm).
            //   - Width ~5.4cm. 5 cards fit in A4 Landscape width (29.7cm).
            //   Standard vertical layout usually fits 3x3 grid (9 cards) on A4 Portrait.

            let sheetOrientation: 'portrait' | 'landscape' = 'portrait';
            if (options.cardWidth > options.cardHeight) {
                sheetOrientation = 'landscape';
            } else {
                sheetOrientation = 'portrait';
            }

            const cardsPerPage = 9; // Grid 3x3 safe bet for most printers
            for (let i = 0; i < data.length; i += cardsPerPage) {
                const pageData = data.slice(i, i + cardsPerPage);
                
                // Render Page
                const pageContent = (
                    <div className="flex flex-wrap gap-4 justify-center items-start content-start h-full">
                        {pageData.map((santri) => (
                            <div key={santri.id} className="relative" style={{ breakInside: 'avoid' }}>
                                <KartuSantriTemplate santri={santri} settings={settings} options={options} />
                                {/* Cut marks optional */}
                                <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-gray-300"></div>
                                <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-gray-300"></div>
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-gray-300"></div>
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-gray-300"></div>
                            </div>
                        ))}
                    </div>
                );

                previews.push({
                    content: pageContent,
                    orientation: sheetOrientation
                });
            }
        }
        else if (reportType === ReportType.LabelSantri) {
            const currentPaper = paperDimensions[options.paperSize as keyof typeof paperDimensions] || paperDimensions['A4'];
            const currentMargin = marginValues[options.margin as keyof typeof marginValues] || 2.0;

            // Calculate usable area in cm
            const effectiveWidth = currentPaper.width - (currentMargin * 2);
            const effectiveHeight = currentPaper.height - (currentMargin * 2);

            // Dynamic Calculation
            const gap = 0.1; // 1mm gap for safety and tight packing
            const cols = Math.floor((effectiveWidth + gap) / (options.labelWidth + gap));
            const rows = Math.floor((effectiveHeight + gap) / (options.labelHeight + gap));
            const itemsPerPage = Math.max(1, cols * rows);

            for (let i = 0; i < data.length; i += itemsPerPage) {
                const pageData = data.slice(i, i + itemsPerPage);

                const labelContent = (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignContent: 'flex-start',
                        gap: `${gap}cm`,
                        width: '100%',
                        height: '100%'
                    }}>
                        {pageData.map(s => {
                            const rombel = settings.rombel.find(r => r.id === s.rombelId)?.nama;
                            const jenjang = settings.jenjang.find(j => j.id === s.jenjangId)?.nama;
                            
                            // Font sizes
                            const fontSizePt = options.labelFontSize || 10;
                            const smallFontSizePt = Math.max(6, fontSizePt - 2);

                            return (
                                <div key={s.id} className="border border-gray-400 border-dashed flex flex-col justify-center items-center text-center overflow-hidden bg-white"
                                     style={{
                                         width: `${options.labelWidth}cm`,
                                         height: `${options.labelHeight}cm`,
                                         padding: '0.1cm',
                                         boxSizing: 'border-box'
                                     }}>
                                    {options.labelFields.includes('namaLengkap') && (
                                        <div className="font-bold leading-tight" style={{ fontSize: `${fontSizePt}pt` }}>
                                            {s.namaLengkap}
                                        </div>
                                    )}
                                    {options.labelFields.includes('namaHijrah') && s.namaHijrah && (
                                        <div className="italic text-gray-600" style={{ fontSize: `${fontSizePt}pt` }}>
                                            ({s.namaHijrah})
                                        </div>
                                    )}
                                    {options.labelFields.includes('nis') && (
                                        <div className="font-mono bg-gray-100 px-1 rounded mt-0.5" style={{ fontSize: `${fontSizePt}pt` }}>
                                            {s.nis}
                                        </div>
                                    )}
                                    <div className="text-gray-600 mt-0.5 leading-tight" style={{ fontSize: `${smallFontSizePt}pt` }}>
                                        {options.labelFields.includes('jenjang') && <span>{jenjang}</span>}
                                        {options.labelFields.includes('jenjang') && options.labelFields.includes('rombel') && <br/>}
                                        {options.labelFields.includes('rombel') && <span>{rombel}</span>}
                                    </div>
                                    {options.labelFields.includes('ttl') && (
                                        <div className="text-gray-500 mt-0.5" style={{ fontSize: `${smallFontSizePt}pt` }}>
                                            {s.tempatLahir}, {formatDate(s.tanggalLahir)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );

                previews.push({ content: labelContent, orientation: 'portrait' });
            }
        }
        else if (reportType === ReportType.Biodata) {
            data.forEach(santri => {
                previews.push({
                    content: <BiodataTemplate santri={santri} settings={settings} useHijriDate={options.useHijriDate} hijriDateMode={options.hijriDateMode} manualHijriDate={options.manualHijriDate} />,
                    orientation: 'portrait'
                });
            });
        }
        else if (reportType === ReportType.LembarKedatangan) {
            previews.push({
                content: <LembarKedatanganTemplate santriList={data} settings={settings} options={options} />,
                orientation: 'portrait'
            });
        }
        else if (reportType === ReportType.LembarRapor) {
            previews.push({
                content: <LembarRaporTemplate santriList={data} settings={settings} options={options} />,
                orientation: 'portrait'
            });
        }
        else if (reportType === ReportType.DashboardSummary) {
            previews.push({
                content: <DashboardSummaryTemplate santriList={data} settings={settings} />,
                orientation: 'portrait'
            });
        }
        else if (reportType === ReportType.FinanceSummary) {
            previews.push({
                content: <FinanceSummaryTemplate santriList={data} tagihanList={options.tagihanList} pembayaranList={options.pembayaranList} settings={settings} />,
                orientation: 'portrait'
            });
        }
        else if (reportType === ReportType.LaporanMutasi) {
             // Mocking mutasi events for now since we passed raw santri list
             // Ideally we should query actual history. For this scope, we filter history inside template or pre-calc
             const events: { santri: Santri; mutasi: RiwayatStatus }[] = [];
             const start = new Date(options.mutasiStartDate);
             const end = new Date(options.mutasiEndDate + 'T23:59:59');
             
             data.forEach(s => {
                 if (s.riwayatStatus) {
                     s.riwayatStatus.forEach(r => {
                         const rDate = new Date(r.tanggal);
                         if (rDate >= start && rDate <= end) {
                             events.push({ santri: s, mutasi: r });
                         }
                     });
                 }
             });
             
             events.sort((a,b) => new Date(a.mutasi.tanggal).getTime() - new Date(b.mutasi.tanggal).getTime());

             previews.push({
                content: <LaporanMutasiTemplate mutasiEvents={events} settings={settings} startDate={options.mutasiStartDate} endDate={options.mutasiEndDate} />,
                orientation: 'landscape' // More columns, better landscape
            });
        }
        else if (reportType === ReportType.LaporanArusKas) {
            previews.push({
                content: <LaporanArusKasTemplate settings={settings} options={options} />,
                orientation: 'portrait'
            });
        }
        else if (reportType === ReportType.RekeningKoranSantri) {
            data.forEach(santri => {
                previews.push({
                    content: <RekeningKoranSantriTemplate santri={santri} settings={settings} options={options} />,
                    orientation: 'portrait'
                });
            });
        }
        else if (reportType === ReportType.LaporanAsrama) {
            previews.push({
                content: <LaporanAsramaTemplate settings={settings} santriList={data} gedungList={options.filteredGedung} />,
                orientation: 'portrait'
            });
        }
        else if (reportType === ReportType.LaporanKontak) {
            // Since contact report is primarily for CSV export, we just show a simple list preview
            // Or grouping by rombel makes sense for printing too.
            // Let's assume it can be paginated simply.
            const rowsPerPage = 25;
            for (let i = 0; i < data.length; i += rowsPerPage) {
                const pageData = data.slice(i, i + rowsPerPage);
                previews.push({
                    content: <LaporanKontakTemplate santriList={pageData} settings={settings} />,
                    orientation: 'portrait'
                });
            }
        }
        else if (reportType === ReportType.DaftarWaliKelas) {
            // No santri data needed for this report, it uses settings
            previews.push({
                content: <DaftarWaliKelasTemplate settings={settings} />,
                orientation: 'portrait'
            });
        }
        else if (reportType === ReportType.LembarNilai) {
            // Logic for Lembar Nilai (Template Empty Score Sheet)
            // Group by Rombel logic is handled in Reports.tsx, here data is specific to one rombel mostly
            // But if multiple rombels selected, we might want page breaks.
            // Assuming data passed here is for one batch (Reports.tsx loops per rombel).
            
            const rombelId = data[0]?.rombelId;
            const rombel = settings.rombel.find(r => r.id === rombelId);
            const mapelList = settings.mataPelajaran.filter(m => options.selectedMapelIds.includes(m.id));
            
            // Only 1 mapel per page usually for score entry
            mapelList.forEach(mapel => {
                previews.push({
                    content: (
                        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
                            <div>
                                <PrintHeader settings={settings} title={`LEMBAR NILAI ${mapel.nama.toUpperCase()}`} />
                                <div className="text-sm font-semibold mb-4 grid grid-cols-2">
                                    <span>Kelas/Rombel: {rombel?.nama}</span>
                                    <span className="text-right">Semester: {options.semester}</span>
                                    <span>Guru Pengampu: ...................................</span>
                                    <span className="text-right">Tahun Ajaran: {options.tahunAjaran}</span>
                                </div>
                                <table className="w-full border-collapse border border-black text-center text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th rowSpan={3} className="border border-black p-1 w-8">No</th>
                                            <th rowSpan={3} className="border border-black p-1 w-24">NIS</th>
                                            <th rowSpan={3} className="border border-black p-1">Nama Santri</th>
                                            <th colSpan={options.nilaiTpCount + 1} className="border border-black p-1">Nilai Sumatif Lingkup Materi</th>
                                            <th colSpan={options.nilaiSmCount + 1} className="border border-black p-1">Nilai Sumatif Akhir</th>
                                            {options.showNilaiTengahSemester && <th rowSpan={3} className="border border-black p-1 w-10">STS</th>}
                                            <th rowSpan={3} className="border border-black p-1 w-10">SAS</th>
                                            <th rowSpan={3} className="border border-black p-1 w-10">NA</th>
                                        </tr>
                                        <tr>
                                            <th colSpan={options.nilaiTpCount} className="border border-black p-1">Tujuan Pembelajaran (TP)</th>
                                            <th rowSpan={2} className="border border-black p-1 w-10 rotate-90 h-20"><div className="w-4">Rerata TP</div></th>
                                            <th colSpan={options.nilaiSmCount} className="border border-black p-1">Sumatif Materi (SM)</th>
                                            <th rowSpan={2} className="border border-black p-1 w-10 rotate-90"><div className="w-4">Rerata SM</div></th>
                                        </tr>
                                        <tr>
                                            {[...Array(options.nilaiTpCount)].map((_, i) => <th key={i} className="border border-black p-1 w-8">{i + 1}</th>)}
                                            {[...Array(options.nilaiSmCount)].map((_, i) => <th key={i} className="border border-black p-1 w-8">{i + 1}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((s, i) => (
                                            <tr key={s.id} className="h-6">
                                                <td className="border border-black">{i + 1}</td>
                                                <td className="border border-black">{s.nis}</td>
                                                <td className="border border-black text-left pl-2">{s.namaLengkap}</td>
                                                {[...Array(options.nilaiTpCount + 1)].map((_, idx) => <td key={idx} className="border border-black"></td>)}
                                                {[...Array(options.nilaiSmCount + 1)].map((_, idx) => <td key={idx} className="border border-black"></td>)}
                                                {options.showNilaiTengahSemester && <td className="border border-black"></td>}
                                                <td className="border border-black"></td>
                                                <td className="border border-black"></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <div className="text-center w-64">
                                    <p>Guru Mata Pelajaran,</p>
                                    <div className="h-16"></div>
                                    <p className="font-bold border-b border-black inline-block min-w-[150px]"></p>
                                </div>
                            </div>
                            <ReportFooter />
                        </div>
                    ),
                    orientation: 'portrait'
                });
            });

            // Add Guidance Page if enabled
            if (options.guidanceOption === 'show' && mapelList.length > 0) {
                previews.push({
                    content: <PanduanPenilaianTemplate />,
                    orientation: 'portrait'
                });
            }
        }
        else if (reportType === ReportType.FormulirIzin) {
            // One page per santri
            data.forEach(santri => {
                const rombel = settings.rombel.find(r => r.id === santri.rombelId)?.nama;
                const signatory = settings.tenagaPengajar.find(p => p.id === parseInt(options.izinSignatoryId));
                
                previews.push({
                    content: (
                        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '11pt' }}>
                            <div>
                                <PrintHeader settings={settings} title="SURAT IZIN KELUAR PONDOK" />
                                <div className="my-6">
                                    <p>Yang bertanda tangan di bawah ini memberikan izin kepada:</p>
                                    <table className="w-full my-4 ml-4">
                                        <tbody>
                                            <tr><td className="w-40 py-1">Nama</td><td>: <strong>{santri.namaLengkap}</strong></td></tr>
                                            <tr><td className="w-40 py-1">NIS</td><td>: {santri.nis}</td></tr>
                                            <tr><td className="w-40 py-1">Kamar / Rombel</td><td>: {santri.kamarId ? settings.kamar.find(k=>k.id===santri.kamarId)?.nama : '-'} / {rombel}</td></tr>
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
                                    <div className="text-center w-48">
                                        <p>Santri Ybs,</p>
                                        <div className="h-20"></div>
                                        <p className="font-bold underline">{santri.namaLengkap}</p>
                                    </div>
                                    <div className="text-center w-48">
                                        <p>Sumpiuh, {formatDate(new Date().toISOString())}</p>
                                        <p>{options.izinSignatoryTitle}</p>
                                        <div className="h-20"></div>
                                        <p className="font-bold underline">{signatory?.nama || '..........................'}</p>
                                    </div>
                                </div>
                            </div>
                            <ReportFooter />
                        </div>
                    ),
                    orientation: 'portrait'
                });
            });
        }
        else if (reportType === ReportType.LembarPembinaan) {
            data.forEach(santri => {
               previews.push({
                   content: (
                        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
                            <div>
                                <PrintHeader settings={settings} title="LEMBAR PEMBINAAN SANTRI" />
                                <div className="mb-6 p-4 border rounded bg-gray-50">
                                    <table className="w-full">
                                        <tbody>
                                            <tr><td className="font-semibold w-32">Nama</td><td>: {santri.namaLengkap}</td><td className="font-semibold w-32">NIS</td><td>: {santri.nis}</td></tr>
                                            <tr><td className="font-semibold">Rombel</td><td>: {settings.rombel.find(r=>r.id===santri.rombelId)?.nama}</td><td className="font-semibold">Wali</td><td>: {santri.namaWali || santri.namaAyah}</td></tr>
                                        </tbody>
                                    </table>
                                </div>

                                <h4 className="font-bold text-lg border-b border-black mb-2 mt-4">A. Catatan Prestasi</h4>
                                <table className="w-full border-collapse border border-black text-sm mb-6">
                                    <thead className="bg-gray-200">
                                        <tr><th className="border p-2 w-10">No</th><th className="border p-2">Kegiatan/Lomba</th><th className="border p-2">Tingkat</th><th className="border p-2">Tahun</th><th className="border p-2">Ket.</th></tr>
                                    </thead>
                                    <tbody>
                                        {(santri.prestasi && santri.prestasi.length > 0) ? santri.prestasi.map((p, i) => (
                                            <tr key={i}><td className="border p-2 text-center">{i+1}</td><td className="border p-2">{p.nama}</td><td className="border p-2">{p.tingkat}</td><td className="border p-2 text-center">{p.tahun}</td><td className="border p-2">{p.jenis}</td></tr>
                                        )) : <tr><td colSpan={5} className="border p-4 text-center italic text-gray-500">Belum ada data prestasi.</td></tr>}
                                    </tbody>
                                </table>

                                <h4 className="font-bold text-lg border-b border-black mb-2">B. Catatan Pelanggaran & Pembinaan</h4>
                                <table className="w-full border-collapse border border-black text-sm">
                                    <thead className="bg-gray-200">
                                        <tr><th className="border p-2 w-10">No</th><th className="border p-2 w-24">Tanggal</th><th className="border p-2">Jenis Pelanggaran</th><th className="border p-2">Tindak Lanjut / Sanksi</th><th className="border p-2 w-32">Paraf Pembina</th></tr>
                                    </thead>
                                    <tbody>
                                        {(santri.pelanggaran && santri.pelanggaran.length > 0) ? santri.pelanggaran.map((p, i) => (
                                            <tr key={i}><td className="border p-2 text-center">{i+1}</td><td className="border p-2">{formatDate(p.tanggal)}</td><td className="border p-2"><div>{p.deskripsi}</div><div className="text-xs text-gray-500 italic">({p.jenis})</div></td><td className="border p-2">{p.tindakLanjut}</td><td className="border p-2"></td></tr>
                                        )) : (
                                            <>
                                                {[1,2,3,4,5].map(i => <tr key={i} className="h-10"><td className="border p-2 text-center">{i}</td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>)}
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <ReportFooter />
                        </div>
                   ),
                   orientation: 'portrait'
               }); 
            });
        }
        else if (reportType === ReportType.DaftarRombel) {
            const rombelId = data[0]?.rombelId;
            const rombel = settings.rombel.find(r => r.id === rombelId);
            const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
            const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
            const waliKelas = rombel?.waliKelasId ? settings.tenagaPengajar.find(p => p.id === rombel.waliKelasId) : null;

            previews.push({
                content: (
                    <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
                        <div>
                            <PrintHeader settings={settings} title="DAFTAR SANTRI PER ROMBEL" />
                            <div className="flex justify-between mb-4 font-semibold text-sm">
                                <div>
                                    <p>Jenjang: {jenjang?.nama}</p>
                                    <p>Kelas: {kelas?.nama}</p>
                                    <p>Rombel: {rombel?.nama}</p>
                                </div>
                                <div className="text-right">
                                    <p>Tahun Ajaran: {new Date().getFullYear()}/{new Date().getFullYear()+1}</p>
                                    <p>Wali Kelas: {waliKelas?.nama || '-'}</p>
                                    <p>Jumlah Santri: {data.length}</p>
                                </div>
                            </div>
                            <table className="w-full border-collapse border border-black text-sm">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="border border-black p-2 w-8">No</th>
                                        <th className="border border-black p-2 w-24">NIS</th>
                                        <th className="border border-black p-2">Nama Lengkap</th>
                                        <th className="border border-black p-2 w-10">L/P</th>
                                        <th className="border border-black p-2 w-32">TTL</th>
                                        <th className="border border-black p-2 w-32">Ayah / Wali</th>
                                        <th className="border border-black p-2 w-28">No. Telepon</th>
                                        <th className="border border-black p-2">Alamat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((s, i) => {
                                        const wali = s.namaAyah || s.namaWali || s.namaIbu || '-';
                                        const telp = s.teleponWali || s.teleponAyah || s.teleponIbu || '-';
                                        return (
                                        <tr key={s.id}>
                                            <td className="border border-black p-2 text-center">{i+1}</td>
                                            <td className="border border-black p-2">{s.nis}</td>
                                            <td className="border border-black p-2">{s.namaLengkap}</td>
                                            <td className="border border-black p-2 text-center">{s.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                            <td className="border border-black p-2">{s.tempatLahir}, {formatDate(s.tanggalLahir)}</td>
                                            <td className="border border-black p-2">{wali}</td>
                                            <td className="border border-black p-2">{telp}</td>
                                            <td className="border border-black p-2">{s.alamat.kecamatan}, {s.alamat.kabupatenKota}</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                        <ReportFooter />
                    </div>
                ),
                orientation: 'landscape'
            });
        }
        else if (reportType === ReportType.LembarAbsensi) {
            // Logic for Absensi (Similar to Daftar Rombel but grid for dates)
            const rombelId = data[0]?.rombelId;
            const rombel = settings.rombel.find(r => r.id === rombelId);
            const title = `LEMBAR ABSENSI BULAN ${options.attendanceCalendar === 'Masehi' ? new Date(options.startMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase() : `HIJRIAH`}`; // Simplified

            previews.push({
                content: (
                    <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
                        <div>
                            <PrintHeader settings={settings} title={title} />
                            <div className="flex justify-between mb-4 font-semibold text-sm">
                                <span>Rombel: {rombel?.nama}</span>
                                <span>Tahun Ajaran: {options.tahunAjaran || '-'}</span>
                            </div>
                            <table className="w-full border-collapse border border-black text-xs text-center">
                                <thead>
                                    <tr>
                                        <th rowSpan={2} className="border border-black p-1 w-8">No</th>
                                        <th rowSpan={2} className="border border-black p-1 w-48 text-left">Nama Santri</th>
                                        <th colSpan={31} className="border border-black p-1">Tanggal</th>
                                        <th colSpan={3} className="border border-black p-1">Rekap</th>
                                    </tr>
                                    <tr>
                                        {[...Array(31)].map((_, i) => <th key={i} className="border border-black w-6 text-[8pt]">{i+1}</th>)}
                                        <th className="border border-black w-8 bg-gray-100">S</th>
                                        <th className="border border-black w-8 bg-gray-100">I</th>
                                        <th className="border border-black w-8 bg-gray-100">A</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((s, i) => (
                                        <tr key={s.id} className="h-6">
                                            <td className="border border-black">{i+1}</td>
                                            <td className="border border-black text-left px-2 truncate max-w-[150px]">{s.namaLengkap}</td>
                                            {[...Array(31)].map((_, idx) => <td key={idx} className="border border-black"></td>)}
                                            <td className="border border-black bg-gray-50"></td>
                                            <td className="border border-black bg-gray-50"></td>
                                            <td className="border border-black bg-gray-50"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <ReportFooter />
                    </div>
                ),
                orientation: 'landscape'
            });
        }

        return previews;
    };

    return { generateReport, paperDimensions, marginValues, resetGuidanceFlag };
};
