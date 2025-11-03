import React from 'react';

export const FormSection: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="pt-6">
        <h3 className="text-base font-semibold text-gray-800 border-b pb-2 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {children}
        </div>
    </div>
);
