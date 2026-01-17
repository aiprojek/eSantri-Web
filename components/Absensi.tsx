
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { AbsensiRecord } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PrintHeader } from './common/PrintHeader';
import { ReportFooter } from './reports/modules/Common';

// --- SUB-COMPONENT: INPUT ABSENSI ---
const AbsensiInput: React.FC = () => {
    const { settings, showToast, currentUser } = useAppContext();
    const { santriList, absensiList, onSaveAbsensi } = useSantriContext();
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
            <div className="max-w-4xl mx-auto p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                    <div className="bg-teal-600 p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2"><i className="bi bi-pencil-square"></i> Catat Kehadiran</h2>
                            <p className="opacity-90 text-sm mt-1">Pilih kelas dan tanggal untuk mulai mengabsen.</p>
                        </div>
                        <div className="bg-teal-700 px-4 py-2 rounded-lg border border-teal-500 shadow-sm">
                            <label className="block text-xs font-bold text-teal-200 uppercase mb-1">Tanggal Absen</label>
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent text-white font-bold outline-none text-sm w-full cursor-pointer focus:ring-0" />
                        </div>
                    </div>
                    
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. Jenjang</label>
                                <select value={selectedJenjangId} onChange={e => { setSelectedJenjangId(Number(e.target.value)); setSelectedKelasId(0); setSelectedRombelId(0); }} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all">
                                    <option value={0}>-- Pilih Jenjang --</option>
                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. Kelas</label>
                                <select value={selectedKelasId} onChange={e => { setSelectedKelasId(Number(e.target.value)); setSelectedRombelId(0); }} disabled={!selectedJenjangId} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 transition-all">
                                    <option value={0}>-- Pilih Kelas --</option>
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">3. Rombel (Wajib)</label>
                                <select value={selectedRombelId} onChange={e => setSelectedRombelId(Number(e.target.value))} disabled={!selectedKelasId} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100 transition-all">
                                    <option value={0}>-- Pilih Rombel --</option>
                                    {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedRombelId !== 0 && (
                            <div className={`p-4 rounded-lg border flex items-center justify-between gap-4 animate-fade-in ${existingRecords.length > 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${existingRecords.length > 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                        <i className={`bi ${existingRecords.length > 0 ? 'bi-check-circle-fill text-green-600' : 'bi-exclamation-circle-fill text-yellow-600'}`}></i>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{existingRecords.length > 0 ? 'Absensi Sudah Tercatat' : 'Belum Ada Absensi'}</h4>
                                        <p className="text-xs opacity-80">{existingRecords.length > 0 ? `Terakhir oleh: ${existingRecords[0].recordedBy || '...'}` : 'Klik Lanjut untuk mulai mengisi.'}</p>
                                    </div>
                                </div>
                                <button onClick={handleStartInput} className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-lg shadow hover:bg-teal-700 transition-transform active:scale-95 flex items-center gap-2">
                                    Lanjut <i className="bi bi-arrow-right"></i>
                                </button>
                            </div>
                        )}
                        {!selectedRombelId && (
                            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <i className="bi bi-arrow-up-circle text-2xl mb-2 block"></i>
                                Silakan pilih rombel di atas.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- GRID VIEW (INPUT MODE) ---
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] pb-2 bg-gray-50">
            {/* Header Sticky */}
            <div className="bg-white border-b shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-30">
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('selector')} className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors">
                        <i className="bi bi-arrow-left text-lg"></i>
                    </button>
                    <div>
                        <h2 className="font-bold text-gray-800 text-lg leading-tight">{settings.rombel.find(r => r.id === selectedRombelId)?.nama}</h2>
                        <p className="text-xs text-gray-500 font-medium">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} • {targetSantri.length} Santri</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleMarkAllPresent} className="bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                        <i className="bi bi-check-all text-lg"></i> <span className="hidden sm:inline">Semua Hadir</span>
                    </button>
                </div>
            </div>

            {/* Scrollable Grid Content */}
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-screen-2xl mx-auto">
                    {targetSantri.map(santri => {
                        const status = attendanceMap[santri.id];
                        return (
                            <div key={santri.id} className={`bg-white p-4 rounded-xl border-2 transition-all duration-200 ${status === 'A' ? 'border-red-100 shadow-red-50' : status !== 'H' ? 'border-yellow-100 shadow-yellow-50' : 'border-transparent hover:border-gray-200'} shadow-sm hover:shadow-md flex flex-col`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                            {santri.fotoUrl && !santri.fotoUrl.includes('text=Foto') ? (
                                                <img src={santri.fotoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">{santri.namaLengkap.substring(0,2).toUpperCase()}</div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 text-sm leading-tight truncate" title={santri.namaLengkap}>{santri.namaLengkap}</p>
                                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{santri.nis}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(status)}`}>
                                        {status === 'H' ? 'Hadir' : status === 'S' ? 'Sakit' : status === 'I' ? 'Izin' : 'Alpha'}
                                    </div>
                                </div>
                                
                                <div className="mt-auto space-y-3">
                                    <div className="grid grid-cols-4 gap-1 p-1 bg-gray-50 rounded-lg">
                                        {(['H', 'S', 'I', 'A'] as const).map(opt => (
                                            <button 
                                                key={opt} 
                                                onClick={() => handleStatusChange(santri.id, opt)} 
                                                className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                                                    status === opt 
                                                    ? (opt === 'H' ? 'bg-white text-green-600 shadow-sm ring-1 ring-green-200' : opt === 'S' ? 'bg-white text-yellow-600 shadow-sm ring-1 ring-yellow-200' : opt === 'I' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-200' : 'bg-white text-red-600 shadow-sm ring-1 ring-red-200') 
                                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder={status === 'S' ? "Sakit apa?" : status === 'I' ? "Izin kenapa?" : "Keterangan..."}
                                            value={notesMap[santri.id] || ''}
                                            onChange={(e) => handleNoteChange(santri.id, e.target.value)}
                                            className={`w-full text-xs border-b border-gray-200 focus:border-teal-500 outline-none py-1.5 bg-transparent placeholder-gray-400 transition-colors ${status !== 'H' && !notesMap[santri.id] ? 'border-red-200' : ''}`}
                                        />
                                        {status !== 'H' && !notesMap[santri.id] && (
                                            <div className="absolute right-0 top-1.5 text-red-400 text-[10px] pointer-events-none animate-pulse">Wajib isi</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Floating Save Button */}
            <div className="bg-white border-t p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 shrink-0">
                <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                        <i className="bi bi-info-circle"></i>
                        <span>Pastikan keterangan diisi untuk status S, I, atau A.</span>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-200 flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none">
                        {isSaving ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : <i className="bi bi-cloud-upload-fill"></i>} 
                        Simpan Data Absensi
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: REKAP & LAPORAN ---
const AbsensiRekap: React.FC = () => {
    const { settings } = useAppContext();
    const { santriList, absensiList } = useSantriContext();
    
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

    const handleExport = (format: 'xlsx' | 'pdf') => {
        setIsExportMenuOpen(false);
        const fileName = `Rekap_Absensi_${selectedRombel?.nama.replace(/\s+/g, '_')}_${bulan}_${tahun}`;
        const periodeName = new Date(tahun, bulan - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        if (format === 'pdf') {
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
                    colStyles[colIdx] = { cellWidth: 5, halign: 'center' };
                    colIdx++;
                }
                
                // Add Summary Columns to Header
                 headRow1.push({ content: 'S', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [254, 243, 199] } }); // Yellow
                 colStyles[colIdx] = { cellWidth: 8, halign: 'center' };
                 colIdx++;

                 headRow1.push({ content: 'I', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [219, 234, 254] } }); // Blue
                 colStyles[colIdx] = { cellWidth: 8, halign: 'center' };
                 colIdx++;

                 headRow1.push({ content: 'A', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [254, 226, 226] } }); // Red
                 colStyles[colIdx] = { cellWidth: 8, halign: 'center' };
                 colIdx++;

                 headRow1.push({ content: 'H', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [220, 252, 231] } }); // Green
                 colStyles[colIdx] = { cellWidth: 8, halign: 'center' };
                 colIdx++;

                // Body Data
                const bodyData = santriInRombel.map((s, idx) => {
                    const row: any[] = [idx + 1, s.namaLengkap];
                    // Dates
                    for(let i=1; i<=daysInMonth; i++) {
                        row.push(attendanceMatrix.matrix[s.id][i] || '');
                    }
                    // Stats
                    row.push(attendanceMatrix.stats[s.id].S);
                    row.push(attendanceMatrix.stats[s.id].I);
                    row.push(attendanceMatrix.stats[s.id].A);
                    row.push(attendanceMatrix.stats[s.id].H);
                    return row;
                });

                // Generate Table
                autoTable(doc, {
                    startY: 42,
                    head: [headRow1],
                    body: bodyData,
                    columnStyles: colStyles,
                    styles: { fontSize: 8, cellPadding: 1, lineWidth: 0.1, lineColor: [0, 0, 0] },
                    headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
                    theme: 'grid'
                });

                doc.save(`${fileName}.pdf`);

            } catch (error) {
                console.error(error);
                alert("Gagal membuat PDF. Cek konsol.");
            }
        } else if (format === 'xlsx') {
            const wb = XLSX.utils.book_new();
            const wsData: any[][] = [];
            
            // Header
            wsData.push([settings.namaPonpes]);
            wsData.push([`REKAP ABSENSI KELAS ${selectedRombel?.nama}`]);
            wsData.push([`PERIODE: ${periodeName}`]);
            wsData.push([]); // Empty Row

            // Table Header
            const headerRow1 = ['No', 'Nama Santri'];
            for(let i=1; i<=daysInMonth; i++) headerRow1.push(i.toString());
            headerRow1.push('S', 'I', 'A', 'H');
            wsData.push(headerRow1);

            // Table Body
            santriInRombel.forEach((s, idx) => {
                const row = [idx + 1, s.namaLengkap];
                for(let i=1; i<=daysInMonth; i++) row.push(attendanceMatrix.matrix[s.id][i] || '');
                row.push(attendanceMatrix.stats[s.id].S);
                row.push(attendanceMatrix.stats[s.id].I);
                row.push(attendanceMatrix.stats[s.id].A);
                row.push(attendanceMatrix.stats[s.id].H);
                wsData.push(row);
            });

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Adjust col widths
            const wscols = [{wch: 5}, {wch: 30}];
            for(let i=0; i<daysInMonth; i++) wscols.push({wch: 3}); // Date cols
            wscols.push({wch: 5}, {wch: 5}, {wch: 5}, {wch: 5}); // Summary cols
            ws['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, ws, "Absensi");
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md no-print">
                <div className="flex flex-col xl:flex-row justify-between items-end gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Rekap & Laporan Absensi</h2>
                        <p className="text-sm text-gray-500">Lihat statistik kehadiran bulanan per kelas.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                        <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="border rounded-lg p-2 text-sm flex-grow sm:flex-grow-0">
                            {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('id-ID', {month:'long'})}</option>)}
                        </select>
                        <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="border rounded-lg p-2 text-sm flex-grow sm:flex-grow-0">
                            {Array.from({length: 5}, (_, i) => <option key={i} value={now.getFullYear() - 2 + i}>{now.getFullYear() - 2 + i}</option>)}
                        </select>
                        <select value={rombelId} onChange={e => setRombelId(Number(e.target.value))} className="border rounded-lg p-2 text-sm max-w-[200px] flex-grow sm:flex-grow-0">
                            {settings.rombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                        
                        <div className="relative" ref={exportMenuRef}>
                            <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-2">
                                <i className="bi bi-download"></i> Export
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                                    <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                        <i className="bi bi-file-earmark-pdf text-red-500"></i> Download PDF
                                    </button>
                                    <button onClick={() => handleExport('xlsx')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                        <i className="bi bi-file-earmark-spreadsheet text-green-500"></i> Download Excel
                                    </button>
                                    <button onClick={handlePrint} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 border-t">
                                        <i className="bi bi-printer"></i> Cetak Langsung
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                        <div className="text-xs font-bold text-green-600 uppercase">Hadir</div>
                        <div className="text-xl font-bold text-green-800">{classStats.H}</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-center">
                        <div className="text-xs font-bold text-yellow-600 uppercase">Sakit</div>
                        <div className="text-xl font-bold text-yellow-800">{classStats.S}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                        <div className="text-xs font-bold text-blue-600 uppercase">Izin</div>
                        <div className="text-xl font-bold text-blue-800">{classStats.I}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                        <div className="text-xs font-bold text-red-600 uppercase">Alpha</div>
                        <div className="text-xl font-bold text-red-800">{classStats.A}</div>
                    </div>
                </div>

                <div className="overflow-x-auto border rounded-lg bg-white">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-gray-100 text-gray-600">
                            <tr>
                                <th rowSpan={2} className="p-2 border w-8">No</th>
                                <th rowSpan={2} className="p-2 border text-left min-w-[150px] sticky left-0 bg-gray-100 z-10 shadow-sm">Nama Santri</th>
                                <th colSpan={daysInMonth} className="p-1 border">Tanggal</th>
                                <th colSpan={4} className="p-1 border bg-gray-200">Total</th>
                            </tr>
                            <tr>
                                {Array.from({length: daysInMonth}, (_, i) => (
                                    <th key={i} className="p-1 border w-8 font-normal bg-white min-w-[24px]">{i+1}</th>
                                ))}
                                <th className="p-1 border w-8 bg-green-100 text-green-800">H</th>
                                <th className="p-1 border w-8 bg-yellow-100 text-yellow-800">S</th>
                                <th className="p-1 border w-8 bg-blue-100 text-blue-800">I</th>
                                <th className="p-1 border w-8 bg-red-100 text-red-800">A</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {santriInRombel.map((s, idx) => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="p-1 border">{idx+1}</td>
                                    <td className="p-1 border text-left px-2 font-medium sticky left-0 bg-white shadow-sm whitespace-nowrap">{s.namaLengkap}</td>
                                    {Array.from({length: daysInMonth}, (_, i) => {
                                        const status = attendanceMatrix.matrix[s.id][i+1];
                                        let bgClass = "";
                                        if (status === 'H') bgClass = "bg-green-50 text-green-700";
                                        else if (status === 'S') bgClass = "bg-yellow-50 text-yellow-700";
                                        else if (status === 'I') bgClass = "bg-blue-50 text-blue-700";
                                        else if (status === 'A') bgClass = "bg-red-50 text-red-700";
                                        
                                        return <td key={i} className={`p-1 border ${bgClass} text-center`}>{status || ''}</td>;
                                    })}
                                    <td className="p-1 border font-bold bg-green-50">{attendanceMatrix.stats[s.id].H}</td>
                                    <td className="p-1 border font-bold bg-yellow-50">{attendanceMatrix.stats[s.id].S}</td>
                                    <td className="p-1 border font-bold bg-blue-50">{attendanceMatrix.stats[s.id].I}</td>
                                    <td className="p-1 border font-bold bg-red-50">{attendanceMatrix.stats[s.id].A}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hidden Print Area */}
            <div className="hidden print:block">
                 <PrintHeader settings={settings} title={`REKAPITULASI ABSENSI KELAS ${selectedRombel?.nama.toUpperCase()}`} />
                 <p className="text-center text-sm mb-4">PERIODE: {new Date(tahun, bulan-1).toLocaleDateString('id-ID', {month: 'long', year: 'numeric'}).toUpperCase()}</p>
                 <table className="w-full text-xs text-center border-collapse border border-black">
                        <thead>
                            <tr>
                                <th rowSpan={2} className="p-1 border border-black w-8">No</th>
                                <th rowSpan={2} className="p-1 border border-black text-left w-48">Nama Santri</th>
                                <th colSpan={daysInMonth} className="p-1 border border-black">Tanggal</th>
                                <th colSpan={4} className="p-1 border border-black bg-gray-200">Total</th>
                            </tr>
                            <tr>
                                {Array.from({length: daysInMonth}, (_, i) => (
                                    <th key={i} className="p-0 border border-black w-4 font-normal" style={{fontSize: '8px'}}>{i+1}</th>
                                ))}
                                <th className="p-1 border border-black w-6">H</th>
                                <th className="p-1 border border-black w-6">S</th>
                                <th className="p-1 border border-black w-6">I</th>
                                <th className="p-1 border border-black w-6">A</th>
                            </tr>
                        </thead>
                        <tbody>
                            {santriInRombel.map((s, idx) => (
                                <tr key={s.id}>
                                    <td className="p-1 border border-black">{idx+1}</td>
                                    <td className="p-1 border border-black text-left px-2 font-medium">{s.namaLengkap}</td>
                                    {Array.from({length: daysInMonth}, (_, i) => (
                                        <td key={i} className="p-0 border border-black" style={{fontSize: '9px'}}>{attendanceMatrix.matrix[s.id][i+1] || ''}</td>
                                    ))}
                                    <td className="p-1 border border-black">{attendanceMatrix.stats[s.id].H}</td>
                                    <td className="p-1 border border-black">{attendanceMatrix.stats[s.id].S}</td>
                                    <td className="p-1 border border-black">{attendanceMatrix.stats[s.id].I}</td>
                                    <td className="p-1 border border-black">{attendanceMatrix.stats[s.id].A}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <ReportFooter />
            </div>
        </div>
    );
};

const Absensi: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'input' | 'rekap'>('input');
    
    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            <h1 className="text-3xl font-bold text-gray-800 mb-4 shrink-0">Manajemen Absensi</h1>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sticky top-0 z-40 shrink-0">
                <nav className="flex -mb-px">
                    <button 
                        onClick={() => setActiveTab('input')} 
                        className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${activeTab === 'input' ? 'border-teal-500 text-teal-600 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <i className="bi bi-pencil-square text-lg"></i> Input Harian
                    </button>
                    <button 
                        onClick={() => setActiveTab('rekap')} 
                        className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${activeTab === 'rekap' ? 'border-teal-500 text-teal-600 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <i className="bi bi-table text-lg"></i> Rekap & Laporan
                    </button>
                </nav>
            </div>

            <div className="flex-grow min-h-0">
                {activeTab === 'input' ? <AbsensiInput /> : <AbsensiRekap />}
            </div>
        </div>
    );
};

export default Absensi;
