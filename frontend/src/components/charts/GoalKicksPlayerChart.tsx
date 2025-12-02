import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const GoalKicksPlayerChart = ({ events, onChartClick, matchInfo }: any) => {
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

    const getResult = (event: any) => {
      const result = event.extra_data?.['RESULTADO-PALOS'] || 
                    event.extra_data?.RESULTADO_PALOS || 
                    event.RESULTADO_PALOS ||
                    'UNKNOWN';
      return String(result).toUpperCase();
    };

    const getTeam = (event: any) => {
      return event.extra_data?.EQUIPO || event.EQUIPO || '';
    };

    const teamName = matchInfo?.team_name || 'PESCARA';

    const goalKicks = events.filter((e: any) => {
      const category = e.event_type === 'GOAL-KICK' || e.CATEGORY === 'GOAL-KICK';
      const team = getTeam(e).toUpperCase();
      return category && team === teamName.toUpperCase();
    });

    const playerStats: any = {};
    goalKicks.forEach((event: any) => {
      const player = getPlayerName(event);
      const result = getResult(event);
      
      if (!playerStats[player]) {
        playerStats[player] = { success: 0, fail: 0 };
      }
      
      if (result === 'SUCCESS') {
        playerStats[player].success++;
      } else if (result === 'FAIL') {
        playerStats[player].fail++;
      }
    });

    const players = Object.keys(playerStats).sort();

    const data = {
      labels: players,
      datasets: [
        {
          label: 'Exitosos',
          data: players.map(p => playerStats[p].success),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        },
        {
          label: 'Fallidos',
          data: players.map(p => playerStats[p].fail),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        },
      ],
    };

    setChartData(data);
  }, [events, matchInfo]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const datasetIndex = elements[0].datasetIndex;
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

    const getResult = (event: any) => {
      const result = event.extra_data?.['RESULTADO-PALOS'] || 
                    event.extra_data?.RESULTADO_PALOS || 
                    event.RESULTADO_PALOS ||
                    'UNKNOWN';
      return String(result).toUpperCase();
    };

    const isSuccess = datasetIndex === 0;
    const filteredEvents = events.filter((ev: any) => {
      const playerName = getPlayerNameForFilter(ev);
      const result = getResult(ev);
      const category = ev.CATEGORY || ev.event_type;
      return category === 'GOAL-KICK' && 
             playerName === label && 
             (isSuccess ? result === 'SUCCESS' : result === 'FAIL');
    });

    const additionalFilters = [
      { descriptor: 'PLAYER', value: label },
      { descriptor: 'RESULTADO-PALOS', value: isSuccess ? 'SUCCESS' : 'FAIL' }
    ];

    onChartClick(event, elements, chart, 'player', 'goalkicks-tab', additionalFilters, filteredEvents);
  };

  const horizontal = (chartData?.labels?.length || 0) > 8;

  const chartOptions = {
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Patadas a los Palos por Jugador' },
    },
    scales: {
      x: horizontal ? { stacked: true, beginAtZero: true } : { stacked: true },
      y: horizontal ? { stacked: true } : { stacked: true, beginAtZero: true },
    },
    onClick: handleChartClick,
  };

  return chartData ? (
    <div style={{ height: '400px' }}>
      <Bar data={chartData} options={chartOptions as any} />
    </div>
  ) : null;
};

export default GoalKicksPlayerChart;
