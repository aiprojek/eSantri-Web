import { Pendaftar, PondokSettings, PsbNilaiUjian } from '../../../types';

export const cleanPhoneNumber = (phone?: string): string => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
    }
    return cleaned;
};

export const getPsbRegistrationNumber = (pendaftar: Pendaftar, jenjangName?: string): string => {
    if (pendaftar.nomorRegistrasi && pendaftar.nomorRegistrasi.trim()) {
        return pendaftar.nomorRegistrasi.trim();
    }
    const year = pendaftar.tanggalDaftar ? new Date(pendaftar.tanggalDaftar).getFullYear() : new Date().getFullYear();
    const cleanJenjang = (jenjangName || 'PSB')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4);
    const num = String(Math.abs(Math.floor(pendaftar.id || 1))).slice(-4).padStart(4, '0');
    return `PSB-${year}-${cleanJenjang || 'REG'}-${num}`;
};

export const calculatePsbAverageScore = (nilai?: PsbNilaiUjian): number => {
    if (!nilai) return 0;
    const scores: number[] = [];
    if (typeof nilai.bacaQuran === 'number' && !isNaN(nilai.bacaQuran)) scores.push(nilai.bacaQuran);
    if (typeof nilai.tahfizh === 'number' && !isNaN(nilai.tahfizh)) scores.push(nilai.tahfizh);
    if (typeof nilai.akademik === 'number' && !isNaN(nilai.akademik)) scores.push(nilai.akademik);
    if (typeof nilai.wawancara === 'number' && !isNaN(nilai.wawancara)) scores.push(nilai.wawancara);
    
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / scores.length) * 10) / 10;
};

export const openWhatsappChat = (phone?: string, text?: string): boolean => {
    const formattedPhone = cleanPhoneNumber(phone);
    if (!formattedPhone) {
        return false;
    }
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text || '')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
};

export const generatePsbExamScheduleMessage = (
    pendaftar: Pendaftar,
    settings: PondokSettings,
    options?: {
        tanggalUjian?: string;
        ruangUjian?: string;
        catatan?: string;
    }
): string => {
    const jenjang = settings.jenjang.find(j => j.id === pendaftar.jenjangId)?.nama || '-';
    const noReg = getPsbRegistrationNumber(pendaftar, jenjang);
    const dateStr = options?.tanggalUjian 
        ? new Date(options.tanggalUjian).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'Sesuai jadwal yang tertera di kartu ujian';
    const roomStr = options?.ruangUjian || 'Posko Panitia PSB';

    return `*PEMBERITAHUAN JADWAL UJIAN SELEKSI MASUK*
*${settings.namaPonpes?.toUpperCase()}*
Tahun Ajaran ${settings.psbConfig?.tahunAjaranAktif || new Date().getFullYear()}

Assalamu'alaikum Warahmatullahi Wabarakatuh,
Yth. Bapak/Ibu Wali dari Calon Santri:
*${pendaftar.namaLengkap}*

Diberitahukan bahwa berkas pendaftaran calon santri telah terverifikasi. Berikut adalah rincian pelaksanaan Ujian Seleksi Masuk:

📋 *Data Peserta:*
• No. Registrasi: *${noReg}*
• Nama: *${pendaftar.namaLengkap}*
• Jenjang Tujuan: *${jenjang}*
• Jalur: *${pendaftar.jalurPendaftaran || 'Reguler'}*

🗓️ *Jadwal & Lokasi Ujian:*
• Hari/Tanggal: *${dateStr}*
• Lokasi/Ruang: *${roomStr}*
• Materi Ujian:
  1. Tes Baca Al-Qur'an (Tajwid & Makhraj)
  2. Tes Hafalan Al-Qur'an (Tahfizh)
  3. Tes Pengetahuan Diniyah & Akademik
  4. Wawancara Calon Santri & Wali

📁 *Kelengkapan Berkas Fisik yang Wajib Dibawa:*
1. Fotokopi Kartu Keluarga (KK)
2. Fotokopi Akta Kelahiran
3. Fotokopi Ijazah / Surat Keterangan Lulus (SKL)
4. Surat Keterangan Sehat Dokter
5. Pas Foto 3x4 (3 Lembar)
6. Membawa Kartu Tanda Peserta Ujian

${options?.catatan ? `_Catatan Tambahan:_ ${options.catatan}\n\n` : ''}Mohon hadir 15 menit sebelum pelaksanaan dengan berpakaian rapi, sopan, dan menutup aurat.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
_Panitia Penerimaan Santri Baru (PSB)_
*${settings.namaPonpes}*
${settings.telepon ? `📞 Kontak: ${settings.telepon}` : ''}`;
};

export const generatePsbAcceptanceMessage = (
    pendaftar: Pendaftar,
    settings: PondokSettings,
    options?: {
        nominalDaftarUlang?: number;
        batasWaktu?: string;
        rekeningPembayaran?: string;
        catatan?: string;
    }
): string => {
    const jenjang = settings.jenjang.find(j => j.id === pendaftar.jenjangId)?.nama || '-';
    const noReg = getPsbRegistrationNumber(pendaftar, jenjang);
    const nominalStr = options?.nominalDaftarUlang 
        ? `Rp ${options.nominalDaftarUlang.toLocaleString('id-ID')}`
        : '-';
    const batasStr = options?.batasWaktu
        ? new Date(options.batasWaktu).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '14 Hari Kerja setelah pengumuman';

    return `*PENGUMUMAN HASIL SELEKSI PENERIMAAN SANTRI BARU*
*${settings.namaPonpes?.toUpperCase()}*
Tahun Ajaran ${settings.psbConfig?.tahunAjaranAktif || new Date().getFullYear()}

Assalamu'alaikum Warahmatullahi Wabarakatuh,
Yth. Bapak/Ibu Wali dari:
*${pendaftar.namaLengkap}*

Alhamdulillah, bersyukur kepada Allah SWT, kami menginformasikan bahwa ananda dinyatakan:

🎉 *LULUS SELEKSI / DITERIMA* 🎉
Sebagai Santri Baru di *${settings.namaPonpes}*
• No. Registrasi: *${noReg}*
• Jenjang: *${jenjang}*
• Jalur: *${pendaftar.jalurPendaftaran || 'Reguler'}*

📝 *Informasi Daftar Ulang & Administrasi:*
• Biaya Daftar Ulang / Pangkal: *${nominalStr}*
• Batas Waktu Daftar Ulang: *${batasStr}*
${options?.rekeningPembayaran ? `• Rekening Tujuan: *${options.rekeningPembayaran}*\n` : ''}
${options?.catatan ? `_Catatan Khusus:_ ${options.catatan}\n\n` : ''}Silakan mengonfirmasi pembayaran dan berkas administrasi daftar ulang ke panitia PSB. Kami menyambut kehadiran ananda dengan hangat di keluarga besar pesantren.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.
_Panitia Penerimaan Santri Baru (PSB)_
*${settings.namaPonpes}*
${settings.telepon ? `📞 Kontak: ${settings.telepon}` : ''}`;
};
