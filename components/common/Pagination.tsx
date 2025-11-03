import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = (): (number | '...')[] => {
        const pageNumbers = new Set<number | '...'>();
        pageNumbers.add(1);

        if (currentPage > 3) {
            pageNumbers.add('...');
        }

        if (currentPage > 2) pageNumbers.add(currentPage - 1);
        if (currentPage > 1 && currentPage < totalPages) pageNumbers.add(currentPage);
        if (currentPage < totalPages - 1) pageNumbers.add(currentPage + 1);

        if (currentPage < totalPages - 2) {
            pageNumbers.add('...');
        }
        
        if (totalPages > 1) pageNumbers.add(totalPages);
        
        return Array.from(pageNumbers);
    };

    const pages = getPageNumbers();

    return (
        <nav aria-label="Navigasi halaman" className="flex items-center justify-center">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Sebelumnya
            </button>
            {pages.map((page, index) =>
                page === '...' ? (
                    <span key={index} className="px-3 py-2 text-sm text-gray-500 bg-white border-t border-b border-gray-300">...</span>
                ) : (
                    <button
                        key={index}
                        onClick={() => onPageChange(page)}
                        className={`px-3 py-2 text-sm border-t border-b border-gray-300 ${
                            currentPage === page
                                ? 'bg-teal-50 text-teal-600 border-teal-300 font-bold z-10'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                        aria-current={currentPage === page ? 'page' : undefined}
                    >
                        {page}
                    </button>
                )
            )}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Berikutnya
            </button>
        </nav>
    );
};
