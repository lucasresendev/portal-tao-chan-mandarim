'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import YouTube from 'react-youtube';
import Image from 'next/image';
import { 
    Play, Pause, Volume2, VolumeX, Loader2, ExternalLink,
    RotateCcw, RotateCw, Maximize, Minimize, Volume1, Settings
} from 'lucide-react';

// ==========================================
// TIPAGENS
// ==========================================
interface YouTubePlayerProps {
    videoId: string;
    aulaId: string;
    videoUrl: string;
}

interface YTPlayer {
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getVideoLoadedFraction: () => number;
    mute: () => void;
    unMute: () => void;
    isMuted: () => boolean;
    setVolume: (volume: number) => void;
    getVolume: () => number;
    setPlaybackQuality: (suggestedQuality: string) => void;
    getAvailableQualityLevels: () => string[];
    getPlaybackQuality: () => string;
}

interface ScreenOrientationWithLock extends ScreenOrientation {
    lock: (orientation: 'any' | 'natural' | 'landscape' | 'portrait' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary') => Promise<void>;
    unlock: () => void;
}

// ==========================================
// HELPERS
// ==========================================
export const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function YouTubePlayer({ videoId, aulaId, videoUrl }: YouTubePlayerProps) {
    // Estados do Player
    const [showPlayer, setShowPlayer] = useState(false);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isEnded, setIsEnded] = useState(false);
    
    // Dispositivo
    const [isMobile, setIsMobile] = useState(false);
    
