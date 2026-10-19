'use client';

import { useParams, useRouter } from 'next/navigation';
import { FileText, Video, PenTool, ArrowLeft } from 'lucide-react';
import SetNavbar from '../../components/SetNavbar';

interface DemoResourceConfig {
  navTitle: string;
  title: string;
  hanzi: string;
  description: string;
  icon: 'video' | 'pdf' | 'pen';
}

const DEMO_RESOURCES: Record<string, DemoResourceConfig> = {
  'aula-ao-vivo': {
    navTitle: 'Aula Ao Vivo',
    title: 'Sala de Aula Ao Vivo',
    hanzi: '直播课堂',
    description:
      'Na plataforma real, este botão abre diretamente a sala de videoconferência da turma. Nesta versão de demonstração do portfólio, o link externo está desativado.',
    icon: 'video',
  },
  'material-apoio-demo.pdf': {
    navTitle: 'Material de Apoio',
    title: 'Apostila da Aula (PDF)',
    hanzi: '课程讲义',
    description:
      'Na plataforma real, este botão abre o PDF da apostila correspondente à aula. Nesta versão de demonstração, os arquivos PDF autorais estão ocultos.',
    icon: 'pdf',
  },
  'caderno-exercicios-demo.pdf': {
    navTitle: 'Caderno de Exercícios',
    title: 'Folha de Prática e Caligrafia',
    hanzi: '练习册',
    description:
      'Na plataforma real, este botão abre o caderno de exercícios e caligrafia em PDF da lição. Você pode testar os exercícios interativos reais na aba de Atividades.',
    icon: 'pen',
  },
};

export default function DemoResourcePage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  const resource = DEMO_RESOURCES[slug] ?? {
    navTitle: 'Demonstração',
    title: 'Recurso Externo (Modo Demo)',
    hanzi: '演示',
    description:
      'Este link externo está desativado na versão pública de demonstração do portfólio.',
    icon: 'pdf' as const,
  };

  const IconComponent =
    resource.icon === 'video' ? Video : resource.icon === 'pen' ? PenTool : FileText;

  return (
    <div className="min-h-screen bg-slate-50 pt-16 font-sans">
      <SetNavbar title={resource.navTitle} backLink="/dashboard" />

      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-tcm-lg border border-slate-100 space-y-5">
          <div className="mx-auto w-14 h-14 bg-red-50 text-tcm-red rounded-2xl flex items-center justify-center border border-red-100">
            <IconComponent className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-serif text-tcm-red/80 tracking-widest block">
              {resource.hanzi}
            </span>
            <h1 className="text-xl font-bold text-slate-800">{resource.title}</h1>
            <p className="text-slate-500 text-sm leading-relaxed pt-1">
              {resource.description}
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full inline-flex items-center justify-center gap-2 bg-tcm-red hover:bg-tcm-dark-red text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-tcm-sm cursor-pointer text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
