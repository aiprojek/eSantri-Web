
import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext, ToastData } from './AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SantriList from './components/SantriList';
import DataMaster from './components/DataMaster';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Finance from './components/Finance';
import Asrama from './components/Asrama';
import BukuKas from './components/BukuKas';
import SuratMenyurat from './components/SuratMenyurat';
import PSB from './components/PSB';
import ConfirmModal from './components/ConfirmModal';
import Tentang from './components/Tentang';
import WelcomeModal from './components/WelcomeModal';
import { AuditLogView } from './components/AuditLogView';
import { Page } from './types';
import UpdateNotification from './components/UpdateNotification';
import { BackupReminderModal } from './components/BackupReminderModal';


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
    }, 4000); // Auto-close after 4 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onClose(id);
      }, 300); // Match animation duration
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
        triggerBackupCheck
    } = useAppContext();

    const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        const welcomeShown = localStorage.getItem('eSantriWelcomeShown');
        if (welcomeShown !== 'true') {
            setShowWelcomeModal(true);
        }
    }, []);

    // Check backup status on load (once isLoading is false)
    useEffect(() => {
        if (!isLoading) {
            triggerBackupCheck();
        }
    }, [isLoading, triggerBackupCheck]);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('SW registered: ', registration);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('SW update found, new worker is installing:', newWorker);

                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed') {
                                if (registration.waiting) {
                                    console.log('SW is installed and waiting for activation.');
                                    setWaitingWorker(registration.waiting);
                                }
                            }
                        });
                    }
                });
            }).catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
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

    const renderContent = () => {
        switch (currentPage) {
            case Page.Dashboard:
                return <Dashboard navigateTo={handleNavigate} />;
            case Page.Santri:
                return <SantriList />;
            case Page.DataMaster:
                return <DataMaster />;
            case Page.Keuangan:
                return <Finance />;
            case Page.Keasramaan:
                return <Asrama />;
            case Page.BukuKas:
                return <BukuKas />;
            case Page.Surat:
                return <SuratMenyurat />;
            case Page.PSB:
                return <PSB />;
            case Page.Pengaturan:
                return <Settings />;
            case Page.Laporan:
                return <Reports />;
            case Page.AuditLog:
                return <AuditLogView />;
            case Page.Tentang:
                return <Tentang />;
            default:
                return <Dashboard navigateTo={handleNavigate} />;
        }
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
                    {renderContent()}
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};


export default App;
