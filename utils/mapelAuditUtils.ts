import { MataPelajaran, PondokSettings, RumpunMapel, Jenjang } from '../types';
import { db } from '../db';
import { logActivity } from '../services/logService';

export interface DuplicateGroup {
    key: string;
    namaNorm: string;
    jenjangId: number;
    jenjangNama: string;
    items: MataPelajaran[];
}

export interface CrossJenjangGroup {
    namaNorm: string;
    namaDisplay: string;
    jenjangIds: number[];
    jenjangNames: string[];
    items: MataPelajaran[];
}

export interface MapelAuditResult {
    pureDuplicates: DuplicateGroup[];
    pureDuplicatesCount: number;
    crossJenjangGroups: CrossJenjangGroup[];
    missingMetaItems: MataPelajaran[];
    missingMetaCount: number;
    totalMapel: number;
}

/**
 * Predict Rumpun Kurikulum based on subject naming patterns
 */
export function predictMapelRumpun(nama: string): RumpunMapel {
    const lower = (nama || '').toLowerCase().trim();

    // 1. Tahfizh & Al-Qur'an
    if (/(tahfizh|tahfidz|hifdz|tajwid|qiraat|qira'at|tilawah|tahsin|murottal|mushaf|alquran|al-qur'an|al-quran|juz amma|tahfiz)/i.test(lower)) {
        return 'Tahfizh';
    }

    // 2. Bahasa
    if (/(bahasa arab|bhs arab|bahasa inggris|bhs inggris|muhadatsah|mufrodat|english|insya|muthala'ah|mutholaah|istima|kalam|conversation|grammar|reading|vocabulary)/i.test(lower)) {
        return 'Bahasa';
    }

    // 3. Diniyah / Kitab Kuning / Keislaman
    if (/(fiqih|fiqh|fathul|safinah|bidayah|bulughul|aqidah|akhlak|tauhid|hadits|hadis|tarikh|sirah|tafsir|ushul|faraidh|faroidh|arbain|diniyah|kitab|tasawuf|imrithy|jurumiyah|nahwu|shorof|sarf|balaghah|mantiq|mustholah|tajwid|falak|adab)/i.test(lower)) {
        return 'Diniyah';
    }

    // 4. Muatan Lokal / Kedaerahan / Khas Pondok
    if (/(muatan lokal|mulok|sunda|jawa|madura|daerah|kaligrafi|khath|khat|hadrah|hadroh|rebana|kepesantrenan|ke-nu-an|ke-muhammadiyahan|aswaja|bela diri|silat)/i.test(lower)) {
        return 'Muatan Lokal';
    }

    // 5. Umum / Nasional
    if (/(matematika|mtk|ipa|ips|biologi|fisika|kimia|ppkn|pkn|pancasila|sejarah|geografi|ekonomi|sosiologi|penjas|pjok|olahraga|seni|budaya|sbk|tik|informatika|komputer|prakarya|bahasa indonesia|bhs indonesia|b\. indonesia|konseling|bk)/i.test(lower)) {
        return 'Umum';
    }

    // Default for pondok pesantren
    return 'Diniyah';
}

/**
 * Generate a short 2-4 uppercase letter code for subject
 */
export function generateDefaultKodeMapel(nama: string): string {
    const cleaned = nama.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    const words = cleaned.split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return words.map(w => w[0]).join('').substring(0, 4);
    }
    if (cleaned.length <= 4) {
        return cleaned;
    }
    // Remove vowels if too long
    const noVowels = cleaned[0] + cleaned.substring(1).replace(/[AEIOU]/g, '');
    return noVowels.substring(0, 4);
}

/**
 * Runs a full audit on subjects dataset
 */
