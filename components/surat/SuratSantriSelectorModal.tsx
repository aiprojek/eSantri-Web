import React, { useState, useMemo } from 'react';
import { Santri, PondokSettings, Kelas, Rombel } from '../../types';
import { SantriFilterBar } from '../common/SantriFilterBar';

interface SuratSantriSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    generationMode: 'single' | 'bulk';
    onModeChange: (mode: 'single' | 'bulk') => void;
    selectedSantriId: number | '';
    onSelectSingle: (santriId: number | '') => void;
    bulkSelectedIds: number[];
    onToggleBulkSelectOne: (id: number) => void;
    onToggleBulkSelectAll: (filteredIds: number[]) => void;
    santriList: Santri[];
    settings: PondokSettings;
}

export const SuratSantriSelectorModal: React.FC<SuratSantriSelectorModalProps> = ({
    isOpen,
    onClose,
    generationMode,
    onModeChange,
    selectedSantriId,
    onSelectSingle,
    bulkSelectedIds,
    onToggleBulkSelectOne,
    onToggleBulkSelectAll,
    santriList,
    settings
}) => {
    const [search, setSearch] = useState('');
    const [filterJenjangId, setFilterJenjangId] = useState<string>('');
    const [filterKelasId, setFilterKelasId] = useState<string>('');
    const [filterRombelId, setFilterRombelId] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('Aktif');

    const filteredSantris = useMemo(() => {
        return santriList.filter(s => {
            if (filterJenjangId && s.jenjangId !== parseInt(filterJenjangId)) return false;
            if (filterKelasId && s.kelasId !== parseInt(filterKelasId)) return false;
            if (filterRombelId && s.rombelId !== parseInt(filterRombelId)) return false;
            if (filterStatus && s.status !== filterStatus) return false;
            if (search) {
                const q = search.toLowerCase();
                const matchName = s.namaLengkap.toLowerCase().includes(q);
                const matchNis = s.nis.toLowerCase().includes(q);
                const matchNisn = s.nisn?.toLowerCase().includes(q);
                if (!matchName && !matchNis && !matchNisn) return false;
            }
            return true;
        }).sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
    }, [santriList, filterJenjangId, filterKelasId, filterRombelId, filterStatus, search]);

    if (!isOpen) return null;

    const filteredIds = filteredSantris.map(s => s.id);
    const isAllFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => bulkSelectedIds.includes(id));

    return (
        <div className="app-overlay fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="app-modal flex h-[85vh] w-full max-w-3xl flex-col rounded-[24px] bg-white shadow-2xl overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-app-border bg-slate-50 px-6 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                                <i className="bi bi-people text-sm"></i>
                            </span>
                            <h3 className="text-base font-bold text-slate-800">Pilih Penerima Surat</h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {generationMode === 'single'
                                ? 'Pilih satu santri atau buat surat untuk umum (tanpa nama penerima).'
                                : `Mode Mail Merge: ${bulkSelectedIds.length} santri terpilih untuk dicetak massal.`}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Mode Segmented Toggle */}
                        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => onModeChange('single')}
                                className={`rounded-lg px-3 py-1 font-medium transition-all ${
                                    generationMode === 'single' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <i className="bi bi-person mr-1"></i> Perorangan
                            </button>
                            <button
                                type="button"
                                onClick={() => onModeChange('bulk')}
                                className={`rounded-lg px-3 py-1 font-medium transition-all ${
                                    generationMode === 'bulk' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <i className="bi bi-people mr-1"></i> Mail Merge Massal
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="app-button-ghost h-8 w-8 rounded-full p-0 text-slate-400 hover:text-slate-600"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="border-b border-app-border bg-white px-6 py-3 space-y-2.5">
                    <div className="relative">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari nama santri, NIS, atau NISN..."
                            className="app-input w-full pl-8 pr-3 py-2 text-xs rounded-xl"
                        />
                    </div>

                    <SantriFilterBar
                        settings={settings}
                        filters={{ search: '', jenjang: filterJenjangId, kelas: filterKelasId, rombel: filterRombelId, status: filterStatus }}
                        onChange={(next) => {
                            setFilterJenjangId(next.jenjang || '');
                            setFilterKelasId(next.kelas || '');
                            setFilterRombelId(next.rombel || '');
                            setFilterStatus(next.status || '');
                        }}
                        title="Filter Surat"
                        resultCount={filteredSantris.length}
                        showSearch={false}
                        showGender={false}
                        mobileDrawer={false}
                        className="bg-slate-50 rounded-xl p-2 border border-slate-200/80"
                    />

                    {generationMode === 'bulk' && (
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-semibold text-slate-600">
                                {bulkSelectedIds.length} dari {santriList.length} santri dipilih ({filteredSantris.length} tampil)
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onToggleBulkSelectAll(filteredIds)}
                                    className="text-xs font-medium text-teal-700 hover:text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/80"
                                >
                                    {isAllFilteredSelected ? 'Batal Pilih Tampilan' : 'Pilih Semua Sesuai Filter'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* List Container */}
                <div className="app-scrollbar flex-1 overflow-y-auto p-6 space-y-2">
                    {generationMode === 'single' && (
                        <button
                            type="button"
                            onClick={() => {
                                onSelectSingle('');
                                onClose();
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                                selectedSantriId === ''
                                    ? 'border-teal-500 bg-teal-50/70 text-teal-900 font-semibold ring-1 ring-teal-400'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                    <i className="bi bi-file-earmark-text"></i>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold">Surat Umum / Tanpa Nama Tertentu</div>
                                    <div className="text-xs text-slate-400">Variabel nama santri diisi garis titik-titik (blanko santri bebas)</div>
                                </div>
                            </div>
                            {selectedSantriId === '' && (
                                <span className="text-xs text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full font-bold">Terpilih ✓</span>
                            )}
                        </button>
                    )}

                    {filteredSantris.map(santri => {
                        const isSelected = generationMode === 'single'
                            ? selectedSantriId === santri.id
                            : bulkSelectedIds.includes(santri.id);

                        const kelasNama = settings.kelas.find((k: Kelas) => k.id === santri.kelasId)?.nama || '-';
                        const rombelNama = settings.rombel.find((r: Rombel) => r.id === santri.rombelId)?.nama || '';

                        return (
                            <div
                                key={santri.id}
                                onClick={() => {
                                    if (generationMode === 'single') {
                                        onSelectSingle(santri.id);
                                        onClose();
                                    } else {
                                        onToggleBulkSelectOne(santri.id);
                                    }
                                }}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                    isSelected
                                        ? 'border-teal-500 bg-teal-50/60 text-teal-900 ring-1 ring-teal-400/80 shadow-2xs'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {generationMode === 'bulk' ? (
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}} // Handled by container onClick
                                            className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                                        />
                                    ) : (
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold ${
                                            isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {santri.namaLengkap.charAt(0)}
                                        </div>
                                    )}

                                    <div>
                                        <div className="text-xs font-bold text-slate-900">{santri.namaLengkap}</div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                            <span>NIS: <strong className="font-mono text-slate-700">{santri.nis}</strong></span>
                                            <span>•</span>
                                            <span>Kelas: {kelasNama} {rombelNama}</span>
                                            <span>•</span>
                                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                                                santri.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {santri.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {generationMode === 'single' && isSelected && (
                                    <span className="text-xs text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full font-bold">Terpilih ✓</span>
                                )}
                            </div>
                        );
                    })}

                    {filteredSantris.length === 0 && (
                        <div className="py-12 text-center text-slate-400">
                            <i className="bi bi-people text-3xl mb-2 block text-slate-300"></i>
                            <p className="text-xs font-medium">Tidak ada data santri yang cocok dengan filter / pencarian.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-app-border bg-slate-50 px-6 py-3.5">
                    <div className="text-xs text-slate-500 font-medium">
                        {generationMode === 'bulk'
                            ? `${bulkSelectedIds.length} santri akan dibuatkan surat masing-masing.`
                            : selectedSantriId
                                ? `1 santri terpilih.`
                                : 'Format surat umum tanpa nama santri.'}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="app-button-primary px-5 py-2 text-xs rounded-xl font-semibold shadow-xs"
                    >
                        Selesai Memilih
                    </button>
                </div>
            </div>
        </div>
    );
};
