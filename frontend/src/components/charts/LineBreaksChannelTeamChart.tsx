import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { detectOurTeams, getTeamFromEvent, normalizeString } from '../../utils/teamUtils';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';

const LineBreaksChannelTeamChart = ({ events, onChartClick, matchInfo }: any) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const getChannel = (event: any) => {
      return event.extra_data?.['CANAL-QUIEBRE'] || 
             event.extra_data?.['CANAL DE QUIEBRE'] ||
             event.extra_data?.CANAL_QUIEBRE || 
             event.CANAL_QUIEBRE || 
             'Sin especificar';
    };

    const getTeam = (event: any) => {
      return getTeamFromEvent(event) || event.extra_data?.EQUIPO || event.EQUIPO || '';
    };

    const breaks = events.filter((e: any) => {
      const category = matchesCategory(e as any, 'BREAK', ['QUIEBRE']);
      return category && !isOpponentEvent(e);
    });

    const channelCounts: any = {};
    breaks.forEach((event: any) => {
      const channel = getChannel(event);
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });

    const channels = Object.keys(channelCounts)
      .filter(c => normalizeString(c).toUpperCase() !== 'SIN ESPECIFICAR')
      .sort((a, b) => channelCounts[b] - channelCounts[a]);
    const total = breaks.length;

    const colors = [
      'rgba(139, 92, 246, 0.8)',
      'rgba(167, 139, 250, 0.8)',
      'rgba(196, 181, 253, 0.8)',
      'rgba(221, 214, 254, 0.8)',
      'rgba(109, 40, 217, 0.8)',
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
             event.extra_data?.['CANAL DE QUIEBRE'] ||
             event.extra_data?.CANAL_QUIEBRE || 
             event.CANAL_QUIEBRE || 
             'Sin especificar';
    };

    const filteredEvents = events.filter((ev: any) => {
      const channel = getChannel(ev);
      return matchesCategory(ev as any, 'BREAK', ['QUIEBRE']) && channel === label;
    });

    const additionalFilters = [
      { descriptor: 'CANAL-QUIEBRE', value: label },
      { descriptor: 'CANAL DE QUIEBRE', value: label },
    ];

    onChartClick(event, elements, chart, 'channel', 'linebreaks-tab', additionalFilters, filteredEvents);
  };

  const centerTextPlugin = {
    id: 'centerTextBreaksChannelTeam',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const meta = chart.getDatasetMeta?.(0);
      const firstArc = meta?.data?.[0];
      const centerX = firstArc?.x ?? chartArea.left + chartArea.width / 2;
      const centerY = firstArc?.y ?? chartArea.top + chartArea.height / 2;
      ctx.save();

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
      title: { display: true, text: 'Quiebres por Canal - Nuestro Equipo' },
    },
    onClick: handleChartClick,
  };

  if (!chartData?.data || (chartData.total ?? 0) === 0) return null;

  return (
    <div style={{ height: '400px' }}>
      <Doughnut data={chartData.data} options={chartOptions as any} plugins={[centerTextPlugin]} />
    </div>
  );
};

export default LineBreaksChannelTeamChart;
