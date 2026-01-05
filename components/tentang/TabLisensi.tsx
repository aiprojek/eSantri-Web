
import React from 'react';

export const TabLisensi: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-900">
                <h3 className="font-bold text-lg mb-2">Ringkasan Sederhana (Bahasa Indonesia)</h3>
                <p className="mb-2">Aplikasi eSantri Web dirilis di bawah lisensi <strong>GNU General Public License v3.0 (GPLv3)</strong>.</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>✅ <strong>Bebas Digunakan:</strong> Anda boleh menggunakan aplikasi ini untuk tujuan pribadi, komersial, atau pendidikan tanpa biaya lisensi.</li>
                    <li>✅ <strong>Bebas Dimodifikasi:</strong> Anda boleh mengubah kode sumber sesuai kebutuhan Anda.</li>
                    <li>✅ <strong>Bebas Didistribusikan:</strong> Anda boleh menyalin dan membagikan aplikasi ini kepada orang lain.</li>
                    <li>🔄 <strong>Copyleft:</strong> Jika Anda memodifikasi dan mendistribusikan aplikasi ini, Anda <strong>wajib</strong> menyertakan kode sumbernya dan merilisnya di bawah lisensi yang sama (GPLv3).</li>
                    <li>⚠️ <strong>Tanpa Garansi:</strong> Aplikasi ini disediakan "apa adanya" (as is) tanpa jaminan apapun. Risiko penggunaan sepenuhnya ada pada pengguna.</li>
                </ul>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 bg-gray-100 text-gray-600 rounded-full w-12 h-12 flex items-center justify-center">
                        <i className="bi bi-file-earmark-text text-2xl"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">Naskah Lengkap Lisensi</h3>
                        <p className="text-gray-600 text-sm mt-1 mb-4">
                            Untuk membaca naskah hukum lengkap (legal text) dalam Bahasa Inggris, silakan kunjungi situs resmi GNU.
                        </p>
                        <a
                            href="https://www.gnu.org/licenses/gpl-3.0.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-800 hover:underline transition-colors"
                        >
                            Baca Lisensi GNU GPL v3 <i className="bi bi-box-arrow-up-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
