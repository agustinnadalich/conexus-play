import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const PointsTimeChart = ({ events, onChartClick }) => {
  const [pointsTimeChartData, setPointsTimeChartData] = useState(null);

  useEffect(() => {
    const pointsEvents = events.filter((event) => event && (event.CATEGORY === "POINTS" || event.event_type === 'POINTS'));

    const getSeconds = (ev:any) => {
      // PRIORIDAD 1: Game_Time de extra_data (formato "MM:SS", tiempo de juego calculado)
      const gameTimeStr = ev.extra_data?.Game_Time;
      if (gameTimeStr && typeof gameTimeStr === 'string') {
        const [mins, secs] = gameTimeStr.split(':').map(Number);
        if (!isNaN(mins) && !isNaN(secs)) {
          return mins * 60 + secs;
        }
      }
      
      // PRIORIDAD 2: Si ya tiene Time_Group, no calcular segundos (usar el grupo directamente)
      if (ev.Time_Group || ev.extra_data?.Time_Group) return null;
      
      // PRIORIDAD 3: Otros campos de tiempo (fallback legacy)
      if (ev.SECOND !== undefined && ev.SECOND !== null) return Number(ev.SECOND);
      if (ev.SECOND_SINCE !== undefined && ev.SECOND_SINCE !== null) return Number(ev.SECOND_SINCE);
      if (ev.TIME) {
        const parts = String(ev.TIME).split(':').map(p => Number(p));
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        if (parts.length === 2) return parts[0]*60 + parts[1];
      }
      
      // ÚLTIMO RECURSO: timestamp_sec (segundos del video, NO del juego)
      if (ev.timestamp_sec !== undefined && ev.timestamp_sec !== null) return Number(ev.timestamp_sec);
      
      return null;
    };

    const timeGroups = ["0'- 20'","20' - 40'","40' - 60'","60' - 80'"];

    // Normalizar grupos para comparación consistente
    const normalizeGroupLabel = (s: string) => {
      if (!s) return '';
      // Convertir "0'- 20'" o "0' - 20'" a "0-20" para comparación
      return String(s).replace(/[''\s]/g, '').toLowerCase().trim();
    };
    const mapAliasToGroup = (raw: any) => {
      if (raw === null || raw === undefined) return '';
      const s = String(raw).toLowerCase().trim();
      if (s.includes('primer') || s.includes('1º') || s === 'q1' || s === '1q' || /^q\s*1/i.test(s)) return "0-20";
      if (s.includes('segundo') || s.includes('2º') || s === 'q2' || s === '2q' || /^q\s*2/i.test(s)) return "20-40";
      if (s.includes('tercer') || s.includes('terc') || s.includes('3º') || s === 'q3' || s === '3q' || /^q\s*3/i.test(s)) return "40-60";
      if (s.includes('cuarto') || s.includes('4º') || s === 'q4' || s === '4q' || /^q\s*4/i.test(s)) return "60-80";
      // English
      if (s.includes('first') || s.includes('1st') || s.includes('q1')) return "0-20";
      if (s.includes('second') || s.includes('2nd') || s.includes('q2')) return "20-40";
      if (s.includes('third') || s.includes('3rd') || s.includes('q3')) return "40-60";
      if (s.includes('fourth') || s.includes('4th') || s.includes('q4')) return "60-80";
      // Normalizar cualquier otro formato
      return normalizeGroupLabel(raw);
    };

    const getPointType = (ev:any) => {
      return ev?.extra_data?.['TIPO-PUNTOS'] ?? ev?.extra_data?.TIPO_PUNTOS ?? ev?.TIPO_PUNTOS ?? ev?.['TIPO-PUNTOS'] ?? ev?.MISC ?? null;
    };

    const getPointsValue = (ev:any) => {
      const type = String(getPointType(ev) ?? '').toUpperCase();
      if (!type) return 0;
      if (type.includes('TRY')) return 5;
      if (type.includes('CONVERSION')) return 2;
      if (type.includes('PENALTY')) return 3;
      if (type.includes('DROP')) return 3;
      const v = ev?.["POINTS(VALUE)"] ?? ev?.["POINTS_VALUE"] ?? ev?.["POINTS VALUE"] ?? ev?.["POINTS"] ?? 0;
      const num = Number(v);
      return Number.isFinite(num) ? num : 0;
    };

    // helper to determine team ownership (try multiple fields)
    const isOpponent = (ev:any) => {
      const team = (ev.TEAM ?? ev.EQUIPO ?? ev.extra_data?.EQUIPO ?? ev.extra_data?.TEAM ?? '').toString().toUpperCase();
      if (!team) return false;
      return /OPPONENT|RIVAL|RIVALES|AWAY|OPPONENTS|RIVAL_TEAM|OPP/i.test(team);
    };

    const teamDataset = timeGroups.map(group => {
      const normalizedGroup = normalizeGroupLabel(group);
      const rangeStart = parseInt(group.split("'")[0], 10) * 60; // minutes to seconds
      const rangeEnd = rangeStart + 20*60;
      const groupEvents = pointsEvents.filter(ev => {
        const evTimeGroupRaw = ev.Time_Group ?? ev.extra_data?.Time_Group ?? ev.extra_data?.Time_Group?.label ?? null;
        if (evTimeGroupRaw) {
          const evNormalized = mapAliasToGroup(evTimeGroupRaw);
          return evNormalized === normalizedGroup && !isOpponent(ev);
        }
        const s = getSeconds(ev);
        if (s === null) return false;
        return s >= rangeStart && s < rangeEnd && !isOpponent(ev);
      });
      return groupEvents.reduce((sum, ev) => sum + getPointsValue(ev), 0);
    });

    const oppDataset = timeGroups.map(group => {
      const normalizedGroup = normalizeGroupLabel(group);
      const rangeStart = parseInt(group.split("'")[0], 10) * 60;
      const rangeEnd = rangeStart + 20*60;
      const groupEvents = pointsEvents.filter(ev => {
        const evTimeGroupRaw = ev.Time_Group ?? ev.extra_data?.Time_Group ?? ev.extra_data?.Time_Group?.label ?? null;
        if (evTimeGroupRaw) {
          const evNormalized = mapAliasToGroup(evTimeGroupRaw);
          return evNormalized === normalizedGroup && isOpponent(ev);
        }
        const s = getSeconds(ev);
        if (s === null) return false;
        return s >= rangeStart && s < rangeEnd && isOpponent(ev);
      });
      return groupEvents.reduce((sum, ev) => sum + getPointsValue(ev), 0);
    });

    const data = {
      labels: timeGroups,
      datasets: [
        { label: "Puntos por tiempo de juego (Equipo)", data: teamDataset, backgroundColor: "rgba(75, 192, 192, 0.6)" },
        { label: "Puntos por tiempo de juego (Opponent)", data: oppDataset, backgroundColor: "rgba(255, 99, 132, 0.6)" },
      ]
    };

    // Debug - diagnóstico detallado por evento para entender por qué alguno no aparece en su bucket
    try {
      const byGroup: Record<string, any[]> = {};
      const unassigned: any[] = [];
      for (const g of timeGroups) byGroup[g] = [];

      for (const ev of pointsEvents) {
        const evTimeGroupRaw = ev.Time_Group ?? ev.extra_data?.Time_Group ?? ev.extra_data?.Time_Group?.label ?? null;
        const mapped = evTimeGroupRaw ? mapAliasToGroup(evTimeGroupRaw) : null;
        const s = getSeconds(ev);
        let computedGroup: string | null = null;
        if (mapped) computedGroup = mapped;
        else if (s !== null) {
          if (s < 1200) computedGroup = "0'- 20'";
          else if (s < 2400) computedGroup = "20' - 40'";
          else if (s < 3600) computedGroup = "40' - 60'";
          else computedGroup = "60' - 80'";
        }

        const pts = getPointsValue(ev);
        const info = {
          id: ev.id ?? ev.ID ?? null,
          time_raw: ev.TIME ?? ev.time ?? null,
          timestamp_sec: ev.timestamp_sec ?? s,
          Time_Group: evTimeGroupRaw,
          mappedGroup: mapped,
          computedGroup,
          TEAM: ev.TEAM ?? ev.EQUIPO ?? ev.extra_data?.TEAM ?? ev.extra_data?.EQUIPO ?? null,
          player: (() => {
            // Prioridad 1: players (array desde API base_de_datos)
            if (ev.players && Array.isArray(ev.players) && ev.players.length > 0) return ev.players[0];
            // Prioridad 2-4: campos legacy
            return ev.PLAYER ?? ev.player_name ?? ev.extra_data?.JUGADOR ?? null;
          })(),
          pointsValue: pts,
          pointType: getPointType(ev),
        };

        if (computedGroup && timeGroups.includes(computedGroup)) {
          byGroup[computedGroup].push(info);
        } else {
          unassigned.push(info);
        }
      }

      // Print summary and any unassigned events (useful to spot events like 87:59)
      // eslint-disable-next-line no-console
      console.log('PointsTimeChart - timeGroups:', timeGroups, 'teamDataset:', teamDataset, 'oppDataset:', oppDataset);
      // eslint-disable-next-line no-console
      console.log('PointsTimeChart - events by group (sample sizes):', Object.fromEntries(Object.entries(byGroup).map(([k,v])=>[k,v.length])));
      // eslint-disable-next-line no-console
      console.log('PointsTimeChart - unassigned POINTS events (count):', unassigned.length, unassigned.slice(0,10));
    } catch (err) {
      // ignore diagnostics failures
    }

    setPointsTimeChartData(data);
  }, [events]);

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

  const handleChartClick = (event, elements) => {
    if (!elements || elements.length === 0) {
      console.warn('PointsTimeChart - click handler invoked with empty elements', { event, elements });
      return;
    }
    const el = elements[0];
    const chart = el.element?.$context?.chart ?? (elements[0].element && elements[0].element.$context && elements[0].element.$context.chart);
    if (!chart) {
      console.warn('PointsTimeChart - unable to extract chart from elements', elements[0]);
      return;
    }
  // Emit the Time_Group descriptor along with the inferred label to allow ChartsTabs to apply the proper filter
  const dataIndex = el.index ?? el.element?.index ?? el.element?.$context?.dataIndex ?? el.element?.$context?.dataIndex;
  const label = chart.data.labels[dataIndex];
  onChartClick(event, elements, chart, "time", "points-tab", [{ descriptor: 'Time_Group', value: label }]); 
};
  const pointsTimeChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Puntos por Tiempo de Juego',
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
          weight: 'bold',
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
    maintainAspectRatio: false,
    onClick: handleChartClick,
  };

  return pointsTimeChartData ? (
    <Bar data={pointsTimeChartData} options={pointsTimeChartOptions as any} />
  ) : null;
};

export default PointsTimeChart;