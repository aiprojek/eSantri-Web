
import React from 'react';

export const LoadingFallback: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] w-full animate-fade-in">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-gray-200"></div>
                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-teal-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-500 text-sm font-medium">Memuat Halaman...</p>
        </div>
    );
};
