import React from 'react';
import { PanduanSectionData } from '../panduan';

export const financePanduan: PanduanSectionData = {
    id: 'finance',
    badge: 9,
    badgeColor: 'blue',
    title: 'Keuangan Santri, Buku Kas Multi-Pos & SOP Multi-Admin (Real-Time vs Hub & Spoke)',
    steps: [
        {
            title: 'Ikhtisar Ekosistem Keuangan Terpadu & Keamanan Audit',
            color: 'blue',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Modul <strong>Keuangan &amp; Buku Kas Umum</strong> di eSantri Web dirancang khusus untuk memenuhi standar akuntabilitas pondok pesantren modern. Seluruh alur uang masuk dan keluar saling terhubung secara otomatis—mulai dari <strong>Tagihan Santri (SPP/Syahriah &amp; Uang Pangkal)</strong>, <strong>Tabungan / Uang Saku Santri</strong>, <strong>Setoran Laci Kasir</strong>, <strong>Penggajian Asatidz (Payroll)</strong>, hingga <strong>Buku Kas Umum Multi-Pos Rekening</strong>.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 space-y-1">
                            <strong className="text-blue-950 flex items-center gap-1.5 text-xs font-bold">
                                <i className="bi bi-pie-chart-fill text-blue-600"></i> Rasio Kolektibilitas &amp; Proyeksi
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Dashboard menampilkan persentase <strong>Tingkat Kolektibilitas Tagihan (%)</strong> secara <em>real-time</em> beserta grafik perbandingan penerimaan aktual vs proyeksi 6 bulan ke depan.
                            </p>
                        </div>
                        <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-1">
                            <strong className="text-amber-950 flex items-center gap-1.5 text-xs font-bold">
                                <i className="bi bi-safe2-fill text-amber-600"></i> Kontrol Laci Kasir (Unsettled Cash)
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Setiap pembayaran santri yang diterima kasir namun belum disetorkan ke bendahara utama akan memunculkan <strong>Banner Peringatan Kas Laci Belum Disetor</strong> di Dashboard.
                            </p>
                        </div>
                        <div className="bg-teal-50/80 p-3 rounded-xl border border-teal-200 space-y-1">
                            <strong className="text-teal-950 flex items-center gap-1.5 text-xs font-bold">
                                <i className="bi bi-bank2 text-teal-600"></i> Buku Kas Multi-Pos Rekening
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Memisahkan posisi saldo fisik antara <strong>Kas Tunai Bendahara</strong>, <strong>Bank BSI</strong>, <strong>Bank Muamalat</strong>, <strong>Bank BRI/Mandiri</strong>, dan <strong>Kas Kecil Operasional</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 text-xs text-red-950 flex items-start gap-2.5">
                        <i className="bi bi-shield-lock-fill text-red-600 text-base shrink-0 mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-red-900 block mb-0.5">Prinsip Wajib Akuntabilitas Keuangan Pesantren:</strong>
                            Data keuangan, tabungan uang saku, dan penggajian sangat sensitif. <strong>Dilarang menggunakan satu akun Admin bersama-sama</strong> untuk banyak kasir. Buat akun terpisah untuk setiap staf bendahara/kasir di menu <em>Pengaturan &gt; Manajemen Akun</em> agar setiap kuitansi, pemotongan saldo, dan mutasi kas merekam nama petugas penanggung jawab secara akurat (<em>Audit Trail</em>).
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: 'Siklus Tagihan, Pembayaran Cicilan (Partial Payment) & Potong Saldo Uang Saku',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Sistem mendukung fleksibilitas penuh dalam penagihan dan penerimaan pembayaran dari wali santri, baik pelunasan penuh, pembayaran bertahap (cicilan), maupun pemotongan langsung dari tabungan uang saku santri:
                    </p>

                    <div className="space-y-2.5 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <h5 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                                Pengaturan Komponen Biaya &amp; Generate Tagihan Bebas Duplikasi
                            </h5>
                            <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                <li>Buka tab <strong>Pengaturan Biaya</strong> untuk membuat komponen biaya dengan 3 tipe: <strong>Bulanan</strong> (SPP/Syahriah/Makan), <strong>Sekali Bayar</strong> (Seragam/Kitab), atau <strong>Cicilan Terjadwal</strong> (Uang Gedung/Pangkal yang otomatis dibagi ke beberapa termin).</li>
                                <li>Buka tab <strong>Status Pembayaran</strong> lalu klik <strong>Generate Tagihan</strong>: pilih <em>Tagihan Bulanan</em> (setiap awal bulan) atau <em>Tagihan Awal Masuk</em> (untuk santri baru). Sistem otomatis melewati (<em>skip</em>) santri yang sudah memiliki tagihan di periode tersebut sehingga aman dari tagihan ganda.</li>
                            </ul>
                        </div>

                        <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 space-y-1.5">
                            <h5 className="font-bold text-teal-950 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                                Fitur Pembayaran Cicilan / Parsial (Partial Payment)
                            </h5>
                            <p className="text-gray-700 leading-relaxed">
                                Ketika wali santri membayar sebagian dari total nominal tagihan (misal tagihan Uang Pangkal Rp 800.000 baru dibayar Rp 150.000):
                            </p>
                            <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                                <li>Klik tombol <strong>Bayar</strong> pada baris nama santri di tab <em>Status Pembayaran</em>.</li>
                                <li>Centang item tagihan yang akan dibayar, lalu ketik langsung nominal yang dibayarkan pada kolom <strong>Bayar / Cicil (Rp)</strong> (atau gunakan tombol cepat <code>50%</code> / <code>Penuh</code>).</li>
                                <li>Saat disimpan, sistem secara otomatis <strong>memecah tagihan</strong> menjadi 2 bagian:
                                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-teal-900">
                                        <li>Bagian yang dibayar (Rp 150.000) langsung berstatus <strong>Lunas</strong> dan tercetak di kuitansi resmi.</li>
                                        <li>Sisa tagihan (Rp 650.000) otomatis menjadi baris tagihan <strong>Belum Lunas</strong> baru dengan lencana progres <code>Cicilan: Terbayar Rp 150.000 dari Rp 800.000</code>.</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-1">
                                <strong className="text-indigo-950 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-wallet2 text-indigo-600"></i> Metode "Potong Saldo" Uang Saku
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Jika wali santri menitipkan dana lebih di tabungan uang saku dan meminta agar SPP dipotong dari saldo tersebut, pilih metode <strong>Potong Saldo</strong>. Sistem menampilkan saldo uang saku saat ini, memvalidasi kecukupan dana, memotong saldo santri, dan mencatat riwayat penarikan otomatis di <em>Rekening Koran Uang Saku</em>.
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1">
                                <strong className="text-emerald-950 flex items-center gap-1.5 font-bold">
                                    <i className="bi bi-lightning-charge-fill text-emerald-600"></i> Opsi "Langsung Masuk Buku Kas"
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Untuk pembayaran via <strong>Transfer Bank</strong> yang langsung masuk ke rekening pondok, centang opsi <em>"Langsung catat ke Buku Kas Umum"</em> dan pilih rekening bank tujuan (misal <code>Bank BSI</code>). Transaksi langsung tercatat di Buku Kas tanpa perlu disetor ulang di menu Setoran Kas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: 'Manajemen Uang Saku (Tabungan Santri) & Kontrol Limit Jajan Harian',
            color: 'purple',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Tab <strong>Uang Saku</strong> membantu pesantren mengelola dana titipan orang tua secara transparan serta mendidik pola hidup hemat santri melalui fitur pembatasan penarikan harian:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                        <li>
                            <strong>4 Kartu Indikator Utama (KPI):</strong> Pantau seketika <em>Total Dana Titipan Uang Saku</em> seluruh santri, <em>Setoran Masuk Hari Ini</em>, <em>Penarikan Hari Ini</em>, serta jumlah <em>Santri Saldo Rendah (&lt; Rp 20.000)</em>.
                        </li>
                        <li>
                            <strong>Pengaturan Limit Penarikan Harian per Santri:</strong> Klik ikon pensil pada kolom <strong>Limit Harian &amp; Penarikan Hari Ini</strong> untuk menetapkan batas maksimal jajan harian santri (tersedia tombol cepat <code>Rp 10rb</code>, <code>Rp 15rb</code>, <code>Rp 20rb</code>, <code>Rp 25rb</code>, <code>Rp 50rb</code>, atau <code>Tanpa Limit</code>).
                        </li>
                        <li>
                            <strong>Kontrol &amp; Peringatan Limit Otomatis:</strong> Tabel menampilkan <em>progress bar</em> pemakaian kuota harian masing-masing santri. Jika santri menarik uang melebihi sisa kuota hariannya atau melebihi saldo tabungan, modal transaksi otomatis menampilkan peringatan kepada petugas.
                        </li>
                        <li>
                            <strong>Cetak Rekening Koran &amp; Ekspor Excel:</strong> Klik <em>Riwayat</em> untuk melihat buku mutasi lengkap per santri, gunakan fitur <em>Cetak Laporan Uang Saku</em> untuk dibagikan ke wali santri, atau klik <strong>Ekspor Excel</strong> untuk mengunduh rekapitulasi saldo seluruh santri.
                        </li>
                    </ul>
                </div>
            )
        },
        {
            title: 'Setoran Kasir (Closing Harian), Buku Kas Multi-Pos & Mutasi Kas',
            color: 'green',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                            <h5 className="font-bold text-amber-950 flex items-center gap-1.5">
                                <i className="bi bi-box-arrow-in-down-right text-amber-600 text-sm"></i>
                                1. Setoran Kasir (Closing Harian)
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Setiap pembayaran SPP/Tagihan di loket kasir secara default berstatus <em>"Belum Disetor (Di Laci Kasir)"</em> hingga divalidasi oleh Bendahara Utama:
                            </p>
                            <ol className="list-decimal pl-4 space-y-1 text-gray-700">
                                <li>Buka tab <strong>Setoran Kas</strong>. Gunakan mode <strong>Semua Tanggal Belum Disetor</strong> untuk memastikan tidak ada uang kasir dari hari-hari sebelumnya yang terlupa disetor, atau pilih <strong>Filter per Tanggal</strong>.</li>
                                <li>Pilih <strong>Pos Kas / Rekening Tujuan</strong> (misal <code>Kas Tunai Bendahara</code> atau <code>Bank BSI</code>).</li>
                                <li>Centang transaksi yang uang fisiknya sudah cocok, lalu klik <strong>Setor ke Buku Kas</strong>.</li>
                            </ol>
                        </div>

                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                            <h5 className="font-bold text-emerald-950 flex items-center gap-1.5">
                                <i className="bi bi-arrow-left-right text-emerald-600 text-sm"></i>
                                2. Buku Kas Multi-Pos &amp; Mutasi Antar Kas
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Menu <strong>Buku Kas</strong> menampilkan kartu saldo terpisah untuk setiap Pos Rekening sekaligus <strong>Saldo Akhir Gabungan</strong>:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-gray-700">
                                <li><strong>Filter per Pos Kas:</strong> Klik langsung salah satu kartu rekening di bagian atas (misal <code>Bank BSI</code>) untuk menyaring mutasi khusus rekening tersebut.</li>
                                <li><strong>Tombol Mutasi Kas:</strong> Gunakan saat memindahkan dana antar rekening internal (misal menyetor uang tunai Rp 10.000.000 dari <code>Kas Tunai Bendahara</code> ke <code>Bank BSI</code>). Sistem otomatis mencatat Pengeluaran di pos asal dan Pemasukan di pos tujuan secara seimbang.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: 'Penggajian (Payroll), Bagan Akun (COA) & Analisa Umur Piutang',
            color: 'orange',
            content: (
                <div className="space-y-2.5 text-xs text-gray-700">
                    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                        <strong className="text-gray-900 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-person-Vcard-fill text-orange-600"></i> Penggajian Guru &amp; Staf (Payroll Terintegrasi Jadwal)
                        </strong>
                        <p className="text-gray-600 leading-relaxed">
                            Atur komponen <em>Gaji Pokok</em>, <em>Tunjangan Jabatan</em>, dan <em>Honor per Jam (JTM)</em> di tab <strong>Penggajian &gt; Konfigurasi</strong>. Saat menekan <strong>Hitung Estimasi</strong> pada tab <em>Generate Gaji</em>, sistem otomatis menghitung jumlah jam mengajar tiap ustadz dari modul Jadwal Pelajaran. Klik <strong>Posting Keuangan &amp; Bayar</strong> untuk menyimpan slip gaji sekaligus mencatat pengeluaran di Buku Kas secara otomatis.
                        </p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                        <strong className="text-gray-900 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-clock-history text-red-600"></i> Laporan Umur Piutang (Aging Report) &amp; Penagihan WhatsApp
                        </strong>
                        <p className="text-gray-600 leading-relaxed">
                            Tab <strong>Laporan &amp; Surat &gt; Analisa Umur Piutang</strong> mengelompokkan tunggakan santri berdasarkan tingkat keterlambatan: <code>0-30 Hari (Lancar)</code>, <code>31-60 Hari (Perhatian Khusus)</code>, <code>61-90 Hari (Kurang Lancar)</code>, dan <code>&gt; 90 Hari (Macet)</code>. Bendahara dapat langsung mengirim pengingat WhatsApp per santri, mencetak Surat Tagihan Resmi PDF, atau mengunduh <strong>Ekspor Excel</strong> untuk rapat evaluasi pimpinan.
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: 'SOP Standar Multi-Admin Keuangan: Cloud Real-Time vs Hub-and-Spoke',
            color: 'indigo',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-diagram-3-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900 block mb-0.5">Standar Operasional Prosedur (SOP) Multi-Bendahara &amp; Kasir Loket:</strong>
                            Seluruh fitur baru keuangan—termasuk <strong>Pecah Tagihan Cicilan</strong>, <strong>Potong Saldo Uang Saku</strong>, <strong>Limit Harian</strong>, dan <strong>Buku Kas Multi-Pos</strong>—telah diaudit dan dioptimalkan untuk berjalan aman di 3 lapisan penyimpanan: <strong>Local (Dexie IndexedDB)</strong>, <strong>Cloud Real-Time (Firebase Firestore)</strong>, dan <strong>Cloud Hub-and-Spoke (Dropbox / WebDAV)</strong>. Patuhi SOP berikut sesuai arsitektur yang digunakan pondok Anda:
                        </div>
                    </div>

                    {/* Model A: Cloud Real-Time */}
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                            <h5 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-black">A</span>
                                Model A: SOP Cloud Real-Time (Firebase Firestore Terpadu)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Online Real-Time</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Direkomendasikan apabila kantor Bendahara Pusat, Loket Kasir Putra/Putri, dan Loket Uang Saku terhubung ke internet/WiFi pondok.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-2xs space-y-1">
                                <strong className="text-emerald-950 block font-semibold">
                                    <i className="bi bi-broadcast-pin text-emerald-600"></i> Sinkronisasi Instan Lintas Loket
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Saat Kasir Loket menerima pembayaran cicilan atau memotong saldo uang saku, perubahan status tagihan, saldo tabungan (<code>saldoSantri</code>), dan laci kasir langsung ter-update di layar Bendahara Utama dalam hitungan detik tanpa perlu muat ulang halaman.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-2xs space-y-1">
                                <strong className="text-emerald-950 block font-semibold">
                                    <i className="bi bi-calculator-fill text-emerald-600"></i> Kalkulasi Saldo Kas Dinamis Anti-Bentrok
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Meskipun dua bendahara menginput pengeluaran kas atau mutasi antar rekening secara bersamaan dari komputer berbeda, sistem menghitung posisi saldo setiap Pos Rekening secara dinamis dari akumulasi seluruh transaksi aktif sehingga saldo akhir tidak pernah selisih.
                                </p>
                            </div>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-[11px] text-gray-700 space-y-1">
                            <strong className="text-emerald-900 font-bold block">Alur Kerja Harian Mode Real-Time:</strong>
                            <ol className="list-decimal pl-4 space-y-0.5">
                                <li><strong>Generate Tagihan Terpusat:</strong> Hanya <strong>Bendahara Utama</strong> yang menekan tombol <em>Generate Tagihan Bulanan/Awal</em> di setiap awal periode agar tidak terjadi eksekusi ganda bersamaan.</li>
                                <li><strong>Pelayanan Loket Paralel:</strong> Kasir Putra, Kasir Putri, dan Petugas Uang Saku melayani pembayaran tunai/cicilan dan penarikan uang saku menggunakan akun masing-masing secara simultan.</li>
                                <li><strong>Closing &amp; Setoran Sore Hari:</strong> Pada akhir jam pelayanan, Kasir menyerahkan uang fisik ke Bendahara Utama. Bendahara Utama membuka tab <strong>Setoran Kas</strong>, memverifikasi nominal, memilih Pos Kas tujuan, dan menekan <strong>Setor ke Buku Kas</strong>.</li>
                            </ol>
                        </div>
                    </div>

                    {/* Model B: Cloud Hub-and-Spoke */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between border-b border-indigo-200 pb-1.5">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">B</span>
                                Model B: SOP Cloud Hub-and-Spoke (Offline-First / Dropbox / WebDAV)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline-First</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Digunakan apabila loket kasir atau pos uang saku asrama beroperasi secara <em>offline</em> dan baru melakukan sinkronisasi berkala ke komputer pusat (Hub).
                        </p>
                        <div className="space-y-2 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950 font-bold flex items-center gap-1.5">
                                    <i className="bi bi-pc-display-horizontal text-indigo-600"></i> 1. Peran Komputer HUB (Bendahara Pusat / Kepala Keuangan):
                                </strong>
                                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                    Bertindak sebagai <strong>Single Source of Truth</strong> untuk menetapkan Master Komponen Biaya (<code>Pengaturan Biaya</code>), men-<em>generate</em> tagihan bulanan/awal seluruh santri, memproses <em>Payroll/Penggajian Guru</em>, melakukan <em>Setoran Kas</em> ke Buku Kas Umum, serta menggabungkan (<em>Merge</em>) kiriman transaksi dari laptop kasir (Spoke).
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950 font-bold flex items-center gap-1.5">
                                    <i className="bi bi-laptop text-indigo-600"></i> 2. Peran Komputer SPOKE (Laptop Kasir Loket / Petugas Uang Saku):
                                </strong>
                                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                    Melayani transaksi operasional harian secara <em>offline</em> (menerima pembayaran tagihan/cicilan, deposit/penarikan uang saku santri, dan pengaturan limit harian). Seluruh transaksi tersimpan aman di database lokal (Dexie IndexedDB) dengan ID unik monotonik dan penanda waktu (<code>lastModified</code>).
                                </p>
                            </div>
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-950 space-y-1">
                                <strong className="font-bold flex items-center gap-1.5">
                                    <i className="bi bi-arrow-repeat text-amber-700"></i> Siklus Wajib Harian Keuangan Hub &amp; Spoke:
                                </strong>
                                <ol className="list-decimal pl-4 space-y-1 text-gray-700">
                                    <li><strong>Pagi Hari (Sebelum Buka Loket):</strong> Pastikan laptop Kasir (Spoke) telah menarik Master Data terbaru (otomatis saat login jika terhubung internet, atau klik <em>Ambil Master Data</em>) agar daftar tagihan dan saldo awal uang saku santri mutakhir.</li>
                                    <li><strong>Jam Pelayanan (Offline/Lokal):</strong> Kasir melayani pembayaran SPP/cicilan dan mutasi uang saku. <strong>Penting:</strong> Untuk santri yang sama, hindari membayar tagihan yang sama di dua laptop offline berbeda sebelum disinkronkan.</li>
                                    <li><strong>Sore Hari (Kirim Perubahan Staf):</strong> Saat tutup loket, Kasir menghubungkan laptop ke internet lalu menekan tombol <strong>Kirim Perubahan (Upload Staff Changes)</strong> di bagian bawah sidebar.</li>
                                    <li><strong>Verifikasi &amp; Merge di HUB:</strong> Bendahara Pusat membuka <em>Dashboard Sinkronisasi Admin</em>, menekan <strong>Gabungkan Perubahan Staf (Merge)</strong>, melakukan <strong>Setoran Kas</strong> atas uang fisik yang diserahkan kasir, lalu menekan <strong>Terbitkan Master Data (Publish Master)</strong> agar posisi saldo terbaru tersebar ke seluruh perangkat.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Matriks Otoritas RBAC Keuangan */}
                    <div className="border border-gray-200 rounded-xl p-3 bg-white space-y-2 text-xs">
                        <strong className="text-gray-900 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <i className="bi bi-people-fill text-blue-600"></i> Matriks Pembagian Tugas &amp; Hak Akses Keuangan (RBAC):
                        </strong>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                                <thead className="bg-gray-100 font-semibold text-gray-700">
                                    <tr>
                                        <th className="border border-gray-200 p-2">Jabatan / Peran</th>
                                        <th className="border border-gray-200 p-2">Hak Akses Modul</th>
                                        <th className="border border-gray-200 p-2">Tanggung Jawab &amp; Batasan SOP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-gray-600">
                                    <tr>
                                        <td className="border border-gray-200 p-2 font-semibold text-gray-900">Bendahara Utama (Pusat / HUB)</td>
                                        <td className="border border-gray-200 p-2 text-emerald-700 font-medium">Keuangan (Write) &amp; Buku Kas (Write)</td>
                                        <td className="border border-gray-200 p-2">Mengatur komponen biaya, generate tagihan bulanan/awal, memvalidasi Setoran Kas harian, mengelola Buku Kas Multi-Pos, Mutasi Bank, dan Payroll Gaji Guru.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 p-2 font-semibold text-gray-900">Kasir Penerimaan (Putra / Putri)</td>
                                        <td className="border border-gray-200 p-2 text-blue-700 font-medium">Keuangan (Write) &amp; Buku Kas (Read/None)</td>
                                        <td className="border border-gray-200 p-2">Menerima pembayaran tagihan/cicilan santri, mencetak kuitansi, dan menyerahkan uang laci kasir ke Bendahara Utama setiap sore. Dilarang mengubah Master Biaya.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 p-2 font-semibold text-gray-900">Petugas Tabungan / Uang Saku</td>
                                        <td className="border border-gray-200 p-2 text-purple-700 font-medium">Keuangan - Uang Saku (Write)</td>
                                        <td className="border border-gray-200 p-2">Melayani deposit titipan wali santri, penarikan uang jajan harian sesuai kuota limit harian, serta mencetak Rekening Koran Uang Saku.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 p-2 font-semibold text-gray-900">Mudir / Pengawas Yayasan</td>
                                        <td className="border border-gray-200 p-2 text-gray-600 font-medium">Keuangan (Read) &amp; Buku Kas (Read)</td>
                                        <td className="border border-gray-200 p-2">Memantau rasio kolektibilitas, posisi saldo per rekening bank, kas laci belum disetor, dan mengunduh laporan Excel/PDF untuk audit.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 4 Golden Rules */}
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-xs text-red-950">
                        <strong className="flex items-center gap-1.5 font-bold text-red-900">
                            <i className="bi bi-shield-exclamation text-red-600"></i> 4 Aturan Emas (Golden Rules) Anti-Selisih Kas &amp; Konflik Data:
                        </strong>
                        <ol className="list-decimal pl-5 space-y-1 text-[11px] text-gray-700">
                            <li><strong>Satu Komando Generate Tagihan:</strong> Penambahan/perubahan <em>Pengaturan Biaya</em> dan eksekusi <em>Generate Tagihan</em> hanya boleh dilakukan oleh <strong>Bendahara Utama (Komputer HUB)</strong>.</li>
                            <li><strong>Disiplin Closing Laci Kasir Harian:</strong> Jangan biarkan indikator <em>Kas Laci Belum Disetor</em> menumpuk berhari-hari. Lakukan rekonsiliasi fisik dan klik <strong>Setor ke Buku Kas</strong> setiap akhir jam kerja.</li>
                            <li><strong>Gunakan Fitur Mutasi Kas untuk Perpindahan Internal:</strong> Saat menyetor uang tunai dari brankas bendahara ke rekening Bank pondok, <strong>wajib gunakan tombol Mutasi Kas</strong> di Buku Kas (bukan input Pemasukan baru) agar total pendapatan pondok tidak terhitung ganda.</li>
                            <li><strong>Rutin Ekspor Cadangan Excel:</strong> Di setiap akhir bulan setelah tutup buku, unduh <strong>Ekspor Excel</strong> pada menu <em>Buku Kas</em>, <em>Status Pembayaran</em>, <em>Laporan Umur Piutang</em>, dan <em>Uang Saku</em> sebagai arsip fisik permanen yayasan.</li>
                        </ol>
                    </div>
                </div>
            )
        }
    ]
};
