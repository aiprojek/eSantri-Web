import { Santri, PondokSettings } from '../types';

export const generateNis = (
    settings: PondokSettings,
    santriList: Santri[],
    currentSantri: Santri
): string => {
    const { nisSettings } = settings;

    switch (nisSettings.generationMethod) {
        case 'custom':
            return generateNisCustom(settings, santriList, currentSantri);
        case 'global':
            return generateNisGlobal(settings, santriList, currentSantri);
        case 'dob':
            return generateNisDob(settings, santriList, currentSantri);
        default:
            throw new Error('Metode pembuatan NIS tidak valid. Harap periksa Pengaturan.');
    }
};

const generateNisCustom = (
    settings: PondokSettings,
    santriList: Santri[],
    currentSantri: Santri
): string => {
    if (!currentSantri.jenjangId || !currentSantri.tanggalMasuk) {
        throw new Error('Harap lengkapi Jenjang dan Tanggal Masuk untuk membuat NIS.');
    }
    const { nisSettings } = settings;
    const jenjang = settings.jenjang.find(j => j.id === currentSantri.jenjangId);
    if (!jenjang || !jenjang.kode) {
        throw new Error('Data jenjang atau kode jenjang tidak ditemukan. Harap periksa Pengaturan.');
    }
    const jenjangConfig = nisSettings.jenjangConfig.find(jc => jc.jenjangId === jenjang.id);
    if (!jenjangConfig) {
        throw new Error(`Pengaturan NIS untuk jenjang ${jenjang.nama} belum diatur. Harap atur di menu Pengaturan.`);
    }
    const masehiYear = nisSettings.masehiYearSource === 'manual'
        ? nisSettings.manualMasehiYear
        : new Date(currentSantri.tanggalMasuk).getFullYear();
    const hijriYear = nisSettings.hijriahYearSource === 'manual'
        ? nisSettings.manualHijriahYear
        : Math.round((masehiYear - 622) * 1.0307);
    const tm = masehiYear.toString().slice(-2);
    const th = hijriYear.toString().slice(-2);
    const santriInSameJenjangAndYear = santriList.filter(s => {
        if (s.id === currentSantri.id) return false;
        const sJenjangId = s.jenjangId;
        const sTahunMasuk = nisSettings.masehiYearSource === 'manual'
            ? nisSettings.manualMasehiYear
            : s.tanggalMasuk ? new Date(s.tanggalMasuk).getFullYear() : 0;
        return sJenjangId === jenjang.id && sTahunMasuk === masehiYear;
    });
    const nextSeqNumber = jenjangConfig.startNumber + santriInSameJenjangAndYear.length;
    const noUrut = nextSeqNumber.toString().padStart(jenjangConfig.padding, '0');
    
    return nisSettings.format
        .replace('{TM}', tm)
        .replace('{TH}', th)
        .replace('{KODE}', jenjang.kode)
        .replace('{NO_URUT}', noUrut);
};

const generateNisGlobal = (
    settings: PondokSettings,
    santriList: Santri[],
    currentSantri: Santri
): string => {
    if (!currentSantri.tanggalMasuk || !currentSantri.jenjangId) {
        throw new Error('Tanggal masuk dan data pendidikan (Jenjang) harus diisi untuk membuat NIS.');
    }
    const { nisSettings } = settings;
    const { globalPrefix, globalUseYearPrefix, globalUseJenjangCode, globalStartNumber, globalPadding } = nisSettings;
    
    const jenjang = settings.jenjang.find(j => j.id === currentSantri.jenjangId);

    if (globalUseJenjangCode && (!jenjang || !jenjang.kode)) {
        throw new Error('Kode jenjang tidak ditemukan untuk santri ini. Harap periksa Pengaturan.');
    }

    const entryYear = new Date(currentSantri.tanggalMasuk).getFullYear();
    const yearPart = globalUseYearPrefix ? entryYear.toString() : '';
    const jenjangCodePart = (globalUseJenjangCode && jenjang) ? jenjang.kode : '';
    const prefix = yearPart + globalPrefix + jenjangCodePart;

    let maxSeq = 0;
    const relevantSantri = santriList.filter(s => {
        if (s.id === currentSantri.id) return false;

        const sJenjangId = s.jenjangId;
        const isSameJenjang = globalUseJenjangCode ? sJenjangId === jenjang?.id : true;
        const sEntryYear = s.tanggalMasuk ? new Date(s.tanggalMasuk).getFullYear() : 0;
        const isSameYear = globalUseYearPrefix ? sEntryYear === entryYear : true;
        
        return isSameJenjang && isSameYear;
    });

    const regex = new RegExp(`^${prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(\\d{${globalPadding}})$`);
    relevantSantri.forEach(s => {
        const match = s.nis.match(regex);
        if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
        }
    });

    const nextSeq = maxSeq === 0 ? globalStartNumber : maxSeq + 1;
    return prefix + nextSeq.toString().padStart(globalPadding, '0');
};

const generateNisDob = (
    settings: PondokSettings,
    santriList: Santri[],
    currentSantri: Santri
): string => {
    if (!currentSantri.tanggalLahir || !currentSantri.jenjangId) {
        throw new Error('Tanggal lahir dan data pendidikan (Jenjang) harus diisi untuk membuat NIS.');
    }
    const { nisSettings } = settings;
    const { dobFormat, dobSeparator, dobUseJenjangCode, dobPadding } = nisSettings;
    
    const jenjang = settings.jenjang.find(j => j.id === currentSantri.jenjangId);

    if (dobUseJenjangCode && (!jenjang || !jenjang.kode)) {
        throw new Error('Kode jenjang tidak ditemukan untuk santri ini. Harap periksa Pengaturan.');
    }

    const dob = new Date(currentSantri.tanggalLahir);
    const day = dob.getDate().toString().padStart(2, '0');
    const month = (dob.getMonth() + 1).toString().padStart(2, '0');
    const year = dob.getFullYear().toString();
    
    let datePart = '';
    if (dobFormat === 'YYYYMMDD') datePart = year + month + day;
    else if (dobFormat === 'DDMMYY') datePart = day + month + year.slice(-2);
    else if (dobFormat === 'YYMMDD') datePart = year.slice(-2) + month + day;
    
    const santriWithSameDob = santriList.filter(s => {
      if (s.id === currentSantri.id || !s.tanggalLahir || s.tanggalLahir !== currentSantri.tanggalLahir) {
          return false;
      }
      if (dobUseJenjangCode) {
          return s.jenjangId === jenjang?.id;
      }
      return true;
    });

    const nextDobSeq = santriWithSameDob.length + 1;
    const jenjangCodePart = (dobUseJenjangCode && jenjang) ? jenjang.kode : '';

    return datePart + dobSeparator + jenjangCodePart + nextDobSeq.toString().padStart(dobPadding, '0');
};
