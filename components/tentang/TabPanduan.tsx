
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
        indigo: 'border-indigo-500 bg-indigo-50 text-indigo-600',
        gray: 'border-gray-500 bg-gray-50 text-gray-600',
        black: 'border-gray-800 bg-gray-100 text-gray-800',
    };
    
    const lineColors: Record<string, string> = {
        teal: 'bg-teal-300',
        blue: 'bg-blue-300',
        orange: 'bg-orange-300',
        purple: 'bg-purple-300',
        red: 'bg-red-300',
        green: 'bg-green-300',
        indigo: 'bg-indigo-300',
        gray: 'bg-gray-300',
        black: 'bg-gray-400',
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

    return (
        <div className="space-y-8 text-left">
            {/* --- HERO SECTION --- */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Panduan Penggunaan Lengkap</h2>
                <p className="text-gray-600">
                    Dokumentasi teknis penggunaan eSantri Web. Pelajari cara mengelola data santri, keuangan, akademik, dan fitur lanjutan lainnya.
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
                
                <PanduanLangkah number={1} title="Konfigurasi Data Lembaga" color="purple">
                    <p>Lakukan langkah ini sebelum menggunakan fitur lain:</p>
                    <ol className="list-decimal pl-5 space-y-1 mt-2 bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                        <li>Buka menu <strong>Pengaturan &gt; Umum</strong>. Isi data lengkap yayasan dan pesantren (Nama, Alamat, Logo).</li>
                        <li>Buka menu <strong>Data Master &gt; Tenaga Pendidik</strong>. Gunakan tombol <strong>"Tambah Banyak (Tabel)"</strong> untuk menginput daftar guru, jabatan, dan tanggal mulai tugas secara massal.</li>
                        <li>Buka menu <strong>Data Master &gt; Struktur Pendidikan</strong>.
                            <ul className="list-disc pl-4 mt-1 text-xs text-gray-500">
                                <li>Isi <strong>Jenjang</strong> terlebih dahulu (misal: Salafiyah Wustho).</li>
                                <li>Isi <strong>Kelas</strong>. Gunakan "Tambah Banyak" untuk input Kelas 1, 2, 3 sekaligus dan memilih Jenjang Induknya di tabel.</li>
                                <li>Isi <strong>Rombel</strong>. Gunakan "Tambah Banyak" untuk membuat kelas paralel (1A, 1B, dll) dan pilih Kelas Induk & Wali Kelasnya.</li>
                            </ul>
                        </li>
                    </ol>
                </PanduanLangkah>

                <PanduanLangkah number={2} title="Keamanan: Aktivasi Mode Multi-User" color="purple">
                    <p>Secara default, aplikasi ini berjalan tanpa login. <strong>Sangat disarankan</strong> mengaktifkan Mode Multi-User di menu <em>Pengaturan &gt; User & Keamanan</em>.</p>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-blue-50 p-3 rounded border border-blue-100">
                            <h4 className="font-bold text-blue-800 mb-1"><i className="bi bi-shield-check"></i> Keamanan Data</h4>
                            <p>Mencegah orang tidak berwenang mengakses data santri atau keuangan jika laptop ditinggal.</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded border border-green-100">
                            <h4 className="font-bold text-green-800 mb-1"><i className="bi bi-person-fill-lock"></i> Pembagian Tugas</h4>
                            <p>Buat akun khusus Staff (misal: Bendahara) yang hanya bisa akses menu Keuangan, tapi tidak bisa hapus data Santri.</p>
                        </div>
                         <div className="bg-orange-50 p-3 rounded border border-orange-100">
                            <h4 className="font-bold text-orange-800 mb-1"><i className="bi bi-activity"></i> Audit Trail</h4>
                            <p>Sistem mencatat siapa yang melakukan perubahan data di menu <strong>Log Aktivitas</strong>.</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded border border-red-100">
                            <h4 className="font-bold text-red-800 mb-1"><i className="bi bi-key-fill"></i> Kunci Darurat</h4>
                            <p>Saat aktivasi, Anda akan dapat <strong>Kunci Pemulihan</strong>. Simpan baik-baik untuk reset password Admin jika lupa.</p>
                        </div>
                    </div>
                </PanduanLangkah>
            </div>
            
            {/* --- SOP MULTI-ADMIN (Updated) --- */}
            <div id="sop" className="bg-white p-6 rounded-lg border shadow-sm border-l-4 border-l-gray-800">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">SOP</span>
                    <h2 className="text-lg font-bold text-gray-800">SOP Multi-Admin (Hub & Spoke)</h2>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm mb-6 text-yellow-900">
                    <i className="bi bi-info-circle-fill mr-2"></i>
                    <strong>PENTING:</strong> Aplikasi ini <em>Offline-First</em>. Data tidak berubah secara real-time (seperti Google Docs). Anda harus mengikuti SOP ini agar data antar komputer sinkron.
                </div>

                <PanduanLangkah number={1} title="Konsep: Pusat (Hub) & Cabang (Spoke)" color="black">
                     <ul className="list-disc pl-5 space-y-2 text-sm mt-1">
                         <li><strong>Admin Pusat (Hub):</strong> Laptop Utama. Pemegang "Kebenaran Data". Tugasnya menerima data dari staff, menggabungkannya, dan membagikan data Master terbaru.</li>
                         <li><strong>Staff (Spoke):</strong> Laptop Pendukung. Tugasnya input data harian (bayar SPP, input santri baru) dan menyetorkannya ke Pusat.</li>
                     </ul>
                </PanduanLangkah>

                <PanduanLangkah number={2} title="Aktivasi & Pairing (Satu Kali Saja)" color="black">
                    <ol className="list-decimal pl-5 space-y-2 text-sm mt-1 bg-gray-50 p-3 rounded border">
                        <li><strong>Di Laptop Admin Pusat:</strong> Buka <em>Pengaturan &gt; Sync Cloud</em>. Login Dropbox. Buat Akun User untuk Staff di menu <em>User & Keamanan</em>.</li>
                        <li>Klik tombol <strong>"Bagikan Akses (Pairing Code)"</strong>. Salin kode yang muncul.</li>
                        <li><strong>Di Laptop Staff:</strong> Buka menu Sync Cloud. Paste kode tersebut di kolom <strong>"Setup Cepat"</strong>. Klik Hubungkan.</li>
                        <li>Sistem otomatis mengunduh semua data terbaru dari Pusat. Setelah selesai, klik <strong>OK</strong> dan login menggunakan akun yang sudah dibuatkan Admin.</li>
                    </ol>
                </PanduanLangkah>

                <PanduanLangkah number={3} title="SOP Harian: Alur Kerja Staff" color="black">
                    <div className="space-y-3">
                        <div className="border-l-4 border-green-500 pl-3 py-1 bg-green-50">
                            <h4 className="font-bold text-green-800 text-sm">PAGI HARI (Sebelum Mulai Kerja)</h4>
                            <p className="text-xs">Klik tombol <strong>Sync Cloud &gt; Ambil Master Data</strong>. Ini memastikan Anda bekerja dengan data terbaru yang sudah disahkan Admin.</p>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50">
                            <h4 className="font-bold text-blue-800 text-sm">SIANG HARI (Saat Bekerja)</h4>
                            <p className="text-xs">Lakukan input data seperti biasa (Terima Pembayaran, Input Santri). Bisa dilakukan tanpa internet.</p>
                        </div>
                        <div className="border-l-4 border-orange-500 pl-3 py-1 bg-orange-50">
                            <h4 className="font-bold text-orange-800 text-sm">SORE HARI (Sebelum Pulang)</h4>
                            <p className="text-xs">Pastikan ada internet. Klik tombol <strong>Sync Cloud &gt; Kirim Perubahan</strong>. Ini akan mengirim pekerjaan Anda hari ini ke "Inbox" Admin.</p>
                        </div>
                    </div>
                </PanduanLangkah>

                <PanduanLangkah number={4} title="SOP Harian: Alur Kerja Admin Pusat" color="black">
                    <p className="text-sm mb-2">Dilakukan sore hari setelah semua staff melakukan "Kirim Perubahan".</p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 border p-3 rounded">
                        <li>Buka menu <strong>Pusat Sync</strong> di sidebar (muncul jika login sebagai Admin).</li>
                        <li>Klik <strong>Segarkan</strong> untuk melihat file kiriman Staff.</li>
                        <li>Klik <strong>Gabung</strong> pada setiap file yang masuk. Sistem akan menggabungkan data staff ke database pusat secara cerdas.</li>
                        <li>Setelah semua file digabung, klik tombol biru besar: <strong>Publikasikan Master</strong>.</li>
                        <li>Selesai. Data Master di Cloud sudah terupdate dan siap diambil Staff besok pagi.</li>
                    </ol>
                </PanduanLangkah>
            </div>

            {/* --- BAGIAN 2: MANAJEMEN SANTRI --- */}
            <div id="santri" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-teal-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                    <h2 className="text-lg font-bold text-gray-800">Manajemen Santri</h2>
                </div>

                <PanduanLangkah number={5} title="Input Data Santri" color="teal">
                    <p>Tiga cara memasukkan data:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Manual:</strong> Klik "Tambah Santri" untuk input detail satu per satu lengkap dengan foto.</li>
                        <li><strong>Tambah Massal:</strong> Klik "Tambah Massal" untuk input cepat dalam bentuk tabel (seperti Excel) langsung di aplikasi.</li>
                        <li><strong>Impor CSV:</strong> Gunakan template CSV untuk migrasi data ratusan santri sekaligus dari aplikasi lain.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={6} title="Kenaikan Kelas & Alumni" color="teal">
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Pindah Kelas Massal:</strong> Di menu Data Santri, filter kelas lama, centang semua (klik checkbox di header), klik tombol <strong>Pindah Kelas</strong> yang muncul di atas tabel.</li>
                        <li><strong>Kelulusan:</strong> Pilih santri, klik <strong>Ubah Status</strong>, pilih 'Lulus'. Data akan diarsipkan sebagai alumni dan tidak muncul di tagihan aktif.</li>
                    </ul>
                </PanduanLangkah>
            </div>

            {/* --- BAGIAN 3: AKADEMIK & RAPOR --- */}
            <div id="akademik" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">3</span>
                    <h2 className="text-lg font-bold text-gray-800">Akademik & Rapor Digital</h2>
                </div>
                
                <div className="bg-indigo-50 p-3 rounded mb-4 text-sm text-indigo-900 border border-indigo-200">
                    <p><strong>Konsep Unik:</strong> Admin mendesain rapor, Guru mengisi nilai lewat file HTML (bisa di HP/Offline), lalu Guru mengirim nilai kembali ke Admin via WhatsApp.</p>
                </div>

                <PanduanLangkah number={7} title="1. Desain Grid Rapor" color="indigo">
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Akademik &gt; Desain Grid</strong>.</li>
                        <li>Buat Template baru atau Import dari Excel.</li>
                        <li>Gunakan kode variabel seperti <code>$NAMA</code>, <code>$NIS</code>, atau buat kode input sendiri seperti <code>$NILAI_UH1</code>.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={8} title="2. Generate Formulir Guru" color="indigo">
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Masuk ke tab <strong>Generate Formulir</strong>.</li>
                        <li>Pilih Rombel dan Template.</li>
                        <li>Pilih metode pengiriman (WhatsApp / Hybrid).</li>
                        <li>Download file HTML dan kirimkan ke Guru Mapel/Wali Kelas.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={9} title="3. Proses Pengisian Nilai (Oleh Guru)" color="indigo">
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 bg-gray-50 p-2 rounded">
                        <li>Guru membuka file HTML di browser HP/Laptop (Offline).</li>
                        <li>Guru mengisi nilai santri. Rumus rata-rata akan terhitung otomatis.</li>
                        <li>Klik <strong>"Kirim Nilai"</strong>. WhatsApp akan terbuka berisi kode data terenkripsi.</li>
                        <li>Guru mengirim pesan tersebut ke nomor Admin.</li>
                    </ol>
                </PanduanLangkah>

                <PanduanLangkah number={10} title="4. Import & Cetak (Oleh Admin)" color="indigo">
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Admin menyalin kode pesan dari Guru (diawali <code>RAPOR_V2_START</code>).</li>
                        <li>Paste di menu <strong>Akademik &gt; Import Nilai</strong>.</li>
                        <li>Buka tab <strong>Cetak Rapor</strong> untuk mencetak rapor fisik (PDF) atau arsip.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={11} title="5. Monitoring Progress (Audit)" color="indigo">
                    <p className="text-sm mb-1">Fitur ini membantu Admin memantau kelengkapan nilai:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>Buka menu <strong>Akademik &gt; Monitoring</strong>.</li>
                        <li>Lihat diagram batang untuk setiap Rombel.</li>
                        <li><span className="text-green-600 font-bold">Hijau</span> = Nilai Lengkap (Semua Santri sudah ada nilainya).</li>
                        <li><span className="text-yellow-600 font-bold">Kuning</span> = Masih sebagian (Sedang proses input).</li>
                        <li><span className="text-red-600 font-bold">Merah</span> = Belum ada data masuk sama sekali.</li>
                    </ul>
                </PanduanLangkah>
            </div>

            {/* --- BAGIAN 4: KEUANGAN --- */}
            <div id="finance" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">4</span>
                    <h2 className="text-lg font-bold text-gray-800">Keuangan & Pembayaran</h2>
                </div>

                <PanduanLangkah number={12} title="Siklus Tagihan & Pembayaran" color="blue">
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Pengaturan Biaya:</strong> Buat komponen biaya (SPP, Uang Gedung) di menu <em>Keuangan &gt; Pengaturan Biaya</em>.</li>
                        <li><strong>Generate Tagihan:</strong> Buka <em>Status Pembayaran &gt; Generate Tagihan</em>. Lakukan setiap awal bulan untuk SPP.</li>
                        <li><strong>Pembayaran:</strong> Cari santri di Status Pembayaran, klik tombol <strong>"Bayar"</strong>, centang bulan yang dibayar. Kuitansi tercetak otomatis.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={13} title="Uang Saku & Tabungan" color="blue">
                    <p>Fitur untuk mengelola uang jajan santri (Tabungan):</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka tab <strong>Uang Saku</strong>.</li>
                        <li>Klik <strong>Deposit</strong> saat wali santri menitipkan uang.</li>
                        <li>Klik <strong>Penarikan</strong> saat santri mengambil uang jajan.</li>
                        <li>Cetak laporan "Rekening Koran" untuk laporan ke wali santri.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={14} title="Setoran Kas (Closing Harian)" color="blue">
                    <p>Penting untuk validasi uang fisik kasir:</p>
                    <ol className="list-decimal pl-5 space-y-1 text-sm mt-1 bg-gray-50 p-2 rounded">
                        <li>Uang yang diterima kasir (SPP/Uang Saku) masuk status "Di Laci Kasir" (Pending).</li>
                        <li>Buka menu <strong>Setoran Kas</strong> di sore hari.</li>
                        <li>Centang semua transaksi hari itu, klik <strong>"Setor ke Buku Kas"</strong>.</li>
                        <li>Uang resmi masuk ke Saldo Pondok (Buku Kas Umum).</li>
                    </ol>
                </PanduanLangkah>
            </div>

             {/* --- BAGIAN 5: KEASRAMAAN --- */}
            <div id="asrama" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">5</span>
                    <h2 className="text-lg font-bold text-gray-800">Keasramaan</h2>
                </div>

                <PanduanLangkah number={15} title="Manajemen Kamar" color="orange">
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka menu <strong>Keasramaan &gt; Manajemen Asrama</strong>.</li>
                        <li>Tambah Gedung (Putra/Putri) dan Kamar beserta kapasitasnya.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={16} title="Penempatan Santri" color="orange">
                     <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li>Buka tab <strong>Penempatan Santri</strong>.</li>
                        <li>Pilih santri dari daftar "Tanpa Kamar" (bisa filter per kelas).</li>
                        <li>Klik tombol "Tempatkan" pada kartu kamar yang tersedia.</li>
                    </ul>
                </PanduanLangkah>
            </div>

            {/* --- BAGIAN 6: ADMINISTRASI (SURAT & PSB) --- */}
            <div id="admin" className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">6</span>
                    <h2 className="text-lg font-bold text-gray-800">PSB & Surat Menyurat</h2>
                </div>

                 <PanduanLangkah number={17} title="Penerimaan Santri Baru (PSB)" color="green">
                    <div className="mb-2">Gunakan menu <strong>PSB</strong> untuk mengelola pendaftaran santri baru secara online/offline.</div>
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                         <li><strong>Desain Formulir:</strong> Buat formulir pendaftaran custom di menu <em>Desain Formulir Online</em>.</li>
                         <li><strong>Smart Script:</strong> Anda cukup menggunakan <strong>SATU Google Apps Script</strong> untuk banyak jenis formulir. Sistem akan otomatis memisahkan data ke Tab (Sheet) yang berbeda di Google Spreadsheet berdasarkan nama formulir.</li>
                         <li><strong>Metode Hybrid:</strong> Pilih metode "Hybrid" agar data tersimpan otomatis ke Cloud (Google Sheet) sekaligus mengirim notifikasi & data backup ke WhatsApp Admin.</li>
                         <li><strong>Rekap & Seleksi:</strong> Kelola data masuk di menu <em>Rekap Pendaftar</em>. Klik tombol "Terima" untuk memindahkan pendaftar resmi menjadi Santri Aktif secara otomatis.</li>
                    </ul>
                </PanduanLangkah>

                <PanduanLangkah number={18} title="Surat Menyurat & Arsip" color="green">
                    <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                        <li><strong>Template Editor:</strong> Buat template surat (Izin, Undangan, Keterangan) dengan editor teks lengkap. Gunakan variabel <code>{'{NAMA_SANTRI}'}</code> agar data terisi otomatis.</li>
                        <li><strong>Magic Draft (AI):</strong> Gunakan fitur AI untuk membuatkan draf bahasa surat yang sopan dan formal secara instan.</li>
                        <li><strong>Cetak Massal:</strong> Cetak surat untuk satu kelas sekaligus (Mail Merge) dengan satu klik.</li>
                    </ul>
                </PanduanLangkah>
            </div>
        </div>
    );
};
