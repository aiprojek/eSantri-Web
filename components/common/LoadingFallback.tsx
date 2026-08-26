import React from 'react';

interface LoadingFallbackProps {
  message?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message = 'Memuat halaman...' }) => {
  return (
    <div className="flex h-full min-h-[50vh] w-full flex-col items-center justify-center p-8 text-center animate-fade-in">
      <div className="relative mb-4 flex h-12 w-12 items-center justify-center">
        <div className="absolute h-12 w-12 rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin"></div>
        <i className="bi bi-arrow-repeat text-xl text-teal-600"></i>
      </div>
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
};

export default LoadingFallback;
