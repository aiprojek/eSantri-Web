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

const SCRIPT_VERSION = 4;
const SHEET_PORTALS = "portals";
const SHEET_PSB = "portal_psb_submissions";
const SHEET_SYNC_LOGS = "portal_sync_logs";
const PORTAL_ID_DEFAULT = "ganti-portal-id-di-sini";
const DEFAULT_DRIVE_FOLDER_ID = "";
const PUBLIC_KEY = ""; // Kunci Kirim Publik (ditanam di formulir HTML untuk anti-spam & rotasi, bukan rahasia)
const ADMIN_KEY = ""; // Kunci Admin RAHASIA (wajib diisi / disimpan di Script Properties untuk baca/ubah/hapus)
const API_TOKEN = ""; // legacy alias (opsional)
const PAYLOAD_CHUNK_SIZE = 45000; // aman di bawah limit 50.000 char per sel
const PAYLOAD_MAX_PARTS = 20; // total kapasitas ~900.000 char
const MAX_POST_BYTES = 22000000; // batas ukuran request POST (termasuk lampiran base64)
const MAX_PSB_RAW_JSON = 45000; // batas aman JSON di sel Google Sheets
const PSB_RATE_LIMIT_PER_MIN = 20; // maksimal submit PSB per portalId per menit

function doGet(e) {
  try {
    const action = ((e && e.parameter && e.parameter.action) || "").trim();
    if (action === "version") {
      return jsonResponse({
        success: true,
        result: "success",
        scriptVersion: SCRIPT_VERSION,
        service: "esantri-portal-gas",
      });
    }
    if (action === "getPortalConfig" || action === "getPortalPublicInfo") {
      return jsonResponse(handleGetPortalConfig(e));
    }
    return jsonResponse({
      success: false,
      message: "Action GET tidak valid. Gunakan POST untuk aksi admin atau GET ?action=version.",
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: err.message || String(err),
    });
  }
}

