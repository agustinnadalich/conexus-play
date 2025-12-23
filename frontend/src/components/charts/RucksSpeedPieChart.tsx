import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { matchesCategory, pickValue, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

// Dos tortas: rucks rápidos vs lentos por equipo, con click-to-filter
const RucksSpeedPieChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [dataOur, setDataOur] = useState<any>(null);
  const [dataOpp, setDataOpp] = useState<any>(null);
  const [totalOur, setTotalOur] = useState<number>(0);
  const [totalOpp, setTotalOpp] = useState<number>(0);

  useEffect(() => {
    const isRuck = (ev: any) => matchesCategory(ev, 'RUCK', ['RUCKS', 'RACK', 'RUK']);
    const speedKey = (ev: any) =>
      pickValue(ev, ['RUCK_SPEED', 'ruck_speed', 'VELOCIDAD-RUCK', 'VELOCIDAD_RUCK', 'VEL_RUCK', 'SPEED', 'speed', 'DURATION', 'duration', 'RUCK']);

    const ruckEvents = events.filter(isRuck);
    if (ruckEvents.length === 0) {
      setDataOur(null);
      setDataOpp(null);
      setTotalOur(0);
      setTotalOpp(0);
      return;
    }

    const countBuckets = (list: any[]) => {
      let fast = 0, slow = 0;
      list.forEach(ev => {
        const raw = speedKey(ev);
        const rawStr = String(raw ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const speedNum = Number(raw);
        const isFast = (Number.isFinite(speedNum) && speedNum < 3) || rawStr.includes('RAPID') || rawStr.includes('FAST');
        if (isFast) fast += 1;
        else slow += 1;
      });
      return { fast, slow };
    };

    const ours = ruckEvents.filter(ev => !isOpponentEvent(ev));
    const opps = ruckEvents.filter(ev => isOpponentEvent(ev));
    setTotalOur(ours.length);
    setTotalOpp(opps.length);
    const cbOur = countBuckets(ours);
    const cbOpp = countBuckets(opps);

    setDataOur({
      labels: ['Rápidos (<3s)', 'Lentos (>=3s)'],
      datasets: [{ data: [cbOur.fast, cbOur.slow], backgroundColor: ['rgba(59,130,246,0.85)', 'rgba(59,130,246,0.45)'] }],
    });
    setDataOpp({
      labels: ['Rápidos (<3s)', 'Lentos (>=3s)'],
      datasets: [{ data: [cbOpp.fast, cbOpp.slow], backgroundColor: ['rgba(248,113,113,0.85)', 'rgba(248,113,113,0.45)'] }],
    });
  }, [events]);

  const handleClick = (side: 'OUR' | 'OPP', label: string, event: any, elements: any[]) => {
    if (!elements?.length) return;
    const chart = elements[0].element?.$context?.chart;
    const isFast = label.toUpperCase().includes('RÁPID') || label.toUpperCase().includes('FAST');
    const filters = [
      { descriptor: 'CATEGORY', value: 'RUCK' },
      { descriptor: 'RUCK_SPEED_TAG', value: isFast ? 'FAST' : 'SLOW' },
      { descriptor: 'TEAM_SIDE', value: side },
    ];
    onChartClick(event, elements, chart, 'ruck-speed', 'rucks-tab', filters);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
      <div className="md:col-span-1 text-center space-y-2">
    <div className="text-sm text-slate-200">Rucks por equipo</div>
        <div className="text-lg font-semibold text-blue-700">Nosotros: {totalOur}</div>
        <div className="text-lg font-semibold text-red-500">Rival: {totalOpp}</div>
      </div>
      <div className="h-64">
        {dataOur ? (
          <Doughnut
            data={dataOur}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { title: { display: true, text: 'Rucks - Nuestro equipo' } },
              onClick: (event, elements) => {
                const idx = elements?.[0]?.index ?? elements?.[0]?.element?.$context?.dataIndex;
                const label = dataOur.labels?.[idx];
                handleClick('OUR', label || '', event, elements);
              },
            }}
          />
        ) : (
          <div className="text-center text-gray-500">Sin rucks</div>
        )}
      </div>
      <div className="h-64">
        {dataOpp ? (
          <Doughnut
            data={dataOpp}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { title: { display: true, text: 'Rucks - Rival' } },
              onClick: (event, elements) => {
                const idx = elements?.[0]?.index ?? elements?.[0]?.element?.$context?.dataIndex;
                const label = dataOpp.labels?.[idx];
                handleClick('OPP', label || '', event, elements);
              },
            }}
          />
        ) : (
          <div className="text-center text-gray-500">Sin rucks</div>
        )}
      </div>
    </div>
  );
};

export default RucksSpeedPieChart;
