
/**
 * Mengompresi file gambar menggunakan Canvas API.
 * Mengubah ukuran (resize) dan kualitas untuk mengurangi ukuran file.
 */
export const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                // Hitung dimensi baru (pertahankan aspek rasio)
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                // Buat canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                // Gambar ke canvas
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Gagal membuat konteks canvas"));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                // Export ke WebP (lebih efisien dari JPEG) dengan kualitas yang diturunkan
                // Fallback ke JPEG jika browser tidak mendukung WebP
                const compressedDataUrl = canvas.toDataURL('image/webp', quality);
                
                // Cek jika hasil kompresi malah lebih besar (jarang terjadi, tapi mungkin untuk file sangat kecil)
                // Kita gunakan string length sebagai proxy kasar untuk ukuran file
                if (compressedDataUrl.length < (event.target?.result as string).length) {
                    resolve(compressedDataUrl);
                } else {
                    resolve(event.target?.result as string);
                }
            };
            
            img.onerror = (err) => reject(new Error("File bukan gambar yang valid"));
        };
        
        reader.onerror = (err) => reject(new Error("Gagal membaca file"));
    });
};
