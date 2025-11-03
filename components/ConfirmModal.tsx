
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
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-300',
    green: 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-300',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300',
  };
  
  const iconColorClasses = {
    red: 'bg-red-100 text-red-600',
    green: 'bg-teal-100 text-teal-600',
    blue: 'bg-blue-100 text-blue-600',
  }

  const selectedColor = colorClasses[confirmColor as keyof typeof colorClasses] || colorClasses.red;
  const selectedIconColor = iconColorClasses[confirmColor as keyof typeof iconColorClasses] || iconColorClasses.red;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4" aria-modal="true" role="dialog" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${selectedIconColor} mb-4`}>
            <i className="bi bi-exclamation-triangle-fill text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-2">{message}</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-center space-x-4 rounded-b-lg">
          <button onClick={onCancel} type="button" className="text-gray-600 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-300 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">
            Batal
          </button>
          <button onClick={onConfirm} type="button" className={`text-white ${selectedColor} focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;