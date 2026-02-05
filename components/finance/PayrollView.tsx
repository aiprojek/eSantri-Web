
import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from '../../db';
import { useAppContext } from '../../AppContext';
import { TenagaPengajar, PayrollRecord, ConfigGaji } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { generatePayrollDraft } from '../../services/financeService';
import { printToPdfNative } from '../../utils/pdfGenerator';
import { SlipGajiTemplate } from './print/SlipGajiTemplate';
import { useFinanceContext } from '../../contexts/FinanceContext';

// --- PREVIEW MODAL COMPONENT ---
const PayslipPreviewModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    record: PayrollRecord; 
    settings: any 
}> = ({ isOpen, onClose, record, settings }) => {
    if (!isOpen) return null;

    const handlePrint = () => {
        // Mencetak area spesifik di dalam modal
        printToPdfNative('slip-gaji-modal-content', `Slip_Gaji_${record.namaGuru.replace(/\s+/g, '_')}_${record.bulan}_${record.tahun}`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[80] flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-down">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Pratinjau Slip Gaji</h3>
                        <p className="text-xs text-gray-500">{record.namaGuru} - Periode {record.bulan}/{record.tahun}</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handlePrint} 
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2 shadow-sm transition-transform hover:-translate-y-0.5"
                        >
                            <i className="bi bi-printer-fill"></i> Cetak PDF
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <i className="bi bi-x-lg text-xl"></i>
                        </button>
                    </div>
                </div>

                {/* Scrollable Preview Area */}
                <div className="flex-grow overflow-auto bg-gray-500/10 p-8 flex justify-center items-start custom-scrollbar">
                    {/* Container ID for printing */}
                    <div id="slip-gaji-modal-content" className="bg-white shadow-xl transition-transform origin-top">
                        {/* We reuse the exact same template logic */}
                        <SlipGajiTemplate record={record} settings={settings} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- CONFIG TAB ---
const PayrollConfigTab: React.FC<{ settings: any, onSave: (d: any) => void }> = ({ settings, onSave }) => {
    const [teachers, setTeachers] = useState<TenagaPengajar[]>(settings.tenagaPengajar);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<ConfigGaji>({
        gajiPokok: 0, tunjanganJabatan: 0, honorPerJam: 0, tunjanganLain: 0, potonganLain: 0, bank: '', noRekening: ''
    });

    const handleEdit = (t: TenagaPengajar) => {
        setEditingId(t.id);
        setEditForm(t.configGaji || { gajiPokok: 0, tunjanganJabatan: 0, honorPerJam: 0, tunjanganLain: 0, potonganLain: 0, bank: '', noRekening: '' });
    };

    const handleSaveConfig = () => {
        const updated = teachers.map(t => t.id === editingId ? { ...t, configGaji: editForm } : t);
        setTeachers(updated);
        onSave({ ...settings, tenagaPengajar: updated });
        setEditingId(null);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-4">Konfigurasi Gaji Guru</h3>
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="p-3">Nama Guru</th>
                            <th className="p-3 text-right">Gaji Pokok</th>
                            <th className="p-3 text-right">Tunjangan Jabatan</th>
                            <th className="p-3 text-right">Honor/Jam (JTM)</th>
                            <th className="p-3 text-right">Lainnya</th>
                            <th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {teachers.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="p-3 font-medium">{t.nama}</td>
                                {editingId === t.id ? (
                                    <>
                                        <td className="p-2"><input type="number" value={editForm.gajiPokok} onChange={e => setEditForm({...editForm, gajiPokok: Number(e.target.value)})} className="w-full border rounded p-1 text-right" /></td>
                                        <td className="p-2"><input type="number" value={editForm.tunjanganJabatan} onChange={e => setEditForm({...editForm, tunjanganJabatan: Number(e.target.value)})} className="w-full border rounded p-1 text-right" /></td>
                                        <td className="p-2"><input type="number" value={editForm.honorPerJam} onChange={e => setEditForm({...editForm, honorPerJam: Number(e.target.value)})} className="w-full border rounded p-1 text-right" /></td>
                                        <td className="p-2">
                                            <input type="number" value={editForm.tunjanganLain} onChange={e => setEditForm({...editForm, tunjanganLain: Number(e.target.value)})} className="w-20 border rounded p-1 text-right mb-1" placeholder="Tunj." />
                                            <input type="number" value={editForm.potonganLain} onChange={e => setEditForm({...editForm, potonganLain: Number(e.target.value)})} className="w-20 border rounded p-1 text-right text-red-600" placeholder="Pot." />
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={handleSaveConfig} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Simpan</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="p-3 text-right">{formatRupiah(t.configGaji?.gajiPokok || 0)}</td>
                                        <td className="p-3 text-right">{formatRupiah(t.configGaji?.tunjanganJabatan || 0)}</td>
                                        <td className="p-3 text-right">{formatRupiah(t.configGaji?.honorPerJam || 0)}</td>
                                        <td className="p-3 text-right">
                                            <div className="text-green-600">+{formatRupiah(t.configGaji?.tunjanganLain || 0)}</div>
                                            <div className="text-red-600">-{formatRupiah(t.configGaji?.potonganLain || 0)}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleEdit(t)} className="text-blue-600 hover:text-blue-800"><i className="bi bi-pencil-square"></i></button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- GENERATE TAB ---
const GeneratePayrollTab: React.FC<{ settings: any }> = ({ settings }) => {
    const { showToast, showConfirmation, currentUser } = useAppContext();
    const { onSetorKeKas } = useFinanceContext();
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [weeks, setWeeks] = useState(4);
    
    const [drafts, setDrafts] = useState<PayrollRecord[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    
    const handleCalculate = async () => {
        setIsCalculating(true);
        try {
            const result = await generatePayrollDraft(db, settings.tenagaPengajar, month, year, weeks);
            setDrafts(result);
            if (result.length === 0) showToast('Semua guru sudah digaji untuk periode ini atau tidak ada data.', 'info');
        } catch(e) {
            showToast('Gagal menghitung gaji.', 'error');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleUpdateDraft = (id: number, field: keyof PayrollRecord, value: number | string) => {
        setDrafts(prev => prev.map(d => {
            if (d.id !== id) return d;
            const updated = { ...d, [field]: value };
            // Recalculate total if numbers changed
            if (typeof value === 'number') {
                if (field === 'totalJamMengajar') {
                    updated.totalHonorJTM = (value as number) * updated.honorPerJam;
                }
                updated.totalDiterima = updated.gajiPokok + updated.tunjanganJabatan + updated.totalHonorJTM + updated.tunjanganLain + updated.bonus - updated.potonganLain - updated.potonganAbsen;
            }
            return updated;
        }));
    };

    const handlePostToDb = () => {
        if (drafts.length === 0) return;
        const totalPayout = drafts.reduce((sum, d) => sum + d.totalDiterima, 0);

        showConfirmation(
            'Posting Penggajian?',
            `Anda akan menyimpan ${drafts.length} slip gaji dengan total ${formatRupiah(totalPayout)}. Data ini akan dicatat sebagai Pengeluaran di Buku Kas.`,
            async () => {
                try {
                    await db.payrollRecords.bulkAdd(drafts);
                    // Add transaction to Cashflow
                    await db.transaksiKas.add({
                        id: Date.now(),
                        tanggal: new Date().toISOString(),
                        jenis: 'Pengeluaran',
                        kategori: 'Gaji & Honor',
                        deskripsi: `Penggajian Periode ${month}/${year} (${drafts.length} Guru)`,
                        jumlah: totalPayout,
                        saldoSetelah: 0, // Will be recalc by service logic usually, or handle here manually if needed but FinanceContext handles basic adds
                        penanggungJawab: currentUser?.fullName || 'Admin',
                        lastModified: Date.now()
                    });
                    
                    showToast('Penggajian berhasil di-posting!', 'success');
                    setDrafts([]);
                } catch(e) {
                    showToast('Gagal menyimpan data.', 'error');
                }
            },
            { confirmText: 'Ya, Posting & Bayar', confirmColor: 'green' }
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-4">Generate Penggajian Bulanan</h3>
            
            <div className="flex flex-wrap gap-4 items-end mb-6 bg-gray-50 p-4 rounded-lg">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Bulan</label>
                    <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border rounded p-2 text-sm w-32">
                        {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Tahun</label>
                    <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="border rounded p-2 text-sm w-24" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Minggu Efektif</label>
                    <input type="number" value={weeks} onChange={e => setWeeks(Number(e.target.value))} className="border rounded p-2 text-sm w-20" min="1" max="5" />
                </div>
                <button onClick={handleCalculate} disabled={isCalculating} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
                    {isCalculating ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : <i className="bi bi-calculator"></i>} Hitung Estimasi
                </button>
            </div>

            {drafts.length > 0 && (
                <div className="animate-fade-in">
                    <div className="overflow-x-auto border rounded-lg mb-4">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600">
                                <tr>
                                    <th className="p-3">Nama</th>
                                    <th className="p-3 text-right">Gaji Pokok</th>
                                    <th className="p-3 text-right">JTM (Jam)</th>
                                    <th className="p-3 text-right">Honor JTM</th>
                                    <th className="p-3 text-right">Tunjangan</th>
                                    <th className="p-3 text-right w-24">Bonus</th>
                                    <th className="p-3 text-right w-24">Potongan</th>
                                    <th className="p-3 text-right font-bold bg-green-50">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {drafts.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{d.namaGuru}</td>
                                        <td className="p-3 text-right">{formatRupiah(d.gajiPokok)}</td>
                                        <td className="p-3 text-right">
                                            <input type="number" value={d.totalJamMengajar} onChange={e => handleUpdateDraft(d.id, 'totalJamMengajar', Number(e.target.value))} className="w-16 border rounded p-1 text-center text-xs" />
                                        </td>
                                        <td className="p-3 text-right">{formatRupiah(d.totalHonorJTM)}</td>
                                        <td className="p-3 text-right">{formatRupiah(d.tunjanganJabatan + d.tunjanganLain)}</td>
                                        <td className="p-3 text-right">
                                            <input type="number" value={d.bonus} onChange={e => handleUpdateDraft(d.id, 'bonus', Number(e.target.value))} className="w-20 border rounded p-1 text-right text-xs bg-green-50" />
                                        </td>
                                        <td className="p-3 text-right">
                                            <input type="number" value={d.potonganAbsen} onChange={e => handleUpdateDraft(d.id, 'potonganAbsen', Number(e.target.value))} className="w-20 border rounded p-1 text-right text-xs bg-red-50 text-red-600" />
                                        </td>
                                        <td className="p-3 text-right font-bold bg-green-50/50">{formatRupiah(d.totalDiterima)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold">
                                <tr>
                                    <td colSpan={7} className="p-3 text-right">TOTAL PENGELUARAN GAJI:</td>
                                    <td className="p-3 text-right text-lg text-teal-700">{formatRupiah(drafts.reduce((s, d) => s + d.totalDiterima, 0))}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handlePostToDb} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-green-700 flex items-center gap-2">
                            <i className="bi bi-check2-circle"></i> Posting Keuangan & Bayar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- HISTORY TAB ---
const PayrollHistoryTab: React.FC<{ settings: any }> = ({ settings }) => {
    const history = useLiveQuery(() => db.payrollRecords.orderBy('id').reverse().toArray(), []) || [];
    const [previewRecord, setPreviewRecord] = useState<PayrollRecord | null>(null);

    const handleDelete = (id: number) => {
        if(confirm('Hapus riwayat gaji ini?')) {
            db.payrollRecords.delete(id);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-4">Riwayat Penggajian</h3>
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="p-3">Periode</th>
                            <th className="p-3">Tanggal Bayar</th>
                            <th className="p-3">Nama Guru</th>
                            <th className="p-3 text-right">Nominal</th>
                            <th className="p-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {history.map(h => (
                            <tr key={h.id} className="hover:bg-gray-50">
                                <td className="p-3 font-medium">{h.bulan}/{h.tahun}</td>
                                <td className="p-3">{new Date(h.tanggalBayar).toLocaleDateString('id-ID')}</td>
                                <td className="p-3">{h.namaGuru}</td>
                                <td className="p-3 text-right font-bold text-teal-700">{formatRupiah(h.totalDiterima)}</td>
                                <td className="p-3 text-center flex justify-center gap-2">
                                    <button onClick={() => setPreviewRecord(h)} className="text-blue-600 hover:text-blue-800" title="Preview Slip"><i className="bi bi-eye-fill"></i></button>
                                    <button onClick={() => handleDelete(h.id)} className="text-red-600 hover:text-red-800" title="Hapus"><i className="bi bi-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                        {history.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Belum ada riwayat penggajian.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Preview Modal */}
            {previewRecord && (
                <PayslipPreviewModal 
                    isOpen={!!previewRecord} 
                    onClose={() => setPreviewRecord(null)} 
                    record={previewRecord} 
                    settings={settings} 
                />
            )}
        </div>
    );
};

export const PayrollView: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
    const { settings, onSaveSettings } = useAppContext();
    const [activeTab, setActiveTab] = useState<'config' | 'generate' | 'history'>('generate');

    if (!canWrite) {
        return <div className="p-8 text-center text-red-500">Anda tidak memiliki akses ke modul ini.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-2 border-b">
                <button onClick={() => setActiveTab('generate')} className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'generate' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Generate Gaji</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'history' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Riwayat & Cetak</button>
                <button onClick={() => setActiveTab('config')} className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'config' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Konfigurasi Gaji</button>
            </div>

            {activeTab === 'config' && <PayrollConfigTab settings={settings} onSave={onSaveSettings} />}
            {activeTab === 'generate' && <GeneratePayrollTab settings={settings} />}
            {activeTab === 'history' && <PayrollHistoryTab settings={settings} />}
        </div>
    );
};
