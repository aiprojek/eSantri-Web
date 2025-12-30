
import React from 'react';
import { PsbCustomField, PsbFieldType } from '../../../types';

export const CustomFieldEditor: React.FC<{ fields: PsbCustomField[], onChange: (fields: PsbCustomField[]) => void }> = ({ fields, onChange }) => {
    const addField = () => {
        const newField: PsbCustomField = {
            id: 'field_' + Date.now(),
            type: 'text',
            label: 'Pertanyaan Baru',
            required: false
        };
        onChange([...fields, newField]);
    };

    const updateField = (index: number, updates: Partial<PsbCustomField>) => {
        const updated = [...fields];
        updated[index] = { ...updated[index], ...updates };
        onChange(updated);
    };

    const removeField = (index: number) => {
        onChange(fields.filter((_, i) => i !== index));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
        const updated = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-3 bg-gray-50 relative group">
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveField(index, 'up')} className="p-1 text-gray-500 hover:text-gray-700" title="Geser Naik"><i className="bi bi-arrow-up"></i></button>
                        <button onClick={() => moveField(index, 'down')} className="p-1 text-gray-500 hover:text-gray-700" title="Geser Turun"><i className="bi bi-arrow-down"></i></button>
                        <button onClick={() => removeField(index)} className="p-1 text-red-500 hover:text-red-700" title="Hapus"><i className="bi bi-trash"></i></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2 pr-20">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Field</label>
                            <select 
                                value={field.type} 
                                onChange={(e) => updateField(index, { type: e.target.value as PsbFieldType })}
                                className="w-full border rounded p-1.5 text-sm"
                            >
                                <option value="text">Teks Singkat</option>
                                <option value="paragraph">Paragraf / Essai</option>
                                <option value="radio">Pilihan Ganda (Radio)</option>
                                <option value="checkbox">Kotak Centang (Checkbox)</option>
                                <option value="file">Unggah Dokumen (PDF/JPG)</option>
                                <option value="section">Judul Bagian (Section)</option>
                                <option value="statement">Pernyataan / Info</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Label / Pertanyaan</label>
                            <input 
                                type="text" 
                                value={field.label} 
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                className="w-full border rounded p-1.5 text-sm"
                            />
                        </div>
                    </div>

                    {(field.type === 'radio' || field.type === 'checkbox') && (
                        <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Opsi Jawaban (pisahkan dengan koma)</label>
                            <input 
                                type="text" 
                                value={field.options?.join(', ') || ''} 
                                onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()) })}
                                className="w-full border rounded p-1.5 text-sm"
                                placeholder="Contoh: Ya, Tidak, Mungkin"
                            />
                        </div>
                    )}

                    {field.type !== 'section' && field.type !== 'statement' && (
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id={`req-${field.id}`}
                                checked={field.required}
                                onChange={(e) => updateField(index, { required: e.target.checked })}
                                className="w-4 h-4 text-teal-600 rounded"
                            />
                            <label htmlFor={`req-${field.id}`} className="text-xs text-gray-600">Wajib Diisi</label>
                        </div>
                    )}
                </div>
            ))}
            <button onClick={addField} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-600 text-sm font-medium transition-colors">
                + Tambah Pertanyaan Lain
            </button>
        </div>
    );
};
