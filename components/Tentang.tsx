
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

const GPL_TEXT = `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.

Preamble

The GNU General Public License is a free, copyleft license for software and other kinds of works.

The licenses for most software and other practical works are designed to take away your freedom to share and change the works. By contrast, the GNU General Public License is intended to guarantee your freedom to share and change all versions of a program--to make sure it remains free software for all its users. We, the Free Software Foundation, use the GNU General Public License for most of our software; it applies also to any other work released this way by its authors. You can apply it to your programs, too.

When we speak of free software, we are referring to freedom, not price. Our General Public Licenses are designed to make sure that you have the freedom to distribute copies of free software (and charge for them if you wish), that you receive source code or can get it if you want it, that you can change the software or use pieces of it in new free programs, and that you know you can do these things.

To protect your rights, we need to prevent others from denying you these rights or asking you to surrender the rights. Therefore, you have certain responsibilities if you distribute copies of the software, or if you modify it: responsibilities to respect the freedom of others.

For example, if you distribute copies of such a program, whether gratis or for a fee, you must pass on to the recipients the same freedoms that you received. You must make sure that they, too, receive or can get the source code. And you must show them these terms so they know their rights.

Developers that use the GNU GPL protect your rights with two steps: (1) assert copyright on the software, and (2) offer you this License giving you legal permission to copy, distribute and/or modify it.

For the developers' and authors' protection, the GPL clearly explains that there is no warranty for this free software. For both users' and authors' sake, the GPL requires that modified versions be marked as changed, so that their problems will not be attributed erroneously to authors of previous versions.

Some devices are designed to deny users access to install or run modified versions of the software inside them, although the manufacturer can do so. This is fundamentally incompatible with the aim of protecting users' freedom to change the software. The systematic pattern of such abuse occurs in the area of products for individuals to use, which is precisely where it is most unacceptable. Therefore, we have designed this version of the GPL to prohibit the practice for those products. If such problems arise substantially in other domains, we stand ready to extend this provision to those domains in future versions of the GPL, as needed to protect the freedom of users.

Finally, every program is threatened constantly by software patents. States should not allow patents to restrict development and use of software on general-purpose computers, but in those that do, we wish to avoid the special danger that patents applied to a free program could make it effectively proprietary. To prevent this, the GPL assures that patents cannot be used to render the program non-free.

The precise terms and conditions for copying, distribution and modification follow.

TERMS AND CONDITIONS

0. Definitions.

"This License" refers to version 3 of the GNU General Public License.

"Copyright" also means copyright-like laws that apply to other kinds of works, such as semiconductor masks.

"The Program" refers to any copyrightable work licensed under this License. Each licensee is addressed as "you". "Licensees" and "recipients" may be individuals or organizations.

To "modify" a work means to copy from or adapt all or part of the work in a fashion requiring copyright permission, other than the making of an exact copy. The resulting work is called a "modified version" of the earlier work or a work "based on" the earlier work.

A "covered work" means either the unmodified Program or a work based on the Program.

To "propagate" a work means to do anything with it that, without permission, would make you directly or secondarily liable for infringement under applicable copyright law, except executing it on a computer or modifying a private copy. Propagation includes copying, distribution (with or without modification), making available to the public, and in some countries other activities as well.

To "convey" a work means any kind of propagation that enables other parties to make or receive copies. Mere interaction with a user through a computer network, with no transfer of a copy, is not conveying.

... (For full text, please visit https://www.gnu.org/licenses/gpl-3.0.html) ...

NO WARRANTY

15. Disclaimer of Warranty.

THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU. SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.

16. Limitation of Liability.

IN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.`;

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

    const latestVersion = changelogData[0].version;

    useEffect(() => {
        const deleted = localStorage.getItem('eSantriSampleDataDeleted') === 'true';
        setSampleDataDeleted(deleted);
    }, []);

    const mailtoLink = `mailto:aiprojek01@gmail.com?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(`Halo,\n\nNama saya ${contactName}.\n\n${contactMessage}`)}`;


    const TabButton: React.FC<{
        tabId: 'tentang' | 'panduan' | 'rilis' | 'kontak' | 'lisensi';
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
    auth.uid()
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
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Tentang Aplikasi eSantri Web</h1>
                <div className="mt-2 flex items-center gap-2">
                    <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-teal-200">
                        <i className="bi bi-rocket-takeoff mr-1"></i> Versi Terbaru: {latestVersion}
                    </span>
                    <span className="text-sm text-gray-500">Terakhir diperbarui: {changelogData[0].date}</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px overflow-x-auto">
                        <TabButton tabId="tentang" label="Tentang Aplikasi" icon="bi-info-circle" />
                        <TabButton tabId="panduan" label="Panduan Pengguna" icon="bi-question-circle" />
                        <TabButton tabId="rilis" label="Catatan Rilis" icon="bi-clock-history" />
                        <TabButton tabId="lisensi" label="Lisensi" icon="bi-file-earmark-text" />
                        <TabButton tabId="kontak" label="Kontak" icon="bi-envelope" />
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'tentang' && (
                        <div className="space-y-8">
                            <div className="p-6 bg-teal-50 border border-teal-200 rounded-lg text-center">
                                {/* ... Logo SVG ... */}
                                <svg className="w-16 h-16 mb-3 mx-auto" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="64" height="64" rx="12" fill="#0f766e"/>
                                  <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06395,0.06031 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.807226,3.136742 0,1.449522 -1.080984,2.352339 -2.83266,2.365783 -1.692966,0.013 -2.898289,-0.700527 -3.613504,-2.139108 -0.233721,-0.470103 -0.448882,-0.914285 -0.478136,-0.987069 -0.116891,-0.290814 -0.200722,0.06466 -0.343292,1.455679 -0.08206,0.800623 -0.183673,1.704103 -0.225804,2.196123 -0.07851,0.5657 -0.05503,0.618734 0.371528,0.839314 0.250433,0.129504 1.022439,0.362267 1.715565,0.517254 1.500515,0.335516 3.830431,0.295752 5.096151,-0.08698 z M 11.866048,40.626469 c 1.020556,-0.500151 2.054444,-0.832015 2.982265,-0.957257 l 0.68756,-0.09281 V 38.075643 36.574885 L 14.703555,36.410364 C 13.438321,36.160271 12.938298,35.987582 11.975968,35.468378 L 11.093945,34.992506 9.9042954,35.766367 C 8.031086,36.984872 5.0107355,38.044574 4.3772651,37.70555 3.9702944,37.487745 3.5902974,37.824019 3.7335127,38.275236 c 0.1257906,0.39633 0.797206,0.424765 0.8983306,0.03805 0.06213,-0.2376 0.2903465,-0.278167 2.0358602,-0.361878 1.0812301,-0.05186 2.4014512,-0.09428 2.933819,-0.09428 0.7917475,0 1.0167815,-0.05398 1.2362915,-0.296526 0.64908,-0.717223 1.844188,0.13221 1.317323,0.936298 -0.332361,0.507253 -0.785732,0.562716 -1.201464,0.146983 -0.350824,-0.350826 -0.366401,-0.352462 -3.2771401,-0.344529 l -2.9246417,0.008 1.034983,0.271321 c 1.4849959,0.389292 3.0329312,1.06573 4.1100921,1.79608 0.5139687,0.348484 0.9766597,0.641108 1.0282017,0.650274 0.05152,0.0092 0.47493,-0.17017 0.94088,-0.398521 z m 5.124237,-0.272385 c 0.0033,-0.05972 0.02012,-1.118204 0.03621,-2.35221 l 0.02932,-2.243649 H 16.693943 16.33206 l -0.04025,2.164913 c -0.02209,1.190702 -0.0077,2.249197 0.03161,2.352212 0.07558,0.197064 0.655007,0.26547 0.666853,0.07874 z m 4.001617,-0.628305 c 3.374141,-0.857628 4.778839,-1.488945 15.967196,-7.176203 4.690228,-2.384133 7.258592,-3.33837 11.033259,-4.099241 3.97792,-0.801842 8.572447,-0.652298 11.887212,0.386905 0.624457,0.19577 1.16406,0.327264 1.199115,0.292205 0.143194,-0.143195 -3.176816,-1.120282 -4.795262,-1.411255 -2.183345,-0.392533 -5.704678,-0.525761 -7.754138,-0.293377 -4.610966,0.522832 -8.280091,1.657841 -14.320462,4.429906 -3.817281,1.751836 -7.52494,3.103261 -10.277358,3.746051 -1.851681,0.432435 -4.33587,0.808837 -5.338191,0.808837 h -0.741377 v 1.791074 1.791073 l 0.69476,-0.08699 c 0.38212,-0.04784 1.36127,-0.256397 2.17589,-0.463455 z m -0.118801,-4.40808 c 4.749218,-0.689623 7.959523,-2.012124 9.866298,-4.064455 0.841357,-0.905587 1.214347,-1.528001 1.501476,-2.505551 0.679014,-2.311777 -0.291066,-4.385192 -2.446976,-5.230066 -0.725318,-0.284243 -1.131027,-0.34026 -2.460774,-0.339764 -2.808553,0.001 -4.556539,0.766973 -6.730944,2.94935 -1.447641,1.452948 -2.262053,2.665132 -2.952885,4.395143 -0.426266,1.067494 -0.81066,2.828086 -0.81066,3.71302 0,0.466802 0.05513,0.564423 0.362475,0.641552 0.19935,0.05003 0.443012,0.219943 0.541446,0.377572 0.225012,0.360303 0.97958,0.375537 3.130544,0.0632 z m 0.129247,-1.595953 c -0.121405,-0.121408 0.176599,-1.71185 0.554135,-2.957448 0.9833,-3.244156 3.16314,-5.500556 5.313908,-5.500556 1.62825,0 2.328557,1.243349 1.766437,3.136215 -0.451769,1.521269 -1.976179,2.916498 -4.488239,4.107883 -1.600745,0.759182 -3.044088,1.316063 -3.146241,1.213906 z m 16.193314,-4.00525 1.466951,-0.631823 -0.482912,-0.651947 c -0.265596,-0.358572 -0.562338,-0.948922 -0.659417,-1.311892 -0.161717,-0.604651 -0.147142,-0.718554 0.17397,-1.359502 0.856947,-1.710476 3.457222,-1.819555 5.06433,-0.212446 0.386295,0.386292 0.744677,0.87099 0.79641,1.077111 0.115791,0.461354 0.321976,0.485485 0.419264,0.04907 0.07118,-0.319288 0.511916,-3.32127 0.511916,-3.486797 0,-0.159425 -1.890167,-0.667608 -2.848242,-0.765765 -1.631386,-0.08456 -2.213971,-0.183458 -3.573718,0.164339 -1.768583,0.460657 -3.107329,1.499143 -3.730775,2.894023 -0.582587,1.30345 -0.390883,3.285673 0.451251,4.665983 0.244669,0.401032 0.332862,0.44906 0.614833,0.334826 0.181053,-0.07335 0.989313,-0.417681 1.796139,-0.765182 z" fill="white" />
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
                                    {/* ... Feature Items ... */}
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
                                {/* ... Contact Links ... */}
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
                            {/* ... Existing Warnings and Dev Info ... */}
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
                            <PanduanLangkah number={6} title="Referensi Lengkap Laporan & Cetak">
                                <p>Halaman <strong className="font-semibold text-teal-700">Laporan & Cetak</strong> menyediakan berbagai dokumen otomatis yang siap pakai. Berikut adalah panduan penggunaan untuk setiap jenis laporan:</p>
                                
                                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <h4 className="font-bold text-gray-800 text-sm mb-2 uppercase tracking-wide">Alur Kerja Umum</h4>
                                    <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
                                        <li>Pilih jenis laporan yang diinginkan.</li>
                                        <li>Gunakan filter (Jenjang/Kelas/Rombel) untuk menentukan data siapa yang akan dicetak.</li>
                                        <li>Sesuaikan opsi tambahan (Kertas, Margin, dll) jika tersedia.</li>
                                        <li>Klik tombol <span className="font-semibold bg-teal-600 text-white px-2 py-0.5 rounded text-xs">Tampilkan Pratinjau</span>.</li>
                                        <li>Pilih <strong>Cetak</strong> (ke Printer) atau <strong>Unduh PDF</strong> untuk menyimpan dokumen.</li>
                                    </ol>
                                </div>

                                <div className="space-y-6 mt-6">
                                    {/* Kategori Administrasi */}
                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold text-blue-800 border-b border-blue-200 pb-1 mb-3">
                                            <i className="bi bi-file-earmark-person-fill"></i> Administrasi & Identitas
                                        </h4>
                                        <ul className="space-y-3 pl-2">
                                            <li>
                                                <strong className="text-gray-800 block text-sm">1. Biodata Santri</strong>
                                                <p className="text-sm text-gray-600">Mencetak profil lengkap santri termasuk data orang tua dan wali. Berguna untuk arsip fisik (hardcopy) di kantor.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">2. Kartu Tanda Santri</strong>
                                                <p className="text-sm text-gray-600">Mencetak kartu identitas. Anda dapat memilih 5 desain berbeda, mengatur ukuran kartu (cm), dan memilih data apa saja yang ditampilkan di kartu.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">3. Cetak Label Santri</strong>
                                                <p className="text-sm text-gray-600">Mencetak label stiker (nama, NIS, kelas) secara massal. Sangat berguna untuk ditempel di buku pelajaran, undangan wali santri, atau lemari asrama.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">4. Daftar Santri per Rombel</strong>
                                                <p className="text-sm text-gray-600">Tabel sederhana berisi daftar nama santri dalam satu kelas. Berguna untuk absensi manual, checklist kegiatan, atau data pegangan wali kelas.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">5. Laporan Kontak Wali Santri (Ekspor ke HP)</strong>
                                                <p className="text-sm text-gray-600">Fitur khusus untuk mengunduh daftar kontak wali santri (Nama dan Nomor HP) dalam format CSV yang kompatibel dengan Google Contacts. File ini bisa diimpor ke HP agar kontak tersimpan otomatis dengan nama yang rapi.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">6. Daftar Wali Kelas</strong>
                                                <p className="text-sm text-gray-600">Mencetak rekapitulasi nama wali kelas untuk setiap rombel di semua jenjang. Berguna untuk data administrasi tahunan.</p>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Kategori Akademik */}
                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold text-green-800 border-b border-green-200 pb-1 mb-3">
                                            <i className="bi bi-book-half"></i> Akademik & Kedisiplinan
                                        </h4>
                                        <ul className="space-y-3 pl-2">
                                            <li>
                                                <strong className="text-gray-800 block text-sm">7. Lembar Nilai</strong>
                                                <p className="text-sm text-gray-600">Mencetak formulir nilai kosong dengan nama santri yang sudah terisi. Diserahkan kepada guru mata pelajaran untuk pengisian nilai manual sebelum diinput ke komputer.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">8. Lembar Absensi</strong>
                                                <p className="text-sm text-gray-600">Format absensi bulanan (kalender tanggal 1-31). Dapat diatur menggunakan kalender Masehi atau Hijriah.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">9. Lembar Pembinaan</strong>
                                                <p className="text-sm text-gray-600">Laporan rekam jejak santri yang berisi daftar prestasi yang diraih dan pelanggaran yang pernah dilakukan.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">10. Laporan Mutasi</strong>
                                                <p className="text-sm text-gray-600">Rekapitulasi santri yang keluar, masuk, lulus, atau berhenti (hiatus) dalam rentang tanggal tertentu.</p>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Kategori Keuangan */}
                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold text-yellow-700 border-b border-yellow-200 pb-1 mb-3">
                                            <i className="bi bi-cash-stack"></i> Keuangan
                                        </h4>
                                        <ul className="space-y-3 pl-2">
                                            <li>
                                                <strong className="text-gray-800 block text-sm">11. Rekening Koran Santri</strong>
                                                <p className="text-sm text-gray-600">Laporan detail seluruh transaksi keuangan satu santri (tagihan, pembayaran, uang saku masuk/keluar). Transparansi penuh untuk wali santri.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">12. Laporan Arus Kas Umum</strong>
                                                <p className="text-sm text-gray-600">Laporan pertanggungjawaban bendahara yang berisi semua pemasukan dan pengeluaran pondok (buku kas umum) dalam periode tertentu.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">13. Laporan Ringkas Keuangan & Dashboard</strong>
                                                <p className="text-sm text-gray-600">Mencetak tampilan statistik yang ada di dashboard utama dan dashboard keuangan untuk laporan kepada pimpinan pondok.</p>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Kategori Lainnya */}
                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold text-purple-800 border-b border-purple-200 pb-1 mb-3">
                                            <i className="bi bi-building"></i> Asrama & Perizinan
                                        </h4>
                                        <ul className="space-y-3 pl-2">
                                            <li>
                                                <strong className="text-gray-800 block text-sm">14. Formulir Izin Santri</strong>
                                                <p className="text-sm text-gray-600">Surat jalan resmi untuk santri yang izin pulang/keluar. Berisi data penjemput, tujuan, dan tanggal kembali.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">15. Laporan Keasramaan</strong>
                                                <p className="text-sm text-gray-600">Rekapitulasi data gedung, kamar, kapasitas, nama musyrif, dan daftar penghuni setiap kamar.</p>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
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
                                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                                    <h5 className="font-bold text-purple-800 text-sm mb-1"><i className="bi bi-stars"></i> Magic Draft (AI)</h5>
                                    <p className="text-sm text-purple-900">
                                        Anda dapat meminta bantuan AI untuk menyusun kata-kata surat. Klik tombol <strong>"Magic Draft"</strong> saat membuat template.
                                    </p>
                                    <p className="text-xs text-purple-800 mt-2">
                                        <strong>Catatan Transparansi:</strong> Fitur kecerdasan buatan ini ditenagai oleh <strong>Pollinations.ai</strong> (Layanan AI Open Source).
                                        Harap bijak dalam penggunaan data; jangan mengirimkan informasi pribadi sensitif (seperti Nama Lengkap asli santri atau NIK) ke dalam kolom instruksi AI. Gunakan <em>placeholder</em> sebagai gantinya.
                                    </p>
                                </div>
                            </PanduanLangkah>
                            
                            <PanduanLangkah number={9} title="Sinkronisasi Data Antar Perangkat (Cloud Sync)">
                                <p>Fitur <strong className="font-semibold text-teal-700">Sinkronisasi Cloud</strong> memungkinkan Anda menyimpan data di penyimpanan awan (Dropbox/Nextcloud) untuk backup.</p>
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md my-2 text-sm">
                                    <strong className="text-blue-800">Catatan tentang Kuota:</strong>
                                    <p className="mt-1 text-gray-700">Aplikasi ini menumpang pada penyimpanan pribadi Anda. Pastikan akun cloud Anda memiliki ruang kosong yang cukup.
                                    <ul className="list-disc pl-5 mt-1">
                                        <li><strong>Dropbox:</strong> Gratis 2GB.</li>
                                        <li><strong>WebDAV/Nextcloud:</strong> Tergantung penyedia hosting Anda.</li>
                                    </ul>
                                    </p>
                                </div>
                                <ul className="list-disc pl-5 space-y-2 mt-2">
                                    <li>Pilih penyedia di menu <strong>Pengaturan</strong> dan masukkan kredensial.</li>
                                    <li>Gunakan tombol <strong>"Upload ke Cloud"</strong> untuk backup dan <strong>"Download dari Cloud"</strong> untuk restore.</li>
                                </ul>
                            </PanduanLangkah>

                            <PanduanLangkah number={10} title="Konfigurasi Database Cloud (Supabase)">
                                <p>Supabase adalah layanan backend open-source yang digunakan untuk fitur <strong>Multi-Admin</strong> dan <strong>Audit Log Realtime</strong>. Layanan ini menawarkan opsi gratis (Freemium) dan berbayar.</p>
                                
                                <div className="my-4 p-4 border rounded-lg bg-gray-50">
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><i className="bi bi-info-circle-fill text-teal-600"></i> Informasi Penting: Skema Harga & Hosting</h4>
                                    <div className="space-y-4 text-sm text-gray-700">
                                        <div>
                                            <strong className="block text-teal-700 mb-1">1. Free Tier (Gratis Terbatas)</strong>
                                            <p>Cocok untuk percobaan atau proyek skala kecil. Batasan utamanya adalah proyek akan <strong>di-pause (jeda otomatis)</strong> jika tidak ada aktivitas selama 1 minggu. Anda harus mengaktifkannya kembali secara manual di dashboard Supabase. Database dibatasi hingga 500MB.</p>
                                        </div>
                                        <div>
                                            <strong className="block text-blue-700 mb-1">2. Pro Tier (Berbayar)</strong>
                                            <p>Disarankan untuk penggunaan produksi (sehari-hari). Tidak ada jeda proyek, backup otomatis lebih lama, dan batas database lebih besar (mulai dari $25/bulan).</p>
                                        </div>
                                        <div>
                                            <strong className="block text-gray-800 mb-1">3. Self-Hosted (Mandiri)</strong>
                                            <p>Supabase adalah software open-source. Anda bisa menginstalnya di server sendiri (VPS) menggunakan Docker. Gratis lisensi softwarenya, tapi Anda harus membayar biaya sewa server dan mengelolanya sendiri (teknis tingkat lanjut).</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm mt-2 font-medium">Langkah Setup di Supabase Dashboard:</p>
                                <ol className="list-decimal pl-5 space-y-2 mt-1 text-sm">
                                    <li>Buat Project Baru di <a href="https://supabase.com" target="_blank" className="text-teal-600 underline">Supabase.com</a>.</li>
                                    <li>Masuk ke <strong>SQL Editor</strong> dan jalankan kode di bawah ini untuk membuat tabel log aktivitas:</li>
                                </ol>
                                <div className="mt-3 bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono border border-gray-700 shadow-inner">
                                    <pre><code>{sqlCode}</code></pre>
                                </div>
                                <p className="text-sm mt-3">
                                    Setelah selesai, salin <strong>Project URL</strong> dan <strong>Anon Key</strong> ke menu <strong>Pengaturan</strong>. Jangan lupa isi kolom <strong>ID Admin / Username</strong> agar aktivitas Anda tercatat dengan nama yang jelas.
                                </p>
                            </PanduanLangkah>

                            <PanduanLangkah number={11} title="Informasi Pengembang & Database Mandiri" isLast={true}>
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
                    )}

                    {activeTab === 'lisensi' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900">
                                <h3 className="font-bold text-lg mb-2">Ringkasan Sederhana (Bahasa Indonesia)</h3>
                                <p className="mb-2">Aplikasi eSantri Web dirilis di bawah lisensi <strong>GNU General Public License v3.0 (GPLv3)</strong>.</p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li>✅ <strong>Bebas Digunakan:</strong> Anda boleh menggunakan aplikasi ini untuk tujuan pribadi, komersial, atau pendidikan tanpa biaya lisensi.</li>
                                    <li>✅ <strong>Bebas Dimodifikasi:</strong> Anda boleh mengubah kode sumber sesuai kebutuhan Anda.</li>
                                    <li>✅ <strong>Bebas Didistribusikan:</strong> Anda boleh menyalin dan membagikan aplikasi ini kepada orang lain.</li>
                                    <li>🔄 <strong>Copyleft:</strong> Jika Anda memodifikasi dan mendistribusikan aplikasi ini, Anda <strong>wajib</strong> menyertakan kode sumbernya dan merilisnya di bawah lisensi yang sama (GPLv3).</li>
                                    <li>⚠️ <strong>Tanpa Garansi:</strong> Aplikasi ini disediakan "apa adanya" (as is) tanpa jaminan apapun. Risiko penggunaan sepenuhnya ada pada pengguna.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-800 mb-2">Naskah Lengkap (Bahasa Inggris)</h3>
                                <div className="h-96 overflow-y-auto p-4 bg-gray-100 border border-gray-300 rounded text-xs font-mono whitespace-pre-wrap">
                                    {GPL_TEXT}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'kontak' && (
                        <div className="max-w-2xl mx-auto">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Hubungi Pengembang</h3>
                            <p className="text-gray-600 mb-6 text-center">
                                Punya pertanyaan, saran fitur, atau ingin melaporkan bug? Silakan kirim pesan kepada kami.
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Anda</label>
                                    <input 
                                        type="text" 
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Nama Lengkap"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subjek</label>
                                    <input 
                                        type="text" 
                                        value={contactSubject}
                                        onChange={(e) => setContactSubject(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Topik pesan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
                                    <textarea 
                                        rows={5}
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Tulis pesan Anda di sini..."
                                    ></textarea>
                                </div>
                                <div className="text-center pt-2">
                                    <a 
                                        href={mailtoLink}
                                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors font-medium ${(!contactName || !contactSubject || !contactMessage) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                    >
                                        <i className="bi bi-send-fill"></i>
                                        Kirim Email
                                    </a>
                                    <p className="text-xs text-gray-500 mt-2">Akan membuka aplikasi email default Anda.</p>
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
