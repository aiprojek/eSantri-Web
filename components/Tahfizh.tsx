
import React, { useState } from 'react';
import { TahfizhInput } from './tahfizh/TahfizhInput';
import { TahfizhHistory } from './tahfizh/TahfizhHistory';

const Tahfizh: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat'>('input');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
        <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Tahfizh & Al-Qur'an</h1>
            <p className="text-gray-500 text-sm mt-1">Buku mutaba'ah digital setoran hafalan santri.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 sticky top-0 z-40">
            <nav className="flex -mb-px">
                <button
                    onClick={() => setActiveTab('input')}
                    className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${
                        activeTab === 'input'
                        ? 'border-teal-500 text-teal-600 bg-teal-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <i className="bi bi-pencil-square text-lg"></i> Input Setoran
                </button>
                <button
                    onClick={() => setActiveTab('riwayat')}
                    className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 ${
                        activeTab === 'riwayat'
                        ? 'border-teal-500 text-teal-600 bg-teal-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <i className="bi bi-journal-bookmark-fill text-lg"></i> Riwayat & Laporan
                </button>
            </nav>
        </div>

        {activeTab === 'input' && <TahfizhInput />}
        
        {activeTab === 'riwayat' && <TahfizhHistory />}
    </div>
  );
};

export default Tahfizh;
