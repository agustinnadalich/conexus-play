import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Scatter } from 'react-chartjs-2';
import { Chart } from 'chart.js';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';

// Plugin para imagen de fondo
const backgroundImagePlugin = {
  id: 'backgroundImageRucks',
  beforeDraw: (chart: any) => {
    if (chart.options.backgroundImage) {
      const ctx = chart.ctx;
      const { top, left, width, height } = chart.chartArea;
      const image = chart.options.backgroundImage;
      
      if (image && image.complete) {
        ctx.drawImage(image, left, top, width, height);
      }
    }
  },
};

Chart.register(backgroundImagePlugin);

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

// Reutiliza coordenadas de rucks para mostrar densidad simple sobre el campo
const RucksFieldHeatmapChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = isMobile ? '/CANCHA-CORTADA-VERT.jpg' : '/CANCHA-CORTADA.jpg';
    img.onload = () => setBackgroundImage(img);
  }, [isMobile]);

  const getCoords = (ev: any) => {
    const xCandidates = [ev.pos_x, ev.x, ev.COORDINATE_X, ev.extra_data?.pos_x, ev.extra_data?.x, ev.extra_data?.COORDINATE_X];
    const yCandidates = [ev.pos_y, ev.y, ev.COORDINATE_Y, ev.extra_data?.pos_y, ev.extra_data?.y, ev.extra_data?.COORDINATE_Y];
    const x = xCandidates.map(Number).find(v => !Number.isNaN(v));
    const y = yCandidates.map(Number).find(v => !Number.isNaN(v));
    if (x === undefined || y === undefined) return null;
    // Ajuste de orientación: tomamos pos_y como largo del campo y pos_x como ancho
    return { x: isMobile ? Number(x) : Number(x), y: isMobile ? Number(y) : Number(y) };
  };

  const scatterData = useMemo(() => {
    const rucks = events.filter(ev => matchesCategory(ev, 'RUCK', ['RUCKS', 'RACK', 'RUK']));
    const valid = rucks.map(ev => ({ ev, coords: getCoords(ev) })).filter(item => item.coords !== null) as any[];
    const datasets = [
      {
        label: 'Nuestro equipo',
        data: valid.filter(v => !isOpponentEvent(v.ev)).map(v => ({ x: v.coords.x, y: v.coords.y, id: v.ev.id })),
        backgroundColor: 'rgba(59,130,246,0.6)',
        pointRadius: 8,
        pointHoverRadius: 10,
      },
      {
        label: 'Rival',
        data: valid.filter(v => isOpponentEvent(v.ev)).map(v => ({ x: v.coords.x, y: v.coords.y, id: v.ev.id })),
        backgroundColor: 'rgba(248,113,113,0.6)',
        pointRadius: 8,
        pointHoverRadius: 10,
      },
    ];
    return { datasets };
  }, [events, isMobile]);

  const handlePointClick = useCallback((event: any, elements: any[]) => {
    if (!elements || elements.length === 0) return;
    const el = elements[0];
    const datasetIndex = el.datasetIndex ?? el.element?.datasetIndex ?? 0;
    const dataIndex = el.index ?? el.element?.index ?? el.element?.$context?.dataIndex;
    const dataset = scatterData.datasets[datasetIndex];
    const point = (dataset.data as any[])[dataIndex];
    const side = datasetIndex === 1 ? 'OPPONENT' : 'OUR';
    const filters = [
      { descriptor: 'CATEGORY', value: 'RUCK' },
      { descriptor: 'TEAM_SIDE', value: side },
    ];
    onChartClick(event, elements, el.element?.$context?.chart, 'ruck-map', 'possession-tab', filters);
    // Opcional: podríamos reproducir el evento/zoom, pero mantenemos solo filtro
    void point;
  }, [scatterData, onChartClick]);

  const options = useMemo(() => ({
    plugins: {
      title: { display: true, text: 'Mapa de rucks (densidad visual)' },
      legend: { display: true, position: 'right' as const },
      tooltip: { callbacks: { label: (ctx: any) => `(${ctx.parsed.x?.toFixed?.(1)}, ${ctx.parsed.y?.toFixed?.(1)})` } },
    },
    scales: {
      x: {
        type: 'linear' as const,
        min: 0,
        max: isMobile ? 70 : 100,
        display: false,
      },
      y: {
        type: 'linear' as const,
        min: isMobile ? 0 : 0,
        max: isMobile ? 100 : 100,
        display: false,
      },
    },
    backgroundImage,
    maintainAspectRatio: false,
    responsive: true,
    onClick: handlePointClick,
  }), [backgroundImage, isMobile, handlePointClick]);

  if (!scatterData.datasets.some(ds => (ds.data as any[]).length > 0)) return null;

  return (
    <div className="h-80">
      <Scatter data={scatterData} options={options as any} />
    </div>
  );
};

export default RucksFieldHeatmapChart;
