
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { useFinanceContext } from '../contexts/FinanceContext';
import { Santri, Tagihan, Pembayaran } from '../types';
import { FinanceDashboard } from './finance/FinanceDashboard';
import { StatusPembayaranView } from './finance/StatusPembayaranView';
import { UangSakuView } from './finance/UangSakuView';
import { PengaturanBiaya } from './finance/PengaturanBiaya';
import { PengaturanRedaksi } from './finance/PengaturanRedaksi';
import { SetoranKasView } from './finance/SetoranKasView'; 
import { PayrollView } from './finance/PayrollView';
import { LaporanTunggakan } from './finance/LaporanTunggakan'; // NEW
import { PembayaranModal } from './finance/modals/PembayaranModal';
import { RiwayatKeuanganSantriModal } from './finance/modals/RiwayatKeuanganSantriModal';
import { KuitansiTemplate } from './finance/print/KuitansiTemplate';
import { SuratTagihanTemplate } from './finance/print/SuratTagihanTemplate';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

const Finance: React.FC = () => {
    const { settings, currentUser, showToast } = useAppContext();
    const { santriList } = useSantriContext();
    const { tagihanList, pembayaranList } = useFinanceContext();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'status' | 'aging' | 'setoran' | 'uangsaku' | 'payroll' | 'pengaturan' | 'redaksi'>('dashboard');
    
    // State for Payment Modal
    const [isPembayaranModalOpen, setIsPembayaranModalOpen] = useState(false);
    const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

    // State for History Modal
    const [historySantri, setHistorySantri] = useState<Santri | null>(null);

    // State for Printing
    const [printableData, setPrintableData] = useState<{ pembayaran: Pembayaran; santri: Santri; tagihanTerkait: Tagihan[] } | null>(null);
    const [printableSuratTagihanData, setPrintableSuratTagihanData] = useState<{ santri: Santri, tunggakan: Tagihan[], total: number }[] | null>(null);

    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.keuangan === 'write';

    const financeTabs: Array<{ value: typeof activeTab; label: string; icon?: string; mobileLabel?: string }> = [
        { value: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
        { value: 'status', label: 'Status Pembayaran', icon: 'bi-receipt' },
        { value: 'aging', label: 'Umur Piutang', icon: 'bi-graph-down', mobileLabel: 'Piutang' },
        { value: 'setoran', label: 'Setoran Kas', icon: 'bi-box-arrow-in-down' },
        { value: 'uangsaku', label: 'Uang Saku', icon: 'bi-wallet2' },
        ...(canWrite
            ? [
                { value: 'payroll' as const, label: 'Penggajian', icon: 'bi-cash-stack' },
                { value: 'pengaturan' as const, label: 'Pengaturan Biaya', icon: 'bi-sliders' },
                { value: 'redaksi' as const, label: 'Pengaturan Redaksi', icon: 'bi-chat-left-text' },
            ]
            : []),
    ];

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
        <div className="space-y-6">
            <PageHeader
                eyebrow="Keuangan"
                title="Keuangan Santri"
                description="Pantau dashboard finansial, status pembayaran, setoran kas, dan pengaturan biaya dari satu ruang kerja yang konsisten."
                tabs={
                    <HeaderTabs
                        tabs={financeTabs}
                        value={activeTab}
                        onChange={(next) => setActiveTab(next as typeof activeTab)}
                    />
                }
            />
            
            {activeTab === 'dashboard' && <FinanceDashboard santriList={santriList} tagihanList={tagihanList} pembayaranList={pembayaranList} settings={settings} />}
            {activeTab === 'status' && <StatusPembayaranView onBayarClick={openPembayaranModal} onHistoryClick={openHistoryModal} setPrintableSuratTagihanData={setPrintableSuratTagihanData} canWrite={canWrite} />}
            {activeTab === 'aging' && <LaporanTunggakan />}
            {activeTab === 'setoran' && <SetoranKasView canWrite={canWrite} />}
            {activeTab === 'uangsaku' && <UangSakuView canWrite={canWrite} />}
            {activeTab === 'payroll' && canWrite && <PayrollView canWrite={canWrite} />}
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
