'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useNavbar } from '../../../components/NavbarContext';
import AtividadeForm from '../components/AtividadeForm';

import { EstruturaAtividadeProva } from '../../../../types/atividades';

interface AtividadeData {
  titulo: string;
  descricao: string;
  categoriaId: string;
  aulaId: string;
  isAtivo: boolean;
  estrutura: EstruturaAtividadeProva;
}

export default function CriarAtividade() {
  const router = useRouter();
  const { setNavbar } = useNavbar();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNavbar({ title: 'Nova Atividade', rightContent: null, backLink: '/admin/atividades' });
    return () => setNavbar({ title: '', rightContent: null });
  }, [setNavbar]);

  const handleSave = async (data: AtividadeData) => {
    setLoading(true);

    const { error } = await supabase.from('atividades').insert({
      titulo: data.titulo,
      descricao: data.descricao,
      categoria_id: data.categoriaId,
      aula_id: data.aulaId || null,
      is_ativo: data.isAtivo,
      estrutura: data.estrutura as unknown as Record<string, unknown>
    });

    setLoading(false);

    if (error) {
      console.error(error);
      alert('Erro ao salvar: ' + error.message);
    } else {
      router.push('/admin/atividades');
    }
  };

  return (
    <div className="min-h-screen pb-20 font-sans pt-16 bg-slate-50">
      <AtividadeForm 
        onSave={handleSave}
        loading={loading}
        saveButtonText="Salvar Prova"
        onCancel={() => router.back()}
      />
    </div>
  );
}
