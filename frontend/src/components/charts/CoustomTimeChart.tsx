import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { isOpponentEvent } from '@/utils/eventUtils';

const CoustomTimeChart = ({ events, onChartClick }) => {
  const [coustomTimeChartData, setTacklesTimeChartData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Obtener las categorías únicas de los eventos
  // const categories = [...new Set(events.map(event => event.CATEGORY))];
  const allowedCategories = ['TACKLE', 'MISSED-TACKLE', 'POINTS', 'BREAK', 'KICK', 'FREE-KICK', 'PENALTY', 'MAUL', 'SCRUM', 'GOAL-KICK', 'TURNOVER-', 'TURNOVER+', 'LINEOUT'];
  // const filteredCategories = categories.filter(category => allowedCategories.includes(category));

  useEffect(() => {
    if (selectedCategory === "" && allowedCategories.length > 0) {
      setSelectedCategory(allowedCategories[0]);
    }
  }, [allowedCategories]);

  useEffect(() => {
    if (selectedCategory === "") return;

    const coustomEvents = events.filter(
      (event) => event.CATEGORY === selectedCategory
    );

    const timeGroups = [
      "0'- 20'",
      "20' - 40'",
      "40' - 60'",
      "60' - 80'"
    ];

    const data = {
      labels: timeGroups,
      datasets: [
        {
          label: `Events by game time - ${selectedCategory}`,
          data: timeGroups.map(group => {
            const groupEvents = coustomEvents.filter(event => event.Time_Group === group && !isOpponentEvent(event));
            const totalEvents = groupEvents.length;
            return totalEvents;
          }),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
        {
          label: `Events by game time (Opponent) - ${selectedCategory}`,
          data: timeGroups.map(group => {
            const groupEvents = coustomEvents.filter(event => event.Time_Group === group && isOpponentEvent(event));
            const totalEvents = groupEvents.length;
            return totalEvents;
          }),
          backgroundColor: "rgba(255, 99, 132, 0.6)",
        },
      ],
    };

    setTacklesTimeChartData(data);
  }, [events, selectedCategory]);

  const handleChartClick = (event, elements) => {
    onChartClick(event, elements, "time");
  };

  const coustomTimeChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Eventos por Tiempo de Juego',
      },
      // tooltip: {
      //   callbacks: {
      //     label: (context) => {
      //       const label = context.dataset.label;
      //       const value = context.raw;
      //       return `${label}: ${value}`;
      //     },
      //   },
      // },
      datalabels: {
        display: false,
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: false,
      },
    },
    maintainAspectRatio: false,
    // onClick: handleChartClick,
  };

  return (
    <div>
      <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
        {allowedCategories.map((category) => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
      {coustomTimeChartData ? (
  <Bar data={coustomTimeChartData} options={coustomTimeChartOptions as any} />
      ) : null}
    </div>
  );
};

export default CoustomTimeChart;