import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const ErrorsSummaryChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isKnock = (ev: any) =>
      matchesCategory(ev, 'KNOCK-ON', ['KNOCK ON', 'KNOCKON', 'KNOCKONN', 'KNOCK', 'KNOCKON']) ||
      String(ev?.event_type || '').toUpperCase().includes('KNOCK');
    const isForwardPass = (ev: any) =>
      matchesCategory(ev, 'FORWARD-PASS', ['FORWARD PASS', 'PASE ADELANTADO', 'PASE-DELANTADO', 'PASS FORWARD']) ||
      String(ev?.event_type || '').toUpperCase().includes('FORWARD');

    const knockEvents = events.filter(isKnock);
    const forwardEvents = events.filter(isForwardPass);

    const dataByType = (list: any[]) => ({
      our: list.filter((ev) => !isOpponentEvent(ev)).length,
      opp: list.filter((ev) => isOpponentEvent(ev)).length,
    });

    const knocks = dataByType(knockEvents);
    const forwards = dataByType(forwardEvents);

    setChartData({
      labels: ['Knock-ons', 'Pases adelantados'],
      datasets: [
        {
          label: 'Nuestro equipo',
          data: [knocks.our, forwards.our],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
        },
        {
          label: 'Rival',
          data: [knocks.opp, forwards.opp],
          backgroundColor: 'rgba(248, 113, 113, 0.7)',
        },
      ],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length) return;
    const chart = elements[0].element?.$context?.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.labels?.[dataIndex] || '';
    const type = label.toString().toUpperCase().includes('KNOCK') ? 'KNOCK-ON' : 'FORWARD-PASS';
    const filters = [
      { descriptor: 'CATEGORY', value: type },
    ];
    onChartClick(event, elements, chart, 'error', 'errors-tab', filters);
  };

  if (!chartData) return <div>No data for ErrorsSummaryChart</div>;

  return (
    <div className="h-72">
      <Bar
        data={chartData}
        options={{
          indexAxis: 'y' as const,
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Errores (Knock-on / Pase adelantado)' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default ErrorsSummaryChart;
