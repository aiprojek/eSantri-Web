
import React from 'react';

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

export const TabTentang: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="p-6 bg-teal-50 border border-teal-200 rounded-lg text-center">
                {/* Logo SVG */}
                <svg className="w-16 h-16 mb-3 mx-auto" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="64" height="64" rx="12" fill="#0f766e"/>
                    <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06395,0.06031 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.807226,3.136742 0,1.449522 -1.080984,2.352339 -2.83266,2.365783 -1.692966,0.013 -2.898289,-0.700527 -3.613504,-2.139108 -0.233721,-0.470103 -0.448882,-0.914285 -0.478136,-0.987069 -0.116891,-0.290814 -0.200722,0.06466 -0.343292,1.455679 -0.08206,0.800623 -0.183673,1.704103 -0.225804,2.196123 -0.07851,0.5657 -0.05503,0.618734 0.371528,0.839314 0.250433,0.129504 1.022439,0.362267 1.715565,0.517254 1.500515,0.335516 3.830431,0.295752 5.096151,-0.08698 z m -25.45487,-1.364466 c 0.93301,-0.457248 1.87821,-0.760644 2.72644,-0.875142 l 0.62858,-0.08485 v -1.37202 -1.372019 l -0.76092,-0.150409 c -1.1567,-0.228639 -1.61383,-0.386514 -2.49361,-0.86118 l -0.80636,-0.435051 -1.0876,0.707478 c -1.7125205,1.113979 -4.4737803,2.082778 -5.0529103,1.772836 -0.37206,-0.199121 -0.71946,0.108306 -0.58853,0.520817 0.115,0.362332 0.72882,0.388328 0.82127,0.03479 0.0568,-0.217219 0.26544,-0.254305 1.8612198,-0.330836 0.98848,-0.04741 2.1954505,-0.08619 2.6821505,-0.08619 0.72383,0 0.92956,-0.04935 1.13024,-0.27109 0.5934,-0.655698 1.68599,0.120869 1.20432,0.855981 -0.30385,0.46374 -0.71833,0.514445 -1.0984,0.134374 -0.32073,-0.320731 -0.33497,-0.322227 -2.9960205,-0.314975 l -2.6737598,0.0073 0.9462,0.248046 c 1.3576098,0.355898 2.7727603,0.97431 3.7575203,1.642008 0.46988,0.318591 0.89288,0.586114 0.94,0.594493 0.0471,0.0084 0.43419,-0.155572 0.86017,-0.364335 z m 4.68467,-0.249019 c 0.003,-0.05459 0.0184,-1.022283 0.0331,-2.150434 l 0.0268,-2.051184 h -0.33083 -0.33084 l -0.0368,1.979203 c -0.0202,1.08856 -0.007,2.056256 0.0289,2.150434 0.0691,0.180159 0.59882,0.242698 0.60965,0.07198 z m 3.65835,-0.574409 c 3.0847,-0.784059 4.3689,-1.36122 14.597498,-6.560614 4.28789,-2.179617 6.635935,-3.051997 10.086804,-3.7476 3.636686,-0.733057 7.837085,-0.596342 10.867503,0.353716 0.570889,0.178977 1.064204,0.299191 1.096252,0.267139 0.130911,-0.130911 -2.904302,-1.024182 -4.383914,-1.290194 -1.996054,-0.358861 -5.21532,-0.480661 -7.088973,-0.268211 -4.215428,0.477982 -7.569808,1.515628 -13.092024,4.0499 -3.489827,1.60156 -6.879436,2.837056 -9.395746,3.424707 -1.69284,0.39534 -3.96393,0.739453 -4.88027,0.739453 h -0.67778 v 1.791074 1.791073 l 0.69476,-0.08699 c 0.38212,-0.04784 1.36127,-0.256397 2.17589,-0.463455 z m -0.10861,-4.40808 c 4.34182,-0.630466 7.276739,-1.83952 9.019947,-3.715798 0.769184,-0.827904 1.110178,-1.396927 1.372676,-2.29062 0.620767,-2.113468 -0.266098,-4.009021 -2.237069,-4.781421 -0.663099,-0.25986 -1.034005,-0.311072 -2.249684,-0.310618 -2.56763,9.39e-4 -4.16567,0.70118 -6.15355,2.696349 -1.32346,1.328311 -2.06801,2.436512 -2.69958,4.018119 -0.3897,0.975922 -0.74112,2.585487 -0.74112,3.394509 0,0.426759 0.0504,0.516006 0.33138,0.586519 0.18225,0.04574 0.40501,0.201076 0.495,0.345183 0.20571,0.329396 0.89555,0.343323 2.862,0.05778 z m 0.11816,-1.45905 c -0.11099,-0.110993 0.16145,-1.565003 0.5066,-2.703751 0.89895,-2.965867 2.8918,-5.028708 4.85807,-5.028708 1.488576,0 2.128809,1.136692 1.614909,2.867184 -0.413016,1.390771 -1.806659,2.666315 -4.103229,3.755501 -1.46343,0.694058 -2.78296,1.203168 -2.87635,1.109774 z m 16.193314,-4.00525 1.466951,-0.631823 -0.482912,-0.651947 c -0.265596,-0.358572 -0.562338,-0.948922 -0.659417,-1.311892 -0.161717,-0.604651 -0.147142,-0.718554 0.17397,-1.359502 0.856947,-1.710476 3.457222,-1.819555 5.06433,-0.212446 0.386295,0.386292 0.744677,0.87099 0.79641,1.077111 0.115791,0.461354 0.321976,0.485485 0.419264,0.04907 0.07118,-0.319288 0.511916,-3.32127 0.511916,-3.486797 0,-0.159425 -1.890167,-0.667608 -2.848242,-0.765765 -1.631386,-0.08456 -2.213971,-0.183458 -3.573718,0.164339 -1.768583,0.460657 -3.107329,1.499143 -3.730775,2.894023 -0.582587,1.30345 -0.390883,3.285673 0.451251,4.665983 0.244669,0.401032 0.332862,0.44906 0.614833,0.334826 0.181053,-0.07335 0.989313,-0.417681 1.796139,-0.765182 z" fill="white" />
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
                    <FeatureItem icon="bi-journal-bookmark-fill" title="Tahfizh & Al-Qur'an">
                        Modul khusus mutaba'ah setoran hafalan (Ziyadah/Murojaah), monitoring capaian per juz, dan cetak laporan perkembangan santri.
                    </FeatureItem>
                    <FeatureItem icon="bi-calendar-event-fill" title="Kalender Akademik">
                         Kelola agenda kegiatan pondok, hari libur, jadwal ujian, dan cetak kalender dinding custom (Masehi/Hijriah).
                    </FeatureItem>
                    <FeatureItem icon="bi-box-seam-fill" title="Manajemen Aset (Sarpras)">
                         Inventarisasi aset pondok, tanah, bangunan, dan barang bergerak beserta kondisi dan nilainya.
                    </FeatureItem>
                    <FeatureItem icon="bi-calendar-check-fill" title="Absensi Digital">
                        Pencatatan kehadiran harian santri per rombel dengan rekapitulasi bulanan otomatis dan laporan persentase kehadiran.
                    </FeatureItem>
                    <FeatureItem icon="bi-mortarboard-fill" title="Akademik & Rapor Digital">
                        Desain rapor kustom, manajemen nilai, formulir input nilai offline (HTML) untuk guru, dan cetak rapor lengkap.
                    </FeatureItem>
                    <FeatureItem icon="bi-journal-text" title="Penerimaan Santri Baru (PSB)">
                        Sistem lengkap mulai dari desain formulir online, manajemen pendaftar, seleksi, hingga integrasi data ke database utama.
                    </FeatureItem>
                    <FeatureItem icon="bi-person-badge-fill" title="Sistem Multi-User & Hak Akses">
                        Dukungan login dengan username/password. Atur hak akses berbeda untuk Admin dan Staff (Read/Write/Block) demi keamanan data.
                    </FeatureItem>
                    <FeatureItem icon="bi-cloud-arrow-up-fill" title="Sinkronisasi Tim (Hub & Spoke)">
                        Kolaborasi antar laptop via Dropbox. Admin Pusat (Pengepul) menggabungkan data dari banyak Staff secara aman dan offline-first.
                    </FeatureItem>
                    <FeatureItem icon="bi-activity" title="Audit Log Aktivitas">
                        Pantau jejak perubahan data secara detail. Ketahui siapa yang menambah, mengubah, atau menghapus data dan kapan waktunya.
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
                    <FeatureItem icon="bi-file-earmark-spreadsheet-fill" title="Ekspor Excel (SheetJS)">
                        Unduh laporan data santri, keuangan, arus kas, dan rekapitulasi dalam format Excel (.xlsx) yang rapi.
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
    );
};
