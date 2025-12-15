import React from "react";
import { MatchEvent } from "@/types";
import { pickValue } from "@/utils/eventUtils";
import { getTeamFromEvent, normalizeTeamForFilter } from "@/utils/teamUtils";

type LineoutDetailTableProps = {
  events: MatchEvent[];
  matchInfo?: any;
  ourTeamsList?: string[];
  onRowClick?: (event: MatchEvent) => void;
};

const formatClock = (event: MatchEvent): string => {
  const timeCandidates: any[] = [
    event?.extra_data?.Game_Time,
    event?.Game_Time,
    event?.game_time,
    event?.TIME,
    event?.time,
  ];

  for (const candidate of timeCandidates) {
    if (!candidate) continue;
    const s = String(candidate).trim();
    if (!s) continue;
    if (s.includes(":")) return s;
    const asNumber = Number(s);
    if (!Number.isNaN(asNumber)) {
      const mins = Math.floor(asNumber / 60)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor(asNumber % 60)
        .toString()
        .padStart(2, "0");
      return `${mins}:${secs}`;
    }
  }

  const seconds =
    Number(event?.timestamp_sec ?? event?.SECOND ?? event?.second ?? 0) || 0;
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const formatSector = (event: MatchEvent): string => {
  const sector =
    pickValue(event, ["SECTOR", "sector", "ZONE", "zona"]) ??
    event?.extra_data?.SECTOR ??
    null;
  if (sector) return String(sector);

  const x =
    pickValue(event, [
      "COORDINATE_X",
      "coord_x",
      "pos_x",
      "x",
      "COORDX",
      "COORD_X",
    ]) ?? null;
  const y =
    pickValue(event, [
      "COORDINATE_Y",
      "coord_y",
      "pos_y",
      "y",
      "COORDY",
      "COORD_Y",
    ]) ?? null;

  if (x !== null && y !== null && x !== undefined && y !== undefined) {
    return `(${x}, ${y})`;
  }

  return "-";
};

const cleanName = (raw: any): string => {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (s.startsWith("T-")) return s.slice(2);
  return s;
};

const extractThrower = (event: MatchEvent): string => {
  const explicit =
    pickValue(event, ["LINE_THROWER", "TIRADOR-LINE", "THROWER"]) ?? null;
  if (explicit) return cleanName(explicit);

  if (Array.isArray(event.players) && event.players.length > 0) {
    const candidate = event.players.find(
      (p: any) => typeof p === "string" && p.startsWith("T-")
    );
    if (candidate) return cleanName(candidate);
  }

  return cleanName(
    pickValue(event, ["PLAYER", "JUGADOR", "player", "player_name"])
  );
};

const extractReceiver = (event: MatchEvent): string => {
  const explicit =
    pickValue(event, [
      "LINE_RECEIVER",
      "RECEPTOR",
      "RECEPTOR-LINE",
      "JUGADOR_2",
      "PLAYER_2",
    ]) ?? null;
  if (explicit) return cleanName(explicit);

  if (Array.isArray(event.players) && event.players.length > 0) {
    const candidate = event.players.find(
      (p: any) => typeof p === "string" && !p.startsWith("T-")
    );
    if (candidate) return cleanName(candidate);
  }

  return "";
};

const formatResult = (raw: any): string => {
  const s = String(raw || "").toUpperCase().trim();
  if (!s) return "-";
  if (s.includes("CLEAN") || s.includes("LIMPIA") || s.includes("GAN"))
    return "Limpia";
  if (s.includes("DIRTY") || s.includes("SUCIA")) return "Sucia";
  if (s.includes("LOSE") || s.includes("LOST") || s.includes("PERD"))
    return "Perdido";
  if (s.includes("TORCID") || s.includes("NOT-STRAIGHT")) return "Torcida";
  if (s.includes("INFRA")) return "Infraccion";
  return s;
};

const formatPosition = (raw: any): string => {
  const s = String(raw || "").toUpperCase().trim();
  if (!s) return "-";
  if (s === "A") return "Frontal (A)";
  if (s === "B") return "2da (B)";
  if (s === "C" || s === "MID" || s === "M") return "Centro (C)";
  if (s === "D") return "Penultima (D)";
  if (s === "E") return "Fondo (E)";
  if (s === "ZERO" || s === "0") return "Corto/0";
  return s;
};

const formatCount = (raw: any): string => {
  if (raw === null || raw === undefined) return "-";
  const cleaned = String(raw).toUpperCase().trim();
  const numeric = parseInt(cleaned.replace(/[^0-9]/g, ""), 10);
  if (!Number.isNaN(numeric) && numeric > 0) return `${numeric}`;
  return cleaned || "-";
};

const LineoutDetailTable: React.FC<LineoutDetailTableProps> = ({
  events,
  matchInfo,
  ourTeamsList = [],
  onRowClick,
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay lineouts con datos de detalle.
      </div>
    );
  }

  const rows = events.map((event, idx) => {
    const teamRaw = getTeamFromEvent(event) ?? pickValue(event, ["TEAM"]);
    return {
      key: event.id ?? event.ID ?? idx,
      team: normalizeTeamForFilter(teamRaw || "", matchInfo, ourTeamsList),
      time: formatClock(event),
      sector: formatSector(event),
      result: formatResult(
        pickValue(event, [
          "LINE_RESULT",
          "LINEOUT_RESULT",
          "RESULTADO-LINE",
          "RESULTADO",
        ])
      ),
      count: formatCount(
        pickValue(event, ["LINE_QUANTITY", "LINEOUT_COUNT", "CANTIDAD-LINE"])
      ),
      position: formatPosition(
        pickValue(event, [
          "LINE_POSITION",
          "LINEOUT_POSITION",
          "POSICION-LINE",
        ])
      ),
      thrower: extractThrower(event),
      jumper: extractReceiver(event),
      play:
        pickValue(event, ["LINE_PLAY", "JUGADA", "PLAY"]) ??
        event?.extra_data?.LINE_PLAY ??
        "-",
      raw: event,
    };
  });

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-3 py-2 text-left whitespace-nowrap">Equipo</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">Tiempo</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">Sector</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">
              Resultado
            </th>
            <th className="px-3 py-2 text-left whitespace-nowrap"># Jug.</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">
              Posicion lanzada
            </th>
            <th className="px-3 py-2 text-left whitespace-nowrap">Lanzador</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">Saltador</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">Jugada</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-t ${onRowClick ? "hover:bg-gray-50 cursor-pointer" : ""}`}
              onClick={() => onRowClick?.(row.raw)}
            >
              <td className="px-3 py-2 whitespace-nowrap">{row.team || "-"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.time}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.sector}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.result}</td>
              <td className="px-3 py-2 whitespace-nowrap text-center">
                {row.count}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{row.position}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.thrower || "-"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.jumper || "-"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.play || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LineoutDetailTable;
