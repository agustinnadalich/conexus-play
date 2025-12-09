import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { matchesCategory, pickValue, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const PossessionShareChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isPossessionEvt = (ev: any) =>
      matchesCategory(ev, 'POSSESSION', ['POSESION', 'POSSESSION_START', 'POSSESSION-END', 'ATTACK', 'DEFENSE', 'DEFENSA', 'ATAQUE']);

    const possessionEvents = events.filter(isPossessionEvt);
    let ourSeconds = 0;
    let oppSeconds = 0;

    if (possessionEvents.length > 0) {
      possessionEvents.forEach((ev) => {
        const duration =
          Number(
            pickValue(ev, ['DURATION', 'duration', 'POSESION_DURACION', 'POSSESSION_DURATION', 'POSESION', 'SECONDS']) ||
              ev?.extra_data?.DURATION ||
              0
          ) || 0;
        const isDefense = matchesCategory(ev, 'DEFENSE', ['DEFENSA']);
        const isAttack = matchesCategory(ev, 'ATTACK', ['ATAQUE']);
        if (isOpponentEvent(ev) || isDefense) oppSeconds += Math.max(duration, 1);
        else if (isAttack) ourSeconds += Math.max(duration, 1);
        else ourSeconds += Math.max(duration, 1);
      });
    } else {
      // Fallback: usar el total de eventos como proxy de posesión (cuando no hay marcadores explícitos)
      events.forEach((ev) => {
        if (isOpponentEvent(ev)) oppSeconds += 1;
        else ourSeconds += 1;
      });
    }

    if (ourSeconds + oppSeconds === 0) {
      setChartData(null);
      return;
    }

    setChartData({
      labels: ['Con posesión (nosotros)', 'Con posesión (rival)'],
      datasets: [
        {
          data: [ourSeconds, oppSeconds],
          backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(248, 113, 113, 0.8)'],
        },
      ],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length || !chartData) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData.labels[idx];
    const side = label.toString().includes('rival') ? 'OPPONENT' : 'OUR';
    const filters = [{ descriptor: 'POSSESSION_SIDE', value: side }];
    onChartClick(event, elements, chart, 'possession', 'possession-tab', filters);
  };

  if (!chartData) return <div>No data for PossessionShareChart</div>;

  return (
    <div className="h-72">
      <Doughnut
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Posesión (proxy por eventos/duración)' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default PossessionShareChart;
