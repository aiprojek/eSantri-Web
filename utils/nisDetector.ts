
import { Santri, Jenjang, NisSettings, NisJenjangConfig } from '../types';

export interface DetectedNisSettings {
    generationMethod: 'custom' | 'global' | 'dob';
    format: string;
    globalPadding: number;
    globalStartNumber: number;
    jenjangConfig: NisJenjangConfig[];
}

export const detectNisSettings = (
    santriList: Santri[],
    jenjangList: Jenjang[],
    currentSettings: NisSettings
): Partial<NisSettings> => {
    if (santriList.length === 0) return {};

    // Filter santri that have NIS
    const santriWithNis = santriList.filter(s => s.nis && s.nis.length > 0);
    if (santriWithNis.length === 0) return {};

    // 1. Detect Padding and Start Number for Global
    // We look at the last few digits of the NIS
    let maxPadding = 0;
    let maxNum = 0;

    santriWithNis.forEach(s => {
        const match = s.nis.match(/(\d+)$/);
        if (match) {
            const numStr = match[1];
            if (numStr.length > maxPadding) maxPadding = numStr.length;
            const num = parseInt(numStr, 10);
            if (num > maxNum) maxNum = num;
        }
    });

    // 2. Detect if it uses Jenjang Code
    let usesJenjangCode = false;
    jenjangList.forEach(j => {
        const kode = j.kode;
        if (kode && santriWithNis.some(s => s.nis.includes(kode))) {
            usesJenjangCode = true;
        }
    });

    // 3. Detect if it uses Year
    const currentYear = new Date().getFullYear().toString();
    const currentYearShort = currentYear.slice(-2);
    let usesYear = santriWithNis.some(s => s.nis.includes(currentYear) || s.nis.includes(currentYearShort));

    // 4. Update Jenjang Configs (Start Numbers)
    const updatedJenjangConfig = currentSettings.jenjangConfig.map(jc => {
        const jenjang = jenjangList.find(j => j.id === jc.jenjangId);
        if (!jenjang) return jc;

        const santriInJenjang = santriWithNis.filter(s => s.jenjangId === jenjang.id);
        let jenjangMaxNum = 0;
        let jenjangPadding = jc.padding;

        santriInJenjang.forEach(s => {
            const match = s.nis.match(/(\d+)$/);
            if (match) {
                const numStr = match[1];
                if (numStr.length > jenjangPadding) jenjangPadding = numStr.length;
                const num = parseInt(numStr, 10);
                if (num > jenjangMaxNum) jenjangMaxNum = num;
            }
        });

        return {
            ...jc,
            startNumber: jenjangMaxNum > 0 ? jenjangMaxNum + 1 : jc.startNumber,
            padding: jenjangPadding
        };
    });

    // Suggest settings based on findings
    let suggestedMethod: 'custom' | 'global' | 'dob' = currentSettings.generationMethod;
    
    // If many NIS match DOB pattern (YYYYMMDD or similar)
    const dobMatchCount = santriWithNis.filter(s => s.nis.match(/^\d{6,8}/)).length;
    if (dobMatchCount > santriWithNis.length * 0.7) {
        suggestedMethod = 'dob';
    } else if (usesJenjangCode || usesYear) {
        // If it uses jenjang code or year, it's likely global or custom. 
        // Default to global if it's simple prefix + number
        suggestedMethod = 'global';
    }

    const suggestedSettings: Partial<NisSettings> = {
        generationMethod: suggestedMethod,
        globalPadding: maxPadding || currentSettings.globalPadding,
        globalStartNumber: maxNum > 0 ? maxNum + 1 : currentSettings.globalStartNumber,
        globalUseJenjangCode: usesJenjangCode,
        globalUseYearPrefix: usesYear,
        jenjangConfig: updatedJenjangConfig
    };

    return suggestedSettings;
};
