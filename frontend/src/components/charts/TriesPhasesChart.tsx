import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';

const TriesPhasesChart = ({ events, onChartClick }: any) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    if (!events || events.length === 0) {
      setChartData(null);
      return;
    }

    const tries = events.filter((e: any) => {
      const pt = (e.POINTS || e.PUNTOS || e.extra_data?.['TIPO-PUNTOS'] || e.extra_data?.['TIPO_PUNTOS'] || e.extra_data?.PUNTOS || e.POINTS) || '';
      const s = String(pt).toUpperCase();
      return s.includes('TRY');
    });

    // Agrupar por número de fases (TRY_PHASES) — normalizar a entero
    const phaseCounts: Record<string, number> = {};
    tries.forEach((t: any) => {
      const raw = t.extra_data?.TRY_PHASES ?? t.TRY_PHASES ?? null;
      const n = raw !== null && raw !== undefined ? Number(raw) : NaN;
      const key = Number.isFinite(n) ? String(Math.max(1, Math.round(n))) : 'unknown';
      phaseCounts[key] = (phaseCounts[key] || 0) + 1;
    });

    // Ordenar claves numéricas
    const numericKeys = Object.keys(phaseCounts).filter(k => k !== 'unknown').map(k => Number(k)).sort((a,b)=>a-b).map(String);
    const keys = numericKeys.concat(Object.keys(phaseCounts).includes('unknown') ? ['unknown'] : []);

    const data = {
      labels: keys,
      datasets: [
        {
          label: 'Cantidad de Tries por Fases (TRY_PHASES)',
          data: keys.map(k => Number(phaseCounts[k] || 0)),
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }
      ]
    };

    // Validación simple
    if (data.labels.length === 0) {
      setChartData(null);
      return;
    }

    setChartData(data);
  }, [events]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Distribución de Fases en Tries' }
    },
    onClick: (evt: any, elements: any[]) => {
      if (!elements || elements.length === 0) return;
      const chart = elements[0].element.$context.chart;
      const label = chart.data.labels?.[elements[0].index];
      // Filtrar eventos cuyos TRY_PHASES coincidan con label
      const filtered = (events || []).filter((e: any) => {
        const raw = e.extra_data?.TRY_PHASES ?? e.TRY_PHASES ?? null;
        const n = raw !== null && raw !== undefined ? Number(raw) : NaN;
        const key = Number.isFinite(n) ? String(Math.max(1, Math.round(n))) : 'unknown';
        return key === String(label);
      });

      const additionalFilters = [
        { descriptor: 'CATEGORY', value: 'POINTS' },
        { descriptor: 'TRY_PHASES', value: String(label) }
      ];

      onChartClick(evt, elements, chart, 'phases', 'tries-tab', additionalFilters, filtered);
    }
  };

    if (!chartData) return <div>No data for TriesPhasesChart</div>;

  return (
    <div style={{ minHeight: 220 }}>
      <Bar data={chartData} options={options as any} />
    </div>
  );
};

export default TriesPhasesChart;
