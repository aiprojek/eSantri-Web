
import React, { useState } from 'react';
import { PondokSettings, PortalConfig, PortalContact } from '../../../types';
import { useAppContext } from '../../../AppContext';
import { useFirebase } from '../../../contexts/FirebaseContext';

interface TabPortalProps {
    localSettings: PondokSettings;
    setLocalSettings: React.Dispatch<React.SetStateAction<PondokSettings>>;
    onSaveSettings: (settings: PondokSettings) => Promise<void>;
}

const THEMES = [
    { id: 'teal', color: 'bg-teal-600', label: 'Teal (Default)' },
    { id: 'blue', color: 'bg-blue-600', label: 'Blue' },
    { id: 'indigo', color: 'bg-indigo-600', label: 'Indigo' },
    { id: 'slate', color: 'bg-slate-700', label: 'Slate' },
    { id: 'rose', color: 'bg-rose-600', label: 'Rose' },
    { id: 'emerald', color: 'bg-emerald-600', label: 'Emerald' },
    { id: 'cyan', color: 'bg-cyan-600', label: 'Cyan' },
] as const;

const ICONS = [
    'bi-whatsapp', 'bi-telephone', 'bi-envelope', 'bi-globe', 'bi-instagram', 
    'bi-facebook', 'bi-twitter-x', 'bi-youtube', 'bi-telegram', 'bi-geo-alt'
];

