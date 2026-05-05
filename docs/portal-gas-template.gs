/**
 * eSantri Portal Bridge - Google Apps Script
 * Simpan file ini di Apps Script project, lalu Deploy as Web App (/exec).
 *
 * ===================== WAJIB DIISI USER =====================
 * 1) Ganti PORTAL_ID_DEFAULT (contoh: ponpes-alikhlas)
 * 2) Token opsional:
 *    - Jika ingin pakai token, isi API_TOKEN
 *    - Jika tidak ingin pakai token, biarkan kosong ''
 * ============================================================
 */

const SHEET_PORTALS = 'portals';
const SHEET_PSB = 'portal_psb_submissions';
const PORTAL_ID_DEFAULT = 'ganti-portal-id-di-sini';
const API_TOKEN = ''; // contoh: 'isi-token-rahasia'

function doGet(e) {
  try {
    const action = (e.parameter.action || '').trim();
    if (action === 'getPortalConfig') {
      return jsonResponse(handleGetPortalConfig(e));
    }
    return jsonResponse({ success: false, message: 'Action GET tidak valid.' });
  } catch (err) {
    return jsonResponse({ success: false, message: err.message || String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = (body.action || '').trim();

    if (action === 'upsertPortalConfig') {
      return jsonResponse(handleUpsertPortalConfig(body));
    }
    if (action === 'submitPortalPsb') {
      return jsonResponse(handleSubmitPortalPsb(body));
    }

    return jsonResponse({ success: false, message: 'Action POST tidak valid.' });
  } catch (err) {
    return jsonResponse({ success: false, message: err.message || String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

function rowToObject(headers, row) {
  const result = {};
  headers.forEach((h, idx) => result[h] = row[idx]);
  return result;
}

function authCheck(inputApiKey) {
  // Prioritas token:
  // 1) konstanta API_TOKEN (paling mudah untuk user awam)
  // 2) Script Property PORTAL_API_KEY (opsional lanjutan)
  const expectedByConstant = (API_TOKEN || '').trim();
  const expectedByProperty = (PropertiesService.getScriptProperties().getProperty('PORTAL_API_KEY') || '').trim();
  const expected = expectedByConstant || expectedByProperty;
  if (!expected) return true; // token mode nonaktif
  return expected === (inputApiKey || '');
}

function resolvePortalId(inputPortalId) {
  const p = (inputPortalId || '').trim();
  if (p) return p;
  const fallback = (PORTAL_ID_DEFAULT || '').trim();
  if (fallback && !fallback.includes('ganti-portal-id')) return fallback;
  throw new Error('portalId wajib diisi. Isi di aplikasi atau ubah PORTAL_ID_DEFAULT di script.');
}

function handleGetPortalConfig(e) {
  const portalId = resolvePortalId(e.parameter.portalId);
  const apiKey = (e.parameter.apiKey || '').trim();
  if (!authCheck(apiKey)) throw new Error('API key tidak valid.');

  const sh = ensureSheet(SHEET_PORTALS, ['portalId', 'payloadJson', 'updatedAt']);
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  const idxPortal = headers.indexOf('portalId');
  const idxPayload = headers.indexOf('payloadJson');

  for (let i = values.length - 1; i >= 0; i--) {
    if ((values[i][idxPortal] || '').toString().trim() === portalId) {
      const payload = JSON.parse(values[i][idxPayload] || '{}');
      return { success: true, data: payload.settings || null };
    }
  }

  return { success: false, message: 'Data portal tidak ditemukan.' };
}

function handleUpsertPortalConfig(body) {
  const portalId = resolvePortalId(body.portalId);
  const apiKey = (body.apiKey || '').trim();
  const payload = body.payload || {};
  if (!authCheck(apiKey)) throw new Error('API key tidak valid.');

  const sh = ensureSheet(SHEET_PORTALS, ['portalId', 'payloadJson', 'updatedAt']);
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  const idxPortal = headers.indexOf('portalId');

  let targetRow = -1;
  for (let i = 0; i < values.length; i++) {
    if ((values[i][idxPortal] || '').toString().trim() === portalId) {
      targetRow = i + 2;
      break;
    }
  }

  const rowData = [portalId, JSON.stringify(payload), new Date().toISOString()];
  if (targetRow > 0) {
    sh.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }

  return { success: true, message: 'Portal config tersimpan.' };
}

function handleSubmitPortalPsb(body) {
  const portalId = resolvePortalId(body.portalId);
  const apiKey = (body.apiKey || '').trim();
  const fields = body.fields || {};
  const submittedAt = body.submittedAt || new Date().toISOString();
  if (!authCheck(apiKey)) throw new Error('API key tidak valid.');

  const sh = ensureSheet(
    SHEET_PSB,
    ['submittedAt', 'portalId', 'namaLengkap', 'nisn', 'nik', 'jenisKelamin', 'tanggalLahir', 'namaWali', 'teleponWali', 'rawJson']
  );

  sh.appendRow([
    submittedAt,
    portalId,
    fields.namaLengkap || '',
    fields.nisn || '',
    fields.nik || '',
    fields.jenisKelamin || '',
    fields.tanggalLahir || '',
    fields.namaWali || '',
    fields.teleponWali || '',
    JSON.stringify(fields),
  ]);

  return { success: true, message: 'Pendaftaran berhasil tersimpan.' };
}
