
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { AbsensiRecord } from '../types';
import { PrintHeader } from './common/PrintHeader';
import { ReportFooter } from './reports/modules/Common';
import * as XLSX from 'xlsx';
// Import jsPDF and autoTable for high-quality PDF generation
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// --- SUB-COMPONENT: INPUT ABSENSI ---
const AbsensiInput: React.FC = () => {
    const { settings, santriList, absensiList, onSaveAbsensi, showToast, currentUser } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.absensi === 'write';

    const [selectedJenjangId, setSelectedJenjangId] = useState<number>(0);
    const [selectedKelasId, setSelectedKelasId] = useState<number>(0);
    const [selectedRombelId, setSelectedRombelId] = useState<number>(0);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [view, setView] = useState<'selector' | 'input'>('selector');
    
    // State Data
    const [attendanceMap, setAttendanceMap] = useState<Record<number, AbsensiRecord['status']>>({});
    const [notesMap, setNotesMap] = useState<Record<number, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentUser && currentUser.role === 'staff' && settings.rombel.length === 1) {
             const r = settings.rombel[0];
             setSelectedRombelId(r.id);
             setSelectedKelasId(r.kelasId);
             const k = settings.kelas.find(k => k.id === r.kelasId);
             if(k) setSelectedJenjangId(k.jenjangId);
        }
    }, [currentUser, settings.rombel]);

    const availableKelas = useMemo(() => settings.kelas.filter(k => k.jenjangId === selectedJenjangId), [selectedJenjangId, settings.kelas]);
    const availableRombel = useMemo(() => settings.rombel.filter(r => r.kelasId === selectedKelasId), [selectedKelasId, settings.rombel]);

    const targetSantri = useMemo(() => {
        if (!selectedRombelId) return [];
        return santriList
            .filter(s => s.rombelId === selectedRombelId && s.status === 'Aktif')
            .sort((a,b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [selectedRombelId, santriList]);

    const existingRecords = useMemo(() => {
        if (!selectedRombelId || !selectedDate) return [];
        return absensiList.filter(a => a.rombelId === selectedRombelId && a.tanggal === selectedDate);
    }, [absensiList, selectedRombelId, selectedDate]);

    const handleStartInput = () => {
        if (!selectedRombelId) {
            showToast('Pilih rombel terlebih dahulu.', 'error');
            return;
        }
        const initialMap: Record<number, AbsensiRecord['status']> = {};
        const initialNotes: Record<number, string> = {};
        
        targetSantri.forEach(s => {
            const existing = existingRecords.find(r => r.santriId === s.id);
            initialMap[s.id] = existing ? existing.status : 'H'; // Default Hadir jika baru
            initialNotes[s.id] = existing?.keterangan || '';
        });
        
        setAttendanceMap(initialMap);
        setNotesMap(initialNotes);
        setView('input');
    };

    const handleMarkAllPresent = () => {
        const newMap = { ...attendanceMap };
        targetSantri.forEach(s => {
            newMap[s.id] = 'H';
        });
        setAttendanceMap(newMap);
        showToast('Semua santri ditandai Hadir.', 'info');
    };

    const handleStatusChange = (santriId: number, status: AbsensiRecord['status']) => {
        setAttendanceMap(prev => ({ ...prev, [santriId]: status }));
    };

    const handleNoteChange = (santriId: number, note: string) => {
        setNotesMap(prev => ({ ...prev, [santriId]: note }));
    };

    const handleSave = async () => {
        if (!canWrite) return;
        setIsSaving(true);
        try {
            const recordsToSave: AbsensiRecord[] = targetSantri.map(s => {
                const existing = existingRecords.find(r => r.santriId === s.id);
                return {
                    id: existing ? existing.id : Date.now() + Math.random(),
                    santriId: s.id,
                    rombelId: selectedRombelId,
                    tanggal: selectedDate,
                    status: attendanceMap[s.id],
                    keterangan: notesMap[s.id],
                    recordedBy: currentUser?.username || 'Staff',
                };
            });
            await onSaveAbsensi(recordsToSave);
            showToast('Data absensi berhasil disimpan.', 'success');
            setView('selector');
        } catch (error) {
            showToast('Gagal menyimpan absensi.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'H': return 'bg-green-100 text-green-700 border-green-300';
            case 'S': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'I': return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'A': return 'bg-red-100 text-red-700 border-red-300';
            default: return 'bg-gray-100';
        }
    };

    if (view === 'selector') {
        return (
            <div className="max-w-2xl mx-auto p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                    <div className="bg-teal-600 p-6 text-white">
                        <h2 className="text-xl font-bold"><i className="bi bi-pencil-square mr-2"></i>Catat Kehadiran</h2>
                        <p className="opacity-90 text-sm mt-1">Pilih kelas dan tanggal untuk mulai mengabsen.</p>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal</label>
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jenjang</label>
                                <select value={selectedJenjangId} onChange={e => { setSelectedJenjangId(Number(e.target.value)); setSelectedKelasId(0); setSelectedRombelId(0); }} className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                                    <option value={0}>-- Pilih Jenjang --</option>
                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kelas</label>
                                <select value={selectedKelasId} onChange={e => { setSelectedKelasId(Number(e.target.value)); setSelectedRombelId(0); }} disabled={!selectedJenjangId} className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100">
                                    <option value={0}>-- Pilih Kelas --</option>
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rombel (Wajib)</label>
                                <select value={selectedRombelId} onChange={e => setSelectedRombelId(Number(e.target.value))} disabled={!selectedKelasId} className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100">
                                    <option value={0}>-- Pilih Rombel --</option>
                                    {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                </select>
                            </div>
                        </div>
                        {selectedRombelId !== 0 && (
                            <div className={`p-4 rounded-lg border ${existingRecords.length > 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                <div className="flex items-start gap-3">
                                    <i className={`bi ${existingRecords.length > 0 ? 'bi-check-circle-fill text-green-600' : 'bi-exclamation-circle-fill text-yellow-600'} text-xl mt-0.5`}></i>
                                    <div>
                                        <h4 className={`font-bold ${existingRecords.length > 0 ? 'text-green-800' : 'text-yellow-800'}`}>{existingRecords.length > 0 ? 'Sudah Diabsen' : 'Belum Diabsen'}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{existingRecords.length > 0 ? `Terakhir oleh ${existingRecords[0].recordedBy || '...'}. Klik Lanjut untuk edit.` : 'Klik Lanjut untuk mulai mengisi.'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <button onClick={handleStartInput} disabled={!selectedRombelId} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">Lanjut <i className="bi bi-arrow-right"></i></button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-24 animate-fade-in relative">
            <div className="sticky top-0 z-30 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-gray-800">{settings.rombel.find(r => r.id === selectedRombelId)?.nama}</h2>
                    <p className="text-xs text-gray-500">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleMarkAllPresent} className="hidden sm:flex text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg text-xs font-bold items-center gap-1 border border-teal-200 transition-colors">
                        <i className="bi bi-check-all text-sm"></i> Semua Hadir
                    </button>
                    <button onClick={() => setView('selector')} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-lg"><i className="bi bi-x-lg"></i></button>
                </div>
            </div>
            
            {/* Mobile Mark All Button (Only visible on small screens) */}
            <div className="sm:hidden px-4 pt-3">
                 <button onClick={handleMarkAllPresent} className="w-full text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-teal-200 transition-colors">
                    <i className="bi bi-check-all text-sm"></i> Tandai Semua Hadir
                </button>
            </div>

            <div className="p-4 space-y-3 max-w-3xl mx-auto">
                {targetSantri.map(santri => {
                    const status = attendanceMap[santri.id];
                    return (
                        <div key={santri.id} className={`bg-white p-4 rounded-xl border-2 transition-all ${status === 'A' ? 'border-red-100' : 'border-transparent'} shadow-sm`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                        {santri.fotoUrl && !santri.fotoUrl.includes('text=Foto') ? <img src={santri.fotoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{santri.namaLengkap.substring(0,2).toUpperCase()}</div>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 leading-tight">{santri.namaLengkap}</p>
                                        <p className="text-xs text-gray-500">{santri.nis}</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>{status === 'H' ? 'Hadir' : status === 'S' ? 'Sakit' : status === 'I' ? 'Izin' : 'Alpha'}</div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="grid grid-cols-4 gap-2">
                                    {(['H', 'S', 'I', 'A'] as const).map(opt => (
                                        <button key={opt} onClick={() => handleStatusChange(santri.id, opt)} className={`py-3 rounded-lg font-bold text-sm transition-all border ${status === opt ? (opt === 'H' ? 'bg-green-600 text-white border-green-600 ring-2 ring-green-200' : opt === 'S' ? 'bg-yellow-500 text-white border-yellow-500 ring-2 ring-yellow-200' : opt === 'I' ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200' : 'bg-red-600 text-white border-red-600 ring-2 ring-red-200') : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{opt}</button>
                                    ))}
                                </div>
                                {(status === 'S' || status === 'I' || status === 'A' || notesMap[santri.id]) && (
                                    <div className="animate-fade-in">
                                        <input 
                                            type="text" 
                                            placeholder={status === 'S' ? "Sakit apa?" : status === 'I' ? "Izin kenapa?" : "Keterangan tambahan..."}
                                            value={notesMap[santri.id] || ''}
                                            onChange={(e) => handleNoteChange(santri.id, e.target.value)}
                                            className="w-full text-sm border-b border-gray-300 focus:border-teal-500 outline-none py-1 bg-transparent placeholder-gray-400"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 md:pl-72">
                <div className="max-w-3xl mx-auto flex justify-between items-center gap-4">
                    <div className="text-xs text-gray-500 hidden sm:block">Pastikan data sudah benar.</div>
                    <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 active:translate-y-0 disabled:bg-gray-400">
                        {isSaving ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : <i className="bi bi-cloud-upload-fill"></i>} Simpan Absensi
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: REKAP & LAPORAN ---
const AbsensiRekap: React.FC = () => {
    const { settings, santriList, absensiList, showToast } = useAppContext();
    
    const now = new Date();
    const [bulan, setBulan] = useState(now.getMonth() + 1);
    const [tahun, setTahun] = useState(now.getFullYear());
    const [rombelId, setRombelId] = useState<number>(0);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!rombelId && settings.rombel.length > 0) {
            setRombelId(settings.rombel[0].id);
        }
    }, [settings.rombel, rombelId]);

    // Close export menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedRombel = useMemo(() => settings.rombel.find(r => r.id === rombelId), [rombelId, settings.rombel]);
    
    // Get holidays based on the JENJANG of the selected rombel
    const holidays = useMemo(() => {
        if (!selectedRombel) return [0]; // Default Sunday if no rombel
        const kelas = settings.kelas.find(k => k.id === selectedRombel.kelasId);
        const jenjang = settings.jenjang.find(j => j.id === kelas?.jenjangId);
        return jenjang?.hariLibur || [0];
    }, [selectedRombel, settings.kelas, settings.jenjang]);

    const santriInRombel = useMemo(() => santriList.filter(s => s.rombelId === rombelId && s.status === 'Aktif').sort((a,b) => a.namaLengkap.localeCompare(b.namaLengkap)), [santriList, rombelId]);
    const daysInMonth = useMemo(() => new Date(tahun, bulan, 0).getDate(), [tahun, bulan]);

    const attendanceMatrix = useMemo(() => {
        const matrix: Record<number, Record<number, string>> = {};
        const stats: Record<number, { H: number, S: number, I: number, A: number }> = {};

        santriInRombel.forEach(s => {
            matrix[s.id] = {};
            stats[s.id] = { H: 0, S: 0, I: 0, A: 0 };
        });

        const records = absensiList.filter(a => {
            const d = new Date(a.tanggal);
            return a.rombelId === rombelId && d.getMonth() + 1 === bulan && d.getFullYear() === tahun;
        });

        records.forEach(r => {
            const dateNum = new Date(r.tanggal).getDate();
            if (matrix[r.santriId]) {
                matrix[r.santriId][dateNum] = r.status;
                if (['H', 'S', 'I', 'A'].includes(r.status)) {
                    stats[r.santriId][r.status as 'H'|'S'|'I'|'A']++;
                }
            }
        });

        return { matrix, stats };
    }, [absensiList, rombelId, bulan, tahun, santriInRombel]);

    // Calculate effective working days (estimated) or use total recorded days
    // Simple approach: Total days with records in this class
    const recordedDaysCount = useMemo(() => {
        const uniqueDays = new Set<string>();
        absensiList.forEach(a => {
            const d = new Date(a.tanggal);
            if (a.rombelId === rombelId && d.getMonth() + 1 === bulan && d.getFullYear() === tahun) {
                uniqueDays.add(a.tanggal);
            }
        });
        return uniqueDays.size || 1; // Avoid divide by zero
    }, [absensiList, rombelId, bulan, tahun]);

    // Total Stats for the whole class this month
    const classStats = useMemo(() => {
        const total = { H: 0, S: 0, I: 0, A: 0 };
        Object.values(attendanceMatrix.stats).forEach(s => {
            const stat = s as { H: number; S: number; I: number; A: number };
            total.H += stat.H; total.S += stat.S; total.I += stat.I; total.A += stat.A;
        });
        return total;
    }, [attendanceMatrix]);

    const handlePrint = () => {
        window.print();
    };

    const handleExport = (format: 'xlsx' | 'ods' | 'csv' | 'pdf') => {
        setIsExportMenuOpen(false);
        const fileName = `Rekap_Absensi_${selectedRombel?.nama.replace(/\s+/g, '_')}_${bulan}_${tahun}`;
        const periodeName = new Date(tahun, bulan - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        if (format === 'pdf') {
            // Updated to use jsPDF + autoTable for vectorized PDF (not screenshot)
            try {
                const doc = new jsPDF('l', 'mm', 'a4'); // Landscape, mm, A4
                
                // --- 1. Header (Kop) ---
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(settings.namaPonpes.toUpperCase(), 14, 15);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(settings.alamat, 14, 20);
                
                // Line separator
                doc.setLineWidth(0.5);
                doc.line(14, 24, 283, 24);

                // --- 2. Title & Metadata ---
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`REKAPITULASI ABSENSI KELAS ${selectedRombel?.nama.toUpperCase()}`, 14, 32);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`PERIODE: ${periodeName.toUpperCase()}`, 14, 37);

                // --- 3. Table Structure ---
                const headRow1: any[] = [
                    { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                    { content: 'Nama Santri', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } }
                ];
                
                const colStyles: any = {
                    0: { cellWidth: 10, halign: 'center' }, // No
                    1: { cellWidth: 'auto' }, // Nama
                };

                let colIdx = 2;
                
                // Add Date Columns to Header
                for(let i=1; i<=daysInMonth; i++) {
                    headRow1.push({ content: i.toString(), styles: { halign: 'center', fontSize: 7 } });
                    colStyles[colIdx] = { cellWidth: 5 };
                    colIdx++;
                }
                
                // Add Summary Columns to Header (Spanning on top? No, just end columns)
                // Let's make Summary separate columns at end
                 headRow1.push({ content: 'S', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [254, 243, 199] } }); // Yellow
                 colStyles[colIdx] = { cellWidth: 8 };
                 colIdx++;

                 headRow1.push({ content: 'I', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [219, 234, 254] } }); // Blue
                 colStyles[colIdx] = { cellWidth: 8 };
                 colIdx++;

                 headRow1.push({ content: 'A', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [254, 226, 226] } }); // Red
                 colStyles[colIdx] = { cellWidth: 8 };
                 colIdx++;

                 headRow1.push({ content: 'H', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [220, 252, 231] } }); // Green
                 colStyles[colIdx] = { cellWidth: 8 };
                 colIdx++;

                 headRow1.push({ content: '%', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } });
                 colStyles[colIdx] = { cellWidth: 10 };
                 colIdx++;

                // Construct Body Data
                const bodyData = santriInRombel.map((s, idx) => {
                    const row = [ (idx + 1).toString(), s.namaLengkap ];
                    const stat = attendanceMatrix.stats[s.id] as { H: number; S: number; I: number; A: number };
                    
                    // Fill Date Columns
                    for(let i=1; i<=daysInMonth; i++) {
                        const status = attendanceMatrix.matrix[s.id][i] || '';
                        row.push(status);
                    }
                    
                    // Fill Summary
                    row.push(stat.S.toString());
                    row.push(stat.I.toString());
                    row.push(stat.A.toString());
                    row.push(stat.H.toString());
                    
                    const percent = recordedDaysCount > 0 ? Math.round((stat.H / recordedDaysCount) * 100) : 0;
                    row.push(`${percent}%`);
                    
                    return row;
                });

                // Styling for Date Columns (Holidays)
                const didParseCell = (data: any) => {
                    // Check if column index corresponds to a date (0=No, 1=Nama, 2=Date1 ... )
                    if (data.section === 'head' && data.row.index === 0) {
                         // Main Header Style handled by autoTable theme
                    }
                    
                    if (data.section === 'body') {
                        const colIdx = data.column.index;
                        // Date columns are from index 2 to (2 + daysInMonth - 1)
                        if (colIdx >= 2 && colIdx < 2 + daysInMonth) {
                             const dayNum = colIdx - 1; // 2 -> 1st, 3 -> 2nd
                             const dateVal = new Date(tahun, bulan - 1, dayNum);
                             const isHoliday = holidays.includes(dateVal.getDay());
                             
                             const cellVal = data.cell.raw;
                             
                             if (isHoliday) {
                                 data.cell.styles.fillColor = [254, 226, 226]; // Light Red Background for Holidays
                             }
                             
                             if (cellVal === 'A') {
                                 data.cell.styles.textColor = [220, 38, 38]; // Red Text
                                 data.cell.styles.fontStyle = 'bold';
                             } else if (cellVal === 'H') {
                                 data.cell.styles.textColor = [22, 163, 74]; // Green Text
                             }
                        }
                    }
                };

                autoTable(doc, {
                    startY: 42,
                    head: [headRow1],
                    body: bodyData,
                    theme: 'grid',
                    styles: {
                        fontSize: 8,
                        cellPadding: 1,
                        lineWidth: 0.1,
                        lineColor: [0, 0, 0]
                    },
                    headStyles: {
                        fillColor: [243, 244, 246], // Gray-100
                        textColor: [0, 0, 0],
                        fontStyle: 'bold',
                        lineWidth: 0.1,
                        lineColor: [0, 0, 0]
                    },
                    columnStyles: colStyles,
                    didParseCell: didParseCell
                });

                // Footer (Tanda Tangan)
                const finalY = (doc as any).lastAutoTable.finalY || 200;
                
                // Check if page break needed for footer
                if (finalY > 170) {
                    doc.addPage();
                    doc.text(`Sumpiuh, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 220, 20);
                } else {
                    doc.text(`Sumpiuh, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 220, finalY + 15);
                }
                
                // Position depends on page break logic above, simplified here
                const sigY = finalY > 170 ? 25 : finalY + 20;
                
                doc.text("Wali Kelas", 220, sigY);
                doc.text("( ..................................... )", 220, sigY + 25);

                doc.save(`${fileName}.pdf`);
                showToast('PDF berhasil diunduh.', 'success');
            } catch (error) {
                console.error(error);
                showToast('Gagal membuat PDF. Coba lagi.', 'error');
            }
            return;
        }

        // Prepare Data for SheetJS
        // Header Row
        const headers = ["No", "Nama Santri"];
        for (let i = 1; i <= daysInMonth; i++) headers.push(i.toString());
        headers.push("Sakit", "Izin", "Alpha", "Presentase");

        // Data Rows
        const dataRows = santriInRombel.map((s, idx) => {
            const row: (string | number)[] = [idx + 1, s.namaLengkap];
            const stat = attendanceMatrix.stats[s.id] as { H: number; S: number; I: number; A: number };
            
            for (let i = 1; i <= daysInMonth; i++) {
                row.push(attendanceMatrix.matrix[s.id][i] || "");
            }
            
            // Calculate percentage based on recorded days (estimated)
            // Or simple H count. Using visual % logic from UI
            // Simple logic: H / (H+S+I+A) or H / TotalDays? 
            // The UI uses a complex `recordedDaysCount` logic, let's simplify for export to just H count or basic stats
            row.push(stat.S, stat.I, stat.A, stat.H); 
            return row;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
        
        try {
            XLSX.writeFile(wb, `${fileName}.${format}`);
            showToast(`Berhasil export ke ${format.toUpperCase()}`, 'success');
        } catch (error) {
            showToast('Gagal export file.', 'error');
        }
    };

    return (
        <div className="p-4 space-y-6">
            {/* Filter Bar (No Print) */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end no-print">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rombel</label>
                    <select value={rombelId} onChange={e => setRombelId(Number(e.target.value))} className="border rounded p-2 text-sm bg-gray-50 w-48">
                        {settings.rombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bulan</label>
                    <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="border rounded p-2 text-sm bg-gray-50 w-32">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(2024, m - 1).toLocaleDateString('id-ID', { month: 'long' })}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tahun</label>
                    <input type="number" value={tahun} onChange={e => setTahun(Number(e.target.value))} className="border rounded p-2 text-sm bg-gray-50 w-24" />
                </div>
                
                <div className="ml-auto flex gap-2">
                     <div className="relative" ref={exportMenuRef}>
                        <button 
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 flex items-center gap-2 transition-colors"
                        >
                            <span>Export</span>
                            <i className="bi bi-chevron-down"></i>
                        </button>
                        
                        {isExportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200 animate-fade-in-down">
                                <button onClick={() => handleExport('xlsx')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                    <i className="bi bi-file-earmark-spreadsheet text-green-600"></i> Excel (.xlsx)
                                </button>
                                <button onClick={() => handleExport('ods')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                    <i className="bi bi-file-earmark-spreadsheet text-blue-600"></i> ODS (OpenDoc)
                                </button>
                                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                    <i className="bi bi-file-earmark-text text-gray-500"></i> CSV
                                </button>
                                <div className="border-t my-1"></div>
                                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                    <i className="bi bi-file-earmark-pdf text-red-600"></i> Download PDF
                                </button>
                            </div>
                        )}
                     </div>

                     <button onClick={handlePrint} className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 flex items-center gap-2 transition-colors">
                        <i className="bi bi-printer-fill"></i> Cetak Laporan
                    </button>
                </div>
            </div>

            {/* Class Summary Stats */}
            <div className="grid grid-cols-4 gap-4 no-print">
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                    <span className="block text-2xl font-bold text-green-700">{classStats.H}</span>
                    <span className="text-xs text-green-600 uppercase font-bold">Total Hadir</span>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-center">
                    <span className="block text-2xl font-bold text-yellow-700">{classStats.S}</span>
                    <span className="text-xs text-yellow-600 uppercase font-bold">Total Sakit</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                    <span className="block text-2xl font-bold text-blue-700">{classStats.I}</span>
                    <span className="text-xs text-blue-600 uppercase font-bold">Total Izin</span>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                    <span className="block text-2xl font-bold text-red-700">{classStats.A}</span>
                    <span className="text-xs text-red-600 uppercase font-bold">Total Alpha</span>
                </div>
            </div>

            {/* Printable Area */}
            {/* Added container ID for PDF generator and proper structure for html2canvas */}
            <div id="absensi-export-root">
                <div className="printable-content-wrapper">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print-landscape" style={{ minHeight: '210mm' }}>
                        <div className="p-4 hidden print:block">
                             <PrintHeader settings={settings} title={`REKAP ABSENSI KELAS ${selectedRombel?.nama.toUpperCase()}`} />
                             <p className="text-center font-bold uppercase mb-4">
                                PERIODE: {new Date(tahun, bulan - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                             </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700">
                                        <th rowSpan={2} className="border p-2 w-8 text-center sticky left-0 bg-gray-100">No</th>
                                        <th rowSpan={2} className="border p-2 text-left sticky left-8 bg-gray-100" style={{minWidth: '200px'}}>Nama Santri</th>
                                        <th colSpan={daysInMonth} className="border p-1 text-center">Tanggal</th>
                                        <th colSpan={5} className="border p-1 text-center bg-gray-200">Rekapitulasi</th>
                                    </tr>
                                    <tr className="bg-gray-50">
                                        {Array.from({ length: daysInMonth }, (_, i) => {
                                            // Highlight Holidays based on Jenjang Settings
                                            const d = new Date(tahun, bulan - 1, i + 1);
                                            const dayOfWeek = d.getDay();
                                            const isHoliday = holidays.includes(dayOfWeek);
                                            
                                            return (
                                                <th key={i} className={`border p-1 text-center w-6 font-normal text-[10px] ${isHoliday ? 'bg-red-50 text-red-600' : ''}`}>
                                                    {i + 1}
                                                </th>
                                            );
                                        })}
                                        <th className="border p-1 w-8 bg-green-50 text-green-800">H</th>
                                        <th className="border p-1 w-8 bg-yellow-50 text-yellow-800">S</th>
                                        <th className="border p-1 w-8 bg-blue-50 text-blue-800">I</th>
                                        <th className="border p-1 w-8 bg-red-50 text-red-800">A</th>
                                        <th className="border p-1 w-12 bg-gray-100">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {santriInRombel.map((s, idx) => {
                                        const stat = attendanceMatrix.stats[s.id] as { H: number; S: number; I: number; A: number };
                                        const percent = recordedDaysCount > 0 ? Math.round((stat.H / recordedDaysCount) * 100) : 0;
                                        const isLow = percent < 75; // Alert if below 75%
                                        
                                        return (
                                            <tr key={s.id} className="hover:bg-gray-50">
                                                <td className="border p-1 text-center bg-white sticky left-0">{idx + 1}</td>
                                                <td className="border p-1 bg-white sticky left-8 whitespace-nowrap">{s.namaLengkap}</td>
                                                {Array.from({ length: daysInMonth }, (_, i) => {
                                                    const d = new Date(tahun, bulan - 1, i + 1);
                                                    const dayOfWeek = d.getDay();
                                                    const isHoliday = holidays.includes(dayOfWeek);
                                                    
                                                    const status = attendanceMatrix.matrix[s.id][i + 1];
                                                    let color = '';
                                                    
                                                    if (status === 'H') color = 'text-green-600 font-bold';
                                                    else if (status === 'S') color = 'bg-yellow-100 text-yellow-800';
                                                    else if (status === 'I') color = 'bg-blue-100 text-blue-800';
                                                    else if (status === 'A') color = 'bg-red-100 text-red-800';
                                                    
                                                    if (isHoliday && !status) color = 'bg-red-50'; // Highlight Holiday background if no status
                                                    
                                                    return (
                                                        <td key={i} className={`border p-1 text-center ${color}`}>
                                                            {status || ''}
                                                        </td>
                                                    );
                                                })}
                                                <td className="border p-1 text-center font-bold">{stat.H}</td>
                                                <td className="border p-1 text-center">{stat.S}</td>
                                                <td className="border p-1 text-center">{stat.I}</td>
                                                <td className="border p-1 text-center font-bold text-red-600">{stat.A}</td>
                                                <td className={`border p-1 text-center font-bold ${isLow ? 'text-red-600 bg-red-50' : 'text-gray-700'}`}>{percent}%</td>
                                            </tr>
                                        );
                                    })}
                                    {santriInRombel.length === 0 && (
                                        <tr><td colSpan={daysInMonth + 7} className="p-8 text-center text-gray-500">Tidak ada santri di rombel ini.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="hidden print:block mt-8">
                             <ReportFooter />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT: ABSENSI (WRAPPER) ---
export const Absensi: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'input' | 'rekap'>('input');

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Absensi Santri</h1>
            
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto gap-4">
                    <button 
                        onClick={() => setActiveTab('input')} 
                        className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'input' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="bi bi-pencil-square"></i> Input Kehadiran
                    </button>
                    <button 
                        onClick={() => setActiveTab('rekap')} 
                        className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'rekap' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="bi bi-table"></i> Rekap & Laporan Bulanan
                    </button>
                </nav>
            </div>

            {activeTab === 'input' && <AbsensiInput />}
            {activeTab === 'rekap' && <AbsensiRekap />}
        </div>
    );
};

export default Absensi;