function doPost(e) {
  try {
    const rawContents = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : "{}";
    if (rawContents.length > MAX_POST_BYTES) {
      return jsonResponse({
        success: false,
        message: "Ukuran payload melebihi batas yang diizinkan.",
      });
    }
    const body = JSON.parse(rawContents);
    const action = (body.action || "").trim();

    if (action === "diagnose") {
      return jsonResponse(handleDiagnoseAdminPost(body));
    }
    if (action === "upsertPortalConfig") {
      return jsonResponse(handleUpsertPortalConfig(body));
    }
    if (action === "list" || action === "getPsbSubmissions") {
      return jsonResponse(handleGetPsbSubmissionsPost(body));
    }
    if (action === "getFile") {
      return jsonResponse(handleGetFilePost(body));
    }
    if (action === "deleteFile") {
      return jsonResponse(handleDeleteFilePost(body));
    }
    if (action === "submitPortalPsb") {
      return jsonResponse(handleSubmitPortalPsb(body));
    }

    return jsonResponse({
      success: false,
      result: "error",
      message: "Action POST tidak valid.",
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      result: "error",
      message: err.message || String(err),
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getActiveSpreadsheetOrThrow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      "Spreadsheet aktif tidak ditemukan. Pastikan project Apps Script dibuat dari Google Sheets (Ekstensi > Apps Script), bukan script standalone.",
    );
  }
  return ss;
}

function ensureSheet(name, headers) {
  const ss = getActiveSpreadsheetOrThrow();
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

function sanitizeConfigKeyValue(val) {
  const s = (val || "").toString().trim();
  if (!s || /^ganti-/i.test(s) || /^isi-/i.test(s)) return "";
  return s;
}

function resolveScriptKey(propName, constVal) {
  const props = PropertiesService.getScriptProperties();
  const fromProp = sanitizeConfigKeyValue(props.getProperty(propName) || "");
  const fromConst = sanitizeConfigKeyValue(constVal);
  const seedPropName = propName + "_SEED";
  const fromSeed = sanitizeConfigKeyValue(props.getProperty(seedPropName) || "");
  if (fromConst && (!fromProp || fromConst !== fromSeed)) {
    try {
      props.setProperty(propName, fromConst);
      props.setProperty(seedPropName, fromConst);
    } catch (e) {}
    return fromConst;
  }
  return fromProp || fromConst;
}

function resolvePublicKey() {
  return (
    resolveScriptKey("PUBLIC_KEY", PUBLIC_KEY) ||
    resolveScriptKey("PORTAL_API_KEY", API_TOKEN)
  );
}

function resolveAdminKey() {
  return resolveScriptKey("ADMIN_KEY", ADMIN_KEY);
}

function diagnoseAdminKey(inputAdminKey) {
  const expectedAdmin = resolveAdminKey();
  const expectedPublic = resolvePublicKey();
  if (!expectedAdmin || expectedAdmin === expectedPublic || expectedAdmin !== String(inputAdminKey || "").trim()) {
    return {
      ok: false,
      errorCode: "UNAUTHORIZED",
      message: "Akses ditolak: kredensial admin tidak valid atau konfigurasi belum siap.",
    };
  }
  return { ok: true };
}

function verifyAdminKey(inputAdminKey) {
  return diagnoseAdminKey(inputAdminKey).ok;
}

function buildAuthenticatedAdminDiagnostics() {
  const pub = resolvePublicKey();
  const adm = resolveAdminKey();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const folderId = resolveConfiguredDriveFolderId();
  let driveFolderAccessible = null;
  if (folderId) {
    try {
      DriveApp.getFolderById(folderId).getName();
      driveFolderAccessible = true;
    } catch (e) {
      driveFolderAccessible = false;
    }
  }
  return {
    hasPublicKey: Boolean(pub),
    hasAdminKey: Boolean(adm),
    keysEqual: Boolean(adm && adm === pub),
    hasSpreadsheet: Boolean(ss),
    hasDriveFolder: Boolean(folderId),
    driveFolderAccessible: driveFolderAccessible,
  };
}

function handleDiagnoseAdminPost(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) {
    return {
      success: false,
      result: "error",
      errorCode: auth.errorCode,
      message: auth.message,
    };
  }
  return {
    success: true,
    result: "success",
    scriptVersion: SCRIPT_VERSION,
    service: "esantri-portal-gas",
    diagnostics: buildAuthenticatedAdminDiagnostics(),
  };
}

function verifyPublicSubmitKey(inputPublicKey) {
  const expectedPublic = resolvePublicKey();
  if (!expectedPublic) {
    throw new Error(
      "PUBLIC_KEY belum dikonfigurasi pada script backend. Perbarui script GAS lalu terbitkan ulang formulir.",
    );
  }
  if (expectedPublic !== String(inputPublicKey || "").trim()) {
    throw new Error(
      "Kunci kirim formulir tidak valid atau sudah dirotasi. Silakan terbitkan ulang formulir PSB dari aplikasi eSantri Web.",
    );
  }
}

function authCheck(inputApiKey) {
  const expected = resolvePublicKey();
  if (!expected) return true; // mode akses portal publik tanpa token opsional
  return expected === String(inputApiKey || "").trim();
}

function extractCleanDriveFolderId(rawInput) {
  if (!rawInput) return "";
  const trimmed = String(rawInput).trim();
  if (!trimmed) return "";
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];
  const clean = trimmed.split("?")[0].split("#")[0].replace(/\/+$/, "");
  if (/^[a-zA-Z0-9_-]{15,}$/.test(clean)) return clean;
  return "";
}

const PSB_MAX_FILE_BYTES = 5 * 1024 * 1024;
const PSB_ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function resolveConfiguredDriveFolderId() {
  const props = PropertiesService.getScriptProperties();
  const fromProp = extractCleanDriveFolderId(props.getProperty("DRIVE_FOLDER_ID") || "");
  const fromDefault = extractCleanDriveFolderId(DEFAULT_DRIVE_FOLDER_ID);
  const seed = extractCleanDriveFolderId(props.getProperty("DRIVE_FOLDER_ID_SEED") || "");
  if (fromDefault && (!fromProp || fromDefault !== seed)) {
    try {
      props.setProperty("DRIVE_FOLDER_ID", fromDefault);
      props.setProperty("DRIVE_FOLDER_ID_SEED", fromDefault);
    } catch (e) {}
    return fromDefault;
  }
  if (!fromDefault && seed && fromProp === seed) {
    try {
      props.deleteProperty("DRIVE_FOLDER_ID");
      props.deleteProperty("DRIVE_FOLDER_ID_SEED");
    } catch (e) {}
    return "";
  }
  return fromProp || fromDefault;
}

