
import React, { useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Santri } from '../../../types';
import { compressImage } from '../../../utils/imageOptimizer';

interface PhotoUploaderProps {
    formMethods: UseFormReturn<Santri>;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ formMethods }) => {
    const { watch, setValue } = formMethods;
    const watchFotoUrl = watch('fotoUrl');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const hasValidPhoto = watchFotoUrl && !watchFotoUrl.includes('text=Foto');

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsProcessing(true);
            try {
                // Kompresi gambar: Max lebar 800px, Kualitas 70%
                const compressedBase64 = await compressImage(file, 800, 0.7);
                setValue('fotoUrl', compressedBase64, { shouldDirty: true });
            } catch (error) {
                console.error("Gagal mengompresi gambar:", error);
                alert("Gagal memproses gambar. Silakan coba file lain.");
            } finally {
                setIsProcessing(false);
                // Reset input agar bisa upload file yang sama jika perlu
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="flex flex-col items-center">
            {hasValidPhoto ? (
                <img 
                    src={watchFotoUrl} 
                    alt="Foto Santri"
                    className={`w-36 h-48 object-cover rounded-md border-4 border-gray-200 bg-gray-100 ${isProcessing ? 'opacity-50' : ''}`}
                />
            ) : (
                <div className={`w-36 h-48 rounded-md border-4 border-gray-200 bg-teal-50 flex items-center justify-center overflow-hidden ${isProcessing ? 'opacity-50' : ''}`}>
                    <svg viewBox="0 0 100 120" className="w-full h-full text-teal-200" fill="currentColor">
                        <rect width="100" height="120" fill="#f0fdfa"/> {/* teal-50 */}
                        <path d="M15 120 Q 50 70 85 120" fill="#0f766e" opacity="0.8"/> {/* Body teal-700 */}
                        <circle cx="50" cy="50" r="22" fill="#ccfbf1"/> {/* Head teal-100 */}
                    </svg>
                </div>
            )}
            
            <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
            />
            <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="mt-3 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg transition-colors disabled:bg-teal-400 flex items-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                        <span>Memproses...</span>
                    </>
                ) : (
                    hasValidPhoto ? 'Ganti Foto' : 'Upload Foto'
                )}
            </button>
             {hasValidPhoto && !isProcessing && (
                 <button 
                    type="button"
                    onClick={() => setValue('fotoUrl', '', { shouldDirty: true })}
                    className="mt-2 text-xs text-red-600 hover:underline"
                >
                    Hapus Foto
                </button>
            )}
            {hasValidPhoto && (
                <p className="text-[10px] text-gray-400 mt-1">
                    *Foto otomatis dikompresi untuk menghemat penyimpanan.
                </p>
            )}
        </div>
    );
};
