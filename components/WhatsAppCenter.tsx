
import React, { useEffect, useMemo, useState } from 'react';
import { useSantriContext } from '../contexts/SantriContext';
import { useAppContext } from '../AppContext';
import { formatWAMessage, openWAComposer, WA_TEMPLATES, sendManualWA } from '../services/waService';
import { Santri } from '../types';
import { SantriFilterBar } from './common/SantriFilterBar';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';

export const WhatsAppCenter: React.FC = () => {
    const { santriList } = useSantriContext();
    const { settings, showToast, onSaveSettings, showConfirmation } = useAppContext();
    const [filters, setFilters] = useState({ search: '', jenjang: '', kelas: '', rombel: '', status: 'Aktif' });
    const [onlyWithPhone, setOnlyWithPhone] = useState(true);

    const builtinTemplates = useMemo(
        () => ([
            { id: 'TAGIHAN', name: 'Tagihan', content: WA_TEMPLATES.TAGIHAN, builtin: true },
            { id: 'KWITANSI', name: 'Kwitansi', content: WA_TEMPLATES.KWITANSI, builtin: true },
            { id: 'TAHFIZH', name: 'Laporan Tahfizh', content: WA_TEMPLATES.TAHFIZH, builtin: true },
            { id: 'PENGUMUMAN', name: 'Pengumuman', content: WA_TEMPLATES.PENGUMUMAN, builtin: true },
            { id: 'SIARAN_UMUM', name: 'Siaran Umum', content: WA_TEMPLATES.SIARAN_UMUM, builtin: true },
            { id: 'SIARAN_GRUP', name: 'Siaran Grup', content: WA_TEMPLATES.SIARAN_GRUP, builtin: true },
        ]),
        []
    );

    const [customTemplates, setCustomTemplates] = useState<Array<{ id: string; name: string; content: string; lastModified?: number }>>(settings.waTemplates || []);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('TAGIHAN');
    const [customMessage, setCustomMessage] = useState(WA_TEMPLATES.TAGIHAN);
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateNameInput, setTemplateNameInput] = useState('');
    const [templateContentInput, setTemplateContentInput] = useState('');

    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    useEffect(() => {
        setCustomTemplates(settings.waTemplates || []);
    }, [settings.waTemplates]);

    const templateOptions = useMemo(
        () => [...builtinTemplates, ...customTemplates.map((t) => ({ ...t, builtin: false }))],
        [builtinTemplates, customTemplates]
    );

    const getPhone = (santri: Santri) => santri.teleponAyah || santri.teleponIbu || santri.teleponWali;

    const filteredSantri = useMemo(() => {
        return santriList.filter(s => {
            const searchLower = filters.search.toLowerCase();
            const matchesSearch = s.namaLengkap.toLowerCase().includes(searchLower) || s.nis.includes(filters.search);
            const matchesJenjang = !filters.jenjang || s.jenjangId === parseInt(filters.jenjang);
            const matchesKelas = !filters.kelas || s.kelasId === parseInt(filters.kelas);
            const matchesRombel = !filters.rombel || s.rombelId === parseInt(filters.rombel);
            const matchesStatus = !filters.status || s.status === filters.status;
            const matchesPhone = !onlyWithPhone || Boolean(getPhone(s));
            return matchesSearch && matchesJenjang && matchesKelas && matchesRombel && matchesStatus && matchesPhone;
        });
    }, [santriList, filters, onlyWithPhone]);

    const handleSelectTemplate = (id: string) => {
        const template = templateOptions.find((item) => item.id === id);
        if (!template) return;
        setSelectedTemplate(id);
        setCustomMessage(template.content);
    };

    const toggleSelect = (id: number) => {
        setSelectedSantriIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const sendWithFallback = async (santri: Santri, message: string) => {
        const phone = getPhone(santri);
        if (!phone) {
            showToast(`Nomor WhatsApp untuk ${santri.namaLengkap} tidak ditemukan.`, 'error');
            return false;
        }
        if (!isOnline) {
            showToast('Perangkat sedang offline. Redirect WhatsApp memerlukan koneksi internet.', 'error');
            return false;
        }
        sendManualWA(phone, message);
        return true;
    };

    const persistTemplates = async (nextTemplates: Array<{ id: string; name: string; content: string; lastModified?: number }>) => {
        await onSaveSettings({
            ...settings,
            waTemplates: nextTemplates,
        });
        setCustomTemplates(nextTemplates);
    };

    const openCreateTemplateModal = () => {
        setEditingTemplateId(null);
        setTemplateNameInput('');
        setTemplateContentInput(customMessage);
        setIsTemplateModalOpen(true);
    };

    const openEditTemplateModal = () => {
        const current = customTemplates.find((t) => t.id === selectedTemplate);
        if (!current) {
            showToast('Template bawaan tidak dapat diedit. Simpan sebagai template baru.', 'info');
            return;
        }
        setEditingTemplateId(current.id);
        setTemplateNameInput(current.name);
        setTemplateContentInput(current.content);
        setIsTemplateModalOpen(true);
    };

    const handleSaveTemplate = async () => {
        const name = templateNameInput.trim();
        const content = templateContentInput.trim();
        if (!name || !content) {
            showToast('Nama dan isi template wajib diisi.', 'error');
            return;
        }
        if (editingTemplateId) {
            const next = customTemplates.map((t) => t.id === editingTemplateId ? { ...t, name, content, lastModified: Date.now() } : t);
            await persistTemplates(next);
            setSelectedTemplate(editingTemplateId);
            setCustomMessage(content);
            showToast('Template berhasil diperbarui.', 'success');
        } else {
            const newId = `tpl_${Date.now()}`;
            const next = [...customTemplates, { id: newId, name, content, lastModified: Date.now() }];
            await persistTemplates(next);
            setSelectedTemplate(newId);
            setCustomMessage(content);
            showToast('Template baru berhasil ditambahkan.', 'success');
        }
        setIsTemplateModalOpen(false);
    };

    const handleDeleteTemplate = () => {
        const current = customTemplates.find((t) => t.id === selectedTemplate);
        if (!current) {
            showToast('Template bawaan tidak dapat dihapus.', 'info');
            return;
        }
        showConfirmation(
            'Hapus Template?',
            `Template "${current.name}" akan dihapus permanen.`,
            async () => {
                const next = customTemplates.filter((t) => t.id !== current.id);
                await persistTemplates(next);
                setSelectedTemplate('TAGIHAN');
                setCustomMessage(WA_TEMPLATES.TAGIHAN);
                showToast('Template berhasil dihapus.', 'success');
            },
            { confirmText: 'Hapus', confirmColor: 'red' }
        );
    };

    const handleSendIndividual = async (santri: Santri) => {
        const message = formatWAMessage(customMessage, {
            nama_santri: santri.namaLengkap,
            ortu: santri.namaAyah || santri.namaIbu || 'Wali Santri',
            nominal: "...", // ideally fetch from finance
            bulan: new Date().toLocaleString('id-ID', { month: 'long' })
        });
        await sendWithFallback(santri, message);
    };

    const handleBulkSend = async () => {
        if (selectedSantriIds.length === 0) return;
        if (!isOnline) {
            showToast('Perangkat sedang offline. Redirect WhatsApp memerlukan koneksi internet.', 'error');
            return;
        }

        const nextEligible = selectedSantriIds
            .map((id) => santriList.find((s) => s.id === id))
            .find((s): s is Santri => Boolean(s && getPhone(s)));

        if (!nextEligible) {
            showToast('Tidak ada nomor WhatsApp valid di daftar terpilih.', 'info');
            return;
        }

        const message = formatWAMessage(customMessage, {
            nama_santri: nextEligible.namaLengkap,
            ortu: nextEligible.namaAyah || nextEligible.namaIbu || 'Wali Santri',
            nominal: "...",
            bulan: new Date().toLocaleString('id-ID', { month: 'long' })
        });
        const sent = await sendWithFallback(nextEligible, message);
        if (sent) {
            setSelectedSantriIds((prev) => prev.filter((id) => id !== nextEligible.id));
        }
    };

    const handleOpenBroadcastComposer = () => {
        const message = formatWAMessage(customMessage, {
            nama_santri: 'Santri',
            ortu: 'Ayah/Bunda',
            nominal: '...',
            bulan: new Date().toLocaleString('id-ID', { month: 'long' }),
            pesan: 'Silakan isi pengumuman inti di sini.',
            agenda: 'Kegiatan Pondok',
            tanggal: new Date().toLocaleDateString('id-ID')
        });
        openWAComposer(message);
    };

    return (
        <div className="animate-fadeIn">
            <PageHeader
                eyebrow="Komunikasi"
                title="WhatsApp Communication Center"
                description="Kelola pesan wali santri dengan template yang konsisten, lalu saring penerima berdasarkan struktur santri yang sama dengan modul lain."
                actions={
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold shadow-sm md:text-xs ${
                        isOnline ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                        <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                        <i className="bi bi-whatsapp"></i> {isOnline ? 'WA Redirect Ready' : 'Offline (Redirect Nonaktif)'}
                    </span>
                }
                className="mb-6"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Template & Message Editor */}
                <div className="lg:col-span-1 space-y-6">
                    <SectionCard
                        title="Template Pesan"
                        description="Pilih template dasar lalu sesuaikan isi pesan sebelum dikirim ke wali santri."
                        contentClassName="p-6"
                    >
                        <div className="mb-4">
                            <select
                                value={selectedTemplate}
                                onChange={(e) => handleSelectTemplate(e.target.value)}
                                className="app-select w-full p-3 text-sm font-medium"
                            >
                                {templateOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}{option.builtin ? ' (Bawaan)' : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <button type="button" onClick={openCreateTemplateModal} className="app-button-secondary px-3 py-2 text-xs">
                                    <i className="bi bi-plus-circle"></i> Tambah
                                </button>
                                <button type="button" onClick={openEditTemplateModal} className="app-button-secondary px-3 py-2 text-xs">
                                    <i className="bi bi-pencil-square"></i> Edit
                                </button>
                                <button type="button" onClick={handleDeleteTemplate} className="app-button-secondary px-3 py-2 text-xs text-red-600">
                                    <i className="bi bi-trash"></i> Hapus
                                </button>
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="app-label mb-2 block">Isi Pesan (Editor)</label>
                            <textarea
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="app-input h-40 w-full rounded-xl p-3 font-mono text-sm"
                                placeholder="Tulis pesan Anda di sini..."
                            />
                            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-700">
                                <i className="bi bi-info-circle mr-1"></i> 
                                Gunakan variabel: <strong>[nama_santri]</strong>, <strong>[ortu]</strong>, <strong>[nominal]</strong>, <strong>[bulan]</strong>, <strong>[pesan]</strong>, <strong>[agenda]</strong>, <strong>[tanggal]</strong>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Siaran Umum / Grup"
                        description="Gunakan composer WhatsApp untuk menyiarkan pesan ke grup atau penerima umum secara manual."
                        contentClassName="p-6 space-y-3"
                    >
                        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            Gunakan dropdown <strong>Template Pesan</strong> di atas untuk memilih template <strong>Siaran Umum</strong> atau <strong>Siaran Grup</strong>.
                        </p>
                        <button
                            onClick={handleOpenBroadcastComposer}
                            disabled={!isOnline}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <i className="bi bi-megaphone-fill"></i> Buka Composer WA
                        </button>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                            Composer akan membuka WhatsApp dengan isi pesan siap kirim. Pilih grup/tujuan langsung dari aplikasi WhatsApp agar aman dari blokir.
                        </p>
                    </SectionCard>
                </div>

                {/* Right: Santri Selection & Action */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard
                        title="Daftar Penerima"
                        description="Daftar ini mengikuti filter santri aktif dan mendukung pengiriman individual atau bertahap."
                        contentClassName="p-0"
                    >
                        <div className="space-y-4 border-b border-app-border p-4 md:p-6">
                            <div className="flex flex-wrap gap-3 items-center justify-between">
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {selectedSantriIds.length > 0 && (
                                        <button 
                                            onClick={handleBulkSend}
                                            disabled={!isOnline}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                                        >
                                            <i className="bi bi-send-fill"></i> Kirim Ke {selectedSantriIds.length} Santri
                                        </button>
                                    )}
                                </div>
                            </div>

                            <SantriFilterBar
                                settings={settings}
                                filters={filters}
                                onChange={setFilters}
                                title="Filter Kontak Santri"
                                searchPlaceholder="Cari Santri atau NIS..."
                                resultCount={filteredSantri.length}
                                showGender={false}
                                className="bg-transparent border-0 shadow-none p-0"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setOnlyWithPhone((prev) => !prev)}
                                    aria-pressed={onlyWithPhone}
                                    title="Filter: Hanya yang punya WhatsApp"
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                                        onlyWithPhone
                                            ? 'border-teal-200 bg-teal-50 text-teal-700'
                                            : 'border-slate-200 bg-white text-slate-500'
                                    }`}
                                >
                                    <i className="bi bi-telephone-fill text-[10px]"></i>
                                    WA saja
                                </button>
                            </div>
                        </div>

                        <div className="app-table-shell border-0 border-t rounded-none">
                        <div className="app-scrollbar max-h-[500px] overflow-y-auto">
                            <table className="hidden md:table app-table text-left text-sm">
                                <thead className="sticky top-0 text-[11px] font-bold">
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
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSantri.map(santri => {
                                        const phone = getPhone(santri);
                                        return (
                                            <tr key={santri.id} className="group transition-colors hover:bg-teal-50/50">
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedSantriIds.includes(santri.id)}
                                                        onChange={() => toggleSelect(santri.id)}
                                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{santri.namaLengkap}</div>
                                                    <div className="font-mono text-[10px] uppercase text-slate-400">{santri.nis}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {santri.namaAyah || santri.namaIbu || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {phone ? (
                                                        <span className="font-medium text-teal-700">{phone}</span>
                                                    ) : (
                                                        <span className="text-xs italic text-red-400">Tidak ada nomor</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handleSendIndividual(santri)}
                                                        disabled={!phone || !isOnline}
                                                        className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50 disabled:opacity-30"
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

                            <div className="space-y-3 p-4 md:hidden">
                                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={selectedSantriIds.length === filteredSantri.length && filteredSantri.length > 0}
                                        onChange={() => {
                                            if (selectedSantriIds.length === filteredSantri.length) setSelectedSantriIds([]);
                                            else setSelectedSantriIds(filteredSantri.map((s) => s.id));
                                        }}
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    Pilih semua yang tampil ({filteredSantri.length})
                                </label>
                                {filteredSantri.map((santri) => {
                                    const phone = getPhone(santri);
                                    return (
                                        <div key={santri.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <div className="mb-2 flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-bold text-slate-800">{santri.namaLengkap}</div>
                                                    <div className="font-mono text-[10px] uppercase text-slate-400">{santri.nis}</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSantriIds.includes(santri.id)}
                                                    onChange={() => toggleSelect(santri.id)}
                                                    className="mt-1 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                />
                                            </div>
                                            <div className="space-y-1 text-xs text-slate-600">
                                                <div><span className="font-semibold text-slate-500">Ortu:</span> {santri.namaAyah || santri.namaIbu || '-'}</div>
                                                <div>
                                                    <span className="font-semibold text-slate-500">Nomor WA:</span>{' '}
                                                    {phone ? <span className="font-semibold text-teal-700">{phone}</span> : <span className="italic text-red-400">Tidak ada nomor</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleSendIndividual(santri)}
                                                disabled={!phone || !isOnline}
                                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <i className="bi bi-whatsapp"></i> Kirim Pesan
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            {filteredSantri.length === 0 && (
                                <EmptyState
                                    icon="bi-chat-square-dots"
                                    title="Tidak ada penerima ditemukan"
                                    description="Periksa lagi filter santri atau ubah status penerima agar daftar kontak yang ingin dihubungi muncul."
                                />
                            )}
                        </div>
                        </div>
                    </SectionCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div className="shrink-0 rounded-lg bg-blue-100 p-2">
                                <i className="bi bi-shield-check text-blue-600 text-lg"></i>
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900 text-sm">Keamanan Pengiriman</h4>
                                <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                                    Sistem redirect manual dirancang agar nomor WhatsApp Anda tetap aman dari blokir. WhatsApp mendeteksi pesan yang diketik/dibuka manual sebagai interaksi manusia alami.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4 rounded-xl border border-teal-100 bg-teal-50 p-4">
                            <div className="shrink-0 rounded-lg bg-teal-100 p-2">
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
            {isTemplateModalOpen && (
                <div className="app-overlay fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="app-modal w-full max-w-xl rounded-panel p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-app-text">{editingTemplateId ? 'Edit Template Pesan' : 'Tambah Template Pesan'}</h3>
                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="app-label mb-1 block">Nama Template</label>
                                <input
                                    className="app-input w-full"
                                    value={templateNameInput}
                                    onChange={(e) => setTemplateNameInput(e.target.value)}
                                    placeholder="Contoh: Reminder Pertemuan Wali"
                                />
                            </div>
                            <div>
                                <label className="app-label mb-1 block">Isi Template</label>
                                <textarea
                                    className="app-input min-h-[160px] w-full"
                                    value={templateContentInput}
                                    onChange={(e) => setTemplateContentInput(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="app-button-secondary px-4 py-2 text-sm">Batal</button>
                            <button type="button" onClick={handleSaveTemplate} className="app-button-primary px-4 py-2 text-sm">
                                {editingTemplateId ? 'Simpan Perubahan' : 'Tambah Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
