import { describe, it, expect, vi, afterEach } from 'vitest';
import { esc, processSuratContent } from '../utils/suratTemplateUtils';
import { sanitizePendaftar } from '../utils/sanitizePendaftar';
import { SAFE_IMG, SAFE_DOC, isSafeHttpUrl, openPreview } from '../utils/safePreview';
import { formatInlineMarkdown, parseMarkdownToHtml } from '../utils/markdownUtils';
import { evaluateRaporFormula, isRaporFormulaExpression, angkaKeTerbilang } from '../utils/raporFormulaUtils';
import { convertFormulaToJs, isSafeCompiledFormulaJs } from '../services/academicService';
import type { Santri } from '../types';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('esc & processSuratContent (getProcessedContent)', () => {
    it('escapes HTML special characters including XSS payloads', () => {
        const xssPayload = '"><img src=x onerror=alert(1)>';
        const escaped = esc(xssPayload);
        expect(escaped).toBe('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
        expect(escaped).not.toContain('<img');
        expect(escaped).not.toContain('">');
    });

    it('escapes santri & institute placeholders while preserving admin HTML template and literal $ sequences', () => {
        const mockSantri: Santri = {
            id: 1,
            nis: '2025001',
            namaLengkap: '"><img src=x onerror=alert(1)> $& $1',
            jenisKelamin: 'Laki-laki',
            tempatLahir: 'Bandung',
            tanggalLahir: '2010-05-01',
            kewarganegaraan: 'WNI',
            alamat: {
                detail: '<script>alert(1)</script>',
                desaKelurahan: 'Sukamaju',
                kecamatan: 'Cibinong',
                kabupatenKota: 'Bogor',
                provinsi: 'Jawa Barat',
            },
            namaAyah: "H. Ahmad 'Zaid'",
            namaIbu: 'Siti',
            jenjangId: 1,
            kelasId: 1,
            rombelId: 1,
            tanggalMasuk: '2024-07-01',
            status: 'Aktif',
            jenisSantri: 'Mondok - Baru',
            telepon: 'javascript:alert(1)',
        };

        const html = processSuratContent({
            content: '<p>Nama: {NAMA_SANTRI}</p><p>Alamat: {ALAMAT}</p><p>HP: {NO_HP}</p><p>Info: {KODE_POS}</p>',
            settings: {
                namaPonpes: 'Pesantren <b>Aman</b>',
                namaYayasan: 'Yayasan Aman',
                nspp: '12345',
                npsn: '67890',
                alamat: 'Jl. Merdeka',
                tenagaPengajar: [],
                jenjang: [{ id: 1, nama: 'SMP' }],
                kelas: [{ id: 1, nama: 'VII', jenjangId: 1 }],
                rombel: [{ id: 1, nama: 'VII-A', kelasId: 1 }],
                gedungAsrama: [],
                kamar: [],
                customInfoFields: [{ id: '1', label: 'Kode Pos', value: '<svg onload=alert(1)>', showInKop: false }],
            },
            formattedTanggalSurat: '18 November 2026',
            nomorSurat: '001/PSB/2026',
            santri: mockSantri,
        });

        expect(html).toContain('<p>Nama: &quot;&gt;&lt;img src=x onerror=alert(1)&gt; $&amp; $1</p>');
        expect(html).toContain('<p>Alamat: &lt;script&gt;alert(1)&lt;/script&gt;</p>');
        expect(html).toContain('<p>Info: &lt;svg onload=alert(1)&gt;</p>');
        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<svg');
        expect(html).not.toContain('{NAMA_SANTRI}');
    });
});

describe('sanitizePendaftar', () => {
    it('strips unknown keys, rejects dangerous URI schemes, and clamps field lengths', () => {
        const dirty = {
            id: 99,
            namaLengkap: 'A'.repeat(250),
            catatan: 'B'.repeat(2500),
            nomorRegistrasi: 'C'.repeat(150),
            nomorHpWali: 'D'.repeat(80),
            fotoUrl: 'javascript:alert(1)',
            status: 'Diterima',
            extraMaliciousField: '"><img src=x onerror=alert(1)>',
            customData: JSON.stringify({
                berkasXss: 'javascript:alert(1)',
                berkasSvg: 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+',
                berkasImg: 'data:image/png;base64,iVBORw0KGgo=',
                linkAman: 'https://example.com/dokumen.pdf',
                linkBahaya: 'vbscript:msgbox(1)',
            }),
        };

        const clean = sanitizePendaftar(dirty);

        expect((clean as any).extraMaliciousField).toBeUndefined();
        expect(clean.namaLengkap.length).toBe(200);
        expect(clean.catatan?.length).toBe(2000);
        expect(clean.nomorRegistrasi?.length).toBe(100);
        expect(clean.nomorHpWali?.length).toBe(50);
        expect(clean.fotoUrl).toBeUndefined();
        expect(clean.status).toBe('Diterima');

        const parsedCustom = JSON.parse(clean.customData || '{}');
        expect(parsedCustom.berkasXss).toBe('');
        expect(parsedCustom.berkasSvg).toBe('');
        expect(parsedCustom.linkBahaya).toBe('');
        expect(parsedCustom.berkasImg).toBe('data:image/png;base64,iVBORw0KGgo=');
        expect(parsedCustom.linkAman).toBe('https://example.com/dokumen.pdf');
    });

    it('truncates oversized customData safely', () => {
        const clean = sanitizePendaftar({
            id: 100,
            namaLengkap: 'Santri Uji',
            customData: JSON.stringify({ bigField: 'X'.repeat(60000) }),
        });
        expect((clean.customData || '').length).toBeLessThanOrEqual(50000);
    });
});

describe('openPreview & safePreview', () => {
    it('rejects XSS, javascript:, SVG, HTML, and mismatched data URLs', () => {
        const openSpy = vi.fn();
        vi.stubGlobal('window', { open: openSpy });

        expect(openPreview('javascript:alert(1)', SAFE_IMG)).toBe(false);
        expect(openPreview('javascript:alert(1)', SAFE_DOC)).toBe(false);
        expect(openPreview('"><img src=x onerror=alert(1)>', SAFE_IMG)).toBe(false);
        expect(openPreview('data:image/png;base64,iVBORw0KGgo=" onerror="alert(1)', SAFE_IMG)).toBe(false);
        expect(openPreview('data:image/svg+xml;base64,PHN2Zz4=', SAFE_IMG)).toBe(false);
        expect(openPreview('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', SAFE_DOC)).toBe(false);
        expect(openPreview('data:application/pdf;base64,JVBERi0=', SAFE_IMG)).toBe(false);
        expect(openSpy).not.toHaveBeenCalled();

        expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
        expect(isSafeHttpUrl('https://example.com/berkas.pdf')).toBe(true);
    });

    it('opens safe PNG and PDF data URLs via Blob URL with noopener,noreferrer', () => {
        const openSpy = vi.fn();
        const createObjectURLSpy = vi.fn(() => 'blob:https://esantri.test/mock-blob-id');
        const revokeObjectURLSpy = vi.fn();

        vi.stubGlobal('window', { open: openSpy });
        vi.stubGlobal('URL', {
            createObjectURL: createObjectURLSpy,
            revokeObjectURL: revokeObjectURLSpy,
        });

        expect(openPreview('data:image/png;base64,iVBORw0KGgo=', SAFE_IMG)).toBe(true);
        expect(openPreview('data:application/pdf;base64,JVBERi0=', SAFE_DOC)).toBe(true);
        expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
        expect(openSpy).toHaveBeenNthCalledWith(
            1,
            'blob:https://esantri.test/mock-blob-id',
            '_blank',
            'noopener,noreferrer'
        );
        expect(openSpy).toHaveBeenNthCalledWith(
            2,
            'blob:https://esantri.test/mock-blob-id',
            '_blank',
            'noopener,noreferrer'
        );
    });
});

describe('markdownUtils URL underscore regression & XSS', () => {
    it('does not corrupt URLs containing multiple underscores in links or bare URLs', () => {
        const linkHtml = formatInlineMarkdown('Unduh [file_rapor_v2](https://x.com/my_file_name_v2.pdf) sekarang');
        expect(linkHtml).toContain('href="https://x.com/my_file_name_v2.pdf"');
        expect(linkHtml).not.toContain('my<em');

        const bareUrlHtml = formatInlineMarkdown('Kunjungi https://x.com/my_file_name_v2.pdf dan *penting* atau _catatan_');
        expect(bareUrlHtml).toContain('https://x.com/my_file_name_v2.pdf');
        expect(bareUrlHtml).toContain('<em class="italic text-gray-800">penting</em>');
        expect(bareUrlHtml).toContain('<em class="italic text-gray-800">catatan</em>');
    });

    it('escapes raw HTML tags and refuses javascript: links', () => {
        const html = parseMarkdownToHtml('[klik](javascript:alert(1)) "><img src=x onerror=alert(1)>');
        expect(html).not.toContain('href="javascript:');
        expect(html).not.toContain('<img');
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });
});

describe('Rapor formula engine', () => {
    it('evaluates Excel-style formulas accurately', () => {
        expect(isRaporFormulaExpression('=RATA2(80, 90)')).toBe(true);
        expect(evaluateRaporFormula('=SUM(80, 90, 100)')).toBe('270');
        expect(evaluateRaporFormula('=RATA2(80, 90)')).toBe('85');
        expect(evaluateRaporFormula('=IF(85>=75, "Tuntas", "Remedial")')).toBe('Tuntas');
        expect(evaluateRaporFormula('=PREDIKAT(92)')).toBe('A');
        expect(angkaKeTerbilang(85)).toBe('Delapan Puluh Lima');
    });

    it('compiles safe portal formulas and rejects unsafe JavaScript injections', () => {
        const safeCompiled = convertFormulaToJs('=IF($NILAI>=75, AVERAGE($UH1, $UH2), 0)');
        expect(safeCompiled).toContain("getValue('NILAI', rowId)");
        expect(isSafeCompiledFormulaJs(safeCompiled)).toBe(true);

        expect(isSafeCompiledFormulaJs('window.alert(1)')).toBe(false);
        expect(isSafeCompiledFormulaJs('(() => process.exit())()')).toBe(false);
        expect(isSafeCompiledFormulaJs('eval("alert(1)")')).toBe(false);
        expect(convertFormulaToJs('=window.location.href')).toBe('null');
    });
});
