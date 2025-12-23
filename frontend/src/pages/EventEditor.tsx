import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { authFetch } from "@/api/api";

type EventRow = {
  id: number;
  CATEGORY?: string;
  event_type?: string;
  PLAYER?: string | null;
  TEAM?: string | null;
  ADVANCE?: string | null;
  timestamp_sec?: number | null;
  extra_data?: Record<string, any> | null;
  [key: string]: any;
};

const EventEditor: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [edited, setEdited] = useState<Record<number, Partial<EventRow>>>({});
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPlayer, setFilterPlayer] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterAdvance, setFilterAdvance] = useState("");
  const [filterClipStart, setFilterClipStart] = useState("");
  const [filterClipEnd, setFilterClipEnd] = useState("");
  const [filterGameTime, setFilterGameTime] = useState("");
  const [bulkTeam, setBulkTeam] = useState("");
  const [bulkPlayer, setBulkPlayer] = useState("");
  const [bulkAdvance, setBulkAdvance] = useState("");
  const [bulkExtraKey, setBulkExtraKey] = useState("");
  const [bulkExtraValue, setBulkExtraValue] = useState("");
  const [extraFilters, setExtraFilters] = useState<Record<string, string>>({});
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!matchId) return;
      setLoading(true);
      try {
        const res = await authFetch(`/matches/${matchId}/events`);
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err: any) {
        setStatus(`Error cargando eventos: ${err?.message || err}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId]);

  const rows = useMemo(() => {
    return events.map((ev) => {
      const ed = ev.extra_data || {};
      return {
        ...ev,
        __resolvedPlayer:
          ev.PLAYER ||
          ev.player_name ||
          ed.JUGADOR ||
          ed.PLAYER ||
          (Array.isArray(ed.PLAYERS) ? ed.PLAYERS[0] : null),
        __resolvedTeam: ev.TEAM || ed.TEAM || ed.EQUIPO || "",
        __resolvedAdvance: ev.ADVANCE || ed.ADVANCE || ed.AVANCE || "",
        clip_start: ed.clip_start,
        clip_end: ed.clip_end,
        Game_Time: ed.Game_Time || ed.game_time,
      };
    });
  }, [events]);

  const matchesFilter = (fieldValue: string, filterValue: string) => {
    if (!filterValue) return true;
    const fv = (fieldValue || "").toString().toLowerCase();
    const raw = filterValue.toString().toLowerCase().trim();
    if (raw.startsWith("!=") || raw.startsWith("!")) {
      const target = raw.replace(/^!+=?/, "").trim();
      if (!target) return true;
      return fv !== target;
    }
    return fv.includes(raw);
  };

  const filteredRows = useMemo(() => {
    return rows.filter((ev) => {
      const cat = (ev.CATEGORY || ev.event_type || "").toString().toLowerCase();
      const pl = (ev.__resolvedPlayer || "").toString().toLowerCase();
      const tm = (ev.__resolvedTeam || "").toString().toLowerCase();
      const adv = (ev.__resolvedAdvance || "").toString().toLowerCase();
      const clipS = (ev.clip_start ?? "").toString().toLowerCase();
      const clipE = (ev.clip_end ?? "").toString().toLowerCase();
      const gtime = (ev.Game_Time ?? "").toString().toLowerCase();
      let extraOk = true;
      Object.entries(extraFilters).forEach(([k, v]) => {
        if (!v) return;
        const val = (ev.extra_data?.[k] ?? "").toString().toLowerCase();
        if (!matchesFilter(val, v)) extraOk = false;
      });
      return (
        matchesFilter(cat, filterCategory) &&
        matchesFilter(pl, filterPlayer) &&
        matchesFilter(tm, filterTeam) &&
        matchesFilter(adv, filterAdvance) &&
        matchesFilter(clipS, filterClipStart) &&
        matchesFilter(clipE, filterClipEnd) &&
        matchesFilter(gtime, filterGameTime) &&
        extraOk
      );
    });
  }, [rows, filterCategory, filterPlayer, filterTeam, filterAdvance, filterClipStart, filterClipEnd, filterGameTime, extraFilters]);

  const extraKeys = useMemo(() => {
    const excluded = new Set([
      "descriptors",
      "Time_Group",
      "TIME_GROUP",
      "time_group",
      "DETECTED_PERIOD",
      "detected_period",
      "Game_Time",
      "GAME_TIME",
      "TIME(VIDEO)",
      "TIME",
      "timestamp_sec",
      "pos_x",
      "pos_y",
      "COORDINATE_X",
      "COORDINATE_Y",
      "x",
      "y",
      "original_end",
      "original_start",
      "original_start_seconds",
      "original_end_seconds",
      "TEAM_TACKLE_COUNT",
      "TEAM_TACKLES_COUNT",
      "TEAM_TACKLE_TOTAL",
      "clip_start",
      "clip_end",
      "game_time",
      "Game_Time",
      "__resolvedPlayer",
      "__resolvedTeam",
      "__resolvedAdvance",
      "extra_data",
      "id",
      "period",
      "players",
    ]);
    const keys = new Set<string>();
    rows.forEach((ev) => {
      // claves de primer nivel
      Object.entries(ev).forEach(([k, v]) => {
        if (excluded.has(k)) return;
        if (v === null || typeof v === "object") return;
        keys.add(k);
      });
      // claves de extra_data
      Object.entries(ev.extra_data || {}).forEach(([k, v]) => {
        if (excluded.has(k)) return;
        if (v === null || typeof v === "object") return;
        keys.add(k);
      });
    });
    return Array.from(keys).sort();
  }, [rows]);

  const handleChange = (id: number, field: keyof EventRow, value: any) => {
    setEdited((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const applyBulkToFiltered = () => {
    const ids = filteredRows.map((r) => r.id);
    if (ids.length === 0) return;
    const fields: any = {};
    if (bulkTeam) fields.TEAM = bulkTeam;
    if (bulkPlayer) fields.PLAYER = bulkPlayer;
    if (bulkAdvance) fields.ADVANCE = bulkAdvance;
    if (bulkExtraKey) {
      fields.extra_data = { [bulkExtraKey]: bulkExtraValue };
    }
    if (Object.keys(fields).length === 0) return;
    const newEdited = { ...edited };
    ids.forEach((id) => {
      newEdited[id] = { ...(newEdited[id] || {}), ...fields };
    });
    setEdited(newEdited);
  };

  const handleSave = async () => {
    if (!matchId) return;
    const updates = Object.entries(edited).map(([id, fields]) => {
      const f: any = { ...fields };
      // Sincronizar TEAM/PLAYER/ADVANCE con extra_data
      const baseExtra = events.find(ev => ev.id === Number(id))?.extra_data || {};
      if (f.TEAM !== undefined) {
        f.extra_data = { ...(baseExtra || {}), TEAM: f.TEAM, EQUIPO: f.TEAM };
      }
      if (f.PLAYER !== undefined) {
        f.extra_data = { ...(f.extra_data || baseExtra || {}), JUGADOR: f.PLAYER, PLAYER: f.PLAYER };
      }
      if (f.ADVANCE !== undefined) {
        f.extra_data = { ...(f.extra_data || baseExtra || {}), ADVANCE: f.ADVANCE, AVANCE: f.ADVANCE };
      }
      return { id: Number(id), fields: f };
    });
    if (updates.length === 0) {
      setStatus("No hay cambios para guardar");
      return;
    }
    setStatus("Guardando...");
    try {
      const res = await authFetch(`/matches/${matchId}/events/bulk_update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      setStatus(json.message || "Cambios guardados");
      // refrescar eventos
      const reload = await authFetch(`/matches/${matchId}/events`);
      const data = await reload.json();
      setEvents(data.events || []);
      setEdited({});
    } catch (err: any) {
      setStatus(`Error: ${err?.message || err}`);
    }
  };

  if (!matchId) return <div>Falta matchId</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Editar eventos · Match {matchId}</h1>
        <div className="flex gap-2 items-center">
          <Link className="text-blue-600 underline" to={`/analysis/${matchId}`}>Volver a análisis</Link>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded"
            onClick={handleSave}
          >
            Guardar cambios
          </button>
        </div>
      </div>
      {status && <div className="text-sm text-gray-700">{status}</div>}
      <div className="flex flex-wrap gap-3 text-sm">
        <div>
          <label className="block text-xs text-gray-600">Filtrar Categoría</label>
          <input className="border px-2 py-1 text-sm" value={filterCategory} onChange={(e)=>setFilterCategory(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600">Filtrar Player</label>
          <input className="border px-2 py-1 text-sm" value={filterPlayer} onChange={(e)=>setFilterPlayer(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600">Filtrar Team</label>
          <input className="border px-2 py-1 text-sm" value={filterTeam} onChange={(e)=>setFilterTeam(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-gray-600">Aplicar TEAM a filtrados</label>
            <input className="border px-2 py-1 text-sm" value={bulkTeam} onChange={(e)=>setBulkTeam(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Aplicar PLAYER a filtrados</label>
            <input className="border px-2 py-1 text-sm" value={bulkPlayer} onChange={(e)=>setBulkPlayer(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Aplicar ADVANCE a filtrados</label>
            <input className="border px-2 py-1 text-sm" value={bulkAdvance} onChange={(e)=>setBulkAdvance(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Extra key</label>
            <input className="border px-2 py-1 text-sm" value={bulkExtraKey} onChange={(e)=>setBulkExtraKey(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Extra value</label>
            <input className="border px-2 py-1 text-sm" value={bulkExtraValue} onChange={(e)=>setBulkExtraValue(e.target.value)} />
          </div>
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={applyBulkToFiltered}>Aplicar a filtrados</button>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Tip: usa "!=" o "!" en los filtros para excluir valores (ej: TEAM: <code>!=opponent</code>).
      </div>
      {loading ? (
        <div>Cargando eventos...</div>
      ) : (
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1">ID</th>
                <th className="px-2 py-1">Categoría</th>
                <th className="px-2 py-1">Player</th>
                <th className="px-2 py-1">Team</th>
                <th className="px-2 py-1">Advance</th>
                {extraKeys.map(k => (
                  <th key={k} className="px-2 py-1">{k}</th>
                ))}
                <th className="px-2 py-1">clip_start</th>
                <th className="px-2 py-1">clip_end</th>
                <th className="px-2 py-1">Game_Time</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="px-2 py-1 text-xs text-gray-500">Filtro</th>
                <th className="px-2 py-1">
                  <input className="w-full border px-1 py-0.5 text-xs" placeholder="filtrar" value={filterCategory} onChange={(e)=>setFilterCategory(e.target.value)} />
                </th>
                <th className="px-2 py-1">
                  <input className="w-full border px-1 py-0.5 text-xs" placeholder="filtrar" value={filterPlayer} onChange={(e)=>setFilterPlayer(e.target.value)} />
                </th>
                <th className="px-2 py-1">
                  <input className="w-full border px-1 py-0.5 text-xs" placeholder="filtrar" value={filterTeam} onChange={(e)=>setFilterTeam(e.target.value)} />
                </th>
                <th className="px-2 py-1">
                  <input className="w-full border px-1 py-0.5 text-xs" placeholder="filtrar" value={filterAdvance} onChange={(e)=>setFilterAdvance(e.target.value)} />
                </th>
                {extraKeys.map(k => (
                  <th key={k} className="px-2 py-1">
                    <input
                      className="w-full border px-1 py-0.5 text-xs"
                      placeholder="filtrar"
                      value={extraFilters[k] || ""}
                      onChange={(e)=>setExtraFilters(prev=>({...prev,[k]: e.target.value}))}
                    />
                  </th>
                ))}
                <th className="px-2 py-1">
                  <input className="w-full border px-1 py-0.5 text-xs" placeholder="filtrar" value={filterClipStart} onChange={(e)=>setFilterClipStart(e.target.value)} />
                </th>
                <th className="px-2 py-1">
                  <input className="w-full border px-1 py-0.5 text-xs" placeholder="filtrar" value={filterClipEnd} onChange={(e)=>setFilterClipEnd(e.target.value)} />
                </th>
                <th className="px-2 py-1">
                  <input className="w-full border px-1 py-0.5 text-xs" placeholder="filtrar" value={filterGameTime} onChange={(e)=>setFilterGameTime(e.target.value)} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((ev, idx) => {
                const e = edited[ev.id] || {};
                const isSelected = selectedRowId === ev.id;
                const zebra = idx % 2 === 0 ? "bg-white/5" : "bg-white/[0.03]";
                const rowClass = isSelected ? "bg-cyan-500/15 border border-cyan-300/30" : zebra;
                return (
                  <tr
                    key={ev.id}
                    className={`border-t ${rowClass}`}
                    onClick={() => setSelectedRowId(ev.id)}
                  >
                    <td className="px-2 py-1">{ev.id}</td>
                    <td className="px-2 py-1">
                      <input
                        className="w-32 border px-1 py-0.5 text-xs"
                        value={e.CATEGORY ?? ev.CATEGORY ?? ev.event_type ?? ""}
                        onChange={(evt) => handleChange(ev.id, "CATEGORY", evt.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-32 border px-1 py-0.5 text-xs"
                        value={e.PLAYER ?? ev.__resolvedPlayer ?? ""}
                        onChange={(evt) => handleChange(ev.id, "PLAYER", evt.target.value)}
                        title={`Actual: ${ev.__resolvedPlayer ?? ""}`}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-24 border px-1 py-0.5 text-xs"
                        value={e.TEAM ?? ev.__resolvedTeam ?? ""}
                        onChange={(evt) => handleChange(ev.id, "TEAM", evt.target.value)}
                        title={`Actual: ${ev.__resolvedTeam ?? ""}`}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-24 border px-1 py-0.5 text-xs"
                        value={e.ADVANCE ?? ev.__resolvedAdvance ?? ""}
                        onChange={(evt) => handleChange(ev.id, "ADVANCE", evt.target.value)}
                        title={`Actual: ${ev.__resolvedAdvance ?? ""}`}
                      />
                    </td>
                    {extraKeys.map((k) => (
                      <td key={k} className="px-2 py-1">
                        <input
                          className="w-28 border px-1 py-0.5 text-xs"
                          value={
                            edited[ev.id]?.extra_data?.[k] ??
                            (edited[ev.id] as any)?.[k] ??
                            ev.extra_data?.[k] ??
                            (ev as any)?.[k] ??
                            ""
                          }
                          onChange={(evt) => {
                            setEdited(prev => {
                              const base = prev[ev.id] || {};
                              const baseExtra = base.extra_data || ev.extra_data || {};
                              return {
                                ...prev,
                                [ev.id]: {
                                  ...base,
                                  extra_data: { ...baseExtra, [k]: evt.target.value }
                                }
                              };
                            });
                          }}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <input
                        className="w-20 border px-1 py-0.5 text-xs"
                        value={edited[ev.id]?.extra_data?.clip_start ?? ev.extra_data?.clip_start ?? ""}
                        onChange={(evt) => {
                          setEdited(prev => {
                            const base = prev[ev.id] || {};
                            const baseExtra = base.extra_data || ev.extra_data || {};
                            return {
                              ...prev,
                              [ev.id]: {
                                ...base,
                                extra_data: { ...baseExtra, clip_start: evt.target.value }
                              }
                            };
                          });
                        }}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-20 border px-1 py-0.5 text-xs"
                        value={edited[ev.id]?.extra_data?.clip_end ?? ev.extra_data?.clip_end ?? ""}
                        onChange={(evt) => {
                          setEdited(prev => {
                            const base = prev[ev.id] || {};
                            const baseExtra = base.extra_data || ev.extra_data || {};
                            return {
                              ...prev,
                              [ev.id]: {
                                ...base,
                                extra_data: { ...baseExtra, clip_end: evt.target.value }
                              }
                            };
                          });
                        }}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-24 border px-1 py-0.5 text-xs"
                        value={edited[ev.id]?.extra_data?.Game_Time ?? ev.extra_data?.Game_Time ?? ""}
                        onChange={(evt) => {
                          setEdited(prev => {
                            const base = prev[ev.id] || {};
                            const baseExtra = base.extra_data || ev.extra_data || {};
                            return {
                              ...prev,
                              [ev.id]: {
                                ...base,
                                extra_data: { ...baseExtra, Game_Time: evt.target.value }
                              }
                            };
                          });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EventEditor;
