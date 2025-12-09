import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, pickValue, isOpponentEvent, normalizeBool } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const RucksSpeedChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isRuck = (ev: any) => matchesCategory(ev, 'RUCK', ['RUCKS', 'RAK', 'RACK', 'RUK']);
    const ruckEvents = events.filter(isRuck);
    if (ruckEvents.length === 0) {
      setChartData(null);
      return;
    }

    const speedKey = (ev: any) =>
      pickValue(ev, ['RUCK_SPEED', 'ruck_speed', 'VELOCIDAD-RUCK', 'VELOCIDAD_RUCK', 'VEL_RUCK', 'SPEED', 'speed', 'DURATION', 'duration']);

    const buckets = {
      fast: { our: 0, opp: 0 },
      slow: { our: 0, opp: 0 },
    };

    ruckEvents.forEach((ev) => {
      const side = isOpponentEvent(ev) ? 'opp' : 'our';
      const speed = Number(speedKey(ev) ?? 0);
      const fast = Number.isFinite(speed) ? speed < 3 : false;
      if (fast) buckets.fast[side] += 1;
      else buckets.slow[side] += 1;
    });

    setChartData({
      labels: ['Ruck rápido (<3s)', 'Ruck lento (>=3s)'],
      datasets: [
        {
          label: 'Nuestro equipo',
          data: [buckets.fast.our, buckets.slow.our],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
        },
        {
          label: 'Rival',
          data: [buckets.fast.opp, buckets.slow.opp],
          backgroundColor: 'rgba(248, 113, 113, 0.7)',
        },
      ],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length || !chartData) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData.labels[idx] || '';
    let descriptor = { descriptor: 'CATEGORY', value: 'RUCK' };
    let extra: any = null;
    if (label.toString().includes('rápido')) extra = { descriptor: 'RUCK_SPEED_TAG', value: 'FAST' };
    else if (label.toString().includes('lento')) extra = { descriptor: 'RUCK_SPEED_TAG', value: 'SLOW' };
    else if (label.toString().includes('ganado')) extra = { descriptor: 'RESULT', value: 'WON' };
    else if (label.toString().includes('perdido')) extra = { descriptor: 'RESULT', value: 'LOST' };

    const filters = extra ? [descriptor, extra] : [descriptor];
    onChartClick(event, elements, chart, 'ruck', 'rucks-tab', filters);
  };

  if (!chartData) return <div>No data for RucksSpeedChart</div>;

  return (
    <div className="h-80">
      <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Rucks: velocidad y resultado' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default RucksSpeedChart;
