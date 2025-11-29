
import React, { useRef, useEffect } from 'react';

interface SimpleEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const SimpleEditor: React.FC<SimpleEditorProps> = ({ value, onChange, placeholder }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isInternalChange = useRef(false);

    // Execute command (Bold, Italic, etc.)
    const exec = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            editorRef.current.focus();
            triggerChange();
        }
    };

    const triggerChange = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            isInternalChange.current = true;
            onChange(html);
            // Reset flag after a short delay to allow React cycle to complete if needed, 
            // though synchronous reset is usually safer for this logic.
            setTimeout(() => { isInternalChange.current = false; }, 0); 
        }
    };

    // Sync external value changes to the editor (e.g. initial load or reset)
    useEffect(() => {
        if (editorRef.current) {
            const currentContent = editorRef.current.innerHTML;
            if (value !== currentContent && !isInternalChange.current) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const ToolbarButton: React.FC<{ icon: string; cmd: string; arg?: string; title: string }> = ({ icon, cmd, arg, title }) => (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent loss of focus from editor
                exec(cmd, arg);
            }}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title={title}
        >
            <i className={`bi ${icon}`}></i>
        </button>
    );

    return (
        <div className="border border-gray-300 rounded-lg overflow-hidden bg-white flex flex-col h-full">
            {/* Toolbar */}
            <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center">
                <ToolbarButton icon="bi-type-bold" cmd="bold" title="Bold" />
                <ToolbarButton icon="bi-type-italic" cmd="italic" title="Italic" />
                <ToolbarButton icon="bi-type-underline" cmd="underline" title="Underline" />
                <div className="w-px h-5 bg-gray-300 mx-1"></div>
                <ToolbarButton icon="bi-list-ul" cmd="insertUnorderedList" title="Bullet List" />
                <ToolbarButton icon="bi-list-ol" cmd="insertOrderedList" title="Numbered List" />
                <div className="w-px h-5 bg-gray-300 mx-1"></div>
                <ToolbarButton icon="bi-text-left" cmd="justifyLeft" title="Align Left" />
                <ToolbarButton icon="bi-text-center" cmd="justifyCenter" title="Align Center" />
                <ToolbarButton icon="bi-text-right" cmd="justifyRight" title="Align Right" />
                <ToolbarButton icon="bi-justify" cmd="justifyFull" title="Justify" />
                <div className="w-px h-5 bg-gray-300 mx-1"></div>
                <button
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        exec('removeFormat');
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Clear Formatting"
                >
                    <i className="bi bi-eraser-fill"></i>
                </button>
            </div>

            {/* Editable Area */}
            <div
                ref={editorRef}
                contentEditable
                className="flex-grow p-4 focus:outline-none overflow-auto font-sans text-black editor-content"
                style={{ 
                    minHeight: '200px', 
                    fontSize: '12pt',
                    lineHeight: '1.5'
                }}
                onInput={triggerChange}
                onBlur={triggerChange}
                data-placeholder={placeholder}
            />
            
            <style>{`
                .editor-content:empty:before {
                    content: attr(data-placeholder);
                    color: #9ca3af;
                    pointer-events: none;
                    display: block; /* For Firefox */
                }
                .editor-content ul { list-style-type: disc; padding-left: 1.5em; }
                .editor-content ol { list-style-type: decimal; padding-left: 1.5em; }
                .editor-content b, .editor-content strong { font-weight: bold; }
                .editor-content i, .editor-content em { font-style: italic; }
                .editor-content u { text-decoration: underline; }
            `}</style>
        </div>
    );
};