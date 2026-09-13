import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSantriContext } from '../contexts/SantriContext';
import { useAppContext } from '../AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { logActivity } from '../services/logService';
import {
    formatWAMessage,
    openWAComposer,
    WA_TEMPLATES,
    dispatchWhatsAppMessage,
    VARIABLE_CHIPS,
    normalizePhoneNumber,
} from '../services/waService';
import { Santri, Pendaftar, PendaftarStatus, PsbBerkasFisik } from '../types';
import { SantriFilterBar } from './common/SantriFilterBar';
import { PageHeader } from './common/PageHeader';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { DispatchQueueModal, QueueRecipientItem } from './whatsapp/DispatchQueueModal';
import { WaGatewayModal } from './whatsapp/WaGatewayModal';

type AudienceType = 'santri' | 'psb';

export const WhatsAppCenter: React.FC = () => {
    const { santriList } = useSantriContext();
    const { settings, showToast, onSaveSettings, showConfirmation, currentUser } = useAppContext();

    // Reactive DB queries
    const liveTagihan = useLiveQuery(() => db.tagihan.toArray(), []) || [];
    const livePendaftar = useLiveQuery(() => db.pendaftar.toArray(), []) || [];
    const liveAuditLogs = useLiveQuery(
        () => db.auditLogs.where('table_name').equals('whatsapp_logs').toArray(),
        []
    ) || [];

    // Audience state
    const [audience, setAudience] = useState<AudienceType>('santri');

    // Santri filters
    const [santriFilters, setSantriFilters] = useState({
        search: '',
        jenjang: '',
        kelas: '',
        rombel: '',
        status: 'Aktif',
    });

    // PSB filters
    const [psbFilters, setPsbFilters] = useState({
        search: '',
        status: '',
        gelombang: '',
        jalur: '',
        berkas: '',
    });

    const [onlyWithPhone, setOnlyWithPhone] = useState(true);

    // Selected contacts
    const [selectedSantriIds, setSelectedSantriIds] = useState<number[]>([]);
    const [selectedPsbIds, setSelectedPsbIds] = useState<number[]>([]);

    // Online detection
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    // Modals
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
    const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
    const [queueItems, setQueueItems] = useState<QueueRecipientItem[]>([]);

    // Template states
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateNameInput, setTemplateNameInput] = useState('');
    const [templateContentInput, setTemplateContentInput] = useState('');

    const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Builtin templates definition
    const builtinSantriTemplates = useMemo(
        () => [
            { id: 'TAGIHAN', name: 'Tagihan SPP / Biaya', content: WA_TEMPLATES.TAGIHAN, builtin: true, audience: 'santri' },
            { id: 'KWITANSI', name: 'Kwitansi Pembayaran', content: WA_TEMPLATES.KWITANSI, builtin: true, audience: 'santri' },
            { id: 'TAHFIZH', name: 'Laporan Tahfizh', content: WA_TEMPLATES.TAHFIZH, builtin: true, audience: 'santri' },
            { id: 'ABSENSI_ALPHA', name: 'Presensi (Alpha)', content: WA_TEMPLATES.ABSENSI_ALPHA, builtin: true, audience: 'santri' },
            { id: 'ABSENSI_SAKIT', name: 'Presensi (Sakit)', content: WA_TEMPLATES.ABSENSI_SAKIT, builtin: true, audience: 'santri' },
            { id: 'ABSENSI_IZIN', name: 'Presensi (Izin)', content: WA_TEMPLATES.ABSENSI_IZIN, builtin: true, audience: 'santri' },
            { id: 'PENGUMUMAN', name: 'Pengumuman Pondok', content: WA_TEMPLATES.PENGUMUMAN, builtin: true, audience: 'santri' },
            { id: 'SIARAN_UMUM', name: 'Siaran Umum', content: WA_TEMPLATES.SIARAN_UMUM, builtin: true, audience: 'santri' },
            { id: 'SIARAN_GRUP', name: 'Siaran Grup', content: WA_TEMPLATES.SIARAN_GRUP, builtin: true, audience: 'santri' },
        ],
        []
    );

    const builtinPsbTemplates = useMemo(
        () => [
            { id: 'PSB_KONFIRMASI', name: 'Konfirmasi Pendaftaran PSB', content: WA_TEMPLATES.PSB_KONFIRMASI, builtin: true, audience: 'psb' },
            { id: 'PSB_UNDANGAN_UJIAN', name: 'Undangan Ujian Masuk PSB', content: WA_TEMPLATES.PSB_UNDANGAN_UJIAN, builtin: true, audience: 'psb' },
            { id: 'PSB_KELULUSAN', name: 'Pengumuman Hasil Seleksi', content: WA_TEMPLATES.PSB_KELULUSAN, builtin: true, audience: 'psb' },
            { id: 'PSB_PENGINGAT_BERKAS', name: 'Pengingat Berkas Belum Lengkap', content: WA_TEMPLATES.PSB_PENGINGAT_BERKAS, builtin: true, audience: 'psb' },
            { id: 'PENGUMUMAN_PSB', name: 'Pengumuman Umum PSB', content: WA_TEMPLATES.PENGUMUMAN, builtin: true, audience: 'psb' },
        ],
        []
    );

    const [customTemplates, setCustomTemplates] = useState<
        Array<{ id: string; name: string; content: string; audience?: 'santri' | 'psb' | 'all'; lastModified?: number }>
    >(settings.waTemplates || []);

    const [selectedTemplate, setSelectedTemplate] = useState<string>('TAGIHAN');
    const [customMessage, setCustomMessage] = useState(WA_TEMPLATES.TAGIHAN);

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

    // Switch default template when switching audience
    const handleSwitchAudience = (newAudience: AudienceType) => {
        setAudience(newAudience);
        if (newAudience === 'psb') {
            setSelectedTemplate('PSB_KONFIRMASI');
            setCustomMessage(WA_TEMPLATES.PSB_KONFIRMASI);
        } else {
            setSelectedTemplate('TAGIHAN');
            setCustomMessage(WA_TEMPLATES.TAGIHAN);
        }
    };

    const templateOptions = useMemo(() => {
        const builtins = audience === 'santri' ? builtinSantriTemplates : builtinPsbTemplates;
        const matchingCustoms = customTemplates
            .filter((t) => !t.audience || t.audience === 'all' || t.audience === audience)
            .map((t) => ({ ...t, builtin: false }));
        return [...builtins, ...matchingCustoms];
    }, [audience, builtinSantriTemplates, builtinPsbTemplates, customTemplates]);

    // Helpers to get phone numbers
    const getSantriPhone = (santri: Santri) => santri.teleponAyah || santri.teleponIbu || santri.teleponWali;
    const getPsbPhone = (p: Pendaftar) => p.nomorHpWali || p.teleponWali || p.teleponAyah || p.teleponIbu;

    const getBerkasSummary = (b?: PsbBerkasFisik) => {
        if (!b) return 'Belum Lengkap (0/5)';
        let count = 0;
        if (b.kk) count++;
        if (b.akta) count++;
        if (b.ijazahSkl) count++;
        if (b.suratSehat) count++;
        if (b.pasFoto) count++;
        return count === 5 ? 'Lengkap (5/5)' : `Belum Lengkap (${count}/5)`;
    };

    // Calculate santri financial data from live tagihan
    const getSantriFinance = (santriId: number) => {
        const unpaid = (liveTagihan || []).filter(
            (t) => t.santriId === santriId && t.status === 'Belum Lunas' && !t.deleted
        );
        const total = unpaid.reduce((sum, t) => sum + (t.nominal || 0), 0);
        const rincian =
            unpaid.length > 0
                ? unpaid
                      .slice(0, 3)
                      .map((t) => `${t.deskripsi} (Rp ${(t.nominal || 0).toLocaleString('id-ID')})`)
                      .join(', ') + (unpaid.length > 3 ? ` dan ${unpaid.length - 3} tagihan lainnya` : '')
                : 'Tidak ada tunggakan';
        return {
            unpaidCount: unpaid.length,
            total,
            totalFmt: total > 0 ? `Rp ${total.toLocaleString('id-ID')}` : 'Rp 0 (Lunas)',
            rincian,
        };
    };

    // Last contacted audit map
    const lastContactedMap = useMemo(() => {
        const map: Record<string, { timestamp: string; channel: string; username: string }> = {};
        if (!liveAuditLogs) return map;
        liveAuditLogs.forEach((log) => {
            const recId = String(log.record_id);
            if (!map[recId] || new Date(log.created_at).getTime() > new Date(map[recId].timestamp).getTime()) {
                map[recId] = {
                    timestamp: log.created_at,
                    channel: log.new_data?.channel || log.new_data?.sentVia || 'manual',
                    username: log.username || 'Admin',
                };
            }
        });
        return map;
    }, [liveAuditLogs]);

    const formatContactedBadge = (contactInfo?: { timestamp: string; channel: string; username: string }) => {
        if (!contactInfo) return null;
        const date = new Date(contactInfo.timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const label = isToday ? `Hari ini ${timeStr}` : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return {
            label,
            channel: contactInfo.channel === 'gateway' ? 'API Gateway' : 'Manual WA',
            title: `Dihubungi ${date.toLocaleString('id-ID')} via ${contactInfo.channel} oleh ${contactInfo.username}`,
        };
    };

    // Filtered Santri
    const filteredSantri = useMemo(() => {
        return santriList.filter((s) => {
            const searchLower = santriFilters.search.toLowerCase();
            const matchesSearch = s.namaLengkap.toLowerCase().includes(searchLower) || s.nis.includes(santriFilters.search);
            const matchesJenjang = !santriFilters.jenjang || s.jenjangId === parseInt(santriFilters.jenjang);
            const matchesKelas = !santriFilters.kelas || s.kelasId === parseInt(santriFilters.kelas);
            const matchesRombel = !santriFilters.rombel || s.rombelId === parseInt(santriFilters.rombel);
            const matchesStatus = !santriFilters.status || s.status === santriFilters.status;
            const matchesPhone = !onlyWithPhone || Boolean(normalizePhoneNumber(getSantriPhone(s)));
            return matchesSearch && matchesJenjang && matchesKelas && matchesRombel && matchesStatus && matchesPhone;
        });
    }, [santriList, santriFilters, onlyWithPhone]);

    // Filtered PSB
    const filteredPsb = useMemo(() => {
        return (livePendaftar || []).filter((p) => {
            const searchLower = psbFilters.search.toLowerCase();
            const matchesSearch =
                p.namaLengkap.toLowerCase().includes(searchLower) ||
                (p.nomorRegistrasi && p.nomorRegistrasi.toLowerCase().includes(searchLower));
            const matchesStatus = !psbFilters.status || p.status === psbFilters.status;
            const matchesGelombang = !psbFilters.gelombang || String(p.gelombang) === psbFilters.gelombang;
            const matchesJalur = !psbFilters.jalur || p.jalurPendaftaran === psbFilters.jalur;
            const berkasSummary = getBerkasSummary(p.berkasFisik);
            const matchesBerkas =
                !psbFilters.berkas ||
                (psbFilters.berkas === 'Lengkap' ? berkasSummary.startsWith('Lengkap') : !berkasSummary.startsWith('Lengkap'));
            const matchesPhone = !onlyWithPhone || Boolean(normalizePhoneNumber(getPsbPhone(p)));
            return matchesSearch && matchesStatus && matchesGelombang && matchesJalur && matchesBerkas && matchesPhone;
        });
    }, [livePendaftar, psbFilters, onlyWithPhone]);

    // Message interpolation for Santri
    const formatMessageForSantri = (santri: Santri) => {
        const jenjangName = settings.jenjang.find((j) => j.id === santri.jenjangId)?.nama || '';
        const kelasName = settings.kelas.find((k) => k.id === santri.kelasId)?.nama || '';
        const rombelName = settings.rombel.find((r) => r.id === santri.rombelId)?.nama || '';
        const kamar = settings.kamar.find((k) => k.id === santri.kamarId);
        const gedung = kamar ? settings.gedungAsrama.find((g) => g.id === kamar.gedungId) : null;
        const kamarName = kamar?.nama || '';
        const gedungName = gedung?.nama || '';
        const asramaDisplay = kamarName ? `${gedungName ? gedungName + ' - ' : ''}Kamar ${kamarName}` : gedungName || '-';

        const finance = getSantriFinance(santri.id);

        return formatWAMessage(customMessage, {
            nama_santri: santri.namaLengkap,
            ortu: santri.namaAyah || santri.namaIbu || santri.namaWali || 'Wali Santri',
            nis: santri.nis || '-',
            kelas: kelasName || jenjangName || '-',
            rombel: rombelName || kelasName || '-',
            asrama: asramaDisplay,
            nominal: finance.totalFmt,
            tunggakan: finance.totalFmt,
            rincian_tagihan: finance.rincian,
            bulan: new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
            tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            nama_pondok: settings.namaPonpes || 'Pondok Pesantren',
            pesan: 'Silakan isi pengumuman/pesan inti di sini.',
            agenda: 'Kegiatan Pondok',
        });
    };

    // Message interpolation for PSB
    const formatMessageForPsb = (pendaftar: Pendaftar) => {
        return formatWAMessage(customMessage, {
            nama_santri: pendaftar.namaLengkap,
            ortu: pendaftar.namaWali || pendaftar.namaAyah || pendaftar.namaIbu || 'Wali Calon Santri',
            no_reg: pendaftar.nomorRegistrasi || `REG-${pendaftar.id}`,
            jalur: pendaftar.jalurPendaftaran || 'Reguler',
            gelombang: pendaftar.gelombang ? `Gelombang ${pendaftar.gelombang}` : 'Gelombang 1',
            status_psb: pendaftar.status,
            status_berkas: getBerkasSummary(pendaftar.berkasFisik),
            ruang_ujian: pendaftar.nilaiUjian?.ruangUjian || 'Posko PSB Utama',
            tanggal_ujian: pendaftar.nilaiUjian?.tanggalUjian
                ? new Date(pendaftar.nilaiUjian.tanggalUjian).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                  })
                : 'Sesuai Jadwal Posko',
            asal_sekolah: pendaftar.asalSekolah || pendaftar.sekolahAsal || '-',
            tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            nama_pondok: settings.namaPonpes || 'Pondok Pesantren',
            nominal: '-',
            tunggakan: '-',
            rincian_tagihan: '-',
            bulan: new Date().toLocaleString('id-ID', { month: 'long' }),
            pesan: 'Silakan isi pengumuman seleksi di sini.',
            agenda: 'Ujian Seleksi PSB',
        });
    };

    // Log message dispatch to auditLogs
    const recordDispatchAudit = async (
        recordId: number | string,
        recipientName: string,
        phone: string,
        messageText: string,
        channel: 'gateway' | 'manual',
        aud: AudienceType
    ) => {
        try {
            await logActivity(
                'INSERT',
                'whatsapp_logs',
                String(recordId),
                null,
                {
                    recipientName,
                    phone: normalizePhoneNumber(phone),
                    audience: aud,
                    templateId: selectedTemplate,
                    messagePreview: messageText.slice(0, 120),
                    channel,
                },
                currentUser?.username || 'Admin'
            );
        } catch (error) {
            console.error('Failed to log WhatsApp dispatch to auditLogs:', error);
        }
    };

    // Single send handler
    const handleSendIndividual = async (recipient: Santri | Pendaftar, isPsb: boolean) => {
        const rawPhone = isPsb ? getPsbPhone(recipient as Pendaftar) : getSantriPhone(recipient as Santri);
        const cleanPhone = normalizePhoneNumber(rawPhone);

        if (!cleanPhone) {
            showToast(`Nomor WhatsApp untuk ${recipient.namaLengkap} tidak valid atau belum diisi.`, 'error');
            return;
        }

        const message = isPsb
            ? formatMessageForPsb(recipient as Pendaftar)
            : formatMessageForSantri(recipient as Santri);

        const res = await dispatchWhatsAppMessage(cleanPhone, message, settings.waGatewayConfig);
        await recordDispatchAudit(
            recipient.id,
            recipient.namaLengkap,
            cleanPhone,
            message,
            res.channel,
            isPsb ? 'psb' : 'santri'
        );

        showToast(
            res.channel === 'gateway'
                ? `Pesan ke ${recipient.namaLengkap} terkirim via Gateway API!`
                : `WhatsApp Web terbuka untuk ${recipient.namaLengkap}.`,
            'success'
        );
    };

    // Prepare Bulk Send Queue
    const handleOpenBulkQueue = () => {
        if (!isOnline) {
            showToast('Perangkat sedang offline. Pengiriman WhatsApp memerlukan koneksi internet.', 'error');
            return;
        }

        let items: QueueRecipientItem[] = [];

        if (audience === 'santri') {
            items = selectedSantriIds
                .map((id) => santriList.find((s) => s.id === id))
                .filter((s): s is Santri => Boolean(s && normalizePhoneNumber(getSantriPhone(s))))
                .map((s) => {
                    const phone = normalizePhoneNumber(getSantriPhone(s));
                    const kelasName = settings.kelas.find((k) => k.id === s.kelasId)?.nama || '';
                    const message = formatMessageForSantri(s);
                    return {
                        id: s.id,
                        name: s.namaLengkap,
                        phone,
                        subtitle: `NIS: ${s.nis} | Kelas: ${kelasName || '-'}`,
                        formattedMessage: message,
                        audience: 'santri' as const,
                    };
                });
        } else {
            items = selectedPsbIds
                .map((id) => (livePendaftar || []).find((p) => p.id === id))
                .filter((p): p is Pendaftar => Boolean(p && normalizePhoneNumber(getPsbPhone(p))))
                .map((p) => {
                    const phone = normalizePhoneNumber(getPsbPhone(p));
                    const message = formatMessageForPsb(p);
                    return {
                        id: p.id,
                        name: p.namaLengkap,
                        phone,
                        subtitle: `No. Reg: ${p.nomorRegistrasi || `REG-${p.id}`} | Status: ${p.status}`,
                        formattedMessage: message,
                        audience: 'psb' as const,
                    };
                });
        }

        if (items.length === 0) {
            showToast('Tidak ada kontak dengan nomor WhatsApp valid di daftar terpilih.', 'info');
            return;
        }

        setQueueItems(items);
        setIsQueueModalOpen(true);
    };

    const handleQueueItemDispatched = async (item: QueueRecipientItem, channel: 'gateway' | 'manual') => {
        await recordDispatchAudit(item.id, item.name, item.phone, item.formattedMessage, channel, item.audience);
    };

    const handleQueueComplete = () => {
        if (audience === 'santri') {
            setSelectedSantriIds([]);
        } else {
            setSelectedPsbIds([]);
        }
        showToast('Seluruh proses antrean pengiriman WhatsApp telah selesai.', 'success');
    };

    // Insert variable tag at current cursor position in textarea
    const handleInsertChip = (chipTag: string) => {
        const textarea = messageTextareaRef.current;
        if (!textarea) {
            setCustomMessage((prev) => prev + ' ' + chipTag);
            return;
        }
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const current = customMessage;
        const next = current.substring(0, start) + chipTag + current.substring(end);
        setCustomMessage(next);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + chipTag.length, start + chipTag.length);
        }, 0);
    };

    // Template selection & management
    const handleSelectTemplate = (id: string) => {
        const template = templateOptions.find((item) => item.id === id);
        if (!template) return;
        setSelectedTemplate(id);
        setCustomMessage(template.content);
    };

    const persistTemplates = async (
        nextTemplates: Array<{ id: string; name: string; content: string; audience?: 'santri' | 'psb' | 'all'; lastModified?: number }>
    ) => {
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
            showToast('Nama dan isi template tidak boleh kosong.', 'error');
            return;
        }

        let next: typeof customTemplates;
        if (editingTemplateId) {
            next = customTemplates.map((t) =>
                t.id === editingTemplateId ? { ...t, name, content, audience, lastModified: Date.now() } : t
            );
            showToast('Template berhasil diperbarui.', 'success');
        } else {
            const newId = `custom_${Date.now()}`;
            next = [...customTemplates, { id: newId, name, content, audience, lastModified: Date.now() }];
            setSelectedTemplate(newId);
            setCustomMessage(content);
            showToast('Template baru berhasil ditambahkan.', 'success');
        }

        await persistTemplates(next);
        setIsTemplateModalOpen(false);
    };

    const handleDeleteTemplate = () => {
        const current = customTemplates.find((t) => t.id === selectedTemplate);
        if (!current) {
            showToast('Template bawaan sistem tidak dapat dihapus.', 'info');
            return;
        }
        showConfirmation(
            'Hapus Template?',
            `Template "${current.name}" akan dihapus permanen.`,
            async () => {
                const next = customTemplates.filter((t) => t.id !== current.id);
                await persistTemplates(next);
                const defaultId = audience === 'santri' ? 'TAGIHAN' : 'PSB_KONFIRMASI';
                setSelectedTemplate(defaultId);
                const defaultContent =
                    audience === 'santri' ? WA_TEMPLATES.TAGIHAN : WA_TEMPLATES.PSB_KONFIRMASI;
                setCustomMessage(defaultContent);
                showToast('Template berhasil dihapus.', 'success');
            },
            { confirmText: 'Hapus', confirmColor: 'red' }
        );
    };

    const handleOpenBroadcastComposer = () => {
        const message = formatWAMessage(customMessage, {
            nama_santri: audience === 'santri' ? 'Santri' : 'Calon Santri',
            ortu: 'Ayah/Bunda',
            nominal: '-',
            tunggakan: '-',
            rincian_tagihan: '-',
            bulan: new Date().toLocaleString('id-ID', { month: 'long' }),
            pesan: 'Silakan ketik pengumuman inti di sini.',
            agenda: 'Kegiatan Pondok',
            tanggal: new Date().toLocaleDateString('id-ID'),
            nama_pondok: settings.namaPonpes || 'Pondok Pesantren',
            no_reg: '-',
            jalur: '-',
            gelombang: '-',
            status_psb: '-',
            status_berkas: '-',
            ruang_ujian: '-',
            tanggal_ujian: '-',
            asal_sekolah: '-',
        });
        openWAComposer(message);
    };

    // Filtered variable chips based on audience
    const availableChips = useMemo(() => {
        return VARIABLE_CHIPS.filter((c) => c.audience === 'all' || c.audience === audience);
    }, [audience]);

    const activeGatewayConfig = settings.waGatewayConfig;
    const isGatewayActive =
        activeGatewayConfig && activeGatewayConfig.provider && activeGatewayConfig.provider !== 'manual' && Boolean(activeGatewayConfig.apiKey);

    return (
        <div id="whatsapp-center-root" className="animate-fadeIn space-y-6">
            {/* Header */}
            <PageHeader
                eyebrow="Pusat Komunikasi & Notifikasi"
                title="WhatsApp Communication Center"
                description="Kelola pengiriman pesan ke wali santri dan calon pendaftar PSB dengan template cerdas, integrasi tunggakan keuangan riil, serta pelacakan riwayat."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Gateway Settings Button */}
                        <button
                            type="button"
                            onClick={() => setIsGatewayModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                            title="Pengaturan WhatsApp Gateway"
                        >
                            <i className="bi bi-gear-wide-connected text-teal-600" />
                            <span>Saluran:</span>
                            <span className="font-bold text-teal-700">
                                {isGatewayActive ? `${activeGatewayConfig.provider.toUpperCase()} (API)` : 'Manual (wa.me)'}
                            </span>
                        </button>

                        {/* Status Online Pill */}
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-xs ${
                                isOnline
                                    ? 'border border-green-200 bg-green-50 text-green-700'
                                    : 'border border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                        >
                            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                            <i className="bi bi-whatsapp" />
                            {isOnline ? 'WA Siap' : 'Offline'}
                        </span>
                    </div>
                }
                className="mb-4"
            />

            {/* Audience Tabs: Santri Aktif vs Pendaftar PSB */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                    type="button"
                    onClick={() => handleSwitchAudience('santri')}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        audience === 'santri'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    <i className="bi bi-people-fill" />
                    <span>Santri Aktif & Tagihan</span>
                    <span
                        className={`px-2 py-0.5 text-[10px] rounded-full ${
                            audience === 'santri' ? 'bg-teal-700 text-teal-100' : 'bg-slate-200 text-slate-700'
                        }`}
                    >
                        {santriList.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => handleSwitchAudience('psb')}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        audience === 'psb'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    <i className="bi bi-person-badge-fill" />
                    <span>Pendaftar PSB Baru</span>
                    <span
                        className={`px-2 py-0.5 text-[10px] rounded-full ${
                            audience === 'psb' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
                        }`}
                    >
                        {(livePendaftar || []).length}
                    </span>
                </button>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Template & Message Editor */}
                <div className="lg:col-span-1 space-y-6">
                    <SectionCard
                        title="Template Pesan"
                        description={
                            audience === 'santri'
                                ? 'Pilih template untuk santri aktif (Tagihan SPP, Kwitansi, Absensi).'
                                : 'Pilih template khusus seleksi PSB (Konfirmasi, Ujian, Kelulusan).'
                        }
                        contentClassName="p-5 space-y-4"
                    >
                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Pilih Template</label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => handleSelectTemplate(e.target.value)}
                                className="app-select w-full p-2.5 text-xs font-semibold rounded-xl"
                            >
                                {templateOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                        {option.builtin ? ' (Bawaan)' : ''}
                                    </option>
                                ))}
                            </select>

                            <div className="mt-2.5 grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={openCreateTemplateModal}
                                    className="app-button-secondary px-2.5 py-1.5 text-xs flex items-center justify-center gap-1 rounded-lg"
                                >
                                    <i className="bi bi-plus-circle" /> Tambah
                                </button>
                                <button
                                    type="button"
                                    onClick={openEditTemplateModal}
                                    className="app-button-secondary px-2.5 py-1.5 text-xs flex items-center justify-center gap-1 rounded-lg"
                                >
                                    <i className="bi bi-pencil-square" /> Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteTemplate}
                                    className="app-button-secondary px-2.5 py-1.5 text-xs flex items-center justify-center gap-1 text-red-600 rounded-lg hover:bg-red-50"
                                >
                                    <i className="bi bi-trash" /> Hapus
                                </button>
                            </div>
                        </div>

                        {/* Interactive Variable Insertion Chips */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700">Sisipkan Variabel Otomatis</label>
                                <span className="text-[10px] text-slate-400">Klik untuk menyisipkan</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                                {availableChips.map((chip) => (
                                    <button
                                        key={chip.tag}
                                        type="button"
                                        onClick={() => handleInsertChip(chip.tag)}
                                        title={chip.description || chip.label}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-medium bg-white text-teal-800 border border-teal-200/80 hover:bg-teal-50 hover:border-teal-300 transition-colors shadow-2xs"
                                    >
                                        <span className="text-teal-500 font-bold">+</span>
                                        <span>{chip.tag}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Editor Textarea */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Isi Pesan (Editor)</label>
                            <textarea
                                ref={messageTextareaRef}
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="app-input w-full min-h-[160px] rounded-xl p-3 font-sans text-xs leading-relaxed"
                                placeholder="Ketik draf pesan Anda di sini..."
                            />
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600 leading-relaxed">
                                <i className="bi bi-info-circle text-teal-600 mr-1" />
                                Variabel dalam tanda kurung <strong>[variabel]</strong> otomatis diganti dengan data riil santri / pendaftar sebelum dikirim.
                            </div>
                        </div>
                    </SectionCard>

                    {/* Broadcast to Group Card */}
                    <SectionCard
                        title="Siaran Pesan Manual / Grup"
                        description="Buka WhatsApp Composer kosong dengan draf pesan ini untuk diteruskan ke grup kelas atau wali."
                        contentClassName="p-5 space-y-3"
                    >
                        <button
                            type="button"
                            onClick={handleOpenBroadcastComposer}
                            disabled={!isOnline}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-900 transition-colors disabled:opacity-50"
                        >
                            <i className="bi bi-megaphone-fill text-amber-400" /> Buka di WhatsApp Composer
                        </button>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            Composer akan membuka WhatsApp Web/App dengan isi draf siap kirim. Pilih grup atau kontak tujuan secara bebas di aplikasi WhatsApp.
                        </p>
                    </SectionCard>
                </div>

                {/* Right Column: Audience Contact List & Table */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard
                        title={audience === 'santri' ? 'Daftar Kontak Santri Aktif' : 'Daftar Kontak Calon Santri PSB'}
                        description={
                            audience === 'santri'
                                ? 'Pilih santri untuk pengiriman tagihan, kwitansi, atau presensi dengan status tunggakan riil.'
                                : 'Pilih calon santri pendaftar untuk informasi ujian seleksi, pengumuman hasil, atau berkas.'
                        }
                        contentClassName="p-0"
                    >
                        {/* Filter Toolbar */}
                        <div className="border-b border-slate-200 p-4 md:p-5 space-y-3 bg-slate-50/50">
                            {/* Actions Top Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    {audience === 'santri' ? (
                                        selectedSantriIds.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleOpenBulkQueue}
                                                disabled={!isOnline}
                                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50"
                                            >
                                                <i className="bi bi-send-fill" /> Kirim Ke {selectedSantriIds.length} Santri
                                            </button>
                                        )
                                    ) : (
                                        selectedPsbIds.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleOpenBulkQueue}
                                                disabled={!isOnline}
                                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50"
                                            >
                                                <i className="bi bi-send-fill" /> Kirim Ke {selectedPsbIds.length} Pendaftar
                                            </button>
                                        )
                                    )}
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => setOnlyWithPhone((prev) => !prev)}
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                            onlyWithPhone
                                                ? 'border-teal-300 bg-teal-50 text-teal-800'
                                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className="bi bi-telephone-fill text-[11px]" />
                                        <span>WA Saja</span>
                                    </button>
                                </div>
                            </div>

                            {/* Audience-Specific Filter Controls */}
                            {audience === 'santri' ? (
                                <SantriFilterBar
                                    settings={settings}
                                    filters={santriFilters}
                                    onChange={setSantriFilters}
                                    title="Filter Santri"
                                    searchPlaceholder="Cari Santri atau NIS..."
                                    resultCount={filteredSantri.length}
                                    showGender={false}
                                    className="bg-transparent border-0 shadow-none p-0"
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                                    <input
                                        type="text"
                                        value={psbFilters.search}
                                        onChange={(e) => setPsbFilters({ ...psbFilters, search: e.target.value })}
                                        placeholder="Cari Nama / No Reg..."
                                        className="app-input text-xs"
                                    />
                                    <select
                                        value={psbFilters.status}
                                        onChange={(e) => setPsbFilters({ ...psbFilters, status: e.target.value })}
                                        className="app-select text-xs"
                                    >
                                        <option value="">Semua Status PSB</option>
                                        <option value="Baru">Baru</option>
                                        <option value="Terverifikasi">Terverifikasi</option>
                                        <option value="Mengikuti Ujian">Mengikuti Ujian</option>
                                        <option value="Lulus">Lulus</option>
                                        <option value="Cadangan">Cadangan</option>
                                        <option value="Tidak Lulus">Tidak Lulus</option>
                                        <option value="Diterima">Diterima</option>
                                    </select>
                                    <select
                                        value={psbFilters.gelombang}
                                        onChange={(e) => setPsbFilters({ ...psbFilters, gelombang: e.target.value })}
                                        className="app-select text-xs"
                                    >
                                        <option value="">Semua Gelombang</option>
                                        <option value="1">Gelombang 1</option>
                                        <option value="2">Gelombang 2</option>
                                        <option value="3">Gelombang 3</option>
                                    </select>
                                    <select
                                        value={psbFilters.jalur}
                                        onChange={(e) => setPsbFilters({ ...psbFilters, jalur: e.target.value })}
                                        className="app-select text-xs"
                                    >
                                        <option value="">Semua Jalur</option>
                                        {['Reguler', 'Prestasi', 'Beasiswa', 'Tahfizh'].map((j) => (
                                            <option key={j} value={j}>
                                                {j}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={psbFilters.berkas}
                                        onChange={(e) => setPsbFilters({ ...psbFilters, berkas: e.target.value })}
                                        className="app-select text-xs"
                                    >
                                        <option value="">Status Berkas</option>
                                        <option value="Lengkap">Lengkap (5/5)</option>
                                        <option value="Belum Lengkap">Belum Lengkap</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Table / Card List */}
                        <div className="overflow-x-auto">
                            {audience === 'santri' ? (
                                <>
                                    {/* Desktop Table for Santri */}
                                    <table className="hidden md:table w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            selectedSantriIds.length === filteredSantri.length &&
                                                            filteredSantri.length > 0
                                                        }
                                                        onChange={() => {
                                                            if (selectedSantriIds.length === filteredSantri.length) {
                                                                setSelectedSantriIds([]);
                                                            } else {
                                                                setSelectedSantriIds(filteredSantri.map((s) => s.id));
                                                            }
                                                        }}
                                                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                </th>
                                                <th className="px-4 py-3">Nama Santri & NIS</th>
                                                <th className="px-4 py-3">Wali / Kontak WA</th>
                                                <th className="px-4 py-3">Status Tunggakan</th>
                                                <th className="px-4 py-3">Riwayat Terakhir</th>
                                                <th className="px-4 py-3 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredSantri.map((santri) => {
                                                const phone = getSantriPhone(santri);
                                                const cleanPhone = normalizePhoneNumber(phone);
                                                const isSelected = selectedSantriIds.includes(santri.id);
                                                const finance = getSantriFinance(santri.id);
                                                const lastContact = formatContactedBadge(lastContactedMap[String(santri.id)]);

                                                return (
                                                    <tr
                                                        key={santri.id}
                                                        className={`transition-colors hover:bg-teal-50/40 ${
                                                            isSelected ? 'bg-teal-50/60' : ''
                                                        }`}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() =>
                                                                    setSelectedSantriIds((prev) =>
                                                                        prev.includes(santri.id)
                                                                            ? prev.filter((i) => i !== santri.id)
                                                                            : [...prev, santri.id]
                                                                    )
                                                                }
                                                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-slate-800">{santri.namaLengkap}</div>
                                                            <div className="font-mono text-[10px] text-slate-400">{santri.nis}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-slate-700">{santri.namaAyah || santri.namaIbu || '-'}</div>
                                                            {cleanPhone ? (
                                                                <span className="font-mono text-[11px] font-semibold text-teal-700">
                                                                    {cleanPhone}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-red-400 italic">Tidak ada nomor</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {finance.total > 0 ? (
                                                                <div>
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                        {finance.totalFmt}
                                                                    </span>
                                                                    <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">
                                                                        {finance.unpaidCount} item tagihan
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    Lunas
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {lastContact ? (
                                                                <span
                                                                    title={lastContact.title}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                                                >
                                                                    <i className="bi bi-check2-all text-teal-600" />
                                                                    {lastContact.label}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSendIndividual(santri, false)}
                                                                disabled={!cleanPhone || !isOnline}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-30 transition-colors"
                                                                title="Kirim Pesan Individual"
                                                            >
                                                                <i className="bi bi-whatsapp text-sm" />
                                                                <span>Kirim</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Mobile Cards for Santri */}
                                    <div className="space-y-3 p-4 md:hidden">
                                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedSantriIds.length === filteredSantri.length &&
                                                    filteredSantri.length > 0
                                                }
                                                onChange={() => {
                                                    if (selectedSantriIds.length === filteredSantri.length) {
                                                        setSelectedSantriIds([]);
                                                    } else {
                                                        setSelectedSantriIds(filteredSantri.map((s) => s.id));
                                                    }
                                                }}
                                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                            />
                                            <span>Pilih semua yang tampil ({filteredSantri.length})</span>
                                        </label>

                                        {filteredSantri.map((santri) => {
                                            const phone = getSantriPhone(santri);
                                            const cleanPhone = normalizePhoneNumber(phone);
                                            const isSelected = selectedSantriIds.includes(santri.id);
                                            const finance = getSantriFinance(santri.id);

                                            return (
                                                <div
                                                    key={santri.id}
                                                    className={`rounded-xl border p-4 shadow-2xs space-y-2.5 transition-colors ${
                                                        isSelected ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm">{santri.namaLengkap}</div>
                                                            <div className="font-mono text-[10px] text-slate-400">{santri.nis}</div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() =>
                                                                setSelectedSantriIds((prev) =>
                                                                    prev.includes(santri.id)
                                                                        ? prev.filter((i) => i !== santri.id)
                                                                        : [...prev, santri.id]
                                                                )
                                                            }
                                                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 mt-1"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                                        <div>
                                                            <span className="text-slate-400 block text-[10px]">Wali:</span>
                                                            <span className="font-medium">{santri.namaAyah || santri.namaIbu || '-'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400 block text-[10px]">Tunggakan:</span>
                                                            <span className="font-bold text-amber-700">{finance.totalFmt}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                                        <span className="text-xs font-mono text-teal-700 font-semibold">
                                                            {cleanPhone || 'Tidak ada nomor'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendIndividual(santri, false)}
                                                            disabled={!cleanPhone || !isOnline}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                                                        >
                                                            <i className="bi bi-whatsapp" /> Kirim Pesan
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {filteredSantri.length === 0 && (
                                        <EmptyState
                                            icon="bi-chat-square-dots"
                                            title="Tidak ada santri ditemukan"
                                            description="Sesuaikan filter pencarian, rombel, atau status santri agar kontak muncul."
                                        />
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Desktop Table for PSB */}
                                    <table className="hidden md:table w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            selectedPsbIds.length === filteredPsb.length &&
                                                            filteredPsb.length > 0
                                                        }
                                                        onChange={() => {
                                                            if (selectedPsbIds.length === filteredPsb.length) {
                                                                setSelectedPsbIds([]);
                                                            } else {
                                                                setSelectedPsbIds(filteredPsb.map((p) => p.id));
                                                            }
                                                        }}
                                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                </th>
                                                <th className="px-4 py-3">Nama Calon & No. Reg</th>
                                                <th className="px-4 py-3">Jalur & Gelombang</th>
                                                <th className="px-4 py-3">Status Seleksi</th>
                                                <th className="px-4 py-3">Wali & WhatsApp</th>
                                                <th className="px-4 py-3">Riwayat</th>
                                                <th className="px-4 py-3 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredPsb.map((pendaftar) => {
                                                const phone = getPsbPhone(pendaftar);
                                                const cleanPhone = normalizePhoneNumber(phone);
                                                const isSelected = selectedPsbIds.includes(pendaftar.id);
                                                const lastContact = formatContactedBadge(lastContactedMap[String(pendaftar.id)]);

                                                return (
                                                    <tr
                                                        key={pendaftar.id}
                                                        className={`transition-colors hover:bg-emerald-50/40 ${
                                                            isSelected ? 'bg-emerald-50/60' : ''
                                                        }`}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() =>
                                                                    setSelectedPsbIds((prev) =>
                                                                        prev.includes(pendaftar.id)
                                                                            ? prev.filter((i) => i !== pendaftar.id)
                                                                            : [...prev, pendaftar.id]
                                                                    )
                                                                }
                                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-slate-800">{pendaftar.namaLengkap}</div>
                                                            <div className="font-mono text-[10px] text-slate-400">
                                                                {pendaftar.nomorRegistrasi || `REG-${pendaftar.id}`}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-slate-700 font-medium">
                                                                {pendaftar.jalurPendaftaran || 'Reguler'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {pendaftar.gelombang ? `Gelombang ${pendaftar.gelombang}` : 'Gelombang 1'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                                {pendaftar.status}
                                                            </span>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                                Berkas: {getBerkasSummary(pendaftar.berkasFisik)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-slate-700">
                                                                {pendaftar.namaWali || pendaftar.namaAyah || pendaftar.namaIbu || '-'}
                                                            </div>
                                                            {cleanPhone ? (
                                                                <span className="font-mono text-[11px] font-semibold text-emerald-700">
                                                                    {cleanPhone}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-red-400 italic">Tidak ada nomor</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {lastContact ? (
                                                                <span
                                                                    title={lastContact.title}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                                                >
                                                                    <i className="bi bi-check2-all text-emerald-600" />
                                                                    {lastContact.label}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSendIndividual(pendaftar, true)}
                                                                disabled={!cleanPhone || !isOnline}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-30 transition-colors"
                                                                title="Kirim Pesan PSB"
                                                            >
                                                                <i className="bi bi-whatsapp text-sm" />
                                                                <span>Kirim</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Mobile Cards for PSB */}
                                    <div className="space-y-3 p-4 md:hidden">
                                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedPsbIds.length === filteredPsb.length && filteredPsb.length > 0
                                                }
                                                onChange={() => {
                                                    if (selectedPsbIds.length === filteredPsb.length) {
                                                        setSelectedPsbIds([]);
                                                    } else {
                                                        setSelectedPsbIds(filteredPsb.map((p) => p.id));
                                                    }
                                                }}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span>Pilih semua pendaftar ({filteredPsb.length})</span>
                                        </label>

                                        {filteredPsb.map((pendaftar) => {
                                            const phone = getPsbPhone(pendaftar);
                                            const cleanPhone = normalizePhoneNumber(phone);
                                            const isSelected = selectedPsbIds.includes(pendaftar.id);

                                            return (
                                                <div
                                                    key={pendaftar.id}
                                                    className={`rounded-xl border p-4 shadow-2xs space-y-2.5 transition-colors ${
                                                        isSelected ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm">
                                                                {pendaftar.namaLengkap}
                                                            </div>
                                                            <div className="font-mono text-[10px] text-slate-400">
                                                                {pendaftar.nomorRegistrasi || `REG-${pendaftar.id}`}
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() =>
                                                                setSelectedPsbIds((prev) =>
                                                                    prev.includes(pendaftar.id)
                                                                        ? prev.filter((i) => i !== pendaftar.id)
                                                                        : [...prev, pendaftar.id]
                                                                )
                                                            }
                                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-1"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                                        <div>
                                                            <span className="text-slate-400 block text-[10px]">Status PSB:</span>
                                                            <span className="font-bold text-emerald-800">{pendaftar.status}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400 block text-[10px]">Jalur / Gel:</span>
                                                            <span className="font-medium">
                                                                {pendaftar.jalurPendaftaran || 'Reguler'} (Gel {pendaftar.gelombang || 1})
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                                        <span className="text-xs font-mono text-emerald-700 font-semibold">
                                                            {cleanPhone || 'Tidak ada nomor'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendIndividual(pendaftar, true)}
                                                            disabled={!cleanPhone || !isOnline}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                                                        >
                                                            <i className="bi bi-whatsapp" /> Kirim Pesan
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {filteredPsb.length === 0 && (
                                        <EmptyState
                                            icon="bi-person-badge"
                                            title="Tidak ada data pendaftar PSB"
                                            description="Belum ada calon santri yang cocok dengan filter pencarian ini."
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </SectionCard>

                    {/* Safety Tips and Best Practice Notice */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/80 p-4">
                            <div className="shrink-0 rounded-lg bg-blue-100 p-2 text-blue-700">
                                <i className="bi bi-shield-check text-lg" />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900 text-xs">Keamanan Saluran WhatsApp</h4>
                                <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                                    Metode default <strong>Manual wa.me</strong> membuka aplikasi WhatsApp admin secara organik sehingga sepenuhnya aman dari deteksi spam/blokir.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/80 p-4">
                            <div className="shrink-0 rounded-lg bg-teal-100 p-2 text-teal-700">
                                <i className="bi bi-lightning-charge text-lg" />
                            </div>
                            <div>
                                <h4 className="font-bold text-teal-900 text-xs">Otomatisasi Antrean</h4>
                                <p className="text-[11px] text-teal-700 mt-1 leading-relaxed">
                                    Gunakan tombol <strong>Kirim Ke Santri/Pendaftar</strong> untuk memproses daftar panjang secara teratur satu per satu dengan konfirmasi pratinjau data.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Template Modal */}
            {isTemplateModalOpen && (
                <div
                    id="template-modal-overlay"
                    className="app-overlay fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
                    onClick={() => setIsTemplateModalOpen(false)}
                >
                    <div
                        id="template-modal-content"
                        className="app-modal w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-bold text-slate-800">
                            {editingTemplateId ? 'Edit Template Pesan' : 'Tambah Template Pesan Baru'}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama Template</label>
                                <input
                                    className="app-input w-full text-xs"
                                    value={templateNameInput}
                                    onChange={(e) => setTemplateNameInput(e.target.value)}
                                    placeholder="Contoh: Pengingat Ujian Tahfizh Semester"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1 block">Target Kategori</label>
                                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                    Template ini akan disimpan untuk kategori:{' '}
                                    <strong className="text-teal-700">
                                        {audience === 'santri' ? 'Santri Aktif' : 'Pendaftar PSB'}
                                    </strong>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 mb-1 block">Isi Pesan Template</label>
                                <textarea
                                    className="app-input w-full min-h-[160px] text-xs font-sans leading-relaxed"
                                    value={templateContentInput}
                                    onChange={(e) => setTemplateContentInput(e.target.value)}
                                    placeholder="Ketik teks template dengan placeholder seperti [nama_santri], [nominal], dll."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsTemplateModalOpen(false)}
                                className="app-button-secondary px-4 py-2 text-xs"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveTemplate}
                                className="app-button-primary px-5 py-2 text-xs font-bold"
                            >
                                {editingTemplateId ? 'Simpan Perubahan' : 'Tambah Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Send Dispatch Queue Wizard Modal */}
            <DispatchQueueModal
                isOpen={isQueueModalOpen}
                onClose={() => setIsQueueModalOpen(false)}
                items={queueItems}
                gatewayConfig={settings.waGatewayConfig}
                onItemDispatched={handleQueueItemDispatched}
                onComplete={handleQueueComplete}
            />

            {/* WhatsApp Gateway Config Modal */}
            <WaGatewayModal
                isOpen={isGatewayModalOpen}
                onClose={() => setIsGatewayModalOpen(false)}
                settings={settings}
                onSaveSettings={onSaveSettings}
                showToast={showToast}
            />
        </div>
    );
};
