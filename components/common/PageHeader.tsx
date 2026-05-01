import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: React.ReactNode;
    tabs?: React.ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    description,
    eyebrow,
    actions,
    tabs,
    className = '',
}) => {
    return (
        <div className={`app-panel-elevated rounded-panel px-5 py-5 sm:px-6 ${className}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    {eyebrow && (
                        <div className="mb-3 inline-flex items-center rounded-full border border-app-border bg-teal-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
                            {eyebrow}
                        </div>
                    )}
                    <h1 className="text-2xl font-black tracking-tight text-app-text md:text-3xl">{title}</h1>
                    {description && (
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed app-text-secondary md:text-[15px]">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap md:w-auto md:justify-end">
                        {actions}
                    </div>
                )}
            </div>
            {tabs && (
                <div className="-mx-5 mt-5 border-t border-app-border px-5 pt-3 sm:-mx-6 sm:px-6">
                    <div className="app-header-tabs-divider">
                        {tabs}
                    </div>
                </div>
            )}
        </div>
    );
};
