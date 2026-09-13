import React from 'react';
import { ArsipSurat, PondokSettings } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { printPreviewExact } from '../../utils/exportUtils';
import { loadXLSX } from '../../utils/lazyClientLibs';

interface BukuAgendaPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    arsipList: ArsipSurat[];
    settings: PondokSettings;
    filterLabel?: string;
    onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BukuAgendaPrintModal: React.FC<BukuAgendaPrintModalProps> = ({
    isOpen,
    onClose,
    arsipList,
    settings,
    filterLabel,
    onToast
}) => {
    if (!isOpen) return null;

    const sortedList = [...arsipList].sort((a, b) => new Date(a.tanggalBuat).getTime() - new Date(b.tanggalBuat).getTime());

    const handlePrint = async () => {
        try {
            await printPreviewExact('buku-agenda-print-area', 'Buku_Agenda_Surat_Keluar');
        } catch {
            onToast?.('Gagal mencetak buku agenda', 'error');
        }
    };

    const handleExportExcel = async () => {
        try {
            const XLSX = await loadXLSX();
            const data = sortedList.map((item, index) => ({
                'No': index + 1,
                'Nomor Surat': item.nomorSurat,
                'Tanggal': item.tanggalBuat,
                'Ditujukan Kepada': item.tujuan,
                'Perihal / Judul': item.perihal,
                'Penanda Tangan': item.signatoriesSnapshot?.map(s => `${s.jabatan}: ${s.nama}`).join('; ') || '-',
                'Tempat Cetak': item.tempatCetak || '-'
            }));

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Agenda Surat Keluar');
            XLSX.writeFile(workbook, `Buku_Agenda_Surat_Keluar_${new Date().toISOString().split('T')[0]}.xlsx`);
            onToast?.('Buku agenda berhasil diekspor ke Excel', 'success');
        } catch {
            onToast?.('Gagal mengekspor data ke Excel', 'error');
        }
    };

    const tempat = settings.alamat.split(',')[1]?.trim() || 'Pesantren';
    const formattedNow = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const mudir = settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId);
    const pimpinanName = mudir?.nama || 'Pimpinan Pondok';

    return (
        <div className="app-overlay fixed inset-0 z-[240] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="app-modal flex h-[92vh] w-full max-w-6xl flex-col rounded-[28px] bg-white shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between border-b border-app-border bg-slate-50 px-6 py-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-base">Buku Agenda Surat Keluar</h3>
                        <p className="text-xs text-slate-500">
                            Total {sortedList.length} surat {filterLabel ? `• Filter: ${filterLabel}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="app-button-secondary px-3 py-2 text-sm rounded-xl flex items-center gap-1.5 text-emerald-700 hover:bg-emerald-50"
                        >
                            <i className="bi bi-file-earmark-excel text-emerald-600"></i> Unduh Excel
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="app-button-primary px-4 py-2 text-sm rounded-xl flex items-center gap-1.5"
                        >
                            <i className="bi bi-printer"></i> Cetak Dokumen
                        </button>
                        <button onClick={onClose} className="app-button-ghost h-9 w-9 rounded-full p-0 text-slate-500">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                <div className="app-scrollbar flex-grow overflow-auto bg-slate-100 p-6 flex justify-center items-start">
                    <div
                        id="buku-agenda-print-area"
                        className="bg-white shadow-lg p-10 print-portrait"
                        style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
                    >
                        <PrintHeader settings={settings} title="" />

                        <div className="text-center my-6">
                            <h2 className="font-bold text-base uppercase tracking-wider text-slate-900 underline">
                                BUKU AGENDA SURAT KELUAR TATA USAHA
                            </h2>
                            <p className="text-xs text-slate-600 mt-1">
                                {filterLabel || `Tahun ${new Date().getFullYear()}`}
                            </p>
                        </div>

                        <table className="w-full border-collapse border border-slate-800 text-xs my-4">
                            <thead>
                                <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                                    <th className="border border-slate-800 p-2 w-10">No.</th>
                                    <th className="border border-slate-800 p-2 w-24">Tanggal</th>
                                    <th className="border border-slate-800 p-2 w-40">Nomor Surat</th>
                                    <th className="border border-slate-800 p-2">Perihal / Isi Ringkas</th>
                                    <th className="border border-slate-800 p-2 w-44">Ditujukan Kepada</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedList.map((item, idx) => (
                                    <tr key={item.id} className="align-top">
                                        <td className="border border-slate-800 p-2 text-center">{idx + 1}</td>
                                        <td className="border border-slate-800 p-2 text-center whitespace-nowrap">
                                            {new Date(item.tanggalBuat).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="border border-slate-800 p-2 font-mono text-[11px]">
                                            {item.nomorSurat}
                                        </td>
                                        <td className="border border-slate-800 p-2 font-medium">
                                            {item.perihal}
                                        </td>
                                        <td className="border border-slate-800 p-2">
                                            {item.tujuan}
                                        </td>
                                    </tr>
                                ))}
                                {sortedList.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="border border-slate-800 p-6 text-center text-slate-400 italic">
                                            Tidak ada arsip surat keluar pada periode ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="mt-12 flex justify-between items-start text-xs">
                            <div className="text-center w-52">
                                <p className="font-medium">Mengetahui,</p>
                                <p className="font-medium">Pimpinan Pondok Pesantren</p>
                                <div className="h-20"></div>
                                <p className="font-bold underline">{pimpinanName}</p>
                            </div>
                            <div className="text-center w-52">
                                <p>{tempat}, {formattedNow}</p>
                                <p className="font-medium">Petugas Agenda / Tata Usaha</p>
                                <div className="h-20"></div>
                                <p className="font-bold underline">....................................................</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
