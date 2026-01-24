import React, { useState, useMemo } from 'react';
import { FEATURE_DATA, FeatureCategory, FeatureItemData } from '../../data/content';

const FeatureCard: React.FC<{ item: FeatureItemData }> = ({ item }) => (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-teal-200 h-full">
        <div className="flex-shrink-0 bg-gray-50 text-teal-600 rounded-md w-10 h-10 flex items-center justify-center">
            <i className={`bi ${item.icon} text-lg`}></i>
        </div>
        <div>
            <h4 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{item.title}</h4>
            <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
        </div>
    </div>
);

export const TabTentang: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return FEATURE_DATA;

        const lowerSearch = searchTerm.toLowerCase();
        return FEATURE_DATA.map(group => {
            // Filter items inside the group
            const filteredItems = group.items.filter(item => 
                item.title.toLowerCase().includes(lowerSearch) || 
                item.desc.toLowerCase().includes(lowerSearch)
            );
            
            // Return group only if it has matching items (or if group title matches)
            if (filteredItems.length > 0) {
                return { ...group, items: filteredItems };
            }
            return null;
        }).filter(group => group !== null) as FeatureCategory[];
    }, [searchTerm]);

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="p-6 bg-gradient-to-br from-teal-50 to-white border border-teal-100 rounded-lg text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative z-10">
                    <svg className="w-16 h-16 mb-3 mx-auto shadow-sm rounded-xl" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="64" height="64" rx="12" fill="#0f766e"/>
                        <path style={{fill: '#ffffff', strokeWidth: '0.132335'}} d="m 26.304352,41.152506 c 1.307859,-0.12717 3.241691,-0.626444 3.685692,-0.951566 0.177834,-0.130221 0.280781,-0.550095 0.430086,-1.754181 0.280533,-2.262324 0.318787,-2.155054 -0.541805,-1.519296 -1.483007,1.095563 -3.264503,1.690917 -4.539903,1.517186 -0.4996,-0.06805 -0.78621,-0.01075 -1.57337,0.314614 -0.52937,0.218803 -1.60128,0.556625 -2.38202,0.750715 -0.78074,0.194089 -1.43375,0.364958 -1.45113,0.379707 -0.0174,0.01475 0.21492,0.165374 0.51624,0.334722 1.20403,0.510842 2.20341,0.830915 2.95606,0.979692 0.489,0.09629 1.57855,0.07691 2.90015,-0.05159 z m 12.38447,-0.336369 c 1.055266,-0.319093 1.594897,-0.625065 2.399755,-1.360661 1.613411,-1.474567 1.995601,-3.726883 0.97899,-5.769426 -0.183416,-0.368517 -0.741626,-1.114753 -1.240467,-1.658302 l -0.906985,-0.98827 -1.508905,0.703734 c -0.829893,0.387055 -1.561038,0.752903 -1.624762,0.812997 -0.06395,0.06031 0.39373,0.62462 1.021492,1.259487 1.31295,1.327811 1.807226,2.185704 1.9768,3.431066 0,1.585532 -1.182413,2.573061 -3.098451,2.587767 -1.851819,0.01422 -3.170239,-0.766259 -3.952563,-2.339823 -0.255652,-0.514213 -0.491001,-1.000073 -0.523,-1.079687 -0.127859,-0.318101 -0.219556,0.07073 -0.375503,1.592268 -0.08976,0.875745 -0.200907,1.864 -0.246991,2.196123 -0.07851,0.5657 -0.05503,0.618734 0.371528,0.839314 0.250433,0.129504 1.022439,0.362267 1.715565,0.517254 1.500515,0.335516 3.830431,0.295752 5.096151,-0.08698 z m -25.45487,-1.364466 c 0.93301,-0.457248 1.87821,-0.760644 2.72644,-0.875142 l 0.62858,-0.08485 v -1.37202 -1.372019 l -0.76092,-0.150409 c -1.1567,-0.228639 -1.61383,-0.386514 -2.49361,-0.86118 l -0.80636,-0.435051 -1.0876,0.707478 c -1.7125205,1.113979 -4.4737803,2.082778 -5.0529103,1.772836 -0.37206,-0.199121 -0.71946,0.108306 -0.58853,0.520817 0.115,0.362332 0.72882,0.388328 0.82127,0.03479 0.0568,-0.217219 0.26544,-0.254305 1.8612198,-0.330836 0.98848,-0.04741 2.1954505,-0.08619 2.6821505,-0.08619 0.72383,0 0.92956,-0.04935 1.13024,-0.27109 0.5934,-0.655698 1.68599,0.120869 1.20432,0.855981 -0.30385,0.46374 -0.71833,0.514445 -1.0984,0.134374 -0.32073,-0.320731 -0.33497,-0.322227 -2.9960205,-0.314975 l -2.6737598,0.0073 0.9462,0.248046 c 1.3576098,0.355898 2.7727603,0.97431 3.7575203,1.642008 0.46988,0.318591 0.89288,0.586114 0.94,0.594493 0.0471,0.0084 0.43419,-0.155572 0.86017,-0.364335 z m 4.68467,-0.249019 c 0.003,-0.05459 0.0184,-1.022283 0.0331,-2.150434 l 0.0268,-2.051184 h -0.33083 -0.33084 l -0.0368,1.979203 c -0.0202,1.08856 -0.007,2.056256 0.0289,2.150434 0.0691,0.180159 0.59882,0.242698 0.60965,0.07198 z m 3.65835,-0.574409 c 3.0847,-0.784059 4.3689,-1.36122 14.597498,-6.560614 4.28789,-2.179617 6.635935,-3.051997 10.086804,-3.7476 3.636686,-0.733057 7.837085,-0.596342 11.887212,0.386905 0.624457,0.19577 1.16406,0.327264 1.199115,0.292205 0.143194,-0.143195 -3.176816,-1.120282 -4.795262,-1.411255 -2.183345,-0.392533 -5.704678,-0.525761 -7.754138,-0.293377 -4.610966,0.522832 -8.280091,1.657841 -14.320462,4.429906 -3.817281,1.751836 -7.52494,3.103261 -10.277358,3.746051 -1.851681,0.432435 -4.33587,0.808837 -5.338191,0.808837 h -0.741377 v 1.959132 1.959131 l 0.759951,-0.09515 c 0.417973,-0.05232 1.488998,-0.280454 2.380055,-0.506941 z m -0.118801,-4.40808 c 4.749218,-0.689623 7.959523,-2.012124 9.866298,-4.064455 0.841357,-0.905587 1.214347,-1.528001 1.501476,-2.505551 0.679014,-2.311777 -0.291066,-4.385192 -2.446976,-5.230066 -0.725318,-0.284243 -1.131027,-0.34026 -2.460774,-0.339764 -2.808553,0.001 -4.556539,0.766973 -6.730944,2.94935 -1.447641,1.452948 -2.262053,2.665132 -2.952885,4.395143 -0.426266,1.067494 -0.81066,2.828086 -0.81066,3.71302 0,0.466802 0.05513,0.564423 0.362475,0.641552 0.19935,0.05003 0.443012,0.219943 0.541446,0.377572 0.225012,0.360303 0.97958,0.375537 3.130544,0.0632 z m 0.129247,-1.595953 c -0.121405,-0.121408 0.176599,-1.71185 0.554135,-2.957448 0.9833,-3.244156 3.16314,-5.500556 5.313908,-5.500556 1.62825,0 2.328557,1.243349 1.766437,3.136215 -0.451769,1.521269 -1.976179,2.916498 -4.488239,4.107883 -1.600745,0.759182 -3.044088,1.316063 -3.146241,1.213906 z m 16.193314,-4.00525 1.466951,-0.631823 -0.482912,-0.651947 c -0.265596,-0.358572 -0.562338,-0.948922 -0.659417,-1.311892 -0.161717,-0.604651 -0.147142,-0.718554 0.17397,-1.359502 0.856947,-1.710476 3.457222,-1.819555 5.06433,-0.212446 0.386295,0.386292 0.744677,0.87099 0.79641,1.077111 0.115791,0.461354 0.321976,0.485485 0.419264,0.04907 0.07118,-0.319288 0.511916,-3.32127 0.511916,-3.486797 0,-0.159425 -1.890167,-0.667608 -2.848242,-0.765765 -1.631386,-0.08456 -2.213971,-0.183458 -3.573718,0.164339 -1.768583,0.460657 -3.107329,1.499143 -3.730775,2.894023 -0.582587,1.30345 -0.390883,3.285673 0.451251,4.665983 0.244669,0.401032 0.332862,0.181053,-0.07335 0.989313,-0.417681 1.796139,-0.765182 z" fill="white" />
                    </svg>
                    <h2 className="text-2xl font-bold text-teal-800">eSantri Web</h2>
                    <p className="mt-2 text-base text-teal-700 max-w-xl mx-auto">
                        Sistem Manajemen Pondok Pesantren Modern & Gratis. <br/>
                        Aman, Cepat, Offline-First.
                    </p>
                </div>
            </div>

            {/* Feature List */}
            <div className="bg-gray-50/80 p-5 rounded-lg border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                        <i className="bi bi-stars text-teal-600"></i>
                        <span>Fitur Unggulan</span>
                    </h3>
                    
                    {/* Search Input */}
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Cari fitur..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500 bg-white"
                        />
                        <i className="bi bi-search absolute left-3 top-2.5 text-gray-400"></i>
                    </div>
                </div>

                <div className="space-y-6">
                    {filteredGroups.map(group => (
                        <div key={group.id} className="animate-fade-in">
                            <h4 className={`text-base font-bold mb-3 flex items-center gap-2 ${group.color} border-b pb-2`}>
                                <i className={`bi ${group.icon}`}></i> {group.title}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.items.map((item, idx) => (
                                    <FeatureCard key={idx} item={item} />
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {filteredGroups.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <i className="bi bi-search text-3xl mb-2 block"></i>
                            <p>Tidak ada fitur yang cocok dengan pencarian "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-6 bg-white border border-gray-200 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                    <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                        <i className="bi bi-cup-hot-fill"></i>
                        <span>Traktir Kopi</span>
                    </a>
                    <a href="https://github.com/aiprojek/eSantri-Web" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
                        <i className="bi bi-github"></i>
                        <span>GitHub</span>
                    </a>
                    <a href="https://t.me/aiprojek_community/32" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors">
                        <i className="bi bi-telegram"></i>
                        <span>Diskusi</span>
                    </a>
                </div>
                <div className="mt-8 pt-6 border-t text-center text-sm text-gray-600 space-y-2">
                    <p>
                        <strong>Pengembang:</strong> <a href="https://aiprojek01.my.id" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">AI Projek</a>. <strong>Lisensi:</strong> <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">GNU GPL v3</a>
                    </p>
                </div>
            </div>
        </div>
    );
};