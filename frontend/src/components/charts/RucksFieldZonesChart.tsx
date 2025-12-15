import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const zoneRanges = [
  { label: 'In-goal propio a 22', min: -100, max: -78 },
  { label: '22 propia a mitad', min: -77, max: -50 },
  { label: 'Mitad a 22 rival', min: -49, max: -22 },
  { label: '22 rival a in-goal', min: -21, max: 100 },
];

// Longitud según Scatter: x = -COORDINATE_Y; fallback en COORDINATE_X sin invertir
const getLongitudinalCoord = (ev: any): number | null => {
  const candidatesY = [ev.COORDINATE_Y, ev.pos_y, ev.y, ev.extra_data?.COORDINATE_Y, ev.extra_data?.pos_y, ev.extra_data?.y];
  for (const c of candidatesY) {
    if (c === undefined || c === null || c === "") continue;
    const n = Number(c);
    if (!Number.isNaN(n)) return -n;
  }
  // Si no hay Y, no inferir desde X para evitar falsos positivos
  return null;
};

const getZoneIndex = (length: number | null): number | null => {
  if (length === null || Number.isNaN(length)) return null;
  const idx = zoneRanges.findIndex(z => length >= z.min && length < z.max);
  return idx >= 0 ? idx : null;
};

const RucksFieldZonesChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const rucks = events.filter(ev => matchesCategory(ev, 'RUCK', ['RUCKS', 'RACK', 'RUK']));
    const rucksWithPos = rucks.filter(r => getLongitudinalCoord(r) !== null);
    if (rucksWithPos.length === 0) {
      setChartData(null);
      return;
    }

    const countsOur = zoneRanges.map((_, idx) => rucksWithPos.filter(ev => {
      const x = getLongitudinalCoord(ev);
      const zoneIdx = getZoneIndex(x);
      return zoneIdx === idx && !isOpponentEvent(ev);
    }).length);
    const countsOpp = zoneRanges.map((_, idx) => rucksWithPos.filter(ev => {
      const x = getLongitudinalCoord(ev);
      const zoneIdx = getZoneIndex(x);
      return zoneIdx === idx && isOpponentEvent(ev);
    }).length);

    const total = countsOur.reduce((a, b) => a + b, 0) + countsOpp.reduce((a, b) => a + b, 0);
    if (total === 0) {
      setChartData(null);
      return;
    }

    const percOur = countsOur.map(c => Number(((c / total) * 100).toFixed(1)));
    const percOpp = countsOpp.map(c => Number(((c / total) * 100).toFixed(1)));
    const overallPerc = countsOur.map((c, idx) => Number((((c + countsOpp[idx]) / total) * 100).toFixed(1)));
    const ourTotal = countsOur.reduce((a, b) => a + b, 0);
    const oppTotal = countsOpp.reduce((a, b) => a + b, 0);
    const percOurOfTeam = countsOur.map(c => ourTotal > 0 ? Number(((c / ourTotal) * 100).toFixed(1)) : 0);
    const percOppOfTeam = countsOpp.map(c => oppTotal > 0 ? Number(((c / oppTotal) * 100).toFixed(1)) : 0);

    const labels = zoneRanges.map(z => z.label);
    setChartData({
      labels,
      datasets: [
        { label: 'Nuestro equipo', data: percOur, backgroundColor: 'rgba(59,130,246,0.75)' },
        { label: 'Rival', data: percOpp, backgroundColor: 'rgba(248,113,113,0.75)' },
      ],
      totals: { total, our: ourTotal, opp: oppTotal, overallPerc, percOurOfTeam, percOppOfTeam },
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length || !chartData) return;
    const chart = elements[0].element?.$context?.chart;
    const idx = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const datasetIndex = elements[0].datasetIndex ?? 0;
    const label = chartData.labels[idx];
    const side = datasetIndex === 1 ? 'OPPONENT' : 'OUR';
    const filters = [
      { descriptor: 'CATEGORY', value: 'RUCK' },
      { descriptor: 'FIELD_ZONE', value: label },
      { descriptor: 'TEAM_SIDE', value: side },
    ];
    onChartClick(event, elements, chart, 'ruck-zone', 'possession-tab', filters);
  };

  if (!chartData) return null;
  const totals = (chartData as any).totals || { total: 0, our: 0, opp: 0, overallPerc: [], percOurOfTeam: [], percOppOfTeam: [] };
  const labels: string[] = chartData.labels || [];

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-700">
        Rucks totales: <strong>{totals.total}</strong> (Nosotros: {totals.our} · Rival: {totals.opp})
      </div>

      {/* Mini-cancha dividida en 4 con porcentajes */}
      <div className="w-full rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-4">
          {labels.map((label, idx) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center gap-1 py-3 px-2 bg-gradient-to-b from-green-50 to-green-100 border-r border-gray-200 last:border-r-0"
            >
              <div className="text-[11px] text-gray-600 text-center leading-tight">{label}</div>
              <div className="text-lg font-semibold text-gray-900">{totals.overallPerc?.[idx] ?? 0}%</div>
              <div className="text-[11px] text-blue-700">Nos: {totals.percOurOfTeam?.[idx] ?? 0}%</div>
              <div className="text-[11px] text-red-600">Riv: {totals.percOppOfTeam?.[idx] ?? 0}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-64">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              title: { display: true, text: 'Rucks por zona (% del total filtrado)' },
              tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}% del total` } },
            },
            onClick: handleClick,
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } } },
          }}
        />
      </div>
    </div>
  );
};

export default RucksFieldZonesChart;
