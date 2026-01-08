
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
        <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900 mb-6">
                <h3 className="font-bold text-lg mb-1">Pertanyaan Umum & Skenario</h3>
                <p className="text-sm">
                    Berikut adalah penjelasan mengenai cara kerja sistem dalam menangani berbagai situasi, terutama terkait keamanan data dan sinkronisasi.
                </p>
            </div>

            <div className="space-y-3">
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
                    question="Bagaimana jika Admin Utama berhalangan (sakit/cuti) dan tidak bisa memproses data?"
                    answer="Sistem mendukung pendelegasian wewenang. Admin Utama dapat memberikan hak akses khusus bernama 'Wakil Admin (Sync)' kepada staff senior melalui menu Pengaturan User. Wakil Admin ini memiliki wewenang untuk menggabungkan data (Merge) dan mempublikasikan Master Data agar operasional pondok tetap berjalan lancar."
                />

                <FaqItem 
                    question="Apa bedanya 'Simpan' biasa dengan 'Sinkronisasi Cloud'?"
                    answer={
                        <div>
                            <p className="mb-2">
                                <strong>Simpan:</strong> Data tersimpan di <em>Hardisk/Browser</em> laptop Anda secara instan (Offline). Anda bisa bekerja tanpa internet.
                            </p>
                            <p>
                                <strong>Sinkronisasi Cloud:</strong> Data di laptop Anda dikirim ke Dropbox agar bisa diakses oleh Admin Pusat. Ini memerlukan koneksi internet.
                            </p>
                        </div>
                    }
                />

                <FaqItem 
                    question="Apakah data saya aman jika laptop rusak atau browser ter-uninstall?"
                    answer="Data utama tersimpan di browser (IndexedDB). Jika laptop rusak/hilang, data di laptop tersebut hilang. OLEH KARENA ITU, sangat penting untuk mengaktifkan Cloud Sync (Dropbox) atau rutin melakukan 'Unduh Cadangan Data' (file JSON) dan menyimpannya di tempat aman (Flashdisk/Google Drive) sebagai backup."
                />

                <FaqItem 
                    question="Kenapa saat mencetak laporan, tampilannya berantakan?"
                    answer="Aplikasi ini menggunakan kertas standar (A4/F4). Pastikan saat jendela print muncul, pengaturan 'Paper Size' di printer sesuai dengan yang Anda pilih di aplikasi. Matikan opsi 'Headers and Footers' pada pengaturan cetak browser untuk hasil yang lebih bersih."
                />
            </div>
        </div>
    );
};
