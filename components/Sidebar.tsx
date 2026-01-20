
import React, { useState, useEffect } from 'react';
import { Page, UserPermissions } from '../types';
import { useAppContext } from '../AppContext';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  isSidebarOpen: boolean;
}

// Tipe untuk struktur menu
type NavItem = {
    page: Page;
    label?: string; // Optional override
    icon: string;
    show: boolean;
};

type NavGroup = {
    title: string;
    key: string;
    items: NavItem[];
};

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, isSidebarOpen }) => {
  const { settings, showToast, showConfirmation, currentUser, logout, triggerManualSync, syncStatus } = useAppContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncOptions, setShowSyncOptions] = useState(false);
  
  // State untuk mengontrol grup mana yang terbuka
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
      'utama': true // Default open
  });

  const canAccess = (feature: keyof UserPermissions): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === 'admin') return true;
      if (!currentUser.permissions) return false;
      return currentUser.permissions[feature] !== 'none';
  };

  const canManageSync = currentUser?.role === 'admin' || currentUser?.permissions?.syncAdmin;

  // Struktur Menu
  const navStructure: NavGroup[] = [
      {
          title: "Menu Utama",
          key: "utama",
          items: [
              { page: Page.Dashboard, icon: 'bi-grid-1x2-fill', show: true },
          ]
      },
      {
          title: "Kesiswaan",
          key: "kesiswaan",
          items: [
              { page: Page.Santri, icon: 'bi-people-fill', show: canAccess('santri') },
              { page: Page.Tahfizh, icon: 'bi-journal-richtext', show: canAccess('tahfizh') },
              { page: Page.Absensi, icon: 'bi-calendar-check-fill', show: canAccess('absensi') },
              { page: Page.Keasramaan, icon: 'bi-building-fill', show: canAccess('keasramaan') },
          ]
      },
      {
          title: "Pendidikan",
          key: "pendidikan",
          items: [
              { page: Page.Akademik, icon: 'bi-mortarboard-fill', show: canAccess('akademik') },
              { page: Page.Perpustakaan, icon: 'bi-book-half', show: canAccess('perpustakaan') },
              { page: Page.Kalender, icon: 'bi-calendar-event-fill', show: canAccess('kalender') },
              { page: Page.DataMaster, icon: 'bi-database-fill', show: canAccess('datamaster') },
          ]
      },
      {
          title: "Keuangan & Aset",
          key: "keuangan",
          items: [
              { page: Page.Keuangan, icon: 'bi-cash-coin', show: canAccess('keuangan') },
              { page: Page.BukuKas, icon: 'bi-journal-album', show: canAccess('bukukas') },
              { page: Page.Sarpras, icon: 'bi-box-seam-fill', show: canAccess('sarpras') },
          ]
      },
      {
          title: "Administrasi",
          key: "administrasi",
          items: [
              { page: Page.PSB, icon: 'bi-person-plus-fill', show: canAccess('psb') },
              { page: Page.Surat, icon: 'bi-envelope-paper-fill', show: canAccess('surat') },
              { page: Page.Laporan, icon: 'bi-printer-fill', show: canAccess('laporan') },
          ]
      },
      {
          title: "Sistem",
          key: "sistem",
          items: [
              { page: Page.AuditLog, icon: 'bi-activity', show: canAccess('auditlog') },
              { page: Page.Pengaturan, icon: 'bi-gear-fill', show: canAccess('pengaturan') },
              { page: Page.SyncAdmin, icon: 'bi-cloud-check-fill', show: canManageSync },
              { page: Page.Tentang, icon: 'bi-info-circle-fill', show: true },
          ]
      }
  ];

  // Efek untuk membuka grup secara otomatis berdasarkan halaman aktif saat ini
  useEffect(() => {
      const activeGroup = navStructure.find(group => group.items.some(item => item.page === currentPage));
      if (activeGroup) {
          setExpandedGroups(prev => ({ ...prev, [activeGroup.key]: true }));
      }
  }, [currentPage]);

  const toggleGroup = (key: string) => {
      setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNavClick = (item: NavItem) => {
      if (item.page === Page.SyncAdmin) {
          const config = settings.cloudSyncConfig;
          if (!config || config.provider === 'none') {
              showToast('Fitur Cloud belum aktif. Silakan hubungkan Dropbox di menu Pengaturan.', 'error');
              setPage(Page.Pengaturan); 
              return;
          }
      }
      setPage(item.page);
  };

  const handleSyncClick = () => {
      const config = settings.cloudSyncConfig;
      if (!config || config.provider === 'none') {
          showToast('Fitur Cloud belum aktif. Silakan hubungkan Dropbox di menu Pengaturan.', 'error');
          setPage(Page.Pengaturan);
          return;
      }
      setShowSyncOptions(true);
  };

  const executeSync = (action: 'up' | 'down' | 'admin_publish') => {
      setShowSyncOptions(false); 
      let title = ''; let message = ''; let confirmColor = 'blue';
      if (action === 'admin_publish') { title = 'Publikasikan Master Data?'; message = 'Tindakan ini akan mengirim seluruh database lokal Anda ke Cloud sebagai "Master Data" yang baru. Pastikan Anda sudah menggabungkan semua update dari staff.'; } 
      else if (action === 'up') { title = 'Kirim Perubahan?'; message = 'Data perubahan lokal Anda akan dikirim ke Inbox Admin di Cloud.'; } 
      else { title = 'Ambil Master Data?'; message = 'Aplikasi akan mengunduh Master Data terbaru dari Admin. Data lokal yang lebih baru tidak akan tertimpa.'; confirmColor = 'orange'; }

      showConfirmation(title, message, async () => { setIsSyncing(true); try { await triggerManualSync(action); } finally { setIsSyncing(false); } }, { confirmText: 'Ya, Lanjutkan', confirmColor });
  };

  const handleLogout = () => {
      showConfirmation('Logout', 'Anda yakin ingin keluar?', () => { logout(); }, { confirmText: 'Keluar', confirmColor: 'red' });
  };

  const renderSyncStatus = () => {
      if (syncStatus === 'syncing' || isSyncing) return <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span><span>Menyimpan...</span></>;
      if (syncStatus === 'success') return <><i className="bi bi-cloud-check-fill mr-2 text-green-300"></i><span>Tersinkron</span></>;
      if (syncStatus === 'error') return <><i className="bi bi-exclamation-triangle-fill mr-2 text-red-400 animate-pulse"></i><span>Gagal Sync</span></>;
      return <><i className="bi bi-cloud-arrow-up-down mr-2 group-hover:text-white text-teal-200"></i><span>Sync Cloud</span></>;
  };

  const getButtonClass = () => {
      if (syncStatus === 'error') return 'bg-red-800 hover:bg-red-700';
      if (syncStatus === 'success') return 'bg-teal-700 hover:bg-teal-600 border border-green-500';
      return 'bg-teal-700 hover:bg-teal-600';
  }

  return (
    <>
    <aside className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 bg-teal-800 text-white no-print flex flex-col shadow-2xl`}>
      <div className="h-full flex flex-col">
        {/* Header Logo */}
        <div className="px-5 py-6 flex items-center bg-teal-900">
            <svg className="h-8 w-8 mr-2 rounded-md flex-shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" rx="12" fill="#0f766e"/>
                <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06395,0.06031 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.807226,3.136742 0,1.449522 -1.080984,2.352339 -2.83266,2.365783 -1.692966,0.013 -2.898289,-0.700527 -3.613504,-2.139108 -0.233721,-0.470103 -0.448882,-0.914285 -0.478136,-0.987069 -0.116891,-0.290814 -0.200722,0.06466 -0.343292,1.455679 -0.08206,0.800623 -0.183673,1.704103 -0.225804,2.007735 -0.07177,0.517174 -0.05031,0.565658 0.339658,0.767317 0.228951,0.118395 0.934732,0.331191 1.568401,0.472882 1.371797,0.306736 3.501849,0.270382 4.658993,-0.07952 z m -25.45487,-1.364466 c 0.93301,-0.457248 1.87821,-0.760644 2.72644,-0.875142 l 0.62858,-0.08485 v -1.37202 -1.372019 l -0.76092,-0.150409 c -1.1567,-0.228639 -1.61383,-0.386514 -2.49361,-0.86118 l -0.80636,-0.435051 -1.0876,0.707478 c -1.7125205,1.113979 -4.4737803,2.082778 -5.0529103,1.772836 -0.37206,-0.199121 -0.71946,0.108306 -0.58853,0.520817 0.115,0.362332 0.72882,0.388328 0.82127,0.03479 0.0568,-0.217219 0.26544,-0.254305 1.8612198,-0.330836 0.98848,-0.04741 2.1954505,-0.08619 2.6821505,-0.08619 0.72383,0 0.92956,-0.04935 1.13024,-0.27109 0.5934,-0.655698 1.68599,0.120869 1.20432,0.855981 -0.30385,0.46374 -0.71833,0.514445 -1.0984,0.134374 -0.32073,-0.320731 -0.33497,-0.322227 -2.9960205,-0.314975 l -2.6737598,0.0073 0.9462,0.248046 c 1.3576098,0.355898 2.7727603,0.97431 3.7575203,1.642008 0.46988,0.318591 0.89288,0.586114 0.94,0.594493 0.0471,0.0084 0.43419,-0.155572 0.86017,-0.364335 z m 4.68467,-0.249019 c 0.003,-0.05459 0.0184,-1.022283 0.0331,-2.150434 l 0.0268,-2.051184 h -0.33083 -0.33084 l -0.0368,1.979203 c -0.0202,1.08856 -0.007,2.056256 0.0289,2.150434 0.0691,0.180159 0.59882,0.242698 0.60965,0.07198 z m 3.65835,-0.574409 c 3.0847,-0.784059 4.3689,-1.36122 14.597498,-6.560614 4.28789,-2.179617 6.635935,-3.051997 10.086804,-3.7476 3.636686,-0.733057 7.837085,-0.596342 10.867503,0.353716 0.570889,0.178977 1.064204,0.299191 1.096252,0.267139 0.130911,-0.130911 -2.904302,-1.024182 -4.383914,-1.290194 -1.996054,-0.358861 -5.21532,-0.480661 -7.088973,-0.268211 -4.215428,0.477982 -7.569808,1.515628 -13.092024,4.0499 -3.489827,1.60156 -6.879436,2.837056 -9.395746,3.424707 -1.69284,0.39534 -3.96393,0.739453 -4.88027,0.739453 h -0.67778 v 1.791074 1.791073 l 0.69476,-0.08699 c 0.38212,-0.04784 1.36127,-0.256397 2.17589,-0.463455 z m -0.10861,-4.40808 c 4.34182,-0.630466 7.276739,-1.83952 9.019947,-3.715798 0.769184,-0.827904 1.110178,-1.396927 1.372676,-2.29062 0.620767,-2.113468 -0.266098,-4.009021 -2.237069,-4.781421 -0.663099,-0.25986 -1.034005,-0.311072 -2.249684,-0.310618 -2.56763,9.39e-4 -4.16567,0.70118 -6.15355,2.696349 -1.32346,1.328311 -2.06801,2.436512 -2.69958,4.018119 -0.3897,0.975922 -0.74112,2.585487 -0.74112,3.394509 0,0.426759 0.0504,0.516006 0.33138,0.586519 0.18225,0.04574 0.40501,0.201076 0.495,0.345183 0.20571,0.329396 0.89555,0.343323 2.862,0.05778 z m 0.11816,-1.45905 c -0.11099,-0.110993 0.16145,-1.565003 0.5066,-2.703751 0.89895,-2.965867 2.8918,-5.028708 4.85807,-5.028708 1.488576,0 2.128809,1.136692 1.614909,2.867184 -0.413016,1.390771 -1.806659,2.666315 -4.103229,3.755501 -1.46343,0.694058 -2.78296,1.203168 -2.87635,1.109774 z m 14.804219,-3.661671 1.341112,-0.577624 -0.441486,-0.596022 c -0.242813,-0.327813 -0.5141,-0.867521 -0.602851,-1.199355 -0.147845,-0.552783 -0.13452,-0.656915 0.159047,-1.242882 0.783436,-1.563747 3.160654,-1.663469 4.629901,-0.194221 0.353158,0.353155 0.680797,0.796275 0.728092,0.984714 0.105859,0.421779 0.294357,0.44384 0.3833,0.04486 0.06507,-0.291898 0.468002,-3.036365 0.468002,-3.187693 0,-0.145749 -1.728025,-0.610339 -2.603914,-0.700076 -1.491442,-0.0773 -2.024052,-0.16772 -3.267158,0.150242 -1.61687,0.421141 -2.840775,1.370544 -3.410741,2.645767 -0.532611,1.191638 -0.357352,3.003822 0.412542,4.265726 0.223681,0.366631 0.304308,0.410539 0.562091,0.306105 0.165522,-0.06706 0.904448,-0.381852 1.642063,-0.699544 z" fill="white" />
            </svg>
            <span className="self-center text-xl font-bold tracking-tight whitespace-nowrap">eSantri Web</span>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 bg-teal-800 border-b border-teal-700">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold border border-teal-400">
                     {currentUser?.username.charAt(0).toUpperCase()}
                 </div>
                 <div className="overflow-hidden">
                     <p className="text-sm font-semibold truncate w-32">{currentUser?.fullName}</p>
                     <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase bg-teal-900 px-1.5 py-0.5 rounded text-teal-200 tracking-wider">{currentUser?.role}</span>
                        {canManageSync && currentUser?.role !== 'admin' && <span className="text-[10px] bg-yellow-600 px-1.5 py-0.5 rounded text-white" title="Wakil Admin">Wakil</span>}
                     </div>
                 </div>
            </div>
        </div>

        {/* Menu Scroll Area */}
        <div className="flex-grow overflow-y-auto custom-scrollbar py-2">
            <ul className="space-y-1 px-2">
                {navStructure.map((group) => {
                    // Cek apakah group ini memiliki item yang boleh ditampilkan
                    const visibleItems = group.items.filter(i => i.show);
                    if (visibleItems.length === 0) return null;

                    const isExpanded = expandedGroups[group.key];
                    const isActiveGroup = visibleItems.some(i => i.page === currentPage);

                    return (
                        <li key={group.key} className="mb-1">
                            {group.key === 'utama' ? (
                                // Group Utama (Dashboard) biasanya tanpa accordion
                                visibleItems.map(item => (
                                    <a 
                                        key={item.page}
                                        href="#" 
                                        onClick={(e) => { e.preventDefault(); handleNavClick(item); }} 
                                        className={`flex items-center p-2.5 rounded-lg transition-colors duration-200 group ${currentPage === item.page ? 'bg-teal-600 text-white shadow-sm' : 'text-teal-100 hover:bg-teal-700/50 hover:text-white'}`}
                                    >
                                        <i className={`${item.icon} text-lg w-6 text-center`}></i>
                                        <span className="ms-3 text-sm font-medium">{item.label || item.page}</span>
                                    </a>
                                ))
                            ) : (
                                // Group Lainnya (Accordion)
                                <>
                                    <button 
                                        onClick={() => toggleGroup(group.key)}
                                        className={`flex items-center w-full p-2.5 rounded-lg transition-colors duration-200 text-left ${isActiveGroup ? 'text-white' : 'text-teal-100 hover:bg-teal-700/50 hover:text-white'}`}
                                    >
                                        <span className="flex-1 ms-1 text-xs font-bold uppercase tracking-wider opacity-80">{group.title}</span>
                                        <i className={`bi bi-chevron-down text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
                                    </button>
                                    
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <ul className="pl-2 space-y-0.5 mt-1 mb-2">
                                            {visibleItems.map(item => (
                                                <li key={item.page}>
                                                    <a 
                                                        href="#" 
                                                        onClick={(e) => { e.preventDefault(); handleNavClick(item); }} 
                                                        className={`flex items-center p-2 rounded-lg transition-colors duration-200 group ${currentPage === item.page ? 'bg-teal-600 text-white shadow-sm font-medium' : 'text-teal-200 hover:bg-teal-700/30 hover:text-white'}`}
                                                    >
                                                        <i className={`${item.icon} text-base w-6 text-center opacity-80 group-hover:opacity-100`}></i>
                                                        <span className="ms-3 text-sm">{item.label || (item.page === 'SyncAdmin' ? 'Pusat Sync' : item.page)}</span>
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 bg-teal-900 border-t border-teal-700 space-y-2 shrink-0">
            <button onClick={handleSyncClick} disabled={isSyncing || syncStatus === 'syncing'} className={`flex items-center justify-center w-full p-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm group ${getButtonClass()}`} title="Upload/Download data Cloud">
                {renderSyncStatus()}
            </button>
            {settings.multiUserMode && (
                <button onClick={handleLogout} className="flex items-center justify-center w-full p-2.5 bg-red-900/50 hover:bg-red-800 text-red-100 hover:text-white rounded-lg text-sm transition-colors border border-red-900/30">
                    <i className="bi bi-box-arrow-left mr-2"></i><span>Keluar</span>
                </button>
            )}
        </div>
      </div>
    </aside>

    {showSyncOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fade-in-down">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50"><h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><i className="bi bi-cloud-check text-teal-600"></i> Menu Sinkronisasi</h3><button onClick={() => setShowSyncOptions(false)} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg"></i></button></div>
                <div className="p-6 space-y-4">
                    {canManageSync ? (
                        <>
                            <p className="text-sm text-gray-600 mb-2">{currentUser?.role === 'admin' ? "Anda login sebagai **Admin (Pusat)**." : "Anda memiliki hak akses **Wakil Admin**."} Kelola data master dan gabungkan perubahan dari staff.</p>
                            <button onClick={() => executeSync('admin_publish')} className="w-full flex items-center p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group text-left"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4 group-hover:bg-blue-200"><i className="bi bi-cloud-arrow-up-fill text-xl"></i></div><div><h4 className="font-bold text-gray-800 group-hover:text-blue-700">Publikasikan Master</h4><p className="text-xs text-gray-500">Kirim database pusat ke Cloud agar bisa diunduh Staff.</p></div></button>
                            <button onClick={() => { setShowSyncOptions(false); setPage(Page.SyncAdmin); }} className="w-full flex items-center p-4 border rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors group text-left"><div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mr-4 group-hover:bg-yellow-200"><i className="bi bi-inbox-fill text-xl"></i></div><div><h4 className="font-bold text-gray-800 group-hover:text-yellow-700">Kelola Inbox Staff</h4><p className="text-xs text-gray-500">Lihat dan gabungkan update data dari Staff.</p></div></button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600 mb-2">Anda login sebagai <strong>Staff</strong>. Kirim pekerjaan Anda atau ambil data terbaru dari pusat.</p>
                            <button onClick={() => executeSync('up')} className="w-full flex items-center p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group text-left"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4 group-hover:bg-blue-200"><i className="bi bi-send-fill text-xl"></i></div><div><h4 className="font-bold text-gray-800 group-hover:text-blue-700">Kirim Perubahan</h4><p className="text-xs text-gray-500">Kirim data yang saya input ke Inbox Admin.</p></div></button>
                            <button onClick={() => executeSync('down')} className="w-full flex items-center p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors group text-left"><div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mr-4 group-hover:bg-orange-200"><i className="bi bi-cloud-download-fill text-xl"></i></div><div><h4 className="font-bold text-gray-800 group-hover:text-orange-700">Ambil Master Data</h4><p className="text-xs text-gray-500">Ambil data gabungan terbaru dari Admin.</p></div></button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )}
    </>
  );
};
export default Sidebar;
