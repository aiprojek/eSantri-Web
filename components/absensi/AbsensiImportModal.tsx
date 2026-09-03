import React, { useState } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { AbsensiRecord, SesiAbsensi } from '../../types';
import { loadXLSX } from '../../utils/lazyClientLibs';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface ParsedRow {
    index: number;
    nis: string;
    nama: string;
    rombel: string;
    tanggal: string;
    sesi: string;
    status: 'H' | 'S' | 'I' | 'A';
    keterangan: string;
    santriId?: number;
    rombelId?: number;
    isValid: boolean;
    errorMsg?: string;
}

export const AbsensiImportModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { settings, showToast, currentUser } = useAppContext();
    const { santriList, onSaveAbsensi } = useSantriContext();

    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    // Download template Excel
    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await loadXLSX();
            const templateData = [
                {
                    'NIS': '2026001',
                    'Nama Santri': 'Ahmad Fauzi',
                    'Rombel': settings.rombel[0]?.nama || '7A Putra',
                    'Tanggal (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
                    'Sesi': 'KBM Pagi',
                    'Status (H/S/I/A)': 'H',
                    'Keterangan': 'Hadir tepat waktu'
                },
                {
                    'NIS': '2026002',
                    'Nama Santri': 'Muhammad Rizky',
                    'Rombel': settings.rombel[0]?.nama || '7A Putra',
                    'Tanggal (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
                    'Sesi': 'KBM Pagi',
                    'Status (H/S/I/A)': 'S',
                    'Keterangan': 'Sakit demam'
                },
                {
                    'NIS': '2026003',
                    'Nama Santri': 'Fathur Rahman',
                    'Rombel': settings.rombel[0]?.nama || '7A Putra',
                    'Tanggal (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
                    'Sesi': 'KBM Pagi',
                    'Status (H/S/I/A)': 'I',
                    'Keterangan': 'Izin urusan keluarga'
                }
            ];

            const ws = XLSX.utils.json_to_sheet(templateData);
            // Set col widths
            ws['!cols'] = [
                { wch: 12 }, // NIS
                { wch: 25 }, // Nama
                { wch: 15 }, // Rombel
                { wch: 22 }, // Tanggal
                { wch: 16 }, // Sesi
                { wch: 18 }, // Status
                { wch: 30 }  // Keterangan
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Template_Presensi');
            XLSX.writeFile(wb, 'Template_Import_Absensi_eSantri.xlsx');
            showToast('Template Excel berhasil diunduh.', 'success');
        } catch (err: any) {
            console.error('Failed to download template:', err);
            showToast('Gagal mengunduh template Excel', 'error');
        }
    };

    // File Upload Handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setFileName(file.name);

        try {
            const XLSX = await loadXLSX();
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (rawData.length === 0) {
                showToast('File Excel kosong atau format tidak sesuai.', 'info');
                setIsProcessing(false);
                return;
            }

            const rows: ParsedRow[] = rawData.map((row, idx) => {
                const nis = String(row['NIS'] || row['nis'] || '').trim();
                const nama = String(row['Nama Santri'] || row['nama'] || row['Nama'] || '').trim();
                const rombelName = String(row['Rombel'] || row['rombel'] || '').trim();
                const tanggal = String(row['Tanggal (YYYY-MM-DD)'] || row['Tanggal'] || row['tanggal'] || '').trim();
                const sesi = String(row['Sesi'] || row['sesi'] || 'KBM Pagi').trim();
                let status = String(row['Status (H/S/I/A)'] || row['Status'] || row['status'] || 'H').toUpperCase().trim() as any;
                const keterangan = String(row['Keterangan'] || row['keterangan'] || '').trim();

                // Normalize status
                if (!['H', 'S', 'I', 'A'].includes(status)) {
                    if (status.startsWith('HADIR')) status = 'H';
                    else if (status.startsWith('SAKIT')) status = 'S';
                    else if (status.startsWith('IZIN')) status = 'I';
                    else if (status.startsWith('ALPHA') || status.startsWith('ALPA')) status = 'A';
                    else status = 'H';
                }

                // Match Santri by NIS first, then by name
                let santri = santriList.find(s => s.nis && s.nis.trim() === nis);
                if (!santri && nama) {
                    santri = santriList.find(s => s.namaLengkap.toLowerCase().trim() === nama.toLowerCase().trim());
                }

                // Match Rombel
                let rombel = settings.rombel.find(r => r.nama.toLowerCase().trim() === rombelName.toLowerCase().trim());
                if (!rombel && santri?.rombelId) {
                    rombel = settings.rombel.find(r => r.id === santri?.rombelId);
                }

                let isValid = true;
                let errorMsg = '';

                if (!santri) {
                    isValid = false;
                    errorMsg = `Santri (NIS: ${nis || '-'}, Nama: ${nama || '-'}) tidak ditemukan di sistem.`;
                } else if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
                    isValid = false;
                    errorMsg = `Format tanggal "${tanggal}" tidak valid (harus YYYY-MM-DD).`;
                }

                return {
                    index: idx + 1,
                    nis: nis || santri?.nis || '',
                    nama: nama || santri?.namaLengkap || 'Tidak Dikenal',
                    rombel: rombel?.nama || rombelName || '-',
                    tanggal,
                    sesi,
                    status,
                    keterangan,
                    santriId: santri?.id,
                    rombelId: rombel?.id || santri?.rombelId || 0,
                    isValid,
                    errorMsg
                };
            });

            setParsedRows(rows);
            showToast(`Berhasil membaca ${rows.length} baris data dari ${file.name}.`, 'success');
        } catch (err: any) {
            console.error('Error parsing excel:', err);
            showToast('Gagal memproses file: ' + (err.message || 'File rusak atau format tidak didukung'), 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Save valid rows into database
    const handleSaveImport = async () => {
        const validRows = parsedRows.filter(r => r.isValid && r.santriId);
        if (validRows.length === 0) {
            showToast('Tidak ada data valid yang dapat diimpor.', 'info');
            return;
        }

        setIsSaving(true);
        try {
            const records: AbsensiRecord[] = validRows.map(row => ({
                id: Date.now() + Math.random() * 100000,
                santriId: row.santriId!,
                rombelId: row.rombelId || 0,
                tanggal: row.tanggal,
                status: row.status,
                keterangan: row.keterangan || undefined,
                sesi: row.sesi as SesiAbsensi,
                recordedBy: currentUser?.username ? `Import (${currentUser.username})` : 'Excel Import',
                lastModified: Date.now()
            }));

            await onSaveAbsensi(records);
            showToast(`Alhamdulillah, ${records.length} data presensi berhasil diimpor ke sistem!`, 'success');
            onClose();
        } catch (err: any) {
            console.error('Failed to import absensi records:', err);
            showToast('Gagal menyimpan data impor: ' + (err.message || 'Error'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const validCount = parsedRows.filter(r => r.isValid).length;
    const invalidCount = parsedRows.filter(r => !r.isValid).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-teal-700 text-white shrink-0">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <i className="bi bi-file-earmark-spreadsheet-fill"></i> Impor Massal Absensi via Excel
                        </h2>
                        <p className="text-teal-100 text-xs mt-0.5">
                            Unggah histori presensi atau absensi massal dari file spreadsheet.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Top Guide & Download Template */}
                    <div className="bg-teal-50/70 border border-teal-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-teal-900 uppercase">Petunjuk Format Berkas</h4>
                            <p className="text-xs text-teal-800">
                                Gunakan format standar (Kolom: NIS, Nama Santri, Rombel, Tanggal, Sesi, Status, Keterangan).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="px-4 py-2 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors shrink-0"
                        >
                            <i className="bi bi-download"></i>
                            <span>Unduh Format Excel</span>
                        </button>
                    </div>

                    {/* File Upload Drop Area */}
                    <div className="border-2 border-dashed border-gray-300 hover:border-teal-500 rounded-2xl p-6 text-center bg-gray-50/50 hover:bg-teal-50/20 transition-all cursor-pointer relative">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                            <i className="bi bi-cloud-arrow-up-fill text-4xl text-teal-600"></i>
                            <p className="text-sm font-bold text-gray-800">
                                {fileName ? `Berkas Terpilih: ${fileName}` : 'Klik atau Tarik File Excel ke Sini'}
                            </p>
                            <p className="text-xs text-gray-400">Mendukung format .xlsx, .xls, dan .csv</p>
                        </div>
                    </div>

                    {/* Preview Table */}
                    {parsedRows.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-700">
                                    Pratinjau Data ({parsedRows.length} Baris Terdeteksi)
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-600 font-semibold flex items-center gap-1">
                                        <i className="bi bi-check-circle-fill"></i> {validCount} Siap Impor
                                    </span>
                                    {invalidCount > 0 && (
                                        <span className="text-red-500 font-semibold flex items-center gap-1">
                                            <i className="bi bi-exclamation-circle-fill"></i> {invalidCount} Error
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 font-bold text-gray-600 border-b border-gray-200 sticky top-0">
                                            <th className="p-2.5 text-center w-10">No</th>
                                            <th className="p-2.5">Nama Santri</th>
                                            <th className="p-2.5">NIS</th>
                                            <th className="p-2.5">Tanggal</th>
                                            <th className="p-2.5">Sesi</th>
                                            <th className="p-2.5 text-center">Status</th>
                                            <th className="p-2.5">Keterangan</th>
                                            <th className="p-2.5 text-center">Validasi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {parsedRows.map(row => (
                                            <tr key={row.index} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50/50'}>
                                                <td className="p-2.5 text-center text-gray-400">{row.index}</td>
                                                <td className="p-2.5 font-bold text-gray-900">{row.nama}</td>
                                                <td className="p-2.5 text-gray-600">{row.nis || '-'}</td>
                                                <td className="p-2.5 font-medium">{row.tanggal}</td>
                                                <td className="p-2.5 text-gray-600">{row.sesi}</td>
                                                <td className="p-2.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${row.status === 'H' ? 'bg-green-100 text-green-800' : row.status === 'S' ? 'bg-yellow-100 text-yellow-800' : row.status === 'I' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-gray-600">{row.keterangan || '-'}</td>
                                                <td className="p-2.5 text-center">
                                                    {row.isValid ? (
                                                        <i className="bi bi-check-circle-fill text-green-500 text-sm" title="Valid"></i>
                                                    ) : (
                                                        <i className="bi bi-exclamation-triangle-fill text-red-500 text-sm" title={row.errorMsg}></i>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveImport}
                        disabled={isSaving || isProcessing || validCount === 0}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <i className="bi bi-cloud-arrow-up-fill text-base"></i>
                        <span>{isSaving ? 'Menyimpan...' : `Impor ${validCount} Data Valid`}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
