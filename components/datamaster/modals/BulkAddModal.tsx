
import React, { useState, useEffect } from 'react';

interface BulkAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (names: string[], parentId?: number) => void;
    title: string;
    label: string;
    parentData?: { id: number; nama: string }[];
    parentLabel?: string;
    placeholder?: string;
}

export const BulkAddModal: React.FC<BulkAddModalProps> = ({ 
    isOpen, onClose, onSave, title, label, parentData, parentLabel, placeholder 
}) => {
    const [textInput, setTextInput] = useState('');
    const [selectedParent, setSelectedParent] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setTextInput('');
            if (parentData && parentData.length > 0) {
                setSelectedParent(parentData[0].id.toString());
            } else {
                setSelectedParent('');
            }
        }
    }, [isOpen, parentData]);

    if (!isOpen) return null;

    const handleSave = () => {
        const names = textInput.split('\n').map(s => s.trim()).filter(s => s !== '');
        if (names.length === 0) return;
        
        const parentId = selectedParent ? parseInt(selectedParent) : undefined;
        onSave(names, parentId);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg"></i></button>
                </div>
                
                <div className="p-5 space-y-4 overflow-y-auto">
                    {parentData && (
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">{parentLabel || 'Pilih Induk'}</label>
                            <select 
                                value={selectedParent} 
                                onChange={(e) => setSelectedParent(e.target.value)} 
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5"
                            >
                                {parentData.map(p => (
                                    <option key={p.id} value={p.id}>{p.nama}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
                        <p className="text-xs text-gray-500 mb-2">Masukkan satu nama per baris. Enter untuk baris baru.</p>
                        <textarea 
                            value={textInput} 
                            onChange={(e) => setTextInput(e.target.value)} 
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5 font-mono"
                            rows={10}
                            placeholder={placeholder || "Contoh:\nMatematika\nBahasa Indonesia\nBahasa Arab"}
                        ></textarea>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end space-x-2 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900">Batal</button>
                    <button onClick={handleSave} disabled={!textInput.trim()} className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5 disabled:bg-gray-400">
                        Simpan ({textInput.split('\n').filter(s => s.trim()).length} Data)
                    </button>
                </div>
            </div>
        </div>
    );
};
