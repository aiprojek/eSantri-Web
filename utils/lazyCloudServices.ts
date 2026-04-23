let syncServicePromise: Promise<typeof import('../services/syncService')> | null = null;
let jsZipPromise: Promise<any> | null = null;

export const loadSyncService = () => {
    if (!syncServicePromise) {
        syncServicePromise = import('../services/syncService');
    }
    return syncServicePromise;
};

export const loadJsZip = async () => {
    if (!jsZipPromise) {
        jsZipPromise = import('jszip');
    }
    const jsZipModule = await jsZipPromise;
    return jsZipModule.default;
};
