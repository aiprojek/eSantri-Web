
export interface SurahDef {
    number: number;
    name: string;
    ayat: number;
}

export interface JuzBoundary {
    juz: number;
    name: string;
    surahStart: number;
    ayatStart: number;
    surahEnd: number;
    ayatEnd: number;
    surahNumbers: number[];
}

export const QURAN_JUZ_DATA: JuzBoundary[] = [
    { juz: 1, name: "Juz 1 (Al-Fatihah - Al-Baqarah 141)", surahStart: 1, ayatStart: 1, surahEnd: 2, ayatEnd: 141, surahNumbers: [1, 2] },
    { juz: 2, name: "Juz 2 (Al-Baqarah 142 - 252)", surahStart: 2, ayatStart: 142, surahEnd: 2, ayatEnd: 252, surahNumbers: [2] },
    { juz: 3, name: "Juz 3 (Al-Baqarah 253 - Ali 'Imran 92)", surahStart: 2, ayatStart: 253, surahEnd: 3, ayatEnd: 92, surahNumbers: [2, 3] },
    { juz: 4, name: "Juz 4 (Ali 'Imran 93 - An-Nisa' 23)", surahStart: 3, ayatStart: 93, surahEnd: 4, ayatEnd: 23, surahNumbers: [3, 4] },
    { juz: 5, name: "Juz 5 (An-Nisa' 24 - 147)", surahStart: 4, ayatStart: 24, surahEnd: 4, ayatEnd: 147, surahNumbers: [4] },
    { juz: 6, name: "Juz 6 (An-Nisa' 148 - Al-Ma'idah 81)", surahStart: 4, ayatStart: 148, surahEnd: 5, ayatEnd: 81, surahNumbers: [4, 5] },
    { juz: 7, name: "Juz 7 (Al-Ma'idah 82 - Al-An'am 110)", surahStart: 5, ayatStart: 82, surahEnd: 6, ayatEnd: 110, surahNumbers: [5, 6] },
    { juz: 8, name: "Juz 8 (Al-An'am 111 - Al-A'raf 87)", surahStart: 6, ayatStart: 111, surahEnd: 7, ayatEnd: 87, surahNumbers: [6, 7] },
    { juz: 9, name: "Juz 9 (Al-A'raf 88 - Al-Anfal 40)", surahStart: 7, ayatStart: 88, surahEnd: 8, ayatEnd: 40, surahNumbers: [7, 8] },
    { juz: 10, name: "Juz 10 (Al-Anfal 41 - At-Taubah 92)", surahStart: 8, ayatStart: 41, surahEnd: 9, ayatEnd: 92, surahNumbers: [8, 9] },
    { juz: 11, name: "Juz 11 (At-Taubah 93 - Hud 5)", surahStart: 9, ayatStart: 93, surahEnd: 11, ayatEnd: 5, surahNumbers: [9, 10, 11] },
    { juz: 12, name: "Juz 12 (Hud 6 - Yusuf 52)", surahStart: 11, ayatStart: 6, surahEnd: 12, ayatEnd: 52, surahNumbers: [11, 12] },
    { juz: 13, name: "Juz 13 (Yusuf 53 - Ibrahim 52)", surahStart: 12, ayatStart: 53, surahEnd: 14, ayatEnd: 52, surahNumbers: [12, 13, 14] },
    { juz: 14, name: "Juz 14 (Al-Hijr 1 - An-Nahl 128)", surahStart: 15, ayatStart: 1, surahEnd: 16, ayatEnd: 128, surahNumbers: [15, 16] },
    { juz: 15, name: "Juz 15 (Al-Isra' 1 - Al-Kahf 74)", surahStart: 17, ayatStart: 1, surahEnd: 18, ayatEnd: 74, surahNumbers: [17, 18] },
    { juz: 16, name: "Juz 16 (Al-Kahf 75 - Ta-Ha 135)", surahStart: 18, ayatStart: 75, surahEnd: 20, ayatEnd: 135, surahNumbers: [18, 19, 20] },
    { juz: 17, name: "Juz 17 (Al-Anbiya' 1 - Al-Hajj 78)", surahStart: 21, ayatStart: 1, surahEnd: 22, ayatEnd: 78, surahNumbers: [21, 22] },
    { juz: 18, name: "Juz 18 (Al-Mu'minun 1 - Al-Furqan 20)", surahStart: 23, ayatStart: 1, surahEnd: 25, ayatEnd: 20, surahNumbers: [23, 24, 25] },
    { juz: 19, name: "Juz 19 (Al-Furqan 21 - An-Naml 55)", surahStart: 25, ayatStart: 21, surahEnd: 27, ayatEnd: 55, surahNumbers: [25, 26, 27] },
    { juz: 20, name: "Juz 20 (An-Naml 56 - Al-'Ankabut 45)", surahStart: 27, ayatStart: 56, surahEnd: 29, ayatEnd: 45, surahNumbers: [27, 28, 29] },
    { juz: 21, name: "Juz 21 (Al-'Ankabut 46 - Al-Ahzab 30)", surahStart: 29, ayatStart: 46, surahEnd: 33, ayatEnd: 30, surahNumbers: [29, 30, 31, 32, 33] },
    { juz: 22, name: "Juz 22 (Al-Ahzab 31 - Ya-Sin 27)", surahStart: 33, ayatStart: 31, surahEnd: 36, ayatEnd: 27, surahNumbers: [33, 34, 35, 36] },
    { juz: 23, name: "Juz 23 (Ya-Sin 28 - Az-Zumar 31)", surahStart: 36, ayatStart: 28, surahEnd: 39, ayatEnd: 31, surahNumbers: [36, 37, 38, 39] },
    { juz: 24, name: "Juz 24 (Az-Zumar 32 - Fussilat 46)", surahStart: 39, ayatStart: 32, surahEnd: 41, ayatEnd: 46, surahNumbers: [39, 40, 41] },
    { juz: 25, name: "Juz 25 (Fussilat 47 - Al-Jasiyah 37)", surahStart: 41, ayatStart: 47, surahEnd: 45, ayatEnd: 37, surahNumbers: [41, 42, 43, 44, 45] },
    { juz: 26, name: "Juz 26 (Al-Ahqaf 1 - Az-Zariyat 30)", surahStart: 46, ayatStart: 1, surahEnd: 51, ayatEnd: 30, surahNumbers: [46, 47, 48, 49, 50, 51] },
    { juz: 27, name: "Juz 27 (Az-Zariyat 31 - Al-Hadid 29)", surahStart: 51, ayatStart: 31, surahEnd: 57, ayatEnd: 29, surahNumbers: [51, 52, 53, 54, 55, 56, 57] },
    { juz: 28, name: "Juz 28 (Al-Mujadilah 1 - At-Tahrim 12)", surahStart: 58, ayatStart: 1, surahEnd: 66, ayatEnd: 12, surahNumbers: [58, 59, 60, 61, 62, 63, 64, 65, 66] },
    { juz: 29, name: "Juz 29 (Al-Mulk 1 - Al-Mursalat 50)", surahStart: 67, ayatStart: 1, surahEnd: 77, ayatEnd: 50, surahNumbers: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77] },
    { juz: 30, name: "Juz 30 (An-Naba' 1 - An-Nas 6)", surahStart: 78, ayatStart: 1, surahEnd: 114, ayatEnd: 6, surahNumbers: Array.from({ length: 37 }, (_, i) => 78 + i) }
];

