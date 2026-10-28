import { db } from '../db';
import { DigitalAsset, PondokSettings, TenagaPengajar } from '../types';

export const normalizePersonName = (name?: string | null): string => {
    return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
};

/**
 * Mengambil seluruh daftar Tenaga Pendidik & Kependidikan/Pengurus yang masih aktif.
 * Memperbaiki bug lama yang mengecualikan ustadz/pengurus hanya karena memiliki riwayat jabatan masa lalu yang sudah selesai.
 */
export const getActiveTenagaPengajar = (settings?: PondokSettings | null): TenagaPengajar[] => {
    const list = settings?.tenagaPengajar || [];
    return list.filter((tp) => {
        // Jika ada status eksplisit Non-Aktif di masa depan, kecualikan; selain itu tetap aktif
        const anyTp = tp as any;
        if (anyTp.status && String(anyTp.status).toLowerCase() === 'non-aktif') return false;
        return true;
    });
};

/**
 * Menentukan jabatan aktif utama seorang pengajar/pengurus berdasarkan struktur pondok & riwayat jabatan.
 */
export const getTeacherPrimaryRoleLabel = (
    teacher: TenagaPengajar,
    settings?: PondokSettings | null
): string => {
    const roles: string[] = [];

    if (settings) {
        if (settings.mudirAamId !== undefined && Number(settings.mudirAamId) === Number(teacher.id)) {
            roles.push('Mudir Aam / Pimpinan Pondok');
        }
        const jenjangMudir = (settings.jenjang || []).filter((j) => Number(j.mudirId) === Number(teacher.id));
        if (jenjangMudir.length > 0) {
            roles.push(`Mudir Marhalah (${jenjangMudir.map((j) => j.kode || j.nama).join(', ')})`);
        }
        const rombelWali = (settings.rombel || []).filter((r) => Number(r.waliKelasId) === Number(teacher.id));
        if (rombelWali.length > 0) {
            roles.push(`Wali Kelas (${rombelWali.map((r) => r.nama).join(', ')})`);
        }
        const kamarMusyrif = (settings.kamar || []).filter((k) => Number(k.musyrifId) === Number(teacher.id));
        if (kamarMusyrif.length > 0) {
            roles.push(`Musyrif (${kamarMusyrif.map((k) => k.nama).join(', ')})`);
        }
    }

    if (roles.length > 0) {
        return roles.join(' • ');
    }

    const activeRiwayat = (teacher.riwayatJabatan || []).filter((r) => !r.tanggalSelesai);
    if (activeRiwayat.length > 0) {
        return activeRiwayat.map((r) => r.jabatan).filter(Boolean).join(', ');
    }

    if (teacher.jenisPegawai === 'kependidikan') {
        return teacher.kategoriStaf ? `Pengurus / ${teacher.kategoriStaf}` : 'Pengurus / Tenaga Kependidikan';
    }
    return 'Tenaga Pendidik';
};

/**
 * Mencari aset TTD milik seorang TenagaPengajar secara KETAT (strict):
 * 1. Prioritas mutlak: `guruId === teacher.id`
 * 2. Fallback kompatibilitas data lama: hanya jika aset belum punya `guruId` sama sekali,
 *    cocokkan `namaPemilik` persis (case-insensitive) DAN pastikan nama tersebut tidak bertabrakan dengan guru lain.
 * TIDAK PERNAH mengambil TTD milik orang lain atau menebak berdasarkan kata kunci jabatan!
 */
export const findStrictTeacherTtdAsset = (
    digitalAssets: DigitalAsset[] | undefined | null,
    teacher?: { id?: number | null; nama?: string | null } | null
): DigitalAsset | undefined => {
    if (!digitalAssets || digitalAssets.length === 0 || !teacher) return undefined;

    if (teacher.id !== undefined && teacher.id !== null) {
        const byGuruId = digitalAssets.find(
            (a) => a.type === 'ttd' && a.guruId !== undefined && a.guruId !== null && Number(a.guruId) === Number(teacher.id)
        );
        if (byGuruId) return byGuruId;
    }

    const targetName = normalizePersonName(teacher.nama);
    if (!targetName) return undefined;

    // Hanya cocokkan ke aset legacy yang belum diikat ke guruId milik orang lain
    return digitalAssets.find(
        (a) =>
            a.type === 'ttd' &&
            (a.guruId === undefined || a.guruId === null) &&
            normalizePersonName(a.namaPemilik) === targetName
    );
};

