import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { PsbConfig, PondokSettings, PsbDesignStyle, PsbFormTemplate, PsbSubmissionMethod } from '../../types';
import { CustomFieldEditor } from './common/CustomFieldEditor';
import { getStandaloneDocumentStyles, getStandaloneDocumentStylesSync } from '../../utils/standaloneStyles';
import { PSB_STANDARD_FIELD_GROUPS, PSB_DEFAULT_FIELD_HINTS } from './utils/psbUtils';

interface PsbFormBuilderProps {
    config: PsbConfig;
    settings: PondokSettings;
    onSave: (c: PsbConfig) => void;
}

export const PsbFormBuilder: React.FC<PsbFormBuilderProps> = ({ config, settings, onSave }) => {
    const { showToast, showConfirmation } = useAppContext();
    const normalizeSubmissionMethod = (method?: PsbSubmissionMethod): PsbSubmissionMethod => {
        if (method === 'portal') return 'hybrid';
        return method || 'whatsapp';
    };
    const isScriptUrlValid = (url: string) => /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(url.trim());
    const [localConfig, setLocalConfig] = useState<PsbConfig>({
        ...config,
        // Backward compatibility: If undefined, assume all active fields are required (old behavior) or init empty
        requiredStandardFields: config.requiredStandardFields || config.activeFields,
        registrationDeadline: config.registrationDeadline || ''
    });
    
    const [templateName, setTemplateName] = useState('');
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [newDoc, setNewDoc] = useState('');
    
    // State for submission method
    const [submissionMethod, setSubmissionMethod] = useState<PsbSubmissionMethod>(normalizeSubmissionMethod(config.submissionMethod));
    const [googleScriptUrl, setGoogleScriptUrl] = useState(config.googleScriptUrl || '');
    const [showScriptHelper, setShowScriptHelper] = useState(false);
    const [copiedScript, setCopiedScript] = useState(false);
    const [manualZoom, setManualZoom] = useState(1);
    const [mobileTab, setMobileTab] = useState<'config' | 'preview'>('config');

    const styles: {id: PsbDesignStyle, label: string}[] = [
        { id: 'classic', label: 'Klasik Tradisional' },
        { id: 'modern', label: 'Modern Tech' },
        { id: 'bold', label: 'Bold & Clean' },
        { id: 'dark', label: 'Premium Dark' },
        { id: 'ceria', label: 'Ceria (TPQ/TK)' }
    ];

    // Shared standard field definitions and hints
    const DEFAULT_FIELD_HINTS = PSB_DEFAULT_FIELD_HINTS;
    const fieldGroups = PSB_STANDARD_FIELD_GROUPS;

    const toggleField = (key: string) => {
        const currentActive = localConfig.activeFields;
        const currentRequired = localConfig.requiredStandardFields || [];
        
        let nextActive: string[];
        let nextRequired: string[];

        if (currentActive.includes(key)) {
            // Remove
            nextActive = currentActive.filter(k => k !== key);
            nextRequired = currentRequired.filter(k => k !== key);
        } else {
            // Add (Default to required for UX consistency, can be unchecked)
            nextActive = [...currentActive, key];
            nextRequired = [...currentRequired, key];
        }
        
        setLocalConfig({ 
            ...localConfig, 
            activeFields: nextActive,
            requiredStandardFields: nextRequired 
        });
    };

    const toggleRequired = (key: string) => {
        const current = localConfig.requiredStandardFields || [];
        const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
        setLocalConfig({ ...localConfig, requiredStandardFields: next });
    };

    const addDocument = () => {
        if (!newDoc.trim()) return;
        setLocalConfig({ ...localConfig, requiredDocuments: [...localConfig.requiredDocuments, newDoc.trim()] });
        setNewDoc('');
    };

    const removeDocument = (index: number) => {
        const updated = localConfig.requiredDocuments.filter((_, i) => i !== index);
        setLocalConfig({ ...localConfig, requiredDocuments: updated });
    };

    // Save Logic wrapper to include new fields
    const handleFinalSave = () => {
        if (submissionMethod !== 'whatsapp' && !isScriptUrlValid(googleScriptUrl)) {
            showToast('URL Google Script belum valid. Gunakan link deployment yang berakhiran /exec.', 'error');
            return;
        }
        const configToSave = {
            ...localConfig,
            submissionMethod: normalizeSubmissionMethod(submissionMethod),
            googleScriptUrl
        };
        onSave(configToSave);
    }

    const handleSaveTemplate = () => {
        if (!templateName.trim()) {
            showToast('Nama formulir/template tidak boleh kosong.', 'error');
            return;
        }
        if (submissionMethod !== 'whatsapp' && !isScriptUrlValid(googleScriptUrl)) {
            showToast('URL Google Script belum valid. Simpan template dibatalkan.', 'error');
            return;
        }

        const isNew = !activeTemplateId;
        const newTemplate: PsbFormTemplate = {
            id: activeTemplateId || 'tpl_' + Date.now(),
            name: templateName.trim(),
            targetJenjangId: localConfig.targetJenjangId,
            designStyle: localConfig.designStyle,
            activeFields: localConfig.activeFields,
            requiredStandardFields: localConfig.requiredStandardFields, // Save required state
            requiredDocuments: localConfig.requiredDocuments,
            customFields: localConfig.customFields || [],
            submissionMethod: normalizeSubmissionMethod(submissionMethod),
            googleScriptUrl,
            fieldHints: localConfig.fieldHints ? { ...localConfig.fieldHints } : {}
        };

        let updatedTemplates;
        if (isNew) {
            updatedTemplates = [...(localConfig.templates || []), newTemplate];
            setActiveTemplateId(newTemplate.id);
        } else {
            updatedTemplates = (localConfig.templates || []).map(t => t.id === activeTemplateId ? newTemplate : t);
        }

        const newConfig = { ...localConfig, templates: updatedTemplates };
        setLocalConfig(newConfig);
        onSave(newConfig); 
        showToast(isNew ? 'Template baru disimpan.' : 'Perubahan template disimpan.', 'success');
    };

    const handleLoadTemplate = (templateId: string) => {
        const tpl = localConfig.templates?.find(t => t.id === templateId);
        if (tpl) {
            showConfirmation('Muat Formulir?', `Konfigurasi saat ini akan ditimpa dengan data dari "${tpl.name}".`, () => {
                setLocalConfig(prev => ({
                    ...prev,
                    targetJenjangId: tpl.targetJenjangId,
                    designStyle: tpl.designStyle || prev.designStyle,
                    activeFields: [...tpl.activeFields],
                    requiredStandardFields: tpl.requiredStandardFields ? [...tpl.requiredStandardFields] : [...tpl.activeFields],
                    requiredDocuments: [...tpl.requiredDocuments],
                    customFields: [...(tpl.customFields || [])],
                    fieldHints: tpl.fieldHints ? { ...tpl.fieldHints } : prev.fieldHints,
                    templates: prev.templates
                }));
                // Update specific states for method
                setSubmissionMethod(normalizeSubmissionMethod(tpl.submissionMethod));
                setGoogleScriptUrl(tpl.googleScriptUrl || '');
                
                setTemplateName(tpl.name);
                setActiveTemplateId(tpl.id);
                showToast(`Formulir "${tpl.name}" dimuat.`, 'success');
            }, { confirmColor: 'blue', confirmText: 'Ya, Muat' });
        }
    };

    const handleDeleteTemplate = (templateId: string) => {
        const tplName = localConfig.templates?.find(t => t.id === templateId)?.name;
        showConfirmation('Hapus Formulir?', `Hapus arsip "${tplName}"?`, () => {
            const updatedTemplates = (localConfig.templates || []).filter(t => t.id !== templateId);
            const newConfig = { ...localConfig, templates: updatedTemplates };
            setLocalConfig(newConfig);
            onSave(newConfig);
            if (activeTemplateId === templateId) {
                setActiveTemplateId(null);
                setTemplateName('');
            }
        }, { confirmColor: 'red' });
    };

    const handleResetSelection = () => {
        setActiveTemplateId(null);
        setTemplateName('');
        // We keep the current config values so user can "Clone" or "Save As" easily
        showToast('Mode template baru. Silakan beri nama baru untuk menyimpan sebagai salinan.', 'info');
    };

    const handleCopyGasScript = () => {
        navigator.clipboard.writeText(googleAppsScriptCode.trim());
        setCopiedScript(true);
        showToast('Kode Script GAS (Code.gs) berhasil disalin ke clipboard!', 'success');
        setTimeout(() => setCopiedScript(false), 2500);
    };

    const googleAppsScriptCode = `/* GOOGLE APPS SCRIPT FOR ESANTRI WEB - SMART VERSION */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var combinedData = [];
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var rows = sheet.getDataRange().getValues();
    if (rows.length < 2) continue;
    var headers = rows[0];
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var record = {};
      for (var j = 0; j < headers.length; j++) record[headers[j]] = row[j];
      combinedData.push(record);
    }
  }
  return ContentService.createTextOutput(JSON.stringify(combinedData)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data;
    
    // Handle text/plain or application/json
    if (e.postData.type === "application/json" || e.postData.type === "text/plain") {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
    
    var sheetName = data.sheetName || "Pendaftar Baru";
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = ["Timestamp", "namaLengkap", "nisn", "nik", "jenisKelamin", "tempatLahir", "tanggalLahir", "alamat", "namaWali", "nomorHpWali", "jenjangId", "asalSekolah", "jalurPendaftaran", "catatan", "status"];
      for (var key in data) {
         if (headers.indexOf(key) === -1 && key !== 'sheetName') headers.push(key);
      }
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = [];
    var nextRow = sheet.getLastRow() + 1;
    
    var folderId = "GANTI_DENGAN_ID_FOLDER_DRIVE_ANDA"; // Optional
    
    function toSlug(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
    }
    
    function detectDocPrefix(fieldKey, originalName, fieldLabel) {
      var source = String(fieldKey || '') + ' ' + String(originalName || '') + ' ' + String(fieldLabel || '');
      source = source.toLowerCase();
      if (source.indexOf('kartu keluarga') !== -1 || source.indexOf(' kk') !== -1 || source.indexOf('kk ') !== -1 || source === 'kk') return 'kk';
      if (source.indexOf('akta') !== -1) return 'akta';
      if (source.indexOf('ijazah') !== -1) return 'ijazah';
      if (source.indexOf('rapor') !== -1 || source.indexOf('raport') !== -1) return 'rapor';
      if (source.indexOf('pasfoto') !== -1 || source.indexOf('foto') !== -1) return 'foto';
      if (source.indexOf('kip') !== -1) return 'kip';
      if (source.indexOf('ktp') !== -1) return 'ktp';
      return 'dokumen';
    }
    
    function extractExtension(fileName, mimeType) {
      var original = String(fileName || '');
      var dotIndex = original.lastIndexOf('.');
      if (dotIndex > -1 && dotIndex < original.length - 1) {
        return original.substring(dotIndex).toLowerCase();
      }
      if (mimeType === 'application/pdf') return '.pdf';
      if (mimeType === 'image/jpeg') return '.jpg';
      if (mimeType === 'image/png') return '.png';
      return '';
    }
    
    function buildSmartFileName(fieldKey, fileData, payload) {
      var santriName = payload.namaLengkap || payload.namaSantri || payload.nama || 'santri';
      var prefix = detectDocPrefix(fieldKey, fileData.name, fileData.fieldLabel);
      var safeName = toSlug(santriName) || 'santri';
      var ext = extractExtension(fileData.name, fileData.mime);
      var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
      return prefix + '-' + safeName + '-' + stamp + ext;
    }
    
    for (var key in data) {
        if (typeof data[key] === 'object' && data[key] !== null && data[key].isFile) {
            var fileData = data[key];
            var smartName = buildSmartFileName(key, fileData, data);
            var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data.split(',')[1]), fileData.mime, smartName);
            var file;
            if (folderId && folderId !== "GANTI_DENGAN_ID_FOLDER_DRIVE_ANDA") {
                 file = DriveApp.getFolderById(folderId).createFile(blob);
            } else {
                 file = DriveApp.createFile(blob);
            }
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            data[key] = file.getUrl();
        }
    }
    data.Timestamp = new Date();

    for (var i = 0; i < headers.length; i++) {
        newRow.push(data[headers[i]] || "");
    }
    
    for (var key in data) {
        if (headers.indexOf(key) === -1 && key !== 'sheetName') {
            var newCol = headers.length + 1;
            sheet.getRange(1, newCol).setValue(key);
            newRow[newCol-1] = data[key]; 
            headers.push(key); 
        }
    }
    
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    return ContentService.createTextOutput(JSON.stringify({result: "success", row: nextRow})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}
`;

    const generateHtml = (isForPreview = false) => {
        const standaloneStyles = getStandaloneDocumentStylesSync();
        const style = localConfig.designStyle || 'classic';
        const targetJenjang = settings.jenjang.find((j) => j.id === localConfig.targetJenjangId);
        const jenjangName = targetJenjang ? targetJenjang.nama : 'Umum';
        const targetSheetName = templateName ? templateName : `Pendaftar ${jenjangName}`;
        
        // Helper to generate inputs based on theme
        const renderInput = (label: string, name: string, type: string = 'text', placeholder: string = '', required: boolean = false, hint: string = '') => {
            const commonPrint = `border-none border-b border-gray-400 bg-transparent rounded-none px-0`;
            const reqStar = required ? '<span class="text-red-500">*</span>' : '';
            const reqAttr = required ? 'required' : '';
            const hintHtml = hint ? `<p class="text-[11px] text-gray-500 mb-1.5 italic font-normal print:text-gray-600 print:text-[10px] leading-snug">${hint}</p>` : '';

            // Handling file input logic
            if (type === 'file') {
                if (submissionMethod === 'whatsapp') {
                    // Plain WA method: Cannot send files easily
                    return `
                    <div class="mb-4 break-inside-avoid">
                        <label class="block text-gray-600 text-sm font-bold mb-0.5 print:text-black">${label} ${reqStar}</label>
                        ${hintHtml}
                        <div class="p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                            <i class="bi bi-info-circle-fill"></i> Lampirkan file ini secara manual di chat WhatsApp setelah klik Kirim.
                        </div>
                    </div>`;
                } else {
                    // Google Sheet OR Hybrid mode: Use real file input for Drive upload
                    return `
                    <div class="mb-4 break-inside-avoid">
                        <label class="block text-gray-600 text-sm font-bold mb-0.5 print:text-black">${label} ${reqStar}</label>
                        ${hintHtml}
                        <input type="file" name="${name}" accept="image/*,application/pdf" ${reqAttr} class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" />
                        <p class="text-[10px] text-gray-400 mt-1">Maks 5MB. PDF atau Foto.</p>
                    </div>`;
                }
            }

            // Standard Inputs
             if (style === 'classic') {
                return `
                <div class="mb-5 break-inside-avoid">
                    <label class="block text-[#1B4D3E] text-sm font-bold mb-0.5 print:text-black font-serif">${label} ${reqStar}</label>
                    ${hintHtml}
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full border-b-2 border-gray-300 focus:border-[#1B4D3E] outline-none py-2 bg-transparent transition font-serif placeholder-gray-400 print:${commonPrint} print:border-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'modern') {
                return `
                <div class="mb-4 break-inside-avoid">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-0.5 print:text-black">${label} ${reqStar}</label>
                    ${hintHtml}
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none placeholder-gray-400 print:${commonPrint} print:text-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'bold') {
                return `
                <div class="mb-4 border-b border-gray-100 pb-2 break-inside-avoid">
                    <label class="font-bold text-gray-700 block mb-0.5 print:text-black">${label} ${reqStar}</label>
                    ${hintHtml}
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full bg-gray-50 border-0 border-b-2 border-gray-300 focus:border-red-600 focus:bg-white px-2 py-2 transition outline-none placeholder-gray-400 print:${commonPrint} print:text-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'dark') {
                return `
                <div class="mb-6 group break-inside-avoid">
                    <label class="block text-xs text-amber-500 uppercase tracking-widest mb-0.5 group-focus-within:text-white transition print:text-black">${label} ${reqStar}</label>
                    ${hint ? `<p class="text-[11px] text-slate-400 mb-1.5 italic font-normal print:text-gray-600 print:text-[10px] leading-snug">${hint}</p>` : ''}
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full bg-slate-800 border-b border-slate-600 focus:border-amber-500 px-0 py-3 text-white outline-none transition placeholder-slate-600 print:bg-white print:text-black print:border-gray-400" placeholder="${placeholder}">
                </div>`;
            } else { // ceria
                 return `
                 <div class="mb-4 break-inside-avoid">
                    <label class="block text-gray-500 text-xs font-bold uppercase mb-0.5 ml-1 print:text-black">${label} ${reqStar}</label>
                    ${hintHtml}
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full bg-orange-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-300 outline-none font-bold text-gray-700 placeholder-gray-400 print:bg-white print:border-b print:border-gray-400 print:rounded-none print:text-black" placeholder="${placeholder}">
                 </div>`;
            }
        };

        const activeFieldsHtml = fieldGroups.flatMap(group => {
            const groupFields = group.fields.filter(f => localConfig.activeFields.includes(f.key));
            if (groupFields.length === 0) return [];
            
            let header = '';
            if (style === 'classic') header = `<h3 class="bg-[#1B4D3E] text-[#D4AF37] px-6 py-2 font-bold uppercase text-sm mb-6 inline-block rounded-r-full break-after-avoid print:bg-gray-200 print:text-black print:border print:border-black font-serif tracking-widest shadow-sm">${group.title}</h3>`;
            else if (style === 'modern') header = `<h3 class="text-blue-600 font-bold text-lg mb-4 flex items-center gap-2 border-b pb-1 break-after-avoid print:text-black print:border-black"><span class="bg-blue-100 p-1.5 rounded text-sm print:hidden"><i class="bi bi-caret-right-fill"></i></span> ${group.title}</h3>`;
            else if (style === 'bold') header = `<h3 class="text-xl font-bold text-gray-800 border-l-4 border-red-700 pl-3 mb-4 break-after-avoid print:text-black print:border-black">${group.title}</h3>`;
            else if (style === 'dark') header = `<h3 class="text-white font-serif text-xl border-b border-slate-700 pb-2 mb-4 print:text-black print:border-gray-400 break-after-avoid">${group.title}</h3>`;
            else if (style === 'ceria') header = `<div class="flex items-center gap-3 mb-4 break-after-avoid"><div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-lg print:hidden"><i class="bi bi-star-fill"></i></div><h3 class="font-bold text-gray-700 text-lg print:text-black">${group.title}</h3></div>`;

            const fieldsHtml = groupFields.map(f => {
                const isRequired = (localConfig.requiredStandardFields || []).includes(f.key);
                const hint = (localConfig.fieldHints && localConfig.fieldHints[f.key] !== undefined)
                    ? localConfig.fieldHints[f.key]
                    : (DEFAULT_FIELD_HINTS[f.key] || '');
                const hintHtml = hint ? `<p class="text-[11px] text-gray-500 mb-1.5 italic font-normal print:text-gray-600 print:text-[10px] leading-snug">${hint}</p>` : '';
                
                if (f.key === 'jenisKelamin') {
                     // Simple radio logic
                     return `
                     <div class="mb-4 break-inside-avoid">
                        <label class="block text-sm font-bold mb-0.5 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">Jenis Kelamin ${isRequired ? '<span class="text-red-500">*</span>' : ''}</label>
                        ${hintHtml}
                        <div class="flex gap-4 mt-1 ${style === 'classic' ? 'font-serif' : ''}">
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="jenisKelamin" value="Laki-laki" ${isRequired ? 'required' : ''}> Laki-laki</label>
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="jenisKelamin" value="Perempuan" ${isRequired ? 'required' : ''}> Perempuan</label>
                        </div>
                     </div>`;
                }

                if (f.type === 'select' || (f.options && f.options.length > 0)) {
                    const opts = f.options || [];
                    const optionsHtml = opts.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                    return `
                    <div class="mb-4 break-inside-avoid">
                        <label class="block text-sm font-bold mb-0.5 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">${f.label} ${isRequired ? '<span class="text-red-500">*</span>' : ''}</label>
                        ${hintHtml}
                        <select name="${f.key}" ${isRequired ? 'required' : ''} class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 outline-none print:bg-transparent print:border-black ${style === 'classic' ? 'bg-transparent border-b-2 rounded-none border-gray-300 focus:border-[#1B4D3E] font-serif' : ''}">
                            <option value="">-- Pilih ${f.label} --</option>
                            ${optionsHtml}
                        </select>
                    </div>`;
                }

                if (f.type === 'markdown' || f.key === 'catatan') {
                    return `
                    <div class="mb-4 break-inside-avoid md:col-span-2">
                        <div class="flex items-center justify-between mb-0.5">
                            <label class="block text-sm font-bold print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">${f.label} ${isRequired ? '<span class="text-red-500">*</span>' : ''}</label>
                            <span class="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-mono border border-teal-200 print:hidden"><i class="bi bi-markdown mr-1"></i>Markdown</span>
                        </div>
                        ${hintHtml}
                        <div class="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                            <div class="flex items-center gap-1.5 p-1.5 bg-gray-100 border-b border-gray-200 text-xs no-print">
                                <button type="button" onclick="insertMd('field_${f.key}', '**', '**')" class="px-2 py-0.5 font-bold bg-white border rounded hover:bg-gray-50" title="Tebal">B</button>
                                <button type="button" onclick="insertMd('field_${f.key}', '*', '*')" class="px-2 py-0.5 italic bg-white border rounded hover:bg-gray-50" title="Miring">I</button>
                                <button type="button" onclick="insertMd('field_${f.key}', '### ')" class="px-2 py-0.5 font-semibold bg-white border rounded hover:bg-gray-50" title="Judul">H3</button>
                                <button type="button" onclick="insertMd('field_${f.key}', '- ')" class="px-2 py-0.5 bg-white border rounded hover:bg-gray-50" title="Poin Bullets">• Poin</button>
                                <button type="button" onclick="insertMd('field_${f.key}', '1. ')" class="px-2 py-0.5 bg-white border rounded hover:bg-gray-50" title="Daftar Angka">1. Angka</button>
                                <button type="button" onclick="insertMd('field_${f.key}', '- [ ] ')" class="px-2 py-0.5 bg-white border rounded hover:bg-gray-50" title="Checklist">☑ Checklist</button>
                                <button type="button" onclick="insertMd('field_${f.key}', '> ')" class="px-2 py-0.5 bg-white border rounded hover:bg-gray-50" title="Kutipan">&quot; Kutipan</button>
                            </div>
                            <textarea id="field_${f.key}" name="${f.key}" rows="3" ${isRequired ? 'required' : ''} class="w-full p-2.5 text-sm outline-none resize-y" placeholder="Catatan santri atau harapan wali murid... (Mendukung format markdown)"></textarea>
                        </div>
                    </div>`;
                }

                const inputType = f.type === 'date' || f.key.toLowerCase().includes('tanggal') 
                    ? 'date' 
                    : f.type === 'number' || ['anakKe', 'jumlahSaudara', 'tinggiBadan', 'beratBadan', 'tahunLulusSebelumnya', 'targetJuz'].includes(f.key)
                    ? 'number'
                    : 'text';

                return renderInput(f.label, f.key, inputType, '', isRequired, hint);
            }).join('');

            return [`<section class="mb-8 break-inside-avoid">${header}<div class="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">${fieldsHtml}</div></section>`];
        }).join('');

        const customFieldsHtml = localConfig.customFields?.map(field => {
            const hint = field.hint || '';
            const hintHtml = hint ? `<p class="text-[11px] text-gray-500 mb-1.5 italic font-normal print:text-gray-600 print:text-[10px] leading-snug">${hint}</p>` : '';
            if (field.type === 'section') return `<h4 class="font-bold text-lg mt-6 mb-3 border-b-2 border-gray-300 pb-1 break-after-avoid print:text-black print:border-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif uppercase border-[#1B4D3E]/30' : ''}">${field.label}</h4>`;
            if (field.type === 'statement') return `<div class="mb-4 text-sm text-justify leading-relaxed print:text-black ${style === 'classic' ? 'font-serif' : ''}">${field.label}</div>`;
            if (field.type === 'text') return renderInput(field.label, `custom_${field.id}`, 'text', '', field.required, hint);
            if (field.type === 'file') return renderInput(field.label, `custom_${field.id}`, 'file', '', field.required, hint);
            if (field.type === 'date') return renderInput(field.label, `custom_${field.id}`, 'date', '', field.required, hint);
            if (field.type === 'number') return renderInput(field.label, `custom_${field.id}`, 'number', '', field.required, hint);
            
            if (field.type === 'select') {
                const opts = field.options?.filter(o => o.trim() !== '') || [];
                const optionsHtml = opts.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                return `
                <div class="mb-4 break-inside-avoid">
                    <label class="block text-gray-600 text-sm font-bold mb-0.5 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>
                    ${hintHtml}
                    <select name="custom_${field.id}" ${field.required ? 'required' : ''} class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 outline-none print:border-black ${style === 'classic' ? 'bg-transparent border-b-2 rounded-none border-gray-300 focus:border-[#1B4D3E] font-serif' : ''}">
                        <option value="">-- Pilih ${field.label} --</option>
                        ${optionsHtml}
                    </select>
                </div>`;
            }

            if (field.type === 'markdown') {
                return `
                <div class="mb-4 break-inside-avoid">
                    <div class="flex items-center justify-between mb-0.5">
                        <label class="block text-gray-600 text-sm font-bold print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>
                        <span class="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-mono border border-teal-200 print:hidden"><i class="bi bi-markdown mr-1"></i>Markdown</span>
                    </div>
                    ${hintHtml}
                    <div class="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <div class="flex items-center gap-1.5 p-1.5 bg-gray-100 border-b border-gray-200 text-xs no-print">
                            <button type="button" onclick="insertMd('custom_${field.id}', '**', '**')" class="px-2 py-0.5 font-bold bg-white border rounded hover:bg-gray-50" title="Tebal">B</button>
                            <button type="button" onclick="insertMd('custom_${field.id}', '*', '*')" class="px-2 py-0.5 italic bg-white border rounded hover:bg-gray-50" title="Miring">I</button>
                            <button type="button" onclick="insertMd('custom_${field.id}', '### ')" class="px-2 py-0.5 font-semibold bg-white border rounded hover:bg-gray-50" title="Judul">H3</button>
                            <button type="button" onclick="insertMd('custom_${field.id}', '- ')" class="px-2 py-0.5 bg-white border rounded hover:bg-gray-50" title="Poin Bullets">• Poin</button>
                            <button type="button" onclick="insertMd('custom_${field.id}', '1. ')" class="px-2 py-0.5 bg-white border rounded hover:bg-gray-50" title="Daftar Angka">1. Angka</button>
                            <button type="button" onclick="insertMd('custom_${field.id}', '- [ ] ')" class="px-2 py-0.5 bg-white border rounded hover:bg-gray-50" title="Checklist">☑ Checklist</button>
                            <button type="button" onclick="insertMd('custom_${field.id}', '> ')" class="px-2 py-0.5 bg-white border rounded hover:bg-gray-50" title="Kutipan">&quot; Kutipan</button>
                        </div>
                        <textarea id="custom_${field.id}" name="custom_${field.id}" rows="3" ${field.required ? 'required' : ''} class="w-full p-2.5 text-sm outline-none resize-y" placeholder="Catatan terformat markdown..."></textarea>
                    </div>
                </div>`;
            }

            if (field.type === 'paragraph') return `<div class="mb-4 break-inside-avoid"><label class="block text-gray-600 text-sm font-bold mb-0.5 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>${hintHtml}<textarea name="custom_${field.id}" rows="3" ${field.required ? 'required' : ''} class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 outline-none print:bg-white print:border-black ${style === 'classic' ? 'bg-transparent border-b-2 rounded-none border-gray-300 focus:border-[#1B4D3E] font-serif' : ''}"></textarea></div>`;
            if (field.type === 'radio' || field.type === 'checkbox') {
                const opts = field.options?.filter(o => o.trim() !== '') || [];
                const optionsHtml = opts.map(opt => `<label class="flex items-center gap-2 cursor-pointer p-1"><input type="${field.type}" name="custom_${field.id}${field.type==='checkbox'?'[]':''}" value="${opt}" class="w-4 h-4 text-teal-600" ${field.required && field.type === 'radio' ? 'required' : ''}> <span class="text-sm">${opt}</span></label>`).join('');
                return `<div class="mb-4 break-inside-avoid"><label class="block text-gray-600 text-sm font-bold mb-0.5 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>${hintHtml}<div class="space-y-1 mt-1 ${style === 'classic' ? 'font-serif' : ''}">${optionsHtml}</div></div>`;
            }
            return '';
        }).join('') || '';

        const docsHtml = localConfig.requiredDocuments.map(doc => 
            `<label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 print:border-black ${style === 'classic' ? 'border-[#1B4D3E]/30 bg-white font-serif' : ''}">
                <input type="checkbox" name="docs[]" value="${doc}" class="w-5 h-5 text-teal-600 print:text-black">
                <span class="text-sm">${doc} (Bawa Fisik Saat Daftar Ulang)</span>
             </label>`
        ).join('');

        let bodyClass = isForPreview 
            ? "bg-white min-h-screen p-6 sm:p-10 font-sans text-gray-800 m-0"
            : "bg-gray-100 min-h-screen py-10 font-sans text-gray-800 print:bg-white print:py-0";
        let wrapperClass = isForPreview 
            ? "w-full max-w-2xl mx-auto"
            : "bg-white shadow-xl mx-auto max-w-2xl p-8 rounded-lg print:shadow-none print:max-w-none print:p-0";
        let headerHtml = `<div class="text-center mb-8"><h1 class="text-2xl font-bold">${settings.namaPonpes}</h1><p>Formulir Pendaftaran</p></div>`;

        if (style === 'classic') {
            bodyClass = isForPreview 
                ? "bg-white min-h-screen p-6 sm:p-10 font-serif text-gray-900 m-0 border-t-[8px] border-[#1B4D3E]"
                : "bg-[#F3F4F6] min-h-screen py-10 font-serif text-gray-900 print:bg-white";
            wrapperClass = isForPreview 
                ? "w-full max-w-[210mm] mx-auto"
                : "bg-[#fff] shadow-2xl mx-auto max-w-[210mm] p-10 rounded-sm border-t-[8px] border-[#1B4D3E] print:shadow-none print:border-none print:rounded-none print:max-w-none";
            headerHtml = `
                <div class="text-center mb-12 relative">
                    <div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-[#D4AF37] rounded-full"></div>
                    <h1 class="text-3xl font-bold text-[#1B4D3E] mt-6 mb-2 uppercase tracking-wide leading-tight">${settings.namaPonpes}</h1>
                    <div class="text-[#D4AF37] font-semibold italic text-lg border-b border-gray-200 pb-4 inline-block px-10">Penerimaan Santri Baru</div>
                    <p class="text-xs text-gray-500 mt-2 font-sans tracking-widest uppercase">Tahun Ajaran ${localConfig.tahunAjaranAktif || new Date().getFullYear()}</p>
                </div>
            `;
        } else if (style === 'modern') {
             bodyClass = isForPreview 
                ? "bg-white min-h-screen font-sans m-0 p-0"
                : "bg-slate-50 min-h-screen py-10 font-sans print:bg-white";
             wrapperClass = isForPreview 
                ? "w-full max-w-[210mm] mx-auto overflow-hidden"
                : "bg-white shadow-xl mx-auto max-w-[210mm] border border-gray-200 rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:max-w-none";
             headerHtml = `<div class="bg-blue-600 p-8 text-white flex justify-between items-center print:bg-white print:text-black print:border-b-2 print:border-blue-600 print:mb-6"><div><h1 class="text-3xl font-bold tracking-tight">Registration</h1><p class="text-blue-100 print:text-gray-600">${settings.namaPonpes}</p></div><div class="text-5xl opacity-30 print:hidden"><i class="bi bi-pencil-square"></i></div></div><div class="p-8 print:p-0">`;
        } 
        else if (style === 'bold') {
            bodyClass = isForPreview 
                ? "bg-white min-h-screen p-6 sm:p-8 font-sans m-0"
                : "bg-zinc-100 min-h-screen py-10 font-sans print:bg-white";
            wrapperClass = isForPreview 
                ? "w-full max-w-2xl mx-auto p-6 sm:p-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mx-auto max-w-2xl p-8 border-2 border-black print:shadow-none print:border-none";
            headerHtml = `<div class="mb-10 border-b-4 border-black pb-4"><h1 class="text-4xl font-black uppercase tracking-tighter">${settings.namaPonpes}</h1><p class="text-lg font-bold bg-black text-white inline-block px-2 transform -skew-x-12">PENERIMAAN SANTRI BARU</p></div>`;
        } else if (style === 'dark') {
            bodyClass = isForPreview 
                ? "bg-slate-900 min-h-screen p-6 sm:p-10 font-sans text-slate-200 m-0"
                : "bg-slate-900 min-h-screen py-10 font-sans print:bg-white";
            wrapperClass = isForPreview 
                ? "w-full max-w-2xl mx-auto"
                : "bg-slate-800 shadow-2xl mx-auto max-w-2xl p-10 rounded-2xl border border-slate-700 text-slate-200 print:bg-white print:text-black print:shadow-none";
            headerHtml = `<div class="text-center mb-12"><div class="inline-block p-4 rounded-full bg-slate-700/50 mb-4 print:hidden"><i class="bi bi-buildings-fill text-4xl text-amber-500"></i></div><h1 class="text-3xl font-serif text-white print:text-black">${settings.namaPonpes}</h1><div class="h-1 w-20 bg-amber-500 mx-auto mt-4 rounded-full print:bg-black"></div></div>`;
        } else { // ceria
            bodyClass = isForPreview 
                ? "bg-yellow-50/50 min-h-screen p-6 sm:p-8 font-comic m-0"
                : "bg-yellow-50 min-h-screen py-10 font-comic print:bg-white";
            wrapperClass = isForPreview 
                ? "w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-[2rem] border-4 border-orange-200 bg-white"
                : "bg-white shadow-xl mx-auto max-w-2xl p-8 rounded-[2rem] border-4 border-orange-200 print:border-none print:shadow-none";
            headerHtml = `<div class="text-center mb-8 bg-orange-100 p-6 rounded-[2rem] print:bg-transparent print:p-0"><h1 class="text-3xl font-bold text-orange-600 print:text-black">${settings.namaPonpes}</h1><p class="text-orange-800 print:text-gray-600">Formulir Pendaftaran Santri</p></div>`;
        }
        
        const closeDiv = style === 'modern' ? '</div>' : '';
        const buttonIcon = submissionMethod === 'whatsapp' ? 'bi bi-whatsapp' : submissionMethod === 'hybrid' ? 'bi bi-cloud-check-fill' : 'bi bi-send-fill';
        const buttonText = submissionMethod === 'whatsapp' ? 'Kirim Data via WhatsApp' : submissionMethod === 'hybrid' ? 'Kirim Data (Cloud + WA)' : 'Kirim Formulir';
        const buttonSubtext = submissionMethod === 'whatsapp' 
            ? 'Data pendaftaran akan diteruskan ke WhatsApp resmi Admin PSB.' 
            : submissionMethod === 'hybrid' 
            ? 'Data otomatis tersimpan di Cloud & terkonfirmasi ke WhatsApp Admin.' 
            : 'Data formulir dan berkas langsung tersimpan ke sistem PSB.';
        let buttonColor = submissionMethod === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : submissionMethod === 'hybrid' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700';
        if (style === 'classic') {
            buttonColor = 'bg-[#1B4D3E] hover:bg-[#14392e] text-[#fbf9f4] font-serif tracking-wider shadow-md';
        } else if (style === 'bold') {
            buttonColor = 'bg-black hover:bg-red-700 text-white font-black uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 transition-all';
        } else if (style === 'dark') {
            buttonColor = 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold tracking-wide shadow-lg shadow-amber-500/20';
        } else if (style === 'ceria') {
            buttonColor = 'bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-md shadow-orange-300';
        }
        
        const adminPhone = localConfig.nomorHpAdmin.replace(/^0/, '62');
        let modalHtml = '';
        let submitScript = '';

        if (submissionMethod === 'whatsapp') {
             modalHtml = `
             <div id="waModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                 <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-left border border-gray-100 my-8">
                     <div class="flex items-center gap-3 mb-4">
                         <div class="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center text-2xl shrink-0">
                             <i class="bi bi-whatsapp"></i>
                         </div>
                         <div>
                             <h3 class="text-base font-bold text-gray-900 leading-tight">Panduan Pengiriman WhatsApp</h3>
                             <p class="text-xs text-gray-500 mt-0.5">Petunjuk agar data pendaftaran santri baru berhasil diproses panitia:</p>
                         </div>
                     </div>
                     <div class="space-y-2.5 my-4">
                         <div class="flex items-start gap-2.5 text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <span class="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">1</span>
                             <div><strong>Langkah 1:</strong> Klik tombol hijau <em>"Buka WhatsApp Sekarang"</em> di bawah untuk membuka aplikasi WhatsApp Admin resmi.</div>
                         </div>
                         <div class="flex items-start gap-2.5 text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
                             <span class="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">2</span>
                             <div><strong>PENTING - JANGAN HAPUS TEKS:</strong> Format pesan pendaftaran dan kode <code>PSB_START ... PSB_END</code> sudah terisi otomatis. Mohon jangan diubah atau dihapus agar sistem panitia dapat membaca data santri.</div>
                         </div>
                         <div class="flex items-start gap-2.5 text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <span class="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">3</span>
                             <div><strong>Langkah 2:</strong> Di aplikasi WhatsApp, langsung tekan tombol <strong>KIRIM (Send / Panah Hijau)</strong> untuk mengirim pesan ke Admin.</div>
                         </div>
                         <div class="flex items-start gap-2.5 text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <span class="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">4</span>
                             <div><strong>Langkah 3 (Opsional):</strong> Jika ada dokumen berkas persyaratan (KK, Akta Kelahiran, dll), Anda bisa langsung melampirkan fotonya di chat WhatsApp tersebut.</div>
                         </div>
                     </div>
                     <div class="mt-6 flex flex-col gap-2">
                         <button type="button" id="waProceedBtn" onclick="proceedWaSubmit()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm">
                             <i class="bi bi-whatsapp text-lg"></i> Buka WhatsApp Sekarang
                         </button>
                         <button type="button" onclick="closeWaModal()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl text-xs transition">
                             Periksa Formulir Kembali
                         </button>
                     </div>
                 </div>
             </div>`;

             submitScript = `<script>
function submitForm(){
    const form=document.getElementById('psbForm');
    if(!form.checkValidity()){
        form.reportValidity();
        return;
    }
    const modal=document.getElementById('waModal');
    if(modal){
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
function closeWaModal(){
    const modal=document.getElementById('waModal');
    if(modal){
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
function proceedWaSubmit(){
    const form=document.getElementById('psbForm');
    const btn=document.getElementById('waProceedBtn');
    const originalText=btn.innerHTML;
    btn.disabled=true;
    btn.innerHTML='<span class="inline-block animate-spin mr-2">↻</span> Membuka WhatsApp...';

    const formData=new FormData(form);
    const data={tanggalDaftar:new Date().toISOString(),status:'Baru'};
    const customData={};
    formData.forEach((value,key)=>{
        if(key.startsWith('custom_')){
            customData[key.replace('custom_','')]=value;
        }else if(key==='docs[]'){
            if(!data.docs) data.docs=[];
            data.docs.push(value);
        }else{
            data[key]=value;
        }
    });
    data.customData=JSON.stringify(customData);

    let message="*Pendaftaran Santri Baru*\\n*${settings.namaPonpes}*\\n\\n";
    message+="Nama: "+data.namaLengkap+"\\n";
    message+="Jenjang: "+"${jenjangName}"+"\\n";
    message+="Wali: "+(data.namaWali||data.namaAyah||'-')+"\\n";
    message+="\\n--------------------------------\\n";
    message+="PSB_START\\n"+JSON.stringify(data)+"\\nPSB_END";
    message+="\\n--------------------------------\\n";
    message+="\\n_Harap lampirkan foto/dokumen pendukung secara manual di chat ini._";

    setTimeout(()=>{
        window.open('https://wa.me/${adminPhone}?text='+encodeURIComponent(message),'_blank');
        btn.disabled=false;
        btn.innerHTML=originalText;
        closeWaModal();
    },600);
}
</script>`;
        } else if (submissionMethod === 'google_sheet') {
             modalHtml = `
             <div id="gsSuccessModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                 <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center border border-gray-100 my-8">
                     <div class="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-3xl mx-auto mb-3">
                         <i class="bi bi-check-circle-fill"></i>
                     </div>
                     <h3 class="text-lg font-bold text-gray-900">Pendaftaran Berhasil Dikirim!</h3>
                     <p class="text-xs text-gray-600 mt-2 leading-relaxed">
                         Alhamdulillah, formulir pendaftaran santri baru dan berkas persyaratan Anda telah berhasil diterima dan tersimpan ke sistem <strong>${settings.namaPonpes}</strong>.
                     </p>
                     <div class="bg-teal-50 border border-teal-200 text-teal-900 text-xs p-3 rounded-xl mt-4 text-left">
                         <div class="flex items-center gap-2 font-bold mb-1">
                             <i class="bi bi-info-circle-fill text-teal-600"></i> Informasi Selanjutnya:
                         </div>
                         <p>Panitia PSB akan segera memverifikasi data dan berkas yang Anda kirimkan. Pastikan nomor kontak yang didaftarkan selalu aktif.</p>
                     </div>
                     <button type="button" onclick="closeGsSuccessModal()" class="w-full mt-5 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-md transition">
                         Selesai &amp; Tutup
                     </button>
                 </div>
             </div>`;

             submitScript = `<script>
function readFile(file, fieldLabel){
    return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve({name:file.name,mime:file.type,data:reader.result,isFile:true,fieldLabel:fieldLabel||''});
        reader.onerror=reject;
        reader.readAsDataURL(file);
    });
}
async function submitForm(){
    const form=document.getElementById('psbForm');
    if(!form.checkValidity()){
        form.reportValidity();
        return;
    }
    const btn=document.getElementById('submit-btn');
    const originalContent=btn.innerHTML;
    btn.disabled=true;
    btn.innerHTML='<span class="inline-block animate-spin mr-2">↻</span> Mengirim Formulir...';
    try{
        const formData=new FormData(form);
        const data={};
        const filePromises=[];
        for(const [key,value] of formData.entries()){
            if(value instanceof File){
                if(value.size>0){
                    if(value.size>5*1024*1024){
                        alert('File '+value.name+' terlalu besar (Maksimal 5MB)');
                        throw new Error('File too large');
                    }
                    const inputEl=form.querySelector('[name="'+key+'"]');
                    const fieldLabel=inputEl?.closest('div')?.querySelector('label')?.textContent?.trim()||key;
                    filePromises.push(readFile(value,fieldLabel).then(fileObj=>{data[key]=fileObj;}));
                }
            }else{
                if(data[key]){
                    data[key]=data[key]+", "+value;
                }else{
                    data[key]=value;
                }
            }
        }
        await Promise.all(filePromises);
        data.tanggalDaftar=new Date().toISOString();
        data.jenjangId="${localConfig.targetJenjangId||''}";
        data.sheetName="${targetSheetName}";
        await fetch("${googleScriptUrl}",{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(data)});
        const modal=document.getElementById('gsSuccessModal');
        if(modal){
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }else{
            alert("Pendaftaran Berhasil! Data dan Berkas telah tersimpan.");
            form.reset();
        }
    }catch(error){
        console.error('Error!',error);
        if(error.message!=='File too large'){
            alert("Terjadi kesalahan koneksi saat mengirim formulir. Silakan coba kembali.");
        }
    }finally{
        btn.disabled=false;
        btn.innerHTML=originalContent;
    }
}
function closeGsSuccessModal(){
    const modal=document.getElementById('gsSuccessModal');
    if(modal){
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    const form=document.getElementById('psbForm');
    if(form) form.reset();
}
</script>`;
        } else {
             modalHtml = `
             <div id="hybridModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                 <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-left border border-gray-100 my-8">
                     <div id="hybridInitialContent">
                         <div class="flex items-center gap-3 mb-4">
                             <div class="flex items-center gap-1.5 p-2 bg-teal-50 rounded-2xl text-teal-700 shrink-0">
                                 <i class="bi bi-cloud-check-fill text-xl"></i>
                                 <i class="bi bi-plus text-xs"></i>
                                 <i class="bi bi-whatsapp text-xl text-green-600"></i>
                             </div>
                             <div>
                                 <h3 class="text-base font-bold text-gray-900 leading-tight">Panduan Langkah Pendaftaran (Hybrid)</h3>
                                 <p class="text-xs text-gray-500 mt-0.5">Pendaftaran diproses dalam 2 tahapan otomatis agar berkas &amp; data aman:</p>
                             </div>
                         </div>
                         <div class="space-y-3 my-4">
                             <div class="p-3 bg-teal-50/80 border border-teal-200 rounded-xl space-y-1">
                                 <div class="flex items-center gap-2 text-xs font-bold text-teal-900">
                                     <span class="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] shrink-0">1</span>
                                     <span>Langkah 1: Penyimpanan Otomatis ke Cloud &amp; Drive</span>
                                 </div>
                                 <p class="text-xs text-teal-800 pl-7 leading-relaxed">Seluruh isian formulir dan berkas/dokumen persyaratan Anda akan otomatis diunggah dan disimpan aman ke Google Drive &amp; Cloud database panitia.</p>
                             </div>
                             <div class="p-3 bg-green-50/80 border border-green-200 rounded-xl space-y-1">
                                 <div class="flex items-center gap-2 text-xs font-bold text-green-900">
                                     <span class="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] shrink-0">2</span>
                                     <span>Langkah 2: Konfirmasi Otomatis ke WhatsApp Admin</span>
                                 </div>
                                 <p class="text-xs text-green-800 pl-7 leading-relaxed">Setelah data tersimpan di Cloud, WhatsApp Admin akan terbuka secara otomatis dengan pesan konfirmasi resmi. <strong>Cukup tekan tombol KIRIM di WhatsApp</strong> (jangan menghapus kode pendaftaran).</p>
                             </div>
                         </div>
                         <div class="mt-6 flex flex-col gap-2">
                             <button type="button" id="hybridProceedBtn" onclick="proceedHybridSubmit()" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm">
                                 <i class="bi bi-arrow-right-circle-fill text-lg"></i> Mulai Kirim &amp; Lanjutkan ke WA
                             </button>
                             <button type="button" onclick="closeHybridModal()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl text-xs transition">
                                 Periksa Formulir Kembali
                             </button>
                         </div>
                     </div>
                     <div id="hybridProgressContent" class="hidden text-center py-4">
                         <div class="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
                         <h4 id="hybridStatusTitle" class="text-base font-bold text-gray-800">Sedang Memproses Pendaftaran...</h4>
                         <p id="hybridStatusDesc" class="text-xs text-gray-500 mt-1">Mohon tunggu, jangan menutup halaman ini.</p>
                     </div>
                     <div id="hybridDoneContent" class="hidden text-center py-2">
                         <div class="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl mx-auto mb-3">
                             <i class="bi bi-check-circle-fill"></i>
                         </div>
                         <h4 class="text-base font-bold text-gray-800">Pendaftaran Berhasil Diproses!</h4>
                         <p class="text-xs text-gray-600 mt-2 leading-relaxed">
                             Data dan berkas telah tersimpan di Cloud server. Chat WhatsApp Admin telah dibuka dengan kode konfirmasi pendaftaran.
                         </p>
                         <div class="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-xl mt-3 text-left">
                             <strong>Pengingat Penting:</strong> Pastikan Anda telah menekan tombol <strong>KIRIM</strong> di WhatsApp agar Admin langsung menerima konfirmasi Anda.
                         </div>
                         <button type="button" onclick="finishHybridSubmit()" class="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md">
                             Selesai &amp; Tutup
                         </button>
                     </div>
                 </div>
             </div>`;

             submitScript = `<script>
function readFile(file, fieldLabel){
    return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve({name:file.name,mime:file.type,data:reader.result,isFile:true,fieldLabel:fieldLabel||''});
        reader.onerror=reject;
        reader.readAsDataURL(file);
    });
}
function submitForm(){
    const form=document.getElementById('psbForm');
    if(!form.checkValidity()){
        form.reportValidity();
        return;
    }
    const modal=document.getElementById('hybridModal');
    if(modal){
        document.getElementById('hybridInitialContent').classList.remove('hidden');
        document.getElementById('hybridProgressContent').classList.add('hidden');
        document.getElementById('hybridDoneContent').classList.add('hidden');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
function closeHybridModal(){
    const modal=document.getElementById('hybridModal');
    if(modal){
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
async function proceedHybridSubmit(){
    const form=document.getElementById('psbForm');
    const initBox=document.getElementById('hybridInitialContent');
    const progBox=document.getElementById('hybridProgressContent');
    const doneBox=document.getElementById('hybridDoneContent');
    const statusTitle=document.getElementById('hybridStatusTitle');
    const statusDesc=document.getElementById('hybridStatusDesc');

    initBox.classList.add('hidden');
    progBox.classList.remove('hidden');
    statusTitle.textContent="Langkah 1: Menyimpan ke Cloud...";
    statusDesc.textContent="Sedang mengunggah data dan berkas persyaratan...";

    try{
        const formData=new FormData(form);
        const data={};
        const filePromises=[];
        for(const [key,value] of formData.entries()){
            if(value instanceof File){
                if(value.size>0){
                    if(value.size>5*1024*1024){
                        alert('File '+value.name+' terlalu besar (Maksimal 5MB)');
                        throw new Error('File too large');
                    }
                    const inputEl=form.querySelector('[name="'+key+'"]');
                    const fieldLabel=inputEl?.closest('div')?.querySelector('label')?.textContent?.trim()||key;
                    filePromises.push(readFile(value,fieldLabel).then(fileObj=>{data[key]=fileObj;}));
                }
            }else{
                if(data[key]){
                    data[key]=data[key]+", "+value;
                }else{
                    data[key]=value;
                }
            }
        }
        await Promise.all(filePromises);
        data.tanggalDaftar=new Date().toISOString();
        data.jenjangId="${localConfig.targetJenjangId||''}";
        data.sheetName="${targetSheetName}";

        const textOnlyData={...data};
        for(let key in textOnlyData){
            if(typeof textOnlyData[key]==='object'&&textOnlyData[key]!==null&&textOnlyData[key].isFile){
                delete textOnlyData[key];
                textOnlyData[key+'_status']="[File di Cloud/HP User]";
            }
        }
        const jsonString=JSON.stringify(textOnlyData);
        const encodedBackup=btoa(unescape(encodeURIComponent(jsonString)));
        let cloudSuccess=false;
        try{
            await fetch("${googleScriptUrl}",{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(data)});
            cloudSuccess=true;
        }catch(err){
            console.error("Cloud Upload Failed",err);
        }

        statusTitle.textContent="Langkah 2: Membuka WhatsApp...";
        statusDesc.textContent="Menyiapkan pesan konfirmasi otomatis...";

        let message="Assalamu'alaikum Admin,\\nSaya sudah mengisi formulir pendaftaran santri baru.\\n\\n*Data Santri*\\nNama: "+data.namaLengkap+"\\nJenjang: "+"${jenjangName}"+"\\nWali: "+(data.namaWali||data.namaAyah||'-')+"\\nStatus Upload: "+(cloudSuccess?"✅ Sukses ke Server":"⚠️ Gagal/Pending")+"\\n\\n*KODE BACKUP DATA (JANGAN DIHAPUS):*\\nPSB_BACKUP_START\\n"+encodedBackup+"\\nPSB_BACKUP_END\\n\\n_Jika server error, Admin dapat menyalin pesan ini ke menu 'Impor WA'._";

        setTimeout(()=>{
            window.open('https://wa.me/${adminPhone}?text='+encodeURIComponent(message),'_blank');
            progBox.classList.add('hidden');
            doneBox.classList.remove('hidden');
        },800);

    }catch(error){
        console.error('Error!',error);
        initBox.classList.remove('hidden');
        progBox.classList.add('hidden');
        if(error.message!=='File too large'){
            alert("Terjadi kesalahan. Pastikan koneksi internet stabil dan ukuran file tidak melebihi 5MB.");
        }
    }
}
function finishHybridSubmit(){
    closeHybridModal();
    const form=document.getElementById('psbForm');
    if(form) form.reset();
}
</script>`;
        }

        // --- INJECT DEADLINE LOGIC ---
        const deadlineCheckScript = `
        <script>
            (function() {
                const deadlineStr = "${localConfig.registrationDeadline || ''}";
                if (deadlineStr) {
                    const limit = new Date(deadlineStr);
                    limit.setHours(23, 59, 59, 999);
                    const now = new Date();
                    
                    if (now > limit) {
                        const form = document.getElementById('psbForm');
                        const btn = document.getElementById('submit-btn');
                        if(form && btn) {
                            // Disable inputs
                            const inputs = form.querySelectorAll('input, select, textarea, button');
                            inputs.forEach(el => el.disabled = true);
                            
                            // Change button
                            btn.innerHTML = "<i class='bi bi-lock-fill'></i> Pendaftaran Ditutup";
                            btn.className = "w-full flex justify-center items-center gap-2 bg-gray-400 text-white font-bold py-3 rounded-lg cursor-not-allowed";
                            btn.onclick = null;
                            
                            // Show Banner
                            const banner = document.createElement('div');
                            banner.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm break-inside-avoid';
                            banner.innerHTML = '<div class="flex items-center gap-2"><i class="bi bi-exclamation-circle-fill text-xl"></i><div><p class="font-bold">Mohon Maaf</p><p class="text-sm">Masa pendaftaran telah berakhir pada tanggal ' + limit.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) + '.</p></div></div>';
                            
                            form.insertBefore(banner, form.firstChild);
                        }
                    }
                }
            })();
        </script>
        `;

        return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pendaftaran ${settings.namaPonpes}</title>
    <!-- Fonts & Icons CDN -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Comic+Neue:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                        serif: ['"Playfair Display"', 'Georgia', 'serif'],
                        comic: ['"Comic Neue"', 'Comic Sans MS', 'cursive', 'sans-serif']
                    }
                }
            }
        };
    </script>
    <style>
        ${standaloneStyles}
        /* Theme Fallbacks & Specific Overrides */
        .font-comic { font-family: "Comic Neue", "Comic Sans MS", cursive, sans-serif !important; }
        .font-serif { font-family: "Playfair Display", Georgia, serif !important; }
        .font-sans { font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif !important; }
        
        @media print {
            @page { size: A4; margin: 0; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .printable-content-wrapper { box-shadow: none !important; margin: 0 !important; }
        }
        .screen-only { display: block; }
        .print-only { display: none; }
        @media print {
            .screen-only { display: none; }
            .print-only { display: block; }
        }
    </style>
</head>
<body class="${bodyClass}">
<div class="${wrapperClass}">${headerHtml}<form id="psbForm" onsubmit="event.preventDefault();"><div class="mb-6 break-inside-avoid"><label class="block font-bold mb-1 text-gray-700 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">Jenjang Pendidikan</label><div class="font-bold text-lg p-2 bg-gray-50 border-b border-gray-300 print:border-none print:bg-transparent print:p-0 print:text-black ${style === 'classic' ? 'bg-transparent border-b-2 border-gray-300' : ''}">${jenjangName}</div><input type="hidden" name="jenjangId" value="${localConfig.targetJenjangId||''}" /></div>${activeFieldsHtml}${localConfig.requiredDocuments.length>0?`<div class="mt-8 mb-6 p-4 border rounded-lg break-inside-avoid ${style === 'classic' ? 'border-[#1B4D3E]/30 bg-[#f0fdf4]/30' : ''}"><h4 class="font-bold mb-3 ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">Checklist Persyaratan Berkas (Bawa Fisik)</h4><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${docsHtml}</div></div>`:''}${customFieldsHtml}<div class="mt-8 no-print space-y-3"><button type="button" id="submit-btn" onclick="submitForm()" class="w-full flex justify-center items-center gap-2 ${buttonColor} text-white font-bold py-3 rounded-lg transition shadow-md"><i class="${buttonIcon} text-xl"></i> ${buttonText}</button><p class="text-xs text-center text-gray-500 mt-2">${buttonSubtext}</p></div><div class="mt-8 pt-4 border-t text-center text-xs text-gray-500"><div>Tahun Ajaran ${localConfig.tahunAjaranAktif || new Date().getFullYear()}</div><div class="mt-1">dibuat dengan aplikasi eSantri Web by AI Projek | aiprojek01.my.id</div></div></form>${closeDiv}</div><script>
function insertMd(elemId, before, after) {
    after = after || '';
    var el = document.getElementById(elemId);
    if (!el) return;
    var start = el.selectionStart || 0;
    var end = el.selectionEnd || 0;
    var current = el.value || '';
    var sel = current.substring(start, end) || 'teks';
    var rep = before + sel + after;
    el.value = current.substring(0, start) + rep + current.substring(end);
    el.focus();
    el.setSelectionRange(start + before.length, start + before.length + sel.length);
}
</script>
${modalHtml}${submitScript}${deadlineCheckScript}</body></html>`;
    };

    const handleDownloadPdf = () => {
        const html = generateHtml();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                }, 800);
            };
            // Fallback just in case
            setTimeout(() => {
                if (printWindow.document.readyState === 'complete') {
                    printWindow.print();
                }
            }, 1500);
        } else {
            showToast("Pop-up diblokir. Izinkan pop-up untuk mencetak.", "error");
        }
    };

    const handleDownloadForm = () => {
        const html = generateHtml();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const targetJenjang = settings.jenjang.find((j) => j.id === localConfig.targetJenjangId);
        const jenjangName = targetJenjang ? targetJenjang.nama.replace(/\s+/g, '_') : 'Umum';
        const cleanName = (templateName || `Form_PSB_${jenjangName}`).replace(/[/\\?%*:|"<>]/g, '_');
        link.download = `${cleanName}.html`;
        link.click();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
        if (iframe) {
            const html = generateHtml(true);
            iframe.srcdoc = html;
            iframe.onload = () => {
                try {
                    if (iframe.contentWindow?.document?.body) {
                        const h = iframe.contentWindow.document.body.scrollHeight;
                        if (h > 500) {
                            iframe.style.height = `${h + 60}px`;
                        }
                    }
                } catch {
                    // cross-origin safety
                }
            };
        }
    }, [localConfig, settings, templateName, submissionMethod, googleScriptUrl]);


    return (
        <div className="flex flex-col gap-4">
            {/* Mobile View Toggle */}
            <div className="lg:hidden flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                    type="button"
                    onClick={() => setMobileTab('config')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        mobileTab === 'config'
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <i className="bi bi-sliders text-sm"></i>
                    <span>Desain &amp; Pengaturan</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileTab('preview')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        mobileTab === 'preview'
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <i className="bi bi-eye-fill text-sm"></i>
                    <span>Pratinjau Live Form</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 lg:h-[calc(100vh-200px)]">
                <div className={`lg:col-span-4 bg-white p-4 sm:p-6 rounded-xl shadow-md overflow-y-auto ${mobileTab === 'config' ? 'block' : 'hidden lg:block'} h-auto lg:h-full space-y-6 text-sm`}>
                
                {/* 1. CONFIG UTAMA */}
                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">1. Konfigurasi Dasar</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Judul Formulir</label>
                            <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Contoh: Pendaftaran Gelombang 1" className="w-full border rounded p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Target Jenjang</label>
                            <select value={localConfig.targetJenjangId || 0} onChange={e => setLocalConfig({...localConfig, targetJenjangId: parseInt(e.target.value)})} className="w-full border rounded p-2 text-sm">
                                <option value={0}>-- Pilih Jenjang --</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Gaya Desain</label>
                            <select value={localConfig.designStyle || 'classic'} onChange={e => setLocalConfig({...localConfig, designStyle: e.target.value as PsbDesignStyle})} className="w-full border rounded p-2 text-sm">
                                {styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                         
                         {/* DEADLINE CONFIG */}
                         <div className="bg-red-50 p-2 rounded border border-red-100">
                            <label className="block text-xs font-bold text-red-700 mb-1">Masa Berlaku Formulir (Deadline)</label>
                            <input 
                                type="date" 
                                value={localConfig.registrationDeadline || ''} 
                                onChange={e => setLocalConfig({...localConfig, registrationDeadline: e.target.value})} 
                                className="w-full border border-red-300 rounded p-2 text-sm bg-white" 
                            />
                            <p className="text-[10px] text-red-600 mt-1">Kosongkan jika berlaku selamanya. Jika diisi, formulir akan otomatis tertutup setelah tanggal ini.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Metode Pengiriman</label>
                            <select value={submissionMethod} onChange={e => setSubmissionMethod(e.target.value as any)} className="w-full border rounded p-2 text-sm bg-blue-50 border-blue-200">
                                <option value="whatsapp">WhatsApp (Teks Langsung)</option>
                                <option value="google_sheet">Google Sheet (Web App)</option>
                                <option value="hybrid">Hybrid (Sheet + WA Backup)</option>
                            </select>
                            <p className="mt-1 text-[10px] text-gray-500">Gunakan <strong>Hybrid</strong> untuk upload berkas langsung ke cloud dengan backup WA otomatis.</p>
                        </div>

                        {submissionMethod !== 'whatsapp' && (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2.5">
                                <div>
                                    <label className="font-bold block text-gray-700 mb-1">
                                        URL Google Apps Script (Web App)
                                    </label>
                                    <input
                                        type="text"
                                        value={googleScriptUrl}
                                        onChange={e => setGoogleScriptUrl(e.target.value)}
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        className="w-full border border-gray-300 rounded-lg p-2 font-mono text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden"
                                    />
                                    {googleScriptUrl.trim() && !isScriptUrlValid(googleScriptUrl) && (
                                        <p className="text-[10px] text-red-600 mt-1">
                                            ⚠️ URL belum valid. Gunakan URL deployment Web App yang berakhiran <code>/exec</code>.
                                        </p>
                                    )}
                                </div>

                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowScriptHelper(!showScriptHelper)}
                                        className="w-full flex items-center justify-between px-3 py-2 bg-teal-50 hover:bg-teal-100/70 border border-teal-200 rounded-lg text-teal-900 font-semibold text-xs transition-colors"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <i className="bi bi-code-slash text-teal-700"></i>
                                            <span>Kode Script GAS (Code.gs) &amp; Panduan Alur</span>
                                        </span>
                                        <i className={`bi ${showScriptHelper ? 'bi-chevron-up' : 'bi-chevron-down'} text-teal-600`}></i>
                                    </button>

                                    {showScriptHelper && (
                                        <div className="mt-2.5 space-y-3 bg-white p-3 rounded-xl border border-teal-200 shadow-2xs">
                                            {/* Panduan Singkat Alur */}
                                            <div className="bg-teal-50/60 p-2.5 rounded-lg border border-teal-200/70 text-[11px] text-teal-950 space-y-1.5">
                                                <div className="font-bold flex items-center gap-1 text-teal-900 text-xs">
                                                    <i className="bi bi-lightning-charge-fill text-amber-500"></i>
                                                    Panduan Singkat Alur Integrasi Google Sheets:
                                                </div>
                                                <ol className="list-decimal pl-4 space-y-1 text-gray-700">
                                                    <li>Buka Google Spreadsheet baru panitia &gt; klik menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
                                                    <li>Hapus kode default di file <code>Code.gs</code>, lalu tempelkan seluruh kode script di bawah ini.</li>
                                                    <li><strong>Folder Drive (Disarankan):</strong> Buat folder khusus di Google Drive Anda (cth: "Berkas PSB 2026"), salin ID Foldernya dari URL browser, lalu ganti baris <code>var folderId = "..."</code>.</li>
                                                    <li><strong>Deploy Web App:</strong> Klik tombol biru <strong>Deploy &gt; Deployment Baru</strong> &gt; pilih jenis <strong>Aplikasi Web</strong> &gt; atur Akses: <strong>Siapa Saja (Anyone)</strong>.</li>
                                                    <li>Salin URL hasil deployment (berakhiran <code>/exec</code>) ke kotak input URL di atas.</li>
                                                </ol>
                                                <p className="text-[10px] text-teal-800 italic pt-0.5">
                                                    * Panduan komprehensif, tutorial bergambar &amp; hak akses Drive lengkap tersedia di menu <strong>Sistem &gt; Panduan Sistem &gt; Penerimaan Santri Baru (PSB)</strong>.
                                                </p>
                                            </div>

                                            {/* Kode Script Lengkap (Rapi & Responsif) */}
                                            <div className="rounded-xl border border-slate-700/80 overflow-hidden bg-slate-900 shadow-sm mt-2">
                                                <div className="bg-slate-800 px-3 py-2.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                                            <i className="bi bi-file-earmark-code-fill text-xs"></i>
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-100 text-xs flex items-center gap-1.5 truncate">
                                                                <span>Kode Backend</span>
                                                                <code className="text-amber-300 font-mono text-[11px] bg-amber-500/10 px-1 rounded">Code.gs</code>
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">Google Apps Script Siap Pakai</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyGasScript}
                                                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                                                            copiedScript
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-teal-600 hover:bg-teal-500 text-white active:scale-95'
                                                        }`}
                                                        title="Salin seluruh kode program ke clipboard"
                                                    >
                                                        <i className={`bi ${copiedScript ? 'bi-check2-all text-sm' : 'bi-clipboard'}`}></i>
                                                        <span>{copiedScript ? 'Tersalin!' : 'Salin Kode Script'}</span>
                                                    </button>
                                                </div>
                                                <textarea
                                                    readOnly
                                                    value={googleAppsScriptCode}
                                                    rows={8}
                                                    className="w-full bg-slate-950 text-emerald-300 font-mono text-[11px] p-3 border-0 focus:ring-0 focus:outline-hidden resize-y leading-relaxed"
                                                    placeholder="// Kode script Google Apps Script..."
                                                />
                                                <div className="bg-slate-900/90 px-3 py-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                                                    <span>💡 Klik textarea lalu tekan Ctrl+A jika ingin memilih manual</span>
                                                    <span className="text-teal-400 font-mono font-semibold">v2.4 Smart Multi-Sheet</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                         <div className="flex gap-2 mt-2">
                             {activeTemplateId ? (
                                <>
                                    <button onClick={handleSaveTemplate} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs font-bold hover:bg-blue-700 shadow-sm">Update Template</button>
                                    <button onClick={handleResetSelection} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-300" title="Batal Edit / Buat Baru"><i className="bi bi-plus-square"></i> Baru</button>
                                </>
                             ) : (
                                <button onClick={handleSaveTemplate} className="flex-1 bg-teal-600 text-white py-1.5 rounded text-xs font-bold hover:bg-teal-700 shadow-sm">Simpan Template Baru</button>
                             )}
                             {activeTemplateId && <button onClick={() => handleDeleteTemplate(activeTemplateId)} className="bg-red-100 text-red-600 px-3 rounded text-xs font-bold hover:bg-red-200"><i className="bi bi-trash"></i></button>}
                        </div>
                        {localConfig.templates && localConfig.templates.length > 0 && (
                             <div className="border rounded max-h-32 overflow-y-auto mt-2">
                                 {localConfig.templates.map(t => (
                                     <div key={t.id} onClick={() => handleLoadTemplate(t.id)} className={`p-2 hover:bg-gray-100 cursor-pointer text-xs border-b last:border-0 flex justify-between ${activeTemplateId === t.id ? 'bg-blue-50 font-semibold' : ''}`}>
                                         <span>{t.name}</span> <span className="text-gray-400">{settings.jenjang.find(j=>j.id===t.targetJenjangId)?.nama}</span>
                                     </div>
                                 ))}
                             </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">2. Kelengkapan Data</h3>
                    <div className="space-y-4 max-h-64 overflow-y-auto border p-2 rounded bg-gray-50 shadow-inner">
                        {fieldGroups.map((group, gIdx) => (
                            <div key={gIdx} className="border-b pb-2 mb-2 last:border-0">
                                <h4 className="font-bold text-[10px] text-teal-700 mb-1 uppercase tracking-tight">{group.title}</h4>
                                <div className="space-y-1.5">
                                    {group.fields.map(f => {
                                        const isActive = localConfig.activeFields.includes(f.key);
                                        const isRequired = (localConfig.requiredStandardFields || []).includes(f.key);
                                        const currentHint = (localConfig.fieldHints && localConfig.fieldHints[f.key] !== undefined)
                                            ? localConfig.fieldHints[f.key]
                                            : (DEFAULT_FIELD_HINTS[f.key] || '');
                                        return (
                                            <div key={f.key} className="p-1.5 rounded hover:bg-gray-100/80 bg-white/50 border border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center gap-2 cursor-pointer flex-grow">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isActive} 
                                                            onChange={() => toggleField(f.key)} 
                                                            className="text-teal-600 rounded w-4 h-4"
                                                        />
                                                        <span className="text-xs text-gray-700 font-medium">{f.label}</span>
                                                    </label>
                                                    {isActive && (
                                                        <label className="flex items-center gap-1 cursor-pointer bg-white px-1.5 py-0.5 rounded border border-gray-200 hover:border-red-300">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isRequired} 
                                                                onChange={() => toggleRequired(f.key)} 
                                                                className="text-red-600 rounded w-3.5 h-3.5 focus:ring-red-500"
                                                            />
                                                            <span className={`text-[10px] ${isRequired ? 'text-red-600 font-bold' : 'text-gray-400'}`}>Wajib?</span>
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Hint input for active field */}
                                                {isActive && (
                                                    <div className="mt-1.5 pl-6 pr-0.5 flex items-center gap-1.5">
                                                        <span className="text-[10px] text-teal-700 font-semibold shrink-0 flex items-center gap-1">
                                                            <i className="bi bi-info-circle text-[11px]"></i> Hint:
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={currentHint}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setLocalConfig(prev => ({
                                                                    ...prev,
                                                                    fieldHints: {
                                                                        ...(prev.fieldHints || {}),
                                                                        [f.key]: val
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder={`Petunjuk pengisian ${f.label.toLowerCase()}...`}
                                                            className="flex-1 bg-white border border-gray-200 rounded px-2 py-0.5 text-[11px] text-gray-700 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                                                            title="Teks petunjuk yang muncul tepat di bawah pertanyaan/permintaan data"
                                                        />
                                                        {currentHint !== (DEFAULT_FIELD_HINTS[f.key] || '') && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setLocalConfig(prev => ({
                                                                        ...prev,
                                                                        fieldHints: {
                                                                            ...(prev.fieldHints || {}),
                                                                            [f.key]: DEFAULT_FIELD_HINTS[f.key] || ''
                                                                        }
                                                                    }));
                                                                }}
                                                                className="text-[10px] text-gray-400 hover:text-teal-700 p-0.5 shrink-0"
                                                                title="Reset ke petunjuk standar"
                                                            >
                                                                <i className="bi bi-arrow-counterclockwise"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                 <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">3. Persyaratan Berkas</h3>
                    <div className="space-y-2 bg-gray-50 p-3 rounded-lg border">
                        <div className="flex gap-2">
                            <input type="text" value={newDoc} onChange={e => setNewDoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDocument()} placeholder="Tambah Berkas (cth: KK)" className="flex-grow border rounded p-1.5 text-xs"/>
                            <button onClick={addDocument} className="bg-teal-600 text-white px-3 rounded text-xs">Tambah</button>
                        </div>
                        <div className="space-y-1">
                            {localConfig.requiredDocuments.map((doc, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white px-2 py-1 rounded border group">
                                    <span className="text-xs text-gray-700">{doc}</span>
                                    <button onClick={() => removeDocument(idx)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><i className="bi bi-x-circle"></i></button>
                                </div>
                            ))}
                            {localConfig.requiredDocuments.length === 0 && <p className="text-[10px] text-gray-400 italic text-center">Belum ada berkas persyaratan.</p>}
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">4. Pertanyaan Tambahan & Upload</h3>
                    <CustomFieldEditor fields={localConfig.customFields ?? []} onChange={(fields) => setLocalConfig({...localConfig, customFields: fields})} />
                    <p className="text-[10px] text-gray-500 mt-2 italic">* Gunakan tipe 'Unggah Dokumen' untuk meminta file upload (Mode Cloud).</p>
                </div>

                <div className="pt-4 border-t sticky bottom-0 bg-white">
                    <button onClick={handleFinalSave} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium shadow-md">Simpan Konfigurasi Utama</button>
                </div>
            </div>
            
            <div className={`lg:col-span-8 flex flex-col h-[75vh] min-h-[480px] lg:h-full bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
                {/* Toolbar following ReportPreviewPanel reference */}
                <div className="bg-white border-b px-3 sm:px-4 py-2.5 flex flex-wrap gap-2 justify-between items-center z-20 shadow-2xs shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                            <i className="bi bi-eye text-teal-600"></i> Preview Formulir
                        </span>
                        {templateName && (
                            <span className="bg-teal-50 text-teal-700 border border-teal-200 text-xs px-2 py-0.5 rounded-full font-medium">
                                {templateName}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center flex-wrap justify-end gap-2">
                        {/* Zoom Controls */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setManualZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                                className="h-7 w-7 hover:bg-white rounded text-gray-700 transition flex items-center justify-center cursor-pointer"
                                title="Perkecil (Zoom Out)"
                            >
                                <i className="bi bi-dash"></i>
                            </button>
                            <span className="text-[11px] font-mono w-11 text-center font-medium text-gray-700">
                                {Math.round(manualZoom * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => setManualZoom(z => Math.min(2, Number((z + 0.1).toFixed(2))))}
                                className="h-7 w-7 hover:bg-white rounded text-gray-700 transition flex items-center justify-center cursor-pointer"
                                title="Perbesar (Zoom In)"
                            >
                                <i className="bi bi-plus"></i>
                            </button>
                            <button
                                type="button"
                                onClick={() => setManualZoom(1)}
                                className="ml-1 h-7 px-2 text-[11px] rounded hover:bg-white text-gray-600 border border-transparent hover:border-gray-200 transition cursor-pointer"
                                title="Reset Ukuran Normal (100%)"
                            >
                                100%
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-xs flex items-center gap-2 transition cursor-pointer"
                            title="Cetak atau Simpan PDF"
                        >
                            <i className="bi bi-printer"></i>
                            <span className="hidden sm:inline">Cetak / PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadForm}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-xs flex items-center gap-2 transition cursor-pointer"
                            title="Unduh Formulir HTML Mandiri"
                        >
                            <i className="bi bi-download"></i>
                            <span className="hidden sm:inline">Unduh Formulir</span>
                        </button>
                    </div>
                </div>

                {/* Preview Canvas with single paper sheet */}
                <div id="preview-area" className="flex-grow overflow-auto p-3 sm:p-6 flex justify-center items-start bg-gray-200/50 backdrop-blur-xs">
                    <div 
                        className="printable-content-wrapper origin-top transition-transform duration-200 w-full max-w-[210mm] shadow-xl rounded-xl border border-gray-300 bg-white overflow-hidden"
                        style={{ transform: `scale(${manualZoom})`, transformOrigin: 'top center' }}
                    >
                        <iframe
                            id="preview-frame"
                            className="w-full border-0 block min-h-[960px]"
                            title="Form Preview"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};