export const getSurahByNumber = (num: number): SurahDef | undefined => {
    return QURAN_DATA.find(s => s.number === num);
};

export const getSurahByName = (name: string): SurahDef | undefined => {
    if (!name) return undefined;
    const clean = name.toLowerCase().replace(/['-`\s]/g, '');
    return QURAN_DATA.find(s => s.name.toLowerCase().replace(/['-`\s]/g, '') === clean);
};

export const getSurahsInJuz = (juzNumber: number): SurahDef[] => {
    const juzInfo = QURAN_JUZ_DATA.find(j => j.juz === juzNumber);
    if (!juzInfo) return QURAN_DATA;
    return QURAN_DATA.filter(s => juzInfo.surahNumbers.includes(s.number));
};

export const getSurahsInJuzRange = (juzA: number, juzB?: number): SurahDef[] => {
    if (!juzB || juzA === juzB) {
        return getSurahsInJuz(juzA);
    }
    const minJuz = Math.max(1, Math.min(juzA, juzB));
    const maxJuz = Math.min(30, Math.max(juzA, juzB));
    
    const surahNumberSet = new Set<number>();
    for (let j = minJuz; j <= maxJuz; j++) {
        const info = QURAN_JUZ_DATA.find(item => item.juz === j);
        if (info) {
            info.surahNumbers.forEach(num => surahNumberSet.add(num));
        }
    }
    return QURAN_DATA.filter(s => surahNumberSet.has(s.number));
};

export const getJuzForSurah = (surahNumber: number, ayatNumber: number = 1): number => {
    for (const j of QURAN_JUZ_DATA) {
        if (surahNumber >= j.surahStart && surahNumber <= j.surahEnd) {
            if (surahNumber === j.surahStart && ayatNumber < j.ayatStart) continue;
            if (surahNumber === j.surahEnd && ayatNumber > j.ayatEnd) continue;
            return j.juz;
        }
    }
    // Fallback based on surah list
    const matched = QURAN_JUZ_DATA.find(j => j.surahNumbers.includes(surahNumber));
    return matched ? matched.juz : (surahNumber >= 78 ? 30 : 1);
};


export const QURAN_DATA: SurahDef[] = [
    { number: 1, name: "Al-Fatihah", ayat: 7 },
    { number: 2, name: "Al-Baqarah", ayat: 286 },
    { number: 3, name: "Ali 'Imran", ayat: 200 },
    { number: 4, name: "An-Nisa'", ayat: 176 },
    { number: 5, name: "Al-Ma'idah", ayat: 120 },
    { number: 6, name: "Al-An'am", ayat: 165 },
    { number: 7, name: "Al-A'raf", ayat: 206 },
    { number: 8, name: "Al-Anfal", ayat: 75 },
    { number: 9, name: "At-Taubah", ayat: 129 },
    { number: 10, name: "Yunus", ayat: 109 },
    { number: 11, name: "Hud", ayat: 123 },
    { number: 12, name: "Yusuf", ayat: 111 },
    { number: 13, name: "Ar-Ra'd", ayat: 43 },
    { number: 14, name: "Ibrahim", ayat: 52 },
    { number: 15, name: "Al-Hijr", ayat: 99 },
    { number: 16, name: "An-Nahl", ayat: 128 },
    { number: 17, name: "Al-Isra'", ayat: 111 },
    { number: 18, name: "Al-Kahf", ayat: 110 },
    { number: 19, name: "Maryam", ayat: 98 },
    { number: 20, name: "Ta-Ha", ayat: 135 },
    { number: 21, name: "Al-Anbiya'", ayat: 112 },
    { number: 22, name: "Al-Hajj", ayat: 78 },
    { number: 23, name: "Al-Mu'minun", ayat: 118 },
    { number: 24, name: "An-Nur", ayat: 64 },
    { number: 25, name: "Al-Furqan", ayat: 77 },
    { number: 26, name: "Asy-Syu'ara'", ayat: 227 },
    { number: 27, name: "An-Naml", ayat: 93 },
    { number: 28, name: "Al-Qasas", ayat: 88 },
    { number: 29, name: "Al-'Ankabut", ayat: 69 },
    { number: 30, name: "Ar-Rum", ayat: 60 },
    { number: 31, name: "Luqman", ayat: 34 },
    { number: 32, name: "As-Sajdah", ayat: 30 },
    { number: 33, name: "Al-Ahzab", ayat: 73 },
    { number: 34, name: "Saba'", ayat: 54 },
    { number: 35, name: "Fatir", ayat: 45 },
    { number: 36, name: "Ya-Sin", ayat: 83 },
    { number: 37, name: "As-Saffat", ayat: 182 },
    { number: 38, name: "Sad", ayat: 88 },
    { number: 39, name: "Az-Zumar", ayat: 75 },
    { number: 40, name: "Ghafir", ayat: 85 },
    { number: 41, name: "Fussilat", ayat: 54 },
    { number: 42, name: "Asy-Syura", ayat: 53 },
    { number: 43, name: "Az-Zukhruf", ayat: 89 },
    { number: 44, name: "Ad-Dukhan", ayat: 59 },
    { number: 45, name: "Al-Jasiyah", ayat: 37 },
    { number: 46, name: "Al-Ahqaf", ayat: 35 },
    { number: 47, name: "Muhammad", ayat: 38 },
    { number: 48, name: "Al-Fath", ayat: 29 },
    { number: 49, name: "Al-Hujurat", ayat: 18 },
    { number: 50, name: "Qaf", ayat: 45 },
    { number: 51, name: "Az-Zariyat", ayat: 60 },
    { number: 52, name: "At-Tur", ayat: 49 },
    { number: 53, name: "An-Najm", ayat: 62 },
    { number: 54, name: "Al-Qamar", ayat: 55 },
    { number: 55, name: "Ar-Rahman", ayat: 78 },
    { number: 56, name: "Al-Waqi'ah", ayat: 96 },
    { number: 57, name: "Al-Hadid", ayat: 29 },
    { number: 58, name: "Al-Mujadilah", ayat: 22 },
    { number: 59, name: "Al-Hasyr", ayat: 24 },
    { number: 60, name: "Al-Mumtahanah", ayat: 13 },
    { number: 61, name: "As-Saff", ayat: 14 },
    { number: 62, name: "Al-Jumu'ah", ayat: 11 },
    { number: 63, name: "Al-Munafiqun", ayat: 11 },
    { number: 64, name: "At-Taghabun", ayat: 18 },
    { number: 65, name: "At-Talaq", ayat: 12 },
    { number: 66, name: "At-Tahrim", ayat: 12 },
    { number: 67, name: "Al-Mulk", ayat: 30 },
    { number: 68, name: "Al-Qalam", ayat: 52 },
    { number: 69, name: "Al-Haqqah", ayat: 52 },
    { number: 70, name: "Al-Ma'arij", ayat: 44 },
    { number: 71, name: "Nuh", ayat: 28 },
    { number: 72, name: "Al-Jinn", ayat: 28 },
    { number: 73, name: "Al-Muzzammil", ayat: 20 },
    { number: 74, name: "Al-Muddassir", ayat: 56 },
    { number: 75, name: "Al-Qiyamah", ayat: 40 },
    { number: 76, name: "Al-Insan", ayat: 31 },
    { number: 77, name: "Al-Mursalat", ayat: 50 },
    { number: 78, name: "An-Naba'", ayat: 40 },
    { number: 79, name: "An-Nazi'at", ayat: 46 },
    { number: 80, name: "'Abasa", ayat: 42 },
    { number: 81, name: "At-Takwir", ayat: 29 },
    { number: 82, name: "Al-Infitar", ayat: 19 },
    { number: 83, name: "Al-Mutaffifin", ayat: 36 },
    { number: 84, name: "Al-Insyiqaq", ayat: 25 },
    { number: 85, name: "Al-Buruj", ayat: 22 },
    { number: 86, name: "At-Tariq", ayat: 17 },
    { number: 87, name: "Al-A'la", ayat: 19 },
    { number: 88, name: "Al-Ghasyiyah", ayat: 26 },
    { number: 89, name: "Al-Fajr", ayat: 30 },
    { number: 90, name: "Al-Balad", ayat: 20 },
    { number: 91, name: "Asy-Syams", ayat: 15 },
    { number: 92, name: "Al-Lail", ayat: 21 },
    { number: 93, name: "Ad-Duha", ayat: 11 },
    { number: 94, name: "Al-Insyirah", ayat: 8 },
    { number: 95, name: "At-Tin", ayat: 8 },
    { number: 96, name: "Al-'Alaq", ayat: 19 },
    { number: 97, name: "Al-Qadr", ayat: 5 },
    { number: 98, name: "Al-Bayyinah", ayat: 8 },
    { number: 99, name: "Az-Zalzalah", ayat: 8 },
    { number: 100, name: "Al-'Adiyat", ayat: 11 },
    { number: 101, name: "Al-Qari'ah", ayat: 11 },
    { number: 102, name: "At-Takasur", ayat: 8 },
    { number: 103, name: "Al-'Asr", ayat: 3 },
    { number: 104, name: "Al-Humazah", ayat: 9 },
    { number: 105, name: "Al-Fil", ayat: 5 },
    { number: 106, name: "Quraisy", ayat: 4 },
    { number: 107, name: "Al-Ma'un", ayat: 7 },
    { number: 108, name: "Al-Kausar", ayat: 3 },
    { number: 109, name: "Al-Kafirun", ayat: 6 },
    { number: 110, name: "An-Nasr", ayat: 3 },
    { number: 111, name: "Al-Lahab", ayat: 5 },
    { number: 112, name: "Al-Ikhlas", ayat: 4 },
    { number: 113, name: "Al-Falaq", ayat: 5 },
    { number: 114, name: "An-Nas", ayat: 6 }
];
