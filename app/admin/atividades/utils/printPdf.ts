import { EstruturaAtividadeProva, DadosRegistroProva } from '../../../../types/atividades';
import { DetalheCorrecao } from '../entregas/[atividadeId]/[registroId]/components/GradingPanel';

interface PrintPdfOptions {
  titulo: string;
  descricao?: string;
  estrutura: EstruturaAtividadeProva;
  isFilled?: boolean;
  alunoNome?: string;
  dataSubmissao?: string;
  respostas?: DadosRegistroProva['respostas'];
  correcao?: Record<string, DetalheCorrecao>;
  notaTotal?: number;
  pontosMax?: number;
  feedbackGeral?: string;
}

export function generatePrintablePdf(options: PrintPdfOptions) {
  const { 
    titulo, descricao, estrutura, 
    isFilled, alunoNome, dataSubmissao, respostas, correcao, notaTotal, pontosMax, feedbackGeral 
  } = options;

  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    alert("Por favor, permita popups para gerar o PDF.");
    return;
  }

  const currentDate = dataSubmissao || new Date().toLocaleDateString('pt-BR');

  let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${titulo || 'Avaliação'} - Impressão</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap');
          
          :root {
            --slate-50: #f8fafc;
            --slate-100: #f1f5f9;
            --slate-200: #e2e8f0;
            --slate-300: #cbd5e1;
            --slate-400: #94a3b8;
            --slate-500: #64748b;
            --slate-600: #475569;
            --slate-700: #334155;
            --slate-800: #1e293b;
            --slate-900: #0f172a;
            --green-50: #f0fdf4;
            --green-100: #dcfce7;
            --green-200: #bbf7d0;
            --green-500: #22c55e;
            --green-600: #16a34a;
            --green-700: #15803d;
            --red-50: #fef2f2;
            --red-100: #fee2e2;
            --red-200: #fecaca;
            --red-500: #ef4444;
            --red-600: #dc2626;
            --red-700: #b91c1c;
            --amber-50: #fffbeb;
            --amber-100: #fef3c7;
            --amber-200: #fde68a;
            --amber-500: #f59e0b;
            --amber-600: #d97706;
            --amber-700: #92400e;
            --blue-50: #eff6ff;
            --blue-100: #dbeafe;
            --blue-500: #3b82f6;
            --blue-600: #2563eb;
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 14px;
            --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
            --shadow-md: 0 4px 12px rgba(0,0,0,0.05);
          }

          * { box-sizing: border-box; }
          
          body { 
            font-family: 'Inter', system-ui, sans-serif; 
            color: var(--slate-800); 
            line-height: 1.5; 
            padding: 40px; 
            max-width: 900px;
            margin: 0 auto;
            background: white;
            -webkit-font-smoothing: antialiased;
          }

          @page {
            size: A4;
            margin: 15mm 20mm;
          }

          @media print {
            body { 
              padding: 0; 
              max-width: 100%;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }

          /* Header */
          .header {
            padding: 24px 20px 20px;
            margin-bottom: 32px;
            background: linear-gradient(120deg, var(--slate-50) 0%, white 100%);
            border-bottom: 2px solid var(--slate-200);
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          }
          
          .header-title { 
            font-size: 28px; 
            font-weight: 800; 
            color: var(--slate-900); 
            margin: 0 0 6px 0; 
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .header-title::before {
            content: "📋";
            font-size: 24px;
          }
          
          .header-desc { 
            color: var(--slate-500); 
            font-size: 15px; 
            line-height: 1.6;
            margin: 4px 0 0 0;
          }

          /* Info wrapper */
          .info-wrapper {
            display: flex;
            gap: 20px;
            margin-bottom: 32px;
            align-items: stretch;
          }

          .info-grid {
            flex: 1;
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 16px;
            background: var(--slate-50);
            border: 1px solid var(--slate-200);
            border-radius: var(--radius-md);
            padding: 14px 20px;
            box-shadow: var(--shadow-sm);
          }

          .info-item {
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .info-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--slate-500);
            font-weight: 700;
            margin-bottom: 4px;
          }

          .info-value {
            font-size: 15px;
            font-weight: 600;
            color: var(--slate-900);
            border-bottom: 1px dashed var(--slate-300);
            padding-bottom: 4px;
            min-height: 24px;
            display: flex;
            align-items: center;
          }

          .grade-box {
            background: white;
            border: 1px solid var(--slate-200);
            border-radius: var(--radius-md);
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-width: 130px;
            box-shadow: var(--shadow-sm);
          }
          
          .grade-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: conic-gradient(var(--blue-500) calc(var(--percent) * 1%), var(--slate-100) 0);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
          }
          
          .grade-inner {
            width: 64px;
            height: 64px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            color: var(--slate-900);
            text-align: center;
            padding: 2px;
            line-height: 1.1;
            overflow: hidden;
            word-break: break-all;
          }

          .grade-max {
            font-size: 13px;
            color: var(--slate-500);
            font-weight: 600;
          }

          /* Questões */
          .questao { 
            margin-bottom: 32px;
            padding: 12px 0;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .enunciado-container { 
            display: flex;
            gap: 14px;
            align-items: flex-start;
            margin-bottom: 12px;
          }

          .q-num {
            font-weight: 800;
            font-size: 13px;
            color: var(--slate-700);
            background: var(--slate-100);
            min-width: 34px;
            height: 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            flex-shrink: 0;
            border: 1px solid var(--slate-200);
            box-shadow: var(--shadow-xs);
          }

          .q-content {
            flex: 1;
            min-width: 0;
          }

          .enunciado-text {
            font-size: 16px;
            color: var(--slate-800);
            line-height: 1.6;
            font-weight: 500;
          }
          
          .enunciado-text p { margin: 0 0 10px 0; }
          .enunciado-text p:last-child { margin-bottom: 0; }

          /* Status badge reposicionado */
          .status-wrapper {
            margin-top: 8px;
            display: flex;
            justify-content: flex-end;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: var(--radius-sm);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            line-height: 1;
            background: white;
            border: 1px solid var(--slate-200);
            color: var(--slate-600);
          }
          
          .status-badge::before {
            font-size: 13px;
          }
          
          .status-correto { background: var(--green-100); color: var(--green-700); border-color: var(--green-200); }
          .status-correto::before { content: "✓"; }
          
          .status-incorreto { background: var(--red-100); color: var(--red-700); border-color: var(--red-200); }
          .status-incorreto::before { content: "✗"; }
          
          .status-parcial { background: var(--amber-100); color: var(--amber-700); border-color: var(--amber-200); }
          .status-parcial::before { content: "≈"; font-weight: 700; }
          
          .status-pendente { background: var(--slate-100); color: var(--slate-600); border-color: var(--slate-200); }
          .status-pendente::before { content: "?"; }

          /* Lacunas */
          .lacuna-inline {
            display: inline-block;
            min-width: 48px;
            border-bottom: 2px solid var(--slate-400);
            margin: 0 4px;
            text-align: center;
            font-weight: 600;
            color: var(--slate-900);
            padding: 0 8px 2px;
            line-height: 1.4;
            vertical-align: baseline;
            background: transparent;
          }
          .lacuna-inline.correto { 
            color: var(--green-600); 
            border-color: var(--green-500); 
            background: var(--green-50);
          }
          .lacuna-inline.incorreto { 
            color: var(--red-600); 
            border-color: var(--red-500); 
            text-decoration: line-through;
            background: var(--red-50);
          }
          .lacuna-inline.vazia { 
            color: transparent;
            background: var(--slate-50);
            border-style: dashed;
          }

          /* Opções */
          .opcoes { 
            list-style: none; 
            padding-left: 48px; 
            margin: 0;
          }
          
          .opcao-item { 
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 5px;
            padding: 8px 14px;
            border-radius: var(--radius-md);
            border: 1px solid transparent;
            font-size: 15px;
            font-weight: 500;
          }
          
          .opcao-marker {
            width: 22px; 
            height: 22px;
            border: 2px solid var(--slate-300);
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            position: relative;
            font-size: 12px;
            font-weight: 700;
          }
          
          .opcao-marker.circle { border-radius: 50%; }
          .opcao-marker.square { border-radius: var(--radius-sm); }
          
          .opcao-item.checked .opcao-marker {
            border-color: var(--slate-800);
          }
          
          .opcao-item.checked .opcao-marker::after {
            content: '';
            display: block;
            width: 10px;
            height: 10px;
            background: var(--slate-800);
            border-radius: inherit;
          }

          .opcao-item.correto-selected .opcao-marker { 
            border-color: var(--green-600); 
            background: var(--green-100);
            box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
          }
          .opcao-item.correto-selected .opcao-marker::after { 
            content: "✓";
            font-size: 12px;
            color: var(--green-700);
            position: absolute;
            line-height: 1;
            font-weight: 700;
            background: transparent;
            border-radius: 0;
            width: auto;
            height: auto;
          }
          .opcao-item.correto-selected { 
            background: var(--green-50); 
            border-color: var(--green-200); 
            color: var(--green-700); 
            font-weight: 600;
          }
          
          .opcao-item.incorreto-selected .opcao-marker { 
            border-color: var(--red-600); 
            background: var(--red-100);
            box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.15);
          }
          .opcao-item.incorreto-selected .opcao-marker::after { 
            content: "✗";
            font-size: 13px;
            color: var(--red-700);
            position: absolute;
            font-weight: 700;
            background: transparent;
            border-radius: 0;
            width: auto;
            height: auto;
          }
          .opcao-item.incorreto-selected { 
            background: var(--red-50); 
            border-color: var(--red-200); 
            color: var(--red-700); 
          }
          
          .opcao-item.correto-unselected .opcao-marker { 
            border-color: var(--green-600); 
            border-style: dashed; 
            background: var(--green-50);
          }
          .opcao-item.correto-unselected { 
            color: var(--green-600); 
            font-weight: 500; 
            font-style: italic; 
            background: var(--green-50); 
            border-color: var(--green-200); 
            border-style: dashed;
          }

          /* Mídia (QR codes) */
          .midia-box {
            margin: 16px 0 16px 48px;
            display: inline-flex;
            align-items: center;
            gap: 16px;
            background: var(--slate-50);
            padding: 12px 16px;
            border-radius: var(--radius-md);
            border: 1px solid var(--slate-200);
            max-width: calc(100% - 48px);
            box-shadow: var(--shadow-xs);
          }
          
          .midia-box.is-audio-answer {
            background: var(--blue-50);
            border-color: var(--blue-100);
          }
          
          .qr-code {
            width: 64px;
            height: 64px;
            border-radius: 8px;
            padding: 3px;
            background: white;
            border: 1px solid var(--slate-200);
            flex-shrink: 0;
          }
          
          .qr-content {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          
          .qr-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--slate-900);
          }
          
          .qr-desc {
            font-size: 12px;
            color: var(--slate-500);
            line-height: 1.4;
          }

          .media-image-container {
            margin: 16px 0 16px 48px;
            border-radius: var(--radius-md);
            overflow: hidden;
            border: 1px solid var(--slate-200);
            display: inline-block;
            max-width: calc(100% - 48px);
            background: var(--slate-50);
            padding: 5px;
            box-shadow: var(--shadow-xs);
          }
          
          .media-image-container img { 
            display: block;
            max-width: 100%; 
            max-height: 350px; 
            object-fit: contain; 
            border-radius: 6px;
          }

          .linhas-container {
            margin: 24px 0 24px 48px;
            display: flex;
            flex-direction: column;
            gap: 32px;
          }
          
          .linha-write {
            border-bottom: 1px solid var(--slate-300);
            width: 100%;
            height: 1px;
          }
          
          .texto-livre-resposta {
            margin: 24px 0 20px 48px;
            padding: 14px 20px;
            background: var(--slate-50);
            border: 1px solid var(--slate-200);
            border-radius: var(--radius-md);
            font-size: 15px;
            color: var(--slate-800);
            white-space: pre-wrap;
            line-height: 1.6;
          }

          /* Ordenação */
          .ordenacao-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 16px 0 16px 48px;
          }
          
          .ordenacao-tag {
            padding: 8px 16px;
            border: 1px solid var(--slate-300);
            border-radius: 20px;
            font-weight: 500;
            background: white;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: var(--shadow-xs);
          }
          
          .ordenacao-pos {
            background: var(--slate-100);
            color: var(--slate-600);
            font-size: 12px;
            font-weight: 700;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }

          .ordenacao-tag.correto {
            border-color: var(--green-500);
            background: var(--green-50);
            color: var(--green-700);
            box-shadow: 0 2px 6px rgba(22,163,74,0.15);
          }
          .ordenacao-tag.correto .ordenacao-pos { background: var(--green-100); color: var(--green-700); }
          
          .ordenacao-tag.incorreto {
            border-color: var(--red-500);
            background: var(--red-50);
            color: var(--red-700);
          }
          .ordenacao-tag.incorreto .ordenacao-pos { background: var(--red-100); color: var(--red-700); }

          /* Feedback por questão */
          .feedback-questao {
            margin: 18px 0 0 48px;
            padding: 14px 20px;
            background: var(--amber-50);
            border-left: 4px solid var(--amber-500);
            border-radius: 0 var(--radius-md) var(--radius-md) 0;
            font-size: 14px;
            color: var(--amber-700);
            line-height: 1.6;
            box-shadow: var(--shadow-xs);
            display: flex;
            gap: 10px;
          }
          
          .feedback-questao::before {
            content: "💬";
            font-size: 16px;
            margin-top: 2px;
          }
          
          .feedback-questao-content {
            flex: 1;
          }
          
          .feedback-questao-title {
            display: block;
            margin-bottom: 6px;
            text-transform: uppercase;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.05em;
            color: var(--amber-700);
          }

          .feedback-geral {
            margin-top: 48px;
            padding: 24px 28px;
            background: var(--blue-50);
            border: 1px solid var(--blue-100);
            border-top: 4px solid var(--blue-500);
            border-radius: var(--radius-lg);
            page-break-inside: avoid;
            box-shadow: var(--shadow-md);
            position: relative;
          }
          
          .feedback-geral::before {
            content: "✏️";
            font-size: 20px;
            position: absolute;
            top: -14px;
            left: 24px;
            background: white;
            padding: 0 8px;
          }
          
          .feedback-geral-title {
            font-size: 18px;
            font-weight: 800;
            color: var(--slate-900);
            margin: 0 0 12px 0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .feedback-geral-content {
            font-size: 15px;
            color: var(--slate-700);
            white-space: pre-wrap;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="header-title">${titulo || 'Avaliação sem título'}</h1>
          ${descricao ? `<p class="header-desc">${descricao}</p>` : ''}
        </div>
        
        <div class="info-wrapper">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Nome do Aluno</span>
              <span class="info-value">${isFilled && alunoNome ? alunoNome : ''}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Data</span>
              <span class="info-value">${isFilled ? currentDate : ''}</span>
            </div>
          </div>

          ${isFilled && notaTotal !== undefined && pontosMax !== undefined ? `
            <div class="grade-box">
              <span class="info-label">Nota Total</span>
              <div class="grade-circle" style="--percent: ${(notaTotal/(pontosMax || 1))*100};">
                <div class="grade-inner" style="font-size: ${(() => { const s = parseFloat(notaTotal.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); return s.length <= 4 ? '16px' : s.length <= 6 ? '13px' : '11px'; })()}">${parseFloat(notaTotal.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
              </div>
              <div class="grade-max">de ${pontosMax} pontos</div>
            </div>
          ` : ''}
        </div>
  `;

  estrutura.questoes.forEach((q, index) => {
    let globalLacunaIndex = 0;
    const respAluno = isFilled && respostas ? respostas[q.id] : undefined;
    const corrQuestao = isFilled && correcao ? correcao[q.id] : undefined;

    const getDynamicLacunaLine = () => {
      let maxLen = 0;
      let userVal = '';
      let isCorrect = false;

      if (q.tipo === 'preencher_lacunas') {
        const qLacuna = q as { respostas_corretas_por_lacuna?: Record<string, string[]> };
        const key = `lacuna_${globalLacunaIndex}`;
        const corretas = qLacuna.respostas_corretas_por_lacuna?.[key] || [];
        
        corretas.forEach((r: string) => {
          if (r.length > maxLen) maxLen = r.length;
        });

        if (isFilled && respAluno?.mapa_lacunas) {
          userVal = respAluno.mapa_lacunas[key] || '';
          isCorrect = corretas.some(a => a.toLowerCase().trim() === userVal.toLowerCase().trim());
        }
      }
      globalLacunaIndex++;
      
      if (isFilled) {
        // Se a questão for parcial, não colore as lacunas (o prof explicará no feedback)
        const isQuestaoCorreta = corrQuestao && corrQuestao.status === 'correto';
        const isQuestaoParcial = corrQuestao && corrQuestao.status === 'parcial';

        if (userVal === '') {
          return `<span class="lacuna-inline vazia">___</span>`;
        }
        if (isQuestaoParcial) {
          return `<span class="lacuna-inline">${userVal}</span>`;
        }
        const effectiveCorrect = isQuestaoCorreta ? true : isCorrect;
        const statusClass = effectiveCorrect ? 'correto' : 'incorreto';
        return `<span class="lacuna-inline ${statusClass}">${userVal}</span>`;
      }

      // Modo de impressão em branco
      const chars = Math.max(12, Math.ceil(maxLen * 2)); 
      const finalChars = Math.min(45, chars);
      return `<span class="lacuna-inline vazia" style="width: ${finalChars * 8}px;">_</span>`;
    };

    let statusBadgeHtml = '';
    if (isFilled && corrQuestao) {
      const pts = corrQuestao.pontos_obtidos;
      const max = q.pontuacao_maxima;
      const ptsLabel = pts < max ? `${pts} / ${max} pts` : `${pts} pts`;
      statusBadgeHtml = `
        <div class="status-wrapper">
          <span class="status-badge status-${corrQuestao.status}">${corrQuestao.status} (${ptsLabel})</span>
        </div>
      `;
    }

    html += `<div class="questao">`;
    let enunciadoText = q.enunciado || '';
    enunciadoText = enunciadoText.replace(/\[[_ Xx]*\]/g, () => getDynamicLacunaLine());
    
    html += `
      <div class="enunciado-container">
        <div class="q-num">${index + 1}</div>
        <div class="q-content">
          <div class="enunciado-text">
            ${enunciadoText}
          </div>
          ${statusBadgeHtml}
        </div>
      </div>
    `;

    if (q.tipo === 'preencher_lacunas') {
      const qLacuna = q as { texto_com_lacunas?: string };
      if (qLacuna.texto_com_lacunas) {
        const textoLacunas = qLacuna.texto_com_lacunas.replace(/\[[_ Xx]*\]/g, () => getDynamicLacunaLine());
        html += `<div class="enunciado-text" style="margin-left: 48px; margin-bottom: 16px;">${textoLacunas}</div>`;
      }
    }
    
    if (q.midia_anexa && q.midia_anexa.url) {
      if (q.midia_anexa.tipo === 'imagem') {
        html += `
          <div class="media-image-container">
            <img src="${q.midia_anexa.url}" alt="Imagem da questão" />
          </div>
        `;
      } else if (q.midia_anexa.tipo === 'audio' || q.midia_anexa.tipo === 'video') {
        html += `
          <div class="midia-box">
            <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(q.midia_anexa.url)}" alt="QR Code" />
            <div class="qr-content">
              <span class="qr-title">Reproduzir ${q.midia_anexa.tipo === 'audio' ? 'Áudio' : 'Vídeo'}</span>
              <span class="qr-desc">Escaneie o QR Code para acessar a mídia no seu dispositivo.</span>
            </div>
          </div>
        `;
      }
    }

    if (q.tipo === 'multipla_escolha') {
      html += `<ul class="opcoes">`;
      const isMultiple = q.permite_multiplas_respostas;
      const selectedIds = new Set(respAluno?.opcao_ids || []);
      const correctIds = new Set(q.respostas_corretas_ids || []);

      q.opcoes?.forEach(op => {
        let itemClass = '';
        const isChecked = isFilled && selectedIds.has(op.id);
        
        if (isFilled) {
          if (correctIds.has(op.id) && selectedIds.has(op.id)) itemClass = 'correto-selected checked';
          else if (!correctIds.has(op.id) && selectedIds.has(op.id)) itemClass = 'incorreto-selected checked';
          else if (correctIds.has(op.id) && !selectedIds.has(op.id)) itemClass = 'correto-unselected';
          else if (selectedIds.has(op.id)) itemClass = 'checked';
        } else if (isChecked) {
          itemClass = 'checked';
        }

        html += `
          <li class="opcao-item ${itemClass}">
            <div class="opcao-marker ${isMultiple ? 'square' : 'circle'}"></div>
            <div>${op.texto_simples || op.id}</div>
          </li>
        `;
      });
      html += `</ul>`;
    } else if (q.tipo === 'texto_livre') {
      if (isFilled) {
        html += `<div class="texto-livre-resposta">${respAluno?.texto || '<span style="color: var(--slate-400); font-style: italic;">Não respondido.</span>'}</div>`;
      } else {
        html += `
          <div class="linhas-container">
            <div class="linha-write"></div>
            <div class="linha-write"></div>
            <div class="linha-write"></div>
            <div class="linha-write"></div>
          </div>
        `;
      }
    } else if (q.tipo === 'audio_upload') {
      if (isFilled) {
        if (respAluno?.midia_url) {
          html += `
            <div class="midia-box is-audio-answer">
              <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(respAluno.midia_url)}" alt="QR Code Resposta" />
              <div class="qr-content">
                <span class="qr-title">Resposta em Áudio</span>
                <span class="qr-desc">Escaneie o QR Code para ouvir a resposta do aluno.</span>
              </div>
            </div>
          `;
        } else {
          html += `<div class="texto-livre-resposta"><span style="color: var(--slate-400); font-style: italic;">Não respondido em áudio.</span></div>`;
        }
      } else {
        html += `
          <div class="linhas-container" style="gap: 28px; margin-bottom: 12px;">
            <div class="linha-write"></div>
            <div class="linha-write"></div>
            <div class="linha-write"></div>
          </div>
          <div style="font-size: 13px; color: var(--slate-500); font-style: italic; margin-left: 48px;">
            (Grave seu áudio e envie pela plataforma. Use o espaço acima para rascunho, se necessário.)
          </div>
        `;
      }
    } else if (q.tipo === 'ordenacao') {
      if (isFilled) {
        html += `<div class="ordenacao-tags">`;
        const ids = respAluno?.opcao_ids || [];
        const correctIds = q.ordem_correta_ids || [];
        
        if (ids.length === 0) {
           html += `<span style="color: var(--slate-400); font-style: italic; margin-top: 8px;">Não respondido.</span>`;
        } else {
          ids.forEach((id, idx) => {
            const item = q.itens_para_ordenar?.find(it => it.id === id);
            const isCorrect = correctIds[idx] === id;
            const statusClass = isCorrect ? 'correto' : 'incorreto';
            
            html += `
              <div class="ordenacao-tag ${statusClass}">
                <span class="ordenacao-pos">${idx + 1}</span> 
                ${item?.texto_simples || id}
              </div>
            `;
          });
        }
        html += `</div>`;
      } else {
        html += `<div class="ordenacao-tags">`;
        const itens = [...(q.itens_para_ordenar || [])];
        for (let i = itens.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [itens[i], itens[j]] = [itens[j], itens[i]];
        }
        itens.forEach(it => {
          html += `<div class="ordenacao-tag">${it.texto_simples}</div>`;
        });
        html += `</div>
          <div class="linhas-container" style="margin-top: 28px; margin-bottom: 20px;">
            <div class="linha-write"></div>
          </div>
        `;
      }
    }
    
    if (isFilled && corrQuestao?.feedback_professor) {
      html += `
        <div class="feedback-questao">
          <div class="feedback-questao-content">
            <span class="feedback-questao-title">Feedback do Professor</span>
            ${corrQuestao.feedback_professor}
          </div>
        </div>
      `;
    }

    html += `</div>`;
  });

  if (isFilled && feedbackGeral) {
    html += `
      <div class="feedback-geral">
        <h3 class="feedback-geral-title">Feedback Geral do Professor</h3>
        <div class="feedback-geral-content">${feedbackGeral}</div>
      </div>
    `;
  }

  html += `
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 500);
          }
        </script>
      </body>
    </html>
  `;

  newWindow.document.write(html);
  newWindow.document.close();
}