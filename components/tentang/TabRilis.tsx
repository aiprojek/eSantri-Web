
import React from 'react';

export const TabRilis: React.FC = () => {
    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-gray-900 text-white rounded-full w-12 h-12 flex items-center justify-center">
                    <i className="bi bi-github text-2xl"></i>
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">Riwayat Perubahan (Changelog)</h3>
                    <p className="text-gray-600 text-sm mt-1 mb-4">
                        Untuk menjaga aplikasi tetap ringan, catatan perubahan lengkap kini dikelola langsung melalui repositori kode. Anda dapat melihat riwayat pembaruan, perbaikan bug, dan penambahan fitur secara real-time.
                    </p>
                    <a
                        href="https://github.com/aiprojek/eSantri-Web/commits/main/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-800 hover:underline transition-colors"
                    >
                        Lihat Catatan Rilis di GitHub <i className="bi bi-arrow-right"></i>
                    </a>
                </div>
            </div>
        </div>
    );
};

// Export placeholder variables to satisfy imports in Tentang.tsx if needed, 
// though typically you'd remove the import there. 
// Since I can only update specific files, I'm removing the exports here assuming
// Tentang.tsx doesn't strictly depend on specific variable exports besides the component.
// NOTE: Based on previous file content, Tentang.tsx imported 'latestVersion' and 'latestUpdateDate'.
// To prevent breaking errors, we export dummy values or update Tentang.tsx. 
// Assuming safer approach: I will export dummy values.

export const latestVersion = "Live"; 
export const latestUpdateDate = "GitHub";
