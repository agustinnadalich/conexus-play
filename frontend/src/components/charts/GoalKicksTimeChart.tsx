import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const GoalKicksTimeChart = ({ events, onChartClick }: any) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const getGameTime = (event: any) => {
      const gameTime = event.extra_data?.Game_Time || 
                      event.extra_data?.game_time || 
                      event.Game_Time ||
                      event.game_time;
      
      if (gameTime !== undefined && gameTime !== null) {
        const minutes = typeof gameTime === 'string' ? 
          parseInt(gameTime.split(':')[0]) : 
          Math.floor(gameTime / 60);
        
        // Dividir en bloques de 20 minutos
        if (minutes < 20) return 0;
        if (minutes < 40) return 20;
        if (minutes < 60) return 40;
        return 60;
      }
      return null;
    };

    const getResult = (event: any) => {
      const result = event.extra_data?.['RESULTADO-PALOS'] || 
                    event.extra_data?.RESULTADO_PALOS || 
                    event.RESULTADO_PALOS ||
                    'UNKNOWN';
      return String(result).toUpperCase();
    };

    const goalKicks = events.filter((e: any) => 
      e.event_type === 'GOAL-KICK' || e.CATEGORY === 'GOAL-KICK'
    );

    const timeGroups: any = {
      "0'- 20'": { success: 0, fail: 0 },
      "20' - 40'": { success: 0, fail: 0 },
      "40' - 60'": { success: 0, fail: 0 },
      "60' - 80'": { success: 0, fail: 0 }
    };
    
    goalKicks.forEach((event: any) => {
      const timeGroup = getGameTime(event);
      if (timeGroup !== null) {
        const key = timeGroup === 0 ? "0'- 20'" :
                    timeGroup === 20 ? "20' - 40'" :
                    timeGroup === 40 ? "40' - 60'" : "60' - 80'";
        
        const result = getResult(event);
        if (result === 'SUCCESS') {
          timeGroups[key].success++;
        } else if (result === 'FAIL') {
          timeGroups[key].fail++;
        }
      }
    });

    const labels = ["0'- 20'", "20' - 40'", "40' - 60'", "60' - 80'"];

    const data = {
      labels: labels,
      datasets: [
        {
          label: 'Exitosos',
          data: labels.map(l => timeGroups[l].success),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        },
        {
          label: 'Fallidos',
          data: labels.map(l => timeGroups[l].fail),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        },
      ],
    };

    setChartData({ data, timeGroups, labels });
  }, [events]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const datasetIndex = elements[0].datasetIndex;
    const timeLabel = chartData?.labels?.[dataIndex];

    const getGameTime = (event: any) => {
      const gameTime = event.extra_data?.Game_Time || 
                      event.extra_data?.game_time || 
                      event.Game_Time ||
                      event.game_time;
      
      if (gameTime !== undefined && gameTime !== null) {
        const minutes = typeof gameTime === 'string' ? 
          parseInt(gameTime.split(':')[0]) : 
          Math.floor(gameTime / 60);
        return Math.floor(minutes / 10) * 10;
      }
      return null;
    };

    const getResult = (event: any) => {
      const result = event.extra_data?.['RESULTADO-PALOS'] || 
                    event.extra_data?.RESULTADO_PALOS || 
                    event.RESULTADO_PALOS ||
                    'UNKNOWN';
      return String(result).toUpperCase();
    };

    const [minStr, maxStr] = timeLabel.replace(' min', '').split('-');
    const minTime = parseInt(minStr);
    const maxTime = parseInt(maxStr);

    const isSuccess = datasetIndex === 0;
    const filteredEvents = events.filter((ev: any) => {
      const timeGroup = getGameTime(ev);
      const result = getResult(ev);
      const category = ev.CATEGORY || ev.event_type;
      return category === 'GOAL-KICK' && 
             timeGroup === minTime && 
             (isSuccess ? result === 'SUCCESS' : result === 'FAIL');
    });

    const additionalFilters = [
      { descriptor: 'Time_Group', value: timeLabel },
      { descriptor: 'RESULTADO_PALOS', value: isSuccess ? 'SUCCESS' : 'FAIL' }
    ];

    onChartClick(event, elements, chart, 'Time_Group', 'goalkicks-tab', additionalFilters, filteredEvents);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Patadas a los Palos por Momento del Partido' },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
    onClick: handleChartClick,
  };

  return chartData?.data ? (
    <div style={{ height: '400px' }}>
      <Bar data={chartData.data} options={chartOptions as any} />
    </div>
  ) : null;
};

export default GoalKicksTimeChart;
