import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import TacklesBarChart from "./charts/TacklesBarChart";
import MissedTacklesBarChart from "./charts/MissedTacklesBarChart";
import TacklesByTeamChart from "./charts/TacklesByTeamChart";
import TacklesTimeChart from "./charts/TacklesTimeChart";
import AdvancePieChart from "./charts/AdvancePieChart";
import PlayerPointsChart from "./charts/PlayerPointsChart";
import PointsTimeChart from "./charts/PointsTimeChart";
import PointsTypeChart from "./charts/PointsTypeChart";
import TriesPlayerChart from "./charts/TriesPlayerChart";
import TriesTimeChart from "./charts/TriesTimeChart";
import TriesOriginChart from "./charts/TriesOriginChart";
import TriesPhasesChart from "./charts/TriesPhasesChart";
import PenaltiesPlayerBarChart from "./charts/PenaltiesPlayerBarChart";
import PenaltiesTimeChart from "./charts/PenaltiesTimeChart";
import PenaltiesCausePieChart from "./charts/PenaltiesCausePieChart";
import TurnoversRecoversBarChart from "./charts/TurnoversRecoversBarChart";
import TurnoversLostBarChart from "./charts/TurnoversLostBarChart";
import TurnoversTypeChart from "./charts/TurnoversTypeChart";
import TurnoversTimeChart from "./charts/TurnoversTimeChart";
import ScrumEffectivityChart from "./charts/ScrumEffectivityChart";
import LineoutEffectivityChart from "./charts/LineoutEffectivityChart";
import ScrumTeamChart from "./charts/ScrumTeamChart";
import ScrumRivalChart from "./charts/ScrumRivalChart";
import LineoutTeamChart from "./charts/LineoutTeamChart";
import LineoutRivalChart from "./charts/LineoutRivalChart";
import GoalKicksEffectivityTeamChart from "./charts/GoalKicksEffectivityTeamChart";
import GoalKicksEffectivityOpponentChart from "./charts/GoalKicksEffectivityOpponentChart";
import GoalKicksPlayerChart from "./charts/GoalKicksPlayerChart";
import GoalKicksTimeChart from "./charts/GoalKicksTimeChart";
import LineBreaksPlayerChart from "./charts/LineBreaksPlayerChart";
import LineBreaksTypeTeamChart from "./charts/LineBreaksTypeTeamChart";
import LineBreaksTypeOpponentChart from "./charts/LineBreaksTypeOpponentChart";
import LineBreaksChannelTeamChart from "./charts/LineBreaksChannelTeamChart";
import LineBreaksChannelOpponentChart from "./charts/LineBreaksChannelOpponentChart";
import LineBreaksTimeChart from "./charts/LineBreaksTimeChart";
import LineBreaksResultChart from "./charts/LineBreaksResultChart";
import CardsSummaryChart from "./charts/CardsSummaryChart";
import PassesOutcomeChart from "./charts/PassesOutcomeChart";
import MaulsOutcomeChart from "./charts/MaulsOutcomeChart";
import OpenPlayKicksChart from "./charts/OpenPlayKicksChart";
import PossessionShareChart from "./charts/PossessionShareChart";
import InfringementsCauseChart from "./charts/InfringementsCauseChart";
import RucksSpeedPieChart from "./charts/RucksSpeedPieChart";
import OpenPlayKicksTeamPieChart from "./charts/OpenPlayKicksTeamPieChart";
import OpenPlayKicksPlayerChart from "./charts/OpenPlayKicksPlayerChart";
import RucksFieldZonesChart from "./charts/RucksFieldZonesChart";
// import TimelineChart from "./charts/TimelineChart";
// import ScatterChart from "./charts/ScatterChart";
// Aquí luego podrás importar los otros charts
import { useFilterContext } from "../context/FilterContext";
import { getTeamFromEvent, normalizeString, isOurTeam, computeTackleStatsAggregated, detectOurTeams } from "../utils/teamUtils";
import { matchesCategory, isOpponentEvent as isOpponent } from "../utils/eventUtils";

const getPlayerNameGeneric = (event: any): string | null => {
  if (event?.players && Array.isArray(event.players) && event.players.length > 0) return event.players[0];
  if (event?.PLAYER) return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
  const ed = event?.extra_data || {};
  const candidate = event?.player_name || event?.JUGADOR || ed.JUGADOR || ed.PLAYER;
  if (!candidate) return null;
  const s = String(candidate).trim();
  return s.length ? s : null;
};
import type { MatchEvent } from "@/types";


