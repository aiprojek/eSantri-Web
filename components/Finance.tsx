
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { Santri, Tagihan, Pembayaran } from '../types';
import { FinanceDashboard } from './finance/FinanceDashboard';
import { StatusPembayaranView } from './finance/StatusPembayaranView';
import { UangSakuView } from './finance/UangSakuView';
import { PengaturanBiaya } from './finance/PengaturanBiaya';
import { PengaturanRedaksi } from './finance/PengaturanRedaksi';
import { SetoranKasView } from './finance/SetoranKasView'; // Import New View
import { PembayaranModal } from './finance/modals/PembayaranModal';
import { RiwayatKeuanganSantriModal } from './finance/modals/RiwayatKeuanganSantriModal';
import { KuitansiTemplate } from './finance/print/KuitansiTemplate';
import { SuratTagihanTemplate } from './finance/print/SuratTagihanTemplate';

const Finance: React.FC = () => {
    const { settings, santriList, tagihanList, pembayaranList, currentUser, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'status' | 'setoran' | 'uangsaku' | 'pengaturan' | 'redaksi'>('dashboard');
    
    // State for Payment Modal
    const [isPembayaranModalOpen, setIsPembayaranModalOpen] = useState(false);
    const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

    // State for History Modal
    const [historySantri, setHistorySantri] = useState<Santri | null>(null);

    // State for Printing
    const [printableData, setPrintableData] = useState<{ pembayaran: Pembayaran; santri: Santri; tagihanTerkait: Tagihan[] } | null>(null);
    const [printableSuratTagihanData, setPrintableSuratTagihanData] = useState<{ santri: Santri, tunggakan: Tagihan[], total: number }[] | null>(null);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keuangan === 'write';

    useEffect(() => {
        if (printableData || printableSuratTagihanData) {
            const timer = setTimeout(() => {
                window.print();
                setPrintableData(null);
                setPrintableSuratTagihanData(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [printableData, printableSuratTagihanData]);

    const openPembayaranModal = (santri: Santri) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk mencatat pembayaran.', 'error');
            return;
        }
        setSelectedSantri(santri);
        setIsPembayaranModalOpen(true);
    };
    
    const openHistoryModal = (santri: Santri) => {
        setHistorySantri(santri);
    };
    
    const handlePrintKuitansi = (pembayaran: Pembayaran) => {
        const santri = santriList.find(s => s.id === pembayaran.santriId);
        if (!santri) return;
        const tagihanTerkait = tagihanList.filter(t => pembayaran.tagihanIds.includes(t.id));
        setPrintableData({ pembayaran, santri, tagihanTerkait });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Keuangan</h1>

            <div className="mb-6 border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                    <button onClick={() => setActiveTab('dashboard')} className={`py-3 px-5 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Dashboard</button>
                    <button onClick={() => setActiveTab('status')} className={`py-3 px-5 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'status' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Status Pembayaran</button>
                    <button onClick={() => setActiveTab('setoran')} className={`py-3 px-5 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'setoran' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-box-arrow-in-down mr-1"></i> Setoran Kas</button>
                    <button onClick={() => setActiveTab('uangsaku')} className={`py-3 px-5 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'uangsaku' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Uang Saku</button>
                    {canWrite && (
                        <>
                            <button onClick={() => setActiveTab('pengaturan')} className={`py-3 px-5 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'pengaturan' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Pengaturan Biaya</button>
                            <button onClick={() => setActiveTab('redaksi')} className={`py-3 px-5 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'redaksi' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Pengaturan Redaksi</button>
                        </>
                    )}
                </nav>
            </div>
            
            {activeTab === 'dashboard' && <FinanceDashboard santriList={santriList} tagihanList={tagihanList} pembayaranList={pembayaranList} settings={settings} />}
            {activeTab === 'status' && <StatusPembayaranView onBayarClick={openPembayaranModal} onHistoryClick={openHistoryModal} setPrintableSuratTagihanData={setPrintableSuratTagihanData} canWrite={canWrite} />}
            {activeTab === 'setoran' && <SetoranKasView canWrite={canWrite} />}
            {activeTab === 'uangsaku' && <UangSakuView canWrite={canWrite} />}
            {activeTab === 'pengaturan' && canWrite && <PengaturanBiaya />}
            {activeTab === 'redaksi' && canWrite && <PengaturanRedaksi />}
            
            {isPembayaranModalOpen && selectedSantri && <PembayaranModal isOpen={isPembayaranModalOpen} onClose={() => setIsPembayaranModalOpen(false)} santri={selectedSantri} />}
            {historySantri && <RiwayatKeuanganSantriModal isOpen={!!historySantri} onClose={() => setHistorySantri(null)} santri={historySantri} onPrint={handlePrintKuitansi} />}

            <div className="hidden print:block">
                {printableData && <div className="printable-content-wrapper"><KuitansiTemplate data={printableData} settings={settings} /></div>}
                {printableSuratTagihanData && <div className="printable-content-wrapper">{printableSuratTagihanData.map((data, i) => <div key={i} className="page-break-after"><SuratTagihanTemplate {...data} settings={settings} /></div>)}</div>}
            </div>
        </div>
    );
};

export default Finance;