export const TabPortal: React.FC<TabPortalProps> = ({ localSettings, setLocalSettings, onSaveSettings }) => {
    const { showToast } = useAppContext();
    const { fbUser } = useFirebase();
    
    // Get Tenant ID for URL
    const tenantId = localSettings.cloudSyncConfig?.firebasePairedTenantId || fbUser?.uid;
    
    const portalConfig: PortalConfig = localSettings.portalConfig || {
        enabled: localSettings.cloudSyncConfig?.portalEnabled || false,
        theme: 'teal',
        showFinance: true,
        showAcademic: true,
        showAttendance: true,
        showTahfizh: true,
        showHealth: true,
        showLibrary: true,
        welcomeMessage: 'Selamat Datang di Portal Wali Santri',
        announcement: '',
        contacts: [],
        customLinks: [],
        baseUrl: ''
    };

    const effectiveBaseUrl = portalConfig.baseUrl || window.location.origin;
    const portalUrl = tenantId ? `${effectiveBaseUrl}/portal/${tenantId}` : '';
    const qrCodeUrl = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portalUrl)}` : '';

    // Suggested Firebase Hosting URL
    const firebaseProjectId = localSettings.cloudSyncConfig?.firebaseProjectId;
    const suggestedFirebaseUrl = firebaseProjectId ? `https://${firebaseProjectId}.web.app` : '';

    const handleUseSuggestedUrl = () => {
        if (suggestedFirebaseUrl) {
            updatePortalConfig({ baseUrl: suggestedFirebaseUrl });
            showToast('Menggunakan domain Firebase Hosting!', 'success');
        }
    };

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

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Pengaturan Portal Wali Santri</h2>
                        <p className="text-sm text-gray-500">Konfigurasi tampilan dan fitur untuk akses wali santri via web.</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={portalConfig.enabled} 
                            onChange={(e) => updatePortalConfig({ enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        <span className="ms-3 text-sm font-medium text-gray-900">Aktifkan Portal</span>
                    </label>
                </div>

                {!portalConfig.enabled && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3 mb-6">
                        <i className="bi bi-exclamation-triangle text-yellow-600 text-xl"></i>
                        <div>
                            <p className="text-sm text-yellow-800 font-medium">Portal Sedang Non-Aktif</p>
                            <p className="text-xs text-yellow-700">Wali santri tidak akan bisa mengakses data melalui web portal sampai fitur ini diaktifkan.</p>
                        </div>
                    </div>
                )}

                {portalConfig.enabled && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
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
                                            <div className="flex-1 bg-white border border-blue-300 p-2 rounded text-sm font-mono text-blue-900 truncate">
                                                {portalUrl}
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(portalUrl);
                                                    showToast('Link portal disalin!', 'success');
                                                }}
                                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-bold flex items-center gap-2"
                                            >
                                                <i className="bi bi-clipboard"></i> Salin
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-blue-500 italic">
                                            * Link ini menggunakan {portalConfig.baseUrl ? 'Domain Kustom' : 'Domain Saat Ini'}. 
                                            {window.location.hostname === 'localhost' && !portalConfig.baseUrl && ' (Localhost tidak bisa diakses dari luar jaringan)'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-100">
                                        <i className="bi bi-exclamation-circle mr-1"></i> 
                                        Link belum tersedia. Pastikan Anda sudah terhubung ke Cloud Sync (Firebase) untuk mendapatkan Tenant ID.
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
                    <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <i className="bi bi-globe text-teal-600"></i> Domain / URL Web Portal
                        </h3>
                        <div className="space-y-3">
                            <p className="text-xs text-gray-600">
                                Jika Anda menggunakan versi <strong>Desktop (Tauri)</strong> atau <strong>Android</strong>, Anda harus menghosting versi web aplikasi ini (misal di Vercel/Netlify) dan memasukkan URL-nya di sini agar link yang dibagikan ke wali santri valid.
                            </p>
                            <div className="flex gap-2">
                                <input 
                                    type="url" 
                                    value={portalConfig.baseUrl || ''}
                                    onChange={(e) => updatePortalConfig({ baseUrl: e.target.value })}
                                    placeholder="https://esantri-pondok-anda.vercel.app"
                                    className="flex-1 p-2 bg-white border border-gray-300 rounded-lg text-sm"
                                />
                                {portalConfig.baseUrl && (
                                    <button 
                                        onClick={() => updatePortalConfig({ baseUrl: '' })}
                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            {suggestedFirebaseUrl && portalConfig.baseUrl !== suggestedFirebaseUrl && (
                                <div className="mt-2 p-2 bg-teal-50 border border-teal-100 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <i className="bi bi-magic text-teal-600"></i>
                                        <span className="text-[10px] text-teal-800 font-medium">Saran: Gunakan Firebase Hosting Anda</span>
                                    </div>
                                    <button 
                                        onClick={handleUseSuggestedUrl}
                                        className="text-[10px] bg-teal-600 text-white px-2 py-1 rounded font-bold hover:bg-teal-700 transition-colors"
                                    >
                                        Gunakan Link Rekomendasi
                                    </button>
                                </div>
                            )}
                            <p className="text-[10px] text-gray-500">
                                * Kosongkan untuk menggunakan domain saat ini secara otomatis.
                            </p>
                        </div>
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
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
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
                                <label key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:shadow-sm transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <i className={`bi ${item.icon} text-gray-500`}></i>
                                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
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
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <i className="bi bi-megaphone text-teal-600"></i> Informasi & Pengumuman
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">Pesan Selamat Datang</label>
                                <input 
                                    type="text" 
                                    value={portalConfig.welcomeMessage}
                                    onChange={(e) => updatePortalConfig({ welcomeMessage: e.target.value })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Contoh: Selamat Datang di Portal Wali Santri"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-medium text-gray-600">Pengumuman Penting (Muncul di Dashboard Portal)</label>
                                <textarea 
                                    value={portalConfig.announcement}
                                    onChange={(e) => updatePortalConfig({ announcement: e.target.value })}
                                    rows={3}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Tulis pengumuman atau informasi penting untuk wali santri..."
                                />
                            </div>
                        </div>
                    </section>

                    {/* KONTAK PENTING */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                <i className="bi bi-person-lines-fill text-teal-600"></i> Kontak Penting
                            </h3>
                            <button 
                                onClick={handleAddContact}
                                className="text-xs bg-teal-50 text-teal-600 hover:bg-teal-100 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"
                            >
                                <i className="bi bi-plus-lg"></i> Tambah Kontak
                            </button>
                        </div>
                        <div className="space-y-3">
                            {portalConfig.contacts.length === 0 && (
                                <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed">Belum ada kontak yang ditambahkan.</p>
                            )}
                            {portalConfig.contacts.map((contact) => (
                                <div key={contact.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex-shrink-0">
                                        <select 
                                            value={contact.icon}
                                            onChange={(e) => handleUpdateContact(contact.id, { icon: e.target.value })}
                                            className="p-2 bg-white border border-gray-300 rounded-lg text-sm"
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
                                            className="p-2 bg-white border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input 
                                            type="text" 
                                            value={contact.value}
                                            onChange={(e) => handleUpdateContact(contact.id, { value: e.target.value })}
                                            placeholder="Nomor HP / Email / Link"
                                            className="p-2 bg-white border border-gray-300 rounded-lg text-sm"
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
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                <i className="bi bi-link-45deg text-teal-600"></i> Link Eksternal Kustom
                            </h3>
                            <button 
                                onClick={handleAddLink}
                                className="text-xs bg-teal-50 text-teal-600 hover:bg-teal-100 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"
                            >
                                <i className="bi bi-plus-lg"></i> Tambah Link
                            </button>
                        </div>
                        <div className="space-y-3">
                            {portalConfig.customLinks.length === 0 && (
                                <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed">Belum ada link kustom.</p>
                            )}
                            {portalConfig.customLinks.map((link, idx) => (
                                <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <input 
                                            type="text" 
                                            value={link.label}
                                            onChange={(e) => handleUpdateLink(idx, { label: e.target.value })}
                                            placeholder="Nama Link (misal: Website Yayasan)"
                                            className="p-2 bg-white border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input 
                                            type="text" 
                                            value={link.url}
                                            onChange={(e) => handleUpdateLink(idx, { url: e.target.value })}
                                            placeholder="URL (https://...)"
                                            className="p-2 bg-white border border-gray-300 rounded-lg text-sm"
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

                <div className="mt-8 pt-6 border-t flex justify-end">
                    <button
                        onClick={() => onSaveSettings(localSettings)}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-md transition-all flex items-center gap-2"
                    >
                        <i className="bi bi-save"></i> Simpan Pengaturan Portal
                    </button>
                </div>
            </div>
        </div>
    );
};
