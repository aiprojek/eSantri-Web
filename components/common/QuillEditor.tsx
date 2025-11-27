import React, { useEffect, useRef } from 'react';

interface QuillEditorProps {
    value: string;
    onChange: (value: string) => void;
}

// Declare Quill on window since it's loaded via script tag
declare global {
    interface Window {
        Quill: any;
    }
}

export const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const quillInstance = useRef<any>(null);
    const isInternalChange = useRef(false);

    useEffect(() => {
        if (editorRef.current && !quillInstance.current && window.Quill) {
            quillInstance.current = new window.Quill(editorRef.current, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['clean']
                    ]
                }
            });

            quillInstance.current.on('text-change', () => {
                const html = quillInstance.current.root.innerHTML;
                if (html === '<p><br></p>') {
                     isInternalChange.current = true;
                     onChange('');
                     isInternalChange.current = false;
                } else {
                    isInternalChange.current = true;
                    onChange(html);
                    isInternalChange.current = false;
                }
            });
        }
    }, []);

    useEffect(() => {
        if (quillInstance.current && !isInternalChange.current) {
            const currentContent = quillInstance.current.root.innerHTML;
            if (value !== currentContent && value !== undefined) {
                // Preserve selection if possible, though tough with external updates
                const range = quillInstance.current.getSelection();
                quillInstance.current.root.innerHTML = value;
                if (range) {
                     // Try to restore selection, might be imprecise if content length changed significantly
                     quillInstance.current.setSelection(range.index);
                }
            }
        }
    }, [value]);

    return <div ref={editorRef} />;
};