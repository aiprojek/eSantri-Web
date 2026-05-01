
import React from 'react';
import { APP_VERSION } from '../../version';
import { SectionCard } from '../common/SectionCard';

export const TabRilis: React.FC = () => {
    return (
        <SectionCard contentClassName="p-6">
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="app-panel-soft flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-700">
                        <i className="bi bi-github text-2xl"></i>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-app-text">Riwayat Perubahan (Changelog)</h3>
                        <p className="mb-4 mt-1 text-sm app-text-secondary">
                            Untuk menjaga aplikasi tetap ringan, catatan perubahan lengkap kini dikelola langsung melalui repositori kode. Anda dapat melihat riwayat pembaruan, perbaikan bug, dan penambahan fitur secara real-time.
                        </p>
                        <a
                            href="https://github.com/aiprojek/eSantri-Web/commits/main/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 font-semibold text-teal-700 transition-colors hover:text-teal-800 hover:underline"
                        >
                            Lihat Catatan Rilis di GitHub <i className="bi bi-arrow-right"></i>
                        </a>
                    </div>
                </div>

            </div>
        </SectionCard>
    );
};

// Export placeholder variables to satisfy imports in Tentang.tsx.
export const latestVersion = APP_VERSION; 
export const latestUpdateDate = "GitHub";
