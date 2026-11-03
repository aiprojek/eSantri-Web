/**
 * Monotonic, collision-free, sync-safe numeric ID generator.
 *
 * Guarantees:
 * 1. Strictly integer <= Number.MAX_SAFE_INTEGER (safe for IndexedDB, JSON, and Firestore).
 * 2. Zero collisions even during bulk imports of 10,000+ rows within a single millisecond.
 * 3. Per-tab random initial sequence offset reduces cross-tab collision probability on the same ms.
 */

const tabSalt = Math.floor(Math.random() * 100); // 0..99 initial offset per browser tab
let lastMs = 0;
let seq = tabSalt;

export const generateSyncSafeId = (): number => {
    const now = Date.now();
    if (now > lastMs) {
        lastMs = now;
        seq = tabSalt;
    } else {
        seq += 1;
        if (seq >= 1000) {
            lastMs += 1;
            seq = 0;
        }
    }
    return lastMs * 1000 + seq;
};
