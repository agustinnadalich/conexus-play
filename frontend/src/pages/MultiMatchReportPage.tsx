import React, { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import MultiMatchHeader from "../components/MultiMatchHeader";
import Charts from "../components/Charts";
import VideoPlayer from "../components/VideoPlayer";
import Layout from "@/components/Layout";

const MultiMatchReportPage = () => {
  const location = useLocation();
  const [matches, setMatches] = useState([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filterDescriptors, setFilterDescriptors] = useState([]);
  const [videoSrc, setVideoSrc] = useState("");
  const [currentEvent, setCurrentEvent] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // 1. Cargar todos los partidos
  useEffect(() => {
    fetch("http://localhost:5001/matches")
      .then((res) => res.json())
      .then((data) => {
        setMatches(data.matches);
        setSelectedMatchIds(data.matches.map((m) => m.ID_MATCH)); // Por defecto, todos seleccionados
      });
  }, []);

  // 2. Cargar eventos de todos los partidos seleccionados
  useEffect(() => {
    const fetchAllEvents = async () => {
      if (selectedMatchIds.length === 0) {
        setAllEvents([]);
        setFilteredEvents([]);
        return;
      }
      const params = selectedMatchIds.map(id => `match_id=${id}`).join('&');
      const res = await fetch(`http://localhost:5001/events/multi?${params}`);
      const data = await res.json();
      const normalizedEvents = data.events.map(ev => ({
        ...ev,
        COORDINATE_X: ev.COORDINATE_X !== null && ev.COORDINATE_X !== undefined && ev.COORDINATE_X !== "" ? Number(ev.COORDINATE_X) : null,
        COORDINATE_Y: ev.COORDINATE_Y !== null && ev.COORDINATE_Y !== undefined && ev.COORDINATE_Y !== "" ? Number(ev.COORDINATE_Y) : null,
      }));
      setAllEvents(normalizedEvents);
      setFilteredEvents(normalizedEvents); // Inicialmente sin filtros
      setFilterDescriptors([]); // Limpiar filtros al cambiar partidos
    };
    fetchAllEvents();
  }, [selectedMatchIds]);

  // Si hay match_id en la query, selecciona solo esos
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ids = params.getAll("match_id").map(Number);
    if (ids.length > 0) setSelectedMatchIds(ids);
  }, [location.search]);

  // 3. Handler para filtrar partidos
  const handleToggleMatch = (matchId) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId]
    );
  };

  // 4. Handler para reproducir evento (elige el video correcto)
  const handleEventClick = (event) => {
    setVideoSrc(event?.VIDEO || "");
    setCurrentEvent(event);
  };

  // 5. Aplica los filtros cada vez que cambian los filtros o los eventos base
  useEffect(() => {
    if (filterDescriptors.length === 0) {
      setFilteredEvents(allEvents);
      return;
    }
    let result = allEvents;
    filterDescriptors.forEach(({ descriptor, value }) => {
      result = result.filter(ev => ev[descriptor] === value);
    });
    setFilteredEvents(result);
  }, [allEvents, filterDescriptors]);

  // Handler para aplicar filtros desde los charts
  const handleApplyFilter = useCallback((descriptor, value) => {
    setFilterDescriptors((prev) => [...prev, { descriptor, value }]);
  }, []);

  // Handler para limpiar filtros (puedes llamarlo desde la UI si lo necesitas)
  const handleClearFilters = useCallback(() => {
    setFilterDescriptors([]);
  }, []);

  return (
    <Layout
      title="Reporte MultiMatch"
      subtitle="Compará eventos entre varios partidos en una sola vista"
      breadcrumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "MultiMatch" },
      ]}
    >
      <div className="space-y-6">
        <MultiMatchHeader
          matches={matches}
          selectedMatchIds={selectedMatchIds}
          onToggleMatch={handleToggleMatch}
        />
        <div style={{ margin: "20px 0" }}>
          {currentEvent && (
            <VideoPlayer
              src={videoSrc}
              tempTime={currentEvent.SECOND}
              duration={currentEvent.DURATION}
              isPlayingFilteredEvents={false}
              onTimeUpdate={() => {}}
              onEnd={() => {}}
              onStop={() => setCurrentEvent(null)}
              onNext={() => {}}
              onPrevious={() => {}}
              onPlayFilteredEvents={() => {}}
            />
          )}
        </div>
        <div className="charts-container">
          <Charts
            events={allEvents}
            filteredEvents={filteredEvents}
            setFilteredEvents={setFilteredEvents}
            filterDescriptors={filterDescriptors}
            setFilterDescriptors={setFilterDescriptors}
            onEventClick={handleEventClick}
          />
        </div>
      </div>
    </Layout>
  );
};

export default MultiMatchReportPage;
