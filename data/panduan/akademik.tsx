import React from 'react';
import { PanduanSectionData } from '../panduan';

export const akademikPanduan: PanduanSectionData = {
    id: 'akademik',
    badge: 8,
    badgeColor: 'indigo',
    title: 'Akademik: Ikhtisar Kurikulum & Rapor Digital',
    steps: [
        {
            title: 'Pemisahan Panduan Terpadu: Kurikulum & Rapor',
            color: 'indigo',
            content: (
                <div className="space-y-3 text-sm text-gray-700">
                    <p>
                        Untuk kenyamanan operasional dan efektivitas koordinasi tim pesantren, modul akademik kini telah dipisahkan menjadi dua panduan terpadu mandiri:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-1.5">
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[10px] uppercase">Modul 1</span>
                            <h5 className="font-bold text-teal-900 text-sm">Kurikulum &amp; Jadwal KBM Pesantren</h5>
                            <p className="text-gray-600 leading-relaxed">
                                Panduan terpadu mencakup struktur rumpun mapel pesantren, silabus semester, matriks jadwal induk ruang guru, kalkulator RPE, analisis beban mengajar JTM, cetak slip saku A5 otomatis, hingga SOP Multi-Admin KBM.
                            </p>
                        </div>
                        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-1.5">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">Modul 2</span>
                            <h5 className="font-bold text-blue-900 text-sm">Rapor Digital &amp; Penilaian Santri</h5>
                            <p className="text-gray-600 leading-relaxed">
                                Panduan desentralisasi penilaian tanpa login guru, form kartu santri mobile, tabel leger desktop, generate formulir, import kode nilai aman, dan pencetakan rapor PDF.
                            </p>
                        </div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-xs text-indigo-950">
                        <i className="bi bi-info-circle-fill text-indigo-600 mr-1.5"></i>
                        Pilih langsung topik <strong>"Kurikulum &amp; KBM Pesantren"</strong> atau <strong>"Rapor Digital &amp; Penilaian Santri"</strong> pada menu pilihan topik panduan di atas.
                    </div>
                </div>
            )
        }
    ]
};
