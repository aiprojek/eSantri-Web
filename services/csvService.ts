


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


const SANTRI_CSV_HEADERS_UPDATE = [
    'id',
    'namaLengkap',
    'namaHijrah',
    'nis',
    'nik',
    'nisn',
    'jenisKelamin',
    'tempatLahir',
    'tanggalLahir',
    'kewarganegaraan',
    'statusKeluarga',
    'jenisSantri',
    'berkebutuhanKhusus',
    'jenjangId',
    'kelasId',
    'rombelId',
    'tanggalMasuk',
    'status',
    'alamat_detail',
    'alamat_desa',
    'alamat_kecamatan',
    'alamat_kabupaten',
    'alamat_provinsi',
    'alamat_kodepos',
    'namaAyah',
    'statusAyah',
    'tempatLahirAyah',
    'tanggalLahirAyah',
    'nikAyah',
    'pendidikanAyah',
    'pekerjaanAyah',
    'penghasilanAyah',
    'teleponAyah',
    'namaIbu',
    'statusIbu',
    'tempatLahirIbu',
    'tanggalLahirIbu',
    'nikIbu',
    'pendidikanIbu',
    'pekerjaanIbu',
    'penghasilanIbu',
    'teleponIbu',
    'namaWali',
    'statusWali',
    'statusHidupWali',
    'pendidikanWali',
    'pekerjaanWali',
    'penghasilanWali',
    'teleponWali'
] as const;

const SANTRI_CSV_HEADERS_ADD = SANTRI_CSV_HEADERS_UPDATE.filter(h => h !== 'id');
type SantriCsvHeader = typeof SANTRI_CSV_HEADERS_UPDATE[number];

const normalizeSantriCsvHeader = (header: string): string =>
    header.toLowerCase().replace(/[\s\-./()]/g, '').replace(/_/g, '');

const SANTRI_CSV_HEADER_ALIASES: Record<string, SantriCsvHeader> = {
    id: 'id',
    namalengkap: 'namaLengkap',
    namahijrah: 'namaHijrah',
    nis: 'nis',
    nik: 'nik',
    nisn: 'nisn',
    jeniskelamin: 'jenisKelamin',
    gender: 'jenisKelamin',
    sex: 'jenisKelamin',
    tempelahir: 'tempatLahir',
    tempatlahir: 'tempatLahir',
    tanggallahir: 'tanggalLahir',
    tgllahir: 'tanggalLahir',
    kewarganegaraan: 'kewarganegaraan',
    statuskeluarga: 'statusKeluarga',
    jenissantri: 'jenisSantri',
    berkebutuhankhusus: 'berkebutuhanKhusus',
    jenjangid: 'jenjangId',
    kelasid: 'kelasId',
    rombelid: 'rombelId',
    tanggalmasuk: 'tanggalMasuk',
    status: 'status',
    alamatdetail: 'alamat_detail',
    alamatdesa: 'alamat_desa',
    alamatdesakelurahan: 'alamat_desa',
    alamatkecamatan: 'alamat_kecamatan',
    alamatkabupaten: 'alamat_kabupaten',
    alamatkabupatenkota: 'alamat_kabupaten',
    alamatprovinsi: 'alamat_provinsi',
    alamatkodepos: 'alamat_kodepos',
    namaayah: 'namaAyah',
    statusayah: 'statusAyah',
    tempatlahirayah: 'tempatLahirAyah',
    tanggallahirayah: 'tanggalLahirAyah',
    nikayah: 'nikAyah',
    pendidikanayah: 'pendidikanAyah',
    pekerjaanayah: 'pekerjaanAyah',
    penghasilanayah: 'penghasilanAyah',
    teleponayah: 'teleponAyah',
    hpayah: 'teleponAyah',
    namaibu: 'namaIbu',
    statusibu: 'statusIbu',
    tempatlahiribu: 'tempatLahirIbu',
    tanggallahiribu: 'tanggalLahirIbu',
    nikibu: 'nikIbu',
    pendidikanibu: 'pendidikanIbu',
    pekerjaanibu: 'pekerjaanIbu',
    penghasilanibu: 'penghasilanIbu',
    teleponibu: 'teleponIbu',
    hpibu: 'teleponIbu',
    namawali: 'namaWali',
    statuswali: 'statusWali',
    statushidupwali: 'statusHidupWali',
    pendidikanwali: 'pendidikanWali',
    pekerjaanwali: 'pekerjaanWali',
    penghasilanwali: 'penghasilanWali',
    teleponwali: 'teleponWali',
    hpwali: 'teleponWali',
    // Backward compatibility for legacy headers
    alamatayahdetail: 'alamat_detail',
    alamatibudetail: 'alamat_detail',
    alamatwalidetail: 'alamat_detail',
};

