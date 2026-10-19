'use client';



import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Loader2, MessageSquare, PlayCircle, Lock, 
    Trophy, RotateCcw, Lightbulb, Languages, XCircle, Check, CheckCheck
} from 'lucide-react';
import posthog from 'posthog-js';
import SetNavbar from '../../components/SetNavbar';

// ================== COMPONENTE DOS CHECKS (Estilo WhatsApp) ==================
const MessageChecks = () => {
    const [isRead, setIsRead] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setIsRead(true), 600);
        return () => clearTimeout(timer);
    }, []);
    return isRead ? <CheckCheck className="w-3.5 h-3.5 text-blue-300" /> : <Check className="w-3.5 h-3.5 text-white/70" />;
};

// ================== TIPAGENS ==================
type Dialogo = {
    id: string; titulo: string; aula_id: string; aula_codigo: string; is_liberado: boolean;
    cenario: string | null; 
    progresso: { jogadas: number; melhor_taxa_acerto: number; total_erros_historico: number; } | null;
};

type LinhaDialogo = {
    id: string; ordem: number; dialogo_id: string;
    fala_pc_hanzi: string; fala_pc_pinyin: string; fala_pc_pt: string;
    resposta_certa_hanzi: string; resposta_certa_pinyin: string; resposta_certa_pt: string;
    opcao2_hanzi: string; opcao2_pinyin: string; opcao2_pt: string; opcao2_correcao: string;
    opcao3_hanzi: string; opcao3_pinyin: string; opcao3_pt: string; opcao3_correcao: string;
};

type ChatMessage = { 
    id: number; sender: 'pc' | 'player'; 
    hanzi: string; pinyin: string; pt: string; 
    timeStr: string; timeExp: string; 
};

type Option = { hanzi: string; pinyin: string; pt: string; correcao: string; isCorrect: boolean; };
type TurnState = 'idle' | 'pc_typing' | 'waiting_thought' | 'showing_options' | 'evaluating';

// ================== HELPERS ==================
const getHoraMandarim = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    let periodo = '';
    let explicacao = '';
    const h12 = h % 12 || 12;

    if (h >= 0 && h < 5) { periodo = '凌晨'; explicacao = '凌晨 (língchén) = Madrugada'; }
    else if (h >= 5 && h < 9) { periodo = '早上'; explicacao = '早上 (zǎoshang) = Manhã cedo'; }
    else if (h >= 9 && h < 11) { periodo = '上午'; explicacao = '上午 (shàngwǔ) = Manhã'; }
    else if (h >= 11 && h < 13) { periodo = '中午'; explicacao = '中午 (zhōngwǔ) = Meio-dia'; }
    else if (h >= 13 && h < 18) { periodo = '下午'; explicacao = '下午 (xiàwǔ) = Tarde'; }
    else { periodo = '晚上'; explicacao = '晚上 (wǎnshàng) = Noite'; }

    return { timeStr: `${periodo} ${h12}:${m}`, timeExp: explicacao };
};

