
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { Pendaftar, PsbConfig } from '../types';
import { db } from '../db';
import { PsbDashboard } from './psb/PsbDashboard';
import { PsbRekap } from './psb/PsbRekap';
import { PsbFormBuilder } from './psb/PsbFormBuilder';
import { PsbPosterMaker } from './psb/PsbPosterMaker';

const PSB: React.FC = () => {
    const { settings, onSaveSettings, showToast, currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'rekap' | 'form' | 'poster'>('dashboard');
    const [pendaftarList, setPendaftarList] = useState<Pendaftar[]>([]);

    // Permission Check
    const canWrite = currentUser?.role === 'admin' || currentUser?.permissions?.psb === 'write';

    const fetchPendaftar = async () => {
        try {
            const data = await db.pendaftar.toArray();
            setPendaftarList(data);
        } catch (error) {
            console.error("Failed to fetch pendaftar:", error);
        }
    };

    useEffect(() => {
        fetchPendaftar();
    }, []);

    const handleSaveConfig = async (newConfig: PsbConfig) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses untuk mengubah konfigurasi.', 'error');
            return;
        }
        const updatedSettings = { ...settings, psbConfig: newConfig };
        await onSaveSettings(updatedSettings);
    };

    const handleImportFromWA = (text: string) => {
        try {
            const match = text.match(/PSB_START([\s\S]*?)PSB_END/);
            if (match && match[1]) {
                const data = JSON.parse(match[1].trim());
                const newPendaftar: Pendaftar = {
                    id: Date.now(),
                    ...data,
                    jenjangId: parseInt(data.jenjangId),
                    tanggalDaftar: data.tanggalDaftar || new Date().toISOString(),
                    status: 'Baru',
                    kewarganegaraan: 'WNI',
                    gelombang: settings.psbConfig.activeGelombang
                };
                db.pendaftar.add(newPendaftar).then(() => {
                    fetchPendaftar();
                    showToast('Data dari WhatsApp berhasil diimpor.', 'success');
                });
            } else {
                showToast('Format pesan tidak valid.', 'error');
            }
        } catch (e) {
            showToast('Gagal memproses data JSON.', 'error');
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Penerimaan Santri Baru (PSB)</h1>
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto gap-4">
                    <button onClick={() => setActiveTab('dashboard')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'dashboard' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-speedometer2 mr-2"></i>Dashboard</button>
                    <button onClick={() => setActiveTab('rekap')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'rekap' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-people-fill mr-2"></i>Rekap Pendaftar</button>
                    {canWrite && <button onClick={() => setActiveTab('form')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'form' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-ui-checks mr-2"></i>Desain Formulir Online</button>}
                    <button onClick={() => setActiveTab('poster')} className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'poster' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><i className="bi bi-stars mr-2"></i>Poster AI</button>
                </nav>
            </div>
            {activeTab === 'dashboard' && <PsbDashboard pendaftarList={pendaftarList} config={settings.psbConfig} settings={settings} />}
            {activeTab === 'rekap' && <PsbRekap pendaftarList={pendaftarList} settings={settings} onImportFromWA={handleImportFromWA} onUpdateList={fetchPendaftar} canWrite={canWrite} />}
            {activeTab === 'form' && canWrite && <PsbFormBuilder config={settings.psbConfig} settings={settings} onSave={handleSaveConfig} />}
            {activeTab === 'poster' && <PsbPosterMaker config={settings.psbConfig} onSave={handleSaveConfig} settings={settings} />}
        </div>
    );
};

export default PSB;
