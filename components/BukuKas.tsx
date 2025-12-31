
import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAppContext } from '../AppContext';
import { TransaksiKas } from '../types';
import { formatRupiah } from '../utils/formatters';

const StatCard: React.FC<{ icon: string; title: string; value: string | number; color: string; textColor: string }> = ({ icon, title, value, color, textColor }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4 transition-transform hover:-translate-y-1">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
            <i className={`${icon} text-lg`}></i>
        </div>
        <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{title}</p>
            <p className={`text-xl font-bold ${textColor}`}>{value}</p>
        </div>
    </div>
);

interface TransaksiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => Promise<void>;
    existingKategori: string[];
}

const TransaksiModal: React.FC<TransaksiModalProps> = ({ isOpen, onClose, onSave, existingKategori }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, reset } = useForm<Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>>({
        defaultValues: {
            jenis: 'Pemasukan',
            kategori: '',
            deskripsi: '',
            jumlah: 0,
            penanggungJawab: '',
        }
    });
    const jenis = watch('jenis');

    useEffect(() => {
        if (isOpen) {
            reset();
        }
    }, [isOpen, reset]);
    
    if (!isOpen) return null;

    const onSubmit = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => {
        await onSave(data);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">Tambah Transaksi Kas</h3></div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Jenis Transaksi</label>
                                <select {...register('jenis')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5 focus:ring-teal-500 focus:border-teal-500">
                                    <option value="Pemasukan">Pemasukan</option>
                                    <option value="Pengeluaran">Pengeluaran</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah (Rp)</label>
                                <input type="number" {...register('jumlah', { required: 'Jumlah wajib diisi', valueAsNumber: true, min: { value: 1, message: 'Jumlah harus lebih dari 0' }})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 focus:ring-teal-500 focus:border-teal-500 ${errors.jumlah ? 'border-red-500' : 'border-gray-300'}`} />
                                {errors.jumlah && <p className="text-xs text-red-600 mt-1">{errors.jumlah.message}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Kategori</label>
                            <input list="kategori-list" {...register('kategori', { required: 'Kategori wajib diisi' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 focus:ring-teal-500 focus:border-teal-500 ${errors.kategori ? 'border-red-500' : 'border-gray-300'}`} placeholder="cth: Donasi, Operasional, Listrik" />
                            <datalist id="kategori-list">
                                {existingKategori.map(k => <option key={k} value={k} />)}
                            </datalist>
                             {errors.kategori && <p className="text-xs text-red-600 mt-1">{errors.kategori.message}</p>}
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Deskripsi</label>
                            <textarea {...register('deskripsi', { required: 'Deskripsi wajib diisi' })} rows={3} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 focus:ring-teal-500 focus:border-teal-500 ${errors.deskripsi ? 'border-red-500' : 'border-gray-300'}`}></textarea>
                            {errors.deskripsi && <p className="text-xs text-red-600 mt-1">{errors.deskripsi.message}</p>}
                        </div>
                         <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Penanggung Jawab</label>
                            <input type="text" {...register('penanggungJawab', { required: 'Penanggung Jawab wajib diisi' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 focus:ring-teal-500 focus:border-teal-500 ${errors.penanggungJawab ? 'border-red-500' : 'border-gray-300'}`}/>
                             {errors.penanggungJawab && <p className="text-xs text-red-600 mt-1">{errors.penanggungJawab.message}</p>}
                        </div>
                    </div>
                    <div className="p-4 border-t flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button>
                        <button type="submit" disabled={isSubmitting} className={`text-white font-medium rounded-lg text-sm px-5 py-2.5 ${jenis === 'Pemasukan' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:bg-gray-300`}>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const BukuKas: React.FC = () => {
    const { transaksiKasList, onAddTransaksiKas, showToast, showAlert } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [filters, setFilters] = useState({ startDate: '', endDate: '', jenis: '', kategori: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    
    const sortedTransaksi = useMemo(() => [...transaksiKasList].sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()), [transaksiKasList]);

    const stats = useMemo(() => {
        let totalPemasukan = 0;
        let totalPengeluaran = 0;
        sortedTransaksi.forEach(t => {
            if (t.jenis === 'Pemasukan') totalPemasukan += t.jumlah;
            else totalPengeluaran += t.jumlah;
        });
        const saldoAkhir = sortedTransaksi[0]?.saldoSetelah || 0;
        return { totalPemasukan, totalPengeluaran, saldoAkhir };
    }, [sortedTransaksi]);
    
    const existingKategori = useMemo(() => [...new Set(transaksiKasList.map(t => t.kategori))], [transaksiKasList]);

    const filteredTransaksi = useMemo(() => {
        return sortedTransaksi.filter(t => {
            const tDate = new Date(t.tanggal);
            const startMatch = !filters.startDate || tDate >= new Date(filters.startDate);
            const endMatch = !filters.endDate || tDate <= new Date(filters.endDate + 'T23:59:59');
            const jenisMatch = !filters.jenis || t.jenis === filters.jenis;
            const kategoriMatch = !filters.kategori || t.kategori.toLowerCase().includes(filters.kategori.toLowerCase());
            return startMatch && endMatch && jenisMatch && kategoriMatch;
        });
    }, [sortedTransaksi, filters]);

    useEffect(() => { setCurrentPage(1); }, [filters]);
    
    const paginatedTransaksi = useMemo(() => filteredTransaksi.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredTransaksi, currentPage, itemsPerPage]);
    const totalPages = Math.ceil(filteredTransaksi.length / itemsPerPage);

    const handleSave = async (data: Omit<TransaksiKas, 'id' | 'saldoSetelah' | 'tanggal'>) => {
        try {
            await onAddTransaksiKas(data);
            showToast('Transaksi berhasil ditambahkan.', 'success');
        } catch (e) {
            showAlert('Gagal Menyimpan', (e as Error).message);
        }
    };

    const startItem = filteredTransaksi.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = Math.min(currentPage * itemsPerPage, filteredTransaksi.length);

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Buku Kas Umum</h1>
                    <p className="text-gray-500 text-sm mt-1">Catat dan pantau arus kas masuk dan keluar secara rinci.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-sm transition-colors focus:ring-4 focus:ring-teal-300">
                    <i className="bi bi-plus-lg"></i> Tambah Transaksi
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard title="Total Pemasukan" value={formatRupiah(stats.totalPemasukan)} icon="bi-arrow-down-circle-fill" color="bg-green-100 text-green-600" textColor="text-green-600" />
                <StatCard title="Total Pengeluaran" value={formatRupiah(stats.totalPengeluaran)} icon="bi-arrow-up-circle-fill" color="bg-red-100 text-red-600" textColor="text-red-600" />
                <StatCard title="Saldo Akhir" value={formatRupiah(stats.saldoAkhir)} icon="bi-wallet2" color="bg-blue-100 text-blue-600" textColor="text-blue-600" />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col xl:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                        <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2"/>
                        <span className="text-gray-400 self-center">-</span>
                        <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2"/>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                        <select value={filters.jenis} onChange={e => setFilters(f => ({...f, jenis: e.target.value}))} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2 min-w-[140px]">
                            <option value="">Semua Jenis</option>
                            <option value="Pemasukan">Pemasukan</option>
                            <option value="Pengeluaran">Pengeluaran</option>
                        </select>
                        <input type="text" value={filters.kategori} onChange={e => setFilters(f => ({...f, kategori: e.target.value}))} placeholder="Cari kategori..." className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2 min-w-[180px]"/>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Pemasukan</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Pengeluaran</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedTransaksi.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                        {new Date(t.tanggal).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {t.kategori}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={t.deskripsi}>
                                        {t.deskripsi}
                                        {t.penanggungJawab && <div className="text-xs text-gray-400 mt-0.5">Oleh: {t.penanggungJawab}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                                        {t.jenis === 'Pemasukan' ? formatRupiah(t.jumlah) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                                        {t.jenis === 'Pengeluaran' ? formatRupiah(t.jumlah) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                                        {formatRupiah(t.saldoSetelah)}
                                    </td>
                                </tr>
                            ))}
                             {filteredTransaksi.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <i className="bi bi-inbox text-4xl mb-2 text-gray-300"></i>
                                            <p>Tidak ada transaksi yang cocok dengan filter.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination */}
                <div className="bg-gray-50 border-t border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                        Menampilkan <span className="font-medium text-gray-900">{startItem}-{endItem}</span> dari <span className="font-medium text-gray-900">{filteredTransaksi.length}</span> transaksi
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Sebelumnya
                            </button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                Berikutnya
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && <TransaksiModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} existingKategori={existingKategori} />}
        </div>
    );
};

export default BukuKas;
