import { QURAN_DATA } from '../data/quran';

export interface AyahData {
    numberInSurah: number;
    text: string;
    translation?: string;
    juz?: number;
}

export interface SurahDetailData {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: string;
    ayahs: AyahData[];
    savedAt?: number;
}

export interface QuranOfflineStatus {
    downloadedCount: number;
    totalSurahs: number;
    isComplete: boolean;
    lastUpdated?: string;
    storageUsedKb?: number;
}

const DB_NAME = 'eSantri_Quran_Offline_DB';
const DB_VERSION = 1;
const STORE_NAME = 'surahs';

function openQuranDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'number' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get Surah detail from local IndexedDB
 */
export async function getLocalSurah(surahNumber: number): Promise<SurahDetailData | null> {
    try {
        const db = await openQuranDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(surahNumber);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

/**
 * Save single surah detail to local IndexedDB
 */
export async function saveLocalSurah(data: SurahDetailData): Promise<void> {
    try {
        const db = await openQuranDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put({ ...data, savedAt: Date.now() });
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn('Failed to save surah locally in IndexedDB', e);
    }
}

/**
 * Fetch a single surah (checks Local DB first, fallback to API)
 */
export async function fetchSurahWithTranslation(surahNumber: number): Promise<SurahDetailData> {
    // 1. Check offline IndexedDB
    const local = await getLocalSurah(surahNumber);
    if (local && local.ayahs && local.ayahs.length > 0) {
        return local;
    }

    // 2. Fetch from reliable API (quran-uthmani + indonesian translation)
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,id.indonesian`);
    if (!response.ok) {
        throw new Error(`Gagal memuat surah ${surahNumber} dari server Al-Qur'an.`);
    }

    const json = await response.json();
    const uthmaniEdition = json.data?.[0];
    const indoEdition = json.data?.[1];

    if (!uthmaniEdition || !uthmaniEdition.ayahs) {
        throw new Error('Format data Al-Qur\'an tidak valid.');
    }

    const ayahs: AyahData[] = uthmaniEdition.ayahs.map((a: any, idx: number) => ({
        numberInSurah: a.numberInSurah,
        text: a.text,
        translation: indoEdition?.ayahs?.[idx]?.text || '',
        juz: a.juz
    }));

    const result: SurahDetailData = {
        number: uthmaniEdition.number,
        name: uthmaniEdition.name,
        englishName: uthmaniEdition.englishName,
        englishNameTranslation: uthmaniEdition.englishNameTranslation,
        numberOfAyahs: uthmaniEdition.numberOfAyahs,
        revelationType: uthmaniEdition.revelationType,
        ayahs
    };

    // Save to local cache asynchronously
    saveLocalSurah(result).catch(() => {});

    return result;
}

/**
 * Check overall offline status
 */
export async function getQuranOfflineStatus(): Promise<QuranOfflineStatus> {
    try {
        const db = await openQuranDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const list: SurahDetailData[] = req.result || [];
                const downloadedCount = list.length;
                let storageUsedKb = 0;
                try {
                    storageUsedKb = Math.round(JSON.stringify(list).length / 1024);
                } catch {}

                let latestSaved = 0;
                list.forEach(s => {
                    if (s.savedAt && s.savedAt > latestSaved) latestSaved = s.savedAt;
                });

                resolve({
                    downloadedCount,
                    totalSurahs: 114,
                    isComplete: downloadedCount >= 114,
                    lastUpdated: latestSaved ? new Date(latestSaved).toLocaleDateString('id-ID') : undefined,
                    storageUsedKb
                });
            };
            req.onerror = () => {
                resolve({
                    downloadedCount: 0,
                    totalSurahs: 114,
                    isComplete: false
                });
            };
        });
    } catch {
        return {
            downloadedCount: 0,
            totalSurahs: 114,
            isComplete: false
        };
    }
}

/**
 * Bulk Download all 114 Surahs into local IndexedDB
 */
export async function downloadAllSurahsOffline(
    onProgress: (progress: { current: number; total: number; percent: number; currentSurahName: string }) => void,
    abortSignal?: AbortSignal
): Promise<void> {
    const total = 114;

    for (let i = 1; i <= total; i++) {
        if (abortSignal?.aborted) {
            throw new Error('Download dibatalkan oleh pengguna.');
        }

        const surahMeta = QURAN_DATA.find(s => s.number === i);
        const name = surahMeta?.name || `Surah #${i}`;

        onProgress({
            current: i,
            total,
            percent: Math.round(((i - 1) / total) * 100),
            currentSurahName: name
        });

        // Check if already in DB
        const existing = await getLocalSurah(i);
        if (!existing || !existing.ayahs || existing.ayahs.length === 0) {
            await fetchSurahWithTranslation(i);
            // Gentle throttling to respect API rate limits
            await new Promise(r => setTimeout(r, 80));
        }
    }

    onProgress({
        current: total,
        total,
        percent: 100,
        currentSurahName: 'Semua 114 Surah Selesai Diunduh'
    });
}

/**
 * Clear local offline Quran database
 */
export async function clearOfflineQuran(): Promise<void> {
    try {
        const db = await openQuranDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error('Failed to clear offline Quran DB', e);
    }
}
