
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmColor?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Ya, Lanjutkan',
  confirmColor = 'red'
}) => {
  if (!isOpen) return null;

  const colorClasses = {
    red: 'app-button-danger',
    green: 'app-button-primary',
    blue: 'app-button-primary',
  };
  
  const iconColorClasses = {
    red: 'bg-red-500/12 text-app-danger border border-red-500/20',
    green: 'bg-app-success/12 text-app-success border border-app-success/20',
    blue: 'bg-app-primary/12 text-app-primary border border-app-primary/20',
  }

  const selectedColor = colorClasses[confirmColor as keyof typeof colorClasses] || colorClasses.red;
  const selectedIconColor = iconColorClasses[confirmColor as keyof typeof iconColorClasses] || iconColorClasses.red;

  return (
    <div className="app-overlay fixed inset-0 z-[100] flex items-center justify-center p-4" aria-modal="true" role="dialog" onClick={onCancel}>
      <div className="app-modal w-full max-w-md rounded-panel" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${selectedIconColor}`}>
            <i className="bi bi-exclamation-triangle-fill text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-app-text">{title}</h3>
          <p className="mt-2 text-sm app-text-muted">{message}</p>
        </div>
        <div className="flex justify-center gap-4 rounded-b-panel border-t border-app-border bg-slate-50/80 px-6 py-4">
          <button onClick={onCancel} type="button" className="app-button-secondary px-5 py-2.5">
            Batal
          </button>
          <button onClick={onConfirm} type="button" className={`${selectedColor} px-5 py-2.5 text-center`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
