
import React, { useState, useEffect, useMemo } from 'react';
import { PondokSettings } from '../types';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { TabTenagaPendidik } from './datamaster/TabTenagaPendidik';
import { TabStrukturPendidikan } from './datamaster/TabStrukturPendidikan';
import { TabMataPelajaran } from './datamaster/TabMataPelajaran';
import { TabTahunAjaran } from './datamaster/TabTahunAjaran';
import { TabFasilitasAsrama } from './datamaster/TabFasilitasAsrama';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { getDefaultAcademicYear } from '../utils/academicYear';

const DataMaster: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation, showToast, currentUser } = useAppContext();
    const { santriList } = useSantriContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    const [activeTab, setActiveTab] = useState<'pendidik' | 'struktur' | 'mapel' | 'tahun_ajaran' | 'asrama'>('pendidik');
    const [isSaving, setIsSaving] = useState(false);
    const hasUnsavedChanges = useMemo(() => {
        try {
            return JSON.stringify(localSettings) !== JSON.stringify(settings);
        } catch {
            return false;
        }
    }, [localSettings, settings]);

    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.datamaster === 'write';
    const [showAuditDetail, setShowAuditDetail] = useState(false);

    // Audit Integritas Data Master Otomatis
    const auditStats = useMemo(() => {
        const rombelTanpaWali = localSettings.rombel.filter(r => !r.waliKelasId);
        const mapelTanpaPengampu = localSettings.mataPelajaran.filter(m => 
            !localSettings.tenagaPengajar.some(t => t.kompetensiMapelIds?.includes(m.id))
        );
        const jenjangTanpaKode = localSettings.jenjang.filter(j => !j.kode || !j.kode.trim());
        const pendidikTanpaKontak = localSettings.tenagaPengajar.filter(t => !t.telepon || !t.telepon.trim());
        const kamarOverCapacity = (localSettings.kamar || []).filter(k => {
            const count = santriList.filter(s => s.kamarId === k.id && s.status === 'Aktif').length;
            return count > (k.kapasitas || 0);
        });

        const totalPendidik = localSettings.tenagaPengajar.filter(t => t.jenisPegawai !== 'kependidikan').length;
        const totalKependidikan = localSettings.tenagaPengajar.filter(t => t.jenisPegawai === 'kependidikan').length;

        const totalIssues = rombelTanpaWali.length + mapelTanpaPengampu.length + jenjangTanpaKode.length + pendidikTanpaKontak.length + kamarOverCapacity.length;

        return {
            rombelTanpaWali,
            mapelTanpaPengampu,
            jenjangTanpaKode,
            pendidikTanpaKontak,
            kamarOverCapacity,
            totalPendidik,
            totalKependidikan,
            totalIssues,
            isHealthy: totalIssues === 0,
        };
    }, [localSettings, santriList]);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleInputChange = <K extends keyof PondokSettings>(key: K, value: PondokSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = () => {
        if (!canWrite) return;
        showConfirmation(
            'Simpan Data Akademik',
            'Apakah Anda yakin ingin menyimpan semua perubahan data akademik ini?',
            async () => {
                setIsSaving(true);
                try {
                    const activeAcademicYear = getDefaultAcademicYear(localSettings);
                    const payload = {
                        ...localSettings,
                        psbConfig: {
                            ...localSettings.psbConfig,
                            tahunAjaranAktif: activeAcademicYear,
                        },
                    };
                    await onSaveSettings(payload);
                    showToast('Data Akademik berhasil disimpan!', 'success');
                } catch (error) {
                    console.error("Failed to save settings:", error);
                    showToast('Gagal menyimpan data.', 'error');
                } finally {
                    setIsSaving(false);
                }
            },
            { confirmText: 'Ya, Simpan', confirmColor: 'green' }
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Pendidikan"
                title="Data Akademik (Data Master)"
                description={hasUnsavedChanges
                    ? "Kelola data akademik. Ada perubahan yang belum disimpan."
                    : "Kelola tenaga pendidik, struktur pendidikan, dan mata pelajaran dari pusat data akademik yang lebih rapi."}
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={(next) => setActiveTab(next as any)}
                        tabs={[
                            { value: 'pendidik', label: 'Tenaga Pendidik', icon: 'bi-person-badge-fill' },
                            { value: 'struktur', label: 'Struktur Pendidikan', icon: 'bi-diagram-3-fill' },
                            { value: 'mapel', label: 'Mata Pelajaran', icon: 'bi-book-half' },
                            { value: 'tahun_ajaran', label: 'Tahun Ajaran', icon: 'bi-calendar-range-fill' },
                            { value: 'asrama', label: 'Fasilitas & Asrama', icon: 'bi-buildings-fill' },
                        ]}
                    />
                }
            />

            {/* Audit Status & Health Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${auditStats.isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                            <i className={`bi ${auditStats.isHealthy ? 'bi-shield-check' : 'bi-exclamation-triangle-fill'} text-lg`}></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-800 text-sm">Status Audit Integritas Data Master</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${auditStats.isHealthy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                    {auditStats.isHealthy ? 'Optimal & Terhubung' : `${auditStats.totalIssues} Perhatian`}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {auditStats.isHealthy 
                                    ? 'Semua data master (rombel, wali kelas, guru mapel, kode NIS, dan asrama) terhubung optimal.' 
                                    : 'Ditemukan beberapa data master yang belum lengkap atau belum terpetakan sempurna.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                            type="button"
                            onClick={() => setShowAuditDetail(!showAuditDetail)}
                            className="text-xs text-gray-600 hover:text-teal-700 font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 transition"
                        >
                            <i className="bi bi-clipboard2-pulse"></i>
                            <span>{showAuditDetail ? 'Tutup Detail' : 'Detail Audit'}</span>
                            <i className={`bi ${showAuditDetail ? 'bi-chevron-up' : 'bi-chevron-down'} text-[10px]`}></i>
                        </button>
                    </div>
                </div>

                {showAuditDetail && (
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
                        <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${auditStats.rombelTanpaWali.length > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'}`}>
                            <div>
                                <span className="font-bold block flex items-center gap-1">
                                    <i className={`bi ${auditStats.rombelTanpaWali.length > 0 ? 'bi-exclamation-circle' : 'bi-check-circle-fill'}`}></i>
                                    Wali Kelas Rombel
                                </span>
                                <span className="text-[11px] mt-0.5 block">
                                    {auditStats.rombelTanpaWali.length > 0 
                                        ? `${auditStats.rombelTanpaWali.length} rombel belum ada wali` 
                                        : 'Semua rombel ada wali'}
                                </span>
                            </div>
                            {auditStats.rombelTanpaWali.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('struktur')}
                                    className="mt-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-2 rounded flex items-center justify-center gap-1"
                                >
                                    <span>Buka Struktur</span>
                                    <i className="bi bi-arrow-right"></i>
                                </button>
                            )}
                        </div>

                        <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${auditStats.mapelTanpaPengampu.length > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'}`}>
                            <div>
                                <span className="font-bold block flex items-center gap-1">
                                    <i className={`bi ${auditStats.mapelTanpaPengampu.length > 0 ? 'bi-exclamation-circle' : 'bi-check-circle-fill'}`}></i>
                                    Pengampu Mapel
                                </span>
                                <span className="text-[11px] mt-0.5 block">
                                    {auditStats.mapelTanpaPengampu.length > 0 
                                        ? `${auditStats.mapelTanpaPengampu.length} mapel belum ada guru` 
                                        : 'Semua mapel ada guru'}
                                </span>
                            </div>
                            {auditStats.mapelTanpaPengampu.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('mapel')}
                                    className="mt-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-2 rounded flex items-center justify-center gap-1"
                                >
                                    <span>Plot Guru</span>
                                    <i className="bi bi-arrow-right"></i>
                                </button>
                            )}
                        </div>

                        <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${auditStats.jenjangTanpaKode.length > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'}`}>
                            <div>
                                <span className="font-bold block flex items-center gap-1">
                                    <i className={`bi ${auditStats.jenjangTanpaKode.length > 0 ? 'bi-exclamation-circle' : 'bi-check-circle-fill'}`}></i>
                                    Kode Jenjang (NIS)
                                </span>
                                <span className="text-[11px] mt-0.5 block">
                                    {auditStats.jenjangTanpaKode.length > 0 
                                        ? `${auditStats.jenjangTanpaKode.length} jenjang tanpa kode` 
                                        : 'Semua jenjang ada kode'}
                                </span>
                            </div>
                            {auditStats.jenjangTanpaKode.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('struktur')}
                                    className="mt-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-2 rounded flex items-center justify-center gap-1"
                                >
                                    <span>Isi Kode</span>
                                    <i className="bi bi-arrow-right"></i>
                                </button>
                            )}
                        </div>

                        <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${auditStats.pendidikTanpaKontak.length > 0 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'}`}>
                            <div>
                                <span className="font-bold block flex items-center gap-1">
                                    <i className={`bi ${auditStats.pendidikTanpaKontak.length > 0 ? 'bi-exclamation-circle' : 'bi-check-circle-fill'}`}></i>
                                    Kontak Pendidik
                                </span>
                                <span className="text-[11px] mt-0.5 block">
                                    {auditStats.pendidikTanpaKontak.length > 0 
                                        ? `${auditStats.pendidikTanpaKontak.length} guru/staf tanpa HP` 
                                        : 'Semua kontak lengkap'}
                                </span>
                            </div>
                            {auditStats.pendidikTanpaKontak.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('pendidik')}
                                    className="mt-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-2 rounded flex items-center justify-center gap-1"
                                >
                                    <span>Lengkapi No HP</span>
                                    <i className="bi bi-arrow-right"></i>
                                </button>
                            )}
                        </div>

                        <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${auditStats.kamarOverCapacity.length > 0 ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'}`}>
                            <div>
                                <span className="font-bold block flex items-center gap-1">
                                    <i className={`bi ${auditStats.kamarOverCapacity.length > 0 ? 'bi-exclamation-circle' : 'bi-check-circle-fill'}`}></i>
                                    Kapasitas Asrama
                                </span>
                                <span className="text-[11px] mt-0.5 block">
                                    {auditStats.kamarOverCapacity.length > 0 
                                        ? `${auditStats.kamarOverCapacity.length} kamar over-kapasitas` 
                                        : 'Kapasitas asrama aman'}
                                </span>
                            </div>
                            {auditStats.kamarOverCapacity.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('asrama')}
                                    className="mt-2 text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2 rounded flex items-center justify-center gap-1"
                                >
                                    <span>Atur Kamar</span>
                                    <i className="bi bi-arrow-right"></i>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Unsaved Changes Banner */}
            {hasUnsavedChanges && canWrite && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 sm:p-4 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <i className="bi bi-exclamation-circle-fill text-amber-600 text-lg shrink-0"></i>
                        <div className="text-xs sm:text-sm">
                            <span className="font-bold">Ada perubahan data master belum disimpan!</span>
                            <p className="text-amber-700 text-xs mt-0.5">Perubahan masih berada di memori aplikasi. Klik simpan agar tersimpan permanen di database lokal.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                    >
                        {isSaving ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-save"></i>}
                        <span>Simpan Sekarang</span>
                    </button>
                </div>
            )}
            {!canWrite && (
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200 flex items-center">
                    <i className="bi bi-eye-fill mr-2"></i> Mode Lihat Saja: Anda tidak memiliki akses untuk mengubah data master.
                </div>
            )}

            <div className="space-y-6">
                {activeTab === 'pendidik' && (
                    <TabTenagaPendidik 
                        localSettings={localSettings} 
                        handleInputChange={handleInputChange} 
                        canWrite={canWrite} 
                    />
                )}
                {activeTab === 'struktur' && (
                    <TabStrukturPendidikan 
                        localSettings={localSettings} 
                        handleInputChange={handleInputChange} 
                        canWrite={canWrite} 
                    />
                )}
                {activeTab === 'mapel' && (
                    <TabMataPelajaran 
                        localSettings={localSettings} 
                        handleInputChange={handleInputChange} 
                        canWrite={canWrite} 
                        source="datamaster"
                    />
                )}
                {activeTab === 'tahun_ajaran' && (
                    <TabTahunAjaran
                        localSettings={localSettings}
                        handleInputChange={handleInputChange}
                        canWrite={canWrite}
                    />
                )}
                {activeTab === 'asrama' && (
                    <TabFasilitasAsrama
                        localSettings={localSettings}
                        handleInputChange={handleInputChange}
                        canWrite={canWrite}
                    />
                )}
            </div>

            {canWrite && (
                 <div className="mt-6 flex justify-end sticky bottom-4 z-10">
                    <button onClick={handleSaveSettings} disabled={isSaving || !hasUnsavedChanges} className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:ring-teal-300 font-medium rounded-lg text-sm px-8 py-3 flex items-center justify-center min-w-[190px] disabled:bg-teal-400 disabled:cursor-not-allowed shadow-lg transition-transform hover:-translate-y-1">
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-save-fill mr-2"></i> {hasUnsavedChanges ? 'Simpan Perubahan' : 'Tidak Ada Perubahan'}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default DataMaster;
