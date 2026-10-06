import { TransaksiKoperasi, PondokSettings, KoperasiSettingsConfig } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { printToPdfNative } from '../../utils/pdfGenerator';

export type KoperasiSettings = KoperasiSettingsConfig;

let koperasiIdSeq = Math.floor(Math.random() * 500);
const deviceSalt = Math.floor(Math.random() * 500);

/**
 * Menghasilkan ID numerik unik yang bebas bentrok (collision-safe) untuk sinkronisasi
 * multi-admin / multi-kasir baik di mode Hub & Spoke maupun Cloud Realtime.
 */
export const generateKoperasiId = (): number => {
    koperasiIdSeq = (koperasiIdSeq + 1) % 1000;
    const subMs = (koperasiIdSeq + deviceSalt) % 1000;
    return Date.now() * 1000 + subMs;
};

export const getKoperasiSettings = (pondokSettings?: PondokSettings): KoperasiSettings => {
    const defaults: KoperasiSettings = {
        headerLine1: pondokSettings?.namaPonpes ? `KOPERASI ${pondokSettings.namaPonpes.toUpperCase()}` : 'KOPERASI PESANTREN',
        headerLine2: pondokSettings?.alamat || 'Unit Usaha Ekonomi Mandiri',
        footerText: 'Terima Kasih atas Kunjungan Anda.\nBarang yang sudah dibeli tidak dapat ditukar.',
        paperSize: '58mm',
        autoPrint: true,
        defaultLimitKasbon: 100000,
        printerMethod: 'browser',
        printerName: '',
        cashDrawerKick: false,
        feedLines: 3
    };
    const localRaw = localStorage.getItem('esantri_koperasi_settings');
    const localParsed = localRaw ? JSON.parse(localRaw) : {};
    if (pondokSettings?.koperasiSettings) {
        return {
            ...defaults,
            ...localParsed,
            ...pondokSettings.koperasiSettings,
            // Pertahankan metode printer & nama perangkat lokal jika diset spesifik per perangkat kasir
            printerMethod: localParsed.printerMethod || pondokSettings.koperasiSettings.printerMethod || defaults.printerMethod,
            printerName: localParsed.printerName || pondokSettings.koperasiSettings.printerName || defaults.printerName
        };
    }
    return { ...defaults, ...localParsed };
};

// ============================================================================
// THERMAL PRINTER ENGINE (Web Bluetooth BLE, WebUSB/Serial, RawBT, Browser)
// ============================================================================

const BT_PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE POS Printer
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Xprinter / Eppos / VSC BLE
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip ISSC Transparent UART
    '0000ff00-0000-1000-8000-00805f9b34fb', // Generic Chinese Thermal BLE
    '0000ffe0-0000-1000-8000-00805f9b34fb'  // HM-10 / Serial BLE module
];

interface ActiveBluetoothState {
    device: any | null;
    characteristic: any | null;
}

interface ActiveSerialState {
    port: any | null;
}

const btState: ActiveBluetoothState = {
    device: null,
    characteristic: null
};

const serialState: ActiveSerialState = {
    port: null
};

type PrinterListener = () => void;
const listeners = new Set<PrinterListener>();

const notifyListeners = () => {
    listeners.forEach(fn => fn());
};

export const subscribePrinterStatus = (listener: PrinterListener): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const getThermalPrinterStatus = () => {
    const btConnected = !!(btState.device && btState.device.gatt?.connected && btState.characteristic);
    const usbConnected = !!serialState.port;
    return {
        btConnected,
        btDeviceName: btState.device?.name || '',
        usbConnected,
        isWebBluetoothSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
        isWebSerialSupported: typeof navigator !== 'undefined' && 'serial' in navigator
    };
};

export const connectBluetoothPrinter = async (): Promise<string> => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
        throw new Error('Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome/Edge di Android, Windows, atau Mac.');
    }

    const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BT_PRINTER_SERVICES
    });

    if (!device.gatt) {
        throw new Error('Perangkat Bluetooth ini tidak mendukung koneksi GATT.');
    }

    device.addEventListener('gattserverdisconnected', () => {
        btState.characteristic = null;
        notifyListeners();
    });

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let writableChar: any = null;

    for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
                writableChar = char;
                break;
            }
        }
        if (writableChar) break;
    }

    if (!writableChar) {
        throw new Error('Karakteristik cetak tidak ditemukan pada perangkat Bluetooth ini.');
    }

    btState.device = device;
    btState.characteristic = writableChar;
    notifyListeners();
    return device.name || 'Bluetooth Thermal Printer';
};

