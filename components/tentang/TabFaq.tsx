
import React, { useState } from 'react';

interface FaqItemProps {
    question: string;
    answer: React.ReactNode;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden transition-all duration-200 hover:shadow-md">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center p-4 text-left transition-colors focus:outline-none ${isOpen ? 'bg-teal-50 text-teal-800' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
            >
                <span className="font-semibold text-sm md:text-base pr-4 flex items-start gap-2">
                    <i className="bi bi-question-circle-fill text-teal-500 mt-0.5 flex-shrink-0"></i>
                    {question}
                </span>
                <i className={`bi bi-chevron-down text-gray-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-teal-600' : ''}`}></i>
            </button>
            <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="p-4 text-sm text-gray-600 border-t border-gray-100 leading-relaxed bg-white pl-10">
                    {answer}
                </div>
            </div>
        </div>
    );
};

const FaqCategory: React.FC<{ title: string; icon: string; colorClass: string; children: React.ReactNode }> = ({ title, icon, colorClass, children }) => (
    <div className="mb-8 break-inside-avoid">
        <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 mb-4 ${colorClass}`}>
            <i className={`bi ${icon} text-xl`}></i>
            <h3 className="font-bold text-lg">{title}</h3>
        </div>
        <div className="space-y-2">
            {children}
        </div>
    </div>
);

export const TabFaq: React.FC = () => {
    return (
        <div className="columns-1 lg:columns-2 gap-8 space-y-8">
            
            {/* 1. UMUM & SISTEM */}
            <FaqCategory 
                title="Umum & Keamanan Akun" 
                icon="bi-shield-lock-fill" 
                colorClass="bg-purple-50 border-purple-500 text-purple-900"
            >
                <FaqItem 
                    question="Apakah aplikasi ini butuh internet?"
                    answer="Secara umum TIDAK. Aplikasi ini berkonsep 'Offline-First'. Anda bisa input data, bayar SPP, dan cetak laporan tanpa internet. Internet HANYA dibutuhkan saat Anda ingin melakukan Sinkronisasi Data (Upload/Download) ke Dropbox atau backup ke Google Drive."
                />
                <FaqItem 
                    question="Saya lupa password Admin, bagaimana cara resetnya?"
                    answer={
                        <div>
                            <p className="mb-2">Jika Anda menggunakan mode Multi-User, gunakan <strong>Kunci Pemulihan (Recovery Key)</strong>:</p>
                            <ol className="list-decimal pl-5 space-y-1">
                                <li>Di halaman login, klik "Gunakan Kunci Darurat".</li>
                                <li>Masukkan kode unik (format: ESANTRI-XXXX-XXXX) yang diberikan saat pertama kali mengaktifkan multi-user.</li>
                                <li>Jika kunci valid, Anda bisa membuat password baru.</li>
                            </ol>
                            <p className="mt-2 text-xs italic text-red-600">Catatan: Jika Anda kehilangan Kunci Pemulihan, data tidak dapat dipulihkan demi keamanan.</p>
                        </div>
                    }
                />
                <FaqItem 
                    question="Apa yang terjadi jika saya 'Clear Cache' browser?"
                    answer={
                        <span className="text-red-600 font-bold">
                            JANGAN LAKUKAN INI TANPA BACKUP! Data aplikasi tersimpan di browser. Menghapus Cache/History akan MENGHAPUS SEMUA DATA SANTRI. Pastikan Anda rutin melakukan "Unduh Cadangan Data" (file JSON) atau Sinkronisasi Cloud.
                        </span>
                    }
                />
            </FaqCategory>

            {/* 2. DATA SANTRI */}
            <FaqCategory 
                title="Data Santri & Akademik" 
                icon="bi-people-fill" 
                colorClass="bg-teal-50 border-teal-500 text-teal-900"
            >
                <FaqItem 
                    question="Bagaimana cara menaikan kelas santri secara massal?"
                    answer="Gunakan fitur 'Pindahkan Rombel Massal' di menu Data Santri. Filter santri berdasarkan kelas lama -> Centang Semua -> Klik tombol 'Pindah Kelas' di atas tabel -> Pilih kelas tujuan. Selesai."
                />
                <FaqItem 
                    question="Santri sudah lulus/boyong, apakah datanya dihapus?"
                    answer="Sebaiknya JANGAN dihapus agar riwayatnya tetap ada. Cukup ubah statusnya menjadi 'Lulus' atau 'Keluar/Pindah'. Data mereka akan disembunyikan dari daftar aktif tapi tetap ada di laporan alumni."
                />
                <FaqItem 
                    question="Kenapa foto santri tidak muncul saat dicetak?"
                    answer="Pastikan ukuran foto yang diupload tidak terlalu besar (maksimal 500KB). Foto yang terlalu besar bisa membuat browser kehabisan memori saat mencetak banyak kartu sekaligus."
                />
            </FaqCategory>

            {/* 3. KEUANGAN (CRITICAL) */}
            <FaqCategory 
                title="Keuangan & Pembayaran" 
                icon="bi-cash-coin" 
                colorClass="bg-green-50 border-green-500 text-green-900"
            >
                <FaqItem 
                    question="Saya sudah terima uang SPP, kenapa Saldo Buku Kas tidak bertambah?"
                    answer={
                        <div>
                            <p className="mb-2 font-semibold text-green-700">Ini adalah fitur keamanan (Double Entry).</p>
                            <p className="mb-2">Saat Anda klik "Bayar" di menu santri, uang masuk ke status "Di Laci Kasir" (Pending). Agar masuk ke Buku Kas Umum, Anda harus melakukan <strong>Setoran Kas (Closing)</strong>:</p>
                            <ol className="list-decimal pl-5 space-y-1">
                                <li>Buka menu <strong>Keuangan &gt; Setoran Kas</strong>.</li>
                                <li>Anda akan melihat daftar uang yang diterima hari ini.</li>
                                <li>Centang semua, lalu klik <strong>"Setor ke Buku Kas"</strong>.</li>
                            </ol>
                            <p className="mt-2 text-xs">Tujuannya agar Admin Keuangan bisa memverifikasi uang fisik sebelum dicatat resmi sebagai pemasukan pondok.</p>
                        </div>
                    }
                />
                <FaqItem 
                    question="Bagaimana jika ada santri bayar rapel 3 bulan sekaligus?"
                    answer="Di menu pembayaran, centang saja 3 bulan tagihan tersebut sekaligus. Sistem akan menjumlahkannya totalnya dan mencetak 1 kuitansi gabungan agar hemat kertas."
                />
                <FaqItem 
                    question="Salah input nominal pembayaran, cara editnya?"
                    answer={
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Jika <strong>Belum Disetor</strong>: Buka Riwayat Pembayaran santri tersebut, hapus transaksinya, lalu input ulang.</li>
                            <li>Jika <strong>Sudah Disetor</strong>: Hapus dulu transaksi "Setoran Kas" di menu Buku Kas, baru kemudian hapus pembayaran di data santri.</li>
                        </ul>
                    }
                />
                <FaqItem 
                    question="Apakah Uang Saku bisa dipakai memotong SPP otomatis?"
                    answer="Tidak otomatis. Anda harus melakukan 'Penarikan Uang Saku' terlebih dahulu (uang keluar dari tabungan), lalu lakukan 'Pembayaran SPP' (uang masuk ke SPP) secara terpisah."
                />
            </FaqCategory>

            {/* 4. DATA MASTER */}
            <FaqCategory 
                title="Data Master (Pengaturan)" 
                icon="bi-database-fill" 
                colorClass="bg-blue-50 border-blue-500 text-blue-900"
            >
                <FaqItem 
                    question="Kenapa saya tidak bisa menghapus Kelas atau Jenjang?"
                    answer="Sistem mencegah penghapusan data induk yang sedang digunakan. Jika ada Santri yang masih terdaftar di Kelas tersebut, Anda harus memindahkan santri-santri tersebut ke kelas lain dulu sebelum bisa menghapus kelasnya."
                />
                <FaqItem 
                    question="Bagaimana menambah Wali Kelas baru?"
                    answer="Pertama, tambahkan nama guru tersebut di menu 'Tenaga Pendidik'. Setelah itu, edit data Rombel di 'Struktur Pendidikan' dan pilih nama guru tersebut sebagai Wali Kelas."
                />
            </FaqCategory>

            {/* 5. PSB & IMPORT */}
            <FaqCategory 
                title="PSB & Import Data" 
                icon="bi-person-plus-fill" 
                colorClass="bg-orange-50 border-orange-500 text-orange-900"
            >
                <FaqItem 
                    question="Bagaimana cara import data dari WhatsApp?"
                    answer="Saat calon wali santri mengisi formulir via WA (yang dihasilkan aplikasi), akan ada kode di bagian bawah pesan (diawali PSB_START...). Copy SELURUH pesan tersebut, lalu paste di menu 'Impor WA' pada dashboard PSB."
                />
                <FaqItem 
                    question="Saya punya data Excel, bisa diupload?"
                    answer={
                        <div>
                            <p>Bisa. Gunakan fitur <strong>Impor CSV</strong> di menu Data Santri.</p>
                            <ol className="list-decimal pl-5 space-y-1 text-xs mt-1">
                                <li>Download template CSV kosong yang disediakan aplikasi.</li>
                                <li>Copy-paste data dari Excel Anda ke template CSV tersebut.</li>
                                <li>Upload kembali CSV yang sudah diisi.</li>
                            </ol>
                        </div>
                    }
                />
            </FaqCategory>

            {/* 6. SINKRONISASI */}
            <FaqCategory 
                title="Sinkronisasi & Cloud" 
                icon="bi-cloud-arrow-up-fill" 
                colorClass="bg-indigo-50 border-indigo-500 text-indigo-900"
            >
                <FaqItem 
                    question="Apa bedanya 'Kirim Perubahan' dan 'Ambil Master'?"
                    answer={
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Kirim Perubahan (Upload):</strong> Mengirim data yang Anda kerjakan di laptop ini ke Inbox Cloud (untuk digabung oleh Admin Pusat).</li>
                            <li><strong>Ambil Master (Download):</strong> Mengambil data terbaru yang sudah disahkan/digabung oleh Admin Pusat. Lakukan ini setiap pagi sebelum bekerja agar data Anda sinkron.</li>
                        </ul>
                    }
                />
                <FaqItem 
                    question="Apakah bisa dipakai banyak orang bersamaan (Realtime)?"
                    answer="Aplikasi ini Semi-Realtime (Hub & Spoke). Tidak seperti Google Docs yang live. Staff A dan Staff B bisa bekerja offline bersamaan, tapi data mereka baru akan bertemu setelah Admin Pusat melakukan 'Merge' dan 'Publish'."
                />
            </FaqCategory>

        </div>
    );
};
