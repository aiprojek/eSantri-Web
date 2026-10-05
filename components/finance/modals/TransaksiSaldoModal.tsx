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
    limitHarian?: number;
    penarikanHariIni?: number;
}

export const TransaksiSaldoModal: React.FC<TransaksiSaldoModalProps> = ({
    isOpen,
    onClose,
    onSave,
    santri,
    jenis,
    currentSaldo,
    limitHarian = 0,
    penarikanHariIni = 0
}) => {
    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<{ jumlah: number, keterangan: string }>({
        defaultValues: { jumlah: 0, keterangan: '' }
    });

    const watchedJumlah = Number(watch('jumlah')) || 0;

    if (!isOpen) return null;

    const sisaKuotaHarian = limitHarian > 0 ? Math.max(0, limitHarian - penarikanHariIni) : null;
    const isMelebihiLimit = jenis === 'Penarikan' && limitHarian > 0 && (penarikanHariIni + watchedJumlah) > limitHarian;
    const isSaldoKurang = jenis === 'Penarikan' && watchedJumlah > currentSaldo;

    const onSubmit = async (data: { jumlah: number, keterangan: string }) => {
        if (jenis === 'Penarikan' && data.jumlah > currentSaldo) {
            return;
        }
        await onSave({ ...data, santriId: santri.id });
    };

    const presets = jenis === 'Deposit'
        ? [50000, 100000, 200000, 500000]
        : [10000, 15000, 20000, 50000];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-5 border-b bg-slate-50">
                        <h3 className="text-lg font-bold text-slate-800">{jenis} Uang Saku</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{santri.namaLengkap} ({santri.nis})</p>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <div>
                                <span className="text-xs text-slate-500 block">Saldo Saat Ini</span>
                                <strong className="text-base font-bold text-slate-800">{formatRupiah(currentSaldo)}</strong>
                            </div>
                            {jenis === 'Penarikan' && limitHarian > 0 && (
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 block">Sisa Limit Hari Ini</span>
                                    <strong className={`text-sm font-bold ${(sisaKuotaHarian || 0) === 0 ? 'text-red-600' : 'text-teal-700'}`}>
                                        {formatRupiah(sisaKuotaHarian || 0)}
                                    </strong>
                                    <span className="block text-[10px] text-slate-400">dari {formatRupiah(limitHarian)}/hari</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah (Rp)</label>
                            <input
                                type="number"
                                {...register('jumlah', {
                                    required: 'Jumlah wajib diisi',
                                    valueAsNumber: true,
                                    min: { value: 1, message: 'Jumlah harus lebih dari 0' }
                                })}
                                className={`bg-gray-50 border text-gray-900 text-sm rounded-lg w-full p-2.5 font-semibold ${errors.jumlah || isSaldoKurang ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {errors.jumlah && <p className="text-xs text-red-600 mt-1">{errors.jumlah.message}</p>}
                            {isSaldoKurang && <p className="text-xs text-red-600 font-medium mt-1">Saldo tidak mencukupi (Maksimal: {formatRupiah(currentSaldo)}).</p>}
                            {isMelebihiLimit && !isSaldoKurang && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                                    <i className="bi bi-exclamation-triangle-fill mr-1"></i>
                                    Perhatian: Penarikan ini melewati batas limit harian santri ({formatRupiah(limitHarian)}/hari). Sudah ditarik hari ini: {formatRupiah(penarikanHariIni)}.
                                </p>
                            )}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {presets.map(nom => (
                                    <button
                                        key={nom}
                                        type="button"
                                        onClick={() => setValue('jumlah', nom, { shouldValidate: true })}
                                        className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                                    >
                                        {formatRupiah(nom)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">Keterangan</label>
                            <input
                                type="text"
                                {...register('keterangan')}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                                placeholder={jenis === 'Deposit' ? 'cth: Titipan transfer orang tua' : 'cth: Jajan koperasi / Kebutuhan harian'}
                            />
                        </div>
                    </div>
                    <div className="p-4 border-t bg-slate-50 flex justify-end space-x-2">
                        <button type="button" onClick={onClose} className="text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5">Batal</button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isSaldoKurang || watchedJumlah <= 0}
                            className={`text-white font-semibold rounded-lg text-sm px-5 py-2.5 ${jenis === 'Deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-500 hover:bg-amber-600'} disabled:bg-gray-300 disabled:cursor-not-allowed`}
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

