import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

const TriesOriginChart = ({ events, onChartClick }) => {
  const [triesOriginChartData, setTriesOriginChartData] = useState(null);
  const [error, setError] = useState(null);
  const [phasesAvg, setPhasesAvg] = useState({ team: {}, opp: {} });
  
  // Capturar errores globales de Chart.js
  React.useEffect(() => {
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (source && source.includes('TriesOriginChart')) {
        console.error('CAPTURADO ERROR EN TriesOriginChart:', { message, source, lineno, colno, error });
        if (error && error.stack) {
          console.error('Stack trace completo:', error.stack);
        }
        setError({ message, source, lineno, colno, stack: error?.stack });
      }
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
    };
    
    return () => {
      window.onerror = originalOnError;
    };
  }, []);
  
  // Helper para detectar tipo de punto (TOP-level o en extra_data)
  const getPointType = (event: any) => {
    if (!event) return '';
    if (event.POINTS) return String(event.POINTS).toUpperCase();
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

  useEffect(() => {
    if (!events || events.length === 0) {
      setTriesOriginChartData(null);
      return;
    }

    console.log("Eventos recibidos:", events.length);

    const triesEvents = events.filter(event => {
      const pt = getPointType(event);
      return pt && pt.includes('TRY');
    });
    console.log("Eventos de tries:", triesEvents.length);

  const originCategories = ["TURNOVER", "SCRUM", "LINEOUT", "KICKOFF", "OTROS"];

    const originCounts: any = originCategories.reduce((acc: any, category: any) => {
      acc[category] = 0;
      return acc;
    }, {});

    const opponentCounts = { ...originCounts };
    const teamCounts = { ...originCounts };

    // Phases accumulation for averages
    const teamPhasesSum: any = originCategories.reduce((acc: any, c: any) => { acc[c] = 0; return acc; }, {});
    const teamPhasesCount: any = originCategories.reduce((acc: any, c: any) => { acc[c] = 0; return acc; }, {});
    const oppPhasesSum: any = originCategories.reduce((acc: any, c: any) => { acc[c] = 0; return acc; }, {});
    const oppPhasesCount: any = originCategories.reduce((acc: any, c: any) => { acc[c] = 0; return acc; }, {});

    const normalizeOrigin = (raw: any) => {
      if (!raw && raw !== 0) return 'OTROS';
      const s = String(raw).toUpperCase().trim();
      if (s === '' || s === 'RC') return 'OTROS';
      if (s.includes('SCRUM')) return 'SCRUM';
      if (s.includes('LINE')) return 'LINEOUT';
      if (s.includes('KICK')) return 'KICKOFF';
      if (s.includes('TURN')) return 'TURNOVER';
      if (s === 'OTROS' || s === 'OTHER' || s === 'OTRO') return 'OTROS';
      // fallback if unknown
      return originCategories.includes(s) ? s : 'OTROS';
    };

    triesEvents.forEach((tryEvent, idx) => {
      // Buscar origen en múltiples campos posibles
      const rawOrigin = tryEvent.TRY_ORIGIN || tryEvent.extra_data?.TRY_ORIGIN || tryEvent.extra_data?.ORIGIN || tryEvent.ORIGIN;
      const origin = normalizeOrigin(rawOrigin);

      // Capturar sector del campo para futuro uso en mapas
      const fieldSector = tryEvent.extra_data?.MISC || tryEvent.MISC;

      // Team puede estar en minúscula o mayúscula
      const team = (tryEvent.TEAM || tryEvent.team || tryEvent.EQUIPO || tryEvent.extra_data?.EQUIPO || tryEvent.extra_data?.TEAM || '').toString().toUpperCase();

      // Phase count (tryEvent.extra_data?.TRY_PHASES puede ser string o número)
      const rawPhases = tryEvent.extra_data?.TRY_PHASES ?? tryEvent.TRY_PHASES ?? null;
      const phases = rawPhases !== null && rawPhases !== undefined ? Number(rawPhases) : NaN;

      console.log(`Try #${idx}: originRaw=${rawOrigin}, normalized=${origin}, team=${team}, phases=${phases}, sector=${fieldSector}`);

      if (origin && originCategories.includes(origin)) {
        if (team === 'OPPONENT' || team === 'RIVAL') {
          opponentCounts[origin] = (opponentCounts[origin] || 0) + 1;
          if (!isNaN(phases)) { oppPhasesSum[origin] += phases; oppPhasesCount[origin] += 1; }
        } else {
          teamCounts[origin] = (teamCounts[origin] || 0) + 1;
          if (!isNaN(phases)) { teamPhasesSum[origin] += phases; teamPhasesCount[origin] += 1; }
        }
        // Log del conteo para verificar
        console.log(`Contando try: team=${team}, origin=${origin}, sector=${fieldSector}, phases=${phases}`);
      }
    });

    // Remove categories that have zero total (team + opponent) to avoid empty columns
    const filteredCategories = originCategories.filter(cat => (Number(teamCounts[cat] || 0) + Number(opponentCounts[cat] || 0)) > 0);
    const data = {
      labels: filteredCategories.map((l) => String(l)),
      datasets: [
        {
          label: "Origen de los Tries (OPPONENT)",
          data: filteredCategories.map((category: any) => Number(opponentCounts[category] || 0)),
          backgroundColor: "rgba(255, 99, 132, 0.6)",
        },
        {
          label: "Origen de los Tries (TEAM)",
          data: filteredCategories.map((category: any) => Number(teamCounts[category] || 0)),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
      ],
    };

    // Solo log si hay tries para evitar spam
    if (triesEvents.length > 0) {
      console.log("Datos del gráfico con tries:", data);
    }

    // Validación defensiva: labels debe existir y cada dataset.data debe ser array de números
    const isValidChartData = (d: any) => {
      if (!d || !Array.isArray(d.labels) || !Array.isArray(d.datasets)) return false;
      const labelsLen = d.labels.length;
      for (const ds of d.datasets) {
        if (!Array.isArray(ds.data) || ds.data.length !== labelsLen) return false;
        for (const v of ds.data) {
          if (typeof v !== 'number' || !isFinite(v)) return false;
        }
      }
      return true;
    };

    if (!isValidChartData(data)) {
      console.error('TriesOriginChart: datos inválidos detectados, se evita renderizar Chart. Detalles:', {
        data,
        originCounts,
        teamCounts,
        opponentCounts,
        triesEventsSample: triesEvents.slice(0, 5),
      });
      setTriesOriginChartData(null);
      return;
    }

    // Calcular promedios de fases y guardarlos en estado para tooltip
    const teamAvg: any = {};
    const oppAvg: any = {};
    for (const c of originCategories) {
      teamAvg[c] = teamPhasesCount[c] ? (teamPhasesSum[c] / teamPhasesCount[c]) : null;
      oppAvg[c] = oppPhasesCount[c] ? (oppPhasesSum[c] / oppPhasesCount[c]) : null;
    }
    setPhasesAvg({ team: teamAvg, opp: oppAvg });

    setTriesOriginChartData(data);
  }, [events]); // Solo depende de events, no de objetos que se recrean

    const handleChartClick = (event, elements) => {
    if (!elements || elements.length === 0) return;
    const chart = elements[0].element.$context.chart;
    const label = chart.data.labels?.[elements[0].index];
    const filteredEvents = events.filter(ev => {
      const pt = getPointType(ev);
      let origin = ev.TRY_ORIGIN || ev.extra_data?.TRY_ORIGIN || ev.extra_data?.ORIGIN || ev.ORIGIN;
      if (!origin || origin === "RC") origin = "OTROS";
      return pt && pt.includes('TRY') && origin === label;
    });

    // Descriptor básico de origen: usar la clave TRY_ORIGIN para que ChartsTabs la encuentre
    const additionalFilters = [
      { descriptor: "event_type", value: "POINTS" }, 
      { descriptor: "TRY_ORIGIN", value: label }
    ];

    // Añadir sector del campo si está disponible en los eventos filtrados (usar MISC si existe)
    const sectorsInEvents = [...new Set(filteredEvents.map(ev => ev.extra_data?.MISC || ev.MISC).filter(s => s))];
    if (sectorsInEvents.length === 1) {
      additionalFilters.push({ descriptor: "MISC", value: sectorsInEvents[0] });
    }

    // No añadir TRY_PHASES automáticamente al filtrar por origen — el usuario puede filtrar fases desde el chart de fases.
    onChartClick(event, elements, chart, "origin", "tries-tab", additionalFilters, filteredEvents);
  };

  const triesOriginChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Origen de los Tries',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label;
            const value = context.raw;
            // calcular promedio de fases para esta categoría
            const category = context.label;
            const isOpponent = label && label.toUpperCase().includes('OPPONENT');
            const avg = isOpponent ? phasesAvg.opp?.[category] ?? null : phasesAvg.team?.[category] ?? null;
            const phasesText = avg !== null && avg !== undefined ? ` · fases_avg: ${Number(avg).toFixed(1)}` : '';
            return `${label}: ${value}${phasesText}`;
          },
        },
      },
      datalabels: {
        color: 'grey',
        formatter: (value, context) => {
          try {
            const meta = (context.chart && context.chart.getDatasetMeta) ? context.chart.getDatasetMeta(context.datasetIndex) : null;
            const hidden = meta && meta.data && meta.data[context.dataIndex] && meta.data[context.dataIndex].hidden;
            return hidden || value === 0 ? '' : value;
          } catch (err) {
            return '';
          }
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

  return error ? (
    <div>
      <h4>Error detectado en TriesOriginChart:</h4>
      <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(error, null, 2)}
      </pre>
    </div>
  ) : triesOriginChartData ? (
    <div style={{ minHeight: 220 }}>
      <Bar 
        data={triesOriginChartData} 
        options={triesOriginChartOptions as any}
      />
    </div>
  ) : (
    <div>No data for TriesOriginChart</div>
  );
};

export default TriesOriginChart;
