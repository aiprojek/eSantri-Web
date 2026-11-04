import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppContext } from '../AppContext';
import { useSantriContext } from '../contexts/SantriContext';
import { db } from '../db';
import {
    ArsipSurat,
    Santri,
    SertifikatArchiveSnapshot,
    SertifikatIdentityItem,
    SertifikatKategori,
    SertifikatSignatoryConfig,
    SertifikatStampMode,
    SertifikatTemplate,
    SertifikatTheme,
    SuratSignatory,
} from '../types';
import { PageHeader } from './common/PageHeader';
import { HeaderTabs } from './common/HeaderTabs';
import { SectionCard } from './common/SectionCard';
import { EmptyState } from './common/EmptyState';
import { SertifikatCanvas } from './sertifikat/SertifikatCanvas';
import { SuratSantriSelectorModal } from './surat/SuratSantriSelectorModal';
import { SuratWhatsAppModal } from './surat/SuratWhatsAppModal';
import { BukuAgendaPrintModal } from './surat/BukuAgendaPrintModal';
import {
    DEFAULT_SERTIFIKAT_PRESETS,
    LOMBA_CAPAIAN_CHIPS,
    MUTUN_CAPAIAN_CHIPS,
    PREDIKAT_CHIPS,
    SERTIFIKAT_THEMES,
    STAMP_LABEL_PRESETS,
    TAHFIZH_MANDIRI_CHIPS,
} from '../data/sertifikatPresets';
import { generateNextNomorSurat } from '../data/suratPresets';
import { generateCertificateDraft } from '../services/aiService';
import {
    findJenjangStempelAsset,
    findStrictTeacherTtdAsset,
    getActiveTenagaPengajar,
    getTeacherPrimaryRoleLabel,
    reconcileDigitalAssetsWithSettings,
} from '../utils/digitalAssetUtils';
import { DateFormatMode, formatTanggalDokumen } from '../utils/formatters';
import { generatePdf, printToPdfNative } from '../utils/pdfGenerator';
import { loadXLSX } from '../utils/lazyClientLibs';

interface ManualRecipientItem {
    id: string;
    nama: string;
    identitasLabel1: string;
    identitasValue1: string;
    identitasLabel2: string;
    identitasValue2: string;
    noHp?: string;
    capaianCustom?: string;
    predikatCustom?: string;
}

interface SantriRecipientOverride {
    capaianCustom?: string;
    predikatCustom?: string;
}

