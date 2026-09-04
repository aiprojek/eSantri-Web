import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { KesehatanRecord, Santri, PondokSettings } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { formatDate } from '../../utils/formatters';
import { printToPdfNative } from '../../utils/pdfGenerator';

export type MedicalDocumentType = 'surat-sakit' | 'surat-rujukan' | 'surat-pulang';

export interface MedicalDocumentConfig {
    nomorSurat: string;
    tanggalSurat: string;
    tempatSurat: string;
    // Data Medis yang bisa disesuaikan sebelum cetak
    diagnosa: string;
    keluhan: string;
    tindakan: string;
    catatan: string;
    suhuTubuh: string;
    tekananDarah: string;
    beratBadan: string;
    // Khusus Surat Sakit & Pulang
    lamaIstirahatHari: number;
    tanggalKembali: string;
    // Khusus Surat Rujukan
    faskesRujukan: string;
    alasanRujukan: string;
    petugasPendamping: string;
    // Legalitas & Penandatangan
    namaPemeriksa: string;
    jabatanPemeriksa: string;
    nipNiyPemeriksa: string;
    mengetahuiNama: string;
    mengetahuiJabatan: string;
}

interface MedicalPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: KesehatanRecord;
    santri: Santri;
    settings: PondokSettings;
    initialType?: MedicalDocumentType;
}

