import React from "react";
import { MatchEvent } from "@/types";
import { pickValue, isOpponentEvent } from "@/utils/eventUtils";
import { getTeamFromEvent, normalizeTeamForFilter } from "@/utils/teamUtils";

type ScrumDetailTableProps = {
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
    if (s.includes(":")) return s; // Already formatted as MM:SS
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

const formatResult = (raw: any): string => {
  const s = String(raw || "").toUpperCase().trim();
  if (!s) return "-";
  if (s.includes("WIN") || s.includes("GAN")) return "Ganado";
  if (s.includes("LOSE") || s.includes("PERD")) return "Perdido";
  if (s.includes("PEN")) return "Penal";
  if (s.includes("FREE")) return "Free kick";
  return s;
};

const formatAdvance = (raw: any): string => {
  const s = String(raw || "").toUpperCase().trim();
  if (!s) return "-";
  if (s.startsWith("POS")) return "Positivo";
  if (s.startsWith("NEU")) return "Neutro";
  if (s.startsWith("NEG")) return "Negativo";
  return s;
};

const ScrumDetailTable: React.FC<ScrumDetailTableProps> = ({
  events,
  matchInfo,
  ourTeamsList = [],
  onRowClick,
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay scrums con datos de detalle.
      </div>
    );
  }

  const rows = events.map((event, idx) => {
    return {
      key: event.id ?? event.ID ?? idx,
      team: isOpponentEvent(event) ? "Rival" : "Nuestro Equipo",
      time: formatClock(event),
      sector: formatSector(event),
      result: formatResult(
        pickValue(event, [
          "SCRUM_RESULT",
          "RESULTADO",
          "RESULTADO-SCRUM",
          "RESULT",
          "SCRUM",
        ])
      ),
      advance: formatAdvance(pickValue(event, ["ADVANCE", "AVANCE"])),
      raw: event,
    };
  });

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-white/10 text-slate-200">
          <tr>
            <th className="px-3 py-2 text-left whitespace-nowrap">Equipo</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">Tiempo</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">Sector</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">Resultado</th>
            <th className="px-3 py-2 text-left whitespace-nowrap">Avance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-t border-white/10 ${onRowClick ? "hover:bg-white/10 cursor-pointer" : ""}`}
              onClick={() => onRowClick?.(row.raw)}
            >
              <td className="px-3 py-2 whitespace-nowrap">{row.team || "-"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.time}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.sector}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.result}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.advance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScrumDetailTable;
