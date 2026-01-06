
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { Santri, Tagihan } from '../../types';
import { Pagination } from '../common/Pagination';
import { GenerateTagihanModal } from './modals/GenerateTagihanModal';
import { formatRupiah } from '../../utils/formatters';

interface StatusPembayaranViewProps {
    onBayarClick: (santri: Santri) => void;
    onHistoryClick: (santri: Santri) => void;
    setPrintableSuratTagihanData: (data: { santri: Santri, tunggakan: Tagihan[], total: number }[]) => void;
    canWrite: boolean;
}

export const StatusPembayaranView: React.FC<StatusPembayaranViewProps> = ({ onBayarClick, onHistoryClick, setPrintableSuratTagihanData, canWrite }) => {
    const { santriList, tagihanList, settings, showConfirmation } = useAppContext();
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    
    const [filters, setFilters] = useState({ search: '', jenjang: '', kelas: '', rombel: '', statusTunggakan: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);

    const availableKelas = useMemo(() => {
        if (!filters.jenjang) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === parseInt(filters.jenjang));
      }, [filters.jenjang, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (!filters.kelas) return settings.rombel.filter(r => availableKelas.map(k => k.id).includes(r.kelasId));
        return settings.rombel.filter(r => r.kelasId === parseInt(filters.kelas));
      }, [filters.kelas, settings.rombel, availableKelas]);

    const tunggakanPerSantri = useMemo(() => {
        const result = new Map<number, { total: number; count: number; tagihan: Tagihan[] }>();
        tagihanList.forEach(t => {
            if (t.status === 'Belum Lunas') {
                if (!result.has(t.santriId)) {
                    result.set(t.santriId, { total: 0, count: 0, tagihan: [] });
                }
                const data = result.get(t.santriId)!;
                data.total += t.nominal;
                data.count += 1;
                data.tagihan.push(t);
            }
        });
        return result;
    }, [tagihanList]);
    
    const dataTampilan = useMemo(() => {
        return santriList.map(santri => ({
            santri,
            tunggakan: tunggakanPerSantri.get(santri.id) || { total: 0, count: 0, tagihan: [] }
        })).filter(item => {
            const searchLower = filters.search.toLowerCase();
            const nameMatch = item.santri.namaLengkap.toLowerCase().includes(searchLower);
            const nisMatch = item.santri.nis.toLowerCase().includes(searchLower);

            const jenjangMatch = !filters.jenjang || item.santri.jenjangId === parseInt(filters.jenjang);
            const kelasMatch = !filters.kelas || item.santri.kelasId === parseInt(filters.kelas);
            const rombelMatch = !filters.rombel || item.santri.rombelId === parseInt(filters.rombel);
            const statusMatch = !filters.statusTunggakan || (filters.statusTunggakan === 'menunggak' && item.tunggakan.total > 0) || (filters.statusTunggakan === 'lunas' && item.tunggakan.total === 0);

            return (nameMatch || nisMatch) && jenjangMatch && kelasMatch && rombelMatch && statusMatch;
        });
    }, [santriList, tunggakanPerSantri, filters]);

    const paginatedData = useMemo(() => {
        return dataTampilan.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [dataTampilan, currentPage, itemsPerPage]);
    const totalPages = Math.ceil(dataTampilan.length / itemsPerPage);

    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    const paginatedIds = useMemo(() => paginatedData.map(d => d.santri.id), [paginatedData]);
    const allOnPageSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedSantriIds.includes(id));
     useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const someOnPageSelected = paginatedIds.some(id => selectedSantriIds.includes(id));
            selectAllCheckboxRef.current.checked = allOnPageSelected;
            selectAllCheckboxRef.current.indeterminate = someOnPageSelected && !allOnPageSelected;
        }
    }, [selectedSantriIds, paginatedIds, allOnPageSelected]);

    const handleSelectOne = (id: number) => {
        setSelectedSantriIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAllOnPage = () => {
        if (allOnPageSelected) {
            setSelectedSantriIds(prev => prev.filter(id => !paginatedIds.includes(id)));
        } else {
            setSelectedSantriIds(prev => [...new Set([...prev, ...paginatedIds])]);
        }
    };

    const handleBulkAction = (action: 'print' | 'wa') => {
        const selectedData = selectedSantriIds
            .map(id => dataTampilan.find(d => d.santri.id === id))
            .filter(d => d && d.tunggakan.total > 0);

        if (selectedData.length === 0) {
            alert('Tidak ada santri menunggak yang dipilih.');
            return;
        }

        if (action === 'print') {
            const printable = selectedData.map(d => ({ santri: d!.santri, tunggakan: d!.tunggakan.tagihan, total: d!.tunggakan.total }));
            setPrintableSuratTagihanData(printable);
        } else if (action === 'wa') {
            showConfirmation('Kirim Notifikasi WA?', `Anda akan membuka ${selectedData.length} tab WhatsApp untuk mengirim notifikasi tunggakan. Lanjutkan?`, () => {
                selectedData.forEach(d => {
                    const santri = d!.santri;
                    const phone = santri.teleponWali || santri.teleponAyah || santri.teleponIbu;
                    if (phone) {
                        let message = settings.pesanWaTunggakan
                            .replace('{NAMA_SANTRI}', santri.namaLengkap)
                            .replace('{JUMLAH_TUNGGAKAN}', `Rp ${d!.tunggakan.total.toLocaleString('id-ID')}`)
                            .replace('{NAMA_PONPES}', settings.namaPonpes);
                        message += "\n\n_dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id_";
                        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                    }
                });
            }, { confirmColor: 'green', confirmText: 'Ya, Buka WhatsApp' });
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-gray-700">Status Pembayaran Santri</h2>
                {canWrite && (
                    <button onClick={() => setIsGenerateModalOpen(true)} className="w-full md:w-auto px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm flex items-center justify-center gap-2"><i className="bi bi-plus-circle"></i> Generate Tagihan</button>
                )}
            </div>
             {/* Filters UI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
                <div className="sm:col-span-2 lg:col-span-5">
                    <input type="text" placeholder="Cari Nama atau NIS..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full bg-white border border-gray-300 rounded-md p-2"/>
                </div>
                <select value={filters.jenjang} onChange={e => setFilters({...filters, jenjang: e.target.value, kelas: '', rombel: ''})} className="bg-white border p-2 text-sm rounded-md"><option value="">Semua Jenjang</option>{settings.jenjang.map(j=><option key={j.id} value={j.id}>{j.nama}</option>)}</select>
                <select value={filters.kelas} onChange={e => setFilters({...filters, kelas: e.target.value, rombel: ''})} className="bg-white border p-2 text-sm rounded-md"><option value="">Semua Kelas</option>{availableKelas.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}</select>
                <select value={filters.rombel} onChange={e => setFilters({...filters, rombel: e.target.value})} className="bg-white border p-2 text-sm rounded-md"><option value="">Semua Rombel</option>{availableRombel.map(r=><option key={r.id} value={r.id}>{r.nama}</option>)}</select>
                <select value={filters.statusTunggakan} onChange={e => setFilters({...filters, statusTunggakan: e.target.value})} className="bg-white border p-2 text-sm rounded-md"><option value="">Semua Status</option><option value="menunggak">Menunggak</option><option value="lunas">Lunas</option></select>
            </div>

            {selectedSantriIds.length > 0 && (
                 <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-2 my-4 rounded-lg bg-teal-50 border border-teal-200">
                    <div className="text-sm font-semibold text-teal-800">{selectedSantriIds.length} santri dipilih. <button onClick={() => setSelectedSantriIds([])} className="ml-2 text-red-600 hover:underline font-medium">Batalkan</button></div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => handleBulkAction('print')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md hover:bg-gray-100 border"><i className="bi bi-printer"></i> Cetak Surat Tagihan</button>
                         {canWrite && <button onClick={() => handleBulkAction('wa')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-500 rounded-md hover:bg-green-600 border"><i className="bi bi-whatsapp"></i> Kirim Notifikasi WA</button>}
                    </div>
                </div>
            )}
            
            <div className="border rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                        <tr>
                            <th className="p-3"><input type="checkbox" ref={selectAllCheckboxRef} onChange={handleSelectAllOnPage} className="h-4 w-4 text-teal-600"/></th>
                            <th className="px-4 py-2">Nama Santri</th>
                            <th className="px-4 py-2">Total Tunggakan</th>
                            <th className="px-4 py-2">Jumlah Tagihan</th>
                            <th className="px-4 py-2 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.map(({ santri, tunggakan }) => (
                            <tr key={santri.id} className={selectedSantriIds.includes(santri.id) ? 'bg-teal-50' : ''}>
                                <td className="p-3"><input type="checkbox" checked={selectedSantriIds.includes(santri.id)} onChange={() => handleSelectOne(santri.id)} className="h-4 w-4 text-teal-600"/></td>
                                <td className="px-4 py-3 whitespace-nowrap"><div className="font-semibold">{santri.namaLengkap}</div><div className="text-xs text-gray-500">{santri.nis}</div></td>
                                <td className="px-4 py-3 font-semibold text-red-600">{formatRupiah(tunggakan.total)}</td>
                                <td className="px-4 py-3">{tunggakan.count} tagihan</td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    {canWrite && <button onClick={() => onBayarClick(santri)} className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700">Bayar</button>}
                                    <button onClick={() => onHistoryClick(santri)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-300">Riwayat</button>
                                </td>
                            </tr>
                        ))}
                         {dataTampilan.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">Tidak ada data santri yang cocok dengan filter.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
             <div className="mt-4"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>
             <GenerateTagihanModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} />
        </div>
    );
};
