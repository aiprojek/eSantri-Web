
import React, { useState } from 'react';
import { ConflictItem } from '../../types';

interface ConflictResolverProps {
    isOpen: boolean;
    conflicts: ConflictItem[];
    onResolve: (resolvedConflicts: ConflictItem[]) => void;
    onCancel: () => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({ isOpen, conflicts, onResolve, onCancel }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [resolvedList, setResolvedList] = useState<ConflictItem[]>([]);
    
    // Create a temporary working copy of the current conflict to allow partial merges
    // Initial state is "Local" as base
    const [workingData, setWorkingData] = useState<any>(null);

    React.useEffect(() => {
        if (conflicts.length > 0 && currentIndex < conflicts.length) {
            setWorkingData({ ...conflicts[currentIndex].localData });
        } else if (currentIndex >= conflicts.length && conflicts.length > 0) {
            // All resolved
            onResolve(resolvedList);
        }
    }, [currentIndex, conflicts]);

    if (!isOpen || conflicts.length === 0) return null;
    if (currentIndex >= conflicts.length) return null;

    const currentConflict = conflicts[currentIndex];
    
    // Helper to identify differences
    const getDiffKeys = (obj1: any, obj2: any) => {
        const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
        return Array.from(keys).filter(k => JSON.stringify(obj1[k]) !== JSON.stringify(obj2[k]) && k !== 'lastModified' && k !== 'id');
    };

    const diffKeys = getDiffKeys(currentConflict.localData, currentConflict.cloudData);

    // Identify the best "Name" or "Label" for the record
    const getRecordLabel = (tableName: string, data: any) => {
        if (!data) return 'Data Kosong';
        const nameFields = ['namaLengkap', 'nama', 'judul', 'deskripsi', 'nis', 'id'];
        for (const field of nameFields) {
            if (data[field]) return String(data[field]);
        }
        return `ID: ${data.id || 'N/A'}`;
    };

    const handlePickField = (key: string, source: 'local' | 'cloud') => {
        setWorkingData((prev: any) => ({
            ...prev,
            [key]: source === 'local' ? currentConflict.localData[key] : currentConflict.cloudData[key]
        }));
    };

    const handleResolve = (strategy: 'local' | 'cloud' | 'mixed') => {
        let finalData;
        if (strategy === 'local') finalData = currentConflict.localData;
        else if (strategy === 'cloud') finalData = currentConflict.cloudData;
        else finalData = workingData; // Mixed

        // Mark as resolved with final data (usually needs to update timestamp to win future syncs)
        const resolvedItem: ConflictItem = {
            ...currentConflict,
            resolved: true,
            localData: { ...finalData, lastModified: Date.now() } // This becomes the source of truth
        };

        setResolvedList(prev => [...prev, resolvedItem]);
        setCurrentIndex(prev => prev + 1);
    };

    const renderValue = (val: any) => {
        if (typeof val === 'object' && val !== null) return <pre className="text-[10px]">{JSON.stringify(val, null, 2)}</pre>;
        return String(val);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border-t-8 border-yellow-500 animate-scale-up">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <div className="flex items-center gap-3">
                            <i className="bi bi-exclamation-triangle-fill text-yellow-500 text-2xl"></i>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">Resolusi Konflik Data</h1>
                                <p className="text-gray-500 text-xs">Pilih data mana yang benar untuk menghindari penimpaan yang salah.</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-mono font-bold">Tabel: {currentConflict.tableName}</span>
                            <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold">Record: {getRecordLabel(currentConflict.tableName, currentConflict.localData)}</span>
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Konflik {currentIndex + 1} / {conflicts.length}</span>
                        </div>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="bi bi-x-circle text-2xl"></i>
                    </button>
                </div>

                <div className="flex-grow overflow-auto p-4 bg-gray-100 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center font-bold text-gray-500 text-xs uppercase tracking-widest pb-2">📂 Data Lokal (Komputer Ini)</div>
                        <div className="text-center font-bold text-gray-500 text-xs uppercase tracking-widest pb-2">☁️ Data Masuk (Dari Staff)</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 h-[calc(100%-4rem)]">
                        {/* LOCAL */}
                        <div className="bg-white rounded-xl shadow-lg border border-blue-200 flex flex-col overflow-hidden">
                            <div className="px-4 py-3 bg-blue-600 text-white font-bold flex justify-between items-center shadow-md">
                                <div className="flex items-center gap-2">
                                    <i className="bi bi-laptop"></i>
                                    <span>Versi Lokal</span>
                                </div>
                                <span className="text-[10px] font-normal opacity-80">{new Date(currentConflict.localData.lastModified).toLocaleString()}</span>
                            </div>
                            <div className="p-4 space-y-4 flex-grow overflow-auto custom-scrollbar">
                                {diffKeys.map(key => (
                                    <div key={key} 
                                         onClick={() => handlePickField(key, 'local')}
                                         className={`p-3 rounded-lg cursor-pointer border-2 transition-all relative overflow-hidden group ${JSON.stringify(workingData[key]) === JSON.stringify(currentConflict.localData[key]) ? 'bg-blue-50 border-blue-400 ring-4 ring-blue-100' : 'bg-white border-gray-100 hover:border-blue-200 grayscale opacity-40'}`}>
                                        <div className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-tighter">Field: {key}</div>
                                        <div className="text-sm font-medium text-gray-900 break-words leading-relaxed">{renderValue(currentConflict.localData[key])}</div>
                                        {JSON.stringify(workingData[key]) === JSON.stringify(currentConflict.localData[key]) && (
                                            <div className="absolute top-2 right-2 text-blue-500 animate-bounce">
                                                <i className="bi bi-check-circle-fill"></i>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t bg-gray-50">
                                <button onClick={() => handleResolve('local')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition-all">
                                    Gunakan Semua Data Lokal
                                </button>
                            </div>
                        </div>

                        {/* CLOUD */}
                        <div className="bg-white rounded-xl shadow-lg border border-green-200 flex flex-col overflow-hidden">
                            <div className="px-4 py-3 bg-green-600 text-white font-bold flex justify-between items-center shadow-md">
                                <div className="flex items-center gap-2">
                                    <i className="bi bi-cloud-check"></i>
                                    <span>Versi Staff</span>
                                </div>
                                <span className="text-[10px] font-normal opacity-80">{new Date(currentConflict.cloudData.lastModified).toLocaleString()}</span>
                            </div>
                            <div className="p-4 space-y-4 flex-grow overflow-auto custom-scrollbar">
                                {diffKeys.map(key => (
                                    <div key={key} 
                                         onClick={() => handlePickField(key, 'cloud')}
                                         className={`p-3 rounded-lg cursor-pointer border-2 transition-all relative overflow-hidden group ${JSON.stringify(workingData[key]) === JSON.stringify(currentConflict.cloudData[key]) ? 'bg-green-50 border-green-500 ring-4 ring-green-100' : 'bg-white border-gray-100 hover:border-green-200 grayscale opacity-40'}`}>
                                        <div className="text-[10px] font-black text-green-600 uppercase mb-1 tracking-tighter">Field: {key}</div>
                                        <div className="text-sm font-medium text-gray-900 break-words leading-relaxed">{renderValue(currentConflict.cloudData[key])}</div>
                                        {JSON.stringify(workingData[key]) === JSON.stringify(currentConflict.cloudData[key]) && (
                                            <div className="absolute top-2 right-2 text-green-500 animate-bounce">
                                                <i className="bi bi-check-circle-fill"></i>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t bg-gray-50">
                                <button onClick={() => handleResolve('cloud')} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg active:scale-95 transition-all">
                                    Gunakan Semua Data Staff
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-500 flex items-start gap-2 max-w-lg">
                        <i className="bi bi-info-circle-fill text-blue-500 mt-0.5"></i>
                        <span>
                            Anda bisa memilih field secara individu dengan klik pada kotak data di atas. Klik <strong>Simpan Hasil Campuran</strong> jika Anda memilih beberapa dari Lokal dan beberapa dari Staff.
                        </span>
                    </div>
                    <button 
                        onClick={() => handleResolve('mixed')} 
                        className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 shadow-xl transform hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i className="bi bi-stars"></i>
                        Simpan Hasil Campuran
                    </button>
                </div>
            </div>
        </div>
    );
};
