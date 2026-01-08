
import React, { useState } from 'react';
import { TabTentang } from './tentang/TabTentang';
import { TabPanduan } from './tentang/TabPanduan';
import { TabRilis, latestVersion, latestUpdateDate } from './tentang/TabRilis';
import { TabLisensi } from './tentang/TabLisensi';
import { TabKontak } from './tentang/TabKontak';
import { TabFaq } from './tentang/TabFaq';

const TabButton: React.FC<{
    tabId: 'tentang' | 'panduan' | 'faq' | 'rilis' | 'kontak' | 'lisensi';
    label: string;
    icon: string;
    isActive: boolean;
    onClick: (id: 'tentang' | 'panduan' | 'faq' | 'rilis' | 'kontak' | 'lisensi') => void;
}> = ({ tabId, label, icon, isActive, onClick }) => (
    <button
        onClick={() => onClick(tabId)}
        className={`flex items-center gap-2 py-3 px-4 text-center font-medium text-sm whitespace-nowrap border-b-2 transition-colors duration-200 ${isActive ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
    >
        <i className={`bi ${icon}`}></i>
        <span>{label}</span>
    </button>
);

const Tentang: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'tentang' | 'panduan' | 'faq' | 'rilis' | 'kontak' | 'lisensi'>('tentang');

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Tentang Aplikasi eSantri Web</h1>
                <div className="mt-2 flex items-center gap-2">
                    <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-teal-200">
                        <i className="bi bi-rocket-takeoff mr-1"></i> Versi Terbaru: {latestVersion}
                    </span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px overflow-x-auto">
                        <TabButton tabId="tentang" label="Tentang Aplikasi" icon="bi-info-circle" isActive={activeTab === 'tentang'} onClick={setActiveTab} />
                        <TabButton tabId="panduan" label="Panduan Pengguna" icon="bi-book-half" isActive={activeTab === 'panduan'} onClick={setActiveTab} />
                        <TabButton tabId="faq" label="FAQ / Tanya Jawab" icon="bi-question-circle" isActive={activeTab === 'faq'} onClick={setActiveTab} />
                        <TabButton tabId="rilis" label="Catatan Rilis" icon="bi-clock-history" isActive={activeTab === 'rilis'} onClick={setActiveTab} />
                        <TabButton tabId="lisensi" label="Lisensi" icon="bi-file-earmark-text" isActive={activeTab === 'lisensi'} onClick={setActiveTab} />
                        <TabButton tabId="kontak" label="Kontak" icon="bi-envelope" isActive={activeTab === 'kontak'} onClick={setActiveTab} />
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'tentang' && <TabTentang />}
                    {activeTab === 'panduan' && <TabPanduan />}
                    {activeTab === 'faq' && <TabFaq />}
                    {activeTab === 'rilis' && <TabRilis />}
                    {activeTab === 'lisensi' && <TabLisensi />}
                    {activeTab === 'kontak' && <TabKontak />}
                </div>
            </div>
        </div>
    );
};

export default Tentang;
