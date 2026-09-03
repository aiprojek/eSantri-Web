import React from 'react';
import { PondokSettings, Santri, Rombel } from '../../types';

export interface SuratPeringatanData {
    tipe: 'SP1' | 'SP2' | 'SP3' | 'PANGGILAN_WALI';
    nomorSurat: string;
    tanggalSurat: string;
    tempatSurat: string;
    santri: Santri;
    rombel?: Rombel;
    waliKelasName?: string;
    totalAlpha: number;
    totalSakit: number;
    totalIzin: number;
    totalHari: number;
    attendanceRate: number;
    alphaDates: { tanggal: string; keterangan?: string }[];
    // Khusus panggilan wali
    jadwalPanggilan?: {
        hariTanggal: string;
        waktu: string;
        tempat: string;
        menghadap: string;
    };
    catatanTambahan?: string;
    pejabatPenandatangan: {
        nama: string;
        jabatan: string;
        nipNiy?: string;
    };
    mengetahui?: {
        nama: string;
        jabatan: string;
    };
}

interface Props {
    settings: PondokSettings;
    data: SuratPeringatanData;
}

export const SuratPeringatanPrintTemplate: React.FC<Props> = ({ settings, data }) => {
    const { santri, rombel } = data;

    const getJudulSurat = () => {
        switch (data.tipe) {
            case 'SP1': return 'SURAT PERINGATAN PERTAMA (SP-1)';
            case 'SP2': return 'SURAT PERINGATAN KEDUA (SP-2)';
            case 'SP3': return 'SURAT PERINGATAN KETIGA / TERAKHIR (SP-3)';
            case 'PANGGILAN_WALI': return 'SURAT PEMANGGILAN ORANG TUA / WALI SANTRI';
        }
    };

    const getTingkatTeks = () => {
        switch (data.tipe) {
            case 'SP1':
                return 'diberikan Peringatan Tingkat Pertama (SP-1) atas akumulasi ketidakhadiran tanpa keterangan (Alpha) dalam kegiatan belajar mengajar / asrama pondok.';
            case 'SP2':
                return 'diberikan Peringatan Keras Tingkat Kedua (SP-2) sehubungan belum adanya peningkatan kedisiplinan dan bertambahnya ketidakhadiran tanpa izin yang sah.';
            case 'SP3':
                return 'diberikan Peringatan Terakhir (SP-3) sebagai tindak lanjut pelanggaran berat terhadap tata tertib kedisiplinan dan absensi pesantren.';
            case 'PANGGILAN_WALI':
                return 'kami mengundang kehadiran Bapak/Ibu Orang Tua / Wali Santri untuk hadir ke Pondok Pesantren guna membicarakan evaluasi kedisiplinan dan kehadiran ananda.';
        }
    };

    const dateFormatted = new Date(data.tanggalSurat).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div 
            id="surat-peringatan-print-area" 
            className="print-portrait bg-white text-gray-900 mx-auto"
            style={{ 
                width: '210mm', 
                minHeight: '297mm', 
                padding: '20mm 20mm',
                boxSizing: 'border-box',
                fontFamily: "'Times New Roman', Times, serif" 
            }}
        >
            {/* KOP SURAT (Table Layout for Perfect Word & Print Rendering) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
                <tbody>
                    <tr>
                        {settings.logoPonpesUrl ? (
                            <td style={{ width: '85px', verticalAlign: 'middle', textAlign: 'center', paddingRight: '12px' }}>
                                <img 
                                    src={settings.logoPonpesUrl} 
                                    alt="Logo Pesantren" 
                                    style={{ width: '75px', height: '75px', objectFit: 'contain', display: 'inline-block' }} 
                                    referrerPolicy="no-referrer"
                                />
                            </td>
                        ) : null}
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ fontSize: '11pt', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#374151' }}>
                                {settings.namaYayasan || 'YAYASAN PONDOK PESANTREN'}
                            </div>
                            <div style={{ fontSize: '16pt', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#000', margin: '2px 0' }}>
                                {settings.namaPonpes || 'PONDOK PESANTREN ISLAM'}
                            </div>
                            <div style={{ fontSize: '9pt', color: '#374151', lineHeight: '1.3' }}>
                                {settings.alamat || 'Alamat Pesantren'}
                            </div>
                            <div style={{ fontSize: '8.5pt', color: '#4b5563', marginTop: '2px' }}>
                                {settings.telepon && `Telp: ${settings.telepon}`} {settings.email && ` • Email: ${settings.email}`} {settings.website && ` • Web: ${settings.website}`}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Double Border Line Kop Surat */}
            <div style={{ borderBottom: '3px double #000', marginBottom: '18px', width: '100%' }}></div>

            {/* Nomor, Lampiran, Perihal & Tanggal (2-Column Table) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '16px' }}>
                <tbody>
                    <tr>
                        <td style={{ verticalAlign: 'top', width: '60%' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ fontWeight: 600, paddingRight: '8px', paddingBottom: '2px', width: '70px' }}>Nomor</td>
                                        <td style={{ paddingRight: '8px', paddingBottom: '2px', width: '10px' }}>:</td>
                                        <td style={{ fontWeight: 'bold', paddingBottom: '2px' }}>{data.nomorSurat}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600, paddingRight: '8px', paddingBottom: '2px' }}>Lampiran</td>
                                        <td style={{ paddingRight: '8px', paddingBottom: '2px' }}>:</td>
                                        <td style={{ paddingBottom: '2px' }}>1 (Satu) Lembar Rekap Presensi</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600, paddingRight: '8px', paddingBottom: '2px' }}>Perihal</td>
                                        <td style={{ paddingRight: '8px', paddingBottom: '2px' }}>:</td>
                                        <td style={{ fontWeight: 'bold', paddingBottom: '2px' }}>{getJudulSurat()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'right', width: '40%' }}>
                            <p style={{ margin: 0, fontSize: '10pt' }}>{data.tempatSurat || 'Di Tempat'}, {dateFormatted}</p>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Tujuan Surat */}
            <div style={{ fontSize: '10pt', lineHeight: '1.5', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 2px 0' }}>Kepada Yang Terhormat,</p>
                <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>Bapak / Ibu Wali Santri dari : {santri.namaLengkap}</p>
                <p style={{ margin: 0 }}>Di Tempat</p>
            </div>

            {/* Pembuka Salam */}
            <div style={{ fontSize: '10pt', lineHeight: '1.6', textAlign: 'justify', marginBottom: '14px' }}>
                <p style={{ fontStyle: 'italic', fontWeight: 600, textAlign: 'center', fontSize: '11pt', margin: '0 0 8px 0' }}>
                    Assalamu’alaikum Warahmatullahi Wabarakatuh
                </p>
                <p style={{ margin: '0 0 8px 0', textIndent: '24px' }}>
                    Segala puji bagi Allah Subhanahu wa Ta’ala yang senantiasa melimpahkan rahmat dan taufiq-Nya kepada kita semua. Shalawat dan salam semoga tercurah kepada Baginda Nabi Muhammad Shallallahu ‘Alaihi wa Sallam, keluarga, sahabat, dan pengikutnya hingga akhir zaman.
                </p>
                <p style={{ margin: 0, textIndent: '24px' }}>
                    Berdasarkan catatan buku induk presensi harian santri Pondok Pesantren, dengan ini kami memberitahukan bahwa santri dengan identitas di bawah ini:
                </p>
            </div>

            {/* Biodata Santri Box (Styled Table) */}
            <table style={{ width: '100%', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '10pt' }}>
                <tbody>
                    <tr>
                        <td style={{ padding: '8px 12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '180px', fontWeight: 600, padding: '2px 0' }}>Nama Santri</td>
                                        <td style={{ width: '15px', padding: '2px 0' }}>:</td>
                                        <td style={{ fontWeight: 'bold', padding: '2px 0' }}>{santri.namaLengkap}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600, padding: '2px 0' }}>Nomor Induk Santri (NIS)</td>
                                        <td style={{ padding: '2px 0' }}>:</td>
                                        <td style={{ padding: '2px 0' }}>{santri.nis || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600, padding: '2px 0' }}>Kelas / Rombel</td>
                                        <td style={{ padding: '2px 0' }}>:</td>
                                        <td style={{ padding: '2px 0' }}>{rombel?.nama || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600, padding: '2px 0' }}>Wali Kelas / Ustadz</td>
                                        <td style={{ padding: '2px 0' }}>:</td>
                                        <td style={{ padding: '2px 0' }}>{data.waliKelasName || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600, padding: '2px 0', verticalAlign: 'top' }}>Akumulasi Ketidakhadiran</td>
                                        <td style={{ padding: '2px 0', verticalAlign: 'top' }}>:</td>
                                        <td style={{ padding: '2px 0' }}>
                                            <strong style={{ color: '#b91c1c' }}>{data.totalAlpha} Hari Tanpa Keterangan (Alpha)</strong> • Sakit: {data.totalSakit} • Izin: {data.totalIzin} (Tingkat Kehadiran: {data.attendanceRate.toFixed(1)}%)
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Isi Konsiderans / Inti Surat */}
            <div style={{ fontSize: '10pt', lineHeight: '1.6', textAlign: 'justify', marginBottom: '14px' }}>
                <p style={{ margin: '0 0 8px 0', textIndent: '24px' }}>
                    Sehubungan dengan hal tersebut di atas, santri yang bersangkutan <strong>{getTingkatTeks()}</strong>
                </p>

                {/* Rincian Tanggal Alpha */}
                {data.alphaDates.length > 0 && (
                    <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                        <p style={{ fontWeight: 600, margin: '0 0 6px 0' }}>Rincian Tanggal Ketidakhadiran (Alpha):</p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #94a3b8', fontSize: '9pt' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', width: '35px', textAlign: 'center' }}>No</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', width: '130px', textAlign: 'left' }}>Tanggal</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'left' }}>Keterangan / Sesi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.alphaDates.map((item, idx) => (
                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', textAlign: 'center' }}>{idx + 1}</td>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', fontWeight: 500 }}>{item.tanggal}</td>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '4px 8px', color: '#334155' }}>{item.keterangan || 'Tanpa Keterangan (Alpha)'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Khusus Surat Panggilan Orang Tua */}
                {data.tipe === 'PANGGILAN_WALI' && data.jadwalPanggilan && (
                    <table style={{ width: '100%', border: '1px solid #f59e0b', backgroundColor: '#fffbeb', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '10px', fontSize: '10pt' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '8px 12px' }}>
                                    <p style={{ fontWeight: 'bold', color: '#92400e', margin: '0 0 6px 0' }}>Jadwal Kehadiran Wali Santri :</p>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ width: '140px', fontWeight: 600, padding: '2px 0' }}>Hari / Tanggal</td>
                                                <td style={{ width: '15px', padding: '2px 0' }}>:</td>
                                                <td style={{ fontWeight: 'bold', padding: '2px 0' }}>{data.jadwalPanggilan.hariTanggal}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 600, padding: '2px 0' }}>Waktu</td>
                                                <td style={{ padding: '2px 0' }}>:</td>
                                                <td style={{ padding: '2px 0' }}>{data.jadwalPanggilan.waktu} WIB</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 600, padding: '2px 0' }}>Tempat</td>
                                                <td style={{ padding: '2px 0' }}>:</td>
                                                <td style={{ padding: '2px 0' }}>{data.jadwalPanggilan.tempat}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 600, padding: '2px 0' }}>Menghadap</td>
                                                <td style={{ padding: '2px 0' }}>:</td>
                                                <td style={{ padding: '2px 0' }}>{data.jadwalPanggilan.menghadap}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                )}

                {data.catatanTambahan && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderLeft: '3px solid #64748b', fontStyle: 'italic', color: '#1e293b', margin: '10px 0' }}>
                        Catatan Khusus: {data.catatanTambahan}
                    </div>
                )}

                <p style={{ margin: '10px 0 8px 0', textIndent: '24px' }}>
                    Demikian surat ini kami sampaikan. Kami sangat mengharapkan perhatian dan kerjasama yang baik dari Bapak/Ibu Wali Santri demi masa depan pendidikan dan akhlak ananda di pondok pesantren. Atas perhatian dan kerjasamanya, kami haturkan terima kasih.
                </p>
                <p style={{ fontStyle: 'italic', fontWeight: 600, textAlign: 'center', fontSize: '11pt', margin: '10px 0 0 0' }}>
                    Wassalamu’alaikum Warahmatullahi Wabarakatuh
                </p>
            </div>

            {/* Signature Area (Table Layout for Exact 2-Column Word & Print Alignment) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '24px', fontSize: '10pt' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', paddingRight: '10px' }}>
                            {data.mengetahui ? (
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600 }}>Mengetahui,</p>
                                    <p style={{ margin: '2px 0 0 0' }}>{data.mengetahui.jabatan}</p>
                                    <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                                        {settings.stempelPonpesUrl ? (
                                            <img src={settings.stempelPonpesUrl} alt="Stempel" style={{ height: '65px', opacity: 0.75, objectFit: 'contain' }} referrerPolicy="no-referrer" />
                                        ) : (
                                            <div style={{ height: '65px' }}></div>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{data.mengetahui.nama}</p>
                                </div>
                            ) : (
                                <div></div>
                            )}
                        </td>
                        <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', paddingLeft: '10px' }}>
                            <div>
                                <p style={{ margin: 0 }}>{data.tempatSurat || 'Pesantren'}, {dateFormatted}</p>
                                <p style={{ margin: '2px 0 0 0', fontWeight: 600 }}>{data.pejabatPenandatangan.jabatan}</p>
                                <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                                    {!data.mengetahui && settings.stempelPonpesUrl ? (
                                        <img src={settings.stempelPonpesUrl} alt="Stempel" style={{ height: '65px', opacity: 0.75, objectFit: 'contain' }} referrerPolicy="no-referrer" />
                                    ) : (
                                        <div style={{ height: '65px' }}></div>
                                    )}
                                </div>
                                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{data.pejabatPenandatangan.nama}</p>
                                {data.pejabatPenandatangan.nipNiy && (
                                    <p style={{ margin: '2px 0 0 0', fontSize: '9pt', color: '#4b5563' }}>NIY/NIP. {data.pejabatPenandatangan.nipNiy}</p>
                                )}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};
