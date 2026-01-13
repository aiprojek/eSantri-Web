
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
                    question="Apa manfaat mengaktifkan Mode Multi-User?"
                    answer={
                        <div>
                            <p className="mb-2">Mode Multi-User memberikan 3 manfaat utama:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Keamanan:</strong> Membatasi akses orang lain yang meminjam komputer Anda.</li>
                                <li><strong>Pembagian Tugas (Role):</strong> Anda bisa membuat akun Staff yang hanya bisa akses menu tertentu (misal: Bendahara hanya akses Keuangan, tidak bisa hapus data Santri).</li>
                                <li><strong>Audit Trail:</strong> Setiap perubahan data akan tercatat di menu <em>Log Aktivitas</em> beserta nama user yang melakukannya, memudahkan pelacakan jika terjadi kesalahan input.</li>
                            </ul>
                        </div>
                    }
                />
                <FaqItem 
                    question="Saya lupa password Admin, bagaimana cara resetnya?"
                    answer={
                        <div>
                            <p className="mb-2">Jika menggunakan mode Multi-User, gunakan <strong>Kunci Pemulihan (Recovery Key)</strong>:</p>
                            <ol className="list-decimal pl-5 space-y-1">
                                <li>Di halaman login, klik "Gunakan Kunci Darurat".</li>
                                <li>Masukkan kode unik (ESANTRI-XXXX...) yang diberikan saat setup.</li>
                                <li>Jika kunci valid, Anda bisa membuat password baru.</li>
                            </ol>
                            <p className="mt-2 text-xs italic text-red-600">Catatan: Jika Anda juga kehilangan Kunci Pemulihan, data tidak dapat diakses (terenkripsi). Solusinya adalah melakukan Reset Aplikasi (Hapus Data).</p>
                        </div>
                    }
                />
                <FaqItem 
                    question="Apakah aplikasi ini butuh internet?"
                    answer="Secara umum TIDAK. Aplikasi ini berkonsep 'Offline-First'. Anda bisa input data, bayar SPP, dan cetak laporan tanpa internet. Internet HANYA dibutuhkan saat Anda ingin melakukan Sinkronisasi Cloud (Dropbox), menggunakan fitur AI Magic Draft, atau mengirim Formulir Online (PSB/Rapor)."
                />
                <FaqItem 
                    question="Apa yang terjadi jika saya 'Clear Cache' browser?"
                    answer={
                        <span className="text-red-600 font-bold">
                            BAHAYA! Menghapus Cache/History akan MENGHAPUS SEMUA DATA. Pastikan Anda rutin melakukan "Unduh Cadangan Data" (file JSON) atau Sinkronisasi Cloud agar data aman.
                        </span>
                    }
                />
            </FaqCategory>

            {/* 2. DATA MASTER (NEW) */}
            <FaqCategory 
                title="Data Master & Akademik" 
                icon="bi-database-fill" 
                colorClass="bg-blue-50 border-blue-500 text-blue-900"
            >
                <FaqItem 
                    question="Bagaimana cara input banyak kelas/rombel sekaligus?"
                    answer={
                        <div>
                            <p className="mb-1">Gunakan tombol <strong>"Tambah Banyak (Tabel)"</strong> di menu Data Master > Struktur Pendidikan.</p>
                            <p>Fitur ini memungkinkan Anda mengisi nama kelas seperti mengisi tabel Excel. Anda juga bisa langsung memilih Induk (misal: Rombel 1A induknya Kelas 1) tanpa perlu bolak-balik menu.</p>
                        </div>
                    }
                />
                <FaqItem 
                    question="Apa beda Jenjang, Kelas, dan Rombel?"
                    answer={
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Jenjang:</strong> Tingkat pendidikan utama (Misal: Salafiyah Wustho, Salafiyah Ulya).</li>
                            <li><strong>Kelas:</strong> Tingkatan tahun dalam jenjang (Misal: Kelas 1, Kelas 2). Ini adalah induk dari Rombel.</li>
                            <li><strong>Rombel (Rombongan Belajar):</strong> Kelas fisik tempat santri belajar (Misal: Kelas 1A Putra, Kelas 1B Putri). Santri dimasukkan ke dalam Rombel.</li>
                        </ul>
                    }
                />
                 <FaqItem 
                    question="Bisakah saya menghapus Jenjang yang sudah ada santrinya?"
                    answer="TIDAK BISA. Untuk menjaga integritas data, Anda tidak bisa menghapus Jenjang/Kelas/Rombel yang masih memiliki santri aktif di dalamnya. Pindahkan dulu santri ke kelas lain atau luluskan, baru hapus datanya."
                />
            </FaqCategory>

            {/* 3. PSB */}
            <FaqCategory 
                title="PSB & Formulir Online" 
                icon="bi-person-plus-fill" 
                colorClass="bg-orange-50 border-orange-500 text-orange-900"
            >
                <FaqItem 
                    question="Apakah setiap Template Formulir butuh Web App URL (Script) berbeda?"
                    answer="TIDAK. Fitur 'Smart Script' memungkinkan Anda menggunakan SATU Web App URL untuk semua formulir. Script akan otomatis mendeteksi nama formulir dan membuat Tab (Sheet) baru di file Spreadsheet yang sama untuk memisahkan data."
                />
                 <FaqItem 
                    question="Bagaimana cara import data dari WhatsApp?"
                    answer="Salin seluruh pesan pendaftaran dari WA (termasuk kode PSB_START...), lalu paste di menu 'Impor WA' pada dashboard PSB. Sistem akan otomatis memparsing data JSON tersebut."
                />
                <FaqItem 
                    question="Apa itu Metode Hybrid?"
                    answer="Metode Hybrid mengirim data ke Google Sheet (Cloud) untuk arsip otomatis, TETAPI juga membuat pesan WhatsApp berisi data backup. Ini paling aman: jika server error, data masih ada di chat WA Admin."
                />
            </FaqCategory>

            {/* 4. AKADEMIK & RAPOR */}
            <FaqCategory 
                title="Rapor Digital" 
                icon="bi-mortarboard-fill" 
                colorClass="bg-indigo-50 border-indigo-500 text-indigo-900"
            >
                <FaqItem 
                    question="Apakah Guru perlu login untuk mengisi nilai?"
                    answer="TIDAK PERLU. Admin akan mengirimkan file HTML (Formulir Offline) kepada Guru via WhatsApp. Guru cukup membuka file tersebut di HP atau Laptop mereka, mengisi nilai, lalu klik 'Kirim'."
                />
                <FaqItem 
                    question="Apakah Guru butuh internet saat mengisi nilai?"
                    answer="TIDAK. Formulir HTML tersebut bisa dibuka dan diisi tanpa kuota internet (Offline). Internet hanya dibutuhkan sesaat ketika Guru menekan tombol 'Kirim ke WA' untuk mengirimkan hasilnya ke Admin."
                />
                <FaqItem 
                    question="Apa itu kode acak saat Guru mengirim nilai via WA?"
                    answer="Itu adalah data nilai yang sudah dienkripsi (dikodekan) agar aman dan mudah dibaca oleh sistem. Admin cukup menyalin seluruh pesan tersebut ke menu 'Import Nilai', sistem akan otomatis menerjemahkannya menjadi angka di rapor."
                />
            </FaqCategory>

            {/* 5. KEUANGAN */}
            <FaqCategory 
                title="Keuangan & Pembayaran" 
                icon="bi-cash-coin" 
                colorClass="bg-green-50 border-green-500 text-green-900"
            >
                <FaqItem 
                    question="Kenapa Saldo Kas tidak bertambah setelah ada pembayaran?"
                    answer="Pembayaran santri masuk ke status 'Di Laci Kasir' (Pending). Admin Keuangan harus melakukan 'Setoran Kas' di menu Keuangan agar uang tercatat resmi masuk ke Buku Kas Umum Pondok."
                />
                 <FaqItem 
                    question="Apa beda Uang Saku dan SPP?"
                    answer="Uang Saku adalah tabungan pribadi santri (Deposit/Penarikan) yang dikelola pondok. SPP adalah kewajiban bayar bulanan. Saldo Uang Saku tidak otomatis memotong SPP kecuali ditarik manual."
                />
            </FaqCategory>

            {/* 6. SINKRONISASI */}
            <FaqCategory 
                title="Sinkronisasi Tim" 
                icon="bi-cloud-arrow-up-fill" 
                colorClass="bg-gray-50 border-gray-500 text-gray-900"
            >
                <FaqItem 
                    question="Apa bedanya 'Kirim Perubahan' dan 'Ambil Master'?"
                    answer="Kirim Perubahan (Upload) mengirim pekerjaan Anda ke Cloud. Ambil Master (Download) mengambil data terbaru yang sudah disahkan Admin Pusat. Staff wajib melakukan Ambil Master setiap pagi."
                />
                <FaqItem 
                    question="Apakah bisa real-time collaboration?"
                    answer="Tidak real-time (seperti Google Docs). Sistem ini menggunakan model Hub & Spoke. Staff bekerja offline, lalu menyetor data ke Admin Pusat untuk digabungkan. Ini mencegah konflik data dan memungkinkan kerja tanpa internet."
                />
                 <FaqItem 
                    question="Apa fungsi 'Kode Pairing' di menu Sync?"
                    answer="Kode Pairing memungkinkan Staff terhubung ke Dropbox Admin tanpa perlu login email/password akun Dropbox tersebut. Cukup Copy-Paste kode dari Admin, laptop Staff langsung terhubung."
                />
            </FaqCategory>

        </div>
    );
};
