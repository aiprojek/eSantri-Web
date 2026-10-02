import React from 'react';
import { PanduanSectionData } from '../panduan';

export const perpustakaanPanduan: PanduanSectionData = {
    id: 'perpustakaan',
    badge: 12,
    badgeColor: 'teal',
    title: 'Perpustakaan Digital Pesantren & SOP Multi-Admin (Real-Time vs Hub & Spoke)',
    steps: [
        {
            title: '1. Ikhtisar & Manajemen Master Kategori Koleksi Buku',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Modul <strong>Perpustakaan Digital Pesantren</strong> di eSantri Web dirancang untuk mengelola sirkulasi literasi santri secara modern, tertib, dan terintegrasi penuh dengan data santri induk, sistem barcode, serta pencatatan denda otomatis.
                    </p>

                    {/* Tanya Jawab Kategori Koleksi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                            <h5 className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                                <i className="bi bi-bookmark-plus-fill text-teal-600"></i>
                                Penyimpanan Otomatis Kategori Manual
                            </h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                <strong>Apakah kategori buku yang ditambah manual akan tersimpan?</strong><br />
                                <strong>Ya, otomatis tersimpan secara permanen!</strong> Setiap kali Anda mengetikkan nama kategori baru (baik di form Tambah Buku maupun Bulk Editor), sistem langsung menyimpannya ke konfigurasi sistem (<code>settings.perpusConfig.kategoriKoleksi</code>), tersimpan di IndexedDB lokal, dan tersinkronkan ke Cloud. Anda tidak perlu mengetik manual lagi karena nama kategori tersebut akan langsung muncul di menu pilihan dropdown.
                            </p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-1.5">
                            <h5 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                                <i className="bi bi-trash3-fill text-emerald-600"></i>
                                Penghapusan Kategori Tidak Terpakai
                            </h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                <strong>Apakah kategori bisa dihapus jika tidak diperlukan lagi?</strong><br />
                                <strong>Bisa dengan sangat mudah!</strong> Masuk ke menu <strong>Pengaturan &gt; Sistem</strong> lalu buka panel <strong>Pengaturan Perpustakaan</strong>. Di sana terdapat daftar seluruh kategori koleksi yang tersimpan. Klik tombol <em>Hapus</em> (ikon tempat sampah) pada kategori yang ingin dihilangkan, atau klik <em>Reset Default</em> untuk mengembalikan ke kategori standar pesantren.
                            </p>
                        </div>
                    </div>

                    <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-xl space-y-2">
                        <h5 className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                            <i className="bi bi-tags-fill text-teal-700"></i>
                            Standar Klasifikasi Koleksi di Pesantren
                        </h5>
                        <p className="text-xs text-teal-900">
                            Secara bawaan, eSantri Web menyediakan kategori khas pesantren yang dapat langsung digunakan:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                            <div className="bg-white p-2 rounded-lg border border-teal-200 font-medium text-teal-950">Kitab Kuning</div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 font-medium text-teal-950">Buku Pelajaran (KBM)</div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 font-medium text-teal-950">Referensi / Kamus</div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 font-medium text-teal-950">Novel &amp; Cerpen Islami</div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 font-medium text-teal-950">Sejarah &amp; Sirah Nabawiyah</div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 font-medium text-teal-950">Fiqih &amp; Ushul Fiqih</div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 font-medium text-teal-950">Hadits &amp; Ulumul Hadits</div>
                            <div className="bg-white p-2 rounded-lg border border-teal-200 font-medium text-teal-950">Majalah &amp; Karya Santri</div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Cara Setting Kebijakan Peminjaman & Nominal Denda Keterlambatan',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Pengaturan operasional perpustakaan—seperti nominal denda harian, durasi pinjam default, dan kuota peminjaman santri—dapat dikustomisasi secara fleksibel sesuai kesepakatan tata tertib pondok.
                    </p>

                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                        <h5 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                            <i className="bi bi-gear-wide-connected text-amber-700"></i>
                            Langkah Menuju Pengaturan Kebijakan &amp; Denda:
                        </h5>
                        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-700">
                            <li>Buka menu <strong>Pengaturan</strong> di bilah navigasi utama (ikon roda gigi).</li>
                            <li>Pilih tab <strong>Sistem</strong> atau klik submenu <strong>Pengaturan Perpustakaan</strong>.</li>
                            <li>Pada panel <em>Kebijakan Peminjaman &amp; Denda</em>, Anda akan menemukan parameter berikut:
                                <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-600">
                                    <li><strong>Denda Keterlambatan per Hari (Rp):</strong> Nominal denda per buku untuk setiap hari keterlambatan melewati jatuh tempo (contoh: <code>Rp 500</code> atau <code>Rp 1.000</code>).</li>
                                    <li><strong>Durasi Pinjam Standar (Hari):</strong> Jangka waktu peminjaman baku saat buku dipinjam (contoh: <code>7 hari</code> atau <code>14 hari</code>). Tanggal jatuh tempo akan dihitung otomatis.</li>
                                    <li><strong>Maksimal Pinjam per Santri:</strong> Kuota maksimal buku yang boleh dipinjam bersamaan oleh seorang santri (contoh: <code>3 buku</code>).</li>
                                    <li><strong>Batas Maksimal Perpanjangan:</strong> Jumlah toleransi perpanjangan masa pinjam yang diizinkan (contoh: <code>2 kali</code>).</li>
                                </ul>
                            </li>
                            <li>Klik tombol <strong>"Simpan Pengaturan"</strong>. Nilai baru akan langsung berlaku seketika di seluruh modul sirkulasi kasir perpustakaan.</li>
                        </ol>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-teal-200 text-xs text-gray-600 flex items-start gap-2">
                        <i className="bi bi-calculator-fill text-teal-600 text-base shrink-0 mt-0.5"></i>
                        <div>
                            <strong className="text-teal-950 font-semibold block">Rumus Perhitungan Denda Otomatis:</strong>
                            <span className="font-mono text-teal-900 text-[11px] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block my-1">
                                Total Denda = (Hari Terlambat) × Tarif Denda per Hari × Jumlah Buku
                            </span>
                            <p className="text-[11px]">
                                Sistem menghitung selisih hari antara tanggal pengembalian aktual dengan tanggal batas kembali secara presisi. Jika santri mengembalikan tepat waktu atau lebih awal, total denda bernilai Rp 0.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '3. Manajemen Katalog Buku & Bulk Editor (Satuan & Massal)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Koleksi buku perpustakaan dapat dimasukkan melalui dua metode yang praktis: input satu per satu dengan formulir detail atau entri massal (Bulk Editor) ala spreadsheet.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-2">
                            <h5 className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                                <i className="bi bi-file-earmark-plus-fill text-teal-600"></i>
                                Metode A: Form Tambah Buku Satuan
                            </h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Cocok untuk memasukkan judul buku baru yang datang secara berkala.
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600">
                                <li><strong>Kode Buku / Barcode:</strong> Masukkan kode unik atau klik <em>Generate Otomatis</em> (misal: <code>BK-0001</code>).</li>
                                <li><strong>Informasi Buku:</strong> Judul buku, Pengarang, Penerbit, Tahun Terbit, dan nomor ISBN jika ada.</li>
                                <li><strong>Kategori &amp; Lokasi:</strong> Pilih kategori koleksi (atau ketik kategori baru) dan tentukan Rak/Lemari (contoh: <code>Rak A-02 / Diniyah</code>).</li>
                                <li><strong>Stok Eksemplar:</strong> Jumlah fisik buku yang tersedia di perpustakaan.</li>
                            </ul>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs space-y-2">
                            <h5 className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                                <i className="bi bi-table text-indigo-600"></i>
                                Metode B: Bulk Editor (Input Cepat Spreadsheet)
                            </h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Sangat ideal saat menginventarisasi ribuan buku awal pondok pesantren.
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600">
                                <li>Buka menu <strong>Katalog Buku</strong> &gt; Klik <strong>"Tambah Massal (Bulk Editor)"</strong>.</li>
                                <li>Mendukung salin-tempel (copy-paste) beberapa baris data langsung dari Microsoft Excel atau Google Sheets.</li>
                                <li>Validasi kode buku duplikat secara real-time mencegah terjadinya bentrok identitas buku.</li>
                                <li>Kategori baru yang diketik pada baris bulk editor akan langsung didaftarkan ke Master Kategori saat disimpan.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200 text-xs text-teal-950">
                        <strong className="flex items-center gap-1.5 font-bold mb-1">
                            <i className="bi bi-funnel-fill text-teal-700"></i>
                            Pencarian Cerdas &amp; Filter Ketersediaan:
                        </strong>
                        <p className="text-gray-600">
                            Pustakawan dapat mencari buku berdasarkan judul, nama mualif/pengarang, kode rak, atau kategori koleksi. Sistem menampilkan status ketersediaan secara real-time: jumlah buku di rak vs jumlah yang sedang dipinjam santri.
                        </p>
                    </div>
                </div>
            )
        },
        {
            title: '4. Alur Sirkulasi: Peminjaman, Pengembalian & Perpanjangan',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Meja sirkulasi adalah titik temu pelayanan santri. Alur sirkulasi eSantri Web dirancang cepat agar antrean peminjaman di waktu istirahat KBM dapat terlayani dalam hitungan detik.
                    </p>

                    <div className="space-y-2.5">
                        <div className="p-3 bg-white border border-teal-200 rounded-xl space-y-1.5 shadow-2xs">
                            <h5 className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">1</span>
                                Alur Peminjaman Buku:
                            </h5>
                            <ol className="list-decimal pl-6 space-y-1 text-xs text-gray-600">
                                <li>Di tab <strong>Sirkulasi</strong>, pilih submenu <strong>Peminjaman</strong>.</li>
                                <li>Pilih atau scan barcode kartu santri peminjam. Sistem akan mengecek apakah santri masih memiliki kuota pinjam aktif.</li>
                                <li>Pilih buku yang hendak dipinjam (bisa dengan scanner barcode buku atau ketik judul). Hanya buku yang stoknya tersedia (&gt;0) yang dapat diproses.</li>
                                <li>Tanggal pinjam dan tanggal jatuh tempo terisi otomatis berdasarkan Durasi Pinjam Standar.</li>
                                <li>Klik <strong>"Proses Peminjaman"</strong>. Sistem otomatis mengurangi stok tersedia buku di katalog dan mencatat peminjaman ke riwayat santri.</li>
                            </ol>
                        </div>

                        <div className="p-3 bg-white border border-teal-200 rounded-xl space-y-1.5 shadow-2xs">
                            <h5 className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">2</span>
                                Alur Pengembalian Buku &amp; Denda:
                            </h5>
                            <ol className="list-decimal pl-6 space-y-1 text-xs text-gray-600">
                                <li>Masuk ke submenu <strong>Pengembalian</strong> &gt; cari nama santri atau judul buku yang sedang dipinjam.</li>
                                <li>Jika pengembalian melewati batas waktu, sistem otomatis menampilkan badge merah <em>"Terlambat X Hari"</em> beserta nominal denda yang harus dibayar.</li>
                                <li>Pilih status pembayaran denda: <strong>Lunas</strong> (santri membayar tunai) atau <strong>Belum Bayar</strong> (dicatat sebagai tanggungan).</li>
                                <li>Tentukan kondisi buku saat kembali: <strong>Baik</strong> (stok katalog pulih otomatis), <strong>Rusak</strong>, atau <strong>Hilang</strong> (buku dicatat hilang dari inventaris).</li>
                                <li>Klik <strong>"Kembalikan Buku"</strong> untuk menuntaskan transaksi.</li>
                            </ol>
                        </div>

                        <div className="p-3 bg-white border border-teal-200 rounded-xl space-y-1.5 shadow-2xs">
                            <h5 className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">3</span>
                                Perpanjangan Masa Pinjam:
                            </h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Santri yang belum selesai menelaah kitab atau membaca buku pelajaran dapat mengajukan perpanjangan sebelum jatuh tempo. Pustakawan cukup mengeklik tombol <strong>"Perpanjang"</strong> pada daftar pinjaman aktif santri. Sistem akan memundurkan tanggal kembali sesuai durasi perpanjangan yang telah ditentukan.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Cetak Perlengkapan Perpustakaan: Kartu Santri, Barcode & Label Punggung',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        eSantri Web dilengkapi perlengkapan cetak fisik siap pakai untuk menunjang tata kelola perpustakaan pondok berstandar nasional:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1">
                            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm mb-1.5">
                                <i className="bi bi-person-badge-fill"></i>
                            </div>
                            <strong className="text-teal-950 font-bold block">Kartu Anggota Barcode</strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Cetak kartu perpustakaan santri lengkap dengan foto, NIS, kelas, dan barcode scan untuk registrasi instan di meja sirkulasi.
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1">
                            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm mb-1.5">
                                <i className="bi bi-tags-fill"></i>
                            </div>
                            <strong className="text-teal-950 font-bold block">Label Punggung (Call Number)</strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Label kode klasifikasi buku (nomor rak, singkatan pengarang, huruf awal judul) untuk ditempel di punggung buku (spine).
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1">
                            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm mb-1.5">
                                <i className="bi bi-upc-scan"></i>
                            </div>
                            <strong className="text-teal-950 font-bold block">Label Barcode Buku</strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Barcode resmi buku berstandar Code128 siap cetak ke kertas stiker label untuk ditempel di sampul depan atau dalam buku.
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1">
                            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-sm mb-1.5">
                                <i className="bi bi-calendar2-check-fill"></i>
                            </div>
                            <strong className="text-teal-950 font-bold block">Slip Tanggal Kembali</strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Tabel stempel tanggal kembali (Due Date Slip) yang ditempel di belakang buku agar santri mengetahui tenggat waktu pinjaman.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '6. SOP Standar Multi-Admin Perpustakaan: Real-Time Sync vs Hub-and-Spoke',
            color: 'teal',
            content: (
                <div className="space-y-3.5 text-sm">
                    {/* Urgensi Tata Kelola */}
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-exclamation-triangle-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900 block mb-0.5">Pentingnya Tata Kelola Multi-Admin di Perpustakaan Pesantren:</strong>
                            Perpustakaan umumnya memiliki ruang fisik atau komputer meja sirkulasi tersendiri yang terpisah dari kantor Tata Usaha (TU) dan Bendahara. Layanan perpustakaan dijaga oleh petugas piket bergilir (ustadz pustakawan, staf TU, atau santri pengurus OPPM/ISPA). Karena puluhan santri meminjam dan mengembalikan buku serentak pada jam istirahat, sistem mendukung 2 arsitektur sinkronisasi: <strong>Real-Time Cloud (Firebase)</strong> dan <strong>Hub-and-Spoke (Offline / Dropbox / File Cadangan)</strong>. Ikuti SOP di bawah ini agar katalog buku tidak bentrok, mutasi stok akurat, dan denda terlacak tertib.
                        </div>
                    </div>

                    {/* Model A */}
                    <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-teal-200/70 pb-1.5">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center text-[10px] font-black">1</span>
                                Model A: Real-Time Live Sync (Firebase Firestore)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Online Aktif</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Sangat direkomendasikan jika komputer meja sirkulasi perpustakaan terhubung ke jaringan internet/WiFi pesantren yang stabil.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                <strong className="text-teal-950 block mb-1 font-semibold">
                                    <i className="bi bi-person-badge text-teal-600"></i> Akun Khusus Pustakawan
                                </strong>
                                <p className="text-[11px] text-gray-600">
                                    Admin Utama membuatkan akun khusus dengan peran dibatasi hanya ke modul <strong>Perpustakaan</strong>. Staf pustakawan tidak dapat melihat buku kas pondok, data tagihan, ataupun rekam medis santri.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                <strong className="text-teal-950 block mb-1 font-semibold">
                                    <i className="bi bi-broadcast text-teal-600"></i> Sinkronisasi Detik Itu Juga
                                </strong>
                                <p className="text-[11px] text-gray-600">
                                    Setiap peminjaman, perpanjangan, atau pengembalian langsung masuk ke Cloud Firestore secara instan (<em>two-way live sync</em>). Data stok buku di katalog selalu mutakhir di seluruh gawai staf.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs">
                                <strong className="text-teal-950 block mb-1 font-semibold">
                                    <i className="bi bi-link-45deg text-teal-600"></i> Terintegrasi Santri Induk
                                </strong>
                                <p className="text-[11px] text-gray-600">
                                    Jika ada santri baru didaftarkan di TU atau santri mutasi pindah, komputer perpustakaan langsung mengenali status santri tersebut tanpa perlu input ulang manual.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Model B */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black">2</span>
                                Model B: Hub-and-Spoke (Offline-First / Dropbox / File Cadangan)
                            </h5>
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Hybrid / Offline</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Solusi terbaik jika ruang perpustakaan berada di gedung terpisah, basement, atau lokasi dengan sinyal WiFi pondok yang tidak menentu.
                        </p>
                        <div className="space-y-2 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950">A. Peran HUB (Pusat Data Induk di Kantor Tata Usaha):</strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Memegang basis data master lengkap (seluruh santri aktif, inventaris buku induk pesantren, dan arsip sirkulasi tahunan). Bertanggung jawab menjalankan <em>"Terbitkan Master Data (Publish Master Data)"</em> setiap kali ada pembaruan santri baru atau penambahan ratusan judul buku hibah.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950">B. Peran SPOKE (Komputer / Laptop di Meja Sirkulasi Perpustakaan):</strong>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Petugas perpustakaan membuka aplikasi dan melayani santri secara <strong>100% offline</strong> tanpa bergantung koneksi internet. Seluruh data transaksi peminjaman, pengembalian, dan denda tersimpan dengan kecepatan maksimal di IndexedDB laptop lokal.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950">C. Alur Sinkronisasi &amp; Penggabungan (Merging) Harian:</strong>
                                <div className="mt-1 p-2 bg-teal-50/80 border border-teal-200 rounded text-[11px] text-teal-950">
                                    <strong>⚡ Auto-Pull saat Login:</strong> Saat petugas menyalakan laptop perpus dan login dengan internet terhubung sesaat, sistem otomatis menarik master data santri terbaru dari Cloud di latar belakang tanpa mengganggu alur kerja.
                                </div>
                                <ol className="list-decimal pl-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                    <li>Pustakawan melayani transaksi peminjaman santri sepanjang jam operasional perpus secara mandiri di komputer sirkulasi.</li>
                                    <li>Pada saat pergantian shift atau sebelum perpustakaan tutup, pustakawan membuka menu <strong>Sinkronisasi</strong> lalu mengeklik <strong>"Kirim Perubahan (Upload Staff Changes)"</strong> ke Dropbox/Cloud atau export file perubahan.</li>
                                    <li>Admin Utama di Kantor TU mengeklik <strong>"Gabungkan Perubahan Staff (Merge Changes)"</strong>. Sistem menggabungkan riwayat sirkulasi dan pemotongan stok buku secara cerdas tanpa menimpa modul lain (seperti keuangan, absensi, atau tahfizh).</li>
                                    <li>Admin Utama menerbitkan master berkala (<em>Publish Master</em>) agar semua laptop divisi lain selaras.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Matriks Peran & Tanggung Jawab */}
                    <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-2 text-xs">
                        <h5 className="font-bold text-gray-900 flex items-center gap-1.5">
                            <i className="bi bi-people-fill text-teal-600"></i>
                            Matriks Pembagian Peran Multi-Admin Perpustakaan
                        </h5>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-800 border-b">
                                        <th className="p-2 font-bold">Peran</th>
                                        <th className="p-2 font-bold">Gawai / Lokasi</th>
                                        <th className="p-2 font-bold">Wewenang Utama</th>
                                        <th className="p-2 font-bold">Tanggung Jawab Sinkronisasi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-600">
                                    <tr>
                                        <td className="p-2 font-bold text-gray-900">Admin Utama (TU)</td>
                                        <td className="p-2">Komputer Server TU (HUB)</td>
                                        <td className="p-2">Membuat akun staf, kelola database induk, backup sistem.</td>
                                        <td className="p-2">Menjalankan <em>Merge Changes</em> dan <em>Publish Master</em> harian.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-bold text-teal-900">Kepala Perpustakaan</td>
                                        <td className="p-2">Ruang Perpustakaan</td>
                                        <td className="p-2">Menetapkan nominal denda, durasi pinjam, katalog koleksi, cetak barcode buku.</td>
                                        <td className="p-2">Memverifikasi kelengkapan inventaris stok &amp; audit fisik buku tahunan.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-bold text-indigo-900">Petugas Sirkulasi / Staf Piket</td>
                                        <td className="p-2">Meja Kasir Sirkulasi (SPOKE)</td>
                                        <td className="p-2">Melayani peminjaman, perpanjangan, pengembalian, dan penagihan denda buku.</td>
                                        <td className="p-2">Menjalankan <em>Upload Staff Changes</em> setiap akhir jam operasional.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-bold text-amber-900">Santri Pengurus (OPPM)</td>
                                        <td className="p-2">Komputer Meja Sirkulasi</td>
                                        <td className="p-2">Membantu scan barcode buku, penataan rak buku, dan pengecekan fisik.</td>
                                        <td className="p-2">Tidak memiliki hak mengubah pengaturan denda atau hapus katalog.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SOP Finansial Denda */}
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                        <strong className="text-emerald-950 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-cash-stack text-emerald-700"></i> SOP Pengelolaan Uang Denda &amp; Penggantian Buku:
                        </strong>
                        <p className="text-[11px] text-gray-700 leading-relaxed">
                            Uang denda keterlambatan dan uang penggantian buku hilang yang diterima secara tunai di meja perpustakaan wajib dicatat status <strong>"Lunas"</strong> pada transaksi sirkulasi. Di akhir bulan atau setiap pekan, total rekapitulasi denda yang tercatat di sistem diserahkan ke Bendahara Pesantren atau dialokasikan sebagai kas khusus pemeliharaan kitab/buku perpustakaan sesuai instruksi pimpinan pondok.
                        </p>
                    </div>

                    {/* 3 Pantangan Keras */}
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                        <strong className="text-rose-950 flex items-center gap-1.5 font-bold">
                            <i className="bi bi-shield-x text-rose-700"></i> 3 Pantangan Keras Multi-Admin Perpustakaan:
                        </strong>
                        <div className="space-y-1.5 text-[11px] text-rose-900">
                            <div className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">1</span>
                                <p><strong>Dilarang meminjamkan buku tanpa input sirkulasi sistem:</strong> Meminjamkan buku secara manual di secarik kertas berisiko tinggi buku hilang tanpa jejak dan mengacaukan status stok fisik di rak.</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">2</span>
                                <p><strong>Dilarang mengubah kode unik atau menghapus judul buku yang sedang dipinjam santri:</strong> Mengubah identitas buku yang sedang berstatus pinjam aktif dapat merusak relasi data sirkulasi saat santri mengembalikan buku.</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">3</span>
                                <p><strong>Dilarang sembarangan me-restore database lokal di komputer sirkulasi:</strong> Melakukan <em>Restore Database</em> cadangan lama di laptop perpustakaan tanpa sinkronisasi ke server HUB dapat menghapus seluruh riwayat transaksi peminjaman hari berjalan.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '7. Audit Trail, Keamanan Sesi Akun & Backup Restore',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Integritas data perpustakaan dilindungi dengan pencatatan audit komprehensif, keamanan sesi multi-pengguna, dan pencadangan data mandiri:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                            <h6 className="font-bold text-teal-950 flex items-center gap-1.5">
                                <i className="bi bi-clock-history text-teal-600"></i>
                                Audit Trail Otomatis
                            </h6>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Setiap mutasi buku (tambah, edit, hapus) serta transaksi sirkulasi (pinjam, kembali, perpanjang) otomatis tercatat dalam <code>db.auditLogs</code> lengkap dengan nama petugas yang bertugas dan stempel waktu (timestamp).
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                            <h6 className="font-bold text-teal-950 flex items-center gap-1.5">
                                <i className="bi bi-person-lock text-teal-600"></i>
                                Disiplin Logout Sesi
                            </h6>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Komputer meja perpustakaan yang digunakan secara bergantian oleh beberapa staf piket <strong>WAJIB DI-LOGOUT</strong> saat pergantian jam dinas agar seluruh transaksi sirkulasi tervalidasi atas nama penanggung jawab yang tepat.
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                            <h6 className="font-bold text-teal-950 flex items-center gap-1.5">
                                <i className="bi bi-cloud-arrow-down-fill text-teal-600"></i>
                                Backup &amp; Restore Terpadu
                            </h6>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Seluruh katalog buku, riwayat sirkulasi, log denda, dan pengaturan perpustakaan tercakup dalam file backup JSON sistem di menu <strong>Pengaturan &gt; Backup &amp; Restore</strong>. Data dapat dipulihkan kapan saja dengan aman.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
