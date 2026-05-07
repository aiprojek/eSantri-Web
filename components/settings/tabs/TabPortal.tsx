
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
    const featureItems = [
        config.showFinance ? { label: 'Keuangan', icon: 'bi-cash-stack' } : null,
        config.showAcademic ? { label: 'Akademik', icon: 'bi-mortarboard' } : null,
        config.showAttendance ? { label: 'Presensi', icon: 'bi-calendar-check' } : null,
        config.showTahfizh ? { label: 'Tahfizh', icon: 'bi-book' } : null,
        config.showHealth ? { label: 'Kesehatan', icon: 'bi-heart-pulse' } : null,
        config.showLibrary ? { label: 'Perpus', icon: 'bi-journal-bookmark' } : null,
    ].filter(Boolean) as Array<{ label: string; icon: string }>;

    return (
        <div className="sticky top-6 flex flex-col items-center">
            <div className="mb-4 flex gap-2 rounded-lg bg-gray-100 p-1">
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

            <div className="w-[300px] overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-100 p-3 shadow-2xl">
                <div className="custom-scrollbar h-[580px] overflow-y-auto rounded-2xl border border-teal-100 bg-white p-4">
                    {view === 'login' && (
                        <div className="text-center">
                            <div className="mb-4 flex flex-col items-center">
                                {settings.logoPonpesUrl ? (
                                    <img src={settings.logoPonpesUrl} alt="Logo" className="w-16 h-16 rounded-full mb-3 shadow-sm border border-gray-100" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className={`w-16 h-16 rounded-full ${theme.color} flex items-center justify-center text-white text-2xl font-bold mb-3`}>
                                        {settings.namaPonpes?.charAt(0) || 'E'}
                                    </div>
                                )}
                                <h1 className="text-sm font-bold text-teal-900">{settings.namaPonpes || 'eSantri Pondok'}</h1>
                                <div className="mb-1 mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">Portal Wali Santri</div>
                                <p className="text-[10px] text-slate-500">{config.welcomeMessage}</p>
                            </div>

                            <div className="space-y-3 text-left">
                                <div>
                                    <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">NIS / ID Santri</label>
                                    <div className="w-full h-8 bg-white border border-gray-200 rounded-md"></div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Tanggal Lahir</label>
                                    <div className="w-full h-8 bg-white border border-gray-200 rounded-md"></div>
                                    <p className="mt-1 text-[9px] text-slate-400">Format tanggal lahir: DD/MM/YYYY</p>
                                </div>
                                <button className={`w-full rounded-lg py-2 text-xs font-bold text-white shadow-sm ${theme.color}`}>
                                    Masuk Portal
                                </button>
                            </div>

                            <div className="mt-5 border-t border-slate-100 pt-3">
                                <p className="mb-2 text-[9px] text-center text-slate-400">Butuh bantuan? Hubungi kami:</p>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {config.contacts.map(c => (
                                        <div key={c.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] ${theme.light} ${theme.text} ${theme.border}`}>
                                            <i className={`bi ${c.icon}`}></i>
                                            <span>{c.label || 'Kontak'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'dashboard' && (
                        <div className="text-left">
                            <div className="rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 p-3 text-white">
                                <p className="text-[10px] font-semibold text-teal-100">Selamat datang</p>
                                <p className="text-sm font-bold">Ahmad Santri</p>
                                <p className="mt-0.5 text-[9px] text-teal-100">NIS: 2024001 • Wali: Bapak Ahmad</p>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-slate-100 bg-white p-2">
                                    <p className="text-[9px] text-slate-500">Tunggakan</p>
                                    <p className="text-[11px] font-bold text-slate-800">Rp 0</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-white p-2">
                                    <p className="text-[9px] text-slate-500">Tabungan</p>
                                    <p className="text-[11px] font-bold text-slate-800">Rp 0</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-white p-2">
                                    <p className="text-[9px] text-slate-500">Presensi</p>
                                    <p className="text-[11px] font-bold text-slate-800">Belum Absen</p>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-white p-2">
                                    <p className="text-[9px] text-slate-500">Perpus</p>
                                    <p className="text-[11px] font-bold text-slate-800">0 Buku</p>
                                </div>
                            </div>

                            {announcementPosts.length > 0 && (
                                <div className={`relative mt-3 overflow-hidden rounded-lg border p-2 ${theme.border} ${theme.light}`}>
                                    <div className={`absolute left-0 top-0 h-full w-1 ${theme.color}`}></div>
                                    <h3 className={`mb-1 pl-2 text-[10px] font-bold ${theme.text}`}>
                                        <i className="bi bi-megaphone mr-1"></i>Pengumuman
                                    </h3>
                                    <div className="space-y-1 pl-2">
                                        {announcementPosts.slice(0, 2).map(post => (
                                            <div key={post.id} className="rounded-md bg-white/70 px-2 py-1">
                                                <p className="line-clamp-1 text-[9px] font-semibold text-slate-800">{post.title}</p>
                                                <p className="line-clamp-2 text-[9px] text-slate-600">{post.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2">
                                <div className="flex gap-1 overflow-x-auto">
                                    {featureItems.map((item) => (
                                        <div key={item.label} className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-slate-600">
                                            <i className={`bi ${item.icon} mr-1`}></i>
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-3 rounded-lg border border-teal-100 bg-white p-3 shadow-sm">
                                <p className="text-[9px] text-slate-500">Panel Data Aktif</p>
                                <p className="text-[11px] font-bold text-slate-800">Keuangan / Akademik / Presensi</p>
                            </div>

                            <div className="mt-3 rounded-lg border border-slate-100 bg-white p-2">
                                <h3 className="mb-1 text-[10px] font-bold text-slate-700">Link Penting</h3>
                                <div className="space-y-1">
                                    {config.customLinks.slice(0, 3).map((l, i) => (
                                        <div key={i} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                                            <span className="text-[9px] text-slate-700">{l.label || 'Link Kustom'}</span>
                                            <i className="bi bi-chevron-right text-[8px] text-slate-400"></i>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <p className="mt-3 text-[10px] italic text-gray-400">* Preview diselaraskan dengan tampilan portal live</p>
        </div>
    );
};

export const TabPortal: React.FC<TabPortalProps> = ({ localSettings, setLocalSettings, onSaveSettings }) => {
    const { showToast, settings } = useAppContext();
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

    const handleSavePortalSettings = async () => {
        try {
            const dataToSave = { ...localSettings };

            if (!dataToSave.cloudSyncConfig.dropboxAppKey && settings.cloudSyncConfig.dropboxAppKey) {
                dataToSave.cloudSyncConfig.dropboxAppKey = settings.cloudSyncConfig.dropboxAppKey;
            }
            if (!dataToSave.cloudSyncConfig.dropboxAppSecret && settings.cloudSyncConfig.dropboxAppSecret) {
                dataToSave.cloudSyncConfig.dropboxAppSecret = settings.cloudSyncConfig.dropboxAppSecret;
            }
            if (!dataToSave.cloudSyncConfig.webdavPassword && settings.cloudSyncConfig.webdavPassword) {
                dataToSave.cloudSyncConfig.webdavPassword = settings.cloudSyncConfig.webdavPassword;
            }

            await onSaveSettings(dataToSave);
            showToast('Pengaturan portal berhasil disimpan.', 'success');
        } catch (error) {
            showToast(`Gagal menyimpan pengaturan portal: ${(error as Error).message}`, 'error');
        }
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
const SHEET_SYNC_LOGS='portal_sync_logs';
const PORTAL_ID_DEFAULT='ganti-portal-id-di-sini';
const API_TOKEN=''; // contoh: 'isi-token-rahasia'
const PAYLOAD_CHUNK_SIZE=45000;
const PAYLOAD_MAX_PARTS=20;
function doGet(e){try{const a=(e.parameter.action||'').trim();if(a==='getPortalConfig')return out(getPortalConfig(e));return out({success:false,message:'Action GET tidak valid.'});}catch(err){return out({success:false,message:err.message||String(err)})}}
function doPost(e){try{const b=JSON.parse(e.postData.contents||'{}');const a=(b.action||'').trim();if(a==='upsertPortalConfig')return out(upsertPortalConfig(b));if(a==='submitPortalPsb')return out(submitPortalPsb(b));return out({success:false,message:'Action POST tidak valid.'});}catch(err){return out({success:false,message:err.message||String(err)})}}
function out(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
function ensureSheet(name,headers){const ss=SpreadsheetApp.getActiveSpreadsheet();let sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);}const currentHeaders=sh.getRange(1,1,1,headers.length).getValues()[0];const isHeaderMatch=headers.every((h,i)=>(currentHeaders[i]||'').toString().trim()===h);if(!isHeaderMatch){sh.getRange(1,1,1,headers.length).setValues([headers]);}return sh}
function getPortalHeaders(){const partHeaders=[];for(let i=1;i<=PAYLOAD_MAX_PARTS;i++){partHeaders.push('payloadPart'+i);}return ['portalId','updatedAt','partCount','payloadSize'].concat(partHeaders)}
function splitPayload(payloadJson){const parts=[];for(let i=0;i<payloadJson.length;i+=PAYLOAD_CHUNK_SIZE){parts.push(payloadJson.slice(i,i+PAYLOAD_CHUNK_SIZE));}if(parts.length>PAYLOAD_MAX_PARTS){throw new Error('Payload portal terlalu besar ('+payloadJson.length+' karakter). Maksimum saat ini '+(PAYLOAD_CHUNK_SIZE*PAYLOAD_MAX_PARTS)+' karakter.');}return parts}
function mergePayloadFromRow(headers,row){const idxLegacyPayload=headers.indexOf('payloadJson');if(idxLegacyPayload>=0){return (row[idxLegacyPayload]||'').toString();}const idxPartCount=headers.indexOf('partCount');const partCount=Number(row[idxPartCount]||0);if(!partCount||partCount<1)return '';let merged='';for(let i=1;i<=partCount;i++){const idxPart=headers.indexOf('payloadPart'+i);if(idxPart<0)continue;merged+=(row[idxPart]||'').toString();}return merged}
function authCheck(inputApiKey){const expectedByConstant=(API_TOKEN||'').trim();const expectedByProperty=(PropertiesService.getScriptProperties().getProperty('PORTAL_API_KEY')||'').trim();const expected=expectedByConstant||expectedByProperty;if(!expected)return true;return expected===(inputApiKey||'')}
function resolvePortalId(inputPortalId){const p=(inputPortalId||'').trim();if(p)return p;const fallback=(PORTAL_ID_DEFAULT||'').trim();if(fallback && !fallback.includes('ganti-portal-id'))return fallback;throw new Error('portalId wajib diisi. Isi di aplikasi atau ubah PORTAL_ID_DEFAULT di script.')}
function getPortalConfig(e){const portalId=resolvePortalId(e.parameter.portalId);const apiKey=(e.parameter.apiKey||'').trim();if(!authCheck(apiKey))throw new Error('API key tidak valid.');const sh=ensureSheet(SHEET_PORTALS,getPortalHeaders());const values=sh.getDataRange().getValues();const headers=values.shift();const idxPortal=headers.indexOf('portalId');for(let i=values.length-1;i>=0;i--){if((values[i][idxPortal]||'').toString().trim()===portalId){const payloadJson=mergePayloadFromRow(headers,values[i]);const payload=JSON.parse(payloadJson||'{}');return {success:true,data:{settings:payload.settings||null,santriSummary:payload.santriSummary||[]}};}}return {success:false,message:'Data portal tidak ditemukan.'};}
function upsertPortalConfig(body){const portalId=resolvePortalId(body.portalId);const apiKey=(body.apiKey||'').trim();const payload=body.payload||{};if(!authCheck(apiKey))throw new Error('API key tidak valid.');const portalHeaders=getPortalHeaders();const sh=ensureSheet(SHEET_PORTALS,portalHeaders);const values=sh.getDataRange().getValues();const headers=values.shift();const idxPortal=headers.indexOf('portalId');let targetRow=-1;for(let i=0;i<values.length;i++){if((values[i][idxPortal]||'').toString().trim()===portalId){targetRow=i+2;break;}}const payloadJson=JSON.stringify(payload);const payloadParts=splitPayload(payloadJson);const rowData=new Array(portalHeaders.length).fill('');rowData[portalHeaders.indexOf('portalId')]=portalId;rowData[portalHeaders.indexOf('updatedAt')]=new Date().toISOString();rowData[portalHeaders.indexOf('partCount')]=payloadParts.length;rowData[portalHeaders.indexOf('payloadSize')]=payloadJson.length;for(let i=0;i<payloadParts.length;i++){rowData[portalHeaders.indexOf('payloadPart'+(i+1))]=payloadParts[i];}if(targetRow>0){sh.getRange(targetRow,1,1,rowData.length).setValues([rowData]);}else{sh.appendRow(rowData);}const logSh=ensureSheet(SHEET_SYNC_LOGS,['loggedAt','portalId','status','santriCount','payloadSize','note']);const count=Array.isArray(payload.santriSummary)?payload.santriSummary.length:0;logSh.appendRow([new Date().toISOString(),portalId,targetRow>0?'updated':'inserted',count,payloadJson.length,'upsertPortalConfig']);return {success:true,message:'Portal config tersimpan.'};}
function submitPortalPsb(body){const portalId=resolvePortalId(body.portalId);const apiKey=(body.apiKey||'').trim();const fields=body.fields||{};const submittedAt=body.submittedAt||new Date().toISOString();if(!authCheck(apiKey))throw new Error('API key tidak valid.');const sh=ensureSheet(SHEET_PSB,['submittedAt','portalId','namaLengkap','nisn','nik','jenisKelamin','tanggalLahir','namaWali','teleponWali','rawJson']);sh.appendRow([submittedAt,portalId,fields.namaLengkap||'',fields.nisn||'',fields.nik||'',fields.jenisKelamin||'',fields.tanggalLahir||'',fields.namaWali||'',fields.teleponWali||'',JSON.stringify(fields)]);return {success:true,message:'Pendaftaran berhasil tersimpan.'};}`;

    return (
        <div className="flex flex-col items-start gap-6 lg:flex-row">
            <div className="flex-1 w-full min-w-0 space-y-6">
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
                            <div className="flex flex-col gap-6 md:flex-row md:items-start">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <i className="bi bi-link-45deg text-blue-600 text-xl"></i>
                                        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">URL Portal Wali Santri</h3>
                                    </div>
                                    <p className="text-xs text-blue-700 mb-3">Bagikan link ini kepada wali santri agar mereka bisa mengakses portal.</p>
                                    
                                    {portalUrl ? (
                                        <div className="space-y-3">
                                            <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
                                                <div className="min-w-0 flex-1 overflow-hidden rounded border border-blue-300 bg-white">
                                                    <div className="overflow-x-auto p-2 font-mono text-sm text-blue-900 whitespace-nowrap">
                                                        {portalUrl}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(portalUrl);
                                                        showToast('Link portal disalin!', 'success');
                                                    }}
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 md:shrink-0"
                                                >
                                                    <i className="bi bi-clipboard"></i> Salin URL
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
                                    <div className="shrink-0 flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
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
                            onClick={() => { void handleSavePortalSettings(); }}
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
