
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
                        <div className="w-full flex justify-center pt-4 pb-2">
                            <div className="h-1.5 w-12 rounded-full bg-white/10" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-app-border px-6 py-4">
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-app-text">{title}</h3>
                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-app-primary">Konfigurasi Tampilan</p>
                            </div>
                            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-app-border bg-white text-app-textMuted transition-colors hover:bg-teal-50 hover:text-app-text">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-8 overflow-y-auto space-y-8 flex-grow">
                            {children}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex gap-3 border-t border-app-border bg-slate-50/80 p-6">
                            {onReset && (
                                <button 
                                    onClick={() => { onReset(); onClose(); }}
                                    className="app-button-secondary flex-1 px-4 py-4"
                                >
                                    <i className="bi bi-arrow-counterclockwise"></i>
                                    Reset
                                </button>
                            )}
                            <button 
                                onClick={onApply || onClose}
                                className="app-button-primary flex-[2] px-4 py-4"
                            >
                                <i className="bi bi-check-lg text-xl"></i>
                                Terapkan Filter
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