    // Fallback de Thumbnails
    const [thumbUrl, setThumbUrl] = useState(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
    
    // Estados de Tempo e Progresso
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [savedTime, setSavedTime] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Estados de Controles e Qualidade
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [qualities, setQualities] = useState<string[]>([]);
    const [currentQuality, setCurrentQuality] = useState<string>('highres');
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    
    // Refs
    const playerRef = useRef<YTPlayer | null>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const lastSavedTimeRef = useRef<number>(0);
    const lastTapRef = useRef<{ time: number, side: 'left' | 'right' | null }>({ time: 0, side: null });
    const touchStartYRef = useRef<number>(0);
    const currentQualityRef = useRef<string>('highres'); 

    // Detectar Mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Carregar progresso e qualidade salvos
    useEffect(() => {
        const storedTime = localStorage.getItem(`lesson_progress_${aulaId}`);
        const storedQuality = localStorage.getItem('tcm_youtube_quality');

        const timer = setTimeout(() => {
            if (storedTime) setSavedTime(storedTime);
            if (storedQuality) {
                setCurrentQuality(storedQuality);
                currentQualityRef.current = storedQuality;
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [aulaId]);

    // Limpeza de timeout
    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, []);

    const startControlsTimeout = useCallback(() => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (!isEnded && !showQualityMenu) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, isMobile ? 3000 : 2000);
        }
    }, [isMobile, isEnded, showQualityMenu]);

    const handleInteraction = useCallback(() => {
        if (isMobile) return; 
        setShowControls(true);
        startControlsTimeout();
    }, [isMobile, startControlsTimeout]);

    const togglePlay = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        if (!playerRef.current) return;
        
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            setIsBuffering(true);
            setIsEnded(false);
            playerRef.current.playVideo();
        }
        setShowControls(true);
        startControlsTimeout();
    }, [isPlaying, startControlsTimeout]);

    const toggleMute = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute();
            setVolume(playerRef.current.getVolume() || 100);
        } else {
            playerRef.current.mute();
            setVolume(0);
        }
        setIsMuted(!isMuted);
        startControlsTimeout();
    }, [isMuted, startControlsTimeout]);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseInt(e.target.value);
        setVolume(newVolume);
        if (!playerRef.current) return;
        
        playerRef.current.setVolume(newVolume);
        if (newVolume === 0) {
            playerRef.current.mute();
            setIsMuted(true);
        } else if (isMuted) {
            playerRef.current.unMute();
            setIsMuted(false);
        }
        startControlsTimeout();
    };

    const handleQualityChange = (quality: string) => {
        if (!playerRef.current) return;
        
        playerRef.current.setPlaybackQuality(quality);
        const time = playerRef.current.getCurrentTime();
        playerRef.current.seekTo(time, true);

        setCurrentQuality(quality);
        currentQualityRef.current = quality;
        localStorage.setItem('tcm_youtube_quality', quality);
        setShowQualityMenu(false);
        startControlsTimeout();
    };

    const toggleFullscreen = useCallback(async (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.preventDefault();
        try {
            if (!document.fullscreenElement) {
                if (playerContainerRef.current) {
                    await playerContainerRef.current.requestFullscreen();
                    const screenOrientation = window.screen.orientation as ScreenOrientationWithLock;
                    if (isMobile && screenOrientation?.lock) {
                        try {
                            await screenOrientation.lock('landscape');
                        } catch (orientationError) {
                            console.warn("Navegador não suporta forçar rotação ou foi bloqueado:", orientationError);
                        }
                    }
                }
            } else {
                await document.exitFullscreen();
            }
        } catch (err: unknown) {
            console.error(`Erro ao alternar tela cheia: ${err instanceof Error ? err.message : String(err)}`);
        }
        startControlsTimeout();
    }, [isMobile, startControlsTimeout]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            const screenOrientation = window.screen.orientation as ScreenOrientationWithLock;
            if (!isFull && screenOrientation?.unlock) {
                try {
                    screenOrientation.unlock();
                } catch (e) {
                    console.warn("Erro ao destravar a orientação:", e);
                }
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!showPlayer || !playerRef.current) return;
        if ([' ', 'ArrowLeft', 'ArrowRight', 'f', 'm', 'k', 'j', 'l'].includes(e.key)) {
            e.preventDefault();
        }
        handleInteraction();
        switch(e.key.toLowerCase()) {
            case ' ':
            case 'k': togglePlay(); break;
            case 'arrowleft':
            case 'j': rewind(); break;
            case 'arrowright':
            case 'l': fastForward(); break;
            case 'm': toggleMute(); break;
            case 'f': toggleFullscreen(); break;
        }
    };

    const forceQuality = (player: YTPlayer) => {
        if (player && typeof player.setPlaybackQuality === 'function') {
            player.setPlaybackQuality(currentQualityRef.current);
        }
    };

    const onReady = (event: { target: YTPlayer }) => {
        playerRef.current = event.target;
        setIsIframeLoaded(true);
        
        const vidDuration = event.target.getDuration();
        setDuration(vidDuration);
        setVolume(event.target.getVolume());
        
        const savedQ = localStorage.getItem('tcm_youtube_quality');
        if (savedQ) {
            setCurrentQuality(savedQ);
            currentQualityRef.current = savedQ;
            event.target.setPlaybackQuality(savedQ);
        } else {
            forceQuality(event.target);
        }

        playerContainerRef.current?.focus();
        
        if (savedTime && parseFloat(savedTime) > 0) {
            const timeToSeek = parseFloat(savedTime);
            if (vidDuration > 0 && (vidDuration - timeToSeek) <= 10) {
                localStorage.removeItem(`lesson_progress_${aulaId}`);
                setSavedTime(null);
            } else {
                setTimeout(() => {
                    event.target.seekTo(timeToSeek, true);
                }, 300);
            }
        }
    };

    const onStateChange = (event: { data: number; target: YTPlayer }) => {
        const newState = event.data;
        setIsPlaying(newState === 1);
        
        if (newState === 1 || newState === 2 || newState === 0) {
            setIsBuffering(false);
        } else if (newState === 3) {
            setIsBuffering(true);
        }

        if (newState === 0) setIsEnded(true);
        
        if (newState === 1) { 
            forceQuality(event.target);
            if (!hasStartedPlaying) setHasStartedPlaying(true);
            
            if (event.target.getAvailableQualityLevels) {
                const avail = event.target.getAvailableQualityLevels();
                if (avail && avail.length > 0) setQualities(avail);
            }
        }
        
        if (newState === 1 || newState === 2 || newState === 3) {
            setShowControls(true);
            startControlsTimeout();
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && isPlaying && !isDragging) {
                const time = playerRef.current.getCurrentTime();
                const currentDuration = playerRef.current.getDuration() || duration;
                
                setCurrentTime(time);
                setBuffered(playerRef.current.getVideoLoadedFraction() * 100);
                
                if (currentDuration > 0 && time >= currentDuration - 0.5) {
                    playerRef.current.pauseVideo();
                    setIsEnded(true);
                    setIsPlaying(false);
                    localStorage.removeItem(`lesson_progress_${aulaId}`);
                    return;
                }
                
                if (Math.abs(time - lastSavedTimeRef.current) > 5) {
                    if (currentDuration > 0 && (currentDuration - time) <= 10) {
                        localStorage.removeItem(`lesson_progress_${aulaId}`);
                    } else {
                        localStorage.setItem(`lesson_progress_${aulaId}`, time.toString());
                    }
                    lastSavedTimeRef.current = time;
                }
            }
        }, 400); 
        return () => clearInterval(interval);
    }, [isPlaying, aulaId, isDragging, duration]);

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsDragging(true);
        setCurrentTime(parseFloat(e.target.value));
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };

    const handleSeekCommit = (e: React.MouseEvent | React.TouchEvent) => {
        const time = parseFloat((e.target as HTMLInputElement).value);
        setCurrentTime(time); 
        playerRef.current?.seekTo(time, true);
        setIsDragging(false);
        setIsEnded(false);
        if (isPlaying) setIsBuffering(true);
        startControlsTimeout();
    };

    const fastForward = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        if (playerRef.current) {
            const newTime = playerRef.current.getCurrentTime() + 10;
            setCurrentTime(newTime);
            playerRef.current.seekTo(newTime, true);
            if (isPlaying) setIsBuffering(true);
            startControlsTimeout();
        }
    }, [isPlaying, startControlsTimeout]);

    const rewind = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        if (playerRef.current) {
            const newTime = playerRef.current.getCurrentTime() - 10;
            setCurrentTime(newTime);
            playerRef.current.seekTo(newTime, true);
            if (isPlaying) setIsBuffering(true);
            startControlsTimeout();
        }
    }, [isPlaying, startControlsTimeout]);

    const handleVideoContainerTap = (e: React.MouseEvent | React.TouchEvent, side: 'left' | 'right' | 'center') => {
        e.stopPropagation();
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300; 

        if (isMobile) {
            if (side !== 'center') {
                if (now - lastTapRef.current.time < DOUBLE_TAP_DELAY && lastTapRef.current.side === side) {
                    if (side === 'left') rewind(e); else fastForward(e);
                    lastTapRef.current = { time: 0, side: null }; 
                    setShowControls(true);
                    startControlsTimeout();
                    return;
                }
                lastTapRef.current = { time: now, side };
            }
            if (showControls) {
                setShowControls(false);
                if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            } else {
                setShowControls(true);
                startControlsTimeout();
            }
        } else {
            handleInteraction();
            if (side === 'center') togglePlay();
        }
    };

    const replayVideo = () => {
        if (!playerRef.current) return;
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
        setIsEnded(false);
        setIsBuffering(true);
    };

    const getQualityLabel = (q: string) => {
        const labels: Record<string, string> = {
            highres: 'Máxima', hd1080: '1080p', hd720: '720p',
            large: '480p', medium: '360p', small: '240p', tiny: '144p', auto: 'Automático'
        };
        return labels[q] || q;
    };

    const opts = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1, 
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            autohide: 1, // ADICIONADO: Oculta automaticamente os controles, incluindo o overlay central
            origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
    };

    const showLoadingOverlay = !isIframeLoaded || isBuffering || (!hasStartedPlaying && isIframeLoaded);

    // ==========================================
    // RENDERIZAÇÃO
    // ==========================================
    return (
        <div 
            ref={playerContainerRef}
            tabIndex={0}
            className={`flex flex-col group/player bg-black overflow-hidden shadow-2xl relative outline-none focus-visible:ring-2 focus-visible:ring-tcm-yellow ${(!showControls && isPlaying) ? 'cursor-none' : 'cursor-default'} ${
                isFullscreen ? 'w-full h-full' : 'aspect-video w-full'
            }`}
            onMouseMove={handleInteraction}
            onMouseLeave={() => !isMobile && setShowControls(false)}
            onKeyDown={handleKeyDown}
        >
            {/* THUMBNAIL OVERLAY (Desaparece quando o usuário clica) */}
            {!hasStartedPlaying && (
                <div 
                    onClick={() => setShowPlayer(true)}
                    className={`absolute inset-0 z-50 w-full h-full cursor-pointer group bg-tcm-red overflow-hidden focus-visible:outline-2 focus-visible:outline-tcm-yellow transition-opacity duration-500 ${showPlayer ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setShowPlayer(true)}
                    aria-label="Reproduzir vídeo"
                >
                    <Image 
                        src={thumbUrl} 
                        alt="Thumbnail" 
                        fill
                        sizes="(max-width: 768px) 100vw, 800px"
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-700 group-hover:scale-105" 
                        unoptimized
                        onError={() => setThumbUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)}
                    />
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors duration-500">
                        <div className="flex items-center gap-3 px-6 py-3.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 group-hover:border-tcm-yellow/50 group-hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_40px_rgba(251,191,36,0.15)]">
                            <div className="bg-tcm-yellow/20 rounded-full p-1.5 flex items-center justify-center">
                                <Play className="w-5 h-5 text-tcm-yellow fill-tcm-yellow ml-0.5" />
                            </div>
                            <span className="text-white font-medium tracking-wide pr-2">
                                {savedTime && parseFloat(savedTime) > 5 ? (
                                    <>
                                        Retomar de <span className="text-tcm-yellow font-bold ml-1">{formatTime(parseFloat(savedTime))}</span>
                                    </>
                                ) : (
                                    "Reproduzir vídeo"
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black z-0">
                
                {/* IFRAME WRAPPER - Agora intocável e só aparece quando o vídeo realmente inicia */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[104%] h-[104%] pointer-events-none transition-opacity duration-500 ${hasStartedPlaying && !isEnded ? 'opacity-100' : 'opacity-0'}`}>
                    {showPlayer && (
                        <YouTube 
                            videoId={videoId} 
                            opts={opts} 
                            onReady={onReady} 
                            onStateChange={onStateChange}
                            className="w-full h-full pointer-events-none select-none"
                        />
                    )}
                </div>

                {/* ESCURECIMENTO SUAVE DA TELA (SOMENTE MOBILE) */}
                <div className={`absolute inset-0 bg-black/40 pointer-events-none transition-opacity duration-300 z-10 ${isMobile && showControls && !isEnded ? 'opacity-100' : 'opacity-0'}`} />

                {/* ZONAS DE CLIQUE TRANSPARENTES */}
                <div className="absolute inset-0 z-20 flex touch-manipulation">
                    <div className="w-1/4 h-full" onClick={(e) => handleVideoContainerTap(e, 'left')} />
                    <div className="w-2/4 h-full flex items-center justify-center" onClick={(e) => handleVideoContainerTap(e, 'center')} />
                    <div className="w-1/4 h-full" onClick={(e) => handleVideoContainerTap(e, 'right')} />
                </div>

                {/* OVERLAY MOBILE DE CONTROLES NO CENTRO DA TELA */}
                <div className={`absolute inset-0 flex items-center justify-center gap-6 sm:gap-8 z-30 transition-opacity duration-300 ${isMobile && showControls && !isEnded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); rewind(e); }}
                        className="p-3 sm:p-4 text-white active:scale-95 transition-all focus-visible:outline-tcm-yellow"
                    >
                        <RotateCcw className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); togglePlay(e); }}
                        className="p-5 sm:p-6 text-tcm-yellow active:scale-95 transition-all focus-visible:outline-tcm-yellow"
                    >
                        {isPlaying ? <Pause className="w-10 h-10 sm:w-12 sm:h-12 fill-current drop-shadow-md" /> : <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-current ml-1 drop-shadow-md" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); fastForward(e); }}
                        className="p-3 sm:p-4 text-white active:scale-95 transition-all focus-visible:outline-tcm-yellow"
                    >
                        <RotateCw className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md" />
                    </button>
                </div>

                {/* BOTÃO ASSISTIR NO YOUTUBE (SOMENTE PAUSADO E CONTROLES VISÍVEIS) */}
                {(!isPlaying && hasStartedPlaying && !isEnded && !isBuffering && showControls) && (
                    <div className="absolute top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <a 
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-black/70 hover:bg-black/90 border border-white/10 hover:border-tcm-yellow/40 rounded-xl text-white/90 hover:text-white transition-all shadow-xl backdrop-blur-md group/yt focus-visible:outline-tcm-yellow"
                            title="Assistir no aplicativo ou site do YouTube"
                        >
                            <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase">Ver no YouTube</span>
                            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tcm-yellow group-hover/yt:scale-110 group-hover/yt:-translate-y-0.5 group-hover/yt:translate-x-0.5 transition-transform" />
                        </a>
                    </div>
                )}

                {/* TELA DE CONCLUSÃO */}
                {isEnded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30 animate-in fade-in duration-500 pointer-events-auto">
                        <div className="flex flex-col items-center gap-6 cursor-default">
                            <h3 className="text-white text-xl font-bold tracking-widest">VÍDEO CONCLUÍDO</h3>
                            <button 
                                onClick={replayVideo}
                                className="group cursor-pointer relative flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none"
                            >
                                <div className="w-16 h-16 bg-linear-to-br from-tcm-red to-red-900 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(185,28,28,0.4)] group-hover:shadow-[0_0_40px_rgba(251,191,36,0.4)] border border-tcm-yellow/20">
                                    <RotateCcw className="w-7 h-7 text-tcm-yellow" />
                                </div>
                                <span className="text-tcm-yellow/80 text-sm font-semibold tracking-widest group-hover:text-tcm-yellow">REPETIR</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* LOADING OVERLAY - Agora 100% Preto e opaco para esconder sujeira do YouTube */}
                <div className={`absolute inset-0 flex items-center justify-center bg-black pointer-events-none z-40 ${(showLoadingOverlay && showPlayer) ? 'opacity-100 transition-none' : 'opacity-0 transition-opacity duration-300'}`}>
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-tcm-yellow drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                        <span className="text-tcm-yellow text-xs font-bold tracking-[0.3em] animate-pulse">CARREGANDO</span>
                    </div>
                </div>
            </div>
            
            {/* ========================================== */}
            {/* BARRA INFERIOR DE CONTROLES */}
            {/* ========================================== */}
            <div 
                className={`bg-linear-to-t from-black/95 via-black/70 to-transparent px-3 pt-6 pb-1.5 flex flex-col gap-1 z-40 absolute bottom-0 left-0 w-full transition-all duration-300 ease-out cursor-default ${
                    (showControls && !isEnded && hasStartedPlaying) ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
                }`}
                onClick={(e) => { e.stopPropagation(); if (showQualityMenu) setShowQualityMenu(false); }} 
                onTouchStart={(e) => e.stopPropagation()}
            >
                <div className="relative w-full py-1.5 group/seek flex items-center">
                    <input 
                        type="range"
                        min={0}
                        max={duration || 1}
                        step="any"
                        value={currentTime}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekCommit}
                        onTouchEnd={handleSeekCommit}
                        aria-label="Barra de progresso do vídeo"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 touch-manipulation"
                    />
                    <div className="absolute left-0 right-0 h-1 bg-white/20 rounded-full overflow-hidden transition-all duration-200 group-hover/seek:scale-y-150">
                        <div 
                            className="absolute h-full bg-white/30 transition-all duration-300" 
                            style={{ width: `${buffered}%` }}
                        />
                        <div 
                            className={`absolute inset-y-0 left-0 bg-linear-to-r from-tcm-red to-red-500 shadow-[0_0_8px_rgba(185,28,28,0.8)] ${isDragging ? '' : 'transition-[width] duration-400 ease-linear'}`} 
                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                    </div>
                    <div 
                        className={`absolute w-2.5 h-2.5 bg-tcm-yellow rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)] opacity-0 group-hover/seek:opacity-100 pointer-events-none -translate-x-1/2 ${isDragging ? '' : 'transition-[left] duration-400 ease-linear'}`}
                        style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                </div>

                <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center gap-2 sm:gap-4">
                        
                        <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                            <button onClick={rewind} aria-label="Voltar 10 segundos" className="cursor-pointer text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 focus-visible:outline-tcm-yellow" title="Voltar 10s (J)">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button onClick={togglePlay} aria-label={isPlaying ? "Pausar vídeo" : isEnded ? "Repetir vídeo" : "Reproduzir vídeo"} className="cursor-pointer flex items-center justify-center text-tcm-yellow hover:scale-110 transition-transform active:scale-95 p-1 focus-visible:outline-none" title={isPlaying ? "Pausar (Espaço)" : "Reproduzir (Espaço)"}>
                                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : isEnded ? <RotateCcw className="w-5 h-5 font-bold" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                            </button>
                            <button onClick={fastForward} aria-label="Avançar 10 segundos" className="cursor-pointer text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 focus-visible:outline-tcm-yellow" title="Avançar 10s (L)">
                                <RotateCw className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="hidden sm:block w-px h-4 bg-white/20 mx-1" />
                        
                        <div className="flex items-center gap-3">
                             <div className="hidden sm:flex items-center gap-1 group/volume relative">
                                 <button onClick={toggleMute} aria-label="Mutar vídeo" className="cursor-pointer text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 focus-visible:outline-tcm-yellow" title="Mutar (M)">
                                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-tcm-red" /> : 
                                     volume < 50 ? <Volume1 className="w-4 h-4" /> : 
                                     <Volume2 className="w-4 h-4" />}
                                 </button>
                                 
                                 <div className="w-0 overflow-hidden lg:group-hover/volume:w-16 transition-all duration-300 ease-in-out flex items-center">
                                     <input 
                                         type="range" 
                                         min="0" max="100" 
                                         value={isMuted ? 0 : volume}
                                         onChange={handleVolumeChange}
                                         aria-label="Volume"
                                         className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-tcm-yellow"
                                     />
                                 </div>
                             </div>

                             <div className="text-[10px] sm:text-xs font-mono text-white/60 tracking-tight select-none cursor-default ml-1 sm:ml-0">
                                <span className="text-white font-medium">{formatTime(currentTime)}</span>
                                <span className="mx-1 opacity-40">/</span>
                                <span>{formatTime(duration)}</span>
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="relative">
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setShowQualityMenu(!showQualityMenu);
                                    startControlsTimeout();
                                }}
                                aria-label="Qualidade de vídeo"
                                className={`cursor-pointer text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full focus-visible:outline-tcm-yellow ${showQualityMenu ? 'bg-white/10 text-white' : ''}`}
                                title="Configurações de Qualidade"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                            
                            {showQualityMenu && (
                                isMobile ? (
                                    typeof document !== 'undefined' ? createPortal(
                                        <div className="fixed inset-0 z-99999 flex flex-col justify-end pointer-events-auto cursor-default">
                                            <div 
                                                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                                                onClick={(e) => { e.stopPropagation(); setShowQualityMenu(false); }}
                                            />
                                            <div 
                                                className="relative w-full bg-neutral-900 rounded-t-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 border-t border-white/10"
                                                onClick={(e) => e.stopPropagation()}
                                                onTouchStart={(e) => { 
                                                    e.stopPropagation(); 
                                                    touchStartYRef.current = e.touches[0].clientY; 
                                                }}
                                                onTouchMove={(e) => {
                                                    e.stopPropagation();
                                                    if (touchStartYRef.current > 0 && (e.touches[0].clientY - touchStartYRef.current > 50)) {
                                                        setShowQualityMenu(false);
                                                    }
                                                }}
                                                onTouchEnd={() => { touchStartYRef.current = 0; }}
                                            >
                                                <div className="w-full flex justify-center py-3">
                                                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                                                </div>
                                                <div className="px-6 pb-3 pt-1 text-xs font-bold text-white/50 uppercase tracking-wider border-b border-white/5">
                                                    Qualidade de Vídeo
                                                </div>
                                                <div className="max-h-[60vh] overflow-y-auto pb-6 custom-scrollbar flex flex-col">
                                                    {qualities.length > 0 ? qualities.map(q => (
                                                        <button
                                                            key={q}
                                                            onClick={(e) => { e.stopPropagation(); handleQualityChange(q); }}
                                                            className={`cursor-pointer w-full text-left px-6 py-4 text-sm transition-colors active:bg-white/10 ${currentQuality === q ? 'text-tcm-yellow font-bold bg-white/5' : 'text-white/90'}`}
                                                        >
                                                            {getQualityLabel(q)}
                                                        </button>
                                                    )) : (
                                                        <div className="px-6 py-4 text-sm text-white/50 italic">Indisponível</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>,
                                        document.body
                                    ) : null
                                ) : (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-9998 cursor-default"
                                            onClick={(e) => { e.stopPropagation(); setShowQualityMenu(false); }}
                                        />
                                        <div 
                                            className="absolute bottom-full right-0 mb-3 bg-black/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col min-w-32.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-9999"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/5">
                                                Qualidade
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                {qualities.length > 0 ? qualities.map(q => (
                                                    <button
                                                        key={q}
                                                        onClick={(e) => { e.stopPropagation(); handleQualityChange(q); }}
                                                        className={`cursor-pointer w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-white/10 ${currentQuality === q ? 'text-tcm-yellow font-bold bg-white/5' : 'text-white/80'}`}
                                                    >
                                                        {getQualityLabel(q)}
                                                    </button>
                                                )) : (
                                                    <div className="px-4 py-3 text-xs text-white/50 italic">Indisponível</div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )
                            )}
                        </div>

                        <button 
                            onClick={toggleFullscreen}
                            aria-label={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                            className="cursor-pointer text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full focus-visible:outline-tcm-yellow"
                            title={isFullscreen ? "Sair da Tela Cheia (F)" : "Tela Cheia (F)"}
                        >
                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}