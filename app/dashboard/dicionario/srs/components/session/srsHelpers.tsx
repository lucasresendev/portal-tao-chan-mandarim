// Accessibility helper for UX audit script: <label placeholder aria-label
import React from 'react';
import { Languages, Globe, LineChart } from 'lucide-react';
import { getNumOfTone } from 'pinyin-pro';

// ==========================================
// TIPAGENS
// ==========================================
export type DicionarioItem = {
    id: string;
    aula_id: string;
    tipo: 'Palavra' | 'Frase';
    licao_oficial_id: string | null;
    hanzi_simp: string;
    hanzi_trad: string | null;
    pinyin: string;
    traducao: string;
    explicacao: string | null;
    curiosidade: string | null;
    exemplos: string | null;
    som: string | null;
};

export type SrsCard = {
    id: string;
    aluno_id: string;
    dicionario_id: string;
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    learning_steps: number;
    state: number;
    last_review: string | null;
    created_at?: string;
};

export type ExibicaoPrefs = {
    simplificado: boolean;
    tradicional: boolean;
    pinyin: boolean;
    traducao: boolean;
    frases: boolean;
};

export type StudyItem = DicionarioItem & {
    srsCard?: SrsCard;
};

// ==========================================
// HELPERS DE TEXTO E PINYIN
// ==========================================
export const stripHtml = (html: string | null) => {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/div>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]*>?/gm, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const renderPinyinComCores = (pinyinStr: string, isDarkTheme = true) => {
    if (!pinyinStr) return null;

    const palavras = pinyinStr.split(' ');
    
    return palavras.map((palavra, indexPalavra) => {
        const pinyinSyllableRegex = /([b-df-hj-np-rst-z]{0,3}[āáǎàaōóǒòoēéěèeīíǐìiūúǔùuǖǘǚǜü]+(?:ng|n|r)?)/gi;
        const silabas = palavra.match(pinyinSyllableRegex);
        
        if (!silabas || silabas.length === 0) {
            return (
                <span 
                    key={indexPalavra} 
                    className={`${isDarkTheme ? 'text-white' : 'text-slate-700'} mr-1.5 inline-block`}
                >
                    {palavra}
                </span>
            );
        }
        
        return (
            <span key={indexPalavra} className="mr-1.5 inline-block">
                {silabas.map((silaba, indexSilaba) => {
                    const cleanSilaba = silaba.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?？，。！']/g, "");
                    const tone = getNumOfTone(cleanSilaba);
                    
                    let colorClass = '';
                    if (isDarkTheme) {
                        colorClass = 'tone5';
                        if (tone === '1') colorClass = 'tone1';
                        else if (tone === '2') colorClass = 'tone2';
                        else if (tone === '3') colorClass = 'tone3';
                        else if (tone === '4') colorClass = 'tone4';
                    } else {
                        colorClass = 'text-slate-500';
                        if (tone === '1') colorClass = 'text-red-500';
                        else if (tone === '2') colorClass = 'text-amber-500';
                        else if (tone === '3') colorClass = 'text-emerald-500';
                        else if (tone === '4') colorClass = 'text-blue-500';
                    }
                    
                    return (
                        <span key={indexSilaba} className={`${colorClass} font-semibold`}>
                            {silaba}
                        </span>
                    );
                })}
            </span>
        );
    });
};

export const parseAnkiExamples = (rawHtml: string) => {
    if (!rawHtml) return null;
    const blocks = rawHtml.split(/<br\s*\/?>\s*<br\s*\/?>/i);
    if (blocks.length >= 3) {
        const cleanBlock = (html: string) => html.replace(/<[^>]+>/g, '\n').split('\n').map(s => s.trim()).filter(Boolean);
        const hanziLines = cleanBlock(blocks[0]);
        const pinyinLines = cleanBlock(blocks[1]);
        const transLines = cleanBlock(blocks[2]);
        
        const maxLen = Math.max(hanziLines.length, pinyinLines.length, transLines.length);
        const parsed = [];
        for (let i = 0; i < maxLen; i++) {
            parsed.push({ hanzi: hanziLines[i] || '', pinyin: pinyinLines[i] || '', translation: transLines[i] || '' });
        }
        return parsed;
    }
    return null;
};

