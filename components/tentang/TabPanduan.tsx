
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';

const PanduanLangkah: React.FC<{ number: number; title: string; children: React.ReactNode; isLast?: boolean; color?: string }> = ({ number, title, children, isLast = false, color = 'teal' }) => {
    const colorClasses: Record<string, string> = {
        teal: 'border-teal-500 bg-teal-50 text-teal-600',
        blue: 'border-blue-500 bg-blue-50 text-blue-600',
        orange: 'border-orange-500 bg-orange-50 text-orange-600',
        purple: 'border-purple-500 bg-purple-50 text-purple-600',
        red: 'border-red-500 bg-red-50 text-red-600',
        green: 'border-green-500 bg-green-50 text-green-600',
    };
    
    const lineColors: Record<string, string> = {
        teal: 'bg-teal-300',
        blue: 'bg-blue-300',
        orange: 'bg-orange-300',
        purple: 'bg-purple-300',
        red: 'bg-red-300',
        green: 'bg-green-300',
    };

    const activeClass = colorClasses[color] || colorClasses.teal;
    const activeLine = lineColors[color] || lineColors.teal;

    return (
        <div className="flex items-start">
            <div className="flex flex-col items-center mr-4 h-full">
                <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 border-2 rounded-full font-bold text-sm md:text-base flex-shrink-0 ${activeClass}`}>
                    {number}
                </div>
                {!isLast && <div className={`w-0.5 h-full ${activeLine} my-1`}></div>}
            </div>
            <div className="pb-8 w-full text-left">
                <h3 className="mb-2 text-base md:text-lg font-bold text-gray-800 flex items-center">{title}</h3>
                <div className="text-gray-600 space-y-3 text-sm leading-relaxed">{children}</div>
            </div>
        </div>
    );
};

export const TabPanduan: React.FC = () => {
    const { showConfirmation, onDeleteSampleData, showToast } = useAppContext();
    const [sampleDataDeleted, setSampleDataDeleted] = useState(false);
    const [showResetConfirmation, setShowResetConfirmation] = useState(false);
    const [resetInput, setResetInput] = useState('');
    const CONFIRM_RESET_TEXT = 'HAPUS SEMUA DATA';

    useEffect(() => {
        const deleted = localStorage.getItem('eSantriSampleDataDeleted') === 'true';
        setSampleDataDeleted(deleted);
    }, []);

    const handleDeleteSampleData = () => {
        showConfirmation(
            'Hapus Semua Data Sampel?',
            'PERHATIAN: Tindakan ini akan MENGHAPUS SEMUA data santri, keuangan, dan kas yang ada saat ini. Data pengaturan akan tetap tersimpan.',
            async () => {
                try {
                    await onDeleteSampleData();
                    localStorage.setItem('eSantriSampleDataDeleted', 'true');
                    setSampleDataDeleted(true);
                    showToast('Data sampel berhasil dihapus. Aplikasi akan dimuat ulang.', 'success');
                    setTimeout(() => window.location.reload(), 2000);
                } catch (error) {
                    showToast('Gagal menghapus data sampel.', 'error');
                }
            },
            { confirmText: 'Ya, Hapus Data Sampel', confirmColor: 'red' }
        );
    };

    const handlePermanentReset = () => {
        showConfirmation(
            'Reset Seluruh Aplikasi?',
            'Anda akan menghapus SEMUA data santri, keuangan, dan kas. Tindakan ini TIDAK DAPAT DIBATALKAN.',
             async () => {
                try {
                    await onDeleteSampleData();
                    showToast('Aplikasi berhasil di-reset. Aplikasi akan dimuat ulang.', 'success');
                    setTimeout(() => window.location.reload(), 2000);
                } catch (error) {
                    showToast('Gagal melakukan reset.', 'error');
                }
            },
            { confirmText: 'Ya, Reset Sekarang', confirmColor: 'red' }
        )
    };

    return (
        <div className="space-y-8 text-left">
            {/* --- HERO SECTION --- */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Panduan Penggunaan Lengkap</h2>
                <p className="text-gray-600">
                    Dokumentasi lengkap penggunaan eSantri Web, mulai dari konfigurasi keamanan hingga manajemen santri tingkat lanjut.
                </p>
            </div>

            {/* --- SAMPLE DATA WARNING --- */}
            {!sampleDataDeleted && (
                <div className="p-4 rounded-lg border-l-4 border-red-500 bg-red-50 text-red-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold flex items-center gap-2"><i className="bi bi-exclamation-triangle-fill"></i> Data Sampel Terdeteksi</h4>
                        <p className="mt-1 text-sm">Aplikasi ini berisi data dummy untuk demonstrasi. Hapus data ini sebelum mulai input data asli.</p>
                    </div>
                    <button onClick={handleDeleteSampleData} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded hover:bg-red-700 whitespace-nowrap">Hapus Data Sampel</button>
                </div>
            )}

            {/* --- BAGIAN 1: SETTING & KEAMANAN --- */}
            <div id="setup" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">1</span>
                    <h2 className="text-lg font-bold text-gray-800">Persiapan & Keamanan Sistem</h2>
                </div>
                
                <PanduanLangkah number={1} title="Konfigurasi Awal (Wajib)" color="purple">
                    <p>Lakukan langkah ini sebelum menggunakan fitur lain:</p>
                    <ol className="list-decimal pl-5 space-y-1 mt-2 bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                        <li><strong>Pengaturan &gt; Umum:</strong> Isi nama yayasan, ponpes, alamat, dan logo. Data ini akan muncul di kop surat dan laporan.</li>
                        <li><strong>Data Master &gt; Tenaga Pendidik:</strong> Input data pengajar, Mudir, dan Wali Kelas.</li>
                        <li><strong>Data Master &gt; Struktur Pendidikan:</strong>
                            <ul className="list-disc pl-5 mt-1 text-xs text-gray-500">
                                <li>Buat <strong>Jenjang</strong> (Misal: Wustho, Ulya).</li>
                                <li>Buat <strong>Kelas</strong> (Misal: Kelas 1, Kelas 2).</li>
                                <li>Buat <strong>Rombel</strong> (Misal: 1A Putra, 1B Putri) dan tetapkan Wali Kelas.</li>
                            </ul>
                        </li>
                    </ol>
                </PanduanLangkah>

                <PanduanLangkah number={2} title="Keamanan: Kunci Pemulihan Darurat" color="purple">
                    <p><strong>Skenario Kritis: Admin Lupa Password & Jawaban Keamanan.</strong></p>
                    <div className="mt-2 p-3 border rounded bg-yellow-50 text-sm space-y-2">
                        <p>Saat Anda mengaktifkan <strong>Mode Multi-User</strong> di <em>Pengaturan &gt; User & Keamanan</em>, sistem akan membuatkan satu <strong>Kunci Pemulihan (Recovery Key)</strong>.</p>
                        <div className="p-2 bg-white border border-red-200 rounded text-red-700 font-mono text-xs">
                            Contoh: ESANTRI-8A92-B3C1-9982
                        </div>
                        <p>
                            <strong>WAJIB DISIMPAN!</strong> Simpan kode ini di tempat aman (Catatan HP atau Kertas). 
                            <br/>Jika Admin Utama terkunci (lupa password DAN jawaban keamanan), satu-satunya cara masuk adalah klik tombol <strong>"Gunakan Kunci Darurat"</strong> di halaman login dan masukkan kode tersebut.
                        </p>
                    </div>
                </PanduanLangkah>
            </div>

            {/* --- BAGIAN 2: MANAJEMEN SANTRI --- */}
            <div id="santri" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-teal-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                    <h2 className="text-lg font-bold text-gray-800">Manajemen Santri (Siklus Hidup)</h2>
                </div>

                <PanduanLangkah number={3} title="Input Data Santri" color="teal">
                    <p>Tiga cara memasukkan data:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Manual:</strong> Klik "Tambah Santri" untuk input detail satu per satu lengkap dengan foto.</li>
                        <li><strong>Editor Massal:</strong> Klik "Tambah Massal" untuk input cepat seperti di Excel (Nama, NIS, Wali).</li>
                        <li><strong>Impor CSV:</strong> Gunakan template CSV untuk migrasi data ratusan santri sekaligus dari aplikasi lain.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={4} title="Skenario: Kenaikan Kelas (Tahun Ajaran Baru)" color="teal">
                    <p>Tidak perlu edit satu per satu. Gunakan fitur massal:</p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 bg-gray-50 p-2 rounded">
                        <li>Buka menu <strong>Data Santri</strong>.</li>
                        <li>Filter santri berdasarkan kelas lama (Misal: Kelas 1A).</li>
                        <li>Centang kotak "Pilih Semua" di header tabel.</li>
                        <li>Klik tombol <strong>Pindah Kelas</strong> yang muncul di atas tabel.</li>
                        <li>Pilih Jenjang, Kelas, dan Rombel tujuan (Misal: Kelas 2A).</li>
                        <li>Klik "Pindahkan". Selesai.</li>
                    </ol>
                </PanduanLangkah>

                <PanduanLangkah number={5} title="Skenario: Kelulusan & Alumni" color="teal">
                    <p>Saat santri lulus atau boyong:</p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 bg-gray-50 p-2 rounded">
                        <li>Pilih santri (bisa massal atau perorangan).</li>
                        <li>Klik <strong>Ubah Status</strong> (Massal) atau Edit Data (Perorangan).</li>
                        <li>Ubah status menjadi <strong>Lulus</strong> atau <strong>Keluar/Pindah</strong>.</li>
                        <li>Isi tanggal status (Tanggal Lulus). Data akan otomatis masuk ke arsip alumni dan tidak muncul di tagihan aktif.</li>
                    </ol>
                </PanduanLangkah>
            </div>

            {/* --- BAGIAN 3: KEUANGAN --- */}
            <div id="finance" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">3</span>
                    <h2 className="text-lg font-bold text-gray-800">Keuangan & Pembayaran</h2>
                </div>

                <PanduanLangkah number={6} title="Setup Biaya & Tagihan" color="blue">
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Komponen Biaya:</strong> Atur di <em>Keuangan &gt; Pengaturan Biaya</em>. Contoh: SPP (Bulanan), Uang Gedung (Sekali Bayar/Cicilan).</li>
                        <li><strong>Generate Tagihan:</strong> Dilakukan setiap awal bulan atau awal tahun ajaran. 
                            <br/>Buka <em>Keuangan &gt; Status Pembayaran &gt; Generate Tagihan</em>.
                            <br/>Sistem akan membuat tagihan massal untuk seluruh santri aktif sesuai jenjangnya.
                        </li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={7} title="Pembayaran & Uang Saku" color="blue">
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Bayar Syahriah:</strong> Cari nama santri di menu Keuangan, klik "Bayar". Centang bulan yang akan dibayar. Otomatis cetak kuitansi.</li>
                        <li><strong>Uang Saku (Tabungan):</strong> Gunakan menu <em>Uang Saku</em>. Bisa Deposit (Wali murid setor uang) atau Penarikan (Santri ambil uang jajan).</li>
                        <li><strong>Buku Kas Umum:</strong> Catat pemasukan lain (donasi) atau pengeluaran pondok (listrik, belanja dapur) di menu <em>Buku Kas</em>.</li>
                    </ul>
                </PanduanLangkah>
            </div>

            {/* --- BAGIAN 4: ADMINISTRASI & LAINNYA --- */}
            <div id="admin" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">4</span>
                    <h2 className="text-lg font-bold text-gray-800">Administrasi & Fitur Lain</h2>
                </div>

                <PanduanLangkah number={8} title="Penerimaan Santri Baru (PSB)" color="orange">
                    <p>Sistem pendaftaran lengkap:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Formulir Online:</strong> Desain formulir di menu <em>PSB &gt; Desain Formulir</em>. Pilih metode WhatsApp atau Google Sheet.</li>
                        <li><strong>Poster AI:</strong> Buat kata-kata promosi dan prompt gambar poster menggunakan AI di menu <em>Poster AI</em>.</li>
                        <li><strong>Rekap & Seleksi:</strong> Data pendaftar masuk ke menu Rekap. Admin bisa melakukan seleksi dan klik "Terima" untuk memindahkan data ke database santri utama secara otomatis.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={9} title="Surat Menyurat (Magic Draft)" color="orange">
                    <p>Membuat surat resmi dalam hitungan detik:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buat template surat (Izin, Undangan, Keterangan Aktif).</li>
                        <li>Gunakan fitur <strong>Magic Draft AI</strong>: Ketik perintah (misal: "Buatkan surat undangan wali santri untuk pengambilan rapor"), AI akan menulis isinya.</li>
                        <li>Gunakan <strong>Mail Merge</strong> untuk mencetak surat masal dengan nama santri yang berbeda-beda secara otomatis.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={10} title="Keasramaan" color="orange">
                    <p>Manajemen hunian santri:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buat Data Gedung dan Kamar (kapasitas).</li>
                        <li>Gunakan menu "Penempatan Santri" untuk memasukkan santri ke kamar secara massal.</li>
                        <li>Cetak Laporan Absensi Asrama atau Label Kamar.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={11} title="Audit Log (Rekam Jejak)" color="orange">
                    <p>Memantau aktivitas sistem:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Menu <strong>Audit Log</strong> mencatat siapa melakukan apa (Tambah, Edit, Hapus).</li>
                        <li>Berguna jika terjadi kesalahan data untuk melacak siapa yang mengubahnya dan kapan.</li>
                    </ul>
                </PanduanLangkah>
            </div>

            {/* --- BAGIAN 5: SINKRONISASI --- */}
            <div id="sync" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">5</span>
                    <h2 className="text-lg font-bold text-gray-800">Sinkronisasi Tim (Hub & Spoke)</h2>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
                    <h4 className="font-bold text-blue-900 text-sm mb-1">Konsep "Pengepul Data"</h4>
                    <p className="text-xs text-blue-800 leading-relaxed">
                        Data tersimpan di laptop masing-masing. Fitur ini memungkinkan <strong>1 Admin Pusat (Server)</strong> mengumpulkan data dari <strong>Banyak Staff (Kontributor)</strong> melalui Dropbox.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-bold text-gray-700 mb-2">SOP Staff (Kontributor)</h4>
                        <ol className="list-decimal pl-5 space-y-1 text-sm bg-gray-50 p-3 rounded">
                            <li><strong>PAGI:</strong> Klik <em>Sync Cloud &gt; Ambil Master Data</em>. (Wajib agar ID data sinkron).</li>
                            <li><strong>KERJA:</strong> Input pembayaran, data santri, dll seperti biasa.</li>
                            <li><strong>SORE:</strong> Klik <em>Sync Cloud &gt; Kirim Perubahan</em>. Data dikirim ke Inbox Admin.</li>
                        </ol>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-700 mb-2">SOP Admin Pusat (Pengepul)</h4>
                        <ol className="list-decimal pl-5 space-y-1 text-sm bg-gray-50 p-3 rounded">
                            <li>Buka menu <strong>Pusat Sync</strong>. Klik "Segarkan".</li>
                            <li>Lihat file kiriman Staff. Klik <strong>Gabung</strong> pada setiap file. Sistem akan menggabungkan data secara cerdas (data terbaru menang).</li>
                            <li>Setelah semua digabung, klik <strong>Publikasikan Master</strong> agar Staff bisa mengambil data terbaru besok pagi.</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* --- ZONA BAHAYA --- */}
            <div className="mt-8 p-6 border rounded-xl bg-gray-50">
                <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
                    <i className="bi bi-hdd-fill"></i> Manajemen Data Lokal (Penting!)
                </h3>
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                    Data aplikasi tersimpan di <strong>Browser Cache (IndexedDB)</strong> laptop Anda. Jika Anda melakukan "Clear History/Cache" atau meng-uninstall browser, <strong>DATA BISA HILANG</strong> jika belum di-backup.
                </p>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => window.location.href='/#/Pengaturan'} className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 shadow-sm flex items-center gap-2">
                        <i className="bi bi-download"></i> Backup Data Manual (JSON)
                    </button>
                    {sampleDataDeleted && (
                        <button onClick={() => setShowResetConfirmation(true)} className="px-4 py-2 bg-white text-red-700 rounded text-sm hover:bg-red-50 border border-red-300 flex items-center gap-2">
                            <i className="bi bi-trash"></i> Reset Aplikasi (Format Factory)
                        </button>
                    )}
                </div>

                {showResetConfirmation && (
                    <div className="mt-4 p-4 border border-red-300 bg-white rounded animate-fade-in-down shadow-sm max-w-md">
                        <label className="block text-sm font-bold text-red-600 mb-1">Konfirmasi Reset Total</label>
                        <p className="text-xs text-gray-500 mb-2">Ketik "<strong>{CONFIRM_RESET_TEXT}</strong>" untuk menghapus permanen.</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={resetInput}
                                onChange={(e) => setResetInput(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full"
                            />
                            <button
                                onClick={handlePermanentReset}
                                disabled={resetInput !== CONFIRM_RESET_TEXT}
                                className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                HAPUS PERMANEN
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