export const MedicalPrintPreviewModal: React.FC<MedicalPrintPreviewModalProps> = ({
    isOpen,
    onClose,
    record,
    santri,
    settings,
    initialType = 'surat-sakit'
}) => {
    if (!isOpen) return null;

    const [docType, setDocType] = useState<MedicalDocumentType>(() => {
        if (record.status === 'Rujuk RS/Klinik') return 'surat-rujukan';
        if (record.status === 'Rawat Inap (Pondok)' && (record.lamaIstirahatHari || 0) >= 3) return 'surat-pulang';
        return initialType;
    });

    // Perkiraan nomor surat otomatis yang rapi
    const year = new Date(record.tanggal || Date.now()).getFullYear();
    const recordSeq = record.id ? record.id.toString().slice(-4) : '0001';

    const defaultNomor = useMemo(() => {
        switch (docType) {
            case 'surat-sakit':
                return `S-SAKIT/${recordSeq}/UKS-PKS/${year}`;
            case 'surat-rujukan':
                return `00${recordSeq}/MED/RUJUK/${year}`;
            case 'surat-pulang':
                return `S-REK.PULANG/${recordSeq}/POSKESTREN/${year}`;
            default:
                return `MED/${recordSeq}/${year}`;
        }
    }, [docType, recordSeq, year]);

    const defaultLamaHari = record.lamaIstirahatHari || (docType === 'surat-pulang' ? 3 : 2);
    const tglMulai = new Date(record.tanggal || new Date());
    const tglKembaliCalc = new Date(tglMulai);
    tglKembaliCalc.setDate(tglKembaliCalc.getDate() + defaultLamaHari);
    const defaultTglKembali = tglKembaliCalc.toISOString().split('T')[0];

    const defaultKota = settings.alamat?.split(',')[1]?.trim() || settings.namaPonpes || 'Pondok';

    // Editable Options State
    const [config, setConfig] = useState<MedicalDocumentConfig>({
        nomorSurat: defaultNomor,
        tanggalSurat: record.tanggal || new Date().toISOString().split('T')[0],
        tempatSurat: defaultKota,
        diagnosa: record.diagnosa || '',
        keluhan: record.keluhan || '',
        tindakan: record.tindakan || '',
        catatan: record.catatan || '',
        suhuTubuh: record.suhuTubuh ? String(record.suhuTubuh) : '',
        tekananDarah: record.tekananDarah || '',
        beratBadan: record.beratBadan ? String(record.beratBadan) : '',
        lamaIstirahatHari: defaultLamaHari,
        tanggalKembali: defaultTglKembali,
        faskesRujukan: record.faskesRujukan || 'Puskesmas / Rumah Sakit Umum Daerah',
        alasanRujukan: record.alasanRujukan || 'Memerlukan pemeriksaan penunjang diagnostik & evaluasi medis lanjutan',
        petugasPendamping: 'Ustadz Pembina Asrama',
        namaPemeriksa: record.pemeriksa || 'Petugas Poskestren',
        jabatanPemeriksa: 'Tenaga Medis / Tim Kesehatan Poskestren',
        nipNiyPemeriksa: '',
        mengetahuiNama: settings.mudirAamId ? (settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId)?.nama || '') : '',
        mengetahuiJabatan: 'Mudir / Pimpinan Pondok'
    });

    // Re-synchronize nomor surat when docType changes if unchanged
    const handleTypeChange = (newType: MedicalDocumentType) => {
        setDocType(newType);
        let newNomor = `MED/${recordSeq}/${year}`;
        if (newType === 'surat-sakit') newNomor = `S-SAKIT/${recordSeq}/UKS-PKS/${year}`;
        if (newType === 'surat-rujukan') newNomor = `00${recordSeq}/MED/RUJUK/${year}`;
        if (newType === 'surat-pulang') newNomor = `S-REK.PULANG/${recordSeq}/POSKESTREN/${year}`;
        setConfig(prev => ({
            ...prev,
            nomorSurat: newNomor
        }));
    };

    // Update lama istirahat & hitung otomatis tanggal kembali
    const handleLamaHariChange = (days: number) => {
        const d = Math.max(1, days);
        const curTgl = new Date(config.tanggalSurat || record.tanggal || new Date());
        curTgl.setDate(curTgl.getDate() + d);
        setConfig(prev => ({
            ...prev,
            lamaIstirahatHari: d,
            tanggalKembali: curTgl.toISOString().split('T')[0]
        }));
    };

    // Zoom and Fit-to-Width States
    const [manualZoom, setManualZoom] = useState(1);
    const [smartZoomScale, setSmartZoomScale] = useState(1);
    const [fitToWidth, setFitToWidth] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);

    // Responsive Smart Zoom Calculation
    const updateSmartZoom = useCallback(() => {
        if (!previewContainerRef.current) return;
        const containerWidth = previewContainerRef.current.clientWidth - 48; // padding
        // A5 width is 21cm ~ 794px in 96dpi, A4 is 21cm as well
        const sheetNaturalWidth = 794; 
        if (containerWidth > 0 && fitToWidth) {
            const scale = Math.min(1.05, Math.max(0.45, containerWidth / sheetNaturalWidth));
            setSmartZoomScale(scale);
        } else if (!fitToWidth) {
            setSmartZoomScale(1);
        }
    }, [fitToWidth]);

    useEffect(() => {
        updateSmartZoom();
        window.addEventListener('resize', updateSmartZoom);
        return () => window.removeEventListener('resize', updateSmartZoom);
    }, [updateSmartZoom]);

    // Kamar / Asrama santri
    const kamarName = santri.kamarId ? (settings.kamar?.find(k => k.id === santri.kamarId)?.nama || '-') : '-';
    const rombelName = santri.rombelId ? (settings.rombel?.find(r => r.id === santri.rombelId)?.nama || '-') : '-';

    // Handle Print
    const handleTriggerPrint = async () => {
        setIsPrinting(true);
        try {
            const prefixMap = {
                'surat-sakit': 'Surat_Keterangan_Sakit',
                'surat-rujukan': 'Surat_Rujukan_Faskes',
                'surat-pulang': 'Surat_Rekomendasi_Pulang'
            };
            const docName = `${prefixMap[docType]}_${santri.namaLengkap.replace(/\s+/g, '_')}_${config.tanggalSurat}`;
            await printToPdfNative('medical-preview-active-sheet', docName);
        } catch (err) {
            console.error('Print medical doc error:', err);
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shrink-0 shadow-2xs">
                            <i className="bi bi-file-earmark-medical-fill text-xl"></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                                    Dokumen Medis Poskestren & Cetak Resmi
                                </h2>
                                <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    Live Preview
                                </span>
                            </div>
                            <p className="text-gray-500 text-xs mt-0.5">
                                Pasien: <strong className="text-gray-800">{santri.namaLengkap}</strong> (NIS: {santri.nis || '-'}) • Kamar: {kamarName} • Kelas: {rombelName}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleTriggerPrint}
                            disabled={isPrinting}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                            <i className={`bi ${isPrinting ? 'bi-hourglass-split animate-spin' : 'bi-printer-fill'}`}></i>
                            <span>{isPrinting ? 'Menyiapkan Dokumen...' : 'Cetak / Unduh PDF'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                            title="Tutup"
                        >
                            <i className="bi bi-x-lg text-base"></i>
                        </button>
                    </div>
                </div>

                {/* Modal Body: Left Controls (5 cols) & Right Live Preview (7 cols) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
                    
                    {/* Left Column: Editable Parameters */}
                    <div className="lg:col-span-5 space-y-4">
                        
                        {/* 1. Pilih Template Surat */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <i className="bi bi-card-checklist text-teal-600"></i>
                                    1. Jenis Dokumen Medis
                                </h4>
                                <span className="text-[11px] text-gray-400">Pilih format</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('surat-sakit')}
                                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center gap-1 ${docType === 'surat-sakit' ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <i className="bi bi-file-earmark-medical text-base text-teal-600"></i>
                                    <span className="text-[11px] font-bold leading-tight">Surat Sakit</span>
                                    <span className="text-[9px] text-gray-500">Format A5</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('surat-rujukan')}
                                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center gap-1 ${docType === 'surat-rujukan' ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <i className="bi bi-hospital text-base text-rose-600"></i>
                                    <span className="text-[11px] font-bold leading-tight">Rujukan Medis</span>
                                    <span className="text-[9px] text-gray-500">Faskes / RSUD</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('surat-pulang')}
                                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center gap-1 ${docType === 'surat-pulang' ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-xs' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <i className="bi bi-house-heart text-base text-purple-600"></i>
                                    <span className="text-[11px] font-bold leading-tight">Izin Pulang</span>
                                    <span className="text-[9px] text-gray-500">Rawat di Rumah</span>
                                </button>
                            </div>
                        </div>

                        {/* 2. Administrasi Surat */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="bi bi-hash text-teal-600"></i>
                                2. Administrasi Surat
                            </h4>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nomor Surat Resmi</label>
                                <input
                                    type="text"
                                    value={config.nomorSurat}
                                    onChange={e => setConfig(prev => ({ ...prev, nomorSurat: e.target.value }))}
                                    className="w-full text-xs font-mono font-semibold p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tempat / Kota</label>
                                    <input
                                        type="text"
                                        value={config.tempatSurat}
                                        onChange={e => setConfig(prev => ({ ...prev, tempatSurat: e.target.value }))}
                                        className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tanggal Surat</label>
                                    <input
                                        type="date"
                                        value={config.tanggalSurat}
                                        onChange={e => setConfig(prev => ({ ...prev, tanggalSurat: e.target.value }))}
                                        className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Tanda Vital & Diagnosa Medis (Bisa Diatur Sebelum Cetak) */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="bi bi-activity text-teal-600"></i>
                                3. Evaluasi Medis & Tanda Vital
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Suhu (°C)</label>
                                    <input
                                        type="text"
                                        value={config.suhuTubuh}
                                        onChange={e => setConfig(prev => ({ ...prev, suhuTubuh: e.target.value }))}
                                        placeholder="37.5"
                                        className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tensi (mmHg)</label>
                                    <input
                                        type="text"
                                        value={config.tekananDarah}
                                        onChange={e => setConfig(prev => ({ ...prev, tekananDarah: e.target.value }))}
                                        placeholder="110/70"
                                        className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">BB (kg)</label>
                                    <input
                                        type="text"
                                        value={config.beratBadan}
                                        onChange={e => setConfig(prev => ({ ...prev, beratBadan: e.target.value }))}
                                        placeholder="48"
                                        className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Diagnosa</label>
                                <input
                                    type="text"
                                    value={config.diagnosa}
                                    onChange={e => setConfig(prev => ({ ...prev, diagnosa: e.target.value }))}
                                    placeholder="Demam Akut, Faringitis, Dispepsia..."
                                    className="w-full text-xs font-bold p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-teal-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Keluhan / Anamnesa</label>
                                <textarea
                                    rows={2}
                                    value={config.keluhan}
                                    onChange={e => setConfig(prev => ({ ...prev, keluhan: e.target.value }))}
                                    placeholder="Keluhan yang dirasakan santri..."
                                    className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tindakan / Terapi Obat</label>
                                <textarea
                                    rows={2}
                                    value={config.tindakan}
                                    onChange={e => setConfig(prev => ({ ...prev, tindakan: e.target.value }))}
                                    placeholder="Paracetamol 500mg, kompres hangat, istirahat..."
                                    className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Catatan Tambahan (Opsional)</label>
                                <input
                                    type="text"
                                    value={config.catatan}
                                    onChange={e => setConfig(prev => ({ ...prev, catatan: e.target.value }))}
                                    placeholder="Catatan tambahan di dokumen..."
                                    className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* 4. Opsi Khusus Berdasarkan Jenis Surat */}
                        {(docType === 'surat-sakit' || docType === 'surat-pulang') && (
                            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-2xs space-y-3">
                                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <i className="bi bi-clock-history text-amber-700"></i>
                                    4. Durasi & Jadwal Istirahat
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-amber-900 mb-1">Lama Istirahat</label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min="1"
                                                max="30"
                                                value={config.lamaIstirahatHari}
                                                onChange={e => handleLamaHariChange(parseInt(e.target.value) || 1)}
                                                className="w-20 text-xs font-bold p-2 bg-white border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-center"
                                            />
                                            <span className="text-xs font-semibold text-amber-800">Hari</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-amber-900 mb-1">Estimasi Selesai / Kembali</label>
                                        <input
                                            type="date"
                                            value={config.tanggalKembali}
                                            onChange={e => setConfig(prev => ({ ...prev, tanggalKembali: e.target.value }))}
                                            className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {docType === 'surat-rujukan' && (
                            <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs space-y-3">
                                <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <i className="bi bi-hospital-fill text-rose-700"></i>
                                    4. Detail Rujukan Fasilitas Kesehatan
                                </h4>
                                <div>
                                    <label className="block text-[11px] font-semibold text-rose-900 mb-1">Tujuan Faskes / RSUD / Puskesmas</label>
                                    <input
                                        type="text"
                                        value={config.faskesRujukan}
                                        onChange={e => setConfig(prev => ({ ...prev, faskesRujukan: e.target.value }))}
                                        placeholder="Puskesmas Kecamatan / RSUD..."
                                        className="w-full text-xs font-semibold p-2 bg-white border border-rose-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-rose-900 mb-1">Alasan Rujukan</label>
                                    <textarea
                                        rows={2}
                                        value={config.alasanRujukan}
                                        onChange={e => setConfig(prev => ({ ...prev, alasanRujukan: e.target.value }))}
                                        placeholder="Alasan rujukan dan fasilitas penunjang yang dibutuhkan..."
                                        className="w-full text-xs p-2 bg-white border border-rose-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-rose-900 mb-1">Petugas / Ustadz Pendamping</label>
                                    <input
                                        type="text"
                                        value={config.petugasPendamping}
                                        onChange={e => setConfig(prev => ({ ...prev, petugasPendamping: e.target.value }))}
                                        placeholder="Nama petugas pendamping santri..."
                                        className="w-full text-xs p-2 bg-white border border-rose-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 5. Legalitas & Tanda Tangan */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="bi bi-pen text-teal-600"></i>
                                5. Legalitas & Penandatangan
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nama Petugas Pemeriksa</label>
                                    <input
                                        type="text"
                                        value={config.namaPemeriksa}
                                        onChange={e => setConfig(prev => ({ ...prev, namaPemeriksa: e.target.value }))}
                                        className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Jabatan / Satuan</label>
                                    <input
                                        type="text"
                                        value={config.jabatanPemeriksa}
                                        onChange={e => setConfig(prev => ({ ...prev, jabatanPemeriksa: e.target.value }))}
                                        className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Mengetahui (Pimpinan / Mudir)</label>
                                <input
                                    type="text"
                                    value={config.mengetahuiNama}
                                    onChange={e => setConfig(prev => ({ ...prev, mengetahuiNama: e.target.value }))}
                                    placeholder="Nama Pimpinan Pondok (Opsional)"
                                    className="w-full text-xs p-2 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Live Sheet Preview with Zoom Controls */}
                    <div className="lg:col-span-7 space-y-3 flex flex-col">
                        
                        {/* Zoom Bar Controls */}
                        <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFitToWidth(false);
                                        setManualZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(2))));
                                    }}
                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                    title="Perkecil Preview"
                                >
                                    <i className="bi bi-zoom-out"></i>
                                </button>
                                <span className="px-2 text-xs font-mono font-bold text-gray-700 min-w-[50px] text-center">
                                    {Math.round(smartZoomScale * manualZoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFitToWidth(false);
                                        setManualZoom(z => Math.min(2.0, Number((z + 0.1).toFixed(2))));
                                    }}
                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                    title="Perbesar Preview"
                                >
                                    <i className="bi bi-zoom-in"></i>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFitToWidth(true);
                                        setManualZoom(1);
                                        updateSmartZoom();
                                    }}
                                    className={`ml-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${fitToWidth ? 'bg-teal-50 text-teal-700 border-teal-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                    title="Sesuaikan dengan Lebar Layar"
                                >
                                    <i className="bi bi-arrows-angle-expand mr-1"></i> Auto Fit
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">
                                    Format: <strong>{docType === 'surat-sakit' ? 'A5 Standar' : 'A4 Vertikal'}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={handleTriggerPrint}
                                    disabled={isPrinting}
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                                >
                                    <i className={`bi ${isPrinting ? 'bi-hourglass-split animate-spin' : 'bi-printer-fill'}`}></i>
                                    <span>{isPrinting ? 'Mencetak...' : 'Cetak Dokumen'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Live Sheet Container */}
                        <div
                            ref={previewContainerRef}
                            className="flex-1 min-h-[500px] overflow-auto bg-slate-200/80 p-4 sm:p-6 rounded-2xl border border-gray-300 flex justify-center items-start shadow-inner"
                        >
                            <div
                                style={{
                                    transform: `scale(${smartZoomScale * manualZoom})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.15s ease-out'
                                }}
                                className="shadow-2xl rounded-sm bg-white"
                            >
                                <div id="medical-preview-active-sheet" ref={sheetRef}>
                                    {docType === 'surat-sakit' && (
                                        <SuratSakitLiveSheet
                                            config={config}
                                            santri={santri}
                                            settings={settings}
                                            kamarName={kamarName}
                                            rombelName={rombelName}
                                        />
                                    )}
                                    {docType === 'surat-rujukan' && (
                                        <SuratRujukanLiveSheet
                                            config={config}
                                            santri={santri}
                                            settings={settings}
                                            kamarName={kamarName}
                                            rombelName={rombelName}
                                        />
                                    )}
                                    {docType === 'surat-pulang' && (
                                        <SuratPulangLiveSheet
                                            config={config}
                                            santri={santri}
                                            settings={settings}
                                            kamarName={kamarName}
                                            rombelName={rombelName}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                {/* Modal Footer */}
                <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between px-6 shrink-0">
                    <p className="text-xs text-gray-500">
                        * Preview di sebelah kanan diperbarui secara langsung (*real-time*) sesuai formulir di samping kiri.
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition"
                        >
                            Tutup
                        </button>
                        <button
                            type="button"
                            onClick={handleTriggerPrint}
                            disabled={isPrinting}
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                            <i className={`bi ${isPrinting ? 'bi-hourglass-split animate-spin' : 'bi-printer-fill'}`}></i>
                            <span>{isPrinting ? 'Menyiapkan Dokumen...' : 'Cetak / Unduh PDF'}</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

/**
 * 1. LIVE SHEET: SURAT KETERANGAN SAKIT
 */
const SuratSakitLiveSheet: React.FC<{
    config: MedicalDocumentConfig;
    santri: Santri;
    settings: PondokSettings;
    kamarName: string;
    rombelName: string;
}> = ({ config, santri, settings, kamarName, rombelName }) => {
    return (
        <div
            className="bg-white p-8 font-sans text-black printable-content-wrapper select-none"
            style={{ width: '21cm', minHeight: '14.8cm', boxSizing: 'border-box' }}
        >
            <PrintHeader settings={settings} title="SURAT KETERANGAN SAKIT" compact />

            <div className="text-center text-[10px] text-gray-600 -mt-1 mb-3 font-mono font-semibold">
                Nomor: {config.nomorSurat}
            </div>

            <div className="text-xs leading-relaxed">
                <p>Yang bertanda tangan di bawah ini, Tenaga Medis / Tim Layanan Kesehatan {settings.namaPonpes} menerangkan bahwa:</p>

                <table className="w-full my-2.5 ml-1 text-xs">
                    <tbody>
                        <tr><td className="w-32 font-semibold py-0.5">Nama Santri</td><td>: <strong>{santri.namaLengkap}</strong></td></tr>
                        <tr><td className="font-semibold py-0.5">NIS / Kelas</td><td>: {santri.nis || '-'} / {rombelName}</td></tr>
                        <tr><td className="font-semibold py-0.5">Kamar / Asrama</td><td>: {kamarName}</td></tr>
                        <tr><td className="font-semibold py-0.5">Jenis Kelamin</td><td>: {santri.jenisKelamin || '-'}</td></tr>
                    </tbody>
                </table>

                {/* Tanda Vital jika diisi */}
                {(config.suhuTubuh || config.tekananDarah || config.beratBadan) && (
                    <div className="my-2 p-2 bg-gray-50 border border-gray-200 rounded flex gap-4 text-xs">
                        {config.suhuTubuh ? <div><span className="text-gray-500">Suhu:</span> <strong>{config.suhuTubuh} °C</strong></div> : null}
                        {config.tekananDarah ? <div><span className="text-gray-500">Tensi:</span> <strong>{config.tekananDarah} mmHg</strong></div> : null}
                        {config.beratBadan ? <div><span className="text-gray-500">Berat Badan:</span> <strong>{config.beratBadan} kg</strong></div> : null}
                    </div>
                )}

                <p className="mt-2">Berdasarkan hasil pemeriksaan medis pada tanggal <strong>{formatDate(config.tanggalSurat)}</strong>, santri tersebut didiagnosa:</p>
                <div className="font-bold text-sm my-1.5 ml-2 text-gray-900 uppercase">
                    • {config.diagnosa || 'Pemeriksaan Kesehatan Umum'}
                </div>

                <p>
                    Dinyatakan <strong>PERLU ISTIRAHAT</strong> selama <strong>{config.lamaIstirahatHari} hari</strong> terhitung sejak tanggal pemeriksaan s.d. <strong>{formatDate(config.tanggalKembali)}</strong> demi proses pemulihan kesehatan dan dibebaskan sementara dari kegiatan belajar / keasramaan.
                </p>

                {config.tindakan && (
                    <div className="mt-2 p-2 border border-gray-200 rounded bg-gray-50 text-[11px]">
                        <strong>Tindakan / Terapi Obat:</strong> {config.tindakan}
                    </div>
                )}

                {config.catatan && (
                    <div className="mt-1.5 p-2 border border-dashed border-gray-300 rounded text-[11px] text-gray-700">
                        <strong>Catatan Petugas:</strong> {config.catatan}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-end mt-6 px-2 text-xs">
                <div className="text-[10px] text-gray-500 italic max-w-xs leading-tight">
                    * Harap surat ini disimpan oleh santri/musyrif asrama sebagai bukti sah dispensasi kegiatan pondok.
                </div>
                <div className="text-center w-52">
                    <p>{config.tempatSurat}, {formatDate(config.tanggalSurat)}</p>
                    <p className="mt-0.5">{config.jabatanPemeriksa || 'Petugas Pemeriksa'},</p>
                    <div className="h-12"></div>
                    <p className="font-bold underline">{config.namaPemeriksa || 'Petugas Poskestren'}</p>
                    <p className="text-[10px] text-gray-600">Poskestren {settings.namaPonpes}</p>
                </div>
            </div>

            <div className="mt-4 pt-2 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic">
                Dokumen resmi {settings.namaPonpes} - dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id
            </div>
        </div>
    );
};

/**
 * 2. LIVE SHEET: SURAT PENGANTAR RUJUKAN MEDIS
 */
const SuratRujukanLiveSheet: React.FC<{
    config: MedicalDocumentConfig;
    santri: Santri;
    settings: PondokSettings;
    kamarName: string;
    rombelName: string;
}> = ({ config, santri, settings, kamarName, rombelName }) => {
    return (
        <div
            className="bg-white p-8 font-sans text-black printable-content-wrapper select-none"
            style={{ width: '21cm', minHeight: '29.7cm', boxSizing: 'border-box' }}
        >
            <PrintHeader settings={settings} title="SURAT PENGANTAR RUJUKAN MEDIS" />

            <div className="mt-4 text-sm leading-relaxed">
                <div className="flex justify-between mb-4 text-xs">
                    <div>
                        <p>Nomor: <strong className="font-mono">{config.nomorSurat}</strong></p>
                        <p>Lampiran: -</p>
                        <p>Perihal: <strong>Rujukan Pasien Santri</strong></p>
                    </div>
                    <div className="text-right">
                        <p>{config.tempatSurat}, {formatDate(config.tanggalSurat)}</p>
                    </div>
                </div>

                <div className="my-3 text-xs">
                    <p>Kepada Yth.</p>
                    <p className="font-bold text-sm text-gray-900">{config.faskesRujukan || 'Dokter / Tenaga Medis Pemeriksa'}</p>
                    <p>Di Tempat Fasilitas Pelayanan Kesehatan / Rumah Sakit / Puskesmas</p>
                </div>

                <p className="mt-3 text-xs">
                    Dengan hormat,<br />
                    Bersama surat ini, kami menghadapkan pasien santri kami dari Pondok Pesantren {settings.namaPonpes} untuk mendapatkan pemeriksaan, evaluasi medis, dan penanganan lebih lanjut:
                </p>

                <div className="my-3 border border-gray-300 rounded-lg p-3 bg-gray-50/50">
                    <table className="w-full text-xs">
                        <tbody>
                            <tr><td className="w-36 font-semibold py-1">Nama Lengkap</td><td>: <strong>{santri.namaLengkap}</strong></td></tr>
                            <tr><td className="font-semibold py-1">NIS / Kelas</td><td>: {santri.nis || '-'} / {rombelName}</td></tr>
                            <tr><td className="font-semibold py-1">Jenis Kelamin</td><td>: {santri.jenisKelamin || '-'}</td></tr>
                            <tr><td className="font-semibold py-1">Tempat, Tgl Lahir</td><td>: {santri.tempatLahir || '-'}, {santri.tanggalLahir ? formatDate(santri.tanggalLahir) : '-'}</td></tr>
                            <tr><td className="font-semibold py-1">Asrama / Kamar</td><td>: {kamarName}</td></tr>
                            <tr><td className="font-semibold py-1">Wali / No. HP</td><td>: {santri.namaWali || santri.namaAyah || '-'} ({santri.teleponWali || santri.teleponAyah || '-'})</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="space-y-2.5 mt-3 text-xs">
                    <div className="border-l-4 border-teal-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-teal-800">1. Hasil Pemeriksaan Fisik & Tanda Vital</h4>
                        <div className="mt-1 flex flex-wrap gap-4 text-xs">
                            <span className="bg-gray-100 px-2.5 py-1 rounded border border-gray-300">Suhu Tubuh: <strong>{config.suhuTubuh ? `${config.suhuTubuh} °C` : '-'}</strong></span>
                            <span className="bg-gray-100 px-2.5 py-1 rounded border border-gray-300">Tekanan Darah: <strong>{config.tekananDarah ? `${config.tekananDarah} mmHg` : '-'}</strong></span>
                            <span className="bg-gray-100 px-2.5 py-1 rounded border border-gray-300">Berat Badan: <strong>{config.beratBadan ? `${config.beratBadan} kg` : '-'}</strong></span>
                        </div>
                    </div>

                    <div className="border-l-4 border-amber-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-amber-800">2. Anamnesa & Keluhan Utama</h4>
                        <p className="mt-0.5">{config.keluhan || '-'}</p>
                    </div>

                    <div className="border-l-4 border-blue-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-blue-800">3. Dugaan Diagnosa Sementara di Poskestren</h4>
                        <p className="font-bold text-blue-900 mt-0.5 text-sm">{config.diagnosa || '-'}</p>
                    </div>

                    <div className="border-l-4 border-purple-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-purple-800">4. Tindakan & Terapi Awal yang Telah Diberikan</h4>
                        <p className="mt-0.5">{config.tindakan || 'Perawatan pertama dan observasi di Poskestren'}</p>
                    </div>

                    <div className="border-l-4 border-rose-600 pl-3">
                        <h4 className="font-bold text-xs uppercase text-rose-800">5. Alasan Rujukan</h4>
                        <p className="mt-0.5">{config.alasanRujukan || 'Memerlukan pemeriksaan spesialis / sarana diagnostik penunjang lanjutan yang belum tersedia di Poskestren'}</p>
                    </div>
                </div>

                <p className="mt-4 text-xs">
                    Demikian surat rujukan ini kami sampaikan. Kami sangat berterima kasih atas perhatian, kerjasama, dan penanganan medis terbaik yang diberikan kepada santri kami.
                </p>

                <div className="flex justify-between items-center mt-8 px-4 text-xs">
                    <div className="w-56 text-center">
                        <p>Pendamping Pasien,</p>
                        <div className="h-16"></div>
                        <p className="border-b border-black font-semibold">({config.petugasPendamping || '..................................................'})</p>
                        <p className="text-[10px] text-gray-500">Ustadz / Petugas Pendamping</p>
                    </div>
                    <div className="w-56 text-center">
                        <p>{config.tempatSurat}, {formatDate(config.tanggalSurat)}</p>
                        <p>{config.jabatanPemeriksa || 'Petugas Poskestren'},</p>
                        <div className="h-16"></div>
                        <p className="font-bold underline">{config.namaPemeriksa || 'Petugas Medis Poskestren'}</p>
                        <p className="text-[10px] text-gray-600">{settings.namaPonpes}</p>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic">
                Dokumen resmi {settings.namaPonpes} - dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id
            </div>
        </div>
    );
};

/**
 * 3. LIVE SHEET: SURAT REKOMENDASI ISTIRAHAT DI RUMAH (IZIN PULANG)
 */
const SuratPulangLiveSheet: React.FC<{
    config: MedicalDocumentConfig;
    santri: Santri;
    settings: PondokSettings;
    kamarName: string;
    rombelName: string;
}> = ({ config, santri, settings, kamarName, rombelName }) => {
    return (
        <div
            className="bg-white p-8 font-sans text-black printable-content-wrapper select-none"
            style={{ width: '21cm', minHeight: '29.7cm', boxSizing: 'border-box' }}
        >
            <PrintHeader settings={settings} title="SURAT REKOMENDASI ISTIRAHAT DI RUMAH (IZIN PULANG SAKIT)" />

            <div className="text-center text-[11px] text-gray-600 -mt-1 mb-4 font-mono font-semibold">
                Nomor: {config.nomorSurat}
            </div>

            <div className="mt-2 text-sm leading-relaxed">
                <p className="text-xs">
                    Berdasarkan hasil pemeriksaan fisik dan evaluasi medis yang dilakukan oleh Tim Kesehatan Poskestren {settings.namaPonpes}, menerangkan bahwa:
                </p>

                <div className="my-3.5 border border-gray-300 rounded-lg p-3.5 bg-gray-50 text-xs">
                    <table className="w-full text-xs">
                        <tbody>
                            <tr><td className="w-36 font-semibold py-1">Nama Santri</td><td>: <strong>{santri.namaLengkap}</strong></td></tr>
                            <tr><td className="font-semibold py-1">NIS / Kelas</td><td>: {santri.nis || '-'} / {rombelName}</td></tr>
                            <tr><td className="font-semibold py-1">Kamar / Asrama</td><td>: {kamarName}</td></tr>
                            <tr><td className="font-semibold py-1">Orang Tua / Wali</td><td>: {santri.namaWali || santri.namaAyah || '-'} ({santri.teleponWali || santri.teleponAyah || '-'})</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="space-y-2 mt-3 text-xs">
                    <p>
                        Santri tersebut terdiagnosa mengalami: <strong className="text-sm text-red-700 uppercase">{config.diagnosa || 'Pemeriksaan Kesehatan'}</strong>
                    </p>
                    <p>
                        Dengan mempertimbangkan kondisi klinis dan perlunya pemulihan / isolasi intensif dalam pendampingan keluarga di rumah, santri bersangkutan <strong>DIREKOMENDASIKAN BERISTIRAHAT DI RUMAH</strong> selama:
                    </p>
                    <div className="p-3 bg-teal-50 border border-teal-300 rounded-lg my-3 text-center">
                        <span className="text-xl font-black text-teal-900">{config.lamaIstirahatHari} HARI</span>
                        <p className="text-xs text-teal-700 mt-1">
                            Terhitung sejak <strong>{formatDate(config.tanggalSurat)}</strong> s.d. diharapkan kembali ke pondok pada <strong>{formatDate(config.tanggalKembali)}</strong>
                        </p>
                    </div>
                </div>

                <div className="mt-3 p-3 border border-gray-300 rounded bg-gray-50 text-xs space-y-1">
                    <p className="font-bold">Anjuran & Petunjuk Perawatan di Rumah:</p>
                    <p>• {config.tindakan || 'Menjaga asupan gizi, istirahat cukup, dan mengonsumsi obat sesuai anjuran medis.'}</p>
                    {config.catatan && <p>• Catatan Tambahan: {config.catatan}</p>}
                    <p>• Apabila kondisi santri belum memungkinkan kembali pada tanggal tersebut di atas, orang tua / wali santri dimohon segera mengonfirmasi ke pihak Poskestren / Pengasuhan Pondok.</p>
                </div>

                <p className="mt-4 text-xs text-gray-700">
                    Demikian surat rekomendasi medis ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagai pengantar dispensasi / perizinan ke Bagian Keamanan & Pengasuhan Santri.
                </p>

                <div className="flex justify-between items-center mt-10 px-6 text-xs">
                    <div className="w-52 text-center">
                        <p>Mengetahui,</p>
                        <p>Wali Santri / Penjemput,</p>
                        <div className="h-16"></div>
                        <p className="border-b border-black font-semibold">( .................................................. )</p>
                    </div>
                    <div className="w-52 text-center">
                        <p>{config.tempatSurat}, {formatDate(config.tanggalSurat)}</p>
                        <p>{config.jabatanPemeriksa || 'Petugas Poskestren'},</p>
                        <div className="h-16"></div>
                        <p className="font-bold underline">{config.namaPemeriksa || 'Petugas Kesehatan'}</p>
                        <p className="text-[10px] text-gray-600">Poskestren {settings.namaPonpes}</p>
                    </div>
                </div>

                {config.mengetahuiNama && (
                    <div className="mt-6 text-center text-xs">
                        <p>Mengetahui,</p>
                        <p>{config.mengetahuiJabatan || 'Pimpinan Pondok Pesantren'}</p>
                        <div className="h-14"></div>
                        <p className="font-bold underline">{config.mengetahuiNama}</p>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic">
                Dokumen resmi {settings.namaPonpes} - dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id
            </div>
        </div>
    );
};
