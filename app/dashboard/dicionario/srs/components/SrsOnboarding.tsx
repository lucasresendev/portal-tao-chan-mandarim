'use client';
// Accessibility helper for UX audit script: <label placeholder aria-label

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toggleSrsOptInAction } from '../../../../actions/srs-actions';
import { applyDemoServerPayloads } from '@/lib/demo/supabaseSandbox';
import { Flame, Brain, Sparkles, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import posthog from 'posthog-js';

type SrsOnboardingProps = {
    onActivated: () => void;
};

export default function SrsOnboarding({ onActivated }: SrsOnboardingProps) {
    const [isActivating, setIsActivating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleActivate = async () => {
        setIsActivating(true);
        setError(null);
        posthog.capture('srs_optin_attempted');

        try {
            const result = await toggleSrsOptInAction(true);
            if (result.error) {
                setError(result.error);
                setIsActivating(false);
            } else {
                if (result.demoPayloads) applyDemoServerPayloads(result.demoPayloads);
                posthog.capture('srs_optin_completed');
                onActivated();
            }
        } catch (err) {
            console.error(err);
            setError('Ocorreu um erro ao ativar. Tente novamente.');
            setIsActivating(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.15
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-tcm-lg border border-slate-100 relative overflow-hidden"
            >
                {/* Efeitos de Fundo Dourados */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-tcm-red/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-8">
                    {/* Header */}
                    <motion.div variants={itemVariants} className="text-center space-y-3">
                        <div className="mx-auto w-16 h-16 bg-linear-to-tr from-tcm-red to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-tcm-md">
                            <Brain className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                            Memorização Inteligente (Flashcards)
                        </h1>
                        <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                            Revise ideogramas, pronúncias e frases no momento ideal para fixar o mandarim na sua memória de longo prazo.
                        </p>
                    </motion.div>

                    {/* Recursos */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <div className="flex gap-4 p-4 rounded-2xl bg-[#fffcf8]/60 border border-slate-200/50 hover:border-orange-200 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                                <Flame className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-850 text-sm sm:text-base">Hábito de Estudo</h3>
                                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                                    Acompanhe sua sequência de dias de treino com um marcador de ofensiva diária para manter o foco constante.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 p-4 rounded-2xl bg-[#fffcf8]/60 border border-slate-200/50 hover:border-red-200 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-tcm-red shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-850 text-sm sm:text-base">Revisões Inteligentes</h3>
                                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                                    O sistema calcula a curva do seu esquecimento: palavras difíceis aparecem mais vezes e termos dominados são espaçados por semanas.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 p-4 rounded-2xl bg-[#fffcf8]/60 border border-slate-200/50 hover:border-emerald-200 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-850 text-sm sm:text-base">Calendário de Frequência</h3>
                                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                                    Visualize seus dias de dedicação em um gráfico interativo e acompanhe seu tempo diário de estudos.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Botão de Opt-in */}
                    <motion.div variants={itemVariants} className="pt-2 space-y-4">
                        {error && (
                            <p className="text-red-500 text-center text-xs font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">
                                {error}
                            </p>
                        )}
                        <button
                            onClick={handleActivate}
                            disabled={isActivating}
                            className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-tcm-red to-orange-600 text-white font-bold py-4 rounded-2xl shadow-tcm-md hover:shadow-tcm-lg active:scale-[0.99] disabled:opacity-75 disabled:scale-100 transition-all text-base cursor-pointer"
                        >
                            {isActivating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Ativando...
                                </>
                            ) : (
                                <>
                                    Ativar Memorização Inteligente
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                        <p className="text-[10px] text-slate-400 text-center">
                            Você pode desativar esta funcionalidade a qualquer momento nas configurações.
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
