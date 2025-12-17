import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  category?: string; // PENALTY / FREE-KICK / CARD etc.
  title?: string;
  tabId?: string;
  onChartClick: (...args: any[]) => void;
}

const PenaltiesTeamPieChart: React.FC<Props> = ({
  events,
  category = 'PENALTY',
  title = 'Eventos por equipo',
  tabId = 'penalties-tab',
  onChartClick,
}) => {
  const [chartData, setChartData] = useState<any>(null);
  const [totals, setTotals] = useState({ our: 0, opp: 0 });

  useEffect(() => {
    const filtered = events.filter((ev) => matchesCategory(ev, category));
    const ourCount = filtered.filter((ev) => !isOpponentEvent(ev)).length;
    const oppCount = filtered.filter((ev) => isOpponentEvent(ev)).length;
    if (ourCount + oppCount === 0) {
      setChartData(null);
      return;
    }
    setTotals({ our: ourCount, opp: oppCount });
    setChartData({
      labels: ['Nuestro equipo', 'Rival'],
      datasets: [
        {
          data: [ourCount, oppCount],
          backgroundColor: ['rgba(59, 130, 246, 0.85)', 'rgba(248, 113, 113, 0.85)'],
          hoverBackgroundColor: ['rgba(59, 130, 246, 1)', 'rgba(248, 113, 113, 1)'],
        },
      ],
    });
  }, [events, category]);

  if (!chartData) return null;

  const handleClick = (event: any, elements: any[]) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const teamSide = idx === 1 ? 'OPPONENT' : 'OUR_TEAM';
    const filters = [
      { descriptor: 'CATEGORY', value: category },
      { descriptor: 'TEAM_SIDE', value: teamSide },
    ];
    onChartClick(event, elements, chart, 'team', tabId, filters);
  };

  const centerTextPlugin = {
    id: 'penaltiesCenterText',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const meta = chart.getDatasetMeta?.(0);
      const firstArc = meta?.data?.[0];
      const centerX = firstArc?.x ?? chartArea.left + chartArea.width / 2;
      const centerY = firstArc?.y ?? chartArea.top + chartArea.height / 2;

      ctx.save();
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Nos: ${totals.our}`, centerX, centerY - 10);
      ctx.fillStyle = '#dc2626';
      ctx.fillText(`Rival: ${totals.opp}`, centerX, centerY + 10);
      ctx.restore();
    },
  };

  return (
    <div className="h-64">
      <Doughnut
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { position: 'top' as const },
            title: { display: true, text: title },
          },
          onClick: handleClick,
        }}
        plugins={[centerTextPlugin]}
      />
    </div>
  );
};

export default PenaltiesTeamPieChart;
