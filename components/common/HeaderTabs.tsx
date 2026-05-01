import React, { useEffect, useRef, useState } from 'react';

type TabValue = string;

export interface HeaderTabItem<T extends TabValue> {
    value: T;
    label: string;
    icon?: string;
    badge?: React.ReactNode;
    mobileLabel?: string;
}

interface HeaderTabsProps<T extends TabValue> {
    tabs: HeaderTabItem<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
}

export const HeaderTabs = <T extends TabValue>({
    tabs,
    value,
    onChange,
    className = '',
}: HeaderTabsProps<T>) => {
    const desktopRailRef = useRef<HTMLDivElement | null>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const preferScrollable = tabs.length > 4;
    const useScrollable = preferScrollable || isOverflowing;
    const useEqualWidth = !useScrollable;

    useEffect(() => {
        const rail = desktopRailRef.current;
        if (!rail) return;

        const measure = () => {
            setIsOverflowing(rail.scrollWidth > rail.clientWidth + 1);
        };

        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(rail);

        return () => observer.disconnect();
    }, [tabs]);

    return (
        <div className={`w-full ${className}`}>
            <div className="md:hidden">
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value as T)}
                    className="app-select h-11 w-full rounded-2xl border-app-border bg-white/95 px-4 text-sm font-semibold shadow-sm"
                    aria-label="Pilih navigasi halaman"
                >
                    {tabs.map((tab) => (
                        <option key={tab.value} value={tab.value}>
                            {tab.mobileLabel || tab.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="hidden md:block">
                <div
                    ref={desktopRailRef}
                    className={`app-panel app-scrollbar flex w-full items-center gap-2 rounded-2xl p-2.5 ${
                        useScrollable ? 'overflow-x-auto' : 'overflow-hidden'
                    }`}
                >
                    {tabs.map((tab) => {
                        const isActive = tab.value === value;

                        return (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => onChange(tab.value)}
                                className={`flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors ${
                                    useEqualWidth ? 'min-w-0 flex-1 justify-center' : 'shrink-0'
                                } ${
                                    isActive
                                        ? 'bg-teal-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-teal-50 hover:text-slate-900'
                                }`}
                            >
                                {tab.icon && <i className={`bi ${tab.icon}`}></i>}
                                <span>{tab.label}</span>
                                {tab.badge}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
