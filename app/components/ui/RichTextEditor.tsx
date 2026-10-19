'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Unlink } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escreva aqui...',
  className = '',
  editorClassName = '',
}: RichTextEditorProps) {
  // Evita re-triggering de atualizações circulares
  const isUpdatingRef = useRef(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Desativa headings para manter o input de questão limpo
        codeBlock: false,
        blockquote: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 underline hover:text-indigo-800 transition-colors cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `outline-none text-sm leading-relaxed text-slate-800 ${editorClassName}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Se o editor estiver vazio (ex: <p></p>), envia string vazia
      const isEmpty = editor.isEmpty || html === '<p></p>';
      const finalHtml = isEmpty ? '' : html;

      isUpdatingRef.current = true;
      onChangeRef.current(finalHtml);
      // Pequeno timeout para garantir que o ciclo de renderização do React terminou
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 10);
    },
    immediatelyRender: false,
  });

  // Sincroniza valor externo de forma segura
  useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.getHTML();
    const normalizedValue = value || '';
    const normalizedCurrent = currentHtml === '<p></p>' && !normalizedValue ? '' : currentHtml;

    if (!isUpdatingRef.current && normalizedCurrent !== normalizedValue) {
      editor.commands.setContent(normalizedValue);
    }
  }, [editor, value]);

  const handleLink = () => {
    if (!editor) return;

    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Digite a URL do link:', previousUrl);

    if (url === null) return; // Cancelado

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!editor) {
    return (
      <div className={`w-full rounded-xl border border-slate-200 bg-white p-3 min-h-[80px] flex items-center justify-center ${className}`}>
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-xl border border-slate-300 overflow-visible bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all ${className}`}
    >
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md text-white p-1 rounded-xl shadow-2xl border border-slate-800/80 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('bold') ? 'text-indigo-400 bg-slate-800' : 'text-slate-200'
            }`}
            title="Negrito"
          >
            <Bold className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('italic') ? 'text-indigo-400 bg-slate-800' : 'text-slate-200'
            }`}
            title="Itálico"
          >
            <Italic className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('underline') ? 'text-indigo-400 bg-slate-800' : 'text-slate-200'
            }`}
            title="Sublinhado"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          
          <div className="w-px h-4 bg-slate-800 mx-0.5" />
          
          <button
            type="button"
            onClick={handleLink}
            className={`p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${
              editor.isActive('link') ? 'text-indigo-400 bg-slate-800' : 'text-slate-200'
            }`}
            title={editor.isActive('link') ? 'Remover Link' : 'Inserir Link'}
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          {editor.isActive('link') && (
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-red-400"
              title="Remover Link"
            >
              <Unlink className="w-4 h-4" />
            </button>
          )}
        </BubbleMenu>
      )}

      <div className="p-3 min-h-[80px]">
        <EditorContent editor={editor} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .tiptap p.is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap p {
          margin-bottom: 0.75rem;
        }
        .tiptap p:last-child {
          margin-bottom: 0;
        }
        .tiptap a {
          color: #4f46e5;
          text-decoration: underline;
          cursor: pointer;
        }
        .tiptap strong {
          font-weight: bold;
        }
        .tiptap em {
          font-style: italic;
        }
        .tiptap u {
          text-decoration: underline;
        }
      `}} />
    </div>
  );
}
