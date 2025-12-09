import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, isOpponentEvent, pickValue } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const MaulsOutcomeChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isMaul = (ev: any) => matchesCategory(ev, 'MAUL', ['MAULS', 'MAULL', 'MAULING']);
    const maulEvents = events.filter(isMaul);
    if (maulEvents.length === 0) {
      setChartData(null);
      return;
    }

    const buckets = {
      positive: { our: 0, opp: 0 },
      neutral: { our: 0, opp: 0 },
      negative: { our: 0, opp: 0 },
    };

    maulEvents.forEach((ev) => {
      const side = isOpponentEvent(ev) ? 'opp' : 'our';
      const result = String(
        pickValue(ev, ['ADVANCE', 'AVANCE', 'RESULT', 'RESULTADO', 'OUTCOME', 'STATUS']) || ''
      ).toUpperCase();
      if (result.includes('POS') || result.includes('GAN')) buckets.positive[side] += 1;
      else if (result.includes('NEG') || result.includes('PERD')) buckets.negative[side] += 1;
      else buckets.neutral[side] += 1;
    });

    setChartData({
      labels: ['Avance positivo', 'Neutro', 'Negativo'],
      datasets: [
        { label: 'Nuestro equipo', data: [buckets.positive.our, buckets.neutral.our, buckets.negative.our], backgroundColor: 'rgba(59, 130, 246, 0.7)' },
        { label: 'Rival', data: [buckets.positive.opp, buckets.neutral.opp, buckets.negative.opp], backgroundColor: 'rgba(248, 113, 113, 0.7)' },
      ],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length || !chartData) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData.labels[idx] || '';
    const value = label.toString().toUpperCase().includes('GAN') ? 'WIN' : label.toString().toUpperCase().includes('PERD') ? 'LOSS' : 'NEUTRAL';
    const filters = [
      { descriptor: 'CATEGORY', value: 'MAUL' },
      { descriptor: 'RESULT', value },
    ];
    onChartClick(event, elements, chart, 'maul', 'mauls-tab', filters);
  };

  if (!chartData) return <div>No data for MaulsOutcomeChart</div>;

  return (
    <div className="h-72">
      <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Mauls: resultado' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default MaulsOutcomeChart;
