import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, pickValue, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const OpenPlayKicksChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isOpenKick = (ev: any) =>
      matchesCategory(ev, 'KICK', ['OPEN-PLAY-KICK', 'PLAY-KICK', 'PATADA', 'KICKING', 'KICK-OPEN']) &&
      !matchesCategory(ev, 'GOAL-KICK', ['CONVERSION', 'PENAL', 'PENALTY', 'DROP GOAL']);

    const kickEvents = events.filter(isOpenKick);
    if (kickEvents.length === 0) {
      setChartData(null);
      return;
    }

    const typeFor = (ev: any) => {
      const raw = pickValue(ev, ['KICK_TYPE', 'TIPO-PATADA', 'TIPO_PATADA', 'tipo_patada', 'PIE', 'KICK', 'TYPE', 'SUBTYPE']);
      const s = String(raw || '').trim();
      if (!s) return 'Otro';
      return s;
    };

    const labels = Array.from(new Set(kickEvents.map(typeFor)));
    const ourData = labels.map((l) => kickEvents.filter((ev) => typeFor(ev) === l && !isOpponentEvent(ev)).length);
    const oppData = labels.map((l) => kickEvents.filter((ev) => typeFor(ev) === l && isOpponentEvent(ev)).length);

    setChartData({
      labels,
      datasets: [
        { label: 'Nuestro equipo', data: ourData, backgroundColor: 'rgba(59,130,246,0.75)' },
        { label: 'Rival', data: oppData, backgroundColor: 'rgba(248,113,113,0.75)' },
      ],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length || !chartData) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData.labels[idx];
    const datasetIndex = elements[0].datasetIndex ?? elements[0].element?.datasetIndex ?? 0;
    const side = datasetIndex === 1 ? 'OPPONENT' : 'OUR';
    const filters = [
      { descriptor: 'CATEGORY', value: 'KICK' },
      { descriptor: 'KICK_TYPE', value: label },
      { descriptor: 'TEAM_SIDE', value: side },
    ];
    onChartClick(event, elements, chart, 'kick', 'openkicks-tab', filters);
  };

  if (!chartData) return <div>No data for OpenPlayKicksChart</div>;

  return (
    <div className="h-80">
      <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Patadas en juego abierto (tipo por equipo)' } },
          onClick: handleClick,
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
        }}
      />
    </div>
  );
};

export default OpenPlayKicksChart;
