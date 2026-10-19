'use client';

import { useState } from 'react';
import { ImageIcon, Volume2, Film, Maximize2, X } from 'lucide-react';
import YouTubePlayer, { getYouTubeId } from '../../../../components/YouTubePlayer';

interface MediaDisplayProps {
  tipo: 'imagem' | 'audio' | 'video';
  url: string;
  id?: string; // ID opcional para persistência de progresso (ex: id da questão ou atividade)
}

export default function MediaDisplay({ tipo, url, id }: MediaDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!url) return null;

  if (tipo === 'imagem') {
    return (
      <>
        <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Mídia da questão"
            className="w-full max-h-64 object-contain cursor-pointer transition-transform group-hover:scale-[1.02]"
            onClick={() => setIsFullscreen(true)}
          />
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Fullscreen overlay */}
        {isFullscreen && (
          <div
            className="fixed inset-0 z-100 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Mídia da questão em tela cheia"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  if (tipo === 'audio') {
    return (
      <div className="flex items-center gap-3 bg-linear-to-r from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200">
        <div className="bg-tcm-red/10 p-2.5 rounded-xl shrink-0">
          <Volume2 className="w-5 h-5 text-tcm-red" />
        </div>
        <audio
          controls
          src={url}
          className="w-full h-10 [&::-webkit-media-controls-panel]:bg-transparent"
          preload="metadata"
        />
      </div>
    );
  }

  if (tipo === 'video') {
    const ytId = getYouTubeId(url);
    if (ytId) {
      return (
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-black">
          <YouTubePlayer 
            videoId={ytId} 
            videoUrl={url} 
            aulaId={id || ytId} 
          />
        </div>
      );
    }

    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-black">
        <video controls src={url} className="w-full max-h-80" preload="metadata">
          Seu navegador não suporta vídeo.
        </video>
      </div>
    );
  }

  // Fallback icon
  const FallbackIcon = tipo === 'imagem' ? ImageIcon : tipo === 'audio' ? Volume2 : Film;
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
      <FallbackIcon className="w-5 h-5 text-slate-400" />
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-tcm-red font-medium hover:underline">
        Abrir mídia
      </a>
    </div>
  );
}
