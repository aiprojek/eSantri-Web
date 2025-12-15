
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
                                  <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06395,0.06031 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.807226,3.136742 0,1.449522 -1.080984,2.352339 -2.83266,2.365783 -1.692966,0.013 -2.898289,-0.700527 -3.613504,-2.139108 -0.233721,-0.470103 -0.448882,-0.914285 -0.478136,-0.987069 -0.116891,-0.290814 -0.200722,0.06466 -0.343292,1.455679 -0.08206,0.800623 -0.183673,1.704103 -0.225804,2.007735 -0.07177,0.517174 -0.05031,0.565658 0.339658,0.767317 0.228951,0.118395 0.934732,0.331191 1.568401,0.472882 1.371797,0.306736 3.501849,0.270382 4.658993,-0.07952 z m -25.45487,-1.364466 c 0.93301,-0.457248 1.87821,-0.760644 2.72644,-0.875142 l 0.62858,-0.08485 v -1.37202 -1.372019 l -0.76092,-0.150409 c -1.1567,-0.228639 -1.61383,-0.386514 -2.49361,-0.86118 l -0.80636,-0.435051 -1.0876,0.707478 c -1.7125205,1.113979 -4.4737803,2.082778 -5.0529103,1.772836 -0.37206,-0.199121 -0.71946,0.108306 -0.58853,0.520817 0.115,0.362332 0.72882,0.388328 0.82127,0.03479 0.0568,-0.217219 0.26544,-0.254305 1.8612198,-0.330836 0.98848,-0.04741 2.1954505,-0.08619 2.6821505,-0.08619 0.72383,0 0.92956,-0.04935 1.13024,-0.27109 0.5934,-0.655698 1.68599,0.120869 1.20432,0.855981 -0.30385,0.46374 -0.71833,0.514445 -1.0984,0.134374 -0.32073,-0.320731 -0.33497,-0.322227 -2.9960205,-0.314975 l -2.6737598,0.0073 0.9462,0.248046 c 1.3576098,0.355898 2.7727603,0.97431 3.7575203,1.642008 0.46988,0.318591 0.89288,0.586114 0.94,0.594493 0.0471,0.0084 0.43419,-0.155572 0.86017,-0.364335 z m 4.68467,-0.249019 c 0.003,-0.05459 0.0184,-1.022283 0.0331,-2.150434 l 0.0268,-2.051184 h -0.33083 -0.33084 l -0.0368,1.979203 c -0.0202,1.08856 -0.007,2.056256 0.0289,2.150434 0.0691,0.180159 0.59882,0.242698 0.60965,0.07198 z m 3.65835,-0.574409 c 3.0847,-0.784059 4.3689,-1.36122 14.597498,-6.560614 4.28789,-2.179617 6.635935,-3.051997 10.086804,-3.7476 3.636686,-0.733057 7.837085,-0.596342 10.867503,0.353716 0.570889,0.178977 1.064204,0.299191 1.096252,0.267139 0.130911,-0.130911 -2.904302,-1.024182 -4.383914,-1.290194 -1.996054,-0.358861 -5.21532,-0.480661 -7.088973,-0.268211 -4.215428,0.477982 -7.569808,1.515628 -13.092024,4.0499 -3.489827,1.60156 -6.879436,2.837056 -9.395746,3.424707 -1.69284,0.39534 -3.96393,0.739453 -4.88027,0.739453 h -0.67778 v 1.791074 1.791073 l 0.69476,-0.08699 c 0.38212,-0.04784 1.36127,-0.256397 2.17589,-0.463455 z m -0.10861,-4.029945 c 4.34182,-0.630466 7.276739,-1.83952 9.019947,-3.715798 0.769184,-0.827904 1.110178,-1.396927 1.372676,-2.29062 0.620767,-2.113468 -0.266098,-4.009021 -2.237069,-4.781421 -0.663099,-0.25986 -1.034005,-0.311072 -2.249684,-0.310618 -2.56763,9.39e-4 -4.16567,0.70118 -6.15355,2.696349 -1.32346,1.328311 -2.06801,2.436512 -2.69958,4.018119 -0.3897,0.975922 -0.74112,2.585487 -0.74112,3.394509 0,0.426759 0.0504,0.516006 0.33138,0.586519 0.18225,0.04574 0.40501,0.201076 0.495,0.345183 0.20571,0.329396 0.89555,0.343323 2.862,0.05778 z m 0.129247,-1.595953 c -0.121405,-0.121408 0.176599,-1.71185 0.554135,-2.957448 0.9833,-3.244156 3.16314,-5.500556 5.313908,-5.500556 1.62825,0 2.328557,1.243349 1.766437,3.136215 -0.451769,1.521269 -1.976179,2.916498 -4.488239,4.107883 -1.600745,0.759182 -3.044088,1.316063 -3.146241,1.213906 z m 16.193314,-4.00525 1.466951,-0.631823 -0.482912,-0.651947 c -0.265596,-0.358572 -0.562338,-0.948922 -0.659417,-1.311892 -0.161717,-0.604651 -0.147142,-0.718554 0.17397,-1.359502 0.856947,-1.710476 3.457222,-1.819555 5.06433,-0.212446 0.386295,0.386292 0.744677,0.87099 0.79641,1.077111 0.115791,0.461354 0.321976,0.485485 0.419264,0.04907 0.07118,-0.319288 0.511916,-3.32127 0.511916,-3.486797 0,-0.159425 -1.890167,-0.667608 -2.848242,-0.765765 -1.631386,-0.08456 -2.213971,-0.183458 -3.573718,0.164339 -1.768583,0.460657 -3.107329,1.499143 -3.730775,2.894023 -0.582587,1.30345 -0.390883,3.285673 0.451251,4.665983 0.244669,0.401032 0.332862,0.44906 0.614833,0.334826 0.181053,-0.07335 0.989313,-0.417681 1.796139,-0.765182 z" fill="white" />
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
                                        </ul>
                                    </div>

                                    {/* Kategori Akademik */}
                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold text-green-800 border-b border-green-200 pb-1 mb-3">
                                            <i className="bi bi-book-half"></i> Akademik & Kedisiplinan
                                        </h4>
                                        <ul className="space-y-3 pl-2">
                                            <li>
                                                <strong className="text-gray-800 block text-sm">6. Lembar Nilai</strong>
                                                <p className="text-sm text-gray-600">Mencetak formulir nilai kosong dengan nama santri yang sudah terisi. Diserahkan kepada guru mata pelajaran untuk pengisian nilai manual sebelum diinput ke komputer.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">7. Lembar Absensi</strong>
                                                <p className="text-sm text-gray-600">Format absensi bulanan (kalender tanggal 1-31). Dapat diatur menggunakan kalender Masehi atau Hijriah.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">8. Lembar Pembinaan</strong>
                                                <p className="text-sm text-gray-600">Laporan rekam jejak santri yang berisi daftar prestasi yang diraih dan pelanggaran yang pernah dilakukan.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">9. Laporan Mutasi</strong>
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
                                                <strong className="text-gray-800 block text-sm">10. Rekening Koran Santri</strong>
                                                <p className="text-sm text-gray-600">Laporan detail seluruh transaksi keuangan satu santri (tagihan, pembayaran, uang saku masuk/keluar). Transparansi penuh untuk wali santri.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">11. Laporan Arus Kas Umum</strong>
                                                <p className="text-sm text-gray-600">Laporan pertanggungjawaban bendahara yang berisi semua pemasukan dan pengeluaran pondok (buku kas umum) dalam periode tertentu.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">12. Laporan Ringkas Keuangan & Dashboard</strong>
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
                                                <strong className="text-gray-800 block text-sm">13. Formulir Izin Santri</strong>
                                                <p className="text-sm text-gray-600">Surat jalan resmi untuk santri yang izin pulang/keluar. Berisi data penjemput, tujuan, dan tanggal kembali.</p>
                                            </li>
                                            <li>
                                                <strong className="text-gray-800 block text-sm">14. Laporan Keasramaan</strong>
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
                                <h3 className="font-bold text-gray-800 mb-2">Naskah Lisensi Resmi (English)</h3>
                                <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 h-96 overflow-y-auto font-mono text-xs text-gray-700 whitespace-pre-wrap">
                                    {GPL_TEXT}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'kontak' && (
                        <div className="mt-8">
                            {/* ... (Existing Contact Form) ... */}
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
