import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const OpenPlayKicksTeamPieChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isOpenKick = (ev: any) =>
      matchesCategory(ev, 'KICK', ['PATADA', 'KICK-OPEN', 'OPEN-PLAY-KICK']) &&
      !matchesCategory(ev, 'GOAL-KICK', ['CONVERSION', 'PENAL', 'PENALTY', 'DROP GOAL']);

    const kickEvents = events.filter(isOpenKick);
    if (kickEvents.length === 0) {
      setChartData(null);
      return;
    }

    const our = kickEvents.filter(ev => !isOpponentEvent(ev)).length;
    const opp = kickEvents.filter(ev => isOpponentEvent(ev)).length;

    setChartData({
      labels: ['Nuestro equipo', 'Rival'],
      datasets: [{
        data: [our, opp],
        backgroundColor: ['rgba(59,130,246,0.85)', 'rgba(248,113,113,0.85)'],
      }],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length || !chartData) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData.labels[idx] || '';
    const side = label.toString().toUpperCase().includes('RIVAL') ? 'OPPONENT' : 'OUR';
    const filters = [
      { descriptor: 'CATEGORY', value: 'KICK' },
      { descriptor: 'TEAM_SIDE', value: side },
    ];
    onChartClick(event, elements, chart, 'openkick-team', 'openkicks-tab', filters);
  };

  if (!chartData) return <div className="text-center py-8 text-gray-500">No hay patadas en juego abierto</div>;

  return (
    <div className="h-64">
      <Doughnut
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Patadas en juego abierto por equipo' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default OpenPlayKicksTeamPieChart;
