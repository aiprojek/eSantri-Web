import React from 'react';

interface CloudPairingPanelProps {
    inputPairingCode: string;
    isProcessingPairing: boolean;
    pairingStep: string;
    onInputPairingCodeChange: (value: string) => void;
    onConnectViaPairing: () => Promise<void>;
}

export const CloudPairingPanel: React.FC<CloudPairingPanelProps> = ({
    inputPairingCode,
    isProcessingPairing,
    pairingStep,
    onInputPairingCodeChange,
    onConnectViaPairing,
}) => (
    <div className="app-panel-soft grid grid-cols-1 gap-4 rounded-[24px] p-5 sm:p-6">
        <h4 className="font-bold text-green-800 text-sm">B. Setup Cepat (Untuk Staff)</h4>
        <p className="text-xs text-green-700">
            Punya kode dari Admin? Paste di sini untuk langsung terhubung tanpa login.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
            <input
                type="text"
                value={inputPairingCode}
                onChange={(e) => onInputPairingCodeChange(e.target.value)}
                className="app-input flex-grow text-sm"
                placeholder="Paste kode ESANTRI-CLOUD-... disini"
                disabled={isProcessingPairing}
            />
            <button
                onClick={() => { void onConnectViaPairing(); }}
                disabled={isProcessingPairing}
                className="flex items-center justify-center gap-2 rounded-[16px] bg-green-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:bg-gray-400"
            >
                {isProcessingPairing ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : 'Hubungkan'}
            </button>
        </div>
        {pairingStep === 'connecting' && <p className="text-xs text-green-700 animate-pulse">Menyalin Sesi Cloud...</p>}
        {pairingStep === 'validating' && <p className="text-xs text-orange-700 animate-pulse">Memverifikasi Token & Koneksi...</p>}
        {pairingStep === 'downloading_account' && <p className="text-xs text-blue-700 animate-pulse">Mengunduh data akun...</p>}
        {pairingStep === 'downloading_data' && <p className="text-xs text-indigo-700 animate-pulse">Mengunduh data master...</p>}
    </div>
);
