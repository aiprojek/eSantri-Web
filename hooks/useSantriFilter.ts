import { useMemo } from 'react';
import { Santri, PondokSettings } from '../types';
import { isSantriPutra, isSantriPutri } from '../utils/formatters';

interface Filters {
  search: string;
  jenjang: string;
  kelas: string;
  rombel: string;
  status: string;
  gender: string;
  provinsi: string;
  kabupatenKota: string;
  kecamatan: string;
}

export const useSantriFilter = (santriList: Santri[], filters: Filters, setFilters: (filters: Filters) => void) => {
  
  const handleFilterChange = (field: keyof Filters, value: string) => {
    const newFilters = {
        ...filters,
        [field]: value,
    };

    if (field === 'jenjang') {
        newFilters.kelas = '';
        newFilters.rombel = '';
    } else if (field === 'kelas') {
        newFilters.rombel = '';
    }
    
    setFilters(newFilters);
  };

  const filteredSantri = useMemo(() => {
    return santriList.filter(s => {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = s.namaLengkap.toLowerCase().includes(searchLower);
      const nisMatch = s.nis.toLowerCase().includes(searchLower);
      const nikMatch = s.nik?.toLowerCase().includes(searchLower) || false;

      const provinsiMatch = !filters.provinsi || s.alamat.provinsi?.toLowerCase().includes(filters.provinsi.toLowerCase());
      const kabupatenMatch = !filters.kabupatenKota || s.alamat.kabupatenKota?.toLowerCase().includes(filters.kabupatenKota.toLowerCase());
      const kecamatanMatch = !filters.kecamatan || s.alamat.kecamatan?.toLowerCase().includes(filters.kecamatan.toLowerCase());

      return (
        (nameMatch || nisMatch || nikMatch) &&
        (!filters.jenjang || Number(s.jenjangId) === parseInt(filters.jenjang, 10)) &&
        (!filters.kelas || Number(s.kelasId) === parseInt(filters.kelas, 10)) &&
        (!filters.rombel || Number(s.rombelId) === parseInt(filters.rombel, 10)) &&
        (!filters.status || s.status === filters.status) &&
        (!filters.gender || (filters.gender === 'Laki-laki' ? isSantriPutra(s) : isSantriPutri(s))) &&
        provinsiMatch &&
        kabupatenMatch &&
        kecamatanMatch
      );
    });
  }, [santriList, filters]);
  
  const getAvailableOptions = (settings: PondokSettings) => {
      const availableKelas = useMemo(() => {
        if (!filters.jenjang) return [];
        return settings.kelas.filter(k => k.jenjangId === parseInt(filters.jenjang));
      }, [filters.jenjang, settings.kelas]);

      const availableRombel = useMemo(() => {
        if (!filters.kelas) return [];
        return settings.rombel.filter(r => r.kelasId === parseInt(filters.kelas));
      }, [filters.kelas, settings.rombel]);

      return { availableKelas, availableRombel };
  };

  return {
    filters,
    handleFilterChange,
    filteredSantri,
    getAvailableOptions,
  };
};