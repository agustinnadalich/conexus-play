import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory } from '@/utils/eventUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface PenaltiesTimeChartProps {
  events: any[];
  onFilter?: (filterFn: (event: any) => boolean) => void;
  onChartClick?: (...args: any[]) => void;
  category?: string; // PENALTY / FREE-KICK / CARD
  title?: string;
  tabId?: string;
  skipCategoryFilter?: boolean;
  compact?: boolean;
}

const canonicalGroups = ["0'- 20'", "20'- 40'", "40'- 60'", "60'- 80'"];

const aliasMap: Record<string, string> = {
  "0-20": "0'- 20'",
  "0' - 20'": "0'- 20'",
  "0'- 20'": "0'- 20'",
  "0'-20'": "0'- 20'",
  "20-40": "20'- 40'",
  "20' - 40'": "20'- 40'",
  "20'- 40'": "20'- 40'",
  "20'-40'": "20'- 40'",
  "40-60": "40'- 60'",
  "40' - 60'": "40'- 60'",
  "40'- 60'": "40'- 60'",
  "40'-60'": "40'- 60'",
  "60-80": "60'- 80'",
  "60' - 80'": "60'- 80'",
  "60'- 80'": "60'- 80'",
  "60'-80'": "60'- 80'",
};

const normalizeGroupLabel = (value: string | null | undefined) => {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').replace(/\s?-\s?/, ' - ').trim();
};

const mapAliasToGroup = (raw: any) => {
  if (raw === null || raw === undefined) return '';
  const normalized = normalizeGroupLabel(raw);
  const lower = String(raw).toLowerCase().trim();
  if (aliasMap[normalized]) return aliasMap[normalized];
  if (aliasMap[lower]) return aliasMap[lower];
  if (/primer|1º|^q\s*1/i.test(normalized) || /primero/i.test(lower)) return "0'- 20'";
  if (/segundo|2º|^q\s*2/i.test(normalized)) return "20'- 40'";
  if (/tercer|3º|^q\s*3/i.test(normalized)) return "40'- 60'";
  if (/cuarto|4º|^q\s*4/i.test(normalized)) return "60'- 80'";
  if (/first|1st|q1/i.test(lower)) return "0'- 20'";
  if (/second|2nd|q2/i.test(lower)) return "20'- 40'";
  if (/third|3rd|q3/i.test(lower)) return "40'- 60'";
  if (/fourth|4th|q4/i.test(lower)) return "60'- 80'";
  return '';
};

const getTimeGroupCanonical = (event: any) => {
  const tgRaw = event.extra_data?.Time_Group ?? event.Time_Group ?? null;
  if (tgRaw) {
    const mapped = mapAliasToGroup(tgRaw);
    if (canonicalGroups.includes(mapped)) return mapped;
  }
  const gameTime = event.extra_data?.Game_Time ?? event.Game_Time ?? event.game_time;
  if (!gameTime) return null;
  const parts = String(gameTime).split(':').map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  const totalSeconds = parts[0] * 60 + parts[1];
  if (totalSeconds < 1200) return "0'- 20'";
  if (totalSeconds < 2400) return "20'- 40'";
  if (totalSeconds < 3600) return "40'- 60'";
  return "60'- 80'";
};

const isOpponent = (event: any) => {
  const equipo = event.extra_data?.EQUIPO || '';
  if (String(equipo).toUpperCase() === 'RIVAL') return true;
  const team = event.team || event.TEAM || event.extra_data?.TEAM || '';
  const teamStr = String(team).toUpperCase().trim();
  if (event.IS_OPPONENT === true || event.extra_data?.IS_OPPONENT === true) return true;
  if (event.IS_OPPONENT === 'true' || event.extra_data?.IS_OPPONENT === 'true') return true;
  if (teamStr === 'OPPONENT' || teamStr === 'RIVAL' || teamStr === 'AWAY' || teamStr === 'VISITANTE') return true;
  if (/OPPONENT|RIVAL|AWAY|VISITANTE/i.test(teamStr)) return true;
  return false;
};

const PenaltiesTimeChart: React.FC<PenaltiesTimeChartProps> = ({ events, onFilter, onChartClick, category = 'PENALTY', title = 'Penales por Bloque de Tiempo', tabId = 'penalties-tab', skipCategoryFilter = false, compact = false }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const penaltiesEvents = skipCategoryFilter ? events : events.filter(e => matchesCategory(e, category));
    const teamCounts = canonicalGroups.map(group => penaltiesEvents.filter(event => getTimeGroupCanonical(event) === group && !isOpponent(event)).length);
    const rivalCounts = canonicalGroups.map(group => penaltiesEvents.filter(event => getTimeGroupCanonical(event) === group && isOpponent(event)).length);
    const labels = canonicalGroups.filter((_, index) => teamCounts[index] + rivalCounts[index] > 0);
    if (labels.length === 0) {
      setChartData(null);
      return;
    }
    const data = {
      labels,
      datasets: [
        {
          label: 'Equipo',
          data: labels.map(label => teamCounts[canonicalGroups.indexOf(label)]),
          backgroundColor: 'rgba(30, 144, 255, 0.6)',
        },
        {
          label: 'Rival',
          data: labels.map(label => rivalCounts[canonicalGroups.indexOf(label)]),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
        },
      ],
    };
    setChartData(data);
  }, [events, category]);

  const handleBarClick = (event: any, elements: any[]) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const datasetIndex = elements[0].datasetIndex;
    const index = elements[0].index;
    const label = chartData?.labels?.[index];
    const datasetLabel = chartData?.datasets?.[datasetIndex]?.label || '';
    const isRivalDataset = datasetLabel.toLowerCase().includes('rival');
    const additionalFilters = [] as Array<{ descriptor: string; value: string }>;
    if (label) additionalFilters.push({ descriptor: 'Time_Group', value: label });
    additionalFilters.push({ descriptor: 'CATEGORY', value: category });
    // additionalFilters.push({ descriptor: 'TEAM_FILTER', value: isRivalDataset ? 'RIVAL' : 'TEAM' });

    if (onChartClick) {
      onChartClick(event, elements, chart, 'time', tabId, additionalFilters);
    }

    if (onFilter && label) {
      onFilter((e: any) => {
        if (!matchesCategory(e, category)) return false;
        const group = getTimeGroupCanonical(e);
        if (!group) return false;
        if (group !== label) return false;
        return isRivalDataset ? isOpponent(e) : !isOpponent(e);
      });
    }
  };

  if (!chartData) return null;

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
            title: {
              display: true,
              text: title,
            },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.raw}`,
        },
      },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
    maintainAspectRatio: false,
    onClick: handleBarClick,
  };

  const containerStyle = compact
    ? { minHeight: '200px', maxHeight: '280px' }
    : { minHeight: '260px', maxHeight: '420px' };

  return (
    <div style={containerStyle}>
      <Bar data={chartData} options={options as any} />
    </div>
  );
};

export default PenaltiesTimeChart;
