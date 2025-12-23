import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { matchesCategory, pickValue, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const PossessionShareChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [totals, setTotals] = useState<{ our: number; opp: number; total: number }>({ our: 0, opp: 0, total: 0 });

  useEffect(() => {
    const isAttack = (ev: any) => matchesCategory(ev, 'ATTACK', ['ATTACK', 'ATAQUE']);
    const isDefense = (ev: any) => matchesCategory(ev, 'DEFENSE', ['DEFENSE', 'DEFENSA']);

    const possessionEvents = events.filter(ev => isAttack(ev) || isDefense(ev));
    let ourSeconds = 0;
    let oppSeconds = 0;

    possessionEvents.forEach((ev) => {
      const raw =
        pickValue(ev, ['DURATION', 'duration', 'POSESION_DURACION', 'POSSESSION_DURATION', 'POSESION', 'SECONDS']) ??
        ev?.extra_data?.DURATION;
      let duration = Number(raw);
      if (!Number.isFinite(duration) || duration <= 0) {
        const clipEnd = Number(ev?.extra_data?.clip_end);
        const clipStart = Number(ev?.extra_data?.clip_start);
        if (Number.isFinite(clipEnd) && Number.isFinite(clipStart) && clipEnd > clipStart) {
          duration = clipEnd - clipStart;
        }
      }
      if (!Number.isFinite(duration) || duration < 0) duration = 0;

      if (isDefense(ev) || isOpponentEvent(ev)) oppSeconds += duration;
      else if (isAttack(ev)) ourSeconds += duration;
    });

    const total = ourSeconds + oppSeconds;
    if (total === 0) {
      setChartData(null);
      setTotals({ our: 0, opp: 0, total: 0 });
      return;
    }

    setTotals({ our: ourSeconds, opp: oppSeconds, total });

    const ourPerc = Number(((ourSeconds / total) * 100).toFixed(1));
    const oppPerc = Number(((oppSeconds / total) * 100).toFixed(1));

    setChartData({
      labels: ['Con posesión (nosotros)', 'Con posesión (rival)'],
      datasets: [
        {
          data: [ourPerc, oppPerc],
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
    const side = label.toString().includes('rival') ? 'OPPONENT' : 'OUR_TEAM';
    const filters = [{ descriptor: 'TEAM_SIDE', value: side }];
    onChartClick(event, elements, chart, 'possession', 'possession-tab', filters);
  };

    if (!chartData) return <div className="text-center text-slate-200">No hay datos de ATTACK/DEFENSE para calcular posesión</div>;

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-72 space-y-2">
      <Doughnut
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            title: { display: true, text: 'Posesión (duración de ATTACK/DEFENSE)' },
            tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw}%` } },
          },
          onClick: handleClick,
        }}
      />
      <div className="text-sm text-center text-slate-200">
        Tiempo efectivo jugado: <strong>{formatSeconds(totals.total)}</strong> (Nosotros: {formatSeconds(totals.our)} · Rival: {formatSeconds(totals.opp)})
      </div>
    </div>
  );
};

export default PossessionShareChart;
