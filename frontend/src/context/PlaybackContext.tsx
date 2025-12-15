import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useFilterContext } from "@/context/FilterContext"; // Importar FilterContext
import type { ReactNode } from "react";
import type { MatchEvent } from "@/types";

// Normaliza el segundo de inicio de un evento usando los campos disponibles
export const resolveEventStart = (ev: MatchEvent | null | undefined): number => {
  if (!ev) return 0;
  const extra = ev.extra_data || {};
  const candidates = [
    ev.timestamp_sec, // ya debería venir ajustado por delays en el backend
    ev.SECOND,
    extra.clip_start,
    extra.clipStart,
    extra.clipBegin,
    extra.start,
    extra.Start,
    extra.Original_start,
    extra.original_start,
    extra.original_start_seconds,
  ];

  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const num = Number(c);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return num;
    }
  }

  return 0;
};

interface PlaybackContextType {
  currentTime: number;
  setCurrentTime: (time: number) => void;
  selectedEvent: MatchEvent | null;
  setSelectedEvent: (event: MatchEvent | null) => void;
  playRequestToken: number;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playFiltered: () => void;
  playNext: () => void;
  playPrev: () => void;
  playEvent: (event: MatchEvent) => void;
  getAdjustedStart?: (event: MatchEvent | null | undefined) => number;
  lastAppliedDelay?: number;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider = ({ children }: { children: ReactNode }) => {
  const { filteredEvents, matchInfo } = useFilterContext(); // Usar filteredEvents y matchInfo desde FilterContext
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<MatchEvent | null>(null);
  const [playRequestToken, setPlayRequestToken] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [lastAppliedDelay, setLastAppliedDelay] = useState<number>(0);

  const computePendingDelay = useCallback((ev: MatchEvent | null | undefined): number => {
    if (!ev) return 0;
    const extra = ev.extra_data || {};
    const already = Number(extra._delay_applied || 0) || 0;
    const globalDelay =
      Number((matchInfo as any)?.global_delay_seconds ?? (matchInfo as any)?.GLOBAL_DELAY_SECONDS ?? 0) || 0;
    const eventDelays =
      (matchInfo as any)?.event_delays ??
      (matchInfo as any)?.EVENT_DELAYS ??
      {};
    const evtType = (ev.event_type || (ev as any).CATEGORY || "").toString().toUpperCase();
    const typeDelayRaw = (eventDelays && (eventDelays[evtType] ?? eventDelays[evtType?.toLowerCase?.()] ?? eventDelays[evtType?.toUpperCase?.()])) || 0;
    const typeDelay = Number(typeDelayRaw) || 0;
    const targetDelay = globalDelay + typeDelay;
    try {
      console.log("⏱️ computePendingDelay", { evtType, targetDelay, already, globalDelay, typeDelay });
    } catch (_) {}
    return targetDelay - already;
  }, [matchInfo]);

  const getAdjustedStart = useCallback((ev: MatchEvent | null | undefined) => {
    const base = resolveEventStart(ev);
    const pending = computePendingDelay(ev);
    return base + pending;
  }, [computePendingDelay]);

  const playFiltered = useCallback(() => {
    if (filteredEvents.length === 0) return;
    const start = getAdjustedStart(filteredEvents[0]);
    setLastAppliedDelay(computePendingDelay(filteredEvents[0]));
    setSelectedEvent(filteredEvents[0]);
    setCurrentIndex(0);
    setCurrentTime(start);
    setIsPlaying(true);
    setPlayRequestToken((t) => t + 1);
  }, [filteredEvents, getAdjustedStart, computePendingDelay]);

  const playNext = useCallback(() => {
    if (currentIndex + 1 < filteredEvents.length) {
      const nextIndex = currentIndex + 1;
      const start = getAdjustedStart(filteredEvents[nextIndex]);
      setLastAppliedDelay(computePendingDelay(filteredEvents[nextIndex]));
      setSelectedEvent(filteredEvents[nextIndex]);
      setCurrentIndex(nextIndex);
      setCurrentTime(start);
      setPlayRequestToken((t) => t + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, filteredEvents, getAdjustedStart, computePendingDelay]);

  const playPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const start = getAdjustedStart(filteredEvents[prevIndex]);
      setLastAppliedDelay(computePendingDelay(filteredEvents[prevIndex]));
      setSelectedEvent(filteredEvents[prevIndex]);
      setCurrentIndex(prevIndex);
      setCurrentTime(start);
      setPlayRequestToken((t) => t + 1);
    }
  }, [currentIndex, filteredEvents, getAdjustedStart, computePendingDelay]);

  const playEvent = useCallback((event: MatchEvent) => {
    console.log("playEvent llamado con:", event);
    console.log("filteredEvents en playEvent:", filteredEvents);

    const index = filteredEvents.findIndex(
      (e) =>
        e.timestamp_sec === event.timestamp_sec &&
        e.event_type === event.event_type &&
        e.match_id === event.match_id
    );
    console.log("Índice del evento en filteredEvents:", index);

    if (index !== -1) {
      const start = getAdjustedStart(event);
      setLastAppliedDelay(computePendingDelay(event));
      setSelectedEvent(event);
      setCurrentIndex(index);
      setCurrentTime(start);
      setIsPlaying(true);
      setPlayRequestToken((t) => t + 1);
      console.log("Estados actualizados: ", {
        selectedEvent: event,
        currentIndex: index,
        currentTime: start,
        isPlaying: true,
      });
      return;
    }

    // Fallback: intentar encontrar por timestamp y tipo si no coincide match_id u otros campos
    const fallbackIndex = filteredEvents.findIndex(
      (e) => e.timestamp_sec === event.timestamp_sec && e.event_type === event.event_type
    );

    if (fallbackIndex !== -1) {
      const matched = filteredEvents[fallbackIndex];
      const start = getAdjustedStart(matched);
      setLastAppliedDelay(computePendingDelay(matched));
      setSelectedEvent(matched);
      setCurrentIndex(fallbackIndex);
      setCurrentTime(start);
      setIsPlaying(true);
      setPlayRequestToken((t) => t + 1);
      console.log("Fallback match por timestamp/event_type gevonden:", fallbackIndex);
      return;
    }

    // Último recurso: aunque no esté en filteredEvents, seleccionar y saltar al tiempo del evento
    console.warn("El evento no se encontró en filteredEvents. Aplicando fallback directo.");
    const start = getAdjustedStart(event);
    setLastAppliedDelay(computePendingDelay(event));
    setSelectedEvent(event);
    setCurrentIndex(-1);
    setCurrentTime(start);
    setIsPlaying(true);
    setPlayRequestToken((t) => t + 1);
  }, [filteredEvents, getAdjustedStart, computePendingDelay]);

  return (
    <PlaybackContext.Provider
      value={{
        currentTime,
        setCurrentTime,
        selectedEvent,
        playRequestToken,
        setSelectedEvent,
        currentIndex,
        setCurrentIndex,
        isPlaying,
    setIsPlaying,
      playFiltered,
      playNext,
      playPrev,
      playEvent,
      getAdjustedStart,
      lastAppliedDelay,
    }}
  >
  {children}
</PlaybackContext.Provider>
);
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }
  return context;
};

export { PlaybackContext };
