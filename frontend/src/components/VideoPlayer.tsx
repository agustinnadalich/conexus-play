import { useEffect, useRef, useState, useCallback } from "react";
import YouTube from "react-youtube";
import { usePlayback, resolveEventStart } from "@/context/PlaybackContext";
import { Button } from "@/components/ui/button";

const VideoPlayer = (props: any) => {
  const videoUrl = props.videoUrl ?? props.src ?? "";
  const { 
    currentTime, 
    setCurrentTime, setIsPlaying, playFiltered, isPlaying, playNext, playPrev, selectedEvent, playRequestToken, getAdjustedStart } = usePlayback();


  const videoRef = useRef<any>(null);
  const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);
  // PiP simulated state
  const [isPiP, setIsPiP] = useState(false);
  const [pipPos, setPipPos] = useState<{ left: number; top: number }>(() => {
    if (typeof window === 'undefined') return { left: 16, top: 16 };
    return { left: window.innerWidth - 320 - 16, top: window.innerHeight - 180 - 16 };
  });
  const [pipSize, setPipSize] = useState<{ width: number; height: number }>({ width: 320, height: 180 });
  // pipRef removed; use pipingRef for the active player container
  const draggingRef = useRef<{ dragging: boolean; offsetX: number; offsetY: number }>({ dragging: false, offsetX: 0, offsetY: 0 });
  const pipingRef = useRef<HTMLDivElement | null>(null);

  // Reproducir evento específico (incluye token para forzar retry)
  useEffect(() => {
    if (!videoRef.current || !selectedEvent) return;

    const targetTime = getAdjustedStart ? getAdjustedStart(selectedEvent) : resolveEventStart(selectedEvent);
    const player: any = videoRef.current;

    try {
      if (isYouTube) {
        player.seekTo?.(targetTime, true);
        player.playVideo?.();
      } else {
        // Evitar re-seek si ya estamos cerca del target
        if (Math.abs((player.currentTime ?? 0) - targetTime) > 0.35) {
          try {
            player.currentTime = targetTime;
          } catch (_) {}
        }
        const playPromise = player.play?.();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      }
      setCurrentTime(targetTime);
      setIsPlaying(true);
    } catch (err) {
      console.warn("No se pudo saltar al evento seleccionado", err);
    }
  }, [selectedEvent, isYouTube, setCurrentTime, setIsPlaying, playRequestToken, getAdjustedStart, videoUrl]);

  // Manejar reproducción/pausa
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      if (isYouTube) {
        videoRef.current.playVideo();
      } else {
        videoRef.current.play();
      }
    } else {
      if (isYouTube) {
        videoRef.current.pauseVideo();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isYouTube]);

  // Cleanup on unmount: remove any window listeners (defensive)
  useEffect(() => {
    return () => {
      window.onmousemove = null;
      window.onmouseup = null;
      window.ontouchmove = null;
      window.ontouchend = null;
    };
  }, []);

  // Actualizar el tiempo actual
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const newTime = isYouTube
      ? videoRef.current.getCurrentTime()
      : videoRef.current.currentTime;



    if (Math.abs(newTime - currentTime) > 0.3) {
      setCurrentTime(newTime);
    }
  };

  // Polling para mantener currentTime actualizado mientras se reproduce
  useEffect(() => {
    let timer: number | null = null;
    // Solo iniciar polling si hay un player y está reproduciendo
    if (isPlaying && videoRef.current) {
      // Para YouTube necesitamos consultar getCurrentTime() periódicamente
      timer = window.setInterval(() => {
        try {
          handleTimeUpdate();
        } catch (e) {
          // ignore
        }
      }, 250);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [isPlaying, isYouTube]);

    // Manejar reproducción/pausa
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isYouTube) {
      const playerState = videoRef.current.getPlayerState();
      if (playerState === 1) {
        videoRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        videoRef.current.playVideo();
        setIsPlaying(true);
      }
    } else {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // PiP drag handlers
  const onPipMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = (e as React.MouseEvent).clientX ?? (e as React.TouchEvent).touches[0].clientX;
    const clientY = (e as React.MouseEvent).clientY ?? (e as React.TouchEvent).touches[0].clientY;
  const rect = pipingRef.current?.getBoundingClientRect();
    if (!rect) return;
    draggingRef.current = { dragging: true, offsetX: clientX - rect.left, offsetY: clientY - rect.top };

    window.onmousemove = (ev: MouseEvent) => {
      if (!draggingRef.current.dragging) return;
      setPipPos({ left: ev.clientX - draggingRef.current.offsetX, top: ev.clientY - draggingRef.current.offsetY });
    };
    window.onmouseup = () => {
      draggingRef.current.dragging = false;
      window.onmousemove = null;
      window.onmouseup = null;
    };
    // touch
    window.ontouchmove = (tev: TouchEvent) => {
      if (!draggingRef.current.dragging) return;
      const t = tev.touches[0];
      setPipPos({ left: t.clientX - draggingRef.current.offsetX, top: t.clientY - draggingRef.current.offsetY });
    };
    window.ontouchend = () => {
      draggingRef.current.dragging = false;
      window.ontouchmove = null;
      window.ontouchend = null;
    };
  };

  const togglePiP = useCallback(() => setIsPiP((v) => !v), []);
  const closePiP = useCallback(() => setIsPiP(false), []);
  const togglePipSize = useCallback(() => {
    setPipSize((s) => (s.width === 320 ? { width: 480, height: 270 } : { width: 320, height: 180 }));
  }, []);


  return (
    <div className="w-full" style={{ maxWidth: '100%', margin: '0 auto' }}>
      {/* Unified player: either inline responsive or fixed PiP floating */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        ref={pipingRef}
        style={isPiP ? {
          position: 'fixed',
          left: Math.max(8, Math.min(pipPos.left, window.innerWidth - pipSize.width - 8)),
          top: Math.max(8, Math.min(pipPos.top, window.innerHeight - pipSize.height - 8)),
          width: pipSize.width,
          height: pipSize.height,
          zIndex: 9999,
          background: '#000',
          borderRadius: 8,
          boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
          overflow: 'hidden',
  } : { position: 'relative', width: '100%', maxWidth: 'calc(500px * (16/9))', maxHeight: 500, aspectRatio: '16/9' }}
        className={isPiP ? 'rounded shadow' : 'rounded shadow overflow-hidden'}
        onMouseDown={isPiP ? onPipMouseDown : undefined}
        onTouchStart={isPiP ? onPipMouseDown : undefined}
      >
        {/* controls overlay for PiP */}
        {isPiP && (
          <div style={{ position: 'absolute', right: 6, top: 6, zIndex: 10000, display: 'flex', gap: 6 }}>
            <button onClick={togglePipSize} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', padding: '4px 6px', borderRadius: 4 }}>⤡</button>
            <button onClick={closePiP} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', padding: '4px 6px', borderRadius: 4 }}>✕</button>
          </div>
        )}
        {/* single player instance */}
        {isYouTube ? (
          <YouTube
            videoId={videoUrl.split('v=')[1]?.split('&')[0]}
            onReady={(e) => (videoRef.current = e.target)}
            onStateChange={(e: any) => {
            // e.data: -1(unstarted),0(ended),1(playing),2(paused),3(buffering),5(video cued)
            const state = e.data;
            if (state === 1) {
              setIsPlaying(true);
            } else if (state === 2 || state === 0) {
              setIsPlaying(false);
            }
            // Actualizar tiempo una vez por cambio de estado
            try {
              handleTimeUpdate();
            } catch (err) {
                // noop
              }
            }}
            opts={{ playerVars: { autoplay: 0, controls: 1 } }}
            className='w-full h-full'
            iframeClassName={isPiP ? 'absolute top-0 left-0 w-full h-full' : 'w-full h-full'}
          />
        ) : videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className={isPiP ? 'w-full h-full object-cover' : 'w-full h-full object-contain'}
            onTimeUpdate={handleTimeUpdate}
            onEnded={playNext} // Reproducir el siguiente evento al terminar
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 rounded shadow flex items-center justify-center">
            <p className="text-gray-500">No video available</p>
          </div>
        )}
    </div>
    </div>
      <div className="flex gap-2 mt-2 items-center">
        {/* Botón de play/pausa removido para evitar inconsistencias de estado */}
        {/* <Button onClick={handlePlayPause}>{isPlaying ? "⏸" : "▶️"}</Button> */}
        <Button onClick={playFiltered} > ▶️ Filtrados </Button>
        <Button onClick={playPrev}> ⏮ </Button>
        <Button onClick={playNext}> ⏭ </Button>
        <Button onClick={togglePiP}>{isPiP ? '⤫ PiP' : '⤢ PiP'}</Button>
      </div>
      {/* PiP handled in unified player above */}
    </div>
  );
};

export default VideoPlayer;
