
import React, { useState } from 'react';
import { TabDesainRapor } from './akademik/TabDesainRapor';
import { TabGeneratorFormulir } from './akademik/TabGeneratorFormulir';
import { TabImportNilai } from './akademik/TabImportNilai';
import { TabDataNilai } from './akademik/TabDataNilai';
import { TabCetakRapor } from './akademik/TabCetakRapor';
import { TabMonitoringNilai } from './akademik/TabMonitoringNilai';

const Akademik: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'designer' | 'generator' | 'import' | 'monitoring' | 'data' | 'print'>('designer');

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Akademik: Rapor & Penilaian</h1>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <nav className="flex -mb-px overflow-x-auto border-b">
                    <button onClick={() => setActiveTab('designer')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'designer' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-grid-3x3 mr-2"></i> 1. Desain</button>
                    <button onClick={() => setActiveTab('generator')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'generator' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-file-earmark-code mr-2"></i> 2. Generate</button>
                    <button onClick={() => setActiveTab('import')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'import' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-box-arrow-in-down mr-2"></i> 3. Import</button>
                    <button onClick={() => setActiveTab('monitoring')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'monitoring' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-activity mr-2"></i> 4. Monitoring</button>
                    <button onClick={() => setActiveTab('data')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'data' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-database mr-2"></i> 5. Data Nilai</button>
                    <button onClick={() => setActiveTab('print')} className={`py-4 px-5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'print' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-printer mr-2"></i> 6. Cetak</button>
                </nav>

                <div className="p-6">
                    {activeTab === 'designer' && <TabDesainRapor />}
                    {activeTab === 'generator' && <TabGeneratorFormulir />}
                    {activeTab === 'import' && <TabImportNilai />}
                    {activeTab === 'monitoring' && <TabMonitoringNilai />}
                    {activeTab === 'data' && <TabDataNilai />}
                    {activeTab === 'print' && <TabCetakRapor />}
                </div>
            </div>
        </div>
    );
};

export default Akademik;
