

import { Santri, PondokSettings, Pendaftar } from '../types';

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

// --- PSB CSV Functions ---

// Mapping: User Friendly Header -> Internal Key
const PSB_HEADER_MAP: Record<string, keyof Pendaftar> = {
    'Nama Lengkap': 'namaLengkap',
    'NISN': 'nisn',
    'NIK': 'nik',
    'Jenis Kelamin (L/P)': 'jenisKelamin',
    'Tempat Lahir': 'tempatLahir',
    'Tanggal Lahir (DD/MM/YYYY)': 'tanggalLahir',
    'Alamat Lengkap': 'alamat',
    'Nama Wali': 'namaWali',
    'Nomor HP Wali': 'nomorHpWali',
    'ID Jenjang': 'jenjangId',
    'Asal Sekolah': 'asalSekolah',
    'Jalur Pendaftaran': 'jalurPendaftaran',
    'Status': 'status',
    'Tanggal Daftar': 'tanggalDaftar',
    'Catatan': 'catatan'
};

export const generatePsbCsvTemplate = (): string => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = Object.keys(PSB_HEADER_MAP);
    csvContent += headers.join(",") + "\r\n";
    // Add example row
    csvContent += `Budi Santoso,1234567890,3301234567890001,L,Jakarta,01/01/2010,"Jl. Merdeka No. 1",Bapak Budi,081234567890,1,SDN 1 Jakarta,Reguler,Baru,${new Date().toISOString().split('T')[0]},Dokumen lengkap\r\n`;
    return csvContent;
};

