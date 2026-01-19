
import React, { useState, useMemo } from 'react';
import { Buku, Sirkulasi as SirkulasiType } from '../../types';
import { useSantriContext } from '../../contexts/SantriContext';
import { useAppContext } from '../../AppContext';
import { formatRupiah, formatDate } from '../../utils/formatters';

interface SirkulasiProps {
    sirkulasiList: SirkulasiType[];
    bukuList: Buku[];
    onPinjam: (santriId: number, bukuId: number, duration: number) => void;
    onKembali: (id: number, denda: number, catatan: string) => void;
    canWrite: boolean;
}

export const Sirkulasi: React.FC<SirkulasiProps> = ({ sirkulasiList, bukuList, onPinjam, onKembali, canWrite }) => {
    const { santriList } = useSantriContext();
    const { settings } = useAppContext();
    const [mode, setMode] = useState<'pinjam' | 'kembali' | 'riwayat'>('pinjam');
    
    // Pinjam State
    const [searchSantri, setSearchSantri] = useState('');
    const [selectedSantriId, setSelectedSantriId] = useState<number | null>(null);
    const [searchBuku, setSearchBuku] = useState('');
    const [selectedBukuId, setSelectedBukuId] = useState<number | null>(null);
    const [duration, setDuration] = useState(7); // Default 7 hari

    // Kembali State
    const [returnSearch, setReturnSearch] = useState('');

    // --- LOGIC ---
    const activeSantriList = useMemo(() => {
        if (!searchSantri) return [];
        return santriList.filter(s => s.status === 'Aktif' && (s.namaLengkap.toLowerCase().includes(searchSantri.toLowerCase()) || s.nis.includes(searchSantri)));
    }, [santriList, searchSantri]);

    const activeBukuList = useMemo(() => {
        if (!searchBuku) return [];
        return bukuList.filter(b => (b.judul.toLowerCase().includes(searchBuku.toLowerCase()) || b.kodeBuku.toLowerCase().includes(searchBuku.toLowerCase())) && b.stok > 0);
    }, [bukuList, searchBuku]);

    const activeLoans = useMemo(() => {
        return sirkulasiList
            .filter(s => s.status === 'Dipinjam')
            .map(s => {
                const santri = santriList.find(sa => sa.id === s.santriId);
                const buku = bukuList.find(b => b.id === s.bukuId);
                return { ...s, santriName: santri?.namaLengkap || 'Unknown', santriNis: santri?.nis, bukuJudul: buku?.judul || 'Unknown', bukuKode: buku?.kodeBuku };
            })
            .filter(item => {
                if (!returnSearch) return true;
                const lower = returnSearch.toLowerCase();
                return item.santriName.toLowerCase().includes(lower) || item.bukuJudul.toLowerCase().includes(lower) || item.santriNis?.includes(lower);
            });
    }, [sirkulasiList, santriList, bukuList, returnSearch]);

    const history = useMemo(() => {
        return sirkulasiList
            .filter(s => s.status !== 'Dipinjam')
            .sort((a,b) => new Date(b.tanggalDikembalikan || '').getTime() - new Date(a.tanggalDikembalikan || '').getTime())
            .map(s => {
                const santri = santriList.find(sa => sa.id === s.santriId);
                const buku = bukuList.find(b => b.id === s.bukuId);
                return { ...s, santriName: santri?.namaLengkap || 'Unknown', bukuJudul: buku?.judul || 'Unknown' };
            })
            .slice(0, 50); // Limit 50
    }, [sirkulasiList, santriList, bukuList]);

    const calculateFine = (dueDate: string) => {
        const due = new Date(dueDate);
        const today = new Date();
        // Reset hours
        due.setHours(0,0,0,0);
        today.setHours(0,0,0,0);
        
        if (today <= due) return 0;
        const diffTime = Math.abs(today.getTime() - due.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays * 500; // Rp 500 per hari (Hardcoded default, could be setting)
    };

    const handleProsesPinjam = () => {
        if (selectedSantriId && selectedBukuId) {
            onPinjam(selectedSantriId, selectedBukuId, duration);
            setSelectedBukuId(null);
            setSearchBuku('');
            // Keep santri selected for multiple borrowing
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-gray-700 mb-4">Menu Sirkulasi</h3>
                    <div className="space-y-2">
                        <button onClick={() => setMode('pinjam')} className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${mode === 'pinjam' ? 'bg-teal-50 border-teal-500 text-teal-800' : 'bg-white hover:bg-gray-50'}`}>
                            <div className="font-bold"><i className="bi bi-box-arrow-up-right mr-2"></i> Peminjaman Baru</div>
                            <div className="text-xs opacity-70 mt-1">Catat santri meminjam buku</div>
                        </button>
                        <button onClick={() => setMode('kembali')} className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${mode === 'kembali' ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-white hover:bg-gray-50'}`}>
                            <div className="font-bold"><i className="bi bi-box-arrow-in-down-left mr-2"></i> Pengembalian</div>
                            <div className="text-xs opacity-70 mt-1">Proses buku kembali & hitung denda</div>
                        </button>
                         <button onClick={() => setMode('riwayat')} className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${mode === 'riwayat' ? 'bg-gray-100 border-gray-400 text-gray-800' : 'bg-white hover:bg-gray-50'}`}>
                            <div className="font-bold"><i className="bi bi-clock-history mr-2"></i> Riwayat Transaksi</div>
                        </button>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2">
                {mode === 'pinjam' && (
                    <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
                        <h3 className="text-lg font-bold text-teal-800 mb-4 border-b pb-2">Input Peminjaman</h3>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-600 mb-1">1. Cari Santri (NIS / Nama)</label>
                            <div className="relative">
                                <input type="text" value={searchSantri} onChange={e => setSearchSantri(e.target.value)} className="w-full border rounded p-2 pl-9" placeholder="Scan Barcode atau Ketik Nama..." autoFocus />
                                <i className="bi bi-search absolute left-3 top-3 text-gray-400"></i>
                            </div>
                            {searchSantri && !selectedSantriId && (
                                <div className="mt-2 border rounded bg-gray-50 max-h-40 overflow-y-auto">
                                    {activeSantriList.map(s => (
                                        <div key={s.id} onClick={() => { setSelectedSantriId(s.id); setSearchSantri(s.namaLengkap); }} className="p-2 hover:bg-teal-100 cursor-pointer text-sm">
                                            <span className="font-bold">{s.namaLengkap}</span> <span className="text-gray-500 text-xs">({s.nis})</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedSantriId && (
                            <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold text-teal-800">Santri Terpilih: {santriList.find(s=>s.id===selectedSantriId)?.namaLengkap}</span>
                                    <button onClick={() => { setSelectedSantriId(null); setSearchSantri(''); }} className="text-red-500 text-xs hover:underline">Ganti</button>
                                </div>
                                
                                <label className="block text-sm font-bold text-gray-600 mb-1">2. Cari Buku (Judul / Kode)</label>
                                <div className="relative mb-2">
                                    <input type="text" value={searchBuku} onChange={e => setSearchBuku(e.target.value)} className="w-full border rounded p-2 pl-9" placeholder="Ketik Judul Buku..." />
                                    <i className="bi bi-book absolute left-3 top-3 text-gray-400"></i>
                                </div>
                                {searchBuku && !selectedBukuId && (
                                    <div className="border rounded bg-white max-h-40 overflow-y-auto absolute z-10 w-full shadow-lg">
                                        {activeBukuList.map(b => (
                                            <div key={b.id} onClick={() => { setSelectedBukuId(b.id); setSearchBuku(b.judul); }} className="p-2 hover:bg-blue-100 cursor-pointer text-sm border-b">
                                                <div className="font-bold">{b.judul}</div>
                                                <div className="text-xs text-gray-500">{b.kodeBuku} - Stok: {b.stok}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-4 items-end mt-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Durasi</label>
                                        <select value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="border rounded p-2 text-sm">
                                            <option value={3}>3 Hari</option>
                                            <option value={7}>1 Minggu</option>
                                            <option value={14}>2 Minggu</option>
                                        </select>
                                    </div>
                                    <button 
                                        onClick={handleProsesPinjam} 
                                        disabled={!selectedBukuId || !canWrite}
                                        className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-300 flex-grow"
                                    >
                                        Proses Peminjaman
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {mode === 'kembali' && (
                    <div className="bg-white p-6 rounded-lg shadow-md border border-blue-200">
                         <h3 className="text-lg font-bold text-blue-800 mb-4 border-b pb-2">Proses Pengembalian</h3>
                         <div className="mb-4">
                            <input type="text" value={returnSearch} onChange={e => setReturnSearch(e.target.value)} placeholder="Cari Peminjam atau Judul Buku..." className="w-full border rounded p-2 text-sm" />
                         </div>
                         <div className="space-y-3">
                             {activeLoans.map(loan => {
                                 const fine = calculateFine(loan.tanggalKembaliSeharusnya);
                                 return (
                                     <div key={loan.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-gray-50">
                                         <div className="flex justify-between items-start">
                                             <div>
                                                 <div className="font-bold text-gray-800">{loan.bukuJudul}</div>
                                                 <div className="text-sm text-gray-600">{loan.santriName} ({loan.santriNis})</div>
                                                 <div className="text-xs text-gray-500 mt-1">
                                                     Pinjam: {formatDate(loan.tanggalPinjam)} <i className="bi bi-arrow-right mx-1"></i> 
                                                     <span className={fine > 0 ? "text-red-600 font-bold" : "text-green-600"}>Jatuh Tempo: {formatDate(loan.tanggalKembaliSeharusnya)}</span>
                                                 </div>
                                             </div>
                                             <div className="text-right">
                                                 {fine > 0 && <div className="text-red-600 font-bold text-sm mb-2">Denda: {formatRupiah(fine)}</div>}
                                                 {canWrite && (
                                                     <button 
                                                        onClick={() => {
                                                            if(confirm(`Proses pengembalian buku? ${fine > 0 ? `Denda: ${formatRupiah(fine)}` : ''}`)) {
                                                                onKembali(loan.id, fine, fine > 0 ? 'Terlambat' : 'Tepat Waktu');
                                                            }
                                                        }}
                                                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700"
                                                     >
                                                         Kembalikan
                                                     </button>
                                                 )}
                                             </div>
                                         </div>
                                     </div>
                                 )
                             })}
                             {activeLoans.length === 0 && <p className="text-center text-gray-500 py-4">Tidak ada peminjaman aktif.</p>}
                         </div>
                    </div>
                )}

                {mode === 'riwayat' && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                         <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Riwayat Transaksi (50 Terakhir)</h3>
                         <div className="overflow-x-auto">
                             <table className="w-full text-sm text-left">
                                 <thead className="bg-gray-100 text-gray-600">
                                     <tr>
                                         <th className="p-2">Tgl Kembali</th>
                                         <th className="p-2">Santri</th>
                                         <th className="p-2">Buku</th>
                                         <th className="p-2">Status</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y">
                                     {history.map(h => (
                                         <tr key={h.id}>
                                             <td className="p-2 text-gray-500 text-xs">{formatDate(h.tanggalDikembalikan)}</td>
                                             <td className="p-2 font-medium">{h.santriName}</td>
                                             <td className="p-2">{h.bukuJudul}</td>
                                             <td className="p-2">
                                                 {h.status === 'Kembali' && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Selesai</span>}
                                                 {h.status === 'Hilang' && <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">Hilang</span>}
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};
