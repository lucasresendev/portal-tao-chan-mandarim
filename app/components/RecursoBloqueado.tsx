'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SetNavbar from './SetNavbar';

type RecursoBloqueadoProps = {
    titulo: string;
    recursoNome: string;
    aulasNecessarias?: number;
    aulasAssistidas?: number;
};

export default function RecursoBloqueado({ 
    titulo, 
    recursoNome, 
    aulasNecessarias = 3, 
    aulasAssistidas = 0 
}: RecursoBloqueadoProps) {
    const router = useRouter();

    return (
        <div className="min-h-screen pb-20 font-sans pt-16 bg-[#fffcf8] flex flex-col items-center justify-center px-4">
            <SetNavbar title={recursoNome} backLink="/dashboard" />
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="max-w-md w-full bg-white border border-amber-200 rounded-tcm-xl p-8 shadow-tcm-lg text-center relative overflow-hidden"
            >
                {/* Detalhe decorativo de fundo */}
                <div className="absolute top-0 left-0 w-full h-2 bg-tcm-red" />
                
                {/* Ícone de Cadeado Animado */}
                <div className="flex justify-center mb-6">
                    <motion.div
                        animate={{ 
                            y: [0, -8, 0],
                            rotate: [0, -3, 3, 0]
                        }}
                        transition={{ 
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="bg-red-50 text-tcm-red p-4 rounded-full border-2 border-red-100 flex items-center justify-center shadow-inner"
                    >
                        <Lock className="w-10 h-10" />
                    </motion.div>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">
                    {titulo}
                </h2>
                
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Para liberar o <strong className="text-tcm-red">{recursoNome}</strong>, você precisa assistir a pelo menos <strong>{aulasNecessarias} aulas</strong> do curso. 
                    Atualmente você assistiu a <strong className="text-slate-800">{aulasAssistidas}</strong>.
                </p>

                {/* Barra de Progresso de Liberação */}
                <div className="bg-slate-100 h-2.5 rounded-full mb-8 overflow-hidden border border-slate-200">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (aulasAssistidas / aulasNecessarias) * 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-tcm-red"
                    />
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full bg-tcm-red hover:bg-tcm-dark-red text-white font-bold py-3 px-6 rounded-tcm-md transition-tcm shadow-tcm-sm hover:shadow-tcm-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                        <PlayCircle className="w-4 h-4" />
                        Assistir Aulas
                    </button>
                    
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold py-2.5 px-6 rounded-tcm-md transition-tcm flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Voltar ao Início
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
