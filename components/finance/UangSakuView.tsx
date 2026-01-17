
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { Santri, SaldoSantri } from '../../types';
import { Pagination } from '../common/Pagination';
import { TransaksiSaldoModal } from './modals/TransaksiSaldoModal';
import { RiwayatUangSakuModal } from './modals/RiwayatUangSakuModal';
import { formatRupiah } from '../../utils/formatters';

export const UangSakuView: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
    const { settings, showToast, showAlert } = useAppContext();
    const { santriList } = useSantriContext();
    const { saldoSantriList, onAddTransaksiSaldo } = useFinanceContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ santri: Santri, jenis: 'Deposit' | 'Penarikan' } | null>(null);
    const [historySantri, setHistorySantri] = useState<Santri | null>(null);

    const [filters, setFilters] = useState({ search: '', jenjang: '', kelas: '', rombel: '', gender: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const availableKelas = useMemo(() => {
        if (!filters.jenjang) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === parseInt(filters.jenjang));
      }, [filters.jenjang, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (!filters.kelas) return settings.rombel.filter(r => availableKelas.map(k => k.id).includes(r.kelasId));
        return settings.rombel.filter(r => r.kelasId === parseInt(filters.kelas));
      }, [filters.kelas, settings.rombel, availableKelas]);

    const saldoMap = useMemo(() => new Map(saldoSantriList.map(s => [s.santriId, s.saldo])), [saldoSantriList]);

    const dataTampilan = useMemo(() => {
        return santriList
            .filter(s => {
                const searchLower = filters.search.toLowerCase();
                const nameMatch = s.namaLengkap.toLowerCase().includes(searchLower);
                const nisMatch = s.nis.toLowerCase().includes(searchLower);

                const jenjangMatch = !filters.jenjang || s.jenjangId === parseInt(filters.jenjang);
                const kelasMatch = !filters.kelas || s.kelasId === parseInt(filters.kelas);
                const rombelMatch = !filters.rombel || s.rombelId === parseInt(filters.rombel);
                const genderMatch = !filters.gender || s.jenisKelamin === filters.gender;

                return s.status === 'Aktif' && (nameMatch || nisMatch) && jenjangMatch && kelasMatch && rombelMatch && genderMatch;
            })
            .map(santri => ({
                santri,
                saldo: saldoMap.get(santri.id) || 0,
            }));
    }, [santriList, saldoMap, filters, settings]);

    const paginatedData = useMemo(() => {
        return dataTampilan.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [dataTampilan, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(dataTampilan.length / itemsPerPage);

    const openModal = (santri: Santri, jenis: 'Deposit' | 'Penarikan') => {
        if (!canWrite) return;
        setModalData({ santri, jenis });
        setIsModalOpen(true);
    };

    const openHistoryModal = (santri: Santri) => {
        setHistorySantri(santri);
    };

    const handleSave = async (data: { santriId: number, jumlah: number, keterangan: string }) => {
        if (!modalData || !canWrite) return;
        try {
            await onAddTransaksiSaldo({ ...data, jenis: modalData.jenis });
            showToast('Transaksi berhasil disimpan.', 'success');
            setIsModalOpen(false);
        } catch (e) {
            showAlert('Gagal Menyimpan', (e as Error).message);
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Manajemen Uang Saku Santri</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
                <div className="sm:col-span-2 lg:col-span-5">
                    <input type="text" placeholder="Cari Nama atau NIS..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full bg-white border border-gray-300 rounded-md p-2"/>
                </div>
                <select value={filters.jenjang} onChange={e => setFilters({...filters, jenjang: e.target.value, kelas: '', rombel: ''})} className="bg-white border p-2 text-sm rounded-md"><option value="">Semua Jenjang</option>{settings.jenjang.map(j=><option key={j.id} value={j.id}>{j.nama}</option>)}</select>
                <select value={filters.kelas} onChange={e => setFilters({...filters, kelas: e.target.value, rombel: ''})} className="bg-white border p-2 text-sm rounded-md"><option value="">Semua Kelas</option>{availableKelas.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}</select>
                <select value={filters.rombel} onChange={e => setFilters({...filters, rombel: e.target.value})} className="bg-white border p-2 text-sm rounded-md"><option value="">Semua Rombel</option>{availableRombel.map(r=><option key={r.id} value={r.id}>{r.nama}</option>)}</select>
                <select value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})} className="bg-white border p-2 text-sm rounded-md"><option value="">Semua Gender</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select>
            </div>

            <div className="border rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                        <tr>
                            <th className="px-4 py-2">Nama Santri</th>
                            <th className="px-4 py-2">Saldo Saat Ini</th>
                            <th className="px-4 py-2 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.map(({ santri, saldo }) => (
                            <tr key={santri.id}>
                                <td className="px-4 py-3 whitespace-nowrap"><div className="font-semibold">{santri.namaLengkap}</div><div className="text-xs text-gray-500">{santri.nis}</div></td>
                                <td className="px-4 py-3 font-semibold">{formatRupiah(saldo)}</td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    {canWrite && (
                                        <>
                                            <button onClick={() => openModal(santri, 'Deposit')} className="px-3 py-1 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700">Deposit</button>
                                            <button onClick={() => openModal(santri, 'Penarikan')} className="px-3 py-1 bg-yellow-500 text-white rounded-md text-xs font-semibold hover:bg-yellow-600">Penarikan</button>
                                        </>
                                    )}
                                    <button onClick={() => openHistoryModal(santri)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-300">Riwayat</button>
                                </td>
                            </tr>
                        ))}
                         {dataTampilan.length === 0 && (
                            <tr>
                                <td colSpan={3} className="text-center py-10 text-gray-500">Tidak ada data santri yang cocok dengan filter.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>
            {isModalOpen && modalData && <TransaksiSaldoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} santri={modalData.santri} jenis={modalData.jenis} currentSaldo={saldoMap.get(modalData.santri.id) || 0} />}
            {historySantri && <RiwayatUangSakuModal isOpen={!!historySantri} onClose={() => setHistorySantri(null)} santri={historySantri} />}
        </div>
    );
};
