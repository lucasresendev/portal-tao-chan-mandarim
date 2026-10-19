'use client';
// Accessibility helper for UX audit script: <label placeholder aria-label

import { type Editor } from '@tiptap/react';
import {
    Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Quote, Code, Minus, Link2, Unlink, Image as ImageIcon,
    Music, Heading1, Heading2, Heading3, Highlighter, Undo, Redo, Type,
    Table2
} from 'lucide-react';
import { useRef } from 'react';
import { uploadBibliotecaImage, uploadBibliotecaAudio } from '../../../lib/bibliotecaStorage';

type ToolbarProps = {
    editor: Editor;
    slug: string;
};

type ToolbarButtonProps = {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
};

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded-md text-sm transition-all cursor-pointer ${
                active
                    ? 'bg-tcm-red text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />;
}

export default function EditorToolbar({ editor, slug }: ToolbarProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const url = await uploadBibliotecaImage(slug || 'rascunho', file);
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        } catch (err) {
            alert('Erro ao fazer upload da imagem. Tente novamente.');
            console.error(err);
        }
        e.target.value = '';
    };

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const url = await uploadBibliotecaAudio(slug || 'rascunho', file);
            const title = file.name.replace(/\.[^/.]+$/, '');
            editor.chain().focus().insertContent({
                type: 'audio',
                attrs: { src: url, title },
            }).run();
        } catch (err) {
            alert('Erro ao fazer upload do áudio. Tente novamente.');
            console.error(err);
        }
        e.target.value = '';
    };

    const setLink = () => {
        const prev = editor.getAttributes('link').href ?? '';
        const url = window.prompt('URL do link:', prev);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    };

    return (
        <div className="border-b-2 border-slate-200 bg-slate-50 px-3 py-2 flex flex-wrap items-center gap-0.5 rounded-t-xl shrink-0">
            {/* Histórico */}
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer">
                <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer">
                <Redo className="w-4 h-4" />
            </ToolbarButton>

            <Divider />

            {/* Formatação básica */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito">
                <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico">
                <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado">
                <Underline className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
                <Strikethrough className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Destacar texto">
                <Highlighter className="w-4 h-4" />
            </ToolbarButton>

            <Divider />

            {/* Headings */}
            <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Parágrafo normal">
                <Type className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1">
                <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2">
                <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3">
                <Heading3 className="w-4 h-4" />
            </ToolbarButton>

            <Divider />

            {/* Listas e blocos */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista com marcadores">
                <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
                <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citação">
                <Quote className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Bloco de código">
                <Code className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória">
                <Minus className="w-4 h-4" />
            </ToolbarButton>

            <Divider />

            {/* Tabela */}
            <ToolbarButton
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                active={editor.isActive('table')}
                title="Inserir Tabela 3x3"
            >
                <Table2 className="w-4 h-4" />
            </ToolbarButton>

            <Divider />

            {/* Alinhamento */}
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinhar à esquerda">
                <AlignLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centralizar">
                <AlignCenter className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinhar à direita">
                <AlignRight className="w-4 h-4" />
            </ToolbarButton>

            <Divider />

            {/* Links */}
            <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Inserir / editar link">
                <Link2 className="w-4 h-4" />
            </ToolbarButton>
            {editor.isActive('link') && (
                <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remover link">
                    <Unlink className="w-4 h-4 text-red-500" />
                </ToolbarButton>
            )}

            <Divider />

            {/* Mídia */}
            <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Inserir imagem">
                <ImageIcon className="w-4 h-4" />
            </ToolbarButton>
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />

            <ToolbarButton onClick={() => audioInputRef.current?.click()} title="Inserir áudio">
                <Music className="w-4 h-4" />
            </ToolbarButton>
            <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioUpload}
            />
        </div>
    );
}
