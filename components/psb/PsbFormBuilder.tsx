import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { PsbConfig, PondokSettings, PsbDesignStyle, PsbFormTemplate, PsbSubmissionMethod } from '../../types';
import { CustomFieldEditor } from './common/CustomFieldEditor';

interface PsbFormBuilderProps {
    config: PsbConfig;
    settings: PondokSettings;
    onSave: (c: PsbConfig) => void;
}

export const PsbFormBuilder: React.FC<PsbFormBuilderProps> = ({ config, settings, onSave }) => {
    const { showToast, showConfirmation } = useAppContext();
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
    const [submissionMethod, setSubmissionMethod] = useState<PsbSubmissionMethod>(config.submissionMethod || 'whatsapp');
    const [googleScriptUrl, setGoogleScriptUrl] = useState(config.googleScriptUrl || '');
    const [showScriptHelper, setShowScriptHelper] = useState(false);

    const styles: {id: PsbDesignStyle, label: string}[] = [
        { id: 'classic', label: 'Klasik Tradisional' },
        { id: 'modern', label: 'Modern Tech' },
        { id: 'bold', label: 'Bold & Clean' },
        { id: 'dark', label: 'Premium Dark' },
        { id: 'ceria', label: 'Ceria (TPQ/TK)' }
    ];
    
    // Field Groups 
    const fieldGroups = [
        {
            title: 'Identitas',
            fields: [
                { key: 'namaLengkap', label: 'Nama Lengkap (Sesuai Ijazah)' },
                { key: 'namaHijrah', label: 'Nama Panggilan' },
                { key: 'nisn', label: 'NISN' },
                { key: 'nik', label: 'NIK' },
                { key: 'jenisKelamin', label: 'Jenis Kelamin' },
                { key: 'tempatLahir', label: 'Tempat Lahir' },
                { key: 'tanggalLahir', label: 'Tanggal Lahir' },
                { key: 'kewarganegaraan', label: 'Kewarganegaraan' },
                { key: 'statusKeluarga', label: 'Status dalam Keluarga' },
                { key: 'anakKe', label: 'Anak Ke' },
                { key: 'jumlahSaudara', label: 'Jumlah Saudara' },
            ]
        },
        {
            title: 'Alamat & Kontak',
            fields: [
                { key: 'alamat', label: 'Jalan / Detail' },
                { key: 'desaKelurahan', label: 'Desa / Kelurahan' },
                { key: 'kecamatan', label: 'Kecamatan' },
                { key: 'kabupatenKota', label: 'Kabupaten / Kota' },
                { key: 'provinsi', label: 'Provinsi' },
                { key: 'kodePos', label: 'Kode Pos' },
            ]
        },
        {
            title: 'Data Ayah',
            fields: [
                { key: 'namaAyah', label: 'Nama Ayah' },
                { key: 'nikAyah', label: 'NIK Ayah' },
                { key: 'statusAyah', label: 'Status Ayah (Hidup/Meninggal)' },
                { key: 'pekerjaanAyah', label: 'Pekerjaan Ayah' },
                { key: 'pendidikanAyah', label: 'Pendidikan Ayah' },
                { key: 'penghasilanAyah', label: 'Penghasilan Ayah' },
                { key: 'teleponAyah', label: 'No. HP Ayah' },
            ]
        },
        {
            title: 'Data Ibu',
            fields: [
                { key: 'namaIbu', label: 'Nama Ibu' },
                { key: 'nikIbu', label: 'NIK Ibu' },
                { key: 'statusIbu', label: 'Status Ibu (Hidup/Meninggal)' },
                { key: 'pekerjaanIbu', label: 'Pekerjaan Ibu' },
                { key: 'pendidikanIbu', label: 'Pendidikan Ibu' },
                { key: 'penghasilanIbu', label: 'Penghasilan Ibu' },
                { key: 'teleponIbu', label: 'No. HP Ibu' },
            ]
        },
        {
            title: 'Data Wali & Sekolah',
            fields: [
                { key: 'namaWali', label: 'Nama Wali' },
                { key: 'nomorHpWali', label: 'No. HP / WhatsApp (Wali)' },
                { key: 'hubunganWali', label: 'Hubungan Wali' },
                { key: 'asalSekolah', label: 'Asal Sekolah' },
                { key: 'alamatSekolahAsal', label: 'Alamat Sekolah Asal' },
            ]
        },
    ];

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
        const configToSave = {
            ...localConfig,
            submissionMethod,
            googleScriptUrl
        };
        onSave(configToSave);
    }

    const handleSaveTemplate = () => {
        if (!templateName.trim()) {
            showToast('Nama formulir/template tidak boleh kosong.', 'error');
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
            submissionMethod, 
            googleScriptUrl 
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
                    templates: prev.templates
                }));
                // Update specific states for method
                setSubmissionMethod(tpl.submissionMethod || 'whatsapp');
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

    const googleAppsScriptCode = `
/* GOOGLE APPS SCRIPT FOR ESANTRI WEB - SMART VERSION */
// [Kode sama seperti sebelumnya...]
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
    var data = JSON.parse(e.postData.contents);
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
    
    for (var key in data) {
        if (typeof data[key] === 'object' && data[key] !== null && data[key].isFile) {
            var fileData = data[key];
            var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data.split(',')[1]), fileData.mime, fileData.name);
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

    const generateHtml = () => {
        const style = localConfig.designStyle || 'classic';
        const targetJenjang = settings.jenjang.find((j) => j.id === localConfig.targetJenjangId);
        const jenjangName = targetJenjang ? targetJenjang.nama : 'Umum';
        const targetSheetName = templateName ? templateName : `Pendaftar ${jenjangName}`;
        
        // Helper to generate inputs based on theme
        const renderInput = (label: string, name: string, type: string = 'text', placeholder: string = '', required: boolean = false) => {
            const commonPrint = `border-none border-b border-gray-400 bg-transparent rounded-none px-0`;
            const reqStar = required ? '<span class="text-red-500">*</span>' : '';
            const reqAttr = required ? 'required' : '';

            // Handling file input logic
            if (type === 'file') {
                if (submissionMethod === 'whatsapp') {
                    // Plain WA method: Cannot send files easily
                    return `
                    <div class="mb-4 break-inside-avoid">
                        <label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${label} ${reqStar}</label>
                        <div class="p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                            <i class="fas fa-info-circle"></i> Lampirkan file ini secara manual di chat WhatsApp setelah klik Kirim.
                        </div>
                    </div>`;
                } else {
                    // Google Sheet OR Hybrid mode: Use real file input for Drive upload
                    return `
                    <div class="mb-4 break-inside-avoid">
                        <label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${label} ${reqStar}</label>
                        <input type="file" name="${name}" accept="image/*,application/pdf" ${reqAttr} class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" />
                        <p class="text-[10px] text-gray-400 mt-1">Maks 5MB. PDF atau Foto.</p>
                    </div>`;
                }
            }

            // Standard Inputs
             if (style === 'classic') {
                return `
                <div class="mb-5 break-inside-avoid">
                    <label class="block text-[#1B4D3E] text-sm font-bold mb-1 print:text-black font-serif">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full border-b-2 border-gray-300 focus:border-[#1B4D3E] outline-none py-2 bg-transparent transition font-serif placeholder-gray-400 print:${commonPrint} print:border-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'modern') {
                return `
                <div class="mb-4 break-inside-avoid">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none placeholder-gray-400 print:${commonPrint} print:text-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'bold') {
                return `
                <div class="mb-4 border-b border-gray-100 pb-2 break-inside-avoid">
                    <label class="font-bold text-gray-700 block mb-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full bg-gray-50 border-0 border-b-2 border-gray-300 focus:border-red-600 focus:bg-white px-2 py-2 transition outline-none placeholder-gray-400 print:${commonPrint} print:text-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'dark') {
                return `
                <div class="mb-6 group break-inside-avoid">
                    <label class="block text-xs text-amber-500 uppercase tracking-widest mb-2 group-focus-within:text-white transition print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full bg-slate-800 border-b border-slate-600 focus:border-amber-500 px-0 py-3 text-white outline-none transition placeholder-slate-600 print:bg-white print:text-black print:border-gray-400" placeholder="${placeholder}">
                </div>`;
            } else { // ceria
                 return `
                 <div class="mb-4 break-inside-avoid">
                    <label class="block text-gray-500 text-xs font-bold uppercase mb-1 ml-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${reqAttr} class="w-full bg-orange-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-300 outline-none font-bold text-gray-700 placeholder-gray-400 print:bg-white print:border-b print:border-gray-400 print:rounded-none print:text-black" placeholder="${placeholder}">
                 </div>`;
            }
        };

        const activeFieldsHtml = fieldGroups.flatMap(group => {
            const groupFields = group.fields.filter(f => localConfig.activeFields.includes(f.key));
            if (groupFields.length === 0) return [];
            
            let header = '';
            if (style === 'classic') header = `<h3 class="bg-[#1B4D3E] text-[#D4AF37] px-6 py-2 font-bold uppercase text-sm mb-6 inline-block rounded-r-full break-after-avoid print:bg-gray-200 print:text-black print:border print:border-black font-serif tracking-widest shadow-sm">${group.title}</h3>`;
            else if (style === 'modern') header = `<h3 class="text-blue-600 font-bold text-lg mb-4 flex items-center gap-2 border-b pb-1 break-after-avoid print:text-black print:border-black"><span class="bg-blue-100 p-1.5 rounded text-sm print:hidden"><i class="fas fa-caret-right"></i></span> ${group.title}</h3>`;
            else if (style === 'bold') header = `<h3 class="text-xl font-bold text-gray-800 border-l-4 border-red-700 pl-3 mb-4 break-after-avoid print:text-black print:border-black">${group.title}</h3>`;
            else if (style === 'dark') header = `<h3 class="text-white font-serif text-xl border-b border-slate-700 pb-2 mb-4 print:text-black print:border-gray-400 break-after-avoid">${group.title}</h3>`;
            else if (style === 'ceria') header = `<div class="flex items-center gap-3 mb-4 break-after-avoid"><div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-lg print:hidden"><i class="fas fa-star"></i></div><h3 class="font-bold text-gray-700 text-lg print:text-black">${group.title}</h3></div>`;

            const fieldsHtml = groupFields.map(f => {
                const isRequired = (localConfig.requiredStandardFields || []).includes(f.key);
                
                if (f.key === 'jenisKelamin') {
                     // Simple radio logic
                     return `
                     <div class="mb-4 break-inside-avoid">
                        <label class="block text-sm font-bold mb-1 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">Jenis Kelamin ${isRequired ? '<span class="text-red-500">*</span>' : ''}</label>
                        <div class="flex gap-4 mt-1 ${style === 'classic' ? 'font-serif' : ''}">
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="jenisKelamin" value="Laki-laki" ${isRequired ? 'required' : ''}> Laki-laki</label>
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="jenisKelamin" value="Perempuan" ${isRequired ? 'required' : ''}> Perempuan</label>
                        </div>
                     </div>`;
                }
                return renderInput(f.label, f.key, f.key.toLowerCase().includes('tanggal') ? 'date' : 'text', '', isRequired);
            }).join('');

            return [`<section class="mb-8 break-inside-avoid">${header}<div class="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">${fieldsHtml}</div></section>`];
        }).join('');

        const customFieldsHtml = localConfig.customFields?.map(field => {
            if (field.type === 'section') return `<h4 class="font-bold text-lg mt-6 mb-3 border-b-2 border-gray-300 pb-1 break-after-avoid print:text-black print:border-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif uppercase border-[#1B4D3E]/30' : ''}">${field.label}</h4>`;
            if (field.type === 'statement') return `<div class="mb-4 text-sm text-justify leading-relaxed print:text-black ${style === 'classic' ? 'font-serif' : ''}">${field.label}</div>`;
            if (field.type === 'text') return renderInput(field.label, `custom_${field.id}`, 'text', '', field.required);
            if (field.type === 'file') return renderInput(field.label, `custom_${field.id}`, 'file', '', field.required);
            if (field.type === 'paragraph') return `<div class="mb-4 break-inside-avoid"><label class="block text-gray-600 text-sm font-bold mb-1 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label><textarea name="custom_${field.id}" rows="3" ${field.required ? 'required' : ''} class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 outline-none print:bg-white print:border-black ${style === 'classic' ? 'bg-transparent border-b-2 rounded-none border-gray-300 focus:border-[#1B4D3E] font-serif' : ''}"></textarea></div>`;
            if (field.type === 'radio' || field.type === 'checkbox') {
                const opts = field.options?.filter(o => o.trim() !== '') || [];
                const optionsHtml = opts.map(opt => `<label class="flex items-center gap-2 cursor-pointer p-1"><input type="${field.type}" name="custom_${field.id}${field.type==='checkbox'?'[]':''}" value="${opt}" class="w-4 h-4 text-teal-600" ${field.required && field.type === 'radio' ? 'required' : ''}> <span class="text-sm">${opt}</span></label>`).join('');
                return `<div class="mb-4 break-inside-avoid"><label class="block text-gray-600 text-sm font-bold mb-1 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label><div class="space-y-1 mt-1 ${style === 'classic' ? 'font-serif' : ''}">${optionsHtml}</div></div>`;
            }
            return '';
        }).join('') || '';

        const docsHtml = localConfig.requiredDocuments.map(doc => 
            `<label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 print:border-black ${style === 'classic' ? 'border-[#1B4D3E]/30 bg-white font-serif' : ''}">
                <input type="checkbox" name="docs[]" value="${doc}" class="w-5 h-5 text-teal-600 print:text-black">
                <span class="text-sm">${doc} (Bawa Fisik Saat Daftar Ulang)</span>
             </label>`
        ).join('');

        let bodyClass = "bg-gray-100 min-h-screen py-10 font-sans text-gray-800 print:bg-white print:py-0";
        let wrapperClass = "bg-white shadow-xl mx-auto max-w-2xl p-8 rounded-lg print:shadow-none print:max-w-none print:p-0";
        let headerHtml = `<div class="text-center mb-8"><h1 class="text-2xl font-bold">${settings.namaPonpes}</h1><p>Formulir Pendaftaran</p></div>`;

        if (style === 'classic') {
            bodyClass = "bg-[#F3F4F6] min-h-screen py-10 font-serif text-gray-900 print:bg-white";
            wrapperClass = "bg-[#fff] shadow-2xl mx-auto max-w-[210mm] p-10 rounded-sm border-t-[8px] border-[#1B4D3E] print:shadow-none print:border-none print:rounded-none print:max-w-none";
            headerHtml = `
                <div class="text-center mb-12 relative">
                    <div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-[#D4AF37] rounded-full"></div>
                    <h1 class="text-3xl font-bold text-[#1B4D3E] mt-6 mb-2 uppercase tracking-wide leading-tight">${settings.namaPonpes}</h1>
                    <div class="text-[#D4AF37] font-semibold italic text-lg border-b border-gray-200 pb-4 inline-block px-10">Penerimaan Santri Baru</div>
                    <p class="text-xs text-gray-500 mt-2 font-sans tracking-widest uppercase">Tahun Ajaran ${localConfig.tahunAjaranAktif || new Date().getFullYear()}</p>
                </div>
            `;
        } else if (style === 'modern') {
             bodyClass = "bg-slate-50 min-h-screen py-10 font-sans print:bg-white";
             wrapperClass = "bg-white shadow-xl mx-auto max-w-[210mm] border border-gray-200 rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:max-w-none";
             headerHtml = `<div class="bg-blue-600 p-8 text-white flex justify-between items-center print:bg-white print:text-black print:border-b-2 print:border-blue-600 print:mb-6"><div><h1 class="text-3xl font-bold tracking-tight">Registration</h1><p class="text-blue-100 print:text-gray-600">${settings.namaPonpes}</p></div><div class="text-5xl opacity-30 print:hidden"><i class="fas fa-file-signature"></i></div></div><div class="p-8 print:p-0">`;
        } 
        else if (style === 'bold') {
            bodyClass = "bg-zinc-100 min-h-screen py-10 font-sans print:bg-white";
            wrapperClass = "bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mx-auto max-w-2xl p-8 border-2 border-black print:shadow-none print:border-none";
            headerHtml = `<div class="mb-10 border-b-4 border-black pb-4"><h1 class="text-4xl font-black uppercase tracking-tighter">${settings.namaPonpes}</h1><p class="text-lg font-bold bg-black text-white inline-block px-2 transform -skew-x-12">PENERIMAAN SANTRI BARU</p></div>`;
        } else if (style === 'dark') {
            bodyClass = "bg-slate-900 min-h-screen py-10 font-sans print:bg-white";
            wrapperClass = "bg-slate-800 shadow-2xl mx-auto max-w-2xl p-10 rounded-2xl border border-slate-700 text-slate-200 print:bg-white print:text-black print:shadow-none";
            headerHtml = `<div class="text-center mb-12"><div class="inline-block p-4 rounded-full bg-slate-700/50 mb-4 print:hidden"><i class="fas fa-school text-4xl text-amber-500"></i></div><h1 class="text-3xl font-serif text-white print:text-black">${settings.namaPonpes}</h1><div class="h-1 w-20 bg-amber-500 mx-auto mt-4 rounded-full print:bg-black"></div></div>`;
        } else { // ceria
            bodyClass = "bg-yellow-50 min-h-screen py-10 font-comic print:bg-white";
            wrapperClass = "bg-white shadow-xl mx-auto max-w-2xl p-8 rounded-[2rem] border-4 border-orange-200 print:border-none print:shadow-none";
            headerHtml = `<div class="text-center mb-8 bg-orange-100 p-6 rounded-[2rem] print:bg-transparent print:p-0"><h1 class="text-3xl font-bold text-orange-600 print:text-black">${settings.namaPonpes}</h1><p class="text-orange-800 print:text-gray-600">Formulir Pendaftaran Santri</p></div>`;
        }
        
        const closeDiv = (style === 'modern' || style === 'bold') ? '</div>' : '';
        const buttonIcon = submissionMethod === 'whatsapp' ? 'fab fa-whatsapp' : submissionMethod === 'hybrid' ? 'fas fa-check-double' : 'fas fa-paper-plane';
        const buttonText = submissionMethod === 'whatsapp' ? 'Kirim Data via WhatsApp' : submissionMethod === 'hybrid' ? 'Kirim Data (Cloud + WA)' : 'Kirim Pendaftaran';
        const buttonColor = submissionMethod === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : submissionMethod === 'hybrid' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700';
        
        const adminPhone = localConfig.nomorHpAdmin.replace(/^0/, '62');
        let submitScript = '';
        if (submissionMethod === 'whatsapp') {
             submitScript = `<script>function submitForm(){const form=document.getElementById('psbForm');if(!form.checkValidity()){form.reportValidity();return;}const btn=document.getElementById('submit-btn');const originalContent=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Memproses...';const formData=new FormData(form);const data={tanggalDaftar:new Date().toISOString(),status:'Baru'};const customData={};formData.forEach((value,key)=>{if(key.startsWith('custom_')){customData[key.replace('custom_','')]=value;}else if(key==='docs[]'){if(!data.docs)data.docs=[];data.docs.push(value);}else{data[key]=value;}});data.customData=JSON.stringify(customData);let message="*Pendaftaran Santri Baru*\\n*${settings.namaPonpes}*\\n\\n";message+="Nama: "+data.namaLengkap+"\\n";message+="Jenjang: "+"${jenjangName}"+"\\n";message+="Wali: "+(data.namaWali||data.namaAyah||'-')+"\\n";message+="\\n--------------------------------\\n";message+="PSB_START\\n"+JSON.stringify(data)+"\\nPSB_END";message+="\\n--------------------------------\\n";message+="\\n_Harap lampirkan foto/dokumen pendukung secara manual di chat ini._";setTimeout(()=>{window.open('https://wa.me/${adminPhone}?text='+encodeURIComponent(message),'_blank');btn.disabled=false;btn.innerHTML=originalContent;},1000);}</script>`;
        } else if (submissionMethod === 'google_sheet') {
             submitScript = `<script>function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,mime:file.type,data:reader.result,isFile:true});reader.onerror=reject;reader.readAsDataURL(file);});}async function submitForm(){const form=document.getElementById('psbForm');if(!form.checkValidity()){form.reportValidity();return;}const btn=document.getElementById('submit-btn');const originalContent=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Mengirim Data & File...';try{const formData=new FormData(form);const data={};const filePromises=[];for(const [key,value] of formData.entries()){if(value instanceof File){if(value.size>0){if(value.size>5*1024*1024){alert('File '+value.name+' terlalu besar (Max 5MB)');throw new Error('File too large');}filePromises.push(readFile(value).then(fileObj=>{data[key]=fileObj;}));}}else{if(data[key]){data[key]=data[key]+", "+value;}else{data[key]=value;}}}await Promise.all(filePromises);data.tanggalDaftar=new Date().toISOString();data.jenjangId="${localConfig.targetJenjangId||''}";data.sheetName="${targetSheetName}";await fetch("${googleScriptUrl}",{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});alert("Pendaftaran Berhasil! Data dan File telah tersimpan.");form.reset();}catch(error){console.error('Error!',error);if(error.message!=='File too large'){alert("Terjadi kesalahan koneksi.");}}finally{btn.disabled=false;btn.innerHTML=originalContent;}}</script>`;
        } else {
             submitScript = `<script>function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,mime:file.type,data:reader.result,isFile:true});reader.onerror=reject;reader.readAsDataURL(file);});}async function submitForm(){const form=document.getElementById('psbForm');if(!form.checkValidity()){form.reportValidity();return;}const btn=document.getElementById('submit-btn');const originalContent=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Menyimpan ke Cloud...';try{const formData=new FormData(form);const data={};const filePromises=[];for(const [key,value] of formData.entries()){if(value instanceof File){if(value.size>0){if(value.size>5*1024*1024){alert('File '+value.name+' terlalu besar (Max 5MB)');throw new Error('File too large');}filePromises.push(readFile(value).then(fileObj=>{data[key]=fileObj;}));}}else{if(data[key]){data[key]=data[key]+", "+value;}else{data[key]=value;}}}await Promise.all(filePromises);data.tanggalDaftar=new Date().toISOString();data.jenjangId="${localConfig.targetJenjangId||''}";data.sheetName="${targetSheetName}";const textOnlyData={...data};for(let key in textOnlyData){if(typeof textOnlyData[key]==='object'&&textOnlyData[key]!==null&&textOnlyData[key].isFile){delete textOnlyData[key];textOnlyData[key+'_status']="[File di Cloud/HP User]";}}const jsonString=JSON.stringify(textOnlyData);const encodedBackup=btoa(unescape(encodeURIComponent(jsonString)));let cloudSuccess=false;try{await fetch("${googleScriptUrl}",{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});cloudSuccess=true;}catch(err){console.error("Cloud Upload Failed",err);}btn.innerHTML='<i class="fab fa-whatsapp"></i> Membuka WhatsApp...';let message="Assalamu'alaikum Admin,\\nSaya sudah mengisi formulir pendaftaran santri baru.\\n\\n*Data Santri*\\nNama: "+data.namaLengkap+"\\nJenjang: "+"${jenjangName}"+"\\nWali: "+(data.namaWali||data.namaAyah||'-')+"\\nStatus Upload: "+(cloudSuccess?"✅ Sukses ke Server":"⚠️ Gagal/Pending")+"\\n\\n*KODE BACKUP DATA (JANGAN DIHAPUS):*\\nPSB_BACKUP_START\\n"+encodedBackup+"\\nPSB_BACKUP_END\\n\\n_Jika server error, Admin dapat menyalin pesan ini ke menu 'Impor WA'._";setTimeout(()=>{window.open('https://wa.me/${adminPhone}?text='+encodeURIComponent(message),'_blank');if(cloudSuccess){alert("Pendaftaran Berhasil! Data tersimpan di Cloud & WhatsApp Admin akan terbuka.");}else{alert("Koneksi ke Server Cloud bermasalah, tapi Data Aman di WhatsApp. Silakan kirim pesan WA yang terbuka.");}form.reset();btn.disabled=false;btn.innerHTML=originalContent;},1000);}catch(error){console.error('Error!',error);if(error.message!=='File too large'){alert("Terjadi kesalahan. Pastikan file tidak terlalu besar.");}btn.disabled=false;btn.innerHTML=originalContent;}}</script>`;
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
                            btn.innerHTML = "<i class='fas fa-lock'></i> Pendaftaran Ditutup";
                            btn.className = "w-full flex justify-center items-center gap-2 bg-gray-400 text-white font-bold py-3 rounded-lg cursor-not-allowed";
                            btn.onclick = null;
                            
                            // Show Banner
                            const banner = document.createElement('div');
                            banner.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm break-inside-avoid';
                            banner.innerHTML = '<div class="flex items-center gap-2"><i class="fas fa-exclamation-circle text-xl"></i><div><p class="font-bold">Mohon Maaf</p><p class="text-sm">Masa pendaftaran telah berakhir pada tanggal ' + limit.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) + '.</p></div></div>';
                            
                            form.insertBefore(banner, form.firstChild);
                        }
                    }
                }
            })();
        </script>
        `;

        return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Pendaftaran ${settings.namaPonpes}</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"><style>@media print{@page{size:A4;margin:0}body{background:white!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}.printable-content-wrapper{box-shadow:none!important;margin:0!important}}.screen-only{display:block}.print-only{display:none}@media print{.screen-only{display:none}.print-only{display:block}}</style></head><body class="${bodyClass}"><div class="${wrapperClass}">${headerHtml}<form id="psbForm" onsubmit="event.preventDefault();"><div class="mb-6 break-inside-avoid"><label class="block font-bold mb-1 text-gray-700 print:text-black ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">Jenjang Pendidikan</label><div class="font-bold text-lg p-2 bg-gray-50 border-b border-gray-300 print:border-none print:bg-transparent print:p-0 print:text-black ${style === 'classic' ? 'bg-transparent border-b-2 border-gray-300' : ''}">${jenjangName}</div><input type="hidden" name="jenjangId" value="${localConfig.targetJenjangId||''}" /></div>${activeFieldsHtml}${localConfig.requiredDocuments.length>0?`<div class="mt-8 mb-6 p-4 border rounded-lg break-inside-avoid ${style === 'classic' ? 'border-[#1B4D3E]/30 bg-[#f0fdf4]/30' : ''}"><h4 class="font-bold mb-3 ${style === 'classic' ? 'text-[#1B4D3E] font-serif' : ''}">Checklist Persyaratan Berkas (Bawa Fisik)</h4><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${docsHtml}</div></div>`:''}${customFieldsHtml}<div class="mt-8 no-print space-y-3"><button type="button" id="submit-btn" onclick="submitForm()" class="w-full flex justify-center items-center gap-2 ${buttonColor} text-white font-bold py-3 rounded-lg transition shadow-md"><i class="${buttonIcon} text-xl"></i> ${buttonText}</button><p class="text-xs text-center text-gray-500 mt-2">${submissionMethod === 'whatsapp' ? 'Data dikirim ke WA Admin.' : submissionMethod === 'hybrid' ? 'Data tersimpan otomatis ke Cloud & Notifikasi Backup ke WA Admin.' : 'Data tersimpan otomatis ke sistem pondok.'}</p></div></form>${closeDiv}</div>${submitScript}${deadlineCheckScript}</body></html>`;
    };

    const handleDownloadPdf = () => {
        const html = generateHtml();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            // Wait for resources (Tailwind CDN) to load before printing
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

    useEffect(() => {
        const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
        if (iframe) {
            const html = generateHtml();
            iframe.srcdoc = html;
        }
    }, [localConfig, settings, templateName, submissionMethod, googleScriptUrl]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            <div className="lg:col-span-4 bg-white p-6 rounded-lg shadow-md overflow-y-auto h-full space-y-6 text-sm">
                
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
                        </div>
                        {submissionMethod !== 'whatsapp' && (
                            <div className="p-2 bg-gray-50 rounded border text-xs">
                                <label className="font-bold block mb-1">URL Google Script</label>
                                <input type="text" value={googleScriptUrl} onChange={e => setGoogleScriptUrl(e.target.value)} placeholder="https://script.google.com/..." className="w-full border rounded p-1 mb-1" />
                                <button onClick={() => setShowScriptHelper(!showScriptHelper)} className="text-blue-600 underline">Lihat Kode Script</button>
                                {showScriptHelper && <textarea readOnly value={googleAppsScriptCode} className="w-full h-24 mt-1 border text-[10px]" />}
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
                                <div className="space-y-1">
                                    {group.fields.map(f => {
                                        const isActive = localConfig.activeFields.includes(f.key);
                                        const isRequired = (localConfig.requiredStandardFields || []).includes(f.key);
                                        return (
                                            <div key={f.key} className="flex items-center justify-between hover:bg-gray-100 p-1.5 rounded">
                                                <label className="flex items-center gap-2 cursor-pointer flex-grow">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isActive} 
                                                        onChange={() => toggleField(f.key)} 
                                                        className="text-teal-600 rounded w-4 h-4"
                                                    />
                                                    <span className="text-xs text-gray-700">{f.label}</span>
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
            
            <div className="lg:col-span-8 flex flex-col h-full bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
                <div className="bg-white p-3 border-b flex justify-between items-center shadow-sm">
                     <div className="flex flex-col">
                        <h3 className="font-bold text-gray-700"><i className="bi bi-eye mr-2"></i>Live Preview</h3>
                        {templateName && <span className="text-[10px] text-teal-600 font-medium italic">Sheet/Tab Tujuan: {templateName.replace(/[:\/\\?*\[\]]/g, "_")}</span>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadPdf} className="bg-gray-700 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800 flex items-center gap-2"><i className="bi bi-file-pdf"></i> Cetak / PDF</button>
                        <button onClick={() => { const html = generateHtml(); const b = new Blob([html], {type:'text/html'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='Form_PSB.html'; a.click(); }} className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm hover:bg-teal-700"><i className="bi bi-filetype-html"></i> Download File Formulir</button>
                    </div>
                </div>
                <div className="flex-grow bg-gray-500/10 p-4 overflow-hidden">
                    <iframe id="preview-frame" className="w-full h-full bg-white shadow-lg rounded" title="Form Preview" style={{ border: 'none' }}></iframe>
                </div>
            </div>
        </div>
    );
};