export function runMapelAudit(
    mapelList: MataPelajaran[],
    jenjangList: Jenjang[]
): MapelAuditResult {
    const jenjangMap = new Map<number, string>(jenjangList.map(j => [j.id, j.nama]));

    // 1. Duplicate within the SAME jenjang (pure duplicates)
    const sameJenjangGroups: Record<string, MataPelajaran[]> = {};
    mapelList.forEach(m => {
        const normName = m.nama.trim().toLowerCase();
        const key = `${m.jenjangId}_${normName}`;
        if (!sameJenjangGroups[key]) sameJenjangGroups[key] = [];
        sameJenjangGroups[key].push(m);
    });

    const pureDuplicates: DuplicateGroup[] = Object.entries(sameJenjangGroups)
        .filter(([, group]) => group.length > 1)
        .map(([key, group]) => {
            const first = group[0];
            return {
                key,
                namaNorm: first.nama.trim().toLowerCase(),
                jenjangId: first.jenjangId,
                jenjangNama: jenjangMap.get(first.jenjangId) || `Jenjang ${first.jenjangId}`,
                items: group,
            };
        });

    const pureDuplicatesCount = pureDuplicates.reduce((acc, g) => acc + (g.items.length - 1), 0);

    // 2. Cross-jenjang subjects
    const crossJenjangMap: Record<string, { norm: string; display: string; jenjangIds: number[]; items: MataPelajaran[] }> = {};
    mapelList.forEach(m => {
        const normName = m.nama.trim().toLowerCase();
        if (!crossJenjangMap[normName]) {
            crossJenjangMap[normName] = {
                norm: normName,
                display: m.nama.trim(),
                jenjangIds: [],
                items: [],
            };
        }
        if (!crossJenjangMap[normName].jenjangIds.includes(m.jenjangId)) {
            crossJenjangMap[normName].jenjangIds.push(m.jenjangId);
        }
        crossJenjangMap[normName].items.push(m);
    });

    const crossJenjangGroups: CrossJenjangGroup[] = Object.values(crossJenjangMap)
        .filter(item => item.jenjangIds.length > 1)
        .map(item => ({
            namaNorm: item.norm,
            namaDisplay: item.display,
            jenjangIds: item.jenjangIds,
            jenjangNames: item.jenjangIds.map(id => jenjangMap.get(id) || `Jenjang ${id}`),
            items: item.items,
        }))
        .sort((a, b) => b.jenjangIds.length - a.jenjangIds.length || a.namaDisplay.localeCompare(b.namaDisplay));

    // 3. Mapel with missing metadata (KKM or Rumpun)
    const missingMetaItems = mapelList.filter(m => !m.rumpun || !m.kkm);

    return {
        pureDuplicates,
        pureDuplicatesCount,
        crossJenjangGroups,
        missingMetaItems,
        missingMetaCount: missingMetaItems.length,
        totalMapel: mapelList.length,
    };
}

/**
 * Auto-enrich metadata (Rumpun, KKM, default alokasi jam, kodeMapel)
 */
export function executeAutoEnrichMetadata(
    mapelList: MataPelajaran[],
    defaultKkm: number = 70,
    defaultAlokasiJam: number = 2
): {
    updatedList: MataPelajaran[];
    enrichedCount: number;
    details: { id: number; nama: string; rumpunAssigned?: RumpunMapel; kkmAssigned?: number; kodeAssigned?: string }[];
} {
    let enrichedCount = 0;
    const details: { id: number; nama: string; rumpunAssigned?: RumpunMapel; kkmAssigned?: number; kodeAssigned?: string }[] = [];

    const updatedList = mapelList.map(m => {
        let changed = false;
        let rumpunAssigned: RumpunMapel | undefined;
        let kkmAssigned: number | undefined;
        let kodeAssigned: string | undefined;

        const updated: MataPelajaran = { ...m };

        if (!updated.rumpun) {
            updated.rumpun = predictMapelRumpun(updated.nama);
            rumpunAssigned = updated.rumpun;
            changed = true;
        }

        if (!updated.kkm || updated.kkm <= 0) {
            updated.kkm = defaultKkm;
            kkmAssigned = defaultKkm;
            changed = true;
        }

        if (!updated.alokasiJamDefault || updated.alokasiJamDefault <= 0) {
            updated.alokasiJamDefault = defaultAlokasiJam;
            changed = true;
        }

        if (!updated.kodeMapel || updated.kodeMapel.trim() === '') {
            updated.kodeMapel = generateDefaultKodeMapel(updated.nama);
            kodeAssigned = updated.kodeMapel;
            changed = true;
        }

        if (changed) {
            enrichedCount++;
            details.push({
                id: m.id,
                nama: m.nama,
                rumpunAssigned,
                kkmAssigned,
                kodeAssigned,
            });
        }

        return updated;
    });

    return { updatedList, enrichedCount, details };
}

