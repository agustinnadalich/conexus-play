import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Cambia esta línea
import { library } from '@fortawesome/fontawesome-svg-core';
import { faBars, faTimes, faPlay, faPause, faStop, faForward, faBackward, faExternalLinkAlt, faStepBackward, faStepForward, faChevronLeft, faFilter, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import VideoPlayer from "../components/VideoPlayer.tsx";
import Charts from "../components/Charts.tsx";
import MatchReportLeft from "../components/MatchReportLeft.tsx";
import MatchReportRight from "../components/MatchReportRight.tsx";
import Header from "../components/Header.tsx";
import Sidebar from "../components/Sidebar.tsx";
import { FilterProvider } from "../context/FilterContext.tsx";
import { authFetch } from "@/api/api";
import './VideoAnalysisPage.css';

library.add(faBars, faTimes, faPlay, faPause, faStop, faForward, faBackward, faStepBackward, faStepForward, faChevronLeft, faExternalLinkAlt, faFilter, faSpinner);


const VideoAnalysisPage = () => {
  const { id } = useParams();
  const navigate = useNavigate(); // Nuevo hook para navegación
  const [data, setData] = useState({ events: [], header: {} });
  const [videoSrc, setVideoSrc] = useState(""); // Video dinámico
  const [duration, setDuration] = useState(0);
  const [tempTime, setTempTime] = useState(null);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isPlayingFilteredEvents, setIsPlayingFilteredEvents] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isLoading, setIsLoading] = useState(true); // Estado de carga
  const videoRef = useRef(null);
  const [clearFiltersTrigger, setClearFiltersTrigger] = useState(false);

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        const response = await authFetch(`/matches/${id}/events`);
        const matchData = await response.json();
        console.log("VideoAnalysisPage - Fetched data:", matchData);
        
        // El backend ya devuelve el formato correcto: { events: [...], match_id, total_events }
        const formattedData = {
          events: matchData.events || [],
          header: {},
          match_info: { match_id: matchData.match_id, total_events: matchData.total_events }
        };
        
        console.log("VideoAnalysisPage - Events count:", formattedData.events.length);
        setData(formattedData);
        setVideoSrc(""); // Por ahora vacío hasta que tengamos la URL del video
        console.log("Video URL: (empty for now)");
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching match data:", error);
        setData({ events: [], header: {} }); // Manejo de errores
        setIsLoading(false);
      }
    };

    fetchMatchData();
  }, [id]); // Ejecutar el efecto cada vez que cambie el ID del partido

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const handleEventClick = (event) => {
    console.log("Event data:", event.SECOND, event.DURATION + 3);
    setTempTime(null);
    setTimeout(() => {
      const minutes = Math.floor(event.SECOND / 60);
      const seconds = event.SECOND % 60;
      console.log(`Setting tempTime and duration: ${minutes}:${seconds}, ${event.DURATION + 5}`);
      setTempTime(event.SECOND || 0);
      setDuration(event.DURATION + 5 || 5);
      setIsPlayingFilteredEvents(true);
    }, 10);
  };

  const handlePlayFilteredEvents = (events) => {
    console.log("Playing filtered events:", events);
    console.log("Filtered events count received:", events.length);
    setFilteredEvents(events);
    setCurrentEventIndex(0);
    setIsPlayingFilteredEvents(true);
    playNextEvent(events, 0);
  };

  const playNextEvent = (events, index) => {
    if (index < events.length) {
      const event = events[index];
      console.log("Playing next event:", event);
      setTempTime(null);
      setTimeout(() => {
        console.log("Setting tempTime and duration for next event:", event.SECOND, event.DURATION + 5);
        setTempTime(event.SECOND || 0);
        setDuration(event.DURATION + 5 || 5);
        setIsPlayingFilteredEvents(true);
      }, 10);
    } else {
      setIsPlayingFilteredEvents(false);
    }
  };

  const handleStop = () => {
    setIsPlayingFilteredEvents(false);
  };

  const handleNext = () => {
    if (currentEventIndex < filteredEvents.length - 1) {
      playNextEvent(filteredEvents, currentEventIndex + 1);
      setCurrentEventIndex(currentEventIndex + 1);
    }
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handlePrevious = () => {
    if (currentEventIndex > 0) {
      playNextEvent(filteredEvents, currentEventIndex - 1);
      setCurrentEventIndex(currentEventIndex - 1);
    }
  };

  const handleClearFilters = () => {
    console.log("Filters cleared from App.js");
    setFilteredEvents(data.events); // Restablece los eventos filtrados a todos los eventos
    setClearFiltersTrigger((prev) => !prev); // Cambia el estado para notificar a Sidebar
  };

  useEffect(() => {
    if (isPlayingFilteredEvents && tempTime !== null) {
      const timer = setTimeout(() => {
        setCurrentEventIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex < filteredEvents.length) {
            playNextEvent(filteredEvents, nextIndex);
          } else {
            setIsPlayingFilteredEvents(false);
          }
          return nextIndex;
        });
      }, (duration + 1) * 1000);

      return () => clearTimeout(timer);
    }
  }, [tempTime, isPlayingFilteredEvents, filteredEvents, duration]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <FilterProvider initialResponse={data}>
      <div className="app-container">
        <Header />
        <button
          className={`toggle-sidebar-button ${!isSidebarVisible ? 'visible' : 'hidden'}`}
          onClick={() => navigate('/')} // Botón para volver a home/dashboard
          style={{ width: '100px', margin: '5px', padding: '5px' }}
        >
          <FontAwesomeIcon icon="chevron-left" /> Dashboard
        </button>
        <button
          className={`toggle-sidebar-button ${!isSidebarVisible ? 'visible' : 'hidden'}`}
          onClick={toggleSidebar}
          style={{ width: '100px', margin: '5px', padding: '5px' }}
        >
          <FontAwesomeIcon icon="filter" /> Filters
        </button>
        <button
          className={`toggle-sidebar-button ${!isSidebarVisible ? 'visible' : 'hidden'}`}
          onClick={handleClearFilters} // Llama a la función directamente
          style={{ width: '100px', margin: '5px', padding: '5px' }}
        >
          Clear Filters
        </button>
        <div className="content-container">
          {isLoading ? (
            <div className="loading-container">
              <FontAwesomeIcon icon="spinner" spin size="3x" />
              <p>Loading match events...</p>
            </div>
          ) : (
            <>
              <div className={`sidebar-container ${isSidebarVisible ? 'visible' : ''}`}>
                <Sidebar
                  sidebarOpen={isSidebarVisible}
                  setSidebarOpen={setIsSidebarVisible}
                />
              </div>
              <div className="main-content">
                <div className="stats-container">
                  <div className="left">
                    <MatchReportLeft data={filteredEvents.length > 0 ? filteredEvents : data.events} />
                  </div>
                  <div className="video">
                    <VideoPlayer
                      videoUrl={videoSrc} 
                    />
                  </div>
                  <div className="right">
                    <MatchReportRight data={data.events} />
                  </div>
                </div>
                <div className="charts-container">
                  <Charts />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </FilterProvider>
  );
};

export default VideoAnalysisPage;
