
import React, { useState, useEffect } from 'react';
import { runFullHealthCheck, HealthCheckResult } from '../../../services/healthCheckService';
import { useAppContext } from '../../../AppContext';

export const TabDiagnostik: React.FC = () => {
    const { showAlert, showToast, showConfirmation } = useAppContext();
    const [results, setResults] = useState<HealthCheckResult[]>([]);
    const [isChecking, setIsChecking] = useState(false);

    const handleRunCheck = async () => {
        setIsChecking(true);
        try {
            const data = await runFullHealthCheck();
            setResults(data);
        } catch (e) {
            showToast('Gagal menjalankan diagnosa', 'error');
        } finally {
            setIsChecking(false);
        }
    };

    const handleExecuteAction = async (res: HealthCheckResult) => {
        if (!res.action) return;
        
        showConfirmation(
            'Jalankan Perbaikan Otomatis?',
            `Sistem akan melakukan: ${res.actionLabel}. Tindakan ini akan memodifikasi database lokal Anda.`,
            async () => {
                setIsChecking(true);
                try {
                    await res.action!();
                    showToast('Perbaikan berhasil dijalankan!', 'success');
                    await handleRunCheck(); // Refresh results
                } catch (e) {
                    showToast('Gagal menjalankan perbaikan', 'error');
                } finally {
                    setIsChecking(false);
                }
            },
            { confirmColor: 'orange', confirmText: 'Ya, Perbaiki' }
        );
    };

    useEffect(() => {
        handleRunCheck();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ok': return <i className="bi bi-check-circle-fill text-green-500"></i>;
            case 'warning': return <i className="bi bi-exclamation-triangle-fill text-yellow-500"></i>;
            case 'error': return <i className="bi bi-x-circle-fill text-red-500"></i>;
            default: return null;
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <i className="bi bi-heart-pulse-fill text-red-500"></i> Diagnosa Sistem & Validasi Data
                    </h2>
                    <p className="text-xs text-gray-500">Scan database untuk menemukan ketidakkonsistenan atau error tersembunyi.</p>
                </div>
                <button 
                    onClick={handleRunCheck} 
                    disabled={isChecking}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-teal-700 disabled:opacity-50 transition-all"
                >
                    {isChecking ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : <i className="bi bi-search"></i>}
                    Scan Ulang
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {results.map((res, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border flex gap-4 transition-all hover:shadow-md ${
                        res.status === 'ok' ? 'bg-green-50 border-green-100' : 
                        res.status === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                    }`}>
                        <div className="text-2xl mt-1">{getStatusIcon(res.status)}</div>
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider font-mono">{res.category}</span>
                                    <h3 className={`font-bold ${res.status === 'ok' ? 'text-green-800' : res.status === 'warning' ? 'text-yellow-800' : 'text-red-800'}`}>
                                        {res.message}
                                    </h3>
                                </div>
                                {res.actionLabel && (
                                    <button 
                                        onClick={() => handleExecuteAction(res)}
                                        disabled={isChecking}
                                        className="text-xs font-bold px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 shadow-sm disabled:opacity-50"
                                    >
                                        {res.actionLabel}
                                    </button>
                                )}
                            </div>
                            {res.details && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{res.details}</p>}
                        </div>
                    </div>
                ))}

                {results.length === 0 && !isChecking && (
                    <div className="text-center py-12 text-gray-400">
                        <i className="bi bi-clipboard-check text-4xl block mb-2 opacity-20"></i>
                        Klik tombol Scan untuk memulai diagnosa.
                    </div>
                )}
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                <h4 className="font-bold flex items-center gap-2 mb-1">
                    <i className="bi bi-info-circle-fill"></i> Mengapa Melakukan Diagnosa?
                </h4>
                <p className="text-xs">
                    Software eSantri menggunakan teknologi IndexedDB (Database Lokal) untuk kecepatan maksimal. Terkadang, interupsi saat sinkronisasi atau browser crash bisa menyebabkan data tidak sinkron. Menu Diagnosa membantu Anda menemukan masalah tersebut sebelum menjadi fatal.
                </p>
            </div>
        </div>
    );
};
