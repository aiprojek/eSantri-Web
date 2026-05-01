
import React, { useState, useEffect, useMemo } from 'react';
import { PondokSettings } from '../types';
import { useAppContext } from '../AppContext';
import { TabTenagaPendidik } from './datamaster/TabTenagaPendidik';
import { TabStrukturPendidikan } from './datamaster/TabStrukturPendidikan';
import { TabMataPelajaran } from './datamaster/TabMataPelajaran';
import { TabTahunAjaran } from './datamaster/TabTahunAjaran';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { getDefaultAcademicYear } from '../utils/academicYear';

const DataMaster: React.FC = () => {
    const { settings, onSaveSettings, showConfirmation, showToast, currentUser } = useAppContext();
    const [localSettings, setLocalSettings] = useState<PondokSettings>(settings);
    const [activeTab, setActiveTab] = useState<'pendidik' | 'struktur' | 'mapel' | 'tahun_ajaran'>('pendidik');
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
                        ]}
                    />
                }
            />
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
                    />
                )}
                {activeTab === 'tahun_ajaran' && (
                    <TabTahunAjaran
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
