import React, { useState, useEffect } from 'react';
import { useFilterContext } from '@/context/FilterContext';
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

const TacklesTimeChart = ({ events, onChartClick }) => {
  const [tacklesTimeChartData, setTacklesTimeChartData] = useState(null);
  const { filterDescriptors } = useFilterContext();

  useEffect(() => {
    console.log("🎯 TacklesTimeChart - Received events:", events?.length || 0);
    console.log("🎯 TacklesTimeChart - Sample event:", events?.[0]);
    console.log("🎯 TacklesTimeChart - Event types in received events:", [...new Set(events?.map(e => e.event_type) || [])]);
    
  // Aplicar filtros contextuales adicionales (ADVANCE/AVANCE) si existen

    // helper: extraer valor de avance de un evento en varias ubicaciones
    const extractAdvance = (event: any) => {
      return (
        event.extra_data?.descriptors?.AVANCE ||
        event.extra_data?.AVANCE ||
        event.extra_data?.advance ||
        event.extra_data?.advance_type ||
        event.advance ||
        event.ADVANCE ||
        event.AVANCE ||
        null
      );
    };

    // Base: solo eventos de tipo TACKLE/MISSED-TACKLE
    let pointsEvents = events.filter(
      (event) => event.event_type === "TACKLE" || event.CATEGORY === "TACKLE" || event.event_type === "MISSED-TACKLE"
    );

    // Si hay filtros de ADVANCE/AVANCE activos en el contexto, aplicarlos
    const advanceFilters = (filterDescriptors || []).filter((f: any) => f.descriptor === 'ADVANCE' || f.descriptor === 'AVANCE').map((f: any) => f.value);
    if (advanceFilters.length > 0) {
      pointsEvents = pointsEvents.filter((ev) => {
        const adv = extractAdvance(ev);
        if (Array.isArray(adv)) return adv.some(a => advanceFilters.includes(a));
        return adv !== null && advanceFilters.includes(adv);
      });
    }
    
    console.log("🎯 TacklesTimeChart - Filtered events by type:", {
      successfulTackles: pointsEvents.filter(e => e.event_type === "TACKLE" || e.CATEGORY === "TACKLE").length,
      missedTackles: pointsEvents.filter(e => e.event_type === "MISSED-TACKLE").length
    });
    
    console.log("🎯 TacklesTimeChart - Filtered TACKLE events from filteredEvents:", pointsEvents.length);
    console.log("🎯 TacklesTimeChart - Sample TACKLE event:", pointsEvents?.[0]);

    const timeGroups = [
      "0'- 20'",
      "20' - 40'",
      "40' - 60'",
      "60' - 80'"
    ];

    // Función para extraer Game_Time en segundos de extra_data
    const getGameTimeInSeconds = (event: any) => {
      // Primero intentar Game_Time de extra_data (formato "MM:SS")
      const gameTimeStr = event.extra_data?.Game_Time;
      if (gameTimeStr && typeof gameTimeStr === 'string') {
        const [mins, secs] = gameTimeStr.split(':').map(Number);
        if (!isNaN(mins) && !isNaN(secs)) {
          return mins * 60 + secs;
        }
      }
      // Fallback: otros campos o timestamp_sec como último recurso
      return Number(event.Game_Time ?? event.game_time ?? event.timestamp_sec ?? 0) || 0;
    };

    // Función para determinar el grupo de tiempo basado en segundos de juego
    const getTimeGroup = (seconds) => {
      if (seconds < 1200) return "0'- 20'";      // 0-20 minutos
      if (seconds < 2400) return "20' - 40'";    // 20-40 minutos
      if (seconds < 3600) return "40' - 60'";    // 40-60 minutos
      return "60' - 80'";                        // 60+ minutos
    };

    const data = {
      labels: timeGroups,
      datasets: [
      {
        label: "Tackles Exitosos",
        data: timeGroups.map(group => {
        const groupEvents = pointsEvents.filter(event => {
          const timeInSeconds = getGameTimeInSeconds(event);
          const eventTimeGroup = getTimeGroup(timeInSeconds);
          return eventTimeGroup === group && (event.event_type === "TACKLE" || event.CATEGORY === "TACKLE");
        });
        const totalTackles = groupEvents.length;
        return totalTackles;
        }),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
      },
      {
        label: "Tackles Errados",
        data: timeGroups.map(group => {
        const groupEvents = pointsEvents.filter(event => {
          const timeInSeconds = getGameTimeInSeconds(event);
          const eventTimeGroup = getTimeGroup(timeInSeconds);
          return eventTimeGroup === group && event.event_type === "MISSED-TACKLE";
        });
        const totalTackles = groupEvents.length;
        return totalTackles;
        }),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgba(255, 99, 132, 1)",
      },
      ],
    };

  console.log("🎯 TacklesTimeChart - Final data:", data);
    console.log("🎯 TacklesTimeChart - Data labels:", data.labels);
    console.log("🎯 TacklesTimeChart - Data values:", data.datasets[0].data);
    setTacklesTimeChartData(data);
  }, [events]);

  console.log("🎯 TacklesTimeChart - Rendering with data:", {
    tacklesTimeChartData,
    hasData: !!tacklesTimeChartData,
    dataLength: tacklesTimeChartData?.datasets?.[0]?.data?.length || 0
  });

  // const handleChartClick = (event, elements) => {
  //   if (elements.length > 0) {
  //     const index = elements[0].index;
  //     const timeGroups = [
  //       "0'- 20'",
  //       "20' - 40'",
  //       "40' - 60'",
  //       "60' - 80'"
  //     ];
  //     if (index >= 0 && index < timeGroups.length) {
  //       const timeGroup = timeGroups[index];
  //       onChartClick(event, elements, "time", [{ descriptor: "Time_Group", value: timeGroup }]);
  //     } else {
  //       console.error("Index out of bounds:", index);
  //     }
  //   }
  // };

  // const handleChartClick = (event, elements) => {
  //   onChartClick(event, elements, "time");
  // };


  const handleChartClick = (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const timeGroups = [
          "0'- 20'",
          "20' - 40'",
          "40' - 60'",
          "60' - 80'"
        ];
        if (index >= 0 && index < timeGroups.length) {
          const timeGroupValue = timeGroups[index];
          onChartClick("time", timeGroupValue, "Quarter_Group"); 
        }
      }
  };

  const tacklesTimeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Tackles por Tiempo de Juego',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label;
            const value = context.raw;
            return `${label}: ${value}`;
          },
        },
      },
      datalabels: {
        color: 'grey',
        formatter: (value, context) => {
          const meta = context.chart.getDatasetMeta(context.datasetIndex);
          const hidden = meta.data[context.dataIndex].hidden;
          return hidden || value === 0 ? '' : value;
        },
        font: {
          weight: 700,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
      },
    },
    onClick: handleChartClick,
  };

  return tacklesTimeChartData ? (
    <Bar data={tacklesTimeChartData} options={tacklesTimeChartOptions} />
  ) : null;
};

export default TacklesTimeChart;