import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';

const LineBreaksChannelOpponentChart = ({ events, onChartClick, matchInfo }: any) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const getChannel = (event: any) => {
      return event.extra_data?.['CANAL-QUIEBRE'] || 
             event.extra_data?.CANAL_QUIEBRE || 
             event.CANAL_QUIEBRE || 
             'Sin especificar';
    };

    const getTeam = (event: any) => {
      return event.extra_data?.EQUIPO || event.EQUIPO || '';
    };

    const teamName = matchInfo?.team_name || 'PESCARA';

    const breaks = events.filter((e: any) => {
      const category = e.event_type === 'BREAK' || e.CATEGORY === 'BREAK';
      const team = getTeam(e).toUpperCase();
      return category && team !== teamName.toUpperCase() && team !== '';
    });

    const channelCounts: any = {};
    breaks.forEach((event: any) => {
      const channel = getChannel(event);
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });

    const channels = Object.keys(channelCounts).sort((a, b) => channelCounts[b] - channelCounts[a]);
    const total = breaks.length;

    const colors = [
      'rgba(239, 68, 68, 0.8)',
      'rgba(248, 113, 113, 0.8)',
      'rgba(252, 165, 165, 0.8)',
      'rgba(254, 202, 202, 0.8)',
      'rgba(220, 38, 38, 0.8)',
    ];

    const data = {
      labels: channels,
      datasets: [{
        data: channels.map(c => channelCounts[c]),
        backgroundColor: channels.map((_, i) => colors[i % colors.length]),
        hoverBackgroundColor: channels.map((_, i) => colors[i % colors.length].replace('0.8', '0.9')),
      }],
    };

    setChartData({ data, total });
  }, [events, matchInfo]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.data?.labels?.[dataIndex];

    const getChannel = (event: any) => {
      return event.extra_data?.['CANAL-QUIEBRE'] || 
             event.extra_data?.CANAL_QUIEBRE || 
             event.CANAL_QUIEBRE || 
             'Sin especificar';
    };

    const filteredEvents = events.filter((ev: any) => {
      const channel = getChannel(ev);
      const category = ev.CATEGORY || ev.event_type;
      return category === 'BREAK' && channel === label;
    });

    const additionalFilters = [
      { descriptor: 'CANAL-QUIEBRE', value: label }
    ];

    onChartClick(event, elements, chart, 'channel', 'linebreaks-tab', additionalFilters, filteredEvents);
  };

  const centerTextPlugin = {
    id: 'centerTextBreaksChannelOpponent',
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
      title: { display: true, text: 'Quiebres por Canal - Rival' },
    },
    onClick: handleChartClick,
  };

  return chartData?.data ? (
    <div style={{ height: '400px' }}>
      <Doughnut data={chartData.data} options={chartOptions as any} plugins={[centerTextPlugin]} />
    </div>
  ) : null;
};

export default LineBreaksChannelOpponentChart;
