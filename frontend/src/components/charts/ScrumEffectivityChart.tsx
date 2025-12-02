import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const ScrumEffectivityChart = ({ events, title, onChartClick }) => {
  // Extraer resultado desde extra_data.SCRUM
  const getResult = (event: any) => {
    return event.extra_data?.SCRUM || event.SCRUM || event.SCRUM_RESULT;
  };
  
  const isOpponent = (event: any) => {
    const team = event.team || event.TEAM || event.extra_data?.EQUIPO || '';
    const teamStr = String(team).toUpperCase().trim();
    
    if (event.IS_OPPONENT === true || event.extra_data?.IS_OPPONENT === true) return true;
    if (event.IS_OPPONENT === 'true' || event.extra_data?.IS_OPPONENT === 'true') return true;
    if (teamStr === 'OPPONENT' || teamStr === 'RIVAL' || teamStr === 'AWAY' || teamStr === 'VISITANTE') return true;
    if (teamStr.includes('OPPONENT') || teamStr.includes('RIVAL') || teamStr.includes('AWAY')) return true;
    
    return false;
  };
  
  const teamWon = events.filter(event => {
    const result = getResult(event);
    return !isOpponent(event) && result && String(result).toUpperCase().includes('WIN');
  }).length;
  
  const teamLost = events.filter(event => {
    const result = getResult(event);
    return !isOpponent(event) && result && (String(result).toUpperCase().includes('LOST') || String(result).toUpperCase().includes('LOSE'));
  }).length;
  
  const rivalWon = events.filter(event => {
    const result = getResult(event);
    return isOpponent(event) && result && String(result).toUpperCase().includes('WIN');
  }).length;
  
  const rivalLost = events.filter(event => {
    const result = getResult(event);
    return isOpponent(event) && result && (String(result).toUpperCase().includes('LOST') || String(result).toUpperCase().includes('LOSE'));
  }).length;
  
  const totalTeam = teamWon + teamLost;
  const totalRival = rivalWon + rivalLost;
  const total = totalTeam + totalRival;
  const effectivenessTeam = totalTeam > 0 ? ((teamWon / totalTeam) * 100).toFixed(1) : 0;
  const effectivenessRival = totalRival > 0 ? ((rivalWon / totalRival) * 100).toFixed(1) : 0;

  const data = {
    labels: ['Equipo Won', 'Equipo Lost', 'Rival Won', 'Rival Lost'],
    datasets: [
      {
        data: [teamWon, teamLost, rivalWon, rivalLost],
        backgroundColor: ['rgba(30, 144, 255, 0.8)', 'rgba(30, 144, 255, 0.4)', 'rgba(255, 99, 132, 0.8)', 'rgba(255, 99, 132, 0.4)'],
        hoverBackgroundColor: ['rgba(30, 144, 255, 1)', 'rgba(30, 144, 255, 0.6)', 'rgba(255, 99, 132, 1)', 'rgba(255, 99, 132, 0.6)'],
      },
    ],
  };

  const handleChartClick = (event, elements) => {
    console.log("Chart clicked:", elements); // Verifica si el evento se dispara
    if (elements.length > 0) {
      const chart = elements[0].element.$context.chart;
      const label = chart.data.labels[elements[0].index];
      const category = 'SCRUM';
      onChartClick(event, elements, chart, category, "set-pieces-tab", [{ descriptor: "CATEGORY", value: category }]);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Permite que el gráfico ocupe todo el contenedor
    plugins: {
      legend: { display: false },
      title: { display: true, text: title },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const label = tooltipItem.label || '';
            const value = tooltipItem.raw || 0;
            return `${label}: ${value} (${((value / total) * 100).toFixed(1)}%)`;
          },
        },
      },
    },
    onClick: handleChartClick,
  };



  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: (chart) => {
      const { width } = chart;
      const { height } = chart;
      const ctx = chart.ctx;
      ctx.restore();

      // Texto para Equipo
      const labelFontSize = (height / 500).toFixed(2);
      ctx.font = `bold ${labelFontSize}em sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1e40af';

      const labelTextTeam = `Equipo: ${effectivenessTeam}%`;
      const labelXTeam = Math.round((width - ctx.measureText(labelTextTeam).width) / 2);
      const labelYTeam = height / 2 - 12;
      ctx.fillText(labelTextTeam, labelXTeam, labelYTeam);

      // Texto para Rival
      ctx.fillStyle = '#dc2626';
      const labelTextRival = `Rival: ${effectivenessRival}%`;
      const labelXRival = Math.round((width - ctx.measureText(labelTextRival).width) / 2);
      const labelYRival = height / 2 + 12;
      ctx.fillText(labelTextRival, labelXRival, labelYRival);

      ctx.save();
    },
  };

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
};

export default ScrumEffectivityChart;