/**
 * Menyimpan atau memperbarui TTD milik seorang guru/pengurus ke tabel `db.digitalAssets`
 * sehingga otomatis terdaftar di Daftar Aset Digital dan terikat ke `guruId` Data Master.
 */
export const upsertTeacherTtdAsset = async (
    teacher: TenagaPengajar,
    base64Image: string,
    settings?: PondokSettings | null,
    customJabatan?: string
): Promise<DigitalAsset> => {
    const allAssets = await db.digitalAssets.toArray();
    const existing = findStrictTeacherTtdAsset(allAssets, teacher);

    const deterministicId = existing?.id || `ttd_guru_${teacher.id}`;
    const resolvedJabatan = (customJabatan || '').trim() || getTeacherPrimaryRoleLabel(teacher, settings);

    const nextAsset: DigitalAsset = {
        id: deterministicId,
        type: 'ttd',
        guruId: teacher.id,
        namaPemilik: teacher.nama.trim(),
        jabatan: resolvedJabatan,
        base64Image,
        lastModified: Date.now(),
    };

    await db.digitalAssets.put(nextAsset);

    // Bersihkan duplikat TTD lama yang merujuk pada guru yang sama agar Daftar Aset tetap bersih & tunggal
    const duplicates = allAssets.filter(
        (a) =>
            a.type === 'ttd' &&
            a.id !== deterministicId &&
            ((a.guruId !== undefined && Number(a.guruId) === Number(teacher.id)) ||
                ((a.guruId === undefined || a.guruId === null) &&
                    normalizePersonName(a.namaPemilik) === normalizePersonName(teacher.nama)))
    );
    for (const dup of duplicates) {
        await db.digitalAssets.delete(dup.id);
    }

    return nextAsset;
};

/**
 * Menghapus TTD milik guru/pengurus dari `db.digitalAssets`.
 */
export const removeTeacherTtdAsset = async (teacher: { id: number; nama?: string }): Promise<void> => {
    const allAssets = await db.digitalAssets.toArray();
    const matches = allAssets.filter(
        (a) =>
            a.type === 'ttd' &&
            ((a.guruId !== undefined && Number(a.guruId) === Number(teacher.id)) ||
                ((a.guruId === undefined || a.guruId === null) &&
                    Boolean(teacher.nama) &&
                    normalizePersonName(a.namaPemilik) === normalizePersonName(teacher.nama)))
    );
    for (const m of matches) {
        await db.digitalAssets.delete(m.id);
    }
};

/**
 * Menjaga sinkronisasi nama & jabatan pada `db.digitalAssets` saat biodata/jabatan guru diedit di Data Master.
 */
export const syncTeacherMetadataToDigitalAsset = async (
    teacher: TenagaPengajar,
    settings?: PondokSettings | null,
    previousName?: string
): Promise<void> => {
    const allAssets = await db.digitalAssets.toArray();
    const existing =
        findStrictTeacherTtdAsset(allAssets, teacher) ||
        (previousName
            ? allAssets.find(
                  (a) =>
                      a.type === 'ttd' &&
                      (a.guruId === undefined || a.guruId === null) &&
                      normalizePersonName(a.namaPemilik) === normalizePersonName(previousName)
              )
            : undefined);

    if (!existing) return;

    const updatedJabatan = getTeacherPrimaryRoleLabel(teacher, settings);
    if (
        existing.guruId !== teacher.id ||
        existing.namaPemilik !== teacher.nama.trim() ||
        existing.jabatan !== updatedJabatan
    ) {
        await db.digitalAssets.put({
            ...existing,
            guruId: teacher.id,
            namaPemilik: teacher.nama.trim(),
            jabatan: updatedJabatan,
            lastModified: Date.now(),
        });
    }
};

/**
 * Sinkronisasi dua arah untuk Aset Utama Lembaga (Logo Yayasan, Logo Ponpes, Stempel Resmi)
 * antara `PondokSettings` (Pengaturan Umum) dan `db.digitalAssets` (Daftar Aset Digital).
 */