export const generatePendaftarCsv = (pendaftarList: Pendaftar[]): string => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = Object.keys(PSB_HEADER_MAP); // Use readable headers
    csvContent += headers.join(",") + "\r\n";

    pendaftarList.forEach(p => {
        const rowData = headers.map(header => {
            const key = PSB_HEADER_MAP[header];
            let value = (p as any)[key];

            // Format specific fields for export
            if (key === 'jenisKelamin') value = value === 'Laki-laki' ? 'L' : 'P';
            if (key === 'tanggalLahir' || key === 'tanggalDaftar') {
                 if (value && !isNaN(new Date(value).getTime())) {
                     // Export as ISO or DD/MM/YYYY? Let's use simple YYYY-MM-DD for consistency or DD/MM/YYYY for user friendly
                     // Using DD/MM/YYYY as per header hint
                     const d = new Date(value);
                     value = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
                 }
            }

            if (value === undefined || value === null) return "";
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

export const parsePendaftarCsv = (csvText: string): Omit<Pendaftar, 'id'>[] => {
    const rows = csvText.split('\n').filter(row => row.trim() !== '');
    if (rows.length < 2) throw new Error("File CSV kosong atau hanya berisi header.");

    const headerRow = rows[0].trim();
    const headers = parseCsvRow(headerRow);
    
    // Create an index map: which internal key corresponds to which column index
    const indexToKeyMap: Record<number, keyof Pendaftar> = {};
    
    headers.forEach((h, index) => {
        const cleanHeader = h.trim();
        // Try to find matching key from PSB_HEADER_MAP
        // We check if the header matches the Key or the Value (Human readable)
        
        let foundKey: keyof Pendaftar | undefined;

        // 1. Check exact match with Human Readable
        if (PSB_HEADER_MAP[cleanHeader]) {
            foundKey = PSB_HEADER_MAP[cleanHeader];
        } 
        // 2. Check strict match with Internal Key (fallback)
        else if (Object.values(PSB_HEADER_MAP).includes(cleanHeader as any)) {
            foundKey = cleanHeader as keyof Pendaftar;
        }
        // 3. Fuzzy search / common variations
        else {
             const lower = cleanHeader.toLowerCase();
             if (lower.includes('nama')) foundKey = 'namaLengkap';
             else if (lower.includes('nisn')) foundKey = 'nisn';
             else if (lower.includes('nik')) foundKey = 'nik';
             else if (lower.includes('kelamin') || lower === 'l/p' || lower === 'sex') foundKey = 'jenisKelamin';
             else if (lower.includes('tempat lahir')) foundKey = 'tempatLahir';
             else if (lower.includes('tanggal lahir') || lower.includes('tgl lahir')) foundKey = 'tanggalLahir';
             else if (lower.includes('alamat')) foundKey = 'alamat';
             else if (lower.includes('wali')) foundKey = 'namaWali';
             else if (lower.includes('hp') || lower.includes('telepon') || lower.includes('wa')) foundKey = 'nomorHpWali';
             else if (lower.includes('jenjang')) foundKey = 'jenjangId';
             else if (lower.includes('sekolah')) foundKey = 'asalSekolah';
             else if (lower.includes('jalur')) foundKey = 'jalurPendaftaran';
             else if (lower.includes('catatan')) foundKey = 'catatan';
        }

        if (foundKey) {
            indexToKeyMap[index] = foundKey;
        }
    });

    if (!Object.values(indexToKeyMap).includes('namaLengkap')) {
         throw new Error("Kolom 'Nama Lengkap' tidak ditemukan di file CSV. Pastikan header sesuai template.");
    }

    const result: Omit<Pendaftar, 'id'>[] = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;
        
        const values = parseCsvRow(row);
        const data: Partial<Pendaftar> = {};
        
        values.forEach((val, index) => {
            const key = indexToKeyMap[index];
            if (key) {
                // Type safety casting for dynamic assignment
                (data as any)[key] = val.trim();
            }
        });

        if (!data.namaLengkap) continue; 

        // Data Cleaning & Normalization
        
        // Gender
        let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
        const rawGender = (data.jenisKelamin || '').toLowerCase();
        if (rawGender.startsWith('p') || rawGender === 'f' || rawGender === 'female') gender = 'Perempuan';
        
        // Dates (Handle DD/MM/YYYY or YYYY-MM-DD)
        const normalizeDate = (dStr?: string) => {
            if (!dStr) return '';
            if (/^\d{4}-\d{2}-\d{2}/.test(dStr)) return dStr; // ISO
            if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(dStr)) {
                const parts = dStr.split(/[\/\-]/);
                // Assume DD/MM/YYYY
                return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            }
            return '';
        };

        const pendaftar: Omit<Pendaftar, 'id'> = {
            namaLengkap: data.namaLengkap,
            nisn: data.nisn || '',
            nik: data.nik || '',
            jenisKelamin: gender,
            tempatLahir: data.tempatLahir || '',
            tanggalLahir: normalizeDate(data.tanggalLahir as string),
            alamat: data.alamat || '',
            namaWali: data.namaWali || '',
            nomorHpWali: data.nomorHpWali || '',
            jenjangId: parseInt(String(data.jenjangId)) || 0,
            asalSekolah: data.asalSekolah || '',
            tanggalDaftar: normalizeDate(data.tanggalDaftar as string) || new Date().toISOString(),
            status: 'Baru', // Default status for imported data
            catatan: data.catatan || '',
            jalurPendaftaran: (data.jalurPendaftaran as any) || 'Reguler',
            gelombang: 1,
            
            // Default filler for required fields not in simple CSV
            kewarganegaraan: 'WNI',
            
            // Optional extended fields if CSV has them (using loose matching)
            desaKelurahan: (data as any)['desaKelurahan'] || '',
            kecamatan: (data as any)['kecamatan'] || '',
            kabupatenKota: (data as any)['kabupatenKota'] || '',
            provinsi: (data as any)['provinsi'] || '',
            kodePos: (data as any)['kodePos'] || '',
            
            // Fix: Added missing required fields for Pendaftar interface
            namaAyah: (data as any)['namaAyah'] || '',
            nikAyah: (data as any)['nikAyah'] || '',
            pekerjaanAyah: (data as any)['pekerjaanAyah'] || '',
            teleponAyah: (data as any)['teleponAyah'] || '',

            namaIbu: (data as any)['namaIbu'] || '',
            nikIbu: (data as any)['nikIbu'] || '',
            pekerjaanIbu: (data as any)['pekerjaanIbu'] || '',
            teleponIbu: (data as any)['teleponIbu'] || '',
        };
        
        result.push(pendaftar);
    }
    
    return result;
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