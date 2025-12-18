import React from "react";

type MatchSummary = {
  id: number;
  team?: string | null;
  opponent?: string | null;
  date?: string | null;
};

type Props = {
  matches: MatchSummary[];
  selectedMatchIds: number[];
  onToggleMatch: (id: number) => void;
};

const MultiMatchHeader: React.FC<Props> = ({ matches, selectedMatchIds, onToggleMatch }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900 mb-3">Selecciona los partidos a mostrar</h2>
    <div className="flex flex-wrap gap-3">
      {matches.map((match) => {
        const label = `${match.team ?? "Equipo"} vs ${match.opponent ?? "Rival"}`;
        const dateLabel = match.date ? new Date(match.date).toLocaleDateString() : "";
        return (
          <label key={match.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={selectedMatchIds.includes(match.id)}
              onChange={() => onToggleMatch(match.id)}
              className="accent-blue-600"
            />
            <span className="font-medium">{label}</span>
            {dateLabel && <span className="text-xs text-slate-500">({dateLabel})</span>}
          </label>
        );
      })}
    </div>
  </div>
);

export default MultiMatchHeader;