export const disconnectBluetoothPrinter = () => {
    if (btState.device?.gatt?.connected) {
        btState.device.gatt.disconnect();
    }
    btState.device = null;
    btState.characteristic = null;
    notifyListeners();
};

export const connectUsbSerialPrinter = async (baudRate = 9600): Promise<string> => {
    const nav = navigator as any;
    if (!nav.serial) {
        throw new Error('Browser ini tidak mendukung Web Serial/USB. Gunakan Chrome/Edge Desktop.');
    }
    const port = await nav.serial.requestPort();
    await port.open({ baudRate });
    serialState.port = port;
    notifyListeners();
    return 'USB/Serial Thermal Printer';
};

export const disconnectUsbSerialPrinter = async () => {
    if (serialState.port) {
        try {
            await serialState.port.close();
        } catch {
            // ignore
        }
        serialState.port = null;
        notifyListeners();
    }
};

// Format helper for fixed-width thermal columns (32 chars for 58mm, 48 chars for 80mm)
const formatLineLR = (left: string, right: string, width: number): string => {
    const cleanLeft = left.slice(0, Math.max(1, width - right.length - 1));
    const spaces = Math.max(1, width - cleanLeft.length - right.length);
    return cleanLeft + ' '.repeat(spaces) + right + '\n';
};

