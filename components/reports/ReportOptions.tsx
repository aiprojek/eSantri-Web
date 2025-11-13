import React, { useMemo, useState } from 'react';
import { Santri, PondokSettings, ReportType } from '../../types';
import { useReportConfig } from '../../hooks/useReportConfig';

const SantriSelector: React.FC<{
    title: string;
    printMode: 'all' | 'selected';
    setPrintMode: (mode: 'all' | 'selected') => void;
    selectedIds: number[];
    setSelectedIds: (ids: number[] | ((prev: number[]) => number[])) => void;
    radioGroupName: string;
    filteredSantri: Santri[];
}> = ({ title, printMode, setPrintMode, selectedIds, setSelectedIds, radioGroupName, filteredSantri }) => {
    const handleSelection = (santriId: number) => {
        setSelectedIds(prev => prev.includes(santriId) ? prev.filter(id => id !== santriId) : [...prev, santriId]);
    };
    const handleToggleAll = () => {
        setSelectedIds(selectedIds.length === filteredSantri.length ? [] : filteredSantri.map(s => s.id));
    };

    return (
        <div className="space-y-4">
            {title && <h3 className="text-md font-semibold text-gray-700">{title}</h3>}
            <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Santri yang Akan Dicetak</label>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center"><input type="radio" id={`${radioGroupName}-all`} name={radioGroupName} value="all" checked={printMode === 'all'} onChange={e => setPrintMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor={`${radioGroupName}-all`} className="ml-2 text-sm">Cetak Semua Santri Hasil Filter</label></div>
                    <div className="flex items-center"><input type="radio" id={`${radioGroupName}-select`} name={radioGroupName} value="selected" checked={printMode === 'selected'} onChange={e => setPrintMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor={`${radioGroupName}-select`} className="ml-2 text-sm">Pilih Santri Tertentu</label></div>
                </div>
            </div>
            {printMode === 'selected' && (
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Pilih Santri ({filteredSantri.length} hasil)</label>
                        <button onClick={handleToggleAll} className="text-xs font-semibold text-teal-600 hover:underline">{selectedIds.length === filteredSantri.length ? 'Hapus Pilihan' : 'Pilih Semua'}</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 border bg-white p-3 rounded-md">
                        {filteredSantri.length > 0 ? filteredSantri.map(santri => (
                          <div key={santri.id} className="flex items-center">
                              <input id={`${radioGroupName}-santri-${santri.id}`} type="checkbox" checked={selectedIds.includes(santri.id)} onChange={() => handleSelection(santri.id)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" />
                              <label htmlFor={`${radioGroupName}-santri-${santri.id}`} className="ml-2 text-sm text-gray-700">{santri.namaLengkap}</label>
                          </div>
                        )) : <p className="text-sm text-gray-400 col-span-full text-center">Tidak ada santri sesuai filter.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};


type ReportOptionsProps = {
    config: ReturnType<typeof useReportConfig>;
    filteredSantri: Santri[];
    settings: PondokSettings;
    selectedJenjangId: string;
};

export const ReportOptions: React.FC<ReportOptionsProps> = ({ config, filteredSantri, settings, selectedJenjangId }) => {
    const { activeReport, options } = config;
    
    // Internal state for Rekening Koran selector
    const [rekeningSearch, setRekeningSearch] = useState('');
    const [rekeningJenjang, setRekeningJenjang] = useState('');
    const [rekeningKelas, setRekeningKelas] = useState('');

    const rekeningAvailableKelas = useMemo(() => {
        if (!rekeningJenjang) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === parseInt(rekeningJenjang));
    }, [rekeningJenjang, settings.kelas]);

    const santriForRekeningSelector = useMemo(() => {
        return filteredSantri.filter(s => {
            const searchLower = rekeningSearch.toLowerCase();
            const nameMatch = s.namaLengkap.toLowerCase().includes(searchLower);
            const nisMatch = s.nis.toLowerCase().includes(searchLower);

            return (
                (nameMatch || nisMatch) &&
                (!rekeningJenjang || s.jenjangId === parseInt(rekeningJenjang)) &&
                (!rekeningKelas || s.kelasId === parseInt(rekeningKelas))
            );
        });
    }, [filteredSantri, rekeningSearch, rekeningJenjang, rekeningKelas]);


    const availableMapel = useMemo(() => {
        if (!selectedJenjangId) return [];
        return settings.mataPelajaran.filter(m => m.jenjangId === parseInt(selectedJenjangId));
    }, [selectedJenjangId, settings.mataPelajaran]);

    const hijriMonths = useMemo(() => [
        { value: 1, name: "Muharram" }, { value: 2, name: "Safar" }, { value: 3, name: "Rabi'ul Awwal" },
        { value: 4, name: "Rabi'ul Akhir" }, { value: 5, name: "Jumadal Ula" }, { value: 6, name: "Jumadal Akhirah" },
        { value: 7, name: "Rajab" }, { value: 8, name: "Sha'ban" }, { value: 9, name: "Ramadhan" },
        { value: 10, name: "Shawwal" }, { value: 11, name: "Dhu al-Qi'dah" }, { value: 12, name: "Dhu al-Hijjah" }
    ], []);

    const availableLabelFields = useMemo(() => [
        { id: 'namaLengkap', label: 'Nama Lengkap' }, { id: 'nis', label: 'NIS' }, { id: 'rombel', label: 'Nama Rombel' },
        { id: 'jenjang', label: 'Nama Jenjang' }, { id: 'namaHijrah', label: 'Nama Hijrah' }, { id: 'ttl', label: 'Tempat & Tgl. Lahir' },
    ], []);

    const availableCardFields = useMemo(() => [
        { id: 'foto', label: 'Foto' }, { id: 'namaLengkap', label: 'Nama Lengkap' }, { id: 'nis', label: 'NIS' },
        { id: 'jenjang', label: 'Jenjang' }, { id: 'rombel', label: 'Rombel' }, { id: 'ttl', label: 'TTL' },
        { id: 'ayahWali', label: 'Ayah/Wali' },
    ], []);

    const handleMapelSelection = (mapelId: number) => {
        options.setSelectedMapelIds(prev => 
          prev.includes(mapelId) 
            ? prev.filter(id => id !== mapelId)
            : [...prev, mapelId]
        );
      };
      
    const handleLabelFieldChange = (fieldId: string) => {
        options.setLabelFields(prev => 
          prev.includes(fieldId)
            ? prev.filter(id => id !== fieldId)
            : [...prev, fieldId]
        );
    };
    
    const handleCardFieldChange = (fieldId: string) => {
        options.setCardFields(prev => 
          prev.includes(fieldId)
            ? prev.filter(id => id !== fieldId)
            : [...prev, fieldId]
        );
    };

    if (activeReport === ReportType.DashboardSummary || activeReport === ReportType.FinanceSummary) {
        return (
            <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">Laporan ini akan mencakup ringkasan data keseluruhan dan tidak memerlukan opsi tambahan.</p>
            </div>
        );
    }

    switch (activeReport) {
        case ReportType.LaporanArusKas:
            return (
                <div className="pt-4 border-t">
                    <h3 className="text-md font-semibold text-gray-700 mb-2">Filter Rentang Tanggal Laporan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Mulai</label><input type="date" value={options.kasStartDate} onChange={e => options.setKasStartDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Selesai</label><input type="date" value={options.kasEndDate} onChange={e => options.setKasEndDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    </div>
                </div>
            );
        case ReportType.RekeningKoranSantri:
             const handleRekeningSelection = (santriId: number) => {
                options.setSelectedRekeningKoranSantriIds(prev => prev.includes(santriId) ? prev.filter(id => id !== santriId) : [...prev, santriId]);
             };
             const handleRekeningToggleAll = () => {
                const allIds = santriForRekeningSelector.map(s => s.id);
                const allCurrentlySelected = allIds.length > 0 && allIds.every(id => options.selectedRekeningKoranSantriIds.includes(id));
                if (allCurrentlySelected) {
                    options.setSelectedRekeningKoranSantriIds(prev => prev.filter(id => !allIds.includes(id)));
                } else {
                    options.setSelectedRekeningKoranSantriIds(prev => [...new Set([...prev, ...allIds])]);
                }
             };

             return (
                <div className="pt-4 border-t space-y-4">
                     <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Filter Rentang Tanggal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Mulai</label><input type="date" value={options.rekeningKoranStartDate} onChange={e => options.setRekeningKoranStartDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                            <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Selesai</label><input type="date" value={options.rekeningKoranEndDate} onChange={e => options.setRekeningKoranEndDate(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">Santri yang Akan Dicetak</h3>
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex items-center"><input type="radio" id="rekeningKoran-all" name="rekeningKoran" value="all" checked={options.rekeningKoranPrintMode === 'all'} onChange={e => options.setRekeningKoranPrintMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="rekeningKoran-all" className="ml-2 text-sm">Cetak Semua Santri Hasil Filter Utama ({filteredSantri.length} santri)</label></div>
                            <div className="flex items-center"><input type="radio" id="rekeningKoran-select" name="rekeningKoran" value="selected" checked={options.rekeningKoranPrintMode === 'selected'} onChange={e => options.setRekeningKoranPrintMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="rekeningKoran-select" className="ml-2 text-sm">Pilih Santri Tertentu</label></div>
                        </div>

                        {options.rekeningKoranPrintMode === 'selected' && (
                            <div className="p-4 bg-gray-100 rounded-lg border space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input type="text" placeholder="Cari Nama atau NIS..." value={rekeningSearch} onChange={e => setRekeningSearch(e.target.value)} className="sm:col-span-3 bg-white border border-gray-300 rounded-md p-2 text-sm" />
                                    <select value={rekeningJenjang} onChange={e => { setRekeningJenjang(e.target.value); setRekeningKelas(''); }} className="bg-white border p-2 text-sm rounded-md"><option value="">Filter Jenjang</option>{settings.jenjang.map(j=><option key={j.id} value={j.id}>{j.nama}</option>)}</select>
                                    <select value={rekeningKelas} onChange={e => setRekeningKelas(e.target.value)} disabled={!rekeningJenjang} className="bg-white border p-2 text-sm rounded-md disabled:bg-gray-200"><option value="">Filter Kelas</option>{rekeningAvailableKelas.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}</select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Pilih Santri ({santriForRekeningSelector.length} hasil)</label>
                                        <button onClick={handleRekeningToggleAll} className="text-xs font-semibold text-teal-600 hover:underline">
                                            {santriForRekeningSelector.length > 0 && santriForRekeningSelector.every(s => options.selectedRekeningKoranSantriIds.includes(s.id)) ? 'Hapus Pilihan' : 'Pilih Semua Hasil'}
                                        </button>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 border bg-white p-3 rounded-md">
                                        {santriForRekeningSelector.length > 0 ? santriForRekeningSelector.map(santri => (
                                          <div key={santri.id} className="flex items-center">
                                              <input id={`rekening-santri-${santri.id}`} type="checkbox" checked={options.selectedRekeningKoranSantriIds.includes(santri.id)} onChange={() => handleRekeningSelection(santri.id)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" />
                                              <label htmlFor={`rekening-santri-${santri.id}`} className="ml-2 text-sm text-gray-700">{santri.namaLengkap}</label>
                                          </div>
                                        )) : <p className="text-sm text-gray-400 col-span-full text-center">Tidak ada santri sesuai filter.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             );
        case ReportType.LaporanAsrama:
            return (
                <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">Laporan ini akan mencakup data rekapitulasi keasramaan berdasarkan filter gedung yang dipilih. Klik 'Tampilkan Pratinjau' untuk melanjutkan.</p>
                </div>
            );
        case ReportType.Biodata:
            return (
                <div className="pt-4 border-t space-y-4">
                    <SantriSelector title="Opsi Cetak Biodata" printMode={options.biodataPrintMode} setPrintMode={options.setBiodataPrintMode} selectedIds={options.selectedBiodataSantriIds} setSelectedIds={options.setSelectedBiodataSantriIds} radioGroupName="biodata" filteredSantri={filteredSantri} />
                    <div className="pt-4 border-t">
                        <h4 className="text-md font-semibold text-gray-700 mb-2">Opsi Tanda Tangan</h4>
                        <div className="flex items-center mb-2"><input type="checkbox" id="useHijri" checked={options.useHijriDate} onChange={e => options.setUseHijriDate(e.target.checked)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"/><label htmlFor="useHijri" className="ml-2 text-sm font-medium text-gray-700">Sertakan Tanggal Hijriah</label></div>
                        {options.useHijriDate && (<div className="pl-6 space-y-2"><div className="flex gap-4"><div className="flex items-center"><input type="radio" id="hijri-auto" value="auto" checked={options.hijriDateMode === 'auto'} onChange={e => options.setHijriDateMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="hijri-auto" className="ml-2 text-sm">Otomatis (Hari Ini)</label></div><div className="flex items-center"><input type="radio" id="hijri-manual" value="manual" checked={options.hijriDateMode === 'manual'} onChange={e => options.setHijriDateMode(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="hijri-manual" className="ml-2 text-sm">Manual</label></div></div>{options.hijriDateMode === 'manual' && (<div><input type="text" value={options.manualHijriDate} onChange={e => options.setManualHijriDate(e.target.value)} placeholder="Contoh: 1 Muharram 1446 H" className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full md:w-1/2 p-2.5 mt-1"/></div>)}</div>)}
                    </div>
                </div>
            );
        case ReportType.LembarPembinaan:
            return <div className="pt-4 border-t"><SantriSelector title="Opsi Cetak Lembar Pembinaan" printMode={options.pembinaanPrintMode} setPrintMode={options.setPembinaanPrintMode} selectedIds={options.selectedPembinaanSantriIds} setSelectedIds={options.setSelectedPembinaanSantriIds} radioGroupName="pembinaan" filteredSantri={filteredSantri} /></div>;
        case ReportType.FormulirIzin:
            return (
              <div className="pt-4 border-t space-y-4">
                  <h3 className="text-md font-semibold text-gray-700">Opsi Formulir Izin</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Tujuan</label><input type="text" value={options.izinTujuan} onChange={e => options.setIzinTujuan(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: Rumah, Rumah Sakit" /></div>
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Keperluan</label><input type="text" value={options.izinKeperluan} onChange={e => options.setIzinKeperluan(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: Menjenguk orang tua sakit" /></div>
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Berangkat</label><input type="date" value={options.izinTanggalBerangkat} onChange={e => options.setIzinTanggalBerangkat(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    <div><label className="block mb-1 text-sm font-medium text-gray-700">Tanggal Kembali</label><input type="date" value={options.izinTanggalKembali} onChange={e => options.setIzinTanggalKembali(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    <div className="md:col-span-2"><label className="block mb-1 text-sm font-medium text-gray-700">Nama Penjemput</label><input type="text" value={options.izinPenjemput} onChange={e => options.setIzinPenjemput(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Nama lengkap penjemput" /></div>
                  </div>
                  <div className="pt-4 border-t"><h4 className="text-md font-semibold text-gray-700 mb-2">Pengaturan Tanda Tangan</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block mb-1 text-sm font-medium text-gray-700">Jabatan Penanda Tangan</label><input type="text" value={options.izinSignatoryTitle} onChange={e => options.setIzinSignatoryTitle(e.target.value)} placeholder="Contoh: Bag. Keamanan" className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div><div><label className="block mb-1 text-sm font-medium text-gray-700">Penanda Tangan (Opsional)</label><select value={options.izinSignatoryId} onChange={e => options.setIzinSignatoryId(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih Penanda Tangan --</option>{settings.tenagaPengajar.map(p => (<option key={p.id} value={p.id.toString()}>{p.nama}</option>))}</select></div></div></div>
                  <div className="pt-4 border-t"><h4 className="text-md font-semibold text-gray-700 mb-2">Ketentuan Izin</h4><div><label htmlFor="ketentuan-izin" className="block mb-1 text-sm font-medium text-gray-700">Tulis ketentuan di sini, pisahkan setiap poin dengan baris baru.</label><textarea id="ketentuan-izin" rows={5} value={options.izinKetentuan} onChange={e => options.setIzinKetentuan(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"/></div></div>
                  <SantriSelector title="" printMode={options.izinPrintMode} setPrintMode={options.setIzinPrintMode} selectedIds={options.selectedIzinSantriIds} setSelectedIds={options.setSelectedIzinSantriIds} radioGroupName="izin" filteredSantri={filteredSantri} />
              </div>
            );
        case ReportType.KartuSantri:
             return (
                <div className="pt-4 border-t space-y-4">
                    <h3 className="text-md font-semibold text-gray-700">Kustomisasi Kartu Santri</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Tema Warna</label><div className="flex items-center gap-2">{Object.entries(options.predefinedCardThemes).map(([name, color]) => (<button key={name} type="button" title={name} onClick={() => options.setCardTheme(color)} className={`w-8 h-8 rounded-full border-2 ${options.cardTheme === color ? 'border-teal-500 ring-2 ring-teal-300' : 'border-white'}`} style={{ backgroundColor: color }}/>))}<div className="relative"><input type="color" value={options.cardTheme} onChange={e => options.setCardTheme(e.target.value)} className="w-8 h-8 p-0 border-0 rounded-full cursor-pointer appearance-none bg-transparent"/><i className="bi bi-eyedropper absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none"></i></div></div></div>
                        <div><label className="block mb-1 text-sm font-medium text-gray-700">Berlaku Hingga</label><input type="date" value={options.cardValidUntil} onChange={e => options.setCardValidUntil(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    </div>
                    <div><label className="block mb-2 text-sm font-medium text-gray-700">Data yang Ditampilkan</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border bg-white p-3 rounded-md">{availableCardFields.map(field => (<div key={field.id} className="flex items-center"><input id={`card-field-${field.id}`} type="checkbox" checked={options.cardFields.includes(field.id)} onChange={() => handleCardFieldChange(field.id)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" /><label htmlFor={`card-field-${field.id}`} className="ml-2 text-sm text-gray-700">{field.label}</label></div>))}</div></div>
                    <div className="md:col-span-2 pt-4 border-t"><h4 className="text-md font-semibold text-gray-700 mb-2">Pengaturan Tanda Tangan</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block mb-1 text-sm font-medium text-gray-700">Jabatan Penanda Tangan</label><input type="text" value={options.cardSignatoryTitle} onChange={e => options.setCardSignatoryTitle(e.target.value)} placeholder="Contoh: Kepala Sekolah" className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div><div><label className="block mb-1 text-sm font-medium text-gray-700">Penanda Tangan</label><select value={options.cardSignatoryId} onChange={e => options.setCardSignatoryId(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="">-- Pilih Penanda Tangan --</option>{settings.tenagaPengajar.map(p => (<option key={p.id} value={p.id.toString()}>{p.nama}</option>))}</select></div></div></div>
                    <SantriSelector title="" printMode={options.cardPrintMode} setPrintMode={options.setCardPrintMode} selectedIds={options.selectedCardSantriIds} setSelectedIds={options.setSelectedCardSantriIds} radioGroupName="card" filteredSantri={filteredSantri} />
                </div>
             );
        case ReportType.LabelSantri:
            return (
                <div className="pt-4 border-t space-y-4">
                    <h3 className="text-md font-semibold text-gray-700">Kustomisasi Label</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div><label className="block mb-1 text-sm font-medium text-gray-700">Lebar Label (cm)</label><input type="number" value={options.labelWidth} onChange={e => options.setLabelWidth(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                       <div><label className="block mb-1 text-sm font-medium text-gray-700">Tinggi Label (cm)</label><input type="number" value={options.labelHeight} onChange={e => options.setLabelHeight(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div>
                    </div>
                     <div><label className="block mb-2 text-sm font-medium text-gray-700">Data yang Ditampilkan</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border bg-white p-3 rounded-md">{availableLabelFields.map(field => (<div key={field.id} className="flex items-center"><input id={`field-${field.id}`} type="checkbox" checked={options.labelFields.includes(field.id)} onChange={() => handleLabelFieldChange(field.id)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" /><label htmlFor={`field-${field.id}`} className="ml-2 text-sm text-gray-700">{field.label}</label></div>))}</div></div>
                    <SantriSelector title="" printMode={options.labelPrintMode} setPrintMode={options.setLabelPrintMode} selectedIds={options.selectedLabelSantriIds} setSelectedIds={options.setSelectedLabelSantriIds} radioGroupName="label" filteredSantri={filteredSantri} />
                </div>
            );
        case ReportType.LembarNilai:
            return (
                <div className="pt-4 border-t space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2"><label className="block text-sm font-medium text-gray-700">Pilih Mata Pelajaran (Jenjang: {selectedJenjangId ? settings.jenjang.find(j=>j.id === parseInt(selectedJenjangId))?.nama : 'Semua'})</label><div className="space-x-2"><button onClick={() => options.setSelectedMapelIds(availableMapel.map(m => m.id))} className="text-xs font-semibold text-teal-600 hover:underline">Pilih Semua</button><button onClick={() => options.setSelectedMapelIds([])} className="text-xs font-semibold text-gray-500 hover:underline">Hapus Semua</button></div></div>
                    <div className="max-h-32 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 border bg-white p-3 rounded-md">
                      {availableMapel.length > 0 ? availableMapel.map(mapel => (<div key={mapel.id} className="flex items-center"><input id={`mapel-${mapel.id}`} type="checkbox" checked={options.selectedMapelIds.includes(mapel.id)} onChange={() => handleMapelSelection(mapel.id)} className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500" /><label htmlFor={`mapel-${mapel.id}`} className="ml-2 text-sm text-gray-700">{mapel.nama}</label></div>)) : <p className="text-sm text-gray-400 col-span-full text-center">Pilih jenjang spesifik untuk melihat mata pelajaran.</p>}
                    </div>
                  </div>
                   <div className="pt-4 border-t">
                        <h4 className="text-md font-semibold text-gray-700 mb-2">Pengaturan Laporan</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Semester</label>
                                <select value={options.semester} onChange={e => options.setSemester(e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                    <option value="Ganjil">Ganjil</option>
                                    <option value="Genap">Genap</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label>
                                <input type="text" value={options.tahunAjaran} onChange={e => options.setTahunAjaran(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: 1446/1447 H"/>
                            </div>
                        </div>
                    </div>
                   <div className="pt-4 border-t">
                        <h4 className="text-md font-semibold text-gray-700 mb-2">Struktur Kolom Nilai</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah Kolom Nilai TP</label>
                                <input type="number" value={options.nilaiTpCount} onChange={e => options.setNilaiTpCount(Number(e.target.value))} min="1" max="10" className="bg-white border border-gray-300 text-sm rounded-lg w-full p-2.5" />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Jumlah Kolom Nilai SM</label>
                                <input type="number" value={options.nilaiSmCount} onChange={e => options.setNilaiSmCount(Number(e.target.value))} min="1" max="5" className="bg-white border border-gray-300 text-sm rounded-lg w-full p-2.5" />
                            </div>
                            <div className="flex items-end">
                                <div className="flex items-center">
                                    <input type="checkbox" id="show-nts" checked={options.showNilaiTengahSemester} onChange={e => options.setShowNilaiTengahSemester(e.target.checked)} className="w-4 h-4 text-teal-600 rounded" />
                                    <label htmlFor="show-nts" className="ml-2 text-sm font-medium text-gray-700">Sertakan Kolom Tengah Semester (STS)</label>
                                </div>
                            </div>
                        </div>
                    </div>
                   <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Opsi Panduan Penilaian</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex items-center">
                                <input type="radio" id="g-show" value="show" checked={options.guidanceOption === 'show'} onChange={e => options.setGuidanceOption(e.target.value as any)} className="w-4 h-4 text-teal-600"/>
                                <label htmlFor="g-show" className="ml-2 text-sm">Tampilkan di halaman terpisah</label>
                            </div>
                            <div className="flex items-center">
                                <input type="radio" id="g-hide" value="hide" checked={options.guidanceOption === 'hide'} onChange={e => options.setGuidanceOption(e.target.value as any)} className="w-4 h-4 text-teal-600"/>
                                <label htmlFor="g-hide" className="ml-2 text-sm">Jangan tampilkan</label>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case ReportType.LembarAbsensi:
            return (
                <div className="pt-4 border-t space-y-4">
                    <div>
                        <h4 className="text-md font-semibold text-gray-700 mb-2">Periode Absensi</h4>
                        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div><label className="block mb-2 text-sm font-medium text-gray-700">Jenis Kalender</label><div className="flex gap-4"><div className="flex items-center"><input type="radio" id="masehi" value="Masehi" checked={options.attendanceCalendar === 'Masehi'} onChange={e => options.setAttendanceCalendar(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="masehi" className="ml-2">Masehi</label></div><div className="flex items-center"><input type="radio" id="hijriah" value="Hijriah" checked={options.attendanceCalendar === 'Hijriah'} onChange={e => options.setAttendanceCalendar(e.target.value as any)} className="w-4 h-4 text-teal-600"/><label htmlFor="hijriah" className="ml-2">Hijriah</label></div></div></div>
                            {options.attendanceCalendar === 'Masehi' ? (<><div className="md:col-span-1"><label htmlFor="startMonth" className="block mb-1 text-sm font-medium text-gray-700">Bulan Mulai</label><input type="month" id="startMonth" value={options.startMonth} onChange={e => options.setStartMonth(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div><div className="md:col-span-1"><label htmlFor="endMonth" className="block mb-1 text-sm font-medium text-gray-700">Bulan Selesai</label><input type="month" id="endMonth" value={options.endMonth} onChange={e => options.setEndMonth(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" /></div></>) : (<><div className="grid grid-cols-2 gap-2"><div><label className="block mb-1 text-sm font-medium text-gray-700">Bulan Mulai</label><select value={options.hijriStartMonth} onChange={e => options.setHijriStartMonth(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">{hijriMonths.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select></div><div><label className="block mb-1 text-sm font-medium text-gray-700">Tahun</label><input type="number" value={options.hijriStartYear} onChange={e => options.setHijriStartYear(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"/></div></div><div className="grid grid-cols-2 gap-2"><div><label className="block mb-1 text-sm font-medium text-gray-700">Bulan Selesai</label><select value={options.hijriEndMonth} onChange={e => options.setHijriEndMonth(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">{hijriMonths.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}</select></div><div><label className="block mb-1 text-sm font-medium text-gray-700">Tahun</label><input type="number" value={options.hijriEndYear} onChange={e => options.setHijriEndYear(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"/></div></div></>)}
                        </div>
                    </div>
                    <div className="pt-4 border-t">
                        <h4 className="text-md font-semibold text-gray-700 mb-2">Informasi Tambahan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label htmlFor="semester-absensi" className="block mb-1 text-sm font-medium text-gray-700">Semester</label><select id="semester-absensi" value={options.semester} onChange={e => options.setSemester(e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="Ganjil">Ganjil</option><option value="Genap">Genap</option></select></div>
                            <div><label htmlFor="tahun-ajaran-absensi" className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label><input type="text" id="tahun-ajaran-absensi" value={options.tahunAjaran} onChange={e => options.setTahunAjaran(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: 1446/1447 H" /></div>
                        </div>
                    </div>
                </div>
            );
        case ReportType.LembarKedatangan:
            return (
                <div className="pt-4 border-t space-y-4">
                    <h3 className="text-md font-semibold text-gray-700">Opsi Lembar Kedatangan</h3>
                    <div>
                        <label htmlFor="agenda-kedatangan" className="block mb-1 text-sm font-medium text-gray-700">Keterangan Agenda</label>
                        <input type="text" id="agenda-kedatangan" value={options.agendaKedatangan} onChange={e => options.setAgendaKedatangan(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: Libur Idul Fitri 1446 H" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="semester-kedatangan" className="block mb-1 text-sm font-medium text-gray-700">Semester</label>
                            <select id="semester-kedatangan" value={options.semester} onChange={e => options.setSemester(e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5">
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tahun-ajaran-kedatangan" className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label>
                            <input type="text" id="tahun-ajaran-kedatangan" value={options.tahunAjaran} onChange={e => options.setTahunAjaran(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: 1446/1447 H" />
                        </div>
                    </div>
                </div>
            );
        case ReportType.LembarRapor:
             return (
                <div className="pt-4 border-t">
                    <h3 className="text-md font-semibold text-gray-700">Opsi Lembar Rapor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="semester" className="block mb-1 text-sm font-medium text-gray-700">Semester</label><select id="semester" value={options.semester} onChange={e => options.setSemester(e.target.value as any)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"><option value="Ganjil">Ganjil</option><option value="Genap">Genap</option></select></div>
                        <div><label htmlFor="tahun-ajaran" className="block mb-1 text-sm font-medium text-gray-700">Tahun Ajaran</label><input type="text" id="tahun-ajaran" value={options.tahunAjaran} onChange={e => options.setTahunAjaran(e.target.value)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5" placeholder="Contoh: 1446/1447 H" /></div>
                    </div>
                </div>
            );
        default:
            return null;
    }
};