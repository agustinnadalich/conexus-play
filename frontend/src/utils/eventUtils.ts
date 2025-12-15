// Utilidades para normalizar categorías/descriptores provenientes de múltiples fuentes/idiomas.
import { MatchEvent } from "@/types";

const normalizeString = (value: any): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

// Lee el primer valor disponible de un listado de claves (top-level o extra_data)
export const pickValue = (event: MatchEvent, keys: string[]): any => {
  for (const key of keys) {
    if (event && Object.prototype.hasOwnProperty.call(event, key) && event[key] !== undefined) return event[key];
    if (event?.extra_data && Object.prototype.hasOwnProperty.call(event.extra_data, key) && event.extra_data[key] !== undefined) {
      return event.extra_data[key];
    }
  }
  return undefined;
};

// Detecta si un evento pertenece a una categoría, aceptando alias/idiomas distintos.
export const matchesCategory = (event: MatchEvent, canonical: string, aliases: string[] = []): boolean => {
  const pool = [
    event?.CATEGORY,
    event?.event_type,
    event?.category,
    event?.tag,
    event?.extra_data?.CATEGORY,
    event?.extra_data?.TYPE,
    event?.extra_data?.type,
    event?.code,
  ]
    .filter((v) => v !== undefined && v !== null)
    .map(normalizeString);

  const accepted = new Set([normalizeString(canonical), ...aliases.map(normalizeString)]);
  return pool.some((value) => accepted.has(value));
};

export const getKickType = (event: MatchEvent): string => {
  const val = pickValue(event, ['KICK_TYPE', 'TIPO-PATADA', 'TIPO_PATADA', 'tipo_patada', 'PIE', 'KICK', 'TYPE', 'SUBTYPE']);
  if (!val) return '';
  const s = String(val).trim();
  return s;
};

// Intenta decidir si el evento es del rival.
export const isOpponentEvent = (event: MatchEvent): boolean => {
  try {
    if (event.IS_OPPONENT === true || event?.extra_data?.IS_OPPONENT === true) return true;
    const strFlags = [event.IS_OPPONENT, event?.extra_data?.IS_OPPONENT].map((v) => String(v || "").toLowerCase());
    if (strFlags.some((v) => v === "true" || v === "1" || v === "yes" || v === "si")) return true;

    const teamField = pickValue(event, ["TEAM", "EQUIPO", "team", "equipo", "SIDE"]) || "";
    const t = normalizeString(teamField);
    if (t) {
      if (/\b(OPP|OPPONENT|RIVAL|VISITA|AWAY|OPONENTE|VISITANTE|OPPONENTE)\b/.test(t)) return true;
      // Si explícitamente dice nuestro equipo, marcamos como nuestro
      if (/\b(NUESTRO|OUR|LOCAL|HOME)\b/.test(t)) return false;
    }

    // Fallback: usar código del evento cuando TEAM no viene
    const code = normalizeString(event.code || event.CATEGORY || event.event_type || "");
    if (/\bRIVAL\b/.test(code) || /\bOPPONENT\b/.test(code)) return true;

    // Por defecto, si no tenemos info, consideramos nuestro equipo para no perder datos en charts
    return false;
  } catch (_err) {
    return false;
  }
};

// Obtiene el nombre de jugador de forma tolerante.
export const getPlayerName = (event: MatchEvent): string | null => {
  const fromArray = (val: any) => (Array.isArray(val) && val.length > 0 ? val[0] : null);
  const candidates: any[] = [
    fromArray(event?.players),
    fromArray(event?.PLAYERS),
    event?.player_name,
    event?.PLAYER,
    event?.player,
    event?.JUGADOR,
    event?.extra_data?.JUGADOR,
    event?.extra_data?.PLAYER,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const s = String(c).trim();
    if (!s || /^(unknown|null|undefined)$/i.test(s)) continue;
    return s;
  }
  return null;
};

export const getTimeGroup = (event: MatchEvent): string => {
  const raw =
    pickValue(event, ["Time_Group", "Time-Group", "time_group", "Quarter_Group", "Time_Group", "quarter_group"]) ||
    event.extra_data?.Time_Group ||
    null;
  if (raw) return String(raw);
  const seconds = Number(event.extra_data?.Game_Time?.split(":")[0] || event.timestamp_sec || event.SECOND || 0);
  if (seconds < 1200) return "0'- 20'";
  if (seconds < 2400) return "20' - 40'";
  if (seconds < 3600) return "40' - 60'";
  return "60' - 80'";
};

export const normalizeBool = (value: any): boolean => {
  if (value === true) return true;
  if (value === false) return false;
  const s = String(value || "").trim().toLowerCase();
  if (["true", "1", "si", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return false;
};