export const buildEscPosBytes = (t: TransaksiKoperasi, pondokSettings?: PondokSettings): Uint8Array => {
    const settings = getKoperasiSettings(pondokSettings);
    const cols = settings.paperSize === '80mm' ? 48 : 32;
    const divider = '-'.repeat(cols) + '\n';
    const isVoid = t.statusTransaksi === 'Dibatalkan';

    const encoder = new TextEncoder();
    const chunks: number[] = [];
    const pushBytes = (arr: number[] | Uint8Array) => {
        for (let i = 0; i < arr.length; i++) chunks.push(arr[i]);
    };
    const pushText = (txt: string) => pushBytes(encoder.encode(txt));

    // ESC @ (Initialize)
    pushBytes([0x1B, 0x40]);

    // Optional Cash Drawer Kick (ESC p m t1 t2)
    if (settings.cashDrawerKick) {
        pushBytes([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    }

    // Center Align
    pushBytes([0x1B, 0x61, 0x01]);

    if (isVoid) {
        pushBytes([0x1B, 0x45, 0x01]); // Bold ON
        pushText('*** TRANSAKSI DIBATALKAN ***\n');
        pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
    }

    // Header Line 1 (Bold)
    pushBytes([0x1B, 0x45, 0x01]);
    pushText(`${(settings.headerLine1 || pondokSettings?.namaPonpes || 'KOPERASI PESANTREN').toUpperCase()}\n`);
    pushBytes([0x1B, 0x45, 0x00]);

    if (settings.headerLine2) {
        pushText(`${settings.headerLine2}\n`);
    }
    pushText(divider);

    // Left Align
    pushBytes([0x1B, 0x61, 0x00]);
    pushText(`Tgl  : ${new Date(t.tanggal).toLocaleString('id-ID')}\n`);
    pushText(`Nota : #${t.id.toString().slice(-6)}\n`);
    pushText(`Kasir: ${t.kasir}\n`);
    pushText(`Plg  : ${t.namaPembeli} (${t.tipePembeli})\n`);
    pushText(divider);

    // Items
    t.items.forEach(item => {
        pushText(`${item.nama}\n`);
        const qtyPrice = `${item.qty} x ${item.harga.toLocaleString('id-ID')}`;
        const sub = item.subtotal.toLocaleString('id-ID');
        pushText(formatLineLR(qtyPrice, sub, cols));
    });

    pushText(divider);
    pushText(formatLineLR('Subtotal:', formatRupiah(t.totalBelanja), cols));
    if (t.potonganDiskon) {
        pushText(formatLineLR(`Diskon (${t.diskonNama || ''}):`, `-${formatRupiah(t.potonganDiskon)}`, cols));
    }

    // Bold Total
    pushBytes([0x1B, 0x45, 0x01]);
    pushText(formatLineLR('TOTAL:', formatRupiah(t.totalFinal), cols));
    pushBytes([0x1B, 0x45, 0x00]);

    if (t.metodePembayaran === 'Hutang') {
        pushText(formatLineLR('Status:', 'KASBON / HUTANG', cols));
        pushText(formatLineLR('DP / Bayar:', formatRupiah(t.bayar || 0), cols));
        pushBytes([0x1B, 0x45, 0x01]);
        pushText(formatLineLR('SISA HUTANG:', formatRupiah(t.sisaTagihan || 0), cols));
        pushBytes([0x1B, 0x45, 0x00]);
    } else {
        pushText(formatLineLR(`Bayar (${t.metodePembayaran}):`, formatRupiah(t.bayar || t.totalFinal), cols));
        if (t.kembali) {
            pushText(formatLineLR('Kembali:', `${formatRupiah(t.kembali)}${t.kembalianMasukSaldo ? ' (Tab)' : ''}`, cols));
        }
    }

    if (isVoid) {
        pushText(divider);
        pushText(`VOID/RETUR: ${t.alasanBatal || '-'}\n`);
    }

    pushText(divider);
    // Center Footer
    pushBytes([0x1B, 0x61, 0x01]);
    if (settings.footerText) {
        pushText(`${settings.footerText}\n`);
    }

    // Feed lines & partial cut
    const feeds = Math.max(1, Math.min(8, settings.feedLines ?? 3));
    pushText('\n'.repeat(feeds));
    pushBytes([0x1D, 0x56, 0x42, 0x00]); // GS V B 0 (Cut paper if supported)

    return new Uint8Array(chunks);
};

const sendBytesToBluetooth = async (bytes: Uint8Array) => {
    if (!btState.characteristic || !btState.device?.gatt?.connected) {
        await connectBluetoothPrinter();
    }
    const char = btState.characteristic;
    const chunkSize = 60; // Safe BLE MTU packet size across Android/Windows printers
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const slice = bytes.slice(i, i + chunkSize);
        if (char.properties.writeWithoutResponse && char.writeValueWithoutResponse) {
            await char.writeValueWithoutResponse(slice);
        } else {
            await char.writeValue(slice);
        }
        await new Promise(r => setTimeout(r, 15));
    }
};

const sendBytesToUsbSerial = async (bytes: Uint8Array) => {
    if (!serialState.port) {
        await connectUsbSerialPrinter();
    }
    const writer = serialState.port.writable.getWriter();
    try {
        await writer.write(bytes);
    } finally {
        writer.releaseLock();
    }
};

const sendBytesToRawBT = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const intentUrl = `intent:base64,${base64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
    window.location.href = intentUrl;
};

export const printThermalReceipt = async (
    t: TransaksiKoperasi,
    pondokSettings: PondokSettings,
    onFeedback?: (msg: string, type: 'success' | 'error' | 'info') => void
) => {
    const settings = getKoperasiSettings(pondokSettings);
    const method = settings.printerMethod || 'browser';

    try {
        if (method === 'bluetooth') {
            const bytes = buildEscPosBytes(t, pondokSettings);
            await sendBytesToBluetooth(bytes);
            onFeedback?.('Struk berhasil dikirim ke Printer Bluetooth.', 'success');
            return;
        }
        if (method === 'usb') {
            const bytes = buildEscPosBytes(t, pondokSettings);
            await sendBytesToUsbSerial(bytes);
            onFeedback?.('Struk berhasil dikirim ke Printer USB.', 'success');
            return;
        }
        if (method === 'rawbt') {
            const bytes = buildEscPosBytes(t, pondokSettings);
            sendBytesToRawBT(bytes);
            onFeedback?.('Membuka jembatan cetak RawBT Android...', 'info');
            return;
        }
    } catch (err: any) {
        onFeedback?.(`${err.message || 'Gagal cetak langsung'}. Membuka dialog cetak sistem sebagai cadangan.`, 'info');
    }

    // Default / Fallback: Browser Print / PDF Native
    const receiptHtml = generateReceiptHtml(t, pondokSettings);
    printToPdfNative(receiptHtml, `Struk_${t.id}`);
};

export const createSampleTransactionForTest = (): TransaksiKoperasi => ({
    id: 990123,
    tanggal: new Date().toISOString(),
    tipePembeli: 'Santri',
    namaPembeli: 'Ahmad Fauzi (Tes Printer)',
    metodePembayaran: 'Tunai',
    items: [
        { produkId: 1, nama: 'Roti Coklat Keju', harga: 5000, qty: 2, subtotal: 10000, stokTersedia: 50 },
        { produkId: 2, nama: 'Air Mineral 600ml', harga: 3000, qty: 1, subtotal: 3000, stokTersedia: 50 }
    ],
    totalBelanja: 13000,
    totalFinal: 13000,
    bayar: 15000,
    kembali: 2000,
    statusTransaksi: 'Lunas',
    kasir: 'Admin Koperasi'
});

export const generateReceiptHtml = (t: TransaksiKoperasi, pondokSettings: PondokSettings) => {
    const koperasiSettings = getKoperasiSettings(pondokSettings);
    const width = koperasiSettings.paperSize === '80mm' ? '72mm' : '48mm';
    const isVoid = t.statusTransaksi === 'Dibatalkan';
    
    return `
        <div style="width: ${width}; font-family: 'Courier New', monospace; font-size: 10px; line-height: 1.2; color: #000; padding: 5px; margin: 0 auto; position: relative;">
            ${isVoid ? `<div style="border: 2px solid #000; text-align: center; font-weight: bold; padding: 3px; margin-bottom: 6px; font-size: 11px;">*** TRANSAKSI DIBATALKAN / RETUR ***</div>` : ''}
            <div style="text-align: center; margin-bottom: 8px;">
                <div style="font-weight: bold; font-size: 12px; text-transform: uppercase;">${koperasiSettings.headerLine1 || pondokSettings.namaPonpes}</div>
                <div style="font-size: 9px;">${koperasiSettings.headerLine2 || pondokSettings.alamat}</div>
            </div>
            <div style="border-bottom: 1px dashed #000; margin-bottom: 5px; padding-bottom: 5px;">
                <div>Tgl: ${new Date(t.tanggal).toLocaleString('id-ID')}</div>
                <div>No: #${t.id.toString().slice(-6)}</div>
                <div>Kasir: ${t.kasir}</div>
                <div>Plg: ${t.namaPembeli} (${t.tipePembeli})</div>
            </div>
            <div style="margin-bottom: 5px;">
                ${t.items.map(item => `
                    <div style="margin-bottom: 3px;">
                        <div>${item.nama}</div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>${item.qty} x ${formatRupiah(item.harga).replace('Rp', '').trim()}</span>
                            <span>${formatRupiah(item.subtotal).replace('Rp', '').trim()}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="border-top: 1px dashed #000; padding-top: 5px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Subtotal:</span>
                    <span>${formatRupiah(t.totalBelanja)}</span>
                </div>
                ${t.potonganDiskon ? `
                <div style="display: flex; justify-content: space-between;">
                    <span>Diskon (${t.diskonNama || ''}):</span>
                    <span>-${formatRupiah(t.potonganDiskon)}</span>
                </div>` : ''}
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; margin-top: 2px;">
                    <span>TOTAL:</span>
                    <span>${formatRupiah(t.totalFinal)}</span>
                </div>
                
                ${t.metodePembayaran === 'Hutang' ? `
                <div style="border-top: 1px dotted #000; margin-top: 4px; padding-top: 4px;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>STATUS:</span>
                        <span>KASBON / HUTANG</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>DP / Bayar:</span>
                        <span>${formatRupiah(t.bayar || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>SISA HUTANG:</span>
                        <span>${formatRupiah(t.sisaTagihan || 0)}</span>
                    </div>
                </div>
                ` : `
                <div style="display: flex; justify-content: space-between; margin-top: 2px;">
                    <span>Bayar (${t.metodePembayaran}):</span>
                    <span>${formatRupiah(t.bayar || t.totalFinal)}</span>
                </div>
                ${t.kembali ? `
                <div style="display: flex; justify-content: space-between;">
                    <span>Kembali:</span>
                    <span>${formatRupiah(t.kembali)} ${t.kembalianMasukSaldo ? '(Ke Tabungan)' : ''}</span>
                </div>` : ''}
                `}
                ${isVoid ? `
                <div style="border-top: 1px dashed #000; margin-top: 4px; padding-top: 4px; font-weight: bold;">
                    <div>STATUS: DIBATALKAN / VOID</div>
                    <div>Alasan: ${t.alasanBatal || '-'}</div>
                </div>` : ''}
            </div>
            <div style="text-align: center; font-size: 9px; margin-top: 10px; white-space: pre-wrap;">${koperasiSettings.footerText}</div>
        </div>
    `;
};
