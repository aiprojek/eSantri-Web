import React, { useState, useMemo, useEffect } from 'react';
import { Santri } from '../../../types';
import { ExtractedTemplateKey } from '../../../services/raporExcelService';
import { classifyRaporInputField } from '../../../services/raporCalculationService';

interface RaporBulkHelperModalProps {
    isOpen: boolean;
    onClose: () => void;
    santriList: Santri[];
    inputKeys: ExtractedTemplateKey[];
    currentGrades: Record<number, Record<string, string>>;
    onApplyBulkUpdates: (updatesBySantri: Record<number, Record<string, string>>) => void;
}

function computeStudentAverage(
    studentGrades: Record<string, string> | undefined,
    keyMetaMap: Map<string, ExtractedTemplateKey>
): number | null {
    if (!studentGrades) return null;
    let sum = 0;
    let count = 0;
    Object.entries(studentGrades).forEach(([k, val]) => {
        const meta = keyMetaMap.get(k);
        const cls = classifyRaporInputField({
            key: k,
            label: meta?.label,
            type: meta?.type,
            inputMode: meta?.inputMode
        });
        if (!cls.isNumericScore) return;
        const cleaned = String(val ?? '').trim().replace(',', '.');
        if (!cleaned || cleaned === '-') return;
        const num = Number(cleaned);
        if (!isNaN(num) && num >= 0 && num <= 100) {
            sum += num;
            count++;
        }
    });
    return count > 0 ? Math.round((sum / count) * 100) / 100 : null;
}

function buildPesantrenCatatan(nama: string, avg: number | null, tone: 'pesantren' | 'formal'): string {
    const panggilan = `Ananda ${nama}`;
    if (avg === null) {
        return tone === 'pesantren'
            ? `${panggilan} diharapkan terus menjaga adab, keistiqamahan ibadah, dan semangat menuntut ilmu di pondok.`
            : `${panggilan} diharapkan terus meningkatkan kedisiplinan dan motivasi belajar pada semester berikutnya.`;
    }
    if (avg >= 90) {
        return tone === 'pesantren'
            ? `Alhamdulillah, ${panggilan} menunjukkan capaian ilmu yang Mumtaz (rata-rata ${avg}), adab yang santun, serta kesungguhan luar biasa dalam muthala'ah pelajaran. Pertahankan ketawadhuan dan keistiqamahan ini.`
            : `${panggilan} meraih prestasi belajar yang sangat baik (rata-rata ${avg}). Pertahankan ketekunan, kedisiplinan, dan jadilah teladan positif bagi rekan sekelas.`;
    }
    if (avg >= 80) {
        return tone === 'pesantren'
            ? `Alhamdulillah, ${panggilan} mencapai hasil belajar Jayyid Jiddan (rata-rata ${avg}) dengan kedisiplinan dan akhlak yang baik. Tingkatkan terus murojaah pelajaran agar semakin mutqin.`
            : `${panggilan} menunjukkan penguasaan materi yang baik (rata-rata ${avg}). Terus tingkatkan ketelitian dan keaktifan bertanya di dalam kelas.`;
    }
    if (avg >= 70) {
        return tone === 'pesantren'
            ? `${panggilan} telah mencapai batas ketuntasan belajar dengan baik (rata-rata ${avg}). Perlu menambah porsi belajar mandiri dan murojaah kitab/materi di asrama agar hasil semester depan lebih optimal.`
            : `${panggilan} cukup baik dalam mengikuti pembelajaran (rata-rata ${avg}), namun masih perlu meningkatkan konsistensi belajar mandiri untuk mendongkrak capaian nilai.`;
    }
    return tone === 'pesantren'
        ? `${panggilan} memerlukan bimbingan lebih intensif dan kesungguhan ekstra dalam mengulang pelajaran (rata-rata ${avg}). Jangan berputus asa, perbanyak bertanya kepada ustadz/pengajar dan kurangi waktu luang yang kurang bermanfaat.`
        : `${panggilan} memerlukan pendampingan belajar lebih intensif (rata-rata ${avg}) untuk mengejar ketuntasan kompetensi dasar pada beberapa mata pelajaran.`;
}