function normalizeAllowedMimeType(mime) {
  let m = String(mime || "").trim().toLowerCase().split(";")[0];
  if (m === "image/jpg") m = "image/jpeg";
  return m;
}

function verifyFileMagicBytes(bytes, expectedMime) {
  if (!bytes || bytes.length < 4) return false;
  const b0 = bytes[0] & 0xFF;
  const b1 = bytes[1] & 0xFF;
  const b2 = bytes[2] & 0xFF;
  const b3 = bytes[3] & 0xFF;
  if (expectedMime === "application/pdf") {
    return b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46;
  }
  if (expectedMime === "image/jpeg") {
    return b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF;
  }
  if (expectedMime === "image/png") {
    return b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47;
  }
  if (expectedMime === "image/webp") {
    if (bytes.length < 12) return false;
    const b8 = bytes[8] & 0xFF;
    const b9 = bytes[9] & 0xFF;
    const b10 = bytes[10] & 0xFF;
    const b11 = bytes[11] & 0xFF;
    return (
      b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46 &&
      b8 === 0x57 && b9 === 0x45 && b10 === 0x42 && b11 === 0x50
    );
  }
  return false;
}

function decodeAndValidateUploadedFile(fileObj) {
  const mime = normalizeAllowedMimeType(fileObj && fileObj.mime);
  if (PSB_ALLOWED_MIME_TYPES.indexOf(mime) === -1) {
    throw new Error("Tipe berkas tidak diizinkan (" + (mime || "tidak diketahui") + "). Hanya PDF, JPEG, PNG, dan WebP yang diperbolehkan.");
  }
  const rawData = String((fileObj && fileObj.data) || "");
  if (!rawData) {
    throw new Error("Isi berkas unggahan kosong.");
  }
  let cleanB64 = rawData.indexOf(",") !== -1 ? rawData.split(",")[1] : rawData;
  cleanB64 = cleanB64.replace(/\s+/g, "");
  if (cleanB64.length > 7400000) {
    throw new Error("Ukuran berkas unggahan melebihi batas maksimum 5 MB.");
  }
  const bytes = Utilities.base64Decode(cleanB64);
  if (!bytes || bytes.length === 0) {
    throw new Error("Data berkas unggahan tidak valid atau kosong.");
  }
  if (bytes.length > PSB_MAX_FILE_BYTES) {
    throw new Error("Ukuran berkas melebihi batas maksimum 5 MB.");
  }
  if (!verifyFileMagicBytes(bytes, mime)) {
    throw new Error("Konten berkas tidak sesuai dengan tipe MIME " + mime + " (magic-bytes gagal).");
  }
  return { bytes: bytes, mime: mime };
}

function getOrCreatePsbFolderIn(parentContainer, folderName) {
  const it = parentContainer.getFoldersByName(folderName);
  while (it.hasNext()) {
    const existing = it.next();
    if (!existing.isTrashed()) return existing;
  }
  return parentContainer.createFolder(folderName);
}

function resolvePsbUploadFolder(tahunAjaran) {
  const slug = String(tahunAjaran || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || String(new Date().getFullYear());
  const yearFolderName = "berkas-psb-" + slug;
  const targetFolderId = resolveConfiguredDriveFolderId();
  if (targetFolderId) {
    try {
      const baseFolder = DriveApp.getFolderById(targetFolderId);
      if (baseFolder.getName().toLowerCase() === yearFolderName.toLowerCase()) {
        return baseFolder;
      }
      return getOrCreatePsbFolderIn(baseFolder, yearFolderName);
    } catch (err) {}
  }
  return getOrCreatePsbFolderIn(DriveApp, yearFolderName);
}

function makePsbRandomCode(len) {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + ":" + Date.now() + ":" + Math.random());
  let out = "";
  for (let i = 0; i < len; i++) {
    const idx = (digest[i % digest.length] & 0xFF) & 31;
    out += chars.charAt(idx);
  }
  return out;
}

function makePsbRegNumber(year) {
  const y = year || new Date().getFullYear();
  return "PSB-" + y + "-REG-" + makePsbRandomCode(6);
}

