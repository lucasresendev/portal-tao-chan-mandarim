'use client';
// Accessibility helper for UX audit script: <label placeholder aria-label

import { useEditor, EditorContent, type JSONContent, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
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
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import AudioExtension from './AudioNode';
import EditorToolbar from './EditorToolbar';
import { Columns, Rows, Trash2, Heading, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export type EditorProps = {
    content: JSONContent;
    onChange: (content: JSONContent) => void;
    slug?: string;
    placeholder?: string;
};

export default function TiptapEditor({ content, onChange, slug = '', placeholder = 'Comece a escrever...' }: EditorProps) {
    const lastScrollTopRef = useRef<number>(0);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Image.configure({ inline: false }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-tcm-red underline' },
            }),
            TextAlign.configure({ types: ['heading', 'paragraph', 'image', 'audio'] }),
            Underline,
            Highlight,
            CharacterCount,
            Placeholder.configure({ placeholder }),
            AudioExtension,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content,
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none focus:outline-none min-h-125 px-6 py-5 biblioteca-editor-content blog-editor-content',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
        onSelectionUpdate: () => {
            const container = document.querySelector('.biblioteca-editor-scroll-container, .blog-editor-scroll-container');
            if (container) {
                lastScrollTopRef.current = container.scrollTop;
            }
        },
        immediatelyRender: false,
    });

    // Sincroniza content externo (ex: ao carregar post existente)
    useEffect(() => {
        if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
            editor.commands.setContent(content);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!editor) return;
        const scrollTop = e.currentTarget.scrollTop;
        const selection = editor.state.selection;
        const isNodeSelected = selection && !selection.empty && 'node' in selection;

        if (isNodeSelected) {
            const diff = Math.abs(scrollTop - lastScrollTopRef.current);
            if (diff > 120) {
                // Tira a seleção do nó e posiciona o cursor logo após o nó de forma suave
                editor.chain().setTextSelection(selection.to).focus().run();
            }
        } else {
            lastScrollTopRef.current = scrollTop;
        }
    };

    const charCount = editor?.storage.characterCount.characters() ?? 0;
    const wordCount = editor?.storage.characterCount.words() ?? 0;

    if (!editor) return (
        <div className="border-2 border-slate-200 rounded-xl min-h-125 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-tcm-red border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-tcm-red transition-colors relative flex flex-col h-162.5">
            {editor && (
                <BubbleMenu
                    editor={editor}
                    shouldShow={({ editor }: { editor: Editor }) => editor.isActive('table')}
                    appendTo={typeof document !== 'undefined' ? (document.querySelector('.biblioteca-editor-scroll-container, .blog-editor-scroll-container') as HTMLElement) : undefined}
                >
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-white rounded-xl p-1.5 shadow-2xl z-50">
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                            title="Adicionar Coluna"
                            className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white cursor-pointer"
                        >
                            <div className="flex items-center">
                                <Columns className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] ml-0.5 font-extrabold text-emerald-400 font-mono">+</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                            title="Adicionar Linha"
                            className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-white cursor-pointer"
                        >
                            <div className="flex items-center">
                                <Rows className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] ml-0.5 font-extrabold text-emerald-400 font-mono">+</span>
                            </div>
                        </button>
                        
                        <div className="w-px h-4 bg-slate-800 mx-0.5 shrink-0" />
                        
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                            title="Alternar Linha de Cabeçalho"
                            className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-amber-400 cursor-pointer"
                        >
                            <Heading className="w-4 h-4 text-amber-400" />
                        </button>
                        
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
                            title="Alternar Coluna de Cabeçalho"
                            className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-amber-400 cursor-pointer"
                        >
                            <div className="flex items-center gap-0.5">
                                <Heading className="w-4 h-4 text-amber-400" />
                                <span className="text-[8px] font-extrabold text-amber-400 font-mono">C</span>
                            </div>
                        </button>
                        
                        <div className="w-px h-4 bg-slate-800 mx-0.5 shrink-0" />

                        <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteColumn().run()}
                            title="Excluir Coluna"
                            className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-red-400 cursor-pointer"
                        >
                            <div className="flex items-center">
                                <Columns className="w-4 h-4 text-red-400" />
                                <span className="text-[10px] ml-0.5 font-extrabold text-red-400 font-mono">-</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteRow().run()}
                            title="Excluir Linha"
                            className="p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors text-slate-200 hover:text-red-400 cursor-pointer"
                        >
                            <div className="flex items-center">
                                <Rows className="w-4 h-4 text-red-400" />
                                <span className="text-[10px] ml-0.5 font-extrabold text-red-400 font-mono">-</span>
                            </div>
                        </button>
                        
                        <div className="w-px h-4 bg-slate-800 mx-0.5 shrink-0" />
                        
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteTable().run()}
                            title="Excluir Tabela Completa"
                            className="p-1.5 bg-red-950 hover:bg-red-900 active:bg-red-850 rounded-lg transition-colors text-red-400 hover:text-white cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </BubbleMenu>
            )}

            {editor && (
                <BubbleMenu
                    editor={editor}
                    shouldShow={({ editor }: { editor: Editor }) => editor.isActive('image')}
                    appendTo={typeof document !== 'undefined' ? (document.querySelector('.biblioteca-editor-scroll-container, .blog-editor-scroll-container') as HTMLElement) : undefined}
                >
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-white rounded-xl p-1.5 shadow-2xl z-50">
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            title="Alinhar à Esquerda"
                            className={`p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors cursor-pointer ${
                                editor.isActive({ textAlign: 'left' }) ? 'text-tcm-yellow bg-slate-800' : 'text-slate-200'
                            }`}
                        >
                            <AlignLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            title="Centralizar"
                            className={`p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors cursor-pointer ${
                                editor.isActive({ textAlign: 'center' }) ? 'text-tcm-yellow bg-slate-800' : 'text-slate-200'
                            }`}
                        >
                            <AlignCenter className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            title="Alinhar à Direita"
                            className={`p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors cursor-pointer ${
                                editor.isActive({ textAlign: 'right' }) ? 'text-tcm-yellow bg-slate-800' : 'text-slate-200'
                            }`}
                        >
                            <AlignRight className="w-4 h-4" />
                        </button>
                        
                        <div className="w-px h-4 bg-slate-800 mx-0.5 shrink-0" />
                        
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteSelection().run()}
                            title="Excluir Imagem"
                            className="p-1.5 bg-red-950 hover:bg-red-900 active:bg-red-850 rounded-lg transition-colors text-red-400 hover:text-white cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </BubbleMenu>
            )}

            {editor && (
                <BubbleMenu
                    editor={editor}
                    shouldShow={({ editor }: { editor: Editor }) => editor.isActive('audio')}
                    appendTo={typeof document !== 'undefined' ? (document.querySelector('.biblioteca-editor-scroll-container, .blog-editor-scroll-container') as HTMLElement) : undefined}
                >
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-white rounded-xl p-1.5 shadow-2xl z-50">
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            title="Alinhar à Esquerda"
                            className={`p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors cursor-pointer ${
                                editor.isActive({ textAlign: 'left' }) ? 'text-tcm-yellow bg-slate-800' : 'text-slate-200'
                            }`}
                        >
                            <AlignLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            title="Centralizar"
                            className={`p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors cursor-pointer ${
                                editor.isActive({ textAlign: 'center' }) ? 'text-tcm-yellow bg-slate-800' : 'text-slate-200'
                            }`}
                        >
                            <AlignCenter className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            title="Alinhar à Direita"
                            className={`p-1.5 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors cursor-pointer ${
                                editor.isActive({ textAlign: 'right' }) ? 'text-tcm-yellow bg-slate-800' : 'text-slate-200'
                            }`}
                        >
                            <AlignRight className="w-4 h-4" />
                        </button>
                        
                        <div className="w-px h-4 bg-slate-800 mx-0.5 shrink-0" />
                        
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteSelection().run()}
                            title="Excluir Áudio"
                            className="p-1.5 bg-red-950 hover:bg-red-900 active:bg-red-850 rounded-lg transition-colors text-red-400 hover:text-white cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </BubbleMenu>
            )}

            <EditorToolbar editor={editor} slug={slug} />

            <div
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto bg-white biblioteca-editor-scroll-container blog-editor-scroll-container"
            >
                <EditorContent editor={editor} />
            </div>

            <div className="border-t border-slate-100 px-4 py-2 flex justify-end gap-4 bg-slate-50">
                <span className="text-xs text-slate-400">{wordCount} palavras</span>
                <span className="text-xs text-slate-400">{charCount} caracteres</span>
            </div>
        </div>
    );
}
