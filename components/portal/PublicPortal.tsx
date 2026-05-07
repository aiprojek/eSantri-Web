
import React, { useState, useEffect } from 'react';
import { PondokSettings, PortalAnnouncementPost, PsbConfig } from '../../types';
import { LoadingFallback } from '../common/LoadingFallback';
import { fetchPortalSettingsFromGas, PortalSantriSummary, submitPortalPsbToGas } from '../../services/portalGasService';

const fieldGroups = [
    {
        title: 'Identitas',
        fields: [
            { key: 'namaLengkap', label: 'Nama Lengkap (Sesuai Ijazah)' },
            { key: 'namaHijrah', label: 'Nama Panggilan' },
            { key: 'nisn', label: 'NISN' },
            { key: 'nik', label: 'NIK' },
            { key: 'jenisKelamin', label: 'Jenis Kelamin' },
            { key: 'tempatLahir', label: 'Tempat Lahir' },
            { key: 'tanggalLahir', label: 'Tanggal Lahir' },
            { key: 'kewarganegaraan', label: 'Kewarganegaraan' },
            { key: 'statusKeluarga', label: 'Status dalam Keluarga' },
            { key: 'anakKe', label: 'Anak Ke' },
            { key: 'jumlahSaudara', label: 'Jumlah Saudara' },
        ]
    },
    {
        title: 'Alamat & Kontak',
        fields: [
            { key: 'alamat', label: 'Jalan / Detail' },
            { key: 'desaKelurahan', label: 'Desa / Kelurahan' },
            { key: 'kecamatan', label: 'Kecamatan' },
            { key: 'kabupatenKota', label: 'Kabupaten / Kota' },
            { key: 'provinsi', label: 'Provinsi' },
            { key: 'kodePos', label: 'Kode Pos' },
        ]
    },
    {
        title: 'Data Ayah',
        fields: [
            { key: 'namaAyah', label: 'Nama Ayah' },
            { key: 'nikAyah', label: 'NIK Ayah' },
            { key: 'statusAyah', label: 'Status Ayah (Hidup/Meninggal)' },
            { key: 'pekerjaanAyah', label: 'Pekerjaan Ayah' },
            { key: 'pendidikanAyah', label: 'Pendidikan Ayah' },
            { key: 'penghasilanAyah', label: 'Penghasilan Ayah' },
            { key: 'teleponAyah', label: 'No. HP Ayah' },
        ]
    },
    {
        title: 'Data Ibu',
        fields: [
            { key: 'namaIbu', label: 'Nama Ibu' },
            { key: 'nikIbu', label: 'NIK Ibu' },
            { key: 'statusIbu', label: 'Status Ibu (Hidup/Meninggal)' },
            { key: 'pekerjaanIbu', label: 'Pekerjaan Ibu' },
            { key: 'pendidikanIbu', label: 'Pendidikan Ibu' },
            { key: 'penghasilanIbu', label: 'Penghasilan Ibu' },
            { key: 'teleponIbu', label: 'No. HP Ibu' },
        ]
    },
    {
        title: 'Data Wali & Sekolah',
        fields: [
            { key: 'namaWali', label: 'Nama Wali' },
            { key: 'nomorHpWali', label: 'No. HP / WhatsApp (Wali)' },
            { key: 'hubunganWali', label: 'Hubungan Wali' },
            { key: 'asalSekolah', label: 'Asal Sekolah' },
            { key: 'alamatSekolahAsal', label: 'Alamat Sekolah Asal' },
        ]
    },
];

