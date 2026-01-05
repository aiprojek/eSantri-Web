
import React, { useState } from 'react';

export const TabKontak: React.FC = () => {
    const [contactName, setContactName] = useState('');
    const [contactSubject, setContactSubject] = useState('');
    const [contactMessage, setContactMessage] = useState('');

    const mailtoLink = `mailto:aiprojek01@gmail.com?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(`Halo,\n\nNama saya ${contactName}.\n\n${contactMessage}`)}`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <i className="bi bi-envelope-paper-fill text-teal-600"></i> Kirim Pesan
                </h3>
                <p className="text-gray-600 mb-6 text-sm">
                    Punya pertanyaan, saran fitur, atau ingin melaporkan bug? Silakan isi formulir di bawah ini untuk mengirim email langsung kepada kami.
                </p>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Anda</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <i className="bi bi-person-fill"></i>
                                </div>
                                <input 
                                    type="text" 
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg pl-10 p-2.5 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white transition-colors"
                                    placeholder="Nama Lengkap"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subjek</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <i className="bi bi-chat-quote-fill"></i>
                                </div>
                                <input 
                                    type="text" 
                                    value={contactSubject}
                                    onChange={(e) => setContactSubject(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg pl-10 p-2.5 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white transition-colors"
                                    placeholder="Topik pesan"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
                        <div className="relative">
                            <textarea 
                                rows={5}
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white transition-colors resize-none"
                                placeholder="Tulis pesan Anda di sini..."
                            ></textarea>
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <a 
                            href={mailtoLink}
                            className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-all shadow-sm hover:shadow-md font-medium w-full sm:w-auto ${(!contactName || !contactSubject || !contactMessage) ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
                        >
                            <i className="bi bi-send-fill"></i>
                            Kirim Email Sekarang
                        </a>
                        <p className="text-xs text-gray-400 mt-2 italic">*Akan membuka aplikasi email default Anda (seperti Gmail/Outlook).</p>
                    </div>
                </div>
            </div>

            <div className="md:col-span-1 border-l pl-0 md:pl-8 border-gray-200 mt-6 md:mt-0">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Saluran Lain</h3>
                <div className="space-y-3">
                    <a href="https://t.me/aiprojek_community/32" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 group-hover:bg-blue-200 group-hover:text-blue-600 transition-colors">
                            <i className="bi bi-telegram text-xl"></i>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-800 group-hover:text-blue-700">Telegram</div>
                            <div className="text-xs text-gray-500">Gabung Diskusi Komunitas</div>
                        </div>
                    </a>

                    <a href="https://github.com/aiprojek/eSantri-Web/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-200 group-hover:text-black transition-colors">
                            <i className="bi bi-github text-xl"></i>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-800">GitHub Issues</div>
                            <div className="text-xs text-gray-500">Laporkan Bug / Request Fitur</div>
                        </div>
                    </a>

                    <a href="mailto:aiprojek01@gmail.com" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 group-hover:bg-red-200 group-hover:text-red-600 transition-colors">
                            <i className="bi bi-envelope-fill text-xl"></i>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-800 group-hover:text-red-700">Email Langsung</div>
                            <div className="text-xs text-gray-500">aiprojek01@gmail.com</div>
                        </div>
                    </a>
                </div>

                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-bold text-yellow-800 text-sm mb-1"><i className="bi bi-cup-hot-fill mr-1"></i> Dukung Kami</h4>
                    <p className="text-xs text-yellow-700 mb-3">
                        Aplikasi ini gratis dan open source. Jika bermanfaat, Anda bisa mentraktir kami kopi.
                    </p>
                    <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer" className="block w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-center rounded text-sm font-bold transition-colors">
                        Traktir Kopi
                    </a>
                </div>
            </div>
        </div>
    );
};
