export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          nome: string
          status_matricula:
            | Database["public"]["Enums"]["status_matricula_enum"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_admin?: boolean | null
          nome: string
          status_matricula?:
            | Database["public"]["Enums"]["status_matricula_enum"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          nome?: string
          status_matricula?:
            | Database["public"]["Enums"]["status_matricula_enum"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      atividades: {
        Row: {
          aula_id: string | null
          categoria_id: string
          created_at: string | null
          descricao: string | null
          estrutura: Json | null
          id: string
          is_ativo: boolean | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          aula_id?: string | null
          categoria_id: string
          created_at?: string | null
          descricao?: string | null
          estrutura?: Json | null
          id?: string
          is_ativo?: boolean | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          aula_id?: string | null
          categoria_id?: string
          created_at?: string | null
          descricao?: string | null
          estrutura?: Json | null
          id?: string
          is_ativo?: boolean | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas: {
        Row: {
          codigo_aula: string
          codigo_licao: string | null
          comentarios: string | null
          created_at: string | null
          data_aula: string | null
          id: string
          is_excecao: boolean | null
          link_material: string | null
          link_tarefa: string | null
          links_adicionais: Json | null
          titulo_descritivo: string
          videos: Json | null
        }
        Insert: {
          codigo_aula: string
          codigo_licao?: string | null
          comentarios?: string | null
          created_at?: string | null
          data_aula?: string | null
          id?: string
          is_excecao?: boolean | null
          link_material?: string | null
          link_tarefa?: string | null
          links_adicionais?: Json | null
          titulo_descritivo: string
          videos?: Json | null
        }
        Update: {
          codigo_aula?: string
          codigo_licao?: string | null
          comentarios?: string | null
          created_at?: string | null
          data_aula?: string | null
          id?: string
          is_excecao?: boolean | null
          link_material?: string | null
          link_tarefa?: string | null
          links_adicionais?: Json | null
          titulo_descritivo?: string
          videos?: Json | null
        }
        Relationships: []
      }
      categorias_atividades: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      comentarios_aula: {
        Row: {
          aluno_id: string
          aula_id: string
          created_at: string | null
          id: string
          texto: string
        }
        Insert: {
          aluno_id: string
          aula_id: string
          created_at?: string | null
          id?: string
          texto: string
        }
        Update: {
          aluno_id?: string
          aula_id?: string
          created_at?: string | null
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_aula_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_aula_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogo_linhas: {
        Row: {
          dialogo_id: string
          fala_pc_hanzi: string | null
          fala_pc_pinyin: string | null
          fala_pc_pt: string | null
          id: string
          opcao2_correcao: string | null
          opcao2_hanzi: string | null
          opcao2_pinyin: string | null
          opcao2_pt: string | null
          opcao3_correcao: string | null
          opcao3_hanzi: string | null
          opcao3_pinyin: string | null
          opcao3_pt: string | null
          ordem: number
          resposta_certa_hanzi: string | null
          resposta_certa_pinyin: string | null
          resposta_certa_pt: string | null
        }
        Insert: {
          dialogo_id: string
          fala_pc_hanzi?: string | null
          fala_pc_pinyin?: string | null
          fala_pc_pt?: string | null
          id?: string
          opcao2_correcao?: string | null
          opcao2_hanzi?: string | null
          opcao2_pinyin?: string | null
          opcao2_pt?: string | null
          opcao3_correcao?: string | null
          opcao3_hanzi?: string | null
          opcao3_pinyin?: string | null
          opcao3_pt?: string | null
          ordem: number
          resposta_certa_hanzi?: string | null
          resposta_certa_pinyin?: string | null
          resposta_certa_pt?: string | null
        }
        Update: {
          dialogo_id?: string
          fala_pc_hanzi?: string | null
          fala_pc_pinyin?: string | null
          fala_pc_pt?: string | null
          id?: string
          opcao2_correcao?: string | null
          opcao2_hanzi?: string | null
          opcao2_pinyin?: string | null
          opcao2_pt?: string | null
          opcao3_correcao?: string | null
          opcao3_hanzi?: string | null
          opcao3_pinyin?: string | null
          opcao3_pt?: string | null
          ordem?: number
          resposta_certa_hanzi?: string | null
          resposta_certa_pinyin?: string | null
          resposta_certa_pt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dialogo_linhas_dialogo_id_fkey"
            columns: ["dialogo_id"]
            isOneToOne: false
            referencedRelation: "dialogos"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogos: {
        Row: {
          aula_id: string | null
          cenario: string | null
          created_at: string | null
          id: string
          ordem_exibicao: number | null
          titulo: string
        }
        Insert: {
          aula_id?: string | null
          cenario?: string | null
          created_at?: string | null
          id?: string
          ordem_exibicao?: number | null
          titulo: string
        }
        Update: {
          aula_id?: string | null
          cenario?: string | null
          created_at?: string | null
          id?: string
          ordem_exibicao?: number | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialogos_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      dicionario: {
        Row: {
          aula_id: string
          created_at: string | null
          curiosidade: string | null
          deck: string | null
          exemplos: string | null
          explicacao: string | null
          hanzi_simp: string
          hanzi_trad: string | null
          id: string
          licao_oficial_id: string | null
          pinyin: string
          som: string | null
          tipo: string
          tipo_nota: string | null
          traducao: string
        }
        Insert: {
          aula_id: string
          created_at?: string | null
          curiosidade?: string | null
          deck?: string | null
          exemplos?: string | null
          explicacao?: string | null
          hanzi_simp: string
          hanzi_trad?: string | null
          id?: string
          licao_oficial_id?: string | null
          pinyin: string
          som?: string | null
          tipo: string
          tipo_nota?: string | null
          traducao: string
        }
        Update: {
          aula_id?: string
          created_at?: string | null
          curiosidade?: string | null
          deck?: string | null
          exemplos?: string | null
          explicacao?: string | null
          hanzi_simp?: string
          hanzi_trad?: string | null
          id?: string
          licao_oficial_id?: string | null
          pinyin?: string
          som?: string | null
          tipo?: string
          tipo_nota?: string | null
          traducao?: string
        }
        Relationships: [
          {
            foreignKeyName: "dicionario_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dicionario_licao_oficial_id_fkey"
            columns: ["licao_oficial_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_aluno: {
        Row: {
          aluno_id: string
          aula_assistida: boolean | null
          aula_id: string
          created_at: string | null
          id: string
          status: Database["public"]["Enums"]["status_progresso"] | null
          tarefa_excecao_concluida: boolean | null
          tarefa_exercicios_concluida: boolean | null
          tarefa_hanzi_concluida: boolean | null
          updated_at: string | null
        }
        Insert: {
          aluno_id: string
          aula_assistida?: boolean | null
          aula_id: string
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_progresso"] | null
          tarefa_excecao_concluida?: boolean | null
          tarefa_exercicios_concluida?: boolean | null
          tarefa_hanzi_concluida?: boolean | null
          updated_at?: string | null
        }
        Update: {
          aluno_id?: string
          aula_assistida?: boolean | null
          aula_id?: string
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_progresso"] | null
          tarefa_excecao_concluida?: boolean | null
          tarefa_exercicios_concluida?: boolean | null
          tarefa_hanzi_concluida?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progresso_aluno_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_aluno_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_dialogo: {
        Row: {
          aluno_id: string
          dialogo_id: string
          id: string
          jogadas: number | null
          melhor_taxa_acerto: number | null
          total_erros_historico: number | null
          ultimo_acesso: string | null
        }
        Insert: {
          aluno_id: string
          dialogo_id: string
          id?: string
          jogadas?: number | null
          melhor_taxa_acerto?: number | null
          total_erros_historico?: number | null
          ultimo_acesso?: string | null
        }
        Update: {
          aluno_id?: string
          dialogo_id?: string
          id?: string
          jogadas?: number | null
          melhor_taxa_acerto?: number | null
          total_erros_historico?: number | null
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progresso_dialogo_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_dialogo_dialogo_id_fkey"
            columns: ["dialogo_id"]
            isOneToOne: false
            referencedRelation: "dialogos"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_srs_cards: {
        Row: {
          aluno_id: string
          created_at: string
          dicionario_id: string
          difficulty: number
          due: string
          elapsed_days: number
          id: string
          lapses: number
          last_review: string | null
          learning_steps: number
          reps: number
          scheduled_days: number
          stability: number
          state: number
        }
        Insert: {
          aluno_id: string
          created_at?: string
          dicionario_id: string
          difficulty?: number
          due?: string
          elapsed_days?: number
          id?: string
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: number
        }
        Update: {
          aluno_id?: string
          created_at?: string
          dicionario_id?: string
          difficulty?: number
          due?: string
          elapsed_days?: number
          id?: string
          lapses?: number
          last_review?: string | null
          learning_steps?: number
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: number
        }
        Relationships: [
          {
            foreignKeyName: "progresso_srs_cards_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_srs_cards_dicionario_id_fkey"
            columns: ["dicionario_id"]
            isOneToOne: false
            referencedRelation: "dicionario"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_srs_diario: {
        Row: {
          aluno_id: string
          data: string
          is_ajuste_adm: boolean
          quantidade: number
          tempo_estudo_segundos: number
          tempo_revelacao_segundos: number
        }
        Insert: {
          aluno_id: string
          data: string
          is_ajuste_adm?: boolean
          quantidade?: number
          tempo_estudo_segundos?: number
          tempo_revelacao_segundos?: number
        }
        Update: {
          aluno_id?: string
          data?: string
          is_ajuste_adm?: boolean
          quantidade?: number
          tempo_estudo_segundos?: number
          tempo_revelacao_segundos?: number
        }
        Relationships: [
          {
            foreignKeyName: "progresso_srs_diario_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_srs_meta: {
        Row: {
          aluno_id: string
          filtro_padrao: string
          limite_novas: number
          retencao_reduzida: boolean
          srs_habilitado: boolean
          streak_atual: number
          streak_maxima: number
          ultima_revisao: string | null
          updated_at: string
          virada_hora: number
        }
        Insert: {
          aluno_id: string
          filtro_padrao?: string
          limite_novas?: number
          retencao_reduzida?: boolean
          srs_habilitado?: boolean
          streak_atual?: number
          streak_maxima?: number
          ultima_revisao?: string | null
          updated_at?: string
          virada_hora?: number
        }
        Update: {
          aluno_id?: string
          filtro_padrao?: string
          limite_novas?: number
          retencao_reduzida?: boolean
          srs_habilitado?: boolean
          streak_atual?: number
          streak_maxima?: number
          ultima_revisao?: string | null
          updated_at?: string
          virada_hora?: number
        }
        Relationships: [
          {
            foreignKeyName: "progresso_srs_meta_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: true
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_blog: {
        Row: {
          autor_id: string | null
          capa_url: string | null
          categoria: string
          conteudo: Json
          created_at: string
          data_publicacao: string
          e_destaque: boolean
          id: string
          ordem_exibicao: number
          slug: string
          status: string
          tags: string[]
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          capa_url?: string | null
          categoria?: string
          conteudo?: Json
          created_at?: string
          data_publicacao?: string
          e_destaque?: boolean
          id?: string
          ordem_exibicao?: number
          slug: string
          status?: string
          tags?: string[]
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          capa_url?: string | null
          categoria?: string
          conteudo?: Json
          created_at?: string
          data_publicacao?: string
          e_destaque?: boolean
          id?: string
          ordem_exibicao?: number
          slug?: string
          status?: string
          tags?: string[]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_blog_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_dinamicos: {
        Row: {
          aluno_id: string
          atividade_id: string
          created_at: string | null
          dados: Json
          id: string
          status: Database["public"]["Enums"]["status_registro_enum"] | null
          updated_at: string | null
        }
        Insert: {
          aluno_id: string
          atividade_id: string
          created_at?: string | null
          dados?: Json
          id?: string
          status?: Database["public"]["Enums"]["status_registro_enum"] | null
          updated_at?: string | null
        }
        Update: {
          aluno_id?: string
          atividade_id?: string
          created_at?: string | null
          dados?: Json
          id?: string
          status?: Database["public"]["Enums"]["status_registro_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_dinamicos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_dinamicos_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_dinamicos_lixeira: {
        Row: {
          aluno_id: string | null
          apagado_em: string
          apagado_por_id: string | null
          atividade_id: string
          atualizado_em: string | null
          criado_em: string | null
          dados: Json | null
          id: string
          motivo: string | null
          registro_id: string
          status: string | null
        }
        Insert: {
          aluno_id?: string | null
          apagado_em?: string
          apagado_por_id?: string | null
          atividade_id: string
          atualizado_em?: string | null
          criado_em?: string | null
          dados?: Json | null
          id?: string
          motivo?: string | null
          registro_id: string
          status?: string | null
        }
        Update: {
          aluno_id?: string | null
          apagado_em?: string
          apagado_por_id?: string | null
          atividade_id?: string
          atualizado_em?: string | null
          criado_em?: string | null
          dados?: Json | null
          id?: string
          motivo?: string | null
          registro_id?: string
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_blog_slug: { Args: { title: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      status_matricula_enum: "Ativa" | "Pausada" | "Cancelada"
      status_progresso: "Pendente" | "Em Andamento" | "Concluída"
      status_registro_enum:
        | "Rascunho"
        | "Pendente"
        | "Corrigido"
        | "Concluido"
        | "Arquivado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_matricula_enum: ["Ativa", "Pausada", "Cancelada"],
      status_progresso: ["Pendente", "Em Andamento", "Concluída"],
      status_registro_enum: [
        "Rascunho",
        "Pendente",
        "Corrigido",
        "Concluido",
        "Arquivado",
      ],
    },
  },
} as const
