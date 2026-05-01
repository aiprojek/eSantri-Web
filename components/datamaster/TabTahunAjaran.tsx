import React, { useMemo, useState } from 'react';
import { AcademicYearConfig, PondokSettings } from '../../types';
import { getAcademicYearsFromSettings } from '../../utils/academicYear';

interface TabTahunAjaranProps {
    localSettings: PondokSettings;
    handleInputChange: <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => void;
    canWrite: boolean;
}

const masehiMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const hijriahMonths = [
    'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir',
    'Rajab', 'Sya\'ban', 'Ramadhan', 'Syawwal', 'Dzulqa\'dah', 'Dzulhijjah'
];

const createAcademicYear = (): AcademicYearConfig => {
    const now = new Date();
    const startYear = now.getFullYear();
    return {
        id: `ta-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        labelMasehi: `${startYear}/${startYear + 1}`,
        masehiStartMonth: 7,
        masehiStartYear: startYear,
        masehiEndMonth: 6,
        masehiEndYear: startYear + 1,
        hijriEnabled: false,
        labelHijriah: '',
        hijriStartMonth: 1,
        hijriStartYear: 1447,
        hijriEndMonth: 12,
        hijriEndYear: 1448,
        isActive: false,
    };
};

export const TabTahunAjaran: React.FC<TabTahunAjaranProps> = ({ localSettings, handleInputChange, canWrite }) => {
    const configuredYears = useMemo(() => getAcademicYearsFromSettings(localSettings), [localSettings]);

    const [draft, setDraft] = useState<AcademicYearConfig>(createAcademicYear());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [openMobileId, setOpenMobileId] = useState<string | null>(null);

    const resetDraft = () => {
        setDraft(createAcademicYear());
        setEditingId(null);
    };

    const persist = (next: AcademicYearConfig[]) => {
        handleInputChange('academicYears', next as any);
    };

    const handleSave = () => {
        const cleanedMasehi = draft.labelMasehi.trim();
        if (!cleanedMasehi) return;

        const nextPayload = {
            ...draft,
            labelMasehi: cleanedMasehi,
            labelHijriah: draft.hijriEnabled ? (draft.labelHijriah || '').trim() : '',
        };

        if (editingId) {
            persist(configuredYears.map((item) => (item.id === editingId ? nextPayload : item)));
        } else {
            persist([...configuredYears, nextPayload]);
        }
        resetDraft();
    };

    const handleEdit = (item: AcademicYearConfig) => {
        setDraft(item);
        setEditingId(item.id);
    };

    const handleDelete = (id: string) => {
        const next = configuredYears.filter((item) => item.id !== id);
        if (next.length === 0) return;
        if (!next.some((item) => item.isActive)) {
            next[0] = { ...next[0], isActive: true };
        }
        persist(next);
    };

    const handleSetActive = (id: string) => {
        persist(configuredYears.map((item) => ({ ...item, isActive: item.id === id })));
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6 space-y-5">
            <div>
                <h2 className="text-lg font-bold text-gray-800">Tahun Ajaran</h2>
                <p className="text-sm text-gray-500">Masehi dipakai sebagai basis fungsi aplikasi, Hijriah opsional untuk tampilan kop laporan/surat.</p>
            </div>

            <div className="space-y-3 md:hidden">
                {configuredYears.map((item) => {
                    const isOpen = openMobileId === item.id;
                    return (
                        <div key={item.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <button
                                type="button"
                                onClick={() => setOpenMobileId(isOpen ? null : item.id)}
                                className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left"
                            >
                                <div>
                                    <div className="font-semibold text-gray-800">{item.labelMasehi}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {masehiMonths[(item.masehiStartMonth || 1) - 1]} {item.masehiStartYear} - {masehiMonths[(item.masehiEndMonth || 12) - 1]} {item.masehiEndYear}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {item.isActive && (
                                        <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-bold text-teal-700">Aktif</span>
                                    )}
                                    <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-gray-400`}></i>
                                </div>
                            </button>

                            {isOpen && (
                                <div className="px-4 pb-4 space-y-3">
                                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-[11px] font-bold uppercase text-gray-500 mb-1">Hijriah</p>
                                        {item.hijriEnabled ? (
                                            <>
                                                <div className="font-semibold text-gray-700">{item.labelHijriah || '-'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {hijriahMonths[(item.hijriStartMonth || 1) - 1]} {item.hijriStartYear} - {hijriahMonths[(item.hijriEndMonth || 12) - 1]} {item.hijriEndYear}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-400">Tidak ditampilkan</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {!item.isActive && (
                                            <button
                                                type="button"
                                                disabled={!canWrite}
                                                onClick={() => handleSetActive(item.id)}
                                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-60"
                                            >
                                                Jadikan Aktif
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!canWrite}
                                            onClick={() => handleEdit(item)}
                                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-60"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canWrite || configuredYears.length <= 1 || item.isActive}
                                            onClick={() => handleDelete(item.id)}
                                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-[840px] w-full text-sm">
                    <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                        <tr>
                            <th className="px-4 py-3 text-left">Masehi</th>
                            <th className="px-4 py-3 text-left">Hijriah</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {configuredYears.map((item) => (
                            <tr key={item.id}>
                                <td className="px-4 py-3 text-gray-700">
                                    <div className="font-semibold">{item.labelMasehi}</div>
                                    <div className="text-xs text-gray-500">
                                        {masehiMonths[(item.masehiStartMonth || 1) - 1]} {item.masehiStartYear} - {masehiMonths[(item.masehiEndMonth || 12) - 1]} {item.masehiEndYear}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                    {item.hijriEnabled ? (
                                        <>
                                            <div className="font-semibold">{item.labelHijriah || '-'}</div>
                                            <div className="text-xs text-gray-500">
                                                {hijriahMonths[(item.hijriStartMonth || 1) - 1]} {item.hijriStartYear} - {hijriahMonths[(item.hijriEndMonth || 12) - 1]} {item.hijriEndYear}
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-xs text-gray-400">Tidak ditampilkan</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {item.isActive ? (
                                        <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-bold text-teal-700">Aktif</span>
                                    ) : (
                                        <button type="button" disabled={!canWrite} onClick={() => handleSetActive(item.id)} className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-500 disabled:opacity-60">
                                            Jadikan Aktif
                                        </button>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                        <button type="button" disabled={!canWrite} onClick={() => handleEdit(item)} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 disabled:opacity-60">Edit</button>
                                        <button type="button" disabled={!canWrite || configuredYears.length <= 1 || item.isActive} onClick={() => handleDelete(item.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">Hapus</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
                <h3 className="text-sm font-bold text-gray-700">{editingId ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500">Label Masehi</label>
                        <input type="text" value={draft.labelMasehi} onChange={(e) => setDraft((prev) => ({ ...prev, labelMasehi: e.target.value }))} disabled={!canWrite} placeholder="Contoh: 2026/2027" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100" />
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm w-full">
                            <input type="checkbox" checked={!!draft.hijriEnabled} onChange={(e) => setDraft((prev) => ({ ...prev, hijriEnabled: e.target.checked }))} disabled={!canWrite} />
                            <span>Aktifkan tampilan Hijriah</span>
                        </label>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500">Bulan Mulai Masehi</label>
                        <select value={draft.masehiStartMonth} onChange={(e) => setDraft((prev) => ({ ...prev, masehiStartMonth: Number(e.target.value) }))} disabled={!canWrite} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100">
                            {masehiMonths.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500">Tahun Mulai Masehi</label>
                        <input type="number" value={draft.masehiStartYear} onChange={(e) => setDraft((prev) => ({ ...prev, masehiStartYear: Number(e.target.value) || prev.masehiStartYear }))} disabled={!canWrite} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500">Bulan Selesai Masehi</label>
                        <select value={draft.masehiEndMonth} onChange={(e) => setDraft((prev) => ({ ...prev, masehiEndMonth: Number(e.target.value) }))} disabled={!canWrite} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100">
                            {masehiMonths.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500">Tahun Selesai Masehi</label>
                        <input type="number" value={draft.masehiEndYear} onChange={(e) => setDraft((prev) => ({ ...prev, masehiEndYear: Number(e.target.value) || prev.masehiEndYear }))} disabled={!canWrite} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100" />
                    </div>

                    {draft.hijriEnabled && (
                        <>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-500">Label Hijriah</label>
                                <input type="text" value={draft.labelHijriah || ''} onChange={(e) => setDraft((prev) => ({ ...prev, labelHijriah: e.target.value }))} disabled={!canWrite} placeholder="Contoh: 1447-1448" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-500">Bulan Mulai Hijriah</label>
                                <select value={draft.hijriStartMonth || 1} onChange={(e) => setDraft((prev) => ({ ...prev, hijriStartMonth: Number(e.target.value) }))} disabled={!canWrite} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100">
                                    {hijriahMonths.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-500">Tahun Mulai Hijriah</label>
                                <input type="number" value={draft.hijriStartYear || 1447} onChange={(e) => setDraft((prev) => ({ ...prev, hijriStartYear: Number(e.target.value) || prev.hijriStartYear }))} disabled={!canWrite} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-500">Bulan Selesai Hijriah</label>
                                <select value={draft.hijriEndMonth || 12} onChange={(e) => setDraft((prev) => ({ ...prev, hijriEndMonth: Number(e.target.value) }))} disabled={!canWrite} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100">
                                    {hijriahMonths.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-500">Tahun Selesai Hijriah</label>
                                <input type="number" value={draft.hijriEndYear || 1448} onChange={(e) => setDraft((prev) => ({ ...prev, hijriEndYear: Number(e.target.value) || prev.hijriEndYear }))} disabled={!canWrite} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100" />
                            </div>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    <button type="button" disabled={!canWrite} onClick={handleSave} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{editingId ? 'Perbarui' : 'Tambah'}</button>
                    {editingId && <button type="button" disabled={!canWrite} onClick={resetDraft} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">Batal Edit</button>}
                </div>
            </div>
        </div>
    );
};
