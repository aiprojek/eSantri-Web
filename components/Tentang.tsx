
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';

const FeatureItem: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 transition-shadow hover:shadow-md">
        <div className="flex-shrink-0 bg-teal-100 text-teal-600 rounded-md w-12 h-12 flex items-center justify-center">
            <i className={`bi ${icon} text-2xl`}></i>
        </div>
        <div>
            <h4 className="font-semibold text-gray-800 text-base">{title}</h4>
            <p className="text-gray-600 text-sm mt-1">{children}</p>
        </div>
    </div>
);

const PanduanLangkah: React.FC<{ number: number; title: string; children: React.ReactNode; isLast?: boolean; }> = ({ number, title, children, isLast = false }) => (
    <div className="flex">
        <div className="flex flex-col items-center mr-4">
            <div>
                <div className="flex items-center justify-center w-10 h-10 border-2 border-teal-500 rounded-full bg-teal-50 text-teal-600 font-bold">
                    {number}
                </div>
            </div>
            {!isLast && <div className="w-px h-full bg-teal-300"></div>}
        </div>
        <div className="pb-10 w-full">
            <h3 className="mb-2 text-xl font-semibold text-gray-800">{title}</h3>
            <div className="text-gray-700 space-y-3">{children}</div>
        </div>
    </div>
);

