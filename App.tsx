
import React, { useState, useEffect, Suspense } from 'react';
import { AppProvider, useAppContext, ToastData } from './AppContext';
import { SantriProvider } from './contexts/SantriContext';
import { FinanceProvider } from './contexts/FinanceContext';
import { UIProvider } from './contexts/UIContext';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { FirebaseProvider } from './contexts/FirebaseContext';

import Sidebar from './components/Sidebar';
import ConfirmModal from './components/ConfirmModal';
import WelcomeModal from './components/WelcomeModal';
import UpdateNotification from './components/UpdateNotification';
import { BackupReminderModal } from './components/BackupReminderModal';
import { LoginScreen } from './components/Login'; 
import { Page, UserPermissions, SantriFilters } from './types';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingFallback } from './components/common/LoadingFallback';

// --- Lazy Load Pages ---
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const SantriList = React.lazy(() => import('./components/SantriList'));
const DataMaster = React.lazy(() => import('./components/DataMaster'));
const Settings = React.lazy(() => import('./components/Settings'));
const Reports = React.lazy(() => import('./components/Reports'));
const Finance = React.lazy(() => import('./components/Finance'));
const Asrama = React.lazy(() => import('./components/Asrama'));
const BukuKas = React.lazy(() => import('./components/BukuKas'));
const SuratMenyurat = React.lazy(() => import('./components/SuratMenyurat'));
const PSB = React.lazy(() => import('./components/PSB'));
const Tentang = React.lazy(() => import('./components/Tentang'));
const Akademik = React.lazy(() => import('./components/Akademik'));
const Kurikulum = React.lazy(() => import('./components/Kurikulum'));
const Rapor = React.lazy(() => import('./components/Rapor'));
const Absensi = React.lazy(() => import('./components/Absensi'));
const Tahfizh = React.lazy(() => import('./components/Tahfizh'));
const Sarpras = React.lazy(() => import('./components/Sarpras'));
const Kalender = React.lazy(() => import('./components/Kalender'));
const Perpustakaan = React.lazy(() => import('./components/Perpustakaan')); 
const Kesehatan = React.lazy(() => import('./components/Kesehatan')); 
const BK = React.lazy(() => import('./components/BK'));
const BukuTamu = React.lazy(() => import('./components/BukuTamu')); 
const Koperasi = React.lazy(() => import('./components/Koperasi')); 
const PublicPortal = React.lazy(() => import('./components/portal/PublicPortal').then(module => ({ default: module.PublicPortal })));

const AuditLogView = React.lazy(() => import('./components/AuditLogView').then(module => ({ default: module.AuditLogView })));
const WhatsAppCenter = React.lazy(() => import('./components/WhatsAppCenter').then(module => ({ default: module.WhatsAppCenter })));
const AdminSyncDashboard = React.lazy(() => import('./components/AdminSyncDashboard').then(module => ({ default: module.AdminSyncDashboard })));

