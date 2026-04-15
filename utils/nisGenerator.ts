import { Santri, PondokSettings } from '../types';

export const generateNis = (
    settings: PondokSettings,
    santriList: Santri[],
    currentSantri: Santri
): string => {
    const { nisSettings } = settings;

    if (nisSettings.useIndependentSettings && currentSantri.jenjangId) {
        const jc = nisSettings.jenjangConfig.find(c => c.jenjangId === currentSantri.jenjangId);
        if (jc) {
            const method = jc.method || 'global';
            if (method === 'custom') return generateNisCustom(settings, santriList, currentSantri, jc);
            if (method === 'global') return generateNisGlobal(settings, santriList, currentSantri, jc);
            if (method === 'dob') return generateNisDob(settings, santriList, currentSantri, jc);
        }
    }

    switch (nisSettings.generationMethod) {
        case 'custom':
            return generateNisCustom(settings, santriList, currentSantri, nisSettings);
        case 'global':
            return generateNisGlobal(settings, santriList, currentSantri, nisSettings);
        case 'dob':
            return generateNisDob(settings, santriList, currentSantri, nisSettings);
        default:
            throw new Error('Metode pembuatan NIS tidak valid. Harap periksa Pengaturan.');
    }
};

const generateNisCustom = (
    settings: PondokSettings,
    santriList: Santri[],
    currentSantri: Santri,
    config: any
): string => {
    if (!currentSantri.jenjangId || !currentSantri.tanggalMasuk) {
        throw new Error('Harap lengkapi Jenjang dan Tanggal Masuk untuk membuat NIS.');
    }
    const { nisSettings } = settings;
    const jenjang = settings.jenjang.find(j => j.id === currentSantri.jenjangId);
    if (!jenjang || !jenjang.kode) {
        throw new Error('Data jenjang atau kode jenjang tidak ditemukan. Harap periksa Pengaturan.');
    }

    const format = config.format || nisSettings.format || '{TM}{KODE}{NO_URUT}';
    const startNumber = config.startNumber !== undefined ? config.startNumber : 1;
    const padding = config.padding !== undefined ? config.padding : 3;

    const masehiYear = nisSettings.masehiYearSource === 'manual'
        ? nisSettings.manualMasehiYear
        : new Date(currentSantri.tanggalMasuk).getFullYear();
    const hijriYear = nisSettings.hijriahYearSource === 'manual'
        ? nisSettings.manualHijriahYear
        : Math.round((masehiYear - 622) * 1.0307);
    const tm = masehiYear.toString().slice(-2);
    const th = hijriYear.toString().slice(-2);
    
    // Split format into prefix and suffix around {NO_URUT}
    const parts = format.split('{NO_URUT}');
    const prefixFormat = parts[0] || '';
    const suffixFormat = parts[1] || '';

    const prefix = prefixFormat
        .replace('{TM}', tm)
        .replace('{TH}', th)
        .replace('{KODE}', jenjang.kode);
    
    const suffix = suffixFormat
        .replace('{TM}', tm)
        .replace('{TH}', th)
        .replace('{KODE}', jenjang.kode);

    // Escape for regex
    const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedSuffix = suffix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`^${escapedPrefix}(\\d+)${escapedSuffix}$`);
    
    // Find max sequence number among existing santri
    let maxSeq = 0;
    santriList.forEach(s => {
        if (s.id === currentSantri.id || !s.nis) return;
        
        // Only consider santri of same jenjang to avoid cross-jenjang numbering issues
        // unless we are in a global mode (but this is custom per jenjang usually)
        if (s.jenjangId !== currentSantri.jenjangId) return;

        const match = s.nis.match(regex);
        if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
        }
    });

    let nextSeqNumber = maxSeq === 0 ? startNumber : maxSeq + 1;
    
    // Safety loop to ensure uniqueness in current list
    let finalNis = '';
    let attempts = 0;
    while (attempts < 100) {
        const noUrut = nextSeqNumber.toString().padStart(padding, '0');
        finalNis = prefix + noUrut + suffix;
        
        const isDuplicate = santriList.some(s => s.id !== currentSantri.id && s.nis === finalNis);
        if (!isDuplicate) break;
        
        nextSeqNumber++;
        attempts++;
    }
    
    return finalNis;
};

