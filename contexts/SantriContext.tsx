
import React, { createContext, useContext, useState } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Santri, Pendaftar, AbsensiRecord, TahfizhRecord, SantriFilters } from '../types';
import { db } from '../db';

interface SantriContextType {
  santriList: Santri[];
  pendaftarList: Pendaftar[];
  absensiList: AbsensiRecord[];
  tahfizhList: TahfizhRecord[]; 
  
  // Filters
  santriFilters: SantriFilters;
  setSantriFilters: React.Dispatch<React.SetStateAction<SantriFilters>>;

  onAddSantri: (data: Omit<Santri, 'id'>) => Promise<void>;
  onUpdateSantri: (data: Santri) => Promise<void>;
  onDeleteSantri: (id: number) => Promise<void>;
  onBulkUpdateSantri: (data: Santri[]) => Promise<void>;
  onBulkAddSantri: (data: Omit<Santri, 'id'>[]) => Promise<void>;
  onSaveAbsensi: (data: AbsensiRecord[]) => Promise<void>;
  onSaveTahfizh: (data: TahfizhRecord | TahfizhRecord[]) => Promise<void>; 
  onDeleteTahfizh: (id: number) => Promise<void>;
}

const SantriContext = createContext<SantriContextType | null>(null);

export const SantriProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const santriList = useLiveQuery(() => db.santri.filter((s: Santri) => !s.deleted).toArray(), []) || [];
  const pendaftarList = useLiveQuery(() => db.pendaftar.toArray(), []) || [];
  const absensiList = useLiveQuery(() => db.absensi.toArray(), []) || [];
  const tahfizhList = useLiveQuery(() => db.tahfizh.toArray(), []) || [];

  const [santriFilters, setSantriFilters] = useState<SantriFilters>({
      search: '', jenjang: '', kelas: '', rombel: '', status: '', gender: '', provinsi: '', kabupatenKota: '', kecamatan: ''
  });

  const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });
  const generateUniqueId = () => parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 16));

  const onAddSantri = async (data: Omit<Santri, 'id'>) => {
    const id = generateUniqueId();
    await db.santri.put(addTimestamp({ ...data, id }) as Santri);
  };

  const onUpdateSantri = async (data: Santri) => {
    await db.santri.put(addTimestamp(data));
  };

  const onDeleteSantri = async (id: number) => {
    const santri = santriList.find(s => s.id === id);
    if (santri) {
        await db.santri.put({ ...santri, deleted: true, lastModified: Date.now() });
    }
  };

  const onBulkUpdateSantri = async (data: Santri[]) => {
    const withTs = data.map(s => addTimestamp(s));
    await db.santri.bulkPut(withTs);
  };

  const onBulkAddSantri = async (data: Omit<Santri, 'id'>[]) => {
    const withTs = data.map(s => addTimestamp({ ...s, id: generateUniqueId() }));
    await db.santri.bulkPut(withTs as Santri[]);
  };

  const onSaveAbsensi = async (records: AbsensiRecord[]) => {
    const withTs = records.map(r => ({ ...r, lastModified: Date.now() }));
    await db.absensi.bulkPut(withTs);
  };

  const onSaveTahfizh = async (data: TahfizhRecord | TahfizhRecord[]) => {
      if (Array.isArray(data)) {
           const withTs = data.map(r => ({ ...r, lastModified: Date.now() }));
           await db.tahfizh.bulkPut(withTs);
      } else {
           await db.tahfizh.put(addTimestamp(data));
      }
  };

  const onDeleteTahfizh = async (id: number) => {
      await db.tahfizh.delete(id);
  };

  return (
    <SantriContext.Provider value={{
      santriList,
      pendaftarList,
      absensiList,
      tahfizhList,
      santriFilters,
      setSantriFilters,
      onAddSantri,
      onUpdateSantri,
      onDeleteSantri,
      onBulkUpdateSantri,
      onBulkAddSantri,
      onSaveAbsensi,
      onSaveTahfizh,
      onDeleteTahfizh
    }}>
      {children}
    </SantriContext.Provider>
  );
};

export const useSantriContext = () => {
  const context = useContext(SantriContext);
  if (!context) throw new Error('useSantriContext must be used within SantriProvider');
  return context;
};
