import React from 'react';
import { useForm } from 'react-hook-form';
import { Santri } from '../../../types';
import { formatRupiah } from '../../../utils/formatters';

interface TransaksiSaldoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { santriId: number, jumlah: number, keterangan: string }) => Promise<void>;
    santri: Santri;
    jenis: 'Deposit' | 'Penarikan';
    currentSaldo: number;
}

export const TransaksiSaldoModal: React.FC<TransaksiSaldoModalProps> = ({ isOpen, onClose, onSave, santri, jenis, currentSaldo }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ jumlah: number, keterangan: string }>({
        defaultValues: { jumlah: 0, keterangan: '' }
    });
    
    if (!isOpen) return null;

    const onSubmit = async (data: { jumlah: number, keterangan: string }) => {
        await onSave({ ...data, santriId: santri.id });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-5 border-b"><h3 className="text-lg font-semibold text-gray-800">{jenis} Uang Saku - {santri.namaLengkap}</h3></div>
                    <div className="p-5 space-y-4">
                        <p className="text-sm">Saldo saat ini: <strong className="font-semibold">{formatRupiah(currentSaldo)}</strong></p>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah (Rp)</label>
                            <input type="number" {...register('jumlah', { required: 'Jumlah wajib diisi', valueAsNumber: true, min: { value: 1, message: 'Jumlah harus lebih dari 0' }})} className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 ${errors.jumlah ? 'border-red-500' : 'border-gray-300'}`} />
                            {errors.jumlah && <p className="text-xs text-red-600 mt-1">{errors.jumlah.message}</p>}
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Keterangan</label>
                            <input type="text" {...register('keterangan')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder={jenis === 'Deposit' ? 'cth: Titipan dari orang tua' : 'cth: Pembelian di koperasi'} />
                        </div>
                    </div>
                    <div className="p-4 border-t flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button>
                        <button type="submit" disabled={isSubmitting} className={`text-white font-medium rounded-lg text-sm px-5 py-2.5 ${jenis === 'Deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600'} disabled:bg-gray-300`}>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
