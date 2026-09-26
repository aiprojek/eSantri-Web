
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileFilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    onReset?: () => void;
    onApply?: () => void;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({ 
    isOpen, 
    onClose, 
    title = "Filter & Pengaturan", 
    children,
    onReset,
    onApply
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setMounted(true);
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="app-overlay fixed inset-0 z-[100] md:hidden"
                    />
                    
                    {/* Drawer */}
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="app-modal fixed bottom-0 left-0 right-0 z-[101] flex max-h-[85vh] flex-col rounded-t-[2rem] md:hidden"
                    >
                        {/* Handle */}
                        <div className="w-full flex justify-center pt-3 pb-1.5">
                            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-app-border px-5 py-3.5">
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-app-text">{title}</h3>
                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-app-primary">Konfigurasi Tampilan</p>
                            </div>
                            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-white text-app-textMuted transition-colors hover:bg-teal-50 hover:text-app-text" aria-label="Tutup Filter">
                                <i className="bi bi-x-lg text-sm"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-5 py-4 overflow-y-auto space-y-4 flex-grow">
                            {children}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex gap-2.5 border-t border-app-border bg-slate-50/90 p-4">
                            {onReset && (
                                <button 
                                    onClick={() => { onReset(); onClose(); }}
                                    className="app-button-secondary flex-1 py-3 text-sm font-bold"
                                >
                                    <i className="bi bi-arrow-counterclockwise"></i>
                                    Reset
                                </button>
                            )}
                            <button 
                                onClick={onApply || onClose}
                                className="app-button-primary flex-[2] py-3 text-sm font-bold justify-center"
                            >
                                <i className="bi bi-check-lg text-lg"></i>
                                Terapkan Filter
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