const ChartsTabs = (_props: any) => {
  const {
    events,
    filteredEvents,
    filterDescriptors,
    setFilterDescriptors,
    setFilteredEvents,
    matchInfo,
    ourTeamsList,
  } = useFilterContext() as {
    events: MatchEvent[];
    filteredEvents: MatchEvent[];
    filterDescriptors: any[];
    setFilterDescriptors: (filters: any[]) => void;
    setFilteredEvents: (events: any[]) => void;
    matchInfo?: any;
    ourTeamsList: string[];
  };

    // Devuelve el estado de origen de tries:
    // 'calculated' = al menos un try tiene un origen real distinto de OTROS/RC
    // 'present_but_generic' = hay clave TRY_ORIGIN/ORIGIN pero todos son OTROS/RC o vacíos
    // 'absent' = no se encontraron try events con campos de origen
    const getTriesOriginStatus = (events: MatchEvent[]): 'calculated' | 'present_but_generic' | 'absent' => {
      const getPointType = (event: any) => {
        if (!event) return '';
        if (event.POINTS) return String(event.POINTS).toUpperCase();
        const ed = event.extra_data || {};
        const candidates = [ed['TIPO-PUNTOS'], ed['TIPO_PUNTOS'], ed['tipo_puntos'], ed['TIPO-PUNTO'], ed['TIPO'], ed['type_of_points'], ed['type']];
        for (const c of candidates) {
          if (c !== undefined && c !== null) {
            const s = String(c).trim();
            if (s.length > 0) return s.toUpperCase();
          }
        }
        return '';
      };

      const triesEvents = events.filter(event => {
        const pt = getPointType(event);
        return pt && pt.includes('TRY');
      });

      let anyWithKey = false;
      let anyRealOrigin = false;
      const originValuesCount: any = {};
      const extraDataKeys = new Set<string>();

      triesEvents.forEach(tryEvent => {
        if (tryEvent.extra_data && typeof tryEvent.extra_data === 'object') {
          Object.keys(tryEvent.extra_data).forEach(k => extraDataKeys.add(k));
        }
        const raw = tryEvent.TRY_ORIGIN ?? tryEvent.extra_data?.TRY_ORIGIN ?? tryEvent.extra_data?.ORIGIN ?? tryEvent.ORIGIN;
        if (raw !== undefined && raw !== null) {
          anyWithKey = true;
          const s = String(raw).toUpperCase().trim();
          originValuesCount[s] = (originValuesCount[s] || 0) + 1;
          if (s && s !== 'OTROS' && s !== 'RC') anyRealOrigin = true;
        }
      });

      try {
        console.log('getTriesOriginStatus debug: triesEvents=', triesEvents.length, 'extra_data_keys=', Array.from(extraDataKeys).slice(0,10));
        console.log('getTriesOriginStatus debug: originValuesCount=', originValuesCount);
        console.log('getTriesOriginStatus debug: sample tries:', triesEvents.slice(0,3).map(e => ({ id: e.id, TRY_ORIGIN: e.TRY_ORIGIN, extra_data: e.extra_data && Object.keys(e.extra_data).slice(0,5) })));
      } catch (err) {}

      if (anyRealOrigin) return 'calculated';
      if (anyWithKey) return 'present_but_generic';
      return 'absent';
    };

  // Función helper para detectar tries
  const hasTacklesBarChartData = (filteredEvts: MatchEvent[]) => {
    if (!filteredEvts || filteredEvts.length === 0) return false;

    // Determinar la lista de 'nuestros equipos' usando el contexto completo `events` (no el filtrado),
    // para evitar detectar equipos incorrectos cuando `filteredEvents` contiene solo rivales.
    const teamsToUse = (ourTeamsList && ourTeamsList.length > 0) ? ourTeamsList : detectOurTeams(events || []);
    if (!teamsToUse || teamsToUse.length === 0) return false;

    const normalizedOurTeams = teamsToUse
      .map(t => normalizeString(t).toLowerCase())
      .filter(t => t && !/^(unknown|desconocido|rival|opponent|our_team|opp|home|away|nuestro equipo|nuestro|equipo|team|oponente|rivales)$/i.test(t));
    if (normalizedOurTeams.length === 0) return false;

    // Comprobar si en los eventos filtrados hay al menos un TACKLE perteneciente a nuestros equipos
    const tackleCount = filteredEvts.filter((e) => (e.CATEGORY === 'TACKLE' || e.event_type === 'TACKLE')).length;
    const ourTackleCount = filteredEvts.filter((e) => {
      const isTackle = (e.CATEGORY === 'TACKLE' || e.event_type === 'TACKLE');
      if (!isTackle) return false;
      const team = getTeamFromEvent(e);
      if (!team) return false;
      return normalizedOurTeams.includes(normalizeString(team).toLowerCase());
    }).length;

    // DEBUG: imprimir estado resumido (ver consola del navegador, no logs del servidor)
    try {
      // eslint-disable-next-line no-console
      console.log('ChartsTabs.hasTacklesBarChartData:', { filteredEvents: filteredEvts.length, tackleCount, ourTackleCount, teamsToUse, normalizedOurTeams });
    } catch (err) {
      // ignore
    }

    return ourTackleCount > 0;
  };
  
  // DEBUG: imprimir resumen corto para ayudar a identificar por qué se muestra el chart
  // (se dejará ligero para no llenar logs en producción)
  // console.log('ChartsTabs - hasTacklesBarChartData - teamsToUse:', teamsToUse, 'normalized:', normalizedOurTeams);

  const hasMissedTacklesBarChartData = (events: MatchEvent[]) => {
    const missedTackleEvents = events.filter(
      (event) => event.event_type === "MISSED-TACKLE"
    );
    return missedTackleEvents.length > 0;
  };

  const hasTacklesByTeamChartData = (events: MatchEvent[]) => {
    const statsByTeam = computeTackleStatsAggregated(events, ourTeamsList);
    const ourStats = statsByTeam[0] || { successful: 0, missed: 0 };
    const oppStats = statsByTeam[1] || { successful: 0, missed: 0 };
    return (ourStats.successful + ourStats.missed + oppStats.successful + oppStats.missed) > 0;
  };

  const hasTacklesTimeChartData = (events: MatchEvent[]) => {
    const tackleEvents = events.filter(
      (event) => event.event_type === "TACKLE" || event.CATEGORY === "TACKLE" || event.event_type === "MISSED-TACKLE"
    );
    return tackleEvents.length > 0;
  };

  const hasAdvancePieChartData = (events: MatchEvent[]) => {
    const advanceEvents = events.filter(
      (event) => event.CATEGORY === "ADVANCE" || event.event_type === "ADVANCE"
    );
    const eventsWithAdvanceData = advanceEvents.filter(event => {
      const advance = event.extra_data?.AVANCE || event.extra_data?.ADVANCE || event.AVANCE || event.ADVANCE;
      return advance !== null && advance !== undefined && advance !== "";
    });
    return eventsWithAdvanceData.length > 0;
  };

  const hasTackleAdvanceData = (events: MatchEvent[]) => {
    const tackleEvents = events.filter(
      (event) => event.CATEGORY === "TACKLE" || event.event_type === "TACKLE"
    );
    const tacklesWithAdvanceData = tackleEvents.filter(event => {
      const advance = event.extra_data?.AVANCE || event.extra_data?.ADVANCE || event.AVANCE || event.ADVANCE;
      return advance !== null && advance !== undefined && advance !== "";
    });
    return tacklesWithAdvanceData.length > 0;
  };
  



  console.log("🔍 ChartsTabs - Total events:", filteredEvents?.length || 0);
  console.log("🔍 ChartsTabs - Tackle events:", filteredEvents?.filter(e => e.event_type === 'TACKLE').length || 0);

  // Quick booleans for presence of data in new tabs
  // Use filteredEvents when available, otherwise fallback to original events so tabs can be enabled during debug
  const eventsForPresence = (filteredEvents && filteredEvents.length > 0) ? filteredEvents : (events || []);
  const hasPoints = (eventsForPresence || []).some((event) => event.CATEGORY === "POINTS" || event.event_type === "POINTS");

  const extractPointType = (event: any) => {
    // Prefer top-level POINTS, then check common extra_data keys
    if (!event) return '';
    const candidates = [] as any[];
    if (event.POINTS !== undefined && event.POINTS !== null) candidates.push(event.POINTS);
    const ed = event.extra_data || {};
    // possible backend keys
    candidates.push(ed['TIPO-PUNTOS']);
    candidates.push(ed['TIPO_PUNTOS']);
    candidates.push(ed['tipo_puntos']);
    candidates.push(ed['TIPO-PUNTO']);
    candidates.push(ed['type_of_points']);
    candidates.push(ed['type']);
    // Flatten and normalize
    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      const s = String(c).trim();
      if (s.length === 0) continue;
      return s.toUpperCase();
    }
    return '';
  };

  const hasTries = (eventsForPresence || []).some((event) => {
    if (!(event.CATEGORY === 'POINTS' || event.event_type === 'POINTS')) return false;
    const pt = extractPointType(event);
    // accept 'TRY' or strings that include TRY
    return pt === 'TRY' || pt.includes('TRY');
  });
  const triesOriginStatus = getTriesOriginStatus(eventsForPresence || []);
  const hasOriginData = triesOriginStatus === 'calculated';
  const hasPenalties = (eventsForPresence || []).some((event) => matchesCategory(event, 'PENALTY', ['PENAL']));
  const hasFreeKicks = (eventsForPresence || []).some((event) => matchesCategory(event, 'FREE-KICK', ['FREEKICK', 'FREE KICK']));
  const hasTurnovers = (filteredEvents || []).some((event) => event.CATEGORY === "TURNOVER+" || event.CATEGORY === "TURNOVER-" || event.event_type === "TURNOVER+" || event.event_type === "TURNOVER-");
  const hasSetPieces = (filteredEvents || []).some((event) => event.CATEGORY === "SCRUM" || event.CATEGORY === "LINEOUT" || event.event_type === "SCRUM" || event.event_type === "LINEOUT");
  const hasGoalKicks = (filteredEvents || []).some((event) => event.CATEGORY === "GOAL-KICK" || event.event_type === "GOAL-KICK");
  const hasLineBreaks = (filteredEvents || []).some((event) => event.CATEGORY === "BREAK" || event.event_type === "BREAK");
  const hasCards = (eventsForPresence || []).some((event) => matchesCategory(event, 'CARD', ['TARJETA', 'YELLOW-CARD', 'RED-CARD']) || (matchesCategory(event, 'PENALTY', ['PENAL']) && (String(event.AVANCE ?? event.ADVANCE ?? event.extra_data?.AVANCE ?? event.extra_data?.ADVANCE ?? '').trim() !== '')));
  const hasPasses = false; // ocultado por ahora
  const hasErrors = false; // ocultado por ahora
  const hasAdvances = false; // ocultado por ahora
  const hasScatter = false; // ocultado por ahora
  const hasRucks = (eventsForPresence || []).some((event) => matchesCategory(event, 'RUCK', ['RUCKS', 'RACK', 'RUK']));
  const hasMauls = (eventsForPresence || []).some((event) => matchesCategory(event, 'MAUL', ['MAULS', 'MAULL']));
  const hasOpenKicks = (eventsForPresence || []).some((event) => matchesCategory(event, 'KICK', ['PATADA', 'KICK-OPEN', 'OPEN-PLAY-KICK']) && !matchesCategory(event,'GOAL-KICK',['CONVERSION','PENAL','PENALTY','DROP GOAL']));
  const hasPossession = (events || []).some((event) => matchesCategory(event, 'POSSESSION', ['POSESION', 'ATTACK', 'DEFENSE', 'POSSESSION_START']));
  const penaltyEvents = filteredEvents.filter(e => matchesCategory(e, 'PENALTY', ['PENAL']));
  const freeKickEvents = filteredEvents.filter(e => matchesCategory(e, 'FREE-KICK', ['FREEKICK', 'FREE KICK']));
  const hasPenaltyPlayers = penaltyEvents.some(e => getPlayerNameGeneric(e));
  const hasFreeKickPlayers = freeKickEvents.some(e => getPlayerNameGeneric(e));
  const hasRuckPositions = filteredEvents.some(e => matchesCategory(e,'RUCK',['RUCKS','RACK','RUK']) && (e.pos_x !== undefined || e.x !== undefined || e.COORDINATE_X !== undefined || e.extra_data?.pos_x !== undefined || e.extra_data?.x !== undefined));

  // Función para manejar clicks en gráficos y agregar filtros
  const handleChartClick = (...args: any[]) => {
    // Soportar varias firmas que usan los distintos charts:
    // 1) (chartType: string, value: string, descriptor: string)
    // 2) (event, elements, chart) -> firma nativa de Chart.js (react-chartjs-2)
    // 3) (event, elements, chart, chartType, tabId, additionalFilters)
    try {
      // Helper local: normalize descriptor and value for consistent filtering
      const normalizeFilterDescriptor = (rawDescriptor: string, rawValue: any) => {
        let descriptor = rawDescriptor;
        let value = rawValue;

        // Map some alias descriptors
        if (descriptor === 'Quarter_Group') descriptor = 'Time_Group';

        // Normalize Time_Group values (accept spanish 'primer cuarto', 'Cuarto cuarto', or minute ranges)
        if (descriptor === 'Time_Group' || descriptor === 'time_group' || descriptor === 'Time-Group') {
          const normalizeGroupLabel = (s: string) => String(s || '').replace(/\s+/g, ' ').replace(/\s?-\s?/, ' - ').trim();
          const mapAliasToGroup = (raw: string) => {
            if (raw === null || raw === undefined) return '';
            const s = String(raw).toLowerCase().trim();
            if (s.includes('primer') || s.includes('1º') || s === 'q1' || s === '1q' || s.match(/^q\s*1/i)) return "0'- 20'";
            if (s.includes('segundo') || s.includes('2º') || s === 'q2' || s === '2q' || s.match(/^q\s*2/i)) return "20' - 40'";
            if (s.includes('tercer') || s.includes('terc') || s.includes('3º') || s === 'q3' || s === '3q' || s.match(/^q\s*3/i)) return "40' - 60'";
            if (s.includes('cuarto') || s.includes('4º') || s === 'q4' || s === '4q' || s.match(/^q\s*4/i)) return "60' - 80'";
            // If it already looks like a minute-range label, normalize and return
            const normalized = normalizeGroupLabel(raw);
            if (/([0-9]+)'\s?-\s?[0-9]+/.test(normalized) || normalized.includes("'")) return normalized;
            return normalized;
          };
          value = normalizeGroupLabel(mapAliasToGroup(String(rawValue || '')));
        }

        return { descriptor, value };
      };

      // Caso 1: firma simple (chartType, value, descriptor)
      if (args.length === 3 && typeof args[0] === 'string') {
        const [chartType, value, descriptor] = args;
        const newFilter = normalizeFilterDescriptor(descriptor, value);
        const existingIndex = filterDescriptors.findIndex(f => f.descriptor === newFilter.descriptor && f.value === newFilter.value);
        if (existingIndex >= 0) {
          setFilterDescriptors(filterDescriptors.filter((_, i) => i !== existingIndex));
          console.log('🔄 Filtro removido:', newFilter);
        } else {
          setFilterDescriptors([...filterDescriptors, newFilter]);
          console.log('➕ Filtro agregado:', newFilter);
        }
        return;
      }

      // Caso 2a: firma Chart.js (event, elements) - algunos wrappers pasan sólo 2 args
      if (args.length === 2) {
        const [event, elements] = args;
        const chart = undefined;
        if (!elements || elements.length === 0) return;
        const el = elements[0];
        const datasetIndex = el.datasetIndex ?? el.dataset?.datasetIndex ?? el.element?.$context?.datasetIndex ?? el.element?.datasetIndex;
        const dataIndex = el.index ?? el.element?.index ?? el.element?.$context?.dataIndex ?? el.element?.$context?.dataIndex;

        // Normalizar team usando matchInfo cuando sea posible
        let team = dataIndex === 0 ? 'OUR_TEAM' : 'OPPONENT';
        if (matchInfo) {
          const ourName = matchInfo.TEAM || matchInfo.team || matchInfo.home || matchInfo.team_name || null;
          const oppName = matchInfo.OPPONENT || matchInfo.opponent || matchInfo.away || matchInfo.opponent_name || null;
          if (team === 'OUR_TEAM' && ourName) team = ourName;
          if (team === 'OPPONENT' && oppName) team = oppName;
        }
        const tackleType = datasetIndex === 0 ? 'TACKLE' : 'MISSED-TACKLE';

        const hasEventType = filterDescriptors.some(f => f.descriptor === 'event_type' && f.value === tackleType);
        const hasTeam = filterDescriptors.some(f => f.descriptor === 'TEAM' && f.value === team);

        if (hasEventType && hasTeam) {
          const updated = filterDescriptors.filter(f => !( (f.descriptor === 'event_type' && f.value === tackleType) || (f.descriptor === 'TEAM' && f.value === team) ));
          setFilterDescriptors(updated);
          console.log('🔄 Filtros removidos:', [{ descriptor: 'event_type', value: tackleType }, { descriptor: 'TEAM', value: team }]);
        } else {
          const updated = [...filterDescriptors, { descriptor: 'event_type', value: tackleType }, { descriptor: 'TEAM', value: team }];
          setFilterDescriptors(updated);
          console.log('➕ Filtros agregados:', [{ descriptor: 'event_type', value: tackleType }, { descriptor: 'TEAM', value: team }]);
        }
        return;
      }

      // Caso 2b: firma Chart.js (event, elements, chart) - asumir cualquier llamada con 3 args
      if (args.length === 3) {
        const [event, elements, chart] = args;
        if (!elements || elements.length === 0) return;
        const el = elements[0];
        // Elemento puede venir en distintas formas; intentar normalizar
        const datasetIndex = el.datasetIndex ?? el.dataset?.datasetIndex ?? el.element?.$context?.datasetIndex ?? el.element?.datasetIndex;
        const dataIndex = el.index ?? el.element?.index ?? el.element?.$context?.dataIndex ?? el.element?.$context?.dataIndex;

        // Normalizar team usando matchInfo cuando sea posible
        let team = dataIndex === 0 ? 'OUR_TEAM' : 'OPPONENT';
        if (matchInfo) {
          const ourName = matchInfo.TEAM || matchInfo.team || matchInfo.home || matchInfo.team_name || null;
          const oppName = matchInfo.OPPONENT || matchInfo.opponent || matchInfo.away || matchInfo.opponent_name || null;
          if (team === 'OUR_TEAM' && ourName) team = ourName;
          if (team === 'OPPONENT' && oppName) team = oppName;
        }
        const tackleType = datasetIndex === 0 ? 'TACKLE' : 'MISSED-TACKLE';

        // Toggle: si ambos filtros existen, los removemos; si no, los agregamos
        const hasEventType = filterDescriptors.some(f => f.descriptor === 'event_type' && f.value === tackleType);
        const hasTeam = filterDescriptors.some(f => f.descriptor === 'TEAM' && f.value === team);

        if (hasEventType && hasTeam) {
          const updated = filterDescriptors.filter(f => !( (f.descriptor === 'event_type' && f.value === tackleType) || (f.descriptor === 'TEAM' && f.value === team) ));
          setFilterDescriptors(updated);
          console.log('🔄 Filtros removidos:', [{ descriptor: 'event_type', value: tackleType }, { descriptor: 'TEAM', value: team }]);
        } else {
          const updated = [...filterDescriptors, { descriptor: 'event_type', value: tackleType }, { descriptor: 'TEAM', value: team }];
          setFilterDescriptors(updated);
          console.log('➕ Filtros agregados:', [{ descriptor: 'event_type', value: tackleType }, { descriptor: 'TEAM', value: team }]);
        }
        return;
      }

      // Caso 3: firma extendida (event, elements, chart, chartType, tabId, additionalFilters)
      // Algunos charts pasan 4 o 5 argumentos: (event, elements, chart, chartType, tabId)
      if (args.length >= 4 && typeof args[3] === 'string') {
        const [event, elements, chart, chartType, tabId, additionalFilters] = args;

        // Si el chart ya nos pasó filtros adicionales, respetarlos (ej. PointsTypeChart)
        if (additionalFilters && additionalFilters.length > 0) {
          // Support multiple filters provided by the chart (e.g. CATEGORY + TRY_ORIGIN)
          const normalizedFilters = additionalFilters.map((f: any) => {
            const norm = normalizeFilterDescriptor(f.descriptor, f.value);
            return { descriptor: norm.descriptor, value: norm.value };
          });

          // If all provided filters already exist, remove them all; otherwise add the missing ones
          const allExist = normalizedFilters.every((nf: any) => filterDescriptors.some(fd => fd.descriptor === nf.descriptor && fd.value === nf.value));
          if (allExist) {
            const remaining = filterDescriptors.filter(fd => !normalizedFilters.some((nf: any) => nf.descriptor === fd.descriptor && nf.value === fd.value));
            setFilterDescriptors(remaining);
            console.log('🔄 Filtros removidos:', normalizedFilters);
          } else {
            // Add those filters that aren't already present
            const toAdd = normalizedFilters.filter((nf: any) => !filterDescriptors.some(fd => fd.descriptor === nf.descriptor && fd.value === nf.value));
            setFilterDescriptors([...filterDescriptors, ...toAdd]);
            console.log('➕ Filtros agregados:', toAdd);
          }
          return;
        }

        // Si no hay filtros adicionales, intentar inferir el valor desde `elements` + `chart`
        if (elements && elements.length > 0 && chart && chart.data && Array.isArray(chart.data.labels)) {
          try {
            const el = elements[0];
            const dataIndex = el.index ?? el.element?.index ?? el.element?.$context?.dataIndex ?? el.element?.$context?.dataIndex;
            const label = chart.data.labels[dataIndex];

            // Mapear chartType a descriptor conocido
            let descriptor = 'JUGADOR';
            if (chartType === 'time' || chartType === 'time-group') descriptor = 'Time_Group';
            else if (chartType === 'player') descriptor = 'JUGADOR';
            else descriptor = String(chartType).toUpperCase();

            const value = label;
            const normalized = normalizeFilterDescriptor(descriptor, value);
            const existingIndex = filterDescriptors.findIndex(f => f.descriptor === normalized.descriptor && f.value === normalized.value);
            if (existingIndex >= 0) {
              setFilterDescriptors(filterDescriptors.filter((_, i) => i !== existingIndex));
              console.log('🔄 Filtro removido:', normalized);
            } else {
              setFilterDescriptors([...filterDescriptors, normalized]);
              console.log('➕ Filtro agregado:', normalized);
            }
          } catch (err) {
            console.warn('handleChartClick: error extrayendo label desde chart/elements', err);
          }
        } else {
          console.warn('No additional filters provided in chart click and unable to infer value from elements/chart');
        }
        return;
      }

      console.warn('Unexpected handleChartClick arguments:', args);
    } catch (err) {
      console.error('Error procesando handleChartClick:', err);
    }
  };

  // Aplicar filtros cuando cambien
  useEffect(() => {
    console.log("🔄 Aplicando filtros - Current filterDescriptors:", filterDescriptors);
    console.log("🔄 Total events before filtering:", events.length);

    if (!events || events.length === 0) return;

    if (filterDescriptors.length === 0) {
      console.log("🔄 No filters, showing all events");
      // Evitar setState innecesario
      if (!Array.isArray(filteredEvents) || filteredEvents.length !== events.length || filteredEvents[0]?.id !== events[0]?.id || filteredEvents[filteredEvents.length - 1]?.id !== events[events.length - 1]?.id) {
        setFilteredEvents(events);
      }
      return;
    }

    // Aplicar todos los filtros
    const filtered = events.filter((event) => {
      return filterDescriptors.every((filter) => {
        const { descriptor, value } = filter;
        
        // Filtrado especial para grupos de tiempo
        if (descriptor === "Quarter_Group" || descriptor === 'Time_Group' || descriptor === 'Time-Group' || descriptor === 'time_group') {
          // Normalizar valor esperado (p. ej. "0'- 20'" vs "0'-20'") y mapear alias (Primer cuarto, Q1, etc.)
          const normalizeGroupLabel = (s: string) => String(s || '').replace(/\s+/g, ' ').replace(/\s?-\s?/, ' - ').trim();

          const mapAliasToGroup = (raw: string) => {
            if (raw === null || raw === undefined) return '';
            const s = String(raw).toLowerCase().trim();
            // Spanish quarters
            if (s.includes('primer') || s.includes('1º') || s === 'q1' || s === '1q' || s.match(/^q\s*1/i)) return "0'- 20'";
            if (s.includes('segundo') || s.includes('2º') || s === 'q2' || s === '2q' || s.match(/^q\s*2/i)) return "20' - 40'";
            if (s.includes('tercer') || s.includes('terc') || s.includes('3º') || s === 'q3' || s === '3q' || s.match(/^q\s*3/i)) return "40' - 60'";
            if (s.includes('cuarto') || s.includes('4º') || s === 'q4' || s === '4q' || s.match(/^q\s*4/i)) return "60' - 80'";
            // English style
            if (s.includes('first') || s.includes('1st') || s.includes('q1')) return "0'- 20'";
            if (s.includes('second') || s.includes('2nd') || s.includes('q2')) return "20' - 40'";
            if (s.includes('third') || s.includes('3rd') || s.includes('q3')) return "40' - 60'";
            if (s.includes('fourth') || s.includes('4th') || s.includes('q4')) return "60' - 80'";
            // If it already looks like a minute-range label, normalize and return
            const normalized = normalizeGroupLabel(raw);
            if (/(\d+)'\s?-\s?\d+/.test(normalized) || normalized.includes("'") ) return normalized;
            return normalized;
          };

          const expectedValue = normalizeGroupLabel(mapAliasToGroup(value));

          // IMPORTANTE: Usar Game_Time de extra_data (valor recalculado correcto) en lugar de timestamp_sec (video time)
          // Game_Time es el tiempo de juego (00:00 a 80:00), timestamp_sec es el segundo del video
          let timeInSeconds = 0;
          
          // Primero intentar obtener Game_Time de extra_data (formato "MM:SS")
          const gameTimeStr = event.extra_data?.Game_Time;
          if (gameTimeStr && typeof gameTimeStr === 'string') {
            const [mins, secs] = gameTimeStr.split(':').map(Number);
            if (!isNaN(mins) && !isNaN(secs)) {
              timeInSeconds = mins * 60 + secs;
            }
          }
          
          // Fallback: si no hay Game_Time calculado, usar otros campos
          if (timeInSeconds === 0) {
            timeInSeconds = Number(event.Game_Time ?? event.time ?? event.seconds ?? event.timestamp_sec ?? 0) || 0;
          }
          
          let eventQuarterGroup: string;
          if (timeInSeconds < 1200) eventQuarterGroup = "0'- 20'";      // 0-20 minutos
          else if (timeInSeconds < 2400) eventQuarterGroup = "20' - 40'";    // 20-40 minutos
          else if (timeInSeconds < 3600) eventQuarterGroup = "40' - 60'";    // 40-60 minutos
          else eventQuarterGroup = "60' - 80'";                        // 60+ minutos

          const calculated = normalizeGroupLabel(eventQuarterGroup);
          console.log("🔍 Checking event", event.id, "for Time_Group =", value, "-> gameTimeStr:", gameTimeStr, "-> timeInSeconds:", timeInSeconds, "-> calculated:", eventQuarterGroup, "(norm->", calculated, ") expected->", expectedValue);
          return calculated === expectedValue;
        }
        
        // Filtrado especial para CATEGORY (soporta event_type como alias)
        if (descriptor === 'CATEGORY') {
          const evCat = event.CATEGORY ?? event.event_type ?? event.category ?? event.eventType ?? event.extra_data?.CATEGORY ?? '';
          const matches = String(evCat || '').toUpperCase() === String(value || '').toUpperCase();
          console.log("🔍 CATEGORY check:", evCat, "expected->", value, "->", matches);
          return matches;
        }

        // Filtrado para TEAM_SIDE (our/opponent)
        if (descriptor === 'TEAM_SIDE') {
          const isOpp = isOpponent(event);
          return (String(value).toUpperCase().includes('OPP')) ? isOpp : !isOpp;
        }

        // Filtrado para RUCK_SPEED_TAG
        if (descriptor === 'RUCK_SPEED_TAG') {
          const speedVal = Number(
            event.RUCK_SPEED ?? event.ruck_speed ?? event.extra_data?.RUCK_SPEED ?? event.extra_data?.ruck_speed ?? event.extra_data?.['VELOCIDAD-RUCK'] ?? event.extra_data?.['VELOCIDAD_RUCK'] ?? event.extra_data?.duration ?? event.extra_data?.DURATION ?? 0
          );
          const isFast = Number.isFinite(speedVal) && speedVal < 3;
          return value === 'FAST' ? isFast : !isFast;
        }
        
        // Filtrado especial para equipos (soporta categorías agregadas)
        if (descriptor === 'TEAM' || descriptor === 'EQUIPO') {
          const eventTeam = getTeamFromEvent(event);
          
          // Normalizar el valor del filtro para aceptar diferentes variaciones
          const normalizedValue = value.toUpperCase().trim();
          
          if (normalizedValue === 'OUR_TEAM' || normalizedValue === 'OUR_TEAMS' || normalizedValue === 'NUESTRO EQUIPO' || normalizedValue === 'NUESTROS EQUIPOS') {
            // Filtrar eventos de nuestros equipos
            const matches = isOurTeam(eventTeam || '', ourTeamsList);
            console.log("🔍 TEAM=OUR_TEAM/OUR_TEAMS check:", eventTeam, "in", ourTeamsList, "->", matches);
            return matches;
          } else if (normalizedValue === 'OPPONENTS' || normalizedValue === 'RIVAL' || normalizedValue === 'RIVALES' || normalizedValue === 'OPPONENT') {
            // Filtrar eventos de rivales
            const matches = !isOurTeam(eventTeam || '', ourTeamsList);
            console.log("🔍 TEAM=OPPONENTS/RIVAL/RIVALES check:", eventTeam, "not in", ourTeamsList, "->", matches);
            return matches;
          } else {
            // Filtrado por nombre específico de equipo
            const normalizedEventTeam = normalizeString(eventTeam);
            const normalizedSearchValue = normalizeString(value);
            const matches = normalizedEventTeam === normalizedSearchValue;
            console.log("🔍 TEAM specific check:", normalizedEventTeam, "===", normalizedSearchValue, "->", matches);
            return matches;
          }
        }
        
        // Filtrado especial para avances (manejar tanto ADVANCE como AVANCE y advance_type)
        if (descriptor === 'ADVANCE' || descriptor === 'AVANCE') {
          // Soportar múltiples ubicaciones y variantes donde puede aparecer el dato de avance
          const eventAdvance =
            event.extra_data?.descriptors?.AVANCE ||
            event.extra_data?.AVANCE ||
            event.extra_data?.advance ||
            event.extra_data?.advance_type ||
            event.advance ||
            event.ADVANCE ||
            event.AVANCE ||
            null;

          let matches = false;
          if (Array.isArray(eventAdvance)) {
            matches = eventAdvance.includes(value);
          } else {
            matches = eventAdvance === value;
          }

          console.log("🔍 ADVANCE/AVANCE check:", descriptor, "=", eventAdvance, "===", value, "->", matches);
          return matches;
        }

        // Filtrado para FIELD_ZONE (etiqueta textual de RucksFieldZonesChart)
        if (descriptor === 'FIELD_ZONE') {
          const yCandidates = [event.COORDINATE_Y, event.pos_y, event.y, event.extra_data?.COORDINATE_Y, event.extra_data?.pos_y, event.extra_data?.y];
          let longitudinal: number | null = null;
          for (const c of yCandidates) {
            const n = Number(c);
            if (!Number.isNaN(n)) { longitudinal = -n; break; }
          }
          if (longitudinal === null) {
            const xCandidates = [event.COORDINATE_X, event.pos_x, event.x, event.extra_data?.COORDINATE_X, event.extra_data?.pos_x, event.extra_data?.x];
            for (const c of xCandidates) {
              const n = Number(c);
              if (!Number.isNaN(n)) { longitudinal = n; break; }
            }
          }
          if (longitudinal === null || Number.isNaN(longitudinal)) return false;
          const zoneLabel = String(value);
          if (zoneLabel === 'In-goal propio a 22') return longitudinal >= -100 && longitudinal < -78;
          if (zoneLabel === '22 propia a mitad') return longitudinal >= -78 && longitudinal < -50;
          if (zoneLabel === 'Mitad a 22 rival') return longitudinal >= -50 && longitudinal < -22;
          if (zoneLabel === '22 rival a in-goal') return longitudinal >= -22 && longitudinal <= 100;
          return false;
        }

        // Filtrado para KICK_TYPE
        if (descriptor === 'KICK_TYPE') {
          const kickType = () => {
            const val = (event as any).KICK_TYPE ?? (event as any).KICK ?? event?.extra_data?.KICK_TYPE ?? event?.extra_data?.['TIPO-PATADA'] ?? event?.extra_data?.PIE;
            return String(val || '').trim();
          };
          return kickType().toUpperCase() === String(value || '').toUpperCase();
        }

        // Filtrado para CARD_TYPE (derivado)
        if (descriptor === 'CARD_TYPE') {
          const deriveCardType = () => {
            const n = (raw: any) => String(raw || '').toUpperCase();
            if (n(event['YELLOW-CARD']) === 'TRUE' || n(event?.extra_data?.['YELLOW-CARD']) === 'TRUE') return 'YELLOW';
            if (n(event['RED-CARD']) === 'TRUE' || n(event?.extra_data?.['RED-CARD']) === 'TRUE') return 'RED';
            const raw = event.CARD_TYPE ?? event.CARD ?? event.TARJETA ?? event.card_type ?? event.extra_data?.CARD_TYPE ?? event.extra_data?.CARD ?? event.extra_data?.TARJETA ?? event.extra_data?.card_type;
            const rawStr = n(raw);
            if (rawStr.includes('RED') || rawStr.includes('ROJA')) return 'RED';
            if (rawStr.includes('YELLOW') || rawStr.includes('AMAR')) return 'YELLOW';
            // derivar de penales via AVANCE
            const adv = n(event.AVANCE ?? event.ADVANCE ?? event.extra_data?.AVANCE ?? event.extra_data?.ADVANCE);
            if (adv.includes('NEG')) return 'RED';
            if (adv.includes('NEUT')) return 'YELLOW';
            return '';
          };
          return deriveCardType() === String(value || '').toUpperCase();
        }

        // Filtrado especial para origen de tries (TRY_ORIGIN)
        if (descriptor === 'TRY_ORIGIN' || descriptor === 'ORIGEN_TRY' || descriptor === 'ORIGEN') {
          const rawOrigin = event.TRY_ORIGIN ?? event.extra_data?.TRY_ORIGIN ?? event.extra_data?.ORIGIN ?? event.ORIGIN;
          const v = rawOrigin === undefined || rawOrigin === null ? '' : String(rawOrigin).toUpperCase().trim();
          const target = String(value).toUpperCase().trim();
          const matches = v === target || (v === '' && target === '(<NONE>)');
          console.log("🔍 TRY_ORIGIN check:", rawOrigin, "->", v, "expected->", target, "->", matches);
          return matches;
        }

        // Filtrado especial para fases de try (TRY_PHASES) - comparar por número (aproximado)
        if (descriptor === 'TRY_PHASES' || descriptor === 'FASES_TRY') {
          const rawPh = event.extra_data?.TRY_PHASES ?? event.TRY_PHASES ?? null;
          const n = rawPh !== null && rawPh !== undefined ? Number(rawPh) : NaN;
          if (!isFinite(n)) {
            console.log("🔍 TRY_PHASES check: event has no numeric TRY_PHASES -> false");
            return false;
          }
          const targetNum = Number(value);
          // Aceptar igualdad o cercanía (por si el chart emite un promedio redondeado)
          const matches = Number.isFinite(targetNum) ? Math.round(n) === Math.round(targetNum) : String(Math.round(n)) === String(value);
          console.log("🔍 TRY_PHASES check:", n, "target->", value, "->", matches);
          return matches;
        }

        // Filtrado especial para tipo de turnover (TURNOVER_TYPE)
        if (descriptor === 'TURNOVER_TYPE' || descriptor === 'TIPO_TURNOVER') {
          const eventTurnoverType = 
            event.extra_data?.TURNOVER_TYPE ||
            event.TURNOVER_TYPE ||
            event.extra_data?.['TIPO-PERDIDA/RECUPERACIÓN'] ||
            event['TIPO-PERDIDA/RECUPERACIÓN'] ||
            null;
          
          const matches = eventTurnoverType === value;
          console.log("🔍 TURNOVER_TYPE check:", eventTurnoverType, "===", value, "->", matches);
          return matches;
        }

        // Filtrado especial para resultado de patadas (RESULTADO_PALOS)
        if (descriptor === 'RESULTADO_PALOS' || descriptor === 'RESULTADO-PALOS') {
          const eventResult = 
            event.extra_data?.RESULTADO_PALOS ||
            event.RESULTADO_PALOS ||
            event.extra_data?.['RESULTADO-PALOS'] ||
            event['RESULTADO-PALOS'] ||
            null;
          
          const matches = String(eventResult).toUpperCase() === String(value).toUpperCase();
          console.log("🔍 RESULTADO_PALOS check:", eventResult, "===", value, "->", matches);
          return matches;
        }
        
        // Filtrado especial para JUGADOR - buscar en event.players (array desde PostgreSQL)
        let eventValue: any = undefined;
        
        if (descriptor === 'JUGADOR' || descriptor === 'PLAYER') {
          // Prioridad 1: event.players (base_de_datos branch - PostgreSQL)
          if (event.players && Array.isArray(event.players)) {
            eventValue = event.players; // Ya es array
          }
          // Prioridad 2: event.PLAYER (main branch - JSON files)
          else if (event.PLAYER) {
            eventValue = Array.isArray(event.PLAYER) ? event.PLAYER : [event.PLAYER];
          }
          // Prioridad 3: event.extra_data.JUGADOR (legacy)
          else if (event.extra_data?.JUGADOR) {
            const jugador = event.extra_data.JUGADOR;
            eventValue = Array.isArray(jugador) ? jugador : [jugador];
          }
          // Si no hay valor, dejar undefined para que falle el match
          else {
            eventValue = undefined;
          }
        } else {
          // Filtrado general por otros campos
          // Buscar en event[field] o event.extra_data[field] con varias normalizaciones
          const lookupKeys = [
            descriptor,
            descriptor.toString().toUpperCase(),
            descriptor.toString().toLowerCase(),
            descriptor.toString().replace(/[- ]/g, '_'),
            descriptor.toString().replace(/[- ]/g, ''),
          ];

          for (const key of lookupKeys) {
            if (event.hasOwnProperty(key) && event[key] !== undefined) { eventValue = event[key]; break; }
            if (event.extra_data && Object.prototype.hasOwnProperty.call(event.extra_data, key) && event.extra_data[key] !== undefined) { eventValue = event.extra_data[key]; break; }
          }
        }

        // Si eventValue es un array, comprobar si incluye el valor
        let matches = false;
        if (Array.isArray(eventValue)) matches = eventValue.includes(value);
        else matches = String(eventValue) === String(value);

        console.log("🔍 General filter check:", descriptor, "=", eventValue, "===" , value, "->", matches);
        return matches;
      });
    });

    console.log("🔄 Filtered result:", filtered.length, "events from", events.length);
    console.log("🔄 Active filters:", filterDescriptors.map(f => `${f.descriptor}=${f.value}`));
    // Evitar setState innecesario comparando primer/último evento y longitud
    if (!Array.isArray(filteredEvents) || filteredEvents.length !== filtered.length || filteredEvents[0]?.id !== filtered[0]?.id || filteredEvents[filteredEvents.length - 1]?.id !== filtered[filtered.length - 1]?.id) {
      setFilteredEvents(filtered);
    }
  }, [events, filterDescriptors, setFilteredEvents, ourTeamsList]);

  // Durante debug, permitir abrir las pestañas aunque `filteredEvents` esté vacío
  // Usar `events` como fallback para permitir inspección; revertir esta lógica en QA final
  const effectiveEvents = (filteredEvents && filteredEvents.length > 0) ? filteredEvents : (events || []);

  if (!effectiveEvents || effectiveEvents.length === 0) {
    return (
      <div className="w-full mt-4 p-4 border rounded">
        <p className="text-gray-500">Cargando eventos...</p>
        <p className="text-sm text-gray-400">Eventos encontrados: {effectiveEvents?.length || 0}</p>
      </div>
    );
  }

  // Debug info moved out of JSX
  try {
    // eslint-disable-next-line no-console
    console.log('ChartsTabs - Points tab - hasPoints=', hasPoints, 'points events=', filteredEvents.filter(e => e.CATEGORY === 'POINTS' || e.event_type === 'POINTS').length);
  } catch (err) {}

  return (
    <Tabs defaultValue="overview" className="w-full mt-4">
      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <TabsList style={{ display: 'inline-flex', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="overview">Resumen</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="possession">Posesión</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="tackles">Tackles</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="points" disabled={!hasPoints}>Points</TabsTrigger>
          {/* Temporarily always-enable Tries tab for debug/inspection; revert after QA */}
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="tries">Tries</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="penalties" disabled={!hasPenalties}>Penales</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="freekicks" disabled={!hasFreeKicks}>Free-kicks</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="cards" disabled={!hasCards}>Tarjetas</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="turnovers" disabled={!hasTurnovers}>Turnovers</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="setpieces" disabled={!hasSetPieces}>Set Pieces</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="rucks" disabled={!hasRucks}>Rucks</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="mauls" disabled={!hasMauls}>Mauls</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="goalkicks" disabled={!hasGoalKicks}>Palos</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="openkicks" disabled={!hasOpenKicks}>Kicks Juego</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 110 }} value="linebreaks" disabled={!hasLineBreaks}>Quiebres</TabsTrigger>
          {/* Pestañas desactivadas temporalmente: pases, errores, avances, mapa */}
          {/* Agrega más pestañas según los charts */}
        </TabsList>
      </div>
      
      {/* Indicador de filtros activos */}
      {filterDescriptors.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-800">Filtros activos:</span>
              <div className="flex gap-2">
                {filterDescriptors.map((filter, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {filter.descriptor}: {filter.value}
                    <button
                      onClick={() => {
                        const updatedFilters = filterDescriptors.filter((_, i) => i !== index);
                        setFilterDescriptors(updatedFilters);
                      }}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setFilterDescriptors([])}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Limpiar todos
            </button>
          </div>
        </div>
      )}
      

      <TabsContent value="overview">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Resumen del partido</h3>
          <p>Eventos totales: {effectiveEvents.length}</p>
          <p>Debug: {JSON.stringify(effectiveEvents.slice(0, 2), null, 2)}</p>
        </div>
      </TabsContent>

      <TabsContent value="possession">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Posesión</h3>
          {hasPossession ? (
            <div className="space-y-4">
              <PossessionShareChart events={events} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              {hasRuckPositions && (
                <RucksFieldZonesChart events={effectiveEvents} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de posesión disponibles</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="tackles">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Estadísticas de Tackles</h3>
          
          {/* Grid de gráficos - todos los gráficos de tackles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tackles por jugador (Nuestro equipo - barras apiladas por avance) - solo mostrar si hay datos */}
            {hasTacklesBarChartData(filteredEvents) && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Tackles por Jugador</h4>
                <TacklesBarChart 
                  events={filteredEvents} 
                  onBarClick={(category, player) => {
                    console.log("Clicked on player:", player);
                    handleChartClick("player", player, "JUGADOR");
                  }}
                />
              </div>
            )}

            {/* Distribución de Avances en Tackles - solo mostrar si hay datos */}
            {hasTackleAdvanceData(filteredEvents) && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Distribución de Avances en Tackles</h4>
                <AdvancePieChart 
                  events={filteredEvents} 
                  category="TACKLE" 
                  onChartClick={(event, elements, chart, chartType, tabId, additionalFilters) => {
                    console.log("Advance pie clicked:", chartType, additionalFilters);
                    console.log("Additional filters details:", additionalFilters?.[0]);
                    if (additionalFilters && additionalFilters.length > 0) {
                      const advanceFilter = additionalFilters.find(f => f.descriptor === "ADVANCE");
                      if (advanceFilter) {
                        console.log("Found advance filter:", advanceFilter);
                        handleChartClick("advance", advanceFilter.value, "AVANCE"); // Usar AVANCE en español
                      }
                    }
                  }}
                />
              </div>
            )}

            {/* Tackles por tiempo de juego - solo mostrar si hay datos */}
            {hasTacklesTimeChartData(filteredEvents) && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Tackles por Tiempo de Juego</h4>
                <div className="h-80">
                  <TacklesTimeChart 
                    events={filteredEvents} 
                    onChartClick={(chartType, value, descriptor) => {
                      handleChartClick(chartType, value, descriptor);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tackles errados - solo mostrar si hay datos */}
            {hasMissedTacklesBarChartData(filteredEvents) && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Tackles Errados</h4>
                <div className="h-80">
                  <MissedTacklesBarChart 
                    events={filteredEvents} 
                    onChartClick={(chartType, value, descriptor) => {
                      handleChartClick(chartType, value, descriptor);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Comparación por equipos - solo mostrar si hay datos */}
            {hasTacklesByTeamChartData(filteredEvents) && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Tackles por Equipo - Efectividad</h4>
                <div className="h-80">
                  <TacklesByTeamChart 
                    events={filteredEvents} 
                    onChartClick={(chartType, value, descriptor) => {
                      handleChartClick(chartType, value, descriptor);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mensaje cuando no hay gráficos disponibles */}
          {!hasTacklesBarChartData(filteredEvents) && 
           !hasTackleAdvanceData(filteredEvents) && 
           !hasTacklesTimeChartData(filteredEvents) && 
           !hasMissedTacklesBarChartData(filteredEvents) && 
           !hasTacklesByTeamChartData(filteredEvents) && (
            <div className="text-center py-8 text-gray-500">
              No hay datos de tackles disponibles para mostrar
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="points">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Points</h3>
          {hasPoints ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/** Debug info: print counts to console to help identify missing data */}
            {/* moved console.log out of JSX to avoid TSX expression type issues */}
              <div className="border rounded-lg p-4 h-80">
                <h4 className="font-medium mb-2">Puntos por Jugador</h4>
                <PlayerPointsChart events={effectiveEvents.filter(e => e.CATEGORY === 'POINTS' || e.event_type === 'POINTS')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              </div>
              <div className="border rounded-lg p-4 h-80">
                <h4 className="font-medium mb-2">Puntos por Tiempo</h4>
                <PointsTimeChart events={effectiveEvents.filter(e => e.CATEGORY === 'POINTS' || e.event_type === 'POINTS')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              </div>
              <div className="border rounded-lg p-4 h-80">
                <h4 className="font-medium mb-2">Tipo de Puntos</h4>
                <PointsTypeChart events={effectiveEvents.filter(e => e.CATEGORY === 'POINTS' || e.event_type === 'POINTS')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Points para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="tries">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tries</h3>
          {hasTries ? (
            <div className="space-y-6">
              {/* Gráficos básicos de tries (siempre mostrar) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TriesPlayerChart events={effectiveEvents.filter(e => (e.CATEGORY === 'POINTS' || e.event_type === 'POINTS'))} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
                <TriesTimeChart events={effectiveEvents.filter(e => (e.CATEGORY === 'POINTS' || e.event_type === 'POINTS'))} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
                <TriesPhasesChart events={effectiveEvents.filter(e => (e.CATEGORY === 'POINTS' || e.event_type === 'POINTS'))} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              </div>

              {/* Diagnóstico eliminado en esta versión de UI */}
              
              {/* Gráfico de origen (solo si hay datos de origen calculados) */}
              {triesOriginStatus === 'calculated' ? (
                <div className="grid grid-cols-1 gap-6">
                  <TriesOriginChart events={effectiveEvents.filter(e => (e.CATEGORY === 'POINTS' || e.event_type === 'POINTS'))} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
                </div>
              ) : triesOriginStatus === 'present_but_generic' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    <strong>Datos de origen presentes pero genéricos:</strong> Se detectaron campos de origen en los eventos, pero todos están en estado genérico ("OTROS" o "RC").
                    El gráfico de origen no muestra información diferenciada hasta que el enricher calcule orígenes específicos.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    <strong>Gráfico de origen no disponible:</strong> Los datos de origen de tries no han sido calculados. 
                    Esto se debe a que el análisis de secuencias de juego aún no está implementado en el proceso de importación.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Tries para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="penalties">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Penales</h3>
          {hasPenalties ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hasPenaltyPlayers && (
                <PenaltiesPlayerBarChart
                  events={penaltyEvents}
                  category="PENALTY"
                  title="Penales por Jugador"
                  tabId="penalties-tab"
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                />
              )}
              <PenaltiesTimeChart
                events={penaltyEvents}
                category="PENALTY"
                title="Penales por Bloque de Tiempo"
                tabId="penalties-tab"
                onChartClick={(...args:any)=>{handleChartClick(...args);}}
              />
              <InfringementsCauseChart events={penaltyEvents} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Penales para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="freekicks">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Free-kicks</h3>
          {hasFreeKicks ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hasFreeKickPlayers && (
                <PenaltiesPlayerBarChart
                  events={freeKickEvents}
                  category="FREE-KICK"
                  title="Free-kicks por Jugador"
                  tabId="freekicks-tab"
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                />
              )}
              <PenaltiesTimeChart
                events={freeKickEvents}
                category="FREE-KICK"
                title="Free-kicks por Bloque de Tiempo"
                tabId="freekicks-tab"
                onChartClick={(...args:any)=>{handleChartClick(...args);}}
              />
              <InfringementsCauseChart events={freeKickEvents} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Free-kicks para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="cards">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tarjetas</h3>
          {hasCards ? (
            <CardsSummaryChart events={effectiveEvents} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Tarjetas para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="turnovers">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Turnovers</h3>
          {hasTurnovers ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TurnoversRecoversBarChart events={filteredEvents.filter(e => e.CATEGORY === 'TURNOVER+' || e.CATEGORY === 'TURNOVER-' || e.event_type === 'TURNOVER+' || e.event_type === 'TURNOVER-')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              <TurnoversLostBarChart events={filteredEvents.filter(e => e.CATEGORY === 'TURNOVER+' || e.CATEGORY === 'TURNOVER-' || e.event_type === 'TURNOVER+' || e.event_type === 'TURNOVER-')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              <TurnoversTypeChart events={filteredEvents.filter(e => e.CATEGORY === 'TURNOVER+' || e.CATEGORY === 'TURNOVER-' || e.event_type === 'TURNOVER+' || e.event_type === 'TURNOVER-')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              <TurnoversTimeChart events={filteredEvents.filter(e => e.CATEGORY === 'TURNOVER+' || e.CATEGORY === 'TURNOVER-' || e.event_type === 'TURNOVER+' || e.event_type === 'TURNOVER-')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Turnovers para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="setpieces">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Set Pieces</h3>
          {hasSetPieces ? (
            <div className="space-y-8">
              {filteredEvents.some(e => e.CATEGORY === 'SCRUM' || e.event_type === 'SCRUM') && (
                <div>
                  <h4 className="text-md font-medium mb-4">Scrums</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ScrumTeamChart events={filteredEvents.filter(e => e.CATEGORY === 'SCRUM' || e.event_type === 'SCRUM')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
                    <ScrumRivalChart events={filteredEvents.filter(e => e.CATEGORY === 'SCRUM' || e.event_type === 'SCRUM')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
                  </div>
                </div>
              )}
              {filteredEvents.some(e => e.CATEGORY === 'LINEOUT' || e.event_type === 'LINEOUT') && (
                <div>
                  <h4 className="text-md font-medium mb-4">Lineouts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <LineoutTeamChart events={filteredEvents.filter(e => e.CATEGORY === 'LINEOUT' || e.event_type === 'LINEOUT')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
                    <LineoutRivalChart events={filteredEvents.filter(e => e.CATEGORY === 'LINEOUT' || e.event_type === 'LINEOUT')} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Set Pieces para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="rucks">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Rucks</h3>
          {hasRucks ? (
            <RucksSpeedPieChart events={effectiveEvents} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Rucks para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="mauls">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Mauls</h3>
          {hasMauls ? (
            <MaulsOutcomeChart events={effectiveEvents} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Mauls para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="goalkicks">
        <div className="space-y-4">
          {hasGoalKicks ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Patadas a los Palos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GoalKicksEffectivityTeamChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'GOAL-KICK' || e.event_type === 'GOAL-KICK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                  matchInfo={matchInfo}
                />
                <GoalKicksEffectivityOpponentChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'GOAL-KICK' || e.event_type === 'GOAL-KICK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                  matchInfo={matchInfo}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GoalKicksPlayerChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'GOAL-KICK' || e.event_type === 'GOAL-KICK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                  matchInfo={matchInfo}
                />
                <GoalKicksTimeChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'GOAL-KICK' || e.event_type === 'GOAL-KICK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Patadas a los Palos para mostrar</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="openkicks">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Patadas en juego abierto</h3>
          {hasOpenKicks ? (
            <div className="space-y-4">
              <OpenPlayKicksTeamPieChart events={effectiveEvents} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              <OpenPlayKicksPlayerChart events={effectiveEvents} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
              <OpenPlayKicksChart events={effectiveEvents} onChartClick={(...args:any)=>{handleChartClick(...args);}} />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de patadas en juego abierto</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="linebreaks">
        <div className="space-y-4">
          {hasLineBreaks ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quiebres de Línea</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LineBreaksPlayerChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'BREAK' || e.event_type === 'BREAK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                  matchInfo={matchInfo}
                />
                <LineBreaksTimeChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'BREAK' || e.event_type === 'BREAK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LineBreaksTypeTeamChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'BREAK' || e.event_type === 'BREAK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                  matchInfo={matchInfo}
                />
                <LineBreaksTypeOpponentChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'BREAK' || e.event_type === 'BREAK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                  matchInfo={matchInfo}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LineBreaksChannelTeamChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'BREAK' || e.event_type === 'BREAK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                  matchInfo={matchInfo}
                />
                <LineBreaksChannelOpponentChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'BREAK' || e.event_type === 'BREAK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                  matchInfo={matchInfo}
                />
              </div>
              <div className="grid grid-cols-1">
                <LineBreaksResultChart 
                  events={filteredEvents.filter(e => e.CATEGORY === 'BREAK' || e.event_type === 'BREAK')} 
                  onChartClick={(...args:any)=>{handleChartClick(...args);}}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No hay datos de Quiebres para mostrar</div>
          )}
        </div>
      </TabsContent>

      {/* Scatter tab desactivada */}
    </Tabs>
  );
};

export default ChartsTabs;
