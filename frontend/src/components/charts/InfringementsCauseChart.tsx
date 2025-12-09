import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, pickValue, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const InfringementsCauseChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isInfringement = (ev: any) =>
      matchesCategory(ev, 'PENALTY', ['PENAL']) || matchesCategory(ev, 'FREE-KICK', ['FREEKICK', 'FREE KICK']);

    const infrEvents = events.filter(isInfringement);
    if (infrEvents.length === 0) {
      setChartData(null);
      return;
    }

    const causeFor = (ev: any) => {
      const raw = pickValue(ev, ['INFRACCION', 'INFRACTION', 'CAUSE', 'REASON', 'FALTA', 'PENALTY_TYPE', 'TIPO-PENAL']) || '';
      const s = String(raw).trim();
      return s || 'Desconocido';
    };

    const causes = Array.from(new Set(infrEvents.map(causeFor)));
    const ourCounts = causes.map((c) => infrEvents.filter((ev) => causeFor(ev) === c && !isOpponentEvent(ev)).length);
    const oppCounts = causes.map((c) => infrEvents.filter((ev) => causeFor(ev) === c && isOpponentEvent(ev)).length);

    setChartData({
      labels: causes,
      datasets: [
        { label: 'Nuestro equipo', data: ourCounts, backgroundColor: 'rgba(59, 130, 246, 0.75)' },
        { label: 'Rival', data: oppCounts, backgroundColor: 'rgba(248, 113, 113, 0.75)' },
      ],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length || !chartData) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const cause = chartData.labels[idx];
    const filters = [
      { descriptor: 'INFRACCION', value: cause },
    ];
    onChartClick(event, elements, chart, 'infringement', 'infringements-tab', filters);
  };

  if (!chartData) return <div className="text-center py-8 text-gray-500">No hay datos de infracciones</div>;

  return (
    <div className="h-96">
      <Bar
        data={chartData}
        options={{
          indexAxis: 'y' as const,
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Infracciones por causa (Penal + Free-kick)' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default InfringementsCauseChart;
