import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rating } from 'ts-fsrs';

type SrsFooterButtonsProps = {
    isRevealed: boolean;
    isFinished: boolean;
    onRate: (rating: number) => void;
    nextIntervals: Record<number, string> | null;
    onReveal?: () => void;
};

export default function SrsFooterButtons({
    isRevealed,
    isFinished,
    onRate,
    nextIntervals,
    onReveal
}: SrsFooterButtonsProps) {
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
        }
    }, []);

    return (
        <footer className="bg-[#020e0a]/95 border-t border-emerald-900/30 px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] shrink-0 shadow-2xl sticky bottom-0" style={{ zIndex: 150 }}>
            <div className="max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {isRevealed && !isFinished ? (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 15 }}
                            className="grid grid-cols-4 gap-2"
                        >
                             <button
                                onClick={() => onRate(Rating.Again)}
                                className="bg-red-950/40 hover:bg-red-900/30 text-red-200 border border-red-500/30 font-bold py-2 px-1 rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center min-h-[64px]"
                            >
                                {nextIntervals && (
                                    <span className="text-[10px] font-medium text-red-400 mb-0.5">
                                        {nextIntervals[Rating.Again]}
                                    </span>
                                )}
                                <span className="text-sm">Errei</span>
                                <span className="text-[9px] font-bold uppercase opacity-60">(1)</span>
                            </button>
                            <button
                                onClick={() => onRate(Rating.Hard)}
                                className="bg-amber-950/40 hover:bg-amber-900/30 text-amber-200 border border-amber-500/30 font-bold py-2 px-1 rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center min-h-[64px]"
                            >
                                {nextIntervals && (
                                    <span className="text-[10px] font-medium text-amber-400 mb-0.5">
                                        {nextIntervals[Rating.Hard]}
                                    </span>
                                )}
                                <span className="text-sm">Difícil</span>
                                <span className="text-[9px] font-bold uppercase opacity-60">(2)</span>
                            </button>
                            <button
                                onClick={() => onRate(Rating.Good)}
                                className="bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-200 border border-emerald-500/30 font-bold py-2 px-1 rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center min-h-[64px]"
                            >
                                {nextIntervals && (
                                    <span className="text-[10px] font-medium text-emerald-400 mb-0.5">
                                        {nextIntervals[Rating.Good]}
                                    </span>
                                )}
                                <span className="text-sm">Bom</span>
                                <span className="text-[9px] font-bold uppercase opacity-60">(3)</span>
                            </button>
                            <button
                                onClick={() => onRate(Rating.Easy)}
                                className="bg-blue-950/40 hover:bg-blue-900/30 text-blue-200 border border-blue-500/30 font-bold py-2 px-1 rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center min-h-[64px]"
                            >
                                {nextIntervals && (
                                    <span className="text-[10px] font-medium text-blue-400 mb-0.5">
                                        {nextIntervals[Rating.Easy]}
                                    </span>
                                )}
                                <span className="text-sm">Fácil</span>
                                <span className="text-[9px] font-bold uppercase opacity-60">(4)</span>
                            </button>
                        </motion.div>
                    ) : (
                        <div 
                            onClick={() => {
                                if (!isFinished && onReveal) {
                                    onReveal();
                                }
                            }}
                            className={`text-center text-xs font-semibold uppercase tracking-wider py-4 px-4 text-wrap-balance ${!isFinished ? 'text-white/40 hover:text-white/60 cursor-pointer transition-colors active:scale-98' : 'text-white/45'}`}
                            style={{ textWrap: 'balance' }}
                        >
                            {!isFinished 
                                ? (isMobile ? 'Toque para revelar' : 'Pressione ESPAÇO ou clique para revelar') 
                                : 'Sessão Concluída'}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </footer>
    );
}
