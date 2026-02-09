
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastData, ConfirmationState, AlertState } from '../types';

interface UIContextType {
    toasts: ToastData[];
    confirmation: ConfirmationState;
    alertModal: AlertState;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    removeToast: (id: number) => void;
    showAlert: (title: string, message: string) => void;
    hideAlert: () => void;
    showConfirmation: (
        title: string,
        message: string,
        onConfirm: () => void | Promise<void>,
        options?: { confirmText?: string; confirmColor?: string }
    ) => void;
    hideConfirmation: () => void;
}

const UIContext = createContext<UIContextType | null>(null);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const [confirmation, setConfirmation] = useState<ConfirmationState>({
        isOpen: false, title: '', message: '', onConfirm: () => {},
    });
    const [alertModal, setAlertModal] = useState<AlertState>({ isOpen: false, title: '', message: '' });

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToasts(prev => [...prev, { id: Date.now(), message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showAlert = useCallback((title: string, message: string) => {
        setAlertModal({ isOpen: true, title, message });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const showConfirmation = useCallback((title: string, message: string, onConfirm: () => void | Promise<void>, options: { confirmText?: string; confirmColor?: string } = {}) => {
        setConfirmation({
            isOpen: true, title, message,
            onConfirm: async () => { await onConfirm(); setConfirmation(prev => ({ ...prev, isOpen: false })); },
            confirmText: options.confirmText, confirmColor: options.confirmColor
        });
    }, []);

    const hideConfirmation = useCallback(() => {
        setConfirmation(prev => ({ ...prev, isOpen: false }));
    }, []);

    return (
        <UIContext.Provider value={{
            toasts, confirmation, alertModal,
            showToast, removeToast, showAlert, hideAlert, showConfirmation, hideConfirmation
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUIContext = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUIContext must be used within a UIProvider');
    return context;
};
