import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    buildPsbGasScriptV31,
    buildPsbStandaloneCloudHelperJs,
    clearPsbGasProbeCache,
    generatePsbPublicKey,
    generatePsbAdminKey,
    isPsbCloudEndpointValid,
    testPsbCloudConnection,
} from '../services/psbCloudService';
import { getPortalGasScriptV2 } from '../services/portalGasService';
import { obfuscateSecretToCodeArray } from '../services/raporCloudService';
import { generateStandalonePortalHtml } from '../utils/portalStandaloneGenerator';
import { RAPOR_UNIFIED_GAS_SCRIPT_V3 } from '../utils/raporAuditPortalGenerator';
import type { PondokSettings, PortalConfig } from '../types';

const portalGasTemplatePath = path.resolve(__dirname, '../docs/portal-gas-template.gs');
const portalGasTemplateContent = fs.readFileSync(portalGasTemplatePath, 'utf8');

describe('PSB & Portal GAS security hardening (Fase 1)', () => {
    const publicKey = 'pub_test_public_key_abc123456';
    const adminKey = 'adm_SUPER_SECRET_ADMIN_KEY_MUST_NOT_LEAK_9876543210';

    const gasSources = [
        { name: 'buildPsbGasScriptV31', code: buildPsbGasScriptV31('1FolderTestId1234567', publicKey, adminKey) },
        { name: 'getPortalGasScriptV2', code: getPortalGasScriptV2('ponpes-test', '1FolderTestId1234567', publicKey, adminKey) },
        { name: 'docs/portal-gas-template.gs', code: portalGasTemplateContent },
    ];

    afterEach(() => {
        clearPsbGasProbeCache();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it.each(gasSources)('$name restricts public version metadata, uses uniform pre-auth errors, exposes authenticated diagnose POST action, and removes ANYONE_WITH_LINK', ({ code }) => {
        const normalizedCode = code.replace(/"/g, "'");
        expect(code).toMatch(/SCRIPT_VERSION\s*=\s*4/);
        expect(code).toContain('ADMIN_KEY');
        expect(code).toContain('PUBLIC_KEY');
        expect(code).toContain('_SEED');
        expect(code).toContain('diagnoseAdminKey');
        expect(code).toContain('verifyAdminKey');
        expect(code).toContain('verifyPublicSubmitKey');
        expect(code).toContain('resolveConfiguredDriveFolderId');
        expect(code).toContain('buildAuthenticatedAdminDiagnostics');
        expect(normalizedCode).toMatch(/(?:action|a)\s*===\s*'diagnose'/);
        expect(code).toContain('getFile');
        expect(code).toContain('deleteFile');
        expect(code).toContain('isFileInPsbDestinationFolder');
        expect(code).toContain('folderHasPsbPrefixOrTargetAncestor');
        expect(normalizedCode).toContain("deleteProperty('DRIVE_FOLDER_ID')");
        expect(code).toContain('verifyFileMagicBytes');
        expect(code).toContain('makeExistingFilesPrivate');
        expect(code).toContain('DriveApp.Access.PRIVATE');

        // Pre-auth responses must NOT leak MISSING_ADMIN_KEY / ADMIN_EQUALS_PUBLIC differentiation
        expect(code).not.toContain('MISSING_ADMIN_KEY');
        expect(code).not.toContain('ADMIN_EQUALS_PUBLIC');
        expect(code).toContain('UNAUTHORIZED');

        // Public doGet?action=version block must NOT contain hasPublicKey, hasAdminKey, keysEqual, or hasSpreadsheet
        const doGetIdx = normalizedCode.indexOf('function doGet(');
        const doPostIdx = normalizedCode.indexOf('function doPost(');
        expect(doGetIdx).toBeGreaterThan(-1);
        expect(doPostIdx).toBeGreaterThan(doGetIdx);
        const doGetBody = normalizedCode.slice(doGetIdx, doPostIdx);
        expect(doGetBody).toContain('scriptVersion');
        expect(doGetBody).toContain('service');
        expect(doGetBody).not.toContain('hasPublicKey');
        expect(doGetBody).not.toContain('hasAdminKey');
        expect(doGetBody).not.toContain('keysEqual');
        expect(doGetBody).not.toContain('hasSpreadsheet');

        expect(code).not.toContain('ANYONE_WITH_LINK');
        expect(code).not.toContain('DriveApp.Access.ANYONE');
    });

    it('generates distinct public and high-entropy admin keys', () => {
        const pub = generatePsbPublicKey();
        const adm = generatePsbAdminKey(pub);
        expect(pub.length).toBeGreaterThanOrEqual(20);
        expect(adm.length).toBeGreaterThanOrEqual(32);
        expect(adm).not.toBe(pub);
    });

    it('never leaks ADMIN_KEY into standalone PSB form helper or standalone portal HTML', () => {
        const helperJs = buildPsbStandaloneCloudHelperJs({
            endpointObfuscatedExpr: 'atob("aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9URVNUL2V4ZWM=")',
            provider: 'gas',
            apiKey: '',
            publicKey,
            jenjangId: 1,
            tahunAjaranAktif: '2026/2027',
            sheetName: 'Pendaftar Baru',
            fieldLabelMapJson: '{}',
        });

        const pubBytesJson = JSON.stringify(obfuscateSecretToCodeArray(publicKey));
        const admBytesJson = JSON.stringify(obfuscateSecretToCodeArray(adminKey));
        expect(helperJs).toContain(pubBytesJson);
        expect(helperJs).not.toContain(admBytesJson);
        expect(helperJs).not.toContain(adminKey);

        const minimalPortalConfig: PortalConfig = {
            enabled: true,
            theme: 'teal',
            showFinance: true,
            showAcademic: true,
            showAttendance: true,
            showTahfizh: true,
            showHealth: true,
            showLibrary: true,
            welcomeMessage: 'Selamat Datang',
            announcement: '',
            contacts: [],
            customLinks: [],
            portalId: 'ponpes-test',
            provider: 'gas',
            gasEndpoint: 'https://script.google.com/macros/s/TEST_DEPLOY_ID/exec',
            gasPublicKey: publicKey,
            gasAdminKey: adminKey,
        };

        const minimalSettings = {
            namaPonpes: 'Pondok Test',
            alamat: 'Jl. Test',
            jenjang: [],
            kelas: [],
            rombel: [],
            portalConfig: minimalPortalConfig,
        } as unknown as PondokSettings;

        const portalHtml = generateStandalonePortalHtml(minimalSettings, minimalPortalConfig);
        expect(portalHtml).not.toContain(adminKey);
        expect(portalHtml).not.toContain('gasAdminKey');
    });

    it('validates consumer and Workspace GAS /exec URLs and rejects /dev URLs', () => {
        expect(isPsbCloudEndpointValid('https://script.google.com/macros/s/AKfycb12345/exec', 'gas')).toBe(true);
        expect(isPsbCloudEndpointValid('https://script.google.com/a/macros/ponpes.sch.id/s/AKfycb12345/exec', 'gas')).toBe(true);
        expect(isPsbCloudEndpointValid('https://script.google.com/a/ponpes.sch.id/macros/s/AKfycb12345/exec', 'gas')).toBe(true);
        expect(isPsbCloudEndpointValid('https://script.google.com/macros/s/AKfycb12345/dev', 'gas')).toBe(false);
    });

    it('diagnoses CORS/network failures, HTML login redirects, equal keys, and ADMIN_KEY mismatches clearly', async () => {
        const endpoint = 'https://script.google.com/macros/s/AKfycbTEST123/exec';

        await expect(
            testPsbCloudConnection({
                endpointUrl: endpoint,
                backendProvider: 'gas',
                publicKey: 'same_key_12345678901234567890123456',
                adminKey: 'same_key_12345678901234567890123456',
            })
        ).rejects.toThrow(/ADMIN_KEY tidak boleh sama dengan PUBLIC_KEY/i);

        vi.stubGlobal(
            'fetch',
            vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
        );
        await expect(
            testPsbCloudConnection({ endpointUrl: endpoint, backendProvider: 'gas', publicKey, adminKey })
        ).rejects.toThrow(/Who has access: Anyone/i);

        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response('<!DOCTYPE html><html><title>accounts.google.com ServiceLogin</title></html>', {
                    status: 200,
                    headers: { 'content-type': 'text/html' },
                })
            )
        );
        await expect(
            testPsbCloudConnection({ endpointUrl: endpoint, backendProvider: 'gas', publicKey, adminKey })
        ).rejects.toThrow(/halaman login Google/i);

        const mismatchFetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
            if ((init?.method || 'GET') === 'GET') {
                return new Response(
                    JSON.stringify({
                        result: 'success',
                        success: true,
                        scriptVersion: 4,
                        service: 'esantri-psb-gas',
                    }),
                    { status: 200 }
                );
            }
            return new Response(
                JSON.stringify({
                    result: 'error',
                    success: false,
                    errorCode: 'UNAUTHORIZED',
                    message: 'Akses ditolak: kredensial admin tidak valid atau konfigurasi belum siap.',
                }),
                { status: 200 }
            );
        });
        vi.stubGlobal('fetch', mismatchFetch);
        await expect(
            testPsbCloudConnection({ endpointUrl: endpoint, backendProvider: 'gas', publicKey, adminKey })
        ).rejects.toThrow(/Version: New version/i);

        const successFetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
            if ((init?.method || 'GET') === 'GET') {
                return new Response(
                    JSON.stringify({
                        result: 'success',
                        success: true,
                        scriptVersion: 4,
                        service: 'esantri-psb-gas',
                    }),
                    { status: 200 }
                );
            }
            const parsedBody = JSON.parse(String(init?.body || '{}'));
            expect(parsedBody.includeDiagnostics).toBe(true);
            return new Response(
                JSON.stringify({
                    result: 'success',
                    success: true,
                    scriptVersion: 4,
                    diagnostics: {
                        hasPublicKey: true,
                        hasAdminKey: true,
                        keysEqual: false,
                        hasSpreadsheet: true,
                    },
                    records: [{ namaLengkap: 'Ahmad' }],
                }),
                { status: 200 }
            );
        });
        vi.stubGlobal('fetch', successFetch);
        const res = await testPsbCloudConnection({ endpointUrl: endpoint, backendProvider: 'gas', publicKey, adminKey });
        expect(res.ok).toBe(true);
        expect(res.rowCount).toBe(1);
    });

    it.each(gasSources)('$name enforces strict folder ID matching when configured and berkas-psb- prefix fallback only when empty', ({ code }) => {
        const fnStart = code.indexOf('function folderHasPsbPrefixOrTargetAncestor');
        const fnEnd = code.indexOf('function describeFileParentFolders');
        expect(fnStart).toBeGreaterThan(-1);
        expect(fnEnd).toBeGreaterThan(fnStart);
        const folderSnippet = code.slice(fnStart, fnEnd);

        const makeIter = <T,>(items: T[]) => {
            let idx = 0;
            return {
                hasNext: () => idx < items.length,
                next: () => items[idx++],
            };
        };
        const makeFolder = (id: string, name: string, parents: any[] = [], trashed = false) => ({
            getId: () => id,
            getName: () => name,
            isTrashed: () => trashed,
            getParents: () => makeIter(parents),
        });
        const makeFile = (parents: any[]) => ({
            getParents: () => makeIter(parents),
        });

        const buildChecker = (configuredId: string) =>
            new Function(
                'resolveConfiguredDriveFolderId',
                `${folderSnippet}; return isFileInPsbDestinationFolder;`
            )(() => configuredId) as (file: any) => boolean;

        const targetFolder = makeFolder('1ConfiguredTargetId999', 'Folder PSB Utama');
        const subInTarget = makeFolder('sub-1', 'berkas-psb-2026-2027', [targetFolder]);
        const deepInTarget = makeFolder('sub-6', 'lampiran-kk', [
            makeFolder('sub-5', 'sub5', [
                makeFolder('sub-4', 'sub4', [
                    makeFolder('sub-3', 'sub3', [subInTarget]),
                ]),
            ]),
        ]);
        const rogueBerkasPsb = makeFolder('rogue-psb-1', 'berkas-psb-2026-2027', []);
        const unrelatedFolder = makeFolder('other-1', 'Dokumen Pribadi', []);

        const checkWithId = buildChecker('1ConfiguredTargetId999');
        expect(checkWithId(makeFile([targetFolder]))).toBe(true);
        expect(checkWithId(makeFile([subInTarget]))).toBe(true);
        expect(checkWithId(makeFile([deepInTarget]))).toBe(true);
        // Critical: when Folder ID IS configured, another folder named berkas-psb-* outside targetFolder MUST be rejected
        expect(checkWithId(makeFile([rogueBerkasPsb]))).toBe(false);
        expect(checkWithId(makeFile([unrelatedFolder]))).toBe(false);

        const checkWithoutId = buildChecker('');
        expect(checkWithoutId(makeFile([rogueBerkasPsb]))).toBe(true);
        expect(checkWithoutId(makeFile([subInTarget]))).toBe(true);
        expect(checkWithoutId(makeFile([unrelatedFolder]))).toBe(false);
    });

    it('read-only check: RAPOR_UNIFIED_GAS_SCRIPT_V3 contains no Drive sharing / ANYONE_WITH_LINK', () => {
        expect(RAPOR_UNIFIED_GAS_SCRIPT_V3).not.toContain('ANYONE_WITH_LINK');
        expect(RAPOR_UNIFIED_GAS_SCRIPT_V3).not.toContain('setSharing');
        expect(RAPOR_UNIFIED_GAS_SCRIPT_V3).not.toContain('DriveApp');
    });
});
