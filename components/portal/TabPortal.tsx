import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { PondokSettings, PortalConfig, PortalContact, PortalAnnouncementPost, PortalProvider } from '../../types';
import { useAppContext } from '../../AppContext';
import { SectionCard } from '../common/SectionCard';
import {
    encodePortalKey,
    getPortalGasScriptV2,
    getPortalCloudflareWorkerScript,
    getPortalSupabaseSchemaSql,
    getPortalFirebaseGuide,
    syncPortalData,
    syncPortalBridgeToGas,
} from '../../services/portalGasService';
import { downloadStandalonePortalHtml } from '../../utils/portalStandaloneGenerator';
import { auth, isFirebaseClientConfigReady } from '../../firebase';
import { extractDriveFolderId } from '../psb/utils/psbUtils';
import { generatePsbAdminKey, generatePsbPublicKey } from '../../services/psbCloudService';
import { generatePortalPin, normalizePortalPin } from '../../services/e2eeService';

interface TabPortalProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
    onSaveSettings?: (newSettings: PondokSettings) => Promise<void>;
    canWrite?: boolean;
    onSwitchToPreview?: () => void;
}

const DEFAULT_PORTAL_CONFIG: PortalConfig = {
    enabled: false,
    provider: 'gas',
    portalId: 'default-portal',
    gasEndpoint: '',
    gasApiKey: '',
    gasPublicKey: '',
    gasAdminKey: '',
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
    baseUrl: '',
    useStandaloneUrl: false,
};

