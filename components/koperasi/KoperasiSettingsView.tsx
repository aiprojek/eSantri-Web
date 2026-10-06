import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import {
    KoperasiSettings,
    getKoperasiSettings,
    getThermalPrinterStatus,
    subscribePrinterStatus,
    connectBluetoothPrinter,
    disconnectBluetoothPrinter,
    connectUsbSerialPrinter,
    disconnectUsbSerialPrinter,
    printThermalReceipt,
    createSampleTransactionForTest,
    generateReceiptHtml
} from './Shared';

export const KoperasiSettingsView: React.FC = () => {
    const { showToast, settings: pondokSettings, onUpdateSettings } = useAppContext();
    const [settings, setSettings] = useState<KoperasiSettings>(() => getKoperasiSettings(pondokSettings));
    const [printerStatus, setPrinterStatus] = useState(() => getThermalPrinterStatus());
    const [isConnecting, setIsConnecting] = useState(false);
    const [isTestingPrint, setIsTestingPrint] = useState(false);

    useEffect(() => {
        if (pondokSettings?.koperasiSettings) {
            setSettings(getKoperasiSettings(pondokSettings));
        }
    }, [pondokSettings?.koperasiSettings]);

    useEffect(() => {
        return subscribePrinterStatus(() => {
            setPrinterStatus(getThermalPrinterStatus());
        });
    }, []);

    const handleConnectBluetooth = async () => {
        setIsConnecting(true);
        try {
            const devName = await connectBluetoothPrinter();
            const updated: KoperasiSettings = { ...settings, printerMethod: 'bluetooth', printerName: devName };
            setSettings(updated);
            localStorage.setItem('esantri_koperasi_settings', JSON.stringify(updated));
            showToast(`Berhasil terhubung ke Printer Bluetooth: ${devName}`, 'success');
        } catch (err: any) {
            if (err?.name !== 'NotFoundError') {
                showToast(err.message || 'Gagal menghubungkan Printer Bluetooth.', 'error');
            }
        } finally {
            setIsConnecting(false);
            setPrinterStatus(getThermalPrinterStatus());
        }
    };

    const handleConnectUsb = async () => {
        setIsConnecting(true);
        try {
            const devName = await connectUsbSerialPrinter();
            const updated: KoperasiSettings = { ...settings, printerMethod: 'usb', printerName: devName };
            setSettings(updated);
            localStorage.setItem('esantri_koperasi_settings', JSON.stringify(updated));
            showToast(`Berhasil terhubung ke ${devName}`, 'success');
        } catch (err: any) {
            if (err?.name !== 'NotFoundError') {
                showToast(err.message || 'Gagal menghubungkan Printer USB.', 'error');
            }
        } finally {
            setIsConnecting(false);
            setPrinterStatus(getThermalPrinterStatus());
        }
    };

    const handleTestPrint = async () => {
        setIsTestingPrint(true);
        try {
            localStorage.setItem('esantri_koperasi_settings', JSON.stringify(settings));
            const sampleTx = createSampleTransactionForTest();
            await printThermalReceipt(sampleTx, { ...pondokSettings, koperasiSettings: settings }, showToast);
        } finally {
            setIsTestingPrint(false);
        }
    };

    const handleSave = async () => {
        localStorage.setItem('esantri_koperasi_settings', JSON.stringify(settings));
        await onUpdateSettings({
            ...pondokSettings,
            koperasiSettings: settings
        });
        showToast('Pengaturan printer, struk & kebijakan koperasi tersimpan.', 'success');
    };

    const sampleReceiptHtml = generateReceiptHtml(createSampleTransactionForTest(), {
        ...pondokSettings,
        koperasiSettings: settings
    });

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Printer Hardware & Receipt Configuration */}
            <div className="lg:col-span-7 space-y-6">
                {/* 1. Koneksi Perangkat Printer Thermal */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-xs border border-slate-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                                <i className="bi bi-printer-fill text-teal-600"></i> Koneksi Perangkat Printer Thermal
                            </h3>
                            <p className="text-xs text-slate-500">Pilih metode koneksi printer untuk Tablet, Ponsel Android, atau Laptop Kasir.</p>
                        </div>
                        {(printerStatus.btConnected || printerStatus.usbConnected) ? (
                            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Terhubung: {printerStatus.btDeviceName || settings.printerName || 'Printer Aktif'}
                            </span>
                        ) : (
                            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                                {settings.printerMethod === 'browser' ? 'Mode Dialog Sistem' : settings.printerMethod === 'rawbt' ? 'Mode RawBT Android' : 'Belum Terhubung'}
                            </span>
                        )}
                    </div>

                    {/* Metode Koneksi Selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Metode Cetak Struk</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setSettings({ ...settings, printerMethod: 'bluetooth' })}
                                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                                    settings.printerMethod === 'bluetooth'
                                        ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-500'
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <i className="bi bi-bluetooth text-lg"></i>
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-800">Bluetooth Langsung (BLE)</div>
                                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                        Cetak ESC/POS langsung ke printer Bluetooth dari Chrome Tablet/HP/PC tanpa dialog.
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSettings({ ...settings, printerMethod: 'rawbt' })}
                                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                                    settings.printerMethod === 'rawbt'
                                        ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-500'
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                                    <i className="bi bi-phone-vibrate text-lg"></i>
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-800">Aplikasi RawBT (Android)</div>
                                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                        Cocok untuk semua printer Bluetooth Classic (SPP) di HP/Tablet Android via jembatan RawBT.
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSettings({ ...settings, printerMethod: 'usb' })}
                                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                                    settings.printerMethod === 'usb'
                                        ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-500'
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                                    <i className="bi bi-usb-symbol text-lg"></i>
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-800">Kabel USB / Serial (POS PC)</div>
                                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                        Koneksi kabel USB langsung (Web Serial) untuk komputer kasir desktop.
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSettings({ ...settings, printerMethod: 'browser' })}
                                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                                    (settings.printerMethod || 'browser') === 'browser'
                                        ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-500'
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                                    <i className="bi bi-window-desktop text-lg"></i>
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-800">Dialog Sistem / Driver OS</div>
                                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                        Membuka jendela cetak bawaan browser/OS atau simpan sebagai PDF.
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Panel Pairing Bluetooth */}
                    {settings.printerMethod === 'bluetooth' && (
                        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="text-xs text-blue-900">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <i className="bi bi-bluetooth"></i> Status Bluetooth Printer:
                                        <span className={printerStatus.btConnected ? 'text-emerald-700' : 'text-amber-700'}>
                                            {printerStatus.btConnected
                                                ? `Terhubung (${printerStatus.btDeviceName})`
                                                : settings.printerName
                                                ? `Terakhir dipakai: ${settings.printerName} (Klik Hubungkan)`
                                                : 'Belum dipasangkan'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-blue-700 mt-0.5">
                                        Pastikan Bluetooth HP/Tablet menyala dan printer thermal (RPP02N, Eppos, VSC, Blueprint, Panda, dll.) dalam keadaan hidup.
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    {printerStatus.btConnected ? (
                                        <button
                                            type="button"
                                            onClick={disconnectBluetoothPrinter}
                                            className="min-h-[40px] px-3.5 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50"
                                        >
                                            Putuskan
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        disabled={isConnecting}
                                        onClick={handleConnectBluetooth}
                                        className="min-h-[40px] px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                                    >
                                        <i className="bi bi-bluetooth"></i>
                                        {isConnecting ? 'Mencari...' : printerStatus.btConnected ? 'Ganti Printer' : 'Cari & Hubungkan Bluetooth'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Panel Pairing USB */}
                    {settings.printerMethod === 'usb' && (
                        <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="text-xs text-purple-900">
                                <div className="font-bold">Status Printer Kabel USB / Serial: {printerStatus.usbConnected ? 'Terhubung' : 'Belum Terhubung'}</div>
                                <p className="text-[11px] text-purple-700 mt-0.5">Hubungkan kabel USB printer thermal ke port USB komputer/tablet, lalu klik tombol di samping.</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {printerStatus.usbConnected && (
                                    <button
                                        type="button"
                                        onClick={disconnectUsbSerialPrinter}
                                        className="min-h-[40px] px-3 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-bold"
                                    >
                                        Putuskan
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={isConnecting}
                                    onClick={handleConnectUsb}
                                    className="min-h-[40px] px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 flex items-center gap-1.5"
                                >
                                    <i className="bi bi-usb-plug"></i> {printerStatus.usbConnected ? 'Ganti Port USB' : 'Pilih Port USB Printer'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Panel Info RawBT */}
                    {settings.printerMethod === 'rawbt' && (
                        <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                                <i className="bi bi-check-circle-fill text-emerald-600"></i> Mode Jembatan RawBT Android Aktif
                            </div>
                            <p className="text-[11px] text-emerald-800">
                                Saat mencetak struk di HP/Tablet Android, sistem akan mengirim komando ESC/POS langsung ke aplikasi <strong>RawBT Print Service</strong> tanpa perlu pairing ulang di browser.
                            </p>
                        </div>
                    )}

                    {/* Ukuran Kertas, Cash Drawer & Spasi */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Ukuran Kertas Thermal</label>
                            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, paperSize: '58mm' })}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${settings.paperSize === '58mm' ? 'bg-white shadow-2xs text-teal-700' : 'text-slate-600'}`}
                                >
                                    58mm (Kecil)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, paperSize: '80mm' })}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${settings.paperSize === '80mm' ? 'bg-white shadow-2xs text-teal-700' : 'text-slate-600'}`}
                                >
                                    80mm (Lebar)
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Spasi Gulung Akhir</label>
                            <select
                                value={settings.feedLines ?? 3}
                                onChange={e => setSettings({ ...settings, feedLines: Number(e.target.value) })}
                                className="w-full min-h-[40px] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
                            >
                                <option value={2}>2 Baris (Hemat Kertas)</option>
                                <option value={3}>3 Baris (Standar)</option>
                                <option value={4}>4 Baris</option>
                                <option value={5}>5 Baris</option>
                            </select>
                        </div>

                        <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2 cursor-pointer p-2.5 min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100">
                                <input
                                    type="checkbox"
                                    checked={!!settings.cashDrawerKick}
                                    onChange={e => setSettings({ ...settings, cashDrawerKick: e.target.checked })}
                                    className="rounded text-teal-600 focus:ring-teal-500"
                                />
                                <span className="text-xs font-bold text-slate-700">Buka Laci Kasir (RJ11)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 2. Teks Struk & Kebijakan Kasbon */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-xs border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-800">Teks Struk & Kebijakan Koperasi</h3>
                            <p className="text-xs text-slate-500">Tersinkronisasi otomatis ke seluruh perangkat Kasir (Local & Cloud).</p>
                        </div>
                        <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-teal-200 flex items-center gap-1">
                            <i className="bi bi-cloud-check"></i> Cloud Synced
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Header Baris 1 (Nama Koperasi/Toko)</label>
                            <input
                                type="text"
                                value={settings.headerLine1}
                                onChange={e => setSettings({ ...settings, headerLine1: e.target.value })}
                                className="w-full min-h-[42px] border border-slate-300 rounded-xl p-2.5 text-sm"
                                placeholder="KOPERASI PESANTREN"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Header Baris 2 (Alamat / Slogan)</label>
                            <input
                                type="text"
                                value={settings.headerLine2}
                                onChange={e => setSettings({ ...settings, headerLine2: e.target.value })}
                                className="w-full min-h-[42px] border border-slate-300 rounded-xl p-2.5 text-sm"
                                placeholder="Jl. Pesantren No. 1"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Catatan Kaki (Footer Struk)</label>
                        <textarea
                            rows={2}
                            value={settings.footerText}
                            onChange={e => setSettings({ ...settings, footerText: e.target.value })}
                            className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                            placeholder="Terima kasih atas kunjungan Anda..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Plafon Maksimal Kasbon / Hutang (Rp)</label>
                            <input
                                type="number"
                                min={0}
                                step={5000}
                                value={settings.defaultLimitKasbon ?? 100000}
                                onChange={e => setSettings({ ...settings, defaultLimitKasbon: Number(e.target.value) })}
                                className="w-full min-h-[42px] border border-slate-300 rounded-xl p-2.5 text-sm font-bold text-slate-800 tabular-nums"
                                placeholder="100000"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">Isi 0 jika tanpa batas plafon kasbon per pelanggan.</p>
                        </div>

                        <div className="pt-2 sm:pt-4">
                            <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-teal-200 bg-teal-50/50">
                                <input
                                    type="checkbox"
                                    checked={settings.autoPrint}
                                    onChange={e => setSettings({ ...settings, autoPrint: e.target.checked })}
                                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                                />
                                <span className="text-xs sm:text-sm font-bold text-teal-900">
                                    Otomatis Cetak Struk Setiap Selesai Bayar
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
                        <button
                            type="button"
                            disabled={isTestingPrint}
                            onClick={handleTestPrint}
                            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2"
                        >
                            <i className="bi bi-printer text-teal-600 text-base"></i>
                            <span>{isTestingPrint ? 'Mengirim Tes Cetak...' : 'Tes Cetak Printer (Test Print)'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            className="min-h-[44px] bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-teal-700 flex items-center gap-2 shadow-xs"
                        >
                            <i className="bi bi-save"></i> Simpan Pengaturan
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Live Thermal Receipt Preview */}
            <div className="lg:col-span-5">
                <div className="bg-slate-800 rounded-xl p-4 sm:p-5 text-white shadow-md sticky top-4">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <i className="bi bi-receipt-cutoff text-teal-400"></i> Pratinjau Struk ({settings.paperSize})
                        </div>
                        <span className="text-[11px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                            {settings.paperSize === '80mm' ? '48 Karakter/Baris' : '32 Karakter/Baris'}
                        </span>
                    </div>

                    <div className="bg-slate-900/60 rounded-xl p-4 flex justify-center overflow-x-auto">
                        <div
                            className="bg-white text-black shadow-lg rounded-xs p-3"
                            dangerouslySetInnerHTML={{ __html: sampleReceiptHtml }}
                        />
                    </div>

                    <div className="mt-4 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                        <div className="font-bold text-teal-300 flex items-center gap-1">
                            <i className="bi bi-lightbulb-fill"></i> Tips Printer Thermal di Tablet / HP:
                        </div>
                        <p>1. Untuk printer Bluetooth generasi baru (BLE), pilih <strong>Bluetooth Langsung (BLE)</strong> lalu tekan <strong>Cari &amp; Hubungkan Bluetooth</strong>.</p>
                        <p>2. Jika printer Bluetooth lama Anda hanya terdeteksi di pengaturan Bluetooth HP namun tidak muncul di browser, pilih <strong>Aplikasi RawBT (Android)</strong>.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
