
import { Santri, PondokSettings } from '../types';

// This is an internal helper and doesn't need to be exported.
const parseCsvRow = (row: string): string[] => {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"' && (i === 0 || row[i - 1] !== '"')) {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentField.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
            currentField = '';
        } else if (char === '"' && row[i + 1] === '"') {
             currentField += '"';
             i++;
        }
         else {
            currentField += char;
        }
    }
    result.push(currentField.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
};


const CSV_HEADERS_UPDATE = [
    'id', 'nis', 'nik', 'nisn', 'namaLengkap', 'namaHijrah', 'kewarganegaraan',
    'berkebutuhanKhusus', 'jenisSantri', 'statusKeluarga', 'tempatLahir', 'tanggalLahir', 'jenisKelamin',
    'anakKe', 'alamat_detail', 'alamat_desa', 'alamat_kecamatan', 'alamat_kabupaten', 'alamat_provinsi', 'alamat_kodepos',
    'tinggiBadan', 'beratBadan', 'jarakKePondok',
    'jumlahSaudara', 'riwayatPenyakit', 'prestasi_json', 'pelanggaran_json', 'riwayatStatus_json', 'hobi_json', 'tanggalMasuk', 'sekolahAsal',
    'alamatSekolahAsal', 'namaAyah', 'nikAyah', 'tempatLahirAyah', 'tanggalLahirAyah',
    'pekerjaanAyah', 'pendidikanAyah', 'penghasilanAyah', 'alamatAyah_detail', 'agamaAyah',
    'statusAyah', 'teleponAyah', 'namaIbu', 'nikIbu', 'tempatLahirIbu', 'tanggalLahirIbu',
    'pekerjaanIbu', 'pendidikanIbu', 'penghasilanIbu', 'alamatIbu_detail', 'agamaIbu', 'statusIbu',
    'teleponIbu', 'namaWali', 'tempatLahirWali', 'tanggalLahirWali', 'pekerjaanWali',
    'pendidikanWali', 'penghasilanWali', 'agamaWali', 'statusWali', 'statusHidupWali', 'alamatWali_detail',
    'teleponWali', 'jenjangId', 'kelasId', 'rombelId', 'status', 'tanggalStatus', 'fotoUrl'
];

const CSV_HEADERS_ADD = CSV_HEADERS_UPDATE.filter(h => h !== 'id');


export const generateSantriCsvForUpdate = (santriList: Santri[]): string => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = CSV_HEADERS_UPDATE;
    csvContent += headers.join(",") + "\r\n";

    santriList.forEach(santri => {
        const rowData = headers.map(header => {
            let value;
            if (header.startsWith('alamat_')) {
              const key = header.replace('alamat_', '');
              value = (santri.alamat as any)[key === 'detail' ? 'detail' : key.replace(/_([a-z])/g, g => g[1].toUpperCase())];
            } else {
              value = (santri as any)[header];
            }
            
            if (value === undefined || value === null) return "";
            if (header === 'prestasi_json') value = JSON.stringify(santri.prestasi || []);
            if (header === 'pelanggaran_json') value = JSON.stringify(santri.pelanggaran || []);
            if (header === 'hobi_json') value = JSON.stringify(santri.hobi || []);
            if (header === 'riwayatStatus_json') value = JSON.stringify(santri.riwayatStatus || []);

            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csvContent += rowData.join(",") + "\r\n";
    });

    return csvContent;
};


export const generateSantriCsvTemplate = (): string => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += CSV_HEADERS_ADD.join(",") + "\r\n";
    return csvContent;
};

