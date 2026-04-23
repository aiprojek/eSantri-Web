import React, { useState } from 'react';

interface SensitiveInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

export const SensitiveInput: React.FC<SensitiveInputProps> = ({ value, onChange, placeholder }) => {
    const [show, setShow] = useState(false);

    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 pr-10"
            />
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                title={show ? 'Sembunyikan' : 'Tampilkan'}
            >
                <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
        </div>
    );
};
