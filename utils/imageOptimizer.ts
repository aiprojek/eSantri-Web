/**
 * Mengompresi gambar menggunakan HTML5 Canvas dan mengubahnya menjadi format WebP/PNG Base64.
 * Sangat efektif untuk menghemat ruang penyimpanan IndexedDB (bisa hemat hingga 80-90%).
 *
 * @param file File gambar asli dari input user
 * @param maxWidth Lebar maksimal gambar (default 300px untuk pas foto)
 * @param quality Kualitas kompresi 0 - 1 (default 0.7)
 * @returns Promise string Base64 gambar terkompresi
 */
export const compressImage = (file: File, maxWidth = 300, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (!dataUrl) {
                reject(new Error('Gagal membaca file gambar'));
                return;
            }
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = Math.max(1, width);
                canvas.height = Math.max(1, height);

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Gagal mendapatkan konteks canvas'));
                    return;
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Gunakan PNG jika file bertipe PNG/SVG untuk menjaga transparansi alpha 100% di semua browser
                const isTransparentSource = file.type === 'image/png' || file.type === 'image/svg+xml';
                const compressedBase64 = isTransparentSource
                    ? canvas.toDataURL('image/png')
                    : canvas.toDataURL('image/webp', quality);
                resolve(compressedBase64);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export interface SignatureOptimizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    removeWhiteBg?: boolean;
    whiteThreshold?: number;
    autoTrim?: boolean;
}

/**
 * Mengoptimalkan gambar tanda tangan (TTD), stempel, logo, atau kop:
 * - Menjaga alpha channel (transparansi) 100% utuh dalam format PNG.
 * - Opsional menghapus background kertas putih/abu terang menjadi transparan halus (anti-aliased).
 * - Opsional memangkas ruang kosong berlebih di sekeliling goresan tanda tangan agar proporsional saat dicetak di Rapor/Surat.
 */
export const optimizeSignatureImage = (
    source: File | string,
    options: SignatureOptimizeOptions = {}
): Promise<string> => {
    const {
        maxWidth = 650,
        maxHeight = 360,
        removeWhiteBg = false,
        whiteThreshold = 232,
        autoTrim = false,
    } = options;

    const loadDataUrl = (): Promise<string> => {
        if (typeof source === 'string') {
            return Promise.resolve(source);
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const res = e.target?.result as string;
                if (res) resolve(res);
                else reject(new Error('Gagal membaca berkas gambar.'));
            };
            reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
            reader.readAsDataURL(source);
        });
    };

    return loadDataUrl().then((dataUrl) => {
        return new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                let width = img.naturalWidth || img.width || 300;
                let height = img.naturalHeight || img.height || 150;

                const scale = Math.min(1, maxWidth / width, maxHeight / height);
                width = Math.max(1, Math.round(width * scale));
                height = Math.max(1, Math.round(height * scale));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) {
                    reject(new Error('Gagal menyiapkan kanvas pengolah gambar.'));
                    return;
                }

                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                if (removeWhiteBg) {
                    const imgData = ctx.getImageData(0, 0, width, height);
                    const data = imgData.data;
                    const softFloor = Math.max(150, whiteThreshold - 42);

                    for (let i = 0; i < data.length; i += 4) {
                        const a = data[i + 3];
                        if (a === 0) continue;

                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];

                        const maxC = Math.max(r, g, b);
                        const minC = Math.min(r, g, b);
                        const chroma = maxC - minC;
                        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

                        // Piksel kertas putih / bayangan abu tipis dengan saturasi rendah dibuat transparan halus
                        if (lum >= whiteThreshold && chroma < 32) {
                            data[i + 3] = 0;
                        } else if (lum > softFloor && chroma < 40) {
                            const ratio = (whiteThreshold - lum) / (whiteThreshold - softFloor);
                            const nextAlpha = Math.round(a * Math.max(0, Math.min(1, ratio)));
                            data[i + 3] = nextAlpha;
                        }
                    }
                    ctx.putImageData(imgData, 0, 0);
                }

                if (autoTrim) {
                    const imgData = ctx.getImageData(0, 0, width, height);
                    const data = imgData.data;
                    let top = height;
                    let left = width;
                    let right = 0;
                    let bottom = 0;
                    let hasInk = false;

                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            const alpha = data[(y * width + x) * 4 + 3];
                            if (alpha > 15) {
                                hasInk = true;
                                if (x < left) left = x;
                                if (x > right) right = x;
                                if (y < top) top = y;
                                if (y > bottom) bottom = y;
                            }
                        }
                    }

                    if (hasInk && right >= left && bottom >= top) {
                        const pad = 8;
                        const cropX = Math.max(0, left - pad);
                        const cropY = Math.max(0, top - pad);
                        const cropW = Math.min(width - cropX, right - left + 1 + pad * 2);
                        const cropH = Math.min(height - cropY, bottom - top + 1 + pad * 2);

                        const trimmedCanvas = document.createElement('canvas');
                        trimmedCanvas.width = Math.max(1, cropW);
                        trimmedCanvas.height = Math.max(1, cropH);
                        const tCtx = trimmedCanvas.getContext('2d');
                        if (tCtx) {
                            tCtx.clearRect(0, 0, trimmedCanvas.width, trimmedCanvas.height);
                            tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                            resolve(trimmedCanvas.toDataURL('image/png'));
                            return;
                        }
                    }
                }

                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => reject(new Error('Format gambar tidak dapat dimuat. Gunakan PNG, JPG, WEBP, atau SVG.'));
            img.src = dataUrl;
        });
    });
};