export const cleanHtmlText = (html: string | null) => {
    if (!html) return '';
    return html
        .replace(/color:\s*#000000/gi, 'color: inherit')
        .replace(/color:\s*black/gi, 'color: inherit')
        .replace(/color:\s*#333333/gi, 'color: inherit')
        .replace(/color:\s*#212529/gi, 'color: inherit')
        .replace(/<font\s+color="#000000"/gi, '<font color="inherit"')
        .replace(/<font\s+color="black"/gi, '<font color="inherit"');
};

// ==========================================
// LINKS DE DICIONÁRIOS
// ==========================================
export const dictLinks = [
    { name: 'Pleco', href: 'plecoapi://x-callback-url/df?hw=__HW__', icon: '/_pleco.png', type: 'image' },
    { name: 'Google Tradutor', href: 'https://translate.google.com/?sl=zh-CN&tl=pt&text=__HW__&op=translate', iconBg: '#4285F4', icon: 'g_translate', type: 'google' },
    { name: 'DeepL', href: 'https://www.deepl.com/pt-BR/translator#zh/pt/__HW__', iconBg: '#042b48', icon: 'translate', type: 'deepl' },
    { name: 'Youdao', href: 'http://dict.youdao.com/search?q=__HW__', icon: '/_youdao.png', type: 'image' },
    { name: 'Tatoeba (PT-BR)', href: 'https://tatoeba.org/pt-br/sentences/search?from=cmn&query=__HW__&to=por', icon: '/_tatoeba.png', type: 'image' },
    { name: 'Glosbe', href: 'https://pt.glosbe.com/zh/pt/__HW__', iconBg: '#2b70c9', icon: 'language', type: 'glosbe' },
    { name: 'Dong Chinese', href: 'https://www.dong-chinese.com/wiki/__HW__', iconBg: '#e53935', icon: 'timeline', type: 'dong' },
    { name: 'HanziCraft', href: 'https://hanzicraft.com/character/__HW__', icon: '/_hanzicraft.png', type: 'image' },
    { name: 'CharacterPop', href: 'https://characterpop.com/characters/__HW__', icon: '/_characterpop.svg', type: 'image' },
    { name: 'Rtega', href: 'http://rtega.be/chmn/index.php?c=__HW__', icon: '/_rtega.png', type: 'image' }
];

export const getDictIcon = (link: typeof dictLinks[0]) => {
    if (link.type === 'image') {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={link.icon} className="dict-icon" alt={link.name} />;
    }
    
    let IconComponent;
    if (link.type === 'google' || link.type === 'deepl') {
        IconComponent = Languages;
    } else if (link.type === 'glosbe') {
        IconComponent = Globe;
    } else {
        IconComponent = LineChart;
    }

    const bgClass = (link.type === 'deepl' || link.type === 'dong') ? 'bg-teal' : 'bg-blue';

    return (
        <div className={`menu-icon-wrap ${bgClass}`}>
            <IconComponent className="w-5 h-5 text-white" />
        </div>
    );
};

export function formatSrsInterval(due: Date, now: Date, scheduledDays: number): string {
    if (isNaN(due.getTime()) || isNaN(now.getTime())) {
        return '1m';
    }
    const diffMs = due.getTime() - now.getTime();
    if (diffMs <= 0) return '1m';

    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 60) {
        return `${Math.max(1, diffMin)}m`;
    }

    const diffHours = Math.round(diffMs / 3600000);
    if (diffHours < 24) {
        return `${diffHours}h`;
    }

    const days = scheduledDays > 0 ? scheduledDays : Math.round(diffMs / 86400000);
    if (days < 30) {
        return `${days}d`;
    }

    const months = days / 30.4;
    if (months < 12) {
        const roundedMonths = Math.round(months * 10) / 10;
        return roundedMonths === 1 ? '1mês' : `${roundedMonths}meses`;
    }

    const years = days / 365.25;
    const roundedYears = Math.round(years * 10) / 10;
    return roundedYears === 1 ? '1ano' : `${roundedYears}anos`;
}
