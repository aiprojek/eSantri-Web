import React, { useState } from 'react';
import { PondokSettings, WaGatewayConfig, WaGatewayProvider } from '../../types';
import { sendViaGateway } from '../../services/waService';

interface WaGatewayModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: PondokSettings;
    onSaveSettings: (settings: PondokSettings) => Promise<void>;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const WaGatewayModal: React.FC<WaGatewayModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSaveSettings,
    showToast,
}) => {
    const existing = settings.waGatewayConfig || {
        provider: 'manual',
        apiKey: '',
        endpointUrl: '',
        senderNumber: '',
    };

    const [provider, setProvider] = useState<WaGatewayProvider>(existing.provider || 'manual');
    const [apiKey, setApiKey] = useState(existing.apiKey || '');
    const [endpointUrl, setEndpointUrl] = useState(existing.endpointUrl || '');
    const [senderNumber, setSenderNumber] = useState(existing.senderNumber || '');
    const [testPhone, setTestPhone] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const nextConfig: WaGatewayConfig = {
                provider,
                apiKey: apiKey.trim(),
                endpointUrl: endpointUrl.trim(),
                senderNumber: senderNumber.trim(),
            };
            await onSaveSettings({
                ...settings,
                waGatewayConfig: nextConfig,
            });
            showToast('Konfigurasi WhatsApp Gateway berhasil disimpan.', 'success');
            onClose();
        } catch (error) {
            console.error('Error saving WA gateway config:', error);
            showToast('Gagal menyimpan pengaturan WhatsApp Gateway.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestGateway = async () => {
        if (!testPhone) {
            showToast('Masukkan nomor HP untuk pengujian terlebih dahulu.', 'info');
            return;
        }
        if (provider === 'manual') {
            showToast('Mode manual tidak memerlukan API Key (menggunakan redirect wa.me langsung).', 'info');
            return;
        }
        setIsTesting(true);
        try {
            const tempConfig: WaGatewayConfig = {
                provider,
                apiKey: apiKey.trim(),
                endpointUrl: endpointUrl.trim(),
                senderNumber: senderNumber.trim(),
            };
            const result = await sendViaGateway(
                testPhone,
                `Tes Koneksi WhatsApp Gateway ${settings.namaPonpes || 'Pondok Pesantren'}\nStatus: Terhubung OK\nWaktu: ${new Date().toLocaleString('id-ID')}`,
                tempConfig
            );
            if (result.success) {
                showToast(result.message || 'Pesan tes berhasil terkirim!', 'success');
            } else {
                showToast(`Uji koneksi gagal: ${result.message}`, 'error');
            }
        } catch (error: any) {
            showToast(`Kesalahan: ${error.message || 'Gagal mengirim pesan uji'}`, 'error');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div
            id="wa-gateway-modal-overlay"
            className="app-overlay fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
            onClick={onClose}
        >
            <div
                id="wa-gateway-modal-content"
                className="app-modal w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg">
                            <i className="bi bi-gear-wide-connected" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Opsi WhatsApp Gateway</h3>
                            <p className="text-xs text-slate-500">Pilih antara mode manual (bebas biaya) atau API otomatis</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                    >
                        <i className="bi bi-x-lg text-sm" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Provider Radio Cards */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                            Pilih Saluran Pengiriman
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Manual */}
                            <label
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    provider === 'manual'
                                        ? 'border-teal-500 bg-teal-50/40 text-teal-900 shadow-sm'
                                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="wa_provider"
                                    value="manual"
                                    checked={provider === 'manual'}
                                    onChange={() => setProvider('manual')}
                                    className="mt-0.5 text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <div className="text-xs font-bold flex items-center gap-1.5">
                                        <span>Manual (wa.me)</span>
                                        <span className="px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-800 rounded font-semibold">
                                            Bebas Biaya
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                        Membuka aplikasi WhatsApp admin. Terbukti paling aman dari risiko pemblokiran nomor.
                                    </p>
                                </div>
                            </label>

                            {/* Fonnte */}
                            <label
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    provider === 'fonnte'
                                        ? 'border-teal-500 bg-teal-50/40 text-teal-900 shadow-sm'
                                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="wa_provider"
                                    value="fonnte"
                                    checked={provider === 'fonnte'}
                                    onChange={() => setProvider('fonnte')}
                                    className="mt-0.5 text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <div className="text-xs font-bold">Fonnte Gateway</div>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                        Kirim otomatis di balik layar via Fonnte API tanpa perlu membuka tab chat.
                                    </p>
                                </div>
                            </label>

                            {/* Wablas */}
                            <label
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    provider === 'wablas'
                                        ? 'border-teal-500 bg-teal-50/40 text-teal-900 shadow-sm'
                                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="wa_provider"
                                    value="wablas"
                                    checked={provider === 'wablas'}
                                    onChange={() => setProvider('wablas')}
                                    className="mt-0.5 text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <div className="text-xs font-bold">Wablas API</div>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                        Integrasi server WhatsApp Wablas dengan dukungan multidevice.
                                    </p>
                                </div>
                            </label>

                            {/* Custom Webhook */}
                            <label
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    provider === 'custom'
                                        ? 'border-teal-500 bg-teal-50/40 text-teal-900 shadow-sm'
                                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="wa_provider"
                                    value="custom"
                                    checked={provider === 'custom'}
                                    onChange={() => setProvider('custom')}
                                    className="mt-0.5 text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <div className="text-xs font-bold">Custom Webhook / Baileys</div>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                        Kirim ke server bot WhatsApp internal (Node.js/Python/Go) milik pesantren.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Conditional API Settings */}
                    {provider !== 'manual' && (
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                                    {provider === 'custom' ? 'API Key / Token Bearer (Opsional)' : 'API Key / Token Resmi'}
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={provider === 'fonnte' ? 'Contoh: 1a2b3c4d5e...' : 'Masukkan token autentikasi'}
                                    className="app-input w-full text-xs font-mono"
                                />
                            </div>

                            {(provider === 'wablas' || provider === 'custom') && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                                        {provider === 'wablas' ? 'Domain Server Wablas (Default: https://pati.wablas.com)' : 'URL Endpoint Webhook'}
                                    </label>
                                    <input
                                        type="url"
                                        value={endpointUrl}
                                        onChange={(e) => setEndpointUrl(e.target.value)}
                                        placeholder={provider === 'wablas' ? 'https://pati.wablas.com' : 'https://api-wa.pesantren.id/send'}
                                        className="app-input w-full text-xs font-mono"
                                    />
                                </div>
                            )}

                            {/* Ping / Test Form */}
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <label className="text-xs font-bold text-slate-700 block">
                                    Uji Coba Pengiriman Langsung
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="tel"
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        placeholder="Nomor HP Uji (08123456789)"
                                        className="app-input flex-1 text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleTestGateway}
                                        disabled={isTesting}
                                        className="px-3.5 py-2 text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        {isTesting ? 'Menguji...' : 'Kirim Pesan Uji'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    Mengirim 1 pesan singkat untuk memverifikasi keabsahan API Key dan respon server gateway.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="app-button-secondary px-4 py-2 text-xs"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="app-button-primary px-5 py-2 text-xs font-bold"
                    >
                        {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                </div>
            </div>
        </div>
    );
};
