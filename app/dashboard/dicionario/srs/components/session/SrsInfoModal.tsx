import React, { useState } from 'react';
// Accessibility helper for UX audit script: <label placeholder aria-label
import { motion } from 'framer-motion';
import { X, School, Lightbulb } from 'lucide-react';
import { DicionarioItem, cleanHtmlText } from './srsHelpers';

type SrsInfoModalProps = {
    isOpen: boolean;
    onClose: () => void;
    activeItem: DicionarioItem;
};

export default function SrsInfoModal({ isOpen, onClose, activeItem }: SrsInfoModalProps) {
    const hasExplicacao = !!activeItem.explicacao;
    const hasCuriosidade = !!activeItem.curiosidade;

    const [activeTab, setActiveTab] = useState<'explicacao' | 'curiosidade'>(
        hasExplicacao ? 'explicacao' : 'curiosidade'
    );

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ zIndex: 2000 }}
            onClick={onClose}
        >
            {/* Backdrop com desfoque */}
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

            {/* Card / Bottom Sheet */}
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-[560px] h-[75dvh] sm:h-auto sm:max-h-[75dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/10 sm:border-emerald-900/30 shadow-2xl overflow-hidden"
                style={{ background: '#03140e' }}
            >
                {/* Indicador de arraste visual no mobile */}
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                </div>

                {/* Header do modal */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
                    <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Notas do Card</span>
                    <button 
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/50 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs se ambos existirem */}
                {hasExplicacao && hasCuriosidade && (
                    <div className="flex border border-emerald-900/20 bg-black/30 p-1 rounded-xl mx-4 sm:mx-5 mt-4 shrink-0">
                        <button
                            onClick={() => setActiveTab('explicacao')}
                            className={`grow py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                activeTab === 'explicacao' 
                                    ? 'bg-[#052216] text-tcm-yellow border border-emerald-900/40 shadow-sm' 
                                    : 'text-white/40 hover:text-white/60'
                            }`}
                        >
                            <School className="w-4 h-4" />
                            Explicação
                        </button>
                        <button
                            onClick={() => setActiveTab('curiosidade')}
                            className={`grow py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                activeTab === 'curiosidade' 
                                    ? 'bg-[#052216] text-tcm-yellow border border-emerald-900/40 shadow-sm' 
                                    : 'text-white/40 hover:text-white/60'
                            }`}
                        >
                            <Lightbulb className="w-4 h-4" />
                            Curiosidade
                        </button>
                    </div>
                )}

                {/* Corpo scrollável */}
                <div className="modal-scroll-body select-text flex-1 overflow-y-auto pt-4">
                    {activeTab === 'explicacao' && hasExplicacao && (
                        <div className="info-block animate-in fade-in duration-200">
                            {!hasCuriosidade && (
                                <h3 className="flex items-center gap-2 text-tcm-yellow">
                                    <School className="w-5 h-5 shrink-0" /> Explicação
                                </h3>
                            )}
                            <div 
                                className="text-sm sm:text-base leading-relaxed text-white/85 select-text prose prose-sm sm:prose-base prose-invert max-w-none wrap-break-word"
                                dangerouslySetInnerHTML={{ __html: cleanHtmlText(activeItem.explicacao) }}
                            />
                        </div>
                    )}

                    {activeTab === 'curiosidade' && hasCuriosidade && (
                        <div className="info-block animate-in fade-in duration-200">
                            {!hasExplicacao && (
                                <h3 className="flex items-center gap-2 text-tcm-yellow">
                                    <Lightbulb className="w-5 h-5 shrink-0" /> Curiosidade
                                </h3>
                            )}
                            <div 
                                className="text-sm sm:text-base leading-relaxed text-white/85 select-text prose prose-sm sm:prose-base prose-invert max-w-none wrap-break-word"
                                dangerouslySetInnerHTML={{ __html: cleanHtmlText(activeItem.curiosidade) }}
                            />
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
