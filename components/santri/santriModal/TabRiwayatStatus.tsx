import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Santri } from '../../../types';

interface TabRiwayatStatusProps {
  formMethods: UseFormReturn<Santri>;
}

export const TabRiwayatStatus: React.FC<TabRiwayatStatusProps> = ({ formMethods }) => {
    const { watch } = formMethods;
    const watchRiwayatStatus = watch('riwayatStatus');
    
    return (
        <div className="pt-6">
            <h3 className="text-base font-semibold text-gray-800 border-b pb-2 mb-4">Riwayat Perubahan Status Santri</h3>
            <div className="border rounded-lg max-h-96 overflow-y-auto">
                {(watchRiwayatStatus || []).length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Tanggal</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {[...(watchRiwayatStatus || [])].sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map(r => (
                                <tr key={r.id}>
                                    <td className="px-4 py-2 whitespace-nowrap">{new Date(r.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            r.status === 'Aktif' || r.status === 'Masuk' ? 'bg-green-100 text-green-800' :
                                            r.status === 'Hiatus' ? 'bg-yellow-100 text-yellow-800' :
                                            r.status === 'Lulus' ? 'bg-blue-100 text-blue-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>{r.status}</span>
                                    </td>
                                    <td className="px-4 py-2">{r.keterangan}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="text-sm text-gray-400 p-3 text-center">Belum ada riwayat perubahan status.</p>}
            </div>
        </div>
    );
};
