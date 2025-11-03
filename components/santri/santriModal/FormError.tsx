import React from 'react';
import { FieldError } from 'react-hook-form';

export const FormError: React.FC<{ error?: FieldError }> = ({ error }) => {
    if (!error) return null;
    return <p className="text-xs text-red-600 mt-1">{error.message}</p>;
};
