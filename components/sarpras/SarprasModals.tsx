import React, { useState, useEffect } from 'react';
import { Inventaris, SarprasMaintenanceLog, SarprasBorrowLog } from '../../types';
import { formatRupiah, formatDate } from '../../utils/formatters';

let sarprasIdSeq = Math.floor(Math.random() * 500);
const sarprasDeviceSalt = Math.floor(Math.random() * 500);

export const generateSarprasId = (): number => {
    sarprasIdSeq = (sarprasIdSeq + 1) % 500;
    return Date.now() * 1000 + sarprasDeviceSalt + sarprasIdSeq;
};

export const SARPRAS_POS_KAS_OPTIONS = [
    'Kas Tunai Bendahara',
    'Bank Syariah Indonesia (BSI)',
    'Bank Muamalat',
    'Bank BRI / Mandiri',
    'Kas Kecil Operasional'
];

// --- 1. MODAL PEMELIHARAAN / SERVIS ASET ---
interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Inventaris | null;
    onSaveMaintenance: (
        asset: Inventaris,
        log: SarprasMaintenanceLog,
        catatKeBukuKas: boolean,
        posKas: string
    ) => Promise<void>;
    currentUserName: string;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
    isOpen,
    onClose,
    asset,
    onSaveMaintenance,
    currentUserName
}) => {
    const [tanggal, setTanggal] = useState(() => new Date().toISOString().split('T')[0]);
    const [jenisTindakan, setJenisTindakan] = useState<SarprasMaintenanceLog['jenisTindakan']>('Perbaikan');
    const [deskripsi, setDeskripsi] = useState('');
    const [teknisiVendor, setTeknisiVendor] = useState('');
    const [biaya, setBiaya] = useState<number>(0);
    const [kondisiSetelah, setKondisiSetelah] = useState<Inventaris['kondisi']>('Baik');
    const [catatKeBukuKas, setCatatKeBukuKas] = useState<boolean>(true);
    const [posKas, setPosKas] = useState<string>('Kas Kecil Operasional');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && asset) {
            setTanggal(new Date().toISOString().split('T')[0]);
            setJenisTindakan('Perbaikan');
            setDeskripsi('');
            setTeknisiVendor('');
            setBiaya(0);
            setKondisiSetelah('Baik');
            setCatatKeBukuKas(true);
        }
    }, [isOpen, asset]);

    if (!isOpen || !asset) return null;

    const history = asset.riwayatServis || [];
    const totalBiayaServis = history.reduce((sum, h) => sum + (Number(h.biaya) || 0), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deskripsi.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newLog: SarprasMaintenanceLog = {
                id: `SRV-${generateSarprasId()}`,
                tanggal,
                jenisTindakan,
                deskripsi: deskripsi.trim(),
                teknisiVendor: teknisiVendor.trim() || '-',
                biaya: Number(biaya) || 0,
                kondisiSetelah,
                catatKeBukuKas: Number(biaya) > 0 && catatKeBukuKas,
                operator: currentUserName
            };
            await onSaveMaintenance(asset, newLog, Number(biaya) > 0 && catatKeBukuKas, posKas);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <i className="bi bi-tools"></i>
                            Pemeliharaan &amp; Servis Aset
                        </h3>
                        <p className="text-xs text-amber-100">
                            {asset.kode} — {asset.nama} ({asset.lokasi || 'Tanpa Lokasi'})
                        </p>
                    </div>
                    <button onClick={onClose} className="text-amber-100 hover:text-white p-1">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Form Input Servis Baru */}
                    <form onSubmit={handleSubmit} className="space-y-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                        <h4 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                            <i className="bi bi-plus-circle-fill text-amber-600"></i>
                            Catat Tindakan Pemeliharaan / Perbaikan Baru
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Tanggal Servis</label>
                                <input
                                    type="date"
                                    value={tanggal}
                                    onChange={e => setTanggal(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Jenis Tindakan</label>
                                <select
                                    value={jenisTindakan}
                                    onChange={e => setJenisTindakan(e.target.value as SarprasMaintenanceLog['jenisTindakan'])}
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                >
                                    <option value="Perbaikan">Perbaikan Kerusakan</option>
                                    <option value="Perawatan Rutin">Perawatan / Servis Rutin</option>
                                    <option value="Kalibrasi / Cek Fisik">Kalibrasi / Cek Fisik</option>
                                    <option value="Renovasi">Renovasi / Peremajaan</option>
                                </select>
                            </div>
                        </div>

                        <div className="text-xs">
                            <label className="block font-bold text-gray-700 mb-1">Uraian Kerusakan / Tindakan Perbaikan *</label>
                            <input
                                type="text"
                                value={deskripsi}
                                onChange={e => setDeskripsi(e.target.value)}
                                required
                                placeholder="Contoh: Ganti freon AC, servis pompa air terbakar, pengecatan ulang..."
                                className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Teknisi / Bengkel / Vendor</label>
                                <input
                                    type="text"
                                    value={teknisiVendor}
                                    onChange={e => setTeknisiVendor(e.target.value)}
                                    placeholder="Nama teknisi/toko"
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Biaya Servis (Rp)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={biaya}
                                    onChange={e => setBiaya(Number(e.target.value))}
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white font-semibold"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Kondisi Aset Setelah Servis</label>
                                <select
                                    value={kondisiSetelah}
                                    onChange={e => setKondisiSetelah(e.target.value as Inventaris['kondisi'])}
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white font-bold"
                                >
                                    <option value="Baik">Baik (Normal Kembali)</option>
                                    <option value="Rusak Ringan">Rusak Ringan</option>
                                    <option value="Rusak Berat">Rusak Berat</option>
                                    <option value="Afkir">Afkir (Tidak Dapat Dipakai)</option>
                                </select>
                            </div>
                        </div>

                        {Number(biaya) > 0 && (
                            <div className="p-3 bg-white rounded-xl border border-amber-300 space-y-2 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950">
                                    <input
                                        type="checkbox"
                                        checked={catatKeBukuKas}
                                        onChange={e => setCatatKeBukuKas(e.target.checked)}
                                        className="rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    Otomatis catat biaya servis ({formatRupiah(Number(biaya))}) sebagai Pengeluaran di Buku Kas Pondok
                                </label>
                                {catatKeBukuKas && (
                                    <div className="flex items-center gap-2 pl-6">
                                        <span className="text-gray-600 font-medium">Ambil dari Pos Kas:</span>
                                        <select
                                            value={posKas}
                                            onChange={e => setPosKas(e.target.value)}
                                            className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-semibold"
                                        >
                                            {SARPRAS_POS_KAS_OPTIONS.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                            >
                                <i className="bi bi-check-circle-fill"></i>
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Catatan Servis'}
                            </button>
                        </div>
                    </form>

                    {/* Riwayat Servis Sebelumnya */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs uppercase text-gray-500">
                                Riwayat Pemeliharaan Aset ({history.length} Catatan)
                            </h4>
                            <span className="text-xs font-bold text-amber-800">
                                Total Biaya Perawatan: {formatRupiah(totalBiayaServis)}
                            </span>
                        </div>
                        {history.length > 0 ? (
                            <div className="divide-y border rounded-xl overflow-hidden bg-white text-xs">
                                {history.slice().reverse().map(log => (
                                    <div key={log.id} className="p-3 flex items-start justify-between gap-3 hover:bg-gray-50">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">{log.jenisTindakan}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                                                    {formatDate(log.tanggal)}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-700 font-bold">
                                                    &rarr; {log.kondisiSetelah}
                                                </span>
                                            </div>
                                            <p className="text-gray-700">{log.deskripsi}</p>
                                            <p className="text-[10px] text-gray-400">
                                                Teknisi/Vendor: {log.teknisiVendor || '-'} • Dicatat oleh: {log.operator || '-'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-bold text-gray-900">{formatRupiah(log.biaya)}</div>
                                            {log.catatKeBukuKas && (
                                                <span className="text-[10px] text-teal-600 font-semibold">Tercatat di Buku Kas</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-xs text-gray-400 border rounded-xl bg-gray-50">
                                Belum ada riwayat servis/perbaikan untuk aset ini.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 2. MODAL PEMINJAMAN & PENGEMBALIAN ASET ---
interface BorrowModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Inventaris | null;
    onBorrowAsset: (asset: Inventaris, log: SarprasBorrowLog) => Promise<void>;
    onReturnAsset: (asset: Inventaris, logId: string, kondisiKembali: Inventaris['kondisi'], catatan: string) => Promise<void>;
    currentUserName: string;
    teacherNames: string[];
}

export const BorrowModal: React.FC<BorrowModalProps> = ({
    isOpen,
    onClose,
    asset,
    onBorrowAsset,
    onReturnAsset,
    currentUserName,
    teacherNames
}) => {
    const [peminjam, setPeminjam] = useState('');
    const [tipePeminjam, setTipePeminjam] = useState<SarprasBorrowLog['tipePeminjam']>('Guru/Staf');
    const [kontakPeminjam, setKontakPeminjam] = useState('');
    const [jumlahPinjam, setJumlahPinjam] = useState(1);
    const [keperluan, setKeperluan] = useState('');
    const [tanggalPinjam, setTanggalPinjam] = useState(() => new Date().toISOString().split('T')[0]);
    const [estimasiKembali, setEstimasiKembali] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split('T')[0];
    });
    const [kondisiKembali, setKondisiKembali] = useState<Inventaris['kondisi']>('Baik');
    const [catatanKembali, setCatatanKembali] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && asset) {
            setPeminjam('');
            setTipePeminjam('Guru/Staf');
            setKontakPeminjam('');
            setJumlahPinjam(1);
            setKeperluan('');
            setTanggalPinjam(new Date().toISOString().split('T')[0]);
            const d = new Date();
            d.setDate(d.getDate() + 3);
            setEstimasiKembali(d.toISOString().split('T')[0]);
            setKondisiKembali(asset.kondisi || 'Baik');
            setCatatanKembali('');
        }
    }, [isOpen, asset]);

    if (!isOpen || !asset) return null;

    const history = asset.riwayatPeminjaman || [];
    const activeLoan = history.find(h => h.status === 'Dipinjam');

    const handleBorrowSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!peminjam.trim() || !keperluan.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const newLoan: SarprasBorrowLog = {
                id: `BRW-${generateSarprasId()}`,
                peminjam: peminjam.trim(),
                tipePeminjam,
                kontakPeminjam: kontakPeminjam.trim(),
                jumlahPinjam: Math.min(Math.max(1, Number(jumlahPinjam) || 1), asset.jumlah || 1),
                keperluan: keperluan.trim(),
                tanggalPinjam,
                estimasiKembali,
                status: 'Dipinjam',
                operator: currentUserName
            };
            await onBorrowAsset(asset, newLoan);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeLoan || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onReturnAsset(asset, activeLoan.id, kondisiKembali, catatanKembali.trim());
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 bg-indigo-700 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <i className="bi bi-arrow-left-right"></i>
                            Peminjaman &amp; Pengembalian Aset
                        </h3>
                        <p className="text-xs text-indigo-100">
                            {asset.kode} — {asset.nama} ({asset.jumlah} {asset.satuan || 'Unit'})
                        </p>
                    </div>
                    <button onClick={onClose} className="text-indigo-200 hover:text-white p-1">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeLoan ? (
                        <form onSubmit={handleReturnSubmit} className="space-y-4 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 text-xs">
                            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                                <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                                    <i className="bi bi-box-arrow-in-down-left text-emerald-600"></i>
                                    Aset Sedang Dipinjam — Proses Pengembalian
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    Dipinjam: {activeLoan.peminjam} ({activeLoan.tipePeminjam})
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-emerald-100 text-gray-700">
                                <div><strong>Keperluan:</strong> {activeLoan.keperluan}</div>
                                <div><strong>Jumlah Pinjam:</strong> {activeLoan.jumlahPinjam} {asset.satuan || 'Unit'}</div>
                                <div><strong>Tgl Pinjam:</strong> {formatDate(activeLoan.tanggalPinjam)}</div>
                                <div><strong>Target Kembali:</strong> {formatDate(activeLoan.estimasiKembali)}</div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Kondisi Fisik Saat Dikembalikan</label>
                                    <select
                                        value={kondisiKembali}
                                        onChange={e => setKondisiKembali(e.target.value as Inventaris['kondisi'])}
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white font-bold"
                                    >
                                        <option value="Baik">Baik / Lengkap</option>
                                        <option value="Rusak Ringan">Rusak Ringan</option>
                                        <option value="Rusak Berat">Rusak Berat</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Catatan Pengembalian (Opsional)</label>
                                    <input
                                        type="text"
                                        value={catatanKembali}
                                        onChange={e => setCatatanKembali(e.target.value)}
                                        placeholder="Contoh: Kabel lengkap, kondisi normal"
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                                >
                                    <i className="bi bi-check2-circle"></i>
                                    {isSubmitting ? 'Memproses...' : 'Konfirmasi Aset Dikembalikan'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleBorrowSubmit} className="space-y-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 text-xs">
                            <h4 className="font-bold text-sm text-indigo-950 flex items-center gap-1.5">
                                <i className="bi bi-plus-circle-fill text-indigo-600"></i>
                                Catat Peminjaman Aset Baru
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Kategori Peminjam</label>
                                    <select
                                        value={tipePeminjam}
                                        onChange={e => setTipePeminjam(e.target.value as SarprasBorrowLog['tipePeminjam'])}
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                    >
                                        <option value="Guru/Staf">Guru / Asatidz / Staf</option>
                                        <option value="Unit/Panitia">Unit / Panitia Acara Pondok</option>
                                        <option value="Santri">Pengurus Santri (OSIS/OPPM)</option>
                                        <option value="Umum">Pihak Luar / Umum</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Nama Peminjam / Penanggung Jawab *</label>
                                    <input
                                        type="text"
                                        list="sarpras-borrower-list"
                                        value={peminjam}
                                        onChange={e => setPeminjam(e.target.value)}
                                        required
                                        placeholder="Ketik atau pilih nama..."
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                    />
                                    <datalist id="sarpras-borrower-list">
                                        {teacherNames.map(name => (
                                            <option key={name} value={name} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Jumlah Dipinjam</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={asset.jumlah || 1}
                                        value={jumlahPinjam}
                                        onChange={e => setJumlahPinjam(Number(e.target.value))}
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Tanggal Pinjam</label>
                                    <input
                                        type="date"
                                        value={tanggalPinjam}
                                        onChange={e => setTanggalPinjam(e.target.value)}
                                        required
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Estimasi Kembali</label>
                                    <input
                                        type="date"
                                        value={estimasiKembali}
                                        onChange={e => setEstimasiKembali(e.target.value)}
                                        required
                                        className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Keperluan Peminjaman *</label>
                                <input
                                    type="text"
                                    value={keperluan}
                                    onChange={e => setKeperluan(e.target.value)}
                                    required
                                    placeholder="Contoh: Kegiatan Muhadharah Akbar di Aula, Rapat Yayasan..."
                                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                                >
                                    <i className="bi bi-check-circle-fill"></i>
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Peminjaman'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Riwayat Peminjaman */}
                    <div className="space-y-2">
                        <h4 className="font-bold text-xs uppercase text-gray-500">
                            Riwayat Peminjaman Aset ({history.length} Catatan)
                        </h4>
                        {history.length > 0 ? (
                            <div className="divide-y border rounded-xl overflow-hidden bg-white text-xs">
                                {history.slice().reverse().map(log => (
                                    <div key={log.id} className="p-3 flex items-start justify-between gap-3 hover:bg-gray-50">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">{log.peminjam}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                                                    {log.tipePeminjam}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                                    log.status === 'Dipinjam' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                            <p className="text-gray-700">Keperluan: {log.keperluan} ({log.jumlahPinjam} {asset.satuan || 'Unit'})</p>
                                            <p className="text-[10px] text-gray-400">
                                                Pinjam: {formatDate(log.tanggalPinjam)} • Target Kembali: {formatDate(log.estimasiKembali)}
                                                {log.tanggalKembaliAktual ? ` • Dikembalikan: ${formatDate(log.tanggalKembaliAktual)} (${log.kondisiKembali || 'Baik'})` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-xs text-gray-400 border rounded-xl bg-gray-50">
                                Belum ada riwayat peminjaman untuk aset ini.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 3. MODAL TAMBAH ASET MASSAL (BULK INPUT) ---
interface BulkSarprasModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveBulk: (items: Omit<Inventaris, 'id'>[]) => Promise<void>;
}

interface BulkRow {
    tempId: number;
    kode: string;
    nama: string;
    jenis: 'Bergerak' | 'Tidak Bergerak';
    kategori: string;
    lokasi: string;
    jumlah: number;
    satuan: string;
    kondisi: Inventaris['kondisi'];
    sumber: Inventaris['sumber'];
    hargaPerolehan: number;
    penanggungJawab: string;
}

export const BulkSarprasModal: React.FC<BulkSarprasModalProps> = ({ isOpen, onClose, onSaveBulk }) => {
    const [rows, setRows] = useState<BulkRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const createRow = (idx: number): BulkRow => ({
        tempId: Date.now() + idx,
        kode: `INV-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}-${idx + 1}`,
        nama: '',
        jenis: 'Bergerak',
        kategori: 'Meubeler',
        lokasi: '',
        jumlah: 1,
        satuan: 'Unit',
        kondisi: 'Baik',
        sumber: 'Beli Sendiri',
        hargaPerolehan: 0,
        penanggungJawab: ''
    });

    useEffect(() => {
        if (isOpen) {
            setRows(Array.from({ length: 5 }).map((_, i) => createRow(i)));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const updateRow = (tempId: number, field: keyof BulkRow, value: any) => {
        setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, [field]: value } : r));
    };

    const addRow = () => setRows(prev => [...prev, createRow(prev.length)]);
    const removeRow = (tempId: number) => setRows(prev => prev.filter(r => r.tempId !== tempId));

    const handleSave = async () => {
        const valid = rows.filter(r => r.nama.trim() !== '');
        if (valid.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const payload: Omit<Inventaris, 'id'>[] = valid.map(r => ({
                kode: r.kode.trim() || `INV-${Date.now()}`,
                nama: r.nama.trim(),
                jenis: r.jenis,
                kategori: r.kategori || 'Umum',
                lokasi: r.lokasi || '-',
                jumlah: Number(r.jumlah) || 1,
                satuan: r.satuan || 'Unit',
                kondisi: r.kondisi,
                sumber: r.sumber,
                tanggalPerolehan: today,
                hargaPerolehan: Number(r.hargaPerolehan) || 0,
                penanggungJawab: r.penanggungJawab.trim() || undefined,
                statusPinjam: 'Tersedia',
                deleted: false,
                lastModified: Date.now()
            }));
            await onSaveBulk(payload);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 bg-teal-700 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <i className="bi bi-table"></i>
                            Tambah Aset &amp; Inventaris Massal (Spreadsheet Input)
                        </h3>
                        <p className="text-xs text-teal-100">
                            Input cepat banyak inventaris kelas, asrama, atau kantor sekaligus. Baris dengan Nama Barang kosong akan diabaikan.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-teal-100 hover:text-white p-1">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    <div className="border rounded-xl overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-100 text-gray-700 font-bold uppercase">
                                <tr>
                                    <th className="p-2 text-center w-8">#</th>
                                    <th className="p-2 text-left w-36">Kode Aset</th>
                                    <th className="p-2 text-left min-w-[180px]">Nama Barang / Aset *</th>
                                    <th className="p-2 text-left w-32">Kategori</th>
                                    <th className="p-2 text-left w-36">Lokasi / Ruangan</th>
                                    <th className="p-2 text-center w-20">Jumlah</th>
                                    <th className="p-2 text-left w-20">Satuan</th>
                                    <th className="p-2 text-left w-28">Kondisi</th>
                                    <th className="p-2 text-left w-32">Sumber</th>
                                    <th className="p-2 text-right w-36">Nilai Total (Rp)</th>
                                    <th className="p-2 text-left w-32">PIC</th>
                                    <th className="p-2 text-center w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {rows.map((r, idx) => (
                                    <tr key={r.tempId} className="hover:bg-gray-50">
                                        <td className="p-2 text-center font-bold text-gray-400">{idx + 1}</td>
                                        <td className="p-1.5">
                                            <input
                                                type="text"
                                                value={r.kode}
                                                onChange={e => updateRow(r.tempId, 'kode', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 font-mono text-[11px]"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="text"
                                                value={r.nama}
                                                onChange={e => updateRow(r.tempId, 'nama', e.target.value)}
                                                placeholder="Meja Belajar, Proyektor..."
                                                className="w-full border border-gray-300 rounded px-2 py-1.5"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="text"
                                                value={r.kategori}
                                                onChange={e => updateRow(r.tempId, 'kategori', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-2 py-1.5"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="text"
                                                value={r.lokasi}
                                                onChange={e => updateRow(r.tempId, 'lokasi', e.target.value)}
                                                placeholder="Kelas 7A / Kantor"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="number"
                                                min={1}
                                                value={r.jumlah}
                                                onChange={e => updateRow(r.tempId, 'jumlah', Number(e.target.value))}
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-center"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="text"
                                                value={r.satuan}
                                                onChange={e => updateRow(r.tempId, 'satuan', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-2 py-1.5"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <select
                                                value={r.kondisi}
                                                onChange={e => updateRow(r.tempId, 'kondisi', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-1.5 py-1.5"
                                            >
                                                <option value="Baik">Baik</option>
                                                <option value="Rusak Ringan">Rusak Ringan</option>
                                                <option value="Rusak Berat">Rusak Berat</option>
                                            </select>
                                        </td>
                                        <td className="p-1.5">
                                            <select
                                                value={r.sumber}
                                                onChange={e => updateRow(r.tempId, 'sumber', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-1.5 py-1.5"
                                            >
                                                <option value="Beli Sendiri">Beli Sendiri</option>
                                                <option value="Wakaf">Wakaf</option>
                                                <option value="Hibah/Hadiah">Hibah/Hadiah</option>
                                                <option value="Bantuan Pemerintah">Bantuan Pemerintah</option>
                                            </select>
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="number"
                                                min={0}
                                                value={r.hargaPerolehan}
                                                onChange={e => updateRow(r.tempId, 'hargaPerolehan', Number(e.target.value))}
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-right font-semibold"
                                            />
                                        </td>
                                        <td className="p-1.5">
                                            <input
                                                type="text"
                                                value={r.penanggungJawab}
                                                onChange={e => updateRow(r.tempId, 'penanggungJawab', e.target.value)}
                                                placeholder="Nama PIC"
                                                className="w-full border border-gray-300 rounded px-2 py-1.5"
                                            />
                                        </td>
                                        <td className="p-1.5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeRow(r.tempId)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        type="button"
                        onClick={addRow}
                        className="mt-3 px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-teal-200"
                    >
                        <i className="bi bi-plus-circle-fill"></i> Tambah Baris Baru
                    </button>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        Siap disimpan: <strong>{rows.filter(r => r.nama.trim() !== '').length}</strong> aset valid
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || rows.filter(r => r.nama.trim() !== '').length === 0}
                            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold shadow-xs"
                        >
                            {isSaving ? 'Menyimpan...' : 'Simpan Semua Aset'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
