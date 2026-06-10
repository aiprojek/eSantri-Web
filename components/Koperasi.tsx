
import React, { useState } from 'react';
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

// --- MAIN WRAPPER ---
const Cooperativa: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'kasir' | 'teller' | 'produk' | 'gudang' | 'supplier' | 'kasbon' | 'riwayat' | 'keuangan' | 'pengaturan'>('kasir');

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
                        tabs={[
                            { value: 'kasir', label: 'Kasir (POS)', icon: 'bi-shop' },
                            { value: 'teller', label: 'Kasir Tabungan', icon: 'bi-person-badge' },
                            { value: 'produk', label: 'Produk', icon: 'bi-box-seam' },
                            { value: 'gudang', label: 'Gudang', icon: 'bi-houses' },
                            { value: 'supplier', label: 'Vendor / Supplier', icon: 'bi-truck' },
                            { value: 'kasbon', label: 'Kasbon (Hutang)', icon: 'bi-journal-minus' },
                            { value: 'riwayat', label: 'Riwayat', icon: 'bi-receipt' },
                            { value: 'keuangan', label: 'Laba Rugi', icon: 'bi-cash-stack' },
                            { value: 'pengaturan', label: 'Pengaturan', icon: 'bi-gear' },
                        ]}
                    />
                }
            />

            <div className="flex-grow min-h-0">
                {activeTab === 'kasir' && <PosInterface />}
                {activeTab === 'teller' && <KasirView />}
                {activeTab === 'produk' && <ProductManager />}
                {activeTab === 'gudang' && <WarehouseManager />}
                {activeTab === 'supplier' && <SupplierManager />}
                {activeTab === 'kasbon' && <KasbonManager />}
                {activeTab === 'riwayat' && <TransactionHistory />}
                {activeTab === 'keuangan' && <KoperasiFinance />}
                {activeTab === 'pengaturan' && <KoperasiSettingsView />}
            </div>
        </div>
    );
};

export default Cooperativa;
