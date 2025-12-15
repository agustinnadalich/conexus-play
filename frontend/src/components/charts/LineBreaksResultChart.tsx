import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { matchesCategory } from '@/utils/eventUtils';

const LineBreaksResultChart = ({ events, onChartClick }: any) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const getResult = (event: any) => {
      const result = event.extra_data?.BREAK_RESULT || 
                    event.extra_data?.['BREAK_RESULT'] || 
                    event.BREAK_RESULT || 
                    'SIN_DATO';
      return String(result);
    };

    const breaks = events.filter((e: any) => 
      matchesCategory(e as any, 'BREAK', ['QUIEBRE'])
    );

    const resultCounts: any = {};
    breaks.forEach((event: any) => {
      const result = getResult(event);
      // Simplificar nombres para mejor presentación
      let displayResult = result;
      if (result.startsWith('TURNOVER_')) {
        displayResult = 'TURNOVER';
      } else if (result.startsWith('PENALTY_')) {
        displayResult = result.replace('PENALTY_', 'PENAL_');
      } else if (result === 'GOAL_KICK_ATTEMPT') {
        displayResult = 'PALOS';
      }
      resultCounts[displayResult] = (resultCounts[displayResult] || 0) + 1;
    });

    const results = Object.keys(resultCounts).sort((a, b) => resultCounts[b] - resultCounts[a]);
    const total = breaks.length;

    // Colores específicos por tipo de resultado
    const getColorForResult = (result: string) => {
      if (result === 'TRY') return 'rgba(34, 197, 94, 0.8)';  // Verde
      if (result === 'PENAL_FOR') return 'rgba(59, 130, 246, 0.8)';  // Azul
      if (result === 'PENAL_AGAINST') return 'rgba(239, 68, 68, 0.8)';  // Rojo
      if (result === 'TURNOVER') return 'rgba(251, 146, 60, 0.8)';  // Naranja
      if (result === 'PALOS') return 'rgba(168, 85, 247, 0.8)';  // Morado
      if (result === 'KICK') return 'rgba(14, 165, 233, 0.8)';  // Celeste
      if (result === 'CONTINUES') return 'rgba(156, 163, 175, 0.8)';  // Gris
      return 'rgba(100, 116, 139, 0.8)';  // Gris oscuro default
    };

    const data = {
      labels: results,
      datasets: [{
        data: results.map(r => resultCounts[r]),
        backgroundColor: results.map(r => getColorForResult(r)),
        hoverBackgroundColor: results.map(r => getColorForResult(r).replace('0.8', '0.9')),
      }],
    };

    setChartData({ data, total, resultCounts });
  }, [events]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.data?.labels?.[dataIndex];

    const getResult = (event: any) => {
      const result = event.extra_data?.BREAK_RESULT || 
                    event.extra_data?.['BREAK_RESULT'] || 
                    event.BREAK_RESULT || 
                    'SIN_DATO';
      return String(result);
    };

    // Filtrar eventos por resultado (considerando simplificación de nombres)
    const filteredEvents = events.filter((ev: any) => {
      const result = getResult(ev);
      if (!matchesCategory(ev as any, 'BREAK', ['QUIEBRE'])) return false;
      
      // Mapear label simplificado a resultado real
      if (label === 'TURNOVER' && result.startsWith('TURNOVER_')) return true;
      if (label === 'PENAL_FOR' && result === 'PENALTY_FOR') return true;
      if (label === 'PENAL_AGAINST' && result === 'PENALTY_AGAINST') return true;
      if (label === 'PALOS' && result === 'GOAL_KICK_ATTEMPT') return true;
      return result === label;
    });

    const additionalFilters = [
      { descriptor: 'BREAK_RESULT', value: label }
    ];

    onChartClick(event, elements, chart, 'result', 'linebreaks-tab', additionalFilters, filteredEvents);
  };

  const centerTextPlugin = {
    id: 'centerTextBreaksResult',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea: { width, height } } = chart;
      ctx.save();
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Total: ${chartData?.total || 0}`, centerX, centerY);
      
      ctx.restore();
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%',
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Resultado de Quiebres' },
    },
    onClick: handleChartClick,
  };

  return chartData?.data ? (
    <div style={{ height: '400px' }}>
      <Doughnut data={chartData.data} options={chartOptions as any} plugins={[centerTextPlugin]} />
    </div>
  ) : null;
};

export default LineBreaksResultChart;
