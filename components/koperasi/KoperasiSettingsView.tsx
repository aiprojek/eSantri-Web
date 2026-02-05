
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { StrukPreview, KoperasiSettings, DEFAULT_KOP_SETTINGS } from './Shared';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../../db';
import { Diskon } from '../../types';
import { formatRupiah } from '../../utils/formatters';

export const KoperasiSettingsView: React.FC = () => {
    const { showToast, showConfirmation } = useAppContext();
    const [config, setConfig] = useState<KoperasiSettings>(DEFAULT_KOP_SETTINGS);
    const [isConnecting, setIsConnecting] = useState(false);
    const [device, setDevice] = useState<any | null>(null);

    // Diskon Logic
    const discounts = useLiveQuery(() => db.diskon.toArray(), []) || [];
    const [newDiskon, setNewDiskon] = useState<Partial<Diskon>>({ nama: '', tipe: 'Nominal', nilai: 0, aktif: true });

    useEffect(() => {
        const saved = localStorage.getItem('esantri_koperasi_settings');
        if (saved) setConfig(JSON.parse(saved));
    }, []);

    const handleSave = () => {
        localStorage.setItem('esantri_koperasi_settings', JSON.stringify(config));
        showToast('Pengaturan Koperasi disimpan.', 'success');
    };

    const handleAddDiskon = async () => {
        if (!newDiskon.nama || !newDiskon.nilai) return;
        await db.diskon.add({ ...newDiskon, id: Date.now() } as Diskon);
        setNewDiskon({ nama: '', tipe: 'Nominal', nilai: 0, aktif: true });
        showToast('Diskon ditambahkan', 'success');
    };

    const handleDeleteDiskon = (id: number) => {
        showConfirmation('Hapus Diskon?', 'Diskon ini tidak akan muncul lagi di kasir.', async () => {
            await db.diskon.delete(id);
            showToast('Diskon dihapus', 'success');
        }, { confirmColor: 'red' });
    };

    const toggleDiskon = async (d: Diskon) => {
        await db.diskon.update(d.id, { aktif: !d.aktif });
    };

    const connectPrinter = async () => {
        if (!(navigator as any).bluetooth) {
            alert("Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome/Edge di Android/Desktop.");
            return;
        }
        setIsConnecting(true);
        try {
            const dev = await (navigator as any).bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }] // Standard UUID for many thermal printers
            });
            await dev.gatt?.connect();
            setDevice(dev);
            showToast(`Terhubung ke ${dev.name}`, 'success');
        } catch (e) {
            alert('Gagal koneksi: ' + e);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleTestPrint = async () => {
         if (device && device.gatt && device.gatt.connected) {
             showToast('Mengirim perintah cetak test...', 'info');
         } else {
             showToast('Printer belum terhubung via Bluetooth. Mencoba print dialog browser...', 'info');
             window.print();
         }
    };

    const dummyItems = [
        { produkId: 1, nama: 'Roti O', harga: 5000, qty: 2, subtotal: 10000, stokTersedia: 10 },
        { produkId: 2, nama: 'Es Teh', harga: 3000, qty: 1, subtotal: 3000, stokTersedia: 10 },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-auto">
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md border">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Profil Koperasi</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Nama Toko / Koperasi</label>
                            <input type="text" value={config.storeName} onChange={e => setConfig({...config, storeName: e.target.value})} className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Alamat Singkat</label>
                            <input type="text" value={config.storeAddress} onChange={e => setConfig({...config, storeAddress: e.target.value})} className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Footer Struk</label>
                            <textarea value={config.receiptFooter} onChange={e => setConfig({...config, receiptFooter: e.target.value})} className="w-full border rounded p-2 text-sm" rows={2}></textarea>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Lebar Kertas</label>
                            <select value={config.printerWidth} onChange={e => setConfig({...config, printerWidth: e.target.value as any})} className="w-full border rounded p-2 text-sm">
                                <option value="58mm">58mm (Standar Bluetooth)</option>
                                <option value="80mm">80mm (Desktop)</option>
                            </select>
                        </div>
                        <button onClick={handleSave} className="bg-teal-600 text-white px-4 py-2 rounded font-bold text-sm w-full hover:bg-teal-700">Simpan Profil</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border border-orange-200">
                    <h3 className="font-bold text-orange-800 mb-4 border-b pb-2"><i className="bi bi-tag-fill"></i> Manajemen Diskon</h3>
                    <div className="mb-4 bg-orange-50 p-3 rounded text-sm space-y-2">
                        <input type="text" value={newDiskon.nama} onChange={e => setNewDiskon({...newDiskon, nama: e.target.value})} placeholder="Nama Diskon (Jumat Berkah)" className="w-full border rounded p-1.5" />
                        <div className="flex gap-2">
                            <select value={newDiskon.tipe} onChange={e => setNewDiskon({...newDiskon, tipe: e.target.value as any})} className="border rounded p-1.5 w-1/3 text-xs">
                                <option value="Nominal">Rp</option>
                                <option value="Persen">%</option>
                            </select>
                            <input type="number" value={newDiskon.nilai || ''} onChange={e => setNewDiskon({...newDiskon, nilai: parseFloat(e.target.value)})} placeholder="Nilai" className="flex-grow border rounded p-1.5" />
                            <button onClick={handleAddDiskon} className="bg-orange-600 text-white px-3 rounded text-xs hover:bg-orange-700">Tambah</button>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {discounts.map(d => (
                            <div key={d.id} className="flex justify-between items-center p-2 border rounded hover:bg-gray-50">
                                <div>
                                    <div className="font-bold text-sm">{d.nama}</div>
                                    <div className="text-xs text-gray-500">{d.tipe === 'Nominal' ? formatRupiah(d.nilai) : `${d.nilai}%`}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleDiskon(d)} className={`text-xs px-2 py-1 rounded ${d.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {d.aktif ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                    <button onClick={() => handleDeleteDiskon(d.id)} className="text-red-500 hover:text-red-700"><i className="bi bi-trash"></i></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                 <div className="bg-white p-6 rounded-lg shadow-md border border-blue-200">
                    <h3 className="font-bold text-blue-800 mb-4 border-b pb-2"><i className="bi bi-bluetooth"></i> Printer Bluetooth</h3>
                    <div className="space-y-3">
                         <div className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                             <span className="text-sm font-medium">{device ? `Terhubung: ${device.name}` : 'Belum Terhubung'}</span>
                             <span className={`w-3 h-3 rounded-full ${device ? 'bg-green-500' : 'bg-red-500'}`}></span>
                         </div>
                         <button onClick={connectPrinter} disabled={isConnecting} className="w-full bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-blue-700 disabled:bg-gray-400">
                             {isConnecting ? 'Mencari...' : 'Cari & Hubungkan Printer'}
                         </button>
                         <button onClick={handleTestPrint} className="w-full bg-gray-100 text-gray-700 border px-4 py-2 rounded font-bold text-sm hover:bg-gray-200">
                             Test Print Struk
                         </button>
                    </div>
                </div>

                <div className="bg-gray-100 p-6 rounded-lg border shadow-inner flex flex-col items-center">
                    <h3 className="font-bold text-gray-600 mb-4 text-sm">Preview Struk</h3>
                    <div className="shadow-lg">
                        <StrukPreview items={dummyItems} settings={config} isPreview={true} />
                    </div>
                </div>
            </div>
        </div>
    );
};