function makePsbInitials(nama) {
  const s = String(nama || "").trim();
  if (!s || s.toUpperCase() === "[TERENKRIPSI E2EE]") return "X";
  const cleaned = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  if (!cleaned) return "X";
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  let out = "";
  for (let i = 0; i < tokens.length && i < 3; i++) {
    out += tokens[i].charAt(0).toUpperCase();
  }
  return out || "X";
}

function detectPsbDocPrefix(fieldKey, fileName, fieldLabel) {
  const s = (String(fieldKey || "") + " " + String(fileName || "") + " " + String(fieldLabel || "")).toLowerCase();
  if (s.indexOf("kartu keluarga") !== -1 || s.indexOf(" kk") !== -1 || s.indexOf("kk ") !== -1 || s === "kk" || s.indexOf("uploadkk") !== -1) return "kk";
  if (s.indexOf("akta") !== -1) return "akta";
  if (s.indexOf("ijazah") !== -1) return "ijazah";
  if (s.indexOf("rapor") !== -1 || s.indexOf("raport") !== -1) return "rapor";
  if (s.indexOf("pasfoto") !== -1 || s.indexOf("foto") !== -1) return "foto";
  if (s.indexOf("kip") !== -1) return "kip";
  if (s.indexOf("ktp") !== -1) return "ktp";
  return "dokumen";
}

function extractPsbExt(fileName, mimeType) {
  const o = String(fileName || "").trim();
  const dot = o.lastIndexOf(".");
  if (dot > -1 && dot < o.length - 1) {
    const ext = o.substring(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (ext) return ext === "jpeg" ? "jpg" : ext;
  }
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "";
}

function makePsbAttachmentFileName(regNo, nama, fieldKey, fileObj, mime) {
  const jenis = detectPsbDocPrefix(fieldKey, fileObj && fileObj.name, fileObj && fileObj.fieldLabel);
  const inisial = makePsbInitials(nama);
  const ext = extractPsbExt(fileObj && fileObj.name, mime);
  const base = regNo + "_" + inisial + "_" + jenis + "-" + makePsbRandomCode(4);
  return ext ? base + "." + ext : base;
}

function extractAndValidateDriveFileId(rawInput) {
  const s = String(rawInput || "").trim();
  if (!s) {
    throw new Error("ID atau URL berkas Google Drive wajib diisi.");
  }
  const idMatch = s.match(/\/d\/([a-zA-Z0-9_-]{15,80})/i);
  if (idMatch && idMatch[1]) return idMatch[1];
  const qMatch = s.match(/[?&]id=([a-zA-Z0-9_-]{15,80})/i);
  if (qMatch && qMatch[1]) return qMatch[1];
  const clean = s.split("?")[0].split("#")[0].replace(/\/+$/, "");
  if (/^[a-zA-Z0-9_-]{15,80}$/.test(clean)) return clean;
  throw new Error("Format ID atau URL berkas Google Drive tidak valid.");
}

function folderHasPsbPrefixOrTargetAncestor(folder, targetFolderId, depth, visited) {
  if (!folder || depth > 6) return false;
  if (folder.isTrashed && folder.isTrashed()) return false;
  const fid = folder.getId();
  if (visited[fid]) return false;
  visited[fid] = true;
  if (targetFolderId) {
    if (fid === targetFolderId) return true;
  } else {
    const fname = String(folder.getName() || "").toLowerCase();
    if (depth <= 3 && fname.indexOf("berkas-psb-") === 0) return true;
  }
  const ups = folder.getParents();
  while (ups.hasNext()) {
    if (folderHasPsbPrefixOrTargetAncestor(ups.next(), targetFolderId, depth + 1, visited)) {
      return true;
    }
  }
  return false;
}

function isFileInPsbDestinationFolder(file) {
  const targetFolderId = resolveConfiguredDriveFolderId();
  const parents = file.getParents();
  const visited = {};
  while (parents.hasNext()) {
    const parent = parents.next();
    if (folderHasPsbPrefixOrTargetAncestor(parent, targetFolderId, 1, visited)) {
      return true;
    }
  }
  return false;
}

function describeFileParentFolders(file) {
  const names = [];
  const parents = file.getParents();
  while (parents.hasNext()) {
    const p = parents.next();
    names.push(String(p.getName() || "Drive"));
  }
  return names.length > 0 ? names.join(", ") : "Root / Tanpa Folder";
}

function digestBytesToHex(digestBytes) {
  let hex = "";
  for (let i = 0; i < digestBytes.length; i++) {
    const b = digestBytes[i] & 0xFF;
    let h = b.toString(16);
    if (h.length === 1) h = "0" + h;
    hex += h;
  }
  return hex;
}

function handleGetFilePost(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) {
    return { result: "error", success: false, errorCode: auth.errorCode, message: auth.message };
  }
  const fileId = extractAndValidateDriveFileId(body.fileId || body.fileUrl || body.url);
  let file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (err) {
    throw new Error("Berkas tidak ditemukan atau tidak dapat diakses di Google Drive.");
  }
  if (!file || file.isTrashed()) {
    throw new Error("Berkas tidak ditemukan atau sudah berada di tempat sampah Drive.");
  }
  if (!isFileInPsbDestinationFolder(file)) {
    const folderHint = resolveConfiguredDriveFolderId()
      ? 'Pindahkan berkas ke dalam folder tujuan PSB yang dikonfigurasi di Google Drive (atau kosongkan ID Folder jika ingin memakai folder otomatis "berkas-psb-...").'
      : 'Pindahkan berkas ke dalam folder "berkas-psb-..." di Google Drive.';
    throw new Error("Akses ditolak: berkas berada di luar folder tujuan PSB yang dikonfigurasi (folder berkas saat ini: " + describeFileParentFolders(file) + "). " + folderHint);
  }
  const fileSize = Number(file.getSize() || 0);
  if (fileSize > PSB_MAX_FILE_BYTES) {
    throw new Error("Ukuran berkas melebihi batas maksimum 5 MB.");
  }
  const mime = normalizeAllowedMimeType(file.getMimeType());
  if (PSB_ALLOWED_MIME_TYPES.indexOf(mime) === -1) {
    throw new Error("Tipe berkas tidak diizinkan (" + (mime || "tidak diketahui") + "). Hanya PDF, JPEG, PNG, dan WebP yang diperbolehkan.");
  }
  const blob = file.getBlob();
  const bytes = blob.getBytes();
  if (bytes.length > PSB_MAX_FILE_BYTES) {
    throw new Error("Ukuran berkas hasil baca melebihi batas maksimum 5 MB.");
  }
  const sha256 = digestBytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes));
  return {
    result: "success",
    success: true,
    name: file.getName(),
    mime: mime,
    size: bytes.length,
    sha256: sha256,
    data: Utilities.base64Encode(bytes),
  };
}

