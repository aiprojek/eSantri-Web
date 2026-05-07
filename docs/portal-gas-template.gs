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

const SHEET_PORTALS = "portals";
const SHEET_PSB = "portal_psb_submissions";
const SHEET_SYNC_LOGS = "portal_sync_logs";
const PORTAL_ID_DEFAULT = "ganti-portal-id-di-sini";
const API_TOKEN = ""; // contoh: 'isi-token-rahasia'
const PAYLOAD_CHUNK_SIZE = 45000; // aman di bawah limit 50.000 char per sel
const PAYLOAD_MAX_PARTS = 20; // total kapasitas ~900.000 char

function doGet(e) {
  try {
    const action = (e.parameter.action || "").trim();
    if (action === "getPortalConfig") {
      return jsonResponse(handleGetPortalConfig(e));
    }
    return jsonResponse({ success: false, message: "Action GET tidak valid." });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: err.message || String(err),
    });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = (body.action || "").trim();

    if (action === "upsertPortalConfig") {
      return jsonResponse(handleUpsertPortalConfig(body));
    }
    if (action === "submitPortalPsb") {
      return jsonResponse(handleSubmitPortalPsb(body));
    }

    return jsonResponse({
      success: false,
      message: "Action POST tidak valid.",
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: err.message || String(err),
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function ensureSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }

  // Self-healing header:
  // Jika sheet sudah ada tapi header baris 1 tidak sesuai,
  // otomatis ditulis ulang agar proses baca/tulis tidak gagal diam-diam.
  const currentHeaders = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  const isHeaderMatch = headers.every(
    (h, i) => (currentHeaders[i] || "").toString().trim() === h,
  );
  if (!isHeaderMatch) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

function rowToObject(headers, row) {
  const result = {};
  headers.forEach((h, idx) => (result[h] = row[idx]));
  return result;
}

function getPortalHeaders() {
  const partHeaders = [];
  for (let i = 1; i <= PAYLOAD_MAX_PARTS; i++) {
    partHeaders.push("payloadPart" + i);
  }
  return ["portalId", "updatedAt", "partCount", "payloadSize"].concat(
    partHeaders,
  );
}

function splitPayload(payloadJson) {
  const parts = [];
  for (let i = 0; i < payloadJson.length; i += PAYLOAD_CHUNK_SIZE) {
    parts.push(payloadJson.slice(i, i + PAYLOAD_CHUNK_SIZE));
  }
  if (parts.length > PAYLOAD_MAX_PARTS) {
    throw new Error(
      "Payload portal terlalu besar (" +
        payloadJson.length +
        " karakter). Maksimum saat ini " +
        PAYLOAD_CHUNK_SIZE * PAYLOAD_MAX_PARTS +
        " karakter.",
    );
  }
  return parts;
}

function mergePayloadFromRow(headers, row) {
  const idxLegacyPayload = headers.indexOf("payloadJson");
  if (idxLegacyPayload >= 0) {
    return (row[idxLegacyPayload] || "").toString();
  }

  const idxPartCount = headers.indexOf("partCount");
  const partCount = Number(row[idxPartCount] || 0);
  if (!partCount || partCount < 1) return "";

  let merged = "";
  for (let i = 1; i <= partCount; i++) {
    const idxPart = headers.indexOf("payloadPart" + i);
    if (idxPart < 0) continue;
    merged += (row[idxPart] || "").toString();
  }
  return merged;
}

function authCheck(inputApiKey) {
  // Prioritas token:
  // 1) konstanta API_TOKEN (paling mudah untuk user awam)
  // 2) Script Property PORTAL_API_KEY (opsional lanjutan)
  const expectedByConstant = (API_TOKEN || "").trim();
  const expectedByProperty = (
    PropertiesService.getScriptProperties().getProperty("PORTAL_API_KEY") || ""
  ).trim();
  const expected = expectedByConstant || expectedByProperty;
  if (!expected) return true; // token mode nonaktif
  return expected === (inputApiKey || "");
}

function resolvePortalId(inputPortalId) {
  const p = (inputPortalId || "").trim();
  if (p) return p;
  const fallback = (PORTAL_ID_DEFAULT || "").trim();
  if (fallback && !fallback.includes("ganti-portal-id")) return fallback;
  throw new Error(
    "portalId wajib diisi. Isi di aplikasi atau ubah PORTAL_ID_DEFAULT di script.",
  );
}

function handleGetPortalConfig(e) {
  const portalId = resolvePortalId(e.parameter.portalId);
  const apiKey = (e.parameter.apiKey || "").trim();
  if (!authCheck(apiKey)) throw new Error("API key tidak valid.");

  const sh = ensureSheet(SHEET_PORTALS, getPortalHeaders());
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  const idxPortal = headers.indexOf("portalId");

  for (let i = values.length - 1; i >= 0; i--) {
    if ((values[i][idxPortal] || "").toString().trim() === portalId) {
      const payloadJson = mergePayloadFromRow(headers, values[i]);
      const payload = JSON.parse(payloadJson || "{}");
      return {
        success: true,
        data: {
          settings: payload.settings || null,
          santriSummary: payload.santriSummary || [],
        },
      };
    }
  }

  return { success: false, message: "Data portal tidak ditemukan." };
}

function handleUpsertPortalConfig(body) {
  const portalId = resolvePortalId(body.portalId);
  const apiKey = (body.apiKey || "").trim();
  const payload = body.payload || {};
  if (!authCheck(apiKey)) throw new Error("API key tidak valid.");

  const portalHeaders = getPortalHeaders();
  const sh = ensureSheet(SHEET_PORTALS, portalHeaders);
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  const idxPortal = headers.indexOf("portalId");

  let targetRow = -1;
  for (let i = 0; i < values.length; i++) {
    if ((values[i][idxPortal] || "").toString().trim() === portalId) {
      targetRow = i + 2;
      break;
    }
  }

  const payloadJson = JSON.stringify(payload);
  const payloadParts = splitPayload(payloadJson);
  const rowData = new Array(portalHeaders.length).fill("");
  rowData[portalHeaders.indexOf("portalId")] = portalId;
  rowData[portalHeaders.indexOf("updatedAt")] = new Date().toISOString();
  rowData[portalHeaders.indexOf("partCount")] = payloadParts.length;
  rowData[portalHeaders.indexOf("payloadSize")] = payloadJson.length;
  for (let i = 0; i < payloadParts.length; i++) {
    rowData[portalHeaders.indexOf("payloadPart" + (i + 1))] = payloadParts[i];
  }
  if (targetRow > 0) {
    sh.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sh.appendRow(rowData);
  }

  const logSheet = ensureSheet(SHEET_SYNC_LOGS, [
    "loggedAt",
    "portalId",
    "status",
    "santriCount",
    "payloadSize",
    "note",
  ]);
  const santriCount = Array.isArray(payload.santriSummary)
    ? payload.santriSummary.length
    : 0;
  logSheet.appendRow([
    new Date().toISOString(),
    portalId,
    targetRow > 0 ? "updated" : "inserted",
    santriCount,
    payloadJson.length,
    "upsertPortalConfig",
  ]);

  return { success: true, message: "Portal config tersimpan." };
}

function handleSubmitPortalPsb(body) {
  const portalId = resolvePortalId(body.portalId);
  const apiKey = (body.apiKey || "").trim();
  const fields = body.fields || {};
  const submittedAt = body.submittedAt || new Date().toISOString();
  if (!authCheck(apiKey)) throw new Error("API key tidak valid.");

  const sh = ensureSheet(SHEET_PSB, [
    "submittedAt",
    "portalId",
    "namaLengkap",
    "nisn",
    "nik",
    "jenisKelamin",
    "tanggalLahir",
    "namaWali",
    "teleponWali",
    "rawJson",
  ]);

  sh.appendRow([
    submittedAt,
    portalId,
    fields.namaLengkap || "",
    fields.nisn || "",
    fields.nik || "",
    fields.jenisKelamin || "",
    fields.tanggalLahir || "",
    fields.namaWali || "",
    fields.teleponWali || "",
    JSON.stringify(fields),
  ]);

  return { success: true, message: "Pendaftaran berhasil tersimpan." };
}
