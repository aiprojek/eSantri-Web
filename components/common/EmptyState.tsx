import React from 'react';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    compact?: boolean;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'bi-inbox',
    title,
    description,
    compact = false,
    actionLabel,
    onAction,
}) => {
    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-6 py-10' : 'px-6 py-16'}`}>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700">
                <i className={`bi ${icon} text-2xl`}></i>
            </div>
            <h3 className="text-base font-semibold text-app-text">{title}</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed app-text-muted">{description}</p>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="app-button-primary mt-5 px-4 py-2 text-xs rounded-xl flex items-center gap-1.5"
                >
                    <span>{actionLabel}</span>
                </button>
            )}
        </div>
    );
};
