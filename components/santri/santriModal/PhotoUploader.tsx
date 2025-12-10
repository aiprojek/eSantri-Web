import React, { useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Santri } from '../../../types';

interface PhotoUploaderProps {
    formMethods: UseFormReturn<Santri>;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ formMethods }) => {
    const { watch, setValue } = formMethods;
    const watchFotoUrl = watch('fotoUrl');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hasValidPhoto = watchFotoUrl && !watchFotoUrl.includes('text=Foto');

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setValue('fotoUrl', reader.result as string, { shouldDirty: true });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col items-center">
            {hasValidPhoto ? (
                <img 
                    src={watchFotoUrl} 
                    alt="Foto Santri"
                    className="w-36 h-48 object-cover rounded-md border-4 border-gray-200 bg-gray-100"
                />
            ) : (
                <div className="w-36 h-48 rounded-md border-4 border-gray-200 bg-teal-50 flex items-center justify-center overflow-hidden">
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
                className="mt-3 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg transition-colors"
            >
                {hasValidPhoto ? 'Ganti Foto' : 'Upload Foto'}
            </button>
             {hasValidPhoto && (
                 <button 
                    type="button"
                    onClick={() => setValue('fotoUrl', '', { shouldDirty: true })}
                    className="mt-2 text-xs text-red-600 hover:underline"
                >
                    Hapus Foto
                </button>
            )}
        </div>
    );
};