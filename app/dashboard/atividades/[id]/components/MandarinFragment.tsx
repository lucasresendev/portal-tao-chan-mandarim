'use client';

import { FragmentoMandarim } from '../../../../../types/atividades';

interface MandarinFragmentProps {
  fragment: FragmentoMandarim;
  size?: 'sm' | 'md' | 'lg';
}

export default function MandarinFragment({ fragment, size = 'md' }: MandarinFragmentProps) {
  const { hanzi, pinyin, traducao, config_exibicao } = fragment;
  const showHanzi = hanzi && !config_exibicao?.ocultar_hanzi;
  const showPinyin = pinyin && !config_exibicao?.ocultar_pinyin;
  const showTraducao = traducao && !config_exibicao?.ocultar_traducao;

  const sizeClasses = {
    sm: { hanzi: 'text-lg', pinyin: 'text-[10px]', traducao: 'text-[10px]' },
    md: { hanzi: 'text-2xl', pinyin: 'text-xs', traducao: 'text-xs' },
    lg: { hanzi: 'text-3xl', pinyin: 'text-sm', traducao: 'text-sm' },
  };

  const s = sizeClasses[size];

  return (
    <span className="inline-flex flex-col items-center mx-1 align-bottom">
      {showPinyin && (
        <span className={`${s.pinyin} text-tcm-red font-medium leading-tight`}>
          {pinyin}
        </span>
      )}
      {showHanzi && (
        <span className={`${s.hanzi} font-bold text-slate-900 leading-tight`}>
          {hanzi}
        </span>
      )}
      {showTraducao && (
        <span className={`${s.traducao} text-slate-400 italic leading-tight`}>
          {traducao}
        </span>
      )}
    </span>
  );
}
