
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../AppContext';
import { useSantriContext } from '../../contexts/SantriContext';
import { generateRaporFormHtml } from '../../services/academicService';

const GOOGLE_SCRIPT_TEMPLATE = `
/* GOOGLE APPS SCRIPT FOR RAPOR (eSantri Web) */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var combinedData = [];
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var rows = sheet.getDataRange().getValues();
    if (rows.length < 2 || rows[0].indexOf("DataJSON") === -1) continue;
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
    var meta = data.meta;
    var records = data.records;
    var sheetName = (meta.rombelName + " - " + meta.templateName).substring(0, 99).replace(/[:\/\\?*\[\]]/g, "");
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["Timestamp", "RombelID", "TemplateID", "TahunAjaran", "Semester", "SantriID", "NamaSantri", "DataJSON"]);
      sheet.setFrozenRows(1);
    }
    var rowsToAdd = [];
    var timestamp = new Date();
    records.forEach(function(rec) {
      rowsToAdd.push([timestamp, meta.rombelId, meta.templateId, meta.tahunAjaran, meta.semester, rec.santriId, rec.santriName || "", JSON.stringify(rec.data)]);
    });
    if(rowsToAdd.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, 8).setValues(rowsToAdd);
    return ContentService.createTextOutput(JSON.stringify({result: "success", sheet: sheetName})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}`;

