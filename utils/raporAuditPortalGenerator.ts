import { PondokSettings, RaporRecord, RaporTemplate, Santri } from '../types';
import {
    compileTemplateInteractiveSchema,
    CompiledTemplateSchema
} from '../services/academicService';
import { buildMasterKkmLookupMap, computeDefaultKkmForPool } from '../utils/raporFormulaUtils';

/**
 * Google Apps Script v3.0 (Terpadu / Multi-Tab Otomatis + Smart Merge per Santri)
 * Satu URL Web App GAS untuk seluruh Rombel, Jenjang, Template Rapor (Reguler, Diniyah, Hadits/Mutun, Tahfizh),
 * sekaligus menjadi sumber data live bagi Portal Audit & Rekap Leger Tanpa Login (.html).
 */
export const RAPOR_UNIFIED_GAS_SCRIPT_V3 = `/* ============================================================================
 * GOOGLE APPS SCRIPT TERPADU RAPOR & PORTAL AUDIT LEGER v3.0 (eSantri Web)
 * 1 Link GAS untuk Semua Rombel, Semua Template & Portal Audit Tanpa Login
 * Fitur:
 *  - Otomatis buat Tab Baru (Worksheet) per Rombel/Template/Periode (Konsep PSB)
 *  - Smart Merge (Upsert) per SantriID: kiriman beberapa guru mapel otomatis
 *    menyatu di 1 baris santri yang sama (tidak menggandakan baris)
 *  - Kolom Mapel terbaca rapi di Spreadsheet + DataJSON utuh untuk sinkronisasi
 * ============================================================================ */

function sanitizeSheetTabName(rawName) {
  var clean = String(rawName || "Rekap Nilai")
    .replace(/\\[\\s*/g, "(")
    .replace(/\\s*\\]/g, ")")
    .replace(/[:\\/\\\\?*]/g, "-")
    .replace(/\\s+/g, " ")
    .trim();
  if (!clean) clean = "Rekap Nilai";
  return clean.substring(0, 95);
}

function shortTahunAjaran(ta) {
  var s = String(ta || "").trim();
  var m = s.match(/(\\d{2})(\\d{2})\\s*[\\/-]\\s*(\\d{2})(\\d{2})/);
  if (m) return m[2] + "-" + m[4];
  return s.replace(/[^0-9A-Za-z-]/g, "-").substring(0, 9);
}

function buildTargetSheetName(meta, rec) {
  var tabMode = (meta && meta.tabMode) ? String(meta.tabMode) : "per_rombel";
  var taShort = shortTahunAjaran(meta && meta.tahunAjaran ? meta.tahunAjaran : "");
  var semShort = (meta && meta.semester) ? String(meta.semester).trim() : "";
  var periodPrefix = (taShort || semShort) ? "(" + [taShort, semShort].filter(Boolean).join(" ") + ") " : "";
  var tplName = (meta && meta.templateName) ? String(meta.templateName).trim() : "Rapor";

  var groupLabel = "Umum";
  if (tabMode === "per_jenjang") {
    groupLabel = (rec && rec.jenjangName) || (meta && meta.rombelName) || "Marhalah";
  } else if (tabMode === "per_file") {
    groupLabel = (meta && meta.rombelName) || (rec && rec.rombelName) || "Gabungan";
  } else {
    // Default 'per_rombel': otomatis pecah tab rapi per Rombel walau dikirim dari 1 file gabungan
    groupLabel = (rec && rec.rombelName) || (meta && meta.rombelName) || "Rombel";
  }

  return sanitizeSheetTabName(periodPrefix + groupLabel + " - " + tplName);
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var allRecords = [];

  var filterTahun = (e && e.parameter && e.parameter.tahunAjaran) ? String(e.parameter.tahunAjaran).trim() : "";
  var filterSemester = (e && e.parameter && e.parameter.semester) ? String(e.parameter.semester).trim() : "";
  var filterTemplate = (e && e.parameter && e.parameter.templateId) ? String(e.parameter.templateId).trim() : "";
  var filterRombel = (e && e.parameter && e.parameter.rombelId) ? String(e.parameter.rombelId).trim() : "";

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sName = sheet.getName();
    if (sName === "LOGS") continue;

    var rows = sheet.getDataRange().getValues();
    if (rows.length < 2) continue;

    var headers = rows[0].map(function(h) { return String(h || "").trim(); });
    var dataIndex = headers.indexOf("DataJSON");
    if (dataIndex === -1) continue;

    var tsIndex = headers.indexOf("Timestamp");
    var rombelIndex = headers.indexOf("RombelID");
    var rombelNamaIndex = headers.indexOf("RombelNama");
    var templateIndex = headers.indexOf("TemplateID");
    var tahunIndex = headers.indexOf("TahunAjaran");
    var semesterIndex = headers.indexOf("Semester");
    var idIndex = headers.indexOf("SantriID");
    var nisIndex = headers.indexOf("NIS");
    var nameIndex = headers.indexOf("NamaSantri");

    var baseReserved = {
      Timestamp: true,
      RombelID: true,
      RombelNama: true,
      TemplateID: true,
      TahunAjaran: true,
      Semester: true,
      SantriID: true,
      NIS: true,
      NamaSantri: true,
      DataJSON: true
    };

    var extraKeyCols = [];
    for (var hc = 0; hc < headers.length; hc++) {
      var hLabel = headers[hc];
      if (!hLabel || baseReserved[hLabel]) continue;
      var bracketMatch = hLabel.match(/\\[([^\\]]+)\\]\\s*$/);
      var extractedKey = bracketMatch ? bracketMatch[1].trim() : hLabel;
      if (extractedKey) {
        extraKeyCols.push({ colIdx: hc, key: extractedKey });
      }
    }

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var sid = idIndex !== -1 ? row[idIndex] : "";
      if (sid === "" || sid === null || sid === undefined) continue;

      var rowTahun = tahunIndex !== -1 ? String(row[tahunIndex] || "").trim() : "";
      var rowSem = semesterIndex !== -1 ? String(row[semesterIndex] || "").trim() : "";
      var rowTpl = templateIndex !== -1 ? String(row[templateIndex] || "").trim() : "";
      var rowRombel = rombelIndex !== -1 ? String(row[rombelIndex] || "").trim() : "";

      if (filterTahun && rowTahun && rowTahun !== filterTahun) continue;
      if (filterSemester && rowSem && rowSem.toLowerCase() !== filterSemester.toLowerCase()) continue;
      if (filterTemplate && rowTpl && rowTpl !== filterTemplate) continue;
      if (filterRombel && rowRombel && rowRombel !== filterRombel) continue;

      var mergedObj = {};
      try {
        mergedObj = row[dataIndex] ? JSON.parse(String(row[dataIndex])) : {};
      } catch (errJson) {
        mergedObj = {};
      }

      // Sinkronkan juga jika ada koreksi manual langsung di sel kolom mapel Google Sheets
      for (var ek = 0; ek < extraKeyCols.length; ek++) {
        var cellVal = row[extraKeyCols[ek].colIdx];
        if (cellVal !== "" && cellVal !== null && cellVal !== undefined) {
          var eKey = extraKeyCols[ek].key;
          mergedObj[eKey] = String(cellVal);
          if (mergedObj.__cleared && mergedObj.__cleared[eKey]) {
            delete mergedObj.__cleared[eKey];
          }
        }
      }

      allRecords.push({
        Timestamp: tsIndex !== -1 ? row[tsIndex] : "",
        SantriID: sid,
        NIS: nisIndex !== -1 ? row[nisIndex] : "",
        NamaSantri: nameIndex !== -1 ? row[nameIndex] : "",
        RombelID: rombelIndex !== -1 ? row[rombelIndex] : "",
        RombelNama: rombelNamaIndex !== -1 ? row[rombelNamaIndex] : "",
        TahunAjaran: rowTahun,
        Semester: rowSem,
        TemplateID: rowTpl,
        SheetName: sName,
        DataJSON: JSON.stringify(mergedObj)
      });
    }
  }

  if (e && e.parameter && e.parameter.view === "leger") {
    return generateSimpleLegerHtml(allRecords);
  }

  return ContentService
    .createTextOutput(JSON.stringify(allRecords))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    if (!e || !e.postData || !e.postData.contents) {
      logToSheet("Error: postData kosong");
      return ContentService.createTextOutput(JSON.stringify({ result: "error", error: "No data" })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var meta = payload.meta || {};
    var records = Array.isArray(payload.records) ? payload.records : [];
    var columnLabels = meta.columnLabels || {};

    if (records.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ result: "success", mergedStudents: 0, message: "Tidak ada baris nilai baru" })).setMimeType(ContentService.MimeType.JSON);
    }

    // Kelompokkan kiriman berdasarkan nama Tab tujuan
    var groupedByTab = {};
    records.forEach(function(rec) {
      if (!rec || !rec.santriId) return;
      var cleanData = {};
      var hasValue = false;
      if (rec.data && typeof rec.data === "object") {
        for (var k in rec.data) {
          if (!Object.prototype.hasOwnProperty.call(rec.data, k) || k === "__cleared") continue;
          var val = rec.data[k];
          if (val !== "" && val !== null && val !== undefined && String(val).trim() !== "-") {
            cleanData[k] = val;
            hasValue = true;
          }
        }
      }
      var clearedKeys = Array.isArray(rec.clearedKeys)
        ? rec.clearedKeys.map(function(ck) { return String(ck || "").trim(); }).filter(Boolean)
        : [];
      var isDeleteRecord = Boolean(rec.deleteRecord);
      if (!hasValue && clearedKeys.length === 0 && !isDeleteRecord) return;

      var targetTab = buildTargetSheetName(meta, rec);
      if (!groupedByTab[targetTab]) groupedByTab[targetTab] = [];
      groupedByTab[targetTab].push({
        santriId: rec.santriId,
        santriName: rec.santriName || "",
        nis: rec.nis || "",
        rombelId: rec.rombelId || meta.rombelId || 0,
        rombelName: rec.rombelName || meta.rombelName || "",
        data: cleanData,
        clearedKeys: clearedKeys,
        deleteRecord: isDeleteRecord
      });
    });

    var baseHeaders = [
      "Timestamp", "RombelID", "TemplateID", "TahunAjaran", "Semester",
      "SantriID", "NIS", "NamaSantri", "RombelNama", "DataJSON"
    ];

    var updatedSheets = [];
    var totalMerged = 0;
    var now = new Date();

    for (var sheetName in groupedByTab) {
      if (!Object.prototype.hasOwnProperty.call(groupedByTab, sheetName)) continue;
      var tabRecords = groupedByTab[sheetName];
      var sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(baseHeaders);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, baseHeaders.length)
          .setFontWeight("bold")
          .setBackground("#0f766e")
          .setFontColor("#ffffff");
      }

      var lastCol = Math.max(sheet.getLastColumn(), baseHeaders.length);
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });

      // Pastikan kolom dasar ada; jika sheet lama 8 kolom, tetap dukung dengan aman
      var idxTs = headers.indexOf("Timestamp");
      var idxRombel = headers.indexOf("RombelID");
      var idxTpl = headers.indexOf("TemplateID");
      var idxTahun = headers.indexOf("TahunAjaran");
      var idxSem = headers.indexOf("Semester");
      var idxSantri = headers.indexOf("SantriID");
      var idxNis = headers.indexOf("NIS");
      var idxNama = headers.indexOf("NamaSantri");
      var idxRombelNama = headers.indexOf("RombelNama");
      var idxJson = headers.indexOf("DataJSON");

      // Kumpulkan kolom mapel yang dikirim agar terbaca juga sebagai kolom manusia di sebelah kanan DataJSON
      var incomingKeys = {};
      tabRecords.forEach(function(r) {
        for (var k in r.data) {
          if (Object.prototype.hasOwnProperty.call(r.data, k)) incomingKeys[k] = true;
        }
      });

      var headerExpanded = false;
      for (var mapelKey in incomingKeys) {
        if (!Object.prototype.hasOwnProperty.call(incomingKeys, mapelKey)) continue;
        var colHeaderTitle = columnLabels[mapelKey] ? (columnLabels[mapelKey] + " [" + mapelKey + "]") : mapelKey;
        var foundIdx = -1;
        for (var hi = 0; hi < headers.length; hi++) {
          if (headers[hi] === colHeaderTitle || headers[hi] === mapelKey || headers[hi].indexOf("[" + mapelKey + "]") !== -1) {
            foundIdx = hi;
            break;
          }
        }
        if (foundIdx === -1) {
          headers.push(colHeaderTitle);
          headerExpanded = true;
        }
      }

      if (headerExpanded) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      }

      var totalCols = headers.length;
      var lastRow = sheet.getLastRow();
      var existingValues = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, totalCols).getValues() : [];

      // Buat indeks baris eksisting berdasarkan SantriID + TahunAjaran + Semester + TemplateID
      var rowLookup = {};
      for (var rIdx = 0; rIdx < existingValues.length; rIdx++) {
        var eRow = existingValues[rIdx];
        var eSid = idxSantri !== -1 ? String(eRow[idxSantri] || "").trim() : "";
        if (!eSid) continue;
        var eTahun = idxTahun !== -1 ? String(eRow[idxTahun] || "").trim() : "";
        var eSem = idxSem !== -1 ? String(eRow[idxSem] || "").trim() : "";
        var eTpl = idxTpl !== -1 ? String(eRow[idxTpl] || "").trim() : "";
        var compositeKey = [eSid, eTahun, eSem, eTpl].join("|");
        rowLookup[compositeKey] = rIdx;
      }

      var rowsToAppend = [];
      var rowsToDelete = [];

      tabRecords.forEach(function(rec) {
        var cKey = [
          String(rec.santriId).trim(),
          String(meta.tahunAjaran || "").trim(),
          String(meta.semester || "").trim(),
          String(meta.templateId || "").trim()
        ].join("|");

        var existingIdx = Object.prototype.hasOwnProperty.call(rowLookup, cKey) ? rowLookup[cKey] : -1;

        if (rec.deleteRecord) {
          if (existingIdx !== -1 && rowsToDelete.indexOf(existingIdx + 2) === -1) {
            rowsToDelete.push(existingIdx + 2);
            totalMerged++;
          }
          return;
        }

        var mergedJsonObj = {};

        if (existingIdx !== -1) {
          var targetRow = existingValues[existingIdx];
          if (idxJson !== -1 && targetRow[idxJson]) {
            try { mergedJsonObj = JSON.parse(String(targetRow[idxJson])); } catch (err) { mergedJsonObj = {}; }
          }
          for (var mk in rec.data) {
            if (Object.prototype.hasOwnProperty.call(rec.data, mk) && mk !== "__cleared") {
              mergedJsonObj[mk] = rec.data[mk];
              if (mergedJsonObj.__cleared && mergedJsonObj.__cleared[mk]) {
                delete mergedJsonObj.__cleared[mk];
              }
            }
          }
          if (rec.clearedKeys && rec.clearedKeys.length > 0) {
            if (!mergedJsonObj.__cleared || typeof mergedJsonObj.__cleared !== "object") {
              mergedJsonObj.__cleared = {};
            }
            for (var ci = 0; ci < rec.clearedKeys.length; ci++) {
              var cKeyName = rec.clearedKeys[ci];
              if (!cKeyName) continue;
              delete mergedJsonObj[cKeyName];
              mergedJsonObj.__cleared[cKeyName] = true;
            }
          }
          if (mergedJsonObj.__cleared && Object.keys(mergedJsonObj.__cleared).length === 0) {
            delete mergedJsonObj.__cleared;
          }

          if (idxTs !== -1) targetRow[idxTs] = now;
          if (idxRombel !== -1) targetRow[idxRombel] = rec.rombelId;
          if (idxTpl !== -1) targetRow[idxTpl] = meta.templateId || "";
          if (idxTahun !== -1) targetRow[idxTahun] = meta.tahunAjaran || "";
          if (idxSem !== -1) targetRow[idxSem] = meta.semester || "";
          if (idxNis !== -1 && rec.nis) targetRow[idxNis] = rec.nis;
          if (idxNama !== -1 && rec.santriName) targetRow[idxNama] = rec.santriName;
          if (idxRombelNama !== -1 && rec.rombelName) targetRow[idxRombelNama] = rec.rombelName;
          if (idxJson !== -1) targetRow[idxJson] = JSON.stringify(mergedJsonObj);

          // Sinkronkan kolom mapel terbaca (termasuk mengosongkan sel jika nilai dihapus)
          for (var colI = 0; colI < headers.length; colI++) {
            var hText = headers[colI];
            if (rec.clearedKeys && rec.clearedKeys.length > 0) {
              for (var ckI = 0; ckI < rec.clearedKeys.length; ckI++) {
                var clrK = rec.clearedKeys[ckI];
                if (hText === clrK || hText.indexOf("[" + clrK + "]") !== -1) {
                  targetRow[colI] = "";
                }
              }
            }
            for (var dk in mergedJsonObj) {
              if (dk === "__cleared") continue;
              if (hText === dk || hText.indexOf("[" + dk + "]") !== -1) {
                targetRow[colI] = mergedJsonObj[dk];
              }
            }
          }
          totalMerged++;
        } else if (Object.keys(rec.data).length > 0) {
          mergedJsonObj = rec.data;
          var newRow = new Array(totalCols);
          for (var z = 0; z < totalCols; z++) newRow[z] = "";
          if (idxTs !== -1) newRow[idxTs] = now;
          if (idxRombel !== -1) newRow[idxRombel] = rec.rombelId;
          if (idxTpl !== -1) newRow[idxTpl] = meta.templateId || "";
          if (idxTahun !== -1) newRow[idxTahun] = meta.tahunAjaran || "";
          if (idxSem !== -1) newRow[idxSem] = meta.semester || "";
          if (idxSantri !== -1) newRow[idxSantri] = rec.santriId;
          if (idxNis !== -1) newRow[idxNis] = rec.nis || "";
          if (idxNama !== -1) newRow[idxNama] = rec.santriName || "";
          if (idxRombelNama !== -1) newRow[idxRombelNama] = rec.rombelName || "";
          if (idxJson !== -1) newRow[idxJson] = JSON.stringify(mergedJsonObj);

          for (var colJ = 0; colJ < headers.length; colJ++) {
            var hTxt = headers[colJ];
            for (var nk in mergedJsonObj) {
              if (nk === "__cleared") continue;
              if (hTxt === nk || hTxt.indexOf("[" + nk + "]") !== -1) {
                newRow[colJ] = mergedJsonObj[nk];
              }
            }
          }
          rowsToAppend.push(newRow);
          totalMerged++;
        }
      });

      if (existingValues.length > 0) {
        sheet.getRange(2, 1, existingValues.length, totalCols).setValues(existingValues);
      }
      if (rowsToAppend.length > 0) {
        var startAppendRow = Math.max(2, existingValues.length + 2);
        sheet.getRange(startAppendRow, 1, rowsToAppend.length, totalCols).setValues(rowsToAppend);
      }
      if (rowsToDelete.length > 0) {
        rowsToDelete.sort(function(a, b) { return b - a; });
        for (var delIdx = 0; delIdx < rowsToDelete.length; delIdx++) {
          sheet.deleteRow(rowsToDelete[delIdx]);
        }
      }

      updatedSheets.push(sheetName);
    }

    logToSheet("Success Merge: " + totalMerged + " santri pada tab [" + updatedSheets.join(", ") + "]");
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      sheets: updatedSheets,
      mergedStudents: totalMerged
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    logToSheet("Critical Error: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function generateSimpleLegerHtml(data) {
  if (!data || data.length === 0) {
    return HtmlService.createHtmlOutput("<div style='font-family:sans-serif;padding:24px;'><h3>Belum ada data nilai yang masuk ke Spreadsheet ini.</h3></div>");
  }
  var html = "<html><head><meta charset='UTF-8'><style>" +
    "body{font-family:system-ui,-apple-system,sans-serif;margin:20px;background:#f8fafc;color:#0f172a;}" +
    "table{border-collapse:collapse;width:100%;font-size:12px;background:#fff;}" +
    "th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left;}" +
    "th{background:#0f766e;color:#fff;position:sticky;top:0;}" +
    "</style></head><body>" +
    "<h2>Rekap Cepat Spreadsheet eSantri (" + data.length + " Baris Santri)</h2>" +
    "<p style='font-size:12px;color:#475569;'>Tips: Gunakan file <b>Portal Audit & Rekap Leger (.html)</b> dari eSantri untuk tampilan interaktif lengkap dengan rumus, KKM, ranking, dan audit mapel kosong.</p>" +
    "<table><thead><tr><th>No</th><th>Tab</th><th>Periode</th><th>Nama Santri</th><th>Data Nilai (JSON)</th></tr></thead><tbody>";
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    html += "<tr><td>" + (i + 1) + "</td><td>" + (r.SheetName || "-") + "</td><td>" + (r.TahunAjaran || "") + " " + (r.Semester || "") + "</td><td><b>" + (r.NamaSantri || r.SantriID) + "</b></td><td><code>" + String(r.DataJSON || "{}") + "</code></td></tr>";
  }
  html += "</tbody></table></body></html>";
  return HtmlService.createHtmlOutput(html).setTitle("Rekap Spreadsheet Rapor eSantri");
}

function logToSheet(msg) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("LOGS");
    if (!sheet) {
      sheet = ss.insertSheet("LOGS");
      sheet.appendRow(["Timestamp", "Message"]);
    }
    sheet.appendRow([new Date(), msg]);
  } catch (e) {}
}
`;

