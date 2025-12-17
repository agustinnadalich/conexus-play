import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiCpu, FiFilter, FiLayers, FiPlay, FiZap } from "react-icons/fi";
import Layout from "@/components/Layout";
import HeaderPartido from "@/components/HeaderPartido";
import Sidebar from "@/components/Sidebar";
import TimelineChart from "@/components/charts/TimelineChart";
import VideoPlayer from "@/components/VideoPlayer";
import ChartsTabs from "@/components/ChartsTabs";
import FieldMapChart from "@/components/charts/FieldMapChart";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEvents } from "@/hooks/useEvents";
import { FilterProvider, useFilterContext } from "@/context/FilterContext";
import { PlaybackProvider, usePlayback } from "@/context/PlaybackContext";
import { cn } from "@/lib/utils";
import "./AnalysisPageNeo.css";

const AnalysisPageNeoContent = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { data, isLoading, error } = useEvents(Number(matchId));
  const { setEvents, setMatchInfo, filteredEvents } = useFilterContext();
  const {
    currentTime,
    setSelectedEvent,
    playEvent,
  } = usePlayback();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (data?.events && data.events.length > 0) {
      setEvents(data.events);
    }
    if (data?.match_info) {
      setMatchInfo(data.match_info);
    }
  }, [data, setEvents, setMatchInfo]);

  if (isLoading) {
    return (
      <Layout hideHeader noPadding>
        <div className="neo-shell neo-grid-lines">
          <div className="p-8 text-center text-slate-200">Cargando análisis avanzado...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout hideHeader noPadding>
        <div className="neo-shell neo-grid-lines">
          <div className="p-8 text-center text-red-300">
            Error al cargar los eventos: {error.message}
          </div>
        </div>
      </Layout>
    );
  }

  const matchInfoAny: any = data?.match_info || {};
  const videoUrl = matchInfoAny?.VIDEO_URL || matchInfoAny?.video || "";
  const totalEvents = filteredEvents?.length || 0;
  const breakEvents = filteredEvents.filter((ev: any) => (ev.event_type || ev.CATEGORY) === "BREAK").length;
  const tackleEvents = filteredEvents.filter((ev: any) => (ev.event_type || ev.CATEGORY) === "TACKLE").length;
  const matchTitle = `${matchInfoAny?.team_name || matchInfoAny?.TEAM || "Equipo"} vs ${matchInfoAny?.opponent_name || matchInfoAny?.OPPONENT || "Rival"}`;
  const breadcrumbs = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Análisis" },
    { label: matchTitle },
  ];

  return (
    <Layout
      title={matchTitle}
      subtitle="Vista futurista (en pausa)"
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex items-center gap-2">
          <Link
            to={`/analysis/${matchId}`}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver a vista clásica
          </Link>
          <Link
            to="/multi-match-report"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            MultiMatch
          </Link>
        </div>
      }
      noPadding
      hideHeader
    >
      <div className="neo-shell neo-grid-lines">
        <div className="neo-ring right" />
        <div className="neo-ring left" />

        <div className="neo-topbar">
          <div>
            <div className="neo-pulse">
              <span className="neo-pulse-dot" />
              <span className="text-sm uppercase tracking-[0.2em] text-slate-200">AI-Driven Rugby Insights</span>
            </div>
            <div className="neo-hero-title neo-glow-text mt-2">
              {matchInfoAny?.team_name || "Equipo"} vs {matchInfoAny?.opponent_name || "Rival"}
            </div>
            <div className="neo-hero-subtitle">
              Análisis táctico + video sincronizado · Match ID #{matchId}
            </div>
          </div>
          <div className="neo-actions">
            <Link className="neo-btn" to={`/analysis/${matchId}/edit-events`}>
              Editar eventos
            </Link>
            <Link className="neo-btn" to={`/analysis/${matchId}`}>
              <FiLayers /> Vista clásica
            </Link>
            <Link className="neo-btn" to="/multi-match-report">
              <FiCpu /> MultiMatch
            </Link>
            <button className="neo-btn primary" onClick={() => setSidebarOpen((v) => !v)}>
              <FiFilter /> {sidebarOpen ? "Ocultar filtros" : "Mostrar filtros"}
            </button>
          </div>
        </div>

        <div className="neo-content">
          <aside className={cn("neo-sidebar", !sidebarOpen && "hidden")}>
            <div className="flex items-center justify-between mb-2">
              <div className="neo-chip"><FiFilter /> Filtros dinámicos</div>
              <button
                className="text-xs text-slate-300 hover:text-white md:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          </aside>

          <main className="neo-main">
            <section className="neo-panel neo-highlight neo-shadow-soft relative overflow-hidden">
              <div className="neo-panel-title">
                <div className="neo-chip">
                  <FiZap /> Pulse IA
                </div>
                <div className="neo-badges">
                  <span className="neo-chip">Eventos: {totalEvents}</span>
                  <span className="neo-chip">Breaks: {breakEvents}</span>
                  <span className="neo-chip">Tackles: {tackleEvents}</span>
                </div>
              </div>
              <HeaderPartido />
              <p className="text-sm text-slate-200 mt-2">
                Flujo táctico con timeline interactivo, mapa de cancha y video sincronizado. Ideal para comparar con la vista clásica.
              </p>
            </section>

            <section className="neo-panel">
              <div className="neo-panel-title">
                <div className="neo-chip"><FiPlay /> Player + Contexto</div>
                <div className="neo-chip">Tiempo: {Math.round(currentTime ?? 0)}s</div>
              </div>
              <VideoPlayer videoUrl={videoUrl} />
            </section>

            <section className="neo-panel">
              <div className="neo-panel-title">
                <div className="neo-chip"><FiLayers /> Línea de tiempo</div>
                <div className="neo-chip">Click para saltar en el video</div>
              </div>
              <ErrorBoundary>
                <TimelineChart
                  filteredEvents={filteredEvents}
                  onEventClick={playEvent}
                />
              </ErrorBoundary>
            </section>

            <div className="neo-two-col">
              <section className="neo-panel">
                <div className="neo-panel-title">
                  <div className="neo-chip">Insights y métricas</div>
                  <div className="neo-chip">Responsive tabs</div>
                </div>
                <ErrorBoundary>
                  <ChartsTabs
                    onEventClick={setSelectedEvent}
                    currentTime={currentTime}
                  />
                </ErrorBoundary>
              </section>

              <section className="neo-panel">
                <div className="neo-panel-title">
                  <div className="neo-chip">Mapa de cancha</div>
                  <div className="neo-chip">Click para reproducir</div>
                </div>
                <ErrorBoundary>
                  <FieldMapChart
                    events={filteredEvents}
                    matchInfo={data?.match_info || {}}
                  />
                </ErrorBoundary>
              </section>
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
};

const AnalysisPageNeo = () => {
  return (
    <FilterProvider>
      <PlaybackProvider>
        <AnalysisPageNeoContent />
      </PlaybackProvider>
    </FilterProvider>
  );
};

export default AnalysisPageNeo;
