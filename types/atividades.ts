// types/atividades.ts

// ============================================================================
// 1. TIPOS BASE PEDAGÓGICOS E MANDARIM
// ============================================================================

// Habilidades para futuro Analytics Pedagógico
export type HabilidadePedagogica = 
  | 'leitura'     // Ler hanzi/pinyin
  | 'escrita'     // Escrever/digitar hanzi/pinyin
  | 'escuta'      // Compreensão auditiva
  | 'fala'        // Pronúncia (audio_upload)
  | 'gramatica'   // Estrutura de frases
  | 'vocabulario'; // Significado isolado de palavras



// Estrutura para injetar blocos de Mandarim no meio de textos
export interface FragmentoMandarim {
  hanzi?: string;
  pinyin?: string;
  traducao?: string;
  // Permite ocultar partes específicas para testar o aluno
  config_exibicao?: {
    ocultar_hanzi?: boolean;
    ocultar_pinyin?: boolean;
    ocultar_traducao?: boolean;
  };
}

// ============================================================================
// 2. TIPOS DE QUESTÕES ESPECÍFICAS
// ============================================================================

export type TipoQuestao = 
  | 'multipla_escolha' 
  | 'ordenacao' 
  | 'texto_livre' 
  | 'audio_upload'
  | 'preencher_lacunas';

// Base comum que TODAS as questões partilham
export interface QuestaoBase {
  id: string; 
  // O enunciado pode conter variáveis como {{frag_1}} para injetar os fragmentos
  enunciado: string; 
  
  // Dicionário de fragmentos injetáveis no enunciado ou em dicas
  fragmentos_mandarim?: Record<string, FragmentoMandarim>; 
  
  // Tags para o Analytics Pedagógico
  habilidades_testadas?: HabilidadePedagogica[]; 
  
  
  pontuacao_maxima: number;
  dica?: string; 
  resposta_esperada?: string; // Guia global para o professor na correção manual (ex: texto livre ou audio opcional)
  midia_anexa?: {
    tipo: 'imagem' | 'audio' | 'video';
    url: string;
  }; 
}

// 2.1 Múltipla Escolha 
export interface QuestaoMultiplaEscolha extends QuestaoBase {
  tipo: 'multipla_escolha';
  permite_multiplas_respostas: boolean; // Define se a UI usa Radio (false) ou Checkbox (true)
  opcoes: Array<{
    id: string; 
    texto_simples?: string; 
    conteudo_mandarim?: FragmentoMandarim; 
  }>; 
  respostas_corretas_ids: string[]; 
}

// 2.2 Drag and Drop (Ordenação)
export interface QuestaoOrdenacao extends QuestaoBase {
  tipo: 'ordenacao';
  itens_para_ordenar: Array<{
    id: string;
    texto_simples?: string; 
    conteudo_mandarim?: FragmentoMandarim; 
  }>;
  ordem_correta_ids: string[]; 
}

// 2.3 Texto Livre (Redações, traduções diretas)
export interface QuestaoTextoLivre extends QuestaoBase {
  tipo: 'texto_livre';
  limite_caracteres?: number;
}

// 2.4 Upload de Áudio (Avaliação de pronúncia)
export interface QuestaoAudio extends QuestaoBase {
  tipo: 'audio_upload';
  tempo_maximo_segundos?: number;
}

// 2.5 Preencher Lacunas (Cloze)
export interface QuestaoLacunas extends QuestaoBase {
  tipo: 'preencher_lacunas';
  // Exemplo: "Wǒ {{lacuna_1}} xuésheng"
  texto_com_lacunas: string; 
  respostas_corretas_por_lacuna: Record<string, string[]>; 
}

// A UNIÃO DISCRIMINADA: Agrupa todos os tipos possíveis
export type QuestaoProva = 
  | QuestaoMultiplaEscolha 
  | QuestaoOrdenacao 
  | QuestaoTextoLivre 
  | QuestaoAudio
  | QuestaoLacunas;

// ============================================================================
// 3. A ESTRUTURA DA ATIVIDADE (Salva no BD em 'atividades.estrutura')
// ============================================================================

export interface EstruturaAtividadeProva {
  configuracoes: {
    tempo_limite_minutos?: number; 
    nota_aprovacao: number; 
    embaralhar_questoes: boolean;
    mostrar_gabarito_ao_finalizar: boolean; 
    modo_exibicao_mandarim?: 'pinyin_hanzi' | 'so_hanzi' | 'god_mode';
  };
  questoes: QuestaoProva[];
}

// ============================================================================
// 4. O REGISTRO DO ALUNO E CORREÇÃO (Salvo no BD em 'registros_dinamicos.dados')
// ============================================================================

export interface RespostaAluno {
  opcao_ids?: string[];                  // Usado para múltipla escolha ou ordenação
  texto?: string;                        // Usado para texto livre
  midia_url?: string;                    // Usado para upload de áudio (URL do Storage)
  mapa_lacunas?: Record<string, string>; // Usado para preencher lacunas
}

export interface DadosRegistroProva {
  iniciado_em: string; 
  finalizado_em?: string;
  /** Tempo real gasto em segundos (do início até o clique em Entregar) */
  tempo_gasto_segundos?: number;
  
  // Mapa onde a CHAVE é o ID da questão e o VALOR é a resposta estruturada do aluno
  respostas: Record<string, RespostaAluno>; 

  // Bloco preenchido após a submissão (automática ou manual)
  correcao?: {
    nota_total: number;
    feedback_geral?: string;
    corrigido_por_id?: string; 
    detalhes: Record<string, { 
      pontos_obtidos: number;
      // Facilita a aplicação de cores (verde, amarelo, vermelho) na interface do aluno
      status: 'correto' | 'parcial' | 'incorreto' | 'pendente_correcao'; 
      feedback_professor?: string;
    }>;
  };
}