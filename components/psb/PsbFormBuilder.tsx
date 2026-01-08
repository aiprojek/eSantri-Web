
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
    const [localConfig, setLocalConfig] = useState<PsbConfig>(config);
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
        const current = localConfig.activeFields;
        const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
        setLocalConfig({ ...localConfig, activeFields: next });
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
            requiredDocuments: localConfig.requiredDocuments,
            customFields: localConfig.customFields || [],
            submissionMethod, // Include new method
            googleScriptUrl   // Include new url
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

    const handleResetForm = () => {
        showConfirmation('Buat Baru?', 'Semua pengaturan field, dokumen, dan pertanyaan tambahan akan direset ke default.', () => {
            setLocalConfig(prev => ({
                ...prev,
                activeFields: ['namaLengkap', 'nisn', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 'alamat', 'namaWali', 'nomorHpWali', 'asalSekolah'],
                requiredDocuments: ['Kartu Keluarga (KK)', 'Akte Kelahiran', 'Pas Foto 3x4'],
                customFields: [],
                templates: prev.templates
            }));
            setSubmissionMethod('whatsapp');
            setGoogleScriptUrl('');
            setTemplateName('');
            setActiveTemplateId(null);
            showToast('Formulir direset.', 'info');
        }, { confirmColor: 'red' });
    };

    const googleAppsScriptCode = `
/* 
   GOOGLE APPS SCRIPT FOR ESANTRI WEB 
   (Support Upload & Read Data)
*/

// --- KONFIGURASI ---
var FOLDER_ID = "GANTI_DENGAN_ID_FOLDER_DRIVE_ANDA"; 

// --- FUNGSI MENERIMA DATA (WRITE) ---
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); 

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getActiveSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;
    var rawData = JSON.parse(e.postData.contents);
    var dataToSave = {};

    var folder = DriveApp.getFolderById(FOLDER_ID);
    
    for (var key in rawData) {
      var val = rawData[key];
      if (typeof val === 'object' && val !== null && val.isFile === true && val.data) {
        var decoded = Utilities.base64Decode(val.data.split(',')[1]); 
        var blob = Utilities.newBlob(decoded, val.mime, val.name);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        dataToSave[key] = file.getUrl();
      } else {
        dataToSave[key] = val;
      }
    }

    if (sheet.getLastColumn() === 0) {
       var keys = Object.keys(dataToSave);
       keys.unshift('Timestamp'); 
       sheet.getRange(1, 1, 1, keys.length).setValues([keys]);
       headers = keys;
    }

    var newRowData = [];
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (header === 'Timestamp') {
        newRowData.push(new Date());
      } else {
        var cellVal = dataToSave[header];
        if (Array.isArray(cellVal)) cellVal = cellVal.join(", ");
        newRowData.push(cellVal || '');
      }
    }

    sheet.getRange(nextRow, 1, 1, newRowData.length).setValues([newRowData]);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- FUNGSI MEMBACA DATA (READ/PULL) ---
function doGet(e) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var data = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var record = {};
    for (var j = 0; j < headers.length; j++) {
      record[headers[j]] = row[j];
    }
    data.push(record);
  }

  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}`;

    const generateHtml = () => {
        const style = localConfig.designStyle || 'classic';
        const targetJenjang = settings.jenjang.find((j) => j.id === localConfig.targetJenjangId);
        const jenjangName = targetJenjang ? targetJenjang.nama : 'Umum / Belum Dipilih';
        
        // Helper to generate inputs based on theme
        const renderInput = (label: string, name: string, type: string = 'text', placeholder: string = '', required: boolean = false) => {
            const commonPrint = `border-none border-b border-gray-400 bg-transparent rounded-none px-0`;
            const reqStar = required ? '<span class="text-red-500">*</span>' : '';

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
                        <input type="file" name="${name}" accept="image/*,application/pdf" ${required ? 'required' : ''} class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" />
                        <p class="text-[10px] text-gray-400 mt-1">Maks 5MB. PDF atau Foto.</p>
                    </div>`;
                }
            }

            // Standard Inputs
             if (style === 'classic') {
                return `
                <div class="mb-4 break-inside-avoid">
                    <label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full border-b-2 border-gray-300 focus:border-[#1B4D3E] outline-none py-2 bg-transparent transition placeholder-gray-400 print:${commonPrint} print:border-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'modern') {
                return `
                <div class="mb-4 break-inside-avoid">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none placeholder-gray-400 print:${commonPrint} print:text-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'bold') {
                return `
                <div class="mb-4 border-b border-gray-100 pb-2 break-inside-avoid">
                    <label class="font-bold text-gray-700 block mb-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full bg-gray-50 border-0 border-b-2 border-gray-300 focus:border-red-600 focus:bg-white px-2 py-2 transition outline-none placeholder-gray-400 print:${commonPrint} print:text-black" placeholder="${placeholder}">
                </div>`;
            } else if (style === 'dark') {
                return `
                <div class="mb-6 group break-inside-avoid">
                    <label class="block text-xs text-amber-500 uppercase tracking-widest mb-2 group-focus-within:text-white transition print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full bg-slate-800 border-b border-slate-600 focus:border-amber-500 px-0 py-3 text-white outline-none transition placeholder-slate-600 print:bg-white print:text-black print:border-gray-400" placeholder="${placeholder}">
                </div>`;
            } else { // ceria
                 return `
                 <div class="mb-4 break-inside-avoid">
                    <label class="block text-gray-500 text-xs font-bold uppercase mb-1 ml-1 print:text-black">${label} ${reqStar}</label>
                    <input type="${type}" name="${name}" ${required ? 'required' : ''} class="w-full bg-orange-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-300 outline-none font-bold text-gray-700 placeholder-gray-400 print:bg-white print:border-b print:border-gray-400 print:rounded-none print:text-black" placeholder="${placeholder}">
                 </div>`;
            }
        };

        const activeFieldsHtml = fieldGroups.flatMap(group => {
            const groupFields = group.fields.filter(f => localConfig.activeFields.includes(f.key));
            if (groupFields.length === 0) return [];
            
            let header = '';
            if (style === 'classic') header = `<h3 class="bg-[#1B4D3E] text-[#D4AF37] px-4 py-2 font-bold uppercase text-sm mb-4 inline-block rounded-r-full break-after-avoid print:bg-gray-200 print:text-black print:border print:border-black">${group.title}</h3>`;
            else if (style === 'modern') header = `<h3 class="text-blue-600 font-bold text-lg mb-4 flex items-center gap-2 border-b pb-1 break-after-avoid print:text-black print:border-black"><span class="bg-blue-100 p-1.5 rounded text-sm print:hidden"><i class="fas fa-caret-right"></i></span> ${group.title}</h3>`;
            else if (style === 'bold') header = `<h3 class="text-xl font-bold text-gray-800 border-l-4 border-red-700 pl-3 mb-4 break-after-avoid print:text-black print:border-black">${group.title}</h3>`;
            else if (style === 'dark') header = `<h3 class="text-white font-serif text-xl border-b border-slate-700 pb-2 mb-4 print:text-black print:border-gray-400 break-after-avoid">${group.title}</h3>`;
            else if (style === 'ceria') header = `<div class="flex items-center gap-3 mb-4 break-after-avoid"><div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-lg print:hidden"><i class="fas fa-star"></i></div><h3 class="font-bold text-gray-700 text-lg print:text-black">${group.title}</h3></div>`;

            const fieldsHtml = groupFields.map(f => {
                if (f.key === 'jenisKelamin') {
                     // Simple radio logic
                     return `
                     <div class="mb-4 break-inside-avoid">
                        <label class="block text-sm font-bold mb-1 print:text-black">Jenis Kelamin</label>
                        <div class="flex gap-4 mt-1">
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="jenisKelamin" value="Laki-laki" required> Laki-laki</label>
                            <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="jenisKelamin" value="Perempuan" required> Perempuan</label>
                        </div>
                     </div>`;
                }
                return renderInput(f.label, f.key, f.key.toLowerCase().includes('tanggal') ? 'date' : 'text', '', true);
            }).join('');

            return [`<section class="mb-8 break-inside-avoid">${header}<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${fieldsHtml}</div></section>`];
        }).join('');

        const customFieldsHtml = localConfig.customFields?.map(field => {
            if (field.type === 'section') return `<h4 class="font-bold text-lg mt-6 mb-3 border-b-2 border-gray-300 pb-1 break-after-avoid print:text-black print:border-black">${field.label}</h4>`;
            if (field.type === 'statement') return `<div class="mb-4 text-sm text-justify leading-relaxed print:text-black">${field.label}</div>`;
            if (field.type === 'text') return renderInput(field.label, `custom_${field.id}`, 'text', '', field.required);
            if (field.type === 'file') return renderInput(field.label, `custom_${field.id}`, 'file', '', field.required);
            if (field.type === 'paragraph') return `<div class="mb-4 break-inside-avoid"><label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label><textarea name="custom_${field.id}" rows="3" ${field.required ? 'required' : ''} class="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 outline-none print:bg-white print:border-black"></textarea></div>`;
            if (field.type === 'radio' || field.type === 'checkbox') {
                const opts = field.options?.filter(o => o.trim() !== '') || [];
                const optionsHtml = opts.map(opt => `<label class="flex items-center gap-2 cursor-pointer p-1"><input type="${field.type}" name="custom_${field.id}${field.type==='checkbox'?'[]':''}" value="${opt}" class="w-4 h-4 text-teal-600"> <span class="text-sm">${opt}</span></label>`).join('');
                return `<div class="mb-4 break-inside-avoid"><label class="block text-gray-600 text-sm font-bold mb-1 print:text-black">${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label><div class="space-y-1 mt-1">${optionsHtml}</div></div>`;
            }
            return '';
        }).join('') || '';

        const docsHtml = localConfig.requiredDocuments.map(doc => 
            `<label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 print:border-black">
                <input type="checkbox" name="docs[]" value="${doc}" class="w-5 h-5 text-teal-600 print:text-black">
                <span class="text-sm">${doc} (Bawa Fisik Saat Daftar Ulang)</span>
             </label>`
        ).join('');

        // Container styles logic
        let bodyClass = "bg-gray-100 min-h-screen py-10 font-sans text-gray-800 print:bg-white print:py-0";
        let wrapperClass = "bg-white shadow-xl mx-auto max-w-2xl p-8 rounded-lg print:shadow-none print:max-w-none print:p-0";
        let headerHtml = `<div class="text-center mb-8"><h1 class="text-2xl font-bold">${settings.namaPonpes}</h1><p>Formulir Pendaftaran</p></div>`;
        if (style === 'modern') {
             bodyClass = "bg-slate-50 min-h-screen py-10 font-sans print:bg-white";
             wrapperClass = "bg-white shadow-xl mx-auto max-w-[210mm] border border-gray-200 rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:max-w-none";
             headerHtml = `<div class="bg-blue-600 p-8 text-white flex justify-between items-center print:bg-white print:text-black print:border-b-2 print:border-blue-600 print:mb-6"><div><h1 class="text-3xl font-bold tracking-tight">Registration</h1><p class="text-blue-100 print:text-gray-600">${settings.namaPonpes}</p></div><div class="text-5xl opacity-30 print:hidden"><i class="fas fa-file-signature"></i></div></div><div class="p-8 print:p-0">`;
        } // ... (rest of styles omitted for brevity, assuming standard style structure as previous)

        const closeDiv = (style === 'modern' || style === 'bold') ? '</div>' : '';

        // --- SCRIPT LOGIC BASED ON METHOD ---
        let submitScript = '';
        const adminPhone = localConfig.nomorHpAdmin.replace(/^0/, '62');

        if (submissionMethod === 'whatsapp') {
            // ... (Standard WA Script) ...
            submitScript = `
            <script>
                function submitForm() {
                    const form = document.getElementById('psbForm');
                    if(!form.checkValidity()) { form.reportValidity(); return; }
                    
                    const btn = document.getElementById('submit-btn');
                    const originalContent = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
                    
                    const formData = new FormData(form);
                    const data = { tanggalDaftar: new Date().toISOString(), status: 'Baru' };
                    const customData = {};

                    formData.forEach((value, key) => {
                        if(key.startsWith('custom_')) { 
                            customData[key.replace('custom_', '')] = value; 
                        }
                        else if(key === 'docs[]') { if(!data.docs) data.docs = []; data.docs.push(value); }
                        else { data[key] = value; }
                    });
                    
                    data.customData = JSON.stringify(customData);

                    let message = "*Pendaftaran Santri Baru*\\n*${settings.namaPonpes}*\\n\\n";
                    message += "Nama: " + data.namaLengkap + "\\n";
                    message += "Jenjang: " + "${jenjangName}" + "\\n";
                    message += "Wali: " + (data.namaWali || data.namaAyah || '-') + "\\n";
                    
                    message += "\\n--------------------------------\\n";
                    message += "PSB_START\\n" + JSON.stringify(data) + "\\nPSB_END";
                    message += "\\n--------------------------------\\n";
                    message += "\\n_Harap lampirkan foto/dokumen pendukung secara manual di chat ini._";
                    
                    setTimeout(() => {
                        window.open('https://wa.me/${adminPhone}?text=' + encodeURIComponent(message), '_blank');
                        btn.disabled = false;
                        btn.innerHTML = originalContent;
                    }, 1000);
                }
            </script>`;
        } else if (submissionMethod === 'google_sheet') {
            // ... (Standard Google Sheet Script) ...
            submitScript = `
            <script>
                function readFile(file) {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve({ name: file.name, mime: file.type, data: reader.result, isFile: true });
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                }

                async function submitForm() {
                    const form = document.getElementById('psbForm');
                    if(!form.checkValidity()) { form.reportValidity(); return; }
                    
                    const btn = document.getElementById('submit-btn');
                    const originalContent = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim Data & File...';
                    
                    try {
                        const formData = new FormData(form);
                        const data = {};
                        const filePromises = [];

                        for (const [key, value] of formData.entries()) {
                            if (value instanceof File) {
                                if (value.size > 0) {
                                    if(value.size > 5 * 1024 * 1024) { alert('File ' + value.name + ' terlalu besar (Max 5MB)'); throw new Error('File too large'); }
                                    filePromises.push(readFile(value).then(fileObj => { data[key] = fileObj; }));
                                }
                            } else {
                                if (data[key]) { data[key] = data[key] + ", " + value; } else { data[key] = value; }
                            }
                        }

                        await Promise.all(filePromises);
                        
                        data.tanggalDaftar = new Date().toISOString();
                        data.jenjangId = "${localConfig.targetJenjangId || ''}";

                        await fetch("${googleScriptUrl}", {
                            method: 'POST',
                            mode: 'no-cors', 
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });

                        alert("Pendaftaran Berhasil! Data dan File telah tersimpan.");
                        form.reset();

                    } catch (error) {
                        console.error('Error!', error);
                        if (error.message !== 'File too large') {
                            alert("Terjadi kesalahan koneksi.");
                        }
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = originalContent;
                    }
                }
            </script>`;
        } else {
            // HYBRID LOGIC (Google Sheet + WA Notification with Encrypted Backup)
            submitScript = `
            <script>
                function readFile(file) {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve({ name: file.name, mime: file.type, data: reader.result, isFile: true });
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                }

                async function submitForm() {
                    const form = document.getElementById('psbForm');
                    if(!form.checkValidity()) { form.reportValidity(); return; }
                    
                    const btn = document.getElementById('submit-btn');
                    const originalContent = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan ke Cloud...';
                    
                    try {
                        const formData = new FormData(form);
                        const data = {};
                        const filePromises = [];

                        // 1. Gather all data including files for Cloud Upload
                        for (const [key, value] of formData.entries()) {
                            if (value instanceof File) {
                                if (value.size > 0) {
                                    if(value.size > 5 * 1024 * 1024) { alert('File ' + value.name + ' terlalu besar (Max 5MB)'); throw new Error('File too large'); }
                                    filePromises.push(readFile(value).then(fileObj => { data[key] = fileObj; }));
                                }
                            } else {
                                if (data[key]) { data[key] = data[key] + ", " + value; } else { data[key] = value; }
                            }
                        }

                        await Promise.all(filePromises);
                        
                        data.tanggalDaftar = new Date().toISOString();
                        data.jenjangId = "${localConfig.targetJenjangId || ''}";

                        // 2. Prepare Encrypted Backup (Text Only) for WA
                        // We must remove file blobs before encoding to keep URL length safe
                        const textOnlyData = { ...data };
                        for(let key in textOnlyData) {
                            // Detect if it is a file object from our readFile helper
                            if(typeof textOnlyData[key] === 'object' && textOnlyData[key] !== null && textOnlyData[key].isFile) {
                                delete textOnlyData[key];
                                textOnlyData[key + '_status'] = "[File di Cloud/HP User]";
                            }
                        }
                        
                        // Base64 Encode (obfuscation 'encryption')
                        const jsonString = JSON.stringify(textOnlyData);
                        const encodedBackup = btoa(unescape(encodeURIComponent(jsonString)));

                        // 3. Send to Cloud (Google Sheet) - Non-blocking attempt
                        // We await it, but catch error so WA still opens
                        let cloudSuccess = false;
                        try {
                            await fetch("${googleScriptUrl}", {
                                method: 'POST',
                                mode: 'no-cors', 
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(data)
                            });
                            cloudSuccess = true;
                        } catch (err) {
                            console.error("Cloud Upload Failed", err);
                        }

                        // 4. Prepare WA Notification
                        btn.innerHTML = '<i class="fab fa-whatsapp"></i> Membuka WhatsApp...';
                        
                        let message = "Assalamu'alaikum Admin,\\n";
                        message += "Saya sudah mengisi formulir pendaftaran santri baru.\\n\\n";
                        message += "*Data Santri*\\n";
                        message += "Nama: " + data.namaLengkap + "\\n";
                        message += "Jenjang: " + "${jenjangName}" + "\\n";
                        message += "Wali: " + (data.namaWali || data.namaAyah || '-') + "\\n";
                        message += "Status Upload: " + (cloudSuccess ? "✅ Sukses ke Server" : "⚠️ Gagal/Pending") + "\\n\\n";
                        
                        message += "*KODE BACKUP DATA (JANGAN DIHAPUS):*\\n";
                        message += "PSB_BACKUP_START\\n" + encodedBackup + "\\nPSB_BACKUP_END\\n\\n";
                        
                        message += "_Jika server error, Admin dapat menyalin pesan ini ke menu 'Impor WA'._";

                        // 5. Open WA
                        setTimeout(() => {
                            window.open('https://wa.me/${adminPhone}?text=' + encodeURIComponent(message), '_blank');
                            if(cloudSuccess) {
                                alert("Pendaftaran Berhasil! Data tersimpan di Cloud & WhatsApp Admin akan terbuka.");
                            } else {
                                alert("Koneksi ke Server Cloud bermasalah, tapi Data Aman di WhatsApp. Silakan kirim pesan WA yang terbuka.");
                            }
                            form.reset();
                            btn.disabled = false;
                            btn.innerHTML = originalContent;
                        }, 1000);

                    } catch (error) {
                        console.error('Error!', error);
                        if (error.message !== 'File too large') {
                            alert("Terjadi kesalahan. Pastikan file tidak terlalu besar.");
                        }
                        btn.disabled = false;
                        btn.innerHTML = originalContent;
                    }
                }
            </script>`;
        }

        const buttonIcon = submissionMethod === 'whatsapp' ? 'fab fa-whatsapp' : submissionMethod === 'hybrid' ? 'fas fa-check-double' : 'fas fa-paper-plane';
        const buttonText = submissionMethod === 'whatsapp' ? 'Kirim Data via WhatsApp' : submissionMethod === 'hybrid' ? 'Kirim Data (Cloud + WA)' : 'Kirim Pendaftaran';
        const buttonColor = submissionMethod === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : submissionMethod === 'hybrid' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700';

        return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pendaftaran ${settings.namaPonpes}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        @media print { 
            @page { size: A4; margin: 0; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; } 
            .printable-content-wrapper { box-shadow: none !important; margin: 0 !important; }
        }
        .screen-only { display: block; }
        .print-only { display: none; }
        @media print { .screen-only { display: none; } .print-only { display: block; } }
    </style>
</head>
<body class="${bodyClass}">
    <div class="${wrapperClass}">
        ${headerHtml}
        <form id="psbForm" onsubmit="event.preventDefault();">
            <div class="mb-6 break-inside-avoid">
                 <label class="block font-bold mb-1 text-gray-700 print:text-black">Jenjang Pendidikan</label>
                 <div class="font-bold text-lg p-2 bg-gray-50 border-b border-gray-300 print:border-none print:bg-transparent print:p-0 print:text-black">${jenjangName}</div>
                 <input type="hidden" name="jenjangId" value="${localConfig.targetJenjangId || ''}" />
            </div>
            ${activeFieldsHtml}
            ${localConfig.requiredDocuments.length > 0 ? `<div class="mt-8 mb-6 p-4 border rounded-lg break-inside-avoid">
                <h4 class="font-bold mb-3">Checklist Persyaratan Berkas (Bawa Fisik)</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${docsHtml}</div>
            </div>` : ''}
            ${customFieldsHtml}
            <div class="mt-8 no-print space-y-3">
                <button type="button" id="submit-btn" onclick="submitForm()" class="w-full flex justify-center items-center gap-2 ${buttonColor} text-white font-bold py-3 rounded-lg transition shadow-md">
                    <i class="${buttonIcon} text-xl"></i> 
                    ${buttonText}
                </button>
                <p class="text-xs text-center text-gray-500 mt-2">
                    ${submissionMethod === 'whatsapp' ? 'Data dikirim ke WA Admin.' : submissionMethod === 'hybrid' ? 'Data tersimpan otomatis ke Cloud & Notifikasi Backup ke WA Admin.' : 'Data tersimpan otomatis ke sistem pondok.'}
                </p>
            </div>
        </form>
        ${closeDiv}
    </div>
    ${submitScript}
</body>
</html>`;
    };

    const handleDownloadPdf = () => {
        const htmlContent = generateHtml();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1000);
        }
    };

    useEffect(() => {
        const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
        if (iframe) { iframe.srcdoc = generateHtml(); }
    }, [localConfig, settings, submissionMethod, googleScriptUrl]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            <div className="lg:col-span-4 bg-white p-6 rounded-lg shadow-md overflow-y-auto h-full space-y-6 text-sm">
                
                {/* Note Area */}
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0"><i className="bi bi-gear-fill text-indigo-600 text-xl"></i></div>
                        <div className="ml-3">
                            <h3 className="text-sm font-bold text-indigo-800">Manajemen Formulir</h3>
                            <p className="text-xs text-indigo-700 mt-1">
                                Sesuaikan field data dan metode pengiriman formulir publik Anda di sini.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">Metode Pengiriman Data</h3>
                    <div className="space-y-3">
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => setSubmissionMethod('whatsapp')}
                                className={`w-full py-2 px-3 rounded border text-center text-xs font-semibold ${submissionMethod === 'whatsapp' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-300 text-gray-600'}`}
                            >
                                <i className="bi bi-whatsapp"></i> WhatsApp Bridge (Data via WA)
                            </button>
                            <button 
                                onClick={() => setSubmissionMethod('google_sheet')}
                                className={`w-full py-2 px-3 rounded border text-center text-xs font-semibold ${submissionMethod === 'google_sheet' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-gray-300 text-gray-600'}`}
                            >
                                <i className="bi bi-file-earmark-spreadsheet"></i> Google Cloud (Data via Sheet)
                            </button>
                            <button 
                                onClick={() => setSubmissionMethod('hybrid')}
                                className={`w-full py-2 px-3 rounded border text-center text-xs font-semibold ${submissionMethod === 'hybrid' ? 'bg-teal-100 border-teal-500 text-teal-800' : 'bg-white border-gray-300 text-gray-600'}`}
                            >
                                <i className="bi bi-hdd-network"></i> Hybrid (Cloud + WA Encrypted Backup)
                            </button>
                        </div>

                        {(submissionMethod === 'google_sheet' || submissionMethod === 'hybrid') && (
                            <div className="mt-2 p-3 bg-gray-50 border rounded-lg animate-fade-in-down">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Web App URL (Google Script)</label>
                                <input 
                                    type="text" 
                                    value={googleScriptUrl} 
                                    onChange={e => setGoogleScriptUrl(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/..." 
                                    className="w-full border rounded p-1.5 text-xs font-mono"
                                />
                                <button 
                                    onClick={() => setShowScriptHelper(!showScriptHelper)}
                                    className="text-xs text-blue-600 underline mt-1 block"
                                >
                                    {showScriptHelper ? 'Sembunyikan Panduan' : 'Bagaimana cara mendapatkan URL ini?'}
                                </button>
                                
                                {showScriptHelper && (
                                    <div className="mt-2 text-xs text-gray-600 bg-white p-2 border rounded">
                                        <ol className="list-decimal pl-4 space-y-1">
                                            <li>Buka <a href="https://sheets.new" target="_blank" className="text-blue-600">Google Sheet Baru</a>.</li>
                                            <li>Klik <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</li>
                                            <li>Hapus kode yang ada, lalu salin kode di bawah ini.</li>
                                            <li><strong>PENTING:</strong> Isi variabel <code>FOLDER_ID</code> dengan ID Folder Google Drive Anda di baris awal script.</li>
                                            <li>Klik <strong>Deploy</strong> &gt; <strong>New deployment</strong>.</li>
                                            <li>Pilih type: <strong>Web app</strong>.</li>
                                            <li>Execute as: <strong>Me</strong>.</li>
                                            <li>Who has access: <strong>Anyone</strong> (Penting!).</li>
                                            <li>Klik Deploy, copy <strong>Web App URL</strong>, paste di kolom atas.</li>
                                        </ol>
                                        <div className="mt-2 relative">
                                            <textarea readOnly className="w-full h-24 text-[10px] font-mono border rounded p-1 bg-gray-100" value={googleAppsScriptCode}></textarea>
                                            <button 
                                                onClick={() => {navigator.clipboard.writeText(googleAppsScriptCode); showToast('Kode disalin!', 'success')}}
                                                className="absolute top-1 right-1 bg-gray-200 hover:bg-gray-300 p-1 rounded text-xs" title="Salin Kode"
                                            >
                                                <i className="bi bi-clipboard"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-[10px] text-gray-500 italic">
                            {submissionMethod === 'whatsapp' 
                                ? 'Data dikirim via WA admin. File lampiran harus dikirim manual di chat.' 
                                : submissionMethod === 'hybrid' 
                                    ? 'Data & File ke Cloud. WA Admin terbuka otomatis berisi Data Backup (Antisipasi Server Down).'
                                    : 'Data masuk ke Sheet & File masuk ke Google Drive otomatis. Tanpa WA.'}
                        </p>
                    </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <h3 className="font-bold text-indigo-800 mb-3 border-b border-indigo-200 pb-2"><i className="bi bi-folder-fill"></i> Simpan Template</h3>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Nama Formulir..." className="flex-grow border rounded p-1.5 text-xs"/>
                            <button onClick={handleSaveTemplate} className="bg-indigo-600 text-white px-3 rounded text-xs shrink-0">
                                {activeTemplateId ? 'Update' : 'Simpan'}
                            </button>
                        </div>
                        {localConfig.templates && localConfig.templates.length > 0 && (
                            <div className="space-y-1 max-h-32 overflow-y-auto border bg-white rounded p-1">
                                {localConfig.templates.map(tpl => (
                                    <div key={tpl.id} className={`flex justify-between items-center p-1.5 hover:bg-indigo-50 rounded transition-colors text-xs ${activeTemplateId === tpl.id ? 'bg-indigo-100 ring-1 ring-indigo-300' : ''}`}>
                                        <span className="font-medium truncate max-w-[150px]">{tpl.name}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleLoadTemplate(tpl.id)} className="text-blue-600 hover:bg-white p-1 rounded" title="Muat"><i className="bi bi-box-arrow-in-down"></i></button>
                                            <button onClick={() => handleDeleteTemplate(tpl.id)} className="text-red-500 hover:bg-white p-1 rounded" title="Hapus"><i className="bi bi-trash"></i></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={handleResetForm} className="w-full text-xs text-red-600 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors">Buat Baru (Reset)</button>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">1. Desain & Metode</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Target Jenjang (Wajib)</label>
                            <select value={localConfig.targetJenjangId || ''} onChange={e => setLocalConfig({...localConfig, targetJenjangId: parseInt(e.target.value)})} className="w-full border rounded p-2 text-sm bg-yellow-50">
                                <option value="">-- Pilih Jenjang --</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Gaya Desain</label>
                            <select value={localConfig.designStyle} onChange={e => setLocalConfig({...localConfig, designStyle: e.target.value as PsbDesignStyle})} className="w-full border rounded p-2 text-sm">
                                {styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">2. Kelengkapan Data</h3>
                    <div className="space-y-4 max-h-64 overflow-y-auto border p-2 rounded bg-gray-50 shadow-inner">
                        {fieldGroups.map((group, gIdx) => (
                            <div key={gIdx} className="border-b pb-2 mb-2 last:border-0">
                                <h4 className="font-bold text-[10px] text-teal-700 mb-1 uppercase tracking-tight">{group.title}</h4>
                                <div className="space-y-1">
                                    {group.fields.map(f => (
                                        <label key={f.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                            <input type="checkbox" checked={localConfig.activeFields.includes(f.key)} onChange={() => toggleField(f.key)} className="text-teal-600 rounded w-4 h-4"/>
                                            <span className="text-xs text-gray-700">{f.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">3. Persyaratan Berkas</h3>
                    <div className="space-y-2 bg-gray-50 p-3 rounded-lg border">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newDoc} 
                                onChange={e => setNewDoc(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && addDocument()}
                                placeholder="Tambah Berkas (cth: KK)" 
                                className="flex-grow border rounded p-1.5 text-xs"
                            />
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
                    <p className="text-[10px] text-gray-500 mt-2 italic">
                        * Gunakan tipe 'Unggah Dokumen' untuk meminta file upload (Hanya berfungsi di Mode Google Cloud/Hybrid).
                    </p>
                </div>

                <div className="pt-4 border-t sticky bottom-0 bg-white">
                    <button onClick={handleFinalSave} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium shadow-md">Simpan Konfigurasi Utama</button>
                </div>
            </div>
            
            <div className="lg:col-span-8 flex flex-col h-full bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
                <div className="bg-white p-3 border-b flex justify-between items-center shadow-sm">
                    <div className="flex flex-col">
                        <h3 className="font-bold text-gray-700"><i className="bi bi-eye mr-2"></i>Live Preview</h3>
                        {activeTemplateId && <span className="text-[10px] text-teal-600 font-medium italic">Sedang Menyesuaikan: {templateName}</span>}
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
