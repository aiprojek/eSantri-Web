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
            <img 
                src={watchFotoUrl || 'https://placehold.co/150x200/e2e8f0/334155?text=Foto'} 
                alt="Foto Santri"
                className="w-36 h-48 object-cover rounded-md border-4 border-gray-200 bg-gray-100"
            />
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
                className="mt-3 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg"
            >
                Ganti Foto
            </button>
             {watchFotoUrl && (
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
