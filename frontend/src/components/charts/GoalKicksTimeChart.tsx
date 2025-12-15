import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';
import { getTeamFromEvent, detectOurTeams, normalizeString } from '../../utils/teamUtils';

const GoalKicksTimeChart = ({ events, onChartClick, matchInfo = {} }: any) => {
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
      const collect = (val: any): string[] => {
        if (val === undefined || val === null) return [];
        if (Array.isArray(val)) return val.flatMap(collect);
        return [String(val)];
      };
      const candidates = [
        ...collect(event.extra_data?.['RESULTADO-PALOS']),
        ...collect(event.extra_data?.RESULTADO_PALOS),
        ...collect(event.RESULTADO_PALOS),
        ...collect(event.extra_data?.['RESULTADO']),
        ...collect(event.MISC),
      ];
      for (const c of candidates) {
        const r = String(c || '').toUpperCase();
        if (r.includes('CONVERTIDA') || r.includes('SUCCESS')) return 'SUCCESS';
        if (r.includes('ERRADA') || r.includes('FAIL')) return 'FAIL';
      }
      return 'FAIL';
    };

    const detected = detectOurTeams(events || []);
    const teamName = matchInfo?.team_name || matchInfo?.TEAM || matchInfo?.team || detected[0] || '';
    const teamNameNorm = normalizeString(teamName).toUpperCase();

    const simplify = (s: string) => s.replace(/\(.*?\)/g, '').trim().toUpperCase();
    const detectSide = (event: any): 'OUR' | 'OPP' => {
      const cat = String(event.event_type || event.CATEGORY || '').toUpperCase();
      if (cat === 'PALOS') return 'OUR';
      if (cat === 'PALOS RIVAL') return 'OPP';
      if (isOpponentEvent(event)) return 'OPP';
      const rawTeam = normalizeString(getTeamFromEvent(event) || event.extra_data?.EQUIPO || event.EQUIPO || '');
      const t = simplify(rawTeam);
      if (t.includes('OPPONENT') || t.includes('RIVAL')) return 'OPP';
      if (teamNameNorm) {
        const tn = simplify(teamNameNorm);
        if (t && t === tn) return 'OUR';
      }
      return 'OUR';
    };

    const goalKicks = events.filter((e: any) => 
      matchesCategory(e as any, 'GOAL-KICK', ['PALOS', 'PALOS RIVAL'])
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
        if (detectSide(event) !== 'OUR') return;
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
      const collect = (val: any): string[] => {
        if (val === undefined || val === null) return [];
        if (Array.isArray(val)) return val.flatMap(collect);
        return [String(val)];
      };
      const candidates = [
        ...collect(event.extra_data?.['RESULTADO-PALOS']),
        ...collect(event.extra_data?.RESULTADO_PALOS),
        ...collect(event.RESULTADO_PALOS),
        ...collect(event.extra_data?.['RESULTADO']),
        ...collect(event.MISC),
      ];
      for (const c of candidates) {
        const r = String(c || '').toUpperCase();
        if (r.includes('CONVERTIDA') || r.includes('SUCCESS')) return 'SUCCESS';
        if (r.includes('ERRADA') || r.includes('FAIL')) return 'FAIL';
      }
      return '';
    };

    const [minStr, maxStr] = timeLabel.replace(' min', '').split('-');
    const minTime = parseInt(minStr);
    const maxTime = parseInt(maxStr);

    const isSuccess = datasetIndex === 0;
    const filteredEvents = events.filter((ev: any) => {
      const timeGroup = getGameTime(ev);
      const result = getResult(ev);
      return matchesCategory(ev as any, 'GOAL-KICK', ['PALOS', 'PALOS RIVAL']) && 
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
