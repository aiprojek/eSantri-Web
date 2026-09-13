import React, { useState, useMemo } from 'react';
import { SuratSignatory, PondokSettings, Santri, DigitalAsset, SignatorySourceType } from '../../types';

interface SuratSignatoryEditorProps {
    signatory: SuratSignatory;
    index: number;
    totalSignatories: number;
    settings: PondokSettings;
    currentSantri?: Santri;
    digitalAssets?: DigitalAsset[];
    onChange: (updated: SuratSignatory) => void;
    onRemove: () => void;
}

const JABATAN_PRESETS = [
    'Pimpinan Pondok Pesantren',
    'Mudir Pondok Pesantren',
    'Pengasuh Pondok Pesantren',
    'Kepala Madrasah',
    'Kepala Sekolah',
    'Wali Kelas',
    'Ketua Bagian Pengasuhan',
    'Musyrif Asrama',
    'Ketua Panitia',
    'Sekretaris Pondok',
    'Bendahara Pondok'
];

export const SuratSignatoryEditor: React.FC<SuratSignatoryEditorProps> = ({
    signatory,
    index,
    totalSignatories,
    settings,
    currentSantri,
    digitalAssets = [],
    onChange,
    onRemove
}) => {
    // Current mode: default to 'auto' if sourceType is set, or if nama matches known mudir/guru/tags, otherwise check signatory.mode
    const mode = signatory.mode || (signatory.sourceType ? 'auto' : 'manual');
    const sourceType = signatory.sourceType || 'mudir';

    // List of teachers
    const teachers = useMemo(() => {
        return [...(settings.tenagaPengajar || [])].sort((a, b) => a.nama.localeCompare(b.nama));
    }, [settings.tenagaPengajar]);

    // Mudir teacher
    const mudirTeacher = useMemo(() => {
        if (settings.mudirAamId) {
            return settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId);
        }
        return undefined;
    }, [settings.mudirAamId, settings.tenagaPengajar]);

    // Santri's current Wali Kelas & Musyrif
    const santriWaliKelas = useMemo(() => {
        if (!currentSantri || !currentSantri.rombelId) return undefined;
        const rombel = settings.rombel?.find(r => r.id === currentSantri.rombelId);
        if (!rombel?.waliKelasId) return undefined;
        return settings.tenagaPengajar?.find(t => t.id === rombel.waliKelasId);
    }, [currentSantri, settings.rombel, settings.tenagaPengajar]);

    const santriMusyrif = useMemo(() => {
        if (!currentSantri || !currentSantri.kamarId) return undefined;
        const kamar = settings.kamar?.find(k => k.id === currentSantri.kamarId);
        if (!kamar?.musyrifId) return undefined;
        return settings.tenagaPengajar?.find(t => t.id === kamar.musyrifId);
    }, [currentSantri, settings.kamar, settings.tenagaPengajar]);

    // Digital signature assets
    const ttdAssets = useMemo(() => {
        return digitalAssets.filter(a => a.type === 'ttd');
    }, [digitalAssets]);

    // Handle switching to Auto Mode
    const handleSwitchToAuto = (newSourceType: SignatorySourceType = sourceType) => {
        applySourceType(newSourceType);
    };

    // Handle switching to Manual Mode
    const handleSwitchToManual = () => {
        onChange({
            ...signatory,
            mode: 'manual'
        });
    };

    // Apply source type when in Auto mode
    const applySourceType = (type: SignatorySourceType, specificId?: string | number) => {
        let newNama = signatory.nama;
        let newJabatan = signatory.jabatan;
        let newNip = signatory.nip || '';
        let newSigUrl = signatory.signatureUrl;

        if (type === 'mudir') {
            newNama = mudirTeacher?.nama || settings.namaMudir || 'Pimpinan Pondok Pesantren';
            newNip = mudirTeacher?.nip || '';
            if (!newJabatan || newJabatan === 'Pejabat' || newJabatan.includes('Wali')) {
                newJabatan = 'Pimpinan Pondok Pesantren';
            }
            // Auto match TTD asset
            const matchAsset = ttdAssets.find(a => 
                a.namaPemilik.trim().toLowerCase() === newNama.trim().toLowerCase()
            );
            if (matchAsset) newSigUrl = matchAsset.base64Image;
        } else if (type === 'guru') {
            const targetTeacherId = specificId ? Number(specificId) : (signatory.sourceId ? Number(signatory.sourceId) : (teachers[0]?.id || 0));
            const teacher = teachers.find(t => t.id === targetTeacherId) || teachers[0];
            if (teacher) {
                newNama = teacher.nama;
                newNip = teacher.nip || '';
                // Suggest primary active jabatan
                const activeJabatan = teacher.riwayatJabatan?.find(r => !r.tanggalSelesai)?.jabatan;
                if (activeJabatan) {
                    newJabatan = activeJabatan;
                }
                // Auto match TTD asset
                const matchAsset = ttdAssets.find(a => 
                    a.namaPemilik.trim().toLowerCase() === teacher.nama.trim().toLowerCase()
                );
                if (matchAsset) newSigUrl = matchAsset.base64Image;
            }
        } else if (type === 'wali_kelas') {
            newJabatan = 'Wali Kelas';
            if (santriWaliKelas) {
                newNama = santriWaliKelas.nama;
                newNip = santriWaliKelas.nip || '';
                const matchAsset = ttdAssets.find(a => 
                    a.namaPemilik.trim().toLowerCase() === santriWaliKelas.nama.trim().toLowerCase()
                );
                if (matchAsset) newSigUrl = matchAsset.base64Image;
            } else {
                newNama = '{WALI_KELAS}';
                newNip = '';
            }
        } else if (type === 'musyrif') {
            newJabatan = 'Musyrif Asrama / Pembina Kamar';
            if (santriMusyrif) {
                newNama = santriMusyrif.nama;
                newNip = santriMusyrif.nip || '';
                const matchAsset = ttdAssets.find(a => 
                    a.namaPemilik.trim().toLowerCase() === santriMusyrif.nama.trim().toLowerCase()
                );
                if (matchAsset) newSigUrl = matchAsset.base64Image;
            } else {
                newNama = '{MUSYRIF}';
                newNip = '';
            }
        } else if (type === 'digital_asset') {
            const asset = ttdAssets.find(a => a.id === String(specificId)) || ttdAssets[0];
            if (asset) {
                newNama = asset.namaPemilik;
                newJabatan = asset.jabatan || 'Pejabat Pondok';
                newSigUrl = asset.base64Image;
            }
        }

        onChange({
            ...signatory,
            mode: 'auto',
            sourceType: type,
            sourceId: specificId !== undefined ? specificId : (type === 'guru' ? (teachers[0]?.id || 0) : signatory.sourceId),
            nama: newNama,
            jabatan: newJabatan,
            nip: newNip,
            signatureUrl: newSigUrl,
            showNip: signatory.showNip !== false
        });
    };

    // Quick fill in manual mode without leaving manual mode
    const handleQuickFillFromTeacher = (teacherId: number) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return;
        const activeJabatan = teacher.riwayatJabatan?.find(r => !r.tanggalSelesai)?.jabatan;
        const matchAsset = ttdAssets.find(a => 
            a.namaPemilik.trim().toLowerCase() === teacher.nama.trim().toLowerCase()
        );
        onChange({
            ...signatory,
            nama: teacher.nama,
            nip: teacher.nip || '',
            jabatan: activeJabatan || signatory.jabatan,
            signatureUrl: matchAsset ? matchAsset.base64Image : signatory.signatureUrl
        });
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs transition-all hover:border-teal-300/80">
            {/* Header: Title & Mode Badge & Delete */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-100 text-teal-800 text-[10px] font-black">
                        {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                        Penanda Tangan {index + 1}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        mode === 'auto' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                        <i className={`bi ${mode === 'auto' ? 'bi-lightning-charge-fill text-emerald-600' : 'bi-pencil-fill text-slate-500'} text-[9px]`}></i>
                        {mode === 'auto' ? 'Otomatis (Data)' : 'Manual (Ketik)'}
                    </span>
                </div>

                {totalSignatories > 1 && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Hapus Penanda Tangan Ini"
                    >
                        <i className="bi bi-trash text-xs"></i>
                    </button>
                )}
            </div>

            {/* Mode Switcher Buttons */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                    type="button"
                    onClick={() => handleSwitchToAuto()}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        mode === 'auto'
                            ? 'bg-white text-teal-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <i className="bi bi-cpu text-xs text-teal-600"></i>
                    <span>Otomatis (Ambil Data)</span>
                </button>
                <button
                    type="button"
                    onClick={handleSwitchToManual}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        mode === 'manual'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                >
                    <i className="bi bi-pencil-square text-xs text-slate-500"></i>
                    <span>Manual (Tulis Bebas)</span>
                </button>
            </div>

            {/* AUTOMATIC MODE SETTINGS */}
            {mode === 'auto' ? (
                <div className="space-y-3 pt-1">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            Sumber Data Pejabat
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={() => applySourceType('mudir')}
                                className={`text-left p-2 rounded-xl border text-xs transition-all flex items-center gap-2 ${
                                    sourceType === 'mudir'
                                        ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold shadow-2xs'
                                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <i className="bi bi-person-badge-fill text-teal-600 text-sm"></i>
                                <div className="truncate">
                                    <p className="leading-tight truncate">Pimpinan Pondok</p>
                                    <p className="text-[10px] font-normal text-slate-500 truncate">Mudir 'Aam</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => applySourceType('guru')}
                                className={`text-left p-2 rounded-xl border text-xs transition-all flex items-center gap-2 ${
                                    sourceType === 'guru'
                                        ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold shadow-2xs'
                                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <i className="bi bi-mortarboard-fill text-indigo-600 text-sm"></i>
                                <div className="truncate">
                                    <p className="leading-tight truncate">Data Guru / Staf</p>
                                    <p className="text-[10px] font-normal text-slate-500 truncate">{teachers.length} Staf Terdaftar</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => applySourceType('wali_kelas')}
                                className={`text-left p-2 rounded-xl border text-xs transition-all flex items-center gap-2 ${
                                    sourceType === 'wali_kelas'
                                        ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold shadow-2xs'
                                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <i className="bi bi-people-fill text-amber-600 text-sm"></i>
                                <div className="truncate">
                                    <p className="leading-tight truncate">Wali Kelas Santri</p>
                                    <p className="text-[10px] font-normal text-slate-500 truncate">Sesuai Rombel</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => applySourceType('musyrif')}
                                className={`text-left p-2 rounded-xl border text-xs transition-all flex items-center gap-2 ${
                                    sourceType === 'musyrif'
                                        ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold shadow-2xs'
                                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <i className="bi bi-house-door-fill text-emerald-600 text-sm"></i>
                                <div className="truncate">
                                    <p className="leading-tight truncate">Musyrif Asrama</p>
                                    <p className="text-[10px] font-normal text-slate-500 truncate">Sesuai Kamar</p>
                                </div>
                            </button>
                        </div>

                        {ttdAssets.length > 0 && (
                            <div className="mt-1.5">
                                <button
                                    type="button"
                                    onClick={() => applySourceType('digital_asset')}
                                    className={`w-full text-left p-2 rounded-xl border text-xs transition-all flex items-center justify-between ${
                                        sourceType === 'digital_asset'
                                            ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold shadow-2xs'
                                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <i className="bi bi-patch-check-fill text-teal-600"></i>
                                        <span className="truncate">Aset Tanda Tangan Digital Tersimpan ({ttdAssets.length})</span>
                                    </div>
                                    <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-full font-bold">Resmi</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Specific Source Selectors */}
                    {sourceType === 'guru' && (
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Pilih Guru / Asatidz / Staf
                            </label>
                            <select
                                value={signatory.sourceId || ''}
                                onChange={e => applySourceType('guru', e.target.value)}
                                className="app-select w-full p-2 text-xs rounded-xl font-medium"
                            >
                                <option value="">-- Pilih Guru / Staf --</option>
                                {teachers.map(tp => (
                                    <option key={tp.id} value={tp.id}>
                                        {tp.nama} {tp.nip ? `(NIP: ${tp.nip})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {sourceType === 'digital_asset' && (
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Pilih Aset Tanda Tangan Digital
                            </label>
                            <select
                                value={signatory.sourceId || ''}
                                onChange={e => applySourceType('digital_asset', e.target.value)}
                                className="app-select w-full p-2 text-xs rounded-xl font-medium"
                            >
                                <option value="">-- Pilih Aset Digital --</option>
                                {ttdAssets.map(asset => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.namaPemilik} ({asset.jabatan || 'Pejabat'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {sourceType === 'wali_kelas' && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                            <i className="bi bi-info-circle-fill text-amber-600 text-sm mt-0.5"></i>
                            <div>
                                <p className="font-semibold">Otomatis Wali Kelas Terkait</p>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                    {currentSantri ? (
                                        <>Santri saat ini: <strong>{currentSantri.namaLengkap}</strong> → Wali Kelas: <strong>{santriWaliKelas ? santriWaliKelas.nama : 'Belum diset di rombel'}</strong></>
                                    ) : (
                                        'Nama dan NIP akan otomatis terisi sesuai wali kelas dari masing-masing santri yang dipilih.'
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {sourceType === 'musyrif' && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-900 flex items-start gap-2">
                            <i className="bi bi-info-circle-fill text-emerald-600 text-sm mt-0.5"></i>
                            <div>
                                <p className="font-semibold">Otomatis Musyrif Asrama Terkait</p>
                                <p className="text-[11px] text-emerald-800 mt-0.5">
                                    {currentSantri ? (
                                        <>Santri saat ini: <strong>{currentSantri.namaLengkap}</strong> → Musyrif: <strong>{santriMusyrif ? santriMusyrif.nama : 'Belum diset di kamar'}</strong></>
                                    ) : (
                                        'Nama dan NIP akan otomatis terisi sesuai musyrif kamar santri yang bersangkutan.'
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Summary of resolved data */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Nama Pejabat:</span>
                            <span className="font-bold text-slate-800 text-right truncate max-w-[200px]" title={signatory.nama}>
                                {signatory.nama || '-'}
                            </span>
                        </div>
                        {signatory.nip && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium">NIP / NIY:</span>
                                <span className="font-mono text-slate-700">{signatory.nip}</span>
                            </div>
                        )}

                        {/* Editable Jabatan in Auto Mode */}
                        <div className="pt-1 border-t border-slate-200/80">
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Jabatan di Surat (Bisa disesuaikan):
                            </label>
                            <input
                                type="text"
                                value={signatory.jabatan}
                                onChange={e => onChange({ ...signatory, jabatan: e.target.value })}
                                placeholder="cth: Pimpinan Pondok Pesantren"
                                className="app-input w-full p-2 text-xs rounded-lg font-semibold text-slate-800 bg-white"
                            />
                        </div>

                        {/* Digital Signature image toggle */}
                        {signatory.signatureUrl && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                                <div className="flex items-center gap-2">
                                    <img 
                                        src={signatory.signatureUrl} 
                                        alt="TTD" 
                                        className="h-8 max-w-[80px] object-contain mix-blend-darken bg-white border border-slate-200 rounded p-0.5" 
                                    />
                                    <span className="text-[11px] text-slate-600">TTD Digital Terpasang</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onChange({ ...signatory, signatureUrl: undefined })}
                                    className="text-[11px] text-red-600 hover:underline"
                                >
                                    Lepas TTD
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Copy to Manual Mode Button */}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                onChange({
                                    ...signatory,
                                    mode: 'manual'
                                });
                            }}
                            className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline"
                        >
                            <i className="bi bi-pencil"></i>
                            <span>Jadikan Manual untuk Edit Teks Bebas</span>
                        </button>
                    </div>
                </div>
            ) : (
                /* MANUAL MODE SETTINGS */
                <div className="space-y-2.5 pt-1">
                    {/* Quick populate helper */}
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                            <i className="bi bi-lightning-charge-fill text-amber-500"></i>
                            Isi cepat dari data:
                        </span>
                        <select
                            onChange={e => {
                                if (e.target.value === 'mudir') {
                                    onChange({
                                        ...signatory,
                                        nama: mudirTeacher?.nama || settings.namaMudir || '',
                                        nip: mudirTeacher?.nip || '',
                                        jabatan: 'Pimpinan Pondok Pesantren'
                                    });
                                } else if (e.target.value) {
                                    handleQuickFillFromTeacher(Number(e.target.value));
                                }
                                e.target.value = '';
                            }}
                            className="app-select py-1 px-2 text-[11px] rounded-lg max-w-[170px]"
                            defaultValue=""
                        >
                            <option value="" disabled>-- Pilih Staf / Mudir --</option>
                            <option value="mudir">👑 Mudir: {mudirTeacher?.nama || settings.namaMudir || 'Pimpinan'}</option>
                            {teachers.map(tp => (
                                <option key={tp.id} value={tp.id}>
                                    {tp.nama}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-semibold text-slate-600">
                                Jabatan Pejabat
                            </label>
                            <div className="flex gap-1 overflow-x-auto max-w-[200px]">
                                {['Pimpinan', 'Kepala Madrasah', 'Wali Kelas'].map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => onChange({ ...signatory, jabatan: preset })}
                                        className="text-[9px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 transition-colors whitespace-nowrap"
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input
                            type="text"
                            value={signatory.jabatan}
                            onChange={e => onChange({ ...signatory, jabatan: e.target.value })}
                            placeholder="cth: Pimpinan Pondok Pesantren"
                            className="app-input w-full p-2 text-xs rounded-lg font-semibold text-slate-800"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Nama Lengkap Pejabat
                        </label>
                        <input
                            type="text"
                            value={signatory.nama}
                            onChange={e => onChange({ ...signatory, nama: e.target.value })}
                            placeholder="cth: KH. Ahmad Dahlan, Lc."
                            className="app-input w-full p-2 text-xs rounded-lg text-slate-800 font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            NIP / NIY Pejabat (Opsional)
                        </label>
                        <input
                            type="text"
                            value={signatory.nip || ''}
                            onChange={e => onChange({ ...signatory, nip: e.target.value })}
                            placeholder="cth: 19820512 200801 1 003"
                            className="app-input w-full p-2 text-xs rounded-lg text-slate-700 font-mono"
                        />
                    </div>

                    {/* Signature Image selection in manual mode */}
                    {ttdAssets.length > 0 && (
                        <div className="pt-1 border-t border-slate-100">
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Tanda Tangan Digital (Opsional)
                            </label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={signatory.signatureUrl ? 'has-sig' : ''}
                                    onChange={e => {
                                        const asset = ttdAssets.find(a => a.id === e.target.value);
                                        if (asset) {
                                            onChange({ ...signatory, signatureUrl: asset.base64Image });
                                        } else {
                                            onChange({ ...signatory, signatureUrl: undefined });
                                        }
                                    }}
                                    className="app-select flex-1 p-1.5 text-xs rounded-lg"
                                >
                                    <option value="">-- Tanpa Gambar TTD --</option>
                                    {ttdAssets.map(asset => (
                                        <option key={asset.id} value={asset.id}>
                                            {asset.namaPemilik} ({asset.jabatan || 'Aset'})
                                        </option>
                                    ))}
                                </select>
                                {signatory.signatureUrl && (
                                    <img 
                                        src={signatory.signatureUrl} 
                                        alt="TTD" 
                                        className="h-8 max-w-[60px] object-contain mix-blend-darken border border-slate-200 rounded p-0.5" 
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
