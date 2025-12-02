import React from 'react';
import { useFilterContext } from '@/context/FilterContext';
import { computeTackleStatsAggregated, resolveTeamLabel } from '@/utils/teamUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TacklesEffectivityChart = ({ events, onChartClick }) => {
  const { ourTeamsList, matchInfo } = useFilterContext();
  
  console.log("🎯 TacklesEffectivityChart - Received events:", events?.length || 0);
  console.log("🎯 TacklesEffectivityChart - Our teams list:", ourTeamsList);
  console.log("🎯 TacklesEffectivityChart - Sample event:", events?.[0]);

  // Usar stats agregados para multi-match: "Nuestros Equipos" vs "Rivales"
  const statsByTeam = computeTackleStatsAggregated(events, ourTeamsList);

  const ourTeam = statsByTeam[0];
  const opponent = statsByTeam[1];

  console.log("🎯 TacklesEffectivityChart - Our team:", ourTeam);
  console.log("🎯 TacklesEffectivityChart - Opponent:", opponent);

  const handleChartClick = (event: any, elements: any, chart: any) => {
    // Firma estándar de Chart.js: (event, elements, chart)
    if (!elements || elements.length === 0) return;

    const el = elements[0];
    const datasetIndex = el.datasetIndex ?? el.dataset?.datasetIndex ?? el.element?.$context?.datasetIndex ?? el.element?.datasetIndex;
    const dataIndex = el.index ?? el.element?.index ?? el.element?.$context?.dataIndex ?? el.element?.$context?.dataIndex;

    // Usar nombres reales de equipos
    const teamCategory = dataIndex === 0 
      ? (matchInfo?.team_name || matchInfo?.TEAM || ourTeamsList[0] || 'PESCARA')
      : (matchInfo?.opponent_name || matchInfo?.OPPONENT || 'RIVAL');
    const tackleType = datasetIndex === 0 ? 'TACKLE' : 'MISSED-TACKLE';

    console.log("🎯 TacklesEffectivityChart - Clicked:", { teamCategory, tackleType, datasetIndex, dataIndex });

    // Enviar filtros con nombres reales
    const filters: any[] = [
      { descriptor: 'event_type', value: tackleType },
      { descriptor: 'EQUIPO', value: teamCategory }  // Usar EQUIPO que es el campo real en extra_data
    ];

    if (onChartClick) {
      try {
        onChartClick(event, elements, chart, 'tackles-effectivity', 'tackles-tab', filters);
      } catch (err) {
        // fallback: enviar firma (chartType, value, descriptor)
        onChartClick('tackles-effectivity', tackleType, 'event_type');
      }
    }
  };  const data = {
    labels: [ourTeam.teamName || 'Nuestros Equipos', opponent.teamName || 'Rivales'],
    datasets: [
      {
        label: `Tackles Exitosos`,
        data: [ourTeam.successful, opponent.successful],
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Tackles Errados',
        data: [ourTeam.missed, opponent.missed],
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Efectividad de Tackles por Equipo',
      },
      tooltip: {
        callbacks: {
          afterLabel: (context) => {
            const teamIndex = context.dataIndex;
            const teamStats = teamIndex === 0 ? ourTeam : opponent;
            return `Efectividad: ${teamStats.effectiveness}% (${teamStats.total} intentos)`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
      },
      y: {
        stacked: false,
        beginAtZero: true,
      },
    },
    // No usar onClick directamente aquí para evitar discrepancias de tipos en react-chartjs-2;
    // en su lugar, se puede pasar handleChartClick al wrapper si el componente lo soporta,
    // pero la mayoría de los charts aceptan la firma (event, elements, chart) en options.onClick.
    onClick: (event: any, elements: any, chart: any) => handleChartClick(event, elements, chart),
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default TacklesEffectivityChart;