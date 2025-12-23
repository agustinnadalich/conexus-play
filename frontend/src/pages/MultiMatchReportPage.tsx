import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import MultiMatchHeader from "../components/MultiMatchHeader";
import VideoPlayer from "../components/VideoPlayer";
import Layout from "@/components/Layout";
import { FilterProvider, useFilterContext } from "@/context/FilterContext";
import { PlaybackProvider, usePlayback } from "@/context/PlaybackContext";
import Sidebar from "@/components/Sidebar";
import TimelineChart from "@/components/charts/TimelineChart";
import ChartsTabs from "@/components/ChartsTabs";
import FieldMapChart from "@/components/charts/FieldMapChart";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FiFilter, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { API_BASE, authFetch } from "@/api/api";

type MatchSummary = {
  id: number;
  team?: string | null;
  opponent?: string | null;
  date?: string | null;
  video_url?: string | null;
};

const MultiMatchReportPageContent = () => {
  const location = useLocation();
  const { setEvents, filteredEvents } = useFilterContext();
  const { playEvent, selectedEvent, setSelectedEvent, currentTime } = usePlayback();

  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<number[]>([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState(false);
  const hasQuerySelection = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Preseleccionar por querystring si viene ?match_id=1&match_id=2
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ids = params
      .getAll("match_id")
      .map((n) => Number(n))
      .filter((n) => !Number.isNaN(n));
    if (ids.length > 0) {
      setSelectedMatchIds(ids);
      hasQuerySelection.current = true;
    }
  }, [location.search]);

  // Cargar partidos disponibles
  useEffect(() => {
    const fetchMatches = async () => {
      const res = await authFetch(`/matches`);
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
      // Si no había selección previa, marcar todos
      if (!hasQuerySelection.current && selectedMatchIds.length === 0 && Array.isArray(data)) {
        setSelectedMatchIds(data.map((m: any) => m.id));
      }
    };
    fetchMatches();
  }, []);

  // Cuando cambia el evento seleccionado (desde playNext/playPrev), actualizar el video
  useEffect(() => {
    if (selectedEvent) {
      setCurrentVideoUrl((selectedEvent as any)?.video_url || "");
    }
  }, [selectedEvent]);

  // Cargar eventos de los partidos seleccionados
  useEffect(() => {
    const fetchAllEvents = async () => {
      if (selectedMatchIds.length === 0) {
        setEvents([]);
        return;
      }
      setLoadingEvents(true);
      try {
        const params = `match_ids=${selectedMatchIds.join(",")}`;
        const res = await authFetch(`/matches/events?${params}`);
        const data = await res.json();
        const normalized = (data.events || []).map((ev: any) => {
          const teamName = ev.match_team || ev.team || ev.extra_data?.TEAM || ev.extra_data?.EQUIPO;
          const oppName = ev.match_opponent || ev.opponent || ev.extra_data?.OPPONENT;
          let duration =
            ev.extra_data?.duration ??
            ev.extra_data?.DURATION;
          if (duration === undefined && ev.extra_data?.clip_end != null && ev.extra_data?.clip_start != null) {
            duration = ev.extra_data.clip_end - ev.extra_data.clip_start;
          }
          if (duration === undefined) {
            duration = 1;
          }
          const matchLabel =
            ev.match_label ||
            [ev.match_team, ev.match_opponent].filter(Boolean).join(" vs ");
          const ts = Number(ev.timestamp_sec ?? ev.SECOND ?? 0);
          return {
            ...ev,
            TEAM: teamName,
            OPPONENT: oppName,
            event_type: ev.event_type || ev.CATEGORY,
            category: ev.event_type || ev.CATEGORY,
            timestamp_sec: ts,
            SECOND: ts,
            DURATION: duration,
            match_label: matchLabel,
            player_name: ev.player_name || (Array.isArray(ev.players) ? ev.players.join(", ") : undefined),
            video_url: ev.video_url,
          };
        });
        // Ordenar por tiempo
        normalized.sort((a: any, b: any) => (a.timestamp_sec ?? 0) - (b.timestamp_sec ?? 0));
        setEvents(normalized);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchAllEvents();
  }, [selectedMatchIds, setEvents]);

  const handleToggleMatch = (matchId: number) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    );
  };

  const handleEventClick = (event: any) => {
    setCurrentVideoUrl(event?.video_url || "");
    playEvent(event);
  };

  const selectedSummaries = useMemo(() => {
    const map = new Map(matches.map((m) => [m.id, m]));
    return selectedMatchIds.map((id) => map.get(id)).filter(Boolean) as MatchSummary[];
  }, [matches, selectedMatchIds]);

  return (
    <Layout hideHeader noPadding>
      {/* Sidebar de filtros */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 border-r bg-white shadow-md transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          className="absolute top-4 right-4 p-2 rounded hover:bg-gray-200"
          onClick={() => setSidebarOpen(false)}
          title="Cerrar filtros"
        >
          <FiX size={22} />
        </button>
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Botón flotante para abrir filtros */}
      <button
        className="mr-2 p-2 rounded hover:bg-gray-200 fixed left-2 top-14 z-30 border-slate-300 bg-white text-slate-800 shadow-lg transition hover:bg-slate-50 md:left-4 md:top-16"
        onClick={() => setSidebarOpen((v) => !v)}
        title={sidebarOpen ? "Ocultar filtros" : "Mostrar filtros"}
      >
        <FiFilter size={22} />
      </button>

      <div
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarOpen ? "ml-64" : ""
        )}
      >
        <div className="px-2 pb-8 pt-4 sm:px-4 sm:pt-6">
          <div className="mb-4 flex flex-wrap items-start gap-3 justify-between">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <Link
                  to="/dashboard"
                  className="text-slate-700 hover:text-slate-900"
                >
                  Home / MultiMatch
                </Link>
              </div>
              <div className="w-full">
                <MultiMatchHeader
                  matches={matches}
                  selectedMatchIds={selectedMatchIds}
                  onToggleMatch={handleToggleMatch}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-600 mb-2">
                {selectedSummaries.length > 0
                  ? selectedSummaries.map((m) => `${m.team ?? "Equipo"} vs ${m.opponent ?? "Rival"}`).join(" · ")
                  : "Selecciona partidos para comenzar"}
              </div>
              <VideoPlayer videoUrl={currentVideoUrl} />
            </div>

            <ErrorBoundary>
              <TimelineChart
                filteredEvents={filteredEvents}
                onEventClick={handleEventClick}
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <ChartsTabs
                onEventClick={(ev: any) => {
                  setSelectedEvent(ev);
                  handleEventClick(ev);
                }}
                currentTime={currentTime}
                matchSummaries={selectedSummaries}
                selectedMatchIds={selectedMatchIds}
                isMultiMatch
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <div className="mt-6">
                <FieldMapChart
                  events={filteredEvents}
                  matchInfo={{} as any}
                />
              </div>
            </ErrorBoundary>

            {loadingEvents && (
              <div className="text-sm text-slate-500">Cargando eventos de los partidos seleccionados...</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const MultiMatchReportPage = () => (
  <FilterProvider>
    <PlaybackProvider>
      <MultiMatchReportPageContent />
    </PlaybackProvider>
  </FilterProvider>
);

export default MultiMatchReportPage;
