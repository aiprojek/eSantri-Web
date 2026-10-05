import React from 'react';
import { PanduanSectionData } from '../panduan';

export const bukukasPanduan: PanduanSectionData = {
    id: 'bukukas',
    badge: 'KAS',
    badgeColor: 'green',
    title: 'Buku Kas Umum, Multi-Pos Rekening, COA & SOP Multi-Bendahara',
    steps: [
        {
            title: '1. Arsitektur Buku Kas Multi-Pos & Saldo Berjalan Dinamis (Dynamic Running Balance)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl text-teal-950 text-xs leading-relaxed">
                        <strong className="font-bold text-teal-900 block mb-1 flex items-center gap-1.5 text-sm">
                            <i className="bi bi-wallet2 text-teal-600"></i>
                            Pusat Kendali Arus Kas Pesantren (Multi-Rekening &amp; Audit-Ready)
                        </strong>
                        Menu <strong>Buku Kas</strong> adalah buku besar kas (*general cash ledger*) pondok pesantren yang mencatat seluruh arus uang masuk dan keluar—baik dari operasional harian, infaq/donasi, setoran kasir SPP, maupun penggajian asatidz—yang terbagi ke dalam beberapa <strong>Pos Kas / Rekening</strong> secara terpisah namun terintegrasi.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <strong className="text-gray-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-bank2 text-blue-600"></i> 5 Pos Kas / Rekening Standar
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Dana pondok dipisahkan secara spesifik ke dalam pos penyimpanan fisik maupun perbankan:
                            </p>
                            <ul className="list-disc pl-4 space-y-0.5 text-gray-700 font-medium">
                                <li><code>Kas Tunai Bendahara</code> (Brankas / Kas Utama Kantor)</li>
                                <li><code>Bank Syariah Indonesia (BSI)</code></li>
                                <li><code>Bank Muamalat</code></li>
                                <li><code>Bank BRI / Mandiri</code></li>
                                <li><code>Kas Kecil Operasional</code> (Petty Cash Dapur/Kerumahtanggaan)</li>
                            </ul>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <strong className="text-gray-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-calculator-fill text-emerald-600"></i> Kalkulasi Saldo Berjalan Dinamis
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Sistem menggunakan algoritma <strong>Dynamic Running Balance</strong> yang mengurutkan seluruh transaksi aktif secara kronologis:
                            </p>
                            <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
                                <li><strong>Klik Kartu Pos Kas:</strong> Klik salah satu kartu rekening di bagian atas untuk memfilter tabel khusus rekening tersebut. Kolom saldo otomatis berubah dari <em>Saldo Berjalan (Global)</em> menjadi <strong>Saldo (Pos)</strong>.</li>
                                <li><strong>Indikator Surplus / Defisit:</strong> Kartu ke-3 di bagian atas otomatis menghitung selisih bersih (<code>Total Pemasukan - Total Pengeluaran</code>) pada periode yang sedang difilter.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Standarisasi Bagan Akun (Chart of Accounts / COA) & Preset Pesantren',
            color: 'indigo',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Agar laporan arus kas tidak terpecah akibat perbedaan pengetikan nama kategori (misalnya <em>"Listrik"</em> vs <em>"Bayar PLN"</em>), gunakan fitur <strong>Bagan Akun (COA)</strong> sebagai standar baku kategori transaksi di seluruh perangkat bendahara:
                    </p>
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-2.5 text-xs">
                        <h5 className="font-bold text-indigo-950 flex items-center gap-2 text-sm">
                            <i className="bi bi-journal-bookmark-fill text-indigo-600"></i>
                            Langkah Mengelola Bagan Akun (COA):
                        </h5>
                        <ol className="list-decimal pl-5 space-y-1.5 text-gray-700">
                            <li>
                                Klik tombol <strong>Bagan Akun (COA)</strong> di pojok kanan atas halaman Buku Kas.
                            </li>
                            <li>
                                <strong>Muat Preset Standar Pesantren (1-Klik):</strong> Klik tombol <strong>"Muat Preset Pesantren"</strong> di kanan atas modal. Sistem akan langsung mengisi 12 kode akun standar pesantren:
                                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-gray-600">
                                    <li><strong>Pendapatan (401–405):</strong> <code>401 Syahriah/SPP Santri</code>, <code>402 Infaq &amp; Donasi Muhsinin</code>, <code>403 Wakaf &amp; Hibah Pembangunan</code>, <code>404 Hasil Usaha Koperasi &amp; Kantin</code>, <code>405 Bantuan Pemerintah / BOS</code>.</li>
                                    <li><strong>Beban / Pengeluaran (501–507):</strong> <code>501 Konsumsi &amp; Dapur Santri</code>, <code>502 Listrik, Air &amp; Internet</code>, <code>503 Gaji &amp; Bisyarah Asatidz</code>, <code>504 Pemeliharaan Gedung &amp; Asrama</code>, <code>505 ATK &amp; Kesekretariatan</code>, <code>506 Kesehatan Santri (Poskestren)</code>, <code>507 Kegiatan &amp; Ekstrakurikuler Santri</code>.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Tambah / Edit Akun Kustom:</strong> Isi <strong>Kode</strong> (contoh: <code>508</code>), <strong>Nama Akun</strong>, dan <strong>Kelompok</strong> (<code>Pendapatan</code>, <code>Beban</code>, <code>Harta</code>, <code>Kewajiban</code>, atau <code>Modal</code>), lalu klik <strong>Tambah</strong>. Sistem dilengkapi proteksi anti-duplikasi kode akun.
                            </li>
                            <li>
                                <strong>Pilih Cepat Saat Input Transaksi:</strong> Saat menambah transaksi kas, daftar <em>chip</em> tombol cepat COA akan otomatis menyaring akun yang relevan (akun Pendapatan/Modal untuk Pemasukan, dan akun Beban/Harta untuk Pengeluaran).
                            </li>
                        </ol>
                    </div>
                </div>
            )
        },
        {
            title: '3. Input Transaksi, Tanggal Nota Mundur (Backdate), Koreksi (Edit) & Hapus',
            color: 'blue',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">Input &amp; Backdate</span>
                            <h5 className="font-bold text-gray-900">1. Tanggal Nota Fisik</h5>
                            <p className="text-gray-600 leading-relaxed">
                                Klik <strong>+ Tambah Transaksi</strong>. Anda dapat mengatur <strong>Tanggal Nota</strong> sesuai tanggal kuitansi fisik (termasuk tanggal mundur / <em>backdate</em>). Sistem otomatis menempatkan transaksi pada urutan kronologis yang tepat dan menghitung ulang seluruh saldo berjalan setelahnya.
                            </p>
                        </div>

                        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">Koreksi Data</span>
                            <h5 className="font-bold text-gray-900">2. Edit Transaksi Kas</h5>
                            <p className="text-gray-600 leading-relaxed">
                                Jika terjadi salah ketik nominal, salah memilih Pos Rekening, atau salah memilih kategori COA, klik ikon <strong>Edit (Pensil Biru)</strong> pada kolom Aksi. Simpan perubahan dan saldo berjalan global maupun saldo per pos rekening akan langsung dikalkulasi ulang.
                            </p>
                        </div>

                        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase">Pembatalan Aman</span>
                            <h5 className="font-bold text-gray-900">3. Hapus (Soft-Delete)</h5>
                            <p className="text-gray-600 leading-relaxed">
                                Untuk membatalkan transaksi ganda atau salah input, klik ikon <strong>Hapus (Tempat Sampah Merah)</strong>. Transaksi akan ditandai terhapus secara aman (<em>soft-delete</em>) sehingga status penghapusannya ikut tersinkronisasi ke Cloud maupun komputer admin lain.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '4. Mutasi Kas Antar Pos Rekening (Pindah Buku) & Proteksi Saldo',
            color: 'green',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Saat bendahara menyetorkan uang tunai dari brankas kantor ke rekening bank pondok, atau menarik dana dari bank untuk mengisi <code>Kas Kecil Operasional</code>, <strong>jangan gunakan Tambah Transaksi biasa</strong> agar total pemasukan/pengeluaran bulanan tidak membengkak semu. Gunakan fitur <strong>Mutasi Antar Kas</strong>:
                    </p>
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs">
                        <ol className="list-decimal pl-5 space-y-1.5 text-gray-700">
                            <li>Klik tombol <strong>Mutasi Antar Kas</strong> di bagian atas halaman Buku Kas.</li>
                            <li>Pilih <strong>Tanggal Mutasi</strong>, <strong>Dari Pos Kas (Sumber)</strong>, dan <strong>Ke Pos Kas (Tujuan)</strong>. Setiap pilihan menampilkan posisi saldo terkini pada rekening tersebut.</li>
                            <li>
                                Masukkan <strong>Nominal Mutasi (Rp)</strong>. Apabila nominal yang diketik melebihi saldo yang tersedia pada Pos Sumber, sistem akan memunculkan kotak peringatan <strong>Perhatian: Nominal mutasi melebihi saldo tercatat</strong> untuk mencegah saldo kas minus tanpa sengaja.
                            </li>
                            <li>
                                Saat disimpan, sistem secara otomatis membukukan sepasang transaksi kembar (<code>Mutasi Kas Keluar</code> pada pos sumber dan <code>Mutasi Kas Masuk</code> pada pos tujuan) dalam satu transaksi database atomik.
                            </li>
                        </ol>
                    </div>
                </div>
            )
        },
        {
            title: '5. Rekap Kategori, Cetak Bukti Kas (BKM/BKK) & Multi-Format Ekspor',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-1.5">
                            <h5 className="font-bold text-gray-900 flex items-center gap-1.5">
                                <i className="bi bi-bar-chart-steps text-indigo-600"></i>
                                Analisa Rincian per Kategori (%)
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Klik tombol <strong>"Lihat Rekap per Kategori"</strong> di sebelah kanan panel Posisi Saldo Pos Kas. Sistem akan menampilkan rincian pemasukan dan pengeluaran yang dikelompokkan per akun COA/Kategori, lengkap dengan <strong>jumlah frekuensi transaksi</strong>, <strong>total nominal</strong>, dan <strong>bar persentase (%)</strong> terhadap total periode filter.
                            </p>
                        </div>

                        <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-1.5">
                            <h5 className="font-bold text-gray-900 flex items-center gap-1.5">
                                <i className="bi bi-printer-fill text-teal-600"></i>
                                Cetak Voucher Bukti Kas (BKM / BKK)
                            </h5>
                            <p className="text-gray-600 leading-relaxed">
                                Klik ikon <strong>Cetak (🖨️)</strong> pada baris transaksi mana pun untuk membuka pratinjau <strong>Bukti Kas Masuk (BKM)</strong> atau <strong>Bukti Kas Keluar (BKK)</strong> resmi. Dokumen dilengkapi Kop Pesantren, Nomor Bukti otomatis (<code>BKM-YYYYMM-XXXXX</code>), tabel uraian, serta 3 kolom tanda tangan (<em>Pimpinan/Mudir</em>, <em>Bendahara Pondok</em>, dan <em>Penyetor/Penerima Dana</em>).
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                        <strong className="text-slate-900 font-bold block mb-1">Filter Cepat &amp; Ekspor Laporan Audit:</strong>
                        Gunakan tombol preset <code>Hari Ini</code>, <code>7 Hari</code>, <code>30 Hari</code>, atau <code>Bulan Ini</code> serta kotak pencarian multi-kolom (mencari sekaligus di <em>Kategori</em>, <em>Deskripsi Nota</em>, dan <em>Penanggung Jawab</em>). Hasil filter dapat langsung diunduh ke format <strong>PDF Gambar</strong>, <strong>PDF AutoTable</strong>, <strong>CSV</strong>, maupun <strong>Excel (.xlsx)</strong>.
                    </div>
                </div>
            )
        },
        {
            title: '6. Integrasi Lintas Modul: Setoran Kasir SPP & Penggajian (Payroll)',
            color: 'purple',
            content: (
                <div className="space-y-2.5 text-xs text-gray-700">
                    <p className="text-sm text-gray-700 leading-relaxed">
                        Buku Kas Umum terhubung secara otomatis dengan modul <strong>Keuangan Santri</strong> (lihat panduan <em>Keuangan Santri</em> untuk rincian operasional kasir):
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1">
                            <strong className="text-purple-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-box-arrow-in-down-right text-purple-600"></i>
                                Otomatisasi dari Setoran Kasir (Closing)
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Saat Bendahara memvalidasi uang laci kasir pada menu <strong>Keuangan &gt; Setoran Kas</strong> dan menekan <em>Setor ke Buku Kas</em>, sistem otomatis membukukan transaksi <strong>Pemasukan</strong> berkategori <code>Setoran Pembayaran Santri</code> ke Pos Rekening tujuan yang dipilih.
                            </p>
                        </div>
                        <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1">
                            <strong className="text-purple-950 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-person-vcard-fill text-purple-600"></i>
                                Otomatisasi dari Posting Penggajian (Payroll)
                            </strong>
                            <p className="text-gray-600 leading-relaxed">
                                Saat Bendahara menekan <strong>Posting Keuangan &amp; Bayar</strong> pada menu <strong>Keuangan &gt; Penggajian</strong>, total pencairan gaji asatidz periode tersebut otomatis tercatat sebagai <strong>Pengeluaran</strong> berkategori <code>Gaji &amp; Bisyarah Guru/Staf</code> di Buku Kas.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '7. SOP Standar Multi-Admin Buku Kas: Cloud Real-Time vs Hub-and-Spoke',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-shield-lock-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900 block mb-0.5">Standar Operasional Prosedur (SOP) Multi-Bendahara:</strong>
                            Buku Kas Umum mendukung kolaborasi beberapa bendahara (misal: <em>Bendahara Umum Yayasan</em>, <em>Bendahara Operasional Putra/Putri</em>, dan <em>Pemegang Kas Kecil Dapur/Pembangunan</em>) baik menggunakan <strong>Cloud Real-Time (Firebase)</strong> maupun <strong>Cloud Hub-and-Spoke (Dropbox / WebDAV)</strong>.
                        </div>
                    </div>

                    {/* Model A: Cloud Real-Time */}
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                            <h5 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-black">A</span>
                                Model A: SOP Cloud Real-Time (Firebase Firestore)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Sinkronisasi Instan</span>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                            <li>
                                <strong>Pemisahan Pos Kas per Bendahara:</strong> Setiap bendahara menginput transaksi sesuai pos yang dikelolanya (misal Bendahara Dapur memilih pos <code>Kas Kecil Operasional</code>, sedangkan Bendahara Pusat memilih <code>Kas Tunai Bendahara</code> atau <code>Bank BSI</code>).
                            </li>
                            <li>
                                <strong>Reaktivitas Saldo Langsung:</strong> Penambahan transaksi, pengeditan nominal, mutasi antar kas, maupun penghapusan (<em>soft-delete</em>) langsung disinkronkan secara utuh (<em>full-document put</em>) ke Firestore dan memperbarui tampilan Buku Kas di seluruh layar admin secara *real-time*.
                            </li>
                            <li>
                                <strong>Konsistensi Bagan Akun (COA):</strong> Kode akun COA menggunakan <strong>ID Deterministik berbasis Kode Akun</strong>, sehingga meskipun dua bendahara memuat preset COA secara bersamaan, tidak akan terbentuk duplikasi akun di Cloud.
                            </li>
                        </ul>
                    </div>

                    {/* Model B: Cloud Hub-and-Spoke */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between border-b border-indigo-200 pb-1.5">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">B</span>
                                Model B: SOP Cloud Hub-and-Spoke (Dropbox / Nextcloud WebDAV)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Offline-First Terpusat</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                                <strong className="text-indigo-950 block font-bold">
                                    <i className="bi bi-pc-display text-indigo-600"></i> Tugas Komputer HUB (Bendahara Umum Pusat)
                                </strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-600">
                                    <li>Menetapkan standar <strong>Bagan Akun (COA)</strong> dan melakukan <strong>Mutasi Antar Kas</strong> (pengisian Kas Kecil atau setoran ke Bank).</li>
                                    <li>Setiap sore/malam membuka <strong>Pengaturan &gt; Cloud Sync</strong>, klik <strong>Cek Perubahan Staf (Inbox)</strong>, klik <strong>Gabungkan (Merge)</strong>, lalu wajib menekan <strong>Update Master Data (Push)</strong>.</li>
                                </ul>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                                <strong className="text-indigo-950 block font-bold">
                                    <i className="bi bi-laptop text-teal-600"></i> Tugas Komputer SPOKE (Bendahara Unit / Kas Kecil)
                                </strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-600">
                                    <li>Pagi hari memastikan aplikasi menarik Master Data terbaru (<strong>Pull Master Data</strong>).</li>
                                    <li>Mencatat pengeluaran nota harian pada pos <code>Kas Kecil Operasional</code> (mendukung input tanggal nota mundur jika ada bon kemarin).</li>
                                    <li>Sore hari menekan tombol <strong>Kirim Perubahan ke Pusat (Push to Inbox)</strong>.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Golden Rules Audit Buku Kas */}
                    <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 text-xs">
                        <h5 className="font-bold text-amber-400 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <i className="bi bi-check2-circle text-amber-400 text-sm"></i>
                            4 Aturan Emas (Golden Rules) Tata Kelola Buku Kas Pesantren
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                            <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700">
                                <strong className="text-white block mb-0.5">1. Gunakan COA, Hindari Ketik Bebas:</strong>
                                Selalu klik <em>chip</em> Bagan Akun (COA) saat menginput transaksi agar rekap persentase kategori bulanan akurat dan seragam.
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700">
                                <strong className="text-white block mb-0.5">2. Pindah Uang = Mutasi Kas:</strong>
                                Setor tunai ke bank atau tarik tunai untuk pengisian kas kecil wajib melalui tombol <strong>Mutasi Antar Kas</strong>, bukan Tambah Transaksi biasa.
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700">
                                <strong className="text-white block mb-0.5">3. Cetak &amp; Arsipkan BKM/BKK:</strong>
                                Untuk transaksi bernilai besar, cetak <strong>Bukti Kas (BKM/BKK)</strong> dari sistem dan lampirkan bersama nota fisik asli untuk pemeriksaan yayasan.
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700">
                                <strong className="text-white block mb-0.5">4. Rekonsiliasi Saldo Fisik per Pos:</strong>
                                Setiap akhir pekan, cocokkan angka pada kartu <code>Kas Tunai Bendahara</code> dan <code>Kas Kecil Operasional</code> dengan jumlah uang fisik di brankas/laci.
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
