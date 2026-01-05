
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';

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
            <div className="text-gray-700 space-y-3 text-sm leading-relaxed">{children}</div>
        </div>
    </div>
);

export const TabPanduan: React.FC = () => {
    const { showConfirmation, onDeleteSampleData, showToast } = useAppContext();
    const [sampleDataDeleted, setSampleDataDeleted] = useState(false);
    const [showResetConfirmation, setShowResetConfirmation] = useState(false);
    const [resetInput, setResetInput] = useState('');
    const CONFIRM_RESET_TEXT = 'HAPUS SEMUA DATA';

    useEffect(() => {
        const deleted = localStorage.getItem('eSantriSampleDataDeleted') === 'true';
        setSampleDataDeleted(deleted);
    }, []);

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
    };

    const sqlCode = `-- 1. Buat Tabel Audit Logs (Versi Kompatibel App)
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  table_name text not null,
  record_id text,
  operation text not null, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  changed_by text, -- Diubah ke TEXT agar bisa menyimpan nama admin tanpa login Auth
  username text, -- Opsional, untuk detail tambahan
  created_at timestamptz default now()
);

-- 2. Aktifkan Realtime untuk tabel ini
alter publication supabase_realtime add table public.audit_logs;

-- 3. Fungsi Otomatis (Trigger)
create or replace function public.handle_audit_log()
returns trigger as $$
declare
  old_row jsonb := null;
  new_row jsonb := null;
begin
  if (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') then
    old_row := to_jsonb(OLD);
  end if;
  if (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') then
    new_row := to_jsonb(NEW);
  end if;

  insert into public.audit_logs (table_name, record_id, operation, old_data, new_data, changed_by)
  values (
    TG_TABLE_NAME,
    coalesce(new_row->>'id', old_row->>'id'),
    TG_OP,
    old_row,
    new_row,
    'System / Trigger' -- Default value jika perubahan via SQL langsung
  );
  return null;
end;
$$ language plpgsql security definer;

-- 4. CONTOH: Terapkan Trigger ke Tabel (Ulangi untuk setiap tabel yang ingin dipantau)
-- create trigger audit_santri_changes
-- after insert or update or delete on public.santri
-- for each row execute function public.handle_audit_log();`;

    return (
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
                <p>Ini adalah langkah <strong>paling fundamental</strong> yang menentukan bagaimana seluruh aplikasi akan bekerja. Buka halaman <strong className="font-semibold text-teal-700">Pengaturan</strong> dan halaman <strong className="font-semibold text-teal-700">Data Master</strong>, lalu pastikan Anda melengkapi bagian-bagian berikut:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li><strong>Struktur Pendidikan:</strong> Definisikan Jenjang (misal: Ulya, Wustho), Kelas, dan Rombel.</li>
                    <li><strong>Tenaga Pendidik:</strong> Masukkan data Mudir dan Wali Kelas agar nama mereka muncul di rapor dan laporan.</li>
                    <li><strong>Pengaturan Biaya:</strong> Definisikan komponen biaya (SPP, Uang Pangkal, dll) di menu Keuangan.</li>
                    <li><strong>Generator NIS:</strong> Atur metode pembuatan Nomor Induk Santri (Kustom/Global/Tgl Lahir).</li>
                    <li><strong>Informasi Umum:</strong> Lengkapi detail pondok dan upload logo untuk kop surat otomatis.</li>
                </ul>
            </PanduanLangkah>

            <PanduanLangkah number={2} title="Manajemen Data Santri">
                <p>Setelah pengaturan selesai, kelola data santri di halaman <strong className="font-semibold text-teal-700">Data Santri</strong>.</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li><strong>Menambah Santri:</strong> Klik tombol <span className="font-semibold text-white bg-teal-600 px-2 py-0.5 rounded-md text-xs">+ Tambah</span>. Manfaatkan tombol <i className="bi bi-arrow-clockwise bg-teal-600 text-white p-1 rounded-sm"></i> di sebelah kolom NIS untuk membuat NIS otomatis sesuai pengaturan.</li>
                    <li><strong>Mengedit & Melengkapi Data:</strong> Klik ikon pensil <i className="bi bi-pencil-square text-blue-600"></i>. Di dalam formulir edit, Anda bisa melengkapi data yang lebih detail melalui tab-tab yang tersedia:
                        <ul className="list-['-_'] pl-5 mt-1">
                            <li><strong className="font-semibold">Data Lain-lain:</strong> Catat <span className="italic">Prestasi</span>, <span className="italic">Pelanggaran</span>, dan <span className="italic">Hobi</span> santri.</li>
                            <li><strong className="font-semibold">Riwayat Status:</strong> Lihat jejak perubahan status santri (misalnya dari Aktif menjadi Lulus). Riwayat ini tercatat otomatis saat Anda mengubah status santri.</li>
                        </ul>
                    </li>
                </ul>
            </PanduanLangkah>

            <PanduanLangkah number={3} title="Penerimaan Santri Baru (PSB Online)">
                <p>Modul <strong className="font-semibold text-teal-700">PSB</strong> memudahkan pengelolaan calon santri dari pendaftaran hingga diterima.</p>
                <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li><strong>Desain Formulir:</strong> Masuk ke tab "Desain Formulir". Pilih field apa saja yang wajib diisi dan tema desain (Modern/Klasik). Klik tombol "Download HTML" untuk mendapatkan file formulir.</li>
                    <li><strong>Bagikan:</strong> Kirim file HTML tersebut ke wali santri via WA atau upload ke hosting Anda. Wali santri mengisi formulir di browser mereka.</li>
                    <li><strong>Kirim Data:</strong> Setelah wali santri mengisi form dan klik kirim, data akan terformat otomatis menjadi pesan WhatsApp yang dikirim ke nomor Admin.</li>
                    <li><strong>Impor Data:</strong> Salin pesan WA tersebut (mulai dari `PSB_START` sampai `PSB_END`). Di aplikasi ini, buka tab "Rekap Pendaftar", klik "Impor WA", dan tempel pesannya. Data akan masuk ke tabel.</li>
                    <li><strong>Seleksi:</strong> Klik tombol <i className="bi bi-check-lg text-green-600"></i> pada tabel pendaftar untuk menerima mereka menjadi Santri Aktif.</li>
                </ol>
            </PanduanLangkah>

            <PanduanLangkah number={4} title="Manajemen Keasramaan">
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

            <PanduanLangkah number={5} title="Alur Kerja Modul Keuangan">
                <p>Modul <strong className="font-semibold text-teal-700">Keuangan</strong> dirancang untuk menyederhanakan administrasi pembayaran. Alur kerjanya sebagai berikut:</p>
                <ol className="list-decimal pl-5 space-y-3 mt-2">
                    <li>
                        <strong>Memahami Dashboard Keuangan:</strong> Sebelum memulai, luangkan waktu di tab <strong className="font-semibold">Dashboard</strong>. Grafik "Proyeksi" membantu Anda melihat estimasi pemasukan rutin.
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
                        <strong>Rekonsiliasi Kas:</strong> (Best Practice) Secara berkala, setorkan penerimaan yang tercatat ke buku kas umum melalui tombol <span className="font-semibold bg-green-600 text-white px-2 py-0.5 rounded-md text-xs">Setor ke Kas</span> agar uang tercatat sebagai pemasukan riil pondok.
                    </li>
                </ol>
            </PanduanLangkah>

             <PanduanLangkah number={6} title="Buku Kas Umum & Uang Saku">
                <p>Fitur keuangan tambahan untuk manajemen dana yang lebih detail:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li><strong>Buku Kas Umum:</strong> Digunakan untuk mencatat Pemasukan (Donasi, Hibah, Setoran SPP) dan Pengeluaran (Belanja Dapur, Listrik, Gaji Guru) operasional pondok. Saldo akhir di sini mencerminkan uang kas yang dipegang bendahara.</li>
                    <li><strong>Uang Saku Santri:</strong> Tab khusus di menu Keuangan untuk mengelola "Tabungan/Titipan" santri.
                        <ul className="list-disc pl-5 mt-1 text-sm">
                            <li>Klik <strong>Deposit</strong> saat wali santri menitipkan uang.</li>
                            <li>Klik <strong>Penarikan</strong> saat santri mengambil uang jajan.</li>
                            <li>Cetak <strong>Laporan Riwayat Uang Saku</strong> untuk diberikan ke wali santri sebagai pertanggungjawaban.</li>
                        </ul>
                    </li>
                </ul>
            </PanduanLangkah>

            <PanduanLangkah number={7} title="Menangani Proses Akhir Tahun (Kenaikan Kelas & Kelulusan)">
                <p>Setiap akhir tahun ajaran, gunakan fitur <strong className="font-semibold">Aksi Massal</strong> di halaman <strong className="font-semibold text-teal-700">Data Santri</strong> untuk efisiensi.</p>
                
                <h4 className="font-semibold text-base mt-4 mb-2">Skenario 1: Meluluskan Santri Kelas Akhir</h4>
                <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Filter santri tingkat akhir (misal: Kelas 3 Ulya).</li>
                    <li>Pilih semua santri yang ditampilkan (centang header tabel).</li>
                    <li>Klik tombol <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded-md text-xs">Ubah Status</span>.</li>
                    <li>Pilih status baru <strong className="font-semibold">"Lulus"</strong>.</li>
                </ol>

                <h4 className="font-semibold text-base mt-4 mb-2">Skenario 2: Menaikkan Kelas Santri</h4>
                <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Filter santri per rombel (misal: Kelas 1A).</li>
                    <li>Pilih semua santri.</li>
                    <li>Klik tombol <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded-md text-xs">Pindahkan Rombel</span>.</li>
                    <li>Pilih rombel tujuan yang baru (misal: Kelas 2A). Data santri akan berpindah secara massal.</li>
                </ol>
            </PanduanLangkah>

            <PanduanLangkah number={8} title="Referensi Lengkap Laporan & Cetak">
                <p>Halaman <strong className="font-semibold text-teal-700">Laporan & Cetak</strong> menyediakan berbagai dokumen otomatis yang siap pakai:</p>
                <div className="space-y-6 mt-6">
                    <div>
                        <h4 className="flex items-center gap-2 font-bold text-blue-800 border-b border-blue-200 pb-1 mb-3"><i className="bi bi-file-earmark-person-fill"></i> Administrasi & Identitas</h4>
                        <ul className="space-y-2 pl-2 text-sm">
                            <li><strong>1. Biodata Santri:</strong> Profil lengkap termasuk data orang tua.</li>
                            <li><strong>2. Kartu Tanda Santri:</strong> Kartu identitas dengan foto, barcode, dan masa berlaku. Mendukung 5 desain.</li>
                            <li><strong>3. Cetak Label Santri:</strong> Stiker label (nama & kelas) untuk ditempel di buku/undangan.</li>
                            <li><strong>4. Daftar Santri per Rombel:</strong> Absensi manual atau checklist wali kelas.</li>
                            <li><strong>5. Daftar Wali Kelas:</strong> Rekapitulasi tugas wali kelas.</li>
                            <li><strong>6. Laporan Kontak Wali Santri:</strong> Ekspor CSV untuk simpan nomor HP wali santri ke Google Contacts.</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="flex items-center gap-2 font-bold text-green-800 border-b border-green-200 pb-1 mb-3"><i className="bi bi-book-half"></i> Akademik & Kedisiplinan</h4>
                        <ul className="space-y-2 pl-2 text-sm">
                            <li><strong>7. Lembar Nilai:</strong> Formulir kosong untuk guru mengisi nilai mapel.</li>
                            <li><strong>8. Lembar Absensi:</strong> Format absensi bulanan (tanggal 1-31).</li>
                            <li><strong>9. Lembar Pembinaan:</strong> Rekam jejak prestasi dan pelanggaran santri.</li>
                            <li><strong>10. Laporan Mutasi:</strong> Rekap santri keluar/masuk/lulus per periode.</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="flex items-center gap-2 font-bold text-yellow-700 border-b border-yellow-200 pb-1 mb-3"><i className="bi bi-cash-stack"></i> Keuangan</h4>
                        <ul className="space-y-2 pl-2 text-sm">
                            <li><strong>11. Rekening Koran Santri:</strong> Laporan detail transaksi (tagihan, bayar, uang saku) satu santri. Transparansi penuh.</li>
                            <li><strong>12. Laporan Arus Kas Umum:</strong> Laporan pertanggungjawaban bendahara (pemasukan vs pengeluaran).</li>
                            <li><strong>13. Laporan Ringkas Dashboard:</strong> Cetak statistik utama untuk pimpinan.</li>
                        </ul>
                    </div>
                </div>
            </PanduanLangkah>

            <PanduanLangkah number={9} title="Efisiensi Input Data: Tambah Massal, Editor & Impor CSV">
                <p>Untuk mempercepat proses input data, eSantri Web menyediakan tiga fitur canggih di halaman <strong className="font-semibold text-teal-700">Data Santri</strong>:</p>
                
                <h4 className="font-semibold text-base mt-4 mb-2">A. Tambah Massal (Input Cepat)</h4>
                <p className="text-sm mb-2">Klik tombol <span className="font-semibold bg-teal-50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-md text-xs">Tambah Massal</span>. Fitur ini memungkinkan Anda <strong>menambah banyak santri baru</strong> sekaligus dalam tampilan tabel kosong. Sangat berguna saat penerimaan santri baru manual.</p>

                <h4 className="font-semibold text-base mt-4 mb-2">B. Editor Massal (Bulk Editor)</h4>
                <p className="text-sm mb-2">Pilih beberapa santri (centang), lalu klik tombol <span className="font-semibold bg-white border border-teal-300 text-teal-700 px-2 py-0.5 rounded-md text-xs">Edit</span> di toolbar yang muncul. Anda bisa mengedit data mereka secara bersamaan (seperti Excel), cocok untuk input nilai atau perbaikan data massal.</p>

                <h4 className="font-semibold text-base mt-4 mb-2">C. Impor & Ekspor File CSV</h4>
                <p className="text-sm mb-2">Klik tombol <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded-md text-xs">Ekspor</span> &gt; "Unduh Template". Isi data di Excel, lalu impor kembali. Cocok untuk migrasi data awal dari aplikasi lain.</p>
            </PanduanLangkah>
            
            <PanduanLangkah number={10} title="Membuat & Mengelola Surat Menyurat">
                <p>Modul <strong className="font-semibold text-teal-700">Surat Menyurat</strong> memudahkan Anda membuat surat resmi dengan template.</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li><strong>Template:</strong> Buat master surat (Undangan, Izin, Panggilan) di tab "Manajemen Template". Gunakan placeholder seperti <code>{'{NAMA_SANTRI}'}</code> agar data terisi otomatis.</li>
                    <li><strong>Magic Draft (AI):</strong> Gunakan tombol "Magic Draft" saat membuat template untuk meminta AI menuliskan isi surat yang sopan dan formal secara otomatis.</li>
                    <li><strong>Mail Merge:</strong> Saat mencetak, pilih mode "Massal" untuk mencetak satu surat yang ditujukan ke banyak santri sekaligus (misal: Undangan Wali Santri se-angkatan).</li>
                </ul>
            </PanduanLangkah>

            <PanduanLangkah number={11} title="Sinkronisasi Data Antar Perangkat (Cloud Sync)">
                <p>Fitur <strong className="font-semibold text-teal-700">Sinkronisasi Cloud</strong> di menu Pengaturan memungkinkan Anda membackup data ke luar komputer ini.</p>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md my-2 text-sm">
                    <strong className="text-blue-800">Pilihan Provider:</strong>
                    <ul className="list-disc pl-5 mt-1 text-gray-700">
                        <li><strong>Dropbox / WebDAV (Gratis):</strong> Metode backup file manual. Anda harus klik "Upload" untuk membackup dan "Download" di komputer lain untuk mengambil data.</li>
                        <li><strong>Supabase (Realtime):</strong> Metode database terpusat. Data langsung tersimpan di cloud saat Anda mengetik. Memungkinkan multi-admin bekerja bersamaan.</li>
                    </ul>
                </div>
            </PanduanLangkah>

            <PanduanLangkah number={12} title="Konfigurasi Database Cloud (Supabase)">
                <p>Jika Anda memilih menggunakan Supabase agar bisa online/multi-device, ikuti langkah ini:</p>
                <ol className="list-decimal pl-5 space-y-2 mt-1 text-sm">
                    <li>Buat Project Baru di <a href="https://supabase.com" target="_blank" className="text-teal-600 underline">Supabase.com</a>.</li>
                    <li>Masuk ke <strong>SQL Editor</strong> di dashboard Supabase dan jalankan kode di bawah ini untuk menyiapkan tabel log aktivitas:</li>
                </ol>
                <div className="mt-3 bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono border border-gray-700 shadow-inner">
                    <pre><code>{sqlCode}</code></pre>
                </div>
                <p className="text-sm mt-3">
                    Setelah selesai, salin <strong>Project URL</strong> dan <strong>Anon Key</strong> ke menu <strong>Pengaturan</strong> aplikasi ini. Jangan lupa isi kolom "ID Admin" agar aktivitas Anda tercatat.
                </p>
                <div className="my-4 p-4 border rounded-lg bg-gray-50 text-sm">
                     <h4 className="font-bold text-gray-800 mb-1"><i className="bi bi-info-circle-fill text-teal-600"></i> Info Hosting</h4>
                     <p>Supabase menyediakan paket <strong>Free Tier</strong> yang sangat cukup untuk pesantren skala kecil-menengah (hingga 500MB database). Namun, proyek gratis akan "dijeda" (pause) jika tidak ada aktivitas selama 1 minggu. Anda cukup login ke dashboard Supabase untuk mengaktifkannya kembali.</p>
                </div>
            </PanduanLangkah>

            <PanduanLangkah number={13} title="Informasi Teknis & Keamanan" isLast={true}>
                <div className="p-4 rounded-md border-l-4 border-blue-500 bg-blue-50 text-blue-800">
                    <h4 className="font-bold flex items-center gap-2"><i className="bi bi-database-fill-gear"></i>Mode Offline vs Online</h4>
                    <p className="mt-2 text-sm leading-relaxed">
                        Secara default, aplikasi berjalan di <strong>Mode Offline</strong> menggunakan database browser (IndexedDB). Data hanya ada di laptop ini dan sangat cepat.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed">
                        Jika Anda mengaktifkan Supabase, aplikasi berjalan di <strong>Mode Online</strong>. Pastikan koneksi internet stabil. Data tersimpan di server cloud.
                    </p>
                </div>
                 <div className="p-4 rounded-md border-l-4 border-red-500 bg-red-50 text-red-800 mt-4">
                     <h4 className="font-bold flex items-center gap-2"><i className="bi bi-shield-lock-fill"></i>Keamanan Data (PENTING)</h4>
                    <p className="mt-1 text-sm">Jangan lupa melakukan <strong>Backup Rutin</strong> (tombol "Unduh Cadangan Data" di Pengaturan) minimal seminggu sekali, terutama jika Anda menggunakan Mode Offline. Simpan file backup di Google Drive atau Flashdisk.</p>
                </div>
            </PanduanLangkah>
        </div>
    );
};
