
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
                    />
                    
                    {/* Drawer */}
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-[101] shadow-2xl md:hidden max-h-[85vh] flex flex-col"
                    >
                        {/* Handle */}
                        <div className="w-full flex justify-center pt-4 pb-2">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                                <p className="text-[10px] uppercase font-bold text-teal-600 tracking-widest mt-0.5">Konfigurasi Tampilan</p>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-8 overflow-y-auto space-y-8 flex-grow">
                            {children}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                            {onReset && (
                                <button 
                                    onClick={() => { onReset(); onClose(); }}
                                    className="flex-1 py-4 px-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="bi bi-arrow-counterclockwise"></i>
                                    Reset
                                </button>
                            )}
                            <button 
                                onClick={onApply || onClose}
                                className="flex-[2] py-4 px-4 bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
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
