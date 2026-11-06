import React from 'react';
import { PanduanSectionData } from '../panduan';

export const supabasePanduan: PanduanSectionData = {
    id: 'supabase',
    badge: 'NEW',
    badgeColor: 'emerald',
    title: 'Supabase (Realtime PostgreSQL Cloud)',
    steps: [
        {
            title: '1. Apa itu Supabase Realtime?',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="bg-emerald-50 p-4 rounded-xl border-l-4 border-emerald-500 text-xs text-emerald-950 space-y-2">
                        <p className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                            <i className="bi bi-database-check text-emerald-600"></i>
                            Database PostgreSQL Terbuka dengan Sinkronisasi WebSocket Instan
                        </p>
                        <p className="leading-relaxed">
                            <strong>Supabase</strong> adalah alternatif open-source dari Firebase yang menggunakan mesin database relasional <strong>PostgreSQL</strong>.
                            Di e-Santri, Supabase berjalan dalam <strong>Mode Real-Time</strong>: setiap kali bendahara menginput pembayaran SPP atau guru mencatat absensi, 
                            layar komputer admin lain akan langsung diperbarui dalam hitungan detik melalui sambungan <em>WebSocket Channels</em>.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-slate-800 block flex items-center gap-1">
                                <i className="bi bi-hdd-network text-emerald-600"></i> 500 MB Database Gratis
                            </span>
                            <p className="text-[11px] text-gray-600">
                                Kapasitas database relasional yang sangat lega untuk ribuan rekam jejak santri dan log keuangan pesantren.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-slate-800 block flex items-center gap-1">
                                <i className="bi bi-broadcast text-blue-600"></i> Realtime WebSocket
                            </span>
                            <p className="text-[11px] text-gray-600">
                                Tidak perlu lagi proses manual "Setor Data" dan "Gabung Inbox". Perubahan data mengalir otomatis antar komputer.
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                            <span className="font-bold text-slate-800 block flex items-center gap-1">
                                <i className="bi bi-table text-purple-600"></i> Relasional &amp; Terstruktur
                            </span>
                            <p className="text-[11px] text-gray-600">
                                Menggunakan SQL murni sehingga mudah diekspor ke format SQL standar atau diintegrasikan ke dashboard analitik lain.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Cara Setup di Platform Supabase (Admin Pusat)',
            color: 'teal',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p>Ikuti panduan berikut di dashboard Supabase untuk menyiapkan database:</p>
                    <ol className="list-decimal pl-5 space-y-2.5 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                        <li>
                            <strong>Buat Akun Supabase:</strong> Buka <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold underline">supabase.com</a> dan buat akun gratis (bisa login menggunakan akun GitHub).
                        </li>
                        <li>
                            <strong>Buat Project Baru:</strong>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                <li>Klik tombol <strong>New Project</strong>.</li>
                                <li>Pilih Organization Anda.</li>
                                <li>Name: Beri nama project, misal: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-bold text-emerald-700">esantri-pondok</code>.</li>
                                <li>Database Password: Buat password yang kuat dan catat di tempat aman.</li>
                                <li>Region: Pilih lokasi terdekat, disarankan <strong>Singapore (ap-southeast-1)</strong> untuk latensi tercepat di Indonesia.</li>
                                <li>Klik <strong>Create new project</strong> dan tunggu sekitar 1-2 menit hingga provisioning database selesai.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Dapatkan Project URL &amp; API Key:</strong>
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                <li>Di sidebar kiri, klik ikon gerigi <strong>Project Settings</strong>.</li>
                                <li>Pilih sub-menu <strong>API</strong>.</li>
                                <li>Salin <strong>Project URL</strong> (format: <code>https://xyzabcdefghijklmn.supabase.co</code>).</li>
                                <li>Pada bagian <strong>Project API keys</strong>, salin kunci bertuliskan <strong>anon public</strong> (kunci aman untuk klien browser).</li>
                                <li className="text-amber-800 font-semibold">* Jangan gunakan kunci service_role di browser untuk alasan keamanan!</li>
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
                    <ol className="list-decimal pl-5 space-y-2 text-xs bg-white p-3.5 rounded-xl border border-emerald-200">
                        <li>Buka aplikasi e-Santri &gt; menu <strong>Pengaturan &gt; Cloud</strong>.</li>
                        <li>Pada <strong>Langkah 1</strong>, pilih kartu <strong>Mode Real-Time</strong>.</li>
                        <li>Pada <strong>Langkah 2</strong>, klik tombol <strong>Supabase (PostgreSQL Realtime)</strong>.</li>
                        <li>
                            Masukkan konfigurasi:
                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600">
                                <li><strong>Project URL Supabase:</strong> Paste URL project Anda.</li>
                                <li><strong>Supabase Anon API Key:</strong> Paste token anon public yang sudah disalin.</li>
                                <li><strong>Table Prefix (Opsional):</strong> Biarkan <code>esantri_</code> sebagai awalan tabel default.</li>
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
                        Untuk menghubungkan laptop bendahara, guru, atau satpam lainnya ke database Supabase yang sama:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-xs bg-purple-50 p-3.5 rounded-xl border border-purple-200">
                        <li>Di komputer Admin, klik tombol <strong>"Bagikan Akses ke Staff (Pairing Code)"</strong> pada panel Supabase.</li>
                        <li>Salin kode pairing yang muncul (berawalan <code>ESANTRI-CLOUD-...</code>).</li>
                        <li>Di komputer staf, buka <em>Pengaturan &gt; Cloud</em>, paste kode di kotak <strong>"Setup Cepat"</strong>, lalu klik <strong>Hubungkan</strong>.</li>
                        <li>Koneksi Supabase langsung aktif di komputer staf tanpa perlu login akun Supabase secara mandiri.</li>
                    </ol>
                </div>
            )
        }
    ]
};
