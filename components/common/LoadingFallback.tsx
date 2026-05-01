
import React from 'react';

export const LoadingFallback: React.FC = () => {
    return (
        <div className="app-panel flex h-[calc(100vh-240px)] w-full flex-col items-center justify-center rounded-panel px-6 py-16 text-center animate-fade-in">
            <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-app-border"></div>
                <div className="absolute left-0 top-0 h-12 w-12 animate-spin rounded-full border-4 border-app-primary border-t-transparent"></div>
            </div>
            <p className="mt-4 text-sm font-medium app-text-secondary">Memuat Halaman...</p>
        </div>
    );
};
