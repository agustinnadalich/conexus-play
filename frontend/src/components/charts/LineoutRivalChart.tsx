import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const LineoutRivalChart = ({ events, onChartClick, matchInfo, ourTeamsList }: any) => {
  const getResult = (event: any) => {
    const candidates: any[] = [];
    candidates.push(event.extra_data?.['RESULTADO-LINE']);
    candidates.push(event.extra_data?.LINE_RESULT);
    candidates.push(event.LINE_RESULT);
    const lineField = event.extra_data?.LINE;
    if (Array.isArray(lineField)) candidates.push(...lineField);

    const pick = (vals: any[]) => {
      for (const v of vals) {
        if (v === undefined || v === null) continue;
        const s = String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim().replace(/\s+/g, '');
        if (!s || s === 'RIVAL' || s === 'SAN LUIS') continue;
        if (s.includes('LIMPIA') || s.includes('CLEAN') || s.includes('GAN')) return 'WIN';
        if (s.includes('SUCIA') || s.includes('DIRTY')) return 'WIN';
        if (s.includes('TORCID') || s.includes('NOTSTRAIGHT') || s.includes('NOT-STRAIGHT') || s.includes('PERD') || s.includes('LOST') || s.includes('LOSE') || s.includes('STEAL')) return 'LOSE';
      }
      return '';
    };

    return pick(candidates);
  };
  
  const isOpponent = (event: any) => {
    if (ourTeamsList && Array.isArray(ourTeamsList) && ourTeamsList.length > 0) {
      const team = event.team || event.TEAM || event.extra_data?.EQUIPO || event.extra_data?.TEAM || '';
      const normTeam = String(team || '').toLowerCase().trim();
      const ours = ourTeamsList.some((t: string) => t && normTeam === t.toLowerCase().trim());
      if (normTeam) return !ours;
    }
    if (matchInfo) {
      const oppNames = [
        matchInfo.OPPONENT,
        matchInfo.opponent,
        matchInfo.away,
        matchInfo.away_team,
        matchInfo.opponent_name,
      ].filter(Boolean).map((s: string) => String(s).toLowerCase().trim());
      const team = String(event.team || event.TEAM || event.extra_data?.EQUIPO || '').toLowerCase().trim();
      if (team && oppNames.includes(team)) return true;
    }
    const equipo = event.extra_data?.EQUIPO || '';
    if (String(equipo).toUpperCase() === 'RIVAL') return true;
    
    const team = event.team || event.TEAM || '';
    const teamStr = String(team).toUpperCase().trim();
    
    if (event.IS_OPPONENT === true || event.extra_data?.IS_OPPONENT === true) return true;
    if (teamStr === 'OPPONENT' || teamStr === 'RIVAL' || teamStr === 'AWAY' || teamStr === 'VISITANTE') return true;
    if (teamStr.includes('OPPONENT') || teamStr.includes('RIVAL') || teamStr.includes('AWAY')) return true;
    
    return false;
  };
  
  // Solo eventos del rival
  const rivalEvents = events.filter(event => isOpponent(event));
  
  const won = rivalEvents.filter(event => getResult(event) === 'WIN').length;
  const lost = rivalEvents.filter(event => getResult(event) === 'LOSE').length;
  const total = won + lost;
  const effectiveness = total > 0 ? ((won / total) * 100).toFixed(1) : 0;

  if (total === 0) return null;

  const data = {
    labels: ['Ganados', 'Perdidos'],
    datasets: [
      {
        data: [won, lost],
        backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(34, 197, 94, 0.8)'],
        hoverBackgroundColor: ['rgba(239, 68, 68, 1)', 'rgba(34, 197, 94, 1)'],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const handleChartClick = (event, elements) => {
    if (elements.length > 0 && onChartClick) {
      const chart = elements[0].element.$context.chart;
      const label = chart.data.labels[elements[0].index];
      const isWin = String(label || '').toUpperCase().includes('GAN');
      const filters = [
        { descriptor: "CATEGORY", value: 'LINEOUT' },
        { descriptor: "LINEOUT_RESULT", value: isWin ? 'WIN' : 'LOSE' },
        { descriptor: "TEAM_SIDE", value: 'OPPONENT' },
      ];
      onChartClick(event, elements, chart, 'LINEOUT', "set-pieces-tab", filters);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: false,
      },
      title: { 
        display: true, 
        text: 'Lineouts - Rival',
        font: { size: 16, weight: 'bold' as const }
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const label = tooltipItem.label || '';
            const value = tooltipItem.raw || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    onClick: handleChartClick,
  };

  const centerTextPlugin = {
    id: 'centerTextLineoutRival',
    beforeDraw: (chart) => {
      const { width, height, ctx } = chart;
      ctx.restore();

      const fontSize = height / 180;
      ctx.font = `bold ${fontSize.toFixed(2)}em sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#dc2626';

      const text = `${effectiveness}%`;
      const textX = Math.round((width - ctx.measureText(text).width) / 2);
      const textY = height / 2;
      
      ctx.fillText(text, textX, textY);
      
      ctx.font = `${(fontSize * 0.6).toFixed(2)}em sans-serif`;
      ctx.fillStyle = '#6b7280';
      const subText = `Efectividad`;
      const subTextX = Math.round((width - ctx.measureText(subText).width) / 2);
      ctx.fillText(subText, subTextX, textY + 20);

      ctx.save();
    },
  };

  return (
    <div style={{ height: '350px', width: '100%' }}>
      <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
};

export default LineoutRivalChart;
