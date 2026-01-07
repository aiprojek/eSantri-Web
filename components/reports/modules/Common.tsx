
import React from 'react';
import { Santri } from '../../../types';

// --- Utility Functions ---

export const lightenColor = (hex: string, percent: number): string => {
    if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        return '#ffffff';
    }
    let hexVal = hex.substring(1);
    if (hexVal.length === 3) {
        hexVal = hexVal.split('').map(char => char + char).join('');
    }
    const r = parseInt(hexVal.substring(0, 2), 16);
    const g = parseInt(hexVal.substring(2, 4), 16);
    const b = parseInt(hexVal.substring(4, 6), 16);
    const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

export const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
};

export const formatDateTime = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
}

export const toHijri = (date: Date): string => {
    try {
        return new Intl.DateTimeFormat('id-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch (e) {
        console.error("Hijri conversion with 'id' locale failed, falling back.", e);
        return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    }
};

export const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

// --- Helper for Pagination ---
export const chunkArray = <T,>(arr: T[], size: number) => 
    Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );

// --- Components ---

export const ReportFooter: React.FC = () => (
    <div className="mt-auto pt-2 border-t border-gray-400 text-center text-[8pt] text-gray-500 italic w-full" style={{ breakInside: 'avoid' }}>
        dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id
    </div>
);

export const AvatarPlaceholder: React.FC<{ variant: 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria' }> = ({ variant }) => {
    if (variant === 'classic') {
        return (
            <svg viewBox="0 0 100 120" className="w-full h-full">
                <rect width="100" height="120" fill="#f0fdf4"/>
                <path d="M15 120 Q 50 70 85 120" fill="#1B4D3E" />
                <circle cx="50" cy="50" r="22" fill="#d1fae5"/>
            </svg>
        );
    } else if (variant === 'modern') {
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="#bfdbfe"/>
                <path d="M15 100 Q 50 60 85 100" fill="#1e3a8a"/>
                <circle cx="50" cy="45" r="20" fill="#dbeafe"/>
            </svg>
        );
    } else if (variant === 'vertical') {
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="#f3f4f6"/>
                <path d="M15 100 Q 50 65 85 100" fill="#991b1b"/>
                <circle cx="50" cy="50" r="22" fill="#fee2e2"/>
            </svg>
        );
    } else if (variant === 'dark') {
        return (
            <svg viewBox="0 0 100 120" className="w-full h-full">
                <rect width="100" height="120" fill="#1e293b"/>
                <path d="M15 120 Q 50 70 85 120" fill="#0f172a"/>
                <circle cx="50" cy="50" r="22" fill="#94a3b8"/>
            </svg>
        );
    } else {
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
                <rect width="100" height="100" fill="#fff7ed"/>
                <path d="M15 110 Q 50 65 85 110" fill="#14b8a6"/>
                <circle cx="50" cy="45" r="20" fill="#ccfbf1"/>
            </svg>
        );
    }
};

export const SmartAvatar: React.FC<{ santri: Santri, variant: 'classic' | 'modern' | 'vertical' | 'dark' | 'ceria', className?: string, forcePlaceholder?: boolean }> = ({ santri, variant, className, forcePlaceholder }) => {
    const hasValidPhoto = santri.fotoUrl && !santri.fotoUrl.includes('text=Foto');
    return (
        <div className={`overflow-hidden ${className}`}>
            {!forcePlaceholder && hasValidPhoto ? (
                <img src={santri.fotoUrl} alt={santri.namaLengkap} className="w-full h-full object-cover" />
            ) : (
                <AvatarPlaceholder variant={variant} />
            )}
        </div>
    );
};
