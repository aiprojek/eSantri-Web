
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { JurnalMengajarRecord } from '../../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { MobileFilterDrawer } from '../common/MobileFilterDrawer';
import { loadJsPdf, loadJsPdfAutoTable, loadXLSX } from '../../utils/lazyClientLibs';
import { buildStandardExportFileName } from '../../utils/exportFileName';

export const TabJurnalMengajar: React.FC = () => {
    const { settings, showConfirmation, showToast, currentUser } = useAppContext();
    const { jurnalMengajarList, onDeleteJurnalMengajar } = useSantriContext();
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const monthStartStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const [filterDateFrom, setFilterDateFrom] = useState<string>(monthStartStr);
    const [filterDateTo, setFilterDateTo] = useState<string>(todayStr);
    const [filterJenjangId, setFilterJenjangId] = useState<number>(0);
    const [filterKelasId, setFilterKelasId] = useState<number>(0);
    const [filterRombelId, setFilterRombelId] = useState<number>(0);
    const [filterGuruId, setFilterGuruId] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const canDelete = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';
    const availableKelas = useMemo(() => (
        filterJenjangId ? settings.kelas.filter(k => k.jenjangId === filterJenjangId) : settings.kelas
    ), [filterJenjangId, settings.kelas]);
    const availableRombel = useMemo(() => (
        filterKelasId ? settings.rombel.filter(r => r.kelasId === filterKelasId) : settings.rombel
    ), [filterKelasId, settings.rombel]);

    const filteredJournals = useMemo(() => {
        return jurnalMengajarList.filter(j => {
            const matchDateFrom = filterDateFrom ? j.tanggal >= filterDateFrom : true;
            const matchDateTo = filterDateTo ? j.tanggal <= filterDateTo : true;
            const rombel = settings.rombel.find(r => r.id === j.rombelId);
            const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
            const matchJenjang = filterJenjangId ? kelas?.jenjangId === filterJenjangId : true;
            const matchKelas = filterKelasId ? rombel?.kelasId === filterKelasId : true;
            const matchRombel = filterRombelId ? j.rombelId === filterRombelId : true;
            const matchGuru = filterGuruId ? j.guruId === filterGuruId : true;
            const matchSearch = searchTerm ? 
                j.kompetensiMateri.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (j.catatanKejadian?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
                : true;
            return matchDateFrom && matchDateTo && matchJenjang && matchKelas && matchRombel && matchGuru && matchSearch;
        }).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (a.jamPelajaranIds?.[0] ?? 0) - (b.jamPelajaranIds?.[0] ?? 0));
    }, [jurnalMengajarList, filterDateFrom, filterDateTo, filterJenjangId, filterKelasId, filterRombelId, filterGuruId, searchTerm, settings.rombel, settings.kelas]);

    const handleDelete = (record: JurnalMengajarRecord) => {
        if (!canDelete) return;
        showConfirmation(
            'Hapus Jurnal Mengajar',
            'Apakah Anda yakin ingin menghapus catatan jurnal mengajar ini?',
            async () => {
                try {
                    await onDeleteJurnalMengajar(record.id);
                    showToast('Jurnal mengajar berhasil dihapus.', 'success');
                } catch (error) {
                    showToast('Gagal menghapus jurnal mengajar.', 'error');
                }
            }
        );
    };

    const getGuruName = (id: number) => settings.tenagaPengajar.find(t => t.id === id)?.nama ?? 'Tidak Diketahui';
    const getMapelName = (id: number) => settings.mataPelajaran.find(m => m.id === id)?.nama ?? 'Tidak Diketahui';
    const getRombelName = (id: number) => settings.rombel.find(r => r.id === id)?.nama ?? 'Tidak Diketahui';
    const getSesiEkstraText = (record: JurnalMengajarRecord) =>
        record.sesiEkstra?.map(s => {
            const base = `${s.kegiatan || 'Ekstra'} (${s.waktuMulai || '--:--'}-${s.waktuSelesai || '--:--'})`;
            return s.materi ? `${base} - Materi: ${s.materi}` : base;
        }).join(' | ') || '';
    const getKelasName = (rombelId: number) => {
        const rombel = settings.rombel.find(r => r.id === rombelId);
        return settings.kelas.find(k => k.id === rombel?.kelasId)?.nama ?? '-';
    };
    const getJenjangName = (rombelId: number) => {
        const rombel = settings.rombel.find(r => r.id === rombelId);
        const kelas = settings.kelas.find(k => k.id === rombel?.kelasId);
        return settings.jenjang.find(j => j.id === kelas?.jenjangId)?.nama ?? '-';
    };

    const selectedJenjangLabel = filterJenjangId ? (settings.jenjang.find(j => j.id === filterJenjangId)?.nama || '-') : 'Semua Marhalah';
    const selectedKelasLabel = filterKelasId ? (settings.kelas.find(k => k.id === filterKelasId)?.nama || '-') : 'Semua Kelas';
    const selectedRombelLabel = filterRombelId ? getRombelName(filterRombelId) : 'Semua Rombel';
    const reportTitle = `LAPORAN LOG JURNAL MENGAJAR - ${selectedJenjangLabel} / ${selectedKelasLabel} / ${selectedRombelLabel}`;
    const periodLabel = `${filterDateFrom || '-'} s.d. ${filterDateTo || '-'}`;

    const handlePrint = () => {
        const rowsHtml = filteredJournals.map((r, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${r.tanggal}</td>
                <td>${getJenjangName(r.rombelId)}</td>
                <td>${getKelasName(r.rombelId)}</td>
                <td>${getRombelName(r.rombelId)}</td>
                <td>${getMapelName(r.mataPelajaranId)}</td>
                <td>${getGuruName(r.guruId)}</td>
                <td>${(r.jamPelajaranIds?.join(', ') || '-')}</td>
                <td>${(getSesiEkstraText(r) || '-')}</td>
                <td>${(r.kompetensiMateri || '-')}</td>
                <td>${(r.catatanKejadian || '-')}</td>
            </tr>
        `).join('');

        const popup = window.open('', '_blank', 'width=1200,height=800');
        if (!popup) return;
        popup.document.write(`
            <html>
                <head>
                    <title>${reportTitle}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
                        .kop-title { text-align:center; font-size:24px; font-weight:700; margin-bottom:4px; }
                        .kop-address { text-align:center; font-size:13px; margin-bottom:10px; }
                        .line { border-top:1px solid #333; margin: 8px 0 14px; }
                        .report-title { text-align:center; font-size:18px; font-weight:700; margin-bottom:6px; }
                        .meta { text-align:center; font-size:12px; margin-bottom:14px; }
                        table { width:100%; border-collapse:collapse; font-size:11px; }
                        th, td { border:1px solid #9ca3af; padding:6px; vertical-align:top; }
                        th { background:#f3f4f6; text-align:left; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <div class="kop-title">${settings.namaPonpes}</div>
                    <div class="kop-address">${settings.alamat}</div>
                    <div class="line"></div>
                    <div class="report-title">${reportTitle}</div>
                    <div class="meta">Periode: ${periodLabel}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>No</th><th>Tanggal</th><th>Marhalah</th><th>Kelas</th><th>Rombel</th>
                                <th>Mapel</th><th>Guru</th><th>Jam</th><th>Sesi Ekstra</th><th>Materi</th><th>Catatan</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml || '<tr><td colspan="11">Tidak ada data.</td></tr>'}</tbody>
                    </table>
                    <div style="margin-top:10px; padding-top:6px; border-top:1px solid #d1d5db; font-size:11px; color:#4b5563; text-align:right;">
                        dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id
                    </div>
                </body>
            </html>
        `);
        popup.document.close();
        popup.focus();
        popup.print();
        popup.close();
    };

    const handleExportXlsx = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const XLSX = await loadXLSX();
            const wsData: any[][] = [];
            wsData.push(['LAPORAN LOG JURNAL MENGAJAR']);
            wsData.push([`Periode: ${periodLabel}`]);
            wsData.push([]);
            wsData.push(['No', 'Tanggal', 'Marhalah', 'Kelas', 'Rombel', 'Mapel', 'Guru', 'Jam/Sesi', 'Sesi Ekstra', 'Materi', 'Catatan']);
            filteredJournals.forEach((r, idx) => {
                wsData.push([
                    idx + 1,
                    r.tanggal,
                    getJenjangName(r.rombelId),
                    getKelasName(r.rombelId),
                    getRombelName(r.rombelId),
                    getMapelName(r.mataPelajaranId),
                    getGuruName(r.guruId),
                    r.jamPelajaranIds?.join(', ') || '',
                    getSesiEkstraText(r),
                    r.kompetensiMateri,
                    r.catatanKejadian || '',
                ]);
            });
            wsData.push([]);
            wsData.push(['dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id']);
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 28 }, { wch: 36 }, { wch: 28 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Jurnal');
            XLSX.writeFile(wb, `${buildStandardExportFileName('log-jurnal-mengajar', [selectedJenjangLabel, selectedKelasLabel, selectedRombelLabel, filterDateFrom || 'awal', filterDateTo || 'akhir'])}.xlsx`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPdf = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const [{ jsPDF }, autoTableModule] = await Promise.all([loadJsPdf(), loadJsPdfAutoTable()]);
            const autoTable = autoTableModule.default;
            const doc = new jsPDF('l', 'mm', 'a4');
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(reportTitle, 148.5, 14, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Periode: ${periodLabel}`, 148.5, 19, { align: 'center' });
            autoTable(doc, {
                startY: 24,
                head: [['No', 'Tanggal', 'Marhalah', 'Kelas', 'Rombel', 'Mapel', 'Guru', 'Jam', 'Sesi Ekstra', 'Materi', 'Catatan']],
                body: filteredJournals.map((r, idx) => [
                    idx + 1,
                    r.tanggal,
                    getJenjangName(r.rombelId),
                    getKelasName(r.rombelId),
                    getRombelName(r.rombelId),
                    getMapelName(r.mataPelajaranId),
                    getGuruName(r.guruId),
                    r.jamPelajaranIds?.join(', ') || '',
                    getSesiEkstraText(r),
                    r.kompetensiMateri,
                    r.catatanKejadian || '',
                ]),
                styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
                theme: 'grid',
            });
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setDrawColor(170, 170, 170);
            doc.setLineWidth(0.15);
            doc.line(14, pageHeight - 9, 283, pageHeight - 9);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, pageHeight - 5);
            doc.text('dibuat dengan eSantri Web by AI Projek | aiprojek01.my.id', 283, pageHeight - 5, { align: 'right' });
            doc.save(`${buildStandardExportFileName('log-jurnal-mengajar', [selectedJenjangLabel, selectedKelasLabel, selectedRombelLabel, filterDateFrom || 'awal', filterDateTo || 'akhir'])}.pdf`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-teal-800 flex items-center gap-2">
                        <i className="bi bi-journal-text"></i> Monitoring Jurnal Mengajar
                    </h2>
                    <p className="text-sm text-teal-600">Lihat dan awasi kegiatan belajar mengajar harian.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                {/* Mobile Filter Trigger */}
                <div className="md:hidden">
                    <button 
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm shadow-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter</span>
                    </button>
                    
                    <div className="mt-3 relative">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            placeholder="Cari materi atau kejadian..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                </div>

                {/* Desktop Filter View */}
                <div className="hidden md:grid md:grid-cols-6 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tanggal Dari</label>
                        <input 
                            type="date" 
                            value={filterDateFrom} 
                            onChange={e => setFilterDateFrom(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tanggal Sampai</label>
                        <input 
                            type="date" 
                            value={filterDateTo} 
                            onChange={e => setFilterDateTo(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Marhalah</label>
                        <select 
                            value={filterJenjangId}
                            onChange={e => {
                                setFilterJenjangId(Number(e.target.value));
                                setFilterKelasId(0);
                                setFilterRombelId(0);
                            }}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        >
                            <option value={0}>Semua Marhalah</option>
                            {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Kelas</label>
                        <select 
                            value={filterKelasId}
                            onChange={e => { setFilterKelasId(Number(e.target.value)); setFilterRombelId(0); }}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        >
                            <option value={0}>Semua Kelas</option>
                            {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Rombel</label>
                        <select 
                            value={filterRombelId} 
                            onChange={e => setFilterRombelId(Number(e.target.value))}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        >
                            <option value={0}>Semua Rombel</option>
                            {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-widest pl-1">Tenaga Pengajar</label>
                        <select 
                            value={filterGuruId} 
                            onChange={e => setFilterGuruId(Number(e.target.value))}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-bold"
                        >
                            <option value={0}>Semua Guru</option>
                            {settings.tenagaPengajar.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-teal-600 uppercase mb-1.5 tracking-widest pl-1">Cari Kompetensi / Materi</label>
                        <div className="relative">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input 
                                type="text" 
                                placeholder="Cari materi..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-teal-50/20 border-2 border-teal-100/50 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={handlePrint} className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                        <i className="bi bi-printer mr-2"></i>Cetak
                    </button>
                    <button onClick={handleExportPdf} disabled={isExporting} className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50">
                        <i className="bi bi-file-earmark-pdf mr-2"></i>Export PDF
                    </button>
                    <button onClick={handleExportXlsx} disabled={isExporting} className="px-3 py-2 text-sm rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50">
                        <i className="bi bi-file-earmark-spreadsheet mr-2"></i>Export Excel
                    </button>
                    <span className="px-3 py-2 text-xs rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                        Preview langsung terlihat di tabel ini
                    </span>
                </div>
            </div>

            <MobileFilterDrawer 
                isOpen={isFilterDrawerOpen} 
                onClose={() => setIsFilterDrawerOpen(false)}
                title="Filter Jurnal Mengajar"
            >
                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                        <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">Tanggal Dari</label>
                        <input 
                            type="date" 
                            value={filterDateFrom} 
                            onChange={e => setFilterDateFrom(e.target.value)}
                            className="w-full border-2 border-white rounded-2xl p-4 text-lg font-black bg-white shadow-xl shadow-gray-900/5 focus:border-teal-500 outline-none"
                        />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                        <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">Tanggal Sampai</label>
                        <input 
                            type="date" 
                            value={filterDateTo} 
                            onChange={e => setFilterDateTo(e.target.value)}
                            className="w-full border-2 border-white rounded-2xl p-4 text-lg font-black bg-white shadow-xl shadow-gray-900/5 focus:border-teal-500 outline-none"
                        />
                    </div>

                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Marhalah</label>
                            <select 
                                value={filterJenjangId} 
                                onChange={e => { setFilterJenjangId(Number(e.target.value)); setFilterKelasId(0); setFilterRombelId(0); }}
                                className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none"
                            >
                                <option value={0}>Semua Marhalah</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Kelas</label>
                            <select 
                                value={filterKelasId} 
                                onChange={e => { setFilterKelasId(Number(e.target.value)); setFilterRombelId(0); }}
                                className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none"
                            >
                                <option value={0}>Semua Kelas</option>
                                {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Rombongan Belajar</label>
                            <select 
                                value={filterRombelId} 
                                onChange={e => setFilterRombelId(Number(e.target.value))}
                                className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none"
                            >
                                <option value={0}>Semua Rombel</option>
                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest ml-1">Pilih Tenaga Pengajar</label>
                            <select 
                                value={filterGuruId} 
                                onChange={e => setFilterGuruId(Number(e.target.value))}
                                className="w-full border-2 border-white rounded-2xl p-4 text-base font-bold shadow-sm focus:border-teal-500 outline-none"
                            >
                                <option value={0}>Semua Guru</option>
                                {settings.tenagaPengajar.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-900 rounded-[2rem] text-center">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Ditemukan</div>
                        <div className="text-3xl font-black text-white">{filteredJournals.length} <span className="text-sm text-gray-400 font-bold uppercase tracking-widest ml-1">Records</span></div>
                    </div>
                </div>
            </MobileFilterDrawer>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase w-32">Waktu / Rombel</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Mata Pelajaran & Guru</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kompetensi / Materi</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kejadian / Catatan</th>
                                {canDelete && <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase w-16 text-center">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredJournals.length > 0 ? filteredJournals.map(record => (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 align-top">
                                        <div className="text-sm font-bold text-gray-900">{format(new Date(record.tanggal), 'dd MMM yyyy', { locale: id })}</div>
                                        <div className="text-[10px] text-teal-600 font-bold uppercase mt-1">
                                            {getJenjangName(record.rombelId)} / {getKelasName(record.rombelId)} / {getRombelName(record.rombelId)}
                                        </div>
                                        <div className="flex gap-1 mt-1">
                                            {record.jamPelajaranIds?.map(jam => (
                                                <span key={jam} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded border border-gray-200">Jam {jam}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                        <div className="text-sm font-bold text-gray-800">{getMapelName(record.mataPelajaranId)}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                            <i className="bi bi-person-circle"></i> {getGuruName(record.guruId)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{record.kompetensiMateri}</div>
                                        {record.sesiEkstra && record.sesiEkstra.length > 0 && (
                                            <div className="mt-2 rounded-md border border-indigo-100 bg-indigo-50 p-2 text-[11px] text-indigo-800">
                                                <div className="font-bold uppercase tracking-wide mb-1">Sesi Ekstra</div>
                                                {record.sesiEkstra.map((s, idx) => (
                                                    <div key={`${record.id}-extra-log-${idx}`}>
                                                        {s.kegiatan || 'Ekstra'} ({s.waktuMulai || '--:--'} - {s.waktuSelesai || '--:--'})
                                                        {s.materi ? ` • Materi: ${s.materi}` : ''}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 align-top">
                                        {record.catatanKejadian ? (
                                            <div className="text-xs text-gray-600 italic bg-yellow-50 p-2 rounded border border-yellow-100">
                                                {record.catatanKejadian}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">Tidak ada catatan.</span>
                                        )}
                                    </td>
                                    {canDelete && (
                                        <td className="px-4 py-4 align-top text-center">
                                            <button 
                                                onClick={() => handleDelete(record)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus Jurnal"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={canDelete ? 5 : 4} className="px-4 py-12 text-center text-gray-400 italic">
                                        <i className="bi bi-journal-x text-4xl mb-2 block opacity-20"></i>
                                        Tidak ada catatan jurnal mengajar ditemukan untuk filter tersebut.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-4">
                <i className="bi bi-lightbulb text-blue-500 text-xl"></i>
                <div className="text-sm text-blue-700">
                    <p className="font-bold mb-1">Tips Monitoring:</p>
                    <p>Gunakan Jurnal Mengajar untuk memantau progres kurikulum secara real-time. Anda juga dapat mendiskusikan catatan kejadian khusus dengan guru terkait melalui menu Pesan atau saat evaluasi mingguan.</p>
                </div>
            </div>
        </div>
    );
};
