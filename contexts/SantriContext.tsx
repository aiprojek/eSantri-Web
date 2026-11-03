
import React, { createContext, useContext, useState } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Santri, Pendaftar, AbsensiRecord, JurnalMengajarRecord, TahfizhRecord, KesehatanRecord, BkSession, SantriFilters } from '../types';
import { db } from '../db';
import { logActivity } from '../services/logService';
import { generateSyncSafeId } from '../utils/idGenerator';

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
  const pendaftarList = useLiveQuery(() => db.pendaftar.filter((p: Pendaftar) => !p.deleted).toArray(), []) || [];
  const absensiList = useLiveQuery(() => db.absensi.filter((a: AbsensiRecord) => !a.deleted).toArray(), []) || [];
  const jurnalMengajarList = useLiveQuery(() => db.jurnalMengajar.filter((j: JurnalMengajarRecord) => !j.deleted).toArray(), []) || [];
  const tahfizhList = useLiveQuery(() => db.tahfizh.filter((t: TahfizhRecord) => !t.deleted).toArray(), []) || [];
  const kesehatanRecords = useLiveQuery(() => db.kesehatanRecords.filter((k: KesehatanRecord) => !k.deleted).toArray(), []) || [];
  const bkSessions = useLiveQuery(() => db.bkSessions.filter((b: BkSession) => !b.deleted).toArray(), []) || [];

  const [santriFilters, setSantriFilters] = useState<SantriFilters>({
      search: '', jenjang: '', kelas: '', rombel: '', status: '', gender: '', provinsi: '', kabupatenKota: '', kecamatan: ''
  });

  const addTimestamp = (data: any) => ({ ...data, lastModified: Date.now() });

  const onAddSantri = async (data: Omit<Santri, 'id'>) => {
    const id = generateSyncSafeId();
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
    if (withTs.length > 0) {
        await logActivity('UPDATE', 'santri', `bulk-${withTs[0].id}`, null, { bulkUpdatedCount: withTs.length });
    }
  };

  const onBulkAddSantri = async (data: Omit<Santri, 'id'>[]) => {
    const withTs = data.map(s => addTimestamp({ ...s, id: generateSyncSafeId() })) as Santri[];
    await db.santri.bulkPut(withTs);
    if (withTs.length > 0) {
        await logActivity('INSERT', 'santri', `bulk-${withTs[0].id}`, null, { bulkInsertedCount: withTs.length });
    }
  };

  const onSaveAbsensi = async (records: AbsensiRecord[]) => {
    const withTs = records.map(r => ({
        ...r,
        id: r.id || generateSyncSafeId(),
        deleted: false,
        lastModified: Date.now(),
    }));
    await db.absensi.bulkPut(withTs);
    if (withTs.length > 0) {
        await logActivity('UPDATE', 'absensi', `batch-${withTs[0].tanggal}-${withTs[0].rombelId}`, null, {
            tanggal: withTs[0].tanggal,
            rombelId: withTs[0].rombelId,
            sesi: withTs[0].sesi,
            count: withTs.length,
        });
    }
  };

  const onSaveJurnalMengajar = async (data: JurnalMengajarRecord) => {
    const id = data.id || generateSyncSafeId();
    const existing = await db.jurnalMengajar.get(id);
    const saved = addTimestamp({ ...data, id, deleted: false }) as JurnalMengajarRecord;
    await db.jurnalMengajar.put(saved);
    await logActivity(existing ? 'UPDATE' : 'INSERT', 'jurnalMengajar', id, existing || null, saved);
  };
  
  const onDeleteJurnalMengajar = async (id: number) => {
    const existing = await db.jurnalMengajar.get(id);
    if (existing) {
        const deletedRecord: JurnalMengajarRecord = {
            ...existing,
            deleted: true,
            lastModified: Date.now(),
        };
        await db.jurnalMengajar.put(deletedRecord);
        await logActivity('DELETE', 'jurnalMengajar', id, existing, deletedRecord);
    }
  };

  const onSaveTahfizh = async (data: TahfizhRecord | TahfizhRecord[]) => {
      if (Array.isArray(data)) {
           const withTs = data.map(r => ({
               ...r,
               id: r.id || generateSyncSafeId(),
               deleted: false,
               lastModified: Date.now(),
           }));
           await db.tahfizh.bulkPut(withTs);
           if (withTs.length > 0) {
               await logActivity('INSERT', 'tahfizh', `batch-${withTs[0].id}`, null, { count: withTs.length });
           }
      } else {
           const id = data.id || generateSyncSafeId();
           const existing = await db.tahfizh.get(id);
           const saved = addTimestamp({ ...data, id, deleted: false }) as TahfizhRecord;
           await db.tahfizh.put(saved);
           await logActivity(existing ? 'UPDATE' : 'INSERT', 'tahfizh', id, existing || null, saved);
      }
  };

  const onDeleteTahfizh = async (id: number) => {
      const existing = await db.tahfizh.get(id);
      if (existing) {
          const deletedRecord: TahfizhRecord = {
              ...existing,
              deleted: true,
              lastModified: Date.now(),
          };
          await db.tahfizh.put(deletedRecord);
          await logActivity('DELETE', 'tahfizh', id, existing, deletedRecord);
      }
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
