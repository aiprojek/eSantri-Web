import { PondokSettings, PortalConfig } from '../types';
import { encodePortalKey, PORTAL_CIPHER_KEY } from '../services/portalGasService';

const THEME_PALETTES: Record<string, { primary: string; primaryDark: string; primaryLight: string; border: string; gradientFrom: string; gradientTo: string }> = {
    teal: { primary: '#0d9488', primaryDark: '#0f766e', primaryLight: '#f0fdfa', border: '#99f6e4', gradientFrom: '#0f766e', gradientTo: '#0e7490' },
    blue: { primary: '#2563eb', primaryDark: '#1d4ed8', primaryLight: '#eff6ff', border: '#bfdbfe', gradientFrom: '#1d4ed8', gradientTo: '#0284c7' },
    indigo: { primary: '#4f46e5', primaryDark: '#4338ca', primaryLight: '#eef2ff', border: '#c7d2fe', gradientFrom: '#4338ca', gradientTo: '#2563eb' },
    slate: { primary: '#334155', primaryDark: '#1e293b', primaryLight: '#f8fafc', border: '#cbd5e1', gradientFrom: '#1e293b', gradientTo: '#334155' },
    rose: { primary: '#e11d48', primaryDark: '#be123c', primaryLight: '#fff1f2', border: '#fecdd3', gradientFrom: '#be123c', gradientTo: '#db2777' },
    emerald: { primary: '#059669', primaryDark: '#047857', primaryLight: '#ecfdf5', border: '#a7f3d0', gradientFrom: '#047857', gradientTo: '#0d9488' },
    cyan: { primary: '#0891b2', primaryDark: '#0e7490', primaryLight: '#ecfeff', border: '#a5f3fc', gradientFrom: '#0e7490', gradientTo: '#0284c7' },
};

