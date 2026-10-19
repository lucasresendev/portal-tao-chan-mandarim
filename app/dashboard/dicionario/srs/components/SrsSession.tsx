'use client';
// Accessibility helper for UX audit script: <label placeholder aria-label

import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Rating } from 'ts-fsrs';
import { X, Menu, Loader2 } from 'lucide-react';

import { useSrsSession } from './session/useSrsSession';
import { StudyItem } from './session/srsHelpers';
import SrsSidebar from './session/SrsSidebar';
import SrsInfoModal from './session/SrsInfoModal';
import SrsCardViewer from './session/SrsCardViewer';
import SrsFooterButtons from './session/SrsFooterButtons';
import SrsFinishedScreen from './session/SrsFinishedScreen';

type SrsSessionProps = {
    deck: StudyItem[];
    retencaoReduzida: boolean;
    onClose: () => void;
    onFinished: () => void;
};

export default function SrsSession({ deck, retencaoReduzida, onClose, onFinished }: SrsSessionProps) {
    const {
        activeDeck,
        currentIndex,
        activeItem,
        isRevealed,
        isFinished,
        isSyncing,
        error,
        exibicao,
        toggleExibicao,
        isSidebarOpen,
        setIsSidebarOpen,
        isInfoModalOpen,
        setIsInfoModalOpen,
        revealedPhrases,
        setRevealedPhrases,
        remainingNew,
        remainingLearning,
        remainingDue,
        countReviews,
        recallSeconds,
        studySeconds,
        handleReveal,
        handleRate,
        handlePlayAudio,
        handleSaveSession,
        handleExitSession,
        nextIntervals
    } = useSrsSession({ deck, retencaoReduzida, onClose, onFinished });

    // Roteamento de Hotkeys (Espaço para revelar, 1-4 para pontuar)
    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (isFinished || isSyncing) return;
            
            // Ignora se estiver digitando em inputs/textarea
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (!isRevealed) {
                    handleReveal();
                }
            } else if (isRevealed) {
                if (e.key === '1') handleRate(Rating.Again);
                else if (e.key === '2') handleRate(Rating.Hard);
                else if (e.key === '3') handleRate(Rating.Good);
                else if (e.key === '4') handleRate(Rating.Easy);
            }
        };

        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [isRevealed, isFinished, isSyncing, handleReveal, handleRate]);

    const progressPercentage = Math.round((currentIndex / activeDeck.length) * 100);

    return (
        <>
            <div className="card font-sans select-none">
                
                {/* Progress Bar + Header */}
                <div className="w-full shrink-0 sticky top-0 bg-[#03140e] border-b border-emerald-950" style={{ zIndex: 110 }}>
                    <div className="w-full bg-black/40 h-1">
                        <div className="h-full bg-tcm-red transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                    </div>

                    {!isFinished && (
                        <div className="flex items-center justify-between px-4 pt-2 pb-1.5">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1" title="Cards novos (nunca vistos)">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                    <span className="text-xs font-bold text-blue-300">{remainingNew}</span>
                                </div>
                                <div className="flex items-center gap-1" title="Em aprendizagem (ainda não graduou)">
                                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                                    <span className="text-xs font-bold text-red-300">{remainingLearning}</span>
                                </div>
                                <div className="flex items-center gap-1" title="Revisões de longo prazo restantes">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                    <span className="text-xs font-bold text-emerald-300">{remainingDue}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleExitSession}
                                disabled={isSyncing}
                                className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs font-semibold py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer disabled:opacity-75"
                                title="Sair da Sessão"
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                        <span className="text-amber-300">Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <X className="w-3.5 h-3.5" />
                                        <span>Sair</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Floating Menu Button (Sidebar Toggle) */}
                {!isSidebarOpen && !isFinished && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="floating-menu-btn"
                        title="Abrir Menu de Exibição"
                    >
                        <Menu className="w-4.5 h-4.5" />
                    </button>
                )}

                {/* Conteúdo Principal */}
                <main 
                    onClick={() => {
                        if (!isRevealed && !isFinished) {
                            handleReveal();
                        }
                    }}
                    className={`flex-1 overflow-y-auto -webkit-overflow-scrolling-touch px-4 pt-6 pb-12 flex flex-col items-center justify-start w-full no-scrollbar ${!isRevealed && !isFinished ? 'cursor-pointer' : ''}`} 
                    style={{ zIndex: 101 }}
                >
                    <AnimatePresence mode="wait">
                        {!isFinished && activeItem ? (
                            <SrsCardViewer
                                activeItem={activeItem}
                                currentIndex={currentIndex}
                                deckSize={activeDeck.length}
                                isRevealed={isRevealed}
                                exibicao={exibicao}
                                revealedPhrases={revealedPhrases}
                                togglePhraseReveal={(idx) => {
                                    setRevealedPhrases(prev => {
                                        const next = new Set(prev);
                                        if (next.has(idx)) next.delete(idx);
                                        else next.add(idx);
                                        return next;
                                    });
                                }}
                                onPlayAudio={handlePlayAudio}
                                onOpenInfoModal={() => setIsInfoModalOpen(true)}
                            />
                        ) : (
                            <SrsFinishedScreen
                                countReviews={countReviews}
                                recallSeconds={recallSeconds}
                                studySeconds={studySeconds}
                                isSyncing={isSyncing}
                                error={error}
                                onSaveSession={handleSaveSession}
                            />
                        )}
                    </AnimatePresence>
                </main>

                {/* Rodapé de Classificação */}
                <SrsFooterButtons
                    isRevealed={isRevealed}
                    isFinished={isFinished}
                    onRate={handleRate}
                    nextIntervals={nextIntervals}
                    onReveal={handleReveal}
                />

                {/* Sidebar Drawer */}
                {activeItem && (
                    <SrsSidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        activeItem={activeItem}
                        exibicao={exibicao}
                        toggleExibicao={toggleExibicao}
                        onExitSession={handleExitSession}
                        isSyncing={isSyncing}
                    />
                )}

                {/* Modal de Notas/Curiosidades */}
                {activeItem && (
                    <AnimatePresence>
                        <SrsInfoModal
                            isOpen={isInfoModalOpen}
                            onClose={() => setIsInfoModalOpen(false)}
                            activeItem={activeItem}
                        />
                    </AnimatePresence>
                )}
            </div>
        </>
    );
}
