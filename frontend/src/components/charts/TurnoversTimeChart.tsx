import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const TurnoversTimeChart = ({ events, onChartClick }: any) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const canonicalGroups = ["0' - 20'", "20' - 40'", "40' - 60'", "60' - 80'"];
    
    const groupAliases = {
      "0'- 20'": "0' - 20'",
      "0'-20'": "0' - 20'",
      "0-20": "0' - 20'",
      "20'- 40'": "20' - 40'",
      "20'-40'": "20' - 40'",
      "20-40": "20' - 40'",
      "40'- 60'": "40' - 60'",
      "40'-60'": "40' - 60'",
      "40-60": "40' - 60'",
      "60'- 80'": "60' - 80'",
      "60'-80'": "60' - 80'",
      "60-80": "60' - 80'",
    };

    const mapAliasToGroup = (tg: any) => {
      if (!tg) return null;
      const tgStr = String(tg).trim();
      if (canonicalGroups.includes(tgStr)) return tgStr;
      return groupAliases[tgStr] || null;
    };

    const getTimeGroupCanonical = (event: any) => {
      const tgRaw = event.extra_data?.Time_Group;
      if (tgRaw) {
        const mapped = mapAliasToGroup(tgRaw);
        if (mapped) return mapped;
      }

      const gameTime = event.extra_data?.Game_Time || event.game_time;
      if (!gameTime) return null;

      const parts = String(gameTime).split(':').map(Number);
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;

      const totalSeconds = parts[0] * 60 + parts[1];

      if (totalSeconds < 1200) return "0' - 20'";
      if (totalSeconds < 2400) return "20' - 40'";
      if (totalSeconds < 3600) return "40' - 60'";
      return "60' - 80'";
    };

    const eventsByGroup = canonicalGroups.reduce((acc: any, group: string) => {
      acc[group] = { recovered: [], lost: [] };
      return acc;
    }, {});

    events.forEach((event) => {
      const group = getTimeGroupCanonical(event);
      if (!group || !eventsByGroup[group]) return;

      const category = event.CATEGORY || event.event_type;
      if (category === 'TURNOVER+') {
        eventsByGroup[group].recovered.push(event);
      } else if (category === 'TURNOVER-') {
        eventsByGroup[group].lost.push(event);
      }
    });

    const data = {
      labels: canonicalGroups,
      datasets: [
        {
          label: "Recuperados",
          data: canonicalGroups.map((group) => eventsByGroup[group].recovered.length),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
        {
          label: "Perdidos",
          data: canonicalGroups.map((group) => eventsByGroup[group].lost.length),
          backgroundColor: "rgba(255, 99, 132, 0.6)",
        },
      ],
    };

    setChartData(data);
  }, [events]);

  const handleChartClick = (event, elements) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const datasetIndex = elements[0].datasetIndex ?? elements[0].element?.$context?.datasetIndex;

    const canonicalGroups = ["0' - 20'", "20' - 40'", "40' - 60'", "60' - 80'"];
    const label = canonicalGroups[dataIndex];
    const isRecovered = datasetIndex === 0;

    const groupAliases = {
      "0'- 20'": "0' - 20'",
      "0'-20'": "0' - 20'",
      "0-20": "0' - 20'",
      "20'- 40'": "20' - 40'",
      "20'-40'": "20' - 40'",
      "20-40": "20' - 40'",
      "40'- 60'": "40' - 60'",
      "40'-60'": "40' - 60'",
      "40-60": "40' - 60'",
      "60'- 80'": "60' - 80'",
      "60'-80'": "60' - 80'",
      "60-80": "60' - 80'",
    };

    const mapAliasToGroup = (tg: any) => {
      if (!tg) return null;
      const tgStr = String(tg).trim();
      if (canonicalGroups.includes(tgStr)) return tgStr;
      return groupAliases[tgStr] || null;
    };

    const getTimeGroupCanonical = (event: any) => {
      const tgRaw = event.extra_data?.Time_Group;
      if (tgRaw) {
        const mapped = mapAliasToGroup(tgRaw);
        if (mapped) return mapped;
      }
      const gameTime = event.extra_data?.Game_Time || event.game_time;
      if (!gameTime) return null;
      const parts = String(gameTime).split(':').map(Number);
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
      const totalSeconds = parts[0] * 60 + parts[1];
      if (totalSeconds < 1200) return "0' - 20'";
      if (totalSeconds < 2400) return "20' - 40'";
      if (totalSeconds < 3600) return "40' - 60'";
      return "60' - 80'";
    };

    const categoryFilter = isRecovered ? 'TURNOVER+' : 'TURNOVER-';

    const filteredEvents = events.filter((ev) => {
      const evGroup = getTimeGroupCanonical(ev);
      if (evGroup !== label) return false;
      const category = ev.CATEGORY || ev.event_type;
      return category === categoryFilter;
    });

    const additionalFilters = [
      { descriptor: 'Time_Group', value: label },
      { descriptor: 'Type', value: isRecovered ? 'Recuperado' : 'Perdido' },
    ];

    onChartClick(event, elements, chart, 'timeGroup', 'turnovers-tab', additionalFilters, filteredEvents);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Turnovers por Bloque de Tiempo',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    onClick: handleChartClick,
  };

  return chartData ? (
    <div style={{ height: '400px' }}>
      <Bar data={chartData} options={chartOptions as any} />
    </div>
  ) : null;
};

export default TurnoversTimeChart;
