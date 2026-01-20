
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

  // Fix: Ensure boolean return for strict type checking
  const canManageSync = !!(currentUser?.role === 'admin' || currentUser?.permissions?.syncAdmin);

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
              { page: Page.Kesehatan, icon: 'bi-heart-pulse-fill', show: canAccess('kesehatan') }, // NEW
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
                <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06395,0.06031 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.807226,3.136742 0,1.449522 -1.080984,2.352339 -2.83266,2.365783 -1.692966,0.013 -2.898289,-0.700527 -3.613504,-2.139108 -0.233721,-0.470103 -0.448882,-0.914285 -0.478136,-0.987069 -0.116891,-0.290814 -0.200722,0.06466 -0.343292,1.455679 -0.08206,0.800623 -0.183673,1.704103 -0.225804,2.007735 -0.07177,0.517174 -0.05031,0.565658 0.339658,0.767317 0.228951,0.118395 0.934732,0.331191 1.568401,0.472882 1.371797,0.306736 3.501849,0.270382 4.658993,-0.07952 z m -25.45487,-1.364466 c 0.93301,-0.457248 1.87821,-0.760644 2.72644,-0.875142 l 0.62858,-0.08485 v -1.37202 -1.372019 l -0.76092,-0.150409 c -1.1567,-0.228639 -1.61383,-0.386514 -2.49361,-0.86118 l -0.80636,-0.435051 -1.0876,0.707478 c -1.7125205,1.113979 -4.4737803,2.082778 -5.0529103,1.772836 -0.37206,-0.199121 -0.71946,0.108306 -0.58853,0.520817 0.115,0.362332 0.72882,0.388328 0.82127,0.03479 0.0568,-0.217219 0.26544,-0.254305 1.8612198,-0.330836 0.98848,-0.04741 2.1954505,-0.08619 2.6821505,-0.08619 0.72383,0 0.92956,-0.04935 1.13024,-0.27109 0.5934,-0.655698 1.68599,0.120869 1.20432,0.855981 -0.30385,0.46374 -0.71833,0.514445 -1.0984,0.134374 -0.32073,-0.320731 -0.33497,-0.322227 -2.9960205,-0.314975 l -2.6737598,0.0073 0.9462,0.248046 c 1.3576098,0.355898 2.7727603,0.97431 3.7575203,1.642008 0.46988,0.318591 0.89288,0.586114 0.94,0.594493 0.0471,0.0084 0.43419,-0.155572 0.86017,-0.364335 z m 4.68467,-0.249019 c 0.003,-0.05459 0.0184,-1.022283 0.0331,-2.150434 l 0.0268,-2.051184 h -0.33083 -0.33084 l -0.0368,1.979203 c -0.0202,1.08856 -0.007,2.056256 0.0289,2.150434 0.0691,0.180159 0.59882,0.242698 0.60965,0.07198 z m 3.65835,-0.574409 c 3.0847,-0.784059 4.3689,-1.36122 14.597498,-6.560614 4.28789,-2.179617 6.635935,-3.051997 10.086804,-3.7476 3.636686,-0.733057 7.837085,-0.596342 11.887212,0.386905 0.624457,0.19577 1.16406,0.327264 1.199115,0.292205 0.143194,-0.143195 -3.176816,-1.120282 -4.795262,-1.411255 -2.183345,-0.392533 -5.704678,-0.525761 -7.754138,-0.293377 -4.610966,0.522832 -8.280091,1.657841 -14.320462,4.429906 -3.817281,1.751836 -7.52494,3.103261 -10.277358,3.746051 -1.851681,0.432435 -4.33587,0.808837 -5.338191,0.808837 h -0.741377 v 1.959132 1.959131 l 0.759951,-0.09515 c 0.417973,-0.05232 1.488998,-0.280454 2.380055,-0.506941 z m -0.118801,-4.40808 c 4.749218,-0.689623 7.959523,-2.012124 9.866298,-4.064455 0.841357,-0.905587 1.214347,-1.528001 1.501476,-2.505551 0.679014,-2.311777 -0.291066,-4.385192 -2.446976,-5.230066 -0.725318,-0.284243 -1.131027,-0.34026 -2.460774,-0.339764 -2.808553,0.001 -4.556539,0.766973 -6.730944,2.94935 -1.447641,1.452948 -2.262053,2.665132 -2.952885,4.395143 -0.426266,1.067494 -0.81066,2.828086 -0.81066,3.71302 0,0.466802 0.05513,0.564423 0.362475,0.641552 0.19935,0.05003 0.443012,0.219943 0.541446,0.377572 0.225012,0.360303 0.97958,0.375537 3.130544,0.0632 z m 0.129247,-1.595953 c -0.121405,-0.121408 0.176599,-1.71185 0.554135,-2.957448 0.9833,-3.244156 3.16314,-5.500556 5.313908,-5.500556 1.62825,0 2.328557,1.243349 1.766437,3.136215 -0.451769,1.521269 -1.976179,2.916498 -4.488239,4.107883 -1.600745,0.759182 -3.044088,1.316063 -3.146241,1.213906 z m 16.193314,-4.00525 1.466951,-0.631823 -0.482912,-0.651947 c -0.265596,-0.358572 -0.562338,-0.948922 -0.659417,-1.311892 -0.161717,-0.604651 -0.147142,-0.718554 0.17397,-1.359502 0.856947,-1.710476 3.457222,-1.819555 5.06433,-0.212446 0.386295,0.386292 0.744677,0.87099 0.79641,1.077111 0.115791,0.461354 0.321976,0.485485 0.419264,0.04907 0.07118,-0.319288 0.511916,-3.32127 0.511916,-3.486797 0,-0.159425 -1.890167,-0.667608 -2.848242,-0.765765 -1.631386,-0.08456 -2.213971,-0.183458 -3.573718,0.164339 -1.768583,0.460657 -3.107329,1.499143 -3.730775,2.894023 -0.582587,1.30345 -0.390883,3.285673 0.451251,4.665983 0.244669,0.401032 0.332862,0.181053,-0.07335 0.989313,-0.417681 1.796139,-0.765182 z" fill="white" />
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
