import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { TabMataPelajaran } from '../datamaster/TabMataPelajaran';
import { MataPelajaran } from '../../types';
import { db } from '../../db';

export const TabKurikulumMapel: React.FC = () => {
    const { settings, onSaveSettings, currentUser, showToast, showConfirmation } = useAppContext();
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.akademik === 'write';

    // State for tools
    const [showAuditPanel, setShowAuditPanel] = useState<boolean>(false);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);
    const [sourceJenjangId, setSourceJenjangId] = useState<number>(settings.jenjang[0]?.id || 0);
    const [targetJenjangId, setTargetJenjangId] = useState<number>(settings.jenjang[1]?.id || 0);
    const [cloneMode, setCloneMode] = useState<'append' | 'replace'>('append');

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
    // AUDIT REDUNDANSI MATA PELAJARAN
    // ==============================================================
    const redundancyAudit = useMemo(() => {
        // 1. Duplicate within the SAME jenjang (pure duplicates)
        const sameJenjangGroups: Record<string, MataPelajaran[]> = {};
        settings.mataPelajaran.forEach(m => {
            const normName = m.nama.trim().toLowerCase();
            const key = `${m.jenjangId}_${normName}`;
            if (!sameJenjangGroups[key]) sameJenjangGroups[key] = [];
            sameJenjangGroups[key].push(m);
        });

        const pureDuplicates = Object.values(sameJenjangGroups).filter(group => group.length > 1);

        // 2. Shared names ACROSS different jenjangs
        const crossJenjangMap: Record<string, { name: string; jenjangIds: number[]; ids: number[] }> = {};
        settings.mataPelajaran.forEach(m => {
            const normName = m.nama.trim().toLowerCase();
            if (!crossJenjangMap[normName]) {
                crossJenjangMap[normName] = { name: m.nama.trim(), jenjangIds: [], ids: [] };
            }
            if (!crossJenjangMap[normName].jenjangIds.includes(m.jenjangId)) {
                crossJenjangMap[normName].jenjangIds.push(m.jenjangId);
            }
            crossJenjangMap[normName].ids.push(m.id);
        });

        const crossJenjangNames = Object.values(crossJenjangMap).filter(item => item.jenjangIds.length > 1);

        // 3. Mapel with missing metadata (no rumpun, no KKM, or no alokasi)
        const missingMeta = settings.mataPelajaran.filter(m => !m.rumpun || !m.kkm);

        return {
            pureDuplicates,
            pureDuplicatesCount: pureDuplicates.reduce((acc, g) => acc + (g.length - 1), 0),
            crossJenjangNames,
            missingMetaCount: missingMeta.length,
        };
    }, [settings.mataPelajaran]);

    // Handle Auto-Merge pure duplicates within same jenjang
    const handleMergePureDuplicates = async () => {
        if (redundancyAudit.pureDuplicates.length === 0) {
            showToast('Tidak ada mata pelajaran duplikat di jenjang yang sama.', 'info');
            return;
        }

        showConfirmation(
            'Konsolidasi / Gabungkan Mapel Duplikat?',
            `Ditemukan ${redundancyAudit.pureDuplicatesCount} mata pelajaran duplikat di jenjang yang sama. Sistem akan menggabungkan referensi jadwal (KBM & Ujian) ke satu ID resmi dan membersihkan entri kembar. Lanjutkan?`,
            async () => {
                try {
                    let updatedMapelList = [...settings.mataPelajaran];
                    const idsToRemove: number[] = [];

                    for (const group of redundancyAudit.pureDuplicates) {
                        // Canonical item is the first one (or the one with the most metadata)
                        const canonical = group[0];
                        const duplicateOthers = group.slice(1);

                        for (const dup of duplicateOthers) {
                            idsToRemove.push(dup.id);

                            // Migrate references in Dexie tables
                            await db.jadwalPelajaran.where('mapelId').equals(dup.id).modify({ mapelId: canonical.id });
                            await db.jadwalUjian.where('mapelId').equals(dup.id).modify({ mapelId: canonical.id });
                            await db.jurnalMengajar.where('mataPelajaranId').equals(dup.id).modify({ mataPelajaranId: canonical.id });
                        }
                    }

                    updatedMapelList = updatedMapelList.filter(m => !idsToRemove.includes(m.id));
                    handleInputChange('mataPelajaran', updatedMapelList);
                    showToast(`Berhasil mengonsolidasikan ${idsToRemove.length} mata pelajaran kembar. Seluruh jadwal telah diperbarui.`, 'success');
                } catch (err) {
                    console.error(err);
                    showToast('Gagal mengonsolidasikan mata pelajaran duplikat.', 'error');
                }
            }
        );
    };

    // Handle Clone Curriculum across jenjang
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

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setShowAuditPanel(prev => !prev)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 shadow-2xs ${
                                redundancyAudit.pureDuplicatesCount > 0
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                    : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                            }`}
                        >
                            <i className="bi bi-shield-check"></i>
                            <span>Audit Redundansi</span>
                            {redundancyAudit.pureDuplicatesCount > 0 && (
                                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                    {redundancyAudit.pureDuplicatesCount} Duplikat
                                </span>
                            )}
                        </button>

                        {canWrite && (
                            <button
                                type="button"
                                onClick={() => setIsCloneModalOpen(true)}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
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

            {/* AUDIT & SARAN REDUNDANSI ACCORDION / CARD */}
            {showAuditPanel && (
                <div className="bg-white rounded-xl border border-teal-200 shadow-sm overflow-hidden animate-fade-in">
                    <div className="p-4 bg-teal-900 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-diagram-3-fill text-teal-300 text-lg"></i>
                            <div>
                                <h4 className="text-sm font-bold">Hasil Audit Redundansi Mata Pelajaran & Saran Optimasi</h4>
                                <p className="text-[11px] text-teal-200">
                                    Pemeriksaan integritas basis data kurikulum dan konsolidasi entri berulang.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAuditPanel(false)}
                            className="text-teal-200 hover:text-white text-sm"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="p-4 space-y-4 text-xs">
                        {/* Status Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className={`p-3 rounded-lg border ${redundancyAudit.pureDuplicatesCount > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                                <div className="font-bold flex items-center justify-between">
                                    <span>Duplikat di Jenjang Sama</span>
                                    <span className="text-base font-black">{redundancyAudit.pureDuplicatesCount}</span>
                                </div>
                                <p className="text-[11px] mt-1 text-gray-600">
                                    {redundancyAudit.pureDuplicatesCount > 0
                                        ? 'Terdapat nama mapel kembar di satu jenjang yang memecah riwayat KBM.'
                                        : 'Bersih! Tidak ada mapel kembar di jenjang yang sama.'}
                                </p>
                                {redundancyAudit.pureDuplicatesCount > 0 && canWrite && (
                                    <button
                                        type="button"
                                        onClick={handleMergePureDuplicates}
                                        className="mt-2.5 w-full py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs flex items-center justify-center gap-1 shadow-2xs"
                                    >
                                        <i className="bi bi-intersect"></i>
                                        <span>Gabungkan & Konsolidasi Otomatis</span>
                                    </button>
                                )}
                            </div>

                            <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-950">
                                <div className="font-bold flex items-center justify-between">
                                    <span>Mapel Lintas-Jenjang</span>
                                    <span className="text-base font-black">{redundancyAudit.crossJenjangNames.length}</span>
                                </div>
                                <p className="text-[11px] mt-1 text-blue-800">
                                    {redundancyAudit.crossJenjangNames.length} mata pelajaran diajarkan di lebih dari 1 jenjang (misal: Tahfizh, Fiqih, Bhs Arab).
                                </p>
                            </div>

                            <div className="p-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-950">
                                <div className="font-bold flex items-center justify-between">
                                    <span>Kelengkapan Metadata</span>
                                    <span className="text-base font-black">{redundancyAudit.missingMetaCount}</span>
                                </div>
                                <p className="text-[11px] mt-1 text-amber-800">
                                    {redundancyAudit.missingMetaCount > 0
                                        ? `${redundancyAudit.missingMetaCount} mapel belum dilengkapi KKM atau Rumpun.`
                                        : 'Seluruh mapel telah memiliki rumpun dan KKM lengkap.'}
                                </p>
                            </div>
                        </div>

                        {/* List of Pure Duplicates */}
                        {redundancyAudit.pureDuplicates.length > 0 && (
                            <div className="border border-red-200 rounded-lg p-3 bg-red-50/40">
                                <h5 className="font-bold text-red-900 mb-2 flex items-center gap-1.5">
                                    <i className="bi bi-exclamation-triangle-fill text-red-600"></i>
                                    Rincian Mapel Kembar yang Ditemukan:
                                </h5>
                                <div className="space-y-1.5">
                                    {redundancyAudit.pureDuplicates.map((group, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-red-100 text-xs">
                                            <div>
                                                <span className="font-bold text-gray-900">{group[0].nama}</span>
                                                <span className="text-gray-500 ml-2">({jenjangMap.get(group[0].jenjangId) || 'Jenjang'})</span>
                                            </div>
                                            <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                                {group.length} entri ID ({group.map(g => `#${g.id}`).join(', ')})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Architectural Advice */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700">
                            <h5 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                                <i className="bi bi-lightbulb-fill text-amber-500"></i>
                                <span>Saran Arsitektur: Solusi Redundansi Mata Pelajaran</span>
                            </h5>
                            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-slate-600">
                                <li>
                                    <strong>Pemisahan Peran Menu:</strong> Menu <em>Pengaturan &gt; Data Master</em> berfungsi sebagai registri inventaris dasar pondok, sedangkan menu <em>Kurikulum &gt; Mata Pelajaran &amp; Silabus</em> ini adalah pusat operasional KBM untuk alokasi jam/pekan, modul buku santri, dan target bab semester.
                                </li>
                                <li>
                                    <strong>Penanganan Mapel Lintas-Jenjang:</strong> Di pondok pesantren, nama mapel yang sama (seperti "Nahwu" atau "Tahfizh") di jenjang Wustha vs Ulya memiliki silabus, kitab rujukan, alokasi jam, dan guru yang berbeda. Mempertahankan ID per-jenjang adalah <strong>praktek terbaik</strong> untuk memastikan rapor, matriks jadwal, dan jurnal mengajar tidak tertukar antar marhalah.
                                </li>
                                <li>
                                    <strong>Gunakan Fitur Kloning:</strong> Daripada mengetik ulang mapel dari awal untuk jenjang baru, gunakan tombol <strong>"Salin Kurikulum Antar-Jenjang"</strong> di atas untuk mereplikasi paket kurikulum standar secara instan.
                                </li>
                            </ul>
                        </div>
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

            {/* Render TabMataPelajaran */}
            <TabMataPelajaran
                localSettings={settings}
                handleInputChange={handleInputChange}
                canWrite={canWrite}
            />
        </div>
    );
};