export default function SimuladorPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const queryClient = useQueryClient();

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
            const { data: profile } = await supabase.from('alunos').select('nome').eq('id', user.id).single();
            return { user, profile };
        },
        staleTime: Infinity,
    });

    const userId = sessionData?.user?.id;
    const firstName = sessionData?.profile?.nome ? sessionData.profile.nome.split(' ')[0] : 'Aluno';

    const { data: dialogos = [], isLoading: isLoadingDialogos } = useQuery({
        queryKey: ['dialogos', userId],
        enabled: !!userId,
        queryFn: async () => {
            const [progressoAulasRes, dialogosRes, progressoDialogosRes, aulasRes] = await Promise.all([
                supabase.from('progresso_aluno').select('aula_id').eq('aluno_id', userId).eq('aula_assistida', true),
                supabase.from('dialogos').select('*'),
                supabase.from('progresso_dialogo').select('*').eq('aluno_id', userId),
                supabase.from('aulas').select('id, codigo_aula')
            ]);

            const aulasAssistidasIds = new Set(progressoAulasRes.data?.map(p => p.aula_id) || []);

            return (dialogosRes.data || []).map(d => {
                const progresso = progressoDialogosRes.data?.find(p => p.dialogo_id === d.id) || null;
                const aulaInfo = aulasRes.data?.find(a => a.id === d.aula_id);
                return {
                    id: d.id, titulo: d.titulo, aula_id: d.aula_id,
                    cenario: d.cenario,
                    aula_codigo: aulaInfo?.codigo_aula || '999',
                    is_liberado: aulasAssistidasIds.has(d.aula_id), progresso
                };
            }).sort((a, b) => Number(a.aula_codigo) - Number(b.aula_codigo)) as Dialogo[];
        },
        staleTime: 1000 * 60 * 15, // 15 minutos de cache para a lista de diálogos
    });

    const isLoading = isLoadingSession || isLoadingDialogos;

    // Estados do Gameplay
    const [gameState, setGameState] = useState<'list' | 'playing' | 'summary'>('list');
    const [currentDialogo, setCurrentDialogo] = useState<Dialogo | null>(null);
    const [linhas, setLinhas] = useState<LinhaDialogo[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [currentOptions, setCurrentOptions] = useState<Option[]>([]);
    const [correcaoAtiva, setCorrecaoAtiva] = useState<string | null>(null);
    const [revealedMsgs, setRevealedMsgs] = useState<Set<number>>(new Set()); 
    
    const [turnState, setTurnState] = useState<TurnState>('idle');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const msgIdCounter = useRef(0);

    const [errosPartida, setErrosPartida] = useState(0);
    const [acertosPrimeira, setAcertosPrimeira] = useState(0);
    const [errouAtual, setErrouAtual] = useState(false);

    const [prefs, setPrefs] = useState({ hanzi: true, pinyin: true, pt: false });
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

    const getNextMsgId = () => { msgIdCounter.current += 1; return msgIdCounter.current; };
    const formatText = (text: string) => text ? text.replace(/{{nome}}/gi, firstName) : '';

    // Carrega preferências locais e Analytics
    useEffect(() => {
    const savedPrefs = localStorage.getItem('tcm_simulador_prefs');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedPrefs) setPrefs(JSON.parse(savedPrefs));

    if (sessionData?.user) {
            posthog.identify(sessionData.user.id, { email: sessionData.user.email, name: sessionData.profile?.nome, role: 'student' });
        }
    }, [sessionData]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, turnState]);


    const togglePref = (key: keyof typeof prefs) => {
        const newPrefs = { ...prefs, [key]: !prefs[key] };
        setPrefs(newPrefs);
        localStorage.setItem('tcm_simulador_prefs', JSON.stringify(newPrefs));
    };

    const handleMessageClick = (msgId: number) => {
        setRevealedMsgs(prev => {
            const next = new Set(prev);
            if (next.has(msgId)) next.delete(msgId);
            else next.add(msgId);
            return next;
        });
    };

    const startDialogo = async (dialogo: Dialogo) => {
        setCurrentDialogo(dialogo); 
        setErrosPartida(0);
        setAcertosPrimeira(0);
        setErrouAtual(false);
        setChatHistory([]);
        setRevealedMsgs(new Set());
        setGameState('playing');
        setTurnState('pc_typing'); 
        setCurrentStep(0);

        // Busca do TanStack Query: se já baixou as linhas dessa aula, ele não baixa de novo, 
        // pegando direto do cache da memória instantaneamente.
        let linhasParaUsar: LinhaDialogo[] | undefined = queryClient.getQueryData(['dialogo_linhas', dialogo.id]);

        if (!linhasParaUsar || linhasParaUsar.length === 0) {
            setLinhas([]); 
            
            const fetchPromise = queryClient.fetchQuery({
                queryKey: ['dialogo_linhas', dialogo.id],
                queryFn: async () => {
                    const { data, error } = await supabase.from('dialogo_linhas').select('*').eq('dialogo_id', dialogo.id).order('ordem');
                    if (error) throw error;
                    return data as LinhaDialogo[];
                },
                staleTime: Infinity // Linhas não mudam com frequência, pode manter no cache
            });

            // Mantém a experiência visual de carregamento que você criou
            const delayPromise = new Promise(resolve => setTimeout(resolve, 1500));
            const [fetchResult] = await Promise.all([fetchPromise, delayPromise]);
            
            if (!fetchResult || fetchResult.length === 0) {
                alert('Este diálogo ainda não possui linhas configuradas.');
                setGameState('list');
                return;
            }
            linhasParaUsar = fetchResult;
        }

        setLinhas(linhasParaUsar);

        const linha = linhasParaUsar[0];
        const horaData = getHoraMandarim();
        
        setChatHistory([{
            id: getNextMsgId(), sender: 'pc', hanzi: linha.fala_pc_hanzi, pinyin: linha.fala_pc_pinyin, pt: linha.fala_pc_pt, 
            timeStr: horaData.timeStr, timeExp: horaData.timeExp
        }]);
        
        const opts: Option[] = [ { hanzi: linha.resposta_certa_hanzi, pinyin: linha.resposta_certa_pinyin, pt: linha.resposta_certa_pt, correcao: '', isCorrect: true } ];
        if (linha.opcao2_hanzi) opts.push({ hanzi: linha.opcao2_hanzi, pinyin: linha.opcao2_pinyin, pt: linha.opcao2_pt, correcao: linha.opcao2_correcao, isCorrect: false });
        if (linha.opcao3_hanzi) opts.push({ hanzi: linha.opcao3_hanzi, pinyin: linha.opcao3_pinyin, pt: linha.opcao3_pt, correcao: linha.opcao3_correcao, isCorrect: false });
        setCurrentOptions(opts.sort(() => Math.random() - 0.5));

        setTurnState('waiting_thought');
    };

    const prepararPasso = (todasAsLinhas: LinhaDialogo[], stepIndex: number) => {
        if (stepIndex >= todasAsLinhas.length) {
            finalizarJogo(todasAsLinhas.length);
            return;
        }

        setCorrecaoAtiva(null);
        setErrouAtual(false);
        setTurnState('pc_typing'); 

        const linha = todasAsLinhas[stepIndex];

        setTimeout(() => {
            const horaData = getHoraMandarim();
            setChatHistory(prev => [...prev, {
                id: getNextMsgId(), sender: 'pc', hanzi: linha.fala_pc_hanzi, pinyin: linha.fala_pc_pinyin, pt: linha.fala_pc_pt, 
                timeStr: horaData.timeStr, timeExp: horaData.timeExp
            }]);
            
            const opts: Option[] = [ { hanzi: linha.resposta_certa_hanzi, pinyin: linha.resposta_certa_pinyin, pt: linha.resposta_certa_pt, correcao: '', isCorrect: true } ];
            if (linha.opcao2_hanzi) opts.push({ hanzi: linha.opcao2_hanzi, pinyin: linha.opcao2_pinyin, pt: linha.opcao2_pt, correcao: linha.opcao2_correcao, isCorrect: false });
            if (linha.opcao3_hanzi) opts.push({ hanzi: linha.opcao3_hanzi, pinyin: linha.opcao3_pinyin, pt: linha.opcao3_pt, correcao: linha.opcao3_correcao, isCorrect: false });
            setCurrentOptions(opts.sort(() => Math.random() - 0.5));

            setTurnState('waiting_thought');
        }, 1500);
    };

    const handleOptionClick = (opt: Option) => {
        setCorrecaoAtiva(null);

        if (opt.isCorrect) {
            setTurnState('evaluating'); 
            if (!errouAtual) setAcertosPrimeira(prev => prev + 1);
            
            const horaData = getHoraMandarim();
            setChatHistory(prev => [...prev, {
                id: getNextMsgId(), sender: 'player', hanzi: opt.hanzi, pinyin: opt.pinyin, pt: opt.pt, 
                timeStr: horaData.timeStr, timeExp: horaData.timeExp
            }]);
            
            setTimeout(() => {
                const nextIndex = currentStep + 1;
                setCurrentStep(nextIndex);
                prepararPasso(linhas, nextIndex);
            }, 600);
        } else {
            setErrosPartida(prev => prev + 1);
            setErrouAtual(true);
            setCorrecaoAtiva(opt.correcao || "Resposta incorreta, tente novamente!");
        }
    };

    // ==========================================
    // MUTATION DO PROGRESSO DO JOGO
    // ==========================================
    const saveProgressMutation = useMutation({
        mutationFn: async ({ dialogoId, jogadas, melhorTaxa, totalErros }: { dialogoId: string, jogadas: number, melhorTaxa: number, totalErros: number }) => {
            const { error } = await supabase.from('progresso_dialogo').upsert({
                aluno_id: userId,
                dialogo_id: dialogoId,
                jogadas,
                melhor_taxa_acerto: melhorTaxa,
                total_erros_historico: totalErros,
                ultimo_acesso: new Date().toISOString()
            }, { onConflict: 'aluno_id, dialogo_id' });
            
            if (error) throw error;
        },
        onMutate: async (vars) => {
            // Optimistic Update: atualiza a lista de diálogos instantaneamente no cache
            queryClient.setQueryData<Dialogo[]>(['dialogos', userId], (old) =>
                old?.map(d => d.id === vars.dialogoId ? {
                    ...d,
                    progresso: { jogadas: vars.jogadas, melhor_taxa_acerto: vars.melhorTaxa, total_erros_historico: vars.totalErros }
                } : d)
            );
        }
    });

    const finalizarJogo = (totalPerguntas: number) => {
        setGameState('summary');
        
        if (!userId || !currentDialogo) return;

        const taxaAcerto = totalPerguntas > 0 ? Math.round((acertosPrimeira / totalPerguntas) * 100) : 0;
        const progAntigo = currentDialogo.progresso;
        const novaMelhorTaxa = Math.max(progAntigo?.melhor_taxa_acerto || 0, taxaAcerto);
        const novoTotalErros = (progAntigo?.total_erros_historico || 0) + errosPartida;

        // Dispara o salvamento
        saveProgressMutation.mutate({
            dialogoId: currentDialogo.id,
            jogadas: (progAntigo?.jogadas || 0) + 1,
            melhorTaxa: novaMelhorTaxa,
            totalErros: novoTotalErros
        });

        // Atualiza o estado local para a tela de Summary refletir imediatamente
        setCurrentDialogo({
            ...currentDialogo,
            progresso: {
                jogadas: (progAntigo?.jogadas || 0) + 1,
                melhor_taxa_acerto: novaMelhorTaxa,
                total_erros_historico: novoTotalErros
            }
        });
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-tcm-red" /></div>;

    return (
        <div className="flex flex-col h-dvh pt-16 overflow-hidden bg-slate-50 font-sans relative">
            
            {gameState === 'playing' && (
                <div className="absolute inset-0 z-0 pointer-events-none bg-slate-100">
                    <div className="absolute inset-0 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center opacity-30 mix-blend-multiply"></div>
                </div>
            )}

            <SetNavbar 
                title="Simulador de Diálogos"
                rightContent={
                    <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="p-2 text-white hover:text-tcm-yellow hover:bg-tcm-dark-red rounded-lg transition-colors cursor-pointer" title="Ajustar Idiomas">
                        <Languages className="w-6 h-6" />
                    </button>
                }
                backLink={gameState === 'playing' ? undefined : "/dashboard"}
                onBack={gameState === 'playing' ? () => setGameState('list') : undefined}
            />

            <main className="relative z-10 flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto w-full h-full flex flex-col">

                    {isLangMenuOpen && (
                        <div className="absolute right-4 mt-2 w-48 bg-white rounded-2xl shadow-xl z-50 p-3 border border-slate-100 animate-in fade-in zoom-in-95">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-2">Exibir Padrão:</h3>
                            <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                <input type="checkbox" checked={prefs.hanzi} onChange={() => togglePref('hanzi')} className="accent-tcm-red w-4 h-4" /> 
                                <span className="text-sm font-medium text-slate-700">Hanzi (汉字)</span>
                            </label>
                            <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                <input type="checkbox" checked={prefs.pinyin} onChange={() => togglePref('pinyin')} className="accent-tcm-red w-4 h-4" /> 
                                <span className="text-sm font-medium text-slate-700">Pinyin</span>
                            </label>
                            <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                <input type="checkbox" checked={prefs.pt} onChange={() => togglePref('pt')} className="accent-tcm-red w-4 h-4" /> 
                                <span className="text-sm font-medium text-slate-700">Português</span>
                            </label>
                        </div>
                    )}

                    {gameState === 'list' && (
                        <div className="p-4 mt-6 space-y-6 animate-in fade-in">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-slate-800">Praticar Conversação</h2>
                                <p className="text-slate-500 mt-1">Selecione um diálogo desbloqueado.</p>
                            </div>

                            {dialogos.length === 0 ? (
                                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm flex flex-col items-center justify-center gap-4 max-w-md mx-auto mt-12 animate-in zoom-in-95">
                                    <div className="bg-slate-50 p-4 rounded-full">
                                        <MessageSquare className="w-12 h-12 text-slate-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-1">Nenhum diálogo disponível</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Ainda não há diálogos prontos para a sua conta. Assista mais aulas para desbloquear novos desafios de conversação!
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => router.push('/dashboard')} 
                                        onMouseEnter={() => router.prefetch('/dashboard')}
                                        className="mt-4 bg-tcm-red hover:bg-tcm-dark-red text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
                                    >
                                        Voltar para as Aulas
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4 pb-12">
                                    {dialogos.map(dialogo => (
                                        <div key={dialogo.id} className={`bg-white border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between transition-all shadow-sm ${dialogo.is_liberado ? 'border-slate-200 hover:border-tcm-red hover:shadow-md' : 'border-slate-100 opacity-60'}`}>
                                            <div className="flex items-center gap-4 w-full">
                                                <div className={`p-3 rounded-xl shrink-0 ${dialogo.is_liberado ? 'bg-red-50 text-tcm-red' : 'bg-slate-200 text-slate-400'}`}>
                                                    {dialogo.is_liberado ? <MessageSquare className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Aula {dialogo.aula_codigo}</div>
                                                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{dialogo.titulo}</h3>
                                                </div>

                                                {dialogo.progresso && (
                                                    <div className="hidden sm:flex flex-col items-center justify-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recorde</span>
                                                        <span className="text-lg font-bold text-tcm-red leading-none">{dialogo.progresso.melhor_taxa_acerto}%</span>
                                                    </div>
                                                )}
                                            </div>

                                            {dialogo.is_liberado ? (
                                                <button onClick={() => startDialogo(dialogo)} className="w-full sm:w-auto shrink-0 bg-tcm-red hover:bg-tcm-dark-red text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer">
                                                    <PlayCircle className="w-5 h-5" /> Iniciar
                                                </button>
                                            ) : (
                                                <div className="w-full sm:w-auto text-center text-xs text-slate-500 bg-slate-200 px-4 py-3 rounded-xl">
                                                    Assista à Aula {dialogo.aula_codigo}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {gameState === 'playing' && (
                        <div className="flex-1 p-4 space-y-4 pb-12">
                            <div className="flex flex-col items-center mb-6 space-y-3">
                                <span className="bg-white/80 backdrop-blur-sm text-slate-600 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
                                    Aula {currentDialogo?.aula_codigo}
                                </span>
                                
                                {currentDialogo?.cenario && (
                                    <div className="bg-amber-50/95 backdrop-blur-sm border border-amber-200/60 text-slate-700 text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-sm max-w-[85%] text-center leading-relaxed">
                                        {currentDialogo.cenario}
                                    </div>
                                )}
                            </div>

                            {chatHistory.map((msg) => {
                                const isRevealed = revealedMsgs.has(msg.id);
                                const showH = prefs.hanzi || isRevealed;
                                const showP = prefs.pinyin || isRevealed;
                                const showPt = prefs.pt || isRevealed;

                                return (
                                    <div key={msg.id} className={`flex w-full ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}>
                                        <div 
                                            onClick={() => handleMessageClick(msg.id)}
                                            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer ${msg.sender === 'player' ? 'bg-tcm-red text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'}`}
                                        >
                                            <div className="flex flex-col">
                                                {showH && msg.hanzi && <span className={`text-lg md:text-xl font-medium ${msg.sender === 'player' ? 'text-white' : 'text-slate-800'}`}>{formatText(msg.hanzi)}</span>}
                                                {showP && msg.pinyin && <span className={`text-sm md:text-base font-medium ${msg.sender === 'player' ? 'text-tcm-yellow' : 'text-tcm-red'}`}>{formatText(msg.pinyin)}</span>}
                                                {showPt && msg.pt && <span className={`text-xs md:text-sm italic mt-0.5 ${msg.sender === 'player' ? 'text-white/80' : 'text-slate-500'}`}>{formatText(msg.pt)}</span>}
                                            </div>
                                            
                                            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium ${msg.sender === 'player' ? 'text-white/70' : 'text-slate-400'}`}>
                                                {msg.timeStr}
                                                {msg.sender === 'player' && <MessageChecks />}
                                            </div>

                                            {isRevealed && (
                                                <div className={`text-[10px] mt-2 pt-2 border-t font-medium ${msg.sender === 'player' ? 'border-white/20 text-white/80' : 'border-slate-100 text-slate-400'}`}>
                                                    🕒 {msg.timeExp}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {turnState === 'pc_typing' && (
                                <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-4 shadow-sm flex gap-1.5 items-center w-16">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} className="h-4" />
                        </div>
                    )}

                    {gameState === 'summary' && (
                        <div className="p-4 mt-6 animate-in zoom-in-95 pb-12">
                            <div className="bg-white rounded-3xl p-6 sm:p-8 text-center shadow-lg border border-slate-200">
                                <div className="bg-tcm-yellow/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Trophy className="w-10 h-10 text-tcm-red" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Conversa Concluída!</h2>
                                <p className="text-slate-500 mb-8">Bom trabalho treinando seu mandarim.</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto mb-10">
                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                                        <div className="text-xs uppercase font-bold text-slate-400 mb-2">Acertos de Primeira</div>
                                        <span className="text-4xl font-bold text-emerald-600 leading-none block text-center mb-3">
                                            {Math.round((acertosPrimeira / linhas.length) * 100)}%
                                        </span>
                                        <div className="pt-3 border-t border-slate-200 text-xs text-slate-500">
                                            Recorde: <strong className="text-slate-700">{currentDialogo?.progresso?.melhor_taxa_acerto || Math.round((acertosPrimeira / linhas.length) * 100)}%</strong>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-red-400"></div>
                                        <div className="text-xs uppercase font-bold text-slate-400 mb-2">Erros na Partida</div>
                                        <span className="text-4xl font-bold text-red-500 leading-none block text-center mb-3">
                                            {errosPartida}
                                        </span>
                                        <div className="pt-3 border-t border-slate-200 text-xs text-slate-500">
                                            Total histórico: <strong className="text-slate-700">{(currentDialogo?.progresso?.total_erros_historico || 0) + errosPartida}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button onClick={() => startDialogo(currentDialogo!)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer">
                                        <RotateCcw className="w-5 h-5" /> Jogar Novamente
                                    </button>
                                    <button onClick={() => setGameState('list')} className="bg-tcm-red hover:bg-tcm-dark-red text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer">
                                        <MessageSquare className="w-5 h-5" /> Escolher Outra
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {gameState === 'playing' && (
                <footer className="relative z-20 bg-white border-t border-slate-200 p-4 sm:p-6 shrink-0 shadow-[0_-4px_25px_-5px_rgba(0,0,0,0.1)]">
                    <div className="max-w-3xl mx-auto w-full">
                        
                        {correcaoAtiva && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-2 animate-in fade-in">
                                <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <span>{correcaoAtiva}</span>
                            </div>
                        )}

                        {turnState === 'waiting_thought' && (
                            <button 
                                onClick={() => setTurnState('showing_options')}
                                className="w-full bg-tcm-yellow hover:bg-yellow-500 text-slate-900 py-4 rounded-2xl font-bold text-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 animate-in zoom-in-95 cursor-pointer"
                            >
                                <Lightbulb className="w-6 h-6" /> Já pensei na resposta
                            </button>
                        )}

                        {turnState === 'showing_options' && (
                            <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-4">
                                <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Escolha a resposta correta:</p>
                                {currentOptions.map((opt, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => handleOptionClick(opt)}
                                        className="text-left w-full p-3 sm:p-4 rounded-xl bg-tcm-red hover:bg-tcm-dark-red transition-all focus:outline-none focus:ring-4 focus:ring-tcm-yellow cursor-pointer shadow-md"
                                    >
                                        <div className="flex flex-col">
                                            {prefs.hanzi && <span className="text-lg md:text-xl font-medium text-white">{formatText(opt.hanzi)}</span>}
                                            {prefs.pinyin && <span className="text-sm md:text-base font-medium text-tcm-yellow">{formatText(opt.pinyin)}</span>}
                                            {prefs.pt && <span className="text-xs md:text-sm italic mt-0.5 text-white/80">{formatText(opt.pt)}</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </footer>
            )}
        </div>
    );
}