export const upsertInstitutionDigitalAsset = async (
    systemRole: 'logo_ponpes' | 'logo_yayasan' | 'stempel_ponpes',
    base64Image: string | undefined | null,
    namaPonpes?: string,
    namaYayasan?: string
): Promise<void> => {
    const idMap: Record<typeof systemRole, string> = {
        logo_ponpes: 'aset_utama_logo_ponpes',
        logo_yayasan: 'aset_utama_logo_yayasan',
        stempel_ponpes: 'aset_utama_stempel_ponpes',
    };
    const targetId = idMap[systemRole];

    if (!base64Image || !base64Image.trim()) {
        const existing = await db.digitalAssets.get(targetId);
        if (existing) {
            await db.digitalAssets.delete(targetId);
        }
        return;
    }

    const metaMap: Record<typeof systemRole, { type: DigitalAsset['type']; namaPemilik: string; jabatan: string }> = {
        logo_ponpes: {
            type: 'lainnya',
            namaPemilik: namaPonpes || 'Pondok Pesantren',
            jabatan: 'Logo Resmi Pondok ($LOGO_PONPES)',
        },
        logo_yayasan: {
            type: 'lainnya',
            namaPemilik: namaYayasan || 'Yayasan',
            jabatan: 'Logo Resmi Yayasan ($LOGO_YAYASAN)',
        },
        stempel_ponpes: {
            type: 'stempel',
            namaPemilik: namaPonpes || 'Pondok Pesantren',
            jabatan: 'Stempel Resmi Utama ($STEMPEL_PONPES)',
        },
    };

    const meta = metaMap[systemRole];
    await db.digitalAssets.put({
        id: targetId,
        type: meta.type,
        systemRole,
        namaPemilik: meta.namaPemilik,
        jabatan: meta.jabatan,
        base64Image,
        lastModified: Date.now(),
    });
};

/**
 * Rekonsiliasi otomatis non-destruktif untuk menautkan TTD lama yang belum memiliki `guruId`
 * ke Data Master serta memperbaiki label jabatan keliru (misal Mudir yang dulu terisi default "Pengajar / Wali Kelas"),
 * sekaligus mendaftarkan Logo/Stempel dari Pengaturan Umum ke Daftar Aset Digital jika belum terdaftar.
 */
export const reconcileDigitalAssetsWithSettings = async (settings?: PondokSettings | null): Promise<number> => {
    if (!settings) return 0;
    const allAssets = await db.digitalAssets.toArray();
    const teachers = settings.tenagaPengajar || [];
    let updatedCount = 0;

    // 1. Tautkan TTD ke guruId & perbaiki label jabatan sesuai Data Master
    for (const asset of allAssets) {
        if (asset.type !== 'ttd') continue;

        let matchedTeacher: TenagaPengajar | undefined;
        if (asset.guruId !== undefined && asset.guruId !== null) {
            matchedTeacher = teachers.find((t) => Number(t.id) === Number(asset.guruId));
        } else {
            const normOwner = normalizePersonName(asset.namaPemilik);
            const candidates = teachers.filter((t) => normalizePersonName(t.nama) === normOwner);
            if (candidates.length === 1) {
                matchedTeacher = candidates[0];
            }
        }

        if (matchedTeacher) {
            const accurateRole = getTeacherPrimaryRoleLabel(matchedTeacher, settings);
            const hasStaleDefaultJabatan =
                !asset.jabatan ||
                asset.jabatan === 'Pengajar / Wali Kelas' ||
                asset.guruId === undefined ||
                asset.guruId === null;

            const nextJabatan = hasStaleDefaultJabatan ? accurateRole : asset.jabatan;
            if (
                asset.guruId !== matchedTeacher.id ||
                asset.namaPemilik !== matchedTeacher.nama.trim() ||
                asset.jabatan !== nextJabatan
            ) {
                await db.digitalAssets.put({
                    ...asset,
                    guruId: matchedTeacher.id,
                    namaPemilik: matchedTeacher.nama.trim(),
                    jabatan: nextJabatan,
                    lastModified: Date.now(),
                });
                updatedCount++;
            }
        }
    }

    // 2. Pastikan Logo & Stempel yang sudah ada di Pengaturan Umum juga muncul di Daftar Aset Digital
    const syncPairs: Array<{
        role: 'logo_ponpes' | 'logo_yayasan' | 'stempel_ponpes';
        url?: string;
        id: string;
    }> = [
        { role: 'logo_ponpes', url: settings.logoPonpesUrl, id: 'aset_utama_logo_ponpes' },
        { role: 'logo_yayasan', url: settings.logoYayasanUrl, id: 'aset_utama_logo_yayasan' },
        { role: 'stempel_ponpes', url: settings.stempelPonpesUrl, id: 'aset_utama_stempel_ponpes' },
    ];

    for (const pair of syncPairs) {
        if (pair.url && pair.url.trim()) {
            const existing = allAssets.find((a) => a.id === pair.id);
            if (!existing || existing.base64Image !== pair.url) {
                await upsertInstitutionDigitalAsset(pair.role, pair.url, settings.namaPonpes, settings.namaYayasan);
                updatedCount++;
            }
        }
    }

    return updatedCount;
};
