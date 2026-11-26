import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
    buildPsbGasScriptV31,
    buildPsbStandaloneCloudHelperJs,
    generatePsbPublicKey,
    generatePsbAdminKey,
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

    it.each(gasSources)('$name includes mandatory security markers and removes ANYONE_WITH_LINK', ({ code }) => {
        expect(code).toMatch(/SCRIPT_VERSION\s*=\s*4/);
        expect(code).toContain('ADMIN_KEY');
        expect(code).toContain('PUBLIC_KEY');
        expect(code).toContain('verifyAdminKey');
        expect(code).toContain('verifyPublicSubmitKey');
        expect(code).toContain('resolveConfiguredDriveFolderId');
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

    it('read-only check: RAPOR_UNIFIED_GAS_SCRIPT_V3 contains no Drive sharing / ANYONE_WITH_LINK', () => {
        expect(RAPOR_UNIFIED_GAS_SCRIPT_V3).not.toContain('ANYONE_WITH_LINK');
        expect(RAPOR_UNIFIED_GAS_SCRIPT_V3).not.toContain('setSharing');
        expect(RAPOR_UNIFIED_GAS_SCRIPT_V3).not.toContain('DriveApp');
    });
});
