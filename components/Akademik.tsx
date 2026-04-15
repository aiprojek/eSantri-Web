
import React, { useState, useEffect } from 'react';
import { TabDesainRapor } from './akademik/TabDesainRapor';
import { TabGeneratorFormulir } from './akademik/TabGeneratorFormulir';
import { TabImportNilai } from './akademik/TabImportNilai';
import { TabDataNilai } from './akademik/TabDataNilai';
import { TabCetakRapor } from './akademik/TabCetakRapor';
import { TabMonitoringNilai } from './akademik/TabMonitoringNilai';
import { TabJadwalPelajaran } from './akademik/TabJadwalPelajaran';
import { TabInputNilaiWali } from './akademik/TabInputNilaiWali';
import { useAppContext } from '../AppContext';

const Akademik: React.FC = () => {
    const { currentUser } = useAppContext();
    const isWaliKelas = currentUser?.role === 'wali_kelas';
    const isAdmin = currentUser?.role === 'admin';
    
    const [activeTab, setActiveTab] = useState<'jadwal' | 'designer' | 'generator' | 'import' | 'monitoring' | 'data' | 'print' | 'input_wali'>(
        isWaliKelas ? 'input_wali' : 'jadwal'
    );

    useEffect(() => {
        if (isWaliKelas) {
            setActiveTab('input_wali');
        }
    }, [isWaliKelas]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Akademik: Rapor & Penilaian</h1>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <nav className="flex -mb-px overflow-x-auto border-b">
                    {!isWaliKelas && (
                        <>
                            <button onClick={() => setActiveTab('jadwal')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'jadwal' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-calendar-week mr-2"></i> Jadwal Pelajaran</button>
                            <button onClick={() => setActiveTab('designer')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'designer' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-grid-3x3 mr-2"></i> Desain Rapor</button>
                            <button onClick={() => setActiveTab('generator')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'generator' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-file-earmark-code mr-2"></i> Generate Form</button>
                            <button onClick={() => setActiveTab('import')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'import' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-box-arrow-in-down mr-2"></i> Import Nilai</button>
                            <button onClick={() => setActiveTab('monitoring')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'monitoring' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-activity mr-2"></i> Monitoring</button>
                        </>
                    )}
                    
                    {(isWaliKelas || isAdmin) && (
                        <button onClick={() => setActiveTab('input_wali')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'input_wali' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-pencil-square mr-2"></i> Input Nilai Wali Kelas</button>
                    )}

                    {!isWaliKelas && (
                        <>
                            <button onClick={() => setActiveTab('data')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'data' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-database mr-2"></i> Data Nilai</button>
                            <button onClick={() => setActiveTab('print')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'print' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-printer mr-2"></i> Cetak Rapor</button>
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
                </div>
            </div>
        </div>
    );
};

export default Akademik;
