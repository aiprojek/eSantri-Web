import React, { useState, useEffect } from 'react';
import { MataPelajaran } from '../../../types';
import { useAppContext } from '../../../AppContext';

interface MapelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: MataPelajaran) => void;
    modalData: {
        mode: 'add' | 'edit';
        jenjangId: number;
        item?: MataPelajaran;
    };
}

export const MapelModal: React.FC<MapelModalProps> = ({ isOpen, onClose, onSave, modalData }) => {
    const { showAlert } = useAppContext();
    const { mode, jenjangId, item } = modalData;
    const [mapel, setMapel] = useState<Partial<MataPelajaran>>({});
    const [modulText, setModulText] = useState('');
    const [linkUnduhText, setLinkUnduhText] = useState('');
    const [linkPembelianText, setLinkPembelianText] = useState('');

    const normalizeList = (input: string): string[] =>
        input
            .split('\n')
            .map(v => v.trim())
            .filter(Boolean);

    useEffect(() => {
        if (isOpen) {
            setMapel(item || {
                nama: '',
                modul: '',
                linkUnduh: '',
                linkPembelian: '',
                kkm: 70
            });
            const source: Partial<MataPelajaran> = item || {};
            const modulItems = (source.modulList && source.modulList.length > 0)
                ? source.modulList
                : (source.modul ? [source.modul] : []);
            const unduhItems = (source.linkUnduhList && source.linkUnduhList.length > 0)
                ? source.linkUnduhList
                : (source.linkUnduh ? [source.linkUnduh] : []);
            const beliItems = (source.linkPembelianList && source.linkPembelianList.length > 0)
                ? source.linkPembelianList
                : (source.linkPembelian ? [source.linkPembelian] : []);
            setModulText(modulItems.join('\n'));
            setLinkUnduhText(unduhItems.join('\n'));
            setLinkPembelianText(beliItems.join('\n'));
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!mapel.nama?.trim()) {
            showAlert('Input Tidak Lengkap', 'Nama mata pelajaran tidak boleh kosong.');
            return;
        }
        
        const newItem: MataPelajaran = {
            id: item?.id || Date.now(),
            nama: mapel.nama.trim(),
            jenjangId: jenjangId,
            modul: normalizeList(modulText)[0] || '',
            linkUnduh: normalizeList(linkUnduhText)[0] || '',
            linkPembelian: normalizeList(linkPembelianText)[0] || '',
            modulList: normalizeList(modulText),
            linkUnduhList: normalizeList(linkUnduhText),
            linkPembelianList: normalizeList(linkPembelianText),
            kkm: mapel.kkm
        };
        
        onSave(newItem);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">{mode === 'add' ? 'Tambah' : 'Edit'} Mata Pelajaran</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="bi bi-x-lg"></i></button>
                </div>
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Nama Mata Pelajaran</label>
                        <input 
                            type="text" 
                            value={mapel.nama || ''} 
                            onChange={(e) => setMapel({...mapel, nama: e.target.value})} 
                            autoFocus 
                            placeholder="Contoh: Fiqih, Tauhid, dll"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700">KKM (Kriteria Ketuntasan Minimal)</label>
                            <input 
                                type="number" 
                                value={mapel.kkm || ''} 
                                onChange={(e) => setMapel({...mapel, kkm: parseInt(e.target.value)})} 
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5" 
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block mb-1 text-sm font-medium text-gray-700">Nama Modul/Kitab (boleh lebih dari satu)</label>
                            <textarea
                                value={modulText}
                                onChange={(e) => setModulText(e.target.value)}
                                rows={3}
                                placeholder={"Contoh:\nSafinatun Najah\nFathul Qarib"}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5"
                            />
                            <p className="mt-1 text-[11px] text-gray-500">Satu baris = satu modul/kitab.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Link Unduh Modul (boleh lebih dari satu)</label>
                        <textarea
                            value={linkUnduhText}
                            onChange={(e) => setLinkUnduhText(e.target.value)}
                            rows={3}
                            placeholder={"https://...\nhttps://..."}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5"
                        />
                        <p className="mt-1 text-[11px] text-gray-500">Satu baris = satu link unduh.</p>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Link Pembelian Kitab Fisik (boleh lebih dari satu)</label>
                        <textarea
                            value={linkPembelianText}
                            onChange={(e) => setLinkPembelianText(e.target.value)}
                            rows={3}
                            placeholder={"https://tokopedia.com/...\nhttps://shopee.co.id/..."}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5"
                        />
                        <p className="mt-1 text-[11px] text-gray-500">Satu baris = satu link beli.</p>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end space-x-2 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} type="button" className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10">Batal</button>
                    <button onClick={handleSave} type="button" className="text-white bg-teal-700 hover:bg-teal-800 focus:ring-4 focus:outline-none focus:ring-teal-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center shadow-md">Simpan</button>
                </div>
            </div>
        </div>
    );
}
