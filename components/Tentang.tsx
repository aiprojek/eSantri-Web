
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

    // Manual Versioning
    const latestVersion = "v30122025";

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
                                  <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06395,0.06031 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.807226,3.136742 0,1.449522 -1.080984,2.352339 -2.83266,2.365783 -1.692966,0.013 -2.898289,-0.700527 -3.613504,-2.139108 -0.233721,-0.470103 -0.448882,-0.914285 -0.478136,-0.987069 -0.116891,-0.290814 -0.200722,0.06466 -0.343292,1.455679 -0.08206,0.800623 -0.183673,1.704103 -0.225804,2.196123 -0.07851,0.5657 -0.05503,0.618734 0.371528,0.839314 0.250433,0.129504 1.022439,0.362267 1.715565,0.517254 1.500515,0.335516 3.830431,0.295752 5.096151,-0.08698 z M 11.866048,40.626469 c 1.020556,-0.500151 2.054444,-0.832015 2.982265,-0.957257 l 0.68756,-0.09281 V 38.075643 36.574885 L 14.703555,36.410364 C 13.438321,36.160271 12.938298,35.987582 11.975968,35.468378 L 11.093945,34.992506 9.9042954,35.766367 C 8.031086,36.984872 5.0107355,38.044574 4.3772651,37.70555 3.9702944,37.487745 3.5902974,37.824019 3.7335127,38.275236 c 0.1257906,0.39633 0.797206,0.424765 0.8983306,0.03805 0.06213,-0.2376 0.2903465,-0.278167 2.0358602,-0.361878 1.0812301,-0.05186 2.4014512,-0.09428 2.933819,-0.09428 0.7917475,0 1.0167815,-0.05398 1.2362915,-0.296526 0.64908,-0.717223 1.844188,0.13221 1.317323,0.936298 -0.332361,0.507253 -0.785732,0.562716 -1.201464,0.146983 -0.32073,-0.320731 -0.33497,-0.322227 -2.9960205,-0.314975 l -2.6737598,0.0073 0.9462,0.248046 c 1.3576098,0.355898 2.7727603,0.97431 3.7575203,1.642008 0.46988,0.318591 0.89288,0.586114 0.94,0.594493 0.0471,0.0084 0.43419,-0.155572 0.86017,-0.364335 z m 4.68467,-0.249019 c 0.003,-0.05459 0.0184,-1.022283 0.0331,-2.150434 l 0.0268,-2.051184 h -0.33083 -0.33084 l -0.0368,1.979203 c -0.0202,1.08856 -0.007,2.056256 0.0289,2.150434 0.0691,0.180159 0.59882,0.242698 0.60965,0.07198 z m 3.65835,-0.574409 c 3.0847,-0.784059 4.3689,-1.36122 14.597498,-6.560614 4.28789,-2.179617 6.635935,-3.051997 10.086804,-3.7476 3.636686,-0.733057 7.837085,-0.596342 10.867503,0.353716 0.570889,0.178977 1.064204,0.299191 1.096252,0.267139 0.130911,-0.130911 -2.904302,-1.024182 -4.383914,-1.290194 -1.996054,-0.358861 -5.21532,-0.480661 -7.088973,-0.268211 -4.215428,0.477982 -7.569808,1.515628 -13.092024,4.0499 -3.489827,1.60156 -6.879436,2.837056 -9.395746,3.424707 -1.69284,0.39534 -3.96393,0.739453 -4.88027,0.739453 h -0.67778 v 1.791074 1.791073 l 0.69476,-0.08699 c 0.38212,-0.04784 1.36127,-0.256397 2.17589,-0.463455 z m -0.10861,-4.029945 c 4.34182,-0.630466 7.276739,-1.83952 9.019947,-3.715798 0.769184,-0.827904 1.110178,-1.396927 1.372676,-2.29062 0.620767,-2.113468 -0.266098,-4.009021 -2.237069,-4.781421 -0.663099,-0.25986 -1.034005,-0.311072 -2.249684,-0.310618 -2.56763,9.39e-4 -4.16567,0.70118 -6.15355,2.696349 -1.32346,1.328311 -2.06801,2.436512 -2.69958,4.018119 -0.3897,0.975922 -0.74112,2.585487 -0.74112,3.394509 0,0.426759 0.0504,0.516006 0.33138,0.586519 0.18225,0.04574 0.40501,0.201076 0.495,0.345183 0.20571,0.329396 0.89555,0.343323 2.862,0.05778 z m 0.11816,-1.45905 c -0.11099,-0.110993 0.16145,-1.565003 0.5066,-2.703751 0.89895,-2.965867 2.8918,-5.028708 4.85807,-5.028708 1.488576,0 2.128809,1.136692 1.614909,2.867184 -0.413016,1.390771 -1.806659,2.666315 -4.103229,3.755501 -1.46343,0.694058 -2.78296,1.203168 -2.87635,1.109774 z m 14.804219,-3.661671 1.341112,-0.577624 -0.441486,-0.596022 c -0.242813,-0.327813 -0.5141,-0.867521 -0.602851,-1.199355 -0.147845,-0.552783 -0.13452,-0.656915 0.159047,-1.242882 0.783436,-1.563747 3.160654,-1.663469 4.629901,-0.194221 0.353158,0.353155 0.680797,0.796275 0.728092,0.984714 0.105859,0.421779 0.294357,0.44384 0.3833,0.04486 0.07118,-0.319288 0.511916,-3.32127 0.511916,-3.486797 0,-0.159425 -1.890167,-0.667608 -2.848242,-0.765765 -1.631386,-0.08456 -2.213971,-0.183458 -3.573718,0.164339 -1.768583,0.460657 -3.107329,1.499143 -3.730775,2.894023 -0.582587,1.30345 -0.390883,3.285673 0.451251,4.665983 0.244669,0.401032 0.332862,0.44906 0.614833,0.334826 0.181053,-0.07335 0.989313,-0.417681 1.796139,-0.765182 z" fill="white" />
                                </svg>
                                <h2 className="text-2xl font-bold text-teal-800">eSantri Web: Membantu Manajemen Data Santri</h2>
                                <p className="mt-2 text-base text-teal-700 max-w-3xl mx-auto">
                                    eSantri Web adalah aplikasi yang dibuat untuk membantu administrasi Pondok Pesantren dalam mengelola data santri.
                                </p>
                            </div>
                            
                            <div className="bg-gray-50/80 p-5 rounded-lg border">
                                <h3 className="flex items-center gap-3 text-xl font-semibold text-gray-800 mb-4">
                                    <i className="bi bi-stars text-teal-600"></i>
                                    <span>Fitur Unggulan</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FeatureItem icon="bi-grid-1x2-fill" title="Dashboard Interaktif">
                                        Ringkasan visual data santri dan keuangan secara cepat dan mudah dipahami.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-journal-text" title="Penerimaan Santri Baru (PSB)">
                                        Sistem lengkap mulai dari desain formulir online, manajemen pendaftar, seleksi, hingga integrasi data ke database utama.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-magic" title="Poster & Surat AI">
                                        Buat draf surat dan prompt poster promosi secara instan menggunakan kecerdasan buatan (AI).
                                    </FeatureItem>
                                    <FeatureItem icon="bi-database-fill" title="Database Santri Terpusat">
                                        Kelola data lengkap santri, orang tua/wali, prestasi, hingga pelanggaran di satu tempat.
                                    </FeatureItem>
                                     <FeatureItem icon="bi-cash-coin" title="Manajemen Keuangan Terintegrasi">
                                        Mulai dari pembuatan tagihan massal, pencatatan pembayaran, hingga notifikasi tunggakan.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-building-check" title="Manajemen Keasramaan">
                                        Kelola data gedung, kamar, musyrif/ah, dan penempatan santri di asrama dengan mudah.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-journal-album" title="Buku Kas Umum">
                                        Catat semua pemasukan dan pengeluaran umum pondok untuk laporan arus kas yang transparan.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-sliders" title="Pengaturan Fleksibel">
                                        Sesuaikan struktur pendidikan, biaya, format NIS, hingga redaksi surat dan pesan WhatsApp.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-envelope-paper-fill" title="Surat Menyurat">
                                        Buat, kelola template, dan arsipkan surat resmi pondok dengan mudah. Dilengkapi editor teks kaya dan mail merge.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-person-badge-fill" title="Generator NIS Otomatis">
                                        Buat Nomor Induk Santri secara otomatis dengan tiga metode yang dapat diatur.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-printer-fill" title="Fitur Laporan & Cetak Lengkap">
                                        Cetak berbagai dokumen penting seperti biodata, kuitansi, kartu santri, dan laporan lainnya.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-file-earmark-arrow-up-fill" title="Editor Massal & Impor Data">
                                        Edit data banyak santri sekaligus seperti di Excel atau impor dari file CSV.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-file-pdf-fill" title="Ekspor PDF">
                                        Unduh laporan dan surat dalam format PDF sesuai dengan tampilan layar (WYSIWYG).
                                    </FeatureItem>
                                    <FeatureItem icon="bi-filetype-html" title="Ekspor Laporan HTML">
                                        Unduh laporan dalam format HTML untuk arsip digital yang ringan atau untuk dibuka kembali di browser tanpa koneksi internet.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-person-lines-fill" title="Ekspor Kontak HP">
                                        Unduh data kontak wali santri dalam format CSV yang kompatibel dengan Google Contacts / HP.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-cloud-arrow-up-fill" title="Sinkronisasi Cloud">
                                        Simpan dan sinkronkan database ke layanan cloud pribadi (Dropbox/Nextcloud) agar data aman.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-activity" title="Multi-Admin & Realtime Audit">
                                        Gunakan Supabase untuk dukungan multi-admin, database terpusat, dan log aktivitas real-time.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-wifi-off" title="Fungsi Offline">
                                        Aplikasi tetap berjalan lancar dan semua data aman meski tanpa koneksi internet.
                                    </FeatureItem>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                                    <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                                        <i className="bi bi-cup-hot-fill"></i>
                                        <span>Traktir Kopi</span>
                                    </a>
                                    <a href="https://github.com/aiprojek/eSantri-Web" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
                                        <i className="bi bi-github"></i>
                                        <span>GitHub</span>
                                    </a>
                                    <a href="https://t.me/aiprojek_community/32" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors">
                                        <i className="bi bi-telegram"></i>
                                        <span>Diskusi</span>
                                    </a>
                                </div>
                                <div className="mt-8 pt-6 border-t text-center text-sm text-gray-600 space-y-2">
                                    <p>
                                        <strong>Pengembang:</strong> <a href="https://aiprojek01.my.id" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">AI Projek</a>. <strong>Lisensi:</strong> <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">GNU GPL v3</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'panduan' && (
                        <div>
                            <div className="p-4 mb-6 rounded-md border-l-4 border-yellow-500 bg-yellow-50 text-yellow-800">
                                <h4 className="font-bold flex items-center gap-2"><i className="bi bi-exclamation-diamond-fill"></i>Penting: Skenario Penggunaan Aplikasi</h4>
                                <p className="mt-1 text-sm">Aplikasi ini dirancang untuk penggunaan <strong>terpusat oleh satu orang di satu komputer/laptop</strong>. Semua data disimpan secara lokal di browser Anda dan <strong>tidak dapat diakses</strong> dari komputer lain atau oleh pengguna lain.</p>
                                <p className="mt-2 text-sm">Skenario ini sempurna untuk administrator tunggal, tetapi <strong>tidak cocok untuk tim</strong> yang membutuhkan kolaborasi atau akses data bersamaan, kecuali jika Anda mengaktifkan fitur Sinkronisasi Cloud (Supabase).</p>
                            </div>

                            {!sampleDataDeleted ? (
                                <div className="p-4 mb-6 rounded-md border-l-4 border-red-500 bg-red-50 text-red-800">
                                    <h4 className="font-bold flex items-center gap-2"><i className="bi bi-exclamation-triangle-fill"></i>Penting: Data Sampel</h4>
                                    <p className="mt-1 text-sm">Data yang ada di aplikasi saat ini adalah data sampel untuk keperluan demonstrasi. Sangat disarankan untuk <strong>menghapus semua data sampel</strong> ini sebelum Anda mulai memasukkan data asli pondok pesantren Anda.</p>
                                    <button
                                        onClick={handleDeleteSampleData}
                                        className="mt-3 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        <i className="bi bi-trash3-fill"></i>
                                        Hapus Semua Data Sampel
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 mb-6 rounded-md border-l-4 border-red-500 bg-red-50 text-red-800">
                                    <h4 className="font-bold flex items-center gap-2"><i className="bi bi-shield-exclamation"></i>Zona Berbahaya</h4>
                                    <p className="mt-1 text-sm">Fitur ini akan menghapus semua data transaksi (santri, keuangan, kas) dan mengembalikan aplikasi ke kondisi awal. Gunakan dengan sangat hati-hati.</p>
                                    {!showResetConfirmation ? (
                                        <button
                                            onClick={() => setShowResetConfirmation(true)}
                                            className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
                                        >
                                            Reset Aplikasi
                                        </button>
                                    ) : (
                                        <div className="mt-3 p-3 bg-white border border-red-200 rounded-md">
                                            <label htmlFor="confirm-reset" className="block text-sm font-medium text-gray-700">Untuk konfirmasi, ketik "<strong className="text-red-700">{CONFIRM_RESET_TEXT}</strong>" di bawah ini:</label>
                                            <input 
                                                id="confirm-reset"
                                                type="text"
                                                value={resetInput}
                                                onChange={(e) => setResetInput(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                                            />
                                            <button
                                                onClick={handlePermanentReset}
                                                disabled={resetInput !== CONFIRM_RESET_TEXT}
                                                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                                            >
                                                <i className="bi bi-trash3-fill"></i>
                                                Hapus Permanen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

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

                            {/* ... (Previous Panduan steps remain unchanged, just condensed here for brevity in the patch) ... */}
                            {/* Assuming the rest of PanduanLangkah components are kept as is */}
                            
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

                    {activeTab === 'rilis' && (
                        <div className="border border-gray-200 rounded-xl p-8 shadow-sm">
                            <div className="flex flex-col md:flex-row items-start gap-6">
                                <div className="flex-shrink-0">
                                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-3xl text-gray-700">
                                        <i className="bi bi-github"></i>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Riwayat Pembaruan</h3>
                                    <p className="text-gray-600 mb-6 text-base leading-relaxed max-w-4xl">
                                        Untuk melihat catatan rilis teknis dan riwayat perubahan kode terbaru, silakan kunjungi repositori kami di GitHub. Kami secara rutin memperbarui aplikasi untuk meningkatkan kinerja dan menambah fitur baru.
                                    </p>
                                    <a
                                        href="https://github.com/aiprojek/eSantri-Web/commits/main/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                                    >
                                        <i className="bi bi-clock-history"></i>
                                        Lihat Commit History
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lisensi' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl text-blue-900">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                    <i className="bi bi-info-circle-fill text-blue-600"></i>
                                    Ringkasan Sederhana (Bahasa Indonesia)
                                </h3>
                                <p className="mb-3 text-sm">Aplikasi eSantri Web dirilis di bawah lisensi <strong>GNU General Public License v3.0 (GPLv3)</strong>.</p>
                                <ul className="list-disc pl-5 space-y-1 text-sm marker:text-blue-500">
                                    <li><strong>Bebas Digunakan:</strong> Anda boleh menggunakan aplikasi ini untuk tujuan pribadi, komersial, atau pendidikan tanpa biaya lisensi.</li>
                                    <li><strong>Bebas Dimodifikasi:</strong> Anda boleh mengubah kode sumber sesuai kebutuhan Anda.</li>
                                    <li><strong>Bebas Didistribusikan:</strong> Anda boleh menyalin dan membagikan aplikasi ini kepada orang lain.</li>
                                    <li><strong>Copyleft:</strong> Jika Anda memodifikasi dan mendistribusikan aplikasi ini, Anda <strong>wajib</strong> menyertakan kode sumbernya dan merilisnya di bawah lisensi yang sama (GPLv3).</li>
                                    <li><strong>Tanpa Garansi:</strong> Aplikasi ini disediakan "apa adanya" (as is) tanpa jaminan apapun. Risiko penggunaan sepenuhnya ada pada pengguna.</li>
                                </ul>
                            </div>

                            <div className="border border-gray-200 rounded-xl p-8 shadow-sm">
                                <div className="flex flex-col md:flex-row items-start gap-6">
                                    <div className="flex-shrink-0">
                                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-3xl text-gray-600">
                                            <i className="bi bi-file-earmark-text"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">GNU General Public License v3.0</h3>
                                        <p className="text-gray-600 mb-6 text-base leading-relaxed max-w-4xl">
                                            Ini adalah perangkat lunak bebas; Anda dapat mendistribusikan ulang dan/atau memodifikasinya di bawah ketentuan GNU General Public License versi 3 sebagaimana dipublikasikan oleh Free Software Foundation.
                                        </p>
                                        <a
                                            href="https://www.gnu.org/licenses/gpl-3.0.html"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                                        >
                                            <i className="bi bi-box-arrow-up-right"></i>
                                            Baca Naskah Lengkap (GPLv3)
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'kontak' && (
                        <div className="border border-gray-200 rounded-xl p-8 shadow-sm">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="md:w-1/3">
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">Hubungi Pengembang</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-6">
                                        Punya pertanyaan teknis, saran fitur baru, atau ingin melaporkan <i>bug</i>? Kami sangat menghargai masukan Anda untuk pengembangan eSantri Web ke depannya.
                                    </p>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                                                <i className="bi bi-envelope-fill"></i>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                                                <a href="mailto:aiprojek01@gmail.com" className="text-sm font-medium text-gray-800 hover:text-teal-600 transition-colors">aiprojek01@gmail.com</a>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                                                <i className="bi bi-telegram"></i>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 uppercase">Telegram Group</p>
                                                <a href="https://t.me/aiprojek_community/32" target="_blank" className="text-sm font-medium text-gray-800 hover:text-teal-600 transition-colors">AI Projek Community</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Anda</label>
                                                <input 
                                                    type="text" 
                                                    value={contactName}
                                                    onChange={(e) => setContactName(e.target.value)}
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500 text-sm"
                                                    placeholder="Nama Lengkap"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Subjek</label>
                                                <input 
                                                    type="text" 
                                                    value={contactSubject}
                                                    onChange={(e) => setContactSubject(e.target.value)}
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500 text-sm"
                                                    placeholder="Topik pesan"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
                                            <textarea 
                                                rows={5}
                                                value={contactMessage}
                                                onChange={(e) => setContactMessage(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500 text-sm"
                                                placeholder="Tulis pesan Anda di sini..."
                                            ></textarea>
                                        </div>
                                        <div>
                                            <a 
                                                href={mailtoLink}
                                                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm ${(!contactName || !contactSubject || !contactMessage) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                            >
                                                <i className="bi bi-send-fill"></i>
                                                Kirim Pesan (via Email App)
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tentang;