export interface GenerateRaporAuditPortalOptions {
    settings: PondokSettings;
    santriList: Santri[];
    localRecords?: RaporRecord[];
    googleScriptUrl: string;
    defaultTahunAjaran: string;
    defaultSemester: 'Ganjil' | 'Genap';
    filterJenjangId?: number;
    filterTemplateId?: string;
    includeLocalSnapshot?: boolean;
}

interface PortalCompiledTemplatePayload {
    id: string;
    name: string;
    jenjangId?: number;
    kelasId?: number;
    rombelId?: number;
    sheets: CompiledTemplateSchema['sheets'];
    interactiveCells: Array<{
        key: string;
        label: string;
        type: 'input' | 'formula' | 'dropdown';
        sheetId: string;
        sheetName: string;
        formulaJs?: string;
        decimalPlaces?: number;
        kind?: string;
        isNumericScore?: boolean;
        isAttendanceCount?: boolean;
        isLongText?: boolean;
        kkm?: number;
    }>;
    formulaCells: Array<{
        key: string;
        formulaJs?: string;
        decimalPlaces?: number;
    }>;
    rankConfigs: CompiledTemplateSchema['rankConfigs'];
}

const obfuscateUrlToCodeArray = (raw: string): number[] => {
    const clean = (raw || '').trim();
    if (!clean) return [];
    const salt = 43;
    const out: number[] = [];
    for (let i = 0; i < clean.length; i++) {
        out.push(clean.charCodeAt(i) ^ (salt + (i % 19)));
    }
    return out;
};

