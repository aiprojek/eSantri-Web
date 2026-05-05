
import React, { useState } from 'react';
import { PondokSettings, PortalAnnouncementPost, PortalConfig, PortalContact } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { SectionCard } from '../../common/SectionCard';

interface TabPortalProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
    onSaveSettings: (settings: PondokSettings) => Promise<void>;
}

const THEMES = [
    { id: 'teal', color: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', light: 'bg-teal-50', border: 'border-teal-200', label: 'Teal' },
    { id: 'blue', color: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200', label: 'Blue' },
    { id: 'indigo', color: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200', label: 'Indigo' },
    { id: 'slate', color: 'bg-slate-700', hover: 'hover:bg-slate-800', text: 'text-slate-700', light: 'bg-slate-50', border: 'border-slate-200', label: 'Slate' },
    { id: 'rose', color: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-200', label: 'Rose' },
    { id: 'emerald', color: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', label: 'Emerald' },
    { id: 'cyan', color: 'bg-cyan-600', hover: 'hover:bg-cyan-700', text: 'text-cyan-600', light: 'bg-cyan-50', border: 'border-cyan-200', label: 'Cyan' },
] as const;

const ICONS = [
    'bi-whatsapp', 'bi-telephone', 'bi-envelope', 'bi-globe', 'bi-instagram', 
    'bi-facebook', 'bi-twitter-x', 'bi-youtube', 'bi-telegram', 'bi-geo-alt'
];

const normalizeAnnouncementPosts = (config: PortalConfig): PortalAnnouncementPost[] => {
    const posts = (config.announcementPosts || []).filter(Boolean);
    if (posts.length > 0) return posts as PortalAnnouncementPost[];
    if (config.announcement?.trim()) {
        return [{
            id: 'legacy-announcement',
            title: 'Pengumuman',
            content: config.announcement.trim(),
            publishedAt: new Date().toISOString(),
            isPublished: true
        }];
    }
    return [];
};

const PortalPreview: React.FC<{ config: PortalConfig; settings: PondokSettings }> = ({ config, settings }) => {
    const [view, setView] = useState<'login' | 'dashboard'>('login');
    const theme = THEMES.find(t => t.id === config.theme) || THEMES[0];
    const announcementPosts = normalizeAnnouncementPosts(config).filter(post => post.isPublished);

    return (
        <div className="flex flex-col items-center sticky top-6">
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setView('login')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${view === 'login' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => setView('dashboard')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${view === 'dashboard' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Dashboard
                </button>
            </div>

            <div className="w-[280px] h-[560px] bg-white rounded-[3rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden relative flex flex-col">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-20"></div>
                
                <div className="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
                    {view === 'login' ? (
                        <div className="min-h-full flex flex-col p-6 pt-12">
                            <div className="flex flex-col items-center mb-8">
                                {settings.logoPonpesUrl ? (
                                    <img src={settings.logoPonpesUrl} alt="Logo" className="w-16 h-16 rounded-full mb-3 shadow-sm border border-gray-100" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className={`w-16 h-16 rounded-full ${theme.color} flex items-center justify-center text-white text-2xl font-bold mb-3`}>
                                        {settings.namaPonpes?.charAt(0) || 'E'}
                                    </div>
                                )}
                                <h1 className="text-sm font-bold text-gray-800 text-center">{settings.namaPonpes || 'eSantri Pondok'}</h1>
                                <p className="text-[10px] text-gray-500 text-center mt-1">{config.welcomeMessage}</p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">NIS / ID Santri</label>
                                    <div className="w-full h-8 bg-white border border-gray-200 rounded-md"></div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Tanggal Lahir</label>
                                    <div className="w-full h-8 bg-white border border-gray-200 rounded-md"></div>
                                </div>
                                <button className={`w-full py-2 rounded-md text-white text-xs font-bold shadow-sm ${theme.color}`}>
                                    Masuk Portal
                                </button>
                            </div>

                            <div className="mt-auto pt-8">
                                <p className="text-[9px] text-center text-gray-400 mb-3">Butuh bantuan? Hubungi kami:</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {config.contacts.map(c => (
                                        <div key={c.id} className={`w-6 h-6 rounded-full ${theme.light} ${theme.text} flex items-center justify-center text-xs border ${theme.border}`}>
                                            <i className={`bi ${c.icon}`}></i>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-full flex flex-col">
                            <div className={`${theme.color} p-6 pt-10 text-white`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-bold">
                                        S
                                    </div>
                                    <div>
                                        <h2 className="text-xs font-bold">Ahmad Santri</h2>
                                        <p className="text-[9px] opacity-80">NIS: 2024001 • Kelas 7A</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 -mt-4 bg-gray-50 rounded-t-2xl flex-1 space-y-4">
                                {announcementPosts.length > 0 && (
                                    <div className={`p-3 rounded-xl border ${theme.border} ${theme.light} relative overflow-hidden`}>
                                        <div className={`absolute top-0 left-0 w-1 h-full ${theme.color}`}></div>
                                        <h3 className={`text-[10px] font-bold ${theme.text} mb-2 flex items-center gap-1`}>
                                            <i className="bi bi-megaphone"></i> Pengumuman
                                        </h3>
                                        <div className="space-y-2">
                                            {announcementPosts.slice(0, 2).map(post => (
                                                <div key={post.id} className="rounded-md bg-white/60 px-2 py-1">
                                                    <p className="text-[9px] font-semibold text-gray-800 line-clamp-1">{post.title}</p>
                                                    <p className="text-[9px] text-gray-700 line-clamp-2">{post.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'showFinance', label: 'Keuangan', icon: 'bi-cash-stack' },
                                        { id: 'showAcademic', label: 'Akademik', icon: 'bi-mortarboard' },
                                        { id: 'showAttendance', label: 'Presensi', icon: 'bi-calendar-check' },
                                        { id: 'showTahfizh', label: 'Tahfizh', icon: 'bi-book' },
                                        { id: 'showHealth', label: 'Kesehatan', icon: 'bi-heart-pulse' },
                                        { id: 'showLibrary', label: 'Perpus', icon: 'bi-journal-bookmark' },
                                    ].filter(item => (config as any)[item.id]).map(item => (
                                        <div key={item.id} className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center gap-1">
                                            <div className={`w-8 h-8 rounded-lg ${theme.light} ${theme.text} flex items-center justify-center text-sm`}>
                                                <i className={`bi ${item.icon}`}></i>
                                            </div>
                                            <span className="text-[8px] font-bold text-gray-600">{item.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-gray-800 mb-2">Link Penting</h3>
                                    <div className="space-y-2">
                                        {config.customLinks.map((l, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                <span className="text-[9px] font-medium text-gray-700">{l.label || 'Link Kustom'}</span>
                                                <i className="bi bi-chevron-right text-[8px] text-gray-400"></i>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Home Indicator */}
                <div className="h-6 bg-white flex items-center justify-center">
                    <div className="w-20 h-1 bg-gray-200 rounded-full"></div>
                </div>
            </div>
            
            <p className="mt-4 text-[10px] text-gray-400 italic">* Preview tampilan di layar HP</p>
        </div>
    );
};

export const TabPortal: React.FC<TabPortalProps> = ({ localSettings, setLocalSettings, onSaveSettings }) => {
    const { showToast } = useAppContext();
    const [showScriptHelper, setShowScriptHelper] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const tenantId = localSettings.portalConfig?.portalId || 'default-portal';
    
    const portalConfig: PortalConfig = localSettings.portalConfig || {
        enabled: localSettings.cloudSyncConfig?.portalEnabled || false,
        provider: 'gas',
        portalId: 'default-portal',
        gasEndpoint: '',
        gasApiKey: '',
        theme: 'teal',
        showFinance: true,
        showAcademic: true,
        showAttendance: true,
        showTahfizh: true,
        showHealth: true,
        showLibrary: true,
        welcomeMessage: 'Selamat Datang di Portal Wali Santri',
        announcement: '',
        announcementPosts: [],
        contacts: [],
        customLinks: [],
        baseUrl: ''
    };
    const announcementPosts = normalizeAnnouncementPosts(portalConfig);

    const effectiveBaseUrl = portalConfig.baseUrl || window.location.origin;
    const gasParam = portalConfig.gasEndpoint ? `?gas=${encodeURIComponent(portalConfig.gasEndpoint)}${portalConfig.gasApiKey ? `&token=${encodeURIComponent(portalConfig.gasApiKey)}` : ''}` : '';
    const portalUrl = tenantId ? `${effectiveBaseUrl}/portal/${tenantId}${gasParam}` : '';
    const qrCodeUrl = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}` : '';

    const updatePortalConfig = (updates: Partial<PortalConfig>) => {
        const newConfig = { ...portalConfig, ...updates };
        setLocalSettings(prev => ({
            ...prev,
            portalConfig: newConfig,
            cloudSyncConfig: {
                ...prev.cloudSyncConfig,
                portalEnabled: newConfig.enabled
            }
        }));
    };

    const handleAddContact = () => {
        const newContact: PortalContact = {
            id: Date.now().toString(),
            label: 'Admin',
            value: '',
            icon: 'bi-whatsapp'
        };
        updatePortalConfig({ contacts: [...portalConfig.contacts, newContact] });
    };

    const handleUpdateContact = (id: string, updates: Partial<PortalContact>) => {
        updatePortalConfig({
            contacts: portalConfig.contacts.map(c => c.id === id ? { ...c, ...updates } : c)
        });
    };

    const handleRemoveContact = (id: string) => {
        updatePortalConfig({
            contacts: portalConfig.contacts.filter(c => c.id !== id)
        });
    };

    const handleAddLink = () => {
        updatePortalConfig({
            customLinks: [...portalConfig.customLinks, { label: '', url: '' }]
        });
    };

    const handleUpdateLink = (index: number, updates: { label?: string; url?: string }) => {
        const newLinks = [...portalConfig.customLinks];
        newLinks[index] = { ...newLinks[index], ...updates };
        updatePortalConfig({ customLinks: newLinks });
    };

    const handleRemoveLink = (index: number) => {
        updatePortalConfig({
            customLinks: portalConfig.customLinks.filter((_, i) => i !== index)
        });
    };

    const handleAddAnnouncementPost = () => {
        const id = Date.now().toString();
        const newPost: PortalAnnouncementPost = {
            id,
            title: '',
            content: '',
            publishedAt: new Date().toISOString(),
            isPublished: true
        };
        const updatedPosts = [...announcementPosts, newPost];
        updatePortalConfig({ announcementPosts: updatedPosts, announcement: '' });
        setEditingPostId(id);
    };

    const handleUpdateAnnouncementPost = (id: string, updates: Partial<PortalAnnouncementPost>) => {
        const updatedPosts = announcementPosts.map(post => post.id === id ? { ...post, ...updates } : post);
        updatePortalConfig({ announcementPosts: updatedPosts, announcement: '' });
    };

    const handleRemoveAnnouncementPost = (id: string) => {
        const updatedPosts = announcementPosts.filter(post => post.id !== id);
        updatePortalConfig({ announcementPosts: updatedPosts, announcement: '' });
        if (editingPostId === id) setEditingPostId(null);
    };

    const portalGasScript = `/**
 * eSantri Portal Bridge - Google Apps Script
 *
 * ===================== WAJIB DIISI USER =====================
 * 1) Ganti PORTAL_ID_DEFAULT (contoh: ponpes-alikhlas)
 * 2) Token opsional:
 *    - Jika ingin pakai token, isi API_TOKEN
 *    - Jika tidak ingin pakai token, biarkan kosong ''
 * ============================================================
 */
const SHEET_PORTALS='portals';
const SHEET_PSB='portal_psb_submissions';
const PORTAL_ID_DEFAULT='ganti-portal-id-di-sini';
const API_TOKEN=''; // contoh: 'isi-token-rahasia'
function doGet(e){try{const a=(e.parameter.action||'').trim();if(a==='getPortalConfig')return out(getPortalConfig(e));return out({success:false,message:'Action GET tidak valid.'});}catch(err){return out({success:false,message:err.message||String(err)})}}
function doPost(e){try{const b=JSON.parse(e.postData.contents||'{}');const a=(b.action||'').trim();if(a==='upsertPortalConfig')return out(upsertPortalConfig(b));if(a==='submitPortalPsb')return out(submitPortalPsb(b));return out({success:false,message:'Action POST tidak valid.'});}catch(err){return out({success:false,message:err.message||String(err)})}}
function out(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
function ensureSheet(name,headers){const ss=SpreadsheetApp.getActiveSpreadsheet();let sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,headers.length).setValues([headers]);}return sh}
function authCheck(inputApiKey){const expectedByConstant=(API_TOKEN||'').trim();const expectedByProperty=(PropertiesService.getScriptProperties().getProperty('PORTAL_API_KEY')||'').trim();const expected=expectedByConstant||expectedByProperty;if(!expected)return true;return expected===(inputApiKey||'')}
function resolvePortalId(inputPortalId){const p=(inputPortalId||'').trim();if(p)return p;const fallback=(PORTAL_ID_DEFAULT||'').trim();if(fallback && !fallback.includes('ganti-portal-id'))return fallback;throw new Error('portalId wajib diisi. Isi di aplikasi atau ubah PORTAL_ID_DEFAULT di script.')}
function getPortalConfig(e){const portalId=resolvePortalId(e.parameter.portalId);const apiKey=(e.parameter.apiKey||'').trim();if(!authCheck(apiKey))throw new Error('API key tidak valid.');const sh=ensureSheet(SHEET_PORTALS,['portalId','payloadJson','updatedAt']);const values=sh.getDataRange().getValues();const headers=values.shift();const idxPortal=headers.indexOf('portalId');const idxPayload=headers.indexOf('payloadJson');for(let i=values.length-1;i>=0;i--){if((values[i][idxPortal]||'').toString().trim()===portalId){const payload=JSON.parse(values[i][idxPayload]||'{}');return {success:true,data:payload.settings||null};}}return {success:false,message:'Data portal tidak ditemukan.'};}
function upsertPortalConfig(body){const portalId=resolvePortalId(body.portalId);const apiKey=(body.apiKey||'').trim();const payload=body.payload||{};if(!authCheck(apiKey))throw new Error('API key tidak valid.');const sh=ensureSheet(SHEET_PORTALS,['portalId','payloadJson','updatedAt']);const values=sh.getDataRange().getValues();const headers=values.shift();const idxPortal=headers.indexOf('portalId');let targetRow=-1;for(let i=0;i<values.length;i++){if((values[i][idxPortal]||'').toString().trim()===portalId){targetRow=i+2;break;}}const row=[portalId,JSON.stringify(payload),new Date().toISOString()];if(targetRow>0){sh.getRange(targetRow,1,1,row.length).setValues([row]);}else{sh.appendRow(row);}return {success:true,message:'Portal config tersimpan.'};}
function submitPortalPsb(body){const portalId=resolvePortalId(body.portalId);const apiKey=(body.apiKey||'').trim();const fields=body.fields||{};const submittedAt=body.submittedAt||new Date().toISOString();if(!authCheck(apiKey))throw new Error('API key tidak valid.');const sh=ensureSheet(SHEET_PSB,['submittedAt','portalId','namaLengkap','nisn','nik','jenisKelamin','tanggalLahir','namaWali','teleponWali','rawJson']);sh.appendRow([submittedAt,portalId,fields.namaLengkap||'',fields.nisn||'',fields.nik||'',fields.jenisKelamin||'',fields.tanggalLahir||'',fields.namaWali||'',fields.teleponWali||'',JSON.stringify(fields)]);return {success:true,message:'Pendaftaran berhasil tersimpan.'};}`;

    return (
        <div className="flex flex-col items-start gap-6 lg:flex-row">
            <div className="flex-1 w-full space-y-6">
                <SectionCard
                    title="Pengaturan Portal Wali Santri"
                    description="Konfigurasi tampilan, fitur, alamat portal, dan akses publik untuk wali santri."
                    contentClassName="space-y-6 p-6"
                >
                    <div className="flex items-center justify-between border-b border-app-border pb-4">
                        <div className="text-sm text-slate-600">Portal publik untuk wali santri</div>
                        <label className="inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={portalConfig.enabled} 
                                onChange={(e) => updatePortalConfig({ enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                            <span className="ms-3 text-sm font-semibold text-slate-900">Aktifkan Portal</span>
                        </label>
                    </div>

                    {!portalConfig.enabled && (
                        <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                            <i className="bi bi-exclamation-triangle text-yellow-600 text-xl"></i>
                            <div>
                                <p className="text-sm text-yellow-800 font-medium">Portal Sedang Non-Aktif</p>
                                <p className="text-xs text-yellow-700">Wali santri tidak akan bisa mengakses data melalui web portal sampai fitur ini diaktifkan.</p>
                            </div>
                        </div>
                    )}

                    {portalConfig.enabled && (
                        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <i className="bi bi-link-45deg text-blue-600 text-xl"></i>
                                        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">URL Portal Wali Santri</h3>
                                    </div>
                                    <p className="text-xs text-blue-700 mb-3">Bagikan link ini kepada wali santri agar mereka bisa mengakses portal.</p>
                                    
                                    {portalUrl ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 truncate rounded border border-blue-300 bg-white p-2 font-mono text-sm text-blue-900">
                                                    {portalUrl}
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(portalUrl);
                                                        showToast('Link portal disalin!', 'success');
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                                >
                                                    <i className="bi bi-clipboard"></i> Salin
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-blue-500 italic">
                                                * Link ini menggunakan {portalConfig.baseUrl ? 'Domain Kustom' : 'Domain Saat Ini'} dan terhubung ke Google Apps Script.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-100">
                                            <i className="bi bi-exclamation-circle mr-1"></i> 
                                            Link belum tersedia. Isi Portal ID dan URL Web App GAS terlebih dahulu.
                                        </div>
                                    )}
                                </div>

                                {portalUrl && (
                                    <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                        <img 
                                            src={qrCodeUrl} 
                                            alt="QR Code Portal" 
                                            className="w-32 h-32"
                                            referrerPolicy="no-referrer"
                                        />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Scan QR Code</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`space-y-8 ${!portalConfig.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* KONFIGURASI DOMAIN */}
                        <section className="rounded-xl border border-app-border bg-app-subtle p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                <i className="bi bi-globe text-teal-600"></i> Domain / URL Web Portal
                            </h3>
                            <div className="space-y-3">
                                <p className="text-xs text-slate-600">
                                    Jika Anda menggunakan versi <strong>Desktop (Tauri)</strong> atau <strong>Android</strong>, Anda harus menghosting versi web aplikasi ini (misal di Vercel/Netlify) dan memasukkan URL-nya di sini agar link yang dibagikan ke wali santri valid.
                                </p>
                                <div className="flex gap-2">
                                    <input 
                                        type="url" 
                                        value={portalConfig.baseUrl || ''}
                                        onChange={(e) => updatePortalConfig({ baseUrl: e.target.value })}
                                        placeholder="https://esantri-pondok-anda.vercel.app"
                                        className="app-input flex-1 p-2 text-sm"
                                    />
                                    {portalConfig.baseUrl && (
                                        <button 
                                            onClick={() => updatePortalConfig({ baseUrl: '' })}
                                            className="text-xs font-medium text-red-600 hover:text-red-700"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    * Kosongkan untuk menggunakan domain saat ini secara otomatis.
                                </p>
                            </div>
                        </section>

                        <section className="rounded-xl border border-app-border bg-app-subtle p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                <i className="bi bi-database-gear text-teal-600"></i> Koneksi Google Sheets + GAS
                            </h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Portal ID</label>
                                    <input
                                        type="text"
                                        value={portalConfig.portalId || ''}
                                        onChange={(e) => updatePortalConfig({ portalId: e.target.value })}
                                        className="app-input"
                                        placeholder="contoh: ponpes-alikhlas"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Token API (Opsional)</label>
                                    <input
                                        type="text"
                                        value={portalConfig.gasApiKey || ''}
                                        onChange={(e) => updatePortalConfig({ gasApiKey: e.target.value })}
                                        className="app-input"
                                        placeholder="token rahasia GAS (opsional)"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-medium text-slate-600">URL Web App GAS</label>
                                    <input
                                        type="url"
                                        value={portalConfig.gasEndpoint || ''}
                                        onChange={(e) => updatePortalConfig({ gasEndpoint: e.target.value })}
                                        className="app-input"
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                    />
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                                Portal wali memakai Google Sheets + Google Apps Script sebagai jembatan data publik.
                            </p>
                            <button
                                onClick={() => setShowScriptHelper((prev) => !prev)}
                                className="mt-3 text-xs text-blue-600 underline hover:text-blue-800"
                            >
                                {showScriptHelper ? 'Sembunyikan Kode GAS' : 'Lihat Kode Google Apps Script'}
                            </button>
                            {showScriptHelper && (
                                <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3">
                                    <p className="mb-2 text-[11px] text-slate-600">
                                        Tempel kode ini ke <strong>Extensions &gt; Apps Script</strong>, lalu deploy <strong>Web App</strong> dan ambil URL <code>/exec</code>.
                                    </p>
                                    <textarea
                                        readOnly
                                        value={portalGasScript}
                                        className="h-56 w-full rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] leading-relaxed text-slate-700"
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(portalGasScript);
                                                showToast('Kode Google Apps Script berhasil disalin.', 'success');
                                            }}
                                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                        >
                                            <i className="bi bi-clipboard mr-1"></i> Salin Kode
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* TEMA */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="bi bi-palette text-teal-600"></i> Tema Visual
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                {THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => updatePortalConfig({ theme: t.id as any })}
                                        className={`flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                                            portalConfig.theme === t.id ? 'border-teal-500 bg-teal-50' : 'border-transparent hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full ${t.color} shadow-sm border border-white`}></div>
                                        <span className="text-[10px] font-medium text-gray-600">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* VISIBILITAS DATA */}
                        <section>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                <i className="bi bi-eye text-teal-600"></i> Visibilitas Data
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'showFinance', label: 'Keuangan & Tagihan', icon: 'bi-cash-stack' },
                                    { id: 'showAcademic', label: 'Akademik & Rapor', icon: 'bi-mortarboard' },
                                    { id: 'showAttendance', label: 'Presensi / Absensi', icon: 'bi-calendar-check' },
                                    { id: 'showTahfizh', label: 'Tahfizh & Al-Qur\'an', icon: 'bi-book' },
                                    { id: 'showHealth', label: 'Kesehatan Santri', icon: 'bi-heart-pulse' },
                                    { id: 'showLibrary', label: 'Perpustakaan', icon: 'bi-journal-bookmark' },
                                ].map((item) => (
                                    <label key={item.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-app-border bg-app-subtle p-3 transition-all hover:bg-white hover:shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <i className={`bi ${item.icon} text-slate-500`}></i>
                                            <span className="text-sm font-medium text-slate-700">{item.label}</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={(portalConfig as any)[item.id]} 
                                            onChange={(e) => updatePortalConfig({ [item.id]: e.target.checked })}
                                            className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                                        />
                                    </label>
                                ))}
                            </div>
                        </section>

                        {/* INFORMASI & PENGUMUMAN */}
                        <section>
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                    <i className="bi bi-megaphone text-teal-600"></i> Informasi & Pengumuman
                                </h3>
                                <button
                                    onClick={handleAddAnnouncementPost}
                                    className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-600 hover:bg-teal-100"
                                >
                                    <i className="bi bi-plus-lg"></i> Tambah Post
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Pesan Selamat Datang</label>
                                    <input 
                                        type="text" 
                                        value={portalConfig.welcomeMessage}
                                        onChange={(e) => updatePortalConfig({ welcomeMessage: e.target.value })}
                                        className="app-input w-full p-2.5 text-sm"
                                        placeholder="Contoh: Selamat Datang di Portal Wali Santri"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-medium text-slate-600">Daftar Pengumuman (Model Blog Mini)</label>
                                    <div className="space-y-3">
                                        {announcementPosts.length === 0 && (
                                            <p className="rounded-lg border border-dashed border-app-border bg-app-subtle py-4 text-center text-xs italic text-slate-400">
                                                Belum ada pengumuman. Klik Tambah Post untuk membuat pengumuman baru.
                                            </p>
                                        )}
                                        {announcementPosts.map((post) => (
                                            <div key={post.id} className="rounded-lg border border-app-border bg-app-subtle p-3">
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateAnnouncementPost(post.id, { isPublished: !post.isPublished })}
                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${post.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                                                        >
                                                            {post.isPublished ? 'Tayang' : 'Draft'}
                                                        </button>
                                                        <span className="text-[10px] text-slate-500">
                                                            {new Date(post.publishedAt).toLocaleDateString('id-ID')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingPostId(editingPostId === post.id ? null : post.id)}
                                                            className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                                        >
                                                            {editingPostId === post.id ? 'Tutup' : 'Edit'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAnnouncementPost(post.id)}
                                                            className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                                {editingPostId === post.id ? (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={post.title}
                                                            onChange={(e) => handleUpdateAnnouncementPost(post.id, { title: e.target.value })}
                                                            className="app-input w-full p-2 text-sm"
                                                            placeholder="Judul pengumuman"
                                                        />
                                                        <textarea
                                                            value={post.content}
                                                            onChange={(e) => handleUpdateAnnouncementPost(post.id, { content: e.target.value })}
                                                            rows={3}
                                                            className="app-input w-full p-2 text-sm"
                                                            placeholder="Isi pengumuman..."
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold text-slate-800">{post.title || 'Tanpa Judul'}</p>
                                                        <p className="text-xs text-slate-600 whitespace-pre-wrap">{post.content || '-'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* KONTAK PENTING */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                    <i className="bi bi-person-lines-fill text-teal-600"></i> Kontak Penting
                                </h3>
                                <button 
                                    onClick={handleAddContact}
                                    className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-600 hover:bg-teal-100"
                                >
                                    <i className="bi bi-plus-lg"></i> Tambah Kontak
                                </button>
                            </div>
                            <div className="space-y-3">
                                {portalConfig.contacts.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-app-border bg-app-subtle py-4 text-center text-xs italic text-slate-400">Belum ada kontak yang ditambahkan.</p>
                                )}
                                {portalConfig.contacts.map((contact) => (
                                    <div key={contact.id} className="flex flex-col gap-3 rounded-lg border border-app-border bg-app-subtle p-3 sm:flex-row">
                                        <div className="flex-shrink-0">
                                            <select 
                                                value={contact.icon}
                                                onChange={(e) => handleUpdateContact(contact.id, { icon: e.target.value })}
                                                className="app-select p-2 text-sm"
                                            >
                                                {ICONS.map(icon => (
                                                    <option key={icon} value={icon}>{icon.replace('bi-', '')}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input 
                                                type="text" 
                                                value={contact.label}
                                                onChange={(e) => handleUpdateContact(contact.id, { label: e.target.value })}
                                                placeholder="Label (misal: Admin Keuangan)"
                                                className="app-input p-2 text-sm"
                                            />
                                            <input 
                                                type="text" 
                                                value={contact.value}
                                                onChange={(e) => handleUpdateContact(contact.id, { value: e.target.value })}
                                                placeholder="Nomor HP / Email / Link"
                                                className="app-input p-2 text-sm"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveContact(contact.id)}
                                            className="text-red-500 hover:text-red-700 p-2"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* LINK KUSTOM */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                                    <i className="bi bi-link-45deg text-teal-600"></i> Link Eksternal Kustom
                                </h3>
                                <button 
                                    onClick={handleAddLink}
                                    className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-600 hover:bg-teal-100"
                                >
                                    <i className="bi bi-plus-lg"></i> Tambah Link
                                </button>
                            </div>
                            <div className="space-y-3">
                                {portalConfig.customLinks.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-app-border bg-app-subtle py-4 text-center text-xs italic text-slate-400">Belum ada link kustom.</p>
                                )}
                                {portalConfig.customLinks.map((link, idx) => (
                                    <div key={idx} className="flex gap-3 rounded-lg border border-app-border bg-app-subtle p-3">
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input 
                                                type="text" 
                                                value={link.label}
                                                onChange={(e) => handleUpdateLink(idx, { label: e.target.value })}
                                                placeholder="Nama Link (misal: Website Yayasan)"
                                                className="app-input p-2 text-sm"
                                            />
                                            <input 
                                                type="text" 
                                                value={link.url}
                                                onChange={(e) => handleUpdateLink(idx, { url: e.target.value })}
                                                placeholder="URL (https://...)"
                                                className="app-input p-2 text-sm"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveLink(idx)}
                                            className="text-red-500 hover:text-red-700 p-2"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="mt-8 flex justify-end border-t border-app-border pt-6">
                        <button
                            onClick={() => onSaveSettings(localSettings)}
                            className="app-button-primary inline-flex items-center gap-2 px-8 py-2.5"
                        >
                            <i className="bi bi-save"></i> Simpan Pengaturan Portal
                        </button>
                    </div>
                </SectionCard>
            </div>

            {/* PREVIEW PANEL */}
            <div className="w-full lg:w-[320px] shrink-0">
                <PortalPreview config={portalConfig} settings={localSettings} />
            </div>
        </div>
    );
};