export const generateStandalonePortalHtml = (settings: PondokSettings, portalConfig: PortalConfig): string => {
    const portalId = (portalConfig.portalId || 'default-portal').trim();
    const gasEndpoint = (portalConfig.gasEndpoint || '').trim();
    const gasApiKey = (portalConfig.gasApiKey || '').trim();

    // Enkripsi kredensial GAS menjadi string tersamar (ep2_...)
    const encryptedVault = encodePortalKey(gasEndpoint, portalId, gasApiKey);
    const cipherKeyBytes = Array.from(new TextEncoder().encode(PORTAL_CIPHER_KEY));

    const themeKey = portalConfig.theme || 'teal';
    const palette = THEME_PALETTES[themeKey] || THEME_PALETTES.teal;

    const initialPublicSettings = {
        namaYayasan: settings.namaYayasan || '',
        namaPonpes: settings.namaPonpes || 'Pondok Pesantren',
        alamat: settings.alamat || '',
        telepon: settings.telepon || '',
        logoPonpesUrl: settings.logoPonpesUrl || '',
        tahunAjaranAktif: settings.tahunAjaranAktif || '',
        semesterAktif: settings.semesterAktif || 'Ganjil',
        jenjang: settings.jenjang || [],
        kelas: settings.kelas || [],
        rombel: settings.rombel || [],
        portalConfig: {
            theme: portalConfig.theme || 'teal',
            showFinance: portalConfig.showFinance !== false,
            showAcademic: portalConfig.showAcademic !== false,
            showAttendance: portalConfig.showAttendance !== false,
            showTahfizh: portalConfig.showTahfizh !== false,
            showHealth: portalConfig.showHealth !== false,
            showLibrary: portalConfig.showLibrary !== false,
            welcomeMessage: portalConfig.welcomeMessage || 'Selamat Datang di Portal Wali Santri',
            announcement: portalConfig.announcement || '',
            announcementPosts: portalConfig.announcementPosts || [],
            contacts: portalConfig.contacts || [],
            customLinks: portalConfig.customLinks || [],
        },
    };

    const safeInitialJson = JSON.stringify(initialPublicSettings).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Portal Wali Santri - ${(settings.namaPonpes || 'eSantri').replace(/"/g, '&quot;')}</title>
  <meta name="description" content="Portal informasi resmi wali santri ${(settings.namaPonpes || '').replace(/"/g, '&quot;')} - Keuangan, Akademik, Presensi, Tahfizh, Kesehatan & Perpustakaan." />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
  <style>
    :root {
      --p-color: ${palette.primary};
      --p-dark: ${palette.primaryDark};
      --p-light: ${palette.primaryLight};
      --p-border: ${palette.border};
      --p-grad-from: ${palette.gradientFrom};
      --p-grad-to: ${palette.gradientTo};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #ecfeff 50%, var(--p-light) 100%);
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .portal-shell {
      width: 100%;
      max-width: 480px;
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid var(--p-border);
      box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.14);
      padding: 28px 24px;
      transition: max-width 0.25s ease;
    }
    .portal-shell.is-dashboard { max-width: 960px; padding: 24px; }
    .logo-wrap {
      width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 12px;
      display: flex; align-items: center; justify-content: center;
      background: var(--p-color); color: #fff; font-size: 28px; font-weight: 800;
      box-shadow: 0 6px 16px rgba(0,0,0,0.08); border: 2px solid #f1f5f9; overflow: hidden;
    }
    .logo-wrap img { width: 100%; height: 100%; object-fit: contain; background: #fff; padding: 4px; }
    .eyebrow { color: #d97706; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; margin: 4px 0 6px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.25; }
    .subtitle { font-size: 13px; color: #64748b; line-height: 1.5; }
    .form-group { text-align: left; margin-bottom: 16px; }
    .form-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 6px; }
    .form-input {
      width: 100%; padding: 11px 14px; font-size: 14px; border-radius: 12px;
      border: 1px solid #cbd5e1; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-input:focus { border-color: var(--p-color); box-shadow: 0 0 0 3px var(--p-border); }
    .btn-primary {
      width: 100%; padding: 12px 18px; border: none; border-radius: 12px;
      background: var(--p-color); color: #fff; font-size: 14px; font-weight: 700;
      cursor: pointer; transition: background 0.2s, transform 0.1s;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-primary:hover { background: var(--p-dark); }
    .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
    .notice-box {
      margin-top: 12px; padding: 10px 14px; border-radius: 10px; font-size: 12px;
      background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; text-align: center;
    }
    .hero-banner {
      background: linear-gradient(135deg, var(--p-grad-from), var(--p-grad-to));
      color: #fff; border-radius: 18px; padding: 20px; text-align: left;
      display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px;
    }
    .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; }
    @media (min-width: 768px) { .kpi-grid { grid-template-columns: repeat(4, 1fr); } }
    .kpi-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; text-align: left;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .kpi-label { font-size: 11px; color: #64748b; font-weight: 600; }
    .kpi-val { font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .tab-bar {
      display: flex; gap: 8px; overflow-x: auto; padding: 10px; margin-top: 16px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
    }
    .tab-btn {
      flex-shrink: 0; padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 700;
      border: 1px solid #e2e8f0; background: #fff; color: #475569; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s;
    }
    .tab-btn.active { background: var(--p-color); color: #fff; border-color: var(--p-color); }
    .panel-card {
      margin-top: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
      padding: 18px; text-align: left;
    }
    .badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px;
      border-radius: 999px; font-size: 11px; font-weight: 700;
    }
    .table-clean { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    .table-clean th { background: #f8fafc; color: #475569; font-weight: 700; text-align: left; padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
    .table-clean td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .chip-link {
      display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
      border-radius: 999px; font-size: 11px; font-weight: 600; text-decoration: none;
      background: var(--p-light); color: var(--p-dark); border: 1px solid var(--p-border);
    }
    .info-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
    @media (min-width: 640px) { .info-grid { grid-template-columns: repeat(2, 1fr); } }
    .info-item { padding: 10px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .info-item-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .info-item-val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  </style>
</head>
<body>
  <div id="app" class="portal-shell"></div>

  <script>
    (function() {
      const __PORTAL_VAULT__ = "${encryptedVault}";
      const __KEY_BYTES__ = ${JSON.stringify(cipherKeyBytes)};
      let state = {
        settings: ${safeInitialJson},
        updatedAt: "",
        santriSummaryFallback: [],
        loggedInSantri: null,
        activeTab: "keuangan",
        nisInput: localStorage.getItem("esantri_saved_nis") || "",
        dobInput: "",
        rememberNis: true,
        isLoggingIn: false,
        loginNotice: "",
        syncStatus: "Memuat pembaruan..."
      };

      const PALETTES = ${JSON.stringify(THEME_PALETTES)};

      function applyTheme(themeId) {
        const p = PALETTES[themeId] || PALETTES.teal;
        const r = document.documentElement.style;
        r.setProperty('--p-color', p.primary);
        r.setProperty('--p-dark', p.primaryDark);
        r.setProperty('--p-light', p.primaryLight);
        r.setProperty('--p-border', p.border);
        r.setProperty('--p-grad-from', p.gradientFrom);
        r.setProperty('--p-grad-to', p.gradientTo);
      }

      function unlockVault(cipher) {
        try {
          if (!cipher || !cipher.startsWith("ep2_")) return null;
          let b64 = cipher.slice(4).replace(/-/g, "+").replace(/_/g, "/");
          while (b64.length % 4 !== 0) b64 += "=";
          const bin = atob(b64);
          const out = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) {
            out[i] = bin.charCodeAt(i) ^ __KEY_BYTES__[i % __KEY_BYTES__.length] ^ ((i * 31) & 0xff);
          }
          return JSON.parse(new TextDecoder().decode(out));
        } catch (e) {
          return null;
        }
      }

      function esc(str) {
        return String(str == null ? "" : str)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function formatRp(num) {
        return "Rp " + Number(num || 0).toLocaleString("id-ID");
      }

      function normalizeUrl(raw, icon) {
        const v = String(raw || "").trim();
        if (!v) return "#";
        const l = v.toLowerCase();
        if (l.startsWith("http://") || l.startsWith("https://") || l.startsWith("mailto:") || l.startsWith("tel:")) return v;
        if (l.startsWith("wa.me/") || l.startsWith("t.me/")) return "https://" + v;
        if (v.includes("@") && !v.includes(" ")) return "mailto:" + v;
        const digits = v.replace(/\\D/g, "");
        if (icon === "bi-whatsapp" && digits.length >= 8) {
          return "https://wa.me/" + (digits.startsWith("0") ? "62" + digits.slice(1) : digits);
        }
        if (icon === "bi-telephone" && digits.length >= 8) return "tel:" + digits;
        return "https://" + v;
      }

      async function initPortal() {
        const creds = unlockVault(__PORTAL_VAULT__);
        if (!creds || !creds.g) {
          state.syncStatus = "Mode Lokal";
          render();
          return;
        }
        try {
          const urlV2 = new URL(creds.g);
          urlV2.searchParams.set("action", "getPortalPublicInfo");
          urlV2.searchParams.set("portalId", creds.p);
          if (creds.t) urlV2.searchParams.set("apiKey", creds.t);
          const res = await fetch(urlV2.toString());
          const json = await res.json();
          if (json && json.success && json.data && json.data.settings) {
            state.settings = json.data.settings;
            state.updatedAt = json.updatedAt || (json.data.metadata && json.data.metadata.updatedAt) || "";
            state.syncStatus = "Terhubung";
            if (state.settings.portalConfig && state.settings.portalConfig.theme) {
              applyTheme(state.settings.portalConfig.theme);
            }
            render();
            return;
          }
          // Fallback GAS v1
          const urlV1 = new URL(creds.g);
          urlV1.searchParams.set("action", "getPortalConfig");
          urlV1.searchParams.set("portalId", creds.p);
          if (creds.t) urlV1.searchParams.set("apiKey", creds.t);
          const res1 = await fetch(urlV1.toString());
          const json1 = await res1.json();
          if (json1 && json1.success && json1.data) {
            state.settings = json1.data.settings || json1.data;
            state.santriSummaryFallback = json1.data.santriSummary || [];
            state.updatedAt = (json1.data.metadata && json1.data.metadata.updatedAt) || "";
            state.syncStatus = "Terhubung";
            if (state.settings.portalConfig && state.settings.portalConfig.theme) {
              applyTheme(state.settings.portalConfig.theme);
            }
          }
        } catch (err) {
          state.syncStatus = "Siap";
        }
        render();
      }

      async function handleLogin(e) {
        e.preventDefault();
        const nis = (state.nisInput || "").replace(/\\s+/g, "").toLowerCase();
        const dob = (state.dobInput || "").trim().slice(0, 10);
        if (!nis || !dob) {
          state.loginNotice = "Silakan isi NIS dan Tanggal Lahir santri terlebih dahulu.";
          render();
          return;
        }
        state.isLoggingIn = true;
        state.loginNotice = "";
        render();

        const creds = unlockVault(__PORTAL_VAULT__);
        try {
          if (creds && creds.g) {
            const url = new URL(creds.g);
            url.searchParams.set("action", "loginSantri");
            url.searchParams.set("portalId", creds.p);
            url.searchParams.set("nis", nis);
            url.searchParams.set("dob", dob);
            if (creds.t) url.searchParams.set("apiKey", creds.t);

            const res = await fetch(url.toString());
            const json = await res.json();
            if (json && json.success && json.data && json.data.santri) {
              if (state.rememberNis) localStorage.setItem("esantri_saved_nis", state.nisInput);
              state.loggedInSantri = json.data.santri;
              state.isLoggingIn = false;
              render();
              return;
            }
            if (json && json.success === false && json.message && !json.message.includes("Action GET tidak valid")) {
              state.loginNotice = json.message || "NIS atau Tanggal Lahir tidak sesuai.";
              state.isLoggingIn = false;
              render();
              return;
            }
          }

          // Fallback jika GAS masih versi v1
          const matched = (state.santriSummaryFallback || []).find(function(s) {
            const sNis = String(s.nis || "").replace(/\\s+/g, "").toLowerCase();
            const sDob = String(s.tanggalLahir || "").slice(0, 10);
            return sNis === nis && sDob === dob;
          });
          if (matched) {
            if (state.rememberNis) localStorage.setItem("esantri_saved_nis", state.nisInput);
            state.loggedInSantri = matched;
          } else {
            state.loginNotice = "NIS atau Tanggal Lahir tidak ditemukan. Pastikan data sudah disinkronkan oleh Admin.";
          }
        } catch (err) {
          state.loginNotice = "Gagal menghubungi server portal. Periksa koneksi internet Anda.";
        }
        state.isLoggingIn = false;
        render();
      }

      function renderAnnouncements(cfg) {
        let posts = (cfg.announcementPosts || []).filter(function(p) { return p && p.isPublished && (p.title || p.content); });
        if (posts.length === 0 && cfg.announcement && cfg.announcement.trim()) {
          posts = [{ id: "1", title: "Pengumuman Pondok", content: cfg.announcement.trim(), publishedAt: "" }];
        }
        if (posts.length === 0) return "";
        return '<div class="panel-card" style="background: var(--p-light); border-color: var(--p-border);">' +
          '<div style="font-size:12px;font-weight:800;color:var(--p-dark);margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
            '<i class="bi bi-megaphone-fill"></i> Pengumuman Resmi Pondok' +
          '</div>' +
          posts.slice(0, 3).map(function(p) {
            return '<div style="background:#fff;border:1px solid var(--p-border);border-radius:10px;padding:10px 12px;margin-top:6px;">' +
              '<div style="font-size:12px;font-weight:700;color:#0f172a;">' + esc(p.title || "Pengumuman") + '</div>' +
              '<div style="font-size:12px;color:#475569;white-space:pre-wrap;margin-top:3px;line-height:1.45;">' + esc(p.content) + '</div>' +
            '</div>';
          }).join("") +
        '</div>';
      }

      function renderActiveFeature(s, cfg) {
        const tab = state.activeTab;
        if (tab === "keuangan") {
          const bills = s.daftarTunggakan || [];
          const payments = s.pembayaranTerakhir || [];
          const mutations = s.mutasiTabungan || [];
          const totalUnpaid = s.totalTunggakan != null ? s.totalTunggakan : (s.tunggakanBulanIni || 0);
          return '<div class="panel-card">' +
            '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">' +
              '<div>' +
                '<div style="font-size:11px;color:#64748b;font-weight:600;">Total Tagihan Belum Lunas</div>' +
                '<div style="font-size:20px;font-weight:800;color:' + (totalUnpaid > 0 ? '#dc2626' : '#059669') + ';">' + formatRp(totalUnpaid) + '</div>' +
              '</div>' +
              '<span class="badge" style="background:' + (totalUnpaid > 0 ? '#fef2f2;color:#b91c1c' : '#ecfdf5;color:#047857') + ';">' +
                '<i class="bi ' + (totalUnpaid > 0 ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill') + '"></i> ' +
                (totalUnpaid > 0 ? bills.length + ' Tagihan Aktif' : 'Lunas / Tidak Ada Tunggakan') +
              '</span>' +
            '</div>' +
            (bills.length > 0 ? (
              '<div style="margin-top:14px;">' +
                '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">Rincian Tagihan Belum Lunas</div>' +
                '<div style="overflow-x:auto;"><table class="table-clean">' +
                  '<thead><tr><th>Deskripsi Tagihan</th><th>Periode</th><th style="text-align:right;">Nominal</th></tr></thead>' +
                  '<tbody>' + bills.map(function(b) {
                    const cicilNote = b.sudahDicicil ? ' <span style="font-size:10px;color:#059669;">(Dicicil ' + formatRp(b.sudahDicicil) + ')</span>' : '';
                    return '<tr><td style="font-weight:600;">' + esc(b.deskripsi) + cicilNote + '</td><td>' + esc(b.bulan + '/' + b.tahun) + '</td><td style="text-align:right;font-weight:700;color:#dc2626;">' + formatRp(b.nominal) + '</td></tr>';
                  }).join("") + '</tbody>' +
                '</table></div>' +
              '</div>'
            ) : '') +
            (payments.length > 0 ? (
              '<div style="margin-top:16px;">' +
                '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">5 Riwayat Pembayaran Terakhir</div>' +
                '<div style="overflow-x:auto;"><table class="table-clean">' +
                  '<thead><tr><th>Tanggal</th><th>Metode</th><th>Catatan</th><th style="text-align:right;">Jumlah</th></tr></thead>' +
                  '<tbody>' + payments.map(function(p) {
                    return '<tr><td>' + esc(p.tanggal) + '</td><td>' + esc(p.metode) + '</td><td>' + esc(p.catatan || "-") + '</td><td style="text-align:right;font-weight:700;color:#059669;">' + formatRp(p.jumlah) + '</td></tr>';
                  }).join("") + '</tbody>' +
                '</table></div>' +
              '</div>'
            ) : '') +
            (mutations.length > 0 ? (
              '<div style="margin-top:16px;">' +
                '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">Mutasi Tabungan / Uang Saku Terakhir (Saldo: ' + formatRp(s.saldoTabungan) + ')</div>' +
                '<div style="overflow-x:auto;"><table class="table-clean">' +
                  '<thead><tr><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th style="text-align:right;">Nominal</th></tr></thead>' +
                  '<tbody>' + mutations.map(function(m) {
                    return '<tr><td>' + esc(m.tanggal) + '</td><td>' + esc(m.jenis) + '</td><td>' + esc(m.keterangan) + '</td><td style="text-align:right;font-weight:700;color:' + (m.jenis === 'Deposit' ? '#059669' : '#d97706') + ';">' + (m.jenis === 'Deposit' ? '+' : '-') + formatRp(m.jumlah) + '</td></tr>';
                  }).join("") + '</tbody>' +
                '</table></div>' +
              '</div>'
            ) : '') +
          '</div>';
        }

        if (tab === "akademik") {
          const rapor = s.raporTerakhir || null;
          const catatan = s.catatanPembinaan || [];
          return '<div class="panel-card">' +
            '<div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:12px;"><i class="bi bi-mortarboard-fill" style="color:var(--p-color);"></i> Informasi Akademik & Keasramaan</div>' +
            '<div class="info-grid">' +
              '<div class="info-item"><div class="info-item-label">Jenjang / Marhalah</div><div class="info-item-val">' + esc(s.jenjangNama || "-") + '</div></div>' +
              '<div class="info-item"><div class="info-item-label">Kelas & Rombel</div><div class="info-item-val">' + esc((s.kelasNama || "-") + " • " + (s.rombelNama || "-")) + '</div></div>' +
              '<div class="info-item"><div class="info-item-label">Wali Kelas</div><div class="info-item-val">' + esc(s.waliKelasNama || "-") + '</div></div>' +
              '<div class="info-item"><div class="info-item-label">Gedung & Kamar Asrama</div><div class="info-item-val">' + esc((s.asramaNama || "-") + " / " + (s.kamarNama || "-")) + '</div></div>' +
              '<div class="info-item"><div class="info-item-label">Musyrif / Pembina Kamar</div><div class="info-item-val">' + esc(s.musyrifNama || "-") + '</div></div>' +
              '<div class="info-item"><div class="info-item-label">Status Santri</div><div class="info-item-val">' + esc(s.statusSantri || "Aktif") + '</div></div>' +
            '</div>' +
            (rapor ? (
              '<div style="margin-top:16px;padding:12px;border-radius:12px;background:var(--p-light);border:1px solid var(--p-border);">' +
                '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">' +
                  '<div style="font-size:12px;font-weight:800;color:var(--p-dark);">Ringkasan Rapor Terakhir (' + esc(rapor.semester) + ' - ' + esc(rapor.tahunAjaran) + ')</div>' +
                  '<span class="badge" style="background:var(--p-color);color:#fff;">Rata-rata: ' + esc(rapor.rataRata) + '</span>' +
                '</div>' +
                (rapor.mapel && rapor.mapel.length > 0 ? (
                  '<div style="overflow-x:auto;background:#fff;border-radius:8px;border:1px solid #e2e8f0;"><table class="table-clean">' +
                    '<thead><tr><th>Mata Pelajaran</th><th style="text-align:right;">Nilai</th><th>Predikat</th></tr></thead>' +
                    '<tbody>' + rapor.mapel.map(function(m) {
                      return '<tr><td style="font-weight:600;">' + esc(m.nama) + '</td><td style="text-align:right;font-weight:700;color:var(--p-dark);">' + esc(m.nilai) + '</td><td>' + esc(m.predikat || "-") + '</td></tr>';
                    }).join("") + '</tbody>' +
                  '</table></div>'
                ) : '') +
                (rapor.catatanWaliKelas ? '<div style="margin-top:8px;font-size:11px;color:#475569;font-style:italic;">Catatan Wali Kelas: "' + esc(rapor.catatanWaliKelas) + '"</div>' : '') +
              '</div>'
            ) : '') +
            (catatan.length > 0 ? (
              '<div style="margin-top:16px;">' +
                '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">Catatan Prestasi & Pembinaan Santri</div>' +
                '<div style="overflow-x:auto;"><table class="table-clean">' +
                  '<thead><tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Tindak Lanjut / Keterangan</th></tr></thead>' +
                  '<tbody>' + catatan.map(function(c) {
                    const isPres = c.kategori === 'Prestasi';
                    return '<tr><td>' + esc(c.tanggal) + '</td><td><span class="badge" style="background:' + (isPres ? '#ecfdf5;color:#047857' : '#fffbeb;color:#b45309') + ';">' + esc(c.kategori) + '</span></td><td style="font-weight:600;">' + esc(c.deskripsi) + '</td><td>' + esc(c.tindakLanjut || "-") + '</td></tr>';
                  }).join("") + '</tbody>' +
                '</table></div>' +
              '</div>'
            ) : '') +
          '</div>';
        }

        if (tab === "presensi") {
          const r = s.rekapBulanIni || { hadir: 0, sakit: 0, izin: 0, alpha: 0, bulanLabel: "Bulan Ini" };
          return '<div class="panel-card">' +
            '<div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:12px;"><i class="bi bi-calendar-check-fill" style="color:var(--p-color);"></i> Rekap Kehadiran (' + esc(r.bulanLabel || "Bulan Berjalan") + ')</div>' +
            '<div class="kpi-grid" style="margin-top:0;">' +
              '<div class="kpi-card" style="background:#ecfdf5;border-color:#a7f3d0;"><div class="kpi-label" style="color:#047857;">Hadir (H)</div><div class="kpi-val" style="color:#065f46;">' + Number(r.hadir || 0) + ' Hari</div></div>' +
              '<div class="kpi-card" style="background:#eff6ff;border-color:#bfdbfe;"><div class="kpi-label" style="color:#1d4ed8;">Sakit (S)</div><div class="kpi-val" style="color:#1e40af;">' + Number(r.sakit || 0) + ' Hari</div></div>' +
              '<div class="kpi-card" style="background:#fffbeb;border-color:#fde68a;"><div class="kpi-label" style="color:#b45309;">Izin (I)</div><div class="kpi-val" style="color:#92400e;">' + Number(r.izin || 0) + ' Hari</div></div>' +
              '<div class="kpi-card" style="background:#fef2f2;border-color:#fecaca;"><div class="kpi-label" style="color:#b91c1c;">Alpha (A)</div><div class="kpi-val" style="color:#991b1b;">' + Number(r.alpha || 0) + ' Hari</div></div>' +
            '</div>' +
          '</div>';
        }

        if (tab === "tahfizh") {
          const list = s.riwayatTahfizh || (s.tahfizhTerakhir ? [s.tahfizhTerakhir] : []);
          return '<div class="panel-card">' +
            '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">' +
              '<div style="font-size:13px;font-weight:800;color:#0f172a;"><i class="bi bi-book-half" style="color:var(--p-color);"></i> Riwayat Setoran & Ujian Tahfizh Terakhir</div>' +
              '<div style="display:flex;gap:6px;">' +
                (s.totalJuzHafalan ? '<span class="badge" style="background:#ecfdf5;color:#047857;">Capaian: ' + esc(s.totalJuzHafalan) + ' Juz</span>' : '') +
                (s.targetJuz ? '<span class="badge" style="background:var(--p-light);color:var(--p-dark);">Target: ' + esc(s.targetJuz) + ' Juz</span>' : '') +
              '</div>' +
            '</div>' +
            (list.length > 0 ? (
              '<div style="overflow-x:auto;"><table class="table-clean">' +
                '<thead><tr><th>Tanggal</th><th>Tipe</th><th>Surah & Ayat</th><th>Predikat</th></tr></thead>' +
                '<tbody>' + list.map(function(t) {
                  return '<tr><td>' + esc(t.tanggal) + '</td><td><span class="badge" style="background:#f1f5f9;color:#334155;">' + esc(t.tipe) + '</span></td><td style="font-weight:600;">' + esc(t.surah + " (" + t.ayat + ")") + '</td><td>' + esc(t.predikat || "-") + '</td></tr>';
                }).join("") + '</tbody>' +
              '</table></div>'
            ) : '<div style="font-size:12px;color:#64748b;">Belum ada riwayat setoran tahfizh yang tercatat.</div>') +
          '</div>';
        }

        if (tab === "kesehatan") {
          const list = s.riwayatKesehatan || (s.kesehatanTerakhir ? [s.kesehatanTerakhir] : []);
          return '<div class="panel-card">' +
            '<div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:10px;"><i class="bi bi-heart-pulse-fill" style="color:#e11d48;"></i> Riwayat Pemeriksaan Poskestren</div>' +
            (list.length > 0 ? (
              '<div style="overflow-x:auto;"><table class="table-clean">' +
                '<thead><tr><th>Tanggal</th><th>Keluhan / Diagnosa</th><th>Tindakan</th><th>Status</th></tr></thead>' +
                '<tbody>' + list.map(function(k) {
                  return '<tr><td>' + esc(k.tanggal) + '</td><td style="font-weight:600;">' + esc((k.diagnosa || k.keluhan || "-")) + '</td><td>' + esc(k.tindakan || "-") + '</td><td><span class="badge" style="background:#fff1f2;color:#be123c;">' + esc(k.status) + '</span></td></tr>';
                }).join("") + '</tbody>' +
              '</table></div>'
            ) : '<div style="font-size:12px;color:#64748b;">Alhamdulillah, tidak ada catatan pemeriksaan sakit terbaru.</div>') +
          '</div>';
        }

        if (tab === "perpus") {
          const books = s.daftarPinjamanBuku || [];
          return '<div class="panel-card">' +
            '<div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:10px;"><i class="bi bi-journal-bookmark-fill" style="color:var(--p-color);"></i> Pinjaman Buku Perpustakaan Aktif (' + Number(s.pinjamanBukuAktif || 0) + ' Buku)</div>' +
            (books.length > 0 ? (
              '<div style="overflow-x:auto;"><table class="table-clean">' +
                '<thead><tr><th>Kode</th><th>Judul Buku / Kitab</th><th>Tgl Pinjam</th><th>Batas Kembali</th></tr></thead>' +
                '<tbody>' + books.map(function(b) {
                  return '<tr><td>' + esc(b.kodeBuku) + '</td><td style="font-weight:600;">' + esc(b.judul) + '</td><td>' + esc(b.tanggalPinjam) + '</td><td>' + esc(b.tanggalKembaliSeharusnya) + '</td></tr>';
                }).join("") + '</tbody>' +
              '</table></div>'
            ) : '<div style="font-size:12px;color:#64748b;">Tidak ada pinjaman buku perpustakaan yang sedang aktif.</div>') +
          '</div>';
        }
        return "";
      }

      function render() {
        const root = document.getElementById("app");
        if (!root) return;
        const cfg = (state.settings && state.settings.portalConfig) || {};
        const contacts = cfg.contacts || [];
        const links = cfg.customLinks || [];
        const logoHtml = state.settings.logoPonpesUrl
          ? '<div class="logo-wrap"><img src="' + esc(state.settings.logoPonpesUrl) + '" alt="Logo" referrerpolicy="no-referrer" /></div>'
          : '<div class="logo-wrap">' + esc((state.settings.namaPonpes || "E").charAt(0)) + '</div>';

        if (!state.loggedInSantri) {
          root.className = "portal-shell";
          root.innerHTML =
            '<div style="text-align:center;margin-bottom:20px;">' +
              logoHtml +
              '<div class="title">' + esc(state.settings.namaPonpes || "Pondok Pesantren") + '</div>' +
              '<div class="eyebrow">Portal Resmi Wali Santri</div>' +
              '<div class="subtitle">' + esc(cfg.welcomeMessage || "Selamat Datang di Portal Wali Santri") + '</div>' +
            '</div>' +
            '<form id="portal-login-form">' +
              '<div class="form-group">' +
                '<label class="form-label">NIS / Nomor Induk Santri</label>' +
                '<input id="inp-nis" type="text" class="form-input" placeholder="Contoh: 2024001" value="' + esc(state.nisInput) + '" required />' +
              '</div>' +
              '<div class="form-group">' +
                '<label class="form-label">Tanggal Lahir Santri</label>' +
                '<input id="inp-dob" type="date" class="form-input" value="' + esc(state.dobInput) + '" required />' +
              '</div>' +
              '<button type="submit" class="btn-primary" ' + (state.isLoggingIn ? 'disabled' : '') + '>' +
                '<i class="bi bi-shield-lock-fill"></i> ' + (state.isLoggingIn ? 'Memverifikasi Data...' : 'Masuk Portal Wali') +
              '</button>' +
              (state.loginNotice ? '<div class="notice-box">' + esc(state.loginNotice) + '</div>' : '') +
            '</form>' +
            (contacts.length > 0 ? (
              '<div style="margin-top:22px;padding-top:16px;border-top:1px solid #f1f5f9;text-align:center;">' +
                '<div style="font-size:11px;color:#64748b;margin-bottom:10px;">Butuh bantuan? Hubungi pengurus pondok:</div>' +
                '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">' +
                  contacts.map(function(c) {
                    return '<a class="chip-link" target="_blank" rel="noreferrer" href="' + esc(normalizeUrl(c.value, c.icon)) + '">' +
                      '<i class="bi ' + esc(c.icon || "bi-whatsapp") + '"></i><span>' + esc(c.label || "Kontak") + '</span></a>';
                  }).join("") +
                '</div>' +
              '</div>'
            ) : '') +
            '<div style="margin-top:20px;padding-top:12px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;">' +
              'Terhubung Aman (Encrypted Bridge) • eSantri Web' +
            '</div>';

          const form = document.getElementById("portal-login-form");
          const inpNis = document.getElementById("inp-nis");
          const inpDob = document.getElementById("inp-dob");
          if (inpNis) inpNis.addEventListener("input", function(ev) { state.nisInput = ev.target.value; });
          if (inpDob) inpDob.addEventListener("input", function(ev) { state.dobInput = ev.target.value; });
          if (form) form.addEventListener("submit", handleLogin);
          return;
        }

        // Dashboard View
        root.className = "portal-shell is-dashboard";
        const s = state.loggedInSantri;
        const totalUnpaid = s.totalTunggakan != null ? s.totalTunggakan : (s.tunggakanBulanIni || 0);
        const tabs = [];
        if (cfg.showFinance !== false) tabs.push({ key: "keuangan", label: "Keuangan", icon: "bi-cash-stack" });
        if (cfg.showAcademic !== false) tabs.push({ key: "akademik", label: "Akademik & Asrama", icon: "bi-mortarboard" });
        if (cfg.showAttendance !== false) tabs.push({ key: "presensi", label: "Presensi", icon: "bi-calendar-check" });
        if (cfg.showTahfizh !== false) tabs.push({ key: "tahfizh", label: "Tahfizh", icon: "bi-book" });
        if (cfg.showHealth !== false) tabs.push({ key: "kesehatan", label: "Kesehatan", icon: "bi-heart-pulse" });
        if (cfg.showLibrary !== false) tabs.push({ key: "perpus", label: "Perpustakaan", icon: "bi-journal-bookmark" });

        root.innerHTML =
          '<div class="hero-banner">' +
            '<div>' +
              '<div style="font-size:12px;opacity:0.85;font-weight:600;">Ahlan wa Sahlan, Wali dari Santri:</div>' +
              '<div style="font-size:22px;font-weight:800;margin-top:2px;">' + esc(s.namaLengkap) + '</div>' +
              '<div style="font-size:12px;opacity:0.9;margin-top:4px;">NIS: ' + esc(s.nis) + ' • ' + esc(s.jenjangNama || "") + ' ' + esc(s.rombelNama || "") + ' • Wali: ' + esc(s.namaWali || "-") + '</div>' +
              (state.updatedAt ? '<div style="font-size:10px;opacity:0.75;margin-top:4px;"><i class="bi bi-clock-history"></i> Sinkronisasi Terakhir: ' + esc(new Date(state.updatedAt).toLocaleString("id-ID")) + '</div>' : '') +
            '</div>' +
            '<button id="btn-logout" style="background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.3);color:#fff;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">' +
              '<i class="bi bi-box-arrow-right"></i> Keluar' +
            '</button>' +
          '</div>' +
          '<div class="kpi-grid">' +
            '<div class="kpi-card"><div class="kpi-label">Total Tunggakan</div><div class="kpi-val" style="color:' + (totalUnpaid > 0 ? '#dc2626' : '#059669') + ';">' + formatRp(totalUnpaid) + '</div></div>' +
            '<div class="kpi-card"><div class="kpi-label">Saldo Tabungan</div><div class="kpi-val">' + formatRp(s.saldoTabungan) + '</div></div>' +
            '<div class="kpi-card"><div class="kpi-label">Presensi Hari Ini</div><div class="kpi-val">' + esc(s.attendanceToday || "Belum Absen") + '</div></div>' +
            '<div class="kpi-card"><div class="kpi-label">Pinjaman Buku</div><div class="kpi-val">' + Number(s.pinjamanBukuAktif || 0) + ' Buku</div></div>' +
          '</div>' +
          renderAnnouncements(cfg) +
          '<div class="tab-bar">' +
            tabs.map(function(t) {
              return '<button type="button" data-tab="' + t.key + '" class="tab-btn ' + (state.activeTab === t.key ? 'active' : '') + '">' +
                '<i class="bi ' + t.icon + '"></i> ' + esc(t.label) +
              '</button>';
            }).join("") +
          '</div>' +
          renderActiveFeature(s, cfg) +
          (links.length > 0 ? (
            '<div class="panel-card">' +
              '<div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:8px;">Tautan & Dokumen Penting</div>' +
              '<div class="info-grid">' +
                links.map(function(l) {
                  return '<a target="_blank" rel="noreferrer" href="' + esc(normalizeUrl(l.url)) + '" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#1e293b;text-decoration:none;font-size:12px;font-weight:600;">' +
                    '<span>' + esc(l.label || "Link") + '</span><i class="bi bi-box-arrow-up-right"></i></a>';
                }).join("") +
              '</div>' +
            '</div>'
          ) : '') +
          '<div style="margin-top:20px;padding-top:12px;border-top:1px solid #f1f5f9;text-align:center;font-size:11px;color:#94a3b8;">' +
            'Portal Resmi ' + esc(state.settings.namaPonpes) + ' • Didukung oleh eSantri Web' +
          '</div>';

        const btnLogout = document.getElementById("btn-logout");
        if (btnLogout) {
          btnLogout.addEventListener("click", function() {
            state.loggedInSantri = null;
            state.dobInput = "";
            render();
          });
        }

        const tabBtns = root.querySelectorAll("[data-tab]");
        tabBtns.forEach(function(btn) {
          btn.addEventListener("click", function() {
            state.activeTab = btn.getAttribute("data-tab") || "keuangan";
            render();
          });
        });
      }

      initPortal();
    })();
  </script>
</body>
</html>`;
};

export const downloadStandalonePortalHtml = (settings: PondokSettings): void => {
    const portalConfig: PortalConfig = settings.portalConfig || {
        enabled: true,
        provider: 'gas',
        portalId: 'default-portal',
        gasEndpoint: '',
        gasApiKey: '',
        theme: 'teal',
        showFinance: true,
        showAcademic: true,
        showAttendance: true,
        showTahfizh: true,
        showHealth: true,
        showLibrary: true,
        welcomeMessage: 'Selamat Datang di Portal Wali Santri',
        announcement: '',
        announcementPosts: [],
        contacts: [],
        customLinks: [],
        baseUrl: ''
    };
    const htmlContent = generateStandalonePortalHtml(settings, portalConfig);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
};

