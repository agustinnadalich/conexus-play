import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';

const PenaltiesCausePieChart = ({ events, onChartClick }: any) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const getCause = (event: any) => {
      const cause = event.extra_data?.INFRACCION || 
                    event.INFRACCION || 
                    event.extra_data?.INFRACTION_TYPE || 
                    event.INFRACTION_TYPE || 
                    'SIN ESPECIFICAR';
      return String(cause).toUpperCase();
    };

    const isOpponent = (event: any) => {
      const equipo = event.extra_data?.EQUIPO || '';
      if (String(equipo).toUpperCase() === 'RIVAL') return true;
      
      const team = event.team || event.TEAM || '';
      const teamStr = String(team).toUpperCase().trim();
      
      if (event.IS_OPPONENT === true || event.extra_data?.IS_OPPONENT === true) return true;
      if (teamStr === 'OPPONENT' || teamStr === 'RIVAL' || teamStr === 'AWAY' || teamStr === 'VISITANTE') return true;
      if (teamStr.includes('OPPONENT') || teamStr.includes('RIVAL') || teamStr.includes('AWAY')) return true;
      
      return false;
    };

    const penaltyEvents = events.filter(event => event.CATEGORY === 'PENALTY' || event.event_type === 'PENALTY');
    const allCauses = [...new Set(penaltyEvents.map(getCause))];

    const teamLabels: string[] = [];
    const teamData: number[] = [];
    const teamColors: string[] = [];
    const rivalLabels: string[] = [];
    const rivalData: number[] = [];
    const rivalColors: string[] = [];
    let totalTeam = 0;
    let totalRival = 0;

    allCauses.forEach((cause, index) => {
      const teamCount = penaltyEvents.filter(event => !isOpponent(event) && getCause(event) === cause).length;
      const rivalCount = penaltyEvents.filter(event => isOpponent(event) && getCause(event) === cause).length;

      if (teamCount > 0) {
        teamLabels.push(`${cause} (Equipo)`);
        teamData.push(teamCount);
        teamColors.push(`rgba(255, ${100 + index * 30}, ${100 + index * 30}, 0.8)`);
        totalTeam += teamCount;
      }
      if (rivalCount > 0) {
        rivalLabels.push(`${cause} (Rival)`);
        rivalData.push(rivalCount);
        rivalColors.push(`rgba(${30 + index * 20}, ${144 + index * 6}, 255, 0.8)`);
        totalRival += rivalCount;
      }
    });

    const data = {
      labels: [...teamLabels, ...rivalLabels],
      datasets: [{
        data: [...teamData, ...rivalData],
        backgroundColor: [...teamColors, ...rivalColors],
        hoverBackgroundColor: [...teamColors, ...rivalColors],
      }],
    };

    setChartData({ data, totalTeam, totalRival });
  }, [events]);

  const centerTextPlugin = {
    id: 'centerText',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea: { width, height } } = chart;
      ctx.save();
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Equipo: ${chartData?.totalTeam || 0}`, centerX, centerY - 12);
      
      ctx.fillStyle = '#1e40af';
      ctx.fillText(`Rival: ${chartData?.totalRival || 0}`, centerX, centerY + 12);
      
      ctx.restore();
    }
  };

  const handleChartClick = (event, elements) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.data?.labels?.[dataIndex];

    const isOpponent = (event: any) => {
      const equipo = event.extra_data?.EQUIPO || '';
      if (String(equipo).toUpperCase() === 'RIVAL') return true;
      
      const team = event.team || event.TEAM || '';
      const teamStr = String(team).toUpperCase().trim();
      
      if (event.IS_OPPONENT === true || event.extra_data?.IS_OPPONENT === true) return true;
      if (teamStr === 'OPPONENT' || teamStr === 'RIVAL' || teamStr === 'AWAY' || teamStr === 'VISITANTE') return true;
      if (teamStr.includes('OPPONENT') || teamStr.includes('RIVAL') || teamStr.includes('AWAY')) return true;
      
      return false;
    };

    const getCauseForFilter = (event: any) => {
      const cause = event.extra_data?.INFRACCION || 
                    event.INFRACCION || 
                    event.extra_data?.INFRACTION_TYPE || 
                    event.INFRACTION_TYPE || 
                    'SIN ESPECIFICAR';
      return String(cause).toUpperCase();
    };

    const cause = label?.replace(/ \((Equipo|Rival)\)$/, '');
    const isRival = label?.includes('(Rival)');
    
    const filteredEvents = events.filter((ev) => {
      const evCause = getCauseForFilter(ev);
      const evIsRival = isOpponent(ev);
      const category = ev.CATEGORY || ev.event_type;
      return category === 'PENALTY' && evCause === cause && evIsRival === isRival;
    });

    const additionalFilters = [{ descriptor: 'INFRACCION', value: cause }];
    onChartClick(event, elements, chart, 'cause', 'penalties-tab', additionalFilters, filteredEvents);
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%',
    plugins: {
      legend: { display: true, position: 'top' as const },
      title: { display: true, text: 'Penalties por Causa (Equipo vs Rival)' },
    },
    onClick: handleChartClick,
  };

  return chartData?.data ? (
    <div style={{ height: '400px' }}>
      <Doughnut data={chartData.data} options={pieChartOptions as any} plugins={[centerTextPlugin]} />
    </div>
  ) : null;
};

export default PenaltiesCausePieChart;
