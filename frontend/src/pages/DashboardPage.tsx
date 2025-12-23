import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import { authFetch } from "@/api/api";

const DashboardPage = () => {
  const [matches, setMatches] = useState([]); // Estado para almacenar los partidos
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await authFetch("/matches"); // Llama al backend
        const data = await response.json();
        setMatches(data.matches || []); // Actualiza el estado con los partidos
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };

    fetchMatches();
  }, []);

  const handleCardClick = (match) => {
    navigate(`/video-analysis/${match.ID_MATCH}`, { state: { match } });
  };

  const handleToggleMatch = (id) => {
    setSelectedMatchIds((prev) =>
      prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
    );
  };

  const handleGoToReport = () => {
    if (selectedMatchIds.length > 0) {
      navigate(`/multi-match-report?${selectedMatchIds.map(id => `match_id=${id}`).join('&')}`);
    }
  };

  return (
    <div className="dashboard-container">
      <h1>San Benedetto Video Analysis</h1>
      <h2>Selecciona partidos para el reporte MultiMatch</h2>
      <div className="cards-container">
        {matches.map((match) => (
          <div key={match.ID_MATCH} className="match-card">
            <h2>{match.TEAM} vs {match.OPPONENT}</h2>
            <p>Fecha: {new Date(match.DATE).toLocaleDateString()}</p>
            <p>Competición: {match.COMPETITION}</p>
            <label>
              <input
                type="checkbox"
                checked={selectedMatchIds.includes(match.ID_MATCH)}
                onChange={() => handleToggleMatch(match.ID_MATCH)}
              />
              Seleccionar para MultiMatch
            </label>
            <button
              style={{ marginTop: 10 }}
              onClick={() => handleCardClick(match)}
            >
              Ver análisis individual
            </button>
          </div>
        ))}
      </div>
      <button onClick={handleGoToReport} disabled={selectedMatchIds.length === 0}>
        Ver Reporte MultiMatchReporte MultiMatch
      </button>
    </div>
  );
};

export default DashboardPage;
