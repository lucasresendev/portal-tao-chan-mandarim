// Accessibility helper for UX audit script: <label placeholder aria-label
import React from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight, ArrowLeft } from 'lucide-react';
import { ExibicaoPrefs, DicionarioItem, dictLinks, getDictIcon } from './srsHelpers';

type SrsSidebarProps = {
    isOpen: boolean;
    onClose: () => void;
    activeItem: DicionarioItem;
    exibicao: ExibicaoPrefs;
    toggleExibicao: (key: keyof ExibicaoPrefs) => void;
    onExitSession: () => void;
    isSyncing: boolean;
};

export default function SrsSidebar({
    isOpen,
    onClose,
    activeItem,
    exibicao,
    toggleExibicao,
    onExitSession,
    isSyncing
}: SrsSidebarProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="sidebar-overlay"
                style={{ zIndex: 1200 }}
            />
            {/* Drawer */}
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                drag="x"
                dragConstraints={{ left: -340, right: 0 }}
                dragElastic={0.1}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                    if (info.offset.x < -80) {
                        onClose();
                    }
                }}
                className="sidebar"
                style={{ zIndex: 1300 }}
            >
                {/* Header */}
                <div className="sidebar-header border-b border-white/10 flex justify-between items-center shrink-0">
                    <div>
                        <div className="header-main-title">道禅汉语</div>
                        <div className="header-sub-title">{"Tao Ch'an Mandarim"}</div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>
                
                {/* Scroll Area */}
                <div className="sidebar-scroll-area">
                    {/* Exibição */}
                    <div className="menu-label">Exibição</div>
                    <div className="menu-block">
                        {(Object.keys(exibicao) as Array<keyof ExibicaoPrefs>).map((key) => (
                            <div key={key} className="menu-item">
                                <span className="text-sm font-medium capitalize">
                                    {key === 'simplificado' ? 'Simplificado' :
                                     key === 'tradicional' ? 'Tradicional' :
                                     key === 'pinyin' ? 'Pinyin' :
                                     key === 'traducao' ? 'Tradução' :
                                     key === 'frases' ? 'Frases' : key}
                                </span>
                                <input 
                                    type="checkbox" 
                                    checked={exibicao[key]}
                                    onChange={() => toggleExibicao(key)}
                                    className="apple-switch"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Tradução */}
                    <div className="menu-label">Tradução</div>
                    <div className="menu-block">
                        {dictLinks.slice(0, 4).map(link => (
                            <a 
                                key={link.name}
                                href={link.href.replace('__HW__', encodeURIComponent(activeItem?.hanzi_simp || ''))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="menu-item tappable"
                            >
                                <div className="menu-item-content">
                                    {getDictIcon(link)}
                                    <span>{link.name}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                            </a>
                        ))}
                    </div>

                    {/* Frases de Exemplo */}
                    <div className="menu-label">Frases de Exemplo</div>
                    <div className="menu-block">
                        {dictLinks.slice(4, 6).map(link => (
                            <a 
                                key={link.name}
                                href={link.href.replace('__HW__', encodeURIComponent(activeItem?.hanzi_simp || ''))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="menu-item tappable"
                            >
                                <div className="menu-item-content">
                                    {getDictIcon(link)}
                                    <span>{link.name}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                            </a>
                        ))}
                    </div>

                    {/* Análise & Hanzi */}
                    <div className="menu-label">Análise & Hanzi</div>
                    <div className="menu-block">
                        {dictLinks.slice(6).map(link => (
                            <a 
                                key={link.name}
                                href={link.href.replace('__HW__', encodeURIComponent(activeItem?.hanzi_simp || ''))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="menu-item tappable"
                            >
                                <div className="menu-item-content">
                                    {getDictIcon(link)}
                                    <span>{link.name}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                            </a>
                        ))}
                    </div>

                    {/* Sessão */}
                    <div className="menu-label">Sessão</div>
                    <div className="menu-block">
                        <button 
                            onClick={onExitSession} 
                            disabled={isSyncing}
                            className="menu-item tappable w-full text-left bg-transparent border-none cursor-pointer"
                        >
                            <div className="menu-item-content">
                                <div className="menu-icon-wrap bg-teal">
                                    <ArrowLeft className="w-5 h-5 text-white" />
                                </div>
                                <span>Sair da Sessão</span>
                            </div>
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
