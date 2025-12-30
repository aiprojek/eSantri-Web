
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

      // Open the choice modal for all providers (including Supabase for manual backup)
      setShowSyncOptions(true);
  };

  const executeSync = (direction: 'up' | 'down') => {
      setShowSyncOptions(false); // Close choice modal
      
      const config = settings.cloudSyncConfig;
      let providerName = 'Cloud';
      if (config.provider === 'dropbox') providerName = 'Dropbox';
      if (config.provider === 'webdav') providerName = 'WebDAV';
      if (config.provider === 'supabase') providerName = 'Supabase Storage';
      
      const title = direction === 'up' ? `Backup ke ${providerName}?` : `Restore dari ${providerName}?`;
      
      const message = direction === 'up' 
        ? `Data di Cloud akan DITIMPA dengan data yang ada di komputer ini. Termasuk semua Data Master, Santri, dan Keuangan.`
        : `PERINGATAN: Semua data di komputer ini akan DIHAPUS dan digantikan dengan data dari Cloud. Pastikan Anda yakin.`;

      const confirmColor = direction === 'up' ? 'blue' : 'red';
      const confirmText = direction === 'up' ? 'Ya, Upload (Backup)' : 'Ya, Download (Restore)';

      showConfirmation(
          title,
          message,
          async () => {
              setIsSyncing(true);
              try {
                  const result = await performSync(config, direction);
                  const timestamp = result.timestamp;
                  
                  if (direction === 'up') {
                      // Jika Upload: Update state lokal dengan timestamp baru dan simpan
                      const updatedSettings = {
                          ...settings,
                          cloudSyncConfig: { ...config, lastSync: timestamp }
                      };
                      await onSaveSettings(updatedSettings);
                      showToast('Backup Berhasil Disimpan ke Cloud!', 'success');
                  } else {
                      // Jika Download (Restore): JANGAN gunakan 'settings' dari state karena itu data lama (stale).
                      // Kita harus update timestamp langsung ke DB pada data yang BARU saja di-restore.
                      const { db } = await import('../db');
                      const restoredSettings = await db.settings.toCollection().first();
                      
                      if (restoredSettings && restoredSettings.id) {
                           // Pertahankan config koneksi cloud agar tidak terputus, tapi update timestamp
                           const updatedConfig = { 
                               ...restoredSettings.cloudSyncConfig, 
                               lastSync: timestamp 
                           };
                           await db.settings.update(restoredSettings.id, { cloudSyncConfig: updatedConfig });
                      }

                      // Provide Detailed Feedback
                      let details = "Restore Berhasil! ";
                      if (result.stats) {
                          details += `Dipulihkan: ${result.stats.santri} Santri, ${result.stats.tagihan + result.stats.pembayaran} Data Keuangan, ${result.stats.arsip} Surat.`;
                      }
                      
                      showToast(details, 'success');
                      // Reload wajib dilakukan untuk merefresh state aplikasi dari DB
                      setTimeout(() => window.location.reload(), 2000);
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
          {/* Inline SVG Logo matching Tentang page */}
          <div className="h-8 w-8 mr-2 flex-shrink-0">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full border border-white/30 rounded-md p-0.5">
                <rect width="64" height="64" rx="12" fill="#0f766e"/>
                <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06995,0.06597 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.807226,3.136742 0,1.449522 -1.080984,2.352339 -2.83266,2.365783 -1.692966,0.013 -2.898289,-0.700527 -3.613504,-2.139108 -0.233721,-0.470103 -0.448882,-0.914285 -0.478136,-0.987069 -0.116891,-0.290814 -0.200722,0.06466 -0.343292,1.455679 -0.08206,0.800623 -0.183673,1.704103 -0.225804,2.196123 -0.07851,0.5657 -0.05503,0.618734 0.371528,0.839314 0.250433,0.129504 1.022439,0.362267 1.715565,0.517254 1.500515,0.335516 3.830431,0.295752 5.096151,-0.08698 z M 11.866048,40.626469 c 1.020556,-0.500151 2.054444,-0.832015 2.982265,-0.957257 l 0.68756,-0.09281 V 38.075643 36.574885 L 14.703555,36.410364 C 13.438321,36.160271 12.938298,35.987582 11.975968,35.468378 L 11.093945,34.992506 9.9042954,35.766367 C 8.031086,36.984872 5.0107355,38.044574 4.3772651,37.70555 3.9702944,37.487745 3.5902974,37.824019 3.7335127,38.275236 c 0.1257906,0.39633 0.797206,0.424765 0.8983306,0.03805 0.06213,-0.2376 0.2903465,-0.278167 2.0358602,-0.361878 1.0812301,-0.05186 2.4014512,-0.09428 2.933819,-0.09428 0.7917475,0 1.0167815,-0.05398 1.2362915,-0.296526 0.64908,-0.717223 1.844188,0.13221 1.317323,0.936298 -0.332361,0.507253 -0.785732,0.562716 -1.201464,0.146983 -0.350824,-0.350826 -0.366401,-0.352462 -3.2771401,-0.344529 l -2.9246417,0.008 1.034983,0.271321 c 1.4849959,0.389292 3.0329312,1.06573 4.1100921,1.79608 0.5139687,0.348484 0.9766597,0.641108 1.0282017,0.650274 0.05152,0.0092 0.47493,-0.17017 0.94088,-0.398521 z m 5.124237,-0.272385 c 0.0033,-0.05972 0.02012,-1.118204 0.03621,-2.35221 l 0.02932,-2.243649 H 16.693943 16.33206 l -0.04025,2.164913 c -0.02209,1.190702 -0.0077,2.249197 0.03161,2.352212 0.07558,0.197064 0.655007,0.26547 0.666853,0.07874 z m 4.001617,-0.628305 c 3.374141,-0.857628 4.778839,-1.488945 15.967196,-7.176203 4.690228,-2.384133 7.258592,-3.33837 11.033259,-4.099241 3.97792,-0.801842 8.572447,-0.652298 11.887212,0.386905 0.624457,0.19577 1.16406,0.327264 1.199115,0.292205 0.143194,-0.143195 -3.176816,-1.120282 -4.795262,-1.411255 -2.183345,-0.392533 -5.704678,-0.525761 -7.754138,-0.293377 -4.610966,0.522832 -8.280091,1.657841 -14.320462,4.429906 -3.817281,1.751836 -7.52494,3.103261 -10.277358,3.746051 -1.851681,0.432435 -4.33587,0.808837 -5.338191,0.808837 h -0.741377 v 1.959132 1.959131 l 0.759951,-0.09515 c 0.417973,-0.05232 1.488998,-0.280454 2.380055,-0.506941 z m -0.118801,-4.40808 c 4.749218,-0.689623 7.959523,-2.012124 9.866298,-4.064455 0.841357,-0.905587 1.214347,-1.528001 1.501476,-2.505551 0.679014,-2.311777 -0.291066,-4.385192 -2.446976,-5.230066 -0.725318,-0.284243 -1.131027,-0.34026 -2.460774,-0.339764 -2.808553,0.001 -4.556539,0.766973 -6.730944,2.94935 -1.447641,1.452948 -2.262053,2.665132 -2.952885,4.395143 -0.426266,1.067494 -0.81066,2.828086 -0.81066,3.71302 0,0.466802 0.05513,0.564423 0.362475,0.641552 0.19935,0.05003 0.443012,0.219943 0.541446,0.377572 0.225012,0.360303 0.97958,0.375537 3.130544,0.0632 z m 0.129247,-1.595953 c -0.121405,-0.121408 0.176599,-1.71185 0.554135,-2.957448 0.9833,-3.244156 3.16314,-5.500556 5.313908,-5.500556 1.62825,0 2.328557,1.243349 1.766437,3.136215 -0.451769,1.521269 -1.976179,2.916498 -4.488239,4.107883 -1.600745,0.759182 -3.044088,1.316063 -3.146241,1.213906 z m 16.193314,-4.00525 1.466951,-0.631823 -0.482912,-0.651947 c -0.265596,-0.358572 -0.562338,-0.948922 -0.659417,-1.311892 -0.161717,-0.604651 -0.147142,-0.718554 0.17397,-1.359502 0.856947,-1.710476 3.457222,-1.819555 5.06433,-0.212446 0.386295,0.386292 0.744677,0.87099 0.79641,1.077111 0.115791,0.461354 0.321976,0.485485 0.419264,0.04907 0.07118,-0.319288 0.511916,-3.32127 0.511916,-3.486797 0,-0.159425 -1.890167,-0.667608 -2.848242,-0.765765 -1.631386,-0.08456 -2.213971,-0.183458 -3.573718,0.164339 -1.768583,0.460657 -3.107329,1.499143 -3.730775,2.894023 -0.582587,1.30345 -0.390883,3.285673 0.451251,4.665983 0.244669,0.401032 0.332862,0.44906 0.614833,0.334826 0.181053,-0.07335 0.989313,-0.417681 1.796139,-0.765182 z" fill="white" />
            </svg>
          </div>
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
