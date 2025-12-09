import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, getPlayerName, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

// Barras por jugador, separadas por equipo (stacked)
const OpenPlayKicksPlayerChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isOpenKick = (ev: any) =>
      matchesCategory(ev, 'KICK', ['PATADA', 'KICK-OPEN', 'OPEN-PLAY-KICK']) &&
      !matchesCategory(ev, 'GOAL-KICK', ['CONVERSION', 'PENAL', 'PENALTY', 'DROP GOAL']);

    const kickEvents = events.filter(isOpenKick);
    const ourPlayers = Array.from(new Set(kickEvents.filter(ev => !isOpponentEvent(ev)).map(getPlayerName).filter(Boolean) as string[]));
    if (ourPlayers.length === 0) {
      setChartData(null);
      return;
    }

    const ourData = ourPlayers.map(p => kickEvents.filter(ev => getPlayerName(ev) === p && !isOpponentEvent(ev)).length);

    setChartData({
      labels: ourPlayers,
      datasets: [
        { label: 'Nuestro equipo', data: ourData, backgroundColor: 'rgba(59,130,246,0.75)' },
      ],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length || !chartData) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const player = chartData.labels[idx];
    const filters = [
      { descriptor: 'CATEGORY', value: 'KICK' },
      { descriptor: 'JUGADOR', value: player },
    ];
    onChartClick(event, elements, chart, 'openkick-player', 'openkicks-tab', filters);
  };

  if (!chartData) return <div className="text-center py-8 text-gray-500">No hay patadas con jugadores identificados</div>;

  const horizontal = (chartData.labels?.length || 0) > 6;

  return (
    <div className="h-80">
      <Bar
        data={chartData}
        options={{
          indexAxis: horizontal ? 'y' as const : 'x' as const,
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Patadas en juego abierto por jugador' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default OpenPlayKicksPlayerChart;
