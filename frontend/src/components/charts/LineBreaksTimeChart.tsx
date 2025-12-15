import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory } from '@/utils/eventUtils';

const LineBreaksTimeChart = ({ events, onChartClick }: any) => {
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
        if (minutes < 20) return "0'- 20'";
        if (minutes < 40) return "20' - 40'";
        if (minutes < 60) return "40' - 60'";
        return "60' - 80'";
      }
      return null;
    };

    const breaks = events.filter((e: any) => 
      matchesCategory(e as any, 'BREAK', ['QUIEBRE'])
    );

    const timeGroups: any = {
      "0'- 20'": 0,
      "20' - 40'": 0,
      "40' - 60'": 0,
      "60' - 80'": 0
    };
    
    breaks.forEach((event: any) => {
      const timeGroup = getGameTime(event);
      if (timeGroup && timeGroups.hasOwnProperty(timeGroup)) {
        timeGroups[timeGroup]++;
      }
    });

    const labels = ["0'- 20'", "20' - 40'", "40' - 60'", "60' - 80'"];

    const data = {
      labels: labels,
      datasets: [{
        label: 'Quiebres',
        data: labels.map(l => timeGroups[l]),
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
      }],
    };

    setChartData({ data, timeGroups, labels });
  }, [events]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const timeGroup = chartData?.labels?.[dataIndex];

    const getGameTime = (event: any) => {
      const gameTime = event.extra_data?.Game_Time || 
                      event.extra_data?.game_time || 
                      event.Game_Time ||
                      event.game_time;
      
      if (gameTime !== undefined && gameTime !== null) {
        const minutes = typeof gameTime === 'string' ? 
          parseInt(gameTime.split(':')[0]) : 
          Math.floor(gameTime / 60);
        
        if (minutes < 20) return "0'- 20'";
        if (minutes < 40) return "20' - 40'";
        if (minutes < 60) return "40' - 60'";
        return "60' - 80'";
      }
      return null;
    };

    const filteredEvents = events.filter((ev: any) => {
      const evTimeGroup = getGameTime(ev);
      return matchesCategory(ev as any, 'BREAK', ['QUIEBRE']) && evTimeGroup === timeGroup;
    });

    const additionalFilters = [
      { descriptor: 'Time_Group', value: timeGroup }
    ];

    onChartClick(event, elements, chart, 'timeGroup', 'linebreaks-tab', additionalFilters, filteredEvents);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Quiebres por Momento del Partido' },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
    onClick: handleChartClick,
  };

  return chartData?.data ? (
    <div style={{ height: '400px' }}>
      <Bar data={chartData.data} options={chartOptions as any} />
    </div>
  ) : null;
};

export default LineBreaksTimeChart;
