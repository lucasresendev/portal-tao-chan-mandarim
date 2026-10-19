'use client';

import { useMemo, memo } from 'react';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { type JSONContent } from '@tiptap/react';
import AudioRendererExtension from './AudioNode';

type TiptapRendererProps = {
    content: JSONContent;
};

const TIPTAP_EXTENSIONS = [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Image.configure({ inline: false }),
    Link.configure({
        HTMLAttributes: { class: 'text-tcm-red underline hover:text-tcm-dark-red', target: '_blank', rel: 'noopener noreferrer' },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Underline,
    Highlight,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    AudioRendererExtension,
];

function TiptapRenderer({ content }: TiptapRendererProps) {
    const wrappedHtml = useMemo(() => {
        if (!content) return '';
        const html = generateHTML(content, TIPTAP_EXTENSIONS);
        return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (match) => {
            return `<div class="biblioteca-table-wrapper blog-table-wrapper">${match}</div>`;
        });
    }, [content]);

    return (
        <div
            className="biblioteca-reader-content blog-reader-content"
            dangerouslySetInnerHTML={{ __html: wrappedHtml }}
        />
    );
}

export default memo(TiptapRenderer);