// New function to generate Contact CSV (Google Contact Format compatible)
export const generateContactCsv = (santriList: Santri[], settings: PondokSettings): string => {
    let csvContent = "data:text/csv;charset=utf-8,";
    // Standard Google CSV Headers subset that is widely compatible
    const headers = ['Name', 'Given Name', 'Phone 1 - Type', 'Phone 1 - Value', 'Organization 1 - Name', 'Organization 1 - Title', 'Notes'];
    csvContent += headers.join(",") + "\r\n";

    santriList.forEach(santri => {
        // Determine Priority Phone Number & Name
        let phone: string | undefined = santri.teleponWali;
        let parentName: string | undefined = santri.namaWali;
        let relation = "Wali";

        if (!phone) {
            phone = santri.teleponAyah;
            parentName = santri.namaAyah;
            relation = "Ayah";
        }
        if (!phone) {
            phone = santri.teleponIbu;
            parentName = santri.namaIbu;
            relation = "Ibu";
        }

        // Clean up phone number
        phone = phone ? phone.replace(/[^0-9+]/g, '') : '';

        // If no phone number, skip or include? Let's include with empty phone for now, but usually contacts need a value.
        // If phone is empty, this entry is less useful as a contact, but might still be wanted.
        
        // Format Name: "Nama Wali (Wali Nama Santri)" to make it searchable
        const displayName = parentName 
            ? `${parentName} (${relation} ${santri.namaLengkap})`
            : `${relation} ${santri.namaLengkap}`; // Fallback if parent name missing

        const rombelName = settings.rombel.find(r => r.id === santri.rombelId)?.nama || '';
        
        const rowData = [
            displayName, // Name (Full)
            parentName || relation, // Given Name
            'Mobile', // Phone Type
            phone, // Phone Value
            settings.namaPonpes, // Organization
            'Wali Santri', // Title
            `NIS: ${santri.nis} | Kelas: ${rombelName}` // Notes
        ];

        const processedRow = rowData.map(val => {
            if (val === undefined || val === null) return "";
            const stringValue = String(val);
            if (stringValue.includes(',') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });

        csvContent += processedRow.join(",") + "\r\n";
    });

    return csvContent;
};


type ImportMode = 'update' | 'add';
export interface ParsedCsvResult {
  mode: ImportMode;
  toAdd: Omit<Santri, 'id'>[];
  toUpdate: Santri[];
  errors: string[];
}

export const parseSantriCsv = (
    csvText: string,
    mode: ImportMode,
    allSantriList: Santri[]
): ParsedCsvResult => {
    const rows = csvText.split('\n').filter(row => row.trim() !== '');
    if (rows.length < 2) throw new Error("File CSV kosong atau hanya berisi header.");

    const headerRow = rows[0].trim();
    const headers = parseCsvRow(headerRow);
    
    const result: ParsedCsvResult = { mode, toAdd: [], toUpdate: [], errors: [] };

    if (mode === 'update' && headers[0] !== 'id') {
         throw new Error("Mode 'Perbarui' memerlukan kolom 'id' sebagai kolom pertama.");
    }
    
    const allSantriMap = new Map(allSantriList.map(s => [s.id, s]));

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;
        
        const values = parseCsvRow(row);
        const santriData: { [key: string]: any } = {};
        headers.forEach((header, index) => {
            santriData[header] = values[index] || '';
        });

        const processRow = () => {
            const processedData: { [key: string]: any } = { alamat: {}, alamatAyah: {}, alamatIbu: {}, alamatWali: {} };
            for (const header of headers) {
              if (header === 'id' && mode === 'add') continue;
              let value = santriData[header];
              if (value === undefined || value === '') continue;
        
              if (header.startsWith('alamat_') || header.startsWith('alamatAyah_') || header.startsWith('alamatIbu_') || header.startsWith('alamatWali_')) {
                const parts = header.split('_');
                const targetAlamat = parts[0];
                let fieldKey = parts[1];

                if (fieldKey === 'desa') fieldKey = 'desaKelurahan';
                if (fieldKey === 'kabupaten') fieldKey = 'kabupatenKota';
                if (fieldKey === 'kodepos') fieldKey = 'kodePos';

                processedData[targetAlamat][fieldKey] = value;
                continue;
              }

              if (['anakKe', 'tinggiBadan', 'beratBadan', 'jumlahSaudara', 'jenjangId', 'kelasId', 'rombelId'].includes(header)) {
                value = value ? parseInt(value, 10) : undefined; if (isNaN(value as number)) value = undefined;
              }
              if (header === 'prestasi_json') {
                 try { processedData['prestasi'] = JSON.parse(value || '[]'); } catch { processedData['prestasi'] = []; } continue;
              }
              if (header === 'pelanggaran_json') {
                 try { processedData['pelanggaran'] = JSON.parse(value || '[]'); } catch { processedData['pelanggaran'] = []; } continue;
              }
              if (header === 'hobi_json') {
                 try { processedData['hobi'] = JSON.parse(value || '[]'); } catch { processedData['hobi'] = []; } continue;
              }
               if (header === 'riwayatStatus_json') {
                 try { processedData['riwayatStatus'] = JSON.parse(value || '[]'); } catch { processedData['riwayatStatus'] = []; } continue;
              }
              if (header.toLowerCase().includes('tanggal')) {
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) { // Check for DD/MM/YYYY
                    const [d, m, y] = value.split('/');
                    value = `${y}-${m}-${d}`;
                  } else if (value === '' || isNaN(new Date(value).getTime())) {
                    value = undefined;
                  }
              }
              processedData[header] = value;
            }
            return processedData;
        };

        if (mode === 'update') {
            const id = parseInt(santriData.id, 10);
            if (isNaN(id)) {
                result.errors.push(`Baris ${i + 1}: ID tidak valid.`); continue;
            }
            const existingSantri = allSantriMap.get(id);
            if (!existingSantri) {
                result.errors.push(`Baris ${i + 1}: Santri dengan ID ${id} tidak ditemukan.`); continue;
            }
            result.toUpdate.push({ ...existingSantri, ...processRow() });
        } else { // mode 'add'
            if (!santriData.namaLengkap) {
                result.errors.push(`Baris ${i + 1}: 'namaLengkap' wajib diisi.`); continue;
            }
            const processedData = processRow();
            const newSantri = {
                namaLengkap: '', nis: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: 'Laki-laki' as const, alamat: {detail: ''}, namaAyah: '', namaIbu: '', teleponWali: '', tanggalMasuk: new Date().toISOString().slice(0,7)+'-01', jenjangId: 0, kelasId: 0, rombelId: 0, status: 'Aktif' as const,
                ...processedData
            } as Omit<Santri, 'id'>;
            result.toAdd.push(newSantri);
        }
    }
    return result;
};
