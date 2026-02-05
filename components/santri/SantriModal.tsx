
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Santri, RiwayatStatus, Prestasi, Pelanggaran } from '../../types';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { generateNis } from '../../utils/nisGenerator';
import { PrestasiModal } from './modals/PrestasiModal';
import { PelanggaranModal } from './modals/PelanggaranModal';
import { MutasiModal } from './modals/MutasiModal';
import { TabDataDiri } from './santriModal/TabDataDiri';
import { TabDataOrangTua } from './santriModal/TabDataOrangTua';
import { TabRiwayatStatus } from './santriModal/TabRiwayatStatus';
import { TabDataLain } from './modals/TabDataLain';

interface SantriModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Santri) => Promise<void>;
  santriData: Santri | null;
  onSwitchToBulk?: () => void;
}

export const SantriModal: React.FC<SantriModalProps> = ({
  isOpen,
  onClose,
  onSave,
  santriData,
  onSwitchToBulk
}) => {
  const { settings, showAlert } = useAppContext();
  const { santriList } = useSantriContext();
  const formMethods = useForm<Santri>();
  const { handleSubmit, formState: { isSubmitting }, watch, setValue, getValues, reset } = formMethods;

  const [activeTab, setActiveTab] = useState('dataDiri');
  const [isPrestasiModalOpen, setIsPrestasiModalOpen] = useState(false);
  const [editingPrestasi, setEditingPrestasi] = useState<Prestasi | null>(null);
  const [isPelanggaranModalOpen, setIsPelanggaranModalOpen] = useState(false);
  const [editingPelanggaran, setEditingPelanggaran] = useState<Pelanggaran | null>(null);
  const originalStatusRef = useRef<Santri['status'] | null>(null);
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
  
  const watchStatus = watch('status');

  useEffect(() => {
    if (isOpen) {
        if (santriData) {
            reset(santriData);
            originalStatusRef.current = santriData.status;
        }
        setActiveTab('dataDiri');
    }
  }, [isOpen, santriData, reset]);

  const onFormSubmit = async (data: Santri) => {
    // Inject default photo if missing to maintain consistency
    const processedData = {
        ...data,
        fotoUrl: data.fotoUrl || 'https://placehold.co/150x200/e2e8f0/334155?text=Foto'
    };

    const statusChanged = originalStatusRef.current !== processedData.status;
    if (statusChanged) {
      // Need to re-set the processed data into the form context for the mutation modal to pick it up if needed
      // but strictly we pass data to onSave.
      // For mutation modal flow, we just trigger the modal, and saving happens in handleSaveMutasi using getValues
      setIsMutasiModalOpen(true);
    } else {
      await onSave(processedData);
    }
  };
  
  const handleSaveMutasi = async (keterangan: string, tanggal: string) => {
    const currentValues = getValues();
    const newRiwayat: RiwayatStatus = {
        id: Date.now(),
        status: currentValues.status as RiwayatStatus['status'],
        tanggal: tanggal,
        keterangan: keterangan,
    };
    const updatedRiwayatStatus = [...(currentValues.riwayatStatus || []), newRiwayat];
    setValue('riwayatStatus', updatedRiwayatStatus, { shouldDirty: true });
    setIsMutasiModalOpen(false);
    
    // Process default photo for mutation save path as well
    const finalData = {
        ...getValues(),
        fotoUrl: getValues('fotoUrl') || 'https://placehold.co/150x200/e2e8f0/334155?text=Foto'
    };
    await onSave(finalData);
  };

  const handleCloseMutasiModal = () => {
    if (originalStatusRef.current) {
        setValue('status', originalStatusRef.current, { shouldDirty: false });
    }
    setIsMutasiModalOpen(false);
  };

  const handleGenerateNis = () => {
    const currentValues = getValues();
    try {
        const newNis = generateNis(settings, santriList, currentValues);
        setValue('nis', newNis, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
        showAlert('Gagal Membuat NIS', (error as Error).message);
    }
  };
  
  const TabButton: React.FC<{ tabId: string, label: string, icon: string }> = ({ tabId, label, icon }) => (
    <button
        type="button"
        onClick={() => setActiveTab(tabId)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === tabId
                ? 'border-teal-600 text-teal-600 bg-teal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`}
    >
        <i className={`bi ${icon} text-lg`}></i>
        {label}
    </button>
  );
  
  if (!isOpen || !santriData) return null;
    
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
        <form onSubmit={handleSubmit(onFormSubmit)} noValidate className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-semibold text-gray-800">{santriData.id > 0 ? 'Edit Data Santri' : 'Tambah Santri Baru'}</h3>
                    {santriData.id === 0 && onSwitchToBulk && (
                        <button 
                            type="button" 
                            onClick={onSwitchToBulk}
                            className="text-xs bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full hover:bg-teal-200 transition-colors font-medium flex items-center gap-1"
                        >
                            <i className="bi bi-table"></i>
                            Input Banyak Data?
                        </button>
                    )}
                </div>
                <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg text-xl"></i></button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-0">
                {/* Scrollable Tabs Container */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        <TabButton tabId="dataDiri" label="Data Diri & Akademik" icon="bi-person-vcard" />
                        <TabButton tabId="dataOrtu" label="Data Orang Tua & Wali" icon="bi-people" />
                        <TabButton tabId="riwayatStatus" label="Riwayat Status" icon="bi-clock-history" />
                        <TabButton tabId="dataLain" label="Data Lain-lain" icon="bi-journal-text" />
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'dataDiri' && <TabDataDiri formMethods={formMethods} onGenerateNis={handleGenerateNis} />}
                    {activeTab === 'dataOrtu' && <TabDataOrangTua formMethods={formMethods} />}
                    {activeTab === 'riwayatStatus' && <TabRiwayatStatus formMethods={formMethods} />}
                    {activeTab === 'dataLain' && (
                        <TabDataLain 
                            formMethods={formMethods}
                            openPrestasiModal={(p) => { setEditingPrestasi(p); setIsPrestasiModalOpen(true); }}
                            openPelanggaranModal={(p) => { setEditingPelanggaran(p); setIsPelanggaranModalOpen(true); }}
                        />
                    )}
                </div>
            </div>
            
            <div className="p-4 border-t flex justify-end space-x-2 bg-gray-50 rounded-b-lg">
                <button onClick={onClose} type="button" className="text-gray-600 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">Batal</button>
                <button type="submit" disabled={isSubmitting} className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center flex items-center justify-center min-w-[130px] disabled:bg-teal-400 disabled:cursor-not-allowed">
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Menyimpan...</span>
                        </>
                    ) : (
                        <>
                            <i className="bi bi-save-fill mr-2"></i>
                            Simpan Data
                        </>
                    )}
                </button>
            </div>
        </form>
        <PrestasiModal 
            isOpen={isPrestasiModalOpen} 
            onClose={() => { setEditingPrestasi(null); setIsPrestasiModalOpen(false); }} 
            onSave={(prestasi) => {
                const existing = getValues('prestasi') || [];
                if (existing.some(p => p.id === prestasi.id)) {
                    setValue('prestasi', existing.map(p => p.id === prestasi.id ? prestasi : p), { shouldDirty: true });
                } else {
                    setValue('prestasi', [...existing, prestasi], { shouldDirty: true });
                }
                setIsPrestasiModalOpen(false);
            }} 
            prestasiData={editingPrestasi} 
        />
        <PelanggaranModal 
            isOpen={isPelanggaranModalOpen} 
            onClose={() => { setEditingPelanggaran(null); setIsPelanggaranModalOpen(false); }} 
            onSave={(pelanggaran) => {
                 const existing = getValues('pelanggaran') || [];
                if (existing.some(p => p.id === pelanggaran.id)) {
                    setValue('pelanggaran', existing.map(p => p.id === pelanggaran.id ? pelanggaran : p), { shouldDirty: true });
                } else {
                    setValue('pelanggaran', [...existing, pelanggaran], { shouldDirty: true });
                }
                setIsPelanggaranModalOpen(false);
            }} 
            pelanggaranData={editingPelanggaran} 
        />
        {isMutasiModalOpen && <MutasiModal isOpen={isMutasiModalOpen} onClose={handleCloseMutasiModal} onSave={handleSaveMutasi} newStatus={watchStatus as RiwayatStatus['status']} />}
    </div>
  );
};
