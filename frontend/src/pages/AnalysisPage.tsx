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
import { FiFilter, FiX } from "react-icons/fi";
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
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p>Cargando eventos del partido...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">Error al cargar los eventos: {error.message}</p>
        </div>
      </Layout>
    );
  }

  const matchInfoAny: any = data?.match_info;
  const videoUrl = matchInfoAny?.VIDEO_URL || matchInfoAny?.video || "";

  return (
    <Layout>
      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-white border-r shadow-md z-40 w-64 transition-transform duration-300",
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

      {/* Main content */}
      <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "ml-64" : "")}>
        <div className="p-0 sm:p-4">
          <div className="mb-4 flex items-center">
            {/* Botón de mostrar sidebar */}
            {!sidebarOpen && (
              <button
                className="mr-2 p-2 rounded hover:bg-gray-200"
                onClick={() => setSidebarOpen(true)}
                title="Mostrar filtros"
              >
                <FiFilter size={22} />
              </button>
            )}
            <HeaderPartido />
            <div className="ml-auto flex gap-2">
              <Link
                to={`/analysis-neo/${matchId}`}
                className="px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-sm"
              >
                Vista futurista
              </Link>
              <Link
                to="/multi-match-report"
                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
              >
                MultiMatch
              </Link>
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
