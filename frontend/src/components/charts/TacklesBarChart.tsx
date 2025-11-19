import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFilterContext } from '../../context/FilterContext';
import { getTeamFromEvent, detectOurTeams, normalizeString } from '../../utils/teamUtils';

type Props = {
  events: any[];
  onBarClick?: (category: string, player: string) => void;
};

export default function TacklesBarChart({ events, onBarClick }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let timeout: any = null;
    const check = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsMobile(window.innerWidth <= 768), 120);
    };
    check();
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
      if (timeout) clearTimeout(timeout);
    };
  }, []);
  // Acceder a equipos propios desde el contexto
  const { ourTeamsList } = useFilterContext();

  // Filtrar solo eventos de tackle
  const allTackleEvents = (events || []).filter((e) => (e.CATEGORY === 'TACKLE' || e.event_type === 'TACKLE'));

  // Determinar lista de equipos propios de referencia
  let referenceOurTeams = (ourTeamsList && ourTeamsList.length > 0) ? ourTeamsList : detectOurTeams(events || []);
  referenceOurTeams = referenceOurTeams
    .map((t: string) => normalizeString(t).toLowerCase())
    .filter((t: string) => t && !/^(unknown|desconocido|rival|opponent|our_team|opp|home|away|nuestro equipo|equipo|team|oponente|rivales)$/i.test(t));

  // Si no hay equipos propios detectados, no mostrar nada
  if (!referenceOurTeams || referenceOurTeams.length === 0) {
    console.log('TacklesBarChart - no se detectaron equipos propios, no renderizando');
    return null;
  }

  // Solo mantener tackles que pertenezcan a nuestros equipos detectados
  const tackleEvents = allTackleEvents.filter((e) => {
    const team = getTeamFromEvent(e);
    if (!team) return false;
    return referenceOurTeams.includes(normalizeString(team).toLowerCase());
  });

  console.log("TacklesBarChart - Total events:", events.length);
  console.log("TacklesBarChart - Filtered tackle events (our teams):", tackleEvents.length);

  const playerAdvanceMap: Record<string, Record<string, number>> = {};

  tackleEvents.forEach((event) => {
    let players = [];
    // Prioridad 1: players (array desde API base_de_datos)
    if (event.players && Array.isArray(event.players)) {
      players = event.players;
    } else if (event.PLAYER) {
      players = Array.isArray(event.PLAYER) ? event.PLAYER : event.PLAYER.split(',');
    } else if (event.player_name) {
      players = Array.isArray(event.player_name) ? event.player_name : event.player_name.split(',');
    } else if (event.extra_data?.JUGADOR) {
      const jugador = event.extra_data.JUGADOR;
      if (typeof jugador === 'string') {
        players = jugador.split(',');
      } else if (Array.isArray(jugador)) {
        players = jugador;
      } else {
        console.warn("Unexpected JUGADOR format:", jugador);
      }
    }

  // Filtrar valores vacíos, null o placeholders como 'Unknown'/'Desconocido'
  players = players.filter(player => player && typeof player === 'string' && player.trim() !== '' && !/^(unknown|desconocido)$/i.test(player.trim()));

  const advance = event.ADVANCE || event.advance_type || event.extra_data?.AVANCE || 'UNKNOWN';

    players.forEach((player) => {
      // Solo procesar si hay un jugador válido (no vacío, no null, no undefined)
      const trimmedPlayer = player.trim();
  if (trimmedPlayer === '' ) return;
  if (/^(unknown|desconocido)$/i.test(trimmedPlayer)) return; // evitar etiquetas genéricas
  const normalizedPlayer = trimmedPlayer;

      if (!playerAdvanceMap[normalizedPlayer]) {
        playerAdvanceMap[normalizedPlayer] = { NEGATIVE: 0, NEUTRAL: 0, POSITIVE: 0 };
      }

      if (['NEGATIVE', 'NEUTRAL', 'POSITIVE'].includes(advance)) {
        playerAdvanceMap[normalizedPlayer][advance]++;
      } else {
        // Ignorar avances desconocidos en el gráfico de barras para evitar categoría "Desconocido"
        // (se puede mostrar en otros charts si es necesario)
      }
    });
  });

  const data = Object.keys(playerAdvanceMap).map(player => ({
    name: player,
    NEGATIVE: playerAdvanceMap[player].NEGATIVE,
    NEUTRAL: playerAdvanceMap[player].NEUTRAL,
    POSITIVE: playerAdvanceMap[player].POSITIVE,
  }));

  console.log("TacklesBarChart - Data for stacked chart:", data);

  const COLORS = {
    NEGATIVE: "#ff6b6b",
    NEUTRAL: "#feca57", 
    POSITIVE: "#48ca7b",
  };

  const handleBarClick = (data: any) => {
    if (onBarClick && data && data.activeLabel) {
      console.log("Bar clicked:", data);
      onBarClick("player", data.activeLabel);
    }
  };

  // Si no hay datos válidos, no renderizar nada
  if (!data || data.length === 0) return null;

  // Calcular ancho mínimo para el chart según número de jugadores (permitir scroll horizontal en pantallas pequeñas)
  const BAR_MIN_WIDTH = 28; // ancho aproximado por barra (reducido a la mitad)
  const baseWidth = Math.max(320, data.length * BAR_MIN_WIDTH + 60);
  const minWidthPx = baseWidth; // valor en px para minWidth
  const wrapperWidth = isMobile ? `${Math.max(minWidthPx, 360)}px` : '100%';

  const xAngle = isMobile ? -25 : -35;
  const xHeight = isMobile ? 48 : 60;

  // Fijar una altura en píxeles para evitar que ResponsiveContainer haga reflow continuo
  const chartHeight = isMobile ? 260 : 360;

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ width: wrapperWidth, minWidth: isMobile ? `${minWidthPx}px` : undefined, height: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 12, right: 0, left: -30, bottom: 30 }}
            onClick={handleBarClick}
          >
            <XAxis 
              dataKey="name" 
              angle={xAngle}
              textAnchor="end"
              height={xHeight}
              interval={0}
              tickMargin={8}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                return [value, name];
              }}
              labelFormatter={(label) => `Jugador: ${label}`}
            />
            <Legend />
            <Bar dataKey="NEGATIVE" stackId="a" fill={COLORS.NEGATIVE} name="Negativo" />
            <Bar dataKey="NEUTRAL" stackId="a" fill={COLORS.NEUTRAL} name="Neutral" />
            <Bar dataKey="POSITIVE" stackId="a" fill={COLORS.POSITIVE} name="Positivo" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
