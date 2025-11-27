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


const Tentang: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tentang' | 'panduan' | 'kontak'>('tentang');
    const { showConfirmation, onDeleteSampleData, showToast } = useAppContext();
    
    const [contactName, setContactName] = useState('');
    const [contactSubject, setContactSubject] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    
    const [sampleDataDeleted, setSampleDataDeleted] = useState(false);
    const [showResetConfirmation, setShowResetConfirmation] = useState(false);
    const [resetInput, setResetInput] = useState('');
    const CONFIRM_RESET_TEXT = 'HAPUS SEMUA DATA';

    useEffect(() => {
        const deleted = localStorage.getItem('eSantriSampleDataDeleted') === 'true';
        setSampleDataDeleted(deleted);
    }, []);

    const mailtoLink = `mailto:aiprojek01@gmail.com?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(`Halo,\n\nNama saya ${contactName}.\n\n${contactMessage}`)}`;


    const TabButton: React.FC<{
        tabId: 'tentang' | 'panduan' | 'kontak';
        label: string;
        icon: string;
    }> = ({ tabId, label, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 py-3 px-4 text-center font-medium text-sm whitespace-nowrap border-b-2 transition-colors duration-200 ${activeTab === tabId ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
            <i className={`bi ${icon}`}></i>
            <span>{label}</span>
        </button>
    );
    
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

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Tentang Aplikasi eSantri Web</h1>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px overflow-x-auto">
                        <TabButton tabId="tentang" label="Tentang Aplikasi" icon="bi-info-circle" />
                        <TabButton tabId="panduan" label="Panduan Pengguna" icon="bi-question-circle" />
                        <TabButton tabId="kontak" label="Kontak" icon="bi-envelope" />
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'tentang' && (
                        <div className="space-y-8">
                            <div className="p-6 bg-teal-50 border border-teal-200 rounded-lg text-center">
                                <svg className="w-16 h-16 mb-3 mx-auto" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="64" height="64" rx="12" fill="#0f766e"/>
                                  <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06395,0.06031 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.807226,3.136742 0,1.449522 -1.080984,2.352339 -2.83266,2.365783 -1.692966,0.013 -2.898289,-0.700527 -3.613504,-2.139108 -0.233721,-0.470103 -0.448882,-0.914285 -0.478136,-0.987069 -0.116891,-0.290814 -0.200722,0.06466 -0.343292,1.455679 -0.08206,0.800623 -0.183673,1.704103 -0.225804,2.007735 -0.07177,0.517174 -0.05031,0.565658 0.339658,0.767317 0.228951,0.118395 0.934732,0.331191 1.568401,0.472882 1.371797,0.306736 3.501849,0.270382 4.658993,-0.07952 z m -25.45487,-1.364466 c 0.93301,-0.457248 1.87821,-0.760644 2.72644,-0.875142 l 0.62858,-0.08485 v -1.37202 -1.372019 l -0.76092,-0.150409 c -1.1567,-0.228639 -1.61383,-0.386514 -2.49361,-0.86118 l -0.80636,-0.435051 -1.0876,0.707478 c -1.7125205,1.113979 -4.4737803,2.082778 -5.0529103,1.772836 -0.37206,-0.199121 -0.71946,0.108306 -0.58853,0.520817 0.115,0.362332 0.72882,0.388328 0.82127,0.03479 0.0568,-0.217219 0.26544,-0.254305 1.8612198,-0.330836 0.98848,-0.04741 2.1954505,-0.08619 2.6821505,-0.08619 0.72383,0 0.92956,-0.04935 1.13024,-0.27109 0.5934,-0.655698 1.68599,0.120869 1.20432,0.855981 -0.30385,0.46374 -0.71833,0.514445 -1.0984,0.134374 -0.32073,-0.320731 -0.33497,-0.322227 -2.9960205,-0.314975 l -2.6737598,0.0073 0.9462,0.248046 c 1.3576098,0.355898 2.7727603,0.97431 3.7575203,1.642008 0.46988,0.318591 0.89288,0.586114 0.94,0.594493 0.0471,0.0084 0.43419,-0.155572 0.86017,-0.364335 z m 4.68467,-0.249019 c 0.003,-0.05459 0.0184,-1.022283 0.0331,-2.150434 l 0.0268,-2.051184 h -0.33083 -0.33084 l -0.0368,1.979203 c -0.0202,1.08856 -0.007,2.056256 0.0289,2.150434 0.0691,0.180159 0.59882,0.242698 0.60965,0.07198 z m 3.65835,-0.574409 c 3.0847,-0.784059 4.3689,-1.36122 14.597498,-6.560614 4.28789,-2.179617 6.635935,-3.051997 10.086804,-3.7476 3.636686,-0.733057 7.837085,-0.596342 10.867503,0.353716 0.570889,0.178977 1.064204,0.299191 1.096252,0.267139 0.130911,-0.130911 -2.904302,-1.024182 -4.383914,-1.290194 -1.996054,-0.358861 -5.21532,-0.480661 -7.088973,-0.268211 -4.215428,0.477982 -7.569808,1.515628 -13.092024,4.0499 -3.489827,1.60156 -6.879436,2.837056 -9.395746,3.424707 -1.69284,0.39534 -3.96393,0.739453 -4.88027,0.739453 h -0.67778 v 1.791074 1.791073 l 0.69476,-0.08699 c 0.38212,-0.04784 1.36127,-0.256397 2.17589,-0.463455 z m -0.10861,-4.029945 c 4.34182,-0.630466 7.276739,-1.83952 9.019947,-3.715798 0.769184,-0.827904 1.110178,-1.396927 1.372676,-2.29062 0.620767,-2.113468 -0.266098,-4.009021 -2.237069,-4.781421 -0.663099,-0.25986 -1.034005,-0.311072 -2.249684,-0.310618 -2.56763,9.39e-4 -4.16567,0.70118 -6.15355,2.696349 -1.32346,1.328311 -2.06801,2.436512 -2.69958,4.018119 -0.3897,0.975922 -0.74112,2.585487 -0.74112,3.394509 0,0.426759 0.0504,0.516006 0.33138,0.586519 0.18225,0.04574 0.40501,0.201076 0.495,0.345183 0.20571,0.329396 0.89555,0.343323 2.862,0.05778 z m 0.11816,-1.45905 c -0.11099,-0.110993 0.16145,-1.565003 0.5066,-2.703751 0.89895,-2.965867 2.8918,-5.028708 4.85807,-5.028708 1.488576,0 2.128809,1.136692 1.614909,2.867184 -0.413016,1.390771 -1.806659,2.666315 -4.103229,3.755501 -1.46343,0.694058 -2.78296,1.203168 -2.87635,1.109774 z m 14.804219,-3.661671 1.341112,-0.577624 -0.441486,-0.596022 c -0.242813,-0.327813 -0.5141,-0.867521 -0.602851,-1.199355 -0.147845,-0.552783 -0.13452,-0.656915 0.159047,-1.242882 0.783436,-1.563747 3.160654,-1.663469 4.629901,-0.194221 0.353158,0.353155 0.680797,0.796275 0.728092,0.984714 0.105859,0.421779 0.294357,0.44384 0.3833,0.04486 0.06507,-0.291898 0.468002,-3.036365 0.468002,-3.187693 0,-0.145749 -1.728025,-0.610339 -2.603914,-0.700076 -1.491442,-0.0773 -2.024052,-0.16772 -3.267158,0.150242 -1.61687,0.421141 -2.840775,1.370544 -3.410741,2.645767 -0.532611,1.191638 -0.357352,3.003822 0.412542,4.265726 0.223681,0.366631 0.304308,0.410539 0.562091,0.306105 0.165522,-0.06706 0.904448,-0.381852 1.642063,-0.699544 z"/>
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
                                    <FeatureItem icon="bi-sliders" title="Pengaturan Sangat Fleksibel">
                                        Sesuaikan struktur pendidikan, biaya, format NIS, hingga redaksi surat dan pesan WhatsApp.
                                    </FeatureItem>
                                    <FeatureItem icon="bi-envelope-paper-fill" title="Surat Menyurat (Baru)">
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
                                <p className="mt-2 text-sm">Skenario ini sempurna untuk administrator tunggal, tetapi <strong>tidak cocok untuk tim</strong> yang membutuhkan kolaborasi atau akses data bersamaan.</p>
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

                            <div className="p-4 mb-6 rounded-md border-l-4 border-blue-500 bg-blue-50 text-blue-800">
                                <h4 className="font-bold flex items-center gap-2"><i className="bi bi-code-slash"></i>Untuk Pengembang (Developers)</h4>
                                <p className="mt-1 text-sm">
                                    Bagi yang ingin mengembangkan aplikasi ini lebih lanjut agar dapat digunakan oleh banyak admin (multi-user) dengan sistem penyimpanan data yang lebih terpusat dan aman, disarankan untuk mengintegrasikannya dengan backend (server-side).
                                </p>
                                <p className="mt-2 text-sm">
                                    Kode sumber lengkap aplikasi ini bersifat open-source dan dapat diakses di GitHub untuk dikembangkan lebih lanjut.
                                </p>
                            </div>
                            <PanduanLangkah number={1} title="Langkah Krusial: Pengaturan Fundamental">
                                <p>Ini adalah langkah <strong>paling fundamental</strong> yang menentukan bagaimana seluruh aplikasi akan bekerja. Kesalahan pada tahap ini dapat memengaruhi keakuratan data. Buka halaman <strong className="font-semibold text-teal-700">Pengaturan</strong> dan halaman <strong className="font-semibold text-teal-700">Keuangan</strong>, lalu pastikan Anda melengkapi bagian-bagian berikut secara saksama:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Struktur Pendidikan (di Pengaturan):</strong> Definisikan semua <span className="font-semibold">Jenjang</span> (misal: Salafiyah Wustho), <span className="font-semibold">Kelas</span> di dalam setiap jenjang, dan <span className="font-semibold">Rombel</span> di dalam setiap kelas.</li>
                                    <li><strong>Tenaga Pendidik (di Pengaturan):</strong> Masukkan data Mudir dan para Wali Kelas. Data ini akan digunakan untuk penugasan dan penanda tangan pada dokumen.</li>
                                    <li><strong>Mata Pelajaran (di Pengaturan):</strong> Atur daftar mata pelajaran yang ada untuk setiap jenjang. Ini akan digunakan pada laporan <span className="italic">Lembar Nilai</span>.</li>
                                    <li><strong>Pengaturan Biaya (di Keuangan):</strong> Ini sangat penting. Definisikan semua komponen biaya seperti SPP (Bulanan), Uang Pangkal (Cicilan), atau Seragam (Sekali Bayar) di tab <span className="font-semibold">Pengaturan Biaya</span>.</li>
                                    <li><strong>Generator NIS (di Pengaturan):</strong> Pilih dan atur metode pembuatan Nomor Induk Santri.</li>
                                    <li><strong>Pengaturan Redaksi (di Keuangan):</strong> Kustomisasi template kalimat untuk Surat Tagihan dan Notifikasi WhatsApp di tab <span className="font-semibold">Pengaturan Redaksi</span>.</li>
                                    <li><strong>Informasi Umum (di Pengaturan):</strong> Lengkapi detail nama pondok, alamat, dan logo untuk kop surat di semua laporan.</li>
                                </ul>
                            </PanduanLangkah>
                            <PanduanLangkah number={2} title="Manajemen Data Santri">
                                <p>Setelah pengaturan selesai, kelola data santri di halaman <strong className="font-semibold text-teal-700">Data Santri</strong>.</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Menambah Santri:</strong> Klik tombol <span className="font-semibold text-white bg-teal-600 px-2 py-0.5 rounded-md text-xs">+ Tambah</span>. Manfaatkan tombol <i className="bi bi-arrow-clockwise bg-teal-600 text-white p-1 rounded-sm"></i> di sebelah kolom NIS untuk membuat NIS otomatis.</li>
                                     <li><strong>Mengedit & Melengkapi Data:</strong> Klik ikon pensil <i className="bi bi-pencil-square text-blue-600"></i>. Di dalam formulir edit, Anda bisa melengkapi data yang lebih detail melalui tab-tab yang tersedia:
                                        <ul className="list-['-_'] pl-5 mt-1">
                                            <li><strong className="font-semibold">Data Lain-lain:</strong> Catat <span className="italic">Prestasi</span>, <span className="italic">Pelanggaran</span>, dan <span className="italic">Hobi</span> santri.</li>
                                            <li><strong className="font-semibold">Riwayat Status:</strong> Lihat jejak perubahan status santri (misalnya dari Aktif menjadi Lulus). Riwayat ini tercatat otomatis saat Anda mengubah status santri.</li>
                                        </ul>
                                    </li>
                                </ul>
                            </PanduanLangkah>
                            <PanduanLangkah number={3} title="Menangani Proses Akhir Tahun Ajaran (Kenaikan Kelas & Kelulusan)">
                                <p>Setiap akhir tahun ajaran, proses seperti kenaikan kelas, kelulusan, atau santri yang tinggal kelas perlu dikelola. Aplikasi ini memfasilitasi proses ini melalui fitur <strong className="font-semibold">Aksi Massal</strong> di halaman <strong className="font-semibold text-teal-700">Data Santri</strong>.</p>
                                
                                <h4 className="font-semibold text-base mt-4 mb-2">Skenario 1: Meluluskan Santri Kelas Akhir</h4>
                                <ol className="list-decimal pl-5 space-y-2 mt-2">
                                    <li>Buka halaman <strong className="font-semibold text-teal-700">Data Santri</strong>.</li>
                                    <li>Gunakan filter untuk menampilkan semua santri di tingkat akhir (misal: Jenjang `Salafiyah Ulya`, Kelas `Kelas 3`).</li>
                                    <li>Pilih semua santri yang ditampilkan dengan mencentang kotak di header tabel.</li>
                                    <li>Pada bar aksi massal yang muncul, klik tombol <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded-md text-xs">Ubah Status</span>.</li>
                                    <li>Pilih status baru menjadi <strong className="font-semibold">"Lulus"</strong> dan atur tanggal kelulusan, lalu terapkan.</li>
                                </ol>

                                <h4 className="font-semibold text-base mt-4 mb-2">Skenario 2: Menaikkan Kelas Santri</h4>
                                <ol className="list-decimal pl-5 space-y-2 mt-2">
                                    <li>Filter santri yang akan naik kelas (misal: Jenjang `Salafiyah Wustho`, Kelas `Kelas 1`). Sebaiknya lakukan per rombel untuk menghindari kesalahan.</li>
                                    <li>Pilih semua santri dalam rombel tersebut.</li>
                                    <li>Klik tombol <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded-md text-xs">Pindahkan Rombel</span>.</li>
                                    <li>Di modal yang muncul, pilih Jenjang, Kelas, dan Rombel tujuan yang baru (misal: `Salafiyah Wustho - Kelas 2 - SW-2A Putra`).</li>
                                    <li>Klik "Pindahkan". Data akademik santri akan diperbarui secara otomatis.</li>
                                </ol>
                            </PanduanLangkah>
                             <PanduanLangkah number={4} title="Alur Kerja Modul Keuangan">
                                <p>Modul <strong className="font-semibold text-teal-700">Keuangan</strong> dirancang untuk menyederhanakan administrasi pembayaran. Alur kerjanya sebagai berikut:</p>
                                <ol className="list-decimal pl-5 space-y-3 mt-2">
                                    <li>
                                        <strong>Memahami Dashboard Keuangan:</strong> Sebelum memulai alur kerja, luangkan waktu sejenak di tab <strong className="font-semibold">Dashboard</strong>. Perhatikan grafik <strong className="font-semibold">"Penerimaan Aktual & Proyeksi"</strong> sebagai alat bantu perencanaan anggaran.
                                    </li>
                                    <li>
                                        <strong>Generate Tagihan:</strong> Buka tab <strong className="font-semibold">Status Pembayaran</strong>. Gunakan fitur <span className="font-semibold">"Generate Tagihan"</span> untuk membuat tagihan secara massal (misalnya, SPP bulan Juli untuk semua santri).
                                    </li>
                                    <li>
                                        <strong>Lihat Status & Catat Pembayaran:</strong> Di tabel <strong className="font-semibold">Status Pembayaran Santri</strong>, klik tombol <span className="font-semibold text-white bg-blue-600 px-2 py-0.5 rounded-md text-xs">Bayar</span> untuk mencatat pelunasan tagihan.
                                    </li>
                                    <li>
                                        <strong>Aksi Tindak Lanjut:</strong> Jika ada santri yang menunggak, pilih santri tersebut lalu klik tombol aksi massal untuk <strong className="font-semibold">"Cetak Surat Tagihan"</strong> atau <strong className="font-semibold">"Kirim Notifikasi WA"</strong>.
                                    </li>
                                     <li>
                                        <strong>Cetak Kuitansi:</strong> Setelah pembayaran dicatat, cetak kuitansi resmi dengan mengklik tombol <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded-md text-xs">Riwayat</span> di baris santri.
                                    </li>
                                     <li>
                                        <strong>Rekonsiliasi Kas:</strong> (Best Practice) Secara berkala, setorkan penerimaan yang tercatat ke buku kas umum melalui tombol <span className="font-semibold bg-green-600 text-white px-2 py-0.5 rounded-md text-xs">Setor ke Kas</span>.
                                    </li>
                                     <li>
                                        <strong>Uang Saku:</strong> Gunakan tab <strong className="font-semibold">Uang Saku</strong> untuk mengelola saldo titipan santri (deposit/penarikan) yang terpisah dari tagihan pondok.
                                    </li>
                                </ol>
                            </PanduanLangkah>
                            <PanduanLangkah number={5} title="Manajemen Keasramaan">
                                <p>Modul <strong className="font-semibold text-teal-700">Keasramaan</strong> membantu Anda memetakan lokasi tempat tinggal santri.</p>
                                <ol className="list-decimal pl-5 space-y-2 mt-2">
                                    <li>
                                        <strong>Atur Gedung & Kamar:</strong> Buka tab <strong className="font-semibold">Manajemen Asrama</strong>. Tambahkan gedung (Putra/Putri), lalu tambahkan kamar-kamar di dalamnya beserta kapasitas dan musyrif/ah.
                                    </li>
                                    <li>
                                        <strong>Penempatan Santri:</strong> Buka tab <strong className="font-semibold">Penempatan Santri</strong>.
                                        <ul className="list-disc pl-5 mt-1 text-sm">
                                            <li>Di kolom kiri, Anda akan melihat daftar santri aktif yang <strong>belum memiliki kamar</strong>. Gunakan filter untuk mempersempit daftar.</li>
                                            <li>Pilih santri yang ingin ditempatkan.</li>
                                            <li>Di kolom kanan (daftar kamar), cari kamar tujuan dan klik tombol <span className="font-semibold bg-teal-600 text-white px-2 py-0.5 rounded-md text-xs">Tempatkan</span>.</li>
                                        </ul>
                                    </li>
                                    <li>
                                        <strong>Laporan:</strong> Cetak rekapitulasi penghuni per gedung melalui menu <strong className="font-semibold text-teal-700">Laporan & Cetak</strong>.
                                    </li>
                                </ol>
                            </PanduanLangkah>
                            <PanduanLangkah number={6} title="Mencetak, Ekspor PDF, & HTML">
                                <p>Semua kebutuhan administrasi cetak-mencetak terpusat di halaman <strong className="font-semibold text-teal-700">Laporan & Cetak</strong>. Prosesnya sederhana:</p>
                                <ol className="list-decimal pl-5 space-y-2">
                                    <li>Pilih jenis laporan yang Anda butuhkan (misal: Biodata, Kartu Santri, Lembar Nilai, Rekening Koran, dll).</li>
                                    <li>Gunakan filter untuk memilih data spesifik yang ingin dicetak (biasanya berdasarkan Rombel atau Individu).</li>
                                    <li>Atur opsi tambahan yang tersedia untuk laporan tersebut (seperti format kertas, margin, atau opsi tanda tangan).</li>
                                    <li>Klik <span className="font-semibold text-white bg-teal-600 px-2 py-0.5 rounded-md text-xs">Tampilkan Pratinjau</span>.</li>
                                    <li>Pilih aksi selanjutnya:
                                        <ul className="list-disc pl-5 mt-1">
                                            <li>Klik <span className="font-semibold text-white bg-blue-600 px-2 py-0.5 rounded-md text-xs">Cetak</span> untuk mencetak langsung ke printer.</li>
                                            <li>Klik <span className="font-semibold text-white bg-red-600 px-2 py-0.5 rounded-md text-xs">Download PDF</span> untuk menyimpan sebagai file PDF dengan tampilan visual yang presisi sesuai pratinjau (teks mungkin tidak dapat diseleksi).</li>
                                            <li>Klik <span className="font-semibold text-white bg-green-600 px-2 py-0.5 rounded-md text-xs">Download HTML</span> untuk menyimpan laporan sebagai halaman web. Berguna untuk arsip data mentah yang tampilannya sama persis dengan aplikasi.</li>
                                        </ul>
                                    </li>
                                </ol>
                            </PanduanLangkah>
                             <PanduanLangkah number={7} title="Efisiensi Input Data: Editor Massal & Impor CSV">
                                <p>Untuk mempercepat proses input data, eSantri Web menyediakan dua fitur canggih di halaman <strong className="font-semibold text-teal-700">Data Santri</strong>:</p>
                                
                                <h4 className="font-semibold text-base mt-4 mb-2">A. Editor Massal (Bulk Editor)</h4>
                                <p className="text-sm mb-2">Fitur ini memungkinkan Anda mengedit data santri dalam tampilan tabel interaktif (seperti Excel). Sangat berguna untuk melengkapi data detail (NIK, Data Orang Tua, Alamat Lengkap) secara cepat tanpa perlu membuka formulir edit satu per satu.</p>
                                <ul className="list-disc pl-5 space-y-1 mt-1 text-sm">
                                    <li>Klik tombol <span className="font-semibold bg-teal-50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-md text-xs"><i className="bi bi-table"></i></span> di sebelah tombol Tambah.</li>
                                    <li>Pilih mode <strong>"Tambah Massal"</strong> untuk input santri baru, atau pilih beberapa santri di tabel utama lalu klik <strong>"Edit Massal"</strong>.</li>
                                    <li>Isi data langsung pada sel tabel. Gunakan TAB untuk pindah kolom.</li>
                                    <li>Klik <strong>"Simpan Semua"</strong> untuk memproses perubahan sekaligus.</li>
                                </ul>

                                <h4 className="font-semibold text-base mt-4 mb-2">B. Impor & Ekspor File CSV</h4>
                                <p className="text-sm mb-2">Gunakan fitur ini jika Anda memiliki ribuan data santri dari aplikasi lain yang ingin dipindahkan.</p>
                                <ol className="list-decimal pl-5 space-y-1 mt-1 text-sm">
                                    <li>Klik tombol dropdown <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded-md text-xs">Ekspor</span>, lalu pilih <strong className="font-semibold">"Unduh Template"</strong>.</li>
                                    <li>Isi data pada file CSV tersebut. Untuk kolom JSON (prestasi, hobi), ikuti format yang ditentukan di petunjuk.</li>
                                    <li>Klik tombol <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded-md text-xs">Impor</span> dan unggah file Anda.</li>
                                </ol>
                            </PanduanLangkah>
                            <PanduanLangkah number={8} title="Membuat & Mengelola Surat Menyurat">
                                <p>Modul <strong className="font-semibold text-teal-700">Surat Menyurat</strong> memudahkan Anda membuat surat resmi, pemberitahuan, atau izin dengan cepat menggunakan template.</p>
                                <ol className="list-decimal pl-5 space-y-2 mt-2">
                                    <li>
                                        <strong>Manajemen Template:</strong> Buka tab <strong className="font-semibold">Manajemen Template</strong>. Buat template baru atau edit yang sudah ada. Gunakan editor teks (Rich Text Editor) untuk memformat isi surat. Anda bisa mengatur:
                                        <ul className="list-disc pl-5 mt-1 text-sm">
                                            <li>Isi surat dengan <em>placeholders</em> otomatis (misal: <code>{'{NAMA_SANTRI}'}</code>).</li>
                                            <li>Pengaturan margin halaman (Atas, Kanan, Bawah, Kiri).</li>
                                            <li>Posisi dan format Tempat & Tanggal surat.</li>
                                            <li>Daftar penanda tangan utama (1-3 orang) dan bagian "Mengetahui".</li>
                                        </ul>
                                    </li>
                                    <li>
                                        <strong>Buat Surat:</strong> Buka tab <strong className="font-semibold">Buat Surat</strong>.
                                        <ul className="list-disc pl-5 mt-1 text-sm">
                                            <li>Pilih template yang diinginkan.</li>
                                            <li>Pilih <strong>Mode Surat</strong>: <em>Perorangan</em> (untuk satu santri) atau <em>Mail Merge</em> (untuk banyak santri sekaligus berdasarkan filter).</li>
                                            <li>Isi nomor surat dan periksa kembali data pada pratinjau.</li>
                                            <li>Klik tombol <strong>Arsipkan</strong> untuk menyimpan riwayat surat ke database.</li>
                                        </ul>
                                    </li>
                                    <li>
                                        <strong>Cetak & Unduh:</strong> Dari halaman pratinjau atau Arsip Surat, Anda bisa:
                                        <ul className="list-disc pl-5 mt-1 text-sm">
                                            <li><strong>Cetak Langsung:</strong> Klik tombol Cetak untuk mencetak ke printer.</li>
                                            <li><strong>Unduh PDF:</strong> Simpan surat sebagai file PDF siap cetak.</li>
                                            <li><strong>Unduh HTML:</strong> Simpan sebagai file HTML mandiri yang bisa dibuka offline.</li>
                                        </ul>
                                    </li>
                                </ol>
                            </PanduanLangkah>
                            <PanduanLangkah number={9} title="Peringatan Kritis: Keamanan Data Anda" isLast={true}>
                                <div className="p-4 rounded-md border-l-4 border-yellow-500 bg-yellow-50 text-yellow-800">
                                    <h4 className="font-bold flex items-center gap-2"><i className="bi bi-wifi-off"></i>Aplikasi Dapat Bekerja Offline</h4>
                                    <p className="mt-1">Penting untuk dipahami bahwa semua data yang Anda masukkan disimpan <strong>secara eksklusif di dalam browser pada komputer/laptop yang Anda gunakan saat ini</strong>. Tidak ada data yang dikirim atau disimpan di internet.</p>
                                </div>
                                 <div className="p-4 rounded-md border-l-4 border-red-500 bg-red-50 text-red-800 mt-4">
                                     <h4 className="font-bold flex items-center gap-2"><i className="bi bi-shield-lock-fill"></i>Lakukan Backup Data Secara Berkala!</h4>
                                    <p className="mt-1">Karena data tersimpan lokal, risiko kehilangan data ada jika terjadi kerusakan pada perangkat atau cache browser dibersihkan. Untuk mencegah hal ini, <strong>sangat disarankan</strong> untuk melakukan backup data secara rutin melalui menu <strong className="font-semibold">Pengaturan &rarr; Cadangkan & Pulihkan Data &rarr; Unduh Cadangan Data</strong>. Simpan file backup di tempat yang aman.</p>
                                </div>
                            </PanduanLangkah>
                        </div>
                    )}

                    {activeTab === 'kontak' && (
                        <div className="mt-8">
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold text-gray-800">Hubungi Kami</h3>
                                <p className="text-gray-600 mt-2">
                                    Punya pertanyaan, masukan, atau laporan bug? Jangan ragu untuk menghubungi kami melalui formulir di bawah atau langsung ke email kami.
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-teal-50 to-cyan-100 p-6 sm:p-8 rounded-lg shadow-inner border border-teal-100">
                                <form className="space-y-5">
                                    <div className="relative">
                                        <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">Nama Anda</label>
                                        <div className="absolute inset-y-0 top-7 left-0 flex items-center pl-3 pointer-events-none">
                                            <i className="bi bi-person text-gray-400"></i>
                                        </div>
                                        <input type="text" id="contact-name" value={contactName} onChange={e => setContactName(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 p-2.5" placeholder="Nama Lengkap" />
                                    </div>
                                    <div className="relative">
                                        <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-1">Subjek</label>
                                        <div className="absolute inset-y-0 top-7 left-0 flex items-center pl-3 pointer-events-none">
                                            <i className="bi bi-chat-left-dots text-gray-400"></i>
                                        </div>
                                        <input type="text" id="contact-subject" value={contactSubject} onChange={e => setContactSubject(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 p-2.5" placeholder="Contoh: Laporan Bug" />
                                    </div>
                                    <div className="relative">
                                        <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">Pesan Anda</label>
                                        <textarea id="contact-message" rows={5} value={contactMessage} onChange={e => setContactMessage(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" placeholder="Tuliskan pesan Anda di sini..."></textarea>
                                    </div>
                                    <div>
                                        <a href={mailtoLink} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-transform hover:scale-[1.02] shadow-md">
                                            <i className="bi bi-send-fill"></i>
                                            <span>Kirim via Aplikasi Email</span>
                                        </a>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tentang;