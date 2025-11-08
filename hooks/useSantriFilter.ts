import { useMemo } from 'react';
import { Santri, PondokSettings } from '../types';

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
        (!filters.jenjang || s.jenjangId === parseInt(filters.jenjang)) &&
        (!filters.kelas || s.kelasId === parseInt(filters.kelas)) &&
        (!filters.rombel || s.rombelId === parseInt(filters.rombel)) &&
        (!filters.status || s.status === filters.status) &&
        (!filters.gender || s.jenisKelamin === filters.gender) &&
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