const escapeHtml = (unsafe: string): string =>
    (unsafe || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const buildArchiveHtmlSummary = (snap: SertifikatArchiveSnapshot): string => {
    const idRows = snap.identitasItems
        .filter((i) => i.value && i.value.trim() !== '-')
        .map(
            (i) =>
                `<tr><td style="width:180px;padding:3px 0;color:#475569;">${escapeHtml(i.label || 'Identitas')}</td><td style="width:16px;">:</td><td><b>${escapeHtml(i.value)}</b></td></tr>`
        )
        .join('');

    return `
<div style="font-family:sans-serif;line-height:1.6;">
  <p>${escapeHtml(snap.kalimatPengantar)}</p>
  <table style="width:100%;margin:10px 0;border-collapse:collapse;font-size:11pt;">
    <tbody>
      <tr><td style="width:180px;padding:3px 0;color:#475569;">Nama Penerima</td><td style="width:16px;">:</td><td><b>${escapeHtml(snap.namaPenerima)}</b></td></tr>
      ${idRows}
      <tr><td style="padding:3px 0;color:#475569;">Nomor Dokumen</td><td>:</td><td>${escapeHtml(snap.nomorSertifikat)}</td></tr>
      <tr><td style="padding:3px 0;color:#475569;">Capaian / Peruntukan</td><td>:</td><td><b>${escapeHtml(snap.capaianUtama)}</b></td></tr>
      ${
          snap.showPredikat && snap.predikatValue
              ? `<tr><td style="padding:3px 0;color:#475569;">${escapeHtml(snap.predikatLabel)}</td><td>:</td><td>${escapeHtml(snap.predikatValue)}</td></tr>`
              : ''
      }
    </tbody>
  </table>
  <p>${escapeHtml(snap.deskripsiCapaian)} <b>${escapeHtml(snap.capaianUtama)}</b>.</p>
  ${snap.catatanDoa ? `<p><i>"${escapeHtml(snap.catatanDoa)}"</i></p>` : ''}
</div>`.trim();
};

const SertifikatPiagam: React.FC = () => {
    const {
        settings,
        onUpdateSettings,
        arsipSuratList,
        onSaveArsipSurat,
        onDeleteArsipSurat,
        currentUser,
        showToast,
        showConfirmation,
    } = useAppContext();
    const { santriList } = useSantriContext();
    const digitalAssets = useLiveQuery(() => db.digitalAssets.toArray(), []) || [];

    useEffect(() => {
        reconcileDigitalAssetsWithSettings(settings).catch(() => {});
    }, [settings]);

    const canWrite = Boolean(
        !settings.multiUserMode ||
            currentUser?.role === 'admin' ||
            currentUser?.permissions?.sertifikat === 'write'
    );

    const [activeTab, setActiveTab] = useState<'buat' | 'templates' | 'arsip'>('buat');
    const [mobileWorkspaceView, setMobileWorkspaceView] = useState<'form' | 'preview'>('form');

    const activeTeachers = useMemo(() => getActiveTenagaPengajar(settings), [settings]);
    const ttdAssets = useMemo(() => digitalAssets.filter((a) => a.type === 'ttd'), [digitalAssets]);
    const stampAssets = useMemo(() => digitalAssets.filter((a) => a.type === 'stempel'), [digitalAssets]);

    const customTemplates = useMemo(
        () => settings.sertifikatTemplates || [],
        [settings.sertifikatTemplates]
    );

    const arsipSertifikatList = useMemo(
        () =>
            arsipSuratList
                .filter((a) => a.jenisDokumen === 'sertifikat' || Boolean(a.sertifikatSnapshot))
                .sort((a, b) => new Date(b.tanggalBuat).getTime() - new Date(a.tanggalBuat).getTime()),
        [arsipSuratList]
    );

    // =========================================================================
    // BUILDER STATE (Initialized from Preset 1: Syahadah Hafalan Mutun Ilmiyah)
    // =========================================================================
    const initialPreset = DEFAULT_SERTIFIKAT_PRESETS[0];

    const [activePresetOrTemplateId, setActivePresetOrTemplateId] = useState<string>(initialPreset.id);
    const [kategori, setKategori] = useState<SertifikatKategori>(initialPreset.kategori);
    const [kodeNomor, setKodeNomor] = useState<string>(initialPreset.kodeNomor);
    const [tema, setTema] = useState<SertifikatTheme>(initialPreset.tema);
    const [showBismillah, setShowBismillah] = useState<boolean>(initialPreset.showBismillah);
    const [showWatermarkLogo, setShowWatermarkLogo] = useState<boolean>(initialPreset.showWatermarkLogo);

    const [judulDokumen, setJudulDokumen] = useState<string>(initialPreset.judulDokumen);
    const [kalimatPengantar, setKalimatPengantar] = useState<string>(initialPreset.kalimatPengantar);
    const [deskripsiCapaian, setDeskripsiCapaian] = useState<string>(initialPreset.deskripsiCapaian);
    const [capaianUtama, setCapaianUtama] = useState<string>(initialPreset.capaianUtamaDefault);
    const [showPredikat, setShowPredikat] = useState<boolean>(initialPreset.showPredikat);
    const [predikatLabel, setPredikatLabel] = useState<string>(initialPreset.predikatLabel);
    const [predikatValue, setPredikatValue] = useState<string>(initialPreset.predikatDefault);
    const [catatanDoa, setCatatanDoa] = useState<string>(initialPreset.catatanDoaDefault);
    const [footerText, setFooterText] = useState<string>('');

    // Numbering & Titimangsa
    const [isManualNomor, setIsManualNomor] = useState<boolean>(false);
    const [manualNomorInput, setManualNomorInput] = useState<string>('');
    const [tanggalDokumen, setTanggalDokumen] = useState<string>(
        settings.tanggalSyahadahDefault || new Date().toISOString().split('T')[0]
    );
    const [tempatPenetapan, setTempatPenetapan] = useState<string>(
        settings.tempatSyahadahDefault ||
            settings.kabupatenKota ||
            (settings.alamat?.includes(',') ? settings.alamat.split(',')[1].trim() : 'Pesantren')
    );
    const [formatTanggalMode, setFormatTanggalMode] = useState<DateFormatMode>(
        settings.formatTanggalSyahadahDefault || 'masehi'
    );
    const [manualHijriStr, setManualHijriStr] = useState<string>(settings.manualHijriSyahadahDefault || '');

    // Signatories & Stamp
    const [signatoryCount, setSignatoryCount] = useState<1 | 2>(initialPreset.signatoryCount);
    const [leftSignatory, setLeftSignatory] = useState<SertifikatSignatoryConfig>(initialPreset.leftSignatory);
    const [rightSignatory, setRightSignatory] = useState<SertifikatSignatoryConfig>(initialPreset.rightSignatory);
    const [stampMode, setStampMode] = useState<SertifikatStampMode>(initialPreset.stampMode);
    const [stampBottomText, setStampBottomText] = useState<string>(initialPreset.stampBottomText);
    const [customStampAssetId, setCustomStampAssetId] = useState<string>('');

    // Recipient Modes: 'single' | 'bulk' | 'manual'
    const [recipientMode, setRecipientMode] = useState<'single' | 'bulk' | 'manual'>('single');
    const [selectedSantriId, setSelectedSantriId] = useState<number | ''>(() => {
        const firstActive = santriList.find((s) => s.status === 'Aktif');
        return firstActive ? firstActive.id : '';
    });
    const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
    const [santriOverrides, setSantriOverrides] = useState<Record<number, SantriRecipientOverride>>({});
    const [showBulkOverrideTable, setShowBulkOverrideTable] = useState<boolean>(false);
    const [isSantriSelectorOpen, setIsSantriSelectorOpen] = useState<boolean>(false);

    const [manualRecipients, setManualRecipients] = useState<ManualRecipientItem[]>([
        {
            id: 'manual-1',
            nama: 'Ust. Ahmad Fauzan, Lc.',
            identitasLabel1: 'Peran / Jabatan',
            identitasValue1: 'Penguji Tamu & Pemateri',
            identitasLabel2: 'Instansi',
            identitasValue2: settings.namaPonpes || 'Pondok Pesantren',
            noHp: '',
        },
    ]);

    // Auto-select first active santri once santriList loads
    useEffect(() => {
        if (selectedSantriId === '' && santriList.length > 0) {
            const firstActive = santriList.find((s) => s.status === 'Aktif') || santriList[0];
            if (firstActive) setSelectedSantriId(firstActive.id);
        }
    }, [santriList, selectedSantriId]);

    // Preview & Batch Print State
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const previewViewportRef = useRef<HTMLDivElement | null>(null);
    const [zoomMode, setZoomMode] = useState<'auto' | '50' | '75' | '100'>('auto');
    const [viewportWidth, setViewportWidth] = useState<number>(760);
    const [autoArchiveOnPrint, setAutoArchiveOnPrint] = useState<boolean>(true);
    const [isProcessingPrint, setIsProcessingPrint] = useState<boolean>(false);

    // Modals: AI Redaksi, Save Template, Arsip Preview, Buku Agenda, WhatsApp
    const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
    const [aiKegiatanInput, setAiKegiatanInput] = useState<string>('');
    const [aiTone, setAiTone] = useState<'islami' | 'akademik' | 'apresiasi'>('islami');
    const [aiExtraInstruction, setAiExtraInstruction] = useState<string>('');
    const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

    const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState<boolean>(false);
    const [templateNameInput, setTemplateNameInput] = useState<string>('');
    const [editingCustomTemplateId, setEditingCustomTemplateId] = useState<string | null>(null);

    const [viewingArsipCert, setViewingArsipCert] = useState<ArsipSurat | null>(null);
    const [waTargetArsip, setWaTargetArsip] = useState<ArsipSurat | null>(null);
    const [isAgendaModalOpen, setIsAgendaModalOpen] = useState<boolean>(false);
    const [agendaScope, setAgendaScope] = useState<'sertifikat_only' | 'all_surat'>('sertifikat_only');

    // Arsip Filter State
    const [searchArsip, setSearchArsip] = useState<string>('');
    const [filterKategoriArsip, setFilterKategoriArsip] = useState<string>('');
    const [filterStartArsip, setFilterStartArsip] = useState<string>('');
    const [filterEndArsip, setFilterEndArsip] = useState<string>('');

    // ResizeObserver for responsive landscape preview scaling
    useEffect(() => {
        const el = previewViewportRef.current;
        if (!el) return;
        const updateWidth = () => {
            if (el.clientWidth > 0) setViewportWidth(el.clientWidth);
        };
        updateWidth();
        const ro = new ResizeObserver(updateWidth);
        ro.observe(el);
        return () => ro.disconnect();
    }, [activeTab, mobileWorkspaceView]);

    // 29.7cm in 96dpi is ~1122.5px, 20.95cm is ~791.8px
    const SHEET_WIDTH_PX = 1123;
    const SHEET_HEIGHT_PX = 792;
    const previewScale = useMemo(() => {
        if (zoomMode === '100') return 1;
        if (zoomMode === '75') return 0.75;
        if (zoomMode === '50') return 0.5;
        const available = Math.max(280, viewportWidth - 36);
        return Math.min(1, Math.max(0.26, available / SHEET_WIDTH_PX));
    }, [zoomMode, viewportWidth]);

    // =========================================================================
    // TEMPLATE APPLY LOGIC
    // =========================================================================
    const applyTemplate = (tpl: SertifikatTemplate) => {
        setActivePresetOrTemplateId(tpl.id);
        setKategori(tpl.kategori);
        setKodeNomor(tpl.kodeNomor);
        setTema(tpl.tema);
        setShowBismillah(tpl.showBismillah);
        setShowWatermarkLogo(tpl.showWatermarkLogo);
        setJudulDokumen(tpl.judulDokumen);
        setKalimatPengantar(tpl.kalimatPengantar);
        setDeskripsiCapaian(tpl.deskripsiCapaian);
        setCapaianUtama(tpl.capaianUtamaDefault);
        setShowPredikat(tpl.showPredikat);
        setPredikatLabel(tpl.predikatLabel);
        setPredikatValue(tpl.predikatDefault);
        setCatatanDoa(tpl.catatanDoaDefault);
        setSignatoryCount(tpl.signatoryCount);
        setLeftSignatory({ ...tpl.leftSignatory });
        setRightSignatory({ ...tpl.rightSignatory });
        setStampMode(tpl.stampMode);
        setStampBottomText(tpl.stampBottomText);
        setCustomStampAssetId(tpl.customStampAssetId || '');
        setFooterText(tpl.footerText || '');
        if (tpl.defaultRecipientMode) {
            setRecipientMode(tpl.defaultRecipientMode);
        }
        setIsManualNomor(false);
        setPreviewIndex(0);
    };

    // =========================================================================
    // AUTO-NUMBERING BASE COUNT IN SELECTED MONTH & YEAR
    // =========================================================================
    const existingAgendaCountInMonth = useMemo(() => {
        const refDate = tanggalDokumen ? new Date(tanggalDokumen) : new Date();
        const y = refDate.getFullYear();
        const m = refDate.getMonth();
        return arsipSuratList.filter((item) => {
            const d = new Date(item.tanggalBuat);
            return d.getFullYear() === y && d.getMonth() === m;
        }).length;
    }, [arsipSuratList, tanggalDokumen]);

    const tanggalFormatted = useMemo(
        () =>
            formatTanggalDokumen(tanggalDokumen, {
                formatMode: formatTanggalMode,
                hijriAdjustment: settings.hijriAdjustment || 0,
                manualHijri: manualHijriStr,
            }),
        [tanggalDokumen, formatTanggalMode, settings.hijriAdjustment, manualHijriStr]
    );

    // =========================================================================
    // RESOLVE SIGNATORIES PER RECIPIENT
    // =========================================================================
    const resolveSignatory = (
        sig: SertifikatSignatoryConfig,
        santri?: Santri | null
    ): SertifikatSignatoryConfig => {
        const jenjang = santri ? settings.jenjang?.find((j) => j.id === santri.jenjangId) : undefined;

        if (sig.sourceType === 'mudir') {
            const mudirTeacher =
                (settings.mudirAamId
                    ? settings.tenagaPengajar?.find((t) => Number(t.id) === Number(settings.mudirAamId))
                    : undefined) ||
                (jenjang?.mudirId
                    ? settings.tenagaPengajar?.find((t) => Number(t.id) === Number(jenjang.mudirId))
                    : undefined) ||
                settings.tenagaPengajar?.find((t) =>
                    t.riwayatJabatan?.some(
                        (r) =>
                            !r.tanggalSelesai &&
                            (r.jabatan.toLowerCase().includes('mudir') ||
                                r.jabatan.toLowerCase().includes('pengasuh') ||
                                r.jabatan.toLowerCase().includes('pimpinan'))
                    )
                );

            const resolvedNama =
                mudirTeacher?.nama || settings.namaMudir || sig.nama || 'Pimpinan Pondok Pesantren';
            const ttdAsset = mudirTeacher
                ? findStrictTeacherTtdAsset(ttdAssets, mudirTeacher)
                : findStrictTeacherTtdAsset(ttdAssets, { nama: resolvedNama });

            return {
                ...sig,
                nama: resolvedNama,
                nip: mudirTeacher?.nip || sig.nip || '',
                signatureUrl: sig.useDigitalTtd ? ttdAsset?.base64Image || sig.signatureUrl : undefined,
            };
        }

        if (sig.sourceType === 'halaqah') {
            const halaqah = santri
                ? settings.kelompokHalaqah?.find(
                      (h) => h.id === santri.halaqahId || h.santriIds?.includes(santri.id)
                  )
                : undefined;
            const muhaffizh = halaqah?.muhaffizhId
                ? settings.tenagaPengajar?.find((t) => Number(t.id) === Number(halaqah.muhaffizhId))
                : sig.teacherId
                  ? settings.tenagaPengajar?.find((t) => Number(t.id) === Number(sig.teacherId))
                  : activeTeachers[0];

            const resolvedNama = muhaffizh?.nama || sig.nama || 'Muhaffizh / Penguji';
            const ttdAsset = muhaffizh
                ? findStrictTeacherTtdAsset(ttdAssets, muhaffizh)
                : findStrictTeacherTtdAsset(ttdAssets, { nama: resolvedNama });

            return {
                ...sig,
                nama: resolvedNama,
                nip: muhaffizh?.nip || sig.nip || '',
                signatureUrl: sig.useDigitalTtd ? ttdAsset?.base64Image || sig.signatureUrl : undefined,
            };
        }

        if (sig.sourceType === 'wali_kelas') {
            const rombel = santri ? settings.rombel?.find((r) => r.id === santri.rombelId) : undefined;
            const wali = rombel?.waliKelasId
                ? settings.tenagaPengajar?.find((t) => Number(t.id) === Number(rombel.waliKelasId))
                : sig.teacherId
                  ? settings.tenagaPengajar?.find((t) => Number(t.id) === Number(sig.teacherId))
                  : activeTeachers[0];

            const resolvedNama = wali?.nama || sig.nama || 'Wali Kelas';
            const ttdAsset = wali
                ? findStrictTeacherTtdAsset(ttdAssets, wali)
                : findStrictTeacherTtdAsset(ttdAssets, { nama: resolvedNama });

            return {
                ...sig,
                nama: resolvedNama,
                nip: wali?.nip || sig.nip || '',
                signatureUrl: sig.useDigitalTtd ? ttdAsset?.base64Image || sig.signatureUrl : undefined,
            };
        }

        if (sig.sourceType === 'guru') {
            const teacher = sig.teacherId
                ? settings.tenagaPengajar?.find((t) => Number(t.id) === Number(sig.teacherId))
                : activeTeachers[0];
            const resolvedNama = teacher?.nama || sig.nama || 'Ustadz Pembimbing';
            const ttdAsset = teacher
                ? findStrictTeacherTtdAsset(ttdAssets, teacher)
                : findStrictTeacherTtdAsset(ttdAssets, { nama: resolvedNama });

            return {
                ...sig,
                nama: resolvedNama,
                nip: teacher?.nip || sig.nip || '',
                signatureUrl: sig.useDigitalTtd ? ttdAsset?.base64Image || sig.signatureUrl : undefined,
            };
        }

        // 'manual'
        const manualTtd = sig.signatureUrl
            ? sig.signatureUrl
            : findStrictTeacherTtdAsset(ttdAssets, { nama: sig.nama })?.base64Image;
        return {
            ...sig,
            signatureUrl: sig.useDigitalTtd ? manualTtd : undefined,
        };
    };

    // =========================================================================
    // BUILD SNAPSHOTS FOR ALL ACTIVE RECIPIENTS
    // =========================================================================
    interface ResolvedCertificateJobItem {
        key: string;
        santri?: Santri;
        tujuanAgenda: string;
        noHp?: string;
        snapshot: SertifikatArchiveSnapshot;
    }

    const certificateJobs: ResolvedCertificateJobItem[] = useMemo(() => {
        const resolveStampUrlForSantri = (santri?: Santri | null): string | undefined => {
            if (stampMode === 'none' || stampMode === 'seal') return undefined;
            if (stampMode === 'image') {
                if (customStampAssetId) {
                    const found = stampAssets.find((a) => a.id === customStampAssetId);
                    if (found) return found.base64Image;
                }
                return settings.stempelPonpesUrl;
            }
            // auto
            if (santri) {
                const jenjang = settings.jenjang?.find((j) => j.id === santri.jenjangId);
                const jenjangStamp = findJenjangStempelAsset(digitalAssets, jenjang);
                if (jenjangStamp) return jenjangStamp.base64Image;
            }
            return settings.stempelPonpesUrl;
        };

        if (recipientMode === 'manual') {
            const validManuals =
                manualRecipients.length > 0
                    ? manualRecipients
                    : [
                          {
                              id: 'fallback-manual',
                              nama: 'Nama Penerima Sertifikat',
                              identitasLabel1: 'Peran',
                              identitasValue1: 'Peserta Kegiatan',
                              identitasLabel2: '',
                              identitasValue2: '',
                          },
                      ];

            return validManuals.map((m, idx) => {
                const autoNomor = generateNextNomorSurat(
                    kodeNomor || 'SRT',
                    settings.namaPonpes || 'Pesantren',
                    existingAgendaCountInMonth + idx,
                    tanggalDokumen
                );
                const nomorFinal =
                    isManualNomor && validManuals.length === 1 && manualNomorInput.trim()
                        ? manualNomorInput.trim()
                        : autoNomor;

                const identitasItems: SertifikatIdentityItem[] = [];
                if (m.identitasValue1.trim()) {
                    identitasItems.push({
                        label: m.identitasLabel1.trim() || undefined,
                        value: m.identitasValue1.trim(),
                    });
                }
                if (m.identitasValue2.trim()) {
                    identitasItems.push({
                        label: m.identitasLabel2.trim() || undefined,
                        value: m.identitasValue2.trim(),
                    });
                }

                const resolvedLeft = resolveSignatory(leftSignatory, null);
                const resolvedRight = resolveSignatory(rightSignatory, null);
                const effectiveCapaian = m.capaianCustom?.trim() || capaianUtama;
                const effectivePredikat = m.predikatCustom?.trim() || predikatValue;

                return {
                    key: m.id,
                    tujuanAgenda: m.identitasValue1?.trim()
                        ? `${m.nama || 'Penerima'} (${m.identitasValue1.trim()})`
                        : m.nama || 'Penerima Umum',
                    noHp: m.noHp,
                    snapshot: {
                        tema,
                        showBismillah,
                        showWatermarkLogo,
                        judulDokumen,
                        nomorSertifikat: nomorFinal,
                        kalimatPengantar,
                        namaPenerima: m.nama || 'Nama Penerima',
                        identitasItems,
                        deskripsiCapaian,
                        capaianUtama: effectiveCapaian,
                        showPredikat,
                        predikatLabel,
                        predikatValue: effectivePredikat,
                        catatanDoa: catatanDoa.trim() || undefined,
                        tempatPenetapan,
                        tanggalRaw: tanggalDokumen,
                        tanggalFormatted,
                        signatoryCount,
                        leftSignatory: signatoryCount === 2 ? resolvedLeft : undefined,
                        rightSignatory: resolvedRight,
                        stampMode,
                        stampUrl: resolveStampUrlForSantri(null),
                        stampBottomText,
                        footerText: footerText.trim() || undefined,
                        kategori,
                        kodeNomor,
                    },
                };
            });
        }

        // Single or Bulk Santri Mode
        const targetSantris: Santri[] =
            recipientMode === 'single'
                ? santriList.filter((s) => s.id === selectedSantriId)
                : bulkSelectedIds
                      .map((id) => santriList.find((s) => s.id === id))
                      .filter((s): s is Santri => Boolean(s));

        if (targetSantris.length === 0) {
            const autoNomor = generateNextNomorSurat(
                kodeNomor || 'SRT',
                settings.namaPonpes || 'Pesantren',
                existingAgendaCountInMonth,
                tanggalDokumen
            );
            return [
                {
                    key: 'placeholder-santri',
                    tujuanAgenda: 'Contoh Santri',
                    snapshot: {
                        tema,
                        showBismillah,
                        showWatermarkLogo,
                        judulDokumen,
                        nomorSertifikat:
                            isManualNomor && manualNomorInput.trim() ? manualNomorInput.trim() : autoNomor,
                        kalimatPengantar,
                        namaPenerima: 'Pilih Penerima Santri',
                        identitasItems: [
                            { label: 'NIS', value: '2026001' },
                            { label: 'Jenjang', value: settings.jenjang?.[0]?.nama || 'Madrasah' },
                            { label: 'Kelas/Rombel', value: settings.rombel?.[0]?.nama || 'VII-A' },
                        ],
                        deskripsiCapaian,
                        capaianUtama,
                        showPredikat,
                        predikatLabel,
                        predikatValue,
                        catatanDoa: catatanDoa.trim() || undefined,
                        tempatPenetapan,
                        tanggalRaw: tanggalDokumen,
                        tanggalFormatted,
                        signatoryCount,
                        leftSignatory: signatoryCount === 2 ? resolveSignatory(leftSignatory, null) : undefined,
                        rightSignatory: resolveSignatory(rightSignatory, null),
                        stampMode,
                        stampUrl: resolveStampUrlForSantri(null),
                        stampBottomText,
                        footerText: footerText.trim() || undefined,
                        kategori,
                        kodeNomor,
                    },
                },
            ];
        }

        return targetSantris.map((santri, idx) => {
            const autoNomor = generateNextNomorSurat(
                kodeNomor || 'SRT',
                settings.namaPonpes || 'Pesantren',
                existingAgendaCountInMonth + idx,
                tanggalDokumen
            );
            const nomorFinal =
                isManualNomor && targetSantris.length === 1 && manualNomorInput.trim()
                    ? manualNomorInput.trim()
                    : autoNomor;

            const jenjangName = settings.jenjang?.find((j) => j.id === santri.jenjangId)?.nama || '';
            const kelasName = settings.kelas?.find((k) => k.id === santri.kelasId)?.nama || '';
            const rombelName = settings.rombel?.find((r) => r.id === santri.rombelId)?.nama || '';
            const kelasRombelDisplay =
                rombelName && kelasName && !rombelName.toLowerCase().includes(kelasName.toLowerCase())
                    ? `${kelasName} - ${rombelName}`
                    : rombelName || kelasName || '-';

            const identitasItems: SertifikatIdentityItem[] = [
                { label: 'NIS', value: santri.nis || String(santri.id) },
            ];
            if (jenjangName) identitasItems.push({ label: 'Jenjang', value: jenjangName });
            if (kelasRombelDisplay && kelasRombelDisplay !== '-') {
                identitasItems.push({ label: 'Kelas/Rombel', value: kelasRombelDisplay });
            }

            const override = santriOverrides[santri.id];
            const effectiveCapaian = override?.capaianCustom?.trim() || capaianUtama;
            const effectivePredikat = override?.predikatCustom?.trim() || predikatValue;

            const resolvedLeft = resolveSignatory(leftSignatory, santri);
            const resolvedRight = resolveSignatory(rightSignatory, santri);

            return {
                key: `santri-${santri.id}`,
                santri,
                tujuanAgenda: `${santri.namaLengkap} (NIS: ${santri.nis || santri.id})`,
                noHp: santri.teleponWali || santri.teleponAyah || santri.teleponIbu || santri.telepon,
                snapshot: {
                    tema,
                    showBismillah,
                    showWatermarkLogo,
                    judulDokumen,
                    nomorSertifikat: nomorFinal,
                    kalimatPengantar,
                    namaPenerima: santri.namaLengkap,
                    identitasItems,
                    deskripsiCapaian,
                    capaianUtama: effectiveCapaian,
                    showPredikat,
                    predikatLabel,
                    predikatValue: effectivePredikat,
                    catatanDoa: catatanDoa.trim() || undefined,
                    tempatPenetapan,
                    tanggalRaw: tanggalDokumen,
                    tanggalFormatted,
                    signatoryCount,
                    leftSignatory: signatoryCount === 2 ? resolvedLeft : undefined,
                    rightSignatory: resolvedRight,
                    stampMode,
                    stampUrl: resolveStampUrlForSantri(santri),
                    stampBottomText,
                    footerText: footerText.trim() || undefined,
                    kategori,
                    kodeNomor,
                },
            };
        });
    }, [
        recipientMode,
        manualRecipients,
        santriList,
        selectedSantriId,
        bulkSelectedIds,
        santriOverrides,
        kodeNomor,
        settings,
        existingAgendaCountInMonth,
        tanggalDokumen,
        isManualNomor,
        manualNomorInput,
        tema,
        showBismillah,
        showWatermarkLogo,
        judulDokumen,
        kalimatPengantar,
        deskripsiCapaian,
        capaianUtama,
        showPredikat,
        predikatLabel,
        predikatValue,
        catatanDoa,
        tempatPenetapan,
        tanggalFormatted,
        signatoryCount,
        leftSignatory,
        rightSignatory,
        stampMode,
        customStampAssetId,
        stampBottomText,
        footerText,
        kategori,
        digitalAssets,
        ttdAssets,
        stampAssets,
        activeTeachers,
    ]);

    const safePreviewIdx = Math.min(previewIndex, Math.max(0, certificateJobs.length - 1));
    const currentPreviewJob = certificateJobs[safePreviewIdx] || certificateJobs[0];

    const hasValidRecipientSelection = useMemo(() => {
        if (recipientMode === 'single') return selectedSantriId !== '';
        if (recipientMode === 'bulk') return bulkSelectedIds.length > 0;
        return manualRecipients.some((m) => m.nama.trim().length > 0);
    }, [recipientMode, selectedSantriId, bulkSelectedIds, manualRecipients]);

    // =========================================================================
    // ARCHIVE / BUKU AGENDA RECORDING
    // =========================================================================
    const saveJobsToArchive = async (silentToast = false): Promise<ArsipSurat[]> => {
        if (!canWrite) {
            showToast('Anda tidak memiliki izin tulis untuk menyimpan arsip.', 'error');
            return [];
        }
        if (!hasValidRecipientSelection) {
            showToast('Pilih minimal satu penerima sertifikat terlebih dahulu.', 'error');
            return [];
        }

        const savedItems: ArsipSurat[] = [];
        for (const job of certificateJobs) {
            const snap = job.snapshot;
            const sigSnapshot: SuratSignatory[] = [];
            if (snap.signatoryCount === 2 && snap.leftSignatory) {
                sigSnapshot.push({
                    id: snap.leftSignatory.id,
                    jabatan: snap.leftSignatory.labelTop.replace(/,\s*$/, ''),
                    nama: snap.leftSignatory.nama,
                    nip: snap.leftSignatory.nip,
                    signatureUrl: snap.leftSignatory.signatureUrl,
                });
            }
            sigSnapshot.push({
                id: snap.rightSignatory.id,
                jabatan: snap.rightSignatory.labelTop.replace(/,\s*$/, ''),
                nama: snap.rightSignatory.nama,
                nip: snap.rightSignatory.nip,
                signatureUrl: snap.rightSignatory.signatureUrl,
            });

            // Prevent duplicate agenda row if exact nomorSurat + tujuan already exists
            const existingMatch = arsipSuratList.find(
                (a) =>
                    a.nomorSurat.trim().toLowerCase() === snap.nomorSertifikat.trim().toLowerCase() &&
                    a.tujuan.trim().toLowerCase() === job.tujuanAgenda.trim().toLowerCase()
            );

            const perihalText = `[Sertifikat] ${snap.judulDokumen}${
                snap.capaianUtama ? ` — ${snap.capaianUtama}` : ''
            }`;

            const saved = await onSaveArsipSurat({
                id: existingMatch?.id,
                nomorSurat: snap.nomorSertifikat,
                perihal: perihalText,
                tujuan: job.tujuanAgenda,
                isiSurat: buildArchiveHtmlSummary(snap),
                tanggalBuat: tanggalDokumen || new Date().toISOString().split('T')[0],
                templateId: 0,
                jenisDokumen: 'sertifikat',
                tempatCetak: snap.tempatPenetapan,
                tanggalCetak: snap.tanggalFormatted,
                signatoriesSnapshot: sigSnapshot,
                nomorHpTujuan: job.noHp,
                santriId: job.santri?.id,
                sertifikatSnapshot: snap,
            });
            savedItems.push(saved);
        }

        if (!silentToast && savedItems.length > 0) {
            showToast(
                `${savedItems.length} sertifikat berhasil dicatat ke Arsip & Buku Agenda.`,
                'success'
            );
        }
        return savedItems;
    };

    const handlePrintCertificates = async () => {
        if (!hasValidRecipientSelection) {
            showToast('Pilih santri atau isi nama penerima terlebih dahulu sebelum mencetak.', 'error');
            return;
        }
        setIsProcessingPrint(true);
        try {
            if (autoArchiveOnPrint && canWrite) {
                await saveJobsToArchive(true);
            }
            const cleanTitle = (judulDokumen || 'Sertifikat').replace(/[^a-zA-Z0-9_-]/g, '_');
            const targetName =
                certificateJobs.length === 1
                    ? certificateJobs[0].snapshot.namaPenerima.replace(/[^a-zA-Z0-9_-]/g, '_')
                    : `${certificateJobs.length}_Penerima`;
            printToPdfNative(
                'sertifikat-batch-print-area',
                `${cleanTitle}_${targetName}`,
                { paperSize: 'A4', orientation: 'landscape' }
            );
            if (autoArchiveOnPrint && canWrite) {
                showToast(
                    `Menyiapkan cetak & mencatat ${certificateJobs.length} sertifikat ke Buku Agenda.`,
                    'success'
                );
            }
        } finally {
            setIsProcessingPrint(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!hasValidRecipientSelection) {
            showToast('Pilih santri atau isi nama penerima terlebih dahulu sebelum mengunduh PDF.', 'error');
            return;
        }
        setIsProcessingPrint(true);
        try {
            if (autoArchiveOnPrint && canWrite) {
                await saveJobsToArchive(true);
            }
            const cleanTitle = (judulDokumen || 'Sertifikat').replace(/[^a-zA-Z0-9_-]/g, '_');
            const targetName =
                certificateJobs.length === 1
                    ? certificateJobs[0].snapshot.namaPenerima.replace(/[^a-zA-Z0-9_-]/g, '_')
                    : `${certificateJobs.length}_Penerima`;
            await generatePdf('sertifikat-batch-print-area', {
                paperSize: 'A4',
                fileName: `${cleanTitle}_${targetName}.pdf`,
            });
            showToast(
                autoArchiveOnPrint && canWrite
                    ? 'PDF berhasil diunduh & tercatat di Buku Agenda.'
                    : 'PDF sertifikat berhasil diunduh.',
                'success'
            );
        } catch (err) {
            showToast('Gagal mengunduh PDF: ' + String(err), 'error');
        } finally {
            setIsProcessingPrint(false);
        }
    };

    // =========================================================================
    // AI COMPOSER HANDLER
    // =========================================================================
    const handleGenerateAiRedaksi = async () => {
        if (!aiKegiatanInput.trim()) {
            showToast('Tuliskan nama kegiatan, kitab mutun, atau lomba terlebih dahulu.', 'error');
            return;
        }
        setIsGeneratingAi(true);
        try {
            const draft = await generateCertificateDraft({
                jenisKegiatan: aiKegiatanInput.trim(),
                kategori,
                gayaBahasa: aiTone,
                namaPondok: settings.namaPonpes || 'Pondok Pesantren',
                instruksiTambahan: aiExtraInstruction.trim() || undefined,
            });
            setJudulDokumen(draft.judulDokumen);
            setKalimatPengantar(draft.kalimatPengantar);
            setDeskripsiCapaian(draft.deskripsiCapaian);
            setCapaianUtama(draft.capaianUtama);
            setPredikatLabel(draft.predikatLabel);
            if (draft.predikatContoh) setPredikatValue(draft.predikatContoh);
            setCatatanDoa(draft.catatanDoa);
            setIsAiModalOpen(false);
            showToast('Redaksi sertifikat berhasil disusun oleh AI dan diterapkan ke kanvas.', 'success');
        } catch (err) {
            showToast('Gagal menyusun redaksi AI: ' + String(err), 'error');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // =========================================================================
    // SAVE / DELETE CUSTOM TEMPLATE
    // =========================================================================
    const handleOpenSaveTemplateModal = () => {
        const existingCustom = customTemplates.find((t) => t.id === activePresetOrTemplateId);
        if (existingCustom) {
            setEditingCustomTemplateId(existingCustom.id);
            setTemplateNameInput(existingCustom.nama);
        } else {
            setEditingCustomTemplateId(null);
            setTemplateNameInput(`${judulDokumen.slice(0, 32)} (${kategori})`);
        }
        setIsSaveTemplateModalOpen(true);
    };

    const handleSaveCustomTemplate = async (saveAsNew = false) => {
        if (!canWrite) {
            showToast('Anda tidak memiliki akses menyimpan template.', 'error');
            return;
        }
        if (!templateNameInput.trim()) {
            showToast('Nama template wajib diisi.', 'error');
            return;
        }
        const idToUse =
            !saveAsNew && editingCustomTemplateId
                ? editingCustomTemplateId
                : `sert-tpl-${Date.now()}`;

        const newTemplate: SertifikatTemplate = {
            id: idToUse,
            nama: templateNameInput.trim(),
            kategori,
            kodeNomor: kodeNomor.trim() || 'SRT',
            tema,
            showBismillah,
            showWatermarkLogo,
            judulDokumen,
            kalimatPengantar,
            deskripsiCapaian,
            capaianUtamaDefault: capaianUtama,
            showPredikat,
            predikatLabel,
            predikatDefault: predikatValue,
            catatanDoaDefault: catatanDoa,
            signatoryCount,
            leftSignatory,
            rightSignatory,
            stampMode,
            stampBottomText,
            customStampAssetId: customStampAssetId || undefined,
            footerText: footerText.trim() || undefined,
            defaultRecipientMode: recipientMode,
            lastModified: Date.now(),
        };

        const nextList = customTemplates.some((t) => t.id === idToUse)
            ? customTemplates.map((t) => (t.id === idToUse ? newTemplate : t))
            : [newTemplate, ...customTemplates];

        await onUpdateSettings({
            ...settings,
            sertifikatTemplates: nextList,
        });
        setActivePresetOrTemplateId(idToUse);
        setIsSaveTemplateModalOpen(false);
        showToast('Template sertifikat berhasil disimpan.', 'success');
    };

    const handleDeleteCustomTemplate = (tpl: SertifikatTemplate) => {
        if (!canWrite) return;
        showConfirmation(
            `Hapus Template "${tpl.nama}"?`,
            'Template sertifikat kustom ini akan dihapus dari daftar template tersimpan.',
            async () => {
                const nextList = customTemplates.filter((t) => t.id !== tpl.id);
                await onUpdateSettings({
                    ...settings,
                    sertifikatTemplates: nextList,
                });
                if (activePresetOrTemplateId === tpl.id) {
                    applyTemplate(DEFAULT_SERTIFIKAT_PRESETS[0]);
                }
                showToast('Template berhasil dihapus.', 'success');
            },
            { confirmColor: 'red', confirmText: 'Hapus' }
        );
    };

    const handleSaveDefaultTitimangsa = async () => {
        if (!canWrite) return;
        await onUpdateSettings({
            ...settings,
            tanggalSyahadahDefault: tanggalDokumen,
            tempatSyahadahDefault: tempatPenetapan.trim(),
            formatTanggalSyahadahDefault: formatTanggalMode,
            manualHijriSyahadahDefault: manualHijriStr.trim(),
        });
        showToast('Tempat & format tanggal disimpan sebagai bawaan Syahadah/Sertifikat.', 'success');
    };

    // =========================================================================
    // FILTERED ARCHIVE LIST & EXCEL EXPORT
    // =========================================================================
    const filteredArsipSertifikat = useMemo(() => {
        return arsipSertifikatList.filter((item) => {
            if (searchArsip.trim()) {
                const q = searchArsip.toLowerCase();
                const inNomor = item.nomorSurat?.toLowerCase().includes(q);
                const inTujuan = item.tujuan?.toLowerCase().includes(q);
                const inPerihal = item.perihal?.toLowerCase().includes(q);
                if (!inNomor && !inTujuan && !inPerihal) return false;
            }
            if (filterKategoriArsip && item.sertifikatSnapshot?.kategori !== filterKategoriArsip) {
                return false;
            }
            if (filterStartArsip && item.tanggalBuat < filterStartArsip) return false;
            if (filterEndArsip && item.tanggalBuat > filterEndArsip) return false;
            return true;
        });
    }, [arsipSertifikatList, searchArsip, filterKategoriArsip, filterStartArsip, filterEndArsip]);

    const handleExportArsipExcel = async () => {
        try {
            const XLSX = await loadXLSX();
            const rows = filteredArsipSertifikat.map((item, index) => ({
                No: index + 1,
                'Nomor Sertifikat': item.nomorSurat,
                'Tanggal Terbit': item.tanggalBuat,
                Kategori: item.sertifikatSnapshot?.kategori || 'Sertifikat',
                'Judul Dokumen': item.sertifikatSnapshot?.judulDokumen || item.perihal,
                'Nama Penerima': item.sertifikatSnapshot?.namaPenerima || item.tujuan,
                'Capaian / Prestasi': item.sertifikatSnapshot?.capaianUtama || '-',
                Predikat: item.sertifikatSnapshot?.showPredikat
                    ? item.sertifikatSnapshot?.predikatValue || '-'
                    : '-',
                'Penanda Tangan':
                    item.signatoriesSnapshot?.map((s) => `${s.jabatan}: ${s.nama}`).join('; ') || '-',
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Agenda Sertifikat');
            XLSX.writeFile(
                wb,
                `Agenda_Sertifikat_Piagam_${new Date().toISOString().split('T')[0]}.xlsx`
            );
            showToast('Rekap arsip sertifikat berhasil diekspor ke Excel.', 'success');
        } catch {
            showToast('Gagal mengekspor Excel.', 'error');
        }
    };

    // Quick suggestion chips based on active category
    const activeCapaianChips = useMemo(() => {
        if (kategori === 'Mutun') return MUTUN_CAPAIAN_CHIPS;
        if (kategori === 'Tahfizh') return TAHFIZH_MANDIRI_CHIPS;
        return LOMBA_CAPAIAN_CHIPS;
    }, [kategori]);

    // Helper for signatory editor block
    const renderSignatoryControl = (
        title: string,
        sig: SertifikatSignatoryConfig,
        onChange: (next: SertifikatSignatoryConfig) => void
    ) => (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">{title}</span>
                <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-teal-800 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={sig.useDigitalTtd !== false}
                        onChange={(e) => onChange({ ...sig, useDigitalTtd: e.target.checked })}
                        className="rounded text-teal-600"
                    />
                    <span>TTD Digital</span>
                </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Sumber Data Pejabat
                    </label>
                    <select
                        value={sig.sourceType}
                        onChange={(e) => {
                            const nextType = e.target.value as SertifikatSignatoryConfig['sourceType'];
                            const updated: SertifikatSignatoryConfig = { ...sig, sourceType: nextType };
                            if (nextType === 'mudir') {
                                updated.labelTop = 'Mudir / Pengasuh Pondok,';
                                updated.roleBottom = 'Pimpinan Lembaga';
                            } else if (nextType === 'halaqah') {
                                updated.labelTop = 'Muhaffizh / Penguji,';
                                updated.roleBottom = 'Pembimbing Halaqah';
                            } else if (nextType === 'wali_kelas') {
                                updated.labelTop = 'Wali Kelas,';
                                updated.roleBottom = 'Wali Kelas / Pembina';
                            } else if (nextType === 'guru' && !updated.teacherId && activeTeachers[0]) {
                                updated.teacherId = activeTeachers[0].id;
                            }
                            onChange(updated);
                        }}
                        className="app-select w-full p-2 text-xs rounded-xl"
                    >
                        <option value="mudir">Otomatis: Mudir / Pimpinan Pondok</option>
                        <option value="halaqah">Otomatis: Muhaffizh Halaqah Santri</option>
                        <option value="wali_kelas">Otomatis: Wali Kelas Santri</option>
                        <option value="guru">Pilih dari Data Guru / Ustadz</option>
                        <option value="manual">Tulis Manual (Bebas)</option>
                    </select>
                </div>

                {sig.sourceType === 'guru' ? (
                    <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Pilih Ustadz / Staf
                        </label>
                        <select
                            value={sig.teacherId || ''}
                            onChange={(e) => {
                                const tid = Number(e.target.value);
                                const t = activeTeachers.find((x) => Number(x.id) === tid);
                                onChange({
                                    ...sig,
                                    teacherId: tid || undefined,
                                    nama: t?.nama || sig.nama,
                                    nip: t?.nip || '',
                                });
                            }}
                            className="app-select w-full p-2 text-xs rounded-xl"
                        >
                            <option value="">-- Pilih Ustadz / Pengurus --</option>
                            {activeTeachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.nama} ({getTeacherPrimaryRoleLabel(t, settings)})
                                </option>
                            ))}
                        </select>
                    </div>
                ) : sig.sourceType === 'manual' ? (
                    <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Nama Pejabat / Penguji
                        </label>
                        <input
                            type="text"
                            value={sig.nama}
                            onChange={(e) => onChange({ ...sig, nama: e.target.value })}
                            placeholder="cth: Syaikh / Ust. Abdullah, Lc."
                            className="app-input w-full p-2 text-xs rounded-xl"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col justify-end">
                        <div className="rounded-xl border border-teal-200/70 bg-teal-50/60 px-2.5 py-2 text-[11px] text-teal-900 truncate">
                            Terisi otomatis: <strong>{resolveSignatory(sig, currentPreviewJob?.santri).nama}</strong>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                         Baris Jabatan Atas
                    </label>
                    <input
                        type="text"
                        value={sig.labelTop}
                        onChange={(e) => onChange({ ...sig, labelTop: e.target.value })}
                        placeholder="cth: Penguji Mutun,"
                        className="app-input w-full p-2 text-xs rounded-xl"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Keterangan Jabatan Bawah
                    </label>
                    <input
                        type="text"
                        value={sig.roleBottom}
                        onChange={(e) => onChange({ ...sig, roleBottom: e.target.value })}
                        placeholder="cth: Majelis Ilmu & Mutun"
                        className="app-input w-full p-2 text-xs rounded-xl"
                    />
                </div>
            </div>

            {sig.sourceType === 'manual' && sig.useDigitalTtd !== false && ttdAssets.length > 0 && (
                <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Pilih Gambar TTD Digital (Opsional)
                    </label>
                    <select
                        value={
                            ttdAssets.find((a) => a.base64Image === sig.signatureUrl)?.id || ''
                        }
                        onChange={(e) => {
                            const found = ttdAssets.find((a) => a.id === e.target.value);
                            onChange({ ...sig, signatureUrl: found?.base64Image });
                        }}
                        className="app-select w-full p-2 text-xs rounded-xl"
                    >
                        <option value="">-- Tanpa Gambar / Cocokkan Nama Otomatis --</option>
                        {ttdAssets.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.namaPemilik} ({a.jabatan || 'TTD'})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={Boolean(sig.showNip)}
                        onChange={(e) => onChange({ ...sig, showNip: e.target.checked })}
                        className="rounded text-teal-600"
                    />
                    <span>Tampilkan NIP / NIY</span>
                </label>
                {sig.showNip && (
                    <input
                        type="text"
                        value={sig.nip || ''}
                        onChange={(e) => onChange({ ...sig, nip: e.target.value })}
                        placeholder="Nomor NIP / NIY"
                        className="app-input w-44 p-1.5 text-xs rounded-lg font-mono"
                    />
                )}
            </div>
        </div>
    );

    const headerTabs = [
        {
            value: 'buat' as const,
            label: 'Buat & Cetak Sertifikat',
            mobileLabel: 'Buat Sertifikat',
            icon: 'bi-patch-check-fill',
        },
        {
            value: 'templates' as const,
            label: `Template & Preset (${DEFAULT_SERTIFIKAT_PRESETS.length + customTemplates.length})`,
            mobileLabel: 'Template',
            icon: 'bi-bookmarks-fill',
        },
        {
            value: 'arsip' as const,
            label: `Arsip & Buku Agenda (${arsipSertifikatList.length})`,
            mobileLabel: `Arsip (${arsipSertifikatList.length})`,
            icon: 'bi-journal-bookmark-fill',
        },
    ];

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                eyebrow="Pendidikan & Penghargaan"
                title="Sertifikat & Piagam Kustom"
                description="Terbitkan syahadah hafalan mutun ilmiyah, tasmi’ tahfizh mandiri, sertifikat daurah kitab, maupun piagam kejuaraan lengkap dengan penyusun redaksi AI dan pencatatan otomatis ke Buku Agenda."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent('open-panduan', { detail: 'sertifikat' })
                                )
                            }
                            className="app-button-secondary px-3.5 py-2.5 text-xs sm:text-sm rounded-xl flex items-center gap-2 text-slate-700"
                            title="Buka Panduan Lengkap & SOP Multi-Admin / Cloud Sync"
                        >
                            <i className="bi bi-book-half text-teal-600"></i>
                            <span>Panduan &amp; SOP</span>
                        </button>
                        {activeTab === 'buat' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAiKegiatanInput(capaianUtama || '');
                                        setIsAiModalOpen(true);
                                    }}
                                    className="app-button-secondary px-4 py-2.5 text-xs sm:text-sm rounded-xl flex items-center gap-2 border-teal-200 bg-teal-50/70 text-teal-800 hover:bg-teal-100/80"
                                >
                                    <i className="bi bi-stars text-teal-600"></i>
                                    <span>Susun Redaksi AI</span>
                                </button>
                                {canWrite && (
                                    <button
                                        type="button"
                                        onClick={handleOpenSaveTemplateModal}
                                        className="app-button-secondary px-4 py-2.5 text-xs sm:text-sm rounded-xl flex items-center gap-2"
                                    >
                                        <i className="bi bi-bookmark-plus"></i>
                                        <span>Simpan Template</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handlePrintCertificates}
                                    disabled={isProcessingPrint}
                                    className="app-button-primary px-4 py-2.5 text-xs sm:text-sm rounded-xl flex items-center gap-2"
                                >
                                    <i className="bi bi-printer-fill"></i>
                                    <span>
                                        Cetak {certificateJobs.length > 1 ? `(${certificateJobs.length})` : 'Sertifikat'}
                                    </span>
                                </button>
                            </>
                        )}
                        {activeTab === 'arsip' && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleExportArsipExcel}
                                    className="app-button-secondary px-4 py-2.5 text-xs sm:text-sm rounded-xl flex items-center gap-2 text-emerald-700"
                                >
                                    <i className="bi bi-file-earmark-excel"></i>
                                    <span>Unduh Excel</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAgendaScope('sertifikat_only');
                                        setIsAgendaModalOpen(true);
                                    }}
                                    className="app-button-primary px-4 py-2.5 text-xs sm:text-sm rounded-xl flex items-center gap-2"
                                >
                                    <i className="bi bi-journal-text"></i>
                                    <span>Cetak Buku Agenda</span>
                                </button>
                            </>
                        )}
                    </div>
                }
                tabs={
                    <HeaderTabs
                        tabs={headerTabs}
                        value={activeTab}
                        onChange={(v) => setActiveTab(v)}
                    />
                }
            />

            {/* ===================================================================== */}
            {/* TAB 1: BUAT & CETAK SERTIFIKAT                                        */}
            {/* ===================================================================== */}
            {activeTab === 'buat' && (
                <>
                    {/* Mobile Switcher Form vs Preview */}
                    <div className="flex lg:hidden rounded-2xl bg-slate-200/80 p-1 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setMobileWorkspaceView('form')}
                            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                                mobileWorkspaceView === 'form'
                                    ? 'bg-white text-teal-800 shadow-xs'
                                    : 'text-slate-600'
                            }`}
                        >
                            <i className="bi bi-sliders"></i> Pengaturan Isi & Desain
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileWorkspaceView('preview')}
                            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                                mobileWorkspaceView === 'preview'
                                    ? 'bg-white text-teal-800 shadow-xs'
                                    : 'text-slate-600'
                            }`}
                        >
                            <i className="bi bi-eye"></i> Pratinjau Sertifikat ({certificateJobs.length})
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* LEFT COLUMN: CONFIGURATION PANEL */}
                        <div
                            className={`lg:col-span-5 space-y-5 ${
                                mobileWorkspaceView === 'preview' ? 'hidden lg:block' : 'block'
                            }`}
                        >
                            {/* 1. Preset & Tema */}
                            <SectionCard
                                title="1. Jenis Kegiatan & Tema Desain"
                                description="Pilih preset kegiatan pondok atau template tersimpan, lalu tentukan 1 dari 5 tema ornamen."
                                contentClassName="p-5 space-y-4"
                            >
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Preset / Template Dasar
                                    </label>
                                    <select
                                        value={activePresetOrTemplateId}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            const foundCustom = customTemplates.find((t) => t.id === id);
                                            if (foundCustom) {
                                                applyTemplate(foundCustom);
                                                return;
                                            }
                                            const foundPreset = DEFAULT_SERTIFIKAT_PRESETS.find(
                                                (p) => p.id === id
                                            );
                                            if (foundPreset) applyTemplate(foundPreset);
                                        }}
                                        className="app-select w-full p-2.5 text-sm rounded-xl font-medium"
                                    >
                                        <optgroup label="Preset Standar Pondok Pesantren">
                                            {DEFAULT_SERTIFIKAT_PRESETS.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nama} ({p.kodeNomor})
                                                </option>
                                            ))}
                                        </optgroup>
                                        {customTemplates.length > 0 && (
                                            <optgroup label="Template Kustom Tersimpan">
                                                {customTemplates.map((t) => (
                                                    <option key={t.id} value={t.id}>
                                                        ★ {t.nama} ({t.kodeNomor})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                                        5 Tema Ornamen Sertifikat (A4 Landscape)
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {SERTIFIKAT_THEMES.map((th) => {
                                            const isSelected = tema === th.id;
                                            return (
                                                <button
                                                    key={th.id}
                                                    type="button"
                                                    onClick={() => setTema(th.id)}
                                                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                                                        isSelected
                                                            ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-black/10">
                                                        <span
                                                            className="h-full w-1/2"
                                                            style={{ backgroundColor: th.swatchPrimary }}
                                                        />
                                                        <span
                                                            className="h-full w-1/2"
                                                            style={{ backgroundColor: th.swatchAccent }}
                                                        />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-slate-800 truncate">
                                                            {th.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 truncate">
                                                            {th.subtitle}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-100">
                                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showBismillah}
                                            onChange={(e) => setShowBismillah(e.target.checked)}
                                            className="rounded text-teal-600"
                                        />
                                        <span>Kaligrafi Basmalah</span>
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showWatermarkLogo}
                                            onChange={(e) => setShowWatermarkLogo(e.target.checked)}
                                            className="rounded text-teal-600"
                                        />
                                        <span>Watermark Logo Pondok</span>
                                    </label>
                                </div>
                            </SectionCard>

                            {/* 2. Penerima Sertifikat */}
                            <SectionCard
                                title="2. Penerima Sertifikat"
                                description="Pilih satu santri, cetak massal per kelas/halaqah, atau ketik manual untuk ustadz/tamu/peserta luar."
                                contentClassName="p-5 space-y-4"
                            >
                                <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRecipientMode('single');
                                            setPreviewIndex(0);
                                        }}
                                        className={`py-2 px-2 rounded-lg transition-all ${
                                            recipientMode === 'single'
                                                ? 'bg-white text-teal-800 shadow-2xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <i className="bi bi-person mr-1"></i>Satu Santri
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRecipientMode('bulk');
                                            setPreviewIndex(0);
                                        }}
                                        className={`py-2 px-2 rounded-lg transition-all ${
                                            recipientMode === 'bulk'
                                                ? 'bg-white text-teal-800 shadow-2xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <i className="bi bi-people mr-1"></i>Massal ({bulkSelectedIds.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRecipientMode('manual');
                                            setPreviewIndex(0);
                                        }}
                                        className={`py-2 px-2 rounded-lg transition-all ${
                                            recipientMode === 'manual'
                                                ? 'bg-white text-teal-800 shadow-2xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <i className="bi bi-person-badge mr-1"></i>Non-Santri
                                    </button>
                                </div>

                                {recipientMode === 'single' && (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                                            <div className="min-w-0 pr-3">
                                                {currentPreviewJob?.santri ? (
                                                    <>
                                                        <div className="text-sm font-bold text-slate-900 truncate">
                                                            {currentPreviewJob.santri.namaLengkap}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            NIS: {currentPreviewJob.santri.nis || '-'} •{' '}
                                                            {settings.rombel?.find(
                                                                (r) =>
                                                                    r.id ===
                                                                    currentPreviewJob.santri?.rombelId
                                                            )?.nama || '-'}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-slate-500">
                                                        Belum ada santri dipilih
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsSantriSelectorOpen(true)}
                                                className="app-button-secondary px-3.5 py-2 text-xs rounded-xl shrink-0"
                                            >
                                                <i className="bi bi-search mr-1.5"></i>Pilih Santri
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {recipientMode === 'bulk' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">
                                                    {bulkSelectedIds.length} Santri Terpilih
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    Nomor urut sertifikat otomatis bertambah per penerima
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsSantriSelectorOpen(true)}
                                                className="app-button-primary px-3.5 py-2 text-xs rounded-xl"
                                            >
                                                <i className="bi bi-people-fill mr-1.5"></i>Pilih Santri
                                            </button>
                                        </div>

                                        {bulkSelectedIds.length > 0 && (
                                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowBulkOverrideTable((prev) => !prev)
                                                    }
                                                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100/80"
                                                >
                                                    <span>
                                                        <i className="bi bi-pencil-square mr-1.5 text-teal-600"></i>
                                                        Kustomisasi Capaian / Predikat Per Santri (Opsional)
                                                    </span>
                                                    <i
                                                        className={`bi bi-chevron-${
                                                            showBulkOverrideTable ? 'up' : 'down'
                                                        }`}
                                                    ></i>
                                                </button>
                                                {showBulkOverrideTable && (
                                                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-2.5 space-y-2">
                                                        {bulkSelectedIds.map((id, idx) => {
                                                            const s = santriList.find((x) => x.id === id);
                                                            if (!s) return null;
                                                            const ov = santriOverrides[id] || {};
                                                            return (
                                                                <div
                                                                    key={id}
                                                                    className="pt-2 first:pt-0 space-y-1.5"
                                                                >
                                                                    <div className="flex items-center justify-between text-xs">
                                                                        <span className="font-bold text-slate-800">
                                                                            {idx + 1}. {s.namaLengkap}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setPreviewIndex(idx)
                                                                            }
                                                                            className="text-[11px] text-teal-700 hover:underline"
                                                                        >
                                                                            Lihat Preview
                                                                        </button>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                        <input
                                                                            type="text"
                                                                            value={ov.capaianCustom || ''}
                                                                            onChange={(e) =>
                                                                                setSantriOverrides(
                                                                                    (prev) => ({
                                                                                        ...prev,
                                                                                        [id]: {
                                                                                            ...prev[id],
                                                                                            capaianCustom:
                                                                                                e.target
                                                                                                    .value,
                                                                                        },
                                                                                    })
                                                                                )
                                                                            }
                                                                            placeholder={`Default: ${capaianUtama.slice(0, 26)}...`}
                                                                            className="app-input p-1.5 text-[11px] rounded-lg"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={ov.predikatCustom || ''}
                                                                            onChange={(e) =>
                                                                                setSantriOverrides(
                                                                                    (prev) => ({
                                                                                        ...prev,
                                                                                        [id]: {
                                                                                            ...prev[id],
                                                                                            predikatCustom:
                                                                                                e.target
                                                                                                    .value,
                                                                                        },
                                                                                    })
                                                                                )
                                                                            }
                                                                            placeholder={`Predikat: ${predikatValue || '-'}`}
                                                                            className="app-input p-1.5 text-[11px] rounded-lg"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {recipientMode === 'manual' && (
                                    <div className="space-y-3">
                                        {activeTeachers.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    defaultValue=""
                                                    onChange={(e) => {
                                                        const tid = Number(e.target.value);
                                                        if (!tid) return;
                                                        const t = activeTeachers.find(
                                                            (x) => Number(x.id) === tid
                                                        );
                                                        if (t) {
                                                            const roleLabel = getTeacherPrimaryRoleLabel(
                                                                t,
                                                                settings
                                                            );
                                                            if (
                                                                manualRecipients.length === 1 &&
                                                                manualRecipients[0].id === 'manual-1'
                                                            ) {
                                                                setManualRecipients([
                                                                    {
                                                                        id: `manual-${Date.now()}`,
                                                                        nama: t.nama,
                                                                        identitasLabel1: 'Jabatan',
                                                                        identitasValue1: roleLabel,
                                                                        identitasLabel2: 'Unit / Lembaga',
                                                                        identitasValue2:
                                                                            settings.namaPonpes,
                                                                        noHp: t.telepon || '',
                                                                    },
                                                                ]);
                                                            } else {
                                                                setManualRecipients((prev) => [
                                                                    ...prev,
                                                                    {
                                                                        id: `manual-${Date.now()}`,
                                                                        nama: t.nama,
                                                                        identitasLabel1: 'Jabatan',
                                                                        identitasValue1: roleLabel,
                                                                        identitasLabel2: 'Unit / Lembaga',
                                                                        identitasValue2:
                                                                            settings.namaPonpes,
                                                                        noHp: t.telepon || '',
                                                                    },
                                                                ]);
                                                            }
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                    className="app-select w-full p-2 text-xs rounded-xl"
                                                >
                                                    <option value="">
                                                        + Isi Cepat Penerima dari Data Ustadz / Staf...
                                                    </option>
                                                    {activeTeachers.map((t) => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.nama} (
                                                            {getTeacherPrimaryRoleLabel(t, settings)})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                            {manualRecipients.map((m, idx) => (
                                                <div
                                                    key={m.id}
                                                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-700">
                                                            Penerima #{idx + 1}
                                                        </span>
                                                        {manualRecipients.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setManualRecipients((prev) =>
                                                                        prev.filter(
                                                                            (x) => x.id !== m.id
                                                                        )
                                                                    )
                                                                }
                                                                className="text-xs text-rose-600 hover:underline"
                                                            >
                                                                Hapus
                                                            </button>
                                                        )}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={m.nama}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setManualRecipients((prev) =>
                                                                prev.map((x) =>
                                                                    x.id === m.id
                                                                        ? { ...x, nama: val }
                                                                        : x
                                                                )
                                                            );
                                                        }}
                                                        placeholder="Nama Lengkap & Gelar Penerima"
                                                        className="app-input w-full p-2 text-xs font-semibold rounded-xl"
                                                    />
                                                    <div className="grid grid-cols-5 gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={m.identitasLabel1}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setManualRecipients((prev) =>
                                                                    prev.map((x) =>
                                                                        x.id === m.id
                                                                            ? {
                                                                                  ...x,
                                                                                  identitasLabel1: val,
                                                                              }
                                                                            : x
                                                                    )
                                                                );
                                                            }}
                                                            placeholder="Label 1 (Jabatan)"
                                                            className="app-input col-span-2 p-1.5 text-[11px] rounded-lg"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={m.identitasValue1}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setManualRecipients((prev) =>
                                                                    prev.map((x) =>
                                                                        x.id === m.id
                                                                            ? {
                                                                                  ...x,
                                                                                  identitasValue1: val,
                                                                              }
                                                                            : x
                                                                    )
                                                                );
                                                            }}
                                                            placeholder="Isi (cth: Pemateri / Peserta)"
                                                            className="app-input col-span-3 p-1.5 text-[11px] rounded-lg"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={m.identitasLabel2}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setManualRecipients((prev) =>
                                                                    prev.map((x) =>
                                                                        x.id === m.id
                                                                            ? {
                                                                                  ...x,
                                                                                  identitasLabel2: val,
                                                                              }
                                                                            : x
                                                                    )
                                                                );
                                                            }}
                                                            placeholder="Label 2 (Utusan)"
                                                            className="app-input col-span-2 p-1.5 text-[11px] rounded-lg"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={m.identitasValue2}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setManualRecipients((prev) =>
                                                                    prev.map((x) =>
                                                                        x.id === m.id
                                                                            ? {
                                                                                  ...x,
                                                                                  identitasValue2: val,
                                                                              }
                                                                            : x
                                                                    )
                                                                );
                                                            }}
                                                            placeholder="Isi (cth: Nama Lembaga / Kota)"
                                                            className="app-input col-span-3 p-1.5 text-[11px] rounded-lg"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setManualRecipients((prev) => [
                                                    ...prev,
                                                    {
                                                        id: `manual-${Date.now()}`,
                                                        nama: '',
                                                        identitasLabel1: 'Peran',
                                                        identitasValue1: '',
                                                        identitasLabel2: 'Instansi',
                                                        identitasValue2: '',
                                                    },
                                                ])
                                            }
                                            className="app-button-secondary w-full py-2 text-xs rounded-xl"
                                        >
                                            <i className="bi bi-plus-lg mr-1"></i>Tambah Baris Penerima Manual
                                        </button>
                                    </div>
                                )}
                            </SectionCard>

                            {/* 3. Redaksi & Isi Sertifikat + AI */}
                            <SectionCard
                                title="3. Redaksi & Isi Capaian"
                                description="Atur judul piagam, pengantar, kotak capaian utama, dan doa penutup atau susun otomatis dengan AI."
                                contentClassName="p-5 space-y-4"
                            >
                                <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-3.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                                            <i className="bi bi-stars text-teal-600"></i>
                                            AI Penyusun Redaksi Sertifikat
                                        </div>
                                        <p className="text-[11px] text-teal-800/80 mt-0.5">
                                            Buat kalimat syahadah mutun, lomba, atau apresiasi otomatis pas 1 halaman.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAiKegiatanInput(capaianUtama || '');
                                            setIsAiModalOpen(true);
                                        }}
                                        className="app-button-primary px-3.5 py-2 text-xs rounded-xl shrink-0"
                                    >
                                        Buka AI
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Kategori Agenda
                                        </label>
                                        <select
                                            value={kategori}
                                            onChange={(e) =>
                                                setKategori(e.target.value as SertifikatKategori)
                                            }
                                            className="app-select w-full p-2 text-xs rounded-xl"
                                        >
                                            <option value="Mutun">Mutun Ilmiyah</option>
                                            <option value="Tahfizh">Tahfizh Mandiri</option>
                                            <option value="Daurah & Kitab">Daurah & Kitab</option>
                                            <option value="Perlombaan">Perlombaan</option>
                                            <option value="Apresiasi">Apresiasi Umum</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Kode Nomor
                                        </label>
                                        <input
                                            type="text"
                                            value={kodeNomor}
                                            onChange={(e) =>
                                                setKodeNomor(e.target.value.toUpperCase())
                                            }
                                            placeholder="SYH-MTN"
                                            className="app-input w-full p-2 text-xs font-mono uppercase rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-medium text-slate-600">
                                                Nomor Urut
                                            </label>
                                            {certificateJobs.length === 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!isManualNomor) {
                                                            setManualNomorInput(
                                                                currentPreviewJob?.snapshot
                                                                    .nomorSertifikat || ''
                                                            );
                                                        }
                                                        setIsManualNomor(!isManualNomor);
                                                    }}
                                                    className="text-[10px] font-semibold text-teal-700 hover:underline"
                                                >
                                                    {isManualNomor ? 'Otomatis' : 'Ketik Manual'}
                                                </button>
                                            )}
                                        </div>
                                        {isManualNomor && certificateJobs.length === 1 ? (
                                            <input
                                                type="text"
                                                value={manualNomorInput}
                                                onChange={(e) =>
                                                    setManualNomorInput(e.target.value)
                                                }
                                                className="app-input w-full p-2 text-xs font-mono rounded-xl"
                                            />
                                        ) : (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-mono text-slate-700 truncate">
                                                {currentPreviewJob?.snapshot.nomorSertifikat}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Judul Utama Dokumen
                                    </label>
                                    <input
                                        type="text"
                                        value={judulDokumen}
                                        onChange={(e) =>
                                            setJudulDokumen(e.target.value.toUpperCase())
                                        }
                                        placeholder="SYAHADAH HAFALAN MUTUN ILMIYAH"
                                        className="app-input w-full p-2.5 text-xs font-bold uppercase rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Kalimat Pengantar (Di Atas Nama Penerima)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={kalimatPengantar}
                                        onChange={(e) => setKalimatPengantar(e.target.value)}
                                        className="app-input w-full p-2.5 text-xs rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Narasi Penghubung (Di Bawah Identitas Penerima)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={deskripsiCapaian}
                                        onChange={(e) => setDeskripsiCapaian(e.target.value)}
                                        className="app-input w-full p-2.5 text-xs rounded-xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Kotak Capaian Utama / Nama Kitab / Prestasi
                                    </label>
                                    <input
                                        type="text"
                                        value={capaianUtama}
                                        onChange={(e) => setCapaianUtama(e.target.value)}
                                        placeholder="cth: Matan Tuhfatul Athfal (61 Bait)"
                                        className="app-input w-full p-2.5 text-xs font-semibold rounded-xl"
                                    />
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {activeCapaianChips.slice(0, 6).map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => setCapaianUtama(chip)}
                                                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 transition-colors"
                                            >
                                                {chip}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-700">
                                            Baris Predikat / Kualifikasi
                                        </span>
                                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showPredikat}
                                                onChange={(e) => setShowPredikat(e.target.checked)}
                                                className="rounded text-teal-600"
                                            />
                                            <span>Tampilkan</span>
                                        </label>
                                    </div>
                                    {showPredikat && (
                                        <>
                                            <div className="grid grid-cols-5 gap-2">
                                                <input
                                                    type="text"
                                                    value={predikatLabel}
                                                    onChange={(e) =>
                                                        setPredikatLabel(e.target.value)
                                                    }
                                                    placeholder="Predikat"
                                                    className="app-input col-span-2 p-2 text-xs rounded-xl"
                                                />
                                                <input
                                                    type="text"
                                                    value={predikatValue}
                                                    onChange={(e) =>
                                                        setPredikatValue(e.target.value)
                                                    }
                                                    placeholder="Mumtaz (Istimewa)"
                                                    className="app-input col-span-3 p-2 text-xs font-semibold rounded-xl"
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {PREDIKAT_CHIPS.slice(0, 5).map((p) => (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => setPredikatValue(p)}
                                                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:border-teal-300 hover:text-teal-800"
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Doa / Catatan Motivasi Penutup (Opsional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={catatanDoa}
                                        onChange={(e) => setCatatanDoa(e.target.value)}
                                        placeholder="Kosongkan jika tidak ingin menampilkan kutipan doa/catatan..."
                                        className="app-input w-full p-2.5 text-xs rounded-xl"
                                    />
                                </div>
                            </SectionCard>

                            {/* 4. Titimangsa, Penanda Tangan & Stempel */}
                            <SectionCard
                                title="4. Titimangsa, Penanda Tangan & Stempel"
                                description="Mendukung penanggalan Masehi/Hijriah, 1–2 pejabat penanda tangan dengan TTD digital, serta segel stempel kustom."
                                contentClassName="p-5 space-y-4"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Tempat Penetapan
                                        </label>
                                        <input
                                            type="text"
                                            value={tempatPenetapan}
                                            onChange={(e) => setTempatPenetapan(e.target.value)}
                                            className="app-input w-full p-2 text-xs rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Tanggal Terbit
                                        </label>
                                        <input
                                            type="date"
                                            value={tanggalDokumen}
                                            onChange={(e) => setTanggalDokumen(e.target.value)}
                                            className="app-input w-full p-2 text-xs rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Format Tanggal
                                        </label>
                                        <select
                                            value={formatTanggalMode}
                                            onChange={(e) =>
                                                setFormatTanggalMode(
                                                    e.target.value as DateFormatMode
                                                )
                                            }
                                            className="app-select w-full p-2 text-xs rounded-xl"
                                        >
                                            <option value="masehi">Masehi Saja</option>
                                            <option value="hijriah_masehi">
                                                Hijriah & Masehi
                                            </option>
                                            <option value="hijriah">Hijriah Saja</option>
                                        </select>
                                    </div>
                                </div>

                                {formatTanggalMode !== 'masehi' && (
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                            Teks Hijriah Manual (Opsional, kosongkan untuk konversi otomatis)
                                        </label>
                                        <input
                                            type="text"
                                            value={manualHijriStr}
                                            onChange={(e) => setManualHijriStr(e.target.value)}
                                            placeholder="cth: 15 Ramadhan 1447 H"
                                            className="app-input w-full p-2 text-xs rounded-xl"
                                        />
                                    </div>
                                )}

                                {canWrite && (
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveDefaultTitimangsa}
                                            className="text-[11px] font-semibold text-teal-700 hover:underline flex items-center gap-1"
                                        >
                                            <i className="bi bi-check2-circle"></i> Simpan Tempat & Format Tanggal sebagai Default
                                        </button>
                                    </div>
                                )}

                                <div className="border-t border-slate-100 pt-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-800">
                                            Jumlah Penanda Tangan
                                        </span>
                                        <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                                            <button
                                                type="button"
                                                onClick={() => setSignatoryCount(1)}
                                                className={`px-3 py-1 rounded-lg ${
                                                    signatoryCount === 1
                                                        ? 'bg-white text-teal-800 shadow-2xs'
                                                        : 'text-slate-600'
                                                }`}
                                            >
                                                1 Pejabat
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSignatoryCount(2)}
                                                className={`px-3 py-1 rounded-lg ${
                                                    signatoryCount === 2
                                                        ? 'bg-white text-teal-800 shadow-2xs'
                                                        : 'text-slate-600'
                                                }`}
                                            >
                                                2 Pejabat
                                            </button>
                                        </div>
                                    </div>

                                    {signatoryCount === 2 &&
                                        renderSignatoryControl(
                                            'Penanda Tangan Kiri (Penguji / Panitia / Wali)',
                                            leftSignatory,
                                            setLeftSignatory
                                        )}

                                    {renderSignatoryControl(
                                        signatoryCount === 2
                                            ? 'Penanda Tangan Kanan (Mudir / Pimpinan)'
                                            : 'Penanda Tangan Utama (Kanan)',
                                        rightSignatory,
                                        setRightSignatory
                                    )}
                                </div>

                                <div className="border-t border-slate-100 pt-3 space-y-2.5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Mode Stempel Tengah
                                            </label>
                                            <select
                                                value={stampMode}
                                                onChange={(e) =>
                                                    setStampMode(
                                                        e.target.value as SertifikatStampMode
                                                    )
                                                }
                                                className="app-select w-full p-2 text-xs rounded-xl"
                                            >
                                                <option value="auto">
                                                    Otomatis (Stempel Gambar / Segel Vektor)
                                                </option>
                                                <option value="seal">
                                                    Segel Vektor Melingkar Kustom
                                                </option>
                                                <option value="image">
                                                    Pilih Gambar Stempel Aset Digital
                                                </option>
                                                <option value="none">
                                                    Tanpa Stempel (Stempel Basah Manual)
                                                </option>
                                            </select>
                                        </div>

                                        {stampMode === 'image' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                                    Aset Gambar Stempel
                                                </label>
                                                <select
                                                    value={customStampAssetId}
                                                    onChange={(e) =>
                                                        setCustomStampAssetId(e.target.value)
                                                    }
                                                    className="app-select w-full p-2 text-xs rounded-xl"
                                                >
                                                    <option value="">
                                                        Stempel Utama Pondok
                                                    </option>
                                                    {stampAssets.map((a) => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.namaPemilik} ({a.jabatan || 'Stempel'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {(stampMode === 'seal' ||
                                            (stampMode === 'auto' &&
                                                !settings.stempelPonpesUrl)) && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                                    Teks Lengkung Bawah Segel
                                                </label>
                                                <input
                                                    type="text"
                                                    value={stampBottomText}
                                                    onChange={(e) =>
                                                        setStampBottomText(e.target.value)
                                                    }
                                                    placeholder="★ MAJELIS ILMU & MUTUN ★"
                                                    className="app-input w-full p-2 text-xs rounded-xl"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {(stampMode === 'seal' ||
                                        (stampMode === 'auto' && !settings.stempelPonpesUrl)) && (
                                        <div className="flex flex-wrap gap-1">
                                            {STAMP_LABEL_PRESETS.map((lbl) => (
                                                <button
                                                    key={lbl}
                                                    type="button"
                                                    onClick={() => setStampBottomText(lbl)}
                                                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 hover:border-teal-300 hover:text-teal-800"
                                                >
                                                    {lbl}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </SectionCard>
                        </div>

                        {/* RIGHT COLUMN: STICKY LIVE LANDSCAPE PREVIEW & EXPORT BAR */}
                        <div
                            className={`lg:col-span-7 lg:sticky lg:top-24 space-y-4 ${
                                mobileWorkspaceView === 'form' ? 'hidden lg:block' : 'block'
                            }`}
                        >
                            <div className="app-panel rounded-[24px] overflow-hidden border border-slate-200">
                                {/* Top Toolbar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                                            <i className="bi bi-aspect-ratio text-sm"></i>
                                        </span>
                                        <div>
                                            <div className="text-xs font-bold text-slate-800">
                                                Pratinjau Langsung A4 Landscape
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                Skala {Math.round(previewScale * 100)}% •{' '}
                                                {certificateJobs.length} Halaman Siap Cetak
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recipient Pagination & Zoom */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {certificateJobs.length > 1 && (
                                            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1.5 py-1 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPreviewIndex((p) =>
                                                            Math.max(0, p - 1)
                                                        )
                                                    }
                                                    disabled={safePreviewIdx === 0}
                                                    className="px-2 py-0.5 rounded hover:bg-slate-100 disabled:opacity-40"
                                                >
                                                    <i className="bi bi-chevron-left"></i>
                                                </button>
                                                <span className="px-1.5 font-semibold text-slate-700">
                                                    {safePreviewIdx + 1} / {certificateJobs.length}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPreviewIndex((p) =>
                                                            Math.min(
                                                                certificateJobs.length - 1,
                                                                p + 1
                                                            )
                                                        )
                                                    }
                                                    disabled={
                                                        safePreviewIdx >=
                                                        certificateJobs.length - 1
                                                    }
                                                    className="px-2 py-0.5 rounded hover:bg-slate-100 disabled:opacity-40"
                                                >
                                                    <i className="bi bi-chevron-right"></i>
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 text-[11px] font-semibold">
                                            {(['auto', '50', '75', '100'] as const).map((z) => (
                                                <button
                                                    key={z}
                                                    type="button"
                                                    onClick={() => setZoomMode(z)}
                                                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                                                        zoomMode === z
                                                            ? 'bg-teal-600 text-white'
                                                            : 'text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {z === 'auto' ? 'Pas Lebar' : `${z}%`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Scaled Canvas Viewport */}
                                <div
                                    ref={previewViewportRef}
                                    className="bg-slate-200/75 p-4 sm:p-5 overflow-auto flex justify-center items-start"
                                >
                                    <div
                                        style={{
                                            width: `${Math.round(SHEET_WIDTH_PX * previewScale)}px`,
                                            height: `${Math.round(SHEET_HEIGHT_PX * previewScale)}px`,
                                            position: 'relative',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${SHEET_WIDTH_PX}px`,
                                                height: `${SHEET_HEIGHT_PX}px`,
                                                transform: `scale(${previewScale})`,
                                                transformOrigin: 'top left',
                                            }}
                                            className="shadow-xl"
                                        >
                                            <SertifikatCanvas
                                                snapshot={currentPreviewJob.snapshot}
                                                settings={settings}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Archive & Export Bar */}
                                <div className="border-t border-slate-200 bg-white px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    {canWrite ? (
                                        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={autoArchiveOnPrint}
                                                onChange={(e) =>
                                                    setAutoArchiveOnPrint(e.target.checked)
                                                }
                                                className="rounded text-teal-600"
                                            />
                                            <span>
                                                Catat otomatis ke <strong>Arsip & Buku Agenda</strong> saat Cetak/PDF
                                            </span>
                                        </label>
                                    ) : (
                                        <span className="text-xs text-slate-500">
                                            Mode baca: Cetak & unduh PDF tersedia
                                        </span>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2">
                                        {canWrite && (
                                            <button
                                                type="button"
                                                onClick={() => saveJobsToArchive(false)}
                                                disabled={!hasValidRecipientSelection}
                                                className="app-button-secondary px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                <i className="bi bi-archive"></i>
                                                <span>Catat ke Arsip Saja</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleDownloadPdf}
                                            disabled={isProcessingPrint || !hasValidRecipientSelection}
                                            className="app-button-secondary px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            <i className="bi bi-file-earmark-pdf text-rose-600"></i>
                                            <span>Unduh PDF</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePrintCertificates}
                                            disabled={isProcessingPrint || !hasValidRecipientSelection}
                                            className="app-button-primary px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            <i className="bi bi-printer-fill"></i>
                                            <span>
                                                Cetak Sekarang
                                                {certificateJobs.length > 1
                                                    ? ` (${certificateJobs.length})`
                                                    : ''}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Offscreen Full-Resolution Print Container for Single & Bulk Print / PDF */}
                    <div
                        style={{
                            position: 'fixed',
                            left: '-100000px',
                            top: 0,
                            width: '29.7cm',
                            pointerEvents: 'none',
                            zIndex: -1,
                        }}
                        aria-hidden="true"
                    >
                        <div id="sertifikat-batch-print-area">
                            {certificateJobs.map((job, idx) => (
                                <SertifikatCanvas
                                    key={job.key}
                                    snapshot={job.snapshot}
                                    settings={settings}
                                    pageBreakAfter={idx < certificateJobs.length - 1}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ===================================================================== */}
            {/* TAB 2: TEMPLATE & PRESET                                              */}
            {/* ===================================================================== */}
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <SectionCard
                        title="Template Kustom Pondok Anda"
                        description="Template sertifikat kustom yang Anda simpan agar kegiatan rutin (ujian mutun, daurah, lomba) dapat langsung dicetak ulang kapan saja."
                        contentClassName="p-5"
                    >
                        {customTemplates.length === 0 ? (
                            <EmptyState
                                icon="bi-bookmarks"
                                title="Belum Ada Template Kustom"
                                description="Atur desain, redaksi, dan penanda tangan di tab Buat Sertifikat lalu klik tombol Simpan Template untuk menyimpannya di sini."
                                actionLabel="Mulai Buat Sertifikat"
                                onAction={() => setActiveTab('buat')}
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {customTemplates.map((tpl) => {
                                    const thInfo =
                                        SERTIFIKAT_THEMES.find((t) => t.id === tpl.tema) ||
                                        SERTIFIKAT_THEMES[0];
                                    return (
                                        <div
                                            key={tpl.id}
                                            className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-4 hover:border-teal-300 transition-colors"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                                        {tpl.nama}
                                                    </h4>
                                                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                                                        {tpl.kodeNomor}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                                    <span
                                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${thInfo.badgeClass}`}
                                                    >
                                                        Tema: {thInfo.name}
                                                    </span>
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                                        {tpl.kategori}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-slate-700 truncate">
                                                    {tpl.judulDokumen}
                                                </p>
                                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                                                    Capaian: {tpl.capaianUtamaDefault}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        applyTemplate(tpl);
                                                        setActiveTab('buat');
                                                        showToast(
                                                            `Template "${tpl.nama}" dimuat ke editor.`,
                                                            'info'
                                                        );
                                                    }}
                                                    className="app-button-primary px-3.5 py-1.5 text-xs rounded-xl"
                                                >
                                                    Gunakan Template
                                                </button>
                                                {canWrite && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeleteCustomTemplate(tpl)
                                                        }
                                                        className="app-button-ghost h-8 w-8 rounded-full p-0 text-rose-600 hover:bg-rose-50"
                                                        title="Hapus Template"
                                                    >
                                                        <i className="bi bi-trash text-xs"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="6 Preset Bawaan Kegiatan Pondok Pesantren"
                        description="Paket siap pakai untuk Syahadah Mutun Ilmiyah, Tasmi’ Tahfizh Mandiri, Daurah Kitab, Perlombaan, hingga Piagam Apresiasi Asatidz."
                        contentClassName="p-5"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {DEFAULT_SERTIFIKAT_PRESETS.map((preset) => {
                                const thInfo =
                                    SERTIFIKAT_THEMES.find((t) => t.id === preset.tema) ||
                                    SERTIFIKAT_THEMES[0];
                                return (
                                    <div
                                        key={preset.id}
                                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between gap-4 hover:border-teal-300 hover:bg-white transition-colors"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                                    {preset.nama}
                                                </h4>
                                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shrink-0">
                                                    {preset.kodeNomor}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                                                <span
                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${thInfo.badgeClass}`}
                                                >
                                                    {thInfo.name}
                                                </span>
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                                                    {preset.signatoryCount} Penanda Tangan
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-800">
                                                {preset.judulDokumen}
                                            </p>
                                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                                                {preset.deskripsiCapaian}{' '}
                                                <strong>{preset.capaianUtamaDefault}</strong>
                                            </p>
                                        </div>

                                        <div className="pt-2 border-t border-slate-200/70 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    applyTemplate(preset);
                                                    setActiveTab('buat');
                                                    showToast(
                                                        `Preset "${preset.nama}" siap digunakan.`,
                                                        'info'
                                                    );
                                                }}
                                                className="app-button-secondary px-3.5 py-1.5 text-xs rounded-xl font-semibold"
                                            >
                                                Pakai Preset Ini <i className="bi bi-arrow-right ml-1"></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 3: ARSIP & BUKU AGENDA SERTIFIKAT                                 */}
            {/* ===================================================================== */}
            {activeTab === 'arsip' && (
                <div className="space-y-5">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="app-panel rounded-2xl p-4">
                            <div className="text-xs text-slate-500">Total Sertifikat Terbit</div>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                                {arsipSertifikatList.length}
                            </div>
                        </div>
                        <div className="app-panel rounded-2xl p-4">
                            <div className="text-xs text-slate-500">Syahadah Mutun & Kitab</div>
                            <div className="text-2xl font-black text-emerald-700 mt-1">
                                {
                                    arsipSertifikatList.filter(
                                        (a) =>
                                            a.sertifikatSnapshot?.kategori === 'Mutun' ||
                                            a.sertifikatSnapshot?.kategori === 'Daurah & Kitab'
                                    ).length
                                }
                            </div>
                        </div>
                        <div className="app-panel rounded-2xl p-4">
                            <div className="text-xs text-slate-500">Tahfizh Mandiri</div>
                            <div className="text-2xl font-black text-teal-700 mt-1">
                                {
                                    arsipSertifikatList.filter(
                                        (a) => a.sertifikatSnapshot?.kategori === 'Tahfizh'
                                    ).length
                                }
                            </div>
                        </div>
                        <div className="app-panel rounded-2xl p-4">
                            <div className="text-xs text-slate-500">Piagam Lomba & Apresiasi</div>
                            <div className="text-2xl font-black text-amber-700 mt-1">
                                {
                                    arsipSertifikatList.filter(
                                        (a) =>
                                            a.sertifikatSnapshot?.kategori === 'Perlombaan' ||
                                            a.sertifikatSnapshot?.kategori === 'Apresiasi'
                                    ).length
                                }
                            </div>
                        </div>
                    </div>

                    <SectionCard
                        title="Daftar Arsip Sertifikat & Buku Agenda"
                        description="Seluruh sertifikat yang dicatat di sini otomatis tersinkron ke Buku Agenda Surat Keluar Tata Usaha dan dapat dicetak ulang dalam format A4 Landscape."
                        contentClassName="p-5 space-y-4"
                    >
                        {/* Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                            <div className="lg:col-span-2 relative">
                                <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                <input
                                    type="text"
                                    value={searchArsip}
                                    onChange={(e) => setSearchArsip(e.target.value)}
                                    placeholder="Cari nomor sertifikat, nama penerima, atau kitab/lomba..."
                                    className="app-input w-full pl-9 pr-3 py-2 text-xs rounded-xl"
                                />
                            </div>
                            <select
                                value={filterKategoriArsip}
                                onChange={(e) => setFilterKategoriArsip(e.target.value)}
                                className="app-select w-full p-2 text-xs rounded-xl"
                            >
                                <option value="">Semua Kategori</option>
                                <option value="Mutun">Mutun Ilmiyah</option>
                                <option value="Tahfizh">Tahfizh Mandiri</option>
                                <option value="Daurah & Kitab">Daurah & Kitab</option>
                                <option value="Perlombaan">Perlombaan</option>
                                <option value="Apresiasi">Apresiasi</option>
                            </select>
                            <input
                                type="date"
                                value={filterStartArsip}
                                onChange={(e) => setFilterStartArsip(e.target.value)}
                                className="app-input w-full p-2 text-xs rounded-xl"
                                title="Dari Tanggal"
                            />
                            <input
                                type="date"
                                value={filterEndArsip}
                                onChange={(e) => setFilterEndArsip(e.target.value)}
                                className="app-input w-full p-2 text-xs rounded-xl"
                                title="Sampai Tanggal"
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>Menampilkan {filteredArsipSertifikat.length} arsip sertifikat</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setAgendaScope('all_surat');
                                    setIsAgendaModalOpen(true);
                                }}
                                className="text-teal-700 font-semibold hover:underline flex items-center gap-1"
                            >
                                <i className="bi bi-journal-album"></i> Lihat Buku Agenda Gabungan (Surat + Sertifikat)
                            </button>
                        </div>

                        {filteredArsipSertifikat.length === 0 ? (
                            <EmptyState
                                icon="bi-award"
                                title="Belum Ada Arsip Sertifikat"
                                description="Sertifikat dan piagam yang Anda terbitkan akan tercatat rapi beserta nomor urut agendanya di halaman ini."
                                actionLabel="Buat Sertifikat Pertama"
                                onAction={() => setActiveTab('buat')}
                            />
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Nomor & Tanggal</th>
                                            <th className="px-4 py-3 font-semibold">Penerima</th>
                                            <th className="px-4 py-3 font-semibold">Judul & Capaian</th>
                                            <th className="px-4 py-3 font-semibold">Kategori</th>
                                            <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredArsipSertifikat.map((item) => {
                                            const snap = item.sertifikatSnapshot;
                                            return (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-slate-50/70 transition-colors"
                                                >
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="font-mono font-bold text-slate-800">
                                                            {item.nomorSurat}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            {new Date(item.tanggalBuat).toLocaleDateString(
                                                                'id-ID',
                                                                {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                }
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="font-bold text-slate-900">
                                                            {snap?.namaPenerima || item.tujuan}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {item.tujuan}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-top max-w-xs">
                                                        <div className="font-semibold text-slate-800 truncate">
                                                            {snap?.judulDokumen || item.perihal}
                                                        </div>
                                                        {snap?.capaianUtama && (
                                                            <div className="text-[11px] text-teal-800 truncate mt-0.5">
                                                                {snap.capaianUtama}
                                                                {snap.showPredikat && snap.predikatValue
                                                                    ? ` • ${snap.predikatValue}`
                                                                    : ''}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <span className="inline-flex rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                                                            {snap?.kategori || 'Sertifikat'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setViewingArsipCert(item)
                                                                }
                                                                className="app-button-secondary px-2.5 py-1.5 text-[11px] rounded-lg"
                                                                title="Lihat & Cetak Ulang"
                                                            >
                                                                <i className="bi bi-printer mr-1"></i>
                                                                Lihat / Cetak
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setWaTargetArsip(item)
                                                                }
                                                                className="px-2.5 py-1.5 text-[11px] rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                                                title="Kirim Notifikasi WhatsApp"
                                                            >
                                                                <i className="bi bi-whatsapp"></i>
                                                            </button>
                                                            {canWrite && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        showConfirmation(
                                                                            'Hapus Arsip Sertifikat?',
                                                                            `Hapus arsip ${item.nomorSurat} atas nama ${item.tujuan} dari Buku Agenda?`,
                                                                            async () => {
                                                                                await onDeleteArsipSurat(
                                                                                    item.id
                                                                                );
                                                                                showToast(
                                                                                    'Arsip sertifikat dihapus.',
                                                                                    'success'
                                                                                );
                                                                            },
                                                                            {
                                                                                confirmColor: 'red',
                                                                                confirmText: 'Hapus',
                                                                            }
                                                                        );
                                                                    }}
                                                                    className="px-2.5 py-1.5 text-[11px] rounded-lg text-rose-600 hover:bg-rose-50"
                                                                    title="Hapus Arsip"
                                                                >
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}

            {/* ===================================================================== */}
            {/* MODAL: PILIH SANTRI (SINGLE / BULK)                                   */}
            {/* ===================================================================== */}
            <SuratSantriSelectorModal
                isOpen={isSantriSelectorOpen}
                onClose={() => setIsSantriSelectorOpen(false)}
                generationMode={recipientMode === 'bulk' ? 'bulk' : 'single'}
                onModeChange={(m) => {
                    setRecipientMode(m);
                    setPreviewIndex(0);
                }}
                selectedSantriId={selectedSantriId}
                onSelectSingle={(id) => {
                    setSelectedSantriId(id);
                    setPreviewIndex(0);
                }}
                bulkSelectedIds={bulkSelectedIds}
                onToggleBulkSelectOne={(id) => {
                    setBulkSelectedIds((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    );
                }}
                onToggleBulkSelectAll={(filteredIds) => {
                    const allSelected =
                        filteredIds.length > 0 &&
                        filteredIds.every((id) => bulkSelectedIds.includes(id));
                    if (allSelected) {
                        setBulkSelectedIds((prev) =>
                            prev.filter((id) => !filteredIds.includes(id))
                        );
                    } else {
                        setBulkSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                    }
                }}
                santriList={santriList}
                settings={settings}
                initialIncludeNonActive={false}
            />

            {/* ===================================================================== */}
            {/* MODAL: AI COMPOSER REDAKSI SERTIFIKAT                                 */}
            {/* ===================================================================== */}
            {isAiModalOpen && (
                <div
                    className="app-overlay fixed inset-0 z-[240] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
                    onClick={() => !isGeneratingAi && setIsAiModalOpen(false)}
                >
                    <div
                        className="app-modal w-full max-w-lg rounded-[24px] bg-white border border-slate-200 shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 bg-teal-50/70 px-6 py-4">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
                                    <i className="bi bi-stars"></i>
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        AI Penyusun Redaksi Sertifikat
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Otomatis menyusun judul, pengantar, narasi capaian, & doa yang proporsional
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAiModalOpen(false)}
                                disabled={isGeneratingAi}
                                className="app-button-ghost h-8 w-8 rounded-full p-0 text-slate-500"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Kegiatan / Capaian yang Ingin Dibuatkan Sertifikat
                                </label>
                                <textarea
                                    rows={3}
                                    value={aiKegiatanInput}
                                    onChange={(e) => setAiKegiatanInput(e.target.value)}
                                    placeholder="Contoh: Wisuda hafalan Matan Muqaddimah Al-Jazariyah 109 bait sekali duduk dengan sanad..."
                                    className="app-input w-full p-3 text-xs rounded-xl"
                                />
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {[
                                        'Khatam Hafalan Matan Tuhfatul Athfal 61 Bait',
                                        "Ujian Tasmi' Al-Qur'an 5 Juz Sekali Duduk",
                                        'Juara I Lomba Pidato Bahasa Arab Muhadharah Kubra',
                                        'Peserta Terbaik Daurah Kitab Safinatun Najah',
                                    ].map((sample) => (
                                        <button
                                            key={sample}
                                            type="button"
                                            onClick={() => setAiKegiatanInput(sample)}
                                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600 hover:border-teal-300 hover:text-teal-800"
                                        >
                                            {sample}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Gaya Bahasa Redaksi
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        {
                                            id: 'islami' as const,
                                            label: 'Khidmat & Doa',
                                            desc: 'Nuansa pesantren & keberkahan',
                                        },
                                        {
                                            id: 'akademik' as const,
                                            label: 'Formal Akademik',
                                            desc: 'Lugas & terukur resmi',
                                        },
                                        {
                                            id: 'apresiasi' as const,
                                            label: 'Apresiasi Lomba',
                                            desc: 'Membanggakan & memotivasi',
                                        },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setAiTone(opt.id)}
                                            className={`rounded-xl border p-2.5 text-left transition-all ${
                                                aiTone === opt.id
                                                    ? 'border-teal-600 bg-teal-50/80 ring-1 ring-teal-600'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-xs font-bold text-slate-800">
                                                {opt.label}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                                {opt.desc}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Instruksi Tambahan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={aiExtraInstruction}
                                    onChange={(e) => setAiExtraInstruction(e.target.value)}
                                    placeholder="cth: Sebutkan diselenggarakan pada bulan Ramadhan..."
                                    className="app-input w-full p-2.5 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
                            <button
                                type="button"
                                onClick={() => setIsAiModalOpen(false)}
                                disabled={isGeneratingAi}
                                className="app-button-secondary px-4 py-2 text-xs rounded-xl"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateAiRedaksi}
                                disabled={isGeneratingAi || !aiKegiatanInput.trim()}
                                className="app-button-primary px-5 py-2 text-xs rounded-xl flex items-center gap-2 disabled:opacity-50"
                            >
                                {isGeneratingAi ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <i className="bi bi-stars"></i>
                                )}
                                <span>
                                    {isGeneratingAi
                                        ? 'Menyusun Redaksi...'
                                        : 'Susun & Terapkan ke Sertifikat'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* MODAL: SIMPAN TEMPLATE KUSTOM                                         */}
            {/* ===================================================================== */}
            {isSaveTemplateModalOpen && (
                <div
                    className="app-overlay fixed inset-0 z-[240] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
                    onClick={() => setIsSaveTemplateModalOpen(false)}
                >
                    <div
                        className="app-modal w-full max-w-md rounded-[24px] bg-white border border-slate-200 shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="border-b border-slate-200 px-6 py-4">
                            <h3 className="text-base font-bold text-slate-900">
                                Simpan sebagai Template Sertifikat
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Menyimpan tema, redaksi, kode nomor ({kodeNomor}), dan susunan pejabat penanda tangan.
                            </p>
                        </div>
                        <div className="p-6 space-y-3">
                            <label className="block text-xs font-semibold text-slate-700">
                                Nama Template
                            </label>
                            <input
                                type="text"
                                value={templateNameInput}
                                onChange={(e) => setTemplateNameInput(e.target.value)}
                                placeholder="cth: Syahadah Mutun Tuhfatul Athfal"
                                className="app-input w-full p-2.5 text-sm rounded-xl"
                            />
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
                            <button
                                type="button"
                                onClick={() => setIsSaveTemplateModalOpen(false)}
                                className="app-button-secondary px-4 py-2 text-xs rounded-xl"
                            >
                                Batal
                            </button>
                            {editingCustomTemplateId && (
                                <button
                                    type="button"
                                    onClick={() => handleSaveCustomTemplate(true)}
                                    className="app-button-secondary px-4 py-2 text-xs rounded-xl"
                                >
                                    Simpan Baru
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => handleSaveCustomTemplate(false)}
                                className="app-button-primary px-5 py-2 text-xs rounded-xl"
                            >
                                {editingCustomTemplateId ? 'Perbarui Template' : 'Simpan Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* MODAL: PRATINJAU & CETAK ULANG ARSIP SERTIFIKAT                       */}
            {/* ===================================================================== */}
            {viewingArsipCert && viewingArsipCert.sertifikatSnapshot && (
                <div
                    className="app-overlay fixed inset-0 z-[240] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
                    onClick={() => setViewingArsipCert(null)}
                >
                    <div
                        className="app-modal flex h-[92vh] w-full max-w-6xl flex-col rounded-[28px] bg-white shadow-2xl overflow-hidden border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-6 py-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Arsip Sertifikat: {viewingArsipCert.nomorSurat}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Penerima: {viewingArsipCert.tujuan} • Tanggal:{' '}
                                    {new Date(viewingArsipCert.tanggalBuat).toLocaleDateString(
                                        'id-ID'
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const target = viewingArsipCert;
                                        setViewingArsipCert(null);
                                        setWaTargetArsip(target);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs rounded-xl flex items-center gap-1.5 font-medium"
                                >
                                    <i className="bi bi-whatsapp"></i> Kirim WA
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        printToPdfNative(
                                            'arsip-sertifikat-reprint-area',
                                            `Arsip_Sertifikat_${viewingArsipCert.nomorSurat.replace(
                                                /[\/\\:*?"<>|]/g,
                                                '-'
                                            )}`,
                                            { paperSize: 'A4', orientation: 'landscape' }
                                        )
                                    }
                                    className="app-button-primary px-4 py-2 text-xs rounded-xl flex items-center gap-1.5"
                                >
                                    <i className="bi bi-printer-fill"></i> Cetak Ulang (Landscape)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewingArsipCert(null)}
                                    className="app-button-ghost h-9 w-9 rounded-full p-0 text-slate-500"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-auto bg-slate-200/80 p-6 flex justify-center items-start">
                            <div id="arsip-sertifikat-reprint-area" className="shadow-xl">
                                <SertifikatCanvas
                                    snapshot={viewingArsipCert.sertifikatSnapshot}
                                    settings={settings}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* MODAL: BUKU AGENDA CETAK & WHATSAPP                                   */}
            {/* ===================================================================== */}
            <BukuAgendaPrintModal
                isOpen={isAgendaModalOpen}
                onClose={() => setIsAgendaModalOpen(false)}
                arsipList={
                    agendaScope === 'sertifikat_only' ? filteredArsipSertifikat : arsipSuratList
                }
                settings={settings}
                filterLabel={
                    agendaScope === 'sertifikat_only'
                        ? 'Khusus Sertifikat & Piagam Pendidikan'
                        : 'Gabungan Seluruh Surat Keluar & Sertifikat'
                }
                onToast={showToast}
            />

            {waTargetArsip && (
                <SuratWhatsAppModal
                    isOpen={Boolean(waTargetArsip)}
                    onClose={() => setWaTargetArsip(null)}
                    arsip={waTargetArsip}
                    santri={
                        waTargetArsip.santriId
                            ? santriList.find((s) => s.id === waTargetArsip.santriId) || null
                            : null
                    }
                    settings={settings}
                    onToast={showToast}
                />
            )}
        </div>
    );
};

export default SertifikatPiagam;
