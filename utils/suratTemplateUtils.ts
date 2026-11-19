import { PondokSettings, Santri } from '../types';

export const esc = (v: unknown): string =>
    String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export interface ProcessSuratContentParams {
    content: string;
    settings: Pick<
        PondokSettings,
        | 'namaPonpes'
        | 'alamat'
        | 'tenagaPengajar'
        | 'mudirAamId'
        | 'namaYayasan'
        | 'nspp'
        | 'npsn'
        | 'customInfoFields'
        | 'jenjang'
        | 'kelas'
        | 'rombel'
        | 'kamar'
        | 'gedungAsrama'
    >;
    formattedTanggalSurat: string;
    nomorSurat: string;
    santri: Santri | undefined;
}

export function processSuratContent({
    content: rawContent,
    settings,
    formattedTanggalSurat,
    nomorSurat,
    santri,
}: ProcessSuratContentParams): string {
    let content = rawContent || '';

    const namaPondok = settings.namaPonpes || 'Pondok Pesantren';
    const alamatPondok = settings.alamat || '';
    const mudir = settings.tenagaPengajar?.find((t) => t.id === settings.mudirAamId);
    const pimpinanPondok = mudir?.nama || 'Pimpinan Pondok Pesantren';

    // General / Institute Placeholders
    content = content.replace(/{TANGGAL}/g, () => esc(formattedTanggalSurat));
    content = content.replace(/{NOMOR_SURAT}/g, () => esc(nomorSurat || '...../...../.....'));
    content = content.replace(/{NAMA_PONDOK}/g, () => esc(namaPondok));
    content = content.replace(/{NAMA_YAYASAN}/g, () => esc(settings.namaYayasan || ''));
    content = content.replace(/{NSPP}/g, () => esc(settings.nspp || '-'));
    content = content.replace(/{NPSN}/g, () => esc(settings.npsn || '-'));
    content = content.replace(/{ALAMAT_PONDOK}/g, () => esc(alamatPondok));
    content = content.replace(/{PIMPINAN_PONDOK}/g, () => esc(pimpinanPondok));

    if (Array.isArray(settings.customInfoFields)) {
        settings.customInfoFields.forEach((field) => {
            if (field && field.label) {
                const cleanKey = field.label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                if (cleanKey) {
                    content = content.split(`{${cleanKey}}`).join(esc(field.value || '-'));
                }
            }
        });
    }

    if (santri) {
        // Data Pribadi
        content = content.replace(/{NAMA_SANTRI}/g, () => esc(santri.namaLengkap));
        content = content.replace(/{NIS}/g, () => esc(santri.nis));
        content = content.replace(/{NISN}/g, () => esc(santri.nisn || '-'));
        content = content.replace(/{NIK}/g, () => esc(santri.nik || '-'));
        content = content.replace(/{NO_KK}/g, () => esc(santri.nik || '-'));
        content = content.replace(/{TEMPAT_LAHIR}/g, () => esc(santri.tempatLahir || ''));
        content = content.replace(
            /{TANGGAL_LAHIR}/g,
            () =>
                esc(
                    santri.tanggalLahir
                        ? new Date(santri.tanggalLahir).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                          })
                        : ''
                )
        );
        content = content.replace(/{JENIS_KELAMIN}/g, () => esc(santri.jenisKelamin || '-'));

        // TTL support
        content = content.replace(
            /{TTL}/g,
            () =>
                esc(
                    `${santri.tempatLahir || '-'}, ${
                        santri.tanggalLahir
                            ? new Date(santri.tanggalLahir).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                              })
                            : '-'
                    }`
                )
        );

        // Data Pendidikan & Asrama
        content = content.replace(/{JENJANG}/g, () => esc(settings.jenjang.find((j) => j.id === santri.jenjangId)?.nama || ''));
        content = content.replace(/{KELAS}/g, () => esc(settings.kelas.find((k) => k.id === santri.kelasId)?.nama || ''));
        content = content.replace(/{ROMBEL}/g, () => esc(settings.rombel.find((r) => r.id === santri.rombelId)?.nama || ''));

        const kamarItem = settings.kamar?.find((k) => k.id === santri.kamarId);
        const asramaGedung = kamarItem ? settings.gedungAsrama?.find((g) => g.id === kamarItem.gedungId)?.nama : '-';
        content = content.replace(/{ASRAMA}/g, () => esc(asramaGedung || '-'));
        content = content.replace(/{KAMAR}/g, () => esc(kamarItem?.nama || '-'));
        content = content.replace(/{ANGKATAN}/g, () => esc(santri.tanggalMasuk ? String(new Date(santri.tanggalMasuk).getFullYear()) : '-'));

        // Data Orang Tua & Wali
        content = content.replace(/{NAMA_AYAH}/g, () => esc(santri.namaAyah || ''));
        content = content.replace(/{NAMA_IBU}/g, () => esc(santri.namaIbu || ''));
        content = content.replace(/{NAMA_WALI}/g, () => esc(santri.namaWali || ''));

        const waliSmart = santri.namaWali || santri.namaAyah || santri.namaIbu || '';
        content = content.replace(/{ORTU_WALI}/g, () => esc(waliSmart));
        content = content.replace(/{WALI}/g, () => esc(waliSmart));

        const santriPhone = santri.telepon || santri.teleponAyah || santri.teleponIbu || santri.teleponWali || '-';
        content = content.replace(/{NO_HP}/g, () => esc(santriPhone));

        // Alamat
        content = content.replace(/{ALAMAT}/g, () => esc(santri.alamat.detail));

        const fullAddress = [
            santri.alamat.detail,
            santri.alamat.desaKelurahan ? `Desa ${santri.alamat.desaKelurahan}` : '',
            santri.alamat.kecamatan ? `Kec. ${santri.alamat.kecamatan}` : '',
            santri.alamat.kabupatenKota ? `${santri.alamat.kabupatenKota}` : '',
            santri.alamat.provinsi,
        ]
            .filter(Boolean)
            .join(', ');
        content = content.replace(/{ALAMAT_LENGKAP}/g, () => esc(fullAddress));
    } else {
        const dots = '...................................';
        content = content.replace(/{NAMA_SANTRI}/g, dots);
        content = content.replace(/{NIS}/g, '................');
        content = content.replace(/{NISN}/g, '................');
        content = content.replace(/{NIK}/g, '................');
        content = content.replace(/{NO_KK}/g, '................');
        content = content.replace(/{TEMPAT_LAHIR}/g, dots);
        content = content.replace(/{TANGGAL_LAHIR}/g, dots);
        content = content.replace(/{TTL}/g, dots);
        content = content.replace(/{JENIS_KELAMIN}/g, dots);
        content = content.replace(/{JENJANG}/g, dots);
        content = content.replace(/{KELAS}/g, dots);
        content = content.replace(/{ROMBEL}/g, dots);
        content = content.replace(/{ASRAMA}/g, dots);
        content = content.replace(/{KAMAR}/g, dots);
        content = content.replace(/{ANGKATAN}/g, dots);
        content = content.replace(/{NAMA_AYAH}/g, dots);
        content = content.replace(/{NAMA_IBU}/g, dots);
        content = content.replace(/{NAMA_WALI}/g, dots);
        content = content.replace(/{ORTU_WALI}/g, dots);
        content = content.replace(/{WALI}/g, dots);
        content = content.replace(/{NO_HP}/g, dots);
        content = content.replace(/{ALAMAT}/g, dots);
        content = content.replace(/{ALAMAT_LENGKAP}/g, dots);
    }

    return content;
}
