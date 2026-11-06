import React from 'react';
import { PanduanSectionData } from '../panduan';

export const r2Panduan: PanduanSectionData = {
    id: 'r2',
    badge: 'NEW',
    badgeColor: 'orange',
    title: 'Cloudflare R2 (S3 Object Storage Hub & Spoke)',
    steps: [
        {
            title: '1. Apa itu Cloudflare R2?',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="bg-orange-50 p-4 rounded-xl border-l-4 border-orange-500 text-xs text-orange-950 space-y-2">
                        <p className="font-bold text-sm text-orange-900 flex items-center gap-2">
                            <i className="bi bi-box-seam-fill text-orange-600"></i>
                            Penyimpanan Berkas Modern Alternatif AWS S3 & Dropbox
                        </p>
                        <p className="leading-relaxed">
                            <strong>Cloudflare R2</strong> adalah layanan <em>Object Storage</em> kompatibel dengan standar Amazon S3. 
                            Di aplikasi e-Santri, R2 bertindak sebagai <strong>Cloud Hub</strong> tempat Admin dan Staf menyimpan file backup, 
                            menyetor paket data perubahan harian (<em>inbox staff</em>), dan mengunduh data Master Pondok.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-slate-800 block flex items-center gap-1">
                                <i className="bi bi-hdd-fill text-orange-600"></i> 10 GB Kuota Gratis
                            </span>
                            <p className="text-[11px] text-gray-600">
                                5x lipat lebih lega dari Dropbox Free (2 GB). Cukup untuk ribuan file backup data santri dan transaksi.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-slate-800 block flex items-center gap-1">
                                <i className="bi bi-cash-coin text-green-600"></i> $0 Biaya Egress
                            </span>
                            <p className="text-[11px] text-gray-600">
                                Mengunduh file data dari R2 100% gratis tanpa biaya bandwidth, berbeda dengan AWS S3 atau Google Cloud.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-slate-800 block flex items-center gap-1">
                                <i className="bi bi-infinity text-blue-600"></i> Bebas Batas Perangkat
                            </span>
                            <p className="text-[11px] text-gray-600">
                                Tidak ada batasan 3 perangkat seperti akun Dropbox Basic. Seluruh komputer staf dapat terhubung bebas.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Cara Setup di Platform Cloudflare (Admin Pusat)',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p>Ikuti langkah berikut di dashboard Cloudflare untuk mendapatkan kunci koneksi:</p>
                    <ol className="list-decimal pl-5 space-y-2.5 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                        <li>
                            <strong>Login ke Cloudflare Dashboard:</strong> Buka <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-orange-600 font-bold underline">dash.cloudflare.com</a>. Jika belum punya akun, daftar gratis terlebih dahulu.
                        </li>
                        <li>
                            <strong>Buat Bucket Penyimpanan:</strong>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                <li>Di sidebar kiri, pilih menu <strong>R2 Object Storage</strong>.</li>
                                <li>Klik tombol <strong>Create bucket</strong>.</li>
                                <li>Beri nama bucket, contoh: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-bold text-orange-700">esantri-backup</code>.</li>
                                <li>Pilih Location: <strong>Automatic</strong> (atau Asia Pacific / APAC), lalu klik <strong>Create bucket</strong>.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Buat Kunci Akses (R2 API Token):</strong>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                <li>Kembali ke halaman utama R2, klik tombol <strong>Manage R2 API Tokens</strong> di sebelah kanan atas.</li>
                                <li>Klik <strong>Create API token</strong>.</li>
                                <li>Nama Token: misal <code className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-bold">Token-eSantri</code>.</li>
                                <li>Pada bagian <strong>Permissions</strong>, pilih opsi <strong>Object Read &amp; Write</strong> (wajib agar aplikasi bisa membaca dan menulis data backup).</li>
                                <li>Pada bagian <strong>Specify bucket(s)</strong>, pilih bucket yang baru saja dibuat atau <em>All buckets</em>.</li>
                                <li>Klik <strong>Create API Token</strong>.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Salin Kredensial:</strong> Simpan nilai berikut (karena Secret Key hanya ditampilkan sekali):
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-700 font-mono text-[11px]">
                                <li><strong>Access Key ID</strong> (contoh: <code>4f89d...</code>)</li>
                                <li><strong>Secret Access Key</strong> (contoh: <code>e87a2b...</code>)</li>
                                <li><strong>Account ID</strong> (dapat dilihat di URL atau panel kanan overview R2)</li>
                            </ul>
                        </li>
                    </ol>
                </div>
            )
        },
        {
            title: '3. Konfigurasi di Aplikasi e-Santri',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <ol className="list-decimal pl-5 space-y-2 text-xs bg-white p-3.5 rounded-xl border border-orange-200">
                        <li>Buka aplikasi e-Santri &gt; menu <strong>Pengaturan &gt; Cloud</strong>.</li>
                        <li>Pada <strong>Langkah 1</strong>, pilih kartu <strong>Mode Hub &amp; Spoke</strong>.</li>
                        <li>Pada <strong>Langkah 2</strong>, klik tombol <strong>Cloudflare R2 (S3 Storage)</strong>.</li>
                        <li>
                            Masukkan kredensial yang didapat dari Cloudflare:
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                <li><strong>Account ID:</strong> Paste Account ID Cloudflare Anda.</li>
                                <li><strong>Nama Bucket:</strong> Masukkan nama bucket (misal: <code>esantri-backup</code>).</li>
                                <li><strong>Access Key ID &amp; Secret Access Key:</strong> Paste kedua kunci API Token.</li>
                            </ul>
                        </li>
                        <li>Klik tombol <strong>Simpan Perubahan</strong> di bagian bawah layar.</li>
                    </ol>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-900 text-xs flex items-center gap-2">
                        <i className="bi bi-shield-lock-fill text-green-600 text-base"></i>
                        <span>Kredensial rahasia otomatis disembunyikan dan dienkripsi di penyimpanan lokal browser.</span>
                    </div>
                </div>
            )
        },
        {
            title: '4. Membagikan Akses ke Komputer Staf (Pairing Code)',
            color: 'purple',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="text-xs">
                        Staf di komputer lain <strong>TIDAK PERLU</strong> membuat akun Cloudflare atau memasukkan API Key secara manual. 
                        Cukup gunakan fitur <strong>Pairing Code</strong>:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
                            <strong className="text-purple-900 block font-bold flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
                                Komputer Admin (Pusat)
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Di panel Cloudflare R2 yang sudah terkonfigurasi, klik tombol <strong>"Bagikan Akses ke Staff (Pairing Code)"</strong>.
                                Salin kode yang berawalan <code>ESANTRI-CLOUD-...</code> lalu kirimkan ke staf via WhatsApp atau catatan internal.
                            </p>
                        </div>
                        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                            <strong className="text-blue-900 block font-bold flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                                Komputer Staf (Cabang / Spoke)
                            </strong>
                            <p className="text-[11px] text-gray-600 leading-relaxed">
                                Staf membuka menu <em>Pengaturan &gt; Cloud</em>, lalu paste kode tersebut di kotak <strong>"Setup Cepat (Untuk Staff)"</strong> 
                                dan klik <strong>Hubungkan</strong>. Sistem akan langsung mengkloning akses R2 dan mengunduh data Master terbaru.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '5. Alur Kerja Harian Hub & Spoke dengan R2',
            color: 'teal',
            content: (
                <div className="space-y-2.5 text-xs text-gray-700">
                    <p>Alur kerja operasional menggunakan Cloudflare R2 sama persis dengan SOP Hub &amp; Spoke standar:</p>
                    <div className="space-y-2">
                        <div className="border-l-4 border-green-500 pl-3 py-1 bg-green-50 rounded-r">
                            <strong className="text-green-800 font-bold block">Pagi Hari (Staf):</strong>
                            <span>Staf membuka aplikasi dan mengeklik <em>Sync &gt; Ambil Data Master Terbaru</em> dari R2.</span>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50 rounded-r">
                            <strong className="text-blue-800 font-bold block">Siang Hari (Staf):</strong>
                            <span>Input transaksi pembayaran SPP, presensi, atau pendaftaran santri offline tanpa internet.</span>
                        </div>
                        <div className="border-l-4 border-orange-500 pl-3 py-1 bg-orange-50 rounded-r">
                            <strong className="text-orange-800 font-bold block">Sore Hari (Staf &amp; Admin):</strong>
                            <span>Staf mengeklik <em>Setor Data Perubahan</em> ke R2. Admin pusat membuka <strong>Pusat Sync</strong>, menggabungkan kiriman staf, lalu mengeklik <strong>Publikasikan Master</strong>.</span>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
