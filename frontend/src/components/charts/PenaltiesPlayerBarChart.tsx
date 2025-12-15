import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory } from '@/utils/eventUtils';

interface Props {
  events: any[];
  category?: string; // 'PENALTY' o 'FREE-KICK'
  title?: string;
  tabId?: string;
  onChartClick: (...args: any[]) => void;
}

const PenaltiesPlayerBarChart: React.FC<Props> = ({ events, category = 'PENALTY', title = 'Penales por Jugador', tabId = 'penalties-tab', onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

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

    const aliases = category === 'FREE-KICK'
      ? ['FREE KICK', 'FREEKICK', 'FREE-KICK RIVAL', 'FREE KICK RIVAL', 'FREEKICK RIVAL']
      : [];
    const penalEvents = events.filter(event => matchesCategory(event, category, aliases));
    const playerLabels = [...new Set(penalEvents.map(getPlayerName).filter(p => p !== null))].sort();
    if (playerLabels.length === 0) {
      setChartData(null);
      return;
    }

    const data = {
      labels: playerLabels,
      datasets: [{
        label: title,
        data: playerLabels.map(player => 
          penalEvents.filter(event => getPlayerName(event) === player).length
        ),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      }],
    };

    setChartData(data);
  }, [events, category, title]);

  const handleChartClick = (event: any, elements: any[]) => {
    if (!elements || elements.length === 0 || !chartData) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.labels?.[dataIndex];

    const additionalFilters = [
      { descriptor: 'JUGADOR', value: label },
      { descriptor: 'CATEGORY', value: category },
    ];
    onChartClick(event, elements, chart, 'player', tabId, additionalFilters);
  };

  const horizontal = (chartData?.labels?.length || 0) > 8;

  const chartOptions = {
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: title },
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

export default PenaltiesPlayerBarChart;
