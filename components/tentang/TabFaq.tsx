
import React, { useState } from 'react';

interface FaqItemProps {
    question: string;
    answer: React.ReactNode;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden transition-shadow hover:shadow-sm">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none"
            >
                <span className="font-semibold text-gray-800 text-sm md:text-base pr-4">{question}</span>
                <i className={`bi bi-chevron-down text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="p-4 text-sm text-gray-600 border-t border-gray-100 leading-relaxed bg-white">
                    {answer}
                </div>
            </div>
        </div>
    );
};

export const TabFaq: React.FC = () => {
    return (
        <div className="space-y-8">
            {/* SECTION 1: UMUM */}
            <div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900 mb-4">
                    <h3 className="font-bold text-lg mb-1">Pertanyaan Umum & Sinkronisasi</h3>
                </div>
                <div className="space-y-3">
                    <FaqItem 
                        question="Di menu PSB, apa bedanya 'Sync Sesama Admin' dan 'Ambil dari Google Sheet'?"
                        answer={
                            <div>
                                <p className="mb-2">Ini adalah dua fitur dengan tujuan yang berbeda:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Sync Sesama Admin (Dropbox):</strong> Ini adalah sinkronisasi <em>Internal</em>. Gunakan tombol ini jika Anda ingin menarik data yang diinput manual oleh Admin lain (misal: Admin B menginput pendaftar offline di laptopnya, dan Anda ingin menarik data tersebut).</li>
                                    <li><strong>Ambil dari Google Sheet:</strong> Ini adalah sinkronisasi <em>Eksternal</em>. Gunakan tombol ini untuk menarik data pendaftar online (masyarakat umum) yang mengisi Formulir Web.</li>
                                </ul>
                            </div>
                        }
                    />
                    <FaqItem 
                        question="Bagaimana jika saya lupa melakukan Sync (Kirim Perubahan) sebelum menutup aplikasi?"
                        answer={
                            <div>
                                <p className="mb-2">Tenang, sistem kami memiliki pengaman ganda:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Auto-Sync:</strong> Setiap kali Anda menyimpan, mengedit, atau menghapus data, sistem secara otomatis mencoba mengirim perubahan ke Cloud di latar belakang.</li>
                                    <li><strong>Peringatan Keluar:</strong> Jika proses sinkronisasi sedang berjalan atau tertunda, browser akan memunculkan peringatan konfirmasi jika Anda mencoba menutup tab atau aplikasi.</li>
                                </ul>
                            </div>
                        }
                    />
                    <FaqItem 
                        question="Apa yang terjadi jika saya lupa klik 'Ambil Master' saat mulai bekerja di pagi hari?"
                        answer="Sistem menerapkan fitur 'Auto-Pull on Load'. Artinya, setiap kali Anda membuka aplikasi atau login ulang, sistem secara otomatis memeriksa dan mengunduh data Master terbaru dari Cloud di latar belakang, sehingga risiko mengedit data usang (basi) sangat kecil."
                    />
                    <FaqItem 
                        question="Apakah data saya aman jika laptop rusak atau browser ter-uninstall?"
                        answer="Data utama tersimpan di browser (IndexedDB). Jika laptop rusak/hilang, data di laptop tersebut hilang. OLEH KARENA ITU, sangat penting untuk mengaktifkan Cloud Sync (Dropbox) atau rutin melakukan 'Unduh Cadangan Data' (file JSON) dan menyimpannya di tempat aman (Flashdisk/Google Drive) sebagai backup."
                    />
                </div>
            </div>

            {/* SECTION 2: KEUANGAN */}
            <div>
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-green-900 mb-4">
                    <h3 className="font-bold text-lg mb-1">Keuangan & Buku Kas</h3>
                </div>
                <div className="space-y-3">
                    <FaqItem 
                        question="Saya sudah input pembayaran SPP santri, kenapa Saldo Buku Kas tidak bertambah?"
                        answer={
                            <div>
                                <p className="mb-2">Ini disengaja agar Buku Kas tetap rapi. Sistem menggunakan metode <strong>"Setoran Kas (Closing)"</strong>:</p>
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>Saat Anda klik "Bayar" pada santri, uang masuk ke "Laci Kasir" (Pending).</li>
                                    <li>Di akhir hari/shift, buka menu <strong>Keuangan &gt; Setoran Kas</strong>.</li>
                                    <li>Centang semua pembayaran hari itu, lalu klik <strong>"Setor ke Buku Kas"</strong>.</li>
                                </ol>
                                <p className="mt-2">Dengan cara ini, 50 transaksi pembayaran santri akan tercatat sebagai 1 baris pemasukan (Gelondongan) di Buku Kas, memudahkan pembukuan.</p>
                            </div>
                        }
                    />
                    <FaqItem 
                        question="Bagaimana cara memisahkan uang Tunai dan Transfer di Buku Kas?"
                        answer="Di menu 'Setoran Kas', terdapat filter Metode Pembayaran. Anda bisa memfilter 'Tunai' terlebih dahulu lalu klik Setor (untuk masuk ke Kas Tunai/Brankas), kemudian memfilter 'Transfer' dan klik Setor (untuk masuk ke Kas Bank). Berikan keterangan yang jelas saat menyetor."
                    />
                    <FaqItem 
                        question="Saya salah input nominal pembayaran santri, bagaimana cara editnya?"
                        answer={
                            <div>
                                <p>Tergantung status uangnya:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Belum Disetor ke Kas:</strong> Buka menu <em>Status Pembayaran &gt; Klik tombol 'Riwayat' pada santri</em>. Anda bisa menghapus pembayaran yang salah di sana.</li>
                                    <li><strong>Sudah Disetor ke Kas:</strong> Anda harus menghapus dulu transaksi setoran tersebut di menu <em>Buku Kas</em> agar pembayaran santri kembali berstatus 'Pending/Belum Disetor', baru kemudian bisa diedit/hapus di riwayat santri.</li>
                                </ul>
                            </div>
                        }
                    />
                    <FaqItem 
                        question="Apakah Uang Saku (Tabungan) santri dihitung sebagai Pemasukan Pondok?"
                        answer="Secara akuntansi, TIDAK. Uang saku adalah 'Titipan' (Kewajiban/Utang Pondok ke Santri). Uang tersebut baru menjadi pemasukan riil pondok (Pendapatan) ketika santri membelanjakannya di kantin/koperasi atau digunakan untuk membayar SPP (Pemindahbukuan)."
                    />
                    <FaqItem 
                        question="Apa bedanya 'Generate Tagihan Bulanan' dan 'Tagihan Awal'?"
                        answer={
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Bulanan:</strong> Untuk biaya rutin seperti SPP, Makan, Kebersihan. Dibuat setiap awal bulan.</li>
                                <li><strong>Awal (Sekali Bayar/Cicilan):</strong> Untuk biaya masuk seperti Uang Gedung, Seragam, Kitab. Dibuat hanya sekali saat santri baru masuk.</li>
                            </ul>
                        }
                    />
                </div>
            </div>
        </div>
    );
};