function handleDeleteFilePost(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) {
    return { result: "error", success: false, errorCode: auth.errorCode, message: auth.message };
  }
  const fileId = extractAndValidateDriveFileId(body.fileId || body.fileUrl || body.url);
  let file;
  try {
    file = DriveApp.getFileById(fileId);
  } catch (err) {
    throw new Error("Berkas tidak ditemukan atau tidak dapat diakses di Google Drive.");
  }
  if (!file) {
    throw new Error("Berkas tidak ditemukan di Google Drive.");
  }
  if (!isFileInPsbDestinationFolder(file)) {
    const delFolderHint = resolveConfiguredDriveFolderId()
      ? 'Pindahkan berkas ke dalam folder tujuan PSB yang dikonfigurasi di Google Drive (atau kosongkan ID Folder jika ingin memakai folder otomatis "berkas-psb-...").'
      : 'Pindahkan berkas ke dalam folder "berkas-psb-..." di Google Drive.';
    throw new Error("Akses ditolak: berkas berada di luar folder tujuan PSB yang dikonfigurasi (folder berkas saat ini: " + describeFileParentFolders(file) + "). " + delFolderHint);
  }
  if (!file.isTrashed()) {
    file.setTrashed(true);
  }
  return {
    result: "success",
    success: true,
    trashed: true,
    fileId: fileId,
  };
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
  const apiKey = (e.parameter.publicKey || e.parameter.apiKey || "").trim();
  if (!authCheck(apiKey)) throw new Error("Kunci akses portal tidak valid.");

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
        scriptVersion: SCRIPT_VERSION,
        data: {
          settings: payload.settings || null,
          santriSummary: [], // Data santri tidak diekspos lewat GET publik
        },
      };
    }
  }

  return { success: false, message: "Data portal tidak ditemukan." };
}

