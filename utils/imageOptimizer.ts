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
