import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { detectOurTeams, getTeamFromEvent, normalizeString } from '../../utils/teamUtils';
import { matchesCategory } from '@/utils/eventUtils';

const LineBreaksTypeTeamChart = ({ events, onChartClick, matchInfo }: any) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const getType = (event: any) => {
      return event.extra_data?.['TIPO-QUIEBRE'] || 
             event.extra_data?.['TIPO DE QUIEBRE'] ||
             event.extra_data?.TIPO_QUIEBRE || 
             event.TIPO_QUIEBRE || 
             'OTROS';
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
      return category && (teamNameNorm ? team === teamNameNorm : true);
    });

    const typeCounts: any = {};
    breaks.forEach((event: any) => {
      const type = getType(event);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const types = Object.keys(typeCounts)
      .filter(t => normalizeString(t).toUpperCase() !== 'SIN ESPECIFICAR')
      .sort((a, b) => typeCounts[b] - typeCounts[a]);
    const total = breaks.length;

    const colors = [
      'rgba(139, 92, 246, 0.8)',
      'rgba(167, 139, 250, 0.8)',
      'rgba(196, 181, 253, 0.8)',
      'rgba(221, 214, 254, 0.8)',
      'rgba(109, 40, 217, 0.8)',
    ];

    const data = {
      labels: types,
      datasets: [{
        data: types.map(t => typeCounts[t]),
        backgroundColor: types.map((_, i) => colors[i % colors.length]),
        hoverBackgroundColor: types.map((_, i) => colors[i % colors.length].replace('0.8', '0.9')),
      }],
    };

    setChartData({ data, total });
  }, [events, matchInfo]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.data?.labels?.[dataIndex];

    const getType = (event: any) => {
      return event.extra_data?.['TIPO-QUIEBRE'] || 
             event.extra_data?.['TIPO DE QUIEBRE'] ||
             event.extra_data?.TIPO_QUIEBRE || 
             event.TIPO_QUIEBRE || 
             'OTROS';
    };

    const filteredEvents = events.filter((ev: any) => {
      const type = getType(ev);
      return matchesCategory(ev as any, 'BREAK', ['QUIEBRE']) && type === label;
    });

    const additionalFilters = [
      { descriptor: 'TIPO-QUIEBRE', value: label },
      { descriptor: 'TIPO DE QUIEBRE', value: label },
    ];

    onChartClick(event, elements, chart, 'type', 'linebreaks-tab', additionalFilters, filteredEvents);
  };

  const centerTextPlugin = {
    id: 'centerTextBreaksTypeTeam',
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
      title: { display: true, text: 'Quiebres por Tipo - Nuestro Equipo' },
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

export default LineBreaksTypeTeamChart;
