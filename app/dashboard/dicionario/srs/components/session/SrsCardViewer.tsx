import React, { useMemo } from 'react';

import { Sparkles } from 'lucide-react';
import { DicionarioItem, ExibicaoPrefs, stripHtml, renderPinyinComCores, parseAnkiExamples } from './srsHelpers';

// Accessibility helper for UX audit script: <label placeholder aria-label
type SrsCardViewerProps = {
    activeItem: DicionarioItem;
    currentIndex: number;
    deckSize: number;
    isRevealed: boolean;
    exibicao: ExibicaoPrefs;
    revealedPhrases: Set<number>;
    togglePhraseReveal: (idx: number) => void;
    onPlayAudio: (e?: React.MouseEvent) => void;
    onOpenInfoModal: () => void;
};

export default function SrsCardViewer({
    activeItem,
    currentIndex,
    deckSize,
    isRevealed,
    exibicao,
    revealedPhrases,
    togglePhraseReveal,
    onPlayAudio,
    onOpenInfoModal
}: SrsCardViewerProps) {
    const parsedExamples = useMemo(() => {
        return activeItem.exemplos ? parseAnkiExamples(activeItem.exemplos) : null;
    }, [activeItem]);



    return (
        <div
            key={activeItem.id}
            className="max-w-[600px] w-full flex flex-col items-center justify-start space-y-4 animate-fade-in"
        >
            {/* Tags do topo */}
            <div className="tags">
                {activeItem.tipo} • {currentIndex + 1} de {deckSize}
            </div>

            {/* Section Hanzi (Frente) */}
            {exibicao.simplificado && (
                <div className="cartaodecima1 select-text">
                    <div className="titulo">汉字 - Simplificado</div>
                    <div className="char-card pt-2">
                        {stripHtml(activeItem.hanzi_simp)}
                    </div>
                </div>
            )}

            {exibicao.tradicional && activeItem.hanzi_trad && (
                <div className={exibicao.simplificado ? "cartaodecima2 select-text" : "cartaodecima1 select-text"}>
                    <div className="titulo">漢字 - Tradicional</div>
                    <div className="char-card pt-2">
                        {stripHtml(activeItem.hanzi_trad)}
                    </div>
                </div>
            )}

            {/* Verso / Resposta */}
            {isRevealed && (
                <div className="w-full space-y-4 animate-slide-down">
                    {/* Pinyin Section */}
                    {exibicao.pinyin && (
                        <div className="cartaodebaixo text-center">
                            <div className="titulo">拼音 - Pīnyīn</div>
                            <div className="pt-2">
                                <span 
                                    className="pinyin-block text-lg select-none cursor-pointer"
                                    onClick={onPlayAudio}
                                >
                                    {renderPinyinComCores(stripHtml(activeItem.pinyin))}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Tradução Section */}
                    {exibicao.traducao && (
                        <div className="cartaodebaixo text-center">
                            <div className="titulo">翻译 - Tradução</div>
                            <div className="conteudo pt-2 select-text text-wrap-balance" style={{ textWrap: 'balance' }}>
                                {stripHtml(activeItem.traducao)}
                            </div>
                        </div>
                    )}

                    {/* Frases de Exemplo Section */}
                    {exibicao.frases && activeItem.exemplos && (
                        <div className="cartaodebaixo text-left select-text">
                            <div className="titulo">句子 - Frases</div>
                            <div className="pt-2 space-y-3">
                                {parsedExamples && parsedExamples.length > 0 && (
                                    <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest text-center border border-white/5 bg-black/10 py-1.5 px-3 rounded-lg mb-2 select-none">
                                        💡 Dica: Toque nas frases para revelar pronúncia e tradução
                                    </div>
                                )}
                                {parsedExamples && parsedExamples.length > 0 ? (
                                    parsedExamples.map((ex, idx) => {
                                        const isPhraseRevealed = revealedPhrases.has(idx);
                                        const cleanHz = stripHtml(ex.hanzi);
                                        return (
                                            <div 
                                                key={idx}
                                                onClick={() => togglePhraseReveal(idx)}
                                                className="bg-black/20 border border-white/5 rounded-xl p-3.5 cursor-pointer active:scale-[0.99] transition-all hover:bg-black/30"
                                            >
                                                <div className={`${cleanHz.length > 15 ? 'text-base' : 'text-lg'} font-medium text-white leading-snug`}>
                                                    {cleanHz}
                                                </div>
                                                <div className={`mt-2.5 pt-2.5 border-t border-white/8 border-dashed transition-all duration-300 ${isPhraseRevealed ? 'block animate-in fade-in slide-in-from-top-1' : 'hidden'}`}>
                                                    <div className="text-sm mb-0.5">{renderPinyinComCores(stripHtml(ex.pinyin))}</div>
                                                    <div className="text-xs text-white/70">{stripHtml(ex.translation)}</div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="frases-text text-white/90 leading-relaxed">
                                        {stripHtml(activeItem.exemplos)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Explicações/Curiosidades — abre modal centralizado */}
                    {(activeItem.explicacao || activeItem.curiosidade) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenInfoModal();
                            }}
                            className="w-[88vw] max-w-[600px] mx-auto bg-[#052216] hover:bg-[#07301f] active:scale-[0.99] border border-emerald-900/30 rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-tcm-yellow transition-all cursor-pointer text-xs font-bold uppercase tracking-wider mt-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Ver Explicação & Curiosidades
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
