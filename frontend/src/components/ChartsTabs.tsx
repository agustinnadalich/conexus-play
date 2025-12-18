import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { useEffect } from "react";
import {
  PossessionTabContent,
  TacklesTabContent,
  PointsTabContent,
  TriesTabContent,
  PenaltiesTabContent,
  FreeKicksTabContent,
  CardsTabContent,
  TurnoversTabContent,
  SetPiecesTabContent,
  ScrumsDetailTabContent,
  LineoutsDetailTabContent,
  RucksTabContent,
  MaulsTabContent,
  GoalKicksTabContent,
  OpenKicksTabContent,
  LineBreaksTabContent,
} from "./charts/tab-contents";
import { useFilterContext } from "../context/FilterContext";
import { getTeamFromEvent, normalizeString, isOurTeam, computeTackleStatsAggregated, detectOurTeams } from "../utils/teamUtils";
import { matchesCategory, isOpponentEvent as isOpponent } from "../utils/eventUtils";
import { MatchEvent } from "@/types";

const isCat = (ev: any, aliases: string[]) => {
  const cat = (ev.CATEGORY || ev.event_type || ev.code || "").toString().toUpperCase();
  return aliases.some(a => cat === a.toUpperCase());
};

const isPoints = (ev: any) => isCat(ev, ['POINTS', 'PUNTOS', 'TRY']);
const isTries = (ev: any) => {
  const cat = (ev.CATEGORY || ev.event_type || ev.code || "").toString().toUpperCase();
  if (cat === 'TRY') return true;
  if (!isCat(ev, ['POINTS', 'PUNTOS'])) return false;
  const pt = String(ev.POINTS || ev.PUNTOS || ev.extra_data?.['TIPO-PUNTOS'] || ev.extra_data?.PUNTOS || ev.extra_data?.MISC || "").toUpperCase();
  return pt.includes('TRY');
};
const isPenalties = (ev: any) => isCat(ev, ['PENALTY', 'PENAL']);
const isFreeKicks = (ev: any) => isCat(ev, ['FREE-KICK', 'FREEKICK', 'FREE KICK', 'FREE-KICK RIVAL', 'FREE KICK RIVAL', 'FREEKICK RIVAL']);
const isGoalKick = (ev: any) => isCat(ev, ['GOAL-KICK', 'PALOS', 'PALOS RIVAL']);
const isLineBreak = (ev: any) => isCat(ev, ['BREAK', 'QUIEBRE']);
const isLineout = (ev: any) => isCat(ev, ['LINEOUT', 'LINE', 'LINEOUT RIVAL']);
const isScrum = (ev: any) => isCat(ev, ['SCRUM', 'SCRUM RIVAL']);
const isKickOpen = (ev: any) => isCat(ev, ['KICK', 'PIE']);
const isRuck = (ev: any) => isCat(ev, ['RUCK', 'RUCK RIVAL']);

