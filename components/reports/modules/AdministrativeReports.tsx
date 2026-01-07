
import React from 'react';
import { Santri, PondokSettings, RiwayatStatus, GedungAsrama } from '../../../types';
import { PrintHeader } from '../../common/PrintHeader';
import { ReportFooter, formatDate, formatRupiah } from './Common';

// --- DASHBOARD SUMMARY ---
export const DashboardSummaryTemplate: React.FC<{ santriList: Santri[], settings: PondokSettings }> = ({ santriList, settings }) => {
    const totalSantri = santriList.length;
    const totalPutra = santriList.filter(s => s.jenisKelamin === 'Laki-laki').length;
    const totalPutri = totalSantri - totalPutra;
    const statusCounts = santriList.reduce((acc, santri) => { acc[santri.status] = (acc[santri.status] || 0) + 1; return acc; }, {} as Record<Santri['status'], number>);
    
    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="Laporan Ringkas Dashboard Utama" />
                <p className="text-center text-sm mb-4">Dicetak pada: {formatDate(new Date().toISOString())}</p>
                <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Statistik Utama</h4>
                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                    <div className="p-2 border border-black rounded"><div className="text-xs text-gray-700">Total Santri</div><div className="text-2xl font-bold">{totalSantri}</div></div>
                    <div className="p-2 border border-black rounded"><div className="text-xs text-gray-700">Santri Putra</div><div className="text-2xl font-bold">{totalPutra}</div></div>
                    <div className="p-2 border border-black rounded"><div className="text-xs text-gray-700">Santri Putri</div><div className="text-2xl font-bold">{totalPutri}</div></div>
                </div>
                <div className="grid grid-cols-2 gap-6" style={{ breakInside: 'avoid' }}>
                    <div>
                        <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Komposisi Status</h4>
                        <table className="w-full text-sm">
                            <tbody>{(['Aktif', 'Hiatus', 'Lulus', 'Keluar/Pindah'] as Santri['status'][]).map(s => (<tr key={s}><td className="py-1 font-medium">{s}</td><td className="py-1 text-right">{statusCounts[s] || 0}</td></tr>))}</tbody>
                        </table>
                    </div>
                    <div><h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">Struktur Pendidikan</h4><table className="w-full text-sm"><tbody><tr><td className="py-1 font-medium">Jumlah Jenjang</td><td className="py-1 text-right">{settings.jenjang.length}</td></tr><tr><td className="py-1 font-medium">Jumlah Rombel</td><td className="py-1 text-right">{settings.rombel.length}</td></tr></tbody></table></div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- WALI KELAS ---
export const DaftarWaliKelasTemplate: React.FC<{ settings: PondokSettings }> = ({ settings }) => {
    const dataByJenjang = settings.jenjang.map(jenjang => {
        const kelasInJenjang = settings.kelas.filter(k => k.jenjangId === jenjang.id);
        const rombelData = [];
        for (const kelas of kelasInJenjang) {
            const rombelInKelas = settings.rombel.filter(r => r.kelasId === kelas.id);
            for (const rombel of rombelInKelas) {
                const wali = settings.tenagaPengajar.find(t => t.id === rombel.waliKelasId);
                rombelData.push({ kelas: kelas.nama, rombel: rombel.nama, wali: wali ? wali.nama : '-' });
            }
        }
        return { jenjang: jenjang.nama, rombels: rombelData };
    });

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="DAFTAR WALI KELAS PER ROMBEL" />
                <p className="text-center text-sm mb-6">Tahun Ajaran: {new Date().getFullYear()}/{new Date().getFullYear()+1}</p>
                <div className="space-y-6">
                    {dataByJenjang.map((group, idx) => (
                        <div key={idx} style={{ breakInside: 'avoid' }}>
                            <h4 className="font-bold text-lg mb-2 text-gray-800 border-b border-gray-400 pb-1">{group.jenjang}</h4>
                            {group.rombels.length > 0 ? (
                                <table className="w-full text-left border-collapse border border-black text-sm">
                                    <thead className="bg-gray-100"><tr><th className="p-2 border border-black w-10 text-center">No</th><th className="p-2 border border-black w-32">Kelas</th><th className="p-2 border border-black w-48">Rombel</th><th className="p-2 border border-black">Nama Wali Kelas</th></tr></thead>
                                    <tbody>{group.rombels.map((row, rIdx) => (<tr key={rIdx}><td className="p-2 border border-black text-center">{rIdx + 1}</td><td className="p-2 border border-black">{row.kelas}</td><td className="p-2 border border-black">{row.rombel}</td><td className="p-2 border border-black font-semibold">{row.wali}</td></tr>))}</tbody>
                                </table>
                            ) : <p className="text-sm italic text-gray-500 pl-2">Belum ada data rombel.</p>}
                        </div>
                    ))}
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- KONTAK ---
export const LaporanKontakTemplate: React.FC<{ santriList: Santri[], settings: PondokSettings }> = ({ santriList, settings }) => (
    <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
        <div>
            <PrintHeader settings={settings} title="LAPORAN KONTAK WALI SANTRI" />
            <table className="w-full text-left border-collapse border border-black text-sm">
                <thead className="bg-gray-200 uppercase"><tr><th className="p-2 border border-black w-8 text-center">No</th><th className="p-2 border border-black w-24 text-center">NIS</th><th className="p-2 border border-black">Nama Santri</th><th className="p-2 border border-black">Rombel</th><th className="p-2 border border-black">Nama Wali</th><th className="p-2 border border-black text-center">No. HP</th></tr></thead>
                <tbody>
                    {santriList.map((s, i) => (
                        <tr key={s.id}><td className="p-2 border border-black text-center">{i + 1}</td><td className="p-2 border border-black text-center">{s.nis}</td><td className="p-2 border border-black">{s.namaLengkap}</td><td className="p-2 border border-black">{settings.rombel.find(r => r.id === s.rombelId)?.nama || '-'}</td><td className="p-2 border border-black">{s.namaWali || s.namaAyah}</td><td className="p-2 border border-black text-center font-mono">{s.teleponWali || s.teleponAyah || '-'}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
        <ReportFooter />
    </div>
);

// --- ASRAMA ---
export const LaporanAsramaTemplate: React.FC<{ settings: PondokSettings; santriList: Santri[]; gedungList: GedungAsrama[]; }> = ({ settings, santriList, gedungList }) => {
    const penghuniPerKamar = new Map<number, Santri[]>();
    santriList.forEach(s => { if (s.kamarId && s.status === 'Aktif') { if (!penghuniPerKamar.has(s.kamarId)) penghuniPerKamar.set(s.kamarId, []); penghuniPerKamar.get(s.kamarId)!.push(s); } });

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="Laporan Rekapitulasi Keasramaan" />
                <div className="space-y-6">
                    {gedungList.map(gedung => (
                        <div key={gedung.id} style={{ breakInside: 'avoid' }}>
                            <h4 className="font-bold text-lg mb-2 border-b-2 border-black pb-1">{gedung.nama} ({gedung.jenis})</h4>
                            {settings.kamar.filter(k => k.gedungId === gedung.id).map(k => {
                                const penghuni = penghuniPerKamar.get(k.id) || [];
                                const musyrif = settings.tenagaPengajar.find(tp => tp.id === k.musyrifId);
                                return (
                                    <div key={k.id} className="pl-4 border-l-2 border-gray-300 mb-4" style={{ breakInside: 'avoid' }}>
                                        <div className="bg-gray-100 p-1 font-semibold text-sm flex justify-between"><span>{k.nama}</span><span>{penghuni.length} / {k.kapasitas}</span></div>
                                        <p className="text-xs text-gray-600 mb-1">Musyrif: {musyrif?.nama || '-'}</p>
                                        {penghuni.length > 0 ? (
                                            <table className="w-full text-xs border-collapse border border-black">
                                                <thead className="bg-gray-200"><tr><th className="p-1 border border-black w-8">No</th><th className="p-1 border border-black">Nama</th><th className="p-1 border border-black">Rombel</th></tr></thead>
                                                <tbody>{penghuni.map((s, i) => (<tr key={s.id}><td className="p-1 border border-black text-center">{i+1}</td><td className="p-1 border border-black">{s.namaLengkap}</td><td className="p-1 border border-black">{settings.rombel.find(r=>r.id===s.rombelId)?.nama}</td></tr>))}</tbody>
                                            </table>
                                        ) : <p className="text-xs italic text-gray-500">Kamar kosong.</p>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- MUTASI ---
export const LaporanMutasiTemplate: React.FC<{ mutasiEvents: any[]; settings: PondokSettings; startDate: string; endDate: string }> = ({ mutasiEvents, settings, startDate, endDate }) => (
    <div className="text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
        <div>
            <PrintHeader settings={settings} title="LAPORAN MUTASI SANTRI" />
            <div className="text-sm font-semibold mb-4"><span>Periode: {formatDate(startDate)} s.d. {formatDate(endDate)}</span></div>
            <table className="w-full text-left border-collapse border border-black">
                <thead className="text-xs uppercase bg-gray-200 text-center"><tr><th className="px-2 py-2 border border-black">No</th><th className="px-2 py-2 border border-black">Tanggal</th><th className="px-2 py-2 border border-black">NIS</th><th className="px-2 py-2 border border-black text-left">Nama Lengkap</th><th className="px-2 py-2 border border-black">Status Baru</th><th className="px-2 py-2 border border-black text-left">Keterangan</th></tr></thead>
                <tbody style={{ fontSize: '9pt' }}>
                    {mutasiEvents.map(({ santri, mutasi }, i) => (
                        <tr key={`${santri.id}-${mutasi.id}`}><td className="px-2 py-2 border border-black text-center">{i + 1}</td><td className="px-2 py-2 border border-black whitespace-nowrap">{formatDate(mutasi.tanggal)}</td><td className="px-2 py-2 border border-black">{santri.nis}</td><td className="px-2 py-2 border border-black">{santri.namaLengkap}</td><td className="px-2 py-2 border border-black text-center">{mutasi.status}</td><td className="px-2 py-2 border border-black">{mutasi.keterangan}</td></tr>
                    ))}
                    {mutasiEvents.length === 0 && <tr><td colSpan={6} className="text-center py-4 border border-black italic text-gray-500">Tidak ada data mutasi.</td></tr>}
                </tbody>
            </table>
        </div>
        <ReportFooter />
    </div>
);

// --- PEMBINAAN ---
export const LembarPembinaanTemplate: React.FC<{ santri: Santri; settings: PondokSettings }> = ({ santri, settings }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '10pt' }}>
            <div>
                <PrintHeader settings={settings} title="LEMBAR PEMBINAAN SANTRI" />
                <div className="mb-6 p-4 border rounded bg-gray-50">
                    <table className="w-full"><tbody><tr><td className="font-semibold w-32">Nama</td><td>: {santri.namaLengkap}</td><td className="font-semibold w-32">NIS</td><td>: {santri.nis}</td></tr><tr><td className="font-semibold">Jenjang/Kelas</td><td>: {jenjang?.nama} / {kelas?.nama}</td><td className="font-semibold">Rombel</td><td>: {rombel?.nama}</td></tr><tr><td className="font-semibold">Wali</td><td>: {santri.namaWali || santri.namaAyah}</td><td className="font-semibold">Kamar</td><td>: {santri.kamarId ? settings.kamar.find(k=>k.id===santri.kamarId)?.nama : '-'}</td></tr></tbody></table>
                </div>
                <h4 className="font-bold text-lg border-b border-black mb-2 mt-4">A. Catatan Prestasi</h4>
                <table className="w-full border-collapse border border-black text-sm mb-6">
                    <thead className="bg-gray-200"><tr><th className="border p-2 w-10">No</th><th className="border p-2">Kegiatan/Lomba</th><th className="border p-2">Tingkat</th><th className="border p-2">Tahun</th><th className="border p-2">Ket.</th></tr></thead>
                    <tbody>{santri.prestasi && santri.prestasi.length > 0 ? santri.prestasi.map((p, i) => (<tr key={i}><td className="border p-2 text-center">{i+1}</td><td className="border p-2">{p.nama}</td><td className="border p-2">{p.tingkat}</td><td className="border p-2 text-center">{p.tahun}</td><td className="border p-2">{p.jenis}</td></tr>)) : <tr><td colSpan={5} className="border p-4 text-center italic text-gray-500">Belum ada data prestasi.</td></tr>}</tbody>
                </table>
                <h4 className="font-bold text-lg border-b border-black mb-2">B. Catatan Pelanggaran & Pembinaan</h4>
                <table className="w-full border-collapse border border-black text-sm">
                    <thead className="bg-gray-200"><tr><th className="border p-2 w-10">No</th><th className="border p-2 w-24">Tanggal</th><th className="border p-2">Jenis Pelanggaran</th><th className="border p-2">Tindak Lanjut / Sanksi</th><th className="border p-2 w-32">Paraf Pembina</th></tr></thead>
                    <tbody>{santri.pelanggaran && santri.pelanggaran.length > 0 ? santri.pelanggaran.map((p, i) => (<tr key={i}><td className="border p-2 text-center">{i+1}</td><td className="border p-2">{formatDate(p.tanggal)}</td><td className="border p-2"><div>{p.deskripsi}</div><div className="text-xs text-gray-500 italic">({p.jenis})</div></td><td className="border p-2">{p.tindakLanjut}</td><td className="border p-2"></td></tr>)) : <> {[1,2,3,4,5].map(i => <tr key={i} className="h-10"><td className="border p-2 text-center">{i}</td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td><td className="border p-2"></td></tr>)} </>}</tbody>
                </table>
            </div>
            <ReportFooter />
        </div>
    );
};

// --- IZIN PULANG ---
export const FormulirIzinTemplate: React.FC<{ santri: Santri; settings: PondokSettings; options: any }> = ({ santri, settings, options }) => {
    const rombel = settings.rombel.find(r => r.id === santri.rombelId);
    const kelas = rombel ? settings.kelas.find(k => k.id === rombel.kelasId) : undefined;
    const jenjang = kelas ? settings.jenjang.find(j => j.id === kelas.jenjangId) : undefined;
    const signatory = settings.tenagaPengajar.find(p => p.id === parseInt(options.izinSignatoryId));

    return (
        <div className="font-sans text-black flex flex-col h-full justify-between" style={{ fontSize: '11pt' }}>
            <div>
                <PrintHeader settings={settings} title="SURAT IZIN KELUAR PONDOK" />
                <div className="my-6">
                    <p>Yang bertanda tangan di bawah ini memberikan izin kepada:</p>
                    <table className="w-full my-4 ml-4">
                        <tbody>
                            <tr><td className="w-40 py-1">Nama</td><td>: <strong>{santri.namaLengkap}</strong></td></tr>
                            <tr><td className="w-40 py-1">NIS</td><td>: {santri.nis}</td></tr>
                            <tr><td className="w-40 py-1">Jenjang</td><td>: {jenjang?.nama || '-'}</td></tr>
                            <tr><td className="w-40 py-1">Kelas / Rombel</td><td>: {kelas?.nama || '-'} / {rombel?.nama || '-'}</td></tr>
                            <tr><td className="w-40 py-1">Kamar</td><td>: {santri.kamarId ? settings.kamar.find(k=>k.id===santri.kamarId)?.nama : '-'}</td></tr>
                        </tbody>
                    </table>
                    <p>Untuk keluar lingkungan pondok pesantren dengan detail sebagai berikut:</p>
                    <table className="w-full my-4 ml-4">
                        <tbody>
                            <tr><td className="w-40 py-1">Tujuan</td><td>: {options.izinTujuan}</td></tr>
                            <tr><td className="w-40 py-1">Keperluan</td><td>: {options.izinKeperluan}</td></tr>
                            <tr><td className="w-40 py-1">Waktu Berangkat</td><td>: {formatDate(options.izinTanggalBerangkat)}</td></tr>
                            <tr><td className="w-40 py-1">Waktu Kembali</td><td>: {formatDate(options.izinTanggalKembali)}</td></tr>
                            <tr><td className="w-40 py-1">Penjemput</td><td>: {options.izinPenjemput || 'Sendiri'}</td></tr>
                        </tbody>
                    </table>
                    <div className="border-2 border-gray-800 p-4 rounded-md mt-6 bg-gray-50">
                        <h4 className="font-bold underline mb-2 text-sm">KETENTUAN IZIN:</h4>
                        <div className="text-sm space-y-1 whitespace-pre-wrap">{options.izinKetentuan}</div>
                    </div>
                </div>
                <div className="flex justify-between items-end mt-16 px-8" style={{ breakInside: 'avoid' }}>
                    <div className="text-center w-48"><p>Santri Ybs,</p><div className="h-20"></div><p className="font-bold underline">{santri.namaLengkap}</p></div>
                    <div className="text-center w-48"><p>Sumpiuh, {formatDate(new Date().toISOString())}</p><p>{options.izinSignatoryTitle}</p><div className="h-20"></div><p className="font-bold underline">{signatory?.nama || '..........................'}</p></div>
                </div>
            </div>
            <ReportFooter />
        </div>
    );
};
