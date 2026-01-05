
import React, { useState } from 'react';

export const TabKontak: React.FC = () => {
    const [contactName, setContactName] = useState('');
    const [contactSubject, setContactSubject] = useState('');
    const [contactMessage, setContactMessage] = useState('');

    const mailtoLink = `mailto:aiprojek01@gmail.com?subject=${encodeURIComponent(contactSubject)}&body=${encodeURIComponent(`Halo,\n\nNama saya ${contactName}.\n\n${contactMessage}`)}`;

    return (
        <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Hubungi Pengembang</h3>
            <p className="text-gray-600 mb-6 text-center">
                Punya pertanyaan, saran fitur, atau ingin melaporkan bug? Silakan kirim pesan kepada kami.
            </p>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Anda</label>
                    <input 
                        type="text" 
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Nama Lengkap"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subjek</label>
                    <input 
                        type="text" 
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Topik pesan"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
                    <textarea 
                        rows={5}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Tulis pesan Anda di sini..."
                    ></textarea>
                </div>
                <div className="text-center pt-2">
                    <a 
                        href={mailtoLink}
                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors font-medium ${(!contactName || !contactSubject || !contactMessage) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                    >
                        <i className="bi bi-send-fill"></i>
                        Kirim Email
                    </a>
                    <p className="text-xs text-gray-500 mt-2">Akan membuka aplikasi email default Anda.</p>
                </div>
            </div>
        </div>
    );
};
