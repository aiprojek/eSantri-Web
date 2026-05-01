
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { Santri, Tagihan } from '../../types';
import { Pagination } from '../common/Pagination';
import { GenerateTagihanModal } from './modals/GenerateTagihanModal';
import { SantriFilterBar } from '../common/SantriFilterBar';
import { formatRupiah } from '../../utils/formatters';
import { sendManualWA, formatWAMessage, WA_TEMPLATES } from '../../services/waService';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';

interface StatusPembayaranViewProps {
    onBayarClick: (santri: Santri) => void;
    onHistoryClick: (santri: Santri) => void;
    setPrintableSuratTagihanData: (data: { santri: Santri, tunggakan: Tagihan[], total: number }[]) => void;
    canWrite: boolean;
}

export const StatusPembayaranView: React.FC<StatusPembayaranViewProps> = ({ onBayarClick, onHistoryClick, setPrintableSuratTagihanData, canWrite }) => {
    const { settings, showConfirmation } = useAppContext();
    const { santriList } = useSantriContext();
    const { tagihanList } = useFinanceContext();
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    
    const [filters, setFilters] = useState({ search: '', jenjang: '', kelas: '', rombel: '', status: '', statusTunggakan: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
    const btnBase = "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors";
    const btnWa = `${btnBase} border border-green-200 bg-green-50 text-green-700 hover:bg-green-100`;
    const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700`;
    const btnNeutral = `${btnBase} bg-slate-200 text-slate-700 hover:bg-slate-300`;
    const btnBulkGhost = "flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50";
    const btnBulkWa = "flex items-center gap-2 rounded-md border border-green-200 bg-green-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-600";

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
            const santriStatusMatch = !filters.status || item.santri.status === filters.status;
            const statusMatch = !filters.statusTunggakan || (filters.statusTunggakan === 'menunggak' && item.tunggakan.total > 0) || (filters.statusTunggakan === 'lunas' && item.tunggakan.total === 0);

            return (nameMatch || nisMatch) && jenjangMatch && kelasMatch && rombelMatch && santriStatusMatch && statusMatch;
        });
    }, [santriList, tunggakanPerSantri, filters]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

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
                        const message = formatWAMessage(WA_TEMPLATES.TAGIHAN, {
                            nama_santri: santri.namaLengkap,
                            ortu: santri.namaAyah || santri.namaIbu || 'Wali Santri',
                            nominal: d!.tunggakan.total.toLocaleString('id-ID'),
                            bulan: new Date().toLocaleString('id-ID', { month: 'long' })
                        });
                        sendManualWA(phone, message);
                    }
                });
            }, { confirmColor: 'green', confirmText: 'Ya, Buka WhatsApp' });
        }
    };
    
    return (
        <SectionCard
            title="Status Pembayaran Santri"
            description="Pantau tunggakan per santri, saring berdasarkan status santri maupun status tagihan, lalu lanjutkan ke pembayaran atau pengingat."
            actions={canWrite ? (
                <button onClick={() => setIsGenerateModalOpen(true)} className="app-button-primary w-full px-4 py-2 text-sm md:w-auto"><i className="bi bi-plus-circle"></i> Generate Tagihan</button>
            ) : undefined}
            contentClassName="space-y-4 p-5 sm:p-6"
        >
            <SantriFilterBar
                settings={settings}
                filters={filters}
                onChange={setFilters}
                title="Filter Pembayaran"
                searchPlaceholder="Cari Nama atau NIS..."
                resultCount={dataTampilan.length}
                showGender={false}
                extraDesktop={
                    <div>
                        <label className="app-label mb-1.5 block pl-1">Status Tunggakan</label>
                        <select value={filters.statusTunggakan} onChange={e => setFilters({ ...filters, statusTunggakan: e.target.value })} className="app-select w-full p-2.5 text-sm font-semibold">
                            <option value="">Semua Tunggakan</option>
                            <option value="menunggak">Menunggak</option>
                            <option value="lunas">Lunas</option>
                        </select>
                    </div>
                }
                extraMobile={
                    <div>
                        <label className="app-label mb-1.5 ml-1 block">Status Tunggakan</label>
                        <select value={filters.statusTunggakan} onChange={e => setFilters({ ...filters, statusTunggakan: e.target.value })} className="app-select w-full rounded-[20px] p-4 text-base font-semibold">
                            <option value="">Semua Tunggakan</option>
                            <option value="menunggak">Menunggak</option>
                            <option value="lunas">Lunas</option>
                        </select>
                    </div>
                }
                className="mb-6"
            />

            {selectedSantriIds.length > 0 && (
                 <div className="app-toolbar my-4">
                    <div className="text-sm font-semibold text-teal-800">{selectedSantriIds.length} santri dipilih. <button onClick={() => setSelectedSantriIds([])} className="ml-2 text-red-600 hover:underline font-medium">Batalkan</button></div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => handleBulkAction('print')} className={btnBulkGhost}><i className="bi bi-printer"></i> Cetak Surat Tagihan</button>
                         {canWrite && <button onClick={() => handleBulkAction('wa')} className={btnBulkWa}><i className="bi bi-whatsapp"></i> Kirim Notifikasi WA</button>}
                    </div>
                </div>
            )}
            
            <div className="app-table-shell">
            <div className="md:hidden space-y-3 p-3">
                {paginatedData.map(({ santri, tunggakan }) => (
                    <div key={santri.id} className={`rounded-2xl border p-3 ${selectedSantriIds.includes(santri.id) ? 'border-teal-300 bg-teal-50/60' : 'border-slate-200 bg-white'}`}>
                        <div className="mb-2 flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{santri.namaLengkap}</p>
                                <p className="text-xs text-slate-500">{santri.nis}</p>
                            </div>
                            <input type="checkbox" checked={selectedSantriIds.includes(santri.id)} onChange={() => handleSelectOne(santri.id)} className="h-4 w-4 text-teal-600"/>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-red-50 p-2">
                                <p className="text-red-700">Total Tunggakan</p>
                                <p className="font-semibold text-red-700">{formatRupiah(tunggakan.total)}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-2">
                                <p className="text-slate-500">Jumlah Tagihan</p>
                                <p className="font-semibold text-slate-700">{tunggakan.count} tagihan</p>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    const phone = santri.teleponWali || santri.teleponAyah || santri.teleponIbu;
                                    const message = formatWAMessage(WA_TEMPLATES.TAGIHAN, {
                                        nama_santri: santri.namaLengkap,
                                        ortu: santri.namaAyah || santri.namaIbu || 'Wali Santri',
                                        nominal: tunggakan.total.toLocaleString('id-ID'),
                                        bulan: new Date().toLocaleString('id-ID', { month: 'long' })
                                    });
                                    sendManualWA(phone, message);
                                }}
                                className={btnWa}
                                title="Kirim Notif WA"
                            >
                                WA
                            </button>
                            {canWrite && <button onClick={() => onBayarClick(santri)} className={btnPrimary}>Bayar</button>}
                            <button onClick={() => onHistoryClick(santri)} className={btnNeutral}>Riwayat</button>
                        </div>
                    </div>
                ))}
                {dataTampilan.length === 0 && (
                    <EmptyState
                        icon="bi-receipt-cutoff"
                        title="Tidak ada status pembayaran yang cocok"
                        description="Periksa kombinasi filter santri dan status tunggakan untuk menampilkan daftar yang relevan."
                        compact
                    />
                )}
            </div>
            <div className="app-scrollbar hidden overflow-x-auto md:block">
                <table className="app-table min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="text-left">
                        <tr>
                            <th className="p-3"><input type="checkbox" ref={selectAllCheckboxRef} onChange={handleSelectAllOnPage} className="h-4 w-4 text-teal-600"/></th>
                            <th className="px-4 py-2">Nama Santri</th>
                            <th className="px-4 py-2">Total Tunggakan</th>
                            <th className="px-4 py-2">Jumlah Tagihan</th>
                            <th className="px-4 py-2 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {paginatedData.map(({ santri, tunggakan }) => (
                            <tr key={santri.id} className={selectedSantriIds.includes(santri.id) ? 'bg-teal-50/60' : 'hover:bg-teal-50/40'}>
                                <td className="p-3"><input type="checkbox" checked={selectedSantriIds.includes(santri.id)} onChange={() => handleSelectOne(santri.id)} className="h-4 w-4 text-teal-600"/></td>
                                <td className="whitespace-nowrap px-4 py-3"><div className="font-semibold text-slate-800">{santri.namaLengkap}</div><div className="text-xs text-slate-500">{santri.nis}</div></td>
                                <td className="px-4 py-3 font-semibold text-red-600">{formatRupiah(tunggakan.total)}</td>
                                <td className="px-4 py-3 text-slate-600">{tunggakan.count} tagihan</td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    <button 
                                        onClick={() => {
                                            const phone = santri.teleponWali || santri.teleponAyah || santri.teleponIbu;
                                            const message = formatWAMessage(WA_TEMPLATES.TAGIHAN, {
                                                nama_santri: santri.namaLengkap,
                                                ortu: santri.namaAyah || santri.namaIbu || 'Wali Santri',
                                                nominal: tunggakan.total.toLocaleString('id-ID'),
                                                bulan: new Date().toLocaleString('id-ID', { month: 'long' })
                                            });
                                            sendManualWA(phone, message);
                                        }}
                                        className={btnWa}
                                        title="Kirim Notif WA"
                                    >
                                        WA
                                    </button>
                                    {canWrite && <button onClick={() => onBayarClick(santri)} className={btnPrimary}>Bayar</button>}
                                    <button onClick={() => onHistoryClick(santri)} className={btnNeutral}>Riwayat</button>
                                </td>
                            </tr>
                        ))}
                        {dataTampilan.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-0">
                                    <EmptyState
                                        icon="bi-receipt-cutoff"
                                        title="Tidak ada status pembayaran yang cocok"
                                        description="Periksa kombinasi filter santri dan status tunggakan untuk menampilkan daftar yang relevan."
                                        compact
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            </div>
             <div className="mt-4"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>
             <GenerateTagihanModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} />
        </SectionCard>
    );
};
