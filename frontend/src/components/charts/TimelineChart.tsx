import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useFilterContext } from "@/context/FilterContext";
import { usePlayback } from "@/context/PlaybackContext";
import type { MatchEvent } from "@/types";
import { Button } from "@/components/ui/button";

const secondsToGameClock = (sec: number): string => {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const TooltipContent = React.memo(({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    const event = payload[0].payload;
    const matchLabel = event.match_label || [event.match_team, event.match_opponent].filter(Boolean).join(" vs ");

    // Obtener información del jugador (omitir placeholders como 'unknown')
    let playerInfo: string | null = null;
    const placeholderNames = new Set(['unknown', 'Unknown', 'UNKNOWN', 'N/A', 'n/a', 'None', 'null']);
    
    // Prioridad 1: event.players (array desde API base_de_datos)
    let rawPlayer = null;
    if (event.players && Array.isArray(event.players)) {
      rawPlayer = event.players;
    } else {
      // Prioridad 2-4: campos legacy
      rawPlayer = event.extra_data?.JUGADOR ?? event.player_name ?? event.player ?? null;
    }
    
    if (rawPlayer) {
      if (Array.isArray(rawPlayer)) {
        const joined = rawPlayer.join(', ');
        playerInfo = placeholderNames.has(joined) ? null : joined;
      } else {
        const s = String(rawPlayer).trim();
        playerInfo = placeholderNames.has(s) ? null : s;
      }
    }

    // Campos calculados importantes (mostrar siempre)
    const gameTime = event.extra_data?.Game_Time || event.Game_Time || 'N/A';
    const period = event.extra_data?.DETECTED_PERIOD || event.period || 'N/A';
    const timeGroup = event.extra_data?.Time_Group || 'N/A';
    
    // Obtener TODOS los descriptores del extra_data
    const otherDescriptors: string[] = [];
    // Solo excluir campos técnicos internos, NO los descriptores del juego
    const excludedKeysList = [
      'JUGADOR', 'PLAYER', 'PLAYERS', 'duration', 'DURATION', 'clip_start', 'clip_end',
      'Start', 'End', 'TIME', 'Time',
      // Campos internos/técnicos
      'Original_start', 'Original_end', 'original_start', 'original_end',
      'original_start_seconds', 'original_end_seconds',
      // Ya los mostramos por separado
      'Game_Time', 'GAME_TIME', 'game_time', 
      'DETECTED_PERIOD', 'detected_period', 'Period', 'period',
      'Time_Group', 'TIME_GROUP', 'time_group'
    ];
    const excludedKeys = new Set(excludedKeysList.map(k => k.toLowerCase()));
    const excludedValues = new Set(['unknown', 'Unknown', 'UNKNOWN', 'N/A', 'n/a', 'null', 'None', '']);
    
    if (event.extra_data) {
      for (const [key, value] of Object.entries(event.extra_data)) {
        if (excludedKeys.has(String(key).toLowerCase())) continue;
        if (value === null || value === "") continue;
        if (typeof value === 'string' && excludedValues.has(value)) continue;
        if (Array.isArray(value)) {
          const cleaned = value.filter(v => !(typeof v === 'string' && excludedValues.has(v)));
          if (cleaned.length === 0) continue;
          otherDescriptors.push(`${key}: ${cleaned.join(', ')}`);
        } else {
          otherDescriptors.push(`${key}: ${value}`);
        }
      }
    }
    
    // NO limitar - mostrar todos los descriptores
    const displayedDetails = otherDescriptors;

    return (
      <div className="rounded-2xl bg-[#1c2235] p-3 shadow-2xl border border-white/10 text-sm text-slate-100 max-w-md max-h-96 overflow-y-auto">
        {matchLabel && (
          <div className="text-xs font-semibold text-slate-200 mb-1">
            Partido: <span className="text-white">{matchLabel}</span>
          </div>
        )}
        <div className="font-bold text-base mb-2 text-cyan-200">{event.category}</div>
        
        {/* Información de tiempo */}
        <div className="mb-2 pb-2 border-b border-white/10">
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div><strong>Timestamp:</strong> {secondsToGameClock(event.SECOND)}</div>
            <div><strong>Duración:</strong> {Math.round(event.DURATION * 10) / 10}s</div>
            <div><strong>Game Time:</strong> <span className="text-green-300 font-semibold">{gameTime}</span></div>
            <div><strong>Período:</strong> <span className="text-purple-200 font-semibold">{period}</span></div>
            <div className="col-span-2"><strong>Bloque:</strong> <span className="text-orange-200 font-semibold">{timeGroup}</span></div>
          </div>
        </div>
        
        {/* Jugador */}
        {playerInfo && (
          <div className="mb-2 pb-2 border-b border-white/10">
            <div><strong>Jugador:</strong> <span className="text-cyan-200 font-semibold">{playerInfo}</span></div>
          </div>
        )}
        
        {/* Todos los descriptores */}
        {displayedDetails.length > 0 && (
          <div>
            <div className="font-semibold mb-1 text-slate-200">Descriptores:</div>
            <div className="grid grid-cols-1 gap-0.5">
              {displayedDetails.map((desc, idx) => (
                <div key={idx} className="text-xs text-slate-100 pl-2 py-0.5 hover:bg-white/10 rounded">
                  • {desc}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
});

// TODO: revisar más adelante
// Las últimas mejoras visuales (hatch/triángulo/tooltip/auto-centering suppression)
// se mantuvieron temporalmente porque funcionan en desarrollo. Antes de
// estabilizar en main revisaremos rendimiento en datasets grandes y la
// heurística de detección de OPPONENT en payloads reales.

const CurrentTimeLine = React.memo(({ currentTime, xDomain }: { currentTime: number; xDomain: [number, number] }) => {
  if (typeof currentTime !== "number" || currentTime < xDomain[0] || currentTime > xDomain[1]) {
    return null;
  }

  return (
    <ReferenceLine
      x={currentTime}
      stroke="#000"
      strokeWidth={2}
      strokeDasharray="4 2"
    />
  );
});

const TimelineChart = ({ filteredEvents, onEventClick }: { filteredEvents: MatchEvent[]; onEventClick: (event: MatchEvent) => void }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(600);
  const [xDomain, setXDomain] = useState<[number, number]>([0, 600]);
  const [zoomFactor, setZoomFactor] = useState<number>(1);
  const lastAppliedDomainRef = useRef<[number, number]>([0, 600]);
  const lastWidthRef = useRef<number>(0);
  const { filterCategory, setFilterCategory, matchInfo } = useFilterContext();
  const { setSelectedEvent, playEvent, currentTime, lastAppliedDelay, selectedEvent } = usePlayback();
  // Track last user interaction (zoom/scroll/reset) to avoid auto-centering immediately after
  const lastUserActionRef = useRef<number>(0);
  // Track last automatic center to avoid loops while el video avanza
  const lastAutoCenterRef = useRef<number>(0);

  // Mapear tiempos de video -> tiempos de juego usando offsets detectados
  const timeMapping = useMemo(() => {
    // Preferir datos del match si existen
    const info: any = matchInfo || (filteredEvents[0] as any)?.match_info || {};
    const kickoff1 = info.kick_off_1_seconds ?? info.KICK_OFF_1_SECONDS ?? null;
    const kickoff2 = info.kick_off_2_seconds ?? info.KICK_OFF_2_SECONDS ?? null;
    const end1 = info.end_1_seconds ?? info.END_1_SECONDS ?? null;

    // Derivar offset a partir de eventos con Game_Time conocido
    const parseGT = (gt: any) => {
      if (typeof gt !== "string" || !gt.includes(":")) return null;
      const [m, s] = gt.split(":").map(Number);
      if (Number.isNaN(m) || Number.isNaN(s)) return null;
      return m * 60 + s;
    };

    const firstP1 = filteredEvents.find(ev => (ev.extra_data?.DETECTED_PERIOD ?? ev.extra_data?.period ?? ev.period ?? 1) === 1);
    const firstP2 = filteredEvents.find(ev => (ev.extra_data?.DETECTED_PERIOD ?? ev.extra_data?.period ?? ev.period ?? 1) === 2);

    const gtP1 = parseGT(firstP1?.extra_data?.Game_Time ?? firstP1?.Game_Time ?? firstP1?.game_time);
    const gtP2 = parseGT(firstP2?.extra_data?.Game_Time ?? firstP2?.Game_Time ?? firstP2?.game_time);

    const tsP1 = firstP1 ? Number(firstP1.timestamp_sec ?? firstP1.SECOND ?? 0) : null;
    const tsP2 = firstP2 ? Number(firstP2.timestamp_sec ?? firstP2.SECOND ?? 0) : null;

    // Offsets: video_time = game_time + offset -> game_time = video_time - offset
    const offset1 = (tsP1 !== null && gtP1 !== null) ? tsP1 - gtP1 : null;
    const offset2 = (tsP2 !== null && gtP2 !== null) ? tsP2 - gtP2 : null;

    // Derivar kickoff1/kickoff2 si no vienen de match_info
    const kickoff1Derived = kickoff1 ?? tsP1 ?? 0;
    const kickoff2Derived = kickoff2 ?? tsP2 ?? null;

    const firstHalfDuration = (() => {
      if (end1 != null && kickoff1Derived != null) return Number(end1) - Number(kickoff1Derived);
      if (kickoff2Derived != null && kickoff1Derived != null) return Number(kickoff2Derived) - Number(kickoff1Derived);
      return 2400; // fallback 40'
    })();

    return {
      kickoff1: kickoff1Derived ?? 0,
      kickoff2: kickoff2Derived,
      firstHalfDuration,
      offset1: offset1 ?? (kickoff1Derived ?? 0),
      offset2: offset2 ?? (kickoff2Derived != null ? kickoff2Derived - firstHalfDuration : null),
    };
  }, [filteredEvents, matchInfo]);

  const videoToGameSeconds = useCallback((videoSec: number | null | undefined): number => {
    if (videoSec === null || videoSec === undefined || Number.isNaN(Number(videoSec))) return 0;
    const { kickoff2, firstHalfDuration, offset1, offset2 } = timeMapping;
    // Si tenemos offset específico para el segundo tiempo, úsalo al pasar el kickoff2
    if (kickoff2 != null && videoSec >= kickoff2 && offset2 != null) {
      return Math.max(0, Number(videoSec) - offset2);
    }
    // De lo contrario usar offset1
    return Math.max(0, Number(videoSec) - offset1);
  }, [timeMapping]);

  const initialXDomain = useMemo(() => {
    if (filteredEvents.length > 0) {
      const padding = 30;
      const gameTimes = filteredEvents.map(ev => {
        const gt = ev.extra_data?.Game_Time || ev.Game_Time || null;
        if (gt) {
          const [m, s] = String(gt).split(":").map(Number);
          if (!Number.isNaN(m) && !Number.isNaN(s)) return m * 60 + s;
        }
        return videoToGameSeconds(ev.timestamp_sec ?? ev.SECOND ?? 0);
      });
      const start = Math.max(0, Math.min(...gameTimes) - padding);
      const end = Math.max(...gameTimes.map((gt, idx) => gt + (filteredEvents[idx]?.extra_data?.DURATION ?? 0))) + padding;
      return [start, end] as [number, number];
    }
    return [0, 600] as [number, number];
  }, [filteredEvents, videoToGameSeconds]);

  // Helper: compare numeric domain arrays to avoid redundant updates
  const domainsEqual = (a: [number, number], b: [number, number]) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
  };

  // Debounce/coalesce domain updates coming from filteredEvents changes
  const domainTimeoutRef = useRef<number | null>(null);
  const normalizeDomain = (domain: [number, number]): [number, number] => {
    // Evita micro diferencias flotantes que podrían disparar renders en loop
    return [Number(domain[0].toFixed(3)), Number(domain[1].toFixed(3))];
  };

  const scheduleSetDomain = (target: [number, number], reason = "unknown") => {
    const normalizedTarget = normalizeDomain(target);
    // Si ya estamos en ese dominio (o prácticamente igual), no programar nada
    if (domainsEqual(xDomain, normalizedTarget) || domainsEqual(lastAppliedDomainRef.current, normalizedTarget)) {
      return;
    }

    // Clear previous scheduled update
    if (domainTimeoutRef.current) {
      window.clearTimeout(domainTimeoutRef.current as number);
      domainTimeoutRef.current = null;
    }

    // Short debounce to coalesce multiple rapid updates (e.g., many charts firing)
    domainTimeoutRef.current = window.setTimeout(() => {
      domainTimeoutRef.current = null;
      if (!domainsEqual(xDomain, normalizedTarget)) {
        // Debug log to help diagnose looping behaviour
        // eslint-disable-next-line no-console
        console.log(`TimelineChart - scheduleSetDomain applying (${reason}):`, normalizedTarget, "prev:", xDomain);
        requestAnimationFrame(() => setXDomain(normalizedTarget));
      }
    }, 45);
  };

  // Detectar mobile (ssr-safe)
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  }, []);

  const categories = useMemo(() => Array.from(new Set(filteredEvents.map(ev => ev.event_type || "Otro"))).filter(cat => cat !== "END"), [filteredEvents]);

  const maxSecond = useMemo(() => {
    const max = Math.max(...filteredEvents.map(ev => {
      let duration = 1; // default
      if (ev.extra_data?.clip_end && ev.extra_data?.clip_start) {
        duration = ev.extra_data.clip_end - ev.extra_data.clip_start;
      } else if (ev.extra_data?.duration) {
        duration = ev.extra_data.duration;
      } else if (ev.extra_data?.DURATION) {
        duration = ev.extra_data.DURATION;
      }
      return videoToGameSeconds(ev.timestamp_sec ?? 0) + duration;
    }), 60);
    return max + 5;
  }, [filteredEvents, videoToGameSeconds]);

  const colors = useMemo(() => {
    const map: Record<string, string> = {};
    const palette = ["#3498db", "#e74c3c", "#2ecc71", "#f1c40f", "#9b59b6", "#1abc9c", "#e67e22", "#34495e", "#fd79a8", "#00b894", "#636e72", "#fdcb6e", "#6c5ce7", "#00cec9", "#d35400"];
    categories.forEach((type, idx) => {
      map[type] = palette[idx % palette.length];
    });
    return map;
  }, [categories]);

  const data = useMemo(() => filteredEvents.map(ev => {
    // Calcular duración correctamente
    let duration = 1; // default
    if (ev.extra_data?.clip_end && ev.extra_data?.clip_start) {
      duration = ev.extra_data.clip_end - ev.extra_data.clip_start;
    } else if (ev.extra_data?.duration) {
      duration = ev.extra_data.duration;
    } else if (ev.extra_data?.DURATION) {
      duration = ev.extra_data.DURATION;
    }
    // Calcular Game_Time en segundos para alinear con eje X
    let gameTimeSec: number | null = null;
    const rawGT = ev.extra_data?.Game_Time || ev.Game_Time || ev.game_time;
    if (rawGT && typeof rawGT === "string" && rawGT.includes(":")) {
      const [m, s] = rawGT.split(":").map(Number);
      if (!Number.isNaN(m) && !Number.isNaN(s)) gameTimeSec = m * 60 + s;
    }
    if (gameTimeSec === null) {
      gameTimeSec = videoToGameSeconds(ev.timestamp_sec ?? ev.SECOND ?? 0);
    }

    return {
      ...ev,
      category: ev.event_type || "Otro",
      SECOND: ev.timestamp_sec ?? 0,
      game_time_sec: gameTimeSec,
      DURATION: duration,
      color: colors[ev.event_type] || (ev.IS_OPPONENT ? "#e74c3c" : "#3498db"),
    };
  }), [filteredEvents, colors, videoToGameSeconds]);

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const event = payload[0].payload;
    const matchLabel = event.match_label || [event.match_team, event.match_opponent].filter(Boolean).join(" vs ");

      // Obtener información del jugador (omitir placeholders como 'unknown')
      let playerInfo: string | null = null;
      const placeholderNames = new Set(['unknown', 'Unknown', 'UNKNOWN', 'N/A', 'n/a', 'None', 'null']);
      
      // Prioridad 1: event.players (array desde API base_de_datos)
      let rawPlayer = null;
      if (event.players && Array.isArray(event.players)) {
        rawPlayer = event.players;
      } else {
        // Prioridad 2-4: campos legacy
        rawPlayer = event.extra_data?.JUGADOR ?? event.player_name ?? event.player ?? null;
      }
      
      if (rawPlayer) {
        if (Array.isArray(rawPlayer)) {
          const joined = rawPlayer.join(', ');
          playerInfo = placeholderNames.has(joined) ? null : joined;
        } else {
          const s = String(rawPlayer).trim();
          playerInfo = placeholderNames.has(s) ? null : s;
        }
      }

      // Campos calculados importantes (mostrar siempre)
      const gameTime = event.extra_data?.Game_Time || event.Game_Time || 'N/A';
      const period = event.extra_data?.DETECTED_PERIOD || event.period || 'N/A';
      const timeGroup = event.extra_data?.Time_Group || 'N/A';
      
      // Obtener TODOS los descriptores del extra_data
      const otherDescriptors: string[] = [];
      // Solo excluir campos técnicos internos, NO los descriptores del juego
      const excludedKeysList = [
        'JUGADOR', 'PLAYER', 'PLAYERS', 'duration', 'DURATION', 'clip_start', 'clip_end',
        'Start', 'End', 'TIME', 'Time',
        // Campos internos/técnicos
        'Original_start', 'Original_end', 'original_start', 'original_end',
        'original_start_seconds', 'original_end_seconds',
        // Ya los mostramos por separado
        'Game_Time', 'GAME_TIME', 'game_time', 
        'DETECTED_PERIOD', 'detected_period', 'Period', 'period',
        'Time_Group', 'TIME_GROUP', 'time_group'
      ];
      const excludedKeys = new Set(excludedKeysList.map(k => k.toLowerCase()));
      const excludedValues = new Set(['unknown', 'Unknown', 'UNKNOWN', 'N/A', 'n/a', 'null', 'None', '']);
      
      if (event.extra_data) {
        for (const [key, value] of Object.entries(event.extra_data)) {
          if (excludedKeys.has(String(key).toLowerCase())) continue;
          if (value === null || value === "") continue;
          if (typeof value === 'string' && excludedValues.has(value)) continue;
          if (Array.isArray(value)) {
            const cleaned = value.filter(v => !(typeof v === 'string' && excludedValues.has(v)));
            if (cleaned.length === 0) continue;
            otherDescriptors.push(`${key}: ${cleaned.join(', ')}`);
          } else {
            otherDescriptors.push(`${key}: ${value}`);
          }
        }
      }
      
      // NO limitar - mostrar todos los descriptores
      const displayedDetails = otherDescriptors;

      return (
        <div className="rounded-2xl bg-[#1c2235] p-3 shadow-2xl border border-white/10 text-sm text-slate-100 max-w-md max-h-96 overflow-y-auto">
        {matchLabel && (
          <div className="text-xs font-semibold text-slate-200 mb-1">
            Partido: <span className="text-white">{matchLabel}</span>
          </div>
        )}
        <div className="font-bold text-base mb-2 text-cyan-200">{event.category}</div>
          
          {/* Información de tiempo */}
          <div className="mb-2 pb-2 border-b border-white/10">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div><strong>Timestamp:</strong> {secondsToGameClock(event.SECOND)}</div>
              <div><strong>Duración:</strong> {Math.round(event.DURATION * 10) / 10}s</div>
              <div><strong>Game Time:</strong> <span className="text-green-300 font-semibold">{gameTime}</span></div>
              <div><strong>Período:</strong> <span className="text-purple-200 font-semibold">{period}</span></div>
              <div className="col-span-2"><strong>Bloque:</strong> <span className="text-orange-200 font-semibold">{timeGroup}</span></div>
            </div>
          </div>
          
          {/* Jugador */}
          {playerInfo && (
            <div className="mb-2 pb-2 border-b border-white/10">
              <div><strong>Jugador:</strong> <span className="text-cyan-200 font-semibold">{playerInfo}</span></div>
            </div>
          )}
          
          {/* Todos los descriptores */}
          {displayedDetails.length > 0 && (
            <div>
              <div className="font-semibold mb-1 text-slate-200">Descriptores:</div>
              <div className="grid grid-cols-1 gap-0.5">
                {displayedDetails.map((desc, idx) => (
                  <div key={idx} className="text-xs text-slate-100 pl-2 py-0.5 hover:bg-white/10 rounded">
                    • {desc}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  }, []);

  useEffect(() => {
    // Resize observer estable con memo del último ancho para evitar loops por oscilaciones mínimas
    const updateSize = (width: number) => {
      const rounded = Math.round(width);
      if (Math.abs(rounded - (lastWidthRef.current || 0)) > 2) {
        lastWidthRef.current = rounded;
        setChartWidth(rounded);
      }
    };

    const node = chartRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    updateSize(rect.width);

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        updateSize(entry.contentRect.width);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (filteredEvents.length === 1) {
      const ev = filteredEvents[0];
      const start = ev.timestamp_sec ?? 0;

      // Calcular duración correctamente
      let duration = 1; // default
      if (ev.extra_data?.clip_end && ev.extra_data?.clip_start) {
        duration = ev.extra_data.clip_end - ev.extra_data.clip_start;
      } else if (ev.extra_data?.duration) {
        duration = ev.extra_data.duration;
      } else if (ev.extra_data?.DURATION) {
        duration = ev.extra_data.DURATION;
      }

      const end = start + duration;
      const padding = 10;
      const target: [number, number] = [Math.max(0, start - padding), end + padding];
      // Si el single-event fue provocado por un click reciente del usuario,
      // evitamos centrar automáticamente para que no haya animaciones bruscas.
  const SUPPRESS_MS_AFTER_CLICK = 2000; // ms
      if (Date.now() - lastUserActionRef.current > SUPPRESS_MS_AFTER_CLICK) {
        scheduleSetDomain(target, 'single-event');
      } else {
        // Si el evento no está visible en la ventana actual, hacer un ajuste suave
        // sin disparar la animación programada (setXDomain directo).
        const currentlyInside = start >= xDomain[0] && end <= xDomain[1];
        if (!currentlyInside) {
          const visibleRange = xDomain[1] - xDomain[0];
          let newStart = Math.max(initialXDomain[0], start - visibleRange / 2);
          let newEnd = newStart + visibleRange;
          if (newEnd > initialXDomain[1]) {
            newEnd = initialXDomain[1];
            newStart = Math.max(initialXDomain[0], newEnd - visibleRange);
          }
          requestAnimationFrame(() => setXDomain([newStart, newEnd]));
        }
      }
    } else {
      // En mobile, inicializar mostrando hasta los primeros 20 minutos (1200s) como rango visible
      const mobileCap = 1200; // 20 minutos en segundos
      const baseRange = isMobile ? Math.min(mobileCap, maxSecond) : maxSecond;
      const visibleRange = baseRange / zoomFactor; // initial calculation uses current zoomFactor
      const start = 0;
      const target: [number, number] = [start, start + visibleRange];
      scheduleSetDomain(target, 'filtered-events-default');
    }
    // Nota: no incluimos zoomFactor en las dependencias para evitar que un cambio de zoom
    // inmediato sobrescriba el xDomain calculado por handleZoomChange. El handler actual
    // actualiza el xDomain directamente y también actualiza zoomFactor.
  }, [filteredEvents, maxSecond]);

  useEffect(() => {
    if (filteredEvents.length > 0) {
      const padding = 60;
      const gameTimes = filteredEvents.map(e => data.find(d => d.id === e.id)?.game_time_sec ?? videoToGameSeconds(e.timestamp_sec ?? 0));
      const start = Math.max(0, Math.min(...gameTimes) - padding);
      const end = Math.max(...gameTimes) + padding;
      const target: [number, number] = isMobile ? [0, Math.min(end, 1200)] : [start, end];
      scheduleSetDomain(target, isMobile ? 'initial-mobile' : 'initial');
    }
  }, [filteredEvents, isMobile, data, videoToGameSeconds]);

  const handleZoomChange = (zoomIn: boolean) => {
    // Calculamos el nuevo factor de zoom de forma acumulativa
    const zoomFactorChange = zoomIn ? 1.5 : 1 / 1.5;
    const newZoomFactor = zoomFactor * zoomFactorChange;

    // Calculamos el rango visible relativo al dominio completo (initialXDomain)
    const totalRange = initialXDomain[1] - initialXDomain[0];
    const newVisibleRange = Math.max(1, totalRange / newZoomFactor);

    // Clamp visible range entre 5 minutos (300s) y 100 minutos (6000s)
    const MIN_VISIBLE = 300; // 5 minutos
    const MAX_VISIBLE = 6000; // 100 minutos
    const clampedVisibleRange = Math.min(Math.max(newVisibleRange, MIN_VISIBLE), MAX_VISIBLE);
    // Recalcular el factor de zoom real usando el rango clampeado
    const adjustedZoomFactor = totalRange / clampedVisibleRange;

    // Centrar el zoom en el centro actual de la vista (más predecible que usar currentTime)
    const center = (xDomain[0] + xDomain[1]) / 2;

    // Use the clamped visible range when computing the new window so xDomain matches the actual zoom factor
    let start = center - clampedVisibleRange / 2;
    let end = center + clampedVisibleRange / 2;

    // Clamp dentro del dominio inicial
    if (start < initialXDomain[0]) {
      start = initialXDomain[0];
      end = start + clampedVisibleRange;
    }
    if (end > initialXDomain[1]) {
      end = initialXDomain[1];
      start = end - clampedVisibleRange;
    }

    // Use raf to avoid asynchronous updates while Recharts may be notifying subscribers
    // record user action to suppress auto-centering
    lastUserActionRef.current = Date.now();
    requestAnimationFrame(() => {
      setXDomain([start, end]);
      setZoomFactor(adjustedZoomFactor);
    });
  };

  const handleScroll = (direction: "left" | "right") => {
    // Shift by a fixed 10 minutes (600 seconds) per click
    const SHIFT_SECONDS = 600; // 10 minutes
    const range = xDomain[1] - xDomain[0];
    let newStart = direction === "right" ? xDomain[0] + SHIFT_SECONDS : xDomain[0] - SHIFT_SECONDS;
    let newEnd = newStart + range;

    // Clamp to initial domain bounds
    if (newStart < initialXDomain[0]) {
      newStart = initialXDomain[0];
      newEnd = initialXDomain[0] + range;
    }
    if (newEnd > initialXDomain[1]) {
      newEnd = initialXDomain[1];
      newStart = initialXDomain[1] - range;
    }

    // record user action to suppress auto-centering
    lastUserActionRef.current = Date.now();
    // Deferir para evitar actualizaciones sincrónicas que puedan disparar suscripciones
    requestAnimationFrame(() => setXDomain([newStart, newEnd]));
  };

  // Handler para restablecer zoom y el factor de zoom
  const handleResetZoom = () => {
    // record user action to suppress auto-centering
    lastUserActionRef.current = Date.now();
    requestAnimationFrame(() => {
      setXDomain(initialXDomain);
      setZoomFactor(1);
    });
  };

  // Efectos de debug: mostrar cambios de xDomain y zoomFactor en consola para diagnóstico
  useEffect(() => {
    // noop in production
  }, [xDomain]);
  useEffect(() => {
    // Mantener el ref de último dominio aplicado sincronizado
    lastAppliedDomainRef.current = xDomain;
  }, [xDomain]);

  useEffect(() => {
    // noop in production
  }, [zoomFactor]);

  // Deshabilitar botones si alcanzamos límites
  const totalRange = initialXDomain[1] - initialXDomain[0];
  const currentVisibleRange = xDomain[1] - xDomain[0];
  const MIN_VISIBLE = 300; // 5 minutos
  const MAX_VISIBLE = 6000; // 100 minutos
  const canZoomIn = currentVisibleRange > MIN_VISIBLE + 1; // permitir si aún podemos reducir
  const canZoomOut = currentVisibleRange < MAX_VISIBLE - 1; // permitir si aún podemos ampliar

  // Mantener la línea de tiempo visible: si currentTime (en game_time) sale del xDomain, desplazamos la ventana
  useEffect(() => {
    if (typeof currentTime !== 'number' || isNaN(currentTime)) return;
    // Avoid auto-centering immediately after a user interaction (zoom/scroll/reset)
    const SUPPRESS_MS = 900; // ms
    if (Date.now() - lastUserActionRef.current < SUPPRESS_MS) return;
    // Evitar re-centrados en cadena mientras el video avanza
    const AUTO_CENTER_COOLDOWN_MS = 1400;
    if (Date.now() - lastAutoCenterRef.current < AUTO_CENTER_COOLDOWN_MS) return;

    const currentGameTime = videoToGameSeconds(currentTime);
    const [start, end] = xDomain;
    const range = end - start;
    const margin = Math.max(5, range * 0.12); // ampliar margen para que el follow no dispare con cada pequeño desfasaje
    const insideWithMargin = currentGameTime >= start + margin && currentGameTime <= end - margin;

    if (!insideWithMargin) {
      // Centrar el currentTime dentro de la ventana
      let newStart = Math.max(initialXDomain[0], currentGameTime - range / 2);
      let newEnd = newStart + range;
      if (newEnd > initialXDomain[1]) {
        newEnd = initialXDomain[1];
        newStart = Math.max(initialXDomain[0], newEnd - range);
      }
      const target: [number, number] = [newStart, newEnd];
      if (!domainsEqual(xDomain, target) && !domainsEqual(lastAppliedDomainRef.current, target)) {
        // Deferimos el setState para evitar actualizaciones sincrónicas durante el commit
        lastAutoCenterRef.current = Date.now();
        requestAnimationFrame(() => setXDomain(normalizeDomain(target)));
      }
    }
  }, [currentTime, xDomain, initialXDomain]);

  const handleCategoryClick = (category: string) => {
    // record user action to avoid immediate auto-centering while interacting
    lastUserActionRef.current = Date.now();
    // Normalize category for comparison but store the original string so UI select matches
    const normalized = (category || "").toString().trim().toUpperCase();
    const normalizedList = (filterCategory || []).map((c: any) => (c || "").toString().trim().toUpperCase());
    if (normalizedList.includes(normalized)) {
      // remove entries whose normalized form matches
      setFilterCategory((filterCategory || []).filter((c: any) => (c || "").toString().trim().toUpperCase() !== normalized));
    } else {
      // add the original category value (preserve casing used in options)
      setFilterCategory([...(filterCategory || []), category]);
    }
  };

  const dynamicHeight = Math.min(30, Math.max(16, 150 / categories.length));
  const chartHeight = Math.min(400, Math.max(100, categories.length * dynamicHeight * 2));
  const currentGameTime = useMemo(() => {
    // Prioridad: si el evento seleccionado trae Game_Time, úsalo para alinear la línea vertical.
    const parseGT = (gt: any) => {
      if (typeof gt !== "string" || !gt.includes(":")) return null;
      const [m, s] = gt.split(":").map(Number);
      if (Number.isNaN(m) || Number.isNaN(s)) return null;
      return m * 60 + s;
    };
    const gtFromEvent = parseGT(selectedEvent?.extra_data?.Game_Time || selectedEvent?.Game_Time || selectedEvent?.game_time);
    if (gtFromEvent !== null) {
      return gtFromEvent;
    }
    const appliedDelay = Number(lastAppliedDelay || 0);
    return videoToGameSeconds((currentTime ?? 0) - appliedDelay);
  }, [currentTime, videoToGameSeconds, lastAppliedDelay, selectedEvent]);

  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log("Timeline current line", {
        currentTimeVideo: currentTime,
        currentGameTime,
        offset1: timeMapping.offset1,
        offset2: timeMapping.offset2,
        kickoff1: timeMapping.kickoff1,
        kickoff2: timeMapping.kickoff2,
      });
    } catch (_) {}
  }, [currentTime, currentGameTime, timeMapping]);

  return (
    <div className="w-full">
      <div ref={chartRef} style={{ height: `${chartHeight}px`, overflow: "visible" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="game_time_sec"
              type="number"
              domain={xDomain}
              tickFormatter={(tick) => secondsToGameClock(tick)}
              tick={{ fill: "#cbd5e1", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
            />
            <YAxis
              type="category"
              dataKey="category"
              interval={0}
              tick={({ x, y, payload }) => (
                <g transform={`translate(${x},${y})`} style={{ cursor: "pointer" }}>
                  <text
                    x={0}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    fill="#cbd5e1"
                    fontSize={10}
                    style={{ textDecoration: (filterCategory || []).map((c:any)=>(c||"").toString().trim().toUpperCase()).includes((payload.value||"").toString().trim().toUpperCase()) ? "underline" : "none" }}
                    onClick={() => handleCategoryClick(payload.value)}
                  >
                    {payload.value}
                  </text>
                </g>
              )}
              width={60}
              allowDuplicatedCategory={false}
            />
            <Tooltip content={<TooltipContent />} isAnimationActive={false} wrapperStyle={{ zIndex: 50, overflow: "visible", pointerEvents: "auto" }} />
            <Scatter
              data={data.filter(ev => ev.game_time_sec >= xDomain[0] && ev.game_time_sec <= xDomain[1])}
              isAnimationActive={false}
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                const effectiveWidth = Math.min(chartWidth, 1800); // limitar ancho usado para evitar loops por mega pantallas
                const width = Math.max((payload.DURATION / (xDomain[1] - xDomain[0])) * effectiveWidth, 4);
                const x = cx;
                const y = cy - dynamicHeight / 2.1;
                const isOpp = Boolean(payload.IS_OPPONENT || payload.extra_data?.OPPONENT || String(payload.extra_data?.EQUIPO ?? payload.TEAM ?? '').toUpperCase().includes('OPPONENT') || String(payload.extra_data?.EQUIPO ?? payload.TEAM ?? '').toUpperCase().includes('AWAY'));
                // compute luminance to pick contrasting hatch color
                const colorToRgb = (hex: string) => {
                  try {
                    const h = hex.replace('#', '');
                    const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
                    const r = (bigint >> 16) & 255;
                    const g = (bigint >> 8) & 255;
                    const b = bigint & 255;
                    return { r, g, b };
                  } catch (e) {
                    return { r: 50, g: 50, b: 50 };
                  }
                };
                const rgb = colorToRgb(payload.color || '#3498db');
                const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
                const hatchStroke = luminance > 0.6 ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.6)';
                const strokeColor = isOpp ? (luminance > 0.6 ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.35)') : 'rgba(0,0,0,0.12)';
                const patternId = `hatch-${Math.abs(String(payload.id ?? payload.ID ?? '').split('').reduce((a,b)=>a+b.charCodeAt(0),0))}`;
                const triangleSize = Math.max(6, Math.min(14, dynamicHeight * 0.8));

                return (
                  <svg x={x} y={y} width={width} height={dynamicHeight} style={{ overflow: 'visible', cursor: 'pointer' }} onClick={() => { lastUserActionRef.current = Date.now(); onEventClick(payload); }}>
                    <defs>
                      <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="6" height="6" fill="none" />
                        <path d="M0 0 L0 6" stroke={hatchStroke} strokeWidth="1.2" />
                      </pattern>
                    </defs>
                    {/* Base fill */}
                    <rect x={0} y={0} width={width} height={dynamicHeight} rx={1} fill={payload.color} stroke={strokeColor} strokeWidth={isOpp ? 1.4 : 0.6} />
                    {/* If opponent, overlay stronger hatch and a small triangle marker on the right */}
                    {isOpp && (
                      <>
                        <rect x={0} y={0} width={width} height={dynamicHeight} rx={1} fill={`url(#${patternId})`} />
                      </>
                    )}
                  </svg>
                );
              }}
            />

            <CurrentTimeLine currentTime={currentGameTime ?? 0} xDomain={xDomain} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 py-2 flex items-center gap-4 flex-wrap">
        <label className="text-sm">Zoom:</label>
        <div className="controls">
          <Button variant="secondary" onClick={() => handleZoomChange(true)} disabled={!canZoomIn}>+</Button>
          <Button variant="secondary" onClick={() => handleZoomChange(false)} disabled={!canZoomOut}>-</Button>
          <Button variant="secondary" onClick={handleResetZoom}>Restablecer Zoom</Button>
        </div>
        <span>{zoomFactor}x</span>
        <Button variant="secondary" onClick={() => handleScroll("left")}>←</Button>
        <Button variant="secondary" onClick={() => handleScroll("right")}>→</Button>
      </div>
    </div>
  );
};

export default TimelineChart;
