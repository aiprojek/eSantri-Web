
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
import { loadXLSX } from '../../utils/lazyClientLibs';
import { buildStandardExportFileName } from '../../utils/exportFileName';

export const UangSakuView: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
    const { settings, showToast, showAlert } = useAppContext();
    const { santriList } = useSantriContext();
    const { saldoSantriList, transaksiSaldoList, onAddTransaksiSaldo, onUpdateLimitHarian } = useFinanceContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ santri: Santri, jenis: 'Deposit' | 'Penarikan' } | null>(null);
    const [historySantri, setHistorySantri] = useState<Santri | null>(null);
    const [editingLimitSantriId, setEditingLimitSantriId] = useState<number | null>(null);
    const [limitInput, setLimitInput] = useState<number>(0);

    const [filters, setFilters] = useState({ search: '', jenjang: '', kelas: '', rombel: '', status: 'Aktif', gender: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const btnBase = "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors";
    const btnDeposit = `${btnBase} bg-green-600 text-white hover:bg-green-700`;
    const btnWithdraw = `${btnBase} bg-amber-500 text-white hover:bg-amber-600`;
    const btnNeutral = `${btnBase} bg-slate-200 text-slate-700 hover:bg-slate-300`;

    const saldoMap = useMemo(() => new Map(saldoSantriList.map(s => [s.santriId, s.saldo])), [saldoSantriList]);
    const limitMap = useMemo(() => new Map(saldoSantriList.map(s => [s.santriId, s.limitHarian || 0])), [saldoSantriList]);

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    const penarikanHariIniMap = useMemo(() => {
        const map = new Map<number, number>();
        transaksiSaldoList.forEach(tx => {
            if (tx.jenis === 'Penarikan' && tx.tanggal.startsWith(todayStr)) {
                map.set(tx.santriId, (map.get(tx.santriId) || 0) + tx.jumlah);
            }
        });
        return map;
    }, [transaksiSaldoList, todayStr]);

    const summaryStats = useMemo(() => {
        const totalSaldo = saldoSantriList.reduce((sum, s) => sum + (s.saldo || 0), 0);
        let depositHariIni = 0;
        let penarikanHariIni = 0;
        transaksiSaldoList.forEach(tx => {
            if (tx.tanggal.startsWith(todayStr)) {
                if (tx.jenis === 'Deposit') depositHariIni += tx.jumlah;
                else penarikanHariIni += tx.jumlah;
            }
        });
        const santriAktif = santriList.filter(s => s.status === 'Aktif');
        const saldoRendahCount = santriAktif.filter(s => (saldoMap.get(s.id) || 0) < 20000).length;
        return { totalSaldo, depositHariIni, penarikanHariIni, saldoRendahCount };
    }, [saldoSantriList, transaksiSaldoList, todayStr, santriList, saldoMap]);

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
                limitHarian: limitMap.get(santri.id) || 0,
                penarikanHariIni: penarikanHariIniMap.get(santri.id) || 0,
            }));
    }, [santriList, saldoMap, limitMap, penarikanHariIniMap, filters]);

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

    const handleSaveLimit = async (santriId: number) => {
        if (!canWrite) return;
        try {
            await onUpdateLimitHarian(santriId, limitInput);
            showToast('Limit harian uang saku diperbarui.', 'success');
            setEditingLimitSantriId(null);
        } catch (e) {
            showAlert('Gagal Menyimpan Limit', (e as Error).message);
        }
    };

    const handleExportExcel = async () => {
        if (dataTampilan.length === 0) {
            showToast('Tidak ada data untuk diekspor.', 'info');
            return;
        }
        try {
            const XLSX = await loadXLSX();
            const rows = dataTampilan.map((item, idx) => ({
                No: idx + 1,
                NIS: item.santri.nis,
                NamaSantri: item.santri.namaLengkap,
                Rombel: settings.rombel.find(r => r.id === item.santri.rombelId)?.nama || '-',
                SaldoSaatIni: item.saldo,
                LimitHarian: item.limitHarian || 0,
                PenarikanHariIni: item.penarikanHariIni,
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'UangSaku');
            XLSX.writeFile(wb, `${buildStandardExportFileName('rekap-uang-saku', [])}.xlsx`);
            showToast('Data Uang Saku berhasil diekspor ke Excel.', 'success');
        } catch (e) {
            showAlert('Ekspor Gagal', 'Gagal mengekspor data uang saku.');
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                        <i className="bi bi-wallet2 text-xl"></i>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Total Dana Titipan</p>
                        <p className="text-lg font-bold text-slate-800">{formatRupiah(summaryStats.totalSaldo)}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                        <i className="bi bi-arrow-down-left-circle-fill text-xl"></i>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Deposit Hari Ini</p>
                        <p className="text-lg font-bold text-green-700">{formatRupiah(summaryStats.depositHariIni)}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <i className="bi bi-arrow-up-right-circle-fill text-xl"></i>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Penarikan Hari Ini</p>
                        <p className="text-lg font-bold text-amber-700">{formatRupiah(summaryStats.penarikanHariIni)}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <i className="bi bi-exclamation-circle-fill text-xl"></i>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Saldo &lt; Rp 20.000</p>
                        <p className="text-lg font-bold text-rose-700">{summaryStats.saldoRendahCount} Santri</p>
                    </div>
                </div>
            </div>

            <SectionCard
                title="Manajemen Uang Saku & Limit Belanja Harian"
                description="Cari santri, cek saldo aktif, atur batas penarikan harian (limit belanja), lalu catat deposit atau penarikan uang saku."
                actions={
                    <button onClick={handleExportExcel} className="app-button-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5">
                        <i className="bi bi-file-earmark-spreadsheet text-emerald-600"></i> Ekspor Excel
                    </button>
                }
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
                    {paginatedData.map(({ santri, saldo, limitHarian, penarikanHariIni }) => (
                        <div key={santri.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-800">{santri.namaLengkap}</p>
                            <p className="text-xs text-slate-500">{santri.nis}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-slate-50 p-2">
                                    <p className="text-xs text-slate-500">Saldo Saat Ini</p>
                                    <p className={`text-sm font-semibold ${saldo < 20000 ? 'text-rose-600' : 'text-slate-800'}`}>{formatRupiah(saldo)}</p>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-2">
                                    <p className="text-xs text-slate-500">Limit / Hari Ini</p>
                                    <p className="text-xs font-semibold text-slate-700">
                                        {limitHarian > 0 ? `${formatRupiah(penarikanHariIni)} / ${formatRupiah(limitHarian)}` : 'Tanpa Limit'}
                                    </p>
                                </div>
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
                                <th className="px-4 py-2">Limit Belanja Harian</th>
                                <th className="px-4 py-2">Penarikan Hari Ini</th>
                                <th className="px-4 py-2 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {paginatedData.map(({ santri, saldo, limitHarian, penarikanHariIni }) => (
                                <tr key={santri.id} className="hover:bg-teal-50/40">
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <div className="font-semibold text-slate-800">{santri.namaLengkap}</div>
                                        <div className="text-xs text-slate-500">{santri.nis}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`font-bold ${saldo < 20000 ? 'text-rose-600' : 'text-slate-800'}`}>
                                            {formatRupiah(saldo)}
                                        </span>
                                        {saldo < 20000 && (
                                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                                                Saldo Rendah
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingLimitSantriId === santri.id ? (
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={5000}
                                                    value={limitInput}
                                                    onChange={e => setLimitInput(Number(e.target.value) || 0)}
                                                    className="w-28 border border-teal-400 rounded px-2 py-1 text-xs font-semibold text-right"
                                                    placeholder="0 = Tanpa limit"
                                                />
                                                <button
                                                    onClick={() => handleSaveLimit(santri.id)}
                                                    className="px-2 py-1 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700"
                                                >
                                                    Simpan
                                                </button>
                                                <button
                                                    onClick={() => setEditingLimitSantriId(null)}
                                                    className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-slate-700">
                                                    {limitHarian > 0 ? `${formatRupiah(limitHarian)} / hari` : 'Tanpa Limit'}
                                                </span>
                                                {canWrite && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingLimitSantriId(santri.id);
                                                            setLimitInput(limitHarian || 15000);
                                                        }}
                                                        className="text-slate-400 hover:text-teal-600 text-xs"
                                                        title="Atur Limit Harian"
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-semibold ${limitHarian > 0 && penarikanHariIni >= limitHarian ? 'text-red-600' : 'text-slate-700'}`}>
                                            {formatRupiah(penarikanHariIni)}
                                        </span>
                                        {limitHarian > 0 && (
                                            <div className="w-28 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${penarikanHariIni >= limitHarian ? 'bg-red-500' : 'bg-teal-500'}`}
                                                    style={{ width: `${Math.min(100, (penarikanHariIni / limitHarian) * 100)}%` }}
                                                />
                                            </div>
                                        )}
                                    </td>
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
                                    <td colSpan={5} className="p-0">
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
                {isModalOpen && modalData && (
                    <TransaksiSaldoModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSave}
                        santri={modalData.santri}
                        jenis={modalData.jenis}
                        currentSaldo={saldoMap.get(modalData.santri.id) || 0}
                        limitHarian={limitMap.get(modalData.santri.id) || 0}
                        penarikanHariIni={penarikanHariIniMap.get(modalData.santri.id) || 0}
                    />
                )}
                {historySantri && <RiwayatUangSakuModal isOpen={!!historySantri} onClose={() => setHistorySantri(null)} santri={historySantri} />}
            </SectionCard>
        </div>
    );
};