const generateNisGlobal = (
    settings: PondokSettings,
    santriList: Santri[],
    currentSantri: Santri,
    config: any
): string => {
    if (!currentSantri.tanggalMasuk || !currentSantri.jenjangId) {
        throw new Error('Tanggal masuk dan data pendidikan (Jenjang) harus diisi untuk membuat NIS.');
    }
    const { nisSettings } = settings;
    
    const prefixStr = config.prefix !== undefined ? config.prefix : nisSettings.globalPrefix;
    const useYearPrefix = config.useYearPrefix !== undefined ? config.useYearPrefix : nisSettings.globalUseYearPrefix;
    const useJenjangCode = config.useJenjangCode !== undefined ? config.useJenjangCode : nisSettings.globalUseJenjangCode;
    const startNumber = config.startNumber !== undefined ? config.startNumber : nisSettings.globalStartNumber;
    const padding = config.padding !== undefined ? config.padding : nisSettings.globalPadding;
    
    const jenjang = settings.jenjang.find(j => j.id === currentSantri.jenjangId);

    if (useJenjangCode && (!jenjang || !jenjang.kode)) {
        throw new Error('Kode jenjang tidak ditemukan untuk santri ini. Harap periksa Pengaturan.');
    }

    const entryYear = new Date(currentSantri.tanggalMasuk).getFullYear();
    const yearPart = useYearPrefix ? entryYear.toString() : '';
    const jenjangCodePart = (useJenjangCode && jenjang) ? jenjang.kode : '';
    const prefix = yearPart + prefixStr + jenjangCodePart;

    let maxSeq = 0;
    const relevantSantri = santriList.filter(s => {
        if (s.id === currentSantri.id || !s.nis) return false;

        const sJenjangId = s.jenjangId;
        const isSameJenjang = useJenjangCode ? sJenjangId === jenjang?.id : true;
        const sEntryYear = s.tanggalMasuk ? new Date(s.tanggalMasuk).getFullYear() : 0;
        const isSameYear = useYearPrefix ? sEntryYear === entryYear : true;
        
        return isSameJenjang && isSameYear;
    });

    // Regex to match prefix + digits
    const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`^${escapedPrefix}(\\d+)$`);
    
    relevantSantri.forEach(s => {
        const match = s.nis.match(regex);
        if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
        }
    });

    let nextSeq = maxSeq === 0 ? startNumber : maxSeq + 1;
    
    // Safety loop to ensure uniqueness
    let finalNis = '';
    let attempts = 0;
    while (attempts < 100) {
        finalNis = prefix + nextSeq.toString().padStart(padding, '0');
        const isDuplicate = santriList.some(s => s.id !== currentSantri.id && s.nis === finalNis);
        if (!isDuplicate) break;
        nextSeq++;
        attempts++;
    }
    
    return finalNis;
};

const generateNisDob = (
    settings: PondokSettings,
    santriList: Santri[],
    currentSantri: Santri,
    config: any
): string => {
    if (!currentSantri.tanggalLahir || !currentSantri.jenjangId) {
        throw new Error('Tanggal lahir dan data pendidikan (Jenjang) harus diisi untuk membuat NIS.');
    }
    const { nisSettings } = settings;
    
    const useJenjangCode = config.useJenjangCode !== undefined ? config.useJenjangCode : nisSettings.dobUseJenjangCode;
    const padding = config.padding !== undefined ? config.padding : nisSettings.dobPadding;
    const separator = config.dobSeparator !== undefined ? config.dobSeparator : nisSettings.dobSeparator;
    const format = config.dobFormat !== undefined ? config.dobFormat : nisSettings.dobFormat;

    const jenjang = settings.jenjang.find(j => j.id === currentSantri.jenjangId);

    if (useJenjangCode && (!jenjang || !jenjang.kode)) {
        throw new Error('Kode jenjang tidak ditemukan untuk santri ini. Harap periksa Pengaturan.');
    }

    const dob = new Date(currentSantri.tanggalLahir);
    const day = dob.getDate().toString().padStart(2, '0');
    const month = (dob.getMonth() + 1).toString().padStart(2, '0');
    const year = dob.getFullYear().toString();
    
    let datePart = '';
    if (format === 'YYYYMMDD') datePart = year + month + day;
    else if (format === 'DDMMYY') datePart = day + month + year.slice(-2);
    else if (format === 'YYMMDD') datePart = year.slice(-2) + month + day;
    
    const jenjangCodePart = (useJenjangCode && jenjang) ? jenjang.kode : '';
    const prefix = datePart + separator + jenjangCodePart;

    const santriWithSamePrefix = santriList.filter(s => {
      if (s.id === currentSantri.id || !s.nis) return false;
      return s.nis.startsWith(prefix);
    });

    let nextDobSeq = santriWithSamePrefix.length + 1;
    
    // Safety loop to ensure uniqueness
    let finalNis = '';
    let attempts = 0;
    while (attempts < 100) {
        finalNis = prefix + nextDobSeq.toString().padStart(padding, '0');
        const isDuplicate = santriList.some(s => s.id !== currentSantri.id && s.nis === finalNis);
        if (!isDuplicate) break;
        nextDobSeq++;
        attempts++;
    }

    return finalNis;
};
