import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { isOpponentEvent } from '@/utils/eventUtils';

const PointsTypeChart = ({ events, onChartClick }) => {
  const getPointType = (ev:any) => {
    // Normalizar múltiples posibles keys que contienen el tipo de punto
    const candidates = [
      ev?.POINTS,
      ev?.PUNTOS,
      ev?.extra_data?.POINTS,
      ev?.extra_data?.['TIPO-PUNTOS'],
      ev?.extra_data?.TIPO_PUNTOS,
      ev?.extra_data?.PUNTOS,
      ev?.TIPO_PUNTOS,
      ev?.['TIPO-PUNTOS'],
      ev?.MISC,
      ev?.extra_data?.MISC,
      ev?.extra_data?.type,
      ev?.type
    ];
    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      const s = Array.isArray(c) ? c.join(', ') : String(c);
      const cleaned = s.trim();
      if (cleaned === '' || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'undefined') continue;
      return cleaned;
    }
    return null;
  };

  // Consider only actual POINTS events to avoid counting GOAL-KICK duplicates
  const pointsEvents = events.filter((event:any) => {
    const cat = String(event?.CATEGORY ?? event?.event_type ?? '').toUpperCase();
    return cat === 'POINTS';
  });

  const pointTypes = [...new Set(pointsEvents.map(event => String(getPointType(event) ?? '').trim()).filter(p => p && p !== 'null' && p !== 'undefined'))];

  const getPointsValue = (ev:any) => {
    const type = String(getPointType(ev) ?? '').toUpperCase();
    if (type.includes('TRY')) return 5;
    if (type.includes('CONVERSION') || type.includes('CONVERT')) return 2;
    if (type.includes('PENALTY') || type.includes('PENAL')) return 3;
    if (type.includes('DROP')) return 3;
    if (!type) {
      const numericCandidates = [ev?.["POINTS(VALUE)"], ev?.["POINTS_VALUE"], ev?.["POINTS VALUE"], ev?.["POINTS"], ev?.PUNTOS, ev?.extra_data?.points, ev?.extra_data?.POINTS, ev?.extra_data?.PUNTOS];
      for (const c of numericCandidates) {
        if (c === undefined || c === null) continue;
        const num = Number(c);
        if (Number.isFinite(num)) return num;
      }
    }
    return 0;
  };

  const isOpponent = (ev:any) => {
    try {
      if (isOpponentEvent(ev)) return true;

      const ed = ev.extra_data || {};
      const teamRaw = ev.team ?? ev.TEAM ?? ev.EQUIPO ?? ed.EQUIPO ?? ed.TEAM ?? '';
      const team = String(teamRaw || '').trim().toUpperCase();
      if (!team) return false;
      if (/\b(OPP|OPPONENT|RIVAL|VISITA|VISITANTE|AWAY|RIVALES|OPPONENTS|RIVAL_TEAM|AWAY_TEAM)\b/i.test(team)) return true;

      if (ed.home_team !== undefined && ed.away_team !== undefined) {
        const teamId = Number(team);
        if (!Number.isNaN(teamId) && Number(ed.away_team) === teamId) return true;
      }
    } catch (e) {
      // ignore and default to false
    }
    return false;
  };

  const teamPointsByType = pointTypes.map(type => pointsEvents.filter(event => String(getPointType(event) ?? '').toUpperCase() === String(type).toUpperCase() && !isOpponent(event)).reduce((sum, ev) => sum + getPointsValue(ev), 0));
  const rivalPointsByType = pointTypes.map(type => pointsEvents.filter(event => String(getPointType(event) ?? '').toUpperCase() === String(type).toUpperCase() && isOpponent(event)).reduce((sum, ev) => sum + getPointsValue(ev), 0));

  const filteredPointTypes = pointTypes.filter((_, index) => teamPointsByType[index] > 0 || rivalPointsByType[index] > 0);

  // Build arrays per side but only include entries with positive values so labels, data and colors align
  const teamLabels: string[] = [];
  const teamData: number[] = [];
  const teamColors: string[] = [];
  const rivalLabels: string[] = [];
  const rivalData: number[] = [];
  const rivalColors: string[] = [];

  filteredPointTypes.forEach((type, idx) => {
    const teamVal = teamPointsByType[idx] ?? 0;
    const rivalVal = rivalPointsByType[idx] ?? 0;
    if (teamVal > 0) {
      teamLabels.push(`${type} (Our Team)`);
      teamData.push(teamVal);
      teamColors.push(`rgba(${30 + teamLabels.length * 20}, ${144 + teamLabels.length * 6}, 255, 0.8)`);
    }
    if (rivalVal > 0) {
      rivalLabels.push(`${type} (Opponent)`);
      rivalData.push(rivalVal);
      rivalColors.push(`rgba(255, ${100 + rivalLabels.length * 30}, ${100 + rivalLabels.length * 30}, 0.8)`);
    }
  });

  const totalTeamPoints = teamData.reduce((a, b) => a + b, 0);
  const totalRivalPoints = rivalData.reduce((a, b) => a + b, 0);

  const data = {
    labels: [...teamLabels, ...rivalLabels],
    datasets: [
      {
        data: [...teamData, ...rivalData],
        backgroundColor: [...teamColors, ...rivalColors],
        hoverBackgroundColor: [...teamColors, ...rivalColors]
      },
    ],
  };

  // Debug: log general totals
  // eslint-disable-next-line no-console
  console.log('PointsTypeChart - pointTypes:', pointTypes, 'teamPointsByType:', teamPointsByType, 'rivalPointsByType:', rivalPointsByType);

  // Diagnostics: buscar TRY events que parezcan pertenecer al rival según tooltip/datos
  try {
    const suspicious: any[] = [];
    for (const ev of events) {
      const pt = String(getPointType(ev) ?? '').toUpperCase();
      if (!pt.includes('TRY')) continue;
      const classifiedOpp = isOpponent(ev);
      const teamField = (ev.TEAM ?? ev.EQUIPO ?? ev.extra_data?.TEAM ?? ev.extra_data?.EQUIPO ?? '') || '';
      // si el tooltip muestra opponent pero la heurística classify como nuestro equipo, lo marcamos
      if (!classifiedOpp && (/OPP|OPPONENT|AWAY|RIVAL|VISITA|VISITANTE/i.test(String(teamField)))) {
        suspicious.push({ id: ev.id ?? ev.ID, teamField, extra_data: ev.extra_data, classifiedOpp });
      }
    }
    if (suspicious.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('PointsTypeChart - suspicious TRY events with opponent-like teamField but classified as our team:', suspicious.slice(0, 10));
    }
  } catch (err) {
    // ignore
  }

  const handleChartClick = (event, elements) => {
    if (!elements || elements.length === 0) {
      console.warn('PointsTypeChart - click handler invoked with empty elements', { event, elements });
      return;
    }
    const el = elements[0];
    const chart = el.element?.$context?.chart ?? (elements[0].element && elements[0].element.$context && elements[0].element.$context.chart);
    if (!chart) {
      console.warn('PointsTypeChart - unable to extract chart from elements', elements[0]);
      return;
    }
    const label = chart.data.labels[el.index ?? el.element?.index ?? el.element?.$context?.dataIndex ?? el.element?.$context?.dataIndex];
    const type = label.includes(' (Our Team)') ? label.replace(' (Our Team)', '') : label.replace(' (Opponent)', '');      
    // Filtrar por el tipo de puntos (no por la cantidad numérica) para evitar dejar la vista sin eventos
    onChartClick(event, elements, chart, "points_type", "points-tab", [
      { descriptor: "TIPO-PUNTOS", value: type },
      { descriptor: "type_of_points", value: type },
    ]);
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    // aumentar cutout para reducir el radio exterior y que entre mejor en cajas pequeñas
    cutout: '65%',
    plugins: {
      legend: {
        display: true,
        position: 'top',
        onClick: (e, legendItem, legend) => {
          const index = legendItem.index;
          const chart = legend.chart;
          const meta = chart.getDatasetMeta(0);
          // teamData entries occupy the first N positions
          const start = index === 0 ? 0 : teamData.length;
          const end = index === 0 ? teamData.length : meta.data.length;
          for (let i = start; i < end; i++) {
            meta.data[i].hidden = !meta.data[i].hidden;
          }
          chart.update();
        },
        labels: {
          generateLabels: (chart) => {
            return [
              {
                text: 'Our Team',
                fillStyle: 'rgba(54, 162, 235, 1)',
                hidden: false,
                index: 0,
              },
              {
                text: 'Opponent',
                fillStyle: 'rgba(255, 99, 132, 1)',
                hidden: false,
                index: 1,
              },
            ];
            },
          },
          },
          title: {
          display: true,
          text: 'Points by Type',
          },
          tooltip: {
          callbacks: {
            label: (context) => {
                    const label = context.label;
                    const value = context.raw;
                    const type = label.includes(' (Our Team)') ? label.replace(' (Our Team)', '') : label.replace(' (Opponent)', '');
                    // Count events by normalized point type and team ownership
                    const eventsCount = events.filter(event => {
                      const evType = String(getPointType(event) ?? '').trim();
                      const ownerIsOpp = isOpponent(event);
                      const matchesType = evType.toUpperCase() === String(type).toUpperCase();
                      const matchesOwner = label.includes(' (Our Team)') ? !ownerIsOpp : ownerIsOpp;
                      return matchesType && matchesOwner;
                    }).length;
                    return ` ${value} Points - (Events: ${eventsCount})`;
                    },
          },
          },
          datalabels: {
          color: 'grey',
          formatter: (value, context) => {
          const meta = context.chart.getDatasetMeta(context.datasetIndex);
          const element = meta.data[context.dataIndex];
          const hidden = element ? element.hidden : false;
          return hidden || value === 0 ? '' : value;
        },
        font: {
          weight: 'bold',
        },
      },
    },
    onClick: handleChartClick,
  };

  const centerTextPlugin = {
    id: 'centerTextPointsType',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const meta = chart.getDatasetMeta?.(0);
      const firstArc = meta?.data?.[0];
      const centerX = firstArc?.x ?? chartArea.left + chartArea.width / 2;
      const centerY = firstArc?.y ?? chartArea.top + chartArea.height / 2;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = 'rgba(255, 99, 132, 1)';
      ctx.fillText(`${totalRivalPoints}`, centerX, centerY - 10);
      ctx.fillStyle = 'rgba(54, 162, 235, 1)';
      ctx.fillText(`${totalTeamPoints}`, centerX, centerY + 10);
      ctx.restore();
    },
  };

  return (
    <div className="relative w-full h-full max-w-full overflow-hidden flex items-center justify-center">
      <div className="w-full h-full max-h-52 sm:max-h-80 flex items-center justify-center">
        <Doughnut
          data={data}
          options={pieChartOptions as any}
          plugins={[ChartDataLabels, centerTextPlugin]}
          style={{ maxHeight: '100%', maxWidth: '100%', height: '100%', width: '100%' }}
        />
      </div>
    </div>
  );
};

export default PointsTypeChart;