const getPlayerNameGeneric = (event: any): string | null => {
  if (event?.players && Array.isArray(event.players) && event.players.length > 0) return event.players[0];
  if (event?.PLAYER) return Array.isArray(event.PLAYER) ? event.PLAYER[0] : event.PLAYER;
  const ed = event?.extra_data || {};
  const candidate = event?.player_name || event?.JUGADOR || ed.JUGADOR || ed.PLAYER;
  if (!candidate) return null;
  const s = String(candidate).trim();
  return s.length ? s : null;
};

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

  const filteredEventsList = Array.isArray(filteredEvents) ? filteredEvents : [];

    // Devuelve el estado de origen de tries:
    // 'calculated' = al menos un try tiene un origen real distinto de OTROS/RC
    // 'present_but_generic' = hay clave TRY_ORIGIN/ORIGIN pero todos son OTROS/RC o vacíos
    // 'absent' = no se encontraron try events con campos de origen
    const getTriesOriginStatus = (events: MatchEvent[]): 'calculated' | 'present_but_generic' | 'absent' => {
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
    const noTeamsDetected = !teamsToUse || teamsToUse.length === 0;

    const normalizedOurTeams = noTeamsDetected ? [] : teamsToUse
      .map(t => normalizeString(t).toLowerCase())
      .filter(t => t && !/^(unknown|desconocido|rival|opponent|our_team|opp|home|away|nuestro equipo|nuestro|equipo|team|oponente|rivales)$/i.test(t));

    // Comprobar si en los eventos filtrados hay al menos un TACKLE (si no hay equipos detectados, no filtrar por team)
    const tackleCount = filteredEvts.filter((e) => (e.CATEGORY === 'TACKLE' || e.event_type === 'TACKLE')).length;
    let ourTackleCount = noTeamsDetected
      ? tackleCount
      : filteredEvts.filter((e) => {
          const isTackle = (e.CATEGORY === 'TACKLE' || e.event_type === 'TACKLE');
          if (!isTackle) return false;
          const team = getTeamFromEvent(e);
          if (!team) return false;
          return normalizedOurTeams.includes(normalizeString(team).toLowerCase());
        }).length;

    // Fallback: si no encontramos tackles para nuestros equipos pero sí hay tackles, mostrar igual
    if (ourTackleCount === 0 && tackleCount > 0) {
      ourTackleCount = tackleCount;
    }

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
  



  // Debug reducido
  // console.log("🔍 ChartsTabs - Total events:", filteredEvents?.length || 0);
  // console.log("🔍 ChartsTabs - Tackle events:", filteredEvents?.filter(e => e.event_type === 'TACKLE').length || 0);

  // Quick booleans for presence of data in new tabs
  // Use filteredEvents when available, otherwise fallback to original events so tabs can be enabled during debug
  const eventsForPresence = (filteredEventsList.length > 0) ? filteredEventsList : (events || []);
  const hasPoints = (eventsForPresence || []).some((event) => isPoints(event));

  const extractPointType = (event: any) => {
    // Prefer top-level POINTS, then check common extra_data keys
    if (!event) return '';
    const candidates = [] as any[];
    if (event.POINTS !== undefined && event.POINTS !== null) candidates.push(event.POINTS);
    if (event.PUNTOS !== undefined && event.PUNTOS !== null) candidates.push(event.PUNTOS);
    const ed = event.extra_data || {};
    // possible backend keys
    candidates.push(ed['TIPO-PUNTOS']);
    candidates.push(ed['TIPO_PUNTOS']);
    candidates.push(ed['tipo_puntos']);
    candidates.push(ed['TIPO-PUNTO']);
    candidates.push(ed['PUNTOS']);
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

  const hasTries = (eventsForPresence || []).some((event) => isTries(event));
  const triesOriginStatus = getTriesOriginStatus(eventsForPresence || []);
  const hasOriginData = triesOriginStatus === 'calculated';
  const hasPenalties = (eventsForPresence || []).some((event) => isPenalties(event));
  const hasFreeKicks = (eventsForPresence || []).some((event) => isFreeKicks(event));
  const hasTurnovers = filteredEventsList.some((event) => event.CATEGORY === "TURNOVER+" || event.CATEGORY === "TURNOVER-" || event.event_type === "TURNOVER+" || event.event_type === "TURNOVER-");
  const hasSetPieces = filteredEventsList.some((event) => isScrum(event) || isLineout(event));
  const hasScrumDetails = filteredEventsList.some((event) => isScrum(event));
  const hasLineoutDetails = filteredEventsList.some((event) => isLineout(event));
  const hasGoalKicks = filteredEventsList.some((event) => isGoalKick(event));
  const hasLineBreaks = filteredEventsList.some((event) => isLineBreak(event));
  const hasCards = (eventsForPresence || []).some((event) => matchesCategory(event, 'CARD', ['TARJETA', 'YELLOW-CARD', 'RED-CARD']) || (matchesCategory(event, 'PENALTY', ['PENAL']) && (String(event.AVANCE ?? event.ADVANCE ?? event.extra_data?.AVANCE ?? event.extra_data?.ADVANCE ?? '').trim() !== '')));
  const hasPasses = false; // ocultado por ahora
  const hasErrors = false; // ocultado por ahora
  const hasAdvances = false; // ocultado por ahora
  const hasScatter = false; // ocultado por ahora
  const hasRucks = (eventsForPresence || []).some((event) => isRuck(event));
  const hasMauls = (eventsForPresence || []).some((event) => matchesCategory(event, 'MAUL', ['MAULS', 'MAULL']));
  const hasOpenKicks = (eventsForPresence || []).some((event) => isKickOpen(event) && !isGoalKick(event));
  const hasPossession = (events || []).some((event) => matchesCategory(event, 'POSSESSION', ['POSESION', 'ATTACK', 'DEFENSE', 'POSSESSION_START']));
  const penaltyEvents = filteredEventsList.filter(e => isPenalties(e));
  const freeKickEvents = filteredEventsList.filter(e => isFreeKicks(e));
  const hasPenaltyPlayers = penaltyEvents.some(e => getPlayerNameGeneric(e));
  const hasFreeKickPlayers = freeKickEvents.some(e => getPlayerNameGeneric(e));
  const hasRuckPositions = filteredEventsList.some(e => matchesCategory(e,'RUCK',['RUCKS','RACK','RUK']) && (e.pos_x !== undefined || e.x !== undefined || e.COORDINATE_X !== undefined || e.extra_data?.pos_x !== undefined || e.extra_data?.x !== undefined));

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
          const normalizeTeamVal = (val: any) =>
            normalizeString(val)
              .replace(/['’]/g, '')
              .replace(/\s+/g, '');
          
          // Normalizar el valor del filtro para aceptar diferentes variaciones
          const normalizedValue = normalizeTeamVal(value);
          
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
            const normalizedEventTeam = normalizeTeamVal(eventTeam);
            const normalizedSearchValue = normalizeTeamVal(value);
            const matches = normalizedEventTeam === normalizedSearchValue;
            console.log("🔍 TEAM specific check:", normalizedEventTeam, "===", normalizedSearchValue, "->", matches);
            return matches;
          }
        }
        
        // Filtrado especial para avances (manejar tanto ADVANCE como AVANCE y advance_type)
        if (descriptor === 'ADVANCE' || descriptor === 'AVANCE') {
          // Soportar múltiples ubicaciones y variantes donde puede aparecer el dato de avance
          const normalizeAdv = (raw: any) => {
            const s = String(raw ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
            if (!s) return '';
            if (s.startsWith('POS')) return 'POSITIVE';
            if (s.startsWith('NEU')) return 'NEUTRAL';
            if (s.startsWith('NEG')) return 'NEGATIVE';
            return s;
          };
          const eventAdvanceRaw =
            event.extra_data?.descriptors?.AVANCE ||
            event.extra_data?.AVANCE ||
            event.extra_data?.advance ||
            event.extra_data?.advance_type ||
            event.advance ||
            event.ADVANCE ||
            event.AVANCE ||
            null;

          const eventVals = Array.isArray(eventAdvanceRaw) ? eventAdvanceRaw : [eventAdvanceRaw];
          const normTarget = normalizeAdv(value);
          const matches = eventVals.some((v) => normalizeAdv(v) === normTarget);

          console.log("🔍 ADVANCE/AVANCE check:", descriptor, "=", eventAdvanceRaw, "===", value, "->", matches);
          return matches;
        }

        // Filtrado para resultado de scrum
        if (descriptor === 'SCRUM_RESULT' || descriptor === 'SCRUM') {
          const normalizeScrumRes = (raw: any) => {
            const s = String(raw ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            if (s.includes('WIN') || s.includes('GAN')) return 'WIN';
            if (s.includes('LOSE') || s.includes('LOST') || s.includes('PERD')) return 'LOSE';
            if (s.includes('PEN')) return 'PENAL';
            if (s.includes('FREE')) return 'FREE';
            return s.trim();
          };
          const evVal =
            event.SCRUM_RESULT ??
            event.SCRUM ??
            event.extra_data?.SCRUM ??
            event.extra_data?.SCRUM_RESULT ??
            event.RESULTADO ??
            null;
          const target = normalizeScrumRes(value);
          const evNorm = normalizeScrumRes(evVal);
          const matches = evNorm === target;
          console.log('🔍 SCRUM_RESULT check:', { evVal, evNorm, target, matches });
          return matches;
        }

        // Filtrado para posición de lineout (normaliza etiquetas con porcentajes)
        if (descriptor === 'LINE_POSITION' || descriptor === 'LINEOUT_POSITION' || descriptor === 'POSICION-LINE') {
          const normalizePos = (raw: any) => {
            const s = String(raw ?? '').toUpperCase().trim();
            const base = s.split(' ')[0].replace(/[()%]/g, '');
            if (base === 'SIN') return 'SIN';
            return base;
          };
          const evPos =
            event.LINE_POSITION ??
            event.LINEOUT_POSITION ??
            event['LINEOUT_POSITION'] ??
            event.extra_data?.LINE_POSITION ??
            event.extra_data?.LINEOUT_POSITION ??
            event.extra_data?.['POSICION-LINE'] ??
            event.extra_data?.['POSICION_LINE'] ??
            event['POSICION-LINE'];
          const matches = normalizePos(evPos) === normalizePos(value);
          console.log('🔍 LINE_POSITION check:', { evPos, value, matches });
          return matches;
        }

        // Filtrado para lanzador de lineout (remover prefijo T- y porcentajes)
        if (descriptor === 'LINE_THROWER') {
          const normalizeThrower = (raw: any) => {
            const s = String(raw ?? '')
              .replace(/^T[- ]/i, '')
              .replace(/\(.*?\)/g, '')
              .trim()
              .toUpperCase();
            return s;
          };
          const evThrower =
            event.LINE_THROWER ??
            event.extra_data?.LINE_THROWER ??
            event.extra_data?.['TIRADOR-LINE'] ??
            event['TIRADOR-LINE'] ??
            event.PLAYER ??
            event.extra_data?.PLAYER;
          const matches = normalizeThrower(evThrower) === normalizeThrower(value);
          console.log('🔍 LINE_THROWER check:', { evThrower, value, matches });
          return matches;
        }

        // Filtrado especial para tipo de puntos (acepta aliases y normaliza)
        if (descriptor === 'TIPO-PUNTOS' || descriptor === 'TIPO_PUNTOS' || descriptor === 'type_of_points') {
          const normalizePointType = (raw: any) => String(raw ?? '').toUpperCase().trim().replace(/[\s_-]+/g, '');
          const candidates = [
            event.POINTS,
            event.PUNTOS,
            event.extra_data?.['TIPO-PUNTOS'],
            event.extra_data?.TIPO_PUNTOS,
            event.extra_data?.type_of_points,
            event.extra_data?.type,
            event.type,
          ];
          const eventType = normalizePointType(candidates.find((c) => c !== undefined && c !== null));
          const target = normalizePointType(value);
          const matches = eventType === target || (eventType && target && eventType.includes(target));
          console.log('🔍 TIPO-PUNTOS check:', { eventType, target, matches });
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

        // Filtrado para resultados de lineout (normalizado)
        if (descriptor === 'LINEOUT_RESULT' || descriptor === 'LINE_RESULT' || descriptor === 'RESULTADO-LINE') {
          const normalizeLineoutResult = (raw: any) => {
            const s = String(raw ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim().replace(/[\s_-]+/g, '');
            if (!s) return '';
            if (s.includes('LIMPIA') || s.includes('CLEAN') || s.includes('SUCIA') || s.includes('DIRTY') || s.includes('GAN') || s.includes('WIN')) return 'WIN';
            if (s.includes('LOST') || s.includes('LOSE') || s.includes('PERD') || s.includes('TORCID') || s.includes('NOTSTRAIGHT') || s.includes('STEAL')) return 'LOSE';
            return s;
          };
          const evVal =
            event.LINE_RESULT ??
            event['LINE_RESULT'] ??
            event.extra_data?.LINE_RESULT ??
            event.extra_data?.['RESULTADO-LINE'] ??
            event.extra_data?.['RESULTADO_LINE'] ??
            event['RESULTADO-LINE'];
          const evNorm = normalizeLineoutResult(evVal);
          const targetNorm = normalizeLineoutResult(value);
          const matches = evNorm === targetNorm;
          console.log('🔍 LINEOUT_RESULT check:', { evVal, evNorm, targetNorm, matches });
          return matches;
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
          const normalizeOrigin = (raw: any) => {
            if (!raw && raw !== 0) return 'OTROS';
            const s = String(raw).toUpperCase().trim();
            if (s === '' || s === 'RC') return 'OTROS';
            if (s.includes('SCRUM')) return 'SCRUM';
            if (s.includes('LINE')) return 'LINEOUT';
            if (s.replace(/\s+/g, '').includes('KICKOFF') || s.includes('KICK')) return 'KICKOFF';
            if (s.includes('TURN')) return 'TURNOVER';
            if (s === 'OTROS' || s === 'OTHER' || s === 'OTRO') return 'OTROS';
            return s;
          };
          const rawOrigin = event.TRY_ORIGIN ?? event.extra_data?.TRY_ORIGIN ?? event.extra_data?.ORIGIN ?? event.ORIGIN;
          const v = normalizeOrigin(rawOrigin);
          const target = normalizeOrigin(value);
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
  const effectiveEvents = (filteredEventsList.length > 0) ? filteredEventsList : (events || []);

  const tacklesAvailability = {
    hasTacklesBarChartData: hasTacklesBarChartData(filteredEventsList),
    hasTackleAdvanceData: hasTackleAdvanceData(filteredEventsList),
    hasTacklesTimeChartData: hasTacklesTimeChartData(filteredEventsList),
    hasMissedTacklesBarChartData: hasMissedTacklesBarChartData(filteredEventsList),
    hasTacklesByTeamChartData: hasTacklesByTeamChartData(filteredEventsList),
  };

  const turnoverEvents = filteredEventsList.filter(e => e.CATEGORY === 'TURNOVER+' || e.CATEGORY === 'TURNOVER-' || e.event_type === 'TURNOVER+' || e.event_type === 'TURNOVER-');
  const scrumEvents = filteredEventsList.filter(isScrum);
  const lineoutEvents = filteredEventsList.filter(isLineout);
  const goalKickEvents = filteredEventsList.filter(isGoalKick);
  const lineBreakEvents = filteredEventsList.filter(isLineBreak);
  const pointsEvents = effectiveEvents.filter(isPoints);
  const triesEvents = effectiveEvents.filter(isTries);

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
    // console.log('ChartsTabs - Points tab - hasPoints=', hasPoints, 'points events=', filteredEvents.filter(e => e.CATEGORY === 'POINTS' || e.event_type === 'POINTS').length);
  } catch (err) {}

  return (
    <Tabs defaultValue="possession" className="w-full mt-4">
      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <TabsList style={{ display: 'inline-flex', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
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
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 140 }} value="scrums-detail" disabled={!hasScrumDetails}>Scrums Detalle</TabsTrigger>
          <TabsTrigger style={{ display: 'inline-flex', flex: '0 0 auto', minWidth: 150 }} value="lineouts-detail" disabled={!hasLineoutDetails}>Lineouts Detalle</TabsTrigger>
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
      

      <TabsContent value="possession">
        <PossessionTabContent
          events={events || []}
          effectiveEvents={effectiveEvents}
          hasPossession={hasPossession}
          hasRuckPositions={hasRuckPositions}
          onChartClick={handleChartClick}
        />
      </TabsContent>

      <TabsContent value="tackles">
        <TacklesTabContent
          filteredEvents={filteredEventsList}
          availability={tacklesAvailability}
          onChartClick={handleChartClick}
          onEventClick={_props.onEventClick}
        />
      </TabsContent>

      <TabsContent value="points">
        <PointsTabContent hasPoints={hasPoints} pointsEvents={pointsEvents} onChartClick={handleChartClick} onEventClick={_props.onEventClick} />
      </TabsContent>

      <TabsContent value="tries">
        <TriesTabContent
          hasTries={hasTries}
          triesOriginStatus={triesOriginStatus}
          triesEvents={triesEvents}
          pointsEvents={pointsEvents}
          onChartClick={handleChartClick}
          onEventClick={_props.onEventClick}
        />
      </TabsContent>

      <TabsContent value="penalties">
        <PenaltiesTabContent
          hasPenalties={hasPenalties}
          hasPenaltyPlayers={hasPenaltyPlayers}
          penaltyEvents={penaltyEvents}
          onChartClick={handleChartClick}
          onEventClick={_props.onEventClick}
        />
      </TabsContent>

      <TabsContent value="freekicks">
        <FreeKicksTabContent
          hasFreeKicks={hasFreeKicks}
          hasFreeKickPlayers={hasFreeKickPlayers}
          freeKickEvents={freeKickEvents}
          onChartClick={handleChartClick}
          onEventClick={_props.onEventClick}
        />
      </TabsContent>

      <TabsContent value="cards">
        <CardsTabContent hasCards={hasCards} effectiveEvents={effectiveEvents} onChartClick={handleChartClick} onEventClick={_props.onEventClick} />
          onEventClick={_props.onEventClick}
      </TabsContent>

      <TabsContent value="turnovers">
        <TurnoversTabContent hasTurnovers={hasTurnovers} turnoverEvents={turnoverEvents} onChartClick={handleChartClick} onEventClick={_props.onEventClick} />
          onEventClick={_props.onEventClick}
      </TabsContent>

      <TabsContent value="setpieces">
        <SetPiecesTabContent
          hasSetPieces={hasSetPieces}
          scrumEvents={scrumEvents}
          lineoutEvents={lineoutEvents}
          onChartClick={handleChartClick}
          matchInfo={matchInfo}
          ourTeamsList={ourTeamsList}
        />
      </TabsContent>

      <TabsContent value="scrums-detail">
        <ScrumsDetailTabContent
          hasScrumDetails={hasScrumDetails}
          scrumEvents={scrumEvents}
          matchInfo={matchInfo}
          ourTeamsList={ourTeamsList}
          onChartClick={handleChartClick}
          onEventClick={_props.onEventClick}
        />
      </TabsContent>

      <TabsContent value="lineouts-detail">
        <LineoutsDetailTabContent
          hasLineoutDetails={hasLineoutDetails}
          lineoutEvents={lineoutEvents}
          matchInfo={matchInfo}
          ourTeamsList={ourTeamsList}
          onChartClick={handleChartClick}
          onEventClick={_props.onEventClick}
        />
      </TabsContent>

      <TabsContent value="rucks">
        <RucksTabContent hasRucks={hasRucks} effectiveEvents={effectiveEvents} onChartClick={handleChartClick} />
      </TabsContent>

      <TabsContent value="mauls">
        <MaulsTabContent hasMauls={hasMauls} effectiveEvents={effectiveEvents} onChartClick={handleChartClick} />
      </TabsContent>

      <TabsContent value="goalkicks">
        <GoalKicksTabContent
          hasGoalKicks={hasGoalKicks}
          goalKickEvents={goalKickEvents}
          matchInfo={matchInfo}
          onChartClick={handleChartClick}
        />
      </TabsContent>

      <TabsContent value="openkicks">
        <OpenKicksTabContent
          hasOpenKicks={hasOpenKicks}
          effectiveEvents={effectiveEvents}
          onChartClick={handleChartClick}
        />
      </TabsContent>

      <TabsContent value="linebreaks">
        <LineBreaksTabContent
          hasLineBreaks={hasLineBreaks}
          lineBreakEvents={lineBreakEvents}
          matchInfo={matchInfo}
          onChartClick={handleChartClick}
        />
      </TabsContent>

      {/* Scatter tab desactivada */}
    </Tabs>
  );
};

export default ChartsTabs;
