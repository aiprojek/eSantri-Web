import React from 'react';
import { PanduanSectionData } from '../panduan';

export const koperasiPanduan: PanduanSectionData = {
    id: 'koperasi',
    badge: 'POS',
    badgeColor: 'teal',
    title: 'Koperasi & Kantin Santri (POS, Multi-Gudang, Printer Thermal & SOP Multi-Kasir)',
    steps: [
        {
            title: '1. Arsitektur 9 Tab Koperasi & Integrasi Keuangan Pesantren',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl text-teal-950 text-xs leading-relaxed">
                        <strong className="font-bold text-teal-900 block mb-1 flex items-center gap-1.5 text-sm">
                            <i className="bi bi-shop text-teal-600"></i>
                            Ekosistem Point of Sale (POS) &amp; Ritel Pesantren Terpadu
                        </strong>
                        Modul <strong>Koperasi &amp; Kantin Santri</strong> dirancang khusus untuk operasional unit usaha pondok pesantren (Kantin Putra/Putri, Toko Kitab &amp; Seragam, serta Minimarket Pondok). Seluruh transaksi terhubung langsung dengan <strong>Tabungan / Uang Saku Santri</strong> dan <strong>Buku Kas Umum Pesantren</strong>.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-cart4 text-teal-600"></i> 1. Kasir (POS)
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Layar kasir ramah layar sentuh (Tablet/HP/PC) dengan dukungan scan barcode, harga grosir otomatis, varian barang, parkir pesanan (<em>Hold Order</em>), dan 4 metode bayar.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-person-badge text-blue-600"></i> 2. Kasir Tabungan
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Loket cepat tarik tunai uang saku / jajan harian santri dan setor tabungan menggunakan scan barcode Kartu Santri dengan proteksi limit harian otomatis.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-box-seam text-emerald-600"></i> 3. Produk &amp; Opname
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Katalog barang, harga beli (HPP) &amp; harga jual, tambah massal ala Excel, riwayat kartu stok, cetak label barcode rak, dan fitur <em>Stock Opname</em>.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-houses text-indigo-600"></i> 4. Multi-Gudang
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Pemisahan stok antara <em>Gudang Utama</em>, <em>Kantin Putra</em>, dan <em>Kantin Putri</em> lengkap dengan fitur mutasi/transfer stok antar-lokasi.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-truck text-amber-600"></i> 5. Vendor / Supplier
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Database distributor &amp; pemasok barang koperasi lengkap dengan kategori pasokan, NPWP, status aktif, dan pintasan order via WhatsApp.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-journal-minus text-rose-600"></i> 6. Kasbon (Piutang)
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Pencatatan piutang belanja Santri, Ustadz/Guru, atau Umum, dilengkapi pembayaran cicilan bertahap dan pengiriman pengingat tagihan via WhatsApp.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-receipt text-purple-600"></i> 7. Riwayat &amp; Retur
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Daftar seluruh struk transaksi, cetak ulang struk thermal, ekspor laporan penjualan Excel, dan fitur <strong>Void / Retur Transaksi</strong>.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-cash-stack text-green-600"></i> 8. Laba Rugi &amp; Promo
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Kalkulasi omzet, HPP, laba bersih penjualan, manajemen voucher diskon, kas operasional koperasi, dan <strong>Setor Laba ke Buku Kas Pondok</strong>.
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <strong className="text-teal-800 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-printer text-slate-700"></i> 9. Pengaturan &amp; Printer
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Pengaturan identitas toko, header/footer struk, ukuran kertas (<code>58mm</code> / <code>80mm</code>), <em>Auto-Print</em>, dan koneksi <strong>Printer Thermal Bluetooth</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Operasional Kasir POS (Layar Sentuh Tablet/HP, Grosir, Hold Order & Kembalian Masuk Saldo)',
            color: 'blue',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs space-y-2">
                        <h5 className="font-bold text-blue-950 flex items-center gap-1.5 text-sm">
                            <i className="bi bi-tablet-landscape text-blue-600"></i>
                            Desain Responsif untuk Tablet, HP &amp; Komputer Kasir
                        </h5>
                        <p className="text-gray-700 leading-relaxed">
                            Antarmuka Kasir POS dioptimalkan untuk perangkat layar sentuh. Pada layar Tablet kecil atau Smartphone, keranjang belanja otomatis bertransformasi menjadi <strong>Floating Checkout Bar</strong> di bagian bawah layar. Ketuk bar tersebut untuk membuka <strong>Slide-Up Bottom Sheet Keranjang</strong> tanpa harus menggulir halaman katalog yang panjang.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                            <strong className="text-gray-900 font-bold flex items-center gap-1.5">
                                <i className="bi bi-upc-scan text-teal-600"></i> Input Cepat &amp; Harga Bertingkat
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                <li><strong>Scanner Barcode &amp; Pintasan F2:</strong> Arahkan kursor atau tekan <code>F2</code> untuk fokus ke kolom pencarian/barcode.</li>
                                <li><strong>Pemilihan Varian:</strong> Produk bervarian (misal: <em>Ukuran S, M, L, XL</em>) akan memunculkan pop-up pilihan varian beserta sisa stok per varian.</li>
                                <li><strong>Harga Grosir Otomatis:</strong> Jika jumlah pembelian mencapai batas grosir (misal beli &ge; 10 pcs), harga satuan di keranjang otomatis turun ke tarif grosir dan ditandai lencana <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded font-bold text-[10px]">GROSIR</span>.</li>
                            </ul>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                            <strong className="text-gray-900 font-bold flex items-center gap-1.5">
                                <i className="bi bi-wallet2 text-emerald-600"></i> 4 Metode Pembayaran &amp; Kembalian ke Saldo
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                <li><strong>Tunai:</strong> Gunakan tombol nominal cepat (<em>Uang Pas, 5rb, 10rb, 20rb, 50rb, 100rb</em>).</li>
                                <li><strong>Kembalian Masuk Tabungan Santri:</strong> Jika pembeli adalah Santri dan membayar tunai, centang opsi <em>"Masukkan Kembalian ke Tabungan"</em> agar uang kembalian receh langsung menambah saldo tabungan santri tersebut.</li>
                                <li><strong>Tabungan Santri:</strong> Memotong saldo uang saku santri secara langsung disertai indikator <strong>Sisa Limit Belanja Harian</strong>.</li>
                                <li><strong>Non-Tunai (QRIS/Transfer) &amp; Hutang (Kasbon):</strong> Mendukung pencatatan referensi transfer maupun kasbon (dengan DP sebagian atau hutang penuh).</li>
                            </ul>
                        </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                        <i className="bi bi-pause-circle-fill text-amber-600 text-base shrink-0 mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900">Fitur Tahan Pesanan (Hold Order / Parkir Keranjang):</strong>
                            <p className="text-gray-700 mt-0.5 leading-relaxed">
                                Jika santri/pembeli masih mengambil barang tambahan di rak sedangkan antrean di belakangnya panjang, klik tombol <strong>Tahan Pesanan (ikon Jam)</strong> di header keranjang, ketik nama pembeli/catatan pada modal layar sentuh, lalu layani pembeli berikutnya. Untuk memanggil kembali pesanan tersebut, klik tombol <strong>Hold (Antrean)</strong> di bagian atas katalog.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '3. Kasir Tabungan Cepat (Teller Uang Saku & Proteksi Limit Harian)',
            color: 'green',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed text-xs">
                        Tab <strong>Kasir Tabungan</strong> berfungsi sebagai loket teller khusus bagi santri yang ingin menarik uang saku tunai harian atau menyetor uang ke tabungan tanpa berbelanja produk koperasi:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-700 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                        <li>
                            <strong>Scan Kartu Santri / Cari Nama:</strong> Pindai barcode pada Kartu Santri atau ketik NIS/Nama santri pada kolom pencarian cepat.
                        </li>
                        <li>
                            <strong>Pantau Panel Informasi Kuota Harian:</strong> Sistem langsung menampilkan 4 indikator penting: <strong>Saldo Saat Ini</strong>, <strong>Limit Harian</strong>, <strong>Terpakai Hari Ini</strong>, dan <strong>Sisa Jatah Harian</strong>.
                        </li>
                        <li>
                            <strong>Pilih Jenis Transaksi (Tarik / Setor):</strong> Gunakan tombol nominal cepat (<code>Rp 5.000</code> s/d <code>Rp 100.000</code>) atau ketik jumlah manual. Sistem otomatis mencegah penarikan apabila nominal melebihi saldo santri.
                        </li>
                        <li>
                            <strong>Rekam Jejak Otomatis:</strong> Setiap penarikan atau setoran langsung memperbarui <code>saldoSantri</code> dan tercatat di <code>transaksiSaldo</code> beserta nama petugas kasir yang melayani.
                        </li>
                    </ol>
                </div>
            )
        },
        {
            title: '4. Manajemen Produk, Multi-Gudang, Stock Opname & Cetak Label Rak',
            color: 'indigo',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-white rounded-xl border border-gray-200 space-y-1.5">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-1.5">
                                <i className="bi bi-houses-fill text-indigo-600"></i> Multi-Gudang &amp; Transfer Stok
                            </h5>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                <li>Buka tab <strong>Gudang</strong> untuk membuat lokasi penyimpanan (contoh: <code>GD-UTM: Gudang Utama</code>, <code>KT-PA: Kantin Putra</code>, <code>KT-PI: Kantin Putri</code>).</li>
                                <li>Gunakan tombol <strong>Transfer Stok</strong> untuk memindahkan barang dari Gudang Utama ke etalase kantin.</li>
                                <li>Pada layar <strong>Kasir (POS)</strong>, pilih dropdown gudang aktif di pojok atas agar penjualan memotong stok dari lokasi kantin yang tepat.</li>
                            </ul>
                        </div>

                        <div className="p-3.5 bg-white rounded-xl border border-gray-200 space-y-1.5">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5">
                                <i className="bi bi-clipboard2-check-fill text-teal-600"></i> Stock Opname &amp; Kulakan Otomatis
                            </h5>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                <li><strong>Integrasi Kulakan:</strong> Saat menambah stok masuk (<em>Restock</em>), centang opsi <em>"Catat sebagai Pengeluaran"</em> agar biaya kulakan (<code>Qty &times; Harga Beli</code>) otomatis tercatat di Keuangan Koperasi.</li>
                                <li><strong>Mode Stock Opname:</strong> Klik tombol <strong>Stock Opname</strong> di tab Produk, ketik jumlah fisik riil di rak, lalu klik <strong>Simpan Opname</strong>. Selisih barang hilang/lebih otomatis disesuaikan dan direkam ke Kartu Stok.</li>
                                <li><strong>Cetak Label Harga &amp; Barcode:</strong> Klik tombol <strong>Cetak Label</strong> untuk mencetak stiker harga &amp; barcode produk guna ditempel di rak display toko.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Manajemen Kasbon, Void/Retur Nota, Laba Rugi & Setor ke Buku Kas Pondok',
            color: 'purple',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">Piutang &amp; Cicilan</span>
                            <h5 className="font-bold text-gray-900">1. Kelola Kasbon &amp; Tagih WA</h5>
                            <p className="text-gray-600 leading-relaxed">
                                Di tab <strong>Kasbon (Hutang)</strong>, klik <strong>Detail / Bayar</strong> untuk menginput pembayaran cicilan (via Tunai, Potong Tabungan Santri, atau Non-Tunai). Klik ikon <strong>WhatsApp</strong> untuk mengirim rincian nota kasbon ke nomor HP Wali Santri atau nomor pembeli.
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] uppercase">Pembatalan Aman</span>
                            <h5 className="font-bold text-gray-900">2. Void / Retur Transaksi</h5>
                            <p className="text-gray-600 leading-relaxed">
                                Jika terjadi salah transaksi atau retur barang, buka tab <strong>Riwayat</strong> lalu klik ikon <strong>Batal / Void</strong>. Sistem otomatis mengembalikan stok ke gudang asal, mengembalikan (<em>refund</em>) saldo tabungan santri, dan membukukan jurnal koreksi di keuangan koperasi.
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">Integrasi Buku Kas</span>
                            <h5 className="font-bold text-gray-900">3. Setor Laba ke Pondok</h5>
                            <p className="text-gray-600 leading-relaxed">
                                Di tab <strong>Laba Rugi</strong>, sistem menghitung otomatis <em>Omzet</em>, <em>HPP</em>, dan <em>Margin Laba Bersih</em>. Klik tombol <strong>"Setor ke Buku Kas Pondok"</strong> untuk menyetorkan hasil usaha koperasi langsung ke <strong>Buku Kas Umum Pesantren</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '6. Panduan Koneksi Printer Thermal (Bluetooth ESC/POS & Browser Print)',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-3.5 text-xs space-y-2">
                        <h5 className="font-bold text-orange-950 flex items-center gap-2 text-sm">
                            <i className="bi bi-bluetooth text-blue-600"></i>
                            Dua Metode Pencetakan Struk Kasir (58mm &amp; 80mm)
                        </h5>
                        <p className="text-gray-700 leading-relaxed">
                            Anda dapat menghubungkan printer thermal kasir melalui tab <strong>Koperasi &gt; Pengaturan</strong> atau langsung menekan tombol indikator <strong>BT Printer</strong> di pojok kanan atas layar Kasir (POS):
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-white rounded-xl border border-blue-200 space-y-1.5">
                            <strong className="text-blue-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-bluetooth text-blue-600"></i> Metode 1: Bluetooth Langsung (Web Bluetooth ESC/POS)
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                <li><strong>Perangkat yang Didukung:</strong> Tablet/HP Android, Chromebook, dan Laptop Windows/Mac menggunakan browser <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>.</li>
                                <li><strong>Cara Menghubungkan:</strong> Nyalakan printer thermal Bluetooth &rarr; Buka tab <strong>Pengaturan</strong> (atau klik tombol <em>BT Printer</em> di header POS) &rarr; Pilih metode <code>Bluetooth Langsung (Web Bluetooth ESC/POS)</code> &rarr; Klik <strong>"Hubungkan Printer Bluetooth"</strong> &rarr; Pilih nama printer Anda.</li>
                                <li><strong>Keunggulan:</strong> Mencetak struk secara instan tanpa memunculkan pop-up dialog print sistem. Gunakan tombol <strong>"Tes Cetak Struk"</strong> untuk menguji hasil cetakan.</li>
                            </ul>
                        </div>

                        <div className="p-3.5 bg-white rounded-xl border border-gray-200 space-y-1.5">
                            <strong className="text-gray-900 flex items-center gap-1.5 font-bold">
                                <i className="bi bi-printer-fill text-teal-600"></i> Metode 2: Dialog Print Browser (USB / WiFi / iOS)
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                <li><strong>Perangkat yang Didukung:</strong> PC Desktop dengan printer kasir kabel USB, printer jaringan (LAN/WiFi), atau perangkat iPad/iPhone (iOS).</li>
                                <li><strong>Cara Mengatur:</strong> Pilih ukuran lebar kertas (<code>58mm</code> atau <code>80mm</code>) di tab <strong>Pengaturan</strong> dan aktifkan sakelar <strong>"Otomatis Cetak Struk"</strong> jika ingin struk langsung dicetak setiap selesai bayar.</li>
                                <li><strong>Fallback Otomatis:</strong> Apabila mode Bluetooth sedang terputus, sistem secara cerdas menawarkan opsi cetak via dialog browser agar pelayanan kasir tidak terhambat.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '7. SOP Standar Multi-Admin Koperasi: Cloud Real-Time vs Hub-and-Spoke',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-person-lock text-purple-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-purple-900 block mb-0.5">Rekomendasi Keamanan: Buat Akun Khusus Kasir / Penjaga Toko (RBAC):</strong>
                            Jangan berikan akun <em>Super Admin</em> kepada penjaga kantin/koperasi. Buka menu <strong>Pengaturan &gt; Akun Pengguna</strong>, buat akun baru dengan role <strong>Staff</strong>, lalu aktifkan hak akses <strong>hanya pada modul Koperasi</strong>. Dengan demikian, petugas kasir dapat melayani penjualan, stok, dan kasir tabungan tanpa bisa membuka data sensitif seperti SPP, Gaji Guru, atau Bimbingan Konseling (BK).
                        </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-shield-lock-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900 block mb-0.5">Arsitektur Multi-Kasir Bebas Bentrok (Collision-Safe Sync):</strong>
                            Seluruh 10 tabel database Koperasi (<code>produkKoperasi</code>, <code>transaksiKoperasi</code>, <code>riwayatStok</code>, <code>keuanganKoperasi</code>, <code>pembayaranHutang</code>, <code>pendingOrders</code>, <code>diskon</code>, <code>suppliers</code>, <code>warehouses</code>, dan <code>stockTransfers</code>) menggunakan <strong>Generator ID Unik Deterministik</strong>. Beberapa kasir di Kantin Putra, Kantin Putri, dan Toko Kitab dapat menginput transaksi secara serentak (baik online maupun offline) tanpa risiko nomor struk saling menimpa.
                        </div>
                    </div>

                    {/* Model A: Cloud Real-Time */}
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                            <h5 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-black">A</span>
                                Model A: SOP Cloud Real-Time (Firebase Firestore)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Multi-Kasir Live</span>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                            <li>
                                <strong>Partisi Gudang per Loket Kasir:</strong> Kasir di Kantin Putra wajib memilih gudang aktif <code>Kantin Putra</code> pada layar POS, sedangkan Kasir di Kantin Putri memilih <code>Kantin Putri</code>. Dengan demikian, pemotongan stok tidak saling mengganggu antar-kantin.
                            </li>
                            <li>
                                <strong>Sinkronisasi Saldo &amp; Limit Harian Seketika:</strong> Saat seorang santri berbelanja menggunakan <em>Tabungan Santri</em> di Kantin A, sisa saldo dan pemakaian limit harian santri tersebut langsung terbarui dalam hitungan detik di seluruh perangkat kasir lain serta di Portal Wali Santri.
                            </li>
                            <li>
                                <strong>Sinkronisasi Pengaturan Struk Aman:</strong> Perubahan nama toko, header/footer struk, dan ukuran kertas di tab Pengaturan otomatis disebarkan ke semua perangkat kasir tanpa menimpa konfigurasi akun lokal perangkat lain.
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
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Offline-First Kantin</span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Sangat ideal apabila bangunan kantin/koperasi tidak terjangkau WiFi pondok secara terus-menerus:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                                <strong className="text-indigo-950 block font-bold">
                                    <i className="bi bi-pc-display text-indigo-600"></i> Tugas Komputer HUB (Manajer Koperasi / Bendahara)
                                </strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-600">
                                    <li>Membuat master produk baru, mengatur harga beli/jual, mengelola daftar Gudang &amp; Supplier, serta melakukan <em>Transfer Stok</em> dari Gudang Utama ke kantin cabang.</li>
                                    <li>Sore/malam hari membuka <strong>Pusat Sinkronisasi</strong>, menggabungkan kiriman transaksi dari kasir (<strong>Merge</strong>), mempublikasikan <strong>Master Data</strong> terbaru, dan menyetorkan laba koperasi ke Buku Kas Pondok.</li>
                                </ul>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                                <strong className="text-indigo-950 block font-bold">
                                    <i className="bi bi-tablet text-teal-600"></i> Tugas Perangkat SPOKE (Tablet / HP Kasir Kantin)
                                </strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-600">
                                    <li><strong>Awal Shift (Pagi):</strong> Login saat terhubung hotspot/WiFi agar aplikasi otomatis menarik (<em>Auto-Pull</em>) daftar harga barang terbaru dan saldo tabungan santri terkini.</li>
                                    <li><strong>Jam Jajan Santri:</strong> Melayani transaksi POS, Kasir Tabungan, dan cetak struk Bluetooth secara 100% <em>offline</em> dengan respons instan.</li>
                                    <li><strong>Tutup Shift (Sore):</strong> Hubungkan kembali ke internet lalu klik <strong>"Kirim Perubahan ke Admin (Push to Inbox)"</strong>.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Golden Rules Audit Koperasi */}
                    <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 text-xs">
                        <h5 className="font-bold text-amber-400 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <i className="bi bi-check2-circle text-amber-400 text-sm"></i>
                            4 Aturan Emas (Golden Rules) Tata Kelola Koperasi &amp; Kantin Pesantren
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                            <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700">
                                <strong className="text-white block mb-0.5">1. Pastikan Gudang Aktif Sesuai Lokasi:</strong>
                                Sebelum melayani pembeli pertama, pastikan pilihan gudang di atas layar POS sesuai dengan etalase tempat Anda bertugas.
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700">
                                <strong className="text-white block mb-0.5">2. Batalkan Nota via Fitur Void / Retur:</strong>
                                Jika pembeli membatalkan belanja, gunakan tombol <strong>Void / Batal</strong> di tab Riwayat agar stok gudang dan saldo tabungan santri kembali otomatis.
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700">
                                <strong className="text-white block mb-0.5">3. Rutin Stock Opname Tiap Akhir Bulan:</strong>
                                Gunakan fitur <strong>Mode Stock Opname</strong> di tab Produk untuk mencocokkan jumlah fisik barang di rak dengan saldo sistem dan mendeteksi selisih lebih dini.
                            </div>
                            <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700">
                                <strong className="text-white block mb-0.5">4. Wajib Logout Setiap Pergantian Shift Kasir:</strong>
                                Setiap struk belanja dan penarikan tabungan mencatat nama akun kasir aktif. Pastikan <strong>Logout</strong> saat berganti shift jaga di perangkat tablet/PC bersama.
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
