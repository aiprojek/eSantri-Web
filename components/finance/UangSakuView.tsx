
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { useFinanceContext } from '../../contexts/FinanceContext';
import { Santri } from '../../types';
import { Pagination } from '../common/Pagination';
import { TransaksiSaldoModal } from './modals/TransaksiSaldoModal';
import { RiwayatUangSakuModal } from './modals/RiwayatUangSakuModal';
import { formatRupiah } from '../../utils/formatters';
import { SantriFilterBar } from '../common/SantriFilterBar';
import { SectionCard } from '../common/SectionCard';
import { EmptyState } from '../common/EmptyState';

export const UangSakuView: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
    const { settings, showToast, showAlert } = useAppContext();
    const { santriList } = useSantriContext();
    const { saldoSantriList, onAddTransaksiSaldo } = useFinanceContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ santri: Santri, jenis: 'Deposit' | 'Penarikan' } | null>(null);
    const [historySantri, setHistorySantri] = useState<Santri | null>(null);

    const [filters, setFilters] = useState({ search: '', jenjang: '', kelas: '', rombel: '', status: 'Aktif', gender: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const btnBase = "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors";
    const btnDeposit = `${btnBase} bg-green-600 text-white hover:bg-green-700`;
    const btnWithdraw = `${btnBase} bg-amber-500 text-white hover:bg-amber-600`;
    const btnNeutral = `${btnBase} bg-slate-200 text-slate-700 hover:bg-slate-300`;

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
                const statusMatch = !filters.status || s.status === filters.status;
                const genderMatch = !filters.gender || s.jenisKelamin === filters.gender;

                return (nameMatch || nisMatch) && jenjangMatch && kelasMatch && rombelMatch && statusMatch && genderMatch;
            })
            .map(santri => ({
                santri,
                saldo: saldoMap.get(santri.id) || 0,
            }));
    }, [santriList, saldoMap, filters, settings]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

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
        <SectionCard
            title="Manajemen Uang Saku"
            description="Cari santri, cek saldo aktif, lalu lanjutkan ke deposit, penarikan, atau riwayat dari panel yang sama."
            contentClassName="space-y-4 p-5 sm:p-6"
        >
            <SantriFilterBar
                settings={settings}
                filters={filters}
                onChange={setFilters}
                title="Filter Uang Saku"
                searchPlaceholder="Cari Nama atau NIS..."
                resultCount={dataTampilan.length}
                showGender
                className="mb-4"
            />

            <div className="app-table-shell">
            <div className="space-y-3 p-3 md:hidden">
                {paginatedData.map(({ santri, saldo }) => (
                    <div key={santri.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-800">{santri.namaLengkap}</p>
                        <p className="text-xs text-slate-500">{santri.nis}</p>
                        <div className="mt-2 rounded-lg bg-slate-50 p-2">
                            <p className="text-xs text-slate-500">Saldo Saat Ini</p>
                            <p className="text-sm font-semibold text-slate-800">{formatRupiah(saldo)}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {canWrite && (
                                <>
                                    <button onClick={() => openModal(santri, 'Deposit')} className={btnDeposit}>Deposit</button>
                                    <button onClick={() => openModal(santri, 'Penarikan')} className={btnWithdraw}>Penarikan</button>
                                </>
                            )}
                            <button onClick={() => openHistoryModal(santri)} className={btnNeutral}>Riwayat</button>
                        </div>
                    </div>
                ))}
                {dataTampilan.length === 0 && (
                    <EmptyState
                        icon="bi-wallet2"
                        title="Tidak ada saldo yang ditampilkan"
                        description="Coba ubah filter santri untuk menampilkan data uang saku yang ingin dikelola."
                        compact
                    />
                )}
            </div>
            <div className="app-scrollbar hidden overflow-x-auto md:block">
                <table className="app-table min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="text-left">
                        <tr>
                            <th className="px-4 py-2">Nama Santri</th>
                            <th className="px-4 py-2">Saldo Saat Ini</th>
                            <th className="px-4 py-2 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {paginatedData.map(({ santri, saldo }) => (
                            <tr key={santri.id} className="hover:bg-teal-50/40">
                                <td className="whitespace-nowrap px-4 py-3"><div className="font-semibold text-slate-800">{santri.namaLengkap}</div><div className="text-xs text-slate-500">{santri.nis}</div></td>
                                <td className="px-4 py-3 font-semibold text-slate-800">{formatRupiah(saldo)}</td>
                                <td className="px-4 py-3 text-center space-x-2">
                                    {canWrite && (
                                        <>
                                            <button onClick={() => openModal(santri, 'Deposit')} className={btnDeposit}>Deposit</button>
                                            <button onClick={() => openModal(santri, 'Penarikan')} className={btnWithdraw}>Penarikan</button>
                                        </>
                                    )}
                                    <button onClick={() => openHistoryModal(santri)} className={btnNeutral}>Riwayat</button>
                                </td>
                            </tr>
                        ))}
                         {dataTampilan.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-0">
                                    <EmptyState
                                        icon="bi-wallet2"
                                        title="Tidak ada saldo yang ditampilkan"
                                        description="Coba ubah filter santri untuk menampilkan data uang saku yang ingin dikelola."
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
            {isModalOpen && modalData && <TransaksiSaldoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} santri={modalData.santri} jenis={modalData.jenis} currentSaldo={saldoMap.get(modalData.santri.id) || 0} />}
            {historySantri && <RiwayatUangSakuModal isOpen={!!historySantri} onClose={() => setHistorySantri(null)} santri={historySantri} />}
        </SectionCard>
    );
};
