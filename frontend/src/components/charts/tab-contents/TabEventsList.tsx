import { useMemo, useState } from "react";
import { MatchEvent } from "@/types";

type Props = {
  title: string;
  events: MatchEvent[];
  columns?: string[];
  onRowClick?: (event: MatchEvent) => void;
};

const TabEventsList = ({ title, events, columns = [], onRowClick }: Props) => {
  const [open, setOpen] = useState(false);

  const { visibleColumns, rows } = useMemo(() => {
    const candidateColumns: string[] =
      columns.length > 0
        ? columns
        : Array.from(new Set(events.flatMap((ev: any) => Object.keys(ev || {}))));

    const visible = candidateColumns.filter((col) =>
      events.some((ev: any) => {
        const v = ev[col] ?? ev.extra_data?.[col];
        if (v === undefined || v === null) return false;
        if (typeof v === "string" && v.trim() === "") return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
    );

    return { visibleColumns: visible, rows: events };
  }, [events, columns]);

  if (!events || events.length === 0) return null;

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold">{title}</h4>
        <button
          className="text-sm px-3 py-1 rounded border border-gray-200 hover:bg-gray-50"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {open && (
        <div className="mt-3 max-h-80 overflow-auto rounded border border-gray-100">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {visibleColumns.map((col) => (
                  <th key={col} className="px-3 py-2 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((ev, idx) => (
                <tr
                  key={ev.id ?? idx}
                  className={`border-t hover:bg-gray-50 cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  onClick={() => onRowClick?.(ev)}
                >
                  {visibleColumns.map((col) => {
                    const v: any = (ev as any)[col] ?? ev.extra_data?.[col];
                    const display =
                      typeof v === "object" && v !== null ? JSON.stringify(v) : v ?? "-";
                    return (
                      <td key={col} className="px-3 py-2 whitespace-nowrap align-top">
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TabEventsList;
