
import React from 'react';

const ServiceCard: React.FC<{
    title: string;
    price: string;
    period?: string;
    icon: string;
    description: string;
    features: string[];
    buttonText: string;
    buttonColor: string;
    isPopular?: boolean;
    link: string;
}> = ({ title, price, period, icon, description, features, buttonText, buttonColor, isPopular, link }) => (
    <div className={`bg-white rounded-2xl shadow-sm border flex flex-col h-full relative transition-transform hover:-translate-y-1 hover:shadow-lg ${isPopular ? 'border-teal-500 ring-2 ring-teal-500 ring-opacity-20' : 'border-gray-200'}`}>
        {isPopular && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wide">
                Paling Diminati
            </div>
        )}
        <div className="p-6 flex-grow">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4 ${isPopular ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-600'}`}>
                <i className={`bi ${icon}`}></i>
            </div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            <div className="mt-2 mb-4">
                <span className="text-2xl font-bold text-gray-900">{price}</span>
                {period && <span className="text-gray-500 text-sm font-medium">/{period}</span>}
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {description}
            </p>
            <ul className="space-y-3 mb-6">
                {features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                        <i className="bi bi-check-circle-fill text-green-500 mt-0.5 flex-shrink-0"></i>
                        <span>{feat}</span>
                    </li>
                ))}
            </ul>
        </div>
        <div className="p-6 pt-0 mt-auto">
            <a 
                href={link} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${buttonColor}`}
            >
                <i className="bi bi-whatsapp"></i> {buttonText}
            </a>
        </div>
    </div>
);

export const TabLayanan: React.FC = () => {
    const waBaseUrl = "https://wa.me/6281225879494"; // Ganti dengan nomor WA Anda

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Hero Section */}
            <div className="text-center max-w-2xl mx-auto mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Layanan Premium & Dukungan</h2>
                <p className="text-gray-600">
                    Aplikasi eSantri Web 100% Gratis & Open Source. Namun, jika Anda membutuhkan kemudahan teknis, installer siap pakai, atau fitur khusus, kami siap membantu.
                </p>
            </div>

            {/* Pricing Cards - Changed grid to 2 columns for better balance with 4 items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Paket 1: Installer Desktop (NEW) */}
                <ServiceCard 
                    title="Installer Desktop Native"
                    price="Rp 150rb"
                    period="donasi"
                    icon="bi-laptop"
                    description="File aplikasi siap install. Lebih stabil, terisolasi dari browser, dan icon langsung di Desktop/Start Menu."
                    features={[
                        "Mendukung Windows, Linux, & macOS",
                        "Tanpa Install Node.js/Terminal (Ribet)",
                        "Shortcut Icon di Desktop",
                        "Performa Lebih Ringan & Cepat",
                        "Dapat Update Versi Baru"
                    ]}
                    buttonText="Beli Installer"
                    buttonColor="bg-purple-600 hover:bg-purple-700 text-white"
                    link={`${waBaseUrl}?text=Halo%20Admin,%20saya%20ingin%20donasi%20untuk%20mendapatkan%20file%20Installer%20Desktop%20(Windows/Linux/Mac).`}
                />

                {/* Paket 2: Managed Hosting */}
                <ServiceCard 
                    title="eSantri Cloud (SaaS)"
                    price="Rp 750rb"
                    period="tahun"
                    icon="bi-cloud-check-fill"
                    description="Solusi 'Terima Beres'. Tidak perlu pusing install atau cari hosting. Kami siapkan aplikasi online dan bantu koneksikan ke Dropbox Anda."
                    features={[
                        "Aplikasi Online via Domain Resmi",
                        "Domain (nama-pesantren.my.id)",
                        "Bantuan Setup Koneksi Dropbox",
                        "Server Aplikasi Cepat & Stabil",
                        "Akses Multi-User Siap Pakai",
                        "Prioritas Update & Support WA"
                    ]}
                    buttonText="Pesan Cloud"
                    buttonColor="bg-teal-600 hover:bg-teal-700 text-white"
                    isPopular={true}
                    link={`${waBaseUrl}?text=Halo%20Admin,%20saya%20tertarik%20dengan%20paket%20eSantri%20Cloud.`}
                />

                {/* Paket 3: Jasa Support */}
                <ServiceCard 
                    title="Jasa Setup & Migrasi"
                    price="Rp 350rb"
                    period="sekali bayar"
                    icon="bi-tools"
                    description="Kami bantu install aplikasi di komputer/laptop Anda (via Remote/Zoom) dan migrasi data Excel lama ke sistem baru."
                    features={[
                        "Instalasi di Localhost/Laptop",
                        "Import Data Santri dari Excel",
                        "Training Penggunaan via Zoom/GMeet",
                        "Setup Logo & Kop Surat",
                        "Konsultasi Kendala Awal"
                    ]}
                    buttonText="Booking Jasa"
                    buttonColor="bg-blue-600 hover:bg-blue-700 text-white"
                    link={`${waBaseUrl}?text=Halo%20Admin,%20saya%20butuh%20bantuan%20Setup%20dan%20Migrasi%20Data.`}
                />

                {/* Paket 4: Custom & Branding */}
                <ServiceCard 
                    title="Custom & Branding"
                    price="Hubungi Kami"
                    icon="bi-palette-fill"
                    description="Ingin aplikasi terlihat lebih eksklusif dengan identitas Pesantren? Atau butuh penyesuaian format laporan khusus?"
                    features={[
                        "White Label (Hapus Credit Title)",
                        "Ubah Tema Warna & Logo Login",
                        "Custom Desain Rapor & Kartu",
                        "Penyesuaian Format Surat",
                        "Sesi Training/Pelatihan Khusus"
                    ]}
                    buttonText="Konsultasi Custom"
                    buttonColor="bg-gray-800 hover:bg-gray-900 text-white"
                    link={`${waBaseUrl}?text=Halo%20Admin,%20saya%20ingin%20konsultasi%20custom%20branding%20eSantri.`}
                />
            </div>

            {/* Donation / Support Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="font-bold text-yellow-800 text-lg flex items-center gap-2">
                        <i className="bi bi-heart-fill text-red-500"></i> Dukung Proyek Open Source
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1 max-w-xl">
                        Tidak butuh layanan berbayar tapi ingin mendukung pengembangan aplikasi ini agar tetap gratis? 
                        Donasi Anda sangat berarti untuk biaya server dan kopi programmer.
                    </p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                    <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
                        <i className="bi bi-cup-hot-fill"></i> Traktir Kopi
                    </a>
                    <a href="https://github.com/aiprojek/eSantri-Web" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-white border border-yellow-300 text-yellow-800 font-bold rounded-lg hover:bg-yellow-100 transition-colors flex items-center gap-2">
                        <i className="bi bi-star-fill"></i> Star GitHub
                    </a>
                </div>
            </div>
        </div>
    );
};
