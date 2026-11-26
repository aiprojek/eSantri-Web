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

    it.each(gasSources)('$name includes mandatory security markers, seed key rotation, and removes ANYONE_WITH_LINK', ({ code }) => {
        expect(code).toMatch(/SCRIPT_VERSION\s*=\s*4/);
        expect(code).toContain('ADMIN_KEY');
        expect(code).toContain('PUBLIC_KEY');
        expect(code).toContain('_SEED');
        expect(code).toContain('diagnoseAdminKey');
        expect(code).toContain('verifyAdminKey');
        expect(code).toContain('verifyPublicSubmitKey');
        expect(code).toContain('resolveConfiguredDriveFolderId');
        expect(code).toContain('hasSpreadsheet');
        expect(code).toContain('getFile');
        expect(code).toContain('deleteFile');
        expect(code).toContain('isFileInPsbDestinationFolder');
        expect(code).toContain('verifyFileMagicBytes');
        expect(code).toContain('makeExistingFilesPrivate');
        expect(code).toContain('DriveApp.Access.PRIVATE');

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
                        hasPublicKey: true,
                        hasAdminKey: true,
                        keysEqual: false,
                        hasSpreadsheet: true,
                    }),
                    { status: 200 }
                );
            }
            return new Response(
                JSON.stringify({
                    result: 'error',
                    success: false,
                    errorCode: 'ADMIN_KEY_MISMATCH',
                    message: 'Mismatch',
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
                        hasPublicKey: true,
                        hasAdminKey: true,
                        keysEqual: false,
                        hasSpreadsheet: true,
                    }),
                    { status: 200 }
                );
            }
            return new Response(
                JSON.stringify({
                    result: 'success',
                    success: true,
                    scriptVersion: 4,
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

    it('read-only check: RAPOR_UNIFIED_GAS_SCRIPT_V3 contains no Drive sharing / ANYONE_WITH_LINK', () => {
        expect(RAPOR_UNIFIED_GAS_SCRIPT_V3).not.toContain('ANYONE_WITH_LINK');
        expect(RAPOR_UNIFIED_GAS_SCRIPT_V3).not.toContain('setSharing');
        expect(RAPOR_UNIFIED_GAS_SCRIPT_V3).not.toContain('DriveApp');
    });
});
