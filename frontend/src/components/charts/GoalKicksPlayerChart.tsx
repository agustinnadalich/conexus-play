import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';
import { getTeamFromEvent, detectOurTeams, normalizeString } from '../../utils/teamUtils';

const GoalKicksPlayerChart = ({ events, onChartClick, matchInfo }: any) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const getPlayerName = (event: any) => {
      if (event.players && Array.isArray(event.players) && event.players.length > 0) {
        return event.players[0];
      }
      if (event.PLAYER) {
        return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
      }
      return event.extra_data?.JUGADOR || event.extra_data?.PLAYER || event.JUGADOR || 'Sin especificar';
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

    const detected = detectOurTeams(events || []);
    const teamName = matchInfo?.team_name || matchInfo?.TEAM || matchInfo?.team || detected[0] || '';
    const teamNameNorm = normalizeString(teamName).toUpperCase();

    const goalKicks = events.filter((e: any) => {
      const category = matchesCategory(e as any, 'GOAL-KICK', ['PALOS', 'PALOS RIVAL']);
      return category && detectSide(e) === 'OUR';
    });

    const playerStats: any = {};
    goalKicks.forEach((event: any) => {
      const player = getPlayerName(event);
      const result = getResult(event);
      if (!result) return; // ignorar intentos sin resultado identificado
      
      if (!playerStats[player]) {
        playerStats[player] = { success: 0, fail: 0 };
      }
      
      if (result === 'SUCCESS') {
        playerStats[player].success++;
      } else if (result === 'FAIL') {
        playerStats[player].fail++;
      }
    });

    const players = Object.keys(playerStats).sort();
    if (players.length === 0) {
      setChartData(null);
      return;
    }

    const data = {
      labels: players,
      datasets: [
        {
          label: 'Exitosos',
          data: players.map(p => playerStats[p].success),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        },
        {
          label: 'Fallidos',
          data: players.map(p => playerStats[p].fail),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        },
      ],
    };

    setChartData(data);
  }, [events, matchInfo]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const datasetIndex = elements[0].datasetIndex;
    const label = chartData?.labels?.[dataIndex];

    const getPlayerNameForFilter = (event: any) => {
      if (event.players && Array.isArray(event.players) && event.players.length > 0) {
        return event.players[0];
      }
      if (event.PLAYER) {
        return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
      }
      return event.extra_data?.JUGADOR || event.extra_data?.PLAYER || event.JUGADOR || 'Sin especificar';
    };

    const getResult = (event: any) => {
      const result = event.extra_data?.['RESULTADO-PALOS'] || 
                    event.extra_data?.RESULTADO_PALOS || 
                    event.RESULTADO_PALOS ||
                    'UNKNOWN';
      return String(result).toUpperCase();
    };

    const isSuccess = datasetIndex === 0;
    const filteredEvents = events.filter((ev: any) => {
      const playerName = getPlayerNameForFilter(ev);
      const result = getResult(ev);
      return matchesCategory(ev as any, 'GOAL-KICK', ['PALOS', 'PALOS RIVAL']) && 
             playerName === label && 
             (isSuccess ? result === 'SUCCESS' : result === 'FAIL');
    });

    const additionalFilters = [
      { descriptor: 'PLAYER', value: label },
      { descriptor: 'RESULTADO-PALOS', value: isSuccess ? 'SUCCESS' : 'FAIL' }
    ];

    onChartClick(event, elements, chart, 'player', 'goalkicks-tab', additionalFilters, filteredEvents);
  };

  const horizontal = (chartData?.labels?.length || 0) > 8;

  const chartOptions = {
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Patadas a los Palos por Jugador' },
    },
    scales: {
      x: horizontal ? { stacked: true, beginAtZero: true } : { stacked: true },
      y: horizontal ? { stacked: true } : { stacked: true, beginAtZero: true },
    },
    onClick: handleChartClick,
  };

  return chartData ? (
    <div style={{ height: '400px' }}>
      <Bar data={chartData} options={chartOptions as any} />
    </div>
  ) : null;
};

export default GoalKicksPlayerChart;
