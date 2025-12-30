
import React, { useState } from 'react';
import { Page } from '../types';
import { useAppContext } from '../AppContext';
import { performSync } from '../services/syncService';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  isSidebarOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, isSidebarOpen }) => {
  const { settings, onSaveSettings, showToast, showConfirmation, showAlert } = useAppContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncOptions, setShowSyncOptions] = useState(false);

  const navItems = [
    { page: Page.Dashboard, icon: 'bi-grid-1x2-fill' },
    { page: Page.Santri, icon: 'bi-people-fill' },
    { page: Page.PSB, icon: 'bi-person-plus-fill' }, 
    { page: Page.DataMaster, icon: 'bi-database-fill' }, 
    { page: Page.Keuangan, icon: 'bi-cash-coin' },
    { page: Page.Keasramaan, icon: 'bi-building-fill' },
    { page: Page.BukuKas, icon: 'bi-journal-album' },
    { page: Page.Surat, icon: 'bi-envelope-paper-fill' },
    { page: Page.Laporan, icon: 'bi-printer-fill' },
    { page: Page.AuditLog, icon: 'bi-activity' }, 
    { page: Page.Pengaturan, icon: 'bi-gear-fill' },
    { page: Page.Tentang, icon: 'bi-info-circle-fill' },
  ];

  const handleSyncClick = () => {
      const config = settings.cloudSyncConfig;
      
      if (!config || config.provider === 'none') {
          showToast('Sinkronisasi belum dikonfigurasi. Silakan atur di menu Pengaturan.', 'info');
          setPage(Page.Pengaturan);
          return;
      }

      // If Supabase, Sync concept is different (it's realtime), warn user
      if (config.provider === 'supabase') {
          showAlert('Supabase Aktif', 'Anda menggunakan Database Realtime (Supabase). Semua perubahan data otomatis tersimpan ke cloud saat Anda bekerja. Tidak perlu upload/download manual.');
          return;
      }

      // Open the choice modal
      setShowSyncOptions(true);
  };

  const executeSync = (direction: 'up' | 'down') => {
      setShowSyncOptions(false); // Close choice modal
      
      const config = settings.cloudSyncConfig;
      const providerName = config.provider === 'dropbox' ? 'Dropbox' : 'WebDAV';
      
      const title = direction === 'up' ? `Backup ke ${providerName}?` : `Restore dari ${providerName}?`;
      
      const message = direction === 'up' 
        ? `Data di Cloud akan DITIMPA dengan data yang ada di komputer ini. Pastikan data lokal Anda adalah yang terbaru.`
        : `PERINGATAN: Semua data di komputer ini akan DIHAPUS dan digantikan dengan data dari Cloud. Pastikan Anda yakin.`;

      const confirmColor = direction === 'up' ? 'blue' : 'red';
      const confirmText = direction === 'up' ? 'Ya, Upload (Backup)' : 'Ya, Download (Restore)';

      showConfirmation(
          title,
          message,
          async () => {
              setIsSyncing(true);
              try {
                  const timestamp = await performSync(config, direction);
                  
                  const updatedSettings = {
                      ...settings,
                      cloudSyncConfig: { ...config, lastSync: timestamp }
                  };
                  await onSaveSettings(updatedSettings);
                  
                  if (direction === 'down') {
                      showToast('Restore Berhasil! Aplikasi akan dimuat ulang...', 'success');
                      setTimeout(() => window.location.reload(), 2000);
                  } else {
                      showToast('Backup Berhasil Disimpan ke Cloud!', 'success');
                  }
              } catch (error) {
                  showToast(`Gagal Sync: ${(error as Error).message}`, 'error');
              } finally {
                  setIsSyncing(false);
              }
          },
          { confirmText, confirmColor }
      );
  };

  return (
    <>
    <aside className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 bg-teal-800 text-white no-print flex flex-col`}>
      <div className="h-full px-3 py-4 overflow-y-auto flex-grow">
        <a href="#" className="flex items-center ps-2.5 mb-5">
          <svg className="h-8 w-8 mr-2 border border-white/30 rounded-md p-1" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
            <title>eSantri Web Logo</title>
            <path d="m 26.162857,42.486896 c 1.430577,-0.139103 3.545862,-0.685224 4.031524,-1.040853 0.19452,-0.142439 0.307128,-0.60171 0.470442,-1.918777 0.306856,-2.4746 0.348698,-2.357265 -0.592643,-1.661853 -1.622159,1.19836 -3.570815,1.849577 -4.965887,1.659545 -0.546479,-0.07444 -0.859981,-0.01176 -1.721001,0.344135 -0.579042,0.239333 -1.751529,0.608853 -2.605527,0.821155 -0.853998,0.2123 -1.568281,0.399202 -1.587292,0.415335 -0.01903,0.01614 0.235087,0.180891 0.56468,0.366129 1.317005,0.558775 2.410158,0.908881 3.23343,1.071618 0.534884,0.105324 1.726666,0.08413 3.172274,-0.05644 z m 13.546517,-0.367931 c 1.154283,-0.349034 1.744549,-0.683716 2.624927,-1.488333 1.764799,-1.612927 2.18285,-4.076581 1.07085,-6.310778 -0.200627,-0.403094 -0.811214,-1.219351 -1.356862,-1.813901 l -0.992088,-1.081001 -1.650487,0.769766 c -0.907763,0.423373 -1.707512,0.823548 -1.777215,0.889282 -0.06995,0.06597 0.430674,0.683228 1.117339,1.377665 1.436145,1.452401 1.9768,2.390791 1.9768,3.431066 0,1.585532 -1.182413,2.573061 -3.098451,2.587767 -1.851819,0.01422 -3.170239,-0.766259 -3.952563,-2.339823 -0.255652,-0.514213 -0.491001,-1.000073 -0.523,-1.079687 -0.127859,-0.318101 -0.219556,0.07073 -0.375503,1.592268 -0.08976,0.875745 -0.200907,1.864 -0.246991,2.196123 -0.07851,0.5657 -0.05503,0.618734 0.371528,0.839314 0.250433,0.129504 1.022439,0.362267 1.715565,0.517254 1.500515,0.335516 3.830431,0.295752 5.096151,-0.08698 z M 11.866048,40.626469 c 1.020556,-0.500151 2.054444,-0.832015 2.982265,-0.957257 l 0.68756,-0.09281 V 38.075643 36.574885 L 14.703555,36.410364 C 13.438321,36.160271 12.938298,35.987582 11.975968,35.468378 L 11.093945,34.992506 9.9042954,35.766367 C 8.031086,36.984872 5.0107355,38.044574 4.3772651,37.70555 3.9702944,37.487745 3.5902974,37.824019 3.7335127,38.275236 c 0.1257906,0.39633 0.797206,0.424765 0.8983306,0.03805 0.06213,-0.2376 0.2903465,-0.278167 2.0358602,-0.361878 1.0812301,-0.05186 2.4014512,-0.09428 2.933819,-0.09428 0.7917475,0 1.0167815,-0.05398 1.2362915,-0.296526 0.64908,-0.717223 1.844188,0.13221 1.317323,0.936298 -0.332361,0.507253 -0.785732,0.562716 -1.201464,0.350824,-0.350826 -0.366401,-0.352462 -3.2771401,-0.344529 l -2.9246417,0.008 1.034983,0.271321 c 1.4849959,0.389292 3.0329312,1.06573 4.1100921,1.79608 0.5139687,0.348484 0.9766597,0.641108 1.0282017,0.650274 0.05152,0.0092 0.47493,-0.17017 0.94088,-0.398521 z m 5.124237,-0.272385 c 0.0033,-0.05972 0.02012,-1.118204 0.03621,-2.35221 l 0.02932,-2.243649 H 16.693943 16.33206 l -0.04025,2.164913 c -0.02209,1.190702 -0.0077,2.249197 0.03161,2.352212 0.07558,0.197064 0.655007,0.26547 0.666853,0.07874 z m 4.001617,-0.628305 c 3.374141,-0.857628 4.778839,-1.488945 15.967196,-7.176203 4.690228,-2.384133 7.258592,-3.33837 11.033259,-4.099241 3.97792,-0.801842 8.572447,-0.652298 11.887212,0.386905 0.624457,0.19577 1.16406,0.327264 1.199115,0.292205 0.143194,-0.143195 -3.176816,-1.120282 -4.795262,-1.411255 -2.183345,-0.392533 -5.704678,-0.525761 -7.754138,-0.293377 -4.610966,0.522832 -8.280091,1.657841 -14.320462,4.429906 -3.817281,1.751836 -7.52494,3.103261 -10.277358,3.746051 -1.851681,0.432435 -4.33587,0.808837 -5.338191,0.808837 h -0.741377 v 1.959132 1.959131 l 0.759951,-0.09515 c 0.417973,-0.05232 1.488998,-0.280454 2.380055,-0.506941 z m -0.118801,-4.40808 c 4.749218,-0.689623 7.959523,-2.012124 9.866298,-4.064455 0.841357,-0.905587 1.214347,-1.528001 1.501476,-2.505551 0.679014,-2.311777 -0.266098,-4.009021 -2.237069,-4.781421 -0.663099,-0.25986 -1.034005,-0.311072 -2.249684,-0.310618 -2.56763,9.39e-4 -4.16567,0.70118 -6.15355,2.696349 -1.32346,1.328311 -2.06801,2.436512 -2.69958,4.018119 -0.3897,0.975922 -0.74112,2.585487 -0.74112,3.394509 0,0.426759 0.0504,0.516006 0.33138,0.586519 0.18225,0.04574 0.40501,0.201076 0.495,0.345183 0.20571,0.329396 0.89555,0.343323 2.862,0.05778 z m 0.11816,-1.45905 c -0.11099,-0.110993 0.16145,-1.565003 0.5066,-2.703751 0.89895,-2.965867 2.8918,-5.028708 4.85807,-5.028708 1.488576,0 2.128809,1.136692 1.614909,2.867184 -0.413016,1.390771 -1.806659,2.666315 -4.103229,3.755501 -1.46343,0.694058 -2.78296,1.203168 -2.87635,1.109774 z m 14.804219,-3.661671 1.341112,-0.577624 -0.441486,-0.596022 c -0.242813,-0.327813 -0.5141,-0.867521 -0.602851,-1.199355 -0.147845,-0.552783 -0.13452,-0.656915 0.159047,-1.242882 0.783436,-1.563747 3.160654,-1.663469 4.629901,-0.194221 0.353158,0.353155 0.680797,0.796275 0.728092,0.984714 0.105859,0.421779 0.294357,0.44384 0.3833,0.04486 0.06507,-0.291898 0.468002,-3.036365 0.468002,-3.187693 0,-0.145749 -1.728025,-0.610339 -2.603914,-0.700076 -1.491442,-0.0773 -2.024052,-0.16772 -3.267158,0.150242 -1.61687,0.421141 -2.840775,1.370544 -3.410741,2.645767 -0.532611,1.191638 -0.357352,3.003822 0.412542,4.265726 0.223681,0.366631 0.304308,0.410539 0.562091,0.306105 0.165522,-0.06706 0.904448,-0.381852 1.642063,-0.699544 z" fill="white" />
          </svg>
          <span className="self-center text-xl font-semibold whitespace-nowrap">eSantri Web</span>
        </a>
        <ul className="space-y-2 font-medium">
          {navItems.map((item) => (
            <li key={item.page}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(item.page);
                }}
                className={`flex items-center p-2 rounded-lg hover:bg-teal-700 group ${currentPage === item.page ? 'bg-teal-900' : ''}`}
              >
                <i className={`${item.icon} text-xl text-gray-300 group-hover:text-white transition duration-75`}></i>
                <span className="ms-3">{item.page}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t border-teal-700">
          <button 
            onClick={handleSyncClick} 
            disabled={isSyncing}
            className="flex items-center justify-center w-full p-2 bg-teal-700 hover:bg-teal-600 rounded-lg text-sm transition-colors group"
            title="Upload/Download data Cloud"
          >
              {isSyncing ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              ) : (
                  <i className="bi bi-cloud-arrow-up-down mr-2 group-hover:text-white text-teal-200"></i>
              )}
              <span>Sync Cloud</span>
          </button>
      </div>
    </aside>

    {/* Sync Selection Modal */}
    {showSyncOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i className="bi bi-cloud-check text-teal-600"></i> Sinkronisasi Cloud
                    </h3>
                    <button onClick={() => setShowSyncOptions(false)} className="text-gray-400 hover:text-gray-600">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 mb-4">Pilih tindakan sinkronisasi yang ingin Anda lakukan:</p>
                    
                    <button 
                        onClick={() => executeSync('up')}
                        className="w-full flex items-center p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4 group-hover:bg-blue-200">
                            <i className="bi bi-cloud-upload-fill text-xl"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 group-hover:text-blue-700">Backup (Upload)</h4>
                            <p className="text-xs text-gray-500">Simpan data komputer ini ke Cloud.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => executeSync('down')}
                        className="w-full flex items-center p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors group text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mr-4 group-hover:bg-orange-200">
                            <i className="bi bi-cloud-download-fill text-xl"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 group-hover:text-orange-700">Restore (Download)</h4>
                            <p className="text-xs text-gray-500">Timpa data komputer ini dengan data Cloud.</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default Sidebar;
