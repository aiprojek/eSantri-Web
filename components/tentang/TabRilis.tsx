
import React from 'react';

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

export const latestVersion = changelogData[0].version;
export const latestUpdateDate = changelogData[0].date;

export const TabRilis: React.FC = () => {
    return (
        <div className="space-y-6">
            {changelogData.map((note, index) => (
                <div key={index} className="relative flex gap-4">
                    {/* Timeline Line */}
                    {index !== changelogData.length - 1 && (
                        <div className="absolute top-10 left-[18px] w-0.5 h-full bg-gray-200"></div>
                    )}
                    
                    {/* Version Circle */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-50 border-2 border-teal-200 flex items-center justify-center z-10">
                        <i className="bi bi-git text-teal-600 text-lg"></i>
                    </div>

                    {/* Content Card */}
                    <div className="flex-grow bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">{note.version}</h3>
                                <p className="text-xs text-gray-500">{note.date}</p>
                            </div>
                            {index === 0 && <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-1 rounded">TERBARU</span>}
                        </div>
                        {note.description && <p className="text-sm text-gray-600 mb-3 italic">{note.description}</p>}
                        <ul className="space-y-2">
                            {note.changes.map((change, idx) => (
                                <li key={idx} className="flex items-start text-sm text-gray-700">
                                    <ChangeBadge type={change.type} />
                                    <span>{change.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
    );
};
