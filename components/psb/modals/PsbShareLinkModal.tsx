import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { PondokSettings, PsbConfig } from '../../../types';
import { encodePortalKey, syncPortalBridgeToGas } from '../../../services/portalGasService';

interface PsbShareLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: PondokSettings;
    config: PsbConfig;
    onOpenGasConfig?: () => void;
}

export const PsbShareLinkModal: React.FC<PsbShareLinkModalProps> = ({
    isOpen,
    onClose,
    settings,
    config,
    onOpenGasConfig
}) => {
    const [selectedTab, setSelectedTab] = useState<'all' | 'jenjang'>('all');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [qrModalData, setQrModalData] = useState<{ title: string; url: string; qrDataUrl: string } | null>(null);
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [jenjangFilter, setJenjangFilter] = useState<'all' | 'configured'>('all');

    if (!isOpen) return null;

    // Menentukan URL GAS utama (bisa dari PSB config atau dari portal config)
    const activeGasUrl = config.googleScriptUrl?.trim() || settings.portalConfig?.gasEndpoint?.trim() || '';
    const portalId = settings.portalConfig?.portalId || 'psb-online';
    const apiKey = settings.portalConfig?.gasApiKey || '';

    // Buat encrypted key (?k=ep2_...) sama seperti di Portal Wali Santri
    const encryptedKey = activeGasUrl ? encodePortalKey(activeGasUrl, portalId, apiKey) : '';

    // Base origin URL
    const originUrl = (settings.portalConfig?.baseUrl?.trim() || window.location.origin).replace(/\/+$/, '');

    // Tautan Utama PSB (Semua Jenjang / Calon Santri Memilih Jenjang di Formulir)
    const mainPsbUrl = encryptedKey
        ? `${originUrl}/?psb=true&k=${encodeURIComponent(encryptedKey)}`
        : `${originUrl}/?psb=true`;

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(id);
        setTimeout(() => setCopiedKey(null), 2500);
    };

    const handleOpenLink = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleSyncToGas = async () => {
        if (!activeGasUrl) {
            if (onOpenGasConfig) {
                onClose();
                onOpenGasConfig();
            }
            return;
        }
        setIsSyncing(true);
        setSyncStatus(null);
        try {
            await syncPortalBridgeToGas(settings);
            setSyncStatus({
                type: 'success',
                message: 'Desain formulir & data jenjang berhasil disinkronkan ke Cloud GAS! Pendaftar di luar sekarang akan melihat formulir terkini Anda.'
            });
            setTimeout(() => setSyncStatus(null), 6000);
        } catch (e: any) {
            console.error('Gagal sinkronisasi:', e);
            setSyncStatus({
                type: 'error',
                message: `Gagal sinkronisasi ke GAS: ${e?.message || 'Periksa koneksi internet dan izin URL Script'}`
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleOpenQr = async (title: string, url: string) => {
        setIsGeneratingQr(true);
        try {
            const dataUrl = await QRCode.toDataURL(url, {
                width: 320,
                margin: 2,
                color: {
                    dark: '#0f766e',
                    light: '#ffffff'
                }
            });
            setQrModalData({ title, url, qrDataUrl: dataUrl });
        } catch (e) {
            console.error('Gagal generate QR Code:', e);
        } finally {
            setIsGeneratingQr(false);
        }
    };

    const handleDownloadQr = () => {
        if (!qrModalData) return;
        const link = document.createElement('a');
        link.download = `QR-PSB-${qrModalData.title.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = qrModalData.qrDataUrl;
        link.click();
    };

    const handleShareWa = (title: string, url: string, jenjangNama?: string) => {
        const ponpesName = settings.namaPonpes || 'Pondok Pesantren';
        const tahun = config.tahunAjaranAktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
        const adminHp = config.nomorHpAdmin || '';

        const text = `*PENERIMAAN SANTRI BARU (PSB) ONLINE*\n` +
            `*${ponpesName.toUpperCase()}*\n` +
            `Tahun Ajaran ${tahun}\n\n` +
            `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
            `Pendaftaran Santri Baru ${jenjangNama ? `khusus jenjang *${jenjangNama}*` : 'untuk seluruh jenjang'} telah resmi dibuka.\n\n` +
            `Silakan isi formulir pendaftaran online langsung melalui tautan resmi berikut:\n` +
            `👉 ${url}\n\n` +
            (adminHp ? `Informasi & Layanan Panitia PSB:\n📱 WhatsApp: ${adminHp}\n\n` : '') +
            `Wassalamu'alaikum Warahmatullahi Wabarakatuh.`;

        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
    };

    const jenjangList = settings.jenjang || [];

    // Klasifikasikan jenjang mana yang sudah memiliki desain khusus aktif
    const jenjangWithDesign = jenjangList.map((j) => {
        const template = config.templates?.find(t => t.targetJenjangId === j.id);
        const isMainTarget = config.targetJenjangId === j.id;
        const hasCustomDesign = Boolean(template || isMainTarget);
        const designTitle = template?.name || (isMainTarget ? 'Formulir Utama' : null);
        return {
            ...j,
            hasCustomDesign,
            designTitle,
            template
        };
    });

    const configuredCount = jenjangWithDesign.filter(j => j.hasCustomDesign).length;
    const displayedJenjangList = jenjangFilter === 'configured'
        ? jenjangWithDesign.filter(j => j.hasCustomDesign)
        : jenjangWithDesign;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl text-teal-300 shrink-0">
                            <i className="bi bi-link-45deg text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Tautan Langsung Pendaftaran Santri Baru (PSB)</h3>
                            <p className="text-xs text-teal-200">1 GAS untuk Semua Jenjang • Tautan Terenkripsi, WhatsApp &amp; QR Code</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors"
                        title="Tutup Modal"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-4 text-xs text-gray-700 flex-grow">
                    {/* Status Koneksi GAS & Tombol Sinkronisasi Cloud */}
                    <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        activeGasUrl
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                            : 'bg-amber-50/70 border-amber-200 text-amber-950'
                    }`}>
                        <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${
                                activeGasUrl ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                            }`}>
                                <i className={`bi ${activeGasUrl ? 'bi-cloud-check-fill' : 'bi-exclamation-triangle-fill'}`}></i>
                            </div>
                            <div>
                                <div className="font-bold text-xs flex items-center gap-1.5">
                                    <span>{activeGasUrl ? 'Koneksi Google Apps Script (GAS) Aktif' : 'Belum Ada URL Google Apps Script'}</span>
                                    {encryptedKey && (
                                        <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                            Terenkripsi ep2
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                                    {activeGasUrl
                                        ? 'Satu link Web App GAS otomatis menampung seluruh formulir pendaftaran dari berbagai jenjang pendidikan.'
                                        : 'Masukkan URL Deployment Web App di menu GAS agar data pendaftaran langsung masuk ke Google Sheets.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            {activeGasUrl && (
                                <button
                                    type="button"
                                    disabled={isSyncing}
                                    onClick={handleSyncToGas}
                                    className="flex-1 sm:flex-none whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                    title="Sinkronkan desain formulir dan data terbaru ke server GAS agar pendaftar luar tidak melihat data sampel"
                                >
                                    <i className={`bi ${isSyncing ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'}`}></i>
                                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke GAS'}</span>
                                </button>
                            )}

                            {onOpenGasConfig && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onOpenGasConfig();
                                    }}
                                    className="flex-1 sm:flex-none whitespace-nowrap bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold shadow-2xs cursor-pointer"
                                >
                                    <i className="bi bi-gear-fill mr-1 text-teal-600"></i> Pengaturan GAS
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifikasi Status Sinkronisasi */}
                    {syncStatus && (
                        <div className={`p-3 rounded-xl border text-xs font-medium animate-fade-in flex items-start gap-2 ${
                            syncStatus.type === 'success'
                                ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                                : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                            <i className={`bi ${syncStatus.type === 'success' ? 'bi-check-circle-fill text-emerald-600' : 'bi-exclamation-octagon-fill text-red-500'} text-base shrink-0 mt-0.5`}></i>
                            <div className="flex-1">{syncStatus.message}</div>
                        </div>
                    )}

                    {/* Navigasi Tab: Tautan Utama vs Tautan per Jenjang */}
                    <div className="flex border-b border-gray-200 text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setSelectedTab('all')}
                            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                                selectedTab === 'all'
                                    ? 'border-teal-600 text-teal-800'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="bi bi-globe2"></i>
                            <span>Tautan Utama (Semua Jenjang)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTab('jenjang')}
                            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                                selectedTab === 'jenjang'
                                    ? 'border-teal-600 text-teal-800'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <i className="bi bi-mortarboard-fill"></i>
                            <span>Tautan Khusus per Jenjang ({jenjangList.length})</span>
                            {configuredCount > 0 && (
                                <span className="ml-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                    {configuredCount} siap
                                </span>
                            )}
                        </button>
                    </div>

                    {/* TAB 1: TAUTAN UTAMA (SEMUA JENJANG) */}
                    {selectedTab === 'all' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                            <i className="bi bi-link-45deg text-teal-600 text-lg"></i>
                                            Tautan Pendaftaran Online Resmi (Otomatis Multi-Jenjang)
                                        </span>
                                        <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                            Calon Santri Bebas Memilih
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                        Bagikan tautan ini jika ingin calon wali/santri memilih jenjangnya sendiri (misal: MTs, MA, SMK).
                                    </p>
                                </div>

                                <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl text-[11px] text-teal-900 space-y-1">
                                    <div className="font-bold flex items-center gap-1">
                                        <i className="bi bi-magic text-teal-600"></i>
                                        <span>Formulir Berganti Otomatis Sesuai Jenjang</span>
                                    </div>
                                    <p className="text-gray-600 leading-normal">
                                        Saat pendaftar membuka tautan ini dan memilih jenjang (misal: <strong>{jenjangList[0]?.nama || 'Jenjang A'}</strong>), seluruh pertanyaan formulir, berkas persyaratan, dan desain akan <strong>berganti secara otomatis</strong> mengikuti konfigurasi template jenjang tersebut.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={mainPsbUrl}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 select-all focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(mainPsbUrl, 'main')}
                                        className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                            copiedKey === 'main'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-teal-700 hover:bg-teal-800 text-white'
                                        }`}
                                    >
                                        <i className={`bi ${copiedKey === 'main' ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
                                        <span>{copiedKey === 'main' ? 'Tersalin!' : 'Salin'}</span>
                                    </button>
                                </div>

                                {/* Aksi Tambahan: Buka, WA, QR Code */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenLink(mainPsbUrl)}
                                        className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                                    >
                                        <i className="bi bi-box-arrow-up-right text-teal-600"></i>
                                        <span>Buka Formulir</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleShareWa('Semua Jenjang', mainPsbUrl)}
                                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                                    >
                                        <i className="bi bi-whatsapp"></i>
                                        <span>Bagikan ke WhatsApp</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenQr('Pendaftaran Santri Baru (Semua Jenjang)', mainPsbUrl)}
                                        className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                                    >
                                        <i className="bi bi-qr-code"></i>
                                        <span>Tampilkan QR Code</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: TAUTAN KHUSUS PER JENJANG */}
                    {selectedTab === 'jenjang' && (
                        <div className="space-y-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    Tautan di bawah telah <strong>langsung mengunci jenjang</strong> sehingga calon santri tidak perlu memilih jenjang lagi:
                                </p>

                                {/* Filter Toggle */}
                                {configuredCount > 0 && configuredCount < jenjangList.length && (
                                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setJenjangFilter('all')}
                                            className={`px-2 py-1 rounded-md transition-all ${
                                                jenjangFilter === 'all'
                                                    ? 'bg-white text-gray-800 shadow-2xs'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            Semua Jenjang ({jenjangList.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setJenjangFilter('configured')}
                                            className={`px-2 py-1 rounded-md transition-all ${
                                                jenjangFilter === 'configured'
                                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                                    : 'text-emerald-700 hover:text-emerald-800'
                                            }`}
                                        >
                                            ✓ Ada Desain ({configuredCount})
                                        </button>
                                    </div>
                                )}
                            </div>

                            {displayedJenjangList.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 border border-dashed rounded-xl">
                                    Belum ada marhalah/jenjang terdaftar.
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                                    {displayedJenjangList.map((j) => {
                                        const jenjangUrl = encryptedKey
                                            ? `${originUrl}/?psb=true&jenjang=${j.id}&k=${encodeURIComponent(encryptedKey)}`
                                            : `${originUrl}/?psb=true&jenjang=${j.id}`;

                                        const copyId = `jenjang_${j.id}`;

                                        return (
                                            <div
                                                key={j.id}
                                                className={`p-3.5 rounded-xl border shadow-2xs transition-all space-y-2.5 ${
                                                    j.hasCustomDesign
                                                        ? 'bg-white border-teal-200 hover:border-teal-400'
                                                        : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${
                                                            j.hasCustomDesign
                                                                ? 'bg-teal-50 border-teal-200 text-teal-800'
                                                                : 'bg-gray-100 border-gray-200 text-gray-500'
                                                        }`}>
                                                            <i className="bi bi-mortarboard"></i>
                                                        </span>
                                                        <div>
                                                            <span className="font-bold text-gray-800 text-xs">{j.nama}</span>
                                                            <span className="text-[10px] text-gray-400 ml-2 font-mono">ID: {j.id}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {j.hasCustomDesign ? (
                                                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <i className="bi bi-check2-circle"></i>
                                                                <span>Desain Khusus: {j.designTitle}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-medium px-2 py-0.5 rounded-full" title="Jenjang ini belum memiliki template khusus di Desain Formulir dan akan memuat formulir standar.">
                                                                Formulir Standar
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {!j.hasCustomDesign && (
                                                    <p className="text-[10px] text-gray-500 italic">
                                                        * Belum ada desain khusus untuk jenjang ini. Pendaftar yang membuka tautan ini akan melihat formulir standar.
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={jenjangUrl}
                                                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-mono text-gray-700 select-all focus:ring-1 focus:ring-teal-500 outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(jenjangUrl, copyId)}
                                                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer ${
                                                            copiedKey === copyId
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-slate-800 hover:bg-slate-900 text-white'
                                                        }`}
                                                    >
                                                        <i className={`bi ${copiedKey === copyId ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
                                                        <span>{copiedKey === copyId ? 'Tersalin' : 'Salin'}</span>
                                                    </button>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenLink(jenjangUrl)}
                                                        className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer"
                                                    >
                                                        <i className="bi bi-box-arrow-up-right text-teal-700"></i>
                                                        <span>Uji Buka</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleShareWa(j.nama, jenjangUrl, j.nama)}
                                                        className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer"
                                                    >
                                                        <i className="bi bi-whatsapp text-emerald-600"></i>
                                                        <span>Kirim ke WA</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenQr(`Pendaftaran PSB Jenjang ${j.nama}`, jenjangUrl)}
                                                        className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer"
                                                    >
                                                        <i className="bi bi-qr-code text-indigo-600"></i>
                                                        <span>QR Code</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-2 shrink-0">
                    <span className="text-[11px] text-gray-500">
                        💡 Tautan langsung dapat disematkan pada Website, Bio Media Sosial, Brosur, atau WhatsApp Pondok.
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl font-bold text-xs transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>

            {/* Modal Popup QR Code Viewer */}
            {qrModalData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-200 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h4 className="font-bold text-sm text-gray-800 truncate pr-2">{qrModalData.title}</h4>
                            <button
                                onClick={() => setQrModalData(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 inline-block">
                            <img
                                src={qrModalData.qrDataUrl}
                                alt="QR Code PSB"
                                className="w-56 h-56 mx-auto rounded-lg shadow-sm"
                            />
                        </div>

                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            Pindai menggunakan kamera HP untuk langsung membuka formulir pendaftaran santri baru.
                        </p>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleDownloadQr}
                                className="flex-1 bg-teal-700 hover:bg-teal-800 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <i className="bi bi-download"></i>
                                <span>Unduh Gambar (PNG)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setQrModalData(null)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-xl font-semibold text-xs"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
