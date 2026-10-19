// Accessibility helper for UX audit script: <label placeholder aria-label
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Brain, Clock, Sparkles, Loader2 } from 'lucide-react';

type SrsFinishedScreenProps = {
    countReviews: number;
    recallSeconds: number;
    studySeconds: number;
    isSyncing: boolean;
    error: string | null;
    onSaveSession: () => void;
};

export default function SrsFinishedScreen({
    countReviews,
    recallSeconds,
    studySeconds,
    isSyncing,
    error,
    onSaveSession
}: SrsFinishedScreenProps) {
    return (
        <motion.div
            key="finished-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="cartaodebaixo p-6 sm:p-10 text-center space-y-6 text-white w-[88vw] max-w-[600px] mx-auto"
        >
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg border border-white/20">
                <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Sessão Concluída! 🎉</h2>
                <p className="text-white/60 text-sm">
                    Excelente trabalho! Você revisou todas as cartas do seu deck ativo para hoje.
                </p>
            </div>

            {/* Resumo da Sessão */}
            <div className="grid grid-cols-2 gap-3 bg-black/25 border border-white/5 p-4 rounded-2xl text-left">
                <div className="flex gap-2.5 items-center">
                    <Brain className="w-4 h-4 text-tcm-red shrink-0" />
                    <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Cartas Feitas</span>
                        <span className="text-sm font-extrabold text-white">{countReviews}</span>
                    </div>
                </div>
                <div className="flex gap-2.5 items-center">
                    <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Tempo de Recall</span>
                        <span className="text-sm font-extrabold text-white">{Math.round(recallSeconds)}s</span>
                    </div>
                </div>
                <div className="col-span-2 flex gap-2.5 items-center border-t border-white/5 pt-2.5 mt-1">
                    <Sparkles className="w-4 h-4 text-tcm-yellow shrink-0" />
                    <div>
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Tempo de Absorção (Estudo)</span>
                        <span className="text-sm font-extrabold text-white">{Math.round(studySeconds)}s</span>
                    </div>
                </div>
            </div>

            {error && (
                <p className="text-red-400 text-xs font-semibold bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
                    {error}
                </p>
            )}

            <button
                onClick={onSaveSession}
                disabled={isSyncing}
                className="w-full bg-tcm-yellow hover:bg-tcm-yellow/90 text-tcm-darker-red font-bold py-4 rounded-2xl shadow-md transition-all active:scale-[0.99] disabled:opacity-75 cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
                {isSyncing ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando progresso...
                    </>
                ) : (
                    'Concluir e Salvar'
                )}
            </button>
        </motion.div>
    );
}
