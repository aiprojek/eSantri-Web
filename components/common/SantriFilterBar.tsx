import React, { useMemo, useState } from 'react';
import { PondokSettings } from '../../types';
import { MobileFilterDrawer } from './MobileFilterDrawer';

export interface SantriFilterState {
    search?: string;
    jenjang?: string;
    kelas?: string;
    rombel?: string;
    status?: string;
    gender?: string;
}

export interface SantriFilterOption {
    value: string;
    label: string;
}

interface SantriFilterBarProps<TFilters extends SantriFilterState> {
    settings: PondokSettings;
    filters: TFilters;
    onChange: (filters: TFilters) => void;
    title?: string;
    searchPlaceholder?: string;
    resultCount?: number;
    resultLabel?: string;
    showSearch?: boolean;
    showJenjang?: boolean;
    showKelas?: boolean;
    showRombel?: boolean;
    showStatus?: boolean;
    showGender?: boolean;
    statusLabel?: string;
    genderLabel?: string;
    statusOptions?: SantriFilterOption[];
    genderOptions?: SantriFilterOption[];
    extraDesktop?: React.ReactNode;
    extraMobile?: React.ReactNode;
    mobileDrawer?: boolean;
    className?: string;
}

const DEFAULT_STATUS_OPTIONS: SantriFilterOption[] = [
    { value: '', label: 'Semua Status' },
    { value: 'Aktif', label: 'Aktif' },
    { value: 'Hiatus', label: 'Hiatus' },
    { value: 'Lulus', label: 'Lulus' },
    { value: 'Keluar/Pindah', label: 'Keluar/Pindah' },
    { value: 'Masuk', label: 'Masuk' },
    { value: 'Baru', label: 'Baru' },
    { value: 'Diterima', label: 'Diterima' },
    { value: 'Cadangan', label: 'Cadangan' },
    { value: 'Ditolak', label: 'Ditolak' },
];

const DEFAULT_GENDER_OPTIONS: SantriFilterOption[] = [
    { value: '', label: 'Semua Gender' },
    { value: 'Laki-laki', label: 'Laki-laki' },
    { value: 'Perempuan', label: 'Perempuan' },
];

const mobileLabelClass = 'app-label mb-1.5 ml-1 block';
const mobileSelectClass = 'app-select rounded-[20px] p-4 text-base font-semibold disabled:opacity-50';
const desktopLabelClass = 'app-label mb-1.5 block pl-1 min-h-[1.25rem] truncate whitespace-nowrap';
const desktopSelectClass = 'app-select h-10 text-sm font-semibold disabled:opacity-50';

