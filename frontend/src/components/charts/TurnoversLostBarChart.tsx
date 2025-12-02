import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const TurnoversLostBarChart = ({ events, onChartClick }: any) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const getPlayerName = (event: any) => {
      if (event.players && Array.isArray(event.players) && event.players.length > 0) {
        return event.players[0];
      }
      if (event.PLAYER) {
        return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
      }
      return event.player_name || event.JUGADOR || event.extra_data?.JUGADOR || event.extra_data?.PLAYER || null;
    };

    const lostEvents = events.filter(event => event.CATEGORY === 'TURNOVER-' || event.event_type === 'TURNOVER-');
    const playerLabels = [...new Set(lostEvents.map(getPlayerName).filter(p => p !== null))].sort();

    const data = {
      labels: playerLabels,
      datasets: [
        {
          label: 'Perdidos',
          data: playerLabels.map(player => 
            lostEvents.filter(event => getPlayerName(event) === player).length
          ),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
        },
      ],
    };

    setChartData(data);
  }, [events]);

  const handleChartClick = (event, elements) => {
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
      return event.player_name || event.JUGADOR || event.extra_data?.JUGADOR || event.extra_data?.PLAYER || null;
    };

    const filteredEvents = events.filter(ev => {
      const playerName = getPlayerNameForFilter(ev);
      const category = ev.CATEGORY || ev.event_type;
      return playerName === label && category === 'TURNOVER-';
    });

    const additionalFilters = [
      { descriptor: 'PLAYER', value: label },
      { descriptor: 'CATEGORY', value: 'TURNOVER-' },
    ];

    onChartClick(event, elements, chart, 'player', 'turnovers-tab', additionalFilters, filteredEvents);
  };

  const horizontal = (chartData?.labels?.length || 0) > 8;

  const chartOptions = {
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Turnovers Perdidos por Jugador',
      },
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

export default TurnoversLostBarChart;
