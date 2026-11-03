
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { PosInterface } from './koperasi/PosInterface';
import { KasirView } from './koperasi/KasirView';
import { ProductManager } from './koperasi/ProductManager';
import { TransactionHistory } from './koperasi/TransactionHistory';
import { KoperasiSettingsView } from './koperasi/KoperasiSettingsView';
import { KoperasiFinance } from './koperasi/KoperasiFinance';
import { KasbonManager } from './koperasi/KasbonManager';
import { SupplierManager } from './koperasi/SupplierManager';
import { WarehouseManager } from './koperasi/WarehouseManager';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';

type KoperasiTab = 'kasir' | 'teller' | 'produk' | 'gudang' | 'supplier' | 'kasbon' | 'riwayat' | 'keuangan' | 'pengaturan';

// --- MAIN WRAPPER ---
const Cooperativa: React.FC = () => {
    const { currentUser } = useAppContext();
    const canManageKoperasi =
        currentUser?.role === 'admin' || currentUser?.permissions?.koperasi_manajer === 'write';
    const canWritePos =
        canManageKoperasi || currentUser?.permissions?.koperasi === 'write';

    const availableTabs = useMemo(() => {
        const allTabs: { value: KoperasiTab; label: string; icon: string; visible: boolean }[] = [
            { value: 'kasir', label: 'Kasir (POS)', icon: 'bi-shop', visible: canWritePos },
            { value: 'teller', label: 'Kasir Tabungan', icon: 'bi-person-badge', visible: canWritePos },
            { value: 'produk', label: 'Produk', icon: 'bi-box-seam', visible: true },
            { value: 'gudang', label: 'Gudang', icon: 'bi-houses', visible: canManageKoperasi },
            { value: 'supplier', label: 'Vendor / Supplier', icon: 'bi-truck', visible: canManageKoperasi },
            { value: 'kasbon', label: 'Kasbon (Hutang)', icon: 'bi-journal-minus', visible: true },
            { value: 'riwayat', label: 'Riwayat', icon: 'bi-receipt', visible: true },
            { value: 'keuangan', label: 'Laba Rugi', icon: 'bi-cash-stack', visible: canManageKoperasi },
            { value: 'pengaturan', label: 'Pengaturan', icon: 'bi-gear', visible: canManageKoperasi },
        ];
        return allTabs.filter((t) => t.visible);
    }, [canWritePos, canManageKoperasi]);

    const [activeTab, setActiveTab] = useState<KoperasiTab>(() => (canWritePos ? 'kasir' : 'produk'));

    useEffect(() => {
        if (!availableTabs.some((t) => t.value === activeTab) && availableTabs.length > 0) {
            setActiveTab(availableTabs[0].value);
        }
    }, [availableTabs, activeTab]);

    return (
        <div className="flex h-full flex-col space-y-6">
            <PageHeader
                eyebrow="Keuangan & Aset"
                title="Koperasi & Kantin Santri"
                description="Kelola POS, produk, gudang, supplier, kasbon, transaksi, dan pengaturan cooperativa dari satu workspace."
                tabs={
                    <HeaderTabs
                        value={activeTab}
                        onChange={setActiveTab}
                        tabs={availableTabs}
                    />
                }
            />

            <div className="flex-grow min-h-0">
                {activeTab === 'kasir' && canWritePos && <PosInterface />}
                {activeTab === 'teller' && canWritePos && <KasirView />}
                {activeTab === 'produk' && <ProductManager />}
                {activeTab === 'gudang' && canManageKoperasi && <WarehouseManager />}
                {activeTab === 'supplier' && canManageKoperasi && <SupplierManager />}
                {activeTab === 'kasbon' && <KasbonManager />}
                {activeTab === 'riwayat' && <TransactionHistory />}
                {activeTab === 'keuangan' && canManageKoperasi && <KoperasiFinance />}
                {activeTab === 'pengaturan' && canManageKoperasi && <KoperasiSettingsView />}
            </div>
        </div>
    );
};

export default Cooperativa;
