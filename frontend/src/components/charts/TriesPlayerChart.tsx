import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const TriesPlayerChart = ({ events, onChartClick }: any) => {
  const [triesPlayerChartData, setTriesPlayerChartData] = useState(null);

  useEffect(() => {
    const getPointType = (event: any) => {
      if (!event) return '';
      if (event.POINTS) return String(event.POINTS).toUpperCase();
      if (event.PUNTOS) return String(event.PUNTOS).toUpperCase();
      const ed = event.extra_data || {};
      const candidates = [ed['TIPO-PUNTOS'], ed['TIPO_PUNTOS'], ed['tipo_puntos'], ed['TIPO-PUNTO'], ed['PUNTOS'], ed['TIPO'], ed['type_of_points'], ed['type']];
      for (const c of candidates) {
        if (c !== undefined && c !== null) {
          const s = String(c).trim();
          if (s.length > 0) return s.toUpperCase();
        }
      }
      return '';
    };

    const triesEvents = events.filter((event) => {
      const pt = getPointType(event);
      return pt && pt.includes('TRY');
    });

    // Función para obtener el jugador del evento
    const getPlayerName = (event: any) => {
      // Prioridad 1: players (array desde API base_de_datos)
      if (event.players && Array.isArray(event.players) && event.players.length > 0) {
        return event.players[0]; // Tries siempre es individual
      }
      // Prioridad 2: PLAYER (puede ser array o string)
      if (event.PLAYER) {
        return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
      }
      // Prioridad 3-5: campos legacy
      return event.player_name || 
             event.JUGADOR || 
             event.extra_data?.JUGADOR || 
             event.extra_data?.PLAYER || 
             null;
    };

    const playerLabels = [
      ...new Set(triesEvents.map(getPlayerName).filter(player => player && player !== 'none')),
    ].sort((a: any, b: any) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
      return String(a).localeCompare(String(b));
    });
    

    const data = {
      labels: playerLabels,
      datasets: [
      {
      label: "Tries por jugador",
      data: playerLabels.map((player) => {
      const totalTries = triesEvents
        .filter((event) => {
          const playerName = getPlayerName(event);
          const team = event.team || event.TEAM || event.extra_data?.EQUIPO;
          return playerName === player && team !== "OPPONENT" && team !== "RIVAL";
        })
        .length;
      return totalTries;
      }),
      backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
      ],
    };

    setTriesPlayerChartData(data);
  }, [events]);

  const handleChartClick = (event, elements) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const el = elements[0];
    const dataIndex = el.index ?? el.element?.index ?? el.element?.$context?.dataIndex ?? el.element?.$context?.dataIndex;
    const label = triesPlayerChartData?.labels?.[dataIndex];
    
    const getPlayerNameForFilter = (event: any) => {
      // Misma lógica que getPlayerName original
      if (event.players && Array.isArray(event.players) && event.players.length > 0) {
        return event.players[0];
      }
      if (event.PLAYER) {
        return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
      }
      return event.player_name || 
             event.JUGADOR || 
             event.extra_data?.JUGADOR || 
             event.extra_data?.PLAYER || 
             null;
    };
    
    const filteredEvents = events.filter(ev => getPlayerNameForFilter(ev) === label);
    const additionalFilters = label ? [{ descriptor: 'JUGADOR', value: label }] : [];
    onChartClick(event, elements, chart, 'player', 'tries-tab', additionalFilters, filteredEvents);
  };

  // Decide orientation based on number of players to avoid label overlap
  const horizontal = (triesPlayerChartData?.labels?.length || 0) > 8;

  const triesPlayerChartOptions = {
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Tries por Jugador',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label;
            const value = context.raw;
            return `${label}: ${value}`;
          },
        },
      },
      datalabels: {
        color: 'grey',
        formatter: (value: any, context: any) => {
          try {
            const meta = context?.chart?.getDatasetMeta(context.datasetIndex);
            if (!meta || !meta.data) return '';
            const point = meta.data[context.dataIndex];
            const hidden = point?.hidden;
            return hidden || value === 0 ? '' : value;
          } catch (e) {
            return '';
          }
        },
        font: {
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      x: horizontal ? { stacked: true } : { stacked: true, ticks: { maxRotation: 45, autoSkip: true } },
      y: horizontal ? { stacked: true, ticks: { autoSkip: true, maxTicksLimit: 12 } } : { stacked: true },
    },
    maintainAspectRatio: false,
    onClick: handleChartClick,
  };

  // Provide a container with min/max height to avoid overlap with surrounding UI
  const containerStyle: React.CSSProperties = horizontal
    ? { minHeight: '300px', maxHeight: '640px' }
    : { minHeight: '260px', maxHeight: '420px' };

  return triesPlayerChartData ? (
    <div style={containerStyle}>
      <Bar data={triesPlayerChartData} options={triesPlayerChartOptions as any} />
    </div>
  ) : null;
};

export default TriesPlayerChart;
