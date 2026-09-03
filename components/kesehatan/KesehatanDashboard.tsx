import React from 'react';
import { KesehatanRecord, Obat } from '../../types';

interface KesehatanDashboardProps {
    records: KesehatanRecord[];
    obatList: Obat[];
    onFilterStatus: (status: 'all' | 'rawat-inap' | 'rujuk' | 'kritis-obat') => void;
    activeStatusFilter?: string;
}

export const KesehatanDashboard: React.FC<KesehatanDashboardProps> = ({
    records,
    obatList,
    onFilterStatus
}) => {
    // 1. Rawat Inap (Pondok) yang masih aktif (belum sembuh)
    const rawatInapCount = records.filter(r => r.status === 'Rawat Inap (Pondok)').length;

    // 2. Rujukan RS / Klinik aktif
    const rujukCount = records.filter(r => r.status === 'Rujuk RS/Klinik').length;

    // 3. Kunjungan pemeriksaan bulan berjalan
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const kunjunganBulanIni = records.filter(r => r.tanggal?.startsWith(currentMonth)).length;

    // 4. Obat kritis (stok <= min atau mendekati/lewat expired)
    const todayStr = new Date().toISOString().split('T')[0];
    const thresholdDays = 60; // 60 hari sebelum expired
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + thresholdDays);
    const futureLimitStr = futureLimit.toISOString().split('T')[0];

    const obatKritisCount = obatList.filter(o => {
        const minStok = o.stokMinimum ?? 5;
        const isLowStock = o.stok <= minStok;
        const isExpiringSoon = o.tglKadaluarsa ? o.tglKadaluarsa <= futureLimitStr : false;
        return isLowStock || isExpiringSoon;
    }).length;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {/* Card 1: Rawat Inap Pondok */}
            <div 
                onClick={() => onFilterStatus('rawat-inap')}
                className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs hover:shadow-md transition cursor-pointer hover:border-amber-400 group relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform"></div>
                <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-semibold text-amber-700 tracking-wide">RAWAT INAP PONDOK</span>
                    <span className="p-2 bg-amber-100 text-amber-700 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <i className="bi bi-hospital text-base"></i>
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2 relative z-10">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">{rawatInapCount}</span>
                    <span className="text-xs text-gray-500 font-medium">Santri</span>
                </div>
                <p className="mt-1 text-[11px] text-amber-600 font-medium truncate">
                    {rawatInapCount > 0 ? 'Sedang dalam perawatan UKS' : 'Tidak ada santri opname'}
                </p>
            </div>

            {/* Card 2: Rujukan Luar */}
            <div 
                onClick={() => onFilterStatus('rujuk')}
                className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-xs hover:shadow-md transition cursor-pointer hover:border-rose-400 group relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform"></div>
                <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-semibold text-rose-700 tracking-wide">RUJUKAN FASKES</span>
                    <span className="p-2 bg-rose-100 text-rose-700 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <i className="bi bi-ambulance text-base"></i>
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2 relative z-10">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">{rujukCount}</span>
                    <span className="text-xs text-gray-500 font-medium">Santri</span>
                </div>
                <p className="mt-1 text-[11px] text-rose-600 font-medium truncate">
                    {rujukCount > 0 ? 'Dirujuk ke RS / Puskesmas' : 'Tidak ada rujukan aktif'}
                </p>
            </div>

            {/* Card 3: Kunjungan Bulan Ini */}
            <div 
                onClick={() => onFilterStatus('all')}
                className="bg-white p-4 rounded-xl border border-teal-200/80 shadow-xs hover:shadow-md transition cursor-pointer hover:border-teal-400 group relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform"></div>
                <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-semibold text-teal-700 tracking-wide">PEMERIKSAAN BULAN INI</span>
                    <span className="p-2 bg-teal-100 text-teal-700 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
                        <i className="bi bi-clipboard2-pulse text-base"></i>
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2 relative z-10">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">{kunjunganBulanIni}</span>
                    <span className="text-xs text-gray-500 font-medium">Catatan</span>
                </div>
                <p className="mt-1 text-[11px] text-teal-600 font-medium truncate">
                    Bulan {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* Card 4: Stok Obat Kritis */}
            <div 
                onClick={() => onFilterStatus('kritis-obat')}
                className="bg-white p-4 rounded-xl border border-orange-200/80 shadow-xs hover:shadow-md transition cursor-pointer hover:border-orange-400 group relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform"></div>
                <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-semibold text-orange-700 tracking-wide">PERINGATAN OBAT</span>
                    <span className="p-2 bg-orange-100 text-orange-700 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        <i className="bi bi-capsule text-base"></i>
                    </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2 relative z-10">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">{obatKritisCount}</span>
                    <span className="text-xs text-gray-500 font-medium">Item</span>
                </div>
                <p className={`mt-1 text-[11px] font-medium truncate ${obatKritisCount > 0 ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>
                    {obatKritisCount > 0 ? 'Stok menipis / mendekati kadaluarsa' : 'Semua persediaan obat aman'}
                </p>
            </div>
        </div>
    );
};
