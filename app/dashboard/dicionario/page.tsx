'use client';



import { useState, useEffect, useMemo, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
    Loader2, Search, School, Lightbulb, MessageSquare, X, Filter, Volume2
} from 'lucide-react';
import posthog from 'posthog-js';
import { playCachedAudio } from '../../../lib/audioCache';
import SetNavbar from '../../components/SetNavbar';
import RecursoBloqueado from '../../components/RecursoBloqueado';
import { renderPinyinComCores } from './srs/components/session/srsHelpers';

// ==========================================
// TIPAGENS
// ==========================================
type DicionarioItem = {
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

type SrsCard = {
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

type StudyItem = DicionarioItem & {
    srsCard?: SrsCard;
};

type AulaInfo = {
    id: string;
    codigo_aula: string;
    codigo_licao: string | null;
    titulo_descritivo: string;
};

type ModalContent = {
    title: string;
    rawHtml?: string;
    examples?: { hanzi: string; pinyin: string; translation: string }[];
    type: 'html' | 'examples';
} | null;

// ==========================================
// HELPERS E SANITIZAÇÃO
// ==========================================
const stripHtml = (html: string | null) => {
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

const removeTones = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default function DicionarioPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [playingId, setPlayingId] = useState<string | null>(null);

    const playAudio = async (itemId: string, som: string) => {
        // Extract filename from [sound:filename.mp3] or use raw value
        const match = som.trim().match(/\[sound:(.+?)\]/);
        const filename = match ? match[1] : som.trim();
        const { data } = supabase.storage.from('dicionario').getPublicUrl(`sons/${filename}`);
        try {
            const audio = await playCachedAudio(data.publicUrl);
            setPlayingId(itemId);
            audio.play();
            audio.onended = () => setPlayingId(null);
            audio.onerror = () => setPlayingId(null);
        } catch {
            setPlayingId(null);
        }
    };

    // ==========================================
    // QUERIES DO TANSTACK
    // ==========================================
    const { data: sessionData, isLoading: isLoadingSession } = useQuery({
        queryKey: ['user-session'],
        queryFn: async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                router.push('/login');
                throw new Error('Não autenticado');
            }
            // Retorno PADRONIZADO idêntico ao do Dashboard
            const { data: profile } = await supabase.from('alunos').select('nome').eq('id', user.id).single();
            return { user, profile };
        },
        staleTime: Infinity,
    });

    // BUG RESOLVIDO AQUI: Lendo o ID da estrutura correta
    const userId = sessionData?.user?.id;

    // Consulta de progresso para controle de barreira de iniciantes
    const { data: progressoAulas = [], isLoading: isLoadingProgresso } = useQuery({
        queryKey: ['aulas-assistidas-count', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('progresso_aluno')
                .select('aula_id')
                .eq('aluno_id', userId)
                .eq('aula_assistida', true);
            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
    });

    const { data: dictData, isLoading: isLoadingDict } = useQuery({
        queryKey: ['dicionario', userId],
        enabled: !!userId,
        queryFn: async () => {
            // 1. Busca o progresso
            const { data: progressoData } = await supabase
                .from('progresso_aluno')
                .select('aula_id')
                .eq('aluno_id', userId)
                .eq('aula_assistida', true);

            // Exportamos como Array para o TanStack Query não quebrar a reatividade
            const idsArray = progressoData?.map(p => p.aula_id) || [];

            // 2. Busca dados em paralelo para otimizar tempo de carregamento
            const [dictResult, srsCardsResult, srsMetaResult, aulasDbResult] = await Promise.all([
                idsArray.length > 0
                    ? supabase.from('dicionario').select('*, som').or(`aula_id.in.(${idsArray.join(',')}),licao_oficial_id.in.(${idsArray.join(',')})`)
                    : Promise.resolve({ data: [] as DicionarioItem[], error: null }),
                supabase.from('progresso_srs_cards').select('*').eq('aluno_id', userId),
                supabase.from('progresso_srs_meta').select('*').eq('aluno_id', userId).maybeSingle(),
                supabase.from('aulas').select('id, codigo_aula, codigo_licao, titulo_descritivo')
            ]);

            if (dictResult.error) throw dictResult.error;
            if (srsCardsResult.error) throw srsCardsResult.error;

            const vocabData = (dictResult.data || []) as DicionarioItem[];
            const srsCards = (srsCardsResult.data || []) as SrsCard[];
            const srsMeta = srsMetaResult.data || null;
            const aulasDb = aulasDbResult.data || [];

            // Associa os estados SRS aos termos do dicionário
            const vocabularioComSrs = vocabData.map(item => {
                const srsCard = srsCards.find(c => c.dicionario_id === item.id);
                return {
                    ...item,
                    srsCard
                } as StudyItem;
            });

            return { 
                vocabulario: vocabularioComSrs, 
                watchedIdsArray: idsArray, 
                aulasArray: aulasDb,
                srsMeta
            };
        },
        staleTime: Infinity, // O cache do dicionário dura infinitamente durante a sessão e é limpo reativamente via invalidade no Dashboard se o progresso mudar.
    });

    const isLoading = isLoadingSession || isLoadingDict || isLoadingProgresso;
    
    // Tratamento livre de bugs de Lint e livre de quebra de cache
    const vocabulario = useMemo(() => dictData?.vocabulario || [], [dictData?.vocabulario]);
    const watchedIds = useMemo(() => new Set(dictData?.watchedIdsArray || []), [dictData?.watchedIdsArray]);
    const aulasMap = useMemo(() => {
        const map = new Map<string, AulaInfo>();
        dictData?.aulasArray?.forEach(a => map.set(a.id, a));
        return map;
    }, [dictData?.aulasArray]);

    const srsHabilitado = dictData?.srsMeta?.srs_habilitado === true;

    // Estados de UI e Filtros
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [busca, setBusca] = useState('');
    const [buscaDebounced, setBuscaDebounced] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Palavra' | 'Frase'>('Todos');
    const [escopoAtivo, setEscopoAtivo] = useState<'Tudo' | 'Oficial'>('Tudo');
    const [aulaFiltro, setAulaFiltro] = useState<string>('Todas');
    const [srsFiltro, setSrsFiltro] = useState<'Todos' | 'Estudando' | 'NaoEstudando'>('Todos');
    
    const [visibleCount, setVisibleCount] = useState(20);
    const loaderRef = useRef<HTMLDivElement>(null);

    const [modalContent, setModalContent] = useState<ModalContent>(null);
    const [revealedExamples, setRevealedExamples] = useState<Set<number>>(new Set());

    // ==========================================
    // DEBOUNCE DA BUSCA E RESET DE SCROLL
    // ==========================================
    useEffect(() => {
        const timer = setTimeout(() => {
            setBuscaDebounced(busca);
        }, 300);
        return () => clearTimeout(timer);
    }, [busca]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisibleCount(20);
    }, [tipoFiltro, escopoAtivo, aulaFiltro, srsFiltro, buscaDebounced]);

    // ==========================================
    // LÓGICA DO MODAL
    // ==========================================
    const parseAnkiExamples = (rawHtml: string) => {
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

    const openHtmlModal = (title: string, rawHtml: string) => {
        posthog.capture('dictionary_modal_opened', { type: title });
        setModalContent({ type: 'html', title, rawHtml });
    };

    const openExamplesModal = (rawHtml: string) => {
        posthog.capture('dictionary_examples_opened');
        const parsed = parseAnkiExamples(rawHtml);
        setRevealedExamples(new Set());
        if (parsed && parsed.length > 0) {
            setModalContent({ type: 'examples', title: 'Frases de Exemplo', examples: parsed });
        } else {
            setModalContent({ type: 'html', title: 'Frases de Exemplo', rawHtml });
        }
    };

    const toggleExampleReveal = (index: number) => {
        setRevealedExamples(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    // ==========================================
    // FILTRAGEM & ORDENAÇÃO INTELIGENTE
    // ==========================================
    const itensFiltrados = useMemo(() => {
        if (!vocabulario.length) return [];

        const filtrados = vocabulario.filter(item => {
            if (tipoFiltro !== 'Todos' && item.tipo !== tipoFiltro) return false;

            if (aulaFiltro !== 'Todas') {
                const pertenceAula = item.aula_id === aulaFiltro || item.licao_oficial_id === aulaFiltro;
                if (!pertenceAula) return false;
            }

            const isOficialParaAluno = item.licao_oficial_id && watchedIds.has(item.licao_oficial_id);
            const isExtraApresentada = watchedIds.has(item.aula_id);

            if (escopoAtivo === 'Oficial' && !isOficialParaAluno) return false;
            if (escopoAtivo === 'Tudo' && !isOficialParaAluno && !isExtraApresentada) return false;

            // Filtro condicional por status do SRS FSRS
            if (srsHabilitado && srsFiltro !== 'Todos') {
                const temSrs = !!item.srsCard;
                if (srsFiltro === 'Estudando' && !temSrs) return false;
                if (srsFiltro === 'NaoEstudando' && temSrs) return false;
            }

            if (buscaDebounced) {
                const b = buscaDebounced.toLowerCase();
                const bSemEspaco = b.replace(/\s+/g, '');

                const hLimpo = stripHtml(item.hanzi_simp).toLowerCase();
                const tLimpa = stripHtml(item.traducao).toLowerCase();
                
                const pLimpo = stripHtml(item.pinyin).toLowerCase(); 
                const pSemTom = removeTones(pLimpo);                 
                const pSemTomEEspaco = pSemTom.replace(/\s+/g, '');  

                return (
                    hLimpo.includes(b) || 
                    tLimpa.includes(b) || 
                    pLimpo.includes(b) ||                   
                    pSemTom.includes(b) ||                  
                    pSemTomEEspaco.includes(bSemEspaco)     
                );
            }
            
            return true;
        });

        return filtrados.sort((a, b) => {
            const aulaAInfo = aulasMap.get(a.aula_id);
            const aulaBInfo = aulasMap.get(b.aula_id);
            const numAulaA = aulaAInfo ? Number(aulaAInfo.codigo_aula) : -1;
            const numAulaB = aulaBInfo ? Number(aulaBInfo.codigo_aula) : -1;

            if (numAulaA !== numAulaB) return numAulaB - numAulaA;
            if (a.tipo !== b.tipo) return a.tipo === 'Palavra' ? -1 : 1;

            const aOficial = a.licao_oficial_id && watchedIds.has(a.licao_oficial_id) ? 1 : 0;
            const bOficial = b.licao_oficial_id && watchedIds.has(b.licao_oficial_id) ? 1 : 0;
            if (aOficial !== bOficial) return bOficial - aOficial;

            return stripHtml(a.pinyin).localeCompare(stripHtml(b.pinyin));
        });
    }, [vocabulario, tipoFiltro, escopoAtivo, aulaFiltro, srsFiltro, srsHabilitado, buscaDebounced, watchedIds, aulasMap]);

    const itensVisiveis = itensFiltrados.slice(0, visibleCount);

    // ==========================================
    // INFINITE SCROLL OBSERVER
    // ==========================================
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && visibleCount < itensFiltrados.length) {
                setVisibleCount((prev) => prev + 20);
            }
        }, { threshold: 0.1 });

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [visibleCount, itensFiltrados.length]);

    const aulasVistasFiltro = useMemo(() => {
        const list = Array.from(watchedIds).map(id => aulasMap.get(id)).filter(Boolean) as AulaInfo[];
        return list.sort((a, b) => Number(a.codigo_aula) - Number(b.codigo_aula));
    }, [watchedIds, aulasMap]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-tcm-red" /></div>;

    if (progressoAulas.length < 3) {
        return (
            <RecursoBloqueado 
                titulo="Dicionário Pessoal Bloqueado" 
                recursoNome="Dicionário Pessoal" 
                aulasNecessarias={3} 
                aulasAssistidas={progressoAulas.length} 
            />
        );
    }

    const filtrosAtivos = (tipoFiltro !== 'Todos' || escopoAtivo !== 'Tudo' || aulaFiltro !== 'Todas' || (srsHabilitado && srsFiltro !== 'Todos'));

    return (
        <div className="min-h-screen pb-20 font-sans bg-slate-50 pt-16">
            <SetNavbar 
                title="Dicionário"
                backLink="/dashboard"
                rightContent={
                    <div className="relative">
                        <button 
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)} 
                            className={`p-2 rounded-lg transition-colors cursor-pointer relative ${isFilterMenuOpen || filtrosAtivos ? 'bg-tcm-dark-red text-tcm-yellow' : 'text-white hover:text-tcm-yellow hover:bg-tcm-dark-red'}`}
                            title="Filtros do Dicionário"
                        >
                            <Filter className="w-6 h-6" />
                            {filtrosAtivos && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-tcm-yellow border-2 border-tcm-dark-red rounded-full"></span>}
                        </button>
                        
                        {isFilterMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-tcm-lg shadow-tcm-xl z-50 p-4 border border-slate-100 animate-in fade-in zoom-in-95 flex flex-col gap-4">
                                    
                                    <div>
                                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">Categoria de Conteúdo</h3>
                                        <select 
                                            value={tipoFiltro} 
                                            onChange={e => setTipoFiltro(e.target.value as 'Todos' | 'Palavra' | 'Frase')}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-tcm-sm focus:ring-tcm-red focus:border-tcm-red block p-2 outline-none"
                                        >
                                            <option value="Todos">Palavras e Frases</option>
                                            <option value="Palavra">Somente Palavras</option>
                                            <option value="Frase">Somente Frases</option>
                                        </select>
                                    </div>

                                    <div>
                                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">Modo de Estudo</h3>
                                        <select 
                                            value={escopoAtivo} 
                                            onChange={e => setEscopoAtivo(e.target.value as 'Tudo' | 'Oficial')}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-tcm-sm focus:ring-tcm-red focus:border-tcm-red block p-2 outline-none"
                                        >
                                            <option value="Tudo">Conteúdo da Aula (Completo)</option>
                                            <option value="Oficial">Livro Didático (Apenas Oficiais)</option>
                                        </select>
                                    </div>

                                    {srsHabilitado && (
                                        <div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">Progresso no SRS (Anki)</h3>
                                            <select 
                                                value={srsFiltro} 
                                                onChange={e => setSrsFiltro(e.target.value as 'Todos' | 'Estudando' | 'NaoEstudando')}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-tcm-sm focus:ring-tcm-red focus:border-tcm-red block p-2 outline-none"
                                            >
                                                <option value="Todos">Todos os termos</option>
                                                <option value="Estudando">Ativos no SRS (Estudando)</option>
                                                <option value="NaoEstudando">Não iniciados no SRS</option>
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">Filtrar por Aula Específica</h3>
                                        <select 
                                            value={aulaFiltro} 
                                            onChange={e => setAulaFiltro(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-tcm-sm focus:ring-tcm-red focus:border-tcm-red block p-2 outline-none"
                                        >
                                            <option value="Todas">Mostrar todas que já assisti</option>
                                            {aulasVistasFiltro.map(a => (
                                                <option key={a.id} value={a.id}>Aula {a.codigo_aula} - {a.titulo_descritivo}</option>
                                            ))}
                                        </select>
                                    </div>

                                </div>
                            </>
                        )}
                    </div>
                }
            />

            <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
                <div className="sticky top-20 z-30 shadow-tcm-sm rounded-tcm-lg">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por hanzi, pinyin ou tradução..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-tcm-lg text-base bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-tcm-red/50 focus:border-tcm-red transition-tcm shadow-tcm-sm"
                    />
                </div>

                {itensFiltrados.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-3">
                        <School className="w-10 h-10 text-slate-300" />
                        <p>Nenhuma {tipoFiltro !== 'Todos' ? tipoFiltro.toLowerCase() : 'palavra'} encontrada.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {itensVisiveis.map((item) => {
                            const isOficialParaAluno = item.licao_oficial_id && watchedIds.has(item.licao_oficial_id);
                            const licaoOficial = item.licao_oficial_id ? aulasMap.get(item.licao_oficial_id) : null;
                            const aulaOrigem = aulasMap.get(item.aula_id);

                            return (
                                <div key={item.id} className="bg-white rounded-tcm-lg p-5 sm:p-6 shadow-tcm-sm border border-slate-200 hover:border-tcm-red/30 hover:shadow-tcm-md transition-tcm tcm-lazy-render">
                                    
                                    <div className="flex items-center justify-between gap-2 mb-3 text-[11px] font-medium text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            {isOficialParaAluno ? (
                                                <span className="text-tcm-red/85 font-semibold">
                                                    {licaoOficial?.codigo_licao ? `Lição ${licaoOficial.codigo_licao}` : 'Oficial'}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">Extra</span>
                                            )}
                                            {aulaOrigem?.codigo_aula && (
                                                <>
                                                    <span className="text-slate-300">·</span>
                                                    <span>Aula {aulaOrigem.codigo_aula}</span>
                                                </>
                                            )}
                                        </div>

                                        {srsHabilitado && item.srsCard && (() => {
                                            const card = item.srsCard;
                                            let stateLabel = 'Novo';
                                            let dotColor = 'bg-blue-400';
                                            if (card.state === 1) {
                                                stateLabel = 'Aprendizado';
                                                dotColor = 'bg-amber-400';
                                            } else if (card.state === 2) {
                                                stateLabel = 'Revisão';
                                                dotColor = 'bg-emerald-500';
                                            } else if (card.state === 3) {
                                                stateLabel = 'Reaprendizado';
                                                dotColor = 'bg-red-400';
                                            }
                                            
                                            const stabLabel = card.stability < 1 
                                                ? `${Math.round(card.stability * 24)}h` 
                                                : `${Math.round(card.stability)}d`;

                                            return (
                                                <div 
                                                    className="flex items-center gap-1.5 text-slate-400" 
                                                    title={`Status: ${stateLabel} | Estabilidade: ${stabLabel} | Dificuldade FSRS: ${card.difficulty.toFixed(1)}/10`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} inline-block`}></span>
                                                    <span>{stabLabel}</span>
                                                    <span className="text-slate-300">·</span>
                                                    <span>{card.reps} {card.reps === 1 ? 'rev' : 'revs'}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {item.tipo === 'Palavra' ? (
                                        <div>
                                            <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4 mb-3">
                                                <div className="text-4xl font-medium text-slate-800 leading-none">{stripHtml(item.hanzi_simp)}</div>
                                                <div className="text-lg">{renderPinyinComCores(stripHtml(item.pinyin), false)}</div>
                                            </div>
                                            {item.hanzi_trad && stripHtml(item.hanzi_trad) !== stripHtml(item.hanzi_simp) && stripHtml(item.hanzi_trad) !== '' && (
                                                <div className="text-xs font-medium text-slate-500 mb-3 bg-slate-50 inline-block px-2 py-1 rounded-tcm-xs border border-slate-100">
                                                    Tradicional: {stripHtml(item.hanzi_trad)}
                                                </div>
                                            )}
                                            <div className="text-slate-700 text-lg border-t border-slate-100 pt-3">{stripHtml(item.traducao)}</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-2xl font-medium text-slate-800 leading-snug mb-2">{stripHtml(item.hanzi_simp)}</div>
                                            <div className="text-base mb-3 leading-relaxed">{renderPinyinComCores(stripHtml(item.pinyin), false)}</div>
                                            <div className="text-slate-700 text-lg border-t border-slate-100 pt-3">{stripHtml(item.traducao)}</div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 justify-end mt-4">
                                        {item.som && (
                                            <button
                                                onClick={() => playAudio(item.id, item.som!)}
                                                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-90 ${
                                                    playingId === item.id
                                                        ? 'bg-tcm-red text-white border-tcm-red shadow-md animate-pulse'
                                                        : 'bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-tcm-red border-slate-200 hover:border-red-200'
                                                }`}
                                                title="Ouvir pronúncia"
                                            >
                                                <Volume2 className="w-5 h-5" />
                                            </button>
                                        )}
                                        {item.exemplos && (
                                            <button onClick={() => openExamplesModal(item.exemplos!)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center transition-transform active:scale-90" title="Exemplos">
                                                <MessageSquare className="w-5 h-5" />
                                            </button>
                                        )}
                                        {item.explicacao && (
                                            <button onClick={() => openHtmlModal('Explicação', item.explicacao!)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center transition-transform active:scale-90" title="Explicação Detalhada">
                                                <School className="w-5 h-5" />
                                            </button>
                                        )}
                                        {item.curiosidade && (
                                            <button onClick={() => openHtmlModal('Curiosidade', item.curiosidade!)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center transition-transform active:scale-90" title="Curiosidade Cultural">
                                                <Lightbulb className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {visibleCount < itensFiltrados.length && (
                            <div ref={loaderRef} className="py-6 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                            </div>
                        )}
                    </div>
                )}
            </main>

            {modalContent && (
                <div 
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => setModalContent(null)}
                >
                    <div 
                        className="bg-white w-full sm:max-w-lg max-h-[85dvh] rounded-t-3xl sm:rounded-tcm-xl shadow-tcm-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                        </div>

                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">{modalContent.title}</h2>
                            <button onClick={() => setModalContent(null)} className="p-2 -mr-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {modalContent.type === 'html' && (
                                <div 
                                    className="prose prose-sm sm:prose-base prose-slate max-w-none 
                                    prose-h2:text-tcm-red prose-h2:text-lg prose-h2:mb-3 prose-h2:mt-6 first:prose-h2:mt-0
                                    prose-strong:text-slate-800 prose-p:leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: modalContent.rawHtml || '' }}
                                />
                            )}

                            {modalContent.type === 'examples' && modalContent.examples && (
                                <div className="space-y-3">
                                    {modalContent.examples.map((ex, idx) => {
                                        const isRevealed = revealedExamples.has(idx);
                                        return (
                                            <div 
                                                key={idx} 
                                                onClick={() => toggleExampleReveal(idx)}
                                                className="bg-slate-50 border border-slate-200 rounded-tcm-lg p-4 cursor-pointer active:scale-[0.98] transition-tcm shadow-tcm-sm hover:shadow-tcm-md"
                                            >
                                                <div className="text-xl font-medium text-slate-800 leading-snug">{stripHtml(ex.hanzi)}</div>
                                                
                                                <div className={`mt-3 pt-3 border-t border-slate-200 border-dashed transition-all duration-300 ${isRevealed ? 'block animate-in fade-in slide-in-from-top-2' : 'hidden'}`}>
                                                    <div className="text-base mb-1">{renderPinyinComCores(stripHtml(ex.pinyin), false)}</div>
                                                    <div className="text-sm text-slate-600">{stripHtml(ex.translation)}</div>
                                                </div>
                                                
                                                {!isRevealed && (
                                                    <div className="text-xs text-slate-400 text-right mt-2 font-medium">Tocar para traduzir</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}