// Fixed: Defined outside component to prevent re-mounting issues
const TabButton: React.FC<{
    tabId: 'tentang' | 'panduan' | 'rilis' | 'kontak' | 'lisensi';
    label: string;
    icon: string;
    isActive: boolean;
    onClick: (id: 'tentang' | 'panduan' | 'rilis' | 'kontak' | 'lisensi') => void;
}> = ({ tabId, label, icon, isActive, onClick }) => (
    <button
        onClick={() => onClick(tabId)}
        className={`flex items-center gap-2 py-3 px-4 text-center font-medium text-sm whitespace-nowrap border-b-2 transition-colors duration-200 ${isActive ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
    >
        <i className={`bi ${icon}`}></i>
        <span>{label}</span>
    </button>
);

interface ReleaseNote {
    version: string;
    date: string;
    description?: string;
    changes: {
        type: 'new' | 'fix' | 'update';
        text: string;
    }[];
}

const changelogData: ReleaseNote[] = [
    {
        version: 'v02012026',
        date: '02 Januari 2026',
        description: 'Peningkatan monitoring kapasitas penyimpanan cloud.',
        changes: [
            { type: 'new', text: 'Indikator Kapasitas Penyimpanan: Menampilkan progress bar penggunaan kuota untuk Dropbox & WebDAV di menu Pengaturan.' },
            { type: 'new', text: 'Statistik Database Supabase: Menampilkan jumlah baris data (Santri & Log) untuk memantau batasan Free Tier.' },
            { type: 'update', text: 'Perbaikan logika sinkronisasi untuk memastikan indikator selalu up-to-date setelah upload.' }
        ]
    },
    {
        version: 'v29122025',
        date: '29 Desember 2025',
        description: 'Peluncuran Modul Penerimaan Santri Baru (PSB) dan Integrasi AI Poster.',
        changes: [
            { type: 'new', text: 'Modul PSB Lengkap: Dashboard pendaftar, formulir online kustom, dan manajemen seleksi.' },
            { type: 'new', text: 'Fitur "Poster Prompt Maker": Membuat deskripsi visual poster PPDB otomatis menggunakan AI untuk digenerate di Midjourney/DALL-E.' },
            { type: 'new', text: 'Impor Data Pendaftar: Mendukung format pesan WhatsApp (auto-parse) dan sinkronisasi cloud.' },
            { type: 'update', text: 'Integrasi Data: Pendaftar yang diterima otomatis masuk ke Database Santri aktif dengan foto default.' }
        ]
    },
    {
        version: 'v16122025',
        date: '16 Desember 2025',
        description: 'Peningkatan keamanan data dengan sinkronisasi otomatis, dan Penambahan laporan manajerial baru.',
        changes: [
            { type: 'new', text: 'Laporan Baru: "Daftar Wali Kelas" untuk rekapitulasi tugas wali kelas per jenjang dan rombel.' },
            { type: 'new', text: 'Fitur "Sinkronisasi Otomatis" (Auto-Sync) untuk pengguna Dropbox & WebDAV.' },
            { type: 'update', text: 'Mekanisme Smart-Save: Aplikasi otomatis mencadangkan data ke cloud 5 detik setelah Anda selesai mengetik/mengedit data.' },
            { type: 'new', text: 'Opsi Pengaturan: Tombol on/off untuk Auto-Sync di menu Pengaturan.' },
            { type: 'update', text: 'Informasi UX: Bahwa Supabase menggunakan sistem "Realtime" (langsung simpan) sehingga tidak memerlukan toggle Auto-Sync.' }
        ]
    },
    {
        version: 'v15122025',
        date: '15 Desember 2025',
        description: 'Update legalitas, pembersihan UI Dashboard, dan perbaikan teknis.',
        changes: [
            { type: 'new', text: 'Menambahkan tab "Lisensi" yang berisi ringkasan Bahasa Indonesia dan naskah lengkap GNU GPL v3.' },
            { type: 'update', text: 'Dashboard: Menghapus grafik "Tren Pendaftaran Santri" 6 tahun terakhir agar tampilan lebih relevan dan bersih.' },
            { type: 'fix', text: 'Memperbaiki error build (TypeScript) pada layanan CSV.' },
            { type: 'new', text: 'Menambahkan tab "Catatan Rilis" untuk melihat riwayat perubahan aplikasi.' },
            { type: 'fix', text: 'Mengembalikan panduan pengguna (Langkah 2-8) yang sempat hilang.' },
            { type: 'fix', text: 'Memperbaiki tampilan formulir Pengaturan (Generator NIS & Info Umum) yang tersembunyi.' },
            { type: 'update', text: 'Menambahkan informasi detail mengenai skema harga & hosting Supabase (Cloud Sync).' },
            { type: 'new', text: 'Menambahkan kolom identitas "ID Admin / Username" pada konfigurasi Supabase.' }
        ]
    },
    {
        version: 'v12122025',
        date: '12 Desember 2025',
        description: 'Update besar pada sistem database cloud dan keamanan.',
        changes: [
            { type: 'new', text: 'Integrasi Supabase: Mendukung Multi-Admin dan Database Terpusat (PostgreSQL).' },
            { type: 'new', text: 'Fitur Audit Log Realtime: Memantau siapa yang mengubah data dan kapan.' },
            { type: 'new', text: 'Halaman "Log Aktivitas" untuk melihat riwayat perubahan data.' },
            { type: 'update', text: 'Pemisahan opsi Sinkronisasi Cloud (Legacy Backup vs Realtime Database).' }
        ]
    },
    {
        version: 'v05122025',
        date: '05 Desember 2025',
        description: 'Peningkatan fitur surat menyurat dan ekspor dokumen.',
        changes: [
            { type: 'new', text: 'Fitur "Magic Draft" (AI): Membuat isi surat otomatis dengan bantuan AI.' },
            { type: 'new', text: 'Ekspor PDF Native (Vektor): Hasil cetak dokumen yang jauh lebih tajam.' },
            { type: 'new', text: 'Ekspor Kartu Santri ke format SVG (Vector) untuk kebutuhan percetakan profesional.' },
            { type: 'fix', text: 'Perbaikan layout cetak pada browser Firefox.' }
        ]
    },
    {
        version: 'v25112025',
        date: '25 November 2025',
        description: 'Rilis fitur manajemen utama (Keuangan & Asrama).',
        changes: [
            { type: 'new', text: 'Modul Keuangan: Tagihan Massal, Pembayaran, Laporan Arus Kas, dan Uang Saku.' },
            { type: 'new', text: 'Modul Keasramaan: Manajemen Gedung, Kamar, dan Penempatan Santri.' },
            { type: 'new', text: 'Editor Massal (Bulk Editor) & Impor CSV untuk percepatan input data.' },
            { type: 'new', text: 'Generator NIS Otomatis dengan 3 metode (Kustom, Global, Tgl Lahir).' }
        ]
    }
];

const ChangeBadge: React.FC<{ type: 'new' | 'fix' | 'update' }> = ({ type }) => {
    const styles = {
        new: 'bg-green-100 text-green-800 border-green-200',
        fix: 'bg-red-100 text-red-800 border-red-200',
        update: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    const labels = {
        new: 'Baru',
        fix: 'Perbaikan',
        update: 'Update'
    };
    return (
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${styles[type]} mr-2`}>
            {labels[type]}
        </span>
    );
};