export const PublicPortal: React.FC = () => {
    const [pathParts] = useState<string[]>(window.location.pathname.split('/').filter(p => p !== ''));
    const portalType = pathParts[0]; 
    const tenantId = pathParts[1];
    const templateId = pathParts[2]; 
    const [debugInfo, setDebugInfo] = useState<{ portalId: string; gasEndpoint: string }>({ portalId: '', gasEndpoint: '' });

    const [tenantSettings, setTenantSettings] = useState<PondokSettings | null>(null);
    const [santriSummary, setSantriSummary] = useState<PortalSantriSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nisInput, setNisInput] = useState('');
    const [dobInput, setDobInput] = useState('');
    const [loginNotice, setLoginNotice] = useState<string>('');
    const [loggedInSantri, setLoggedInSantri] = useState<PortalSantriSummary | null>(null);
    const [activeFeature, setActiveFeature] = useState<'keuangan' | 'akademik' | 'presensi' | 'tahfizh' | 'kesehatan' | 'perpus'>('keuangan');

    useEffect(() => {
        const fetchTenantData = async () => {
            if (!tenantId) {
                setError('Tenant ID tidak ditemukan.');
                setLoading(false);
                return;
            }
            try {
                const url = new URL(window.location.href);
                const gasEndpoint = url.searchParams.get('gas') || localStorage.getItem('esantri_portal_gas_url') || '';
                const gasApiKey = url.searchParams.get('token') || localStorage.getItem('esantri_portal_gas_token') || '';
                setDebugInfo({ portalId: tenantId, gasEndpoint });
                if (!gasEndpoint) {
                    throw new Error('Portal GAS URL belum disiapkan. Tambahkan parameter ?gas=... pada URL portal.');
                }
                const portalBundle = await fetchPortalSettingsFromGas(gasEndpoint, tenantId, gasApiKey);
                if (portalBundle.settings) {
                    setTenantSettings(portalBundle.settings);
                    setSantriSummary(portalBundle.santriSummary || []);
                } else {
                    setError('Data pesantren tidak ditemukan di Portal GAS.');
                }
            } catch (err) {
                console.error("Portal error:", err);
                setError((err as Error)?.message || 'Gagal memuat portal. Pastikan koneksi internet stabil.');
            } finally {
                setLoading(false);
            }
        };
        fetchTenantData();
    }, [tenantId]);

    if (loading) return <LoadingFallback />;
    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                    <div className="text-red-500 text-5xl mb-4"><i className="bi bi-exclamation-triangle-fill"></i></div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Terjadi Kesalahan</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left">
                        <p className="text-[11px] font-semibold text-slate-700 mb-2 uppercase tracking-wide">Info Debug Portal</p>
                        <p className="text-xs text-slate-600 break-all"><span className="font-semibold">Portal ID URL:</span> {debugInfo.portalId || '-'}</p>
                        <p className="text-xs text-slate-600 break-all mt-1"><span className="font-semibold">GAS Endpoint:</span> {debugInfo.gasEndpoint || '-'}</p>
                        <p className="text-[11px] text-slate-500 mt-2">
                            Pastikan <code>portalId</code> pada URL sama persis dengan kolom <code>portalId</code> di sheet <code>portals</code>.
                        </p>
                    </div>
                    <a href="/" className="inline-block bg-teal-600 text-white px-6 py-2 rounded-lg font-bold">Kembali ke Beranda</a>
                </div>
            </div>
        );
    }

    if (!tenantSettings) return null;
    const portalConfig = tenantSettings.portalConfig;
    const portalContacts = portalConfig?.contacts || [];
    const normalizeExternalUrl = (rawValue: string, iconHint?: string): string => {
        const v = (rawValue || '').trim();
        if (!v) return '#';
        const lower = v.toLowerCase();

        if (lower.startsWith('http://') || lower.startsWith('https://')) return v;
        if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return v;

        if (lower.startsWith('wa.me/') || lower.startsWith('api.whatsapp.com/') || lower.startsWith('t.me/') || lower.startsWith('telegram.me/')) {
            return `https://${v}`;
        }

        if (v.includes('@') && !v.includes(' ')) {
            return `mailto:${v}`;
        }

        const digits = v.replace(/\D/g, '');
        if (iconHint === 'bi-whatsapp' && digits.length >= 8) {
            let phone = digits;
            if (phone.startsWith('0')) phone = `62${phone.slice(1)}`;
            return `https://wa.me/${phone}`;
        }
        if (iconHint === 'bi-telephone' && digits.length >= 8) {
            return `tel:${digits}`;
        }

        return `https://${v}`;
    };
    const announcementPosts: PortalAnnouncementPost[] = (() => {
        const posts = (portalConfig?.announcementPosts || []).filter(post => post && post.isPublished && (post.title || post.content));
        if (posts.length > 0) return posts;
        if (portalConfig?.announcement?.trim()) {
            return [{
                id: 'legacy-announcement',
                title: 'Pengumuman',
                content: portalConfig.announcement.trim(),
                publishedAt: new Date().toISOString(),
                isPublished: true
            }];
        }
        return [];
    })();
    const jenjangMap = new Map((tenantSettings.jenjang || []).map((j) => [j.id, j.nama]));
    const kelasMap = new Map((tenantSettings.kelas || []).map((k) => [k.id, k.nama]));
    const featureItems = (portalConfig?.showFinance ? [{ key: 'keuangan', label: 'Keuangan', icon: 'bi-cash-stack' }] : [])
        .concat(portalConfig?.showAcademic ? [{ key: 'akademik', label: 'Akademik', icon: 'bi-mortarboard' }] : [])
        .concat(portalConfig?.showAttendance ? [{ key: 'presensi', label: 'Presensi', icon: 'bi-calendar-check' }] : [])
        .concat(portalConfig?.showTahfizh ? [{ key: 'tahfizh', label: 'Tahfizh', icon: 'bi-book' }] : [])
        .concat(portalConfig?.showHealth ? [{ key: 'kesehatan', label: 'Kesehatan', icon: 'bi-heart-pulse' }] : [])
        .concat(portalConfig?.showLibrary ? [{ key: 'perpus', label: 'Perpus', icon: 'bi-journal-bookmark' }] : []);

    if (portalType === 'psb') {
        return <PsbPublicForm settings={tenantSettings} templateId={templateId} tenantId={tenantId} />;
    }

    const handlePortalLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedNis = nisInput.replace(/\s+/g, '').toLowerCase();
        if (!normalizedNis || !dobInput.trim()) {
            setLoginNotice('Silakan isi NIS dan tanggal lahir terlebih dahulu.');
            return;
        }

        const matched = santriSummary.find((santri) => {
            const santriNis = (santri.nis || '').replace(/\s+/g, '').toLowerCase();
            const santriDob = (santri.tanggalLahir || '').slice(0, 10);
            return santriNis === normalizedNis && santriDob === dobInput;
        });

        if (!matched) {
            setLoggedInSantri(null);
            setLoginNotice('NIS atau tanggal lahir tidak sesuai. Silakan periksa kembali.');
            return;
        }

        setLoggedInSantri(matched);
        setActiveFeature('keuangan');
        setLoginNotice('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-100 flex items-center justify-center p-3 sm:p-6">
             <div className={`bg-white rounded-2xl shadow-2xl text-center w-full border border-teal-100 ${loggedInSantri ? 'max-w-5xl p-4 sm:p-6' : 'max-w-lg p-6 sm:p-8'}`}>
                {!loggedInSantri && (
                    <div className="flex flex-col items-center mb-4">
                        {tenantSettings.logoPonpesUrl ? (
                            <img src={tenantSettings.logoPonpesUrl} alt="Logo" className="w-16 h-16 rounded-full mb-3 shadow-sm border border-gray-100 object-contain bg-white p-1" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center text-white text-2xl font-bold mb-3">
                                {(tenantSettings.namaPonpes || 'E').charAt(0)}
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-teal-900 mb-1">{tenantSettings.namaPonpes}</h1>
                        <div className="text-amber-600 font-bold uppercase tracking-widest text-xs mb-2">Portal Wali Santri</div>
                        <p className="text-xs text-slate-500">{portalConfig?.welcomeMessage || 'Selamat Datang di Portal Wali Santri'}</p>
                    </div>
                )}
                {!loggedInSantri ? (
                    <>
                        <p className="text-gray-600 mb-6">Silakan login untuk mengakses data akademik, absensi, dan keuangan santri.</p>
                        <form onSubmit={handlePortalLogin} className="text-left mb-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">NIS / ID Santri</label>
                                <input
                                    type="text"
                                    value={nisInput}
                                    onChange={(e) => setNisInput(e.target.value)}
                                    placeholder="Contoh: 4625 3 0602"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Tanggal Lahir</label>
                                <input
                                    type="date"
                                    value={dobInput}
                                    onChange={(e) => setDobInput(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Gunakan tanggal lahir santri. Format default data: <strong>DD/MM/YYYY</strong> (contoh 31/12/2011).
                                </p>
                            </div>
                            <button type="submit" className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 transition-colors">
                                Masuk Portal
                            </button>
                            {loginNotice && (
                                <p className="text-xs text-center text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    {loginNotice}
                                </p>
                            )}
                        </form>
                        {portalContacts.length > 0 && (
                            <div className="mt-6 border-t pt-4">
                                <p className="text-[11px] text-center text-slate-500 mb-3">Butuh bantuan? Hubungi kami:</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {portalContacts.map((c) => (
                                        <a
                                            key={c.id}
                                            href={normalizeExternalUrl(c.value || '', c.icon)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold text-teal-700"
                                        >
                                            <i className={`bi ${c.icon}`}></i>
                                            <span>{c.label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="mb-2 text-left">
                        <div className="rounded-2xl bg-gradient-to-r from-teal-700 to-cyan-700 text-white p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-teal-100">Selamat datang</p>
                                    <p className="text-xl font-bold">{loggedInSantri.namaLengkap}</p>
                                    <p className="text-xs text-teal-100 mt-1">NIS: {loggedInSantri.nis} • Wali: {loggedInSantri.namaWali || '-'}</p>
                                </div>
                                <button
                                    type="button"
                                    className="text-xs font-semibold text-white/90 hover:text-white bg-white/10 rounded-lg px-3 py-1.5"
                                    onClick={() => {
                                        setLoggedInSantri(null);
                                        setNisInput('');
                                        setDobInput('');
                                        setLoginNotice('');
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                <p className="text-[11px] text-slate-500">Tunggakan Bulan Ini</p>
                                <p className="text-base font-bold text-slate-800">Rp {Number(loggedInSantri.tunggakanBulanIni || 0).toLocaleString('id-ID')}</p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                <p className="text-[11px] text-slate-500">Saldo Tabungan</p>
                                <p className="text-base font-bold text-slate-800">Rp {Number(loggedInSantri.saldoTabungan || 0).toLocaleString('id-ID')}</p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                <p className="text-[11px] text-slate-500">Status Presensi</p>
                                <p className="text-base font-bold text-slate-800">{loggedInSantri.attendanceToday || 'Belum Absen'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                <p className="text-[11px] text-slate-500">Pinjaman Buku</p>
                                <p className="text-base font-bold text-slate-800">{loggedInSantri.pinjamanBukuAktif || 0} buku</p>
                            </div>
                        </div>

                        {announcementPosts.length > 0 && (
                            <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4">
                                <h3 className="mb-2 text-xs font-bold text-teal-800">Pengumuman</h3>
                                <div className="space-y-2">
                                    {announcementPosts.slice(0, 2).map((post) => (
                                        <div key={post.id} className="rounded-md bg-white px-2 py-1.5 border border-teal-100">
                                            <p className="text-[11px] font-semibold text-slate-800">{post.title || 'Tanpa Judul'}</p>
                                            <p className="text-[11px] text-slate-600 whitespace-pre-wrap">{post.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex gap-2 overflow-x-auto">
                                {featureItems.map((item) => (
                                    <button
                                        key={item.label}
                                        type="button"
                                        onClick={() => setActiveFeature(item.key as typeof activeFeature)}
                                        className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                            activeFeature === item.key
                                                ? 'border-teal-200 bg-teal-600 text-white'
                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-teal-50'
                                        }`}
                                    >
                                        <i className={`bi ${item.icon} mr-1`}></i>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
                            {activeFeature === 'keuangan' && (
                                <>
                                    <p className="text-[11px] text-slate-500">Tunggakan Bulan Ini</p>
                                    <p className="text-base font-bold text-slate-800">Rp {Number(loggedInSantri.tunggakanBulanIni || 0).toLocaleString('id-ID')}</p>
                                </>
                            )}
                            {activeFeature === 'akademik' && (
                                <>
                                    <p className="text-[11px] text-slate-500">Informasi Akademik</p>
                                    <p className="text-sm font-bold text-slate-800">
                                        {jenjangMap.get(loggedInSantri.jenjangId) || '-'} • Kelas {kelasMap.get(loggedInSantri.kelasId) || '-'}
                                    </p>
                                </>
                            )}
                            {activeFeature === 'presensi' && (
                                <>
                                    <p className="text-[11px] text-slate-500">Status Absensi Hari Ini</p>
                                    <p className="text-base font-bold text-slate-800">{loggedInSantri.attendanceToday || 'Belum Absen'}</p>
                                </>
                            )}
                            {activeFeature === 'tahfizh' && (
                                <>
                                    <p className="text-[11px] text-slate-500">Setoran Tahfizh Terakhir</p>
                                    <p className="text-sm font-bold text-slate-800">
                                        {loggedInSantri.tahfizhTerakhir
                                            ? `${loggedInSantri.tahfizhTerakhir.surah} (${loggedInSantri.tahfizhTerakhir.ayat})`
                                            : 'Belum ada data'}
                                    </p>
                                </>
                            )}
                            {activeFeature === 'kesehatan' && (
                                <>
                                    <p className="text-[11px] text-slate-500">Catatan Kesehatan Terakhir</p>
                                    <p className="text-sm font-bold text-slate-800">
                                        {loggedInSantri.kesehatanTerakhir
                                            ? `${loggedInSantri.kesehatanTerakhir.status}${loggedInSantri.kesehatanTerakhir.diagnosa ? ` - ${loggedInSantri.kesehatanTerakhir.diagnosa}` : ''}`
                                            : 'Belum ada data'}
                                    </p>
                                </>
                            )}
                            {activeFeature === 'perpus' && (
                                <>
                                    <p className="text-[11px] text-slate-500">Pinjaman Buku Aktif</p>
                                    <p className="text-base font-bold text-slate-800">{loggedInSantri.pinjamanBukuAktif || 0} buku</p>
                                </>
                            )}
                        </div>
                        {(portalConfig?.customLinks || []).length > 0 && (
                            <div className="mt-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                                <h3 className="mb-2 text-xs font-bold text-slate-700">Link Penting</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {(portalConfig?.customLinks || []).map((l, i) => (
                                        <a
                                            key={i}
                                            href={normalizeExternalUrl(l.url || '')}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-[11px] text-slate-700"
                                        >
                                            <span>{l.label || 'Link Kustom'}</span>
                                            <i className="bi bi-chevron-right text-[10px] text-slate-400"></i>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        {portalContacts.length > 0 && (
                            <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50 p-3">
                                <p className="text-[11px] text-slate-500 mb-2">Bantuan:</p>
                                <div className="flex flex-wrap gap-2">
                                    {portalContacts.map((c) => (
                                        <a
                                            key={c.id}
                                            href={normalizeExternalUrl(c.value || '', c.icon)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-white px-2 py-1 text-[10px] font-semibold text-teal-700"
                                        >
                                            <i className={`bi ${c.icon}`}></i>
                                            <span>{c.label}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        </div>
                )}
                <div className="mt-6 border-t border-slate-100 pt-3 text-center text-[11px] text-slate-500">
                    dibuat dengan eSantri Web by{' '}
                    <a
                        href="https://aiprojek01.my.id"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-teal-700 hover:text-teal-800 underline"
                    >
                        AI Projek
                    </a>
                </div>
             </div>
        </div>
    );
};

const PsbPublicForm: React.FC<{ settings: PondokSettings, templateId?: string, tenantId: string }> = ({ settings, templateId, tenantId }) => {
    const config = settings.psbConfig;
    let activeConfig: PsbConfig = config;
    if (templateId && config.templates) {
        const tpl = config.templates.find(t => t.id === templateId);
        if (tpl) activeConfig = { ...config, ...tpl };
    }
    
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-4 sm:py-10 px-0 sm:px-4">
            <div className="w-full max-w-4xl bg-white shadow-2xl rounded-none sm:rounded-2xl overflow-hidden min-h-[90vh] flex flex-col relative border border-gray-200">
                <div className="bg-teal-900 text-white p-4 flex justify-between items-center no-print">
                    <div className="flex items-center gap-3">
                        <img 
                            src={settings.logoPonpesUrl || `https://picsum.photos/seed/${settings.namaPonpes}/100/100`} 
                            className="w-10 h-10 rounded-full bg-white object-contain p-1 border border-teal-700"
                            alt="Logo"
                            referrerPolicy="no-referrer"
                        />
                        <div>
                            <div className="font-bold text-sm leading-tight">{settings.namaPonpes}</div>
                            <div className="text-[10px] text-teal-300">Sistem Pendaftaran Online (PSB)</div>
                        </div>
                    </div>
                </div>
                <div className="flex-grow">
                     <PsbFormViewer settings={settings} config={activeConfig} tenantId={tenantId} />
                </div>
                <div className="bg-gray-50 border-t p-3 text-center text-gray-400 text-[10px] no-print">
                    &copy; {new Date().getFullYear()} eSantri Web • Didukung oleh {settings.namaPonpes}
                </div>
            </div>
        </div>
    );
};

const PsbFormViewer: React.FC<{ settings: PondokSettings, config: PsbConfig, tenantId: string }> = ({ settings, config, tenantId }) => {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [fields, setFields] = useState<Record<string, any>>({});
    
    const handleInputChange = (name: string, value: any) => {
        setFields(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = new URL(window.location.href);
            const gasEndpoint = url.searchParams.get('gas') || localStorage.getItem('esantri_portal_gas_url') || '';
            const gasApiKey = url.searchParams.get('token') || localStorage.getItem('esantri_portal_gas_token') || '';
            if (!gasEndpoint) {
                throw new Error('Portal GAS URL belum tersedia.');
            }
            await submitPortalPsbToGas(gasEndpoint, tenantId, {
                ...fields,
                tahunAjaranAktif: config.tahunAjaranAktif,
                targetJenjangId: config.targetJenjangId,
                submissionSource: 'portal-psb'
            }, gasApiKey);
            setSubmitted(true);
        } catch (err) {
            console.error("Submission Error:", err);
            alert((err as Error)?.message || "Terjadi kesalahan saat menyimpan data. Pastikan koneksi internet aktif.");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="p-10 text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="bi bi-check-lg text-5xl"></i>
                </div>
                <h2 className="text-2xl font-bold mb-2">Pendaftaran Berhasil!</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">Data Anda telah kami terima di database cloud. Silakan simpan halaman ini sebagai bukti pendaftaran.</p>
                <div className="bg-gray-50 border p-4 rounded-lg text-left max-w-sm mx-auto mb-8">
                     <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">ID Pendaftaran</div>
                     <div className="font-mono text-lg">{Date.now()}</div>
                </div>
                <button onClick={() => window.location.reload()} className="bg-teal-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-teal-700 transition-colors">Daftar Santri Lain</button>
            </div>
        );
    }

    return (
        <div className="h-full relative overflow-y-auto no-print custom-scrollbar">
            <form onSubmit={handleSubmit} className="p-6 md:p-10 max-w-3xl mx-auto space-y-10">
                <header className="text-center mb-10 border-b pb-6">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-teal-900 mb-2 uppercase tracking-wide">{config.tahunAjaranAktif ? `Pendaftaran Santri Baru` : 'Formulir Pendaftaran'}</h1>
                    <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full mb-4"></div>
                    <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Tahun Ajaran {config.tahunAjaranAktif || new Date().getFullYear()}</p>
                </header>
                <div className="space-y-12">
                     <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl">
                         <label className="block text-xs font-bold text-teal-600 uppercase mb-2 tracking-widest">Jenjang Pendidikan Tujuan</label>
                         <div className="font-bold text-xl text-teal-900 flex items-center gap-2">
                             <i className="bi bi-mortarboard-fill"></i>
                             {settings.jenjang.find(j => j.id === config.targetJenjangId)?.nama || 'Semua Jenjang'}
                         </div>
                     </div>
                     {fieldGroups.map((group, gIdx) => {
                         const groupFields = group.fields.filter(f => config.activeFields.includes(f.key));
                         if (groupFields.length === 0) return null;
                         return (
                             <section key={gIdx} className="space-y-6">
                                 <h3 className="font-bold text-lg text-gray-800 border-l-4 border-amber-500 pl-3 flex items-center justify-between">
                                     {group.title}
                                     <span className="h-px bg-gray-200 flex-1 ml-4"></span>
                                 </h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                     {groupFields.map(f => {
                                         const isRequired = (config.requiredStandardFields || []).includes(f.key);
                                         return (
                                             <div key={f.key} className={`space-y-1.5 ${f.key === 'namaLengkap' || f.key === 'alamat' ? 'md:col-span-2' : ''}`}>
                                                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{f.label} {isRequired && <span className="text-red-500">*</span>}</label>
                                                 {f.key === 'jenisKelamin' ? (
                                                     <div className="flex gap-4 p-1">
                                                         <label className="flex items-center gap-2 cursor-pointer bg-white border px-4 py-2.5 rounded-lg flex-1 text-sm has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 transition-all">
                                                             <input required={isRequired} type="radio" name={f.key} value="Laki-laki" onChange={e => handleInputChange(f.key, e.target.value)} /> Laki-laki
                                                         </label>
                                                         <label className="flex items-center gap-2 cursor-pointer bg-white border px-4 py-2.5 rounded-lg flex-1 text-sm has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 transition-all">
                                                             <input required={isRequired} type="radio" name={f.key} value="Perempuan" onChange={e => handleInputChange(f.key, e.target.value)} /> Perempuan
                                                         </label>
                                                     </div>
                                                 ) : f.key.toLowerCase().includes('tanggal') ? (
                                                     <input required={isRequired} type="date" className="w-full border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none border transition" onChange={e => handleInputChange(f.key, e.target.value)} />
                                                 ) : (
                                                     <input required={isRequired} type="text" className="w-full border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none border transition" placeholder={f.label} onChange={e => handleInputChange(f.key, e.target.value)} />
                                                 )}
                                             </div>
                                         );
                                     })}
                                 </div>
                             </section>
                         );
                     })}
                     {(config.customFields?.length ?? 0) > 0 && (
                        <section className="space-y-6 pt-6 border-t">
                            <h3 className="font-bold text-lg text-gray-800 border-l-4 border-teal-600 pl-3">Informasi Tambahan & Berkas</h3>
                            <div className="grid grid-cols-1 gap-6">
                                {config.customFields?.map(field => (
                                    <div key={field.id} className="space-y-2">
                                        {field.type === 'section' ? (
                                            <h4 className="font-bold text-teal-700 bg-teal-50 p-3 rounded-lg border-l-4 border-teal-500 uppercase tracking-widest text-xs">{field.label}</h4>
                                        ) : field.type === 'statement' ? (
                                            <div className="text-sm text-gray-600 leading-relaxed bg-amber-50 p-4 rounded-xl border border-amber-100">{field.label}</div>
                                        ) : (
                                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{field.label} {field.required && <span className="text-red-500 font-black">*</span>}</label>
                                                {field.type === 'paragraph' ? (
                                                    <textarea required={field.required} rows={3} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none" onChange={e => handleInputChange(`custom_${field.id}`, e.target.value)} />
                                                ) : field.type === 'file' ? (
                                                    <div className="relative group">
                                                        <input required={field.required} type="file" accept="image/*,application/pdf" className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 transition-all cursor-pointer" onChange={e => handleInputChange(`custom_${field.id}`, e.target.files?.[0])} />
                                                        <p className="text-[10px] text-gray-400 mt-2 ml-2"><i className="bi bi-info-circle"></i> Format: PDF, JPG, Deskripsi: Makasimal 5MB.</p>
                                                    </div>
                                                ) : field.type === 'radio' ? (
                                                    <div className="flex flex-wrap gap-3">
                                                        {field.options?.map(opt => (
                                                            <label key={opt} className="flex items-center gap-2 cursor-pointer border px-4 py-2.5 rounded-xl hover:bg-gray-50 has-[:checked]:bg-teal-50 has-[:checked]:border-teal-500 transition-all text-sm">
                                                                <input type="radio" name={`custom_${field.id}`} value={opt} required={field.required} onChange={e => handleInputChange(`custom_${field.id}`, e.target.value)} />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <input type="text" required={field.required} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none" onChange={e => handleInputChange(`custom_${field.id}`, e.target.value)} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
                <div className="pt-10 border-t mt-12">
                    <button 
                        disabled={submitting}
                        type="submit" 
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-black py-5 rounded-2xl shadow-[0_6px_0_0_#0d9488] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 text-xl"
                    >
                        {submitting ? (
                            <>
                                <i className="bi bi-arrow-repeat animate-spin text-2xl"></i>
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-journal-check text-2xl"></i> KIRIM FORMULIR PENDAFTARAN
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-center text-gray-400 mt-6 max-w-sm mx-auto uppercase tracking-tighter">
                        Data aman terenkripsi &bullet; Langsung terkirim ke sistem {settings.namaPonpes}
                    </p>
                    <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
                        <div>Tahun Ajaran {config.tahunAjaranAktif || new Date().getFullYear()}</div>
                        <div className="mt-1">dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id</div>
                    </div>
                </div>
            </form>
        </div>
    );
};