const normalizeSantriDate = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    const raw = String(value).trim();
    if (!raw) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [d, m, y] = raw.split('/');
        return `${y}-${m}-${d}`;
    }
    if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(raw)) {
        const [d, m, y] = raw.split(/[/-]/);
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return undefined;
};

export const generateSantriCsvForUpdate = (santriList: Santri[]): string => {
    let csvContent = "";
    const headers = SANTRI_CSV_HEADERS_UPDATE;
    csvContent += headers.join(",") + "\r\n";

    santriList.forEach(santri => {
        const rowData = headers.map(header => {
            let value: unknown;
            switch (header) {
                case 'alamat_detail':
                    value = santri.alamat?.detail;
                    break;
                case 'alamat_desa':
                    value = santri.alamat?.desaKelurahan;
                    break;
                case 'alamat_kecamatan':
                    value = santri.alamat?.kecamatan;
                    break;
                case 'alamat_kabupaten':
                    value = santri.alamat?.kabupatenKota;
                    break;
                case 'alamat_provinsi':
                    value = santri.alamat?.provinsi;
                    break;
                case 'alamat_kodepos':
                    value = santri.alamat?.kodePos;
                    break;
                default:
                    value = (santri as any)[header];
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


export const generateSantriCsvTemplate = (): string => {
    let csvContent = "";
    csvContent += SANTRI_CSV_HEADERS_ADD.join(",") + "\r\n";
    return csvContent;
};

// New function to generate Contact CSV (Google Contact Format compatible)
export const generateContactCsv = (santriList: Santri[], settings: PondokSettings): string => {
    let csvContent = "";
    // Standard Google CSV Headers (Full list for better compatibility)
    const headers = [
        'Name', 'Given Name', 'Additional Name', 'Family Name', 'Yomi Name', 'Given Name Yomi', 'Additional Name Yomi', 'Family Name Yomi', 'Name Prefix', 'Name Suffix', 'Initials', 'Nickname', 'Short Name', 'Maiden Name', 'Birthday', 'Gender', 'Location', 'Billing Information', 'Directory Server', 'Mileage', 'Occupation', 'Hobby', 'Sensitivity', 'Priority', 'Subject', 'Notes', 'Language', 'Photo', 'Group Membership',
        'Phone 1 - Type', 'Phone 1 - Value',
        'Organization 1 - Type', 'Organization 1 - Name', 'Organization 1 - Yomi Name', 'Organization 1 - Title', 'Organization 1 - Department', 'Organization 1 - Symbol', 'Organization 1 - Location', 'Organization 1 - Job Description'
    ];
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
        
        // Format Name: "Nama Wali (Wali Nama Santri)" to make it searchable
        const displayName = parentName 
            ? `${parentName} (${relation} ${santri.namaLengkap})`
            : `${relation} ${santri.namaLengkap}`; // Fallback if parent name missing

        const rombelName = settings.rombel.find(r => r.id === santri.rombelId)?.nama || '';
        
        // Map to Google Headers
        const rowData = new Array(headers.length).fill('');
        rowData[0] = displayName; // Name
        rowData[1] = parentName || relation; // Given Name
        rowData[25] = `NIS: ${santri.nis} | Kelas: ${rombelName} | Santri: ${santri.namaLengkap}`; // Notes
        rowData[28] = 'Imported eSantri'; // Group Membership
        rowData[29] = 'Mobile'; // Phone 1 - Type
        rowData[30] = phone; // Phone 1 - Value
        rowData[31] = 'Work'; // Organization 1 - Type
        rowData[32] = settings.namaPonpes; // Organization 1 - Name
        rowData[34] = 'Wali Santri'; // Organization 1 - Title

        const processedRow = rowData.map(val => {
            if (val === undefined || val === null) return "";
            const stringValue = String(val);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
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
    let csvContent = "";
    const headers = Object.keys(PSB_HEADER_MAP);
    csvContent += headers.join(",") + "\r\n";
    // Add example row
    csvContent += `Budi Santoso,1234567890,3301234567890001,L,Jakarta,01/01/2010,"Jl. Merdeka No. 1",Bapak Budi,081234567890,1,SDN 1 Jakarta,Reguler,Baru,${new Date().toISOString().split('T')[0]},Dokumen lengkap\r\n`;
    return csvContent;
};

export const generatePendaftarCsv = (pendaftarList: Pendaftar[]): string => {
    let csvContent = "";
    const headers = Object.keys(PSB_HEADER_MAP); // Use readable headers
    csvContent += headers.join(",") + "\r\n";

    pendaftarList.forEach(p => {
        const rowData = headers.map(header => {
            const key = PSB_HEADER_MAP[header];
            let value = (p as any)[key];
            
            // Special handling for nested Alamat object in Pendaftar
            if (key === 'alamat' && typeof value === 'object') {
                value = value.detail;
            }

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
            nis: '',
            jenisSantri: 'Mondok - Baru',
            kelasId: 0,
            rombelId: 0,
            jenisKelamin: gender,
            tempatLahir: data.tempatLahir || '',
            tanggalLahir: normalizeDate(data.tanggalLahir as string),
            // Construct nested Alamat object
            alamat: {
                detail: (typeof data.alamat === 'string' ? data.alamat : '') || '',
                desaKelurahan: (data as any)['desaKelurahan'] || '',
                kecamatan: (data as any)['kecamatan'] || '',
                kabupatenKota: (data as any)['kabupatenKota'] || '',
                provinsi: (data as any)['provinsi'] || '',
                kodePos: (data as any)['kodePos'] || '',
            },
            namaWali: data.namaWali || '',
            nomorHpWali: data.nomorHpWali || '',
            jenjangId: parseInt(String(data.jenjangId)) || 0,
            asalSekolah: data.asalSekolah || '',
            tanggalDaftar: normalizeDate(data.tanggalDaftar as string) || new Date().toISOString(),
            // Ensure tanggalMasuk is set (Required by Santri type inheritance)
            tanggalMasuk: normalizeDate(data.tanggalDaftar as string) || new Date().toISOString(),
            status: 'Baru', // Default status for imported data
            catatan: data.catatan || '',
            jalurPendaftaran: (data.jalurPendaftaran as any) || 'Reguler',
            gelombang: 1,
            
            // Default filler for required fields not in simple CSV
            kewarganegaraan: 'WNI',
            
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
    const mappedHeaders = headers.map((header) => SANTRI_CSV_HEADER_ALIASES[normalizeSantriCsvHeader(header)]);
    
    const result: ParsedCsvResult = { mode, toAdd: [], toUpdate: [], errors: [] };

    if (mode === 'update' && !mappedHeaders.includes('id')) {
         throw new Error("Mode 'Perbarui' memerlukan kolom 'id'.");
    }
    
    const allSantriMap = new Map(allSantriList.map(s => [s.id, s]));

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;
        
        const values = parseCsvRow(row);
        const santriData: { [key: string]: any } = {};
        mappedHeaders.forEach((mappedHeader, index) => {
            if (!mappedHeader) return;
            santriData[mappedHeader] = values[index] || '';
        });

        const processRow = () => {
            const processedData: { [key: string]: any } = { alamat: {}, alamatAyah: {}, alamatIbu: {}, alamatWali: {} };
            for (const header of mappedHeaders) {
              if (!header) continue;
              if (header === 'id' && mode === 'add') continue;
              let value = santriData[header];
              if (value === undefined || value === '') continue;
        
              if (header.startsWith('alamat_')) {
                if (header === 'alamat_detail') processedData.alamat.detail = value;
                if (header === 'alamat_desa') processedData.alamat.desaKelurahan = value;
                if (header === 'alamat_kecamatan') processedData.alamat.kecamatan = value;
                if (header === 'alamat_kabupaten') processedData.alamat.kabupatenKota = value;
                if (header === 'alamat_provinsi') processedData.alamat.provinsi = value;
                if (header === 'alamat_kodepos') processedData.alamat.kodePos = value;
                continue;
              }

              if (['anakKe', 'tinggiBadan', 'beratBadan', 'jumlahSaudara', 'jenjangId', 'kelasId', 'rombelId'].includes(header)) {
                value = value ? parseInt(value, 10) : undefined; if (isNaN(value as number)) value = undefined;
              }
              if (header.toLowerCase().includes('tanggal')) {
                  value = normalizeSantriDate(value);
                  if (!value) continue;
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
