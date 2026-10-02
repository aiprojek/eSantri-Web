/**
 * Utility for parsing and rendering basic markdown safely into HTML
 * Supports: Bold, Italic, Headings (#..###), Lists (- / * / 1.), Blockquotes (>),
 * Code inline (`code`), Code blocks (```), Checkboxes (- [ ] / - [x]), and line breaks.
 */

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function parseMarkdownToHtml(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') return '';

    const lines = markdown.split(/\r?\n/);
    const htmlLines: string[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' = 'ul';
    let inBlockquote = false;
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    const closeListIfNeeded = () => {
        if (inList) {
            htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
            inList = false;
        }
    };

    const closeBlockquoteIfNeeded = () => {
        if (inBlockquote) {
            htmlLines.push('</blockquote>');
            inBlockquote = false;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Code block toggle
        if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
                // close code block
                htmlLines.push(`<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs my-2"><code>${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`);
                codeBlockContent = [];
                inCodeBlock = false;
            } else {
                closeListIfNeeded();
                closeBlockquoteIfNeeded();
                inCodeBlock = true;
                codeBlockContent = [];
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
        }

        // Empty line
        if (!line.trim()) {
            closeListIfNeeded();
            closeBlockquoteIfNeeded();
            htmlLines.push('<div class="h-2"></div>');
            continue;
        }

        // Horizontal Rule
        if (/^(\*\*\*|---|___)$/.test(line.trim())) {
            closeListIfNeeded();
            closeBlockquoteIfNeeded();
            htmlLines.push('<hr class="my-3 border-gray-200" />');
            continue;
        }

        // Headings (#, ##, ###, ####)
        const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
            closeListIfNeeded();
            closeBlockquoteIfNeeded();
            const level = headingMatch[1].length;
            const content = formatInlineMarkdown(headingMatch[2]);
            if (level === 1) {
                htmlLines.push(`<h1 class="text-xl font-bold text-gray-900 mt-3 mb-1.5">${content}</h1>`);
            } else if (level === 2) {
                htmlLines.push(`<h2 class="text-lg font-bold text-gray-800 mt-2.5 mb-1">${content}</h2>`);
            } else if (level === 3) {
                htmlLines.push(`<h3 class="text-base font-semibold text-gray-800 mt-2 mb-1">${content}</h3>`);
            } else {
                htmlLines.push(`<h4 class="text-sm font-semibold text-gray-700 mt-1.5 mb-0.5">${content}</h4>`);
            }
            continue;
        }

        // Blockquote
        if (line.startsWith('>')) {
            closeListIfNeeded();
            const quoteContent = formatInlineMarkdown(line.replace(/^>\s?/, ''));
            if (!inBlockquote) {
                htmlLines.push('<blockquote class="border-l-4 border-teal-500 pl-3 py-1 my-2 bg-teal-50/50 text-gray-700 italic text-sm rounded-r">');
                inBlockquote = true;
            }
            htmlLines.push(`<p class="my-0.5">${quoteContent}</p>`);
            continue;
        } else {
            closeBlockquoteIfNeeded();
        }

        // Checklist item (- [ ] or - [x])
        const checkMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
        if (checkMatch) {
            if (!inList || listType !== 'ul') {
                closeListIfNeeded();
                htmlLines.push('<ul class="space-y-1 my-1 list-none pl-0 text-sm">');
                inList = true;
                listType = 'ul';
            }
            const isChecked = checkMatch[1].toLowerCase() === 'x';
            const itemContent = formatInlineMarkdown(checkMatch[2]);
            htmlLines.push(
                `<li class="flex items-start gap-2 text-gray-700">` +
                `<span class="inline-flex items-center justify-center w-4 h-4 rounded border ${isChecked ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300 bg-white'} text-[10px] mt-0.5 shrink-0">${isChecked ? '✓' : ''}</span>` +
                `<span class="${isChecked ? 'line-through text-gray-400' : ''}">${itemContent}</span>` +
                `</li>`
            );
            continue;
        }

        // Unordered list (- or *)
        const ulMatch = line.match(/^[-*]\s+(.+)$/);
        if (ulMatch) {
            if (!inList || listType !== 'ul') {
                closeListIfNeeded();
                htmlLines.push('<ul class="list-disc list-inside space-y-1 my-1 text-sm text-gray-700">');
                inList = true;
                listType = 'ul';
            }
            htmlLines.push(`<li>${formatInlineMarkdown(ulMatch[1])}</li>`);
            continue;
        }

        // Ordered list (1. 2. etc)
        const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (olMatch) {
            if (!inList || listType !== 'ol') {
                closeListIfNeeded();
                htmlLines.push('<ol class="list-decimal list-inside space-y-1 my-1 text-sm text-gray-700">');
                inList = true;
                listType = 'ol';
            }
            htmlLines.push(`<li>${formatInlineMarkdown(olMatch[2])}</li>`);
            continue;
        }

        // Regular paragraph
        closeListIfNeeded();
        closeBlockquoteIfNeeded();
        htmlLines.push(`<p class="text-sm text-gray-700 leading-relaxed my-1">${formatInlineMarkdown(line)}</p>`);
    }

    if (inCodeBlock) {
        htmlLines.push(`<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs my-2"><code>${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`);
    }
    closeListIfNeeded();
    closeBlockquoteIfNeeded();

    return htmlLines.join('\n');
}

/**
 * Parses inline formatting: bold, italic, inline code, links, badge tags
 */
export function formatInlineMarkdown(text: string): string {
    if (!text) return '';

    let out = escapeHtml(text);

    // Inline code `code`
    out = out.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-teal-700 px-1.5 py-0.5 rounded text-xs font-mono font-semibold">$1</code>');

    // Bold **text** or __text__
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<strong class="font-bold text-gray-900">$1</strong>');

    // Italic *text* or _text_
    out = out.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-800">$1</em>');
    out = out.replace(/_([^_]+)_/g, '<em class="italic text-gray-800">$1</em>');

    // Strikethrough ~~text~~
    out = out.replace(/~~([^~]+)~~/g, '<del class="line-through text-gray-400">$1</del>');

    // Simple markdown link [text](url)
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-teal-600 hover:text-teal-800 underline font-medium">$1</a>');

    return out;
}
