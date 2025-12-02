import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Scatter } from 'react-chartjs-2';
import { Chart } from 'chart.js';
import { usePlayback } from '@/context/PlaybackContext';
import type { MatchEvent } from '@/types';

// Plugin para dibujar imagen de fondo
const backgroundImagePlugin = {
  id: 'backgroundImage',
  beforeDraw: (chart: any) => {
    if (chart.options.backgroundImage) {
      const ctx = chart.ctx;
      const { top, left, width, height } = chart.chartArea;
      const image = chart.options.backgroundImage;
      
      if (image && image.complete) {
        ctx.drawImage(image, left, top, width, height);
      }
    }
  },
};

Chart.register(backgroundImagePlugin);

interface MatchInfo {
  team_name: string;
  opponent_name: string;
}

interface FieldMapChartProps {
  events: MatchEvent[];
  matchInfo: MatchInfo;
}

const FieldMapChart: React.FC<FieldMapChartProps> = ({ events, matchInfo }) => {
  const { playEvent } = usePlayback();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Cargar imagen de fondo
  useEffect(() => {
    const img = new Image();
    img.src = isMobile ? '/CANCHA-CORTADA-VERT.jpg' : '/CANCHA-CORTADA.jpg';
    img.onload = () => setBackgroundImage(img);
  }, [isMobile]);

  // Colores por tipo de evento
  const eventColors: Record<string, string> = {
    'BREAK': '#10b981', // green
    'POINTS': '#3b82f6', // blue
    'PENALTY': '#ef4444', // red
    'TURNOVER-': '#f97316', // orange
    'TURNOVER+': '#8b5cf6', // purple
    'RUCK': '#a855f7', // purple-light
    'LINEOUT': '#14b8a6', // teal
    'SCRUM': '#06b6d4', // cyan
    'GOAL-KICK': '#f59e0b', // amber
    'KICK': '#84cc16', // lime
    'TACKLE': '#64748b', // slate
  };

  const scatterData = useMemo(() => {
    // Filtrar eventos con coordenadas válidas
    const validEvents = events.filter((event) => {
      const x = event.x;
      const y = event.y;
      return (
        x !== undefined &&
        x !== null &&
        y !== undefined &&
        y !== null &&
        !isNaN(x) &&
        !isNaN(y) &&
        event.event_type !== 'DEFENSE' &&
        event.event_type !== 'ATTACK' &&
        event.event_type !== 'SHORT-MATCH'
      );
    });

    // Agrupar por tipo de evento
    const grouped = validEvents.reduce((acc, event) => {
      if (!acc[event.event_type]) {
        acc[event.event_type] = [];
      }
      acc[event.event_type].push(event);
      return acc;
    }, {} as Record<string, MatchEvent[]>);

    // Crear datasets
    return {
      datasets: Object.entries(grouped).map(([eventType, eventsOfType]) => ({
        label: eventType,
        data: eventsOfType.map((event) => ({
          x: isMobile ? Number(event.x) : -Number(event.y),
          y: isMobile ? -Number(event.y) : -Number(event.x),
          eventId: event.id,
          eventType: event.event_type,
          timestamp: event.timestamp_sec,
          gameTime: event.extra_data?.game_time || event.extra_data?.Game_Time || 'N/A',
          player: event.extra_data?.JUGADOR || event.extra_data?.PLAYER || 'N/A',
          team: event.extra_data?.EQUIPO || 'N/A',
        })),
        backgroundColor: eventColors[eventType] || '#9ca3af',
        pointRadius: 6,
        pointHoverRadius: 10,
      })),
    };
  }, [events, isMobile]);

  const handlePointClick = useCallback(
    (_event: any, elements: any[]) => {
      if (!elements || elements.length === 0) return;
      const { datasetIndex, index } = elements[0];
      const dataset = scatterData.datasets[datasetIndex];
      if (!dataset) return;
      const pointData = (dataset.data as any[])[index] || {};
      const eventId = pointData.eventId;
      const timestamp = pointData.timestamp;

      let matched = events.find((evt) => evt.id === eventId);
      if (!matched && eventId !== undefined && eventId !== null) {
        matched = events.find(
          (evt) =>
            String(evt.id ?? evt.ID ?? '') === String(eventId)
        );
      }
      if (!matched && timestamp !== undefined) {
        matched = events.find(
          (evt) =>
            evt.timestamp_sec === timestamp ||
            evt.SECOND === timestamp
        );
      }

      if (matched) {
        playEvent(matched as MatchEvent);
      }
    },
    [events, playEvent, scatterData]
  );

  const options = useMemo(
    () => ({
      plugins: {
        title: {
          display: true,
          text: 'Mapa de Eventos',
          font: {
            size: 16,
            weight: 'bold' as const,
          },
        },
        legend: {
          display: true,
          position: 'right' as const,
          labels: {
            boxWidth: 12,
            padding: 10,
            font: {
              size: 10,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const data = context.raw;
              const lines = [
                `${data.eventType}`,
                `Tiempo: ${data.gameTime}`,
                `Jugador: ${data.player}`,
                `Equipo: ${data.team}`,
                `Coordenadas: (${context.parsed.x.toFixed(1)}, ${context.parsed.y.toFixed(1)})`,
              ];
              return lines;
            },
          },
        },
        datalabels: {
          display: false,
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
          position: 'bottom' as const,
          min: isMobile ? 0 : -100,
          max: isMobile ? 70 : 4,
          title: {
            display: false,
          },
          ticks: {
            display: false,
          },
          grid: {
            display: false,
          },
        },
        y: {
          type: 'linear' as const,
          min: isMobile ? -100 : -70,
          max: isMobile ? 4 : 0,
          title: {
            display: false,
          },
          ticks: {
            display: false,
          },
          grid: {
            display: false,
          },
        },
      },
      maintainAspectRatio: false,
      backgroundImage: backgroundImage,
      interaction: {
        mode: 'nearest' as const,
        intersect: true,
      },
      onClick: handlePointClick,
      onHover: (event: any, elements: any[]) => {
        const target = event?.native?.target as HTMLElement | undefined;
        if (target) {
          target.style.cursor = elements && elements.length ? 'pointer' : 'default';
        }
      },
    }),
    [backgroundImage, handlePointClick, isMobile]
  );

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No hay eventos con coordenadas para mostrar</p>
      </div>
    );
  }

  const validEventsCount = events.filter(
    (e) => e.x !== undefined && e.y !== undefined && !isNaN(e.x) && !isNaN(e.y)
  ).length;

  if (validEventsCount === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No hay eventos con coordenadas válidas</p>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: isMobile ? '500px' : '600px' }}>
      <Scatter data={scatterData} options={options} />
    </div>
  );
};

export default FieldMapChart;
