
import React, { createContext, useContext, useState } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Santri, Pendaftar, AbsensiRecord, JurnalMengajarRecord, TahfizhRecord, KesehatanRecord, BkSession, SantriFilters } from '../types';
import { db } from '../db';
import { logActivity } from '../services/logService';

interface SantriContextType {
  santriList: Santri[];
  pendaftarList: Pendaftar[];
  absensiList: AbsensiRecord[];
  jurnalMengajarList: JurnalMengajarRecord[];
  tahfizhList: TahfizhRecord[]; 
  kesehatanRecords: KesehatanRecord[];
  bkSessions: BkSession[];
  
  // Filters
  santriFilters: SantriFilters;
  setSantriFilters: React.Dispatch<React.SetStateAction<SantriFilters>>;

  onAddSantri: (data: Omit<Santri, 'id'>) => Promise<void>;
  onUpdateSantri: (data: Santri) => Promise<void>;
  onDeleteSantri: (id: number) => Promise<void>;
  onBulkUpdateSantri: (data: Santri[]) => Promise<void>;
  onBulkAddSantri: (data: Omit<Santri, 'id'>[]) => Promise<void>;
  onSaveAbsensi: (data: AbsensiRecord[]) => Promise<void>;
  onSaveJurnalMengajar: (data: JurnalMengajarRecord) => Promise<void>;
  onDeleteJurnalMengajar: (id: number) => Promise<void>;
  onSaveTahfizh: (data: TahfizhRecord | TahfizhRecord[]) => Promise<void>; 
  onDeleteTahfizh: (id: number) => Promise<void>;
}

const SantriContext = createContext<SantriContextType | null>(null);

export const SantriProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const santriList = useLiveQuery(() => db.santri.filter((s: Santri) => !s.deleted).toArray(), []) || [];
  const pendaftarList = useLiveQuery(() => db.pendaftar.toArray(), []) || [];
  const absensiList = useLiveQuery(() => db.absensi.toArray(), []) || [];
  const jurnalMengajarList = useLiveQuery(() => db.jurnalMengajar.toArray(), []) || [];
  const tahfizhList = useLiveQuery(() => db.tahfizh.toArray(), []) || [];
  const kesehatanRecords = useLiveQuery(() => db.kesehatanRecords.toArray(), []) || [];
  const bkSessions = useLiveQuery(() => db.bkSessions.toArray(), []) || [];

  const [santriFilters, setSantriFilters] = useState<SantriFilters>({
      search: '', jenjang: '', kelas: '', rombel: '', status: '', gender: '', provinsi: '', kabupatenKota: '', kecamatan: ''
  });

  const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });
  const generateUniqueId = () => parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 16));

  const onAddSantri = async (data: Omit<Santri, 'id'>) => {
    const id = generateUniqueId();
    const newSantri = addTimestamp({ ...data, id }) as Santri;
    await db.santri.put(newSantri);
    await logActivity('INSERT', 'santri', id, null, newSantri);
  };

  const onUpdateSantri = async (data: Santri) => {
    const oldSantri = await db.santri.get(data.id);
    const newSantri = addTimestamp(data);
    await db.santri.put(newSantri);
    await logActivity('UPDATE', 'santri', data.id, oldSantri, newSantri);
  };

  const onDeleteSantri = async (id: number) => {
    const santri = await db.santri.get(id);
    if (santri) {
        const deletedSantri = { ...santri, deleted: true, lastModified: Date.now() };
        await db.santri.put(deletedSantri);
        await logActivity('DELETE', 'santri', id, santri, deletedSantri);
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

  const onSaveJurnalMengajar = async (data: JurnalMengajarRecord) => {
    await db.jurnalMengajar.put(addTimestamp(data));
  };
  
  const onDeleteJurnalMengajar = async (id: number) => {
    await db.jurnalMengajar.delete(id);
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
      jurnalMengajarList,
      tahfizhList,
      kesehatanRecords,
      bkSessions,
      santriFilters,
      setSantriFilters,
      onAddSantri,
      onUpdateSantri,
      onDeleteSantri,
      onBulkUpdateSantri,
      onBulkAddSantri,
      onSaveAbsensi,
      onSaveJurnalMengajar,
      onDeleteJurnalMengajar,
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
