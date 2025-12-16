import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';

const categoryOrder: Array<'TURNOVER+' | 'TURNOVER-'> = ['TURNOVER+', 'TURNOVER-'];

interface ChartMeta {
  data: any;
  totalRecovered: number;
  totalLost: number;
  counts: Record<string, Record<'TURNOVER+' | 'TURNOVER-', number>>;
  labels: string[];
}

const TurnoversTypeChart = ({ events, onChartClick }: any) => {
  const [chartData, setChartData] = useState<ChartMeta | null>(null);

  const getTypeLabel = (event: any) => {
    const candidates = [
      event.extra_data?.['TIPO-PERDIDA/RECUPERACIÓN'],
      event.extra_data?.['TIPO-PERDIDA/RECUPERACIN'], // Versión sin Ó (carácter corrupto)
      event.extra_data?.['TIPO_PERDIDA/RECUPERACION'],
      event.extra_data?.TURNOVER_TYPE,
      event.TURNOVER_TYPE,
      event.extra_data?.type,
      event.type,
      event.extra_data?.TURNOVER_CAUSE,
      event.extra_data?.['TURNOVER-CAUSE'],
      event.extra_data?.TURNOVER_REASON,
      event.extra_data?.CAUSE,
      event.extra_data?.MOTIVO,
      event.extra_data?.MISC,
    ];
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) continue;
      const normalized = String(candidate).trim().toUpperCase();
      if (!normalized || normalized === 'N/A' || normalized === 'NA' || normalized === 'NONE') continue;
      if (normalized === 'NOT SPECIFIED' || normalized === 'SIN ESPECIFICAR' || normalized === 'NO ESPECIFICADO' || normalized === 'UNSPECIFIED') {
        return 'SIN ESPECIFICAR';
      }
      return normalized;
    }
    return 'SIN ESPECIFICAR';
  };

  const getCategoryKey = (event: any) => {
    const rawCategory = event.CATEGORY ?? event.event_type ?? event.extra_data?.CATEGORY ?? '';
    const normalized = String(rawCategory || '').toUpperCase().replace(/\s+/g, '');
    if (normalized === 'TURNOVER+' || normalized === 'TURNOVER-') {
      return normalized as 'TURNOVER+' | 'TURNOVER-';
    }
    return null;
  };

  useEffect(() => {
    const counts: Record<string, Record<'TURNOVER+' | 'TURNOVER-', number>> = {};
    events.forEach(event => {
      const category = getCategoryKey(event);
      if (!category) return;
      const typeLabel = getTypeLabel(event);
      counts[typeLabel] = counts[typeLabel] || { 'TURNOVER+': 0, 'TURNOVER-': 0 };
      counts[typeLabel][category] = (counts[typeLabel][category] ?? 0) + 1;
    });

    const allTypes = Object.keys(counts);
    const recoveredLabels: string[] = [];
    const recoveredData: number[] = [];
    const recoveredColors: string[] = [];
    const lostLabels: string[] = [];
    const lostData: number[] = [];
    const lostColors: string[] = [];
    let totalRecovered = 0;
    let totalLost = 0;

    allTypes.forEach((type, index) => {
      const recoveredCount = counts[type]?.[categoryOrder[0]] ?? 0;
      const lostCount = counts[type]?.[categoryOrder[1]] ?? 0;

      if (recoveredCount > 0) {
        recoveredLabels.push(`${type} (Recuperado)`);
        recoveredData.push(recoveredCount);
        recoveredColors.push(`rgba(${30 + index * 20}, ${144 + index * 6}, 255, 0.8)`);
        totalRecovered += recoveredCount;
      }
      if (lostCount > 0) {
        lostLabels.push(`${type} (Perdido)`);
        lostData.push(lostCount);
        lostColors.push(`rgba(255, ${100 + index * 30}, ${100 + index * 30}, 0.8)`);
        totalLost += lostCount;
      }
    });

    const data = {
      labels: [...recoveredLabels, ...lostLabels],
      datasets: [{
        data: [...recoveredData, ...lostData],
        backgroundColor: [...recoveredColors, ...lostColors],
        hoverBackgroundColor: [...recoveredColors, ...lostColors],
      }],
    };

    setChartData({ data, totalRecovered, totalLost, counts, labels: allTypes });
  }, [events]);

  useEffect(() => {
    if (!events || events.length === 0) return;
    const snapshot = events.map((event, index) => ({
      idx: index,
      id: event.ID ?? event.id ?? index,
      category: event.CATEGORY ?? event.event_type ?? 'UNKNOWN',
      turnoverType: event.TURNOVER_TYPE ?? event.extra_data?.TURNOVER_TYPE ?? 'N/A',
      spanishType:
        event.extra_data?.['TIPO-PERDIDA/RECUPERACIÓN'] ??
        event.extra_data?.['TIPO_PERDIDA/RECUPERACION'] ??
        'N/A',
    }));
    console.groupCollapsed('[TurnoversTypeChart] eventos en memoria');
    console.table(snapshot);
    console.groupEnd();
  }, [events]);

  const handleChartClick = (event, elements) => {
    if (!elements || elements.length === 0) return;
    if (!chartData) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.data?.labels?.[dataIndex];

    if (!label) return;

    const type = label?.replace(/ \((Recuperado|Perdido)\)$/, '');
    const isRecovered = label?.includes('(Recuperado)');
    const category = isRecovered ? 'TURNOVER+' : 'TURNOVER-';

    const filteredEvents = events.filter(ev => {
      const evCategory = (ev.CATEGORY ?? ev.event_type ?? '').toString().toUpperCase().replace(/\s+/g, '');
      const typeLabel = getTypeLabel(ev);
      return evCategory === category && typeLabel === type;
    });

    // Usar descriptores que coincidan con los campos reales del evento
    const additionalFilters = [
      { descriptor: 'TURNOVER_TYPE', value: type },  // Campo normalizado en extra_data
      { descriptor: 'event_type', value: category }, // Usar event_type en lugar de CATEGORY
    ];

    onChartClick?.(event, elements, chart, 'type', 'turnovers-tab', additionalFilters, filteredEvents);
  };

  const centerTextPlugin = {
    id: 'centerText',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea: { width, height } } = chart;
      ctx.save();
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#1e40af';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Recuperados: ${chartData?.totalRecovered || 0}`, centerX, centerY - 12);
      
      ctx.fillStyle = '#dc2626';
      ctx.fillText(`Perdidos: ${chartData?.totalLost || 0}`, centerX, centerY + 12);
      
      ctx.restore();
    },
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%',
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Turnovers por Tipo (Recuperados vs Perdidos)',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    onClick: handleChartClick,
  };

  const debugText = (events || [])
    .slice(0, 50)
    .map((event, idx) => {
      const category = event.CATEGORY ?? event.event_type ?? 'N/A';
      const turnoverType = event.TURNOVER_TYPE ?? event.extra_data?.TURNOVER_TYPE ?? 'N/A';
      const spanishType =
        event.extra_data?.['TIPO-PERDIDA/RECUPERACIÓN'] ??
        event.extra_data?.['TIPO-PERDIDA/RECUPERACIN'] ?? // Sin Ó (carácter corrupto)
        event.extra_data?.['TIPO_PERDIDA/RECUPERACION'] ??
        'N/A';
      return `${idx + 1}. id=${event.ID ?? event.id ?? '??'} category=${category} type=${turnoverType} spanish=${spanishType}`;
    })
    .join('\n');
  const hasMoreEvents = (events?.length || 0) > 50;

  return chartData ? (
    <div>
      <div style={{ height: '400px' }}>
        <Doughnut data={chartData.data} options={chartOptions as any} plugins={[centerTextPlugin]} />
      </div>
      <details style={{ marginTop: '10px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.95rem' }}>Eventos cargados ({events?.length || 0})</summary>
        <pre
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            background: '#f3f4f6',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '0.85rem',
          }}
        >
{debugText}{hasMoreEvents ? '\n... y ' + ((events?.length || 0) - 50) + ' eventos más' : ''}
        </pre>
      </details>
    </div>
  ) : null;
};

export default TurnoversTypeChart;
