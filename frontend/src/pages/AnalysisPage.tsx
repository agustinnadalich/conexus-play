import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
import { FiEdit3, FiFilter, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

const AnalysisPageContent = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { data, isLoading, error } = useEvents(Number(matchId));
  const { setEvents, setFilteredEvents, setMatchInfo, filteredEvents } = useFilterContext();
  const {
    currentTime,
    setCurrentTime,
    selectedEvent,
    setSelectedEvent,
    playNext,
    playPrev,
    playEvent
  } = usePlayback();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (data?.events && data.events.length > 0) {
      console.log("✅ Eventos cargados en AnalysisPage:", data.events.length);
      setEvents(data.events);  // Esto ahora maneja ambos: events y filteredEvents
    }
    if (data?.match_info) {
      setMatchInfo(data.match_info);
    }
  }, [data]); // Removiendo setEvents y setMatchInfo de las dependencias

  if (isLoading) {
    return (
      <Layout hideHeader noPadding>
        <div className="flex items-center justify-center h-64">
          <p>Cargando eventos del partido...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout hideHeader noPadding>
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">Error al cargar los eventos: {error.message}</p>
        </div>
      </Layout>
    );
  }

  const matchInfoAny: any = data?.match_info;
  const videoUrl = matchInfoAny?.VIDEO_URL || matchInfoAny?.video || "";
  const matchTitle = matchInfoAny
    ? `${matchInfoAny?.team_name || matchInfoAny?.TEAM || "Equipo"} vs ${matchInfoAny?.opponent_name || matchInfoAny?.OPPONENT || "Rival"}`
    : "Análisis del partido";
  const breadcrumbText = `Home / Análisis: ${matchTitle || `Partido ${matchId}`}`;

  return (
    <Layout hideHeader noPadding>
      {/* Sidebar */}
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

      {/* Botón flotante de filtros */}

      <button
        className="mr-2 p-2 rounded hover:bg-gray-200 fixed left-2 top-14 z-30 border-slate-300 bg-white text-slate-800 shadow-lg transition hover:bg-slate-50 md:left-4 md:top-16"
        onClick={() => setSidebarOpen((v) => !v)}
        title={sidebarOpen ? "Ocultar filtros" : "Mostrar filtros"}
      >
        <FiFilter size={22} />
      </button>

      {/* Main content */}
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
                  {breadcrumbText}
                </Link>
                <Link
                  to={`/analysis/${matchId}/edit-events`}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                  title="Editar eventos"
                >
                  Editar Eventos
                </Link>
              </div>
              <div className="w-full">
                <HeaderPartido />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <VideoPlayer videoUrl={videoUrl} />

            <ErrorBoundary>
              <TimelineChart
                filteredEvents={filteredEvents}
                onEventClick={playEvent}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <ChartsTabs
                onEventClick={setSelectedEvent}
                currentTime={currentTime}
              />
            </ErrorBoundary>

            {/* Mapa de cancha debajo de los tabs */}
            <ErrorBoundary>
              <div className="mt-6">
                <FieldMapChart
                  events={filteredEvents}
                  matchInfo={data?.match_info || {}}
                />
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const AnalysisPage = () => {
  return (
    <FilterProvider>
      <PlaybackProvider>
        <AnalysisPageContent />
      </PlaybackProvider>
    </FilterProvider>
  );
};

export default AnalysisPage;