function handleGetPsbSubmissionsPost(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) {
    return {
      success: false,
      result: "error",
      errorCode: auth.errorCode,
      message: auth.message,
    };
  }
  const ss = getActiveSpreadsheetOrThrow();
  const sh = ss.getSheetByName(SHEET_PSB);
  const listRes = { success: true, result: "success", scriptVersion: SCRIPT_VERSION, records: [] };
  if (body.includeDiagnostics) {
    listRes.diagnostics = buildAuthenticatedAdminDiagnostics();
  }
  if (!sh) return listRes;
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return listRes;
  const headers = rows[0];
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const rec = rowToObject(headers, rows[i]);
    if (rec.rawJson) {
      try {
        const parsed = JSON.parse(rec.rawJson);
        for (const k in parsed) {
          if (rec[k] === undefined || rec[k] === "") rec[k] = parsed[k];
        }
      } catch (err) {}
    }
    items.push(rec);
  }
  listRes.records = items;
  return listRes;
}

function handleUpsertPortalConfig(body) {
  const auth = diagnoseAdminKey(body.adminKey);
  if (!auth.ok) {
    return {
      success: false,
      result: "error",
      errorCode: auth.errorCode,
      message: auth.message,
    };
  }
  const portalId = resolvePortalId(body.portalId);
  const payload = body.payload || {};

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

function escapeSheetCell(val) {
  const s = val === null || val === undefined ? "" : String(val);
  // Cegah Spreadsheet Formula Injection di Google Sheets / Excel
  if (/^[=+\-@\t\r]/.test(s)) {
    return "'" + s;
  }
  return s;
}

function sanitizePsbString(val, maxLen) {
  if (val === null || val === undefined) return "";
  let s = typeof val === "string" ? val : (typeof val === "number" || typeof val === "boolean" ? String(val) : "");
  if (!s) return "";
  const lower = s.trim().toLowerCase();
  if (lower.indexOf("javascript:") === 0 || lower.indexOf("vbscript:") === 0 || lower.indexOf("data:text/html") === 0) {
    return "";
  }
  if (s.length > maxLen) {
    s = s.slice(0, maxLen);
  }
  return escapeSheetCell(s);
}

function checkPsbRateLimit(portalId) {
  const cache = CacheService.getScriptCache();
  const key = "psb_rl_" + portalId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
  const current = Number(cache.get(key) || "0");
  if (current >= PSB_RATE_LIMIT_PER_MIN) {
    throw new Error("Terlalu banyak percobaan pendaftaran. Silakan tunggu 1 menit.");
  }
  cache.put(key, String(current + 1), 60);
}

function handleSubmitPortalPsb(body) {
  // Honeypot check untuk meredam spam bot tanpa memutus form publik
  const hpVal = body._hp || body.website_hp || (body.fields && (body.fields._hp || body.fields._website));
  if (hpVal && String(hpVal).trim() !== "") {
    return { success: true, message: "Pendaftaran berhasil tersimpan." };
  }

  const portalId = resolvePortalId(body.portalId);
  const submitKey = (body.publicKey || body.apiKey || "").trim();
  const rawFields = body.fields && typeof body.fields === "object" && !Array.isArray(body.fields) ? body.fields : {};
  const submittedAt = sanitizePsbString(body.submittedAt || new Date().toISOString(), 64);
  verifyPublicSubmitKey(submitKey);

  checkPsbRateLimit(portalId);

  const STANDARD_LIMITS = {
    namaLengkap: 200,
    nisn: 50,
    nik: 50,
    jenisKelamin: 30,
    tanggalLahir: 64,
    namaWali: 200,
    teleponWali: 50,
    nomorHpWali: 50,
    tempatLahir: 150,
    asalSekolah: 250,
    jalurPendaftaran: 100,
    tahunAjaran: 50,
    catatan: 2000,
  };

  const cleanFields = {};
  const mergedInput = {};
  const fieldKeys = Object.keys(rawFields);
  for (let i = 0; i < fieldKeys.length && i < 80; i++) {
    const fk = fieldKeys[i];
    mergedInput[fk] = rawFields[fk];
  }
  const bodyKeys = Object.keys(body);
  const skipBodyKeys = ["action", "portalId", "apiKey", "publicKey", "adminKey", "driveFolderId", "folderId", "fields", "submittedAt", "_hp", "website_hp"];
  for (let bi = 0; bi < bodyKeys.length && bi < 80; bi++) {
    const bk = bodyKeys[bi];
    if (skipBodyKeys.indexOf(bk) === -1 && mergedInput[bk] === undefined) {
      mergedInput[bk] = body[bk];
    }
  }

  let uploadFolder = null;
  const regNo = sanitizePsbString(mergedInput.nomorRegistrasi || "", 64) || makePsbRegNumber();
  cleanFields.nomorRegistrasi = regNo;
  const mergedKeys = Object.keys(mergedInput);
  for (let i = 0; i < mergedKeys.length && i < 80; i++) {
    const k = mergedKeys[i];
    if (!k || k === "__proto__" || k === "constructor" || k === "prototype" || k === "driveFolderId" || k === "folderId" || k === "publicKey" || k === "adminKey" || k === "nomorRegistrasi" || k.length > 100) continue;
    const limit = STANDARD_LIMITS[k] || 2000;
    const v = mergedInput[k];
    if (v && typeof v === "object" && !Array.isArray(v) && v.isFile && v.data) {
      const validated = decodeAndValidateUploadedFile(v);
      if (!uploadFolder) {
        uploadFolder = resolvePsbUploadFolder(mergedInput.tahunAjaranAktif || mergedInput.tahunAjaran);
      }
      const fileName = makePsbAttachmentFileName(regNo, mergedInput.namaLengkap, k, v, validated.mime);
      const blob = Utilities.newBlob(validated.bytes, validated.mime, fileName);
      const uploaded = uploadFolder.createFile(blob);
      cleanFields[k] = uploaded.getUrl();
    } else if (Array.isArray(v)) {
      cleanFields[k] = v.slice(0, 30).map(function (x) { return sanitizePsbString(x, 200); });
    } else if (typeof v === "boolean" || typeof v === "number") {
      cleanFields[k] = v;
    } else {
      cleanFields[k] = sanitizePsbString(v, limit);
    }
  }

  let rawJsonStr = JSON.stringify(cleanFields);
  if (rawJsonStr.length > MAX_PSB_RAW_JSON) {
    throw new Error("Data formulir melebihi batas ukuran maksimum per pendaftaran.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
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
      sanitizePsbString(portalId, 100),
      cleanFields.namaLengkap || "",
      cleanFields.nisn || "",
      cleanFields.nik || "",
      cleanFields.jenisKelamin || "",
      cleanFields.tanggalLahir || "",
      cleanFields.namaWali || "",
      cleanFields.teleponWali || cleanFields.nomorHpWali || "",
      rawJsonStr,
    ]);
  } finally {
    lock.releaseLock();
  }

  return { success: true, nomorRegistrasi: regNo, message: "Pendaftaran berhasil tersimpan." };
}

