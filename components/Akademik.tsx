
import React, { useState, useEffect } from 'react';
import { TabDesainRapor } from './akademik/TabDesainRapor';
import { TabGeneratorFormulir } from './akademik/TabGeneratorFormulir';
import { TabImportNilai } from './akademik/TabImportNilai';
import { TabDataNilai } from './akademik/TabDataNilai';
import { TabCetakRapor } from './akademik/TabCetakRapor';
import { TabMonitoringNilai } from './akademik/TabMonitoringNilai';
import { TabJadwalPelajaran } from './akademik/TabJadwalPelajaran';
import { TabInputNilaiWali } from './akademik/TabInputNilaiWali';
import { TabJurnalMengajar } from './akademik/TabJurnalMengajar';
import { useAppContext } from '../AppContext';

const Akademik: React.FC = () => {
    const { currentUser } = useAppContext();
    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const isAdmin = currentUser?.role === 'admin';
    
    const [activeCategory, setActiveCategory] = useState<'kurikulum' | 'rapor'>(
        isWaliKelas ? 'rapor' : 'kurikulum'
    );
    
    const [activeTab, setActiveTab] = useState<'jadwal' | 'designer' | 'generator' | 'import' | 'monitoring' | 'data' | 'print' | 'input_wali' | 'jurnal'>(
        isWaliKelas ? 'input_wali' : 'jadwal'
    );

    const handleCategoryChange = (cat: 'kurikulum' | 'rapor') => {
        setActiveCategory(cat);
        if (cat === 'kurikulum') {
            setActiveTab('jadwal');
        } else {
            setActiveTab(isWaliKelas ? 'input_wali' : 'monitoring');
        }
    };

    useEffect(() => {
        if (isWaliKelas) {
            setActiveCategory('rapor');
            setActiveTab('input_wali');
        }
    }, [isWaliKelas]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Akademik</h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola jadwal, jurnal mengajar, dan administrasi nilai rapor.</p>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 w-full md:w-auto shadow-inner">
                    <button 
                        onClick={() => handleCategoryChange('kurikulum')}
                        className={`py-3 text-sm font-black rounded-xl transition-all duration-500 flex items-center justify-center gap-2 px-4 min-w-[60px] ${activeCategory === 'kurikulum' ? 'flex-[3] bg-white text-teal-700 shadow-sm ring-1 ring-black/5' : 'flex-1 text-gray-400 hover:text-gray-500 hover:bg-gray-200/50'}`}
                    >
                        <i className={`bi bi-book-half text-lg ${activeCategory === 'kurikulum' ? 'text-teal-600' : 'text-gray-400'}`}></i> 
                        <span className={`whitespace-nowrap transition-all duration-500 overflow-hidden ${activeCategory === 'kurikulum' ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                            Kurikulum
                        </span>
                    </button>
                    <button 
                        onClick={() => handleCategoryChange('rapor')}
                        className={`py-3 text-sm font-black rounded-xl transition-all duration-500 flex items-center justify-center gap-2 px-4 min-w-[60px] ${activeCategory === 'rapor' ? 'flex-[3] bg-white text-teal-700 shadow-sm ring-1 ring-black/5' : 'flex-1 text-gray-400 hover:text-gray-500 hover:bg-gray-200/50'}`}
                    >
                        <i className={`bi bi-file-earmark-spreadsheet-fill text-lg ${activeCategory === 'rapor' ? 'text-teal-600' : 'text-gray-400'}`}></i> 
                        <span className={`whitespace-nowrap transition-all duration-500 overflow-hidden ${activeCategory === 'rapor' ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                            Manajemen Rapor
                        </span>
                    </button>
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <nav className="flex -mb-px overflow-x-auto border-b bg-gray-50/50">
                    {activeCategory === 'kurikulum' && (
                        <>
                            <button onClick={() => setActiveTab('jadwal')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'jadwal' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <i className="bi bi-calendar-week mr-2"></i> Jadwal Pelajaran
                            </button>
                            <button onClick={() => setActiveTab('jurnal')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'jurnal' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <i className="bi bi-journal-text mr-2"></i> Jurnal Mengajar (Log)
                            </button>
                        </>
                    )}

                    {activeCategory === 'rapor' && (
                        <>
                            {!isWaliKelas && (
                                <>
                                    <button onClick={() => setActiveTab('monitoring')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'monitoring' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                        <i className="bi bi-activity mr-2"></i> Progres Nilai
                                    </button>
                                    <button onClick={() => setActiveTab('designer')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'designer' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                        <i className="bi bi-grid-3x3 mr-2"></i> Design & Template
                                    </button>
                                    <button onClick={() => setActiveTab('generator')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'generator' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                        <i className="bi bi-file-earmark-code mr-2"></i> Generate Form
                                    </button>
                                    <button onClick={() => setActiveTab('import')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'import' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                        <i className="bi bi-box-arrow-in-down mr-2"></i> Import Nilai
                                    </button>
                                </>
                            )}
                            
                            {(isWaliKelas || isAdmin) && (
                                <button onClick={() => setActiveTab('input_wali')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'input_wali' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                    <i className="bi bi-pencil-square mr-2"></i> Input Nilai Wali Kelas
                                </button>
                            )}

                            {!isWaliKelas && (
                                <>
                                    <button onClick={() => setActiveTab('data')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'data' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                        <i className="bi bi-database mr-2"></i> Review Data Nilai
                                    </button>
                                    <button onClick={() => setActiveTab('print')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'print' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                        <i className="bi bi-printer mr-2"></i> Cetak Rapor
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </nav>

                <div className="p-6">
                    {activeTab === 'jadwal' && <TabJadwalPelajaran />}
                    {activeTab === 'designer' && <TabDesainRapor />}
                    {activeTab === 'generator' && <TabGeneratorFormulir />}
                    {activeTab === 'import' && <TabImportNilai />}
                    {activeTab === 'monitoring' && <TabMonitoringNilai />}
                    {activeTab === 'data' && <TabDataNilai />}
                    {activeTab === 'print' && <TabCetakRapor />}
                    {activeTab === 'input_wali' && <TabInputNilaiWali />}
                    {activeTab === 'jurnal' && <TabJurnalMengajar />}
                </div>
            </div>
        </div>
    );
};

export default Akademik;
