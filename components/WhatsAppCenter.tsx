
import React, { useState, useMemo } from 'react';
import { useSantriContext } from '../contexts/SantriContext';
import { useAppContext } from '../AppContext';
import { formatWAMessage, getWAUrl, WA_TEMPLATES, sendManualWA } from '../services/waService';
import { Santri } from '../types';

export const WhatsAppCenter: React.FC = () => {
    const { santriList } = useSantriContext();
    const { settings } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterJenjang, setFilterJenjang] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [filterRombel, setFilterRombel] = useState('');
    
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof WA_TEMPLATES>('TAGIHAN');
    const [customMessage, setCustomMessage] = useState(WA_TEMPLATES.TAGIHAN);
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);

    const filteredSantri = useMemo(() => {
        return santriList.filter(s => {
            const matchesSearch = s.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis.includes(searchTerm);
            const matchesJenjang = !filterJenjang || s.jenjangId === parseInt(filterJenjang);
            const matchesKelas = !filterKelas || s.kelasId === parseInt(filterKelas);
            const matchesRombel = !filterRombel || s.rombelId === parseInt(filterRombel);
            return matchesSearch && matchesJenjang && matchesKelas && matchesRombel;
        });
    }, [santriList, searchTerm, filterJenjang, filterKelas, filterRombel]);

    const availableKelas = useMemo(() => {
        if (!filterJenjang) return settings.kelas;
        return settings.kelas.filter(k => k.jenjangId === parseInt(filterJenjang));
    }, [filterJenjang, settings.kelas]);

    const availableRombel = useMemo(() => {
        if (!filterKelas) return settings.rombel.filter(r => availableKelas.map(k => k.id).includes(r.kelasId));
        return settings.rombel.filter(r => r.kelasId === parseInt(filterKelas));
    }, [filterKelas, settings.rombel, availableKelas]);

    const handleSelectTemplate = (key: keyof typeof WA_TEMPLATES) => {
        setSelectedTemplate(key);
        setCustomMessage(WA_TEMPLATES[key]);
    };

    const toggleSelect = (id: number) => {
        setSelectedSantriIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSendIndividual = (santri: Santri) => {
        const message = formatWAMessage(customMessage, {
            nama_santri: santri.namaLengkap,
            ortu: santri.namaAyah || santri.namaIbu || 'Wali Santri',
            nominal: "...", // ideally fetch from finance
            bulan: new Date().toLocaleString('id-ID', { month: 'long' })
        });
        sendManualWA(santri.teleponAyah || santri.teleponIbu || santri.teleponWali, message);
    };

    const handleBulkSend = () => {
        if (selectedSantriIds.length === 0) return;
        
        // In manual mode, we guide the user to send one by one to avoid spam detection
        const firstId = selectedSantriIds[0];
        const santri = santriList.find(s => s.id === firstId);
        if (santri) {
            handleSendIndividual(santri);
            // Remove from selected after "sending" (opening window)
            setSelectedSantriIds(prev => prev.slice(1));
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">WhatsApp Communication Center</h1>
                    <p className="text-gray-500 mt-1 text-sm">Kelola komunikasi efektif dengan wali santri secara cerdas.</p>
                </div>
                <div className="flex gap-2 self-start md:self-center">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] md:text-xs font-bold border border-green-200 flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <i className="bi bi-whatsapp"></i> WhatsApp Connected
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Template & Message Editor */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <i className="bi bi-file-earmark-text text-teal-600"></i> Template Pesan
                        </h3>
                        
                        {/* Mobile: Dropdown select */}
                        <div className="block md:hidden mb-4">
                            <select 
                                value={selectedTemplate}
                                onChange={(e) => handleSelectTemplate(e.target.value as keyof typeof WA_TEMPLATES)}
                                className="w-full p-3 rounded-lg border-2 border-gray-100 bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                            >
                                {Object.keys(WA_TEMPLATES).map((key) => (
                                    <option key={key} value={key}>
                                        {key.replace('_', ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Desktop: Button List */}
                        <div className="hidden md:grid grid-cols-1 gap-2">
                            {Object.keys(WA_TEMPLATES).map((key) => (
                                <button
                                    key={key}
                                    onClick={() => handleSelectTemplate(key as keyof typeof WA_TEMPLATES)}
                                    className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                        selectedTemplate === key 
                                        ? 'bg-teal-600 text-white shadow-md' 
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {key.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Isi Pesan (Editor)</label>
                            <textarea
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="w-full h-40 p-3 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 bg-gray-50 font-mono"
                                placeholder="Tulis pesan Anda di sini..."
                            />
                            <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded text-[10px] text-amber-700 leading-relaxed">
                                <i className="bi bi-info-circle mr-1"></i> 
                                Gunakan variabel: <strong>[nama_santri]</strong>, <strong>[ortu]</strong>, <strong>[nominal]</strong>, <strong>[bulan]</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Santri Selection & Action */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-50 space-y-4">
                            <div className="flex flex-wrap gap-4 items-center justify-between">
                                <div className="relative flex-grow max-w-md">
                                    <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                    <input 
                                        type="text"
                                        placeholder="Cari Santri atau NIS..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {selectedSantriIds.length > 0 && (
                                        <button 
                                            onClick={handleBulkSend}
                                            className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <i className="bi bi-send-fill"></i> Kirim Ke {selectedSantriIds.length} Santri
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filters row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <select 
                                    className="p-2 bg-gray-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                                    value={filterJenjang}
                                    onChange={(e) => { setFilterJenjang(e.target.value); setFilterKelas(''); setFilterRombel(''); }}
                                >
                                    <option value="">Semua Marhalah</option>
                                    {settings.jenjang.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                                </select>
                                <select 
                                    className="p-2 bg-gray-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                                    value={filterKelas}
                                    disabled={!filterJenjang}
                                    onChange={(e) => { setFilterKelas(e.target.value); setFilterRombel(''); }}
                                >
                                    <option value="">Semua Kelas</option>
                                    {availableKelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                                <select 
                                    className="p-2 bg-gray-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                                    value={filterRombel}
                                    disabled={!filterKelas}
                                    onChange={(e) => setFilterRombel(e.target.value)}
                                >
                                    <option value="">Semua Rombel</option>
                                    {availableRombel.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase font-bold sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 w-10">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedSantriIds.length === filteredSantri.length && filteredSantri.length > 0}
                                                onChange={() => {
                                                    if (selectedSantriIds.length === filteredSantri.length) setSelectedSantriIds([]);
                                                    else setSelectedSantriIds(filteredSantri.map(s => s.id));
                                                }}
                                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                            />
                                        </th>
                                        <th className="px-6 py-3">Nama Santri</th>
                                        <th className="px-6 py-3">Orang Tua</th>
                                        <th className="px-6 py-3">Nomor WA</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredSantri.map(santri => {
                                        const phone = santri.teleponAyah || santri.teleponIbu || santri.teleponWali;
                                        return (
                                            <tr key={santri.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedSantriIds.includes(santri.id)}
                                                        onChange={() => toggleSelect(santri.id)}
                                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800">{santri.namaLengkap}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono uppercase">{santri.nis}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {santri.namaAyah || santri.namaIbu || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {phone ? (
                                                        <span className="text-teal-600 font-medium">{phone}</span>
                                                    ) : (
                                                        <span className="text-red-400 italic text-xs">Tidak ada nomor</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handleSendIndividual(santri)}
                                                        disabled={!phone}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30"
                                                        title="Kirim Pesan Individual"
                                                    >
                                                        <i className="bi bi-whatsapp text-lg"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredSantri.length === 0 && (
                                <div className="p-20 text-center text-gray-400">
                                    <i className="bi bi-people text-4xl mb-2 block"></i>
                                    Data santri tidak ditemukan.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4 items-start">
                            <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                                <i className="bi bi-shield-check text-blue-600 text-lg"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900 text-sm">Keamanan Pengiriman</h4>
                                <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                                    Sistem redirect manual dirancang agar nomor WhatsApp Anda tetap aman dari blokir. WhatsApp mendeteksi pesan yang diketik/dibuka manual sebagai interaksi manusia alami.
                                </p>
                            </div>
                        </div>
                        
                        <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl flex gap-4 items-start">
                            <div className="bg-teal-100 p-2 rounded-lg shrink-0">
                                <i className="bi bi-lightbulb text-teal-600 text-lg"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-teal-900 text-sm">Tips Efektif</h4>
                                <p className="text-[11px] text-teal-700 mt-1 leading-relaxed">
                                    Gunakan template pesan yang sopan dan sertakan variabel personal agar wali santri merasa lebih dihargai. Fokus pada transparansi data.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
