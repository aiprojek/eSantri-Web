import React from 'react';
import { PanduanSectionData } from '../panduan';

export const d1Panduan: PanduanSectionData = {
    id: 'd1',
    badge: 'NEW',
    badgeColor: 'cyan',
    title: 'Cloudflare D1 + Workers (Edge SQLite Real-Time)',
    steps: [
        {
            title: '1. Apa itu Cloudflare D1 + Workers?',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="bg-cyan-50 p-4 rounded-xl border-l-4 border-cyan-500 text-xs text-cyan-950 space-y-2">
                        <p className="font-bold text-sm text-cyan-900 flex items-center gap-2">
                            <i className="bi bi-hdd-stack text-cyan-600"></i>
                            Database Serverless SQLite Terdistribusi di Jaringan Edge Cloudflare
                        </p>
                        <p className="leading-relaxed">
                            <strong>Cloudflare D1</strong> adalah database relasional SQLite serverless pertama dari Cloudflare yang berjalan langsung 
                            di 300+ data center edge di seluruh dunia. Digabungkan dengan <strong>Cloudflare Workers</strong> sebagai jembatan REST API, 
                            aplikasi e-Santri dapat membaca dan menulis data santri dengan latensi super rendah di bawah 50 milidetik.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-slate-800 block flex items-center gap-1">
                                <i className="bi bi-eye-fill text-cyan-600"></i> 5 Juta Baris Baca/Hari
                            </span>
                            <p className="text-[11px] text-gray-600">
                                Kuota baca harian yang masif dan gratis tanpa kartu kredit, sangat melimpah untuk seluruh civitas pesantren.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-slate-800 block flex items-center gap-1">
                                <i className="bi bi-pencil-fill text-green-600"></i> 100 Ribu Tulis/Hari
                            </span>
                            <p className="text-[11px] text-gray-600">
                                100.000 kali transaksi penyimpanan harian, mencukupi untuk ribuan transaksi kas, absensi, dan mutaba'ah.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-slate-800 block flex items-center gap-1">
                                <i className="bi bi-lightning-charge-fill text-amber-500"></i> 5 GB Database Gratis
                            </span>
                            <p className="text-[11px] text-gray-600">
                                Kapasitas database murni 5 GB gratis yang setara dengan jutaan baris entri santri pesantren.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Cara Setup di Platform Cloudflare (Admin Pusat)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p>Ikuti tahapan di dashboard Cloudflare untuk menyiapkan database D1 dan Worker API:</p>
                    <ol className="list-decimal pl-5 space-y-2.5 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                        <li>
                            <strong>Login ke Cloudflare Dashboard:</strong> Buka <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-cyan-700 font-bold underline">dash.cloudflare.com</a>.
                        </li>
                        <li>
                            <strong>Buat Database D1:</strong>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                <li>Di menu sebelah kiri, pilih <strong>Workers &amp; Pages</strong> &gt; pilih sub-menu <strong>D1 SQL Database</strong>.</li>
                                <li>Klik tombol <strong>Create database</strong>.</li>
                                <li>Masukkan nama database, misal: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-bold text-cyan-800">esantri-d1</code>.</li>
                                <li>Pilih region: <strong>Asia-Pacific (APAC)</strong> agar server dekat dengan lokasi pondok.</li>
                                <li>Klik <strong>Create</strong>.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Deploy Cloudflare Worker (REST API Bridge):</strong>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                <li>Buka menu <strong>Workers &amp; Pages</strong> &gt; Klik <strong>Create application</strong> &gt; <strong>Create Worker</strong>.</li>
                                <li>Beri nama worker, misal: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-bold">esantri-sync-api</code>.</li>
                                <li>Di bagian <strong>Settings &gt; Bindings</strong> Worker tersebut, tambahkan <strong>D1 Database Binding</strong> ke database <code>esantri-d1</code>.</li>
                                <li>Di bagian <strong>Settings &gt; Variables and Secrets</strong>, buat variabel <code>SYNC_SECRET_TOKEN</code> berisi kode rahasia unik Anda.</li>
                                <li>Salin URL Worker Anda (format: <code>https://esantri-sync-api.subdomain.workers.dev</code>).</li>
                            </ul>
                        </li>
                    </ol>
                </div>
            )
        },
        {
            title: '3. Konfigurasi di Aplikasi e-Santri',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <ol className="list-decimal pl-5 space-y-2 text-xs bg-white p-3.5 rounded-xl border border-cyan-200">
                        <li>Buka aplikasi e-Santri &gt; menu <strong>Pengaturan &gt; Cloud</strong>.</li>
                        <li>Pada <strong>Langkah 1</strong>, pilih kartu <strong>Mode Real-Time</strong>.</li>
                        <li>Pada <strong>Langkah 2</strong>, klik tombol <strong>Cloudflare D1 + Workers</strong>.</li>
                        <li>
                            Masukkan data endpoint:
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                <li><strong>Cloudflare Worker API URL:</strong> Paste URL Worker (contoh: <code>https://esantri-sync.subdomain.workers.dev</code>).</li>
                                <li><strong>Worker Secret / Bearer API Token:</strong> Masukkan token rahasia yang sama dengan yang disetel pada Worker.</li>
                                <li><strong>Nama Database D1 (Opsional):</strong> Masukkan nama database (misal: <code>esantri-d1</code>).</li>
                            </ul>
                        </li>
                        <li>Klik tombol <strong>Simpan Perubahan</strong> di bagian bawah layar.</li>
                    </ol>
                </div>
            )
        },
        {
            title: '4. Membagikan Akses ke Komputer Staf (Pairing Code)',
            color: 'purple',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="text-xs">
                        Untuk mendistribusikan koneksi D1 ke komputer staf tanpa perlu membocorkan token rahasia secara manual:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-xs bg-purple-50 p-3.5 rounded-xl border border-purple-200">
                        <li>Di komputer Admin, klik tombol <strong>"Bagikan Akses ke Staff (Pairing Code)"</strong> pada panel Cloudflare D1.</li>
                        <li>Salin kode pairing yang muncul (berawalan <code>ESANTRI-CLOUD-...</code>).</li>
                        <li>Di komputer staf, buka <em>Pengaturan &gt; Cloud</em>, masukkan kode pada kotak <strong>"Setup Cepat"</strong>, lalu klik <strong>Hubungkan</strong>.</li>
                    </ol>
                </div>
            )
        }
    ]
};
