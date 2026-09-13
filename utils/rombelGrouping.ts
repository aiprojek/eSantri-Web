import { Rombel, Kelas, Santri } from '../types';

export type RombelSplitMode = 'all' | 'gender' | 'kelas' | 'chunk3' | 'chunk4';

export interface RombelTableGroup {
    id: string;
    key: string;
    title: string;
    subtitle?: string;
    badge: string;
    badgeColor: string;
    icon: string;
    rombels: Rombel[];
}

export type DetectedGender = 'putra' | 'putri' | 'umum';

/**
 * Mendeteksi jenis kelamin rombel berdasarkan nama atau komposisi data santri
 */
export function detectRombelGender(
    rombel: Rombel,
    santriList?: Santri[]
): DetectedGender {
    const name = (rombel.nama || '').trim().toLowerCase();

    // 1. Cek nama dengan kata kunci spesifik
    const isPutriName = /(putri|banat|akhwat|wanita|perempuan|\bpi\b|\(p\)|\(pi\)|-p\b|_p\b)/i.test(name);
    const isPutraName = /(putra|banin|ikhwan|pria|laki|\bpa\b|\(l\)|\(pa\)|-l\b|_l\b)/i.test(name);

    if (isPutriName && !isPutraName) return 'putri';
    if (isPutraName && !isPutriName) return 'putra';

    // 2. Cek berdasarkan data santri aktif di rombel tersebut
    if (santriList && santriList.length > 0) {
        const rombelSantri = santriList.filter(s => s.rombelId === rombel.id);
        if (rombelSantri.length > 0) {
            const countLaki = rombelSantri.filter(s => s.jenisKelamin === 'Laki-laki').length;
            const countPerempuan = rombelSantri.filter(s => s.jenisKelamin === 'Perempuan').length;

            if (countLaki > 0 && countPerempuan === 0) return 'putra';
            if (countPerempuan > 0 && countLaki === 0) return 'putri';
            if (countLaki >= countPerempuan * 2) return 'putra';
            if (countPerempuan >= countLaki * 2) return 'putri';
        }
    }

    return 'umum';
}

/**
 * Mengelompokkan rombel ke dalam beberapa tabel terpisah agar matriks tidak sesak
 */
