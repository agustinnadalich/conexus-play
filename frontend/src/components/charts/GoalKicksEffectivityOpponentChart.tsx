import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';

const GoalKicksEffectivityOpponentChart = ({ events, onChartClick, matchInfo }: any) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const getResult = (event: any) => {
      const result = event.extra_data?.['RESULTADO-PALOS'] || 
                    event.extra_data?.RESULTADO_PALOS || 
                    event.RESULTADO_PALOS ||
                    'UNKNOWN';
      return String(result).toUpperCase();
    };

    const getTeam = (event: any) => {
      return event.extra_data?.EQUIPO || event.EQUIPO || '';
    };

    const teamName = matchInfo?.team_name || 'PESCARA';

    const goalKicks = events.filter((e: any) => {
      const category = e.event_type === 'GOAL-KICK' || e.CATEGORY === 'GOAL-KICK';
      const team = getTeam(e).toUpperCase();
      return category && team !== teamName.toUpperCase() && team !== '';
    });

    const success = goalKicks.filter((e: any) => getResult(e) === 'SUCCESS').length;
    const fail = goalKicks.filter((e: any) => getResult(e) === 'FAIL').length;
    const total = success + fail;

    const data = {
      labels: ['Exitosos', 'Fallidos'],
      datasets: [{
        data: [success, fail],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Verde
          'rgba(239, 68, 68, 0.8)',    // Rojo
        ],
        hoverBackgroundColor: [
          'rgba(34, 197, 94, 0.9)',
          'rgba(239, 68, 68, 0.9)',
        ],
      }],
    };

    setChartData({ data, total, success, fail });
  }, [events, matchInfo]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.data?.labels?.[dataIndex];

    const getResult = (event: any) => {
      const result = event.extra_data?.['RESULTADO-PALOS'] || 
                    event.extra_data?.RESULTADO_PALOS || 
                    event.RESULTADO_PALOS ||
                    'UNKNOWN';
      return String(result).toUpperCase();
    };

    const isSuccess = label === 'Exitosos';
    const filteredEvents = events.filter((ev: any) => {
      const result = getResult(ev);
      const category = ev.CATEGORY || ev.event_type;
      return category === 'GOAL-KICK' && 
             (isSuccess ? result === 'SUCCESS' : result === 'FAIL');
    });

    const additionalFilters = [
      { descriptor: 'RESULTADO-PALOS', value: isSuccess ? 'SUCCESS' : 'FAIL' }
    ];

    onChartClick(event, elements, chart, 'result', 'goalkicks-tab', additionalFilters, filteredEvents);
  };

  const centerTextPlugin = {
    id: 'centerTextOpponent',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea: { width, height } } = chart;
      ctx.save();
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Total: ${chartData?.total || 0}`, centerX, centerY - 12);
      
      if (chartData?.total > 0) {
        const percentage = ((chartData.success / chartData.total) * 100).toFixed(1);
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`${percentage}% éxito`, centerX, centerY + 12);
      }
      
      ctx.restore();
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%',
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Efectividad - Rival' },
    },
    onClick: handleChartClick,
  };

  return chartData?.data ? (
    <div style={{ height: '400px' }}>
      <Doughnut data={chartData.data} options={chartOptions as any} plugins={[centerTextPlugin]} />
    </div>
  ) : null;
};

export default GoalKicksEffectivityOpponentChart;
