'use client';

import { QuestaoProva, RespostaAluno } from '../../../../../types/atividades';
import QuestionShell from './QuestionShell';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import OrderingQuestion from './OrderingQuestion';
import FreeTextQuestion from './FreeTextQuestion';
import AudioUploadQuestion from './AudioUploadQuestion';
import FillBlanksQuestion from './FillBlanksQuestion';

interface Props {
  questao: QuestaoProva;
  questionNumber: number;
  totalQuestions: number;
  resposta: RespostaAluno;
  onAnswer: (r: RespostaAluno) => void;
  tituloAtividade: string;
  questaoIndex: number;
}

export default function QuestionRenderer({ questao, questionNumber, totalQuestions, resposta, onAnswer, tituloAtividade, questaoIndex }: Props) {
  const renderByType = () => {
    switch (questao.tipo) {
      case 'multipla_escolha':
        return <MultipleChoiceQuestion questao={questao} resposta={resposta} onAnswer={onAnswer} />;
      case 'ordenacao':
        return <OrderingQuestion questao={questao} resposta={resposta} onAnswer={onAnswer} />;
      case 'texto_livre':
        return <FreeTextQuestion questao={questao} resposta={resposta} onAnswer={onAnswer} />;
      case 'audio_upload':
        return (
          <AudioUploadQuestion
            questao={questao}
            resposta={resposta}
            onAnswer={onAnswer}
            tituloAtividade={tituloAtividade}
            questaoIndex={questaoIndex}
          />
        );
      case 'preencher_lacunas':
        return <FillBlanksQuestion questao={questao} resposta={resposta} onAnswer={onAnswer} />;
      default:
        return <p className="text-red-500 text-sm">Tipo de questão não suportado.</p>;
    }
  };

  return (
    <QuestionShell questao={questao} questionNumber={questionNumber} totalQuestions={totalQuestions}>
      {renderByType()}
    </QuestionShell>
  );
}