export const TabGeneratorFormulir: React.FC = () => {
    const { settings, showToast, showAlert } = useAppContext();
    const { santriList } = useSantriContext();
    const templates = settings.raporTemplates || [];

    const [genTemplateId, setGenTemplateId] = useState('');
    const [genJenjangId, setGenJenjangId] = useState(0);
    const [genKelasId, setGenKelasId] = useState(0);
    const [genRombelId, setGenRombelId] = useState(0);
    const [genSemester, setGenSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
    const [genTahunAjaran, setGenTahunAjaran] = useState('2024/2025');
    
    const [submissionMethod, setSubmissionMethod] = useState<'whatsapp' | 'google_sheet' | 'hybrid'>('whatsapp');
    const [googleScriptUrl, setGoogleScriptUrl] = useState('');
    const [waDestination, setWaDestination] = useState('');
    const [showScriptHelper, setShowScriptHelper] = useState(false);

    const availableKelas = useMemo(() => genJenjangId ? settings.kelas.filter(k => k.jenjangId === genJenjangId) : [], [genJenjangId, settings.kelas]);
    const availableRombel = useMemo(() => genKelasId ? settings.rombel.filter(r => r.kelasId === genKelasId) : [], [genKelasId, settings.rombel]);

    const handleGenerate = () => {
        if (!genTemplateId || !genRombelId) {
            showToast('Pilih template dan rombel terlebih dahulu', 'error');
            return;
        }
        const tpl = templates.find(t => t.id === genTemplateId);
        if (!tpl) return;

        try {
            const html = generateRaporFormHtml(santriList, settings, {
                rombelId: genRombelId,
                semester: genSemester,
                tahunAjaran: genTahunAjaran,
                template: tpl,
                submissionMethod,
                googleScriptUrl,
                waDestination 
            });
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Form_Nilai_${settings.rombel.find(r=>r.id===genRombelId)?.nama}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Formulir berhasil diunduh.', 'success');
        } catch (e) {
            showAlert('Gagal Generate', (e as Error).message);
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
            {/* LEFT COLUMN: Source Configuration */}
            <div className="space-y-6">
                <div className="bg-teal-50 border border-teal-100 p-5 rounded-lg flex gap-4 items-start shadow-sm">
                    <div className="bg-teal-100 p-2 rounded-lg text-teal-700 shrink-0">
                        <i className="bi bi-1-circle-fill text-xl"></i>
                    </div>
                    <div className="flex-grow">
                        <h4 className="font-bold text-teal-800 text-base mb-1">Pilih Template Rapor</h4>
                        <p className="text-xs text-teal-600 mb-3">Pilih desain grid yang sudah Anda buat di tab Desain.</p>
                        <select value={genTemplateId} onChange={e => setGenTemplateId(e.target.value)} className="w-full border border-teal-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-teal-500">
                            <option value="">-- Pilih Template --</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
                        <i className="bi bi-2-circle-fill text-blue-600"></i> Target Kelas & Periode
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Jenjang</label>
                            <select value={genJenjangId} onChange={e => {setGenJenjangId(Number(e.target.value)); setGenKelasId(0); setGenRombelId(0)}} className="w-full border rounded-lg p-2 text-sm bg-gray-50 focus:bg-white transition-colors">
                                <option value={0}>Pilih...</option>
                                {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Kelas</label>
                            <select value={genKelasId} onChange={e => {setGenKelasId(Number(e.target.value)); setGenRombelId(0)}} disabled={!genJenjangId} className="w-full border rounded-lg p-2 text-sm disabled:bg-gray-100 bg-gray-50 focus:bg-white transition-colors">
                                <option value={0}>Pilih...</option>
                                {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Rombel</label>
                            <select value={genRombelId} onChange={e => setGenRombelId(Number(e.target.value))} disabled={!genKelasId} className="w-full border rounded-lg p-2 text-sm disabled:bg-gray-100 bg-gray-50 focus:bg-white transition-colors">
                                <option value={0}>Pilih...</option>
                                {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Tahun Ajaran</label>
                            <input type="text" value={genTahunAjaran} onChange={e => setGenTahunAjaran(e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Semester</label>
                            <select value={genSemester} onChange={e => setGenSemester(e.target.value as any)} className="w-full border rounded-lg p-2 text-sm">
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Method & Action */}
            <div className="space-y-6">
                <div className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm h-fit">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
                        <i className="bi bi-3-circle-fill text-green-600"></i> Metode Pengiriman
                    </h4>
                    
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-2">
                            <button onClick={() => setSubmissionMethod('whatsapp')} className={`flex-1 py-2.5 px-3 rounded-lg border text-center text-xs font-semibold flex items-center justify-center gap-2 transition-all ${submissionMethod === 'whatsapp' ? 'bg-green-50 border-green-500 text-green-800 ring-1 ring-green-500' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}><i className="bi bi-whatsapp text-lg"></i> WhatsApp</button>
                            <button onClick={() => setSubmissionMethod('google_sheet')} className={`flex-1 py-2.5 px-3 rounded-lg border text-center text-xs font-semibold flex items-center justify-center gap-2 transition-all ${submissionMethod === 'google_sheet' ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}><i className="bi bi-file-earmark-spreadsheet text-lg"></i> G-Sheet</button>
                            <button onClick={() => setSubmissionMethod('hybrid')} className={`flex-1 py-2.5 px-3 rounded-lg border text-center text-xs font-semibold flex items-center justify-center gap-2 transition-all ${submissionMethod === 'hybrid' ? 'bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}><i className="bi bi-hdd-network text-lg"></i> Hybrid</button>
                        </div>
                        <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded border">
                            <i className="bi bi-info-circle mr-1"></i>
                            {submissionMethod === 'whatsapp' && "Guru mengirim data nilai langsung ke WhatsApp Admin (Text Base). Paling simpel."}
                            {submissionMethod === 'google_sheet' && "Guru mengirim data nilai langsung ke Google Spreadsheet Anda via Web App."}
                            {submissionMethod === 'hybrid' && "Data dikirim ke Spreadsheet, DAN WhatsApp Admin akan terbuka berisi kode backup data (Paling Aman)."}
                        </p>

                        {(submissionMethod === 'whatsapp' || submissionMethod === 'hybrid') && (
                            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                                <label className="block text-xs font-bold text-green-800 mb-1">Nomor WA Admin / Wali Kelas</label>
                                <input type="text" value={waDestination} onChange={e => setWaDestination(e.target.value)} placeholder="628xxxxxxxxxx (kosongkan untuk buka kontak)" className="w-full border border-green-300 rounded p-2 text-xs font-mono focus:ring-green-500 focus:border-green-500"/>
                                <p className="text-[10px] text-green-600 mt-1">Data nilai akan dikirim ke nomor ini.</p>
                            </div>
                        )}

                        {(submissionMethod === 'google_sheet' || submissionMethod === 'hybrid') && (
                            <div className="p-3 bg-gray-50 border rounded-lg">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Web App URL (Google Apps Script)</label>
                                <input type="text" value={googleScriptUrl} onChange={e => setGoogleScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." className="w-full border rounded p-2 text-xs font-mono mb-2"/>
                                <button onClick={() => setShowScriptHelper(!showScriptHelper)} className="text-xs text-blue-600 underline block hover:text-blue-800">{showScriptHelper ? 'Sembunyikan Panduan Script' : 'Lihat Kode Google Apps Script'}</button>
                                {showScriptHelper && (
                                    <div className="mt-2 text-xs text-gray-600 bg-white p-2 border rounded shadow-sm">
                                        <p className="mb-1 font-semibold">Instruksi:</p>
                                        <ol className="list-decimal pl-4 mb-2 space-y-0.5">
                                            <li>Buat Spreadsheet Baru di Google Drive.</li>
                                            <li>Extensions &gt; Apps Script. Paste kode di bawah.</li>
                                            <li>Deploy &gt; New Deployment &gt; Web App.</li>
                                            <li>Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong>.</li>
                                        </ol>
                                        <div className="relative">
                                            <textarea readOnly className="w-full h-24 text-[10px] font-mono border rounded p-1 bg-gray-100" value={GOOGLE_SCRIPT_TEMPLATE}></textarea>
                                            <button onClick={() => {navigator.clipboard.writeText(GOOGLE_SCRIPT_TEMPLATE); showToast('Kode disalin!', 'success')}} className="absolute top-1 right-1 bg-white border shadow-sm p-1 rounded text-xs hover:bg-gray-50" title="Salin Kode"><i className="bi bi-clipboard"></i></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <button onClick={handleGenerate} disabled={!genTemplateId || !genRombelId} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                        <i className="bi bi-cloud-download-fill text-xl"></i> 
                        <span>Download Formulir HTML</span>
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-3">
                        File HTML ini ringan (Offline-First). Kirimkan ke Guru via WhatsApp agar mereka bisa mengisi nilai tanpa perlu login aplikasi.
                    </p>
                </div>
            </div>
        </div>
    );
};
