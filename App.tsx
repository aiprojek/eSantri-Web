
import React, { useState, useEffect, Suspense } from 'react';
import { AppProvider, useAppContext, ToastData } from './AppContext';
import { SantriProvider } from './contexts/SantriContext';
import { FinanceProvider } from './contexts/FinanceContext';
import Sidebar from './components/Sidebar';
import ConfirmModal from './components/ConfirmModal';
import WelcomeModal from './components/WelcomeModal';
import UpdateNotification from './components/UpdateNotification';
import { BackupReminderModal } from './components/BackupReminderModal';
import { LoginScreen } from './components/Login'; 
import { Page, UserPermissions } from './types';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingFallback } from './components/common/LoadingFallback';

// --- Lazy Load Pages ---
// Note: Path imports adjusted to point to ./components/ folder
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
const Absensi = React.lazy(() => import('./components/Absensi'));
const Tahfizh = React.lazy(() => import('./components/Tahfizh'));
const Sarpras = React.lazy(() => import('./components/Sarpras'));
const Kalender = React.lazy(() => import('./components/Kalender')); // NEW

const AuditLogView = React.lazy(() => import('./components/AuditLogView').then(module => ({ default: module.AuditLogView })));
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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[150] flex justify-center items-center p-4" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg text-xl"></i></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{message}</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end rounded-b-lg">
          <button onClick={onClose} type="button" className="text-white bg-teal-600 hover:bg-teal-700 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5">
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

  const baseClasses = "flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow-lg transition-all duration-300 ease-in-out transform";
  const animationClasses = isExiting 
    ? "opacity-0 translate-x-full" 
    : "opacity-100 translate-x-0";

  const typeConfig = {
    success: { icon: 'bi-check-circle-fill', color: 'text-green-500 bg-green-100' },
    error: { icon: 'bi-x-circle-fill', color: 'text-red-500 bg-red-100' },
    info: { icon: 'bi-info-circle-fill', color: 'text-blue-500 bg-blue-100' },
  };

  const { icon, color } = typeConfig[type];

  return (
    <div className={`${baseClasses} ${animationClasses}`}>
      <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${color}`}>
        <i className={`bi ${icon} text-lg`}></i>
      </div>
      <div className="ml-3 text-sm font-normal text-gray-700">{message}</div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
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
    <div className="fixed top-5 right-5 z-[200]">
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
// --- End Toast Components ---

// --- Access Denied Component ---
const AccessDenied: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-6 animate-fade-in">
        <div className="bg-red-100 text-red-600 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <i className="bi bi-shield-lock-fill text-4xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
        <p className="text-gray-600 max-w-md">
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
        currentUser 
    } = useAppContext();

    const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

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
        if ('serviceWorker' in navigator) {
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
                console.warn('Service Worker registration failed (likely dev env):', error);
            });
        }
        
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }, []);

    const handleCloseWelcomeModal = () => {
        localStorage.setItem('eSantriWelcomeShown', 'true');
        setShowWelcomeModal(false);
    };

    const handleGoToGuide = () => {
        handleCloseWelcomeModal();
        setCurrentPage(Page.Tentang);
    };

    const handleNavigate = (page: Page, filters = {}) => {
        if (Object.keys(filters).length > 0) {
            setSantriFilters(prev => ({ ...prev, ...filters }));
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

    const checkAccess = (permissionKey: keyof UserPermissions): boolean => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        const access = currentUser.permissions[permissionKey];
        return access !== undefined ? access !== 'none' : true; 
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
                        case Page.Sarpras: 
                            return checkAccess('sarpras') ? <Sarpras /> : <AccessDenied />;
                        case Page.Kalender: // NEW Route
                            return checkAccess('kalender') ? <Kalender /> : <AccessDenied />;
                        case Page.DataMaster:
                            return checkAccess('datamaster') ? <DataMaster /> : <AccessDenied />;
                        case Page.Keuangan:
                            return checkAccess('keuangan') ? <Finance /> : <AccessDenied />;
                        case Page.Keasramaan:
                            return checkAccess('keasramaan') ? <Asrama /> : <AccessDenied />;
                        case Page.BukuKas:
                            return checkAccess('bukukas') ? <BukuKas /> : <AccessDenied />;
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
                        case Page.SyncAdmin:
                            return currentUser?.role === 'admin' ? <AdminSyncDashboard /> : <AccessDenied />;
                        case Page.Tentang:
                            return <Tentang />;
                        default:
                            return <Dashboard navigateTo={handleNavigate} />;
                    }
                })()}
            </Suspense>
        );
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <i className="bi bi-book-half text-5xl text-teal-600 animate-pulse"></i>
                    <p className="text-xl font-semibold text-gray-700 mt-4">Memuat data eSantri Web...</p>
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
        <div className="min-h-screen bg-gray-50">
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
            <Sidebar currentPage={currentPage} setPage={handleSetPage} isSidebarOpen={isSidebarOpen} />
            
            <button 
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className={`fixed top-4 left-4 z-50 p-2 text-gray-600 bg-white rounded-md shadow-md md:hidden transition-transform ${isSidebarOpen ? 'translate-x-64' : ''} no-print`}
                aria-label={isSidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            >
                <i className={`bi ${isSidebarOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
            </button>
            
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden no-print"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            <main className="p-4 md:ml-64">
                <div className="p-4 rounded-lg mt-14">
                    <ErrorBoundary>
                        {renderContent()}
                    </ErrorBoundary>
                </div>
            </main>
            
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
        <AppProvider>
          <SantriProvider>
             <FinanceProvider>
                 <AppContent />
             </FinanceProvider>
          </SantriProvider>
        </AppProvider>
    </ErrorBoundary>
  );
};


export default App;
