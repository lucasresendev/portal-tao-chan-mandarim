'use client';

import { ArrowLeft, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useNavbarState } from './NavbarContext';
import Sidebar from './Sidebar';

/**
 * TopNavbar persistente — fica montado no layout e lê o conteúdo dinâmico
 * do NavbarContext. Enquanto navega, o título e botões fazem fade out/in.
 */
export default function TopNavbar() {
    const state = useNavbarState();
    const { title, rightContent, backLink, onBack, hideSidebarToggle } = state;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);

    const hasContent = !!(title || rightContent || backLink || onBack);

    return (
        <>
            <nav className="bg-tcm-red px-3 sm:px-6 h-16 flex justify-between items-center z-50 shadow-md fixed top-0 left-0 right-0 w-full border-b-4 border-tcm-yellow">
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                    {/* Botão Hambúrguer para abrir Sidebar */}
                    {!hideSidebarToggle && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-1.5 -ml-1 text-white hover:text-tcm-yellow hover:bg-tcm-dark-red rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Menu principal"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    )}

                    {/* Logo: sempre visível e garantido shrink-0 para nunca encolher ou deformar */}
                    <div className="bg-tcm-yellow/20 p-1.5 rounded-full shadow-inner border border-tcm-yellow/30 flex items-center justify-center shrink-0">
                        <Image src="/favicon.webp" alt="Logo Tao Ch'an Mandarim" width={28} height={28} priority className="w-7 h-7 object-contain drop-shadow-md rounded-full" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline min-w-0">
                        {/* Nome da Marca: garantido em uma única linha com whitespace-nowrap */}
                        <span className="font-bold text-white text-[15px] sm:text-lg block leading-none tracking-tight drop-shadow-sm shrink-0 whitespace-nowrap">
                            Tao Ch&apos;an Mandarim
                        </span>
                        {/* Título da página: visível abaixo no mobile e ao lado no desktop */}
                        <span
                            className={`text-[10px] sm:text-xs text-tcm-yellow font-bold uppercase tracking-wider sm:ml-2.5 mt-1 sm:mt-0 leading-tight transition-all duration-300 wrap-break-word ${
                                title
                                    ? 'opacity-100 translate-y-0'
                                    : 'opacity-0 -translate-y-1 pointer-events-none'
                            }`}
                        >
                            {title || '\u00a0'}
                        </span>
                    </div>
                </div>

                {/* Botões da direita: espaçamento otimizado para mobile */}
                <div
                    className={`flex items-center gap-2 sm:gap-3 shrink-0 transition-all duration-300 ${
                        hasContent ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
                    }`}
                >
                    {backLink && !onBack && (
                        <Link href={backLink} className="p-1.5 sm:p-2 text-white hover:text-tcm-yellow hover:bg-tcm-dark-red rounded-lg transition-colors cursor-pointer" title="Voltar">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                    )}
                    {onBack && (
                        <button onClick={onBack} className="p-1.5 sm:p-2 text-white hover:text-tcm-yellow hover:bg-tcm-dark-red rounded-lg transition-colors cursor-pointer" title="Voltar">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    )}
                    {rightContent}
                </div>
            </nav>

            {/* Gaveta do Menu Lateral */}
            <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
        </>
    );
}
