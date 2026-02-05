
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
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="bi bi-exclamation-triangle-fill text-yellow-500"></i> Konflik Sinkronisasi
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">
                            Konflik {currentIndex + 1} dari {conflicts.length} • Tabel: <span className="font-mono font-bold bg-gray-200 px-1 rounded">{currentConflict.tableName}</span>
                        </p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                <div className="flex-grow overflow-auto p-6 bg-gray-100">
                    <div className="grid grid-cols-2 gap-4 h-full">
                        {/* LOCAL */}
                        <div className="bg-white rounded-lg shadow border-2 border-blue-200 flex flex-col">
                            <div className="p-3 bg-blue-50 border-b border-blue-200 font-bold text-blue-800 flex justify-between items-center">
                                <span>Versi Lokal (Komputer Ini)</span>
                                <span className="text-xs font-normal opacity-70">{new Date(currentConflict.localData.lastModified).toLocaleString()}</span>
                            </div>
                            <div className="p-4 space-y-3 flex-grow overflow-auto">
                                {diffKeys.map(key => (
                                    <div key={key} 
                                         onClick={() => handlePickField(key, 'local')}
                                         className={`p-2 rounded cursor-pointer border transition-all ${JSON.stringify(workingData[key]) === JSON.stringify(currentConflict.localData[key]) ? 'bg-blue-100 border-blue-400 ring-1 ring-blue-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 opacity-60'}`}>
                                        <div className="text-xs font-bold text-gray-500 uppercase mb-1">{key}</div>
                                        <div className="text-sm font-medium text-gray-900 break-words">{renderValue(currentConflict.localData[key])}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 border-t bg-gray-50">
                                <button onClick={() => handleResolve('local')} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm">
                                    Gunakan Semua Data Lokal
                                </button>
                            </div>
                        </div>

                        {/* CLOUD */}
                        <div className="bg-white rounded-lg shadow border-2 border-green-200 flex flex-col">
                            <div className="p-3 bg-green-50 border-b border-green-200 font-bold text-green-800 flex justify-between items-center">
                                <span>Versi Cloud (Server)</span>
                                <span className="text-xs font-normal opacity-70">{new Date(currentConflict.cloudData.lastModified).toLocaleString()}</span>
                            </div>
                            <div className="p-4 space-y-3 flex-grow overflow-auto">
                                {diffKeys.map(key => (
                                    <div key={key} 
                                         onClick={() => handlePickField(key, 'cloud')}
                                         className={`p-2 rounded cursor-pointer border transition-all ${JSON.stringify(workingData[key]) === JSON.stringify(currentConflict.cloudData[key]) ? 'bg-green-100 border-green-400 ring-1 ring-green-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 opacity-60'}`}>
                                        <div className="text-xs font-bold text-gray-500 uppercase mb-1">{key}</div>
                                        <div className="text-sm font-medium text-gray-900 break-words">{renderValue(currentConflict.cloudData[key])}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 border-t bg-gray-50">
                                <button onClick={() => handleResolve('cloud')} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 shadow-sm">
                                    Gunakan Semua Data Cloud
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border-t flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        Klik pada kotak data di atas untuk mencampur (Mix & Match) field secara manual.
                    </div>
                    <button onClick={() => handleResolve('mixed')} className="bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 shadow-lg transform hover:-translate-y-1 transition-all">
                        Simpan Hasil Campuran
                    </button>
                </div>
            </div>
        </div>
    );
};
