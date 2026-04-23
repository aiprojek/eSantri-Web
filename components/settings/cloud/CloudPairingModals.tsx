import React from 'react';

interface CloudPairingModalsProps {
    generatedCode: string;
    generatedCodeMode: 'session' | 'invite';
    pairingStep: string;
    onClosePairingModal: () => void;
    onCopyCode: () => void;
    onFinishPairing: () => void;
}

export const CloudPairingModals: React.FC<CloudPairingModalsProps> = ({
    generatedCode,
    generatedCodeMode,
    pairingStep,
    onClosePairingModal,
    onCopyCode,
    onFinishPairing,
}) => (
    <>
        {generatedCode && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                        {generatedCodeMode === 'invite' ? 'Kode Pairing Firebase' : 'Kode Pairing (Kloning Sesi)'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {generatedCodeMode === 'invite'
                            ? 'Berikan kode ini kepada Staff. Kode ini adalah undangan sementara agar staff bisa bergabung ke tenant Firebase Anda dengan akun Google mereka sendiri.'
                            : 'Berikan kode ini kepada Staff. Staff tidak perlu login manual, sistem akan menggunakan sesi (Refresh Token) yang sama dengan komputer ini.'}
                    </p>

                    <div className="bg-gray-100 p-3 rounded border border-gray-300 relative group">
                        <code className="text-xs font-mono break-all text-gray-800">
                            {generatedCode}
                        </code>
                        <button
                            onClick={onCopyCode}
                            className="absolute top-2 right-2 bg-white border shadow-sm p-1.5 rounded text-gray-600 hover:text-blue-600"
                            title="Salin"
                        >
                            <i className="bi bi-clipboard"></i>
                        </button>
                    </div>

                    <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                        <strong>PERHATIAN:</strong> {generatedCodeMode === 'invite'
                            ? 'Kode ini adalah undangan akses sementara. Jangan bagikan di tempat umum dan gunakan secepatnya.'
                            : 'Kode ini mengandung Kunci Rahasia akses penyimpanan data. Jangan bagikan di tempat umum.'}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button onClick={onClosePairingModal} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium">Tutup</button>
                    </div>
                </div>
            </div>
        )}

        {pairingStep === 'success' && (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center animate-fade-in-down border-t-4 border-green-500">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <i className="bi bi-cloud-check-fill text-4xl"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Koneksi Berhasil!</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        Koneksi cloud berhasil divalidasi. Data Master terbaru juga sudah diunduh.
                    </p>
                    <button
                        onClick={onFinishPairing}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg transition-transform hover:-translate-y-1"
                    >
                        Mulai Sekarang
                    </button>
                </div>
            </div>
        )}
    </>
);
