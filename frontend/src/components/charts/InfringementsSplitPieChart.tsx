import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

// Pie que separa Penales y Free-kicks por equipo
const InfringementsSplitPieChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isPenalty = (ev: any) => matchesCategory(ev, 'PENALTY', ['PENAL']);
    const isFreeKick = (ev: any) => matchesCategory(ev, 'FREE-KICK', ['FREEKICK', 'FREE KICK']);

    const penalties = events.filter(isPenalty);
    const freekicks = events.filter(isFreeKick);

    if (penalties.length + freekicks.length === 0) {
      setChartData(null);
      return;
    }

    const ourPen = penalties.filter(ev => !isOpponentEvent(ev)).length;
    const oppPen = penalties.filter(ev => isOpponentEvent(ev)).length;
    const ourFk = freekicks.filter(ev => !isOpponentEvent(ev)).length;
    const oppFk = freekicks.filter(ev => isOpponentEvent(ev)).length;

    setChartData({
      labels: ['Penales (Nuestro)', 'Penales (Rival)', 'Free-kicks (Nuestro)', 'Free-kicks (Rival)'],
      datasets: [{
        data: [ourPen, oppPen, ourFk, oppFk],
        backgroundColor: [
          'rgba(59, 130, 246, 0.85)',
          'rgba(248, 113, 113, 0.85)',
          'rgba(59, 130, 246, 0.55)',
          'rgba(248, 113, 113, 0.55)',
        ],
      }],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length || !chartData) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData.labels[idx] || '';
    const isPenalty = label.toString().toUpperCase().includes('PENA');
    const isOur = label.toString().toUpperCase().includes('NUEST');
    const filters = [
      { descriptor: 'CATEGORY', value: isPenalty ? 'PENALTY' : 'FREE-KICK' },
      { descriptor: 'TEAM_SIDE', value: isOur ? 'OUR' : 'OPPONENT' },
    ];
    onChartClick(event, elements, chart, 'infringement-pie', 'infringements-tab', filters);
  };

  if (!chartData) return <div className="text-center py-8 text-gray-500">No hay datos de infracciones</div>;

  return (
    <div className="h-80">
      <Doughnut
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Penales vs Free-kicks por equipo' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default InfringementsSplitPieChart;
