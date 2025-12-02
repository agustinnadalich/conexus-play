import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const LineBreaksPlayerChart = ({ events, onChartClick, matchInfo }: any) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const getPlayerName = (event: any) => {
      if (event.players && Array.isArray(event.players) && event.players.length > 0) {
        return event.players[0];
      }
      if (event.PLAYER) {
        return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
      }
      return event.extra_data?.JUGADOR || event.extra_data?.PLAYER || event.JUGADOR || 'Sin especificar';
    };

    const getTeam = (event: any) => {
      return event.extra_data?.EQUIPO || event.EQUIPO || '';
    };

    const teamName = matchInfo?.team_name || 'PESCARA';

    const breaks = events.filter((e: any) => {
      const category = e.event_type === 'BREAK' || e.CATEGORY === 'BREAK';
      const team = getTeam(e).toUpperCase();
      return category && team === teamName.toUpperCase();
    });

    const playerCounts: any = {};
    breaks.forEach((event: any) => {
      const player = getPlayerName(event);
      playerCounts[player] = (playerCounts[player] || 0) + 1;
    });

    const players = Object.keys(playerCounts).sort((a, b) => playerCounts[b] - playerCounts[a]);

    const data = {
      labels: players,
      datasets: [{
        label: 'Quiebres',
        data: players.map(p => playerCounts[p]),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
      }],
    };

    setChartData(data);
  }, [events, matchInfo]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.labels?.[dataIndex];

    const getPlayerNameForFilter = (event: any) => {
      if (event.players && Array.isArray(event.players) && event.players.length > 0) {
        return event.players[0];
      }
      if (event.PLAYER) {
        return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
      }
      return event.extra_data?.JUGADOR || event.extra_data?.PLAYER || event.JUGADOR || 'Sin especificar';
    };

    const filteredEvents = events.filter((ev: any) => {
      const playerName = getPlayerNameForFilter(ev);
      const category = ev.CATEGORY || ev.event_type;
      return category === 'BREAK' && playerName === label;
    });

    const additionalFilters = [
      { descriptor: 'PLAYER', value: label }
    ];

    onChartClick(event, elements, chart, 'player', 'linebreaks-tab', additionalFilters, filteredEvents);
  };

  const horizontal = (chartData?.labels?.length || 0) > 8;

  const chartOptions = {
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Quiebres de Línea por Jugador' },
    },
    scales: {
      x: horizontal ? { beginAtZero: true } : {},
      y: horizontal ? {} : { beginAtZero: true },
    },
    onClick: handleChartClick,
  };

  return chartData ? (
    <div style={{ height: '400px' }}>
      <Bar data={chartData} options={chartOptions as any} />
    </div>
  ) : null;
};

export default LineBreaksPlayerChart;
