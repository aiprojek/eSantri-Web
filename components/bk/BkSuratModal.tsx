import React, { useState } from 'react';
import { BkSession, Santri, PondokSettings } from '../../types';
import { PrintHeader } from '../common/PrintHeader';
import { useAppContext } from '../../AppContext';
import { BkWaModal } from './BkWaModal';

interface BkSuratModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: BkSession;
    santri: Santri;
    settings: PondokSettings;
}

type JenisSurat = 'panggilan_santri' | 'undangan_wali' | 'berita_acara';

export const BkSuratModal: React.FC<BkSuratModalProps> = ({
    isOpen,
    onClose,
    session,
    santri,
    settings,
}) => {
    const { currentUser, showToast } = useAppContext();
    const [jenisSurat, setJenisSurat] = useState<JenisSurat>('panggilan_santri');
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    
    // Surat customization state
    const [nomorSurat, setNomorSurat] = useState(`BK/${new Date().getFullYear()}/${String(session.id).slice(-4)}`);
    const [waktuPertemuan, setWaktuPertemuan] = useState('09:00 WIB');
    const [tanggalPertemuan, setTanggalPertemuan] = useState(session.tanggalBerikutnya || new Date().toISOString().split('T')[0]);
    const [tempatPertemuan, setTempatPertemuan] = useState('Ruang Bimbingan & Konseling (BK)');
    const [catatanTambahan, setCatatanTambahan] = useState('');

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    const formatDateIndo = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex justify-center items-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden my-auto border border-emerald-100">
                {/* Header (No print) */}
                <div className="p-4 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white flex justify-between items-center no-print">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            <i className="bi bi-file-earmark-text"></i>
                        </div>
                        <div>
                            <h3 className="text-base font-bold">Generator Surat Administrasi BK</h3>
                            <p className="text-xs text-emerald-100">Santri: {santri.namaLengkap} (NIS: {santri.nis})</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsWaModalOpen(true)}
                            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                            title="Kirim Pesan / Undangan WhatsApp ke Wali"
                        >
                            <i className="bi bi-whatsapp"></i>
                            <span className="hidden sm:inline">Kirim WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer border border-white/20"
                        >
                            <i className="bi bi-printer"></i> Cetak / Simpan PDF
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                            title="Tutup"
                        >
                            <i className="bi bi-x-lg text-sm"></i>
                        </button>
                    </div>
                </div>

                {/* Toolbar Selector (No print) */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 no-print space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setJenisSurat('panggilan_santri')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${jenisSurat === 'panggilan_santri' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border text-gray-700 hover:bg-gray-100'}`}
                        >
                            <i className="bi bi-envelope-paper"></i> 1. Surat Panggilan Santri
                        </button>
                        <button
                            type="button"
                            onClick={() => setJenisSurat('undangan_wali')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${jenisSurat === 'undangan_wali' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border text-gray-700 hover:bg-gray-100'}`}
                        >
                            <i className="bi bi-people"></i> 2. Undangan Wali Santri
                        </button>
                        <button
                            type="button"
                            onClick={() => setJenisSurat('berita_acara')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${jenisSurat === 'berita_acara' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border text-gray-700 hover:bg-gray-100'}`}
                        >
                            <i className="bi bi-journal-check"></i> 3. Berita Acara & Komitmen
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nomor Surat</label>
                            <input
                                type="text"
                                value={nomorSurat}
                                onChange={e => setNomorSurat(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tanggal Rencana</label>
                            <input
                                type="date"
                                value={tanggalPertemuan}
                                onChange={e => setTanggalPertemuan(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Waktu / Jam</label>
                            <input
                                type="text"
                                value={waktuPertemuan}
                                onChange={e => setWaktuPertemuan(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                placeholder="Contoh: 09:30 WIB"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tempat</label>
                            <input
                                type="text"
                                value={tempatPertemuan}
                                onChange={e => setTempatPertemuan(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* Document Printable Paper Area */}
                <div className="p-6 sm:p-10 overflow-y-auto flex-grow bg-slate-100 flex justify-center">
                    <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 shadow-lg rounded-sm text-black font-serif text-sm leading-relaxed border border-gray-200 print:border-0 print:shadow-none print:p-0 print:m-0 print:w-full">
                        
                        {/* 1. SURAT PANGGILAN SANTRI */}
                        {jenisSurat === 'panggilan_santri' && (
                            <div>
                                <PrintHeader settings={settings} title="SURAT PANGGILAN KONSELING SANTRI" compact />
                                
                                <div className="mt-4 flex justify-between text-xs font-sans">
                                    <div>
                                        <p>Nomor : {nomorSurat}</p>
                                        <p>Lamp. : -</p>
                                        <p>Hal&nbsp;&nbsp;&nbsp;: <strong>Bimbingan & Konseling Santri</strong></p>
                                    </div>
                                    <div className="text-right">
                                        <p>{settings.alamat ? settings.alamat.split(',').pop()?.trim() || 'Tempat' : 'Tempat'}, {formatDateIndo(new Date().toISOString().split('T')[0])}</p>
                                        <p className="text-gray-600">Sifat: <em>Pribadi / Tertutup</em></p>
                                    </div>
                                </div>

                                <div className="mt-6 text-sm">
                                    <p>Kepada Yth.</p>
                                    <p className="font-bold">Ananda {santri.namaLengkap} (NIS: {santri.nis})</p>
                                    <p>Santri Pondok Pesantren {settings.namaPonpes}</p>
                                    <p>di Tempat</p>
                                </div>

                                <div className="mt-4 text-justify space-y-3 text-sm">
                                    <p><em>Assalamu'alaikum Warahmatullahi Wabarakatuh,</em></p>
                                    <p>
                                        Semoga ananda senantiasa berada dalam lindungan dan rahmat Allah SWT, serta diberikan kemudahan dalam menuntut ilmu dan beribadah di pondok pesantren.
                                    </p>
                                    <p>
                                        Sehubungan dengan program pendampingan, pembinaan karakter, dan konseling santri, maka dengan ini kami mengharapkan kehadiran ananda untuk hadir pada:
                                    </p>
                                    <div className="bg-gray-50 border p-4 rounded-lg my-2 font-sans text-xs space-y-1">
                                        <p><strong>Hari / Tanggal :</strong> {formatDateIndo(tanggalPertemuan)}</p>
                                        <p><strong>Waktu :</strong> {waktuPertemuan}</p>
                                        <p><strong>Tempat :</strong> {tempatPertemuan}</p>
                                        <p><strong>Keperluan :</strong> Bimbingan & Konseling Santri (Kategori: {session.kategori})</p>
                                        <p><strong>Konselor :</strong> {session.konselor || currentUser?.fullName || 'Guru BK'}</p>
                                    </div>
                                    <p>
                                        Pertemuan ini bersifat suportif, membimbing, dan rahasia demi kebaikan serta kenyamanan belajar ananda di pondok pesantren. Harap hadir tepat waktu sesuai dengan jadwal yang telah ditentukan.
                                    </p>
                                    <p>
                                        Demikian surat panggilan ini disampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.
                                    </p>
                                    <p><em>Wassalamu'alaikum Warahmatullahi Wabarakatuh.</em></p>
                                </div>

                                <div className="mt-10 flex justify-between text-center font-sans text-xs">
                                    <div>
                                        <p>Mengetahui,</p>
                                        <p className="font-bold">Wali Kelas / Musyrif Asrama</p>
                                        <div className="h-16"></div>
                                        <p className="border-t border-black px-6 pt-1">( ........................................ )</p>
                                    </div>
                                    <div>
                                        <p>Guru / Pembina Konseling,</p>
                                        <p className="font-bold">{settings.namaPonpes}</p>
                                        <div className="h-16"></div>
                                        <p className="border-t border-black px-6 pt-1 font-bold">{session.konselor || currentUser?.fullName || 'Petugas BK'}</p>
                                    </div>
                                </div>

                                {/* Standard Document Footer like Poskestren */}
                                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic font-sans">
                                    Dokumen resmi {settings.namaPonpes} - dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id
                                </div>
                            </div>
                        )}

                        {/* 2. UNDANGAN WALI SANTRI */}
                        {jenisSurat === 'undangan_wali' && (
                            <div>
                                <PrintHeader settings={settings} title="SURAT UNDANGAN WALI SANTRI" compact />
                                
                                <div className="mt-4 flex justify-between text-xs font-sans">
                                    <div>
                                        <p>Nomor : {nomorSurat}</p>
                                        <p>Lamp. : -</p>
                                        <p>Hal&nbsp;&nbsp;&nbsp;: <strong>Undangan Musyawarah Pembinaan Santri</strong></p>
                                    </div>
                                    <div className="text-right">
                                        <p>{settings.alamat ? settings.alamat.split(',').pop()?.trim() || 'Tempat' : 'Tempat'}, {formatDateIndo(new Date().toISOString().split('T')[0])}</p>
                                        <p className="text-gray-600">Sifat: <em>Penting / Terbatas</em></p>
                                    </div>
                                </div>

                                <div className="mt-6 text-sm">
                                    <p>Kepada Yth.</p>
                                    <p className="font-bold">Bapak / Ibu Wali dari Ananda {santri.namaLengkap}</p>
                                    <p>NIS: {santri.nis} | Kontak: {santri.teleponWali || santri.telepon || '-'}</p>
                                    <p>di Tempat</p>
                                </div>

                                <div className="mt-4 text-justify space-y-3 text-sm">
                                    <p><em>Assalamu'alaikum Warahmatullahi Wabarakatuh,</em></p>
                                    <p>
                                        Segala puji bagi Allah SWT yang senantiasa melimpahkan taufik dan hidayah-Nya kepada kita semua. Shalawat serta salam semoga tercurahkan kepada baginda Rasulullah SAW.
                                    </p>
                                    <p>
                                        Dalam rangka koordinasi bersama serta meningkatkan efektivitas pembinaan kepribadian, akhlak, dan kelancaran proses pendidikan ananda di pondok pesantren, kami mengundang Bapak/Ibu Wali Santri untuk hadir bersilaturahmi pada:
                                    </p>
                                    <div className="bg-gray-50 border p-4 rounded-lg my-2 font-sans text-xs space-y-1">
                                        <p><strong>Hari / Tanggal :</strong> {formatDateIndo(tanggalPertemuan)}</p>
                                        <p><strong>Waktu :</strong> {waktuPertemuan}</p>
                                        <p><strong>Tempat :</strong> {tempatPertemuan}</p>
                                        <p><strong>Agenda :</strong> Konseling & Musyawarah Perkembangan Santri (Bidang: {session.kategori})</p>
                                        <p><strong>Bertemu Dengan :</strong> {session.konselor || currentUser?.fullName || 'Tim Bimbingan Konseling'} & Pengasuhan</p>
                                    </div>
                                    <p>
                                        Mengingat pentingnya musyawarah ini bagi masa depan dan kenyamanan belajar ananda, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktu yang ditentukan.
                                    </p>
                                    <p>
                                        Demikian undangan ini kami sampaikan. Atas kerja sama dan perhatian Bapak/Ibu Wali Santri, kami ucapkan jazakumullahu khairan katsiran.
                                    </p>
                                    <p><em>Wassalamu'alaikum Warahmatullahi Wabarakatuh.</em></p>
                                </div>

                                <div className="mt-10 flex justify-between text-center font-sans text-xs">
                                    <div>
                                        <p>Mengetahui,</p>
                                        <p className="font-bold">Mudir / Kepala Pengasuhan</p>
                                        <div className="h-16"></div>
                                        <p className="border-t border-black px-6 pt-1 font-bold">{settings.tenagaPengajar?.find(t => t.id === settings.mudirAamId)?.nama || 'Mudir / Pimpinan Pondok'}</p>
                                    </div>
                                    <div>
                                        <p>Koordinator Bimbingan Konseling,</p>
                                        <div className="h-16"></div>
                                        <p className="border-t border-black px-6 pt-1 font-bold">{session.konselor || currentUser?.fullName || 'Konselor Pondok'}</p>
                                    </div>
                                </div>

                                {/* Standard Document Footer like Poskestren */}
                                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic font-sans">
                                    Dokumen resmi {settings.namaPonpes} - dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id
                                </div>
                            </div>
                        )}

                        {/* 3. BERITA ACARA & KOMITMEN SANTRI */}
                        {jenisSurat === 'berita_acara' && (
                            <div>
                                <PrintHeader settings={settings} title="BERITA ACARA & LEMBAR KOMITMEN SANTRI" compact />

                                <div className="mt-3 text-xs text-center font-sans">
                                    <p>Nomor Dokumen: {nomorSurat}</p>
                                    <p className="text-gray-600">Sifat: Dokumen Rahasia Layanan Bimbingan & Konseling</p>
                                </div>

                                <div className="mt-4 text-xs font-sans space-y-1 bg-gray-50 border p-3 rounded">
                                    <p className="font-bold text-gray-800 uppercase tracking-wide">Identitas Santri:</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <p><strong>Nama Lengkap:</strong> {santri.namaLengkap}</p>
                                        <p><strong>NIS:</strong> {santri.nis}</p>
                                        <p><strong>Jenis Kelamin:</strong> {santri.jenisKelamin}</p>
                                        <p><strong>Tanggal Sesi:</strong> {formatDateIndo(session.tanggal)}</p>
                                        <p><strong>Kategori Masalah:</strong> {session.kategori}</p>
                                        <p><strong>Konselor:</strong> {session.konselor}</p>
                                    </div>
                                </div>

                                <div className="mt-4 text-xs space-y-3 font-sans">
                                    <div>
                                        <p className="font-bold text-gray-800 uppercase mb-1">1. Uraian Masalah / Latar Belakang:</p>
                                        <div className="border border-gray-300 p-2.5 rounded bg-white min-h-[50px] whitespace-pre-wrap">
                                            {session.keluhan || '-'}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="font-bold text-gray-800 uppercase mb-1">2. Arahan, Bimbingan & Solusi dari Konselor:</p>
                                        <div className="border border-gray-300 p-2.5 rounded bg-white min-h-[50px] whitespace-pre-wrap">
                                            {session.penanganan || '-'}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="font-bold text-gray-800 uppercase mb-1">3. Pernyataan & Komitmen Perbaikan Diri Santri:</p>
                                        <div className="border border-gray-300 p-2.5 rounded bg-white min-h-[60px] whitespace-pre-wrap italic font-serif text-sm">
                                            {session.komitmenSantri || 'Saya menyatakan bersedia memperbaiki diri, mematuhi tata tertib pondok pesantren, dan menjalankan arahan pembina dengan penuh kesungguhan dan tanggung jawab.'}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[11px] text-gray-600 bg-gray-50 p-2 rounded border">
                                        <span><strong>Jadwal Kontrol Berikutnya:</strong> {session.tanggalBerikutnya ? formatDateIndo(session.tanggalBerikutnya) : 'Sesuai pemantauan'}</span>
                                        <span><strong>Status Kasus:</strong> {session.status}</span>
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-3 gap-2 text-center font-sans text-xs">
                                    <div>
                                        <p>Santri yang Bersangkutan,</p>
                                        <div className="h-14"></div>
                                        <p className="border-t border-black px-2 pt-1 font-bold">{santri.namaLengkap}</p>
                                    </div>
                                    <div>
                                        <p>Saksi / Wali Santri,</p>
                                        <div className="h-14"></div>
                                        <p className="border-t border-black px-2 pt-1">( .................................... )</p>
                                    </div>
                                    <div>
                                        <p>Konselor Pembimbing,</p>
                                        <div className="h-14"></div>
                                        <p className="border-t border-black px-2 pt-1 font-bold">{session.konselor || currentUser?.fullName || 'Petugas BK'}</p>
                                    </div>
                                </div>

                                {/* Standard Document Footer like Poskestren */}
                                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-[8pt] text-gray-400 italic font-sans">
                                    Dokumen resmi {settings.namaPonpes} - dibuat dengan Esantri Web by AI Projek | aiprojek01.my.id
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer buttons */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center no-print">
                    <p className="text-xs text-gray-500">
                        <i className="bi bi-info-circle mr-1 text-emerald-600"></i>
                        Dokumen dicetak rapi sesuai standar kop pondok yang terdaftar di Pengaturan.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded-xl text-gray-700 bg-white hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition"
                        >
                            <i className="bi bi-printer"></i> Cetak Surat
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal: Kirim WhatsApp dengan template */}
            {isWaModalOpen && (
                <BkWaModal
                    isOpen={isWaModalOpen}
                    onClose={() => setIsWaModalOpen(false)}
                    session={session}
                    santri={santri}
                    settings={settings}
                    onShowToast={showToast}
                />
            )}
        </div>
    );
};
