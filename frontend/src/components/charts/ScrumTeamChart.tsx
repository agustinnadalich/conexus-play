import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const ScrumTeamChart = ({ events, onChartClick }) => {
  const getResult = (event: any) => {
    const raw = event.extra_data?.SCRUM || event.SCRUM || event.SCRUM_RESULT || '';
    const s = String(raw).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (s.includes('GAN') || s.includes('WIN')) return 'WIN';
    if (s.includes('PERD') || s.includes('LOSE') || s.includes('LOST')) return 'LOSE';
    return '';
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
  
  // Solo eventos del equipo (no rival)
  const teamEvents = events.filter(event => !isOpponent(event));
  
  const won = teamEvents.filter(event => getResult(event) === 'WIN').length;
  const lost = teamEvents.filter(event => getResult(event) === 'LOSE').length;
  const total = won + lost;
  const effectiveness = total > 0 ? ((won / total) * 100).toFixed(1) : 0;

  const data = {
    labels: ['Ganados', 'Perdidos'],
    datasets: [
      {
        data: [won, lost],
        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        hoverBackgroundColor: ['rgba(34, 197, 94, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const handleChartClick = (event, elements) => {
    if (elements.length > 0 && onChartClick) {
      const chart = elements[0].element.$context.chart;
      const label = chart.data.labels[elements[0].index];
      onChartClick(event, elements, chart, 'SCRUM', "set-pieces-tab", [{ descriptor: "CATEGORY", value: 'SCRUM' }]);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'bottom' as const,
      },
      title: { 
        display: true, 
        text: 'Scrums - Nuestro Equipo',
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
    id: 'centerTextTeam',
    beforeDraw: (chart) => {
      const { width, height, ctx } = chart;
      ctx.restore();

      const fontSize = height / 180;
      ctx.font = `bold ${fontSize.toFixed(2)}em sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#059669';

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

export default ScrumTeamChart;