export const TabPortal: React.FC<TabPortalProps> = ({
    localSettings,
    setLocalSettings,
    onSaveSettings,
    canWrite: canWriteProp,
    onSwitchToPreview,
}) => {
    const { showToast, settings, currentUser } = useAppContext();
    const canWrite =
        canWriteProp ??
        (currentUser?.role === 'admin' ||
            currentUser?.permissions?.portalwali === 'write' ||
            currentUser?.permissions?.pengaturan === 'write');
    const [showGasScriptModal, setShowGasScriptModal] = useState(false);
    const [showCloudflareModal, setShowCloudflareModal] = useState(false);
    const [showSupabaseModal, setShowSupabaseModal] = useState(false);
    const [showFirebaseModal, setShowFirebaseModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showAdminKey, setShowAdminKey] = useState(false);
    const [pinSearch, setPinSearch] = useState('');
    const [revealedPinIds, setRevealedPinIds] = useState<Record<number, boolean>>({});
    const [showPinTable, setShowPinTable] = useState(false);
    const [isPublishingWithPin, setIsPublishingWithPin] = useState(false);

    const activeSantriList =
        useLiveQuery(
            () => db.santri.filter((s) => !s.deleted && (s.status || '').trim().toLowerCase() === 'aktif').toArray(),
            []
        ) || [];
    const missingPinSantri = activeSantriList.filter((s) => !normalizePortalPin(s.portalPin));

    // State form pengumuman baru
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');

    const portalConfig: PortalConfig = {
        ...DEFAULT_PORTAL_CONFIG,
        ...(localSettings.portalConfig || {}),
    };

    const handlePortalConfigChange = <K extends keyof PortalConfig>(
        key: K,
        value: PortalConfig[K]
    ) => {
        if (!canWrite) return;
        setLocalSettings((prev) => ({
            ...prev,
            portalConfig: {
                ...DEFAULT_PORTAL_CONFIG,
                ...(prev.portalConfig || {}),
                [key]: value,
            },
        }));
    };

    const effectiveGasPublicKey = (portalConfig.gasPublicKey || portalConfig.gasApiKey || '').trim();
    const effectiveGasAdminKey = (portalConfig.gasAdminKey || '').trim();

    const encryptedKey =
        portalConfig.gasEndpoint?.trim() && portalConfig.portalId?.trim()
            ? encodePortalKey(
                  portalConfig.gasEndpoint.trim(),
                  portalConfig.portalId.trim(),
                  effectiveGasPublicKey
              )
            : '';

    const firebaseTenantId =
        localSettings.cloudSyncConfig?.firebasePairedTenantId?.trim() ||
        auth?.currentUser?.uid ||
        portalConfig.portalId?.trim() ||
        'default-portal';

    const originUrl = (portalConfig.baseUrl?.trim() || window.location.origin).replace(/\/+$/, '');
    const encryptedPortalLink = portalConfig.provider === 'firebase'
        ? `${originUrl}/?portal=true&tenant=${encodeURIComponent(firebaseTenantId)}`
        : encryptedKey
            ? `${originUrl}/?portal=true#k=${encodeURIComponent(encryptedKey)}`
            : portalConfig.portalId?.trim()
                ? `${originUrl}/?portal=true&tenant=${encodeURIComponent(portalConfig.portalId.trim())}`
                : `${originUrl}/?portal=true`;

    const standaloneUrl = (portalConfig as any).standalonePublicUrl?.trim() || '';
    const activeShareUrl = standaloneUrl || encryptedPortalLink;

    const handleCopyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`${label} berhasil disalin!`, 'success');
    };

    const generateMissingSantriPins = async (): Promise<number> => {
        const currentList = await db.santri
            .filter((s) => !s.deleted && (s.status || '').trim().toLowerCase() === 'aktif')
            .toArray();
        const missing = currentList.filter((s) => !normalizePortalPin(s.portalPin));
        if (missing.length === 0) return 0;
        const now = Date.now();
        await db.santri.bulkPut(
            missing.map((s) => ({
                ...s,
                portalPin: generatePortalPin(6),
                lastModified: now,
            }))
        );
        return missing.length;
    };

    const handleGenerateMissingPins = async () => {
        if (!canWrite) return;
        try {
            const created = await generateMissingSantriPins();
            if (created === 0) {
                showToast('Semua santri aktif sudah memiliki PIN Portal.', 'info');
            } else {
                showToast(`Berhasil membuat PIN acak 6 digit untuk ${created} santri aktif.`, 'success');
            }
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal membuat PIN santri.', 'error');
        }
    };

    const handleRegenerateSinglePin = async (santriId: number, nama: string) => {
        if (!canWrite) return;
        try {
            const newPin = generatePortalPin(6);
            await db.santri.update(santriId, {
                portalPin: newPin,
                lastModified: Date.now(),
            });
            setRevealedPinIds((prev) => ({ ...prev, [santriId]: true }));
            showToast(`PIN baru untuk ${nama} dibuat. Jangan lupa klik Simpan & Sinkronkan Portal.`, 'success');
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal mengacak ulang PIN santri.', 'error');
        }
    };

    const handlePublishPortalWithPin = async () => {
        if (!canWrite) return;
        setIsPublishingWithPin(true);
        try {
            const createdCount = await generateMissingSantriPins();
            const updatedConfig: PortalConfig = {
                ...portalConfig,
                portalRequirePin: true,
            };
            const nextSettings: PondokSettings = {
                ...localSettings,
                portalConfig: updatedConfig,
            };
            setLocalSettings(nextSettings);

            const provider = updatedConfig.provider || 'gas';
            const canRemoteSync =
                (provider === 'gas' && Boolean(updatedConfig.gasEndpoint?.trim())) ||
                (provider === 'cloudflare' && Boolean(updatedConfig.cloudflareWorkerUrl?.trim())) ||
                (provider === 'supabase' && Boolean(updatedConfig.supabaseUrl?.trim() && updatedConfig.supabaseAnonKey?.trim())) ||
                (provider === 'firebase' && Boolean(isFirebaseClientConfigReady && (localSettings.cloudSyncConfig?.firebasePairedTenantId?.trim() || auth?.currentUser?.uid)));

            let syncedSettings = nextSettings;
            let syncedMsg = '';
            if (canRemoteSync) {
                const res = await syncPortalData(nextSettings);
                syncedSettings = {
                    ...nextSettings,
                    portalConfig: {
                        ...updatedConfig,
                        lastSyncedAt: res.syncedAt,
                        lastSyncedCount: res.santriCount,
                        lastPayloadSize: res.payloadSize,
                    },
                };
                setLocalSettings(syncedSettings);
                syncedMsg = ` dan menyinkronkan ${res.santriCount} santri ke ${res.providerName}`;
            }

            if (onSaveSettings) {
                const dataToSave = { ...syncedSettings };
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
            }

            showToast(
                `Mode PIN Portal diaktifkan${createdCount > 0 ? ` (${createdCount} PIN baru dibuat)` : ''}${syncedMsg}.${!canRemoteSync && provider === 'standalone' ? ' Silakan unduh ulang HTML Mandiri.' : ''}`,
                'success'
            );
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal menerbitkan ulang portal dengan PIN.', 'error');
        } finally {
            setIsPublishingWithPin(false);
        }
    };

    const escapePinText = (val: string) =>
        String(val || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const handleExportPinCsv = () => {
        const escapeCsvCell = (raw: string) => {
            const s = String(raw || '');
            const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
            return `"${safe.replace(/"/g, '""')}"`;
        };
        const rows = [['NIS', 'Nama Lengkap', 'Tanggal Lahir', 'PIN Portal']];
        activeSantriList.forEach((s) => {
            rows.push([
                s.nis || '',
                s.namaLengkap || '',
                s.tanggalLahir || '',
                normalizePortalPin(s.portalPin) || '(Belum dibuat)',
            ]);
        });
        const csv = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pin-portal-santri-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    const handlePrintPinCards = () => {
        if (activeSantriList.length === 0) {
            showToast('Belum ada data santri aktif untuk dicetak.', 'info');
            return;
        }
        const cardsHtml = activeSantriList
            .map((s) => {
                const pin = normalizePortalPin(s.portalPin) || 'BELUM ADA';
                return `<div class="card">
                    <div class="ponpes">${escapePinText(localSettings.namaPonpes || 'Pondok Pesantren')}</div>
                    <div class="sub">Kartu Akses Portal Wali Santri</div>
                    <div class="row"><span>Nama</span><strong>${escapePinText(s.namaLengkap || '-')}</strong></div>
                    <div class="row"><span>NIS</span><strong>${escapePinText(s.nis || '-')}</strong></div>
                    <div class="row"><span>Tgl Lahir</span><strong>${escapePinText(s.tanggalLahir || '-')}</strong></div>
                    <div class="pin-box">PIN: <span>${escapePinText(pin)}</span></div>
                </div>`;
            })
            .join('');

        const docHtml = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8" /><title>Kartu PIN Portal Wali Santri</title>
        <style>
            body{font-family:sans-serif;padding:16px;color:#0f172a}
            .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
            .card{border:1px solid #cbd5e1;border-radius:10px;padding:12px;page-break-inside:avoid}
            .ponpes{font-size:12px;font-weight:800;color:#0f766e}
            .sub{font-size:10px;color:#64748b;margin-bottom:8px}
            .row{display:flex;justify-content:space-between;font-size:11px;margin:3px 0;border-bottom:1px dashed #e2e8f0;padding-bottom:2px}
            .pin-box{margin-top:8px;padding:6px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;text-align:center;font-size:13px;font-weight:800;letter-spacing:2px}
        </style></head><body><div class="grid">${cardsHtml}</div></body></html>`;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.srcdoc = docHtml;
        iframe.onload = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } finally {
                setTimeout(() => {
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                }, 1500);
            }
        };
        document.body.appendChild(iframe);
    };

    const handleDownloadStandalone = () => {
        if (!canWrite) return;
        try {
            const provider = portalConfig.provider || 'gas';
            if (provider === 'gas' && !portalConfig.gasEndpoint?.trim()) {
                showToast('Isi URL Web App Google Apps Script di form pengaturan terlebih dahulu.', 'error');
                return;
            }
            if (provider === 'cloudflare' && !portalConfig.cloudflareWorkerUrl?.trim()) {
                showToast('Isi URL Cloudflare Worker di form pengaturan terlebih dahulu.', 'error');
                return;
            }
            if (provider === 'supabase' && (!portalConfig.supabaseUrl?.trim() || !portalConfig.supabaseAnonKey?.trim())) {
                showToast('Isi URL Supabase dan Public Anon Key di form pengaturan terlebih dahulu.', 'error');
                return;
            }
            if (provider === 'firebase' && !isFirebaseClientConfigReady) {
                showToast('Konfigurasi Firebase belum aktif. Atur project Firebase di Pengaturan > Sinkronisasi Cloud terlebih dahulu.', 'error');
                return;
            }
            downloadStandalonePortalHtml(localSettings);
            showToast('File index.html Portal Wali Mandiri berhasil diunduh!', 'success');
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal membuat file HTML mandiri.', 'error');
        }
    };

    const handleSyncNow = async () => {
        if (!canWrite) return;
        const provider = portalConfig.provider || 'gas';
        if (provider === 'gas' && !portalConfig.gasEndpoint?.trim()) {
            showToast('Isi URL Web App Google Apps Script (GAS) terlebih dahulu.', 'error');
            return;
        }
        if (provider === 'gas' && effectiveGasAdminKey && effectiveGasAdminKey === effectiveGasPublicKey) {
            showToast('Kunci Admin GAS (ADMIN_KEY) tidak boleh sama dengan Kunci Publik (PUBLIC_KEY).', 'error');
            return;
        }
        if (provider === 'cloudflare' && !portalConfig.cloudflareWorkerUrl?.trim()) {
            showToast('Isi URL Cloudflare Worker terlebih dahulu.', 'error');
            return;
        }
        if (provider === 'supabase' && (!portalConfig.supabaseUrl?.trim() || !portalConfig.supabaseAnonKey?.trim())) {
            showToast('Isi URL Supabase dan Public Anon Key terlebih dahulu.', 'error');
            return;
        }
        if (provider === 'firebase' && (!isFirebaseClientConfigReady || (!localSettings.cloudSyncConfig?.firebasePairedTenantId?.trim() && !auth?.currentUser?.uid))) {
            showToast('Firebase belum terhubung / admin belum login Firebase Sync di Pengaturan > Sinkronisasi Cloud.', 'error');
            return;
        }
        setIsSyncing(true);
        try {
            const res = await syncPortalData(localSettings);
            const updatedPortal: any = {
                ...portalConfig,
                lastSyncedAt: res.syncedAt,
                lastSyncedCount: res.santriCount,
                lastPayloadSize: res.payloadSize,
            };
            const nextSettings: PondokSettings = {
                ...localSettings,
                portalConfig: updatedPortal,
            };
            setLocalSettings(nextSettings);
            if (onSaveSettings) {
                const dataToSave = { ...nextSettings };
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
            }
            showToast(`Berhasil sinkronisasi ${res.santriCount} data santri ke ${res.providerName}!`, 'success');
        } catch (err) {
            showToast((err as Error)?.message || 'Gagal sinkronisasi ke provider portal.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSaveConfiguration = async () => {
        if (!canWrite || !onSaveSettings) return;
        setIsSaving(true);
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
            showToast('Pengaturan Portal Wali berhasil disimpan!', 'success');
        } catch (err) {
            showToast('Gagal menyimpan pengaturan Portal Wali.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Pengumuman Pondok (Multi-Post)
    const posts: PortalAnnouncementPost[] = Array.isArray(portalConfig.announcementPosts)
        ? portalConfig.announcementPosts
        : [];

    const handleAddAnnouncementPost = () => {
        if (!newPostTitle.trim() || !newPostContent.trim()) {
            showToast('Judul dan isi pengumuman wajib diisi.', 'error');
            return;
        }
        const newPost: PortalAnnouncementPost = {
            id: `post-${Date.now()}`,
            title: newPostTitle.trim(),
            content: newPostContent.trim(),
            publishedAt: new Date().toISOString().split('T')[0],
            isPublished: true,
        };
        handlePortalConfigChange('announcementPosts', [newPost, ...posts]);
        setNewPostTitle('');
        setNewPostContent('');
        showToast('Pengumuman ditambahkan. Klik Simpan & Sinkronkan untuk menayangkan.', 'info');
    };

    const handleTogglePostPublish = (id: string) => {
        handlePortalConfigChange(
            'announcementPosts',
            posts.map((p) => (p.id === id ? { ...p, isPublished: !p.isPublished } : p))
        );
    };

    const handleDeletePost = (id: string) => {
        handlePortalConfigChange(
            'announcementPosts',
            posts.filter((p) => p.id !== id)
        );
    };

    // Kontak & Rekening
    const contacts: PortalContact[] = Array.isArray(portalConfig.contacts) ? portalConfig.contacts : [];

    const handleAddContact = (preset?: Partial<PortalContact>) => {
        const next: PortalContact = {
            id: `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            label: preset?.label || 'WA Bendahara / Konfirmasi SPP',
            value: preset?.value || '081234567890',
            icon: preset?.icon || 'bi-whatsapp',
        };
        handlePortalConfigChange('contacts', [...contacts, next]);
    };

    const handleUpdateContact = (id: string, field: keyof PortalContact, val: string) => {
        handlePortalConfigChange(
            'contacts',
            contacts.map((c) => (c.id === id ? { ...c, [field]: val } : c))
        );
    };

    const handleRemoveContact = (id: string) => {
        handlePortalConfigChange(
            'contacts',
            contacts.filter((c) => c.id !== id)
        );
    };

    // Custom Links (Tautan Penting / Brosur / QRIS)
    const customLinks = Array.isArray(portalConfig.customLinks) ? portalConfig.customLinks : [];

    const handleAddCustomLink = () => {
        handlePortalConfigChange('customLinks', [
            ...customLinks,
            { label: 'Brosur / Info Pondok', url: 'https://' },
        ]);
    };

    const handleUpdateCustomLink = (idx: number, field: 'label' | 'url', val: string) => {
        handlePortalConfigChange(
            'customLinks',
            customLinks.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
        );
    };

    const handleRemoveCustomLink = (idx: number) => {
        handlePortalConfigChange(
            'customLinks',
            customLinks.filter((_, i) => i !== idx)
        );
    };

    const gasScriptV2 = getPortalGasScriptV2(
        portalConfig.portalId || 'ponpes-alikhlas',
        extractDriveFolderId(localSettings.psbConfig?.driveFolderId || ''),
        effectiveGasPublicKey,
        effectiveGasAdminKey
    );

    const getStandaloneCardInfo = () => {
        const p = portalConfig.provider || 'gas';
        switch (p) {
            case 'cloudflare':
                return {
                    title: 'Opsi 1 (Rekomendasi): File HTML Mandiri (Cloudflare Edge)',
                    badge: 'Cloudflare Worker',
                    desc: (
                        <>
                            Unduh file <code>index.html</code> mandiri yang sudah terkonfigurasi dengan endpoint Cloudflare Worker resmi pondok. Cukup upload 1 kali ke <strong>Cloudflare Pages</strong> atau <strong>Netlify Drop</strong> gratis untuk mendapatkan domain resmi pondok (contoh: <code>wali.pesantren.sch.id</code>).
                        </>
                    ),
                    btnText: 'Download HTML Mandiri (Cloudflare)',
                };
            case 'supabase':
                return {
                    title: 'Opsi 1 (Rekomendasi): File HTML Mandiri (Supabase REST)',
                    badge: 'Supabase PostgreSQL',
                    desc: (
                        <>
                            Unduh file <code>index.html</code> mandiri yang siap terhubung langsung ke REST API Supabase pondok dengan proteksi Row-Level Security. Cukup unggah 1 kali ke <strong>Cloudflare Pages</strong> atau <strong>Netlify Drop</strong> gratis.
                        </>
                    ),
                    btnText: 'Download HTML Mandiri (Supabase)',
                };
            case 'firebase':
                return {
                    title: 'Opsi 1: File HTML Mandiri (Firebase Firestore)',
                    badge: 'Firebase Cloud',
                    desc: (
                        <>
                            Unduh file <code>index.html</code> mandiri yang terhubung dengan dokumen Firestore publik pondok. Dapat dihosting di <strong>Firebase Hosting</strong>, <strong>Cloudflare Pages</strong>, atau <strong>Netlify</strong>.
                        </>
                    ),
                    btnText: 'Download HTML Mandiri (Firebase)',
                };
            case 'standalone':
                return {
                    title: 'Opsi 1: File HTML Mandiri (Zero-Cloud Bundle)',
                    badge: 'Zero Backend',
                    desc: (
                        <>
                            Unduh file <code>index.html</code> mandiri yang memuat seluruh snapshot data santri terenkripsi di dalamnya. Cukup drag &amp; drop ke hosting statis apa pun (<strong>Netlify Drop</strong>, <strong>GitHub Pages</strong>, atau <strong>Vercel</strong>) tanpa database cloud.
                        </>
                    ),
                    btnText: 'Download HTML Mandiri (Zero-Cloud)',
                };
            case 'gas':
            default:
                return {
                    title: 'Opsi 1 (Rekomendasi): File HTML Mandiri (Cloudflare / Netlify)',
                    badge: 'GAS v2.0 Terenkripsi',
                    desc: (
                        <>
                            Unduh file <code>index.html</code> yang sudah berisi kode aplikasi Portal Wali + endpoint Google Apps Script yang dienkripsi (XOR Cipher + Base64). Upload 1 kali ke <strong>Cloudflare Pages</strong> atau <strong>Netlify Drop</strong> gratis untuk domain pendek resmi pondok.
                        </>
                    ),
                    btnText: 'Download File index.html Mandiri',
                };
        }
    };

    const getDirectLinkInfo = () => {
        const p = portalConfig.provider || 'gas';
        switch (p) {
            case 'cloudflare':
                return {
                    title: 'Opsi 2: Tautan Langsung Portal (Cloudflare Worker)',
                    badge: 'Cloudflare Edge',
                    desc: 'Tautan web portal eSantri yang membaca data dari endpoint Cloudflare Worker pondok:',
                };
            case 'supabase':
                return {
                    title: 'Opsi 2: Tautan Langsung Portal (Supabase)',
                    badge: 'Supabase PostgreSQL',
                    desc: 'Tautan web portal eSantri yang membaca data dari Supabase PostgreSQL REST API pondok:',
                };
            case 'firebase':
                return {
                    title: 'Opsi 2: Tautan Langsung Portal (Firebase Firestore)',
                    badge: 'Firestore Live',
                    desc: 'Tautan web portal eSantri yang terhubung ke dokumen Firestore publik pondok:',
                };
            case 'standalone':
                return {
                    title: 'Opsi 2: Tautan Portal Terpasang (Standalone)',
                    badge: 'Static Hosting',
                    desc: 'Tautan web portal eSantri atau domain mandiri tempat file index.html di-host:',
                };
            case 'gas':
            default:
                return {
                    title: 'Opsi 2: Tautan Portal Terenkripsi (Fragment #k=ep2_...)',
                    badge: 'Tanpa Hosting Tambahan',
                    desc: 'Tautan langsung yang menyamarkan URL GAS & token ke dalam fragment URL #k=ep2_... (tidak terkirim ke server log):',
                };
        }
    };

    const standaloneInfo = getStandaloneCardInfo();
    const directInfo = getDirectLinkInfo();

    return (
        <div className="space-y-6">
            {/* 1. Pemilihan Provider Cloud & Keamanan Tautan */}
            <SectionCard
                title="Pilihan Provider Backend Cloud & Keamanan Portal"
                description="Pilih infrastruktur backend untuk Portal Wali Santri: Google Apps Script (Gratis), Cloudflare Worker/Pages, Firebase Firestore, Supabase PostgreSQL, atau File HTML Mandiri."
                contentClassName="p-6 space-y-6"
            >
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-teal-200 bg-teal-50/70 p-4">
                    <label className="inline-flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={portalConfig.enabled}
                            onChange={(e) => handlePortalConfigChange('enabled', e.target.checked)}
                            className="h-5 w-5 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                            <span className="text-sm font-bold text-teal-950 block">
                                Aktifkan Layanan Portal Wali Santri
                            </span>
                            <span className="text-xs text-teal-800">
                                Wali santri dapat login menggunakan NIS &amp; Tanggal Lahir untuk memantau perkembangan putra/putrinya.
                            </span>
                        </div>
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                        {onSwitchToPreview && (
                            <button
                                type="button"
                                onClick={onSwitchToPreview}
                                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white transition-colors shadow-2xs"
                            >
                                <i className="bi bi-phone"></i>
                                Buka Simulator Live (Pratinjau)
                            </button>
                        )}
                        <a
                            href="/?portal=true&preview=true"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-600 bg-white px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors"
                        >
                            <i className="bi bi-box-arrow-up-right"></i>
                            Buka di Tab Baru
                        </a>
                    </div>
                </div>

                {/* Pemilihan Arsitektur / Provider Backend */}
                <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                        Pilih Provider Backend Portal Wali:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {[
                            {
                                id: 'gas' as const,
                                name: 'Google Apps Script (GAS)',
                                badge: 'Gratis 100%',
                                badgeColor: 'bg-emerald-100 text-emerald-800',
                                desc: 'Menggunakan Google Spreadsheet & Apps Script v2.0 sebagai database tanpa perlu sewa server.',
                                icon: 'bi-google text-emerald-600',
                            },
                            {
                                id: 'cloudflare' as const,
                                name: 'Cloudflare Pages & Worker',
                                badge: 'Ultra Cepat',
                                badgeColor: 'bg-amber-100 text-amber-800',
                                desc: 'Edge serverless global dengan latensi rendah (<50ms) dan dukungan custom domain gratis.',
                                icon: 'bi-lightning-charge-fill text-amber-600',
                            },
                            {
                                id: 'firebase' as const,
                                name: 'Firebase Firestore',
                                badge: 'Real-Time Sync',
                                badgeColor: 'bg-orange-100 text-orange-800',
                                desc: 'Database NoSQL real-time Google Cloud terintegrasi langsung untuk live update instan.',
                                icon: 'bi-fire text-orange-600',
                            },
                            {
                                id: 'supabase' as const,
                                name: 'Supabase Cloud',
                                badge: 'PostgreSQL REST',
                                badgeColor: 'bg-emerald-100 text-emerald-900',
                                desc: 'Database relasional PostgreSQL dengan REST API aman dan Row-Level Security (RLS).',
                                icon: 'bi-database-fill-check text-emerald-700',
                            },
                            {
                                id: 'standalone' as const,
                                name: 'HTML Mandiri Terenkripsi',
                                badge: 'Zero Cloud',
                                badgeColor: 'bg-purple-100 text-purple-800',
                                desc: 'Satu file HTML statis berisi aplikasi portal + data terenkripsi untuk Netlify Drop/GitHub Pages.',
                                icon: 'bi-filetype-html text-purple-600',
                            },
                        ].map((prov) => {
                            const isSelected = (portalConfig.provider || 'gas') === prov.id;
                            return (
                                <button
                                    key={prov.id}
                                    type="button"
                                    onClick={() => handlePortalConfigChange('provider', prov.id)}
                                    className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                                        isSelected
                                            ? 'border-teal-500 bg-teal-50/70 shadow-sm ring-2 ring-teal-500/20'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                            <i className={`bi ${prov.icon} text-base`}></i>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prov.badgeColor}`}>
                                                {prov.badge}
                                            </span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-800">{prov.name}</div>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{prov.desc}</p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex items-center text-[11px] font-semibold text-teal-700">
                                        {isSelected ? (
                                            <span className="flex items-center gap-1">
                                                <i className="bi bi-check-circle-fill text-teal-600"></i> Aktif
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">Pilih Opsi Ini</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {Boolean(localSettings.e2eeConfig?.enabled && localSettings.e2eeConfig?.modules?.portal) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                        <i className="bi bi-shield-exclamation text-amber-600 text-base shrink-0 mt-0.5"></i>
                        <div className="leading-relaxed">
                            <span className="font-bold">Catatan Keamanan E2EE Portal:</span>{' '}
                            {(portalConfig.provider || 'gas') === 'firebase' ? (
                                <>Mode <strong>Firebase Firestore</strong> kini mengisolasi setiap santri pada dokumen individual terenkripsi (<code>entries/{'{hash}'}</code>) sehingga wali hanya mengunduh data anaknya sendiri.</>
                            ) : ['supabase', 'standalone'].includes(portalConfig.provider || 'gas') ? (
                                <>Penyedia <strong>{portalConfig.provider === 'supabase' ? 'Supabase REST' : 'HTML Mandiri Statis'}</strong> mengunduh daftar terenkripsi ke browser pengakses sebelum dicocokkan dengan kredensial santri. Meski dilindungi enkripsi AES-GCM &amp; PBKDF2 600.000 iterasi (v3), untuk isolasi server-side penuh gunakan <strong>GAS v2.0</strong>, <strong>Cloudflare Worker</strong>, atau <strong>Firebase</strong>.</>
                            ) : (
                                <>Enkripsi <strong>PBKDF2 600.000 iterasi (v3) + AES-GCM</strong> aktif. Pastikan Anda menekan tombol <strong>Sinkronkan Sekarang</strong> (dan generate ulang HTML jika memakai mode mandiri) setelah mengaktifkan/memperbarui E2EE Portal.</>
                            )}
                        </div>
                    </div>
                )}

                {/* Form Spesifik Provider */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                    {/* Common Field: Portal ID & Tema Warna */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Portal ID Unik Pondok
                            </label>
                            <input
                                type="text"
                                value={portalConfig.portalId || ''}
                                onChange={(e) => handlePortalConfigChange('portalId', e.target.value)}
                                placeholder="Contoh: ponpes-alikhlas"
                                className="app-input block w-full p-2.5 text-sm font-mono"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                Pengenal unik pondok Anda di cloud backend.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                URL Publik Mandiri (Custom Domain / Cloudflare Pages)
                            </label>
                            <input
                                type="url"
                                value={(portalConfig as any).standalonePublicUrl || ''}
                                onChange={(e) =>
                                    handlePortalConfigChange('standalonePublicUrl' as any, e.target.value as any)
                                }
                                placeholder="Contoh: https://wali.ponpes-alikhlas.sch.id"
                                className="app-input block w-full p-2.5 text-sm"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                Domain publik santun untuk disebarkan via WhatsApp.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tema Warna Portal Wali
                            </label>
                            <select
                                value={portalConfig.theme || 'teal'}
                                onChange={(e) => handlePortalConfigChange('theme', e.target.value as any)}
                                className="app-select block w-full p-2.5 text-sm"
                            >
                                <option value="teal">Teal Emerald (Khas Pesantren)</option>
                                <option value="emerald">Hijau Zamrud</option>
                                <option value="blue">Biru Akademik</option>
                                <option value="indigo">Indigo Modern</option>
                                <option value="cyan">Cyan Segar</option>
                                <option value="slate">Slate Formal</option>
                                <option value="rose">Maroon / Rose</option>
                            </select>
                        </div>
                    </div>

                    {/* Conditional: GAS v2.0 */}
                    {(!portalConfig.provider || portalConfig.provider === 'gas') && (
                        <div className="space-y-3 pt-2 border-t border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <i className="bi bi-google text-emerald-600"></i>
                                    Konfigurasi Google Apps Script (GAS v2.0)
                                </span>
                                {canWrite && (
                                    <button
                                        type="button"
                                        onClick={() => setShowGasScriptModal(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 transition-colors"
                                    >
                                        <i className="bi bi-file-earmark-code"></i>
                                        Lihat &amp; Salin Script GAS v2.0
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        URL Web App Google Apps Script (Endpoint <code>/exec</code>)
                                    </label>
                                    <input
                                        type="url"
                                        value={portalConfig.gasEndpoint || ''}
                                        onChange={(e) => handlePortalConfigChange('gasEndpoint', e.target.value)}
                                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                                        className="app-input block w-full p-2.5 text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Kunci Kirim Publik (<code>PUBLIC_KEY</code>)
                                        </label>
                                        {canWrite && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextPub = generatePsbPublicKey();
                                                    setLocalSettings((prev) => ({
                                                        ...prev,
                                                        portalConfig: {
                                                            ...DEFAULT_PORTAL_CONFIG,
                                                            ...(prev.portalConfig || {}),
                                                            gasPublicKey: nextPub,
                                                            gasApiKey: nextPub,
                                                        },
                                                    }));
                                                }}
                                                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-white border border-teal-300 px-2 py-0.5 rounded-md cursor-pointer"
                                            >
                                                <i className="bi bi-shuffle mr-1"></i>Acak Ulang
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={canWrite && showApiKey ? 'text' : 'password'}
                                            value={portalConfig.gasPublicKey ?? portalConfig.gasApiKey ?? ''}
                                            readOnly={!canWrite}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setLocalSettings((prev) => ({
                                                    ...prev,
                                                    portalConfig: {
                                                        ...DEFAULT_PORTAL_CONFIG,
                                                        ...(prev.portalConfig || {}),
                                                        gasPublicKey: v,
                                                        gasApiKey: v,
                                                    },
                                                }));
                                            }}
                                            placeholder="pub_... (anti-penyalahgunaan & rotasi)"
                                            className="app-input block w-full p-2.5 pr-9 text-sm font-mono"
                                        />
                                        {canWrite && (
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey((prev) => !prev)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <i className={`bi ${showApiKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Boleh tertanam di tautan/HTML publik (bukan rahasia — untuk baca profil publik &amp; kirim PSB).
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Kunci Admin (<code>ADMIN_KEY</code> — Rahasia)
                                        </label>
                                        {canWrite && (
                                            <button
                                                type="button"
                                                onClick={() => handlePortalConfigChange('gasAdminKey', generatePsbAdminKey(effectiveGasPublicKey))}
                                                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-white border border-rose-300 px-2 py-0.5 rounded-md cursor-pointer"
                                            >
                                                <i className="bi bi-key-fill mr-1"></i>Acak Ulang
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={canWrite && showAdminKey ? 'text' : 'password'}
                                            value={portalConfig.gasAdminKey || ''}
                                            readOnly={!canWrite}
                                            onChange={(e) => handlePortalConfigChange('gasAdminKey', e.target.value)}
                                            placeholder="adm_... (minimal 32 karakter)"
                                            className="app-input block w-full p-2.5 pr-9 text-sm font-mono"
                                        />
                                        {canWrite && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAdminKey((prev) => !prev)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                <i className={`bi ${showAdminKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-rose-700 mt-1">
                                        Disimpan lokal di perangkat Admin saja (tidak masuk ke tautan/HTML). Wajib untuk sinkronisasi &amp; baca pendaftar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Conditional: Cloudflare Worker */}
                    {portalConfig.provider === 'cloudflare' && (
                        <div className="space-y-3 pt-2 border-t border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <i className="bi bi-lightning-charge-fill text-amber-600"></i>
                                    Konfigurasi Cloudflare Pages &amp; Worker
                                </span>
                                {canWrite && (
                                    <button
                                        type="button"
                                        onClick={() => setShowCloudflareModal(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
                                    >
                                        <i className="bi bi-file-code"></i>
                                        Lihat Kode Worker Script (JS)
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        URL Cloudflare Worker
                                    </label>
                                    <input
                                        type="url"
                                        value={portalConfig.cloudflareWorkerUrl || ''}
                                        onChange={(e) => handlePortalConfigChange('cloudflareWorkerUrl', e.target.value)}
                                        placeholder="https://portal-wali.username.workers.dev"
                                        className="app-input block w-full p-2.5 text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        API Key Worker (Opsional)
                                    </label>
                                    <input
                                        type="password"
                                        value={portalConfig.cloudflareApiKey || ''}
                                        onChange={(e) => handlePortalConfigChange('cloudflareApiKey', e.target.value)}
                                        placeholder="Kunci rahasia X-API-Key"
                                        className="app-input block w-full p-2.5 text-sm font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Conditional: Firebase Firestore */}
                    {portalConfig.provider === 'firebase' && (
                        <div className="space-y-3 pt-2 border-t border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <i className="bi bi-fire text-orange-600"></i>
                                    Konfigurasi Firebase Firestore Cloud
                                </span>
                                {canWrite && (
                                    <button
                                        type="button"
                                        onClick={() => setShowFirebaseModal(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 transition-colors"
                                    >
                                        <i className="bi bi-book"></i>
                                        Panduan Firestore &amp; Security Rules
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Koleksi Firestore Publik (Terisolasi per Santri)
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={`publicPortals/${firebaseTenantId} (+ entries/{hash})`}
                                        className="app-input block w-full p-2.5 text-sm font-mono bg-slate-100"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Profil pondok disimpan di <code>publicPortals/{firebaseTenantId}</code> dan setiap santri diisolasi pada <code>entries/{'{hash}'}</code> agar tidak melebihi batas 1 MiB.
                                    </p>
                                </div>
                                <div className="flex items-center">
                                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-950">
                                        <i className="bi bi-check-circle-fill text-orange-600 mr-1.5"></i>
                                        {isFirebaseClientConfigReady && (localSettings.cloudSyncConfig?.firebasePairedTenantId || auth?.currentUser?.uid)
                                            ? 'Terkoneksi otomatis dengan project Firebase terkonfigurasi. Tidak memerlukan script perantara eksternal.'
                                            : 'Hubungkan akun Firebase terlebih dahulu pada Pengaturan > Sinkronisasi Cloud sebelum melakukan Sinkronisasi Portal.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Conditional: Supabase */}
                    {portalConfig.provider === 'supabase' && (
                        <div className="space-y-3 pt-2 border-t border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <i className="bi bi-database-fill-check text-emerald-700"></i>
                                    Konfigurasi Supabase PostgreSQL REST
                                </span>
                                {canWrite && (
                                    <button
                                        type="button"
                                        onClick={() => setShowSupabaseModal(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                                    >
                                        <i className="bi bi-file-earmark-spreadsheet"></i>
                                        Lihat Skema SQL &amp; RLS Supabase
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Supabase Project URL
                                    </label>
                                    <input
                                        type="url"
                                        value={portalConfig.supabaseUrl || ''}
                                        onChange={(e) => handlePortalConfigChange('supabaseUrl', e.target.value)}
                                        placeholder="https://xyzproject.supabase.co"
                                        className="app-input block w-full p-2.5 text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Anon Public Key (API Key)
                                    </label>
                                    <input
                                        type="password"
                                        value={portalConfig.supabaseAnonKey || ''}
                                        onChange={(e) => handlePortalConfigChange('supabaseAnonKey', e.target.value)}
                                        placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                                        className="app-input block w-full p-2.5 text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Nama Tabel Database
                                    </label>
                                    <input
                                        type="text"
                                        value={portalConfig.supabaseTable || 'portal_data'}
                                        onChange={(e) => handlePortalConfigChange('supabaseTable', e.target.value)}
                                        placeholder="portal_data"
                                        className="app-input block w-full p-2.5 text-sm font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Conditional: Standalone */}
                    {portalConfig.provider === 'standalone' && (
                        <div className="space-y-3 pt-2 border-t border-slate-200">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <i className="bi bi-filetype-html text-purple-600"></i>
                                Paket HTML Mandiri Terenkripsi (Zero-Cloud)
                            </span>
                            <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs text-purple-950 font-semibold leading-relaxed">
                                        Unduh file <code>index.html</code> mandiri lengkap dengan data terenkripsi. Cukup letakkan di Netlify Drop, GitHub Pages, Vercel, atau hosting web statis apa pun milik pondok.
                                    </p>
                                </div>
                                {canWrite && (
                                    <button
                                        type="button"
                                        onClick={handleDownloadStandalone}
                                        className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 text-xs font-bold transition-colors shadow-2xs"
                                    >
                                        <i className="bi bi-download"></i> Unduh File index.html
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Opsi Distribusi Portal: File HTML Mandiri (Cloudflare) vs Tautan Terenkripsi */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-4 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                                    <i className="bi bi-cloud-check-fill text-emerald-600"></i>
                                    {standaloneInfo.title}
                                </span>
                                <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                                    {standaloneInfo.badge}
                                </span>
                            </div>
                            <p className="text-xs text-emerald-900 mt-1.5 leading-relaxed">
                                {standaloneInfo.desc}
                            </p>
                        </div>
                        {canWrite && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleDownloadStandalone}
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold transition-colors shadow-2xs"
                                >
                                    <i className="bi bi-download"></i>
                                    {standaloneInfo.btnText}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between space-y-3">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                    <i className="bi bi-link-45deg text-teal-600 text-base"></i>
                                    {directInfo.title}
                                </span>
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                    {directInfo.badge}
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {directInfo.desc}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={activeShareUrl}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleCopyText(activeShareUrl, 'Tautan Portal Wali')}
                                    className="shrink-0 rounded-lg bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold"
                                >
                                    <i className="bi bi-clipboard mr-1"></i> Salin
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* 1b. Keamanan Login Ganda: PIN Portal Wali Santri (CSPRNG 6 Digit) */}
            <SectionCard
                title="Keamanan Login Ganda: PIN Portal Santri (6 Digit)"
                description="Tambahkan PIN acak 6 digit unik per santri sehingga login Portal Wali tidak hanya bergantung pada NIS dan Tanggal Lahir."
                contentClassName="p-6 space-y-4"
            >
                {(!portalConfig.portalRequirePin || missingPinSantri.length > 0) && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 space-y-2.5">
                        <div className="flex items-start gap-2.5">
                            <i className="bi bi-shield-exclamation text-amber-600 text-lg shrink-0 mt-0.5"></i>
                            <div className="space-y-1">
                                <div className="font-extrabold text-sm text-amber-900">
                                    Rekomendasi Keamanan: Aktifkan PIN Portal untuk Semua Santri
                                </div>
                                <p className="leading-relaxed">
                                    Login portal tanpa PIN (hanya NIS + Tanggal Lahir) mulai dideprekasi karena lebih mudah ditebak. Rekaman portal lama tetap kompatibel selama transisi, namun sebaiknya segera buat PIN 6 digit untuk semua santri aktif ({missingPinSantri.length} dari {activeSantriList.length} santri aktif belum memiliki PIN) lalu terbitkan ulang portal.
                                </p>
                            </div>
                        </div>
                        {canWrite && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handlePublishPortalWithPin}
                                    disabled={isPublishingWithPin}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60"
                                >
                                    <i className={`bi ${isPublishingWithPin ? 'bi-arrow-repeat animate-spin' : 'bi-shield-lock-fill'}`}></i>
                                    {isPublishingWithPin ? 'Menerbitkan Ulang...' : 'Terbitkan ulang portal dengan PIN'}
                                </button>
                                {missingPinSantri.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleGenerateMissingPins}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white hover:bg-amber-100 text-amber-900 px-3.5 py-2 text-xs font-bold transition-colors"
                                    >
                                        <i className="bi bi-key"></i>
                                        Buat PIN Saja ({missingPinSantri.length} Kosong)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <label className="inline-flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={Boolean(portalConfig.portalRequirePin)}
                            disabled={!canWrite}
                            onChange={(e) => handlePortalConfigChange('portalRequirePin', e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                            <span className="text-sm font-bold text-slate-800 block">
                                Wajibkan PIN 6 Digit saat Wali Santri Login
                            </span>
                            <span className="text-xs text-slate-500">
                                Saat E2EE Portal aktif, PIN ikut memperkuat kunci enkripsi (<code>v4:</code> &amp; AES-GCM v3) sehingga data hanya bisa dibuka oleh pemilik NIS, Tanggal Lahir, dan PIN.
                            </span>
                        </div>
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-teal-100 px-3 py-1 text-[11px] font-bold text-teal-900">
                            {activeSantriList.length - missingPinSantri.length} / {activeSantriList.length} Santri Ber-PIN
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowPinTable((prev) => !prev)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                            <i className={`bi ${showPinTable ? 'bi-chevron-up' : 'bi-list-ul'} mr-1`}></i>
                            {showPinTable ? 'Tutup Daftar PIN' : 'Kelola PIN Santri'}
                        </button>
                        <button
                            type="button"
                            onClick={handlePrintPinCards}
                            className="rounded-lg border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100"
                        >
                            <i className="bi bi-printer mr-1"></i>Cetak Kartu PIN
                        </button>
                        <button
                            type="button"
                            onClick={handleExportPinCsv}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                            <i className="bi bi-file-earmark-spreadsheet mr-1"></i>Ekspor CSV
                        </button>
                    </div>
                </div>

                {showPinTable && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <input
                                type="search"
                                value={pinSearch}
                                onChange={(e) => setPinSearch(e.target.value)}
                                placeholder="Cari nama atau NIS santri..."
                                className="app-input w-full sm:w-72 p-2 text-xs"
                            />
                            {canWrite && missingPinSantri.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleGenerateMissingPins}
                                    className="rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 text-xs font-bold"
                                >
                                    <i className="bi bi-magic mr-1"></i>Isi {missingPinSantri.length} PIN Kosong
                                </button>
                            )}
                        </div>
                        <div className="max-h-72 overflow-auto border border-slate-100 rounded-lg">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                                    <tr>
                                        <th className="p-2.5 border-b font-bold">NIS</th>
                                        <th className="p-2.5 border-b font-bold">Nama Santri</th>
                                        <th className="p-2.5 border-b font-bold">PIN Portal</th>
                                        <th className="p-2.5 border-b font-bold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeSantriList
                                        .filter((s) => {
                                            const q = pinSearch.trim().toLowerCase();
                                            if (!q) return true;
                                            return (
                                                (s.namaLengkap || '').toLowerCase().includes(q) ||
                                                (s.nis || '').toLowerCase().includes(q)
                                            );
                                        })
                                        .slice(0, 100)
                                        .map((s) => {
                                            const pin = normalizePortalPin(s.portalPin);
                                            const isShown = Boolean(revealedPinIds[s.id]);
                                            return (
                                                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="p-2.5 font-mono text-slate-700">{s.nis}</td>
                                                    <td className="p-2.5 font-semibold text-slate-800">{s.namaLengkap}</td>
                                                    <td className="p-2.5 font-mono">
                                                        {pin ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-bold tracking-widest text-slate-800">
                                                                {isShown ? pin : '••••••'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-700 font-semibold italic">Belum dibuat</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                                                        {pin && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setRevealedPinIds((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                                                                    }
                                                                    className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                                                >
                                                                    <i className={`bi ${isShown ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCopyText(
                                                                            `Portal Wali Santri\nNama: ${s.namaLengkap}\nNIS: ${s.nis}\nTanggal Lahir: ${s.tanggalLahir}\nPIN: ${pin}`,
                                                                            `Info login ${s.namaLengkap}`
                                                                        )
                                                                    }
                                                                    className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                                                >
                                                                    <i className="bi bi-clipboard mr-1"></i>Salin
                                                                </button>
                                                            </>
                                                        )}
                                                        {canWrite && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRegenerateSinglePin(s.id, s.namaLengkap)}
                                                                className="rounded border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-800 hover:bg-teal-100"
                                                            >
                                                                <i className="bi bi-shuffle mr-1"></i>{pin ? 'Acak Ulang' : 'Buat PIN'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </SectionCard>

            {/* 2. Hak Akses Modul Tampilan Wali Santri */}
            <SectionCard
                title="Hak Akses Informasi & Modul Dasbor Wali Santri"
                description="Pilih modul informasi apa saja yang ditampilkan kepada wali santri setelah login."
                contentClassName="p-6 space-y-4"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                        {
                            key: 'showFinance' as const,
                            label: 'Keuangan, SPP & Tabungan',
                            desc: 'Menampilkan tunggakan tagihan, riwayat pembayaran, saldo tabungan, dan tombol konfirmasi WA.',
                            icon: 'bi-wallet2 text-emerald-600',
                        },
                        {
                            key: 'showAcademic' as const,
                            label: 'Akademik, Rapor & Pembinaan',
                            desc: 'Menampilkan nilai rapor terakhir, predikat mata pelajaran, prestasi, dan catatan pembinaan.',
                            icon: 'bi-mortarboard-fill text-blue-600',
                        },
                        {
                            key: 'showAttendance' as const,
                            label: 'Presensi Kehadiran',
                            desc: 'Menampilkan status kehadiran hari ini serta rekap hadir, izin, sakit, dan alpha bulan berjalan.',
                            icon: 'bi-calendar2-check-fill text-teal-600',
                        },
                        {
                            key: 'showTahfizh' as const,
                            label: 'Capaian Tahfizh Al-Qur’an',
                            desc: 'Menampilkan progress bar target juz, total hafalan, dan riwayat setoran Ziyadah/Murojaah.',
                            icon: 'bi-journal-bookmark-fill text-amber-600',
                        },
                        {
                            key: 'showHealth' as const,
                            label: 'Rekam Kesehatan Poskestren',
                            desc: 'Menampilkan riwayat pemeriksaan kesehatan santri, keluhan, suhu tubuh, dan tindakan medis.',
                            icon: 'bi-heart-pulse-fill text-rose-600',
                        },
                        {
                            key: 'showLibrary' as const,
                            label: 'Peminjaman Buku Perpustakaan',
                            desc: 'Menampilkan daftar buku perpustakaan yang sedang dipinjam beserta batas tanggal pengembalian.',
                            icon: 'bi-book-half text-indigo-600',
                        },
                    ].map((mod) => (
                        <label
                            key={mod.key}
                            className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                                portalConfig[mod.key]
                                    ? 'border-teal-300 bg-teal-50/40 shadow-2xs'
                                    : 'border-slate-200 bg-white opacity-75'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(portalConfig[mod.key])}
                                onChange={(e) => handlePortalConfigChange(mod.key, e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                                    <i className={`bi ${mod.icon}`}></i>
                                    <span>{mod.label}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </SectionCard>

            {/* 3. Papan Pengumuman Pondok & Pesan Sambutan */}
            <SectionCard
                title="Papan Pengumuman Pondok & Pesan Sambutan"
                description="Kelola pesan sambutan dan daftar pengumuman resmi yang tampil di halaman login serta dasbor wali santri."
                contentClassName="p-6 space-y-5"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Judul / Sapaan Sambutan Portal
                        </label>
                        <input
                            type="text"
                            value={portalConfig.welcomeMessage || ''}
                            onChange={(e) => handlePortalConfigChange('welcomeMessage', e.target.value)}
                            placeholder="Selamat Datang di Portal Wali Santri"
                            className="app-input block w-full p-2.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Pengumuman Singkat (Highlight Banner)
                        </label>
                        <input
                            type="text"
                            value={portalConfig.announcement || ''}
                            onChange={(e) => handlePortalConfigChange('announcement', e.target.value)}
                            placeholder="Contoh: Pembayaran SPP bulan ini paling lambat tanggal 10."
                            className="app-input block w-full p-2.5 text-sm"
                        />
                    </div>
                </div>

                {/* Form Tambah Pengumuman Multi-Post */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <i className="bi bi-megaphone-fill text-teal-600"></i>
                        Tambah Pengumuman Baru ke Papan Informasi
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                            type="text"
                            value={newPostTitle}
                            onChange={(e) => setNewPostTitle(e.target.value)}
                            placeholder="Judul Pengumuman (mis. Jadwal Libur Ramadhan)"
                            className="app-input p-2.5 text-sm"
                        />
                        <input
                            type="text"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Isi pengumuman lengkap untuk wali santri..."
                            className="app-input md:col-span-2 p-2.5 text-sm"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleAddAnnouncementPost}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs font-bold transition-colors"
                        >
                            <i className="bi bi-plus-circle"></i> Tambah Pengumuman
                        </button>
                    </div>
                </div>

                {posts.length > 0 && (
                    <div className="space-y-2.5">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-800">{post.title}</span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                post.isPublished
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {post.isPublished ? 'Tayang' : 'Draft'}
                                        </span>
                                        <span className="text-[11px] text-slate-400">{post.publishedAt}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">{post.content}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleTogglePostPublish(post.id)}
                                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        {post.isPublished ? 'Sembunyikan' : 'Tayangkan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeletePost(post.id)}
                                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                                    >
                                        <i className="bi bi-trash3"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* 4. Kontak Layanan Wali, Nomor WA Konfirmasi SPP, & Rekening Pembayaran */}
            <SectionCard
                title="Kontak Layanan Wali Santri, WA Bendahara & Rekening Pondok"
                description="Tambahkan nomor WhatsApp Admin/Bendahara (otomatis terhubung ke tombol Konfirmasi Pembayaran SPP) serta nomor rekening pondok."
                contentClassName="p-6 space-y-6"
            >
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-800">Daftar Kontak &amp; Rekening Pembayaran</h4>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    handleAddContact({
                                        label: 'WA Bendahara (Konfirmasi SPP)',
                                        value: '081234567890',
                                        icon: 'bi-whatsapp',
                                    })
                                }
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                            >
                                + WA Bendahara
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    handleAddContact({
                                        label: 'Rekening BSI Pondok',
                                        value: '7123456789 a.n. Yayasan Pesantren',
                                        icon: 'bi-bank',
                                    })
                                }
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
                            >
                                + Rekening Bank
                            </button>
                        </div>
                    </div>

                    {contacts.length === 0 && (
                        <p className="text-xs text-slate-400 italic">
                            Belum ada kontak atau nomor rekening yang ditambahkan.
                        </p>
                    )}

                    <div className="space-y-2.5">
                        {contacts.map((cnt) => (
                            <div
                                key={cnt.id}
                                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center rounded-xl border border-slate-200 bg-slate-50 p-3"
                            >
                                <div className="sm:col-span-3">
                                    <select
                                        value={cnt.icon || 'bi-whatsapp'}
                                        onChange={(e) => handleUpdateContact(cnt.id, 'icon', e.target.value)}
                                        className="app-select w-full p-2 text-xs"
                                    >
                                        <option value="bi-whatsapp">WhatsApp Layanan</option>
                                        <option value="bi-bank">Rekening Bank</option>
                                        <option value="bi-telephone-fill">Telepon Kantor</option>
                                        <option value="bi-envelope-fill">Email Resmi</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-4">
                                    <input
                                        type="text"
                                        value={cnt.label}
                                        onChange={(e) => handleUpdateContact(cnt.id, 'label', e.target.value)}
                                        placeholder="Label (mis. WA Bendahara / Rek BSI)"
                                        className="app-input w-full p-2 text-xs"
                                    />
                                </div>
                                <div className="sm:col-span-4">
                                    <input
                                        type="text"
                                        value={cnt.value}
                                        onChange={(e) => handleUpdateContact(cnt.id, 'value', e.target.value)}
                                        placeholder="Nomor WA / Nomor Rekening"
                                        className="app-input w-full p-2 text-xs font-mono"
                                    />
                                </div>
                                <div className="sm:col-span-1 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveContact(cnt.id)}
                                        className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                    >
                                        <i className="bi bi-trash3"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Links */}
                <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">
                            Tautan Eksternal (Brosur, Kalender Akademik PDF, QRIS, dll.)
                        </h4>
                        <button
                            type="button"
                            onClick={handleAddCustomLink}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                            + Tambah Tautan
                        </button>
                    </div>
                    {customLinks.map((lnk, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                            <input
                                type="text"
                                value={lnk.label}
                                onChange={(e) => handleUpdateCustomLink(idx, 'label', e.target.value)}
                                placeholder="Nama Tautan"
                                className="app-input sm:col-span-5 p-2 text-xs"
                            />
                            <input
                                type="url"
                                value={lnk.url}
                                onChange={(e) => handleUpdateCustomLink(idx, 'url', e.target.value)}
                                placeholder="https://..."
                                className="app-input sm:col-span-6 p-2 text-xs font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveCustomLink(idx)}
                                className="sm:col-span-1 rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                            >
                                <i className="bi bi-trash3"></i>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Action Bar Simpan & Sinkron */}
                {canWrite && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                        <div className="flex items-center gap-2">
                            {onSwitchToPreview && (
                                <button
                                    type="button"
                                    onClick={onSwitchToPreview}
                                    className="rounded-xl border border-teal-600 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors"
                                >
                                    <i className="bi bi-display mr-1.5"></i>
                                    Buka Live Simulator
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {onSaveSettings && (
                                <button
                                    type="button"
                                    onClick={handleSaveConfiguration}
                                    disabled={isSaving}
                                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <i className="bi bi-save mr-1.5"></i>
                                    {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSyncNow}
                                disabled={isSyncing}
                                className="app-button-primary px-5 py-2.5 text-xs font-bold disabled:opacity-50"
                            >
                                <i className={`bi ${isSyncing ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'} mr-1.5`}></i>
                                {isSyncing ? 'Menyinkronkan...' : `Simpan & Sinkronkan (${(portalConfig.provider || 'gas').toUpperCase()})`}
                            </button>
                        </div>
                    </div>
                )}
            </SectionCard>

            {/* Modal Kode Google Apps Script v2.0 */}
            {showGasScriptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <i className="bi bi-shield-lock-fill text-teal-600"></i>
                                    Kode Google Apps Script Portal Wali v2.0 (Server-Side Auth)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Salin kode di bawah ini ke editor <strong>Extensions &gt; Apps Script</strong> di Google Spreadsheet Anda, lalu klik <strong>Deploy &gt; New deployment</strong> (pertama kali) atau <strong>Deploy &gt; Manage deployments &gt; Edit &gt; Version: New version</strong> saat memperbarui.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGasScriptModal(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
                                <div className="font-bold">Keunggulan Keamanan Script v2.0:</div>
                                <ul className="list-disc pl-5 space-y-0.5">
                                    <li>
                                        Endpoint publik (<code>getPortalPublicInfo</code>) hanya mengirimkan nama pondok &amp; pengumuman (<strong>0% data santri</strong>).
                                    </li>
                                    <li>
                                        Verifikasi login NIS &amp; Tanggal Lahir dilakukan langsung di server Google (<code>action=loginSantri</code>) dan hanya mengembalikan 1 santri yang cocok.
                                    </li>
                                </ul>
                            </div>
                            <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-300 font-mono leading-relaxed">
                                {gasScriptV2}
                            </pre>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t bg-slate-50 px-6 py-3.5">
                            <button
                                type="button"
                                onClick={() => handleCopyText(gasScriptV2, 'Kode Script GAS v2.0')}
                                className="app-button-primary px-4 py-2 text-xs font-bold"
                            >
                                <i className="bi bi-clipboard-check mr-1.5"></i>
                                Salin Seluruh Kode Script v2.0
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowGasScriptModal(false)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Kode Cloudflare Worker Script */}
            {showCloudflareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <i className="bi bi-lightning-charge-fill text-amber-600"></i>
                                    Kode Cloudflare Worker Script (Edge Serverless)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Tempelkan kode ini ke dashboard <strong>Cloudflare &gt; Workers &amp; Pages &gt; Create Worker</strong>. Worker ini otomatis bertindak sebagai penyimpan data dan autentikator login aman bagi wali santri.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCloudflareModal(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-amber-300 font-mono leading-relaxed">
                                {getPortalCloudflareWorkerScript(portalConfig.portalId || 'ponpes-alikhlas')}
                            </pre>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t bg-slate-50 px-6 py-3.5">
                            <button
                                type="button"
                                onClick={() => handleCopyText(getPortalCloudflareWorkerScript(portalConfig.portalId || 'ponpes-alikhlas'), 'Script Cloudflare Worker')}
                                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold"
                            >
                                <i className="bi bi-clipboard-check mr-1.5"></i>
                                Salin Script Worker
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCloudflareModal(false)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Supabase SQL */}
            {showSupabaseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <i className="bi bi-database-fill-check text-emerald-700"></i>
                                    Skema Tabel &amp; RLS Supabase PostgreSQL
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Jalankan skrip SQL ini di <strong>Supabase &gt; SQL Editor</strong> pada project Supabase Anda untuk membuat tabel <code>portal_data</code> dengan keamanan akses publik.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSupabaseModal(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <pre className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-300 font-mono leading-relaxed">
                                {getPortalSupabaseSchemaSql()}
                            </pre>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t bg-slate-50 px-6 py-3.5">
                            <button
                                type="button"
                                onClick={() => handleCopyText(getPortalSupabaseSchemaSql(), 'Skema SQL Supabase')}
                                className="app-button-primary px-4 py-2 text-xs font-bold"
                            >
                                <i className="bi bi-clipboard-check mr-1.5"></i>
                                Salin Perintah SQL
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSupabaseModal(false)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Firebase Guide */}
            {showFirebaseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <i className="bi bi-fire text-orange-600"></i>
                                    Panduan Firebase Firestore Cloud
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Konfigurasi aturan keamanan Firestore untuk koleksi <code>publicPortals</code>.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFirebaseModal(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
                            <p>
                                Saat Anda memilih Firebase Firestore, eSantri langsung menyinkronkan dokumen portal ke koleksi <code>publicPortals/{'{portalId}'}</code>.
                            </p>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11px]">
                                {getPortalFirebaseGuide()}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t bg-slate-50 px-6 py-3.5">
                            <button
                                type="button"
                                onClick={() => setShowFirebaseModal(false)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
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
