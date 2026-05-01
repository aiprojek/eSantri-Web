import React from 'react';

interface SectionCardProps {
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
    title,
    description,
    actions,
    children,
    className = '',
    contentClassName = '',
}) => {
    return (
        <section className={`app-panel overflow-hidden rounded-panel ${className}`}>
            {(title || description || actions) && (
                <div className="border-b border-app-border px-5 py-4 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            {title && <h2 className="text-lg font-black tracking-tight text-app-text">{title}</h2>}
                            {description && <p className="mt-1 text-sm app-text-muted">{description}</p>}
                        </div>
                        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
                    </div>
                </div>
            )}
            <div className={`${contentClassName}`}>{children}</div>
        </section>
    );
};
