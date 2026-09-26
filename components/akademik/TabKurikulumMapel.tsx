import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { TabMataPelajaran } from '../datamaster/TabMataPelajaran';
import { TabPlottingPengampu } from './TabPlottingPengampu';
import { MataPelajaran, PondokSettings } from '../../types';
import {
    runMapelAudit,
    executeMergeMapelDuplicates,
    executeAutoEnrichMetadata,
    DuplicateGroup,
    CrossJenjangGroup,
} from '../../utils/mapelAuditUtils';

type AuditSubTab = 'actions' | 'duplicates' | 'cross_jenjang' | 'missing_meta';

export const TabKurikulumMapel: React.FC = () => {
    const { settings, onSaveSettings, currentUser, showToast, showConfirmation } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    // State for tools
    const [showAuditPanel, setShowAuditPanel] = useState<boolean>(false);
    const [auditSubTab, setAuditSubTab] = useState<AuditSubTab>('actions');
    const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);
    const [sourceJenjangId, setSourceJenjangId] = useState<number>(settings.jenjang[0]?.id || 0);
    const [targetJenjangId, setTargetJenjangId] = useState<number>(settings.jenjang[1]?.id || 0);
    const [cloneMode, setCloneMode] = useState<'append' | 'replace'>('append');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [subTab, setSubTab] = useState<'katalog' | 'plotting'>('katalog');

    const handleInputChange = (key: any, value: any) => {
        onSaveSettings({
            ...settings,
            [key]: value,
        });
    };

    // Jenjang Map
    const jenjangMap = useMemo(() => new Map(settings.jenjang.map(j => [j.id, j.nama])), [settings.jenjang]);

    // Rumpun distribution statistics
    const rumpunStats = useMemo(() => {
        const counts: Record<string, number> = {
            'Diniyah': 0,
            'Tahfizh': 0,
            'Bahasa': 0,
            'Umum': 0,
            'Mulok': 0,
            'Lainnya': 0,
        };

        settings.mataPelajaran.forEach(m => {
            const r = m.rumpun || 'Umum';
            if (counts[r] !== undefined) {
                counts[r]++;
            } else {
                counts['Lainnya']++;
            }
        });

        return counts;
    }, [settings.mataPelajaran]);

    // ==============================================================
    // AUDIT REDUNDANSI MATA PELAJARAN (via mapelAuditUtils)
    // ==============================================================
    const auditResult = useMemo(() => {
        return runMapelAudit(settings.mataPelajaran, settings.jenjang);
    }, [settings.mataPelajaran, settings.jenjang]);

    // 1. Eksekusi Penggabungan & Konsolidasi Duplikat Murni
    const handleConsolidatePureDuplicates = async (specificGroup?: DuplicateGroup) => {
        const groupsToMerge = specificGroup ? [specificGroup] : auditResult.pureDuplicates;
        if (groupsToMerge.length === 0) {
            showToast('Tidak ada mata pelajaran duplikat di jenjang yang sama.', 'info');
            return;
        }

        const totalDuplicates = groupsToMerge.reduce((acc, g) => acc + (g.items.length - 1), 0);

        showConfirmation(
            'Terapkan Konsolidasi & Gabungkan Duplikat?',
            `Sistem akan menggabungkan ${totalDuplicates} mata pelajaran kembar menjadi satu ID resmi. Relasi referensi di Jadwal Pelajaran (KBM), Jadwal Ujian, Jurnal Mengajar, Nilai Rapor Santri, dan Kompetensi Guru akan dimigrasikan secara utuh tanpa kehilangan data riwayat. Lanjutkan?`,
            async () => {
                setIsProcessing(true);
                try {
                    const result = await executeMergeMapelDuplicates(
                        groupsToMerge,
                        settings,
                        currentUser?.nama || currentUser?.username || 'Admin'
                    );

                    onSaveSettings(result.updatedSettings);

                    showToast(
                        `Konsolidasi berhasil! ${result.mergedMapelCount} mapel kembar disatukan. Termigrasi: ${result.jadwalPelajaranCount} Jadwal KBM, ${result.jadwalUjianCount} Ujian, ${result.jurnalMengajarCount} Jurnal, ${result.raporRecordsCount} Rapor Santri, dan ${result.teachersUpdatedCount} Guru.`,
                        'success'
                    );
                } catch (err) {
                    console.error('Error consolidating mapel:', err);
                    showToast('Terjadi kesalahan saat mengonsolidasi mata pelajaran.', 'error');
                } finally {
                    setIsProcessing(false);
                }
            },
            { confirmColor: 'teal' }
        );
    };

    // 2. Eksekusi Standarisasi Metadata Otomatis (Rumpun, KKM, Kode Mapel)
    const handleAutoEnrichMeta = () => {
        if (auditResult.missingMetaCount === 0) {
            showToast('Semua mata pelajaran sudah memiliki metadata Rumpun dan KKM yang lengkap.', 'info');
            return;
        }

        showConfirmation(
            'Standarisasi Metadata Otomatis?',
            `Ditemukan ${auditResult.missingMetaCount} mata pelajaran dengan Rumpun atau KKM kosong. Sistem akan melengkapi otomatis: KKM default (70), Alokasi Jam (2 JP/pekan), Kode Mapel, dan Klasifikasi Rumpun cerdas (Diniyah/Tahfizh/Bahasa/Umum/Mulok). Lanjutkan?`,
            () => {
                const { updatedList, enrichedCount } = executeAutoEnrichMetadata(
                    settings.mataPelajaran,
                    70,
                    2
                );

                handleInputChange('mataPelajaran', updatedList);
                showToast(`Berhasil menstandarisasi metadata untuk ${enrichedCount} mata pelajaran.`, 'success');
            },
            { confirmColor: 'teal' }
        );
    };

    // 3. Salin Kurikulum Antar-Jenjang (Kloning Massal)
    const handleCloneCurriculum = () => {
        if (!sourceJenjangId || !targetJenjangId) {
            showToast('Pilih jenjang sumber dan jenjang tujuan.', 'error');
            return;
        }
        if (sourceJenjangId === targetJenjangId) {
            showToast('Jenjang sumber dan jenjang tujuan tidak boleh sama.', 'error');
            return;
        }

        const sourceMapels = settings.mataPelajaran.filter(m => m.jenjangId === sourceJenjangId);
        if (sourceMapels.length === 0) {
            showToast('Jenjang sumber tidak memiliki mata pelajaran.', 'error');
            return;
        }

        const sourceJenjangName = jenjangMap.get(sourceJenjangId) || 'Sumber';
        const targetJenjangName = jenjangMap.get(targetJenjangId) || 'Tujuan';

        showConfirmation(
            `Kloning Kurikulum ke ${targetJenjangName}?`,
            `Sistem akan menyalin ${sourceMapels.length} mata pelajaran dari "${sourceJenjangName}" ke "${targetJenjangName}" (${cloneMode === 'replace' ? 'Menimpa data mapel lama di tujuan' : 'Menambahkan ke daftar tujuan'}). Lanjutkan?`,
            () => {
                let currentList = [...settings.mataPelajaran];
                if (cloneMode === 'replace') {
                    currentList = currentList.filter(m => m.jenjangId !== targetJenjangId);
                }

                let nextId = currentList.length > 0 ? Math.max(...currentList.map(m => m.id)) + 1 : 1;
                const clonedItems: MataPelajaran[] = sourceMapels.map(src => ({
                    ...src,
                    id: nextId++,
                    jenjangId: targetJenjangId,
                }));

                const finalResult = [...currentList, ...clonedItems];
                handleInputChange('mataPelajaran', finalResult);
                setIsCloneModalOpen(false);
                showToast(`Berhasil mengkloning ${clonedItems.length} mata pelajaran ke ${targetJenjangName}.`, 'success');
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Rumpun Kurikulum Overview Banner */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <i className="bi bi-collection-fill text-teal-600"></i>
                            Rumpun Kurikulum & Struktur Pelajaran
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Total {settings.mataPelajaran.length} Mata Pelajaran terdaftar di seluruh marhalah pondok pesantren.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setShowAuditPanel(prev => !prev)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 shadow-2xs ${
                                auditResult.pureDuplicatesCount > 0
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                    : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                            }`}
                        >
                            <i className="bi bi-shield-check"></i>
                            <span>Audit & Solusi Redundansi</span>
                            {auditResult.pureDuplicatesCount > 0 && (
                                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                    {auditResult.pureDuplicatesCount} Duplikat
                                </span>
                            )}
                        </button>

                        {canWrite && (
                            <button
                                type="button"
                                onClick={() => setIsCloneModalOpen(true)}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                            >
                                <i className="bi bi-copy"></i>
                                <span>Salin Kurikulum Antar-Jenjang</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                    <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-bold text-amber-800 uppercase">Diniyah / Kitab</div>
                            <div className="text-lg font-black text-amber-900 mt-0.5">{rumpunStats['Diniyah']} <span className="text-xs font-normal">Mapel</span></div>
                        </div>
                        <i className="bi bi-book-half text-xl text-amber-500"></i>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-bold text-emerald-800 uppercase">Tahfizh & Tajwid</div>
                            <div className="text-lg font-black text-emerald-900 mt-0.5">{rumpunStats['Tahfizh']} <span className="text-xs font-normal">Mapel</span></div>
                        </div>
                        <i className="bi bi-bookmark-star-fill text-xl text-emerald-500"></i>
                    </div>

                    <div className="p-2.5 rounded-lg bg-teal-50/80 border border-teal-200 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-bold text-teal-800 uppercase">Bahasa (Arab/Ing)</div>
                            <div className="text-lg font-black text-teal-900 mt-0.5">{rumpunStats['Bahasa']} <span className="text-xs font-normal">Mapel</span></div>
                        </div>
                        <i className="bi bi-translate text-xl text-teal-500"></i>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-bold text-blue-800 uppercase">Umum / Nasional</div>
                            <div className="text-lg font-black text-blue-900 mt-0.5">{rumpunStats['Umum']} <span className="text-xs font-normal">Mapel</span></div>
                        </div>
                        <i className="bi bi-mortarboard-fill text-xl text-blue-500"></i>
                    </div>

                    <div className="p-2.5 rounded-lg bg-purple-50/80 border border-purple-200 flex items-center justify-between col-span-2 sm:col-span-1">
                        <div>
                            <div className="text-[10px] font-bold text-purple-800 uppercase">Mulok & Lainnya</div>
                            <div className="text-lg font-black text-purple-900 mt-0.5">{rumpunStats['Mulok'] + rumpunStats['Lainnya']} <span className="text-xs font-normal">Mapel</span></div>
                        </div>
                        <i className="bi bi-stars text-xl text-purple-500"></i>
                    </div>
                </div>
            </div>

            {/* AUDIT & SARAN REDUNDANSI ACCORDION / CARD (EXPANDABLE) */}
            {showAuditPanel && (
                <div className="bg-white rounded-xl border border-teal-300 shadow-md overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 text-xl border border-white/10">
                                <i className="bi bi-shield-check"></i>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold flex items-center gap-2">
                                    <span>Pusat Pemeriksaan &amp; Konsolidasi Mapel</span>
                                </h4>
                                <p className="text-[11px] text-teal-200">
                                    Pemeriksaan mata pelajaran ganda, penyelarasan kurikulum, dan pembersihan data KBM.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAuditPanel(false)}
                                className="text-teal-200 hover:text-white px-2 py-1 rounded text-xs"
                            >
                                <i className="bi bi-x-lg mr-1"></i>
                                <span>Tutup Panel</span>
                            </button>
                        </div>
                    </div>

                    {/* Navigation Sub-Tabs */}
                    <div className="flex border-b bg-gray-50/80 px-4 overflow-x-auto text-xs">
                        <button
                            type="button"
                            onClick={() => setAuditSubTab('actions')}
                            className={`py-3 px-3.5 font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                auditSubTab === 'actions'
                                    ? 'border-teal-600 text-teal-800 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-teal-700'
                            }`}
                        >
                            <i className="bi bi-lightning-charge-fill text-teal-600"></i>
                            <span>Ringkasan &amp; Tindakan Solutif</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setAuditSubTab('duplicates')}
                            className={`py-3 px-3.5 font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                auditSubTab === 'duplicates'
                                    ? 'border-teal-600 text-teal-800 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-teal-700'
                            }`}
                        >
                            <i className="bi bi-exclamation-triangle-fill text-red-500"></i>
                            <span>Duplikat Kembar Jenjang</span>
                            {auditResult.pureDuplicatesCount > 0 && (
                                <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                    {auditResult.pureDuplicatesCount}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setAuditSubTab('cross_jenjang')}
                            className={`py-3 px-3.5 font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                auditSubTab === 'cross_jenjang'
                                    ? 'border-teal-600 text-teal-800 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-teal-700'
                            }`}
                        >
                            <i className="bi bi-layers-fill text-sky-600"></i>
                            <span>Peta Lintas-Jenjang</span>
                            <span className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                {auditResult.crossJenjangGroups.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setAuditSubTab('missing_meta')}
                            className={`py-3 px-3.5 font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                auditSubTab === 'missing_meta'
                                    ? 'border-teal-600 text-teal-800 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-teal-700'
                            }`}
                        >
                            <i className="bi bi-file-earmark-check-fill text-amber-500"></i>
                            <span>Standarisasi Metadata</span>
                            {auditResult.missingMetaCount > 0 && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                    {auditResult.missingMetaCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Sub-Tab Content */}
                    <div className="p-4 space-y-4 text-xs">
                        {/* TAB 1: SUMMARY & QUICK ACTIONS */}
                        {auditSubTab === 'actions' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                    {/* Card 1: Pure Duplicates */}
                                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                                        auditResult.pureDuplicatesCount > 0
                                            ? 'bg-red-50/70 border-red-200 text-red-950'
                                            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                    }`}>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wide">
                                                    Duplikat di Jenjang Sama
                                                </span>
                                                <span className={`text-base font-black px-2 py-0.5 rounded-full ${
                                                    auditResult.pureDuplicatesCount > 0
                                                        ? 'bg-red-200 text-red-900'
                                                        : 'bg-emerald-200 text-emerald-900'
                                                }`}>
                                                    {auditResult.pureDuplicatesCount}
                                                </span>
                                            </div>
                                            <p className="text-[11px] mt-2 text-gray-600 leading-relaxed">
                                                {auditResult.pureDuplicatesCount > 0
                                                    ? `Ditemukan ${auditResult.pureDuplicatesCount} mata pelajaran kembar dengan nama serupa di satu jenjang yang memecah jadwal dan jurnal mengajar.`
                                                    : 'Basis data bersih! Tidak ada mata pelajaran duplikat di jenjang yang sama.'}
                                            </p>
                                        </div>

                                        {auditResult.pureDuplicatesCount > 0 && canWrite && (
                                            <button
                                                type="button"
                                                disabled={isProcessing}
                                                onClick={() => handleConsolidatePureDuplicates()}
                                                className="mt-3.5 w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                                            >
                                                <i className="bi bi-intersect"></i>
                                                <span>{isProcessing ? 'Memproses...' : 'Gabungkan & Konsolidasi Otomatis'}</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Card 2: Missing Metadata */}
                                    <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                                        auditResult.missingMetaCount > 0
                                            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                    }`}>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wide">
                                                    Standarisasi Metadata
                                                </span>
                                                <span className={`text-base font-black px-2 py-0.5 rounded-full ${
                                                    auditResult.missingMetaCount > 0
                                                        ? 'bg-amber-200 text-amber-900'
                                                        : 'bg-emerald-200 text-emerald-900'
                                                }`}>
                                                    {auditResult.missingMetaCount}
                                                </span>
                                            </div>
                                            <p className="text-[11px] mt-2 text-gray-600 leading-relaxed">
                                                {auditResult.missingMetaCount > 0
                                                    ? `${auditResult.missingMetaCount} mata pelajaran belum memiliki klasifikasi Rumpun atau nilai KKM standar.`
                                                    : 'Lengkap! Seluruh mata pelajaran telah memiliki Rumpun dan KKM standar.'}
                                            </p>
                                        </div>

                                        {auditResult.missingMetaCount > 0 && canWrite && (
                                            <button
                                                type="button"
                                                onClick={handleAutoEnrichMeta}
                                                className="mt-3.5 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                                            >
                                                <i className="bi bi-magic"></i>
                                                <span>Standarisasi Rumpun &amp; KKM Otomatis</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Card 3: Cross Jenjang Overview */}
                                    <div className="p-4 rounded-xl border bg-sky-50/70 border-sky-200 text-sky-950 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wide">
                                                    Mapel Lintas-Jenjang
                                                </span>
                                                <span className="text-base font-black px-2 py-0.5 rounded-full bg-sky-200 text-sky-900">
                                                    {auditResult.crossJenjangGroups.length}
                                                </span>
                                            </div>
                                            <p className="text-[11px] mt-2 text-sky-800 leading-relaxed">
                                                {auditResult.crossJenjangGroups.length} judul mapel diajarkan di multi-marhalah (Tahfizh, Fiqih, dll). Sesuai arsitektur, ID terisolasi mandiri agar silabus dan rapor aman.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setAuditSubTab('cross_jenjang')}
                                            className="mt-3.5 w-full py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                                        >
                                            <i className="bi bi-search"></i>
                                            <span>Lihat Peta Ketersebaran</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Highlights Banner */}
                                <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3">
                                    <i className="bi bi-info-circle-fill text-teal-600 text-base mt-0.5"></i>
                                    <div className="text-xs text-teal-900 leading-relaxed">
                                        <span className="font-bold">Keamanan Migrasi Data:</span> Penggabungan mapel duplikat dijamin aman. Sistem secara atomik memindahkan seluruh data relasi foreign-key pada tabel <strong>Jadwal Pelajaran, Jadwal Ujian, Jurnal Mengajar, Nilai Rapor Santri, dan Data Guru Pengampu</strong> ke entri mapel utama sebelum entri redundan dibersihkan.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: PURE DUPLICATES DETAIL */}
                        {auditSubTab === 'duplicates' && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
                                        <i className="bi bi-intersect text-red-600"></i>
                                        <span>Grup Duplikat Kembar di Jenjang yang Sama ({auditResult.pureDuplicates.length} Kelompok)</span>
                                    </h5>
                                    {auditResult.pureDuplicates.length > 0 && canWrite && (
                                        <button
                                            type="button"
                                            disabled={isProcessing}
                                            onClick={() => handleConsolidatePureDuplicates()}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs"
                                        >
                                            <i className="bi bi-check-all"></i>
                                            <span>Gabungkan Semua Grup Sekaligus</span>
                                        </button>
                                    )}
                                </div>

                                {auditResult.pureDuplicates.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {auditResult.pureDuplicates.map((group, idx) => (
                                            <div key={idx} className="p-3.5 bg-white border border-red-200 rounded-xl shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900 text-sm">{group.items[0].nama}</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                                                            {group.jenjangNama}
                                                        </span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                                            {group.items.length} Entri Kembar
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 flex flex-wrap gap-2">
                                                        <span>ID Terdeteksi:</span>
                                                        {group.items.map(item => (
                                                            <span key={item.id} className="font-mono bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded border">
                                                                #{item.id} {item.kodeMapel ? `(${item.kodeMapel})` : ''} - {item.rumpun || 'Tanpa Rumpun'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {canWrite && (
                                                    <button
                                                        type="button"
                                                        disabled={isProcessing}
                                                        onClick={() => handleConsolidatePureDuplicates(group)}
                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                                                    >
                                                        <i className="bi bi-intersect"></i>
                                                        <span>Satukan Grup Ini</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                                        <i className="bi bi-check-circle-fill text-3xl text-emerald-600"></i>
                                        <h5 className="font-bold text-sm">Tidak Ada Mapel Kembar</h5>
                                        <p className="text-xs text-emerald-700">
                                            Seluruh nama mata pelajaran di tiap jenjang bersifat unik dan tertata rapi.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: CROSS JENJANG OVERVIEW */}
                        {auditSubTab === 'cross_jenjang' && (
                            <div className="space-y-3">
                                <div>
                                    <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
                                        <i className="bi bi-layers-fill text-sky-600"></i>
                                        <span>Peta Ketersebaran Mapel Lintas-Marhalah ({auditResult.crossJenjangGroups.length} Judul)</span>
                                    </h5>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        Mata pelajaran berikut diajarkan di lebih dari satu jenjang. Setiap marhalah memiliki ID mandiri untuk menjaga independensi silabus, alokasi jam tatap muka, dan buku rapor santri.
                                    </p>
                                </div>

                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                    <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                                        <thead className="bg-gray-50 font-bold text-gray-700">
                                            <tr>
                                                <th className="py-2.5 px-3">Nama Mata Pelajaran</th>
                                                <th className="py-2.5 px-3">Ketersebaran Jenjang</th>
                                                <th className="py-2.5 px-3">Rumpun &amp; KKM per Jenjang</th>
                                                <th className="py-2.5 px-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {auditResult.crossJenjangGroups.map((group, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="py-2.5 px-3 font-bold text-gray-900">
                                                        <div className="flex items-center gap-1.5">
                                                            <i className="bi bi-bookmark text-teal-600"></i>
                                                            <span>{group.namaDisplay}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {group.jenjangNames.map((jName, jIdx) => (
                                                                <span key={jIdx} className="bg-sky-50 text-sky-800 border border-sky-200 font-semibold px-2 py-0.5 rounded text-[10px]">
                                                                    {jName}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {group.items.map(item => (
                                                                <span key={item.id} className="bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.2 rounded text-[10px]">
                                                                    {jenjangMap.get(item.jenjangId) || 'J'}: {item.rumpun || '-'} (KKM: {item.kkm || '-'})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                                            <i className="bi bi-shield-check"></i>
                                                            <span>Terpisah Aman per Jenjang</span>
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: MISSING METADATA */}
                        {auditSubTab === 'missing_meta' && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h5 className="font-bold text-gray-800 flex items-center gap-1.5">
                                            <i className="bi bi-file-earmark-check-fill text-amber-600"></i>
                                            <span>Mata Pelajaran dengan Metadata Belum Lengkap ({auditResult.missingMetaCount} Mapel)</span>
                                        </h5>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Mapel tanpa Rumpun atau KKM dapat menyebabkan ketidakseimbangan agregasi buku rapor santri.
                                        </p>
                                    </div>
                                    {auditResult.missingMetaCount > 0 && canWrite && (
                                        <button
                                            type="button"
                                            onClick={handleAutoEnrichMeta}
                                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
                                        >
                                            <i className="bi bi-magic"></i>
                                            <span>Standarisasi Otomatis Sekarang</span>
                                        </button>
                                    )}
                                </div>

                                {auditResult.missingMetaCount > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                        {auditResult.missingMetaItems.map(mapel => (
                                            <div key={mapel.id} className="p-3 bg-white border border-amber-200 rounded-xl flex items-start justify-between gap-2 shadow-2xs">
                                                <div>
                                                    <span className="font-bold text-gray-900 block text-xs">{mapel.nama}</span>
                                                    <span className="text-[11px] text-teal-700 block">
                                                        {jenjangMap.get(mapel.jenjangId) || 'Jenjang'}
                                                    </span>
                                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                                        {!mapel.rumpun && (
                                                            <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 rounded font-semibold">
                                                                Rumpun Kosong
                                                            </span>
                                                        )}
                                                        {!mapel.kkm && (
                                                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                                                                KKM Kosong
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border">
                                                    #{mapel.id}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                                        <i className="bi bi-check-circle-fill text-3xl text-emerald-600"></i>
                                        <h5 className="font-bold text-sm">Metadata Sudah Lengkap!</h5>
                                        <p className="text-xs text-emerald-700">
                                            Seluruh mata pelajaran telah terisi Rumpun Kurikulum dan Nilai Standar KKM.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CLONE CURRICULUM MODAL */}
            {isCloneModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 animate-scale-up">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                                <i className="bi bi-copy text-teal-600"></i>
                                <span>Salin Kurikulum Antar-Jenjang</span>
                            </h4>
                            <button
                                type="button"
                                onClick={() => setIsCloneModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Jenjang Sumber (Asal)</label>
                                <select
                                    value={sourceJenjangId}
                                    onChange={e => setSourceJenjangId(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2 font-medium bg-white"
                                >
                                    {settings.jenjang.map(j => (
                                        <option key={j.id} value={j.id}>
                                            {j.nama} ({settings.mataPelajaran.filter(m => m.jenjangId === j.id).length} Mapel)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Jenjang Tujuan</label>
                                <select
                                    value={targetJenjangId}
                                    onChange={e => setTargetJenjangId(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2 font-medium bg-white"
                                >
                                    {settings.jenjang.map(j => (
                                        <option key={j.id} value={j.id}>
                                            {j.nama} ({settings.mataPelajaran.filter(m => m.jenjangId === j.id).length} Mapel saat ini)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Metode Penyalinan</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCloneMode('append')}
                                        className={`p-2 rounded-lg border text-left ${
                                            cloneMode === 'append' ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold' : 'bg-gray-50 border-gray-200 text-gray-700'
                                        }`}
                                    >
                                        <div className="font-bold">Tambahkan</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">Gabungkan dengan mapel tujuan</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCloneMode('replace')}
                                        className={`p-2 rounded-lg border text-left ${
                                            cloneMode === 'replace' ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold' : 'bg-gray-50 border-gray-200 text-gray-700'
                                        }`}
                                    >
                                        <div className="font-bold">Timpa Semua</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">Hapus mapel tujuan lalu ganti</div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <button
                                type="button"
                                onClick={() => setIsCloneModalOpen(false)}
                                className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleCloneCurriculum}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5"
                            >
                                <i className="bi bi-check-circle"></i>
                                <span>Salin Kurikulum Sekarang</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-tab Navigation */}
            <div className="w-full bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs grid grid-cols-2 sm:flex sm:w-fit gap-1">
                <button
                    type="button"
                    onClick={() => setSubTab('katalog')}
                    className={`px-3 py-2 sm:px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center ${
                        subTab === 'katalog'
                            ? 'bg-teal-700 text-white shadow-2xs'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                    }`}
                >
                    <i className="bi bi-journal-text text-xs shrink-0"></i>
                    <span className="hidden sm:inline">Katalog Mata Pelajaran & Silabus</span>
                    <span className="sm:hidden">Katalog Mapel</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        subTab === 'katalog' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                        {settings.mataPelajaran.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setSubTab('plotting')}
                    className={`px-3 py-2 sm:px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center ${
                        subTab === 'plotting'
                            ? 'bg-teal-700 text-white shadow-2xs'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                    }`}
                >
                    <i className="bi bi-people-fill text-xs shrink-0"></i>
                    <span className="hidden sm:inline">Plotting Guru Pengampu</span>
                    <span className="sm:hidden">Plotting Guru</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        subTab === 'plotting' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
                    }`}>
                        Terpadu
                    </span>
                </button>
            </div>

            {/* View Content */}
            {subTab === 'katalog' ? (
                <TabMataPelajaran
                    localSettings={settings}
                    handleInputChange={handleInputChange}
                    canWrite={canWrite}
                    source="kurikulum"
                />
            ) : (
                <TabPlottingPengampu />
            )}
        </div>
    );
};
