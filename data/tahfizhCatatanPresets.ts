export interface TahfizhCatatanPreset {
    id: string;
    label: string;
    kategori: 'Mumtaz' | 'Motivasi' | 'Tajwid & Fashahah' | 'Murajaah' | 'Target Khatam' | 'Adab & Akhlak';
    text: string;
}

export const TAHFIZH_CATATAN_PRESETS: TahfizhCatatanPreset[] = [
    {
        id: 'mumtaz-1',
        label: 'Mumtaz & Mutqin',
        kategori: 'Mumtaz',
        text: "Alhamdulillah capaian hafalan sangat memuaskan, lancar dan mutqin. Pertahankan ketekunan serta tingkatkan intensitas tikrar harian."
    },
    {
        id: 'mumtaz-2',
        label: 'Sangat Baik & Istiqomah',
        kategori: 'Mumtaz',
        text: "Alhamdulillah ananda menunjukkan kesungguhan dan adab yang sangat baik dalam halaqah. Terus jaga hafalan dengan muraja'ah rutin."
    },
    {
        id: 'tajwid-1',
        label: 'Penguatan Tajwid & Makhraj',
        kategori: 'Tajwid & Fashahah',
        text: "Hafalan ananda baik dan lancar. Mohon lebih memperhatikan ketepatan makharijul huruf, mad, dan ghunnah saat menyetorkan ayat."
    },
    {
        id: 'tajwid-2',
        label: 'Fashahah & Waqaf Ibtida',
        kategori: 'Tajwid & Fashahah',
        text: "Kelancaran hafalan sudah baik. Perlu penguatan pada waqaf dan ibtida' serta irama tilawah agar bacaan semakin tartil."
    },
    {
        id: 'murajaah-1',
        label: 'Tingkatkan Muraja\'ah Mandiri',
        kategori: 'Murajaah',
        text: "Perkembangan hafalan baik. Disarankan lebih disiplin dalam alokasi waktu muraja'ah mandiri di asrama/rumah agar hafalan semakin kokoh."
    },
    {
        id: 'murajaah-2',
        label: 'Sinergi Muraja\'ah Rumah',
        kategori: 'Murajaah',
        text: "Ananda memiliki potensi tahfizh yang kuat. Mohon pendampingan orang tua untuk menyimak muraja'ah secara rutin setiap ba'da Maghrib/Subuh."
    },
    {
        id: 'khatam-1',
        label: 'Menuju Target Khatam',
        kategori: 'Target Khatam',
        text: "Alhamdulillah target juz semester ini tercapai dengan baik. Semoga Allah mudahkan langkah ananda menyelesaikan hafalan 30 Juz Al-Qur'an."
    },
    {
        id: 'motivasi-1',
        label: 'Motivasi & Semangat Halaqah',
        kategori: 'Motivasi',
        text: "Ananda terus berproses dengan baik. Tingkatkan fokus dan konsistensi kehadiran di halaqah agar capaian target semakin optimal."
    },
    {
        id: 'adab-1',
        label: 'Adab Mulia & Teladan',
        kategori: 'Adab & Akhlak',
        text: "Alhamdulillah ananda beradab luhur terhadap Al-Qur'an dan asatidz, serta menjadi teladan yang baik bagi santri lainnya di halaqah."
    }
];
