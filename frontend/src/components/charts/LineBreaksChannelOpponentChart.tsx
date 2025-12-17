import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { detectOurTeams, getTeamFromEvent, normalizeString } from '../../utils/teamUtils';
import { matchesCategory } from '@/utils/eventUtils';

const LineBreaksChannelOpponentChart = ({ events, onChartClick, matchInfo }: any) => {
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

    const detectedTeams = detectOurTeams(events || []);
    const teamName = matchInfo?.team_name || matchInfo?.TEAM || matchInfo?.team || detectedTeams[0] || '';
    const teamNameNorm = normalizeString(teamName).toUpperCase();

    const breaks = events.filter((e: any) => {
      const category = matchesCategory(e as any, 'BREAK', ['QUIEBRE']);
      const team = normalizeString(getTeam(e)).toUpperCase();
      return category && (teamNameNorm ? (team !== '' && team !== teamNameNorm) : team !== '');
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
    id: 'centerTextBreaksChannelOpponent',
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
      title: { display: true, text: 'Quiebres por Canal - Rival' },
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

export default LineBreaksChannelOpponentChart;
