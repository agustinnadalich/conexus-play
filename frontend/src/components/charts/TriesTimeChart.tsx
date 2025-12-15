import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const TriesTimeChart = ({ events, onChartClick }) => {
  const [triesTimeChartData, setTriesTimeChartData] = useState(null);

  useEffect(() => {
    
    const getPointType = (event: any) => {
      if (!event) return '';
      if (event.POINTS) return String(event.POINTS).toUpperCase();
      if (event.PUNTOS) return String(event.PUNTOS).toUpperCase();
      const ed = event.extra_data || {};
      const candidates = [ed['TIPO-PUNTOS'], ed['TIPO_PUNTOS'], ed['tipo_puntos'], ed['TIPO-PUNTO'], ed['PUNTOS'], ed['TIPO'], ed['type_of_points'], ed['type']];
      for (const c of candidates) {
        if (c !== undefined && c !== null) {
          const s = String(c).trim();
          if (s.length > 0) return s.toUpperCase();
        }
      }
      return '';
    };

    const triesEvents = events.filter((event) => {
      const pt = getPointType(event);
      return pt && pt.includes('TRY');
    });

    // Usar Time_Group real o mapear a grupos estándar (canonical)
    const normalizeGroupLabel = (s: string) => String(s || '').replace(/\s+/g, ' ').replace(/\s?-\s?/, ' - ').trim();
    const mapAliasToGroup = (raw: any) => {
      if (raw === null || raw === undefined) return '';
      const s = String(raw).toLowerCase().trim();
      // Retornar formato CON ESPACIOS alrededor del guion
      if (s.includes('primer') || s.includes('1º') || s === 'q1' || s === '1q' || /^q\s*1/i.test(s)) return "0' - 20'";
      if (s.includes('segundo') || s.includes('2º') || s === 'q2' || s === '2q' || /^q\s*2/i.test(s)) return "20' - 40'";
      if (s.includes('tercer') || s.includes('terc') || s.includes('3º') || s === 'q3' || s === '3q' || /^q\s*3/i.test(s)) return "40' - 60'";
      if (s.includes('cuarto') || s.includes('4º') || s === 'q4' || s === '4q' || /^q\s*4/i.test(s)) return "60' - 80'";
      // English
      if (s.includes('first') || s.includes('1st') || s.includes('q1')) return "0' - 20'";
      if (s.includes('second') || s.includes('2nd') || s.includes('q2')) return "20' - 40'";
      if (s.includes('third') || s.includes('3rd') || s.includes('q3')) return "40' - 60'";
      if (s.includes('fourth') || s.includes('4th') || s.includes('q4')) return "60' - 80'";
      const normalized = normalizeGroupLabel(raw);
      return normalized;
    };

    const getTimeGroupCanonical = (event: any) => {
      // Primero intentar usar Time_Group de extra_data (ya calculado)
      const tgRaw = event.extra_data?.Time_Group ?? event.Time_Group ?? null;
      if (tgRaw) return mapAliasToGroup(tgRaw);
      
      // Si no existe, calcular desde Game_Time (formato "MM:SS" en extra_data)
      const gameTime = event.extra_data?.Game_Time ?? event.Game_Time ?? event.game_time;
      if (!gameTime) return null;
      
      const parts = String(gameTime).split(':').map(Number);
      if (parts.length !== 2 || parts.some(isNaN)) return null;
      const totalSeconds = parts[0] * 60 + parts[1];
      
      // Usar formato CON ESPACIOS alrededor del guion
      if (totalSeconds < 1200) return "0' - 20'";
      if (totalSeconds < 2400) return "20' - 40'";
      if (totalSeconds < 3600) return "40' - 60'";
      return "60' - 80'";
    };

    // canonical ordered groups - CON ESPACIOS alrededor del guion para coincidir con normalizeGroupLabel
    const canonicalGroups = ["0' - 20'", "20' - 40'", "40' - 60'", "60' - 80'"];

    const teamCounts = canonicalGroups.map(group => {
      return triesEvents.filter(event => {
        const g = getTimeGroupCanonical(event);
        const team = event.team || event.TEAM || event.extra_data?.EQUIPO || event.extra_data?.TEAM;
        return g === group && team && !/OPPONENT|RIVAL|RIVALES|AWAY|OPPONENTS/i.test(String(team));
      }).length;
    });

    const oppCounts = canonicalGroups.map(group => {
      return triesEvents.filter(event => {
        const g = getTimeGroupCanonical(event);
        const team = event.team || event.TEAM || event.extra_data?.EQUIPO || event.extra_data?.TEAM;
        return g === group && team && /OPPONENT|RIVAL|RIVALES|AWAY|OPPONENTS/i.test(String(team));
      }).length;
    });

    // Only include groups that have any events to keep chart compact (but keep order)
    const labels = canonicalGroups.filter((g, i) => (teamCounts[i] + oppCounts[i]) > 0);

    const data = {
      labels,
      datasets: [
        { label: "Tries por tiempo de juego (Equipo)", data: labels.map(l => teamCounts[canonicalGroups.indexOf(l)]), backgroundColor: "rgba(75, 192, 192, 0.6)" },
        { label: "Tries por tiempo de juego (Opponent)", data: labels.map(l => oppCounts[canonicalGroups.indexOf(l)]), backgroundColor: "rgba(255, 99, 132, 0.6)" },
      ]
    };

    setTriesTimeChartData(data);
  }, [events]);

  const handleChartClick = (event, elements) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    // Determine which label was clicked
    const datasetIndex = elements[0].datasetIndex;
    const index = elements[0].index;
    const label = triesTimeChartData?.labels?.[index];
    

    // Emit a normalized Time_Group descriptor so ChartsTabs can toggle filters
    const additionalFilters = label ? [{ descriptor: 'Time_Group', value: label }] : [];

    onChartClick(event, elements, chart, 'time', 'tries-tab', additionalFilters);
  };

  const triesTimeChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Tries por Tiempo de Juego',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label;
            const value = context.raw;
            return `${label}: ${value}`;
          },
        },
      },
      datalabels: {
        color: 'grey',
        formatter: (value: any, context: any) => {
          try {
            const meta = context?.chart?.getDatasetMeta(context.datasetIndex);
            if (!meta || !meta.data) return '';
            const point = meta.data[context.dataIndex];
            const hidden = point?.hidden;
            return hidden || value === 0 ? '' : value;
          } catch (e) {
            return '';
          }
        },
        font: {
          weight: 700 as const,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { maxRotation: 0, autoSkip: true },
      },
      y: {
        stacked: true,
      },
    },
    maintainAspectRatio: false,
    onClick: handleChartClick,
  };

  // Container para controlar la altura y evitar que el chart colapse con otros elementos
  const containerStyle: React.CSSProperties = { minHeight: '260px', maxHeight: '420px' };

  return triesTimeChartData ? (
    <div style={containerStyle}>
      <Bar data={triesTimeChartData} options={triesTimeChartOptions as any} />
    </div>
  ) : null;
};

export default TriesTimeChart;
