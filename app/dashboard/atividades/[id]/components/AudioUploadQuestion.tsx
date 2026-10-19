'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { QuestaoAudio, RespostaAluno } from '../../../../../types/atividades';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Mic, Square, Upload, Loader2, Play, Pause, Trash2 } from 'lucide-react';
import { buildAlunoAudioPath } from '../../../../../lib/storageUtils';
import { normalizeDemoStorageUrl } from '@/lib/demo/supabaseSandbox';

interface Props {
  questao: QuestaoAudio;
  resposta: RespostaAluno;
  onAnswer: (r: RespostaAluno) => void;
  tituloAtividade: string;
  questaoIndex: number;
}

export default function AudioUploadQuestion({ questao, resposta, onAnswer, tituloAtividade, questaoIndex }: Props) {
  const supabase = createClientComponentClient();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tempoMax = questao.tempo_maximo_segundos || 120;
  const hasAudio = !!resposta.midia_url;

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
  }, []);

  const uploadBlob = async (blob: Blob) => {
    try {
      setIsUploading(true);

      // Resolve student name fresh at upload time — avoids ALL prop/timing issues.
      // auth.getUser() is cached by the Supabase client so no extra network round-trip.
      const { data: { user } } = await supabase.auth.getUser();
      let nomeAluno = 'aluno';
      if (user?.id) {
        const { data: profile } = await supabase
          .from('alunos')
          .select('nome')
          .eq('id', user.id)
          .single();
        if (profile?.nome) nomeAluno = profile.nome;
      }

      const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
      const path = buildAlunoAudioPath({ tituloAtividade, nomeAluno, questaoIndex, ext });

      const { error } = await supabase.storage.from('atvdd_alunos').upload(path, blob);
      if (error) throw error;

      const { data } = supabase.storage.from('atvdd_alunos').getPublicUrl(path);
      onAnswer({ ...resposta, midia_url: normalizeDemoStorageUrl(data.publicUrl) });
    } catch {
      alert('Erro ao enviar áudio.');
    } finally {
      setIsUploading(false);
    }
  };

  const stopRec = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false); setRecTime(0);
  }, []);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); uploadBlob(new Blob(chunksRef.current, { type: 'audio/webm' })); };
      mr.start(); setIsRecording(true); setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(p => { if (p + 1 >= tempoMax) { stopRec(); return 0; } return p + 1; }), 1000);
    } catch { alert('Permissão de microfone negada.'); }
  };

  if (hasAudio) return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gravação de Áudio</p>
      <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
        <button onClick={() => { if (!audioRef.current) return; if (isPlaying) audioRef.current.pause(); else { audioRef.current.src = resposta.midia_url!; audioRef.current.play(); } setIsPlaying(!isPlaying); }} className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl transition-colors">
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <div className="flex-1"><p className="text-sm font-bold text-emerald-800">Áudio gravado ✓</p><p className="text-xs text-emerald-600">Clique para ouvir</p></div>
        <button onClick={() => { onAnswer({ ...resposta, midia_url: undefined }); setIsPlaying(false); }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 className="w-5 h-5" /></button>
      </div>
    </div>
  );

  if (isUploading) return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gravação de Áudio</p>
      <div className="flex items-center gap-3 bg-slate-50 border-2 border-slate-200 rounded-xl p-6 justify-center">
        <Loader2 className="w-6 h-6 text-tcm-red animate-spin" /><p className="text-sm font-medium text-slate-600">Enviando...</p>
      </div>
    </div>
  );

  if (isRecording) return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gravação de Áudio</p>
      <div className="flex items-center justify-center gap-4 bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
        <div className="text-center"><p className="text-lg font-bold text-red-700 tabular-nums">{Math.floor(recTime/60)}:{String(recTime%60).padStart(2,'0')}</p><p className="text-xs text-red-500">Gravando...</p></div>
      </div>
      <div className="w-full bg-red-100 rounded-full h-2"><div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(recTime/tempoMax)*100}%` }} /></div>
      <button onClick={stopRec} className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"><Square className="w-4 h-4" />Parar</button>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gravação de Áudio {tempoMax && `(máx: ${tempoMax}s)`}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={startRec} className="flex-1 flex items-center justify-center gap-3 py-4 bg-tcm-red hover:bg-tcm-dark-red text-white rounded-xl font-bold transition-colors shadow-sm">
          <Mic className="w-5 h-5" />Gravar
        </button>
        <label className="flex-1 flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-200 hover:border-tcm-red text-slate-700 rounded-xl font-bold transition-colors cursor-pointer">
          <Upload className="w-5 h-5" />Enviar Arquivo
          <input type="file" accept="audio/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadBlob(f); }} />
        </label>
      </div>
    </div>
  );
}