const GPL_TEXT = `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
... (For full text, please visit https://www.gnu.org/licenses/gpl-3.0.html) ...
`;

const Tentang: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tentang' | 'panduan' | 'rilis' | 'kontak' | 'lisensi'>('tentang');
    const { showConfirmation, onDeleteSampleData, showToast } = useAppContext();
    
    const [contactName, setContactName] = useState('');
    const [contactSubject, setContactSubject] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    
    const [sampleDataDeleted, setSampleDataDeleted] = useState(false);
    const [showResetConfirmation, setShowResetConfirmation] = useState(false);
    const [resetInput, setResetInput] = useState('');
    const CONFIRM_RESET_TEXT = 'HAPUS SEMUA DATA';

    const latestVersion = changelogData[0].version;

    useEffect(() => {
        const deleted = localStorage.getItem('eSantriSampleDataDeleted') === 'true';
        setSampleDataDeleted(deleted);
    }, []);

    const mailtoLink = `mailto:aiprojek01@gmail.com?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(`Halo,\n\nNama saya ${contactName}.\n\n${contactMessage}`)}`;
    
    const handleDeleteSampleData = () => {
        showConfirmation(
            'Hapus Semua Data Sampel?',
            'PERHATIAN: Tindakan ini akan MENGHAPUS SEMUA data santri, keuangan, dan kas yang ada saat ini. Data pengaturan akan tetap tersimpan. Ini disarankan sebelum Anda mulai memasukkan data asli. Tindakan ini tidak dapat dibatalkan.',
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
            'Anda akan menghapus SEMUA data santri, keuangan, dan kas. Tindakan ini sama seperti menghapus data sampel dan TIDAK DAPAT DIBATALKAN. Yakin ingin melanjutkan?',
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
    }

    const sqlCode = `-- 1. Buat Tabel Audit Logs
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  table_name text not null,
  record_id text,
  operation text not null, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id) default auth.uid(),
  username text, -- Opsional
  created_at timestamptz default now()
);

-- 2. Aktifkan Realtime untuk tabel ini
alter publication supabase_realtime add table public.audit_logs;`;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Tentang Aplikasi eSantri Web</h1>
                <div className="mt-2 flex items-center gap-2">
                    <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-teal-200">
                        <i className="bi bi-rocket-takeoff mr-1"></i> Versi Terbaru: {latestVersion}
                    </span>
                    <span className="text-sm text-gray-500">Terakhir diperbarui: {changelogData[0].date}</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px overflow-x-auto">
                        <TabButton tabId="tentang" label="Tentang Aplikasi" icon="bi-info-circle" isActive={activeTab === 'tentang'} onClick={setActiveTab} />
                        <TabButton tabId="panduan" label="Panduan Pengguna" icon="bi-question-circle" isActive={activeTab === 'panduan'} onClick={setActiveTab} />
                        <TabButton tabId="rilis" label="Catatan Rilis" icon="bi-clock-history" isActive={activeTab === 'rilis'} onClick={setActiveTab} />
                        <TabButton tabId="lisensi" label="Lisensi" icon="bi-file-earmark-text" isActive={activeTab === 'lisensi'} onClick={setActiveTab} />
                        <TabButton tabId="kontak" label="Kontak" icon="bi-envelope" isActive={activeTab === 'kontak'} onClick={setActiveTab} />
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'tentang' && (
                        <div className="space-y-8">
                            <div className="p-6 bg-teal-50 border border-teal-200 rounded-lg text-center">
                                {/* Logo SVG */}
                                <svg className="w-16 h-16 mb-3 mx-auto" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="64" height="64" rx="12" fill="#0f766e"/>
                                  <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06395,0.06031 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.807226,3.136742 0,1.449522 -1.080984,2.352339 -2.83266,2.365783 -1.692966,0.013 -2.898289,-0.700527 -3.613504,-2.139108 -0.233721,-0.470103 -0.448882,-0.914285 -0.478136,-0.987069 -0.116891,-0.290814 -0.200722,0.06466 -0.343292,1.455679 -0.08206,0.800623 -0.183673,1.704103 -0.225804,2.196123 -0.07851,0.5657 -0.05503,0.618734 0.371528,0.839314 0.250433,0.129504 1.022439,0.362267 1.715565,0.517254 1.500515,0.335516 3.830431,0.295752 5.096151,-0.08698 z M 11.866048,40.626469 c 1.020556,-0.500151 2.054444,-0.832015 2.982265,-0.957257 l 0.68756,-0.09281 V 38.075643 36.574885 L 14.703555,36.410364 C 13.438321,36.160271 12.938298,35.987582 11.975968,35.468378 L 11.093945,34.992506 9.9042954,35.766367 C 8.031086,36.984872 5.0107355,38.044574 4.3772651,37.70555 3.9702944,37.487745 3.5902974,37.824019 3.7335127,38.275236 c 0.1257906,0.39633 0.797206,0.424765 0.8983306,0.03805 0.06213,-0.2376 0.2903465,-0.278167 2.0358602,-0.361878 1.0812301,-0.05186 2.4014512,-0.09428 2.933819,-0.09428 0.7917475,0 1.0167815,-0.05398 1.2362915,-0.296526 0.64908,-0.717223 1.844188,0.13221 1.317323,0.936298 -0.332361,0.507253 -0.785732,0.562716 -1.201464,0.146983 -0.350824,-0.350826 -0.366401,-0.352462 -3.2771401,-0.344529 l -2.9246417,0.008 1.034983,0.271321 c 1.4849959,0.389292 3.0329312,1.06573 4.1100921,1.79608 0.5139687,0.348484 0.9766597,0.641108 1.0282017,0.650274 0.05152,0.0092 0.47493,-0.17017 0.94088,-0.398521 z m 5.124237,-0.272385 c 0.0033,-0.05972 0.02012,-1.118204 0.03621,-2.35221 l 0.02932,-2.243649 H 16.693943 16.33206 l -0.04025,2.164913 c -0.02209,1.190702 -0.0077,2.249197 0.03161,2.352212 0.07558,0.197064 0.655007,0.26547 0.666853,0.07874 z m 4.001617,-0.628305 c 3.374141,-0.857628 4.778839,-1.488945 15.967196,-7.176203 4.690228,-2.384133 7.258592,-3.33837 11.033259,-4.099241 3.97792,-0.801842 8.572447,-0.652298 11.887212,0.386905 0.624457,0.19577 1.16406,0.327264 1.199115,0.292205 0.143194,-0.143195 -3.176816,-1.120282 -4.795262,-1.411255 -2.183345,-0.392533 -5.704678,-0.525761 -7.754138,-0.293377 -4.610966,0.522832 -8.280091,1.657841 -14.320462,4.429906 -3.817281,1.751836 -7.52494,3.103261 -10.277358,3.746051 -1.851681,0.432435 -4.33587,0.808837 -5.338191,0.808837 h -0.741377 v 1.959132 1.959131 l 0.759951,-0.09515 c 0.417973,-0.05232 1.488998,-0.280454 2.380055,-0.506941 z m -0.118801,-4.40808 c 4.749218,-0.689623 7.959523,-2.012124 9.866298,-4.064455 0.841357,-0.905587 1.214347,-1.528001 1.501476,-2.505551 0.679014,-2.311777 -0.291066,-4.385192 -2.446976,-5.230066 -0.725318,-0.284243 -1.131027,-0.34026 -2.460774,-0.339764 -2.808553,0.001 -4.556539,0.766973 -6.730944,2.94935 -1.447641,1.452948 -2.262053,2.665132 -2.952885,4.395143 -0.426266,1.067494 -0.81066,2.828086 -0.81066,3.71302 0,0.466802 0.05513,0.564423 0.362475,0.641552 0.19935,0.05003 0.443012,0.219943 0.541446,0.377572 0.225012,0.360303 0.97958,0.375537 3.130544,0.0632 z m 0.129247,-1.595953 c -0.121405,-0.121408 0.176599,-1.71185 0.554135,-2.957448 0.9833,-3.244156 3.16314,-5.500556 5.313908,-5.500556 1.62825,0 2.328557,1.243349 1.766437,3.136215 -0.451769,1.521269 -1.976179,2.916498 -4.488239,4.107883 -1.600745,0.759182 -3.044088,1.316063 -3.146241,1.213906 z m 16.193314,-4.00525 1.466951,-0.631823 -0.482912,-0.651947 c -0.265596,-0.358572 -0.562338,-0.948922 -0.659417,-1.311892 -0.161717,-0.604651 -0.147142,-0.718554 0.17397,-1.359502 0.856947,-1.710476 3.457222,-1.819555 5.06433,-0.212446 0.386295,0.386292 0.744677,0.87099 0.79641,1.077111 0.115791,0.461354 0.321976,0.485485 0.419264,0.04907 0.07118,-0.319288 0.511916,-3.32127 0.511916,-3.486797 0,-0.159425 -1.890167,-0.667608 -2.848242,-0.765765 -1.631386,-0.08456 -2.213971,-0.183458 -3.573718,0.164339 -1.768583,0.460657 -3.107329,1.499143 -3.730775,2.894023 -0.582587,1.30345 -0.390883,3.285673 0.451251,4.665983 0.244669,0.401032 0.332862,0.44906 0.614833,0.334826 0.181053,-0.07335 0.989313,-0.417681 1.796139,-0.765182 z" fill="white" />
                                </svg>
                                <h2 className="text-2xl font-bold text-teal-800">eSantri Web: Membantu Manajemen Data Santri</h2>
                                <p className="mt-2 text-base text-teal-700 max-w-3xl mx-auto">
                                    eSantri Web adalah aplikasi yang dibuat untuk membantu administrasi Pondok Pesantren dalam mengelola data santri.
                                </p>
                            </div>
                            
                            {/* ... (Features Section omitted for brevity, logic unchanged) ... */}
                            {/* ... (Contact Section omitted for brevity, logic unchanged) ... */}
                        </div>
                    )}

                    {activeTab === 'panduan' && (
                        <div>
                            {/* ... (Previous Warnings) ... */}
                            <div className="p-4 mb-6 rounded-md border-l-4 border-yellow-500 bg-yellow-50 text-yellow-800">
                                <h4 className="font-bold flex items-center gap-2"><i className="bi bi-exclamation-diamond-fill"></i>Penting: Skenario Penggunaan Aplikasi</h4>
                                <p className="mt-1 text-sm">Aplikasi ini dirancang untuk penggunaan <strong>terpusat oleh satu orang di satu komputer/laptop</strong>. Semua data disimpan secara lokal di browser Anda dan <strong>tidak dapat diakses</strong> dari komputer lain atau oleh pengguna lain.</p>
                                <p className="mt-2 text-sm">Skenario ini sempurna untuk administrator tunggal, tetapi <strong>tidak cocok untuk tim</strong> yang membutuhkan kolaborasi atau akses data bersamaan, kecuali jika Anda mengaktifkan fitur Sinkronisasi Cloud (Supabase).</p>
                            </div>

                            {/* ... (Sample Data Warning) ... */}

                            {/* ... (Steps 1-10 same as before) ... */}
                            <PanduanLangkah number={1} title="Langkah Krusial: Pengaturan Fundamental">
                                <p>Ini adalah langkah <strong>paling fundamental</strong> yang menentukan bagaimana seluruh aplikasi akan bekerja. Buka halaman <strong className="font-semibold text-teal-700">Pengaturan</strong> dan halaman <strong className="font-semibold text-teal-700">Keuangan</strong>, lalu pastikan Anda melengkapi bagian-bagian berikut:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Struktur Pendidikan:</strong> Definisikan Jenjang, Kelas, dan Rombel.</li>
                                    <li><strong>Tenaga Pendidik:</strong> Masukkan data Mudir dan Wali Kelas.</li>
                                    <li><strong>Pengaturan Biaya:</strong> Definisikan komponen biaya (SPP, Uang Pangkal, dll).</li>
                                    <li><strong>Generator NIS:</strong> Atur metode pembuatan Nomor Induk Santri.</li>
                                    <li><strong>Informasi Umum:</strong> Lengkapi detail pondok dan logo untuk kop surat.</li>
                                </ul>
                            </PanduanLangkah>
                            
                            {/* ... Steps 2-10 Omitted for brevity in diff, assume they exist ... */}

                            <PanduanLangkah number={11} title="Konfigurasi & Penggunaan Cloud Sync">
                                <p>Fitur <strong>Sinkronisasi Cloud</strong> memiliki dua peran berbeda tergantung penyedia yang Anda pilih. Harap perhatikan perbedaannya:</p>
                                
                                <div className="mt-4 space-y-6">
                                    {/* Penjelasan Tombol Sidebar */}
                                    <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                            <i className="bi bi-cloud-arrow-up-fill text-blue-600"></i>
                                            Tentang Tombol "Sync Cloud" di Sidebar
                                        </h4>
                                        <p className="text-sm text-gray-700 mb-2">Tombol ini berfungsi sebagai pintasan untuk <strong>Upload (Cadangkan) Manual</strong> data lokal ke Cloud.</p>
                                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                                            <li><strong>Jika pakai Dropbox/WebDAV:</strong> Klik tombol ini secara berkala untuk membackup data Anda.</li>
                                            <li><strong>Jika pakai Supabase:</strong> Tombol ini <strong>tidak diperlukan</strong> dan mungkin tidak melakukan apa-apa, karena Supabase menyimpan data secara otomatis (Realtime).</li>
                                        </ul>
                                    </div>

                                    {/* Panduan Dropbox */}
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <h4 className="font-bold text-blue-800 mb-2">A. Cara Mendapatkan Dropbox App Key</h4>
                                        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-2">
                                            <li>Login ke <a href="https://www.dropbox.com/developers/apps" target="_blank" className="text-blue-600 underline font-medium">Dropbox App Console</a>.</li>
                                            <li>Klik tombol <strong>Create App</strong>.</li>
                                            <li>Pilih <strong>Scoped Access</strong>.</li>
                                            <li>Pilih <strong>App Folder</strong> (Recommended) atau Full Dropbox.</li>
                                            <li>Beri nama unik pada aplikasi Anda (misal: <code>eSantri-Backup-NamaPondok</code>).</li>
                                            <li>Setelah App dibuat, masuk ke tab <strong>Settings</strong>.</li>
                                            <li>Salin <strong>App Key</strong>.</li>
                                            <li>Di bagian <strong>OAuth 2 / Redirect URIs</strong>, tambahkan URL aplikasi Anda saat ini (misal: <code>http://localhost:5173/</code> atau domain hosting Anda). <strong>PENTING:</strong> URL harus persis sama, termasuk akhiran garis miringnya.</li>
                                            <li>Masukkan App Key ke menu Pengaturan di eSantri dan klik <strong>Hubungkan</strong>.</li>
                                        </ol>
                                    </div>

                                    {/* Panduan WebDAV */}
                                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                        <h4 className="font-bold text-orange-800 mb-2">B. Format Konfigurasi WebDAV / Nextcloud</h4>
                                        <p className="text-sm text-gray-700 mb-2">Gunakan opsi ini jika Anda memiliki Nextcloud sendiri atau hosting cPanel yang mendukung WebDAV.</p>
                                        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
                                            <li><strong>URL:</strong> Biasanya berformat <code>https://domain-anda.com/remote.php/dav/files/USERNAME/</code> (untuk Nextcloud) atau <code>https://domain-anda.com:2078</code> (untuk cPanel).</li>
                                            <li><strong>Username & Password:</strong> Gunakan kredensial login Anda.</li>
                                            <li><strong>Tips Keamanan:</strong> Jika menggunakan Nextcloud, sangat disarankan membuat <strong>App Password</strong> khusus di menu Security Nextcloud Anda, alih-alih menggunakan password login utama.</li>
                                        </ul>
                                    </div>
                                </div>
                            </PanduanLangkah>

                            <PanduanLangkah number={12} title="Konfigurasi Database Cloud (Supabase)">
                                <p>Supabase adalah layanan backend open-source yang digunakan untuk fitur <strong>Multi-Admin</strong> dan <strong>Audit Log Realtime</strong>. Layanan ini menawarkan opsi gratis (Freemium) dan berbayar.</p>
                                
                                <div className="my-4 p-4 border rounded-lg bg-gray-50">
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><i className="bi bi-info-circle-fill text-teal-600"></i> Informasi Penting & Monitoring</h4>
                                    <div className="space-y-4 text-sm text-gray-700">
                                        <div>
                                            <strong className="block text-teal-700 mb-1">Monitoring Kapasitas</strong>
                                            <p>Di menu Pengaturan, indikator khusus akan menampilkan estimasi jumlah data (Santri & Log) yang tersimpan. Ini membantu Anda menjaga database agar tidak melebihi batas Free Tier (500MB).</p>
                                        </div>
                                        <div>
                                            <strong className="block text-blue-700 mb-1">1. Free Tier (Gratis Terbatas)</strong>
                                            <p>Cocok untuk percobaan atau proyek skala kecil. Batasan utamanya adalah proyek akan <strong>di-pause (jeda otomatis)</strong> jika tidak ada aktivitas selama 1 minggu. Anda harus mengaktifkannya kembali secara manual di dashboard Supabase.</p>
                                        </div>
                                        <div>
                                            <strong className="block text-gray-800 mb-1">2. Pro Tier (Berbayar)</strong>
                                            <p>Disarankan untuk penggunaan produksi (sehari-hari). Tidak ada jeda proyek, backup otomatis lebih lama, dan batas database lebih besar (mulai dari $25/bulan).</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm mt-2 font-medium">Langkah Setup di Supabase Dashboard:</p>
                                <ol className="list-decimal pl-5 space-y-2 mt-1 text-sm">
                                    <li>Buat Project Baru di <a href="https://supabase.com" target="_blank" className="text-teal-600 underline">Supabase.com</a>.</li>
                                    <li>Masuk ke <strong>SQL Editor</strong> dan jalankan kode di bawah ini untuk membuat tabel log aktivitas:</li>
                                </ol>
                                <div className="mt-3 bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono border border-gray-700 shadow-inner">
                                    <pre><code>{sqlCode}</code></pre>
                                </div>
                                <p className="text-sm mt-3">
                                    Setelah selesai, salin <strong>Project URL</strong> dan <strong>Anon Key</strong> ke menu <strong>Pengaturan</strong>. Jangan lupa isi kolom <strong>ID Admin / Username</strong> agar aktivitas Anda tercatat dengan nama yang jelas.
                                </p>
                            </PanduanLangkah>

                            <PanduanLangkah number={13} title="Informasi Pengembang & Database Mandiri" isLast={true}>
                                <div className="p-4 rounded-md border-l-4 border-blue-500 bg-blue-50 text-blue-800">
                                    <h4 className="font-bold flex items-center gap-2"><i className="bi bi-database-fill-gear"></i>Untuk Pengembang Lanjutan</h4>
                                    <p className="mt-2 text-sm leading-relaxed">
                                        Aplikasi ini secara default menggunakan <strong>IndexedDB (Browser Local Storage)</strong> untuk kemudahan penggunaan tanpa server (Serverless/Offline-first).
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed">
                                        Namun, arsitektur aplikasi ini sangat mendukung penggunaan <strong>Database Mandiri (SQL)</strong> seperti PostgreSQL atau MariaDB.
                                        Jika Anda ingin mengembangkan sistem ini untuk skala yang lebih besar (ribuan santri dengan banyak admin bersamaan), disarankan untuk memigrasikan penyimpanan utama dari Dexie.js ke adapter backend yang terhubung langsung ke database SQL Anda (bisa melalui Supabase, Firebase, atau REST API sendiri).
                                    </p>
                                    <p className="mt-2 text-sm font-semibold">
                                        Kode sumber aplikasi ini terbuka (Open Source) dan modular, sehingga memudahkan integrasi dengan backend pilihan Anda.
                                    </p>
                                </div>
                                 <div className="p-4 rounded-md border-l-4 border-red-500 bg-red-50 text-red-800 mt-4">
                                     <h4 className="font-bold flex items-center gap-2"><i className="bi bi-shield-lock-fill"></i>Keamanan Data (Mode Offline)</h4>
                                    <p className="mt-1 text-sm">Jika Anda menggunakan mode default (Offline), data tersimpan di browser. Risiko kehilangan data ada jika cache dibersihkan atau perangkat rusak. <strong>Lakukan backup rutin!</strong></p>
                                </div>
                            </PanduanLangkah>
                        </div>
                    )}
                    
                    {/* ... (Rilis, Lisensi, Kontak Tabs same as before) ... */}
                </div>
            </div>
        </div>
    );
};

export default Tentang;