// --- Alert Modal Component ---
interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, title, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="app-overlay fixed inset-0 z-[150] flex items-center justify-center p-4" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="app-modal w-full max-w-md rounded-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-app-border p-5">
            <h3 className="text-lg font-semibold text-app-text">{title}</h3>
            <button onClick={onClose} type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-app-border bg-white text-app-textMuted transition-colors hover:bg-teal-50 hover:text-app-text"><i className="bi bi-x-lg text-xl"></i></button>
        </div>
        <div className="p-6">
          <p className="whitespace-pre-wrap text-sm app-text-secondary">{message}</p>
        </div>
        <div className="flex justify-end rounded-b-panel border-t border-app-border bg-slate-50/80 px-6 py-4">
          <button onClick={onClose} type="button" className="app-button-primary px-5 py-2.5">
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Toast Components ---
interface ToastProps extends ToastData {
  onClose: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 4000); 

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onClose(id);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isExiting, id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
  };

  const baseClasses = "app-panel-elevated mb-4 flex w-full max-w-xs items-center rounded-[20px] p-4 text-app-textSecondary transition-all duration-300 ease-in-out transform";
  const animationClasses = isExiting 
    ? "opacity-0 translate-x-full" 
    : "opacity-100 translate-x-0";

  const typeConfig = {
    success: { icon: 'bi-check-circle-fill', color: 'text-app-success bg-app-success/10 border border-app-success/20' },
    error: { icon: 'bi-x-circle-fill', color: 'text-app-danger bg-app-danger/10 border border-app-danger/20' },
    info: { icon: 'bi-info-circle-fill', color: 'text-app-primary bg-app-primary/10 border border-app-primary/20' },
  };

  const { icon, color } = typeConfig[type];

  return (
    <div className={`${baseClasses} ${animationClasses}`}>
      <div className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${color}`}>
        <i className={`bi ${icon} text-lg`}></i>
      </div>
      <div className="ml-3 text-sm font-normal text-app-text">{message}</div>
      <button
        type="button"
        className="ml-auto -my-1.5 -mx-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent p-1.5 text-app-textMuted hover:border-app-border hover:bg-teal-50 hover:text-app-text"
        onClick={handleClose}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <i className="bi bi-x-lg"></i>
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts = [], onClose }) => {
  return (
    <div className="fixed inset-x-4 top-4 z-[260] flex flex-col items-stretch md:right-5 md:left-auto md:top-5 md:items-end">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

// --- Access Denied Component ---
const AccessDenied: React.FC = () => (
    <div className="app-panel flex h-full min-h-[60vh] flex-col items-center justify-center rounded-panel p-6 text-center animate-fade-in">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-app-danger/25 bg-app-danger/10 text-app-danger">
            <i className="bi bi-shield-lock-fill text-4xl"></i>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-app-text">Akses Ditolak</h2>
        <p className="max-w-md app-text-secondary">
            Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi Administrator jika Anda memerlukan akses.
        </p>
    </div>
);

const AppContent: React.FC = () => {
    const { 
        isLoading, 
        toasts, 
        removeToast,
        alertModal,
        hideAlert,
        confirmation,
        hideConfirmation,
        setSantriFilters,
        backupModal,
        closeBackupModal,
        downloadBackup,
        triggerBackupCheck,
        settings, 
        currentUser,
        isAuthReady,
        showToast,
        showConfirmation,
        logout,
        triggerManualSync,
        syncStatus,
        pendingChanges,
    } = useAppContext();

    const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
    const [tentangTab, setTentangTab] = useState<'tentang' | 'panduan' | 'faq' | 'rilis' | 'kontak' | 'lisensi' | 'layanan'>('tentang');
    const [panduanSection, setPanduanSection] = useState<string | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSyncMenu, setShowSyncMenu] = useState(false);

    const canManageSync = !!(currentUser?.role === 'admin' || currentUser?.permissions?.syncAdmin);

    useEffect(() => {
        const welcomeShown = localStorage.getItem('eSantriWelcomeShown');
        if (welcomeShown !== 'true' && !settings.multiUserMode) {
            setShowWelcomeModal(true);
        }
    }, [settings.multiUserMode]);

    useEffect(() => {
        if (!isLoading) {
            triggerBackupCheck();
        }
    }, [isLoading, triggerBackupCheck]);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        if (import.meta.env.DEV) {
            navigator.serviceWorker.getRegistrations()
                .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
                .catch(error => {
                    console.warn('Service Worker cleanup failed in dev mode:', error);
                });
            return;
        }

        navigator.serviceWorker.register('/sw.js').then(registration => {
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (registration.waiting) {
                                setWaitingWorker(registration.waiting);
                            }
                        }
                    });
                }
            });
        }).catch(error => {
            console.warn('Service Worker registration failed:', error);
        });
        
        let refreshing = false;
        const handleControllerChange = () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        };
    }, []);

    useEffect(() => {
        const handleOpenPanduan = (e: any) => {
            setCurrentPage(Page.Tentang);
            setTentangTab('panduan');
            if (e.detail) {
                setPanduanSection(e.detail);
            }
        };

        window.addEventListener('open-panduan', handleOpenPanduan);
        return () => window.removeEventListener('open-panduan', handleOpenPanduan);
    }, []);

    useEffect(() => {
        const handleDismissMenus = () => {
            setShowUserMenu(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowUserMenu(false);
                setShowSyncMenu(false);
            }
        };

        window.addEventListener('click', handleDismissMenus);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('click', handleDismissMenus);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleCloseWelcomeModal = () => {
        localStorage.setItem('eSantriWelcomeShown', 'true');
        setShowWelcomeModal(false);
    };

    const handleGoToGuide = () => {
        handleCloseWelcomeModal();
        setCurrentPage(Page.Tentang);
    };

    const handleNavigate = (page: Page, filters: Partial<SantriFilters> = {}) => {
        if (Object.keys(filters).length > 0) {
            setSantriFilters((prev: SantriFilters) => ({ ...prev, ...filters }));
        }
        setCurrentPage(page);
    };

    const handleSetPage = (page: Page) => {
        setCurrentPage(page);
        setSidebarOpen(false);
    };
    
    const handleUpdate = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    const handleSyncClick = () => {
        const config = settings.cloudSyncConfig;
        if (!config || config.provider === 'none') {
            showToast('Fitur Cloud belum aktif. Silakan hubungkan Cloud Storage di menu Pengaturan.', 'error');
            setCurrentPage(Page.Pengaturan);
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('change-settings-tab', { detail: 'cloud' }));
            }, 0);
            return;
        }

        if (config.provider === 'firebase') {
            showToast('Firebase Real-time aktif. Data disinkronkan secara otomatis.', 'info');
            return;
        }

        setShowSyncMenu(true);
    };

    const executeSync = (action: 'up' | 'down' | 'admin_publish') => {
        setShowSyncMenu(false);
        let title = '';
        let message = '';
        let confirmColor = 'blue';

        if (action === 'admin_publish') {
            title = 'Publikasikan Master Data?';
            message = 'Tindakan ini akan mengirim seluruh database lokal Anda ke Cloud sebagai "Master Data" yang baru. Pastikan Anda sudah menggabungkan semua update dari staff.';
        } else if (action === 'up') {
            title = 'Kirim Perubahan?';
            message = 'Data perubahan lokal Anda akan dikirim ke Inbox Admin di Cloud.';
        } else {
            title = 'Ambil Master Data?';
            message = 'Aplikasi akan mengunduh Master Data terbaru dari Admin. Data lokal yang lebih baru tidak akan tertimpa.';
            confirmColor = 'orange';
        }

        showConfirmation(
            title,
            message,
            async () => {
                await triggerManualSync(action);
            },
            { confirmText: 'Ya, Lanjutkan', confirmColor }
        );
    };

    const handleOpenProfile = () => {
        setShowUserMenu(false);
        setCurrentPage(Page.Pengaturan);
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('change-settings-tab', { detail: 'akun' }));
        }, 0);
    };

    const handleLogout = () => {
        setShowUserMenu(false);
        if (!settings.multiUserMode) {
            showConfirmation(
                'Mode Multi-User Belum Aktif',
                'Logout belum dapat digunakan saat aplikasi masih berjalan sebagai Admin Tunggal. Aktifkan dulu mode multi-user, lalu catat kode pemulihan, pertanyaan pemulihan, dan password yang Anda buat agar akses admin tetap aman.',
                () => {
                    setCurrentPage(Page.Pengaturan);
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('change-settings-tab', { detail: 'akun' }));
                    }, 0);
                },
                { confirmText: 'Buka Pengaturan Akun', confirmColor: 'blue' }
            );
            return;
        }
        showConfirmation('Logout', 'Anda yakin ingin keluar?', () => { logout(); }, { confirmText: 'Keluar', confirmColor: 'red' });
    };

    const renderSyncButtonLabel = () => {
        if (settings.cloudSyncConfig?.provider === 'firebase') {
            return <i className="bi bi-cloud-check-fill text-app-success"></i>;
        }
        if (syncStatus === 'syncing') {
            return <span className="h-4 w-4 animate-spin rounded-full border-2 border-app-textMuted border-t-transparent"></span>;
        }
        if (syncStatus === 'error') {
            return <i className="bi bi-exclamation-triangle-fill text-app-danger"></i>;
        }
        return <i className="bi bi-cloud-arrow-up"></i>;
    };

    const getSyncSummary = () => {
        if (!settings.cloudSyncConfig?.provider || settings.cloudSyncConfig.provider === 'none') {
            return { title: 'Cloud belum aktif', detail: 'Hubungkan penyimpanan' };
        }
        if (settings.cloudSyncConfig.provider === 'firebase') {
            return { title: 'Firebase aktif', detail: 'Sinkron otomatis' };
        }
        if (syncStatus === 'syncing') {
            return { title: 'Menyinkronkan', detail: 'Sedang memproses data' };
        }
        if (syncStatus === 'error') {
            return { title: 'Sync bermasalah', detail: 'Periksa koneksi cloud' };
        }
        if (pendingChanges > 0) {
            return {
                title: `${pendingChanges > 99 ? '99+' : pendingChanges} perubahan`,
                detail: 'Siap dikirim ke cloud',
            };
        }
        return { title: 'Cloud siap', detail: 'Tidak ada perubahan tertunda' };
    };

    const checkAccess = (permissionKey: keyof UserPermissions): boolean => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        const access = currentUser.permissions[permissionKey];
        return access !== undefined ? access !== 'none' : false; 
    };

    const renderContent = () => {
        return (
            <Suspense fallback={<LoadingFallback />}>
                {(() => {
                    switch (currentPage) {
                        case Page.Dashboard:
                            return <Dashboard navigateTo={handleNavigate} />;
                        case Page.Santri:
                            return checkAccess('santri') ? <SantriList /> : <AccessDenied />;
                        case 'Absensi':
                        case Page.Absensi: 
                             return checkAccess('absensi') ? <Absensi /> : <AccessDenied />;
                        case 'Tahfizh':
                        case Page.Tahfizh: 
                             return checkAccess('tahfizh') ? <Tahfizh /> : <AccessDenied />;
                        case Page.Akademik:
                            return checkAccess('akademik') ? <Akademik /> : <AccessDenied />;
                        case Page.Kurikulum:
                            return checkAccess('akademik') ? <Kurikulum /> : <AccessDenied />;
                        case Page.Rapor:
                            return checkAccess('akademik') ? <Rapor /> : <AccessDenied />;
                        case Page.Sarpras: 
                            return checkAccess('sarpras') ? <Sarpras /> : <AccessDenied />;
                        case Page.Kalender: 
                            return checkAccess('kalender') ? <Kalender /> : <AccessDenied />;
                        case Page.Perpustakaan:
                            return checkAccess('perpustakaan') ? <Perpustakaan /> : <AccessDenied />;
                        case Page.Kesehatan:
                            return checkAccess('kesehatan') ? <Kesehatan /> : <AccessDenied />;
                        case Page.BK: 
                            return checkAccess('bk') ? <BK /> : <AccessDenied />;
                        case Page.BukuTamu: 
                            return checkAccess('bukutamu') ? <BukuTamu /> : <AccessDenied />;
                        case Page.DataMaster:
                            return checkAccess('datamaster') ? <DataMaster /> : <AccessDenied />;
                        case Page.Keuangan:
                            return checkAccess('keuangan') ? <Finance /> : <AccessDenied />;
                        case Page.Keasramaan:
                            return checkAccess('keasramaan') ? <Asrama /> : <AccessDenied />;
                        case Page.BukuKas:
                            return checkAccess('bukukas') ? <BukuKas /> : <AccessDenied />;
                        case Page.Koperasi: 
                            return checkAccess('koperasi') ? <Koperasi /> : <AccessDenied />;
                        case Page.Surat:
                            return checkAccess('surat') ? <SuratMenyurat /> : <AccessDenied />;
                        case Page.PSB:
                            return checkAccess('psb') ? <PSB /> : <AccessDenied />;
                        case Page.Pengaturan:
                            return checkAccess('pengaturan') ? <Settings /> : <AccessDenied />;
                        case Page.Laporan:
                            return checkAccess('laporan') ? <Reports /> : <AccessDenied />;
                        case Page.AuditLog:
                            return checkAccess('auditlog') ? <AuditLogView /> : <AccessDenied />;
                        case Page.WhatsApp:
                            return checkAccess('whatsapp') ? <WhatsAppCenter /> : <AccessDenied />;
                        case Page.SyncAdmin:
                            return currentUser?.role === 'admin' ? <AdminSyncDashboard /> : <AccessDenied />;
                        case Page.Tentang:
                            return <Tentang initialTab={tentangTab} initialSection={panduanSection} />;
                        default:
                            return <Dashboard navigateTo={handleNavigate} />;
                    }
                })()}
            </Suspense>
        );
    };
    
    const isPortal = window.location.pathname.startsWith('/portal/') || window.location.pathname.startsWith('/psb/');
    const syncSummary = getSyncSummary();

    if (isPortal) {
        return (
            <div className="app-shell min-h-screen">
                <Suspense fallback={<LoadingFallback />}>
                    <PublicPortal />
                </Suspense>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="app-shell flex min-h-screen items-center justify-center px-4">
                <div className="app-panel-elevated rounded-panel px-10 py-12 text-center">
                    <i className="bi bi-book-half animate-pulse text-5xl text-app-primary"></i>
                    <p className="mt-4 text-xl font-semibold text-app-text">Memuat data eSantri Web...</p>
                </div>
            </div>
        );
    }

    if (settings.multiUserMode && !isAuthReady) {
        return (
            <div className="app-shell flex min-h-screen items-center justify-center px-4">
                <div className="app-panel-elevated rounded-panel px-10 py-12 text-center">
                    <i className="bi bi-shield-lock animate-pulse text-5xl text-app-primary"></i>
                    <p className="mt-4 text-xl font-semibold text-app-text">Memvalidasi sesi pengguna...</p>
                </div>
            </div>
        );
    }

    if (settings.multiUserMode && !currentUser) {
        return (
            <ErrorBoundary>
                <ToastContainer toasts={toasts} onClose={removeToast} />
                <LoginScreen />
            </ErrorBoundary>
        );
    }

    return (
        <div className="app-shell">
            <WelcomeModal 
                isOpen={showWelcomeModal}
                onClose={handleCloseWelcomeModal}
                onGoToGuide={handleGoToGuide}
            />
            {waitingWorker && <UpdateNotification onUpdate={handleUpdate} />}
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <AlertModal 
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                onClose={hideAlert}
            />
            <BackupReminderModal 
                isOpen={backupModal.isOpen} 
                onClose={closeBackupModal} 
                onBackup={downloadBackup}
                reason={backupModal.reason}
            />
            <Sidebar
                currentPage={currentPage}
                setPage={handleSetPage}
                isSidebarOpen={isSidebarOpen}
            />

            {isSidebarOpen && (
                <div 
                    className="app-overlay fixed inset-0 z-[60] md:hidden no-print"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {isSidebarOpen && (
                <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="app-button-secondary fixed right-4 top-4 z-[80] h-11 w-11 rounded-full px-0 shadow-soft md:hidden no-print"
                    aria-label="Tutup sidebar"
                >
                    <i className="bi bi-x-lg text-lg"></i>
                </button>
            )}

            <div className="min-h-screen">
                <header className="app-topbar fixed inset-x-0 top-0 z-30 border-b no-print">
                    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5 md:px-6 lg:px-8">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(!isSidebarOpen)}
                                className="app-button-secondary h-11 w-11 px-0 md:hidden"
                                aria-label={isSidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
                            >
                                <i className="bi bi-list text-lg"></i>
                            </button>
                            <div className="hidden items-center gap-3 md:flex">
                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-teal-100 bg-white shadow-soft">
                                    <img src="/icon.svg" alt="Logo eSantri Web" className="h-8 w-8 object-contain" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-base font-bold tracking-tight text-app-text">eSantri Web</div>
                                    <div className="text-xs app-text-muted">Sistem operasional pondok</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleSyncClick();
                                }}
                                className="hidden items-center gap-3 rounded-full border border-app-border bg-white px-3 py-2 shadow-soft transition-colors hover:border-teal-200 hover:bg-teal-50/60 lg:flex"
                                aria-label="Buka menu sinkronisasi cloud"
                                title="Sinkronisasi cloud"
                            >
                                <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-base text-teal-700">
                                    {renderSyncButtonLabel()}
                                    {pendingChanges > 0 && (
                                        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-app-warning px-1 text-[10px] font-bold text-slate-950 shadow-sm ring-2 ring-white">
                                            {pendingChanges > 99 ? '99+' : pendingChanges}
                                        </span>
                                    )}
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-semibold text-app-text">{syncSummary.title}</div>
                                    <div className="text-[11px] app-text-muted">{syncSummary.detail}</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleSyncClick();
                                }}
                                className="app-button-secondary relative h-11 w-11 rounded-full px-0 lg:hidden"
                                aria-label="Buka menu sinkronisasi cloud"
                                title="Sinkronisasi cloud"
                            >
                                {renderSyncButtonLabel()}
                                {pendingChanges > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-app-warning px-1 text-[10px] font-bold text-slate-950 shadow-sm ring-2 ring-white">
                                        {pendingChanges > 99 ? '99+' : pendingChanges}
                                    </span>
                                )}
                            </button>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setShowUserMenu((prev) => !prev);
                                    }}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-app-border bg-white p-0 shadow-soft transition-colors hover:border-teal-200 hover:bg-teal-50/60 md:h-auto md:w-auto md:min-h-[44px] md:justify-start md:gap-3 md:pl-3 md:pr-2 md:py-2"
                                    aria-haspopup="menu"
                                    aria-expanded={showUserMenu}
                                >
                                    <div className="hidden text-right md:block">
                                        <div className="max-w-[160px] truncate text-sm font-semibold text-app-text">
                                            {currentUser?.fullName || currentUser?.username || 'Pengguna'}
                                        </div>
                                        <div className="text-[11px] uppercase tracking-[0.14em] app-text-muted">
                                            {currentUser?.role || 'User'}
                                        </div>
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-500/20 bg-teal-600 text-sm font-bold text-white shadow-sm">
                                        {(currentUser?.fullName || currentUser?.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                </button>
                                {showUserMenu && (
                                    <div
                                        className="app-panel-elevated absolute right-0 top-[calc(100%+0.75rem)] z-[90] w-72 overflow-hidden rounded-[20px]"
                                        role="menu"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <div className="border-b border-app-border bg-slate-50/70 px-4 py-4">
                                            <div className="truncate text-base font-semibold text-app-text">
                                                {currentUser?.fullName || currentUser?.username}
                                            </div>
                                            <div className="mt-1 text-xs uppercase tracking-[0.14em] app-text-muted">
                                                {currentUser?.role || 'User'}
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <button
                                                type="button"
                                                onClick={handleOpenProfile}
                                                className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left text-sm font-medium text-app-text transition-colors hover:bg-teal-50"
                                                role="menuitem"
                                            >
                                                <i className="bi bi-person-circle text-base text-teal-700"></i>
                                                <div>
                                                    <div>Akun</div>
                                                    <div className="text-xs font-normal app-text-muted">Ubah username dan password</div>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left text-sm font-medium text-app-danger transition-colors hover:bg-rose-50"
                                                role="menuitem"
                                            >
                                                <i className="bi bi-box-arrow-right text-base"></i>
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="app-canvas min-h-screen overflow-y-auto px-4 pb-8 pt-28 md:pl-[calc(17.5rem+1.5rem)] md:pr-6 md:pt-28 lg:pr-8">
                    <div className="mx-auto max-w-[1600px]">
                    <ErrorBoundary>
                        {renderContent()}
                    </ErrorBoundary>
                    </div>
                </main>
                </div>

            {showSyncMenu && (
                <div className="app-overlay fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowSyncMenu(false)}>
                    <div className="app-modal w-full max-w-md overflow-hidden rounded-panel animate-fade-in-down" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-app-border bg-slate-50/80 p-5">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-app-text">
                                <i className="bi bi-cloud-check text-teal-600"></i>
                                Menu Sinkronisasi
                            </h3>
                            <button onClick={() => setShowSyncMenu(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-app-border bg-white text-app-textMuted hover:bg-teal-50 hover:text-app-text">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="space-y-4 p-6">
                            {canManageSync ? (
                                <>
                                    <p className="mb-2 text-sm app-text-secondary">
                                        {currentUser?.role === 'admin' ? 'Anda login sebagai Admin (Pusat).' : 'Anda memiliki hak akses Wakil Admin.'} Kelola data master dan gabungkan perubahan dari staff.
                                    </p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button onClick={() => executeSync('admin_publish')} className="group flex w-full items-center rounded-[18px] border border-app-border bg-white p-3 text-left transition-colors hover:border-teal-200 hover:bg-teal-50/70">
                                            <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-700"><i className="bi bi-cloud-arrow-up-fill text-xl"></i></div>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                    <h4 className="font-bold text-app-text">Publikasikan Master</h4>
                                                    {pendingChanges > 0 && <span className="rounded-full border border-app-warning/20 bg-app-warning/15 px-1.5 text-[10px] font-bold text-app-warning">Delta: {pendingChanges}</span>}
                                                </div>
                                                <p className="text-xs app-text-muted">Kirim database lokal ke Cloud.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => executeSync('down')} className="group flex w-full items-center rounded-[18px] border border-app-border bg-white p-3 text-left transition-colors hover:border-orange-200 hover:bg-orange-50/70">
                                            <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600"><i className="bi bi-cloud-download-fill text-xl"></i></div>
                                            <div>
                                                <h4 className="font-bold text-app-text">Ambil Data Terbaru</h4>
                                                <p className="text-xs app-text-muted">Unduh data master dari Admin lain.</p>
                                            </div>
                                        </button>
                                        <button onClick={() => { setShowSyncMenu(false); setCurrentPage(Page.SyncAdmin); }} className="group flex w-full items-center rounded-[18px] border border-app-border bg-white p-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/70">
                                            <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600"><i className="bi bi-inbox-fill text-xl"></i></div>
                                            <div>
                                                <h4 className="font-bold text-app-text">Kelola Inbox Staff</h4>
                                                <p className="text-xs app-text-muted">Gabungkan update data dari Staff.</p>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="mb-2 text-sm app-text-secondary">Anda login sebagai Staff. Kirim pekerjaan Anda atau ambil data terbaru dari pusat.</p>
                                    <button onClick={() => executeSync('up')} className="group flex w-full items-center rounded-[18px] border border-app-border bg-white p-4 text-left transition-colors hover:border-teal-200 hover:bg-teal-50/70">
                                        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-700"><i className="bi bi-send-fill text-xl"></i></div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-bold text-app-text">Kirim Perubahan</h4>
                                                {pendingChanges > 0 && <span className="rounded-full border border-app-warning/20 bg-app-warning/15 px-1.5 text-[10px] font-bold text-app-warning">Belum Kirim: {pendingChanges}</span>}
                                            </div>
                                            <p className="text-xs app-text-muted">Kirim data yang baru saya input ({pendingChanges} item).</p>
                                        </div>
                                    </button>
                                    <button onClick={() => executeSync('down')} className="group flex w-full items-center rounded-[18px] border border-app-border bg-white p-4 text-left transition-colors hover:border-orange-200 hover:bg-orange-50/70">
                                        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600"><i className="bi bi-cloud-download-fill text-xl"></i></div>
                                        <div>
                                            <h4 className="font-bold text-app-text">Ambil Master Data</h4>
                                            <p className="text-xs app-text-muted">Ambil data gabungan terbaru dari Admin.</p>
                                        </div>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <ConfirmModal 
                isOpen={confirmation.isOpen}
                title={confirmation.title}
                message={confirmation.message}
                onConfirm={confirmation.onConfirm}
                onCancel={hideConfirmation}
                confirmText={confirmation.confirmText}
                confirmColor={confirmation.confirmColor}
            />
        </div>
    );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
        <UIProvider>
            <SettingsProvider>
                <FirebaseProvider>
                    <AuthProvider>
                        <SantriProvider>
                            <FinanceProvider>
                                <AppProvider>
                                    <AppContent />
                                </AppProvider>
                            </FinanceProvider>
                        </SantriProvider>
                    </AuthProvider>
                </FirebaseProvider>
            </SettingsProvider>
        </UIProvider>
    </ErrorBoundary>
  );
};


export default App;