export function SantriFilterBar<TFilters extends SantriFilterState>({
    settings,
    filters,
    onChange,
    title = 'Filter Santri',
    searchPlaceholder = 'Cari Nama atau NIS...',
    resultCount,
    resultLabel = 'Santri',
    showSearch = true,
    showJenjang = true,
    showKelas = true,
    showRombel = true,
    showStatus = true,
    showGender = false,
    statusLabel = 'Status Santri',
    genderLabel = 'Gender',
    statusOptions = DEFAULT_STATUS_OPTIONS,
    genderOptions = DEFAULT_GENDER_OPTIONS,
    extraDesktop,
    extraMobile,
    mobileDrawer = true,
    className = '',
}: SantriFilterBarProps<TFilters>) {
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const desktopFilterCount =
        [showJenjang, showKelas, showRombel, showStatus, showGender].filter(Boolean).length +
        (extraDesktop ? 1 : 0);

    const availableKelas = useMemo(() => {
        if (!filters.jenjang) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === parseInt(filters.jenjang || '', 10));
    }, [filters.jenjang, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (!filters.kelas) return settings.rombel.filter(r => availableKelas.some(k => k.id === r.kelasId));
        return settings.rombel.filter(r => r.kelasId === parseInt(filters.kelas || '', 10));
    }, [filters.kelas, settings.rombel, availableKelas]);

    const updateFilters = (key: keyof SantriFilterState, value: string) => {
        const nextFilters = { ...filters, [key]: value } as TFilters;
        if (key === 'jenjang') {
            nextFilters.kelas = '' as TFilters['kelas'];
            nextFilters.rombel = '' as TFilters['rombel'];
        } else if (key === 'kelas') {
            nextFilters.rombel = '' as TFilters['rombel'];
        }
        onChange(nextFilters);
    };

    const resetFilters = () => {
        const nextFilters = { ...filters } as TFilters;
        if (showSearch) nextFilters.search = '' as TFilters['search'];
        if (showJenjang) nextFilters.jenjang = '' as TFilters['jenjang'];
        if (showKelas) nextFilters.kelas = '' as TFilters['kelas'];
        if (showRombel) nextFilters.rombel = '' as TFilters['rombel'];
        if (showStatus) nextFilters.status = '' as TFilters['status'];
        if (showGender) nextFilters.gender = '' as TFilters['gender'];
        onChange(nextFilters);
    };

    const renderSearchInput = (mobile = false) => (
        <div className="relative">
            <i className={`bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ${mobile ? '' : ''}`}></i>
            <input
                type="text"
                placeholder={searchPlaceholder}
                value={filters.search || ''}
                onChange={e => updateFilters('search', e.target.value)}
                className={mobile
                    ? 'app-input w-full rounded-[20px] py-3 pl-9 pr-3 text-sm font-semibold'
                    : 'app-input w-full py-2.5 pl-9 pr-3 text-sm font-semibold'}
            />
        </div>
    );

    const renderCoreFields = (mobile = false) => (
        <>
            {showJenjang && (
                <div>
                    <label className={mobile ? mobileLabelClass : desktopLabelClass}>
                        Jenjang / Marhalah
                    </label>
                    <select
                        value={filters.jenjang || ''}
                        onChange={e => updateFilters('jenjang', e.target.value)}
                        className={mobile ? mobileSelectClass : desktopSelectClass}
                    >
                        <option value="">Semua Jenjang</option>
                        {settings.jenjang.map(j => (
                            <option key={j.id} value={j.id}>{j.nama}</option>
                        ))}
                    </select>
                </div>
            )}
            {showKelas && (
                <div>
                    <label className={mobile ? mobileLabelClass : desktopLabelClass}>
                        Kelas
                    </label>
                    <select
                        value={filters.kelas || ''}
                        onChange={e => updateFilters('kelas', e.target.value)}
                        disabled={!filters.jenjang}
                        className={mobile ? mobileSelectClass : desktopSelectClass}
                    >
                        <option value="">Semua Kelas</option>
                        {availableKelas.map(k => (
                            <option key={k.id} value={k.id}>{k.nama}</option>
                        ))}
                    </select>
                </div>
            )}
            {showRombel && (
                <div>
                    <label className={mobile ? mobileLabelClass : desktopLabelClass}>
                        Rombel
                    </label>
                    <select
                        value={filters.rombel || ''}
                        onChange={e => updateFilters('rombel', e.target.value)}
                        disabled={!filters.kelas}
                        className={mobile ? mobileSelectClass : desktopSelectClass}
                    >
                        <option value="">Semua Rombel</option>
                        {availableRombel.map(r => (
                            <option key={r.id} value={r.id}>{r.nama}</option>
                        ))}
                    </select>
                </div>
            )}
            {showStatus && (
                <div>
                    <label className={mobile ? mobileLabelClass : desktopLabelClass}>
                        {statusLabel}
                    </label>
                    <select
                        value={filters.status || ''}
                        onChange={e => updateFilters('status', e.target.value)}
                        className={mobile ? mobileSelectClass : desktopSelectClass}
                    >
                        {statusOptions.map(option => (
                            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            )}
            {showGender && (
                <div>
                    <label className={mobile ? mobileLabelClass : desktopLabelClass}>
                        {genderLabel}
                    </label>
                    <select
                        value={filters.gender || ''}
                        onChange={e => updateFilters('gender', e.target.value)}
                        className={mobile ? mobileSelectClass : desktopSelectClass}
                    >
                        {genderOptions.map(option => (
                            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            )}
        </>
    );

    return (
        <div className={`app-panel rounded-panel p-4 ${className}`}>
            {mobileDrawer ? (
                <div className="md:hidden flex items-center gap-2">
                    {showSearch && <div className="min-w-0 flex-1">{renderSearchInput(true)}</div>}
                    <button
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className="app-button-secondary h-11 shrink-0 px-4 py-2 text-sm"
                    >
                        <i className="bi bi-funnel-fill"></i>
                        <span>Filter</span>
                    </button>
                </div>
            ) : showSearch ? (
                <div className="md:hidden">{renderSearchInput(true)}</div>
            ) : null}

            <div className={`${mobileDrawer ? 'hidden md:block' : 'block'} mt-4 space-y-4 md:mt-0`}>
                {showSearch && (
                    <div>
                        <label className="app-label mb-1.5 hidden pl-1 md:block">
                            Cari Santri
                        </label>
                        {renderSearchInput(false)}
                    </div>
                )}

                {desktopFilterCount > 0 && (
                    <div
                        className="grid gap-4"
                        style={{ gridTemplateColumns: `repeat(${desktopFilterCount}, minmax(0, 1fr))` }}
                    >
                        {renderCoreFields(false)}
                        {extraDesktop && <div>{extraDesktop}</div>}
                    </div>
                )}
            </div>

            {mobileDrawer && (
                <MobileFilterDrawer
                    isOpen={isFilterDrawerOpen}
                    onClose={() => setIsFilterDrawerOpen(false)}
                    title={title}
                    onReset={resetFilters}
                >
                    <div className="space-y-6">
                        {showSearch && (
                            <div className="app-panel-soft space-y-4 rounded-[2rem] p-6">
                                <div>
                                    <label className={mobileLabelClass}>Cari Santri</label>
                                    {renderSearchInput(true)}
                                </div>
                            </div>
                        )}
                        <div className="app-panel-soft space-y-4 rounded-[2rem] p-6">
                            {renderCoreFields(true)}
                            {extraMobile}
                        </div>
                        {typeof resultCount === 'number' && (
                            <div className="rounded-[2rem] border border-teal-100 bg-teal-50 p-6 text-center">
                                <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-app-textMuted">Hasil Filter</div>
                                <div className="text-3xl font-black text-app-text">
                                    {resultCount} <span className="ml-1 text-sm font-bold uppercase tracking-widest text-app-textMuted">{resultLabel}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </MobileFilterDrawer>
            )}
        </div>
    );
}
