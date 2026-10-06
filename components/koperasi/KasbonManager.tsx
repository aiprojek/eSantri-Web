import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TransaksiKoperasi } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { KasbonDetailModal } from './modals/KasbonDetailModal';
import { exportToExcel } from '../../utils/exportUtils';
import { useSantriContext } from '../../contexts/SantriContext';
import { useAppContext } from '../../AppContext';

const formatWaNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('0')) return '62' + cleaned.slice(1);
    return cleaned;
};

export const KasbonManager: React.FC = () => {
    const { santriList } = useSantriContext();
    const { settings, showToast } = useAppContext();

    // Get all unpaid active transactions
    const unpaidTransactions = useLiveQuery(
        () => db.transaksiKoperasi.filter(t => !t.deleted && t.statusTransaksi === 'Belum Lunas').reverse().toArray(),
        [],
        []
    );
    
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Santri' | 'Guru' | 'Umum'>('All');
    const [selectedTransaction, setSelectedTransaction] = useState<TransaksiKoperasi | null>(null);
    const [viewMode, setViewMode] = useState<'ByPerson' | 'ByDate'>('ByPerson');
    const [waModalTarget, setWaModalTarget] = useState<{ name: string; type: string; santriId?: number; count: number; totalDebt: number; transactions: TransaksiKoperasi[] } | null>(null);
    const [waPhoneInput, setWaPhoneInput] = useState('');

    const filteredList = useMemo(() => {
        return unpaidTransactions.filter(t => {
            const matchSearch = t.namaPembeli.toLowerCase().includes(search.toLowerCase());
            const matchType = filterType === 'All' || t.tipePembeli === filterType;
            return matchSearch && matchType;
        });
    }, [unpaidTransactions, search, filterType]);

    // Group by Person for Recap View
    const groupedByPerson = useMemo(() => {
        const groups: Record<string, { name: string, type: string, santriId?: number, count: number, totalDebt: number, transactions: TransaksiKoperasi[] }> = {};
        
        filteredList.forEach(t => {
            const key = `${t.namaPembeli}_${t.tipePembeli}`;
            if (!groups[key]) {
                groups[key] = { name: t.namaPembeli, type: t.tipePembeli, santriId: t.pembeliId, count: 0, totalDebt: 0, transactions: [] };
            }
            groups[key].count += 1;
            groups[key].totalDebt += (t.sisaTagihan ?? t.totalFinal);
            groups[key].transactions.push(t);
        });

        return Object.values(groups).sort((a, b) => b.totalDebt - a.totalDebt);
    }, [filteredList]);

    const totalPiutang = useMemo(() => {
        return unpaidTransactions.reduce((acc, t) => acc + (t.sisaTagihan ?? t.totalFinal), 0);
    }, [unpaidTransactions]);

    const openWhatsAppChat = (person: { name: string, type: string, santriId?: number, count: number, totalDebt: number, transactions: TransaksiKoperasi[] }, rawPhone: string) => {
        const formattedPhone = formatWaNumber(rawPhone);
        if (!formattedPhone) {
            showToast('Nomor WhatsApp tidak valid.', 'error');
            return;
        }

        const rincian = person.transactions.map(t => {
            const tgl = new Date(t.tanggal).toLocaleDateString('id-ID');
            const items = t.items.map(i => `${i.nama} x${i.qty}`).join(', ');
            return `- ${tgl}: ${items} (Sisa: ${formatRupiah(t.sisaTagihan ?? t.totalFinal)})`;
        }).join('\n');

        const text = `Assalamu'alaikum Wr. Wb.\n\nInformasi Tagihan Kasbon *Koperasi ${settings.namaPonpes || 'Pesantren'}*:\n\nNama: *${person.name}* (${person.type})\nJumlah Nota: ${person.count} Transaksi\n*Total Sisa Tagihan: ${formatRupiah(person.totalDebt)}*\n\nRincian:\n${rincian}\n\nMohon kesediaannya untuk dapat melakukan pelunasan melalui Kasir Koperasi. Terima kasih.\nWassalamu'alaikum Wr. Wb.`;

        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
    };

    const handleSendWaReminder = (person: { name: string, type: string, santriId?: number, count: number, totalDebt: number, transactions: TransaksiKoperasi[] }) => {
        let phone = '';
        if (person.type === 'Santri' && person.santriId) {
            const s = santriList.find(st => st.id === person.santriId);
            phone = s?.teleponWali || s?.teleponAyah || s?.teleponIbu || '';
        }
        if (!phone) {
            setWaPhoneInput('');
            setWaModalTarget(person);
            return;
        }
        openWhatsAppChat(person, phone);
    };

    const handleExport = () => {
        const data = filteredList.map(t => ({
            'Tanggal': new Date(t.tanggal).toLocaleDateString('id-ID'),
            'Nama': t.namaPembeli,
            'Status': t.tipePembeli,
            'Total Awal': t.totalFinal,
            'Sudah Bayar': (t.bayar || 0),
            'Sisa Hutang': t.sisaTagihan,
            'Items': t.items.map(i => `${i.nama} (${i.qty})`).join(', '),
            'Catatan': t.catatanPembayaran || '-'
        }));
        exportToExcel(data, `Data_Piutang_Koperasi_${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className="space-y-6">
            {/* Summary Banner */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2"><i className="bi bi-journal-bookmark-fill"></i> Buku Kasbon (Piutang)</h2>
                    <p className="text-red-100 text-sm">Kelola catatan hutang belanja santri, guru, dan umum beserta pengingat WhatsApp.</p>
                </div>
                <div className="text-right bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/20">
                    <div className="text-xs uppercase font-bold text-red-100">Total Piutang Belum Tertagih</div>
                    <div className="text-3xl font-black">{formatRupiah(totalPiutang)}</div>
                    <div className="text-xs text-red-200 mt-1">{unpaidTransactions.length} Transaksi Belum Lunas</div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center flex-grow">
                    <div className="relative flex-grow sm:max-w-xs">
                        <input 
                            type="text" 
                            placeholder="Cari Nama Peminjam..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="w-full pl-9 pr-4 py-2 min-h-[40px] border border-slate-300 rounded-lg text-sm"
                        />
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    </div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="border border-slate-300 rounded-lg p-2 min-h-[40px] text-sm bg-slate-50 font-medium">
                        <option value="All">Semua Tipe</option>
                        <option value="Santri">Santri</option>
                        <option value="Guru">Guru / Staf</option>
                        <option value="Umum">Umum</option>
                    </select>
                </div>

                <div className="flex gap-2 justify-between sm:justify-end">
                    <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-bold flex-1 sm:flex-initial">
                        <button onClick={() => setViewMode('ByPerson')} className={`flex-1 sm:flex-initial px-3 py-1.5 min-h-[34px] rounded-md transition-all whitespace-nowrap ${viewMode === 'ByPerson' ? 'bg-white shadow-2xs text-teal-700' : 'text-slate-500'}`}>Per Orang</button>
                        <button onClick={() => setViewMode('ByDate')} className={`flex-1 sm:flex-initial px-3 py-1.5 min-h-[34px] rounded-md transition-all whitespace-nowrap ${viewMode === 'ByDate' ? 'bg-white shadow-2xs text-teal-700' : 'text-slate-500'}`}>Per Nota</button>
                    </div>
                    <button onClick={handleExport} className="bg-emerald-600 text-white px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 shrink-0">
                        <i className="bi bi-file-earmark-excel"></i> Export
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'ByPerson' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedByPerson.map((person, idx) => (
                        <div key={idx} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow p-4 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-lg">{person.name}</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${person.type === 'Santri' ? 'bg-blue-100 text-blue-700' : person.type === 'Guru' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{person.type}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">Total Hutang</div>
                                        <div className="text-xl font-bold text-red-600">{formatRupiah(person.totalDebt)}</div>
                                    </div>
                                </div>
                                <div className="border-t pt-2 mt-2">
                                    <div className="text-xs text-gray-500 mb-2 font-medium">{person.count} Nota Belum Lunas:</div>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {person.transactions.map(t => (
                                            <div 
                                                key={t.id} 
                                                onClick={() => setSelectedTransaction(t)}
                                                className="p-2 bg-gray-50 hover:bg-red-50 rounded border border-gray-200 cursor-pointer flex justify-between items-center text-xs transition-colors group"
                                            >
                                                <div>
                                                    <div className="font-bold text-gray-700 group-hover:text-red-700">{new Date(t.tanggal).toLocaleDateString('id-ID')}</div>
                                                    <div className="text-[10px] text-gray-500 truncate w-36">{t.items.map(i => i.nama).join(', ')}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-red-600">{formatRupiah(t.sisaTagihan || 0)}</div>
                                                    <span className="text-[9px] text-teal-600 underline">Bayar &rarr;</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t flex justify-end">
                                <button
                                    onClick={() => handleSendWaReminder(person)}
                                    className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <i className="bi bi-whatsapp"></i> Kirim Pengingat Tagihan (WA)
                                </button>
                            </div>
                        </div>
                    ))}
                    {groupedByPerson.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed">
                            <i className="bi bi-check-circle text-4xl mb-2 block text-green-500"></i>
                            Tidak ada data hutang yang ditemukan. Semua lunas!
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Tanggal</th>
                                    <th className="p-3">Peminjam</th>
                                    <th className="p-3">Item</th>
                                    <th className="p-3 text-right">Total Awal</th>
                                    <th className="p-3 text-right">Sudah Bayar</th>
                                    <th className="p-3 text-right">Sisa Hutang</th>
                                    <th className="p-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredList.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="p-3 text-xs text-slate-500 tabular-nums">{new Date(t.tanggal).toLocaleString('id-ID')}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-800">{t.namaPembeli}</div>
                                            <div className="text-xs text-slate-500">{t.tipePembeli}</div>
                                        </td>
                                        <td className="p-3 text-xs text-slate-600 max-w-xs truncate">
                                            {t.items.map(i => `${i.nama} (${i.qty})`).join(', ')}
                                            {t.catatanPembayaran && <div className="italic text-slate-400">"{t.catatanPembayaran}"</div>}
                                        </td>
                                        <td className="p-3 text-right text-slate-500 tabular-nums">{formatRupiah(t.totalFinal)}</td>
                                        <td className="p-3 text-right text-emerald-600 tabular-nums">{formatRupiah(t.bayar || 0)}</td>
                                        <td className="p-3 text-right font-bold text-red-600 tabular-nums">{formatRupiah(t.sisaTagihan || 0)}</td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => setSelectedTransaction(t)} 
                                                className="bg-teal-600 text-white px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold hover:bg-teal-700 shadow-2xs"
                                            >
                                                Bayar / Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden space-y-3">
                        {filteredList.map(t => (
                            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <div className="text-xs text-slate-500 tabular-nums">{new Date(t.tanggal).toLocaleDateString('id-ID')}</div>
                                        <div className="font-bold text-slate-900">{t.namaPembeli} <span className="font-normal text-xs text-slate-500">· {t.tipePembeli}</span></div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[11px] text-slate-500">Sisa Hutang</div>
                                        <div className="font-bold text-base text-red-600 tabular-nums">{formatRupiah(t.sisaTagihan || 0)}</div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    {t.items.map(i => `${i.nama} (${i.qty})`).join(', ')}
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <div className="text-xs text-slate-500 tabular-nums">
                                        Total: {formatRupiah(t.totalFinal)} · Dibayar: {formatRupiah(t.bayar || 0)}
                                    </div>
                                    <button
                                        onClick={() => setSelectedTransaction(t)}
                                        className="min-h-[38px] px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700"
                                    >
                                        Bayar / Detail
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <KasbonDetailModal 
                isOpen={!!selectedTransaction} 
                onClose={() => setSelectedTransaction(null)} 
                transaction={selectedTransaction} 
            />

            {waModalTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex justify-center items-end sm:items-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-emerald-600 text-white flex justify-between items-center">
                            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                                <i className="bi bi-whatsapp"></i> Kirim Tagihan WA — {waModalTarget.name}
                            </h3>
                            <button onClick={() => setWaModalTarget(null)} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                if (!waPhoneInput.trim()) return;
                                openWhatsAppChat(waModalTarget, waPhoneInput.trim());
                                setWaModalTarget(null);
                            }}
                            className="p-4 sm:p-5 space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Nomor WhatsApp Penerima</label>
                                <input
                                    type="tel"
                                    value={waPhoneInput}
                                    onChange={e => setWaPhoneInput(e.target.value)}
                                    placeholder="Contoh: 08123456789"
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm min-h-[44px] focus:ring-2 focus:ring-emerald-500"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setWaModalTarget(null)} className="px-4 py-2.5 min-h-[42px] border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                                    Batal
                                </button>
                                <button type="submit" className="px-5 py-2.5 min-h-[42px] bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5">
                                    <i className="bi bi-whatsapp"></i> Buka WhatsApp
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