export const RaporBulkHelperModal: React.FC<RaporBulkHelperModalProps> = ({
    isOpen,
    onClose,
    santriList,
    inputKeys,
    currentGrades,
    onApplyBulkUpdates
}) => {
    const [activeTab, setActiveTab] = useState<'catatan' | 'keputusan'>('catatan');

    // Catatan State
    const [catatanTargetKey, setCatatanTargetKey] = useState<string>('CATATAN_WALI_KELAS');
    const [catatanTone, setCatatanTone] = useState<'pesantren' | 'formal'>('pesantren');
    const [overwriteExistingCatatan, setOverwriteExistingCatatan] = useState<boolean>(false);

    // Keputusan State
    const [keputusanTargetKey, setKeputusanTargetKey] = useState<string>('KEPUTUSAN');
    const [keputusanMode, setKeputusanMode] = useState<'uniform' | 'by_kkm'>('uniform');
    const [uniformText, setUniformText] = useState<string>('Naik ke Kelas Berikutnya');
    const [kkmThreshold, setKkmThreshold] = useState<number>(70);
    const [passText, setPassText] = useState<string>('Naik ke Kelas Berikutnya');
    const [failText, setFailText] = useState<string>('Tinggal di Kelas / Evaluasi Bersyarat');

    useEffect(() => {
        if (isOpen) {
            const matchedCatatan = inputKeys.find(k =>
                ['CATATAN_WALI_KELAS', 'CATATAN_WALI', 'CATATAN'].includes(k.key.toUpperCase())
            );
            setCatatanTargetKey(matchedCatatan?.key || 'CATATAN_WALI_KELAS');

            const matchedKeputusan = inputKeys.find(k =>
                ['KEPUTUSAN', 'STATUS_KELULUSAN', 'KENAIKAN_KELAS'].includes(k.key.toUpperCase())
            );
            setKeputusanTargetKey(matchedKeputusan?.key || 'KEPUTUSAN');
        }
    }, [isOpen, inputKeys]);

    const keyMetaMap = useMemo(() => {
        const m = new Map<string, ExtractedTemplateKey>();
        inputKeys.forEach(k => m.set(k.key, k));
        return m;
    }, [inputKeys]);

    const previewItems = useMemo(() => {
        return santriList.map(s => {
            const avg = computeStudentAverage(currentGrades[s.id], keyMetaMap);
            const existingCat = (currentGrades[s.id]?.[catatanTargetKey] || '').trim();
            const generatedCat = buildPesantrenCatatan(s.namaLengkap, avg, catatanTone);

            const generatedKep =
                keputusanMode === 'uniform'
                    ? uniformText
                    : avg !== null && avg >= kkmThreshold
                    ? passText
                    : failText;

            return {
                santri: s,
                avg,
                existingCat,
                generatedCat,
                willUpdateCat: overwriteExistingCatatan || !existingCat,
                generatedKep
            };
        });
    }, [
        santriList,
        currentGrades,
        keyMetaMap,
        catatanTargetKey,
        catatanTone,
        overwriteExistingCatatan,
        keputusanMode,
        uniformText,
        kkmThreshold,
        passText,
        failText
    ]);

    if (!isOpen) return null;

    const handleApplyCatatan = () => {
        const updates: Record<number, Record<string, string>> = {};
        previewItems.forEach(item => {
            if (item.willUpdateCat) {
                updates[item.santri.id] = {
                    [catatanTargetKey]: item.generatedCat,
                    CATATAN_WALI_KELAS: item.generatedCat
                };
            }
        });
        onApplyBulkUpdates(updates);
        onClose();
    };

    const handleApplyKeputusan = () => {
        const updates: Record<number, Record<string, string>> = {};
        previewItems.forEach(item => {
            updates[item.santri.id] = {
                [keputusanTargetKey]: item.generatedKep,
                KEPUTUSAN: item.generatedKep
            };
        });
        onApplyBulkUpdates(updates);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                            <i className="bi bi-stars text-lg"></i>
                        </div>
                        <div>
                            <h3 className="font-black text-base">Asisten Isi Cepat Wali Kelas</h3>
                            <p className="text-xs text-slate-300">
                                Generate narasi Catatan Wali Kelas &amp; Keputusan Kenaikan/Kelulusan otomatis
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                    >
                        <i className="bi bi-x-lg text-sm"></i>
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('catatan')}
                        className={`px-4 py-2 rounded-t-xl text-xs font-bold border border-b-0 transition-all flex items-center gap-1.5 ${
                            activeTab === 'catatan'
                                ? 'bg-white text-teal-800 border-slate-200 shadow-2xs'
                                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
                        }`}
                    >
                        <i className="bi bi-chat-quote-fill text-teal-600"></i>
                        <span>Generator Catatan Wali Kelas</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('keputusan')}
                        className={`px-4 py-2 rounded-t-xl text-xs font-bold border border-b-0 transition-all flex items-center gap-1.5 ${
                            activeTab === 'keputusan'
                                ? 'bg-white text-indigo-800 border-slate-200 shadow-2xs'
                                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
                        }`}
                    >
                        <i className="bi bi-mortarboard-fill text-indigo-600"></i>
                        <span>Isi Massal Keputusan Kelas</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {activeTab === 'catatan' ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                        Gaya Bahasa Narasi
                                    </label>
                                    <select
                                        value={catatanTone}
                                        onChange={e => setCatatanTone(e.target.value as any)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50"
                                    >
                                        <option value="pesantren">Khas Pesantren (Santun, Adab &amp; Muthala&apos;ah)</option>
                                        <option value="formal">Formal Sekolah / Madrasah</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                        Target Kolom Catatan
                                    </label>
                                    <select
                                        value={catatanTargetKey}
                                        onChange={e => setCatatanTargetKey(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50"
                                    >
                                        <option value="CATATAN_WALI_KELAS">$CATATAN_WALI_KELAS (Standar Sistem)</option>
                                        {inputKeys
                                            .filter(k => k.key !== 'CATATAN_WALI_KELAS')
                                            .map(k => (
                                                <option key={k.key} value={k.key}>
                                                    ${k.key} ({k.label})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer text-xs font-semibold text-amber-950">
                                <input
                                    type="checkbox"
                                    checked={overwriteExistingCatatan}
                                    onChange={e => setOverwriteExistingCatatan(e.target.checked)}
                                    className="rounded text-amber-600 w-4 h-4"
                                />
                                <span>Timpa catatan santri yang sudah terisi sebelumnya (Jika tidak dicentang, hanya mengisi yang kosong)</span>
                            </label>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                                    Pratinjau Narasi Otomatis ({previewItems.filter(i => i.willUpdateCat).length} santri akan diisi)
                                </div>
                                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                                    {previewItems.map(item => (
                                        <div key={item.santri.id} className="p-3 text-xs space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-800">{item.santri.namaLengkap}</span>
                                                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                    Rata-rata: {item.avg !== null ? item.avg : 'Belum ada nilai'}
                                                </span>
                                            </div>
                                            <p className={`text-[11px] leading-relaxed ${item.willUpdateCat ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                                {item.willUpdateCat ? item.generatedCat : `(Dipertahankan): ${item.existingCat}`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                        Metode Penentuan Keputusan
                                    </label>
                                    <select
                                        value={keputusanMode}
                                        onChange={e => setKeputusanMode(e.target.value as any)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50"
                                    >
                                        <option value="uniform">Seragam untuk Seluruh Santri di Rombel</option>
                                        <option value="by_kkm">Otomatis Berdasarkan Ambang Rata-rata Nilai</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                        Target Kolom Keputusan
                                    </label>
                                    <select
                                        value={keputusanTargetKey}
                                        onChange={e => setKeputusanTargetKey(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50"
                                    >
                                        <option value="KEPUTUSAN">$KEPUTUSAN (Standar Sistem)</option>
                                        {inputKeys
                                            .filter(k => k.key !== 'KEPUTUSAN')
                                            .map(k => (
                                                <option key={k.key} value={k.key}>
                                                    ${k.key} ({k.label})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {keputusanMode === 'uniform' ? (
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-700">
                                        Teks Keputusan Seragam
                                    </label>
                                    <input
                                        type="text"
                                        value={uniformText}
                                        onChange={e => setUniformText(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                                        placeholder="Contoh: Naik ke Kelas VIII (Delapan)"
                                    />
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {[
                                            'Naik ke Kelas Berikutnya',
                                            'Lulus dari Satuan Pendidikan',
                                            'Tuntas Melanjutkan Semester Genap',
                                            'Naik ke Marhalah Berikutnya'
                                        ].map(preset => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setUniformText(preset)}
                                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-semibold"
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Batas Minimal Rata-rata Naik / Lulus
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={kkmThreshold}
                                            onChange={e => setKkmThreshold(Number(e.target.value) || 0)}
                                            className="w-28 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                                                Jika Rata-rata &ge; {kkmThreshold}:
                                            </label>
                                            <input
                                                type="text"
                                                value={passText}
                                                onChange={e => setPassText(e.target.value)}
                                                className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-rose-700 mb-1">
                                                Jika Rata-rata &lt; {kkmThreshold}:
                                            </label>
                                            <input
                                                type="text"
                                                value={failText}
                                                onChange={e => setFailText(e.target.value)}
                                                className="w-full border border-rose-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
                    >
                        Batal
                    </button>
                    {activeTab === 'catatan' ? (
                        <button
                            type="button"
                            onClick={handleApplyCatatan}
                            className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5"
                        >
                            <i className="bi bi-magic"></i>
                            <span>Terapkan Catatan ({previewItems.filter(i => i.willUpdateCat).length} Santri)</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleApplyKeputusan}
                            className="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                        >
                            <i className="bi bi-check2-all"></i>
                            <span>Terapkan Keputusan ({santriList.length} Santri)</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
