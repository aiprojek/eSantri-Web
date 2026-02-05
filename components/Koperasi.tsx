
import React, { useState } from 'react';
import { PosInterface } from './koperasi/PosInterface';
import { ProductManager } from './koperasi/ProductManager';
import { TransactionHistory } from './koperasi/TransactionHistory';
import { KoperasiSettingsView } from './koperasi/KoperasiSettingsView';
import { KoperasiFinance } from './koperasi/KoperasiFinance';
import { KasbonManager } from './koperasi/KasbonManager'; // NEW

// --- MAIN WRAPPER ---
const Koperasi: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'kasir' | 'produk' | 'kasbon' | 'riwayat' | 'keuangan' | 'pengaturan'>('kasir');

    return (
        <div className="space-y-4 h-full flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 shrink-0">Koperasi & Kantin Santri</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 shrink-0 overflow-x-auto">
                <nav className="flex -mb-px">
                    <button onClick={() => setActiveTab('kasir')} className={`flex-1 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap ${activeTab === 'kasir' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-shop mr-2"></i> Kasir (POS)</button>
                    <button onClick={() => setActiveTab('produk')} className={`flex-1 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap ${activeTab === 'produk' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-box-seam mr-2"></i> Produk</button>
                    <button onClick={() => setActiveTab('kasbon')} className={`flex-1 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap ${activeTab === 'kasbon' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-journal-minus mr-2"></i> Kasbon (Hutang)</button>
                    <button onClick={() => setActiveTab('riwayat')} className={`flex-1 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap ${activeTab === 'riwayat' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-receipt mr-2"></i> Riwayat</button>
                    <button onClick={() => setActiveTab('keuangan')} className={`flex-1 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap ${activeTab === 'keuangan' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-cash-stack mr-2"></i> Laba Rugi</button>
                    <button onClick={() => setActiveTab('pengaturan')} className={`flex-1 py-3 px-4 border-b-2 font-bold text-sm whitespace-nowrap ${activeTab === 'pengaturan' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-gear mr-2"></i> Set</button>
                </nav>
            </div>
            
            <div className="flex-grow min-h-0">
                {activeTab === 'kasir' && <PosInterface />}
                {activeTab === 'produk' && <ProductManager />}
                {activeTab === 'kasbon' && <KasbonManager />}
                {activeTab === 'riwayat' && <TransactionHistory />}
                {activeTab === 'keuangan' && <KoperasiFinance />}
                {activeTab === 'pengaturan' && <KoperasiSettingsView />}
            </div>
        </div>
    );
};

export default Koperasi;
