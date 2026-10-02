import React from 'react';
import { parseMarkdownToHtml } from '../../utils/markdownUtils';

interface MarkdownViewerProps {
    content: string;
    className?: string;
    emptyText?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
    content,
    className = '',
    emptyText = 'Tidak ada catatan.'
}) => {
    if (!content || !content.trim()) {
        return <p className="text-xs text-gray-400 italic">{emptyText}</p>;
    }

    const html = parseMarkdownToHtml(content);

    return (
        <div
            className={`prose prose-sm max-w-none text-gray-800 leading-relaxed text-sm ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};
