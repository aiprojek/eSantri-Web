import React from 'react';
import { PanduanSectionData } from '../panduan';

export const pengaturanPanduan: PanduanSectionData = {
    id: 'pengaturan',
    badge: 'UPDATE',
    badgeColor: 'teal',
    title: 'Pengaturan Sistem, Generator NIS, Aset Digital & Diagnosa',
    steps: [
        {
            title: '1. SOP Kerja Multi-Admin Pengaturan Sistem: Real-Time Sync (Firebase) vs Hub-and-Spoke',
            color: 'teal',
            content: (
                <div className="space-y-3.5 text-sm text-gray-700">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                        <i className="bi bi-shield-lock-fill text-amber-600 shrink-0 text-base mt-0.5"></i>
                        <div>
                            <strong className="font-bold text-amber-900 block mb-0.5">Otoritas Terpusat Konfigurasi Lembaga (Super Admin Only):</strong>
                            Menu <strong>Pengaturan Sistem</strong> mengendalikan fondasi utama aplikasi (Identitas Pondok, Hak Akses Staf, Pola Nomor Induk Santri/NIS, Aset Stempel/TTD, Koneksi Cloud, hingga Pemeliharaan Database). Di lingkungan multi-admin, perubahan pada menu ini <strong>WAJIB dieksekusi hanya oleh Administrator Utama (Super Admin)</strong> agar konfigurasi lembaga tidak berubah-ubah atau saling menimpa.
                        </div>
                    </div>

                    {/* Model A: Realtime */}
                    <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-teal-200/70 pb-1.5">
                            <h5 className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">A</span>
                                Model A: Cloud Real-Time (Firebase Firestore)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Distribusi Instan</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Saat Super Admin menyimpan perubahan di menu Pengaturan pada mode Firebase Realtime:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 block font-semibold">
                                    <i className="bi bi-broadcast text-teal-600 mr-1"></i> Sinkronisasi Detik Itu Juga
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Perubahan profil pondok, logo, daftar akun staf, rumus NIS, maupun API Key AI langsung disinkronkan ke seluruh perangkat staf yang sedang aktif tanpa perlu reload halaman.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 block font-semibold">
                                    <i className="bi bi-person-fill-lock text-teal-600 mr-1"></i> Pencabutan Akses Real-Time
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Jika Super Admin mengubah izin modul atau mereset password akun staf di tab <em>User &amp; Keamanan</em>, wewenang pada perangkat staf tersebut langsung diperbarui seketika.
                                </p>
                            </div>
                            <div className="p-2.5 bg-white rounded-lg border border-teal-100 shadow-2xs space-y-1">
                                <strong className="text-teal-950 block font-semibold">
                                    <i className="bi bi-image-fill text-teal-600 mr-1"></i> Sinkronisasi Aset Digital Cloud
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Stempel pondok dan tanda tangan digital (TTD) yang diunggah di tab <em>Aset Digital</em> otomatis tersimpan di koleksi <code>digitalAssets</code> Cloud sehingga siap dipakai mencetak surat/rapor dari laptop mana pun.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Model B: Hub and Spoke */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1.5">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">B</span>
                                Model B: Hub-and-Spoke (Dropbox / Nextcloud / WebDAV / Offline)
                            </h5>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">Terpusat di Komputer HUB</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Pada arsitektur Hub-and-Spoke, <strong>Komputer Admin Pusat (HUB) adalah satu-satunya sumber pengaturan induk</strong>:
                        </p>
                        <div className="space-y-2 pt-1 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                                <strong className="text-indigo-950 block mb-1">Urutan SOP Perubahan Pengaturan di Mode Hub-and-Spoke:</strong>
                                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                    <li>
                                        <strong>Ubah di Komputer Pusat (Hub):</strong> Super Admin melakukan perubahan pengaturan (misal menambah akun guru baru, memperbarui format NIS, atau mengunggah TTD kepala madrasah) di Komputer Pusat, lalu klik <strong>&quot;Simpan Pengaturan&quot;</strong> pada bar bawah yang melayang.
                                    </li>
                                    <li>
                                        <strong>Publikasikan Master ke Cloud:</strong> Buka menu <em>Pusat Sinkronisasi</em> &rarr; klik tombol biru <strong>&quot;Publikasikan Master&quot;</strong> agar pengaturan terbaru dikemas ke dalam berkas induk <code>master_data.json</code> di Cloud.
                                    </li>
                                    <li>
                                        <strong>Penarikan Otomatis di Perangkat Staf (Spoke):</strong> Saat staf login di laptop masing-masing (atau menekan tombol <em>&quot;Update Data Akun dari Cloud&quot;</em> di layar login jika ada perubahan password/akun baru), pengaturan terbaru otomatis diterapkan.
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: '2. Tab Umum: Identitas Lembaga, Bar Simpan Melayang & Konfigurasi AI Assistant (BYOK)',
            color: 'blue',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Tab <strong>Umum</strong> mengelola profil utama pesantren dan integrasi layanan pintar yang digunakan lintas modul:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <strong className="font-bold text-slate-900 flex items-center gap-1.5">
                                <i className="bi bi-building-check text-teal-600 text-base"></i> 1. Profil, Kop Resmi &amp; Field Identitas Fleksibel
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Mengatur Nama Yayasan, Nama Pondok Pesantren, NSPP, NPSN, Alamat Lengkap, Telepon, Website, Email, Logo, serta Mudir Aam.
                            </p>
                            <ul className="list-disc pl-4 text-[10px] text-gray-600 space-y-0.5">
                                <li><strong>Data &amp; Identitas Tambahan (Fleksibel):</strong> Anda dapat menambahkan field baru sesuai kebutuhan (misal: <code>No. IJOB</code>, <code>SK Kemenag</code>, <code>SK Kemenkumham</code>, <code>Akreditasi</code>, <code>NPWP</code>).</li>
                                <li><strong>Opsi Tampil di Kop:</strong> Setiap field (termasuk NSPP, NPSN, dan field tambahan) memiliki tombol <strong>&quot;Tampil di Kop&quot;</strong> / <strong>&quot;Disembunyikan&quot;</strong> beserta pratinjau langsung Kop Surat.</li>
                                <li><strong>Tag Variabel Otomatis:</strong> Setiap field tambahan otomatis menghasilkan tag variabel (contoh: <code>{`{NO_IJOB}`}</code>) yang dapat disisipkan di <em>Surat Menyurat</em> maupun <em>Desain Rapor</em>.</li>
                            </ul>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <strong className="font-bold text-slate-900 flex items-center gap-1.5">
                                <i className="bi bi-robot text-purple-600 text-base"></i> 2. AI Assistant &amp; Kunci API (BYOK)
                            </strong>
                            <p className="text-gray-600 text-[11px] leading-relaxed">
                                Pilih penyedia AI untuk fitur <em>Magic Draft Surat</em> dan <em>Analisis Dashboard</em>: tersedia mode <strong>Gratis Tanpa API Key (Pollinations)</strong> atau mode <strong>BYOK (Bring Your Own Key)</strong> menggunakan <em>Google Gemini, OpenAI, Groq,</em> atau <em>OpenRouter</em>.
                            </p>
                            <ul className="list-disc pl-4 text-[10px] text-gray-600 space-y-0.5">
                                <li>Dilengkapi lencana status <strong>Tersimpan</strong> / <strong>Belum Diisi</strong> untuk setiap penyedia.</li>
                                <li>Gunakan tombol <strong>Ikon Mata (Tampilkan/Sembunyikan)</strong> untuk memeriksa key dan tombol <strong>Hapus</strong> untuk mereset key.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center gap-2.5">
                        <i className="bi bi-floppy2-fill text-amber-600 text-base shrink-0"></i>
                        <span>
                            <strong>Detektor Perubahan Belum Disimpan (Sticky Save Bar):</strong> Setiap kali Anda mengubah isian di tab Umum, Akun, NIS, atau Cloud, bilah pengingat berwarna kuning akan melayang di bagian bawah layar lengkap dengan tombol <strong>&quot;Batalkan Perubahan&quot;</strong> dan <strong>&quot;Simpan Pengaturan&quot;</strong> agar Anda tidak pernah lupa menyimpan perubahan.
                        </span>
                    </div>
                </div>
            )
        },
        {
            title: '3. Tab User & Keamanan: Multi-User, Kunci Pemulihan Darurat & 7 Role Preset',
            color: 'indigo',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Tab <strong>User &amp; Keamanan</strong> mengatur autentikasi masuk dan pembagian hak akses (<em>Role-Based Access Control</em>) untuk seluruh pengurus pesantren:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                        <li>
                            <strong>Aktivasi Mode Multi-User &amp; Kunci Pemulihan Darurat:</strong> Saat menyalakan toggle <em>Mode Multi-User</em>, wajib catat dan simpan <strong>Kunci Pemulihan Darurat (<code>ESANTRI-XXXX-XXXX-XXXX</code>)</strong>. Kunci ini adalah penyelamat utama untuk mereset password Super Admin di layar login apabila seluruh admin lupa password.
                        </li>
                        <li>
                            <strong>Konversi Cepat &quot;Ambil dari Data Guru&quot;:</strong> Buat puluhan akun login ustadz/staf sekaligus langsung dari daftar Tenaga Pendidik di Data Master tanpa perlu mengetik satu per satu.
                        </li>
                        <li>
                            <strong>7 Preset Peran Siap Pakai &amp; Kustomisasi Granular:</strong> Pilih template wewenang instan (<em>Super Admin, Kesantrian/Pengasuhan, Bendahara/Keuangan, Tata Usaha/Akademik, Sarpras &amp; Aset, Perpustakaan,</em> atau <em>Wali Kelas/Guru</em>) atau atur hak akses per modul secara detail (<strong>Penuh / Hanya Lihat / Diblokir</strong>).
                        </li>
                    </ul>
                </div>
            )
        },
        {
            title: '4. Tab Generator NIS: 3 Metode Penomoran, Kamus Variabel & Simulasi Live Preview',
            color: 'green',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Tab <strong>Generator NIS</strong> memudahkan pembuatan Nomor Induk Santri secara otomatis dan konsisten untuk seluruh jenjang pendidikan (Marhalah):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[10px]">METODE 1: GLOBAL</span>
                            <h6 className="font-bold text-slate-900">Urutan Induk Pondok</h6>
                            <p className="text-[11px] text-gray-600">Nomor urut santri dihitung menyatu secara global satu pondok berdasarkan tanggal masuk dan abjad nama.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">METODE 2: PER JENJANG</span>
                            <h6 className="font-bold text-slate-900">Urutan Mandiri Marhalah</h6>
                            <p className="text-[11px] text-gray-600">Setiap jenjang (misal Salafiyah Wustho vs Ulya, atau MTs vs MA) memiliki penghitung nomor urut dan panjang digit masing-masing.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">METODE 3: KUSTOM</span>
                            <h6 className="font-bold text-slate-900">Pola Variabel Dinamis</h6>
                            <p className="text-[11px] text-gray-600">Susun struktur NIS bebas menggunakan kombinasi kode tahun Masehi/Hijriah, gender, jenjang, rombel, dan nomor urut.</p>
                        </div>
                    </div>

                    <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 text-xs space-y-2">
                        <strong className="font-bold text-teal-950 flex items-center gap-1.5">
                            <i className="bi bi-code-slash text-teal-700 text-sm"></i> Kamus Variabel Format Kustom &amp; Kartu Live Preview Simulasi:
                        </strong>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                            <div className="bg-white p-1.5 rounded border border-teal-100"><code>{'{TM}'}</code> : 2 Digit Thn Masuk Masehi (26)</div>
                            <div className="bg-white p-1.5 rounded border border-teal-100"><code>{'{TM4}'}</code> : 4 Digit Thn Masuk Masehi (2026)</div>
                            <div className="bg-white p-1.5 rounded border border-teal-100"><code>{'{TH}'}</code> : 2 Digit Thn Masuk Hijriah (47)</div>
                            <div className="bg-white p-1.5 rounded border border-teal-100"><code>{'{TH4}'}</code> : 4 Digit Thn Masuk Hijriah (1447)</div>
                            <div className="bg-white p-1.5 rounded border border-teal-100"><code>{'{JK}'}</code> : Kode Gender Putra/Putri (1/2)</div>
                            <div className="bg-white p-1.5 rounded border border-teal-100"><code>{'{K}'}</code> : Kode Jenjang (misal: 01 / MTS)</div>
                            <div className="bg-white p-1.5 rounded border border-teal-100"><code>{'{KK}'}</code> : Kode Rombel/Kelas</div>
                            <div className="bg-white p-1.5 rounded border border-teal-100"><code>{'{NO_URUT}'}</code> : Nomor Urut Santri (001)</div>
                        </div>
                        <p className="text-[11px] text-teal-900 leading-relaxed pt-1">
                            <strong>Pantau Hasil Sebelum Eksekusi:</strong> Gunakan panel <strong>Live Preview Simulasi Format NIS</strong> yang menampilkan contoh hasil NIS secara langsung untuk setiap jenjang, lengkap dengan indikator jumlah santri aktif yang sudah memiliki NIS vs yang belum memiliki NIS.
                        </p>
                    </div>

                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950">
                        <strong>⚠️ Aturan Aman Eksekusi Generator NIS:</strong> Secara default, opsi <em>&quot;Timpa (Overwrite) NIS yang sudah ada&quot;</em> dalam keadaan <strong>TIDAK DICENTANG (Nonaktif)</strong>. Biarkan tetap nonaktif saat Anda hanya ingin membuatkan NIS untuk santri baru agar NIS santri lama yang sudah tercetak di Kartu Santri dan Buku Rapor tidak berubah!
                    </div>
                </div>
            )
        },
        {
            title: '5. Tab Aset Digital: Stempel Resmi Pondok & Tanda Tangan Digital (TTD) Otomatis',
            color: 'purple',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Tab <strong>Aset Digital</strong> adalah gudang penyimpanan visual untuk gambar <strong>Stempel Resmi Lembaga</strong> dan <strong>Tanda Tangan (TTD) Pejabat/Ustadz</strong> yang terintegrasi ke seluruh dokumen cetak:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-700">
                        <li>
                            <strong>Penghapus Background Putih Otomatis (Auto-Transparent):</strong> Jika Anda memfoto tanda tangan atau stempel di atas kertas HVS putih, aktifkan fitur hapus latar belakang saat mengunggah agar gambar otomatis menjadi transparan (PNG) dan tampak menyatu alami di atas garis tanda tangan dokumen.
                        </li>
                        <li>
                            <strong>Penautan Otomatis berdasarkan Nama Pejabat:</strong> Beri nama aset TTD sesuai nama lengkap ustadz/pejabat di Data Master (atau tautkan ke profil guru terkait). Saat mencetak <strong>Surat Menyurat, Rapor, Syahadah Tahfizh, Kuitansi Keuangan,</strong> maupun <strong>Kartu Santri</strong>, sistem akan otomatis menampilkan tanda tangan dan stempel yang sesuai tanpa perlu unggah berulang.
                        </li>
                    </ul>
                </div>
            )
        },
        {
            title: '6. Tab Backup, Restore & Diagnosa Kesehatan Database (Skor 0–100%, Auto-Fix & Purge)',
            color: 'orange',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="leading-relaxed">
                        Untuk menjaga keamanan dan kecepatan database dalam pemakaian jangka panjang bertahun-tahun, gunakan kombinasi tab <strong>Backup &amp; Restore</strong> dan <strong>Diagnosa</strong>:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <strong className="font-bold text-slate-900 flex items-center gap-1.5">
                                <i className="bi bi-hdd-fill text-teal-600 text-base"></i> 1. Backup &amp; Restore Terjadwal
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                <li><strong>Lencana Backup Terakhir:</strong> Pantau kapan terakhir kali database diunduh sebagai cadangan lokal.</li>
                                <li><strong>Pengingat Backup Otomatis:</strong> Atur frekuensi pengingat (Harian, 2 Hari, Pekanan, atau Bulanan) agar sistem memunculkan pengingat unduh file <code>.json</code> secara berkala.</li>
                                <li><strong>Safe Restore &amp; Reset Sampel:</strong> Pulihkan seluruh database dari file JSON kapan saja lengkap dengan ringkasan tabel, atau bersihkan data simulasi/demo dengan 1 klik.</li>
                            </ul>
                        </div>
                        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                            <strong className="font-bold text-slate-900 flex items-center gap-1.5">
                                <i className="bi bi-heart-pulse-fill text-rose-600 text-base"></i> 2. Diagnosa &amp; Perbaikan Otomatis
                            </strong>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-gray-600 leading-relaxed">
                                <li><strong>Skor Kesehatan Database (0–100%):</strong> Memindai keutuhan relasi 10+ modul (Santri, Rombel, Keuangan, Rapor, Absensi, Tahfizh, Kesehatan, BK, Perpustakaan, Asrama, dan Sarpras).</li>
                                <li><strong>Tombol &quot;Perbaiki Semua Otomatis&quot;:</strong> Menjalankan seluruh tindakan perbaikan untuk membuatkan saldo santri yang hilang, membersihkan data yatim (<em>orphan records</em>), serta memperbaiki indeks sinkronisasi Cloud.</li>
                                <li><strong>Bersihkan Sampah Permanen (Purge &gt;30 Hari):</strong> Menghapus permanen rekaman berstatus <em>soft-deleted</em> (<code>deleted: true</code>) yang telah berusia lebih dari 30 hari agar ukuran penyimpanan browser tetap ringan dan cepat.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};
