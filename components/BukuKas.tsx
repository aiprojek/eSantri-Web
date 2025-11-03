import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAppContext } from '../AppContext';
import { TransaksiKas } from '../types';
import { formatRupiah } from '../utils/formatters';

const StatCard: React.FC<{ icon: string; title: string; value: string | number; color: string; }> = ({ icon, title, value, color }) => (
    <div className="bg-white p-5 rounded-xl shadow-md flex items-start">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color} mr-4 flex-shrink-0`}>
            <i className={`${icon} text-2xl text-white`}></i>
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
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
                                <select {...register('jenis')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                    <option value="Pemasukan">Pemasukan</option>
                                    <option value="Pengeluaran">Pengeluaran</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah (Rp)</label>
                                <input type="number" {...register('jumlah', { required: 'Jumlah wajib diisi', valueAsNumber: true, min: { value: 1, message: 'Jumlah harus lebih dari 0' }})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.jumlah ? 'border-red-500' : 'border-gray-300'}`} />
                                {errors.jumlah && <p className="text-xs text-red-600 mt-1">{errors.jumlah.message}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Kategori</label>
                            <input list="kategori-list" {...register('kategori', { required: 'Kategori wajib diisi' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.kategori ? 'border-red-500' : 'border-gray-300'}`} placeholder="cth: Donasi, Operasional, Listrik" />
                            <datalist id="kategori-list">
                                {existingKategori.map(k => <option key={k} value={k} />)}
                            </datalist>
                             {errors.kategori && <p className="text-xs text-red-600 mt-1">{errors.kategori.message}</p>}
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Deskripsi</label>
                            <textarea {...register('deskripsi', { required: 'Deskripsi wajib diisi' })} rows={3} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.deskripsi ? 'border-red-500' : 'border-gray-300'}`}></textarea>
                            {errors.deskripsi && <p className="text-xs text-red-600 mt-1">{errors.deskripsi.message}</p>}
                        </div>
                         <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Penanggung Jawab</label>
                            <input type="text" {...register('penanggungJawab', { required: 'Penanggung Jawab wajib diisi' })} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.penanggungJawab ? 'border-red-500' : 'border-gray-300'}`}/>
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

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Buku Kas Umum</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Pemasukan" value={formatRupiah(stats.totalPemasukan)} icon="bi-arrow-down-circle-fill" color="bg-green-500" />
                <StatCard title="Total Pengeluaran" value={formatRupiah(stats.totalPengeluaran)} icon="bi-arrow-up-circle-fill" color="bg-red-500" />
                <StatCard title="Saldo Akhir" value={formatRupiah(stats.saldoAkhir)} icon="bi-wallet2" color="bg-blue-500" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold text-gray-700">Riwayat Transaksi</h2>
                    <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm flex items-center justify-center gap-2">
                        <i className="bi bi-plus-circle"></i> Tambah Transaksi
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
                    <div><label className="text-sm font-medium">Dari Tanggal</label><input type="date" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} className="w-full bg-white border border-gray-300 rounded-md p-2 mt-1"/></div>
                    <div><label className="text-sm font-medium">Sampai Tanggal</label><input type="date" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} className="w-full bg-white border border-gray-300 rounded-md p-2 mt-1"/></div>
                    <div><label className="text-sm font-medium">Jenis</label><select value={filters.jenis} onChange={e => setFilters(f => ({...f, jenis: e.target.value}))} className="w-full bg-white border border-gray-300 rounded-md p-2 mt-1"><option value="">Semua</option><option value="Pemasukan">Pemasukan</option><option value="Pengeluaran">Pengeluaran</option></select></div>
                    <div><label className="text-sm font-medium">Kategori</label><input type="text" value={filters.kategori} onChange={e => setFilters(f => ({...f, kategori: e.target.value}))} placeholder="Cari kategori..." className="w-full bg-white border border-gray-300 rounded-md p-2 mt-1"/></div>
                </div>

                <div className="border rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                            <tr>
                                <th className="px-4 py-2">Tanggal</th><th className="px-4 py-2">Kategori</th><th className="px-4 py-2">Deskripsi</th><th className="px-4 py-2 text-right">Pemasukan</th><th className="px-4 py-2 text-right">Pengeluaran</th><th className="px-4 py-2 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedTransaksi.map(t => (
                                <tr key={t.id}>
                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(t.tanggal).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-medium">{t.kategori}</span></td>
                                    <td className="px-4 py-3">{t.deskripsi}</td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">{t.jenis === 'Pemasukan' ? formatRupiah(t.jumlah) : '-'}</td>
                                    <td className="px-4 py-3 text-right font-medium text-red-600">{t.jenis === 'Pengeluaran' ? formatRupiah(t.jumlah) : '-'}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{formatRupiah(t.saldoSetelah)}</td>
                                </tr>
                            ))}
                             {filteredTransaksi.length === 0 && (<tr><td colSpan={6} className="text-center py-10 text-gray-500">Tidak ada transaksi yang cocok dengan filter.</td></tr>)}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center mt-4">
                        {/* Simple Pagination for now */}
                        <nav className="inline-flex rounded-md shadow-sm -space-x-px">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-2 text-sm">Sebelumnya</button>
                            <span className="px-3 py-2 text-sm">Halaman {currentPage} dari {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-2 text-sm">Berikutnya</button>
                        </nav>
                    </div>
                )}
            </div>

            <TransaksiModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} existingKategori={existingKategori} />
        </div>
    );
};

export default BukuKas;