function makeExistingFilesPrivateInFolder(folder, counters) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed && file.isTrashed()) continue;
    try {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      counters.updated++;
    } catch (err) {
      counters.failed++;
    }
  }
  const children = folder.getFolders();
  while (children.hasNext()) {
    const child = children.next();
    if (child.isTrashed && child.isTrashed()) continue;
    makeExistingFilesPrivateInFolder(child, counters);
  }
}

/**
 * Jalankan secara MANUAL dari editor Google Apps Script (Run > makeExistingFilesPrivate)
 * untuk mengubah izin berkas PSB lama yang sempat dibagikan publik menjadi PRIVATE.
 */
function makeExistingFilesPrivate() {
  const counters = { updated: 0, failed: 0 };
  const targetFolderId = resolveConfiguredDriveFolderId();
  if (targetFolderId) {
    const rootFolder = DriveApp.getFolderById(targetFolderId);
    makeExistingFilesPrivateInFolder(rootFolder, counters);
  } else {
    const folders = DriveApp.getFolders();
    while (folders.hasNext()) {
      const f = folders.next();
      if (f.isTrashed && f.isTrashed()) continue;
      const name = String(f.getName() || "").toLowerCase();
      if (name.indexOf("berkas-psb-") === 0) {
        makeExistingFilesPrivateInFolder(f, counters);
      }
    }
  }
  Logger.log("makeExistingFilesPrivate selesai. Diubah ke privat: " + counters.updated + ", gagal/dilewati: " + counters.failed);
  return counters;
}

