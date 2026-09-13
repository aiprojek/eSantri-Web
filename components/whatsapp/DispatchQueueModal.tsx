import React, { useState } from 'react';
import { WaGatewayConfig } from '../../types';
import { dispatchWhatsAppMessage } from '../../services/waService';

export interface QueueRecipientItem {
    id: number | string;
    name: string;
    phone: string;
    subtitle: string;
    formattedMessage: string;
    audience: 'santri' | 'psb';
}

interface DispatchQueueModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: QueueRecipientItem[];
    gatewayConfig?: WaGatewayConfig;
    onItemDispatched: (item: QueueRecipientItem, channel: 'gateway' | 'manual') => Promise<void>;
    onComplete: () => void;
}

export const DispatchQueueModal: React.FC<DispatchQueueModalProps> = ({
    isOpen,
    onClose,
    items,
    gatewayConfig,
    onItemDispatched,
    onComplete,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [sentCount, setSentCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);

    if (!isOpen || items.length === 0) return null;

    const currentItem = items[currentIndex];
    const isFinished = currentIndex >= items.length;
    const progressPercent = Math.round((currentIndex / items.length) * 100);

    const handleSendCurrent = async () => {
        if (!currentItem || isSending) return;
        setIsSending(true);
        try {
            const res = await dispatchWhatsAppMessage(
                currentItem.phone,
                currentItem.formattedMessage,
                gatewayConfig
            );
            await onItemDispatched(currentItem, res.channel);
            setSentCount((prev) => prev + 1);

            if (currentIndex + 1 >= items.length) {
                setCurrentIndex(items.length);
                onComplete();
            } else {
                setCurrentIndex((prev) => prev + 1);
            }
        } catch (error) {
            console.error('Error dispatching item:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleSkipCurrent = () => {
        setSkippedCount((prev) => prev + 1);
        if (currentIndex + 1 >= items.length) {
            setCurrentIndex(items.length);
            onComplete();
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    return (
        <div
            id="dispatch-queue-modal-overlay"
            className="app-overlay fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
            onClick={onClose}
        >
            <div
                id="dispatch-queue-modal-content"
                className="app-modal w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                            <i className="bi bi-send-check" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Antrean Kirim WhatsApp</h3>
                            <p className="text-xs text-slate-500">
                                {isFinished ? 'Seluruh antrean selesai diproses' : `Memproses penerima ${currentIndex + 1} dari ${items.length}`}
                            </p>
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

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 relative">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${isFinished ? 100 : progressPercent}%` }}
                    />
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {isFinished ? (
                        <div className="text-center py-8 space-y-3">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl border border-emerald-200">
                                <i className="bi bi-check-all" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800">Pengiriman Selesai!</h4>
                            <p className="text-sm text-slate-600 max-w-md mx-auto">
                                Berhasil memproses <span className="font-semibold text-emerald-600">{sentCount} terkirim</span> dan{' '}
                                <span className="font-semibold text-slate-500">{skippedCount} dilewati</span> dari total {items.length} kontak terpilih.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Recipient Profile Card */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            Tujuan Penerima ({currentIndex + 1}/{items.length})
                                        </div>
                                        <div className="text-base font-bold text-slate-800 mt-0.5">{currentItem.name}</div>
                                        <div className="text-xs text-slate-500">{currentItem.subtitle}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <i className="bi bi-whatsapp text-xs" />
                                            {currentItem.phone}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Mode Indicator */}
                            <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <i className="bi bi-broadcast text-teal-600" />
                                    <span>Metode:</span>
                                    <span className="font-semibold text-slate-700">
                                        {gatewayConfig && gatewayConfig.provider !== 'manual' && gatewayConfig.apiKey
                                            ? `Gateway API (${gatewayConfig.provider.toUpperCase()})`
                                            : 'Manual (Tab WhatsApp Organik)'}
                                    </span>
                                </div>
                                <div className="text-slate-400">
                                    Terkirim: {sentCount} | Lewati: {skippedCount}
                                </div>
                            </div>

                            {/* Message Text Preview */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 block">
                                    Isi Pesan Siap Kirim (Sudah Diisi Data Spesifik):
                                </label>
                                <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs font-sans leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[220px] overflow-y-auto shadow-inner">
                                    {currentItem.formattedMessage}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between gap-3">
                    {isFinished ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full app-button-primary py-2.5 text-sm font-semibold rounded-xl"
                        >
                            Tutup Jendela Antrean
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleSkipCurrent}
                                disabled={isSending}
                                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
                            >
                                Lewati Kontak Ini
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSending}
                                    className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-200/50 rounded-xl transition-colors"
                                >
                                    Batalkan Sisa
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendCurrent}
                                    disabled={isSending}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md transition-all disabled:opacity-50"
                                >
                                    {isSending ? (
                                        <>
                                            <i className="bi bi-arrow-repeat animate-spin text-sm" />
                                            <span>Mengirim...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-send-fill text-xs" />
                                            <span>Kirim & Lanjut</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