export function groupRombelsForTable(
    rombels: Rombel[],
    splitMode: RombelSplitMode,
    kelasList?: Kelas[],
    santriList?: Santri[]
): RombelTableGroup[] {
    if (!rombels || rombels.length === 0) return [];

    // Mode 1: Gabung Semua dalam 1 tabel
    if (splitMode === 'all') {
        return [{
            id: 'all',
            key: 'all',
            title: 'Seluruh Rombel / Kelas',
            subtitle: `${rombels.length} Rombel Tergabung`,
            badge: `${rombels.length} Kelas`,
            badgeColor: 'bg-teal-100 text-teal-900 border-teal-200',
            icon: 'bi-grid-fill',
            rombels,
        }];
    }

    // Mode 2: Pisah Rombel Putra & Putri (Banin vs Banat)
    if (splitMode === 'gender') {
        const putraList: Rombel[] = [];
        const putriList: Rombel[] = [];
        const umumList: Rombel[] = [];

        rombels.forEach(r => {
            const gender = detectRombelGender(r, santriList);
            if (gender === 'putra') putraList.push(r);
            else if (gender === 'putri') putriList.push(r);
            else umumList.push(r);
        });

        // Heuristik fallback jika tidak ada yang terdeteksi via keyword/santri:
        // Cek akhiran A (putra) dan B (putri) jika keduanya ada
        if (putraList.length === 0 && putriList.length === 0 && umumList.length > 1) {
            const tempPutra: Rombel[] = [];
            const tempPutri: Rombel[] = [];
            umumList.forEach(r => {
                const n = r.nama.trim();
                if (/[\s_-]A$|1$/i.test(n)) tempPutra.push(r);
                else if (/[\s_-]B$|2$/i.test(n)) tempPutri.push(r);
            });
            if (tempPutra.length > 0 && tempPutri.length > 0) {
                putraList.push(...tempPutra);
                putriList.push(...tempPutri);
                const assigned = new Set([...tempPutra.map(x => x.id), ...tempPutri.map(x => x.id)]);
                const remaining = umumList.filter(x => !assigned.has(x.id));
                umumList.length = 0;
                umumList.push(...remaining);
            }
        }

        const groups: RombelTableGroup[] = [];
        if (putraList.length > 0) {
            groups.push({
                id: 'putra',
                key: 'putra',
                title: 'Kelompok Rombel Putra (Banin)',
                subtitle: `${putraList.length} Rombel Terdaftar (${putraList.map(r => r.nama).join(', ')})`,
                badge: `${putraList.length} Rombel Putra`,
                badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
                icon: 'bi-gender-male',
                rombels: putraList,
            });
        }
        if (putriList.length > 0) {
            groups.push({
                id: 'putri',
                key: 'putri',
                title: 'Kelompok Rombel Putri (Banat)',
                subtitle: `${putriList.length} Rombel Terdaftar (${putriList.map(r => r.nama).join(', ')})`,
                badge: `${putriList.length} Rombel Putri`,
                badgeColor: 'bg-pink-100 text-pink-900 border-pink-300',
                icon: 'bi-gender-female',
                rombels: putriList,
            });
        }
        if (umumList.length > 0) {
            groups.push({
                id: 'umum',
                key: 'umum',
                title: groups.length > 0 ? 'Kelompok Rombel Campuran / Umum' : 'Daftar Seluruh Rombel',
                subtitle: `${umumList.length} Rombel (${umumList.map(r => r.nama).join(', ')})`,
                badge: `${umumList.length} Rombel`,
                badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
                icon: 'bi-people',
                rombels: umumList,
            });
        }

        return groups.length > 0 ? groups : [{
            id: 'all',
            key: 'all',
            title: 'Seluruh Rombel',
            badge: `${rombels.length} Kelas`,
            badgeColor: 'bg-teal-100 text-teal-900 border-teal-200',
            icon: 'bi-grid-fill',
            rombels,
        }];
    }

    // Mode 3: Pisah Per Tingkat Kelas (Kelas 7, Kelas 8, Kelas 9)
    if (splitMode === 'kelas') {
        const kelasMap = new Map((kelasList || []).map(k => [k.id, k.nama]));
        const groupsByKelasId: Record<number, Rombel[]> = {};

        rombels.forEach(r => {
            if (!groupsByKelasId[r.kelasId]) groupsByKelasId[r.kelasId] = [];
            groupsByKelasId[r.kelasId].push(r);
        });

        const groups = Object.entries(groupsByKelasId).map(([kIdStr, rombelSubset]) => {
            const kId = Number(kIdStr);
            const kName = kelasMap.get(kId) || `Tingkat ${kId}`;
            return {
                id: `kelas_${kId}`,
                key: `kelas_${kId}`,
                title: `Tingkat Kelas: ${kName}`,
                subtitle: `${rombelSubset.length} Rombel (${rombelSubset.map(r => r.nama).join(', ')})`,
                badge: `${rombelSubset.length} Rombel`,
                badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                icon: 'bi-mortarboard',
                rombels: rombelSubset,
            };
        });

        return groups.length > 0 ? groups : [{
            id: 'all',
            key: 'all',
            title: 'Seluruh Rombel',
            badge: `${rombels.length} Kelas`,
            badgeColor: 'bg-teal-100 text-teal-900 border-teal-200',
            icon: 'bi-grid-fill',
            rombels,
        }];
    }

    // Mode 4 & 5: Chunk per 3 atau 4 Rombel
    if (splitMode === 'chunk3' || splitMode === 'chunk4') {
        const chunkSize = splitMode === 'chunk3' ? 3 : 4;
        const groups: RombelTableGroup[] = [];
        for (let i = 0; i < rombels.length; i += chunkSize) {
            const chunk = rombels.slice(i, i + chunkSize);
            const partNum = Math.floor(i / chunkSize) + 1;
            groups.push({
                id: `chunk_${partNum}`,
                key: `chunk_${partNum}`,
                title: `Bagian ${partNum}: Rombel ${chunk.map(r => r.nama).join(', ')}`,
                subtitle: `${chunk.length} Rombel dalam tabel ini`,
                badge: `${chunk.length} Kolom`,
                badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
                icon: 'bi-layout-three-columns',
                rombels: chunk,
            });
        }
        return groups;
    }

    return [{
        id: 'all',
        key: 'all',
        title: 'Seluruh Rombel',
        badge: `${rombels.length} Kelas`,
        badgeColor: 'bg-teal-100 text-teal-900 border-teal-200',
        icon: 'bi-grid-fill',
        rombels,
    }];
}
