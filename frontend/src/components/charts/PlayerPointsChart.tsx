import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const PlayerPointsChart = ({ events, onChartClick }) => {
  const [playerPointsChartData, setPlayerPointsChartData] = useState(null);

  useEffect(() => {
    const pointsEvents = events.filter((event) => event && (event.CATEGORY === "POINTS" || event.event_type === 'POINTS'));

    // Extract player identifier from multiple possible fields and normalize to string
    const rawPlayers = pointsEvents.map((event) => {
      // Prioridad 1: players (array desde API base_de_datos)
      if (event.players && Array.isArray(event.players) && event.players.length > 0) {
        return event.players[0]; // Points siempre es individual, tomar primer jugador
      }
      // Prioridad 2: PLAYER (main branch)
      if (event.PLAYER !== undefined && event.PLAYER !== null) {
        return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
      }
      // Prioridad 3: player_name
      if (event.player_name) return event.player_name;
      // Prioridad 4: extra_data.JUGADOR
      if (event.extra_data?.JUGADOR) return event.extra_data.JUGADOR;
      return null;
    }).filter(p => p !== null && p !== undefined);

  const playerLabels = [...new Set(rawPlayers.map(p => String(p).trim()))].sort((a, b) => String(a).localeCompare(String(b)));

    const getPointType = (ev:any) => {
      return ev?.POINTS
        ?? ev?.PUNTOS
        ?? ev?.extra_data?.POINTS
        ?? ev?.extra_data?.['TIPO-PUNTOS']
        ?? ev?.extra_data?.TIPO_PUNTOS
        ?? ev?.extra_data?.PUNTOS
        ?? ev?.TIPO_PUNTOS
        ?? ev?.['TIPO-PUNTOS']
        ?? ev?.MISC
        ?? ev?.extra_data?.MISC
        ?? null;
    };

    const getPointsValue = (ev:any) => {
      const type = String(getPointType(ev) ?? '').toUpperCase();
      if (!type) return 0;
      if (type.includes('TRY')) return 5;
      if (type.includes('CONVERSION') || type.includes('CONVERT')) return 2;
      if (type.includes('PENALTY') || type.includes('PENAL')) return 3;
      if (type.includes('DROP')) return 3;
      // fallback: sometimes numeric may exist under other keys
      const v = ev?.["POINTS(VALUE)"] ?? ev?.["POINTS_VALUE"] ?? ev?.["POINTS VALUE"] ?? ev?.["POINTS"] ?? ev?.PUNTOS ?? ev?.extra_data?.PUNTOS ?? 0;
      const num = Number(v);
      return Number.isFinite(num) ? num : 0;
    };

    // Determine distinct point types present
    const pointTypes = [...new Set(pointsEvents.map(ev => String(getPointType(ev) ?? 'UNKNOWN')).filter(p => p && p !== 'null' && p !== 'undefined'))];

    // For each point type, create a dataset with values per player
    const datasets = pointTypes.map((ptype, idx) => {
      const dataForType = playerLabels.map((playerLabel) => {
        const total = pointsEvents
          .filter((event) => {
            // Extraer jugador con la misma lógica que rawPlayers
            let playerName = null;
            if (event.players && Array.isArray(event.players) && event.players.length > 0) {
              playerName = event.players[0];
            } else if (event.PLAYER !== undefined && event.PLAYER !== null) {
              playerName = Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
            } else if (event.player_name) {
              playerName = event.player_name;
            } else if (event.extra_data?.JUGADOR) {
              playerName = event.extra_data.JUGADOR;
            }
            return String(playerName ?? '').trim() === playerLabel;
          })
          .filter(ev => String(getPointType(ev) ?? '').toUpperCase() === String(ptype).toUpperCase())
          .reduce((sum, ev) => sum + getPointsValue(ev), 0);
        return total;
      });
      // choose a color palette per index
      const colors = ["rgba(75,192,192,0.8)", "rgba(54,162,235,0.8)", "rgba(255,99,132,0.8)", "rgba(255,159,64,0.8)", "rgba(153,102,255,0.8)"];
      return {
        label: ptype,
        data: dataForType,
        backgroundColor: colors[idx % colors.length],
        stack: 'points',
      };
    });

    const data = {
      labels: playerLabels,
      datasets,
    };

  // Debug
  // eslint-disable-next-line no-console
  console.log('PlayerPointsChart - playerLabels:', playerLabels, 'datasets summary:', datasets.map(d => ({ label: d.label, total: d.data.reduce((a:any,b:any)=>a+b,0) })));

    setPlayerPointsChartData(data);
  }, [events]);

  const handleChartClick = (event, elements) => {
    if (!elements || elements.length === 0) {
      console.warn('PlayerPointsChart - click handler invoked with empty elements', { event, elements });
      return;
    }
    const el = elements[0];
    const chart = el.element?.$context?.chart ?? (elements[0].element && elements[0].element.$context && elements[0].element.$context.chart);
    if (!chart) {
      console.warn('PlayerPointsChart - unable to extract chart from elements', elements[0]);
      return;
    }
    onChartClick(event, elements, chart, "player", "points-tab"); 
  };

  const playerPointsChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Puntos por Jugador',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label;
            const value = context.raw;
            return `${label}: ${value}`;
          },
        },
      },
      datalabels: {
        color: 'grey',
        formatter: (value, context) => {
          const meta = context.chart.getDatasetMeta(context.datasetIndex);
          const element = meta.data[context.dataIndex];
          const hidden = element ? element.hidden : false;
          return hidden || value === 0 ? '' : value;
        },
        font: {
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
      },
    },
    maintainAspectRatio: false,
    onClick: handleChartClick,
  };

  return playerPointsChartData ? (
    <Bar data={playerPointsChartData} options={playerPointsChartOptions as any} />
  ) : null;
};

export default PlayerPointsChart;
