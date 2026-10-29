import React, { useMemo, useState } from 'react';
import {
    CustomSignatoryMode,
    DigitalAsset,
    PondokSettings,
    RaporCustomSignatory,
    RaporTemplate,
    Rombel
} from '../../types';
import { findStrictTeacherTtdAsset } from '../../utils/digitalAssetUtils';
import { inspectTemplatePengampuUsage } from '../../utils/raporPlaceholderResolver';

interface RaporCustomSignatoryConfiguratorProps {
    template: RaporTemplate;
    settings: PondokSettings;
    digitalAssets: DigitalAsset[];
    onChangeSignatories: (next: RaporCustomSignatory[]) => void;
    canWrite?: boolean;
    focusSlot?: number;
    activeRombelId?: number;
    compact?: boolean;
    onInsertTagToActiveCell?: (tag: string) => void;
}

const createDefaultSignatory = (slot: number): RaporCustomSignatory => ({
    id: `sig_slot_${slot}_${Date.now()}`,
    slot,
    label: slot === 1 ? 'Pengampu / Guru Khusus' : `Pengampu ${slot}`,
    mode: 'global',
    defaultTeacherId: undefined,
    rombelTeacherMap: {}
});

export const RaporCustomSignatoryConfigurator: React.FC<RaporCustomSignatoryConfiguratorProps> = ({
    template,
    settings,
    digitalAssets,
    onChangeSignatories,
    canWrite = true,
    focusSlot,
    activeRombelId,
    compact = false,
    onInsertTagToActiveCell
}) => {
    const [showAllPondokRombels, setShowAllPondokRombels] = useState(false);
    const [rombelSearch, setRombelSearch] = useState('');

    const usage = useMemo(() => inspectTemplatePengampuUsage(template), [template]);

    const effectiveSignatories = useMemo<RaporCustomSignatory[]>(() => {
        const saved = Array.isArray(template.customSignatories) ? [...template.customSignatories] : [];
        const neededSlots = new Set<number>(saved.map(s => Number(s.slot) || 1));
        if (focusSlot && focusSlot >= 1) neededSlots.add(focusSlot);
        usage.slotsUsed.forEach(sl => neededSlots.add(sl));

        const list = [...saved];
        Array.from(neededSlots)
            .sort((a, b) => a - b)
            .forEach(sl => {
                if (!list.some(item => Number(item.slot) === sl)) {
                    list.push(createDefaultSignatory(sl));
                }
            });
        return list.sort((a, b) => a.slot - b.slot);
    }, [template.customSignatories, focusSlot, usage.slotsUsed]);

    const sortedTeachers = useMemo(() => {
        return [...(settings.tenagaPengajar || [])].sort((a, b) =>
            (a.nama || '').localeCompare(b.nama || '', 'id')
        );
    }, [settings.tenagaPengajar]);

    const teacherHasTtdMap = useMemo(() => {
        const map = new Map<number, boolean>();
        sortedTeachers.forEach(t => {
            map.set(Number(t.id), Boolean(findStrictTeacherTtdAsset(digitalAssets, t)));
        });
        return map;
    }, [sortedTeachers, digitalAssets]);

    const scopedRombels = useMemo<Rombel[]>(() => {
        const allRombels = settings.rombel || [];
        if (showAllPondokRombels) return allRombels;
        if (template.rombelId) {
            const exact = allRombels.filter(r => Number(r.id) === Number(template.rombelId));
            if (exact.length > 0) return exact;
        }
        if (template.kelasId) {
            const byKelas = allRombels.filter(r => Number(r.kelasId) === Number(template.kelasId));
            if (byKelas.length > 0) return byKelas;
        }
        if (template.jenjangId) {
            const kelasIds = new Set(
                (settings.kelas || [])
                    .filter(k => Number(k.jenjangId) === Number(template.jenjangId))
                    .map(k => Number(k.id))
            );
            const byJenjang = allRombels.filter(r => kelasIds.has(Number(r.kelasId)));
            if (byJenjang.length > 0) return byJenjang;
        }
        return allRombels;
    }, [settings.rombel, settings.kelas, template.rombelId, template.kelasId, template.jenjangId, showAllPondokRombels]);

    const visibleRombels = useMemo(() => {
        const q = rombelSearch.trim().toLowerCase();
        let base = scopedRombels;
        if (q) {
            base = base.filter(r => (r.nama || '').toLowerCase().includes(q));
        }
        if (activeRombelId) {
            return [...base].sort((a, b) => {
                if (Number(a.id) === Number(activeRombelId)) return -1;
                if (Number(b.id) === Number(activeRombelId)) return 1;
                return 0;
            });
        }
        return base;
    }, [scopedRombels, rombelSearch, activeRombelId]);

    const upsertSlot = (slot: number, patch: Partial<RaporCustomSignatory>) => {
        if (!canWrite) return;
        const baseList: RaporCustomSignatory[] = effectiveSignatories.map(s => ({
            ...s,
            rombelTeacherMap: { ...(s.rombelTeacherMap || {}) }
        }));
        const idx = baseList.findIndex(s => Number(s.slot) === slot);
        if (idx >= 0) {
            baseList[idx] = { ...baseList[idx], ...patch };
        } else {
            baseList.push({ ...createDefaultSignatory(slot), ...patch });
        }
        onChangeSignatories(baseList.sort((a, b) => a.slot - b.slot));
    };

    const handleSetRombelTeacher = (slot: number, rombelId: number, rawTeacherId: string) => {
        if (!canWrite) return;
        const current = effectiveSignatories.find(s => Number(s.slot) === slot) || createDefaultSignatory(slot);
        const nextMap: Record<string, number> = { ...(current.rombelTeacherMap || {}) };
        if (!rawTeacherId) {
            delete nextMap[String(rombelId)];
        } else {
            const parsed = parseInt(rawTeacherId, 10);
            if (!isNaN(parsed) && parsed > 0) {
                nextMap[String(rombelId)] = parsed;
            }
        }
        upsertSlot(slot, { mode: 'per_rombel', rombelTeacherMap: nextMap });
    };

    const handleAddNextSlot = () => {
        if (!canWrite) return;
        const maxSlot = effectiveSignatories.reduce((m, s) => Math.max(m, Number(s.slot) || 0), 0);
        const nextSlot = maxSlot + 1;
        const nextList = [
            ...effectiveSignatories.map(s => ({ ...s, rombelTeacherMap: { ...(s.rombelTeacherMap || {}) } })),
            createDefaultSignatory(nextSlot)
        ];
        onChangeSignatories(nextList);
    };

    const handleRemoveSlot = (slot: number) => {
        if (!canWrite) return;
        const filtered = (template.customSignatories || []).filter(s => Number(s.slot) !== slot);
        onChangeSignatories(filtered);
    };

    const hasTemplateLock = Boolean(template.jenjangId || template.kelasId || template.rombelId);

    if (effectiveSignatories.length === 0) {
        return (
            <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/60 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                            <i className="bi bi-person-vcard-fill text-teal-600"></i>
                            <span>Pengampu / Guru Khusus</span>
                        </div>
                        <p className="text-[10.5px] text-teal-800/90 leading-snug mt-0.5">
                            Untuk rapor khusus seperti <strong>Hafalan Hadits</strong>, <strong>Mutun</strong>, atau <strong>Tahfizh</strong> yang ditandatangani pengampu (bisa 1 guru semua rombel atau beda tiap rombel).
                        </p>
                    </div>
                </div>
                {canWrite && (
                    <button
                        type="button"
                        onClick={() => onChangeSignatories([createDefaultSignatory(1)])}
                        className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                        <i className="bi bi-plus-circle"></i>
                        <span>Atur Pengampu / Guru Khusus</span>
                    </button>
                )}
            </div>
        );
    }

    const slotsToRender = focusSlot
        ? effectiveSignatories.filter(s => Number(s.slot) === focusSlot)
        : effectiveSignatories;

    return (
        <div className="space-y-3">
            {slotsToRender.map(sig => {
                const slot = Number(sig.slot) || 1;
                const suffix = slot === 1 ? '' : `_${slot}`;
                const tagNama = `$NAMA_PENGAMPU${suffix}`;
                const tagNip = `$NIP_PENGAMPU${suffix}`;
                const tagJabatan = `$JABATAN_PENGAMPU${suffix}`;
                const tagTtd = `$TTD_PENGAMPU${suffix}`;

                const selectedDefaultTeacher = sig.defaultTeacherId
                    ? sortedTeachers.find(t => Number(t.id) === Number(sig.defaultTeacherId))
                    : undefined;
                const defaultHasTtd = selectedDefaultTeacher
                    ? Boolean(teacherHasTtdMap.get(Number(selectedDefaultTeacher.id)))
                    : false;

                const mappedRombelCount = Object.keys(sig.rombelTeacherMap || {}).filter(
                    rk => Boolean(sig.rombelTeacherMap?.[rk])
                ).length;

                return (
                    <div
                        key={sig.id || `slot_${slot}`}
                        className={`rounded-xl border border-teal-200 bg-teal-50/50 ${compact ? 'p-2.5 space-y-2' : 'p-3 space-y-2.5'}`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <div className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                                    <i className="bi bi-person-badge-fill text-teal-600"></i>
                                    <span>
                                        {slot === 1 ? 'Pengampu / Guru Khusus' : `Pengampu Khusus Ke-${slot}`}
                                    </span>
                                </div>
                                <div className="text-[10px] font-mono text-teal-700 truncate">
                                    {tagTtd} · {tagNama}
                                </div>
                            </div>
                            {canWrite && (template.customSignatories || []).some(s => Number(s.slot) === slot) && !focusSlot && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveSlot(slot)}
                                    className="text-[10px] text-rose-600 hover:text-rose-800 px-1.5 py-0.5 rounded hover:bg-rose-50 font-semibold shrink-0"
                                    title="Hapus konfigurasi slot pengampu ini"
                                >
                                    Reset
                                </button>
                            )}
                        </div>

                        {/* Label Jabatan */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                                Nama Jabatan ({tagJabatan})
                            </label>
                            <input
                                type="text"
                                disabled={!canWrite}
                                value={sig.label || ''}
                                onChange={e => upsertSlot(slot, { label: e.target.value })}
                                placeholder="Contoh: Pengampu Hafalan Hadits / Musyrif Mutun"
                                className="w-full border border-teal-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-slate-100"
                            />
                        </div>

                        {/* Mode Penentuan Guru */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                Skema Penentuan Guru Pengampu
                            </label>
                            <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded-lg border border-teal-200">
                                {([
                                    {
                                        id: 'global' as CustomSignatoryMode,
                                        label: '1 Guru Semua',
                                        tip: 'Satu ustadz/guru yang sama untuk seluruh rombel pada rapor ini'
                                    },
                                    {
                                        id: 'per_rombel' as CustomSignatoryMode,
                                        label: 'Tiap Rombel',
                                        tip: 'Tiap rombel memiliki ustadz/pengampu yang berbeda-beda'
                                    },
                                    {
                                        id: 'halaqah' as CustomSignatoryMode,
                                        label: 'Halaqah',
                                        tip: 'Otomatis mengikuti Muhaffizh kelompok halaqah masing-masing santri'
                                    }
                                ]).map(opt => {
                                    const active = sig.mode === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            disabled={!canWrite}
                                            title={opt.tip}
                                            onClick={() => upsertSlot(slot, { mode: opt.id })}
                                            className={`py-1 px-1.5 rounded-md text-[10.5px] font-bold transition-all ${
                                                active
                                                    ? 'bg-teal-600 text-white shadow-2xs'
                                                    : 'text-slate-600 hover:bg-teal-50'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* MODE 1: GLOBAL (Satu Guru untuk Semua Rombel) */}
                        {sig.mode === 'global' && (
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-teal-900 uppercase">
                                    Pilih Guru / Pengampu (Berlaku Semua Rombel)
                                </label>
                                <select
                                    disabled={!canWrite}
                                    value={sig.defaultTeacherId ? String(sig.defaultTeacherId) : ''}
                                    onChange={e =>
                                        upsertSlot(slot, {
                                            defaultTeacherId: e.target.value ? parseInt(e.target.value, 10) : undefined
                                        })
                                    }
                                    className="w-full border border-teal-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="">-- Belum Dipilih (Kosongkan TTD) --</option>
                                    {sortedTeachers.map(t => {
                                        const hasTtd = teacherHasTtdMap.get(Number(t.id));
                                        return (
                                            <option key={t.id} value={String(t.id)}>
                                                {t.nama} {hasTtd ? '(✓ Ada TTD)' : '(Belum ada TTD)'}
                                            </option>
                                        );
                                    })}
                                </select>
                                {selectedDefaultTeacher ? (
                                    <div
                                        className={`text-[10px] px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                                            defaultHasTtd
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                : 'bg-amber-50 border-amber-200 text-amber-800'
                                        }`}
                                    >
                                        <i className={`bi ${defaultHasTtd ? 'bi-check-circle-fill text-emerald-600' : 'bi-info-circle-fill text-amber-600'}`}></i>
                                        <span>
                                            {defaultHasTtd
                                                ? `TTD digital ${selectedDefaultTeacher.nama} siap ditampilkan.`
                                                : `${selectedDefaultTeacher.nama} belum unggah TTD — ruang TTD otomatis dikosongkan untuk tanda tangan basah.`}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-slate-500 leading-tight">
                                        Pilih ustadz dari Data Master Tenaga Pengajar. Jika belum dipilih, TTD pada rapor dibiarkan kosong.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* MODE 2: PER ROMBEL (Tiap Rombel Bisa Berbeda) */}
                        {sig.mode === 'per_rombel' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold text-teal-900 uppercase">
                                        Pemetaan Guru per Rombel ({mappedRombelCount}/{scopedRombels.length} diatur)
                                    </span>
                                    {hasTemplateLock && (settings.rombel?.length || 0) > scopedRombels.length && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllPondokRombels(v => !v)}
                                            className="text-[10px] font-bold text-teal-700 hover:underline"
                                        >
                                            {showAllPondokRombels ? 'Hanya Rombel Template' : 'Semua Rombel'}
                                        </button>
                                    )}
                                </div>

                                {scopedRombels.length > 6 && (
                                    <input
                                        type="text"
                                        value={rombelSearch}
                                        onChange={e => setRombelSearch(e.target.value)}
                                        placeholder="Cari nama rombel..."
                                        className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                )}

                                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                                    {visibleRombels.map(r => {
                                        const assignedId = sig.rombelTeacherMap?.[String(r.id)];
                                        const isCurrentPrintRombel = activeRombelId && Number(r.id) === Number(activeRombelId);
                                        const kelasObj = (settings.kelas || []).find(k => Number(k.id) === Number(r.kelasId));
                                        const assignedHasTtd = assignedId ? teacherHasTtdMap.get(Number(assignedId)) : false;

                                        return (
                                            <div
                                                key={r.id}
                                                className={`p-1.5 rounded-lg border flex flex-col gap-1 ${
                                                    isCurrentPrintRombel
                                                        ? 'bg-teal-100/70 border-teal-400 ring-1 ring-teal-400'
                                                        : 'bg-white border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1 text-[11px]">
                                                    <span className="font-bold text-slate-800 truncate">
                                                        {r.nama}
                                                        {kelasObj ? (
                                                            <span className="text-[10px] font-normal text-slate-400 ml-1">
                                                                ({kelasObj.nama})
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                    {assignedId ? (
                                                        <span
                                                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                                                assignedHasTtd
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : 'bg-amber-100 text-amber-800'
                                                            }`}
                                                        >
                                                            {assignedHasTtd ? '✓ TTD' : 'Tanpa TTD'}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <select
                                                    disabled={!canWrite}
                                                    value={assignedId ? String(assignedId) : ''}
                                                    onChange={e => handleSetRombelTeacher(slot, r.id, e.target.value)}
                                                    className="w-full border border-slate-200 rounded px-2 py-1 text-[11px] font-semibold bg-slate-50 focus:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                >
                                                    <option value="">
                                                        {sig.defaultTeacherId
                                                            ? '-- Ikuti Pengampu Cadangan --'
                                                            : '-- Kosongkan (Belum Diatur) --'}
                                                    </option>
                                                    {sortedTeachers.map(t => {
                                                        const hasTtd = teacherHasTtdMap.get(Number(t.id));
                                                        return (
                                                            <option key={t.id} value={String(t.id)}>
                                                                {t.nama} {hasTtd ? '(✓ Ada TTD)' : '(Belum ada TTD)'}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        );
                                    })}
                                    {visibleRombels.length === 0 && (
                                        <div className="text-[11px] text-slate-400 italic text-center py-2">
                                            Tidak ada rombel yang cocok.
                                        </div>
                                    )}
                                </div>

                                {/* Optional Fallback Teacher */}
                                <div className="pt-1.5 border-t border-teal-200/70">
                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                        Pengampu Cadangan (Jika Rombel Belum Dipilih)
                                    </label>
                                    <select
                                        disabled={!canWrite}
                                        value={sig.defaultTeacherId ? String(sig.defaultTeacherId) : ''}
                                        onChange={e =>
                                            upsertSlot(slot, {
                                                defaultTeacherId: e.target.value ? parseInt(e.target.value, 10) : undefined
                                            })
                                        }
                                        className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium bg-white text-slate-700"
                                    >
                                        <option value="">Biarkan Kosong (TTD Basah)</option>
                                        {sortedTeachers.map(t => {
                                            const hasTtd = teacherHasTtdMap.get(Number(t.id));
                                            return (
                                                <option key={t.id} value={String(t.id)}>
                                                    {t.nama} {hasTtd ? '(✓ Ada TTD)' : '(Belum ada TTD)'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* MODE 3: HALAQAH (Otomatis dari Kelompok Halaqah Santri) */}
                        {sig.mode === 'halaqah' && (
                            <div className="space-y-1.5">
                                <div className="p-2 bg-white rounded-lg border border-teal-200 text-[10.5px] text-slate-700 leading-snug">
                                    Otomatis memanggil nama &amp; TTD <strong>Muhaffizh / Musyrif Halaqah</strong> sesuai kelompok halaqah masing-masing santri di Data Master.
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                        Cadangan Jika Santri Belum Punya Halaqah (Opsional)
                                    </label>
                                    <select
                                        disabled={!canWrite}
                                        value={sig.defaultTeacherId ? String(sig.defaultTeacherId) : ''}
                                        onChange={e =>
                                            upsertSlot(slot, {
                                                defaultTeacherId: e.target.value ? parseInt(e.target.value, 10) : undefined
                                            })
                                        }
                                        className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium bg-white text-slate-700"
                                    >
                                        <option value="">Biarkan Kosong</option>
                                        {sortedTeachers.map(t => (
                                            <option key={t.id} value={String(t.id)}>
                                                {t.nama} {teacherHasTtdMap.get(Number(t.id)) ? '(✓ Ada TTD)' : '(Belum ada TTD)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Quick Insert Tag Buttons in Desain Rapor */}
                        {onInsertTagToActiveCell && canWrite && (
                            <div className="pt-1.5 border-t border-teal-200/70 space-y-1">
                                <span className="block text-[9.5px] font-bold text-teal-800 uppercase">
                                    Pasang ke Sel Aktif:
                                </span>
                                <div className="grid grid-cols-2 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onInsertTagToActiveCell(tagTtd)}
                                        className="px-2 py-1 bg-white hover:bg-teal-100 border border-teal-300 rounded text-[10px] font-mono font-bold text-teal-900 truncate"
                                        title={`Isi sel aktif dengan ${tagTtd}`}
                                    >
                                        + {tagTtd}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onInsertTagToActiveCell(tagNama)}
                                        className="px-2 py-1 bg-white hover:bg-teal-100 border border-teal-300 rounded text-[10px] font-mono font-bold text-teal-900 truncate"
                                        title={`Isi sel aktif dengan ${tagNama}`}
                                    >
                                        + {tagNama}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onInsertTagToActiveCell(tagJabatan)}
                                        className="px-2 py-1 bg-white hover:bg-teal-100 border border-teal-200 rounded text-[10px] font-mono font-semibold text-slate-700 truncate"
                                        title={`Isi sel aktif dengan ${tagJabatan}`}
                                    >
                                        + {tagJabatan}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onInsertTagToActiveCell(tagNip)}
                                        className="px-2 py-1 bg-white hover:bg-teal-100 border border-teal-200 rounded text-[10px] font-mono font-semibold text-slate-700 truncate"
                                        title={`Isi sel aktif dengan ${tagNip}`}
                                    >
                                        + {tagNip}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {!focusSlot && canWrite && (
                <button
                    type="button"
                    onClick={handleAddNextSlot}
                    className="w-full py-1.5 px-3 bg-white hover:bg-teal-50 text-teal-800 border border-dashed border-teal-300 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
                    title="Tambahkan slot pengampu ke-2 (misal: Penguji Mutun / Koordinator Tahfizh) dengan tag $NAMA_PENGAMPU_2 & $TTD_PENGAMPU_2"
                >
                    <i className="bi bi-person-plus-fill text-teal-600"></i>
                    <span>+ Tambah Pengampu Ke-{effectiveSignatories.length + 1}</span>
                </button>
            )}
        </div>
    );
};
