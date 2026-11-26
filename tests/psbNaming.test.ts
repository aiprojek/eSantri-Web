import { describe, expect, it } from 'vitest';
import {
    detectPsbDocKind,
    makeFileName,
    makeInitials,
    makeRegNumber,
    normalizeDocExtension,
} from '../utils/psbNaming';

describe('psbNaming utilities', () => {
    it('extracts initials cleanly without leaking full names', () => {
        expect(makeInitials('Ahmad Fauzi Ramadhan')).toBe('AFR');
        expect(makeInitials('Muhamad Ali bin Hasan')).toBe('MAB');
        expect(makeInitials('Siti')).toBe('S');
        expect(makeInitials('Café Àli')).toBe('CA');
        expect(makeInitials('')).toBe('X');
        expect(makeInitials('   ---   ')).toBe('X');
        expect(makeInitials('[TERENKRIPSI E2EE]')).toBe('X');
    });

    it('generates consistent registration numbers and zero collisions across 10,000 calls', () => {
        const seen = new Set<string>();
        const pattern = /^PSB-2026-REG-[0-9A-HJKMNP-TV-Z]{6}$/;

        for (let i = 0; i < 10_000; i++) {
            const reg = makeRegNumber(2026);
            expect(reg).toMatch(pattern);
            seen.add(reg);
        }

        expect(seen.size).toBe(10_000);
    });

    it('formats attachment filenames strictly as <nomorRegistrasi>_<INISIAL>_<jenis>-<rand4>.<ext>', () => {
        const reg = 'PSB-2026-REG-4K8M9Q';
        const fileName = makeFileName({
            nomorRegistrasi: reg,
            nama: 'Ahmad Fauzi Ramadhan',
            jenisBerkas: 'kk',
            ext: '.jpg',
        });

        expect(fileName).toMatch(/^PSB-2026-REG-4K8M9Q_AFR_kk-[0-9A-HJKMNP-TV-Z]{4}\.jpg$/);
        expect(fileName.toLowerCase()).not.toContain('ahmad');
        expect(fileName.toLowerCase()).not.toContain('fauzi');
        expect(fileName.toLowerCase()).not.toContain('ramadhan');

        const e2eeFileName = makeFileName({
            nomorRegistrasi: reg,
            nama: '',
            jenisBerkas: 'ijazah',
            ext: 'pdf',
        });
        expect(e2eeFileName).toMatch(/^PSB-2026-REG-4K8M9Q_X_ijazah-[0-9A-HJKMNP-TV-Z]{4}\.pdf$/);
    });

    it('detects document prefix and normalizes safe extensions', () => {
        expect(detectPsbDocKind('uploadKk', 'scan.jpg', 'Kartu Keluarga')).toBe('kk');
        expect(detectPsbDocKind('pasFoto', 'me.png', 'Pas Foto 3x4')).toBe('foto');
        expect(normalizeDocExtension('scan.JPEG', 'image/jpeg')).toBe('jpg');
        expect(normalizeDocExtension('doc', 'application/pdf')).toBe('pdf');
    });
});