/**
 * Smartly merge duplicate subjects within the same jenjang.
 * Migrates all related tables: Jadwal Pelajaran, Jadwal Ujian, Jurnal Mengajar, Rapor Santri, and Guru Kompetensi.
 */
export async function executeMergeMapelDuplicates(
    duplicateGroups: DuplicateGroup[],
    currentSettings: PondokSettings,
    username: string = 'Admin'
): Promise<{
    updatedSettings: PondokSettings;
    mergedMapelCount: number;
    jadwalPelajaranCount: number;
    jadwalUjianCount: number;
    jurnalMengajarCount: number;
    raporRecordsCount: number;
    teachersUpdatedCount: number;
}> {
    let updatedMapelList = [...currentSettings.mataPelajaran];
    let teachers = [...(currentSettings.tenagaPengajar || [])];
    const removedIds: number[] = [];

    let totalJp = 0;
    let totalJu = 0;
    let totalJm = 0;
    let totalRapor = 0;
    let totalTeachers = 0;

    for (const group of duplicateGroups) {
        if (group.items.length < 2) continue;

        // Choose canonical: pick the one with most metadata or lowest ID
        const itemsSorted = [...group.items].sort((a, b) => {
            const scoreA = (a.kodeMapel ? 2 : 0) + (a.rumpun ? 2 : 0) + (a.kkm ? 2 : 0) + (a.modulList?.length || 0) + (a.targetBabSemester?.length || 0);
            const scoreB = (b.kodeMapel ? 2 : 0) + (b.rumpun ? 2 : 0) + (b.kkm ? 2 : 0) + (b.modulList?.length || 0) + (b.targetBabSemester?.length || 0);
            return scoreB - scoreA || a.id - b.id;
        });

        const canonical = { ...itemsSorted[0] };
        const duplicates = itemsSorted.slice(1);

        // Merge attributes from duplicates into canonical
        for (const dup of duplicates) {
            removedIds.push(dup.id);

            if (!canonical.kodeMapel && dup.kodeMapel) canonical.kodeMapel = dup.kodeMapel;
            if (!canonical.kkm && dup.kkm) canonical.kkm = dup.kkm;
            if (!canonical.rumpun && dup.rumpun) canonical.rumpun = dup.rumpun;
            if (!canonical.alokasiJamDefault && dup.alokasiJamDefault) canonical.alokasiJamDefault = dup.alokasiJamDefault;

            // Merge modul list
            const combinedModul = Array.from(new Set([
                ...(canonical.modulList || (canonical.modul ? [canonical.modul] : [])),
                ...(dup.modulList || (dup.modul ? [dup.modul] : [])),
            ])).filter(Boolean);
            if (combinedModul.length > 0) {
                canonical.modulList = combinedModul;
                canonical.modul = combinedModul[0];
            }

            // Merge target bab semester
            const combinedBab = Array.from(new Set([
                ...(canonical.targetBabSemester || []),
                ...(dup.targetBabSemester || []),
            ])).filter(Boolean);
            if (combinedBab.length > 0) {
                canonical.targetBabSemester = combinedBab;
            }

            // 1. Migrate Jadwal Pelajaran
            const jpUpdated = await db.jadwalPelajaran.where('mapelId').equals(dup.id).modify({
                mapelId: canonical.id,
                lastModified: Date.now(),
            });
            totalJp += jpUpdated;

            // 2. Migrate Jadwal Ujian
            const juUpdated = await db.jadwalUjian.where('mapelId').equals(dup.id).modify({
                mapelId: canonical.id,
                lastModified: Date.now(),
            });
            totalJu += juUpdated;

            // 3. Migrate Jurnal Mengajar
            const jmUpdated = await db.jurnalMengajar.where('mataPelajaranId').equals(dup.id).modify({
                mataPelajaranId: canonical.id,
                lastModified: Date.now(),
            });
            totalJm += jmUpdated;

            // 4. Migrate Rapor Nilai
            const allRapor = await db.raporRecords.toArray();
            for (const rec of allRapor) {
                if (!rec.nilai || !Array.isArray(rec.nilai)) continue;
                let hasDup = false;
                const newNilai = rec.nilai.map(n => {
                    if (n.mapelId === dup.id) {
                        hasDup = true;
                        return { ...n, mapelId: canonical.id };
                    }
                    return n;
                });

                if (hasDup) {
                    // Dedup if both canonical and dup already had scores in the same report card
                    const mapelScores = new Map<number, typeof newNilai[0]>();
                    newNilai.forEach(n => {
                        if (!mapelScores.has(n.mapelId) || (n.nilaiAngka > (mapelScores.get(n.mapelId)?.nilaiAngka || 0))) {
                            mapelScores.set(n.mapelId, n);
                        }
                    });
                    await db.raporRecords.update(rec.id, {
                        nilai: Array.from(mapelScores.values()),
                        lastModified: Date.now(),
                    });
                    totalRapor++;
                }
            }

            // 5. Migrate Teachers kompetensiMapelIds
            teachers = teachers.map(t => {
                if (t.kompetensiMapelIds && t.kompetensiMapelIds.includes(dup.id)) {
                    totalTeachers++;
                    const replaced = t.kompetensiMapelIds.map(id => id === dup.id ? canonical.id : id);
                    return {
                        ...t,
                        kompetensiMapelIds: Array.from(new Set(replaced)),
                    };
                }
                return t;
            });
        }

        // Replace canonical in updatedMapelList
        const canonicalIndex = updatedMapelList.findIndex(m => m.id === canonical.id);
        if (canonicalIndex !== -1) {
            updatedMapelList[canonicalIndex] = canonical;
        }
    }

    // Remove all duplicate entries
    updatedMapelList = updatedMapelList.filter(m => !removedIds.includes(m.id));

    const updatedSettings: PondokSettings = {
        ...currentSettings,
        mataPelajaran: updatedMapelList,
        tenagaPengajar: teachers,
    };

    // Log Activity
    await logActivity(
        'UPDATE',
        'mataPelajaran',
        'consolidate_duplicates',
        { removedCount: removedIds.length },
        {
            canonicalKept: duplicateGroups.length,
            removedIds,
            totalJp,
            totalJu,
            totalJm,
            totalRapor,
            totalTeachers,
        },
        username
    );

    return {
        updatedSettings,
        mergedMapelCount: removedIds.length,
        jadwalPelajaranCount: totalJp,
        jadwalUjianCount: totalJu,
        jurnalMengajarCount: totalJm,
        raporRecordsCount: totalRapor,
        teachersUpdatedCount: totalTeachers,
    };
}

/**
 * Quick copy a single mapel to another target jenjang
 */
export function cloneSingleMapelToJenjang(
    sourceMapel: MataPelajaran,
    targetJenjangId: number,
    allMapels: MataPelajaran[]
): { updatedList: MataPelajaran[]; newMapel: MataPelajaran } {
    const nextId = allMapels.length > 0 ? Math.max(...allMapels.map(m => m.id)) + 1 : 1;
    const newMapel: MataPelajaran = {
        ...sourceMapel,
        id: nextId,
        jenjangId: targetJenjangId,
    };

    return {
        updatedList: [...allMapels, newMapel],
        newMapel,
    };
}
