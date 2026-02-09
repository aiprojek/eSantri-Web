
import React from 'react';
import { TransaksiKoperasi, CartItem } from '../../types';
import { formatRupiah, formatDateTime } from '../../utils/formatters';

// --- TYPES & CONSTANTS ---

export interface KoperasiSettings {
    storeName: string;
    storeAddress: string;
    receiptFooter: string;
    printerWidth: '58mm' | '80mm';
}

export const DEFAULT_KOP_SETTINGS: KoperasiSettings = {
    storeName: 'Koperasi Santri',
    storeAddress: 'Area Pondok Pesantren',
    receiptFooter: 'Terima Kasih atas Kunjungan Anda',
    printerWidth: '58mm'
};

// --- HELPER: STRUK PREVIEW COMPONENT ---
export const StrukPreview: React.FC<{ transaksi?: TransaksiKoperasi, items?: CartItem[], settings: KoperasiSettings, isPreview?: boolean }> = ({ transaksi, items, settings, isPreview }) => {
    const dataItems = transaksi ? transaksi.items : (items || []);
    const total = transaksi ? transaksi.totalBelanja : dataItems.reduce((acc, i) => acc + i.subtotal, 0);
    const date = transaksi ? formatDateTime(transaksi.tanggal) : formatDateTime(new Date().toISOString());
    const widthStyle = settings.printerWidth === '58mm' ? '58mm' : '80mm';

    return (
        <div className={`font-mono text-black text-[10px] leading-tight bg-white p-2 ${isPreview ? 'border shadow-sm mx-auto' : ''}`} style={{ width: widthStyle }}>
            <div className="text-center mb-2 pb-2 border-b border-black border-dashed">
                <div className="font-bold text-sm">{settings.storeName}</div>
                <div className="text-[9px]">{settings.storeAddress}</div>
                <div className="mt-1">{date}</div>
            </div>
            
            {transaksi && (
                <div className="mb-2 border-b border-black border-dashed pb-1">
                    <div>Pelanggan: {transaksi.namaPembeli.substring(0,15)}</div>
                    <div>Kasir: {transaksi.kasir}</div>
                </div>
            )}

            <div className="border-b border-black border-dashed pb-2 mb-2">
                {dataItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between mb-0.5">
                        <div className="w-full">
                            <div>{item.nama}</div>
                            <div className="flex justify-between">
                                <span>{item.qty} x {item.harga.toLocaleString()}</span>
                                <span>{item.subtotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between font-bold text-xs">
                <span>TOTAL</span>
                <span>{formatRupiah(total)}</span>
            </div>
            
            {transaksi && (
                <>
                    <div className="flex justify-between mt-1">
                        <span>{transaksi.metodePembayaran}</span>
                        <span>{formatRupiah(transaksi.bayar || 0)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>Kembali</span>
                        <span>{formatRupiah(transaksi.kembali || 0)}</span>
                    </div>
                </>
            )}

            <div className="text-center mt-4 pt-2 border-t border-black border-dashed">
                <p className="mb-2">{settings.receiptFooter}</p>
                <p className="text-[8px] italic opacity-70">
                    dibuat dengan aplikasi eSantri Web<br/>
                    by AI Projek | aiprojek01.my.id
                </p>
            </div>
        </div>
    );
};
