'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';

// Componente React do nó de áudio
function AudioNodeView({ node, selected, getPos, editor }: ReactNodeViewProps) {
    const src = node.attrs.src as string;
    const title = node.attrs.title as string;

    const handleSelect = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'AUDIO') return;
        if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
                e.preventDefault();
                e.stopPropagation();
                editor.commands.setNodeSelection(pos);
            }
        }
    };

    return (
        <NodeViewWrapper className="my-4">
            <figure
                onClick={handleSelect}
                className={`transition-all duration-200 bg-slate-50 border-2 rounded-xl p-4 cursor-pointer relative ${
                    selected
                        ? 'border-tcm-red ring-4 ring-tcm-red/15 bg-red-50/5 shadow-sm shadow-tcm-red/5'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
                }`}
            >
                {title && (
                    <figcaption className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-tcm-red rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24">
                                <path d="M12 3a9 9 0 100 18A9 9 0 0012 3zm-1 13V8l6 4-6 4z" />
                            </svg>
                        </span>
                        <span className="truncate">{title}</span>
                    </figcaption>
                )}
                <audio
                    controls
                    src={src}
                    className="w-full h-10 rounded-lg"
                    preload="metadata"
                />
            </figure>
        </NodeViewWrapper>
    );
}

// Extensão Tiptap custom para áudio
const AudioExtension = Node.create({
    name: 'audio',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: { default: null },
            title: { default: '' },
        };
    },

    parseHTML() {
        return [{ tag: 'audio[src]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['audio', mergeAttributes({ controls: true }, HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AudioNodeView);
    },
});

export default AudioExtension;