export type InkAssetKind = 'ttd' | 'stempel';

const transparentInkCache = new Map<string, string>();
const transparentInkInFlight = new Map<string, Promise<string>>();

const makeInkCacheKey = (src: string, kind: InkAssetKind): string => `${kind}::${src}`;

export const getCachedTransparentInkAsset = (src: string | null | undefined, kind: InkAssetKind): string | null => {
    if (!src) return null;
    return transparentInkCache.get(makeInkCacheKey(src, kind)) || null;
};

/**
 * Menormalkan gambar TTD atau Stempel menjadi PNG transparan dengan batas tinta rapat (auto-trimmed):
 * - Menghapus kertas putih/abu terang beserta efek halo putih (white-matte unmixing) pada tepi anti-aliasing,
 *   sehingga tinta stempel berwarna dapat ditumpuk dengan `mix-blend-mode: normal` tepat DI ATAS goresan TTD hitam
 *   tanpa kotak putih maupun tertelan warna hitam TTD.
 * - Memangkas margin kosong berlebih di sekeliling goresan agar titik tengah stempel selalu sejajar akurat dengan TTD.
 */
export const prepareTransparentInkAsset = (
    src: string,
    kind: InkAssetKind
): Promise<string> => {
    const cacheKey = makeInkCacheKey(src, kind);
    const cached = transparentInkCache.get(cacheKey);
    if (cached) return Promise.resolve(cached);

    const existingPromise = transparentInkInFlight.get(cacheKey);
    if (existingPromise) return existingPromise;

    const promise = new Promise<string>((resolve) => {
        if (typeof document === 'undefined') {
            resolve(src);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const maxDim = kind === 'stempel' ? 480 : 560;
                let width = img.naturalWidth || img.width || 300;
                let height = img.naturalHeight || img.height || 200;

                const scale = Math.min(1, maxDim / Math.max(width, height));
                width = Math.max(1, Math.round(width * scale));
                height = Math.max(1, Math.round(height * scale));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) {
                    resolve(src);
                    return;
                }

                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                const imgData = ctx.getImageData(0, 0, width, height);
                const data = imgData.data;

                // Cek apakah gambar sudah punya transparansi asli di area tepi
                let borderTotal = 0;
                let borderTransparent = 0;
                const step = Math.max(1, Math.floor(Math.min(width, height) / 40));
                for (let x = 0; x < width; x += step) {
                    borderTotal += 2;
                    if (data[(0 * width + x) * 4 + 3] < 32) borderTransparent++;
                    if (data[((height - 1) * width + x) * 4 + 3] < 32) borderTransparent++;
                }
                for (let y = 0; y < height; y += step) {
                    borderTotal += 2;
                    if (data[(y * width + 0) * 4 + 3] < 32) borderTransparent++;
                    if (data[(y * width + (width - 1)) * 4 + 3] < 32) borderTransparent++;
                }
                const hasNativeTransparentBg = borderTotal > 0 && borderTransparent / borderTotal > 0.25;

                const whitePoint = 242;

                for (let i = 0; i < data.length; i += 4) {
                    const a = data[i + 3];
                    if (a === 0) continue;

                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    const maxC = Math.max(r, g, b);
                    const minC = Math.min(r, g, b);
                    const chroma = maxC - minC;
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

                    if (hasNativeTransparentBg) {
                        // Jika PNG memang sudah transparan, cukup bersihkan bercak putih kertas yang masih tertinggal
                        if (a > 220 && lum >= 244 && chroma < 20) {
                            data[i + 3] = 0;
                        } else if (kind === 'stempel' && a < 255 && lum > 200 && chroma >= 20) {
                            // Hilangkan sisa halo putih tipis di pinggir anti-aliasing PNG
                            const cleanRatio = Math.min(0.92, (255 - a) / 255);
                            const denom = Math.max(0.12, 1 - cleanRatio * 0.5);
                            data[i] = Math.max(0, Math.min(255, Math.round((r - cleanRatio * 120) / denom)));
                            data[i + 1] = Math.max(0, Math.min(255, Math.round((g - cleanRatio * 120) / denom)));
                            data[i + 2] = Math.max(0, Math.min(255, Math.round((b - cleanRatio * 120) / denom)));
                        }
                        continue;
                    }

                    // Piksel kertas putih / abu terang dengan saturasi rendah -> 100% transparan
                    if (lum >= 236 && chroma < 28) {
                        data[i + 3] = 0;
                        continue;
                    }

                    // White-matte unmixing: pisahkan pigmen tinta murni dari warna dasar kertas putih
                    const darkCoverage = Math.max(0, Math.min(1, (whitePoint - minC) / whitePoint));
                    const colorCoverage =
                        kind === 'stempel' && chroma >= 18
                            ? Math.min(1, (chroma - 14) / 135)
                            : chroma >= 28
                            ? Math.min(1, (chroma - 20) / 160)
                            : 0;
                    const rawCoverage = Math.max(darkCoverage, colorCoverage);

                    if (rawCoverage < 0.055) {
                        data[i + 3] = 0;
                        continue;
                    }

                    // Pulihkan warna pigmen murni tanpa campuran putih kertas agar tidak muncul halo putih di atas TTD hitam
                    const whiteMix = Math.max(0, Math.min(0.94, 1 - darkCoverage));
                    const inkScale = Math.max(0.08, 1 - whiteMix);
                    data[i] = Math.max(0, Math.min(255, Math.round((r - whiteMix * 255) / inkScale)));
                    data[i + 1] = Math.max(0, Math.min(255, Math.round((g - whiteMix * 255) / inkScale)));
                    data[i + 2] = Math.max(0, Math.min(255, Math.round((b - whiteMix * 255) / inkScale)));

                    const gamma = kind === 'stempel' ? 0.72 : 0.84;
                    const boostedAlpha = Math.round((a / 255) * Math.pow(rawCoverage, gamma) * 255);
                    data[i + 3] = Math.max(0, Math.min(255, boostedAlpha));
                }

                ctx.putImageData(imgData, 0, 0);

                // Auto-trim ruang kosong di sekeliling goresan tinta agar titik pusat akurat
                let top = height;
                let left = width;
                let right = -1;
                let bottom = -1;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (data[(y * width + x) * 4 + 3] > 22) {
                            if (x < left) left = x;
                            if (x > right) right = x;
                            if (y < top) top = y;
                            if (y > bottom) bottom = y;
                        }
                    }
                }

                let resultDataUrl: string;
                if (right >= left && bottom >= top) {
                    const pad = 4;
                    const cropX = Math.max(0, left - pad);
                    const cropY = Math.max(0, top - pad);
                    const cropW = Math.min(width - cropX, right - left + 1 + pad * 2);
                    const cropH = Math.min(height - cropY, bottom - top + 1 + pad * 2);

                    const trimmed = document.createElement('canvas');
                    trimmed.width = Math.max(1, cropW);
                    trimmed.height = Math.max(1, cropH);
                    const tCtx = trimmed.getContext('2d');
                    if (tCtx) {
                        tCtx.clearRect(0, 0, trimmed.width, trimmed.height);
                        tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                        resultDataUrl = trimmed.toDataURL('image/png');
                    } else {
                        resultDataUrl = canvas.toDataURL('image/png');
                    }
                } else {
                    resultDataUrl = canvas.toDataURL('image/png');
                }

                transparentInkCache.set(cacheKey, resultDataUrl);
                resolve(resultDataUrl);
            } catch {
                // Fallback aman jika terkena pembatasan CORS eksternal
                resolve(src);
            } finally {
                transparentInkInFlight.delete(cacheKey);
            }
        };
        img.onerror = () => {
            transparentInkInFlight.delete(cacheKey);
            resolve(src);
        };
        img.src = src;
    });

    transparentInkInFlight.set(cacheKey, promise);
    return promise;
};