const safeJsonForHtmlScript = (value: unknown): string => {
    return JSON.stringify(value)
        .replace(/<\//g, '<\\/')
        .replace(/<!--/g, '<\\!--');
};

export const generateRaporAuditPortalHtml = (options: GenerateRaporAuditPortalOptions): string => {
    const {
        settings,
        santriList,
        localRecords = [],
        googleScriptUrl,
        defaultTahunAjaran,
        defaultSemester,
        filterJenjangId = 0,
        filterTemplateId = '',
        includeLocalSnapshot = true
    } = options;

    // 1. Filter Struktur Pendidikan sesuai cakupan
    const targetJenjangList = (settings.jenjang || []).filter(j =>
        filterJenjangId > 0 ? Number(j.id) === Number(filterJenjangId) : true
    );
    const allowedJenjangIds = new Set(targetJenjangList.map(j => Number(j.id)));

    const targetKelasList = (settings.kelas || []).filter(k =>
        filterJenjangId > 0 ? allowedJenjangIds.has(Number(k.jenjangId)) : true
    );
    const allowedKelasIds = new Set(targetKelasList.map(k => Number(k.id)));

    const targetRombelList = (settings.rombel || [])
        .filter(r => (filterJenjangId > 0 ? allowedKelasIds.has(Number(r.kelasId)) : true))
        .map(r => {
            const kObj = (settings.kelas || []).find(k => Number(k.id) === Number(r.kelasId));
            const waliObj = (settings.tenagaPengajar || []).find(
                t => t.id === r.waliKelasId || t.id === r.waliKelasUserId
            );
            return {
                id: Number(r.id),
                nama: r.nama,
                kelasId: Number(r.kelasId),
                jenjangId: kObj ? Number(kObj.jenjangId) : 0,
                waliNama: waliObj?.nama || 'Belum Ditentukan'
            };
        });
    const allowedRombelIds = new Set(targetRombelList.map(r => r.id));

    // 2. Filter Santri Aktif sesuai cakupan
    const activeSantri = (santriList || [])
        .filter(s => {
            if (s.deleted) return false;
            if ((s.status || '').trim().toLowerCase() !== 'aktif') return false;
            if (filterJenjangId > 0) {
                if (s.rombelId && allowedRombelIds.has(Number(s.rombelId))) return true;
                if (s.kelasId && allowedKelasIds.has(Number(s.kelasId))) return true;
                if (s.jenjangId && allowedJenjangIds.has(Number(s.jenjangId))) return true;
                return false;
            }
            return true;
        })
        .sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''))
        .map(s => {
            const rObj = targetRombelList.find(r => r.id === Number(s.rombelId));
            const kObj = targetKelasList.find(k => Number(k.id) === Number(s.kelasId || rObj?.kelasId || 0));
            return {
                id: Number(s.id),
                nis: s.nis || '',
                nama: s.namaLengkap || 'Tanpa Nama',
                rombelId: Number(s.rombelId || 0),
                kelasId: kObj ? Number(kObj.id) : Number(s.kelasId || 0),
                jenjangId: kObj ? Number(kObj.jenjangId) : Number(s.jenjangId || 0)
            };
        });
    const activeSantriIds = new Set(activeSantri.map(s => s.id));

    // 3. Kompilasi Template Rapor (beserta rumus & ranking)
    const rawTemplates: RaporTemplate[] = (settings.raporTemplates || []).filter(t => {
        if (filterTemplateId && t.id !== filterTemplateId) return false;
        if (filterJenjangId > 0 && t.jenjangId && Number(t.jenjangId) !== Number(filterJenjangId)) return false;
        return true;
    });

    const compiledTemplates: PortalCompiledTemplatePayload[] = rawTemplates.map(tpl => {
        const effectiveTplJenjang = tpl.jenjangId
            ? Number(tpl.jenjangId)
            : filterJenjangId > 0
            ? Number(filterJenjangId)
            : undefined;
        const schema = compileTemplateInteractiveSchema(tpl, settings, 'all', 'rombel', effectiveTplJenjang);
        return {
            id: tpl.id,
            name: tpl.name,
            jenjangId: tpl.jenjangId ? Number(tpl.jenjangId) : undefined,
            kelasId: tpl.kelasId ? Number(tpl.kelasId) : undefined,
            rombelId: tpl.rombelId ? Number(tpl.rombelId) : undefined,
            sheets: schema.sheets,
            interactiveCells: schema.interactiveCells.map(c => ({
                key: c.key,
                label: c.label,
                type: c.type,
                sheetId: c.sheetId,
                sheetName: c.sheetName,
                formulaJs: c.formulaJs,
                decimalPlaces: c.decimalPlaces,
                kind: c.kind,
                isNumericScore: c.isNumericScore,
                isAttendanceCount: c.isAttendanceCount,
                isLongText: c.isLongText,
                kkm: c.kkm
            })),
            formulaCells: schema.formulaCells.map(f => ({
                key: f.key,
                formulaJs: f.formulaJs,
                decimalPlaces: f.decimalPlaces
            })),
            rankConfigs: schema.rankConfigs
        };
    });

    // 4. Baseline Snapshot Opsional dari Database Lokal Aplikasi
    const baselineSnapshot = includeLocalSnapshot
        ? (localRecords || [])
              .filter(r => !r.deleted && activeSantriIds.has(Number(r.santriId)))
              .map(r => {
                  let parsed: Record<string, unknown> = {};
                  if (r.customData) {
                      try {
                          parsed = JSON.parse(r.customData);
                      } catch {
                          parsed = {};
                      }
                  }
                  // Juga sertakan nilai mapel klasik bila customData belum memuatnya
                  if (Array.isArray(r.nilai)) {
                      r.nilai.forEach(nm => {
                          const mapelObj = (settings.mataPelajaran || []).find(m => m.id === nm.mapelId);
                          if (mapelObj) {
                              const codeKey = mapelObj.nama.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                              if (parsed[codeKey] === undefined && nm.nilaiAngka !== undefined) {
                                  parsed[codeKey] = nm.nilaiAngka;
                              }
                          }
                      });
                  }
                  if (r.sakit !== undefined && parsed.SAKIT === undefined) parsed.SAKIT = r.sakit;
                  if (r.izin !== undefined && parsed.IZIN === undefined) parsed.IZIN = r.izin;
                  if (r.alpha !== undefined) {
                      if (parsed.ALPHA === undefined) parsed.ALPHA = r.alpha;
                      if (parsed.ALFA === undefined) parsed.ALFA = r.alpha;
                  }
                  if (r.catatanWaliKelas && parsed.CATATAN_WALI === undefined) parsed.CATATAN_WALI = r.catatanWaliKelas;
                  if (r.keputusan && parsed.KEPUTUSAN === undefined) parsed.KEPUTUSAN = r.keputusan;

                  return {
                      SantriID: Number(r.santriId),
                      RombelID: Number(r.rombelId || 0),
                      TahunAjaran: r.tahunAjaran || defaultTahunAjaran,
                      Semester: r.semester || defaultSemester,
                      TemplateID: (parsed._templateId as string) || '',
                      Timestamp: r.lastModified ? new Date(r.lastModified).toISOString() : (r.tanggalRapor || ''),
                      DataJSON: parsed,
                      _source: 'local_snapshot'
                  };
              })
        : [];

    const pondokPayload = {
        nama: settings.namaPonpes || 'Pondok Pesantren',
        yayasan: settings.namaYayasan || '',
        kabupaten: settings.kabupatenKota || '',
        logoUrl: settings.logoPonpesUrl || '',
        defaultTahunAjaran,
        defaultSemester,
        scopeLabel:
            filterJenjangId > 0
                ? targetJenjangList[0]?.nama || 'Marhalah Terpilih'
                : 'Seluruh Jenjang / Marhalah',
        generatedAt: new Date().toISOString(),
        gasBytes: obfuscateUrlToCodeArray(googleScriptUrl)
    };

    const kkmLookupByJenjang: Record<string, Record<string, number>> = {};
    const kkmDefaultByJenjang: Record<string, number> = {};
    (settings.jenjang || []).forEach(j => {
        kkmLookupByJenjang[String(j.id)] = buildMasterKkmLookupMap(settings.mataPelajaran || [], Number(j.id));
        kkmDefaultByJenjang[String(j.id)] = computeDefaultKkmForPool(settings.mataPelajaran || [], Number(j.id));
    });
    const kkmPayload = {
        byJenjang: kkmLookupByJenjang,
        global: buildMasterKkmLookupMap(settings.mataPelajaran || [], filterJenjangId > 0 ? filterJenjangId : undefined),
        defaultByJenjang: kkmDefaultByJenjang,
        defaultGlobal: computeDefaultKkmForPool(settings.mataPelajaran || [], filterJenjangId > 0 ? filterJenjangId : undefined)
    };

    const embeddedData = {
        pondok: pondokPayload,
        jenjang: targetJenjangList.map(j => ({ id: Number(j.id), nama: j.nama })),
        kelas: targetKelasList.map(k => ({ id: Number(k.id), nama: k.nama, jenjangId: Number(k.jenjangId) })),
        rombel: targetRombelList,
        santri: activeSantri,
        templates: compiledTemplates,
        baseline: baselineSnapshot,
        kkm: kkmPayload
    };

    const serializedData = safeJsonForHtmlScript(embeddedData);
    const pageTitle = `Portal Audit & Rekap Leger Nilai — ${pondokPayload.nama}`;

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pageTitle.replace(/</g, '&lt;')}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
    <style>
        /* Fallback & Print CSS sehingga tetap rapi saat offline maupun cetak PDF */
        *, *::before, *::after { box-sizing: border-box; }
        html, body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
        }
        .tabular-nums { font-variant-numeric: tabular-nums; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Sticky Leger Table */
        .leger-scroll-wrap {
            overflow: auto;
            max-height: 72vh;
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            background: #ffffff;
        }
        table.leger-table {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            font-size: 12px;
        }
        table.leger-table th,
        table.leger-table td {
            border-right: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
            padding: 7px 10px;
        }
        table.leger-table thead th {
            position: sticky;
            top: 0;
            z-index: 25;
            background: #f1f5f9;
        }
        table.leger-table.freeze-cols .col-sticky-no {
            position: sticky;
            left: 0;
            z-index: 15;
            width: 44px;
            min-width: 44px;
        }
        table.leger-table.freeze-cols thead .col-sticky-no {
            z-index: 35;
        }
        table.leger-table.freeze-cols .col-sticky-name {
            position: sticky;
            left: 44px;
            z-index: 15;
            min-width: 195px;
            max-width: 240px;
            box-shadow: 2px 0 6px rgba(15, 23, 42, 0.06);
        }
        table.leger-table.freeze-cols thead .col-sticky-name {
            z-index: 35;
        }

        @media print {
            .no-print { display: none !important; }
            body { background: #ffffff !important; }
            .leger-scroll-wrap {
                max-height: none !important;
                overflow: visible !important;
                border: none !important;
            }
            table.leger-table th, table.leger-table td {
                border: 1px solid #94a3b8 !important;
                padding: 4px 6px !important;
                font-size: 10px !important;
            }
            table.leger-table thead th,
            table.leger-table .col-sticky-no,
            table.leger-table .col-sticky-name {
                position: static !important;
                box-shadow: none !important;
            }
        }
    </style>
</head>
<body class="min-h-screen bg-slate-50 text-slate-900">
    <!-- Top App Header -->
    <header class="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 no-print">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <div id="pondok-logo-box" class="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0 overflow-hidden">
                    <i class="bi bi-clipboard2-data-fill text-lg"></i>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30 whitespace-nowrap">
                            Portal Audit &amp; Leger Nilai
                        </span>
                        <span id="scope-badge" class="text-[10px] font-medium text-slate-400 truncate"></span>
                    </div>
                    <h1 id="pondok-title" class="text-sm sm:text-base font-bold text-white truncate mt-0.5">Portal Audit Nilai</h1>
                </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
                <div id="sync-status-badge" class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
                    <i class="bi bi-hdd-network text-teal-400"></i>
                    <span id="sync-status-text">Siap memuat data</span>
                </div>
                <button
                    id="btn-refresh-live"
                    type="button"
                    onclick="fetchLiveFromGas(true)"
                    class="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                    <i id="refresh-icon" class="bi bi-arrow-clockwise"></i>
                    <span>Muat Ulang Live</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Print Header (only visible on print) -->
    <div class="hidden print:block px-2 py-3 border-b-2 border-slate-800 mb-3">
        <div class="text-base font-bold uppercase" id="print-pondok-name"></div>
        <div class="text-xs font-semibold text-slate-700" id="print-subtitle"></div>
    </div>

    <main class="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-5 space-y-4">
        <!-- Global Filter Bar -->
        <section class="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs no-print">
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tahun Ajaran</label>
                    <select id="f-tahun" onchange="onFilterChange('tahun')" class="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-teal-600"></select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Semester</label>
                    <select id="f-semester" onchange="onFilterChange('semester')" class="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-teal-600">
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Template Rapor</label>
                    <select id="f-template" onchange="onFilterChange('template')" class="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-teal-600"></select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Jenjang / Marhalah</label>
                    <select id="f-jenjang" onchange="onFilterChange('jenjang')" class="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-teal-600"></select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tingkat Kelas</label>
                    <select id="f-kelas" onchange="onFilterChange('kelas')" class="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-teal-600"></select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Rombel</label>
                    <select id="f-rombel" onchange="onFilterChange('rombel')" class="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-teal-600"></select>
                </div>
            </div>

            <!-- Main Navigation Tabs + Search -->
            <div class="mt-3.5 pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button id="nav-tab-rombel" type="button" onclick="switchTab('rombel')" class="px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer">
                        <i class="bi bi-grid-1x2-fill"></i>
                        <span>1. Progres Rombel</span>
                    </button>
                    <button id="nav-tab-audit" type="button" onclick="switchTab('audit')" class="px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer">
                        <i class="bi bi-clipboard2-check-fill"></i>
                        <span>2. Audit Mapel &amp; Santri</span>
                    </button>
                    <button id="nav-tab-leger" type="button" onclick="switchTab('leger')" class="px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer">
                        <i class="bi bi-table"></i>
                        <span>3. Rekap Leger Nilai</span>
                    </button>
                </div>

                <div class="relative min-w-[230px]">
                    <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input
                        id="f-search"
                        type="text"
                        oninput="onSearchInput(this.value)"
                        placeholder="Cari nama santri atau NIS..."
                        class="w-full pl-8 pr-8 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:border-teal-600 outline-none"
                    />
                    <button id="btn-clear-search" type="button" onclick="clearSearch()" style="display:none" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
                        <i class="bi bi-x-circle-fill"></i>
                    </button>
                </div>
            </div>
        </section>

        <!-- KPI Summary Strip -->
        <section id="kpi-strip" class="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print"></section>

        <!-- VIEW 1: PROGRES ROMBEL -->
        <section id="view-rombel" class="space-y-3"></section>

        <!-- VIEW 2: AUDIT MAPEL & KELENGKAPAN SANTRI -->
        <section id="view-audit" style="display:none" class="space-y-4"></section>

        <!-- VIEW 3: REKAP LEGER NILAI LENGKAP -->
        <section id="view-leger" style="display:none" class="space-y-3"></section>
    </main>

    <!-- Student Detail Modal -->
    <div id="student-modal" style="display:none" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center no-print" onclick="if(event.target===this) closeStudentModal()">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div class="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <div id="modal-santri-sub" class="text-[11px] text-teal-300 font-semibold truncate"></div>
                    <h3 id="modal-santri-name" class="text-sm sm:text-base font-bold truncate">Detail Nilai Santri</h3>
                </div>
                <button type="button" onclick="closeStudentModal()" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer">
                    <i class="bi bi-x-lg text-sm"></i>
                </button>
            </div>
            <div id="modal-santri-body" class="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs"></div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="portal-toast" style="display:none" class="fixed bottom-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 no-print"></div>

    <script id="portal-embedded-data" type="application/json">${serializedData}</script>
    <script>
    (function() {
        const RAW = JSON.parse(document.getElementById('portal-embedded-data').textContent || '{}');
        const PONDOK = RAW.pondok || {};
        const JENJANG_LIST = RAW.jenjang || [];
        const KELAS_LIST = RAW.kelas || [];
        const ROMBEL_LIST = RAW.rombel || [];
        const SANTRI_LIST = RAW.santri || [];
        const TEMPLATES = RAW.templates || [];
        const BASELINE_ROWS = RAW.baseline || [];
        const KKM_CONFIG = RAW.kkm || { byJenjang: {}, global: {}, defaultByJenjang: {}, defaultGlobal: 70 };

        function decodeGasUrl(bytes) {
            if (!Array.isArray(bytes) || bytes.length === 0) return '';
            const salt = 43;
            let out = '';
            for (let i = 0; i < bytes.length; i++) {
                out += String.fromCharCode(bytes[i] ^ (salt + (i % 19)));
            }
            return out.trim();
        }

        const GAS_URL = decodeGasUrl(PONDOK.gasBytes || []);

        const rombelById = new Map();
        ROMBEL_LIST.forEach(r => rombelById.set(Number(r.id), r));
        const kelasById = new Map();
        KELAS_LIST.forEach(k => kelasById.set(Number(k.id), k));
        const jenjangById = new Map();
        JENJANG_LIST.forEach(j => jenjangById.set(Number(j.id), j));
        const santriById = new Map();
        SANTRI_LIST.forEach(s => santriById.set(Number(s.id), s));

        // State Aplikasi Portal
        const state = {
            activeTab: 'rombel',
            tahunAjaran: PONDOK.defaultTahunAjaran || '2025/2026',
            semester: PONDOK.defaultSemester || 'Ganjil',
            templateId: 'auto', // 'auto' atau id template spesifik
            jenjangId: JENJANG_LIST.length === 1 ? Number(JENJANG_LIST[0].id) : 0,
            kelasId: 0,
            rombelId: 0,
            search: '',
            auditStatusFilter: 'all', // all | incomplete | empty | complete
            auditMissingKey: '', // filter santri yang kosong pada mapel tertentu
            activeSheetId: 'all',
            legerDisplayMode: (window.innerWidth < 640 ? 'card' : 'table'),
            freezeCols: window.innerWidth >= 768,
            decimalMode: 'auto', // auto | 0 | 1 | 2
            sortBy: 'rombel_name', // rombel_name | name | avg_desc | nis
            liveRows: [],
            lastSyncAt: null,
            isFetching: false
        };

        // Escape HTML helper
        function esc(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        let toastTimeout = null;
        function showPortalToast(msg, type) {
            const el = document.getElementById('portal-toast');
            if (!el) return;
            if (toastTimeout) clearTimeout(toastTimeout);
            const cls = type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : type === 'info'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-teal-900 text-white border-teal-700';
            el.className = 'fixed bottom-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 no-print ' + cls;
            el.innerHTML = '<i class="bi ' + (type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill') + '"></i><span>' + esc(msg) + '</span>';
            el.style.display = 'flex';
            toastTimeout = setTimeout(() => { el.style.display = 'none'; }, 4000);
        }

        // --- EXCEL FORMULA ENGINE (Identik dengan aplikasi utama & HTML Ledger) ---
        function excelRound(num, digits = 0) {
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return 0;
            const factor = Math.pow(10, d);
            const rounded = Math.floor(Math.abs(n) * factor + 0.5 + 1e-12) / factor;
            return n < 0 ? -rounded : rounded;
        }
        function excelRoundUp(num, digits = 0) {
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return 0;
            const factor = Math.pow(10, d);
            const ceiled = Math.ceil(Math.abs(n) * factor - 1e-12) / factor;
            return n < 0 ? -ceiled : ceiled;
        }
        function excelRoundDown(num, digits = 0) {
            const n = Number(num);
            const d = Math.max(0, Math.min(10, Math.trunc(Number(digits) || 0)));
            if (!isFinite(n)) return 0;
            const factor = Math.pow(10, d);
            const floored = Math.floor(Math.abs(n) * factor + 1e-12) / factor;
            return n < 0 ? -floored : floored;
        }
        function excelFixed(num, digits = 2) {
            const n = Number(num);
            const d = Math.max(0, Math.min(6, Math.trunc(Number(digits ?? 2))));
            if (!isFinite(n)) return (0).toFixed(d);
            return excelRound(n, d).toFixed(d);
        }
        function average(...args) {
            const valid = args.filter(a => typeof a === 'number' && !isNaN(a));
            if (valid.length === 0) return 0;
            return valid.reduce((a, b) => a + b, 0) / valid.length;
        }
        function sum(...args) {
            return args.reduce((a, b) => a + (typeof b === 'number' && !isNaN(b) ? b : 0), 0);
        }
        function excelMin(...args) {
            const valid = args.filter(a => typeof a === 'number' && !isNaN(a));
            return valid.length === 0 ? 0 : Math.min(...valid);
        }
        function excelMax(...args) {
            const valid = args.filter(a => typeof a === 'number' && !isNaN(a));
            return valid.length === 0 ? 0 : Math.max(...valid);
        }
        function excelPredikat(score, mode = 'huruf') {
            const n = Number(score);
            if (isNaN(n) || !isFinite(n)) return '-';
            const m = String(mode || 'huruf').toLowerCase().trim();
            const tier = n >= 90 ? 0 : n >= 80 ? 1 : n >= 70 ? 2 : n >= 60 ? 3 : 4;
            if (m === 'indo' || m === 'indonesia' || m === 'deskripsi') {
                return ['Sangat Baik', 'Baik', 'Cukup', 'Kurang', 'Sangat Kurang'][tier];
            }
            if (m === 'taqdir' || m === 'arab_latin' || m === 'latin' || m === 'pesantren') {
                return ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', 'Rasib'][tier];
            }
            if (m === 'arab' || m === 'arab_script') {
                return ['ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'راسب'][tier];
            }
            return ['A', 'B', 'C', 'D', 'E'][tier];
        }
        function angkaKeArab(val) {
            if (val === null || val === undefined || val === '') return '';
            const digits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
            const s = String(val);
            let out = '';
            for (let i = 0; i < s.length; i++) {
                const code = s.charCodeAt(i);
                if (code >= 48 && code <= 57) out += digits[code - 48];
                else out += s[i];
            }
            return out;
        }
        function terbilang(n) {
            if (isNaN(n) || n === '') return '';
            const num = Math.round(Number(n));
            const words = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
            if (num < 0) return 'minus ' + terbilang(-num);
            if (num < 12) return words[num];
            if (num < 20) return terbilang(num - 10) + ' belas';
            if (num < 100) return terbilang(Math.floor(num / 10)) + ' puluh' + (num % 10 === 0 ? '' : ' ' + terbilang(num % 10));
            if (num < 200) return 'seratus' + (num % 100 === 0 ? '' : ' ' + terbilang(num % 100));
            if (num < 1000) return terbilang(Math.floor(num / 100)) + ' ratus' + (num % 100 === 0 ? '' : ' ' + terbilang(num % 100));
            return String(num);
        }
        function excelIf(c, t, f) { return c ? t : f; }
        function excelIfs(...args) {
            for (let i = 0; i + 1 < args.length; i += 2) {
                if (args[i]) return args[i + 1];
            }
            return '';
        }
        function excelIfError(val, fallback = '-') {
            if (val === null || val === undefined || (typeof val === 'number' && (!isFinite(val) || isNaN(val)))) return fallback;
            return val;
        }
        function excelAnd(...args) { return args.every(Boolean); }
        function excelOr(...args) { return args.some(Boolean); }
        function excelNot(v) { return !Boolean(v); }
        function excelConcat(...args) { return args.map(a => (a === null || a === undefined) ? '' : String(a)).join(''); }
        function excelConcatSpasi(...args) { return args.map(a => (a === null || a === undefined) ? '' : String(a).trim()).filter(Boolean).join(' '); }
        function excelUpper(v) { return String(v ?? '').toUpperCase(); }
        function excelLower(v) { return String(v ?? '').toLowerCase(); }
        function excelProper(v) {
            return String(v ?? '').toLowerCase().replace(/(?:^|\\s|[-'/])\\S/g, ch => ch.toUpperCase());
        }
        function matchExcelCriteria(val, criteria) {
            const crit = String(criteria ?? '').trim();
            const m = crit.match(/^(>=|<=|!=|<>|>|<|=)\\s*(.*)$/);
            const op = m ? m[1] : '=';
            const rhsRaw = m ? m[2].trim() : crit;
            const lhsNum = typeof val === 'number' ? val : Number(String(val ?? '').replace(',', '.'));
            const rhsNum = Number(rhsRaw.replace(',', '.'));
            const bothNum = !isNaN(lhsNum) && !isNaN(rhsNum) && rhsRaw !== '';
            if (bothNum) {
                if (op === '>') return lhsNum > rhsNum;
                if (op === '>=') return lhsNum >= rhsNum;
                if (op === '<') return lhsNum < rhsNum;
                if (op === '<=') return lhsNum <= rhsNum;
                if (op === '!=' || op === '<>') return Math.abs(lhsNum - rhsNum) > 1e-9;
                return Math.abs(lhsNum - rhsNum) <= 1e-9;
            }
            const lhsStr = String(val ?? '').trim().toLowerCase();
            const rhsStr = rhsRaw.replace(/^["']|["']$/g, '').trim().toLowerCase();
            if (op === '!=' || op === '<>') return lhsStr !== rhsStr;
            return lhsStr === rhsStr;
        }
        function excelCount(...args) {
            return args.filter(a => typeof a === 'number' && !isNaN(a) && a > 0).length;
        }
        function excelCountIf(...args) {
            if (args.length < 2) return 0;
            const criteria = args[args.length - 1];
            return args.slice(0, -1).filter(v => matchExcelCriteria(v, criteria)).length;
        }
        function excelAverageIf(...args) {
            if (args.length < 2) return 0;
            const criteria = args[args.length - 1];
            const matched = args.slice(0, -1).filter(v => typeof v === 'number' && !isNaN(v) && matchExcelCriteria(v, criteria));
            if (matched.length === 0) return 0;
            return matched.reduce((a, b) => a + b, 0) / matched.length;
        }
        function normMapelKeyJs(raw) {
            return String(raw ?? '')
                .trim()
                .replace(/^\\$+/g, '')
                .replace(/^KKM_+/i, '')
                .replace(/^[0-9٠-٩]{1,2}\\s*[.)\\-:]\\s*/, '')
                .replace(/['’‘\\u0060]/g, '')
                .toUpperCase()
                .replace(/[^A-Z0-9\\u0600-\\u06FF]+/g, '_')
                .replace(/^_+|_+$/g, '');
        }
        function excelKkm(rowId, subjectOrKey, fallbackVal) {
            const sMeta = santriById.get(Number(rowId));
            const jKey = sMeta && sMeta.jenjangId ? String(sMeta.jenjangId) : '';
            const jDict = (jKey && KKM_CONFIG.byJenjang && KKM_CONFIG.byJenjang[jKey]) ? KKM_CONFIG.byJenjang[jKey] : null;
            const gDict = KKM_CONFIG.global || {};
            const q = normMapelKeyJs(subjectOrKey);
            if (q) {
                if (jDict && jDict[q] !== undefined) return jDict[q];
                if (gDict[q] !== undefined) return gDict[q];
            }
            const fbNum = Number(fallbackVal);
            if (!isNaN(fbNum) && fbNum > 0) return fbNum;
            if (jKey && KKM_CONFIG.defaultByJenjang && KKM_CONFIG.defaultByJenjang[jKey]) {
                return KKM_CONFIG.defaultByJenjang[jKey];
            }
            return KKM_CONFIG.defaultGlobal || 70;
        }

        function formatFormulaOutput(val, decimalPlaces) {
            if (typeof val === 'string') return val;
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            const n = Number(val);
            if (val === null || val === undefined || isNaN(n) || !isFinite(n)) return '-';
            if (state.decimalMode !== 'auto') {
                const forcedD = Number(state.decimalMode);
                return excelRound(n, forcedD).toFixed(forcedD);
            }
            if (decimalPlaces !== null && decimalPlaces !== undefined) {
                const d = Math.max(0, Math.min(6, Number(decimalPlaces)));
                return excelRound(n, d).toFixed(d);
            }
            const r2 = excelRound(n, 2);
            return Number.isInteger(r2) ? String(r2) : String(Number(r2.toFixed(2)));
        }

        const compiledExprCache = new Map();
        const noopRata2Kelas = function() { return 0; };
        function evalCompiledJs(exprJs, rowId, getValueFn, rata2KelasFn) {
            if (!exprJs) return 0;
            let fn = compiledExprCache.get(exprJs);
            if (!fn) {
                try {
                    fn = new Function(
                        'rowId', 'getValue', 'average', 'sum', 'excelMin', 'excelMax',
                        'excelRound', 'excelRoundUp', 'excelRoundDown', 'excelFixed',
                        'excelPredikat', 'angkaKeArab', 'terbilang',
                        'excelIf', 'excelIfs', 'excelIfError', 'excelAnd', 'excelOr', 'excelNot',
                        'excelConcat', 'excelConcatSpasi', 'excelUpper', 'excelLower', 'excelProper',
                        'excelCount', 'excelCountIf', 'excelAverageIf', 'excelKkm', 'rata2Kelas',
                        'return (' + exprJs + ');'
                    );
                } catch (e) {
                    fn = function() { return null; };
                }
                compiledExprCache.set(exprJs, fn);
            }
            try {
                return fn(
                    rowId, getValueFn, average, sum, excelMin, excelMax,
                    excelRound, excelRoundUp, excelRoundDown, excelFixed,
                    excelPredikat, angkaKeArab, terbilang,
                    excelIf, excelIfs, excelIfError, excelAnd, excelOr, excelNot,
                    excelConcat, excelConcatSpasi, excelUpper, excelLower, excelProper,
                    excelCount, excelCountIf, excelAverageIf, excelKkm, rata2KelasFn || noopRata2Kelas
                );
            } catch (e) {
                return null;
            }
        }

        // --- RESOLVE TEMPLATE UNTUK ROMBEL / FILTER ---
        function resolveTemplateForRombel(rombelObj) {
            if (state.templateId && state.templateId !== 'auto') {
                const explicit = TEMPLATES.find(t => t.id === state.templateId);
                if (explicit) return explicit;
            }
            if (!rombelObj) return TEMPLATES[0] || null;
            return (
                TEMPLATES.find(t => t.rombelId && Number(t.rombelId) === Number(rombelObj.id)) ||
                TEMPLATES.find(t => t.jenjangId === rombelObj.jenjangId && t.kelasId === rombelObj.kelasId && !t.rombelId) ||
                TEMPLATES.find(t => t.jenjangId === rombelObj.jenjangId && !t.kelasId && !t.rombelId) ||
                TEMPLATES.find(t => !t.jenjangId) ||
                TEMPLATES[0] ||
                null
            );
        }

        function resolveActiveTemplateForLeger() {
            if (state.templateId && state.templateId !== 'auto') {
                const explicit = TEMPLATES.find(t => t.id === state.templateId);
                if (explicit) return explicit;
            }
            if (state.rombelId > 0) {
                return resolveTemplateForRombel(rombelById.get(Number(state.rombelId)));
            }
            if (state.kelasId > 0) {
                const k = kelasById.get(Number(state.kelasId));
                if (k) {
                    return (
                        TEMPLATES.find(t => t.kelasId === k.id && !t.rombelId) ||
                        TEMPLATES.find(t => t.jenjangId === k.jenjangId && !t.kelasId && !t.rombelId) ||
                        TEMPLATES.find(t => !t.jenjangId) ||
                        TEMPLATES[0] ||
                        null
                    );
                }
            }
            if (state.jenjangId > 0) {
                return (
                    TEMPLATES.find(t => t.jenjangId === Number(state.jenjangId) && !t.kelasId && !t.rombelId) ||
                    TEMPLATES.find(t => t.jenjangId === Number(state.jenjangId)) ||
                    TEMPLATES.find(t => !t.jenjangId) ||
                    TEMPLATES[0] ||
                    null
                );
            }
            return TEMPLATES[0] || null;
        }

        // --- SMART MERGE DATA NILAI (Baseline Lokal + Live Google Sheets) ---
        function buildMergedGradesIndex() {
            // Menggabungkan per SantriID pada TahunAjaran & Semester terpilih
            // Jika filter template spesifik dipilih, utamakan baris dengan TemplateID cocok atau baris tanpa TemplateID (snapshot umum)
            const combined = [...BASELINE_ROWS, ...state.liveRows];

            // Urutkan kronologis agar kiriman terbaru menang atas kiriman lama
            combined.sort((a, b) => {
                const ta = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
                const tb = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
                if (isNaN(ta) && isNaN(tb)) return 0;
                if (isNaN(ta)) return -1;
                if (isNaN(tb)) return 1;
                return ta - tb;
            });

            // Map: key = santriId + '|' + (templateId || '*')
            const bySantriAndTpl = new Map();
            const bySantriAny = new Map();

            combined.forEach(item => {
                const sid = Number(item.SantriID);
                if (!sid) return;
                const rowTa = String(item.TahunAjaran || '').trim();
                const rowSem = String(item.Semester || '').trim();
                if (rowTa && rowTa !== state.tahunAjaran) return;
                if (rowSem && rowSem.toLowerCase() !== state.semester.toLowerCase()) return;

                let parsed = {};
                if (typeof item.DataJSON === 'string') {
                    try { parsed = JSON.parse(item.DataJSON); } catch (e) { parsed = {}; }
                } else if (item.DataJSON && typeof item.DataJSON === 'object') {
                    parsed = item.DataJSON;
                }

                const tplId = String(item.TemplateID || parsed._templateId || '').trim();
                const ts = item.Timestamp ? new Date(item.Timestamp).getTime() : 0;

                // Simpan pada bucket umum santri
                if (!bySantriAny.has(sid)) {
                    bySantriAny.set(sid, { data: {}, lastTs: 0 });
                }
                const anyEntry = bySantriAny.get(sid);

                // Simpan pada bucket spesifik template bila ada tplId
                let tplEntry = null;
                if (tplId) {
                    const key = sid + '|' + tplId;
                    if (!bySantriAndTpl.has(key)) {
                        bySantriAndTpl.set(key, { data: {}, lastTs: 0 });
                    }
                    tplEntry = bySantriAndTpl.get(key);
                }

                if (parsed.__cleared && typeof parsed.__cleared === 'object') {
                    Object.keys(parsed.__cleared).forEach(ck => {
                        delete anyEntry.data[ck];
                        if (tplEntry) delete tplEntry.data[ck];
                    });
                }

                Object.keys(parsed).forEach(k => {
                    if (k.startsWith('_')) return;
                    const v = parsed[k];
                    if (v === '' || v === null || v === undefined || String(v).trim() === '-') return;
                    anyEntry.data[k] = v;
                    if (tplEntry) tplEntry.data[k] = v;
                });

                if (ts && !isNaN(ts)) {
                    if (ts > anyEntry.lastTs) anyEntry.lastTs = ts;
                    if (tplEntry && ts > tplEntry.lastTs) tplEntry.lastTs = ts;
                }
            });

            return {
                getStudentRecord(santriId, templateId) {
                    if (state.templateId !== 'auto' && templateId) {
                        // Jika user memfilter Template tertentu (misal Rapor Hadits), ambil dari bucket template tersebut,
                        // namun izinkan fallback dari baseline lokal tanpa TemplateID jika cocok kolomnya
                        const specific = bySantriAndTpl.get(santriId + '|' + templateId);
                        if (specific) return specific;
                        // Cek apakah santri punya data di template lain: jangan campurkan jika eksplisit beda template
                        return { data: {}, lastTs: 0 };
                    }
                    if (templateId) {
                        const specific = bySantriAndTpl.get(santriId + '|' + templateId);
                        const general = bySantriAny.get(santriId);
                        if (specific && general) {
                            return {
                                data: Object.assign({}, general.data, specific.data),
                                lastTs: Math.max(general.lastTs, specific.lastTs)
                            };
                        }
                        if (specific) return specific;
                    }
                    return bySantriAny.get(santriId) || { data: {}, lastTs: 0 };
                }
            };
        }

        // --- EVALUASI PENUH COHORT SANTRI UNTUK SUATU TEMPLATE ---
        function evaluateCohortWithTemplate(students, template, gradesIndex) {
            if (!template) {
                return {
                    inputColumns: [],
                    allColumns: [],
                    studentMap: new Map()
                };
            }

            const allColumns = template.interactiveCells || [];
            const inputColumns = allColumns.filter(c => c.type !== 'formula');
            const formulaCols = template.formulaCells || [];
            const rankConfigs = template.rankConfigs || [];

            const valuesByStudent = new Map();
            const metaByStudent = new Map();

            students.forEach(s => {
                const rec = gradesIndex.getStudentRecord(s.id, template.id);
                const rowVals = {};
                let filledCount = 0;
                const missingCols = [];
                const numericScores = [];

                inputColumns.forEach(col => {
                    const rawVal = rec.data[col.key];
                    const hasVal = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '' && String(rawVal).trim() !== '-';
                    if (hasVal) {
                        rowVals[col.key] = rawVal;
                        filledCount++;
                        if (col.isNumericScore) {
                            const num = Number(String(rawVal).replace(',', '.'));
                            if (!isNaN(num) && isFinite(num)) numericScores.push(num);
                        }
                    } else {
                        rowVals[col.key] = '';
                        missingCols.push(col);
                    }
                });

                valuesByStudent.set(s.id, rowVals);
                metaByStudent.set(s.id, {
                    filledCount,
                    expectedCount: inputColumns.length,
                    percent: inputColumns.length > 0 ? Math.round((filledCount / inputColumns.length) * 100) : 0,
                    missingCols,
                    lastTs: rec.lastTs || 0,
                    avgScore: numericScores.length > 0 ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length) : null
                });
            });

            function getValue(key, rowId) {
                const row = valuesByStudent.get(Number(rowId));
                if (!row) return 0;
                const raw = String(row[key] ?? '').trim();
                if (raw === '' || raw === '-') return 0;
                const norm = raw.indexOf(',') !== -1 && raw.indexOf('.') === -1 ? raw.replace(',', '.') : raw;
                if (!isNaN(Number(norm)) && norm !== '') return Number(norm);
                return raw;
            }

            function rata2Kelas(rowId, colKey) {
                const key = String(colKey ?? '').trim().replace(/^\\$+/g, '');
                if (!key) return 0;
                const sObj = santriById.get(Number(rowId));
                const targetRombel = sObj ? Number(sObj.rombelId || 0) : 0;
                const cohort = targetRombel > 0 ? students.filter(st => Number(st.rombelId) === targetRombel) : students;
                const vals = [];
                cohort.forEach(st => {
                    const row = valuesByStudent.get(st.id);
                    if (!row) return;
                    const raw = String(row[key] ?? '').trim();
                    if (raw === '' || raw === '-') return;
                    const num = Number(raw.replace(',', '.'));
                    if (!isNaN(num) && isFinite(num)) vals.push(num);
                });
                if (vals.length === 0) return 0;
                return vals.reduce((a, b) => a + b, 0) / vals.length;
            }

            // 2-pass evaluasi formula per baris santri (agar rumus berantai seperti JUMLAH -> RATA2 -> PREDIKAT sinkron)
            students.forEach(s => {
                const meta = metaByStudent.get(s.id);
                if (!meta || meta.filledCount === 0) {
                    formulaCols.forEach(fc => { valuesByStudent.get(s.id)[fc.key] = '-'; });
                    return;
                }
                for (let pass = 0; pass < 2; pass++) {
                    formulaCols.forEach(fc => {
                        const out = evalCompiledJs(fc.formulaJs, s.id, getValue, rata2Kelas);
                        valuesByStudent.get(s.id)[fc.key] = formatFormulaOutput(out, fc.decimalPlaces);
                    });
                }
            });

            // Evaluasi RANK() per cakupan (rombel / kelas / jenjang / global)
            rankConfigs.forEach(cfg => {
                const scope = cfg.scope || 'rombel';
                const groups = {};
                students.forEach(s => {
                    const meta = metaByStudent.get(s.id);
                    if (!meta || meta.filledCount === 0) {
                        valuesByStudent.get(s.id)[cfg.targetKey] = '-';
                        return;
                    }
                    let gKey = 'global';
                    if (scope === 'rombel') gKey = 'r_' + s.rombelId;
                    else if (scope === 'kelas') gKey = 'k_' + s.kelasId;
                    else if (scope === 'jenjang') gKey = 'j_' + s.jenjangId;
                    if (!groups[gKey]) groups[gKey] = [];
                    const rawScore = Number(evalCompiledJs(cfg.sourceJs, s.id, getValue, rata2Kelas)) || 0;
                    groups[gKey].push({ id: s.id, val: rawScore });
                });

                Object.values(groups).forEach(list => {
                    const sorted = [...list].sort((a, b) => b.val - a.val);
                    const rankMap = {};
                    sorted.forEach((item, idx) => {
                        if (idx > 0 && Math.abs(item.val - sorted[idx - 1].val) < 1e-9) {
                            rankMap[item.id] = rankMap[sorted[idx - 1].id];
                        } else {
                            rankMap[item.id] = idx + 1;
                        }
                    });
                    list.forEach(item => {
                        const rk = rankMap[item.id];
                        valuesByStudent.get(item.id)[cfg.targetKey] = (cfg.limit > 0 && rk > cfg.limit) ? '-' : String(rk);
                    });
                });
            });

            const resultMap = new Map();
            students.forEach(s => {
                resultMap.set(s.id, {
                    santri: s,
                    values: valuesByStudent.get(s.id),
                    meta: metaByStudent.get(s.id)
                });
            });

            return {
                inputColumns,
                allColumns,
                studentMap: resultMap
            };
        }

        // --- FILTER SANTRI SESUAI PILIHAN ---
        function getFilteredRombels() {
            return ROMBEL_LIST.filter(r => {
                if (state.jenjangId > 0 && Number(r.jenjangId) !== Number(state.jenjangId)) return false;
                if (state.kelasId > 0 && Number(r.kelasId) !== Number(state.kelasId)) return false;
                if (state.rombelId > 0 && Number(r.id) !== Number(state.rombelId)) return false;
                return true;
            });
        }

        function getFilteredSantri(ignoreSearch) {
            const q = ignoreSearch ? '' : state.search.trim().toLowerCase();
            return SANTRI_LIST.filter(s => {
                if (state.jenjangId > 0 && Number(s.jenjangId) !== Number(state.jenjangId)) return false;
                if (state.kelasId > 0 && Number(s.kelasId) !== Number(state.kelasId)) return false;
                if (state.rombelId > 0 && Number(s.rombelId) !== Number(state.rombelId)) return false;
                if (q) {
                    const matchName = s.nama.toLowerCase().includes(q);
                    const matchNis = (s.nis || '').toLowerCase().includes(q);
                    if (!matchName && !matchNis) return false;
                }
                return true;
            });
        }

        // --- BUILD DROPDOWNS ---
        function rebuildDropdowns() {
            // Tahun Ajaran: kumpulkan dari default + data masuk
            const yearSet = new Set([PONDOK.defaultTahunAjaran || '2025/2026']);
            BASELINE_ROWS.forEach(r => { if (r.TahunAjaran) yearSet.add(String(r.TahunAjaran)); });
            state.liveRows.forEach(r => { if (r.TahunAjaran) yearSet.add(String(r.TahunAjaran)); });
            const years = Array.from(yearSet).filter(Boolean).sort().reverse();
            if (!years.includes(state.tahunAjaran) && years.length > 0) {
                state.tahunAjaran = years[0];
            }

            const elTahun = document.getElementById('f-tahun');
            elTahun.innerHTML = years.map(y => '<option value="' + esc(y) + '">' + esc(y) + '</option>').join('');
            elTahun.value = state.tahunAjaran;

            document.getElementById('f-semester').value = state.semester;

            // Template
            const elTpl = document.getElementById('f-template');
            const filteredTpls = TEMPLATES.filter(t => !state.jenjangId || !t.jenjangId || Number(t.jenjangId) === Number(state.jenjangId));
            elTpl.innerHTML = '<option value="auto">Otomatis Sesuai Rombel</option>' +
                filteredTpls.map(t => '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>').join('');
            if (state.templateId !== 'auto' && !filteredTpls.some(t => t.id === state.templateId)) {
                state.templateId = 'auto';
            }
            elTpl.value = state.templateId;

            // Jenjang
            const elJenjang = document.getElementById('f-jenjang');
            if (JENJANG_LIST.length === 1) {
                elJenjang.innerHTML = '<option value="' + JENJANG_LIST[0].id + '">' + esc(JENJANG_LIST[0].nama) + '</option>';
                state.jenjangId = Number(JENJANG_LIST[0].id);
            } else {
                elJenjang.innerHTML = '<option value="0">Semua Jenjang (' + JENJANG_LIST.length + ')</option>' +
                    JENJANG_LIST.map(j => '<option value="' + j.id + '">' + esc(j.nama) + '</option>').join('');
            }
            elJenjang.value = String(state.jenjangId);

            // Kelas
            const availKelas = state.jenjangId > 0
                ? KELAS_LIST.filter(k => Number(k.jenjangId) === Number(state.jenjangId))
                : KELAS_LIST;
            if (state.kelasId > 0 && !availKelas.some(k => Number(k.id) === Number(state.kelasId))) {
                state.kelasId = 0;
            }
            const elKelas = document.getElementById('f-kelas');
            elKelas.innerHTML = '<option value="0">Semua Tingkat Kelas (' + availKelas.length + ')</option>' +
                availKelas.map(k => '<option value="' + k.id + '">' + esc(k.nama) + '</option>').join('');
            elKelas.value = String(state.kelasId);

            // Rombel
            const availRombel = ROMBEL_LIST.filter(r => {
                if (state.jenjangId > 0 && Number(r.jenjangId) !== Number(state.jenjangId)) return false;
                if (state.kelasId > 0 && Number(r.kelasId) !== Number(state.kelasId)) return false;
                return true;
            });
            if (state.rombelId > 0 && !availRombel.some(r => Number(r.id) === Number(state.rombelId))) {
                state.rombelId = 0;
            }
            const elRombel = document.getElementById('f-rombel');
            elRombel.innerHTML = '<option value="0">Semua Rombel (' + availRombel.length + ')</option>' +
                availRombel.map(r => '<option value="' + r.id + '">' + esc(r.nama) + '</option>').join('');
            elRombel.value = String(state.rombelId);
        }

        // --- RENDER UTAMA ---
        function renderAll() {
            rebuildDropdowns();
            updateTabButtons();

            const gradesIndex = buildMergedGradesIndex();
            const rombels = getFilteredRombels();

            // Hitung statistik tiap Rombel
            const rombelStats = rombels.map(r => {
                const tpl = resolveTemplateForRombel(r);
                const rSantri = SANTRI_LIST.filter(s => Number(s.rombelId) === Number(r.id));
                const evalRes = evaluateCohortWithTemplate(rSantri, tpl, gradesIndex);

                let complete = 0;
                let partial = 0;
                let empty = 0;
                let latestTs = 0;
                let sumPct = 0;

                rSantri.forEach(s => {
                    const info = evalRes.studentMap.get(s.id);
                    const m = info ? info.meta : { filledCount: 0, expectedCount: 0, percent: 0, lastTs: 0 };
                    sumPct += m.percent;
                    if (m.lastTs > latestTs) latestTs = m.lastTs;
                    if (m.filledCount === 0) empty++;
                    else if (m.expectedCount > 0 && m.filledCount >= m.expectedCount) complete++;
                    else partial++;
                });

                const avgPct = rSantri.length > 0 ? Math.round(sumPct / rSantri.length) : 0;
                let status = 'Kosong';
                if (rSantri.length > 0) {
                    if (complete === rSantri.length) status = 'Lengkap';
                    else if (complete > 0 || partial > 0) status = 'Sebagian';
                }

                return {
                    rombel: r,
                    jenjangNama: jenjangById.get(r.jenjangId)?.nama || '',
                    kelasNama: kelasById.get(r.kelasId)?.nama || '',
                    templateName: tpl ? tpl.name : 'Belum Ada Template',
                    expectedCols: evalRes.inputColumns.length,
                    totalSantri: rSantri.length,
                    complete,
                    partial,
                    empty,
                    avgPct,
                    status,
                    latestTs
                };
            });

            renderKpiStrip(rombelStats);

            if (state.activeTab === 'rombel') {
                document.getElementById('view-rombel').style.display = 'block';
                document.getElementById('view-audit').style.display = 'none';
                document.getElementById('view-leger').style.display = 'none';
                renderRombelView(rombelStats);
            } else if (state.activeTab === 'audit') {
                document.getElementById('view-rombel').style.display = 'none';
                document.getElementById('view-audit').style.display = 'block';
                document.getElementById('view-leger').style.display = 'none';
                renderAuditView(gradesIndex);
            } else {
                document.getElementById('view-rombel').style.display = 'none';
                document.getElementById('view-audit').style.display = 'none';
                document.getElementById('view-leger').style.display = 'block';
                renderLegerView(gradesIndex);
            }
        }

        function updateTabButtons() {
            const tabs = ['rombel', 'audit', 'leger'];
            tabs.forEach(t => {
                const btn = document.getElementById('nav-tab-' + t);
                if (!btn) return;
                if (state.activeTab === t) {
                    btn.className = 'px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all bg-white text-teal-800 shadow-xs border border-slate-200/80 cursor-pointer';
                } else {
                    btn.className = 'px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all text-slate-600 hover:text-slate-900 cursor-pointer';
                }
            });
        }

        function renderKpiStrip(rombelStats) {
            const activeRombels = rombelStats.filter(r => r.totalSantri > 0);
            const totalSantri = rombelStats.reduce((a, b) => a + b.totalSantri, 0);
            const totalLengkapRombel = activeRombels.filter(r => r.status === 'Lengkap').length;
            const totalProsesRombel = activeRombels.filter(r => r.status === 'Sebagian').length;
            const totalCompleteSantri = rombelStats.reduce((a, b) => a + b.complete, 0);
            const overallPct = activeRombels.length > 0
                ? Math.round(activeRombels.reduce((a, b) => a + b.avgPct, 0) / activeRombels.length)
                : 0;

            document.getElementById('kpi-strip').innerHTML =
                '<div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">' +
                    '<div class="text-[11px] font-semibold text-slate-500 flex items-center justify-between">' +
                        '<span>Cakupan Rombel &amp; Santri</span><i class="bi bi-people text-slate-400"></i>' +
                    '</div>' +
                    '<div class="mt-1.5 flex items-baseline gap-2 tabular-nums">' +
                        '<span class="text-2xl font-black text-slate-900">' + rombelStats.length + '</span>' +
                        '<span class="text-xs font-semibold text-slate-500">Rombel • ' + totalSantri + ' Santri</span>' +
                    '</div>' +
                '</div>' +
                '<div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">' +
                    '<div class="text-[11px] font-semibold text-slate-500 flex items-center justify-between">' +
                        '<span>Rombel Tuntas 100%</span><i class="bi bi-check2-circle text-emerald-600"></i>' +
                    '</div>' +
                    '<div class="mt-1.5 flex items-baseline gap-2 tabular-nums">' +
                        '<span class="text-2xl font-black text-emerald-700">' + totalLengkapRombel + '</span>' +
                        '<span class="text-xs font-semibold text-slate-500">dari ' + activeRombels.length + ' rombel aktif</span>' +
                    '</div>' +
                '</div>' +
                '<div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">' +
                    '<div class="text-[11px] font-semibold text-slate-500 flex items-center justify-between">' +
                        '<span>Sedang Proses Input</span><i class="bi bi-hourglass-split text-amber-600"></i>' +
                    '</div>' +
                    '<div class="mt-1.5 flex items-baseline gap-2 tabular-nums">' +
                        '<span class="text-2xl font-black text-amber-600">' + totalProsesRombel + '</span>' +
                        '<span class="text-xs font-semibold text-slate-500">rombel berjalan</span>' +
                    '</div>' +
                '</div>' +
                '<div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">' +
                    '<div class="text-[11px] font-semibold text-slate-500 flex items-center justify-between">' +
                        '<span>Progres Kelengkapan Nilai</span><i class="bi bi-bar-chart-fill text-teal-600"></i>' +
                    '</div>' +
                    '<div class="mt-1.5 flex items-baseline gap-2 tabular-nums">' +
                        '<span class="text-2xl font-black text-teal-700">' + overallPct + '%</span>' +
                        '<span class="text-xs font-semibold text-slate-500">' + totalCompleteSantri + '/' + totalSantri + ' santri tuntas</span>' +
                    '</div>' +
                '</div>';
        }

        // --- TAB 1: PROGRES ROMBEL ---
        function renderRombelView(rombelStats) {
            const container = document.getElementById('view-rombel');
            const q = state.search.trim().toLowerCase();
            const filtered = q
                ? rombelStats.filter(item =>
                      item.rombel.nama.toLowerCase().includes(q) ||
                      item.rombel.waliNama.toLowerCase().includes(q) ||
                      item.kelasNama.toLowerCase().includes(q)
                  )
                : rombelStats;

            if (filtered.length === 0) {
                container.innerHTML = '<div class="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">Tidak ada rombel yang sesuai dengan filter saat ini.</div>';
                return;
            }

            const cardsHtml = filtered.map(item => {
                let badgeCls = 'bg-slate-100 text-slate-600 border-slate-200';
                let barCls = 'bg-slate-300';
                if (item.status === 'Lengkap') {
                    badgeCls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    barCls = 'bg-emerald-600';
                } else if (item.status === 'Sebagian') {
                    badgeCls = 'bg-amber-50 text-amber-700 border-amber-200';
                    barCls = 'bg-amber-500';
                } else if (item.totalSantri > 0) {
                    badgeCls = 'bg-rose-50 text-rose-700 border-rose-200';
                    barCls = 'bg-rose-400';
                }

                const lastTimeStr = item.latestTs > 0
                    ? new Date(item.latestTs).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Belum ada kiriman';

                return (
                    '<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-teal-300 transition-colors">' +
                        '<div>' +
                            '<div class="flex items-start justify-between gap-2">' +
                                '<div class="min-w-0">' +
                                    '<div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">' +
                                        esc([item.jenjangNama, item.kelasNama].filter(Boolean).join(' • ')) +
                                    '</div>' +
                                    '<h3 class="text-base font-black text-slate-900 truncate mt-0.5">' + esc(item.rombel.nama) + '</h3>' +
                                    '<p class="text-xs text-slate-500 truncate mt-0.5"><i class="bi bi-person-badge mr-1"></i>' + esc(item.rombel.waliNama) + '</p>' +
                                '</div>' +
                                '<span class="px-2.5 py-1 rounded-md text-[10px] font-bold border whitespace-nowrap shrink-0 ' + badgeCls + '">' +
                                    esc(item.status) +
                                '</span>' +
                            '</div>' +

                            '<div class="mt-3 pt-2.5 border-t border-slate-100">' +
                                '<div class="flex items-center justify-between text-xs mb-1.5 tabular-nums">' +
                                    '<span class="text-slate-600 font-medium truncate max-w-[70%]" title="' + esc(item.templateName) + '">' +
                                        '<i class="bi bi-file-earmark-spreadsheet text-teal-600 mr-1"></i>' + esc(item.templateName) + ' (' + item.expectedCols + ' kolom)' +
                                    '</span>' +
                                    '<span class="font-black text-slate-800">' + item.avgPct + '%</span>' +
                                '</div>' +
                                '<div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">' +
                                    '<div class="h-full rounded-full transition-all ' + barCls + '" style="width:' + item.avgPct + '%"></div>' +
                                '</div>' +
                                '<div class="grid grid-cols-3 gap-1.5 mt-2.5 text-center tabular-nums text-[11px]">' +
                                    '<div class="bg-emerald-50/70 border border-emerald-100 rounded-lg py-1 px-1.5">' +
                                        '<span class="block font-black text-emerald-700">' + item.complete + '</span>' +
                                        '<span class="text-[10px] text-emerald-800">Lengkap</span>' +
                                    '</div>' +
                                    '<div class="bg-amber-50/70 border border-amber-100 rounded-lg py-1 px-1.5">' +
                                        '<span class="block font-black text-amber-700">' + item.partial + '</span>' +
                                        '<span class="text-[10px] text-amber-800">Sebagian</span>' +
                                    '</div>' +
                                    '<div class="bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5">' +
                                        '<span class="block font-black text-slate-700">' + item.empty + '</span>' +
                                        '<span class="text-[10px] text-slate-500">Kosong</span>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +

                        '<div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">' +
                            '<span class="text-[10px] text-slate-400 truncate"><i class="bi bi-clock mr-1"></i>' + esc(lastTimeStr) + '</span>' +
                            '<div class="flex items-center gap-1.5 shrink-0">' +
                                '<button type="button" onclick="jumpToRombelView(' + item.rombel.id + ', \'audit\')" class="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold whitespace-nowrap cursor-pointer">' +
                                    'Audit Mapel' +
                                '</button>' +
                                '<button type="button" onclick="jumpToRombelView(' + item.rombel.id + ', \'leger\')" class="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold whitespace-nowrap cursor-pointer">' +
                                    'Buka Leger' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
            }).join('');

            container.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">' + cardsHtml + '</div>';
        }

        // --- TAB 2: AUDIT MAPEL & KELENGKAPAN SANTRI ---
        function renderAuditView(gradesIndex) {
            const container = document.getElementById('view-audit');
            const activeTemplate = resolveActiveTemplateForLeger();
            const cohortAll = getFilteredSantri(true);
            const evalRes = evaluateCohortWithTemplate(cohortAll, activeTemplate, gradesIndex);

            if (!activeTemplate) {
                container.innerHTML = '<div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">Belum ada template rapor yang tersedia untuk diaudit.</div>';
                return;
            }

            // 1. Statistik per Mata Pelajaran / Kolom Input
            const subjectStats = evalRes.inputColumns.map(col => {
                let filled = 0;
                let belowKkm = 0;
                const nums = [];
                cohortAll.forEach(s => {
                    const row = evalRes.studentMap.get(s.id);
                    const rawVal = row ? row.values[col.key] : '';
                    const has = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '' && String(rawVal).trim() !== '-';
                    if (has) {
                        filled++;
                        if (col.isNumericScore) {
                            const n = Number(String(rawVal).replace(',', '.'));
                            if (!isNaN(n) && isFinite(n)) {
                                nums.push(n);
                                if (col.kkm && n < col.kkm) belowKkm++;
                            }
                        }
                    }
                });
                const missing = Math.max(0, cohortAll.length - filled);
                const pct = cohortAll.length > 0 ? Math.round((filled / cohortAll.length) * 100) : 0;
                const avg = nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length) : null;
                return { col, filled, missing, pct, avg, belowKkm };
            });

            if (state.auditMissingKey && !evalRes.inputColumns.some(c => c.key === state.auditMissingKey)) {
                state.auditMissingKey = '';
            }

            const subjectCardsHtml = subjectStats.map(st => {
                const isSelectedMissing = state.auditMissingKey === st.col.key;
                const pctCls = st.pct === 100
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : st.pct > 0
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-rose-700 bg-rose-50 border-rose-200';

                return (
                    '<div class="p-3 rounded-xl border transition-all ' + (isSelectedMissing ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600' : 'border-slate-200 bg-white') + '">' +
                        '<div class="flex items-start justify-between gap-2">' +
                            '<div class="min-w-0">' +
                                '<div class="text-xs font-bold text-slate-900 truncate" title="' + esc(st.col.label) + '">' + esc(st.col.label) + '</div>' +
                                '<div class="text-[10px] font-mono text-slate-400">' + esc(st.col.key) + (st.col.kkm ? ' • KKM ' + st.col.kkm : '') + '</div>' +
                            '</div>' +
                            '<span class="px-2 py-0.5 rounded text-[10px] font-bold border tabular-nums shrink-0 ' + pctCls + '">' + st.pct + '%</span>' +
                        '</div>' +
                        '<div class="mt-2 flex items-center justify-between text-[11px] text-slate-600 tabular-nums">' +
                            '<span>Terisi: <b>' + st.filled + '/' + cohortAll.length + '</b></span>' +
                            (st.avg !== null ? '<span>Rerata: <b>' + st.avg.toFixed(1) + '</b></span>' : '<span></span>') +
                        '</div>' +
                        '<div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">' +
                            (st.belowKkm > 0
                                ? '<span class="text-[10px] font-bold text-rose-600"><i class="bi bi-exclamation-circle mr-0.5"></i>' + st.belowKkm + ' &lt; KKM</span>'
                                : '<span class="text-[10px] text-slate-400">' + (st.missing === 0 ? 'Semua santri terisi' : st.missing + ' belum diisi') + '</span>') +
                            (st.missing > 0
                                ? '<button type="button" onclick="toggleMissingSubjectFilter(\'' + esc(st.col.key) + '\')" class="px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap cursor-pointer ' +
                                    (isSelectedMissing ? 'bg-teal-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700') + '">' +
                                    (isSelectedMissing ? 'Reset Filter' : 'Cek ' + st.missing + ' Kosong') +
                                  '</button>'
                                : '<span class="text-[10px] font-bold text-emerald-600"><i class="bi bi-check-lg"></i> Tuntas</span>') +
                        '</div>' +
                    '</div>'
                );
            }).join('');

            // 2. Daftar Audit Kelengkapan per Santri
            const visibleStudents = getFilteredSantri(false).filter(s => {
                const info = evalRes.studentMap.get(s.id);
                const m = info ? info.meta : { filledCount: 0, expectedCount: 0 };
                if (state.auditStatusFilter === 'incomplete' && (m.filledCount >= m.expectedCount)) return false;
                if (state.auditStatusFilter === 'empty' && m.filledCount !== 0) return false;
                if (state.auditStatusFilter === 'complete' && !(m.expectedCount > 0 && m.filledCount >= m.expectedCount)) return false;
                if (state.auditMissingKey) {
                    const isMissing = m.missingCols.some(mc => mc.key === state.auditMissingKey);
                    if (!isMissing) return false;
                }
                return true;
            });

            const studentRowsHtml = visibleStudents.length === 0
                ? '<tr><td colspan="5" class="p-8 text-center text-xs text-slate-500">Tidak ada santri yang cocok dengan kriteria audit ini.</td></tr>'
                : visibleStudents.map((s, idx) => {
                      const info = evalRes.studentMap.get(s.id);
                      const m = info.meta;
                      const rNama = rombelById.get(s.rombelId)?.nama || '-';
                      let statusBadge = '<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">Lengkap 100%</span>';
                      if (m.filledCount === 0) {
                          statusBadge = '<span class="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">Belum Ada Nilai</span>';
                      } else if (m.filledCount < m.expectedCount) {
                          statusBadge = '<span class="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">' + m.filledCount + '/' + m.expectedCount + ' (' + m.percent + '%)</span>';
                      }

                      const missingPreview = m.missingCols.length === 0
                          ? '<span class="text-[11px] text-emerald-600 font-semibold"><i class="bi bi-check2-all mr-1"></i>Seluruh kolom telah terisi</span>'
                          : m.missingCols.slice(0, 5).map(mc =>
                                '<span class="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold mr-1 mb-1">' + esc(mc.label) + '</span>'
                            ).join('') +
                            (m.missingCols.length > 5
                                ? '<span class="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold mb-1">+' + (m.missingCols.length - 5) + ' lainnya</span>'
                                : '');

                      return (
                          '<tr class="hover:bg-slate-50 border-b border-slate-100">' +
                              '<td class="p-2.5 text-center text-xs text-slate-400 tabular-nums">' + (idx + 1) + '</td>' +
                              '<td class="p-2.5">' +
                                  '<div class="font-bold text-xs text-slate-900">' + esc(s.nama) + '</div>' +
                                  '<div class="text-[10px] text-slate-500">NIS: ' + esc(s.nis || '-') + ' • Rombel: <b>' + esc(rNama) + '</b></div>' +
                              '</td>' +
                              '<td class="p-2.5 whitespace-nowrap tabular-nums">' + statusBadge + '</td>' +
                              '<td class="p-2.5">' + missingPreview + '</td>' +
                              '<td class="p-2.5 text-right whitespace-nowrap">' +
                                  '<button type="button" onclick="openStudentModal(' + s.id + ')" class="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer">' +
                                      'Rincian' +
                                  '</button>' +
                              '</td>' +
                          '</tr>'
                      );
                  }).join('');

            const filterStatusBtn = (id, label) =>
                '<button type="button" onclick="setAuditStatusFilter(\'' + id + '\')" class="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ' +
                (state.auditStatusFilter === id
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700') + '">' + label + '</button>';

            container.innerHTML =
                '<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">' +
                    '<div class="flex flex-wrap items-center justify-between gap-2">' +
                        '<div>' +
                            '<h3 class="text-sm font-black text-slate-900">Audit Ketuntasan per Kolom / Mata Pelajaran</h3>' +
                            '<p class="text-xs text-slate-500">Template acuan: <b>' + esc(activeTemplate.name) + '</b> (' + evalRes.inputColumns.length + ' kolom input • ' + cohortAll.length + ' santri pada filter ini)</p>' +
                        '</div>' +
                        (state.auditMissingKey
                            ? '<button type="button" onclick="toggleMissingSubjectFilter(\'\')" class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"><i class="bi bi-x-circle mr-1"></i>Hapus Filter Mapel Kosong</button>'
                            : '') +
                    '</div>' +
                    '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">' + subjectCardsHtml + '</div>' +
                '</div>' +

                '<div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">' +
                    '<div class="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">' +
                        '<div>' +
                            '<h3 class="text-sm font-black text-slate-900">Daftar Audit Kelengkapan Santri (' + visibleStudents.length + ')</h3>' +
                            '<p class="text-xs text-slate-500">Menampilkan kolom mata pelajaran yang belum dikirim untuk masing-masing santri.</p>' +
                        '</div>' +
                        '<div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">' +
                            filterStatusBtn('all', 'Semua') +
                            filterStatusBtn('incomplete', 'Belum Lengkap') +
                            filterStatusBtn('empty', 'Kosong (0%)') +
                            filterStatusBtn('complete', 'Lengkap 100%') +
                        '</div>' +
                    '</div>' +
                    '<div class="overflow-x-auto">' +
                        '<table class="w-full text-left border-collapse">' +
                            '<thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">' +
                                '<tr>' +
                                    '<th class="p-2.5 w-12 text-center">No</th>' +
                                    '<th class="p-2.5 min-w-[200px]">Nama Santri</th>' +
                                    '<th class="p-2.5 w-36">Kelengkapan</th>' +
                                    '<th class="p-2.5">Kolom / Mapel yang Belum Terisi</th>' +
                                    '<th class="p-2.5 w-24 text-right">Aksi</th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody>' + studentRowsHtml + '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>';
        }

        // --- TAB 3: REKAP LEGER NILAI LENGKAP ---
        let lastLegerExportCache = null;

        function renderLegerView(gradesIndex) {
            const container = document.getElementById('view-leger');
            const activeTemplate = resolveActiveTemplateForLeger();
            if (!activeTemplate) {
                container.innerHTML = '<div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">Belum ada template rapor yang tersedia.</div>';
                return;
            }

            // Evaluasi cohort penuh pada cakupan filter (tanpa search agar RANK tetap akurat!)
            const cohortForRank = getFilteredSantri(true);
            const evalRes = evaluateCohortWithTemplate(cohortForRank, activeTemplate, gradesIndex);

            // Pastikan sheet filter valid
            const sheets = activeTemplate.sheets || [];
            if (state.activeSheetId !== 'all' && !sheets.some(s => s.id === state.activeSheetId)) {
                state.activeSheetId = 'all';
            }

            const visibleColumns = evalRes.allColumns.filter(c =>
                state.activeSheetId === 'all' ? true : c.sheetId === state.activeSheetId
            );

            // Filter pencarian & urutkan
            let displayStudents = getFilteredSantri(false);
            displayStudents = [...displayStudents].sort((a, b) => {
                if (state.sortBy === 'name') {
                    return a.nama.localeCompare(b.nama);
                }
                if (state.sortBy === 'nis') {
                    return (a.nis || '').localeCompare(b.nis || '');
                }
                if (state.sortBy === 'avg_desc') {
                    const avgA = evalRes.studentMap.get(a.id)?.meta.avgScore ?? -1;
                    const avgB = evalRes.studentMap.get(b.id)?.meta.avgScore ?? -1;
                    if (avgB !== avgA) return avgB - avgA;
                    return a.nama.localeCompare(b.nama);
                }
                // Default: rombel_name
                const rA = rombelById.get(a.rombelId)?.nama || '';
                const rB = rombelById.get(b.rombelId)?.nama || '';
                return rA.localeCompare(rB) || a.nama.localeCompare(b.nama);
            });

            // Simpan ke cache untuk Export CSV
            lastLegerExportCache = {
                template: activeTemplate,
                columns: visibleColumns,
                students: displayStudents,
                studentMap: evalRes.studentMap
            };

            // Update Print Header
            document.getElementById('print-pondok-name').textContent = PONDOK.nama || 'Pondok Pesantren';
            const rombelTitle = state.rombelId > 0 ? ('Rombel ' + (rombelById.get(Number(state.rombelId))?.nama || '')) : 'Rekap Gabungan';
            document.getElementById('print-subtitle').textContent =
                'LEGER NILAI RAPOR • ' + activeTemplate.name + ' • ' + rombelTitle + ' • ' + state.tahunAjaran + ' (' + state.semester + ')';

            // Sheet Tabs HTML (bila multi-sheet)
            const sheetTabsHtml = sheets.length > 1
                ? '<div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 no-print">' +
                    '<button type="button" onclick="setLegerSheet(\'all\')" class="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ' +
                        (state.activeSheetId === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50') + '">' +
                        'Semua Lembar (' + evalRes.allColumns.length + ')' +
                    '</button>' +
                    sheets.map(sh =>
                        '<button type="button" onclick="setLegerSheet(\'' + esc(sh.id) + '\')" class="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ' +
                        (state.activeSheetId === sh.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50') + '">' +
                        esc(sh.name) +
                        '</button>'
                    ).join('') +
                  '</div>'
                : '';

            // Toolbar Leger
            const toolbarHtml =
                '<div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 no-print">' +
                    '<div class="flex items-center gap-2 flex-wrap">' +
                        '<div class="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">' +
                            '<button type="button" onclick="setLegerDisplayMode(\'table\')" class="px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap cursor-pointer ' +
                                (state.legerDisplayMode === 'table' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600') + '">' +
                                '<i class="bi bi-table mr-1"></i>Tabel' +
                            '</button>' +
                            '<button type="button" onclick="setLegerDisplayMode(\'card\')" class="px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap cursor-pointer ' +
                                (state.legerDisplayMode === 'card' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600') + '">' +
                                '<i class="bi bi-person-vcard mr-1"></i>Kartu HP' +
                            '</button>' +
                        '</div>' +

                        (state.legerDisplayMode === 'table'
                            ? '<button type="button" onclick="toggleFreezeCols()" class="px-2.5 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap cursor-pointer ' +
                                (state.freezeCols ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-white border-slate-200 text-slate-600') + '">' +
                                '<i class="bi bi-pin-angle-fill mr-1"></i>' + (state.freezeCols ? 'Kolom Terkunci' : 'Kunci Kolom') +
                              '</button>'
                            : '') +

                        '<select onchange="setDecimalMode(this.value)" class="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-700 outline-none">' +
                            '<option value="auto"' + (state.decimalMode === 'auto' ? ' selected' : '') + '>Desimal: Otomatis</option>' +
                            '<option value="0"' + (state.decimalMode === '0' ? ' selected' : '') + '>Bulat (0 Desimal)</option>' +
                            '<option value="1"' + (state.decimalMode === '1' ? ' selected' : '') + '>1 Desimal (0.0)</option>' +
                            '<option value="2"' + (state.decimalMode === '2' ? ' selected' : '') + '>2 Desimal (0.00)</option>' +
                        '</select>' +

                        '<select onchange="setLegerSort(this.value)" class="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-700 outline-none">' +
                            '<option value="rombel_name"' + (state.sortBy === 'rombel_name' ? ' selected' : '') + '>Urut: Rombel &amp; Nama</option>' +
                            '<option value="avg_desc"' + (state.sortBy === 'avg_desc' ? ' selected' : '') + '>Urut: Rerata Tertinggi</option>' +
                            '<option value="name"' + (state.sortBy === 'name' ? ' selected' : '') + '>Urut: Nama A–Z</option>' +
                            '<option value="nis"' + (state.sortBy === 'nis' ? ' selected' : '') + '>Urut: NIS</option>' +
                        '</select>' +
                    '</div>' +

                    '<div class="flex items-center gap-2">' +
                        '<button type="button" onclick="exportLegerCsv()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer">' +
                            '<i class="bi bi-file-earmark-excel-fill"></i><span>Unduh CSV / Excel</span>' +
                        '</button>' +
                        '<button type="button" onclick="window.print()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer">' +
                            '<i class="bi bi-printer-fill"></i><span>Cetak / PDF</span>' +
                        '</button>' +
                    '</div>' +
                '</div>';

            if (displayStudents.length === 0) {
                container.innerHTML = sheetTabsHtml + toolbarHtml +
                    '<div class="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">Tidak ada santri pada filter yang dipilih.</div>';
                return;
            }

            // Mode Kartu Santri (nyaman di layar HP)
            if (state.legerDisplayMode === 'card') {
                const cards = displayStudents.map((s, idx) => {
                    const info = evalRes.studentMap.get(s.id);
                    const vals = info.values;
                    const m = info.meta;
                    const rNama = rombelById.get(s.rombelId)?.nama || '-';

                    const itemsHtml = visibleColumns.map(col => {
                        const rawVal = vals[col.key];
                        const disp = (rawVal === '' || rawVal === undefined || rawVal === null) ? '-' : String(rawVal);
                        const numVal = Number(String(disp).replace(',', '.'));
                        const isUnderKkm = col.isNumericScore && col.kkm && disp !== '-' && !isNaN(numVal) && numVal < col.kkm;
                        const valCls = col.type === 'formula'
                            ? 'text-amber-900 font-black'
                            : isUnderKkm
                            ? 'text-rose-700 font-black'
                            : 'text-slate-900 font-bold';

                        return (
                            '<div class="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-b-0 gap-2">' +
                                '<span class="text-xs text-slate-600 truncate">' + esc(col.label) + '</span>' +
                                '<span class="text-xs tabular-nums shrink-0 ' + valCls + '">' + esc(disp) + '</span>' +
                            '</div>'
                        );
                    }).join('');

                    return (
                        '<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">' +
                            '<div class="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">' +
                                '<div>' +
                                    '<div class="text-xs font-black text-slate-900">' + (idx + 1) + '. ' + esc(s.nama) + '</div>' +
                                    '<div class="text-[11px] text-slate-500">NIS: ' + esc(s.nis || '-') + ' • Rombel: <b>' + esc(rNama) + '</b></div>' +
                                '</div>' +
                                '<span class="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold tabular-nums shrink-0">' +
                                    m.filledCount + '/' + m.expectedCount +
                                '</span>' +
                            '</div>' +
                            '<div class="divide-y divide-slate-50">' + itemsHtml + '</div>' +
                        '</div>'
                    );
                }).join('');

                container.innerHTML = sheetTabsHtml + toolbarHtml +
                    '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' + cards + '</div>';
                return;
            }

            // Mode Tabel Leger Spreadsheet
            const theadCols = visibleColumns.map(col => {
                const isFormula = col.type === 'formula';
                const thBg = isFormula ? 'bg-amber-50/90 text-amber-950' : 'bg-slate-100 text-slate-800';
                return (
                    '<th class="' + thBg + ' text-center min-w-[105px]">' +
                        '<div class="text-[11px] font-bold leading-tight">' + esc(col.label) + '</div>' +
                        '<div class="text-[9px] font-mono text-slate-500 mt-0.5">' +
                            esc(col.key) + (col.kkm ? ' • KKM ' + col.kkm : (isFormula ? ' • RUMUS' : '')) +
                        '</div>' +
                    '</th>'
                );
            }).join('');

            let currentRombelGroup = -1;
            const showGroupRows = state.rombelId === 0 && state.sortBy === 'rombel_name';
            let tbodyRows = '';

            displayStudents.forEach((s, idx) => {
                const rNama = rombelById.get(s.rombelId)?.nama || 'Tanpa Rombel';
                if (showGroupRows && s.rombelId !== currentRombelGroup) {
                    currentRombelGroup = s.rombelId;
                    tbodyRows +=
                        '<tr class="bg-teal-800 text-white">' +
                            '<td colspan="' + (visibleColumns.length + 4) + '" class="py-2 px-3 text-xs font-bold">' +
                                '<i class="bi bi-people-fill mr-1.5"></i>ROMBEL: ' + esc(rNama) +
                            '</td>' +
                        '</tr>';
                }

                const info = evalRes.studentMap.get(s.id);
                const vals = info.values;
                const m = info.meta;

                const cellsHtml = visibleColumns.map(col => {
                    const rawVal = vals[col.key];
                    const disp = (rawVal === '' || rawVal === undefined || rawVal === null) ? '-' : String(rawVal);
                    const isFormula = col.type === 'formula';
                    const numVal = Number(String(disp).replace(',', '.'));
                    const isUnderKkm = !isFormula && col.isNumericScore && col.kkm && disp !== '-' && !isNaN(numVal) && numVal < col.kkm;

                    let tdCls = 'text-center tabular-nums ';
                    if (isFormula) tdCls += 'bg-amber-50/40 font-black text-amber-950';
                    else if (isUnderKkm) tdCls += 'bg-rose-50/70 font-bold text-rose-700';
                    else if (disp === '-') tdCls += 'text-slate-300';
                    else tdCls += 'font-semibold text-slate-800';

                    if (col.isLongText) {
                        return '<td class="text-left text-[11px] max-w-[220px] truncate text-slate-700" title="' + esc(disp) + '">' + esc(disp) + '</td>';
                    }
                    return '<td class="' + tdCls + '">' + esc(disp) + '</td>';
                }).join('');

                tbodyRows +=
                    '<tr class="hover:bg-slate-50/90">' +
                        '<td class="col-sticky-no bg-slate-50 text-center text-slate-500 font-semibold tabular-nums">' + (idx + 1) + '</td>' +
                        '<td class="col-sticky-name bg-white font-bold text-slate-900">' +
                            '<button type="button" onclick="openStudentModal(' + s.id + ')" class="text-left hover:text-teal-700 cursor-pointer w-full truncate block" title="Klik untuk rincian ' + esc(s.nama) + '">' +
                                esc(s.nama) +
                            '</button>' +
                            (state.rombelId === 0 ? '<div class="text-[10px] font-normal text-slate-400">' + esc(rNama) + '</div>' : '') +
                        '</td>' +
                        '<td class="text-center font-mono text-[11px] text-slate-500 whitespace-nowrap">' + esc(s.nis || '-') + '</td>' +
                        '<td class="text-center tabular-nums whitespace-nowrap">' +
                            '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold ' +
                                (m.filledCount === 0 ? 'bg-rose-50 text-rose-700' : m.filledCount >= m.expectedCount ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700') + '">' +
                                m.filledCount + '/' + m.expectedCount +
                            '</span>' +
                        '</td>' +
                        cellsHtml +
                    '</tr>';
            });

            container.innerHTML =
                sheetTabsHtml +
                toolbarHtml +
                '<div class="leger-scroll-wrap shadow-2xs">' +
                    '<table class="leger-table ' + (state.freezeCols ? 'freeze-cols' : '') + '">' +
                        '<thead>' +
                            '<tr>' +
                                '<th class="col-sticky-no text-center text-slate-700 font-bold">No</th>' +
                                '<th class="col-sticky-name text-left text-slate-800 font-bold">Nama Santri</th>' +
                                '<th class="text-center text-slate-600 font-bold w-24">NIS</th>' +
                                '<th class="text-center text-slate-600 font-bold w-20">Input</th>' +
                                theadCols +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>' + tbodyRows + '</tbody>' +
                    '</table>' +
                '</div>';
        }

        // --- FETCH LIVE DARI GOOGLE APPS SCRIPT ---
        async function fetchLiveFromGas(manualClick) {
            const statusText = document.getElementById('sync-status-text');
            const icon = document.getElementById('refresh-icon');
            const btn = document.getElementById('btn-refresh-live');

            if (!GAS_URL) {
                statusText.textContent = BASELINE_ROWS.length > 0
                    ? 'Mode Snapshot Lokal (' + BASELINE_ROWS.length + ' data)'
                    : 'Link GAS belum disematkan';
                if (manualClick) {
                    showPortalToast('File portal ini dibuat tanpa Link Google Apps Script.', 'info');
                }
                return;
            }

            if (state.isFetching) return;
            state.isFetching = true;
            if (icon) icon.classList.add('animate-spin');
            if (btn) btn.disabled = true;
            statusText.textContent = 'Menarik data live dari Cloud...';

            try {
                // PENTING: Tanpa custom header agar tetap CORS Simple Request pada Google Apps Script
                const res = await fetch(GAS_URL, { method: 'GET' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const json = await res.json();
                const rows = Array.isArray(json) ? json : (json && Array.isArray(json.records) ? json.records : []);
                state.liveRows = rows;
                state.lastSyncAt = new Date();
                const timeLabel = state.lastSyncAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                statusText.textContent = 'Live Cloud Aktif • ' + timeLabel + ' (' + rows.length + ' entri)';
                renderAll();
                if (manualClick) {
                    showPortalToast('Data live berhasil diperbarui (' + rows.length + ' baris kiriman).', 'success');
                }
            } catch (err) {
                statusText.textContent = BASELINE_ROWS.length > 0
                    ? 'Offline • Memakai Snapshot Awal'
                    : 'Gagal terhubung ke Cloud';
                if (manualClick) {
                    showPortalToast('Gagal memuat dari Google Sheet: ' + err.message, 'error');
                }
            } finally {
                state.isFetching = false;
                if (icon) icon.classList.remove('animate-spin');
                if (btn) btn.disabled = false;
            }
        }

        // --- MODAL DETAIL SANTRI ---
        window.openStudentModal = function(santriId) {
            const s = santriById.get(Number(santriId));
            if (!s) return;
            const rombel = rombelById.get(s.rombelId);
            const tpl = resolveTemplateForRombel(rombel) || resolveActiveTemplateForLeger();
            const gradesIndex = buildMergedGradesIndex();
            const cohort = SANTRI_LIST.filter(x => Number(x.rombelId) === Number(s.rombelId));
            const evalRes = evaluateCohortWithTemplate(cohort.length > 0 ? cohort : [s], tpl, gradesIndex);
            const info = evalRes.studentMap.get(s.id);
            if (!info) return;

            document.getElementById('modal-santri-name').textContent = s.nama;
            document.getElementById('modal-santri-sub').textContent =
                'NIS: ' + (s.nis || '-') + ' • Rombel: ' + (rombel?.nama || '-') + ' • ' + (tpl?.name || '');

            const m = info.meta;
            const missingHtml = m.missingCols.length > 0
                ? '<div class="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">' +
                    '<div class="font-bold text-rose-800"><i class="bi bi-exclamation-triangle-fill mr-1"></i>Belum Diisi (' + m.missingCols.length + ' Kolom):</div>' +
                    '<div class="flex flex-wrap gap-1">' +
                        m.missingCols.map(mc => '<span class="px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-700 text-[11px] font-semibold">' + esc(mc.label) + '</span>').join('') +
                    '</div>' +
                  '</div>'
                : '<div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-800"><i class="bi bi-check-circle-fill mr-1"></i>Seluruh kolom input pada template ini telah lengkap.</div>';

            const rowsHtml = evalRes.allColumns.map(col => {
                const v = info.values[col.key];
                const disp = (v === '' || v === undefined || v === null) ? '-' : String(v);
                const isF = col.type === 'formula';
                return (
                    '<tr class="border-b border-slate-100 ' + (isF ? 'bg-amber-50/50' : '') + '">' +
                        '<td class="py-2 px-2.5 font-semibold text-slate-700">' + esc(col.label) + '</td>' +
                        '<td class="py-2 px-2.5 font-mono text-[10px] text-slate-400">' + esc(col.key) + '</td>' +
                        '<td class="py-2 px-2.5 text-right tabular-nums ' + (isF ? 'font-black text-amber-950' : 'font-bold text-slate-900') + '">' + esc(disp) + '</td>' +
                    '</tr>'
                );
            }).join('');

            document.getElementById('modal-santri-body').innerHTML =
                missingHtml +
                '<div class="border border-slate-200 rounded-xl overflow-hidden">' +
                    '<table class="w-full text-left border-collapse">' +
                        '<thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">' +
                            '<tr><th class="py-2 px-2.5">Mata Pelajaran / Kolom</th><th class="py-2 px-2.5">Kode</th><th class="py-2 px-2.5 text-right">Nilai</th></tr>' +
                        '</thead>' +
                        '<tbody>' + rowsHtml + '</tbody>' +
                    '</table>' +
                '</div>';

            document.getElementById('student-modal').style.display = 'flex';
        };

        window.closeStudentModal = function() {
            document.getElementById('student-modal').style.display = 'none';
        };

        // --- EXPORT CSV / EXCEL ---
        window.exportLegerCsv = function() {
            if (!lastLegerExportCache || !lastLegerExportCache.students.length) {
                showPortalToast('Tidak ada data leger untuk diekspor.', 'error');
                return;
            }
            const { template, columns, students, studentMap } = lastLegerExportCache;
            const csvEscape = (val) => {
                const s = String(val ?? '');
                if (s.includes('"') || s.includes(',') || s.includes(';') || s.includes('\n')) {
                    return '"' + s.replace(/"/g, '""') + '"';
                }
                return s;
            };

            const headers = ['No', 'NIS', 'Nama Santri', 'Rombel', 'Kelengkapan', ...columns.map(c => c.label + ' (' + c.key + ')')];
            const lines = [headers.map(csvEscape).join(',')];

            students.forEach((s, idx) => {
                const info = studentMap.get(s.id);
                const rNama = rombelById.get(s.rombelId)?.nama || '';
                const row = [
                    idx + 1,
                    s.nis || '',
                    s.nama,
                    rNama,
                    info.meta.filledCount + '/' + info.meta.expectedCount,
                    ...columns.map(c => {
                        const v = info.values[c.key];
                        return (v === '' || v === undefined || v === null) ? '' : v;
                    })
                ];
                lines.push(row.map(csvEscape).join(','));
            });

            // UTF-8 BOM agar Excel langsung membaca karakter Arab & Indonesia dengan rapi
            const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeName = (template.name || 'leger').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            a.href = url;
            a.download = 'rekap-leger-' + safeName + '-' + state.tahunAjaran.replace(/[^0-9]/g, '-') + '-' + state.semester.toLowerCase() + '.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showPortalToast('File CSV/Excel berhasil diunduh.', 'success');
        };

        // --- INTERAKSI UI ---
        window.fetchLiveFromGas = fetchLiveFromGas;
        window.switchTab = function(tab) {
            state.activeTab = tab;
            renderAll();
        };
        window.jumpToRombelView = function(rombelId, targetTab) {
            const r = rombelById.get(Number(rombelId));
            if (r) {
                state.jenjangId = Number(r.jenjangId);
                state.kelasId = Number(r.kelasId);
                state.rombelId = Number(r.id);
            }
            state.activeTab = targetTab;
            renderAll();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        window.onFilterChange = function(kind) {
            if (kind === 'tahun') state.tahunAjaran = document.getElementById('f-tahun').value;
            if (kind === 'semester') state.semester = document.getElementById('f-semester').value;
            if (kind === 'template') {
                state.templateId = document.getElementById('f-template').value;
                state.activeSheetId = 'all';
            }
            if (kind === 'jenjang') {
                state.jenjangId = Number(document.getElementById('f-jenjang').value) || 0;
                state.kelasId = 0;
                state.rombelId = 0;
            }
            if (kind === 'kelas') {
                state.kelasId = Number(document.getElementById('f-kelas').value) || 0;
                state.rombelId = 0;
            }
            if (kind === 'rombel') {
                state.rombelId = Number(document.getElementById('f-rombel').value) || 0;
            }
            renderAll();
        };
        window.onSearchInput = function(val) {
            state.search = val || '';
            const clearBtn = document.getElementById('btn-clear-search');
            if (clearBtn) clearBtn.style.display = state.search ? 'block' : 'none';
            renderAll();
        };
        window.clearSearch = function() {
            state.search = '';
            const input = document.getElementById('f-search');
            if (input) input.value = '';
            const clearBtn = document.getElementById('btn-clear-search');
            if (clearBtn) clearBtn.style.display = 'none';
            renderAll();
        };
        window.setAuditStatusFilter = function(val) {
            state.auditStatusFilter = val;
            renderAll();
        };
        window.toggleMissingSubjectFilter = function(key) {
            state.auditMissingKey = (state.auditMissingKey === key) ? '' : key;
            renderAll();
        };
        window.setLegerSheet = function(sheetId) {
            state.activeSheetId = sheetId;
            renderAll();
        };
        window.setLegerDisplayMode = function(mode) {
            state.legerDisplayMode = mode;
            renderAll();
        };
        window.toggleFreezeCols = function() {
            state.freezeCols = !state.freezeCols;
            renderAll();
        };
        window.setDecimalMode = function(mode) {
            state.decimalMode = mode;
            renderAll();
        };
        window.setLegerSort = function(sortBy) {
            state.sortBy = sortBy;
            renderAll();
        };

        // --- INISIALISASI HEADER & AUTO-LOAD ---
        document.getElementById('pondok-title').textContent = PONDOK.nama || 'Portal Audit & Rekap Leger';
        document.getElementById('scope-badge').textContent = PONDOK.scopeLabel || '';
        if (PONDOK.logoUrl) {
            const box = document.getElementById('pondok-logo-box');
            if (box) {
                box.innerHTML = '<img src="' + esc(PONDOK.logoUrl) + '" alt="Logo" class="w-full h-full object-contain bg-white p-0.5" />';
            }
        }

        renderAll();
        fetchLiveFromGas(false);
    })();
    </script>
</body>
</html>`;
};
