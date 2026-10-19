'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useNavbar } from '../../../../components/NavbarContext';
import AtividadeForm from '../../components/AtividadeForm';
import { EstruturaAtividadeProva } from '../../../../../types/atividades';

interface AtividadeFormData {
  titulo: string;
  descricao: string;
  categoriaId: string;
  aulaId: string;
  isAtivo: boolean;
  estrutura: EstruturaAtividadeProva;
}

export default function EditarAtividade() {
  const router = useRouter();
  const params = useParams();
  const atividadeId = params.id as string;
  
  const { setNavbar } = useNavbar();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialData, setInitialData] = useState<AtividadeFormData | null>(null);

  useEffect(() => {
    setNavbar({ title: 'Editar Atividade', rightContent: null, backLink: '/admin/atividades' });
    return () => setNavbar({ title: '', rightContent: null });
  }, [setNavbar]);

  useEffect(() => {
    async function loadData() {
      const { data: atividade } = await supabase.from('atividades').select('*').eq('id', atividadeId).single();

      if (atividade) {
        let estruturaParsed = atividade.estrutura as unknown as EstruturaAtividadeProva;
        if (estruturaParsed && Object.keys(estruturaParsed).length > 0) {
          estruturaParsed = {
            ...estruturaParsed,
            configuracoes: {
              ...estruturaParsed.configuracoes,
              modo_exibicao_mandarim: estruturaParsed.configuracoes?.modo_exibicao_mandarim || 'god_mode'
            },
            questoes: estruturaParsed.questoes || []
          };
        } else {
          estruturaParsed = {
            configuracoes: {
              nota_aprovacao: 7,
              embaralhar_questoes: false,
              mostrar_gabarito_ao_finalizar: true,
              modo_exibicao_mandarim: 'god_mode'
            },
            questoes: []
          };
        }

        setInitialData({
          titulo: atividade.titulo,
          descricao: atividade.descricao || '',
          categoriaId: atividade.categoria_id,
          aulaId: atividade.aula_id || '',
          isAtivo: atividade.is_ativo,
          estrutura: estruturaParsed
        });
      } else {
        alert('Atividade não encontrada.');
        router.push('/admin/atividades');
      }

      setLoading(false);
    }
    loadData();
  }, [atividadeId, supabase, router]);

  const handleSave = async (data: AtividadeFormData) => {
    setSaving(true);

    const { error } = await supabase.from('atividades')
      .update({
        titulo: data.titulo,
        descricao: data.descricao,
        categoria_id: data.categoriaId,
        aula_id: data.aulaId || null,
        is_ativo: data.isAtivo,
        estrutura: data.estrutura as unknown as Record<string, unknown>
      })
      .eq('id', atividadeId);

    setSaving(false);

    if (error) {
      console.error(error);
      alert('Erro ao salvar: ' + error.message);
    } else {
      router.push('/admin/atividades');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 font-sans pt-16 bg-slate-50 flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 font-sans pt-16 bg-slate-50">
      <AtividadeForm 
        initialData={initialData || undefined}
        onSave={handleSave}
        loading={saving}
        saveButtonText="Salvar Alterações"
        onCancel={() => router.back()}
      />
    </div>
  );
}
