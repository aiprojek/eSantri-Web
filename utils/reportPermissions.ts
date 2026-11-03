import { AccessLevel, ReportType, User, UserPermissions } from '../types';

const LEVEL_RANK: Record<AccessLevel, number> = {
    none: 0,
    read: 1,
    write: 2,
};

export const hasModulePermission = (
    user: User | null | undefined,
    moduleKey: keyof Omit<UserPermissions, 'syncAdmin'>,
    minLevel: 'read' | 'write' = 'read'
): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.isDefaultAdmin) return true;
    const raw = (user.permissions?.[moduleKey] as AccessLevel | undefined) || 'none';
    return LEVEL_RANK[raw] >= LEVEL_RANK[minLevel];
};

/**
 * Validates whether a user is allowed to view/generate a specific ReportType
 * based on both `laporan` access AND underlying source module permissions.
 * Prevents cross-module privilege escalation via the Reports center.
 */
export const canAccessReport = (
    user: User | null | undefined,
    reportType: ReportType
): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.isDefaultAdmin) return true;
    if (!hasModulePermission(user, 'laporan', 'read')) return false;

    const can = (key: keyof Omit<UserPermissions, 'syncAdmin'>) =>
        hasModulePermission(user, key, 'read');

    switch (reportType) {
        // Keuangan & Buku Kas
        case ReportType.FinanceSummary:
            return can('keuangan') || can('bukukas');
        case ReportType.RekeningKoranSantri:
        case ReportType.MatriksTunggakanSPP:
            return can('keuangan');
        case ReportType.LaporanArusKas:
            return can('bukukas');

        // Bimbingan Konseling (BK)
        case ReportType.RekapKonseling:
            return can('bk');

        // Poskestren / Kesehatan
        case ReportType.RekapKesehatan:
            return can('kesehatan');

        // Penerimaan Santri Baru (PSB)
        case ReportType.EfektivitasPSB:
            return can('psb');

        // Tahfizh Al-Qur'an
        case ReportType.TahfizhProgress:
            return can('tahfizh');

        // Keasramaan & Perizinan
        case ReportType.LaporanAsrama:
        case ReportType.LembarKedatangan:
            return can('keasramaan');
        case ReportType.FormulirIzin:
            return can('keasramaan') || can('absensi');

        // Presensi / Absensi
        case ReportType.LembarAbsensi:
            return can('absensi');

        // Akademik, Rapor & SDM Pengajar
        case ReportType.LembarNilai:
        case ReportType.LembarRapor:
        case ReportType.RaporLengkap:
            return can('akademik');
        case ReportType.JurnalMengajar:
            return can('akademik') || can('absensi');
        case ReportType.LaporanMapel:
        case ReportType.KinerjaPengajar:
        case ReportType.LaporanKontakStaf:
            return can('akademik') || can('datamaster');
        case ReportType.DaftarWaliKelas:
            return can('akademik') || can('datamaster') || can('santri');

        // Pembinaan & Multi-Module Analitik
        case ReportType.LembarPembinaan:
            return can('santri') || can('bk') || can('keasramaan');
        case ReportType.KelasAsramaBermasalah:
            return can('santri') && (can('absensi') || can('keasramaan'));
        case ReportType.OperasionalHarian:
            return can('santri') || can('absensi') || can('kesehatan');

        // Data Santri & Eksekutif Umum (internal sensitive sub-sections are gated separately)
        case ReportType.DashboardSummary:
        case ReportType.EarlyWarningSantri:
        case ReportType.Biodata:
        case ReportType.BukuIndukSantri:
        case ReportType.DaftarRombel:
        case ReportType.KartuSantri:
        case ReportType.LabelSantri:
        case ReportType.LaporanEMIS:
        case ReportType.LaporanKontak:
        case ReportType.LaporanMutasi:
        case ReportType.CohortSantri:
        case ReportType.KepatuhanAdministrasi:
            return can('santri');

        default:
            return can('santri');
    }
};
