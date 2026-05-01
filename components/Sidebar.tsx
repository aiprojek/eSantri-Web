
import React, { useState, useEffect } from 'react';
import { Page, UserPermissions } from '../types';
import { useAppContext } from '../AppContext';
import { APP_VERSION } from '../version';

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
  const { settings, showToast, currentUser } = useAppContext();
  
  // State untuk mengontrol grup mana yang terbuka
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
      'utama': true // Default open
  });

  const canAccess = (feature: keyof UserPermissions): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === 'admin') return true;
      // Safe check: permissions object might be missing or feature key might be missing in legacy user data
      if (!currentUser.permissions) return false;
      return (currentUser.permissions[feature] || 'none') !== 'none';
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
              { page: Page.Kesehatan, icon: 'bi-heart-pulse-fill', show: canAccess('kesehatan') },
              { page: Page.BK, icon: 'bi-person-heart', show: canAccess('bk'), label: 'Bimbingan Konseling' }, 
              { page: Page.Keasramaan, icon: 'bi-building-fill', show: canAccess('keasramaan') },
          ]
      },
      {
          title: "Administrasi & Umum",
          key: "administrasi",
          items: [
              { page: Page.BukuTamu, icon: 'bi-person-rolodex', show: canAccess('bukutamu'), label: 'Buku Tamu' },
              { page: Page.PSB, icon: 'bi-person-plus-fill', show: canAccess('psb') },
              { page: Page.WhatsApp, icon: 'bi-whatsapp', show: canAccess('whatsapp'), label: 'WhatsApp Center' },
              { page: Page.Surat, icon: 'bi-envelope-paper-fill', show: canAccess('surat') },
              { page: Page.Laporan, icon: 'bi-printer-fill', show: canAccess('laporan') },
          ]
      },
      {
          title: "Pendidikan",
          key: "pendidikan",
          items: [
              { page: Page.Kurikulum, icon: 'bi-mortarboard-fill', show: canAccess('akademik'), label: 'Kurikulum' },
              { page: Page.Rapor, icon: 'bi-journal-check', show: canAccess('akademik'), label: 'Rapor' },
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
              { page: Page.Koperasi, icon: 'bi-shop', show: canAccess('koperasi'), label: 'Koperasi / Mart' }, // NEW
              { page: Page.Sarpras, icon: 'bi-box-seam-fill', show: canAccess('sarpras') },
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
              showToast('Fitur Cloud belum aktif. Silakan hubungkan Cloud Storage di menu Pengaturan.', 'error');
              setPage(Page.Pengaturan); 
              return;
          }
      }
      setPage(item.page);
  };

  return (
    <>
    <aside className={`app-sidebar fixed left-0 top-0 z-[70] flex h-screen w-[17.5rem] flex-col text-white no-print transition-transform md:top-[76px] md:h-[calc(100vh-76px)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:z-20 md:translate-x-0`}>
      <div className="h-full flex flex-col">
        <div className="border-b border-white/10 px-6 py-6 md:hidden">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-soft">
                    <img src="/icon.svg" alt="Logo eSantri Web" className="h-9 w-9 object-contain" />
                </div>
                <div className="min-w-0">
                    <div className="text-base font-bold tracking-tight text-white">eSantri Web</div>
                    <div className="text-xs text-teal-100/80">Sistem operasional pondok</div>
                </div>
            </div>
        </div>
        {/* Menu Scroll Area */}
        <div className="app-scrollbar flex-grow overflow-y-auto px-3 py-6">
            <ul className="space-y-3 px-3">
                {navStructure.map((group) => {
                    const visibleItems = group.items.filter(i => i.show);
                    if (visibleItems.length === 0) return null;

                    const isExpanded = expandedGroups[group.key];
                    const isActiveGroup = visibleItems.some(i => i.page === currentPage);

                    return (
                        <li key={group.key}>
                            {group.key === 'utama' ? (
                                visibleItems.map(item => (
                                    <a 
                                        key={item.page}
                                        href="#" 
                                        onClick={(e) => { e.preventDefault(); handleNavClick(item); }} 
                                        className={`group flex items-center rounded-[18px] p-3 transition-colors duration-200 ${currentPage === item.page ? 'border border-white/15 bg-white/16 text-white shadow-soft' : 'text-teal-50/80 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        <i className={`${item.icon} w-6 text-center text-lg`}></i>
                                        <span className="ms-3 text-sm font-medium">{item.label || item.page}</span>
                                    </a>
                                ))
                            ) : (
                                <>
                                    <button 
                                        onClick={() => toggleGroup(group.key)}
                                        className={`flex w-full items-center rounded-[18px] px-3 py-2.5 text-left transition-colors duration-200 ${isActiveGroup ? 'bg-white/10 text-white' : 'text-teal-50/80 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        <span className="ms-1 flex-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100/80">{group.title}</span>
                                        <i className={`bi bi-chevron-down text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
                                    </button>
                                    
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <ul className="mb-2 mt-2 space-y-1 pl-2">
                                            {visibleItems.map(item => (
                                                <li key={item.page}>
                                                    <a 
                                                        href="#" 
                                                        onClick={(e) => { e.preventDefault(); handleNavClick(item); }} 
                                                        className={`group flex items-center rounded-[16px] p-2.5 transition-colors duration-200 ${currentPage === item.page ? 'border border-white/15 bg-white/16 font-medium text-white shadow-soft' : 'text-teal-100/75 hover:bg-white/10 hover:text-white'}`}
                                                    >
                                                        <i className={`${item.icon} w-6 text-center text-base opacity-80 group-hover:opacity-100`}></i>
                                                        <span className="ms-3 text-sm">
                                                            {item.label || (
                                                                item.page === 'SyncAdmin' 
                                                                    ? (settings.cloudSyncConfig?.provider === 'firebase' ? 'Status Firebase' : 'Pusat Sync') 
                                                                    : item.page
                                                            )}
                                                        </span>
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
        
        <div className="shrink-0 border-t border-white/10 px-5 py-4 text-center">
            <div className="text-sm font-semibold text-white/90">eSantri Web</div>
            <div className="mt-1 text-xs text-teal-100/70">Versi {APP_VERSION}</div>
        </div>
      </div>
    </aside>
    </>
  );
};
export default Sidebar;
