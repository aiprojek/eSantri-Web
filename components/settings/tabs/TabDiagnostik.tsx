
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

    const okCount = results.filter(r => r.status === 'ok').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const fixableResults = results.filter(r => r.action && (r.status === 'warning' || r.status === 'error'));
    const healthScore = results.length > 0
        ? Math.max(0, Math.round(((okCount + warningCount * 0.5) / results.length) * 100))
        : 100;

    const handleFixAll = () => {
        if (fixableResults.length === 0) return;
        showConfirmation(
            'Perbaiki Semua Temuan Otomatis?',
            `Sistem akan menjalankan ${fixableResults.length} tindakan perbaikan otomatis secara berurutan pada database lokal Anda.`,
            async () => {
                setIsChecking(true);
                try {
                    for (const item of fixableResults) {
                        if (item.action) {
                            await item.action();
                        }
                    }
                    showToast(`Berhasil memperbaiki ${fixableResults.length} temuan!`, 'success');
                    await handleRunCheck();
                } catch (e) {
                    showToast('Sebagian perbaikan gagal dijalankan.', 'error');
                } finally {
                    setIsChecking(false);
                }
            },
            { confirmColor: 'teal', confirmText: 'Ya, Perbaiki Semua' }
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-teal-200 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <i className="bi bi-heart-pulse-fill text-red-500"></i> Diagnosa Sistem & Validasi Data
                    </h2>
                    <p className="text-xs text-gray-500">Scan menyeluruh lintas modul (Santri, Keuangan, Akademik, Tahfizh, Sarpras, dan Cloud Sync) untuk menemukan anomali data.</p>
                </div>
                <div className="flex items-center gap-2.5 self-end sm:self-center">
                    {fixableResults.length > 0 && (
                        <button
                            onClick={handleFixAll}
                            disabled={isChecking}
                            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-amber-700 disabled:opacity-50 transition-all shadow-xs"
                        >
                            <i className="bi bi-magic"></i>
                            Perbaiki Semua ({fixableResults.length})
                        </button>
                    )}
                    <button 
                        onClick={handleRunCheck} 
                        disabled={isChecking}
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-teal-700 disabled:opacity-50 transition-all shadow-xs"
                    >
                        {isChecking ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : <i className="bi bi-search"></i>}
                        Scan Ulang
                    </button>
                </div>
            </div>

            {results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-bold uppercase text-teal-700">Skor Kesehatan DB</div>
                            <div className="text-2xl font-black text-teal-900 mt-0.5">{healthScore}%</div>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-white border border-teal-200 flex items-center justify-center text-teal-600 text-xl shadow-2xs">
                            <i className="bi bi-shield-check"></i>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-green-200 bg-green-50/60 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-bold uppercase text-green-700">Modul Sehat</div>
                            <div className="text-2xl font-black text-green-800 mt-0.5">{okCount}</div>
                        </div>
                        <i className="bi bi-check-circle-fill text-2xl text-green-500"></i>
                    </div>
                    <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50/60 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-bold uppercase text-yellow-700">Peringatan</div>
                            <div className="text-2xl font-black text-yellow-800 mt-0.5">{warningCount}</div>
                        </div>
                        <i className="bi bi-exclamation-triangle-fill text-2xl text-yellow-500"></i>
                    </div>
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50/60 flex items-center justify-between">
                        <div>
                            <div className="text-[11px] font-bold uppercase text-red-700">Error Kritis</div>
                            <div className="text-2xl font-black text-red-800 mt-0.5">{errorCount}</div>
                        </div>
                        <i className="bi bi-x-circle-fill text-2xl text-red-500"></i>
                    </div>
                </div>
            )}

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
