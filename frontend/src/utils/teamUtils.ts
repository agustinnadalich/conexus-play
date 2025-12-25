// Utilities to normalize and extract team information from events
import { isOpponentEvent } from './eventUtils';

export function getTeamFromEvent(ev: any): string | undefined {
  if (!ev) return undefined;
  const tryFields = [
    'TEAM', 'team', 'Team',
    'EQUIPO', 'equipo',
    'OPPONENT', 'opponent', 'Opponent',
    'team_name', 'opponent_name', 'home', 'away', 'teamName', 'TEAM_NAME',
    'match_team', 'match_opponent'
  ];

  for (const f of tryFields) {
    const v = ev[f];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }

  // También revisar extra_data si existe
  if (ev.extra_data && typeof ev.extra_data === 'object') {
    for (const f of tryFields) {
      const v = ev.extra_data[f];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
  }

  return undefined;
}

export function normalizeString(s?: any): string {
  if (s === undefined || s === null) return '';
  return String(s).trim();
}

export function getTeamNamesFromEvents(events: any[]): string[] {
  const set = new Set<string>();
  (events || []).forEach(ev => {
    const t = getTeamFromEvent(ev);
    if (t) set.add(normalizeString(t));
  });
  const arr = Array.from(set);
  if (arr.length >= 2) return arr.slice(0, 2);
  if (arr.length === 1) return [arr[0], 'OPPONENT'];
  return ['Nuestro Equipo', 'Rival'];
}

export function detectOurTeams(events: any[]): string[] {
  // Heurística: priorizar el equipo más frecuente que NO sea rival/opponent.
  const teamStats = new Map<string, number>();
  (events || []).forEach(ev => {
    const team = getTeamFromEvent(ev);
    if (!team) return;
    const u = normalizeString(team).toUpperCase();
    if (/\b(OPPONENT|RIVAL|VISITA|AWAY|OPP)\b/.test(u)) return; // saltar rivales
    teamStats.set(team, (teamStats.get(team) || 0) + 1);
  });
  if (teamStats.size === 0) return [];
  const sorted = Array.from(teamStats.entries()).sort((a,b)=>b[1]-a[1]);
  return [sorted[0][0]];
}

export function isOurTeam(teamName: string, ourTeamsList: string[]): boolean {
  return ourTeamsList.some(ourTeam => 
    normalizeString(teamName) === normalizeString(ourTeam)
  );
}

// Normalizar descriptor de equipo para filtros
export function normalizeTeamForFilter(team: string | undefined, matchInfo: any, ourTeamsList: string[]): string {
  if (!team) return 'UNKNOWN';
  
  const normalized = normalizeString(team).toUpperCase();
  
  // Si es un placeholder, resolverlo al nombre real
  if (normalized === 'OUR_TEAM' || normalized === 'OURTEAM' || normalized === 'NUESTRO EQUIPO' || normalized === 'NUESTROS EQUIPOS') {
    return matchInfo?.team_name || matchInfo?.TEAM || matchInfo?.team || ourTeamsList[0] || 'PESCARA';
  }
  
  if (normalized === 'OPPONENT' || normalized === 'RIVAL' || normalized === 'RIVALES') {
    return matchInfo?.opponent_name || matchInfo?.OPPONENT || matchInfo?.opponent || 'RIVAL';
  }
  
  if (normalized === 'DESCONOCIDO' || normalized === 'UNKNOWN' || normalized === 'N/A' || normalized === '') {
    // Intentar determinar si es equipo propio o rival
    if (isOurTeam(team, ourTeamsList)) {
      return matchInfo?.team_name || matchInfo?.TEAM || matchInfo?.team || ourTeamsList[0] || 'PESCARA';
    }
    return matchInfo?.opponent_name || matchInfo?.OPPONENT || matchInfo?.opponent || 'RIVAL';
  }
  
  return team;
}

export function computeTackleStatsAggregated(events: any[], ourTeamsList: string[]) {
  const tackleEvents = (events || []).filter((event: any) =>
    (event.event_type && (event.event_type === 'TACKLE' || event.event_type === 'MISSED-TACKLE')) ||
    (event.CATEGORY && event.CATEGORY === 'TACKLE')
  );

  // Stats agregados de todos nuestros equipos - usar IS_OPPONENT flag
  const ourEventsAggregated = tackleEvents.filter(ev => !isOpponentEvent(ev));
  
  // Stats agregados de todos los rivales - usar IS_OPPONENT flag
  const opponentEventsAggregated = tackleEvents.filter(ev => isOpponentEvent(ev));
  
  const ourStats = computeStatsFromEvents(ourEventsAggregated);
  const oppStats = computeStatsFromEvents(opponentEventsAggregated);
  
  return [
    {
      teamName: 'Nuestros Equipos',
      category: 'OUR_TEAMS',
      ...ourStats
    },
    {
      teamName: 'Rivales',
      category: 'OPPONENTS', 
      ...oppStats
    }
  ];
}

function computeStatsFromEvents(events: any[]) {
  const successful = events.filter((ev: any) => 
    (ev.event_type === 'TACKLE' || ev.CATEGORY === 'TACKLE')
  ).length;
  
  const missed = events.filter((ev: any) => 
    ev.event_type === 'MISSED-TACKLE'
  ).length;
  
  const total = successful + missed;
  const effectiveness = total > 0 ? Math.round((successful / total) * 100) : 0;
  
  return { successful, missed, total, effectiveness };
}

export function computeTackleStats(events: any[], teams: string[]) {
  const tackleEvents = (events || []).filter((event: any) =>
    (event.event_type && (event.event_type === 'TACKLE' || event.event_type === 'MISSED-TACKLE')) ||
    (event.CATEGORY && event.CATEGORY === 'TACKLE')
  );

  return teams.map(teamName => {
    const eventsForTeam = tackleEvents.filter((ev: any) => normalizeString(getTeamFromEvent(ev) || '') === normalizeString(teamName || ''));
    const successful = eventsForTeam.filter((ev: any) => (ev.event_type === 'TACKLE' || ev.CATEGORY === 'TACKLE')).length;
    const missed = eventsForTeam.filter((ev: any) => ev.event_type === 'MISSED-TACKLE').length;
    const total = successful + missed;
    const effectiveness = total > 0 ? Math.round((successful / total) * 100) : 0;
    return { teamName, successful, missed, total, effectiveness };
  });
}

export function resolveTeamLabel(label: string, matchInfo?: any) {
  if (!label) return label;
  const l = normalizeString(label);
  if (l === 'OUR_TEAM' && matchInfo) return matchInfo.TEAM || matchInfo.team || matchInfo.home || matchInfo.team_name || l;
  if (l === 'OPPONENT' && matchInfo) return matchInfo.OPPONENT || matchInfo.opponent || matchInfo.away || matchInfo.opponent_name || l;
  return l;
}
