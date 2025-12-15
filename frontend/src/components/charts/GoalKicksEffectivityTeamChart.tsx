import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { matchesCategory, isOpponentEvent } from '@/utils/eventUtils';
import { getTeamFromEvent, detectOurTeams, normalizeString } from '../../utils/teamUtils';

const GoalKicksEffectivityTeamChart = ({ events, onChartClick, matchInfo }: any) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
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
        ...collect(event.MISC), // etiquetas sin grupo
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

    const success = goalKicks.filter((e: any) => getResult(e) === 'SUCCESS').length;
    const fail = goalKicks.filter((e: any) => getResult(e) === 'FAIL').length;
    const totalKnown = success + fail;
    if (totalKnown === 0) {
      setChartData(null);
      return;
    }

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

    setChartData({ data, total: totalKnown, success, fail });
  }, [events, matchInfo]);

  const handleChartClick = (event: any, elements: any) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.data?.labels?.[dataIndex];

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

    const isSuccess = label === 'Exitosos';
      const filteredEvents = events.filter((ev: any) => {
      const result = getResult(ev);
      return matchesCategory(ev as any, 'GOAL-KICK', ['PALOS', 'PALOS RIVAL']) && 
             (isSuccess ? result === 'SUCCESS' : result === 'FAIL');
    });

    const additionalFilters = [
      { descriptor: 'RESULTADO-PALOS', value: isSuccess ? 'SUCCESS' : 'FAIL' }
    ];

    onChartClick(event, elements, chart, 'result', 'goalkicks-tab', additionalFilters, filteredEvents);
  };

  const centerTextPlugin = {
    id: 'centerTextTeam',
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
      title: { display: true, text: 'Efectividad - Nuestro Equipo' },
    },
    onClick: handleChartClick,
  };

  return chartData?.data ? (
    <div style={{ height: '400px' }}>
      <Doughnut data={chartData.data} options={chartOptions as any} plugins={[centerTextPlugin]} />
    </div>
  ) : null;
};

export default GoalKicksEffectivityTeamChart;
